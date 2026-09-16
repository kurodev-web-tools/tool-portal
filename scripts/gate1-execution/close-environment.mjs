import {SOURCE_ROOT,isolatedChildEnvironment,REPOSITORY} from './execution-inputs.mjs';
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {ROOT,json,sha,requireLiveAuthorization,readCredentials,pinned,nativeApiInput} from './execution-inputs.mjs';
import {collectNative} from './fresh-native.mjs';
import {metadataRow} from './fresh-metadata.mjs';
import {previewInvocation,runReadOnlySql,getJson} from './fresh-common.mjs';
import {buildPsqlInvocation} from '../comment-translator-paid-core-v1-gate1-preflight-readonly.mjs';

export function verifyClosingContent(baseline,result){
 assert.equal(result.status,0);assert.equal(result.signal,null);assert.equal(result.error,undefined);assert.equal(result.stderr,'');
 const state=JSON.parse(result.stdout);assert.deepEqual(state,baseline);assert.equal(state.relations.length,77);assert.equal(state.readOnly,'on');assert.equal(state.tls,true);assert.equal(state.serverMajor,17);assert.equal(state.otherActiveClients,0);
 return {status:'PASS',target:'preview',nativeExit:0,nativeErrorClass:null,state,tableCount:77,dbWrites:0,stateSha256:sha(JSON.stringify(state)),completedAt:Date.now()};
}
export async function collectClosingEnvironment(){
 const a=requireLiveAuthorization({closure:true}),control=ROOT+'/control',startedAt=Date.now();
 assert.equal(fs.existsSync(ROOT+'/preview-postresume-baseline.json'),false,'CLOSING_NATIVE_ALREADY_ATTEMPTED');
 const save=(name,value)=>fs.writeFileSync(control+'/'+name,JSON.stringify(value,null,2)+'\n',{flag:'wx'});
 save('independent-close-environment-claimed.json',{at:startedAt,allowance:1,dbWrites:0,metadataGets:3});
 // The retained baseline is used even if this attempt stopped before a new dump.
 const b=json(pinned(ROOT,a.manifest.baseline));const baseline=b.state,sql=fs.readFileSync(pinned(ROOT,b.query));
 const prepared=previewInvocation({closure:true});
 const content={startedAt:Date.now(),...verifyClosingContent(baseline,runReadOnlySql(prepared,sql,{},60000))};save('independent-close-preview-content.json',content);
 await collectNative(nativeApiInput('preview',{closure:true}),{closure:true});
 const nativeReceipt=json(ROOT+'/control/independent-close-preview-native.json');
 const credentials=readCredentials({closure:true}),metadata=[];
 for(const role of ['preview','recovery','production']){
  save('independent-close-metadata-'+role+'-claimed.json',{at:Date.now(),method:'GET',role});
  const r=await getJson({hostname:'api.supabase.com',route:'/v1/projects/'+a.policy[role+'Ref'],headers:{Authorization:'Bearer '+credentials.metadataReadPat},limit:65536});
  assert.equal(r.status,200);assert.equal(r.complete,true);assert.equal(r.value.id,a.policy[role+'Ref']);assert.equal(r.value.organization_id,a.policy.organizationId);assert.equal(r.value.status,role==='recovery'?'INACTIVE':'ACTIVE_HEALTHY');
  metadata.push(metadataRow(role,a.policy,r));
 }
 save('independent-close-metadata.json',{startedAt,completedAt:Date.now(),projectOperations:0,productionSqlOrConfig:0,projects:metadata});
 const receipt={status:'INDEPENDENT_CLOSING_ENVIRONMENT_MATCHED',startedAt,completedAt:Date.now(),previewContent:content.status,previewNativeApi:'READBACK_RECORDED',metadata,dbWrites:0,hostedLifecycle:0,formalStopProof:false,safeToDisable:false};save('independent-close-environment.json',receipt);return {status:receipt.status,tableCount:77,metadataGets:3,safeToDisable:false};
}
if(process.argv[1]&&fileURLToPath(import.meta.url)===path.resolve(process.argv[1])){
 try{assert.equal(process.argv.length,2);console.log(JSON.stringify(await collectClosingEnvironment()));}catch{console.log(JSON.stringify({status:'INDEPENDENT_CLOSE_ENVIRONMENT_REJECTED'}));process.exitCode=1;}
}
