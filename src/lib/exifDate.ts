export type DateSource = 'exif' | 'file_mtime' | 'manual';

export interface RawPhotoDates {
  /** EXIF DateTimeOriginal 또는 CreateDate. 없으면 null */
  exifTakenAt: Date | null;
  /** File.lastModified 등 파일시스템 수정 시각. 없으면 null */
  fileModifiedAt: Date | null;
}

export interface ResolvedDate {
  recordedAt: Date;
  source: DateSource;
}

/** 디지털 카메라 이전 날짜는 카메라 시계 오류로 간주한다. */
const EARLIEST_PLAUSIBLE = new Date('1995-01-01T00:00:00Z');

/** 미래로 어긋난 시계를 허용하는 여유 (1일) */
const FUTURE_TOLERANCE_MS = 24 * 60 * 60 * 1000;

function isPlausible(date: Date | null, now: Date): date is Date {
  if (date === null) return false;
  const t = date.getTime();
  if (Number.isNaN(t)) return false;
  if (t < EARLIEST_PLAUSIBLE.getTime()) return false;
  if (t > now.getTime() + FUTURE_TOLERANCE_MS) return false;
  return true;
}

/**
 * 촬영일시 폴백 체인.
 *
 * EXIF → 파일 수정시각 → 현재 시각(수동 입력 대기)
 *
 * 카카오톡/인스타로 받은 사진, 스크린샷 등은 EXIF 가 제거되어 있어
 * 체감 30~40% 는 파일 시각으로 떨어진다. 이는 정상 동작이며,
 * UI 는 source 를 근거로 사용자에게 출처를 밝히고 수정을 유도한다.
 */
export function resolveRecordedAt(
  raw: RawPhotoDates,
  now: Date = new Date(),
): ResolvedDate {
  if (isPlausible(raw.exifTakenAt, now)) {
    return { recordedAt: raw.exifTakenAt, source: 'exif' };
  }
  if (isPlausible(raw.fileModifiedAt, now)) {
    return { recordedAt: raw.fileModifiedAt, source: 'file_mtime' };
  }
  return { recordedAt: now, source: 'manual' };
}
