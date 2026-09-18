import { Link } from 'react-router';
import { usePlants } from '../hooks/usePlants';
import { PlantGrid } from '../components/plants/PlantGrid';
import { PlantGridSkeleton } from '../components/ui/Skeleton';
import { EmptyState, ErrorState } from '../components/ui/States';

export function Plants() {
  const { data: plants, isPending, isError, refetch } = usePlants();

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

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">내 식물 ({plants.length})</h1>
        <Link to="/plants/new" className="text-sm font-medium text-leaf-600">
          + 등록
        </Link>
      </div>
      <PlantGrid plants={plants} />
    </div>
  );
}
