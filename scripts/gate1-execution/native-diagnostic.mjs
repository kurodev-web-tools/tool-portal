// This is an allowlisted diagnostic channel, never a success/admission receipt.
const errors=['UNKNOWN','ASSERTION','INVALID_JSON','DNS_DEADLINE','ENOENT','EEXIST','EACCES','EPERM','EIO','ENOTFOUND','EAI_AGAIN','ETIMEDOUT','ECONNRESET','ECONNREFUSED','EPIPE'];
const transports=['UNKNOWN','NONE','INVALID_JSON','BODY_LIMIT','ABORTED','STREAM_ERROR','INCOMPLETE','EARLY_CLOSE','DEADLINE','NETWORK_OR_TLS','REQUEST'];
const signals=['SIGTERM','SIGKILL','SIGINT','SIGABRT','SIGSEGV','SIGBREAK','UNKNOWN'];
const checks={entry:['authorization','arguments','input'],producer:['begin','prepare','binding','sql','finish'],api:['auth','table','invalidKey'],dns:['first','stable'],native:['positive','positive-exit','positive-stderr','positive-spawn','positive-signal','positive-json','positive-contract','negative','negative-exit','negative-stdout','hostname-mismatch']};
const count=n=>Number.isSafeInteger(n)&&n>=0?n:null;
export const exitCode=n=>Number.isSafeInteger(n)?n:null;
export const signalClass=s=>s==null?null:signals.includes(s)?s:'UNKNOWN';
export function errorClass(e){
 if(e?.code==='ERR_ASSERTION')return 'ASSERTION';
 if(e instanceof SyntaxError)return 'INVALID_JSON';
 if(e?.message==='DNS_DEADLINE')return 'DNS_DEADLINE';
 return errors.includes(e?.code)?e.code:'UNKNOWN';
}
export const httpSummary=r=>({status:Number.isInteger(r?.status)&&r.status>=100&&r.status<=599?r.status:null,complete:typeof r?.complete==='boolean'?r.complete:null,bodyBytes:count(r?.bodyBytes),elapsedMs:count(r?.elapsedMs),transportClass:!r?.error?'NONE':transports.includes(r.error)?r.error:'UNKNOWN'});
export const nativeSummary=r=>({exitCode:exitCode(r?.status),signal:signalClass(r?.signal),errorClass:r?.error?errorClass(r.error):null,stdoutBytes:typeof r?.stdout==='string'?Buffer.byteLength(r.stdout):null,stderrBytes:typeof r?.stderr==='string'?Buffer.byteLength(r.stderr):null});
export const failureDetail=(phase,check,error,startedAt,detail={})=>({phase,check,errorClass:errorClass(error),elapsedMs:count(Date.now()-startedAt),addressIndex:count(detail.addressIndex),http:detail.http??null,native:detail.native??null});

// Reject the entire child envelope on unknown fields, strings or excessive size.
// Do not trust a child's arbitrary message, stack, URLs or provider JSON.
export function readNativeDiagnostic(stdout){
 try{
  if(Buffer.byteLength(stdout)>16384)return null;
  const v=JSON.parse(stdout),keys=(o,names)=>o&&Object.keys(o).sort().join(',')===[...names].sort().join(',');
  const nullable=(v,p)=>v===null||p(v),nonnegative=v=>Number.isSafeInteger(v)&&v>=0;
  if(!keys(v,['status','schemaVersion','failures'])||v.status!=='FRESH_NATIVE_REJECTED'||v.schemaVersion!==1||!Array.isArray(v.failures)||v.failures.length<1||v.failures.length>3)return null;
  for(const r of v.failures){
   if(!keys(r,['phase','check','errorClass','elapsedMs','addressIndex','http','native'])||!Object.hasOwn(checks,r.phase)||!checks[r.phase].includes(r.check)||!errors.includes(r.errorClass)||!nullable(r.elapsedMs,nonnegative)||!nullable(r.addressIndex,x=>Number.isInteger(x)&&x>=0&&x<8))return null;
   if(r.http!==null){const h=r.http;if(r.phase!=='api'||!keys(h,['status','complete','bodyBytes','elapsedMs','transportClass'])||!nullable(h.status,x=>Number.isInteger(x)&&x>=100&&x<=599)||!nullable(h.complete,x=>typeof x==='boolean')||!nullable(h.bodyBytes,nonnegative)||!nullable(h.elapsedMs,nonnegative)||!transports.includes(h.transportClass))return null;}
   if(r.native!==null){const n=r.native;if(r.phase!=='native'||!keys(n,['exitCode','signal','errorClass','stdoutBytes','stderrBytes'])||!nullable(n.exitCode,Number.isSafeInteger)||!nullable(n.signal,x=>signals.includes(x))||!nullable(n.errorClass,x=>errors.includes(x))||!nullable(n.stdoutBytes,nonnegative)||!nullable(n.stderrBytes,nonnegative))return null;}
  }
  return v;
 }catch{return null;}
}
