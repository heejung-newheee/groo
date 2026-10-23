import { useParams } from 'react-router';
import { authorName } from '../lib/format';
import { useAuthor } from '../hooks/useCommunity';
import { Avatar } from '../components/community/Avatar';
import { PostFeed } from '../components/community/PostFeed';
import { Skeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/States';

/** 한 사람이 올린 글만 모아 보는 피드 */
export function UserProfile() {
  const { id } = useParams<{ id: string }>();
  const { data: author, isPending } = useAuthor(id);

  if (isPending) return <Skeleton className="h-24 w-full" />;
  if (!author || !id) return <EmptyState title="사용자를 찾을 수 없어요" />;

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-5">
      <header className="flex items-center gap-3">
        <Avatar author={author} className="size-14 text-lg" />
        <h1 className="text-xl font-bold">{authorName(author)}</h1>
      </header>

      <PostFeed filter={{ kind: 'all', authorId: id }} emptyTitle="아직 올린 글이 없어요" />
    </div>
  );
}
