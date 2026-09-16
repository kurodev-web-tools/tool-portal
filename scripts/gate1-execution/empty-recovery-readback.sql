-- Counts and fixed-function identity only: no recipient, URL, credential or job text.
BEGIN READ ONLY;
SET LOCAL statement_timeout = '10000ms';
SET LOCAL lock_timeout = '3000ms';
SET LOCAL search_path = pg_catalog;
SET LOCAL row_security = off;
WITH guard_schema AS (
 SELECT oid,nspowner,nspacl FROM pg_namespace WHERE nspname='gate1_restore_guard'
), guard_function AS (
 SELECT p.* FROM pg_proc p JOIN guard_schema n ON n.oid=p.pronamespace
 WHERE p.proname='deny_delivery' AND p.proargtypes='3802'::oidvector
), acl AS (
 SELECT 'schema' AS object, a.* FROM guard_schema n, LATERAL aclexplode(coalesce(n.nspacl,acldefault('n',n.nspowner))) a
 UNION ALL
 SELECT 'function', a.* FROM guard_function p, LATERAL aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a
), inventory_names(name) AS (
 VALUES ('auth.users'),('auth.sessions'),('storage.buckets'),('storage.objects'),
        ('cron.job'),('net.http_request_queue'),('supabase_functions.hooks')
), inventory AS (
 SELECT name, to_regclass(name) IS NOT NULL AS present,
 CASE WHEN to_regclass(name) IS NOT NULL THEN
 ((xpath('/table/row/count/text()',query_to_xml(format('SELECT count(*) AS count FROM %s',to_regclass(name)),false,false,'')))[1]::text)::bigint
 ELSE NULL END AS rows FROM inventory_names
)
SELECT json_build_object(
 'schemaVersion',1,'readOnly',current_setting('transaction_read_only')='on','rowSecurityOff',current_setting('row_security')='off',
 'role',current_user,'superuser',(SELECT rolsuper FROM pg_roles WHERE rolname=current_user),
 'serverMajor',current_setting('server_version_num')::int/10000,
 'tls',(SELECT ssl FROM pg_stat_ssl WHERE pid=pg_backend_pid()),
 'guard',json_build_object(
   'schemaOwner',(SELECT pg_get_userbyid(nspowner) FROM guard_schema),
   'schemaCount',(SELECT count(*) FROM guard_schema),
   'functionCount',(SELECT count(*) FROM pg_proc WHERE pronamespace=(SELECT oid FROM guard_schema)),
   'relationCount',(SELECT count(*) FROM pg_class WHERE relnamespace=(SELECT oid FROM guard_schema)),
   'typeCount',(SELECT count(*) FROM pg_type WHERE typnamespace=(SELECT oid FROM guard_schema)),
   'defaultAclCount',(SELECT count(*) FROM pg_default_acl WHERE defaclnamespace=(SELECT oid FROM guard_schema)),
   'functionOwner',(SELECT pg_get_userbyid(proowner) FROM guard_function),
   'language',(SELECT l.lanname FROM guard_function p JOIN pg_language l ON l.oid=p.prolang),
   'returnsJsonb',(SELECT prorettype=3802 FROM guard_function),
   'securityDefiner',(SELECT prosecdef FROM guard_function),
   'strict',(SELECT proisstrict FROM guard_function),
   'volatility',(SELECT provolatile FROM guard_function),
   'config',(SELECT proconfig FROM guard_function),
   'bodySha256',(SELECT encode(sha256(convert_to(prosrc,'UTF8')),'hex') FROM guard_function),
   'acl',(SELECT json_agg(json_build_object('object',object,'grantee',CASE WHEN grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(grantee) END,
              'grantor',pg_get_userbyid(grantor),'privilege',privilege_type,'grantable',is_grantable)
              ORDER BY object,grantee,privilege_type) FROM acl),
   'roles',(SELECT json_agg(json_build_object('role',r.rolname,
       'usage',has_schema_privilege(r.oid,(SELECT oid FROM guard_schema),'USAGE'),
       'create',has_schema_privilege(r.oid,(SELECT oid FROM guard_schema),'CREATE'),
       'execute',has_function_privilege(r.oid,(SELECT oid FROM guard_function),'EXECUTE')) ORDER BY r.rolname)
       FROM pg_roles r WHERE r.rolname IN ('anon','authenticated','service_role','supabase_auth_admin'))
 ),
 'inventory',(SELECT json_agg(inventory ORDER BY name) FROM inventory),
 'publicRelations',(SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
   WHERE n.nspname='public' AND c.relkind IN ('r','p','v','m','f','S') AND NOT EXISTS
     (SELECT 1 FROM pg_depend d WHERE d.classid='pg_class'::regclass AND d.objid=c.oid AND d.deptype='e')),
 'publicFunctions',(SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
   WHERE n.nspname='public' AND NOT EXISTS
     (SELECT 1 FROM pg_depend d WHERE d.classid='pg_proc'::regclass AND d.objid=p.oid AND d.deptype='e')),
 'publicTriggers',(SELECT count(*) FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace
   WHERE n.nspname='public' AND NOT t.tgisinternal),
 'eventTriggers',(SELECT coalesce(json_agg(json_build_object('name',e.evtname,'event',e.evtevent,'enabled',e.evtenabled,'tags',e.evttags,
   'owner',pg_get_userbyid(e.evtowner),'function',p.proname||'()',
   'definitionSha256',encode(sha256(convert_to(pg_get_functiondef(e.evtfoid),'UTF8')),'hex')) ORDER BY e.evtname),'[]'::json)
   FROM pg_event_trigger e JOIN pg_proc p ON p.oid=e.evtfoid),
 'foreignServers',(SELECT count(*) FROM pg_foreign_server),
 'subscriptions',(SELECT count(*) FROM pg_subscription),
 'publications',(SELECT count(*) FROM pg_publication_tables),
 'realtimePolicies',(SELECT count(*) FROM pg_policy WHERE polrelid=to_regclass('realtime.messages'))
);
ROLLBACK;
