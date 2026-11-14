// Instaladores do app desktop "PeriniFood Gestor" (gestor-desktop/). Ficam num
// release do GitHub (arquivos de 100+ MB não cabem no git nem em public/). O app
// só abre /gestor do site, então as melhorias chegam sem reinstalar; troque a
// versão aqui apenas quando publicar instaladores novos (ver gestor-desktop/README.md).
export const GESTOR_APP_VERSION = "1.0.0";
const RELEASE = `https://github.com/engeduardoguerreiro/PeriniFood/releases/download/gestor-v${GESTOR_APP_VERSION}`;

export const gestorDownloads = [
  { key: "windows", system: "Windows 10 e 11", label: "Baixar para Windows", file: `PeriniFood-Gestor-Setup-${GESTOR_APP_VERSION}.exe`, size: "97 MB" },
  { key: "deb", system: "Linux Ubuntu, Mint, Debian", label: "Baixar .deb", file: `perinifood-gestor_${GESTOR_APP_VERSION}_amd64.deb`, size: "94 MB" },
  { key: "appimage", system: "Qualquer Linux (AppImage)", label: "Baixar AppImage", file: `PeriniFood-Gestor-${GESTOR_APP_VERSION}.AppImage`, size: "120 MB" },
].map((item) => ({ ...item, url: `${RELEASE}/${item.file}` }));
