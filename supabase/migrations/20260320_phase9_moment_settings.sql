-- Phase 9: Moment Settings
-- Adds notification types for role changes, moment deletion, and ownership transfer confirmation.
-- Also adds a metadata column to store contextual info (e.g. moment name after deletion).

alter type notification_type add value if not exists 'role_changed';
alter type notification_type add value if not exists 'moment_deleted';
alter type notification_type add value if not exists 'ownership_transferred_away';

alter table public.notifications add column if not exists metadata jsonb;
