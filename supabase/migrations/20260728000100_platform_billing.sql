-- Gestão de ASSINANTES da plataforma PeriniFood (uso interno da equipe).
-- Nada aqui guarda dados operacionais/faturamento do cliente — apenas o
-- contrato dele conosco (plano, módulos contratados e nossos recebimentos).

create table if not exists public.platform_subscriptions (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null unique references public.restaurants(id) on delete cascade,
  plan text not null default 'basico',
  status text not null default 'trial'
    check (status in ('trial', 'active', 'past_due', 'suspended', 'canceled')),
  monthly_amount numeric(12,2) not null default 0,
  billing_day integer not null default 5 check (billing_day between 1 and 28),
  started_on date not null default current_date,
  next_due_on date,
  modules jsonb not null default '[]'::jsonb,
  contact_name text,
  contact_email text,
  contact_phone text,
  notes text,
  suspended_at timestamptz,
  suspension_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Recebimentos das NOSSAS mensalidades (inclui pagamento em dinheiro, que é
-- lançado manualmente pela equipe para reativar o cliente).
create table if not exists public.platform_payments (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  amount numeric(12,2) not null,
  paid_on date not null default current_date,
  reference_month date not null,
  method text not null default 'pix'
    check (method in ('pix', 'dinheiro', 'cartao', 'boleto', 'transferencia', 'outro')),
  notes text,
  created_by text,
  created_at timestamptz not null default now()
);

create index if not exists platform_payments_restaurant_idx
  on public.platform_payments (restaurant_id, paid_on desc);
create index if not exists platform_payments_paid_on_idx
  on public.platform_payments (paid_on desc);
create index if not exists platform_subscriptions_status_idx
  on public.platform_subscriptions (status);

-- RLS ligada SEM políticas: nenhum cliente (anon/authenticated) enxerga estas
-- tabelas. O acesso é exclusivo do painel /admin, que usa a service role.
alter table public.platform_subscriptions enable row level security;
alter table public.platform_payments enable row level security;

revoke all on public.platform_subscriptions from anon, authenticated;
revoke all on public.platform_payments from anon, authenticated;

-- Toda loja já existente entra como assinante ativo (ajuste plano/valor no painel).
insert into public.platform_subscriptions (restaurant_id, status, started_on)
select r.id, 'active', coalesce(r.created_at::date, current_date)
from public.restaurants r
on conflict (restaurant_id) do nothing;
