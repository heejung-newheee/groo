import { supabase } from '../lib/supabase';
import { PHOTO } from '../lib/constants';
import { buildStoragePath, processImage, thumbPath } from '../lib/image';
import { removeObjects } from './storage';
import type { Photo } from '../types/models';

export interface PendingPhoto {
  file: File;
  /** 원본에서 뽑은 촬영시각. 리사이즈하면 사라지므로 미리 들고 다닌다. */
  takenAt: Date | null;
  previewUrl: string;
}

/**
 * 카드용 썸네일을 원본 옆에 올린다. 실패해도 업로드 자체는 막지 않는다 —
 * 썸네일이 없으면 카드가 원본으로 대체해서 보여준다.
 */
async function uploadThumb(path: string, processed: Blob): Promise<void> {
  try {
    const { blob } = await processImage(processed, PHOTO.thumbEdge);
    await supabase.storage
      .from('plant-photos')
      .upload(thumbPath(path), blob, { contentType: 'image/webp', upsert: false });
  } catch {
    // 원본으로 대체된다
  }
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
  await uploadThumb(path, blob);

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
    await removeObjects([path, thumbPath(path)]);
    throw error;
  }
  return data as Photo;
}

export async function deletePhoto(photo: Photo): Promise<void> {
  const { error } = await supabase.from('photos').delete().eq('id', photo.id);
  if (error) throw error;
  await removeObjects([photo.storage_path, thumbPath(photo.storage_path)]);
}

/**
 * 이미 올린 사진을 편집본으로 바꾼다. row 는 그대로 두고 파일만 갈아끼운다 —
 * 그래야 대표 사진 지정·순서·촬영시각·AI 분석 연결이 유지된다.
 */
export async function replacePhotoFile(
  userId: string,
  plantId: string,
  photo: Photo,
  edited: Blob,
): Promise<void> {
  const { blob, width, height } = await processImage(edited);
  const path = buildStoragePath(userId, plantId);

  const { error: uploadErr } = await supabase.storage
    .from('plant-photos')
    .upload(path, blob, { contentType: 'image/webp', upsert: false });
  if (uploadErr) throw uploadErr;
  await uploadThumb(path, blob);

  const { error } = await supabase
    .from('photos')
    .update({ storage_path: path, width, height, bytes: blob.size })
    .eq('id', photo.id);

  if (error) {
    await removeObjects([path, thumbPath(path)]);
    throw error;
  }
  await removeObjects([photo.storage_path, thumbPath(photo.storage_path)]);
}

/** 대표 사진 고르기용 — 이 식물의 일지에 달린 사진 전부, 최근 것부터 */
export async function listPlantPhotos(
  plantId: string,
): Promise<Pick<Photo, 'id' | 'storage_path'>[]> {
  const { data, error } = await supabase
    .from('photos')
    .select('id, storage_path, entries!inner(plant_id)')
    .eq('entries.plant_id', plantId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(({ id, storage_path }) => ({ id, storage_path }));
}
