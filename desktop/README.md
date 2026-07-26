# Aplicativo Windows do PeriniFood

O aplicativo desktop é uma janela Windows dedicada para a versão online do PeriniFood. Ele abre diretamente no login do restaurante. O banco de dados e as atualizações permanecem na Vercel/Supabase; o cliente não precisa abrir nem digitar endereços no navegador.

O mesmo instalador registra o PeriniFood Print Agent para iniciar com o Windows. O agente roda localmente em `http://127.0.0.1:4127`, detecta as impressoras do perfil do usuário e permite impressão RAW ESC/POS com fallback do Windows.

## Testar localmente

```powershell
npm.cmd install
npm.cmd run desktop:install
npm.cmd run desktop:dev
```

## Gerar o instalador

```powershell
npm.cmd run desktop:build
```

O instalador é criado em `dist-desktop/PeriniFood-Setup-0.4.0.exe`.

## Usar outro endereço

O endereço padrão é `https://perinifood.vercel.app`. Para testar outro ambiente:

```powershell
$env:PERINIFOOD_APP_URL = "https://seu-dominio.com"
npm.cmd run desktop:dev
```
