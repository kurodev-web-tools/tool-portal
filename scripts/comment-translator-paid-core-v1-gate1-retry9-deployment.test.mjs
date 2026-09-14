import test from 'node:test';
import assert from 'node:assert/strict';
import * as verifier from './lib/comment-translator-paid-core-v1-gate1-safe-closure.mjs';
import {closedDeploymentFixture} from './fixtures/gate1-closed-deployment.mjs';

test('retry9 registration refuses summaries and copied deployment proof objects',async()=>{
 assert.equal(typeof verifier.verifyRetry9ClosedDeploymentTransition,'function');
 await assert.rejects(verifier.verifyRetry9ClosedDeploymentTransition({retained:{},previousDeployment:{}}),/retry9-proof-brand/);
 const f=await closedDeploymentFixture(),previousDeployment=await verifier.verifyClosedDeploymentTransition(f.input());
 await assert.rejects(verifier.verifyRetry9ClosedDeploymentTransition({retained:f.retained,previousDeployment:structuredClone(previousDeployment)}),/retry9-proof-brand/);
});

test('a valid proof for another closed deployment cannot register an arbitrary successor',async()=>{
 const f=await closedDeploymentFixture(),previousDeployment=await verifier.verifyClosedDeploymentTransition(f.input());
 await assert.rejects(verifier.verifyRetry9ClosedDeploymentTransition({retained:f.retained,previousDeployment,packet:{format:'GATE1_RETRY9_CLIENT_PREARM_20260914_V1'}}),/retry9-prior-deployment/);
});
