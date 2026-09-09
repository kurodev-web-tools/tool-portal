import assert from 'node:assert/strict';
import {test} from 'node:test';
import path from 'node:path';
import {validateLocalRoundTripRequest} from './comment-translator-paid-core-v1-gate1-local-roundtrip.mjs';
test('roundtrip accepts only fixed local scratch, exact ownership identifiers and capture/restore modes',()=>{
 const input={mode:'capture',containerId:'a'.repeat(64),projectId:'gate1-ct-paid-v1-a3-abc123',workDirectory:path.resolve('.tmp/gate1-local-replay/gate1-cli-atomicity-Ab123')};
 assert.equal(validateLocalRoundTripRequest(input),input.workDirectory);
 for(const change of [{mode:'sql'},{containerId:'arbitrary'},{projectId:'another-project'},{workDirectory:path.resolve('.tmp/elsewhere/gate1-cli-atomicity-Ab123')},{workDirectory:path.resolve('.tmp/gate1-local-replay/../gate1-cli-atomicity-Ab123')},{sql:'select 1'}])assert.throws(()=>validateLocalRoundTripRequest({...input,...change}));
});

test('local schema roundtrip restores exact captured defaults and rejects arbitrary grant SQL',async()=>{
 const {prepareLocalRoundTripSchema}=await import('./comment-translator-paid-core-v1-gate1-local-roundtrip.mjs');
 const defaults=[{scope:'',role:'anon',privilege:'SELECT',grantable:false},{scope:'public',role:'service_role',privilege:'INSERT',grantable:true}];
 const restored=prepareLocalRoundTripSchema('SELECT 1;',defaults);
 assert.ok(restored.indexOf('REVOKE ALL ON TABLES')<restored.indexOf('SELECT 1;'));
 assert.ok(restored.includes('ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" GRANT SELECT ON TABLES TO "anon";'));
 assert.ok(restored.includes('IN SCHEMA "public" GRANT INSERT ON TABLES TO "service_role" WITH GRANT OPTION;'));
 for(const row of [{...defaults[0],role:'arbitrary'},{...defaults[0],privilege:'SELECT; DROP TABLE x'},{...defaults[0],scope:'auth'},{...defaults[0],grantable:'true'}])assert.throws(()=>prepareLocalRoundTripSchema('',[row]));
 assert.throws(()=>prepareLocalRoundTripSchema('',[defaults[0],defaults[0]]));
});
