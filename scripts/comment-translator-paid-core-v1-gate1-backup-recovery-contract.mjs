import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const preflightPath = path.join(
  root,
  "scripts",
  "comment-translator-paid-core-v1-gate1-backup-recovery-preflight.ps1"
);

// Captured from the pinned local Supabase CLI 2.109.0 `db dump --help` and
// `db diff --help` output. The contract compares a live probe with this
// bounded snapshot; it never treats a missing or unknown flag as available.
export const CLI_HELP_SNAPSHOT = Object.freeze({
  version: "2.109.0",
  dump: Object.freeze({
    required: Object.freeze([
      "--dry-run",
      "--data-only",
      "--use-copy",
      "--role-only",
      "--file",
      "--linked",
      "--schema"
    ]),
    forbiddenForPgDumpSnapshot: Object.freeze(["--snapshot"])
  }),
  diff: Object.freeze({
    required: Object.freeze(["--linked", "--file", "--schema"]),
    forbidden: Object.freeze(["--snapshot"])
  })
});

const SAFE_DRY_RUN_OUTPUT =
  "state=PRE_DDL_UNARMED mutation_status=not-run mutation_count=0";
const RED_PHASE = "--phase";

function isolatedEnvironment() {
  const allowed = new Set([
    "ComSpec",
    "PATHEXT",
    "Path",
    "PSModulePath",
    "SystemDrive",
    "SystemRoot",
    "TEMP",
    "TMP",
    "USERPROFILE"
  ]);
  return Object.fromEntries(
    Object.entries(process.env).filter(([key]) => allowed.has(key))
  );
}

function runPowerShell(mode, input) {
  const args = ["-NoProfile", "-File", preflightPath, "-Mode", mode];
  if (input !== undefined) {
    args.push("-InputJson", JSON.stringify(input));
  }
  const result = spawnSync("pwsh", args, {
    cwd: root,
    env: isolatedEnvironment(),
    encoding: "utf8",
    windowsHide: true,
    maxBuffer: 4 * 1024 * 1024
  });
  return {
    status: result.status,
    signal: result.signal,
    stdout: String(result.stdout ?? "").trim(),
    stderr: String(result.stderr ?? "").trim()
  };
}

function assertSuccessfulJson(result, label) {
  assert.equal(result.signal, null, `${label} did not terminate normally`);
  assert.equal(result.status, 0, `${label} exited nonzero`);
  assert.equal(result.stderr, "", `${label} emitted stderr`);
  assert.notEqual(result.stdout, "", `${label} emitted no JSON`);
  return JSON.parse(result.stdout);
}

function validPlanInput(artifactDirectory) {
  return {
    artifactDirectory,
    snapshot: "synthetic-snapshot-token",
    reviewedSupabaseDataFilterArgs: ["--exclude-table", "storage.buckets_vectors", "--exclude-table", "storage.vector_indexes", "--schema", "*", "--exclude-table", "auth.schema_migrations"],
    reviewedSupabaseDataFilterEvidence: {
      status: "reviewed", source: "cli-data-dry-run-2.109.0", cliVersion: "2.109.0",
      helpSha256: "c".repeat(64), flags: ["--exclude-table", "storage.buckets_vectors", "--exclude-table", "storage.vector_indexes", "--schema", "*", "--exclude-table", "auth.schema_migrations"]
    },
    reviewedSupabaseFilterArgs: ["--schema", "public"],
    reviewedSupabaseFilterEvidence: {
      status: "reviewed",
      source: "cli-help-2.109.0",
      cliVersion: "2.109.0",
      helpSha256: "b".repeat(64),
      flags: ["--schema", "public"]
    },
    vault: { total: 0, reservedNames: 0 },
    storage: { objectCount: 0 },
    authStorageDiff: { isEmpty: true },
    t0: "2026-09-05T00:00:00.000Z",
    connectionMaterial: ["postgresql", "://user", ":", "redacted", "@host.invalid/db"].join("")
  };
}

function runContract() {
  runRepairContract();
  if (process.argv.includes("--repair-only")) return;
  if (!fs.existsSync(preflightPath)) {
    if (process.argv.includes(RED_PHASE)) {
      console.log("RED_EXPECTED_MISSING_IMPLEMENTATION");
      process.exitCode = 3;
      return;
    }
    throw new Error("backup/recovery preflight implementation is missing");
  }

  const contract = runPowerShell("Contract");
  assert.equal(contract.signal, null, "PowerShell contract did not terminate normally");
  assert.equal(contract.status, 0, "PowerShell contract exited nonzero");
  assert.equal(contract.stderr, "", "PowerShell contract emitted stderr");
  assert.equal(
    contract.stdout,
    "backup-contract=pass restore-order=6 snapshot-dumps=4",
    "PowerShell contract summary is not the approved sanitized interface"
  );

  const dryRun = runPowerShell("DryRun");
  assert.equal(dryRun.signal, null, "default dry-run did not terminate normally");
  assert.equal(dryRun.status, 0, "default dry-run exited nonzero");
  assert.equal(dryRun.stderr, "", "default dry-run emitted stderr");
  assert.equal(dryRun.stdout, SAFE_DRY_RUN_OUTPUT, "default dry-run output changed");

  const artifactDirectory = fs.mkdtempSync(
    path.join(os.tmpdir(), "ct-paid-gate1-contract-")
  );
  try {
    const planResult = runPowerShell("Plan", validPlanInput(artifactDirectory));
    const plan = assertSuccessfulJson(planResult, "synthetic plan");
    assert.equal(plan.state, "PRE_DDL_UNARMED");
    assert.equal(plan.mutation_status, "not-run");
    assert.equal(plan.mutation_count, 0);
    assert.equal(plan.tool_readiness, "unverified");
    assert.equal(plan.decision, "NO-GO");
    assert.deepEqual(plan.restore_order, [
      "roles",
      "schema",
      "auth_storage_changes",
      "data",
      "history_schema",
      "history_data"
    ]);
    assert.equal(plan.snapshot_dump_count, 4);
    assert.deepEqual(plan.snapshot_dump_names, [
      "schema",
      "data",
      "history_schema",
      "history_data"
    ]);
    assert.equal(plan.commands.supabase.join(" "), "db dump --linked --dry-run");
    assert.equal(plan.commands.authStorageDiff[0], "db");
    assert.equal(plan.commands.authStorageDiff[1], "diff");
    assert.equal(plan.commands.authStorageDiff[2], "--linked");
    assert.equal(plan.commands.authStorageDiff[3], "--schema");
    assert.equal(plan.commands.authStorageDiff[4], "auth,storage");
    assert.equal(plan.commands.roles.join(" "), "--roles-only --role=postgres --quote-all-identifiers --no-role-passwords --no-comments --no-password --file [restricted]/roles.sql");
    assert.deepEqual(plan.commands.schema.slice(-2), ["--schema", "public"]);
    for (const name of ["schema", "data", "historySchema", "historyData"]) {
      for (const flag of ["--role=postgres", "--quote-all-identifiers", "--no-password"]) {
        assert.equal(plan.commands[name].filter((value) => value === flag).length, 1);
      }
    }
    assert.deepEqual(plan.commands.data.slice(-4), ["--schema", "*", "--exclude-table", "auth.schema_migrations"]);
    for (const table of ['storage.buckets_vectors', 'storage.vector_indexes']) {
      assert.equal(plan.commands.data[plan.commands.data.indexOf(table) - 1], '--exclude-table');
      for (const mode of ['missing', 'duplicate', 'include']) {
        const bad = validPlanInput(artifactDirectory), args = bad.reviewedSupabaseDataFilterArgs;
        const index = args.indexOf(table);
        if (mode === 'missing') args.splice(index - 1, 2);
        else if (mode === 'duplicate') args.push('--exclude-table', table);
        else args[index - 1] = '--schema';
        bad.reviewedSupabaseDataFilterEvidence.flags = args.slice();
        const result = runPowerShell('Plan', bad);
        assert.equal(result.status, 2);
        assert.equal(JSON.parse(result.stdout).reason, 'VECTOR_EXCLUSION_FILTER_INVALID');
      }
    }
    assert.match(plan.snapshot_transaction.export, /SELECT count\(\*\) FROM storage\.buckets_vectors/);
    assert.match(plan.snapshot_transaction.export, /SELECT count\(\*\) FROM storage\.vector_indexes/);
    assert.match(plan.snapshot_transaction.export, /^SET LOCAL row_security = off;/);
    assert.equal(plan.snapshot_transaction.vector_exclusion_requirement, 'both-existing-empty-in-exported-snapshot');
    assert.ok(plan.post_restore_assertions.includes('storage_vector_table_counts_zero'));
    for (const missingKey of ["reviewedSupabaseDataFilterArgs", "reviewedSupabaseDataFilterEvidence"]) {
      const missingInput = validPlanInput(artifactDirectory);
      delete missingInput[missingKey];
      const missingResult = runPowerShell("Plan", missingInput);
      assert.equal(missingResult.status, 2);
      assert.equal(JSON.parse(missingResult.stdout).reason, "REVIEWED_FILTER_EVIDENCE_UNAVAILABLE");
    }
    assert.equal(
      CLI_HELP_SNAPSHOT.dump.required.includes("--use-copy"),
      true,
      "Supabase CLI db dump help must retain --use-copy"
    );
    for (const name of ["data", "historyData"]) {
      const command = plan.commands[name];
      assert.equal(command.includes("--data-only"), true, `${name} must remain data-only`);
      assert.equal(command.includes("--snapshot"), true, `${name} must remain snapshot-bound`);
      assert.equal(command.includes("--use-copy"), false, `${name} must use native pg_dump COPY default`);
      assert.equal(
        command.some((argument) => /^(?:--inserts|--column-inserts|--rows-per-insert)(?:=.*)?$/i.test(argument)),
        false,
        `${name} must reject INSERT-format flags`
      );
    }
    for (const invalidFlag of [
      "--inserts",
      "--inserts=1",
      "--column-inserts",
      "--column-inserts=1",
      "--rows-per-insert",
      "--rows-per-insert=10"
    ]) {
      const invalidInput = validPlanInput(artifactDirectory);
      invalidInput.reviewedSupabaseFilterArgs = [invalidFlag];
      invalidInput.reviewedSupabaseFilterEvidence.flags = [invalidFlag];
      const invalidResult = runPowerShell("Plan", invalidInput);
      assert.equal(invalidResult.signal, null, `${invalidFlag} rejection did not terminate normally`);
      assert.equal(invalidResult.status, 2, `${invalidFlag} must be blocked`);
      assert.equal(invalidResult.stderr, "", `${invalidFlag} rejection emitted stderr`);
      const blocked = JSON.parse(invalidResult.stdout);
      assert.equal(blocked.reason, "REVIEWED_FILTER_FLAG_UNSUPPORTED", `${invalidFlag} rejection reason changed`);
      assert.equal(blocked.mutation_count, 0, `${invalidFlag} rejection must remain non-mutating`);
    }
    assert.equal(plan.commands.restore.length, 6);
    for (const argv of plan.commands.restore) {
      assert.equal(argv.length, 5);
      assert.deepEqual(argv.slice(0, 4), ["--no-psqlrc", "--set=ON_ERROR_STOP=1", "--single-transaction", "--file"]);
    }
    assert.deepEqual(plan.post_restore_assertions, [
      "exact_history_count_and_digest",
      "aggregate_row_counts",
      "auth_dependencies_and_user_count",
      "storage_object_count_zero",
      "storage_vector_table_counts_zero",
      "grants_and_rls",
      "bridge_and_canonical_replay",
      "local_only_endpoint"
    ]);
    assert.doesNotMatch(planResult.stdout, /synthetic-snapshot-token|postgres(?:ql)?:\/\//i);
    const secretScanOutput = planResult.stdout
      .replaceAll('"--no-role-passwords"', '""')
      .replaceAll('"--no-password"', '""');
    assert.doesNotMatch(secretScanOutput, /password|secret|token-value/i);

    const toolBlocked = runPowerShell("ToolProbe", {
      toolOverrides: {
        supabase: null,
        docker: null,
        psql: null,
        pgDump: null,
        pgRestore: null
      }
    });
    assert.equal(toolBlocked.status, 2, "missing local tools must be blocked");
    assert.doesNotMatch(toolBlocked.stdout, /postgres(?:ql)?:\/\/|password|secret/i);

    const source = fs.readFileSync(preflightPath, "utf8");
    assert.doesNotMatch(source, /Start-Sleep|Invoke-Expression|Invoke-WebRequest|Invoke-RestMethod/i);
    assert.doesNotMatch(source, /Remove-Item|Clear-Item|Set-Content|Out-File|New-Item/i);
    assert.match(source, /--linked/);
    assert.match(source, /--snapshot/);
    assert.match(source, /pg_export_snapshot/);
    assert.match(source, /REPEATABLE READ/);
    assert.match(source, /READ ONLY/);
    assert.match(source, /ON_ERROR_STOP/);
  } finally {
    if (process.argv.includes("--no-cleanup")) {
      console.log(`retained-directory=${artifactDirectory.replaceAll("\\", "/")} entries=${fs.readdirSync(artifactDirectory).length}`);
    } else {
      fs.rmSync(artifactDirectory, { recursive: true, force: true });
    }
  }

  console.log("backup-contract=pass restore-order=6 snapshot-dumps=4");
}

// Extract function definitions only: never execute the entry point or real probes.
function syntheticProbe(command, input) {
  const encodedInput = Buffer.from(JSON.stringify(input)).toString("base64");
  const script = `
$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
$tokens = $null; $errors = $null
$ast = [System.Management.Automation.Language.Parser]::ParseFile('${preflightPath.replaceAll("'", "''")}', [ref]$tokens, [ref]$errors)
if ($errors.Count) { exit 2 }
foreach ($definition in $ast.FindAll({param($n) $n -is [System.Management.Automation.Language.FunctionDefinitionAst]}, $false)) {
  . ([scriptblock]::Create($definition.Extent.Text))
}
$script:ExpectedSupabaseCliVersion = '2.109.0'
function Get-ApplicationPath { param($Name) return $Name }
function Get-SupabaseProbeStatus { param($Overrides) $o = Get-OverrideStatus $Overrides 'supabase'; if ($null -eq $o) { throw 'REAL_PROBE_FORBIDDEN' }; return $o }
function Invoke-ReadOnlyProbe { param($Executable, $Arguments) if ($null -eq $script:versionText) { throw 'REAL_PROBE_FORBIDDEN' }; return @{exitCode=0; stdout=$script:versionText; stderr=''} }
$script:versionText = $null
$cases = ConvertFrom-Json ([Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('${encodedInput}'))) -Depth 30 -DateKind String
${command}
`;
  const result = spawnSync("pwsh", ["-NoProfile", "-EncodedCommand", Buffer.from(script, "utf16le").toString("base64")], {
    cwd: root, env: isolatedEnvironment(), encoding: "utf8", windowsHide: true
  });
  assert.equal(result.status, 0, "synthetic execution failed");
  assert.equal(result.stderr, "", "synthetic stderr must be empty");
  assert.doesNotMatch(result.stdout, /postgres(?:ql)?:\/\/|password|secret|synthetic-snapshot-token/i);
  return JSON.parse(result.stdout);
}

function runRepairContract() {
  const time = (suffix) => `2026-09-05T00:${suffix}Z`;
  const base = {
    t0: time("00:00.000"), now: time("09:59.999"),
    backupCompletedAt: time("05:00.000"), checksumsCompletedAt: time("05:00.000"),
    backupSucceeded: true, migrationSucceeded: true, decisiveReadbackSucceeded: true,
    migrationCompletedAt: time("09:00.000"), decisiveReadbackCompletedAt: time("09:59.999"),
    approvals: { finalBackup: true, boundedRpoWatchdog: true }
  };
  const stateResults = (cases) => syntheticProbe(
    '@($cases | ForEach-Object { Get-WatchdogResult $_ }) | ConvertTo-Json -Compress -Depth 20', cases
  );
  const groups = [
    ["lossless-data-restore-envelope", () => {
      const payloads = [
        "\\restrict bound_token\nCOPY public.example (value) FROM stdin;\n-- row text\n\\\\restrict row text\nCREATE ROLE row_text\n日本語\n\\.\n\\unrestrict bound_token\n",
        "-- header\r\nCOPY public.example (value) FROM stdin;\r\ntext\r\n\\.\r\n",
        "SELECT 'multiline\n-- literal text\n';"
      ];
      const results = syntheticProbe(String.raw`
@($cases | ForEach-Object {
  $actual = Add-DataRestoreEnvelope -DumpText $_
  $expected = "SET session_replication_role = replica;" + [char]10 + [char]10 + $_ + [char]10 + "RESET ALL;" + [char]10
  @{exact = [string]::Equals($actual, $expected, [StringComparison]::Ordinal)}
}) | ConvertTo-Json -Compress`, payloads);
      for (const result of results) assert.equal(result.exact, true);
      const rejected = syntheticProbe(String.raw`
@($cases | ForEach-Object {
  try { $null = Add-DataRestoreEnvelope -DumpText $_; $false }
  catch { $_.Exception.Message -eq 'DATA_DUMP_TEXT_INVALID' }
}) | ConvertTo-Json -Compress`, ["", " \r\n", "COPY\u0000data"]);
      assert.deepEqual(rejected, [true, true, true]);
      return 6;
    }],
    ["native-copy-guard-and-actual-arrays", () => {
      const results = syntheticProbe(String.raw`
# Load only the two real constants required by the extracted functions.
foreach ($name in @('script:NativePgDumpInsertFlagsPattern', 'script:RestoreOrder')) {
  $assignments = @($ast.FindAll({param($n)
    $n -is [System.Management.Automation.Language.AssignmentStatementAst] -and $n.Left.Extent.Text -eq ('$' + $name)
  }, $false))
  if ($assignments.Count -ne 1) { throw 'CONSTANT_SEAM_INVALID' }
  . ([scriptblock]::Create($assignments[0].Extent.Text))
}
$guard = @($ast.FindAll({param($n) $n -is [System.Management.Automation.Language.FunctionDefinitionAst] -and $n.Name -eq 'Assert-NativePgDumpCopyArguments'}, $false))[0].Extent.Text
$builder = @($ast.FindAll({param($n) $n -is [System.Management.Automation.Language.FunctionDefinitionAst] -and $n.Name -eq 'New-CommandPlan'}, $false))[0].Extent.Text
$capture = @'
$script:actualChecks = @(
  foreach ($array in @($actualData, $actualHistoryData)) {
    ($array -contains '--data-only' -and $array -notcontains '--use-copy' -and
      @($array | Where-Object { $_ -match '^(?i:--inserts|--column-inserts|--rows-per-insert)(?:=.*)?$' }).Count -eq 0)
  }
  (@($actualSchema, $actualData, $actualHistorySchema, $actualHistoryData | Where-Object {
    $index = [array]::IndexOf($_, '--snapshot')
    $index -ge 0 -and $_[$index + 1] -eq $Snapshot
  }).Count -eq 4)
  ($actualRestore.Count -eq 6 -and @($actualRestore | Where-Object {
    $_.Count -eq 5 -and $_[0] -eq '--no-psqlrc' -and $_[1] -eq '--set=ON_ERROR_STOP=1' -and $_[2] -eq '--single-transaction' -and $_[3] -eq '--file'
  }).Count -eq 6)
  (($actualRoles -join ' ') -eq ('--roles-only --role=postgres --quote-all-identifiers --no-role-passwords --no-comments --no-password --file ' + $actualRolesPath))
  ($actualSchema[-1] -eq 'public' -and $actualData[-1] -eq '*' -and
    $actualData[[array]::IndexOf($actualData, 'storage.buckets_vectors') - 1] -eq '--exclude-table' -and
    $actualData[[array]::IndexOf($actualData, 'storage.vector_indexes') - 1] -eq '--exclude-table')
  (@($actualSchema, $actualData, $actualHistorySchema, $actualHistoryData | Where-Object {
    @($_ | Where-Object { $_ -eq '--role=postgres' }).Count -eq 1 -and
    @($_ | Where-Object { $_ -eq '--quote-all-identifiers' }).Count -eq 1 -and
    @($_ | Where-Object { $_ -eq '--no-password' }).Count -eq 1
  }).Count -eq 4)
)
'@
$projection = '$snapshot = "[snapshot]"'
if ($builder.Split(@($projection), [StringSplitOptions]::None).Count -ne 2) { throw 'ARRAY_SEAM_INVALID' }
$instrumented = $builder.Replace($projection, $capture + [Environment]::NewLine + $projection)
@($cases.modes | ForEach-Object {
  $mode = $_
  $guardSource = $guard
  $builderSource = $instrumented
  if ($mode -eq 'guard-removed') {
    $condition = '[string]$argument -match $script:NativePgDumpInsertFlagsPattern'
    if (-not $guardSource.Contains($condition)) { throw 'GUARD_MUTANT_INVALID' }
    $guardSource = $guardSource.Replace($condition, '$false')
  } elseif ($mode -in @('actualData', 'actualHistoryData')) {
    $assignment = '$' + $mode + ' = @('
    if ($builderSource.Split(@($assignment), [StringSplitOptions]::None).Count -ne 2) { throw 'ARRAY_MUTANT_INVALID' }
    $builderSource = $builderSource.Replace($assignment, $assignment + '"--use-copy", ')
  }
  . ([scriptblock]::Create($guardSource))
  . ([scriptblock]::Create($builderSource))
  $guardChecks = @(
    foreach ($flag in $cases.invalidFlags) {
      try { Assert-NativePgDumpCopyArguments @('--data-only', $flag); $false }
      catch { $_.Exception.Message -ceq 'NATIVE_COPY_FORMAT_INVALID' }
    }
    try { Assert-NativePgDumpCopyArguments @('--data-only', '--schema', 'public', '--snapshot', 'synthetic-snapshot-token', '--file', 'data.sql'); $true }
    catch { $false }
  )
  $script:actualChecks = @()
  $plan = New-CommandPlan -ReviewedFilterArguments @('--schema', 'public') -ReviewedDataFilterArguments @('--exclude-table', 'storage.buckets_vectors', '--exclude-table', 'storage.vector_indexes', '--schema', '*') -ArtifactDirectory ([IO.Path]::GetTempPath()) -Snapshot 'synthetic-snapshot-token'
  if ($script:actualChecks.Count -ne 7) { throw 'ARRAY_CAPTURE_MISSING' }
  $shapeChecks = @(
    foreach ($table in @('storage.buckets_vectors', 'storage.vector_indexes')) {
      $originalData = @($plan.data)
      foreach ($mutation in @('missing', 'duplicate')) {
        if ($mutation -eq 'missing') { $plan.data = @($originalData | Where-Object { $_ -cne $table }) }
        else { $plan.data = @($originalData) + @('--exclude-table', $table) }
        try { Assert-CommandPlanShape $plan; $false }
        catch { $_.Exception.Message -ceq 'VECTOR_EXCLUSION_FILTER_INVALID' }
        $plan.data = $originalData
      }
    }
    foreach ($name in @('schema', 'data', 'historySchema', 'historyData')) {
      $original = @($plan[$name])
      foreach ($flag in @('--role=postgres', '--quote-all-identifiers', '--no-password')) {
        foreach ($mutation in @('missing', 'duplicate')) {
          if ($mutation -eq 'missing') { $plan[$name] = @($original | Where-Object { $_ -ne $flag }) }
          else { $plan[$name] = @($original) + @($flag) }
          try { Assert-CommandPlanShape $plan; $false }
          catch { $_.Exception.Message -ceq 'NATIVE_PRODUCER_ARGUMENT_INVALID' }
          $plan[$name] = $original
        }
      }
    }
  )
  [ordered]@{
    mode = $mode
    guardChecks = $guardChecks
    actualChecks = $script:actualChecks
    shapeChecks = $shapeChecks
    sanitizedCopyDefault = ($plan.data -notcontains '--use-copy' -and $plan.historyData -notcontains '--use-copy')
  }
}) | ConvertTo-Json -Compress -Depth 10
`, {
        modes: ["baseline", "guard-removed", "actualData", "actualHistoryData"],
        invalidFlags: ["--inserts", "--inserts=1", "--column-inserts", "--column-inserts=1", "--rows-per-insert", "--rows-per-insert=10"]
      });
      assert.deepEqual(results.map(result => result.mode), ["baseline", "guard-removed", "actualData", "actualHistoryData"]);
      for (const result of results) {
        assert.deepEqual(result.guardChecks, [...Array(6).fill(result.mode !== "guard-removed"), true]);
        assert.deepEqual(result.actualChecks, [result.mode !== "actualData", result.mode !== "actualHistoryData", true, true, true, true, true]);
        assert.deepEqual(result.shapeChecks, Array(28).fill(true));
        assert.equal(result.sanitizedCopyDefault, true);
      }
      return 160;
    }],
    ["pending-phase-transitions", () => {
      const pending = { ...base, now: time("08:00.000"), migrationCompletedAt: time("07:00.000"),
        decisiveReadbackSucceeded: false, decisiveReadbackCompletedAt: undefined,
        previousState: "ARMED_BEFORE_FIRST_DDL" };
      const sequence = (steps) => syntheticProbe(`
$previous = 'ARMED_BEFORE_FIRST_DDL'
@($cases | ForEach-Object {
  $_ | Add-Member -NotePropertyName previousState -NotePropertyValue $previous -Force
  $result = Get-WatchdogResult $_
  $previous = $result.state
  $result
}) | ConvertTo-Json -Compress -Depth 20`, steps);
      const success = { ...pending, now: time("09:00.000"), decisiveReadbackSucceeded: true,
        decisiveReadbackCompletedAt: time("09:00.000") };
      assert.deepEqual(sequence([pending, success]).map(r => r.state),
        ["ARMED_BEFORE_FIRST_DDL", "SUCCESS_DISARMED"]);
      assert.deepEqual(sequence([pending, { ...pending, now: time("10:00.000") },
        { ...success, now: time("11:00.000") }]).map(r => r.state),
        ["ARMED_BEFORE_FIRST_DDL", "PAUSE_REQUESTED", "PAUSE_REQUESTED"]);
      const bothPending = { ...pending, migrationSucceeded: false, migrationCompletedAt: undefined };
      for (const result of stateResults([bothPending,
        { ...bothPending, migrationCompletedAt: "invalid", decisiveReadbackCompletedAt: time("10:00.000") }])) {
        assert.equal(result.state, "ARMED_BEFORE_FIRST_DDL");
      }
      const invalid = [undefined, "invalid", time("08:00.001")].flatMap(value => [
        { ...pending, migrationCompletedAt: value },
        { ...success, decisiveReadbackCompletedAt: value === time("08:00.001") ? time("09:00.001") : value }
      ]);
      for (const result of stateResults(invalid)) {
        assert.equal(result.state, "PRE_DDL_UNARMED");
        assert.equal(result.reason, "SUCCESS_TIMESTAMP_INVALID");
      }
      return 13;
    }],
    ["deadline-and-pause", () => {
      const cases = [base,
        ...["10:00.000", "10:00.001", "15:00.000"].map(t => ({ ...base, now: time(t), decisiveReadbackCompletedAt: time(t) })),
        ...["PAUSE_STARTED", "PAUSE_REQUESTED", "PAUSE_CONFIRMED"].map(previousState => ({ ...base, previousState })),
        { ...base, pauseStartedAt: time("08:00.000") },
        { ...base, pauseRequestedAt: time("08:00.000") },
        { ...base, pauseConfirmedAt: time("08:00.000") },
        { ...base, failure: true },
        { ...base, now: time("15:00.000") }
      ];
      const results = stateResults(cases);
      assert.equal(results[0].state, "SUCCESS_DISARMED");
      for (const result of results.slice(1, -1)) assert.equal(result.state, "PAUSE_REQUESTED");
      assert.equal(results.at(-1).state, "SUCCESS_DISARMED");
      const confirmations = ["19:59.999", "20:00.000", "20:00.001"].map(t => ({
        ...base, now: time(t), pauseConfirmedAt: time(t), previousState: "PAUSE_REQUESTED",
        sourceStatus: "inaccessible", sourceProjectFingerprint: "synthetic-source",
        confirmedSourceProjectFingerprint: "synthetic-source",
        approvals: { ...base.approvals, pauseRequest: true, confirmedInaccessibility: true,
          restore: true, recoveryCostCapacity: true, recoveryProjectProvisioning: true,
          recoveryRegionExtensionsAuth: true }
      }));
      stateResults(confirmations).forEach((result, index) => {
        assert.equal(result.state, index < 2 ? "PAUSE_CONFIRMED" : "PAUSE_REQUESTED");
        assert.equal(result.restore_eligible, index < 2);
      });
      return cases.length + confirmations.length;
    }],
    ["timestamp-validation", () => {
      const cases = [
        ...[undefined, null, "invalid", time("00:00.000"), "2026-09-04T23:59:59.999Z"].map(now => ({ ...base, now })),
        ...["migrationCompletedAt", "decisiveReadbackCompletedAt"].flatMap(field =>
          [undefined, null, "invalid", time("10:00.001"), "2026-09-04T23:59:59.999Z"].map(value => ({ ...base, [field]: value }))),
        { ...base, now: time("04:00.000"), migrationSucceeded: false, decisiveReadbackSucceeded: false }
      ];
      for (const result of stateResults(cases)) assert.equal(result.state, "PRE_DDL_UNARMED");
      return cases.length;
    }],
    ["override-isolation", () => {
      const inputs = [
        { toolOverrides: Object.fromEntries(["supabase", "docker", "psql", "pgDump", "pgRestore"].map(k => [k, "pass"])) },
        { toolOverrides: {} }, { toolOverrides: null }
      ];
      const results = syntheticProbe('@($cases | ForEach-Object { Get-ToolProbeResult $_ }) | ConvertTo-Json -Compress -Depth 20', inputs);
      for (const result of results) assert.equal(result.status, "blocked");
      return inputs.length;
    }],
    ["roles-dump-tool-required", () => {
      const results = syntheticProbe(String.raw`
function Get-SupabaseProbeStatus { param($Overrides) return @{status='pass'} }
function Get-VersionStatus {
  param($Name, $OverrideName, $Overrides, $RequiredMajor)
  if ($Name -eq 'pg_dumpall') {
    if ($RequiredMajor -ne 17) { throw 'MAJOR_NOT_PINNED' }
    return @{status=$script:rolesToolStatus}
  }
  return @{status='pass'}
}
@($cases | ForEach-Object {
  $script:rolesToolStatus = $_
  Get-ToolProbeResult ([pscustomobject]@{})
}) | ConvertTo-Json -Compress -Depth 20`, ["missing", "wrong-major", "pass"]);
      assert.deepEqual(results.map(r => r.status), ["blocked", "blocked", "pass"]);
      assert.deepEqual(results.map(r => r.tools.pg_dumpall.status), ["missing", "wrong-major", "pass"]);
      for (const result of results) assert.equal(result.mutation_count, 0);
      return 3;
    }],
    ["postgres-version", () => {
      const cases = ["psql", "pg_dump", "pg_dumpall", "pg_restore"].flatMap(name => [
        { name, text: `${name} (PostgreSQL) 17.6`, expected: "pass" },
        { name, text: `${name} (PostgreSQL) 17.6 (Debian 17.6-1)`, expected: "pass" },
        { name, text: `${name} (PostgreSQL) 16.6`, expected: "wrong-major" },
        ...["17", "17.x", "17.6junk", "17.6.1", ""].map(v => ({ name, text: `${name} (PostgreSQL) ${v}`, expected: "version-unparsed" }))
      ]);
      const results = syntheticProbe('@($cases | ForEach-Object { $script:versionText = $_.text; Get-VersionStatus -Name $_.name -RequiredMajor 17 -Overrides $null }) | ConvertTo-Json -Compress -Depth 20', cases);
      results.forEach((result, index) => assert.equal(result.status, cases[index].expected));
      return cases.length;
    }]
  ];
  let failed = 0;
  for (const [label, verify] of groups) {
    try { console.log(`repair=${label} GREEN cases=${verify()}`); }
    catch { failed++; console.log(`repair=${label} RED`); }
  }
  if (failed) throw new Error(`REPAIR_GROUPS_FAILED_${failed}`);
}

try { runContract(); }
catch { console.log("backup-contract=failed"); process.exitCode = 1; }
