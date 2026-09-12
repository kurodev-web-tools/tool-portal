// Pure shared contracts. A matching profile/digest is not independent proof or
// authorization; only the configuration owner can provision a closure grant.
import {exact,publicState,requireThat,validatePolicy,validatePredecessor} from './core.mjs';

export const GRANT_PREFIX='gate1-safe-closure-grant-v1\n',POLICY_PREFIX='gate1-controller-policy-v1\n';
export const GRANT_HEADER='X-Controller-Safe-Closure-Grant-Sha256';
const SHA=/^[a-f0-9]{64}$/,COMMIT=/^[a-f0-9]{40}$/;
const digest=v=>typeof v==='string'&&SHA.test(v),millis=v=>Number.isSafeInteger(v)&&v>=0;
const sorted=v=>Array.isArray(v)?v.map(sorted):v!==null&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,sorted(v[k])])):v;
export const canonicalJson=value=>JSON.stringify(sorted(value));
export async function sha256Text(text){const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text));return Array.from(new Uint8Array(bytes),b=>b.toString(16).padStart(2,'0')).join('');}

export function previewUnknownClosureStateText(s){
 requireThat(exact(s,['runId','phase','reason','sequence','hardEndAt','leaseEnd','cleanupEnd','operations','projects','projectObservedAt','gate','formalStopAccepted']));
 requireThat(digest(s.runId)&&s.phase==='RESTORED'&&s.reason==='MUTATION_OUTCOME_UNKNOWN'&&s.gate==='NO-GO'&&s.formalStopAccepted===false);
 requireThat(millis(s.sequence)&&s.sequence<=256&&[s.hardEndAt,s.leaseEnd,s.cleanupEnd].every(millis)&&s.leaseEnd<=s.hardEndAt);
 requireThat(exact(s.projects,['preview','recovery'])&&s.projects.preview==='ACTIVE_HEALTHY'&&s.projects.recovery==='INACTIVE');
 requireThat(exact(s.projectObservedAt,['preview','recovery'])&&Object.values(s.projectObservedAt).every(millis));
 requireThat(exact(s.operations,['previewPause','previewResume','recoveryPause','recoveryResume'])&&Object.values(s.operations).every(o=>exact(o,['attempts','outcome'])));
 requireThat(s.operations.previewPause.attempts===1&&s.operations.previewPause.outcome==='UNKNOWN'&&s.operations.previewResume.attempts===1&&['UNKNOWN','ACCEPTED'].includes(s.operations.previewResume.outcome));
 requireThat(['recoveryPause','recoveryResume'].every(op=>s.operations[op].attempts===0&&s.operations[op].outcome===null));
 return canonicalJson(s);
}

export function safeClosureGrantText(g){
 requireThat(exact(g,['schemaVersion','kind','grantId','predecessor','successor','policySha256','approvalSha256','closureEvidenceSha256','issuedAt','expiresAt']));
 requireThat(g.schemaVersion===1&&g.kind==='PREVIEW_ONLY_UNKNOWN_SAFE_CLOSURE_V1'&&[g.grantId,g.policySha256,g.approvalSha256,g.closureEvidenceSha256].every(digest));
 validatePredecessor(g.predecessor);
 requireThat(exact(g.successor,['runId','sourceCommit','hardEndAt','manifestSha256'])&&digest(g.successor.runId)&&g.successor.runId!==g.predecessor.runId&&typeof g.successor.sourceCommit==='string'&&COMMIT.test(g.successor.sourceCommit)&&digest(g.successor.manifestSha256)&&millis(g.successor.hardEndAt));
 requireThat([g.issuedAt,g.expiresAt].every(millis)&&g.issuedAt<g.expiresAt&&g.expiresAt-g.issuedAt<=300000);
 const text=canonicalJson(g);requireThat(new TextEncoder().encode(text).byteLength<=4096);return text;
}
export function parseSafeClosureGrant(text){
 requireThat(typeof text==='string'&&new TextEncoder().encode(text).byteLength<=4096);
 const g=JSON.parse(text);
 // Exact canonical bytes reject duplicate keys (including escaped equivalents),
 // alternate order/whitespace and double encoding, before any grant is trusted.
 requireThat(safeClosureGrantText(g)===text);return g;
}
export const grantSha256=text=>{parseSafeClosureGrant(text);return sha256Text(GRANT_PREFIX+text);};
export const policySha256=policy=>sha256Text(POLICY_PREFIX+canonicalJson(validatePolicy(policy)));

export function validateClosureBinding(previous,policy,grant){
 safeClosureGrantText(grant);const oldPolicy=validatePolicy(previous.policy),current=validatePolicy(policy);
 requireThat(previous.schemaVersion===1&&previous.sourceCommit===oldPolicy.sourceCommit&&Object.keys(oldPolicy).every(k=>k==='sourceCommit'||oldPolicy[k]===current[k]));
 requireThat(previous.runId===grant.predecessor.runId&&previous.sourceCommit===grant.predecessor.sourceCommit&&current.sourceCommit===grant.successor.sourceCommit);
 return previewUnknownClosureStateText(publicState(previous));
}
export function validateWorkerClosureTime(previous,grant,now){
 requireThat(millis(now)&&millis(previous.hardEndAt)&&millis(previous.cleanupEnd));
 requireThat(now>=Math.max(previous.hardEndAt,previous.cleanupEnd)+60000);
 // PC issuedAt is audit data, never compared with the Worker clock.
 requireThat(grant.expiresAt>now&&grant.expiresAt-now<=600000);
 requireThat(grant.successor.hardEndAt>now&&grant.successor.hardEndAt-now<=1200000);
}
