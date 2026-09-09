import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createHash } from 'node:crypto';
import { createRehearsalRestore } from './lib/comment-translator-paid-core-v1-gate1-rehearsal-restore.mjs';
const hash = x => createHash('sha256').update(x).digest('hex');
const names = ['roles.sql', 'schema.sql', 'auth_storage_changes.sql', 'data.sql', 'history_schema.sql', 'history_data.sql'];
const state = () => ({ historyCount: 22, historySha256: hash('history'), rowCounts: [{ identitySha256: hash('table'), rows: 2 }],
  authUsers: 1, authForeignKeysSha256: hash('fk'), grantsRlsSha256: hash('acl'), legacyRows: 0, vaultRows: 0, storageObjects: 0,
  vectorCounts: { 'storage.buckets_vectors': 0, 'storage.vector_indexes': 0 } });
const input = () => ({ artifacts: names.map((name, i) => ({ name, sql: i === 2 ? '' : 'SELECT 1;', bytes: i === 2 ? 0 : 9, sha256: hash(i === 2 ? '' : 'SELECT 1;') })), sourceState: state() });
function fixture(options = {}) {
  const calls = []; let tick = 0;
  const runner = createRehearsalRestore({ now: () => options.late && tick > 0 ? 700000 : tick++ * 1000,
    execute: async ({ name }) => { calls.push(name); options.mutate?.(); return { exitCode: options.failAt === name ? 1 : 0,
      signal: null, captureComplete: true, stdoutBytes: 0, stderrBytes: options.stderr ? 1 : 0, onErrorStop: true, transaction: true }; },
    readState: async () => { calls.push('readback'); return options.wrongState ? { ...state(), authUsers: 2 } : state(); } });
  return { runner, calls };
}
test('six ordered atomic restores precede exact state readback; no stage authority is manufactured', async () => {
  const f = fixture(), result = await f.runner.run(input());
  assert.deepEqual(f.calls, [...names, 'readback']);
  assert.equal(result.status, 'RESTORE_STATE_MATCH_OBSERVED'); assert.equal(result.stageAuthority, false);
  assert.deepEqual(result.transactions.map(x => x.name), names); assert.deepEqual(result.restoredState, state());
});
test('tampered bytes, order, state and metadata fail before any execution', async () => {
  for (const mutate of [i => { i.artifacts.reverse(); }, i => { i.artifacts[0].sql += 'x'; },
    i => { i.artifacts[0].extra = true; }, i => { i.sourceState.vaultRows = 1; }]) {
    const i = input(); mutate(i); const f = fixture();
    await assert.rejects(f.runner.run(i), /REHEARSAL_RESTORE_REJECTED/); assert.equal(f.calls.length, 0);
  }
});
test('failed transaction or incomplete output stops later execution and readback', async () => {
  for (const options of [{ failAt: 'schema.sql' }, { stderr: true }, { late: true }]) {
    const f = fixture(options);
    await assert.rejects(f.runner.run(input()), /REHEARSAL_RESTORE_REJECTED/);
    assert.ok(!f.calls.includes('readback')); assert.ok(f.calls.length < 6);
  }
});
test('mismatched restored state never reports acceptance, and async caller mutation cannot redirect bytes', async () => {
  const bad = fixture({ wrongState: true }); await assert.rejects(bad.runner.run(input()), /REHEARSAL_RESTORE_REJECTED/);
  const i = input(), f = fixture({ mutate: () => { i.artifacts[1].sql = 'private tamper'; i.sourceState.authUsers = 999; } });
  const result = await f.runner.run(i); assert.deepEqual(result.restoredState, state());
});

test('local replay explicitly accepts 26 history rows without weakening the default restore',async()=>{
 const request=input();request.sourceState.historyCount=26;let executed=0;
 const transport={execute:async()=>{executed++;return{exitCode:0,signal:null,captureComplete:true,stdoutBytes:0,stderrBytes:0,onErrorStop:true,transaction:true};},readState:async()=>request.sourceState};
 await assert.rejects(createRehearsalRestore(transport).run(request));assert.equal(executed,0);
 const result=await createRehearsalRestore({...transport,localReplay:true}).run(request);
 assert.equal(executed,6);assert.equal(result.restoredState.historyCount,26);assert.equal(result.stageAuthority,false);
});
