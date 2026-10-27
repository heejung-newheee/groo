import { Heart } from 'lucide-react';
import { cn } from '../../lib/cn';
import { useToggleLike } from '../../hooks/useCommunity';
import type { PostWithMeta } from '../../types/models';

/** 질문 글에서는 같은 버튼을 "저도 궁금해요" 로 읽히게 한다 */
export function LikeButton({ post }: { post: PostWithMeta }) {
  const toggle = useToggleLike();
  const label = post.kind === 'question' ? '저도 궁금해요' : '좋아요';

  return (
    <button
      type="button"
      aria-pressed={post.liked_by_me}
      aria-label={`${label} ${post.like_count}`}
      onClick={(e) => {
        // 카드 전체가 링크라 상세로 넘어가지 않게 막는다
        e.preventDefault();
        toggle.mutate({ postId: post.id, liked: !post.liked_by_me });
      }}
      className={cn(
        'inline-flex min-h-[44px] items-center gap-1.5 text-sm',
        post.liked_by_me ? 'text-bloom-400' : 'text-[var(--text-muted)]',
      )}
    >
      <Heart className={cn('size-5', post.liked_by_me && 'fill-current')} aria-hidden />
      <span className="tabular">{post.like_count}</span>
    </button>
  );
}
