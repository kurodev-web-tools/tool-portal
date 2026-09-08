[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)]
  [ValidateSet("Production", "Preview")]
  [string]$Environment,

  [Parameter(Mandatory = $true)]
  [string]$DestinationRoot,

  [string]$PsqlPath = "C:/Users/taka/AppData/Local/Programs/PostgreSQL/17-client-17.11/bin/psql.exe"
)

$ErrorActionPreference = "Stop"
$target = $Environment.ToLowerInvariant()
$readbackRoot = [IO.Path]::GetFullPath($DestinationRoot)
$artifactDirectory = Join-Path $readbackRoot $target
$artifactPath = Join-Path $artifactDirectory "$target-catalog-readback.json"
$maxOutputBytes = 1024 * 1024
$processTimeoutMilliseconds = 5 * 60 * 1000
$secureValues = @()
$script:failureDetails = $null

function Emit-Failure {
  param([string]$Reason)
  $payload = [ordered]@{
    schemaVersion = 1
    target = $target
    status = "FAIL"
    reason = $Reason
    mutationCounts = [ordered]@{ ddl = 0; dml = 0; rpc = 0; remote = 0; total = 0 }
  }
  if ($null -ne $script:failureDetails) {
    $payload.diagnostics = $script:failureDetails
  }
  $payload | ConvertTo-Json -Depth 20 -Compress
  exit 1
}

function Assert-NoReparse {
  param([string]$Path)
  $item = Get-Item -LiteralPath $Path -Force
  if (($item.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0) {
    throw "REPARSE_POINT"
  }
}

function Test-BroadWriteLikeAcl {
  param([string]$Path)
  $acl = Get-Acl -LiteralPath $Path
  foreach ($entry in @($acl.Access)) {
    $identity = [string]$entry.IdentityReference.Value
    $rights = [string]$entry.FileSystemRights
    if ($identity -match "(?i)^(everyone|authenticated users|builtin\\users|users|s-1-1-0|s-1-5-11|s-1-5-32-545)$" -and
        $rights -match "(?i)(write|modify|fullcontrol|delete)") {
      return $true
    }
  }
  return $false
}

function Protect-NewDirectory {
  param([string]$Path)
  $acl = Get-Acl -LiteralPath $Path
  $acl.SetAccessRuleProtection($true, $false)
  foreach ($entry in @($acl.Access)) {
    [void]$acl.RemoveAccessRule($entry)
  }
  $inheritance = [System.Security.AccessControl.InheritanceFlags]::ContainerInherit -bor
    [System.Security.AccessControl.InheritanceFlags]::ObjectInherit
  $propagation = [System.Security.AccessControl.PropagationFlags]::None
  $rights = [System.Security.AccessControl.FileSystemRights]::FullControl
  foreach ($sidText in @(
      "S-1-5-18",
      "S-1-5-32-544",
      ([System.Security.Principal.WindowsIdentity]::GetCurrent().User.Value)
    )) {
    $sid = [System.Security.Principal.SecurityIdentifier]::new($sidText)
    $rule = [System.Security.AccessControl.FileSystemAccessRule]::new(
      $sid,
      $rights,
      $inheritance,
      $propagation,
      [System.Security.AccessControl.AccessControlType]::Allow
    )
    [void]$acl.AddAccessRule($rule)
  }
  Set-Acl -LiteralPath $Path -AclObject $acl
}

function Ensure-ReadbackDirectory {
  if ($readbackRoot -match "(?i)^(\\\\|//|[a-z]:\\?$)") {
    throw "BROAD_DESTINATION"
  }
  $forbiddenRoots = @(
    $env:USERPROFILE,
    (Get-Location).Path,
    (Split-Path -Parent $PSScriptRoot),
    (Split-Path -Parent (Split-Path -Parent $PSScriptRoot))
  ) | Where-Object { $_ } | ForEach-Object {
    [IO.Path]::GetFullPath($_).TrimEnd("\", "/")
  }
  foreach ($forbidden in $forbiddenRoots) {
    if ($readbackRoot.Equals($forbidden, [StringComparison]::OrdinalIgnoreCase) -or
        $readbackRoot.StartsWith($forbidden + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase)) {
      throw "DESTINATION_INSIDE_REPOSITORY_OR_HOME"
    }
  }

  if (-not (Test-Path -LiteralPath $readbackRoot)) {
    [void](New-Item -ItemType Directory -Path $readbackRoot -Force:$false)
    Protect-NewDirectory -Path $readbackRoot
  } else {
    Assert-NoReparse -Path $readbackRoot
    foreach ($entry in @(Get-ChildItem -LiteralPath $readbackRoot -Force)) {
      if (-not $entry.PSIsContainer -or $entry.Name -notin @("production", "preview")) {
        throw "DESTINATION_NOT_EMPTY"
      }
      Assert-NoReparse -Path $entry.FullName
    }
  }

  if (Test-Path -LiteralPath $artifactDirectory) {
    Assert-NoReparse -Path $artifactDirectory
    if (@(Get-ChildItem -LiteralPath $artifactDirectory -Force).Count -ne 0) {
      throw "TARGET_DIRECTORY_NOT_EMPTY"
    }
  } else {
    [void](New-Item -ItemType Directory -Path $artifactDirectory -Force:$false)
    Protect-NewDirectory -Path $artifactDirectory
  }
  $rootHasBroadWrite = Test-BroadWriteLikeAcl -Path $readbackRoot
  $artifactHasBroadWrite = Test-BroadWriteLikeAcl -Path $artifactDirectory
  if ($rootHasBroadWrite -or $artifactHasBroadWrite) {
    throw "BROAD_WRITE_ACL"
  }
  if (Test-Path -LiteralPath $artifactPath) {
    throw "ARTIFACT_ALREADY_EXISTS"
  }
}

function Read-HiddenValue {
  param([string]$Prompt)
  $secure = Read-Host -AsSecureString -Prompt $Prompt
  $script:secureValues += $secure
  $ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
  try {
    $plain = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr)
    if ([string]::IsNullOrEmpty($plain)) {
      throw "EMPTY_SECRET_INPUT"
    }
    return $plain
  } finally {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr)
  }
}

function Invoke-CapturedProcess {
  param(
    [string]$FilePath,
    [string[]]$Arguments,
    [hashtable]$EnvironmentVariables,
    [string]$StandardInput
  )
  $info = [Diagnostics.ProcessStartInfo]::new()
  $info.FileName = $FilePath
  foreach ($argument in $Arguments) {
    [void]$info.ArgumentList.Add($argument)
  }
  $info.UseShellExecute = $false
  $info.CreateNoWindow = $true
  $info.RedirectStandardInput = $true
  $info.RedirectStandardOutput = $true
  $info.RedirectStandardError = $true
  foreach ($key in @("PGSERVICE", "PGHOSTADDR", "DATABASE_URL")) {
    [void]$info.Environment.Remove($key)
  }
  foreach ($key in $EnvironmentVariables.Keys) {
    $info.Environment[$key] = [string]$EnvironmentVariables[$key]
  }
  $process = [Diagnostics.Process]::new()
  $started = $false
  try {
    $process.StartInfo = $info
    if (-not $process.Start()) {
      throw "PROCESS_START_FAILED"
    }
    $started = $true
    $stdoutTask = $process.StandardOutput.ReadToEndAsync()
    $stderrTask = $process.StandardError.ReadToEndAsync()
    $inputTask = $process.StandardInput.WriteAsync($StandardInput)
    if (-not $inputTask.Wait($processTimeoutMilliseconds)) {
      throw "PROCESS_TIMEOUT"
    }
    $inputTask.GetAwaiter().GetResult()
    $flushTask = $process.StandardInput.FlushAsync()
    if (-not $flushTask.Wait($processTimeoutMilliseconds)) {
      throw "PROCESS_TIMEOUT"
    }
    $flushTask.GetAwaiter().GetResult()
    $process.StandardInput.Close()
    $exited = $process.WaitForExit($processTimeoutMilliseconds)
    if (-not $exited) {
      throw "PROCESS_TIMEOUT"
    }
    $stdout = $stdoutTask.GetAwaiter().GetResult()
    $stderr = $stderrTask.GetAwaiter().GetResult()
    $exitCode = $process.ExitCode
    [ordered]@{
      ExitCode = $exitCode
      Stdout = $stdout
      StderrBytes = [Text.Encoding]::UTF8.GetByteCount($stderr)
      StderrClass = Get-SanitizedPsqlErrorClass -Text $stderr
      StdoutBytes = [Text.Encoding]::UTF8.GetByteCount($stdout)
    }
  } finally {
    if ($started -and -not $process.HasExited) {
      try {
        $process.Kill($true)
      } finally {
        [void]$process.WaitForExit()
      }
    }
    $process.Dispose()
  }
}

function Get-PsqlVersion {
  $result = Invoke-CapturedProcess -FilePath $PsqlPath -Arguments @("--version") -EnvironmentVariables @{} -StandardInput ""
  if ($result.ExitCode -ne 0 -or $result.StdoutBytes -gt 4096) {
    throw "PSQL_VERSION_UNAVAILABLE"
  }
  $versionMatch = [regex]::Match($result.Stdout, "PostgreSQL\)?\s+([0-9]+)\.([0-9]+)")
  if (-not $versionMatch.Success) {
    throw "PSQL_VERSION_UNPARSEABLE"
  }
  if ([int]$versionMatch.Groups[1].Value -ne 17) {
    throw "PSQL_MAJOR_NOT_17"
  }
  return $result.Stdout.Trim()
}

function Get-SanitizedPsqlErrorClass {
  param([string]$Text)
  if ([string]::IsNullOrWhiteSpace($Text)) {
    return "NONE"
  }
  if ($Text -match "(?i)(could not connect|connection refused|connection timed out|no route to host|server closed the connection unexpectedly)") {
    return "CONNECTION"
  }
  if ($Text -match "(?i)(password authentication failed|no password supplied|authentication failed|role .* does not exist)") {
    return "AUTHENTICATION"
  }
  if ($Text -match "(?i)(statement timeout|lock timeout|canceling statement due to statement timeout|canceling statement due to lock timeout)") {
    return "TIMEOUT"
  }
  if ($Text -match "(?i)(permission denied|must be owner|insufficient privilege)") {
    return "PERMISSION"
  }
  if ($Text -match "(?i)syntax error") {
    return "SYNTAX_ERROR"
  }
  if ($Text -match "(?i)relation .* does not exist") {
    return "RELATION_NOT_FOUND"
  }
  if ($Text -match "(?i)column .* does not exist") {
    return "COLUMN_NOT_FOUND"
  }
  if ($Text -match "(?i)function .* does not exist") {
    return "FUNCTION_NOT_FOUND"
  }
  if ($Text -match "(?i)type .* does not exist") {
    return "TYPE_NOT_FOUND"
  }
  if ($Text -match "(?i)(invalid input syntax|cannot cast|cannot convert)") {
    return "INVALID_CAST"
  }
  if ($Text -match "(?i)(missing FROM-clause entry|invalid reference to FROM-clause entry)") {
    return "QUERY_SCOPE"
  }
  if ($Text -match "(?i)(ambiguous column|ambiguous)") {
    return "QUERY_AMBIGUOUS"
  }
  return "PSQL_OTHER"
}

function Assert-ExactPropertyNames {
  param(
    [object]$Value,
    [string[]]$Expected,
    [string]$Label
  )
  if ($null -eq $Value) {
    throw "${Label}_MISSING"
  }
  $actual = @($Value.PSObject.Properties.Name | Sort-Object)
  $expectedSorted = @($Expected | Sort-Object)
  if ($actual.Count -ne $expectedSorted.Count -or $null -ne (Compare-Object -ReferenceObject $expectedSorted -DifferenceObject $actual)) {
    throw "${Label}_SHAPE_INVALID"
  }
}

function Assert-DependencyCounts {
  param([object]$Counts, [string]$Label)
  $keys = @(
    "inboundForeignKeys", "views", "materializedViews", "rules", "policies",
    "userTriggers", "eventTriggers", "publications", "outsideFunctionSourceReferences",
    "unexpectedPgDependEdges"
  )
  Assert-ExactPropertyNames -Value $Counts -Expected $keys -Label $Label
  foreach ($key in $keys) {
    if ($null -eq $Counts.$key -or [int64]$Counts.$key -lt 0) {
      throw "${Label}_${key}_INVALID"
    }
  }
}

function Assert-AclRow {
  param([object]$Row, [string]$Label)
  Assert-ExactPropertyNames -Value $Row -Expected @("schema", "objectKind", "objectIdentity", "grantee", "privilege", "grantable") -Label $Label
  if ([string]::IsNullOrWhiteSpace([string]$Row.schema) -or
      [string]::IsNullOrWhiteSpace([string]$Row.objectKind) -or
      [string]::IsNullOrWhiteSpace([string]$Row.objectIdentity) -or
      [string]::IsNullOrWhiteSpace([string]$Row.grantee) -or
      [string]::IsNullOrWhiteSpace([string]$Row.privilege) -or
      $Row.grantable -isnot [bool]) {
    throw "${Label}_VALUE_INVALID"
  }
}

function Assert-FunctionRow {
  param([object]$Row, [string]$Label)
  Assert-ExactPropertyNames -Value $Row -Expected @("schema", "name", "identityArguments", "resultType", "owner", "securityDefiner", "config", "acls", "definitionMd5") -Label $Label
  if ([string]::IsNullOrWhiteSpace([string]$Row.schema) -or
      [string]::IsNullOrWhiteSpace([string]$Row.name) -or
      $Row.identityArguments -isnot [string] -or
      [string]::IsNullOrWhiteSpace([string]$Row.resultType) -or
      [string]::IsNullOrWhiteSpace([string]$Row.owner) -or
      $Row.securityDefiner -isnot [bool] -or
      [string]$Row.definitionMd5 -notmatch "^[0-9a-f]{32}$" -or
      $Row.config -isnot [array] -or
      $Row.acls -isnot [array]) {
    throw "${Label}_VALUE_INVALID"
  }
  foreach ($value in @($Row.config)) {
    if ($value -isnot [string]) { throw "${Label}_CONFIG_INVALID" }
  }
  foreach ($acl in @($Row.acls)) { Assert-AclRow -Row $acl -Label "${Label}_ACL" }
}

function Assert-TableRow {
  param([object]$Row, [string]$Label)
  Assert-ExactPropertyNames -Value $Row -Expected @("schema", "name", "owner", "rlsEnabled", "rowCount", "columns", "constraints", "indexes", "policies", "acls") -Label $Label
  $invalidField = if ([string]::IsNullOrWhiteSpace([string]$Row.schema)) {
    "schema"
  } elseif ([string]::IsNullOrWhiteSpace([string]$Row.name)) {
    "name"
  } elseif ([string]::IsNullOrWhiteSpace([string]$Row.owner)) {
    "owner"
  } elseif ($Row.rlsEnabled -isnot [bool]) {
    "rlsEnabled"
  } elseif ($null -eq $Row.rowCount -or [int64]$Row.rowCount -lt 0) {
    "rowCount"
  } else {
    $null
  }
  if ($null -ne $invalidField) {
    $validationScope = if ($Label -like "CANONICAL_STATE*") {
      "canonical"
    } elseif ($Label -like "PAID_LEGACY_STATE*") {
      "paidLegacy"
    } elseif ($Label -like "SOURCE_ERA_STATE*") {
      "sourceEra"
    } else {
      "unknown"
    }
    $script:failureDetails = [ordered]@{
      validationScope = $validationScope
      validationComponent = "table"
      validationField = $invalidField
    }
    throw "${Label}_VALUE_INVALID"
  }
  foreach ($column in @($Row.columns)) {
    Assert-ExactPropertyNames -Value $column -Expected @("schema", "table", "ordinal", "name", "type", "notNull", "defaultDefinition") -Label "${Label}_COLUMN"
    if ($null -eq $column.ordinal -or [int]$column.ordinal -le 0 -or $column.notNull -isnot [bool] -or
        ($null -ne $column.defaultDefinition -and $column.defaultDefinition -isnot [string])) { throw "${Label}_COLUMN_VALUE_INVALID" }
  }
  foreach ($constraint in @($Row.constraints)) {
    Assert-ExactPropertyNames -Value $constraint -Expected @("schema", "table", "name", "type", "definition") -Label "${Label}_CONSTRAINT"
  }
  foreach ($index in @($Row.indexes)) {
    Assert-ExactPropertyNames -Value $index -Expected @("schema", "table", "name", "definition") -Label "${Label}_INDEX"
  }
  foreach ($policy in @($Row.policies)) {
    Assert-ExactPropertyNames -Value $policy -Expected @("schema", "table", "name", "command", "permissive", "roles", "usingDefinition", "checkDefinition") -Label "${Label}_POLICY"
    if ($policy.permissive -isnot [bool] -or $policy.roles -isnot [array]) { throw "${Label}_POLICY_VALUE_INVALID" }
    foreach ($role in @($policy.roles)) { if ($role -isnot [string]) { throw "${Label}_POLICY_ROLE_INVALID" } }
  }
  foreach ($acl in @($Row.acls)) { Assert-AclRow -Row $acl -Label "${Label}_ACL" }
}

function Assert-TriggerRow {
  param([object]$Row, [string]$Label)
  Assert-ExactPropertyNames -Value $Row -Expected @("tableSchema", "tableName", "name", "enabled", "functionIdentity", "definition") -Label $Label
  if ([string]::IsNullOrWhiteSpace([string]$Row.tableSchema) -or
      [string]::IsNullOrWhiteSpace([string]$Row.tableName) -or
      [string]::IsNullOrWhiteSpace([string]$Row.name) -or
      $Row.enabled -isnot [bool] -or
      [string]::IsNullOrWhiteSpace([string]$Row.functionIdentity) -or
      [string]::IsNullOrWhiteSpace([string]$Row.definition)) { throw "${Label}_VALUE_INVALID" }
}

function Assert-CatalogState {
  param([object]$State, [string]$Label)
  Assert-ExactPropertyNames -Value $State -Expected @("tables", "functions", "triggers", "dependencyCounts") -Label $Label
  if ($State.tables -isnot [array] -or $State.functions -isnot [array] -or $State.triggers -isnot [array]) {
    throw "${Label}_ARRAY_MISSING"
  }
  foreach ($row in @($State.tables)) { Assert-TableRow -Row $row -Label "${Label}_TABLE" }
  foreach ($row in @($State.functions)) { Assert-FunctionRow -Row $row -Label "${Label}_FUNCTION" }
  foreach ($row in @($State.triggers)) { Assert-TriggerRow -Row $row -Label "${Label}_TRIGGER" }
  Assert-DependencyCounts -Counts $State.dependencyCounts -Label "${Label}_DEPENDENCIES"
}

function Assert-ReadbackShape {
  param(
    [pscustomobject]$Common,
    [pscustomobject]$Scoped,
    [pscustomobject]$Canonical
  )
  if ($Common.kind -ne "common" -or $Scoped.kind -ne "scoped") {
    throw "READBACK_KIND_MISMATCH"
  }
  if ($Common.readOnly.transactionReadOnly -ne "on" -or
      $Common.readOnly.defaultTransactionReadOnly -ne "on" -or
      $Common.readOnly.transactionIsolation -ne "repeatable read") {
    throw "READONLY_ASSERTION_FAILED"
  }
  if ([string]$Common.targetFingerprint -notmatch "^[0-9a-f]{32}$" -or
      [string]$Scoped.targetFingerprint -notmatch "^[0-9a-f]{32}$") {
    throw "TARGET_FINGERPRINT_MISSING"
  }
  if (@($Common.history.rows).Count -ne [int]$Common.history.count) {
    throw "HISTORY_ROW_COUNT_MISMATCH"
  }
  if ($Common.canonicalRpc.functions -isnot [array]) {
    throw "CANONICAL_FUNCTION_MANIFEST_MISSING"
  }
  foreach ($row in @($Common.canonicalRpc.functions)) {
    Assert-FunctionRow -Row $row -Label "CANONICAL_FUNCTION"
  }
  Assert-CatalogState -State $Canonical -Label "CANONICAL_STATE"
  Assert-CatalogState -State $Scoped.paidLegacy -Label "PAID_LEGACY_STATE"
  Assert-CatalogState -State $Scoped.sourceEra -Label "SOURCE_ERA_STATE"
  if ($target -eq "production") {
    if ([int]$Common.history.count -ne 22 -or
        [int]$Common.history.totalStatements -ne 221 -or
        [int]$Common.history.targetRows -ne 4 -or
        [int]$Common.history.targetMatches -ne 4) {
      throw "PRODUCTION_TARGET_FINGERPRINT_MISMATCH"
    }
    $expected = [ordered]@{
      paidLegacyTableCount = 3
      paidLegacyFunctionCount = 3
      paidLegacyTriggerCount = 1
      sourceEraTableCount = 6
      sourceEraFunctionCount = 7
    }
    $observed = [ordered]@{
      paidLegacyTableCount = @($Scoped.paidLegacy.tables).Count
      paidLegacyFunctionCount = @($Scoped.paidLegacy.functions).Count
      paidLegacyTriggerCount = @($Scoped.paidLegacy.triggers).Count
      sourceEraTableCount = @($Scoped.sourceEra.tables).Count
      sourceEraFunctionCount = @($Scoped.sourceEra.functions).Count
    }
    if ($observed.paidLegacyTableCount -ne $expected.paidLegacyTableCount -or
        $observed.paidLegacyFunctionCount -ne $expected.paidLegacyFunctionCount -or
        $observed.paidLegacyTriggerCount -ne $expected.paidLegacyTriggerCount -or
        $observed.sourceEraTableCount -ne $expected.sourceEraTableCount -or
        $observed.sourceEraFunctionCount -ne $expected.sourceEraFunctionCount) {
      $script:failureDetails = [ordered]@{ expected = $expected; observed = $observed }
      throw "PRODUCTION_CATALOG_SHAPE_MISMATCH"
    }
  } else {
    if ([int]$Common.history.count -ne 30 -or
        @($Common.canonicalRpc.functions).Count -ne 81) {
      throw "PREVIEW_TARGET_FINGERPRINT_MISMATCH"
    }
    $expectedCanonicalTables = @(
      "comment_translator_paid_attempt_receipts",
      "comment_translator_paid_azure_fallback_buckets",
      "comment_translator_paid_billing_lifecycles",
      "comment_translator_paid_billing_period_usage",
      "comment_translator_paid_capacity_config",
      "comment_translator_paid_capacity_reservations",
      "comment_translator_paid_checkout_holds",
      "comment_translator_paid_checkout_session_bindings",
      "comment_translator_paid_consents",
      "comment_translator_paid_customers",
      "comment_translator_paid_entitlements",
      "comment_translator_paid_external_id_tombstones",
      "comment_translator_paid_global_cost_buckets",
      "comment_translator_paid_logical_attempts",
      "comment_translator_paid_maintenance_work_items",
      "comment_translator_paid_message_rate_buckets",
      "comment_translator_paid_message_rate_reservation_tombstones",
      "comment_translator_paid_message_rate_reservations",
      "comment_translator_paid_openai_minute_buckets",
      "comment_translator_paid_openai_rate_reservations",
      "comment_translator_paid_openai_slots",
      "comment_translator_paid_owner_cost_buckets",
      "comment_translator_paid_poll_budget_buckets",
      "comment_translator_paid_poll_reservations",
      "comment_translator_paid_provider_circuits",
      "comment_translator_paid_provider_detail_source_receipts",
      "comment_translator_paid_provider_dispatch_claims",
      "comment_translator_paid_provider_hourly_details",
      "comment_translator_paid_scheduler_runs",
      "comment_translator_paid_session_leases",
      "comment_translator_paid_session_summaries",
      "comment_translator_paid_stripe_event_receipts",
      "comment_translator_paid_subscription_bindings"
    )
    $actualCanonicalTables = @($Canonical.tables | ForEach-Object { [string]$_.name } | Sort-Object)
    if ($actualCanonicalTables.Count -ne $expectedCanonicalTables.Count -or
        $null -ne (Compare-Object -ReferenceObject @($expectedCanonicalTables | Sort-Object) -DifferenceObject $actualCanonicalTables)) {
      throw "PREVIEW_CANONICAL_MANIFEST_MISMATCH"
    }
    $expected = [ordered]@{
      legacyRelationCount = 0
      sourceEraRelationCount = 0
      archiveSchemaCount = 0
      sharedPaidEntitlementRelationCount = 1
    }
    $observed = [ordered]@{
      legacyRelationCount = [int]$Scoped.absence.legacyRelationCount
      sourceEraRelationCount = [int]$Scoped.absence.sourceEraRelationCount
      archiveSchemaCount = [int]$Scoped.absence.archiveSchemaCount
      sharedPaidEntitlementRelationCount = [int]$Scoped.absence.sharedPaidEntitlementRelationCount
    }
    if ($observed.sharedPaidEntitlementRelationCount -ne $expected.sharedPaidEntitlementRelationCount) {
      $script:failureDetails = [ordered]@{ expected = $expected; observed = $observed }
      throw "PREVIEW_CANONICAL_ENTITLEMENT_RELATION_MISSING"
    }
    if ($observed.legacyRelationCount -ne $expected.legacyRelationCount -or
        $observed.sourceEraRelationCount -ne $expected.sourceEraRelationCount -or
        $observed.archiveSchemaCount -ne $expected.archiveSchemaCount) {
      $script:failureDetails = [ordered]@{ expected = $expected; observed = $observed }
      throw "PREVIEW_LEGACY_SHAPE_PRESENT"
    }
  }
}

$sqlCommon = @'
begin isolation level repeatable read read only;
set local lock_timeout = '5s';
set local statement_timeout = '60s';
with function_catalog as (
  select
    p.oid,
    n.nspname as schema_name,
    p.proname as function_name,
    pg_catalog.pg_get_function_identity_arguments(p.oid) as identity_arguments,
    p.prorettype as result_type_oid,
    p.proowner as owner_oid,
    p.prosecdef as security_definer,
    p.proconfig as function_config,
    p.proacl as function_acl
  from pg_catalog.pg_proc as p
  join pg_catalog.pg_namespace as n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname like 'ct_paid_%'
),
function_rows as (
  select
    fc.schema_name,
    fc.function_name,
    fc.identity_arguments,
    jsonb_build_object(
      'schema', fc.schema_name,
      'name', fc.function_name,
      'identityArguments', fc.identity_arguments,
      'resultType', pg_catalog.format_type(fc.result_type_oid, null::integer),
      'owner', pg_catalog.pg_get_userbyid(fc.owner_oid),
      'securityDefiner', fc.security_definer,
      'config', coalesce((
        select jsonb_agg(config_value order by config_value)
        from pg_catalog.unnest(coalesce(fc.function_config, array[]::text[])) as config_value
      ), '[]'::jsonb),
      'acls', coalesce((
        select jsonb_agg(
          jsonb_build_object(
            'schema', fc.schema_name,
            'objectKind', 'function',
            'objectIdentity', format('%I.%I(%s)', fc.schema_name, fc.function_name, fc.identity_arguments),
            'grantee', case when acl.grantee = 0 then 'PUBLIC' else pg_catalog.pg_get_userbyid(acl.grantee) end,
            'privilege', acl.privilege_type,
            'grantable', acl.is_grantable
          )
          order by
            case when acl.grantee = 0 then 'PUBLIC' else pg_catalog.pg_get_userbyid(acl.grantee) end,
            acl.privilege_type,
            acl.is_grantable
        )
        from pg_catalog.aclexplode(coalesce(fc.function_acl, pg_catalog.acldefault('f', fc.owner_oid))) as acl
      ), '[]'::jsonb),
      'definitionMd5', pg_catalog.md5(pg_catalog.pg_get_functiondef(fc.oid))
    ) as row_json
  from function_catalog as fc
)
select jsonb_build_object(
  'kind', 'common',
  'readOnly', jsonb_build_object(
    'transactionReadOnly', current_setting('transaction_read_only'),
    'defaultTransactionReadOnly', current_setting('default_transaction_read_only'),
    'transactionIsolation', current_setting('transaction_isolation'),
    'serverVersionMajor', split_part(current_setting('server_version'), ' ', 1)
  ),
  'history', jsonb_build_object(
    'count', count(*)::bigint,
    'totalStatements', coalesce(sum(coalesce(pg_catalog.cardinality(sm.statements), 0)), 0)::bigint,
    'targetRows', count(*) filter (where sm.version in ('20260722000000', '20260722001000', '20260726111154', '20260728135736')),
    'targetMatches', count(*) filter (where (sm.version, sm.name) in (
      ('20260722000000', 'comment_translator_paid_entitlements'),
      ('20260722001000', 'comment_translator_paid_usage_counters'),
      ('20260726111154', 'comment_translator_paid_entitlements'),
      ('20260728135736', 'comment_translator_paid_usage_counters')
    )),
    'rows', coalesce(jsonb_agg(jsonb_build_object('version', sm.version, 'name', sm.name) order by sm.version, sm.name), '[]'::jsonb)
  ),
  'canonicalRpc', jsonb_build_object(
    'functions', coalesce((select jsonb_agg(fr.row_json order by fr.schema_name, fr.function_name, fr.identity_arguments) from function_rows as fr), '[]'::jsonb)
  ),
  'targetFingerprint', pg_catalog.md5(concat_ws(
    '|',
    '__TARGET__',
    pg_catalog.md5(current_database()),
    current_setting('server_version_num'),
    current_setting('transaction_read_only'),
    current_setting('default_transaction_read_only'),
    current_setting('transaction_isolation'),
    count(*)::text,
    coalesce(sum(coalesce(pg_catalog.cardinality(sm.statements), 0)), 0)::text,
    count(*) filter (where sm.version in ('20260722000000', '20260722001000', '20260726111154', '20260728135736'))::text,
    count(*) filter (where (sm.version, sm.name) in (
      ('20260722000000', 'comment_translator_paid_entitlements'),
      ('20260722001000', 'comment_translator_paid_usage_counters'),
      ('20260726111154', 'comment_translator_paid_entitlements'),
      ('20260728135736', 'comment_translator_paid_usage_counters')
    ))::text,
    (select count(*) from function_catalog)::text
  ))
)
from supabase_migrations.schema_migrations as sm;
'@

$sqlProductionScoped = @'
with
table_scope as (
  select 'canonical'::text as scope_name, name::text as table_name
  from (values
    ('comment_translator_paid_attempt_receipts'),
    ('comment_translator_paid_azure_fallback_buckets'),
    ('comment_translator_paid_billing_lifecycles'),
    ('comment_translator_paid_billing_period_usage'),
    ('comment_translator_paid_capacity_config'),
    ('comment_translator_paid_capacity_reservations'),
    ('comment_translator_paid_checkout_holds'),
    ('comment_translator_paid_checkout_session_bindings'),
    ('comment_translator_paid_consents'),
    ('comment_translator_paid_customers'),
    ('comment_translator_paid_entitlements'),
    ('comment_translator_paid_external_id_tombstones'),
    ('comment_translator_paid_global_cost_buckets'),
    ('comment_translator_paid_logical_attempts'),
    ('comment_translator_paid_maintenance_work_items'),
    ('comment_translator_paid_message_rate_buckets'),
    ('comment_translator_paid_message_rate_reservation_tombstones'),
    ('comment_translator_paid_message_rate_reservations'),
    ('comment_translator_paid_openai_minute_buckets'),
    ('comment_translator_paid_openai_rate_reservations'),
    ('comment_translator_paid_openai_slots'),
    ('comment_translator_paid_owner_cost_buckets'),
    ('comment_translator_paid_poll_budget_buckets'),
    ('comment_translator_paid_poll_reservations'),
    ('comment_translator_paid_provider_circuits'),
    ('comment_translator_paid_provider_detail_source_receipts'),
    ('comment_translator_paid_provider_dispatch_claims'),
    ('comment_translator_paid_provider_hourly_details'),
    ('comment_translator_paid_scheduler_runs'),
    ('comment_translator_paid_session_leases'),
    ('comment_translator_paid_session_summaries'),
    ('comment_translator_paid_stripe_event_receipts'),
    ('comment_translator_paid_subscription_bindings')
  ) as names(name)
  where '__TARGET__' = 'preview' or name not in (
    'comment_translator_paid_entitlements',
    'comment_translator_paid_usage_counters',
    'comment_translator_paid_usage_events'
  )
  union all
  select 'paidLegacy'::text, name::text
  from (values
    ('comment_translator_paid_entitlements'),
    ('comment_translator_paid_usage_counters'),
    ('comment_translator_paid_usage_events')
  ) as names(name)
  where '__TARGET__' = 'production'
  union all
  select 'sourceEra'::text, name::text
  from (values
    ('comment_translator_obs_overlay_tokens'),
    ('comment_translator_obs_overlay_browser_sessions'),
    ('comment_translator_moderator_share_tokens'),
    ('comment_translator_moderator_share_browser_sessions'),
    ('comment_translator_custom_dictionary_entries'),
    ('comment_translator_creator_history')
  ) as names(name)
  where '__TARGET__' = 'production'
),
table_catalog as (
  select ts.scope_name, c.oid, n.nspname as schema_name, c.relname as table_name,
         c.relowner, c.relrowsecurity, c.relacl
  from table_scope as ts
  join pg_catalog.pg_class as c on c.relname = ts.table_name
  join pg_catalog.pg_namespace as n on n.oid = c.relnamespace and n.nspname = 'public'
  where c.relkind in ('r', 'p')
),
exact_counts as (
  select
    tc.table_name,
    (
      (pg_catalog.xpath(
        '/table/row/row_count/text()',
        pg_catalog.query_to_xml(
          format('select count(*)::bigint as row_count from %I.%I', tc.schema_name, tc.table_name),
          false,
          false,
          ''
        )
      ))[1]::text
    )::bigint as row_count
  from table_catalog as tc
),
table_rows as (
  select
    tc.scope_name,
    tc.schema_name,
    tc.table_name,
    jsonb_build_object(
      'schema', tc.schema_name,
      'name', tc.table_name,
      'owner', pg_catalog.pg_get_userbyid(tc.relowner),
      'rlsEnabled', tc.relrowsecurity,
      'rowCount', ec.row_count,
      'columns', coalesce((
        select jsonb_agg(jsonb_build_object(
          'schema', tc.schema_name,
          'table', tc.table_name,
          'ordinal', a.attnum,
          'name', a.attname,
          'type', pg_catalog.format_type(a.atttypid, a.atttypmod),
          'notNull', a.attnotnull,
          'defaultDefinition', case when ad.adbin is null then null else btrim(replace(pg_catalog.pg_get_expr(ad.adbin, ad.adrelid), E'\r\n', E'\n')) end
        ) order by a.attnum)
        from pg_catalog.pg_attribute as a
        left join pg_catalog.pg_attrdef as ad on ad.adrelid = a.attrelid and ad.adnum = a.attnum
        where a.attrelid = tc.oid and a.attnum > 0 and not a.attisdropped
      ), '[]'::jsonb),
      'constraints', coalesce((
        select jsonb_agg(jsonb_build_object(
          'schema', tc.schema_name,
          'table', tc.table_name,
          'name', con.conname,
          'type', con.contype,
          'definition', btrim(replace(pg_catalog.pg_get_constraintdef(con.oid, true), E'\r\n', E'\n'))
        ) order by con.conname, con.contype)
        from pg_catalog.pg_constraint as con
        where con.conrelid = tc.oid
      ), '[]'::jsonb),
      'indexes', coalesce((
        select jsonb_agg(jsonb_build_object(
          'schema', tc.schema_name,
          'table', tc.table_name,
          'name', ic.relname,
          'definition', btrim(replace(pg_catalog.pg_get_indexdef(i.indexrelid, 0, true), E'\r\n', E'\n'))
        ) order by ic.relname)
        from pg_catalog.pg_index as i
        join pg_catalog.pg_class as ic on ic.oid = i.indexrelid
        where i.indrelid = tc.oid
      ), '[]'::jsonb),
      'policies', coalesce((
        select jsonb_agg(jsonb_build_object(
          'schema', tc.schema_name,
          'table', tc.table_name,
          'name', pol.polname,
          'command', case pol.polcmd when '*' then 'ALL' when 'r' then 'SELECT' when 'a' then 'INSERT' when 'w' then 'UPDATE' when 'd' then 'DELETE' else pol.polcmd::text end,
          'permissive', pol.polpermissive,
          'roles', coalesce((
            select jsonb_agg(role_name order by role_name)
            from (
              select case when role_oid = 0 then 'PUBLIC' else pg_catalog.pg_get_userbyid(role_oid) end as role_name
              from pg_catalog.unnest(pol.polroles) as role_oid
            ) as roles
          ), '[]'::jsonb),
          'usingDefinition', case when pol.polqual is null then null else btrim(replace(pg_catalog.pg_get_expr(pol.polqual, pol.polrelid), E'\r\n', E'\n')) end,
          'checkDefinition', case when pol.polwithcheck is null then null else btrim(replace(pg_catalog.pg_get_expr(pol.polwithcheck, pol.polrelid), E'\r\n', E'\n')) end
        ) order by pol.polname)
        from pg_catalog.pg_policy as pol
        where pol.polrelid = tc.oid
      ), '[]'::jsonb),
      'acls', coalesce((
        select jsonb_agg(jsonb_build_object(
          'schema', tc.schema_name,
          'objectKind', 'table',
          'objectIdentity', format('%I.%I', tc.schema_name, tc.table_name),
          'grantee', case when acl.grantee = 0 then 'PUBLIC' else pg_catalog.pg_get_userbyid(acl.grantee) end,
          'privilege', acl.privilege_type,
          'grantable', acl.is_grantable
        ) order by
          case when acl.grantee = 0 then 'PUBLIC' else pg_catalog.pg_get_userbyid(acl.grantee) end,
          acl.privilege_type,
          acl.is_grantable)
        from pg_catalog.aclexplode(coalesce(tc.relacl, pg_catalog.acldefault('r', tc.relowner))) as acl
      ), '[]'::jsonb)
    ) as row_json
  from table_catalog as tc
  join exact_counts as ec on ec.table_name = tc.table_name
),
legacy_function_specs as (
  select * from (values
    ('apply_comment_translator_paid_entitlement_evidence', 'p_billing_user_reference_id text, p_stripe_customer_reference_id text, p_stripe_subscription_reference_id text, p_subscription_status text, p_billing_state text, p_current_period_end timestamp with time zone, p_evidence_event_reference_id text, p_evidence_created_at timestamp with time zone, p_evidence_recorded_at timestamp with time zone'),
    ('apply_comment_translator_paid_usage', 'p_billing_user_reference_id text, p_expected_period_end timestamp with time zone, p_usage_event_reference_id text, p_occurred_at timestamp with time zone, p_translated_message_count bigint, p_provider_input_character_count bigint, p_estimated_cost_micros bigint'),
    ('sync_comment_translator_paid_usage_from_entitlement', '')
  ) as specs(function_name, identity_arguments)
),
source_era_function_specs as (
  select * from (values
    ('write_comment_translator_obs_overlay_token'),
    ('revoke_comment_translator_obs_overlay_token'),
    ('write_comment_translator_moderator_share_token'),
    ('revoke_comment_translator_moderator_share_token'),
    ('create_comment_translator_custom_dictionary_entry'),
    ('update_comment_translator_custom_dictionary_entry'),
    ('delete_comment_translator_custom_dictionary_entry')
  ) as specs(function_name)
),
function_catalog as (
  select
    case
      when p.proname like 'ct_paid_%' then 'canonical'
      when lfs.function_name is not null then 'paidLegacy'
      else 'sourceEra'
    end as scope_name,
    p.oid,
    n.nspname as schema_name,
    p.proname as function_name,
    pg_catalog.pg_get_function_identity_arguments(p.oid) as identity_arguments,
    p.prorettype as result_type_oid,
    p.proowner as owner_oid,
    p.prosecdef as security_definer,
    p.proconfig as function_config,
    p.proacl as function_acl
  from pg_catalog.pg_proc as p
  join pg_catalog.pg_namespace as n on n.oid = p.pronamespace and n.nspname = 'public'
  left join legacy_function_specs as lfs
    on lfs.function_name = p.proname
   and lfs.identity_arguments = pg_catalog.pg_get_function_identity_arguments(p.oid)
  left join source_era_function_specs as sefs
    on sefs.function_name = p.proname
  where p.proname like 'ct_paid_%'
     or ('__TARGET__' = 'production' and (lfs.function_name is not null or sefs.function_name is not null))
),
function_rows as (
  select fc.scope_name, fc.schema_name, fc.function_name, fc.identity_arguments,
    jsonb_build_object(
      'schema', fc.schema_name,
      'name', fc.function_name,
      'identityArguments', fc.identity_arguments,
      'resultType', pg_catalog.format_type(fc.result_type_oid, null::integer),
      'owner', pg_catalog.pg_get_userbyid(fc.owner_oid),
      'securityDefiner', fc.security_definer,
      'config', coalesce((
        select jsonb_agg(config_value order by config_value)
        from pg_catalog.unnest(coalesce(fc.function_config, array[]::text[])) as config_value
      ), '[]'::jsonb),
      'acls', coalesce((
        select jsonb_agg(jsonb_build_object(
          'schema', fc.schema_name,
          'objectKind', 'function',
          'objectIdentity', format('%I.%I(%s)', fc.schema_name, fc.function_name, fc.identity_arguments),
          'grantee', case when acl.grantee = 0 then 'PUBLIC' else pg_catalog.pg_get_userbyid(acl.grantee) end,
          'privilege', acl.privilege_type,
          'grantable', acl.is_grantable
        ) order by
          case when acl.grantee = 0 then 'PUBLIC' else pg_catalog.pg_get_userbyid(acl.grantee) end,
          acl.privilege_type,
          acl.is_grantable)
        from pg_catalog.aclexplode(coalesce(fc.function_acl, pg_catalog.acldefault('f', fc.owner_oid))) as acl
      ), '[]'::jsonb),
      'definitionMd5', pg_catalog.md5(pg_catalog.pg_get_functiondef(fc.oid))
    ) as row_json
  from function_catalog as fc
),
trigger_rows as (
  select tc.scope_name, jsonb_build_object(
    'tableSchema', tc.schema_name,
    'tableName', tc.table_name,
    'name', tg.tgname,
    'enabled', tg.tgenabled <> 'D',
    'functionIdentity', format('%I.%I(%s)', fn_ns.nspname, fn.proname, pg_catalog.pg_get_function_identity_arguments(fn.oid)),
    'definition', btrim(replace(pg_catalog.pg_get_triggerdef(tg.oid, true), E'\r\n', E'\n'))
  ) as row_json
  from table_catalog as tc
  join pg_catalog.pg_trigger as tg on tg.tgrelid = tc.oid and not tg.tgisinternal
  join pg_catalog.pg_proc as fn on fn.oid = tg.tgfoid
  join pg_catalog.pg_namespace as fn_ns on fn_ns.oid = fn.pronamespace
),
dependency_counts as (
  select scope_name,
    (select count(*) from pg_catalog.pg_constraint as fk
      where fk.contype = 'f'
        and fk.confrelid in (select oid from table_catalog where table_catalog.scope_name = scopes.scope_name)
        and fk.conrelid not in (select oid from table_catalog where table_catalog.scope_name = scopes.scope_name))::bigint as inbound_foreign_keys,
    (select count(*) from pg_catalog.pg_depend as dep
      join pg_catalog.pg_rewrite as rw on dep.classid = 'pg_rewrite'::regclass and dep.objid = rw.oid
      join pg_catalog.pg_class as view_rel on view_rel.oid = rw.ev_class
      where dep.refclassid = 'pg_class'::regclass
        and dep.refobjid in (select oid from table_catalog where table_catalog.scope_name = scopes.scope_name)
        and view_rel.relkind = 'v'
        and view_rel.oid not in (select oid from table_catalog where table_catalog.scope_name = scopes.scope_name))::bigint as views,
    (select count(*) from pg_catalog.pg_depend as dep
      join pg_catalog.pg_rewrite as rw on dep.classid = 'pg_rewrite'::regclass and dep.objid = rw.oid
      join pg_catalog.pg_class as mat_rel on mat_rel.oid = rw.ev_class
      where dep.refclassid = 'pg_class'::regclass
        and dep.refobjid in (select oid from table_catalog where table_catalog.scope_name = scopes.scope_name)
        and mat_rel.relkind = 'm'
        and mat_rel.oid not in (select oid from table_catalog where table_catalog.scope_name = scopes.scope_name))::bigint as materialized_views,
    (select count(*) from pg_catalog.pg_rewrite as rw
      where rw.ev_class in (select oid from table_catalog where table_catalog.scope_name = scopes.scope_name)
        and rw.rulename <> '_RETURN')::bigint as rules,
    (select count(*) from pg_catalog.pg_policy as pol
      where pol.polrelid in (select oid from table_catalog where table_catalog.scope_name = scopes.scope_name))::bigint as policies,
    (select count(*) from pg_catalog.pg_trigger as tg
      where tg.tgrelid in (select oid from table_catalog where table_catalog.scope_name = scopes.scope_name)
        and not tg.tgisinternal)::bigint as user_triggers,
    (select count(*) from pg_catalog.pg_depend as dep
      where dep.refclassid = 'pg_event_trigger'::regclass
        and dep.refobjid in (select oid from table_catalog where table_catalog.scope_name = scopes.scope_name))::bigint as event_triggers,
    (select count(*) from pg_catalog.pg_publication_rel as pub
      where pub.prrelid in (select oid from table_catalog where table_catalog.scope_name = scopes.scope_name))::bigint as publications,
    (select count(*) from pg_catalog.pg_proc as outside_fn
      join pg_catalog.pg_namespace as outside_ns on outside_ns.oid = outside_fn.pronamespace
      where outside_ns.nspname = 'public'
        and outside_fn.oid not in (select oid from function_catalog where function_catalog.scope_name = scopes.scope_name)
        and exists (
          select 1 from table_catalog as scoped_table
          where scoped_table.scope_name = scopes.scope_name
            and position(format('%I.%I', scoped_table.schema_name, scoped_table.table_name) in pg_catalog.pg_get_functiondef(outside_fn.oid)) > 0
        ))::bigint as outside_function_source_references,
    (select count(*) from pg_catalog.pg_depend as dep
      where dep.deptype = 'n'
        and (
          (dep.classid = 'pg_class'::regclass and dep.objid in (select oid from table_catalog where table_catalog.scope_name = scopes.scope_name))
          or (dep.classid = 'pg_proc'::regclass and dep.objid in (select oid from function_catalog where function_catalog.scope_name = scopes.scope_name))
          or (dep.refclassid = 'pg_class'::regclass and dep.refobjid in (select oid from table_catalog where table_catalog.scope_name = scopes.scope_name))
          or (dep.refclassid = 'pg_proc'::regclass and dep.refobjid in (select oid from function_catalog where function_catalog.scope_name = scopes.scope_name))
        )
    )::bigint as unexpected_pg_depend_edges
  from (values ('canonical'::text), ('paidLegacy'::text), ('sourceEra'::text)) as scopes(scope_name)
)
select jsonb_build_object(
  'kind', 'scoped',
  'canonical', jsonb_build_object(
    'tables', coalesce((select jsonb_agg(row_json order by schema_name, table_name) from table_rows where scope_name = 'canonical'), '[]'::jsonb),
    'functions', coalesce((select jsonb_agg(row_json order by schema_name, function_name, identity_arguments) from function_rows where scope_name = 'canonical'), '[]'::jsonb),
    'triggers', coalesce((select jsonb_agg(row_json order by row_json->>'tableSchema', row_json->>'tableName', row_json->>'name') from trigger_rows where scope_name = 'canonical'), '[]'::jsonb),
    'dependencyCounts', (select jsonb_build_object(
      'inboundForeignKeys', inbound_foreign_keys,
      'views', views,
      'materializedViews', materialized_views,
      'rules', rules,
      'policies', policies,
      'userTriggers', user_triggers,
      'eventTriggers', event_triggers,
      'publications', publications,
      'outsideFunctionSourceReferences', outside_function_source_references,
      'unexpectedPgDependEdges', unexpected_pg_depend_edges
    ) from dependency_counts where scope_name = 'canonical')
  ),
  'paidLegacy', jsonb_build_object(
    'tables', coalesce((select jsonb_agg(row_json order by schema_name, table_name) from table_rows where scope_name = 'paidLegacy'), '[]'::jsonb),
    'functions', coalesce((select jsonb_agg(row_json order by schema_name, function_name, identity_arguments) from function_rows where scope_name = 'paidLegacy'), '[]'::jsonb),
    'triggers', coalesce((select jsonb_agg(row_json order by row_json->>'tableSchema', row_json->>'tableName', row_json->>'name') from trigger_rows where scope_name = 'paidLegacy'), '[]'::jsonb),
    'dependencyCounts', (select jsonb_build_object(
      'inboundForeignKeys', inbound_foreign_keys,
      'views', views,
      'materializedViews', materialized_views,
      'rules', rules,
      'policies', policies,
      'userTriggers', user_triggers,
      'eventTriggers', event_triggers,
      'publications', publications,
      'outsideFunctionSourceReferences', outside_function_source_references,
      'unexpectedPgDependEdges', unexpected_pg_depend_edges
    ) from dependency_counts where scope_name = 'paidLegacy')
  ),
  'sourceEra', jsonb_build_object(
    'tables', coalesce((select jsonb_agg(row_json order by schema_name, table_name) from table_rows where scope_name = 'sourceEra'), '[]'::jsonb),
    'functions', coalesce((select jsonb_agg(row_json order by schema_name, function_name, identity_arguments) from function_rows where scope_name = 'sourceEra'), '[]'::jsonb),
    'triggers', coalesce((select jsonb_agg(row_json order by row_json->>'tableSchema', row_json->>'tableName', row_json->>'name') from trigger_rows where scope_name = 'sourceEra'), '[]'::jsonb),
    'dependencyCounts', (select jsonb_build_object(
      'inboundForeignKeys', inbound_foreign_keys,
      'views', views,
      'materializedViews', materialized_views,
      'rules', rules,
      'policies', policies,
      'userTriggers', user_triggers,
      'eventTriggers', event_triggers,
      'publications', publications,
      'outsideFunctionSourceReferences', outside_function_source_references,
      'unexpectedPgDependEdges', unexpected_pg_depend_edges
    ) from dependency_counts where scope_name = 'sourceEra')
  ),
  'absence', jsonb_build_object(
    'legacyRelationCount', (select count(*) from pg_catalog.pg_class as c join pg_catalog.pg_namespace as n on n.oid = c.relnamespace where n.nspname = 'public' and (('__TARGET__' = 'preview' and c.relname in ('comment_translator_paid_usage_counters', 'comment_translator_paid_usage_events')) or ('__TARGET__' = 'production' and c.relname in ('comment_translator_paid_entitlements', 'comment_translator_paid_usage_counters', 'comment_translator_paid_usage_events')))),
    'sourceEraRelationCount', (select count(*) from pg_catalog.pg_class as c join pg_catalog.pg_namespace as n on n.oid = c.relnamespace where n.nspname = 'public' and c.relname in ('comment_translator_obs_overlay_tokens', 'comment_translator_obs_overlay_browser_sessions', 'comment_translator_moderator_share_tokens', 'comment_translator_moderator_share_browser_sessions', 'comment_translator_custom_dictionary_entries', 'comment_translator_creator_history')),
    'archiveSchemaCount', (select count(*) from pg_catalog.pg_namespace where nspname = 'comment_translator_paid_legacy_archive')
  ) || case when '__TARGET__' = 'preview' then jsonb_build_object(
    'sharedPaidEntitlementRelationCount', (select count(*) from pg_catalog.pg_class as c join pg_catalog.pg_namespace as n on n.oid = c.relnamespace where n.nspname = 'public' and c.relname = 'comment_translator_paid_entitlements')
  ) else '{}'::jsonb end,
  'targetFingerprint', pg_catalog.md5(concat_ws(
    '|',
    case when '__TARGET__' = 'production' then 'production' else 'preview' end,
    pg_catalog.md5(current_database()),
    case when '__TARGET__' = 'production' then (select count(*) from table_catalog where scope_name = 'paidLegacy')::text else current_setting('server_version_num') end,
    case when '__TARGET__' = 'production' then (select count(*) from table_catalog where scope_name = 'sourceEra')::text else current_setting('transaction_read_only') end,
    case when '__TARGET__' = 'production' then (select count(*) from function_catalog where scope_name = 'paidLegacy')::text else current_setting('default_transaction_read_only') end,
    case when '__TARGET__' = 'production' then (select count(*) from function_catalog where scope_name = 'sourceEra')::text else current_setting('transaction_isolation') end,
    case when '__TARGET__' = 'production' then (select count(*) from trigger_rows where scope_name = 'paidLegacy')::text else null end,
    case when '__TARGET__' = 'production' then (select count(*) from trigger_rows where scope_name = 'sourceEra')::text else null end
  ))
);
'@

$sqlPreviewScoped = $sqlProductionScoped

try {
  if (-not (Test-Path -LiteralPath $PsqlPath -PathType Leaf)) {
    throw "PSQL_MISSING"
  }
  Ensure-ReadbackDirectory
  $psqlVersion = Get-PsqlVersion
  $pgHost = Read-HiddenValue -Prompt "PGHOST (hidden input)"
  $pgUser = Read-HiddenValue -Prompt "PGUSER (hidden input)"
  $pgPassword = Read-HiddenValue -Prompt "PGPASSWORD (hidden input)"
  if ($pgHost -match "://|[\r\n]" -or $pgUser -match "[\r\n]") {
    throw "CONNECTION_VALUE_SHAPE_INVALID"
  }

  $sql = $sqlCommon + [Environment]::NewLine
  if ($target -eq "production") {
    $sql += $sqlProductionScoped
  } else {
    $sql += $sqlPreviewScoped
  }
  $sql = $sql.Replace("__TARGET__", $target)
  $sql += [Environment]::NewLine + "rollback;" + [Environment]::NewLine

  $environmentVariables = @{
    PGHOST = $pgHost
    PGPORT = "5432"
    PGUSER = $pgUser
    PGPASSWORD = $pgPassword
    PGDATABASE = "postgres"
    PGSSLMODE = "require"
    PGCONNECT_TIMEOUT = "15"
    PGOPTIONS = "-c default_transaction_read_only=on"
  }
  $result = Invoke-CapturedProcess -FilePath $PsqlPath -Arguments @(
    "--no-psqlrc",
    "--quiet",
    "--no-align",
    "--tuples-only",
    "--pset=footer=off",
    "--set=ON_ERROR_STOP=1"
  ) -EnvironmentVariables $environmentVariables -StandardInput $sql
  if ($result.ExitCode -ne 0) {
    $script:failureDetails = [ordered]@{
      psqlExitCode = [int]$result.ExitCode
      psqlErrorBytes = [int]$result.StderrBytes
      psqlErrorClass = [string]$result.StderrClass
    }
    throw "PSQL_EXIT"
  }
  if ($result.StderrBytes -ne 0 -or $result.StdoutBytes -gt $maxOutputBytes) {
    throw "PSQL_OUTPUT_BOUND_FAILED"
  }
  $raw = $result.Stdout.Trim()
  if ($raw -match "(?i)(postgres(?:ql)?://|sb_(?:secret|publishable)_|eyJ[A-Za-z0-9_-]{20,}\\.|password\\s*[:=]|authorization\\s*:|bearer\\s+)") {
    throw "UNSAFE_OUTPUT_SHAPE"
  }
  $lines = @($raw -split "\r?\n" | Where-Object { $_.Trim().Length -gt 0 })
  if ($lines.Count -ne 2) {
    throw "PSQL_JSON_LINE_COUNT"
  }
  $objects = @($lines | ForEach-Object { $_ | ConvertFrom-Json -Depth 100 })
  $common = $objects | Where-Object { $_.kind -eq "common" }
  $scoped = $objects | Where-Object { $_.kind -eq "scoped" }
  if (@($common).Count -ne 1 -or @($scoped).Count -ne 1) {
    throw "READBACK_OBJECT_COUNT"
  }
  $canonical = [ordered]@{
    tables = @($scoped.canonical.tables)
    functions = @($common.canonicalRpc.functions)
    triggers = @($scoped.canonical.triggers)
    dependencyCounts = $scoped.canonical.dependencyCounts
  }
  Assert-ReadbackShape -Common $common -Scoped $scoped -Canonical ([pscustomobject]$canonical)

  $artifactObject = [ordered]@{
    schemaVersion = 1
    target = $target
    targetFingerprint = [string]$common.targetFingerprint
    readOnly = $common.readOnly
    history = $common.history
    canonicalRpc = $common.canonicalRpc
    canonical = $canonical
    paidLegacy = $scoped.paidLegacy
    sourceEra = $scoped.sourceEra
    absence = $scoped.absence
  }
  $artifactJson = $artifactObject | ConvertTo-Json -Depth 100 -Compress
  $utf8NoBom = [Text.UTF8Encoding]::new($false)
  [IO.File]::WriteAllText($artifactPath, $artifactJson + [Environment]::NewLine, $utf8NoBom)
  Assert-NoReparse -Path $artifactPath
  $finalEntries = @(Get-ChildItem -LiteralPath $artifactDirectory -Force)
  if ($finalEntries.Count -ne 1 -or $finalEntries[0].PSIsContainer -or
      ($finalEntries[0].Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0) {
    throw "FINAL_DIRECTORY_SHAPE_INVALID"
  }
  $artifactHash = (Get-FileHash -LiteralPath $artifactPath -Algorithm SHA256).Hash.ToLowerInvariant()
  [ordered]@{
    schemaVersion = 1
    target = $target
    status = "PASS"
    psqlMajor = 17
    transactionReadOnly = $common.readOnly.transactionReadOnly
    defaultTransactionReadOnly = $common.readOnly.defaultTransactionReadOnly
    transactionIsolation = $common.readOnly.transactionIsolation
    targetFingerprint = [string]$common.targetFingerprint
    metadataSha256 = $artifactHash
    historyCount = [int]$common.history.count
    historyTargetRows = [int]$common.history.targetRows
    historyTargetMatches = [int]$common.history.targetMatches
    canonicalRpcFunctionCount = @($common.canonicalRpc.functions).Count
    canonicalTableCount = @($canonical.tables).Count
    canonicalFunctionCount = @($canonical.functions).Count
    canonicalTriggerCount = @($canonical.triggers).Count
    paidLegacyTableCount = @($scoped.paidLegacy.tables).Count
    paidLegacyFunctionCount = @($scoped.paidLegacy.functions).Count
    sourceEraTableCount = @($scoped.sourceEra.tables).Count
    sourceEraFunctionCount = @($scoped.sourceEra.functions).Count
    artifactFileName = Split-Path -Leaf $artifactPath
    artifactEntryCount = $finalEntries.Count
    mutationCounts = [ordered]@{ ddl = 0; dml = 0; rpc = 0; remote = 0; total = 0 }
  } | ConvertTo-Json -Compress
} catch {
  $reason = if ($_.Exception.Message -match "^[A-Z0-9_]+$") { $_.Exception.Message } else { "READBACK_FAILED" }
  Emit-Failure -Reason $reason
} finally {
  foreach ($value in $secureValues) {
    if ($value -is [IDisposable]) {
      $value.Dispose()
    }
  }
  $pgHost = $null
  $pgUser = $null
  $pgPassword = $null
  $environmentVariables = $null
}
