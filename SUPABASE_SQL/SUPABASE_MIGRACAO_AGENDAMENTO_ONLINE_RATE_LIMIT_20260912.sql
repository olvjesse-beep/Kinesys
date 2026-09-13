-- KineSys — Agendamento online V1
-- Rate limit de reserva pública. A tabela armazena somente uma chave HMAC opaca
-- calculada na Edge Function; nenhum IP/endereço de rede é persistido.

create table if not exists public.agendamento_online_rate_limit (
  chave_hash text primary key,
  janela_inicio timestamptz not null default now(),
  tentativas integer not null default 1 check (tentativas > 0),
  atualizado_em timestamptz not null default now()
);

alter table public.agendamento_online_rate_limit enable row level security;
revoke all on table public.agendamento_online_rate_limit from public, anon, authenticated;
grant select, insert, update, delete on table public.agendamento_online_rate_limit to service_role;

create index if not exists agendamento_online_rate_limit_atualizado_idx
  on public.agendamento_online_rate_limit (atualizado_em);

create or replace function public.kinesys_consumir_limite_agendamento_online(
  p_chave_hash text,
  p_limite integer default 8,
  p_janela_segundos integer default 900
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_chave text := lower(btrim(coalesce(p_chave_hash, '')));
  v_limite integer := greatest(1, least(50, coalesce(p_limite, 8)));
  v_janela integer := greatest(60, least(86400, coalesce(p_janela_segundos, 900)));
  v_tentativas integer;
begin
  if v_chave !~ '^[0-9a-f]{64}$' then
    raise exception 'Chave de limite inválida.' using errcode = '22023';
  end if;

  insert into public.agendamento_online_rate_limit (chave_hash, janela_inicio, tentativas, atualizado_em)
  values (v_chave, now(), 1, now())
  on conflict (chave_hash) do update
  set janela_inicio = case
        when agendamento_online_rate_limit.janela_inicio <= now() - make_interval(secs => v_janela) then now()
        else agendamento_online_rate_limit.janela_inicio
      end,
      tentativas = case
        when agendamento_online_rate_limit.janela_inicio <= now() - make_interval(secs => v_janela) then 1
        else agendamento_online_rate_limit.tentativas + 1
      end,
      atualizado_em = now()
  returning tentativas into v_tentativas;

  return v_tentativas <= v_limite;
end;
$$;

revoke all on function public.kinesys_consumir_limite_agendamento_online(text, integer, integer) from public, anon, authenticated;
grant execute on function public.kinesys_consumir_limite_agendamento_online(text, integer, integer) to service_role;
