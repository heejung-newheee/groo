import { describe, expect, it } from 'vitest';
import { daysSinceAdopted, formatDday } from './dday';

const now = new Date('2026-09-16T10:00:00+09:00');

describe('daysSinceAdopted', () => {
  it('입양 당일은 1일째', () => {
    expect(daysSinceAdopted(new Date('2026-09-16T23:00:00+09:00'), now)).toBe(1);
  });

  it('하루 지나면 2일째', () => {
    expect(daysSinceAdopted(new Date('2026-09-15T01:00:00+09:00'), now)).toBe(2);
  });

  it('시각이 아니라 날짜 기준으로 센다', () => {
    // 15일 23:59 → 16일 00:01 은 1분 차이지만 하루로 센다
    expect(daysSinceAdopted(new Date('2026-09-15T23:59:00+09:00'), now)).toBe(2);
  });
});

describe('formatDday', () => {
  it('과거는 D+', () => {
    expect(formatDday(new Date('2026-03-18T00:00:00+09:00'), now)).toBe('D+182');
  });

  it('당일은 D+0', () => {
    expect(formatDday(new Date('2026-09-16T00:00:00+09:00'), now)).toBe('D+0');
  });

  it('미래는 D-', () => {
    expect(formatDday(new Date('2026-09-20T00:00:00+09:00'), now)).toBe('D-4');
  });
});
