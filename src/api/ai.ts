import { format } from 'date-fns';
import { supabase } from '../lib/supabase';
import { aiAnalysisSchema, type AiAnalysis } from '../lib/schemas/ai';

/**
 * Edge Function 호출. JWT 는 supabase-js 가 자동으로 붙인다.
 * 쿼터 증가와 Anthropic 호출은 전부 서버에서만 일어난다 — 클라이언트는 신뢰하지 않는다.
 */
export async function requestAnalysis(photoId: string, force = false): Promise<void> {
  const { error } = await supabase.functions.invoke('analyze-plant', {
    body: { photo_id: photoId, force },
  });
  if (error) throw error;
}

export async function getAnalysis(photoId: string): Promise<AiAnalysis | null> {
  const { data, error } = await supabase
    .from('ai_analyses')
    .select('id, entry_id, photo_id, status, result, helpful, error, created_at, completed_at')
    .eq('photo_id', photoId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;

  // DB 의 jsonb 는 무엇이든 들어올 수 있다. 화면에 넣기 전에 검증한다.
  const parsed = aiAnalysisSchema.safeParse(data);
  return parsed.success ? parsed.data : null;
}

export async function sendFeedback(analysisId: string, helpful: boolean): Promise<void> {
  const { error } = await supabase
    .from('ai_analyses')
    .update({ helpful })
    .eq('id', analysisId);
  if (error) throw error;
}

/** 오늘 쓴 횟수. ai_usage 는 읽기만 허용되어 있다. */
export async function getTodayUsage(userId: string): Promise<number> {
  const { data, error } = await supabase
    .from('ai_usage')
    .select('count')
    .eq('user_id', userId)
    .eq('day', format(new Date(), 'yyyy-MM-dd'))
    .maybeSingle();
  if (error) throw error;
  return (data as { count: number } | null)?.count ?? 0;
}

/** 타임라인에 "AI 진단 있음" 배지를 달기 위한 photo_id 집합 */
export async function listAnalyzedPhotoIds(): Promise<Set<string>> {
  const { data, error } = await supabase
    .from('ai_analyses')
    .select('photo_id')
    .eq('status', 'done');
  if (error) throw error;
  return new Set((data ?? []).map((r) => (r as { photo_id: string }).photo_id));
}
