param(
  [Parameter(Mandatory = $true)]
  [string]$InstallDir
)

$ErrorActionPreference = "Stop"
$TaskName = "PeriniFood Print Agent"
$AgentDir = Join-Path $InstallDir "resources\print-agent"
$NodeExe = Join-Path $AgentDir "node.exe"
$BridgeScript = Join-Path $AgentDir "perinifood-print-bridge.js"
$Runner = Join-Path $AgentDir "run-print-agent.ps1"
$LogDir = Join-Path $env:LOCALAPPDATA "PeriniFood\PrintAgent\logs"
$InstallerLog = Join-Path $LogDir "installer.log"

New-Item -ItemType Directory -Force -Path $LogDir | Out-Null

if (-not (Test-Path -LiteralPath $NodeExe)) {
  throw "Runtime do agente de impressão não encontrado em $NodeExe"
}
if (-not (Test-Path -LiteralPath $BridgeScript)) {
  throw "Agente de impressão não encontrado em $BridgeScript"
}

$runnerContent = @'
param(
  [Parameter(Mandatory = $true)][string]$NodeExe,
  [Parameter(Mandatory = $true)][string]$BridgeScript
)
$ErrorActionPreference = "Stop"
$logDir = Join-Path $env:LOCALAPPDATA "PeriniFood\PrintAgent\logs"
$startupLog = Join-Path $logDir "startup.log"
New-Item -ItemType Directory -Force -Path $logDir | Out-Null
"$(Get-Date -Format o) Starting bundled PeriniFood Print Agent" | Add-Content -LiteralPath $startupLog
& $NodeExe $BridgeScript *>> $startupLog
'@
Set-Content -LiteralPath $Runner -Value $runnerContent -Encoding UTF8

Get-CimInstance Win32_Process -ErrorAction SilentlyContinue |
  Where-Object { $_.CommandLine -like "*perinifood-print-bridge.js*" } |
  ForEach-Object { Invoke-CimMethod -InputObject $_ -MethodName Terminate -ErrorAction SilentlyContinue | Out-Null }

$escapedRunner = $Runner.Replace('"', '""')
$escapedNode = $NodeExe.Replace('"', '""')
$escapedBridge = $BridgeScript.Replace('"', '""')
$arguments = "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$escapedRunner`" -NodeExe `"$escapedNode`" -BridgeScript `"$escapedBridge`""
$action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument $arguments
$trigger = New-ScheduledTaskTrigger -AtLogOn -User $env:USERNAME
$settings = New-ScheduledTaskSettingsSet `
  -AllowStartIfOnBatteries `
  -DontStopIfGoingOnBatteries `
  -ExecutionTimeLimit (New-TimeSpan -Days 365) `
  -MultipleInstances IgnoreNew `
  -RestartCount 3 `
  -RestartInterval (New-TimeSpan -Minutes 1)

Register-ScheduledTask `
  -TaskName $TaskName `
  -Action $action `
  -Trigger $trigger `
  -Settings $settings `
  -Description "Agente local de impressão do PeriniFood." `
  -Force | Out-Null

Start-ScheduledTask -TaskName $TaskName
"$(Get-Date -Format o) Print Agent installed from $AgentDir" | Add-Content -LiteralPath $InstallerLog
