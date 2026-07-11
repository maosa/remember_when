-- Vertical focal point for a moment's cover photo.
--
-- The cover is rendered with `object-cover` at full width, so a tall image is
-- cropped top/bottom. `cover_position` is the vertical focal percentage applied
-- as CSS `object-position: 50% <cover_position>%` on the hero and home card.
--   0   = align to the top of the image
--   100 = align to the bottom
--   null / 50 = center (the object-cover default; existing rows are unchanged)
alter table public.moments
  add column if not exists cover_position smallint
    check (cover_position is null or cover_position between 0 and 100);
