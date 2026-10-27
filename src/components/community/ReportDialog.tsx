import { useState } from 'react';
import { COMMUNITY } from '../../lib/constants';
import { useReport } from '../../hooks/useCommunity';
import { Button } from '../ui/Button';
import type { ReportTarget } from '../../api/community';
import type { ReportReason } from '../../types/models';

/** ConfirmDialog 와 같은 모양. 사유를 고르면 신고한다. */
export function ReportDialog({
  target,
  onClose,
}: {
  target: ReportTarget;
  onClose: () => void;
}) {
  const send = useReport();
  const [reason, setReason] = useState<ReportReason | null>(null);

  const done = send.isSuccess;
  const message = !done
    ? null
    : send.data
      ? '신고했어요. 검토 후 조치할게요.'
      : '이미 신고했어요.';

  return (
    <div
      role="dialog"
      aria-modal
      aria-label="신고하기"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="flex w-full max-w-sm flex-col gap-4 rounded-card p-5"
        style={{ background: 'var(--bg-surface)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {done ? (
          <>
            <p className="text-[15px]">{message}</p>
            <Button variant="secondary" onClick={onClose}>
              닫기
            </Button>
          </>
        ) : (
          <>
            <p className="text-[15px] font-semibold">신고 사유를 골라주세요</p>
            <fieldset className="flex flex-col gap-1">
              {COMMUNITY.reportReasons.map((r) => (
                <label
                  key={r.value}
                  className="flex min-h-[44px] items-center gap-3 text-[15px]"
                >
                  <input
                    type="radio"
                    name="reason"
                    value={r.value}
                    checked={reason === r.value}
                    onChange={() => setReason(r.value)}
                    className="accent-leaf-500"
                  />
                  {r.label}
                </label>
              ))}
            </fieldset>
            {send.isError && (
              <p className="text-sm text-urgent-500">
                신고하지 못했어요. 잠시 후 다시 시도해주세요.
              </p>
            )}
            <div className="flex gap-2">
              <Button
                variant="ghost"
                className="flex-1"
                onClick={onClose}
                disabled={send.isPending}
              >
                취소
              </Button>
              <Button
                variant="danger"
                className="flex-1"
                disabled={!reason || send.isPending}
                onClick={() => reason && send.mutate({ target, reason })}
              >
                신고
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
