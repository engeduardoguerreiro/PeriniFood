# Dossie do Projeto - PeriniFood / GastroFlow

Gerado em: 11/06/2026  
Pasta analisada: `E:\ARQUIVOS EDUARDO\PERINI FOOD`

> Observacao: o contexto da conversa apontava para `E:\ARQUIVOS EDUARDO\ERP PERINI RESTAURANTES`, mas essa pasta nao existe neste computador no momento da analise. A pasta encontrada que corresponde ao projeto de restaurantes foi `E:\ARQUIVOS EDUARDO\PERINI FOOD`.

## 1. Resumo executivo

O projeto e um SaaS/MVP para restaurantes, bares, pizzarias, hamburguerias e deliveries. A aplicacao permite operar cardapio, pedidos, PDV, clientes, delivery, relatorios, configuracoes do restaurante e integracoes com canais externos.

Nome no `package.json`: `perinifood`  
Nome publico no README: `GastroFlow`  
Framework: Next.js App Router  
Linguagem: TypeScript  
Interface: React, Tailwind CSS e componentes locais  
Banco: Supabase/PostgreSQL  
ORM/modelagem: Prisma  
Deploy vinculado: Vercel, projeto `perinifood`

## 2. Stack principal

| Area | Tecnologia |
| --- | --- |
| Frontend/backend web | Next.js `16.2.6` |
| UI | React `19.2.4`, React DOM `19.2.4` |
| Linguagem | TypeScript `^5` |
| Estilos | Tailwind CSS `^4`, PostCSS |
| Banco | PostgreSQL via Supabase |
| Cliente Supabase | `@supabase/supabase-js`, `@supabase/ssr` |
| ORM/schema | Prisma `^7.8.0`, `@prisma/client` |
| Icones | `lucide-react` |
| Utilitarios | `clsx` |
| Lint | ESLint `^9`, `eslint-config-next` |

## 3. Scripts NPM

| Script | Funcao |
| --- | --- |
| `npm.cmd run dev` | Sobe o Next.js em desenvolvimento |
| `npm.cmd run build` | Gera build de producao |
| `npm.cmd run start` | Sobe a build de producao |
| `npm.cmd run lint` | Executa ESLint |
| `npm.cmd run prisma:validate` | Valida o schema Prisma |
| `npm.cmd run prisma:migrate` | Executa migrations Prisma em desenvolvimento |
| `npm.cmd run seed` / `npm.cmd run db:seed` | Executa `prisma/seed.mjs` |
| `npm.cmd run print-bridge` | Inicia o agente local de impressao |
| `npm.cmd run print-agent:build-exe` | Gera executavel do agente de impressao |
| `npm.cmd run print-agent:build-installer` | Gera instalador do agente |
| `npm.cmd run print-agent:install` | Instala agente de impressao como tarefa no Windows |
| `npm.cmd run print-agent:uninstall` | Remove agente de impressao |

## 4. Variaveis de ambiente

Arquivo exemplo: `.env.example`

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
DATABASE_URL=
```

Existe tambem um `.env.local` na pasta do projeto, mas os valores nao foram copiados para este documento por seguranca.

Uso esperado:

- `NEXT_PUBLIC_SUPABASE_URL`: URL publica do projeto Supabase.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: chave anon/public do Supabase.
- `SUPABASE_SERVICE_ROLE_KEY`: chave privilegiada usada apenas no servidor.
- `DATABASE_URL`: conexao PostgreSQL usada por Prisma/Supabase.

## 5. Deploy e Vercel

Arquivo encontrado: `.vercel/project.json`

```json
{
  "projectId": "prj_ABpBtZejLrGojjibHNgpXVvfsDVh",
  "orgId": "team_nmZyPUUUswbTYSMs652SqcqB",
  "projectName": "perinifood"
}
```

Alias publico nao foi verificado online nesta analise. O projeto local esta vinculado ao projeto Vercel chamado `perinifood`.

## 6. Configuracoes tecnicas

### Next.js

Arquivo: `next.config.ts`

- Usa `experimental.serverActions.bodySizeLimit = "8mb"`.
- Esse limite maior atende formularios/uploads via Server Actions.

### TypeScript

Arquivo: `tsconfig.json`

- `strict: true`
- `jsx: react-jsx`
- `moduleResolution: bundler`
- Alias `@/*` apontando para `./src/*`
- `noEmit: true`
- Inclui tipos gerados do Next em `.next/types` e `.next/dev/types`

### ESLint

Arquivo: `eslint.config.mjs`

- Usa `eslint-config-next/core-web-vitals`
- Usa `eslint-config-next/typescript`
- Ignora `.next`, `out`, `build` e `next-env.d.ts`

### Observacao de agente

Arquivo: `AGENTS.md`

O projeto tem aviso importante: a versao de Next.js usada pode ter APIs e convencoes diferentes de versoes anteriores. Antes de alterar codigo Next.js, consultar documentacao local em `node_modules/next/dist/docs/`.

## 7. Estrutura de pastas

| Pasta/arquivo | Finalidade |
| --- | --- |
| `src/app` | Rotas App Router, paginas, layouts, APIs e Server Actions |
| `src/components` | Componentes reutilizaveis de UI e negocio |
| `src/lib` | Helpers de auth, Supabase, relatorios, integracoes e utilitarios |
| `src/integrations` | Nucleo e providers de integracoes externas |
| `prisma` | Schema Prisma, migration Prisma inicial e seed |
| `supabase` | Schema SQL e migrations Supabase |
| `scripts` | Scripts do agente local de impressao |
| `docs` | Documentacao interna, especialmente impressao |
| `public` | Imagens, logos, assets e uploads publicos |
| `.vercel` | Vinculo local com projeto Vercel |
| `.next`, `dist`, `node_modules` | Artefatos gerados/dependencias |

## 8. Modulos funcionais

### Publico/comercial

- Landing page em `/`
- Planos em `/planos`
- Login em `/login`
- Cadastro em `/register`
- Cardapio publico por slug em `/cardapio/[slug]`
- Atalho legado de cardapio em `/r/[slug]`
- Checkout publico em `/cardapio/[slug]/checkout`
- Conta do cliente em `/cardapio/[slug]/conta`
- Acompanhamento de pedido em `/pedido/[codigo]`

### Backoffice/dashboard

- Dashboard principal em `/dashboard`
- Pedidos em `/dashboard/orders`
- Detalhe de pedido em `/dashboard/orders/[id]`
- PDV em `/dashboard/pdv`
- Cardapio/menu em `/dashboard/menu`
- Produtos em `/dashboard/products`
- Categorias em `/dashboard/categories`
- Clientes em `/dashboard/customers`
- Delivery em `/dashboard/delivery`
- Mesas em `/dashboard/tables`
- Caixa em `/dashboard/cash-register`
- Relatorios em `/dashboard/reports`
- Configuracoes em `/dashboard/settings`
- Integracoes em `/dashboard/integrations`
- Cardapio online em `/dashboard/online-menu`

### Rotas administrativas alternativas

Tambem existem rotas fora de `/dashboard`, possivelmente telas antigas ou atalhos:

- `/cardapio`
- `/cardapio/produtos`
- `/cardapio/produtos/novo`
- `/cardapio/produtos/[id]`
- `/cardapio/categorias`
- `/cardapio/tipos`
- `/cardapio/adicionais`
- `/cardapio/opcoes-pizza`
- `/pedidos`
- `/pedidos/novo`
- `/pedidos/[id]`
- `/pedidos/[id]/editar`
- `/pedidos/[id]/print`
- `/clientes`
- `/clientes/[id]`
- `/configuracoes`
- `/cupons`

### Relatorios

- `/relatorios`
- `/relatorios/vendas`
- `/relatorios/produtos`
- `/relatorios/pedidos`
- `/relatorios/clientes`
- `/relatorios/pagamentos`
- `/relatorios/delivery`
- `/relatorios/exportacoes`
- `/relatorios/pdf`

Tipos de relatorio identificados:

- Vendas
- Produtos
- Pedidos
- Clientes
- Pagamentos
- Delivery

### Integracoes

- `/integracoes`
- `/integracoes/[provider]`
- `/integracoes/logs`
- `/integracoes/webhooks`
- `/integracoes/whatsapp`

Providers tratados no codigo:

- iFood
- 99Food
- Keeta
- Rappi
- WhatsApp
- Webhook proprio
- Cardapio proprio

## 9. APIs HTTP

| Metodo | Rota | Finalidade inferida |
| --- | --- | --- |
| `GET` | `/api/addons` | Listar adicionais |
| `POST` | `/api/addons` | Criar adicional |
| `GET` | `/api/categories` | Listar categorias |
| `POST` | `/api/categories` | Criar categoria |
| `GET` | `/api/categories/[id]` | Buscar categoria |
| `PUT` | `/api/categories/[id]` | Atualizar categoria |
| `DELETE` | `/api/categories/[id]` | Excluir categoria |
| `GET` | `/api/products` | Listar produtos |
| `POST` | `/api/products` | Criar produto |
| `GET` | `/api/products/[id]` | Buscar produto |
| `PUT` | `/api/products/[id]` | Atualizar produto |
| `DELETE` | `/api/products/[id]` | Excluir produto |
| `GET` | `/api/customers` | Listar clientes |
| `POST` | `/api/customers` | Criar cliente |
| `GET` | `/api/orders` | Listar pedidos |
| `POST` | `/api/orders` | Criar pedido |
| `GET` | `/api/orders/[id]` | Buscar pedido |
| `PUT` | `/api/orders/[id]` | Atualizar pedido |
| `PATCH` | `/api/orders/[id]/status` | Alterar status do pedido |
| `GET` | `/api/menu/[slug]` | Consultar cardapio publico |
| `POST` | `/api/customer-auth/login` | Login de cliente |
| `POST` | `/api/customer-auth/register` | Cadastro de cliente |
| `GET` | `/api/customer-auth/profile` | Perfil do cliente |
| `PATCH` | `/api/customer-auth/profile` | Atualizar perfil do cliente |
| `POST` | `/api/integrations/webhook/[provider]` | Webhook de provider externo |
| `POST` | `/api/integrations/[provider]/webhook` | Webhook alternativo por provider |
| `POST` | `/api/integrations/custom-webhook/orders` | Entrada de pedidos via webhook customizado |
| `GET` | `/api/relatorios/exportar` | Exportacao de relatorios |

## 10. Server Actions principais

Arquivo: `src/app/actions.ts`

Autenticacao e conta:

- `signIn`
- `signOut`
- `register`
- `updatePassword`

Cardapio:

- `saveCategory`
- `toggleCategory`
- `deleteCategory`
- `saveProductType`
- `toggleProductType`
- `deleteProductType`
- `savePizzaOption`
- `togglePizzaOption`
- `deletePizzaOption`
- `saveProduct`
- `toggleProduct`
- `deleteProduct`
- `toggleProductFeatured`
- `saveProductVariant`
- `saveAddon`
- `toggleAddon`

Restaurante/configuracoes:

- `updateRestaurant`
- `updateStoreOperationStatus`
- `saveDeliveryFeeRules`

Pedidos/PDV:

- `updateOrderStatus`
- `deleteOrder`
- `createPdvOrder`
- `updatePdvOrder`
- `createOnlineOrder`
- `createPublicOrder`

Clientes/cupons:

- `saveCustomer`
- `deleteCustomer`
- `saveCoupon`
- `deleteCoupon`
- `saveLoyaltyProgram`

Integracoes:

- `saveIntegration`
- `testIntegration`
- `saveProductMap`
- `savePaymentMap`
- `legacySaveIntegration`

## 11. Banco de dados

### Prisma

Arquivo: `prisma/schema.prisma`

Datasource:

- Provider: `postgresql`

Generator:

- Provider: `prisma-client`
- Output: `../src/generated/prisma`

Enums:

- `RestaurantRole`
- `OrderSource`
- `OrderType`
- `OrderStatus`
- `PaymentStatus`
- `PaymentMethod`
- `IntegrationProvider`
- `IntegrationStatus`
- `IntegrationEnvironment`
- `IntegrationAuthType`
- `ExternalOrderStatus`

Models/tabelas principais:

- `Restaurant`
- `ProductType`
- `RestaurantUser`
- `Category`
- `Product`
- `ProductVariant`
- `ProductAddon`
- `Customer`
- `CustomerAddress`
- `Order`
- `Integration`
- `IntegrationProductMap`
- `IntegrationPaymentMap`
- `IntegrationOrder`
- `IntegrationLog`
- `OrderItem`
- `OrderItemAddon`

### Relacionamentos importantes

- Um restaurante possui categorias, produtos, tipos de produto, adicionais, clientes, pedidos, usuarios e integracoes.
- Produtos pertencem a restaurante e opcionalmente a categoria/tipo.
- Pedidos pertencem a restaurante e podem pertencer a cliente.
- Pedidos possuem itens e itens podem possuir adicionais.
- Integracoes pertencem a restaurante e possuem mapas de produtos, mapas de pagamento, pedidos externos e logs.
- `RestaurantUser` liga usuarios autenticados aos restaurantes e seus papeis.

### Supabase

Arquivos:

- `supabase/schema.sql`
- `supabase/migrations/*`

Migrations encontradas:

1. `20260521000100_mvp_schema.sql`
2. `20260521000200_product_types.sql`
3. `20260521000300_pizza_options.sql`
4. `20260522000100_align_remote_schema.sql`
5. `20260522000200_product_builder_fields.sql`
6. `20260522000300_delivery_fee_rules.sql`
7. `20260522000400_restaurant_site_cover.sql`
8. `20260522000500_product_flavors.sql`
9. `20260523000100_restaurant_pizza_flavor_settings.sql`
10. `20260523000200_checkout_customer_payment_settings.sql`
11. `20260523000300_allow_pizza_size_options.sql`
12. `20260523000400_integrations_module.sql`
13. `20260524000100_coupons_loyalty.sql`
14. `20260524000300_customer_email_login.sql`
15. `20260524000400_restaurant_company_fields.sql`
16. `20260524000500_restaurant_address_number_neighborhood.sql`
17. `20260524000600_restaurant_manual_open_status.sql`
18. `20260524000700_customer_account_address_fields.sql`

## 12. Autenticacao e permissoes

Arquivos relevantes:

- `src/lib/auth.ts`
- `src/lib/customer-auth.ts`
- `src/lib/api-helpers.ts`
- `src/lib/supabase/server.ts`
- `src/lib/supabase/browser.ts`
- `src/lib/supabase/service.ts`
- `src/proxy.ts`

Pontos principais:

- Auth do painel usa Supabase.
- `requireRestaurant()` garante contexto de restaurante autenticado.
- `restaurant_users` controla permissao multiempresa por `restaurant_id`.
- Clientes publicos possuem fluxo separado em `/api/customer-auth/*`.
- `SUPABASE_SERVICE_ROLE_KEY` e usado apenas em rotas/server side.

## 13. Componentes

Componentes principais em `src/components`:

- `app-frame.tsx`
- `app-shell.tsx`
- `brand-logo.tsx`
- `cart-builder.tsx`
- `manual-order-builder.tsx`
- `public-menu-order.tsx`
- `public-checkout.tsx`
- `public-customer-account.tsx`
- `landing-experience.tsx`
- `opening-hours-editor.tsx`
- `delivery-fee-rules-editor.tsx`
- `printer-agent-indicator.tsx`
- `printer-discovery.tsx`
- `order-print-client.tsx`
- `settings-cep-lookup.tsx`
- `status-badge.tsx`
- `empty-state.tsx`
- `action-feedback.tsx`
- `integrations/integration-ui.tsx`

Componentes de relatorios:

- `DateRangeFilter.tsx`
- `EmptyReportState.tsx`
- `ExportButton.tsx`
- `PdfButton.tsx`
- `ReportCard.tsx`
- `ReportChart.tsx`
- `ReportFilters.tsx`
- `ReportHeader.tsx`
- `ReportTable.tsx`

## 14. Bibliotecas internas

Arquivos em `src/lib`:

- `api-helpers.ts`: helpers para APIs autenticadas e leitura JSON.
- `auth.ts`: sessao e restaurante atual.
- `customer-auth.ts`: hash/verificacao de senha e perfil seguro de cliente.
- `delivery-fee-rules.ts`: regras de taxa de entrega.
- `opening-hours.ts`: horario de funcionamento e status aberto/fechado.
- `reports.ts`: datasets, agregacoes, labels e CSV de relatorios.
- `utils.ts`: classes, dinheiro, slug, permissoes, telefone/WhatsApp, status.
- `types.ts`: tipos compartilhados.
- `supabase/browser.ts`: cliente Supabase para browser.
- `supabase/server.ts`: cliente Supabase server side.
- `supabase/service.ts`: cliente Supabase service role.

Integracoes em `src/lib/integrations`:

- `catalog.ts`
- `external-order.ts`
- `security.ts`
- `types.ts`
- `providers/ifood.ts`
- `providers/food99.ts`
- `providers/keeta.ts`
- `providers/rappi.ts`
- `providers/webhook.ts`
- `providers/index.ts`

## 15. Nucleo de integracoes

Arquivos em `src/integrations`:

- `core/create-order-from-external.ts`
- `core/log.ts`
- `core/normalize.ts`
- `core/types.ts`
- `providers/99food/*`
- `providers/ifood/*`
- `providers/keeta/*`

Cada provider possui estrutura para:

- status
- mock payload
- mapper
- index/export

O README informa que os providers ainda podem estar mockados e preparados para substituicao por chamadas HTTP oficiais.

## 16. Impressao local

Documentacao: `docs/PRINT_AGENT.md` e `public/docs/PRINT_AGENT.md`

Arquitetura:

- O SaaS roda no navegador.
- O agente local roda no Windows em `http://127.0.0.1:4127`.
- O painel verifica `/status` ao abrir e antes de imprimir.
- O agente lista impressoras instaladas.
- A impressao usa RAW ESC/POS com fallback para `Out-Printer`.
- Logs ficam em `%LOCALAPPDATA%\PeriniFood\PrintAgent\logs`.

Endpoints locais do agente:

- `GET /health`
- `GET /status`
- `GET /printers`
- `GET /config`
- `POST /config`
- `GET /diagnostics`
- `GET /logs`
- `POST /print`

Seguranca:

- Bind em `127.0.0.1`.
- CORS libera origens conhecidas do PeriniFood e localhost.
- Token opcional via `PRINT_BRIDGE_TOKEN` e header `X-PeriniFood-Print-Token`.

Scripts relacionados:

- `scripts/perinifood-print-bridge.js`
- `scripts/install-print-agent.ps1`
- `scripts/install-print-agent.cmd`
- `scripts/uninstall-print-agent.ps1`
- `scripts/uninstall-print-agent.cmd`
- `scripts/start-print-agent.ps1`
- `scripts/start-print-agent.cmd`
- `scripts/build-print-agent-exe.ps1`
- `scripts/build-print-agent-installer.ps1`

## 17. Assets publicos

Pastas/arquivos relevantes:

- `public/brand`: logos e marcas PeriniFood/GastroFlow.
- `public/uploads/logos`: logos enviados.
- `public/uploads/products`: imagens de produtos enviadas.
- `public/docs/PRINT_AGENT.md`: copia publica da documentacao do agente.
- SVGs padrao: `file.svg`, `globe.svg`, `next.svg`, `vercel.svg`, `window.svg`.
- Imagens na raiz: `ChatGPT Image 1 de jun. de 2026, 10_13_52.png` e `ChatGPT Image 1 de jun. de 2026, 10_19_08.png`.

## 18. Fluxos de negocio cobertos

- Cadastro de restaurante no primeiro acesso.
- Login do operador.
- Multiempresa por `restaurant_id`.
- CRUD de categorias.
- CRUD de tipos de produto.
- CRUD de produtos.
- Produto com variacoes.
- Produto com adicionais.
- Opcoes de pizza: tamanho, massa, borda e adicionais.
- Upload de logo/banner/capa.
- Horario de funcionamento.
- Status manual de loja aberta/fechada.
- Taxas de entrega por regra/faixa.
- Pedidos pelo PDV.
- Pedidos pelo cardapio publico.
- Pedidos por delivery.
- Impressao de pedidos.
- Clientes e enderecos.
- Conta publica do cliente.
- Cupons e fidelidade.
- Relatorios operacionais.
- Webhooks e integracoes externas.
- Logs de integracao.

## 19. Como rodar localmente

No Windows/PowerShell, use `npm.cmd` para evitar bloqueio de policy do `npm.ps1`.

```powershell
cd "E:\ARQUIVOS EDUARDO\PERINI FOOD"
npm.cmd install
npm.cmd run dev
```

Depois abra:

```text
http://localhost:3000
```

Para build:

```powershell
npm.cmd run build
```

Para lint:

```powershell
npm.cmd run lint
```

Para validar Prisma:

```powershell
npm.cmd run prisma:validate
```

## 20. Pontos de atencao

1. O README e a documentacao do agente possuem textos com mojibake, por exemplo `pÃºblica`, `configuraÃ§Ã£o`, `usuÃ¡rios`. Isso indica arquivo salvo/lido com problema de encoding em algum momento.
2. O Git retornou erro de `dubious ownership` ao executar `git status`. Nao foi alterada configuracao global do Git. Para liberar, seria necessario rodar conscientemente:

```powershell
git config --global --add safe.directory 'E:/ARQUIVOS EDUARDO/PERINI FOOD'
```

3. A pasta `.env.local` existe, mas os segredos nao foram expostos neste documento.
4. Existem artefatos gerados (`.next`, `dist`, `node_modules`) dentro da pasta.
5. Existem rotas em duplicidade conceitual, como area `/dashboard/*` e telas administrativas fora de `/dashboard`. Isso pode ser intencional, legado ou fase de transicao.
6. Providers de integracao parecem preparados para evolucao, mas parte deles e descrita como mockada no README.

## 21. Arquivos principais para manutencao

Para alterar o produto no dia a dia, os pontos mais provaveis sao:

- `src/app/actions.ts`
- `src/app/dashboard/*`
- `src/app/cardapio/*`
- `src/app/pedidos/*`
- `src/app/relatorios/*`
- `src/components/*`
- `src/lib/reports.ts`
- `src/lib/auth.ts`
- `src/lib/integrations/*`
- `prisma/schema.prisma`
- `supabase/migrations/*`
- `.env.local`

## 22. Checklist rapido de saude do projeto

Comandos recomendados antes de mexer ou publicar:

```powershell
cd "E:\ARQUIVOS EDUARDO\PERINI FOOD"
npm.cmd run lint
npm.cmd run prisma:validate
npm.cmd run build
```

Se o Git precisar ser usado e continuar bloqueado por ownership, resolver primeiro o `safe.directory`.

