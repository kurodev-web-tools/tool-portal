import {requiredSources} from '../gate1-execution/execution-inputs.mjs';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {randomBytes,createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {createRun,command,observe,tick,publicState,predecessorStateText} from '../../workers/gate1-recovery-controller/core.mjs';
import {POSTARM_STEPS} from '../gate1-execution/postarm-handoff.mjs';

export const repo=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
export const hash=value=>createHash('sha256').update(value).digest('hex');
export function executionFixture(t,{at=Date.now()}={}){
 const base=path.join(repo,'.tmp/gate1-local-acceptance');fs.mkdirSync(base,{recursive:true});const root=fs.mkdtempSync(path.join(base,'run-'));
 t.after(async()=>{for(const file of ['control/client-process.json','control/observer-process.json','control/oauth-process.json','control/intake-0-ready.json','control/intake-1-ready.json']){
 const f=path.join(root,file);if(!fs.existsSync(f))continue;const row=JSON.parse(fs.readFileSync(f));const pid=row.processId??row.ownerPid;try{process.kill(pid,0);process.kill(pid);}catch(e){if(e.code!=='ESRCH')throw e;}
 }await new Promise(r=>setTimeout(r,100));assert.ok(fs.realpathSync(root).startsWith(fs.realpathSync(base)+path.sep));fs.rmSync(root,{recursive:true});});
 const write=(leaf,value)=>{const file=path.join(root,leaf);fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,JSON.stringify(value)+'\n');return {file:leaf,bytes:fs.statSync(file).size,sha256:hash(fs.readFileSync(file))};};
 const policy={mode:'live',previewRef:'p'.repeat(20),recoveryRef:'r'.repeat(20),productionRef:'x'.repeat(20),organizationId:'synthetic-org',sourceCommit:'a'.repeat(40),emergencyPreviewResume:true};
 const policyPin=write('policy.json',policy);
 const statePin=write('fixture-input.json',{kind:'GATE1_LOOPBACK_FIXTURE',initialNow:at,scenario:'normal',hostedEvidence:false});
 const files=[policyPin,statePin];
 write('control/fixture-clock.json',{now:at});
 const manifest={kind:'GATE1_FIXED_EXECUTION_V1',packetRoot:root,action:'ISOLATED_LOCAL_ACCEPTANCE',hostedEvidence:false,sourceCommit:policy.sourceCommit,organizationSha256:hash('synthetic-org'),accountSha256:hash('synthetic-account'),policy:policyPin,fixture:statePin,files,source:[]};
 const approval={reviewOnly:false,action:manifest.action,approvalId:randomBytes(32).toString('hex'),authorizedAt:at-1000,expiresAt:at+7199000,extraChargeCeilingUSD:0,liveRunAllowance:1,grantAllowance:1,deploymentAllowance:2,oauthAllowance:1,emergencyPreviewResume:true,newProjectAllowance:0,newNamespaceAllowance:0,manualBillingMinutes:30,acceptHistoricalRevocationEvidence:true,controllerGetLimit:96,controllerPostLimit:32,independentManagementGetLimit:21,automaticMutationRetries:0,preparationResumeAllowance:1,correctionsPerRole:1,policySha256:hash(JSON.stringify(policy))};
 const oldAt=at-2400000,old=createRun(policy,{runId:'b'.repeat(64),sourceCommit:policy.sourceCommit,hardEndAt:oldAt+1200000,preservationSha256:'c'.repeat(64),preservationVerifiedAt:oldAt,acknowledgeEmergencyContainment:true},oldAt);
 for(const role of ['preview','recovery'])observe(old,role,{status:role==='preview'?'ACTIVE_HEALTHY':'INACTIVE',startedAt:oldAt,completedAt:oldAt},oldAt);
 command(old,{runId:old.runId,sequence:1,type:'abort'},oldAt+1);tick(old,oldAt+2);
 const priorState=publicState(old),predecessor={runId:old.runId,sourceCommit:policy.sourceCommit,stateSha256:hash(predecessorStateText(priorState))};
 const contents={serverMajor:17,readOnly:'on',tls:true,historyCount:56,vaultCount:2,storageCount:0,cronActive:0,otherActiveClients:0,relations:Array.from({length:77},(_,i)=>({owner:'postgres',relacl:null,nspname:'public',relkind:'r',relname:'synthetic_'+i,contents:hash(String(i)),relrowsecurity:true,relforcerowsecurity:false}))};
 const baseline={namespaceSha256:hash('synthetic-namespace'),versionSha256:hash('synthetic-version'),previewStateSha256:hash(JSON.stringify(contents)),state:contents,policy,predecessor,controllerState:priorState};
 manifest.baseline=write('baseline.json',baseline);files.push(manifest.baseline);
 manifest.history=write('history.json',{kind:'LOCAL_SYNTHETIC_INITIAL_CHECKPOINT',baseline:manifest.baseline});files.push(manifest.history);
 manifest.costUSD=0;manifest.controllerWorker='v-streamer-tools-gate1-recovery-controller-live';
 const instructions=['hosted','closure'].map(n=>write(n+'-instructions.json',{fixture:true,kind:'EXISTING_INSTRUCTION_FIXTURE'}));
 const inputs=['configuration','fixtures','observers','transfer'].map(purpose=>({...write(purpose+'-input.json',{fixture:true,kind:'EXISTING_INPUT_RECIPE_FIXTURE'}),purpose}));
 files.push(...instructions,...inputs);
 const handoff={kind:'GATE1_EXISTING_POSTARM_HANDOFF_V1',steps:POSTARM_STEPS,newWorkflowAutomation:false,ordinaryApprovalWait:false,procedureCreationAfterArm:false,responsibleOperator:'LOCAL_FIXTURE_OPERATOR',recoveryOwner:'EXTERNAL_CONTROLLER',acceptanceOwner:'LOCAL_FIXTURE_OPERATOR',approvalId:approval.approvalId,policySha256:approval.policySha256,instructions,inputs,perNativeStageLimitMs:60000,leaseMs:120000};
 manifest.handoff=write('handoff.json',handoff);files.push(manifest.handoff);
 write('control/handoff-reviewed.json',{at,planSha256:manifest.handoff.sha256,approvalId:approval.approvalId,responsibleOperator:handoff.responsibleOperator,ready:true});
 function pin(){
  manifest.source=requiredSources().map(file=>{const bytes=fs.readFileSync(path.join(repo,file));return {file,bytes:bytes.length,sha256:hash(bytes)};});
  for(const file of ['scripts/fixtures/gate1-execution-actions.mjs','scripts/fixtures/gate1-execution-process.mjs','scripts/fixtures/gate1-oauth-child.mjs'])if(!manifest.source.some(d=>d.file===file)&&fs.existsSync(path.join(repo,file))){const bytes=fs.readFileSync(path.join(repo,file));manifest.source.push({file,bytes:bytes.length,sha256:hash(bytes)});}
  for(const d of manifest.files){const b=fs.readFileSync(path.join(root,d.file));d.bytes=b.length;d.sha256=hash(b);}
  manifest.policy=manifest.files.find(d=>d.file==='policy.json');manifest.fixture=manifest.files.find(d=>d.file==='fixture-input.json');
  const mf=write('manifest.json',manifest);approval.manifestSha256=mf.sha256;write('approval.json',approval);
 }
 pin();
 return {root,at,policy,manifest,approval,baseline,write,pin,env:{SystemRoot:process.env.SystemRoot,WINDIR:process.env.WINDIR,GATE1_PACKET_ROOT:root},read:leaf=>JSON.parse(fs.readFileSync(path.join(root,leaf)))};
}
