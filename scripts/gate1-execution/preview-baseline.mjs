import {nativeBinding} from './execution-inputs.mjs';
import {ROOT} from './execution-inputs.mjs';
import {requireLiveAuthorization} from './execution-inputs.mjs';
const authorization=requireLiveAuthorization({closure:true});
import fs from 'node:fs';
import path from 'node:path';
import https from 'node:https';
import dns from 'node:dns/promises';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {buildPsqlInvocation} from '../comment-translator-paid-core-v1-gate1-preflight-readonly.mjs';
let data=''; for await(const c of process.stdin){data+=c;if(data.length>8192)throw Error('INPUT_LIMIT');}
const input=JSON.parse(data);
const p=nativeBinding('preview',{closure:true}),b=p.binding;
assert.equal(b.target,'preview');assert.equal(input.projectRef,b.projectRef);assert.match(input.key,/^sb_publishable_[A-Za-z0-9_-]{10,200}$/);
const report={scope:'preview_postresume_readonly_observer',sourceCommit:authorization.sourceCommit,target:'preview',observedAt:new Date().toISOString(),status:'NOT_ACCEPTED',dbWrites:0,stopEligible:false};
const exact=(value,keys)=>value&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).sort().join(',')===[...keys].sort().join(',');
const http=(route,key)=>new Promise(resolve=>{
 let req,res,timer,done=false,parts=[],size=0;
 const end=v=>{if(done)return;done=true;clearTimeout(timer);res?.destroy();req?.destroy();resolve(v);};
 try{req=https.request({hostname:b.projectRef+'.supabase.co',path:route,method:'GET',agent:false,rejectUnauthorized:true,headers:{apikey:key,Accept:'application/json'}},r=>{
  res=r;r.on('data',chunk=>{size+=chunk.length;if(size>65536)end({class:'UNKNOWN_SIZE'});else parts.push(chunk);});
  r.on('error',()=>end({class:'UNKNOWN_RESPONSE'}));
  r.on('end',()=>{let body;try{body=JSON.parse(Buffer.concat(parts).toString('utf8'));}catch{}
   const msg=body?.message??'';
   const cls=body?.message==='Access to schema is forbidden'?'OPENAPI_ACCESS_RESTRICTED':
     exact(body,['code','message','details','hint'])&&body.details===null&&(body.hint===null||typeof body.hint==='string')&&body.code==='42501'&&/^permission denied for table comment_translator_paid_entitlements$/.test(msg)?'EXPECTED_TABLE_PERMISSION_DENIED':
     r.statusCode===200&&exact(body,['name','version','description'])&&body.name==='GoTrue'&&typeof body.version==='string'&&body.version.length>0&&typeof body.description==='string'?'AUTH_HEALTH':
     /invalid api key|no api key/i.test(msg)?'GATEWAY_KEY_REJECTED':'UNCLASSIFIED';
   end({status:r.statusCode,class:cls,arrayRows:Array.isArray(body)?body.length:null});
  });
 });timer=setTimeout(()=>end({class:'UNKNOWN_TIMEOUT'}),5000);req.on('error',()=>end({class:'UNKNOWN_NETWORK_OR_TLS'}));req.end();
 }catch{end({class:'UNKNOWN_REQUEST'});}
});
report.http={};
const httpResults=await Promise.all([
 http('/auth/v1/health',input.key),
 http('/rest/v1/comment_translator_paid_entitlements?select=*&limit=0',input.key),
 http('/auth/v1/health','sb_publishable_invalid_synthetic_probe')
]);
['auth','table','invalidKey'].forEach((key,i)=>report.http[key]=httpResults[i]);
try{
 const addresses=await dns.lookup(b.host,{all:true});assert.ok(addresses.length>0&&addresses.length<=8);
 const unique=[...new Set(addresses.map(a=>a.address))];
 const bin=p.postgresBin;
 const password=fs.readFileSync(p.credentialFile,'utf8').replace(/^\uFEFF/,'').replace(/\r?\n$/,'');
 assert.ok(password&&!/[\r\n\0]/.test(password));
 const env={PATH:bin+path.delimiter+process.env.PATH,SystemRoot:process.env.SystemRoot,PGHOST:b.host,PGPORT:'5432',PGDATABASE:'postgres',PGUSER:'postgres',PGSSLMODE:'verify-full',PGSSLROOTCERT:p.caFile,PGPASSWORD:password};
 const inv=buildPsqlInvocation(b,env);assert.equal(inv.ok,true);
 const transportPath='scripts/lib/comment-translator-paid-core-v1-gate1-watchdog-transport.mjs';
 const committed=spawnSync('git',['show',report.sourceCommit+':'+transportPath]);
 assert.equal(committed.status,0);assert.equal(committed.stderr.length,0);
 const sourceBytes=fs.readFileSync(transportPath);assert.equal(sourceBytes.equals(committed.stdout),true);
 const sourceText=sourceBytes.toString('utf8');
 const sqlMatch=sourceText.match(/^const SQL = ("(?:[^"\\]|\\.)*");$/m);assert.ok(sqlMatch);const sql=JSON.parse(sqlMatch[1]);
 report.sqlFromPublishedTransport=true;
 const results=[];
 for(const address of unique){
  const r=spawnSync(path.join(bin,'psql.exe'),inv.args,{env:{...inv.env,PGHOSTADDR:address,PGCONNECT_TIMEOUT:'3'},input:sql,encoding:'utf8',windowsHide:true,shell:false,timeout:7000,maxBuffer:65536});
  let value;try{value=JSON.parse(r.stdout);}catch{}
  results.push({nativeSuccess:r.status===0&&!r.stderr&&exact(value,['serverMajor','readOnly','tls','anonSelect'])&&value.readOnly==='on'&&value.serverMajor===17&&value.tls===true,anonSelect:value?.anonSelect??null});
 }
 report.direct={addressCount:unique.length,allPinnedNativeTlsPassed:results.every(x=>x.nativeSuccess),anonSelectDenied:results.every(x=>x.anonSelect===false)};
 const negative=spawnSync(path.join(bin,'psql.exe'),inv.args,{env:{...inv.env,PGHOSTADDR:unique[0],PGHOST:'hostname-mismatch.invalid',PGCONNECT_TIMEOUT:'3'},input:'SELECT 1;',encoding:'utf8',windowsHide:true,shell:false,timeout:7000,maxBuffer:65536});
 const finalAddresses=await dns.lookup(b.host,{all:true});report.direct.addressSetStable=JSON.stringify([...new Set(finalAddresses.map(a=>a.address))].sort())===JSON.stringify([...unique].sort());
 report.direct.hostnameMismatchRejected=negative.status!==0&&!negative.stdout&&/certificate.*does not match host name/i.test(negative.stderr??'');
}catch{report.direct={class:'UNKNOWN_NATIVE_PROBE'};}
if(report.http.table.status===401&&report.http.invalidKey.status===401&&report.http.auth.class==='AUTH_HEALTH'&&report.http.table.class==='EXPECTED_TABLE_PERMISSION_DENIED'&&report.http.invalidKey.class==='GATEWAY_KEY_REJECTED'&&report.direct.allPinnedNativeTlsPassed&&report.direct.anonSelectDenied&&report.direct.hostnameMismatchRejected&&report.direct.addressSetStable&&report.sqlFromPublishedTransport)report.status='PREVIEW_READONLY_BASELINE_PASS';
fs.writeFileSync((ROOT+'/preview-postresume-baseline.json'),JSON.stringify(report,null,2));
console.log(JSON.stringify(report));if(report.status!=='PREVIEW_READONLY_BASELINE_PASS')process.exitCode=1;
