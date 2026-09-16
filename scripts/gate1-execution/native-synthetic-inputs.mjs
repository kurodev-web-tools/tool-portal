import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {createHmac} from 'node:crypto';
import {ROOT,REPOSITORY,requireLiveAuthorization,readDpapi,record,json,pinned,sha,isolatedChildEnvironment,nativeApiInput} from './execution-inputs.mjs';
import {getJson} from './fresh-common.mjs';
import {probeAdminSigning,syntheticSigningToken,classifyAdminSigningResponse} from '../lib/comment-translator-paid-core-v1-gate1-signing-evidence.mjs';
import {generateSyntheticInputs,protectSyntheticInputs,readSyntheticInputs} from './synthetic-inputs.mjs';
import {validateSyntheticPreparation} from '../lib/comment-translator-paid-core-v1-gate1-rehearsal-preparation.mjs';
import {ATOMIC_LOCAL_DOCKER_ARGS} from '../lib/comment-translator-paid-core-v1-gate1-atomic-local-process.mjs';
import {ATOMIC_MANAGED_SHAPE_SQL} from '../lib/comment-translator-paid-core-v1-gate1-atomic-restore.mjs';
import {REHEARSAL_TRANSFER_TABLES,REHEARSAL_READBACK_SQL} from '../lib/comment-translator-paid-core-v1-gate1-rehearsal-transfer.mjs';
import {prepareManagedRehearsalInvocation,nativeExecute} from '../lib/comment-translator-paid-core-v1-gate1-rehearsal-executor.mjs';

export const SIGNING_LIMITS=Object.freeze({managementGet:1,recoveryAuthGet:4,sourceAuthGet:1,retry:0,closing:0});
export const SOURCE_INPUT_LIMITS=Object.freeze({GET:16,POST:24,PUT:2,sql:36,exec:79,inspect:7,stop:1});
export function validateNativeRecipe(recipe,projectRef){
 assert.equal(recipe?.kind,'GATE1_NATIVE_SYNTHETIC_INPUT_V1');assert.equal(recipe.projectRef,projectRef);
 assert.match(recipe.legacyAnonKeyId??'',/^[A-Za-z0-9_-]{1,80}$/);assert.deepEqual(recipe.signingLimits,SIGNING_LIMITS);
 assert.equal(recipe.signingEvidence,'ADMIN_ROUTE_SIGNATURE_REJECTION_V1');
 return recipe;
}
// Exact two read-only queries; source and target are never interchangeable.
export const SYNTHETIC_TARGET_INVENTORY_SQL=`BEGIN READ ONLY; SET LOCAL statement_timeout='5000ms'; SELECT json_build_object('role',current_user,'superuser',(SELECT rolsuper FROM pg_roles WHERE rolname=current_user),'tls',coalesce((SELECT ssl FROM pg_stat_ssl WHERE pid=pg_backend_pid()),false),'serverMajor',current_setting('server_version_num')::int/10000,'managedShapeSha256',${ATOMIC_MANAGED_SHAPE_SQL},'counts',json_build_array(${REHEARSAL_TRANSFER_TABLES.map(t=>`(SELECT count(*) FROM ${t})`).join(',')}),'storageBuckets',(SELECT count(*) FROM storage.buckets),'storageObjects',(SELECT count(*) FROM storage.objects),'ssoProviders',(SELECT count(*) FROM auth.sso_providers)); ROLLBACK;`;
export async function collectSyntheticTarget(read,bounds,{requiresTls=true}={}){
 const v=JSON.parse(await read(SYNTHETIC_TARGET_INVENTORY_SQL,bounds));
 assert.equal(v.role,'postgres');assert.equal(v.superuser,false);assert.equal(v.serverMajor,17);assert.equal(typeof v.tls,'boolean');if(requiresTls)assert.equal(v.tls,true);
 assert.equal(v.counts.length,9);assert.ok(v.counts.every(n=>n===0));for(const k of ['storageBuckets','storageObjects','ssoProviders'])assert.equal(v[k],0);
 assert.ok(['2c7ef5df6baeae47ac2dd21b566e77177578cc2aa7c36d5921866434f4bc2d4c','8358275c2842cfe35ab42bc5280bcfa95f253435da9363f998dcfcfde7b68b4a'].includes(v.managedShapeSha256));
 return {managedShapeSha256:v.managedShapeSha256,baselineSha256:sha((await read(REHEARSAL_READBACK_SQL,bounds)).trim())};
}
// Shared native connection, with explicit isolated transports at the local entry.
// Its caller has already validated publication/approval or isolated fixture action.
export function prepareNativeSyntheticStage(client,context,identity,{recipe,apiInput,configurationToken,makeSource,collectTarget,request=getJson}){
 return client.runStage('fixtures-ready',async({signal,timeoutMs})=>{
  const deadlineAt=Math.min(Date.now()+timeoutMs,client.state().hardEndAt),guard=()=>{assert.ok(!signal.aborted&&Date.now()<deadlineAt,'NATIVE_INPUT_DEADLINE');};
  validateNativeRecipe(recipe,identity.projectRef);assert.equal(apiInput.projectRef,identity.projectRef);assert.match(apiInput.key,/^sb_publishable_[A-Za-z0-9_-]{10,200}$/);
  assert.equal(identity.manifestSha256,context.manifestSha256);assert.equal(identity.runId,client.state().runId);
  guard();record(context.root,'runtime/synthetic-producer-claimed.json',{...identity,deadlineAt,limits:SIGNING_LIMITS});
  const counts={managementGet:0,recoveryAuthGet:0,sourceAuthGet:0};
  const claim=kind=>{guard();assert.ok(counts[kind]<SIGNING_LIMITS[kind]);record(context.root,`runtime/signing-${kind}-${++counts[kind]}-claimed.json`,{...identity,at:Date.now(),method:'GET'});};
  const source=makeSource({signal,deadlineAt});
  try{
  guard();source.verify();guard();
  const sourceToken=syntheticSigningToken(source.oldKey,identity.runId);
  const http=async(kind,hostname,route,headers)=>{claim(kind);const r=await request({hostname,route,headers,signal,timeoutMs:Math.min(3000,deadlineAt-Date.now()),limit:8192});record(context.root,`runtime/signing-${kind}-${counts[kind]}-result.json`,{...identity,status:r.status,complete:r.complete,classification:classifyAdminSigningResponse(r),at:Date.now()});guard();return r;};
  const key=await http('managementGet','api.supabase.com',`/v1/projects/${identity.projectRef}/api-keys/${recipe.legacyAnonKeyId}?reveal=false`,{Authorization:'Bearer '+configurationToken});
  assert.ok(key.complete&&key.status===200);assert.equal(key.value?.id,recipe.legacyAnonKeyId);assert.equal(key.value?.type,'legacy');assert.equal(key.value?.name,'anon');
  const signingEvidence=await probeAdminSigning({...identity,sourceKey:source.oldKey,sourceToken,normalToken:key.value.api_key,signal,deadlineAt,
   sourceRequest:async(route,token)=>{claim('sourceAuthGet');const r=source.api(route.replace('/auth/v1',''),null,token,'GET'),value={status:r.status,complete:true,value:r.data};record(context.root,'runtime/signing-sourceAuthGet-1-result.json',{...identity,status:r.status,classification:classifyAdminSigningResponse(value),at:Date.now()});guard();return value;},
   targetRequest:(route,token)=>http('recoveryAuthGet',identity.projectRef+'.supabase.co',route,{apikey:apiInput.key,...(token?{Authorization:'Bearer '+token}:{})})});
  record(context.root,'runtime/signing-evidence.json',signingEvidence);guard();
  const target=await collectTarget({signal,timeoutMs:Math.min(10000,deadlineAt-Date.now())});guard();
  const guarded=fn=>(...args)=>{guard();const r=fn(...args);guard();return r;};
  const generated=await generateSyntheticInputs({...source,api:guarded(source.api),sql:guarded(source.sql),docker:guarded(source.docker),inspect:guarded(source.inspect),targetSigningSha256:undefined,signingEvidence,identity});guard();
  source.freeze();guard();
  const value=protectSyntheticInputs(context,identity,generated.fixture,guarded(source.sql),target);guard();
  record(context.root,'runtime/synthetic-producer-result.json',{...identity,counts,sourceOperations:source.operationCounts?.(),status:'INPUTS_PROTECTED',signingEvidenceSha256:sha(JSON.stringify(signingEvidence))});
  return validateSyntheticPreparation(value.fixture,identity);
  }finally{record(context.root,'runtime/source-input-counts.json',{...identity,at:Date.now(),operations:source.operationCounts?.()??null,limits:SOURCE_INPUT_LIMITS});}
 });
}
export function createWarmSyntheticSource(context,{signal,deadlineAt}){
 const guard=()=>assert.ok(!signal.aborted&&Date.now()<deadlineAt,'SOURCE_DEADLINE');guard();
 const w=readDpapi(context.root+'/control/warm-context.dpapi');assert.equal(w.manifestSha256,context.manifestSha256);assert.equal(w.sourceUsers,0);assert.match(w.owner,/^ct-atomic-[a-f0-9]{24}$/);assert.equal(w.owned.length,4);
 const runtime=json(pinned(context.root,context.manifest.localRuntime)),env=isolatedChildEnvironment(context);
 const operations={auth:{GET:0,POST:0,PUT:0},sql:0,docker:{exec:0,inspect:0,stop:0}};
 const docker=(args,input)=>{guard();assert.ok(['inspect','exec','stop'].includes(args[0]));const id=args[0]==='exec'?args[1]==='-i'?args[2]:args[1]:args[0]==='stop'?args.at(-1):args[1];assert.ok(w.owned.some(x=>x.id===id));
  assert.ok(operations.docker[args[0]]<SOURCE_INPUT_LIMITS[args[0]],'SOURCE_OPERATION_BUDGET');operations.docker[args[0]]++;const r=spawnSync(runtime.dockerExecutable,[...ATOMIC_LOCAL_DOCKER_ARGS,...args],{env,input,encoding:'utf8',windowsHide:true,shell:false,timeout:Math.max(1,Math.min(30000,deadlineAt-Date.now())),maxBuffer:4194304});guard();assert.ok(r.status===0&&!r.error&&!r.signal,'SOURCE_PROCESS_FAILED');return r;};
 const inspect=id=>JSON.parse(docker(['inspect',id]).stdout)[0];
 const sql=q=>{assert.ok(operations.sql<SOURCE_INPUT_LIMITS.sql,'SOURCE_SQL_BUDGET');operations.sql++;return docker(['exec','-i',w.db,'psql','-X','-qAt','-U','postgres','-d','postgres','-v','ON_ERROR_STOP=1'],'SET client_min_messages=warning; SET search_path=pg_catalog,public;\n'+q).stdout.trim();};
 const api=(route,body,token,method)=>{
  const verb=method??(body?'POST':'GET');assert.ok(operations.auth[verb]<SOURCE_INPUT_LIMITS[verb],'SOURCE_AUTH_BUDGET');operations.auth[verb]++;
  const code="let s='';process.stdin.on('data',b=>s+=b);process.stdin.on('end',async()=>{try{const q=JSON.parse(s);const r=await fetch('http://127.0.0.1:9999'+q.route,{method:q.method??(q.body?'POST':'GET'),redirect:'manual',signal:AbortSignal.timeout(q.timeoutMs),headers:{'Content-Type':'application/json',...(q.token?{Authorization:'Bearer '+q.token}:{})},...(q.body?{body:JSON.stringify(q.body)}:{})});let data=null;try{data=await r.json();}catch{}process.stdout.write(JSON.stringify({status:r.status,data,location:r.headers.get('location')}));}catch{process.exitCode=2;}});";
  return JSON.parse(docker(['exec','-i',w.client,'node','-e',code],JSON.stringify({route,body,token,method,timeoutMs:Math.max(1,Math.min(10000,deadlineAt-Date.now()))})).stdout);
 };
 const adminToken=key=>{const enc=v=>Buffer.from(JSON.stringify(v)).toString('base64url'),p=enc({alg:'HS256',typ:'JWT'})+'.'+enc({role:'service_role',iss:'supabase',iat:Math.floor(Date.now()/1000),exp:Math.floor(Date.now()/1000)+3600});return p+'.'+createHmac('sha256',key).update(p).digest('base64url');};
 return {...w,api,sql,docker,inspect,adminToken,operationCounts:()=>structuredClone(operations),foundationSql:fs.readFileSync(path.join(REPOSITORY,'supabase/migrations/20260527000000_account_preferences_foundation.sql'),'utf8'),verify(){
  for(const item of w.owned){const v=inspect(item.id);assert.equal(v.Config.Labels['com.comment_translator.atomic'],w.owner);assert.equal(v.Image,item.image);assert.equal(v.State.Running,true);assert.equal(Object.keys(v.HostConfig.PortBindings??{}).length,0);assert.ok(v.HostConfig.NetworkMode==='none'||v.HostConfig.NetworkMode==='container:'+w.db);}
  assert.equal(inspect(w.db).HostConfig.NetworkMode,'none');assert.equal(sql('SELECT count(*) FROM auth.users;'),'0');
 },freeze(){docker(['stop','--time','1',w.auth]);assert.equal(inspect(w.auth).State.Running,false);}};
}
export function createNativeInputProducer(client,identity,options,configurationToken){
 const context=requireLiveAuthorization(),recipe=validateNativeRecipe(json(pinned(ROOT,context.manifest.syntheticRecipe)),context.policy.recoveryRef),apiInput=nativeApiInput('recovery');
 const expected={...identity,target:'recovery',projectRef:context.policy.recoveryRef,manifestSha256:context.manifestSha256};
 return {prepare:()=>prepareNativeSyntheticStage(client,context,expected,{recipe,apiInput,configurationToken,makeSource:bounds=>createWarmSyntheticSource(context,bounds),collectTarget:bounds=>collectSyntheticTarget((sql,b)=>nativeExecute(prepareManagedRehearsalInvocation(options),sql,b),bounds)}),read:()=>readSyntheticInputs(context,expected)};
}
