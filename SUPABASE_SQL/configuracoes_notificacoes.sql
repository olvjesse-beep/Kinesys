alter table public.clinicas add column if not exists avisos_expiracao_horas integer not null default 24 check(avisos_expiracao_horas in (6,12,24,48,72,168));
alter table public.clinicas add column if not exists avisos_arquivar_auto boolean not null default false;
alter table public.configuracoes_agendamento_online add column if not exists email_publico text not null default '';
create or replace function public.kinesys_configuracao_avisos(p_horas integer default null,p_automatico boolean default null) returns jsonb
language plpgsql security definer set search_path=pg_catalog,public as $$
declare p jsonb:=public.kinesys_perfil_sessao();cid uuid:=(p->>'clinica_id')::uuid;r jsonb;
begin
 if cid is null or nullif(p->>'id','') is null then raise exception 'Sessão inválida' using errcode='42501';end if;
 if p_horas is not null or p_automatico is not null then
  if coalesce(p->>'tipo','') not in ('MASTER','MASTER_FEM') then raise exception 'Somente administradores podem salvar estas regras' using errcode='42501';end if;
  if p_horas is null or p_horas not in (6,12,24,48,72,168) or p_automatico is null then raise exception 'Regra de notificação inválida';end if;
  update public.clinicas set avisos_expiracao_horas=p_horas,avisos_arquivar_auto=p_automatico where id=cid;
 end if;
 select jsonb_build_object('horas',avisos_expiracao_horas,'automatico',avisos_arquivar_auto,'clinica_id',id) into r from public.clinicas where id=cid;
 return r;
end $$;
revoke all on function public.kinesys_configuracao_avisos(integer,boolean) from public,anon,authenticated;
grant execute on function public.kinesys_configuracao_avisos(integer,boolean) to authenticated;

create or replace function public.kinesys_listar_avisos(p_historico boolean default false) returns setof public.notificacoes_internas
language plpgsql security definer set search_path=pg_catalog,public as $$
declare p jsonb:=public.kinesys_perfil_sessao();cid uuid:=(p->>'clinica_id')::uuid;horas integer;automatico boolean;
begin
 if cid is null or nullif(p->>'id','') is null or coalesce(p->>'tipo','') not in ('MASTER','MASTER_FEM','FISIOTERAPEUTA','PROFISSIONAL') then raise exception 'Acesso restrito' using errcode='42501';end if;
 select avisos_expiracao_horas,avisos_arquivar_auto into horas,automatico from public.clinicas where id=cid;
 return query select n.* from public.notificacoes_internas n where n.clinica_id=cid
 and (n.destinatario_profissional_id=p->>'id' or (nullif(p->>'email','') is not null and lower(n.destinatario_email)=lower(p->>'email')))
 -- Somente tipos explicitamente informativos expiram. Tipo desconhecido/pendência é preservado.
 and (p_historico or not coalesce(automatico,false) or coalesce(n.tipo,'') not in ('horario_extraordinario','aviso_informativo') or n.criada_em is null or n.criada_em>now()-make_interval(hours=>horas))
 order by n.criada_em desc nulls last,n.id desc limit 100;
end $$;
revoke all on function public.kinesys_listar_avisos(boolean) from public,anon,authenticated;
grant execute on function public.kinesys_listar_avisos(boolean) to authenticated;
