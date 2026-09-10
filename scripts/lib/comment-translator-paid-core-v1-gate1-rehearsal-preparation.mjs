// Local synthetic preparation only. These summaries are not authenticated Hosted
// evidence and cannot authorize a pause, restore, configuration change or reopen.
const shape=(v,keys)=>v!==null&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).sort().join(',')===[...keys].sort().join(',');
const uuid=v=>typeof v==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(v);
const digest=v=>typeof v==='string'&&/^[a-f0-9]{64}$/.test(v);
const readyFail=()=>{throw Error('REHEARSAL_PREPARATION_REJECTED');};
export function validateRehearsalPreparation(f,now=Date.now()){
 // PKCE has a five-minute default in the pinned Auth version. Require a
 // minute for immediate local restore/probes, then recheck before each use.
 // The independent stop observer keeps its own unchanged twenty-minute bound.
 const remaining=t=>Number.isSafeInteger(t)&&t-now>=60000;
 if(!shape(f,['schemaVersion','scope','preparedAt','expiresAt','sourceSigningSha256','targetSigningSha256','users','pkce','links','business','delivery'])||
 f.schemaVersion!==1||f.scope!=='LOCAL_SYNTHETIC_ONLY'||!Number.isSafeInteger(now)||
 !Number.isSafeInteger(f.preparedAt)||now<f.preparedAt||now-f.preparedAt>300000||!remaining(f.expiresAt)||
 !digest(f.sourceSigningSha256)||!digest(f.targetSigningSha256)||f.sourceSigningSha256===f.targetSigningSha256)readyFail();
 if(!Array.isArray(f.users)||f.users.length!==3||new Set(f.users.map(u=>u?.id)).size!==3||
 f.users.some(u=>!shape(u,['id','passwordVerified','accessVerified','refreshVerified','accessExpiresAt'])||!uuid(u.id)||u.passwordVerified!==true||u.accessVerified!==true||u.refreshVerified!==true||!remaining(u.accessExpiresAt)||u.accessExpiresAt<f.expiresAt))readyFail();
 const types=['magiclink','recovery','email_change'];
 if(!Array.isArray(f.pkce)||f.pkce.length!==3||new Set(f.pkce.map(p=>p?.type)).size!==3||
 f.pkce.some(p=>!shape(p,['type','positiveControl','pendingUnconsumed','challengeMatched','expiresAt'])||!types.includes(p.type)||p.positiveControl!==true||p.pendingUnconsumed!==true||p.challengeMatched!==true||!remaining(p.expiresAt)||p.expiresAt<f.expiresAt))readyFail();
 if(!Array.isArray(f.links)||f.links.length!==2||new Set(f.links.map(l=>l?.type)).size!==2||
 f.links.some(l=>!shape(l,['type','getPositive','postPositive','pendingUnconsumed','expiresAt'])||!['magiclink','recovery'].includes(l.type)||l.getPositive!==true||l.postPositive!==true||l.pendingUnconsumed!==true||!remaining(l.expiresAt)||l.expiresAt<f.expiresAt))readyFail();
 if(!Array.isArray(f.business)||f.business.length!==3||new Set(f.business.map(b=>b?.userId)).size!==3||
 f.business.some(b=>!shape(b,['userId','planId','usedCount','limitCount'])||!f.users.some(u=>u.id===b.userId)||b.planId!=='free'||!Number.isSafeInteger(b.usedCount)||!Number.isSafeInteger(b.limitCount)||b.usedCount<0||b.usedCount>b.limitCount))readyFail();
 if(!shape(f.delivery,['network','hostPorts','externalRecipients','localSinkObserved'])||f.delivery.network!=='none'||f.delivery.hostPorts!==0||f.delivery.externalRecipients!==0||f.delivery.localSinkObserved!==true)readyFail();
 return Object.freeze({status:'LOCAL_FIXTURES_READY',scope:'LOCAL_SYNTHETIC_ONLY',userCount:3,pkceKinds:3,verifyKinds:2,hostedReady:false});
}
// Deliberately narrow request schema: never pass a whole Management API response.
// Other providers, SSO, passkeys, third-party trust, Data API and Realtime require
// their own complete capability inventory/readback; this patch does not cover them.
export const REHEARSAL_AUTH_FIELDS=Object.freeze(['disable_signup','external_email_enabled','external_phone_enabled','external_anonymous_users_enabled','security_manual_linking_enabled']);
export function buildRehearsalAuthChange(before,phase){
 const fail=()=>{throw Error('REHEARSAL_CONFIGURATION_REJECTED');};
 if(!shape(before,REHEARSAL_AUTH_FIELDS)||Object.values(before).some(v=>typeof v!=='boolean')||!['close','auth-reopen'].includes(phase))fail();
 const closed={disable_signup:true,external_email_enabled:false,external_phone_enabled:false,external_anonymous_users_enabled:false,security_manual_linking_enabled:false};
 if(phase==='auth-reopen'&&REHEARSAL_AUTH_FIELDS.some(k=>before[k]!==closed[k]))fail();
 const desired=phase==='close'?closed:{...closed,external_email_enabled:true},patch={},inverse={};
 for(const field of REHEARSAL_AUTH_FIELDS)if(before[field]!==desired[field]){patch[field]=desired[field];inverse[field]=before[field];}
 return {phase,patch,inverse,hostedReady:false};
}
