import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { performance } from 'node:perf_hooks';
import { createGate1Watchdog, parseWatchdogTimestamp, STOP_EVIDENCE_POLICY } from './lib/comment-translator-paid-core-v1-gate1-watchdog.mjs';
import { createGate1WatchdogTransport } from './lib/comment-translator-paid-core-v1-gate1-watchdog-transport.mjs';
import { inspectBackupArtifacts } from './lib/comment-translator-paid-core-v1-gate1-backup-artifacts.mjs';
import { parseStrictJson } from './lib/comment-translator-paid-core-v1-gate1-evidence.mjs';

const repository = fileURLToPath(new URL('..', import.meta.url));
const sha = value => createHash('sha256').update(value).digest('hex');
const exact = (o, keys) => o !== null && typeof o === 'object' && !Array.isArray(o) &&
  Object.keys(o).sort().join(',') === [...keys].sort().join(',');
const blocked = () => ({ state: 'ABORTED_NO_DDL_NO_PAUSE', decision: 'NO-GO', reason: 'WATCHDOG_STARTUP_BLOCKED',
  remoteCalls: 0, mutations: 0, restoreEligible: false });
const producerPaths = [
  'scripts/comment-translator-paid-core-v1-gate1-watchdog-runner.mjs',
  'scripts/lib/comment-translator-paid-core-v1-gate1-watchdog.mjs',
  'scripts/lib/comment-translator-paid-core-v1-gate1-watchdog-transport.mjs',
  'scripts/lib/comment-translator-paid-core-v1-gate1-backup-artifacts.mjs',
  'scripts/lib/comment-translator-paid-core-v1-gate1-evidence.mjs',
  'scripts/lib/comment-translator-paid-core-v1-gate1-catalog.mjs',
  'scripts/comment-translator-paid-core-v1-gate1-preflight-readonly.mjs',
];
async function verifySourceNative({ repositoryRoot, sourceCommit }) {
  if (!/^[a-f0-9]{40}$/.test(sourceCommit ?? '')) throw Error('WATCHDOG_SOURCE_INVALID');
  for (const file of producerPaths) {
    const result = spawnSync('git', ['show', `${sourceCommit}:${file}`], { cwd: repositoryRoot, shell: false,
      windowsHide: true, timeout: 5000, maxBuffer: 4 * 1024 * 1024 });
    if (result.error || result.signal || result.status !== 0 || result.stderr.length ||
        !Buffer.isBuffer(result.stdout) || !result.stdout.equals(fs.readFileSync(path.join(repositoryRoot, file)))) throw Error('WATCHDOG_SOURCE_INVALID');
  }
}
async function openJournalNative({ repositoryRoot, directory, runId }) {
  if (!/^[a-f0-9]{64}$/.test(runId ?? '') || !path.isAbsolute(directory ?? '')) throw Error('WATCHDOG_JOURNAL_INVALID');
  const allowed = path.resolve(repositoryRoot, '.tmp'), root = path.resolve(directory), relative = path.relative(allowed, root);
  if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) throw Error('WATCHDOG_JOURNAL_INVALID');
  for (let current = root; ; current = path.dirname(current)) {
    const stat = await fs.promises.lstat(current);
    if (!stat.isDirectory() || stat.isSymbolicLink() || path.resolve(await fs.promises.realpath(current)).toLowerCase() !== current.toLowerCase()) throw Error('WATCHDOG_JOURNAL_INVALID');
    if (current === path.parse(current).root) break;
  }
  const file = path.join(root, `watchdog-${runId}.jsonl`);
  const handle = await fs.promises.open(file, 'wx+', 0o600), original = await handle.stat();
  let previous = '0'.repeat(64), sequence = 0, bytes = 0, chain = Promise.resolve();
  async function check() {
    const a = await fs.promises.lstat(file), b = await handle.stat();
    if (!a.isFile() || a.isSymbolicLink() || a.nlink !== 1 || a.dev !== original.dev || a.ino !== original.ino ||
        b.dev !== a.dev || b.ino !== a.ino || a.size !== b.size || a.size !== bytes) throw Error('WATCHDOG_JOURNAL_CHANGED');
  }
  return {
    append(payload) {
      chain = chain.then(async () => {
        if (sequence >= 128) throw Error('WATCHDOG_JOURNAL_LIMIT');
        await check();
        const body = { sequence, previousSha256: previous, payload }, digest = sha(JSON.stringify(body));
        const line = Buffer.from(JSON.stringify({ ...body, sha256: digest }) + '\n');
        if (line.length > 16384) throw Error('WATCHDOG_JOURNAL_LIMIT');
        await handle.writeFile(line); await handle.sync(); bytes += line.length; previous = digest; sequence++;
        await check();
      });
      return chain;
    },
    async close() {
      try {
        await chain; await check(); const readback = await fs.promises.readFile(file); await check();
        if (readback.length !== bytes) throw Error('WATCHDOG_JOURNAL_CHANGED');
        return { receiptSha256: sha(readback), receiptBytes: bytes };
      } finally { await handle.close(); }
    },
  };
}

// Separate-process NDJSON protocol. The CLI uses only native dependencies;
// explicit seams support local tests and never establish hosted acceptance.
export function runWatchdogProtocol({ input = process.stdin, output = process.stdout, repositoryRoot = repository,
  createTransport = createGate1WatchdogTransport, inspectBackup = inspectBackupArtifacts,
  verifySource = verifySourceNative, openJournal = openJournalNative, clock, timers,
} = {}) {
  return new Promise(resolve => {
    let session, journal, context, sequence = -1, initialized = false, finalizing = false, pumping = false, lost = false;
    let text = '', queue = [], preflightStarted = false;
    const decoder = new TextDecoder('utf-8', { fatal: true });
    const startupAbort = new AbortController();
    const wallNow = clock?.wallNow ?? Date.now;
    const monotonicNow = clock?.monotonicNow ?? (() => performance.now());
    const startupTimer = setTimeout(() => stop(), 10000);
    const sameIdentity = o => o?.runId === context.policy.runId && o.sourceCommit === context.policy.sourceCommit &&
      o.sourceBindingSha256 === context.policy.sourceBindingSha256;
    function write(value) {
      return new Promise((ok, reject) => {
        const timer = setTimeout(() => reject(Error('WATCHDOG_OUTPUT_FAILED')), 1000);
        output.write(JSON.stringify(value) + '\n', error => { clearTimeout(timer); if (error) reject(Error('WATCHDOG_OUTPUT_FAILED')); else ok(); });
      });
    }
    async function finish(result) {
      if (finalizing) return; finalizing = true; clearTimeout(startupTimer); startupAbort.abort();
      input.pause(); input.destroy(); queue = [];
      let final = { ...result }; const persistenceStarted = monotonicNow();
      const withinDeadline = () => {
        const duration = monotonicNow() - persistenceStarted, wallAge = wallNow() - parseWatchdogTimestamp(result.t0);
        return Number.isFinite(duration) && duration >= 0 && Number.isFinite(wallAge) &&
          Math.max(result.elapsedMs + duration, wallAge) <= 1200000;
      };
      if (journal) {
        let receiptFailed = false;
        // The persisted terminal is a candidate. Only the emitted terminal,
        // after complete readback within the original deadline, grants eligibility.
        const candidate = final.restoreEligible ? { ...final, restoreEligible: false, reason: 'WATCHDOG_RECEIPT_READBACK_PENDING' } : final;
        try { await journal.append({ type: 'terminal', result: candidate }); } catch { receiptFailed = true; }
        try { Object.assign(final, await journal.close()); } catch { receiptFailed = true; }
        if (receiptFailed) final = { ...final, journalHealthy: false, restoreEligible: false, reason: 'WATCHDOG_RECEIPT_PERSISTENCE_FAILED' };
        if (final.restoreEligible && !withinDeadline()) final = { ...final, restoreEligible: false, reason: 'WATCHDOG_FINAL_RECEIPT_DEADLINE_EXCEEDED' };
      }
      try { await write({ type: 'terminal', ...final }); } catch { /* Receipt remains separate from its delivery. */ }
      resolve(final);
    }
    function stop() {
      lost = true; startupAbort.abort();
      if (session) session.disconnect();
      else if (!pumping) void finish({ ...blocked(), remoteCalls: preflightStarted ? null : 0 });
    }
    async function handle(message) {
      if (!Number.isSafeInteger(message?.sequence) || message.sequence !== sequence + 1) throw Error('WATCHDOG_PROTOCOL_INVALID');
      sequence = message.sequence;
      if (!initialized) {
        if (!exact(message, ['type', 'sequence', 'context', 'journalDirectory']) || message.type !== 'init' || sequence !== 0) throw Error('WATCHDOG_PROTOCOL_INVALID');
        context = message.context;
        const p = context?.policy;
        if (!exact(p, ['schemaVersion', 'stopEvidencePolicy', 't0', 'sourceBindingSha256', 'sourceCommit', 'runId']) || p.schemaVersion !== 2 ||
            p.stopEvidencePolicy !== STOP_EVIDENCE_POLICY ||
            !/^[a-f0-9]{64}$/.test(p.runId ?? '') || !/^[a-f0-9]{64}$/.test(p.sourceBindingSha256 ?? '') ||
            !/^[a-f0-9]{40}$/.test(p.sourceCommit ?? '') || !Number.isFinite(parseWatchdogTimestamp(p.t0)) ||
            parseWatchdogTimestamp(p.t0) > wallNow() || wallNow() - parseWatchdogTimestamp(p.t0) > 300000) throw Error('WATCHDOG_PROTOCOL_INVALID');
        const nativeTransport = createTransport(context);
        let sourceInvalid = false;
        const transport = { ...nativeTransport, async confirmStopped({ signal }) {
          if (sourceInvalid) return { status: 'SOURCE_EVIDENCE_INVALIDATED' };
          try { await verifySource({ repositoryRoot, sourceCommit: p.sourceCommit }); }
          catch { sourceInvalid = true; return { status: 'SOURCE_EVIDENCE_INVALIDATED' }; }
          if (signal.aborted) return { status: 'SOURCE_STATUS_UNKNOWN' };
          const observed = await nativeTransport.confirmStopped({ signal });
          try { await verifySource({ repositoryRoot, sourceCommit: p.sourceCommit }); }
          catch { sourceInvalid = true; return { status: 'SOURCE_EVIDENCE_INVALIDATED' }; }
          return signal.aborted ? { status: 'SOURCE_STATUS_UNKNOWN' } : observed;
        } };
        await verifySource({ repositoryRoot, sourceCommit: p.sourceCommit });
        if (lost) throw Error('WATCHDOG_PROTOCOL_INVALID');
        journal = await openJournal({ repositoryRoot, directory: message.journalDirectory, runId: p.runId });
        session = createGate1Watchdog({ policy: p, transport, record: row => journal.append(row), clock, timers });
        session.finished.then(finish);
        preflightStarted = true;
        const ready = await transport.preflight({ signal: startupAbort.signal });
        if (lost || finalizing || ready?.status !== 'WATCHDOG_TRANSPORT_READY' || ready.sourceBindingSha256 !== p.sourceBindingSha256) throw Error('WATCHDOG_PROTOCOL_INVALID');
        initialized = true; clearTimeout(startupTimer);
        await write({ type: 'ready', sequence, state: session.snapshot().state }); return;
      }
      if (message.type === 'backup') {
        const r = message.receipt;
        if (!exact(message, ['type', 'sequence', 'receipt']) ||
            !exact(r, ['runId', 'sourceCommit', 'sourceBindingSha256', 't0', 'directory', 'manifestSha256', 'completedAt', 'checksumsCompletedAt']) ||
            !sameIdentity(r) || r.t0 !== context.policy.t0 || session.snapshot().state !== 'PRE_DDL_UNARMED') throw Error('WATCHDOG_PROTOCOL_INVALID');
        const inspection = await inspectBackup({ directory: r.directory, expectedManifestSha256: r.manifestSha256 });
        if (inspection?.status !== 'PERSISTED_BYTES_VERIFIED' || inspection.manifestSha256 !== r.manifestSha256 || inspection.artifacts?.length !== 6) throw Error('WATCHDOG_BACKUP_REJECTED');
        const { directory: _directory, ...receipt } = r;
        await journal.append({ type: 'backup-inspection', manifestSha256: r.manifestSha256, t0: r.t0 });
        if (!await session.acceptBackup({ ...receipt, inspectedAt: new Date(wallNow()).toISOString() })) throw Error('WATCHDOG_BACKUP_REJECTED');
        await write({ type: 'backup-accepted', sequence }); return;
      }
      if (message.type === 'success') {
        if (!exact(message, ['type', 'sequence', 'receipt']) || !await session.success(message.receipt)) throw Error('WATCHDOG_PROTOCOL_INVALID');
        return;
      }
      if (!exact(message, ['type', 'sequence', 'runId', 'sourceCommit', 'sourceBindingSha256']) || !sameIdentity(message)) throw Error('WATCHDOG_PROTOCOL_INVALID');
      if (message.type === 'arm') {
        if (!await session.arm()) throw Error('WATCHDOG_ARM_REJECTED');
        await write({ type: 'armed', sequence, armedAt: session.snapshot().armedAt });
      } else if (message.type === 'failure') session.fail();
      else throw Error('WATCHDOG_PROTOCOL_INVALID');
    }
    async function pump() {
      if (pumping || finalizing) return;
      pumping = true;
      try {
        while (queue.length && !finalizing && !lost) await handle(parseStrictJson(queue.shift()));
      } catch {
        lost = true; startupAbort.abort();
        if (session) session.fail();
      } finally {
        pumping = false;
        if (lost && !session) void finish({ ...blocked(), remoteCalls: preflightStarted ? null : 0 });
      }
    }
    input.on('data', chunk => {
      if (lost || finalizing) return;
      try {
        text += decoder.decode(chunk, { stream: true });
        if (Buffer.byteLength(text) > 262144) throw Error();
        const lines = text.split('\n'); text = lines.pop();
        if (lines.some(line => !line.trim()) || queue.length + lines.length > 16) throw Error();
        queue.push(...lines); void pump();
      } catch { stop(); }
    });
    input.on('end', stop); input.on('error', stop);
    output.on('error', stop);
  });
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = await runWatchdogProtocol();
  process.exitCode = result.state === 'SUCCESS_DISARMED' && result.journalHealthy ? 0 : 2;
}
