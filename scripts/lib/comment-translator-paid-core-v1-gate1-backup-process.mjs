import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { parseStrictJson } from './comment-translator-paid-core-v1-gate1-evidence.mjs';
import { createBackupArtifactStore } from './comment-translator-paid-core-v1-gate1-backup-artifacts.mjs';
import { verifyBackupAcquisitionSource, assertDistinctBackupDirectories, BACKUP_ACQUISITION_PRODUCERS } from './comment-translator-paid-core-v1-gate1-backup-acquisition.mjs';
import { validateBackupSourceState } from './comment-translator-paid-core-v1-gate1-backup-state.mjs';

const repository = fileURLToPath(new URL('../..', import.meta.url));
const entry = path.join(repository, 'scripts/comment-translator-paid-core-v1-gate1-backup-acquire.mjs');
const hash = value => createHash('sha256').update(value).digest('hex');
const isHash = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
const exact = (value, keys) => value && typeof value === 'object' && !Array.isArray(value) &&
  Object.keys(value).sort().join(',') === [...keys].sort().join(',');
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const require = value => { if (!value) throw Error('BACKUP_PROCESS_RECEIPT_REJECTED'); };
function time(value) { const result = Date.parse(value); require(typeof value === 'string' && Number.isFinite(result)); return result; }
function sourceShape(files) {
  require(Array.isArray(files) && files.length === BACKUP_ACQUISITION_PRODUCERS.length);
  files.forEach((file, i) => require(exact(file, ['path', 'sha256']) && file.path === BACKUP_ACQUISITION_PRODUCERS[i] && isHash(file.sha256)));
}
function terminateTreeNative(pid) {
  if (process.platform !== 'win32' || !Number.isSafeInteger(pid) || pid <= 0 || !path.win32.isAbsolute(process.env.SystemRoot ?? '')) return false;
  try {
    const result = spawnSync(path.join(process.env.SystemRoot, 'System32/taskkill.exe'), ['/PID', String(pid), '/T', '/F'],
      { shell: false, windowsHide: true, timeout: 10000, maxBuffer: 65536,
        env: { SystemRoot: process.env.SystemRoot, WINDIR: process.env.SystemRoot } });
    return !result.error && !result.signal && result.status === 0;
  } catch { return false; }
}
function validOutput(output, sourceCommit) {
  return exact(output, ['status', 'runId', 'sourceCommit', 'manifestSha256', 'recordSha256', 'recordBytes', 'verifiedAt', 'stageAuthority', 'gate']) &&
    output.status === 'SOURCE_BOUND_BACKUP_OBSERVATION_PERSISTED' && output.sourceCommit === sourceCommit &&
    ['runId', 'manifestSha256', 'recordSha256'].every(key => isHash(output[key])) &&
    Number.isSafeInteger(output.recordBytes) && output.recordBytes > 0 && output.recordBytes <= 65536 &&
    typeof output.verifiedAt === 'string' && Number.isFinite(Date.parse(output.verifiedAt)) && output.stageAuthority === false && output.gate === 'NO-GO';
}

// All commands, argv, limits and environment are fixed here. Credentials travel
// only inside bounded stdin; even failure diagnostics never return raw output.
export function createBackupProcessTransport({ spawnImpl = spawn, terminateTree = terminateTreeNative,
  now = Date.now, monotonicNow = () => performance.now(), setTimeoutImpl = setTimeout, clearTimeoutImpl = clearTimeout } = {}) {
  return {
    async run(request, { signal } = {}) {
      let bytes;
      const sourceCommit = request?.sourceCommit;
      try {
        if ((signal !== undefined && !(signal instanceof AbortSignal)) || signal?.aborted || request?.captureInput?.signal !== undefined ||
            !/^[a-f0-9]{40}$/.test(request?.sourceCommit ?? '')) throw Error();
        bytes = Buffer.from(JSON.stringify(request));
        if (bytes.length > 1048576) throw Error();
      } catch { throw Object.assign(Error('BACKUP_PROCESS_REJECTED'), { cleanupConfirmed: true }); }
      return new Promise((resolve, reject) => {
        let child, timer, grace, done = false, stopping = false, treeStopped = false, exitObserved = false;
        let stdoutBytes = 0, stderrBytes = 0;
        const chunks = [];
        const startWall = now(), startMono = monotonicNow();
        const dispose = () => {
          clearTimeoutImpl(timer); clearTimeoutImpl(grace); signal?.removeEventListener('abort', onAbort); chunks.length = 0;
          for (const stream of [child?.stdin, child?.stdout, child?.stderr]) { stream?.destroy?.(); stream?.unref?.(); }
          child?.unref?.();
        };
        const fail = cleanupConfirmed => {
          if (done) return; done = true; dispose();
          reject(Object.assign(Error('BACKUP_PROCESS_REJECTED'), { cleanupConfirmed }));
        };
        const stop = () => {
          if (done || stopping) return; stopping = true; chunks.length = 0;
          // An exited PID can be reused; do not issue taskkill after root exit.
          if (exitObserved) { fail(false); return; }
          try { treeStopped = terminateTree(child?.pid) === true; } catch { treeStopped = false; }
          if (done) return;
          grace = setTimeoutImpl(() => fail(false), 2000);
        };
        const onAbort = () => stop();
        if (!Number.isFinite(startWall) || !Number.isFinite(startMono) || !Number.isFinite(new Date(startWall).getTime())) { fail(true); return; }
        try {
          child = spawnImpl(process.execPath, [entry, '--capture'], { cwd: repository, shell: false, windowsHide: true,
            stdio: ['pipe', 'pipe', 'pipe'], env: { PATH: process.env.PATH, SystemRoot: process.env.SystemRoot, WINDIR: process.env.SystemRoot } });
        } catch { fail(true); return; }
        child.on('error', () => { if (!Number.isSafeInteger(child.pid)) fail(true); else stop(); });
        child.on('exit', () => { exitObserved = true; });
        child.stdout.on('data', chunk => {
          if (done || stopping) return;
          if (!Buffer.isBuffer(chunk) || (stdoutBytes += chunk.length) > 65536) { stop(); return; }
          chunks.push(chunk);
        });
        child.stderr.on('data', chunk => { if (!done) { stderrBytes += chunk.length; if (chunk.length) stop(); } });
        for (const stream of [child.stdin, child.stdout, child.stderr]) stream.on('error', stop);
        child.on('close', (code, nativeSignal) => {
          if (done) return;
          if (stopping) { fail(treeStopped); return; }
          if (code !== 0 || nativeSignal || stderrBytes !== 0) { fail(false); return; }
          try {
            const endWall = now(), elapsed = monotonicNow() - startMono;
            if (!Number.isFinite(endWall) || endWall < startWall || !Number.isFinite(elapsed) || elapsed < 0 || elapsed > 300000) throw Error();
            const raw = Buffer.concat(chunks);
            const output = parseStrictJson(new TextDecoder('utf-8', { fatal: true }).decode(raw));
            if (!validOutput(output, sourceCommit)) throw Error();
            const result = { startedAt: new Date(startWall).toISOString(), completedAt: new Date(endWall).toISOString(),
              native: { kind: 'process', exitCode: code, signal: null, error: null, captureComplete: true, stdoutBytes, stderrBytes },
              stdoutSha256: hash(raw), output };
            done = true; dispose(); resolve(result);
          } catch { fail(false); }
        });
        timer = setTimeoutImpl(stop, 300000);
        signal?.addEventListener('abort', onAbort, { once: true });
        if (signal?.aborted) { stop(); return; }
        try { child.stdin.end(bytes); } catch { stop(); }
      });
    },
  };
}

// Produces a native-process observation. The nine-stage adapter still needs
// independently accepted source-state/rehearsal data; this cannot declare GO.
export function createBackupProcessReceipt({ store = createBackupArtifactStore(), transport = createBackupProcessTransport(),
  verifySource = verifyBackupAcquisitionSource, now = Date.now } = {}) {
  return {
    async run(request, { signal } = {}) {
      let cleanupConfirmed = true;
      try {
        require(exact(request, ['acquisition', 'processReceiptDirectory']));
        const inputBytes = Buffer.from(JSON.stringify(request.acquisition)); require(inputBytes.length <= 1048576);
        const acquisition = parseStrictJson(inputBytes.toString('utf8')), directory = request.processReceiptDirectory;
        require(typeof acquisition.sourceCommit === 'string' && /^[a-f0-9]{40}$/.test(acquisition.sourceCommit) &&
          acquisition.captureInput?.target === 'production' && isHash(acquisition.captureInput.expectedBindingSha256));
        assertDistinctBackupDirectories(directory, acquisition.directory);
        assertDistinctBackupDirectories(directory, acquisition.receiptDirectory);
        const producerFiles = verifySource(acquisition.sourceCommit); sourceShape(producerFiles);
        require(store.prepareDirectory({ directory }).status === 'EMPTY_RESTRICTED_DIRECTORY_VERIFIED');
        cleanupConfirmed = false;
        const observed = await transport.run(acquisition, { signal }); cleanupConfirmed = true;
        const output = observed.output;
        require(validOutput(output, acquisition.sourceCommit) && isHash(observed.stdoutSha256));
        require(exact(observed.native, ['kind', 'exitCode', 'signal', 'error', 'captureComplete', 'stdoutBytes', 'stderrBytes']) &&
          observed.native.kind === 'process' && observed.native.exitCode === 0 && observed.native.signal === null && observed.native.error === null &&
          observed.native.captureComplete === true && observed.native.stderrBytes === 0 && Number.isSafeInteger(observed.native.stdoutBytes) &&
          observed.native.stdoutBytes > 0 && observed.native.stdoutBytes <= 65536);
        const saved = store.inspectRecord({ directory: acquisition.receiptDirectory, expectedSha256: output.recordSha256 });
        require(saved.status === 'PERSISTED_RECORD_VERIFIED' && saved.sha256 === output.recordSha256 && saved.bytes === output.recordBytes);
        const record = saved.record;
        require(exact(record, ['schemaVersion', 'kind', 'acquisitionAuthority', 'runId', 'sourceCommit', 'producerFiles', 'sourceBindingSha256',
          'capture', 'manifestSha256', 'files', 'createdAt']) && record.schemaVersion === 1 && record.kind === 'backup-acquisition-observation' && record.acquisitionAuthority === 'UNESTABLISHED' &&
          record.sourceCommit === acquisition.sourceCommit && record.runId === output.runId && record.manifestSha256 === output.manifestSha256 &&
          record.sourceBindingSha256 === acquisition.captureInput.expectedBindingSha256 && same(record.producerFiles, producerFiles));
        const nativeFiles = store.inspect({ directory: acquisition.directory, expectedManifestSha256: output.manifestSha256 });
        require(nativeFiles.status === 'PERSISTED_BYTES_VERIFIED' && nativeFiles.manifestSha256 === output.manifestSha256 && same(nativeFiles.artifacts, record.files));
        const names = ['roles.sql', 'schema.sql', 'auth_storage_changes.sql', 'data.sql', 'history_schema.sql', 'history_data.sql'];
        require(Array.isArray(record.files) && record.files.length === names.length && record.files.every((file, i) =>
          exact(file, ['name', 'bytes', 'sha256']) && file.name === names[i] && isHash(file.sha256) && Number.isSafeInteger(file.bytes) &&
          file.bytes >= (i === 2 ? 0 : 1) && file.bytes <= 32 * 1024 * 1024));
        const c = record.capture;
        require(exact(c, ['startedAt', 'completedAt', 't0', 'sourceBindingSha256', 'snapshotSha256', 'exporterClosedObservedAt',
          'dumps', 'checksumCompletedAt', 'vectorExclusion', 'sourceState']) && c.sourceBindingSha256 === record.sourceBindingSha256 && isHash(c.snapshotSha256));
        validateBackupSourceState(c.sourceState);
        require(time(observed.startedAt) <= time(c.startedAt) && time(c.startedAt) <= time(c.t0) + 1000 &&
          time(c.t0) - 1000 <= time(c.checksumCompletedAt) && time(c.checksumCompletedAt) <= time(c.exporterClosedObservedAt) &&
          time(c.exporterClosedObservedAt) <= time(c.completedAt) && time(c.completedAt) <= time(record.createdAt));
        const dumpNames = ['roles', 'schema', 'data', 'historySchema', 'historyData'];
        require(Array.isArray(c.dumps) && c.dumps.length === 5);
        let previous = time(c.startedAt);
        c.dumps.forEach((dump, i) => {
          require(exact(dump, ['name', 'snapshotSha256', 'startedAt', 'completedAt', 'rawSha256', 'exitCode', 'captureComplete', 'stderrBytes', 'clientMajor']) &&
            dump.name === dumpNames[i] && dump.snapshotSha256 === (i === 0 ? null : c.snapshotSha256) && isHash(dump.rawSha256) &&
            dump.exitCode === 0 && dump.captureComplete === true && dump.stderrBytes === 0 && dump.clientMajor === 17);
          require(time(dump.startedAt) >= previous && time(dump.completedAt) >= time(dump.startedAt) &&
            time(dump.completedAt) <= time(c.checksumCompletedAt) && (i === 0 || time(dump.startedAt) >= time(c.t0) - 1000));
          previous = time(dump.completedAt);
        });
        require(exact(c.vectorExclusion, ['snapshotSha256', 'counts']) && c.vectorExclusion.snapshotSha256 === c.snapshotSha256 &&
          exact(c.vectorExclusion.counts, ['storage.buckets_vectors', 'storage.vector_indexes']) && Object.values(c.vectorExclusion.counts).every(value => value === 0));
        require(time(record.capture.completedAt) <= time(output.verifiedAt) &&
          time(record.createdAt) <= time(output.verifiedAt) && time(output.verifiedAt) <= time(observed.completedAt));
        const after = verifySource(acquisition.sourceCommit); sourceShape(after); require(same(after, producerFiles));
        const checkpoint = () => { const value = now(); require(Number.isFinite(value) && value >= time(observed.completedAt) && value <= time(record.capture.t0) + 299000); return new Date(value).toISOString(); };
        // Exact finalBackup observation shape. Only this native validation path
        // constructs it; the outer nine-stage authority/policy is still required.
        // Rehearsal cannot use restore:null and remains blocked on real restore.
        const backupObservation = { schemaVersion: 1, t0: c.t0, snapshotSha256: c.snapshotSha256,
          exporter: { isolation: 'repeatable read', readOnly: true, serverMajor: 17,
            closedAt: c.exporterClosedObservedAt, exitCode: 0, captureComplete: true, stderrBytes: 0,
            vectorExclusion: c.vectorExclusion },
          dumps: c.dumps.map((dump, i) => ({ ...dump, name: names[[0, 1, 3, 4, 5][i]] })),
          checksumCompletedAt: c.checksumCompletedAt, manifestSha256: record.manifestSha256, files: record.files,
          authReviewSha256: record.files[2].sha256, sourceState: c.sourceState, restore: null };
        const receipt = { schemaVersion: 1, kind: 'backup-native-process-observation', acquisitionAuthority: 'UNESTABLISHED',
          sourceCommit: acquisition.sourceCommit, runId: record.runId, sourceBindingSha256: record.sourceBindingSha256, producerFiles,
          startedAt: observed.startedAt, completedAt: observed.completedAt, native: observed.native, stdoutSha256: observed.stdoutSha256,
          acquisitionRecord: { sha256: saved.sha256, bytes: saved.bytes }, manifestSha256: output.manifestSha256, files: record.files,
          backupObservation, createdAt: checkpoint() };
        const persisted = store.persistRecord({ directory, name: 'backup-process.json', record: receipt });
        require(persisted.status === 'PERSISTED_RECORD_VERIFIED' && isHash(persisted.sha256));
        const readback = store.inspectRecord({ directory, name: 'backup-process.json', expectedSha256: persisted.sha256 });
        require(readback.status === 'PERSISTED_RECORD_VERIFIED' && readback.sha256 === persisted.sha256 && readback.bytes === persisted.bytes && same(readback.record, receipt));
        const verifiedAt = checkpoint(); require(time(verifiedAt) >= time(receipt.createdAt));
        return { status: 'BACKUP_NATIVE_PROCESS_OBSERVATION_PERSISTED', runId: record.runId, sourceCommit: acquisition.sourceCommit,
          receiptSha256: persisted.sha256, receiptBytes: persisted.bytes, verifiedAt, stageAuthority: false, gate: 'NO-GO' };
      } catch (e) {
        throw Object.assign(Error('BACKUP_PROCESS_RECEIPT_REJECTED'), {
          cleanupConfirmed: typeof e?.cleanupConfirmed === 'boolean' ? e.cleanupConfirmed : cleanupConfirmed });
      }
    },
  };
}

export async function runBackupAcquisitionProcess(request, options) {
  return createBackupProcessReceipt().run(request, options);
}
