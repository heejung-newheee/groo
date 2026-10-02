import { useSignedUrls } from '../../hooks/useSignedUrls';
import { thumbPath } from '../../lib/image';
import { PlantCard } from './PlantCard';
import type { PlantWithCover } from '../../types/models';

export function PlantGrid({ plants }: { plants: PlantWithCover[] }) {
  // 카드마다 서명하면 N+1 이 된다. 경로를 모아 한 번에 받는다.
  // 썸네일이 없는 예전 사진은 원본으로 대체하려고 둘 다 서명한다 (없는 경로는 결과에서 빠진다).
  const covers = plants.map((p) => p.cover_path).filter((p): p is string => p !== null);
  const { data: urls } = useSignedUrls([...covers, ...covers.map(thumbPath)]);

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {plants.map((plant) => {
        const coverUrl = plant.cover_path
          ? (urls?.[thumbPath(plant.cover_path)] ?? urls?.[plant.cover_path])
          : undefined;
        return (
          <PlantCard key={plant.id} plant={plant} {...(coverUrl ? { coverUrl } : {})} />
        );
      })}
    </div>
  );
}
