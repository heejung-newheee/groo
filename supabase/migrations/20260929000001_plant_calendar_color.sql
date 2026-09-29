-- 캘린더에서 식물을 구분하는 색. null 이면 앱이 기본 초록으로 그린다.
alter table public.plants
  add column calendar_color text check (calendar_color ~ '^#[0-9a-f]{6}$');

-- 기존 식물은 등록 순서대로 팔레트에서 서로 다른 색을 나눠준다 (src/lib/constants.ts 의 PLANT_COLORS 와 같은 순서)
with palette as (
  select array['#4a8b5c', '#e0a526', '#e07a3c', '#d9534f', '#e8a0bf', '#8e6cc4', '#2a9d8f', '#9bbf3a'] as colors
),
ordered as (
  select id, row_number() over (partition by user_id order by created_at) - 1 as n
  from public.plants
)
update public.plants p
set calendar_color = palette.colors[(ordered.n % 8) + 1]
from ordered, palette
where p.id = ordered.id and p.calendar_color is null;
