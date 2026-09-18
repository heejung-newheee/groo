import { Droplet } from 'lucide-react';
import { Link } from 'react-router';
import { needsWateringToday, plantWateringInput } from '../lib/watering';
import { formatMonthDay } from '../lib/format';
import { useMarkWatered, usePlants } from '../hooks/usePlants';
import { useRecentEntries } from '../hooks/useEntries';
import { useProfile } from '../hooks/useSession';
import { PlantGrid } from '../components/plants/PlantGrid';
import { ActionList } from '../components/entries/ActionChips';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { PlantGridSkeleton, Skeleton } from '../components/ui/Skeleton';
import { EmptyState, ErrorState } from '../components/ui/States';

export function Home() {
  const { data: profile } = useProfile();
  const { data: plants, isPending, isError, refetch } = usePlants();
  const { data: recent } = useRecentEntries(5);
  const water = useMarkWatered();

  if (isPending) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-20 w-full" />
        <PlantGridSkeleton />
      </div>
    );
  }
  if (isError) return <ErrorState onRetry={() => void refetch()} />;

  const thirsty = plants.filter((p) => needsWateringToday(plantWateringInput(p)));

  if (plants.length === 0) {
    return (
      <EmptyState
        title="첫 식물을 등록해보세요"
        description="애칭과 사진 한 장이면 충분해요"
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
    <div className="flex flex-col gap-8">
      {profile?.display_name && (
        <h1 className="text-xl font-bold">안녕하세요, {profile.display_name}님</h1>
      )}

      {thirsty.length > 0 && (
        <section>
          <h2 className="mb-2 font-bold">☀️ 오늘 할 일</h2>
          <Card className="flex flex-col gap-2">
            {thirsty.map((plant) => (
              <div key={plant.id} className="flex items-center justify-between gap-3">
                <span className="inline-flex items-center gap-2 text-sm">
                  <Droplet className="size-4 text-leaf-500" aria-hidden />
                  {plant.nickname}
                </span>
                {/* 탭 1번으로 기록 완료 */}
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={water.isPending}
                  onClick={() => water.mutate(plant.id)}
                >
                  물줬어요
                </Button>
              </div>
            ))}
          </Card>
        </section>
      )}

      <section>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="font-bold">🪴 내 식물 ({plants.length})</h2>
          <Link to="/plants" className="text-sm text-leaf-600">
            전체 &gt;
          </Link>
        </div>
        <PlantGrid plants={plants} />
      </section>

      {recent && recent.length > 0 && (
        <section>
          <h2 className="mb-2 font-bold">📝 최근 기록</h2>
          <ul className="flex flex-col gap-2">
            {recent.map((entry) => (
              <li key={entry.id}>
                <Link to={`/entries/${entry.id}`} className="flex items-center gap-2 text-sm">
                  <span className="tabular" style={{ color: 'var(--text-muted)' }}>
                    {formatMonthDay(entry.recorded_at)}
                  </span>
                  <span className="font-medium">{entry.plant?.nickname ?? '식물'}</span>
                  <ActionList actions={entry.actions} />
                  {entry.note && <span className="truncate">{entry.note}</span>}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
