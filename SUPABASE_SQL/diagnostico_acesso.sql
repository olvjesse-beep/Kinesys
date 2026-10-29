-- Metadados de acesso. A conta informada antes do login não é identidade autenticada.
create table if not exists public.kinesys_diagnosticos_acesso (
 id uuid primary key, tentativa uuid not null, recebido_em timestamptz not null default now(),
 ocorrido_em timestamptz not null, conta_ref text, etapa text not null, motivo text not null,
 status smallint, duracao_ms integer not null, online boolean not null, versao text not null
);
create index if not exists kinesys_diagnosticos_conta_data on public.kinesys_diagnosticos_acesso(conta_ref,recebido_em desc);
create index if not exists kinesys_diagnosticos_data on public.kinesys_diagnosticos_acesso(recebido_em);
alter table public.kinesys_diagnosticos_acesso enable row level security;
revoke all on public.kinesys_diagnosticos_acesso from public,anon,authenticated;

create or replace function public.kinesys_registrar_diagnostico_acesso(p_eventos jsonb) returns jsonb
language plpgsql security definer set search_path=pg_catalog,public set statement_timeout='3s' as $$
declare e jsonb; n integer; ref text; stamp timestamptz; ids jsonb:='[]'::jsonb;
begin
 if p_eventos is null or jsonb_typeof(p_eventos)<>'array' then return jsonb_build_object('ok',false); end if;
 if jsonb_array_length(p_eventos)>10 or octet_length(p_eventos::text)>12000 then return jsonb_build_object('ok',false); end if;
 -- Serializa a admissão e limita o volume total, inclusive para entradas sem identidade.
 perform pg_advisory_xact_lock(7291029);
 delete from public.kinesys_diagnosticos_acesso where recebido_em<now()-interval '14 days';
 select count(*) into n from public.kinesys_diagnosticos_acesso where recebido_em>now()-interval '1 hour';
 if n>=1000 then return jsonb_build_object('ok',false); end if;
 for e in select value from jsonb_array_elements(p_eventos) loop
  if e->>'id'!~*'^[a-f0-9-]{36}$' or e->>'tentativa'!~*'^[a-f0-9-]{36}$' or
   coalesce(e->>'etapa','') not in ('inicializacao','sessao','credenciais','perfis','ativacao','entrada','recurso','execucao') or
   coalesce(e->>'motivo','') not in ('iniciado','sucesso','credenciais_invalidas','email_nao_confirmado','limite_tentativas','rede_indisponivel','falha_conexao','tempo_esgotado','sessao_invalida','acesso_negado','servidor_indisponivel','recurso_indisponivel','erro_execucao','falha_desconhecida') then continue; end if;
  ref:=case when e->>'conta_ref'~'^[a-f0-9]{64}$' then e->>'conta_ref' else null end;
  select count(*) into n from public.kinesys_diagnosticos_acesso where conta_ref is not distinct from ref and recebido_em>now()-interval '10 minutes';
  if n>=100 then continue; end if;
  begin
   stamp:=(e->>'ocorrido_em')::timestamptz;
   if stamp is null or stamp<now()-interval '25 hours' or stamp>now()+interval '5 minutes' then continue; end if;
   insert into public.kinesys_diagnosticos_acesso(id,tentativa,ocorrido_em,conta_ref,etapa,motivo,status,duracao_ms,online,versao)
   values((e->>'id')::uuid,(e->>'tentativa')::uuid,stamp,ref,e->>'etapa',e->>'motivo',
    case when (e->>'status')::int between 100 and 599 then (e->>'status')::smallint end,
    greatest(0,least(120000,(e->>'duracao_ms')::int)),coalesce((e->>'online')::boolean,false),'20261029-acesso-r1') on conflict(id) do nothing;
   ids:=ids||jsonb_build_array(e->>'id');
  exception when invalid_text_representation or datetime_field_overflow or not_null_violation or numeric_value_out_of_range then continue;
  end;
 end loop;
 return jsonb_build_object('ok',true,'recebidos',ids);
end $$;
revoke all on function public.kinesys_registrar_diagnostico_acesso(jsonb) from public,anon,authenticated;
grant execute on function public.kinesys_registrar_diagnostico_acesso(jsonb) to anon,authenticated;

create or replace function public.kinesys_listar_diagnosticos_acesso() returns jsonb
language plpgsql security definer set search_path=pg_catalog,public set statement_timeout='3s' as $$
declare perfil jsonb:=public.kinesys_perfil_sessao(); cid uuid;
begin
 if coalesce(perfil->>'tipo','') not in ('MASTER','MASTER_FEM') or perfil->>'clinica_id' is null then raise exception 'Acesso restrito à administração da clínica' using errcode='42501'; end if;
 cid:=(perfil->>'clinica_id')::uuid;
 return coalesce((select jsonb_agg(row_to_json(r)) from (
  select d.id,d.tentativa,d.ocorrido_em,d.recebido_em,d.etapa,d.motivo,d.status,d.duracao_ms,d.online,d.versao,
   (select min(e.nome) from public.equipe e where e.clinica_id=cid and encode(sha256(convert_to(lower(btrim(e.email)),'UTF8')),'hex')=d.conta_ref) as conta_informada
  from public.kinesys_diagnosticos_acesso d where d.recebido_em>now()-interval '14 days' and exists(
   select 1 from public.equipe e where e.clinica_id=cid and encode(sha256(convert_to(lower(btrim(e.email)),'UTF8')),'hex')=d.conta_ref
  ) order by d.recebido_em desc limit 100
 ) r),'[]'::jsonb);
end $$;
revoke all on function public.kinesys_listar_diagnosticos_acesso() from public,anon,authenticated;
grant execute on function public.kinesys_listar_diagnosticos_acesso() to authenticated;
