import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseRestoreSql, transformRestoreRoles, transformRestoreSchema } from './lib/comment-translator-paid-core-v1-gate1-restore-sql.mjs';

const setting = 'SET standard_conforming_strings = on;\n';
const sqlSpans = (source) => parseRestoreSql(source).filter((s) => s.kind === 'sql');
test('exact spans preserve Unicode, CRLF, comments and opaque bodies', () => {
  const source = '\\restrict ABC123\r\n-- 😀\r\n' + setting +
    'CREATE FUNCTION "名😀"() RETURNS void AS $body$\r\nCREATE TABLE hidden();\r\n$body$ LANGUAGE sql;\r\n' +
    '/* outer /* nested ; */ comment */ SELECT \'GRANT "x";\';\r\n\\unrestrict ABC123\r\n';
  const spans = parseRestoreSql(source);
  assert.equal(spans.map((s) => source.slice(s.start, s.end)).join(''), source);
  assert.equal(spans.filter((s) => s.kind === 'sql').length, 3);
  assert.equal(spans.filter((s) => s.kind === 'directive').length, 2);
  assert.equal(spans.flatMap((s) => s.tokens).some((t) => t.value === 'hidden'), false);
  for (const span of spans) for (const token of span.tokens) {
    assert.ok(token.start >= span.start && token.end <= span.end);
  }
});
test('quote and escape semantics leave semicolons inside strings', () => {
  for (const literal of ["'a'';b'", "E'a\\';b'", "'a\\'", '$tag$a;😀$tag$']) {
    assert.equal(sqlSpans(setting + `SELECT ${literal};`).length, 2);
  }
  assert.equal(sqlSpans("SET standard_conforming_strings TO off; SELECT 'a\\';b';").length, 2);
  assert.equal(sqlSpans('SELECT "😀;a""b";').length, 1);
});
test('Unicode before every quote form cannot change lexical offsets', () => {
  for (const literal of ["'CREATE; GRANT'", "E'CREATE; GRANT'", '"CREATE; GRANT"', '$x$CREATE; GRANT$x$']) {
    const source = setting + `-- 😀\nSELECT ${literal};`;
    const spans = parseRestoreSql(source);
    assert.equal(spans.map((s) => source.slice(s.start, s.end)).join(''), source);
    assert.equal(spans.filter((s) => s.kind === 'sql').length, 2);
  }
});
test('unterminated and unsupported inputs fail without reflecting input', () => {
  const cases = ["SELECT 'unfinished", 'SELECT "unfinished', 'SELECT $tag$unfinished',
    'SELECT 1; /* /* nested */', 'SELECT 1', 'COPY "t" FROM STDIN;\na\n\\.\n',
    '\\i private-file\nSELECT 1;', '\\restrict ABC\nSELECT 1;',
    '\\unrestrict ABC\nSELECT 1;', '\\restrict ABC\nSELECT 1;\n\\unrestrict DEF',
    '\\restrict ABC\n\\restrict DEF\nSELECT 1;', 'SELECT U&"name";',
    "SELECT B'0101';", 'SELECT 1;\0', 'SELECT \ud800;',
    'SET LOCAL standard_conforming_strings = off;', 'SET standard_conforming_strings = maybe;'];
  for (const input of cases) {
    assert.throws(() => parseRestoreSql(setting + input), {message:'RESTORE_SQL_LEXICAL_REJECTED'});
  }
  for (const input of ['', ' ', null, 'x'.repeat(32 * 1024 * 1024 + 1)]) {
    assert.throws(() => parseRestoreSql(input), {message:'RESTORE_SQL_LEXICAL_REJECTED'});
  }
});
test('ambiguous backslashes require explicit known session mode', () => {
  assert.equal(sqlSpans("SET default_transaction_read_only = off; SET client_encoding = 'UTF8'; " + setting).length, 3);
  assert.throws(() => parseRestoreSql("SELECT 'val\\ue';"));
  assert.throws(() => parseRestoreSql(setting + "RESET ALL; SELECT 'val\\ue';"));
  assert.equal(sqlSpans(setting + 'RESET ALL;').length, 2);
});
test('bounded token and span counts prevent small-input allocation amplification', () => {
  assert.throws(() => parseRestoreSql('SELECT ' + '+'.repeat(250_001) + ';'), {message:'RESTORE_SQL_LEXICAL_REJECTED'});
  assert.throws(() => parseRestoreSql('SELECT 1;'.repeat(100_001)), {message:'RESTORE_SQL_LEXICAL_REJECTED'});
});

const roleAttributes = 'NOSUPERUSER INHERIT NOCREATEROLE NOCREATEDB NOLOGIN NOREPLICATION NOBYPASSRLS';
test('roles transform excludes reserved roles and edits only attribute tokens', () => {
  const source = '\\restrict Key123\n' + setting +
    'CREATE ROLE "postgres";\nALTER ROLE "postgres" WITH ' + roleAttributes + ';\n' +
    'CREATE ROLE "custom😀";\nALTER ROLE "custom😀" WITH ' + roleAttributes +
    " VALID UNTIL 'NOSUPERUSER NOREPLICATION';\n\\unrestrict Key123\n";
  const result = transformRestoreRoles(source);
  assert.deepEqual(result.counts, { statements: 5, omitted: 2, attributesRemoved: 2 });
  assert.ok(!result.sql.includes('ROLE "postgres"'));
  assert.ok(result.sql.includes("VALID UNTIL 'NOSUPERUSER NOREPLICATION'"));
  assert.ok(result.sql.includes('CREATE ROLE "custom😀";'));
  assert.ok(result.sql.includes('WITH  INHERIT NOCREATEROLE NOCREATEDB NOLOGIN  NOBYPASSRLS'));
  assert.equal(parseRestoreSql(result.sql).filter((s) => s.kind === 'directive').length, 2);
});
test('reserved role setting policy is independent of quoted value content', () => {
  const kept = 'ALTER ROLE "postgres" SET "pgrst.db_schemas" TO \'public\nCREATE ROLE "anon"; NOSUPERUSER\';';
  const custom = 'ALTER ROLE "custom" SET "search_path" TO "public", "private";';
  const result = transformRestoreRoles(setting + kept + '\n' + custom +
    '\nALTER ROLE "postgres" SET "search_path" TO "public";');
  assert.ok(result.sql.includes(kept));
  assert.ok(result.sql.includes(custom));
  assert.ok(!result.sql.includes('"postgres" SET "search_path"'));
  assert.equal(result.counts.omitted, 1);
});
test('membership grant options and grantor remain unchanged for custom recipient', () => {
  const grant = 'GRANT "reader" TO "custom" WITH ADMIN TRUE, INHERIT FALSE, SET TRUE GRANTED BY "supabase_admin";';
  const result = transformRestoreRoles(setting + grant + '\nGRANT "reader" TO "authenticated" WITH ADMIN OPTION;');
  assert.ok(result.sql.includes(grant));
  assert.ok(!result.sql.includes('TO "authenticated"'));
  assert.equal(result.counts.omitted, 1);
});
test('actual pg17 roles preamble and optional connection limit are supported', () => {
  const preamble = "SET default_transaction_read_only = off;\nSET client_encoding = 'UTF8';\n" + setting;
  const statement = 'ALTER ROLE "custom" WITH ' + roleAttributes + ' CONNECTION LIMIT 12;';
  assert.ok(transformRestoreRoles(preamble + statement).sql.includes('CONNECTION LIMIT 12;'));
});
test('unsupported role forms fail without partial output or input disclosure', () => {
  for (const statement of [
    'SELECT dangerous();', 'DO $$BEGIN END$$;', 'DROP ROLE "custom";',
    'CREATE ROLE "custom" WITH LOGIN;', 'ALTER ROLE "custom" PASSWORD \'secret\';',
    'ALTER ROLE "custom" WITH ' + roleAttributes + " PASSWORD 'secret';",
    'GRANT SET ON PARAMETER "custom" TO "reader";',
    'GRANT "reader" TO "custom" WITH ADMIN TRUE, ADMIN FALSE;',
    'ALTER ROLE "custom" SET "search_path" TO dangerous();',
  ]) assert.throws(() => transformRestoreRoles(setting + statement), {message:'RESTORE_ROLES_UNSUPPORTED_STATEMENT'});
});

test('schema creation edits only top-level prefixes and preserves function bodies', () => {
  const body = '$body$\r\n-- 😀\r\nCREATE TABLE "hidden"();\r\nGRANT USAGE ON SCHEMA "auth" TO "anon";\r\n$body$';
  const source = setting + 'CREATE SCHEMA "custom";\r\nCREATE TABLE "custom"."t" ("id" integer);\r\n' +
    'CREATE SEQUENCE "custom"."s";\r\nCREATE VIEW "custom"."v" AS SELECT 1;\r\n' +
    `CREATE FUNCTION "custom"."f"() RETURNS void AS ${body} LANGUAGE sql;\r\n` +
    'CREATE TRIGGER "tg" AFTER INSERT ON "custom"."t" EXECUTE FUNCTION "custom"."f"();';
  const result = transformRestoreSchema(source);
  assert.equal(result.counts.rewritten, 6);
  for (const kind of ['SCHEMA','TABLE','SEQUENCE']) assert.ok(result.sql.includes(`CREATE ${kind} IF NOT EXISTS`));
  for (const kind of ['VIEW','FUNCTION','TRIGGER']) assert.ok(result.sql.includes(`CREATE OR REPLACE ${kind}`));
  assert.ok(result.sql.includes(body));
});
test('schema managed objects are removed as entire multiline statements', () => {
  const statements = [
    'CREATE EVENT TRIGGER "e" ON ddl_command_end\nWHEN TAG IN (\'CREATE TABLE\')\nEXECUTE FUNCTION "public"."f"();',
    'ALTER EVENT TRIGGER "e" ENABLE;', "COMMENT ON EVENT TRIGGER \"e\" IS 'note';",
    'CREATE PUBLICATION "supabase_realtime";', 'ALTER PUBLICATION "supabase_realtime_extra" OWNER TO "postgres";',
    'ALTER FOREIGN DATA WRAPPER "fdw" OWNER TO "postgres";',
    'ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_admin" GRANT SELECT ON TABLES TO "anon";',
    'GRANT ALL ON FOREIGN DATA WRAPPER "fdw" TO "postgres" WITH GRANT OPTION;',
    "COMMENT ON EXTENSION \"pgcrypto\" IS 'note';",
    'CREATE POLICY "cron_job_test" ON "cron"."job" USING (true);',
    'ALTER TABLE ONLY "cron"."job" ENABLE ROW LEVEL SECURITY;', 'SET transaction_timeout = 0;',
  ];
  const result = transformRestoreSchema(setting + statements.join('\n'));
  assert.equal(result.counts.omitted, statements.length);
  assert.equal(result.sql.trim(), setting.trim());
});
test('ACL exclusions use object schema, not function argument types or recipients', () => {
  const retained = 'GRANT EXECUTE ON FUNCTION "public"."f"("auth"."users", integer) TO "auth";';
  const result = transformRestoreSchema(setting +
    'GRANT USAGE ON SCHEMA "auth" TO "anon";\n' +
    'REVOKE ALL ON TABLE "storage"."objects" FROM PUBLIC;\n' + retained);
  assert.equal(result.counts.omitted, 2);
  assert.ok(result.sql.includes(retained));
  for (const name of ['pg_test', 'timescaledb_custom', '_timescaledb_custom', 'vault']) {
    assert.equal(transformRestoreSchema(setting + `GRANT USAGE ON SCHEMA "${name}" TO "anon";`).counts.omitted, 1);
  }
  assert.throws(() => transformRestoreSchema(setting + 'GRANT USAGE ON SCHEMA "auth", "public" TO "anon";'));
});
test('selected extension suffixes are removed without changing other extensions', () => {
  const retained = 'CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";';
  const source = setting + ['pg_tle', 'pgsodium', 'pgmq'].map((name) =>
    `CREATE EXTENSION IF NOT EXISTS "${name}" WITH SCHEMA "extensions";`).join('\n') + retained;
  const result = transformRestoreSchema(source);
  assert.equal(result.counts.rewritten, 3);
  assert.ok(result.sql.includes(retained));
  assert.ok(result.sql.includes('CREATE EXTENSION IF NOT EXISTS "pg_tle";'));
});
test('untouched statements, comments and PG17 directives preserve exact bytes', () => {
  const source = '\\restrict keyABC\r\n' + setting +
    '-- 😀 retained\r\nALTER TABLE "public"."t" OWNER TO "postgres";\r\n' +
    'ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."t";\r\n\\unrestrict keyABC\r\n';
  assert.equal(transformRestoreSchema(source).sql, source);
  assert.throws(() => transformRestoreSchema(setting + 'DROP TABLE "t";'), {message:'RESTORE_SCHEMA_UNSUPPORTED_STATEMENT'});
  assert.throws(() => transformRestoreSchema(setting + 'DO $$BEGIN END$$;'), {message:'RESTORE_SCHEMA_UNSUPPORTED_STATEMENT'});
});
