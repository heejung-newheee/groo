import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isAfter,
  isSameDay,
  isSameMonth,
  isToday,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subMonths,
} from 'date-fns';
import { ChevronLeft, ChevronRight, Droplet } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { cn } from '../lib/cn';
import { nextWateringDate, plantWateringInput } from '../lib/watering';
import { useEntriesByMonth } from '../hooks/useEntries';
import { usePlants } from '../hooks/usePlants';
import { ActionList } from '../components/entries/ActionChips';
import { Skeleton } from '../components/ui/Skeleton';
import type { PlantWithCover } from '../types/models';

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

export function CalendarPage() {
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const [selected, setSelected] = useState(() => new Date());

  const { data: entries, isPending } = useEntriesByMonth(month);
  const { data: plants } = usePlants();

  // 달력 격자는 주 단위로 채운다 (앞뒤 달의 며칠이 섞인다)
  const days = useMemo(
    () =>
      eachDayOfInterval({
        start: startOfWeek(startOfMonth(month)),
        end: endOfWeek(endOfMonth(month)),
      }),
    [month],
  );

  /**
   * 날짜별로 "이 날 물 줄 식물" 을 모은다.
   *
   * 물을 주면 다음 예정일이 앞으로 밀리므로, **예정일이 오늘보다 과거로 남아 있다는 건
   * 아직 안 줬다는 뜻**이다. 그걸 overdue 로 표시해 점을 짙게 그린다.
   */
  const wateringByDay = useMemo(() => {
    const map = new Map<string, { plant: PlantWithCover; overdue: boolean }[]>();
    const today = startOfDay(new Date());

    for (const plant of plants ?? []) {
      const due = nextWateringDate(plantWateringInput(plant));
      if (!due) continue;

      const key = format(due, 'yyyy-MM-dd');
      const list = map.get(key) ?? [];
      list.push({ plant, overdue: !isAfter(due, today) });
      map.set(key, list);
    }
    return map;
  }, [plants]);

  const selectedEntries = (entries ?? []).filter((e) =>
    isSameDay(new Date(e.recorded_at), selected),
  );
  const selectedWatering = wateringByDay.get(format(selected, 'yyyy-MM-dd')) ?? [];

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-5">
      <p
        className="flex flex-wrap justify-end gap-x-4 gap-y-1 text-xs"
        style={{ color: 'var(--text-muted)' }}
      >
        <span className="inline-flex items-center gap-1">
          <span className="size-1.5 rounded-full bg-leaf-500" aria-hidden /> 일지
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="size-1.5 rounded-full bg-soil-300 opacity-50" aria-hidden />{' '}
          물주기 예정
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="size-1.5 rounded-full bg-soil-500" aria-hidden /> 물주기 밀림
        </span>
      </p>
      <header className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setMonth(subMonths(month, 1))}
          aria-label="이전 달"
          className="p-2"
        >
          <ChevronLeft className="size-5" aria-hidden />
        </button>
        <h1 className="tabular text-lg font-bold">{format(month, 'yyyy년 M월')}</h1>
        <button
          type="button"
          onClick={() => setMonth(addMonths(month, 1))}
          aria-label="다음 달"
          className="p-2"
        >
          <ChevronRight className="size-5" aria-hidden />
        </button>
      </header>

      {isPending ? (
        <Skeleton className="h-72 w-full" />
      ) : (
        <div className="grid grid-cols-7 gap-1">
          {WEEKDAYS.map((w) => (
            <div
              key={w}
              className="py-1 text-center text-xs"
              style={{ color: 'var(--text-muted)' }}
            >
              {w}
            </div>
          ))}

          {days.map((day) => {
            const hasEntry = (entries ?? []).some((e) =>
              isSameDay(new Date(e.recorded_at), day),
            );
            const watering = wateringByDay.get(format(day, 'yyyy-MM-dd')) ?? [];
            const wateringOverdue = watering.some((w) => w.overdue);
            const isSelected = isSameDay(day, selected);

            return (
              <button
                key={day.toISOString()}
                type="button"
                onClick={() => setSelected(day)}
                aria-label={[
                  format(day, 'M월 d일'),
                  hasEntry ? '기록 있음' : '',
                  watering.length > 0
                    ? wateringOverdue
                      ? '물주기 밀림'
                      : '물주기 예정'
                    : '',
                ]
                  .filter(Boolean)
                  .join(', ')}
                aria-current={isSelected}
                className={cn(
                  'tabular flex min-h-[44px] flex-col items-center justify-center gap-0.5 rounded-input text-sm',
                  !isSameMonth(day, month) && 'opacity-35',
                  isSelected && 'bg-leaf-100 text-leaf-700',
                  isToday(day) && !isSelected && 'font-bold text-leaf-600',
                )}
              >
                {format(day, 'd')}
                <span className="flex h-1.5 gap-0.5">
                  {hasEntry && (
                    <span className="size-1.5 rounded-full bg-leaf-500" aria-hidden />
                  )}
                  {watering.length > 0 && (
                    // 밀린 물주기는 짙게, 아직 안 온 예정은 흐리게
                    <span
                      className={cn(
                        'size-1.5 rounded-full',
                        wateringOverdue ? 'bg-soil-500' : 'bg-soil-300 opacity-50',
                      )}
                      aria-hidden
                    />
                  )}
                </span>
              </button>
            );
          })}
        </div>
      )}

      <section className="flex flex-col gap-4">
        {/* date-fns 기본 로케일은 요일을 영어로 낸다. 배열에서 직접 가져온다. */}
        <h2 className="tabular font-bold">
          {format(selected, 'MM/dd')} ({WEEKDAYS[selected.getDay()]})
        </h2>

        {selectedWatering.length > 0 && (
          <div className="flex flex-col gap-1.5">
            <h3 className="text-sm font-semibold">💧 물 줄 아이</h3>
            <ul className="flex flex-col gap-1">
              {selectedWatering.map(({ plant, overdue }) => (
                <li key={plant.id}>
                  <Link
                    to={`/plants/${plant.id}`}
                    className="flex items-center gap-2 text-sm"
                  >
                    <Droplet
                      className={cn('size-4', overdue ? 'text-soil-500' : 'text-soil-300')}
                      aria-hidden
                    />
                    <span className="font-medium">{plant.nickname}</span>
                    <span className={cn('text-xs', overdue && 'text-warn-500')}>
                      {overdue ? '아직 안 줬어요' : '예정'}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <h3 className="text-sm font-semibold">📝 기록</h3>
          {selectedEntries.length === 0 ? (
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              이 날의 기록이 없어요
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {selectedEntries.map((entry) => (
                <li key={entry.id}>
                  <Link
                    to={`/entries/${entry.id}`}
                    className="flex items-center gap-2 text-sm"
                  >
                    <span className="font-medium">{entry.plant?.nickname ?? '식물'}</span>
                    <ActionList actions={entry.actions} />
                    {entry.note && <span className="truncate">{entry.note}</span>}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}
