import { describe, expect, it } from 'vitest';
import { resolveRecordedAt } from './exifDate';

const now = new Date('2026-09-16T10:00:00+09:00');

describe('resolveRecordedAt', () => {
  it('EXIF 가 있으면 EXIF 를 쓴다', () => {
    const exif = new Date('2026-09-14T15:22:00+09:00');
    expect(resolveRecordedAt({ exifTakenAt: exif, fileModifiedAt: now }, now)).toEqual({
      recordedAt: exif,
      source: 'exif',
    });
  });

  it('EXIF 가 없으면 파일 수정시각으로 폴백 (카톡 사진 등)', () => {
    const mtime = new Date('2026-09-15T20:00:00+09:00');
    expect(resolveRecordedAt({ exifTakenAt: null, fileModifiedAt: mtime }, now)).toEqual({
      recordedAt: mtime,
      source: 'file_mtime',
    });
  });

  it('둘 다 없으면 현재 시각 + manual', () => {
    expect(resolveRecordedAt({ exifTakenAt: null, fileModifiedAt: null }, now)).toEqual({
      recordedAt: now,
      source: 'manual',
    });
  });

  it('미래 날짜인 EXIF 는 카메라 시계 오류로 보고 버린다', () => {
    const future = new Date('2027-01-01T00:00:00+09:00');
    const mtime = new Date('2026-09-15T20:00:00+09:00');
    expect(
      resolveRecordedAt({ exifTakenAt: future, fileModifiedAt: mtime }, now).source,
    ).toBe('file_mtime');
  });

  it('1995년 이전 EXIF 는 버린다 (시계 초기화된 카메라)', () => {
    const ancient = new Date('1980-01-01T00:00:00Z');
    const mtime = new Date('2026-09-15T20:00:00+09:00');
    expect(
      resolveRecordedAt({ exifTakenAt: ancient, fileModifiedAt: mtime }, now).source,
    ).toBe('file_mtime');
  });

  it('Invalid Date 는 버린다', () => {
    const mtime = new Date('2026-09-15T20:00:00+09:00');
    expect(
      resolveRecordedAt({ exifTakenAt: new Date('nope'), fileModifiedAt: mtime }, now)
        .source,
    ).toBe('file_mtime');
  });

  it('하루 이내의 미래는 허용한다 (기기 시계 오차)', () => {
    const slightlyFuture = new Date('2026-09-16T20:00:00+09:00');
    expect(
      resolveRecordedAt({ exifTakenAt: slightlyFuture, fileModifiedAt: null }, now).source,
    ).toBe('exif');
  });
});
