import fs from 'node:fs';
import path from 'node:path';
import dns from 'node:dns/promises';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {ROOT,sha,requireLiveAuthorization,record} from './execution-inputs.mjs';
import {beginProducer,finishProducer,previewInvocation,runReadOnlySql,getJson} from './fresh-common.mjs';
import {failureDetail,httpSummary,nativeSummary} from './native-diagnostic.mjs';
const rejected=failures=>Object.assign(Error('FRESH_NATIVE_CHECK_REJECTED'),{nativeFailures:failures});
async function check(phase,name,action,detail={}){
 const startedAt=Date.now();try{return await action(detail);}catch(e){throw rejected([failureDetail(phase,detail.check??name,e,startedAt,detail)]);}
}
async function lookupBounded(host){let timer;try{return await Promise.race([dns.lookup(host,{all:true}),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('DNS_DEADLINE')),3000);})]);}finally{clearTimeout(timer);}}
export function classifyApi(receipt,kind){
 const b=receipt.value;let classification='UNKNOWN';
 if(receipt.complete&&receipt.elapsedMs>=0&&receipt.elapsedMs<=3000&&receipt.bodyBytes>0&&receipt.bodyBytes<=8192){
  if(kind==='auth'&&receipt.status===200&&b?.name==='GoTrue'&&typeof b.version==='string'&&b.version.length>0&&typeof b.description==='string'&&Object.keys(b).sort().join(',')==='description,name,version')classification='AUTH_HEALTH';
  if(kind==='table'&&receipt.status===401&&Object.keys(b??{}).sort().join(',')==='code,details,hint,message'&&b.code==='42501'&&b.message==='permission denied for table comment_translator_paid_entitlements'&&b.details===null&&(b.hint===null||typeof b.hint==='string'))classification='EXPECTED_TABLE_PERMISSION_DENIED';
  if(kind==='invalidKey'&&receipt.status===401&&/invalid api key|no api key/i.test(b?.message??''))classification='GATEWAY_KEY_REJECTED';
 }
 assert.notEqual(classification,'UNKNOWN');return {status:receipt.status,complete:receipt.complete,classification,bodyBytes:receipt.bodyBytes,elapsedMs:receipt.elapsedMs};
}
export async function collectNative(input,{closure=false}={}){
 if(closure)requireLiveAuthorization({closure:true});
 const context=await check('producer','begin',()=>closure?{startedAt:Date.now()}:beginProducer('native')),prepared=await check('producer','prepare',()=>previewInvocation({closure})),binding=prepared.saved.binding;
 await check('producer','binding',()=>{assert.equal(input.projectRef,binding.projectRef);assert.match(input.key,/^sb_publishable_[A-Za-z0-9_-]{10,200}$/);});
 const routes={auth:'/auth/v1/health',table:'/rest/v1/comment_translator_paid_entitlements?select=*&limit=0',invalidKey:'/auth/v1/health'};
 // All three requests are already issued once. Settle their bounded results so
 // the first rejection cannot discard another API's failure. No retry is added.
 const settled=await Promise.allSettled(Object.entries(routes).map(([kind,route])=>check('api',kind,async detail=>{
  const r=await getJson({hostname:binding.projectRef+'.supabase.co',route,headers:{apikey:kind==='invalidKey'?'sb_publishable_invalid_synthetic_probe':input.key}});detail.http=httpSummary(r);return [kind,classifyApi(r,kind)];
 })));
 const failures=settled.filter(r=>r.status==='rejected').flatMap(r=>r.reason.nativeFailures);if(failures.length)throw rejected(failures);
 const http=Object.fromEntries(settled.map(r=>r.value));
 const addresses=await check('dns','first',async()=>{const first=await lookupBounded(binding.host),values=[...new Set(first.map(x=>x.address))];assert.ok(values.length>=1&&values.length<=8);return values;});
 const sql=await check('producer','sql',()=>{const transport=fs.readFileSync('scripts/lib/comment-translator-paid-core-v1-gate1-watchdog-transport.mjs','utf8'),match=transport.match(/^const SQL = ("(?:[^"\\]|\\.)*");$/m);assert.ok(match);return JSON.parse(match[1]);});
 const rows=[];
 for(const [addressIndex,address] of addresses.entries())await check('native','positive',detail=>{
  const r=runReadOnlySql(prepared,sql,{PGHOSTADDR:address});detail.native=nativeSummary(r);
  detail.check='positive-exit';assert.equal(r.status,0);
  detail.check='positive-stderr';assert.equal(r.stderr,'');
  detail.check='positive-spawn';assert.equal(r.error,undefined);
  detail.check='positive-signal';assert.equal(r.signal,null);
  detail.check='positive-json';const v=JSON.parse(r.stdout);
  detail.check='positive-contract';assert.deepEqual(v,{serverMajor:17,readOnly:'on',tls:true,anonSelect:false});
  rows.push({addressSha256:sha(address),nativeExit:r.status,stderrBytes:Buffer.byteLength(r.stderr),...v});
 },{addressIndex});
 const negative=await check('native','negative',detail=>{
  const r=runReadOnlySql(prepared,'SELECT 1;',{PGHOSTADDR:addresses[0],PGHOST:'hostname-mismatch.invalid'});detail.native=nativeSummary(r);
  detail.check='negative-exit';assert.ok(Number.isInteger(r.status)&&r.status!==0);
  detail.check='negative-stdout';assert.equal(r.stdout,'');
  detail.check='hostname-mismatch';assert.match(r.stderr,/certificate.*does not match host name/i);return r;
 },{addressIndex:0});
 await check('dns','stable',async()=>{const last=[...new Set((await lookupBounded(binding.host)).map(x=>x.address))].sort();assert.deepEqual(last,[...addresses].sort());});
 const finish=value=>closure?record(ROOT,'control/independent-close-preview-native.json',{...value,startedAt:context.startedAt,completedAt:Date.now()}):finishProducer(context,value);
 return check('producer','finish',()=>finish({target:'preview',bindingSha256:prepared.saved.bindingSha256,dbWrites:0,addresses:rows,addressSetStable:true,hostnameMismatch:{exitCode:negative.status,stdoutBytes:0,errorClass:'CERTIFICATE_HOST_MISMATCH'},http}));
}
if(process.argv[1]&&fileURLToPath(import.meta.url)===path.resolve(process.argv[1])){try{
 await check('entry','authorization',()=>requireLiveAuthorization());await check('entry','arguments',()=>assert.equal(process.argv.length,2));
 const input=await check('entry','input',async()=>{let value='';for await(const c of process.stdin){value+=c;assert.ok(Buffer.byteLength(value)<=8192);}return JSON.parse(value);});
 console.log(JSON.stringify(await collectNative(input)));
}catch(e){console.log(JSON.stringify({status:'FRESH_NATIVE_REJECTED',schemaVersion:1,failures:e.nativeFailures??[failureDetail('entry','input',e,Date.now())]}));process.exitCode=1;}}
