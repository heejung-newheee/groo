import { Bot } from 'lucide-react';
import { Link } from 'react-router';
import { formatMonthDay } from '../../lib/format';
import { useSignedUrls } from '../../hooks/useSignedUrls';
import { Photo } from '../ui/Photo';
import { ActionList } from './ActionChips';
import type { EntryWithPhotos } from '../../types/models';

/** 식물 상세의 세로 타임라인. 사진 중심. */
export function Timeline({
  entries,
  plantName,
  analyzedPhotoIds,
}: {
  entries: EntryWithPhotos[];
  plantName: string;
  analyzedPhotoIds?: Set<string>;
}) {
  const { data: urls } = useSignedUrls(entries.flatMap((e) => e.photos.map((p) => p.storage_path)));

  return (
    <ol className="flex flex-col">
      {entries.map((entry) => {
        const first = entry.photos[0];
        const hasAi = first && analyzedPhotoIds?.has(first.id);

        return (
          <li key={entry.id} className="flex gap-3">
            {/* 타임라인 축 */}
            <div className="flex flex-col items-center pt-1.5">
              <span className="size-2.5 rounded-full bg-leaf-500" aria-hidden />
              <span className="w-px flex-1" style={{ background: 'var(--border-subtle)' }} aria-hidden />
            </div>

            <Link to={`/entries/${entry.id}`} className="flex-1 pb-6">
              <div className="flex items-center gap-2">
                <span className="tabular text-sm font-semibold">
                  {formatMonthDay(entry.recorded_at)}
                </span>
                <ActionList actions={entry.actions} />
              </div>

              {first && (
                <Photo
                  url={urls?.[first.storage_path]}
                  alt={`${plantName} ${formatMonthDay(entry.recorded_at)} 사진`}
                  className="mt-2 aspect-[4/3] w-full max-w-md rounded-card"
                />
              )}

              {entry.note && <p className="mt-2 line-clamp-2 text-sm">{entry.note}</p>}

              {hasAi && (
                <span className="mt-2 inline-flex items-center gap-1 text-xs text-leaf-600">
                  <Bot className="size-3.5" aria-hidden />
                  AI 진단 있음
                </span>
              )}
            </Link>
          </li>
        );
      })}
    </ol>
  );
}
