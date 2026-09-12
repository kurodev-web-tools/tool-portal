import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {closureFixture,sha} from './fixtures/gate1-safe-closure.mjs';
import {parseSafeClosureGrant} from '../workers/gate1-recovery-controller/safe-closure.mjs';
import {canonicalJson} from '../workers/gate1-recovery-controller/safe-closure.mjs';
const verifier=await import('./lib/comment-translator-paid-core-v1-gate1-safe-closure.mjs').catch(e=>{if(e.code!=='ERR_MODULE_NOT_FOUND')throw e;return {};});
const retained=f=>verifier.verifyRetainedSafeClosure({packet:f.packet,root:f.root,backupRoot:f.backupRoot});

test('retained full receipts and fresh independent evidence produce one bound, expiring grant',async t=>{
 assert.equal(typeof verifier.verifyRetainedSafeClosure,'function','missing independent evidence verifier');const f=await closureFixture(t),old=await retained(f),fresh=await f.fresh(old),proof=await verifier.verifySafeClosureEvidence(fresh.input());
 assert.ok(Object.isFrozen(old)&&Object.isFrozen(proof));assert.equal(old.predecessor.stateSha256,f.packet.predecessor.stateSha256);const issued=verifier.issueSafeClosureGrant({proof,grantId:'d'.repeat(64),now:()=>f.clock});const grant=parseSafeClosureGrant(issued.text);assert.deepEqual(grant.predecessor,f.packet.predecessor);assert.equal(grant.successor.manifestSha256,fresh.input().manifest.sha256);assert.equal(grant.approvalSha256,fresh.input().approval.sha256);assert.equal(grant.expiresAt,f.clock-60000+300000);assert.equal(grant.issuedAt,f.clock);assert.equal(grant.closureEvidenceSha256,proof.evidenceSha256);assert.equal(issued.sha256,sha('gate1-safe-closure-grant-v1\n'+issued.text));assert.throws(()=>verifier.issueSafeClosureGrant({proof,grantId:'e'.repeat(64),now:()=>f.clock+1}));
});

test('summary-only, unregistered format, missing files, modified archives and incomplete relation/security comparisons are rejected',async t=>{
 for(const mode of ['summary','format','missing','archive','content','security','native','producer','zero-recovery','unclosed']){const f=await closureFixture(t);if(mode==='summary')f.records.set('control/preview-compare.json','{"safeToDisable":true}');if(mode==='format')f.packet.format='UNREGISTERED';if(mode==='missing')f.records.delete('preview-postresume-baseline.json');if(mode==='content'||mode==='security'){const r=JSON.parse(f.backups.get('live-postresume-readback.json'));if(mode==='content')r.relations[0].contents='0'.repeat(64);else r.relations[0].relrowsecurity=false;f.backups.set('live-postresume-readback.json',JSON.stringify(r));}if(mode==='native'){const r=JSON.parse(f.records.get('preview-postresume-baseline.json'));r.direct.hostnameMismatchRejected=false;f.records.set('preview-postresume-baseline.json',JSON.stringify(r));}if(mode==='producer')f.records.delete('compare-preview.mjs');if(mode==='zero-recovery'){const r=JSON.parse(f.records.get('control/closing-state-terminal.json'));r.state.operations.recoveryResume={attempts:1,outcome:'UNKNOWN'};f.records.set('control/closing-state-terminal.json',JSON.stringify(r));}await f.seal();if(mode==='archive')await fs.appendFile(path.join(f.backupRoot,'preview.dump'),'tampered');if(mode==='unclosed'){const file=path.join(f.root,f.packet.receipt.file),r=JSON.parse(await fs.readFile(file,'utf8'));r.executionAllocationClosed=false;const b=JSON.stringify(r);await fs.writeFile(file,b);f.packet.receipt={...f.packet.receipt,bytes:Buffer.byteLength(b),sha256:sha(b)};}await assert.rejects(retained(f),/SAFE_CLOSURE_EVIDENCE_REJECTED/,mode);}
});

test('path escape, duplicate normalized paths, symlinks, oversized indexes and oversized JSON fail closed',async t=>{
 for(const mode of ['escape','duplicate','symlink','index-size','json-size']){const f=await closureFixture(t);if(mode==='symlink'){const target=path.join(f.root,f.packet.prefix,'control/preview-compare.json');await fs.rename(target,target+'.original');await fs.symlink(target+'.original',target,'file');}else{const file=path.join(f.root,f.packet.receipt.file),r=JSON.parse(await fs.readFile(file,'utf8'));if(mode==='escape')r.files[0].file='../outside.json';if(mode==='duplicate')r.files.push({...r.files[0]});if(mode==='index-size')r.padding='x'.repeat(1048576);if(mode==='json-size'){f.records.set('preview-postresume-baseline.json',JSON.stringify({padding:'x'.repeat(1048576)}));await f.seal();await assert.rejects(retained(f),/SAFE_CLOSURE_EVIDENCE_REJECTED/);continue;}const b=JSON.stringify(r);await fs.writeFile(file,b);f.packet.receipt={...f.packet.receipt,bytes:Buffer.byteLength(b),sha256:sha(b)};}await assert.rejects(retained(f),/SAFE_CLOSURE_EVIDENCE_REJECTED/,mode);}
});

test('new authorization, complete fresh coverage, targets and independent round spacing are required',async t=>{
 for(const mode of ['old-approval','approval-binding','missing','partial','namespace','target','source','producer','spacing-short','spacing-long','before-approval','stale','preview-content']){const f=await closureFixture(t),old=await retained(f),fresh=await f.fresh(old);if(mode==='old-approval')fresh.approval.authorizedAt=10000000;if(mode==='approval-binding')fresh.approval.oldReceiptSha256='0'.repeat(64);if(mode==='missing')fresh.records.delete('native');if(mode==='partial')fresh.records.get('native').http.auth.complete=false;if(mode==='namespace')fresh.records.get('controller').namespaceSha256='0'.repeat(64);if(mode==='target')fresh.records.get('metadata-first').projects[0].id='x'.repeat(20);if(mode==='source')fresh.records.get('native').sourceCommit='0'.repeat(40);if(mode==='producer')fresh.records.get('native').producer='unregistered';if(mode.startsWith('spacing')){const r=fresh.records.get('metadata-second'),delta=mode==='spacing-short'?-10000:40000;r.startedAt+=delta;r.completedAt+=delta;for(const p of r.projects){p.startedAt+=delta;p.completedAt+=delta;}}if(mode==='before-approval')fresh.records.get('controller').startedAt=fresh.approval.authorizedAt-1;if(mode==='stale')fresh.records.get('controller').startedAt=f.clock-300001;if(mode==='preview-content')fresh.records.get('preview').state.relations[0].contents='0'.repeat(64);await fresh.seal();await assert.rejects(verifier.verifySafeClosureEvidence(fresh.input()),/SAFE_CLOSURE_EVIDENCE_REJECTED/,mode);}
});

test('caller booleans, cloned proof and clock reversal cannot issue or extend grants',async t=>{
 const f=await closureFixture(t),old=await retained(f),fresh=await f.fresh(old);await assert.rejects(verifier.verifySafeClosureEvidence({...fresh.input(),retained:structuredClone(old)}));const proof=await verifier.verifySafeClosureEvidence(fresh.input());for(const p of [{safeToDisable:true},structuredClone(proof)])assert.throws(()=>verifier.issueSafeClosureGrant({proof:p,grantId:'d'.repeat(64),now:()=>f.clock}));assert.throws(()=>verifier.issueSafeClosureGrant({proof,grantId:'d'.repeat(64),now:()=>f.clock-1}));assert.throws(()=>verifier.issueSafeClosureGrant({proof,grantId:'d'.repeat(64),now:()=>f.clock+300001}));let calls=0;await assert.rejects(verifier.verifySafeClosureEvidence({...fresh.input(),now:()=>f.clock-(calls++?1:0)}));
});

test('published producer bytes, policy receipts, unused JSON bounds and complete HTTP accounting are mandatory',async t=>{
 for(const mode of ['source-bytes','deployed-policy','old-target','unused-json','http-accounting','duplicate-key']){
  const f=await closureFixture(t);
  if(mode==='deployed-policy'){const r=JSON.parse(f.records.get('deployment-receipt.json'));r.policySha256='0'.repeat(64);f.records.set('deployment-receipt.json',JSON.stringify(r));}
  if(mode==='old-target'){const r=JSON.parse(f.records.get('policy.targets.private.json'));r.organizationId='other-org';f.records.set('policy.targets.private.json',JSON.stringify(r));}
  if(mode==='unused-json')f.records.set('unreferenced-summary.json',JSON.stringify({padding:'x'.repeat(1048576)}));
  if(mode==='http-accounting'){const r=JSON.parse(f.records.get('control/final-worker-closed.json'));r.controllerApplicationRequests++;f.records.set('control/final-worker-closed.json',JSON.stringify(r));}
  if(mode==='duplicate-key')f.records.set('control/preview-compare.json',f.records.get('control/preview-compare.json').replace('"exitCode":0','"exitCode":0,"exitCode":0'));
  await f.seal();if(mode==='source-bytes')await fs.appendFile(path.join(f.root,[...f.sources.keys()][0]),'changed');await assert.rejects(retained(f),/SAFE_CLOSURE_EVIDENCE_REJECTED/,mode);
 }
});

test('current artifact source, exact manifest schema, full native responses and new authorization remain bound',async t=>{
 for(const mode of ['producer-bytes','bundle-bytes','manifest-extra','approval-extra','native-stderr','api-empty','api-slow','duplicate-address','metadata-partial','metadata-production','controller-version','preview-security']){
  const f=await closureFixture(t),old=await retained(f),fresh=await f.fresh(old);
  if(mode==='approval-extra')fresh.approval.automaticRenewal=true;
  if(mode==='native-stderr')fresh.records.get('native').addresses[0].stderrBytes=1;
  if(mode==='api-empty')fresh.records.get('native').http.auth.bodyBytes=0;
  if(mode==='api-slow')fresh.records.get('native').http.table.elapsedMs=3001;
  if(mode==='duplicate-address')fresh.records.get('native').addresses.push({...fresh.records.get('native').addresses[0]});
  if(mode==='metadata-partial')fresh.records.get('metadata-second').projects[2].complete=false;
  if(mode==='metadata-production')fresh.records.get('metadata-second').projects[2].status='INACTIVE';
  if(mode==='controller-version')fresh.records.get('controller').closedVersionSha256='0'.repeat(64);
  if(mode==='preview-security')fresh.records.get('preview').state.relations[0].relforcerowsecurity=true;
  await fresh.seal();const input=fresh.input();
  if(mode==='producer-bytes')await fs.appendFile(path.join(input.producerRoot,fresh.manifest.producers[0].file),'changed');
  if(mode==='bundle-bytes')await fs.appendFile(path.join(input.producerRoot,fresh.manifest.bundle.file),'changed');
  if(mode==='manifest-extra'){const bytes=canonicalJson({...fresh.manifest,grant:{expiresAt:f.clock+300000}});await fs.writeFile(path.join(input.root,input.manifest.file),bytes);input.manifest={...input.manifest,bytes:Buffer.byteLength(bytes),sha256:sha(bytes)};}
  await assert.rejects(verifier.verifySafeClosureEvidence(input),/SAFE_CLOSURE_EVIDENCE_REJECTED/,mode);
 }
});

test('fresh verification snapshots caller references and re-verification cannot reissue the same approval',async t=>{
 const f=await closureFixture(t),old=await retained(f),fresh=await f.fresh(old),input={...fresh.input()},pending=verifier.verifySafeClosureEvidence(input);input.retained={evidenceSha256:'0'.repeat(64)};input.root='/unapproved-root';input.producerRoot='/unapproved-producers';input.manifest.sha256='0'.repeat(64);
 const proof=await pending;verifier.issueSafeClosureGrant({proof,grantId:'e'.repeat(64),now:()=>f.clock});await fresh.seal();const second=await verifier.verifySafeClosureEvidence(fresh.input());assert.throws(()=>verifier.issueSafeClosureGrant({proof:second,grantId:'f'.repeat(64),now:()=>f.clock}));
});
