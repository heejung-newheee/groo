import { format, parseISO } from 'date-fns';

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
