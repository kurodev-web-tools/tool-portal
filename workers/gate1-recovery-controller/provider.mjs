import { exact, requireThat, validatePolicy } from './core.mjs';

export function parseBoundedJson(source){
  requireThat(typeof source==='string'&&source.length<=65536);
  const value=JSON.parse(source),stack=[];
  // JSON.parse validates syntax; this scan additionally rejects duplicate keys,
  // including escaped equivalents, before reading any security-critical field.
  for(let i=0;i<source.length;i++){
    const c=source[i];
    if(c==='{'||c==='['){stack.push(c==='{'?new Set():null);requireThat(stack.length<=32);}
    else if(c==='}'||c===']')stack.pop();
    else if(c==='"'){
      const start=i++;
      for(;i<source.length;i++){if(source[i]==='\\'){i++;continue;}if(source[i]==='"')break;}
      let after=i+1;while(/\s/.test(source[after]??'!'))after++;
      if(source[after]===':'){
        const key=JSON.parse(source.slice(start,i+1)),keys=stack.at(-1);
        requireThat(keys&&!keys.has(key)&&keys.size<2048);keys.add(key);
      }
    }
  }
  return value;
}
export function parseCanonicalJson(source){
  requireThat(typeof source==='string'&&source.length<=8192);
  const value=parseBoundedJson(source);
  requireThat(value!==null&&typeof value==='object'&&!Array.isArray(value)&&JSON.stringify(value)===source);return value;
}
async function readBodyResult(response,limit,signal,observation){
  const reader=response.body?.getReader();requireThat(reader);
  const parts=[];let bytes=0;
  const abort=()=>{void reader.cancel().catch(()=>{});};signal?.addEventListener('abort',abort,{once:true});
  try{
    while(true){requireThat(!signal?.aborted);const next=await reader.read();if(next.done)break;bytes+=next.value.byteLength;if(observation)observation.bodyBytes=Math.min(bytes,limit+1);if(bytes>limit&&observation)observation.code='BODY_LIMIT';requireThat(bytes<=limit);parts.push(next.value);}
    requireThat(!signal?.aborted);
    const combined=new Uint8Array(bytes);let offset=0;for(const part of parts){combined.set(part,offset);offset+=part.byteLength;}
    if(observation){observation.bodyComplete=true;observation.stage='DECODE';observation.code='UTF8_INVALID';}
    return {source:new TextDecoder('utf-8',{fatal:true}).decode(combined),byteLength:bytes};
  }finally{signal?.removeEventListener('abort',abort);void reader.cancel().catch(()=>{});}
}
export async function readBody(response,limit,signal){
  return (await readBodyResult(response,limit,signal)).source;
}
export function createProvider(policy,token,{fetchImpl=fetch,now=Date.now}={}){
  const p=validatePolicy(policy);requireThat(p.mode==='live'&&/^sbp_fc[A-Za-z0-9_-]{20,512}$/.test(token??''));
  async function request(role,suffix,observation){
    requireThat(['preview','recovery'].includes(role)&&['','/pause','/restore'].includes(suffix));
    const ctrl=new AbortController(),startedAt=now();let timer;
    try{
      return await Promise.race([(async()=>{
        const response=await fetchImpl('https://api.supabase.com/v1/projects/'+p[role+'Ref']+suffix,{method:suffix?'POST':'GET',redirect:'manual',headers:{Authorization:'Bearer '+token,Accept:'application/json'},signal:ctrl.signal});
        if(observation){observation.stage='HEADERS';observation.httpStatus=Number.isInteger(response.status)&&response.status>=100&&response.status<=599?response.status:null;observation.code=response.redirected?'REDIRECT':'HTTP_STATUS';}
        requireThat(!response.redirected&&response.status===200);
        // Pause/restore declare HTTP 200 without a response body in the OpenAPI.
        // A present stream must still finish within the unchanged size/time bounds.
        if(observation){observation.stage='BODY';observation.code='BODY_FAILED';}
        const {source,byteLength}=suffix!==''&&response.body===null?{source:'',byteLength:0}:await readBodyResult(response,65536,ctrl.signal,observation);
        if(observation){observation.bodyComplete=true;observation.stage='JSON';observation.code='JSON_INVALID';}
        const emptyBody=suffix!==''&&byteLength===0;
        const body=emptyBody?null:parseBoundedJson(source),completedAt=now();
        if(observation){observation.stage='COMPLETE';observation.code='CLOCK_WINDOW';}
        requireThat(completedAt>=startedAt&&completedAt-startedAt<=3000&&!ctrl.signal.aborted);
        return {body,emptyBody,startedAt,completedAt};
      })(),new Promise((_,reject)=>{timer=setTimeout(()=>{if(observation)observation.code='DEADLINE';ctrl.abort();reject(Error('PROVIDER_UNKNOWN'));},3000);})]);
    }finally{clearTimeout(timer);ctrl.abort();if(observation){const elapsed=now()-startedAt;observation.elapsedMs=Number.isFinite(elapsed)?Math.max(0,Math.min(3600000,Math.trunc(elapsed))):null;}}
  }
  async function mutateObserved(operation){
    const mapping={previewPause:['preview','/pause'],recoveryResume:['recovery','/restore'],recoveryPause:['recovery','/pause'],previewResume:['preview','/restore']};
    requireThat(Object.hasOwn(mapping,operation));
    const observation={stage:'FETCH',code:'FETCH_FAILED',httpStatus:null,bodyBytes:0,bodyComplete:false,elapsedMs:null};let outcome='UNKNOWN';
    try{const {body,emptyBody}=await request(...mapping[operation],observation);outcome=emptyBody||exact(body,[])?'ACCEPTED':'UNKNOWN';observation.code=outcome==='ACCEPTED'?(emptyBody?'ACCEPTED_EMPTY':'ACCEPTED_OBJECT'):'BODY_SHAPE';}catch{/* Keep only the bounded fields above, never exception properties or response data. */}
    return {outcome,observation:Object.freeze({...observation})};
  }
  return {
    async read(role){
      const {body:b,startedAt,completedAt}=await request(role,'');
      requireThat(b?.id===p[role+'Ref']&&b.organization_id===p.organizationId&&b.region==='ap-northeast-1'&&b.database?.host==='db.'+p[role+'Ref']+'.supabase.co'&&b.database.postgres_engine==='17'&&typeof b.status==='string'&&/^[A-Z_]{3,64}$/.test(b.status));
      return {status:b.status,startedAt,completedAt};
    },
    mutateObserved,
    async mutate(operation){return (await mutateObserved(operation)).outcome;},
  };
}
