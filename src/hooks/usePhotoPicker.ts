import { useCallback, useEffect, useRef, useState } from 'react';
import { extractRecordedAt } from '../lib/exif';
import { PHOTO } from '../lib/constants';
import type { PendingPhoto } from '../api/photos';
import type { ResolvedDate } from '../lib/exifDate';

/**
 * 사진 선택 → EXIF 추출까지.
 *
 * ⚠️ EXIF 는 원본 File 에서 즉시 뽑는다. 리사이즈는 업로드 시점에 한다.
 * 순서가 바뀌면 canvas 가 메타데이터를 날려서 날짜 추출이 아예 동작하지 않는다.
 *
 * 추출한 날짜는 add() 의 반환값으로 넘긴다. 상태로 들고 있다가 effect 로
 * 폼에 옮기면 렌더가 한 번 더 돈다 — 날짜를 쓸지 말지는 폼이 결정한다.
 */
export function usePhotoPicker() {
  const [photos, setPhotos] = useState<PendingPhoto[]>([]);
  const [error, setError] = useState<string | null>(null);

  // 만든 objectURL 을 전부 기억해 둔다. 언마운트 때 한 번에 해제한다.
  // (ref 는 렌더 중에 건드리지 않고 이벤트 핸들러에서만 쓴다)
  const createdUrls = useRef<string[]>([]);

  const add = useCallback(async (files: FileList | null): Promise<ResolvedDate | null> => {
    if (!files || files.length === 0) return null;
    setError(null);

    const accepted: File[] = [];
    for (const file of Array.from(files)) {
      if (file.size > PHOTO.maxBytes) {
        setError(`${file.name} 은 10MB 를 넘어요`);
        continue;
      }
      accepted.push(file);
    }
    if (accepted.length === 0) return null;

    const picked: PendingPhoto[] = [];
    let firstResolved: ResolvedDate | null = null;

    for (const file of accepted) {
      const resolved = await extractRecordedAt(file);
      firstResolved ??= resolved;
      const previewUrl = URL.createObjectURL(file);
      createdUrls.current.push(previewUrl);
      picked.push({
        file,
        takenAt: resolved.source === 'manual' ? null : resolved.recordedAt,
        previewUrl,
      });
    }

    let overflowed = false;
    setPhotos((prev) => {
      const merged = [...prev, ...picked];
      overflowed = merged.length > PHOTO.maxPerEntry;
      return merged.slice(0, PHOTO.maxPerEntry);
    });
    if (overflowed) setError(`사진은 최대 ${PHOTO.maxPerEntry}장까지예요`);

    return firstResolved;
  }, []);

  const remove = useCallback((index: number) => {
    setPhotos((prev) => {
      const target = prev[index];
      if (target) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((_, i) => i !== index);
    });
  }, []);

  /** 편집(회전·크롭)한 결과로 바꾼다. 촬영시각은 원본에서 뽑아둔 값을 그대로 쓴다. */
  const replace = useCallback((index: number, blob: Blob) => {
    const previewUrl = URL.createObjectURL(blob);
    createdUrls.current.push(previewUrl);
    setPhotos((prev) =>
      prev.map((photo, i) => {
        if (i !== index) return photo;
        URL.revokeObjectURL(photo.previewUrl);
        const name = photo.file.name.replace(/\.[^.]+$/, '') + '.webp';
        return { ...photo, file: new File([blob], name, { type: blob.type }), previewUrl };
      }),
    );
  }, []);

  const move = useCallback((from: number, to: number) => {
    setPhotos((prev) => {
      if (to < 0 || to >= prev.length) return prev;
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      if (!moved) return prev;
      next.splice(to, 0, moved);
      return next;
    });
  }, []);

  // 미리보기 objectURL 누수 방지. 이미 해제된 URL 을 다시 해제해도 무해하다.
  useEffect(() => {
    const urls = createdUrls.current;
    return () => {
      for (const url of urls) URL.revokeObjectURL(url);
    };
  }, []);

  return { photos, error, add, remove, move, replace };
}
