import { Sprout } from 'lucide-react';
import type { ReactNode } from 'react';
import { Button } from './Button';

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 px-6 text-center">
      <Sprout className="size-12 text-leaf-300" aria-hidden />
      <h2 className="text-lg font-bold">{title}</h2>
      {description && (
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          {description}
        </p>
      )}
      {action}
    </div>
  );
}

export function ErrorState({ onRetry }: { onRetry?: () => void }) {
  return (
    <div className="flex min-h-[30vh] flex-col items-center justify-center gap-3 text-center">
      <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
        연결이 불안정해요
      </p>
      {onRetry && (
        <Button variant="secondary" size="sm" onClick={onRetry}>
          다시 시도
        </Button>
      )}
    </div>
  );
}
