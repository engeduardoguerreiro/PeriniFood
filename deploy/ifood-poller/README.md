# Agendador do iFood

O iFood (app distribuído) entrega pedidos por **polling**: o PeriniFood precisa
consultar a fila a cada 30 segundos. Essa consulta também é o "heartbeat" que
mantém a loja aberta no iFood. A Vercel não agenda tarefas nesse intervalo, então
quem chama é o agendador do próprio Supabase.

## Recomendado: agendador do Supabase (pg_cron)

Cole `supabase-cron.sql` no SQL Editor do Supabase, trocando `COLE_AQUI` pelo
`IFOOD_POLL_SECRET` da Vercel (o mesmo do `.env` desta pasta). Não depende de
nenhum computador ligado.

## Alternativa: timer systemd num servidor Linux 24 h

1. Copie esta pasta para o servidor (ex.: `~/perinifood-ifood-poller`).
2. Confira o arquivo `.env` (mesmo `IFOOD_POLL_SECRET` da Vercel).
3. Rode: `sudo bash install.sh`

A resposta esperada a cada chamada é algo como
`{"ok":true,"polled":0,"processed":0,"stores":1,"failedStores":0}`.

## Comandos úteis

- Ver as chamadas: `journalctl -u perinifood-ifood-poller -f`
- Parar: `sudo systemctl disable --now perinifood-ifood-poller.timer`
