import { ChevronDown, ChevronUp } from 'lucide-react';
import type { PlantWithCover } from '../../types/models';

/** 순서 편집 모드. 드래그 대신 버튼으로 옮긴다 — 키보드로도 완주 가능해야 한다 */
export function PlantReorderList({
  plants,
  onMove,
}: {
  plants: PlantWithCover[];
  onMove: (from: number, to: number) => void;
}) {
  return (
    <ol className="flex flex-col gap-2">
      {plants.map((plant, index) => (
        <li
          key={plant.id}
          className="flex items-center gap-3 rounded-card border px-4 py-2"
          style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}
        >
          <span className="tabular w-5 text-sm" style={{ color: 'var(--text-muted)' }}>
            {index + 1}
          </span>
          <span className="flex-1 truncate font-medium">{plant.nickname}</span>
          <button
            type="button"
            onClick={() => onMove(index, index - 1)}
            disabled={index === 0}
            aria-label={`${plant.nickname} 위로`}
            className="flex size-11 items-center justify-center rounded-input disabled:opacity-30"
          >
            <ChevronUp className="size-5" aria-hidden />
          </button>
          <button
            type="button"
            onClick={() => onMove(index, index + 1)}
            disabled={index === plants.length - 1}
            aria-label={`${plant.nickname} 아래로`}
            className="flex size-11 items-center justify-center rounded-input disabled:opacity-30"
          >
            <ChevronDown className="size-5" aria-hidden />
          </button>
        </li>
      ))}
    </ol>
  );
}
