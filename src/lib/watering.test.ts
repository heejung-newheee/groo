import { describe, expect, it } from 'vitest';
import { needsWateringToday, nextWateringDate, wateringStatus } from './watering';

const now = new Date('2026-09-16T10:00:00+09:00');

describe('wateringStatus', () => {
  it('주기가 없으면 disabled', () => {
    expect(wateringStatus({ intervalDays: null, lastWateredAt: now }, now)).toEqual({
      kind: 'disabled',
    });
  });

  it('물 준 기록이 없으면 unknown', () => {
    expect(wateringStatus({ intervalDays: 7, lastWateredAt: null }, now)).toEqual({
      kind: 'unknown',
    });
  });

  it('아직 남았으면 scheduled', () => {
    const s = wateringStatus(
      { intervalDays: 7, lastWateredAt: new Date('2026-09-14T09:00:00+09:00') },
      now,
    );
    expect(s.kind).toBe('scheduled');
    if (s.kind === 'scheduled') expect(s.daysLeft).toBe(5);
  });

  it('오늘이면 due', () => {
    const s = wateringStatus(
      { intervalDays: 7, lastWateredAt: new Date('2026-09-09T09:00:00+09:00') },
      now,
    );
    expect(s.kind).toBe('due');
  });

  it('지났으면 overdue', () => {
    const s = wateringStatus(
      { intervalDays: 7, lastWateredAt: new Date('2026-09-05T09:00:00+09:00') },
      now,
    );
    expect(s.kind).toBe('overdue');
    if (s.kind === 'overdue') expect(s.daysOverdue).toBe(4);
  });
});

describe('nextWateringDate', () => {
  it('주기가 없으면 null', () => {
    expect(nextWateringDate({ intervalDays: null, lastWateredAt: now })).toBeNull();
  });

  it('마지막 물주기 + 주기', () => {
    const d = nextWateringDate({
      intervalDays: 7,
      lastWateredAt: new Date('2026-09-09T09:00:00+09:00'),
    });
    expect(d?.toISOString()).toBe(new Date('2026-09-16T09:00:00+09:00').toISOString());
  });
});

describe('needsWateringToday', () => {
  it('due 와 overdue 만 true', () => {
    const base = { intervalDays: 7 };
    expect(
      needsWateringToday(
        { ...base, lastWateredAt: new Date('2026-09-09T09:00:00+09:00') },
        now,
      ),
    ).toBe(true);
    expect(
      needsWateringToday(
        { ...base, lastWateredAt: new Date('2026-09-01T09:00:00+09:00') },
        now,
      ),
    ).toBe(true);
    expect(
      needsWateringToday(
        { ...base, lastWateredAt: new Date('2026-09-14T09:00:00+09:00') },
        now,
      ),
    ).toBe(false);
  });
});
