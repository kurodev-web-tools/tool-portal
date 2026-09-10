import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash, randomBytes } from 'node:crypto';
import { spawnSync } from 'node:child_process';
const hash=v=>createHash('sha256').update(v).digest('hex');
const reject=()=>{throw Error('ATOMIC_ATTEMPT_LEDGER_REJECTED');};
const attempted=()=>{throw Error('ATOMIC_TARGET_ALREADY_ATTEMPTED');};

// Append-only resource claims: existence (even incomplete/corrupt) forbids a
// second attempt. No success, failure or normal cleanup path deletes a claim.
export function createAtomicAttemptLedger(directory) {
  const root=path.resolve(directory);
  if(!fs.existsSync(root))fs.mkdirSync(root);
  const check=()=>{
    for(let current=root;;current=path.dirname(current)){
      const stat=fs.lstatSync(current);if(!stat.isDirectory()||stat.isSymbolicLink())reject();
      if(current===path.dirname(current))break;
    }
  };
  const resources=input=>{
    if(!input||Object.keys(input).sort().join(',')!=='containerId,imageId,owner,volumes'||!/^[a-f0-9]{64}$/.test(input.containerId)||
       !/^ct-atomic-[a-f0-9]{24}$/.test(input.owner)||!/^sha256:[a-f0-9]{64}$/.test(input.imageId)||
       !Array.isArray(input.volumes)||input.volumes.length>16||input.volumes.some(v=>typeof v!=='string'||!/^[a-zA-Z0-9][a-zA-Z0-9_.-]{0,254}$/.test(v))||
       new Set(input.volumes).size!==input.volumes.length)reject();
    return ['container:'+input.containerId,...[...input.volumes].sort().map(v=>'volume:'+v)].map(hash);
  };
  const assertFresh=input=>{
    check();const ids=resources(input);
    for(const id of ids){try{fs.lstatSync(path.join(root,id+'.json'));attempted();}catch(error){if(error.code!=='ENOENT')throw error;}}
    return ids;
  };
  return {assertFresh(input){assertFresh(input);return true;},claim(input){
    const ids=assertFresh(input),claimId=randomBytes(32).toString('hex');
    for(const id of ids){let fd;try{
      check();fd=fs.openSync(path.join(root,id+'.json'),'wx',0o600);
      fs.writeFileSync(fd,JSON.stringify({schemaVersion:1,status:'ATTEMPTED_DO_NOT_REUSE',failurePolicy:'discard-target-v1',claimId,
        resourceSha256:id,ownerSha256:hash(input.owner),imageId:input.imageId,createdAt:new Date().toISOString()})+'\n');
      fs.fsyncSync(fd);
    }catch(error){if(error.code==='EEXIST')attempted();reject();}finally{if(fd!==undefined)fs.closeSync(fd);}}
    return true;
  }};
}

// Git common metadata makes the ledger shared by this project's worktrees.
// It stores no SQL, credentials or backup contents and is never auto-pruned.
export function nativeAtomicAttemptLedger() {
  const repository=fileURLToPath(new URL('../..',import.meta.url));
  const r=spawnSync('git',['--no-optional-locks','rev-parse','--path-format=absolute','--git-common-dir'],{
    cwd:repository,encoding:'utf8',shell:false,windowsHide:true,timeout:5000,maxBuffer:4096,
    env:{PATH:process.env.PATH,SystemRoot:process.env.SystemRoot,WINDIR:process.env.SystemRoot},
  });
  if(r.error||r.signal||r.status!==0||r.stderr?.length||typeof r.stdout!=='string')reject();
  const common=r.stdout.trim();if(!path.isAbsolute(common)||!fs.lstatSync(common).isDirectory()||fs.lstatSync(common).isSymbolicLink())reject();
  return createAtomicAttemptLedger(path.join(common,'comment-translator-gate1-attempts-v1'));
}
