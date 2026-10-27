import { cn } from '../../lib/cn';
import { authorName } from '../../lib/format';
import type { Author } from '../../types/models';

/** 아바타가 없으면 이름 첫 글자를 그린다 */
export function Avatar({
  author,
  className,
}: {
  author: Author | null;
  className?: string;
}) {
  const name = authorName(author);

  if (author?.avatar_url) {
    return (
      <img
        src={author.avatar_url}
        alt=""
        className={cn('size-9 shrink-0 rounded-full object-cover', className)}
      />
    );
  }
  return (
    <span
      className={cn(
        'flex size-9 shrink-0 items-center justify-center rounded-full bg-leaf-100 text-sm font-semibold text-leaf-700',
        className,
      )}
      aria-hidden
    >
      {name.slice(0, 1)}
    </span>
  );
}
