import { cn } from '../../lib/cn';

/**
 * 섹션 헤더의 작은 동작 버튼(전체 보기, 등록, 순서 편집 등).
 * Link 와 button 양쪽에 쓰려고 컴포넌트 대신 클래스로 둔다.
 *
 * 타이틀보다 작게 보이도록 줄였다. 대신 after 로 위아래 누를 영역을 넓혀
 * 터치 타겟은 44px 근처를 유지한다.
 */
const BASE =
  'relative inline-flex items-center gap-1 rounded-[8px] px-3 py-2 text-xs font-semibold transition-colors disabled:opacity-50 after:absolute after:inset-x-0 after:-inset-y-2.5';

export const pill = {
  /** 주요 동작 */
  solid: cn(BASE, 'bg-leaf-500 text-white hover:bg-leaf-600'),
  /** 보조 동작 */
  outline: cn(BASE, 'border border-[var(--border-subtle)] hover:bg-leaf-50'),
  /** 이동 링크 */
  soft: cn(BASE, 'bg-leaf-50 text-leaf-700 hover:bg-leaf-100'),
};
