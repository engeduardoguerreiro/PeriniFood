# PeriniFood Print Agent

## Arquitetura

- O SaaS continua rodando no navegador.
- O agente local roda no Windows em `http://127.0.0.1:4127`.
- O frontend verifica `/status` ao abrir o painel e antes de imprimir.
- O agente lista impressoras instaladas, salva a impressora padrão local e envia impressão via RAW ESC/POS com fallback para `Out-Printer`.
- Logs ficam em `%LOCALAPPDATA%\PeriniFood\PrintAgent\logs`.

## Instalar para iniciar com o Windows

Execute no computador da loja:

```powershell
npm run print-agent:install
```

O script cria a tarefa agendada **PeriniFood Print Agent** no login do usuário e inicia o agente em segundo plano.

Para atendimento simples ao cliente final, também existe o arquivo:

```text
scripts\install-print-agent.cmd
```

Ele pode ser executado com duplo clique no Windows.

## Remover

```powershell
npm run print-agent:uninstall
```

Ou execute `scripts\uninstall-print-agent.cmd`.

## Endpoints locais

- `GET /health`
- `GET /status`
- `GET /printers`
- `GET /config`
- `POST /config`
- `GET /diagnostics`
- `GET /logs`
- `POST /print`

## Segurança

O agente usa bind em `127.0.0.1` e não aceita conexões externas por padrão. O CORS só libera origens conhecidas do PeriniFood e localhost. Caso queira exigir token local, defina `PRINT_BRIDGE_TOKEN` no ambiente do agente e envie o header `X-PeriniFood-Print-Token`.

## Operação esperada

1. O cliente abre o PeriniFood.
2. O cabeçalho mostra o status da impressora.
3. Em Configurações > Impressão de pedidos, o sistema lista as impressoras.
4. A impressora escolhida é salva no SaaS e no agente local.
5. Antes de imprimir, o sistema valida agente ativo, impressora existente e disponibilidade.
6. Em falha, o usuário recebe mensagem clara e o erro fica nos logs.
