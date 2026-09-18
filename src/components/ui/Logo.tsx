import { Sprout } from 'lucide-react';
import { cn } from '../../lib/cn';
import { BRAND } from '../../lib/constants';

/**
 * 마크 + 워드마크.
 *
 * 마크는 lucide 의 Sprout 을 그대로 쓴다 — 앱 전체가 lucide 라인 아이콘이라
 * 따로 그린 도형을 섞으면 혼자 튄다.
 */
export function Logo({
  vertical = false,
  className,
  markClassName,
  wordClassName,
}: {
  /** 랜딩·인증 화면처럼 넓게 쓸 때는 세로로 쌓는다 */
  vertical?: boolean;
  className?: string;
  markClassName?: string;
  wordClassName?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center text-leaf-500',
        vertical ? 'flex-col gap-1' : 'gap-2',
        className,
      )}
    >
      <Sprout className={cn('size-6', markClassName)} aria-hidden />
      <span className={cn('font-brand font-bold tracking-tight', wordClassName)}>
        {BRAND.wordmark}
      </span>
    </span>
  );
}
