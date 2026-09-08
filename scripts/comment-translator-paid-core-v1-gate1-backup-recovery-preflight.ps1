[CmdletBinding()]
param(
    [ValidateSet("DryRun", "ToolProbe", "Plan", "State", "Contract")]
    [string]$Mode = "DryRun",
    [string]$InputJson = ""
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$script:ExpectedSupabaseCliVersion = "2.109.0"
$script:BackupStates = @(
    "PRE_DDL_UNARMED",
    "ABORTED_NO_DDL_NO_PAUSE",
    "ARMED_BEFORE_FIRST_DDL",
    "SUCCESS_DISARMED",
    "PAUSE_REQUESTED",
    "PAUSE_CONFIRMED"
)
$script:RestoreOrder = @(
    "roles",
    "schema",
    "auth_storage_changes",
    "data",
    "history_schema",
    "history_data"
)
$script:SnapshotDumpNames = @(
    "schema",
    "data",
    "history_schema",
    "history_data"
)
$script:ApprovalTokens = @(
    "finalBackup",
    "boundedRpoWatchdog",
    "recoveryCostCapacity",
    "recoveryProjectProvisioning",
    "recoveryRegionExtensionsAuth",
    "pauseRequest",
    "confirmedInaccessibility",
    "restore",
    "endpointCredentialCutover",
    "clientReauthentication",
    "reopeningWrites",
    "sourceUnpauseDeletion"
)
$script:ReviewedFilterFlags = @("--schema", "--exclude-schema", "--exclude-table")
$script:NativePgDumpInsertFlagsPattern = '^(?i:--inserts|--column-inserts|--rows-per-insert)(?:=.*)?$'
$script:PostRestoreAssertions = @(
    "exact_history_count_and_digest",
    "aggregate_row_counts",
    "auth_dependencies_and_user_count",
    "storage_object_count_zero",
    "storage_vector_table_counts_zero",
    "grants_and_rls",
    "bridge_and_canonical_replay",
    "local_only_endpoint"
)
$script:RepoRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot ".."))
$script:WorkspaceRoot = [IO.Path]::GetFullPath((Join-Path $script:RepoRoot ".."))

function Get-InputValue {
    param(
        [AllowNull()][object]$Object,
        [Parameter(Mandatory = $true)][string]$Name,
        [AllowNull()][object]$Default = $null
    )

    if ($null -eq $Object) {
        return $Default
    }
    if ($Object -is [Collections.IDictionary]) {
        if ($Object.Contains($Name)) {
            return $Object[$Name]
        }
        return $Default
    }
    $property = $Object.PSObject.Properties[$Name]
    if ($null -eq $property) {
        return $Default
    }
    return $property.Value
}

function ConvertTo-CanonicalPath {
    param([Parameter(Mandatory = $true)][string]$Value)

    if ([string]::IsNullOrWhiteSpace($Value)) {
        throw "ARTIFACT_DIRECTORY_MISSING"
    }
    try {
        $full = [IO.Path]::GetFullPath($Value)
    } catch {
        throw "ARTIFACT_DIRECTORY_INVALID"
    }
    $root = [IO.Path]::GetPathRoot($full)
    while ($full.Length -gt $root.Length -and ($full.EndsWith("\") -or $full.EndsWith("/"))) {
        $full = $full.Substring(0, $full.Length - 1)
    }
    return $full
}

function Test-SameOrUnderPath {
    param(
        [Parameter(Mandatory = $true)][string]$Candidate,
        [Parameter(Mandatory = $true)][string]$Root
    )

    $candidateNormalized = $Candidate.Replace("/", "\").TrimEnd("\")
    $rootNormalized = $Root.Replace("/", "\").TrimEnd("\")
    if ($candidateNormalized.Equals($rootNormalized, [StringComparison]::OrdinalIgnoreCase)) {
        return $true
    }
    return $candidateNormalized.StartsWith(($rootNormalized + "\"), [StringComparison]::OrdinalIgnoreCase)
}

function Test-ReparseSafeDirectory {
    param([Parameter(Mandatory = $true)][string]$FullPath)

    $current = Get-Item -LiteralPath $FullPath -Force -ErrorAction Stop
    while ($null -ne $current) {
        if (($current.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0) {
            throw "ARTIFACT_DIRECTORY_REPARSE_ESCAPE"
        }
        $parent = $current.Parent
        if ($null -eq $parent -or $parent.FullName.Equals($current.FullName, [StringComparison]::OrdinalIgnoreCase)) {
            break
        }
        $current = $parent
    }
}

function Resolve-RestrictedArtifactDirectory {
    param([Parameter(Mandatory = $true)][string]$Value)

    $fullPath = ConvertTo-CanonicalPath $Value
    $repoRoot = ConvertTo-CanonicalPath $script:RepoRoot
    $homeRootValue = [Environment]::GetFolderPath([Environment+SpecialFolder]::UserProfile)
    $homeRoot = if ([string]::IsNullOrWhiteSpace($homeRootValue)) { "" } else { ConvertTo-CanonicalPath $homeRootValue }
    $driveRoot = [IO.Path]::GetPathRoot($fullPath)

    if (Test-SameOrUnderPath -Candidate $fullPath -Root $repoRoot) {
        throw "ARTIFACT_DIRECTORY_REPO_OR_WORKSPACE"
    }
    $workspaceRoot = ConvertTo-CanonicalPath $script:WorkspaceRoot
    if (Test-SameOrUnderPath -Candidate $fullPath -Root $workspaceRoot) {
        throw "ARTIFACT_DIRECTORY_REPO_OR_WORKSPACE"
    }
    if (-not [string]::IsNullOrWhiteSpace($homeRoot) -and $fullPath.Equals($homeRoot, [StringComparison]::OrdinalIgnoreCase)) {
        throw "ARTIFACT_DIRECTORY_HOME_ROOT"
    }
    if ($fullPath.Equals($driveRoot, [StringComparison]::OrdinalIgnoreCase)) {
        throw "ARTIFACT_DIRECTORY_DRIVE_ROOT"
    }
    if (-not (Test-Path -LiteralPath $fullPath -PathType Container)) {
        throw "ARTIFACT_DIRECTORY_MISSING"
    }

    Test-ReparseSafeDirectory $fullPath
    $entries = @(Get-ChildItem -LiteralPath $fullPath -Force -ErrorAction Stop)
    if ($entries.Count -ne 0) {
        throw "ARTIFACT_DIRECTORY_NONEMPTY"
    }

    return [ordered]@{
        status = "validated-empty-restricted-directory"
        leaf = [IO.Path]::GetFileName($fullPath)
        fullPath = $fullPath
    }
}

function Assert-SafeToken {
    param([Parameter(Mandatory = $true)][string]$Token)

    if ($Token -match '(?i)(postgres(?:ql)?://|https?://|--db-url(?:=|$)|--password(?:=|$)|^-[pP]$|password\s*[:=]|\$\(|\x60|;|\||&|>|<)') {
        throw "COMMAND_INPUT_SECRET_OR_SHELL_SYNTAX"
    }
}

function Resolve-ReviewedFilterArguments {
    param([Parameter(Mandatory = $true)][object]$InputObject, [ValidateSet("schema", "data")][string]$Artifact = "schema")

    $argumentsKey = if ($Artifact -eq "data") { "reviewedSupabaseDataFilterArgs" } else { "reviewedSupabaseFilterArgs" }
    $evidenceKey = if ($Artifact -eq "data") { "reviewedSupabaseDataFilterEvidence" } else { "reviewedSupabaseFilterEvidence" }
    $argumentsValue = Get-InputValue $InputObject $argumentsKey
    $evidence = Get-InputValue $InputObject $evidenceKey
    if ($null -eq $argumentsValue -or $null -eq $evidence) {
        throw "REVIEWED_FILTER_EVIDENCE_UNAVAILABLE"
    }
    if ((Get-InputValue $evidence "status") -ne "reviewed") {
        throw "REVIEWED_FILTER_EVIDENCE_UNAVAILABLE"
    }
    if ((Get-InputValue $evidence "cliVersion") -ne $script:ExpectedSupabaseCliVersion) {
        throw "REVIEWED_FILTER_CLI_VERSION_MISMATCH"
    }
    $source = [string](Get-InputValue $evidence "source")
    if ([string]::IsNullOrWhiteSpace($source)) {
        throw "REVIEWED_FILTER_EVIDENCE_UNAVAILABLE"
    }
    $helpDigest = [string](Get-InputValue $evidence "helpSha256")
    if ($helpDigest -notmatch "^[0-9a-fA-F]{64}$") {
        throw "REVIEWED_FILTER_EVIDENCE_UNAVAILABLE"
    }

    $arguments = @($argumentsValue | ForEach-Object { [string]$_ })
    $evidenceArgumentsValue = Get-InputValue $evidence "flags"
    if ($null -eq $evidenceArgumentsValue) {
        throw "REVIEWED_FILTER_EVIDENCE_UNAVAILABLE"
    }
    $evidenceArguments = @($evidenceArgumentsValue | ForEach-Object { [string]$_ })
    if ((ConvertTo-Json -InputObject $arguments -Compress -Depth 10) -ne (ConvertTo-Json -InputObject $evidenceArguments -Compress -Depth 10)) {
        throw "REVIEWED_FILTER_EVIDENCE_MISMATCH"
    }

    for ($index = 0; $index -lt $arguments.Count; $index++) {
        $token = $arguments[$index]
        Assert-SafeToken $token
        if ($token -notin $script:ReviewedFilterFlags) {
            throw "REVIEWED_FILTER_FLAG_UNSUPPORTED"
        }
        if (($index + 1) -ge $arguments.Count) {
            throw "REVIEWED_FILTER_VALUE_MISSING"
        }
        $value = $arguments[$index + 1]
        Assert-SafeToken $value
        if ($value.StartsWith("-", [StringComparison]::Ordinal)) {
            throw "REVIEWED_FILTER_VALUE_MISSING"
        }
        $index++
    }

    return $arguments
}

function Add-DataRestoreEnvelope {
    param([Parameter(Mandatory = $true)][AllowEmptyString()][string]$DumpText)

    if ([string]::IsNullOrWhiteSpace($DumpText) -or $DumpText.Contains([char]0)) {
        throw "DATA_DUMP_TEXT_INVALID"
    }
    # The native PG17 client understands restrict/unrestrict. Do not run line
    # substitutions through COPY rows or quoted values: preserve the dump text.
    # The caller still must verify producer provenance and restore eligibility.
    return "SET session_replication_role = replica;`n`n" + $DumpText + "`nRESET ALL;`n"
}

function Assert-NativePgDumpCopyArguments {
    param(
        [Parameter(Mandatory = $true)][object]$Arguments,
        [string]$FailureCode = "NATIVE_COPY_FORMAT_INVALID"
    )

    foreach ($argument in @($Arguments)) {
        if ([string]$argument -match $script:NativePgDumpInsertFlagsPattern) {
            throw $FailureCode
        }
    }
}

function Assert-ZeroEvidence {
    param(
        [Parameter(Mandatory = $true)][object]$InputObject,
        [Parameter(Mandatory = $true)][string]$Name,
        [Parameter(Mandatory = $true)][string]$CountName,
        [string]$AlternateCountName = ""
    )

    $evidence = Get-InputValue $InputObject $Name
    if ($null -eq $evidence) {
        throw ("{0}_EVIDENCE_UNAVAILABLE" -f $Name.ToUpperInvariant())
    }
    $countValue = Get-InputValue $evidence $CountName
    if ($null -eq $countValue -and -not [string]::IsNullOrWhiteSpace($AlternateCountName)) {
        $countValue = Get-InputValue $evidence $AlternateCountName
    }
    if ($null -eq $countValue) {
        throw ("{0}_COUNT_UNAVAILABLE" -f $Name.ToUpperInvariant())
    }
    try {
        $numeric = [decimal]$countValue
    } catch {
        throw ("{0}_COUNT_INVALID" -f $Name.ToUpperInvariant())
    }
    if ($numeric -ne 0) {
        throw ("{0}_NOT_ZERO" -f $Name.ToUpperInvariant())
    }
    return "pass-zero"
}

function Assert-AuthStorageDiffEvidence {
    param([Parameter(Mandatory = $true)][object]$InputObject)

    $evidence = Get-InputValue $InputObject "authStorageDiff"
    if ($null -eq $evidence) {
        throw "AUTH_STORAGE_DIFF_EVIDENCE_UNAVAILABLE"
    }
    $isEmpty = Get-InputValue $evidence "isEmpty"
    if ($isEmpty -isnot [bool]) {
        throw "AUTH_STORAGE_DIFF_STATE_INVALID"
    }
    if ($isEmpty) {
        return "empty"
    }

    if ((Get-InputValue $evidence "reviewed") -ne $true) {
        throw "AUTH_STORAGE_DIFF_REVIEW_UNAVAILABLE"
    }
    if ((Get-InputValue $evidence "filePresent") -ne $true) {
        throw "AUTH_STORAGE_DIFF_FILE_UNAVAILABLE"
    }
    if ((Get-InputValue $evidence "fileName") -ne "auth_storage_changes.sql") {
        throw "AUTH_STORAGE_DIFF_FILE_NAME_INVALID"
    }
    $digest = [string](Get-InputValue $evidence "sha256")
    if ($digest -notmatch "^[0-9a-fA-F]{64}$") {
        throw "AUTH_STORAGE_DIFF_DIGEST_INVALID"
    }
    return "reviewed-digest-present"
}

function New-CommandPlan {
    param(
        [Parameter(Mandatory = $true)][object]$ReviewedFilterArguments,
        [Parameter(Mandatory = $true)][object]$ReviewedDataFilterArguments,
        [string]$ArtifactDirectory = "",
        [string]$Snapshot = ""
    )

    if ([string]::IsNullOrWhiteSpace($ArtifactDirectory)) {
        throw "ARTIFACT_DIRECTORY_MISSING"
    }
    if ([string]::IsNullOrWhiteSpace($Snapshot)) {
        throw "SNAPSHOT_EVIDENCE_UNAVAILABLE"
    }
    Assert-SafeToken $Snapshot

    foreach ($table in @('storage.buckets_vectors', 'storage.vector_indexes')) {
        $vectorFilterMatches = 0
        for ($index = 0; $index -lt @($ReviewedDataFilterArguments).Count; $index++) {
            if ($ReviewedDataFilterArguments[$index] -ceq $table) {
                if ($index -eq 0 -or $ReviewedDataFilterArguments[$index - 1] -cne '--exclude-table') {
                    throw "VECTOR_EXCLUSION_FILTER_INVALID"
                }
                $vectorFilterMatches++
            }
        }
        if ($vectorFilterMatches -ne 1) { throw "VECTOR_EXCLUSION_FILTER_INVALID" }
    }

    $actualRolesPath = Join-Path $ArtifactDirectory "roles.sql"
    $actualSchemaPath = Join-Path $ArtifactDirectory "schema.sql"
    $actualAuthStoragePath = Join-Path $ArtifactDirectory "auth_storage_changes.sql"
    $actualDataPath = Join-Path $ArtifactDirectory "data.sql"
    $actualHistorySchemaPath = Join-Path $ArtifactDirectory "history_schema.sql"
    $actualHistoryDataPath = Join-Path $ArtifactDirectory "history_data.sql"
    $actualSupabase = @("db", "dump", "--linked", "--dry-run")
    $actualAuthStorageDiff = @("db", "diff", "--linked", "--schema", "auth,storage", "--file", $actualAuthStoragePath)
    $actualRoles = @("--roles-only", "--role=postgres", "--quote-all-identifiers", "--no-role-passwords", "--no-comments", "--no-password", "--file", $actualRolesPath)
    $actualSchema = @("--schema-only", "--role=postgres", "--quote-all-identifiers", "--no-password", "--snapshot", $Snapshot, "--file", $actualSchemaPath) + @($ReviewedFilterArguments)
    $actualData = @("--data-only", "--role=postgres", "--quote-all-identifiers", "--no-password", "--snapshot", $Snapshot, "--file", $actualDataPath) + @($ReviewedDataFilterArguments)
    $actualHistorySchema = @("--schema-only", "--role=postgres", "--quote-all-identifiers", "--no-password", "--schema=supabase_migrations", "--snapshot", $Snapshot, "--file", $actualHistorySchemaPath)
    $actualHistoryData = @("--data-only", "--role=postgres", "--quote-all-identifiers", "--no-password", "--schema=supabase_migrations", "--snapshot", $Snapshot, "--file", $actualHistoryDataPath)
    foreach ($nativeArguments in @($actualSchema, $actualData, $actualHistorySchema, $actualHistoryData)) {
        Assert-NativePgDumpCopyArguments $nativeArguments
    }
    $actualRestore = @(
        @("--no-psqlrc", "--set=ON_ERROR_STOP=1", "--single-transaction", "--file", $actualRolesPath),
        @("--no-psqlrc", "--set=ON_ERROR_STOP=1", "--single-transaction", "--file", $actualSchemaPath),
        @("--no-psqlrc", "--set=ON_ERROR_STOP=1", "--single-transaction", "--file", $actualAuthStoragePath),
        @("--no-psqlrc", "--set=ON_ERROR_STOP=1", "--single-transaction", "--file", $actualDataPath),
        @("--no-psqlrc", "--set=ON_ERROR_STOP=1", "--single-transaction", "--file", $actualHistorySchemaPath),
        @("--no-psqlrc", "--set=ON_ERROR_STOP=1", "--single-transaction", "--file", $actualHistoryDataPath)
    )
    if ($actualRestore.Count -ne $script:RestoreOrder.Count) {
        throw "RESTORE_ORDER_INVALID"
    }

    # The actual arrays above are intentionally discarded before output. The
    # returned projection keeps caller paths, snapshot identifiers, and any
    # connection context out of sanitized evidence.
    $snapshot = "[snapshot]"
    $restricted = "[restricted]"
    $supabase = @("db", "dump", "--linked", "--dry-run")
    $authStorageDiff = @("db", "diff", "--linked", "--schema", "auth,storage", "--file", "$restricted/auth_storage_changes.sql")
    $roles = @("--roles-only", "--role=postgres", "--quote-all-identifiers", "--no-role-passwords", "--no-comments", "--no-password", "--file", "$restricted/roles.sql")
    $schema = @("--schema-only", "--role=postgres", "--quote-all-identifiers", "--no-password", "--snapshot", $snapshot, "--file", "$restricted/schema.sql") + @($ReviewedFilterArguments)
    $data = @("--data-only", "--role=postgres", "--quote-all-identifiers", "--no-password", "--snapshot", $snapshot, "--file", "$restricted/data.sql") + @($ReviewedDataFilterArguments)
    $historySchema = @("--schema-only", "--role=postgres", "--quote-all-identifiers", "--no-password", "--schema=supabase_migrations", "--snapshot", $snapshot, "--file", "$restricted/history_schema.sql")
    $historyData = @("--data-only", "--role=postgres", "--quote-all-identifiers", "--no-password", "--schema=supabase_migrations", "--snapshot", $snapshot, "--file", "$restricted/history_data.sql")

    $restoreRoles = @("--no-psqlrc", "--set=ON_ERROR_STOP=1", "--single-transaction", "--file", "$restricted/roles.sql")
    $restoreSchema = @("--no-psqlrc", "--set=ON_ERROR_STOP=1", "--single-transaction", "--file", "$restricted/schema.sql")
    $restoreAuthStorage = @("--no-psqlrc", "--set=ON_ERROR_STOP=1", "--single-transaction", "--file", "$restricted/auth_storage_changes.sql")
    $restoreData = @("--no-psqlrc", "--set=ON_ERROR_STOP=1", "--single-transaction", "--file", "$restricted/data.sql")
    $restoreHistorySchema = @("--no-psqlrc", "--set=ON_ERROR_STOP=1", "--single-transaction", "--file", "$restricted/history_schema.sql")
    $restoreHistoryData = @("--no-psqlrc", "--set=ON_ERROR_STOP=1", "--single-transaction", "--file", "$restricted/history_data.sql")
    $restore = [System.Collections.Generic.List[object]]::new()
    [void]$restore.Add($restoreRoles)
    [void]$restore.Add($restoreSchema)
    [void]$restore.Add($restoreAuthStorage)
    [void]$restore.Add($restoreData)
    [void]$restore.Add($restoreHistorySchema)
    [void]$restore.Add($restoreHistoryData)

    return [ordered]@{
        supabase = $supabase
        authStorageDiff = $authStorageDiff
        roles = $roles
        schema = $schema
        data = $data
        historySchema = $historySchema
        historyData = $historyData
        restoreRoles = $restoreRoles
        restoreSchema = $restoreSchema
        restoreAuthStorage = $restoreAuthStorage
        restoreData = $restoreData
        restoreHistorySchema = $restoreHistorySchema
        restoreHistoryData = $restoreHistoryData
        restore = @($restore.ToArray())
    }
}

function Assert-CommandPlanShape {
    param([Parameter(Mandatory = $true)][object]$Plan)

    if (($Plan.supabase -join " ") -ne "db dump --linked --dry-run") {
        throw "DISCOVERY_ARRAY_INVALID"
    }
    if (($Plan.roles -join " ") -ne "--roles-only --role=postgres --quote-all-identifiers --no-role-passwords --no-comments --no-password --file [restricted]/roles.sql") {
        throw "ROLES_ARRAY_INVALID"
    }
    foreach ($table in @('storage.buckets_vectors', 'storage.vector_indexes')) {
        $index = [array]::IndexOf(@($Plan.data), $table)
        if (@($Plan.data | Where-Object { $_ -ceq $table }).Count -ne 1 -or
            $index -lt 1 -or $Plan.data[$index - 1] -cne '--exclude-table') {
            throw "VECTOR_EXCLUSION_FILTER_INVALID"
        }
    }
    foreach ($name in @("schema", "data", "historySchema", "historyData")) {
        Assert-NativePgDumpCopyArguments @($Plan[$name])
    }
    foreach ($name in @("schema", "data", "historySchema", "historyData")) {
        $array = @($Plan[$name])
        foreach ($required in @("--role=postgres", "--quote-all-identifiers", "--no-password")) {
            if (@($array | Where-Object { $_ -eq $required }).Count -ne 1) {
                throw "NATIVE_PRODUCER_ARGUMENT_INVALID"
            }
        }
        $snapshotIndexes = @($array | Where-Object { $_ -eq "--snapshot" }).Count
        if ($snapshotIndexes -ne 1 -or @($array | Where-Object { $_ -eq "[snapshot]" }).Count -ne 1) {
            throw "SNAPSHOT_ARGUMENT_INVALID"
        }
    }
    $restore = @($Plan.restore)
    if ($restore.Count -ne 6) {
        throw "RESTORE_ORDER_INVALID"
    }
    $expectedFiles = @("roles.sql", "schema.sql", "auth_storage_changes.sql", "data.sql", "history_schema.sql", "history_data.sql")
    for ($index = 0; $index -lt $expectedFiles.Count; $index++) {
        $restoreFile = @($restore[$index])
        if ($restoreFile.Count -ne 5 -or $restoreFile[0] -ne "--no-psqlrc" -or $restoreFile[1] -ne "--set=ON_ERROR_STOP=1" -or $restoreFile[2] -ne "--single-transaction" -or $restoreFile[3] -ne "--file" -or $restoreFile[4] -ne ("[restricted]/" + $expectedFiles[$index])) {
            throw "RESTORE_ORDER_INVALID"
        }
    }
}

function New-SnapshotTransactionModel {
    return [ordered]@{
        begin = "BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY;"
        export = "SET LOCAL row_security = off; SELECT transaction_timestamp(), pg_export_snapshot(), (SELECT count(*) FROM storage.buckets_vectors), (SELECT count(*) FROM storage.vector_indexes);"
        vector_exclusion_requirement = "both-existing-empty-in-exported-snapshot"
        held_until = "after_all_four_snapshot_dumps_exit_zero"
        commit_condition = "all_four_snapshot_bound_dumps_exit_zero"
        failure_action = "rollback_and_never_accept"
        snapshot_dumps = @($script:SnapshotDumpNames)
        roles_outside_snapshot = $true
        linked_discovery_spawned = 0
    }
}

function New-PlanResult {
    param(
        [Parameter(Mandatory = $true)][object]$InputObject,
        [Parameter(Mandatory = $true)][object]$ArtifactInfo,
        [Parameter(Mandatory = $true)][string]$ArtifactDirectory,
        [Parameter(Mandatory = $true)][string]$VaultStatus,
        [Parameter(Mandatory = $true)][string]$StorageStatus,
        [Parameter(Mandatory = $true)][string]$AuthStorageStatus,
        [Parameter(Mandatory = $true)][object]$ReviewedFilterArguments,
        [Parameter(Mandatory = $true)][object]$ReviewedDataFilterArguments
    )

    $snapshot = [string](Get-InputValue $InputObject "snapshot")
    if ([string]::IsNullOrWhiteSpace($snapshot)) {
        throw "SNAPSHOT_EVIDENCE_UNAVAILABLE"
    }
    $commands = New-CommandPlan -ReviewedFilterArguments $ReviewedFilterArguments -ReviewedDataFilterArguments $ReviewedDataFilterArguments -ArtifactDirectory $ArtifactDirectory -Snapshot $snapshot
    Assert-CommandPlanShape $commands
    $t0 = [string](Get-InputValue $InputObject "t0")
    if ([string]::IsNullOrWhiteSpace($t0)) {
        throw "T0_EVIDENCE_UNAVAILABLE"
    }

    return [ordered]@{
        status = "blocked"
        state = "PRE_DDL_UNARMED"
        decision = "NO-GO"
        blocked_reasons = @("TOOL_READINESS_UNVERIFIED", "SOURCE_ONLY_NO_OPERATION_EXECUTED")
        mutation_status = "not-run"
        mutation_count = 0
        remote_call_count = 0
        operational_subprocess_count = 0
        tool_readiness = "unverified"
        artifact_status = $ArtifactInfo.status
        vault_status = $VaultStatus
        storage_status = $StorageStatus
        auth_storage_diff_status = $AuthStorageStatus
        t0_status = "supplied-not-acquired"
        snapshot_status = "not-acquired"
        sha256_algorithm = "SHA-256"
        sha256_status = "not-run"
        sha256_checks = @("roles.sql", "schema.sql", "auth_storage_changes.sql", "data.sql", "history_schema.sql", "history_data.sql")
        post_restore_assertions = @($script:PostRestoreAssertions)
        restore_order = @($script:RestoreOrder)
        snapshot_dump_names = @($script:SnapshotDumpNames)
        snapshot_dump_count = 4
        approval_tokens_required = @($script:ApprovalTokens)
        restore_executor = "psql-plain-sql"
        pg_restore_status = "version-check-only"
        commands = $commands
        snapshot_transaction = New-SnapshotTransactionModel
        connection_material = "environment-only"
        source_only = $true
        legacy_md5_project_identity = $false
        supplied_t0 = if ([string]::IsNullOrWhiteSpace($t0)) { "missing" } else { "present-not-printed" }
        supplied_snapshot = "present-not-printed"
    }
}

function Get-ApplicationPath {
    param([Parameter(Mandatory = $true)][string]$Name)

    $command = Get-Command -Name $Name -CommandType Application -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($null -eq $command) {
        return $null
    }
    if (-not [string]::IsNullOrWhiteSpace([string]$command.Source)) {
        return [string]$command.Source
    }
    return [string]$command.Path
}

function Invoke-ReadOnlyProbe {
    param(
        [Parameter(Mandatory = $true)][string]$Executable,
        [Parameter(Mandatory = $true)][string[]]$Arguments
    )

    $startInfo = [Diagnostics.ProcessStartInfo]::new()
    $startInfo.FileName = $Executable
    $startInfo.UseShellExecute = $false
    $startInfo.CreateNoWindow = $true
    $startInfo.RedirectStandardOutput = $true
    $startInfo.RedirectStandardError = $true
    foreach ($argument in $Arguments) {
        [void]$startInfo.ArgumentList.Add($argument)
    }
    $process = [Diagnostics.Process]::new()
    $process.StartInfo = $startInfo
    try {
        if (-not $process.Start()) {
            throw "PROBE_START_FAILED"
        }
        $stdout = $process.StandardOutput.ReadToEnd()
        $stderr = $process.StandardError.ReadToEnd()
        $process.WaitForExit()
        return [ordered]@{
            exitCode = $process.ExitCode
            stdout = [string]$stdout
            stderr = [string]$stderr
        }
    } finally {
        $process.Dispose()
    }
}

function Get-HelpFlags {
    param([Parameter(Mandatory = $true)][string]$Text)

    $matches = [regex]::Matches($Text, "(?m)^\s+(--[a-z][a-z0-9-]*)")
    return @($matches | ForEach-Object { $_.Groups[1].Value } | Sort-Object -Unique)
}

function Get-LocalSupabaseInfo {
    $launcherCandidates = @(
        (Join-Path $script:RepoRoot "node_modules/.bin/supabase.cmd"),
        (Join-Path $script:RepoRoot "node_modules/.bin/supabase.exe")
    )
    $launcher = $launcherCandidates | Where-Object { Test-Path -LiteralPath $_ -PathType Leaf } | Select-Object -First 1
    $entryPoint = Join-Path $script:RepoRoot "node_modules/supabase/dist/supabase.js"
    $nodePath = Get-ApplicationPath "node"
    if ($null -eq $launcher -or -not (Test-Path -LiteralPath $entryPoint -PathType Leaf) -or $null -eq $nodePath) {
        return $null
    }
    return [ordered]@{
        launcher = [string]$launcher
        entryPoint = $entryPoint
        node = $nodePath
    }
}

function Get-OverrideStatus {
    param(
        [AllowNull()][object]$Overrides,
        [Parameter(Mandatory = $true)][string]$Name
    )

    if ($null -eq $Overrides) {
        return $null
    }
    $property = $Overrides.PSObject.Properties[$Name]
    if ($null -eq $property) {
        return $null
    }
    if ($null -eq $property.Value) {
        return [ordered]@{ status = "missing" }
    }
    $value = $property.Value
    if ($value -is [string]) {
        return [ordered]@{ status = [string]$value }
    }
    $status = [string](Get-InputValue $value "status")
    if ([string]::IsNullOrWhiteSpace($status)) {
        return [ordered]@{ status = "invalid-override" }
    }
    return [ordered]@{ status = $status }
}

function Get-VersionStatus {
    param(
        [Parameter(Mandatory = $true)][string]$Name,
        [AllowNull()][object]$Overrides,
        [string[]]$Arguments = @("--version"),
        [int]$RequiredMajor = 0,
        [string]$OverrideName = ""
    )

    $lookupName = if ([string]::IsNullOrWhiteSpace($OverrideName)) { $Name } else { $OverrideName }
    $override = Get-OverrideStatus $Overrides $lookupName
    if ($null -ne $override) {
        return $override
    }
    $path = Get-ApplicationPath $Name
    if ($null -eq $path) {
        return [ordered]@{ status = "missing" }
    }
    $probe = Invoke-ReadOnlyProbe -Executable $path -Arguments $Arguments
    $text = (([string]$probe.stdout) + " " + ([string]$probe.stderr)).Trim()
    if ($probe.exitCode -ne 0) {
        return [ordered]@{ status = "probe-failed" }
    }
    if ($RequiredMajor -gt 0) {
        $pattern = '^' + [regex]::Escape($Name) + '\s+\(PostgreSQL\)\s+(\d+)\.\d+(?:\s+\([^()\r\n]+\))?$'
        $match = [regex]::Match($text, $pattern)
        if (-not $match.Success) {
            return [ordered]@{ status = "version-unparsed" }
        }
        $major = [int]$match.Groups[1].Value
        if ($major -ne $RequiredMajor) {
            return [ordered]@{ status = "wrong-major"; major = $major }
        }
        return [ordered]@{ status = "pass"; major = $major }
    }
    return [ordered]@{ status = "pass" }
}

function Get-SupabaseProbeStatus {
    param([AllowNull()][object]$Overrides)

    $override = Get-OverrideStatus $Overrides "supabase"
    if ($null -ne $override) {
        return $override
    }
    $info = Get-LocalSupabaseInfo
    if ($null -eq $info) {
        return [ordered]@{ status = "missing" }
    }

    $versionProbe = Invoke-ReadOnlyProbe -Executable $info.node -Arguments @($info.entryPoint, "--version")
    $versionText = (([string]$versionProbe.stdout) + " " + ([string]$versionProbe.stderr)).Trim()
    if ($versionProbe.exitCode -ne 0) {
        return [ordered]@{ status = "version-probe-failed" }
    }
    $versionMatch = [regex]::Match($versionText, "(?<!\d)\d+\.\d+\.\d+(?!\d)")
    if (-not $versionMatch.Success -or $versionMatch.Value -ne $script:ExpectedSupabaseCliVersion) {
        return [ordered]@{ status = "wrong-version" }
    }

    $dumpHelp = Invoke-ReadOnlyProbe -Executable $info.node -Arguments @($info.entryPoint, "db", "dump", "--help")
    $diffHelp = Invoke-ReadOnlyProbe -Executable $info.node -Arguments @($info.entryPoint, "db", "diff", "--help")
    if ($dumpHelp.exitCode -ne 0 -or $diffHelp.exitCode -ne 0) {
        return [ordered]@{ status = "help-probe-failed" }
    }
    $dumpFlags = Get-HelpFlags (([string]$dumpHelp.stdout) + "`n" + ([string]$dumpHelp.stderr))
    $diffFlags = Get-HelpFlags (([string]$diffHelp.stdout) + "`n" + ([string]$diffHelp.stderr))
    $requiredDumpFlags = @("--dry-run", "--data-only", "--use-copy", "--role-only", "--file", "--linked", "--schema")
    $requiredDiffFlags = @("--linked", "--file", "--schema")
    $missingDumpFlags = @($requiredDumpFlags | Where-Object { $_ -notin $dumpFlags })
    $missingDiffFlags = @($requiredDiffFlags | Where-Object { $_ -notin $diffFlags })
    if ($missingDumpFlags.Count -ne 0 -or $missingDiffFlags.Count -ne 0 -or "--snapshot" -in $dumpFlags -or "--snapshot" -in $diffFlags) {
        return [ordered]@{
            status = "help-flags-unavailable"
            dump_relevant_flags = @($dumpFlags | Where-Object { $_ -in $requiredDumpFlags })
            diff_relevant_flags = @($diffFlags | Where-Object { $_ -in $requiredDiffFlags })
        }
    }
    return [ordered]@{
        status = "pass"
        version = $script:ExpectedSupabaseCliVersion
        dump_relevant_flags = @($dumpFlags | Where-Object { $_ -in $requiredDumpFlags })
        diff_relevant_flags = @($diffFlags | Where-Object { $_ -in $requiredDiffFlags })
        linked_discovery_spawned = 0
    }
}

function Get-ToolProbeResult {
    param([Parameter(Mandatory = $true)][object]$InputObject)

    # Overrides are never operational readiness evidence, including null/partial input.
    if (($InputObject -is [Collections.IDictionary] -and $InputObject.Contains('toolOverrides')) -or
        ($null -ne $InputObject.PSObject.Properties['toolOverrides'])) {
        return [ordered]@{
            status = "blocked"
            reason = "TOOL_OVERRIDES_FORBIDDEN"
            mutation_status = "not-run"
            mutation_count = 0
            linked_discovery_spawned = 0
            operational_subprocess_count = 0
        }
    }
    $overrides = Get-InputValue $InputObject "toolOverrides"
    $supabase = Get-SupabaseProbeStatus $overrides
    $docker = Get-VersionStatus -Name "docker" -Overrides $overrides
    $psql = Get-VersionStatus -Name "psql" -Overrides $overrides -RequiredMajor 17
    $pgDump = Get-VersionStatus -Name "pg_dump" -OverrideName "pgDump" -Overrides $overrides -RequiredMajor 17
    $pgDumpAll = Get-VersionStatus -Name "pg_dumpall" -OverrideName "pgDumpAll" -Overrides $overrides -RequiredMajor 17
    $pgRestore = Get-VersionStatus -Name "pg_restore" -OverrideName "pgRestore" -Overrides $overrides -RequiredMajor 17
    $statuses = [ordered]@{
        supabase = $supabase
        docker = $docker
        psql = $psql
        pg_dump = $pgDump
        pg_dumpall = $pgDumpAll
        pg_restore = $pgRestore
    }
    $allPass = @($statuses.Values | Where-Object { (Get-InputValue $_ "status") -ne "pass" }).Count -eq 0
    return [ordered]@{
        status = if ($allPass) { "pass" } else { "blocked" }
        cli_version_required = $script:ExpectedSupabaseCliVersion
        postgres_major_required = 17
        tools = $statuses
        mutation_status = "not-run"
        mutation_count = 0
        linked_discovery_spawned = 0
        operational_subprocess_count = 0
        raw_output = "not-retained"
    }
}

function Get-DateTimeOffsetOrNull {
    param([AllowNull()][object]$Value)

    if ($null -eq $Value -or [string]::IsNullOrWhiteSpace([string]$Value)) {
        return $null
    }
    $text = [string]$Value
    if ($text -notmatch "(?:Z|[+-]\d{2}:\d{2})$") {
        return $null
    }
    try {
        return [DateTimeOffset]::Parse($text, [Globalization.CultureInfo]::InvariantCulture, [Globalization.DateTimeStyles]::None).ToUniversalTime()
    } catch {
        return $null
    }
}

function Get-ApprovalValue {
    param(
        [AllowNull()][object]$Approvals,
        [Parameter(Mandatory = $true)][string]$Name
    )
    return ((Get-InputValue $Approvals $Name) -eq $true)
}

function Get-WatchdogResult {
    param([Parameter(Mandatory = $true)][object]$InputObject)

    $result = [ordered]@{
        state = "PRE_DDL_UNARMED"
        decision = "NO-GO"
        reason = "T0_OR_FINAL_BACKUP_EVIDENCE_UNAVAILABLE"
        restore_eligible = $false
        mutation_status = "not-run"
        mutation_count = 0
        remote_call_count = 0
        operational_subprocess_count = 0
    }
    $t0 = Get-DateTimeOffsetOrNull (Get-InputValue $InputObject "t0")
    if ($null -eq $t0) {
        return $result
    }
    $now = Get-DateTimeOffsetOrNull (Get-InputValue $InputObject "now")
    if ($null -eq $now -or $now -lt $t0) {
        $result.reason = "NOW_TIMESTAMP_INVALID"
        return $result
    }
    $backupCompleted = Get-DateTimeOffsetOrNull (Get-InputValue $InputObject "backupCompletedAt")
    $checksumsCompleted = Get-DateTimeOffsetOrNull (Get-InputValue $InputObject "checksumsCompletedAt")
    $backupSucceeded = (Get-InputValue $InputObject "backupSucceeded") -eq $true
    $approvals = Get-InputValue $InputObject "approvals"
    $deadline5 = $t0.AddMinutes(5)
    $deadline10 = $t0.AddMinutes(10)
    $deadline20 = $t0.AddMinutes(20)

    if (-not $backupSucceeded -or $null -eq $backupCompleted -or $null -eq $checksumsCompleted) {
        if ($now -gt $deadline5) {
            $result.state = "ABORTED_NO_DDL_NO_PAUSE"
            $result.reason = "FINAL_BACKUP_OR_CHECKSUM_LATE"
        }
        return $result
    }
    if ($backupCompleted -lt $t0 -or $checksumsCompleted -lt $t0 -or
        $backupCompleted -gt $now -or $checksumsCompleted -gt $now) {
        $result.reason = "BACKUP_TIMESTAMP_INVALID"
        return $result
    }
    if ($backupCompleted -gt $deadline5 -or $checksumsCompleted -gt $deadline5) {
        $result.state = "ABORTED_NO_DDL_NO_PAUSE"
        $result.reason = "FINAL_BACKUP_OR_CHECKSUM_LATE"
        return $result
    }
    if (-not (Get-ApprovalValue $approvals "finalBackup") -or -not (Get-ApprovalValue $approvals "boundedRpoWatchdog")) {
        $result.reason = "FINAL_BACKUP_OR_WATCHDOG_APPROVAL_UNAVAILABLE"
        return $result
    }

    $migrationSucceeded = (Get-InputValue $InputObject "migrationSucceeded") -eq $true
    $decisiveReadbackSucceeded = (Get-InputValue $InputObject "decisiveReadbackSucceeded") -eq $true
    # Callers carry the prior pause state forward; pause cannot be disarmed by late success.
    $previousState = [string](Get-InputValue $InputObject "previousState")
    $pauseLatched = $previousState -in @("PAUSE_STARTED", "PAUSE_REQUESTED", "PAUSE_CONFIRMED") -or
        $null -ne (Get-InputValue $InputObject "pauseStartedAt") -or
        $null -ne (Get-InputValue $InputObject "pauseRequestedAt") -or
        $null -ne (Get-InputValue $InputObject "pauseConfirmedAt") -or
        (Get-InputValue $InputObject "failure") -eq $true
    $migrationCompleted = Get-DateTimeOffsetOrNull (Get-InputValue $InputObject "migrationCompletedAt")
    $readbackCompleted = Get-DateTimeOffsetOrNull (Get-InputValue $InputObject "decisiveReadbackCompletedAt")
    $migrationTimeValid = -not $migrationSucceeded -or ($null -ne $migrationCompleted -and
        $migrationCompleted -ge $backupCompleted -and $migrationCompleted -ge $checksumsCompleted -and
        $migrationCompleted -le $now)
    $readbackTimeValid = -not $decisiveReadbackSucceeded -or ($migrationSucceeded -and $migrationTimeValid -and
        $null -ne $readbackCompleted -and $readbackCompleted -ge $migrationCompleted -and $readbackCompleted -le $now)
    $successTimesValid = $migrationTimeValid -and $readbackTimeValid
    if (-not $pauseLatched -and $migrationSucceeded -and $decisiveReadbackSucceeded -and $successTimesValid -and
        $migrationCompleted -lt $deadline10 -and $readbackCompleted -lt $deadline10) {
        $result.state = "SUCCESS_DISARMED"
        $result.reason = "SUCCESS_READBACK_DISARMED"
        return $result
    }

    if (($now -ge $deadline10) -or $pauseLatched) {
        $result.state = "PAUSE_REQUESTED"
        $result.reason = "PAUSE_REQUIRED_NO_SUCCESS"
    } else {
        if (($migrationSucceeded -or $decisiveReadbackSucceeded) -and -not $successTimesValid) {
            $result.reason = "SUCCESS_TIMESTAMP_INVALID"
            return $result
        }
        $result.state = "ARMED_BEFORE_FIRST_DDL"
        $result.reason = "FINAL_BACKUP_COMPLETE_WITHIN_FIVE_MINUTES"
        return $result
    }

    $pauseConfirmedAt = Get-DateTimeOffsetOrNull (Get-InputValue $InputObject "pauseConfirmedAt")
    $sourceStatus = [string](Get-InputValue $InputObject "sourceStatus")
    $boundFingerprint = [string](Get-InputValue $InputObject "sourceProjectFingerprint")
    $confirmedFingerprint = [string](Get-InputValue $InputObject "confirmedSourceProjectFingerprint")
    $exactTarget = -not [string]::IsNullOrWhiteSpace($boundFingerprint) -and
        $boundFingerprint.Equals($confirmedFingerprint, [StringComparison]::Ordinal)
    $pauseApprovals = (Get-ApprovalValue $approvals "pauseRequest") -and
        (Get-ApprovalValue $approvals "confirmedInaccessibility")
    $restoreApprovals = (Get-ApprovalValue $approvals "restore") -and
        (Get-ApprovalValue $approvals "recoveryCostCapacity") -and
        (Get-ApprovalValue $approvals "recoveryProjectProvisioning") -and
        (Get-ApprovalValue $approvals "recoveryRegionExtensionsAuth")
    if ($null -ne $pauseConfirmedAt -and $pauseConfirmedAt -ge $t0 -and $pauseConfirmedAt -le $deadline20 -and $now -ge $pauseConfirmedAt -and
        $sourceStatus.Equals("inaccessible", [StringComparison]::OrdinalIgnoreCase) -and $exactTarget -and
        $pauseApprovals) {
        $result.state = "PAUSE_CONFIRMED"
        $result.reason = "EXACT_SOURCE_INACCESSIBILITY_CONFIRMED_BY_DEADLINE"
        if ($restoreApprovals) {
            $result.restore_eligible = $true
            $result.reason = "RESTORE_ELIGIBLE_SYNTHETIC_ONLY"
        } else {
            $result.reason = "RESTORE_APPROVALS_UNAVAILABLE"
        }
    } elseif ($null -ne $pauseConfirmedAt -and ($pauseConfirmedAt -lt $t0 -or $pauseConfirmedAt -gt $deadline20)) {
        $result.reason = "SOURCE_INACCESSIBILITY_CONFIRMED_LATE"
    } elseif (-not $exactTarget -and -not [string]::IsNullOrWhiteSpace($confirmedFingerprint)) {
        $result.reason = "SOURCE_INACCESSIBILITY_WRONG_TARGET"
    } else {
        $result.reason = "SOURCE_INACCESSIBILITY_NOT_CONFIRMED"
    }
    return $result
}

function Assert-Contract {
    function Assert-ContractEqual {
        param([AllowNull()][object]$Actual, [AllowNull()][object]$Expected, [Parameter(Mandatory = $true)][string]$Code)
        if ((ConvertTo-Json -InputObject $Actual -Compress -Depth 20) -ne (ConvertTo-Json -InputObject $Expected -Compress -Depth 20)) {
            throw $Code
        }
    }
    function Assert-ContractBlocked {
        param(
            [Parameter(Mandatory = $true)][scriptblock]$Action,
            [Parameter(Mandatory = $true)][string]$ExpectedCode,
            [Parameter(Mandatory = $true)][string]$FailureCode
        )
        $exception = $null
        try {
            & $Action | Out-Null
        } catch {
            $exception = $_.Exception
        }
        if ($null -eq $exception) {
            throw $FailureCode
        }
        if ($exception.Message -ne $ExpectedCode) {
            throw $FailureCode
        }
    }

    Assert-ContractEqual $script:BackupStates @(
        "PRE_DDL_UNARMED",
        "ABORTED_NO_DDL_NO_PAUSE",
        "ARMED_BEFORE_FIRST_DDL",
        "SUCCESS_DISARMED",
        "PAUSE_REQUESTED",
        "PAUSE_CONFIRMED"
    ) "BACKUP_STATES_INVALID"
    Assert-ContractEqual $script:RestoreOrder @(
        "roles",
        "schema",
        "auth_storage_changes",
        "data",
        "history_schema",
        "history_data"
    ) "RESTORE_ORDER_INVALID"
    Assert-ContractEqual $script:SnapshotDumpNames @("schema", "data", "history_schema", "history_data") "SNAPSHOT_DUMPS_INVALID"

    $plan = New-CommandPlan -ReviewedFilterArguments @("--schema", "public") -ReviewedDataFilterArguments @("--exclude-table", "storage.buckets_vectors", "--exclude-table", "storage.vector_indexes", "--schema", "*") -ArtifactDirectory ([IO.Path]::GetTempPath()) -Snapshot "synthetic-snapshot-token"
    if ($plan.supabase -join " " -ne "db dump --linked --dry-run") { throw "DISCOVERY_ARRAY_INVALID" }
    if ($plan.authStorageDiff[0] -ne "db" -or $plan.authStorageDiff[1] -ne "diff" -or $plan.authStorageDiff[2] -ne "--linked") { throw "AUTH_STORAGE_ARRAY_INVALID" }
    if ($plan.roles -join " " -ne "--roles-only --role=postgres --quote-all-identifiers --no-role-passwords --no-comments --no-password --file [restricted]/roles.sql") { throw "ROLES_ARRAY_INVALID" }
    foreach ($name in @("schema", "data", "historySchema", "historyData")) {
        $array = @($plan[$name])
        if ("--snapshot" -notin $array -or "[snapshot]" -notin $array) { throw "SNAPSHOT_ARGUMENT_INVALID" }
    }
    if (@($plan.restore).Count -ne 6) { throw "RESTORE_ARRAY_COUNT_INVALID" }
    if (@($plan.restore[0]) -join " " -ne "--no-psqlrc --set=ON_ERROR_STOP=1 --single-transaction --file [restricted]/roles.sql") { throw "RESTORE_FIRST_ARRAY_INVALID" }
    $transaction = New-SnapshotTransactionModel
    if ($transaction.held_until -ne "after_all_four_snapshot_dumps_exit_zero" -or $transaction.roles_outside_snapshot -ne $true) { throw "SNAPSHOT_TRANSACTION_INVALID" }
    Assert-CommandPlanShape $plan
    $badSnapshotPlan = [ordered]@{}
    foreach ($key in $plan.Keys) { $badSnapshotPlan[$key] = $plan[$key] }
    $badSnapshotPlan.schema = @($plan.schema | Where-Object { $_ -ne "[snapshot]" })
    $shapeBlocked = $false
    try {
        Assert-CommandPlanShape $badSnapshotPlan
    } catch {
        $shapeBlocked = $true
        if ($_.Exception.Message -ne "SNAPSHOT_ARGUMENT_INVALID") { throw "SNAPSHOT_MISMATCH_NOT_BLOCKED" }
    }
    if (-not $shapeBlocked) { throw "SNAPSHOT_MISMATCH_NOT_BLOCKED" }
    $badRestorePlan = [ordered]@{}
    foreach ($key in $plan.Keys) { $badRestorePlan[$key] = $plan[$key] }
    $badRestorePlan.restore = @($plan.restore[1], $plan.restore[0], $plan.restore[2], $plan.restore[3], $plan.restore[4], $plan.restore[5])
    $restoreShapeBlocked = $false
    try {
        Assert-CommandPlanShape $badRestorePlan
    } catch {
        $restoreShapeBlocked = $true
        if ($_.Exception.Message -ne "RESTORE_ORDER_INVALID") { throw "RESTORE_REORDER_NOT_BLOCKED" }
    }
    if (-not $restoreShapeBlocked) { throw "RESTORE_REORDER_NOT_BLOCKED" }

    Assert-ContractBlocked -Action { Resolve-RestrictedArtifactDirectory $script:RepoRoot } -ExpectedCode "ARTIFACT_DIRECTORY_REPO_OR_WORKSPACE" -FailureCode "REPO_PATH_NOT_BLOCKED"
    $homeRootContract = [Environment]::GetFolderPath([Environment+SpecialFolder]::UserProfile)
    if (-not [string]::IsNullOrWhiteSpace($homeRootContract)) {
        Assert-ContractBlocked -Action { Resolve-RestrictedArtifactDirectory $homeRootContract } -ExpectedCode "ARTIFACT_DIRECTORY_HOME_ROOT" -FailureCode "HOME_ROOT_NOT_BLOCKED"
    }
    $driveRootContract = [IO.Path]::GetPathRoot($script:RepoRoot)
    Assert-ContractBlocked -Action { Resolve-RestrictedArtifactDirectory $driveRootContract } -ExpectedCode "ARTIFACT_DIRECTORY_DRIVE_ROOT" -FailureCode "DRIVE_ROOT_NOT_BLOCKED"
    $missingPath = Join-Path ([IO.Path]::GetTempPath()) ("ct-paid-gate1-missing-" + [Guid]::NewGuid().ToString("N"))
    Assert-ContractBlocked -Action { Resolve-RestrictedArtifactDirectory $missingPath } -ExpectedCode "ARTIFACT_DIRECTORY_MISSING" -FailureCode "MISSING_PATH_NOT_BLOCKED"
    $nonEmptyPath = Join-Path ([string]$env:SystemRoot) "System32"
    if (Test-Path -LiteralPath $nonEmptyPath -PathType Container) {
        $nonEmptyEntries = @(Get-ChildItem -LiteralPath $nonEmptyPath -Force -ErrorAction Stop)
        if ($nonEmptyEntries.Count -gt 0) {
            Assert-ContractBlocked -Action { Resolve-RestrictedArtifactDirectory $nonEmptyPath } -ExpectedCode "ARTIFACT_DIRECTORY_NONEMPTY" -FailureCode "NONEMPTY_PATH_NOT_BLOCKED"
        }
    }
    Assert-ContractBlocked -Action {
        Resolve-ReviewedFilterArguments ([pscustomobject]@{
            reviewedSupabaseFilterArgs = @("--unknown-filter", "value")
            reviewedSupabaseFilterEvidence = [pscustomobject]@{ status = "reviewed"; cliVersion = "2.109.0"; source = "synthetic"; helpSha256 = ("b" * 64); flags = @("--unknown-filter", "value") }
        })
    } -ExpectedCode "REVIEWED_FILTER_FLAG_UNSUPPORTED" -FailureCode "UNKNOWN_FILTER_NOT_BLOCKED"
    Assert-ContractBlocked -Action {
        Assert-AuthStorageDiffEvidence ([pscustomobject]@{ authStorageDiff = [pscustomobject]@{ isEmpty = $false; filePresent = $true; sha256 = ("a" * 64) } })
    } -ExpectedCode "AUTH_STORAGE_DIFF_REVIEW_UNAVAILABLE" -FailureCode "UNREVIEWED_DIFF_NOT_BLOCKED"
    Assert-ContractBlocked -Action {
        New-CommandPlan -ReviewedFilterArguments @("--schema", "public") -ReviewedDataFilterArguments @("--schema", "*") -ArtifactDirectory ([IO.Path]::GetTempPath()) -Snapshot ""
    } -ExpectedCode "SNAPSHOT_EVIDENCE_UNAVAILABLE" -FailureCode "MISSING_SNAPSHOT_NOT_BLOCKED"

    $stateBase = @{
        t0 = "2026-09-05T00:00:00.000Z"
        backupCompletedAt = "2026-09-05T00:05:00.000Z"
        checksumsCompletedAt = "2026-09-05T00:05:00.000Z"
        sourceProjectFingerprint = "source-fingerprint"
        confirmedSourceProjectFingerprint = "source-fingerprint"
        now = "2026-09-05T00:05:00.000Z"
        backupSucceeded = $true
        approvals = @{ finalBackup = $true; boundedRpoWatchdog = $true }
    }
    $armed = Get-WatchdogResult ([pscustomobject]$stateBase)
    if ($armed.state -ne "ARMED_BEFORE_FIRST_DDL") { throw "WATCHDOG_ARM_BOUNDARY_INVALID" }
    $late = $stateBase.Clone()
    $late.backupCompletedAt = "2026-09-05T00:05:00.001Z"
    $late.checksumsCompletedAt = "2026-09-05T00:05:00.001Z"
    $late.now = "2026-09-05T00:05:00.001Z"
    $aborted = Get-WatchdogResult ([pscustomobject]$late)
    if ($aborted.state -ne "ABORTED_NO_DDL_NO_PAUSE") { throw "WATCHDOG_ABORT_BOUNDARY_INVALID" }
    $pause = $stateBase.Clone()
    $pause.now = "2026-09-05T00:10:00.000Z"
    $pauseResult = Get-WatchdogResult ([pscustomobject]$pause)
    if ($pauseResult.state -ne "PAUSE_REQUESTED") { throw "WATCHDOG_PAUSE_BOUNDARY_INVALID" }
    $confirmed = $stateBase.Clone()
    $confirmed.now = "2026-09-05T00:20:00.000Z"
    $confirmed.pauseConfirmedAt = "2026-09-05T00:20:00.000Z"
    $confirmed.sourceStatus = "inaccessible"
    $confirmed.approvals = @{
        finalBackup = $true
        boundedRpoWatchdog = $true
        pauseRequest = $true
        confirmedInaccessibility = $true
        restore = $true
        recoveryCostCapacity = $true
        recoveryProjectProvisioning = $true
        recoveryRegionExtensionsAuth = $true
    }
    $confirmedResult = Get-WatchdogResult ([pscustomobject]$confirmed)
    if ($confirmedResult.state -ne "PAUSE_CONFIRMED" -or $confirmedResult.restore_eligible -ne $true) { throw "WATCHDOG_RESTORE_BOUNDARY_INVALID" }
    foreach ($approvalName in $script:ApprovalTokens) {
        $isolated = $stateBase.Clone()
        $isolated.now = "2026-09-05T00:20:00.000Z"
        $isolated.pauseConfirmedAt = "2026-09-05T00:20:00.000Z"
        $isolated.sourceStatus = "inaccessible"
        $isolatedApprovals = @{ finalBackup = $true; boundedRpoWatchdog = $true }
        $isolatedApprovals[$approvalName] = $true
        $isolated.approvals = $isolatedApprovals
        $isolatedResult = Get-WatchdogResult ([pscustomobject]$isolated)
        if ($isolatedResult.restore_eligible -ne $false -or $isolatedResult.mutation_count -ne 0) {
            throw "APPROVAL_ISOLATION_INVALID"
        }
    }
    $wrongTarget = $confirmed.Clone()
    $wrongTarget.sourceProjectFingerprint = "wrong-source"
    $wrongTargetResult = Get-WatchdogResult ([pscustomobject]$wrongTarget)
    if ($wrongTargetResult.restore_eligible -ne $false -or $wrongTargetResult.reason -ne "SOURCE_INACCESSIBILITY_WRONG_TARGET") {
        throw "WRONG_TARGET_NOT_BLOCKED"
    }
    $lateConfirmation = $confirmed.Clone()
    $lateConfirmation.now = "2026-09-05T00:20:00.001Z"
    $lateConfirmation.pauseConfirmedAt = "2026-09-05T00:20:00.001Z"
    $lateResult = Get-WatchdogResult ([pscustomobject]$lateConfirmation)
    if ($lateResult.restore_eligible -ne $false -or $lateResult.reason -ne "SOURCE_INACCESSIBILITY_CONFIRMED_LATE") {
        throw "LATE_CONFIRMATION_NOT_BLOCKED"
    }
    $beforeT0Confirmation = $confirmed.Clone()
    $beforeT0Confirmation.pauseConfirmedAt = "2026-09-04T23:59:59.999Z"
    $beforeT0Result = Get-WatchdogResult ([pscustomobject]$beforeT0Confirmation)
    if ($beforeT0Result.restore_eligible -ne $false -or $beforeT0Result.reason -ne "SOURCE_INACCESSIBILITY_CONFIRMED_LATE") {
        throw "PRE_T0_CONFIRMATION_NOT_BLOCKED"
    }
    $beforeT0Backup = $stateBase.Clone()
    $beforeT0Backup.backupCompletedAt = "2026-09-04T23:59:59.999Z"
    $beforeT0BackupResult = Get-WatchdogResult ([pscustomobject]$beforeT0Backup)
    if ($beforeT0BackupResult.state -ne "PRE_DDL_UNARMED" -or $beforeT0BackupResult.reason -ne "BACKUP_TIMESTAMP_INVALID") {
        throw "PRE_T0_BACKUP_NOT_BLOCKED"
    }
    $missingConfirmation = $confirmed.Clone()
    $missingConfirmation.pauseConfirmedAt = $null
    $missingResult = Get-WatchdogResult ([pscustomobject]$missingConfirmation)
    if ($missingResult.restore_eligible -ne $false -or $missingResult.reason -ne "SOURCE_INACCESSIBILITY_NOT_CONFIRMED") {
        throw "MISSING_CONFIRMATION_NOT_BLOCKED"
    }
    $pendingConfirmation = $confirmed.Clone()
    $pendingConfirmation.sourceStatus = "pending"
    $pendingResult = Get-WatchdogResult ([pscustomobject]$pendingConfirmation)
    if ($pendingResult.restore_eligible -ne $false) { throw "PENDING_CONFIRMATION_NOT_BLOCKED" }

    $probe = Get-ToolProbeResult ([pscustomobject]@{
        toolOverrides = [pscustomobject]@{
            supabase = $null
            docker = $null
            psql = $null
            pgDump = $null
            pgRestore = $null
        }
    })
    if ($probe.status -ne "blocked" -or $probe.mutation_count -ne 0 -or $probe.linked_discovery_spawned -ne 0) { throw "TOOL_MISSING_STATE_INVALID" }
}

function ConvertTo-SafeJson {
    param([Parameter(Mandatory = $true)][object]$Value)
    return (ConvertTo-Json -InputObject $Value -Compress -Depth 30)
}

try {
    if ($Mode -eq "DryRun") {
        Write-Output "state=PRE_DDL_UNARMED mutation_status=not-run mutation_count=0"
        exit 0
    }

    $inputObject = if ([string]::IsNullOrWhiteSpace($InputJson)) {
        [pscustomobject]@{}
    } else {
        try {
            ConvertFrom-Json -InputObject $InputJson -Depth 50 -DateKind String
        } catch {
            throw "INPUT_JSON_INVALID"
        }
    }

    switch ($Mode) {
        "Contract" {
            Assert-Contract
            Write-Output "backup-contract=pass restore-order=6 snapshot-dumps=4"
            exit 0
        }
        "ToolProbe" {
            $result = Get-ToolProbeResult $inputObject
            Write-Output (ConvertTo-SafeJson $result)
            if ($result.status -ne "pass") { exit 2 }
            exit 0
        }
        "Plan" {
            $artifactDirectory = [string](Get-InputValue $inputObject "artifactDirectory")
            $artifactInfo = Resolve-RestrictedArtifactDirectory $artifactDirectory
            $vaultStatus = Assert-ZeroEvidence -InputObject $inputObject -Name "vault" -CountName "total" -AlternateCountName "reservedNames"
            $vault = Get-InputValue $inputObject "vault"
            $reservedNames = Get-InputValue $vault "reservedNames"
            if ($null -eq $reservedNames -or [decimal]$reservedNames -ne 0) { throw "VAULT_RESERVED_NOT_ZERO" }
            $storageStatus = Assert-ZeroEvidence -InputObject $inputObject -Name "storage" -CountName "objectCount"
            $authStorageStatus = Assert-AuthStorageDiffEvidence $inputObject
            $reviewedFilterArguments = Resolve-ReviewedFilterArguments $inputObject
            $reviewedDataFilterArguments = Resolve-ReviewedFilterArguments $inputObject -Artifact data
            $result = New-PlanResult -InputObject $inputObject -ArtifactInfo $artifactInfo -ArtifactDirectory $artifactInfo.fullPath -VaultStatus $vaultStatus -StorageStatus $storageStatus -AuthStorageStatus $authStorageStatus -ReviewedFilterArguments $reviewedFilterArguments -ReviewedDataFilterArguments $reviewedDataFilterArguments
            Write-Output (ConvertTo-SafeJson $result)
            exit 0
        }
        "State" {
            $result = Get-WatchdogResult $inputObject
            Write-Output (ConvertTo-SafeJson $result)
            exit 0
        }
    }
} catch {
    $reason = [string]$_.Exception.Message
    if ($reason -notmatch "^[A-Z0-9_-]{1,96}$") {
        $reason = "PREFLIGHT_BLOCKED"
    }
    $blocked = [ordered]@{
        status = "blocked"
        reason = $reason
        state = "PRE_DDL_UNARMED"
        decision = "NO-GO"
        mutation_status = "not-run"
        mutation_count = 0
        remote_call_count = 0
        operational_subprocess_count = 0
    }
    Write-Output (ConvertTo-SafeJson $blocked)
    exit 2
}
