/**
 * 앱에서 쓰는 도메인 타입.
 *
 * supabase gen types 결과(database.ts)는 snake_case 그대로라 읽기 불편하고,
 * 아직 링크 전이라 생성되지 않았다. 여기서는 DB 컬럼명을 유지하되
 * 필요한 관계만 얹은 형태로 정의한다.
 */
import type { CareAction } from '../lib/constants';

export type ThemeMode = 'system' | 'light' | 'dark';
export type DateSource = 'exif' | 'file_mtime' | 'manual';

export interface Profile {
  id: string;
  display_name: string;
  avatar_url: string | null;
  timezone: string;
  theme: ThemeMode;
  created_at: string;
}

export interface Plant {
  id: string;
  user_id: string;
  nickname: string;
  species: string | null;
  adopted_at: string;
  location: string | null;
  cover_photo_id: string | null;
  watering_interval_days: number | null;
  last_watered_at: string | null;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
}

/** 목록 카드에 필요한 대표 사진 경로까지 붙인 형태 */
export interface PlantWithCover extends Plant {
  cover_path: string | null;
}

export interface Photo {
  id: string;
  user_id: string;
  entry_id: string;
  storage_path: string;
  width: number;
  height: number;
  bytes: number;
  sort_order: number;
  taken_at: string | null;
  created_at: string;
}

export interface Entry {
  id: string;
  user_id: string;
  plant_id: string;
  recorded_at: string;
  date_source: DateSource;
  actions: CareAction[];
  note: string | null;
  created_at: string;
}

export interface EntryWithPhotos extends Entry {
  photos: Photo[];
}

/** 타임라인·캘린더, 그리고 AI 질문 문구를 만들 때 필요한 식물 정보까지 */
export type EntryPlant = Pick<
  Plant,
  'id' | 'nickname' | 'species' | 'location' | 'adopted_at' | 'last_watered_at'
>;

export interface EntryWithPlant extends EntryWithPhotos {
  plant: EntryPlant | null;
}
