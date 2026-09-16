import assert from 'node:assert/strict';
import {ROOT,requireLiveAuthorization,json} from './execution-inputs.mjs';
import {verifyHistory,historyValue} from './accepted-history.mjs';
import {beginProducer,finishProducer,getJson} from './fresh-common.mjs';
import {policySha} from './safe-closure-inputs.mjs';
import {controllerBudget} from './http-budget.mjs';
export async function collectController(){
 const a=requireLiveAuthorization(),history=historyValue(await verifyHistory(a)),c=beginProducer('controller');
 controllerBudget();const url=new URL(a.manifest.controllerOrigin);assert.equal(url.protocol,'https:');assert.equal(url.pathname,'/');assert.match(url.hostname,/^v-streamer-tools-gate1-recovery-controller-live\.[a-z0-9-]+\.workers\.dev$/);
 const r=await getJson({hostname:url.hostname,route:'/v1/state',limit:16384});assert.equal(r.status,503);assert.equal(r.complete,true);assert.equal(r.value.error,'DISABLED');
 const prepared=json(ROOT+'/control/preparation-ready.json');assert.equal(prepared.manifestSha256,a.manifestSha256);
 return finishProducer(c,{namespaceSha256:history.namespaceSha256,closedVersionSha256:history.versionSha256,predecessor:history.predecessor,priorPolicySha256:policySha(history.policy),disabled:{httpStatus:503,complete:true,error:'DISABLED'},remainingSecretNames:['CONTROLLER_POLICY_JSON'],oldPatQueries:0,preparationOAuthSeparated:true});
}
