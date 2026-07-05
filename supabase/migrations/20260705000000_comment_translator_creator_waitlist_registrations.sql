create table if not exists public.comment_translator_creator_waitlist_registrations (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  account_email text,
  account_display_name text,
  campaign text not null default 'creator_closed_beta_2026',
  status text not null default 'registered' check (
    status in ('registered', 'invited', 'discount_eligible', 'discount_used', 'cancelled')
  ),
  discount_intent text not null default 'first_month_discount',
  registered_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint comment_translator_creator_waitlist_campaign_nonempty check (length(trim(campaign)) > 0),
  constraint comment_translator_creator_waitlist_discount_intent_check check (
    discount_intent = 'first_month_discount'
  ),
  constraint comment_translator_creator_waitlist_account_email_length check (
    account_email is null or length(account_email) <= 320
  ),
  constraint comment_translator_creator_waitlist_display_name_length check (
    account_display_name is null or length(account_display_name) <= 160
  )
);

alter table public.comment_translator_creator_waitlist_registrations enable row level security;

revoke all on table public.comment_translator_creator_waitlist_registrations from anon;
revoke all on table public.comment_translator_creator_waitlist_registrations from authenticated;
grant all on table public.comment_translator_creator_waitlist_registrations to service_role;

drop policy if exists "comment_translator_creator_waitlist_service_role_all"
  on public.comment_translator_creator_waitlist_registrations;
create policy "comment_translator_creator_waitlist_service_role_all"
  on public.comment_translator_creator_waitlist_registrations
  for all
  to service_role
  using (true)
  with check (true);

create unique index if not exists comment_translator_creator_waitlist_owner_campaign_key
  on public.comment_translator_creator_waitlist_registrations (owner_user_id, campaign);

create index if not exists comment_translator_creator_waitlist_campaign_registered_idx
  on public.comment_translator_creator_waitlist_registrations (campaign, registered_at desc);

comment on table public.comment_translator_creator_waitlist_registrations is
  'Server-owned Creator closed beta pre-registration rows. Service-role only; public UI receives sanitized registration state.';
comment on column public.comment_translator_creator_waitlist_registrations.owner_user_id is
  'Trusted server ownership reference used for duplicate prevention and account cleanup. This value is never public-browser-readable.';
comment on column public.comment_translator_creator_waitlist_registrations.account_email is
  'Admin-only account email captured from Supabase Auth at registration time when available.';
comment on column public.comment_translator_creator_waitlist_registrations.account_display_name is
  'Admin-only display name captured from existing account metadata when available.';
comment on column public.comment_translator_creator_waitlist_registrations.discount_intent is
  'Future Stripe eligibility intent only. This migration does not create coupons, promotion codes, Checkout, Portal, or webhooks.';
