import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { qk } from '../api/keys';
import { createEntry } from '../api/entries';
import { listPlantPhotos, uploadPhoto, type PendingPhoto } from '../api/photos';
import { setCoverPhoto } from '../api/plants';
import type { DateSource } from '../types/models';
import { useUserId } from './useSession';

export function usePlantPhotos(plantId: string) {
  return useQuery({
    queryKey: qk.plantPhotos(plantId),
    queryFn: () => listPlantPhotos(plantId),
  });
}

/** 일지 사진 중 하나를 대표로 */
export function useSetCover(plantId: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (photoId: string) => setCoverPhoto(plantId, photoId),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.plants }),
  });
}

export interface UploadCoverArgs {
  photo: PendingPhoto;
  recordedAt: Date;
  dateSource: DateSource;
}

/**
 * 새 사진을 대표로. 사진은 반드시 일지에 속해야 해서(photos.entry_id 필수)
 * "대표 사진" 일지를 하나 만들어 같이 남긴다 — 타임라인에도 기록된다.
 */
export function useUploadCover(plantId: string) {
  const qc = useQueryClient();
  const userId = useUserId();

  return useMutation({
    mutationFn: async ({ photo, recordedAt, dateSource }: UploadCoverArgs) => {
      const uid = userId as string;
      const entry = await createEntry(uid, {
        plant_id: plantId,
        recorded_at: recordedAt.toISOString(),
        date_source: dateSource,
        actions: [],
        note: '대표 사진',
      });
      const uploaded = await uploadPhoto(uid, plantId, entry.id, photo, 0);
      await setCoverPhoto(plantId, uploaded.id);
    },
    onSuccess: () =>
      // qk.entries 가 plantPhotos 까지 포함한다
      Promise.all([
        qc.invalidateQueries({ queryKey: qk.plants }),
        qc.invalidateQueries({ queryKey: qk.entries }),
      ]),
  });
}
