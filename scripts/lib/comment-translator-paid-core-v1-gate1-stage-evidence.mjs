import { createHash } from 'node:crypto';
import path from 'node:path';
import { AUTHORITY_STAGES, parseStrictJson, verifyAuthorityBundle } from './comment-translator-paid-core-v1-gate1-evidence.mjs';
import { verifySourceCommitStage } from './comment-translator-paid-core-v1-gate1-source-evidence.mjs';
import { comparePostApplyCatalog } from './comment-translator-paid-core-v1-gate1-postapply-catalog.mjs';
import { inspectBackupArtifacts } from './comment-translator-paid-core-v1-gate1-backup-artifacts.mjs';

const POST = ['previewReadback', 'productionReadback', 'canonicalReadback'];
const BACKUPS = ['rehearsalBackup', 'finalBackup'];
const TARGETS = {
  sourceCommit: ['repository'], previewReadback: ['preview'],
  rehearsalBackup: ['production', 'rehearsal'], finalBackup: ['production'],
  productionReadback: ['production'], canonicalReadback: ['production'],
  vaultReadback: ['production'], cronReadback: ['cloudflare', 'production'],
  rollbackEvidence: ['production', 'recovery'],
};
const FILES = ['roles.sql', 'schema.sql', 'auth_storage_changes.sql', 'data.sql', 'history_schema.sql', 'history_data.sql'];
const DUMPS = ['roles.sql', 'schema.sql', 'data.sql', 'history_schema.sql', 'history_data.sql'];
const SECURITY_KEYS = ['namespaces', 'effectivePrivileges', 'nonCatalogReferences', 'extensions', 'limits', 'scheduler', 'transport'];
const REQUIRED_NAMES = ['comment_translator_paid_cron_token', 'comment_translator_paid_maintenance_url'];
const digest = value => createHash('sha256').update(value).digest('hex');
const commandHash = digest('select private.ct_paid_invoke_maintenance_from_vault();');
const object = x => x !== null && typeof x === 'object' && !Array.isArray(x);
const keys = (x, names) => object(x) && Object.keys(x).sort().join('\0') === [...names].sort().join('\0');
const sha = x => typeof x === 'string' && /^[a-f0-9]{64}$/.test(x);
const count = x => Number.isSafeInteger(x) && x >= 0;
const iso = x => typeof x === 'string' && /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(x) && Number.isFinite(Date.parse(x)) && new Date(x).toISOString() === x;
const time = x => { require(iso(x)); return Date.parse(x); };
const canonical = x => Array.isArray(x) ? x.map(canonical) : object(x) ? Object.fromEntries(Object.keys(x).sort().map(k => [k, canonical(x[k])])) : x;
const equal = (a, b) => JSON.stringify(canonical(a)) === JSON.stringify(canonical(b));
function require(value) { if (!value) throw new Error('STAGE_EVIDENCE_REJECTED'); }
function zero(x, names) { require(keys(x, names) && Object.values(x).every(v => v === 0)); }
function exact(x, expected) { require(equal(x, expected)); }

// No policy is inferred from an observation. Hashes below are selected by the
// parent from separately reviewed source/replay/baseline artifacts.
function validatePolicy(p) {
  require(keys(p, ['schemaVersion', 'maxAgeMs', 'expectedArtifacts', 'backups']));
  require(p.schemaVersion === 1 && Number.isSafeInteger(p.maxAgeMs) && p.maxAgeMs > 0 && p.maxAgeMs <= 24 * 60 * 60 * 1000);
  require(keys(p.expectedArtifacts, [...POST, 'rehearsalBackup', 'rollbackEvidence']));
  for (const stage of [...POST, 'rehearsalBackup']) {
    require(keys(p.expectedArtifacts[stage], ['catalog-expectations', 'security-identities']));
    require(Object.values(p.expectedArtifacts[stage]).every(sha));
  }
  require(keys(p.expectedArtifacts.rollbackEvidence, ['recovery-checklist']) && sha(p.expectedArtifacts.rollbackEvidence['recovery-checklist']));
  require(keys(p.backups, BACKUPS));
  for (const stage of BACKUPS) {
    const b = p.backups[stage];
    require(keys(b, ['directory', 'manifestSha256', 'authReviewSha256']) && typeof b.directory === 'string' && path.isAbsolute(b.directory));
    require(sha(b.manifestSha256) && sha(b.authReviewSha256));
  }
  require(path.resolve(p.backups.rehearsalBackup.directory).toLowerCase() !== path.resolve(p.backups.finalBackup.directory).toLowerCase());
}

function roles(stage) {
  return [...POST, 'rehearsalBackup'].includes(stage) ? ['observation', 'catalog', 'catalog-expectations', 'security-identities']
    : stage === 'rollbackEvidence' ? ['observation', 'recovery-checklist'] : ['observation'];
}

function loadStage(bundle, stage, policy) {
  const descriptor = bundle.index.stages[stage];
  exact(Object.keys(descriptor.targetBindings).sort(), [...TARGETS[stage]].sort());
  exact(descriptor.artifacts.map(a => a.role).sort(), roles(stage).sort());
  const values = {};
  for (const ref of descriptor.artifacts) {
    const bytes = bundle.artifacts[ref.path];
    require(Buffer.isBuffer(bytes) && bytes.length === ref.bytes && digest(bytes) === ref.sha256);
    const pinned = policy.expectedArtifacts[stage]?.[ref.role];
    if (pinned !== undefined) require(pinned === digest(bytes));
    values[ref.role] = parseStrictJson(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
  }
  return values;
}

function validateTimeline(index, policy, now) {
  let last = 0;
  const bindings = {};
  for (const stage of AUTHORITY_STAGES) {
    const d = index.stages[stage];
    exact(Object.keys(d.targetBindings).sort(), [...TARGETS[stage]].sort());
    const start = time(d.startedAt), end = time(d.completedAt);
    require(start >= last && end >= start && end <= now && now - start <= policy.maxAgeMs);
    last = end;
    for (const [key, value] of Object.entries(d.targetBindings)) {
      require(sha(value) && (bindings[key] === undefined || bindings[key] === value));
      bindings[key] = value;
    }
  }
  // Distinct projects/endpoints cannot be relabelled to satisfy isolation.
  require(new Set(Object.values(bindings)).size === Object.keys(bindings).length);
}

function within(value, d) { const n = time(value); require(n >= time(d.startedAt) && n <= time(d.completedAt)); return n; }

function securityIdentities(values) {
  const identities = values['security-identities'];
  require(keys(identities, SECURITY_KEYS));
  // Full ordered identities are pinned, not reduced to aggregate counts.
  for (const name of SECURITY_KEYS) {
    require(Array.isArray(identities[name]));
    let previous = '';
    for (const row of identities[name]) {
      require(keys(row, ['identity', 'details']) && typeof row.identity === 'string' && row.identity.length > 0 && row.identity > previous && object(row.details) && Object.keys(row.details).length > 0);
      previous = row.identity;
    }
  }
  for (const name of SECURITY_KEYS.filter(x => x !== 'nonCatalogReferences')) require(identities[name].length > 0);
}

function compareCatalog(stage, values, bundle, sourceObservation) {
  securityIdentities(values);
  const a = values.catalog, e = values['catalog-expectations'];
  const target = stage === 'previewReadback' ? 'preview' : 'production';
  const binding = stage === 'rehearsalBackup' ? 'rehearsal' : target;
  require(a.target === target && a.sourceCommit === bundle.index.sourceCommit && a.migrationCorpusSha256 === bundle.index.migrationCorpusSha256);
  require(a.targetBindingSha256 === bundle.index.stages[stage].targetBindings[binding]);
  require(Array.isArray(sourceObservation?.migrations) && sourceObservation.migrations.length === 56);
  const history = sourceObservation.migrations.map(row => {
    const match = /^supabase\/migrations\/(\d{14})_([a-z0-9_]+)\.sql$/.exec(row.path);
    require(match); return { version: match[1], name: match[2] };
  });
  exact(a.history, { rows: history });
  require(comparePostApplyCatalog({ artifact: a, expectations: e }).status === 'POSTAPPLY_CATALOG_MATCH');
}

function postApply(stage, values, bundle, sourceObservation) {
  const o = values.observation;
  require(keys(o, ['schemaVersion', 'archiveSchemaExists', 'extensions', 'access', 'limits', 'advisor', 'maintenanceInvocations', 'previewPreservation']));
  require(o.schemaVersion === 1 && o.archiveSchemaExists === (stage !== 'previewReadback') && o.maintenanceInvocations === 0);
  exact(o.extensions, { pgNet: 'usable', pgCron: 'usable', vault: 'usable' });
  zero(o.access, ['browserTable', 'browserRpc', 'browserTransport', 'archiveApplication', 'serviceUnexpected']);
  exact(o.limits, { claimDefault: 50, claimHard: 50, leaseSeconds: 120, retentionDefault: 500, retentionHard: 500,
    retentionMin: 1, retryAlert: 5, staleTokenRejected: true, invalidRangeRejected: true });
  require(keys(o.advisor, ['baselineSha256', 'currentSha256', 'newInScope', 'newHighCritical']) && sha(o.advisor.baselineSha256) && sha(o.advisor.currentSha256));
  require(o.advisor.newInScope === 0 && o.advisor.newHighCritical === 0);
  if (stage === 'previewReadback') {
    const p = o.previewPreservation;
    require(keys(p, ['before', 'after', 'mutations', 'runDelta', 'secretReads']));
    require(keys(p.before, ['vaultRows', 'vaultNames', 'vaultIdentitySha256', 'cronCount', 'active', 'jobIdentitySha256', 'commandSha256']));
    require(p.before.vaultRows === 2 && p.before.vaultNames === 2 && p.before.cronCount === 1 && p.before.active === 0);
    require(sha(p.before.vaultIdentitySha256) && sha(p.before.jobIdentitySha256) && p.before.commandSha256 === commandHash);
    exact(p.before, p.after);
    require(p.mutations === 0 && p.runDelta === 0 && p.secretReads === 0);
  } else require(o.previewPreservation === null);
  compareCatalog(stage, values, bundle, sourceObservation);
}

function validState(s) {
  require(keys(s, ['historyCount', 'historySha256', 'rowCounts', 'authUsers', 'authForeignKeysSha256', 'grantsRlsSha256', 'legacyRows', 'vaultRows', 'storageObjects', 'vectorCounts']));
  require(Number.isSafeInteger(s.historyCount) && s.historyCount > 0 && sha(s.historySha256) && sha(s.authForeignKeysSha256) && sha(s.grantsRlsSha256));
  require(count(s.authUsers) && s.legacyRows === 0 && s.vaultRows === 0 && s.storageObjects === 0);
  zero(s.vectorCounts, ['storage.buckets_vectors', 'storage.vector_indexes']);
  require(Array.isArray(s.rowCounts) && s.rowCounts.length > 0);
  let previous = '';
  for (const row of s.rowCounts) {
    require(keys(row, ['identitySha256', 'rows']) && sha(row.identitySha256) && count(row.rows) && row.identitySha256 > previous);
    previous = row.identitySha256;
  }
}

function backup(stage, values, bundle, policy) {
  const o = values.observation, d = bundle.index.stages[stage], p = policy.backups[stage];
  require(keys(o, ['schemaVersion', 't0', 'snapshotSha256', 'exporter', 'dumps', 'checksumCompletedAt', 'manifestSha256', 'files', 'authReviewSha256', 'sourceState', 'restore']));
  require(o.schemaVersion === 1 && sha(o.snapshotSha256) && o.manifestSha256 === p.manifestSha256 && o.authReviewSha256 === p.authReviewSha256);
  const t0 = within(o.t0, d), complete = within(o.checksumCompletedAt, d);
  require(complete >= t0 && (stage !== 'finalBackup' || complete <= t0 + 300000));
  // Successful dump hashes alone do not establish a usable recovery set.
  // The authority-bound stage includes the completed restricted persistence.
  require(stage !== 'finalBackup' || time(d.completedAt) <= t0 + 300000);
  require(keys(o.exporter, ['isolation', 'readOnly', 'serverMajor', 'closedAt', 'exitCode', 'captureComplete', 'stderrBytes', 'vectorExclusion']));
  require(o.exporter.isolation === 'repeatable read' && o.exporter.readOnly === true && o.exporter.serverMajor === 17 && o.exporter.exitCode === 0 && o.exporter.captureComplete === true && o.exporter.stderrBytes === 0);
  require(keys(o.exporter.vectorExclusion, ['snapshotSha256', 'counts']) && o.exporter.vectorExclusion.snapshotSha256 === o.snapshotSha256);
  zero(o.exporter.vectorExclusion.counts, ['storage.buckets_vectors', 'storage.vector_indexes']);
  require(within(o.exporter.closedAt, d) >= complete);
  require(Array.isArray(o.dumps) && o.dumps.length === 5);
  o.dumps.forEach((r, i) => {
    require(keys(r, ['name', 'snapshotSha256', 'startedAt', 'completedAt', 'rawSha256', 'exitCode', 'captureComplete', 'stderrBytes', 'clientMajor']));
    require(r.name === DUMPS[i] && sha(r.rawSha256) && r.exitCode === 0 && r.captureComplete === true && r.stderrBytes === 0 && r.clientMajor === 17);
    require(r.snapshotSha256 === (i === 0 ? null : o.snapshotSha256));
    const start = within(r.startedAt, d), end = within(r.completedAt, d);
    require(end >= start && end <= complete && (i === 0 || start >= t0));
  });
  require(Array.isArray(o.files) && o.files.length === 6);
  o.files.forEach((f, i) => require(keys(f, ['name', 'bytes', 'sha256']) && f.name === FILES[i] && count(f.bytes) && (i === 2 || f.bytes > 0) && sha(f.sha256)));
  validState(o.sourceState);
  require(o.sourceState.historyCount === 22);
  if (stage === 'finalBackup') require(o.restore === null);
  else {
    const r = o.restore;
    require(keys(r, ['targetKind', 'targetBindingSha256', 'serverMajor', 'transactions', 'restoredState', 'bridgeReplay', 'canonicalReplay', 'cliVersion', 'canonicalHistoryCount', 'canonicalMigrationCorpusSha256', 'startedAt', 'completedAt']));
    require(r.targetKind === 'isolated-local-supabase' && r.targetBindingSha256 === d.targetBindings.rehearsal && r.serverMajor === 17 && r.cliVersion === '2.109.0');
    require(within(r.startedAt, d) >= time(o.exporter.closedAt) && within(r.completedAt, d) >= time(r.startedAt));
    require(Array.isArray(r.transactions) && r.transactions.length === 6);
    r.transactions.forEach((x, i) => {
      exact(x, { name: FILES[i], sha256: o.files[i].sha256, exitCode: 0, onErrorStop: true, transaction: true });
    });
    validState(r.restoredState); exact(r.restoredState, o.sourceState);
    require(r.bridgeReplay === 'committed-with-history' && r.canonicalReplay === 'exact-catalog-match' && r.canonicalHistoryCount === 56 && r.canonicalMigrationCorpusSha256 === bundle.index.migrationCorpusSha256);
  }
  const native = inspectBackupArtifacts({ directory: p.directory, expectedManifestSha256: p.manifestSha256 });
  require(native.status === 'PERSISTED_BYTES_VERIFIED' && native.manifestSha256 === p.manifestSha256);
  exact(native.artifacts, o.files);
}

function vault(values) {
  const o = values.observation;
  require(keys(o, ['schemaVersion', 'records', 'total', 'distinctNames', 'duplicates', 'browserAccess', 'decryptedReads', 'schemaChanged']));
  require(o.schemaVersion === 1 && o.total === 2 && o.distinctNames === 2 && o.duplicates === 0 && o.browserAccess === 0 && o.decryptedReads === 0 && o.schemaChanged === false);
  require(Array.isArray(o.records) && o.records.length === 2);
  o.records.forEach((r, i) => require(keys(r, ['name', 'recordIdSha256', 'encrypted']) && r.name === REQUIRED_NAMES[i] && sha(r.recordIdSha256) && r.encrypted === true));
  require(o.records[0].recordIdSha256 !== o.records[1].recordIdSha256);
}

function cron(values, d) {
  const o = values.observation;
  require(keys(o, ['schemaVersion', 'committedAt', 'baselineAt', 'startedAt', 'completedAt', 'start', 'end', 'runDelta', 'schedulerProcessCount', 'cloudflareFallback', 'activationMutations']));
  require(o.schemaVersion === 1 && time(o.baselineAt) <= within(o.committedAt, d));
  require(within(o.startedAt, d) >= time(o.committedAt) && within(o.completedAt, d) - time(o.startedAt) >= 600000);
  require(keys(o.start, ['jobIdSha256', 'matching', 'active', 'schedule', 'commandSha256', 'database', 'username', 'runs']));
  const s = o.start;
  require(sha(s.jobIdSha256) && s.matching === 1 && s.active === 0 && s.schedule === '*/5 * * * *' && s.commandSha256 === commandHash && s.database === 'postgres' && s.username === 'postgres' && s.runs === 0);
  exact(o.start, o.end);
  require(o.runDelta === 0 && o.schedulerProcessCount === 1 && ['absent', 'inactive'].includes(o.cloudflareFallback) && o.activationMutations === 0);
}

function rollback(values, bundle, loaded) {
  const o = values.observation, c = values['recovery-checklist'];
  require(keys(o, ['schemaVersion', 'state', 'armedAt', 'firstDdlAt', 'decisiveReadbackAt', 'disarmedAt', 'pauseRequests', 'sourceUnpause', 'sourceDeletion', 'rpoMinutes', 'deadlinesMinutes', 'rehearsalRollback']));
  require(o.schemaVersion === 1 && o.state === 'SUCCESS_DISARMED' && o.pauseRequests === 0 && o.sourceUnpause === 0 && o.sourceDeletion === 0 && o.rpoMinutes === 20);
  exact(o.deadlinesMinutes, { backup: 5, requestPause: 10, confirmPause: 20 });
  exact(o.rehearsalRollback, { failureAfterFirstMutation: true, sourceFingerprintRestored: true, historyRowAbsent: true, successfulRetryCommitted: true });
  const f = loaded.finalBackup.observation;
  require(time(o.armedAt) >= time(f.exporter.closedAt) && time(o.firstDdlAt) >= time(o.armedAt));
  require(time(o.firstDdlAt) >= time(bundle.index.stages.finalBackup.completedAt));
  require(time(o.firstDdlAt) <= time(bundle.index.stages.productionReadback.startedAt));
  require(time(o.decisiveReadbackAt) >= time(bundle.index.stages.canonicalReadback.completedAt));
  require(time(o.disarmedAt) >= time(o.decisiveReadbackAt) && time(o.disarmedAt) < time(f.t0) + 600000);
  require(time(o.disarmedAt) <= time(bundle.index.stages.vaultReadback.startedAt));
  require(keys(c, ['schemaVersion', 'additionalCost', 'capacityRoute', 'activeLimit', 'activeCount', 'sourceSlotReleasedOnConfirmedPause', 'recoverySlotsRequired', 'provisionAfterPauseConfirmation', 'serverMajor', 'productionBindingSha256', 'recoveryBindingSha256', 'configuration', 'incidentSteps']));
  require(c.schemaVersion === 1 && c.additionalCost === 0 && count(c.activeLimit) && count(c.activeCount) && c.activeLimit > 0 && c.activeCount <= c.activeLimit && c.recoverySlotsRequired === 1 && c.serverMajor === 17);
  require(c.productionBindingSha256 === bundle.index.stages.rollbackEvidence.targetBindings.production && c.recoveryBindingSha256 === bundle.index.stages.rollbackEvidence.targetBindings.recovery);
  if (c.capacityRoute === 'available-slot') require(c.activeLimit - c.activeCount >= 1 && c.sourceSlotReleasedOnConfirmedPause === 0 && c.provisionAfterPauseConfirmation === true);
  else require(c.capacityRoute === 'confirmed-source-pause-frees-slot' && c.sourceSlotReleasedOnConfirmedPause === 1 && c.activeCount >= 1 && c.activeLimit - c.activeCount + 1 >= 1 && c.provisionAfterPauseConfirmation === true);
  require(keys(c.configuration, ['region', 'extensions', 'authProviders', 'authRedirects', 'endpointCutover', 'secretRotation', 'clientReauthentication', 'freeSmoke', 'reopenWrites', 'exactSourcePause']));
  require(Object.values(c.configuration).every(sha));
  exact(c.incidentSteps, ['confirm-source-inaccessible-by-t0-plus20', 'provision-recovery', 'restore-six-artifacts', 'verify-history-data-auth-grants-rls-vault-storage', 'approved-endpoint-credential-cutover', 'force-reauthentication', 'free-smoke', 'approved-reopen-writes', 'retain-source-paused']);
}

// A returned status is evidence only together with the parent's independently
// confirmed immutable policy and native execution receipt (R3 authority rule).
export function verifyGate1Evidence(request = {}) {
  const unavailable = () => ({ status: 'GATE1_EVIDENCE_UNAVAILABLE', reason: 'REQUIRED_EVIDENCE_UNAVAILABLE', validStages: [], remoteCalls: 0, mutations: 0 });
  try {
    require(keys(request, ['repositoryRoot', 'evidenceRoot', 'policy', 'sourcePolicy', 'stagePolicy']));
    const { repositoryRoot, evidenceRoot, policy, sourcePolicy, stagePolicy } = request;
    validatePolicy(stagePolicy);
    require(typeof repositoryRoot === 'string' && path.isAbsolute(repositoryRoot) && typeof evidenceRoot === 'string' && path.isAbsolute(evidenceRoot));
    const authority = verifyAuthorityBundle({ repositoryRoot, evidenceRoot, policy });
    require(authority.status === 'AUTHORITY_VALID' && authority.bundle);
    const source = verifySourceCommitStage({ repositoryRoot, evidenceRoot, policy, sourcePolicy });
    require(source.status === 'SOURCE_STAGE_VALID');
    const bundle = authority.bundle;
    require(bundle.index.sourceCommit === sourcePolicy.expectedSourceCommit && bundle.index.migrationCorpusSha256 === sourcePolicy.expectedMigrationCorpusSha256);
    validateTimeline(bundle.index, stagePolicy, Date.now());
    const loaded = {};
    for (const stage of AUTHORITY_STAGES.slice(1)) loaded[stage] = loadStage(bundle, stage, stagePolicy);
    for (const stage of POST) postApply(stage, loaded[stage], bundle, source.observation);
    compareCatalog('rehearsalBackup', loaded.rehearsalBackup, bundle, source.observation);
    // Rehearsal, deployed Production and decisive readback share the same full
    // structure. Canonical data counts may change while Free remains online.
    const structural = a => ({ history: a.history, canonical: { ...a.canonical,
      tables: a.canonical.tables.map(({ rowCount: _rowCount, ...table }) => table) },
      archive: a.archive, sourceEra: a.sourceEra, pgDependEdges: a.pgDependEdges });
    const canonicalOnly = a => structural(a).canonical;
    for (const stage of ['rehearsalBackup', 'productionReadback']) exact(structural(loaded[stage].catalog), structural(loaded.canonicalReadback.catalog));
    exact(canonicalOnly(loaded.previewReadback.catalog), canonicalOnly(loaded.canonicalReadback.catalog));
    for (const stage of BACKUPS) backup(stage, loaded[stage], bundle, stagePolicy);
    vault(loaded.vaultReadback);
    cron(loaded.cronReadback, bundle.index.stages.cronReadback);
    rollback(loaded.rollbackEvidence, bundle, loaded);
    // Source/authority are native reads; bulk-file verification never creates
    // receipts or rewrites artifacts. No hosted call is made here.
    return { status: 'GATE1_EVIDENCE_VALID', reason: null, validStages: [...AUTHORITY_STAGES], remoteCalls: 0, mutations: 0 };
  } catch { return unavailable(); }
}
