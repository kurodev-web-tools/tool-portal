import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseStrictJson } from './lib/comment-translator-paid-core-v1-gate1-evidence.mjs';
import { inspectBackupArtifacts } from './lib/comment-translator-paid-core-v1-gate1-backup-artifacts.mjs';

const unavailable = reason => ({ schemaVersion: 1, status: 'BACKUP_OBSERVATION_UNAVAILABLE', reason, writes: 0, remoteCalls: 0 });

// Actual process observations still require the parent's independently approved
// source/target policy and outer native receipt before any R3 stage can pass.
export function observeBackupArtifacts(request) {
  if (!request || typeof request !== 'object' || Array.isArray(request) ||
      Object.keys(request).sort().join(',') !== 'directory,expectedManifestSha256,schemaVersion' ||
      request.schemaVersion !== 1 || typeof request.directory !== 'string' ||
      typeof request.expectedManifestSha256 !== 'string' || !/^[a-f0-9]{64}$/.test(request.expectedManifestSha256)) {
    return unavailable('REQUEST_INVALID');
  }
  const startedAt = new Date().toISOString();
  try {
    const observation = inspectBackupArtifacts(request);
    return { schemaVersion: 1, status: 'BACKUP_ARTIFACT_OBSERVATION_VALID', startedAt,
      completedAt: new Date().toISOString(), observation };
  } catch { return unavailable('INSPECTION_FAILED'); }
}

function readRequest() {
  return new Promise((resolve, reject) => {
    const chunks = []; let bytes = 0, settled = false;
    const finish = (reason, value) => {
      if (settled) return;
      settled = true; clearTimeout(timer);
      process.stdin.removeListener('data', onData); process.stdin.removeListener('end', onEnd);
      process.stdin.removeListener('error', onError);
      if (reason) { process.stdin.destroy(); reject(new Error(reason)); } else resolve(value);
    };
    const onData = chunk => {
      if (!Buffer.isBuffer(chunk)) { finish('INPUT_INVALID'); return; }
      bytes += chunk.length;
      if (bytes > 65536) { finish('INPUT_LIMIT'); return; }
      chunks.push(chunk);
    };
    const onEnd = () => {
      try { finish(null, parseStrictJson(new TextDecoder('utf-8', { fatal: true }).decode(Buffer.concat(chunks)))); }
      catch { finish('INPUT_INVALID'); }
    };
    const onError = () => finish('INPUT_INVALID');
    const timer = setTimeout(() => finish('INPUT_TIMEOUT'), 10000);
    process.stdin.on('data', onData); process.stdin.once('end', onEnd); process.stdin.once('error', onError);
  });
}

async function main() {
  let result;
  if (process.argv.length !== 3 || process.argv[2] !== '--inspect') result = unavailable('REQUEST_REQUIRED');
  else {
    try { result = observeBackupArtifacts(await readRequest()); }
    catch (e) { result = unavailable(['INPUT_INVALID', 'INPUT_LIMIT', 'INPUT_TIMEOUT'].includes(e.message) ? e.message : 'INPUT_INVALID'); }
  }
  process.stdout.write(JSON.stringify(result) + '\n');
  if (result.status !== 'BACKUP_ARTIFACT_OBSERVATION_VALID') process.exitCode = 2;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
