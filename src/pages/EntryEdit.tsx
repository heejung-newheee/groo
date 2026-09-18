import { useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { toDatetimeLocal } from '../lib/format';
import type { CareAction } from '../lib/constants';
import { useEntry, useUpdateEntry } from '../hooks/useEntries';
import { ActionChips } from '../components/entries/ActionChips';
import { Button } from '../components/ui/Button';
import { Field, Input, Textarea } from '../components/ui/Field';
import { Skeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/States';

export function EntryEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: entry, isPending } = useEntry(id);
  const update = useUpdateEntry(id ?? '');

  const [draft, setDraft] = useState<{
    recordedAt: string;
    actions: CareAction[];
    note: string;
  } | null>(null);

  if (isPending) return <Skeleton className="h-96 w-full" />;
  if (!entry) return <EmptyState title="기록을 찾을 수 없어요" />;

  const value = draft ?? {
    recordedAt: toDatetimeLocal(new Date(entry.recorded_at)),
    actions: entry.actions,
    note: entry.note ?? '',
  };

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-5">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-bold">기록 수정</h1>
        <Button
          size="sm"
          disabled={update.isPending}
          onClick={() =>
            update.mutate(
              {
                recorded_at: new Date(value.recordedAt).toISOString(),
                // 사람이 직접 고쳤으므로 출처는 manual 이 된다
                date_source: 'manual',
                actions: value.actions,
                note: value.note.trim() || null,
              },
              { onSuccess: () => void navigate(`/entries/${entry.id}`, { replace: true }) },
            )
          }
        >
          {update.isPending ? '저장 중…' : '저장'}
        </Button>
      </header>

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
    </div>
  );
}
