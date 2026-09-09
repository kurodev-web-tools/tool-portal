// Same-snapshot default table ACL preservation for the reviewed Supabase target.
export const BACKUP_TABLE_DEFAULTS_SQL = `(SELECT coalesce(jsonb_agg(jsonb_build_object('scope',coalesce(n.nspname::text,''),'role',pg_get_userbyid(a.grantee),'privilege',a.privilege_type,'grantable',a.is_grantable) ORDER BY coalesce(n.nspname::text,''),a.grantee,a.privilege_type),'[]'::jsonb)
FROM pg_default_acl d LEFT JOIN pg_namespace n ON n.oid=d.defaclnamespace CROSS JOIN LATERAL aclexplode(d.defaclacl) a
WHERE d.defaclrole='postgres'::regrole AND d.defaclobjtype='r' AND (d.defaclnamespace=0 OR n.nspname='public') AND pg_get_userbyid(a.grantee) IN ('anon','authenticated','service_role'))`;

const reject = code => { throw Error(code); };
export function prepareBackupSchemaWithDefaults(schema, defaults) {
  if(typeof schema!=='string'||!Array.isArray(defaults)||defaults.length>48)reject('BACKUP_DEFAULT_ACL_INVALID');
  const seen=new Set();
  const statements=defaults.map(row=>{
    if(!row||Object.keys(row).sort().join(',')!=='grantable,privilege,role,scope'||!['','public'].includes(row.scope)||
       !['anon','authenticated','service_role'].includes(row.role)||!['SELECT','INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER','MAINTAIN'].includes(row.privilege)||typeof row.grantable!=='boolean')reject('BACKUP_DEFAULT_ACL_INVALID');
    const key=[row.scope,row.role,row.privilege].join(':');if(seen.has(key))reject('BACKUP_DEFAULT_ACL_DUPLICATE');seen.add(key);
    return 'ALTER DEFAULT PRIVILEGES FOR ROLE "postgres"'+(row.scope?' IN SCHEMA "public"':'')+' GRANT '+row.privilege+' ON TABLES TO "'+row.role+'"'+(row.grantable?' WITH GRANT OPTION':'')+';';
  });
  const clear=['',' IN SCHEMA "public"'].map(scope=>'ALTER DEFAULT PRIVILEGES FOR ROLE "postgres"'+scope+' REVOKE ALL ON TABLES FROM "anon", "authenticated", "service_role";').join('\n');
  return clear+'\n'+schema+'\n'+statements.join('\n')+'\n';
}

export function validateBackupTableDefaults(defaults) { prepareBackupSchemaWithDefaults("", defaults); return defaults; }
