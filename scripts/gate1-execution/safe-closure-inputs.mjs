import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
import {ROOT,SOURCE_ROOT,REPOSITORY,authorizePacket,json,pinned,record,sha,executionNow} from './execution-inputs.mjs';
import {verifyHistory,historyValue} from './accepted-history.mjs';
import {validateContent,validateNative,validateMetadata,validateEvidenceTime} from './fresh-evidence.mjs';
import {canonicalJson,safeClosureGrantText,GRANT_PREFIX,POLICY_PREFIX,previewUnknownClosureStateText,parseSafeClosureGrant} from '../../workers/gate1-recovery-controller/safe-closure.mjs';
import {predecessorStateText} from '../../workers/gate1-recovery-controller/core.mjs';
export const policySha=p=>sha(POLICY_PREFIX+canonicalJson(p));
export function describe(file){const b=fs.readFileSync(file);return {file,bytes:b.length,sha256:sha(b)};}
export function writeCanonical(file,value){fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,canonicalJson(value),{flag:'wx'});return describe(file);}
export function freshContext(){
 const authorized=authorizePacket(ROOT),allocation=json(ROOT+'/control/allocation-claimed.json'),manifest=json(ROOT+'/fresh/manifest.json');
 assert.equal(allocation.manifestSha256,authorized.manifestSha256);assert.equal(manifest.packetManifestSha256,authorized.manifestSha256);assert.equal(manifest.runId,allocation.runId);assert.equal(manifest.hardEndAt,allocation.allocatedAt+1200000);assert.equal(manifest.hardEndAt,allocation.hardEndAt);
 assert.deepEqual(manifest.policy,authorized.policy);const approval=json(ROOT+'/fresh/approval.json'),manifestSha256=sha(fs.readFileSync(ROOT+'/fresh/manifest.json'));
 assert.equal(approval.manifestSha256,manifestSha256);assert.equal(approval.authorizedAt,authorized.approval.authorizedAt);assert.equal(approval.expiresAt,authorized.approval.expiresAt);
 return {authorized,manifest,approval,allocation,manifestSha256,approvalSha256:sha(fs.readFileSync(ROOT+'/fresh/approval.json'))};
}
export async function bindAllocation(context,allocation){
 const history=historyValue(await verifyHistory(context));assert.notEqual(allocation.runId,history.predecessor.runId);
 const producerFiles={controller:'fresh-controller.mjs',preview:'fresh-preview.mjs',native:'fresh-native.mjs',metadata:'fresh-metadata.mjs'};
 const ids={controller:'gate1-independent-controller-v3',preview:'gate1-preview-preservation-v1',native:'gate1-preview-native-api-v1',metadata:'gate1-independent-metadata-v1'};
 const producers=Object.entries(producerFiles).map(([role,file])=>{const pin=context.manifest.source.find(d=>d.file==='scripts/gate1-execution/'+file);assert.ok(pin);return {...pin,file:path.join(REPOSITORY,pin.file),id:ids[role]};});
 const manifest={kind:'GATE1_FIXED_ADMISSION_V3',packetManifestSha256:context.manifestSha256,policy:context.policy,sourceCommit:context.sourceCommit,runId:allocation.runId,hardEndAt:allocation.hardEndAt,namespaceSha256:history.namespaceSha256,historySha256:history.evidenceSha256,producers};
 const md=writeCanonical(context.root+'/fresh/manifest.json',manifest);
 writeCanonical(context.root+'/fresh/approval.json',{kind:'GATE1_BOUND_APPROVAL_V3',approvalId:context.approval.approvalId,authorizedAt:context.approval.authorizedAt,expiresAt:context.approval.expiresAt,manifestSha256:md.sha256,predecessor:history.predecessor,successor:{runId:allocation.runId,sourceCommit:context.sourceCommit,hardEndAt:allocation.hardEndAt,manifestSha256:md.sha256}});
 return manifest;
}
export async function issuePinnedGrant(){
 const c=freshContext(),now=executionNow(c.authorized),history=historyValue(await verifyHistory(c.authorized));
 const ids=['controller','preview','native','metadata-first','metadata-second'],artifacts=[],values={};
 for(const id of ids){const file=ROOT+'/fresh/'+id+'.json',r=json(file),p=c.manifest.producers.find(x=>x.id===r.producer);assert.ok(p);pinned(REPOSITORY,{...p,file:path.relative(REPOSITORY,p.file)});assert.equal(r.producerSha256,p.sha256);assert.equal(r.sourceCommit,c.authorized.sourceCommit);assert.equal(r.policySha256,policySha(c.authorized.policy));validateEvidenceTime(r,c.allocation,now);values[id]=r;artifacts.push({id,...describe(file)});}
 const v=json(ROOT+'/control/version-existing.json'),controller=values.controller;
 assert.equal(v.activeVersionConfirmed,true);assert.equal(v.mode,'disabled');assert.equal(v.encryptedSecrets,1);assert.equal(v.namespaceSha256,history.namespaceSha256);assert.equal(sha(v.version),history.versionSha256);assert.ok(v.at>=c.allocation.allocatedAt&&now-v.at<300000);
 assert.equal(controller.namespaceSha256,history.namespaceSha256);assert.equal(controller.closedVersionSha256,history.versionSha256);assert.deepEqual(controller.predecessor,history.predecessor);assert.equal(controller.priorPolicySha256,policySha(history.policy));
 assert.deepEqual(controller.disabled,{httpStatus:503,complete:true,error:'DISABLED'});assert.deepEqual(controller.remainingSecretNames,['CONTROLLER_POLICY_JSON']);assert.equal(controller.oldPatQueries,0);assert.equal(controller.preparationOAuthSeparated,true);
 validateContent(values.preview,history);validateNative(values.native);assert.equal(values.preview.bindingSha256,values.native.bindingSha256);
 const first=values['metadata-first'],second=values['metadata-second'];validateMetadata(first,c.authorized.policy);validateMetadata(second,c.authorized.policy);assert.ok(second.startedAt-first.completedAt>=10000&&second.startedAt-first.completedAt<=30000);
 const index=writeCanonical(ROOT+'/fresh/index.json',{kind:'GATE1_ADOPTED_FRESH_V3',manifestSha256:c.manifestSha256,approvalSha256:c.approvalSha256,historySha256:history.evidenceSha256,artifacts});
 let special=false;try{predecessorStateText(history.state??history.controllerState);}catch{assert.equal(sha(previewUnknownClosureStateText(history.state??history.controllerState)),history.predecessor.stateSha256);special=true;}
 const expiresAt=Math.min(c.allocation.freshDeadlineAt,c.approval.expiresAt);assert.ok(now<expiresAt);
 let text=null,grantSha256=null;
 record(ROOT,'control/grant-issue-claimed.json',{at:now,special,allowance:1,manifestSha256:c.manifestSha256});
 if(special){text=safeClosureGrantText({schemaVersion:1,kind:'PREVIEW_ONLY_UNKNOWN_SAFE_CLOSURE_V1',grantId:randomBytes(32).toString('hex'),predecessor:history.predecessor,successor:c.approval.successor,policySha256:policySha(c.authorized.policy),approvalSha256:c.approvalSha256,closureEvidenceSha256:index.sha256,issuedAt:now,expiresAt});parseSafeClosureGrant(text);fs.writeFileSync(ROOT+'/fresh/grant.json',text,{flag:'wx'});grantSha256=sha(GRANT_PREFIX+text);}
 const receipt={status:'ADOPTED_FRESH_EVIDENCE_VERIFIED',kind:'GATE1_ADOPTED_FRESH_V3',packetManifestSha256:c.authorized.manifestSha256,manifestSha256:c.manifestSha256,approvalSha256:c.approvalSha256,special,successor:c.approval.successor,predecessor:history.predecessor,grantSha256,expiresAt,index,artifacts};
 writeCanonical(ROOT+'/fresh/verification.json',receipt);return {status:receipt.status,special,expiresAt,grantSha256};
}
export function loadGrantForAdmission(now=Date.now()){
 const c=freshContext(),r=json(ROOT+'/fresh/verification.json');assert.equal(r.status,'ADOPTED_FRESH_EVIDENCE_VERIFIED');assert.equal(r.manifestSha256,c.manifestSha256);assert.equal(r.packetManifestSha256,c.authorized.manifestSha256);assert.equal(r.approvalSha256,c.approvalSha256);assert.ok(now<r.expiresAt&&now<c.manifest.hardEndAt);
 for(const p of [r.index,...r.artifacts]){const b=fs.readFileSync(p.file);assert.equal(b.length,p.bytes);assert.equal(sha(b),p.sha256);}
 const text=r.special?fs.readFileSync(ROOT+'/fresh/grant.json','utf8'):null;if(text)assert.equal(sha(GRANT_PREFIX+safeClosureGrantText(parseSafeClosureGrant(text))),r.grantSha256);
 return {text,sha256:r.grantSha256,grant:text?parseSafeClosureGrant(text):{successor:r.successor,predecessor:r.predecessor},manifestSha256:c.manifestSha256,approvedManifestSha256:c.manifestSha256,special:r.special};
}
