import { Check, ImagePlus, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { extractRecordedAt } from '../../lib/exif';
import { PHOTO } from '../../lib/constants';
import type { ResolvedDate } from '../../lib/exifDate';
import { usePlantPhotos, useSetCover, useUploadCover } from '../../hooks/useCoverPhoto';
import { useSignedUrls } from '../../hooks/useSignedUrls';
import { PhotoEditor } from '../entries/PhotoEditor';
import { Skeleton } from '../ui/Skeleton';
import type { Plant } from '../../types/models';

/**
 * 대표 사진 바꾸기. 일지 사진에서 고르거나, 새 사진을 올린다.
 * 새 사진 버튼 하나로 앨범·촬영·파일이 다 된다 — 모바일 OS 가 메뉴를 띄워준다.
 */
export function CoverPicker({ plant, onClose }: { plant: Plant; onClose: () => void }) {
  const { data: photos, isPending } = usePlantPhotos(plant.id);
  const { data: urls } = useSignedUrls(photos?.map((p) => p.storage_path) ?? []);
  const setCover = useSetCover(plant.id);
  const upload = useUploadCover(plant.id);

  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  /** 고른 새 사진 — 편집기에 띄운다 */
  const [picked, setPicked] = useState<{ file: File; url: string; date: ResolvedDate } | null>(
    null,
  );

  useEffect(() => {
    if (!picked) return;
    return () => URL.revokeObjectURL(picked.url);
  }, [picked]);

  async function handlePick(file: File | undefined) {
    if (!file) return;
    if (file.size > PHOTO.maxBytes) {
      setError(`${file.name} 은 10MB 를 넘어요`);
      return;
    }
    setError(null);
    // EXIF 는 편집(canvas) 전에 원본에서 뽑아야 한다
    const date = await extractRecordedAt(file);
    setPicked({ file, url: URL.createObjectURL(file), date });
  }

  function handleEdited(blob: Blob) {
    if (!picked) return;
    const file = new File([blob], picked.file.name.replace(/\.[^.]+$/, '') + '.webp', {
      type: blob.type,
    });
    const takenAt = picked.date.source === 'manual' ? null : picked.date.recordedAt;
    upload.mutate(
      {
        photo: { file, takenAt, previewUrl: picked.url },
        recordedAt: picked.date.recordedAt,
        dateSource: picked.date.source,
      },
      { onSuccess: onClose, onError: () => setPicked(null) },
    );
  }

  if (picked) {
    return upload.isPending ? (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 text-white">
        올리는 중…
      </div>
    ) : (
      <PhotoEditor src={picked.url} onCancel={() => setPicked(null)} onDone={handleEdited} />
    );
  }

  return (
    <div
      role="dialog"
      aria-modal
      aria-label="대표 사진 바꾸기"
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center"
      onClick={onClose}
    >
      <div
        className="flex max-h-[85vh] w-full max-w-lg flex-col gap-4 overflow-y-auto rounded-t-card p-5 sm:rounded-card"
        style={{ background: 'var(--bg-surface)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between">
          <h2 className="font-bold">대표 사진 바꾸기</h2>
          <button type="button" onClick={onClose} aria-label="닫기" className="p-2">
            <X className="size-5" aria-hidden />
          </button>
        </header>

        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex min-h-[48px] items-center justify-center gap-2 rounded-input bg-leaf-500 font-semibold text-white"
        >
          <ImagePlus className="size-5" aria-hidden />새 사진 올리기
        </button>
        <input
          ref={inputRef}
          type="file"
          accept={PHOTO.accept}
          className="hidden"
          onChange={(e) => {
            void handlePick(e.target.files?.[0]);
            e.target.value = '';
          }}
        />
        <p className="-mt-2 text-xs" style={{ color: 'var(--text-muted)' }}>
          새 사진은 &lsquo;대표 사진&rsquo; 일지로 타임라인에도 남아요.
        </p>

        <section className="flex flex-col gap-2">
          <h3 className="text-sm font-semibold">일지 사진에서 고르기</h3>
          {isPending ? (
            <Skeleton className="h-24 w-full" />
          ) : !photos || photos.length === 0 ? (
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              아직 일지 사진이 없어요
            </p>
          ) : (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {photos.map((photo, index) => {
                const current = photo.id === plant.cover_photo_id;
                return (
                  <button
                    key={photo.id}
                    type="button"
                    disabled={setCover.isPending}
                    aria-pressed={current}
                    aria-label={`일지 사진 ${index + 1}${current ? ' (지금 대표 사진)' : ''}`}
                    onClick={() => setCover.mutate(photo.id, { onSuccess: onClose })}
                    className="relative aspect-square overflow-hidden rounded-input"
                  >
                    {urls?.[photo.storage_path] && (
                      <img
                        src={urls[photo.storage_path]}
                        alt=""
                        loading="lazy"
                        className="size-full object-cover"
                      />
                    )}
                    {current && (
                      <span className="absolute inset-0 flex items-center justify-center bg-leaf-500/40 text-white">
                        <Check className="size-6" aria-hidden />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </section>

        {(error || setCover.isError || upload.isError) && (
          <p className="text-sm text-urgent-500">
            {error ?? '저장하지 못했어요. 잠시 후 다시 시도해주세요.'}
          </p>
        )}
      </div>
    </div>
  );
}
