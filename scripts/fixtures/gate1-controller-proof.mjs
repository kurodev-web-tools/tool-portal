// Synthetic records for local tests only; never live evidence.
import {createHash} from 'node:crypto';
const sha=v=>createHash('sha256').update(v).digest('hex');
export function proofFixture(target='preview',now=Date.now()){
 const expected={target,runId:'b'.repeat(64),sourceCommit:'a'.repeat(40),sourceBindingSha256:'c'.repeat(64),observerSha256:'d'.repeat(64),bridgeSha256:'e'.repeat(64)};
 const policy={schemaVersion:2,stopEvidencePolicy:'supabase-inactive-v2',t0:new Date(now-10000).toISOString(),...expected};
 const rounds=[{startedElapsedMs:2000,completedElapsedMs:5000,pinnedAddressCount:1,directRefusedCount:0,directNoConnectCount:1},{startedElapsedMs:6000,completedElapsedMs:9000,pinnedAddressCount:1,directRefusedCount:0,directNoConnectCount:1}];
 const evidence={status:'SOURCE_PAUSED_VERIFIED',stopEvidencePolicy:policy.stopEvidencePolicy,pinSetId:'f'.repeat(64),directEvidence:'UNKNOWN',rounds};
 const http=status=>({status,complete:true,classification:'HTTP_COMPLETE',bodyBytes:80,state:'RETURNED',elapsedMs:100});
 const rows=[{...policy,observedAt:new Date(now-9000).toISOString(),stage:'BASELINE_READY',addressCount:1,http:{rest:http(401),auth:http(200)},elapsedMs:1000,mutations:0,stopEvidence:false},
  ...rounds.map((r,i)=>({...policy,observedAt:new Date(now-10000+r.completedElapsedMs).toISOString(),stage:'PAUSE_ROUND',round:i+1,startedElapsedMs:r.startedElapsedMs,completedElapsedMs:r.completedElapsedMs,roundComplete:true,diagnostics:{management:[{sourceMatched:true,status:'INACTIVE'},{sourceMatched:true,status:'INACTIVE'}],dns:['RESOLVED','ABSENT'],http:{rest:http(540),auth:http(540)},direct:{NO_CONNECT_WITHIN_WINDOW:1}},mutations:0,stopEvidence:false})),
  {...policy,observedAt:new Date(now).toISOString(),stage:'PAIR_CANDIDATE',stoppingEvidence:evidence,elapsedMs:10000,stopEvidence:false,mutations:0}];
 const terminal={...policy,stage:'PAIR_TERMINAL',stoppingEvidence:evidence,stopEvidence:true,restoreEligible:false,receiptSha256:null,receiptBytes:0,elapsedMs:10000,mutations:0};delete terminal.bridgeSha256;
 function encode(){let previous='0'.repeat(64);const journal=Buffer.from(rows.map((payload,sequence)=>{const value={sequence,previousSha256:previous,payload};previous=sha(JSON.stringify(value));return JSON.stringify({...value,sha256:previous});}).join('\n')+'\n');return {journal,terminal:Buffer.from(JSON.stringify({...terminal,receiptSha256:sha(journal),receiptBytes:journal.length})),expected,notBeforeAt:now-8000,now};}
 return {rows,terminal,expected,encode,now};
}
