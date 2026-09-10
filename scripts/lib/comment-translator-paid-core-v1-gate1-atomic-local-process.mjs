import { spawn, spawnSync } from 'node:child_process';
import { buildAtomicRestore, ATOMIC_FINGERPRINT_SETUP_SQL } from './comment-translator-paid-core-v1-gate1-atomic-restore.mjs';
import { parseStrictJson } from './comment-translator-paid-core-v1-gate1-evidence.mjs';

// Explicit socket overrides any remote Docker context in the caller's shell.
export const ATOMIC_LOCAL_DOCKER_ARGS = Object.freeze(['--host', process.platform === 'win32'
  ? 'npipe:////./pipe/dockerDesktopLinuxEngine' : 'unix:///var/run/docker.sock']);

// Explicitly synthetic, exclusively owned Docker destination. No hosted URL,
// credentials, caller command, SQL reset, or publication bypass is accepted.
export function createAtomicLocalProcess({ container, owner, timeoutMs = 600000 } = {}) {
  if (!/^ct-atomic-[a-f0-9]{24}$/.test(owner ?? '') || container !== `${owner}-db` ||
      !Number.isSafeInteger(timeoutMs) || timeoutMs < 100 || timeoutMs > 600000) throw Error('ATOMIC_LOCAL_CONTEXT_REJECTED');
  const inspect = spawnSync('docker', [...ATOMIC_LOCAL_DOCKER_ARGS, 'inspect', '--format', '{{index .Config.Labels "com.comment_translator.atomic"}}', container],
    { encoding: 'utf8', windowsHide: true, timeout: 10000, maxBuffer: 65536 });
  if (inspect.status !== 0 || inspect.error || inspect.signal || inspect.stdout.trim() !== owner) throw Error('ATOMIC_LOCAL_CONTEXT_REJECTED');
  const args = [...ATOMIC_LOCAL_DOCKER_ARGS,'exec','-i',container,'psql','-X','-qAt','-U','supabase_admin','-d','postgres','-v','ON_ERROR_STOP=1','-v','VERBOSITY=default','--file=-'];
  const pg = (sql, signal, remaining) => new Promise((resolve, reject) => {
    let child, timer, done = false, exited = false, size = 0, reason = 'NATIVE_FAILURE';
    const chunks = [];
    const fail = cleanupConfirmed => {
      if (done) return; done = true; clearTimeout(timer); signal?.removeEventListener('abort', stop);
      chunks.length = 0; child?.stdin.destroy(); child?.stdout.destroy(); child?.stderr.destroy(); child?.unref();
      reject(Object.assign(Error('ATOMIC_LOCAL_PROCESS_REJECTED'), { cleanupConfirmed, reason }));
    };
    const stop = () => {
      if (done) return;
      // Killing docker.exe does not establish server-side rollback. Stop this
      // exclusively owned synthetic DB and still reject, even after COMMIT.
      const stopped = spawnSync('docker', [...ATOMIC_LOCAL_DOCKER_ARGS,'stop','--time','1',container], { windowsHide: true, timeout: 10000, maxBuffer: 65536 });
      if (!exited) { try { child?.kill(); } catch { /* unknown => rejection */ } }
      fail(stopped.status === 0 && !stopped.error && !stopped.signal);
    };
    if (signal?.aborted || remaining <= 0) { fail(true); return; }
    try { child = spawn('docker', args, { shell: false, windowsHide: true, stdio: ['pipe','pipe','pipe'] }); }
    catch { fail(true); return; }
    child.on('error', stop); child.on('exit', () => { exited = true; });
    for (const stream of [child.stdin,child.stdout,child.stderr]) stream.on('error', stop);
    child.stdout.on('data', chunk => { if (done) return; size += chunk.length; if (size > 65536) stop(); else chunks.push(chunk); });
    child.stderr.on('data', chunk => { if (!done && chunk.length) {
      reason = chunk.toString('utf8').match(/ATOMIC_[A-Z_]+|syntax error|permission denied/)?.[0] ?? 'STDERR_OBSERVED'; stop();
    } });
    child.on('close', (code, nativeSignal) => {
      if (done) return;
      if (code !== 0 || nativeSignal) { fail(false); return; }
      done = true; clearTimeout(timer); signal?.removeEventListener('abort', stop);
      resolve(Buffer.concat(chunks).toString('utf8').trim());
    });
    timer = setTimeout(stop, remaining);
    signal?.addEventListener('abort', stop, { once: true });
    if (signal?.aborted) { stop(); return; }
    child.stdin.end(sql);
  });
  return { async run(request, { signal } = {}) {
    if (signal !== undefined && !(signal instanceof AbortSignal)) throw Error('ATOMIC_LOCAL_CONTEXT_REJECTED');
    const candidate = buildAtomicRestore(request), started = performance.now();
    try {
      const output = await pg(candidate.sql, signal, timeoutMs);
      const precommit = parseStrictJson(output.split(/\r?\n/).at(-1));
      if (precommit?.kind !== 'atomic-precommit-v1' || Object.keys(precommit).sort().join(',') !== 'fingerprint,kind') throw Error();
      const remaining = Math.floor(timeoutMs - (performance.now() - started));
      const independent = parseStrictJson(await pg(`BEGIN; SET LOCAL row_security=off; SET LOCAL search_path=pg_catalog,public; ${ATOMIC_FINGERPRINT_SETUP_SQL}
SELECT pg_temp.ct_atomic_fingerprint(false); ROLLBACK;`, signal, remaining));
      // PostgreSQL jsonb output has deterministic object order in both processes.
      if (JSON.stringify(independent) !== JSON.stringify(precommit.fingerprint)) throw Error();
      const elapsed = performance.now() - started;
      if (!Number.isFinite(elapsed) || elapsed < 0 || elapsed > timeoutMs || signal?.aborted) throw Error();
      return { schemaVersion: 1, status: 'ATOMIC_LOCAL_RESTORE_RESET_OBSERVED', scope: 'LOCAL_SYNTHETIC_ONLY',
        artifacts: candidate.artifacts, preResetSourceStateMatched: true, resetDeltaMatched: true,
        independentCommittedReadbackMatched: true, stageAuthority: false, gate: 'NO-GO' };
    } catch (error) {
      throw Object.assign(Error('ATOMIC_LOCAL_PROCESS_REJECTED'), { cleanupConfirmed: error?.cleanupConfirmed === true, reason: error?.reason ?? 'READBACK_REJECTED' });
    }
  } };
}
