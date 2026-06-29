-- ─────────────────────────────────────────────────────────────────────────────
-- RLS policy reconciliation
--
-- Production accumulated two overlapping generations of RLS policies (the legacy
-- `initial_schema` set + the repo's phase3-9 set). This migration removes the
-- redundant duplicates and brings the remaining legacy-only policies into the repo
-- so repo == prod, with NO change to allowed access.
--
-- Part 1: drop 22 legacy policies that are exact duplicates of a repo policy
--         already covering the same table + command (verified — zero access change).
-- Part 2: (re)declare the 8 legacy-only INSERT/DELETE policies that had no repo
--         equivalent, using their exact production definitions, so a fresh deploy
--         reproduces them. No-op against prod (drop-if-exists + recreate identical).
-- Idempotent.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Part 1: drop redundant duplicates ────────────────────────────────────────
drop policy if exists "Users can create friend requests"                       on public.friendships;
drop policy if exists "Moment members can view invite links"                   on public.invite_links;
drop policy if exists "Users can unarchive their own"                          on public.moment_archive;
drop policy if exists "Users can archive moments they belong to"              on public.moment_archive;
drop policy if exists "Users can view their own archives"                      on public.moment_archive;
drop policy if exists "Members can view moment membership"                     on public.moment_members;
drop policy if exists "Members can update their own status; owners can update any" on public.moment_members;
drop policy if exists "Members can view tags"                                  on public.moment_tags;
drop policy if exists "Owners can delete moments"                              on public.moments;
drop policy if exists "Users can create moments"                              on public.moments;
drop policy if exists "Users can view moments they belong to"                  on public.moments;
drop policy if exists "Editors can update moments"                             on public.moments;
drop policy if exists "Users can insert their own preferences"                 on public.notification_preferences;
drop policy if exists "Users can view their own preferences"                   on public.notification_preferences;
drop policy if exists "Users can update their own preferences"                 on public.notification_preferences;
drop policy if exists "Users can update their own notifications"               on public.notifications;
drop policy if exists "Authors can add media to their posts"                   on public.post_media;
drop policy if exists "Members can view post media"                            on public.post_media;
drop policy if exists "Editors can create posts"                               on public.posts;
drop policy if exists "Members can view posts"                                 on public.posts;
drop policy if exists "Authors can update their own posts"                     on public.posts;
drop policy if exists "Authenticated users can view any profile"               on public.users;

-- ── Part 2: bring legacy-only write policies into the repo ────────────────────
drop policy if exists "Editors can create invite links" on public.invite_links;
create policy "Editors can create invite links"
  on public.invite_links for insert to authenticated
  with check ((created_by = auth.uid()) and is_moment_editor(moment_id, auth.uid()));

drop policy if exists "Editors can delete invite links" on public.invite_links;
create policy "Editors can delete invite links"
  on public.invite_links for delete to authenticated
  using (is_moment_editor(moment_id, auth.uid()));

drop policy if exists "Editors can invite members" on public.moment_members;
create policy "Editors can invite members"
  on public.moment_members for insert to authenticated
  with check (is_moment_editor(moment_id, auth.uid()));

drop policy if exists "Members can remove themselves; owners can remove anyone" on public.moment_members;
create policy "Members can remove themselves; owners can remove anyone"
  on public.moment_members for delete to authenticated
  using (
    (user_id = auth.uid())
    or exists (select 1 from moments where moments.id = moment_members.moment_id and moments.owner_id = auth.uid())
  );

drop policy if exists "Editors can add tags" on public.moment_tags;
create policy "Editors can add tags"
  on public.moment_tags for insert to authenticated
  with check ((created_by = auth.uid()) and is_moment_editor(moment_id, auth.uid()));

drop policy if exists "Editors can delete tags" on public.moment_tags;
create policy "Editors can delete tags"
  on public.moment_tags for delete to authenticated
  using (is_moment_editor(moment_id, auth.uid()));

drop policy if exists "Authors can delete their post media" on public.post_media;
create policy "Authors can delete their post media"
  on public.post_media for delete to authenticated
  using (exists (select 1 from posts p where p.id = post_media.post_id and p.author_id = auth.uid()));

drop policy if exists "Authors or editors can delete posts" on public.posts;
create policy "Authors or editors can delete posts"
  on public.posts for delete to authenticated
  using ((author_id = auth.uid()) or is_moment_editor(moment_id, auth.uid()));
