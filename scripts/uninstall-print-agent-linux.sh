#!/usr/bin/env bash
# Remove o agente de impressão do PeriniFood do Linux.
set -euo pipefail
systemctl --user disable --now perinifood-print-agent.service 2>/dev/null || true
rm -f "$HOME/.config/systemd/user/perinifood-print-agent.service"
systemctl --user daemon-reload
rm -rf "${XDG_DATA_HOME:-$HOME/.local/share}/PeriniFood/PrintAgent/app"
echo "Agente de impressão removido."
