import fs from 'node:fs';
import assert from 'node:assert/strict';
import {parseStrictJson} from '../lib/comment-translator-paid-core-v1-gate1-evidence.mjs';
import {sha} from './execution-inputs.mjs';

// Shared real file-command loop. A queued command is not progress. An expired
// lease leaves forward execution and enters the existing single stop path.
export async function runCommandLoop({runtime,session,execute,now=Date.now,sleep=ms=>new Promise(r=>setTimeout(r,ms)),out=()=>{}}){
 const control=runtime+'/command.json';fs.writeFileSync(control,JSON.stringify({runId:session.runId,sequence:0,type:'wait'}),{flag:'wx'});
 let sequence=0,done=false;out({event:'CLIENT_READY',runId:session.runId});
 try{while(!done){
  await sleep(100);
  if(now()>=session.client.continuationDeadline()){
   const result=await session.client.stop();fs.writeFileSync(runtime+'/lease-ended.json',JSON.stringify({runId:session.runId,at:now(),state:session.client.state(),formalRecoveryStopAccepted:result,progressSent:false})+'\n',{flag:'wx'});done=true;continue;
  }
  const c=parseStrictJson(fs.readFileSync(control,'utf8'));assert.deepEqual(Object.keys(c).sort(),['runId','sequence','type']);assert.equal(c.runId,session.runId);if(c.sequence===sequence)continue;assert.equal(c.sequence,sequence+1);assert.equal(c.type==='wait',false);sequence=c.sequence;
  fs.writeFileSync(runtime+'/command-'+sequence+'.claim.json',JSON.stringify({sequence,type:c.type,at:now(),runId:session.runId})+'\n',{flag:'wx'});
  const result=await execute(c.type);fs.writeFileSync(runtime+'/command-'+sequence+'.receipt.json',JSON.stringify({sequence,type:c.type,resultSha256:sha(JSON.stringify(result)),state:session.client.state(),formalRecoveryStopAccepted:result?.formalRecoveryStopAccepted??null,at:now()})+'\n',{flag:'wx'});
  out({event:'COMMAND_COMPLETED',sequence,type:c.type,phase:session.client.state()?.phase});done=['finish','abort'].includes(c.type);
 }}catch{
  await session.client.stop();fs.writeFileSync(runtime+'/client-forward-unconfirmed.json',JSON.stringify({runId:session.runId,sequence,at:now(),automaticRetry:false,gate:'NO-GO'})+'\n',{flag:'wx'});out({event:'LIVE_CLIENT_FAILED',sequence,gate:'NO-GO'});process.exitCode=1;
 }finally{session.close();}
}
