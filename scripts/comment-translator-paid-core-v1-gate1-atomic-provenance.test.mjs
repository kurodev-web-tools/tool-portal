import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createHash } from 'node:crypto';
import { createAtomicSourceVerifier, ATOMIC_EXECUTOR_FILES } from './lib/comment-translator-paid-core-v1-gate1-atomic-provenance.mjs';
import { BACKUP_ACQUISITION_PRODUCERS } from './lib/comment-translator-paid-core-v1-gate1-backup-acquisition.mjs';
const hash = x => createHash('sha256').update(x).digest('hex');
const captureCommit = 'a'.repeat(40), executorCommit = 'b'.repeat(40);
function fixture() {
  const old = new Map(BACKUP_ACQUISITION_PRODUCERS.map(p => [p, Buffer.from('old:' + p)]));
  const current = new Map(ATOMIC_EXECUTOR_FILES.map(p => [p, Buffer.from('new:' + p)]));
  const input = { captureCommit, executorCommit, producerFiles: [...old].map(([path, bytes]) => ({ path, sha256: hash(bytes) })) };
  const io = { readBlob: (commit, p) => (commit === captureCommit ? old : current).get(p),
    readCurrent: p => current.get(p), published: () => true };
  return { old, current, input, io };
}
test('historical producer hashes and loaded executor bytes have separate identities', () => {
  const f = fixture(), verify = createAtomicSourceVerifier(f.io);
  const r = verify(f.input);
  assert.equal(r.captureCommit, captureCommit); assert.equal(r.executorCommit, executorCommit);
  assert.equal(r.captureProducerCount, 13); assert.ok(r.executorFiles.length > 13);
});
test('capture tamper, missing/extra/reordered producer and unrelated publication reject', () => {
  for (const change of [f => f.input.producerFiles[0].sha256 = hash('wrong'), f => f.input.producerFiles.pop(),
    f => f.input.producerFiles.push(f.input.producerFiles[0]), f => f.input.producerFiles.reverse(),
    f => f.io.published = () => false]) {
    const f = fixture(); change(f); assert.throws(() => createAtomicSourceVerifier(f.io)(f.input), /ATOMIC_PROVENANCE_REJECTED/);
  }
});
test('modified loaded or current executor cannot claim the published commit', () => {
  const f = fixture(), verify = createAtomicSourceVerifier(f.io);
  f.current.set(ATOMIC_EXECUTOR_FILES[0], Buffer.from('changed after load'));
  assert.throws(() => verify(f.input), /ATOMIC_PROVENANCE_REJECTED/);
  const g = fixture(); g.io.readBlob = () => Buffer.from('different published source');
  assert.throws(() => createAtomicSourceVerifier(g.io)(g.input), /ATOMIC_PROVENANCE_REJECTED/);
});
