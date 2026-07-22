-- Structured place data for a moment's location, powering the world map view.
--
-- `location` (text) is kept as the human-readable display label ("Barcelona,
-- Spain" or just "Spain"). These columns add the structured, mappable data:
--   place_kind         'city' | 'country' (null = no structured place / legacy)
--   place_country_code ISO-3166 alpha-2, uppercase (e.g. 'ES')
--   place_lat/place_lng WGS84 coordinates. For a city these are the city's
--                       coordinates; for a country-only moment they are the
--                       country's capital coordinates (map groups it at the
--                       capital while the label stays the country name).
-- All nullable: location remains optional; existing rows are unchanged.
alter table public.moments
  add column if not exists place_kind text
    check (place_kind is null or place_kind in ('city', 'country')),
  add column if not exists place_country_code text
    check (place_country_code is null or place_country_code ~ '^[A-Z]{2}$'),
  add column if not exists place_lat double precision
    check (place_lat is null or place_lat between -90 and 90),
  add column if not exists place_lng double precision
    check (place_lng is null or place_lng between -180 and 180);
