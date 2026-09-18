import { z } from 'zod';

/**
 * AI 진단 응답 스키마.
 *
 * 이 파일은 Edge Function 과 클라이언트가 **공유**한다.
 * Edge Function 은 zodOutputFormat() 으로 Claude 의 구조화 출력을 강제하고,
 * 클라이언트는 DB 에서 읽은 jsonb 를 같은 스키마로 검증한다.
 *
 * observations(보이는 것)와 concerns(추론)를 분리한 것이 핵심이다.
 * 모델이 관찰과 추측을 섞어 말하는 걸 구조적으로 막는다.
 */

export const severitySchema = z.enum(['info', 'warn', 'urgent']);
export type Severity = z.infer<typeof severitySchema>;

export const confidenceSchema = z.enum(['low', 'medium', 'high']);

export const overallSchema = z.enum(['healthy', 'watch', 'needs_attention']);
export type Overall = z.infer<typeof overallSchema>;

export const concernSchema = z.object({
  /** 증상 이름 — 예: '잎끝 갈변' */
  issue: z.string(),
  severity: severitySchema,
  /** 사진에서 관찰된 근거 — 예: '아래쪽 잎 3장의 끝이 마르고 갈색' */
  evidence: z.string(),
  /** 오늘 바로 할 수 있는 구체적 행동 */
  action: z.string(),
});

export const diagnosisSchema = z.object({
  is_plant: z.boolean(),
  plant_guess: z
    .object({
      common_name: z.string(),
      confidence: confidenceSchema,
    })
    .nullable(),
  overall: overallSchema,
  /** 한 문장 요약 */
  summary: z.string(),
  /** 사진에서 실제로 보이는 사실만 */
  observations: z.array(z.string()),
  concerns: z.array(concernSchema),
  care_tips: z.array(z.string()),
  /** 사진만으로 알 수 없는 것 */
  uncertainty: z.string(),
});

export type Diagnosis = z.infer<typeof diagnosisSchema>;

export const analysisStatusSchema = z.enum(['pending', 'done', 'failed', 'skipped']);
export type AnalysisStatus = z.infer<typeof analysisStatusSchema>;

/** DB 의 ai_analyses row 를 앱에서 쓰는 형태로 */
export const aiAnalysisSchema = z.object({
  id: z.string().uuid(),
  entry_id: z.string().uuid(),
  photo_id: z.string().uuid(),
  status: analysisStatusSchema,
  result: diagnosisSchema.nullable(),
  helpful: z.boolean().nullable(),
  error: z.string().nullable(),
  created_at: z.string(),
  completed_at: z.string().nullable(),
});

export type AiAnalysis = z.infer<typeof aiAnalysisSchema>;

/** concerns 중 가장 높은 severity. 카드 테두리 색 결정에 쓴다. */
export function maxSeverity(d: Diagnosis): Severity | null {
  const order: Record<Severity, number> = { info: 0, warn: 1, urgent: 2 };
  let max: Severity | null = null;
  for (const c of d.concerns) {
    if (max === null || order[c.severity] > order[max]) max = c.severity;
  }
  return max;
}
