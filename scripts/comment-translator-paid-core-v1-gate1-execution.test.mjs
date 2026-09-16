import {readObserverControl,observerFinished} from './gate1-execution/management-reader.mjs';
import {verifyClosingContent} from './gate1-execution/close-environment.mjs';
import {validateContent,validateNative,validateMetadata} from './gate1-execution/fresh-evidence.mjs';
import {classifyClosingState} from './gate1-execution/closing-contract.mjs';
import {PAT_PERMISSIONS,PAT_TARGETS} from './gate1-execution/fresh-evidence.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {spawn,spawnSync} from 'node:child_process';
import net from 'node:net';
import {fileURLToPath} from 'node:url';
import {executionFixture} from './fixtures/gate1-execution.mjs';
import {allocateClock,preparationClock,admissionTime,validateBilling} from './gate1-execution/prearm-sequence.mjs';
import {readInitialHistory,historyValue,ACCEPTED_HISTORY_ANCHOR} from './gate1-execution/accepted-history.mjs';
import {publicState} from '../workers/gate1-recovery-controller/core.mjs';
import {sha} from './gate1-execution/execution-inputs.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const entry=path.join(root,'scripts/gate1-execution/prearm-runner.mjs');

function startEntry(t,f,mode){
 const child=spawn(process.execPath,[entry,mode,'--packet',f.root],{cwd:f.root,env:f.env,windowsHide:true,shell:false,stdio:['ignore','pipe','pipe']});let stdout='',stderr='';
 child.stdout.on('data',b=>stdout+=b);child.stderr.on('data',b=>stderr+=b);const done=new Promise((resolve,reject)=>{child.once('error',reject);child.once('close',code=>resolve({code,stdout,stderr,rows:stdout.trim().split('\n').filter(Boolean).map(x=>JSON.parse(x))}));});
 t.after(async()=>{if(child.exitCode===null)child.kill();await done;});
 return {child,done,async waitRow(predicate){const end=Date.now()+10000;while(Date.now()<end){for(const line of stdout.split('\n')){let r;try{r=JSON.parse(line);}catch{}if(r&&predicate(r))return r;}if(child.exitCode!==null)break;await new Promise(r=>setTimeout(r,20));}assert.fail('EXPECTED_ENTRY_OUTPUT_MISSING '+stdout+stderr);}};
}
async function preparedEntry(t,f,{waitForOAuth=true}={}){
 const p=startEntry(t,f,'--prepare'),ready=await p.waitRow(r=>r.status==='LOCAL_PROTECTED_INTAKE_READY');const info=f.read('control/intake-0-ready.json');
 const post=(role,token)=>fetch(ready.origin+'/'+role,{method:'POST',headers:{origin:ready.origin,'content-type':'application/x-www-form-urlencoded'},body:new URLSearchParams({csrf:info.csrf,...(token?{token}:{})})});
 for(const [i,role] of ['controllerPat','configurationToken','metadataReadPat'].entries())assert.equal((await post(role,'sbp_fcLOCAL_ONLY_'+f.approval.approvalId+'_'+i)).status,200);
 assert.equal((await post('seal')).status,200);const input=await p.done;assert.equal(input.code,0,input.stdout+input.stderr);
 const sealed=f.read('control/credentials-sealed.json');f.write('control/pat-scopes-reviewed.json',{manifestSha256:f.approval.manifestSha256,entries:sealed.inputs.map(r=>({role:r.role,inputSha256:r.inputSha256,permissions:PAT_PERMISSIONS[r.role],projectRefs:PAT_TARGETS[r.role].map(p=>f.policy[p+'Ref']),createdAt:f.at,reviewedAt:f.at,expiresAt:f.at+86400000,imageSha256:sha('fixture-scope-'+r.role)}))});
 const s=startEntry(t,f,'--prepare-services'),oauth=await s.waitRow(r=>r.status==='OAUTH_UI_READY');
 if(!waitForOAuth)return {pendingService:s,oauth};
 const idle=net.connect(new URL(oauth.launcher).port,'127.0.0.1');await new Promise(r=>idle.once('connect',r));t.after(()=>idle.destroy());
 const response=await fetch(oauth.launcher,{redirect:'manual'});assert.equal(response.status,302);assert.ok(response.headers.get('location').startsWith('https://oauth.invalid/'));
 const result=await s.done;assert.equal(result.code,0,result.stdout+result.stderr);assert.equal(f.read('control/oauth-login-result.json').listeners,0);
 const at=f.read('control/fixture-clock.json').now;
 f.write('control/billing-reviewed.json',[['supabase',f.manifest.organizationSha256],['cloudflare',f.manifest.accountSha256]].map(([service,targetSha256])=>({service,targetSha256,method:'OPERATOR_IMAGE_REVIEWED_BY_PRIMARY',capturedAt:at,reviewedAt:at,contradiction:false,settingsChanged:false,imageSha256:'b'.repeat(64),free:true,spendCapEnabled:true,priceUSD:0,dailyRequests:100000})));
 return result;
}
async function stopFixtureChildren(f){
 if(!fs.existsSync(f.root))return [];
 if(fs.existsSync(path.join(f.root,'runtime/command.json'))){const c=f.read('runtime/command.json');if(!['abort','finish'].includes(c.type)){const next={runId:c.runId,sequence:c.sequence+1,type:'abort'};f.write('runtime/command-next.json',next);fs.renameSync(path.join(f.root,'runtime/command-next.json'),path.join(f.root,'runtime/command.json'));}}
 if(fs.existsSync(path.join(f.root,'runtime/preview-control.json'))){const c=f.read('runtime/preview-control.json');if(!fs.existsSync(path.join(f.root,'runtime/preview-finish.json')))fs.writeFileSync(path.join(f.root,'runtime/preview-finish.json'),JSON.stringify({runId:c.runId,sequence:c.sequence+1,command:'finish'}),{flag:'wx'});}
 const pids=['control/client-process.json','control/observer-process.json'].filter(p=>fs.existsSync(path.join(f.root,p))).map(p=>f.read(p).processId),end=Date.now()+7000;
 while(Date.now()<end){if(pids.every(p=>{try{process.kill(p,0);return false;}catch{return true;}}))return pids;await new Promise(r=>setTimeout(r,30));}
 assert.fail('FIXTURE_CHILD_EXIT_UNCONFIRMED');
}

function closingFixtureEvidence(f,pids=[]){
 const at=f.read('control/fixture-clock.json').now,allocated=fs.existsSync(path.join(f.root,'control/allocation-claimed.json'))?f.read('control/allocation-claimed.json'):null;
 const state=fs.existsSync(path.join(f.root,'runtime/fixture-controller-state.json'))?publicState(f.read('runtime/fixture-controller-state.json')):f.baseline.controllerState;
 const has=leaf=>fs.existsSync(path.join(f.root,leaf));
 const fallbackNative={target:'preview',dbWrites:0,addressSetStable:true,addresses:[{addressSha256:sha('local-independent-address'),nativeExit:0,stderrBytes:0,serverMajor:17,readOnly:'on',tls:true,anonSelect:false}],hostnameMismatch:{exitCode:1,stdoutBytes:0,errorClass:'CERTIFICATE_HOST_MISMATCH'},http:Object.fromEntries([['auth',200,'AUTH_HEALTH'],['table',401,'EXPECTED_TABLE_PERMISSION_DENIED'],['invalidKey',401,'GATEWAY_KEY_REJECTED']].map(([k,status,classification])=>[k,{status,classification,complete:true,bodyBytes:100,elapsedMs:100}]))};
 const output=has('fresh/native.json')?f.read('fresh/native.json'):fallbackNative,content={...(has('fresh/preview.json')?f.read('fresh/preview.json'):{target:'preview',dbWrites:0,nativeExit:0,nativeErrorClass:null,state:f.baseline.state}),startedAt:at,completedAt:at},native={...output,startedAt:at,completedAt:at};
 const fallbackMetadata={projectOperations:0,productionSqlOrConfig:0,projects:['preview','recovery','production'].map(role=>({role,httpStatus:200,complete:true,id:f.policy[role+'Ref'],organization_id:f.policy.organizationId,region:'ap-northeast-1',status:role==='recovery'?'INACTIVE':'ACTIVE_HEALTHY',database:{host:'db.'+f.policy[role+'Ref']+'.supabase.co',postgres_engine:'17.6'}}))};
 const metadata={...(has('fresh/metadata-second.json')?f.read('fresh/metadata-second.json'):fallbackMetadata),startedAt:at,completedAt:at};metadata.projects=metadata.projects.map(r=>({...r,startedAt:at,completedAt:at}));
 const input={manifestSha256:f.approval.manifestSha256,approvalId:f.approval.approvalId,runId:allocated?.runId??null,hostedEvidence:false,startedAt:at,completedAt:at,armRequests:fs.existsSync(path.join(f.root,'runtime/command-1.claim.json'))?1:0,hostedLifecycleRequests:0};
 input.controller=f.write('control/fixture-close-controller.json',{at,httpStatus:allocated?200:503,error:allocated?null:'DISABLED',complete:true,state});input.content=f.write('control/fixture-close-content.json',content);input.native=f.write('control/fixture-close-native.json',native);input.metadata=f.write('control/fixture-close-metadata.json',metadata);
 input.independentReview=f.write('control/fixture-close-review.json',{at,manifestSha256:input.manifestSha256,approvalId:input.approvalId,runId:input.runId,safeToDisable:true,nativeMutationInFlight:false,evidenceSha256:[input.controller,input.content,input.native,input.metadata].map(d=>d.sha256)});
 const version=allocated?'synthetic-closed-'+input.runId:'synthetic-version';
 input.worker=f.write('control/fixture-close-worker.json',{at,namespaceSha256:f.baseline.namespaceSha256,version,versionSha256:sha(version),policyPreserved:true,activeVersionConfirmed:true,trafficPercentage:100,mode:'disabled',httpStatus:503,complete:true,error:'DISABLED',secretNames:['CONTROLLER_POLICY_JSON']});
 const sealed=f.read('control/credentials-sealed.json');input.credentials={file:'control/credentials-sealed.json',bytes:fs.statSync(path.join(f.root,'control/credentials-sealed.json')).size,sha256:sha(fs.readFileSync(path.join(f.root,'control/credentials-sealed.json')))};
 input.deletion=f.write('control/fixture-close-deletion.json',{at,manifestSha256:input.manifestSha256,remainingMatchingTokens:0,reviewedByPrimary:true,imageSha256:sha('fixture-deletion-image'),roles:sealed.inputs.map(r=>r.role)});
 input.revocation=f.write('control/fixture-close-revocation.json',{at,manifestSha256:input.manifestSha256,rows:sealed.inputs.map(r=>({role:r.role,inputSha256:r.inputSha256,httpStatus:401,complete:true,revoked:true}))});
 input.oauth=f.write('control/fixture-close-oauth.json',{at,loggedIn:false,notStarted:false,revokeHttpStatus:200,logoutExitCode:0});
 for(const folder of ['control','runtime'])if(fs.existsSync(path.join(f.root,folder)))for(const file of fs.readdirSync(path.join(f.root,folder),{recursive:true}).filter(n=>n.endsWith('.json'))){const r=f.read(folder+'/'+file);for(const k of ['processId','ownerPid'])if(Number.isInteger(r[k])&&!pids.includes(r[k]))pids.push(r[k]);}
 input.owned=f.write('control/fixture-close-owned.json',{at,independentReadback:true,nativeMutationInFlight:false,remaining:{processes:0,listeners:0,containers:0,volumes:0},processIds:pids});
 f.write('control/closing-evidence.json',input);return input;
}

test('two actual runs consume the first generated closure receipt with identical execution code',{timeout:120000},async t=>{
 const first=executionFixture(t);t.after(()=>stopFixtureChildren(first));await preparedEntry(t,first);
 let result=await startEntry(t,first,'--execute').done;assert.equal(result.code,0,result.stdout+result.stderr);
 const pids=await stopFixtureChildren(first);const closing=closingFixtureEvidence(first,pids),good=first.read(closing.revocation.file);
 const broken=structuredClone(good);broken.rows[0].complete=false;closing.revocation=first.write(closing.revocation.file,broken);first.write('control/closing-evidence.json',closing);
 result=await startEntry(t,first,'--close').done;assert.equal(result.code,1);assert.equal(fs.existsSync(path.join(first.root,'control/final-receipt.json')),false);
 closing.revocation=first.write(closing.revocation.file,good);const validContent=first.read(closing.content.file),validReview=first.read(closing.independentReview.file),start=closing.startedAt;
 closing.startedAt=first.read('control/allocation-claimed.json').allocatedAt;closing.content=first.write(closing.content.file,{...validContent,startedAt:closing.startedAt});closing.independentReview=first.write(closing.independentReview.file,{...validReview,evidenceSha256:[closing.controller,closing.content,closing.native,closing.metadata].map(d=>d.sha256)});first.write('control/closing-evidence.json',closing);
 result=await startEntry(t,first,'--close').done;assert.equal(result.code,1);assert.match(result.rows.at(-1).fixtureFailure,/CLOSING_READBACK_TOO_EARLY/);
 closing.startedAt=start;closing.content=first.write(closing.content.file,validContent);closing.independentReview=first.write(closing.independentReview.file,validReview);first.write('control/closing-evidence.json',closing);
 result=await startEntry(t,first,'--close').done;assert.equal(result.code,0,result.stdout+result.stderr);
 const receipt=first.read('control/final-receipt.json'),receiptPin=result.rows.at(-1).receipt;assert.equal(receipt.ending,'ENDED_NO_MUTATION');assert.equal(receipt.hostedEvidence,false);
 const second=executionFixture(t,{at:receipt.closedAt+2000});t.after(()=>stopFixtureChildren(second));
 Object.assign(second.baseline,{predecessor:receipt.predecessor,controllerState:receipt.controllerState,version:first.read('control/fixture-close-worker.json').version,versionSha256:receipt.versionSha256});second.write('baseline.json',second.baseline);
 const expected=second.write('previous-expected.json',{sourceSha256:receipt.sourceSha256,namespaceSha256:receipt.namespaceSha256,parentClosureSha256:receipt.parentClosureSha256,previewStateSha256:receipt.previewStateSha256,predecessor:first.baseline.predecessor});second.manifest.files.push(expected);
 second.write('history.json',{kind:'ACCEPTED_GENERATED_CLOSURE',root:first.root,receipt:receiptPin,evidence:receipt.evidence,expected});second.approval.previousClosureSha256=receiptPin.sha256;second.pin();
 assert.equal(sha(JSON.stringify(first.manifest.source)),sha(JSON.stringify(second.manifest.source)));
 result=await startEntry(t,second,'--check-only').done;assert.equal(result.code,0,result.stdout+result.stderr);
 const original=fs.readFileSync(path.join(first.root,receiptPin.file));fs.appendFileSync(path.join(first.root,receiptPin.file),' ');
 result=await startEntry(t,second,'--check-only').done;assert.equal(result.code,1);assert.equal(fs.existsSync(path.join(second.root,'control/allocation-claimed.json')),false);fs.writeFileSync(path.join(first.root,receiptPin.file),original);
 await preparedEntry(t,second);result=await startEntry(t,second,'--execute').done;assert.equal(result.code,0,result.stdout+result.stderr);
 assert.notEqual(second.read('control/allocation-claimed.json').runId,first.read('control/allocation-claimed.json').runId);
 assert.equal(second.read('fresh/verification.json').special,false);assert.equal(second.read('control/pat-scope-verified.json').oldPatQueries,0);
 for(let i=0;i<3;i++)assert.notEqual(first.read('control/credentials-sealed.json').inputs[i].inputSha256,second.read('control/credentials-sealed.json').inputs[i].inputSha256);
 const nextPids=await stopFixtureChildren(second);closingFixtureEvidence(second,nextPids);result=await startEntry(t,second,'--close').done;assert.equal(result.code,0,result.stdout+result.stderr);
 assert.equal(second.read('control/final-receipt.json').parentClosureSha256,receiptPin.sha256);
 console.log(JSON.stringify({acceptance:'TWO_RUN_GENERATED_RECEIPT_HANDOFF',sourceSha256:receipt.sourceSha256,firstReceiptSha256:receiptPin.sha256,secondParentSha256:second.read('control/final-receipt.json').parentClosureSha256,hostedEvidence:false}));
});

test('actual preparation and fixed runner reach arm with the same live client and fixed run deadline',{timeout:60000},async t=>{
 const f=executionFixture(t);t.after(()=>stopFixtureChildren(f));
 Object.assign(f.env,{SUPABASE_ACCESS_TOKEN:'LOCAL_FORBIDDEN_SENTINEL',CLOUDFLARE_API_TOKEN:'LOCAL_FORBIDDEN_SENTINEL',PGHOST:'must-not-connect.invalid',NODE_OPTIONS:'--unhandled-rejections=strict'});
 const measured={identity:5426+6925,scope:4000,controller:4000,'existing-version':7881,preserve:12901,'bind-warm':4000,'preview-content':3683,'preview-native':5420,'metadata-first':4511,'metadata-second':12158,grant:6489,secrets:5857,'secret-version':7573,'deploy-live':8865,'live-version':7421,client:5127,observer:6176,arm:4849};
 f.write('fixture-input.json',{...f.read('fixture-input.json'),delays:Object.fromEntries(Object.entries(measured).map(([k,v])=>[k,Math.ceil(v*1.5)]))});f.pin();await preparedEntry(t,f);
 const result=await startEntry(t,f,'--execute').done;assert.equal(result.code,0,result.stdout+result.stderr);assert.equal(result.rows.at(-1).status,'ARM_RECEIPT_VERIFIED');
 const a=f.read('control/allocation-claimed.json'),h=f.read('control/arm-handoff.json');assert.equal(h.runId,a.runId);assert.equal(h.hardEndAt,a.allocatedAt+1200000);assert.ok(h.leaseDeadlineAt<=f.read('runtime/command-1.claim.json').at+120000);assert.equal(h.hostedAcceptance,false);
 assert.equal(fs.readdirSync(path.join(f.root,'control/steps')).filter(p=>p.endsWith('-verified.json')).length,18);
 assert.ok(result.rows.at(-1).completedAt-a.allocatedAt<240000);assert.ok(h.hardEndAt-result.rows.at(-1).completedAt>960000);console.log(JSON.stringify({acceptance:'DELAYED_PREARM_AND_SAME_RUN',modeledMs:result.rows.at(-1).completedAt-a.allocatedAt,runRemainingMs:h.hardEndAt-result.rows.at(-1).completedAt,leaseMs:120000,hostedEvidence:false}));
 f.write('control/fixture-clock.json',{now:h.leaseDeadlineAt+1});await waitFile(f,'runtime/lease-ended.json');
 assert.equal(f.read('runtime/lease-ended.json').progressSent,false);assert.ok(f.read('control/fixture-clock.json').now<a.hardEndAt);
 const pids=await stopFixtureChildren(f);assert.equal(pids.length,2);assert.equal(publicState(f.read('runtime/fixture-controller-state.json')).phase,'ENDED_NO_MUTATION');
 const journal=fs.readFileSync(path.join(f.root,'runtime/client-'+a.runId+'.jsonl'),'utf8');assert.equal(journal.includes('STAGE_ACCEPTED'),false);assert.equal(f.read('runtime/fixture-controller-state.json').hardEndAt,a.hardEndAt);
});

test('actual entry accepts a fully bound local packet before any allocation',t=>{
 const f=executionFixture(t);
 const result=spawnSync(process.execPath,[entry,'--check-only','--packet',f.root],{cwd:f.root,env:f.env,encoding:'utf8',shell:false,windowsHide:true,timeout:10000});
 assert.equal(result.status,0,'actual entry/helper integration is incomplete: '+result.stdout+result.stderr);
 assert.equal(JSON.parse(result.stdout).claimsWritten,0);
 assert.equal(fs.existsSync(path.join(f.root,'control/allocation-claimed.json')),false);
});

test('the stable actual entry rejects an unapproved packet before helpers or network',()=>{
 assert.ok(fs.existsSync(entry),'stable Gate1 entry has not been implemented');
 const result=spawnSync(process.execPath,[entry,'--check-only','--packet',path.join(root,'.tmp/gate1-no-approval-fixture')],{cwd:root,encoding:'utf8',shell:false,windowsHide:true,env:{SystemRoot:process.env.SystemRoot},timeout:10000});
 assert.equal(result.status,1);assert.equal(result.stderr,'');
 assert.equal(JSON.parse(result.stdout).status,'PACKET_REJECTED_NO_START');
 assert.equal(fs.existsSync(path.join(root,'.tmp/gate1-no-approval-fixture')),false);
});

test('preparation time does not reset approval, allocation or the twenty-minute run',t=>{
 const f=executionFixture(t),start=f.at,a=f.approval;
 assert.equal(preparationClock(a,start,start+1200000),start+3600000);
 const c=allocateClock(a,start,start+1200000);assert.equal(c.hardEndAt,start+2400000);assert.equal(c.freshDeadlineAt,start+1500000);
 admissionTime(c,'arm',c.freshDeadlineAt-5000);assert.throws(()=>admissionTime(c,'arm',c.freshDeadlineAt-4999),/INSUFFICIENT/);
 assert.throws(()=>admissionTime(c,'arm',c.freshDeadlineAt),/FRESH/);
 assert.throws(()=>preparationClock(a,start,start+3600000),/PREPARATION/);
 assert.throws(()=>admissionTime({...c,hardEndAt:c.hardEndAt+1},'arm',c.allocatedAt));
 assert.throws(()=>allocateClock({...a,expiresAt:start+2099999},start,start));
});

test('manual billing is target-bound, thirty-minute evidence and not AX or unchanged-settings proof',t=>{
 const f=executionFixture(t),now=f.at+1800000;
 const rows=[['supabase',f.manifest.organizationSha256],['cloudflare',f.manifest.accountSha256]].map(([service,targetSha256])=>({service,targetSha256,method:'OPERATOR_IMAGE_REVIEWED_BY_PRIMARY',capturedAt:f.at,reviewedAt:f.at+100,contradiction:false,settingsChanged:false,imageSha256:'b'.repeat(64),free:true,spendCapEnabled:true,priceUSD:0,dailyRequests:100000}));
 validateBilling(rows,f,now);assert.throws(()=>validateBilling(rows,f,now+1),/BILLING_EXPIRED/);
 assert.throws(()=>validateBilling([{...rows[0],targetSha256:'c'.repeat(64)},rows[1]],f,now));
 assert.throws(()=>validateBilling([{...rows[0],settingsChanged:true},rows[1]],f,now));
});

test('actual Windows protected input entry is available without inheriting service environment',()=>{
 assert.ok(fs.existsSync(path.join(root,'scripts/gate1-execution/control/credential-intake.mjs')),'bounded protected input has not been implemented');
});

test('accepted real checkpoint uses fixed expected hashes and preserves UNKNOWN and retry12 without token reads',async()=>{
 const proof=await readInitialHistory(root),value=historyValue(proof);
 assert.equal(proof.evidenceSha256,ACCEPTED_HISTORY_ANCHOR.receipt.sha256);assert.equal(value.oldPatQueries,0);
 assert.equal(value.originalUnknownResolved,false);assert.equal(value.retry12.safeClosureAccepted,false);
 assert.equal(value.retry12.controllerPatHttp401,'UNVERIFIED_IMAGE_EXCEPTION');
 assert.throws(()=>historyValue(structuredClone(proof)),/VERIFIED_HISTORY/);
});

async function inputChild(t,f){
 const child=spawn(process.execPath,[entry,'--prepare','--packet',f.root],{cwd:f.root,env:f.env,windowsHide:true,shell:false,stdio:['ignore','pipe','pipe']});
 let stdout='',stderr='';child.stdout.on('data',b=>stdout+=b);child.stderr.on('data',b=>stderr+=b);
 const done=new Promise((resolve,reject)=>{child.once('error',reject);child.once('close',code=>resolve({code,stdout,stderr}));});
 t.after(async()=>{if(child.exitCode===null)child.kill();await done;});
 const deadline=Date.now()+5000;let ready;
 while(!ready&&Date.now()<deadline){for(const line of stdout.split('\n')){try{const r=JSON.parse(line);if(r.status==='LOCAL_PROTECTED_INTAKE_READY')ready=r;}catch{}}if(!ready)await new Promise(r=>setTimeout(r,20));}
 assert.ok(ready,'ACTUAL_INTAKE_NOT_READY');
 const info=f.read(fs.existsSync(path.join(f.root,'control/intake-1-ready.json'))?'control/intake-1-ready.json':'control/intake-0-ready.json');
 const post=(role,token)=>fetch(ready.origin+'/'+role,{method:'POST',headers:{origin:ready.origin,'content-type':'application/x-www-form-urlencoded'},body:new URLSearchParams({csrf:info.csrf,...(token?{token}:{})})});
 return {child,done,ready,post};
}

test('actual Windows input accepts one correction, preserves ciphertext and closes idle connections after seal',{timeout:20000},async t=>{
 const f=executionFixture(t),p=await inputChild(t,f),token=n=>'sbp_fc'+'LOCAL_ONLY_SYNTHETIC_'+String(n).repeat(20);
 assert.equal((await p.post('controllerPat',token(1))).status,200);
 const page=await fetch(p.ready.origin+'/controllerPat');assert.match(await page.text(),/action="\/seal"/);
 const old=f.read('control/intake/controllerPat-1.json');
 assert.equal((await p.post('controllerPat',token(2))).status,200);
 assert.equal((await p.post('controllerPat',token(3))).status,400);
 assert.equal((await p.post('configurationToken',token(4))).status,200);
 assert.equal((await p.post('metadataReadPat',token(5))).status,200);
 const idle=net.connect(new URL(p.ready.origin).port,'127.0.0.1');await new Promise(resolve=>idle.once('connect',resolve));t.after(()=>idle.destroy());
 assert.equal((await p.post('seal')).status,200);
 const result=await p.done;assert.equal(result.code,0);assert.equal(result.stderr,'');assert.equal(result.stdout.includes('sbp_fc'),false);
 assert.equal(f.read('control/intake/controllerPat-1.json').protectedInput.sha256,old.protectedInput.sha256);
 assert.equal(f.read('control/credentials-sealed.json').inputs[0].revision,2);assert.equal(f.read('control/intake-0-closed.json').listeners,0);
 await assert.rejects(fetch(p.ready.origin+'/controllerPat'));
});

test('human wait expiry uses the original preparation clock and leaves no allocation or listener',{timeout:10000},async t=>{
 const f=executionFixture(t),p=await inputChild(t,f);
 f.write('control/fixture-clock.json',{now:p.ready.deadlineAt+1});
 assert.equal((await p.post('controllerPat','sbp_fcLOCAL_ONLY_SYNTHETIC_'+ 'x'.repeat(24))).status,400);
 const result=await p.done;assert.equal(result.code,1);assert.equal(f.read('control/intake-0-closed.json').reason,'EXPIRED');
 assert.equal(fs.existsSync(path.join(f.root,'control/allocation-claimed.json')),false);
});

async function waitFile(f,leaf){const end=Date.now()+8000;while(Date.now()<end){if(fs.existsSync(path.join(f.root,leaf))){try{return f.read(leaf);}catch{}}await new Promise(r=>setTimeout(r,25));}assert.fail('FIXTURE_RECEIPT_NOT_WRITTEN '+leaf);}

test('input cancellation permits one resume with the original deadline and no extra correction',{timeout:20000},async t=>{
 const f=executionFixture(t),p=await inputChild(t,f);assert.equal((await p.post('controllerPat','sbp_fcLOCAL_ONLY_'+ 'c'.repeat(32))).status,200);const original=f.read('control/intake/controllerPat-1.json');
 assert.equal((await p.post('cancel')).status,200);assert.equal((await p.done).code,1);
 f.write('control/fixture-clock.json',{now:f.at+1000});const next=await inputChild(t,f);assert.equal(next.ready.deadlineAt,p.ready.deadlineAt);assert.equal(f.read('control/preparation-resumed.json').originalStartedAt,f.at);assert.deepEqual(f.read('control/intake/controllerPat-1.json'),original);
 assert.equal((await next.post('cancel')).status,200);await next.done;const again=await startEntry(t,f,'--prepare').done;assert.equal(again.code,1);assert.equal(again.rows.at(-1).reason,'CLAIM_ALREADY_CONSUMED');assert.equal(fs.existsSync(path.join(f.root,'control/allocation-claimed.json')),false);
});

test('missing human review and expiry refuse allocation; consumed delayed run refuses secret dispatch',{timeout:60000},async t=>{
 const f=executionFixture(t);await preparedEntry(t,f);const review=f.read('control/handoff-reviewed.json');f.write('control/handoff-reviewed.json',{...review,ready:false});
 let result=await startEntry(t,f,'--execute').done;assert.equal(result.code,1);assert.equal(fs.existsSync(path.join(f.root,'control/allocation-claimed.json')),false);
 f.write('control/handoff-reviewed.json',review);f.write('control/fixture-clock.json',{now:f.at+3600000});result=await startEntry(t,f,'--execute').done;assert.equal(result.code,1);assert.equal(result.rows.at(-1).reason,'PREPARATION_EXPIRED');assert.equal(fs.existsSync(path.join(f.root,'control/allocation-claimed.json')),false);
 closingFixtureEvidence(f);const preclosed=await startEntry(t,f,'--close').done;assert.equal(preclosed.code,0,preclosed.stdout);assert.equal(f.read('control/final-receipt.json').ending,'PREPARATION_CLOSED');
 const delayed=executionFixture(t);delayed.write('fixture-input.json',{...delayed.read('fixture-input.json'),delays:{'preview-native':215000}});delayed.pin();await preparedEntry(t,delayed);
 result=await startEntry(t,delayed,'--execute').done;assert.equal(result.code,1);assert.equal(result.rows.at(-1).stage,'grant');assert.equal(result.rows.at(-1).reason,'INSUFFICIENT_ADMISSION_TIME');assert.equal(fs.existsSync(path.join(delayed.root,'control/steps/secrets-claimed.json')),false);
 const fixed=delayed.read('control/allocation-claimed.json');result=await startEntry(t,delayed,'--execute').done;assert.equal(result.code,1);assert.deepEqual(delayed.read('control/allocation-claimed.json'),fixed);
});

test('lost arm response is never resent and follows existing stop before independent closure',{timeout:60000},async t=>{
 const f=executionFixture(t);t.after(()=>stopFixtureChildren(f));f.write('fixture-input.json',{...f.read('fixture-input.json'),armResponseUnknown:true});f.pin();await preparedEntry(t,f);
 const result=await startEntry(t,f,'--execute').done;assert.equal(result.code,1);assert.equal(result.rows.at(-1).closure.stage,'ARM_SENT_OR_UNKNOWN');assert.equal(result.rows.at(-1).automaticRetry,false);
 await waitFile(f,'runtime/client-forward-unconfirmed.json');const pids=await stopFixtureChildren(f),allocation=f.read('control/allocation-claimed.json');
 const lines=fs.readFileSync(path.join(f.root,'runtime/client-'+allocation.runId+'.jsonl'),'utf8').trim().split('\n').map(l=>JSON.parse(l).payload);assert.equal(lines.filter(r=>r.event==='HTTP_ATTEMPT'&&r.route==='/v1/arm').length,1);
 closingFixtureEvidence(f,pids);const closed=await startEntry(t,f,'--close').done;assert.equal(closed.code,0,closed.stdout);assert.equal(f.read('control/final-receipt.json').ending,'ENDED_NO_MUTATION');assert.equal(f.read('control/final-receipt.json').originalUnknownResolved,false);
});

test('a dispatched operation with UNKNOWN outcome cannot produce a normal closure receipt',{timeout:60000},async t=>{
 const f=executionFixture(t);t.after(()=>stopFixtureChildren(f));f.write('fixture-input.json',{...f.read('fixture-input.json'),mutationUnknown:true});f.pin();await preparedEntry(t,f);
 let result=await startEntry(t,f,'--execute').done;assert.equal(result.code,0,result.stdout);
 const sent=spawnSync(process.execPath,[path.join(root,'scripts/gate1-execution/send-command.mjs'),'pause-preview'],{cwd:f.root,env:f.env,windowsHide:true,encoding:'utf8',timeout:5000});assert.equal(sent.status,0,sent.stdout);
 await waitFile(f,'runtime/client-forward-unconfirmed.json');const pids=await stopFixtureChildren(f);assert.equal(f.read('runtime/fixture-controller-state.json').operations.previewPause.outcome,'UNKNOWN');
 closingFixtureEvidence(f,pids);result=await startEntry(t,f,'--close').done;assert.equal(result.code,1);assert.equal(fs.existsSync(path.join(f.root,'control/final-receipt.json')),false);
});

test('OAuth expiry closes the real child and idle listener and cannot start a second login',{timeout:30000},async t=>{
 const f=executionFixture(t),{pendingService,oauth}=await preparedEntry(t,f,{waitForOAuth:false});
 const pid=f.read('control/oauth-process.json').processId,deadline=f.read('control/oauth-login-claimed.json').deadlineAt;
 const idle=net.connect(new URL(oauth.launcher).port,'127.0.0.1');await new Promise(r=>idle.once('connect',r));t.after(()=>idle.destroy());
 f.write('control/fixture-clock.json',{now:deadline});assert.equal((await fetch(oauth.launcher,{redirect:'manual'})).status,404);
 const result=await pendingService.done;assert.equal(result.code,1);const closed=f.read('control/oauth-login-result.json');assert.equal(closed.status,'OAUTH_LOGIN_NOT_ACCEPTED');assert.equal(closed.listeners,0);assert.equal(closed.deadlineAt,deadline);assert.throws(()=>process.kill(pid,0),{code:'ESRCH'});
 const again=await startEntry(t,f,'--prepare-services').done;assert.equal(again.code,1);assert.equal(f.read('control/oauth-process.json').processId,pid);assert.equal(fs.existsSync(path.join(f.root,'control/allocation-claimed.json')),false);
});

test('native closing helper output and the strict shared validators reject incomplete readbacks',t=>{
 const f=executionFixture(t),raw={status:0,signal:null,stderr:'',stdout:JSON.stringify(f.baseline.state)};
 const r=verifyClosingContent(f.baseline.state,raw);validateContent(r,f.baseline);assert.throws(()=>verifyClosingContent(f.baseline.state,{...raw,status:null,error:Error('aborted')}));
 assert.throws(()=>validateContent({...r,state:{...r.state,otherActiveClients:1}},f.baseline));
 assert.equal(classifyClosingState(f.baseline.controllerState,{runId:'c'.repeat(64),predecessor:f.baseline.predecessor}).kind,'PREARM_SAFE_CLOSURE_PREDECESSOR_UNCHANGED');
 assert.throws(()=>classifyClosingState({...f.baseline.controllerState,phase:'NEEDS_OPERATOR'},{runId:'c'.repeat(64),predecessor:f.baseline.predecessor}));
});

test('immutable observer finish waits for complete input and preserves the same run and byte bound',t=>{
 const f=executionFixture(t),id='d'.repeat(64),runtime=path.join(f.root,'runtime');f.write('runtime/preview-control.json',{runId:id,sequence:0,command:'wait'});
 fs.writeFileSync(path.join(runtime,'preview-finish.json'),'');assert.equal(observerFinished(readObserverControl(runtime,'preview',id),id),false);
 fs.writeFileSync(path.join(runtime,'preview-finish.json'),'{');assert.equal(observerFinished(readObserverControl(runtime,'preview',id),id),false);
 f.write('runtime/preview-finish.json',{runId:id,sequence:1,command:'finish'});assert.equal(observerFinished(readObserverControl(runtime,'preview',id),id),true);
 assert.throws(()=>readObserverControl(runtime,'preview','e'.repeat(64)));fs.writeFileSync(path.join(runtime,'preview-finish.json'),' '.repeat(4097));assert.throws(()=>readObserverControl(runtime,'preview',id));
});
