import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { test } from 'node:test';
import { AUTHORITY_STAGES, parseStrictJson } from './lib/comment-translator-paid-core-v1-gate1-evidence.mjs';
import { CANONICAL_TABLE_NAMES } from './lib/comment-translator-paid-core-v1-gate1-catalog.mjs';
import { comparePostApplyCatalog } from './lib/comment-translator-paid-core-v1-gate1-postapply-catalog.mjs';
import { verifyGate1Evidence } from './lib/comment-translator-paid-core-v1-gate1-stage-evidence.mjs';
import { validBackupDumpTransport } from './lib/comment-translator-paid-core-v1-gate1-backup-dump-transport.mjs';
import { createApprovalSnapshot, evaluateGate1Decision } from './comment-translator-paid-core-v1-gate1-operator-contract.mjs';

// Isolated module-link fixtures: the actual implementation is compiled intact;
// only native module imports are replaced. The public API has no adapter seam.
const src = fs.readFileSync(new URL('./lib/comment-translator-paid-core-v1-gate1-stage-evidence.mjs', import.meta.url), 'utf8');
const body = src.replace(/^import .*;\r?\n/gm, '').replace('export function verifyGate1Evidence', 'function verifyGate1Evidence');
const operatorSrc = fs.readFileSync(new URL('./comment-translator-paid-core-v1-gate1-operator-contract.mjs', import.meta.url), 'utf8');
const operatorBody = operatorSrc.slice(0, operatorSrc.indexOf('function freshEvidence')).replace(/^import .*;\r?\n/gm, '').replaceAll('export ', '');
const catalogSrc = fs.readFileSync(new URL('./comment-translator-paid-core-v1-gate1-postapply-catalog-contract.mjs', import.meta.url), 'utf8');
const fixtureBody = catalogSrc.slice(catalogSrc.indexOf('const ROOT'), catalogSrc.indexOf('function assertMatch'));
const makeCatalog = new Function('fs', 'path', 'CANONICAL_TABLE_NAMES', fixtureBody + '\nreturn makeFixture;')(fs, path, CANONICAL_TABLE_NAMES);
const hash = x => createHash('sha256').update(x).digest('hex');
const h = n => hash(String(n));
const clone = x => structuredClone(x);
const names = ['roles.sql', 'schema.sql', 'auth_storage_changes.sql', 'data.sql', 'history_schema.sql', 'history_data.sql'];
const bind = Object.fromEntries(['repository', 'preview', 'production', 'rehearsal', 'recovery', 'cloudflare'].map(x => [x, h(x)]));
const targets = [['repository'], ['preview'], ['production', 'rehearsal'], ['production'], ['production'], ['production'], ['production'], ['cloudflare', 'production'], ['production', 'recovery']];
const commandSha256 = hash('select private.ct_paid_invoke_maintenance_from_vault();');

function fixture() {
  const epoch = Date.now() - 3600000;
  const t = seconds => new Date(epoch + seconds * 1000).toISOString();
  const windows = [[0, 10], [11, 20], [21, 200], [201, 240], [250, 260], [261, 270], [281, 290], [291, 910], [911, 920]];
  const index = { sourceCommit: 'a'.repeat(40), migrationCorpusSha256: h('corpus'), stages: {} };
  AUTHORITY_STAGES.forEach((stage, i) => { index.stages[stage] = { targetBindings: Object.fromEntries(targets[i].map(k => [k, bind[k]])), startedAt: t(windows[i][0]), completedAt: t(windows[i][1]), artifacts: [] }; });
  const bundle = { index, artifacts: {} };
  const p = { schemaVersion: 1, maxAgeMs: 7200000, expectedArtifacts: {}, backups: {} };
  const observations = {};
  function add(stage, role, value, pinned = false) {
    const bytes = Buffer.from(JSON.stringify(value));
    const file = `${stage}/${role}.json`;
    index.stages[stage].artifacts.push({ role, path: file, bytes: bytes.length, sha256: hash(bytes) });
    bundle.artifacts[file] = bytes;
    if (pinned) (p.expectedArtifacts[stage] ??= {})[role] = hash(bytes);
  }
  for (const stage of ['previewReadback', 'productionReadback', 'canonicalReadback', 'rehearsalBackup']) {
    const target = stage === 'previewReadback' ? 'preview' : 'production';
    const { artifact, expectations } = makeCatalog(target);
    for (const x of [artifact, expectations]) Object.assign(x, { sourceCommit: index.sourceCommit, migrationCorpusSha256: index.migrationCorpusSha256, targetBindingSha256: bind[stage === 'rehearsalBackup' ? 'rehearsal' : target] });
    add(stage, 'catalog', artifact); add(stage, 'catalog-expectations', expectations, true);
    add(stage, 'security-identities', Object.fromEntries(['namespaces', 'effectivePrivileges', 'nonCatalogReferences', 'extensions', 'limits', 'scheduler', 'transport'].map(k => [k, [{ identity: k, details: { fixture: true } }]])), true);
    const preserved = { vaultRows: 2, vaultNames: 2, vaultIdentitySha256: h('vault'), cronCount: 1, active: 0, jobIdentitySha256: h('previewJob'), commandSha256 };
    observations[stage] = { schemaVersion: 1, archiveSchemaExists: target === 'production', extensions: { pgNet: 'usable', pgCron: 'usable', vault: 'usable' },
      access: { browserTable: 0, browserRpc: 0, browserTransport: 0, archiveApplication: 0, serviceUnexpected: 0 },
      limits: { claimDefault: 50, claimHard: 50, leaseSeconds: 120, retentionDefault: 500, retentionHard: 500, retentionMin: 1, retryAlert: 5, staleTokenRejected: true, invalidRangeRejected: true },
      advisor: { baselineSha256: h('before'), currentSha256: h('after'), newInScope: 0, newHighCritical: 0 }, maintenanceInvocations: 0,
      previewPreservation: target === 'preview' ? { before: preserved, after: clone(preserved), mutations: 0, runDelta: 0, secretReads: 0 } : null };
  }
  const nativeSets = {};
  for (const stage of ['rehearsalBackup', 'finalBackup']) {
    const start = stage === 'rehearsalBackup' ? 22 : 202;
    const files = names.map((name, i) => ({ name, bytes: i === 2 ? 0 : 20, sha256: h(`${stage}-${i}`) }));
    const state = { historyCount: 22, historySha256: h('history'), rowCounts: [{ identitySha256: h('table'), rows: 2 }], authUsers: 1, authForeignKeysSha256: h('fk'), grantsRlsSha256: h('rls'), legacyRows: 0, vaultRows: 0, storageObjects: 0,
      vectorCounts: { 'storage.buckets_vectors': 0, 'storage.vector_indexes': 0 } };
    p.backups[stage] = { directory: path.resolve('.tmp', stage), manifestSha256: h(stage), authReviewSha256: h('auth') };
    nativeSets[p.backups[stage].directory] = { status: 'PERSISTED_BYTES_VERIFIED', manifestSha256: h(stage), artifacts: files };
    observations[stage] = { schemaVersion: 1, t0: t(start), snapshotSha256: h(stage + '-snapshot'),
      exporter: { isolation: 'repeatable read', readOnly: true, serverMajor: 17, closedAt: t(start + 20), exitCode: 0, captureComplete: true, stderrBytes: 0,
        vectorExclusion: { snapshotSha256: h(stage + '-snapshot'), counts: clone(state.vectorCounts) } },
      dumps: names.filter(n => n !== 'auth_storage_changes.sql').map((name, i) => ({ name, snapshotSha256: i === 0 ? null : h(stage + '-snapshot'), startedAt: t(start), completedAt: t(start + 10), rawSha256: h(name), exitCode: 0, captureComplete: true, stderrBytes: 0, clientMajor: 17,
        transport: { encoding: i === 0 ? 'plain' : 'gzip', stdoutBytes: 20, decodedBytes: 20, stdoutSha256: i === 0 ? h(name) : h(name + '-gzip') } })),
      checksumCompletedAt: t(start + 15), manifestSha256: h(stage), files, authReviewSha256: h('auth'), sourceState: state,
      restore: stage === 'finalBackup' ? null : { targetKind: 'isolated-local-supabase', targetBindingSha256: bind.rehearsal, serverMajor: 17,
        transactions: files.map(f => ({ name: f.name, sha256: f.sha256, exitCode: 0, onErrorStop: true, transaction: true })), restoredState: clone(state), bridgeReplay: 'committed-with-history', canonicalReplay: 'exact-catalog-match', cliVersion: '2.109.0', canonicalHistoryCount: 56, canonicalMigrationCorpusSha256: index.migrationCorpusSha256, startedAt: t(50), completedAt: t(180) } };
  }
  observations.vaultReadback = { schemaVersion: 1, records: ['comment_translator_paid_cron_token', 'comment_translator_paid_maintenance_url'].map((name, i) => ({ name, recordIdSha256: h(i), encrypted: true })), total: 2, distinctNames: 2, duplicates: 0, browserAccess: 0, decryptedReads: 0, schemaChanged: false };
  const job = { jobIdSha256: h('job'), matching: 1, active: 0, schedule: '*/5 * * * *', commandSha256, database: 'postgres', username: 'postgres', runs: 0 };
  observations.cronReadback = { schemaVersion: 1, committedAt: t(292), baselineAt: t(291), startedAt: t(300), completedAt: t(900), start: job, end: clone(job), runDelta: 0, schedulerProcessCount: 1, cloudflareFallback: 'inactive', activationMutations: 0 };
  observations.rollbackEvidence = { schemaVersion: 1, state: 'SUCCESS_DISARMED', armedAt: t(241), firstDdlAt: t(245), decisiveReadbackAt: t(270), disarmedAt: t(280), pauseRequests: 0, sourceUnpause: 0, sourceDeletion: 0, rpoMinutes: 20, deadlinesMinutes: { backup: 5, requestPause: 10, confirmPause: 20 }, rehearsalRollback: { failureAfterFirstMutation: true, sourceFingerprintRestored: true, historyRowAbsent: true, successfulRetryCommitted: true } };
  const checklist = { schemaVersion: 1, additionalCost: 0, capacityRoute: 'confirmed-source-pause-frees-slot', activeLimit: 2, activeCount: 2, sourceSlotReleasedOnConfirmedPause: 1, recoverySlotsRequired: 1, provisionAfterPauseConfirmation: true, serverMajor: 17, productionBindingSha256: bind.production, recoveryBindingSha256: bind.recovery,
    configuration: Object.fromEntries(['region', 'extensions', 'authProviders', 'authRedirects', 'endpointCutover', 'secretRotation', 'clientReauthentication', 'freeSmoke', 'reopenWrites', 'exactSourcePause'].map(k => [k, h(k)])),
    incidentSteps: ['confirm-source-inaccessible-by-t0-plus20', 'provision-recovery', 'restore-six-artifacts', 'verify-history-data-auth-grants-rls-vault-storage', 'approved-endpoint-credential-cutover', 'force-reauthentication', 'free-smoke', 'approved-reopen-writes', 'retain-source-paused'] };
  add('rollbackEvidence', 'recovery-checklist', checklist, true);
  for (const [stage, o] of Object.entries(observations)) add(stage, 'observation', o);
  const request = { repositoryRoot: path.resolve('.'), evidenceRoot: path.resolve('.tmp/evidence'), policy: {}, sourcePolicy: { expectedSourceCommit: index.sourceCommit, expectedMigrationCorpusSha256: index.migrationCorpusSha256 }, stagePolicy: p };
  const sourceObservation = { migrations: makeCatalog('preview').artifact.history.rows.map(x => ({ path: `supabase/migrations/${x.version}_${x.name}.sql` })) };
  return { request, bundle, nativeSets, t, sourceObservation };
}

function harness(f, overrides = {}) {
  const calls = { authority: 0, source: 0, backup: 0 };
  const verifier = new Function('createHash', 'path', 'AUTHORITY_STAGES', 'parseStrictJson', 'verifyAuthorityBundle', 'verifySourceCommitStage', 'comparePostApplyCatalog', 'inspectBackupArtifacts', 'validBackupDumpTransport', body + '\nreturn verifyGate1Evidence;')(
    createHash, path, AUTHORITY_STAGES, parseStrictJson,
    () => { calls.authority++; return overrides.authority ?? { status: 'AUTHORITY_VALID', bundle: f.bundle }; },
    () => { calls.source++; return overrides.source ?? { status: 'SOURCE_STAGE_VALID', observation: f.sourceObservation }; },
    comparePostApplyCatalog,
    ({ directory }) => { calls.backup++; if (overrides.backupFailure) throw Error('secret-canary'); return f.nativeSets[directory]; }, validBackupDumpTransport);
  return { verifier, calls };
}
function change(f, stage, role, mutate, repin = false) {
  const ref = f.bundle.index.stages[stage].artifacts.find(x => x.role === role);
  const value = JSON.parse(f.bundle.artifacts[ref.path]); mutate(value);
  const bytes = Buffer.from(JSON.stringify(value)); f.bundle.artifacts[ref.path] = bytes;
  ref.bytes = bytes.length; ref.sha256 = hash(bytes);
  if (repin) f.request.stagePolicy.expectedArtifacts[stage][role] = hash(bytes);
}
function deny(f, overrides) {
  const result = harness(f, overrides).verifier(f.request);
  assert.equal(result.status, 'GATE1_EVIDENCE_UNAVAILABLE');
  assert.deepEqual(result.validStages, []); assert.equal(result.remoteCalls, 0); assert.equal(result.mutations, 0);
  assert.ok(!JSON.stringify(result).includes('secret-canary'));
}

test('nine actual stage validators and real catalog comparator pass synthetic linked modules', () => {
  const f = fixture(), before = JSON.stringify(f.request), { verifier, calls } = harness(f);
  const r = verifier(f.request);
  assert.equal(r.status, 'GATE1_EVIDENCE_VALID'); assert.deepEqual(r.validStages, AUTHORITY_STAGES);
  assert.deepEqual(calls, { authority: 1, source: 1, backup: 2 }); assert.equal(JSON.stringify(f.request), before);
});

test('backup stages fail closed on absent, plain or malformed dump transport evidence', () => {
  for (const stage of ['rehearsalBackup', 'finalBackup']) {
    for (const mutate of [o => { delete o.dumps[1].transport; }, o => { o.dumps[2].transport.encoding = 'plain'; },
      o => { o.dumps[3].transport.decodedBytes = 32 * 1024 * 1024 + 1; },
      o => { o.dumps[0].transport.stdoutSha256 = h('different'); }]) {
      const f = fixture(); change(f, stage, 'observation', mutate); deny(f);
    }
  }
});

test('policy/native authority/source fail closed; native default and arbitrary PASS never grant GO', () => {
  assert.equal(verifyGate1Evidence().status, 'GATE1_EVIDENCE_UNAVAILABLE');
  for (const bad of [null, {}, { status: 'GATE1_EVIDENCE_VALID' }, { stagePolicy: { schemaVersion: 1 }, adapter: {} }]) assert.equal(verifyGate1Evidence(bad).status, 'GATE1_EVIDENCE_UNAVAILABLE');
  for (const overrides of [{ authority: { status: 'AUTHORITY_UNAVAILABLE' } }, { source: { status: 'SOURCE_UNAVAILABLE' } }, { source: { status: 'SOURCE_STAGE_VALID' } }, { backupFailure: true }]) deny(fixture(), overrides);
  const f = fixture(); delete f.request.stagePolicy.expectedArtifacts; const h = harness(f);
  assert.equal(h.verifier(f.request).status, 'GATE1_EVIDENCE_UNAVAILABLE'); assert.deepEqual(h.calls, { authority: 0, source: 0, backup: 0 });
  const approvals = createApprovalSnapshot(); for (const k of Object.keys(approvals).slice(0, 12)) approvals[k] = 'approved';
  assert.equal(evaluateGate1Decision({ approvals, evidence: Object.fromEntries(AUTHORITY_STAGES.map(k => [k, { status: 'PASS' }])) }).decision, 'NO-GO');
  assert.equal(evaluateGate1Decision({ approvals, evidenceRequest: { status: 'GATE1_EVIDENCE_VALID' } }).decision, 'NO-GO');
});

test('operator calls native chain and applies every approval and mutation guard', () => {
  const f = fixture(), h = harness(f);
  const op = new Function('verifyGate1Evidence', operatorBody + '\nreturn {evaluateGate1Decision,createApprovalSnapshot};')(h.verifier);
  const approvals = op.createApprovalSnapshot(); Object.keys(approvals).slice(0, 12).forEach(k => { approvals[k] = 'approved'; });
  assert.equal(op.evaluateGate1Decision({ approvals, evidenceRequest: f.request }).decision, 'GO');
  for (const k of Object.keys(approvals).slice(0, 12)) assert.equal(op.evaluateGate1Decision({ approvals: { ...approvals, [k]: 'unverified' }, evidenceRequest: f.request }).decision, 'NO-GO');
  for (const k of ['activation', 'source-unpause-deletion']) assert.equal(op.evaluateGate1Decision({ approvals: { ...approvals, [k]: 'approved' }, evidenceRequest: f.request }).decision, 'NO-GO');
  for (const mutationCounts of [null, [], { ddl: 1 }, { ddl: '0' }, { ddl: NaN }]) assert.equal(op.evaluateGate1Decision({ approvals, evidenceRequest: f.request, mutationCounts }).decision, 'NO-GO');
});

test('all stages reject missing roles, timing/order/target/source changes and stale/future windows', () => {
  for (const stage of AUTHORITY_STAGES.slice(1)) {
    const f = fixture(); f.bundle.index.stages[stage].artifacts.pop(); deny(f);
    const g = fixture(); g.bundle.index.stages[stage].targetBindings.unexpected = h('extra'); deny(g);
    const z = fixture(); z.bundle.index.stages[stage].startedAt = z.t(0); deny(z);
  }
  for (const mutate of [f => { f.request.stagePolicy.maxAgeMs = 1; }, f => { f.bundle.index.stages.rollbackEvidence.completedAt = new Date(Date.now() + 10000).toISOString(); }, f => { f.bundle.index.sourceCommit = 'b'.repeat(40); }, f => { f.bundle.index.stages.finalBackup.targetBindings.production = h('different'); }, f => { f.bundle.index.stages.sourceCommit.targetBindings.repository = bind.production; }]) { const f = fixture(); mutate(f); deny(f); }
});

test('every postapply hard guard, actual catalog drift and same-count security identity substitution fail', () => {
  for (const stage of ['previewReadback', 'productionReadback', 'canonicalReadback']) {
    for (const mutate of [o => { o.access.browserRpc = 1; }, o => { o.access.serviceUnexpected = 1; }, o => { o.extensions.vault = 'installed'; }, o => { o.archiveSchemaExists = !o.archiveSchemaExists; }, o => { o.limits.leaseSeconds = 121; }, o => { o.limits.staleTokenRejected = false; }, o => { o.limits.retentionHard = 501; }, o => { o.advisor.newHighCritical = 1; }, o => { o.advisor.newInScope = 1; }, o => { o.maintenanceInvocations = 1; }, o => { o.extra = true; }]) { const f = fixture(); change(f, stage, 'observation', mutate); deny(f); }
    const f = fixture(); change(f, stage, 'security-identities', x => { x.nonCatalogReferences[0].identity = 'same-count-substitution'; }); deny(f);
    const g = fixture(); change(g, stage, 'catalog', x => { x.canonical.functions[0].definitionMd5 = '0'.repeat(32); }); deny(g);
    const q = fixture(); change(q, stage, 'catalog-expectations', x => { x.canonical.functions[0].definitionMd5 = '0'.repeat(32); }); deny(q);
  }
  for (const mutate of [o => { o.previewPreservation.after.vaultIdentitySha256 = h('changed'); }, o => { o.previewPreservation.mutations = 1; }, o => { o.previewPreservation.runDelta = 1; }, o => { o.previewPreservation.secretReads = 1; }]) { const f = fixture(); change(f, 'previewReadback', 'observation', mutate); deny(f); }
});

test('backup bytes/snapshot/restore and deadlines cannot be replaced by success labels', () => {
  for (const stage of ['rehearsalBackup', 'finalBackup']) {
    for (const mutate of [o => { o.dumps[1].snapshotSha256 = h('wrong'); }, o => { o.dumps[0].snapshotSha256 = o.snapshotSha256; }, o => { o.dumps[2].captureComplete = false; }, o => { o.dumps[3].exitCode = 1; }, o => { o.exporter.readOnly = false; }, o => { o.exporter.serverMajor = 16; }, o => { o.sourceState.storageObjects = 1; }, o => { o.sourceState.vaultRows = 1; }, o => { o.authReviewSha256 = h('unreviewed'); }, o => { o.files[0].sha256 = h('tampered'); }, o => { o.manifestSha256 = h('other'); }]) { const f = fixture(); change(f, stage, 'observation', mutate); deny(f); }
  }
  for (const mutate of [o => { o.restore.transactions[3].transaction = false; }, o => { o.restore.transactions.reverse(); }, o => { o.restore.restoredState.rowCounts[0].rows++; }, o => { o.restore.targetBindingSha256 = bind.production; }, o => { o.restore.targetKind = 'remote'; }, o => { o.restore.canonicalReplay = 'PASS'; }]) { const f = fixture(); change(f, 'rehearsalBackup', 'observation', mutate); deny(f); }
  const f = fixture(); change(f, 'finalBackup', 'observation', o => { o.checksumCompletedAt = f.t(503); }); deny(f);
});

test('vector exclusion requires complete zero evidence from the same exporter snapshot and restored state', () => {
  for (const stage of ['rehearsalBackup', 'finalBackup']) {
    for (const mutate of [
      o => { delete o.exporter.vectorExclusion; },
      o => { o.exporter.vectorExclusion.snapshotSha256 = h('other-snapshot'); },
      o => { delete o.exporter.vectorExclusion.counts['storage.vector_indexes']; },
      o => { o.exporter.vectorExclusion.counts['storage.buckets_vectors'] = 1; },
      o => { o.exporter.vectorExclusion.counts['storage.vector_indexes'] = '0'; },
      o => { o.exporter.vectorExclusion.counts.extra = 0; },
      o => { delete o.sourceState.vectorCounts; },
      o => { o.sourceState.vectorCounts['storage.vector_indexes'] = 1; },
    ]) { const f = fixture(); change(f, stage, 'observation', mutate); deny(f); }
  }
  const f = fixture(); change(f, 'rehearsalBackup', 'observation', o => { o.restore.restoredState.vectorCounts['storage.buckets_vectors'] = 1; }); deny(f);
});

test('Vault identities/encryption and Cron two-cadence identity/run invariants', () => {
  for (const mutate of [o => { o.total = 3; }, o => { o.records[1].recordIdSha256 = o.records[0].recordIdSha256; }, o => { o.records[0].name = 'other'; }, o => { o.records[0].encrypted = false; }, o => { o.browserAccess = 1; }, o => { o.decryptedReads = 1; }]) { const f = fixture(); change(f, 'vaultReadback', 'observation', mutate); deny(f); }
  for (const mutate of [o => { o.start.active = 1; }, o => { o.end.jobIdSha256 = h('new'); }, o => { o.runDelta = 1; }, o => { o.start.commandSha256 = h('unknown'); }, o => { o.start.schedule = '* * * * *'; }, o => { o.schedulerProcessCount = 2; }, o => { o.cloudflareFallback = 'active'; }, o => { o.activationMutations = 1; }, o => { o.completedAt = o.startedAt; }]) { const f = fixture(); change(f, 'cronReadback', 'observation', mutate); deny(f); }
});

test('rollback success deadlines and zero-cost incident capacity; two active projects are valid', () => {
  for (const mutate of [o => { o.rpoMinutes = 21; }, o => { o.pauseRequests = 1; }, o => { o.sourceUnpause = 1; }, o => { o.sourceDeletion = 1; }, o => { o.rehearsalRollback.historyRowAbsent = false; }]) { const f = fixture(); change(f, 'rollbackEvidence', 'observation', mutate); deny(f); }
  for (const mutate of [c => { c.additionalCost = 1; }, c => { c.activeCount = 3; }, c => { c.sourceSlotReleasedOnConfirmedPause = 0; }, c => { c.provisionAfterPauseConfirmation = false; }, c => { c.serverMajor = 16; }, c => { c.incidentSteps.reverse(); }, c => { delete c.configuration.authProviders; }]) { const f = fixture(); change(f, 'rollbackEvidence', 'recovery-checklist', mutate, true); deny(f); }
  for (const [field, seconds] of [['armedAt', 200], ['firstDdlAt', 230], ['decisiveReadbackAt', 260], ['disarmedAt', 802]]) { const f = fixture(); change(f, 'rollbackEvidence', 'observation', o => { o[field] = f.t(seconds); }); deny(f); }
  const f = fixture(); change(f, 'rollbackEvidence', 'recovery-checklist', c => { c.capacityRoute = 'available-slot'; c.activeCount = 1; c.sourceSlotReleasedOnConfirmedPause = 0; }, true);
  assert.equal(harness(f).verifier(f.request).status, 'GATE1_EVIDENCE_VALID');
});

test('artifact parser rejects duplicate/invalid JSON, stale digests and unknown public adapters', () => {
  for (const bytes of [Buffer.from('{"schemaVersion":1,"schemaVersion":1}'), Buffer.from([0xff]), Buffer.from('{}'), Buffer.from('{')]) {
    const f = fixture(), ref = f.bundle.index.stages.vaultReadback.artifacts[0]; f.bundle.artifacts[ref.path] = bytes; ref.bytes = bytes.length; ref.sha256 = hash(bytes); deny(f);
  }
  const f = fixture(); f.request.adapter = () => true; const z = harness(f); assert.equal(z.verifier(f.request).status, 'GATE1_EVIDENCE_UNAVAILABLE'); assert.equal(z.calls.authority, 0);
  const g = fixture(), ref = g.bundle.index.stages.vaultReadback.artifacts[0]; ref.sha256 = h('stale'); deny(g);
});

test('independent native history and cross-stage structures reject mutually matching fabricated expectations', () => {
  const f = fixture();
  for (const role of ['catalog', 'catalog-expectations']) change(f, 'canonicalReadback', role, x => { x.history.rows[0].name = 'fabricated'; }, role === 'catalog-expectations');
  deny(f);
  const g = fixture();
  for (const role of ['catalog', 'catalog-expectations']) change(g, 'rehearsalBackup', role, x => { x.canonical.functions[0].definitionMd5 = '0'.repeat(32); }, role === 'catalog-expectations');
  deny(g);
  const q = fixture(); q.sourceObservation.migrations[0].path = 'invalid'; deny(q);
  const z = fixture(); change(z, 'rehearsalBackup', 'security-identities', x => { x.namespaces.push(clone(x.namespaces[0])); }, true); deny(z);
  const r = fixture(); change(r, 'rehearsalBackup', 'catalog', x => { x.sourceEra.tables[0].rowCount = 1; }); deny(r);
});

test('five-minute final-backup limit includes persisted completion, not only dump hashes', () => {
  const f = fixture();
  // Keep every later ordering/deadline valid while only final persistence is
  // one second late. Raw checksums/exporter close still finish much earlier.
  f.bundle.index.stages.finalBackup.completedAt = f.t(503);
  const shift = value => new Date(Date.parse(value) + 300000).toISOString();
  for (const stage of AUTHORITY_STAGES.slice(4)) {
    const d = f.bundle.index.stages[stage]; d.startedAt = shift(d.startedAt); d.completedAt = shift(d.completedAt);
  }
  change(f, 'cronReadback', 'observation', o => { for (const k of ['committedAt', 'baselineAt', 'startedAt', 'completedAt']) o[k] = shift(o[k]); });
  change(f, 'rollbackEvidence', 'observation', o => { for (const k of ['armedAt', 'firstDdlAt', 'decisiveReadbackAt', 'disarmedAt']) o[k] = shift(o[k]); });
  deny(f);
});
