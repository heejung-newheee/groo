import { Pencil, Trash2 } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router';
import { formatDateTime } from '../lib/format';
import { formatDday } from '../lib/dday';
import { useDeleteEntry, useEntry } from '../hooks/useEntries';
import { useSignedUrls } from '../hooks/useSignedUrls';
import { AskWebAiCard } from '../components/ai/AskWebAiCard';
import { ActionList } from '../components/entries/ActionChips';
import { DateSourceNotice } from '../components/entries/DateSourceNotice';
import { Carousel } from '../components/ui/Carousel';
import { Photo } from '../components/ui/Photo';
import { Skeleton } from '../components/ui/Skeleton';
import { EmptyState, ErrorState } from '../components/ui/States';

export function EntryDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: entry, isPending, isError, refetch } = useEntry(id);
  const remove = useDeleteEntry();

  const { data: urls } = useSignedUrls(entry?.photos.map((p) => p.storage_path) ?? []);

  if (isPending) return <Skeleton className="aspect-[4/3] w-full" />;
  if (isError) return <ErrorState onRetry={() => void refetch()} />;
  if (!entry) return <EmptyState title="기록을 찾을 수 없어요" />;

  const plantName = entry.plant?.nickname ?? '식물';
  const firstPhoto = entry.photos[0];

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-5">
      <Carousel
        label={`${plantName} 사진`}
        slides={entry.photos.map((p, i) => (
          <Photo
            key={p.id}
            url={urls?.[p.storage_path]}
            alt={`${plantName} ${formatDateTime(entry.recorded_at)} 사진 ${i + 1}`}
            className="aspect-[4/3] w-full rounded-card"
          />
        ))}
      />

      <header className="flex items-start justify-between gap-3">
        <div>
          {entry.plant && (
            <Link to={`/plants/${entry.plant.id}`} className="font-semibold">
              🪴 {entry.plant.nickname}
              <span className="tabular ml-2 text-sm" style={{ color: 'var(--text-muted)' }}>
                {formatDday(new Date(entry.plant.adopted_at))}
              </span>
            </Link>
          )}
          <p className="tabular mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>
            📅 {formatDateTime(entry.recorded_at)}
          </p>
          <DateSourceNotice source={entry.date_source} />
        </div>

        <div className="flex shrink-0 items-center">
          <Link to={`/entries/${entry.id}/edit`} aria-label="기록 수정" className="p-2">
            <Pencil className="size-5" aria-hidden />
          </Link>

          <button
            type="button"
            aria-label="기록 삭제"
            disabled={remove.isPending}
            onClick={() => {
              if (!window.confirm('이 기록을 삭제할까요? 되돌릴 수 없어요.')) return;
              remove.mutate(entry.id, { onSuccess: () => void navigate(-1) });
            }}
            className="p-2 text-urgent-500 disabled:opacity-50"
          >
            <Trash2 className="size-5" aria-hidden />
          </button>
        </div>
      </header>

      <ActionList actions={entry.actions} />

      {entry.note && <p className="text-[15px] whitespace-pre-wrap">{entry.note}</p>}

      {/* 테스트 버전에서는 API 대신 웹 AI 에 직접 물어보게 한다 (비용 0).
          API 방식은 AiSection + analyze-plant Edge Function 에 그대로 남아 있다. */}
      <AskWebAiCard
        plant={entry.plant}
        entry={entry}
        photoUrl={firstPhoto ? urls?.[firstPhoto.storage_path] : undefined}
      />
    </div>
  );
}
