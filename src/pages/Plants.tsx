import { useState } from 'react';
import { Link } from 'react-router';
import { usePlants, useReorderPlants } from '../hooks/usePlants';
import { PlantGrid } from '../components/plants/PlantGrid';
import { PlantReorderList } from '../components/plants/PlantReorderList';
import type { PlantWithCover } from '../types/models';
import { PlantGridSkeleton } from '../components/ui/Skeleton';
import { EmptyState, ErrorState } from '../components/ui/States';

export function Plants() {
  const { data: plants, isPending, isError, refetch } = usePlants();
  const reorder = useReorderPlants();
  /** 편집 중인 순서. null 이면 편집 모드가 아니다. */
  const [draft, setDraft] = useState<PlantWithCover[] | null>(null);

  if (isPending) return <PlantGridSkeleton />;
  if (isError) return <ErrorState onRetry={() => void refetch()} />;

  if (plants.length === 0) {
    return (
      <EmptyState
        title="아직 등록한 식물이 없어요"
        action={
          <Link
            to="/plants/new"
            className="min-h-[48px] rounded-input bg-leaf-500 px-5 py-3 font-semibold text-white"
          >
            식물 등록하기
          </Link>
        }
      />
    );
  }

  function move(from: number, to: number) {
    setDraft((prev) => {
      if (!prev || to < 0 || to >= prev.length) return prev;
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      if (!moved) return prev;
      next.splice(to, 0, moved);
      return next;
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">{plants.length} Groo</h1>
        {draft ? (
          <div className="flex items-center gap-4 text-sm font-medium">
            <button type="button" onClick={() => setDraft(null)} disabled={reorder.isPending}>
              취소
            </button>
            <button
              type="button"
              className="text-leaf-600 disabled:opacity-50"
              disabled={reorder.isPending}
              onClick={() =>
                reorder.mutate(
                  draft.map((p) => p.id),
                  { onSuccess: () => setDraft(null) },
                )
              }
            >
              {reorder.isPending ? '저장 중…' : '완료'}
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-4 text-sm font-medium">
            {plants.length > 1 && (
              <button type="button" onClick={() => setDraft(plants)}>
                순서 편집
              </button>
            )}
            <Link to="/plants/new" className="text-leaf-600">
              + 등록
            </Link>
          </div>
        )}
      </div>

      {draft ? <PlantReorderList plants={draft} onMove={move} /> : <PlantGrid plants={plants} />}

      {reorder.isError && (
        <p className="text-sm text-urgent-500">순서를 저장하지 못했어요. 다시 시도해주세요.</p>
      )}
    </div>
  );
}
