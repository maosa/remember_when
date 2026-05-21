-- ─────────────────────────────────────────────────────────────────────────────
-- Tighten Storage RLS policies for moment-covers and post-media
--
-- PROBLEM
-- The previous policies allowed any authenticated user to read, upload,
-- update, or delete any object in these buckets (only checked auth.uid()
-- is not null).  This meant:
--   • A signed-in user who obtained or guessed a valid storage path could
--     download private moment or post media directly through the Storage API.
--   • A signed-in user could upload objects to paths they don't own,
--     overwrite another user's cover photo, or delete anyone's media.
--
-- FIX
-- 1. Remove SELECT policies entirely.
--    All legitimate reads already go through service-role signed URLs
--    (signStoragePath / signStoragePaths in lib/storage.ts), which bypass
--    RLS by design and are the only path that delivers media to clients.
--    No application code reads storage objects via the authenticated client.
--
-- 2. Replace INSERT / UPDATE / DELETE policies with path-scoped subqueries
--    that verify the caller's role through the moments, moment_members, and
--    posts tables.
--
-- PATH CONVENTIONS (already enforced by server actions)
--   moment-covers  : {momentId}/cover.{ext}
--   post-media     : {momentId}/{postId}/{filename}
--
-- NOTE ON createSignedUploadUrl
--   preparePostUpload and prepareEditUpload call
--   supabase.storage.from('post-media').createSignedUploadUrl(path) using the
--   authenticated user client. Supabase checks the INSERT policy when
--   generating the URL (not when the browser uploads).  The path-scoped INSERT
--   policy below therefore also secures the signed-URL generation step.
-- ─────────────────────────────────────────────────────────────────────────────

-- ─────────────────────────────────────────────────────────────────────────────
-- moment-covers
-- ─────────────────────────────────────────────────────────────────────────────

-- Drop old broad policies
drop policy if exists "moment-covers authenticated read"   on storage.objects;
drop policy if exists "moment-covers authenticated upload" on storage.objects;
drop policy if exists "moment-covers authenticated update" on storage.objects;
drop policy if exists "moment-covers authenticated delete" on storage.objects;
-- Also drop the original public-read policy in case it was never cleaned up
drop policy if exists "moment-covers public read"          on storage.objects;

-- No SELECT policy — all reads must go through service-role signed URLs.

-- INSERT — only the moment owner or an accepted editor may upload a cover photo.
-- The path's first segment is the moment UUID:  {momentId}/cover.{ext}
drop policy if exists "moment-covers owner or editor insert" on storage.objects;
create policy "moment-covers owner or editor insert"
  on storage.objects for insert
  with check (
    bucket_id = 'moment-covers'
    and exists (
      select 1
      from   public.moments m
      where  m.id::text = split_part(name, '/', 1)
        and (
          m.owner_id = auth.uid()
          or exists (
            select 1
            from   public.moment_members mm
            where  mm.moment_id = m.id
              and  mm.user_id   = auth.uid()
              and  mm.status    = 'accepted'
              and  mm.role      = 'editor'
          )
        )
    )
  );

-- UPDATE — same scope; needed because updateCoverPhoto uploads with upsert:true,
-- which generates an UPDATE statement when the object already exists.
drop policy if exists "moment-covers owner or editor update" on storage.objects;
create policy "moment-covers owner or editor update"
  on storage.objects for update
  using (
    bucket_id = 'moment-covers'
    and exists (
      select 1
      from   public.moments m
      where  m.id::text = split_part(name, '/', 1)
        and (
          m.owner_id = auth.uid()
          or exists (
            select 1
            from   public.moment_members mm
            where  mm.moment_id = m.id
              and  mm.user_id   = auth.uid()
              and  mm.status    = 'accepted'
              and  mm.role      = 'editor'
          )
        )
    )
  )
  with check (
    bucket_id = 'moment-covers'
    and exists (
      select 1
      from   public.moments m
      where  m.id::text = split_part(name, '/', 1)
        and (
          m.owner_id = auth.uid()
          or exists (
            select 1
            from   public.moment_members mm
            where  mm.moment_id = m.id
              and  mm.user_id   = auth.uid()
              and  mm.status    = 'accepted'
              and  mm.role      = 'editor'
          )
        )
    )
  );

-- DELETE — same scope; deleteCoverPhoto removes the object using the
-- authenticated user client so this policy controls that path.
drop policy if exists "moment-covers owner or editor delete" on storage.objects;
create policy "moment-covers owner or editor delete"
  on storage.objects for delete
  using (
    bucket_id = 'moment-covers'
    and exists (
      select 1
      from   public.moments m
      where  m.id::text = split_part(name, '/', 1)
        and (
          m.owner_id = auth.uid()
          or exists (
            select 1
            from   public.moment_members mm
            where  mm.moment_id = m.id
              and  mm.user_id   = auth.uid()
              and  mm.status    = 'accepted'
              and  mm.role      = 'editor'
          )
        )
    )
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- post-media
-- ─────────────────────────────────────────────────────────────────────────────

-- Drop old broad policies
drop policy if exists "post-media authenticated read"   on storage.objects;
drop policy if exists "post-media authenticated upload" on storage.objects;
drop policy if exists "post-media authenticated delete" on storage.objects;
-- Also drop the original public-read policy in case it was never cleaned up
drop policy if exists "post-media public read"          on storage.objects;

-- No SELECT policy — all reads must go through service-role signed URLs.

-- INSERT — only the post's author may upload media for their own post.
-- Path: {momentId}/{postId}/{filename}; second segment is the post UUID.
-- Covers two code paths:
--   a) createPost direct upload (supabase.storage.upload) — INSERT checked here
--   b) preparePostUpload / prepareEditUpload createSignedUploadUrl — INSERT
--      policy is evaluated when the signed URL is generated, not on upload
-- The post record must already exist (created before the upload in both flows).
drop policy if exists "post-media post author insert" on storage.objects;
create policy "post-media post author insert"
  on storage.objects for insert
  with check (
    bucket_id = 'post-media'
    and exists (
      select 1
      from   public.posts p
      where  p.id::text        = split_part(name, '/', 2)
        and  p.moment_id::text = split_part(name, '/', 1)
        and  p.author_id       = auth.uid()
        and  p.deleted_at is null
    )
  );

-- DELETE — scoped to the post author.
-- Server-side cleanup already uses the admin client (bypassing RLS); this
-- policy prevents a user from deleting another user's media through the
-- Storage API directly.  No deleted_at check so orphaned media can also
-- be cleaned up by the original author.
drop policy if exists "post-media post author delete" on storage.objects;
create policy "post-media post author delete"
  on storage.objects for delete
  using (
    bucket_id = 'post-media'
    and exists (
      select 1
      from   public.posts p
      where  p.id::text        = split_part(name, '/', 2)
        and  p.moment_id::text = split_part(name, '/', 1)
        and  p.author_id       = auth.uid()
    )
  );
