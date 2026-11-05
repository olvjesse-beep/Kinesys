-- CPF normalizado por clínica. Cadastros sem CPF continuam permitidos.
create unique index pacientes_clinica_cpf_normalizado_uidx
 on public.pacientes (clinica_id, (regexp_replace(coalesce(cpf, ''), '\D', '', 'g')))
 where length(regexp_replace(coalesce(cpf, ''), '\D', '', 'g')) = 11;

-- Apenas o gatilho da própria ocorrência pode reabrir seu cancelamento automático.
create or replace function public.kinesys_proteger_contrato()
returns trigger language plpgsql set search_path=public,pg_temp as $$
begin
 if tg_op='DELETE' then raise exception 'Cancele a contratação; excluir contrato apagaria a auditoria'; end if;
 if current_user not in ('postgres','supabase_admin') and (new.sessoes_contratadas>1 or exists(select 1 from public.procedimentos where id=new.procedimento_id and sessoes_pacote>1)) then
  if tg_op='INSERT' then raise exception 'Confirme a contratação pela operação de contratos'; end if;
  if (new.status,new.sessoes_contratadas,new.valor_tabela,new.valor_final,new.desconto_valor) is distinct from (old.status,old.sessoes_contratadas,old.valor_tabela,old.valor_final,old.desconto_valor) then raise exception 'Altere as condições pela operação de contratos'; end if;
 end if;
 if tg_op='INSERT' then
  if new.status='cancelado' and new.encerramento_automatico is true then
   raise exception 'Cancelamento automático exige uma alteração na Agenda';
  end if;
  new.condicoes_originais:=coalesce(new.condicoes_originais,jsonb_build_object('sessoes',new.sessoes_contratadas,'valor',new.valor_tabela,'desconto',new.desconto_valor,'desconto_pacote',new.desconto_pacote,'desconto_cortesia',new.desconto_cortesia));
  return new;
 end if;
 if new.status='cancelado' and new.encerramento_automatico is true
    and (old.status<>'cancelado' or old.encerramento_automatico is not true)
    and not (current_user in ('postgres','supabase_admin') and pg_trigger_depth()=2
      and old.status<>'cancelado' and new.sessoes_contratadas=1 and coalesce(new.operacao_id,'') like 'unitario-agenda-%')
 then raise exception 'Cancelamento automático exige uma alteração na Agenda'; end if;
 if old.status='cancelado' and new.status<>'cancelado' and not (
   current_user in ('postgres','supabase_admin') and pg_trigger_depth()=2
   and coalesce(old.encerramento_automatico,false) and old.sessoes_contratadas=1
   and coalesce(old.operacao_id,'') like 'unitario-agenda-%'
   and new.status='ativo' and new.encerramento_automatico is false and new.encerrado_em is null
 ) then raise exception 'Contrato cancelado não pode ser reativado'; end if;
 if (new.paciente_id,new.procedimento_id,new.clinica_id,new.operacao_id) is distinct from (old.paciente_id,old.procedimento_id,old.clinica_id,old.operacao_id) then raise exception 'A identidade da contratação é imutável'; end if;
 if old.status='concluido' and not coalesce(old.encerramento_automatico,false) and new.status='ativo' then raise exception 'Contrato encerrado manualmente não pode ser reativado'; end if;
 if new.condicoes_originais is distinct from old.condicoes_originais then raise exception 'As condições originais do contrato são imutáveis'; end if;
 return new;
end $$;

create function public.kinesys_sincronizar_cancelamento_unitario()
returns trigger language plpgsql security definer set search_path=pg_catalog,public,pg_temp as $$
declare
 contrato public.planos_atendimento%rowtype;
 atualizado public.planos_atendimento%rowtype;
 motivo text;
 acao text;
begin
 select * into contrato from public.planos_atendimento p
 where p.id=new.plano_id and p.clinica_id=new.clinica_id and p.paciente_id=new.paciente_id
   and p.sessoes_contratadas=1 and p.operacao_id='unitario-agenda-'||new.id::text
 for update;
 if not found then return new; end if;

 if tg_when='BEFORE' then
   if contrato.status<>'cancelado' or contrato.encerramento_automatico is not true then return new; end if;
   update public.planos_atendimento set status='ativo',encerramento_automatico=false,encerrado_em=null
    where id=contrato.id returning * into atualizado;
   acao:='reabrir';
   motivo:='Agendamento unitário reaberto';
 else
   if contrato.status='cancelado' or (contrato.status='concluido' and contrato.encerramento_automatico is not true)
     or exists(select 1 from public.agendamentos a where a.plano_id=contrato.id and a.id<>new.id and a.status<>'cancelado')
     or exists(select 1 from public.pagamentos p where p.plano_id=contrato.id or p.agendamento_id=new.id)
     or exists(select 1 from public.creditos_paciente_usos u where u.plano_id=contrato.id)
   then return new; end if;
   update public.planos_atendimento set status='cancelado',encerramento_automatico=true,encerrado_em=now()
    where id=contrato.id returning * into atualizado;
   acao:='cancelar';
   motivo:='Agendamento unitário cancelado sem pagamento ou crédito';
 end if;

 insert into public.auditoria_contratos(clinica_id,plano_id,acao,antes,depois,motivo,autor)
 values(contrato.clinica_id,contrato.id,acao,to_jsonb(contrato),to_jsonb(atualizado),motivo,
        coalesce(nullif(new.status_atualizado_por,''),'Sistema'));
 return new;
end $$;

revoke all on function public.kinesys_sincronizar_cancelamento_unitario() from public,anon,authenticated;

-- A reabertura deve ocorrer antes da validação de vínculo e é revertida se houver conflito.
create trigger ks_reabrir_cobranca_unitaria
 before update of status on public.agendamentos for each row
 when (old.status='cancelado' and new.status<>'cancelado' and old.plano_id=new.plano_id)
 execute function public.kinesys_sincronizar_cancelamento_unitario();

create trigger ks_cancelar_cobranca_unitaria
 after update of status on public.agendamentos for each row
 when (old.status is distinct from new.status and new.status='cancelado' and new.plano_id is not null)
 execute function public.kinesys_sincronizar_cancelamento_unitario();

-- Serializa lançamento e cancelamento na mesma contratação. Modal antigo não pode cobrar a sessão cancelada.
create function public.kinesys_guardar_movimento_unitario_cancelado()
returns trigger language plpgsql security definer set search_path=pg_catalog,public,pg_temp as $$
declare
 status_plano text;
begin
 if tg_table_name='pagamentos' and to_jsonb(new)->>'tipo'='estorno' then return new; end if;
 select p.status into status_plano from public.planos_atendimento p
 where p.id=new.plano_id and p.clinica_id=new.clinica_id and p.paciente_id=new.paciente_id
   and p.sessoes_contratadas=1 and p.operacao_id like 'unitario-agenda-%'
 for no key update;
 if status_plano='cancelado' then raise exception 'A cobrança deste agendamento unitário foi cancelada'; end if;
 return new;
end $$;
revoke all on function public.kinesys_guardar_movimento_unitario_cancelado() from public,anon,authenticated;

create trigger ks_guardar_pagamento_unitario_cancelado
 before insert or update of plano_id,paciente_id on public.pagamentos for each row
 execute function public.kinesys_guardar_movimento_unitario_cancelado();

create trigger ks_guardar_credito_unitario_cancelado
 before insert or update of plano_id,paciente_id on public.creditos_paciente_usos for each row
 execute function public.kinesys_guardar_movimento_unitario_cancelado();

-- O valor histórico permanece, mas não há saldo a pagar na sessão cancelada.
CREATE OR REPLACE FUNCTION public.kinesys_situacao_financeira_agendamentos(p_ids uuid[])
 RETURNS TABLE(agendamento_id uuid, cobranca_id uuid, valor_original numeric, desconto_valor numeric, valor_devido numeric, total_pago numeric, valor_pendente numeric, status_financeiro text, origem text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
 with perfil as (select public.kinesys_perfil_sessao() p), base as (
 select a.id,case when pl.sessoes_contratadas>1 then null else c.id end cobranca_id,
 case when pl.sessoes_contratadas>1 then pl.valor_tabela else coalesce(c.valor_original,pl.valor_tabela,pr.valor,0) end original,
 case when pl.sessoes_contratadas>1 then pl.desconto_valor else coalesce(c.desconto_valor,pl.desconto_valor,0) end desconto,
 case when pl.sessoes_contratadas>1 then pl.valor_final else coalesce(c.valor_devido,pl.valor_final,pr.valor,0) end devido,
 case when pl.sessoes_contratadas>1 then 'plano' else coalesce(c.origem,'avulso') end origem,
 a.status='cancelado' and (
   (pl.status='cancelado' and pl.sessoes_contratadas=1 and pl.operacao_id='unitario-agenda-'||a.id::text)
   or (pl.id is null and c.id is null and pr.sessoes_pacote=1)
 ) and not exists(select 1 from public.pagamentos g where g.plano_id=pl.id or g.agendamento_id=a.id)
   and not exists(select 1 from public.creditos_paciente_usos u where u.plano_id=pl.id) cancelado_sem_cobranca,
 coalesce((select sum(g.valor) from public.pagamentos g where g.clinica_id=a.clinica_id and case when pl.sessoes_contratadas>1 then g.plano_id=pl.id else g.cobranca_agendamento_id=c.id or (g.cobranca_agendamento_id is null and g.agendamento_id=a.id) end),0) + coalesce((select sum(u.valor) from public.creditos_paciente_usos u where u.clinica_id=a.clinica_id and u.plano_id=pl.id and u.paciente_id=a.paciente_id),0) pago
 from public.agendamentos a join perfil x on a.clinica_id=(x.p->>'clinica_id')::uuid
 left join public.planos_atendimento pl on pl.id=a.plano_id and pl.clinica_id=a.clinica_id
 left join public.cobrancas_agendamento c on c.agendamento_id=a.id and c.clinica_id=a.clinica_id
 left join public.procedimentos pr on pr.id=a.procedimento_id and pr.clinica_id=a.clinica_id
 where a.id=any(p_ids) and x.p->>'tipo' in ('MASTER','MASTER_FEM','ADMINISTRADOR','ADMINISTRADORA','SECRETARIA')
 ) select id,cobranca_id,original,desconto,case when cancelado_sem_cobranca then 0 else devido end,pago,
   case when cancelado_sem_cobranca then 0 else greatest(devido-pago,0) end,
   case when cancelado_sem_cobranca then 'cancelado' when devido<=pago then 'pago' when pago<=0 then 'pendente' else 'parcial' end,origem from base;
$function$;
