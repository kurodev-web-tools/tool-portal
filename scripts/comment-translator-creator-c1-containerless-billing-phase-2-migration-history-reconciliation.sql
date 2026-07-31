with known_migrations(version, ordinal) as (
  values
    ('20260527000000', 1),
    ('20260601000000', 2),
    ('20260615000000', 3),
    ('20260615001000', 4),
    ('20260623000000', 5),
    ('20260624000000', 6),
    ('20260705000000', 7),
    ('20260706073204', 8),
    ('20260722000000', 9),
    ('20260722001000', 10),
    ('20260722002000', 11),
    ('20260722003000', 12),
    ('20260723000000', 13),
    ('20260723001000', 14),
    ('20260723002000', 15),
    ('20260723003000', 16),
    ('20260730000000', 17)
),
remote_history as (
  select distinct version::text as version
  from supabase_migrations.schema_migrations
),
matrix as (
  select
    known.version,
    known.ordinal,
    case
      when remote.version is null then 'absent'
      else 'present'
    end::text as status
  from known_migrations known
  left join remote_history remote on remote.version = known.version
),
known_counts as (
  select
    count(*) filter (where status = 'present')::integer
      as known_present_count,
    count(*) filter (where status = 'absent')::integer
      as known_absent_count
  from matrix
),
unknown_count as (
  select count(*)::integer as unknown_remote_migration_count
  from remote_history remote
  left join known_migrations known on known.version = remote.version
  where known.version is null
)
select
  string_agg(
    matrix.version || ':' || matrix.status,
    '|' order by matrix.ordinal
  )::text as known_migration_matrix,
  known_counts.known_present_count,
  known_counts.known_absent_count,
  unknown_count.unknown_remote_migration_count,
  case
    when max(matrix.status) filter (where matrix.ordinal = 17) = 'absent'
      then 'pending'
    else 'not-pending'
  end::text as target_pending_status
from matrix
cross join known_counts
cross join unknown_count
group by
  known_counts.known_present_count,
  known_counts.known_absent_count,
  unknown_count.unknown_remote_migration_count;
