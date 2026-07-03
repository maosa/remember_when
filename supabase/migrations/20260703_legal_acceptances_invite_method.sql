-- ── Allow 'invite' as a legal-acceptance method ─────────────────────────────
-- Invited users complete their account via /auth/complete-profile (not the
-- normal signup form), so their Terms/Privacy acceptance is recorded there with
-- method = 'invite' to keep the audit trail distinct from 'signup' and the
-- one-off 'retroactive' backfill. Widen the CHECK constraint accordingly.

alter table public.legal_acceptances
  drop constraint if exists legal_acceptances_method_check,
  add constraint legal_acceptances_method_check
    check (method in ('signup', 'retroactive', 'invite'));
