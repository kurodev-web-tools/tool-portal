import test from 'node:test';
import assert from 'node:assert/strict';
import {verifyControllerStopProof,assertControllerStopProof} from './lib/comment-translator-paid-core-v1-gate1-controller-proof.mjs';
import {proofFixture} from './fixtures/gate1-controller-proof.mjs';
test('recomputes both complete rounds and preserves Direct UNKNOWN',()=>{
 const f=proofFixture(),proof=verifyControllerStopProof(f.encode());
 assert.equal(proof.directEvidence,'UNKNOWN');assert.equal(proof.target,'preview');assert.equal(proof.formalStopAccepted,true);
 assert.equal(assertControllerStopProof(proof,{target:'preview',sourceCommit:f.expected.sourceCommit,notBeforeAt:f.now-8000,now:f.now}),true);
 assert.throws(()=>assertControllerStopProof({...proof},{target:'preview',sourceCommit:f.expected.sourceCommit,notBeforeAt:f.now-8000,now:f.now}));
});
test('rejects recomputed journals with missing brackets, partial HTTP, connected/unknown Direct, invalid time or reused run/source',()=>{
 for(const mutate of [
  f=>f.rows[1].diagnostics.management.pop(),f=>f.rows[1].diagnostics.management[1].status='ACTIVE_HEALTHY',
  f=>f.rows[1].diagnostics.http.auth.complete=false,f=>f.rows[1].diagnostics.http.rest.status=503,
  f=>f.rows[1].diagnostics.http.auth.state='WRAPPER_REJECTED',f=>f.rows[1].diagnostics.direct.UNKNOWN=1,
  f=>f.rows[1].diagnostics.dns[1]='UNVERIFIED',f=>f.rows[1].roundComplete=false,
  f=>f.rows[2].startedElapsedMs=5500,f=>f.rows[1].sourceCommit='0'.repeat(40),
  f=>f.rows[0].runId='1'.repeat(64),f=>f.rows[0].http.rest.status=200,
  f=>f.terminal.stopEvidence=false,f=>f.terminal.stoppingEvidence.directEvidence='ALL_REFUSED',
  f=>f.rows.push({...f.rows[3],stage:'OBSERVER_FAILED'}),
 ]){const f=proofFixture();mutate(f);assert.throws(()=>verifyControllerStopProof(f.encode()),/CONTROLLER_STOP_PROOF_REJECTED/);}
});
test('rejects forged terminal, broken hash chain, stale proof and proofs before the owned pause',()=>{
 const f=proofFixture();const a=f.encode();a.journal=Buffer.from(a.journal.toString().replace('BASELINE_READY','BASELINE_OTHER'));
 assert.throws(()=>verifyControllerStopProof(a));
 const b=f.encode();b.terminal=Buffer.from(b.terminal.toString().replace('PAIR_TERMINAL','RESTORED'));assert.throws(()=>verifyControllerStopProof(b));
 assert.throws(()=>verifyControllerStopProof({...f.encode(),now:f.now+60001}));
 assert.throws(()=>verifyControllerStopProof({...f.encode(),notBeforeAt:f.now-7999}));
 const proof=verifyControllerStopProof(f.encode());
 assert.throws(()=>assertControllerStopProof(proof,{target:'recovery',sourceCommit:f.expected.sourceCommit,notBeforeAt:f.now-8000,now:f.now}));
});
