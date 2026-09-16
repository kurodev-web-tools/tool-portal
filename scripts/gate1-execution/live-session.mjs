import {nativeBinding} from './execution-inputs.mjs';
import {SOURCE_ROOT,REPOSITORY} from './execution-inputs.mjs';
import {createBoundClient} from './postarm-handoff.mjs';
import {runCommandLoop} from './client-loop.mjs';
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {parseStrictJson} from '../lib/comment-translator-paid-core-v1-gate1-evidence.mjs';
import {ROOT,sha,json,verifyCandidate,requireLiveAuthorization,recoveryOptions,readDpapi,readCredentials} from './execution-inputs.mjs';
import {loadGrantForAdmission} from './safe-closure-inputs.mjs';
import {controllerBudget} from './http-budget.mjs';
import {createControllerClient,createControllerHttpsTransport,openControllerClientJournal,runControllerConfiguration,runControllerTransfer} from '../lib/comment-translator-paid-core-v1-gate1-controller-client.mjs';
import {verifyControllerStopProof} from '../lib/comment-translator-paid-core-v1-gate1-controller-proof.mjs';
import {buildRehearsalServiceChange} from '../lib/comment-translator-paid-core-v1-gate1-rehearsal-configuration.mjs';
import {validateRehearsalPreparation} from '../lib/comment-translator-paid-core-v1-gate1-rehearsal-preparation.mjs';
const runtime=ROOT+'/runtime',sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const configured=r=>r?.status==='CONFIGURATION_READBACK_MATCHED'&&r.stageAuthority===false&&r.hostedReady===false;
const stagePlan=Object.fromEntries(['setup-auth','setup-postgrest','setup-realtime','close-auth','close-postgrest','close-realtime','reopen-auth','reopen-postgrest','reopen-realtime'].map(name=>[name,configured]));
stagePlan['synthetic-transfer']=r=>r?.status==='SYNTHETIC_TRANSFER_VERIFIED'&&r.independentCommittedReadbackMatched===true&&r.gate==='NO-GO';
stagePlan['fixtures-ready']=r=>r?.status==='LOCAL_FIXTURES_READY'&&r.hostedReady===false;
stagePlan['recovery-baseline']=r=>r?.status==='REGISTERED_NATIVE_API_BASELINE_MATCHED'&&r.target==='recovery';
export function readObserverBaseline(role,identity){
 const bytes=fs.readFileSync(runtime+'/'+role+'-observer.jsonl');assert.ok(bytes.length<=16384);
 const lines=bytes.toString('utf8').trim().split('\n');assert.equal(lines.length,1);const row=parseStrictJson(lines[0]),p=row.payload;
 assert.equal(row.sequence,0);assert.equal(row.previousSha256,'0'.repeat(64));assert.equal(row.sha256,sha(JSON.stringify({sequence:0,previousSha256:row.previousSha256,payload:p})));
 for(const [key,value] of Object.entries(identity))assert.equal(p[key],value);
 assert.equal(p.stage,'BASELINE_READY');assert.equal(p.schemaVersion,2);assert.equal(p.stopEvidencePolicy,'supabase-inactive-v2');assert.equal(p.mutations,0);assert.equal(p.stopEvidence,false);
 assert.equal(p.http.rest.status,401);assert.equal(p.http.auth.status,200);assert.equal(p.http.rest.complete,true);assert.equal(p.http.auth.complete,true);
 const at=Date.parse(p.observedAt);assert.ok(Number.isSafeInteger(at)&&at<=Date.now()&&Date.now()-at<=60000);assert.ok(p.addressCount>=1&&p.addressCount<=8&&p.elapsedMs<=300000);
 return {status:'REGISTERED_NATIVE_API_BASELINE_MATCHED',target:role,receiptSha256:sha(bytes),completedAt:at};
}
export function observerIdentity(role,runId,sourceCommit){
 const descriptor=nativeBinding(role);
 return {target:role,runId,sourceCommit,sourceBindingSha256:descriptor.bindingSha256,observerSha256:sha(fs.readFileSync(SOURCE_ROOT+'/'+role+'-observer.mjs')),bridgeSha256:sha(fs.readFileSync(SOURCE_ROOT+'/management-bridge.mjs'))};
}
export async function readFormalProof(role,identity,notBeforeAt,signal){
 const journalPath=runtime+'/'+role+'-observer.jsonl',stdoutPath=runtime+'/'+role+'-stdout.jsonl',controlPath=runtime+'/'+role+'-control.json';
 assert.ok(!signal?.aborted);assert.equal(fs.existsSync(runtime+'/'+role+'-probe-claimed.json'),false);
 const control=json(controlPath);assert.equal(control.runId,identity.runId);assert.equal(control.sequence,0);assert.equal(control.command,'wait');
 fs.writeFileSync(runtime+'/'+role+'-probe-claimed.json',JSON.stringify({runId:identity.runId,claimedAt:Date.now(),notBeforeAt})+'\n',{flag:'wx'});
 const next=runtime+'/'+role+'-control-next.json';fs.writeFileSync(next,JSON.stringify({runId:identity.runId,sequence:1,command:'probe'}),{flag:'wx'});fs.renameSync(next,controlPath);
 const deadline=Date.now()+30000;
 while(Date.now()<=deadline&&!signal?.aborted){
  if(fs.existsSync(stdoutPath)){
   const raw=fs.readFileSync(stdoutPath,'utf8');assert.ok(Buffer.byteLength(raw)<=131072);const lines=raw.slice(0,raw.lastIndexOf('\n')+1).split('\n').filter(Boolean).map(line=>parseStrictJson(line));
   assert.equal(lines.some(row=>row.stage==='OBSERVER_FAILED'||row.stage==='OBSERVER_EXPIRED'),false);
   const terminal=lines.find(row=>row.stage==='PAIR_TERMINAL');
   if(terminal){const journal=fs.readFileSync(journalPath);assert.equal(journal.length,terminal.receiptBytes);return verifyControllerStopProof({journal,terminal:Buffer.from(JSON.stringify(terminal)),expected:identity,notBeforeAt,now:Date.now()});}
  }
  await sleep(100);
 }
 throw Error('LIVE_STOP_PROOF_UNCONFIRMED');
}
// Create only inside one approved live operator process. Independent observers
// are read-only child processes launched with this runId before their target's
// pause. Parent/controller closing cancels all owned native mutation stages.
export function createLiveSession(credentials){
 const authorized=requireLiveAuthorization(),{policy,sourceCommit}=authorized;
 assert.equal(fs.existsSync(runtime),false);assert.match(credentials.operatorToken,/^[A-Za-z0-9_-]{64,256}$/);assert.match(credentials.configurationToken,/^sbp_fc[A-Za-z0-9._-]{20,512}$/);
 const deployment=json(ROOT+'/deployment-receipt.json');assert.equal(deployment.mode,'live');assert.equal(deployment.sourceCommit,sourceCommit);assert.equal(deployment.bundleSha256,authorized.manifest.controllerBundleSha256);assert.equal(deployment.policySha256,sha(JSON.stringify(policy)));assert.equal(deployment.workerName,'v-streamer-tools-gate1-recovery-controller-live');
 assert.equal(deployment.origin,authorized.manifest.controllerOrigin);
 const allocation=json(ROOT+'/control/allocation-claimed.json');assert.equal(allocation.manifestSha256,authorized.manifestSha256);assert.equal(allocation.hardEndAt,allocation.allocatedAt+1200000);
 const admitted=loadGrantForAdmission(),runId=admitted.grant.successor.runId,hardEndAt=admitted.grant.successor.hardEndAt;
 assert.equal(deployment.grantSha256,admitted.sha256);assert.equal(deployment.executionManifestSha256,admitted.manifestSha256);
 const options=recoveryOptions(policy);fs.mkdirSync(runtime);
 const identities=Object.fromEntries(['preview','recovery'].map(role=>[role,observerIdentity(role,runId,sourceCommit)]));
 const bindings=Object.fromEntries(Object.entries(identities).map(([role,x])=>[role,Object.fromEntries(['sourceBindingSha256','observerSha256','bridgeSha256'].map(k=>[k,x[k]]))]));
 const ledger=openControllerClientJournal(runtime,runId);let pausedAt=null,recoveryReady=false;
 const transport=createControllerHttpsTransport({origin:deployment.origin,operatorToken:credentials.operatorToken});
 const client=createBoundClient({allocation,context:authorized,options:{runId,sourceCommit,predecessor:authorized.predecessor,safeClosureGrant:admitted.text,hardEndAt,manifestSha256:admitted.manifestSha256,approvedManifestSha256:admitted.approvedManifestSha256,observerBindings:bindings,journal:ledger,stagePlan,
  transport:(...args)=>{requireLiveAuthorization({closure:true});controllerBudget({reserve:2});return transport(...args);},
  observeRecoveryStop:async({notBeforeAt,signal,deadlineAt,observeState})=>{
   while(!signal.aborted&&Date.now()<deadlineAt){const s=await observeState();
    if(s.projects.recovery==='INACTIVE'&&s.operations.recoveryPause.attempts===1)return readFormalProof('recovery',identities.recovery,notBeforeAt,signal);
    if(s.phase==='NEEDS_OPERATOR')throw Error('CONTROLLER_NEEDS_OPERATOR');await sleep(20000);
   }throw Error('CLEANUP_DEADLINE');
  },
 }});
 fs.writeFileSync(runtime+'/identity.json',JSON.stringify({schemaVersion:1,runId,sourceCommit,hardEndAt,manifestSha256:admitted.manifestSha256,packetManifestSha256:authorized.manifestSha256,grantSha256:admitted.sha256,predecessor:authorized.predecessor,identities})+'\n',{flag:'wx'});
 return Object.freeze({client,runId,sourceCommit,
  async arm(){
   readObserverBaseline('preview',identities.preview);
   // This is a supplemental maintenance preservation proof, not an atomic
   // incident backup or permission to restore real data into Hosted Recovery.
   const report=json(ROOT+'/preservation.json');assert.equal(report.status,'PASS');assert.equal(report.archiveParsedCompletely,true);assert.equal(report.preservationBeforeAfter,true);assert.equal(report.productionTouched,false);assert.equal(report.dbWrites,0);
   const directory=fs.realpathSync(report.directory).replaceAll('\\','/');assert.ok(directory.startsWith('D:/Gate1Backups/preview-prepause-'));
   assert.equal(sha(fs.readFileSync(directory+'/preview.dump')),report.archiveSha256);assert.equal(fs.statSync(directory+'/preview.dump').size,report.archiveBytes);
   const verifiedAt=Date.parse(report.completedAt);assert.ok(Number.isSafeInteger(verifiedAt)&&Date.now()-verifiedAt<=300000);
   return client.start({sha256:sha(fs.readFileSync(ROOT+'/preservation.json')),verifiedAt});
  },
  async pausePreview(){pausedAt=Date.now();return client.pausePreview();},
  async resumeRecovery(){assert.ok(pausedAt!==null);const proof=await readFormalProof('preview',identities.preview,pausedAt);return client.resumeRecovery(proof);},
  async verifyRecoveryBaseline(){const result=await client.runStage('recovery-baseline',()=>readObserverBaseline('recovery',identities.recovery));assert.equal(client.state().projects.recovery,'ACTIVE_HEALTHY');recoveryReady=true;return result;},
  configure(name){assert.ok(Object.hasOwn(stagePlan,name)&&/^(setup|close|reopen)-/.test(name));if(!name.startsWith('setup-'))assert.equal(recoveryReady,true);const payload=json(runtime+'/'+name+'.json');assert.equal(payload.runId,runId);assert.equal(payload.sourceCommit,sourceCommit);const service=name.split('-').at(-1);const change=buildRehearsalServiceChange(service,payload.before,payload.patch);return runControllerConfiguration(client,name,change,{approvedRecoveryRef:policy.recoveryRef,protectedProjectRefs:options.protectedProjectRefs,managementToken:credentials.configurationToken});},
  verifyFixtures(){return client.runStage('fixtures-ready',()=>validateRehearsalPreparation(readDpapi(runtime+'/fixtures.dpapi')));},
  transfer(){assert.equal(recoveryReady,true);const packet=readDpapi(runtime+'/transfer.dpapi');return runControllerTransfer(client,packet,options,{assertFreshFixtures:()=>{validateRehearsalPreparation(readDpapi(runtime+'/fixtures.dpapi'));return true;}});},
  close(){client.dispose();ledger.close();},
 });
}
async function main(){
 assert.equal(process.argv.length,3);
 if(process.argv[2]==='--check-only'){
  const result=verifyCandidate();recoveryOptions(json(ROOT+'/policy.targets.private.json'));
  console.log(JSON.stringify({status:'LOCAL_INPUTS_MATCHED',files:result.manifest.files.length,manifestSha256:result.manifestSha256,publicationReady:fs.existsSync(ROOT+'/publication.json'),approvalPresent:fs.existsSync(ROOT+'/approval.json'),runtimeUnused:!fs.existsSync(runtime),remoteCalls:0}));return;
 }
 assert.equal(process.argv[2],'--execute');requireLiveAuthorization();const session=createLiveSession(readCredentials());
 await runCommandLoop({runtime,session,out:r=>console.log(JSON.stringify(r)),execute:async type=>{
 if(type==='arm')return session.arm();if(type==='pause-preview')return session.pausePreview();if(type==='resume-recovery')return session.resumeRecovery();if(type==='recovery-baseline')return session.verifyRecoveryBaseline();if(type==='fixtures-ready')return session.verifyFixtures();if(type==='synthetic-transfer')return session.transfer();if(['finish','abort'].includes(type))return {formalRecoveryStopAccepted:await session.client[type==='finish'?'finish':'stop']()};return session.configure(type);
 }});
}
if(process.argv[1]&&fileURLToPath(import.meta.url)===path.resolve(process.argv[1]))main().catch(()=>{console.log(JSON.stringify({status:'LIVE_EXECUTION_INPUT_REJECTED',gate:'NO-GO'}));process.exitCode=1;});
