import { CATALOG_SUPPLEMENT_SQL } from './comment-translator-paid-core-v1-gate1-catalog-supplement.mjs';
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';
import { buildPsqlInvocation, parseTargetBinding, computeBindingSha256 } from '../comment-translator-paid-core-v1-gate1-preflight-readonly.mjs';

// Connection-only adapter. No socket, SQL, linked-project discovery or retry.
// Both callers supply the existing protected pipe, never a password argument.
export function boundConnection(request, fsApi = fs) {
  const parsed = parseTargetBinding(request?.bindingJson);
  if (!parsed.ok || parsed.binding.target !== request?.target ||
      computeBindingSha256(parsed.binding) !== request?.expectedBindingSha256)
    throw Error('BOUND_TARGET_REJECTED');
  const invocation = buildPsqlInvocation(parsed.binding, request.env, fsApi);
  if (!invocation.ok) throw Error('BOUND_TLS_OR_CREDENTIAL_REJECTED');
  return { binding: parsed.binding, invocation };
}

export function boundMigrationConnection(request, fsApi = fs, mode = 'plan') {
  const { binding, invocation } = boundConnection(request, fsApi);
  if (binding.target !== 'production' || !['list','plan','apply'].includes(mode) || !invocation.env.PGPASSWORD || invocation.env.PGPASSFILE) throw Error('BOUND_TARGET_REJECTED');
  // An explicit URL replaces linked discovery; it contains no credential.
  // pgx receives TLS parameters in its connection string, not assumed libpq defaults.
  const url = new URL(`postgresql://postgres@${binding.host}:5432/postgres`);
  url.searchParams.set('sslmode', 'verify-full');
  url.searchParams.set('sslrootcert', invocation.env.PGSSLROOTCERT);
  url.searchParams.set('connect_timeout', '15');
  return { connectionArgs: ['--db-url', url.href], env: {
    ...invocation.env, PGOPTIONS: mode === 'apply' ? '-c statement_timeout=30000 -c lock_timeout=5000' : invocation.env.PGOPTIONS,
    SUPABASE_DB_PASSWORD: invocation.env.PGPASSWORD,
    SUPABASE_DISABLE_TELEMETRY: 'true', SUPABASE_DISABLE_UPDATE_CHECK: 'true',
  } };
}

// Passed by the explicitly approved operator to the existing bounded CLI
// runner's protected stdin. Constructing this config does not execute/approve it.
export function boundMigrationRunnerConfig(request, {mode,cliFile,workDirectory}, fsApi=fs) {
  if (typeof cliFile!=='string'||!cliFile.endsWith('supabase-go.exe')||typeof workDirectory!=='string') throw Error('BOUND_CLI_REJECTED');
  const connection=boundMigrationConnection(request,fsApi,mode);
  const args=mode==='list'?['migration','list']:['db','push','--include-all',...(mode==='plan'?['--dry-run']:[])];
  return {command:cliFile,args:[...args,...connection.connectionArgs,'--yes'],cwd:workDirectory,
    env:connection.env,shell:false,timeoutMs:300000,structuredStdout:true,preserveStdout:true,retainOutput:false};
}

// Private IPC used only by the existing PowerShell reader. stdout is captured
// in memory by that parent and must never be forwarded to a console/log.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    if (process.argv.length !== 3 || process.argv[2] !== '--private-stdin') throw Error();
    let bytes = 0, input = '';
    const timer = setTimeout(() => process.exit(1), 10000); timer.unref();
    for await (const part of process.stdin) {
      bytes += part.length; if (bytes > 1048576) throw Error(); input += part;
    }
    const request=JSON.parse(input);const { invocation } = boundConnection(request); clearTimeout(timer);
    process.stdout.write(JSON.stringify({env:invocation.env,bindingSha256:request.expectedBindingSha256,supplementSql:CATALOG_SUPPLEMENT_SQL+fs.readFileSync(new URL('../fixtures/comment-translator-paid-core-v1-gate1-managed-catalog.sql',import.meta.url),'utf8')}));
  } catch { process.stderr.write('BOUND_CONNECTION_REJECTED'); process.exitCode = 1; }
}
