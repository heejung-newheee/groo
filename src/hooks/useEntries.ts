import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { qk } from '../api/keys';
import {
  createEntry,
  deleteEntry,
  getEntry,
  listEntriesByMonth,
  listEntriesByPlant,
  listRecentEntries,
  updateEntry,
  PAGE_SIZE,
  type EntryInput,
} from '../api/entries';
import { uploadPhoto, type PendingPhoto } from '../api/photos';
import { setCoverPhoto } from '../api/plants';
import { useUserId } from './useSession';

/** 식물 상세 타임라인 — 무한스크롤 */
export function useEntriesByPlant(plantId: string | undefined) {
  return useInfiniteQuery({
    queryKey: qk.entriesByPlant(plantId ?? ''),
    queryFn: ({ pageParam }) => listEntriesByPlant(plantId as string, pageParam),
    initialPageParam: 0,
    getNextPageParam: (last, all) => (last.length < PAGE_SIZE ? undefined : all.length),
    enabled: Boolean(plantId),
  });
}

export function useRecentEntries(limit = 5) {
  return useQuery({
    queryKey: [...qk.entriesRecent, limit],
    queryFn: () => listRecentEntries(limit),
  });
}

export function useEntriesByMonth(month: Date) {
  const key = `${month.getFullYear()}-${month.getMonth() + 1}`;
  return useQuery({
    queryKey: qk.entriesByMonth(key),
    queryFn: () => listEntriesByMonth(month),
  });
}

export function useEntry(id: string | undefined) {
  return useQuery({
    queryKey: qk.entry(id ?? ''),
    queryFn: () => getEntry(id as string),
    enabled: Boolean(id),
  });
}

export interface CreateEntryArgs {
  entry: EntryInput;
  photos: PendingPhoto[];
  /** 이 식물에 대표 사진이 아직 없으면 첫 장을 대표로 세운다 */
  setCoverIfEmpty: boolean;
}

/**
 * 일지 + 사진을 함께 만든다.
 *
 * 사진 업로드는 순차로 돈다. 병렬로 돌리면 모바일 회선에서 동시 업로드가
 * 서로를 느리게 만들고, 실패 시 어디까지 올라갔는지 추적이 어려워진다.
 */
export function useCreateEntry() {
  const qc = useQueryClient();
  const userId = useUserId();

  return useMutation({
    mutationFn: async ({ entry, photos, setCoverIfEmpty }: CreateEntryArgs) => {
      const uid = userId as string;
      const created = await createEntry(uid, entry);

      let firstPhotoId: string | null = null;
      for (const [index, pending] of photos.entries()) {
        const photo = await uploadPhoto(uid, entry.plant_id, created.id, pending, index);
        if (index === 0) firstPhotoId = photo.id;
      }

      if (setCoverIfEmpty && firstPhotoId) {
        await setCoverPhoto(entry.plant_id, firstPhotoId);
      }
      return created;
    },
    onSuccess: (_data, vars) => {
      void qc.invalidateQueries({ queryKey: qk.entries });
      void qc.invalidateQueries({ queryKey: qk.plants });
      void qc.invalidateQueries({ queryKey: qk.entriesByPlant(vars.entry.plant_id) });
    },
  });
}

export function useUpdateEntry(id: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (patch: Partial<EntryInput>) => updateEntry(id, patch),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: qk.entries });
      void qc.invalidateQueries({ queryKey: qk.entry(id) });
    },
  });
}

export function useDeleteEntry() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteEntry(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: qk.entries });
      void qc.invalidateQueries({ queryKey: qk.plants });
    },
  });
}
