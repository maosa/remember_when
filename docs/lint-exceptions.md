# Lint exceptions registry

Every `eslint-disable` directive in `app/` and `lib/` is listed here with **why
it's safe, the observable symptom if it ever regresses, and the fix**. Keep this
file in sync — a lint exception with no entry here is a loose end.

Regenerate the source list any time with:

```bash
grep -rn "eslint-disable" app lib
```

## Safety nets (why these can't silently become bugs)

- **No stale disables.** `eslint.config.mjs` sets
  `linterOptions.reportUnusedDisableDirectives: "error"`, so the moment a disabled
  line stops triggering its rule (e.g. the code is refactored), the now-unnecessary
  directive becomes a **hard lint error** — forcing removal and a fresh look.
- **Narrow scope.** Every directive is `eslint-disable-next-line <one-rule>`, so any
  *other* rule violation on the same line still fails normally. A disable never
  creates a blanket blind spot.
- **Enforced on every push.** `npm run verify` (lint + typecheck + test) runs in the
  husky `pre-push` hook and in `.github/workflows/ci.yml`, so a new violation can't
  land unnoticed.
- **Runtime capture.** For the *throwing* failure modes below (notably hydration
  mismatches), Sentry is enabled in prod/preview with source maps + 100%-on-error
  session replay — a failure traces straight to the file:line, with a replay of what
  the user did. Non-throwing modes (extra renders, a cosmetic transition) don't reach
  Sentry and rely on this registry + review.

## `react-hooks/set-state-in-effect`

These effects genuinely synchronize with an async/external source; the flagged
`setState` is a guard-clause reset or a client-only mount value.

| File | Why it's safe | Symptom if it regresses | Fix |
|------|---------------|-------------------------|-----|
| `app/(app)/account/_components/profile-form.tsx:57` | Debounced username-availability check; resets status to `idle` when the input matches the current username. | Extra re-render / stale availability status (perf/cosmetic). | Keep the reset in the effect; it pairs with a cancellable async lookup. |
| `app/(app)/friends/_components/friends-manager.tsx:327` | Debounced user search; clears results when the query is too short. | Stale/leftover search results (cosmetic). | Keep the reset in the effect. |
| `app/(app)/home/_components/people-invite-input.tsx:44` | Debounced invite search; clears results when the query is too short. | Stale results in the People picker (cosmetic). | Keep the reset in the effect. |
| `components/ui/location-combobox.tsx:70` | Debounced city/country search; clears results when the query is too short. | Stale place results left in the location picker (cosmetic). | Keep the reset in the effect. |
| `app/(app)/moments/[id]/_components/invite-member-dialog.tsx:59` | Debounced lookup; resets status/display when the input is cleared. | Stale lookup status (cosmetic). | Keep the reset in the effect. |
| `app/(app)/moments/[id]/_components/invite-link-panel.tsx:53` | Reads `window.location.origin` after mount (unavailable during SSR) to build the invite URL. | If "fixed" into render → **hydration mismatch** (React error → **Sentry-visible**). | Keep the read in the mount effect. |
| `app/page.tsx:81` | Picks a random starting hero quote client-side (mount effect). Initial state is deterministic so SSR and first client render match. | If moved into render/`useState` initializer → **hydration mismatch** (Sentry-visible). | Keep the random pick in the mount effect. |

## `react-hooks/refs`

| File | Why it's safe | Symptom if it regresses | Fix |
|------|---------------|-------------------------|-----|
| `app/(app)/moments/[id]/_components/media-viewer.tsx:400` | Reads `isTouchRef.current` during render for the controls-fade transition. Every touch also calls `setControlsVisible`, so the read is always paired with a re-render. | Wrong/absent controls-fade transition on the first touch (cosmetic). | If it ever matters visually, promote `isTouchRef` to state. |

## `@next/next/no-img-element` (grouped)

The app renders media with plain `<img>` (not `next/image`) because sources are
**per-request signed Supabase Storage URLs** with short-lived tokens, which the
Next image optimizer doesn't fit (and image transformation is disabled on this
tenant — see `docs`/memory). This is a convention rule, not correctness: no runtime
failure mode. If we later move to `next/image`, remove these directives.

Locations: `media-viewer.tsx:254`, `moment-card.tsx:102`,
`cover-photo-section.tsx:158,217`, `moment-header.tsx:222`,
`edit-post-dialog.tsx:237,262`, `post-card.tsx:74,102,118,127,145`,
`create-post-dialog.tsx:235`, `moments-map.tsx` (map cluster panel thumbnail).

## `@typescript-eslint/no-explicit-any`

| File | Why it's safe | Fix |
|------|---------------|-----|
| `app/(app)/moments/[id]/actions.ts:534` | An internal helper takes the Supabase admin client typed as `any` to avoid threading the full generated client generics. Server-only, not user-facing. | Type the param as the admin client's return type if the generics are ever pinned down. |
