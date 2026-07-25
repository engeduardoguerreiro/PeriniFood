!macro customInstall
  ; Recria os atalhos para impedir que upgrades preservem o ícone antigo.
  SetShellVarContext current
  Delete "$DESKTOP\PeriniFood.lnk"
  Delete "$SMPROGRAMS\PeriniFood.lnk"
  CreateShortCut "$DESKTOP\PeriniFood.lnk" "$INSTDIR\PeriniFood.exe" "" "$INSTDIR\PeriniFood.exe" 0 SW_SHOWNORMAL "" "PeriniFood"
  CreateShortCut "$SMPROGRAMS\PeriniFood.lnk" "$INSTDIR\PeriniFood.exe" "" "$INSTDIR\PeriniFood.exe" 0 SW_SHOWNORMAL "" "PeriniFood"
  ; Notifica o Explorer de que os ícones associados foram alterados.
  System::Call 'shell32::SHChangeNotify(i 0x08000000, i 0, p 0, p 0)'

  DetailPrint "Configurando o serviço local de impressão do PeriniFood..."
  nsExec::ExecToLog 'powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File "$INSTDIR\resources\print-agent\install-print-agent.ps1" -InstallDir "$INSTDIR"'
  Pop $0
  ${If} $0 != 0
    MessageBox MB_ICONEXCLAMATION|MB_OK "O PeriniFood foi instalado, mas o serviço de impressão não pôde ser iniciado. Código: $0"
  ${EndIf}
!macroend

!macro customUnInstall
  SetShellVarContext current
  Delete "$DESKTOP\PeriniFood.lnk"
  Delete "$SMPROGRAMS\PeriniFood.lnk"
  DetailPrint "Removendo o serviço local de impressão do PeriniFood..."
  nsExec::ExecToLog 'powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File "$INSTDIR\resources\print-agent\uninstall-print-agent.ps1"'
  Pop $0
!macroend
