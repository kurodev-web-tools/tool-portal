import {parseStrictJson} from './comment-translator-paid-core-v1-gate1-evidence.mjs';
import {REHEARSAL_AUTH_FIELDS} from './comment-translator-paid-core-v1-gate1-rehearsal-preparation.mjs';

const fields={auth:REHEARSAL_AUTH_FIELDS,postgrest:['db_schema','max_rows','db_extra_search_path','db_pool','db_pool_acquisition_timeout'],realtime:['suspend']};
const changes=new WeakSet();
const fail=()=>{throw Error('REHEARSAL_CONFIGURATION_REJECTED');};
const object=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const sameKeys=(v,keys)=>object(v)&&Object.keys(v).sort().join(',')===[...keys].sort().join(',');
const schemas=value=>typeof value==='string'&&(value===''||(/^public(?:,\s*graphql_public)?$/.test(value)));
function checkBefore(service,before){
 if(!Object.hasOwn(fields,service)||!sameKeys(before,fields[service]))fail();
 if(service!=='postgrest'){if(Object.values(before).some(v=>typeof v!=='boolean'))fail();return;}
 if(!schemas(before.db_schema)||!Number.isSafeInteger(before.max_rows)||before.max_rows<1||before.max_rows>100000||
 typeof before.db_extra_search_path!=='string'||before.db_extra_search_path.length>256||!/^[a-z_ ,]*$/.test(before.db_extra_search_path)||
 (before.db_pool!==null&&(!Number.isSafeInteger(before.db_pool)||before.db_pool<1||before.db_pool>1000))||
 !Number.isSafeInteger(before.db_pool_acquisition_timeout)||before.db_pool_acquisition_timeout<1||before.db_pool_acquisition_timeout>600)fail();
}
// A reviewable request plan; constructing it never authorizes or sends a write.
export function buildRehearsalServiceChange(service,before,patch){
 checkBefore(service,before);
 if(!object(patch)||Object.keys(patch).length===0||Object.keys(patch).some(k=>!fields[service].includes(k)||patch[k]===before[k]))fail();
 if(service==='postgrest'&&(!sameKeys(patch,['db_schema'])||!schemas(patch.db_schema)))fail();
 if(service==='realtime'&&(!sameKeys(patch,['suspend'])||typeof patch.suspend!=='boolean'))fail();
 if(service==='auth'&&Object.entries(patch).some(([k,v])=>typeof v!=='boolean'||(k==='disable_signup'?v!==true:k!=='external_email_enabled'&&v!==false)))fail();
 const after={...before,...patch};checkBefore(service,after);
 const change=Object.freeze({service,before:Object.freeze({...before}),patch:Object.freeze({...patch}),inverse:Object.freeze(Object.fromEntries(Object.keys(patch).map(k=>[k,before[k]]))),after:Object.freeze(after),hostedReady:false});
 changes.add(change);return change;
}
export function compareConfigurationReadback(change,after){
 if(!changes.has(change))fail();checkBefore(change.service,after);
 if(fields[change.service].some(k=>after[k]!==change.after[k]))fail();return true;
}
export function validateConfigurationRequest(change,request,target){
 try{
  if(!changes.has(change)||!sameKeys(request,['method','url','postData'])||!sameKeys(target,['projectRef','origin','style'])||
  !/^[a-z]{20}$/.test(target.projectRef)||target.origin!=='https://api.supabase.com'||!['dashboard','management'].includes(target.style)||request.method!=='PATCH')fail();
  const suffix=change.service==='postgrest'&&target.style==='management'?'postgrest':'config/'+change.service;
  const expected=target.origin+(target.style==='dashboard'?'/platform/projects/':'/v1/projects/')+target.projectRef+'/'+suffix;
  if(request.url!==expected||typeof request.postData!=='string'||Buffer.byteLength(request.postData)>4096)fail();
  const body=parseStrictJson(request.postData);
  if(!object(body)||Object.keys(body).length===0||Object.keys(body).some(k=>!fields[change.service].includes(k)||body[k]!==change.after[k])||Object.keys(change.patch).some(k=>!Object.hasOwn(body,k)))fail();
  if(target.style==='management'&&!sameKeys(body,Object.keys(change.patch)))fail();
  return true;
 }catch{fail();}
}
