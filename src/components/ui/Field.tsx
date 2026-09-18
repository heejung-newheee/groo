import type { InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from 'react';
import { cn } from '../../lib/cn';

const BASE =
  'w-full rounded-input border px-3 py-3 text-[15px] outline-none transition-colors focus:border-leaf-500';

function fieldStyle() {
  return { background: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' };
}

export function Field({
  label,
  error,
  hint,
  children,
}: {
  label: string;
  error?: string | undefined;
  hint?: ReactNode;
  children: ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-medium">{label}</span>
      {children}
      {hint && !error && (
        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
          {hint}
        </span>
      )}
      {error && <span className="text-xs text-urgent-500">{error}</span>}
    </label>
  );
}

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(BASE, className)} style={fieldStyle()} {...props} />;
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea className={cn(BASE, 'resize-y', className)} style={fieldStyle()} {...props} />
  );
}

export function Select({
  className,
  children,
  ...props
}: InputHTMLAttributes<HTMLSelectElement> & { children: ReactNode }) {
  return (
    <select className={cn(BASE, className)} style={fieldStyle()} {...props}>
      {children}
    </select>
  );
}
