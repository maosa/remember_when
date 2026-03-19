-- Phase 4: Moments Core
-- Run this in the Supabase SQL editor.
-- Fully idempotent — safe to re-run.

-- ─────────────────────────────────────────────────────────────
-- 1. moments
-- ─────────────────────────────────────────────────────────────
create table if not exists public.moments (
  id              uuid        primary key default gen_random_uuid(),
  name            text        not null,
  date_year       integer,
  date_month      integer     check (date_month is null or date_month between 1 and 12),
  date_day        integer     check (date_day is null or date_day between 1 and 31),
  location        text,
  cover_photo_url text,
  owner_id        uuid        not null references public.users(id) on delete cascade,
  created_at      timestamptz not null default now()
);

alter table public.moments enable row level security;

drop policy if exists "Moments visible to participants" on public.moments;
create policy "Moments visible to participants"
  on public.moments for select
  using (
    owner_id = auth.uid()
    or exists (
      select 1 from public.moment_members
      where moment_members.moment_id = public.moments.id
        and moment_members.user_id = auth.uid()
    )
  );

drop policy if exists "Authenticated users can create moments" on public.moments;
create policy "Authenticated users can create moments"
  on public.moments for insert
  with check (auth.uid() = owner_id);

drop policy if exists "Owner or accepted editor can update moment" on public.moments;
create policy "Owner or accepted editor can update moment"
  on public.moments for update
  using (
    owner_id = auth.uid()
    or exists (
      select 1 from public.moment_members
      where moment_members.moment_id = public.moments.id
        and moment_members.user_id = auth.uid()
        and moment_members.role = 'editor'
        and moment_members.status = 'accepted'
    )
  );

drop policy if exists "Owner can delete moment" on public.moments;
create policy "Owner can delete moment"
  on public.moments for delete
  using (owner_id = auth.uid());


-- ─────────────────────────────────────────────────────────────
-- 2. moment_members
-- ─────────────────────────────────────────────────────────────
create table if not exists public.moment_members (
  id          uuid        primary key default gen_random_uuid(),
  moment_id   uuid        not null references public.moments(id) on delete cascade,
  user_id     uuid        not null references public.users(id) on delete cascade,
  role        text        not null check (role in ('editor', 'reader')),
  status      text        not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  invited_by  uuid        references public.users(id) on delete set null,
  created_at  timestamptz not null default now(),
  unique (moment_id, user_id)
);

alter table public.moment_members enable row level security;

-- Users can see their own memberships (admin client used for fetching all members server-side)
drop policy if exists "Users can see own memberships" on public.moment_members;
create policy "Users can see own memberships"
  on public.moment_members for select
  using (user_id = auth.uid());

-- Members can update their own status (accept / decline)
drop policy if exists "Members can respond to invite" on public.moment_members;
create policy "Members can respond to invite"
  on public.moment_members for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());


-- ─────────────────────────────────────────────────────────────
-- 3. moment_tags
-- ─────────────────────────────────────────────────────────────
create table if not exists public.moment_tags (
  id          uuid        primary key default gen_random_uuid(),
  moment_id   uuid        not null references public.moments(id) on delete cascade,
  tag         text        not null check (char_length(tag) <= 20),
  created_by  uuid        references public.users(id) on delete set null,
  created_at  timestamptz not null default now()
);

-- Case-insensitive unique tags per moment
create unique index if not exists moment_tags_moment_tag_lower_idx
  on public.moment_tags (moment_id, lower(tag));

alter table public.moment_tags enable row level security;

drop policy if exists "Tags visible to moment participants" on public.moment_tags;
create policy "Tags visible to moment participants"
  on public.moment_tags for select
  using (
    exists (
      select 1 from public.moments
      where moments.id = moment_id
        and (
          moments.owner_id = auth.uid()
          or exists (
            select 1 from public.moment_members
            where moment_members.moment_id = moments.id
              and moment_members.user_id = auth.uid()
          )
        )
    )
  );


-- ─────────────────────────────────────────────────────────────
-- 4. moment_archive
-- ─────────────────────────────────────────────────────────────
create table if not exists public.moment_archive (
  id          uuid        primary key default gen_random_uuid(),
  moment_id   uuid        not null references public.moments(id) on delete cascade,
  user_id     uuid        not null references public.users(id) on delete cascade,
  archived_at timestamptz not null default now(),
  unique (moment_id, user_id)
);

alter table public.moment_archive enable row level security;

drop policy if exists "Users manage own archive" on public.moment_archive;
create policy "Users manage own archive"
  on public.moment_archive for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());


-- ─────────────────────────────────────────────────────────────
-- 5. pending_moment_invites (for non-existing-user email invites)
-- ─────────────────────────────────────────────────────────────
create table if not exists public.pending_moment_invites (
  id          uuid        primary key default gen_random_uuid(),
  moment_id   uuid        not null references public.moments(id) on delete cascade,
  email       text        not null,
  role        text        not null default 'editor' check (role in ('editor', 'reader')),
  invited_by  uuid        not null references public.users(id) on delete cascade,
  token       uuid        not null default gen_random_uuid() unique,
  redeemed_at timestamptz,
  created_at  timestamptz not null default now()
);

alter table public.pending_moment_invites enable row level security;

-- Inviters can see the pending invites they sent
drop policy if exists "Inviters can see own pending invites" on public.pending_moment_invites;
create policy "Inviters can see own pending invites"
  on public.pending_moment_invites for select
  using (invited_by = auth.uid());


-- ─────────────────────────────────────────────────────────────
-- 6. Extend notifications table for moment events
-- ─────────────────────────────────────────────────────────────
alter table public.notifications
  add column if not exists moment_id uuid references public.moments(id) on delete cascade;

-- The `type` column is a PostgreSQL enum (notification_type).
-- Add new values — `if not exists` makes this safe to re-run.
alter type notification_type add value if not exists 'moment_invite';
alter type notification_type add value if not exists 'moment_invite_accepted';
alter type notification_type add value if not exists 'moment_invite_declined';


-- ─────────────────────────────────────────────────────────────
-- 7. Storage bucket for moment cover photos
-- ─────────────────────────────────────────────────────────────
insert into storage.buckets (id, name, public)
values ('moment-covers', 'moment-covers', true)
on conflict (id) do nothing;

drop policy if exists "moment-covers public read" on storage.objects;
create policy "moment-covers public read"
  on storage.objects for select
  using (bucket_id = 'moment-covers');

drop policy if exists "moment-covers authenticated upload" on storage.objects;
create policy "moment-covers authenticated upload"
  on storage.objects for insert
  with check (bucket_id = 'moment-covers' and auth.uid() is not null);

drop policy if exists "moment-covers authenticated update" on storage.objects;
create policy "moment-covers authenticated update"
  on storage.objects for update
  using (bucket_id = 'moment-covers' and auth.uid() is not null);

drop policy if exists "moment-covers authenticated delete" on storage.objects;
create policy "moment-covers authenticated delete"
  on storage.objects for delete
  using (bucket_id = 'moment-covers' and auth.uid() is not null);
