import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {executionFixture,repo} from './fixtures/gate1-execution.mjs';
test('fixed entry generates protected inputs, transfers to independent local DB, reads back and closes',async()=>{
 const f=executionFixture({after(){} });
 const r=await new Promise(resolve=>{const p=spawn(process.execPath,[path.join(repo,'scripts/gate1-execution/live-session.mjs'),'--local-synthetic-acceptance'],{cwd:repo,env:f.env,windowsHide:true,stdio:['ignore','pipe','pipe']});let output='';p.stdout.on('data',b=>output+=b);p.stderr.on('data',()=>{});p.on('close',code=>resolve({code,output}));});
 assert.equal(r.code,0,r.output);const report=JSON.parse(fs.readFileSync(f.root+'/local-synthetic-result.json'));assert.equal(report.status,'PASS');assert.equal(report.transfer.independentCommittedReadbackMatched,true);assert.equal(report.ownedContainersRemaining,0);assert.equal(report.ownedVolumesRemaining,0);assert.equal(report.sameRun,true);assert.equal(report.closed,true);assert.equal(report.controllerTerminal,'RESTORED');console.log(JSON.stringify({evidence:f.root,status:report.status}));
});

test('native producer connection uses real local Auth signature decisions and protected handoff',async()=>{
 const f=executionFixture({after(){} });
 f.manifest.localRuntime=f.write('local-runtime.json',{dockerExecutable:'C:/Program Files/Docker/Docker/resources/bin/docker.exe'});f.manifest.files.push(f.manifest.localRuntime);f.pin();
 const r=await new Promise(resolve=>{const p=spawn(process.execPath,[path.join(repo,'scripts/gate1-execution/live-session.mjs'),'--local-native-synthetic-acceptance'],{cwd:repo,env:f.env,windowsHide:true,stdio:['ignore','pipe','pipe']});let output='';p.stdout.on('data',b=>output+=b);p.stderr.on('data',()=>{});p.on('close',code=>resolve({code,output}));});
 assert.equal(r.code,0,r.output);const report=f.read('local-synthetic-result.json');assert.equal(report.status,'PASS');assert.equal(report.nativeConnection,true);assert.equal(report.signing.kind,'ADMIN_ROUTE_SIGNATURE_REJECTION_V1');assert.equal(report.signing.normalUserRouteVerified,false);assert.equal(report.signatureNegativeCases,3);assert.equal(report.closed,true);assert.equal(report.controllerTerminal,'RESTORED');assert.equal(report.ownedContainersRemaining,0);assert.equal(report.ownedVolumesRemaining,0);console.log(JSON.stringify({evidence:f.root,status:report.status,entry:'local-native'}));
});
