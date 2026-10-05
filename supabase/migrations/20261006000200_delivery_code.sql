-- Código de entrega (contrassenha): o cliente informa ao motoboy e só com ele a
-- entrega pode ser concluída pelo link. Idempotente. Aplicar ANTES do deploy.
begin;

alter table public.delivery_tracking add column if not exists delivery_code text;

-- Links já gerados ganham um código (4 dígitos).
update public.delivery_tracking
set delivery_code = lpad((floor(random() * 9000) + 1000)::int::text, 4, '0')
where delivery_code is null;

commit;
