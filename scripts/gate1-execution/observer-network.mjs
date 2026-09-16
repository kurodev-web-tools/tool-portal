// Existing observer network functions; no operational entry or old packet data.
import https from 'node:https';
import net from 'node:net';
import dns from 'node:dns';
const exact=(v,k)=>v!==null&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).sort().join(',')===[...k].sort().join(',');
export const baselineAccepted=(rest,auth)=>rest.complete===true&&auth.complete===true&&rest.status===401&&exact(rest.body,['code','message','details','hint'])&&rest.body.code==='42501'&&rest.body.message==='permission denied for table comment_translator_paid_entitlements'&&rest.body.details===null&&(rest.body.hint===null||typeof rest.body.hint==='string')&&auth.status===200&&exact(auth.body,['name','version','description'])&&auth.body.name==='GoTrue'&&typeof auth.body.version==='string'&&auth.body.version.length>0&&typeof auth.body.description==='string';
const knownCode=code=>['ENOTFOUND','EAI_AGAIN','ETIMEDOUT','ECONNRESET','ECONNREFUSED','ENETUNREACH','EHOSTUNREACH'].includes(code)?code:'OTHER';
export const publicHttp=v=>({status:v.status,complete:v.complete,classification:v.classification,bodyBytes:v.bodyBytes});
export function lookup(host,signal,allowAbsent=false,lookupImpl=dns.lookup){
 return new Promise((resolve,reject)=>{
  let done=false;const end=(code,value)=>{if(done)return;done=true;signal.removeEventListener('abort',abort);code?reject(Object.assign(Error('DNS_UNKNOWN'),{safeCode:code})):resolve(value);};
  const abort=()=>end('CANCELLED_OR_DEADLINE');if(signal.aborted){abort();return;}signal.addEventListener('abort',abort,{once:true});
  try{lookupImpl(host,{all:true},(error,rows)=>{
   if(error){end(allowAbsent&&error.code==='ENOTFOUND'?null:knownCode(error.code),null);return;}
   if(!Array.isArray(rows)||!rows.length||rows.length>8||rows.some(x=>!net.isIP(x.address))){end('INVALID_ADDRESS_SET');return;}
   end(null,[...new Set(rows.map(x=>x.address))].sort());
  });}catch{end('LOOKUP_FAILED');}
 });
}
export function http(host,route,key,signal,{readJson=true,requestImpl=https.request}={}){
 return new Promise(resolve=>{
  let req,res,done=false,size=0,status=null;const chunks=[];
  const end=(classification,complete=false,body)=>{if(done)return;done=true;signal.removeEventListener('abort',abort);res?.destroy();req?.destroy();resolve({status,complete,classification,bodyBytes:size,body});};
  const abort=()=>end('CANCELLED_OR_DEADLINE');if(signal.aborted){abort();return;}signal.addEventListener('abort',abort,{once:true});
  try{req=requestImpl({hostname:host,path:route,method:'GET',port:443,agent:false,rejectUnauthorized:true,headers:{apikey:key,Accept:'application/json'}},r=>{
   if(done){r.destroy();return;}
   res=r;status=Number.isInteger(r.statusCode)&&r.statusCode>=100&&r.statusCode<=599?r.statusCode:null;
   r.on('error',()=>end('RESPONSE_ERROR'));r.on('aborted',()=>end('RESPONSE_ABORTED'));
   r.on('data',c=>{size+=c.length;if(size>65536)end('BODY_LIMIT');else chunks.push(c);});
   r.on('end',()=>{
    if(status===null){end('INVALID_HTTP_STATUS');return;}
    if(!readJson){end('COMPLETE_HTTP_RESPONSE',true);return;}
    let body;try{body=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(Buffer.concat(chunks)));}
    catch{end('NON_JSON_BODY',true);return;}
    end('COMPLETE_JSON_RESPONSE',true,body);
   });
  });req.on('error',e=>end('NETWORK_'+knownCode(e?.code)));req.end();}catch{end('REQUEST_FAILED');}
 });
}
