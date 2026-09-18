import { ChevronLeft, ChevronRight, Plus, X } from 'lucide-react';
import { useRef } from 'react';
import { PHOTO } from '../../lib/constants';
import type { PendingPhoto } from '../../api/photos';

export function PhotoPickerField({
  photos,
  error,
  onAdd,
  onRemove,
  onMove,
}: {
  photos: PendingPhoto[];
  error: string | null;
  onAdd: (files: FileList | null) => void;
  onRemove: (index: number) => void;
  onMove: (from: number, to: number) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const full = photos.length >= PHOTO.maxPerEntry;

  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium">사진</span>

      <div className="flex flex-wrap gap-2">
        {photos.map((photo, index) => (
          <div key={photo.previewUrl} className="relative">
            <img
              src={photo.previewUrl}
              alt={`선택한 사진 ${index + 1}`}
              className="size-24 rounded-input object-cover"
            />
            <button
              type="button"
              onClick={() => onRemove(index)}
              aria-label={`사진 ${index + 1} 빼기`}
              className="absolute -top-1.5 -right-1.5 flex size-6 items-center justify-center rounded-full bg-bark-800 text-white"
            >
              <X className="size-3.5" aria-hidden />
            </button>

            {/* 드래그 대신 버튼으로 순서를 바꾼다 — 키보드로도 완주 가능해야 한다 */}
            <div className="mt-1 flex justify-center gap-1">
              <button
                type="button"
                onClick={() => onMove(index, index - 1)}
                disabled={index === 0}
                aria-label={`사진 ${index + 1} 앞으로`}
                className="rounded p-1 disabled:opacity-30"
              >
                <ChevronLeft className="size-4" aria-hidden />
              </button>
              <button
                type="button"
                onClick={() => onMove(index, index + 1)}
                disabled={index === photos.length - 1}
                aria-label={`사진 ${index + 1} 뒤로`}
                className="rounded p-1 disabled:opacity-30"
              >
                <ChevronRight className="size-4" aria-hidden />
              </button>
            </div>
          </div>
        ))}

        {!full && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="flex size-24 flex-col items-center justify-center gap-1 rounded-input border border-dashed text-xs"
            style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-muted)' }}
          >
            <Plus className="size-5" aria-hidden />
            추가
          </button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={PHOTO.accept}
        multiple
        className="hidden"
        onChange={(e) => {
          onAdd(e.target.files);
          e.target.value = '';
        }}
      />

      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
        최대 {PHOTO.maxPerEntry}장 · 첫 장이 대표 사진이 돼요
      </span>
      {error && <span className="text-xs text-urgent-500">{error}</span>}
    </div>
  );
}
