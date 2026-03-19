-- Phase 5: Posts & Media
-- Run this in the Supabase SQL editor.
-- Fully idempotent — safe to re-run.

-- ─────────────────────────────────────────────────────────────
-- 1. posts
-- ─────────────────────────────────────────────────────────────
create table if not exists public.posts (
  id          uuid        primary key default gen_random_uuid(),
  moment_id   uuid        not null references public.moments(id) on delete cascade,
  author_id   uuid        not null references public.users(id) on delete cascade,
  content     text,                        -- nullable (media-only post)
  created_at  timestamptz not null default now(),
  deleted_at  timestamptz                  -- soft delete; never hard-delete
);

alter table public.posts enable row level security;

drop policy if exists "Posts visible to moment participants" on public.posts;
create policy "Posts visible to moment participants"
  on public.posts for select
  using (
    deleted_at is null
    and exists (
      select 1 from public.moments
      where moments.id = public.posts.moment_id
        and (
          moments.owner_id = auth.uid()
          or exists (
            select 1 from public.moment_members
            where moment_members.moment_id = moments.id
              and moment_members.user_id = auth.uid()
              and moment_members.status = 'accepted'
          )
        )
    )
  );

drop policy if exists "Accepted members can create posts" on public.posts;
create policy "Accepted members can create posts"
  on public.posts for insert
  with check (
    auth.uid() = author_id
    and exists (
      select 1 from public.moments
      where moments.id = moment_id
        and (
          moments.owner_id = auth.uid()
          or exists (
            select 1 from public.moment_members
            where moment_members.moment_id = moments.id
              and moment_members.user_id = auth.uid()
              and moment_members.status = 'accepted'
          )
        )
    )
  );

-- Soft delete: author can delete own; owner can delete any
drop policy if exists "Author or owner can soft-delete post" on public.posts;
create policy "Author or owner can soft-delete post"
  on public.posts for update
  using (
    author_id = auth.uid()
    or exists (
      select 1 from public.moments
      where moments.id = public.posts.moment_id
        and moments.owner_id = auth.uid()
    )
  );


-- ─────────────────────────────────────────────────────────────
-- 2. post_media
-- ─────────────────────────────────────────────────────────────
create table if not exists public.post_media (
  id           uuid        primary key default gen_random_uuid(),
  post_id      uuid        not null references public.posts(id) on delete cascade,
  media_type   text        not null check (media_type in ('photo', 'video', 'audio')),
  storage_url  text        not null,
  created_at   timestamptz not null default now()
);

alter table public.post_media enable row level security;

drop policy if exists "Post media visible to moment participants" on public.post_media;
create policy "Post media visible to moment participants"
  on public.post_media for select
  using (
    exists (
      select 1 from public.posts
      where posts.id = public.post_media.post_id
        and posts.deleted_at is null
        and exists (
          select 1 from public.moments
          where moments.id = posts.moment_id
            and (
              moments.owner_id = auth.uid()
              or exists (
                select 1 from public.moment_members
                where moment_members.moment_id = moments.id
                  and moment_members.user_id = auth.uid()
                  and moment_members.status = 'accepted'
              )
            )
        )
    )
  );

drop policy if exists "Author can insert post media" on public.post_media;
create policy "Author can insert post media"
  on public.post_media for insert
  with check (
    exists (
      select 1 from public.posts
      where posts.id = post_id
        and posts.author_id = auth.uid()
    )
  );


-- ─────────────────────────────────────────────────────────────
-- 3. Extend notifications table for post events
-- ─────────────────────────────────────────────────────────────
alter table public.notifications
  add column if not exists post_id uuid references public.posts(id) on delete cascade;

alter type notification_type add value if not exists 'new_post';


-- ─────────────────────────────────────────────────────────────
-- 4. Storage bucket for post media
-- ─────────────────────────────────────────────────────────────
insert into storage.buckets (id, name, public)
values ('post-media', 'post-media', true)
on conflict (id) do nothing;

drop policy if exists "post-media public read" on storage.objects;
create policy "post-media public read"
  on storage.objects for select
  using (bucket_id = 'post-media');

drop policy if exists "post-media authenticated upload" on storage.objects;
create policy "post-media authenticated upload"
  on storage.objects for insert
  with check (bucket_id = 'post-media' and auth.uid() is not null);

drop policy if exists "post-media authenticated delete" on storage.objects;
create policy "post-media authenticated delete"
  on storage.objects for delete
  using (bucket_id = 'post-media' and auth.uid() is not null);
