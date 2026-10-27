import { useEffect, useRef } from 'react';
import { usePostFeed } from '../../hooks/useCommunity';
import { useSignedUrls } from '../../hooks/useSignedUrls';
import { thumbPath } from '../../lib/image';
import { Skeleton } from '../ui/Skeleton';
import { EmptyState, ErrorState } from '../ui/States';
import { PostCard } from './PostCard';
import type { FeedFilter } from '../../api/community';

/** 커뮤니티 피드와 프로필 피드가 같이 쓴다 */
export function PostFeed({
  filter,
  emptyTitle,
}: {
  filter: FeedFilter;
  emptyTitle: string;
}) {
  const feed = usePostFeed(filter);
  const posts = feed.data?.pages.flat() ?? [];

  // 썸네일이 없으면 원본으로 대체하려고 둘 다 서명한다 (없는 경로는 결과에서 빠진다)
  const firsts = posts.flatMap((p) => (p.photos[0] ? [p.photos[0].storage_path] : []));
  const { data: urls } = useSignedUrls([...firsts, ...firsts.map(thumbPath)]);

  // 무한스크롤 — 바닥 센티넬이 보이면 다음 페이지
  const sentinel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = sentinel.current;
    if (!el || !feed.hasNextPage) return;

    const io = new IntersectionObserver((items) => {
      if (items[0]?.isIntersecting && !feed.isFetchingNextPage) {
        void feed.fetchNextPage();
      }
    });
    io.observe(el);
    return () => io.disconnect();
  }, [feed]);

  if (feed.isPending) {
    return (
      <div className="flex flex-col gap-4">
        {[0, 1].map((i) => (
          <Skeleton key={i} className="aspect-[4/5] w-full" />
        ))}
      </div>
    );
  }
  if (feed.isError) return <ErrorState onRetry={() => void feed.refetch()} />;
  if (posts.length === 0) return <EmptyState title={emptyTitle} />;

  return (
    <div className="flex flex-col gap-4">
      {posts.map((post) => {
        const path = post.photos[0]?.storage_path;
        const photoUrl = path ? (urls?.[thumbPath(path)] ?? urls?.[path]) : undefined;
        return <PostCard key={post.id} post={post} {...(photoUrl ? { photoUrl } : {})} />;
      })}
      <div ref={sentinel} />
      {feed.isFetchingNextPage && <Skeleton className="aspect-[4/5] w-full" />}
    </div>
  );
}
