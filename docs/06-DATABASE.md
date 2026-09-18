# 06. 데이터베이스

## ER 개요

```
auth.users (Supabase 관리)
    │
    ├─1:1─ profiles
    │
    └─1:N─ plants
              │
              └─1:N─ entries ──1:N── photos
                         │              │
                         └──1:N── ai_analyses (photo당 1건)

ai_usage (user_id + day 복합키) — 쿼터 카운터
```

## 스키마

전체 SQL은 `supabase/migrations/` 에 있다. 아래는 설계 의도 설명.

### profiles

```sql
create table profiles (
  id           uuid primary key references auth.users on delete cascade,
  display_name text not null default '',
  avatar_url   text,
  timezone     text not null default 'Asia/Seoul',
  theme        text not null default 'system'
               check (theme in ('system','light','dark')),
  created_at   timestamptz not null default now()
);
```

**`timezone`이 왜 필요한가** — EXIF의 `DateTimeOriginal`에는 **타임존 정보가 없다.**
로컬 시각 문자열일 뿐이다. 이걸 `timestamptz`로 바꿀 때 기준이 필요하다.

### plants

```sql
create table plants (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users on delete cascade,
  nickname       text not null check (length(trim(nickname)) between 1 and 40),
  species        text check (length(species) <= 60),
  adopted_at     date not null default current_date,
  location       text check (length(location) <= 40),
  cover_photo_id uuid,          -- FK 안 걸음 (photos→entries→plants 순환)
  watering_interval_days smallint check (watering_interval_days between 1 and 365),
  last_watered_at date,
  archived_at    timestamptz,   -- soft delete
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index plants_user_active_idx on plants (user_id, archived_at nulls first);
```

- `watering_interval_days`가 `null`이면 알림 없음 (선인장 등)
- `archived_at`으로 **soft delete** — 떠나보낸 식물의 기록도 남긴다. 정서적으로도, 실수 삭제 방지 차원에서도 맞다.
- `cover_photo_id`에 FK를 안 건 이유: `photos → entries → plants` 순환 참조가 생긴다. 앱단에서 관리한다.

### entries

```sql
create type care_action as enum
  ('water','repot','fertilize','prune','move','observe','other');

create table entries (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users on delete cascade,
  plant_id    uuid not null references plants on delete cascade,
  recorded_at timestamptz not null,       -- ★ EXIF 추출값, 사용자 수정 가능
  date_source text not null default 'manual'
              check (date_source in ('exif','file_mtime','manual')),
  actions     care_action[] not null default '{}',
  note        text check (length(note) <= 2000),
  created_at  timestamptz not null default now()
);
create index entries_plant_time_idx on entries (plant_id, recorded_at desc);
create index entries_user_time_idx  on entries (user_id, recorded_at desc);
```

**`recorded_at` vs `created_at`을 왜 나누는가**
- `recorded_at` = 사진을 찍은 시점 (과거일 수 있음)
- `created_at` = 앱에 입력한 시점

3개월 전 사진을 오늘 올릴 수 있다. 타임라인은 `recorded_at` 기준으로 정렬한다.

**`date_source`를 왜 저장하는가** — UI에서 "사진에서 가져왔어요" vs "파일 날짜를 썼어요"를
구분해 보여주기 위해서다. 자동값이 틀렸을 때 사용자가 "앱이 이상하다"가 아니라
"고쳐야겠다"로 반응하게 만드는 장치다.

### photos

```sql
create table photos (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users on delete cascade,
  entry_id     uuid not null references entries on delete cascade,
  storage_path text not null unique,   -- '{user_id}/{plant_id}/{uuid}.webp'
  width        int not null,
  height       int not null,
  bytes        int not null,
  sort_order   smallint not null default 0,
  taken_at     timestamptz,            -- EXIF 원본값 (참고 보관)
  created_at   timestamptz not null default now()
);
create index photos_entry_idx on photos (entry_id, sort_order);
```

`storage_path`의 **첫 세그먼트가 반드시 `user_id`** — Storage RLS가 이걸로 권한을 판단한다.

### ai_analyses

```sql
create table ai_analyses (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users on delete cascade,
  entry_id     uuid not null references entries on delete cascade,
  photo_id     uuid not null references photos on delete cascade,
  status       text not null default 'pending'
               check (status in ('pending','done','failed','skipped')),
  result       jsonb,                  -- 구조화된 진단 결과
  model        text,
  input_tokens  int,
  output_tokens int,
  error        text,
  helpful      boolean,                -- 사용자 피드백 👍/👎
  created_at   timestamptz not null default now(),
  completed_at timestamptz
);
create unique index ai_analyses_photo_uniq on ai_analyses (photo_id);
create index ai_analyses_entry_idx on ai_analyses (entry_id);
```

- `photo_id` **unique** → 사진당 1회. 재분석은 기존 row를 `update`한다 (비용 통제)
- `input_tokens` / `output_tokens` 기록 → 실제 비용 추적 가능
- `helpful` → 나중에 프롬프트 개선 데이터

### ai_usage (쿼터)

```sql
create table ai_usage (
  user_id uuid not null references auth.users on delete cascade,
  day     date not null default current_date,
  count   int  not null default 0,
  primary key (user_id, day)
);
```

Edge Function만 증가시킨다. 클라이언트는 읽기만 가능.

---

## RLS — 전 테이블 예외 없이

```sql
alter table profiles    enable row level security;
alter table plants      enable row level security;
alter table entries     enable row level security;
alter table photos      enable row level security;
alter table ai_analyses enable row level security;
alter table ai_usage    enable row level security;
```

### 기본 패턴

```sql
create policy "own rows" on plants for all
  using      ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
```

**`(select auth.uid())`로 감싸는 이유** — 그냥 `auth.uid()`를 쓰면 행마다 함수가 재평가되어
인덱스를 타지 못한다. `select`로 감싸면 Postgres가 상수로 취급해 초기화 단계에서 한 번만 평가한다.
행이 수천 개가 되면 체감 차이가 크다.

### ai_analyses — 읽기만 허용

```sql
create policy "read own analyses" on ai_analyses for select
  using ((select auth.uid()) = user_id);

create policy "update own feedback" on ai_analyses for update
  using      ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
```

**insert 정책을 만들지 않는다.** → 클라이언트가 AI 결과를 위조할 수 없다.
insert/status 변경은 `service_role`(Edge Function)만 가능하다.

`update`를 허용한 건 `helpful` 피드백 때문인데, 이것만으로는 `result`도 수정 가능해진다.
**컬럼 단위 제한이 필요하면** `helpful`만 업데이트하는 RPC 함수를 따로 만들고
update 정책은 제거하는 게 더 안전하다. (MVP에서는 위조 동기가 없으므로 허용, v1.1에서 RPC로 전환)

### ai_usage — 읽기만

```sql
create policy "read own usage" on ai_usage for select
  using ((select auth.uid()) = user_id);
```

---

## Storage 정책

**버킷**: `plant-photos`, `public = false`
**경로 규칙**: `{user_id}/{plant_id}/{uuid}.webp`

```sql
create policy "upload to own folder" on storage.objects for insert
  with check (
    bucket_id = 'plant-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "read own folder" on storage.objects for select
  using (
    bucket_id = 'plant-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "delete own folder" on storage.objects for delete
  using (
    bucket_id = 'plant-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
```

경로 첫 세그먼트를 `user_id`로 강제하면 **남의 폴더에 업로드하거나 읽는 게 구조적으로 불가능**해진다.

### 이미지 조회 방식

| 용도 | 방식 |
|---|---|
| 썸네일 (그리드, 타임라인) | Supabase Image Transformation (`width=400`) |
| 상세 뷰 | Signed URL, TTL 1시간 |
| 다운로드 / 내보내기 | Signed URL, TTL 5분 |

Signed URL은 TanStack Query로 캐시하되 `staleTime`을 TTL보다 짧게(50분) 둔다.

---

## updated_at 자동 갱신

```sql
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

create trigger plants_updated_at before update on plants
  for each row execute function set_updated_at();
```

---

## 프로필 자동 생성

```sql
create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name',
             new.raw_user_meta_data->>'full_name', ''),
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function handle_new_user();
```

`security definer`에 **`set search_path = ''`를 반드시 붙인다.**
안 붙이면 search_path 조작을 통한 권한 상승 경로가 열린다.

---

## 타입 생성

```bash
npx supabase gen types typescript --linked > src/types/database.ts
```

이 파일은 **직접 수정하지 않는다.** 마이그레이션 후 재생성한다.
`package.json`에 `"types:gen"` 스크립트로 등록되어 있다.
