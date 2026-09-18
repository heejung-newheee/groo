import { z } from 'npm:zod@^4';

/**
 * AI 진단 응답 스키마.
 *
 * ⚠️ src/lib/schemas/ai.ts 와 같은 모양을 유지해야 한다.
 * Edge Function 은 Deno 라 src/ 를 import 할 수 없어 불가피하게 중복된다.
 * 한쪽을 고치면 반드시 다른 쪽도 고칠 것.
 *
 * observations(보이는 것)와 concerns(추론)를 분리한 것이 핵심이다.
 * 모델이 관찰과 추측을 섞어 말하는 걸 구조적으로 막는다.
 */
export const diagnosisSchema = z.object({
  is_plant: z.boolean(),
  plant_guess: z
    .object({
      common_name: z.string(),
      confidence: z.enum(['low', 'medium', 'high']),
    })
    .nullable(),
  overall: z.enum(['healthy', 'watch', 'needs_attention']),
  summary: z.string(),
  observations: z.array(z.string()),
  concerns: z.array(
    z.object({
      issue: z.string(),
      severity: z.enum(['info', 'warn', 'urgent']),
      evidence: z.string(),
      action: z.string(),
    }),
  ),
  care_tips: z.array(z.string()),
  uncertainty: z.string(),
});

export type Diagnosis = z.infer<typeof diagnosisSchema>;
