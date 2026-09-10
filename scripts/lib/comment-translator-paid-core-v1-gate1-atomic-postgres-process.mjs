import { spawn, spawnSync } from 'node:child_process';
import { buildAtomicRestore, ATOMIC_FINGERPRINT_SETUP_SQL } from './comment-translator-paid-core-v1-gate1-atomic-restore.mjs';
import { ATOMIC_LOCAL_DOCKER_ARGS } from './comment-translator-paid-core-v1-gate1-atomic-local-process.mjs';
import { readRetainedAtomicBackup } from './comment-translator-paid-core-v1-gate1-atomic-retained.mjs';
import { parseStrictJson } from './comment-translator-paid-core-v1-gate1-evidence.mjs';
import { nativeAtomicAttemptLedger } from './comment-translator-paid-core-v1-gate1-atomic-attempt-ledger.mjs';
const reject = () => { throw Error('ATOMIC_POSTGRES_TARGET_REJECTED'); };
export function validateAtomicPostgresTarget(t, v) {
  if (!t || Object.keys(t).sort().join(',') !== 'baselineSha256,containerId,imageId,owner' ||
      !/^[a-f0-9]{64}$/.test(t.containerId) || !/^ct-atomic-[a-f0-9]{24}$/.test(t.owner) ||
      !/^sha256:[a-f0-9]{64}$/.test(t.imageId) || !/^[a-f0-9]{64}$/.test(t.baselineSha256) ||
      v?.Id !== t.containerId || v.Image !== t.imageId || v.Name !== '/'+t.owner+'-db' || v.State?.Running !== true ||
      v.Config?.Labels?.['com.comment_translator.atomic'] !== t.owner || v.HostConfig?.Privileged !== false ||
      v.HostConfig.NetworkMode !== 'none' || Object.keys(v.HostConfig.PortBindings ?? {}).length ||
      (v.HostConfig.Binds ?? []).length || (v.HostConfig.VolumesFrom ?? []).length || (v.HostConfig.CapAdd ?? []).length ||
      !v.NetworkSettings?.Networks || Object.keys(v.NetworkSettings.Networks).some(n=>n!=='none') ||
      !Array.isArray(v.Mounts) || v.Mounts.some(m => !['volume','tmpfs'].includes(m.Type))) reject();
  return true;
}

export const ATOMIC_POSTGRES_BASELINE_SQL = `BEGIN; SET LOCAL row_security=off; SET LOCAL search_path=pg_catalog,public;
${ATOMIC_FINGERPRINT_SETUP_SQL}
SELECT json_build_object('role',current_user,'database',current_database(),'superuser',(SELECT rolsuper FROM pg_roles WHERE rolname=current_user),
 'serverMajor',current_setting('server_version_num')::integer / 10000,'authUsers',(SELECT count(*) FROM auth.users),
 'baselineSha256',encode(sha256(convert_to(pg_temp.ct_atomic_fingerprint(false)::text,'UTF8')),'hex')); ROLLBACK;`;

// Internal orchestration seam for synthetic contracts; it is not publication
// evidence. The public retained-data entry below always owns provenance reads.
export function createAtomicPostgresAdapter({ inspect, claim, execute, stop, now = () => performance.now() }) {
  return { async run(input, target, { signal, timeoutMs = 600000 } = {}) {
    let claimed=false,phase='input';
    try {
      if (!Number.isSafeInteger(timeoutMs)||timeoutMs<100||timeoutMs>600000||signal!==undefined&&!(signal instanceof AbortSignal)) throw Error();
      target=structuredClone(target);validateAtomicPostgresTarget(target,inspect(target));
      const started=now(),candidate=buildAtomicRestore(input,{failurePolicy:'discard-target-v1'});
      const remaining=()=>{const elapsed=now()-started;if(!Number.isFinite(elapsed)||elapsed<0||elapsed>=timeoutMs||signal?.aborted)throw Error();return Math.floor(timeoutMs-elapsed);};
      const pg=async sql=>{validateAtomicPostgresTarget(target,inspect(target));const result=await execute(sql,target,{signal,timeoutMs:remaining()});remaining();return result;};
      remaining();phase='claim';if(claim(target,inspect(target))!==true)throw Error();claimed=true;
      phase='baseline';const baseline=parseStrictJson(await pg(ATOMIC_POSTGRES_BASELINE_SQL));
      if (!baseline||Object.keys(baseline).sort().join(',')!=='authUsers,baselineSha256,database,role,serverMajor,superuser'||
          baseline.role!=='postgres'||baseline.database!=='postgres'||baseline.superuser!==false||baseline.serverMajor!==17||
          baseline.authUsers!==0||baseline.baselineSha256!==target.baselineSha256)throw Error();
      phase='restore';const output=await pg(candidate.sql),precommit=parseStrictJson(output.trim().split(/\r?\n/).at(-1));
      if(!precommit||Object.keys(precommit).sort().join(',')!=='fingerprint,kind'||precommit.kind!=='atomic-precommit-v1')throw Error();
      phase='readback';const after=parseStrictJson(await pg(`BEGIN; SET LOCAL row_security=off; SET LOCAL search_path=pg_catalog,public;
${ATOMIC_FINGERPRINT_SETUP_SQL}
SELECT pg_temp.ct_atomic_fingerprint(false); ROLLBACK;`));
      if(JSON.stringify(after)!==JSON.stringify(precommit.fingerprint))throw Error();
      remaining();validateAtomicPostgresTarget(target,inspect(target));
      return {schemaVersion:1,status:'ATOMIC_POSTGRES_RESTORE_OBSERVED',scope:'LOCAL_REHEARSAL_ONLY',role:'postgres',
        failurePolicy:'discard-target-v1',wholeStateRollbackGuaranteed:false,targetReusable:false,targetDisposition:'RESTORED_QUARANTINED',
        artifacts:candidate.artifacts,preResetSourceStateMatched:true,resetDeltaMatched:true,independentCommittedReadbackMatched:true,stageAuthority:false,gate:'NO-GO'};
    } catch(error) {
      let stopConfirmed=false;
      // A losing claimant must never stop another in-flight writer.
      if(claimed)try{stopConfirmed=await stop(target)===true;}catch{ /* unknown stop never accepts */ }
      const reason=error?.message==='ATOMIC_TARGET_ALREADY_ATTEMPTED'?'TARGET_ALREADY_ATTEMPTED':
        ['SEQUENCE_OWNERSHIP_REQUIRED','PERMISSION_DENIED','ATOMIC_GUARD_REJECTED','NATIVE_FAILURE'].includes(error?.reason)?error.reason:'VALIDATION_REJECTED';
      throw Object.assign(Error('ATOMIC_POSTGRES_REJECTED'),{stopConfirmed,phase,reason,disposalRequired:claimed,attemptOwned:claimed,
        failurePolicy:'discard-target-v1',wholeStateRollbackGuaranteed:false,targetReusable:false});
    }
  } };
}

function control(args) {
  const r=spawnSync('docker',[...ATOMIC_LOCAL_DOCKER_ARGS,...args],{encoding:'utf8',windowsHide:true,shell:false,timeout:10000,maxBuffer:1024*1024});
  if(r.error||r.signal||r.status!==0||r.stderr?.length)reject();return r.stdout;
}
function inspect(target) {
  if(!/^[a-f0-9]{64}$/.test(target?.containerId))reject();
  const rows=parseStrictJson(control(['inspect',target.containerId]));if(!Array.isArray(rows)||rows.length!==1)reject();return rows[0];
}
function stop(target) {
  // Always address the verified immutable ID, never a reusable container name.
  const v=inspect(target);if(v.Id!==target.containerId||v.Config?.Labels?.['com.comment_translator.atomic']!==target.owner||v.Image!==target.imageId)return false;
  control(['stop','--time','1',target.containerId]);return inspect(target).State?.Running===false;
}
function ledgerInput(target,view) {
  validateAtomicPostgresTarget(target,view);
  return {containerId:target.containerId,owner:target.owner,imageId:target.imageId,volumes:view.Mounts.filter(m=>m.Type==='volume').map(m=>m.Name)};
}
function claim(target,view) { return nativeAtomicAttemptLedger().claim(ledgerInput(target,view)); }
function execute(sql,target,{signal,timeoutMs}) {
  return new Promise((resolve,reject)=>{
    let done=false,size=0,timer,child,reason='NATIVE_FAILURE';const chunks=[];
    const abort=()=>finish(false);
    const finish=(ok)=>{if(done)return;done=true;clearTimeout(timer);signal?.removeEventListener('abort',abort);
      if(ok)resolve(Buffer.concat(chunks).toString('utf8'));else{chunks.length=0;child?.stdin.destroy();child?.stdout.destroy();child?.stderr.destroy();try{child?.kill();}catch{}child?.unref();reject(Object.assign(Error('ATOMIC_NATIVE_REJECTED'),{reason}));}};
    if(signal?.aborted){finish(false);return;}
    try{child=spawn('docker',[...ATOMIC_LOCAL_DOCKER_ARGS,'exec','-i',target.containerId,'psql','-X','-qAt','--no-password','-U','postgres','-d','postgres',
      '-v','ON_ERROR_STOP=1','-v','VERBOSITY=default','--file=-'],{shell:false,windowsHide:true,stdio:['pipe','pipe','pipe']});}catch{finish(false);return;}
    child.on('error',abort);for(const stream of [child.stdin,child.stdout,child.stderr])stream.on('error',abort);
    child.stdout.on('data',b=>{if(done)return;size+=b.length;if(size>65536)abort();else chunks.push(b);});
    child.stderr.on('data',b=>{if(b.length){const text=b.toString('utf8');reason=/must be owner of sequence/.test(text)?'SEQUENCE_OWNERSHIP_REQUIRED':/permission denied/.test(text)?'PERMISSION_DENIED':/ATOMIC_[A-Z_]+/.test(text)?'ATOMIC_GUARD_REJECTED':'NATIVE_FAILURE';abort();}});child.on('close',(code,sig)=>finish(code===0&&!sig));
    timer=setTimeout(abort,timeoutMs);signal?.addEventListener('abort',abort,{once:true});if(signal?.aborted){abort();return;}child.stdin.end(sql);
  });
}

// Read-only baseline inspection for an already owned isolated fixture. It is
// not a way to accept a managed baseline or to skip its independent approval.
export async function inspectAtomicPostgresBaseline(target) {
  const view=inspect(target);validateAtomicPostgresTarget(target,view);
  nativeAtomicAttemptLedger().assertFresh(ledgerInput(target,view));
  try{return parseStrictJson(await execute(ATOMIC_POSTGRES_BASELINE_SQL,target,{timeoutMs:30000}));}
  catch{try{stop(target);}catch{}throw Error('ATOMIC_POSTGRES_REJECTED');}
}

// Internal native fixture seam; callers do not obtain source/backup authority.
export function createAtomicPostgresNativeTransport() { return {inspect,claim,execute,stop}; }

export async function runRetainedAtomicPostgres({ backup, target }, options) {
  const started=performance.now(),timeoutMs=options?.timeoutMs??600000,signal=options?.signal;
  if(!Number.isSafeInteger(timeoutMs)||timeoutMs<100||timeoutMs>600000||signal!==undefined&&!(signal instanceof AbortSignal))throw Error('ATOMIC_POSTGRES_REJECTED');
  const remaining=()=>{const elapsed=performance.now()-started;if(!Number.isFinite(elapsed)||elapsed<0||elapsed>=timeoutMs||signal?.aborted)throw Error('ATOMIC_POSTGRES_REJECTED');return Math.floor(timeoutMs-elapsed);};
  remaining();
  backup=structuredClone(backup);target=structuredClone(target);
  const prepared=readRetainedAtomicBackup(backup);
  const result=await createAtomicPostgresAdapter(createAtomicPostgresNativeTransport()).run(prepared.input,target,{signal,timeoutMs:remaining()});
  // Recheck original protected records/files and current loaded source after
  // native close. A later mismatch never promotes the committed observation.
  try {
    const after=readRetainedAtomicBackup(backup);
    if(JSON.stringify(after.provenance)!==JSON.stringify(prepared.provenance)||after.manifestSha256!==prepared.manifestSha256)throw Error();
    remaining();
  }catch{
    let stopConfirmed=false;try{stopConfirmed=stop(target);}catch{}
    throw Object.assign(Error('ATOMIC_POSTGRES_REJECTED'),{phase:'provenance-postcheck',stopConfirmed,disposalRequired:true,
      failurePolicy:'discard-target-v1',wholeStateRollbackGuaranteed:false,targetReusable:false});
  }
  return {...result,provenance:prepared.provenance,processReceiptSha256:prepared.processReceiptSha256,manifestSha256:prepared.manifestSha256};
}
