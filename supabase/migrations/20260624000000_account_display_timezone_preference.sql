-- Account display timezone preference.
-- Review and apply only after explicit remote schema approval.

alter table public.user_preferences
  add column if not exists time_zone text;

alter table public.user_preferences
  drop constraint if exists user_preferences_time_zone_format;

alter table public.user_preferences
  add constraint user_preferences_time_zone_format
  check (
    time_zone is null
    or time_zone = 'UTC'
    or time_zone ~ '^[A-Za-z_]+(/[A-Za-z0-9_+.-]+)+$'
  );

comment on column public.user_preferences.time_zone is
  'Shared display timezone preference, stored as an IANA timezone name such as Asia/Tokyo. Display-only; quota and rate-limit authority remains UTC-based.';
