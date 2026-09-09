import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseStrictJson } from './lib/comment-translator-paid-core-v1-gate1-evidence.mjs';
import { captureAndPersistBackup } from './lib/comment-translator-paid-core-v1-gate1-backup-acquisition.mjs';

function readRequest() {
  return new Promise((resolve, reject) => {
    const chunks = []; let bytes = 0, settled = false;
    const finish = (failed, value) => {
      if (settled) return; settled = true; clearTimeout(timer);
      process.stdin.removeListener('data', onData); process.stdin.removeListener('end', onEnd);
      process.stdin.removeListener('error', onError); chunks.length = 0;
      if (failed) { process.stdin.destroy(); reject(Error('INPUT_INVALID')); } else resolve(value);
    };
    const onData = chunk => {
      if (!Buffer.isBuffer(chunk) || (bytes += chunk.length) > 1048576) { finish(true); return; }
      chunks.push(chunk);
    };
    const onEnd = () => {
      try { finish(false, parseStrictJson(new TextDecoder('utf-8', { fatal: true }).decode(Buffer.concat(chunks)))); }
      catch { finish(true); }
    };
    const onError = () => finish(true);
    const timer = setTimeout(() => finish(true), 10000);
    process.stdin.on('data', onData); process.stdin.once('end', onEnd); process.stdin.once('error', onError);
  });
}

async function main() {
  let result;
  try {
    if (process.argv.length !== 3 || process.argv[2] !== '--capture') throw Error('INPUT_INVALID');
    result = await captureAndPersistBackup(await readRequest());
  } catch (e) {
    const phases = ['input', 'source', 'directories', 'capture', 'capture-validation', 'source-postcheck', 'record'];
    result = { status: 'BACKUP_ACQUISITION_UNAVAILABLE', phase: phases.includes(e?.phase) ? e.phase : 'input',
      cleanupConfirmed: e?.cleanupConfirmed === true };
    process.exitCode = 2;
  }
  process.stdout.write(JSON.stringify(result) + '\n');
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
