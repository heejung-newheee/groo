import { supabase } from '../lib/supabase';

export const BUCKET = 'plant-photos';

/** 버킷이 private 이라 서명 URL 이 필요하다. 1시간 유효. */
const TTL_SECONDS = 60 * 60;

export async function signedUrl(path: string): Promise<string | null> {
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, TTL_SECONDS);
  if (error) return null;
  return data.signedUrl;
}

/** 목록 화면에서 N+1 요청을 피하려고 한 번에 서명한다. */
export async function signedUrls(paths: string[]): Promise<Record<string, string>> {
  if (paths.length === 0) return {};
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrls(paths, TTL_SECONDS);
  if (error || !data) return {};

  const map: Record<string, string> = {};
  for (const item of data) {
    if (item.path && item.signedUrl) map[item.path] = item.signedUrl;
  }
  return map;
}

export async function removeObjects(paths: string[]): Promise<void> {
  if (paths.length === 0) return;
  await supabase.storage.from(BUCKET).remove(paths);
}
