-- ════════════════════════════════════════════════════════════
--  커뮤니티: 게시물 · 사진 · 댓글 · 좋아요 · 신고
--
--  로그인한 사용자끼리만 본다 (anon 은 정책이 없어 전부 막힌다).
--  관리자 화면은 아직 없다 — 신고 처리는 Supabase 대시보드에서 한다.
--  신고가 쌓이면 트리거가 hidden_at 을 채워 자동으로 숨긴다.
-- ════════════════════════════════════════════════════════════

-- ── profiles: 다른 사람 프로필 읽기 ─────────────────────────
-- 작성자 이름·아바타를 보여주려면 필요하다.
-- 같이 보이는 timezone·theme 은 민감하지 않다고 판단했다.
create policy "read profiles" on public.profiles
  for select to authenticated using (true);

-- ── posts ───────────────────────────────────────────────────
create table public.posts (
  id               uuid primary key default gen_random_uuid(),
  -- profiles 를 가리켜야 PostgREST 가 작성자를 embed 할 수 있다
  user_id          uuid not null references public.profiles on delete cascade,
  kind             text not null check (kind in ('show', 'question')),
  body             text not null check (length(trim(body)) between 1 and 2000),
  -- 태그한 식물. plants 는 본인만 읽을 수 있어 올릴 때의 값을 복사해 둔다.
  plant_id         uuid references public.plants on delete set null,
  plant_nickname   text check (length(plant_nickname) <= 40),
  plant_species    text check (length(plant_species) <= 60),
  plant_adopted_at date,
  -- 신고 누적으로 숨겨진 시각. 작성자에게만 보인다.
  hidden_at        timestamptz,
  created_at       timestamptz not null default now()
);
create index posts_time_idx      on public.posts (created_at desc);
create index posts_kind_time_idx on public.posts (kind, created_at desc);
create index posts_user_time_idx on public.posts (user_id, created_at desc);

-- ── post_photos ─────────────────────────────────────────────
create table public.post_photos (
  id           uuid primary key default gen_random_uuid(),
  post_id      uuid not null references public.posts on delete cascade,
  -- 형식: {user_id}/posts/{uuid}.webp — 일지 사진과 같은 버킷, 별도 폴더.
  -- 일지에서 가져온 사진도 복사해 둔다. 일지를 지워도 게시물이 깨지지 않게.
  storage_path text not null unique,
  width        int not null,
  height       int not null,
  sort_order   smallint not null default 0
);
create index post_photos_post_idx on public.post_photos (post_id, sort_order);

-- ── comments ────────────────────────────────────────────────
create table public.comments (
  id         uuid primary key default gen_random_uuid(),
  post_id    uuid not null references public.posts on delete cascade,
  user_id    uuid not null references public.profiles on delete cascade,
  body       text not null check (length(trim(body)) between 1 and 1000),
  hidden_at  timestamptz,
  created_at timestamptz not null default now()
);
create index comments_post_time_idx on public.comments (post_id, created_at);

-- ── likes ───────────────────────────────────────────────────
create table public.likes (
  post_id    uuid not null references public.posts on delete cascade,
  user_id    uuid not null references public.profiles on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

-- ── reports ─────────────────────────────────────────────────
create table public.reports (
  id          uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles on delete cascade,
  -- 둘 중 정확히 하나. FK 로 두어야 대상이 지워질 때 신고도 같이 정리된다.
  post_id     uuid references public.posts on delete cascade,
  comment_id  uuid references public.comments on delete cascade,
  reason      text not null check (reason in ('spam', 'abuse', 'inappropriate', 'other')),
  created_at  timestamptz not null default now(),
  check (num_nonnulls(post_id, comment_id) = 1)
);
-- 한 사람이 같은 대상을 여러 번 신고해 자동 숨김을 혼자 일으키지 못하게
create unique index reports_post_uniq    on public.reports (reporter_id, post_id);
create unique index reports_comment_uniq on public.reports (reporter_id, comment_id);
create index reports_post_idx    on public.reports (post_id);
create index reports_comment_idx on public.reports (comment_id);

-- ════════════════════════════════════════════════════════════
--  자동 숨김: 서로 다른 3명이 신고하면 숨긴다
--  security definer — 신고자는 남의 글을 update 할 권한이 없다.
-- ════════════════════════════════════════════════════════════

create or replace function public.hide_reported()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  threshold constant int := 3;
begin
  if new.post_id is not null then
    if (select count(*) from public.reports where post_id = new.post_id) >= threshold then
      update public.posts set hidden_at = now()
      where id = new.post_id and hidden_at is null;
    end if;
  else
    if (select count(*) from public.reports where comment_id = new.comment_id) >= threshold then
      update public.comments set hidden_at = now()
      where id = new.comment_id and hidden_at is null;
    end if;
  end if;
  return new;
end;
$$;

create trigger reports_hide
  after insert on public.reports
  for each row execute function public.hide_reported();

-- ════════════════════════════════════════════════════════════
--  RLS
-- ════════════════════════════════════════════════════════════

alter table public.posts       enable row level security;
alter table public.post_photos enable row level security;
alter table public.comments    enable row level security;
alter table public.likes       enable row level security;
alter table public.reports     enable row level security;

-- ── posts ───────────────────────────────────────────────────
-- ⚠️ UPDATE 정책을 만들지 않는다. 있으면 작성자가 hidden_at 을 지워 숨김을 풀 수 있다.
create policy "read visible posts" on public.posts
  for select to authenticated
  using (hidden_at is null or (select auth.uid()) = user_id);

create policy "create own posts" on public.posts
  for insert to authenticated
  with check ((select auth.uid()) = user_id and hidden_at is null);

create policy "delete own posts" on public.posts
  for delete to authenticated
  using ((select auth.uid()) = user_id);

-- ── post_photos ─────────────────────────────────────────────
-- 서브쿼리에도 posts 의 RLS 가 걸린다 → 숨긴 글의 사진은 자연히 안 보인다.
create policy "read photos of visible posts" on public.post_photos
  for select to authenticated
  using (exists (select 1 from public.posts p where p.id = post_id));

create policy "add photos to own posts" on public.post_photos
  for insert to authenticated
  with check (
    exists (select 1 from public.posts p
            where p.id = post_id and p.user_id = (select auth.uid()))
    and storage_path like (select auth.uid())::text || '/posts/%'
  );

-- ── comments ────────────────────────────────────────────────
create policy "read visible comments" on public.comments
  for select to authenticated
  using (
    (hidden_at is null or (select auth.uid()) = user_id)
    and exists (select 1 from public.posts p where p.id = post_id)
  );

create policy "create own comments" on public.comments
  for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and hidden_at is null
    and exists (select 1 from public.posts p where p.id = post_id and p.hidden_at is null)
  );

create policy "delete own comments" on public.comments
  for delete to authenticated
  using ((select auth.uid()) = user_id);

-- ── likes ───────────────────────────────────────────────────
create policy "read likes" on public.likes
  for select to authenticated using (true);

create policy "like as self" on public.likes
  for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and exists (select 1 from public.posts p where p.id = post_id)
  );

create policy "unlike as self" on public.likes
  for delete to authenticated
  using ((select auth.uid()) = user_id);

-- ── reports ─────────────────────────────────────────────────
-- 쓰기만. 읽기 정책이 없어 누가 신고했는지 클라이언트는 알 수 없다.
create policy "report as self" on public.reports
  for insert to authenticated
  with check ((select auth.uid()) = reporter_id);

-- ════════════════════════════════════════════════════════════
--  Storage: 게시물 사진은 로그인한 누구나 읽는다
--  기존 "read own folder" 와 OR 로 합쳐진다. 썸네일은 원본 경로로 바꿔 찾는다.
-- ════════════════════════════════════════════════════════════

create policy "read community photos" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'plant-photos'
    and (storage.foldername(name))[2] = 'posts'
    and exists (
      select 1 from public.post_photos pp
      where pp.storage_path = replace(name, '.thumb.webp', '.webp')
    )
  );
