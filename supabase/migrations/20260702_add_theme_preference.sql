-- ─────────────────────────────────────────────────────────────────────────────
-- Per-user platform theme (colour palette) preference
--
-- Adds a `theme` column to public.users holding the slug of the user's chosen
-- colour palette. 'default' is the original light theme; the other slugs map to
-- [data-theme="…"] blocks in app/globals.css. The root layout reads this value
-- and sets data-theme on <html> so the palette applies platform-wide.
--
-- Note: 20260628_restrict_user_email_column.sql replaced the table-level SELECT
-- grant on public.users with a column-level grant, so a new column is NOT
-- readable by anon/authenticated until explicitly granted. The account page
-- reads `theme` via the user-scoped (authenticated) client, so we grant SELECT
-- on the new column here. UPDATE remains table-level and is governed by the
-- existing "update own row" RLS policy (same path updateProfile already uses).
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.users
  add column theme text not null default 'default'
  check (theme in (
    'default',
    'ocean-sapphire',
    'amethyst-wisteria',
    'autumn-ruby',
    'royal-gemstone'
  ));

grant select (theme) on public.users to anon, authenticated;
