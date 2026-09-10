import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createHash } from 'node:crypto';
import { createRetainedAtomicReader } from './lib/comment-translator-paid-core-v1-gate1-atomic-retained.mjs';
const hash = s => createHash('sha256').update(s).digest('hex');
function fixture() {
  const names = ['roles.sql','schema.sql','auth_storage_changes.sql','data.sql','history_schema.sql','history_data.sql'];
  const files = names.map(name => ({name,bytes:9,sha256:hash('SELECT 1;')}));
  const state = {historyCount:22,historySha256:hash('history'),rowCounts:[{identitySha256:hash('table'),rows:1}],authUsers:1,
    authForeignKeysSha256:hash('fk'),grantsRlsSha256:hash('security'),legacyRows:0,vaultRows:0,storageObjects:0,
    vectorCounts:{'storage.buckets_vectors':0,'storage.vector_indexes':0}};
  const stamp = n => new Date(Date.UTC(2026,8,9,0,0,0,n)).toISOString(), snapshot = hash('snapshot');
  const capture = {startedAt:stamp(0),t0:stamp(0),completedAt:stamp(700),checksumCompletedAt:stamp(600),exporterClosedObservedAt:stamp(650),
    sourceBindingSha256:hash('binding'),snapshotSha256:snapshot,sourceState:state,
    vectorExclusion:{snapshotSha256:snapshot,counts:{'storage.buckets_vectors':0,'storage.vector_indexes':0}},
    dumps:['roles','schema','data','historySchema','historyData'].map((name,i)=>({name,snapshotSha256:i?snapshot:null,
      startedAt:stamp(i*100),completedAt:stamp(i*100+50),rawSha256:hash('raw'),exitCode:0,captureComplete:true,stderrBytes:0,clientMajor:17,
      transport:{encoding:i?'gzip':'plain',stdoutBytes:9,decodedBytes:9,stdoutSha256:hash(i?'zip':'raw')}}))};
  const common = {schemaVersion:1,acquisitionAuthority:'UNESTABLISHED',sourceCommit:'a'.repeat(40),runId:hash('run'),
    sourceBindingSha256:hash('binding'),producerFiles:[{path:'fixture',sha256:hash('producer')}],files,manifestSha256:hash('manifest')};
  const acquisition = {...common,kind:'backup-acquisition-observation',capture,createdAt:stamp(750)};
  const observation = {schemaVersion:1,t0:capture.t0,snapshotSha256:snapshot,
    exporter:{isolation:'repeatable read',readOnly:true,serverMajor:17,closedAt:capture.exporterClosedObservedAt,exitCode:0,captureComplete:true,stderrBytes:0,vectorExclusion:capture.vectorExclusion},
    dumps:capture.dumps.map((d,i)=>({...d,name:names[[0,1,3,4,5][i]]})),checksumCompletedAt:capture.checksumCompletedAt,
    manifestSha256:common.manifestSha256,files,authReviewSha256:files[2].sha256,sourceState:state,restore:null};
  const processRecord = {...common,kind:'backup-native-process-observation',startedAt:stamp(0),completedAt:stamp(800),createdAt:stamp(850),
    native:{kind:'process',exitCode:0,signal:null,error:null,captureComplete:true,stdoutBytes:20,stderrBytes:0},stdoutSha256:hash('stdout'),
    acquisitionRecord:{sha256:hash('acquisition'),bytes:123},backupObservation:observation};
  let sourceCalls=0, reads=0;
  const io = {store:{inspectRecord:({name,expectedSha256})=>({status:'PERSISTED_RECORD_VERIFIED',sha256:expectedSha256,bytes:123,
    record:name==='backup-process.json'?processRecord:acquisition}),
    inspect:()=>({status:'PERSISTED_BYTES_VERIFIED',manifestSha256:common.manifestSha256,artifacts:files})},
    readFile:()=>{reads++;return Buffer.from('SELECT 1;');},verifySource:()=>{sourceCalls++;return {captureCommit:common.sourceCommit,executorCommit:'b'.repeat(40)};}};
  const request={executorCommit:'b'.repeat(40),captureCommit:common.sourceCommit,sourceBindingSha256:common.sourceBindingSha256,
    processReceiptSha256:hash('process'),processDirectory:'Z:/p',acquisitionDirectory:'Z:/a',artifactDirectory:'Z:/f'};
  return {io,request,processRecord,acquisition,counts:()=>({sourceCalls,reads})};
}
test('joins retained records without changing capture identity or original SQL',()=>{
  const f=fixture(), r=createRetainedAtomicReader(f.io).read(f.request);
  assert.equal(r.provenance.captureCommit,'a'.repeat(40));assert.equal(r.provenance.executorCommit,'b'.repeat(40));
  assert.equal(r.input.artifacts.length,6);assert.equal(r.input.artifacts[3].sql,'SELECT 1;');assert.deepEqual(f.counts(),{sourceCalls:2,reads:6});
});
test('mixed records, native failures, wrong capture/snapshot/timing reject before SQL reads',()=>{
  for(const mutate of [f=>f.acquisition.runId=hash('other'),f=>f.processRecord.native.signal='SIGTERM',
    f=>f.request.captureCommit='c'.repeat(40),f=>f.acquisition.capture.dumps[1].snapshotSha256=hash('wrong'),
    f=>f.processRecord.backupObservation.restore={},f=>f.processRecord.createdAt='2026-09-09T00:05:00Z',
    f=>f.acquisition.capture.vectorExclusion.counts['storage.buckets_vectors']=1]) {
    const f=fixture();mutate(f);assert.throws(()=>createRetainedAtomicReader(f.io).read(f.request),/ATOMIC_RETAINED_REJECTED/);
    assert.equal(f.counts().reads,0);
  }
});
test('unpublished executor and changed original bytes do not produce prepared input',()=>{
  const f=fixture();f.io.verifySource=()=>{throw Error('private');};
  assert.throws(()=>createRetainedAtomicReader(f.io).read(f.request),/^Error: ATOMIC_RETAINED_REJECTED$/);assert.equal(f.counts().reads,0);
  const g=fixture();g.io.readFile=()=>Buffer.from('SELECT 2;');assert.throws(()=>createRetainedAtomicReader(g.io).read(g.request));
});
