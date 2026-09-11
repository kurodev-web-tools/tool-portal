import {createHash} from 'node:crypto';
import {isDeepStrictEqual} from 'node:util';
import {parseStrictJson} from './comment-translator-paid-core-v1-gate1-evidence.mjs';
import {createGate1PauseEvidenceTracker,parseWatchdogTimestamp,STOP_EVIDENCE_POLICY} from './comment-translator-paid-core-v1-gate1-watchdog.mjs';

const accepted=new WeakSet(),SHA=/^[a-f0-9]{64}$/,COMMIT=/^[a-f0-9]{40}$/;
const sha=v=>createHash('sha256').update(v).digest('hex');
const reject=()=>{throw Error('CONTROLLER_STOP_PROOF_REJECTED');};
const check=v=>{if(!v)reject();};
const exact=(o,keys)=>o!==null&&typeof o==='object'&&!Array.isArray(o)&&Object.keys(o).sort().join(',')===[...keys].sort().join(',');
const millis=n=>Number.isSafeInteger(n)&&n>=0;
const same=(a,b)=>isDeepStrictEqual(structuredClone(a),structuredClone(b));
const identityKeys=['target','runId','sourceCommit','sourceBindingSha256','observerSha256','bridgeSha256'];

// Accepts the persisted two-round observer format, never controller metadata.
// The caller must pin the observer's independently registered baseline identity
// and verify the published producer bytes before launch. Hashes bind records;
// they are not a signature proving a producer was honestly executed.
export function verifyControllerStopProof({journal,terminal,expected,notBeforeAt,now}){
 try{
  check(exact(expected,identityKeys)&&['preview','recovery'].includes(expected.target)&&COMMIT.test(expected.sourceCommit)&&identityKeys.filter(k=>!['target','sourceCommit'].includes(k)).every(k=>typeof expected[k]==='string'&&SHA.test(expected[k])));
  check(millis(now)&&millis(notBeforeAt)&&notBeforeAt<=now&&Buffer.isBuffer(journal)&&journal.length>0&&journal.length<=131072&&Buffer.isBuffer(terminal)&&terminal.length>0&&terminal.length<=16384);
  const text=journal.toString('utf8');check(Buffer.from(text).equals(journal)&&text.endsWith('\n'));
  const lines=text.slice(0,-1).split('\n');check(lines.length===4);
  let previous='0'.repeat(64);
  const rows=lines.map((line,sequence)=>{
   const row=parseStrictJson(line);check(exact(row,['sequence','previousSha256','payload','sha256'])&&row.sequence===sequence&&row.previousSha256===previous);
   previous=sha(JSON.stringify({sequence,previousSha256:previous,payload:row.payload}));check(row.sha256===previous);return row.payload;
  });
  const end=parseStrictJson(terminal.toString('utf8'));
  check(end.stage==='PAIR_TERMINAL'&&end.stopEvidence===true&&end.restoreEligible===false&&end.receiptBytes===journal.length&&end.receiptSha256===sha(journal));
  const epoch=parseWatchdogTimestamp(rows[0].t0);check(millis(epoch)&&epoch<=now);
  for(const [i,row] of [...rows,end].entries()){
   check(row.schemaVersion===2&&row.stopEvidencePolicy===STOP_EVIDENCE_POLICY&&row.t0===rows[0].t0&&row.mutations===0);
   for(const key of identityKeys)if(!(i===4&&key==='bridgeSha256'))check(row[key]===expected[key]);
   if(i<4){const at=parseWatchdogTimestamp(row.observedAt);check(millis(at)&&at>=epoch&&at<=now&&(!i||at>=parseWatchdogTimestamp(rows[i-1].observedAt)));check(row.stopEvidence===false);}
  }
  const [baseline,first,second,candidate]=rows;
  check(baseline.stage==='BASELINE_READY'&&baseline.elapsedMs>=0&&baseline.elapsedMs<=300000&&Number.isSafeInteger(baseline.addressCount)&&baseline.addressCount>=1&&baseline.addressCount<=8);
  check(baseline.http?.rest?.status===401&&baseline.http.rest.complete===true&&baseline.http.auth?.status===200&&baseline.http.auth.complete===true);
  check(candidate.stage==='PAIR_CANDIDATE'&&same(candidate.stoppingEvidence,end.stoppingEvidence));
  const stopping=candidate.stoppingEvidence;check(stopping?.status==='SOURCE_PAUSED_VERIFIED'&&SHA.test(stopping.pinSetId)&&Array.isArray(stopping.rounds)&&stopping.rounds.length===2);
  const tracker=createGate1PauseEvidenceTracker({...expected,stopEvidencePolicy:STOP_EVIDENCE_POLICY});let result;
  for(const [index,row] of [first,second].entries()){
   check(row.stage==='PAUSE_ROUND'&&row.round===index+1&&row.roundComplete===true&&row.startedElapsedMs>=baseline.elapsedMs&&epoch+row.startedElapsedMs>=notBeforeAt);
   const d=row.diagnostics;check(exact(d,['management','dns','http','direct']));
   check(Array.isArray(d.management)&&d.management.length===2&&d.management.every(m=>exact(m,['sourceMatched','status'])&&m.sourceMatched===true&&m.status==='INACTIVE'));
   check(Array.isArray(d.dns)&&d.dns.length===2&&d.dns.every(x=>['ABSENT','RESOLVED'].includes(x))&&exact(d.http,['rest','auth']));
   for(const h of Object.values(d.http))check(h.status===540&&h.complete===true&&h.state==='RETURNED'&&Number.isSafeInteger(h.bodyBytes)&&h.bodyBytes>=0&&h.bodyBytes<=65536&&Number.isFinite(h.elapsedMs)&&h.elapsedMs>=0&&h.elapsedMs<=3000);
   check(d.direct&&typeof d.direct==='object'&&!Array.isArray(d.direct)&&Object.keys(d.direct).every(k=>['CLOSED_REFUSED','NO_CONNECT_WITHIN_WINDOW'].includes(k))&&Object.values(d.direct).every(n=>Number.isSafeInteger(n)&&n>=1));
   const counts={pinnedAddressCount:baseline.addressCount,directRefusedCount:d.direct.CLOSED_REFUSED??0,directNoConnectCount:d.direct.NO_CONNECT_WITHIN_WINDOW??0};
   check(same(stopping.rounds[index],{startedElapsedMs:row.startedElapsedMs,completedElapsedMs:row.completedElapsedMs,...counts}));
   result=tracker.observe({status:'SOURCE_PAUSE_ROUND_COMPLETE',stopEvidencePolicy:STOP_EVIDENCE_POLICY,runId:expected.runId,sourceCommit:expected.sourceCommit,sourceBindingSha256:expected.sourceBindingSha256,pinSetId:stopping.pinSetId,...counts},row.startedElapsedMs,row.completedElapsedMs);
  }
  check(result!==null&&same(result,stopping)&&candidate.elapsedMs>=second.completedElapsedMs&&end.elapsedMs>=candidate.elapsedMs&&end.elapsedMs<=1200000);
  const completedAt=epoch+Math.ceil(second.completedElapsedMs);check(millis(completedAt)&&completedAt<=now&&now-completedAt<=60000&&epoch+end.elapsedMs<=now);
  const proof=Object.freeze({...expected,evidenceSha256:sha(Buffer.concat([journal,terminal])),startedAt:epoch+first.startedElapsedMs,completedAt,directEvidence:result.directEvidence,formalStopAccepted:true,gate:'NO-GO'});
  accepted.add(proof);return proof;
 }catch{reject();}
}

export function assertControllerStopProof(proof,{target,sourceCommit,notBeforeAt,now}){
 check(accepted.has(proof)&&proof.target===target&&proof.sourceCommit===sourceCommit&&millis(notBeforeAt)&&millis(now)&&proof.startedAt>=notBeforeAt&&proof.completedAt<=now&&now-proof.completedAt<=60000);return true;
}
