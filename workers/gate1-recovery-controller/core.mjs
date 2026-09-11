// Provider-independent state transitions. Callers persist each change before I/O.
export const LEASE_MS=120000, MAX_RUN_MS=1800000, CLEANUP_MS=600000, POLL_MS=5000;
const META_MS=10000, SHA=/^[a-f0-9]{64}$/, REF=/^[a-z]{20}$/, COMMIT=/^[a-f0-9]{40}$/;
const OPS=['previewPause','recoveryResume','recoveryPause','previewResume'];
const FINAL=['RESTORED','ENDED_NO_MUTATION','NEEDS_OPERATOR'];
export const exact=(value,keys)=>value!==null&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).sort().join(',')===[...keys].sort().join(',');
export function requireThat(value){if(!value)throw Error('CONTROLLER_REJECTED');}
const millis=n=>Number.isSafeInteger(n)&&n>=0;
export function validatePolicy(p){
  requireThat(exact(p,['mode','previewRef','recoveryRef','productionRef','organizationId','sourceCommit','emergencyPreviewResume']));
  requireThat(['simulation','live'].includes(p.mode)&&[p.previewRef,p.recoveryRef,p.productionRef].every(r=>typeof r==='string'&&REF.test(r))&&new Set([p.previewRef,p.recoveryRef,p.productionRef]).size===3);
  requireThat(typeof p.organizationId==='string'&&/^[a-zA-Z0-9_-]{5,100}$/.test(p.organizationId)&&typeof p.sourceCommit==='string'&&COMMIT.test(p.sourceCommit)&&typeof p.emergencyPreviewResume==='boolean');
  if(p.mode==='simulation')requireThat(p.previewRef==='p'.repeat(20)&&p.recoveryRef==='r'.repeat(20)&&p.productionRef==='x'.repeat(20)&&p.organizationId==='synthetic-org');
  return structuredClone(p);
}
export function createRun(policy,p,now){
  policy=validatePolicy(policy);
  requireThat(exact(p,['runId','sourceCommit','hardEndAt','preservationSha256','preservationVerifiedAt','acknowledgeEmergencyContainment']));
  requireThat(millis(now)&&typeof p.runId==='string'&&SHA.test(p.runId)&&p.sourceCommit===policy.sourceCommit&&typeof p.preservationSha256==='string'&&SHA.test(p.preservationSha256)&&millis(p.preservationVerifiedAt)&&p.preservationVerifiedAt<=now&&now-p.preservationVerifiedAt<=300000);
  requireThat(millis(p.hardEndAt)&&p.hardEndAt>now&&p.hardEndAt<=now+MAX_RUN_MS&&p.acknowledgeEmergencyContainment===true);
  return {schemaVersion:1,policy,runId:p.runId,sourceCommit:p.sourceCommit,createdAt:now,lastNow:now,hardEndAt:p.hardEndAt,leaseEnd:Math.min(now+LEASE_MS,p.hardEndAt),cleanupEnd:null,phase:'ARMED',reason:'WAITING_FOR_OPERATOR',sequence:0,preservationSha256:p.preservationSha256,preservationVerifiedAt:p.preservationVerifiedAt,
    operations:Object.fromEntries(OPS.map(op=>[op,null])),observed:{preview:null,recovery:null},previewSeenInactive:false,recoverySeenActive:false,recoveryInactiveFirst:null,recoveryInactivePair:false,requested:null,evidence:[]};
}
export function terminal(s){return FINAL.includes(s.phase);}
function close(s,reason,now){
  if(terminal(s)||s.phase==='CLOSING')return;
  s.phase='CLOSING';s.reason=reason;s.cleanupEnd=now+CLEANUP_MS;s.requested=null;
}
const fresh=(s,role,status,now)=>s.observed[role]?.status===status&&now>=s.observed[role].completedAt&&now-s.observed[role].startedAt<=META_MS;
const recoverySafe=(s,now)=>fresh(s,'recovery','INACTIVE',now)&&(!s.operations.recoveryResume||(s.recoverySeenActive&&s.operations.recoveryPause&&s.recoveryInactivePair));
export function tick(s,now){
  requireThat(millis(now));if(terminal(s))return;
  if(now<s.lastNow)close(s,'CLOCK_REGRESSION',s.lastNow);
  s.lastNow=Math.max(s.lastNow,now);now=s.lastNow;
  if(s.phase!=='CLOSING'&&(now>=s.leaseEnd||now>=s.hardEndAt))close(s,now>=s.hardEndAt?'ABSOLUTE_DEADLINE':'CLIENT_LIVENESS_EXPIRED',now);
  if(s.phase==='CLOSING'){
    if(!s.operations.previewPause&&!s.operations.recoveryResume){s.phase='ENDED_NO_MUTATION';return;}
    if(s.operations.previewResume&&fresh(s,'preview','ACTIVE_HEALTHY',now)&&recoverySafe(s,now)){s.phase='RESTORED';return;}
    if(now>=s.cleanupEnd){s.phase='NEEDS_OPERATOR';s.reason='CLEANUP_UNCONFIRMED';}
  }
}
export function command(s,p,now){
  tick(s,now);
  const withEvidence=['progress','resume-recovery'].includes(p?.type);
  requireThat(exact(p,['runId','sequence','type',...(withEvidence?['evidenceSha256']:[])]));
  requireThat(p.runId===s.runId&&Number.isSafeInteger(p.sequence)&&p.sequence===s.sequence+1&&s.sequence<256&&!terminal(s));
  requireThat(['pause-preview','resume-recovery','progress','abort','finish'].includes(p.type));
  requireThat(s.phase!=='CLOSING'||p.type==='abort'||p.type==='finish');
  if(withEvidence)requireThat(typeof p.evidenceSha256==='string'&&SHA.test(p.evidenceSha256)&&!s.evidence.includes(p.evidenceSha256));
  if(p.type==='pause-preview')requireThat(!s.operations.previewPause);
  if(p.type==='resume-recovery')requireThat(s.operations.previewPause&&s.previewSeenInactive&&!s.operations.recoveryResume);
  s.sequence=p.sequence;
  if(withEvidence)s.evidence.push(p.evidenceSha256);
  if(p.type==='abort'||p.type==='finish')close(s,p.type==='abort'?'OPERATOR_ABORT':'OPERATOR_FINISH',now);
  else {s.leaseEnd=Math.min(now+LEASE_MS,s.hardEndAt);if(p.type!=='progress')s.requested=p.type==='pause-preview'?'previewPause':'recoveryResume';}
}
export function observe(s,role,o,now){
  requireThat(['preview','recovery'].includes(role)&&exact(o,['status','startedAt','completedAt'])&&typeof o.status==='string'&&o.status.length<=64);
  requireThat(millis(o.startedAt)&&millis(o.completedAt)&&o.startedAt<=o.completedAt&&o.completedAt<=now&&o.completedAt-o.startedAt<=3000);
  if(o.startedAt<(s.observed[role]?.startedAt??0))return;
  s.observed[role]=structuredClone(o);
  if(role==='preview'&&o.status==='INACTIVE'&&s.operations.previewPause&&o.startedAt>=s.operations.previewPause.attemptedAt)s.previewSeenInactive=true;
  if(role==='recovery'){
    if(o.status==='ACTIVE_HEALTHY'&&s.operations.recoveryResume&&o.startedAt>=s.operations.recoveryResume.attemptedAt)s.recoverySeenActive=true;
    if(o.status==='INACTIVE'&&s.recoverySeenActive&&s.operations.recoveryPause&&o.startedAt>=s.operations.recoveryPause.attemptedAt){
      if(s.recoveryInactiveFirst===null)s.recoveryInactiveFirst=o.completedAt;
      else if(o.startedAt-s.recoveryInactiveFirst>=1000)s.recoveryInactivePair=true;
    }else{s.recoveryInactiveFirst=null;s.recoveryInactivePair=false;}
  }
}
export function nextAction(s,now){
  tick(s,now);if(s.phase!=='CLOSING')return null;
  if(s.operations.recoveryResume&&s.recoverySeenActive&&!s.operations.recoveryPause&&fresh(s,'recovery','ACTIVE_HEALTHY',now))return 'recoveryPause';
  if(s.policy.emergencyPreviewResume&&s.operations.previewPause&&s.previewSeenInactive&&!s.operations.previewResume&&fresh(s,'preview','INACTIVE',now)&&recoverySafe(s,now))return 'previewResume';
  return null;
}
export function claim(s,op,now){
  tick(s,now);requireThat(OPS.includes(op)&&!s.operations[op]&&!terminal(s));
  if(op==='previewPause')requireThat(s.phase==='ARMED'&&s.requested===op&&now>=s.preservationVerifiedAt&&now-s.preservationVerifiedAt<=300000&&fresh(s,'preview','ACTIVE_HEALTHY',now)&&fresh(s,'recovery','INACTIVE',now));
  else if(op==='recoveryResume')requireThat(s.phase==='ARMED'&&s.requested===op&&s.previewSeenInactive&&fresh(s,'preview','INACTIVE',now)&&fresh(s,'recovery','INACTIVE',now));
  else requireThat(nextAction(s,now)===op);
  s.operations[op]={attemptedAt:now,outcome:'PENDING'};s.requested=null;
}
export function settle(s,op,outcome,now){
  requireThat(OPS.includes(op)&&s.operations[op]?.outcome==='PENDING'&&['ACCEPTED','UNKNOWN'].includes(outcome));
  s.operations[op].outcome=outcome;
  if(outcome==='UNKNOWN')close(s,'MUTATION_OUTCOME_UNKNOWN',Math.max(now,s.lastNow));
}
export function confirmDispatch(s,op,now){
  requireThat(OPS.includes(op)&&s.operations[op]?.outcome==='PENDING');
  // Recheck the original guards after persistence/alarm awaits without spending
  // another claim. An intervening abort, expiry or stale observation cancels I/O.
  const check=structuredClone(s);check.operations[op]=null;check.requested=op;
  claim(check,op,now);
}
export function nextAlarm(s,now){
  if(terminal(s))return null;
  return Math.max(now+1,s.phase==='CLOSING'?Math.min(now+POLL_MS,s.cleanupEnd):Math.min(s.leaseEnd,s.hardEndAt));
}
export function publicState(s){
  return {runId:s.runId,phase:s.phase,reason:s.reason,sequence:s.sequence,hardEndAt:s.hardEndAt,leaseEnd:s.leaseEnd,cleanupEnd:s.cleanupEnd,
    operations:Object.fromEntries(OPS.map(op=>[op,s.operations[op]?{attempts:1,outcome:s.operations[op].outcome}:{attempts:0,outcome:null}])),
    projects:Object.fromEntries(['preview','recovery'].map(role=>[role,s.observed[role]?.status??'UNKNOWN'])),
    projectObservedAt:Object.fromEntries(['preview','recovery'].map(role=>[role,s.observed[role]?.completedAt??null])),gate:'NO-GO',formalStopAccepted:false};
}
