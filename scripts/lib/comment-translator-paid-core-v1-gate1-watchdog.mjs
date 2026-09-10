import { performance } from 'node:perf_hooks';

const BACKUP = 300000, PAUSE = 600000, CONFIRM = 1200000, MARGIN = 1000;
export const STOP_EVIDENCE_POLICY = 'supabase-inactive-v2';
export const STOP_ROUND_MS = 12000;
const SHA = /^[a-f0-9]{64}$/, COMMIT = /^[a-f0-9]{40}$/;
const exact = (o, keys) => o !== null && typeof o === 'object' && !Array.isArray(o) &&
  Object.keys(o).sort().join(',') === [...keys].sort().join(',');
// Match the existing native snapshot transport, preserving the original text.
// Date.parse truncates submilliseconds just as that transport does; it never
// moves a deadline later than the server's microsecond timestamp.
export function parseWatchdogTimestamp(s) {
  if (typeof s !== 'string' || !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,6})?(?:Z|[+-]\d\d:\d\d)$/.test(s)) return NaN;
  const parts = s.slice(0, 19).split(/[-T:]/).map(Number), calendar = new Date(0);
  calendar.setUTCFullYear(parts[0], parts[1] - 1, parts[2]); calendar.setUTCHours(parts[3], parts[4], parts[5], 0);
  const actual = [calendar.getUTCFullYear(), calendar.getUTCMonth() + 1, calendar.getUTCDate(),
    calendar.getUTCHours(), calendar.getUTCMinutes(), calendar.getUTCSeconds()];
  return parts.some((value, index) => value !== actual[index]) ? NaN : Date.parse(s);
}
const timestamp = parseWatchdogTimestamp;

// A complete round is supplied only by a bound native observer. The tracker
// joins no partial samples and does not upgrade legacy inaccessibility receipts.
export function createGate1PauseEvidenceTracker(policy) {
  if (policy?.stopEvidencePolicy !== STOP_EVIDENCE_POLICY || !SHA.test(policy?.runId) ||
      !SHA.test(policy?.sourceBindingSha256) || !COMMIT.test(policy?.sourceCommit)) throw Error('WATCHDOG_CONTEXT_INVALID');
  const identity = Object.freeze({ ...policy });
  let first = null, pinSetId = null, invalid = false;
  return Object.freeze({
    invalidate() { invalid = true; first = null; },
    observe(r, start, end) {
      if (r?.status === 'SOURCE_EVIDENCE_INVALIDATED') invalid = true;
      if (r?.status !== 'SOURCE_PAUSE_ROUND_COMPLETE') { first = null; return null; }
      if (r.runId !== identity.runId || r.sourceCommit !== identity.sourceCommit ||
          r.sourceBindingSha256 !== identity.sourceBindingSha256 || r.stopEvidencePolicy !== identity.stopEvidencePolicy ||
          (pinSetId && pinSetId !== r.pinSetId)) invalid = true;
      const counts = ['pinnedAddressCount', 'directRefusedCount', 'directNoConnectCount'];
      if (invalid || !exact(r, ['status', 'stopEvidencePolicy', 'runId', 'sourceCommit', 'sourceBindingSha256', 'pinSetId', ...counts]) ||
          !SHA.test(r.pinSetId) || !counts.every(k => Number.isSafeInteger(r[k]) && r[k] >= 0) ||
          r.pinnedAddressCount < 1 || r.pinnedAddressCount > 8 || r.directRefusedCount + r.directNoConnectCount !== r.pinnedAddressCount ||
          !Number.isFinite(start) || !Number.isFinite(end) || start < 0 || end < start || end > CONFIRM || end - start > STOP_ROUND_MS) {
        first = null; return null;
      }
      pinSetId = r.pinSetId;
      const completed = Object.freeze({ startedElapsedMs: start, completedElapsedMs: end,
        pinnedAddressCount: r.pinnedAddressCount, directRefusedCount: r.directRefusedCount, directNoConnectCount: r.directNoConnectCount });
      if (!first || start - first.completedElapsedMs < 1000 || end - first.startedElapsedMs > 30000) { first = completed; return null; }
      const result = Object.freeze({ status: 'SOURCE_PAUSED_VERIFIED', stopEvidencePolicy: identity.stopEvidencePolicy,
        pinSetId, directEvidence: first.directNoConnectCount || completed.directNoConnectCount ? 'UNKNOWN' : 'ALL_REFUSED',
        rounds: Object.freeze([first, completed]) });
      first = null; return result;
    },
  });
}

// This engine is not a Gate1 authority verifier. The native runner supplies the
// transport and independently inspects persisted backups before accepting them.
export function createGate1Watchdog({ policy, transport, record,
  clock = { wallNow: Date.now, monotonicNow: () => performance.now() },
  timers = { setTimeout, clearTimeout },
} = {}) {
  if (!exact(policy, ['schemaVersion', 'stopEvidencePolicy', 't0', 'sourceBindingSha256', 'sourceCommit', 'runId']) ||
      policy.schemaVersion !== 2 || policy.stopEvidencePolicy !== STOP_EVIDENCE_POLICY || !SHA.test(policy.sourceBindingSha256) || !SHA.test(policy.runId) ||
      !COMMIT.test(policy.sourceCommit) || !Number.isFinite(timestamp(policy.t0)) ||
      typeof transport?.requestPause !== 'function' || typeof transport?.confirmStopped !== 'function' ||
      typeof record !== 'function') throw Error('WATCHDOG_CONTEXT_INVALID');
  policy = Object.freeze({ ...policy });
  const epoch = timestamp(policy.t0), initial = clock.wallNow() - epoch, mono = clock.monotonicNow();
  if (!Number.isFinite(initial) || initial < 0 || !Number.isFinite(mono)) throw Error('WATCHDOG_CONTEXT_INVALID');
  let elapsed = initial, state = 'PRE_DDL_UNARMED', reason = 'WAITING_FOR_BACKUP', ended = false;
  let backup = false, armPending = false, armedAt = null, pauseAt = null, confirmedAt = null, disarmedAt = null;
  let pauseAttempts = 0, pauseAccepted = false, confirmationAttempts = 0, journalHealthy = true;
  let tickTimer, probePending = false, nextProbe = 0, clockHealthy = true, pauseSettled = false;
  const evidenceTracker = createGate1PauseEvidenceTracker(policy); let stoppingEvidence = null;
  let recordChain = Promise.resolve(true);
  const active = new Set();
  let resolveFinished;
  const finished = new Promise(resolve => { resolveFinished = resolve; });
  const now = () => {
    const wall = clock.wallNow() - epoch, monotonic = clock.monotonicNow() - mono;
    if (!Number.isFinite(wall) || !Number.isFinite(monotonic) || monotonic < 0) throw Error('WATCHDOG_CLOCK_INVALID');
    elapsed = Math.max(elapsed, wall, initial + monotonic); return elapsed;
  };
  const iso = ms => new Date(epoch + ms).toISOString();
  const identity = o => o?.runId === policy.runId && o.sourceCommit === policy.sourceCommit && o.sourceBindingSha256 === policy.sourceBindingSha256;
  const result = () => Object.freeze({ ...policy, state, reason, decision: 'NO-GO', elapsedMs: elapsed,
    armedAt, pauseRequestedAt: pauseAt, confirmedAt, disarmedAt, pauseAttempts, pauseAccepted, confirmationAttempts,
    journalHealthy, clockHealthy, stoppingEvidence,
    restoreEligible: state === 'PAUSE_CONFIRMED' && journalHealthy && clockHealthy &&
      stoppingEvidence?.status === 'SOURCE_PAUSED_VERIFIED' && timestamp(pauseAt) - epoch <= PAUSE });
  function finish(next, why) {
    if (ended) return;
    state = next; reason = why; ended = true; timers.clearTimeout(tickTimer);
    for (const c of active) c.abort();
    resolveFinished(result());
  }
  function abortUnarmed(why) { finish('ABORTED_NO_DDL_NO_PAUSE', why); }
  async function bounded(fn, limit = 3000) {
    const c = new AbortController(); active.add(c);
    let timer, abortListener;
    try {
      return await Promise.race([Promise.resolve().then(() => fn(c.signal)), new Promise((_, reject) => {
        abortListener = () => reject(Error('WATCHDOG_OPERATION_ABORTED'));
        c.signal.addEventListener('abort', abortListener, { once: true });
        timer = timers.setTimeout(() => { c.abort(); reject(Error('WATCHDOG_OPERATION_TIMEOUT')); }, Math.max(1, limit));
      })]);
    } finally { timers.clearTimeout(timer); c.signal.removeEventListener('abort', abortListener); c.abort(); active.delete(c); }
  }
  function append(event, evidence) {
    let row;
    try { row = Object.freeze({ schemaVersion: 2, stopEvidencePolicy: policy.stopEvidencePolicy, event, at: iso(now()),
      runId: policy.runId, sourceCommit: policy.sourceCommit, sourceBindingSha256: policy.sourceBindingSha256,
      ...(evidence ? { stoppingEvidence: evidence } : {}) }); }
    catch { journalHealthy = false; return Promise.resolve(false); }
    recordChain = recordChain.then(async () => {
      if (!journalHealthy) return false;
      try { await bounded(() => record(row), 1000); return true; }
      catch { journalHealthy = false; return false; }
    });
    return recordChain;
  }
  function schedule() {
    if (ended) return;
    timers.clearTimeout(tickTimer);
    const edge = pauseAttempts ? CONFIRM + 1 : state === 'ARMED_BEFORE_FIRST_DDL' || backup ? PAUSE - MARGIN : BACKUP + 1;
    tickTimer = timers.setTimeout(tick, Math.max(1, Math.min(1000, edge - elapsed)));
  }
  function requestPause(why) {
    if (ended || pauseAttempts) return;
    if (state !== 'ARMED_BEFORE_FIRST_DDL') { abortUnarmed(why); return; }
    try { now(); } catch { clockHealthy = false; }
    state = 'PAUSE_REQUESTED'; reason = why; pauseAt = iso(elapsed); pauseAttempts = 1;
    // Latch before asynchronous recording/network work. No mutation retry exists.
    void append('PAUSE_REQUESTED');
    void bounded(signal => transport.requestPause({ signal })).then(r => {
      if (!ended) pauseAccepted = exact(r, ['status', 'sourceBindingSha256']) &&
        r.status === 'PAUSE_REQUEST_ACCEPTED' && r.sourceBindingSha256 === policy.sourceBindingSha256;
    }).catch(() => { /* Outcome uncertain; independently confirm, never retry. */ }).finally(() => { pauseSettled = true; });
    nextProbe = elapsed; probe(); schedule();
  }
  function probe() {
    if (ended || !pauseAttempts || probePending || elapsed < nextProbe || elapsed > CONFIRM) return;
    probePending = true; confirmationAttempts++; const roundStart = elapsed;
    void bounded(signal => transport.confirmStopped({ signal }), Math.min(STOP_ROUND_MS, CONFIRM - elapsed + 1)).then(async r => {
      if (ended || now() > CONFIRM) return;
      stoppingEvidence = evidenceTracker.observe(r, roundStart, elapsed);
      if (!stoppingEvidence) return;
      const observed = elapsed;
      const persisted = await append('SOURCE_PAUSED_VERIFIED', stoppingEvidence);
      if (ended || now() > CONFIRM) return;
      confirmedAt = iso(observed);
      finish('PAUSE_CONFIRMED', persisted && journalHealthy ? 'PROVIDER_PAUSE_VERIFIED' : 'CONFIRMED_WITHOUT_DURABLE_RECEIPT');
    }).catch(() => { evidenceTracker.observe(null); }).finally(() => {
      probePending = false; nextProbe = elapsed + 1000;
    });
  }
  function tick() {
    if (ended) return;
    try { now(); } catch {
      if (state === 'ARMED_BEFORE_FIRST_DDL') requestPause('CLOCK_INVALID');
      else if (!pauseAttempts) abortUnarmed('CLOCK_INVALID');
      else if (pauseSettled) finish('PAUSE_UNCONFIRMED', 'CLOCK_INVALID');
      if (!ended) schedule();
      return;
    }
    if (pauseAttempts) {
      if (elapsed > CONFIRM) {
        // Never restore after expiry. Still allow the one bounded pause attempt
        // to finish if a suspended machine woke after the deadline.
        if (pauseSettled) finish('PAUSE_UNCONFIRMED', 'CONFIRMATION_DEADLINE_EXCEEDED');
        else tickTimer = timers.setTimeout(tick, 100);
        return;
      }
      probe();
    } else if (state === 'ARMED_BEFORE_FIRST_DDL' && elapsed >= PAUSE - MARGIN) requestPause('SUCCESS_DEADLINE_APPROACHING');
    else if (!backup && elapsed > BACKUP) abortUnarmed('BACKUP_DEADLINE_EXCEEDED');
    else if (backup && state !== 'ARMED_BEFORE_FIRST_DDL' && elapsed >= PAUSE - MARGIN) abortUnarmed('ARM_DEADLINE_EXCEEDED');
    schedule();
  }
  async function acceptBackup(receipt) {
    if (ended || backup || armPending || state !== 'PRE_DDL_UNARMED') return false;
    const fields = ['runId', 'sourceCommit', 'sourceBindingSha256', 't0', 'manifestSha256', 'completedAt', 'checksumsCompletedAt', 'inspectedAt'];
    if (!exact(receipt, fields) || !identity(receipt) || receipt.t0 !== policy.t0 || !SHA.test(receipt.manifestSha256) ||
        !['completedAt', 'checksumsCompletedAt', 'inspectedAt'].every(k => Number.isFinite(timestamp(receipt[k])) &&
          timestamp(receipt[k]) >= epoch && timestamp(receipt[k]) <= epoch + now() && timestamp(receipt[k]) <= epoch + BACKUP) ||
        timestamp(receipt.checksumsCompletedAt) < timestamp(receipt.completedAt) ||
        timestamp(receipt.inspectedAt) < timestamp(receipt.checksumsCompletedAt) || now() > BACKUP) {
      abortUnarmed('BACKUP_RECEIPT_INVALID'); return false;
    }
    if (!await append('BACKUP_VERIFIED') || ended || now() > BACKUP) { abortUnarmed('BACKUP_RECEIPT_NOT_DURABLE_BY_DEADLINE'); return false; }
    backup = true; reason = 'BACKUP_VERIFIED_UNARMED'; schedule(); return true;
  }
  async function arm() {
    if (ended || !backup || armPending || state !== 'PRE_DDL_UNARMED' || now() >= PAUSE - MARGIN) return false;
    armPending = true;
    if (!await append('ARM_INTENT') || ended || now() >= PAUSE - MARGIN) { abortUnarmed('ARM_RECEIPT_UNAVAILABLE'); return false; }
    state = 'ARMED_BEFORE_FIRST_DDL'; armedAt = iso(elapsed); reason = 'ARMED'; schedule();
    if (!await append('ARMED') || ended || state !== 'ARMED_BEFORE_FIRST_DDL' || now() >= PAUSE - MARGIN) {
      requestPause('ARM_ACKNOWLEDGEMENT_FAILED'); return false;
    }
    return true;
  }
  async function success(receipt) {
    if (ended || pauseAttempts || state !== 'ARMED_BEFORE_FIRST_DDL') return false;
    const fields = ['runId', 'sourceCommit', 'sourceBindingSha256', 'migrationCompletedAt', 'decisiveReadbackCompletedAt'];
    const migration = timestamp(receipt?.migrationCompletedAt), readback = timestamp(receipt?.decisiveReadbackCompletedAt);
    if (!exact(receipt, fields) || !identity(receipt) || !Number.isFinite(migration) || !Number.isFinite(readback) ||
        migration < timestamp(armedAt) || readback < migration || readback > epoch + now() || readback >= epoch + PAUSE || now() >= PAUSE) {
      requestPause('SUCCESS_RECEIPT_INVALID'); return false;
    }
    if (!await append('SUCCESS_VALIDATED') || ended || pauseAttempts || now() >= PAUSE) {
      requestPause('SUCCESS_RECEIPT_UNAVAILABLE_OR_LATE'); return false;
    }
    disarmedAt = iso(elapsed); finish('SUCCESS_DISARMED', 'MIGRATION_AND_DECISIVE_READBACK_SUCCEEDED'); return true;
  }
  schedule();
  return Object.freeze({ acceptBackup, arm, success, finished, snapshot: result,
    fail: () => requestPause('DECISIVE_FAILURE'), disconnect: () => requestPause('PARENT_CHANNEL_LOST') });
}
