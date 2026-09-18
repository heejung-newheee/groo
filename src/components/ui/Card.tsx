import type { HTMLAttributes } from 'react';
import { cn } from '../../lib/cn';

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('rounded-card border p-4', className)}
      style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}
      {...props}
    />
  );
}
