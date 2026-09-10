import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createBackupArtifactStore } from './comment-translator-paid-core-v1-gate1-backup-artifacts.mjs';
import { validBackupDumpTransport } from './comment-translator-paid-core-v1-gate1-backup-dump-transport.mjs';
import { validateBackupSourceState } from './comment-translator-paid-core-v1-gate1-backup-state.mjs';
import { verifyAtomicSourceBinding } from './comment-translator-paid-core-v1-gate1-atomic-provenance.mjs';
import { buildAtomicRestore } from './comment-translator-paid-core-v1-gate1-atomic-restore.mjs';
const names = ['roles.sql','schema.sql','auth_storage_changes.sql','data.sql','history_schema.sql','history_data.sql'];
const hash = x => createHash('sha256').update(x).digest('hex');
const isHash = x => typeof x === 'string' && /^[a-f0-9]{64}$/.test(x);
const exact = (v, keys) => v && typeof v === 'object' && !Array.isArray(v) && Object.keys(v).sort().join(',') === keys.split(',').sort().join(',');
const same = (a,b) => JSON.stringify(a) === JSON.stringify(b);
const require = v => { if (!v) throw Error('ATOMIC_RETAINED_REJECTED'); };
const time = s => { require(typeof s === 'string' && /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,6})?(?:Z|[+-]\d\d:\d\d)$/.test(s)); const n=Date.parse(s);require(Number.isFinite(n));return n; };

// Read-only internal seam. Native public entry provides no injected PASS labels.
export function createRetainedAtomicReader({ store, verifySource, readFile }) {
  return { read(request) {
    let phase='input';
    try {
      require(exact(request,'executorCommit,captureCommit,sourceBindingSha256,processReceiptSha256,processDirectory,acquisitionDirectory,artifactDirectory'));
      const q=structuredClone(request);
      require([q.executorCommit,q.captureCommit].every(c=>typeof c==='string'&&/^[a-f0-9]{40}$/.test(c)) &&
        isHash(q.sourceBindingSha256)&&isHash(q.processReceiptSha256));
      const directories=[q.processDirectory,q.acquisitionDirectory,q.artifactDirectory];
      require(directories.every(d=>typeof d==='string'&&/^[A-Za-z]:[\\/]/.test(d)));
      const roots=directories.map(d=>path.win32.resolve(d).toLowerCase());
      require(roots.every((a,i)=>roots.every((b,j)=>i===j||a!==b&&!a.startsWith(b+'\\')&&!b.startsWith(a+'\\'))));
      phase='process-record';const saved=store.inspectRecord({directory:q.processDirectory,name:'backup-process.json',expectedSha256:q.processReceiptSha256});
      require(saved.status==='PERSISTED_RECORD_VERIFIED'&&saved.sha256===q.processReceiptSha256);
      const p=structuredClone(saved.record);
      require(exact(p,'schemaVersion,kind,acquisitionAuthority,sourceCommit,runId,sourceBindingSha256,producerFiles,startedAt,completedAt,native,stdoutSha256,acquisitionRecord,manifestSha256,files,backupObservation,createdAt')&&
        p.schemaVersion===1&&p.kind==='backup-native-process-observation'&&p.acquisitionAuthority==='UNESTABLISHED'&&
        p.sourceCommit===q.captureCommit&&p.sourceBindingSha256===q.sourceBindingSha256&&isHash(p.runId)&&isHash(p.manifestSha256)&&isHash(p.stdoutSha256));
      require(exact(p.native,'kind,exitCode,signal,error,captureComplete,stdoutBytes,stderrBytes')&&p.native.kind==='process'&&p.native.exitCode===0&&
        p.native.signal===null&&p.native.error===null&&p.native.captureComplete===true&&p.native.stderrBytes===0&&
        Number.isSafeInteger(p.native.stdoutBytes)&&p.native.stdoutBytes>0&&p.native.stdoutBytes<=65536);
      require(exact(p.acquisitionRecord,'sha256,bytes')&&isHash(p.acquisitionRecord.sha256)&&Number.isSafeInteger(p.acquisitionRecord.bytes)&&p.acquisitionRecord.bytes>0&&p.acquisitionRecord.bytes<=65536);
      phase='acquisition-record';const retained=store.inspectRecord({directory:q.acquisitionDirectory,expectedSha256:p.acquisitionRecord.sha256});
      require(retained.status==='PERSISTED_RECORD_VERIFIED'&&retained.sha256===p.acquisitionRecord.sha256&&retained.bytes===p.acquisitionRecord.bytes);
      const a=structuredClone(retained.record);
      require(exact(a,'schemaVersion,kind,acquisitionAuthority,runId,sourceCommit,producerFiles,sourceBindingSha256,capture,manifestSha256,files,createdAt')&&
        a.schemaVersion===1&&a.kind==='backup-acquisition-observation'&&a.acquisitionAuthority==='UNESTABLISHED');
      for(const k of ['runId','sourceCommit','producerFiles','sourceBindingSha256','manifestSha256','files']) require(same(a[k],p[k]));
      const c=a.capture;
      require(exact(c,'startedAt,completedAt,t0,sourceBindingSha256,snapshotSha256,exporterClosedObservedAt,dumps,checksumCompletedAt,vectorExclusion,sourceState')&&
        c.sourceBindingSha256===q.sourceBindingSha256&&isHash(c.snapshotSha256));
      validateBackupSourceState(c.sourceState);
      require(time(p.startedAt)<=time(c.startedAt)&&time(c.startedAt)<=time(c.t0)+1000&&time(c.t0)-1000<=time(c.checksumCompletedAt)&&
        time(c.checksumCompletedAt)<=time(c.exporterClosedObservedAt)&&time(c.exporterClosedObservedAt)<=time(c.completedAt)&&
        time(c.completedAt)<=time(a.createdAt)&&time(a.createdAt)<=time(p.completedAt)&&time(p.completedAt)<=time(p.createdAt)&&time(p.createdAt)<=time(c.t0)+299000);
      require(exact(c.vectorExclusion,'snapshotSha256,counts')&&c.vectorExclusion.snapshotSha256===c.snapshotSha256&&
        exact(c.vectorExclusion.counts,'storage.buckets_vectors,storage.vector_indexes')&&Object.values(c.vectorExclusion.counts).every(n=>n===0));
      require(Array.isArray(c.dumps)&&c.dumps.length===5);let previous=time(c.startedAt);
      c.dumps.forEach((d,i)=>{
        require(exact(d,'name,snapshotSha256,startedAt,completedAt,rawSha256,exitCode,captureComplete,stderrBytes,clientMajor,transport')&&
          d.name===['roles','schema','data','historySchema','historyData'][i]&&validBackupDumpTransport(d,i)&&
          d.snapshotSha256===(i===0?null:c.snapshotSha256)&&d.exitCode===0&&d.captureComplete===true&&d.stderrBytes===0&&d.clientMajor===17&&
          time(d.startedAt)>=previous&&time(d.completedAt)>=time(d.startedAt)&&time(d.completedAt)<=time(c.checksumCompletedAt)&&
          (i===0||time(d.startedAt)>=time(c.t0)-1000));previous=time(d.completedAt);
      });
      require(Array.isArray(p.files)&&p.files.length===6&&p.files.every((f,i)=>exact(f,'name,bytes,sha256')&&f.name===names[i]&&isHash(f.sha256)&&
        Number.isSafeInteger(f.bytes)&&f.bytes>=(i===2?0:1)&&f.bytes<=32*1024*1024));
      const observation={schemaVersion:1,t0:c.t0,snapshotSha256:c.snapshotSha256,
        exporter:{isolation:'repeatable read',readOnly:true,serverMajor:17,closedAt:c.exporterClosedObservedAt,exitCode:0,captureComplete:true,stderrBytes:0,vectorExclusion:c.vectorExclusion},
        dumps:c.dumps.map((d,i)=>({...d,name:names[[0,1,3,4,5][i]]})),checksumCompletedAt:c.checksumCompletedAt,manifestSha256:p.manifestSha256,
        files:p.files,authReviewSha256:p.files[2].sha256,sourceState:c.sourceState,restore:null};
      require(same(p.backupObservation,observation));
      const binding={captureCommit:q.captureCommit,executorCommit:q.executorCommit,producerFiles:p.producerFiles};
      phase='provenance';const provenance=verifySource(binding);
      const inspect=()=>{const v=store.inspect({directory:q.artifactDirectory,expectedManifestSha256:p.manifestSha256});
        require(v.status==='PERSISTED_BYTES_VERIFIED'&&v.manifestSha256===p.manifestSha256&&same(v.artifacts,p.files));};
      phase='artifacts';inspect();
      const artifacts=p.files.map(f=>{const bytes=readFile(path.join(q.artifactDirectory,f.name));
        require(Buffer.isBuffer(bytes)&&bytes.length===f.bytes&&hash(bytes)===f.sha256);
        return {...f,sql:new TextDecoder('utf-8',{fatal:true}).decode(bytes)};});
      inspect();phase='provenance-postcheck';require(same(verifySource(binding),provenance));
      const input={artifacts,sourceState:c.sourceState};buildAtomicRestore(input);
      return {input,provenance,processReceiptSha256:q.processReceiptSha256,manifestSha256:p.manifestSha256};
    } catch { throw Object.assign(Error('ATOMIC_RETAINED_REJECTED'),{phase}); }
  } };
}

export function readRetainedAtomicBackup(request) {
  return createRetainedAtomicReader({store:createBackupArtifactStore(),verifySource:verifyAtomicSourceBinding,readFile:p=>fs.readFileSync(p)}).read(request);
}
