import { Link } from 'react-router';
import { formatDday } from '../../lib/dday';
import { Photo } from '../ui/Photo';
import { WateringBadge } from './WateringBadge';
import type { PlantWithCover } from '../../types/models';

export function PlantCard({ plant, coverUrl }: { plant: PlantWithCover; coverUrl?: string }) {
  const dday = formatDday(new Date(plant.adopted_at));

  return (
    <Link
      to={`/plants/${plant.id}`}
      className="flex flex-col overflow-hidden rounded-card border transition-transform active:scale-[0.98]"
      style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}
    >
      {/* 이미지가 카드의 70% — 사진 중심 앱이다 */}
      <Photo url={coverUrl} alt={`${plant.nickname} 대표 사진`} className="aspect-[4/3] w-full" />

      <div className="flex flex-col gap-0.5 p-3">
        <span className="truncate text-sm font-semibold">{plant.nickname}</span>
        <span className="tabular text-xs" style={{ color: 'var(--text-muted)' }}>
          {dday}
        </span>
        <WateringBadge plant={plant} />
      </div>
    </Link>
  );
}
