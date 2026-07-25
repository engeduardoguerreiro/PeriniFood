$ErrorActionPreference = "Stop"

$Root = Resolve-Path (Join-Path $PSScriptRoot "..")
$DistDir = Join-Path $Root "dist"
$WorkDir = Join-Path $env:TEMP "perinifood-print-agent-build"
$StageDir = Join-Path $WorkDir "payload"
$WorkOutput = Join-Path $WorkDir "PeriniFood-PrintAgent-Setup.exe"
$Output = Join-Path $DistDir "PeriniFood-PrintAgent-Setup.exe"
$SedPath = Join-Path $WorkDir "print-agent-installer.sed"

$Node = (Get-Command node -ErrorAction SilentlyContinue).Source
if (-not $Node) {
  throw "Node.js was not found. Install Node.js locally or run this build on a machine that has Node.js."
}

New-Item -ItemType Directory -Force -Path $DistDir | Out-Null
if (Test-Path -LiteralPath $WorkDir) {
  Remove-Item -LiteralPath $WorkDir -Recurse -Force
}
New-Item -ItemType Directory -Force -Path $WorkDir | Out-Null
New-Item -ItemType Directory -Force -Path $StageDir | Out-Null

Copy-Item -LiteralPath $Node -Destination (Join-Path $StageDir "node.exe") -Force
Copy-Item -LiteralPath (Join-Path $Root "scripts\perinifood-print-bridge.js") -Destination (Join-Path $StageDir "perinifood-print-bridge.js") -Force

$installerPs1 = @'
$ErrorActionPreference = "Stop"

$InstallDir = Join-Path $env:LOCALAPPDATA "PeriniFood\PrintAgent\app"
$LogDir = Join-Path $env:LOCALAPPDATA "PeriniFood\PrintAgent\logs"
$StartupLog = Join-Path $LogDir "installer.log"

New-Item -ItemType Directory -Force -Path $InstallDir | Out-Null
New-Item -ItemType Directory -Force -Path $LogDir | Out-Null

Copy-Item -LiteralPath (Join-Path $PSScriptRoot "node.exe") -Destination (Join-Path $InstallDir "node.exe") -Force
Copy-Item -LiteralPath (Join-Path $PSScriptRoot "perinifood-print-bridge.js") -Destination (Join-Path $InstallDir "perinifood-print-bridge.js") -Force

$startScript = @"
`$ErrorActionPreference = "Stop"
`$InstallDir = Join-Path `$env:LOCALAPPDATA "PeriniFood\PrintAgent\app"
`$LogDir = Join-Path `$env:LOCALAPPDATA "PeriniFood\PrintAgent\logs"
`$LogFile = Join-Path `$LogDir "startup.log"
New-Item -ItemType Directory -Force -Path `$LogDir | Out-Null
Set-Location `$InstallDir
"`$(Get-Date -Format o) Starting PeriniFood Print Agent" | Add-Content -LiteralPath `$LogFile
& (Join-Path `$InstallDir "node.exe") (Join-Path `$InstallDir "perinifood-print-bridge.js") *> `$LogFile
"@

Set-Content -LiteralPath (Join-Path $InstallDir "start-print-agent.ps1") -Value $startScript -Encoding UTF8

$TaskName = "PeriniFood Print Agent"
$TaskCommand = "powershell.exe"
$TaskArgs = "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$InstallDir\start-print-agent.ps1`""

schtasks.exe /Delete /TN $TaskName /F *> $null
schtasks.exe /Create /TN $TaskName /SC ONLOGON /RL LIMITED /TR "`"$TaskCommand`" $TaskArgs" /F | Out-Null

$existing = Get-CimInstance Win32_Process -Filter "Name = 'node.exe'" | Where-Object {
  $_.CommandLine -like "*perinifood-print-bridge.js*"
}
if (-not $existing) {
  Start-Process -FilePath $TaskCommand -ArgumentList $TaskArgs -WindowStyle Hidden
}

"$(Get-Date -Format o) PeriniFood Print Agent installed at $InstallDir" | Add-Content -LiteralPath $StartupLog
'@

$installerCmd = @'
@echo off
powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File "%~dp0install-agent.ps1"
'@

Set-Content -LiteralPath (Join-Path $StageDir "install-agent.ps1") -Value $installerPs1 -Encoding UTF8
Set-Content -LiteralPath (Join-Path $StageDir "install-agent.cmd") -Value $installerCmd -Encoding ASCII

$stageForSed = $StageDir
if (-not $stageForSed.EndsWith("\")) {
  $stageForSed = "$stageForSed\"
}

$sed = @"
[Version]
Class=IEXPRESS
SEDVersion=3
[Options]
PackagePurpose=InstallApp
ShowInstallProgramWindow=0
HideExtractAnimation=1
UseLongFileName=1
InsideCompressed=0
CAB_FixedSize=0
CAB_ResvCodeSigning=0
RebootMode=N
InstallPrompt=
DisplayLicense=
FinishMessage=PeriniFood Print Agent instalado com sucesso.
TargetName=$WorkOutput
FriendlyName=PeriniFood Print Agent
AppLaunched=install-agent.cmd
PostInstallCmd=<None>
AdminQuietInstCmd=install-agent.cmd
UserQuietInstCmd=install-agent.cmd
SourceFiles=SourceFiles
[SourceFiles]
SourceFiles0=$stageForSed
[SourceFiles0]
%FILE0%=node.exe
%FILE1%=perinifood-print-bridge.js
%FILE2%=install-agent.ps1
%FILE3%=install-agent.cmd
"@

Set-Content -LiteralPath $SedPath -Value $sed -Encoding ASCII

& iexpress.exe /N /Q $SedPath
if ($LASTEXITCODE -eq 0 -and (Test-Path -LiteralPath $WorkOutput)) {
  Copy-Item -LiteralPath $WorkOutput -Destination $Output -Force
  Write-Host "Installer created at $Output"
  exit 0
}

Write-Warning "IExpress did not create the installer. Falling back to C# self-extracting setup."

$Csc = Get-ChildItem "C:\Windows\Microsoft.NET\Framework64" -Recurse -Filter csc.exe -ErrorAction SilentlyContinue |
  Sort-Object FullName -Descending |
  Select-Object -First 1 -ExpandProperty FullName

if (-not $Csc) {
  throw "Could not find csc.exe to compile the installer."
}

$SetupSource = Join-Path $WorkDir "PeriniFoodPrintAgentSetup.cs"
$ServiceSource = Join-Path $WorkDir "PeriniFoodPrintAgentService.cs"
$ServiceExe = Join-Path $StageDir "PeriniFoodPrintAgent.Service.exe"
$SetupManifest = Join-Path $WorkDir "PeriniFoodPrintAgentSetup.manifest"

$ServiceCode = @'
using System;
using System.Diagnostics;
using System.IO;
using System.ServiceProcess;

public class PeriniFoodPrintAgentService : ServiceBase
{
    private Process child;
    private string installDir;
    private string logDir;

    public PeriniFoodPrintAgentService()
    {
        ServiceName = "PeriniFoodPrintAgent";
        CanStop = true;
        CanShutdown = true;
        AutoLog = true;
    }

    protected override void OnStart(string[] args)
    {
        string programData = Environment.GetFolderPath(Environment.SpecialFolder.CommonApplicationData);
        installDir = Path.Combine(programData, "PeriniFood", "PrintAgent", "app");
        logDir = Path.Combine(programData, "PeriniFood", "PrintAgent", "logs");
        Directory.CreateDirectory(logDir);

        string nodePath = Path.Combine(installDir, "node.exe");
        string agentPath = Path.Combine(installDir, "perinifood-print-bridge.js");
        string stdoutPath = Path.Combine(logDir, "service-output.log");
        string stderrPath = Path.Combine(logDir, "service-error.log");

        ProcessStartInfo psi = new ProcessStartInfo(nodePath, "\"" + agentPath + "\"");
        psi.WorkingDirectory = installDir;
        psi.UseShellExecute = false;
        psi.CreateNoWindow = true;
        psi.RedirectStandardOutput = true;
        psi.RedirectStandardError = true;
        psi.EnvironmentVariables["PRINT_BRIDGE_DATA_DIR"] = Path.Combine(programData, "PeriniFood", "PrintAgent");

        child = new Process();
        child.StartInfo = psi;
        child.OutputDataReceived += delegate(object sender, DataReceivedEventArgs e) {
            if (e.Data != null) File.AppendAllText(stdoutPath, e.Data + Environment.NewLine);
        };
        child.ErrorDataReceived += delegate(object sender, DataReceivedEventArgs e) {
            if (e.Data != null) File.AppendAllText(stderrPath, e.Data + Environment.NewLine);
        };
        child.Start();
        child.BeginOutputReadLine();
        child.BeginErrorReadLine();
        File.AppendAllText(Path.Combine(logDir, "service.log"), DateTime.Now.ToString("o") + " Service started." + Environment.NewLine);
    }

    protected override void OnStop()
    {
        try
        {
            if (child != null && !child.HasExited)
            {
                child.Kill();
                child.WaitForExit(5000);
            }
            File.AppendAllText(Path.Combine(logDir, "service.log"), DateTime.Now.ToString("o") + " Service stopped." + Environment.NewLine);
        }
        catch { }
    }

    public static void Main()
    {
        ServiceBase.Run(new PeriniFoodPrintAgentService());
    }
}
'@

Set-Content -LiteralPath $ServiceSource -Value $ServiceCode -Encoding UTF8

$CscForService = Get-ChildItem "C:\Windows\Microsoft.NET\Framework64" -Recurse -Filter csc.exe -ErrorAction SilentlyContinue |
  Sort-Object FullName -Descending |
  Select-Object -First 1 -ExpandProperty FullName

if (-not $CscForService) {
  throw "Could not find csc.exe to compile the service."
}

& $CscForService /nologo /target:exe "/out:$ServiceExe" /reference:System.ServiceProcess.dll $ServiceSource
if ($LASTEXITCODE -ne 0 -or -not (Test-Path -LiteralPath $ServiceExe)) {
  throw "C# service build failed. Exit code: $LASTEXITCODE"
}

$SetupCode = @'
using System;
using System.Diagnostics;
using System.IO;
using System.Reflection;
using System.Windows.Forms;

class PeriniFoodPrintAgentSetup
{
    static void Extract(string resourceName, string destination)
    {
        Assembly assembly = Assembly.GetExecutingAssembly();
        using (Stream input = assembly.GetManifestResourceStream(resourceName))
        {
            if (input == null) throw new Exception("Resource not found: " + resourceName);
            using (FileStream output = File.Create(destination))
            {
                input.CopyTo(output);
            }
        }
    }

    static int RunHidden(string fileName, string arguments)
    {
        ProcessStartInfo psi = new ProcessStartInfo(fileName, arguments);
        psi.CreateNoWindow = true;
        psi.UseShellExecute = false;
        psi.WindowStyle = ProcessWindowStyle.Hidden;
        Process process = Process.Start(psi);
        process.WaitForExit();
        return process.ExitCode;
    }

    [STAThread]
    static void Main()
    {
        try
        {
            string programData = Environment.GetFolderPath(Environment.SpecialFolder.CommonApplicationData);
            string installDir = Path.Combine(programData, "PeriniFood", "PrintAgent", "app");
            string logDir = Path.Combine(programData, "PeriniFood", "PrintAgent", "logs");
            Directory.CreateDirectory(installDir);
            Directory.CreateDirectory(logDir);

            string nodePath = Path.Combine(installDir, "node.exe");
            string agentPath = Path.Combine(installDir, "perinifood-print-bridge.js");
            string servicePath = Path.Combine(installDir, "PeriniFoodPrintAgent.Service.exe");

            Extract("node.exe", nodePath);
            Extract("perinifood-print-bridge.js", agentPath);
            Extract("PeriniFoodPrintAgent.Service.exe", servicePath);

            string taskName = "PeriniFood Print Agent";
            RunHidden("schtasks.exe", "/Delete /TN \"" + taskName + "\" /F");
            RunHidden("sc.exe", "stop PeriniFoodPrintAgent");
            RunHidden("sc.exe", "delete PeriniFoodPrintAgent");
            int createCode = RunHidden("sc.exe", "create PeriniFoodPrintAgent binPath= \"" + servicePath + "\" start= auto DisplayName= \"PeriniFood Print Agent\"");
            if (createCode != 0) throw new Exception("Nao foi possivel criar o servico. Execute o instalador como administrador.");
            RunHidden("sc.exe", "description PeriniFoodPrintAgent \"Agente local de impressao do PeriniFood.\"");
            RunHidden("sc.exe", "failure PeriniFoodPrintAgent reset= 60 actions= restart/5000/restart/10000/restart/30000");
            int startCode = RunHidden("sc.exe", "start PeriniFoodPrintAgent");
            if (startCode != 0) throw new Exception("Servico instalado, mas nao foi possivel iniciar automaticamente.");

            File.AppendAllText(Path.Combine(logDir, "installer.log"), DateTime.Now.ToString("o") + " Installed PeriniFood Print Agent service at " + installDir + Environment.NewLine);
            MessageBox.Show("PeriniFood Print Agent instalado com sucesso.", "PeriniFood", MessageBoxButtons.OK, MessageBoxIcon.Information);
        }
        catch (Exception ex)
        {
            MessageBox.Show("Nao foi possivel instalar o PeriniFood Print Agent.\n\n" + ex.Message, "PeriniFood", MessageBoxButtons.OK, MessageBoxIcon.Error);
            Environment.Exit(1);
        }
    }
}
'@

Set-Content -LiteralPath $SetupSource -Value $SetupCode -Encoding UTF8

$ManifestCode = @'
<?xml version="1.0" encoding="utf-8"?>
<assembly manifestVersion="1.0" xmlns="urn:schemas-microsoft-com:asm.v1">
  <assemblyIdentity version="1.0.0.0" name="PeriniFood.PrintAgent.Setup" />
  <trustInfo xmlns="urn:schemas-microsoft-com:asm.v2">
    <security>
      <requestedPrivileges xmlns="urn:schemas-microsoft-com:asm.v3">
        <requestedExecutionLevel level="requireAdministrator" uiAccess="false" />
      </requestedPrivileges>
    </security>
  </trustInfo>
</assembly>
'@

Set-Content -LiteralPath $SetupManifest -Value $ManifestCode -Encoding UTF8

$NodeResource = "/resource:$((Join-Path $StageDir "node.exe")),node.exe"
$AgentResource = "/resource:$((Join-Path $StageDir "perinifood-print-bridge.js")),perinifood-print-bridge.js"
$ServiceResource = "/resource:$ServiceExe,PeriniFoodPrintAgent.Service.exe"
& $Csc /nologo /target:winexe "/out:$Output" "/win32manifest:$SetupManifest" /reference:System.Windows.Forms.dll $NodeResource $AgentResource $ServiceResource $SetupSource
if ($LASTEXITCODE -ne 0 -or -not (Test-Path -LiteralPath $Output)) {
  throw "C# installer build failed. Exit code: $LASTEXITCODE"
}

Write-Host "Installer created at $Output"
