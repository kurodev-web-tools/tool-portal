import assert from 'node:assert/strict';
import fs from 'node:fs';
import { WAITLIST_CHECKS, WAITLIST_FORWARD, WAITLIST_COUNTS_SELECT } from '../lib/comment-translator-paid-core-v1-gate1-waitlist-checks.mjs';

// Only invoked inside the existing explicitly owned native PostgreSQL harness.
// All rows below are synthetic; failed rows remain untouched until container cleanup.
export function runWaitlistLocalCases({sql, entry, managedSql}) {
  const original=fs.readFileSync('supabase/migrations/20260705000000_comment_translator_creator_waitlist_registrations.sql','utf8');
  const forward=fs.readFileSync(`supabase/migrations/${WAITLIST_FORWARD.version}_${WAITLIST_FORWARD.name}.sql`,'utf8');
  const table='public.comment_translator_creator_waitlist_registrations';
  const quote=x=>x===null?'NULL':"'"+x.replaceAll("'","''")+"'";
  const owner='11111111-1111-4111-8111-111111111111';
  const results=[];
  function setup(suffix,{missing=true,nullable=false}={}) {
    const db='gate1_wl_'+suffix;
    sql('postgres',`CREATE DATABASE ${db} OWNER postgres TEMPLATE template0;`);
    sql(db,'CREATE SCHEMA extensions; CREATE EXTENSION pgcrypto WITH SCHEMA extensions;',true);
    sql(db,managedSql,true);
    sql(db,'SET ROLE postgres;\n'+original,true);
    sql(db,`INSERT INTO auth.users(id) VALUES ('${owner}');`,true);
    if(missing)sql(db,'SET ROLE postgres; '+WAITLIST_CHECKS.map(c=>`ALTER TABLE ${table} DROP CONSTRAINT ${c.name};`).join('\n'),true);
    if(nullable)sql(db,`SET ROLE postgres; ALTER TABLE ${table} ALTER COLUMN campaign DROP NOT NULL, ALTER COLUMN discount_intent DROP NOT NULL;`,true);
    return db;
  }
  const state=db=>sql(db,`BEGIN READ ONLY; SELECT md5(coalesce(string_agg(to_jsonb(t)::text,'' ORDER BY id),'')) FROM ${table} t; ROLLBACK;`);
  const counts=db=>JSON.parse(sql(db,'BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY; '+WAITLIST_COUNTS_SELECT+'; ROLLBACK;'));
  const constraints=db=>JSON.parse(sql(db,`BEGIN READ ONLY; SELECT coalesce(jsonb_agg(jsonb_build_array(conname,pg_get_expr(conbin,conrelid,false),convalidated) ORDER BY conname),'null'::jsonb) FROM pg_constraint WHERE conrelid='${table}'::regclass AND conname IN (${WAITLIST_CHECKS.map(c=>quote(c.name)).join(',')}); ROLLBACK;`));
  function insert(db,[campaign,discount,email,display]) {
    sql(db,`INSERT INTO ${table}(owner_user_id,campaign,discount_intent,account_email,account_display_name) VALUES ('${owner}',${[campaign,discount,email,display].map(quote).join(',')});`,true);
  }
  function apply(db,expected) {
    const before=state(db);let passed=false;
    try{sql(db,'SET ROLE postgres;\n'+forward,true);passed=true;}catch(error){if(expected)throw error;assert.ok(['23514','P0001'].includes(error.sqlState),'expected SQL rejection, not transport failure');}
    assert.equal(passed,expected);assert.equal(state(db),before,'migration never edits existing rows');
    if(expected){const c=constraints(db);assert.equal(c.length,4);for(const e of WAITLIST_CHECKS)assert.deepEqual(c.find(x=>x[0]===e.name),[e.name,e.canonical,true]);}
    return {success:passed,dataUnchanged:true};
  }
  const cases=[
    ['valid',['campaign','first_month_discount',null,null],[0,0,0,0]],
    ['campaign',['   ','first_month_discount',null,null],[1,0,0,0]],
    ['discount',['campaign','wrong',null,null],[0,1,0,0]],
    ['email',['campaign','first_month_discount','あ'.repeat(321),null],[0,0,1,0]],
    ['display',['campaign','first_month_discount',null,'😀'.repeat(161)],[0,0,0,1]],
    ['multiple',['','wrong','x'.repeat(321),'x'.repeat(161)],[1,1,1,1]],
    ['boundary',['\t','first_month_discount','あ'.repeat(320),'😀'.repeat(160)],[0,0,0,0]],
    ['empty_optional',['campaign','first_month_discount','',''],[0,0,0,0]],
    ['null',[null,null,null,null],[0,0,0,0]],
  ];
  for(const [name,row,violations] of cases){
    const db=setup(name,{nullable:name==='null'});insert(db,row);const observed=counts(db);
    const expected={total:1,...Object.fromEntries(WAITLIST_CHECKS.map((c,i)=>[c.key,violations[i]])),anyViolation:violations.some(Boolean)?1:0};
    assert.deepEqual(observed,expected);
    // Exercise actual CHECK semantics independently from the migration's NOT NULL shape guard.
    if(name==='null'){
      sql(db,'SET ROLE postgres; '+WAITLIST_CHECKS.map(c=>`ALTER TABLE ${table} ADD CONSTRAINT ${c.name} CHECK (${c.expression});`).join('\n'),true);
      assert.equal(constraints(db).length,4);results.push({name,counts:observed,...apply(db,false),reason:'nullable shape rejected; CHECK NULL accepted'});
    }else results.push({name,counts:observed,...apply(db,!violations.some(Boolean))});
    if(name==='valid'||name==='multiple'){
      const beforeEntry=state(db);const receipt=entry(db);assert.equal(receipt.status,'WAITLIST_COUNTS_ACQUIRED');assert.deepEqual(receipt.counts,expected);
      assert.equal(receipt.readOnly.transactionReadOnly,'on');assert.equal(receipt.readOnly.transactionIsolation,'repeatable read');
      assert.equal(state(db),beforeEntry);results.at(-1).formalEntry=true;
    }
  }
  const mixed=setup('mixed');insert(mixed,['campaign','first_month_discount',null,null]);insert(mixed,['','wrong','x'.repeat(321),'x'.repeat(161)]);
  assert.deepEqual(counts(mixed),{total:2,campaign:1,discountIntent:1,email:1,displayName:1,anyViolation:1});results.push({name:'mixed',...apply(mixed,false)});assert.equal(constraints(mixed),null,'failed DO rolls back earlier added checks');
  const existing=setup('existing',{missing:false});insert(existing,['campaign','first_month_discount',null,null]);results.push({name:'preview_existing',...apply(existing,true)});
  const fresh=setup('fresh',{missing:false});results.push({name:'fresh_install',...apply(fresh,true)});assert.deepEqual(constraints(fresh),constraints(existing));
  const wrong=setup('wrong');sql(wrong,`SET ROLE postgres; ALTER TABLE ${table} ADD CONSTRAINT ${WAITLIST_CHECKS[0].name} CHECK (length(trim(campaign)) >= 0);`,true);results.push({name:'same_name_wrong_definition',...apply(wrong,false)});
  const invalid=setup('not_valid');sql(invalid,`SET ROLE postgres; ALTER TABLE ${table} ADD CONSTRAINT ${WAITLIST_CHECKS[0].name} CHECK (${WAITLIST_CHECKS[0].expression}) NOT VALID;`,true);results.push({name:'unvalidated_existing',...apply(invalid,false)});
  const shape=setup('wrong_type');sql(shape,`SET ROLE postgres; ALTER TABLE ${table} ALTER COLUMN account_email TYPE varchar(320);`,true);results.push({name:'wrong_column_type',...apply(shape,false)});
  return results;
}
