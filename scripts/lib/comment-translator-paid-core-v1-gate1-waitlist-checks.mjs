import fs from 'node:fs';
const fixture=JSON.parse(fs.readFileSync(new URL('../fixtures/comment-translator-paid-core-v1-gate1-waitlist-forward.json',import.meta.url),'utf8'));
export const WAITLIST_FORWARD=Object.freeze(fixture.migration);
export const WAITLIST_CHECKS=Object.freeze(fixture.checks.map(Object.freeze));
// SQL CHECK rejects FALSE only; NULL is not a violation. No PII/row identifiers.
export const WAITLIST_COUNTS_SELECT=`WITH checked AS MATERIALIZED (
 SELECT ${WAITLIST_CHECKS.map(c=>'('+c.expression+') IS FALSE AS "'+c.key+'"').join(',')} FROM public.comment_translator_creator_waitlist_registrations
) SELECT jsonb_build_object('total',count(*),
 ${WAITLIST_CHECKS.map(c=>"'"+c.key+"',count(*) FILTER (WHERE \""+c.key+"\")").join(',')},
 'anyViolation',count(*) FILTER (WHERE ${WAITLIST_CHECKS.map(c=>'"'+c.key+'"').join(' OR ')})) FROM checked`;
export const WAITLIST_READONLY_SQL=`BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY;
SET LOCAL lock_timeout='5s'; SET LOCAL statement_timeout='60s'; SET LOCAL row_security=off;
SET LOCAL search_path=pg_catalog,public;
SELECT jsonb_build_object('kind','waitlistChecks','readOnly',jsonb_build_object(
 'transactionReadOnly',current_setting('transaction_read_only'),
 'defaultTransactionReadOnly',current_setting('default_transaction_read_only'),
 'transactionIsolation',current_setting('transaction_isolation'),
 'serverVersionMajor',current_setting('server_version_num')::int/10000),
 'counts',(${WAITLIST_COUNTS_SELECT}));
ROLLBACK;
`;
export function assertWaitlistConstraints(supplement) {
 const rows=supplement?.objects;
 if(!Array.isArray(rows)) throw Error('WAITLIST_CATALOG_MISSING');
 const checks=rows.filter(x=>x[0]==='constraint'&&x[1]==='public'&&x[2]==='comment_translator_creator_waitlist_registrations');
 for(const c of WAITLIST_CHECKS){const found=checks.filter(x=>x[3]===c.name);if(found.length!==1||found[0][4]!==true||found[0][5]!=='CHECK ('+c.canonical+')')throw Error('WAITLIST_CHECK_MISMATCH');}
 return true;
}
