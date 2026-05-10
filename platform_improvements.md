# Platform Improvements — Remember When

This file is a living implementation guide. Each item is fully self-contained: an AI agent reading any single item should have everything it needs to implement it without additional context.

Items are grouped by **Tier** (1 = quick win, 2 = medium effort, 3 = larger effort) and ordered by impact within each tier. Implement them in any order or one at a time. Mark each item `[x]` when complete.

---

## Tier 1 — Quick Wins (< 30 min each)

### [x] T1-01 · SECURITY · Fix PostgREST filter injection in `fetchHomeMoments`

**File:** `app/(app)/home/actions.ts`

**Problem:** Around the line that calls `.or(...)`, `memberMomentIds` is joined directly into a raw PostgREST filter string via string interpolation (`.or(`owner_id.eq.${user.id},id.in.(${memberMomentIds.join(',')})`)"`). Any special character in a UUID or a future code change could enable filter bypass and unauthorized data access.

**Fix:** Replace the single interpolated `.or(...)` call with two separate, typed calls:
1. A `.or(`owner_id.eq.${user.id}`)` for the owner condition.
2. A separate `.in('id', memberMomentIds)` chained only when `memberMomentIds.length > 0`.

This uses the Supabase client's type-safe parameterization instead of raw string building.

**Verification:** Search the file for the old `.or(` call and confirm it no longer contains `memberMomentIds.join`. Run `tsc --noEmit`. Load the home page and confirm moments still appear correctly.

---

### [x] T1-02 · SECURITY · Sanitize user input in `searchUsers` to prevent filter injection

**File:** `app/(app)/friends/actions.ts`

**Problem:** The `searchUsers` server action takes a user-supplied search string `q` and interpolates it directly into a PostgREST `.or(...)` filter: `.or(`first_name.ilike.%${q}%,last_name.ilike.%${q}%,username.ilike.%${q}%`)`. A crafted input like `test,status.eq.accepted` can break filter semantics and potentially return data the user should not see.

**Fix:** Before running the query, validate that `q` contains only safe characters. Add a check at the top of the function:
```typescript
if (!/^[\w\s]{1,50}$/.test(q)) return { users: [], friendships: [] }
```
This allows letters, numbers, underscores, and spaces up to 50 chars. Reject anything else immediately (return empty results, do not query the DB).

**Verification:** Pass the string `test,status.eq.accepted` as a search query via a test and confirm it returns empty results. Normal searches for names still work.

---

### [x] T1-03 · SECURITY · Fix email enumeration in `/api/check-availability`

**File:** `app/api/check-availability/route.ts`

**Problem:** This API route calls `admin.auth.admin.listUsers({ perPage: 1000 })` to check whether an email is taken. This loads up to 1000 users from the auth system on every request with zero rate limiting, allowing an attacker to enumerate every registered email address.

**Fix:**
1. Replace the `listUsers` call with a targeted query: `admin.from('users').select('id').eq('email', email.toLowerCase()).maybeSingle()`. This checks only for the specific email without loading other users.
2. Add basic IP-based rate limiting: read the `x-forwarded-for` header and reject requests that exceed (e.g.) 10 calls per minute per IP. A simple in-memory Map with timestamps works for a serverless edge approach, or use Vercel's `@vercel/kv` if available.

**Verification:** Call the endpoint 15 times in quick succession from the same IP and confirm the 11th+ call is rejected with 429. A single valid check still returns the correct result.

---

### [x] T1-04 · SECURITY · Validate invite token format before querying

**File:** `app/(app)/invite/[token]/page.tsx`

**Problem:** The `token` URL parameter is used directly in a Supabase `.eq('token', token)` query without any format validation. Any string — including malformed inputs — hits the database.

**Fix:** At the top of the page's data-fetching logic, validate that `token` is a valid UUID before querying:
```typescript
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
if (!UUID_RE.test(token)) notFound()
```
Call Next.js's `notFound()` immediately for non-UUID values so the DB query never runs.

**Verification:** Visit `/invite/not-a-uuid` and confirm a 404 is returned immediately. A valid UUID invite link still works.

---

### [x] T1-05 · SECURITY · Add runtime role enum validation in `inviteMember`

**File:** `app/(app)/moments/[id]/actions.ts`

**Problem:** The `inviteMember` server action accepts a `role` parameter typed as `'editor' | 'reader'` in TypeScript, but TypeScript types are erased at runtime. A crafted API call can pass any string value. PostgREST will ultimately reject it at the DB layer, but only after an unnecessary round-trip and with a less informative error.

**Fix:** Add a runtime guard at the top of the `inviteMember` function body, before any DB calls:
```typescript
if (!['editor', 'reader'].includes(role)) {
  return { error: 'Invalid role.' }
}
```

**Verification:** Use `curl` or a test to call the action with `role: 'admin'` and confirm it returns `{ error: 'Invalid role.' }` without hitting the DB.

---

### [x] T1-06 · RELIABILITY · Return HTTP 500 when cron notification insert fails

**File:** `app/api/cron/reminders/route.ts`

**Problem:** The cron route inserts reminder notifications into the DB but does not check the result for errors. If the insert fails (DB connection issue, constraint violation, etc.), the route still returns `{ sent: 0 }` with HTTP 200. Vercel Cron sees a 200 and does not retry. Reminders are silently dropped.

**Fix:** Destructure `{ error }` from the insert call. If `error` is truthy, log it (`console.error`) and return a `NextResponse.json({ error: 'Insert failed' }, { status: 500 })`. This causes Vercel Cron to retry the job.

**Verification:** Temporarily point the insert at a non-existent table to force a DB error. Confirm the route returns a 500. Restore the correct table name and confirm successful runs return 200.

---

### [x] T1-07 · RELIABILITY · Isolate notification send from post creation (best-effort)

**File:** `app/(app)/moments/[id]/actions.ts`

**Problem:** After inserting a new post, the action calls `sendNotifications(...)`. If `sendNotifications` throws, the error propagates up and the action returns a failure response — even though the post was already successfully written to the DB. Users see an error but their post was actually created. Notifications are best-effort and should not be able to fail the parent action.

**Fix:** Wrap the `sendNotifications` call in a `try/catch`:
```typescript
try {
  await sendNotifications(...)
} catch (err) {
  console.error('Failed to send post notifications:', err)
}
```
The post creation result is returned to the client regardless of notification status.

**Verification:** Temporarily make `sendNotifications` throw. Confirm the post is created successfully and the action returns success. The error is only in the server logs.

---

### [x] T1-08 · RELIABILITY · Make ownership transfer transactional

**File:** `app/(app)/moments/[id]/actions.ts`

**Problem:** The `transferOwnership` action (or equivalent) performs three sequential mutations:
1. Insert the current owner as an editor member.
2. Delete the new owner from the members table.
3. Update `owner_id` on the moment.

If step 2 or 3 fails after step 1 succeeds, the data is left in an inconsistent state (the old owner is now a duplicate member, or the new owner is deleted but never promoted). There is no rollback.

**Fix:** Move all three mutations into a Supabase database RPC function (a PostgreSQL function called via `admin.rpc('transfer_moment_ownership', { moment_id, new_owner_id })`). The function wraps the three operations in a `BEGIN ... COMMIT` block with `EXCEPTION ... ROLLBACK` handling. Add the migration for this function under `supabase/migrations/`.

**Verification:** Simulate a failure in step 3 (e.g., add a temporary constraint violation). Confirm the DB is in the original state after the failed call (old owner still owns the moment, no orphaned member rows).

---

### [x] T1-09 · PERFORMANCE · Add composite index on `moment_archive(user_id, moment_id)`

**File:** `supabase/migrations/` — add a new migration file, e.g. `20260511_additional_indexes.sql`

**Problem:** `fetchHomeMoments` queries `moment_archive` filtered by `user_id` on every home page load. The existing performance indexes migration (`20260325_performance_indexes.sql`) does not include an index on this table, causing full table scans as the archive grows.

**Fix:** Create a new migration file with:
```sql
create index if not exists moment_archive_user_moment_idx
  on public.moment_archive (user_id, moment_id);
```
Apply via `supabase db push` or through the Supabase dashboard SQL editor.

**Verification:** Run `EXPLAIN ANALYZE select moment_id from moment_archive where user_id = '<some-uuid>'` in the Supabase SQL editor. Confirm the plan shows "Index Scan" on the new index, not "Seq Scan".

---

### [x] T1-10 · PERFORMANCE · Add index on `moment_members(user_id, status)`

**File:** `supabase/migrations/` — add to the same new migration file created in T1-09

**Problem:** Many queries filter `moment_members` by `user_id` and `status` (e.g., the home page fetches all moments a user belongs to). The existing index is on `(moment_id, status)`, which is efficient for moment-centric lookups but not for user-centric lookups. These queries do a sequential scan on large tables.

**Fix:** Add to the migration:
```sql
create index if not exists moment_members_user_status_idx
  on public.moment_members (user_id, status);
```

**Verification:** Run `EXPLAIN ANALYZE select moment_id from moment_members where user_id = '<some-uuid>' and status != 'declined'` in the Supabase SQL editor. Confirm the plan uses the new index.

---

### [x] T1-11 · CODE QUALITY · Fix three disabled `react-hooks/exhaustive-deps` lint rules

**Files:**
- `app/(app)/moments/[id]/_components/posts-feed.tsx` — find the `// eslint-disable-next-line react-hooks/exhaustive-deps` comment near a `useEffect` with an empty `[]` dependency array that calls `registerPostMedia`. The function `registerPostMedia` is missing from deps.
- `app/(app)/home/_components/create-moment-modal.tsx` — find the same comment near the user-search debounce effect; `excludeIds` is used inside but missing from the dependency array.
- `app/(app)/friends/_components/friends-manager.tsx` — find the same pattern; a notification-dismiss callback is likely stale.

**Problem:** Disabled dependency warnings cause stale closure bugs. When the referenced values change, the effects don't re-run, leading to subtle UI bugs (e.g., search results using an outdated exclusion list).

**Fix for each:** Remove the `eslint-disable` comment. Fix the underlying issue by:
1. Adding the missing value to the dependency array, AND
2. Wrapping the callback in `useCallback` (with its own correct deps) in the parent component so it has a stable reference and doesn't cause infinite re-renders.

**Verification:** `npm run lint` passes with no `react-hooks/exhaustive-deps` warnings. Manually test the affected features (gallery viewer, user search in create modal, friends page) to confirm no regressions.

---

### [x] T1-12 · CODE QUALITY · Add `error.tsx` error boundaries to app routes

**Problem:** No `error.tsx` files exist anywhere in the `app/` directory. If a server component throws (e.g., Supabase is down, a query returns an unexpected shape), Next.js shows a full-page crash with no recovery path. Users are stuck.

**Fix:** Create the following files with a minimal error boundary UI that shows a friendly message and a "Try again" button (which calls the `reset` function provided by Next.js):
- `app/(app)/error.tsx` — covers all authenticated app routes
- `app/(app)/home/error.tsx` — specific to home page failures
- `app/(app)/moments/[id]/error.tsx` — specific to moment detail failures

Each file should be a `'use client'` component that receives `({ error, reset }: { error: Error; reset: () => void })` props.

**Verification:** Temporarily throw an error in `app/(app)/home/page.tsx`. Confirm the `error.tsx` UI renders instead of a full crash. The "Try again" button calls `reset()` and re-renders the page.

---

### [x] T1-13 · ACCESSIBILITY · Add descriptive `alt` text to non-decorative images

**Files:**
- `app/(app)/moments/[id]/_components/cover-photo-section.tsx` — cover photo `<img>` has `alt=""`
- `app/(app)/moments/[id]/_components/media-viewer.tsx` — viewer `<img>` has `alt=""`
- `app/(app)/moments/[id]/_components/edit-post-dialog.tsx` — media preview `<img>` elements have `alt=""`
- `app/(app)/moments/[id]/_components/create-post-dialog.tsx` — same

**Problem:** Empty `alt=""` tells screen readers to skip the image entirely. For cover photos, post previews, and viewer images, this means visually impaired users get no information about the content.

**Fix:** Update each `alt` attribute:
- Cover photo: `alt={`${moment.name} cover photo`}` (use the moment name from context/props)
- Media viewer: `alt="Photo"` or `alt={`Photo ${currentIndex + 1} of ${total}`}` 
- Post media previews (in dialogs): `alt="Media preview"` or include the file name if available

**Verification:** Run an automated a11y scanner (e.g., axe DevTools Chrome extension) on pages with images. Confirm no "Images must have alternate text" violations.

---

### [x] T1-14 · ACCESSIBILITY · Link form error messages to inputs via `aria-describedby`

**Files:**
- `app/(app)/_components/edit-moment-modal.tsx` — error `<p>` elements displayed below inputs
- `app/(app)/home/_components/create-moment-modal.tsx` — same

**Problem:** Error messages are displayed visually next to inputs but are not programmatically linked to them. Screen readers reading the input field don't announce the associated error.

**Fix:** For each input that has a conditionally-rendered error message:
1. Add a stable `id` to the error element: `<p id="name-error" ...>{error}</p>`
2. Add `aria-describedby="name-error"` to the corresponding `<input>` or `<select>`
3. Conditionally include the `aria-invalid="true"` attribute on the input when an error is present

**Verification:** Using a screen reader (VoiceOver on Mac: Cmd+F5), navigate to the form field and confirm the error message is read aloud when the field is focused.

---

## Tier 2 — Medium Effort (30 min – 2 hrs each)

### [x] T2-01 · SECURITY · Add explicit ownership check in `updateMomentDetails` and `updateCoverPhoto`

**File:** `app/(app)/moments/[id]/actions.ts`

**Problem:** Both `updateMomentDetails` and `updateCoverPhoto` authenticate the user but do not explicitly verify that the user has permission to edit the moment before mutating. They rely solely on Supabase RLS. If RLS policies are ever misconfigured or disabled (e.g., during a migration), any authenticated user could modify any moment. This violates defense-in-depth.

**Fix:** At the start of each function, after authenticating the user, add an explicit permission check — the same pattern already used in the `updateMoment` function elsewhere in the same file. Look at how `updateMoment` fetches the moment and checks `owner_id` or editor membership, then replicate that exact guard in `updateMomentDetails` and `updateCoverPhoto`. If the check fails, return `{ error: 'Not authorized.' }` immediately before any DB mutation or file upload.

**Verification:** While authenticated as User A, call `updateMomentDetails` with a `momentId` belonging to User B (who has not added User A as a member). Confirm the action returns an authorization error without modifying the moment.

---

### [x] T2-02 · SECURITY · Add rate limiting to invite token resolution

**File:** `app/(app)/invite/[token]/page.tsx`

**Problem:** Every page load for an invite URL queries the DB to look up the token. There is no throttling. Even though UUIDs have high entropy, with no rate limit, automated tooling could probe millions of tokens over time.

**Fix:** Add server-side rate limiting keyed on the visitor's IP address (read from the `x-forwarded-for` header in the page's server component). Allow a maximum of 10 invite lookups per IP per hour. If the limit is exceeded, render a "Too many attempts" page instead of querying the DB. Use an in-memory store, Vercel KV, or a Redis-compatible store for the rate limit counter.

**Verification:** Make 11 requests to `/invite/<any-uuid>` from the same IP within an hour. Confirm the 11th returns the rate-limited response. A fresh IP can still access invite links normally.

---

### [x] T2-03 · SECURITY · Enforce password complexity in `complete-profile`

**File:** `app/api/complete-profile/route.ts`

**Problem:** Password validation checks only for `password.length >= 8`. An 8-character all-lowercase password is allowed, which is too weak.

**Fix:** Replace the simple length check with a more robust validation:
```typescript
const isStrongPassword = (p: string) =>
  p.length >= 8 && /[A-Z]/.test(p) && /[0-9]/.test(p)

if (password && !isStrongPassword(password)) {
  return NextResponse.json({ error: 'Password must be at least 8 characters and include an uppercase letter and a number.' }, { status: 400 })
}
```
Also update the client-side form (`app/auth/complete-profile/page.tsx`) to show this requirement to users before they submit.

**Verification:** Try submitting `password123` (no uppercase) — confirm rejection. Try `Password1` — confirm acceptance. Try `pass` — confirm rejection.

---

### [x] T2-04 · PERFORMANCE · Add batched pagination to the cron reminders job

**File:** `app/api/cron/reminders/route.ts`

**Problem:** The cron job fetches ALL rows from `notification_preferences` with `neq('reminder_cadence', 'never')` in a single query with no limit. At scale (millions of users), this will load the entire table into serverless memory, causing OOM errors or timeouts.

**Fix:** Implement cursor-based batching:
1. Set a batch size constant (e.g., `BATCH_SIZE = 500`).
2. Replace the single fetch with a loop: fetch 500 rows at a time using `.range(offset, offset + BATCH_SIZE - 1)`.
3. Process each batch (calculate who needs reminders, insert notifications).
4. Increment `offset` by `BATCH_SIZE` and repeat until the result is empty.

This keeps memory usage bounded at `BATCH_SIZE` rows per iteration regardless of total user count.

**Verification:** Seed the DB with 1200 test preference rows. Run the cron and confirm all 1200 are processed across 3 batches. Check that the function does not timeout.

---

### [x] T2-05 · PERFORMANCE · Fix over-fetching in `searchUsers` — limit friendship query scope

**File:** `app/(app)/friends/actions.ts`

**Problem:** `searchUsers` makes two queries: (1) fetch users matching the search term, then (2) fetch ALL active friendships for the current user — regardless of how many search results were found. A user with 500 friends searching for 5 people causes 500 friendship rows to be fetched when only 5 are relevant.

**Fix:** After getting the user search results in query 1, extract their IDs: `const resultIds = results.map(u => u.id)`. Then scope the friendship query to only pairs involving the current user AND the result users. Since PostgREST can't express "either side of a pair", use two separate queries — one for `requester_id = user.id AND recipient_id IN (resultIds)`, one for `recipient_id = user.id AND requester_id IN (resultIds)` — and merge the results. If `resultIds` is empty, skip the friendship query entirely.

**Verification:** A user with 200 existing friends searches for "Alice". Confirm only the friendship records involving Alice (if any) are returned, not all 200.

---

### [x] T2-06 · PERFORMANCE · Guard sub-queries in notifications page against empty ID arrays

**File:** `app/(app)/notifications/page.tsx`

**Problem:** After fetching notifications, three sub-queries run unconditionally via `Promise.all`: fetch related users, fetch related moments, fetch membership status. If the user has 0 notifications (or notifications with no related entities), all three queries still fire against the DB with empty `IN ()` clauses or equivalent, wasting round-trips.

**Fix:** Guard each sub-query:
```typescript
const usersPromise = relatedUserIds.length > 0
  ? fetchUsers(relatedUserIds)
  : Promise.resolve([])

const momentsPromise = relatedMomentIds.length > 0
  ? fetchMoments(relatedMomentIds)
  : Promise.resolve([])
// etc.
```
Also audit the `select(...)` columns in each sub-query and remove any fields that are not rendered in `NotificationList` or `NotificationItem`.

**Verification:** View the notifications page with 0 notifications. Confirm (via Supabase logs or console) that no user/moment sub-queries are executed.

---

### [x] T2-07 · PERFORMANCE · Remove user object join from home-page moments query

**File:** `app/(app)/home/actions.ts`

**Problem:** `fetchHomeMoments` selects `moment_members(user_id, role, status, user:users!(...))` which includes a full join to the `users` table for each member of each moment. The home page cards only need member count and avatar URLs — they don't need full user objects. If a moment has 50 members, 50 full user rows are returned per moment.

**Fix:** Change the select string to `moment_members(user_id, role, status)` — drop the `user:users!(...)` join. Then, for avatar display in `MomentCard`, either:
- Pass only `user_id` values to the avatar row (hide avatars that have no URL), or
- Make a separate lightweight query for the top 3 member avatar URLs if they are actually shown.

**Verification:** Check the home page still renders member counts correctly. The moment card avatar row should still work (may show initials/fallback avatars instead of photos, which is acceptable).

---

### [x] T2-08 · RELIABILITY · Prevent duplicate reminder notifications from cron retries

**File:** `app/api/cron/reminders/route.ts`

**Problem:** If the cron job runs twice in one day (e.g., a deployment crash causes Vercel to retry it), users with weekly/monthly reminder cadences receive duplicate notifications. There is no idempotency check.

**Fix:** Before inserting new reminders, query for any reminder-type notifications already created in the past 12 hours for the target users:
```typescript
const { data: recentReminders } = await admin
  .from('notifications')
  .select('user_id')
  .eq('type', 'reminder')
  .gte('created_at', new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString())
  .in('user_id', usersToNotify.map(u => u.user_id))

const alreadyNotified = new Set(recentReminders?.map(r => r.user_id) ?? [])
const toInsert = usersToNotify.filter(u => !alreadyNotified.has(u.user_id))
```
Only insert for users not already notified.

**Verification:** Run the cron twice in quick succession. Confirm each eligible user receives exactly one notification (not two).

---

### [x] T2-09 · CODE QUALITY · Extract shared date helper utilities

**Files:**
- `app/(app)/_components/edit-moment-modal.tsx` — contains `MONTHS`, `isLeapYear()`, `daysInMonth()`, `inferDateMode()`, `YEARS` (approximately lines 41–69)
- `app/(app)/home/_components/create-moment-modal.tsx` — contains identical code (approximately lines 25–48)

**Problem:** Identical date logic (~80 lines) is duplicated in both modal files. Any bug fix or change must be made in two places.

**Fix:**
1. Create `lib/date-helpers.ts`.
2. Move all date helpers (`MONTHS`, `YEARS`, `isLeapYear`, `daysInMonth`, `inferDateMode`) into this file and export them.
3. Replace the local definitions in both modal files with imports from `lib/date-helpers.ts`.

**Verification:** `tsc --noEmit` passes. Open both the create-moment and edit-moment modals and confirm date pickers work correctly, including leap year handling (e.g., Feb 29 on a leap year, Feb 28 on a non-leap year).

---

### [x] T2-10 · CODE QUALITY · Extract `<TagInput>` into a shared component

**Files:**
- `app/(app)/_components/edit-moment-modal.tsx` — `addTag()`, `handleTagKeyDown()`, `removeTag()` and the tag input JSX (~lines 107–127 and corresponding render)
- `app/(app)/home/_components/create-moment-modal.tsx` — identical logic (~lines 102–122)

**Problem:** ~30 lines of tag management logic and the full tag input UI are duplicated across both modals.

**Fix:**
1. Create `components/ui/tag-input.tsx` as a controlled component with props: `tags: string[]`, `onAdd: (tag: string) => void`, `onRemove: (tag: string) => void`, `maxTags?: number`, `maxLength?: number`, `error?: string`.
2. Move all tag logic into the component.
3. Replace the tag sections in both modals with `<TagInput ... />`.

**Verification:** `tsc --noEmit` passes. In both modals, test: adding a tag by pressing Enter, adding a duplicate (should be rejected), removing a tag, and hitting the max tags limit (should show an error).

---

### [x] T2-11 · CODE QUALITY · Memoize `Grid` and `MomentsGrid` helper components

**File:** `app/(app)/home/_components/moments-list.tsx`

**Problem:** `Grid` and `MomentsGrid` are defined as inner components (approximately lines 194–246) inside or near `MomentsList`. They receive stable props (moment data) but re-render every time the parent's state changes (e.g., the search input), even when the moment data hasn't changed.

**Fix:** Move `Grid` and `MomentsGrid` out of the parent component's scope (to the module level, outside the function body) and wrap them with `React.memo()`. If they depend on callbacks from the parent, ensure those callbacks are wrapped in `useCallback` in the parent.

**Verification:** Add a `console.log('Grid re-render')` temporarily. Type in the search input rapidly. Confirm `Grid` does not log on every keystroke when the moments data has not changed.

---

### [x] T2-12 · CODE QUALITY · Extract `PeopleInviteInput` into its own file

**File:** `app/(app)/home/_components/create-moment-modal.tsx`

**Problem:** An embedded component `PeopleInviteInput` (approximately 140 lines, starting around line 372) handles user search, invitee selection, and role assignment. It is large enough to be its own testable unit but is buried inside the modal file, making the modal file very long and the invite input logic hard to find or modify.

**Fix:** Move `PeopleInviteInput` and its local state/logic to a new file: `app/(app)/home/_components/people-invite-input.tsx`. Import it in `create-moment-modal.tsx`. Keep the interface the same (pass invitees state and setter as props).

**Verification:** `tsc --noEmit` passes. The create-moment modal still allows searching users, adding them as invitees, and toggling their role between editor/reader.

---

## Tier 3 — Larger Effort (> 2 hrs, architectural or lower-urgency)

### [ ] T3-01 · SECURITY · Strengthen cron endpoint authentication with request signing

**File:** `app/api/cron/reminders/route.ts`

**Problem:** The cron endpoint is authenticated only by a shared `CRON_SECRET` string compared in plaintext. If the secret leaks (e.g., in logs or environment variable exposure), the endpoint is fully unprotected. There is no timestamp validation, so a leaked bearer token is valid indefinitely.

**Fix:** Migrate to Vercel Cron's native signed requests. Vercel automatically adds an `x-vercel-signature` header to cron invocations. Verify this header using Vercel's documented HMAC verification. Remove the manual `CRON_SECRET` check. See Vercel docs on securing cron jobs. Alternatively, add a short-lived HMAC token with a 5-minute TTL embedded in the Authorization header.

**Verification:** Remove the Authorization header from a test request to the cron endpoint. Confirm it returns 401. A legitimate Vercel-signed request still succeeds.

---

### [ ] T3-02 · PERFORMANCE · Replace broad `revalidatePath` with tag-based cache invalidation

**Files:** `app/(app)/home/actions.ts`, `app/(app)/moments/[id]/actions.ts`, and other action files that call `revalidatePath`

**Problem:** `revalidatePath('/home')` invalidates and re-fetches the entire home page — all moments, the user profile, everything — whenever a single moment is created or archived. This is wasteful and causes unnecessary DB load.

**Fix:**
1. Wrap key server-side fetch functions (`fetchHomeMoments`, `fetchMomentDetail`, `getLayoutProfile`) with `unstable_cache` and assign specific tags (e.g., `['moment-list', userId]`, `['moment-detail', momentId]`, `['user-profile', userId]`).
2. Replace `revalidatePath(...)` calls in actions with `revalidateTag(...)` targeting only the affected tags.
   - Creating a moment: `revalidateTag(`moment-list-${userId}`)` only.
   - Editing a moment: `revalidateTag(`moment-detail-${momentId}`)` only.
   - Updating a profile: `revalidateTag(`user-profile-${userId}`)` only.

**Verification:** Create a moment and confirm only the home moments list refetches (not the entire layout). Check Supabase logs to confirm fewer queries fire per mutation.

---

### [ ] T3-03 · PERFORMANCE · Add image transformation parameters to Supabase Storage URLs

**Files:** All files that reference Supabase storage URLs for avatars and cover photos (avatar-upload.tsx, moment-card.tsx, cover-photo-section.tsx, members-row.tsx, etc.)

**Problem:** Raw Supabase storage signed URLs are used without resizing or format conversion. A user who uploads a 5 MB portrait photo has that full 5 MB downloaded every time their avatar appears as a 48px circle.

**Fix:**
1. Create a utility function `lib/storage.ts` (or add to the existing one) `getOptimizedUrl(url: string, width: number, quality?: number): string` that appends Supabase Image Transformation query params: `?width=${width}&quality=${quality ?? 80}&format=webp`.
2. Use this utility wherever storage URLs are used for display:
   - Avatar images: `getOptimizedUrl(avatarUrl, 96)` (for 48px rendered at 2x)
   - Moment cover photos in cards: `getOptimizedUrl(coverUrl, 800)` 
   - Full-size viewer: use the original URL (no transformation)

**Verification:** Open DevTools Network tab. Confirm that avatar image requests now download ~10–20 KB instead of the original multi-MB file. Images still render correctly.

---

### [ ] T3-04 · PERFORMANCE · Add server-side pagination to the friends list

**File:** `app/(app)/friends/page.tsx` and `app/(app)/friends/actions.ts`

**Problem:** The friends page fetches all accepted friendships for the current user on every render with no pagination. A user with 500 friends causes 500+ rows to be loaded from the DB on every visit.

**Fix:**
1. Add a `.limit(50).range(0, 49)` to the initial friends query in the page component.
2. Display a "Load more" button in `FriendsManager` that calls a new server action `fetchMoreFriends(offset: number)` returning the next 50.
3. Append new results to the existing list on the client.
4. Hide "Load more" when fewer than 50 results are returned (i.e., we've reached the end).

**Verification:** Seed the DB with 120 friend relationships. Confirm initial page load shows 50 friends. Click "Load more" twice to confirm the remaining 70 load correctly (50 then 20).

---

### [ ] T3-05 · PERFORMANCE · Use dynamic imports for large modal components

**Files:** Parent files that import:
- `app/(app)/_components/edit-moment-modal.tsx`
- `app/(app)/moments/[id]/_components/create-post-dialog.tsx`
- `app/(app)/moments/[id]/_components/edit-post-dialog.tsx`
- `app/(app)/moments/[id]/_components/media-viewer.tsx`

**Problem:** These components are large (100–400 lines each) and include complex logic. If they are statically imported, they are bundled into the initial page JS even if the user never opens the modal.

**Fix:** In each parent component, replace the static import with a dynamic import:
```typescript
import dynamic from 'next/dynamic'
const EditMomentModal = dynamic(() => import('../../_components/edit-moment-modal'), { ssr: false })
```
The `ssr: false` option is appropriate since these are dialog overlays that don't need server-side rendering.

**Note:** The `editEverOpened` lazy-mount pattern already exists in some components (good). The dynamic import is a complementary optimization at the bundle level.

**Verification:** Run `next build` and compare the output bundle sizes before and after. The initial page chunk for `/home` should be smaller. Modals still open and function correctly.

---

### [ ] T3-06 · RELIABILITY · Add React `cache()` wrapper to layout profile fetch

**File:** `lib/cached-queries.ts`

**Problem:** `getLayoutProfile()` uses `unstable_cache` (Next.js data cache) but not React's `cache()` (per-request deduplication). If multiple server components in the same render tree call `getLayoutProfile()`, each call hits the Next.js cache separately — they're not deduplicated at the React render level.

**Fix:** Wrap `getLayoutProfile` with React's `cache()` in addition to `unstable_cache`:
```typescript
import { cache } from 'react'

export const getLayoutProfile = cache(
  unstable_cache(
    async (userId: string) => { /* ... existing implementation ... */ },
    ['layout-profile'],
    { tags: ['user-profile'], revalidate: 300 }
  )
)
```
This ensures that within a single server render pass, the function is called at most once regardless of how many components invoke it.

**Verification:** Add two explicit calls to `getLayoutProfile(userId)` in the same server component. Confirm (via Supabase logs or a counter) that only one DB query fires per request.

---

### [ ] T3-07 · ACCESSIBILITY · Add `<fieldset>` and `<legend>` groupings to settings form

**File:** `app/(app)/settings/_components/notifications-form.tsx`

**Problem:** The notification preferences form contains several visual groups (e.g., "Friends", "Moments", "Reminders") that are styled visually but not marked up semantically. Screen readers cannot identify where one group ends and another begins.

**Fix:** Wrap each notification preference section in a `<fieldset>` with a `<legend>`:
```html
<fieldset className="...">
  <legend className="...">Friends</legend>
  <!-- friend-related preference toggles -->
</fieldset>
```
Use existing Tailwind classes to style `fieldset` with `border-0 p-0 m-0` and `legend` to match the current section heading style.

**Verification:** Navigate the form using only a keyboard and a screen reader (VoiceOver on Mac). Confirm the screen reader announces each group name as you enter it.

---

### [ ] T3-08 · TYPE SAFETY · Generate Supabase TypeScript types and eliminate manual casts

**Files:** All action files (`home/actions.ts`, `friends/actions.ts`, `moments/[id]/actions.ts`, etc.)

**Problem:** Supabase query results are cast with `as unknown as Array<{...}>` in several places. These casts bypass TypeScript's type checking. If the DB schema changes, the mismatch won't be caught at compile time — only at runtime.

**Fix:**
1. Run `supabase gen types typescript --project-id <project-id> > types/database.types.ts` (or `--local` for local dev) to generate types from the live schema.
2. Import and use the generated types in action files (e.g., `Database['public']['Tables']['moments']['Row']`).
3. Remove `as unknown as` casts and replace with properly typed variables or use the generated helper types.
4. Add `supabase gen types typescript ...` as a step in the project's development workflow (e.g., a `package.json` script: `"gen:types": "supabase gen types typescript ..."`).

**Verification:** `tsc --noEmit` passes with no `any` or unsafe cast errors. Make a non-breaking schema change (add a nullable column) and confirm TypeScript surfaces the new field without additional manual work.

---

### [ ] T3-09 · TYPE SAFETY · Refactor `PostMedia` to a discriminated union

**Files:** Wherever `PostMedia` type is defined and used (likely `types/` or inline in `moments/[id]/_components/post-card.tsx`, `posts-feed.tsx`, `media-viewer.tsx`)

**Problem:** The current `PostMedia` type is a flat object with optional fields for different media types. Code that renders media must do defensive nullability checks everywhere (`if (!item.storageUrl) return null`). This pattern is error-prone.

**Fix:** Refactor to a discriminated union:
```typescript
type PhotoMedia = { type: 'photo'; storageUrl: string; width?: number; height?: number }
type VideoMedia = { type: 'video'; storageUrl: string; thumbnailUrl?: string }
type AudioMedia = { type: 'audio'; storageUrl: string; durationSeconds?: number }
type PostMedia = PhotoMedia | VideoMedia | AudioMedia
```
Update all media rendering code to use type narrowing (`if (media.type === 'photo')`) instead of defensive optional chaining.

**Verification:** `tsc --noEmit` passes. The media viewer correctly renders photos, videos, and audio. Introduce a deliberate type error (e.g., access `media.width` without narrowing to `PhotoMedia`) and confirm TypeScript catches it.

---

### [ ] T3-10 · SECURITY/DX · Restrict allowed media upload types

**File:** `lib/upload.ts` (or wherever `ALLOWED_MEDIA_TYPES` is defined)

**Problem:** The allowed types list includes `.heic`, `.heif`, `.ogg`, `.aac`, `.x-m4a`. These are less common formats that may not be universally supported in browsers, can complicate server-side processing, and expand the attack surface for malicious file uploads.

**Fix:** Restrict to well-supported, broadly safe formats only:
- **Images:** `image/jpeg`, `image/png`, `image/webp`, `image/gif`
- **Video:** `video/mp4`, `video/webm`
- **Audio:** `audio/mpeg` (mp3), `audio/wav`, `audio/mp4` (m4a)

Remove `heic`, `heif`, `ogg`, `aac`, `x-m4a` from the allowed list. Update any error messages shown to users to list the supported formats.

**Verification:** Attempt to upload a `.heic` file and confirm it is rejected with a clear error message. Upload a `.jpg` and `.mp4` and confirm they are accepted.

---

## Completion Tracker

| ID | Description | Tier | Category | Status |
|----|-------------|------|----------|--------|
| T1-01 | Fix PostgREST injection in fetchHomeMoments | 1 | Security | [x] |
| T1-02 | Sanitize searchUsers input | 1 | Security | [x] |
| T1-03 | Fix email enumeration in check-availability | 1 | Security | [x] |
| T1-04 | Validate invite token UUID format | 1 | Security | [x] |
| T1-05 | Runtime role enum validation in inviteMember | 1 | Security | [x] |
| T1-06 | Return 500 on cron insert failure | 1 | Reliability | [x] |
| T1-07 | Isolate notification send in post creation | 1 | Reliability | [x] |
| T1-08 | Make ownership transfer transactional | 1 | Reliability | [x] |
| T1-09 | Add index on moment_archive(user_id, moment_id) | 1 | Performance | [x] |
| T1-10 | Add index on moment_members(user_id, status) | 1 | Performance | [x] |
| T1-11 | Fix 3 disabled react-hooks/exhaustive-deps | 1 | Code Quality | [x] |
| T1-12 | Add error.tsx boundaries to app routes | 1 | Code Quality | [x] |
| T1-13 | Add descriptive alt text to images | 1 | Accessibility | [x] |
| T1-14 | Link form errors via aria-describedby | 1 | Accessibility | [x] |
| T2-01 | Explicit ownership check in updateMomentDetails/updateCoverPhoto | 2 | Security | [x] |
| T2-02 | Rate limiting on invite token resolution | 2 | Security | [x] |
| T2-03 | Enforce password complexity in complete-profile | 2 | Security | [x] |
| T2-04 | Batch pagination in cron reminders job | 2 | Performance | [x] |
| T2-05 | Fix over-fetching in searchUsers friendships | 2 | Performance | [x] |
| T2-06 | Guard sub-queries in notifications page | 2 | Performance | [x] |
| T2-07 | Remove user join from home moments query | 2 | Performance | [x] |
| T2-08 | Prevent duplicate cron reminder notifications | 2 | Reliability | [x] |
| T2-09 | Extract shared date helper utilities | 2 | Code Quality | [x] |
| T2-10 | Extract TagInput component | 2 | Code Quality | [x] |
| T2-11 | Memoize Grid/MomentsGrid components | 2 | Code Quality | [x] |
| T2-12 | Extract PeopleInviteInput to own file | 2 | Code Quality | [x] |
| T3-01 | Strengthen cron auth with request signing | 3 | Security | [ ] |
| T3-02 | Replace revalidatePath with tag-based caching | 3 | Performance | [ ] |
| T3-03 | Add image transformation for storage URLs | 3 | Performance | [ ] |
| T3-04 | Paginate friends list server-side | 3 | Performance | [ ] |
| T3-05 | Dynamic imports for large modal components | 3 | Performance | [ ] |
| T3-06 | Add React cache() to layout profile fetch | 3 | Reliability | [ ] |
| T3-07 | Add fieldset/legend to settings form | 3 | Accessibility | [ ] |
| T3-08 | Generate Supabase TypeScript types | 3 | Type Safety | [ ] |
| T3-09 | Refactor PostMedia to discriminated union | 3 | Type Safety | [ ] |
| T3-10 | Restrict allowed media upload types | 3 | Security/DX | [ ] |
