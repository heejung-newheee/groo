import { Button } from './Button';

/**
 * window.confirm 대신 쓴다. 모바일 인앱 브라우저(카카오톡 등)나 대화상자를 차단한
 * Safari 에서는 confirm 이 창 없이 바로 false 를 돌려줘 버튼이 먹통처럼 보인다.
 */
export function ConfirmDialog({
  message,
  confirmLabel,
  busy = false,
  onConfirm,
  onCancel,
}: {
  message: string;
  confirmLabel: string;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div
      role="alertdialog"
      aria-modal
      aria-label={message}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onCancel}
    >
      <div
        className="flex w-full max-w-sm flex-col gap-4 rounded-card p-5"
        style={{ background: 'var(--bg-surface)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-[15px]">{message}</p>
        <div className="flex gap-2">
          <Button variant="ghost" className="flex-1" onClick={onCancel} disabled={busy}>
            취소
          </Button>
          <Button variant="danger" className="flex-1" onClick={onConfirm} disabled={busy}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
