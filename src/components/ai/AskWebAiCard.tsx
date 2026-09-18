import { Bot, Check, Copy, Download } from 'lucide-react';
import { useState } from 'react';
import { buildAskPrompt } from '../../lib/aiPrompt';
import { AI } from '../../lib/constants';
import type { CareAction } from '../../lib/constants';
import type { EntryPlant } from '../../types/models';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';

/**
 * API 대신 사용자가 직접 웹 AI(ChatGPT / Claude 등)에 물어보게 하는 카드.
 *
 * 링크를 주는 방식은 동작하지 않는다 — 웹 AI 는 페이지를 텍스트로만 읽고,
 * 그루는 SPA 라 크롤러가 받는 HTML 이 비어 있다. 그래서 문구는 복사, 사진은 파일로 내려준다.
 */
export function AskWebAiCard({
  plant,
  entry,
  photoUrl,
}: {
  plant: EntryPlant | null;
  entry: { recorded_at: string; actions: CareAction[]; note: string | null };
  photoUrl: string | undefined;
}) {
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const prompt = buildAskPrompt(plant, entry);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard 권한이 없으면 사용자가 아래 텍스트를 직접 긁어야 한다
      setCopied(false);
    }
  }

  /**
   * 서명 URL 은 교차 출처라 <a download> 가 먹지 않는다.
   * blob 으로 받아서 내려줘야 파일로 저장된다.
   */
  async function handleDownload() {
    if (!photoUrl) return;
    setDownloading(true);
    try {
      const res = await fetch(photoUrl);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${plant?.nickname ?? 'plant'}-${entry.recorded_at.slice(0, 10)}.webp`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setDownloading(false);
    }
  }

  return (
    <Card className="flex flex-col gap-3">
      <span className="inline-flex items-center gap-2 font-bold">
        <Bot className="size-4 text-leaf-500" aria-hidden />
        AI에게 물어보기
      </span>

      <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
        아래 문구를 복사해 ChatGPT나 Claude에 붙여넣고, 사진을 함께 올려주세요.
      </p>

      <pre
        className="max-h-56 overflow-auto rounded-input p-3 text-xs whitespace-pre-wrap"
        style={{ background: 'var(--bg-elevated)' }}
      >
        {prompt}
      </pre>

      <div className="flex gap-2">
        <Button size="sm" className="flex-1" onClick={() => void handleCopy()}>
          {copied ? (
            <>
              <Check className="size-4" aria-hidden />
              복사됐어요
            </>
          ) : (
            <>
              <Copy className="size-4" aria-hidden />
              문구 복사
            </>
          )}
        </Button>

        {photoUrl && (
          <Button
            size="sm"
            variant="secondary"
            className="flex-1"
            disabled={downloading}
            onClick={() => void handleDownload()}
          >
            <Download className="size-4" aria-hidden />
            {downloading ? '저장 중…' : '사진 저장'}
          </Button>
        )}
      </div>

      <p
        className="border-t pt-3 text-xs"
        style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-muted)' }}
      >
        ⓘ {AI.disclaimer}
      </p>
    </Card>
  );
}
