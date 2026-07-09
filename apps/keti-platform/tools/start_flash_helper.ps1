param(
    [int]$Port = 8765,
    [switch]$InstallMissing,
    [switch]$CheckOnly
)

$ErrorActionPreference = "Stop"

$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$HelperScript = Join-Path $RepoRoot "tools\flash_helper_server.js"

function Write-Step {
    param([string]$Message)
    Write-Host "[KETI helper] $Message"
}

function Get-Tool {
    param([string]$Name)
    return Get-Command $Name -ErrorAction SilentlyContinue
}

function Install-WithWinget {
    param(
        [string]$PackageId,
        [string]$DisplayName
    )

    $winget = Get-Tool "winget"
    if (-not $winget) {
        throw "$DisplayName is missing and winget is not available. Install it manually, then run this script again."
    }

    Write-Step "Installing $DisplayName with winget package $PackageId"
    & winget install --id $PackageId --exact --accept-package-agreements --accept-source-agreements
    if ($LASTEXITCODE -ne 0) {
        throw "$DisplayName installation failed. Install it manually, then run this script again."
    }
}

function Invoke-Native {
    param(
        [string]$Command,
        [string[]]$Arguments = @()
    )

    $previousPreference = $ErrorActionPreference
    $ErrorActionPreference = "Continue"
    try {
        $output = & $Command @Arguments 2>&1 | ForEach-Object { [string]$_ }
        return @{
            Code = $LASTEXITCODE
            Output = $output
        }
    } finally {
        $ErrorActionPreference = $previousPreference
    }
}

function Require-Tool {
    param(
        [string]$Name,
        [string]$PackageId,
        [string]$DisplayName
    )

    $tool = Get-Tool $Name
    if ($tool) {
        Write-Step "$DisplayName found: $($tool.Source)"
        return
    }

    if ($InstallMissing) {
        Install-WithWinget -PackageId $PackageId -DisplayName $DisplayName
        $tool = Get-Tool $Name
        if ($tool) {
            Write-Step "$DisplayName installed: $($tool.Source)"
            return
        }
    }

    throw "$DisplayName is missing. Run with -InstallMissing or install it manually."
}

function Test-ArduinoCore {
    $result = Invoke-Native -Command "arduino-cli" -Arguments @("core", "list")
    if ($result.Code -ne 0) {
        Write-Step "arduino-cli core list failed:"
        Write-Host ($result.Output -join "`n")
        return $false
    }
    return (($result.Output -join "`n") -match "arduino:mbed_nano")
}

function Ensure-ArduinoCore {
    if (Test-ArduinoCore) {
        Write-Step "Arduino Mbed OS Nano Boards core is available."
        return
    }

    if (-not $InstallMissing) {
        Write-Step "Arduino Mbed OS Nano Boards core was not found."
        Write-Step "Install with: arduino-cli core update-index"
        Write-Step "Then run:     arduino-cli core install arduino:mbed_nano"
        if (-not $CheckOnly) {
            throw "Arduino core is not ready. Run with -CheckOnly to inspect or -InstallMissing to prepare automatically."
        }
        return
    }

    Write-Step "Installing Arduino Mbed OS Nano Boards core."
    & arduino-cli core update-index
    if ($LASTEXITCODE -ne 0) {
        throw "arduino-cli core update-index failed."
    }
    & arduino-cli core install arduino:mbed_nano
    if ($LASTEXITCODE -ne 0) {
        throw "arduino-cli core install arduino:mbed_nano failed."
    }
}

if (-not (Test-Path $HelperScript)) {
    throw "Helper server not found: $HelperScript"
}

Require-Tool -Name "node" -PackageId "OpenJS.NodeJS.LTS" -DisplayName "Node.js LTS"
Require-Tool -Name "arduino-cli" -PackageId "ArduinoSA.CLI" -DisplayName "Arduino CLI"
Ensure-ArduinoCore

$nodeVersion = ((Invoke-Native -Command "node" -Arguments @("--version")).Output) -join "`n"
$arduinoVersionResult = Invoke-Native -Command "arduino-cli" -Arguments @("version")
$arduinoVersion = ($arduinoVersionResult.Output) -join "`n"
Write-Step "Node: $nodeVersion"
Write-Step "Arduino CLI: $arduinoVersion"

if ($arduinoVersionResult.Code -ne 0 -and -not $CheckOnly) {
    throw "Arduino CLI is installed but not usable. Fix the Arduino15 access error, then start the helper again."
}

if ($CheckOnly) {
    Write-Step "Check complete. Helper was not started because -CheckOnly was used."
    exit 0
}

$env:KETI_FLASH_HELPER_PORT = [string]$Port
Write-Step "Starting helper on http://127.0.0.1:$Port/"
Set-Location $RepoRoot
& node $HelperScript
