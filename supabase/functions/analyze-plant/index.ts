import Anthropic from 'npm:@anthropic-ai/sdk@^0.70.0';
import { zodOutputFormat } from 'npm:@anthropic-ai/sdk@^0.70.0/helpers/zod';
import { createClient } from 'npm:@supabase/supabase-js@^2';
import { diagnosisSchema } from '../_shared/diagnosis-schema.ts';
import { corsHeaders, json } from '../_shared/cors.ts';
import { buildContext, SYSTEM_PROMPT } from './prompt.ts';

const MODEL = Deno.env.get('AI_MODEL') ?? 'claude-opus-5';
const DAILY_QUOTA = Number(Deno.env.get('AI_DAILY_QUOTA') ?? '5');
/** 유저당 쿼터만으로는 가입자가 폭증하면 비용도 폭증한다. 전역 상한이 안전장치다. */
const MONTHLY_CAP = Number(Deno.env.get('AI_MONTHLY_CALL_CAP') ?? '20000');

const anthropic = new Anthropic({ apiKey: Deno.env.get('ANTHROPIC_API_KEY')! });

/** RLS 를 우회한다. 쿼터 증가와 분석 결과 기록은 서버만 할 수 있어야 한다. */
const admin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

const today = () => new Date().toISOString().slice(0, 10);
const daysBetween = (from: string, to: Date) =>
  Math.floor((to.getTime() - new Date(from).getTime()) / 86_400_000);

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  // ── 1. 호출자 확인 ──
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return json({ error: 'unauthorized' }, 401);

  const { data: userData } = await admin.auth.getUser(authHeader.replace('Bearer ', ''));
  const user = userData.user;
  if (!user) return json({ error: 'unauthorized' }, 401);

  const { photo_id: photoId, force = false } = await req.json().catch(() => ({}));
  if (typeof photoId !== 'string') return json({ error: 'photo_id required' }, 400);

  // ── 2. 캐시 — 사진당 1건. 같은 사진 재분석은 비용 0 ──
  const { data: existing } = await admin
    .from('ai_analyses')
    .select('id, status')
    .eq('photo_id', photoId)
    .maybeSingle();

  if (existing && existing.status === 'done' && !force) {
    return json({ status: 'done', cached: true });
  }
  if (existing && existing.status === 'pending') {
    return json({ status: 'pending' });
  }

  // ── 3. 사진 + 식물 컨텍스트 조회 (소유권 확인 겸) ──
  const { data: photo } = await admin
    .from('photos')
    .select('id, user_id, entry_id, storage_path, entries(plant_id, recorded_at)')
    .eq('id', photoId)
    .maybeSingle();

  if (!photo || photo.user_id !== user.id) return json({ error: 'not found' }, 404);

  const entry = photo.entries as unknown as { plant_id: string; recorded_at: string } | null;
  if (!entry) return json({ error: 'entry missing' }, 404);

  // ── 4. 쿼터 ──
  const { data: usage } = await admin
    .from('ai_usage')
    .select('count')
    .eq('user_id', user.id)
    .eq('day', today())
    .maybeSingle();

  const usedToday = usage?.count ?? 0;
  if (usedToday >= DAILY_QUOTA) return json({ error: 'daily_quota_exceeded' }, 429);

  const monthStart = new Date();
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(0, 0, 0, 0);

  const { count: monthlyCalls } = await admin
    .from('ai_analyses')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'done')
    .gte('created_at', monthStart.toISOString());

  if ((monthlyCalls ?? 0) >= MONTHLY_CAP) {
    await upsertAnalysis(photoId, entry.plant_id, photo, user.id, { status: 'skipped' });
    return json({ status: 'skipped' });
  }

  // ── 5. pending 으로 먼저 기록 — 클라이언트가 폴링할 수 있게 ──
  await upsertAnalysis(photoId, entry.plant_id, photo, user.id, { status: 'pending' });

  try {
    const { data: file, error: dlErr } = await admin.storage
      .from('plant-photos')
      .download(photo.storage_path);
    if (dlErr || !file) throw new Error('사진을 읽지 못했습니다');

    const b64 = base64(await file.arrayBuffer());

    const { data: plant } = await admin
      .from('plants')
      .select('nickname, species, location, adopted_at, last_watered_at')
      .eq('id', entry.plant_id)
      .single();

    const { data: recent } = await admin
      .from('entries')
      .select('recorded_at, actions')
      .eq('plant_id', entry.plant_id)
      .order('recorded_at', { ascending: false })
      .limit(3);

    const now = new Date();
    const contextText = buildContext({
      nickname: plant?.nickname ?? '',
      species: plant?.species ?? null,
      location: plant?.location ?? null,
      daysSinceAdopted: plant?.adopted_at ? daysBetween(plant.adopted_at, now) : 0,
      daysSinceWatered: plant?.last_watered_at ? daysBetween(plant.last_watered_at, now) : null,
      recentActions: (recent ?? [])
        .map((r) => `${String(r.recorded_at).slice(5, 10)} ${(r.actions ?? []).join('/')}`)
        .filter((s) => s.trim().length > 6),
    });

    const response = await anthropic.messages.parse({
      model: MODEL,
      max_tokens: 16000,
      // effort 가 비용 통제의 핵심 레버다. 사진 한 장 보고 JSON 뱉는 데
      // 깊은 추론은 필요 없다. thinking 은 켜두고 effort 만 낮춘다 —
      // Opus 5 에서 thinking 을 끄면 태그가 응답에 새는 실패 모드가 있다.
      output_config: { effort: 'low', format: zodOutputFormat(diagnosisSchema) },
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: 'image/webp', data: b64 } },
            { type: 'text', text: contextText },
          ],
        },
      ],
    });

    const diagnosis = response.parsed_output;
    if (!diagnosis) throw new Error('구조화 출력 파싱 실패');

    await admin
      .from('ai_analyses')
      .update({
        status: 'done',
        result: diagnosis,
        model: MODEL,
        input_tokens: response.usage.input_tokens,
        output_tokens: response.usage.output_tokens,
        error: null,
        completed_at: new Date().toISOString(),
      })
      .eq('photo_id', photoId);

    // 식물이 아닌 사진은 쿼터를 차감하지 않는다 — 사용자 실수다
    if (diagnosis.is_plant) await bumpQuota(user.id, usedToday);

    return json({ status: 'done' });
  } catch (err) {
    // 실패는 쿼터를 차감하지 않는다. 재시도가 자유로워야 한다.
    await admin
      .from('ai_analyses')
      .update({
        status: 'failed',
        error: err instanceof Error ? err.message : 'unknown',
        completed_at: new Date().toISOString(),
      })
      .eq('photo_id', photoId);

    return json({ status: 'failed' }, 200);
  }
});

async function upsertAnalysis(
  photoId: string,
  _plantId: string,
  photo: { entry_id: string },
  userId: string,
  patch: Record<string, unknown>,
) {
  await admin.from('ai_analyses').upsert(
    {
      photo_id: photoId,
      entry_id: photo.entry_id,
      user_id: userId,
      result: null,
      error: null,
      completed_at: null,
      ...patch,
    },
    { onConflict: 'photo_id' },
  );
}

async function bumpQuota(userId: string, usedToday: number) {
  await admin
    .from('ai_usage')
    .upsert({ user_id: userId, day: today(), count: usedToday + 1 }, { onConflict: 'user_id,day' });
}

function base64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  // 한 번에 apply 하면 큰 파일에서 스택이 넘친다
  for (let i = 0; i < bytes.length; i += 8192) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
  }
  return btoa(binary);
}
