import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { parseRestoreSql } from './lib/comment-translator-paid-core-v1-gate1-restore-sql.mjs';
import { parsePublicRpcDeclarations, canonicalStructuralEqual } from './lib/comment-translator-paid-core-v1-gate1-catalog.mjs';

const read = file => fs.readFileSync(file, 'utf8').replace(/\r\n?/g, '\n');
const fixture = JSON.parse(read('scripts/fixtures/comment-translator-paid-core-v1-gate1-preview-entry-observation.json'));
assert.deepEqual(Object.keys(fixture).sort(), ['canonical', 'cron', 'history', 'newlineOnlyFunctions', 'observationSha256', 'purpose', 'schemaVersion', 'vaultNames']);
assert.deepEqual(Object.keys(fixture.cron).sort(), ['active', 'command', 'database', 'jobname', 'nodename', 'nodeport', 'schedule', 'username']);
assert.doesNotMatch(JSON.stringify(fixture), /postgres(?:ql)?:\/\/|eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\./);
const desired = JSON.parse(read('scripts/fixtures/comment-translator-paid-core-v1-gate1-bridge-states.json')).canonical;
const root = 'supabase/migrations';
const forwardName = '20260904000000_comment_translator_paid_gate1_a3_canonical_convergence.sql';
const bridge = read(path.join(root, '20260811000000_comment_translator_paid_v1_legacy_schema_bridge.sql'));
const key = row => `${row.schema}.${row.name}(${row.identityArguments})`;
const latest = new Map();
for (const name of fs.readdirSync(root).filter(n => n.endsWith('.sql') && n !== forwardName).sort()) {
  const sql = read(path.join(root, name));
  for (const span of parseRestoreSql(sql).filter(s => s.kind === 'sql')) {
    const statement = sql.slice(span.tokens[0].start, span.end).trim();
    if (!/^create\s+(?:or\s+replace\s+)?function\s+public\.ct_paid_/i.test(statement)) continue;
    const rows = parsePublicRpcDeclarations(statement);
    assert.equal(rows.length, 1);
    // Some final declarations follow a historical DROP and use CREATE alone.
    // Reinstall without DROP; only the leading declaration keyword may differ.
    latest.set(key(rows[0]), statement.replace(/^create\s+function/i, 'create or replace function'));
  }
}
const semanticNames = ['ct_paid_azure_direct_fallback', 'ct_paid_record_provider_hourly_detail'];
// The final OpenAI definition also includes this source-controlled DO rewrite.
// Direct CREATE declarations alone would silently undo the ordinary-429 guard.
const retryOverride = read(path.join(root, '20260813131500_comment_translator_paid_task6_openai_rate_retry.sql'));
const unquote = value => value.replaceAll("''", "'");
const oldRetryGuard = unquote(retryOverride.match(/v_original := '((?:''|[^'])*)';/)?.[1] ?? '');
const newRetryGuard = unquote(retryOverride.match(/v_definition := replace\(\s*v_definition,\s*v_original,\s*'((?:''|[^'])*)'\s*\);/)?.[1] ?? '');
assert.ok(oldRetryGuard && newRetryGuard);
const retryIdentity = desired.functions.find(f => f.name === 'ct_paid_openai_attempt');
const retrySource = latest.get(key(retryIdentity));
assert.equal(retrySource.split(oldRetryGuard).length - 1, 1);
latest.set(key(retryIdentity), retrySource.replace(oldRetryGuard, () => newRetryGuard));
const identities = [...desired.functions.filter(f => semanticNames.includes(f.name)), ...fixture.newlineOnlyFunctions];
assert.equal(identities.length, 78);
assert.equal(new Set(identities.map(key)).size, 78);
assert.equal(fixture.history.length, 30);
assert.equal(fixture.cron.active, false);
assert.equal(fixture.vaultNames.length, 2);
assert.equal(canonicalStructuralEqual(fixture.canonical, desired), false);
assert.equal(fixture.canonical.functions.filter(f => f.definitionMd5 !== desired.functions.find(d => key(d) === key(f)).definitionMd5).length, 78);
for (const identity of fixture.newlineOnlyFunctions) assert.ok(latest.has(key(identity)));

function assertForward(sql) {
  const spans = parseRestoreSql(sql).filter(s => s.kind !== 'trivia');
  assert.equal(spans.length, 82, 'A3 has exactly 78 definitions and four revokes');
  const definitions = spans.filter(s => s.tokens[3]?.value === 'function');
  assert.equal(definitions.length, 78);
  definitions.forEach((s, index) => assert.ok(sql.slice(s.tokens[0].start, s.end).trim() === latest.get(key(identities[index])), `exact authoritative definition: ${identities[index].name}`));
}
const forward = read(path.join(root, forwardName));
assertForward(forward);
assert.throws(() => assertForward(forward + '\nselect 1;'));
assert.throws(() => assertForward(forward.replace('v_attempt public.', 'v_changed public.')));
assert.throws(() => assertForward(forward.replace(/create or replace function/i, 'create function')));
const match = bridge.match(/v_expected_preview_entry jsonb := \$gate1_preview_entry\$([\s\S]*?)\$gate1_preview_entry\$::jsonb;/);
assert.ok(match, 'bridge has a distinct complete observed Preview entry');
assert.deepEqual(JSON.parse(match[1]), fixture.canonical);
assert.match(bridge, /v_state := 'exact-preview-entry'/);
assert.ok(/v_canonical_reserved_object_count = jsonb_array_length\(v_expected_preview_entry->'tables'\)\s*\+ jsonb_array_length\(v_expected_preview_entry->'functions'\)/.test(bridge), 'the exact Preview entry also refuses unmodeled reserved views, sequences and relations');
assert.match(bridge, /if v_state = 'exact-preview-entry' then/);
assert.match(bridge, /Gate 1 observed Preview Cron metadata mismatch/);
assert.match(bridge, /Gate 1 observed Preview Vault metadata mismatch/);
assert.match(bridge, /Gate 1 observed Preview source-era objects exist/);
assert.match(bridge, /elsif exists \(select 1 from cron.job where jobname = 'comment-translator-paid-maintenance'\)/);
console.log('Gate1 observed Preview convergence source contract: PASS');
