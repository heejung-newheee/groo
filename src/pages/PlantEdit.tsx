import { useNavigate, useParams } from 'react-router';
import { useArchivePlant, usePlant, useUpdatePlant } from '../hooks/usePlants';
import { PlantForm } from '../components/plants/PlantForm';
import { Button } from '../components/ui/Button';
import { Skeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/States';

export function PlantEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: plant, isPending } = usePlant(id);
  const update = useUpdatePlant(id ?? '');
  const archive = useArchivePlant();

  if (isPending) return <Skeleton className="h-96 w-full" />;
  if (!plant) return <EmptyState title="식물을 찾을 수 없어요" />;

  const archived = plant.archived_at !== null;

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-5">
      <h1 className="text-xl font-bold">{plant.nickname} 수정</h1>

      <PlantForm
        plant={plant}
        submitting={update.isPending}
        onSubmit={(input) =>
          update.mutate(input, { onSuccess: () => void navigate(`/plants/${plant.id}`) })
        }
      />

      <div className="border-t pt-5" style={{ borderColor: 'var(--border-subtle)' }}>
        <p className="mb-2 text-sm" style={{ color: 'var(--text-muted)' }}>
          {archived
            ? '보관 중인 식물이에요. 되돌리면 홈에 다시 나타나요.'
            : '떠나보낸 식물은 보관할 수 있어요. 기록은 지워지지 않아요.'}
        </p>
        <Button
          variant={archived ? 'secondary' : 'danger'}
          disabled={archive.isPending}
          onClick={() =>
            archive.mutate(
              { id: plant.id, archived: !archived },
              { onSuccess: () => void navigate('/plants') },
            )
          }
        >
          {archived ? '보관 해제' : '보관하기'}
        </Button>
      </div>
    </div>
  );
}
