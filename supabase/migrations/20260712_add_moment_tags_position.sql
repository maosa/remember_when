-- Explicit ordering for a moment's tags.
--
-- Tags render in a row at the top of a moment page. Editors can now drag to
-- reorder them, so we need a stable, persisted order instead of relying on
-- insertion/PK order. `position` is a 0-based index within a moment; the tag
-- row is rendered `order by position asc`, and new tags are appended at the end.
alter table public.moment_tags
  add column if not exists position int not null default 0;

-- Backfill existing rows so current display order is preserved as 0..n-1 per
-- moment, ordered by creation time (ties broken by id for determinism).
with ranked as (
  select id,
         row_number() over (partition by moment_id order by created_at, id) - 1 as pos
  from public.moment_tags
)
update public.moment_tags mt
set position = ranked.pos
from ranked
where ranked.id = mt.id;
