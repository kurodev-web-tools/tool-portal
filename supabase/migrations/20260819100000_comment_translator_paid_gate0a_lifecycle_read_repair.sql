-- Gate 0-A lifecycle read repair.
-- The trusted server checkout preflight reads these rows through the service-role
-- Supabase client. Keep the entitlement table behind ct_paid_read_entitlement;
-- this repair only restores the direct read path required by the existing store.
grant select on table public.comment_translator_paid_customers to service_role;
grant select on table public.comment_translator_paid_billing_lifecycles to service_role;
grant select on table public.comment_translator_paid_checkout_holds to service_role;
grant select on table public.comment_translator_paid_checkout_session_bindings to service_role;
grant select on table public.comment_translator_paid_subscription_bindings to service_role;
