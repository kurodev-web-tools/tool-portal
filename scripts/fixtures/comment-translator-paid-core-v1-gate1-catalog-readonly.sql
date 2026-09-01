-- Gate 1 sanitized catalog readback. Execute only against an explicitly selected target.
-- Every result is an aggregate or identity/signature projection; no row payload or SQL body is selected.
begin isolation level repeatable read read only;

select current_setting('transaction_read_only') as transaction_read_only,
       current_setting('transaction_isolation') as transaction_isolation;

-- Canonical public RPC identity/signature inventory.
select format('%I.%I(%s)', namespace.nspname, procedure_.proname,
              pg_catalog.pg_get_function_identity_arguments(procedure_.oid)) as rpc_identity
from pg_catalog.pg_proc as procedure_
join pg_catalog.pg_namespace as namespace
  on namespace.oid = procedure_.pronamespace
where namespace.nspname = 'public'
  and procedure_.proname like 'ct_paid_%'
order by rpc_identity;

-- Dependency groups are intentionally separate from the RPC query.
with scoped_dependencies as (
  select
    dependency.classid::regclass::text as classid,
    dependency.refclassid::regclass::text as refclassid,
    dependency.deptype,
    case dependency.classid::regclass::text
      when 'pg_attrdef' then 'column-default'
      when 'pg_class' then case
        when dependent_relation_namespace.nspname = 'public' then 'table'
        when dependent_relation_namespace.nspname like 'pg_%' or dependent_relation_namespace.nspname = 'information_schema' then 'catalog-object'
        else 'external-user-object'
      end
      when 'pg_constraint' then case
        when dependent_constraint_namespace.nspname = 'public' then 'constraint'
        when dependent_constraint_namespace.nspname like 'pg_%' or dependent_constraint_namespace.nspname = 'information_schema' then 'catalog-object'
        else 'external-user-object'
      end
      when 'pg_event_trigger' then 'catalog-object'
      when 'pg_policy' then 'catalog-object'
      when 'pg_proc' then case
        when dependent_function_namespace.nspname = 'public' then 'function'
        when dependent_function_namespace.nspname like 'pg_%' or dependent_function_namespace.nspname = 'information_schema' then 'catalog-object'
        else 'external-user-object'
      end
      when 'pg_trigger' then case
        when dependent_trigger_namespace.nspname = 'public' then 'trigger'
        when dependent_trigger_namespace.nspname like 'pg_%' or dependent_trigger_namespace.nspname = 'information_schema' then 'catalog-object'
        else 'external-user-object'
      end
      when 'pg_type' then case
        when dependent_type_namespace.nspname = 'public' then 'type'
        when dependent_type_namespace.nspname like 'pg_%' or dependent_type_namespace.nspname = 'information_schema' then 'catalog-object'
        else 'external-user-object'
      end
      else 'catalog-object'
    end as dependent_category,
    case dependency.refclassid::regclass::text
      when 'pg_class' then case
        when referenced_relation_namespace.nspname = 'public' then 'table'
        when referenced_relation_namespace.nspname like 'pg_%' or referenced_relation_namespace.nspname = 'information_schema' then 'catalog-object'
        else 'external-user-object'
      end
      when 'pg_constraint' then case
        when referenced_constraint_namespace.nspname = 'public' then 'constraint'
        when referenced_constraint_namespace.nspname like 'pg_%' or referenced_constraint_namespace.nspname = 'information_schema' then 'catalog-object'
        else 'external-user-object'
      end
      when 'pg_language' then 'catalog-object'
      when 'pg_namespace' then 'schema'
      when 'pg_proc' then case
        when referenced_function_namespace.nspname = 'public' then 'function'
        when referenced_function_namespace.nspname like 'pg_%' or referenced_function_namespace.nspname = 'information_schema' then 'catalog-object'
        else 'external-user-object'
      end
      when 'pg_trigger' then case
        when referenced_trigger_namespace.nspname = 'public' then 'trigger'
        when referenced_trigger_namespace.nspname like 'pg_%' or referenced_trigger_namespace.nspname = 'information_schema' then 'catalog-object'
        else 'external-user-object'
      end
      when 'pg_type' then case
        when referenced_type_namespace.nspname = 'public' then 'type'
        when referenced_type_namespace.nspname like 'pg_%' or referenced_type_namespace.nspname = 'information_schema' then 'catalog-object'
        else 'external-user-object'
      end
      else 'catalog-object'
    end as referenced_category
  from pg_catalog.pg_depend as dependency
  left join pg_catalog.pg_class as dependent_relation
    on dependency.classid = 'pg_class'::regclass
   and dependency.objid = dependent_relation.oid
  left join pg_catalog.pg_namespace as dependent_relation_namespace
    on dependent_relation_namespace.oid = dependent_relation.relnamespace
  left join pg_catalog.pg_constraint as dependent_constraint
    on dependency.classid = 'pg_constraint'::regclass
   and dependency.objid = dependent_constraint.oid
  left join pg_catalog.pg_namespace as dependent_constraint_namespace
    on dependent_constraint_namespace.oid = dependent_constraint.connamespace
  left join pg_catalog.pg_proc as dependent_function
    on dependency.classid = 'pg_proc'::regclass
   and dependency.objid = dependent_function.oid
  left join pg_catalog.pg_namespace as dependent_function_namespace
    on dependent_function_namespace.oid = dependent_function.pronamespace
  left join pg_catalog.pg_type as dependent_type
    on dependency.classid = 'pg_type'::regclass
   and dependency.objid = dependent_type.oid
  left join pg_catalog.pg_namespace as dependent_type_namespace
    on dependent_type_namespace.oid = dependent_type.typnamespace
  left join pg_catalog.pg_trigger as dependent_trigger
    on dependency.classid = 'pg_trigger'::regclass
   and dependency.objid = dependent_trigger.oid
  left join pg_catalog.pg_class as dependent_trigger_relation
    on dependent_trigger_relation.oid = dependent_trigger.tgrelid
  left join pg_catalog.pg_namespace as dependent_trigger_namespace
    on dependent_trigger_namespace.oid = dependent_trigger_relation.relnamespace
  left join pg_catalog.pg_class as referenced_relation
    on dependency.refclassid = 'pg_class'::regclass
   and dependency.refobjid = referenced_relation.oid
  left join pg_catalog.pg_namespace as referenced_relation_namespace
    on referenced_relation_namespace.oid = referenced_relation.relnamespace
  left join pg_catalog.pg_constraint as referenced_constraint
    on dependency.refclassid = 'pg_constraint'::regclass
   and dependency.refobjid = referenced_constraint.oid
  left join pg_catalog.pg_namespace as referenced_constraint_namespace
    on referenced_constraint_namespace.oid = referenced_constraint.connamespace
  left join pg_catalog.pg_proc as referenced_function
    on dependency.refclassid = 'pg_proc'::regclass
   and dependency.refobjid = referenced_function.oid
  left join pg_catalog.pg_namespace as referenced_function_namespace
    on referenced_function_namespace.oid = referenced_function.pronamespace
  left join pg_catalog.pg_type as referenced_type
    on dependency.refclassid = 'pg_type'::regclass
   and dependency.refobjid = referenced_type.oid
  left join pg_catalog.pg_namespace as referenced_type_namespace
    on referenced_type_namespace.oid = referenced_type.typnamespace
  left join pg_catalog.pg_trigger as referenced_trigger
    on dependency.refclassid = 'pg_trigger'::regclass
   and dependency.refobjid = referenced_trigger.oid
  left join pg_catalog.pg_class as referenced_trigger_relation
    on referenced_trigger_relation.oid = referenced_trigger.tgrelid
  left join pg_catalog.pg_namespace as referenced_trigger_namespace
    on referenced_trigger_namespace.oid = referenced_trigger_relation.relnamespace
  where (dependency.classid = 'pg_class'::regclass and dependent_relation_namespace.nspname = 'public')
     or (dependency.classid = 'pg_constraint'::regclass and dependent_constraint_namespace.nspname = 'public')
     or (dependency.classid = 'pg_proc'::regclass and dependent_function_namespace.nspname = 'public')
     or (dependency.classid = 'pg_trigger'::regclass and dependent_trigger_namespace.nspname = 'public')
     or (dependency.classid = 'pg_type'::regclass and dependent_type_namespace.nspname = 'public')
     or (dependency.refclassid = 'pg_class'::regclass and referenced_relation_namespace.nspname = 'public')
     or (dependency.refclassid = 'pg_constraint'::regclass and referenced_constraint_namespace.nspname = 'public')
     or (dependency.refclassid = 'pg_proc'::regclass and referenced_function_namespace.nspname = 'public')
     or (dependency.refclassid = 'pg_trigger'::regclass and referenced_trigger_namespace.nspname = 'public')
     or (dependency.refclassid = 'pg_type'::regclass and referenced_type_namespace.nspname = 'public')
)
select classid,
       refclassid,
       deptype,
       dependent_category,
       referenced_category,
       count(*)::bigint as edge_count
from scoped_dependencies
group by classid, refclassid, deptype, dependent_category, referenced_category
order by classid, refclassid, deptype, dependent_category, referenced_category;

-- Estimate-only candidate count. Exact counts are isolated in target-specific fixtures.
select count(*)::bigint as reltuples_non_zero_candidate_count
from pg_catalog.pg_class as relation_
join pg_catalog.pg_namespace as namespace
  on namespace.oid = relation_.relnamespace
where namespace.nspname = 'public'
  and relation_.relkind = 'r'
  and relation_.reltuples > 0
  and relation_.relname like 'comment_translator_paid_%';

commit;
