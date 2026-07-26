@echo off
chcp 65001 >nul
setlocal EnableDelayedExpansion

rem ============================================================
rem  PeriniFood - Atalho de impressao do balcao (Chrome)
rem  Cria um atalho na area de trabalho que abre o sistema
rem  em modo de impressao SILENCIOSA (sem instalar nada).
rem
rem  1) Troque o endereco abaixo pelo mesmo que voce digita
rem     no navegador para abrir o sistema.
rem  2) Salve o arquivo e clique duas vezes nele.
rem ============================================================

set "APP_URL=https://COLE-AQUI-O-ENDERECO-DO-SISTEMA"

set "SHORTCUT=%USERPROFILE%\Desktop\PeriniFood Balcao.lnk"

set "CHROME=%ProgramFiles%\Google\Chrome\Application\chrome.exe"
if not exist "%CHROME%" set "CHROME=%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe"
if not exist "%CHROME%" set "CHROME=%LocalAppData%\Google\Chrome\Application\chrome.exe"

if not exist "%CHROME%" (
  echo [ERRO] Google Chrome nao encontrado. Instale o Chrome e rode de novo.
  pause
  exit /b 1
)

if "%APP_URL%"=="https://COLE-AQUI-O-ENDERECO-DO-SISTEMA" (
  echo [ATENCAO] Edite este arquivo e coloque o endereco do seu sistema em APP_URL.
  pause
  exit /b 1
)

powershell -NoProfile -Command ^
  "$w = New-Object -ComObject WScript.Shell; $s = $w.CreateShortcut('%SHORTCUT%'); $s.TargetPath = '%CHROME%'; $s.Arguments = '--kiosk-printing --app=%APP_URL%'; $s.IconLocation = '%CHROME%,0'; $s.Save()"

echo.
echo  Atalho criado na area de trabalho: "PeriniFood Balcao"
echo  Abra o sistema por ele. A partir de agora a comanda imprime
echo  direto na impressora padrao, sem janela de impressao.
echo.
pause
