import {nativeApiInput} from './execution-inputs.mjs';
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {ROOT,json,requireLiveAuthorization} from './execution-inputs.mjs';
try{
 assert.equal(process.argv.length,3);const role=process.argv[2];assert.ok(['preview','recovery'].includes(role));
 const {policy,sourceCommit}=requireLiveAuthorization(),identity=json(ROOT+'/runtime/identity.json');assert.equal(identity.sourceCommit,sourceCommit);
 const previous=nativeApiInput(role);assert.equal(previous.projectRef,policy[role+'Ref']);assert.match(previous.key,/^sb_publishable_[A-Za-z0-9_-]{10,200}$/);
 const input={projectRef:previous.projectRef,key:previous.key,stopEvidencePolicy:'supabase-inactive-v2',bridgeDirectory:ROOT+'/runtime/'+role+'-management-bridge',runId:identity.runId};
 for(const leaf of [role+'-input.json',role+'-observer.jsonl',role+'-stdout.jsonl',role+'-control.json',role+'-management-bridge'])assert.equal(fs.existsSync(ROOT+'/runtime/'+leaf),false);
 fs.writeFileSync(ROOT+'/runtime/'+role+'-input.json',JSON.stringify(input),{flag:'wx',mode:0o600});console.log(JSON.stringify({role,status:'INPUT_PREPARED',remoteCalls:0}));
}catch{console.log(JSON.stringify({status:'OBSERVER_INPUT_REJECTED',remoteCalls:0}));process.exitCode=1;}
