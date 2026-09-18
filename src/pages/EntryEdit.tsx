import { useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { RotateCcw, X } from 'lucide-react';
import { toDatetimeLocal } from '../lib/format';
import { cn } from '../lib/cn';
import type { CareAction } from '../lib/constants';
import { useEntry, useUpdateEntry } from '../hooks/useEntries';
import { useSaveEntryPhotos } from '../hooks/useEntryPhotos';
import { usePhotoPicker } from '../hooks/usePhotoPicker';
import { useSignedUrls } from '../hooks/useSignedUrls';
import { useUserId } from '../hooks/useSession';
import { ActionChips } from '../components/entries/ActionChips';
import { PhotoPickerField } from '../components/entries/PhotoPickerField';
import { Button } from '../components/ui/Button';
import { Field, Input, Textarea } from '../components/ui/Field';
import { Skeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/States';

export function EntryEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const userId = useUserId();
  const { data: entry, isPending } = useEntry(id);
  const update = useUpdateEntry(id ?? '', entry?.plant_id);
  const savePhotos = useSaveEntryPhotos();
  const picker = usePhotoPicker();

  const [draft, setDraft] = useState<{
    recordedAt: string;
    actions: CareAction[];
    note: string;
  } | null>(null);
  /** 지우기로 표시만 해둔다. 실제 삭제는 저장할 때. Storage 파일까지 지워서 되돌릴 수 없다. */
  const [removedIds, setRemovedIds] = useState<string[]>([]);

  const { data: urls } = useSignedUrls(entry?.photos.map((p) => p.storage_path) ?? []);

  if (isPending) return <Skeleton className="h-96 w-full" />;
  if (!entry) return <EmptyState title="기록을 찾을 수 없어요" />;

  const value = draft ?? {
    recordedAt: toDatetimeLocal(new Date(entry.recorded_at)),
    actions: entry.actions,
    note: entry.note ?? '',
  };

  const keptCount = entry.photos.length - removedIds.length;
  const busy = update.isPending || savePhotos.isPending;

  async function handleSave() {
    if (!entry || !userId) return;

    // 사진을 먼저 반영한다. 여기서 실패하면 본문도 안 바뀌어 상태가 덜 꼬인다.
    if (removedIds.length > 0 || picker.photos.length > 0) {
      await savePhotos.mutateAsync({
        entryId: entry.id,
        plantId: entry.plant_id,
        userId,
        removed: entry.photos.filter((p) => removedIds.includes(p.id)),
        added: picker.photos,
        nextSortOrder: entry.photos.length,
      });
    }

    update.mutate(
      {
        recorded_at: new Date(value.recordedAt).toISOString(),
        // 사람이 직접 고쳤으므로 출처는 manual 이 된다
        date_source: 'manual',
        actions: value.actions,
        note: value.note.trim() || null,
      },
      { onSuccess: () => void navigate(`/entries/${entry.id}`, { replace: true }) },
    );
  }

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-5">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-bold">기록 수정</h1>
        <Button size="sm" disabled={busy} onClick={() => void handleSave()}>
          {busy ? '저장 중…' : '저장'}
        </Button>
      </header>

      {/* 이미 올린 사진과 새로 고른 사진을 한 그리드에 그린다 — 작성 화면과 같은 모양 */}
      <PhotoPickerField
        photos={picker.photos}
        error={picker.error}
        onAdd={(files) => void picker.add(files)}
        onRemove={picker.remove}
        onMove={picker.move}
        leadingCount={keptCount}
        leading={entry.photos.map((photo, index) => {
          const removed = removedIds.includes(photo.id);
          return (
            <div key={photo.id} className="relative">
              <img
                src={urls?.[photo.storage_path]}
                alt={`올려둔 사진 ${index + 1}`}
                className={cn(
                  'size-24 rounded-input object-cover transition-opacity',
                  removed && 'opacity-30',
                )}
              />
              <button
                type="button"
                aria-label={removed ? `사진 ${index + 1} 삭제 취소` : `사진 ${index + 1} 빼기`}
                onClick={() =>
                  setRemovedIds((prev) =>
                    removed ? prev.filter((x) => x !== photo.id) : [...prev, photo.id],
                  )
                }
                className="absolute -top-1.5 -right-1.5 flex size-6 items-center justify-center rounded-full bg-bark-800 text-white"
              >
                {removed ? (
                  <RotateCcw className="size-3.5" aria-hidden />
                ) : (
                  <X className="size-3.5" aria-hidden />
                )}
              </button>
            </div>
          );
        })}
      />

      {removedIds.length > 0 && (
        <span className="-mt-3 text-xs text-warn-500">
          저장하면 {removedIds.length}장이 완전히 지워져요. 되돌릴 수 없어요.
        </span>
      )}

      <Field label="언제 찍었나요?">
        <Input
          type="datetime-local"
          value={value.recordedAt}
          onChange={(e) => setDraft({ ...value, recordedAt: e.currentTarget.value })}
        />
      </Field>

      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium">무엇을 했나요? (복수 선택)</span>
        <ActionChips
          selected={value.actions}
          onToggle={(action) =>
            setDraft({
              ...value,
              actions: value.actions.includes(action)
                ? value.actions.filter((a) => a !== action)
                : [...value.actions, action],
            })
          }
        />
      </div>

      <Field label="메모 (선택)">
        <Textarea
          rows={3}
          maxLength={2000}
          value={value.note}
          onChange={(e) => setDraft({ ...value, note: e.currentTarget.value })}
        />
      </Field>

      {(update.isError || savePhotos.isError) && (
        <p className="text-sm text-urgent-500">저장하지 못했어요. 잠시 후 다시 시도해주세요.</p>
      )}
    </div>
  );
}
