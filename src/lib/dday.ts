import { differenceInCalendarDays } from 'date-fns';

/** 입양일로부터 오늘까지 며칠째인지. 입양 당일은 1일째. */
export function daysSinceAdopted(adoptedAt: Date, now: Date = new Date()): number {
  return differenceInCalendarDays(now, adoptedAt) + 1;
}

/** "D+182" 형태로 포맷. 미래 날짜면 "D-n". */
export function formatDday(adoptedAt: Date, now: Date = new Date()): string {
  const diff = differenceInCalendarDays(now, adoptedAt);
  if (diff < 0) return `D${diff}`;
  return `D+${diff}`;
}
