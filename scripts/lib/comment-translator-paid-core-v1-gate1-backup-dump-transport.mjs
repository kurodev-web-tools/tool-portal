import { createHash } from 'node:crypto';
import { gunzipSync } from 'node:zlib';

const MAX_BYTES = 32 * 1024 * 1024;
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const isHash = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
const bounded = value => Number.isSafeInteger(value) && value > 0 && value <= MAX_BYTES;

// Native pg_dump plain stdout is text-mode on Windows. Gzip stdout is binary;
// decode that transport without replacing any SQL bytes (including CR/LF).
export function decodeBackupDumpOutput(stdout, encoding) {
  if (!Buffer.isBuffer(stdout) || !bounded(stdout.length) || !['plain', 'gzip'].includes(encoding)) {
    throw Error('BACKUP_CAPTURE_INVALID');
  }
  let decoded = stdout;
  if (encoding === 'gzip') {
    try {
      const result = gunzipSync(stdout, { maxOutputLength: MAX_BYTES, info: true });
      // In particular, reject zero padding silently ignored by older zlib.
      if (result.engine.bytesWritten !== stdout.length) throw Error();
      decoded = result.buffer;
    } catch (e) {
      throw Error(e.code === 'ERR_BUFFER_TOO_LARGE' ? 'BACKUP_CAPTURE_LIMIT' : 'BACKUP_CAPTURE_INVALID');
    }
  }
  let text;
  try { text = new TextDecoder('utf-8', { fatal: true }).decode(decoded); }
  catch { throw Error('BACKUP_CAPTURE_INVALID'); }
  if (!bounded(decoded.length) || !text.trim() || text.includes('\0') || !Buffer.from(text).equals(decoded)) {
    throw Error('BACKUP_CAPTURE_INVALID');
  }
  // rawSha256 stays the pre-transform SQL hash; stdoutSha256 records the
  // compressed native bytes separately, so neither identity is discarded.
  return { text, rawSha256: hash(decoded), transport: {
    encoding, stdoutBytes: stdout.length, stdoutSha256: hash(stdout), decodedBytes: decoded.length,
  } };
}

// Shared by acquisition, native receipt and final stage readers. Old plain
// snapshot-dump observations cannot be mistaken for the repaired transport.
export function validBackupDumpTransport(dump, index) {
  const t = dump?.transport;
  return Number.isInteger(index) && index >= 0 && index < 5 && t !== null && typeof t === 'object' && !Array.isArray(t) &&
    Object.keys(t).sort().join(',') === 'decodedBytes,encoding,stdoutBytes,stdoutSha256' &&
    t.encoding === (index === 0 ? 'plain' : 'gzip') && bounded(t.stdoutBytes) && bounded(t.decodedBytes) &&
    isHash(t.stdoutSha256) && isHash(dump.rawSha256) &&
    (index !== 0 || (t.stdoutSha256 === dump.rawSha256 && t.stdoutBytes === t.decodedBytes));
}
