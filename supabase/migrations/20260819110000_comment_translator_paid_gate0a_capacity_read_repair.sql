-- Gate 0-A capacity read repair.
-- The checkout safety reader uses the trusted server client for these two
-- bounded capacity reads. Keep poll-budget and entitlement rows behind their
-- existing RPC authorities and do not expose these tables to public roles.
grant select on table public.comment_translator_paid_capacity_config to service_role;
grant select on table public.comment_translator_paid_capacity_reservations to service_role;
