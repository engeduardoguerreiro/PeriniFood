# GastroFlow

MVP SaaS para restaurantes, bares, pizzarias, hamburguerias e deliveries, criado com Next.js App Router, TypeScript, Tailwind CSS e Supabase.

## Funcionalidades

- Landing page pública com planos e CTA.
- Login e cadastro com criação do primeiro restaurante.
- Multiempresa por `restaurant_id`.
- Dashboard com métricas, últimos pedidos e status da loja.
- CRUD funcional de categorias, tipos, opções de pizza, adicionais e produtos.
- Cadastro de produto com tamanhos de pizza, massas, bordas e adicionais por produto.
- PDV com carrinho, adicionais, bordas, massas, taxa de entrega e impressão.
- Cardápio público por slug com envio de pedido para o painel.
- Lista operacional de pedidos com alteração de status.
- Clientes, configurações, upload de logo/banner e taxas de entrega por raio.
- Tela de integrações para iFood, 99Food, Keeta, Rappi, WhatsApp e webhook.
- Providers mockados em `src/lib/integrations/providers/*`.
- Endpoint `POST /api/integrations/webhook/[provider]`.
- SQL completo com tabelas, enums, triggers, grants, índices e RLS.

## Como rodar

```bash
npm install
cp .env.example .env.local
npm run dev
```

Abra `http://localhost:3000`.

## Configurar Supabase

1. Crie um projeto no Supabase.
2. No SQL Editor, aplique as migrations em `supabase/migrations`.
3. Em Project Settings > API, copie:
   - `Project URL` para `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` para `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` para `SUPABASE_SERVICE_ROLE_KEY`
4. Configure autenticação por email/senha em Authentication > Providers.

As políticas RLS garantem que usuários autenticados só acessem dados dos restaurantes onde estão em `restaurant_users`. As rotas públicas leem apenas restaurante/cardápio e permitem criar pedidos de origem `site`.

## Variáveis de ambiente

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
DATABASE_URL=
```

`SUPABASE_SERVICE_ROLE_KEY` fica apenas no servidor e é usada no webhook interno para registrar pedidos externos e logs.

## Integrações futuras

A arquitetura está preparada em:

- `src/lib/integrations/providers/ifood.ts`
- `src/lib/integrations/providers/food99.ts`
- `src/lib/integrations/providers/keeta.ts`
- `src/lib/integrations/providers/rappi.ts`
- `src/lib/integrations/providers/webhook.ts`

Cada provider expõe:

- `connect()`
- `testConnection()`
- `fetchOrders()`
- `acceptOrder()`
- `rejectOrder()`
- `updateOrderStatus()`
- `syncMenu()`
- `parseExternalOrder()`

Quando houver credenciais reais, substitua o mock por chamadas HTTP oficiais, mantendo o contrato dos providers.

## Webhook interno

Endpoint:

```http
POST /api/integrations/webhook/[provider]
```

Providers válidos: `ifood`, `99food`, `keeta`, `rappi`, `webhook`.

Envie `x-restaurant-id` no header ou `restaurant_id` no payload. O endpoint registra em `integration_logs`, converte o payload para pedido interno e cria `orders`/`order_items`.

## Deploy na Vercel

1. Configure as variáveis de ambiente na Vercel.
2. Rode build local:

```bash
npm run build
```

3. Faça o deploy pelo painel da Vercel ou pelo CLI.

## Observações de MVP

Caixa, mesas, clientes e relatórios já possuem telas conectadas ao banco e estrutura pronta. Alguns fluxos avançados, como fechar comanda e sumarização de produtos mais vendidos, estão preparados para evolução incremental.
