import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { qk } from '../api/keys';
import {
  archivePlant,
  createPlant,
  getPlant,
  listPlants,
  markWatered,
  restorePlant,
  updatePlant,
  type PlantInput,
} from '../api/plants';
import { useUserId } from './useSession';

export function usePlants(includeArchived = false) {
  return useQuery({
    queryKey: [...qk.plants, includeArchived],
    queryFn: () => listPlants(includeArchived),
  });
}

export function usePlant(id: string | undefined) {
  return useQuery({
    queryKey: qk.plant(id ?? ''),
    queryFn: () => getPlant(id as string),
    enabled: Boolean(id),
  });
}

export function useCreatePlant() {
  const qc = useQueryClient();
  const userId = useUserId();

  return useMutation({
    mutationFn: (input: PlantInput) => createPlant(userId as string, input),
    onSuccess: () => void qc.invalidateQueries({ queryKey: qk.plants }),
  });
}

export function useUpdatePlant(id: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (patch: Partial<PlantInput>) => updatePlant(id, patch),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: qk.plants });
      void qc.invalidateQueries({ queryKey: qk.plant(id) });
    },
  });
}

export function useArchivePlant() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({ id, archived }: { id: string; archived: boolean }) =>
      archived ? archivePlant(id) : restorePlant(id),
    onSuccess: () => void qc.invalidateQueries({ queryKey: qk.plants }),
  });
}

/** 홈의 "물줬어요" — 식물의 last_watered_at 갱신 + 물주기 일지 생성 */
export function useMarkWatered() {
  const qc = useQueryClient();
  const userId = useUserId();

  return useMutation({
    mutationFn: (plantId: string) => markWatered(userId as string, plantId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: qk.plants });
      void qc.invalidateQueries({ queryKey: qk.entries });
    },
  });
}
