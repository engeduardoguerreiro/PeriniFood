$ErrorActionPreference = "SilentlyContinue"
$TaskName = "PeriniFood Print Agent"

Stop-ScheduledTask -TaskName $TaskName
Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false

Get-CimInstance Win32_Process |
  Where-Object { $_.CommandLine -like "*perinifood-print-bridge.js*" } |
  ForEach-Object { Invoke-CimMethod -InputObject $_ -MethodName Terminate | Out-Null }
