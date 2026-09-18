import { Droplet } from 'lucide-react';
import { cn } from '../../lib/cn';
import { plantWateringInput, wateringStatus } from '../../lib/watering';
import type { Plant } from '../../types/models';

/** 물주기 상태 배지. D-day 숫자는 tabular 로 고정폭 (흔들림 방지) */
export function WateringBadge({ plant, className }: { plant: Plant; className?: string }) {
  const status = wateringStatus(plantWateringInput(plant));

  if (status.kind === 'disabled') return null;

  const text =
    status.kind === 'unknown'
      ? '기록 없음'
      : status.kind === 'scheduled'
        ? `D-${status.daysLeft}`
        : status.kind === 'due'
          ? '오늘'
          : `${status.daysOverdue}일 지남`;

  const tone =
    status.kind === 'overdue'
      ? 'text-urgent-500'
      : status.kind === 'due'
        ? 'text-warn-500'
        : 'text-[var(--text-muted)]';

  return (
    <span className={cn('tabular inline-flex items-center gap-1 text-xs', tone, className)}>
      <Droplet className="size-3.5" aria-hidden />
      {text}
    </span>
  );
}
