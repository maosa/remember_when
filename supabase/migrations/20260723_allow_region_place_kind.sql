-- Allow 'region' (admin areas / US states / provinces) as a moment place kind,
-- alongside the existing 'city' and 'country'. Powers tagging a moment to e.g.
-- "Connecticut, United States" (plotted at the region's centroid on the map).
alter table public.moments drop constraint if exists moments_place_kind_check;
alter table public.moments add constraint moments_place_kind_check
  check (place_kind is null or place_kind in ('city', 'country', 'region'));
