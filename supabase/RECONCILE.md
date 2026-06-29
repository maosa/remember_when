# Migration reconciliation — outcome

**Goal:** repo migrations should reproduce production and be runnable from scratch.

Background: prod was built from an untracked `initial_schema` (+ out-of-band SQL
editor changes), so the live migration-history table never matched the repo files.
See memory `project-migration-tracking-drift`.

## Approach taken: keep the incremental set (no Docker)

`supabase db pull` needs Docker (local shadow DB) and `db dump` was unreliable here,
so reconciliation was done server-side via the Supabase MCP connection (read-only
introspection + verification). We kept the readable incremental migration set rather
than squashing to one hand-built file.

## Steps completed
1. Supabase CLI added as devDependency; `supabase/config.toml` scaffolded.
2. CLI linked to prod (`xkwpceckuqksycbhgvna`).
3. Remote migration-history table reverted/cleared (bookkeeping only — schema and
   the security fixes verified untouched).
4. Migration files kept in `supabase/migrations/` (the 18-file incremental set;
   `20260318_phase1_2_baseline.sql` backfills the previously-untracked
   `initial_schema`, so the set is now runnable from scratch).

## Verification vs live DB (via MCP)
Structure matches prod exactly:
- 13 public tables, 7 functions, 2 triggers, 3 storage buckets — all declared by the set.
- RLS enabled on all tables; security grants (transfer_moment_ownership lockdown,
  users.email column revoke) present.

**Finding — duplicate RLS policies in prod (NOT reproduced by the repo, by design):**
Prod carries TWO overlapping generations of RLS policies: the repo's `phase3-9` set
PLUS a legacy set from `initial_schema` with different names (e.g. `moments` has both
"Owner or accepted editor can update moment" *and* "Editors can update moments").
Prod has ~56 public policies; the repo declares roughly half. A fresh deploy from the
repo produces the CLEAN single generation — functionally equivalent (the app mostly
uses the service-role admin client, which bypasses RLS), just without the redundant
duplicates. None of the duplicates are flagrantly over-permissive (no `USING (true)`
write policies remain — confirmed via the security advisor).

## Recommended follow-up (separate, careful task)
Drop the ~28 legacy duplicate policies from prod so prod matches the repo's clean
set. Requires per-policy verification that the repo counterpart covers the same
access before dropping. Not done inline (prod-mutating, deserves its own focused pass).

## Migration tracking note
The remote history table is currently empty. The repo files use 8-digit date
prefixes (e.g. `20260319_…`) which are not unique per the Supabase CLI's version
rules (several share a date), so the set is applied in filename order (dashboard /
manual), not via `supabase db push`. Adopting the CLI push/pull workflow later would
require renaming files to unique 14-digit timestamps + repopulating the history table
(and `db pull`/`reset` need Docker).
