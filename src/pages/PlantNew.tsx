import { useNavigate } from 'react-router';
import { useCreatePlant } from '../hooks/usePlants';
import { PlantForm } from '../components/plants/PlantForm';

export function PlantNew() {
  const navigate = useNavigate();
  const create = useCreatePlant();

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-5">
      <h1 className="text-xl font-bold">식물 등록</h1>
      <PlantForm
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
