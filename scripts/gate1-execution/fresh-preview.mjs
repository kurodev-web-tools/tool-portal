import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {ROOT,json,sha} from './execution-inputs.mjs';
import {beginProducer,finishProducer,previewInvocation,runReadOnlySql} from './fresh-common.mjs';
export function verifyPreviewReadback({baseline,readback}){
 assert.equal(readback.status,0);assert.equal(readback.stderr,'');assert.equal(readback.error,undefined);assert.equal(readback.signal,null);
 const state=JSON.parse(readback.stdout);assert.deepEqual(state,baseline);assert.equal(state.serverMajor,17);assert.equal(state.readOnly,'on');assert.equal(state.tls,true);assert.equal(state.otherActiveClients,0);assert.equal(state.relations.length,77);
 return state;
}
export function collectPreview(){
 const context=beginProducer('preview'),prepared=previewInvocation(),preservation=json(ROOT+'/preservation.json');
 assert.equal(preservation.status,'PASS');const baseline=json(ROOT+'/baseline.json');
 const before=baseline.state,query=fs.readFileSync(preservation.directory+'/preservation-query.sql');assert.equal(sha(query),preservation.querySha256);
 const state=verifyPreviewReadback({baseline:before,readback:runReadOnlySql(prepared,query,{},60000)});
 return finishProducer(context,{target:'preview',bindingSha256:prepared.saved.bindingSha256,dbWrites:0,nativeExit:0,nativeErrorClass:null,state});
}
if(process.argv[1]&&fileURLToPath(import.meta.url)===path.resolve(process.argv[1])){try{assert.equal(process.argv.length,2);console.log(JSON.stringify(collectPreview()));}catch{console.log(JSON.stringify({status:'FRESH_PREVIEW_REJECTED'}));process.exitCode=1;}}
