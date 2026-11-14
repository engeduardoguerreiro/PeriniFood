// Instaladores do app desktop "PeriniFood Gestor" (gestor-desktop/). Ficam num
// release do GitHub (arquivos de 100+ MB não cabem no git nem em public/). O app
// só abre /gestor do site, então as melhorias chegam sem reinstalar; troque a
// versão aqui apenas quando publicar instaladores novos (ver gestor-desktop/README.md).
export const GESTOR_APP_VERSION = "1.0.0";
const RELEASE = `https://github.com/engeduardoguerreiro/PeriniFood/releases/download/gestor-v${GESTOR_APP_VERSION}`;

type Download = {
  key: string;
  system: string;
  hint: string;
  label: string;
  file: string;
  size: string;
  // Passos para quem prefere clicar; o comando faz tudo de uma vez no terminal.
  steps: string[];
  command?: string;
  commandHint?: string;
  warning?: string;
};

const file = {
  windows: `PeriniFood-Gestor-Setup-${GESTOR_APP_VERSION}.exe`,
  deb: `perinifood-gestor_${GESTOR_APP_VERSION}_amd64.deb`,
  rpm: `perinifood-gestor-${GESTOR_APP_VERSION}.x86_64.rpm`,
  appimage: `PeriniFood-Gestor-${GESTOR_APP_VERSION}.AppImage`,
};
const url = (name: string) => `${RELEASE}/${name}`;

export const gestorDownloads: Array<Download & { url: string }> = [
  {
    key: "windows",
    system: "Windows",
    hint: "Windows 10 e 11",
    label: "Baixar para Windows",
    file: file.windows,
    size: "97 MB",
    steps: [
      "Clique em \"Baixar para Windows\".",
      "Abra o arquivo baixado e siga o instalador (Avançar até Concluir).",
      "Se aparecer \"O Windows protegeu o computador\", clique em \"Mais informações\" e depois em \"Executar assim mesmo\".",
      "Abra o PeriniFood Gestor pelo ícone da área de trabalho.",
    ],
  },
  {
    key: "deb",
    system: "Ubuntu, Linux Mint, Debian",
    hint: "pacote .deb",
    label: "Baixar .deb",
    file: file.deb,
    size: "94 MB",
    steps: [
      "Abra o Terminal (Ctrl + Alt + T).",
      "Copie o comando abaixo, cole no Terminal (Ctrl + Shift + V) e aperte Enter.",
      "Digite a senha do computador quando pedir (ela não aparece enquanto digita).",
      "Abra o PeriniFood Gestor pelo menu de aplicativos.",
    ],
    command: `wget -O /tmp/perinifood-gestor.deb ${url(file.deb)} && sudo apt install -y /tmp/perinifood-gestor.deb`,
    commandHint: "Baixa e instala o app. Funciona no Ubuntu, Linux Mint e Debian.",
  },
  {
    key: "rpm",
    system: "Fedora",
    hint: "pacote .rpm",
    label: "Baixar .rpm",
    file: file.rpm,
    size: "83 MB",
    steps: [
      "Abra o Terminal.",
      "Copie o comando abaixo, cole no Terminal (Ctrl + Shift + V) e aperte Enter.",
      "Digite a senha do computador quando pedir (ela não aparece enquanto digita).",
      "Abra o PeriniFood Gestor pelo menu de aplicativos.",
    ],
    command: `sudo dnf install -y ${url(file.rpm)}`,
    commandHint: "Baixa e instala o app com tudo o que ele precisa.",
  },
  {
    key: "appimage",
    system: "Outros Linux (AppImage)",
    hint: "só se o .deb ou o .rpm não servir",
    label: "Baixar AppImage",
    file: file.appimage,
    size: "120 MB",
    warning: "O AppImage só abre com o FUSE 2 instalado. Fedora e Ubuntu 22.04 ou mais novo não vêm com ele: sem isso, o arquivo não abre e não mostra erro.",
    steps: [
      "Abra o Terminal.",
      "Copie o comando do seu sistema abaixo, cole no Terminal (Ctrl + Shift + V) e aperte Enter. Ele instala o FUSE 2, baixa o app para a pasta pessoal e abre.",
      "Digite a senha do computador quando pedir.",
      "Nas próximas vezes, abra com dois cliques no arquivo PeriniFood-Gestor.AppImage da pasta pessoal.",
    ],
    command: `sudo apt install -y libfuse2t64 || sudo apt install -y libfuse2; wget -O ~/PeriniFood-Gestor.AppImage ${url(file.appimage)} && chmod +x ~/PeriniFood-Gestor.AppImage && ~/PeriniFood-Gestor.AppImage &`,
    commandHint: "Ubuntu, Linux Mint, Debian e derivados",
  },
].map((item) => ({ ...item, url: url(item.file) }));

// Segundo comando do AppImage (Fedora e derivados).
export const appImageFedoraCommand = `sudo dnf install -y fuse-libs && wget -O ~/PeriniFood-Gestor.AppImage ${url(file.appimage)} && chmod +x ~/PeriniFood-Gestor.AppImage && ~/PeriniFood-Gestor.AppImage &`;
