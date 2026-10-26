-- Foto das bordas e dos adicionais (Cardápio > Opções de pizza), exibida em cartões
-- no configurador do cardápio público. Coluna opcional: sem foto o cardápio mostra
-- um quadro neutro. Aditiva e idempotente. Aplicar ANTES do deploy.
begin;

alter table public.pizza_options add column if not exists image_url text;

commit;
