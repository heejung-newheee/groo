import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { cn } from '../../lib/cn';

/**
 * 스와이프 가능한 캐러셀. CSS scroll-snap 이라 터치 스와이프·관성 스크롤이
 * 브라우저 기본 동작으로 따라온다.
 *
 * ⚠️ 이동은 scrollLeft = index × clientWidth 로 계산한다.
 * offsetLeft 는 스크롤 컨테이너가 아니라 positioned 조상 기준이라 어긋난다.
 */
export function Carousel({
  label,
  slides,
  className,
  slideClassName,
}: {
  label: string;
  slides: ReactNode[];
  className?: string;
  slideClassName?: string;
}) {
  const trackRef = useRef<HTMLUListElement>(null);
  const [active, setActive] = useState(0);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const index = Number((entry.target as HTMLElement).dataset['index']);
            if (!Number.isNaN(index)) setActive(index);
          }
        }
      },
      { root: track, threshold: 0.6 },
    );

    for (const child of track.children) io.observe(child);
    return () => io.disconnect();
  }, [slides.length]);

  function goTo(index: number) {
    const track = trackRef.current;
    if (!track) return;
    track.scrollTo({ left: index * track.clientWidth, behavior: 'smooth' });
  }

  if (slides.length === 0) return null;

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      <div className="relative">
        <ul
          ref={trackRef}
          aria-label={label}
          className="flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          // touch-action 은 건드리지 않는다. 기본값 auto 라야 브라우저가
          // 가로 스와이프와 세로 페이지 스크롤을 알아서 구분한다.
          // pan-y 를 주면 가로 패닝이 아예 막힌다.
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          {slides.map((slide, index) => (
            <li
              // eslint-disable-next-line react/no-array-index-key
              key={index}
              data-index={index}
              className={cn('w-full shrink-0 snap-center snap-always', slideClassName)}
            >
              {slide}
            </li>
          ))}
        </ul>

        {slides.length > 1 && (
          <>
            <Arrow side="left" disabled={active === 0} onClick={() => goTo(active - 1)} />
            <Arrow
              side="right"
              disabled={active === slides.length - 1}
              onClick={() => goTo(active + 1)}
            />
          </>
        )}
      </div>

      {slides.length > 1 && (
        <div className="flex justify-center gap-1">
          {slides.map((_, index) => (
            <button
              // eslint-disable-next-line react/no-array-index-key
              key={index}
              type="button"
              onClick={() => goTo(index)}
              aria-label={`${index + 1}번째로 이동`}
              aria-current={index === active}
              className="flex size-6 items-center justify-center"
            >
              <span
                className={cn(
                  'block size-2 rounded-full transition-colors',
                  index === active ? 'bg-leaf-500' : 'bg-leaf-300',
                )}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function Arrow({
  side,
  disabled,
  onClick,
}: {
  side: 'left' | 'right';
  disabled: boolean;
  onClick: () => void;
}) {
  const Icon = side === 'left' ? ChevronLeft : ChevronRight;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={side === 'left' ? '이전' : '다음'}
      className={cn(
        'absolute top-1/2 hidden size-9 -translate-y-1/2 items-center justify-center rounded-full border sm:flex',
        'disabled:opacity-30',
        side === 'left' ? 'left-2' : 'right-2',
      )}
      style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}
    >
      <Icon className="size-5" aria-hidden />
    </button>
  );
}
