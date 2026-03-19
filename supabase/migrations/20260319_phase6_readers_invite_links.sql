-- Phase 6: Readers & Invite Links
-- Run this in the Supabase SQL editor.
-- Fully idempotent — safe to re-run.

-- ─────────────────────────────────────────────────────────────
-- 1. invite_links (shareable join links; at most one per moment)
-- ─────────────────────────────────────────────────────────────
create table if not exists public.invite_links (
  id          uuid        primary key default gen_random_uuid(),
  moment_id   uuid        not null references public.moments(id) on delete cascade,
  created_by  uuid        not null references public.users(id) on delete cascade,
  token       uuid        not null default gen_random_uuid() unique,
  expires_at  timestamptz,          -- null = never expires
  created_at  timestamptz not null default now(),
  constraint invite_links_moment_unique unique (moment_id)
);

alter table public.invite_links enable row level security;

-- Only accepted participants (owner + accepted members) can view their moment's link.
drop policy if exists "Accepted participants can view invite link" on public.invite_links;
create policy "Accepted participants can view invite link"
  on public.invite_links for select
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
              and moment_members.status = 'accepted'
          )
        )
    )
  );

-- ─────────────────────────────────────────────────────────────
-- 2. Extend notification_type for post events (idempotent)
-- ─────────────────────────────────────────────────────────────
-- NOTE: these lines only work if notification_type is a PostgreSQL enum.
-- If using a text CHECK constraint instead, skip these lines and widen
-- the check constraint manually.
alter type notification_type add value if not exists 'new_post';
alter type notification_type add value if not exists 'moment_invite_declined';
