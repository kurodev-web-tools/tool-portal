import path from 'node:path';
const out=value=>process.stdout.write(JSON.stringify(value)+'\n');
try{
 const [mode,flag,packet]=process.argv.slice(2);
 if(process.argv.length!==5||!['--check-only','--prepare','--prepare-services','--execute','--close'].includes(mode)||flag!=='--packet')throw Error('ARGUMENTS');
 process.env.GATE1_PACKET_ROOT=path.resolve(packet);
 const {authorizePacket}=await import('./execution-inputs.mjs');
 const context=authorizePacket(process.env.GATE1_PACKET_ROOT,{closure:mode==='--close'});
 const {createPacketHooks}=await import('./packet-adapter.mjs');const hooks=await createPacketHooks(context,{out});
 if(mode==='--check-only'){await hooks.preflight();out({status:'LOCAL_PREFLIGHT_READY',remoteCalls:0,claimsWritten:0,hostedEvidence:false});}
 else {const {runPrearm}=await import('./prearm-sequence.mjs');const result=await runPrearm({context,hooks,mode,now:hooks.now});out(result);if(!['ARM_RECEIPT_VERIFIED','CREDENTIALS_SEALED_PREPARATION_PENDING','PREPARATION_SERVICES_READY','RUN_SAFE_CLOSED'].includes(result.status))process.exitCode=1;}
}catch{out({status:'PACKET_REJECTED_NO_START',hostedEvidence:false,automaticRetry:false});process.exitCode=1;}
