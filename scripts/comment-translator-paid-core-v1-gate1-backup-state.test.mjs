import assert from 'node:assert/strict';
import { test } from 'node:test';
import { BACKUP_SOURCE_STATE_SQL, validateBackupSourceState } from './lib/comment-translator-paid-core-v1-gate1-backup-state.mjs';

const state = () => ({ historyCount: 22, historySha256: '1'.repeat(64),
  rowCounts: [{ identitySha256: '2'.repeat(64), rows: 3 }], authUsers: 1,
  authForeignKeysSha256: '3'.repeat(64), grantsRlsSha256: '4'.repeat(64),
  legacyRows: 0, vaultRows: 0, storageObjects: 0,
  vectorCounts: { 'storage.buckets_vectors': 0, 'storage.vector_indexes': 0 } });

test('source state rejects incomplete, unsafe, duplicate, unordered and nonempty recovery exclusions', () => {
  assert.deepEqual(validateBackupSourceState(state()), state());
  for (const mutate of [s => { delete s.historySha256; }, s => { s.extra = true; },
    s => { s.historyCount = 56; }, s => { s.historySha256 = 'x'; }, s => { s.authUsers = '1'; },
    s => { s.rowCounts = []; }, s => { s.rowCounts[0].rows = Number.MAX_SAFE_INTEGER + 1; },
    s => { s.rowCounts.push({ ...s.rowCounts[0] }); },
    s => { s.rowCounts.push({ identitySha256: '1'.repeat(64), rows: 0 }); },
    s => { s.vaultRows = 1; }, s => { s.storageObjects = 1; }, s => { s.legacyRows = 1; },
    s => { s.vectorCounts['storage.vector_indexes'] = 1; },
    s => { s.vectorCounts.extra = 0; }, s => { s.rowCounts[0].privateValue = 'not permitted'; }]) {
    const value = state(); mutate(value);
    assert.throws(() => validateBackupSourceState(value), /^Error: BACKUP_SOURCE_STATE_INVALID$/);
  }
});

test('fixed SQL contains aggregate-only counts and portable identities, without secret/row payload selection', () => {
  assert.match(BACKUP_SOURCE_STATE_SQL, /format\('SELECT count\(\*\) AS n FROM ONLY %I\.%I', nspname, relname\)/);
  assert.match(BACKUP_SOURCE_STATE_SQL, /sn\.nspname = 'auth' OR tn\.nspname = 'auth'/);
  assert.match(BACKUP_SOURCE_STATE_SQL, /pg_get_constraintdef/);
  assert.match(BACKUP_SOURCE_STATE_SQL, /relforcerowsecurity/);
  assert.match(BACKUP_SOURCE_STATE_SQL, /pg_policy/);
  assert.doesNotMatch(BACKUP_SOURCE_STATE_SQL, /decrypted_secrets|SELECT \* FROM auth|INSERT|UPDATE|DELETE|CREATE|ALTER/);
});

test('local replay state has its own fixed 26-row validator; Production remains fixed at 22', async () => {
  const { validateLocalReplaySourceState } = await import('./lib/comment-translator-paid-core-v1-gate1-backup-state.mjs');
  const local = {...state(),historyCount:26};
  assert.deepEqual(validateLocalReplaySourceState(local),local);
  assert.throws(()=>validateBackupSourceState(local));
  assert.throws(()=>validateLocalReplaySourceState(state()));
  assert.throws(()=>validateLocalReplaySourceState({...local,vaultRows:1}));
});
