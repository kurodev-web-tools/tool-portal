import {PAT_TARGETS} from '../gate1-execution/fresh-evidence.mjs';
// Replaces service/native observations only for explicit isolated local packets.
// Admission, grant, child launch, file commands, client kernel and closure remain
// the same executable path. These synthetic receipts are never Hosted evidence.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {REPOSITORY,record,json,sha,executionNow,isolatedChildEnvironment} from '../gate1-execution/execution-inputs.mjs';
import {launchOwnedNode,waitReceipt,runHelper} from '../gate1-execution/native-io.mjs';
import {policySha,issuePinnedGrant} from '../gate1-execution/safe-closure-inputs.mjs';
import {validateHandoff,verifyArmConnection} from '../gate1-execution/postarm-handoff.mjs';
const alive=processId=>{try{process.kill(processId,0);return true;}catch{return false;}};
export function fixtureAdvance(c,ms){assert.equal(c.local,true);assert.ok(Number.isSafeInteger(ms)&&ms>=0);fs.writeFileSync(c.root+'/control/fixture-clock.json',JSON.stringify({now:executionNow(c)+ms}));}
export async function stageAction(c,stage,clock){
 assert.equal(c.local,true);for(const name of ['SUPABASE_ACCESS_TOKEN','CLOUDFLARE_API_TOKEN','PGHOST','NODE_OPTIONS'])assert.equal(process.env[name],undefined,'INHERITED_SERVICE_ENVIRONMENT');const root=c.root,b=json(root+'/baseline.json'),m=json(root+'/fresh/manifest.json'),scenario=json(root+'/fixture-input.json');
 assert.equal(scenario.kind,'GATE1_LOOPBACK_FIXTURE');fixtureAdvance(c,scenario.delays?.[stage]??0);
 const at=executionNow(c),save=(file,value)=>{record(root,file,value);return value;};
 const base=(role,kind)=>{const ids={controller:'gate1-independent-controller-v3',preview:'gate1-preview-preservation-v1',native:'gate1-preview-native-api-v1',metadata:'gate1-independent-metadata-v1'},p=m.producers.find(x=>x.id===ids[role]);return {schemaVersion:1,kind,producer:p.id,producerSha256:p.sha256,sourceCommit:c.sourceCommit,policySha256:policySha(c.policy),startedAt:at,completedAt:at};};
 const identity=()=>json(root+'/runtime/identity.json');
 const clientProcess=()=>({...json(root+'/control/client-process.json'),runId:clock.runId,alive:alive(json(root+'/control/client-process.json').processId)});
 const observer=()=>({...json(root+'/runtime/fixture-observer-ready.json'),alive:alive(json(root+'/runtime/fixture-observer-ready.json').processId)});
 if(scenario.failStage===stage)throw Error('SYNTHETIC_NATIVE_FAILURE');
 switch(stage){
  case 'identity':return save('control/oauth-identity.json',{loggedIn:true,accountCount:1,expectedAccountMatch:true,tokenPermissions:['account:read','offline_access','user:read','workers_scripts:write'],at});
  case 'scope':return save('control/pat-scope-verified.json',{status:'PAT_PROJECT_SCOPE_VERIFIED',allowed:6,denied:3,rows:Object.entries(PAT_TARGETS).flatMap(([credentialRole,targets])=>['preview','recovery','production'].map(projectRole=>({credentialRole,projectRole,permitted:targets.includes(projectRole),httpStatus:targets.includes(projectRole)?200:403,complete:true,inputSha256:json(root+'/control/credentials-sealed.json').inputs.find(i=>i.role===credentialRole).inputSha256}))),oldPatQueries:0});
  case 'controller':return save('fresh/controller.json',{...base('controller','GATE1_CONTROLLER_CLOSED_V3'),namespaceSha256:b.namespaceSha256,closedVersionSha256:b.versionSha256,predecessor:b.predecessor,priorPolicySha256:policySha(b.policy),disabled:{httpStatus:503,complete:true,error:'DISABLED'},remainingSecretNames:['CONTROLLER_POLICY_JSON'],oldPatQueries:0,preparationOAuthSeparated:true});
  case 'existing-version':case 'secret-version':case 'live-version':{
   const which={'existing-version':'existing','secret-version':'secrets','live-version':'live'}[stage];return save('control/version-'+which+'.json',{at,version:stage==='existing-version'?(b.version??'synthetic-version'):'synthetic-'+clock.runId+'-'+which,activeVersionConfirmed:true,trafficPercentage:100,namespaceSha256:b.namespaceSha256,mode:stage==='live-version'?'live':'disabled',encryptedSecrets:stage==='existing-version'?1:3});
  }
  case 'preserve':return save('preservation.json',{status:'PASS',dbWrites:0,productionTouched:false,archiveParsedCompletely:true,preservationBeforeAfter:true,beforeStateSha256:b.previewStateSha256,completedAt:new Date(at).toISOString(),fixtureArchive:true});
  case 'bind-warm':return save('control/warm-bound.json',{status:'EMPTY_PREPARATION_BOUND',runId:clock.runId,sourceUsers:0,credentialsIssued:false});
  case 'preview-content':return save('fresh/preview.json',{...base('preview','GATE1_PREVIEW_CONTENT_V1'),target:'preview',bindingSha256:sha('fixture-binding'),dbWrites:0,nativeExit:0,nativeErrorClass:null,state:b.state});
  case 'preview-native':return save('fresh/native.json',{...base('native','GATE1_PREVIEW_NATIVE_API_V1'),target:'preview',bindingSha256:sha('fixture-binding'),dbWrites:0,addresses:[{addressSha256:sha('fixture-address'),nativeExit:0,stderrBytes:0,serverMajor:17,readOnly:'on',tls:true,anonSelect:false}],addressSetStable:true,hostnameMismatch:{exitCode:1,stdoutBytes:0,errorClass:'CERTIFICATE_HOST_MISMATCH'},http:Object.fromEntries([['auth',200,'AUTH_HEALTH'],['table',401,'EXPECTED_TABLE_PERMISSION_DENIED'],['invalidKey',401,'GATEWAY_KEY_REJECTED']].map(([k,status,classification])=>[k,{status,complete:true,classification,bodyBytes:100,elapsedMs:100}]))});
  case 'metadata-first':case 'metadata-second':{
   if(stage==='metadata-second'){const first=json(root+'/fresh/metadata-first.json');if(executionNow(c)<first.completedAt+10000)fixtureAdvance(c,first.completedAt+10000-executionNow(c));}
   const startedAt=executionNow(c),v={...base('metadata','GATE1_INDEPENDENT_METADATA_V1'),startedAt,completedAt:startedAt,projectOperations:0,productionSqlOrConfig:0,projects:['preview','recovery','production'].map(role=>({role,startedAt,completedAt:startedAt,httpStatus:200,complete:true,id:c.policy[role+'Ref'],organization_id:c.policy.organizationId,region:'ap-northeast-1',status:role==='recovery'?'INACTIVE':'ACTIVE_HEALTHY',database:{host:'db.'+c.policy[role+'Ref']+'.supabase.co',postgres_engine:'17.6'}}))};return save('fresh/'+stage+'.json',v);
  }
  case 'grant':return issuePinnedGrant();
  case 'secrets':return save('control/initial-secrets-result.json',{status:'SECRET_BATCH_COMMAND_SUCCEEDED',exitCode:0,configurationTokenExcluded:true,names:['CONTROLLER_OPERATOR_TOKEN','CONTROLLER_POLICY_JSON','SUPABASE_SCOPED_TOKEN']});
  case 'deploy-live':return save('control/deploy-live-result.json',{status:'DEPLOYED_VERSION_RECORDED',exitCode:0,mode:'live',at});
  case 'client':{
   await launchOwnedNode({file:path.join(REPOSITORY,'scripts/fixtures/gate1-execution-process.mjs'),args:['client'],cwd:root,env:isolatedChildEnvironment(c),out:root+'/client-stdout.jsonl',err:root+'/client-stderr.txt',receipt:root+'/control/client-process.json',identity:{runId:clock.runId}});
   await waitReceipt({file:root+'/runtime/identity.json',validate:r=>assert.equal(r.runId,clock.runId),deadlineAt:Date.now()+5000});return {identity:identity(),process:clientProcess()};
  }
  case 'observer':{
   await launchOwnedNode({file:path.join(REPOSITORY,'scripts/fixtures/gate1-execution-process.mjs'),args:['observer'],cwd:root,env:isolatedChildEnvironment(c),out:root+'/observer-stdout.jsonl',err:root+'/observer-stderr.txt',receipt:root+'/control/observer-process.json',identity:{runId:clock.runId}});
   await waitReceipt({file:root+'/runtime/fixture-observer-ready.json',validate:r=>assert.equal(r.runId,clock.runId),deadlineAt:Date.now()+5000});return observer();
  }
  case 'arm':{
   await runHelper({executable:process.execPath,args:[path.join(REPOSITORY,'scripts/gate1-execution/send-command.mjs'),'arm'],cwd:root,env:isolatedChildEnvironment(c),timeoutMs:5000});
   const r=await waitReceipt({file:root+'/runtime/command-1.receipt.json',validate:r=>assert.equal(r.type,'arm'),deadlineAt:Date.now()+5000});
   const v={state:r.state,armDispatchAt:json(root+'/runtime/command-1.claim.json').at,identity:identity(),clientProcess:clientProcess(),observer:observer()};
   v.handoff=verifyArmConnection({...v,allocation:clock,now:executionNow(c),handoff:validateHandoff(c,clock.allocatedAt)});save('control/arm-handoff.json',v.handoff);return v;
  }
 }
 assert.fail('UNKNOWN_FIXTURE_OPERATION');
}
