-- ── Terms/Privacy acceptance tracking ───────────────────────────────────────
-- Records which version of the Terms of Service and Privacy Policy each user
-- accepted at signup, and when. This is what makes Terms Section 11 ("we'll
-- notify users of material changes before they take effect") actionable: with a
-- recorded version we can later tell who accepted an older version and needs to
-- re-accept.
--
-- All columns are nullable so existing rows and the invite-completion flow
-- (app/api/complete-profile) are unaffected — only the standard signup path
-- populates them (via signup metadata read by handle_new_auth_user below).

alter table public.users
  add column if not exists terms_version      text,
  add column if not exists terms_accepted_at  timestamptz,
  add column if not exists privacy_version    text,
  add column if not exists privacy_accepted_at timestamptz;

-- Extend the auth-signup trigger to persist the accepted versions passed in the
-- signup metadata (options.data.terms_version / privacy_version). Stamps the
-- acceptance time with now() only when a version is present.
create or replace function public.handle_new_auth_user()
 returns trigger
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
begin
  if new.raw_user_meta_data->>'username' is not null then
    insert into public.users (
      id, email, first_name, last_name, username,
      terms_version, terms_accepted_at,
      privacy_version, privacy_accepted_at
    )
    values (
      new.id,
      new.email,
      new.raw_user_meta_data->>'first_name',
      new.raw_user_meta_data->>'last_name',
      new.raw_user_meta_data->>'username',
      new.raw_user_meta_data->>'terms_version',
      case when new.raw_user_meta_data->>'terms_version' is not null then now() end,
      new.raw_user_meta_data->>'privacy_version',
      case when new.raw_user_meta_data->>'privacy_version' is not null then now() end
    );
  end if;
  return new;
end;
$function$;
