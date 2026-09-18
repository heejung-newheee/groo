import { Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { formatDateTime } from '../lib/format';
import { formatDday } from '../lib/dday';
import { useDeleteEntry, useEntry } from '../hooks/useEntries';
import { useSignedUrls } from '../hooks/useSignedUrls';
import { AskWebAiCard } from '../components/ai/AskWebAiCard';
import { ActionList } from '../components/entries/ActionChips';
import { DateSourceNotice } from '../components/entries/DateSourceNotice';
import { Photo } from '../components/ui/Photo';
import { Skeleton } from '../components/ui/Skeleton';
import { EmptyState, ErrorState } from '../components/ui/States';

export function EntryDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: entry, isPending, isError, refetch } = useEntry(id);
  const remove = useDeleteEntry();
  const [index, setIndex] = useState(0);

  const { data: urls } = useSignedUrls(entry?.photos.map((p) => p.storage_path) ?? []);

  if (isPending) return <Skeleton className="aspect-[4/3] w-full" />;
  if (isError) return <ErrorState onRetry={() => void refetch()} />;
  if (!entry) return <EmptyState title="기록을 찾을 수 없어요" />;

  const photo = entry.photos[index];
  const plantName = entry.plant?.nickname ?? '식물';

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-5">
      {photo && (
        <div className="flex flex-col gap-2">
          <Photo
            url={urls?.[photo.storage_path]}
            alt={`${plantName} ${formatDateTime(entry.recorded_at)} 사진`}
            className="aspect-[4/3] w-full rounded-card"
          />
          {entry.photos.length > 1 && (
            <div className="flex justify-center gap-2">
              {entry.photos.map((p, i) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setIndex(i)}
                  aria-label={`사진 ${i + 1} 보기`}
                  aria-current={i === index}
                  className={i === index ? 'size-2 rounded-full bg-leaf-500' : 'size-2 rounded-full bg-leaf-300'}
                />
              ))}
            </div>
          )}
        </div>
      )}

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
      </header>

      <ActionList actions={entry.actions} />

      {entry.note && <p className="text-[15px] whitespace-pre-wrap">{entry.note}</p>}

      {/* 테스트 버전에서는 API 대신 웹 AI 에 직접 물어보게 한다 (비용 0).
          API 방식은 AiSection + analyze-plant Edge Function 에 그대로 남아 있다. */}
      <AskWebAiCard
        plant={entry.plant}
        entry={entry}
        photoUrl={photo ? urls?.[photo.storage_path] : undefined}
      />
    </div>
  );
}
