import fs from 'node:fs';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {ROOT,json,record,pinned,readDpapi,requireLiveAuthorization,isolatedChildEnvironment} from './execution-inputs.mjs';
import {ATOMIC_LOCAL_DOCKER_ARGS} from '../lib/comment-translator-paid-core-v1-gate1-atomic-local-process.mjs';
const a=requireLiveAuthorization({closure:true}),owner=json(ROOT+'/control/source-owner.json');
assert.equal(owner.manifestSha256,a.manifestSha256);assert.match(owner.owner,/^ct-atomic-[a-f0-9]{24}$/);
try{process.kill(owner.processId,0);assert.fail('WARM_PROCESS_STILL_RUNNING');}catch(e){assert.equal(e.code,'ESRCH');}
record(ROOT,'control/source-cleanup-claimed.json',{at:Date.now(),owner:owner.owner,allowance:1});
const runtime=json(pinned(ROOT,a.manifest.localRuntime));
const docker=args=>{const r=spawnSync(runtime.dockerExecutable,[...ATOMIC_LOCAL_DOCKER_ARGS,...args],{env:isolatedChildEnvironment(a),encoding:'utf8',windowsHide:true,shell:false,timeout:20000,maxBuffer:1048576});assert.equal(r.status,0);return r.stdout.trim();};
const saved=fs.existsSync(ROOT+'/control/warm-context.dpapi')?readDpapi(ROOT+'/control/warm-context.dpapi'):null;
if(saved){assert.equal(saved.owner,owner.owner);assert.equal(saved.manifestSha256,a.manifestSha256);}
const ids=docker(['ps','-aq','--no-trunc','--filter','label=com.comment_translator.atomic='+owner.owner]).split('\n').filter(Boolean);assert.ok(ids.length<=4);
const volumes=new Set(saved?.volumes??[]);for(const leaf of fs.readdirSync(ROOT+'/control').filter(n=>/^source-resource-[1-4]\.json$/.test(n))){const r=json(ROOT+'/control/'+leaf);assert.equal(r.owner,owner.owner);assert.equal(r.manifestSha256,a.manifestSha256);for(const v of r.volumes)volumes.add(v);}
const images=new Set(runtime.images.map(r=>r.id));
for(const id of ids){assert.match(id,/^[a-f0-9]{64}$/);const row=JSON.parse(docker(['inspect',id]))[0];assert.equal(row.Id,id);assert.equal(row.Config.Labels['com.comment_translator.atomic'],owner.owner);assert.ok(images.has(row.Image));for(const m of row.Mounts)if(m.Type==='volume')volumes.add(m.Name);}
// A interrupted preparation can own fewer than four containers. Identity, not
// a successful warm receipt, controls cleanup; only this recorded owner is used.
for(const id of [...ids].reverse())docker(['rm','-f',id]);
for(const volume of volumes){
 assert.match(volume,/^[a-f0-9]{64}$/);const filter='name=^'+volume+'$';
 const found=docker(['volume','ls','-q','--filter',filter]);if(found==='')continue;
 assert.equal(found,volume);assert.equal(docker(['ps','-aq','--filter','volume='+volume]),'');
 docker(['volume','rm',volume]);assert.equal(docker(['volume','ls','-q','--filter',filter]),'');
}
assert.equal(docker(['ps','-aq','--filter','label=com.comment_translator.atomic='+owner.owner]),'');
record(ROOT,'source-cleanup.json',{ownedContainersRemaining:0,ownedVolumesRemaining:0,removedOnlyOwned:true,completedAt:Date.now(),partialPreparation:!saved});
console.log(JSON.stringify({status:'OWNED_SOURCE_CLEANED',containers:ids.length,volumes:volumes.size}));
