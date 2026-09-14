import test from 'node:test';
import assert from 'node:assert/strict';
import * as verifier from './lib/comment-translator-paid-core-v1-gate1-safe-closure.mjs';
import {closedDeploymentFixture} from './fixtures/gate1-closed-deployment.mjs';

test('retry10 transition requires original retained and deployment proof objects',async()=>{
 assert.equal(typeof verifier.verifyRetry10SafeClosureTransition,'function');
 await assert.rejects(verifier.verifyRetry10SafeClosureTransition({retained:{},previousDeployment:{}}),/retry10-proof-brand/);
 const f=await closedDeploymentFixture(),previousDeployment=await verifier.verifyClosedDeploymentTransition(f.input());
 await assert.rejects(verifier.verifyRetry10SafeClosureTransition({retained:f.retained,previousDeployment:structuredClone(previousDeployment)}),/retry10-proof-brand/);
});

test('a different valid deployment cannot authorize a new controller predecessor',async()=>{
 const f=await closedDeploymentFixture(),previousDeployment=await verifier.verifyClosedDeploymentTransition(f.input());
 assert.equal(typeof verifier.verifyRetry10SafeClosureTransition,'function');
 await assert.rejects(verifier.verifyRetry10SafeClosureTransition({retained:f.retained,previousDeployment}),/retry10-prior-deployment/);
});
