$ErrorActionPreference = "Stop"

$TaskName = "PeriniFood Print Agent"
$Root = Resolve-Path (Join-Path $PSScriptRoot "..")
$StartScript = Join-Path $Root "scripts\start-print-agent.ps1"
$LogDir = Join-Path $env:LOCALAPPDATA "PeriniFood\PrintAgent\logs"

New-Item -ItemType Directory -Force -Path $LogDir | Out-Null

$Action = New-ScheduledTaskAction `
  -Execute "powershell.exe" `
  -Argument "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$StartScript`""

$Trigger = New-ScheduledTaskTrigger -AtLogOn -User $env:USERNAME
$Settings = New-ScheduledTaskSettingsSet `
  -AllowStartIfOnBatteries `
  -DontStopIfGoingOnBatteries `
  -ExecutionTimeLimit (New-TimeSpan -Days 365) `
  -MultipleInstances IgnoreNew `
  -RestartCount 3 `
  -RestartInterval (New-TimeSpan -Minutes 1)

Register-ScheduledTask `
  -TaskName $TaskName `
  -Action $Action `
  -Trigger $Trigger `
  -Settings $Settings `
  -Description "Inicia o agente local de impressão do PeriniFood junto com o Windows." `
  -Force | Out-Null

Start-ScheduledTask -TaskName $TaskName

Write-Host "Agente de impressão instalado e iniciado."
Write-Host "Tarefa do Windows: $TaskName"
Write-Host "Logs: $LogDir"
