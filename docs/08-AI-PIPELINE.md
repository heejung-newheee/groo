# 08. AI 진단 파이프라인

> ⚠️ **테스트 버전에서는 이 파이프라인을 쓰지 않습니다.**
> 무료 배포 계획이라 사용자 수에 비례해 API 비용이 그대로 적자가 됩니다.
> 지금은 **질문 문구를 복사해 사용자가 웹 AI에 직접 묻는 방식**(`src/lib/aiPrompt.ts`,
> `src/components/ai/AskWebAiCard.tsx`)을 씁니다. 비용 0.
>
> 아래 API 방식 코드는 **그대로 남아 있습니다** — `src/api/ai.ts`,
> `src/hooks/useAiAnalysis.ts`, `src/components/ai/AiSection.tsx`,
> `supabase/functions/analyze-plant/`. 배포(`functions deploy`)를 하지 않아 잠들어 있을 뿐이고,
> 수익 모델이 생기면 `EntryDetail` 에서 카드만 바꿔 끼우면 됩니다.
>
> **링크 공유는 선택지가 아닙니다.** 웹 AI는 페이지를 텍스트로만 읽고,
> 그루는 SPA라 크롤러가 받는 HTML이 `<div id="root"></div>` 뿐입니다.
> 사진은 파일로 첨부해야 합니다.

## 확정 사항

| 항목 | 결정 |
|---|---|
| 실행 방식 | **버튼 (사용자가 "물어보기"를 눌러야 실행)** |
| 과금 | 전원 무료 |
| 통제 | 유저당 **일 5회** + 전역 월 예산 상한 |
| 재분석 | 사진당 1회 캐시. "다시 분석"은 명시적 버튼(쿼터 차감) |

---

## 흐름

```
[클라] 일지 저장 (즉시 완료 — AI와 무관)
   │
   │  사용자가 [물어보기] 버튼 클릭
   ▼
[클라] supabase.functions.invoke('analyze-plant', { entryId, photoId })
   │   └ await 하지 않음 (fire & forget)
   │
[클라] AI 카드 = 스켈레톤 "🤖 사진을 살펴보는 중..."
   │
   ▼
[Edge Function]
   1. JWT 검증 → user_id 확보
   2. entryId/photoId 가 정말 이 유저 것인지 재확인  ← 파라미터 조작 방어
   3. ai_usage 쿼터 확인 (일 5회)  → 초과 시 status='skipped' 후 종료
   4. ai_analyses row upsert (status='pending')
   5. Storage signed URL → 이미지 fetch → base64
   6. Claude API 호출 (messages.parse + zod 스키마)
   7. 결과 저장 status='done', 토큰 수 기록
   8. ai_usage.count += 1   ← 성공했을 때만 증가
   │
   ▼
[Realtime] postgres_changes 이벤트 (ai_analyses UPDATE)
   │
   ▼
[클라] AI 카드 렌더링
```

**Realtime 구독은 실패할 수 있으므로 폴링을 백업으로 둔다.**
3초 간격, 최대 20회(60초). 60초 후에도 `pending`이면 "지금은 답하기 어려워요" + 재시도 버튼.

---

## 응답 스키마 — 자유 텍스트 금지

`src/lib/schemas/ai.ts` 하나를 **Edge Function과 클라이언트가 공유**한다.

```ts
// src/lib/schemas/ai.ts
import { z } from 'zod';

export const severitySchema = z.enum(['info', 'warn', 'urgent']);

export const diagnosisSchema = z.object({
  is_plant: z.boolean(),

  plant_guess: z.object({
    common_name: z.string(),
    confidence: z.enum(['low', 'medium', 'high']),
  }).nullable(),

  overall: z.enum(['healthy', 'watch', 'needs_attention']),
  summary: z.string(),                       // 한 줄 요약

  observations: z.array(z.string()),         // 보이는 "사실"만

  concerns: z.array(z.object({
    issue:    z.string(),                    // '잎끝 갈변'
    severity: severitySchema,
    evidence: z.string(),                    // '아래쪽 잎 3장의 끝이 마르고 갈색'
    action:   z.string(),                    // '습도를 높이고 물 주는 간격을 하루 줄여보세요'
  })),

  care_tips: z.array(z.string()),
  uncertainty: z.string(),                   // '사진만으로는 뿌리 상태를 알 수 없어요'
});

export type Diagnosis = z.infer<typeof diagnosisSchema>;
```

### 왜 구조화하는가

자유 텍스트로 받으면 (a) UI를 만들 수 없고 (b) 길이가 들쭉날쭉하고 (c) 검증이 불가능하다.
JSON 스키마로 받으면 severity별 색상, concerns 개수만큼 카드 렌더링이 깔끔하게 나온다.

`observations`(보이는 것)와 `concerns`(추론)를 **분리한 것이 핵심**이다.
모델이 관찰과 추측을 섞어 말하는 걸 구조적으로 막는다.

---

## Edge Function 구현

```ts
// supabase/functions/analyze-plant/index.ts
import Anthropic from 'npm:@anthropic-ai/sdk@^0.70.0';
import { zodOutputFormat } from 'npm:@anthropic-ai/sdk@^0.70.0/helpers/zod';
import { createClient } from 'npm:@supabase/supabase-js@^2';
import { diagnosisSchema } from '../_shared/diagnosis-schema.ts';

const MODEL = Deno.env.get('AI_MODEL') ?? 'claude-opus-5';
const DAILY_QUOTA = 5;

const anthropic = new Anthropic({ apiKey: Deno.env.get('ANTHROPIC_API_KEY')! });

const response = await anthropic.messages.parse({
  model: MODEL,
  max_tokens: 4000,
  output_config: {
    effort: 'low',                       // ★ 비용 통제의 핵심 레버
    format: zodOutputFormat(diagnosisSchema),
  },
  system: SYSTEM_PROMPT,
  messages: [{
    role: 'user',
    content: [
      { type: 'image', source: { type: 'base64', media_type: 'image/webp', data: b64 } },
      { type: 'text', text: contextText },
    ],
  }],
});

const diagnosis = response.parsed_output;   // null 이면 파싱 실패 → status='failed'
const { input_tokens, output_tokens } = response.usage;
```

### 왜 `effort: 'low'` 인가

Opus 5는 thinking이 기본으로 켜져 있고, **thinking 토큰은 output 토큰으로 과금된다.**
사진 한 장 보고 구조화된 JSON을 뱉는 작업에 깊은 추론은 필요 없다.
`effort: 'low'`가 출력 토큰을 가장 크게 줄여준다.

`thinking: { type: 'disabled' }`도 가능하지만 권장하지 않는다 —
Opus 5에서 thinking을 끄면 `<thinking>` 태그가 응답에 새는 알려진 실패 모드가 있다.
**thinking은 켜두고 effort를 낮추는 쪽이 안전하고 비용도 충분히 준다.**

---

## 시스템 프롬프트

```
너는 식물 관리 도우미야. 사진 한 장만 보고 판단한다는 한계를 항상 의식해.

규칙:
1. 사진에서 실제로 "보이는 것"만 observations 에 적어.
   추론은 concerns 의 evidence 에 근거와 함께 적어.
2. 확신이 없으면 confidence 를 낮추고 uncertainty 에 명시해.
   모르는 걸 아는 척하지 마.
3. 식물이 아니면 is_plant: false 로 하고 나머지는 비워.
4. severity 'urgent' 는 방치하면 며칠 내 죽을 수 있는 경우만 써.
   과잉 경고는 사용자를 불안하게 만들고 앱에 대한 신뢰를 잃게 해.
5. action 은 오늘 바로 할 수 있는 구체적 행동으로 써.
   "관리를 잘 해주세요" 같은 말은 쓰지 마.
6. observations 최대 4개, concerns 최대 3개, care_tips 최대 3개.
   summary 는 한 문장, 60자 이내.
7. 한국어로 써. 친근하되 호들갑 떨지 마. 이모지 쓰지 마.
```

### 컨텍스트 주입 (품질을 크게 바꾼다)

```
식물: 몬스테라 델리시오사 (애칭: 몬스)
입양: 182일째
위치: 거실 창가
마지막 물주기: 12일 전
최근 기록: 09/07 비료, 08/28 분갈이
```

**"마지막 물주기 12일 전"을 알려주면** 모델이 "잎이 처진 건 물 부족 가능성"이라고
훨씬 정확하게 말한다. 사진만 던지는 것과 품질 차이가 크다.

---

## 비용 (2026-09 기준 공식 단가)

| 모델 | Input $/1M | Output $/1M |
|---|---|---|
| Claude Opus 5 (`claude-opus-5`) | $5 | $25 |
| Claude Sonnet 5 (`claude-sonnet-5`) | $2 | $10 |
| Claude Haiku 4.5 (`claude-haiku-4-5`) | $1 | $5 |

### 호출 1회당 토큰 추정

```
입력  이미지(1024px 리사이즈) ≈ 1,100 토큰
      시스템 프롬프트          ≈   500 토큰
      컨텍스트                 ≈   150 토큰
                              ─────────────
                                 ≈ 1,750 토큰

출력  구조화 JSON + thinking(effort low) ≈ 400 토큰
```

### 호출 1회당 비용 (환율 1,400원/$ 가정)

| 모델 | $/회 | 원/회 |
|---|---|---|
| Opus 5 | $0.0188 | **약 26원** |
| Sonnet 5 | $0.0075 | **약 11원** |
| Haiku 4.5 | $0.0038 | **약 5원** |

### 월 비용 시나리오 (버튼 방식, 활성 유저가 평균 일 0.5회 사용 가정)

| MAU | 월 호출 | Opus 5 | Sonnet 5 | Haiku 4.5 |
|---|---|---|---|---|
| 100 | 1,500 | 3.9만원 | 1.6만원 | 0.8만원 |
| 500 | 7,500 | 20만원 | 8만원 | 4만원 |
| 1,000 | 15,000 | 39만원 | 16만원 | 8만원 |
| 5,000 | 75,000 | 197만원 | 79만원 | 39만원 |

### 참고: 자동 실행이었다면

같은 MAU에서 호출이 **약 6배**가 된다. MAU 1,000이면 Opus 5 기준 **월 230만원**.
**버튼 방식 결정이 이 앱을 지속 가능하게 만든 결정**이다.

### 모델 선택 — 직접 결정할 것

코드는 `claude-opus-5`를 기본값으로 두었다. 환경변수 `AI_MODEL` 한 줄로 바꿀 수 있다.

```bash
npx supabase secrets set AI_MODEL=claude-sonnet-5
```

판단 재료: 이 작업은 "사진 보고 구조화된 관찰을 내놓기"라는 **경계가 뚜렷한 작업**이라
Sonnet 5로도 충분할 가능성이 높다. 다만 미묘한 증상(초기 응애, 과습 초기)의
판별력은 실제로 두 모델을 같은 사진 20장에 돌려보고 비교해야 안다.

**권장 검증 방법**: 건강한 식물 5장 / 명백한 이상 5장 / 미묘한 이상 5장 / 식물 아님 5장 =
20장으로 두 모델을 돌려 비교한 뒤 결정. 비용은 20회 × 2모델 = 약 750원.

---

## 비용 통제 장치 (전부 필수)

| # | 장치 | 구현 |
|---|---|---|
| 1 | 이미지 1024px 리사이즈 후 전송 | 원본 그대로 보내면 토큰이 몇 배 |
| 2 | 일지당 1장만 분석 | 여러 장 올려도 대표 1장만 |
| 3 | 유저당 일 5회 쿼터 | `ai_usage` 테이블, Edge Function에서만 증가 |
| 4 | 사진당 결과 캐시 | `ai_analyses.photo_id` unique |
| 5 | 토큰 수 기록 | `input_tokens`/`output_tokens` → 실제 비용 대시보드 |
| 6 | **전역 월 예산 상한** | 아래 참고 |
| 7 | `effort: 'low'` | 출력 토큰 최소화 |

### 6번 — 전역 예산 상한 (꼭 넣을 것)

유저당 쿼터만으로는 **가입자 수가 폭증하면 비용도 폭증**한다.
전원 무료 정책에서는 전역 상한이 안전장치다.

```sql
-- 월별 전체 사용량 집계 뷰
create view ai_monthly_cost as
select date_trunc('month', created_at) as month,
       count(*) as calls,
       sum(input_tokens)  as input_tokens,
       sum(output_tokens) as output_tokens
from ai_analyses
where status = 'done'
group by 1;
```

Edge Function 시작 시 이번 달 호출 수가 상한(예: 20,000회)을 넘으면
`status='skipped'` + 사용자에게 "오늘은 AI가 쉬는 날이에요" 안내.

**Anthropic Console에서도 반드시 별도로 설정할 것**: 조직 단위 지출 한도(spend limit).
앱 로직 버그로 무한 루프가 돌아도 여기서 막힌다.

---

## 안전 고지 (법적으로도 중요)

AI 카드 하단에 **항상** 노출한다. 접었다 펴는 UI로 숨기지 않는다.

```
ⓘ AI가 사진만 보고 추정한 참고 의견이에요.
  실제 상태와 다를 수 있으니 직접 확인해주세요.
```

- `severity: 'urgent'` 남발 금지를 **프롬프트에서 명시적으로 제한**
- `helpful` 피드백(👍/👎) 수집 → 프롬프트 개선 데이터
- 식물이 아닌 사진(`is_plant: false`)은 쿼터를 차감하지 않는다 (사용자 실수)

---

## 실패 처리

| 상황 | `status` | 쿼터 | 사용자에게 |
|---|---|---|---|
| 정상 완료 | `done` | 차감 | 결과 카드 |
| 쿼터 초과 | `skipped` | - | "오늘의 질문을 모두 썼어요. 내일 다시 만나요" |
| 전역 예산 초과 | `skipped` | - | "오늘은 AI가 쉬는 날이에요" |
| API 오류 / 타임아웃 | `failed` | **차감 안 함** | "지금은 답하기 어려워요" + 재시도 |
| 파싱 실패 (`parsed_output === null`) | `failed` | **차감 안 함** | 동일 |
| 식물 아님 | `done` | **차감 안 함** | "식물 사진이 아닌 것 같아요" |

**실패했는데 쿼터를 차감하면 사용자는 앱을 신뢰하지 않는다.**
쿼터 증가는 반드시 성공 후에만.

---

## 테스트 케이스 (W4 완료 기준)

| # | 입력 | 기대 |
|---|---|---|
| 1 | 건강한 몬스테라 | `overall: 'healthy'`, concerns 0~1개, urgent 없음 |
| 2 | 잎끝이 탄 식물 | `overall: 'watch'`, concerns에 근거(evidence) 포함 |
| 3 | 심하게 시든 식물 | `overall: 'needs_attention'`, action이 구체적 |
| 4 | 식물이 아닌 사진(고양이) | `is_plant: false`, 쿼터 미차감 |
| 5 | 쿼터 6번째 호출 | `skipped`, 안내 메시지, API 호출 안 일어남 |
| 6 | 남의 entryId로 호출 | 403, DB 변화 없음 |
| 7 | Realtime 끊긴 상태 | 폴링으로 결과 수신 |
| 8 | 같은 사진 재요청 | 캐시 반환, API 호출 0회 |
