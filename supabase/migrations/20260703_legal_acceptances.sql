-- ── Legal acceptance tracking (Terms of Service & Privacy Policy) ────────────
-- Version-tracked record of each user's acceptance of the Terms of Service and
-- Privacy Policy. The `version` string is the "Last updated" date from the top
-- of the corresponding markdown document (e.g. '2026-07-02'); the two documents
-- are versioned independently. A user may accumulate multiple rows per document
-- over time (one per version they accept), so there is intentionally no unique
-- constraint on (user_id, document).
--
-- Writes go through the service-role/admin client from server code (see
-- lib/legal-acceptance.ts) — same pattern as audit_logs, so there is no
-- user-facing INSERT policy, only a SELECT-own policy.
--
-- FUTURE WORK (not built here — schema already supports it):
--   * Re-acceptance flow: when TERMS_VERSION / PRIVACY_VERSION change, prompt
--     users whose latest accepted version for that document != the current
--     constant to re-accept (compare max(version) per (user_id, document)).
--   * Admin UI for browsing acceptance records.

create table if not exists public.legal_acceptances (
  id          uuid        primary key default gen_random_uuid(),
  user_id     uuid        not null references public.users(id) on delete cascade,
  document    text        not null check (document in ('terms', 'privacy')),
  version     text        not null,   -- the "Last updated" date string from that document
  accepted_at timestamptz not null default now(),
  method      text        not null default 'signup' check (method in ('signup', 'retroactive'))
);

-- Fast "what versions has this user accepted for this document" lookups.
create index if not exists legal_acceptances_user_document_idx
  on public.legal_acceptances (user_id, document);

alter table public.legal_acceptances enable row level security;

-- Users may read only their own acceptance records. There is deliberately NO
-- user-facing INSERT policy — writes go through the service-role/admin client.
drop policy if exists "Users can view own legal acceptances" on public.legal_acceptances;
create policy "Users can view own legal acceptances"
  on public.legal_acceptances for select
  using (user_id = auth.uid());
