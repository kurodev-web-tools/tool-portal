[CmdletBinding()]
param(
  [ValidateSet("Runtime", "Storage", "All")]
  [string]$Mode = "Runtime",
  [switch]$ConfirmLocalReset
)

$ErrorActionPreference = "Stop"
$repoRoot = (Resolve-Path -LiteralPath (Split-Path -Parent $PSScriptRoot)).Path
$currentLocation = (Resolve-Path -LiteralPath (Get-Location).ProviderPath).Path
if (-not [System.StringComparer]::OrdinalIgnoreCase.Equals($currentLocation, $repoRoot)) {
  throw "Expected the fixture to run from its exact repository worktree root."
}
$supabaseCli = Join-Path $repoRoot "node_modules/.bin/supabase.cmd"
$runtimeSql = Join-Path $PSScriptRoot "fixtures/comment-translator-paid-core-v1-task11-local-runtime.sql"
$storageSql = Join-Path $PSScriptRoot "fixtures/comment-translator-paid-core-v1-task11-local-storage.sql"
$projectName = Split-Path -Leaf $repoRoot

if (-not (Test-Path -LiteralPath $supabaseCli)) {
  throw "Local Supabase CLI is unavailable. Run the repository's approved dependency setup first."
}
if (-not (Get-Command podman -ErrorAction SilentlyContinue)) {
  throw "Podman is required for the approved local Supabase fixture."
}

$databaseContainers = @(
  & podman ps --filter "label=com.supabase.cli.project=$projectName" --filter "name=supabase_db_" --format "{{.Names}}"
)
if ($LASTEXITCODE -ne 0 -or $databaseContainers.Count -ne 1) {
  throw "Expected exactly one running local Supabase database container for this project."
}
$databaseContainer = $databaseContainers[0]
$databaseContainerId = (& podman inspect --format "{{.Id}}" $databaseContainer).Trim()
if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($databaseContainerId)) {
  throw "Unable to retain the selected local Supabase database container identity."
}

function Invoke-LocalSqlFile {
  param([Parameter(Mandatory = $true)][string]$SqlPath)

  Get-Content -Raw -LiteralPath $SqlPath |
    & podman exec --interactive $databaseContainer psql --username postgres --dbname postgres --set ON_ERROR_STOP=1
  if ($LASTEXITCODE -ne 0) {
    throw "Local Supabase SQL fixture failed."
  }
}

function Reset-LocalDatabase {
  & $supabaseCli @("db", "reset", "--local", "--yes", "--workdir", $repoRoot)
  if ($LASTEXITCODE -ne 0) {
    throw "Local Supabase reset failed after storage measurement."
  }
}

if ($Mode -in @("Runtime", "All")) {
  Invoke-LocalSqlFile -SqlPath $runtimeSql
}

if ($Mode -in @("Storage", "All")) {
  if (-not $ConfirmLocalReset) {
    throw "Storage mode materializes the approved synthetic load and requires -ConfirmLocalReset."
  }

  try {
    Invoke-LocalSqlFile -SqlPath $storageSql
  }
  finally {
    $currentDatabaseContainerId = (& podman inspect --format "{{.Id}}" $databaseContainer).Trim()
    if (
      $LASTEXITCODE -ne 0 -or
      [string]::IsNullOrWhiteSpace($currentDatabaseContainerId) -or
      -not [System.StringComparer]::Ordinal.Equals($currentDatabaseContainerId, $databaseContainerId)
    ) {
      throw "The selected local Supabase database container identity changed before reset."
    }
    Reset-LocalDatabase
  }
}
