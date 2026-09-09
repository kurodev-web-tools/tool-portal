import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createHash } from 'node:crypto';
import { gzipSync } from 'node:zlib';
import { decodeBackupDumpOutput, validBackupDumpTransport } from './lib/comment-translator-paid-core-v1-gate1-backup-dump-transport.mjs';

const hash = b => createHash('sha256').update(b).digest('hex');
test('gzip decode retains every original SQL byte and both native and decoded hashes', () => {
  const original = Buffer.from("SELECT 'LF\nCRLF\r\nCR\r😀日本語';\n");
  const compressed = gzipSync(original);
  const r = decodeBackupDumpOutput(compressed, 'gzip');
  assert.deepEqual(Buffer.from(r.text), original);
  assert.equal(r.rawSha256, hash(original));
  assert.deepEqual(r.transport, { encoding: 'gzip', stdoutBytes: compressed.length,
    stdoutSha256: hash(compressed), decodedBytes: original.length });
  assert.ok(validBackupDumpTransport(r, 1));
  assert.equal(validBackupDumpTransport(r, 0), false);
});

test('non-gzip, corrupt checksum, truncated stream and trailing padding are rejected', () => {
  const good = gzipSync('SELECT 1;\n'), corrupt = Buffer.from(good);
  corrupt[corrupt.length - 8] ^= 1;
  for (const b of [Buffer.from('SELECT 1;\n'), corrupt, good.subarray(0, good.length - 1),
    Buffer.concat([good, Buffer.from([0])]), Buffer.concat([good, Buffer.from('junk')])]) {
    assert.throws(() => decodeBackupDumpOutput(b, 'gzip'), /BACKUP_CAPTURE_INVALID/);
  }
});

test('UTF8 and SQL byte constraints apply after decompression without silent replacement', () => {
  for (const b of [Buffer.from([0xff]), Buffer.from([0xef, 0xbb, 0xbf, 65]), Buffer.from('a\0b'), Buffer.from('  \n'), Buffer.alloc(0)]) {
    for (const encoding of ['plain', 'gzip']) {
      assert.throws(() => decodeBackupDumpOutput(encoding === 'gzip' ? gzipSync(b) : b, encoding), /BACKUP_CAPTURE_INVALID/);
    }
  }
  assert.throws(() => decodeBackupDumpOutput(gzipSync(Buffer.alloc(32 * 1024 * 1024 + 1, 65)), 'gzip'), /BACKUP_CAPTURE_LIMIT/);
});

test('transport evidence is exact and binds plain roles to their native byte identity', () => {
  const plain = decodeBackupDumpOutput(Buffer.from('SELECT 1;\r\n'), 'plain');
  assert.ok(validBackupDumpTransport(plain, 0));
  for (const change of [r => { r.transport.extra = true; }, r => { r.transport.encoding = 'gzip'; },
    r => { r.transport.stdoutBytes = 0; }, r => { r.transport.decodedBytes++; },
    r => { r.transport.stdoutSha256 = 'a'.repeat(64); }, r => { delete r.transport; }]) {
    const r = structuredClone(plain); change(r); assert.equal(validBackupDumpTransport(r, 0), false);
  }
  for (const i of [-1, 5, 0.5, NaN]) assert.equal(validBackupDumpTransport(plain, i), false);
});
