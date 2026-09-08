// Lexical boundaries only. Callers must separately authorize statements and bind
// native producer provenance before transforming or executing any SQL.
const MAX_BYTES = 32 * 1024 * 1024;
const MAX_TOKENS = 250_000;
const MAX_SPANS = 100_000;
const fail = () => { throw new Error('RESTORE_SQL_LEXICAL_REJECTED'); };
const wordStart = (c) => c !== undefined && /[A-Za-z_\u0080-\uffff]/u.test(c);
const wordPart = (c) => c !== undefined && /[A-Za-z_0-9$\u0080-\uffff]/u.test(c);

export function parseRestoreSql(source) {
  if (typeof source !== 'string' || !source.trim() || source.includes('\0') ||
      source.length > MAX_BYTES || Buffer.byteLength(source, 'utf8') > MAX_BYTES ||
      !source.isWellFormed()) fail();
  const spans = [];
  let i = 0;
  let start = 0;
  let tokens = [];
  let standardStrings = null;
  let restriction = null;
  let restrictionSeen = false;
  let tokenCount = 0;
  const push = (kind, end) => {
    if (spans.length >= MAX_SPANS) fail();
    spans.push({ kind, start, end, tokens });
    start = end;
    tokens = [];
  };
  const token = (kind, from, end, value) => {
    if (++tokenCount > MAX_TOKENS) fail();
    tokens.push({ kind, start: from, end, value });
  };
  const finishStatement = () => {
    if (!tokens.length) fail();
    const words = tokens.map((t) => t.value?.toUpperCase());
    if (words[0] === 'COPY') fail();
    // A setting change affects the lexical interpretation of later statements.
    if (words[0] === 'RESET') {
      if (words[1] === 'ALL' || words[1] === 'STANDARD_CONFORMING_STRINGS') {
        standardStrings = null;
      }
    }
    if (words[0] === 'SET' && words.includes('STANDARD_CONFORMING_STRINGS')) {
      if (tokens.length !== 4 || words[1] !== 'STANDARD_CONFORMING_STRINGS' ||
          !['=', 'TO'].includes(words[2]) || !['ON', 'OFF'].includes(words[3])) fail();
      standardStrings = words[3] === 'ON';
    }
    push('sql', i);
  };
  while (i < source.length) {
    const c = source[i];
    if (/\s/u.test(c)) { i++; continue; }
    if (source.startsWith('--', i)) {
      i += 2;
      while (i < source.length && !/[\r\n]/u.test(source[i])) i++;
      continue;
    }
    if (source.startsWith('/*', i)) {
      let depth = 1;
      i += 2;
      while (i < source.length && depth) {
        if (source.startsWith('/*', i)) { depth++; i += 2; }
        else if (source.startsWith('*/', i)) { depth--; i += 2; }
        else i++;
      }
      if (depth) fail();
      continue;
    }
    if (c === '\\') {
      if (tokens.length) fail();
      const lineStart = Math.max(source.lastIndexOf('\n', i - 1), source.lastIndexOf('\r', i - 1)) + 1;
      if (!/^[\t ]*$/u.test(source.slice(lineStart, i))) fail();
      const match = source.slice(i).match(/^\\(restrict|unrestrict) ([A-Za-z0-9]{1,128})(?=\r?\n|$)/u);
      if (!match) fail();
      if (match[1] === 'restrict') {
        if (restriction !== null || restrictionSeen) fail();
        restriction = match[2];
        restrictionSeen = true;
      } else {
        if (restriction !== match[2]) fail();
        restriction = null;
      }
      if (start < i) push('trivia', i);
      i += match[0].length;
      push('directive', i);
      continue;
    }
    if (c === ';') { i++; finishStatement(); continue; }
    const from = i;
    const escapeString = /[eE]/u.test(c) && source[i + 1] === "'";
    if (escapeString || c === "'" || c === '"') {
      const quote = escapeString ? "'" : c;
      if (escapeString) i++;
      i++;
      let closed = false;
      while (i < source.length) {
        // pg_dumpall emits client_encoding before standard_conforming_strings.
        // Without backslashes both modes have identical quote boundaries.
        if (source[i] === '\\' && quote === "'" && !escapeString && standardStrings === null) fail();
        if (source[i] === '\\' && quote === "'" && (escapeString || standardStrings === false)) {
          if (i + 1 >= source.length) fail();
          i += 2;
        } else if (source[i] === quote) {
          if (source[i + 1] === quote) i += 2;
          else { i++; closed = true; break; }
        } else i++;
      }
      if (!closed) fail();
      token(quote === '"' ? 'identifier' : 'string', from, i,
        quote === '"' ? source.slice(from + 1, i - 1).replaceAll('""', '"') : null);
      continue;
    }
    if (c === '$') {
      const delimiter = source.slice(i).match(/^\$(?:[A-Za-z_][A-Za-z_0-9]*)?\$/u)?.[0];
      if (!delimiter) fail();
      const end = source.indexOf(delimiter, i + delimiter.length);
      if (end < 0) fail();
      i = end + delimiter.length;
      token('dollar', from, i, null);
      continue;
    }
    if (wordStart(c)) {
      i++;
      while (wordPart(source[i])) i++;
      const value = source.slice(from, i);
      // Unicode escape identifiers/strings and bit/hex literals need separate
      // lexical rules. Reject rather than silently mis-tokenizing them.
      if ((/^[uU]$/u.test(value) && source[i] === '&') ||
          (/^[bBxX]$/u.test(value) && source[i] === "'")) fail();
      token('word', from, i, value);
      continue;
    }
    i++;
    token('punctuation', from, i, c);
  }
  if (restriction !== null || tokens.length) fail();
  if (start < i) push('trivia', i);
  if (!spans.some((span) => span.kind === 'sql')) fail();
  return spans;
}

const reservedRole = (name) => /^(?:anon|authenticated|authenticator|cli_login_.*|dashboard_user|pgbouncer|postgres|service_role|supabase_.*|pgsodium_keyholder|pgsodium_keyiduser|pgsodium_keymaker|pgtle_admin)$/u.test(name);
const reservedSetting = (name) => /^(?:pgaudit.*|pgrst.*|session_replication_role|statement_timeout|track_io_timing)$/u.test(name);

// Implements reviewed roles-recipe edits on lexical spans. This is not native
// provenance or approval to execute the resulting role/privilege changes.
export function transformRestoreRoles(source) {
  const spans = parseRestoreSql(source);
  const output = [];
  const counts = { statements: 0, omitted: 0, attributesRemoved: 0 };
  const reject = () => { throw new Error('RESTORE_ROLES_UNSUPPORTED_STATEMENT'); };
  for (const span of spans) {
    if (span.kind !== 'sql') { output.push(source.slice(span.start, span.end)); continue; }
    counts.statements++;
    const ts = span.tokens;
    const is = (n, value) => ts[n]?.kind === 'word' && ts[n].value === value;
    const id = (n) => ts[n]?.kind === 'identifier';
    const raw = (n) => ts[n] && source.slice(ts[n].start, ts[n].end);
    let omit = false;
    let remove = [];
    if (is(0, 'SET')) {
      const text = source.slice(ts[0].start, span.end);
      if (!/^SET (?:default_transaction_read_only = off|client_encoding = 'UTF8'|standard_conforming_strings = (?:on|off)|escape_string_warning = off);$/u.test(text)) reject();
    } else if (is(0, 'RESET') && is(1, 'ALL') && ts.length === 2) {
      // Safe fixed footer emitted by the reviewed recipe.
    } else if (is(0, 'CREATE') && is(1, 'ROLE') && id(2) && ts.length === 3) {
      omit = reservedRole(ts[2].value);
    } else if (is(0, 'ALTER') && is(1, 'ROLE') && id(2) && is(3, 'WITH')) {
      const groups = [ ['SUPERUSER', 'NOSUPERUSER'], ['INHERIT', 'NOINHERIT'],
        ['CREATEROLE', 'NOCREATEROLE'], ['CREATEDB', 'NOCREATEDB'],
        ['LOGIN', 'NOLOGIN'], ['REPLICATION', 'NOREPLICATION'], ['BYPASSRLS', 'NOBYPASSRLS'] ];
      for (let n = 0; n < groups.length; n++) if (!groups[n].some((value) => is(n + 4, value))) reject();
      let n = 11;
      if (is(n, 'CONNECTION') && is(n + 1, 'LIMIT')) {
        n += 2;
        if (raw(n) === '-') n++;
        const begin = n;
        while (/^[0-9]$/u.test(raw(n) ?? '')) n++;
        if (n === begin) reject();
      }
      if (is(n, 'VALID') && is(n + 1, 'UNTIL') && ts[n + 2]?.kind === 'string') n += 3;
      if (n !== ts.length) reject();
      omit = reservedRole(ts[2].value);
      if (!omit) remove = ts.filter((t) => t.kind === 'word' && ['NOSUPERUSER', 'NOREPLICATION'].includes(t.value));
    } else if (is(0, 'ALTER') && is(1, 'ROLE') && id(2) && is(3, 'SET') && id(4) && is(5, 'TO')) {
      // pg_dumpall emits literal/list setting values, never expressions here.
      if (ts.length < 7 || ts.slice(6).some((t) =>
        !['string', 'identifier', 'word'].includes(t.kind) && !/^[0-9,.+\-]$/u.test(t.value))) reject();
      omit = reservedRole(ts[2].value) && !reservedSetting(ts[4].value);
    } else if (is(0, 'GRANT') && id(1) && is(2, 'TO') && id(3)) {
      let n = 4;
      if (is(n, 'WITH')) {
        n++;
        const options = new Set();
        while (true) {
          const option = ts[n]?.value;
          if (!['ADMIN', 'INHERIT', 'SET'].includes(option) || options.has(option) || ts[n]?.kind !== 'word') reject();
          options.add(option);
          if (!(is(n + 1, 'TRUE') || is(n + 1, 'FALSE') || (option === 'ADMIN' && is(n + 1, 'OPTION')))) reject();
          n += 2;
          if (raw(n) !== ',') break;
          n++;
        }
      }
      if (is(n, 'GRANTED') && is(n + 1, 'BY') && id(n + 2)) n += 3;
      if (n !== ts.length) reject();
      omit = reservedRole(ts[3].value);
    } else reject();
    if (omit) {
      counts.omitted++;
      output.push(source.slice(span.start, ts[0].start));
      continue;
    }
    let cursor = span.start;
    for (const token of remove) {
      output.push(source.slice(cursor, token.start));
      cursor = token.end;
      counts.attributesRemoved++;
    }
    output.push(source.slice(cursor, span.end));
  }
  return { sql: output.join('') + '\nRESET ALL;\n', counts };
}

const internalSchemas = new Set([
  'information_schema', '_analytics', '_realtime', '_supavisor', 'auth', 'etl',
  'extensions', 'pgbouncer', 'realtime', 'storage', 'supabase_functions',
  'supabase_migrations', 'cron', 'dbdev', 'graphql', 'graphql_public', 'net',
  'pgmq', 'pgsodium', 'pgsodium_masks', 'pgtle', 'repack', 'tiger', 'tiger_data',
  'topology', 'vault',
]);
const internalSchema = (name) => internalSchemas.has(name) ||
  ['pg_', 'timescaledb_', '_timescaledb_'].some((prefix) => name.startsWith(prefix));

export function transformRestoreSchema(source) {
  const spans = parseRestoreSql(source);
  const counts = { statements: 0, omitted: 0, rewritten: 0 };
  const output = [];
  const reject = () => { throw new Error('RESTORE_SCHEMA_UNSUPPORTED_STATEMENT'); };
  for (const span of spans) {
    if (span.kind !== 'sql') { output.push(source.slice(span.start, span.end)); continue; }
    counts.statements++;
    const ts = span.tokens;
    const word = (n, value) => ts[n]?.kind === 'word' && ts[n].value === value;
    const id = (n) => ts[n]?.kind === 'identifier' ? ts[n].value : null;
    const begins = (...words) => words.every((value, n) => word(n, value));
    let omit = false;
    let edit = null;
    if (begins('CREATE', 'EVENT', 'TRIGGER') || begins('ALTER', 'EVENT', 'TRIGGER') ||
        begins('COMMENT', 'ON', 'EVENT', 'TRIGGER')) omit = true;
    else if (begins('CREATE', 'PUBLICATION') && id(2)?.startsWith('supabase_realtime')) omit = true;
    else if (begins('ALTER', 'PUBLICATION') && id(2)?.startsWith('supabase_realtime_')) omit = true;
    else if (begins('ALTER', 'FOREIGN', 'DATA', 'WRAPPER') && id(4) && word(5, 'OWNER') && word(6, 'TO')) omit = true;
    else if (begins('ALTER', 'DEFAULT', 'PRIVILEGES', 'FOR', 'ROLE') && id(5) === 'supabase_admin') omit = true;
    else if (begins('GRANT', 'ALL', 'ON', 'FOREIGN', 'DATA', 'WRAPPER') && id(6) &&
        word(7, 'TO') && id(8) === 'postgres' && word(9, 'WITH') && word(10, 'GRANT') && word(11, 'OPTION') && ts.length === 12) omit = true;
    else if (begins('COMMENT', 'ON', 'EXTENSION')) omit = true;
    else if (begins('CREATE', 'POLICY') && id(2)?.startsWith('cron_job_')) omit = true;
    else if (begins('ALTER', 'TABLE') && (id(2) === 'cron' || (word(2, 'ONLY') && id(3) === 'cron'))) omit = true;
    else if (begins('SET') && ts[1]?.value === 'transaction_timeout' &&
        ts[2]?.value === '=' && ts[3]?.value === '0' && ts.length === 4) omit = true;
    else if (begins('GRANT') || begins('REVOKE')) {
      const on = ts.findIndex((t) => t.kind === 'word' && t.value === 'ON');
      if (on < 0) reject();
      const target = ts.findIndex((t, n) => n > on && t.kind === 'identifier');
      if (target < 0) reject();
      let depth = 0;
      let recipientFound = false;
      for (let n = target; n < ts.length; n++) {
        if (ts[n].value === '(') depth++;
        if (ts[n].value === ')') depth--;
        if (depth < 0) reject();
        if (depth === 0 && (word(n, 'TO') || word(n, 'FROM'))) { recipientFound = true; break; }
        if (depth === 0 && ts[n].value === ',') reject();
      }
      if (!recipientFound || depth !== 0) reject();
      const objectKinds = ts.slice(on + 1, target).map((t) => t.value).join(' ');
      if (!['SCHEMA', 'TABLE', 'SEQUENCE', 'FUNCTION', 'PROCEDURE', 'TYPE', 'DOMAIN',
        'ALL TABLES IN SCHEMA', 'ALL SEQUENCES IN SCHEMA', 'ALL FUNCTIONS IN SCHEMA',
        'FOREIGN DATA WRAPPER', 'FOREIGN SERVER'].includes(objectKinds)) reject();
      // Only schema names or the first component of a qualified object name
      // determine internal ownership. Argument types and recipients do not.
      if (objectKinds === 'SCHEMA' || objectKinds.endsWith('IN SCHEMA') || ts[target + 1]?.value === '.') {
        omit = internalSchema(ts[target].value);
      }
    } else if (begins('CREATE', 'EXTENSION', 'IF', 'NOT', 'EXISTS') &&
        ['pg_tle', 'pgsodium', 'pgmq'].includes(id(5))) {
      edit = { start: ts[5].end, end: span.end, text: ';' };
    } else if (word(0, 'CREATE') && ['SCHEMA', 'TABLE', 'SEQUENCE'].some((v) => word(1, v)) && id(2)) {
      edit = { start: ts[1].end, end: ts[1].end, text: ' IF NOT EXISTS' };
    } else if (word(0, 'CREATE') && ['VIEW', 'FUNCTION', 'TRIGGER'].some((v) => word(1, v)) && id(2)) {
      edit = { start: ts[0].end, end: ts[0].end, text: ' OR REPLACE' };
    } else if (!['CREATE', 'ALTER', 'COMMENT', 'SET', 'SELECT', 'SECURITY', 'RESET'].some((v) => word(0, v))) reject();
    // No interpretation of function bodies or arbitrary expressions occurs.
    // Recognizing a dump family is not permission to execute that statement.
    if (omit) {
      counts.omitted++;
      output.push(source.slice(span.start, ts[0].start));
    } else if (edit) {
      counts.rewritten++;
      output.push(source.slice(span.start, edit.start), edit.text, source.slice(edit.end, span.end));
    } else output.push(source.slice(span.start, span.end));
  }
  return { sql: output.join(''), counts };
}
