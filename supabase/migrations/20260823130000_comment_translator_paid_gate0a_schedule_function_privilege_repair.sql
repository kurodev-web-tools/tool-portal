-- Comment Translator Paid Core v1 Gate 0-A: close the public execute
-- privilege left on the trigger-only SECURITY DEFINER schedule function.
-- This is repository-side migration source only; remote apply is a separate gate.

revoke all on function public.ct_paid_schedule_unbound_checkout_recovery()
  from public, anon, authenticated;
grant execute on function public.ct_paid_schedule_unbound_checkout_recovery()
  to service_role;
