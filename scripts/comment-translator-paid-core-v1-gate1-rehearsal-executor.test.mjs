import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {createRehearsalExecutor,createRehearsalAttemptLedger,prepareManagedRehearsalInvocation,REHEARSAL_IDENTITY_SQL} from './lib/comment-translator-paid-core-v1-gate1-rehearsal-executor.mjs';
import {REHEARSAL_TRANSFER_TABLES,REHEARSAL_READBACK_SQL} from './lib/comment-translator-paid-core-v1-gate1-rehearsal-transfer.mjs';
const hash=x=>createHash('sha256').update(x).digest('hex'),ids=[1,2,3].map(i=>'00000000-0000-4000-8000-'+String(i).padStart(12,'0'));
const packet=()=>({scope:'LOCAL_SYNTHETIC_ONLY',managedShapeSha256:'2c7ef5df6baeae47ac2dd21b566e77177578cc2aa7c36d5921866434f4bc2d4c',targetBaselineSha256:hash('{"tables":{}}'),userIds:ids,tables:REHEARSAL_TRANSFER_TABLES.map(name=>({name,columns:[{name:name==='auth.users'?'id':'user_id',type:'uuid',generated:''}],rows:name==='auth.users'?ids.map((id,i)=>({id,email:['magiclink','recovery','email_change'][i]+'@example.test'})):name.startsWith('public.')?ids.map(user_id=>({user_id})):[]}))});
function fixture(overrides={}){
 const calls=[];let clock=0,readbacks=0,used=false;
 const transport={requiresTls:false,verify:()=>true,claim:()=>{if(used)throw Error();used=true;calls.push('claim');return true;},stop:async()=>{calls.push('stop');return true;},execute:async sql=>{calls.push(sql===REHEARSAL_IDENTITY_SQL?'identity':sql===REHEARSAL_READBACK_SQL?'readback':'transfer');if(sql===REHEARSAL_IDENTITY_SQL)return JSON.stringify({role:'postgres',database:'postgres',superuser:false,serverMajor:17,tls:false});if(sql===REHEARSAL_READBACK_SQL)return ++readbacks===1?'{"tables":{}}':'{"tables":{"restored":true}}';return '{"kind":"synthetic-rehearsal-precommit-v1","fingerprint":{"tables":{"restored":true}}}';},...overrides};
 return {calls,transport,advance:()=>{clock=60001;},run:()=>createRehearsalExecutor(transport,{now:()=>clock}).run(packet(),{assertFreshFixtures:()=>true,timeoutMs:60000})};
}
test('claims once, verifies the committed result independently and forbids reuse',async()=>{const f=fixture();const r=await f.run();assert.equal(r.status,'SYNTHETIC_TRANSFER_VERIFIED');assert.equal(r.stageAuthority,false);assert.deepEqual(f.calls,['identity','readback','claim','transfer','readback']);await assert.rejects(f.run());assert.equal(f.calls.includes('stop'),false);});
test('failure before ownership does not stop another attempt',async()=>{const f=fixture({verify:()=>false});await assert.rejects(f.run(),e=>e.attemptOwned===false);assert.deepEqual(f.calls,[]);});
test('an uncertain commit stops the owned target and remains a used attempt',async()=>{const f=fixture();const real=f.transport.execute;f.transport.execute=async sql=>{if(sql!==REHEARSAL_IDENTITY_SQL&&sql!==REHEARSAL_READBACK_SQL)throw Error('private payload');return real(sql);};await assert.rejects(f.run(),e=>e.message==='REHEARSAL_EXECUTION_REJECTED'&&e.attemptOwned&&e.stopConfirmed);assert.equal(f.calls.filter(c=>c==='stop').length,1);await assert.rejects(f.run());assert.equal(f.calls.filter(c=>c==='stop').length,1);});
test('timeout after a successful transfer still stops and never reports accepted',async()=>{const f=fixture();const real=f.transport.execute;f.transport.execute=async sql=>{const r=await real(sql);if(sql.includes('COMMIT;'))f.advance();return r;};await assert.rejects(f.run(),e=>e.attemptOwned&&e.stopConfirmed);});
test('missing TLS, superuser and mismatched independent readback fail closed',async()=>{for(const mutation of ['tls','superuser','readback']){let seen=0;const f=fixture({requiresTls:true});const real=f.transport.execute;f.transport.execute=async sql=>{const v=JSON.parse(await real(sql));if(sql===REHEARSAL_IDENTITY_SQL){v.tls=mutation!=='tls';v.superuser=mutation==='superuser';}if(sql===REHEARSAL_READBACK_SQL&&++seen===2&&mutation==='readback')v.tables={wrong:true};return JSON.stringify(v);};await assert.rejects(f.run());}});
test('persistent target claim survives a new ledger instance and a corrupt receipt',()=>{
 fs.mkdirSync('.tmp',{recursive:true});const root=fs.mkdtempSync(path.resolve('.tmp/rehearsal-ledger-')),resource=hash('isolated fixture');
 assert.equal(createRehearsalAttemptLedger(root).claim(resource),true);
 assert.throws(()=>createRehearsalAttemptLedger(root).claim(resource));
 fs.writeFileSync(path.join(root,resource+'.json'),'');assert.throws(()=>createRehearsalAttemptLedger(root).claim(resource));
});
test('managed invocation is bound to the approved recovery, TLS and normal postgres',()=>{
 const ref='abcdefghijklmnopqrst',ca='synthetic certificate';
 const binding={schemaVersion:1,target:'recovery',connectionMode:'direct',projectRef:ref,host:'db.'+ref+'.supabase.co',port:5432,database:'postgres',user:'postgres',sslMode:'verify-full',caSha256:hash(ca)};
 const env={PATH:process.env.PATH,PGHOST:binding.host,PGPORT:'5432',PGDATABASE:'postgres',PGUSER:'postgres',PGSSLMODE:'verify-full',PGSSLROOTCERT:'synthetic-ca',PGPASSWORD:'synthetic'};
 const options={bindingJson:JSON.stringify(binding),env,approvedRecoveryRef:ref,protectedProjectRefs:['bbbbbbbbbbbbbbbbbbbb','cccccccccccccccccccc'],fsApi:{lstatSync:()=>({isFile:()=>true}),readFileSync:()=>Buffer.from(ca)}};
 const r=prepareManagedRehearsalInvocation(options);assert.equal(r.env.PGSSLMODE,'verify-full');assert.match(r.env.PGOPTIONS,/default_transaction_read_only=off/);assert.equal(r.args.includes('--no-psqlrc'),true);assert.equal(r.args.includes('--file=-'),true);
 for(const changed of [{approvedRecoveryRef:'bbbbbbbbbbbbbbbbbbbb'},{protectedProjectRefs:[ref,'cccccccccccccccccccc']},{env:{...env,PGHOSTADDR:'127.0.0.1'}},{env:{...env,PGSSLMODE:'require'}},{bindingJson:JSON.stringify({...binding,target:'preview'})},{bindingJson:JSON.stringify({...binding,target:'production'})}])assert.throws(()=>prepareManagedRehearsalInvocation({...options,...changed}));
});
