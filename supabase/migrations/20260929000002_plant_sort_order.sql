-- 사용자가 정한 식물 순서. null 이면 아직 안 정한 것 — 목록 맨 앞에 최신순으로 온다.
alter table public.plants
  add column sort_order integer;
