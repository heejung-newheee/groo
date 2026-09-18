import { useMutation, useQueryClient } from '@tanstack/react-query';
import { qk } from '../api/keys';
import { deletePhoto, uploadPhoto, type PendingPhoto } from '../api/photos';
import { clearCoverIfMatches, setCoverPhoto } from '../api/plants';
import { supabase } from '../lib/supabase';
import type { Photo } from '../types/models';

export interface SavePhotosArgs {
  entryId: string;
  plantId: string;
  userId: string;
  /** 이미 올라가 있는 사진 중 지우기로 표시한 것 */
  removed: Photo[];
  /** 새로 고른 사진 */
  added: PendingPhoto[];
  /** 새 사진의 sort_order 시작값 */
  nextSortOrder: number;
}

/**
 * 일지 수정 화면의 사진 변경을 한 번에 반영한다.
 *
 * 삭제를 먼저 처리한다 — 남은 사진이 0장이 되는 경우 새로 올린 사진이
 * 대표가 되어야 하는데, 순서가 반대면 방금 올린 걸 지우게 된다.
 */
export function useSaveEntryPhotos() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      entryId,
      plantId,
      userId,
      removed,
      added,
      nextSortOrder,
    }: SavePhotosArgs) => {
      for (const photo of removed) {
        await deletePhoto(photo);
        await clearCoverIfMatches(plantId, photo.id);
      }

      let firstUploadedId: string | null = null;
      for (const [index, pending] of added.entries()) {
        const photo = await uploadPhoto(userId, plantId, entryId, pending, nextSortOrder + index);
        firstUploadedId ??= photo.id;
      }

      // 대표 사진이 비었으면(처음이거나 방금 지웠거나) 새로 올린 첫 장을 세운다
      if (firstUploadedId) await setCoverIfEmpty(plantId, firstUploadedId);
    },
    onSuccess: (_data, vars) => {
      void qc.invalidateQueries({ queryKey: qk.entries });
      void qc.invalidateQueries({ queryKey: qk.entry(vars.entryId) });
      void qc.invalidateQueries({ queryKey: qk.plants });
    },
  });
}

async function setCoverIfEmpty(plantId: string, photoId: string): Promise<void> {
  const { data } = await supabase
    .from('plants')
    .select('cover_photo_id')
    .eq('id', plantId)
    .maybeSingle();

  const current = (data as { cover_photo_id: string | null } | null)?.cover_photo_id;
  if (!current) await setCoverPhoto(plantId, photoId);
}
