const sourceState = () => ({ historyCount: 22, historySha256: '1'.repeat(64), rowCounts: [{ identitySha256: '2'.repeat(64), rows: 0 }], authUsers: 0, authForeignKeysSha256: '3'.repeat(64), grantsRlsSha256: '4'.repeat(64), legacyRows: 0, vaultRows: 0, storageObjects: 0, vectorCounts: { 'storage.buckets_vectors': 0, 'storage.vector_indexes': 0 } });
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { EventEmitter } from 'node:events';
import { PassThrough, Writable } from 'node:stream';
import { spawn, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import { createBackupProcessTransport, createBackupProcessReceipt } from './lib/comment-translator-paid-core-v1-gate1-backup-process.mjs';
import { BACKUP_ACQUISITION_PRODUCERS } from './lib/comment-translator-paid-core-v1-gate1-backup-acquisition.mjs';

const sha = value => createHash('sha256').update(value).digest('hex');
const sourceCommit = 'a'.repeat(40), binding = 'b'.repeat(64);
const output = () => ({ status: 'SOURCE_BOUND_BACKUP_OBSERVATION_PERSISTED', runId: 'c'.repeat(64), sourceCommit,
  manifestSha256: 'd'.repeat(64), recordSha256: 'e'.repeat(64), recordBytes: 123,
  verifiedAt: '2026-09-09T00:00:01.000Z', stageAuthority: false, gate: 'NO-GO' });
const acquisition = () => ({ sourceCommit, directory: 'Z:/backup/run', receiptDirectory: 'Z:/acquisition/run',
  captureInput: { target: 'production', expectedBindingSha256: binding, env: { PGPASSWORD: 'private-canary' } } });
function transportFixture(options = {}) {
  const calls = [], timers = new Map(); let next = 0, killed = 0;
  const child = new EventEmitter(); child.pid = 12345;
  child.stdout = new PassThrough(); child.stderr = new PassThrough();
  child.unref = () => {}; child.stdout.unref = () => {}; child.stderr.unref = () => {};
  child.stdin = new Writable({ write(chunk, _encoding, callback) { calls.push(['input', chunk.toString()]); callback(); } });
  const transport = createBackupProcessTransport({
    spawnImpl(command, args, config) {
      calls.push(['spawn', command, args, config]);
      queueMicrotask(() => {
        if (options.hang) { if (options.exited) child.emit('exit', 0, null); return; }
        if (options.stderr) child.stderr.write('private-native-detail');
        else child.stdout.write(options.bytes ?? Buffer.from(JSON.stringify(output()) + '\n'));
        child.emit('close', options.exitCode ?? 0, null);
      });
      return child;
    },
    terminateTree(pid) { assert.equal(pid, child.pid); killed++; if (!options.noClose) queueMicrotask(() => child.emit('close', 1, null)); return options.killFailed !== true; },
    setTimeoutImpl(fn, ms) { const id = ++next; timers.set(id, fn); if ((options.hang && ms === 300000) || (options.noClose && ms === 2000)) queueMicrotask(fn); return id; },
    clearTimeoutImpl(id) { timers.delete(id); },
  });
  return { transport, calls, timers, killed: () => killed };
}

test('bounded child transport uses fixed argv, private stdin and native close facts', async () => {
  const f = transportFixture(), result = await f.transport.run(acquisition());
  const call = f.calls[0];
  assert.equal(call[1], process.execPath); assert.equal(call[2].length, 2); assert.equal(call[2][1], '--capture');
  assert.ok(call[2][0].endsWith('comment-translator-paid-core-v1-gate1-backup-acquire.mjs'));
  assert.equal(call[3].shell, false); assert.equal(call[3].windowsHide, true);
  assert.equal(call[3].env.PGPASSWORD, undefined); assert.equal(call[3].env.NODE_OPTIONS, undefined);
  assert.ok(f.calls[1][1].includes('private-canary'));
  assert.equal(result.native.exitCode, 0); assert.equal(result.native.signal, null);
  assert.equal(result.native.captureComplete, true); assert.equal(result.native.stderrBytes, 0);
  assert.equal(result.stdoutSha256, sha(JSON.stringify(output()) + '\n'));
  assert.equal(result.output.runId, output().runId); assert.equal(f.timers.size, 0);
  assert.ok(!JSON.stringify(result).includes('private-canary'));
});

test('bad output, stderr, exit failure and oversized input cannot yield a native receipt', async () => {
  for (const options of [{ bytes: Buffer.from([0xff]) }, { bytes: Buffer.from('{}') },
    { bytes: Buffer.alloc(65537) }, { stderr: true }, { exitCode: 2 }]) {
    const f = transportFixture(options);
    await assert.rejects(f.transport.run(acquisition()), /^Error: BACKUP_PROCESS_REJECTED$/);
    assert.equal(f.timers.size, 0);
  }
  const f = transportFixture(), input = acquisition(); input.captureInput.env.PGPASSWORD = 'x'.repeat(1048576);
  await assert.rejects(f.transport.run(input), /BACKUP_PROCESS_REJECTED/); assert.equal(f.calls.length, 0);
});

test('timeout terminates only the owned process tree once; missing close remains unconfirmed', async () => {
  for (const noClose of [false, true]) {
    const f = transportFixture({ hang: true, noClose });
    await assert.rejects(f.transport.run(acquisition()), e => e.message === 'BACKUP_PROCESS_REJECTED' && e.cleanupConfirmed === !noClose);
    assert.equal(f.killed(), 1); assert.equal(f.timers.size, 0);
  }
});

test('already exited PID is never killed and cancellation before spawn starts nothing', async () => {
  const f = transportFixture({ hang: true, exited: true });
  await assert.rejects(f.transport.run(acquisition()), e => e.message === 'BACKUP_PROCESS_REJECTED' && e.cleanupConfirmed === false);
  assert.equal(f.killed(), 0); assert.equal(f.timers.size, 0);
  const aborted = transportFixture();
  await assert.rejects(aborted.transport.run(acquisition(), { signal: AbortSignal.abort() }), /BACKUP_PROCESS_REJECTED/);
  assert.equal(aborted.calls.length, 0);
});

test('transport observes an actual harmless Node child without hosted connections', async () => {
  const text = JSON.stringify(output()) + '\n';
  const transport = createBackupProcessTransport({ spawnImpl: (_command, _args, options) =>
    spawn(process.execPath, ['-e', 'process.stdin.resume();process.stdin.on("end",()=>process.stdout.write(' + JSON.stringify(text) + '));'], options) });
  const result = await transport.run(acquisition());
  assert.equal(result.native.exitCode, 0); assert.equal(result.native.stdoutBytes, Buffer.byteLength(text));
  assert.equal(result.stdoutSha256, sha(text));
});

test('native Windows timeout closes an owned harmless child tree', { skip: process.platform !== 'win32' }, async () => {
  let ownedChild;
  const transport = createBackupProcessTransport({
    spawnImpl: (_command, _args, options) => {
      ownedChild = spawn(process.execPath, ['-e', 'const {spawn}=require("node:child_process");spawn(process.execPath,["-e","setInterval(()=>{},1000)"],{stdio:"inherit",windowsHide:true});process.stdin.resume();setInterval(()=>{},1000);'], options);
      return ownedChild;
    },
    setTimeoutImpl: (fn, ms) => setTimeout(fn, ms === 300000 ? 1000 : ms),
  });
  await assert.rejects(transport.run(acquisition()), e => e.message === 'BACKUP_PROCESS_REJECTED' && e.cleanupConfirmed === true);
  assert.ok(ownedChild.exitCode !== null || ownedChild.signalCode !== null);
});

test('real acquisition entry rejects empty input before credentials or DB access', () => {
  const result = spawnSync(process.execPath, ['scripts/comment-translator-paid-core-v1-gate1-backup-acquire.mjs', '--capture'],
    { input: '', encoding: 'utf8', windowsHide: true, timeout: 10000 });
  assert.equal(result.status, 2); assert.equal(result.stderr, '');
  assert.equal(JSON.parse(result.stdout).status, 'BACKUP_ACQUISITION_UNAVAILABLE');
});

function receiptFixture(options = {}) {
  const actions = [], records = [];
  const producers = BACKUP_ACQUISITION_PRODUCERS.map(path => ({ path, sha256: sha(path) }));
  const files = ['roles.sql', 'schema.sql', 'auth_storage_changes.sql', 'data.sql', 'history_schema.sql', 'history_data.sql']
    .map(name => ({ name, bytes: 1, sha256: 'f'.repeat(64) }));
  const record = { schemaVersion: 1, kind: 'backup-acquisition-observation', acquisitionAuthority: 'UNESTABLISHED',
    runId: output().runId, sourceCommit, sourceBindingSha256: binding, producerFiles: producers,
    capture: { t0: options.t0 ?? '2026-09-09T00:00:00.000123Z', startedAt: '2026-09-08T23:59:59.500Z',
      completedAt: '2026-09-09T00:00:00.900Z', sourceBindingSha256: binding, snapshotSha256: '2'.repeat(64),
      checksumCompletedAt: '2026-09-09T00:00:00.700Z', exporterClosedObservedAt: '2026-09-09T00:00:00.800Z',
      dumps: ['roles', 'schema', 'data', 'historySchema', 'historyData'].map((name, i) => ({ name,
        snapshotSha256: i === 0 ? null : '2'.repeat(64), startedAt: new Date(Date.parse('2026-09-09T00:00:00Z') + i * 100 + 1).toISOString(),
        completedAt: new Date(Date.parse('2026-09-09T00:00:00Z') + i * 100 + 50).toISOString(),
        rawSha256: '3'.repeat(64), exitCode: 0, captureComplete: true, stderrBytes: 0, clientMajor: 17 })),
      sourceState: sourceState(),
          vectorExclusion: { snapshotSha256: '2'.repeat(64), counts: { 'storage.buckets_vectors': 0, 'storage.vector_indexes': 0 } } },
    manifestSha256: output().manifestSha256, files, createdAt: '2026-09-09T00:00:00.950Z' };
  if (options.missingSourceState) delete record.capture.sourceState;
  if (options.nonemptyState) record.capture.sourceState.vaultRows = 1;
  const store = {
    prepareDirectory() { actions.push('prepare'); return { status: 'EMPTY_RESTRICTED_DIRECTORY_VERIFIED' }; },
    inspectRecord({ name, expectedSha256 }) {
      actions.push('read-record');
      return { status: 'PERSISTED_RECORD_VERIFIED', sha256: expectedSha256, bytes: 123,
        record: name === 'backup-process.json' ? (options.readbackMismatch ? {} : records.at(-1))
          : { ...record, ...(options.mismatch ? { runId: '0'.repeat(64) } : {}), ...(options.invalidCapture ? { capture: {} } : {}) } };
    },
    inspect() { actions.push('read-files'); return { status: 'PERSISTED_BYTES_VERIFIED', manifestSha256: record.manifestSha256, artifacts: files }; },
    persistRecord({ name, record }) { assert.equal(name, 'backup-process.json'); actions.push('persist'); records.push(record); return { status: 'PERSISTED_RECORD_VERIFIED', sha256: sha(JSON.stringify(record)), bytes: 123 }; },
  };
  const runner = createBackupProcessReceipt({ store, verifySource: () => { if (options.sourceFailure) throw Error('private-source'); return producers; },
    now: () => Date.parse(options.late ? '2026-09-09T00:05:01Z' : '2026-09-09T00:00:02Z'),
    transport: { async run() { actions.push('child'); return { startedAt: '2026-09-08T23:59:59Z', completedAt: '2026-09-09T00:00:01.500Z',
      output: output(), stdoutSha256: '1'.repeat(64), native: { kind: 'process', exitCode: 0, signal: null, error: null,
        captureComplete: true, stdoutBytes: 100, stderrBytes: 0 } }; } } });
  return { runner, actions, records };
}

test('outer receipt joins native close to independently read source/run/manifest records', async () => {
  const f = receiptFixture(), result = await f.runner.run({ acquisition: acquisition(), processReceiptDirectory: 'Z:/process/run' });
  assert.equal(result.status, 'BACKUP_NATIVE_PROCESS_OBSERVATION_PERSISTED'); assert.equal(result.stageAuthority, false);
  assert.equal(f.records[0].native.kind, 'process'); assert.equal(f.records[0].runId, output().runId);
  const observation = f.records[0].backupObservation;
  assert.deepEqual(observation.dumps.map(d => d.name), ['roles.sql', 'schema.sql', 'data.sql', 'history_schema.sql', 'history_data.sql']);
  assert.deepEqual(observation.sourceState, sourceState());
  assert.equal(observation.restore, null);
  assert.equal(observation.authReviewSha256, observation.files[2].sha256);
  assert.ok(!JSON.stringify(f.records).includes('private-canary'));
  const bad = receiptFixture({ mismatch: true });
  await assert.rejects(bad.runner.run({ acquisition: acquisition(), processReceiptDirectory: 'Z:/process/run' }), /BACKUP_PROCESS_RECEIPT_REJECTED/);
  assert.equal(bad.records.length, 0);
});

test('generated backup observation satisfies actual final stage contract with native microsecond T0, but cannot impersonate rehearsal', async () => {
  const f = receiptFixture();
  await f.runner.run({ acquisition: acquisition(), processReceiptDirectory: 'Z:/process/run' });
  const o = f.records[0].backupObservation;
  const src = fs.readFileSync(new URL('./lib/comment-translator-paid-core-v1-gate1-stage-evidence.mjs', import.meta.url), 'utf8');
  const body = src.replace(/^import .*;\r?\n/gm, '').replaceAll('export ', '');
  // Same isolated import seam as the existing stage tests; no runtime authority.
  const validate = new Function('createHash', 'inspectBackupArtifacts', body + '\nreturn backup;')(createHash,
    () => ({ status: 'PERSISTED_BYTES_VERIFIED', manifestSha256: o.manifestSha256, artifacts: o.files }));
  const descriptor = { startedAt: '2026-09-08T23:59:59.000Z', completedAt: '2026-09-09T00:00:02.000Z', targetBindings: { production: binding } };
  const bundle = { index: { stages: { finalBackup: descriptor, rehearsalBackup: descriptor } } };
  const policy = { backups: { finalBackup: { directory: 'Z:/backup/run', manifestSha256: o.manifestSha256, authReviewSha256: o.authReviewSha256 } } };
  policy.backups.rehearsalBackup = policy.backups.finalBackup;
  assert.doesNotThrow(() => validate('finalBackup', { observation: o }, bundle, policy));
  for (const offset of [477, 1101]) {
    const t0 = new Date(Date.parse('2026-09-09T00:00:00Z') + offset).toISOString();
    const skewed = receiptFixture({ t0 });
    await skewed.runner.run({ acquisition: acquisition(), processReceiptDirectory: 'Z:/process/run' });
    assert.doesNotThrow(() => validate('finalBackup', { observation: skewed.records[0].backupObservation }, bundle, policy));
  }
  const beyond = receiptFixture({ t0: '2026-09-09T00:00:01.102Z' });
  await assert.rejects(beyond.runner.run({ acquisition: acquisition(), processReceiptDirectory: 'Z:/process/run' }), /BACKUP_PROCESS_RECEIPT_REJECTED/);
  const lateBundle = structuredClone(bundle);
  lateBundle.index.stages.finalBackup.completedAt = '2026-09-09T00:04:59.001Z';
  assert.throws(() => validate('finalBackup', { observation: o }, lateBundle, policy), /STAGE_EVIDENCE_REJECTED/);
  assert.throws(() => validate('rehearsalBackup', { observation: o }, bundle, policy), /STAGE_EVIDENCE_REJECTED/);
  assert.throws(() => validate('finalBackup', { observation: { ...o, t0: '2026-02-30T00:00:00.000123Z' } }, bundle, policy), /STAGE_EVIDENCE_REJECTED/);
});

test('outer receipt rejects failed source, malformed capture, deadline and durable readback failures', async () => {
  for (const options of [{ sourceFailure: true }, { invalidCapture: true }, { missingSourceState: true }, { nonemptyState: true }, { late: true }, { readbackMismatch: true }]) {
    const f = receiptFixture(options);
    await assert.rejects(f.runner.run({ acquisition: acquisition(), processReceiptDirectory: 'Z:/process/run' }), /BACKUP_PROCESS_RECEIPT_REJECTED/);
    if (!options.readbackMismatch) assert.equal(f.records.length, 0);
    if (options.sourceFailure) assert.ok(!f.actions.includes('child'));
  }
  const f = receiptFixture();
  await assert.rejects(f.runner.run({ acquisition: acquisition(), processReceiptDirectory: 'Z:/backup/run/nested' }), /BACKUP_PROCESS_RECEIPT_REJECTED/);
  assert.ok(!f.actions.includes('child'));
});
