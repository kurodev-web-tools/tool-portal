import { createHash } from 'node:crypto';
import { validateBackupSourceState, validateLocalReplaySourceState } from './comment-translator-paid-core-v1-gate1-backup-state.mjs';
const names = ['roles.sql', 'schema.sql', 'auth_storage_changes.sql', 'data.sql', 'history_schema.sql', 'history_data.sql'];
const hash = x => createHash('sha256').update(x).digest('hex');
const exact = (v, keys) => v && typeof v === 'object' && !Array.isArray(v) && Object.keys(v).sort().join(',') === [...keys].sort().join(',');
const canonical = v => Array.isArray(v) ? v.map(canonical) : v && typeof v === 'object'
  ? Object.fromEntries(Object.keys(v).sort().map(k => [k, canonical(v[k])])) : v;
const require = v => { if (!v) throw Error('REHEARSAL_RESTORE_REJECTED'); };

// Internal orchestration seam. Only an independently owned isolated native
// transport may execute SQL; caller PASS labels are not operational authority.
// This does not claim Supabase CLI replay or produce a complete rehearsal stage.
export function createRehearsalRestore({ execute, readState, now = Date.now, localReplay = false } = {}) {
  const validateState = localReplay === true ? validateLocalReplaySourceState : validateBackupSourceState;
  return { async run(request) {
    let phase = 'input';
    try {
      require(exact(request, ['artifacts', 'sourceState']) && typeof execute === 'function' && typeof readState === 'function');
      const sourceState = structuredClone(validateState(request.sourceState));
      require(Array.isArray(request.artifacts) && request.artifacts.length === 6);
      const artifacts = request.artifacts.map((a, i) => {
        require(exact(a, ['name', 'sql', 'bytes', 'sha256']) && a.name === names[i] && typeof a.sql === 'string' &&
          a.sql.isWellFormed() && !a.sql.includes('\0') && Number.isSafeInteger(a.bytes) &&
          a.bytes >= (i === 2 ? 0 : 1) && a.bytes <= 32 * 1024 * 1024 && Buffer.byteLength(a.sql) === a.bytes && hash(a.sql) === a.sha256);
        return { ...a };
      });
      const begin = now(); let previous = begin;
      require(Number.isFinite(begin));
      const stamp = () => { const value = now(); require(Number.isFinite(value) && value >= previous && value <= begin + 600000); previous = value; return new Date(value).toISOString(); };
      const startedAt = new Date(begin).toISOString(), transactions = [];
      phase = 'restore';
      for (const artifact of artifacts) {
        stamp();
        const r = await execute(Object.freeze({ ...artifact }));
        require(exact(r, ['exitCode', 'signal', 'captureComplete', 'stdoutBytes', 'stderrBytes', 'onErrorStop', 'transaction']) &&
          r.exitCode === 0 && r.signal === null && r.captureComplete === true && r.stderrBytes === 0 &&
          Number.isSafeInteger(r.stdoutBytes) && r.stdoutBytes >= 0 && r.stdoutBytes <= 65536 && r.onErrorStop === true && r.transaction === true);
        stamp();
        transactions.push({ name: artifact.name, sha256: artifact.sha256, exitCode: r.exitCode, onErrorStop: r.onErrorStop, transaction: r.transaction });
      }
      phase = 'readback';
      const restoredState = structuredClone(validateState(await readState()));
      require(JSON.stringify(canonical(restoredState)) === JSON.stringify(canonical(sourceState)));
      return { status: 'RESTORE_STATE_MATCH_OBSERVED', startedAt, completedAt: stamp(), transactions, restoredState,
        stageAuthority: false, gate: 'NO-GO' };
    } catch { throw Object.assign(Error('REHEARSAL_RESTORE_REJECTED'), { phase }); }
  } };
}
