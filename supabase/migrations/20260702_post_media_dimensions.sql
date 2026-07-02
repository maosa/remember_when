-- Store intrinsic pixel dimensions of photo/video media so the feed can reserve
-- each item's exact aspect ratio before the image loads — eliminating layout
-- shift (CLS) while showing photos at their natural ratio (no forced crop).
-- Nullable: existing rows are backfilled lazily on first view; audio has no dims.
alter table public.post_media
  add column if not exists width  integer check (width  is null or width  > 0),
  add column if not exists height integer check (height is null or height > 0);
