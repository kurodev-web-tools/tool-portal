import {nativeBinding} from './execution-inputs.mjs';
import {ROOT} from './execution-inputs.mjs';
import {requireLiveAuthorization} from './execution-inputs.mjs';
requireLiveAuthorization();
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {buildPsqlInvocation} from '../comment-translator-paid-core-v1-gate1-preflight-readonly.mjs';
const sha=x=>createHash('sha256').update(x).digest('hex');const report={target:'preview',status:'FAIL',dbWrites:0};
try{
 const receipt=JSON.parse(fs.readFileSync((ROOT+'/preservation.json')));assert.equal(receipt.status,'PASS');assert.ok(receipt.directory.startsWith('D:/Gate1Backups/preview-prepause-'));const before=JSON.parse(fs.readFileSync(receipt.directory+'/before-state.json'));assert.equal(sha(fs.readFileSync(receipt.directory+'/preview.dump')),receipt.archiveSha256);assert.equal(sha(JSON.stringify(before.relations)),receipt.stateSha256);
 const input=nativeBinding('preview');
 const password=fs.readFileSync(input.credentialFile,'utf8').replace(/^\uFEFF/,'').replace(/\r?\n$/,'');assert.ok(password&&!/[\r\n\0]/.test(password));
 const bin=input.postgresBin;const env={PATH:bin+path.delimiter+process.env.PATH,SystemRoot:process.env.SystemRoot,PGHOST:input.binding.host,PGPORT:'5432',PGDATABASE:'postgres',PGUSER:'postgres',PGSSLMODE:'verify-full',PGSSLROOTCERT:input.caFile,PGGSSENCMODE:'disable',PGPASSWORD:password};const invocation=buildPsqlInvocation(input.binding,env);assert.equal(invocation.ok,true);
 report.phase='native_read';const r=spawnSync(path.join(bin,'psql.exe'),invocation.args,{env:invocation.env,input:fs.readFileSync(receipt.directory+'/preservation-query.sql'),encoding:'utf8',shell:false,windowsHide:true,timeout:60000,maxBuffer:4194304});report.nativeExit=r.status;report.nativeErrorClass=r.stderr?(/certificate|SSL/i.test(r.stderr)?'TLS_ERROR':/connection|resolve/i.test(r.stderr)?'CONNECTION_ERROR':'NATIVE_STDERR'):null;assert.equal(r.status,0);assert.equal(r.stderr,'');const after=JSON.parse(r.stdout);report.phase='preservation_compare';fs.writeFileSync(receipt.directory+'/live-postresume-readback.json',JSON.stringify(after));const previous=new Map(before.relations.map(x=>[x.nspname+'.'+x.relname,x]));report.differences=after.relations.flatMap(x=>{const old=previous.get(x.nspname+'.'+x.relname);previous.delete(x.nspname+'.'+x.relname);return JSON.stringify(old)===JSON.stringify(x)?[]:[{relation:x.nspname+'.'+x.relname,changedFields:old?Object.keys(x).filter(k=>JSON.stringify(x[k])!==JSON.stringify(old[k])):['ADDED']}];});report.removedRelations=[...previous.keys()];report.observed={serverMajor:after.serverMajor,tls:after.tls,historyCount:after.historyCount,vaultCount:after.vaultCount,storageCount:after.storageCount,cronActive:after.cronActive};assert.equal(after.serverMajor,17);assert.equal(after.tls,true);assert.deepEqual(after.relations,before.relations);assert.equal(after.cronActive,0);assert.equal(after.readOnly,'on');assert.equal(after.otherActiveClients,0);
 Object.assign(report,{status:'PASS',tableCount:after.relations.length,historyCount:after.historyCount,vaultCount:after.vaultCount,storageCount:after.storageCount,cronActive:after.cronActive,stateSha256:sha(JSON.stringify(after.relations)),completedAt:new Date().toISOString()});
}catch(e){report.failureClass=e.code??'SANITIZED_FAILURE';process.exitCode=1;}
console.log(JSON.stringify(report));
