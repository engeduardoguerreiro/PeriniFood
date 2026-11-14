# PeriniFood Gestor (Linux e Windows)

App desktop do Gestor de Pedidos, no estilo do gestor do iFood. Ele abre a tela
`/gestor` do PeriniFood numa janela própria e acrescenta recursos de desktop:

- **Bandeja do sistema**: fechar a janela só esconde o app. Ele continua consultando
  os pedidos e tocando o alerta. Para sair, use o ícone da bandeja > Sair.
- **Alerta de pedido novo**: o som toca sem precisar clicar antes, a notificação é
  nativa, a janela pisca e a contagem aparece no ícone da bandeja. Com o app
  escondido, a janela volta para a frente.
- **Inicia com o computador** (ligado na primeira execução; dá para desligar na bandeja).
  Nesse caso abre escondido, direto na bandeja.
- Uma instância só. Guarda o tamanho e a posição da janela.
- F5 recarrega, F11 tela cheia, Ctrl + / Ctrl − / Ctrl 0 para zoom.
- Sem internet, mostra uma tela de aviso e tenta reconectar a cada 15 s.

A impressão automática da comanda usa o mesmo agente local do painel
(`http://127.0.0.1:4127`). Ele é instalado à parte: no Windows pelo instalador do
agente, no Linux por `scripts/install-print-agent-linux.sh`. Sem o agente, a
comanda cai na impressão do sistema.

## Rodar em desenvolvimento

```bash
npm run gestor:install          # na raiz do repositório
npm run dev                     # site em http://localhost:3000
npm run gestor:dev              # app apontando para o localhost
npm run gestor:start            # app apontando para https://perinifood.com.br
```

Para usar outro endereço: `PERINIFOOD_APP_URL=https://... npm --prefix gestor-desktop start`.

## Gerar os instaladores

Os arquivos saem em `dist-gestor/`.

**Linux (AppImage):**

```bash
npm run gestor:dist:linux
```

O `.deb` usa o `fpm`, que precisa da `libcrypt.so.1`. No Fedora ela vem de
`sudo dnf install libxcrypt-compat`. Também dá para gerar dentro do contêiner abaixo.

**Windows (instalador NSIS) a partir do Linux.** É preciso o Wine, e por isso o
build roda no contêiner oficial do electron-builder:

```bash
# na raiz do repositório, depois de npm run gestor:install
podman run --rm -v "$PWD/gestor-desktop":/project/gestor-desktop:Z -v "$PWD/dist-gestor":/project/dist-gestor:Z \
  -w /project/gestor-desktop docker.io/electronuserland/builder:wine \
  npx electron-builder --win nsis --linux deb
```

No próprio Windows, basta `npm run gestor:dist:win`.

O instalador do Windows não é assinado. Na primeira execução, o SmartScreen pode
pedir "Mais informações > Executar assim mesmo".

## Publicar para download

Os instaladores ficam no release `gestor-v<versão>` do GitHub, e a página
`/aplicativo` do painel aponta para eles (`src/lib/gestor-app.ts`). Como o app só
abre o site, as melhorias do gestor chegam sem reinstalar: publique instaladores
novos só quando mudar o próprio app (main.cjs, preload, ícones, Electron).

1. Suba `version` no `package.json` daqui e gere os três instaladores.
2. Crie o release com nomes fixos por versão:
   `PeriniFood-Gestor-Setup-<v>.exe`, `perinifood-gestor_<v>_amd64.deb`, `perinifood-gestor-<v>.x86_64.rpm`, `PeriniFood-Gestor-<v>.AppImage`.
3. Troque `GESTOR_APP_VERSION` em `src/lib/gestor-app.ts` (e os tamanhos) e faça o deploy.

## Instalar

- **Linux AppImage**: `chmod +x PeriniFood-Gestor-*.AppImage` e abra com dois cliques.
  Precisa do FUSE 2 (`libfuse.so.2`), que o Fedora e o Ubuntu 22.04+ não trazem:
  `sudo dnf install fuse-libs` / `sudo apt install libfuse2t64` (ou `libfuse2`).
- **Linux .rpm** (Fedora): `sudo dnf install ./perinifood-gestor-*.x86_64.rpm`.
  Gere com `npx electron-builder --linux rpm` no mesmo contêiner (o fpm do host
  precisa de `libxcrypt-compat`).
- **Linux .deb** (Ubuntu, Mint, Debian): `sudo apt install ./PeriniFood-Gestor-*.deb`.
- **Windows**: execute `PeriniFood-Gestor-*-win-x64.exe`.

Na primeira abertura, entre com o e-mail e a senha do painel. A sessão fica salva.
