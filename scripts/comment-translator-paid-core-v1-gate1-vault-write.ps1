[CmdletBinding()]
param(
    [string]$Mode = "Preflight",
    [string]$Target = "",
    [string]$PsqlPath = "psql"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$script:VaultApprovalLabel = "approved-gate1-vault-write"
$script:BindingKeys = @(
    "caSha256",
    "connectionMode",
    "database",
    "host",
    "port",
    "projectRef",
    "schemaVersion",
    "sslMode",
    "target",
    "user"
)
$script:AllowedLibpqEnvironmentKeys = @(
    "PGDATABASE",
    "PGGSSENCMODE",
    "PGHOST",
    "PGPASSWORD",
    "PGPASSFILE",
    "PGPORT",
    "PGSSLMODE",
    "PGSSLROOTCERT",
    "PGUSER"
)
$script:ConnectionUrlEnvironmentKeys = @(
    "DATABASE_URL",
    "DATABASE_DIRECT_URL",
    "POSTGRES_URL",
    "POSTGRESQL_URL",
    "SUPABASE_DB_URL",
    "SUPABASE_DATABASE_URL",
    "PGURL",
    "PGURI",
    "PGCONNSTRING"
)
$script:ProcessEssentialKeys = @(
    "PATH",
    "SystemRoot",
    "WINDIR",
    "ComSpec",
    "TEMP",
    "TMP",
    "HOME",
    "USERPROFILE"
)
$script:MaxCapturedOutputBytes = 1024 * 1024
$script:ProcessTimeoutMilliseconds = 120000

function ConvertTo-SafeJson {
    param([Parameter(Mandatory = $true)][object]$Value)

    return ($Value | ConvertTo-Json -Compress -Depth 20)
}

function New-Result {
    param(
        [Parameter(Mandatory = $true)][string]$Status,
        [int]$MutationCount = 0,
        [int]$CommittedRowCount = -1
    )

    $result = [ordered]@{
        status = $Status
        mutationCount = $MutationCount
    }
    if ($CommittedRowCount -ge 0) {
        $result.committedRowCount = $CommittedRowCount
    }
    return $result
}

function Get-EnvironmentValue {
    param([Parameter(Mandatory = $true)][string]$Name)

    $entry = Get-Item -LiteralPath ("Env:" + $Name) -ErrorAction SilentlyContinue
    if ($null -eq $entry) {
        return $null
    }
    return [string]$entry.Value
}

function Test-NonEmptyValue {
    param([AllowNull()][object]$Value)

    return $null -ne $Value -and $Value -is [string] -and $Value.Length -gt 0
}

function Get-Sha256Hex {
    param([Parameter(Mandatory = $true)][string]$Value)

    $sha256 = [Security.Cryptography.SHA256]::Create()
    try {
        $bytes = [Text.Encoding]::UTF8.GetBytes($Value)
        $digest = $sha256.ComputeHash($bytes)
        return ([BitConverter]::ToString($digest).Replace("-", "")).ToLowerInvariant()
    } finally {
        $sha256.Dispose()
    }
}

function ConvertTo-CanonicalBindingJson {
    param([Parameter(Mandatory = $true)][object]$Binding)

    $ordered = [ordered]@{}
    foreach ($key in $script:BindingKeys) {
        $ordered[$key] = $Binding.$key
    }
    return ($ordered | ConvertTo-Json -Compress -Depth 5)
}

function Test-ExactPropertyNames {
    param(
        [Parameter(Mandatory = $true)][object]$Value,
        [Parameter(Mandatory = $true)][string[]]$Expected
    )

    if ($null -eq $Value) {
        return $false
    }
    $actual = @($Value.PSObject.Properties.Name | Sort-Object)
    $expected = @($Expected | Sort-Object)
    return $actual.Count -eq $expected.Count -and $null -eq (Compare-Object -ReferenceObject $expected -DifferenceObject $actual)
}

function Test-StrictAscii {
    param([AllowNull()][object]$Value)

    return $Value -is [string] -and $Value -cmatch "^[\x21-\x7e]*$"
}

function Test-DuplicateBindingKeys {
    param([Parameter(Mandatory = $true)][string]$RawJson)

    foreach ($key in $script:BindingKeys) {
        $pattern = '"' + [Regex]::Escape($key) + '"\s*:'
        if ([Regex]::Matches($RawJson, $pattern).Count -ne 1) {
            return $true
        }
    }
    return $false
}

function Get-TargetBindingResult {
    param([AllowNull()][string]$RawJson)

    if (-not (Test-NonEmptyValue $RawJson) -or [Text.Encoding]::UTF8.GetByteCount($RawJson) -gt $script:MaxCapturedOutputBytes) {
        return [pscustomobject]@{ ok = $false; reason = "TARGET_BINDING_MISSING"; binding = $null }
    }
    if ($RawJson -match "(?i)(?:postgres(?:ql)?:\/\/|bearer\s+|sb_(?:secret|publishable)_|eyJ[a-z0-9_-]{12,}\.|private[_ -]?key)") {
        return [pscustomobject]@{ ok = $false; reason = "TARGET_BINDING_INVALID"; binding = $null }
    }
    if (Test-DuplicateBindingKeys $RawJson) {
        return [pscustomobject]@{ ok = $false; reason = "TARGET_BINDING_INVALID"; binding = $null }
    }

    try {
        $binding = ConvertFrom-Json -InputObject $RawJson -Depth 10
    } catch {
        return [pscustomobject]@{ ok = $false; reason = "TARGET_BINDING_INVALID"; binding = $null }
    }
    if (-not (Test-ExactPropertyNames -Value $binding -Expected $script:BindingKeys)) {
        return [pscustomobject]@{ ok = $false; reason = "TARGET_BINDING_INVALID"; binding = $null }
    }
    $numericSchemaVersion = $binding.schemaVersion -is [int] -or $binding.schemaVersion -is [long]
    $numericPort = $binding.port -is [int] -or $binding.port -is [long]
    if (-not $numericSchemaVersion -or [int64]$binding.schemaVersion -ne 1 -or
        $binding.target -cnotin @("preview", "production") -or
        $binding.connectionMode -cne "direct" -or
        -not $numericPort -or [int64]$binding.port -ne 5432 -or
        $binding.database -cne "postgres" -or
        $binding.user -cne "postgres" -or
        $binding.sslMode -cne "verify-full") {
        return [pscustomobject]@{ ok = $false; reason = "TARGET_BINDING_INVALID"; binding = $null }
    }
    foreach ($field in @("projectRef", "host", "database", "user", "sslMode", "caSha256")) {
        if (-not (Test-StrictAscii $binding.$field)) {
            return [pscustomobject]@{ ok = $false; reason = "TARGET_BINDING_INVALID"; binding = $null }
        }
    }
    if ($binding.projectRef -cnotmatch "^[a-z0-9]+$" -or
        $binding.host -cne ("db." + $binding.projectRef + ".supabase.co") -or
        $binding.caSha256 -cnotmatch "^[0-9a-f]{64}$") {
        return [pscustomobject]@{ ok = $false; reason = "TARGET_BINDING_INVALID"; binding = $null }
    }

    return [pscustomobject]@{ ok = $true; reason = $null; binding = $binding }
}

function Test-TargetBindingDigest {
    param(
        [Parameter(Mandatory = $true)][object]$Binding,
        [AllowNull()][string]$ExpectedDigest
    )

    if (-not (Test-NonEmptyValue $ExpectedDigest) -or $ExpectedDigest -cnotmatch "^[0-9a-f]{64}$") {
        return $false
    }
    $actualDigest = Get-Sha256Hex (ConvertTo-CanonicalBindingJson $Binding)
    return $actualDigest -ceq $ExpectedDigest
}

function Test-CaFileBinding {
    param([Parameter(Mandatory = $true)][object]$Binding)

    $caPath = Get-EnvironmentValue "PGSSLROOTCERT"
    if (-not (Test-NonEmptyValue $caPath) -or $caPath -match "[\x00\r\n]") {
        return $false
    }
    try {
        $item = Get-Item -LiteralPath $caPath -Force -ErrorAction Stop
        if ($item.PSIsContainer -or ($item.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0) {
            return $false
        }
        $bytes = [IO.File]::ReadAllBytes($item.FullName)
        $actualDigest = Get-Sha256Hex ([Text.Encoding]::UTF8.GetString($bytes))
        $binaryDigest = [Security.Cryptography.SHA256]::Create()
        try {
            $actualDigest = ([BitConverter]::ToString($binaryDigest.ComputeHash($bytes)).Replace("-", "")).ToLowerInvariant()
        } finally {
            $binaryDigest.Dispose()
        }
        return $actualDigest -ceq [string]$Binding.caSha256
    } catch {
        return $false
    }
}

function Test-ForbiddenConnectionEnvironment {
    foreach ($entry in @(Get-ChildItem Env:)) {
        $name = [string]$entry.Name
        if ($name.StartsWith("PG", [StringComparison]::OrdinalIgnoreCase) -and
            $name -notin $script:AllowedLibpqEnvironmentKeys) {
            return $true
        }
        if ($name.StartsWith("PGSERVICE", [StringComparison]::OrdinalIgnoreCase) -or
            $name -in $script:ConnectionUrlEnvironmentKeys) {
            return $true
        }
    }
    return $false
}

function New-MinimalChildEnvironment {
    param([Parameter(Mandatory = $true)][object]$Binding)

    $child = @{}
    foreach ($key in $script:ProcessEssentialKeys) {
        $value = Get-EnvironmentValue $key
        if (Test-NonEmptyValue $value) {
            $child[$key] = $value
        }
    }
    $child["PGHOST"] = [string]$Binding.host
    $child["PGPORT"] = "5432"
    $child["PGDATABASE"] = "postgres"
    $child["PGUSER"] = "postgres"
    $child["PGSSLMODE"] = "verify-full"
    $child["PGSSLROOTCERT"] = Get-EnvironmentValue "PGSSLROOTCERT"
    $child["PGGSSENCMODE"] = "disable"

    $password = Get-EnvironmentValue "PGPASSWORD"
    $passwordFile = Get-EnvironmentValue "PGPASSFILE"
    if (Test-NonEmptyValue $password) {
        $child["PGPASSWORD"] = $password
    } else {
        $child["PGPASSFILE"] = $passwordFile
    }

    $maintenanceUrl = Get-EnvironmentValue "GATE1_VAULT_MAINTENANCE_URL"
    $cronToken = Get-EnvironmentValue "GATE1_VAULT_CRON_TOKEN"
    $child["GATE1_VAULT_MAINTENANCE_URL"] = $maintenanceUrl
    $child["GATE1_VAULT_CRON_TOKEN"] = $cronToken
    return $child
}

function Get-ConnectionContext {
    param([Parameter(Mandatory = $true)][object]$Binding)

    if (Test-ForbiddenConnectionEnvironment) {
        return [pscustomobject]@{ ok = $false; reason = "CONNECTION_BINDING_MISMATCH"; environment = $null }
    }
    foreach ($required in @("PGHOST", "PGPORT", "PGDATABASE", "PGUSER", "PGSSLMODE", "PGSSLROOTCERT")) {
        if (-not (Test-NonEmptyValue (Get-EnvironmentValue $required))) {
            return [pscustomobject]@{ ok = $false; reason = "CONNECTION_BINDING_MISMATCH"; environment = $null }
        }
    }
    if ((Get-EnvironmentValue "PGHOST") -cne [string]$Binding.host -or
        (Get-EnvironmentValue "PGPORT") -cne "5432" -or
        (Get-EnvironmentValue "PGDATABASE") -cne "postgres" -or
        (Get-EnvironmentValue "PGUSER") -cne "postgres") {
        return [pscustomobject]@{ ok = $false; reason = "CONNECTION_BINDING_MISMATCH"; environment = $null }
    }
    if ((Get-EnvironmentValue "PGSSLMODE") -cne "verify-full" -or -not (Test-CaFileBinding $Binding)) {
        return [pscustomobject]@{ ok = $false; reason = "TLS_CONTEXT_INVALID"; environment = $null }
    }

    $password = Get-EnvironmentValue "PGPASSWORD"
    $passwordFile = Get-EnvironmentValue "PGPASSFILE"
    $hasPassword = Test-NonEmptyValue $password
    $hasPasswordFile = Test-NonEmptyValue $passwordFile
    if ($hasPassword -eq $hasPasswordFile -or -not (Test-NonEmptyValue (Get-EnvironmentValue "PATH"))) {
        return [pscustomobject]@{ ok = $false; reason = "CONNECTION_BINDING_MISMATCH"; environment = $null }
    }

    return [pscustomobject]@{ ok = $true; reason = $null; environment = (New-MinimalChildEnvironment $Binding) }
}

function Get-ApplicationPath {
    param([Parameter(Mandatory = $true)][string]$Name)

    if ([IO.Path]::IsPathRooted($Name)) {
        if (Test-Path -LiteralPath $Name -PathType Leaf) {
            return [IO.Path]::GetFullPath($Name)
        }
        return $null
    }
    $command = Get-Command -Name $Name -CommandType Application -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($null -eq $command) {
        return $null
    }
    if (Test-NonEmptyValue $command.Source) {
        return [string]$command.Source
    }
    return [string]$command.Path
}

function Invoke-CapturedProcess {
    param(
        [Parameter(Mandatory = $true)][string]$FilePath,
        [Parameter(Mandatory = $true)][string[]]$Arguments,
        [Parameter(Mandatory = $true)][hashtable]$Environment,
        [Parameter(Mandatory = $true)][string]$StandardInput
    )

    $startInfo = [Diagnostics.ProcessStartInfo]::new()
    $startInfo.FileName = $FilePath
    $startInfo.UseShellExecute = $false
    $startInfo.CreateNoWindow = $true
    $startInfo.RedirectStandardInput = $true
    $startInfo.RedirectStandardOutput = $true
    $startInfo.RedirectStandardError = $true
    foreach ($argument in $Arguments) {
        [void]$startInfo.ArgumentList.Add($argument)
    }
    $startInfo.Environment.Clear()
    foreach ($key in $Environment.Keys) {
        $startInfo.Environment[$key] = [string]$Environment[$key]
    }

    $process = [Diagnostics.Process]::new()
    $started = $false
    try {
        $process.StartInfo = $startInfo
        if (-not $process.Start()) {
            throw "PROCESS_START_FAILED"
        }
        $started = $true
        $stdoutTask = $process.StandardOutput.ReadToEndAsync()
        $stderrTask = $process.StandardError.ReadToEndAsync()
        $inputTask = $process.StandardInput.WriteAsync($StandardInput)
        if (-not $inputTask.Wait($script:ProcessTimeoutMilliseconds)) {
            throw "PROCESS_TIMEOUT"
        }
        $inputTask.GetAwaiter().GetResult()
        $flushTask = $process.StandardInput.FlushAsync()
        if (-not $flushTask.Wait($script:ProcessTimeoutMilliseconds)) {
            throw "PROCESS_TIMEOUT"
        }
        $flushTask.GetAwaiter().GetResult()
        $process.StandardInput.Close()
        if (-not $process.WaitForExit($script:ProcessTimeoutMilliseconds)) {
            throw "PROCESS_TIMEOUT"
        }
        $stdout = $stdoutTask.GetAwaiter().GetResult()
        $stderr = $stderrTask.GetAwaiter().GetResult()
        return [pscustomobject]@{
            ExitCode = [int]$process.ExitCode
            Stdout = $stdout
            Stderr = $stderr
            StdoutBytes = [Text.Encoding]::UTF8.GetByteCount($stdout)
            StderrBytes = [Text.Encoding]::UTF8.GetByteCount($stderr)
        }
    } finally {
        if ($started -and -not $process.HasExited) {
            try {
                $process.Kill($true)
            } catch {
            }
            try {
                [void]$process.WaitForExit()
            } catch {
            }
        }
        $process.Dispose()
    }
}

function Get-PsqlArguments {
    return @(
        "--no-psqlrc",
        "--no-password",
        "--quiet",
        "--no-align",
        "--tuples-only",
        "--pset=footer=off",
        "--set=ON_ERROR_STOP=1",
        "--set=VERBOSITY=sqlstate",
        "--dbname=postgres"
    )
}

function Get-VaultWriteSql {
    return @'
\set ECHO none
\pset pager off
\pset footer off
\pset tuples_only on
\pset format unaligned
BEGIN;
SELECT pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('comment-translator-paid-v1-gate1-vault-binding', 0)) AS gate1_lock, true AS gate1_lock_acquired
\gset
SELECT (count(*) FILTER (WHERE name IN ('comment_translator_paid_maintenance_url','comment_translator_paid_cron_token')) = 0) AS gate1_absent
FROM vault.secrets
WHERE name IN ('comment_translator_paid_maintenance_url','comment_translator_paid_cron_token')
\gset
\if :gate1_absent
\else
DO $gate1_refusal$ BEGIN RAISE SQLSTATE 'PGT01'; END; $gate1_refusal$;
\endif
\getenv gate1_url GATE1_VAULT_MAINTENANCE_URL
\getenv gate1_token GATE1_VAULT_CRON_TOKEN
SELECT vault.create_secret($1, 'comment_translator_paid_maintenance_url') AS gate1_maintenance_secret_id,
       vault.create_secret($2, 'comment_translator_paid_cron_token') AS gate1_cron_secret_id
\bind :gate1_url :gate1_token \gset
\unset gate1_url
\unset gate1_token
\unset gate1_maintenance_secret_id
\unset gate1_cron_secret_id
SELECT count(*)::bigint AS gate1_required_count,
       count(DISTINCT name)::bigint AS gate1_distinct_count,
       count(id)::bigint AS gate1_encrypted_record_count,
       count(*) FILTER (WHERE secret IS NOT NULL)::bigint AS gate1_encrypted_non_null_count,
       (count(*) - count(DISTINCT name))::bigint AS gate1_duplicate_count,
       (count(*) = 2
        AND count(DISTINCT name) = 2
        AND count(id) = 2
        AND count(*) FILTER (WHERE secret IS NOT NULL) = 2
        AND count(*) - count(DISTINCT name) = 0) AS gate1_created
FROM vault.secrets
WHERE name IN ('comment_translator_paid_maintenance_url','comment_translator_paid_cron_token')
\gset
\if :gate1_created
COMMIT;
\else
DO $gate1_refusal$ BEGIN RAISE SQLSTATE 'PGT02'; END; $gate1_refusal$;
\endif
'@
}

function Get-PsqlVersionResult {
    param(
        [Parameter(Mandatory = $true)][string]$Executable,
        [Parameter(Mandatory = $true)][hashtable]$Environment
    )

    try {
        $result = Invoke-CapturedProcess -FilePath $Executable -Arguments @("--version") -Environment $Environment -StandardInput ""
    } catch {
        return [pscustomobject]@{ ok = $false; reason = "blocked-psql-unavailable"; version = $null }
    }
    if ($result.ExitCode -ne 0 -or $result.StdoutBytes -gt 4096 -or $result.StderrBytes -gt 4096) {
        return [pscustomobject]@{ ok = $false; reason = "blocked-psql-unavailable"; version = $null }
    }
    $versionText = ($result.Stdout + "`n" + $result.Stderr).Trim()
    if ($versionText -notmatch "(?i)\bPostgreSQL\)?\s+17(?:\.|\s|$)") {
        return [pscustomobject]@{ ok = $false; reason = "blocked-psql-version-invalid"; version = $null }
    }
    return [pscustomobject]@{ ok = $true; reason = $null; version = "postgresql-17" }
}

function Get-ValidatedRunContext {
    param(
        [AllowNull()][string]$RequestedTarget,
        [Parameter(Mandatory = $true)][bool]$RequireVaultValues,
        [bool]$ValidateConnection = $true
    )

    if (-not (Test-NonEmptyValue $RequestedTarget)) {
        return [pscustomobject]@{ ok = $false; reason = "blocked-target-missing"; binding = $null; environment = $null }
    }
    if ($RequestedTarget -cnotin @("preview", "production")) {
        return [pscustomobject]@{ ok = $false; reason = "blocked-target-invalid"; binding = $null; environment = $null }
    }
    if ($RequestedTarget -cne "production") {
        return [pscustomobject]@{ ok = $false; reason = "blocked-target-not-production"; binding = $null; environment = $null }
    }

    $rawBinding = Get-EnvironmentValue "GATE1_TARGET_BINDING_JSON"
    $bindingResult = Get-TargetBindingResult $rawBinding
    if (-not $bindingResult.ok) {
        $status = switch ($bindingResult.reason) {
            "TARGET_BINDING_MISSING" { "blocked-target-binding-absent"; break }
            default { "blocked-target-binding-invalid"; break }
        }
        return [pscustomobject]@{ ok = $false; reason = $status; binding = $null; environment = $null }
    }
    $binding = $bindingResult.binding
    if (-not (Test-TargetBindingDigest -Binding $binding -ExpectedDigest (Get-EnvironmentValue "GATE1_TARGET_BINDING_SHA256"))) {
        $expectedDigest = Get-EnvironmentValue "GATE1_TARGET_BINDING_SHA256"
        if (-not (Test-NonEmptyValue $expectedDigest)) {
            return [pscustomobject]@{ ok = $false; reason = "blocked-target-binding-absent"; binding = $null; environment = $null }
        }
        return [pscustomobject]@{ ok = $false; reason = "blocked-target-binding-digest-mismatch"; binding = $null; environment = $null }
    }
    if ([string]$binding.target -cne $RequestedTarget) {
        return [pscustomobject]@{ ok = $false; reason = "blocked-target-binding-mismatch"; binding = $null; environment = $null }
    }

    if ($RequireVaultValues -and ((-not (Test-NonEmptyValue (Get-EnvironmentValue "GATE1_VAULT_MAINTENANCE_URL"))) -or
        (-not (Test-NonEmptyValue (Get-EnvironmentValue "GATE1_VAULT_CRON_TOKEN"))))) {
        return [pscustomobject]@{ ok = $false; reason = "blocked-vault-input-absent"; binding = $null; environment = $null }
    }

    if (-not $ValidateConnection) {
        return [pscustomobject]@{ ok = $true; reason = $null; binding = $binding; environment = $null }
    }

    $connection = Get-ConnectionContext $binding
    if (-not $connection.ok) {
        $status = if ($connection.reason -eq "TLS_CONTEXT_INVALID") { "blocked-tls-context" } else { "blocked-connection-binding" }
        return [pscustomobject]@{ ok = $false; reason = $status; binding = $null; environment = $null }
    }
    return [pscustomobject]@{ ok = $true; reason = $null; binding = $binding; environment = $connection.environment }
}

function Invoke-VaultWrite {
    param(
        [Parameter(Mandatory = $true)][object]$Context,
        [Parameter(Mandatory = $true)][string]$RequestedPsqlPath
    )

    $executable = Get-ApplicationPath $RequestedPsqlPath
    if (-not (Test-NonEmptyValue $executable)) {
        return New-Result -Status "blocked-psql-unavailable"
    }
    $version = Get-PsqlVersionResult -Executable $executable -Environment $Context.environment
    if (-not $version.ok) {
        return New-Result -Status $version.reason
    }

    try {
        $result = Invoke-CapturedProcess -FilePath $executable -Arguments (Get-PsqlArguments) -Environment $Context.environment -StandardInput (Get-VaultWriteSql)
    } catch {
        return New-Result -Status "blocked-transaction-failed"
    }
    if ($result.ExitCode -ne 0) {
        return New-Result -Status "blocked-transaction-failed"
    }
    if ($result.StdoutBytes -gt $script:MaxCapturedOutputBytes -or $result.StderrBytes -gt $script:MaxCapturedOutputBytes -or
        $result.StdoutBytes -ne 0 -or $result.StderrBytes -ne 0) {
        return New-Result -Status "blocked-output-suppressed" -MutationCount 2 -CommittedRowCount 2
    }
    return New-Result -Status "written" -MutationCount 2 -CommittedRowCount 2
}

function Get-ApprovalStatus {
    $approval = Get-EnvironmentValue "GATE1_VAULT_WRITE_APPROVAL"
    if (-not (Test-NonEmptyValue $approval)) {
        return "blocked-approval-absent"
    }
    if ($approval -cne $script:VaultApprovalLabel) {
        return "blocked-approval-invalid"
    }
    return $null
}

function Invoke-Main {
    $approvalStatus = Get-ApprovalStatus
    if ($null -ne $approvalStatus) {
        return New-Result -Status $approvalStatus
    }
    if ($Mode -notin @("Preflight", "Write", "Contract")) {
        return New-Result -Status "blocked-mode-invalid"
    }
    if ($Mode -eq "Contract") {
        return New-Result -Status "contract-source-only"
    }

    if ($Mode -eq "Write") {
        $bindingContext = Get-ValidatedRunContext -RequestedTarget $Target -RequireVaultValues $false -ValidateConnection $false
        if (-not $bindingContext.ok) {
            return New-Result -Status $bindingContext.reason
        }
        return New-Result -Status "blocked-hosted-readiness-unverified"
    }

    $context = Get-ValidatedRunContext -RequestedTarget $Target -RequireVaultValues $true
    if (-not $context.ok) {
        return New-Result -Status $context.reason
    }
    if ($Mode -eq "Preflight") {
        return New-Result -Status "validated-no-run"
    }
    return Invoke-VaultWrite -Context $context -RequestedPsqlPath $PsqlPath
}

try {
    $result = Invoke-Main
    [Console]::WriteLine((ConvertTo-SafeJson $result))
    if ($result.status -eq "written") {
        exit 0
    }
    exit 2
} catch {
    [Console]::WriteLine((ConvertTo-SafeJson (New-Result -Status "blocked-runner-error")))
    exit 2
}
