#!/usr/bin/env bash
# Agendador do iFood: chama o polling do PeriniFood a cada 30 s (pedidos novos e
# presença da loja no iFood). Rode no servidor Ubuntu que fica ligado 24 h:
#   sudo bash install.sh
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [ ! -f "$HERE/.env" ]; then
  echo "Falta o arquivo .env nesta pasta (copie .env.example para .env e preencha)."
  exit 1
fi
if [ "$(id -u)" -ne 0 ]; then echo "Rode com sudo: sudo bash install.sh"; exit 1; fi
command -v curl >/dev/null || apt-get install -y curl

install -m 600 "$HERE/.env" /etc/perinifood-ifood-poller.env

cat > /etc/systemd/system/perinifood-ifood-poller.service <<'UNIT'
[Unit]
Description=PeriniFood - polling do iFood
After=network-online.target
Wants=network-online.target

[Service]
Type=oneshot
EnvironmentFile=/etc/perinifood-ifood-poller.env
ExecStart=/bin/sh -c 'curl -fsS --max-time 25 -H "Authorization: Bearer $IFOOD_POLL_SECRET" "${PERINIFOOD_URL:-https://perinifood.com.br}/api/integrations/ifood/poll"'
UNIT

cat > /etc/systemd/system/perinifood-ifood-poller.timer <<'UNIT'
[Unit]
Description=PeriniFood - polling do iFood a cada 30 segundos

[Timer]
OnBootSec=20s
OnUnitActiveSec=30s
AccuracySec=1s

[Install]
WantedBy=timers.target
UNIT

systemctl daemon-reload
systemctl enable --now perinifood-ifood-poller.timer
systemctl start perinifood-ifood-poller.service || true
sleep 1
echo
echo "Última chamada:"
journalctl -u perinifood-ifood-poller.service -n 3 --no-pager -o cat || true
echo
echo "Pronto. Para acompanhar: journalctl -u perinifood-ifood-poller -f"
