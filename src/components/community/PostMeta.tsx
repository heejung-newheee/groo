import { COMMUNITY } from '../../lib/constants';
import { formatDday } from '../../lib/dday';
import { cn } from '../../lib/cn';
import type { Post, PostKind } from '../../types/models';

export function KindBadge({ kind }: { kind: PostKind }) {
  const label = COMMUNITY.kinds.find((k) => k.value === kind)?.label ?? kind;
  return (
    <span
      className={cn(
        'rounded-full px-2 py-0.5 text-[11px] font-semibold',
        kind === 'question'
          ? 'bg-water-500/10 text-water-500'
          : 'bg-leaf-100 text-leaf-700',
      )}
    >
      {label}
    </span>
  );
}

/** 태그한 식물 — "🪴 몬스테라 · Monstera · D+182" */
export function PlantTag({ post }: { post: Post }) {
  if (!post.plant_nickname) return null;
  const parts = [post.plant_nickname, post.plant_species].filter(Boolean);
  return (
    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
      🪴 {parts.join(' · ')}
      {post.plant_adopted_at && (
        <span className="tabular"> · {formatDday(new Date(post.plant_adopted_at))}</span>
      )}
    </span>
  );
}
