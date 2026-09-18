import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
  subMonths,
} from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { cn } from '../lib/cn';
import { nextWateringDate, plantWateringInput } from '../lib/watering';
import { useEntriesByMonth } from '../hooks/useEntries';
import { usePlants } from '../hooks/usePlants';
import { ActionList } from '../components/entries/ActionChips';
import { Skeleton } from '../components/ui/Skeleton';

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

  const wateringDays = useMemo(() => {
    const dates: Date[] = [];
    for (const plant of plants ?? []) {
      const due = nextWateringDate(plantWateringInput(plant));
      if (due) dates.push(due);
    }
    return dates;
  }, [plants]);

  const selectedEntries = (entries ?? []).filter((e) =>
    isSameDay(new Date(e.recorded_at), selected),
  );

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-5">
      <header className="flex items-center justify-between">
        <button type="button" onClick={() => setMonth(subMonths(month, 1))} aria-label="이전 달" className="p-2">
          <ChevronLeft className="size-5" aria-hidden />
        </button>
        <h1 className="tabular text-lg font-bold">{format(month, 'yyyy년 M월')}</h1>
        <button type="button" onClick={() => setMonth(addMonths(month, 1))} aria-label="다음 달" className="p-2">
          <ChevronRight className="size-5" aria-hidden />
        </button>
      </header>

      {isPending ? (
        <Skeleton className="h-72 w-full" />
      ) : (
        <div className="grid grid-cols-7 gap-1">
          {WEEKDAYS.map((w) => (
            <div key={w} className="py-1 text-center text-xs" style={{ color: 'var(--text-muted)' }}>
              {w}
            </div>
          ))}

          {days.map((day) => {
            const hasEntry = (entries ?? []).some((e) => isSameDay(new Date(e.recorded_at), day));
            const hasWatering = wateringDays.some((d) => isSameDay(d, day));
            const isSelected = isSameDay(day, selected);

            return (
              <button
                key={day.toISOString()}
                type="button"
                onClick={() => setSelected(day)}
                aria-label={`${format(day, 'M월 d일')}${hasEntry ? ', 기록 있음' : ''}`}
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
                  {hasEntry && <span className="size-1.5 rounded-full bg-leaf-500" aria-hidden />}
                  {hasWatering && <span className="size-1.5 rounded-full bg-soil-300" aria-hidden />}
                </span>
              </button>
            );
          })}
        </div>
      )}

      <section>
        <h2 className="tabular mb-2 font-bold">{format(selected, 'MM/dd (EEEEE)')}</h2>
        {selectedEntries.length === 0 ? (
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            이 날의 기록이 없어요
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {selectedEntries.map((entry) => (
              <li key={entry.id}>
                <Link to={`/entries/${entry.id}`} className="flex items-center gap-2 text-sm">
                  <span className="font-medium">{entry.plant?.nickname ?? '식물'}</span>
                  <ActionList actions={entry.actions} />
                  {entry.note && <span className="truncate">{entry.note}</span>}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="flex gap-4 text-xs" style={{ color: 'var(--text-muted)' }}>
        <span className="inline-flex items-center gap-1">
          <span className="size-1.5 rounded-full bg-leaf-500" aria-hidden /> 일지
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="size-1.5 rounded-full bg-soil-300" aria-hidden /> 예정된 물주기
        </span>
      </p>
    </div>
  );
}
