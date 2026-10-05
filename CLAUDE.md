# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Project

PeriniFood: a multi-tenant SaaS for restaurants and pizzerias. It covers the staff dashboard, a public menu with checkout, the POS (PDV), reports, iFood integration and a platform admin area. The UI, routes, commit messages and most comments are in Brazilian Portuguese, so keep writing them that way. Some older names still say "GastroFlow" (README, storage bucket, Prisma DB name).

Stack: Next.js 16 App Router + React 19 + TypeScript + Tailwind 4, with Supabase (Auth, Postgres, Storage) as the only backend. The app is hosted on Vercel in region `gru1`. The canonical host is `perinifood.com.br`; `www` and `*.vercel.app` 308-redirect to it. `admin.` subdomain root is rewritten to `/admin` in `src/proxy.ts`.

`docs/ARQUITETURA_ANALISADA.md` is a deep architecture write-up dated 2026-09-06. It was written **before** the security refactor (commit `b2adacc` and later), so many of the "problems" in its section 11 are already fixed. Check the code before trusting it.

## Commands

The dev environment is Linux. The repo sits on a slow NTFS/FUSE mount, so Next warns about a slow filesystem. In non-interactive shells, nvm isn't loaded, so run `export PATH="$HOME/.local/bin:$PATH"` first.

```bash
npm run dev                      # next dev on :3000
npm run build                    # production build (also the de-facto full type check)
npm run lint                     # eslint (flat config, eslint.config.mjs)
node node_modules/typescript/bin/tsc --noEmit --incremental false   # type check only
node scripts/replay-migrations.mjs [supabase/migrations/<file>.sql] # replay schema.sql + all migrations in PGlite
node scripts/verify-security-migration.mjs [siteUrl] [slug] [--final]  # post-deploy smoke checks against prod (reads .env.local)
```

- There is **no test suite**. To verify a change, use a type check or build, `replay-migrations.mjs` for SQL, and the running app.
- `print-agent:*` (PowerShell) and `desktop:*` (Electron/NSIS) build Windows deliverables and do not run on Linux.
- Prisma is **not** used at runtime: no PrismaClient in `src/`. `prisma/schema.prisma` is partial and stale. `prisma/seed.mjs` uses the Supabase SDK.

## Database and migrations

- The source of truth is `supabase/schema.sql` plus `supabase/migrations/*.sql`, in timestamp order. Migrations are applied **manually** by pasting them into the Supabase SQL Editor (there's no CLI push). Write them idempotent and tolerant of drift (`if not exists`, guarded `do $$` blocks), then validate with `scripts/replay-migrations.mjs <file>`.
- When a change must ship code first and revoke access later, split it into two migrations. The security work did this: `..._security_hardening.sql` (additive, applied before deploy) and `..._security_lockdown.sql` (revokes, applied after the new code is live).
- After the lockdown, the `anon` role has **no** table access. Every public read or write (menu, checkout, order tracking, customer accounts) goes through server code with the service-role client. The same goes for atomic writes through RPCs such as `save_order_atomic` and `consume_security_rate_limit`.
- `src/lib/types.ts` holds hand-written domain types. They are not generated, so update them when you change the schema.

## Architecture

**Tenancy and auth.** Every business row carries `restaurant_id`. Staff log in through Supabase Auth with SSR cookies, and `src/proxy.ts` refreshes the session for the matched paths. Its `matcher` list is explicit, so add new protected route prefixes there.
- Pages and Server Actions call `requireRestaurant()` (`src/lib/auth.ts`). It resolves the user's *first* `restaurant_users` link and blocks suspended or canceled subscriptions (`platform-billing.ts`).
- API route handlers call `requireApiRestaurant()` (`src/lib/api-helpers.ts`).
- New stores start as `pending` in `platform_subscriptions`, and a store with no row also counts as pending. `requireRestaurant` sends pending stores to `/ativacao`, and their public menu isn't served. The team activates them in `/admin/clientes/[id]` ("Ativar loja").
- The platform admin (`/admin`) uses `requirePlatformAdmin()` (`src/lib/platform-admin.ts`), which checks the `PLATFORM_ADMIN_EMAILS` env var.

**Three Supabase clients** live in `src/lib/supabase/`:
- `server.ts` uses cookies and RLS. Use it for staff code paths.
- `service.ts` uses the service role and **bypasses RLS**. Use it only in `server-only` modules, and always filter explicitly by a `restaurant_id` you have already validated.
- `browser.ts` is the browser client.

**Public customer accounts** are separate from Supabase Auth. They use the `customers` table with scrypt hashes and an httpOnly session cookie backed by the `customer_sessions` table (`src/lib/customer-session.ts`), plus DB rate limiting. Public mutation endpoints use the helpers in `src/lib/security.ts`:
- `assertSameOrigin` to block cross-site requests
- `readObject` for size-limited JSON bodies
- `uuid` / `boundedText` / `emailAddress` validators
- `PublicError` for user-facing messages

**Mutations.** Most dashboard mutations are Server Actions in `src/app/actions.ts`; the platform admin's are in `src/app/admin/actions.ts`. They use `revalidatePath` plus a redirect. Route handlers under `src/app/api/` sit alongside them and don't always share the same rules, so check both when you change a behavior.

**Conventions.**
- Destructive or configuration actions call `requireManager()` in `actions.ts` (owner, admin or manager, the same rule the UI uses to hide buttons).
- "Today", day grouping and displayed times use `src/lib/timezone.ts` (store time zone `America/Sao_Paulo`). Vercel runs in UTC, so never use `setHours` or `toLocaleString` without `timeZone`.
- Image URLs typed into forms go through `submittedImageUrl()` (`src/lib/image-url.ts`). The server only fetches or reads images that pass `isStorageImageUrl` / `isLocalImagePath`. Uploads are re-encoded to WebP with sharp, and files sharp can't decode are rejected.
- Panel colors use the Tailwind tokens from the `@theme` block in `globals.css` (`text-ink`, `text-ink-soft`, `text-ink-faint`, `border-line`, `bg-btn`, `text-brand`, …), not hex literals.
- In Next 16, `error.tsx` receives `unstable_retry`, not `reset`.

**Orders.** Site checkout and the POS both go through `saveValidatedOrder` (`src/lib/order-service.ts`). It reloads the catalog server-side, prices the cart with `src/lib/order-pricing.ts` (pizza = highest price among base and selected flavors, plus crust, edge and add-ons), computes shipping with `shipping.ts` / `delivery-fee-rules.ts`, and persists atomically through the RPC. Never trust client-sent prices or fees. Money fields arrive as the user typed them (`"89,90"`), so parse them with `parseDecimal` (`src/lib/utils.ts`), not `Number()`. Statuses are `pending → accepted → preparing → ready → out_for_delivery → completed | canceled`.

**Duplicate route families.** The English `/dashboard/...` routes and the Portuguese `/pedidos`, `/cardapio`, `/clientes`, `/relatorios`, `/configuracoes`, `/integracoes` routes are parallel implementations, not aliases. The `(painel)` route groups give the dashboard layout without affecting the URL. The public menu is `/cardapio/[slug]`, with `/checkout` and `/conta`; public order tracking is `/pedido/[codigo]`.

**Integrations.** The real iFood implementation is in `src/lib/integrations/ifood/` (OAuth, polling, event processor, order mapper, status sync, catalog push including native pizza templates). The code in `src/lib/integrations/providers/*` and `src/integrations/*` is mostly mocks, mappers and facades for 99Food, Keeta and Rappi. Externally created orders go through `src/lib/integrations/external-order.ts`. Webhook and maintenance endpoints must authenticate with `requireIntegrationToken` (`ingress.ts`), which fails closed with 503 when the secret is missing or shorter than 32 characters.

**Printing and desktop.**
- `OrderPrintClient` renders the ticket to a monochrome image and POSTs it to a local Windows print agent at `http://127.0.0.1:4127` (`scripts/perinifood-print-bridge.js`; details in `docs/PRINT_AGENT.md`). Browser printing (`docs/IMPRESSAO_NAVEGADOR.md`) is the fallback.
- `desktop/` is an Electron shell that loads the remote site and supervises the agent.
- Print routes such as `/pedidos/[id]/print` and `/ficha/[id]/print` intentionally render outside the dashboard layout.

## Env vars

`.env.example` is incomplete. Besides the Supabase variables (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`) and `DATABASE_URL`, the code reads:
- `PLATFORM_ADMIN_EMAILS`
- `PLATFORM_PAYMENT_URL` (optional): subscription payment link shown on `/ativacao`
- `IFOOD_CLIENT_ID`, `IFOOD_CLIENT_SECRET`, `IFOOD_API_BASE_URL`, `IFOOD_POLL_SECRET`
- `CRON_SECRET`
- desktop/agent only: `PERINIFOOD_APP_URL` and `PRINT_BRIDGE_*`

`vercel.json` schedules only `/api/keep-alive`, daily. iFood polling at `/api/integrations/ifood/poll` needs an external cron.
