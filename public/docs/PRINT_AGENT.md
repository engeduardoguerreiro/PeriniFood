# PeriniFood Print Agent

O PeriniFood usa um agente local para imprimir direto nas impressoras instaladas no Windows.

## Por que precisa do agente?

O navegador nao pode acessar impressoras do Windows diretamente por seguranca. O agente roda somente em `127.0.0.1:4127`, detecta as impressoras locais e recebe os pedidos de impressao do sistema.

## Instalacao no computador da loja

1. Instale o Node.js LTS no Windows.
2. Execute com duplo clique:

```text
scripts\install-print-agent.cmd
```

Opcao por terminal:

```powershell
npm run print-agent:install
```

Isso cria a tarefa **PeriniFood Print Agent** no Agendador de Tarefas do Windows e inicia o agente automaticamente sempre que o usuario entrar no Windows.

## Verificacao

Com o agente ativo, abra:

```text
http://127.0.0.1:4127/health
```

O retorno esperado:

```json
{ "ok": true, "app": "PeriniFood Print Agent" }
```

## Diagnostico

Endpoints locais:

- `GET /health`: verifica se o agente esta vivo.
- `GET /status`: mostra impressoras, impressora padrao e situacao atual.
- `GET /printers`: lista impressoras instaladas.
- `GET /diagnostics`: retorna status e logs recentes.
- `POST /print`: recebe o pedido de impressao.

Logs locais:

```text
%LOCALAPPDATA%\PeriniFood\PrintAgent\logs
```

## Remover da inicializacao

```text
scripts\uninstall-print-agent.cmd
```

Opcao por terminal:

```powershell
npm run print-agent:uninstall
```

## Seguranca

O agente fica vinculado a `127.0.0.1`, ou seja, nao expoe impressao na rede. O CORS aceita somente origens conhecidas do PeriniFood e ambientes locais de desenvolvimento.
