import { CARE_ACTIONS, type CareAction } from '../../lib/constants';
import { cn } from '../../lib/cn';

/** 이모지만으로 정보를 전달하지 않는다 — 텍스트 라벨을 항상 같이 둔다 (접근성) */
export function ActionChips({
  selected,
  onToggle,
}: {
  selected: CareAction[];
  onToggle: (action: CareAction) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {CARE_ACTIONS.map(({ value, emoji, label }) => {
        const active = selected.includes(value);
        return (
          <button
            key={value}
            type="button"
            aria-pressed={active}
            onClick={() => onToggle(value)}
            className={cn(
              'inline-flex min-h-[44px] items-center gap-1.5 rounded-chip border px-3.5 text-sm font-medium transition-colors',
              active ? 'border-leaf-500 bg-leaf-100 text-leaf-700' : 'hover:bg-leaf-50',
            )}
            style={active ? undefined : { borderColor: 'var(--border-subtle)' }}
          >
            <span aria-hidden>{emoji}</span>
            {label}
          </button>
        );
      })}
    </div>
  );
}

/** 읽기 전용 — 일지 상세/타임라인에서 */
export function ActionList({ actions }: { actions: CareAction[] }) {
  if (actions.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1.5">
      {actions.map((value) => {
        const meta = CARE_ACTIONS.find((a) => a.value === value);
        if (!meta) return null;
        return (
          <span
            key={value}
            className="inline-flex items-center gap-1 rounded-chip bg-leaf-50 px-2 py-0.5 text-xs text-leaf-700"
          >
            <span aria-hidden>{meta.emoji}</span>
            {meta.label}
          </span>
        );
      })}
    </div>
  );
}
