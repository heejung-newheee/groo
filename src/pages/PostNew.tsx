import { X } from 'lucide-react';
import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { COMMUNITY } from '../lib/constants';
import { cn } from '../lib/cn';
import { thumbPath } from '../lib/image';
import { useCreatePost } from '../hooks/useCommunity';
import { useEntry } from '../hooks/useEntries';
import { usePhotoPicker } from '../hooks/usePhotoPicker';
import { usePlants } from '../hooks/usePlants';
import { useSignedUrls } from '../hooks/useSignedUrls';
import { PhotoPickerField } from '../components/entries/PhotoPickerField';
import { Button } from '../components/ui/Button';
import { Field, Select, Textarea } from '../components/ui/Field';
import { Skeleton } from '../components/ui/Skeleton';
import type { EntryWithPlant, PostKind } from '../types/models';

/**
 * 글쓰기. ?entryId= 로 들어오면 일지의 식물·메모·사진을 채워 둔다 (일지에서 "자랑하기").
 * 일지를 다 불러온 뒤에 폼을 그려야 초기값이 제대로 들어간다.
 */
export function PostNew() {
  const [params] = useSearchParams();
  const entryId = params.get('entryId') ?? undefined;
  const { data: entry, isPending } = useEntry(entryId);

  if (entryId && isPending) return <Skeleton className="h-96 w-full" />;
  return (
    <PostForm
      initialKind={params.get('kind') === 'question' ? 'question' : 'show'}
      entry={entry ?? null}
    />
  );
}

function PostForm({
  initialKind,
  entry,
}: {
  initialKind: PostKind;
  entry: EntryWithPlant | null;
}) {
  const navigate = useNavigate();
  const { data: plants } = usePlants();
  const picker = usePhotoPicker();
  const create = useCreatePost();

  const [kind, setKind] = useState<PostKind>(initialKind);
  const [plantId, setPlantId] = useState(entry?.plant_id ?? '');
  const [body, setBody] = useState(entry?.note ?? '');
  const [entryPhotos, setEntryPhotos] = useState(entry?.photos ?? []);

  const { data: urls } = useSignedUrls([
    ...entryPhotos.map((p) => p.storage_path),
    ...entryPhotos.map((p) => thumbPath(p.storage_path)),
  ]);

  const photoCount = entryPhotos.length + picker.photos.length;
  // 자랑은 사진이 있어야 한다. 질문은 글만 올려도 된다.
  const needsPhoto = kind === 'show' && photoCount === 0;
  const canSave = body.trim() !== '' && !needsPhoto && !create.isPending;

  function handleSave() {
    if (!canSave) return;
    const plant = plants?.find((p) => p.id === plantId) ?? null;
    create.mutate(
      { kind, body: body.trim(), plant, photos: picker.photos, entryPhotos },
      { onSuccess: (id) => void navigate(`/community/posts/${id}`, { replace: true }) },
    );
  }

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-5">
      <h1 className="text-xl font-bold">글쓰기</h1>

      <div role="radiogroup" aria-label="글 종류" className="flex gap-2">
        {COMMUNITY.kinds.map((k) => (
          <button
            key={k.value}
            type="button"
            role="radio"
            aria-checked={kind === k.value}
            onClick={() => setKind(k.value)}
            className={cn(
              'min-h-[44px] flex-1 rounded-input text-[15px] font-semibold transition-colors',
              kind === k.value
                ? 'bg-leaf-500 text-white'
                : 'border border-[var(--border-subtle)]',
            )}
          >
            {k.label}
          </button>
        ))}
      </div>

      <Field label="어떤 식물인가요? (선택)" hint="이름·품종·함께한 날이 글에 같이 보여요">
        <Select value={plantId} onChange={(e) => setPlantId(e.currentTarget.value)}>
          <option value="">태그 안 함</option>
          {plants?.map((plant) => (
            <option key={plant.id} value={plant.id}>
              {plant.nickname}
            </option>
          ))}
        </Select>
      </Field>

      <PhotoPickerField
        photos={picker.photos}
        error={picker.error}
        onAdd={(files) => void picker.add(files)}
        onRemove={picker.remove}
        onMove={picker.move}
        onReplace={picker.replace}
        leadingCount={entryPhotos.length}
        leading={entryPhotos.map((photo, index) => (
          <div key={photo.id} className="relative">
            <img
              src={urls?.[thumbPath(photo.storage_path)] ?? urls?.[photo.storage_path]}
              alt={`일지 사진 ${index + 1}`}
              className="size-24 rounded-input object-cover"
            />
            <button
              type="button"
              onClick={() =>
                setEntryPhotos((prev) => prev.filter((p) => p.id !== photo.id))
              }
              aria-label={`일지 사진 ${index + 1} 빼기`}
              className="absolute -top-1.5 -right-1.5 flex size-6 items-center justify-center rounded-full bg-bark-800 text-white"
            >
              <X className="size-3.5" aria-hidden />
            </button>
          </div>
        ))}
      />

      <Field label={kind === 'question' ? '궁금한 점' : '내용'}>
        <Textarea
          rows={5}
          maxLength={COMMUNITY.maxBodyLength}
          value={body}
          onChange={(e) => setBody(e.currentTarget.value)}
          placeholder={
            kind === 'question'
              ? '잎 끝이 갈색으로 말라요. 물을 너무 줬을까요?'
              : '새 잎이 났어요!'
          }
        />
      </Field>

      {needsPhoto && (
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          자랑 글에는 사진을 한 장 이상 올려주세요
        </p>
      )}
      {create.isError && (
        <p className="text-sm text-urgent-500">
          올리지 못했어요. 잠시 후 다시 시도해주세요.
        </p>
      )}

      <Button disabled={!canSave} onClick={handleSave}>
        {create.isPending ? '올리는 중…' : '올리기'}
      </Button>
    </div>
  );
}
