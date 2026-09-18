import { z } from 'zod';
import { CARE_ACTIONS } from '../constants';

const careActionValues = CARE_ACTIONS.map((a) => a.value) as [string, ...string[]];

export const entryFormSchema = z.object({
  plant_id: z.string().uuid('식물을 선택해주세요'),
  /** datetime-local 입력값 (YYYY-MM-DDTHH:mm) */
  recorded_at: z.string().min(1, '날짜를 입력해주세요'),
  date_source: z.enum(['exif', 'file_mtime', 'manual']),
  actions: z.array(z.enum(careActionValues)),
  note: z.string().max(2000, '2000자 이내로 입력해주세요').optional().or(z.literal('')),
});

export type EntryFormValues = z.infer<typeof entryFormSchema>;
