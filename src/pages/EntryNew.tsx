import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { toDatetimeLocal } from '../lib/format';
import type { CareAction } from '../lib/constants';
import type { DateSource } from '../types/models';
import { usePhotoPicker } from '../hooks/usePhotoPicker';
import { useCreateEntry } from '../hooks/useEntries';
import { usePlants } from '../hooks/usePlants';
import { ActionChips } from '../components/entries/ActionChips';
import { DateSourceNotice } from '../components/entries/DateSourceNotice';
import { PhotoPickerField } from '../components/entries/PhotoPickerField';
import { Button } from '../components/ui/Button';
import { Field, Input, Select, Textarea } from '../components/ui/Field';
import { Skeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/States';

export function EntryNew() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { data: plants, isPending } = usePlants();
  const picker = usePhotoPicker();
  const create = useCreateEntry();

  const [pickedPlantId, setPlantId] = useState(params.get('plantId') ?? '');
  const [recordedAt, setRecordedAt] = useState(() => toDatetimeLocal(new Date()));
  const [dateSource, setDateSource] = useState<DateSource>('manual');
  const [actions, setActions] = useState<CareAction[]>([]);
  const [note, setNote] = useState('');

  /** 사진에서 날짜를 뽑으면 입력칸을 채운다. 사용자가 이미 고쳤으면 건드리지 않는다. */
  async function handleAddPhotos(files: FileList | null) {
    const resolved = await picker.add(files);
    if (resolved && dateSource === 'manual') {
      setRecordedAt(toDatetimeLocal(resolved.recordedAt));
      setDateSource(resolved.source);
    }
  }

  if (isPending) return <Skeleton className="h-96 w-full" />;
  if (!plants || plants.length === 0) {
    return <EmptyState title="먼저 식물을 등록해주세요" description="일지는 식물에 딸려서 기록돼요" />;
  }

  // 식물이 하나뿐이면 고를 이유가 없다 — 렌더 시점에 정한다
  const plantId = pickedPlantId || (plants.length === 1 ? (plants[0]?.id ?? '') : '');
  const selected = plants.find((p) => p.id === plantId);
  const canSave = plantId !== '' && !create.isPending;

  function handleSave() {
    if (!canSave) return;
    create.mutate(
      {
        entry: {
          plant_id: plantId,
          recorded_at: new Date(recordedAt).toISOString(),
          date_source: dateSource,
          actions,
          note: note.trim() || null,
        },
        photos: picker.photos,
        setCoverIfEmpty: selected?.cover_photo_id === null,
      },
      { onSuccess: (entry) => void navigate(`/entries/${entry.id}`, { replace: true }) },
    );
  }

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-5">
      {/* 저장은 항상 우상단 고정 */}
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-bold">일지 쓰기</h1>
        <Button size="sm" disabled={!canSave} onClick={handleSave}>
          {create.isPending ? '저장 중…' : '저장'}
        </Button>
      </header>

      <Field label="어떤 식물인가요?">
        <Select value={plantId} onChange={(e) => setPlantId(e.currentTarget.value)}>
          <option value="">선택해주세요</option>
          {plants.map((plant) => (
            <option key={plant.id} value={plant.id}>
              {plant.nickname}
            </option>
          ))}
        </Select>
      </Field>

      <PhotoPickerField
        photos={picker.photos}
        error={picker.error}
        onAdd={(files) => void handleAddPhotos(files)}
        onRemove={picker.remove}
        onMove={picker.move}
      />

      {/* 자동 추출이 실패해도 절대 막히지 않는다. 항상 보이고 항상 수정 가능하다. */}
      <Field label="언제 찍었나요?" hint={<DateSourceNotice source={dateSource} />}>
        <Input
          type="datetime-local"
          value={recordedAt}
          onChange={(e) => {
            setRecordedAt(e.currentTarget.value);
            setDateSource('manual');
          }}
        />
      </Field>

      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium">무엇을 했나요? (복수 선택)</span>
        <ActionChips
          selected={actions}
          onToggle={(action) =>
            setActions((prev) =>
              prev.includes(action) ? prev.filter((a) => a !== action) : [...prev, action],
            )
          }
        />
      </div>

      <Field label="메모 (선택)">
        <Textarea
          rows={3}
          maxLength={2000}
          value={note}
          onChange={(e) => setNote(e.currentTarget.value)}
          placeholder="새 잎이 났다!"
        />
      </Field>

      {create.isError && (
        <p className="text-sm text-urgent-500">저장하지 못했어요. 잠시 후 다시 시도해주세요.</p>
      )}
    </div>
  );
}
