// Offline, bounded evidence verification. Hash pins establish artifact identity,
// not signatures or permission to execute producers. The primary must review the
// manifest and independently establish producer execution before provisioning.
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {parseStrictJson} from './comment-translator-paid-core-v1-gate1-evidence.mjs';
import {exact,validatePolicy,validatePredecessor} from '../../workers/gate1-recovery-controller/core.mjs';
import {canonicalJson,GRANT_PREFIX,POLICY_PREFIX,previewUnknownClosureStateText,safeClosureGrantText} from '../../workers/gate1-recovery-controller/safe-closure.mjs';

const JSON_LIMIT=1048576,TOTAL_LIMIT=1073741824,ENTRY_LIMIT=512;
const SHA=/^[a-f0-9]{64}$/,COMMIT=/^[a-f0-9]{40}$/;
const retainedProofs=new WeakMap(),freshProofs=new WeakMap(),issuedApprovals=new Set();
const legacyProducers=['execution-inputs.mjs','compare-preview.mjs','preview-baseline.mjs','preserve-preview.mjs','control/read-closing-state.mjs','control/version.mjs','control/final-worker-read.mjs','control/confirm-disabled.mjs','control/remove-secrets.mjs','control/verify-pat-revocation.mjs','control/logout-observe.mjs','source-cleanup.mjs','live-session.mjs'];
const sourceProducers=['scripts/comment-translator-paid-core-v1-gate1-preflight-readonly.mjs','scripts/lib/comment-translator-paid-core-v1-gate1-controller-client.mjs','scripts/lib/comment-translator-paid-core-v1-gate1-watchdog-transport.mjs'];
const producers={controller:['gate1-independent-controller-v1','GATE1_CONTROLLER_CLOSED_V1'],preview:['gate1-preview-preservation-v1','GATE1_PREVIEW_CONTENT_V1'],native:['gate1-preview-native-api-v1','GATE1_PREVIEW_NATIVE_API_V1'],'metadata-first':['gate1-independent-metadata-v1','GATE1_INDEPENDENT_METADATA_V1'],'metadata-second':['gate1-independent-metadata-v1','GATE1_INDEPENDENT_METADATA_V1']};
const backupNames=['before-state.json','live-postresume-readback.json','live-synthetic-source-context.json','preservation-query.sql','preview.dump'];
const sha=v=>createHash('sha256').update(v).digest('hex');
const hash=v=>typeof v==='string'&&SHA.test(v),ms=v=>Number.isSafeInteger(v)&&v>=0;
const same=(a,b)=>canonicalJson(a)===canonicalJson(b);
const check=(condition,stage)=>{if(!condition)throw new Error('SAFE_CLOSURE_EVIDENCE_REJECTED: '+stage);};
const freeze=v=>{if(v&&typeof v==='object'){Object.values(v).forEach(freeze);Object.freeze(v);}return v;};
const date=v=>{const t=Date.parse(v);check(typeof v==='string'&&ms(t),'timestamp');return t;};
const policyDigest=p=>sha(POLICY_PREFIX+canonicalJson(validatePolicy(p)));
async function guarded(fn){try{return await fn();}catch(e){if(e.message?.startsWith('SAFE_CLOSURE_EVIDENCE_REJECTED:'))throw e;throw new Error('SAFE_CLOSURE_EVIDENCE_REJECTED: malformed-or-unavailable-evidence');}}

// Refuse links on every path component, including the explicitly supplied roots.
// Reads use one descriptor for stat/hash/JSON, so a rename cannot replace the
// verified bytes with a different parse. No referenced program is ever executed.
async function directory(root){
 check(typeof root==='string'&&path.isAbsolute(root),'root');
 const resolved=path.resolve(root),parsed=path.parse(resolved);let current=parsed.root;
 for(const part of resolved.slice(parsed.root.length).split(path.sep).filter(Boolean)){current=path.join(current,part);const s=await fs.lstat(current);check(s.isDirectory()&&!s.isSymbolicLink(),'root-link');}
 check(path.resolve(await fs.realpath(resolved))===resolved,'root-alias');return resolved;
}
function relative(file){
 check(typeof file==='string'&&file.length>0&&file.length<=1024&&!/[\x00-\x1f:*?"<>|]/.test(file)&&!path.isAbsolute(file),'relative-path');
 const parts=file.replaceAll('\\','/').split('/');check(parts.every(p=>p&&p!=='.'&&p!=='..'&&!/[. ]$/.test(p)&&! /^(con|prn|aux|nul|com[0-9]|lpt[0-9])(?:\.|$)/i.test(p)),'relative-path');return parts.join('/');
}
function descriptor(d){check(d&&typeof d==='object'&&hash(d.sha256)&&ms(d.bytes)&&d.bytes<=TOTAL_LIMIT,'descriptor');}
function unique(entries,key,stage){check(Array.isArray(entries)&&entries.length<=ENTRY_LIMIT,'entry-limit');const keys=entries.map(key);check(new Set(keys).size===keys.length,stage);}
async function readFile(root,d,budget,{json=false,text=false}={}){
 descriptor(d);const rel=relative(d.file);check(!(json||/\.json$/i.test(rel))||d.bytes<=JSON_LIMIT,'json-size');check(!text||d.bytes<=JSON_LIMIT,'text-size');budget.bytes+=d.bytes;check(budget.bytes<=TOTAL_LIMIT,'total-size');
 let current=root;for(const part of rel.split('/')){current=path.join(current,part);const s=await fs.lstat(current);check(!s.isSymbolicLink(),'file-link');}
 const handle=await fs.open(current,'r');try{
  const before=await handle.stat();check(before.isFile()&&before.size===d.bytes,'file-size');const h=createHash('sha256'),chunks=[];let length=0;
  for await(const b of handle.createReadStream({autoClose:false,highWaterMark:65536})){length+=b.length;check(length<=d.bytes,'file-growth');h.update(b);if(json||text)chunks.push(b);}
  const after=await handle.stat();check(length===d.bytes&&h.digest('hex')===d.sha256&&before.ino===after.ino&&before.size===after.size&&before.mtimeMs===after.mtimeMs,'file-digest');
  if(json||text){const decoded=new TextDecoder('utf-8',{fatal:true}).decode(Buffer.concat(chunks));return json?parseStrictJson(decoded):decoded;}
 }finally{await handle.close();}
}
function contentState(s){
 check(s&&s.serverMajor===17&&s.readOnly==='on'&&s.tls===true&&s.historyCount===56&&s.vaultCount===2&&s.storageCount===0&&s.cronActive===0&&s.otherActiveClients===0,'preview-state');
 check(Array.isArray(s.relations)&&s.relations.length===77,'relation-coverage');
 for(const r of s.relations)check(exact(r,['owner','relacl','nspname','relkind','relname','contents','relrowsecurity','relforcerowsecurity'])&&typeof r.owner==='string'&&r.owner.length>0&&(r.relacl===null||Array.isArray(r.relacl)&&r.relacl.every(x=>typeof x==='string'))&&typeof r.nspname==='string'&&r.nspname.length>0&&typeof r.relname==='string'&&r.relname.length>0&&r.relkind==='r'&&hash(r.contents)&&typeof r.relrowsecurity==='boolean'&&typeof r.relforcerowsecurity==='boolean','relation-schema');
 unique(s.relations,r=>JSON.stringify([r.nspname,r.relname]),'duplicate-relation');return s;
}
function revoked(rows){check(Array.isArray(rows)&&rows.length===2,'pat-coverage');unique(rows,r=>r.role,'pat-duplicate');check(rows.every(r=>['controllerPat','configurationToken'].includes(r.role)&&r.httpStatus===401&&r.complete===true&&r.revoked===true),'pat-revocation');}
function metadataLegacy(m){
 check(m.source==='SUPABASE_INDEPENDENT_CONNECTED_MCP_METADATA'&&m.plan==='free'&&m.additionalChargeCeilingUSD===0&&m.projectOperationsPerformed===0&&m.productionSQLPerformed===false,'legacy-metadata');
 check(Array.isArray(m.projects)&&m.projects.length===3,'metadata-coverage');unique(m.projects,p=>p.role,'metadata-duplicate');
 for(const p of m.projects)check(['preview','recovery','production'].includes(p.role)&&p.status===(p.role==='recovery'?'INACTIVE':'ACTIVE_HEALTHY')&&p.targetMatched===true&&p.organizationMatched===true&&p.regionMatched===true&&p.databaseHostMatched===true&&p.postgresMajor===17&&ms(p.at),'legacy-target');
}
function legacyJournal(text,p,manifest,state,http){
 const lines=text.trimEnd().split('\n');check(lines.length>0&&lines.length<=1024,'journal-size');let chain='0'.repeat(64),posts=0,gets=0,receipts=0,started=0,closes=0,pending=false;const mutations=[];
 for(const [sequence,line] of lines.entries()){
  const row=parseStrictJson(line),{sha256,...body}=row;check(exact(row,['sequence','previousSha256','payload','sha256'])&&row.sequence===sequence&&row.previousSha256===chain&&sha(JSON.stringify(body))===sha256,'journal-chain');chain=sha256;const v=row.payload;
  check(v.schemaVersion===1&&v.runId===p.predecessor.runId&&v.sourceCommit===p.predecessor.sourceCommit&&ms(v.at),'journal-binding');
  if(v.event==='CLIENT_STARTED'){started++;check(v.manifestSha256===manifest&&v.hardEndAt===state.hardEndAt,'journal-start');}
  else if(v.event==='HTTP_ATTEMPT'){check(!pending&&hash(v.requestSha256),'journal-attempt');pending=true;if(v.method==='POST'){posts++;mutations.push(v);check(['/v1/arm','/v1/command'].includes(v.route),'journal-post');}else{check(v.method==='GET'&&v.route==='/v1/state','journal-get');gets++;}check(v.postCount===posts&&v.getCount===gets,'journal-counter');}
  else if(v.event==='HTTP_RECEIPT'){check(pending&&Number.isInteger(v.status)&&hash(v.bodySha256),'journal-receipt');pending=false;receipts++;}
  else if(v.event==='CLOSE_ATTEMPT'){closes++;check(v.type==='abort','journal-close');}
  else check(v.event==='PREDECESSOR_ACCEPTED','journal-event');
 }
 check(!pending&&started===1&&closes===1&&posts===3&&receipts===posts+gets&&mutations[0].route==='/v1/arm','journal-complete');
 for(const [i,type] of ['pause-preview','abort'].entries())check(mutations[i+1].route==='/v1/command'&&mutations[i+1].requestSha256===sha(JSON.stringify({runId:state.runId,sequence:i+1,type})),'journal-command');
 check(http.posts===posts&&http.gets===gets+4&&http.total===posts+gets+4&&http.independentClosingGets===2&&http.disabledConfirmationGets===2&&http.abortAttempts===1&&http.unsentStages===9&&http.requestAndReceiptJournalHashChainVerified===true,'journal-reconciliation');
}

export async function verifyRetainedSafeClosure(input){return guarded(async()=>{
 const {packet,root:requestedRoot,backupRoot:requestedBackup}=input,p=structuredClone(packet),root=await directory(requestedRoot),backupRoot=await directory(requestedBackup),budget={bytes:0};
 check(p.schemaVersion===1&&p.format==='GATE1_RETRY2_20260912_V1'&&p.prefix==='.tmp/gate1-live-execution-20260912-retry2','registered-format');validatePredecessor(p.predecessor);validatePolicy(p.policy);
 check([p.manifestSha256,p.bundleSha256,p.approvalSha256,p.namespaceSha256].every(hash)&&p.policy.sourceCommit===p.predecessor.sourceCommit,'packet-binding');
 check(p.receipt.file===p.prefix+'/control/final-receipt.json','receipt-location');const r=await readFile(root,p.receipt,budget,{json:true});
 check(r.schemaVersion===1&&r.executionAllocationClosed===true&&r.status==='TRIAL_ABORTED_ENVIRONMENT_RESTORED_AND_ALLOCATION_CLOSED'&&r.runId===p.predecessor.runId&&r.sourceCommit===p.predecessor.sourceCommit&&r.manifestSha256===p.manifestSha256&&r.bundleSha256===p.bundleSha256&&r.approvalSha256===p.approvalSha256,'closed-receipt');
 check(r.gate==='NO-GO'&&r.formalPreviewStopAccepted===false&&r.formalRecoveryStopAccepted===false&&r.hostedAccepted===false&&r.controllerTerminal==='RESTORED'&&r.controllerReason==='MUTATION_OUTCOME_UNKNOWN'&&r.dispatchAcknowledgementsAccepted===false&&r.strictPredecessorCompatibility===false&&r.safeShutdownBasis==='ROOT_INDEPENDENT_RESTORATION_ACCEPTED_FOR_SAFE_SHUTDOWN','closed-outcomes');
 unique(r.files,d=>relative(d.file).toLowerCase(),'duplicate-file');check(r.files.length+r.protectedBackupFiles?.length<=ENTRY_LIMIT,'entry-limit');const files=new Map(),index=[];
 for(const d of r.files){check(relative(d.file).startsWith(p.prefix+'/')&&d.file!==p.receipt.file,'receipt-reference');const local=d.file.slice(p.prefix.length+1);files.set(local,d);index.push({root:'retained',...d,file:relative(d.file)});await readFile(root,d,budget);}
 const get=async file=>{check(files.has(file),'required-receipt');return readFile(root,files.get(file),{bytes:0},{json:true});};
 for(const file of legacyProducers)check(files.has(file),'registered-producer');
 check(files.get('manifest.json')?.sha256===p.manifestSha256&&files.get('approval.json')?.sha256===p.approvalSha256&&files.get('worker.bundle.mjs')?.sha256===p.bundleSha256,'legacy-input-binding');
 const terminal=await get('control/closing-state-terminal.json'),state=terminal.state;check(terminal.httpStatus===200&&terminal.runIdMatches===true&&state.runId===p.predecessor.runId&&terminal.bodySha256===sha(JSON.stringify(state))&&sha(previewUnknownClosureStateText(state))===p.predecessor.stateSha256&&same(r.lifecycle,state.operations),'terminal-profile');
 // retry2 preserves the original target file and replaces only sourceCommit in
 // execution-inputs.mjs. Bind the resulting policy to both deployment receipts.
 const targetPolicy=validatePolicy(await get('policy.targets.private.json'));
 check(same({...targetPolicy,sourceCommit:p.predecessor.sourceCommit},p.policy),'old-policy');
 const manifest=await get('manifest.json'),approval=await get('approval.json');check(manifest.schemaVersion===1&&manifest.status==='PREPARED_UNAPPROVED'&&manifest.sourceCommit===p.predecessor.sourceCommit&&manifest.controllerBundleSha256===p.bundleSha256&&manifest.files.length===r.manifestInputs&&approval.sourceCommit===p.predecessor.sourceCommit&&approval.authorizedAt===r.approvalAuthorizedAt&&approval.userApproval==='承認します'&&approval.action==='LIVE_HOSTED_ONE_RUN'&&approval.manifestSha256===p.manifestSha256&&approval.liveRunAllowance===1&&approval.newProjectAllowance===0&&approval.newNamespaceAllowance===0&&approval.extraChargeCeilingUSD===0,'old-authorization');
 const source=await get('operator-source-candidate.json');check(source.schemaVersion===1&&source.sourceCommit===p.predecessor.sourceCommit,'source-candidate');unique(source.entries,d=>relative(d.file).toLowerCase(),'duplicate-source');check(source.entries.length===r.sourceVerification.publishedFiles&&source.entries.length+r.files.length+r.protectedBackupFiles.length<=ENTRY_LIMIT,'source-count');
 for(const file of sourceProducers)check(source.entries.some(d=>d.file===file),'registered-source');
 for(const d of source.entries){check(/^(scripts|workers)\//.test(relative(d.file)),'source-location');await readFile(root,d,budget);index.push({root:'source',...d,file:relative(d.file)});}
 check(r.sourceVerification.allFixedInputsUnchanged===true&&r.sourceVerification.oldEvidenceUnchanged===153&&r.sourceVerification.oldInputsUnchanged===101&&r.sourceVerification.productSourceModified===false,'source-preservation');
 const preservation=await get('preservation.json');check(path.resolve(preservation.directory)===backupRoot&&preservation.status==='PASS'&&preservation.scope==='PREVIEW_PRE_PAUSE_SUPPLEMENTAL_BACKUP'&&preservation.productionTouched===false&&preservation.dbWrites===0&&preservation.archiveParsedCompletely===true&&preservation.preservationBeforeAfter===true&&preservation.portableRestoreProven===false&&hash(preservation.bindingSha256),'preservation');
 check(Array.isArray(r.protectedBackupFiles)&&r.protectedBackupFiles.length===5,'backup-coverage');const backups=new Map();
 for(const d of r.protectedBackupFiles){descriptor(d);check(typeof d.file==='string'&&path.isAbsolute(d.file)&&path.dirname(path.resolve(d.file))===backupRoot,'backup-root');const file=path.basename(d.file);check(backupNames.includes(file)&&!backups.has(file),'backup-name');const normalized={file,bytes:d.bytes,sha256:d.sha256};backups.set(file,normalized);index.push({root:'backup',...normalized});await readFile(backupRoot,normalized,budget);}
 const before=contentState(await readFile(backupRoot,backups.get('before-state.json'),{bytes:0},{json:true})),after=contentState(await readFile(backupRoot,backups.get('live-postresume-readback.json'),{bytes:0},{json:true}));
 check(same(before,after)&&preservation.stateSha256===sha(JSON.stringify(before.relations))&&preservation.archiveBytes===backups.get('preview.dump').bytes&&preservation.archiveSha256===backups.get('preview.dump').sha256,'preserved-content');
 const compare=await get('control/preview-compare.json'),report=compare.report;check(compare.exitCode===0&&report.target==='preview'&&report.status==='PASS'&&report.phase==='preservation_compare'&&report.dbWrites===0&&report.nativeExit===0&&report.nativeErrorClass===null&&same(report.differences,[])&&same(report.removedRelations,[])&&report.tableCount===77&&report.stateSha256===preservation.stateSha256&&report.observed.serverMajor===17&&report.observed.tls===true,'full-comparison');
 for(const key of ['historyCount','vaultCount','storageCount','cronActive'])check(report[key]===before[key]&&report.observed[key]===before[key]&&preservation[key]===before[key],'comparison-counts');
 const native=await get('preview-postresume-baseline.json');check(native.scope==='retry2_preview_postresume_readonly_observer'&&native.sourceCommit===p.predecessor.sourceCommit&&native.target==='preview'&&native.status==='PREVIEW_READONLY_BASELINE_PASS'&&native.dbWrites===0&&native.stopEligible===false&&native.sqlFromPublishedTransport===true,'legacy-native');
 check(ms(native.direct.addressCount)&&native.direct.addressCount>=1&&native.direct.addressCount<=8&&['allPinnedNativeTlsPassed','anonSelectDenied','addressSetStable','hostnameMismatchRejected'].every(k=>native.direct[k]===true),'legacy-native-complete');
 for(const [id,status,kind] of [['auth',200,'AUTH_HEALTH'],['table',401,'EXPECTED_TABLE_PERMISSION_DENIED'],['invalidKey',401,'GATEWAY_KEY_REJECTED']])check(native.http[id].status===status&&native.http[id].class===kind&&native.http[id].arrayRows===null,'legacy-api');
 metadataLegacy(await get('control/independent-closing-metadata.json'));
 const baseline=await get('existing-worker-baseline.json'),version=await get('control/version-close.json'),closed=await get('control/final-worker-closed.json'),disabled=await get('control/disabled-confirmed.json');
 // Removing runtime secrets creates another version. The final registered
 // reader independently checks that version's namespace against the baseline;
 // requiring equality with the earlier three-secret disabled version is wrong.
 const deployment=await get('deployment-receipt.json');check(baseline.policySha256===sha(JSON.stringify({...targetPolicy,sourceCommit:p.predecessor.sourceCommit}))&&baseline.sourceCommit===p.predecessor.sourceCommit&&deployment.sourceCommit===p.predecessor.sourceCommit&&deployment.bundleSha256===p.bundleSha256&&deployment.policySha256===baseline.policySha256&&deployment.mode==='live','deployed-policy');
 check(baseline.namespaceSha256===p.namespaceSha256&&version.namespaceSha256===p.namespaceSha256&&version.mode==='disabled'&&version.namespacePreserved===true&&version.activeVersionConfirmed===true&&version.trafficPercentage===100&&typeof version.version==='string'&&version.version.length>0&&typeof closed.version==='string'&&closed.version.length>0&&version.at<closed.at&&closed.version===r.closure.activeVersion,'closed-identity');
 check(closed.status==='FINAL_WORKER_DISABLED_AND_CREDENTIALS_REMOVED'&&closed.activeVersionConfirmed===true&&closed.trafficPercentage===100&&closed.mode==='disabled'&&closed.httpStatus===503&&closed.namespacePreserved===true&&closed.remainingSecrets===1&&closed.policyRetained===true&&disabled.status==='DISABLED_CONFIRMED'&&disabled.httpStatus===503&&disabled.error==='DISABLED','disabled-controller');
 const secret=await get('control/secret-closure.json'),pat=await get('control/pat-revoked-verified.json'),oauth=await get('control/oauth-logout-result.json'),revoke=await get('control/oauth-revoke-response.json');
 check(secret.status==='PAT_AND_OPERATOR_SECRETS_REMOVED'&&secret.removed===2&&same(secret.remainingNames,['CONTROLLER_POLICY_JSON'])&&secret.namespaceDeletionAttempted===false&&pat.status==='PAT_REVOCATION_VERIFIED'&&pat.revoked===2,'secret-closure');revoked(pat.rows);
 check(revoke.statusCode===200&&oauth.logoutExitCode===0&&oauth.successMessageObserved===true&&oauth.whoamiExitCode===1&&oauth.loggedIn===false&&oauth.revokeHttpStatus===200,'oauth-closure');
 const processes=await get('control/owned-processes-closed.json'),finalProcesses=await get('control/final-process-observation.json'),listeners=await get('control/local-auth-listeners-closed.json'),resources=await get('control/final-owned-resources-observation.json'),cleanup=await get('source-cleanup.json');
 check(processes.sourceUsers===0&&processes.nativeMutationInFlight===false&&processes.remainingOwnedProcesses===0&&processes.controllerRestoredBeforeTermination===true&&processes.formalRecoveryStopAccepted===false&&finalProcesses.remainingOwnedProcesses===0&&listeners.remainingListeners===0&&resources.independentReadback===true&&cleanup.removedOnlyOwned===true,'owned-closure');
 for(const k of ['ownedContainersRemaining','ownedVolumesRemaining','sourceUserCountBeforeCleanup'])check(resources[k]===0&&cleanup[k]===0,'owned-resource-count');
 for(const k of ['configurationWrites','syntheticUsers','syntheticTransfers','productionSqlOrConfig','newProjects','paidPlanChanges','additionalTrial'])check(r.operations[k]===0,'forbidden-operations');
 const closure=await get('control/safe-closure.json');check(closure.status==='ROOT_INDEPENDENT_RESTORATION_ACCEPTED_FOR_SAFE_SHUTDOWN'&&closure.controllerPhase==='RESTORED'&&same(closure.operationOutcomes,state.operations)&&closure.controllerClassifier==='NOT_SAFE_TO_DISABLE'&&closure.predecessorCompatibilityAccepted===false&&closure.formalPreviewStopAccepted===false&&closure.formalRecoveryStopAccepted===false&&closure.hostedAccepted===false&&closure.gate==='NO-GO'&&closure.sourceUsers===0&&closure.syntheticTransfers===0&&closure.configurationWrites===0,'independent-closure');
 check(r.rootDecision.file===p.prefix+'/control/safe-closure.json'&&r.rootDecision.sha256===files.get('control/safe-closure.json').sha256&&r.rootDecision.bytes===files.get('control/safe-closure.json').bytes,'root-receipt');
 const journal=files.get('runtime/client-'+p.predecessor.runId+'.jsonl');check(journal,'journal-required');legacyJournal(await readFile(root,journal,{bytes:0},{text:true}),p,p.manifestSha256,state,r.controllerHttp);
 check(closure.controllerPosts===3&&closure.controllerGets===r.controllerHttp.gets-2&&closure.controllerApplicationRequests===r.controllerHttp.total-2&&closure.reservedDisabledGets===2&&disabled.applicationRequests===r.controllerHttp.total-1&&closed.controllerApplicationRequests===r.controllerHttp.total,'closure-http-counts');
 const closedAt=date(r.at);check(closedAt>=terminal.at&&closedAt>=closed.at&&closedAt>=oauth.at&&closedAt>=finalProcesses.at&&closedAt>=listeners.at&&closedAt>=resources.at&&closedAt>approval.authorizedAt&&ms(approval.authorizedAt),'closed-time');
 const evidenceSha256=sha(canonicalJson({schemaVersion:1,format:p.format,receipt:p.receipt,predecessor:p.predecessor,manifestSha256:p.manifestSha256,bundleSha256:p.bundleSha256,approvalSha256:p.approvalSha256,namespaceSha256:p.namespaceSha256,policySha256:policyDigest(p.policy),files:index}));
 const proof=freeze({schemaVersion:1,kind:'GATE1_RETAINED_SAFE_CLOSURE_VERIFIED_V1',predecessor:p.predecessor,evidenceSha256,receiptSha256:p.receipt.sha256,files:r.files.length,protectedFiles:5,publishedFiles:source.entries.length});
 retainedProofs.set(proof,freeze({packet:p,before,closedAt,oldAuthorizedAt:approval.authorizedAt,closedVersionSha256:sha(closed.version),bindingSha256:preservation.bindingSha256}));return proof;
});}

function metadataFresh(m,policy){
 check(m.projectOperations===0&&m.productionSqlOrConfig===0&&m.plan==='free'&&Array.isArray(m.projects)&&m.projects.length===3,'fresh-metadata');unique(m.projects,p=>p.role,'metadata-duplicate');
 for(const p of m.projects){check(['preview','recovery','production'].includes(p.role)&&p.httpStatus===200&&p.complete===true&&p.id===policy[p.role+'Ref']&&p.organization_id===policy.organizationId&&p.region==='ap-northeast-1'&&p.status===(p.role==='recovery'?'INACTIVE':'ACTIVE_HEALTHY')&&p.database.host==='db.'+p.id+'.supabase.co'&&/^(17)(\.|$)/.test(p.database.postgres_engine),'fresh-target');check(ms(p.startedAt)&&ms(p.completedAt)&&p.startedAt>=m.startedAt&&p.completedAt>=p.startedAt&&p.completedAt<=m.completedAt,'metadata-time');}
}
export async function verifySafeClosureEvidence(input){return guarded(async()=>{
 const retained=input.retained,old=retainedProofs.get(retained);check(old,'retained-proof-brand');const now=input.now??Date.now,start=now();check(ms(start),'clock');
 const requestedRoot=input.root,requestedProducerRoot=input.producerRoot,pins=structuredClone({manifest:input.manifest,approval:input.approval,index:input.index}),root=await directory(requestedRoot),producerRoot=await directory(requestedProducerRoot),budget={bytes:0};
 const manifest=await readFile(root,pins.manifest,budget,{json:true}),approval=await readFile(root,pins.approval,budget,{json:true}),index=await readFile(root,pins.index,budget,{json:true});
 check(pins.manifest.sha256===sha(canonicalJson(manifest))&&pins.approval.sha256===sha(canonicalJson(approval))&&pins.index.sha256===sha(canonicalJson(index)),'canonical-inputs');
 check(exact(manifest,['schemaVersion','kind','sourceCommit','runId','hardEndAt','policy','namespaceSha256','retainedEvidenceSha256','grantRule','bundle','producers'])&&manifest.schemaVersion===1&&manifest.kind==='GATE1_SAFE_CLOSURE_EXECUTION_MANIFEST_V1'&&typeof manifest.sourceCommit==='string'&&COMMIT.test(manifest.sourceCommit)&&hash(manifest.runId)&&manifest.runId!==old.packet.predecessor.runId&&manifest.policy.sourceCommit===manifest.sourceCommit&&ms(manifest.hardEndAt)&&manifest.hardEndAt>start&&manifest.hardEndAt-start<=1200000&&manifest.namespaceSha256===old.packet.namespaceSha256&&manifest.retainedEvidenceSha256===retained.evidenceSha256&&manifest.grantRule==='PREVIEW_ONLY_UNKNOWN_SAFE_CLOSURE_V1','fresh-manifest');
 validatePolicy(manifest.policy);check(Object.keys(old.packet.policy).every(k=>k==='sourceCommit'||old.packet.policy[k]===manifest.policy[k]),'fresh-policy');const policySha256=policyDigest(manifest.policy);
 unique(manifest.producers,p=>p.id,'producer-duplicate');unique(manifest.producers,p=>relative(p.file).toLowerCase(),'producer-path');check(manifest.producers.length===4&&manifest.producers.every(p=>Object.values(producers).some(([id])=>id===p.id)),'registered-producers');
 await readFile(producerRoot,manifest.bundle,budget);for(const p of manifest.producers)await readFile(producerRoot,p,budget);
 const successor={runId:manifest.runId,sourceCommit:manifest.sourceCommit,hardEndAt:manifest.hardEndAt,manifestSha256:pins.manifest.sha256};
 check(exact(approval,['schemaVersion','kind','approvalId','authorizedAt','expiresAt','manifestSha256','predecessor','successor','policySha256','namespaceSha256','oldReceiptSha256','authorization','grantAllowance','additionalChargeCeilingUSD'])&&approval.schemaVersion===1&&approval.kind==='GATE1_SAFE_CLOSURE_APPROVAL_V1'&&hash(approval.approvalId)&&approval.authorization==='ONE_NEW_PREVIEW_ONLY_UNKNOWN_SAFE_CLOSURE_RUN'&&approval.grantAllowance===1&&approval.additionalChargeCeilingUSD===0&&approval.manifestSha256===pins.manifest.sha256&&same(approval.predecessor,old.packet.predecessor)&&same(approval.successor,successor)&&approval.policySha256===policySha256&&approval.namespaceSha256===old.packet.namespaceSha256&&approval.oldReceiptSha256===old.packet.receipt.sha256&&pins.approval.sha256!==old.packet.approvalSha256,'new-authorization');
 check(ms(approval.authorizedAt)&&ms(approval.expiresAt)&&approval.authorizedAt>old.closedAt&&approval.authorizedAt>old.oldAuthorizedAt&&approval.authorizedAt<=start&&approval.expiresAt>start&&successor.hardEndAt<=approval.expiresAt,'authorization-time');
 check(exact(index,['schemaVersion','kind','manifestSha256','approvalSha256','artifacts'])&&index.schemaVersion===1&&index.kind==='GATE1_SAFE_CLOSURE_FRESH_V1'&&index.manifestSha256===pins.manifest.sha256&&index.approvalSha256===pins.approval.sha256,'fresh-index');unique(index.artifacts,a=>a.id,'artifact-duplicate');unique(index.artifacts,a=>relative(a.file).toLowerCase(),'artifact-path');check(index.artifacts.length===5&&index.artifacts.every(a=>Object.hasOwn(producers,a.id)),'artifact-coverage');
 const records=new Map();let oldest=start;
 for(const d of index.artifacts){const v=await readFile(root,d,budget,{json:true}),[id,kind]=producers[d.id],producer=manifest.producers.find(p=>p.id===id);check(v.schemaVersion===1&&v.kind===kind&&v.producer===id&&d.producer===id&&v.producerSha256===producer.sha256&&d.producerSha256===producer.sha256&&v.sourceCommit===manifest.sourceCommit,'receipt-producer');check(ms(v.startedAt)&&ms(v.completedAt)&&v.startedAt>=approval.authorizedAt&&v.completedAt>=v.startedAt&&v.completedAt<=start&&start-v.startedAt<300000,'fresh-time');oldest=Math.min(oldest,v.startedAt);if(d.id!=='controller')check(v.policySha256===policySha256,'receipt-policy');records.set(d.id,v);}
 const c=records.get('controller');check(c.namespaceSha256===old.packet.namespaceSha256&&c.closedVersionSha256===old.closedVersionSha256&&same(c.predecessor,old.packet.predecessor)&&c.priorPolicySha256===policyDigest(old.packet.policy)&&c.preservationBasis==='SAME_DISABLED_NAMESPACE_AND_VERSION'&&c.disabled.httpStatus===503&&c.disabled.complete===true&&c.disabled.error==='DISABLED'&&same(c.remainingSecretNames,['CONTROLLER_POLICY_JSON'])&&c.oldCredentialsReused===false&&c.oauthLoggedIn===false&&exact(c.owned,['containers','volumes','processes','listeners'])&&Object.values(c.owned).every(v=>v===0),'fresh-controller');revoked(c.patRevocations);
 const preview=records.get('preview');check(preview.target==='preview'&&preview.bindingSha256===old.bindingSha256&&preview.dbWrites===0&&preview.nativeExit===0&&preview.nativeErrorClass===null&&same(contentState(preview.state),old.before),'fresh-preview');
 const native=records.get('native');check(native.target==='preview'&&native.bindingSha256===old.bindingSha256&&native.dbWrites===0&&Array.isArray(native.addresses)&&native.addresses.length>=1&&native.addresses.length<=8&&native.addressSetStable===true,'fresh-native');unique(native.addresses,a=>a.addressSha256,'duplicate-address');for(const a of native.addresses)check(hash(a.addressSha256)&&a.nativeExit===0&&a.stderrBytes===0&&a.serverMajor===17&&a.readOnly==='on'&&a.tls===true&&a.anonSelect===false,'native-result');check(Number.isInteger(native.hostnameMismatch.exitCode)&&native.hostnameMismatch.exitCode!==0&&native.hostnameMismatch.stdoutBytes===0&&native.hostnameMismatch.errorClass==='CERTIFICATE_HOST_MISMATCH','hostname-rejection');
 for(const [id,status,classification] of [['auth',200,'AUTH_HEALTH'],['table',401,'EXPECTED_TABLE_PERMISSION_DENIED'],['invalidKey',401,'GATEWAY_KEY_REJECTED']]){const h=native.http[id];check(h.status===status&&h.complete===true&&h.classification===classification&&ms(h.bodyBytes)&&h.bodyBytes>0&&h.bodyBytes<=8192&&ms(h.elapsedMs)&&h.elapsedMs<=3000,'fresh-api');}
 const first=records.get('metadata-first'),second=records.get('metadata-second');metadataFresh(first,manifest.policy);metadataFresh(second,manifest.policy);check(second.startedAt-first.completedAt>=10000&&second.startedAt-first.completedAt<=30000,'metadata-spacing');
 const end=now();check(ms(end)&&end>=start&&end-oldest<300000&&end<approval.expiresAt&&end<successor.hardEndAt,'verification-clock');
 const evidenceSha256=sha(canonicalJson({schemaVersion:1,retainedEvidenceSha256:retained.evidenceSha256,manifest:pins.manifest,approval:pins.approval,index:pins.index}));
 const proof=freeze({schemaVersion:1,kind:'GATE1_SAFE_CLOSURE_EVIDENCE_VERIFIED_V1',evidenceSha256,verifiedAt:end});freshProofs.set(proof,freeze({old,approval,successor,approvalSha256:pins.approval.sha256,policySha256,oldest,verifiedAt:end}));return proof;
});}

export function issueSafeClosureGrant({proof,grantId,now=Date.now}){
 const verified=freshProofs.get(proof);check(verified,'fresh-proof-brand');const issuedAt=now();check(hash(grantId)&&ms(issuedAt)&&issuedAt>=verified.verifiedAt&&!issuedApprovals.has(verified.approvalSha256),'grant-issuance');
 const expiresAt=Math.min(verified.approval.expiresAt,issuedAt+300000,verified.oldest+300000);check(expiresAt>issuedAt&&verified.successor.hardEndAt>issuedAt&&verified.successor.hardEndAt-issuedAt<=1200000,'grant-expiration');
 const text=safeClosureGrantText({schemaVersion:1,kind:'PREVIEW_ONLY_UNKNOWN_SAFE_CLOSURE_V1',grantId,predecessor:verified.old.packet.predecessor,successor:verified.successor,policySha256:verified.policySha256,approvalSha256:verified.approvalSha256,closureEvidenceSha256:proof.evidenceSha256,issuedAt,expiresAt});
 issuedApprovals.add(verified.approvalSha256);return Object.freeze({text,sha256:sha(GRANT_PREFIX+text)});
}
