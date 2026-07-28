param(
    [ValidateSet("start", "presence", "status", "stop")]
    [string]$Action = "status"
)

$ErrorActionPreference = "Stop"
$pipeName = "comment-translator-creator-c1-ephemeral-runner-v1"
$runnerPath = Join-Path $PSScriptRoot "comment-translator-creator-c1-ephemeral-runner.mjs"

if ($Action -eq "start") {
    $nodeCommand = Get-Command node -ErrorAction SilentlyContinue
    if ($null -eq $nodeCommand) {
        Write-Output "runner_status=not-started"
        exit 1
    }

    $quotedRunnerPath = '"{0}"' -f $runnerPath
    $null = Start-Process `
        -FilePath $nodeCommand.Source `
        -ArgumentList $quotedRunnerPath `
        -WorkingDirectory $PSScriptRoot `
        -WindowStyle Normal
    Write-Output "runner_status=starting"
    exit 0
}

$pipe = $null
$reader = $null
$writer = $null

try {
    $pipe = [System.IO.Pipes.NamedPipeClientStream]::new(
        ".",
        $pipeName,
        [System.IO.Pipes.PipeDirection]::InOut,
        [System.IO.Pipes.PipeOptions]::None
    )
    $pipe.Connect(750)

    $encoding = [System.Text.UTF8Encoding]::new($false)
    $reader = [System.IO.StreamReader]::new(
        $pipe,
        $encoding,
        $false,
        1024,
        $true
    )
    $writer = [System.IO.StreamWriter]::new(
        $pipe,
        $encoding,
        1024,
        $true
    )
    $writer.AutoFlush = $true
    $writer.WriteLine($Action)
    $response = $reader.ReadLine()
} catch {
    switch ($Action) {
        "presence" { Write-Output "input_presence=unavailable" }
        "status" { Write-Output "runner_status=not-running" }
        "stop" { Write-Output "termination_status=not-running" }
    }
    exit 1
} finally {
    if ($null -ne $writer) {
        $writer.Dispose()
    }
    if ($null -ne $reader) {
        $reader.Dispose()
    }
    if ($null -ne $pipe) {
        $pipe.Dispose()
    }
}

$expectedResponse = switch ($Action) {
    "presence" { "input_presence=complete" }
    "status" { "runner_status=held-idle" }
    "stop" { "termination_status=stopping" }
}

if ($response -ne $expectedResponse) {
    Write-Output "control_status=rejected"
    exit 1
}

Write-Output $response
