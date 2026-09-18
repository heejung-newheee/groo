import { Bot, Info, RefreshCw, ThumbsDown, ThumbsUp, TriangleAlert } from 'lucide-react';
import { AI } from '../../lib/constants';
import { cn } from '../../lib/cn';
import {
  useAnalysis,
  useAnalysisFeedback,
  useRequestAnalysis,
  useTodayUsage,
} from '../../hooks/useAiAnalysis';
import type { Diagnosis, Overall, Severity } from '../../lib/schemas/ai';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Skeleton } from '../ui/Skeleton';

const SEVERITY: Record<Severity, { label: string; emoji: string; tone: string }> = {
  info: { label: '참고', emoji: 'ℹ️', tone: 'text-leaf-600' },
  warn: { label: '주의', emoji: '⚠️', tone: 'text-warn-500' },
  urgent: { label: '급함', emoji: '🚨', tone: 'text-urgent-500' },
};

const OVERALL: Record<Overall, string> = {
  healthy: '건강해 보여요',
  watch: '살펴볼 점이 있어요',
  needs_attention: '조치가 필요해 보여요',
};

/** 항상 보인다. 접었다 펴는 UI 로 숨기지 않는다. */
function Disclaimer() {
  return (
    <p
      className="flex items-start gap-1.5 border-t pt-3 text-xs"
      style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-muted)' }}
    >
      <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden />
      {AI.disclaimer}
    </p>
  );
}

export function AiSection({ photoId }: { photoId: string }) {
  const { data: analysis, isPending: loading } = useAnalysis(photoId);
  const { data: used = 0 } = useTodayUsage();
  const request = useRequestAnalysis(photoId);
  const feedback = useAnalysisFeedback(photoId);

  const remaining = Math.max(0, AI.dailyQuota - used);

  if (loading) return <Skeleton className="h-40 w-full" />;

  // ── 아직 분석 안 함 ──
  if (!analysis) {
    return (
      <Card className="flex flex-col items-center gap-3 text-center">
        <Bot className="size-8 text-leaf-500" aria-hidden />
        <h2 className="font-bold">이 사진, AI에게 물어볼까요?</h2>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          잎 상태나 이상 증상을 살펴봐 드려요
        </p>

        {remaining > 0 ? (
          <>
            <Button onClick={() => request.mutate(false)} disabled={request.isPending}>
              {request.isPending ? '요청 중…' : '물어보기'}
            </Button>
            <span className="tabular text-xs" style={{ color: 'var(--text-muted)' }}>
              오늘 {AI.dailyQuota}번 중 {remaining}번 남음
            </span>
          </>
        ) : (
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            오늘의 질문을 모두 썼어요. 내일 다시 만나요
          </p>
        )}
        <Disclaimer />
      </Card>
    );
  }

  // ── 분석 중 ──
  if (analysis.status === 'pending') {
    return (
      <Card className="flex flex-col gap-3">
        <span className="inline-flex items-center gap-2 text-sm font-semibold">
          <Bot className="size-4 text-leaf-500" aria-hidden />
          사진을 살펴보는 중…
        </span>
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
      </Card>
    );
  }

  // ── 실패 / 전역 예산 초과 ──
  if (analysis.status === 'failed' || analysis.status === 'skipped' || !analysis.result) {
    return (
      <Card className="flex flex-col items-center gap-3 text-center">
        <TriangleAlert className="size-7 text-warn-500" aria-hidden />
        <p className="text-sm">
          {analysis.status === 'skipped'
            ? '오늘은 AI가 쉬는 날이에요'
            : '지금은 답하기 어려워요'}
        </p>
        {/* 실패는 쿼터를 차감하지 않으므로 재시도가 자유롭다 */}
        <Button variant="secondary" size="sm" onClick={() => request.mutate(true)}>
          다시 시도
        </Button>
        <Disclaimer />
      </Card>
    );
  }

  return (
    <DiagnosisCard
      diagnosis={analysis.result}
      helpful={analysis.helpful}
      retrying={request.isPending}
      onRetry={() => request.mutate(true)}
      onFeedback={(helpful) => feedback.mutate({ id: analysis.id, helpful })}
    />
  );
}

function DiagnosisCard({
  diagnosis,
  helpful,
  retrying,
  onRetry,
  onFeedback,
}: {
  diagnosis: Diagnosis;
  helpful: boolean | null;
  retrying: boolean;
  onRetry: () => void;
  onFeedback: (helpful: boolean) => void;
}) {
  if (!diagnosis.is_plant) {
    return (
      <Card className="flex flex-col gap-3">
        <p className="text-sm">식물 사진이 아닌 것 같아요. 다른 사진으로 다시 물어봐 주세요.</p>
        <Disclaimer />
      </Card>
    );
  }

  return (
    <Card className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <span className="inline-flex items-center gap-2 font-bold">
          <Bot className="size-4 text-leaf-500" aria-hidden />
          AI 진단
        </span>
        <button
          type="button"
          onClick={onRetry}
          disabled={retrying}
          className="inline-flex items-center gap-1 text-xs disabled:opacity-50"
          style={{ color: 'var(--text-muted)' }}
        >
          <RefreshCw className="size-3.5" aria-hidden />
          다시
        </button>
      </div>

      <div>
        <p className="font-semibold">{OVERALL[diagnosis.overall]}</p>
        <p className="mt-1 text-sm">{diagnosis.summary}</p>
        {diagnosis.plant_guess && (
          <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
            {diagnosis.plant_guess.common_name} 로 보여요
          </p>
        )}
      </div>

      {diagnosis.observations.length > 0 && (
        <section>
          <h3 className="text-sm font-semibold">👀 보이는 것</h3>
          <ul className="mt-1.5 flex flex-col gap-1 text-sm">
            {diagnosis.observations.map((o) => (
              <li key={o} className="flex gap-1.5">
                <span aria-hidden>•</span>
                {o}
              </li>
            ))}
          </ul>
        </section>
      )}

      {diagnosis.concerns.map((concern) => {
        const meta = SEVERITY[concern.severity];
        return (
          <section
            key={concern.issue}
            className="rounded-input border-l-2 pl-3"
            style={{ borderColor: 'currentColor' }}
          >
            <h3 className={cn('text-sm font-semibold', meta.tone)}>
              <span aria-hidden>{meta.emoji}</span> {concern.issue}
              <span className="ml-1 text-xs">[{meta.label}]</span>
            </h3>
            <p className="mt-1 text-sm">{concern.evidence}</p>
            <p className="mt-1 text-sm font-medium">→ {concern.action}</p>
          </section>
        );
      })}

      {diagnosis.care_tips.length > 0 && (
        <section>
          <h3 className="text-sm font-semibold">🌿 관리 팁</h3>
          <ul className="mt-1.5 flex flex-col gap-1 text-sm">
            {diagnosis.care_tips.map((t) => (
              <li key={t} className="flex gap-1.5">
                <span aria-hidden>•</span>
                {t}
              </li>
            ))}
          </ul>
        </section>
      )}

      {diagnosis.uncertainty && (
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
          ⓘ {diagnosis.uncertainty}
        </p>
      )}

      <div
        className="flex items-center justify-between border-t pt-3"
        style={{ borderColor: 'var(--border-subtle)' }}
      >
        <span className="text-sm">도움이 됐나요?</span>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => onFeedback(true)}
            aria-label="도움이 됐어요"
            aria-pressed={helpful === true}
            className={cn('rounded-input p-2', helpful === true && 'bg-leaf-100 text-leaf-700')}
          >
            <ThumbsUp className="size-4" aria-hidden />
          </button>
          <button
            type="button"
            onClick={() => onFeedback(false)}
            aria-label="도움이 안 됐어요"
            aria-pressed={helpful === false}
            className={cn('rounded-input p-2', helpful === false && 'bg-leaf-100 text-leaf-700')}
          >
            <ThumbsDown className="size-4" aria-hidden />
          </button>
        </div>
      </div>

      <Disclaimer />
    </Card>
  );
}
