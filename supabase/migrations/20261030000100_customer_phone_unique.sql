-- Cliente duplicado pelo mesmo telefone: o balcão e a tela Clientes gravavam o telefone como
-- digitado ("11 97191-5600") e o site só com dígitos ("11971915600"). O índice único
-- customers_restaurant_phone_unique compara texto, então os dois viravam clientes diferentes.
--
-- 1. Junta os duplicados (mesma loja + mesmo telefone normalizado) num só cadastro:
--    fica o que tem senha/e-mail, senão o mais antigo; pedidos, endereços e sessões passam
--    para ele e os campos vazios dele são completados com os dos duplicados.
-- 2. Normaliza phone/whatsapp para DDD + número, só dígitos (sem +55).
-- 3. Trigger normaliza toda gravação, e o CHECK exige DDD + 8 ou 9 dígitos — assim o
--    índice único existente passa a impedir de verdade o mesmo telefone duas vezes.
-- Idempotente. Aplicar LOGO DEPOIS do deploy: o app antigo procura o cliente pelo telefone
-- como digitado, não acharia o cadastro já normalizado e o pedido do balcão falharia no
-- índice único. O app novo com o banco antigo, no pior caso, cria mais um duplicado —
-- que esta migration também junta.
begin;

create or replace function public.normalize_phone(value text)
returns text language sql immutable as $$
  select nullif(
    case when length(d) in (12, 13) and left(d, 2) = '55' then substr(d, 3) else d end, '')
  from (select regexp_replace(coalesce(value, ''), '\D', '', 'g') as d) s
$$;

do $$
declare
  grp record;
  fk record;
  keeper uuid;
  dups uuid[];
  merged record;
begin
  for grp in
    select restaurant_id, public.normalize_phone(phone) as phone_key
    from public.customers
    where public.normalize_phone(phone) is not null
    group by 1, 2
    having count(*) > 1
  loop
    select id into keeper from public.customers
    where restaurant_id = grp.restaurant_id and public.normalize_phone(phone) = grp.phone_key
    order by (password_hash is not null) desc, (email is not null) desc, created_at, id
    limit 1;

    select array_agg(id) into dups from public.customers
    where restaurant_id = grp.restaurant_id and public.normalize_phone(phone) = grp.phone_key and id <> keeper;

    -- Guarda o que os duplicados têm (o mais recente preenchido ganha) antes de apagá-los.
    select
      (array_agg(email order by created_at desc) filter (where email is not null))[1] as email,
      (array_agg(cpf order by created_at desc) filter (where cpf is not null))[1] as cpf,
      (array_agg(birth_date order by created_at desc) filter (where birth_date is not null))[1] as birth_date,
      (array_agg(address order by created_at desc) filter (where address is not null))[1] as address,
      (array_agg(address_number order by created_at desc) filter (where address_number is not null))[1] as address_number,
      (array_agg(neighborhood order by created_at desc) filter (where neighborhood is not null))[1] as neighborhood,
      (array_agg(complement order by created_at desc) filter (where complement is not null))[1] as complement,
      (array_agg(reference order by created_at desc) filter (where reference is not null))[1] as reference,
      (array_agg(city order by created_at desc) filter (where city is not null))[1] as city,
      (array_agg(state order by created_at desc) filter (where state is not null))[1] as state,
      (array_agg(zip_code order by created_at desc) filter (where zip_code is not null))[1] as zip_code,
      (array_agg(notes order by created_at desc) filter (where notes is not null))[1] as notes
    into merged
    from public.customers where id = any(dups);

    -- Sessão de login é da conta, não migra: quem estava logado no duplicado entra de novo.
    if to_regclass('public.customer_sessions') is not null then
      delete from public.customer_sessions where customer_id = any(dups);
    end if;

    -- Toda outra tabela com FK para customers (orders, customer_addresses...) passa a
    -- apontar para o cadastro mantido.
    for fk in
      select c.conrelid::regclass as tbl, a.attname as col
      from pg_constraint c
      join pg_attribute a on a.attrelid = c.conrelid and a.attnum = c.conkey[1]
      where c.contype = 'f' and c.confrelid = 'public.customers'::regclass and array_length(c.conkey, 1) = 1
    loop
      execute format('update %s set %I = $1 where %I = any($2)', fk.tbl, fk.col, fk.col) using keeper, dups;
    end loop;

    -- Apaga antes de completar: o e-mail do duplicado colidiria no índice único de e-mail.
    delete from public.customers where id = any(dups);

    update public.customers set
      email = coalesce(email, merged.email),
      cpf = coalesce(cpf, merged.cpf),
      birth_date = coalesce(birth_date, merged.birth_date),
      address = coalesce(address, merged.address),
      address_number = coalesce(address_number, merged.address_number),
      neighborhood = coalesce(neighborhood, merged.neighborhood),
      complement = coalesce(complement, merged.complement),
      reference = coalesce(reference, merged.reference),
      city = coalesce(city, merged.city),
      state = coalesce(state, merged.state),
      zip_code = coalesce(zip_code, merged.zip_code),
      notes = coalesce(notes, merged.notes)
    where id = keeper;
    raise notice 'cliente % mantido; % duplicado(s) unidos (telefone %)', keeper, array_length(dups, 1), grp.phone_key;
  end loop;
end $$;

update public.customers set phone = public.normalize_phone(phone)
where phone is distinct from public.normalize_phone(phone);
update public.customers set whatsapp = public.normalize_phone(whatsapp)
where whatsapp is distinct from public.normalize_phone(whatsapp);

create or replace function public.customers_normalize_phone()
returns trigger language plpgsql as $$
begin
  new.phone := public.normalize_phone(new.phone);
  new.whatsapp := public.normalize_phone(new.whatsapp);
  return new;
end $$;

drop trigger if exists customers_normalize_phone on public.customers;
create trigger customers_normalize_phone before insert or update of phone, whatsapp on public.customers
  for each row execute function public.customers_normalize_phone();

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'customers_phone_format' and conrelid = 'public.customers'::regclass) then
    alter table public.customers add constraint customers_phone_format
      check (phone is null or phone ~ '^[1-9]{2}[0-9]{8,9}$') not valid;
  end if;
end $$;
-- Falha aqui = existe telefone fora do padrão; a transação inteira volta atrás.
alter table public.customers validate constraint customers_phone_format;

create unique index if not exists customers_restaurant_phone_unique on public.customers (restaurant_id, phone) where phone is not null;

commit;
