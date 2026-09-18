import { useSignedUrls } from '../../hooks/useSignedUrls';
import { PlantCard } from './PlantCard';
import type { PlantWithCover } from '../../types/models';

export function PlantGrid({ plants }: { plants: PlantWithCover[] }) {
  // 카드마다 서명하면 N+1 이 된다. 경로를 모아 한 번에 받는다.
  const { data: urls } = useSignedUrls(plants.map((p) => p.cover_path));

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
      {plants.map((plant) => (
        <PlantCard
          key={plant.id}
          plant={plant}
          {...(plant.cover_path && urls?.[plant.cover_path]
            ? { coverUrl: urls[plant.cover_path] }
            : {})}
        />
      ))}
    </div>
  );
}
