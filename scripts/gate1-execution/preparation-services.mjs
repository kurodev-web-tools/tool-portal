import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {ROOT,SOURCE_ROOT,REPOSITORY,LIMITS,json,record,pinned,sha,readDpapi,executionNow,isolatedChildEnvironment} from './execution-inputs.mjs';
import {preparationClock} from './prearm-sequence.mjs';
import {runOAuthLauncher} from './oauth-launcher.mjs';
import {runHelper} from './native-io.mjs';
export async function observePreparedRuntime(context){
 const now=executionNow(context),root=context.root,w=json(root+'/source-warm.json');assert.equal(w.status,'SOURCE_PREWARMED');assert.equal(w.sourceUsers,0);assert.equal(w.credentialsIssued,false);assert.equal(w.hostPorts,0);assert.equal(w.network,'none');assert.equal(w.ownedContainers,4);
 const claim=json(root+'/control/source-warm-claimed.json');assert.equal(claim.manifestSha256,context.manifestSha256);assert.ok(claim.at>=json(root+'/control/preparation-claimed.json').startedAt&&claim.at<=now);
 if(!context.local){
  const saved=readDpapi(root+'/control/warm-context.dpapi');assert.equal(saved.manifestSha256,context.manifestSha256);assert.equal(saved.sourceUsers,0);assert.match(saved.owner,/^ct-atomic-[a-f0-9]{24}$/);assert.equal(saved.owned.length,4);
  const runtime=json(pinned(root,context.manifest.localRuntime));const run=args=>{const r=spawnSync(runtime.dockerExecutable,['--host','npipe:////./pipe/dockerDesktopLinuxEngine',...args],{env:isolatedChildEnvironment(context),encoding:'utf8',shell:false,windowsHide:true,timeout:10000,maxBuffer:1048576});assert.equal(r.status,0);assert.equal(r.stderr,'');return r.stdout;};
  for(const row of saved.owned){assert.match(row.id,/^[a-f0-9]{64}$/);const actual=JSON.parse(run(['inspect',row.id]))[0];assert.equal(actual.Id,row.id);assert.equal(actual.Image,row.image);assert.equal(actual.Config.Labels['com.comment_translator.atomic'],saved.owner);assert.equal(actual.State.Running,true);assert.equal(actual.HostConfig.NetworkMode,row.id===saved.db?'none':'container:'+saved.db);assert.deepEqual(actual.HostConfig.PortBindings??{},{});}
  assert.equal(run(['exec',saved.db,'psql','-X','-qAt','-U','postgres','-d','postgres','-c','BEGIN READ ONLY; SELECT count(*) FROM auth.users; ROLLBACK;']).trim(),'0');
 }
 return {at:now,manifestSha256:context.manifestSha256,sourceUsers:0,ownedContainers:4,credentialsIssued:false,network:'none',hostPorts:0};
}
export async function prepareServices(context,{out=()=>{}}={}){
 const root=context.root,start=executionNow(context),preparation=json(root+'/control/preparation-claimed.json'),sealed=json(root+'/control/credentials-sealed.json');
 assert.equal(sealed.manifestSha256,context.manifestSha256);pinned(root,sealed.credentials);
 const deadline=preparationClock(context.approval,preparation.startedAt,start);record(root,'control/services-claimed.json',{at:start,deadline,manifestSha256:context.manifestSha256});
 if(!context.local){const {checkLocalRuntime}=await import('./local-runtime.mjs');const runtime=json(pinned(root,context.manifest.localRuntime));checkLocalRuntime(runtime,context);}
 const oauth=await runOAuthLauncher(context,{out});assert.ok(executionNow(context)<deadline);
 if(context.local){record(root,'control/source-warm-claimed.json',{at:executionNow(context),manifestSha256:context.manifestSha256});record(root,'source-warm.json',{status:'SOURCE_PREWARMED',sourceUsers:0,ownedContainers:4,hostPorts:0,network:'none',credentialsIssued:false,fixture:true});}
 else await runHelper({executable:process.execPath,args:[path.join(SOURCE_ROOT,'source-warm.mjs')],cwd:REPOSITORY,env:isolatedChildEnvironment(context),timeoutMs:Math.max(1,deadline-Date.now()),onStarted:r=>record(root,'control/preparation-warm-process.json',r),onFailure:r=>record(root,'control/preparation-warm-failed.json',r)});
 const runtime=await observePreparedRuntime(context);assert.ok(executionNow(context)<deadline);
 const oauthPin={file:'control/oauth-login-result.json',bytes:fs.statSync(root+'/control/oauth-login-result.json').size,sha256:sha(fs.readFileSync(root+'/control/oauth-login-result.json'))};
 const runtimePin=record(root,'control/preparation-runtime.json',runtime);
 const value={status:'PREPARATION_SERVICES_READY',manifestSha256:context.manifestSha256,originalStartedAt:preparation.startedAt,deadlineAt:deadline,oauth:oauthPin,oauthProcessId:oauth.processId,runtime:runtimePin,credentials:sealed.credentials,completedAt:executionNow(context)};record(root,'control/preparation-ready.json',value);return {status:value.status,hostedEvidence:false};
}
