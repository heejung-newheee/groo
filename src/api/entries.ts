import { endOfMonth, startOfMonth } from 'date-fns';
import { supabase } from '../lib/supabase';
import type { CareAction } from '../lib/constants';
import type { DateSource, EntryWithPhotos, EntryWithPlant } from '../types/models';

const WITH_PHOTOS = '*, photos(*)';
const WITH_PLANT =
  '*, photos(*), plant:plants(id, nickname, species, location, adopted_at, last_watered_at)';

export const PAGE_SIZE = 20;

/** 식물 상세 타임라인. 무한스크롤용 페이지 단위 조회. */
export async function listEntriesByPlant(
  plantId: string,
  page: number,
): Promise<EntryWithPhotos[]> {
  const from = page * PAGE_SIZE;
  const { data, error } = await supabase
    .from('entries')
    .select(WITH_PHOTOS)
    .eq('plant_id', plantId)
    .order('recorded_at', { ascending: false })
    .range(from, from + PAGE_SIZE - 1);
  if (error) throw error;
  return sortPhotos((data ?? []) as EntryWithPhotos[]);
}

export async function listRecentEntries(limit = 5): Promise<EntryWithPlant[]> {
  const { data, error } = await supabase
    .from('entries')
    .select(WITH_PLANT)
    .order('recorded_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return sortPhotos((data ?? []) as EntryWithPlant[]);
}

/** 캘린더 — 해당 월의 일지 전부 */
export async function listEntriesByMonth(month: Date): Promise<EntryWithPlant[]> {
  const { data, error } = await supabase
    .from('entries')
    .select(WITH_PLANT)
    .gte('recorded_at', startOfMonth(month).toISOString())
    .lte('recorded_at', endOfMonth(month).toISOString())
    .order('recorded_at', { ascending: true });
  if (error) throw error;
  return sortPhotos((data ?? []) as EntryWithPlant[]);
}

export async function getEntry(id: string): Promise<EntryWithPlant | null> {
  const { data, error } = await supabase
    .from('entries')
    .select(WITH_PLANT)
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const [entry] = sortPhotos([data as EntryWithPlant]);
  return entry ?? null;
}

export interface EntryInput {
  plant_id: string;
  recorded_at: string;
  date_source: DateSource;
  actions: CareAction[];
  note: string | null;
}

export async function createEntry(userId: string, input: EntryInput): Promise<EntryWithPhotos> {
  const { data, error } = await supabase
    .from('entries')
    .insert({ ...input, user_id: userId })
    .select(WITH_PHOTOS)
    .single();
  if (error) throw error;
  return data as EntryWithPhotos;
}

export async function updateEntry(id: string, patch: Partial<EntryInput>): Promise<void> {
  const { error } = await supabase.from('entries').update(patch).eq('id', id);
  if (error) throw error;
}

export async function deleteEntry(id: string): Promise<void> {
  const { error } = await supabase.from('entries').delete().eq('id', id);
  if (error) throw error;
}

/** photos 는 중첩 select 에서 정렬이 보장되지 않아 클라이언트에서 맞춘다. */
function sortPhotos<T extends { photos?: { sort_order: number }[] }>(rows: T[]): T[] {
  for (const row of rows) {
    row.photos?.sort((a, b) => a.sort_order - b.sort_order);
  }
  return rows;
}
