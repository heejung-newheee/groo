import { resolveRecordedAt, type ResolvedDate } from './exifDate';

/**
 * ⚠️ 순서가 중요하다: EXIF 는 **리사이즈 전 원본 File** 에서 뽑아야 한다.
 * canvas 로 다시 그리는 순간 메타데이터가 전부 사라진다.
 */
export async function extractRecordedAt(file: File): Promise<ResolvedDate> {
  let exif: Record<string, unknown> | null = null;

  try {
    // 사진을 고를 때만 필요하다. 첫 화면 번들에서 빼려고 동적으로 불러온다.
    const { default: exifr } = await import('exifr');
    exif = await exifr.parse(file, { pick: ['DateTimeOriginal', 'CreateDate'] });
  } catch {
    // 손상 파일 / 미지원 포맷 — 조용히 폴백한다.
    // 여기서 throw 하면 업로드 전체가 막힌다.
  }

  const taken = (exif?.['DateTimeOriginal'] ?? exif?.['CreateDate']) as Date | undefined;

  return resolveRecordedAt({
    exifTakenAt: taken instanceof Date ? taken : null,
    fileModifiedAt: file.lastModified ? new Date(file.lastModified) : null,
  });
}
