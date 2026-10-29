import { Check, ChevronDown } from 'lucide-react';
import {
  useEffect,
  useId,
  useRef,
  useState,
  type InputHTMLAttributes,
  type KeyboardEvent,
  type ReactNode,
  type TextareaHTMLAttributes,
} from 'react';
import { cn } from '../../lib/cn';

// 테두리 색은 클래스로 둔다. 인라인 style 로 주면 focus: 클래스를 이겨서 포커스가 안 보인다.
const BASE =
  'w-full rounded-input border border-[var(--border-subtle)] px-3 py-3 text-[15px] transition-colors focus:border-leaf-500';

function fieldStyle() {
  return { background: 'var(--bg-surface)' };
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

export function Textarea({
  className,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea className={cn(BASE, 'resize-y', className)} style={fieldStyle()} {...props} />
  );
}

export interface SelectOption {
  value: string;
  label: string;
}

/**
 * 네이티브 select 대신 ul/li 로 그린 드롭다운.
 * Field 의 <label> 안에 들어가므로 항목 클릭은 preventDefault 한다.
 * 안 그러면 label 이 클릭을 버튼으로 다시 넘겨 목록이 곧바로 다시 열린다.
 */
export function Select({
  value,
  onChange,
  options,
  placeholder = '선택해주세요',
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const rootRef = useRef<HTMLDivElement>(null);
  const listId = useId();
  const selected = options.find((o) => o.value === value);

  useEffect(() => {
    if (!open) return;
    const close = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, [open]);

  function openList() {
    setActive(
      Math.max(
        0,
        options.findIndex((o) => o.value === value),
      ),
    );
    setOpen(true);
  }

  function pick(option: SelectOption) {
    onChange(option.value);
    setOpen(false);
  }

  function handleKeyDown(e: KeyboardEvent<HTMLButtonElement>) {
    if (!open) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        openList();
      }
      return;
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      setOpen(false);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((i) => Math.min(options.length - 1, i + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => Math.max(0, i - 1));
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      const option = options[active];
      if (option) pick(option);
    }
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        className={cn(
          BASE,
          'flex items-center justify-between gap-2 text-left',
          open && 'border-leaf-500',
          className,
        )}
        style={fieldStyle()}
        onClick={() => (open ? setOpen(false) : openList())}
        onKeyDown={handleKeyDown}
      >
        <span
          className="truncate"
          style={selected ? undefined : { color: 'var(--text-muted)' }}
        >
          {selected?.label ?? placeholder}
        </span>
        <ChevronDown
          className={cn('size-4 shrink-0 transition-transform', open && 'rotate-180')}
          style={{ color: 'var(--text-muted)' }}
        />
      </button>

      {open && (
        <ul
          id={listId}
          role="listbox"
          className="absolute inset-x-0 top-full z-40 mt-1 max-h-64 overflow-y-auto rounded-input border p-1 shadow-lg"
          style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border-subtle)' }}
        >
          {options.map((option, i) => {
            const isSelected = option.value === value;
            return (
              <li
                key={option.value}
                role="option"
                aria-selected={isSelected}
                className={cn(
                  'flex min-h-[44px] cursor-pointer items-center justify-between gap-2 rounded-[8px] px-3 text-[15px]',
                  i === active && 'bg-leaf-500/10',
                  isSelected && 'font-semibold text-leaf-600',
                )}
                onPointerEnter={() => setActive(i)}
                onClick={(e) => {
                  e.preventDefault();
                  pick(option);
                }}
              >
                <span className="truncate">{option.label}</span>
                {isSelected && <Check className="size-4 shrink-0" />}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
