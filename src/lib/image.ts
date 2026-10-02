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
export async function processImage(
  file: Blob,
  maxEdge: number = PHOTO.maxEdge,
): Promise<ProcessedImage> {
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });

  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
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

export interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * 90° 단위 회전 → 크롭. area 는 react-easy-crop 의 croppedAreaPixels 로,
 * **회전된 이미지 기준** 좌표다. 그래서 먼저 통째로 돌려 그린 뒤 잘라낸다.
 *
 * 리사이즈는 여기서 하지 않는다 — 업로드 때 processImage 가 한다.
 */
export async function cropImage(source: Blob, area: CropArea, rotation: number): Promise<Blob> {
  const bitmap = await createImageBitmap(source, { imageOrientation: 'from-image' });
  const quarter = ((rotation / 90) % 4 + 4) % 4;
  const swap = quarter % 2 === 1;

  const rotated = new OffscreenCanvas(
    swap ? bitmap.height : bitmap.width,
    swap ? bitmap.width : bitmap.height,
  );
  const rctx = rotated.getContext('2d');
  if (!rctx) throw new Error('canvas 컨텍스트를 만들 수 없습니다');
  rctx.translate(rotated.width / 2, rotated.height / 2);
  rctx.rotate((quarter * Math.PI) / 2);
  rctx.drawImage(bitmap, -bitmap.width / 2, -bitmap.height / 2);
  bitmap.close();

  const width = Math.round(area.width);
  const height = Math.round(area.height);
  const out = new OffscreenCanvas(width, height);
  const ctx = out.getContext('2d');
  if (!ctx) throw new Error('canvas 컨텍스트를 만들 수 없습니다');
  ctx.drawImage(rotated, Math.round(area.x), Math.round(area.y), width, height, 0, 0, width, height);

  return out.convertToBlob({ type: 'image/webp', quality: 0.95 });
}

/**
 * Storage 경로: {user_id}/{plant_id}/{uuid}.webp
 * 첫 세그먼트가 user_id 여야 Storage RLS 가 통과한다.
 */
export function buildStoragePath(userId: string, plantId: string): string {
  return `${userId}/${plantId}/${crypto.randomUUID()}.webp`;
}

/** 카드용 썸네일 경로. 원본 옆에 {uuid}.thumb.webp 로 둔다 (DB 에는 원본 경로만 저장). */
export function thumbPath(path: string): string {
  return path.replace(/\.webp$/, '.thumb.webp');
}
