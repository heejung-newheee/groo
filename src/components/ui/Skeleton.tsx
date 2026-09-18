import { cn } from '../../lib/cn';

/** 스피너 대신 스켈레톤을 쓴다 — 스피너는 레이아웃 점프를 만든다. */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn('animate-pulse rounded-input', className)}
      style={{ background: 'var(--border-subtle)' }}
      aria-hidden
    />
  );
}

export function PlantGridSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
      {[0, 1, 2, 3].map((i) => (
        <Skeleton key={i} className="aspect-[3/4]" />
      ))}
    </div>
  );
}

export function TimelineSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex flex-col gap-2">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="aspect-[4/3] w-full" />
        </div>
      ))}
    </div>
  );
}
