import fs from 'node:fs';import assert from 'node:assert/strict';import {spawnSync} from 'node:child_process';import {randomBytes,createHash,createHmac} from 'node:crypto';
import {ROOT,authorizePacket,isolatedChildEnvironment} from '../gate1-execution/execution-inputs.mjs';
import {ATOMIC_LOCAL_DOCKER_ARGS} from '../lib/comment-translator-paid-core-v1-gate1-atomic-local-process.mjs';
import {ATOMIC_MANAGED_SHAPE_SQL} from '../lib/comment-translator-paid-core-v1-gate1-atomic-restore.mjs';
import {REHEARSAL_READBACK_SQL} from '../lib/comment-translator-paid-core-v1-gate1-rehearsal-transfer.mjs';
import {createRehearsalExecutor,createRehearsalAttemptLedger} from '../lib/comment-translator-paid-core-v1-gate1-rehearsal-executor.mjs';
import {prepareSyntheticStage,transferSyntheticStage} from '../gate1-execution/synthetic-inputs.mjs';
import {prepareNativeSyntheticStage,collectSyntheticTarget,createWarmSyntheticSource,SIGNING_LIMITS} from '../gate1-execution/native-synthetic-inputs.mjs';
import {protect} from '../gate1-execution/control/credential-intake.mjs';
import {probeAdminSigning,syntheticSigningToken} from '../lib/comment-translator-paid-core-v1-gate1-signing-evidence.mjs';
import {createBoundClient} from '../gate1-execution/postarm-handoff.mjs';
import {runCommandLoop} from '../gate1-execution/client-loop.mjs';
import {createRun,command,observe,claim,settle,tick,publicState,nextAction} from '../../workers/gate1-recovery-controller/core.mjs';
import {proofFixture} from './gate1-controller-proof.mjs';
import {verifyControllerStopProof} from '../lib/comment-translator-paid-core-v1-gate1-controller-proof.mjs';
const c=authorizePacket(ROOT);assert.equal(c.local,true);const localEnv=isolatedChildEnvironment(c),calls=[];
const nativeMode=process.argv[2]==='--local-native-synthetic-acceptance';
const owner='ct-atomic-'+randomBytes(12).toString('hex'),name=owner+'-db',password=randomBytes(24).toString('hex');
const nodeImage='sha256:d189b8072865b5d8289af9435dee18eb6eef82f465e1d7d092fa9665bbd4ce54';
const owned=[],volumes=[],hash=x=>createHash('sha256').update(x).digest('hex'),lit=s=>"'"+String(s).replaceAll("'","''")+"'",wait=ms=>new Promise(r=>setTimeout(r,ms));
let phase='images',db,client,auth,report={scope:'LOCAL_SYNTHETIC_ONLY',status:'FAIL',externalDelivery:false};
const docker=(args,input,allow=false)=>{calls.push({kind:'docker',operation:args[0],sql:args.includes('psql')});const r=spawnSync('C:/Program Files/Docker/Docker/resources/bin/docker.exe',[...ATOMIC_LOCAL_DOCKER_ARGS,...args],{env:localEnv,input,encoding:'utf8',windowsHide:true,timeout:30000,maxBuffer:4194304});if(!allow&&(r.status!==0||r.error||r.signal))throw Object.assign(Error('NATIVE_FAILED'),{sqlState:r.stderr?.match(/ERROR:\s+([0-9A-Z]{5}):/)?.[1]??null,reason:r.stderr?.match(/ERROR:\s+(?:P0001:\s+)?(REHEARSAL_[A-Z_]+)/)?.[1]??null});return r;};
const inspect=id=>JSON.parse(docker(['inspect',id]).stdout)[0];
function run(suffix,image,env={},before=[],after=[]){const id=docker(['run','-d','--pull=never','--name',owner+'-'+suffix,'--label','com.comment_translator.atomic='+owner,'--network',suffix.endsWith('db')?'none':'container:'+db,...Object.entries(env).flatMap(([k,v])=>['-e',k+'='+v]),...before,image,...after]).stdout.trim();assert.match(id,/^[a-f0-9]{64}$/);const v=inspect(id);owned.push({id,image:v.Image});volumes.push(...v.Mounts.filter(m=>m.Type==='volume').map(m=>m.Name));return id;}
const sql=(q,role='postgres',database='postgres')=>{assert.ok(['postgres','ct_rehearsal_realtime'].includes(database));return docker(['exec','-i',db,'psql','-X','-qAt','-U',role,'-d',database,'-v','ON_ERROR_STOP=1','-v','VERBOSITY=verbose'],'SET client_min_messages=warning; SET search_path=pg_catalog,public;\n'+q).stdout.trim();};
const api=(path,body,token,method)=>{calls.push({kind:'localAuth',path:path.split('?')[0],method:method??(body?'POST':'GET')});
 const code="let s='';process.stdin.on('data',b=>s+=b);process.stdin.on('end',async()=>{try{const q=JSON.parse(s);const r=await fetch('http://127.0.0.1:9999'+q.path,{method:q.method??(q.body?'POST':'GET'),redirect:'manual',signal:AbortSignal.timeout(10000),headers:{'Content-Type':'application/json',...(q.token?{Authorization:'Bearer '+q.token}:{})},...(q.body?{body:JSON.stringify(q.body)}:{})});let data;try{data=await r.json();}catch{data=null;}process.stdout.write(JSON.stringify({status:r.status,data,location:r.headers.get('location')}));}catch{process.exitCode=2;}});";
 return JSON.parse(docker(['exec','-i',client,'node','-e',code],JSON.stringify({path,body,token,method})).stdout);
};
const adminToken=(key,role='service_role')=>{const enc=v=>Buffer.from(JSON.stringify(v)).toString('base64url'),payload=enc({alg:'HS256',typ:'JWT'})+'.'+enc({role,iss:'supabase',iat:Math.floor(Date.now()/1000),exp:Math.floor(Date.now()/1000)+3600});return payload+'.'+createHmac('sha256',key).update(payload).digest('base64url');};
async function startAuth(suffix,key,closure={}){const id=run(suffix,'public.ecr.aws/supabase/gotrue:v2.192.0',{
 GOTRUE_API_HOST:'127.0.0.1',GOTRUE_API_PORT:'9999',API_EXTERNAL_URL:'http://localhost:9999',GOTRUE_SITE_URL:'http://localhost:3000',GOTRUE_DB_DRIVER:'postgres',GOTRUE_DB_DATABASE_URL:`postgres://supabase_auth_admin:${password}@127.0.0.1:5432/postgres?sslmode=disable`,GOTRUE_JWT_SECRET:key,GOTRUE_JWT_EXP:'3600',GOTRUE_MAILER_OTP_EXP:'3600',GOTRUE_DISABLE_SIGNUP:'false',GOTRUE_EXTERNAL_PHONE_ENABLED:'false',GOTRUE_EXTERNAL_ANONYMOUS_USERS_ENABLED:'false',GOTRUE_SECURITY_MANUAL_LINKING_ENABLED:'false',GOTRUE_JWT_AUD:'authenticated',GOTRUE_JWT_DEFAULT_GROUP_NAME:'authenticated',GOTRUE_EXTERNAL_EMAIL_ENABLED:'true',GOTRUE_MAILER_AUTOCONFIRM:'false',GOTRUE_SMTP_HOST:'127.0.0.1',GOTRUE_SMTP_PORT:'1025',GOTRUE_SMTP_ADMIN_EMAIL:'noreply@example.test',GOTRUE_SMTP_SENDER_NAME:'Local fixture',GOTRUE_SMTP_MAX_FREQUENCY:'1ns',GOTRUE_RATE_LIMIT_EMAIL_SENT:'1000',...closure});
 for(let i=0;i<60;i++){try{if(api('/health').status===200)return id;}catch{}await wait(500);}throw Error('AUTH_TIMEOUT');}

let operator,offset=0;const clock=()=>Date.now()+offset;
try{
 phase='isolated-preparation';
 async function database(suffix,key,closed){
  db=run(suffix+'db','public.ecr.aws/supabase/postgres:17.6.1.140',{POSTGRES_PASSWORD:password});
  let ready=false;for(let i=0;i<60;i++){if(docker(['exec',db,'pg_isready','-h','127.0.0.1','-U','postgres'],null,true).status===0){ready=true;break;}await wait(500);}assert.ok(ready);
  sql('ALTER ROLE supabase_auth_admin PASSWORD '+lit(password)+';','supabase_admin');
  client=run(suffix+'client',nodeImage,{},['--entrypoint','node'],['-e','setInterval(()=>{},100000);']);run(suffix+'smtp','public.ecr.aws/supabase/mailpit:v1.30.2');
  auth=await startAuth(suffix+'auth',key,closed?{GOTRUE_DISABLE_SIGNUP:'true',GOTRUE_EXTERNAL_EMAIL_ENABLED:'false'}:{});
  assert.equal(sql('SELECT count(*) FROM auth.users;'),'0');return {db,client,auth};
 }
 const oldKey=randomBytes(32).toString('hex'),newKey=randomBytes(32).toString('hex');
 const src=await database('source-',oldKey,false),dst=await database('target-',newKey,true);
 const foundationSql=fs.readFileSync('supabase/migrations/20260527000000_account_preferences_foundation.sql','utf8');sql(foundationSql);
 const allocation={runId:'b'.repeat(64),allocatedAt:clock(),hardEndAt:clock()+1200000,manifestSha256:c.manifestSha256};allocation.hardEndAt=allocation.allocatedAt+1200000;
 const identity={runId:allocation.runId,sourceCommit:c.sourceCommit,target:'recovery',...(nativeMode?{projectRef:c.policy.recoveryRef,manifestSha256:c.manifestSha256}:{})};
 let normalToken,sourceToken;
 if(nativeMode){
  protect(c,{manifestSha256:c.manifestSha256,owner,password,oldKey,...src,owned:owned.slice(0,4),volumes:[],preparedAt:new Date().toISOString(),sourceUsers:0},'control/warm-context.dpapi');
  const enc=v=>Buffer.from(JSON.stringify(v)).toString('base64url'),p=enc({alg:'HS256',typ:'JWT'})+'.'+enc({iss:'supabase',ref:identity.projectRef,role:'anon',iat:Math.floor(Date.now()/1000),exp:Math.floor(Date.now()/1000)+3600});
  normalToken=p+'.'+createHmac('sha256',newKey).update(p).digest('base64url');sourceToken=syntheticSigningToken(oldKey,identity.runId);
  const req=which=>async(route,token)=>{({db,client,auth}=which);const r=api(route.replace('/auth/v1',''),null,token,'GET');return {status:r.status,complete:true,value:r.data};};
  const input={...identity,sourceKey:oldKey,sourceToken,normalToken,deadlineAt:Date.now()+60000,sourceRequest:req(src),targetRequest:req(dst)};
  // Actual pinned Auth: a matching key reaches not_admin, never mismatch PASS.
  await assert.rejects(()=>probeAdminSigning({...input,targetRequest:async(route,token)=>req(dst)(route,token===sourceToken?normalToken:token)}));
  const expired=enc({alg:'HS256',typ:'JWT'})+'.'+enc({iss:'supabase',role:'anon',iat:1,exp:2});
  const expiredToken=expired+'.'+createHmac('sha256',newKey).update(expired).digest('base64url');
  await assert.rejects(()=>probeAdminSigning({...input,targetRequest:async(route,token)=>req(dst)(route,token===sourceToken?expiredToken:token)}));
  await assert.rejects(()=>probeAdminSigning({...input,targetRequest:async(route,token)=>req(dst)(route,token===sourceToken?'malformed':token)}));
  report.signatureNegativeCases=3;
 }
 const bindings=Object.fromEntries(['preview','recovery'].map(role=>[role,{sourceBindingSha256:'c'.repeat(64),observerSha256:'d'.repeat(64),bridgeSha256:'e'.repeat(64)}]));
 let remote=null;const projects={preview:'ACTIVE_HEALTHY',recovery:'INACTIVE'},journal=[];
 const manage=()=>{for(const role of ['preview','recovery'])observe(remote,role,{status:projects[role],startedAt:clock(),completedAt:clock()},clock());};
 const transport=async(route,body)=>{
  calls.push({kind:'controllerFixture',method:body?'POST':'GET',route});
  if(route==='/v1/arm'){remote=createRun(c.policy,body,clock());manage();}
  if(route==='/v1/command'){command(remote,body,clock());manage();}
  if(remote){manage();const op=remote.requested??nextAction(remote,clock());if(op){claim(remote,op,clock());projects[op.startsWith('preview')?'preview':'recovery']=op.endsWith('Pause')?'INACTIVE':'ACTIVE_HEALTHY';settle(remote,op,'ACCEPTED',clock());manage();}tick(remote,clock());}
  return {status:200,body:JSON.stringify(remote?publicState(remote):{phase:'UNARMED',gate:'NO-GO',formalStopAccepted:false})};
 };
 operator=createBoundClient({context:c,allocation,options:{...identity,hardEndAt:allocation.hardEndAt,observerBindings:bindings,manifestSha256:c.manifestSha256,approvedManifestSha256:c.manifestSha256,transport,now:clock,journal:{append:r=>journal.push(r)},stagePlan:{'fixtures-ready':r=>r.status==='LOCAL_FIXTURES_READY','synthetic-transfer':r=>r.status==='SYNTHETIC_TRANSFER_VERIFIED'},observeRecoveryStop:async({observeState})=>{
  let restored=false;for(let i=0;i<4;i++){const s=await observeState();if(s.phase==='RESTORED'&&s.projects.preview==='ACTIVE_HEALTHY'&&s.projects.recovery==='INACTIVE'){restored=true;break;}await wait(1100);}assert.equal(restored,true);
  const v=inspect(dst.db);assert.equal(v.Config.Labels['com.comment_translator.atomic'],owner);docker(['stop','--time','1',dst.db]);assert.equal(inspect(dst.db).State.Running,false);
  offset+=10000;return verifyControllerStopProof(proofFixture('recovery',clock()).encode());
 }}});
 fs.mkdirSync(ROOT+'/runtime');let index=0;const commands=['arm','pause-preview','resume-recovery','fixtures-ready','synthetic-transfer','finish'];
 const session={client:operator,runId:identity.runId,close(){operator.dispose();}};
 const stageCalls={};
 await runCommandLoop({runtime:ROOT+'/runtime',session,now:clock,sleep:async()=>{await wait(1);if(index<commands.length)fs.writeFileSync(ROOT+'/runtime/command.json',JSON.stringify({runId:identity.runId,sequence:index+1,type:commands[index++]}));},execute:async type=>{
  phase=type;const before=calls.length,started=performance.now();let result;
  if(type==='arm')result=await operator.start({sha256:'d'.repeat(64),verifiedAt:clock()});
  if(type==='pause-preview')result=await operator.pausePreview();
  if(type==='resume-recovery'){offset+=10000;result=await operator.resumeRecovery(verifyControllerStopProof(proofFixture('preview',clock()).encode()));}
  if(type==='fixtures-ready'){
   ({db,client,auth}=src);
   if(nativeMode){
    result=await prepareNativeSyntheticStage(operator,c,identity,{recipe:{kind:'GATE1_NATIVE_SYNTHETIC_INPUT_V1',projectRef:identity.projectRef,legacyAnonKeyId:'anon',signingEvidence:'ADMIN_ROUTE_SIGNATURE_REJECTION_V1',signingLimits:SIGNING_LIMITS},apiInput:{projectRef:identity.projectRef,key:'sb_publishable_synthetic_only'},configurationToken:'ISOLATED_NOT_A_PAT',makeSource:bounds=>createWarmSyntheticSource(c,bounds),collectTarget:async bounds=>{
     ({db,client,auth}=dst);report.inventoryStorage='ISOLATED_ZERO_COUNT_FIXTURE_NOT_REAL_STORAGE';report.inventoryRelations=JSON.parse(sql("SELECT json_build_object('buckets',to_regclass('storage.buckets') IS NOT NULL,'objects',to_regclass('storage.objects') IS NOT NULL,'sso',to_regclass('auth.sso_providers') IS NOT NULL);"));let target;try{target=await collectSyntheticTarget(async q=>sql(q.replace('(SELECT count(*) FROM storage.buckets)','0').replace('(SELECT count(*) FROM storage.objects)','0')),bounds,{requiresTls:false});}catch(e){report.inventoryFailureSqlState=e.sqlState;report.inventoryFailureLocation=e.stack?.split('\n').filter(line=>line.includes('native-synthetic-inputs.mjs')).map(line=>line.slice(line.indexOf('native-synthetic-inputs.mjs')));throw e;}({db,client,auth}=src);return target;
    },request:async({hostname,route,headers})=>{
     if(hostname==='api.supabase.com'){calls.push({kind:'managementFixture',method:'GET',route});return {status:200,complete:true,value:{id:'anon',name:'anon',type:'legacy',api_key:normalToken}};}
     assert.equal(hostname,identity.projectRef+'.supabase.co');({db,client,auth}=dst);const r=api(route.replace('/auth/v1',''),null,headers.Authorization?.slice(7),'GET');({db,client,auth}=src);return {status:r.status,complete:true,value:r.data};
    }});report.signing=JSON.parse(fs.readFileSync(ROOT+'/runtime/signing-evidence.json'));report.nativeConnection=true;
   }else result=await prepareSyntheticStage(operator,c,identity,{source:{api,sql,docker,inspect,...src,oldKey,targetSigningSha256:hash(newKey),adminToken,foundationSql},collectTarget:async()=>{
    ({db,client,auth}=dst);const managedShapeSha256=sql('SELECT '+ATOMIC_MANAGED_SHAPE_SQL+';'),baselineSha256=hash(sql(REHEARSAL_READBACK_SQL));({db,client,auth}=src);return {managedShapeSha256,baselineSha256};
   },freezeSource:async()=>{docker(['stop','--time','1',src.auth]);assert.equal(inspect(src.auth).State.Running,false);}});
  }
  if(type==='synthetic-transfer'){
   ({db,client,auth}=dst);let attempts=0;const targetId=dst.db;
   const verify=()=>{const v=inspect(targetId);assert.equal(v.Config.Labels['com.comment_translator.atomic'],owner);assert.equal(v.HostConfig.NetworkMode,'none');assert.equal(v.State.Running,true);return true;};
   result=await transferSyntheticStage(operator,c,identity,stop=>createRehearsalExecutor({requiresTls:false,verify,claim:()=>{attempts++;return createRehearsalAttemptLedger(ROOT+'/local-transfer-ledger').claim(hash(targetId));},execute:async q=>{calls.push({kind:'targetDb',operation:q===REHEARSAL_READBACK_SQL?'readback':q.startsWith('BEGIN READ ONLY')?'identity':'transfer'});return sql(q);},stop}));report.transfer=result;assert.equal(attempts,1);
  }
  if(type==='finish'){report.closed=await operator.finish();result={formalRecoveryStopAccepted:report.closed};}
  stageCalls[type]={elapsedMs:Math.round(performance.now()-started),calls:calls.slice(before)};return result;
 }});
 assert.equal(fs.existsSync(ROOT+'/runtime/client-forward-unconfirmed.json'),false);
 assert.equal(report.closed,true);assert.ok(stageCalls['fixtures-ready'].elapsedMs<60000);assert.ok(stageCalls['synthetic-transfer'].elapsedMs<60000);
 report.stageCalls=stageCalls;report.sameRun=operator.state().runId===allocation.runId;assert.equal(operator.state().hardEndAt,allocation.hardEndAt);assert.equal(operator.state().phase,'RESTORED');assert.equal(operator.state().operations.previewResume.attempts,1);report.controllerTerminal=operator.state().phase;report.fixedHardEndAt=allocation.hardEndAt;report.controller=operator.budget();report.controllerProof='ISOLATED_FIXTURE_NOT_HOSTED';report.status='PASS';
}catch(e){report.phase=phase;report.failureClass=e.code??e.name;report.reason=e.reason??null;process.exitCode=1;}
finally{
 operator?.dispose();for(const item of [...owned].reverse()){try{const v=inspect(item.id);assert.equal(v.Config.Labels['com.comment_translator.atomic'],owner);assert.equal(v.Image,item.image);docker(['rm','-f','-v',item.id]);}catch{report.cleanupFailed=true;process.exitCode=1;}}
 report.ownedContainersRemaining=docker(['ps','-aq','--filter','label=com.comment_translator.atomic='+owner]).stdout.trim()?1:0;
 const remaining=new Set(docker(['volume','ls','--format','{{.Name}}']).stdout.trim().split(/\r?\n/));report.ownedVolumesRemaining=volumes.filter(v=>remaining.has(v)).length;
 if(report.cleanupFailed||report.ownedContainersRemaining||report.ownedVolumesRemaining)report.status='FAIL';
 report.calls=calls;report.gate='NO-GO';report.hostedEvidence=false;fs.writeFileSync(ROOT+'/local-synthetic-result.json',JSON.stringify(report,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({status:report.status,phase:report.phase,reason:report.reason,ownedContainersRemaining:report.ownedContainersRemaining,ownedVolumesRemaining:report.ownedVolumesRemaining}));
}
