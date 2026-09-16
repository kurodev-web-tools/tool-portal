import fs from 'node:fs';
import path from 'node:path';
import { randomBytes } from 'node:crypto';
const exact=(v,k)=>v!==null&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).sort().join(',')===[...k].sort().join(',');
export function createManagementBridge({directory,runId,sourceBindingSha256}){
 if(!/^[a-f0-9]{64}$/.test(runId)||!/^[a-f0-9]{64}$/.test(sourceBindingSha256))throw Error('BRIDGE_CONTEXT');
 const requestFile=path.join(directory,'request.json'),replyFile=path.join(directory,'reply.json');
 if(fs.existsSync(requestFile)||fs.existsSync(replyFile))throw Error('BRIDGE_EXISTS');
 let sequence=0,busy=false;
 return async function readProject(signal){
  if(busy||!(signal instanceof AbortSignal)||signal.aborted)throw Error('BRIDGE_CANCELLED');
  busy=true;const requestId=randomBytes(32).toString('hex');sequence++;
  const request={schemaVersion:1,type:'SUPABASE_GET_PROJECT',runId,sourceBindingSha256,sequence,requestId};
  try{
   const temporary=path.join(directory,'request-next.json');
   fs.writeFileSync(temporary,JSON.stringify(request),{flag:'wx'});fs.renameSync(temporary,requestFile);
   while(!signal.aborted){
    if(fs.existsSync(replyFile)){
     const bytes=fs.readFileSync(replyFile);if(bytes.length>4096)throw Error('BRIDGE_LIMIT');
     const row=JSON.parse(bytes);
     if(row?.sequence===sequence){
      if(!exact(row,['schemaVersion','type','runId','sourceBindingSha256','sequence','requestId','networkElapsedMs','project'])||
       row.schemaVersion!==1||row.type!=='SUPABASE_GET_PROJECT_RESULT'||row.runId!==runId||
       row.sourceBindingSha256!==sourceBindingSha256||row.requestId!==requestId||!Number.isFinite(row.networkElapsedMs)||row.networkElapsedMs<0||row.networkElapsedMs>3000||signal.aborted)throw Error('BRIDGE_IDENTITY');
      return row.project;
     }
     if(!Number.isSafeInteger(row?.sequence)||row.sequence>sequence)throw Error('BRIDGE_SEQUENCE');
    }
    await new Promise(resolve=>setTimeout(resolve,10));
   }
   throw Error('BRIDGE_CANCELLED');
  }finally{busy=false;}
 };
}
