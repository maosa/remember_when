-- ─────────────────────────────────────────────────────────────────────────────
-- Phase 7b (drift reconciliation)
--
-- Auto-create a notification_preferences row whenever a public.users row is
-- created. Lives here (after phase7 creates notification_preferences) because
-- the function inserts into that table. Exists in prod but was untracked in the
-- repo. Idempotent — a no-op against the existing prod DB.
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.handle_new_user_preferences()
 returns trigger
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
begin
  insert into public.notification_preferences (user_id) values (new.id);
  return new;
end;
$function$;

create or replace trigger on_user_created_preferences
  after insert on public.users
  for each row execute function public.handle_new_user_preferences();
