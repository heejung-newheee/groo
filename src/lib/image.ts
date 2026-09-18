import { PHOTO } from './constants';

export interface ProcessedImage {
  blob: Blob;
  width: number;
  height: number;
}

/**
 * 긴 변 1600px 로 줄이고 WebP 로 인코딩한다. 5~12MB 사진이 200~400KB 가 된다.
 *
 * imageOrientation: 'from-image' 가 EXIF Orientation 을 자동 적용한다.
 * 빼면 아이폰 세로 사진이 눕는다.
 */
export async function processImage(file: File): Promise<ProcessedImage> {
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });

  const scale = Math.min(1, PHOTO.maxEdge / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = new OffscreenCanvas(width, height);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas 컨텍스트를 만들 수 없습니다');

  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const blob = await canvas.convertToBlob({ type: 'image/webp', quality: PHOTO.quality });
  return { blob, width, height };
}

/**
 * Storage 경로: {user_id}/{plant_id}/{uuid}.webp
 * 첫 세그먼트가 user_id 여야 Storage RLS 가 통과한다.
 */
export function buildStoragePath(userId: string, plantId: string): string {
  return `${userId}/${plantId}/${crypto.randomUUID()}.webp`;
}
