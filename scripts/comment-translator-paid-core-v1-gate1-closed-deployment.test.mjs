import test from 'node:test';
import assert from 'node:assert/strict';
import * as verifier from './lib/comment-translator-paid-core-v1-gate1-safe-closure.mjs';
import fs from 'node:fs/promises';
import path from 'node:path';
import {closedDeploymentFixture} from './fixtures/gate1-closed-deployment.mjs';
import {parseSafeClosureGrant} from '../workers/gate1-recovery-controller/safe-closure.mjs';

test('pre-arm closure transition requires a registered verifier and rejects an unbranded retained summary',async()=>{
 assert.equal(typeof verifier.verifyClosedDeploymentTransition,'function','missing registered retry4 deployment transition verifier');
 await assert.rejects(verifier.verifyClosedDeploymentTransition({retained:{safeToDisable:true}}),/retained-proof-brand/);
});

test('complete pre-arm closure binds the latest disabled deployment to a new V2 grant without rewriting UNKNOWN',async()=>{
 const f=await closedDeploymentFixture(),before=JSON.stringify(f.retained);
 await fs.mkdir(path.join(f.root,f.packet.prefix,'.wrangler/tmp'),{recursive:true});
 const closed=await verifier.verifyClosedDeploymentTransition(f.input());
 assert.ok(Object.isFrozen(closed));assert.equal(closed.retainedEvidenceSha256,f.retained.evidenceSha256);
 assert.equal(closed.closedVersionSha256,f.sha(f.versions[4]));assert.equal(closed.receiptSha256,f.packet.receipt.sha256);
 const fresh=await f.currentFresh(closed),proof=await verifier.verifySafeClosureEvidence(fresh.input());
 const result=verifier.issueSafeClosureGrant({proof,grantId:'3'.repeat(64),now:()=>fresh.now}),grant=parseSafeClosureGrant(result.text);
 assert.deepEqual(grant.predecessor,f.retained.predecessor);assert.equal(grant.successor.runId,'1'.repeat(64));assert.equal(grant.expiresAt,fresh.now-60000+300000);
 assert.equal(JSON.stringify(f.retained),before);
 assert.throws(()=>verifier.issueSafeClosureGrant({proof,grantId:'4'.repeat(64),now:()=>fresh.now}));
});

test('summary, cloned or foreign deployment proofs and old schema cannot bypass the original gate',async()=>{
 const f=await closedDeploymentFixture(),closed=await verifier.verifyClosedDeploymentTransition(f.input()),fresh=await f.currentFresh(closed);
 for(const candidate of [undefined,null,false,{},structuredClone(closed)])await assert.rejects(verifier.verifySafeClosureEvidence({...fresh.input(),closedDeployment:candidate}));
 const other=await closedDeploymentFixture();await assert.rejects(verifier.verifySafeClosureEvidence({...fresh.input(),retained:other.retained}),/deployment-proof-brand/);
 fresh.manifest.schemaVersion=1;fresh.manifest.kind='GATE1_SAFE_CLOSURE_EXECUTION_MANIFEST_V1';await fresh.seal();await assert.rejects(verifier.verifySafeClosureEvidence(fresh.input()),/fresh-manifest/);
});

test('V2 requires new approval after closure, exact transition, all five revocations and an unused allocation',async t=>{
 const f=await closedDeploymentFixture(),closed=await verifier.verifyClosedDeploymentTransition(f.input());
 for(const mode of ['manifest','approval','controller','version','policy','before-close','revocation-missing','revocation-partial','revocation-duplicate','old-run','stale','target','namespace','previous-owned','extra-schema']){
  await t.test(mode,async()=>{
   const fresh=await f.currentFresh(closed),c=fresh.records.get('controller');
   if(mode==='manifest')fresh.manifest.closedDeploymentEvidenceSha256='0'.repeat(64);
   if(mode==='approval')fresh.approval.closedDeploymentReceiptSha256='0'.repeat(64);
   if(mode==='controller')c.closedDeploymentEvidenceSha256='0'.repeat(64);
   if(mode==='version')c.closedVersionSha256=f.sha(f.versions[0]);
   if(mode==='policy')c.priorPolicySha256='0'.repeat(64);
   if(mode==='before-close')fresh.approval.authorizedAt=closed.closedAt;
   if(mode==='revocation-missing')c.previousAllocationPatRevocations.pop();
   if(mode==='revocation-partial')c.previousAllocationPatRevocations[2].complete=false;
   if(mode==='revocation-duplicate')c.previousAllocationPatRevocations[2]={...c.previousAllocationPatRevocations[0]};
   if(mode==='old-run')fresh.manifest.runId='f'.repeat(64);
   if(mode==='stale')c.startedAt=fresh.now-300000;
   if(mode==='target')fresh.records.get('metadata-first').projects[0].id='x'.repeat(20);
   if(mode==='namespace')c.namespaceSha256='0'.repeat(64);
   if(mode==='previous-owned')c.previousAllocationOwned.processes=1;
   if(mode==='extra-schema')fresh.approval.allowAnyVersion=true;
   await fresh.seal();await assert.rejects(verifier.verifySafeClosureEvidence(fresh.input()),/SAFE_CLOSURE_EVIDENCE_REJECTED/);
  });
 }
});

test('every retained safety boundary rejects resealed but semantically invalid receipts',async t=>{
 const cases=[
  ['summary','control/independent-close-preview-content.json',r=>{delete r.stateSha256;}],
  ['content','control/independent-close-preview-content.json',r=>{r.stateSha256='0'.repeat(64);}],
  ['native','control/independent-close-preview-native.json',r=>{r.direct.hostnameMismatchRejected=false;}],
  ['api','control/independent-close-preview-native.json',r=>{r.http.auth.status=503;}],
  ['metadata','control/independent-close-environment.json',r=>{r.metadata[2].status='INACTIVE';}],
  ['metadata-partial','control/independent-close-environment.json',r=>{r.metadata[0].complete=false;}],
  ['state','control/closing-state-initial.json',r=>{r.state.sequence++;r.bodySha256='0'.repeat(64);}],
  ['old-version','control/version-existing.json',r=>{r.version='foreign';}],
  ['namespace','control/version-close.json',r=>{r.namespaceSha256='0'.repeat(64);}],
  ['live-bundle','control/deploy-live-result.json',r=>{r.bundleSha256='0'.repeat(64);}],
  ['uncertain-upload','control/deploy-close-result.json',r=>{r.timedOut=true;}],
  ['policy','deployment-receipt.json',r=>{r.policySha256='0'.repeat(64);}],
  ['final-version','control/final-worker-closed.json',r=>{r.version='close-version';}],
  ['traffic','control/final-worker-closed.json',r=>{r.trafficPercentage=99;}],
  ['credential-left','control/secret-closure.json',r=>{r.remainingNames.push('SUPABASE_SCOPED_TOKEN');}],
  ['unconfirmed-delete','control/secret-delete-grant-result.json',r=>{r.confirmed=false;}],
  ['pat','control/pat-revoked-verified.json',r=>{r.rows[2].complete=false;}],
  ['oauth','control/oauth-revoke-response.json',r=>{r.statusCode=500;}],
  ['logged-in','control/oauth-logout-result.json',r=>{r.loggedIn=true;}],
  ['owned-resource','source-cleanup.json',r=>{r.ownedVolumesRemaining=1;}],
  ['owned-process','control/final-process-closure.json',r=>{r.ownedHelperProcesses=1;}],
  ['helper','control/primary-helper-settlement.json',r=>{r.remainingDescendants=1;}],
  ['helper-exit','control/timed-runner/helper-live-version-completed.json',r=>{r.nativeExitCode=1;}],
  ['helper-start','control/timed-runner/helper-client-started.json',r=>{r.processId=0;}],
  ['stage','control/timed-runner/stage-15-live-version-verified.json',r=>{r.completedAt+=300000;}],
  ['retry','control/timed-runner/sequence-stop.json',r=>{r.automaticRetry=true;}],
  ['formal','control/safe-closure.json',r=>{r.formalStopAccepted=true;}],
  ['late-helper','control/timed-runner/helper-client-started.json',r=>{r.at+=300000;}],
  ['primary-coverage','control/safe-closure.json',r=>{r.evidence[2]={...r.evidence[0]};}],
  ['grant','fresh/verification.json',r=>{r.evidenceSha256='0'.repeat(64);}]
 ];
 const f=await closedDeploymentFixture();
 for(const [mode,file,mutate] of cases)await t.test(mode,async()=>{
  const before=f.records.get(file),value=JSON.parse(before);mutate(value);f.records.set(file,JSON.stringify(value));await f.seal();
  await assert.rejects(verifier.verifyClosedDeploymentTransition(f.input()),/SAFE_CLOSURE_EVIDENCE_REJECTED/);
  f.records.set(file,before);
 });
});

test('post/arm/Hosted, unclosed outcomes and receipt format changes are never a zero-use closure',async t=>{
 const f=await closedDeploymentFixture(),saved=structuredClone(f.receipt);
 for(const mode of ['post','arm','client','hosted','unclosed','accepted','format'])await t.test(mode,async()=>{
  Object.assign(f.receipt,structuredClone(saved));
  if(mode==='post')f.receipt.executed.controllerHttp.posts=1;
  if(mode==='arm')f.receipt.executed.armPosts=1;
  if(mode==='client')f.receipt.executed.clientStartClaims=1;
  if(mode==='hosted')f.receipt.executed.hostedLifecycleClaims.recoveryRestore=1;
  if(mode==='unclosed')f.receipt.scopeClosed=false;
  if(mode==='accepted')f.receipt.formalStopAccepted=true;
  await f.seal();const input=f.input();if(mode==='format')input.packet={...f.packet,format:'UNREGISTERED'};
  await assert.rejects(verifier.verifyClosedDeploymentTransition(input),/SAFE_CLOSURE_EVIDENCE_REJECTED/);
 });
});

test('complete inventory, archives, producer snapshots and diagnosis bytes are mandatory',async t=>{
 for(const mode of ['unindexed-claim','empty-runtime','nonempty-cache','missing','backup','source','diagnosis','symlink','duplicate','oversize','escape'])await t.test(mode,async()=>{
  const f=await closedDeploymentFixture();
  if(mode==='unindexed-claim')await fs.writeFile(path.join(f.root,f.packet.prefix,'control/client-start-claimed.json'),'{}');
  if(mode==='empty-runtime')await fs.mkdir(path.join(f.root,f.packet.prefix,'runtime'));
  if(mode==='nonempty-cache'){const padding=[...f.records.keys()].find(n=>n.startsWith('evidence-padding-'));f.records.delete(padding);await fs.unlink(path.join(f.root,f.packet.prefix,padding));f.records.set('.wrangler/tmp/unregistered.txt','inert unregistered cache file');await f.seal();}
  if(mode==='missing')await fs.unlink(path.join(f.root,f.packet.prefix,'control/final-worker-closed.json'));
  if(mode==='backup')await fs.appendFile(path.join(f.backupRoot,'preview.dump'),'changed');
  if(mode==='source')await fs.appendFile(path.join(f.staticRoot,f.staticFiles[0].sha256),'changed');
  if(mode==='diagnosis')await fs.appendFile(path.join(f.root,'.tmp/gate1-retry4-client-diagnosis-20260912/received-args.json'),'changed');
  if(mode==='symlink'){const target=path.join(f.root,f.packet.prefix,'control/final-worker-closed.json');await fs.rename(target,target+'.original');await fs.symlink(target+'.original',target,'file');}
  if(['duplicate','oversize','escape'].includes(mode)){
   const target=path.join(f.root,f.packet.index.file),index=JSON.parse(await fs.readFile(target,'utf8'));
   if(mode==='duplicate')index.files[1]={...index.files[0]};
   if(mode==='oversize')index.padding='x'.repeat(1048576);
   if(mode==='escape')index.files[0].file='../outside.json';
   const text=JSON.stringify(index);await fs.writeFile(target,text);f.packet.index={...f.packet.index,bytes:Buffer.byteLength(text),sha256:f.sha(text)};
   f.receipt.closureEvidenceSha256=f.packet.index.sha256;const receiptText=JSON.stringify(f.receipt);await fs.writeFile(path.join(f.root,f.packet.receipt.file),receiptText);f.packet.receipt={...f.packet.receipt,bytes:Buffer.byteLength(receiptText),sha256:f.sha(receiptText)};
  }
  await assert.rejects(verifier.verifyClosedDeploymentTransition(f.input()),/SAFE_CLOSURE_EVIDENCE_REJECTED/);
 });
});

test('both verification calls snapshot caller references before asynchronous file reads',async()=>{
 const f=await closedDeploymentFixture(),input=f.input(),pending=verifier.verifyClosedDeploymentTransition(input);
 input.packet.receipt.sha256='0'.repeat(64);input.packet={...f.packet,format:'UNREGISTERED'};input.root='/unapproved-root';input.retained={};
 const closed=await pending,fresh=await f.currentFresh(closed),next=fresh.input(),verification=verifier.verifySafeClosureEvidence(next);
 next.closedDeployment={};next.root='/unapproved-root';next.manifest.sha256='0'.repeat(64);
 assert.ok(Object.isFrozen(await verification));
});
