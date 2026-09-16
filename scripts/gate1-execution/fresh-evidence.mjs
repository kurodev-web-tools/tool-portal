import assert from 'node:assert/strict';
import {validateGate1PreviewContent} from '../lib/comment-translator-paid-core-v1-gate1-safe-closure.mjs';
import {sha} from './execution-inputs.mjs';

export function validateContent(record,expected){
 assert.equal(record.target,'preview');assert.equal(record.dbWrites,0);assert.equal(record.nativeExit,0);assert.equal(record.nativeErrorClass,null);
 validateGate1PreviewContent(record.state);assert.equal(sha(JSON.stringify(record.state)),expected.previewStateSha256);
 return record.state;
}
export function validateNative(n){
 assert.equal(n.target,'preview');assert.equal(n.dbWrites,0);assert.equal(n.addressSetStable,true);
 assert.ok(Array.isArray(n.addresses)&&n.addresses.length>=1&&n.addresses.length<=8);assert.equal(new Set(n.addresses.map(a=>a.addressSha256)).size,n.addresses.length);
 for(const a of n.addresses){assert.match(a.addressSha256,/^[a-f0-9]{64}$/);assert.equal(a.nativeExit,0);assert.equal(a.stderrBytes,0);assert.equal(a.serverMajor,17);assert.equal(a.readOnly,'on');assert.equal(a.tls,true);assert.equal(a.anonSelect,false);}
 assert.ok(Number.isInteger(n.hostnameMismatch.exitCode)&&n.hostnameMismatch.exitCode!==0);assert.equal(n.hostnameMismatch.stdoutBytes,0);assert.equal(n.hostnameMismatch.errorClass,'CERTIFICATE_HOST_MISMATCH');
 for(const [id,status,classification] of [['auth',200,'AUTH_HEALTH'],['table',401,'EXPECTED_TABLE_PERMISSION_DENIED'],['invalidKey',401,'GATEWAY_KEY_REJECTED']]){
  const h=n.http[id];assert.equal(h.status,status);assert.equal(h.classification,classification);assert.equal(h.complete,true);
  assert.ok(Number.isSafeInteger(h.bodyBytes)&&h.bodyBytes>0&&h.bodyBytes<=8192);assert.ok(Number.isSafeInteger(h.elapsedMs)&&h.elapsedMs>=0&&h.elapsedMs<=3000);
 }
}
export function validateMetadata(m,policy){
 assert.equal(m.projectOperations,0);assert.equal(m.productionSqlOrConfig,0);assert.ok(m.startedAt<=m.completedAt);
 assert.ok(Array.isArray(m.projects)&&m.projects.length===3);assert.deepEqual(m.projects.map(p=>p.role).sort(),['preview','production','recovery']);
 for(const p of m.projects){assert.equal(p.httpStatus,200);assert.equal(p.complete,true);assert.equal(p.id,policy[p.role+'Ref']);assert.equal(p.organization_id,policy.organizationId);assert.equal(p.region,'ap-northeast-1');assert.equal(p.status,p.role==='recovery'?'INACTIVE':'ACTIVE_HEALTHY');assert.equal(p.database.host,'db.'+p.id+'.supabase.co');assert.match(p.database.postgres_engine,/^17(?:\.|$)/);assert.ok(Number.isSafeInteger(p.startedAt)&&Number.isSafeInteger(p.completedAt)&&p.startedAt>=m.startedAt&&p.completedAt>=p.startedAt&&p.completedAt<=m.completedAt&&p.completedAt-p.startedAt<=3000);}
}
export function validateEvidenceTime(row,{allocatedAt,freshDeadlineAt,hardEndAt},now){
 assert.ok([row.startedAt,row.completedAt,now].every(Number.isSafeInteger));
 assert.ok(row.startedAt>=allocatedAt&&row.completedAt>=row.startedAt&&row.completedAt<=now&&now-row.startedAt<300000&&now<freshDeadlineAt&&now<hardEndAt,'EVIDENCE_EXPIRED');
}

export const PAT_PERMISSIONS={controllerPat:['Project Settings:READ-WRITE'],metadataReadPat:['Project Settings:READ'],configurationToken:['API Key Secrets:READ','API Keys:READ','Auth Config:READ-WRITE','Auth Signing Keys:READ','Data API Config:READ-WRITE','Data API JWT Secret:READ','Project Settings:READ-WRITE','Realtime Config:READ-WRITE']};
export const PAT_TARGETS={controllerPat:['preview','recovery'],configurationToken:['recovery'],metadataReadPat:['preview','recovery','production']};
export function validatePatReview(review,sealed,a,now){
 assert.equal(review.manifestSha256,a.manifestSha256);assert.equal(sealed.manifestSha256,a.manifestSha256);assert.equal(review.entries.length,3);
 for(const role of Object.keys(PAT_PERMISSIONS)){
  const rows=review.entries.filter(x=>x.role===role),inputs=sealed.inputs.filter(x=>x.role===role);assert.equal(rows.length,1);assert.equal(inputs.length,1);const r=rows[0];assert.equal(r.inputSha256,inputs[0].inputSha256);
  assert.deepEqual([...r.permissions].sort(),PAT_PERMISSIONS[role]);assert.deepEqual([...r.projectRefs].sort(),PAT_TARGETS[role].map(p=>a.policy[p+'Ref']).sort());assert.match(r.imageSha256,/^[a-f0-9]{64}$/);
  assert.ok([r.createdAt,r.reviewedAt,r.expiresAt].every(Number.isSafeInteger));assert.ok(r.createdAt>=a.approval.authorizedAt&&r.createdAt<=r.reviewedAt&&r.reviewedAt<=now&&r.expiresAt>=a.approval.expiresAt&&r.expiresAt-r.createdAt<=86400000);
 }
}
export function validatePatScope(v,sealed){
 assert.equal(v.status,'PAT_PROJECT_SCOPE_VERIFIED');assert.equal(v.allowed,6);assert.equal(v.denied,3);assert.equal(v.rows.length,9);assert.equal(v.oldPatQueries,0);
 for(const [role,targets] of Object.entries(PAT_TARGETS))for(const projectRole of ['preview','recovery','production']){
  const rows=v.rows.filter(r=>r.credentialRole===role&&r.projectRole===projectRole);assert.equal(rows.length,1);const r=rows[0];assert.equal(r.complete,true);assert.equal(r.inputSha256,sealed.inputs.find(i=>i.role===role).inputSha256);assert.equal(r.permitted,targets.includes(projectRole));assert.ok(r.permitted?r.httpStatus===200:[403,404].includes(r.httpStatus));
 }
}
