import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {SOURCE_ROOT,REPOSITORY,json,record,pinned,readDpapi,sha,isolatedChildEnvironment} from './execution-inputs.mjs';
import {runHelper,waitReceipt} from './native-io.mjs';
import {collectController} from './fresh-controller.mjs';
import {issuePinnedGrant} from './safe-closure-inputs.mjs';
import {validateHandoff,verifyArmConnection} from './postarm-handoff.mjs';
import {readObserverBaseline} from './live-session.mjs';

const alive=pid=>{try{process.kill(pid,0);return true;}catch(e){if(e.code==='ESRCH')return false;throw e;}};
export async function nativeHelper(c,file,args=[],{input,deadlineAt}={}){
 assert.equal(c.local,false,'NATIVE_HELPER_FORBIDDEN_IN_FIXTURE');const source=path.join(SOURCE_ROOT,file);
 assert.ok(c.manifest.source.some(p=>path.join(REPOSITORY,p.file)===source),'NATIVE_SOURCE_NOT_PINNED');
 return runHelper({executable:process.execPath,args:[source,...args],cwd:REPOSITORY,env:isolatedChildEnvironment(c),input,timeoutMs:Math.max(1,(deadlineAt??Date.now()+180000)-Date.now()),
  onStarted:r=>record(c.root,'control/native-'+file.replace(/[^a-z0-9]/g,'-')+'-'+args.join('-')+'-started.json',r),
  onFailure:r=>record(c.root,'control/native-'+file.replace(/[^a-z0-9]/g,'-')+'-'+args.join('-')+'-failed.json',r),nativeDiagnostic:file==='fresh-native.mjs'});
}
export async function stageAction(c,stage,clock){
 assert.equal(c.local,false);const root=c.root,read=file=>json(root+'/'+file),run=(file,args=[],input)=>nativeHelper(c,file,args,{input,deadlineAt:clock.deadlineAt});
 const clientProcess=()=>{const p=read('control/client-process.json');return {...p,runId:clock.runId,alive:alive(p.processId)};};
 const observer=()=>{const identity=read('runtime/identity.json'),p=read('runtime/preview-observer-process.json');readObserverBaseline('preview',identity.identities.preview);return {...p,runId:clock.runId,alive:alive(p.processId),baselineAccepted:true,stopEvidence:false};};
 switch(stage){
  case 'identity':await run('control/identity.mjs');return read('control/oauth-identity.json');
  case 'scope':await run('control/pat-scope-check.mjs');return read('control/pat-scope-verified.json');
  case 'controller':await collectController();return read('fresh/controller.json');
  case 'existing-version':case 'secret-version':case 'live-version':{const which={'existing-version':'existing','secret-version':'secrets','live-version':'live'}[stage];await run('control/version.mjs',[which]);return read('control/version-'+which+'.json');}
  case 'preserve':await run('preserve-preview.mjs');return read('preservation.json');
  case 'bind-warm':{
   const p=read('preservation.json'),w=readDpapi(root+'/control/warm-context.dpapi');assert.equal(p.status,'PASS');assert.equal(w.sourceUsers,0);assert.equal(w.owned.length,4);
   const {observePreparedRuntime}=await import('./preparation-services.mjs');await observePreparedRuntime(c);
   const directory=fs.realpathSync(p.directory).replaceAll('\\','/');assert.ok(directory.startsWith('D:/Gate1Backups/preview-prepause-'));
   fs.writeFileSync(directory+'/live-synthetic-source-context.json',JSON.stringify(w),{flag:'wx',mode:0o600});
   const value={status:'EMPTY_PREPARATION_BOUND',runId:clock.runId,sourceUsers:0,credentialsIssued:false,preparedAt:w.preparedAt,contextSha256:sha(JSON.stringify(w))};record(root,'control/warm-bound.json',value);return value;
  }
  case 'preview-content':await run('fresh-preview.mjs');return read('fresh/preview.json');
  case 'preview-native':await run('fresh-native.mjs',[],JSON.stringify(json(pinned(root,c.manifest.previewApiInput))));return read('fresh/native.json');
  case 'metadata-first':case 'metadata-second':await run('fresh-metadata.mjs',[stage==='metadata-first'?'first':'second']);return read('fresh/'+stage+'.json');
  case 'grant':return issuePinnedGrant();
  case 'secrets':await run('control/secrets.mjs');return read('control/initial-secrets-result.json');
  case 'deploy-live':await run('control/deploy.mjs',['live']);return read('control/deploy-live-result.json');
  case 'client':await run('control/start-client.mjs');return {identity:await waitReceipt({file:root+'/runtime/identity.json',deadlineAt:clock.deadlineAt,validate:r=>assert.equal(r.runId,clock.runId)}),process:clientProcess()};
  case 'observer':{
   await run('start-observer.mjs',['preview']);
   await waitReceipt({file:root+'/runtime/preview-control.json',deadlineAt:clock.deadlineAt,validate:r=>assert.equal(r.runId,clock.runId)});return observer();
  }
  case 'arm':{
   await run('send-command.mjs',['arm']);
   const receipt=await waitReceipt({file:root+'/runtime/command-1.receipt.json',deadlineAt:clock.deadlineAt,validate:r=>assert.equal(r.type,'arm')});
   const v={state:receipt.state,armDispatchAt:read('runtime/command-1.claim.json').at,identity:read('runtime/identity.json'),clientProcess:clientProcess(),observer:observer()};
   v.handoff=verifyArmConnection({...v,allocation:clock,now:Date.now(),handoff:validateHandoff(c,clock.allocatedAt)});record(root,'control/arm-handoff.json',v.handoff);return v;
  }
 }
 assert.fail('UNKNOWN_FIXED_STAGE');
}
