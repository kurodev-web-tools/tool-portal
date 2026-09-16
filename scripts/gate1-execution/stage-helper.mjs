import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {ROOT,authorizePacket,executionNow,json,record,sha} from './execution-inputs.mjs';
import {STAGES,admissionTime} from './prearm-sequence.mjs';
import {verifyHistory,historyValue} from './accepted-history.mjs';
import {validatePatScope,validateContent,validateNative,validateMetadata,validateEvidenceTime} from './fresh-evidence.mjs';
import {validateHandoff,verifyArmConnection} from './postarm-handoff.mjs';

export async function verifyStageResult(stage,result,context,clock,now){
 assert.ok(STAGES.includes(stage));assert.equal(result.stage,stage);assert.equal(result.runId,clock.runId);assert.equal(result.manifestSha256,context.manifestSha256);assert.equal(result.sourceSha256,sha(JSON.stringify(context.manifest.source)));validateEvidenceTime(result,clock,now);
 const v=result.value,history=historyValue(await verifyHistory(context));
 switch(stage){
  case 'identity':assert.equal(v.loggedIn,true);assert.equal(v.expectedAccountMatch,true);assert.equal(v.accountCount,1);assert.deepEqual([...v.tokenPermissions].sort(),['account:read','offline_access','user:read','workers_scripts:write']);break;
  case 'scope':validatePatScope(v,json(context.root+'/control/credentials-sealed.json'));break;
  case 'controller':assert.equal(v.namespaceSha256,history.namespaceSha256);assert.equal(v.closedVersionSha256,history.versionSha256);assert.equal(v.disabled.httpStatus,503);assert.equal(v.disabled.complete,true);assert.equal(v.disabled.error,'DISABLED');break;
  case 'existing-version':case 'secret-version':case 'live-version':
   assert.equal(v.activeVersionConfirmed,true);assert.equal(v.trafficPercentage,100);assert.equal(v.namespaceSha256,history.namespaceSha256);assert.equal(v.mode,stage==='live-version'?'live':'disabled');
   if(stage==='existing-version'){assert.equal(sha(v.version),history.versionSha256);assert.equal(v.encryptedSecrets,1);}break;
  case 'preserve':assert.equal(v.status,'PASS');assert.equal(v.dbWrites,0);assert.equal(v.productionTouched,false);assert.equal(v.archiveParsedCompletely,true);assert.equal(v.preservationBeforeAfter,true);assert.equal(v.beforeStateSha256,history.previewStateSha256);break;
  case 'bind-warm':assert.equal(v.status,'EMPTY_PREPARATION_BOUND');assert.equal(v.runId,clock.runId);assert.equal(v.sourceUsers,0);assert.equal(v.credentialsIssued,false);break;
  case 'preview-content':validateContent(v,history);break;
  case 'preview-native':validateNative(v);break;
  case 'metadata-first':case 'metadata-second':validateMetadata(v,context.policy);break;
  case 'grant':assert.equal(v.status,'ADOPTED_FRESH_EVIDENCE_VERIFIED');assert.ok(v.expiresAt>now&&v.expiresAt<=clock.freshDeadlineAt);break;
  case 'secrets':assert.equal(v.status,'SECRET_BATCH_COMMAND_SUCCEEDED');assert.equal(v.exitCode,0);assert.equal(v.configurationTokenExcluded,true);break;
  case 'deploy-live':assert.equal(v.status,'DEPLOYED_VERSION_RECORDED');assert.equal(v.exitCode,0);assert.equal(v.mode,'live');break;
  case 'client':assert.equal(v.identity.runId,clock.runId);assert.equal(v.identity.hardEndAt,clock.hardEndAt);assert.equal(v.identity.packetManifestSha256,context.manifestSha256);assert.equal(v.process.alive,true);break;
  case 'observer':assert.equal(v.runId,clock.runId);assert.equal(v.baselineAccepted,true);assert.equal(v.stopEvidence,false);assert.equal(v.alive,true);break;
  case 'arm':{
   const handoff=validateHandoff(context,clock.allocatedAt);
   const value=verifyArmConnection({...v,allocation:clock,now,handoff});assert.deepEqual(v.handoff,value);break;
  }
 }
}

export async function executeStage(context,stage,clock){
 assert.ok(STAGES.includes(stage));const now=()=>executionNow(context);admissionTime(clock,stage,now());
 const claim=json(context.root+'/control/steps/'+stage+'-claimed.json');assert.equal(claim.runId,clock.runId);assert.equal(claim.manifestSha256,context.manifestSha256);assert.equal(sha(fs.readFileSync(context.root+'/control/steps/'+stage+'-claimed.json')),clock.claimSha256);
 const startedAt=now();
 const {stageAction}=context.local?await import('../fixtures/gate1-execution-actions.mjs'):await import('./native-actions.mjs');
 const value=await stageAction(context,stage,clock),result={stage,runId:clock.runId,manifestSha256:context.manifestSha256,sourceSha256:sha(JSON.stringify(context.manifest.source)),startedAt,completedAt:now(),hostedEvidence:!context.local,value};
 await verifyStageResult(stage,result,context,clock,now());record(context.root,'control/steps/'+stage+'-result.json',result);return result;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 let context;
 try{assert.equal(process.argv.length,3);let text='';for await(const b of process.stdin){text+=b;assert.ok(Buffer.byteLength(text)<=8192);}context=authorizePacket(ROOT);await executeStage(context,process.argv[2],JSON.parse(text));console.log(JSON.stringify({status:'STEP_EVIDENCE_VERIFIED',stage:process.argv[2]}));}
 catch(e){console.log(JSON.stringify({status:'STEP_UNCONFIRMED',automaticRetry:false,...(context?.local?{fixtureFailure:e.message}: {})}));process.exitCode=1;}
}
