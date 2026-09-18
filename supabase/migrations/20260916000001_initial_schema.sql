-- ════════════════════════════════════════════════════════════
--  그루(Groo) 초기 스키마
--  설계 의도는 docs/06-DATABASE.md 참고
-- ════════════════════════════════════════════════════════════

-- ── profiles ────────────────────────────────────────────────
create table public.profiles (
  id           uuid primary key references auth.users on delete cascade,
  display_name text not null default '',
  avatar_url   text,
  -- EXIF DateTimeOriginal 에는 타임존이 없다. 이 값을 기준으로 해석한다.
  timezone     text not null default 'Asia/Seoul',
  theme        text not null default 'system'
               check (theme in ('system', 'light', 'dark')),
  created_at   timestamptz not null default now()
);

-- ── plants ──────────────────────────────────────────────────
create table public.plants (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users on delete cascade,
  nickname       text not null check (length(trim(nickname)) between 1 and 40),
  species        text check (length(species) <= 60),
  adopted_at     date not null default current_date,
  location       text check (length(location) <= 40),
  -- FK 를 걸지 않는다: photos → entries → plants 순환 참조가 생긴다.
  cover_photo_id uuid,
  -- null 이면 물주기 알림 없음 (선인장 등)
  watering_interval_days smallint check (watering_interval_days between 1 and 365),
  last_watered_at date,
  -- soft delete. 떠나보낸 식물의 기록도 남긴다.
  archived_at    timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index plants_user_active_idx on public.plants (user_id, archived_at nulls first);

-- ── entries ─────────────────────────────────────────────────
create type public.care_action as enum
  ('water', 'repot', 'fertilize', 'prune', 'move', 'observe', 'other');

create table public.entries (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users on delete cascade,
  plant_id    uuid not null references public.plants on delete cascade,
  -- 사진을 찍은 시점. EXIF 에서 추출하며 과거일 수 있다.
  recorded_at timestamptz not null,
  -- UI 에서 "사진에서 가져왔어요" vs "파일 날짜를 썼어요" 를 구분해 보여주기 위함
  date_source text not null default 'manual'
              check (date_source in ('exif', 'file_mtime', 'manual')),
  actions     public.care_action[] not null default '{}',
  note        text check (length(note) <= 2000),
  -- 앱에 입력한 시점. recorded_at 과 다를 수 있다.
  created_at  timestamptz not null default now()
);
create index entries_plant_time_idx on public.entries (plant_id, recorded_at desc);
create index entries_user_time_idx  on public.entries (user_id, recorded_at desc);

-- ── photos ──────────────────────────────────────────────────
create table public.photos (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users on delete cascade,
  entry_id     uuid not null references public.entries on delete cascade,
  -- 형식: {user_id}/{plant_id}/{uuid}.webp
  -- 첫 세그먼트가 user_id 여야 Storage RLS 가 통과한다.
  storage_path text not null unique,
  width        int not null,
  height       int not null,
  bytes        int not null,
  sort_order   smallint not null default 0,
  taken_at     timestamptz,
  created_at   timestamptz not null default now()
);
create index photos_entry_idx on public.photos (entry_id, sort_order);

-- ── ai_analyses ─────────────────────────────────────────────
create table public.ai_analyses (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users on delete cascade,
  entry_id      uuid not null references public.entries on delete cascade,
  photo_id      uuid not null references public.photos on delete cascade,
  status        text not null default 'pending'
                check (status in ('pending', 'done', 'failed', 'skipped')),
  result        jsonb,
  model         text,
  input_tokens  int,
  output_tokens int,
  error         text,
  helpful       boolean,
  created_at    timestamptz not null default now(),
  completed_at  timestamptz
);
-- 사진당 1건. 재분석은 update 한다 (비용 통제)
create unique index ai_analyses_photo_uniq on public.ai_analyses (photo_id);
create index ai_analyses_entry_idx on public.ai_analyses (entry_id);

-- ── ai_usage (쿼터) ─────────────────────────────────────────
create table public.ai_usage (
  user_id uuid not null references auth.users on delete cascade,
  day     date not null default current_date,
  count   int  not null default 0,
  primary key (user_id, day)
);

-- ════════════════════════════════════════════════════════════
--  트리거
-- ════════════════════════════════════════════════════════════

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger plants_updated_at
  before update on public.plants
  for each row execute function public.set_updated_at();

-- 가입 시 프로필 자동 생성.
-- security definer 에는 반드시 set search_path = '' 를 붙인다.
-- 빠뜨리면 search_path 조작을 통한 권한 상승 경로가 열린다.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data ->> 'name',
      new.raw_user_meta_data ->> 'full_name',
      ''
    ),
    new.raw_user_meta_data ->> 'avatar_url'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
