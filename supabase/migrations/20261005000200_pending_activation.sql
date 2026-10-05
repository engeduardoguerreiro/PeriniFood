-- Loja nova não é liberada automaticamente: nasce "pending" (aguardando ativação)
-- e a equipe PeriniFood ativa no painel /admin após o pagamento ou contato.
-- APLICAR ANTES do deploy do código que usa o status "pending". Idempotente.
begin;

-- 1. Novo status permitido. Remove qualquer CHECK sobre status (o nome pode
--    variar se a tabela foi criada fora desta sequência de migrations).
do $$
declare c record;
begin
  for c in
    select conname from pg_constraint
    where conrelid = 'public.platform_subscriptions'::regclass and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%status%'
  loop
    execute format('alter table public.platform_subscriptions drop constraint %I', c.conname);
  end loop;
end $$;
alter table public.platform_subscriptions add constraint platform_subscriptions_status_check
  check (status in ('pending', 'trial', 'active', 'past_due', 'suspended', 'canceled'));

-- 2. Lojas que já existem e estão sem linha de assinatura (cadastradas depois da
--    migration de julho) entram como ativas: elas já usam o sistema e, a partir
--    deste deploy, loja sem assinatura passa a ser tratada como "aguardando ativação".
insert into public.platform_subscriptions (restaurant_id, status, started_on, notes)
select r.id, 'active', coalesce(r.created_at::date, current_date), 'Ativada automaticamente na migration de ativação (cadastro anterior a 05/10/2026).'
from public.restaurants r
where not exists (select 1 from public.platform_subscriptions s where s.restaurant_id = r.id)
on conflict (restaurant_id) do nothing;

commit;
