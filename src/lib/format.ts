import { format, formatDistanceToNow, parseISO } from 'date-fns';
import { ko } from 'date-fns/locale';
import type { Author } from '../types/models';

/** datetime-local 입력에 넣을 수 있는 형태 (YYYY-MM-DDTHH:mm) */
export function toDatetimeLocal(date: Date): string {
  return format(date, "yyyy-MM-dd'T'HH:mm");
}

export function formatDateTime(iso: string): string {
  return format(parseISO(iso), 'yyyy-MM-dd HH:mm');
}

export function formatDate(iso: string): string {
  return format(parseISO(iso), 'yyyy-MM-dd');
}

export function formatMonthDay(iso: string): string {
  return format(parseISO(iso), 'MM/dd');
}

/** "3분 전" 형태 — 커뮤니티 글·댓글 */
export function timeAgo(iso: string): string {
  return formatDistanceToNow(parseISO(iso), { addSuffix: true, locale: ko });
}

export function authorName(author: Author | null): string {
  return author?.display_name || '익명';
}
