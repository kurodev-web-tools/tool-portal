import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createHash } from 'node:crypto';
import * as atomic from './lib/comment-translator-paid-core-v1-gate1-atomic-restore.mjs';
import { parseRestoreSql } from './lib/comment-translator-paid-core-v1-gate1-restore-sql.mjs';
const hash = x => createHash('sha256').update(x).digest('hex');
const names = ['roles.sql', 'schema.sql', 'auth_storage_changes.sql', 'data.sql', 'history_schema.sql', 'history_data.sql'];
const state = () => ({ historyCount: 22, historySha256: hash('history'), rowCounts: [{ identitySha256: hash('table'), rows: 2 }],
  authUsers: 1, authForeignKeysSha256: hash('fk'), grantsRlsSha256: hash('acl'), legacyRows: 0, vaultRows: 0, storageObjects: 0,
  vectorCounts: { 'storage.buckets_vectors': 0, 'storage.vector_indexes': 0 } });
const input = () => ({ artifacts: names.map((name, i) => { const sql = i === 2 ? '' : 'SELECT 1;';
  return { name, sql, bytes: Buffer.byteLength(sql), sha256: hash(sql) }; }), sourceState: state() });
test('atomic path has a separately versioned builder', () => {
  assert.equal(typeof atomic.buildAtomicRestore, 'function');
});
test('all original artifacts precede fixed preservation/reset/commit', () => {
  const request = input(), result = atomic.buildAtomicRestore(request);
  assert.equal(result.schemaVersion, 1);
  assert.equal(result.stageAuthority, false);
  assert.deepEqual(result.artifacts.map(a => a.name), names);
  assert.equal(result.sql.match(/^BEGIN;/gm)?.length, 1);
  assert.equal(result.sql.match(/^COMMIT;/gm)?.length, 1);
  assert.ok(result.sql.indexOf('SELECT 1;') < result.sql.indexOf('ATOMIC_SOURCE_STATE_MISMATCH'));
  assert.ok(result.sql.indexOf('ATOMIC_SOURCE_STATE_MISMATCH') < result.sql.indexOf('DELETE FROM auth.refresh_tokens'));
  assert.ok(result.sql.indexOf('ATOMIC_DELTA_MISMATCH') < result.sql.lastIndexOf('COMMIT;'));
});
test('tampering and transaction control fail before native execution', () => {
  for (const sql of ['COMMIT;', 'END;', 'ROLLBACK;', 'BEGIN;', 'START TRANSACTION;', 'PREPARE TRANSACTION \'x\';',
    'VACUUM;', 'CREATE DATABASE x;', 'CREATE INDEX CONCURRENTLY x ON t(c);', 'CALL x();', 'SELECT pg_catalog.setval(\'seq\',1);',
    'SELECT pg_catalog."nextval"(\'seq\');', '\\i secret.sql\n', 'COPY t FROM STDIN;\n1\n\\.']) {
    const request = input(); request.artifacts[0] = { name: names[0], sql, bytes: Buffer.byteLength(sql), sha256: hash(sql) };
    assert.throws(() => atomic.buildAtomicRestore(request), /ATOMIC_RESTORE_INPUT_REJECTED/);
  }
  const bad = input(); bad.artifacts[0].sql += ' '; assert.throws(() => atomic.buildAtomicRestore(bad));
  const extra = input(); extra.resetSql = 'DELETE FROM auth.users;'; assert.throws(() => atomic.buildAtomicRestore(extra));
});
test('SQL literals and function bodies do not create false transaction boundaries', () => {
  const request = input(), sql = "SELECT 'COMMIT;'; CREATE FUNCTION public.fixture() RETURNS text LANGUAGE sql AS $$SELECT 'BEGIN;';$$;";
  request.artifacts[0] = { name: names[0], sql, bytes: Buffer.byteLength(sql), sha256: hash(sql) };
  assert.ok(atomic.buildAtomicRestore(request).sql.includes(sql));
});

test('opt-in COPY text payload remains opaque and byte exact', () => {
  const sql = String.raw`COPY public.fixture (value) FROM stdin;
COMMIT;
\\.
\! do-not-execute
\.
SELECT 1;
`;
  assert.throws(() => parseRestoreSql(sql));
  const spans = parseRestoreSql(sql, { allowCopyText: true });
  assert.equal(spans[0].kind, 'copy');
  assert.equal(spans.map(s => sql.slice(s.start,s.end)).join(''),sql);
  const request=input();request.artifacts[3]={name:names[3],sql,bytes:Buffer.byteLength(sql),sha256:hash(sql)};
  assert.ok(atomic.buildAtomicRestore(request).sql.includes(sql));
});

test('COPY modes, missing terminators and commands after the terminator fail closed', () => {
  for(const sql of ['COPY public.t (v) TO STDOUT;\n', 'COPY public.t (v) FROM stdin WITH (FORMAT csv);\na\n\\.\n',
    'COPY public.t (v) FROM stdin;\na\n', 'COPY public.t (v) FROM stdin;\na\n\\.\nCOMMIT;',
    'COPY public.t (v) FROM stdin;\na\n\\.\n\\! unsafe\n']) {
    const request=input();request.artifacts[3]={name:names[3],sql,bytes:Buffer.byteLength(sql),sha256:hash(sql)};
    assert.throws(()=>atomic.buildAtomicRestore(request),/ATOMIC_RESTORE_INPUT_REJECTED/);
  }
});

test('native setval is retained behind a transactional sequence guard', () => {
  const request=input(),sql="SELECT pg_catalog.setval('public.fixture_seq', 42, false);";
  request.artifacts[3]={name:names[3],sql,bytes:Buffer.byteLength(sql),sha256:hash(sql)};
  const result=atomic.buildAtomicRestore(request);
  assert.ok(result.sql.includes(sql));
  assert.ok(result.sql.indexOf('ALTER SEQUENCE "public"."fixture_seq" RESTART;')<result.sql.indexOf(sql));
  assert.equal(result.artifacts[3].sha256,hash(sql));
});

test('reviewed no-change artifact may contain only comments; COPY alone is a complete span', () => {
  const request=input(),sql='-- Reviewed Auth/Storage changes: none.\n/* no DDL */\n';
  request.artifacts[2]={name:names[2],sql,bytes:Buffer.byteLength(sql),sha256:hash(sql)};
  assert.ok(atomic.buildAtomicRestore(request).sql.includes(sql));
  assert.throws(()=>parseRestoreSql(sql));
  const copy='COPY public.t (v) FROM stdin;\na\n\\.\n';
  assert.equal(parseRestoreSql(copy,{allowCopyText:true})[0].kind,'copy');
});

test('discard policy preserves the managed setter but does not promise its rollback', () => {
  const request=input(),sql="SELECT pg_catalog.setval('auth.refresh_tokens_id_seq',42,true);\nSELECT pg_catalog.setval('public.owned_seq',8,false);";
  request.artifacts[3]={name:names[3],sql,bytes:Buffer.byteLength(sql),sha256:hash(sql)};
  const strict=atomic.buildAtomicRestore(request);
  assert.ok(strict.sql.includes('ALTER SEQUENCE "auth"."refresh_tokens_id_seq" RESTART;'));
  const discard=atomic.buildAtomicRestore(request,{failurePolicy:'discard-target-v1'});
  assert.ok(discard.sql.includes(sql));assert.ok(!discard.sql.includes('ALTER SEQUENCE "auth"."refresh_tokens_id_seq" RESTART;'));
  assert.ok(discard.sql.includes('ALTER SEQUENCE "public"."owned_seq" RESTART;'));
  assert.equal(discard.failurePolicy,'discard-target-v1');assert.equal(discard.wholeStateRollbackGuaranteed,false);
  assert.throws(()=>atomic.buildAtomicRestore(request,{failurePolicy:'skip-all-guards'}),/ATOMIC_RESTORE_INPUT_REJECTED/);
});
