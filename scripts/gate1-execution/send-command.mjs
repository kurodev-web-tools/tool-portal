import fs from 'node:fs';
import assert from 'node:assert/strict';
import {ROOT,json,authorizePacket} from './execution-inputs.mjs';
try{
 assert.equal(process.argv.length,3);const type=process.argv[2];authorizePacket(ROOT,{closure:['abort','finish'].includes(type)});
 assert.ok(['arm','pause-preview','resume-recovery','recovery-baseline','fixtures-ready','synthetic-transfer','finish','abort','setup-auth','setup-postgrest','setup-realtime','close-auth','close-postgrest','close-realtime','reopen-auth','reopen-postgrest','reopen-realtime'].includes(type));
 const root=ROOT+'/runtime',identity=json(root+'/identity.json'),current=json(root+'/command.json');assert.equal(current.runId,identity.runId);
 if(current.sequence!==0)assert.equal(fs.existsSync(root+'/command-'+current.sequence+'.receipt.json'),true);
 const sequence=current.sequence+1,command={runId:identity.runId,sequence,type};
 fs.writeFileSync(root+'/send-'+sequence+'.claim.json',JSON.stringify(command)+'\n',{flag:'wx'});
 const next=root+'/command-next.json';fs.writeFileSync(next,JSON.stringify(command),{flag:'wx'});fs.renameSync(next,root+'/command.json');
 console.log(JSON.stringify({status:'COMMAND_SUBMITTED_NOT_YET_ACCEPTED',sequence,type}));
}catch{console.log(JSON.stringify({status:'COMMAND_SUBMISSION_REJECTED',remoteCalls:0}));process.exitCode=1;}
