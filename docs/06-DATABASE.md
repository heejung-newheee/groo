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

profiles ─1:N─ posts ──1:N── post_photos
                 ├──1:N── comments
                 ├──1:N── likes    (post_id + user_id 복합키)
                 └──1:N── reports  (post 또는 comment 중 하나)
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
  calendar_color text check (calendar_color ~ '^#[0-9a-f]{6}$'),  -- null 이면 기본 초록
  sort_order     integer,       -- 사용자가 정한 순서. null 이면 맨 앞(최신순)
  archived_at    timestamptz,   -- soft delete
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index plants_user_active_idx on plants (user_id, archived_at nulls first);
```

- `watering_interval_days`가 `null`이면 알림 없음 (선인장 등)
- 다음 물주기 = `last_watered_at + watering_interval_days` (물 준 날은 세지 않는다. 1일에 주고 주기 4면 5일).
  `last_watered_at`은 **로컬(한국) 날짜**로 저장한다. `recorded_at`(UTC ISO)을 `slice(0, 10)` 하면 오전 0~9시 기록이 전날이 된다.
- `calendar_color`: 캘린더 일지 점 색. 아무 색이나 고를 수 있고, 새 식물은 팔레트(`PLANT_COLORS`)에서 순서대로 기본값을 준다. 물주기가 파랑이라 팔레트에서 파랑 계열은 뺐다.
- `sort_order`: 내 식물 순서 편집. 목록은 `sort_order asc nulls first, created_at desc` — 순서를 안 정한 새 식물이 맨 앞에 온다.
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

### 커뮤니티 (posts · post_photos · comments · likes · reports)

전체 SQL은 `20261002000001_community.sql`. 설계 의도만 적는다.

- **작성자 FK는 `profiles`를 가리킨다** (`auth.users` 아님) — PostgREST가 `author:profiles(...)` 로 embed 하려면 필요하다
- **식물 태그는 값을 복사한다** (`plant_nickname`, `plant_species`, `plant_adopted_at`).
  `plants` 는 본인만 읽을 수 있어 다른 사람에게 보여줄 수 없다. `plant_id` 는 `on delete set null`
- **사진은 같은 버킷의 `{user_id}/posts/{uuid}.webp`**. 일지에서 가져온 사진도 파일을 복사한다
- **`reports` 는 `post_id` / `comment_id` 중 정확히 하나** (`num_nonnulls = 1`). FK라 대상이 지워지면 같이 지워진다.
  `(reporter_id, 대상)` unique — 한 사람이 혼자 자동 숨김을 일으키지 못하게
- **자동 숨김**: `reports` insert 트리거(`hide_reported`, security definer)가 신고 3건이면 `hidden_at` 을 채운다
- 좋아요·댓글 수는 컬럼으로 두지 않고 embed count(`likes(count)`)로 센다. 느려지면 그때 카운터 컬럼

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

### 커뮤니티 — 로그인한 사용자끼리만

모든 정책이 `to authenticated` 다. anon 은 아무것도 못 본다.

| 테이블 | select | insert | delete | update |
|---|---|---|---|---|
| `profiles` | **로그인한 누구나** (작성자 이름·아바타) | — | — | 본인 |
| `posts` | 숨김 아닌 글 + 내 글 | 본인, `hidden_at` null | 본인 | **없음** |
| `post_photos` | 볼 수 있는 글의 사진 | 내 글 + 경로가 `{내 id}/posts/` | (글 삭제 cascade) | 없음 |
| `comments` | 숨김 아닌 댓글 + 내 댓글 (볼 수 있는 글에 한해) | 본인, 숨김 아닌 글에만 | 본인 | 없음 |
| `likes` | 누구나 | 본인 | 본인 | 없음 |
| `reports` | **없음** (누가 신고했는지 비공개) | 본인 | — | 없음 |

- **posts 에 update 정책을 만들지 않는다** — 있으면 작성자가 `hidden_at` 을 지워 숨김을 풀 수 있다
- `profiles` 를 열면서 `timezone`·`theme` 도 같이 보인다. 민감하지 않다고 판단했다.
  공개용 view 는 RLS 를 우회하는 security definer view 가 되어 Advisor 경고가 나므로 쓰지 않았다
- 서브쿼리(`exists (select 1 from posts ...)`)에도 posts 의 RLS가 걸린다 → 숨긴 글의 사진·댓글은 자연히 안 보인다

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

**예외 — 커뮤니티 사진**: `{user_id}/posts/` 아래 파일은 볼 수 있는 `post_photos` 에 등록된 경우에만 로그인한 누구나 읽는다.
썸네일(`.thumb.webp`)은 원본 경로로 바꿔 찾는다.

```sql
create policy "read community photos" on storage.objects for select to authenticated
  using (
    bucket_id = 'plant-photos'
    and (storage.foldername(name))[2] = 'posts'
    and exists (select 1 from public.post_photos pp
                where pp.storage_path = replace(name, '.thumb.webp', '.webp'))
  );
```

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
