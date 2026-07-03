-- ── One-off backfill of legal acceptance for pre-existing users ──────────────
-- Records acceptance of the current Terms of Service and Privacy Policy versions
-- for every user that existed before the checkbox-based signup flow shipped.
--
-- Authorized by the operator as acceptance on behalf of every account existing at
-- the time (three at the time of writing: the operator's own account, a test
-- account the operator controls, and one other early user the operator explicitly
-- authorized to include). New signups from this point forward record their own
-- acceptance via the signup flow, so they are not affected here.
--
-- Idempotent: guarded by NOT EXISTS on (user_id, document, version), so re-running
-- inserts nothing for users already recorded at this version. The version strings
-- below are the "Last updated" dates from TERMS_OF_SERVICE.md / PRIVACY_POLICY.md
-- at the time of this migration (kept in sync with lib/legal.ts).

insert into public.legal_acceptances (user_id, document, version, method, accepted_at)
select u.id, 'terms', '2026-07-02', 'retroactive', now()
from public.users u
where not exists (
  select 1 from public.legal_acceptances la
  where la.user_id = u.id and la.document = 'terms' and la.version = '2026-07-02'
);

insert into public.legal_acceptances (user_id, document, version, method, accepted_at)
select u.id, 'privacy', '2026-07-02', 'retroactive', now()
from public.users u
where not exists (
  select 1 from public.legal_acceptances la
  where la.user_id = u.id and la.document = 'privacy' and la.version = '2026-07-02'
);
