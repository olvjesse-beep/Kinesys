-- Avisos online já lidos saem do painel no prazo configurado e ficam no histórico.
create or replace function public.kinesys_listar_avisos(p_historico boolean default false)
returns setof public.notificacoes_internas
language plpgsql security definer set search_path=pg_catalog,public as $$
declare p jsonb:=public.kinesys_perfil_sessao();cid uuid:=(p->>'clinica_id')::uuid;horas integer;automatico boolean;
begin
 if cid is null or nullif(p->>'id','') is null or coalesce(p->>'tipo','') not in ('MASTER','MASTER_FEM','FISIOTERAPEUTA','PROFISSIONAL') then raise exception 'Acesso restrito' using errcode='42501';end if;
 select avisos_expiracao_horas,avisos_arquivar_auto into horas,automatico from public.clinicas where id=cid;
 return query select n.* from public.notificacoes_internas n where n.clinica_id=cid
 and (n.destinatario_profissional_id=p->>'id' or (nullif(p->>'email','') is not null and lower(n.destinatario_email)=lower(p->>'email')))
 and (p_historico or not coalesce(automatico,false) or n.criada_em is null or n.criada_em>now()-make_interval(hours=>horas)
      or not (coalesce(n.tipo,'') in ('horario_extraordinario','aviso_informativo')
              or (coalesce(n.tipo,'')='agendamento_online' and coalesce(n.lida,false))))
 order by n.criada_em desc nulls last,n.id desc limit 100;
end $$;
