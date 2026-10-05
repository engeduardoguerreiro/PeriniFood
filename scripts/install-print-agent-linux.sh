#!/usr/bin/env bash
# Instala o agente de impressão do PeriniFood no Linux (Ubuntu, Mint, Debian...).
# Roda como serviço do usuário (systemd) e inicia sozinho com o computador.
# Uso:  curl -fsSL https://perinifood.com.br/downloads/install-print-agent-linux.sh | bash
set -euo pipefail

APP_URL="${PERINIFOOD_URL:-https://perinifood.com.br}"
DIR="${XDG_DATA_HOME:-$HOME/.local/share}/PeriniFood/PrintAgent/app"
UNIT_DIR="$HOME/.config/systemd/user"
UNIT="$UNIT_DIR/perinifood-print-agent.service"

echo "== Agente de impressão PeriniFood (Linux) =="

NODE="$(command -v node || true)"
if [ -z "$NODE" ]; then
  echo "Node.js não encontrado. Instale com:  sudo apt install -y nodejs   e rode este script de novo."
  exit 1
fi
MAJOR="$("$NODE" -p 'process.versions.node.split(".")[0]')"
if [ "$MAJOR" -lt 18 ]; then
  echo "Node.js $MAJOR é antigo; é preciso a versão 18 ou mais nova."
  exit 1
fi
if ! command -v lp >/dev/null 2>&1; then
  echo "Sistema de impressão (CUPS) não encontrado. Instale com:  sudo apt install -y cups"
  exit 1
fi

mkdir -p "$DIR" "$UNIT_DIR"
# Rodando a partir do repositório usa a cópia local; via "curl | bash" baixa do site.
HERE=""
if [ -n "${BASH_SOURCE[0]:-}" ] && [ -f "${BASH_SOURCE[0]}" ]; then HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"; fi
if [ -n "$HERE" ] && [ -f "$HERE/perinifood-print-bridge.js" ]; then
  cp "$HERE/perinifood-print-bridge.js" "$DIR/perinifood-print-bridge.js"
else
  curl -fsSL "$APP_URL/downloads/perinifood-print-bridge.js" -o "$DIR/perinifood-print-bridge.js"
fi

cat > "$UNIT" <<UNITFILE
[Unit]
Description=PeriniFood - agente de impressão
After=network-online.target

[Service]
ExecStart="$NODE" "$DIR/perinifood-print-bridge.js"
Restart=always
RestartSec=3

[Install]
WantedBy=default.target
UNITFILE

systemctl --user daemon-reload
systemctl --user enable --now perinifood-print-agent.service
systemctl --user restart perinifood-print-agent.service
sleep 2

if curl -fsS http://127.0.0.1:4127/health >/dev/null 2>&1; then
  echo "Pronto! Agente rodando em http://127.0.0.1:4127"
  echo "Impressoras encontradas:"
  lpstat -p 2>/dev/null | sed 's/^/  /' || true
  echo "Abra o painel do PeriniFood: o indicador deve mostrar 'Agente online'."
else
  echo "O serviço foi instalado mas não respondeu. Veja o erro com:"
  echo "  journalctl --user -u perinifood-print-agent -n 50"
  exit 1
fi
