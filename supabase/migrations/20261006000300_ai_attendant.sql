-- Módulo "Atendente de IA" (site e WhatsApp): histórico curto de cada conversa e
-- pausa quando a equipe da loja assume o atendimento manualmente.
-- Acesso só pelo servidor (service role). Idempotente. Aplicar ANTES do deploy.
begin;

create table if not exists public.ai_conversations (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  channel text not null check (channel in ('site', 'whatsapp')),
  contact text not null,
  messages jsonb not null default '[]'::jsonb,
  paused_until timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (restaurant_id, channel, contact)
);

create index if not exists ai_conversations_updated_idx on public.ai_conversations (restaurant_id, updated_at desc);

alter table public.ai_conversations enable row level security;
revoke all on public.ai_conversations from anon, authenticated;

commit;
