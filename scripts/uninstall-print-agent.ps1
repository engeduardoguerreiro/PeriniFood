$ErrorActionPreference = "SilentlyContinue"

$TaskName = "PeriniFood Print Agent"

Stop-ScheduledTask -TaskName $TaskName
Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false

Write-Host "Agente de impressão removido da inicialização do Windows."
