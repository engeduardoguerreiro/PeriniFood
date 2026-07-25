$ErrorActionPreference = "Stop"

$Root = Resolve-Path (Join-Path $PSScriptRoot "..")
$LogDir = Join-Path $env:LOCALAPPDATA "PeriniFood\PrintAgent\logs"
$LogFile = Join-Path $LogDir "startup.log"

New-Item -ItemType Directory -Force -Path $LogDir | Out-Null
Set-Location $Root

"$(Get-Date -Format o) Starting PeriniFood Print Agent from $Root" | Add-Content -LiteralPath $LogFile

$AgentExe = Join-Path $Root "dist\perinifood-print-agent.exe"
if (Test-Path -LiteralPath $AgentExe) {
  "$(Get-Date -Format o) Using bundled executable: $AgentExe" | Add-Content -LiteralPath $LogFile
  & $AgentExe *> $LogFile
  exit $LASTEXITCODE
}

$Node = (Get-Command node -ErrorAction SilentlyContinue).Source
if (-not $Node) {
  "$(Get-Date -Format o) Node.js not found in PATH." | Add-Content -LiteralPath $LogFile
  exit 1
}

& $Node (Join-Path $Root "scripts\perinifood-print-bridge.js") *> $LogFile
