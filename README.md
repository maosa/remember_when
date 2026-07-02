# Remember When

**A shared memory book. Calm, intimate, unhurried.**

Built for the people who were there — readable by future people through their eyes.

Remember When is a place to capture and revisit meaningful moments with the people who shared them. No likes, no follower counts, no public feed. Just your memories, told in your own words, with the people who were there.

🔗 **[rmbrwhen.vercel.app](https://rmbrwhen.vercel.app/)**

---

## What it does

- **Moments** — a name, a flexible date (year only / month + year / full date), an optional location and tags, and a cover photo. Moments are private by default and never public.
- **Roles** — every moment has an **owner**, and any number of **editors** (can post, edit moment details, invite/remove readers) and **readers** (view-only). See `product_spec.docx` §2.6 for the full permission matrix.
- **Posts** — narrative text plus photos, videos, and voice recordings, sortable and filterable within a moment.
- **Invites** — by username, by email (with a sign-up flow for people who don't have an account yet), or via a shareable, expiring reader link.
- **Friends** — a lightweight social layer used for discovery; being friends does not by itself grant access to someone's moments.
- **Notifications** — per-type toggles plus a configurable reminder cadence (weekly / bi-weekly / monthly / never).
- **Theming** — five preset colour palettes, switchable per user from the Account page.
- **Account deletion** — permanently deletes the account and every post the user authored. If the user owns a moment shared with anyone else, deletion is blocked until they transfer ownership or delete that moment — this prevents one person's account deletion from destroying content that belongs to other people.
- **Pricing** — a free tier (live) and a placeholder paid tier, UI only, no billing yet.

The full functional spec, data model, and build history live in [`product_spec.docx`](./product_spec.docx).

## Legal

- [Terms of Service](./TERMS_OF_SERVICE.md)
- [Privacy Policy](./PRIVACY_POLICY.md)

Both are rendered as public pages at `/terms` and `/privacy` (server-rendered from the markdown files above, themed per user) and pending full legal review. Sign-up requires accepting both via a checkbox; the accepted version and timestamp are recorded per user (`terms_version` / `terms_accepted_at` / `privacy_version` / `privacy_accepted_at` columns on `public.users`) so material changes can trigger re-acceptance per Terms §11 — see `supabase/migrations/20260702_add_terms_acceptance.sql`. Existing accounts are left null until their next acceptance (not backfilled).

## Tech stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16.2 (App Router) |
| Language | TypeScript 5 |
| UI | React 19, shadcn/ui, Tailwind CSS 4, Base UI |
| Animations | GSAP 3 (ScrollTrigger), Three.js |
| Database, Auth, Storage | Supabase (Postgres) |
| Rate limiting / caching | Upstash Redis (falls back to in-memory if unavailable) |
| Error & performance monitoring | Sentry (incl. session replay, default masking on) |
| Deployment | Vercel (EU region — `dub1`), including Vercel Cron for the daily reminder job |
| Testing | Vitest |

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the app locally.

### Environment variables

Copy `.env.local` (not committed) and fill in:

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=

NEXT_PUBLIC_SENTRY_DSN=
SENTRY_AUTH_TOKEN=
SENTRY_ORG=
SENTRY_PROJECT=

TEST_ACCOUNT_EMAIL=
TEST_ACCOUNT_PASSWORD=
```

Redis and Sentry vars are optional locally (both degrade gracefully — rate limiting falls back to in-memory, and Sentry simply won't report). Supabase vars are required.

### Other scripts

```bash
npm run lint        # ESLint
npm run test         # Vitest, single run
npm run test:watch   # Vitest, watch mode
npm run build        # production build
npm run gen:types    # regenerate types/database.types.ts from the live Supabase schema
```

## Project structure

- `app/` — Next.js App Router pages, layouts, and server actions, grouped by route group: `(app)` (authenticated app shell — home, moments, account, settings, friends, notifications), `(auth)` (sign-up/login/password reset), plus top-level marketing routes (`/`, `/pricing`, `/terms`, `/privacy`) and `/auth/*` callback handlers
- `components/` — shared UI (shadcn/ui-based primitives in `components/ui/`, plus app-level components like navigation and legal-doc rendering)
- `lib/` — Supabase client setup, validation, upload/storage helpers, rate limiting, caching, audit logging, notification dispatch, and legal-document version constants
- `supabase/migrations/` — the full, idempotent, incremental schema history (safe to re-run; see `supabase/RECONCILE.md` for how this reflects production)
- `types/database.types.ts` — generated Supabase types (run `npm run gen:types` after schema changes)
- `design-system/` — static HTML reference screens and design brief used during development

## Deployment

Builds are pushed to Vercel from GitHub. The reminder notification job runs as a Vercel Cron (`/api/cron/reminders`, daily at 09:00 UTC — see `vercel.json`).
