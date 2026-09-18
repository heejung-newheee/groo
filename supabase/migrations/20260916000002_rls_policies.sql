-- ════════════════════════════════════════════════════════════
--  RLS 정책
--
--  ⚠️ (select auth.uid()) 형태로 감싸는 것이 중요하다.
--     그냥 auth.uid() 를 쓰면 행마다 함수가 재평가되어 인덱스를 타지 못한다.
--     select 로 감싸면 Postgres 가 상수로 취급해 한 번만 평가한다.
-- ════════════════════════════════════════════════════════════

alter table public.profiles    enable row level security;
alter table public.plants      enable row level security;
alter table public.entries     enable row level security;
alter table public.photos      enable row level security;
alter table public.ai_analyses enable row level security;
alter table public.ai_usage    enable row level security;

-- ── profiles ────────────────────────────────────────────────
create policy "read own profile" on public.profiles
  for select using ((select auth.uid()) = id);

create policy "update own profile" on public.profiles
  for update using ((select auth.uid()) = id)
              with check ((select auth.uid()) = id);

-- ── plants ──────────────────────────────────────────────────
create policy "own plants" on public.plants
  for all using ((select auth.uid()) = user_id)
          with check ((select auth.uid()) = user_id);

-- ── entries ─────────────────────────────────────────────────
create policy "own entries" on public.entries
  for all using ((select auth.uid()) = user_id)
          with check ((select auth.uid()) = user_id);

-- ── photos ──────────────────────────────────────────────────
create policy "own photos" on public.photos
  for all using ((select auth.uid()) = user_id)
          with check ((select auth.uid()) = user_id);

-- ── ai_analyses ─────────────────────────────────────────────
-- ⚠️ INSERT 정책을 만들지 않는다.
--    → 클라이언트가 AI 결과를 위조할 수 없다.
--    insert / status 변경은 service_role(Edge Function)만 가능하다.
create policy "read own analyses" on public.ai_analyses
  for select using ((select auth.uid()) = user_id);

-- helpful 피드백(👍/👎)을 위해 update 만 허용.
-- TODO(v1.1): helpful 만 바꾸는 RPC 로 대체하고 이 정책은 제거한다.
--             현 정책은 result 컬럼까지 수정 가능하다.
create policy "update own feedback" on public.ai_analyses
  for update using ((select auth.uid()) = user_id)
              with check ((select auth.uid()) = user_id);

-- ── ai_usage ────────────────────────────────────────────────
-- 읽기만. 증가는 Edge Function(service_role)만.
create policy "read own usage" on public.ai_usage
  for select using ((select auth.uid()) = user_id);
