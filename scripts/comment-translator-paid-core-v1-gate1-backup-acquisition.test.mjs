const sourceState = () => ({ historyCount: 22, historySha256: '1'.repeat(64), rowCounts: [{ identitySha256: '2'.repeat(64), rows: 0 }], authUsers: 0, authForeignKeysSha256: '3'.repeat(64), grantsRlsSha256: '4'.repeat(64), legacyRows: 0, vaultRows: 0, storageObjects: 0, vectorCounts: { 'storage.buckets_vectors': 0, 'storage.vector_indexes': 0 } });
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createHash } from 'node:crypto';
import { createBackupAcquisition, BACKUP_ACQUISITION_PRODUCERS } from './lib/comment-translator-paid-core-v1-gate1-backup-acquisition.mjs';

const sha = text => createHash('sha256').update(text).digest('hex');
const t0 = '2026-09-09T09:00:00.000123+09:00';
const base = Date.parse(t0);
const iso = offset => new Date(base + offset).toISOString();
const names = ['roles.sql', 'schema.sql', 'auth_storage_changes.sql', 'data.sql', 'history_schema.sql', 'history_data.sql'];
const artifacts = names.map((name, i) => ({ name, sql: i === 2 ? '' : '-- private SQL',
  bytes: i === 2 ? 0 : 14, sha256: sha(i === 2 ? '' : '-- private SQL'), rawSha256: sha('raw' + i) }));
const files = artifacts.map(({ name, bytes, sha256 }) => ({ name, bytes, sha256 }));
const request = () => ({ sourceCommit: 'a'.repeat(40), directory: 'Z:/backup/run1', receiptDirectory: 'Z:/receipts/run1',
  captureInput: { target: 'production', expectedBindingSha256: 'b'.repeat(64) } });
function fixture(options = {}) {
  const actions = [], records = [];
  let held = false, sourceChecks = 0;
  const source = BACKUP_ACQUISITION_PRODUCERS.map(path => ({ path, sha256: sha(path) }));
  const store = {
    prepareDirectory() { actions.push('prepare'); if (options.directoryFailure) throw Error('private ACL'); return { status: 'EMPTY_RESTRICTED_DIRECTORY_VERIFIED' }; },
    persist({ directory }) { assert.ok(held); assert.equal(directory, request().directory); actions.push('persist'); if (options.persistFailure) throw Error('private disk'); return { status: 'PERSISTED_AUTHORITY_UNESTABLISHED', artifactCount: 6, manifestSha256: 'c'.repeat(64) }; },
    inspect() { assert.ok(held); actions.push('inspect'); return { status: 'PERSISTED_BYTES_VERIFIED', manifestSha256: 'c'.repeat(64), artifacts: files }; },
    persistRecord({ directory, record }) {
      assert.equal(directory, request().receiptDirectory);
      assert.equal(held, false); actions.push('record');
      if (options.recordFailure) throw Error('private disk');
      records.push(record); return { status: 'PERSISTED_RECORD_VERIFIED', sha256: sha(JSON.stringify(record)), bytes: 123 };
    },
    inspectRecord({ expectedSha256 }) {
      actions.push('record-read');
      return { status: 'PERSISTED_RECORD_VERIFIED', sha256: expectedSha256, bytes: 123,
        record: options.recordMismatch ? { different: true } : records.at(-1) };
    },
  };
  const acquire = createBackupAcquisition({ store, now: () => options.late ? base + 300001 : base + 100,
    newRunId: () => 'd'.repeat(64), verifySource: sourceCommit => {
      assert.equal(sourceCommit, request().sourceCommit);
      actions.push('source'); sourceChecks++;
      if (options.sourceFailure || (options.sourceDrift && sourceChecks > 1)) throw Error('private git');
      return source;
    },
    captureFactory: ({ persistWhileHeld }) => ({ async run(input) {
      actions.push('capture'); held = true;
      options.onCapture?.();
      try {
        if (!options.skipPersistence) await persistWhileHeld({ artifacts });
      } catch (e) { held = false; throw Object.assign(e, { cleanupConfirmed: true }); }
      held = false; actions.push('close');
      const snapshotSha256 = 'e'.repeat(64);
      const dumps = ['roles', 'schema', 'data', 'historySchema', 'historyData'].map((name, i) => ({
        name, snapshotSha256: i === 0 ? null : snapshotSha256, startedAt: iso(i * 2), completedAt: iso(i * 2 + 1),
        rawSha256: artifacts[[0, 1, 3, 4, 5][i]].rawSha256, exitCode: 0, stderrBytes: 0, captureComplete: true, clientMajor: 17,
      }));
      return { artifacts, evidence: { status: 'CAPTURED_PERSISTED_NOT_AUTHORITY', snapshotDumpCount: 4, exporterClosed: true,
        sourceState: sourceState(),
          vectorExclusion: { snapshotSha256, counts: { 'storage.buckets_vectors': 0, 'storage.vector_indexes': 0 } },
        persistence: { manifestSha256: 'c'.repeat(64), files, checksumCompletedAt: iso(20) },
        processObservations: { startedAt: iso(0), completedAt: iso(30), t0,
          sourceBindingSha256: options.wrongBinding ? 'f'.repeat(64) : input.expectedBindingSha256,
          snapshotSha256, exporterClosedObservedAt: options.earlyClose ? iso(10) : iso(25), dumps } } };
    } }),
  });
  return { acquire, actions, records };
}

test('native join binds source/run, persists while held, then writes a sanitized acquisition record', async () => {
  const f = fixture(), result = await f.acquire.run(request());
  assert.equal(result.status, 'SOURCE_BOUND_BACKUP_OBSERVATION_PERSISTED');
  assert.equal(result.gate, 'NO-GO'); assert.equal(result.stageAuthority, false);
  assert.deepEqual(f.actions, ['source', 'prepare', 'prepare', 'capture', 'persist', 'inspect', 'close', 'source', 'record', 'record-read']);
  const record = f.records[0];
  assert.equal(record.runId, 'd'.repeat(64)); assert.equal(record.sourceCommit, request().sourceCommit);
  assert.equal(record.capture.t0, t0); assert.equal(record.manifestSha256, 'c'.repeat(64));
  assert.equal(record.acquisitionAuthority, 'UNESTABLISHED'); assert.deepEqual(record.files, files);
  for (const value of ['private SQL', 'PGPASSWORD', 'Z:/', 'bindingJson']) assert.ok(!JSON.stringify(record).includes(value));
});

test('source and directory prerequisites fail before capture, without overwriting or remote work', async () => {
  for (const options of [{ sourceFailure: true }, { directoryFailure: true }]) {
    const f = fixture(options);
    await assert.rejects(f.acquire.run(request()), /^Error: BACKUP_ACQUISITION_REJECTED$/);
    assert.ok(!f.actions.includes('capture')); assert.equal(f.records.length, 0);
  }
  for (const mutate of [r => { r.sourceCommit = 'main'; }, r => { r.receiptDirectory = r.directory; },
    r => { r.receiptDirectory = r.directory + '/receipt'; }, r => { r.extra = true; }]) {
    const f = fixture(), r = request(); mutate(r);
    await assert.rejects(f.acquire.run(r), /BACKUP_ACQUISITION_REJECTED/); assert.equal(f.actions.length, 0);
  }
});

test('missing persistence, mismatched identity, early close, source drift and deadline stop before receipt creation', async () => {
  for (const options of [{ persistFailure: true }, { skipPersistence: true }, { wrongBinding: true },
    { earlyClose: true }, { sourceDrift: true }, { late: true }]) {
    const f = fixture(options);
    await assert.rejects(f.acquire.run(request()), /^Error: BACKUP_ACQUISITION_REJECTED$/);
    assert.equal(f.records.length, 0);
  }
});

test('failed or altered durable record never returns acceptance', async () => {
  for (const options of [{ recordFailure: true }, { recordMismatch: true }]) {
    const f = fixture(options);
    await assert.rejects(f.acquire.run(request()), /^Error: BACKUP_ACQUISITION_REJECTED$/);
    assert.ok(f.actions.includes('record')); assert.ok(!f.actions.includes('delete'));
  }
});

test('caller mutation during capture cannot redirect source, storage or target binding', async () => {
  const r = request(), f = fixture({ onCapture() {
    r.sourceCommit = '--unsafe'; r.directory = 'Z:/different'; r.receiptDirectory = 'Z:/other';
    r.captureInput.expectedBindingSha256 = 'f'.repeat(64);
  } });
  const result = await f.acquire.run(r);
  assert.equal(result.sourceCommit, request().sourceCommit);
  assert.equal(f.records[0].sourceBindingSha256, request().captureInput.expectedBindingSha256);
});
