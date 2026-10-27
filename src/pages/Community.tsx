import { PenLine } from 'lucide-react';
import { Link, useSearchParams } from 'react-router';
import { COMMUNITY } from '../lib/constants';
import { cn } from '../lib/cn';
import { PostFeed } from '../components/community/PostFeed';
import { pill } from '../components/ui/pill';
import type { PostKind } from '../types/models';

const TABS = [{ value: 'all', label: '전체' }, ...COMMUNITY.kinds] as const;

export function Community() {
  const [params, setParams] = useSearchParams();
  const raw = params.get('kind');
  const kind: PostKind | 'all' = raw === 'show' || raw === 'question' ? raw : 'all';

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-bold">커뮤니티</h1>
        <Link
          to={`/community/new${kind === 'question' ? '?kind=question' : ''}`}
          className={pill.solid}
        >
          <PenLine className="size-3.5" aria-hidden />
          글쓰기
        </Link>
      </div>

      <div role="tablist" className="flex gap-2">
        {TABS.map((tab) => (
          <button
            key={tab.value}
            type="button"
            role="tab"
            aria-selected={kind === tab.value}
            onClick={() =>
              setParams(tab.value === 'all' ? {} : { kind: tab.value }, { replace: true })
            }
            className={cn(
              'min-h-[36px] rounded-full px-4 text-sm font-medium transition-colors',
              kind === tab.value
                ? 'bg-leaf-500 text-white'
                : 'border border-[var(--border-subtle)]',
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <PostFeed
        key={kind}
        filter={{ kind, authorId: null }}
        emptyTitle={kind === 'question' ? '아직 질문이 없어요' : '첫 글을 올려보세요'}
      />
    </div>
  );
}
