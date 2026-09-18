import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '../../lib/cn';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md';

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  children: ReactNode;
}

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-leaf-500 text-white hover:bg-leaf-600 disabled:bg-leaf-300',
  secondary: 'bg-leaf-50 text-leaf-700 hover:bg-leaf-100',
  ghost: 'hover:bg-leaf-50',
  danger: 'bg-urgent-500 text-white hover:brightness-95',
};

// 터치 타겟 최소 44px — 접근성 기준
const SIZES: Record<Size, string> = {
  sm: 'min-h-[44px] px-3 text-sm',
  md: 'min-h-[48px] px-4 text-[15px]',
};

export function Button({ variant = 'primary', size = 'md', className, ...props }: Props) {
  return (
    <button
      type="button"
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-input font-semibold transition-colors',
        'disabled:cursor-not-allowed disabled:opacity-60',
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...props}
    />
  );
}
