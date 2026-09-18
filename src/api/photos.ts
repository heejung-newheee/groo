import { supabase } from '../lib/supabase';
import { buildStoragePath, processImage } from '../lib/image';
import { removeObjects } from './storage';
import type { Photo } from '../types/models';

export interface PendingPhoto {
  file: File;
  /** 원본에서 뽑은 촬영시각. 리사이즈하면 사라지므로 미리 들고 다닌다. */
  takenAt: Date | null;
  previewUrl: string;
}

/**
 * 리사이즈 → Storage 업로드 → photos row 생성.
 *
 * ⚠️ EXIF 는 이 함수에 오기 **전에** 원본 File 에서 뽑아야 한다.
 * processImage 가 canvas 로 다시 그리면서 메타데이터를 날린다.
 */
export async function uploadPhoto(
  userId: string,
  plantId: string,
  entryId: string,
  pending: PendingPhoto,
  sortOrder: number,
): Promise<Photo> {
  const { blob, width, height } = await processImage(pending.file);
  const path = buildStoragePath(userId, plantId);

  const { error: uploadErr } = await supabase.storage
    .from('plant-photos')
    .upload(path, blob, { contentType: 'image/webp', upsert: false });
  if (uploadErr) throw uploadErr;

  const { data, error } = await supabase
    .from('photos')
    .insert({
      user_id: userId,
      entry_id: entryId,
      storage_path: path,
      width,
      height,
      bytes: blob.size,
      sort_order: sortOrder,
      taken_at: pending.takenAt?.toISOString() ?? null,
    })
    .select()
    .single();

  if (error) {
    // row 생성이 실패하면 고아 파일이 남는다. 되돌린다.
    await removeObjects([path]);
    throw error;
  }
  return data as Photo;
}

export async function deletePhoto(photo: Photo): Promise<void> {
  const { error } = await supabase.from('photos').delete().eq('id', photo.id);
  if (error) throw error;
  await removeObjects([photo.storage_path]);
}
