-- Desvínculo explícito da ocorrência. O procedimento continua no agendamento.
alter table public.agendamentos add column pacote_desvinculado_id uuid;
alter table public.agendamentos add constraint agendamento_pacote_desvinculado_sem_plano
 check (pacote_desvinculado_id is null or plano_id is null);

CREATE OR REPLACE FUNCTION public.kinesys_validar_agendamento_plano()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare pl public.planos_atendimento%rowtype; usados integer; consome boolean:=new.status in ('atendido','concluido','falta_nao_justificada'); reserva boolean:=new.status in ('pre_agendado','agendado','confirmado','em_recepcao');
begin
 if tg_op='INSERT' then
  if new.pacote_desvinculado_id is not null then
   raise exception 'O desvínculo precisa partir de um atendimento existente' using errcode='42501';
  end if;
 else
  if new.pacote_desvinculado_id is distinct from old.pacote_desvinculado_id
     and current_user not in ('postgres','supabase_admin') then
   raise exception 'Use a operação de vínculo da Agenda' using errcode='42501';
  end if;
  if new.pacote_desvinculado_id is not null then
   if new.plano_id is not null then
    raise exception 'Vincule este atendimento manualmente pelo detalhe da Agenda';
   end if;
   if (new.clinica_id,new.paciente_id,new.procedimento_id) is distinct from
      (old.clinica_id,old.paciente_id,old.procedimento_id) then
    new.pacote_desvinculado_id:=null;
   else
    return new;
   end if;
  end if;
 end if;
 if new.plano_id is null then
  if consome and exists(select 1 from public.procedimentos where id=new.procedimento_id and sessoes_pacote>1) then raise exception 'Contrate e vincule um pacote antes de realizar a sessão'; end if;
  return new;
 end if;
 select * into pl from public.planos_atendimento where id=new.plano_id for update;
 if not found or pl.paciente_id is distinct from new.paciente_id or pl.clinica_id is distinct from new.clinica_id then raise exception 'Contrato incompatível com paciente ou clínica'; end if;
 if pl.procedimento_id is not null and pl.procedimento_id is distinct from new.procedimento_id then
  -- Um recebimento unitário pertence à ocorrência, não é recontratado ao
  -- corrigir sua descrição clínica. Mantém identidade e valores originais.
  -- Inserções, transferências de paciente/clínica/contrato e pacotes continuam
  -- exigindo compatibilidade integral com o procedimento contratado.
  if not (tg_op='UPDATE' and new.plano_id is not distinct from old.plano_id
   and new.paciente_id is not distinct from old.paciente_id
   and new.clinica_id is not distinct from old.clinica_id
   and pl.sessoes_contratadas=1
   and exists(select 1 from public.procedimentos where id=new.procedimento_id and clinica_id=new.clinica_id and coalesce(sessoes_pacote,1)=1)) then
    raise exception 'O pacote vinculado não cobre este procedimento. Preserve o procedimento contratado ou vincule um contrato compatível antes da troca';
  end if;
 end if;
 if tg_op='UPDATE' and new.plano_id=old.plano_id and new.status=old.status then return new; end if;
 if pl.status<>'ativo' and (consome or reserva) then
  if not (tg_op='UPDATE' and new.plano_id=old.plano_id and pl.encerramento_automatico and old.status in ('atendido','concluido','falta_nao_justificada')) then raise exception 'Contrato não está ativo'; end if;
 end if;
 if consome or reserva then
  select count(*) into usados from public.agendamentos where plano_id=pl.id and id<>new.id and status in ('pre_agendado','agendado','confirmado','em_recepcao','atendido','concluido','falta_nao_justificada');
  if usados>=pl.sessoes_contratadas then raise exception 'Todas as sessões estão consumidas ou reservadas'; end if;
 end if;
 return new;
end $function$;

drop trigger trg_kinesys_agendamento_plano on public.agendamentos;
create trigger trg_kinesys_agendamento_plano
 before insert or update of plano_id,pacote_desvinculado_id,paciente_id,clinica_id,procedimento_id,status on public.agendamentos
 for each row execute function public.kinesys_validar_agendamento_plano();

create function public.kinesys_desvincular_pacote_agendamento(p_agendamento_id uuid,p_plano_esperado uuid)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public,pg_temp as $$
declare
 perfil jsonb:=public.kinesys_perfil_sessao();
 cid uuid:=(perfil->>'clinica_id')::uuid;
 a public.agendamentos%rowtype;
 pl public.planos_atendimento%rowtype;
begin
 if cid is null or coalesce(perfil->>'tipo','') not in ('MASTER','MASTER_FEM','ADMINISTRADOR','ADMINISTRADORA') then
  raise exception 'Somente administradores podem desvincular pacotes' using errcode='42501';
 end if;
 select * into a from public.agendamentos where id=p_agendamento_id and clinica_id=cid for update;
 if not found then raise exception 'Atendimento não encontrado'; end if;
 if p_plano_esperado is null then raise exception 'Informe o pacote vinculado'; end if;
 if a.plano_id is null and a.pacote_desvinculado_id=p_plano_esperado then
  return jsonb_build_object('ok',true,'agendamento_id',a.id);
 end if;
 if a.plano_id is distinct from p_plano_esperado then
  raise exception 'O vínculo do atendimento mudou. Atualize a agenda e tente novamente.' using errcode='40001';
 end if;
 select * into pl from public.planos_atendimento
  where id=a.plano_id and clinica_id=cid and paciente_id=a.paciente_id for update;
 if not found or pl.sessoes_contratadas<=1 then raise exception 'O vínculo atual não é um pacote'; end if;
 if exists(select 1 from public.cobrancas_agendamento
  where clinica_id=cid and agendamento_id=a.id and baixada_em is null and origem<>'plano') then
  raise exception 'Este atendimento também tem uma cobrança individual ativa. Revise o vínculo no Financeiro';
 end if;

 update public.agendamentos set plano_id=null,pacote_desvinculado_id=pl.id where id=a.id;
 insert into public.auditoria_contratos(clinica_id,plano_id,acao,antes,depois,motivo,autor)
 values(cid,pl.id,'desvincular',jsonb_build_object('agendamento_id',a.id,'plano_id',pl.id,'procedimento_id',a.procedimento_id),
  jsonb_build_object('agendamento_id',a.id,'plano_id',null,'procedimento_id',a.procedimento_id),
  'Desvínculo explícito sem alteração do atendimento',perfil->>'nome');
 return jsonb_build_object('ok',true,'agendamento_id',a.id);
end $$;
revoke all on function public.kinesys_desvincular_pacote_agendamento(uuid,uuid) from public,anon,authenticated;
grant execute on function public.kinesys_desvincular_pacote_agendamento(uuid,uuid) to authenticated;

CREATE OR REPLACE FUNCTION public.kinesys_vincular_contrato(p_agendamento_id uuid, p_plano_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare perfil jsonb:=public.kinesys_perfil_sessao(); cid uuid:=(perfil->>'clinica_id')::uuid; pl public.planos_atendimento%rowtype; a public.agendamentos%rowtype;
begin
 if cid is null or coalesce(perfil->>'tipo','') not in ('MASTER','MASTER_FEM') then raise exception 'Somente administradores podem converter contratações' using errcode='42501'; end if;
 select * into a from public.agendamentos where id=p_agendamento_id and clinica_id=cid for update;
 if not found then raise exception 'Agendamento incompatível'; end if;
 select * into pl from public.planos_atendimento where id=p_plano_id and clinica_id=cid for update;
 if not found then raise exception 'Contrato não encontrado'; end if;
 if a.paciente_id<>pl.paciente_id then raise exception 'Agendamento incompatível'; end if;
 update public.agendamentos set plano_id=pl.id,pacote_desvinculado_id=null,procedimento_id=coalesce(pl.procedimento_id,procedimento_id) where id=a.id;
 insert into public.auditoria_contratos(clinica_id,plano_id,acao,antes,depois,motivo,autor) values(cid,pl.id,'vincular',jsonb_build_object('agendamento_id',a.id,'plano_id',a.plano_id,'procedimento_id',a.procedimento_id),jsonb_build_object('plano_id',pl.id),'Vínculo ou conversão de atendimento',perfil->>'nome');
 return jsonb_build_object('ok',true);
end $function$;

CREATE OR REPLACE FUNCTION public.kinesys_preparar_cobranca_agendamento(p_agendamento_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  perfil jsonb:=public.kinesys_perfil_sessao(); cid uuid:=(perfil->>'clinica_id')::uuid; papel text:=perfil->>'tipo';
  a public.agendamentos%rowtype; p public.procedimentos%rowtype; pl public.planos_atendimento%rowtype;
  c public.cobrancas_agendamento%rowtype; v_original numeric(12,2):=0; v_desconto numeric(12,2):=0; v_origem text:='avulso';
  v_plano_id uuid; v_operacao text; v_plano_anterior uuid; v_reabrir boolean:=false; v_pago numeric:=0;
begin
  if cid is null or papel not in ('MASTER','MASTER_FEM','ADMINISTRADOR','ADMINISTRADORA','SECRETARIA') then raise exception 'Somente administradores podem preparar cobranças' using errcode='42501'; end if;
  select * into a from public.agendamentos where id=p_agendamento_id and clinica_id=cid for update;
  if not found or a.status='cancelado' then raise exception 'Agendamento não encontrado ou cancelado'; end if;
  if a.pacote_desvinculado_id is not null then raise exception 'Este atendimento foi desvinculado do pacote e está sem cobrança'; end if;

  select * into c from public.cobrancas_agendamento where clinica_id=cid and agendamento_id=a.id;
  if found and c.baixada_em is not null then
    if c.baixa_tipo is distinct from 'migracao_pacote' then return to_jsonb(c); end if;
    v_reabrir:=true;
  end if;

  select * into p from public.procedimentos where id=a.procedimento_id and clinica_id=cid;
  if not found then raise exception 'Serviço do agendamento não encontrado'; end if;
  v_plano_id:=a.plano_id;
  if v_plano_id is not null then
    select * into pl from public.planos_atendimento where id=v_plano_id and clinica_id=cid for update;
    if not found or pl.paciente_id is distinct from a.paciente_id then raise exception 'Contrato incompatível com o atendimento'; end if;
    if found then
      if pl.sessoes_contratadas>1 then raise exception 'Registre o recebimento na contratação do pacote'; end if;
      if pl.procedimento_id is distinct from a.procedimento_id and coalesce(p.sessoes_pacote,1)=1 then
        select coalesce(sum(g.valor),0) into v_pago from public.pagamentos g
          where g.clinica_id=cid and (g.plano_id=pl.id or g.agendamento_id=a.id or g.cobranca_agendamento_id=c.id);
        select v_pago+coalesce(sum(valor),0) into v_pago from public.creditos_paciente_usos where clinica_id=cid and plano_id=pl.id and paciente_id=a.paciente_id;
        if v_pago=0 then
          v_plano_anterior:=pl.id;
          -- Novo serviço, novo contrato: o preço e a identidade originais nunca são reescritos.
          if not exists(select 1 from public.agendamentos x where x.plano_id=pl.id and x.id<>a.id and x.status<>'cancelado') then
            update public.planos_atendimento set status='cancelado',encerrado_em=now(),encerramento_automatico=false where id=pl.id;
          end if;
          update public.agendamentos set plano_id=null where id=a.id;
          v_plano_id:=null;
        end if;
      end if;
      v_origem:=case when coalesce(pl.sessoes_contratadas,1)=1 then 'unitario' else 'plano' end;
      v_original:=round(coalesce(pl.valor_tabela,0)/greatest(coalesce(pl.sessoes_contratadas,1),1),2);
      v_desconto:=round(coalesce(pl.desconto_valor,0)/greatest(coalesce(pl.sessoes_contratadas,1),1),2);
    end if;
  end if;
  if v_plano_id is null and p.sessoes_pacote>1 then raise exception 'Este procedimento exige contratação explícita de pacote'; end if;
  if v_plano_id is null then
    v_original:=round(coalesce(p.valor,0),2); v_desconto:=0; v_origem:='unitario';
    v_operacao:='unitario-agenda-'||a.id::text;
    select id into v_plano_id from public.planos_atendimento where clinica_id=cid and operacao_id=v_operacao
      and paciente_id=a.paciente_id and procedimento_id=a.procedimento_id and sessoes_contratadas=1 and status<>'cancelado' limit 1;
    if v_plano_id is null and exists(select 1 from public.planos_atendimento where clinica_id=cid and operacao_id=v_operacao) then
      v_operacao:=v_operacao||'-revisao-'||gen_random_uuid()::text;
    end if;
    if v_plano_id is null then
      insert into public.planos_atendimento(id,paciente_id,procedimento_id,nome,sessoes_contratadas,valor_tabela,desconto_valor,valor_final,
        forma_pagamento_prevista,parcelas,observacoes,status,criado_por,criado_em,operacao_id,desconto_pacote,desconto_cortesia,clinica_id)
      values(gen_random_uuid(),a.paciente_id::text,a.procedimento_id,'Atendimento unitário — '||p.nome,1,v_original,0,v_original,
        'PIX',1,'Criado automaticamente pelo agendamento '||a.id::text,'ativo',coalesce(perfil->>'nome','Administrador'),now(),v_operacao,0,0,cid)
      returning id into v_plano_id;
    end if;
    update public.agendamentos set plano_id=v_plano_id where id=a.id and plano_id is null;
  end if;
  insert into public.cobrancas_agendamento(clinica_id,agendamento_id,paciente_id,procedimento_id,profissional_id,plano_id,
    paciente_nome,procedimento_nome,profissional_nome,data_agendamento,valor_original,desconto_tipo,desconto_valor,origem,criado_por)
  select cid,a.id,a.paciente_id::text,a.procedimento_id,a.profissional_id::text,v_plano_id,
    pac.nome,p.nome,e.nome,a.data,v_original,case when v_desconto>0 then case when v_origem='plano' then 'pacote' else 'cortesia' end else 'nenhum' end,
    v_desconto,v_origem,coalesce(perfil->>'nome','Administrador')
  from public.pacientes pac left join public.equipe e on e.id::text=a.profissional_id::text and e.clinica_id=cid
  where pac.id::text=a.paciente_id::text and pac.clinica_id=cid
  on conflict (clinica_id,agendamento_id) do update set
    procedimento_id=excluded.procedimento_id,procedimento_nome=excluded.procedimento_nome,
    profissional_id=excluded.profissional_id,profissional_nome=excluded.profissional_nome,
    plano_id=excluded.plano_id,data_agendamento=excluded.data_agendamento,
    valor_original=excluded.valor_original,desconto_tipo=excluded.desconto_tipo,desconto_valor=excluded.desconto_valor,
    origem=excluded.origem,baixa_tipo=null,baixa_motivo=null,baixada_em=null,baixada_por=null,atualizado_em=now()
  where (cobrancas_agendamento.procedimento_id is distinct from excluded.procedimento_id
      or cobrancas_agendamento.plano_id is distinct from excluded.plano_id
      or cobrancas_agendamento.profissional_id is distinct from excluded.profissional_id
      or cobrancas_agendamento.data_agendamento is distinct from excluded.data_agendamento or v_reabrir)
    and (cobrancas_agendamento.baixada_em is null or v_reabrir)
    and not exists(select 1 from public.pagamentos g where g.clinica_id=cid
      and (g.cobranca_agendamento_id=cobrancas_agendamento.id or g.agendamento_id=a.id or g.plano_id=cobrancas_agendamento.plano_id)
      group by g.clinica_id having sum(g.valor)<>0)
    and not exists(select 1 from public.creditos_paciente_usos u where u.clinica_id=cid and u.plano_id=cobrancas_agendamento.plano_id group by u.clinica_id having sum(u.valor)<>0);
  if v_plano_anterior is not null then
    insert into public.auditoria_contratos(clinica_id,plano_id,acao,antes,depois,motivo,autor)
    values(cid,v_plano_anterior,'reprecificar_procedimento',jsonb_build_object('agendamento_id',a.id,'plano_id',v_plano_anterior),
      jsonb_build_object('plano_id',v_plano_id,'procedimento_id',p.id,'valor_tabela',v_original),
      'Troca de procedimento sem saldo recebido; contrato anterior preservado',coalesce(perfil->>'nome','Administrador'));
  end if;
  select * into c from public.cobrancas_agendamento where clinica_id=cid and agendamento_id=a.id;
  if c.baixada_em is null and c.plano_id is distinct from v_plano_id then raise exception 'A cobrança possui vínculo financeiro diferente; revise os recebimentos e créditos antes de continuar'; end if;
  return to_jsonb(c);
end $function$;

CREATE OR REPLACE FUNCTION public.kinesys_editar_atendimento(p_agendamento_id uuid, p_profissional_id text, p_procedimento_id uuid, p_data date, p_hora_inicio time without time zone, p_hora_fim time without time zone, p_extraordinario boolean, p_esperado jsonb, p_converter_pacote boolean DEFAULT false, p_confirmar_reprecificacao boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare perfil jsonb:=public.kinesys_perfil_sessao();cid uuid:=(perfil->>'clinica_id')::uuid;
 a public.agendamentos%rowtype;pl public.planos_atendimento%rowtype;p public.procedimentos%rowtype;
 v_plano uuid;v_pago numeric:=0;v_cobranca jsonb;v_preservado boolean:=false;
begin
 if cid is null or coalesce(perfil->>'tipo','') not in ('MASTER','MASTER_FEM','SECRETARIA') then
   raise exception 'Seu perfil não pode editar este atendimento' using errcode='42501';
 end if;
 select * into a from public.agendamentos where id=p_agendamento_id and clinica_id=cid for update;
 if not found then raise exception 'Atendimento não encontrado'; end if;
 if p_esperado is null or not (p_esperado ?& array['paciente_id','procedimento_id','profissional_id','plano_id','status','data','hora_inicio','hora_fim'])
  or a.paciente_id is distinct from p_esperado->>'paciente_id'
  or a.procedimento_id is distinct from (p_esperado->>'procedimento_id')::uuid
  or a.profissional_id is distinct from p_esperado->>'profissional_id'
  or a.plano_id is distinct from (p_esperado->>'plano_id')::uuid
  or a.status is distinct from p_esperado->>'status'
  or a.data is distinct from (p_esperado->>'data')::date
  or a.hora_inicio is distinct from (p_esperado->>'hora_inicio')::time
  or a.hora_fim is distinct from (p_esperado->>'hora_fim')::time then
   raise exception 'O atendimento foi alterado por outra pessoa. Atualize a agenda e tente novamente.' using errcode='40001';
 end if;
 if p_data is null or p_hora_inicio is null or p_hora_fim is null or p_hora_inicio>=p_hora_fim then raise exception 'Data ou intervalo inválido'; end if;
 select * into p from public.procedimentos where id=p_procedimento_id and clinica_id=cid and coalesce(ativo,true) for share;
 if not found or not exists(select 1 from public.equipe e where e.id=p_profissional_id and e.clinica_id=cid)
   or (coalesce(array_length(p.profissionais_ids,1),0)>0 and not p_profissional_id=any(p.profissionais_ids)) then
   raise exception 'Profissional ou procedimento indisponível neste atendimento';
 end if;
 v_plano:=a.plano_id;
 if v_plano is not null then
  select * into pl from public.planos_atendimento where id=v_plano and clinica_id=cid and paciente_id=a.paciente_id for update;
  if not found then raise exception 'Contrato incompatível com paciente ou clínica'; end if;
  select coalesce(sum(g.valor),0) into v_pago from public.pagamentos g where g.clinica_id=cid and (g.plano_id=pl.id or g.agendamento_id=a.id);
  select v_pago+coalesce(sum(valor),0) into v_pago from public.creditos_paciente_usos where clinica_id=cid and plano_id=pl.id and paciente_id=a.paciente_id;
  if pl.sessoes_contratadas>1 and p.id is distinct from a.procedimento_id then
   if not coalesce(p_converter_pacote,false) or p.sessoes_pacote<>1 then raise exception 'Confirme a conversão para um procedimento individual'; end if;
   if perfil->>'tipo' not in ('MASTER','MASTER_FEM') then raise exception 'Somente administradores podem converter contratações' using errcode='42501'; end if;
   if pl.status<>'cancelado' then raise exception 'Cancele o pacote antes de converter esta ocorrência em atendimento individual'; end if;
   if v_pago<>0 then raise exception 'O pacote possui saldo recebido. Revise os recebimentos antes da conversão'; end if;
   v_plano:=null;
  elsif p.id is distinct from a.procedimento_id and v_pago<>0 then
   if not coalesce(p_confirmar_reprecificacao,false) then raise exception 'Confirme a atualização da cobrança preservando os recebimentos existentes'; end if;
   if p.sessoes_pacote<>1 then raise exception 'Vincule uma contratação compatível antes de converter para pacote'; end if;
   if exists(select 1 from public.agendamentos x where x.plano_id=pl.id and x.id<>a.id and x.status<>'cancelado') then raise exception 'Esta contratação está vinculada a outras ocorrências. Revise o Financeiro antes da troca'; end if;
   perform public.kinesys_alterar_contrato(pl.id,'personalizar','Reprecificação explícita pelo procedimento realizado, preservando recebimentos e condições originais',
     jsonb_build_object('sessoes',1,'valor',round(p.valor,2),'desconto_pacote',0,'desconto_cortesia',0,'procedimento_realizado_id',p.id));
   v_preservado:=true;
  end if;
 end if;
 update public.agendamentos set profissional_id=p_profissional_id,procedimento_id=p.id,data=p_data,
  hora_inicio=p_hora_inicio,hora_fim=p_hora_fim,plano_id=v_plano,
  excecao_agenda=case when p_esperado ? 'excecoes_confirmadas' then p_esperado->'excecoes_confirmadas' else a.excecao_agenda end,
  horario_extraordinario=coalesce(p_extraordinario,false),
  horario_extraordinario_confirmado_por=case when p_extraordinario then perfil->>'nome' end,
  horario_extraordinario_confirmado_em=case when p_extraordinario then now() end where id=a.id;
 if a.plano_id is distinct from v_plano and a.plano_id is not null then
  insert into public.auditoria_contratos(clinica_id,plano_id,acao,antes,depois,motivo,autor)
   values(cid,a.plano_id,'converter_para_unitario',to_jsonb(a),jsonb_build_object('procedimento_id',p.id,'plano_id',v_plano),
    'Conversão explícita de ocorrência de pacote cancelado, sem saldo recebido',perfil->>'nome');
 end if;
 if v_preservado then
  update public.cobrancas_agendamento set procedimento_id=p.id,procedimento_nome=p.nome,valor_original=round(p.valor,2),
   desconto_tipo='nenhum',desconto_valor=0,profissional_id=p_profissional_id,data_agendamento=p_data,atualizado_em=now()
   where agendamento_id=a.id and clinica_id=cid and baixada_em is null;
 end if;
 if a.status<>'cancelado' and p.sessoes_pacote=1
  and (a.pacote_desvinculado_id is null or a.procedimento_id is distinct from p.id) and
  (a.procedimento_id is distinct from p.id or a.plano_id is distinct from v_plano
   or (v_plano is not null and pl.procedimento_id is distinct from p.id)
   or exists(select 1 from public.cobrancas_agendamento c where c.agendamento_id=a.id and c.clinica_id=cid)) then
  v_cobranca:=public.kinesys_preparar_cobranca_agendamento(a.id);
  if coalesce(v_cobranca->>'procedimento_id','')<>p.id::text or v_cobranca->>'baixada_em' is not null then
   raise exception 'A cobrança não pôde ser reconciliada; nenhuma alteração foi salva';
  end if;
 end if;
 select * into a from public.agendamentos where id=a.id;
 return jsonb_build_object('ok',true,'agendamento',to_jsonb(a),'cobranca',v_cobranca,'recebimentos_preservados',v_preservado);
end $function$;

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
 a.pacote_desvinculado_id is not null as desvinculado,
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
 ) select id,
   case when desvinculado then null else cobranca_id end,
   case when desvinculado then 0 else original end,
   case when desvinculado then 0 else desconto end,
   case when desvinculado or cancelado_sem_cobranca then 0 else devido end,
   case when desvinculado then 0 else pago end,
   case when desvinculado or cancelado_sem_cobranca then 0 else greatest(devido-pago,0) end,
   case when desvinculado then 'sem_cobranca' when cancelado_sem_cobranca then 'cancelado'
        when devido<=pago then 'pago' when pago<=0 then 'pendente' else 'parcial' end,origem from base;
$function$;
