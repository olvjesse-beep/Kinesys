-- Contratação é explícita; agenda nunca cria direitos de pacote.
alter table public.procedimentos add column sessoes_pacote integer not null default 1 check (sessoes_pacote > 0);
update public.procedimentos set sessoes_pacote=10 where nome='Sessão de Fisioterapia - PCT';
alter table public.planos_atendimento add column condicoes_originais jsonb;
alter table public.planos_atendimento add column personalizacao jsonb;
update public.planos_atendimento set condicoes_originais=jsonb_build_object('sessoes',sessoes_contratadas,'valor',valor_tabela,'desconto_pacote',desconto_pacote,'desconto_cortesia',desconto_cortesia,'desconto',desconto_valor);

create table public.auditoria_contratos (
 id uuid primary key default gen_random_uuid(), clinica_id uuid not null references public.clinicas(id),
 plano_id uuid not null references public.planos_atendimento(id), acao text not null,
 antes jsonb, depois jsonb, motivo text not null, autor text not null, criado_em timestamptz not null default now()
);
alter table public.auditoria_contratos enable row level security;
create policy contratos_auditoria_leitura on public.auditoria_contratos for select to authenticated
 using (clinica_id=public.kinesys_current_clinica_id() and (public.kinesys_perfil_sessao()->>'tipo') in ('MASTER','MASTER_FEM'));
grant select on public.auditoria_contratos to authenticated;

create or replace function public.kinesys_contratar_pacote(p_paciente_id text,p_procedimento_id uuid,p_operacao_id text,p_personalizacao jsonb default null,p_detalhes jsonb default '{}')
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare perfil jsonb:=public.kinesys_perfil_sessao(); cid uuid:=(perfil->>'clinica_id')::uuid;
 proc public.procedimentos%rowtype; contrato public.planos_atendimento%rowtype; base jsonb;
 sessoes integer; valor numeric; dp numeric; dc numeric;
begin
 if cid is null or coalesce(perfil->>'tipo','') not in ('MASTER','MASTER_FEM') then raise exception 'Somente administradores podem contratar' using errcode='42501'; end if;
 if nullif(btrim(p_operacao_id),'') is null then raise exception 'Operação obrigatória'; end if;
 perform pg_advisory_xact_lock(hashtextextended(cid::text||p_operacao_id,0));
 select * into contrato from public.planos_atendimento where clinica_id=cid and operacao_id=p_operacao_id;
 if found then
  if contrato.paciente_id<>p_paciente_id or contrato.procedimento_id is distinct from p_procedimento_id then raise exception 'Operação pertence a outra contratação'; end if;
  return to_jsonb(contrato);
 end if;
 perform 1 from public.pacientes where id=p_paciente_id and clinica_id=cid;
 if not found then raise exception 'Paciente não encontrado nesta clínica'; end if;
 select * into proc from public.procedimentos where id=p_procedimento_id and clinica_id=cid and ativo for share;
 if not found then raise exception 'Procedimento indisponível'; end if;
 base:=jsonb_build_object('sessoes',proc.sessoes_pacote,'valor',proc.valor,'desconto_pacote',0,'desconto_cortesia',0,'desconto',0);
 sessoes:=coalesce((p_personalizacao->>'sessoes')::integer,proc.sessoes_pacote);
 valor:=coalesce((p_personalizacao->>'valor')::numeric,proc.valor);
 dp:=coalesce((p_personalizacao->>'desconto_pacote')::numeric,0); dc:=coalesce((p_personalizacao->>'desconto_cortesia')::numeric,0);
 if sessoes is null or valor is null or sessoes<1 or valor<0 or dp<0 or dc<0 or dp+dc>valor then raise exception 'Cadastre preço e condições válidas antes de contratar'; end if;
 insert into public.planos_atendimento(paciente_id,procedimento_id,nome,sessoes_contratadas,valor_tabela,desconto_valor,desconto_pacote,desconto_cortesia,valor_final,status,criado_por,operacao_id,clinica_id,condicoes_originais,personalizacao,forma_pagamento_prevista,parcelas,observacoes)
 values(p_paciente_id,proc.id,coalesce(nullif(btrim(p_detalhes->>'nome'),''),proc.nome),sessoes,valor,dp+dc,dp,dc,valor-dp-dc,'ativo',perfil->>'nome',p_operacao_id,cid,base,p_personalizacao,coalesce(p_detalhes->>'forma','PIX'),greatest(1,coalesce((p_detalhes->>'parcelas')::integer,1)),p_detalhes->>'observacoes') returning * into contrato;
 insert into public.auditoria_contratos(clinica_id,plano_id,acao,depois,motivo,autor) values(cid,contrato.id,'contratar',to_jsonb(contrato),'Contratação explícita',perfil->>'nome');
 return to_jsonb(contrato);
end $$;

create or replace function public.kinesys_alterar_contrato(p_plano_id uuid,p_acao text,p_motivo text,p_personalizacao jsonb default null)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare perfil jsonb:=public.kinesys_perfil_sessao(); cid uuid:=(perfil->>'clinica_id')::uuid;
 pl public.planos_atendimento%rowtype; anterior jsonb; cond jsonb; qtd integer; valor numeric; dp numeric; dc numeric; desconto numeric; usados integer; pagos numeric;
begin
 if cid is null or coalesce(perfil->>'tipo','') not in ('MASTER','MASTER_FEM') then raise exception 'Somente administradores podem alterar contratos' using errcode='42501'; end if;
 if length(btrim(coalesce(p_motivo,'')))<3 then raise exception 'Informe o motivo'; end if;
 select * into pl from public.planos_atendimento where id=p_plano_id and clinica_id=cid for update;
 if not found then raise exception 'Contrato não encontrado'; end if;
 anterior:=to_jsonb(pl);
 if pl.status='cancelado' then raise exception 'Contrato cancelado não pode ser reativado'; end if;
 if p_acao='cancelar' then
  update public.planos_atendimento set status='cancelado',encerramento_automatico=false,encerrado_em=now() where id=pl.id returning * into pl;
  update public.agendamentos set plano_id=null,status='pre_agendado' where plano_id=pl.id and status in ('pre_agendado','agendado','confirmado','em_recepcao');
 elsif p_acao in ('personalizar','remover_personalizacao') then
  if p_acao='personalizar' and p_personalizacao is null then raise exception 'Informe a personalização'; end if;
  cond:=pl.condicoes_originais || case when p_acao='personalizar' then p_personalizacao else '{}'::jsonb end;
  qtd:=(cond->>'sessoes')::integer; valor:=(cond->>'valor')::numeric;
  dp:=coalesce((cond->>'desconto_pacote')::numeric,0); dc:=coalesce((cond->>'desconto_cortesia')::numeric,0);
  desconto:=case when p_acao='remover_personalizacao' then coalesce((cond->>'desconto')::numeric,dp+dc) else dp+dc end;
  select count(*) into usados from public.agendamentos where plano_id=pl.id and status in ('pre_agendado','agendado','confirmado','em_recepcao','atendido','concluido','falta_nao_justificada');
  select coalesce(sum(g.valor),0) into pagos from public.pagamentos g where g.plano_id=pl.id;
  if qtd is null or valor is null or qtd<greatest(1,usados) or valor<0 or dp<0 or dc<0 or desconto>valor or valor-desconto<pagos then raise exception 'Condições incompatíveis com sessões vinculadas ou pagamentos. Ajuste os vínculos/estornos antes.'; end if;
  update public.planos_atendimento set sessoes_contratadas=qtd,valor_tabela=valor,desconto_valor=desconto,desconto_pacote=dp,desconto_cortesia=dc,valor_final=valor-desconto,personalizacao=case when p_acao='personalizar' then p_personalizacao else null end where id=pl.id returning * into pl;
  if pl.encerramento_automatico and (select count(*) from public.agendamentos where plano_id=pl.id and status in ('atendido','concluido','falta_nao_justificada'))<qtd then
   update public.planos_atendimento set status='ativo',encerramento_automatico=false,encerrado_em=null where id=pl.id returning * into pl;
  end if;
 else raise exception 'Ação inválida'; end if;
 insert into public.auditoria_contratos(clinica_id,plano_id,acao,antes,depois,motivo,autor) values(cid,pl.id,p_acao,anterior,to_jsonb(pl),p_motivo,perfil->>'nome');
 return to_jsonb(pl);
end $$;

-- Mantém tombstone e histórico. Um cache antigo não pode recriar o ID apagado.
create or replace function public.kinesys_proteger_contrato() returns trigger language plpgsql set search_path=public,pg_temp as $$
begin
 if tg_op='DELETE' then raise exception 'Cancele a contratação; excluir contrato apagaria a auditoria'; end if;
 if current_user not in ('postgres','supabase_admin') and (new.sessoes_contratadas>1 or exists(select 1 from public.procedimentos where id=new.procedimento_id and sessoes_pacote>1)) then
  if tg_op='INSERT' then raise exception 'Confirme a contratação pela operação de contratos'; end if;
  if (new.status,new.sessoes_contratadas,new.valor_tabela,new.valor_final,new.desconto_valor) is distinct from (old.status,old.sessoes_contratadas,old.valor_tabela,old.valor_final,old.desconto_valor) then raise exception 'Altere as condições pela operação de contratos'; end if;
 end if;
 if tg_op='INSERT' then
  new.condicoes_originais:=coalesce(new.condicoes_originais,jsonb_build_object('sessoes',new.sessoes_contratadas,'valor',new.valor_tabela,'desconto',new.desconto_valor,'desconto_pacote',new.desconto_pacote,'desconto_cortesia',new.desconto_cortesia));
  return new;
 end if;
 if old.status='cancelado' and new.status<>'cancelado' then raise exception 'Contrato cancelado não pode ser reativado'; end if;
 if (new.paciente_id,new.procedimento_id,new.clinica_id,new.operacao_id) is distinct from (old.paciente_id,old.procedimento_id,old.clinica_id,old.operacao_id) then raise exception 'A identidade da contratação é imutável'; end if;
 if old.status='concluido' and not coalesce(old.encerramento_automatico,false) and new.status='ativo' then raise exception 'Contrato encerrado manualmente não pode ser reativado'; end if;
 if new.condicoes_originais is distinct from old.condicoes_originais then raise exception 'As condições originais do contrato são imutáveis'; end if;
 return new;
end $$;
create trigger proteger_contrato before insert or delete or update on public.planos_atendimento for each row execute function public.kinesys_proteger_contrato();

create or replace function public.kinesys_validar_agendamento_plano() returns trigger language plpgsql set search_path=public,pg_temp as $$
declare pl public.planos_atendimento%rowtype; usados integer; consome boolean:=new.status in ('atendido','concluido','falta_nao_justificada'); reserva boolean:=new.status in ('pre_agendado','agendado','confirmado','em_recepcao');
begin
 if new.plano_id is null then
  if consome and exists(select 1 from public.procedimentos where id=new.procedimento_id and sessoes_pacote>1) then raise exception 'Contrate e vincule um pacote antes de realizar a sessão'; end if;
  return new;
 end if;
 select * into pl from public.planos_atendimento where id=new.plano_id for update;
 if not found or pl.paciente_id<>new.paciente_id or pl.clinica_id<>new.clinica_id or (pl.procedimento_id is not null and pl.procedimento_id<>new.procedimento_id) then raise exception 'Contrato incompatível com paciente, clínica ou procedimento'; end if;
 if tg_op='UPDATE' and new.plano_id=old.plano_id and new.status=old.status then return new; end if;
 if pl.status<>'ativo' and (consome or reserva) then
  if not (tg_op='UPDATE' and new.plano_id=old.plano_id and pl.encerramento_automatico and old.status in ('atendido','concluido','falta_nao_justificada')) then raise exception 'Contrato não está ativo'; end if;
 end if;
 if consome or reserva then
  select count(*) into usados from public.agendamentos where plano_id=pl.id and id<>new.id and status in ('pre_agendado','agendado','confirmado','em_recepcao','atendido','concluido','falta_nao_justificada');
  if usados>=pl.sessoes_contratadas then raise exception 'Todas as sessões estão consumidas ou reservadas'; end if;
 end if;
 return new;
end $$;
drop trigger trg_kinesys_agendamento_plano on public.agendamentos;
create trigger trg_kinesys_agendamento_plano before insert or update of plano_id,paciente_id,procedimento_id,status on public.agendamentos for each row execute function public.kinesys_validar_agendamento_plano();

revoke all on function public.kinesys_contratar_pacote(text,uuid,text,jsonb,jsonb) from public;
revoke all on function public.kinesys_alterar_contrato(uuid,text,text,jsonb) from public;
grant execute on function public.kinesys_contratar_pacote(text,uuid,text,jsonb,jsonb) to authenticated;
grant execute on function public.kinesys_alterar_contrato(uuid,text,text,jsonb) to authenticated;

-- Baixa mantém todos os recebimentos/estornos e aceita apenas reversões integrais.
CREATE OR REPLACE FUNCTION public.kinesys_baixar_cobranca_agendamento(p_agendamento_id uuid, p_tipo text, p_motivo text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  perfil jsonb:=public.kinesys_perfil_sessao(); cid uuid:=(perfil->>'clinica_id')::uuid; papel text:=perfil->>'tipo';
  c public.cobrancas_agendamento%rowtype; pl public.planos_atendimento%rowtype;
  qtd_pagamentos integer:=0; tipo text:=lower(btrim(coalesce(p_tipo,''))); motivo text:=nullif(btrim(coalesce(p_motivo,'')),'');
  desconto_tipo_novo text;
begin
  if cid is null or papel not in ('MASTER','MASTER_FEM') then raise exception 'Somente administradores podem remover pendências financeiras' using errcode='42501'; end if;
  if tipo not in ('cortesia','migracao_pacote','lancamento_incorreto','outro') then raise exception 'Tipo de baixa inválido'; end if;
  if motivo is null or length(motivo)<3 then raise exception 'Informe o motivo da baixa'; end if;

  -- A cobrança é o registro financeiro histórico e deve ser a fonte de verdade da baixa.
  -- Não exigimos que o agendamento ainda exista ou mantenha o mesmo estado/plano.
  select * into c
    from public.cobrancas_agendamento
   where clinica_id=cid and agendamento_id=p_agendamento_id
   for update;

  -- Compatibilidade: se a cobrança ainda não foi materializada, só então tentamos
  -- prepará-la a partir de um agendamento atualmente válido.
  if not found then
    perform public.kinesys_preparar_cobranca_agendamento(p_agendamento_id);
    select * into c
      from public.cobrancas_agendamento
     where clinica_id=cid and agendamento_id=p_agendamento_id
     for update;
  end if;

  if not found then raise exception 'Cobrança não encontrada nesta clínica'; end if;
  if c.baixada_em is not null then
    return jsonb_build_object('ok',true,'repetido',true,'agendamento_id',p_agendamento_id,'cobranca_id',c.id,'baixada_em',c.baixada_em);
  end if;
  if c.origem='plano' then raise exception 'Pendências de pacote devem ser ajustadas no próprio plano; esta ação é exclusiva para cobrança unitária'; end if;

  -- Verifica pagamentos pela cobrança histórica, sem depender da existência do agendamento.
  select count(*) into qtd_pagamentos
    from public.pagamentos
   where clinica_id=cid
     and (cobranca_agendamento_id=c.id or (cobranca_agendamento_id is null and agendamento_id=p_agendamento_id))
     and pagamentos.tipo<>'estorno' and not exists(select 1 from public.pagamentos e where e.estorno_de=pagamentos.id and e.tipo='estorno' and e.valor=-pagamentos.valor and e.clinica_id=cid);
  if qtd_pagamentos>0 then raise exception 'Há pagamento lançado neste atendimento. Estorne o recebimento antes de remover a pendência'; end if;

  desconto_tipo_novo:=case when tipo='migracao_pacote' then 'pacote' else 'cortesia' end;
  update public.cobrancas_agendamento
     set desconto_valor=valor_original,
         desconto_tipo=desconto_tipo_novo,
         baixa_tipo=tipo,
         baixa_motivo=motivo,
         baixada_em=now(),
         baixada_por=coalesce(perfil->>'nome','Administrador'),
         atualizado_em=now()
   where id=c.id
   returning * into c;

  -- Só encerra o plano unitário automático originalmente criado para esta cobrança.
  -- Um pacote atual do paciente nunca é alterado por esta baixa histórica.
  if c.plano_id is not null then
    select * into pl from public.planos_atendimento where id=c.plano_id and clinica_id=cid for update;
    if found and coalesce(pl.sessoes_contratadas,1)=1 and pl.operacao_id='unitario-agenda-'||p_agendamento_id::text then
      update public.planos_atendimento
         set desconto_valor=valor_tabela,
             desconto_pacote=case when tipo='migracao_pacote' then valor_tabela else 0 end,
             desconto_cortesia=case when tipo='cortesia' then valor_tabela else 0 end,
             valor_final=0,
             status='cancelado',
             encerramento_automatico=false,
             encerrado_em=coalesce(encerrado_em,now()),
             observacoes=concat_ws(E'\n',nullif(observacoes,''),'Baixa financeira ['||tipo||']: '||motivo)
       where id=pl.id;
    end if;
  end if;

  return jsonb_build_object('ok',true,'agendamento_id',p_agendamento_id,'cobranca_id',c.id,'baixa_tipo',tipo,'baixa_motivo',motivo,'valor_pendente',0);
end $function$
;
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
  v_plano_id uuid; v_operacao text;
begin
  if cid is null or papel not in ('MASTER','MASTER_FEM') then raise exception 'Somente administradores podem preparar cobranças' using errcode='42501'; end if;
  select * into a from public.agendamentos where id=p_agendamento_id and clinica_id=cid for update;
  if not found or a.status='cancelado' then raise exception 'Agendamento não encontrado ou cancelado'; end if;

  select * into c from public.cobrancas_agendamento where clinica_id=cid and agendamento_id=a.id;
  if found and c.baixada_em is not null then
    return to_jsonb(c);
  end if;

  select * into p from public.procedimentos where id=a.procedimento_id and clinica_id=cid;
  if not found then raise exception 'Serviço do agendamento não encontrado'; end if;
  v_plano_id:=a.plano_id;
  if v_plano_id is not null then
    select * into pl from public.planos_atendimento where id=v_plano_id and clinica_id=cid;
    if found then
      if pl.sessoes_contratadas>1 then raise exception 'Registre o recebimento na contratação do pacote'; end if;
      v_origem:=case when coalesce(pl.sessoes_contratadas,1)=1 then 'unitario' else 'plano' end;
      v_original:=round(coalesce(pl.valor_tabela,0)/greatest(coalesce(pl.sessoes_contratadas,1),1),2);
      v_desconto:=round(coalesce(pl.desconto_valor,0)/greatest(coalesce(pl.sessoes_contratadas,1),1),2);
    end if;
  end if;
  if v_plano_id is null and p.sessoes_pacote>1 then raise exception 'Este procedimento exige contratação explícita de pacote'; end if;
  if v_plano_id is null then
    v_original:=round(coalesce(p.valor,0),2); v_desconto:=0; v_origem:='unitario';
    v_operacao:='unitario-agenda-'||a.id::text;
    select id into v_plano_id from public.planos_atendimento where clinica_id=cid and operacao_id=v_operacao limit 1;
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
  on conflict (clinica_id,agendamento_id) do nothing;
  select * into c from public.cobrancas_agendamento where clinica_id=cid and agendamento_id=a.id;
  return to_jsonb(c);
end $function$
;

create or replace function public.kinesys_converter_cobranca_pacote() returns trigger
language plpgsql security definer set search_path=public,pg_temp as $$
declare c public.cobrancas_agendamento%rowtype;
begin
 if new.plano_id is not null and new.plano_id is distinct from old.plano_id and exists(select 1 from public.planos_atendimento where id=new.plano_id and sessoes_contratadas>1) then
  select * into c from public.cobrancas_agendamento where agendamento_id=new.id and clinica_id=new.clinica_id and origem<>'plano' and baixada_em is null;
  if found then perform public.kinesys_baixar_cobranca_agendamento(new.id,'migracao_pacote','Conversão explícita do agendamento para contratação de pacote'); end if;
 end if;
 return null;
end $$;
create trigger converter_cobranca_pacote after update of plano_id on public.agendamentos for each row execute function public.kinesys_converter_cobranca_pacote();

create or replace function public.kinesys_vincular_contrato(p_agendamento_id uuid,p_plano_id uuid) returns jsonb
language plpgsql security definer set search_path=public,pg_temp as $$
declare perfil jsonb:=public.kinesys_perfil_sessao(); cid uuid:=(perfil->>'clinica_id')::uuid; pl public.planos_atendimento%rowtype; a public.agendamentos%rowtype;
begin
 if cid is null or coalesce(perfil->>'tipo','') not in ('MASTER','MASTER_FEM') then raise exception 'Somente administradores podem converter contratações' using errcode='42501'; end if;
 select * into pl from public.planos_atendimento where id=p_plano_id and clinica_id=cid for update;
 if not found then raise exception 'Contrato não encontrado'; end if;
 select * into a from public.agendamentos where id=p_agendamento_id and clinica_id=cid for update;
 if not found or a.paciente_id<>pl.paciente_id then raise exception 'Agendamento incompatível'; end if;
 update public.agendamentos set plano_id=pl.id,procedimento_id=coalesce(pl.procedimento_id,procedimento_id) where id=a.id;
 insert into public.auditoria_contratos(clinica_id,plano_id,acao,antes,depois,motivo,autor) values(cid,pl.id,'vincular',jsonb_build_object('agendamento_id',a.id,'plano_id',a.plano_id,'procedimento_id',a.procedimento_id),jsonb_build_object('plano_id',pl.id),'Vínculo ou conversão de atendimento',perfil->>'nome');
 return jsonb_build_object('ok',true);
end $$;
revoke all on function public.kinesys_vincular_contrato(uuid,uuid) from public;
grant execute on function public.kinesys_vincular_contrato(uuid,uuid) to authenticated;

-- Uma sessão de pacote usa o saldo do contrato, nunca uma segunda cobrança.
create or replace function public.kinesys_situacao_financeira_agendamentos(p_ids uuid[])
returns table(agendamento_id uuid,cobranca_id uuid,valor_original numeric,desconto_valor numeric,valor_devido numeric,total_pago numeric,valor_pendente numeric,status_financeiro text,origem text)
language sql stable security definer set search_path=public,pg_temp as $$
 with perfil as (select public.kinesys_perfil_sessao() p), base as (
 select a.id,case when pl.sessoes_contratadas>1 then null else c.id end cobranca_id,
 case when pl.sessoes_contratadas>1 then pl.valor_tabela else coalesce(c.valor_original,pl.valor_tabela,pr.valor,0) end original,
 case when pl.sessoes_contratadas>1 then pl.desconto_valor else coalesce(c.desconto_valor,pl.desconto_valor,0) end desconto,
 case when pl.sessoes_contratadas>1 then pl.valor_final else coalesce(c.valor_devido,pl.valor_final,pr.valor,0) end devido,
 case when pl.sessoes_contratadas>1 then 'plano' else coalesce(c.origem,'avulso') end origem,
 coalesce((select sum(g.valor) from public.pagamentos g where g.clinica_id=a.clinica_id and case when pl.sessoes_contratadas>1 then g.plano_id=pl.id else g.cobranca_agendamento_id=c.id or (g.cobranca_agendamento_id is null and g.agendamento_id=a.id) end),0) pago
 from public.agendamentos a join perfil x on a.clinica_id=(x.p->>'clinica_id')::uuid
 left join public.planos_atendimento pl on pl.id=a.plano_id and pl.clinica_id=a.clinica_id
 left join public.cobrancas_agendamento c on c.agendamento_id=a.id and c.clinica_id=a.clinica_id
 left join public.procedimentos pr on pr.id=a.procedimento_id and pr.clinica_id=a.clinica_id
 where a.id=any(p_ids) and x.p->>'tipo' in ('MASTER','MASTER_FEM')
 ) select id,cobranca_id,original,desconto,devido,pago,greatest(devido-pago,0),case when devido<=pago then 'pago' when pago<=0 then 'pendente' else 'parcial' end,origem from base;
$$;

