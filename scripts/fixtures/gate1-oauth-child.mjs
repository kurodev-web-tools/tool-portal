// Real child/process termination test; no OAuth or network operation is made.
import assert from 'node:assert/strict';
import {ROOT,authorizePacket} from '../gate1-execution/execution-inputs.mjs';
assert.equal(authorizePacket(ROOT).local,true);
process.stdout.write('https://oauth.invalid/authorize?scope=account%3Aread%20user%3Aread%20workers_scripts%3Awrite%20offline_access\n');
let value='';for await(const b of process.stdin){value+=b;assert.ok(value.length<=128);}assert.equal(value,'LOCAL_OPERATOR_COMPLETED\n');
