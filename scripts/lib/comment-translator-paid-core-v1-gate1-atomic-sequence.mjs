// Recognize the emitted pg_dump setter, not arbitrary sequence expressions.
// The containing original SQL artifact is never modified.
const identifier = value => '"' + value.replaceAll('"', '""') + '"';
const literal = value => "E'" + value.replaceAll('\\', '\\\\').replaceAll("'", "''") + "'";
const reject = () => { throw Error('ATOMIC_SEQUENCE_INPUT_REJECTED'); };

export function parseAtomicSequenceSetter(source, span) {
  const t = span.tokens;
  const word = (i, value) => ['word','identifier'].includes(t[i]?.kind) && t[i].value === value;
  if (!word(0,'SELECT') || !word(1,'pg_catalog') || t[2]?.value !== '.' || !word(3,'setval') || t[4]?.value !== '(' ||
      t[5]?.kind !== 'string' || t[6]?.value !== ',') reject();
  const raw = source.slice(t[5].start,t[5].end);
  if (!/^'(?:[^'\\]|'')*'$/u.test(raw)) reject();
  const name = raw.slice(1,-1).replaceAll("''", "'");
  const component = '(?:[a-z_][a-z_0-9$]*|"(?:[^"\\x00-\\x1f]|"")+")';
  const match = name.match(new RegExp(`^(${component})\\.(${component})$`, 'u'));
  if (!match) reject();
  const decode = value => value.startsWith('"') ? value.slice(1,-1).replaceAll('""','"') : value;
  const schema = decode(match[1]), sequence = decode(match[2]);
  if (schema.startsWith('pg_') || schema === 'information_schema') reject();
  let at = 7, number = '';
  while (t[at]?.kind === 'punctuation' && /^[-0-9]$/.test(t[at].value)) number += t[at++].value;
  if (!/^-?(?:0|[1-9][0-9]*)$/.test(number) || number.length > 20 || BigInt(number) < -9223372036854775808n ||
      BigInt(number) > 9223372036854775807n || t[at++]?.value !== ',' ||
      t[at]?.kind !== 'word' || !['true','false'].includes(t[at].value)) reject();
  const isCalled = t[at++].value === 'true';
  if (t[at++]?.value !== ')' || at !== t.length) reject();
  return { schema, sequence, value: number, isCalled };
}

export function atomicSequenceGuard({ schema, sequence }) {
  const name = identifier(schema) + '.' + identifier(sequence);
  // RESTART assigns transactional storage; subsequent unchanged setval calls
  // then roll back with that storage. Restore the prior state immediately so
  // preparatory guarding itself does not alter nextval semantics.
  return `CREATE TEMP TABLE ct_atomic_sequence_seed ON COMMIT DROP AS SELECT last_value,is_called FROM ${name};
ALTER SEQUENCE ${name} RESTART;
SELECT pg_catalog.setval(${literal(name)}::regclass,(SELECT last_value FROM ct_atomic_sequence_seed),(SELECT is_called FROM ct_atomic_sequence_seed));
DROP TABLE ct_atomic_sequence_seed;`;
}
