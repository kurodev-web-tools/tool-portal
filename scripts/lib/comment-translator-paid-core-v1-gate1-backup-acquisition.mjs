import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { createHash, randomBytes } from 'node:crypto';
import { createBackupCapture } from './comment-translator-paid-core-v1-gate1-backup-capture.mjs';
import { createBackupArtifactStore } from './comment-translator-paid-core-v1-gate1-backup-artifacts.mjs';
import { validateBackupSourceState } from './comment-translator-paid-core-v1-gate1-backup-state.mjs';

const repository = fileURLToPath(new URL('../..', import.meta.url));
const hash = value => createHash('sha256').update(value).digest('hex');
const isHash = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
const exact = (value, keys) => value !== null && typeof value === 'object' && !Array.isArray(value) &&
  Object.keys(value).sort().join(',') === [...keys].sort().join(',');
const require = value => { if (!value) throw Error('BACKUP_ACQUISITION_REJECTED'); };
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const fileNames = ['roles.sql', 'schema.sql', 'auth_storage_changes.sql', 'data.sql', 'history_schema.sql', 'history_data.sql'];
const dumpNames = ['roles', 'schema', 'data', 'historySchema', 'historyData'];
const dumpFileIndices = [0, 1, 3, 4, 5];

export const BACKUP_ACQUISITION_PRODUCERS = Object.freeze([
  'scripts/comment-translator-paid-core-v1-gate1-backup-acquire.mjs',
  'scripts/lib/comment-translator-paid-core-v1-gate1-backup-process.mjs',
  'scripts/lib/comment-translator-paid-core-v1-gate1-backup-acquisition.mjs',
  'scripts/lib/comment-translator-paid-core-v1-gate1-backup-capture.mjs',
  'scripts/lib/comment-translator-paid-core-v1-gate1-backup-snapshot.mjs',
  'scripts/lib/comment-translator-paid-core-v1-gate1-backup-state.mjs',
  'scripts/lib/comment-translator-paid-core-v1-gate1-backup-default-acl.mjs',
  'scripts/lib/comment-translator-paid-core-v1-gate1-backup-artifacts.mjs',
  'scripts/lib/comment-translator-paid-core-v1-gate1-restore-sql.mjs',
  'scripts/lib/comment-translator-paid-core-v1-gate1-evidence.mjs',
  'scripts/lib/comment-translator-paid-core-v1-gate1-catalog.mjs',
  'scripts/comment-translator-paid-core-v1-gate1-preflight-readonly.mjs',
]);
// Bind the loaded producer set as well as checking the current files. The
// operational entry must run in a fresh process from the accepted commit.
const loaded = new Map(BACKUP_ACQUISITION_PRODUCERS.map(file => [file, fs.readFileSync(path.join(repository, file))]));
export function verifyBackupAcquisitionSource(sourceCommit) {
  require(typeof sourceCommit === 'string' && /^[a-f0-9]{40}$/.test(sourceCommit));
  return BACKUP_ACQUISITION_PRODUCERS.map(file => {
    const local = path.join(repository, file), stat = fs.lstatSync(local);
    require(stat.isFile() && !stat.isSymbolicLink());
    const result = spawnSync('git', ['--no-replace-objects', '--no-optional-locks', 'show', `${sourceCommit}:${file}`], {
      cwd: repository, shell: false, windowsHide: true, timeout: 5000, maxBuffer: 4 * 1024 * 1024,
      env: { PATH: process.env.PATH, SystemRoot: process.env.SystemRoot, WINDIR: process.env.SystemRoot },
    });
    require(!result.error && !result.signal && result.status === 0 && Buffer.isBuffer(result.stdout) &&
      Buffer.isBuffer(result.stderr) && result.stderr.length === 0 && result.stdout.equals(loaded.get(file)) &&
      fs.readFileSync(local).equals(loaded.get(file)));
    return { path: file, sha256: hash(result.stdout) };
  });
}
function sourceShape(files) {
  require(Array.isArray(files) && files.length === BACKUP_ACQUISITION_PRODUCERS.length);
  files.forEach((file, i) => require(exact(file, ['path', 'sha256']) &&
    file.path === BACKUP_ACQUISITION_PRODUCERS[i] && isHash(file.sha256)));
}
export function assertDistinctBackupDirectories(a, b) {
  require(typeof a === 'string' && typeof b === 'string' && path.win32.isAbsolute(a) && path.win32.isAbsolute(b));
  for (const [root, candidate] of [[a, b], [b, a]]) {
    const relative = path.win32.relative(root, candidate);
    require(relative !== '' && (relative === '..' || relative.startsWith('..\\') || path.win32.isAbsolute(relative)));
  }
}
function time(value) {
  require(typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?(?:Z|[+-]\d{2}:\d{2})$/.test(value));
  const result = Date.parse(value); require(Number.isFinite(result)); return result;
}
function validateCapture(result, binding, inspection) {
  const e = result?.evidence, o = e?.processObservations, p = e?.persistence;
  require(e?.status === 'CAPTURED_PERSISTED_NOT_AUTHORITY' && e.snapshotDumpCount === 4 && e.exporterClosed === true && inspection);
  require(exact(o, ['startedAt', 'completedAt', 't0', 'sourceBindingSha256', 'snapshotSha256', 'exporterClosedObservedAt', 'dumps']));
  require(o.sourceBindingSha256 === binding && isHash(o.snapshotSha256));
  const start = time(o.startedAt), t0 = time(o.t0), end = time(o.completedAt), closed = time(o.exporterClosedObservedAt);
  require(start <= t0 && end >= closed && closed >= t0);
  require(exact(p, ['manifestSha256', 'files', 'checksumCompletedAt']) && isHash(p.manifestSha256) &&
    p.manifestSha256 === inspection.manifestSha256 && same(p.files, inspection.artifacts));
  const checksum = time(p.checksumCompletedAt);
  require(checksum >= t0 && checksum <= closed && end <= t0 + 300000);
  require(Array.isArray(result.artifacts) && result.artifacts.length === 6 && Array.isArray(p.files) && p.files.length === 6);
  p.files.forEach((file, i) => {
    require(exact(file, ['name', 'bytes', 'sha256']) && file.name === fileNames[i] && isHash(file.sha256) &&
      Number.isSafeInteger(file.bytes) && file.bytes >= (i === 2 ? 0 : 1) && file.bytes <= 32 * 1024 * 1024);
    for (const key of ['name', 'bytes', 'sha256']) require(file[key] === result.artifacts[i]?.[key]);
  });
  require(Array.isArray(o.dumps) && o.dumps.length === 5);
  let previous = start;
  o.dumps.forEach((dump, i) => {
    require(exact(dump, ['name', 'snapshotSha256', 'startedAt', 'completedAt', 'rawSha256', 'exitCode', 'captureComplete', 'stderrBytes', 'clientMajor']));
    require(dump.name === dumpNames[i] && dump.snapshotSha256 === (i === 0 ? null : o.snapshotSha256) &&
      isHash(dump.rawSha256) && dump.rawSha256 === result.artifacts[dumpFileIndices[i]].rawSha256 &&
      dump.exitCode === 0 && dump.captureComplete === true && dump.stderrBytes === 0 && dump.clientMajor === 17);
    const begin = time(dump.startedAt), finish = time(dump.completedAt);
    require(begin >= previous && finish >= begin && finish <= checksum && (i === 0 || begin >= t0)); previous = finish;
  });
  const vector = e.vectorExclusion;
  require(exact(vector, ['snapshotSha256', 'counts']) && vector.snapshotSha256 === o.snapshotSha256 &&
    exact(vector.counts, ['storage.buckets_vectors', 'storage.vector_indexes']) && Object.values(vector.counts).every(value => value === 0));
  validateBackupSourceState(e.sourceState);
  return { ...o, checksumCompletedAt: p.checksumCompletedAt, vectorExclusion: vector, sourceState: e.sourceState };
}

// Factory seams are only for local tests. This creates a source/run-bound
// observation, not the outer native-process receipt or nine-stage authority.
export function createBackupAcquisition({ store = createBackupArtifactStore(), captureFactory = createBackupCapture,
  verifySource = verifyBackupAcquisitionSource, newRunId = () => randomBytes(32).toString('hex'), now = Date.now } = {}) {
  return {
    async run(request) {
      let phase = 'input';
      let cleanupConfirmed = true;
      try {
        require(exact(request, ['sourceCommit', 'directory', 'receiptDirectory', 'captureInput']) &&
          typeof request.sourceCommit === 'string' && /^[a-f0-9]{40}$/.test(request.sourceCommit) &&
          request.captureInput?.target === 'production' && isHash(request.captureInput.expectedBindingSha256));
        const { sourceCommit, directory, receiptDirectory } = request;
        const captureInput = { ...request.captureInput, env: { ...request.captureInput.env },
          preconditions: { ...request.captureInput.preconditions } };
        assertDistinctBackupDirectories(directory, receiptDirectory);
        phase = 'source';
        const producerFiles = verifySource(sourceCommit); sourceShape(producerFiles);
        const runId = newRunId(); require(isHash(runId));
        phase = 'directories';
        for (const destination of [directory, receiptDirectory]) {
          require(store.prepareDirectory({ directory: destination }).status === 'EMPTY_RESTRICTED_DIRECTORY_VERIFIED');
        }
        let inspection = null;
        const capture = captureFactory({ now, persistWhileHeld: async ({ artifacts }) => {
          require(inspection === null);
          const persisted = store.persist({ directory, artifacts });
          require(persisted.status === 'PERSISTED_AUTHORITY_UNESTABLISHED' && persisted.artifactCount === 6 && isHash(persisted.manifestSha256));
          inspection = store.inspect({ directory, expectedManifestSha256: persisted.manifestSha256 });
          require(inspection.status === 'PERSISTED_BYTES_VERIFIED' && inspection.manifestSha256 === persisted.manifestSha256);
          return inspection;
        } });
        phase = 'capture';
        cleanupConfirmed = false;
        const result = await capture.run(captureInput);
        cleanupConfirmed = result?.evidence?.exporterClosed === true;
        phase = 'capture-validation';
        const observed = validateCapture(result, captureInput.expectedBindingSha256, inspection);
        const checkpoint = () => {
          const value = now();
          require(Number.isFinite(value) && value >= time(observed.completedAt) && value <= time(observed.t0) + 300000);
          return new Date(value).toISOString();
        };
        phase = 'source-postcheck';
        const after = verifySource(sourceCommit); sourceShape(after); require(same(after, producerFiles));
        const record = { schemaVersion: 1, kind: 'backup-acquisition-observation', acquisitionAuthority: 'UNESTABLISHED',
          runId, sourceCommit, producerFiles, sourceBindingSha256: observed.sourceBindingSha256,
          capture: observed, manifestSha256: inspection.manifestSha256, files: inspection.artifacts, createdAt: checkpoint() };
        phase = 'record';
        const saved = store.persistRecord({ directory: receiptDirectory, record });
        require(saved.status === 'PERSISTED_RECORD_VERIFIED' && isHash(saved.sha256));
        const readback = store.inspectRecord({ directory: receiptDirectory, expectedSha256: saved.sha256 });
        require(readback.status === 'PERSISTED_RECORD_VERIFIED' && readback.sha256 === saved.sha256 &&
          readback.bytes === saved.bytes && same(readback.record, record));
        const verifiedAt = checkpoint(); require(time(verifiedAt) >= time(record.createdAt));
        return { status: 'SOURCE_BOUND_BACKUP_OBSERVATION_PERSISTED', runId, sourceCommit,
          manifestSha256: inspection.manifestSha256, recordSha256: saved.sha256, recordBytes: saved.bytes,
          verifiedAt, stageAuthority: false, gate: 'NO-GO' };
      } catch (e) {
        // No SQL, paths, environment, native errors or partial success escapes.
        throw Object.assign(Error('BACKUP_ACQUISITION_REJECTED'), { phase,
          cleanupConfirmed: typeof e?.cleanupConfirmed === 'boolean' ? e.cleanupConfirmed : cleanupConfirmed });
      }
    },
  };
}

// Explicit operational API; never executes on import and accepts no test seams.
export async function captureAndPersistBackup(request) {
  return createBackupAcquisition().run(request);
}
