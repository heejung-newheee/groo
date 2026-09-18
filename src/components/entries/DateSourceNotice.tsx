import { Info, TriangleAlert } from 'lucide-react';
import type { DateSource } from '../../types/models';

/**
 * 날짜를 어디서 가져왔는지 반드시 밝힌다.
 * 카톡/인스타로 받은 사진은 EXIF 가 지워져 있어 체감 30~40% 가 파일 날짜로 떨어진다.
 * 사용자가 그걸 모르면 틀린 날짜가 그대로 남는다.
 */
export function DateSourceNotice({ source }: { source: DateSource }) {
  if (source === 'manual') return null;

  if (source === 'exif') {
    return (
      <span className="inline-flex items-center gap-1 text-xs" style={{ color: 'var(--text-muted)' }}>
        <Info className="size-3.5 shrink-0" aria-hidden />
        사진에서 촬영일을 가져왔어요
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 text-xs text-warn-500">
      <TriangleAlert className="size-3.5 shrink-0" aria-hidden />
      사진에 날짜 정보가 없어 파일 날짜를 썼어요. 맞나요?
    </span>
  );
}
