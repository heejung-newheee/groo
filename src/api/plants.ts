import { format } from 'date-fns';
import { supabase } from '../lib/supabase';
import type { Plant, PlantWithCover } from '../types/models';

/**
 * 대표 사진은 photos 로 FK 를 걸지 않았다 (photos → entries → plants 순환 참조).
 * 그래서 PostgREST 중첩 select 로 못 가져온다. 두 번 나눠 조회한 뒤 붙인다.
 */
async function attachCovers(plants: Plant[]): Promise<PlantWithCover[]> {
  const ids = plants.map((p) => p.cover_photo_id).filter((id): id is string => id !== null);

  const pathById: Record<string, string> = {};
  if (ids.length > 0) {
    const { data } = await supabase.from('photos').select('id, storage_path').in('id', ids);
    for (const row of (data ?? []) as { id: string; storage_path: string }[]) {
      pathById[row.id] = row.storage_path;
    }
  }

  return plants.map((p) => ({
    ...p,
    cover_path: p.cover_photo_id ? (pathById[p.cover_photo_id] ?? null) : null,
  }));
}

export async function listPlants(includeArchived = false): Promise<PlantWithCover[]> {
  let query = supabase.from('plants').select('*').order('created_at', { ascending: false });
  if (!includeArchived) query = query.is('archived_at', null);

  const { data, error } = await query;
  if (error) throw error;
  return attachCovers((data ?? []) as Plant[]);
}

export async function getPlant(id: string): Promise<PlantWithCover | null> {
  const { data, error } = await supabase.from('plants').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const [withCover] = await attachCovers([data as Plant]);
  return withCover ?? null;
}

export interface PlantInput {
  nickname: string;
  species: string | null;
  adopted_at: string;
  location: string | null;
  watering_interval_days: number | null;
}

export async function createPlant(userId: string, input: PlantInput): Promise<Plant> {
  const { data, error } = await supabase
    .from('plants')
    .insert({ ...input, user_id: userId })
    .select()
    .single();
  if (error) throw error;
  return data as Plant;
}

export async function updatePlant(id: string, patch: Partial<PlantInput>): Promise<void> {
  const { error } = await supabase.from('plants').update(patch).eq('id', id);
  if (error) throw error;
}

export async function setCoverPhoto(plantId: string, photoId: string): Promise<void> {
  const { error } = await supabase
    .from('plants')
    .update({ cover_photo_id: photoId })
    .eq('id', plantId);
  if (error) throw error;
}

/** 떠나보낸 식물은 지우지 않고 archived_at 만 채운다 (기록 보존) */
export async function archivePlant(id: string): Promise<void> {
  const { error } = await supabase
    .from('plants')
    .update({ archived_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

export async function restorePlant(id: string): Promise<void> {
  const { error } = await supabase.from('plants').update({ archived_at: null }).eq('id', id);
  if (error) throw error;
}

/** 홈의 "물줬어요" 한 번 탭. 일지도 같이 남긴다. */
export async function markWatered(userId: string, plantId: string, now = new Date()): Promise<void> {
  const { error: plantErr } = await supabase
    .from('plants')
    .update({ last_watered_at: format(now, 'yyyy-MM-dd') })
    .eq('id', plantId);
  if (plantErr) throw plantErr;

  const { error: entryErr } = await supabase.from('entries').insert({
    user_id: userId,
    plant_id: plantId,
    recorded_at: now.toISOString(),
    date_source: 'manual',
    actions: ['water'],
  });
  if (entryErr) throw entryErr;
}
