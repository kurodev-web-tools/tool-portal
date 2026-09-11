import https from 'node:https';
import {createHash} from 'node:crypto';
import {isDeepStrictEqual} from 'node:util';
import {compareConfigurationReadback,validateConfigurationRequest} from './comment-translator-paid-core-v1-gate1-rehearsal-configuration.mjs';
import {nativeRehearsalAttemptLedger} from './comment-translator-paid-core-v1-gate1-rehearsal-executor.mjs';
import {parseStrictJson} from './comment-translator-paid-core-v1-gate1-evidence.mjs';
import {REHEARSAL_AUTH_FIELDS} from './comment-translator-paid-core-v1-gate1-rehearsal-preparation.mjs';
const hash=v=>createHash('sha256').update(v).digest('hex');
const fields={auth:REHEARSAL_AUTH_FIELDS,postgrest:['db_schema','max_rows','db_extra_search_path','db_pool','db_pool_acquisition_timeout'],realtime:['suspend']};
const controllerStages=new Set(['setup-auth','setup-postgrest','setup-realtime','close-auth','close-postgrest','close-realtime','reopen-auth','reopen-postgrest','reopen-realtime']);
const reject=()=>{throw Error('REHEARSAL_CONFIGURATION_EXECUTION_REJECTED');};
const urlFor=(service,target)=>target.origin+(target.style==='management'?'/v1/projects/':'/platform/projects/')+target.projectRef+'/'+(service==='postgrest'&&target.style==='management'?'postgrest':'config/'+service);
export const rehearsalConfigurationClaimSha256=(projectRef,change)=>hash(JSON.stringify(['supabase-configuration',projectRef,change.service,fields[change.service].map(k=>[k,change.before[k]]),Object.keys(change.patch).sort().map(k=>[k,change.patch[k]])]));
export function controllerConfigurationClaimSha256(projectRef,attempt,service){
 if(!/^[a-z]{20}$/.test(projectRef)||!attempt||Object.keys(attempt).sort().join(',')!=='runId,stage'||!/^[a-f0-9]{64}$/.test(attempt.runId)||!controllerStages.has(attempt.stage)||!Object.hasOwn(fields,service)||!attempt.stage.endsWith('-'+service))reject();
 // One service write per named stage, even if the caller changes its payload.
 // A new run is authorized by the separately frozen controller execution plan.
 return hash(JSON.stringify(['supabase-controller-configuration-v1',projectRef,attempt.runId,attempt.stage]));
}
export function compareFullConfigurationReadback(before,after,patch){
 if(!before||!after||Array.isArray(before)||Array.isArray(after)||Object.keys(before).sort().join(',')!==Object.keys(after).sort().join(','))reject();
 for(const k of Object.keys(before))if(!isDeepStrictEqual(after[k],Object.hasOwn(patch,k)?patch[k]:before[k]))reject();
 if(Object.keys(patch).some(k=>!Object.hasOwn(before,k)))reject();return true;
}
export function createRehearsalConfigurationController(transport,target){
 target=Object.freeze({...target});
 return {async apply(change){
  let attemptOwned=false,phase='input';
  try{
   const request={method:'PATCH',url:urlFor(change.service,target),postData:JSON.stringify(change.patch)};
   validateConfigurationRequest(change,request,target);
   phase='before';const before=await transport.read(change.service);if(!isDeepStrictEqual(before,change.before))reject();
   phase='claim';if(transport.claim(change)!==true)reject();attemptOwned=true;
   phase='patch';const response=await transport.patch(request);
   const expectedStatus=target.style==='management'&&change.service==='realtime'?204:200;
   if(response?.status!==expectedStatus)reject();
   phase='readback';compareConfigurationReadback(change,await transport.read(change.service));
   return Object.freeze({status:'CONFIGURATION_READBACK_MATCHED',service:change.service,changedFields:Object.keys(change.patch),stageAuthority:false,hostedReady:false});
  }catch{
   let stopConfirmed=false;if(attemptOwned)try{stopConfirmed=await transport.stop()===true;}catch{}
   throw Object.assign(Error('REHEARSAL_CONFIGURATION_EXECUTION_REJECTED'),{phase,attemptOwned,stopConfirmed});
  }
 }};
}
// This native Management API path is inert until apply(). Credentials stay in
// process memory. The separately approved pause hook must contain any uncertain
// write; response loss never causes a second PATCH or an automatic inverse.
export function createManagedRehearsalConfiguration({approvedRecoveryRef,protectedProjectRefs,managementToken,stop,signal,configurationAttempt}){
 if(!/^[a-z]{20}$/.test(approvedRecoveryRef)||!Array.isArray(protectedProjectRefs)||protectedProjectRefs.length!==2||new Set(protectedProjectRefs).size!==2||protectedProjectRefs.some(ref=>!/^[a-z]{20}$/.test(ref)||ref===approvedRecoveryRef)||typeof managementToken!=='string'||!/^[A-Za-z0-9._-]{20,512}$/.test(managementToken)||typeof stop!=='function')reject();
 const target={projectRef:approvedRecoveryRef,origin:'https://api.supabase.com',style:'management'};
 if(signal!==undefined&&!(signal instanceof AbortSignal))reject();
 const attempt=configurationAttempt===undefined?null:structuredClone(configurationAttempt);
 if(attempt)controllerConfigurationClaimSha256(approvedRecoveryRef,attempt,attempt.stage?.split('-').at(-1));
 const fullBefore=new Map(),pendingPatches=new Map();
 const send=(method,url,postData,expectedStatus=200)=>new Promise((resolve,rejectPromise)=>{
  let done=false,request,timer,size=0;const chunks=[];
  const finish=(ok,value)=>{if(done)return;done=true;clearTimeout(timer);signal?.removeEventListener('abort',abort);if(!ok){chunks.length=0;request?.destroy();rejectPromise(Error('REHEARSAL_CONFIGURATION_HTTP_REJECTED'));}else resolve(value);};
  const abort=()=>finish(false);if(signal?.aborted){abort();return;}
  try{request=https.request(url,{method,headers:{Authorization:'Bearer '+managementToken,'Content-Type':'application/json',...(postData?{'Content-Length':Buffer.byteLength(postData)}:{})}},response=>{
   if(response.statusCode!==expectedStatus){response.destroy();finish(false);return;}
   response.on('data',b=>{if(done)return;size+=b.length;if(size>131072){response.destroy();finish(false);}else chunks.push(b);});response.on('error',()=>finish(false));
   response.on('end',()=>{try{
    if(!response.complete)throw Error();
    if(expectedStatus===204){if(size!==0)throw Error();finish(true,{status:204,body:null});}
    else{const body=parseStrictJson(Buffer.concat(chunks).toString('utf8'));finish(true,{status:200,body});}
   }catch{finish(false);}});
  });request.on('error',()=>finish(false));timer=setTimeout(()=>finish(false),10000);signal?.addEventListener('abort',abort,{once:true});if(signal?.aborted){abort();return;}request.end(postData);}catch{finish(false);}
 });
 return createRehearsalConfigurationController({
  read:async service=>{if(!Object.hasOwn(fields,service))reject();const r=await send('GET',urlFor(service,target));
   if(pendingPatches.has(service)){compareFullConfigurationReadback(fullBefore.get(service),r.body,pendingPatches.get(service));pendingPatches.delete(service);fullBefore.delete(service);}else fullBefore.set(service,r.body);
   return Object.fromEntries(fields[service].map(k=>{if(!Object.hasOwn(r.body,k))reject();return [k,r.body[k]];}));},
  claim:change=>nativeRehearsalAttemptLedger().claim(attempt?controllerConfigurationClaimSha256(approvedRecoveryRef,attempt,change.service):rehearsalConfigurationClaimSha256(approvedRecoveryRef,change)),
  patch:request=>{const service=Object.keys(fields).find(service=>urlFor(service,target)===request.url);if(!service||!fullBefore.has(service)||pendingPatches.has(service))reject();pendingPatches.set(service,parseStrictJson(request.postData));return send(request.method,request.url,request.postData,service==='realtime'?204:200);},stop,
 },target);
}
