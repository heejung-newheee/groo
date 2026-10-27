import { EyeOff, Images, MessageCircle } from 'lucide-react';
import { authorName, timeAgo } from '../../lib/format';
import { Link } from 'react-router';
import { Photo } from '../ui/Photo';
import { Avatar } from './Avatar';
import { LikeButton } from './LikeButton';
import { KindBadge, PlantTag } from './PostMeta';
import type { PostWithMeta } from '../../types/models';

export function PostCard({ post, photoUrl }: { post: PostWithMeta; photoUrl?: string }) {
  const first = post.photos[0];

  return (
    <article
      className="overflow-hidden rounded-card border"
      style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}
    >
      <header className="flex items-center gap-2.5 p-3">
        <Link
          to={`/community/users/${post.user_id}`}
          className="flex min-w-0 items-center gap-2.5"
        >
          <Avatar author={post.author} />
          <span className="flex min-w-0 flex-col">
            <span className="truncate text-sm font-semibold">
              {authorName(post.author)}
            </span>
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
              {timeAgo(post.created_at)}
            </span>
          </span>
        </Link>
        <span className="ml-auto">
          <KindBadge kind={post.kind} />
        </span>
      </header>

      <Link to={`/community/posts/${post.id}`} className="block">
        {first && (
          <div className="relative">
            <Photo
              url={photoUrl}
              alt={`${authorName(post.author)}의 사진`}
              className="aspect-square w-full"
            />
            {post.photos.length > 1 && (
              <span className="absolute top-2 right-2 flex items-center gap-1 rounded-full bg-bark-800/70 px-2 py-0.5 text-xs text-white">
                <Images className="size-3.5" aria-hidden />
                {post.photos.length}
              </span>
            )}
          </div>
        )}

        <div className="flex flex-col gap-1 px-3 pt-3">
          {post.hidden_at && <HiddenNotice />}
          <PlantTag post={post} />
          <p className="line-clamp-3 text-[15px] whitespace-pre-wrap">{post.body}</p>
        </div>
      </Link>

      <footer className="flex items-center gap-4 px-3">
        <LikeButton post={post} />
        <Link
          to={`/community/posts/${post.id}`}
          aria-label={`댓글 ${post.comment_count}`}
          className="inline-flex min-h-[44px] items-center gap-1.5 text-sm"
          style={{ color: 'var(--text-muted)' }}
        >
          <MessageCircle className="size-5" aria-hidden />
          <span className="tabular">{post.comment_count}</span>
        </Link>
      </footer>
    </article>
  );
}

/** 숨겨진 글은 작성자에게만 내려온다 */
export function HiddenNotice() {
  return (
    <span className="inline-flex items-center gap-1 text-xs text-urgent-500">
      <EyeOff className="size-3.5" aria-hidden />
      신고가 쌓여 다른 사람에게는 숨겨졌어요
    </span>
  );
}
