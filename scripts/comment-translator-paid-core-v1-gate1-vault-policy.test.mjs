import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { test } from 'node:test';
import {
  REQUIRED_EXTERNAL_VAULT_SECRET_NAMES,
  VAULT_MODE_FREE,
  VAULT_MODE_PAID,
  classifyVaultPolicy,
  validateBackupSourceState,
  validateVaultPolicyState
} from './lib/comment-translator-paid-core-v1-gate1-backup-state.mjs';
import { BACKUP_HISTORIES } from './lib/comment-translator-paid-core-v1-gate1-backup-profile.mjs';
import { createRehearsalRestore } from './lib/comment-translator-paid-core-v1-gate1-rehearsal-restore.mjs';

const hash = value => createHash('sha256').update(value).digest('hex');
const [URL_NAME, TOKEN_NAME] = REQUIRED_EXTERNAL_VAULT_SECRET_NAMES;
const policy = names => ({ policyVersion: 1, observedCount: names.length, names });
const sourceState = vaultPolicy => ({
  schemaVersion: 3, phase: 'pre22', history: structuredClone(BACKUP_HISTORIES.pre22),
  structureSha256: '6'.repeat(64), sequencesSha256: '8'.repeat(64),
  archiveSchemaCount: 0, archiveUnsafeCount: 0, archiveActiveTriggers: 0, archiveRows: 0,
  rowDigests: [{ identitySha256: '2'.repeat(64), sha256: '3'.repeat(64) }],
  historyCount: 22, historySha256: '1'.repeat(64), rowCounts: [{ identitySha256: '2'.repeat(64), rows: 0 }],
  authUsers: 0, authForeignKeysSha256: '3'.repeat(64), grantsRlsSha256: '4'.repeat(64),
  legacyRows: 0, vaultRows: vaultPolicy.observedCount, storageObjects: 0,
  vectorCounts: { 'storage.buckets_vectors': 0, 'storage.vector_indexes': 0 }, vaultPolicy
});

test('vault policy accepts only the empty state or the exact two-secret allowlist', () => {
  const free = classifyVaultPolicy({ observedCount: 0, names: [] });
  assert.equal(free.status, 'accepted');
  assert.equal(free.mode, VAULT_MODE_FREE);
  assert.equal(free.reprovisionRequired, false);
  assert.deepEqual(free.requiredExternalSecretNames, REQUIRED_EXTERNAL_VAULT_SECRET_NAMES);

  const paid = classifyVaultPolicy({ observedCount: 2, names: [TOKEN_NAME, URL_NAME] });
  assert.equal(paid.status, 'accepted');
  assert.equal(paid.mode, VAULT_MODE_PAID);
  assert.equal(paid.reprovisionRequired, true);
  assert.deepEqual(paid.missingRequiredNames, []);
  assert.deepEqual(paid.unexpectedSecretNames, []);

  for (const names of [[URL_NAME], [TOKEN_NAME]]) {
    const result = classifyVaultPolicy({ observedCount: names.length, names });
    assert.equal(result.status, 'rejected');
    assert.equal(result.reason, 'vault-policy-incomplete');
  }
  const unexpected = classifyVaultPolicy({ observedCount: 3, names: [URL_NAME, TOKEN_NAME, 'comment_translator_other'] });
  assert.equal(unexpected.status, 'rejected');
  assert.equal(unexpected.reason, 'vault-policy-unexpected-secret');
  const swapped = classifyVaultPolicy({ observedCount: 2, names: [URL_NAME, 'comment_translator_other'] });
  assert.equal(swapped.status, 'rejected');
  assert.equal(swapped.reason, 'vault-policy-unexpected-secret');
  const duplicate = classifyVaultPolicy({ observedCount: 2, names: [URL_NAME, URL_NAME] });
  assert.equal(duplicate.status, 'rejected');
  assert.equal(duplicate.reason, 'vault-policy-duplicate-name');
  for (const bad of [{ observedCount: 1, names: [] }, { observedCount: 0, names: [' '] },
    { observedCount: -1, names: [] }, {}, null]) {
    assert.equal(classifyVaultPolicy(bad).reason, 'vault-policy-invalid');
  }
});

test('current source state accepts vault zero and the exact paid allowlist but fails closed otherwise', () => {
  assert.equal(validateVaultPolicyState(policy([]), 0).mode, VAULT_MODE_FREE);
  assert.equal(validateVaultPolicyState(policy([URL_NAME, TOKEN_NAME]), 2).mode, VAULT_MODE_PAID);
  assert.throws(() => validateVaultPolicyState(policy([URL_NAME, TOKEN_NAME]), 3));
  assert.throws(() => validateVaultPolicyState({ policyVersion: 2, observedCount: 0, names: [] }, 0));

  validateBackupSourceState(sourceState(policy([])));
  validateBackupSourceState(sourceState(policy([TOKEN_NAME, URL_NAME])));
  for (const names of [[URL_NAME], [URL_NAME, TOKEN_NAME, 'comment_translator_other'], [URL_NAME, URL_NAME]]) {
    assert.throws(() => validateBackupSourceState(sourceState(policy(names))), /BACKUP_SOURCE_STATE_INVALID/);
  }
  const mismatched = sourceState(policy([URL_NAME, TOKEN_NAME]));
  mismatched.vaultRows = 3;
  assert.throws(() => validateBackupSourceState(mismatched), /BACKUP_SOURCE_STATE_INVALID/);
});

test('restore treats missing Vault references as an explicit external reprovision requirement', async () => {
  const sql = 'SELECT 1;';
  const artifacts = ['roles.sql', 'schema.sql', 'auth_storage_changes.sql', 'data.sql', 'history_schema.sql', 'history_data.sql']
    .map(name => ({ name, sql, bytes: Buffer.byteLength(sql), sha256: hash(sql) }));
  const execute = async () => ({ exitCode: 0, signal: null, captureComplete: true, stdoutBytes: 0, stderrBytes: 0,
    onErrorStop: true, transaction: true });
  const paid = sourceState(policy([URL_NAME, TOKEN_NAME]));
  const restored = sourceState(policy([]));
  const reprovision = await createRehearsalRestore({ execute, readState: async () => structuredClone(restored) })
    .run({ artifacts, sourceState: paid });
  assert.equal(reprovision.status, 'RESTORE_EXTERNAL_SECRETS_REPROVISION_REQUIRED');
  assert.deepEqual(reprovision.externalSecrets.requiredSecretNames, REQUIRED_EXTERNAL_VAULT_SECRET_NAMES);
  assert.equal(reprovision.externalSecrets.restoredSecretValues, 'intentionally-absent');
  assert.equal(reprovision.externalSecrets.schedulerActivation, 'prohibited');

  const zeroSource = sourceState(policy([]));
  const matched = await createRehearsalRestore({ execute, readState: async () => structuredClone(zeroSource) })
    .run({ artifacts, sourceState: zeroSource });
  assert.equal(matched.status, 'RESTORE_STATE_MATCH_OBSERVED');

  await assert.rejects(() => createRehearsalRestore({ execute, readState: async () => structuredClone(paid) })
    .run({ artifacts, sourceState: zeroSource }), /REHEARSAL_RESTORE_REJECTED/);
});
