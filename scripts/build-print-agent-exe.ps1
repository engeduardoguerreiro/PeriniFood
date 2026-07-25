$ErrorActionPreference = "Stop"

$Root = Resolve-Path (Join-Path $PSScriptRoot "..")
$DistDir = Join-Path $Root "dist"
$Source = Join-Path $Root "scripts\perinifood-print-bridge.js"
$Output = Join-Path $DistDir "perinifood-print-agent.exe"

New-Item -ItemType Directory -Force -Path $DistDir | Out-Null

$targets = @(
  "node18-win-x64",
  "node16-win-x64"
)

$lastError = $null
foreach ($target in $targets) {
  Write-Host "Building PeriniFood Print Agent for $target..."
  try {
    & npx.cmd @yao-pkg/pkg $Source --targets $target --output $Output
    if ($LASTEXITCODE -eq 0 -and (Test-Path -LiteralPath $Output)) {
      Write-Host "Executable created at $Output"
      exit 0
    }
    $lastError = "pkg exited with code $LASTEXITCODE for $target"
  } catch {
    $lastError = $_.Exception.Message
    Write-Warning "Build failed for ${target}: $lastError"
  }
}

throw "Could not build PeriniFood Print Agent executable. Last error: $lastError"
