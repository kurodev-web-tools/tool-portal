import fs from 'node:fs';
import https from 'node:https';
import assert from 'node:assert/strict';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {ROOT,json,sha,nativeBinding} from './execution-inputs.mjs';
import {freshContext,writeCanonical,policySha} from './safe-closure-inputs.mjs';
import {parseBoundedJson} from '../../workers/gate1-recovery-controller/provider.mjs';
import {buildPsqlInvocation} from '../comment-translator-paid-core-v1-gate1-preflight-readonly.mjs';
export const producerIds={controller:'gate1-independent-controller-v3',preview:'gate1-preview-preservation-v1',native:'gate1-preview-native-api-v1',metadata:'gate1-independent-metadata-v1'};
export const kinds={controller:'GATE1_CONTROLLER_CLOSED_V3',preview:'GATE1_PREVIEW_CONTENT_V1',native:'GATE1_PREVIEW_NATIVE_API_V1',metadata:'GATE1_INDEPENDENT_METADATA_V1'};
export function beginProducer(role,id=role){
 const context=freshContext(),startedAt=Date.now();assert.ok(startedAt<context.manifest.hardEndAt);
 const producer=context.manifest.producers.find(p=>p.id===producerIds[role]);assert.ok(producer);
 const bytes=fs.readFileSync(producer.file);assert.equal(bytes.length,producer.bytes);assert.equal(sha(bytes),producer.sha256);
 writeCanonical(ROOT+'/control/fresh-'+id+'-claimed.json',{at:startedAt,id,readsOnly:true,allowance:1,manifestSha256:context.manifestSha256});
 return {...context,id,startedAt,base:{schemaVersion:1,kind:kinds[role],producer:producer.id,producerSha256:producer.sha256,sourceCommit:context.authorized.sourceCommit,startedAt,policySha256:policySha(context.authorized.policy)}};
}
export function finishProducer(context,result){
 const completedAt=Date.now();assert.ok(completedAt>=context.startedAt&&completedAt-context.startedAt<300000&&completedAt<context.manifest.hardEndAt);
 const receipt={...context.base,...result,completedAt};
 writeCanonical(ROOT+'/fresh/'+context.id+'.json',receipt);
 return {status:'FRESH_PRODUCER_RECORDED',producer:receipt.producer,id:context.id,elapsedMs:completedAt-receipt.startedAt,mutations:0};
}
// Full EOF, exact byte cap and a wall deadline are recorded by this transport;
// MCP success or a caller boolean never stands in for an HTTP receipt.
export async function getJson({hostname,route,headers={},limit=8192,request=https.request,now=Date.now,timeoutMs=3000}){
 assert.equal(process.env.NODE_TLS_REJECT_UNAUTHORIZED==='0',false);
 const startedAt=now();
 return new Promise(resolve=>{
  let req,res,timer,done=false,bodyBytes=0;const parts=[];
  const finish=(complete,error)=>{if(done)return;done=true;clearTimeout(timer);const completedAt=now();let value;
   if(complete&&completedAt>=startedAt&&completedAt-startedAt<=timeoutMs&&bodyBytes<=limit){try{value=parseBoundedJson(new TextDecoder('utf-8',{fatal:true}).decode(Buffer.concat(parts)));}catch{complete=false;error='INVALID_JSON';}}
   else complete=false;
   resolve({status:res?.statusCode??null,complete,value,bodyBytes,elapsedMs:completedAt-startedAt,startedAt,completedAt,error:error??null});res?.destroy();req?.destroy();
  };
  try{req=request({hostname,path:route,method:'GET',agent:false,rejectUnauthorized:true,headers:{Accept:'application/json',...headers}},r=>{
   res=r;r.on('data',b=>{bodyBytes+=b.length;if(bodyBytes>limit)finish(false,'BODY_LIMIT');else parts.push(b);});
   r.on('aborted',()=>finish(false,'ABORTED'));r.on('error',()=>finish(false,'STREAM_ERROR'));
   r.on('end',()=>finish(r.complete===true,r.complete?'':'INCOMPLETE'));r.on('close',()=>{if(!done)finish(false,'EARLY_CLOSE');});
  });timer=setTimeout(()=>finish(false,'DEADLINE'),timeoutMs);req.on('error',()=>finish(false,'NETWORK_OR_TLS'));req.end();}catch{finish(false,'REQUEST');}
 });
}
export function previewInvocation(options={}){
 const saved=nativeBinding('preview',options);
 const password=fs.readFileSync(saved.credentialFile,'utf8').replace(/^\uFEFF/,'').replace(/\r?\n$/,'');assert.ok(password&&!/[\r\n\0]/.test(password));
 const bin=saved.postgresBin;
 const env={PATH:bin+path.delimiter+process.env.PATH,SystemRoot:process.env.SystemRoot,PGHOST:saved.binding.host,PGPORT:'5432',PGDATABASE:'postgres',PGUSER:'postgres',PGSSLMODE:'verify-full',PGSSLROOTCERT:saved.caFile,PGGSSENCMODE:'disable',PGPASSWORD:password};
 const invocation=buildPsqlInvocation(saved.binding,env);assert.equal(invocation.ok,true);
 return {saved,invocation,executable:path.join(bin,'psql.exe')};
}
export function runReadOnlySql(prepared,sql,extraEnv={},timeout=7000){
 return spawnSync(prepared.executable,prepared.invocation.args,{env:{...prepared.invocation.env,PGCONNECT_TIMEOUT:'3',...extraEnv},input:sql,encoding:'utf8',windowsHide:true,shell:false,timeout,maxBuffer:1048576});
}
