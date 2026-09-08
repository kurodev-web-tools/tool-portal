import assert from 'node:assert/strict';
import { test } from 'node:test';
import { spawnSync, spawn } from 'node:child_process';
import { observeBackupArtifacts } from './comment-translator-paid-core-v1-gate1-backup-observe.mjs';

const entry = 'scripts/comment-translator-paid-core-v1-gate1-backup-observe.mjs';
function cli(args, input = Buffer.alloc(0)) {
  const r = spawnSync(process.execPath, [entry, ...args], { input, timeout: 15000, maxBuffer: 65536, shell: false, windowsHide: true });
  assert.equal(r.error, undefined); assert.equal(r.signal, null); assert.equal(r.status, 2); assert.equal(r.stderr.length, 0);
  const lines = r.stdout.toString('utf8').trim().split('\n'); assert.equal(lines.length, 1);
  const result = JSON.parse(lines[0]);
  assert.equal(result.status, 'BACKUP_OBSERVATION_UNAVAILABLE'); assert.equal(result.writes, 0); assert.equal(result.remoteCalls, 0);
  assert.ok(!lines[0].includes('private-canary')); return result;
}
test('import is inert and unsupported invocation never reads private input', () => {
  const r = spawnSync(process.execPath, ['--input-type=module', '-e', `await import('./${entry}');`], { timeout: 15000, maxBuffer: 65536 });
  assert.equal(r.status, 0); assert.equal(r.stdout.length, 0); assert.equal(r.stderr.length, 0);
  assert.equal(cli([], Buffer.from('private-canary')).reason, 'REQUEST_REQUIRED');
  assert.equal(cli(['--other']).reason, 'REQUEST_REQUIRED');
  assert.equal(cli(['--inspect', '--extra']).reason, 'REQUEST_REQUIRED');
});
test('strict bounded UTF8/JSON rejects malformed, duplicate and secret-bearing requests', () => {
  for (const input of [Buffer.from('private-canary'), Buffer.from([0xff]), Buffer.from('{"schemaVersion":1,"schemaVersion":1}'), Buffer.from('')]) {
    assert.equal(cli(['--inspect'], input).reason, 'INPUT_INVALID');
  }
  assert.equal(cli(['--inspect'], Buffer.alloc(65537, 32)).reason, 'INPUT_LIMIT');
});
test('exact native request shape rejects unsupported adapters and invalid digests', () => {
  const base = { schemaVersion: 1, directory: 'private-canary', expectedManifestSha256: '0'.repeat(64) };
  for (const value of [null, [], {}, { ...base, fsApi: {} }, { ...base, expectedManifestSha256: 1 }, { ...base, schemaVersion: 2 }]) {
    assert.equal(observeBackupArtifacts(value).reason, 'REQUEST_INVALID');
  }
  assert.equal(observeBackupArtifacts(base).reason, 'INSPECTION_FAILED');
  assert.equal(cli(['--inspect'], Buffer.from(JSON.stringify(base))).reason, 'INSPECTION_FAILED');
});
test('an open but silent stdin is terminated at the fixed input deadline', async () => {
  const child = spawn(process.execPath, [entry, '--inspect'], { windowsHide: true, shell: false, stdio: ['pipe', 'pipe', 'pipe'] });
  let stdout = '', stderr = '';
  child.stdout.on('data', data => { stdout += data; }); child.stderr.on('data', data => { stderr += data; });
  const timer = setTimeout(() => child.kill(), 14000);
  const result = await new Promise((resolve, reject) => { child.once('error', reject); child.once('close', (code, signal) => resolve({code,signal})); });
  clearTimeout(timer);
  assert.equal(result.code, 2); assert.equal(result.signal, null); assert.equal(stderr, '');
  assert.equal(JSON.parse(stdout).reason, 'INPUT_TIMEOUT');
});
