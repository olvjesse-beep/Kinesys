-- KineSys — 2026-09-11
-- Supabase Auth é a única fonte de verdade para credenciais.
-- A coluna equipe.senha é mantida apenas por compatibilidade de schema legado,
-- mas nenhum valor de senha deve permanecer armazenado nela.

update public.equipe
set senha = null
where senha is not null;

comment on column public.equipe.senha is
'LEGADO: não usar para autenticação nem armazenamento de credenciais. Supabase Auth é a única fonte de verdade; valores devem permanecer NULL.';
