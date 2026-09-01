-- Gate 1 Production fixed exact counts. Execute only against the Production target.
begin isolation level repeatable read read only;

select 'bridge-relation-1' as relation_label,
       count(*)::bigint as exact_row_count
from public.comment_translator_paid_entitlements;

select 'bridge-relation-2' as relation_label,
       count(*)::bigint as exact_row_count
from public.comment_translator_paid_usage_counters;

select 'bridge-relation-3' as relation_label,
       count(*)::bigint as exact_row_count
from public.comment_translator_paid_usage_events;

commit;
