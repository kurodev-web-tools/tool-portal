-- Gate 1 Preview fixed exact count. Execute only against the Preview target.
begin isolation level repeatable read read only;

select 'critical-entitlement-relation' as relation_label,
       count(*)::bigint as exact_row_count
from public.comment_translator_paid_entitlements;

commit;
