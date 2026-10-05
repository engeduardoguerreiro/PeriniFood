# Servidor de WhatsApp do PeriniFood

Mantém conectado o WhatsApp de cada loja (login por QR Code, como no WhatsApp Web).
O PeriniFood usa este servidor para enviar as mensagens automáticas de status e para
receber as mensagens dos clientes (atendente de IA).

> **Atenção:** a conexão por QR Code é não oficial (mesmo modelo dos sistemas de robô
> de WhatsApp do mercado). Existe risco de o WhatsApp restringir ou banir um número,
> principalmente com envio em massa. As mensagens do PeriniFood são só respostas e
> avisos de pedido, o que reduz bastante esse risco.

## Requisitos do servidor

- Ubuntu 22.04 ou mais novo, ligado 24h, com ~2 GB de RAM livres e internet estável.
- Docker e Docker Compose.
- Um endereço HTTPS público (ex.: `https://whatsapp.seudominio.com.br`). Se o servidor
  está em casa/atrás de roteador, use o **Cloudflare Tunnel** (passo 4) — grátis e sem
  abrir portas no roteador.

## 1. Instalar o Docker

```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER   # depois saia e entre de novo na sessão
```

## 2. Copiar esta pasta para o servidor

Copie a pasta `deploy/whatsapp-server` do projeto para o servidor (ex.: `~/perinifood-whatsapp`).

## 3. Configurar e subir

```bash
cd ~/perinifood-whatsapp
cp .env.example .env
openssl rand -hex 32   # use para AUTHENTICATION_API_KEY
openssl rand -hex 24   # use para POSTGRES_PASSWORD
nano .env              # preencha as chaves e o SERVER_URL
docker compose up -d
docker compose logs -f evolution   # deve mostrar o servidor iniciado na porta 8080
```

O serviço fica escutando só em `127.0.0.1:8080` (não exposto direto na internet).

## 4. Publicar com HTTPS (Cloudflare Tunnel)

Precisa de um domínio gerenciado na Cloudflare (pode ser `perinifood.com.br`).

```bash
# instalar o cloudflared
curl -L --output cloudflared.deb https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
sudo dpkg -i cloudflared.deb
cloudflared tunnel login
cloudflared tunnel create perinifood-whatsapp
cloudflared tunnel route dns perinifood-whatsapp whatsapp.perinifood.com.br
```

Crie `~/.cloudflared/config.yml` (troque o ID pelo que o comando `create` mostrou):

```yaml
tunnel: <ID-DO-TUNEL>
credentials-file: /home/<usuario>/.cloudflared/<ID-DO-TUNEL>.json
ingress:
  - hostname: whatsapp.perinifood.com.br
    service: http://127.0.0.1:8080
  - service: http_status:404
```

```bash
sudo cloudflared service install
sudo systemctl enable --now cloudflared
curl https://whatsapp.perinifood.com.br   # deve responder com a mensagem da Evolution API
```

> Servidor com IP público e portas 80/443 liberadas? Em vez do túnel dá para usar o
> Caddy como proxy HTTPS (`whatsapp.seudominio.com.br { reverse_proxy 127.0.0.1:8080 }`).

## 5. Ligar no PeriniFood (variáveis na Vercel)

Em Vercel → Settings → Environment Variables (Production), adicione:

| Variável | Valor |
|---|---|
| `EVOLUTION_API_URL` | `https://whatsapp.perinifood.com.br` |
| `EVOLUTION_API_KEY` | o mesmo `AUTHENTICATION_API_KEY` do `.env` |
| `WHATSAPP_WEBHOOK_SECRET` | outro valor aleatório (`openssl rand -hex 32`) |

Depois publique de novo (`vercel deploy --prod`). Cada loja conecta o próprio WhatsApp em
**Integrações → WhatsApp** no painel, lendo o QR Code com o celular.

## Manutenção

```bash
docker compose pull && docker compose up -d   # atualizar
docker compose logs --tail 200 evolution      # ver erros
docker compose restart evolution              # reiniciar
```

As sessões ficam salvas nos volumes do Docker: reiniciar o servidor não desconecta as lojas.
