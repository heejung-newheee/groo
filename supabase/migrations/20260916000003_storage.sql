-- ════════════════════════════════════════════════════════════
--  Storage: plant-photos 버킷
--
--  경로 규칙: {user_id}/{plant_id}/{uuid}.webp
--  첫 세그먼트를 user_id 로 강제하면 남의 폴더 접근이
--  구조적으로 불가능해진다.
-- ════════════════════════════════════════════════════════════

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'plant-photos',
  'plant-photos',
  false,                                        -- ⚠️ public 이면 URL 만 알면 누구나 접근
  10485760,                                     -- 10MB
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;

create policy "upload to own folder" on storage.objects
  for insert with check (
    bucket_id = 'plant-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "read own folder" on storage.objects
  for select using (
    bucket_id = 'plant-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "update own folder" on storage.objects
  for update using (
    bucket_id = 'plant-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "delete own folder" on storage.objects
  for delete using (
    bucket_id = 'plant-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
