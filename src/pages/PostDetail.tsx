import { Flag, Trash2 } from 'lucide-react';
import { authorName, timeAgo } from '../lib/format';
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { COMMUNITY } from '../lib/constants';
import {
  useComments,
  useCreateComment,
  useDeleteComment,
  useDeletePost,
  usePost,
} from '../hooks/useCommunity';
import { useUserId } from '../hooks/useSession';
import { useSignedUrls } from '../hooks/useSignedUrls';
import { Avatar } from '../components/community/Avatar';
import { LikeButton } from '../components/community/LikeButton';
import { HiddenNotice } from '../components/community/PostCard';
import { KindBadge, PlantTag } from '../components/community/PostMeta';
import { ReportDialog } from '../components/community/ReportDialog';
import { Button } from '../components/ui/Button';
import { Carousel } from '../components/ui/Carousel';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { Textarea } from '../components/ui/Field';
import { Photo } from '../components/ui/Photo';
import { Skeleton } from '../components/ui/Skeleton';
import { EmptyState, ErrorState } from '../components/ui/States';
import type { ReportTarget } from '../api/community';
import type { Comment } from '../types/models';

export function PostDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const me = useUserId();
  const { data: post, isPending, isError, refetch } = usePost(id);
  const remove = useDeletePost();
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [reporting, setReporting] = useState<ReportTarget | null>(null);

  const { data: urls } = useSignedUrls(post?.photos.map((p) => p.storage_path) ?? []);

  if (isPending) return <Skeleton className="aspect-square w-full" />;
  if (isError) return <ErrorState onRetry={() => void refetch()} />;
  if (!post)
    return (
      <EmptyState title="글을 찾을 수 없어요" description="삭제됐거나 숨겨진 글이에요" />
    );

  const mine = post.user_id === me;
  const name = authorName(post.author);

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-4">
      <header className="flex items-center gap-2.5">
        <Link
          to={`/community/users/${post.user_id}`}
          className="flex min-w-0 items-center gap-2.5"
        >
          <Avatar author={post.author} />
          <span className="flex min-w-0 flex-col">
            <span className="truncate text-sm font-semibold">{name}</span>
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
              {timeAgo(post.created_at)}
            </span>
          </span>
        </Link>
        <span className="ml-auto flex items-center gap-1">
          <KindBadge kind={post.kind} />
          {mine ? (
            <button
              type="button"
              aria-label="글 삭제"
              disabled={remove.isPending}
              onClick={() => setConfirmingDelete(true)}
              className="p-2 text-urgent-500 disabled:opacity-50"
            >
              <Trash2 className="size-5" aria-hidden />
            </button>
          ) : (
            <button
              type="button"
              aria-label="글 신고"
              onClick={() => setReporting({ postId: post.id })}
              className="p-2"
              style={{ color: 'var(--text-muted)' }}
            >
              <Flag className="size-5" aria-hidden />
            </button>
          )}
        </span>
      </header>

      <Carousel
        label={`${name}의 사진`}
        slides={post.photos.map((p, i) => (
          <Photo
            key={p.id}
            url={urls?.[p.storage_path]}
            alt={`${name}의 사진 ${i + 1}`}
            className="aspect-square w-full"
          />
        ))}
      />

      {post.hidden_at && <HiddenNotice />}
      <PlantTag post={post} />
      <p className="text-[15px] whitespace-pre-wrap">{post.body}</p>
      <LikeButton post={post} />

      <Comments
        postId={post.id}
        me={me}
        onReport={(commentId) => setReporting({ commentId })}
      />

      {confirmingDelete && (
        <ConfirmDialog
          message="이 글을 삭제할까요? 댓글도 함께 지워져요."
          confirmLabel="삭제"
          busy={remove.isPending}
          onCancel={() => setConfirmingDelete(false)}
          onConfirm={() =>
            remove.mutate(post, {
              onSuccess: () => void navigate('/community', { replace: true }),
            })
          }
        />
      )}
      {reporting && <ReportDialog target={reporting} onClose={() => setReporting(null)} />}
    </div>
  );
}

function Comments({
  postId,
  me,
  onReport,
}: {
  postId: string;
  me: string | null;
  onReport: (commentId: string) => void;
}) {
  const { data: comments, isPending } = useComments(postId);
  const create = useCreateComment(postId);
  const [body, setBody] = useState('');

  function handleSubmit() {
    const text = body.trim();
    if (!text || create.isPending) return;
    create.mutate(text, { onSuccess: () => setBody('') });
  }

  return (
    <section
      className="flex flex-col gap-3 border-t pt-4"
      style={{ borderColor: 'var(--border-subtle)' }}
    >
      <h2 className="text-sm font-semibold">댓글 {comments?.length ?? ''}</h2>

      {isPending ? (
        <Skeleton className="h-16 w-full" />
      ) : (
        <ul className="flex flex-col gap-3">
          {comments?.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              mine={comment.user_id === me}
              onReport={() => onReport(comment.id)}
            />
          ))}
        </ul>
      )}

      <div className="flex items-end gap-2">
        <Textarea
          rows={1}
          maxLength={COMMUNITY.maxCommentLength}
          value={body}
          onChange={(e) => setBody(e.currentTarget.value)}
          placeholder="댓글 달기"
          aria-label="댓글"
        />
        <Button
          size="sm"
          disabled={!body.trim() || create.isPending}
          onClick={handleSubmit}
        >
          등록
        </Button>
      </div>
      {create.isError && (
        <p className="text-sm text-urgent-500">
          댓글을 달지 못했어요. 잠시 후 다시 시도해주세요.
        </p>
      )}
    </section>
  );
}

function CommentItem({
  comment,
  mine,
  onReport,
}: {
  comment: Comment;
  mine: boolean;
  onReport: () => void;
}) {
  const remove = useDeleteComment(comment.post_id);
  const [confirming, setConfirming] = useState(false);

  return (
    <li className="flex gap-2.5">
      <Link to={`/community/users/${comment.user_id}`}>
        <Avatar author={comment.author} className="size-8 text-xs" />
      </Link>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-xs">
          <span className="font-semibold">{authorName(comment.author)}</span>
          <span className="ml-2" style={{ color: 'var(--text-muted)' }}>
            {timeAgo(comment.created_at)}
          </span>
        </span>
        {comment.hidden_at && <HiddenNotice />}
        <p className="text-sm whitespace-pre-wrap">{comment.body}</p>
      </div>
      {mine ? (
        <button
          type="button"
          aria-label="댓글 삭제"
          disabled={remove.isPending}
          onClick={() => setConfirming(true)}
          className="self-start p-1.5 text-urgent-500 disabled:opacity-50"
        >
          <Trash2 className="size-4" aria-hidden />
        </button>
      ) : (
        <button
          type="button"
          aria-label="댓글 신고"
          onClick={onReport}
          className="self-start p-1.5"
          style={{ color: 'var(--text-muted)' }}
        >
          <Flag className="size-4" aria-hidden />
        </button>
      )}

      {confirming && (
        <ConfirmDialog
          message="이 댓글을 삭제할까요?"
          confirmLabel="삭제"
          busy={remove.isPending}
          onCancel={() => setConfirming(false)}
          onConfirm={() =>
            remove.mutate(comment.id, { onSuccess: () => setConfirming(false) })
          }
        />
      )}
    </li>
  );
}
