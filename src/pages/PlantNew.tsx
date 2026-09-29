import { useNavigate } from 'react-router';
import { PLANT_COLORS } from '../lib/constants';
import { useCreatePlant, usePlants } from '../hooks/usePlants';
import { PlantForm } from '../components/plants/PlantForm';
import { Skeleton } from '../components/ui/Skeleton';

export function PlantNew() {
  const navigate = useNavigate();
  const create = useCreatePlant();
  // 보관한 식물까지 세어 순서대로 다음 색을 기본값으로 준다
  // 폼 기본값은 처음 한 번만 읽히므로, 목록을 받은 뒤에 폼을 그린다
  const { data: allPlants, isPending } = usePlants(true);
  if (isPending) return <Skeleton className="h-96 w-full" />;
  const defaultColor = PLANT_COLORS[(allPlants?.length ?? 0) % PLANT_COLORS.length];

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-5">
      <h1 className="text-xl font-bold">식물 등록</h1>
      <PlantForm
        defaultColor={defaultColor}
        submitting={create.isPending}
        onSubmit={(input) =>
          create.mutate(input, {
            onSuccess: (plant) => void navigate(`/plants/${plant.id}`, { replace: true }),
          })
        }
      />
      {create.isError && <p className="text-sm text-urgent-500">저장하지 못했어요. 다시 시도해주세요.</p>}
    </div>
  );
}
