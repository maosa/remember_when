# Remember When Codebase Review

Review date: 2026-05-21

Scope: full repository review covering backend security, data access, Supabase policies, server actions, API routes, migrations, maintainability, UX, UI, and frontend performance.

---

## Executive Summary

The codebase is relatively small and readable. The backend has accumulated sensitive behavior in server actions that use the Supabase service-role client — the main security theme is reducing blast radius by centralizing authorization checks, validating client-supplied storage paths, and moving critical invariants into database constraints or RPC functions. On the frontend, the main themes are: a missing `router.refresh()` that makes new posts invisible without a manual reload, photo presentation that doesn't scale with count, and several polish gaps (toast feedback, loading skeletons, sort label UX).

---

## High Priority — Security

### 1. Add an access check before signing post media

File: `app/(app)/moments/[id]/actions.ts`, lines 956-1014

`fetchPosts(momentId)` authenticates the user, then uses the admin client to query posts and sign every media path for the supplied moment. Unlike `fetchMomentDetail` and `fetchMomentPhotos`, it does not verify that the current user owns the moment or is an accepted member.

Because the admin client bypasses RLS and `signStoragePaths` creates service-role signed URLs, any authenticated user who obtains or guesses a valid moment UUID could call the server action directly and receive private post content for that moment.

Recommended fix:

- Add a shared `assertCanViewMoment(momentId, userId)` helper and call it before querying posts or signing media.
- Use this same helper in `fetchMomentDetail`, `fetchMomentPhotos`, and future read actions so read authorization is not reimplemented slightly differently in each action.
- Return a generic empty/not-found response to avoid revealing whether a moment exists.

### 2. Tighten Supabase Storage RLS policies

Files:

- `supabase/migrations/20260319_phase4_moments.sql`, lines 193-206
- `supabase/migrations/20260319_phase5_posts.sql`, lines 143-151
- `supabase/migrations/20260323_security.sql`, lines 80-88

The migrations make `moment-covers` and `post-media` private, but the active storage policies remain bucket-wide for any authenticated user. In practice, any signed-in user can read any object in those buckets through the Storage API, and the older upload/delete policies allow broad object writes/deletes by bucket.

Recommended fix:

- Replace broad `auth.uid() is not null` policies with path-scoped policies tied to ownership/membership.
- Use object path conventions such as `{momentId}/{postId}/...` to check access through `moments`, `moment_members`, `posts`, and `post_media`.
- If all private reads should go through service-role signing, remove authenticated bucket read policies and keep only the minimal write policies needed for signed upload URL flows.
- Scope deletes/updates to the object owner or route them through server-side admin cleanup.

### 3. Validate two-phase upload finalizer paths

File: `app/(app)/moments/[id]/actions.ts`, lines 1259-1290 and 1433-1510

`finalizePostUpload` verifies that the post belongs to the current user, but then inserts `post_media` rows from client-supplied `media` paths and `mediaType` values. `editPost` does the same for `newMediaPaths`. Neither function proves that:

- the path was issued by `preparePostUpload` or `prepareEditUpload`;
- the path belongs to the same `momentId` and `postId`;
- the object exists in Storage;
- the media type matches the uploaded object's MIME type;
- the same uploaded path has not already been attached elsewhere.

Recommended fix:

- Enforce path shape: `post-media/${momentId}/${postId}/...` for new posts and edits.
- Track prepared uploads in a short-lived DB table keyed by user, post, path, expected MIME/media type, and expiration, then consume those rows during finalize.
- Alternatively, stat each object server-side before insert and verify bucket, path prefix, content type, and ownership.
- Add a unique constraint on `post_media.storage_url` if a storage object should never be attached to multiple media rows.

### 4. Restrict cover selection to valid photos from the same moment

File: `app/(app)/moments/[id]/actions.ts`, lines 850-868

`setCoverPhotoFromPath(momentId, storagePath)` checks that the caller can edit the moment, then writes the provided `storagePath` directly into `moments.cover_photo_url`. There is no check that the path points to a photo, belongs to the same moment, or exists in `post_media`.

Recommended fix:

- Accept only storage paths returned by `fetchMomentPhotos`.
- Before updating, query `posts` + `post_media` for a non-deleted photo where `posts.moment_id = momentId` and `post_media.storage_url = storagePath`.
- Also allow direct `moment-covers/{momentId}/...` paths for uploaded cover files, with a strict prefix check.

### 5. Scope invite notification metadata updates

File: `app/(app)/moments/[id]/actions.ts`, lines 183-188 and 247-252

When `notificationId` is provided, `acceptMomentInvite` and `declineMomentInvite` update that notification by id only, using the admin client. The fallback branch correctly scopes by `user_id`, `type`, and `related_moment_id`, but the explicit id branch does not.

Recommended fix:

- Add `.eq('user_id', user.id)`, `.eq('type', 'moment_invite')`, and `.eq('related_moment_id', momentId)` to the id-based update.

---

## Medium Priority — Security & Reliability

### 6. Centralize authorization helpers for moment actions

File: `app/(app)/moments/[id]/actions.ts`

The 1,924-line moment action file repeats owner/member/editor checks across many functions. Some read paths are strict, some write paths use admin plus manual checks, and one read path misses the check entirely.

Recommended fix:

- Split into domain modules: `moment-read-actions.ts`, `member-actions.ts`, `post-actions.ts`, `cover-actions.ts`, `invite-link-actions.ts`, and `tag-actions.ts`.
- Add shared helpers: `getMomentAccess`, `assertCanViewMoment`, `assertCanPost`, `assertCanEditMoment`, `assertCanManageMembers`, `assertCanManageInviteLink`.

### 7. Move multi-step mutations into database transactions

Files:

- `app/api/complete-profile/route.ts`
- `app/api/resolve-invite/route.ts`
- `app/auth/callback/route.ts`
- `app/(app)/home/actions.ts`
- `app/(app)/moments/[id]/actions.ts`

Several flows perform related writes as separate admin-client round trips. A partial failure can leave inconsistent state, duplicate notifications, orphaned pending rows, or posts without media rows.

Recommended fix:

- Add RPC functions for critical workflows that must be atomic: profile completion plus invite resolution, create moment plus tags/invitees, finalize upload, edit post media changes, and replace moment tags.
- Use idempotency keys for notification-producing actions that can be retried.
- Add cleanup jobs for orphaned soft-deleted posts and unattached storage objects.

### 8. Harden public and semi-public API routes

Files:

- `app/api/check-availability/route.ts`, lines 11-42
- `app/api/complete-profile/route.ts`
- `app/api/resolve-invite/route.ts`
- `app/auth/callback/route.ts`, lines 7-84

Recommended fix:

- Validate request bodies with a small schema layer before using values.
- Add rate limiting to availability checks, profile completion, invite resolution, and invite redemption. The existing in-memory `lib/rate-limit.ts` is not reliable across Vercel instances.
- Validate `next` redirect targets in auth callbacks against an allowlist of internal paths.
- Avoid returning raw database error messages to clients for profile creation and admin-backed routes.

### 9. Add backend tests around authorization boundaries

There are no test files in the repository.

Recommended fix:

- Add unit tests for pure helpers such as upload validation, storage path parsing, date helpers, and authorization result helpers.
- Add integration tests for: non-member cannot fetch posts or signed media; reader cannot post/edit/delete; editor cannot invite another editor unless owner; upload finalizer rejects paths outside the prepared post; cover selection rejects media from another moment; invite accept/decline cannot mutate another user's notification.

### 10. Make service-role usage more explicit

File: `lib/supabase/admin.ts`

Recommended fix:

- Create narrow data-access functions for admin-only operations instead of importing `createAdminClient` throughout route and action files.
- Name admin helpers after the invariant they enforce, e.g. `getMomentForAuthorizedViewer`, `insertNotificationsRespectingPreferences`.

---

## Lower Priority — Maintainability & Ops

### 11. Reduce type casting around Supabase joins

Files: `app/(app)/moments/[id]/actions.ts`, `app/(app)/home/actions.ts`, `app/(app)/friends/page.tsx`

Many `as unknown as ...` casts around joined Supabase results hide schema drift and make refactors harder.

Recommended fix: Define local row types for each query result and centralize mapping functions.

### 12. Add operational observability for best-effort failures

Several important operations intentionally continue after failures (notifications, audit logging, storage cleanup, invite email fallbacks). Production debugging will be difficult if failures only appear as `console.error`.

Recommended fix: Add structured logging with event names, user id, moment id, post id, and operation id. Consider an `outbox` table for notification and email work so retries are explicit.

### 13. Improve rate limiting for production

File: `lib/rate-limit.ts`

The in-memory rate limiter resets per process and per deployment instance.

Recommended fix: Use a shared store (Upstash Redis, Vercel KV-compatible storage, or Supabase-backed rate-limit rows).

### 14. Document environment and migration expectations

The README does not document required environment variables, local Supabase setup, migration order, cron secrets, or how generated `types/database.types.ts` should be refreshed.

Recommended fix: Add a backend setup section covering `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET`, and `NEXT_PUBLIC_SITE_URL`. Document how to run migrations and regenerate database types.

---

## UX / UI / Performance

Each task below is self-contained and can be implemented independently. They are ordered roughly by impact.

### U-01: Refresh posts feed after create / edit

Files: `app/(app)/moments/[id]/_components/create-post-dialog.tsx`, `edit-post-dialog.tsx`

**Problem:** After a post is created (`finalizePostUpload` / `createPost`) or edited, the dialog closes but `PostsFeed` continues to render the stale `initialPosts` from the initial server render. The new or updated post is invisible until the user manually reloads the page. (Deletion already works correctly — it sets a local `deleted` flag.)

**Fix:** In `CreatePostDialog`, call `router.refresh()` immediately before `onOpenChange(false)` on the success path of both `handleMediaSubmit` and the text-only branch. In `EditPostDialog`, call `router.refresh()` after `onSaved(updated)`. Both components already import `useRouter` or can add it from `next/navigation`.

Because `PostsFeed` receives `initialPosts` from a server component (`PostsSection`), a `router.refresh()` will re-run the server component tree, re-fetch `fetchPosts`, and pass fresh posts to the client — without a full navigation.

---

### U-02: Adaptive photo grid layout in post cards

File: `app/(app)/moments/[id]/_components/post-card.tsx`, lines 186-206

**Problem:** All photos are fixed `size-40` (160×160 px) in a flex-wrap row regardless of how many there are. A single-photo post looks like a small thumbnail; many photos wrap into an irregular, hard-to-scan grid.

**Fix:** Replace the single `flex flex-wrap gap-1.5` approach with layout rules based on photo count:

- **1 photo:** Full-width, `aspect-video` (or `max-h-72 w-full object-cover`), `rounded-xl`.
- **2 photos:** Two equal columns, `aspect-square` each.
- **3 photos:** One full-width top row + two half-width bottom row (or 2-left + 1-right tall column).
- **4+ photos:** 2×2 grid; if more than 4, overlay the 4th tile with `+N more` in a semi-transparent pill. Clicking any tile opens the viewer at that index as before.

Keep the `size-40` fallback if count detection is skipped for audio/video tiles.

---

### U-03: Apply `getOptimizedUrl` to post card thumbnails

File: `app/(app)/moments/[id]/_components/post-card.tsx`, lines 195-204

**Problem:** Post card photo thumbnails use `src={m.storageUrl}` directly — the full-resolution signed URL. `getOptimizedUrl` (which calls Supabase's image transform API) is used in `moment-card.tsx` for cover photos (800 px) and avatar images (96 px), but not here. A 5 MB photo is downloaded for a 160 px tile.

**Fix:** Import `getOptimizedUrl` from `@/lib/storage` and wrap each thumbnail `src`:

```tsx
src={getOptimizedUrl(m.storageUrl, 640) ?? m.storageUrl}
```

640 px is a good ceiling for a thumbnail that will never exceed ~640 CSS px even on a retina display. Keep `m.storageUrl` (full resolution) as the `src` passed to `MediaViewer` for the lightbox view.

---

### U-04: Add a toast notification system

Files: multiple — `moment-card.tsx`, `cover-photo-section.tsx`, `members-section.tsx`, `posts-feed.tsx`, app `layout.tsx`

**Problem:** Many background actions (archive/unarchive, role change, cover photo save, invite send) give no success feedback. Users have no confirmation that the action completed, especially on slow connections. Errors are shown inline but successes are silent.

**Fix:** Install `sonner` (React 19-compatible, ~2.5 kB gzipped) and add `<Toaster />` to `app/(app)/layout.tsx`. Then:

- In `MomentCard.toggleArchive`: `toast.success(moment.isArchived ? 'Moment unarchived' : 'Moment archived')` on success; `toast.error(...)` on error.
- In `CoverPhotoSection.handleFileChange`, `handleDelete`, `handleSelectExisting`: success/error toasts.
- In `MemberRow.handleRoleChange`: `toast.success('Role updated')`.
- In `InviteDialog.handleSend`: keep the inline feedback banner for `not_found` / `error` (they need explanation), but replace the success banners with `toast.success('Invite sent to @username')`.
- In `InviteLinkSection`: toast for link generation and revocation.

Do not add toasts to `CreatePostDialog` / `EditPostDialog` — those already close the dialog on success, which is sufficient feedback.

---

### U-05: Skeleton grid in cover photo picker while loading

File: `app/(app)/moments/[id]/_components/cover-photo-section.tsx`, lines 104-108

**Problem:** When the cover photo dialog opens, it fetches existing moment photos and shows plain `<p>Loading…</p>` text. This is jarring and leaves a blank content area.

**Fix:** Replace the loading state with a skeleton grid that mirrors the actual photo layout:

```tsx
{loadingPhotos && (
  <div className="flex flex-wrap gap-2">
    {[...Array(6)].map((_, i) => (
      <div key={i} className="size-20 rounded-lg bg-rw-surface-raised animate-pulse" />
    ))}
  </div>
)}
```

This fills the space that the real photos will occupy, preventing layout shift when they load.

---

### U-06: Show audio filename / duration in post cards

File: `app/(app)/moments/[id]/_components/post-card.tsx`, lines 229-239

**Problem:** Audio entries always display as "Audio recording" with no identifying information. If a post contains multiple audio files they are indistinguishable in the feed.

**Fix — two parts:**

1. **Filename:** `post_media` rows currently store `storage_url` (the signed URL path) and `media_type`. The storage path already encodes the original filename or a UUID. Extract the basename from the path stored in `post_media.storage_url` (or add a `display_name` column to `post_media` populated during `finalizePostUpload`). Display it truncated in the audio row label.

2. **Duration (optional, client-side):** Add a hidden `<audio ref preload="metadata">` for each audio item and read `audioRef.current.duration` on `onLoadedMetadata` to display a formatted `MM:SS` duration badge alongside the play icon.

---

### U-07: Fix sort button label in PostsFeed

File: `app/(app)/moments/[id]/_components/posts-feed.tsx`, lines 91-104

**Problem:** The sort toggle shows the _current_ sort order as its label. When entries are sorted ascending (`sort === 'asc'`), the button reads "Oldest first" — which is the current state. Clicking it switches to descending (newest first). The label should describe what clicking *will do*, not what the current state is.

**Fix — option A (quickest):** Swap the label logic so it shows the _opposite_ state:

```tsx
{sort === 'asc' ? 'Switch to newest first' : 'Switch to oldest first'}
```

**Fix — option B (cleaner):** Replace the toggle button with a two-segment control matching `MomentsList`'s sort menu, showing both options and highlighting the active one. This makes the current state and the action explicit simultaneously.

---

### U-08: Drag-and-drop file upload in create/edit post dialogs

Files: `app/(app)/moments/[id]/_components/create-post-dialog.tsx`, `edit-post-dialog.tsx`

**Problem:** File selection only works via the three picker buttons (Photo / Video / Audio). Dragging files from the desktop onto the dialog is not supported and is the most natural interaction on desktop.

**Fix:** Add `onDragOver` and `onDrop` handlers to the `DialogContent` (or a wrapper `<div>` around the textarea/preview area):

```tsx
onDragOver={(e) => { e.preventDefault(); setIsDragOver(true) }}
onDragLeave={() => setIsDragOver(false)}
onDrop={(e) => { e.preventDefault(); setIsDragOver(false); handleFiles(e.dataTransfer.files) }}
```

Show a dashed border highlight (`isDragOver && 'border-rw-accent'`) on the dialog body while files are held over it. Validate file types and sizes the same way `handleFiles` already does — the dragged files are passed to the same function.

---

### U-09: Add character count to post textarea

File: `app/(app)/moments/[id]/_components/create-post-dialog.tsx`, lines 169-180

**Problem:** The post content textarea has no visible limit or counter. Users writing long entries get no feedback on length.

**Fix:** Choose a max length (e.g. 5000 characters — enforce in the server action too for defense-in-depth). Display a counter below the textarea:

```tsx
<div className="flex justify-end">
  <span className={cn(
    'text-xs',
    content.length > MAX_CHARS * 0.9 ? 'text-rw-danger' : 'text-rw-text-placeholder'
  )}>
    {content.length} / {MAX_CHARS}
  </span>
</div>
```

Disable the submit button when `content.length > MAX_CHARS`.

---

### U-10: Download button for video and audio in MediaViewer

File: `app/(app)/moments/[id]/_components/media-viewer.tsx`, lines 418-430

**Problem:** The download `<a>` in `MediaViewer` is guarded by `item.mediaType === 'photo'`, so videos and audio files cannot be downloaded from the lightbox.

**Fix:** Remove the `item.mediaType === 'photo'` guard so the download anchor renders for all media types. The `download` attribute on an `<a>` works for all file types — the browser will prompt a save dialog. Optionally derive a human-readable filename from the storage URL path basename.

---

### U-11: Add "Add entry" quick-action to collapsed moment sticky bar

File: `app/(app)/moments/[id]/_components/moment-header.tsx`, lines 101-115

**Problem:** When the user scrolls down on a moment page, the sticky bar collapses to show only the moment name. Editors who want to add a new entry must scroll all the way back up to the `PostsFeed` section to find the "Add entry" button. On long moments this is a meaningful friction point.

**Fix:** Add a compact "Add entry" `<Button size="sm">` to the right side of the collapsed sticky bar. It should only appear when `collapsed === true` and the user has `canPost` permission.

Implementation: `MomentHeader` already receives `moment` and can derive `canPost` from `myStatus` and `myRole`. Add a `createOpen` / `setCreateOpen` state to `MomentHeader`, render a `CreatePostDialog` inside it (already dynamically imported), and trigger it from the sticky bar button. The `CreatePostDialog` needs `momentId` which is available as `moment.id`.

---

### U-12: Add entry count to moment cards on home page

Files: `app/(app)/home/actions.ts` (`fetchHomeMomentsData`), `app/(app)/home/_components/moment-card.tsx`

**Problem:** Moment cards show date, location, tags, and members, but not how many entries exist. Users cannot tell from the home screen which moments have new activity or are empty.

**Fix:** Add a `postCount` field to `MomentSummary`. In `fetchHomeMomentsData`, extend the Supabase query to include a count of non-deleted posts:

```sql
posts(count) filtered by deleted_at IS NULL
```

Display it in the card body as a small metadata line, e.g. `<MessageSquare className="size-3" /> 12 entries`. Conditionally show it only when `postCount > 0` and `myStatus === 'accepted'`.

---

### U-13: Fix landing page hero headline `min-h` sizing

File: `app/page.tsx`, line 287

**Problem:** The `h1` containing the rotating quote uses hardcoded responsive `min-h` values (`min-h-[280px] sm:min-h-[210px] md:min-h-[220px] lg:min-h-[250px]`) to prevent layout shift as quotes rotate. These were measured empirically for the longest quote at specific breakpoints. At viewport widths between breakpoints (e.g. 400 px–640 px), the values can produce excess whitespace or, for very long quotes at unusual widths, allow a layout shift.

**Fix:** Use a JS-measured approach on mount. In a `useEffect`, measure the rendered `h1` height at the initial (longest or current) state and set an explicit `minHeight` style. Or: wrap only the `<RotatingQuote />` span in a `<span style={{ display: 'inline-block', minHeight: measured }}>`  sized once after mount. The hero already fades in, so any brief unstyled state on first load is invisible.

Alternatively, accept the current approach as "good enough" and only fix the `sm:min-h-[210px]` breakpoint which is most likely to be wrong on modern phones (390–430 px viewport width).

---

### U-14: Show video duration badge in post card thumbnails

File: `app/(app)/moments/[id]/_components/post-card.tsx`, lines 208-227

**Problem:** Video post cards show a play button overlay but no duration. The video background appears blank/grey until `preload="metadata"` completes. Users cannot tell the length of a video before opening the lightbox.

**Fix:** Add a `ref` and `onLoadedMetadata` handler to the `<video>` element. Store the duration in local state. Render a duration badge in the bottom-left corner of the thumbnail (matching the style of social media video cards):

```tsx
const [duration, setDuration] = useState<string | null>(null)
// in JSX:
<video
  ref={vidRef}
  onLoadedMetadata={() => {
    const d = vidRef.current?.duration
    if (d && isFinite(d)) setDuration(fmtDuration(d))
  }}
  ...
/>
{duration && (
  <span className="absolute bottom-2 left-2 rounded-sm bg-black/60 px-1.5 py-0.5 text-[11px] font-medium text-white tabular-nums">
    {duration}
  </span>
)}
```

---

### P-01: Paginate the posts feed (cursor-based)

Files: `app/(app)/moments/[id]/actions.ts` (`fetchPosts`), `app/(app)/moments/[id]/_components/posts-section.tsx`, `posts-feed.tsx`

**Problem:** `fetchPosts` loads all posts for a moment in one query with no limit. A moment with 100+ entries produces a slow TTFB, a large JSON payload, and a long initial render.

**Fix:** Add `cursor` and `limit` parameters to `fetchPosts`. Default `limit` to 20. Return a `nextCursor` (the `created_at` of the last returned post). In `PostsFeed`, show a "Load more" button (or IntersectionObserver sentinel) that calls a client-side server action with the current cursor. Append returned posts to the list. This is a significant but isolated change — `PostsSection` renders server-side so the first 20 appear instantly; subsequent pages load client-side.

---

### P-02: Move `@keyframes rwViewerFadeIn` to `globals.css`

File: `app/(app)/moments/[id]/_components/media-viewer.tsx`, line 231

**Problem:** The `<style>` tag containing `@keyframes rwViewerFadeIn` is injected inline as a React element on every mount of `MediaViewer`. This is a minor inefficiency and would cause duplicate `<style>` blocks if the component were ever mounted more than once.

**Fix:** Move the declaration to `app/globals.css`:

```css
@keyframes rwViewerFadeIn {
  from { opacity: 0 }
  to   { opacity: 1 }
}
```

Remove the `<style>` tag from the component JSX.

---

### P-03: Apply `getOptimizedUrl` to avatar images in the members popover

File: `app/(app)/moments/[id]/_components/members-row.tsx`, lines 121-143

**Problem:** Avatar `<AvatarImage>` elements in the hover popover render the raw `photoUrl` (full resolution). Profile photos can be several hundred kilobytes. The same pattern is applied correctly in `moment-card.tsx` (96 px for avatar stacks) but not here.

**Fix:** Import `getOptimizedUrl` from `@/lib/storage` and wrap each avatar `src` with `getOptimizedUrl(m.photoUrl, 96) ?? m.photoUrl`. This applies Supabase's image transform to serve a 96 px version — appropriate for the 24 px rendered avatar.

---

### P-04: Reduce moment card cover image fetch size

File: `app/(app)/home/_components/moment-card.tsx`, line 92

**Problem:** Moment card cover photos use `getOptimizedUrl(moment.coverPhotoUrl, 800)`. In the 3-column desktop grid each card is at most ~350 px wide; on mobile the card is full-width (~390 px). An 800 px image is approximately 2× the actual rendered size in all cases, doubling the download weight for every cover photo on the home page.

**Fix:** Lower the transform width to 400 px:

```tsx
src={getOptimizedUrl(moment.coverPhotoUrl, 400) ?? moment.coverPhotoUrl}
```

400 px is sufficient for retina at the actual card width (~350 px × 2 = 700 px nominal retina, but the card image is heavily compressed and users rarely zoom). This halves the cover image payload for the home page without visible quality loss. If a specific card becomes the cover of the moment detail page (which has a larger cover area), that component fetches the image independently at the appropriate size.

---

## Suggested Work Plan

**Security track (backend):**

1. Fix direct data exposure: add `assertCanViewMoment` to `fetchPosts`, add tests for non-member access.
2. Lock down storage policies and finalize/upload path validation together (they protect the same boundary).
3. Scope notification id updates in invite accept/decline.
4. Extract authorization helpers from `moments/[id]/actions.ts`, migrate one action group at a time.
5. Add transaction/RPC coverage for the highest-risk multi-step flows.
6. Add a minimal test harness for server-side authorization and storage-path validation.

**UX/UI/Performance track (frontend):**

1. **U-01** — Refresh posts feed after create/edit (quick win, 15 min, high impact).
2. **P-02** — Move viewer keyframes to `globals.css` (trivial cleanup, 5 min).
3. **P-03** — Apply `getOptimizedUrl` to members popover avatars (5 min, consistent pattern).
4. **P-04** — Reduce moment card cover image size from 800 → 400 px (5 min, cuts home page image weight in half).
5. **U-03** — Apply `getOptimizedUrl` to post card thumbnails (10 min, same pattern).
6. **U-05** — Skeleton grid in cover photo picker (20 min, polish).
7. **U-04** — Add toast system (install `sonner`, wire up 5-6 action handlers, 1-2 h).
8. **U-07** — Fix sort button label in PostsFeed (10 min).
9. **U-02** — Adaptive photo grid in post cards (1-2 h, meaningful UX upgrade).
10. **U-12** — Add entry count to moment cards (requires DB query change + UI, 1 h).
11. **U-11** — "Add entry" button in collapsed sticky bar (1-2 h, requires lifting state).
12. **U-10** — Download button for video/audio in MediaViewer (15 min).
13. **U-06** — Audio filename / duration in post cards (30 min for filename; optional JS duration).
14. **U-08** — Drag-and-drop in create/edit post dialogs (1 h).
15. **U-09** — Character count in post textarea (20 min).
16. **U-14** — Video duration badge in post cards (30 min).
17. **U-13** — Fix landing page `min-h` sizing (30-60 min depending on approach).
18. **P-01** — Pagination for posts feed (2-4 h, significant but isolated).

---

## Files Reviewed

Key implementation files reviewed:

- `app/(app)/moments/[id]/actions.ts`
- `app/(app)/moments/[id]/page.tsx`
- `app/(app)/moments/[id]/loading.tsx`
- `app/(app)/moments/[id]/_components/moment-header.tsx`
- `app/(app)/moments/[id]/_components/post-card.tsx`
- `app/(app)/moments/[id]/_components/posts-feed.tsx`
- `app/(app)/moments/[id]/_components/posts-section.tsx`
- `app/(app)/moments/[id]/_components/members-row.tsx`
- `app/(app)/moments/[id]/_components/members-section.tsx`
- `app/(app)/moments/[id]/_components/cover-photo-section.tsx`
- `app/(app)/moments/[id]/_components/create-post-dialog.tsx`
- `app/(app)/moments/[id]/_components/media-viewer.tsx`
- `app/(app)/moments/[id]/_components/tags-section.tsx`
- `app/(app)/home/page.tsx`
- `app/(app)/home/actions.ts`
- `app/(app)/home/_components/moments-list.tsx`
- `app/(app)/home/_components/moment-card.tsx`
- `app/(app)/home/_components/create-moment-modal.tsx`
- `app/(app)/home/_components/people-invite-input.tsx`
- `app/(app)/friends/actions.ts`
- `app/(app)/account/actions.ts`
- `app/(app)/notifications/actions.ts`
- `app/(app)/notifications/_components/notification-list.tsx`
- `app/(app)/layout.tsx`
- `app/page.tsx`
- `components/app-nav.tsx`
- `app/api/check-availability/route.ts`
- `app/api/complete-profile/route.ts`
- `app/api/resolve-invite/route.ts`
- `app/api/cron/reminders/route.ts`
- `app/auth/callback/route.ts`
- `lib/supabase/server.ts`
- `lib/supabase/admin.ts`
- `lib/storage.ts`
- `lib/notifications.ts`
- `lib/upload.ts`
- `lib/rate-limit.ts`
- `lib/cached-queries.ts`
- `app/globals.css`
- `proxy.ts`
- `next.config.ts`
- `supabase/migrations/*.sql`
- `package.json`
- `tsconfig.json`
- `eslint.config.mjs`
- `vercel.json`
