import { Sprout } from 'lucide-react';
import { cn } from '../../lib/cn';

/**
 * Storage 사진. 서명 URL 은 부모가 useSignedUrls 로 한 번에 받아 내려준다
 * (카드마다 요청하면 N+1 이 된다).
 */
export function Photo({
  url,
  alt,
  className,
}: {
  url: string | null | undefined;
  alt: string;
  className?: string;
}) {
  if (!url) {
    return (
      <div
        className={cn('flex items-center justify-center', className)}
        style={{ background: 'var(--bg-elevated)' }}
        role="img"
        aria-label={alt}
      >
        <Sprout className="size-8 text-leaf-300" aria-hidden />
      </div>
    );
  }

  return <img src={url} alt={alt} loading="lazy" className={cn('object-cover', className)} />;
}
