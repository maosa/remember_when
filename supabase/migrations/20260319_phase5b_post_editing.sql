-- Phase 5b: Post editing
-- Run this in the Supabase SQL editor.
-- Fully idempotent — safe to re-run.

-- Track when a post was last edited (null = never edited)
alter table public.posts
  add column if not exists edited_at timestamptz;

-- Soft-delete individual media items without affecting the post
alter table public.post_media
  add column if not exists deleted_at timestamptz;
