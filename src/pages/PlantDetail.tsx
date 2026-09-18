import { PenLine, Settings2 } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { Link, useParams } from 'react-router';
import { formatDday } from '../lib/dday';
import { useEntriesByPlant } from '../hooks/useEntries';
import { usePlant } from '../hooks/usePlants';
import { useAnalyzedPhotoIds } from '../hooks/useAiAnalysis';
import { useSignedUrls } from '../hooks/useSignedUrls';
import { Timeline } from '../components/entries/Timeline';
import { WateringBadge } from '../components/plants/WateringBadge';
import { Photo } from '../components/ui/Photo';
import { Skeleton, TimelineSkeleton } from '../components/ui/Skeleton';
import { EmptyState, ErrorState } from '../components/ui/States';

export function PlantDetail() {
  const { id } = useParams<{ id: string }>();
  const { data: plant, isPending, isError, refetch } = usePlant(id);
  const entries = useEntriesByPlant(id);
  const { data: analyzed } = useAnalyzedPhotoIds();
  const { data: coverUrls } = useSignedUrls([plant?.cover_path ?? null]);

  // 무한스크롤 — 바닥 센티넬이 보이면 다음 페이지
  const sentinel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = sentinel.current;
    if (!el || !entries.hasNextPage) return;

    const io = new IntersectionObserver((items) => {
      if (items[0]?.isIntersecting && !entries.isFetchingNextPage) {
        void entries.fetchNextPage();
      }
    });
    io.observe(el);
    return () => io.disconnect();
  }, [entries]);

  if (isPending) return <Skeleton className="aspect-[4/3] w-full" />;
  if (isError) return <ErrorState onRetry={() => void refetch()} />;
  if (!plant) return <EmptyState title="식물을 찾을 수 없어요" />;

  const rows = entries.data?.pages.flat() ?? [];
  const coverUrl = plant.cover_path ? coverUrls?.[plant.cover_path] : undefined;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      {/* 넓은 화면에서는 사진을 키우는 대신 정보를 옆에 둔다 */}
      <div className="flex flex-col gap-5 md:flex-row md:items-start md:gap-6">
        <Photo
          url={coverUrl}
          alt={`${plant.nickname} 대표 사진`}
          className="aspect-[4/3] w-full shrink-0 rounded-card md:w-1/2"
        />

        <div className="flex flex-1 flex-col gap-4">
          <header className="flex items-start justify-between gap-3">
            <div>
              <h1 className="text-xl font-bold">{plant.nickname}</h1>
              {plant.species && (
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                  {plant.species}
                </p>
              )}
              <p className="tabular mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>
                {formatDday(new Date(plant.adopted_at))}
                {plant.location && ` · ${plant.location}`}
              </p>
              <WateringBadge plant={plant} className="mt-1" />
            </div>
            <Link to={`/plants/${plant.id}/edit`} aria-label="식물 수정" className="p-2">
              <Settings2 className="size-5" aria-hidden />
            </Link>
          </header>

          <Link
            to={`/entries/new?plantId=${plant.id}`}
            className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-input bg-leaf-500 font-semibold text-white"
          >
            <PenLine className="size-4" aria-hidden />
            일지 쓰기
          </Link>
        </div>
      </div>

      <section>
        <h2 className="mb-3 font-bold">📜 타임라인</h2>

        {entries.isPending ? (
          <TimelineSkeleton />
        ) : rows.length === 0 ? (
          <EmptyState
            title="아직 기록이 없어요"
            description="사진 한 장으로 시작해보세요"
          />
        ) : (
          <>
            <Timeline
              entries={rows}
              plantName={plant.nickname}
              {...(analyzed ? { analyzedPhotoIds: analyzed } : {})}
            />
            <div ref={sentinel} aria-hidden />
            {entries.isFetchingNextPage && <TimelineSkeleton />}
          </>
        )}
      </section>
    </div>
  );
}
