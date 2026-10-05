// Publica o agente de impressão do Linux em /downloads (roda antes do build),
// para o comando "curl ... | bash" da página /impressao sempre pegar a versão atual.
import { copyFileSync, mkdirSync } from "node:fs";

mkdirSync("public/downloads", { recursive: true });
for (const file of ["perinifood-print-bridge.js", "install-print-agent-linux.sh", "uninstall-print-agent-linux.sh"]) {
  copyFileSync(`scripts/${file}`, `public/downloads/${file}`);
}
