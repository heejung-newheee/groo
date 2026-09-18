import { z } from 'zod';

/**
 * 폼 값은 전부 string 으로 다룬다.
 * z.coerce 를 쓰면 zod 의 input/output 타입이 갈라져서 react-hook-form 과 충돌한다.
 * 숫자 변환은 제출 시점에 한 번만 한다.
 */
export const plantFormSchema = z.object({
  nickname: z
    .string()
    .trim()
    .min(1, '애칭을 입력해주세요')
    .max(40, '40자 이내로 입력해주세요'),
  species: z.string().trim().max(60, '60자 이내로 입력해주세요'),
  adopted_at: z.string().min(1, '입양일을 선택해주세요'),
  location: z.string().trim().max(40, '40자 이내로 입력해주세요'),
  /** 빈 문자열이면 "알림 없음". DB check 제약과 같은 범위를 쓴다. */
  watering_interval_days: z
    .string()
    .trim()
    .refine(
      (v) => v === '' || (/^\d+$/.test(v) && Number(v) >= 1 && Number(v) <= 365),
      '1~365 사이 숫자를 입력해주세요',
    ),
});

export type PlantFormValues = z.infer<typeof plantFormSchema>;
