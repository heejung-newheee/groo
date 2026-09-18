import { addDays, differenceInCalendarDays } from 'date-fns';

export type WateringStatus =
  | { kind: 'disabled' }
  | { kind: 'unknown' }
  | { kind: 'scheduled'; dueAt: Date; daysLeft: number }
  | { kind: 'due'; dueAt: Date }
  | { kind: 'overdue'; dueAt: Date; daysOverdue: number };

export interface WateringInput {
  /** null 이면 알림 없음 (선인장 등) */
  intervalDays: number | null;
  /** 마지막으로 물 준 날. 기록이 없으면 null */
  lastWateredAt: Date | null;
}

export function nextWateringDate(input: WateringInput): Date | null {
  if (input.intervalDays === null || input.lastWateredAt === null) return null;
  return addDays(input.lastWateredAt, input.intervalDays);
}

export function wateringStatus(
  input: WateringInput,
  now: Date = new Date(),
): WateringStatus {
  if (input.intervalDays === null) return { kind: 'disabled' };
  if (input.lastWateredAt === null) return { kind: 'unknown' };

  const dueAt = addDays(input.lastWateredAt, input.intervalDays);
  const daysLeft = differenceInCalendarDays(dueAt, now);

  if (daysLeft > 0) return { kind: 'scheduled', dueAt, daysLeft };
  if (daysLeft === 0) return { kind: 'due', dueAt };
  return { kind: 'overdue', dueAt, daysOverdue: -daysLeft };
}

/** 홈의 "오늘 할 일"에 노출할지 여부 */
export function needsWateringToday(input: WateringInput, now: Date = new Date()): boolean {
  const status = wateringStatus(input, now);
  return status.kind === 'due' || status.kind === 'overdue';
}

/** DB 의 plant row 를 물주기 계산 입력으로 바꾼다. */
export function plantWateringInput(plant: {
  watering_interval_days: number | null;
  last_watered_at: string | null;
}): WateringInput {
  return {
    intervalDays: plant.watering_interval_days,
    lastWateredAt: plant.last_watered_at ? new Date(plant.last_watered_at) : null,
  };
}
