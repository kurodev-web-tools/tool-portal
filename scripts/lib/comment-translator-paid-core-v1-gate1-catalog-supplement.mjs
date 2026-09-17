import { BACKUP_STRUCTURE_CTES, BACKUP_STRUCTURE_SQL } from './comment-translator-paid-core-v1-gate1-backup-profile.mjs';

// App scope is the existing bridge plus the three preceding migrations.
// Managed metadata is for the backup delta review, never managed data values.
const names = ['comment_translator_real_comments_feed_snapshots', 'user_preferences',
  'comment_translator_creator_waitlist_registrations',
  'apply_comment_translator_paid_entitlement_evidence', 'apply_comment_translator_paid_usage',
  'sync_comment_translator_paid_usage_from_entitlement'];
export const CATALOG_SUPPLEMENT_SQL = `SET LOCAL search_path=pg_catalog,public;
${BACKUP_STRUCTURE_CTES}, selected AS (
 SELECT * FROM objects WHERE value->>1 IN ('auth','storage','supabase_functions','comment_translator_paid_legacy_archive')
 OR (value->>1='public' AND value->>2 IN (${names.map(x=>"'"+x+"'").join(',')}))
), selected_edges AS (
 SELECT jsonb_build_array(d.deptype,to_jsonb(a),to_jsonb(b)) value FROM scoped_dependencies d
 CROSS JOIN LATERAL pg_identify_object(d.classid,d.objid,d.objsubid) a
 CROSS JOIN LATERAL pg_identify_object(d.refclassid,d.refobjid,d.refobjsubid) b
 WHERE (d.classid,d.objid) IN (SELECT classid,objid FROM selected) OR (d.refclassid,d.refobjid) IN (SELECT classid,objid FROM selected)
)
SELECT jsonb_build_object('kind','initialReleaseSupplement',
 'structureSha256',${BACKUP_STRUCTURE_SQL},
 'objects',coalesce((SELECT jsonb_agg(value ORDER BY value::text COLLATE "C") FROM selected),'[]'),
 'dependencies',coalesce((SELECT jsonb_agg(value ORDER BY value::text COLLATE "C") FROM selected_edges),'[]'),
 'archiveSchemaCount',(SELECT count(*) FROM pg_namespace WHERE nspname='comment_translator_paid_legacy_archive'),
 'timezoneColumnPresent',EXISTS(SELECT 1 FROM pg_attribute WHERE attrelid=to_regclass('public.user_preferences') AND attname='time_zone' AND NOT attisdropped),
 'timezoneInvalidRows',CASE WHEN EXISTS(SELECT 1 FROM pg_attribute WHERE attrelid=to_regclass('public.user_preferences') AND attname='time_zone' AND NOT attisdropped)
 THEN ((xpath('/table/row/n/text()',query_to_xml($q$SELECT count(*) n FROM public.user_preferences WHERE time_zone IS NOT NULL AND time_zone<>'UTC' AND time_zone !~ '^[A-Za-z_]+(/[A-Za-z0-9_+.-]+)+$'$q$,false,false,'')))[1]::text)::bigint ELSE NULL END
)::text;
`;
