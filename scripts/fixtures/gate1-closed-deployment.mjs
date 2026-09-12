// Fully synthetic, inert filesystem receipts. No real accounts or credentials.
import fs from 'node:fs/promises';
import path from 'node:path';
import {closureFixture,sha,legacyProducers,sourceProducers} from './gate1-safe-closure.mjs';
import {canonicalJson,POLICY_PREFIX,GRANT_PREFIX} from '../../workers/gate1-recovery-controller/safe-closure.mjs';
import {verifyRetainedSafeClosure,verifySafeClosureEvidence,issueSafeClosureGrant} from '../lib/comment-translator-paid-core-v1-gate1-safe-closure.mjs';
const desc=(file,b)=>({file,bytes:Buffer.byteLength(b),sha256:sha(b)});
const prefix='.tmp/gate1-live-execution-20260912-retry4';
const diag='.tmp/gate1-retry4-client-diagnosis-20260912/';

async function freshFiles({root,prefix:destination,producerRoot,manifest,approval,records,retained,now,closedDeployment}){
 const pins=[],put=async(name,value)=>{const text=canonicalJson(value),file=destination+'/'+name;await fs.mkdir(path.dirname(path.join(root,file)),{recursive:true});await fs.writeFile(path.join(root,file),text);pins.push([file,text]);return desc(file,text);};
 const md=await put('manifest.json',manifest);approval.manifestSha256=md.sha256;approval.successor={runId:manifest.runId,sourceCommit:manifest.sourceCommit,hardEndAt:manifest.hardEndAt,manifestSha256:md.sha256};
 const ad=await put('approval.json',approval),artifacts=[];
 for(const [id,r] of records){const producer=manifest.producers.find(p=>p.id===r.producer);r.producerSha256=producer.sha256;artifacts.push({id,producer:r.producer,producerSha256:r.producerSha256,...await put(id+'.json',r)});}
 const ix=await put('index.json',{schemaVersion:manifest.schemaVersion,kind:'GATE1_SAFE_CLOSURE_FRESH_V'+manifest.schemaVersion,manifestSha256:md.sha256,approvalSha256:ad.sha256,artifacts});
 return {pins,input:()=>({retained,root,producerRoot,manifest:md,approval:ad,index:ix,now:()=>now,...(closedDeployment?{closedDeployment}:{})})};
}

export async function closedDeploymentFixture(){
 const f=await closureFixture(),retained=await verifyRetainedSafeClosure({packet:f.packet,root:f.root,backupRoot:f.backupRoot}),fresh=await f.fresh(retained),clock=f.clock;
 const root=f.root,backupRoot=path.join(f.base,'backup4'),staticRoot=path.join(f.base,'static4');await fs.mkdir(backupRoot);await fs.mkdir(staticRoot);
 const records=new Map(),staticNames=new Set(),external=new Map(),backups=new Map(),diagnostics=new Map(),versions=['closed-synthetic-version','secret-version','live-version','close-version','final-version'];
 versions[0]=JSON.parse(f.records.get('control/final-worker-closed.json')).version;
 const json=(name,value)=>records.set(name,JSON.stringify(value));
 const scriptNames=[...new Set([...legacyProducers.filter(n=>n!=='control/logout-observe.mjs'),'fresh-controller.mjs','fresh-preview.mjs','fresh-native.mjs','fresh-metadata.mjs','close-environment.mjs','control/logout.mjs','prearm-sequence.mjs','packet-adapter.mjs','native-io.mjs'])];
 for(const name of scriptNames){records.set(name,'// inert synthetic producer '+name+'\n');staticNames.add(name);}
 records.set('worker.bundle.mjs','// inert bundle\n');staticNames.add('worker.bundle.mjs');
 records.set('LIVE-RETRY.md','Synthetic local test only. No external authority.\n');staticNames.add('LIVE-RETRY.md');
 const policy={...f.packet.policy,sourceCommit:fresh.manifest.sourceCommit};
 json('policy.targets.private.json',policy);staticNames.add('policy.targets.private.json');
 json('existing-worker-baseline.json',{namespaceSha256:f.packet.namespaceSha256,version:versions[0],oldPolicy:f.packet.policy,retainedEvidenceSha256:retained.evidenceSha256,predecessorSha256:f.packet.receipt.sha256,predecessorStateSha256:f.packet.predecessor.stateSha256});staticNames.add('existing-worker-baseline.json');
 const sourceNames=[...new Set([...sourceProducers,'scripts/lib/comment-translator-paid-core-v1-gate1-safe-closure.mjs','workers/gate1-recovery-controller/safe-closure.mjs'])];
 while(sourceNames.length<58)sourceNames.push('scripts/synthetic-source-'+sourceNames.length+'.mjs');
 for(const name of sourceNames)external.set(name,'// inert published source '+name+'\n');
 json('operator-source-candidate.json',{sourceCommit:policy.sourceCommit,entries:sourceNames.map(name=>({...desc(name,external.get(name)),gitBlobSha256:sha(external.get(name))}))});staticNames.add('operator-source-candidate.json');
 const priorIndexName='.tmp/gate1-live-execution-20260912-retry3/control/closure-evidence.json',priorReceiptName='.tmp/gate1-live-execution-20260912-retry3/control/final-receipt.json';
 external.set(priorIndexName,'{"synthetic":true}');
 external.set(priorReceiptName,JSON.stringify({allocation:'SAFE_CLOSURE_RETRY_3',scopeClosed:true,status:'PREARM_FRESH_WINDOW_EXPIRED_SAFE_CLOSED',closureEvidenceSha256:sha(external.get(priorIndexName)),executed:{armPosts:0,codeUploads:0,secretChanges:0,grantsIssued:0}}));
 const previous={allocation:'SAFE_CLOSURE_RETRY_3',reusable:false,receipt:desc(priorReceiptName,external.get(priorReceiptName)),closureIndex:desc(priorIndexName,external.get(priorIndexName))};json('previous-allocation.json',previous);staticNames.add('previous-allocation.json');
 const producerNames=['fresh-controller.mjs','fresh-preview.mjs','fresh-native.mjs','fresh-metadata.mjs'];
 fresh.manifest.bundle=desc(prefix+'/worker.bundle.mjs',records.get('worker.bundle.mjs'));
 fresh.manifest.producers=fresh.manifest.producers.map((p,i)=>({id:p.id,...desc(prefix+'/'+producerNames[i],records.get(producerNames[i]))}));
 const bundleSha256=fresh.manifest.bundle.sha256;
 while(staticNames.size+external.size<139){const name='static-padding-'+staticNames.size+'.txt';records.set(name,'synthetic input\n');staticNames.add(name);}
 const staticFiles=[...[...staticNames].map(name=>desc(prefix+'/'+name,records.get(name))),...[...external].map(([name,b])=>desc(name,b))];
 json('manifest.json',{schemaVersion:1,status:'PREPARED_UNAPPROVED',allocation:'SAFE_CLOSURE_RETRY_4',packetRoot:prefix,sourceCommit:policy.sourceCommit,controllerBundleSha256:bundleSha256,files:staticFiles});
 const manifestSha256=sha(records.get('manifest.json'));
 const approval={allocation:'SAFE_CLOSURE_RETRY_4',action:'LIVE_HOSTED_ONE_RUN',sourceCommit:policy.sourceCommit,manifestSha256,planSha256:sha(records.get('LIVE-RETRY.md')),predecessorSha256:f.packet.receipt.sha256,predecessorStateSha256:f.packet.predecessor.stateSha256,policySha256:sha(JSON.stringify(policy)),liveRunAllowance:1,deploymentAllowance:2,grantAllowance:1,freshAllocationAllowance:1,newProjectAllowance:0,newNamespaceAllowance:0,extraChargeCeilingUSD:0,authorizedAt:fresh.approval.authorizedAt,expiresAt:fresh.approval.expiresAt,previousAllocationSha256:previous.receipt.sha256};json('approval.json',approval);
 for(const [name,b] of records){await fs.mkdir(path.dirname(path.join(root,prefix,name)),{recursive:true});await fs.writeFile(path.join(root,prefix,name),b);}
 const historical=await freshFiles({root,prefix:prefix+'/fresh',producerRoot:root,manifest:fresh.manifest,approval:fresh.approval,records:fresh.records,retained,now:clock});
 for(const [name,b] of historical.pins)records.set(name.slice(prefix.length+1),b);
 const proof=await verifySafeClosureEvidence(historical.input()),grant=issueSafeClosureGrant({proof,grantId:'d'.repeat(64),now:()=>clock});
 records.set('fresh/grant.json',grant.text);
 json('fresh/verification.json',{status:'OFFLINE_FRESH_EVIDENCE_VERIFIED',verifiedAt:clock,evidenceSha256:proof.evidenceSha256,packetManifestSha256:manifestSha256,manifestSha256:historical.input().manifest.sha256,approvalSha256:historical.input().approval.sha256,grantSha256:grant.sha256,index:historical.input().index,grant:desc(prefix+'/fresh/grant.json',grant.text)});
 json('control/fresh-allocation-claimed.json',{allowance:1,at:fresh.manifest.hardEndAt-1200000,hardEndAt:fresh.manifest.hardEndAt,runId:fresh.manifest.runId,authorizedApprovalSha256:sha(records.get('approval.json')),packetManifestSha256:manifestSha256});
 const sequence={packetManifestSha256:manifestSha256,authorizedAt:approval.authorizedAt,expiresAt:approval.expiresAt,startedAt:clock-59000,oldestObservationAt:clock-60000,deadlineAt:clock+240000,allowance:1};json('control/timed-runner/sequence-claimed.json',sequence);
 const stages=['allocate','controller','oauth','identity','existing-version','preserve','warm','preview-content','preview-native','metadata-first','metadata-second','grant','secrets','secret-version','deploy-live','live-version','client'];
 const offsets=[-59000,-57000,-55000,-53000,-51000,-49000,-47000,-45000,-40000,-27000,-12000,-2000,2000,4000,6000,8000,10000];
 for(const [i,stage] of stages.entries()){const stem='control/timed-runner/stage-'+String(i).padStart(2,'0')+'-'+stage,at=clock+offsets[i];json(stem+'-claimed.json',{stage,index:i,at,deadlineAt:sequence.deadlineAt});json('control/timed-runner/helper-'+stage+'-started.json',{stage,processId:100+i,at:at+10});if(i<16){const end=i===11?clock+1000:at+1000;json('control/timed-runner/helper-'+stage+'-completed.json',{stage,nativeExitCode:0,at:end-10});json(stem+'-verified.json',{stage,index:i,startedAt:at,completedAt:end,elapsedMs:end-at});}}
 json('control/timed-runner/sequence-stop.json',{status:'FORWARD_STOP_REQUIRES_PRIMARY_CLOSURE',stage:'client',index:16,at:clock+10000,deadlineAt:sequence.deadlineAt,reason:'STAGE_EXECUTION_FAILED',automaticRetry:false,deadlineRenewed:false});
 json('control/primary-helper-settlement.json',{at:clock+16000,source:'PRIMARY_CIM_PROCESS_AND_LISTENER_OBSERVATION',startedHelpers:17,remainingStartedHelpers:0,remainingDescendants:0,matchingRetry4Processes:0,ownedListeners:0,runtimePresent:false,clientClaimPresent:false,clientProcessRecordPresent:false,failedHelperExitCode:'UNRECORDED',noRetry:true});
 const terminal=JSON.parse(f.records.get('control/closing-state-terminal.json'));json('control/closing-state-initial.json',{...terminal,at:clock+20000});
 for(const name of ['before-state.json','live-synthetic-source-context.json','preservation-query.sql','preview.dump'])backups.set(name,f.backups.get(name));
 const before=JSON.parse(backups.get('before-state.json')),preservation=JSON.parse(f.records.get('preservation.json'));
 json('preservation.json',{...preservation,directory:backupRoot,archiveBytes:Buffer.byteLength(backups.get('preview.dump')),archiveSha256:sha(backups.get('preview.dump')),stateSha256:sha(JSON.stringify(before.relations))});
 json('control/independent-close-preview-content.json',{status:'PASS',tableCount:77,dbWrites:0,stateSha256:sha(JSON.stringify(before)),completedAt:clock+22000});
 const native=JSON.parse(f.records.get('preview-postresume-baseline.json'));native.sourceCommit=policy.sourceCommit;native.observedAt=new Date(clock+23000).toISOString();
 json('control/independent-close-preview-native.json',native);json('preview-postresume-baseline.json',native);
 json('control/independent-close-environment.json',{status:'INDEPENDENT_CLOSING_ENVIRONMENT_MATCHED',startedAt:clock+21000,completedAt:clock+24000,previewContent:'PASS',previewNativeApi:native.status,dbWrites:0,hostedLifecycle:0,formalStopProof:false,safeToDisable:false,metadata:['preview','recovery','production'].map(role=>({role,status:role==='recovery'?'INACTIVE':'ACTIVE_HEALTHY',httpStatus:200,complete:true,completedAt:clock+23500}))});
 const safeNames=['control/closing-state-initial.json','control/independent-close-environment.json','control/primary-helper-settlement.json'];
 json('control/safe-closure.json',{at:clock+25000,source:'PRIMARY_ACTUAL_TERMINAL_AND_INDEPENDENT_ENVIRONMENT_ACCEPTANCE',classification:'PREARM_SAFE_CLOSURE_PREDECESSOR_UNCHANGED',formalStopAccepted:false,formalProofRequired:false,controllerGets:2,controllerApplicationRequests:2,armPosts:0,newRunLifecycleClaims:0,controllerPredecessorUnknownPreserved:true,helperProcessesRemaining:0,evidence:safeNames.map(name=>({file:prefix+'/'+name,sha256:sha(records.get(name))}))});
 for(const [i,name] of ['existing','secrets','live','close'].entries())json('control/version-'+name+'.json',{at:clock+[-50000,4500,8500,31000][i],stage:name,version:versions[i],activeVersionConfirmed:true,trafficPercentage:100,mode:name==='live'?'live':'disabled',encryptedSecrets:name==='existing'?1:4,namespaceSha256:f.packet.namespaceSha256,namespacePreserved:true});
 for(const [name,i,offset] of [['live',2,7000],['close',3,30000]])json('control/deploy-'+name+'-result.json',{at:clock+offset,status:'DEPLOYED_VERSION_RECORDED',stage:name,exitCode:0,timedOut:false,errorCodes:[],version:versions[i],mode:name==='live'?'live':'disabled',bundleSha256});
 json('deployment-receipt.json',{version:versions[2],namespaceSha256:f.packet.namespaceSha256,sourceCommit:policy.sourceCommit,bundleSha256,policySha256:sha(JSON.stringify(policy)),mode:'live',grantSha256:grant.sha256});
 json('control/initial-secrets-result.json',{at:clock+3000,exitCode:0,status:'SECRET_BATCH_COMMAND_SUCCEEDED',errorCodes:[],configurationTokenExcluded:true,names:['CONTROLLER_OPERATOR_TOKEN','CONTROLLER_POLICY_JSON','CONTROLLER_SAFE_CLOSURE_GRANT_JSON','SUPABASE_SCOPED_TOKEN']});
 const roles=[['operator','CONTROLLER_OPERATOR_TOKEN'],['controller-pat','SUPABASE_SCOPED_TOKEN'],['grant','CONTROLLER_SAFE_CLOSURE_GRANT_JSON']];
 for(const [i,[role,name]] of roles.entries())json('control/secret-delete-'+role+'-result.json',{at:clock+34000+i*1000,name,confirmed:true,exitCode:0});
 json('control/secret-closure.json',{at:clock+37000,status:'PAT_OPERATOR_AND_GRANT_SECRETS_REMOVED',removed:3,remainingNames:['CONTROLLER_POLICY_JSON'],namespaceDeletionAttempted:false});
 json('control/final-worker-closed.json',{at:clock+38000,status:'FINAL_WORKER_DISABLED_AND_CREDENTIALS_REMOVED',version:versions[4],activeVersionConfirmed:true,trafficPercentage:100,mode:'disabled',httpStatus:503,namespacePreserved:true,remainingSecrets:1,policyRetained:true,controllerApplicationRequests:4});
 json('control/disabled-confirmed.json',{at:clock+32000,status:'DISABLED_CONFIRMED',httpStatus:503,error:'DISABLED',applicationRequests:3});
 const patRows=['controllerPat','configurationToken','metadataReadPat'].map(role=>({role,httpStatus:401,complete:true,revoked:true}));
 json('control/pat-revoked-verified.json',{at:clock+33000,status:'PAT_REVOCATION_VERIFIED',revoked:3,rows:patRows});
 json('control/oauth-revoke-response.json',{at:new Date(clock+39000).toISOString(),statusCode:200});
 json('control/oauth-logout-result.json',{at:clock+40000,logoutExitCode:0,successMessageObserved:true,whoamiExitCode:1,loggedIn:false,revokeHttpStatus:200});
 json('source-cleanup.json',{removedOnlyOwned:true,ownedContainersRemaining:0,ownedVolumesRemaining:0,sourceUserCountBeforeCleanup:0});
 json('control/retained-and-resource-closure.json',{at:clock+42000,status:'RETAINED_BYTES_AND_OWNED_RESOURCE_CLOSURE_VERIFIED',ownedContainers:0,ownedVolumes:0,productSourceFiles:58,manifestSha256,bundleSha256,retainedEvidenceSha256:retained.evidenceSha256});
 json('control/final-process-closure.json',{at:clock+43000,status:'OWNED_PROCESS_AND_LISTENER_CLOSURE_VERIFIED',ownedHelperProcesses:0,ownedListeners:0});
 for(const name of ['argv-capture.cjs','diagnosis.json','native-boundary.ps1','received-args.json'])diagnostics.set(name,name.endsWith('.json')?'{}':'// inert diagnostic\n');
 while(records.size<243)records.set('evidence-padding-'+records.size+'.txt','synthetic retained evidence\n');
 const receipt={schemaVersion:1,allocation:'SAFE_CLOSURE_RETRY_4',status:'PREARM_CLIENT_START_FAILED_SAFE_CLOSED',scopeClosed:true,gate1:'NO_GO',formalStopAccepted:false,hostedAccepted:false,productSourceChanged:false,extraChargeCeilingUSD:0,paidPlanChanges:0,newEvidenceFiles:243,protectedBackupFiles:4,localDiagnosticFiles:4,sourceCommit:policy.sourceCommit,packetManifestSha256:manifestSha256,approvalSha256:sha(records.get('approval.json')),executionManifestSha256:historical.input().manifest.sha256,at:clock+44000,executed:{scopedPatsCreated:3,scopedPatsRevoked:3,oauthLogins:1,oauthRevocations:1,timedRunnerInvocations:1,verifiedPrearmStages:16,freshAllocations:1,preservationArchives:1,localWarm:1,grantsIssued:1,secretBatches:1,secretValuesSet:4,runtimeSecretsDeleted:3,codeUploads:2,clientLaunchStageAttempts:1,clientStartClaims:0,observerStarts:0,armPosts:0,hostedConfigurationWrites:0,hostedTransfers:0,productionSqlOrConfig:0,additionalManagementGets:23,safeClosureWorkerAdmissionMetadataGets:0,hostedLifecycleClaims:{previewPause:0,recoveryRestore:0,recoveryPause:0,previewRestore:0},controllerHttp:{posts:0,gets:4,clientGets:0,independentGets:4,total:4}},preserved:{retainedEvidenceSha256:retained.evidenceSha256,priorUnknownOutcome:true,ledgerDirectlyRead:false,preservationBasis:'EXACT_PRIOR_CANONICAL_STATE_HASH_SAME_NAMESPACE_ZERO_CONTROLLER_POSTS'},artifact:{bundleSha256,acceptedSourceAndBundleUnchanged:true,liveAndDisabledUploadReceiptConfirmed:true,activeVersionsIndependentlyRead:true,deployedBundleBytesIndependentlyDownloaded:false}};
 const packet={schemaVersion:1,format:'GATE1_RETRY4_PREARM_20260912_V1',prefix,receipt:null,index:null};
 async function seal(){
  for(const [name,b] of records){await fs.mkdir(path.dirname(path.join(root,prefix,name)),{recursive:true});await fs.writeFile(path.join(root,prefix,name),b);}
  for(const [name,b] of backups)await fs.writeFile(path.join(backupRoot,name),b);
  for(const [name,b] of diagnostics){await fs.mkdir(path.join(root,diag),{recursive:true});await fs.writeFile(path.join(root,diag,name),b);}
  for(const d of staticFiles){const b=d.file.startsWith(prefix+'/')?records.get(d.file.slice(prefix.length+1)):external.get(d.file);await fs.writeFile(path.join(staticRoot,d.sha256),b);}
  const index={at:clock+43500,files:[...records].map(([name,b])=>desc(prefix+'/'+name,b)),protectedBackupFiles:[...backups].map(([name,b])=>desc(path.join(backupRoot,name).replaceAll('\\','/'),b)),localDiagnosticFiles:[...diagnostics].map(([name,b])=>desc(diag+name,b))};
  const ix=JSON.stringify(index);packet.index=desc(prefix+'/control/closure-evidence.json',ix);await fs.writeFile(path.join(root,packet.index.file),ix);
  receipt.closureEvidenceSha256=packet.index.sha256;const text=JSON.stringify(receipt);packet.receipt=desc(prefix+'/control/final-receipt.json',text);await fs.writeFile(path.join(root,packet.receipt.file),text);
 }
 await seal();
 async function currentFresh(closedDeployment){
  const next=await f.fresh(retained),now=clock+600000;
  next.manifest.schemaVersion=2;next.manifest.kind='GATE1_SAFE_CLOSURE_EXECUTION_MANIFEST_V2';next.manifest.runId='1'.repeat(64);next.manifest.hardEndAt+=600000;next.manifest.closedDeploymentEvidenceSha256=closedDeployment.evidenceSha256;
  const controllerProducer=next.manifest.producers[0];controllerProducer.id='gate1-independent-controller-v2';
  next.approval.schemaVersion=2;next.approval.kind='GATE1_SAFE_CLOSURE_APPROVAL_V2';next.approval.approvalId='2'.repeat(64);next.approval.authorizedAt+=600000;next.approval.expiresAt+=600000;next.approval.closedDeploymentReceiptSha256=closedDeployment.receiptSha256;
  for(const [id,r] of next.records){r.startedAt+=600000;r.completedAt+=600000;if(id==='controller'){r.kind='GATE1_CONTROLLER_CLOSED_V2';r.producer=controllerProducer.id;r.closedVersionSha256=sha(versions[4]);r.priorPolicySha256=sha(POLICY_PREFIX+canonicalJson(policy));r.preservationBasis='VERIFIED_PREARM_CLOSURE_SAME_NAMESPACE_AND_VERSION';r.closedDeploymentEvidenceSha256=closedDeployment.evidenceSha256;r.previousAllocationPatRevocations=structuredClone(patRows);r.previousAllocationOwned={containers:0,volumes:0,processes:0,listeners:0};}if(r.projects)for(const p of r.projects){p.startedAt+=600000;p.completedAt+=600000;}}
  let built;async function sealFresh(){built=await freshFiles({root:f.base,prefix:'current',producerRoot:next.input().producerRoot,manifest:next.manifest,approval:next.approval,records:next.records,retained,now,closedDeployment});}
  await sealFresh();return {...next,now,seal:sealFresh,input:()=>built.input()};
 }
 return {root,backupRoot,staticRoot,packet,retained,records,backups,diagnostics,receipt,staticFiles,seal,currentFresh,clock,policy,versions,base:f.base,original:{packet:f.packet,root:f.root,backupRoot:f.backupRoot},input:()=>({root,backupRoot,staticRoot,packet,retained}),json,sha,grantPrefix:GRANT_PREFIX};
}
