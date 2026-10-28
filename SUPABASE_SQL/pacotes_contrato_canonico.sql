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
  v_plano_id uuid; v_operacao text; v_plano_anterior uuid; v_reabrir boolean:=false; v_pago numeric:=0;
begin
  if cid is null or papel not in ('MASTER','MASTER_FEM','ADMINISTRADOR','ADMINISTRADORA','SECRETARIA') then raise exception 'Somente administradores podem preparar cobranças' using errcode='42501'; end if;
  select * into a from public.agendamentos where id=p_agendamento_id and clinica_id=cid for update;
  if not found or a.status='cancelado' then raise exception 'Agendamento não encontrado ou cancelado'; end if;

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
end $function$
;

-- Edição online atômica: ocorrência, vínculo e cobrança mudam ou falham juntos.
create or replace function public.kinesys_editar_atendimento(
 p_agendamento_id uuid,p_profissional_id text,p_procedimento_id uuid,p_data date,
 p_hora_inicio time,p_hora_fim time,p_extraordinario boolean,p_esperado jsonb,p_converter_pacote boolean default false,
 p_confirmar_reprecificacao boolean default false)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
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
 if a.status<>'cancelado' and p.sessoes_pacote=1 and
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
end $$;
revoke all on function public.kinesys_editar_atendimento(uuid,text,uuid,date,time,time,boolean,jsonb,boolean,boolean) from public;
revoke all on function public.kinesys_editar_atendimento(uuid,text,uuid,date,time,time,boolean,jsonb,boolean,boolean) from anon;
grant execute on function public.kinesys_editar_atendimento(uuid,text,uuid,date,time,time,boolean,jsonb,boolean,boolean) to authenticated;

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

-- Encaixes internos explicitamente confirmados. O portal público nunca recebe
-- autorização para ignorar ocupação, ausência ou feriado.
alter table public.agendamentos add column if not exists excecao_agenda jsonb;

create or replace function public.kinesys_consultar_excecoes_agenda(
 p_profissional_id text,p_data date,p_inicio time,p_fim time,p_ignorar uuid default null)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare perfil jsonb:=public.kinesys_perfil_sessao(); cid uuid:=(perfil->>'clinica_id')::uuid;
 conflitos jsonb; bloqueios jsonb;
begin
 if cid is null or coalesce(perfil->>'tipo','') not in ('MASTER','MASTER_FEM','SECRETARIA','FISIOTERAPEUTA')
  or (perfil->>'tipo'='FISIOTERAPEUTA' and perfil->>'id' is distinct from p_profissional_id)
  or not exists(select 1 from public.equipe where id=p_profissional_id and clinica_id=cid and coalesce(ativo,true))
 then raise exception 'Seu perfil não pode consultar esta agenda' using errcode='42501'; end if;
 if p_data is null or p_inicio is null or p_fim is null or p_inicio>=p_fim then raise exception 'Data ou horário inválido'; end if;
 select coalesce(jsonb_agg(id::text order by id::text),'[]'::jsonb) into conflitos from public.agendamentos
 where clinica_id=cid and profissional_id=p_profissional_id and data=p_data and status<>'cancelado'
 and (p_ignorar is null or id<>p_ignorar) and hora_inicio<p_fim and hora_fim>p_inicio;
 select coalesce(jsonb_agg(id::text order by id::text),'[]'::jsonb) into bloqueios from public.bloqueios_agenda
 where clinica_id=cid and data=p_data and (profissional_id is null or profissional_id=p_profissional_id)
 and (hora_inicio is null or hora_fim is null or (hora_inicio<p_fim and hora_fim>p_inicio));
 return jsonb_build_object('contexto',jsonb_build_object('profissional_id',p_profissional_id,'data',p_data,'inicio',to_char(p_inicio,'HH24:MI'),'fim',to_char(p_fim,'HH24:MI')),
  'conflitos',conflitos,'bloqueios',bloqueios,'feriado',coalesce(public.kinesys_agendamento_online_feriado(p_data),''));
end $$;
revoke all on function public.kinesys_consultar_excecoes_agenda(text,date,time,time,uuid) from public,anon;
grant execute on function public.kinesys_consultar_excecoes_agenda(text,date,time,time,uuid) to authenticated;

create or replace function public.kinesys_validar_excecao_agenda() returns trigger
language plpgsql security definer set search_path=public,pg_temp as $$
declare perfil jsonb:=public.kinesys_perfil_sessao(); conflitos jsonb; bloqueios jsonb;
 feriado text; contexto jsonb; precisa boolean; confirmacao jsonb:=new.excecao_agenda;
begin
 if new.status='cancelado' then return new; end if;
 if tg_op='UPDATE' and old.status<>'cancelado' and
  (new.clinica_id,new.profissional_id,new.data,new.hora_inicio,new.hora_fim,new.horario_extraordinario,new.excecao_agenda)
  is not distinct from (old.clinica_id,old.profissional_id,old.data,old.hora_inicio,old.hora_fim,old.horario_extraordinario,old.excecao_agenda)
 then return new; end if;
 -- Campos são NOT NULL em produção; não criar exceção a essa constraint.
 if new.profissional_id is null or new.data is null or new.hora_inicio is null or new.hora_fim is null then return new; end if;
 -- Também é adquirido pelo cadastro de ausência: a confirmação não vale para
 -- um conflito/bloqueio que surgiu enquanto o diálogo estava aberto.
 perform pg_advisory_xact_lock(hashtextextended(new.clinica_id::text||':'||new.data::text,0));
 select coalesce(jsonb_agg(id::text order by id::text),'[]'::jsonb) into conflitos from public.agendamentos
 where clinica_id=new.clinica_id and profissional_id=new.profissional_id and data=new.data and status<>'cancelado'
 and id<>new.id and hora_inicio<new.hora_fim and hora_fim>new.hora_inicio;
 select coalesce(jsonb_agg(id::text order by id::text),'[]'::jsonb) into bloqueios from public.bloqueios_agenda
 where clinica_id=new.clinica_id and data=new.data and (profissional_id is null or profissional_id=new.profissional_id)
 and (hora_inicio is null or hora_fim is null or (hora_inicio<new.hora_fim and hora_fim>new.hora_inicio));
 feriado:=coalesce(public.kinesys_agendamento_online_feriado(new.data),'');
 precisa:=jsonb_array_length(conflitos)>0 or jsonb_array_length(bloqueios)>0 or feriado<>'';
 if new.origem='online' and (precisa or new.horario_extraordinario or confirmacao is not null) then
  raise exception 'Horário indisponível para agendamento público' using errcode='23P01';
 end if;
 if precisa then
  if coalesce(perfil->>'tipo','') not in ('MASTER','MASTER_FEM','SECRETARIA','FISIOTERAPEUTA')
   or (perfil->>'clinica_id')::uuid is distinct from new.clinica_id
   or (perfil->>'tipo'='FISIOTERAPEUTA' and perfil->>'id' is distinct from new.profissional_id)
  then raise exception 'Seu perfil não pode autorizar este encaixe' using errcode='42501'; end if;
  contexto:=jsonb_build_object('profissional_id',new.profissional_id,'data',new.data,'inicio',to_char(new.hora_inicio,'HH24:MI'),'fim',to_char(new.hora_fim,'HH24:MI'));
  if not new.horario_extraordinario or coalesce(confirmacao->>'confirmado','false')<>'true'
   or confirmacao->'contexto' is distinct from contexto
   or confirmacao->'conflitos' is distinct from conflitos or confirmacao->'bloqueios' is distinct from bloqueios
   or confirmacao->>'feriado' is distinct from feriado then
   raise exception 'A agenda possui atendimento, bloqueio ou feriado neste horário. Atualize e confirme o encaixe excepcional antes de salvar.' using errcode='23P01';
  end if;
 end if;
 if new.horario_extraordinario and new.origem='interno' then
  new.horario_extraordinario_confirmado_por:=coalesce(perfil->>'nome',new.horario_extraordinario_confirmado_por);
  new.horario_extraordinario_confirmado_em:=now();
  new.excecao_agenda:=coalesce(confirmacao,'{}'::jsonb)||jsonb_build_object('conflitos',conflitos,'bloqueios',bloqueios,'feriado',feriado,'notificacao_servidor',true,'confirmado_por_id',perfil->>'id','confirmado_em',now());
 end if;
 return new;
end $$;
revoke all on function public.kinesys_validar_excecao_agenda() from public,anon,authenticated;
drop trigger if exists zz_kinesys_excecao_agenda on public.agendamentos;
create trigger zz_kinesys_excecao_agenda before insert or update on public.agendamentos for each row execute function public.kinesys_validar_excecao_agenda();
-- O trigger serializa todos os horários e também considera encaixes existentes.
-- A constraint parcial mantém uma segunda trava para os horários ordinários.
alter table public.agendamentos drop constraint if exists agendamentos_sem_sobreposicao;
alter table public.agendamentos add constraint agendamentos_sem_sobreposicao exclude using gist
 (profissional_id with =,tsrange(data+hora_inicio,data+hora_fim,'[)') with &&)
 where(status<>'cancelado' and not horario_extraordinario);

create or replace function public.kinesys_notificar_excecao_agenda() returns trigger
language plpgsql security definer set search_path=public,pg_temp as $$
declare nome_paciente text; email_profissional text; motivos text[]:=array[]::text[];
begin
 if new.status='cancelado' or not new.horario_extraordinario then return new; end if;
 if tg_op='UPDATE' and (new.profissional_id,new.data,new.hora_inicio,new.hora_fim,new.horario_extraordinario,new.excecao_agenda->'conflitos',new.excecao_agenda->'bloqueios',coalesce(new.excecao_agenda->>'feriado',''))
  is not distinct from (old.profissional_id,old.data,old.hora_inicio,old.hora_fim,old.horario_extraordinario,old.excecao_agenda->'conflitos',old.excecao_agenda->'bloqueios',coalesce(old.excecao_agenda->>'feriado','')) then return new; end if;
 select nome into nome_paciente from public.pacientes where id=new.paciente_id and clinica_id=new.clinica_id;
 select email into email_profissional from public.equipe where id=new.profissional_id and clinica_id=new.clinica_id;
 if jsonb_array_length(coalesce(new.excecao_agenda->'conflitos','[]'::jsonb))>0 then motivos:=array_append(motivos,'sobreposição confirmada'); end if;
 if jsonb_array_length(coalesce(new.excecao_agenda->'bloqueios','[]'::jsonb))>0 then motivos:=array_append(motivos,'encaixe em ausência/bloqueio'); end if;
 if coalesce(new.excecao_agenda->>'feriado','')<>'' then motivos:=array_append(motivos,'feriado: '||(new.excecao_agenda->>'feriado')); end if;
 if cardinality(motivos)=0 then motivos:=array['fora da jornada padrão']; end if;
 insert into public.notificacoes_internas(clinica_id,destinatario_profissional_id,destinatario_email,tipo,titulo,mensagem,agendamento_id,agendamento_data,origem_chave,criada_por,lida)
 values(new.clinica_id,new.profissional_id,email_profissional,'horario_extraordinario','Agendamento excepcional confirmado',
  coalesce(nome_paciente,'Paciente')||' em '||to_char(new.data,'DD/MM/YYYY')||', '||to_char(new.hora_inicio,'HH24:MI')||'–'||to_char(new.hora_fim,'HH24:MI')||'. '||array_to_string(motivos,'; ')||'. Confirmado por '||coalesce(new.horario_extraordinario_confirmado_por,'equipe da clínica')||'.',
  new.id::text,new.data,'horario_extraordinario:'||new.id::text,new.horario_extraordinario_confirmado_por,false)
 on conflict(origem_chave) do update set destinatario_profissional_id=excluded.destinatario_profissional_id,destinatario_email=excluded.destinatario_email,
 titulo=excluded.titulo,mensagem=excluded.mensagem,agendamento_data=excluded.agendamento_data,criada_por=excluded.criada_por,criada_em=now(),lida=false,lida_em=null;
 return new;
end $$;
revoke all on function public.kinesys_notificar_excecao_agenda() from public,anon,authenticated;
drop trigger if exists zz_kinesys_notificar_excecao on public.agendamentos;
create trigger zz_kinesys_notificar_excecao after insert or update on public.agendamentos for each row execute function public.kinesys_notificar_excecao_agenda();

-- O destinatário precisa conseguir ler o aviso gravado pelo servidor. Não
-- conceder escrita do conteúdo, criação, exclusão ou acesso a outros avisos.
drop policy if exists ks_notificacao_propria_select on public.notificacoes_internas;
create policy ks_notificacao_propria_select on public.notificacoes_internas for select to authenticated
 using(clinica_id=(public.kinesys_perfil_sessao()->>'clinica_id')::uuid
 and destinatario_profissional_id=public.kinesys_perfil_sessao()->>'id'
 and public.kinesys_perfil_sessao()->>'tipo'='FISIOTERAPEUTA');
drop policy if exists ks_notificacao_propria_update on public.notificacoes_internas;
create policy ks_notificacao_propria_update on public.notificacoes_internas for update to authenticated
 using(clinica_id=(public.kinesys_perfil_sessao()->>'clinica_id')::uuid
 and destinatario_profissional_id=public.kinesys_perfil_sessao()->>'id'
 and public.kinesys_perfil_sessao()->>'tipo'='FISIOTERAPEUTA')
 with check(clinica_id=(public.kinesys_perfil_sessao()->>'clinica_id')::uuid
 and destinatario_profissional_id=public.kinesys_perfil_sessao()->>'id'
 and public.kinesys_perfil_sessao()->>'tipo'='FISIOTERAPEUTA');
create or replace function public.kinesys_proteger_conteudo_notificacao() returns trigger
 language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if public.kinesys_perfil_sessao()->>'tipo'='FISIOTERAPEUTA' then
  if (to_jsonb(new)-'lida'-'lida_em') is distinct from (to_jsonb(old)-'lida'-'lida_em') then
   raise exception 'Somente a leitura do próprio aviso pode ser alterada' using errcode='42501';
  end if;
  new.lida_em:=case when new.lida then now() else null end;
 end if;
 return new;
end $$;
revoke all on function public.kinesys_proteger_conteudo_notificacao() from public,anon,authenticated;
drop trigger if exists z_kinesys_proteger_notificacao on public.notificacoes_internas;
create trigger z_kinesys_proteger_notificacao before update on public.notificacoes_internas for each row execute function public.kinesys_proteger_conteudo_notificacao();

create or replace function public.kinesys_registrar_bloqueio_periodo(p_profissional_id text,p_data_inicio date,p_data_fim date,p_inicio time default null,p_fim time default null,p_motivo text default '',p_operacao_id uuid default null)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare perfil jsonb:=public.kinesys_perfil_sessao(); cid uuid:=(perfil->>'clinica_id')::uuid; dia date; ids uuid[]:=array[]::uuid[]; novo uuid; operacao uuid:=coalesce(p_operacao_id,gen_random_uuid());
begin
 if cid is null or coalesce(perfil->>'tipo','') not in ('MASTER','MASTER_FEM') then raise exception 'Somente administradores podem cadastrar ausências' using errcode='42501'; end if;
 if p_data_inicio is null or p_data_fim is null or p_data_fim<p_data_inicio or p_data_fim-p_data_inicio>365 then raise exception 'Informe um período válido de até 366 dias'; end if;
 if (p_inicio is null)<>(p_fim is null) or (p_inicio is not null and p_inicio>=p_fim) then raise exception 'Informe início e fim válidos, ou deixe ambos vazios para o dia todo'; end if;
 if p_profissional_id is not null and not exists(select 1 from public.equipe where id=p_profissional_id and clinica_id=cid and coalesce(ativo,true)) then raise exception 'Profissional não encontrado nesta clínica' using errcode='42501'; end if;
 for dia in select p_data_inicio+i from generate_series(0,p_data_fim-p_data_inicio) i loop
  perform pg_advisory_xact_lock(hashtextextended(cid::text||':'||dia::text,0));
  novo:=md5(operacao::text||':'||dia::text)::uuid;
  insert into public.bloqueios_agenda(id,clinica_id,profissional_id,data,hora_inicio,hora_fim,motivo)
  values(novo,cid,p_profissional_id,dia,p_inicio,p_fim,nullif(btrim(p_motivo),'')) on conflict(id) do nothing;
  if not exists(select 1 from public.bloqueios_agenda b where b.id=novo and b.clinica_id=cid and b.profissional_id is not distinct from p_profissional_id and b.data=dia and b.hora_inicio is not distinct from p_inicio and b.hora_fim is not distinct from p_fim and b.motivo is not distinct from nullif(btrim(p_motivo),'')) then raise exception 'A operação já foi usada para outro período. Reabra o formulário.'; end if;
  ids:=array_append(ids,novo);
 end loop;
 return jsonb_build_object('ok',true,'ids',ids,'dias',cardinality(ids));
end $$;
revoke all on function public.kinesys_registrar_bloqueio_periodo(text,date,date,time,time,text,uuid) from public,anon;
grant execute on function public.kinesys_registrar_bloqueio_periodo(text,date,date,time,time,text,uuid) to authenticated;

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
 coalesce((select sum(g.valor) from public.pagamentos g where g.clinica_id=a.clinica_id and case when pl.sessoes_contratadas>1 then g.plano_id=pl.id else g.cobranca_agendamento_id=c.id or (g.cobranca_agendamento_id is null and g.agendamento_id=a.id) end),0) + coalesce((select sum(u.valor) from public.creditos_paciente_usos u where u.clinica_id=a.clinica_id and u.plano_id=pl.id and u.paciente_id=a.paciente_id),0) pago
 from public.agendamentos a join perfil x on a.clinica_id=(x.p->>'clinica_id')::uuid
 left join public.planos_atendimento pl on pl.id=a.plano_id and pl.clinica_id=a.clinica_id
 left join public.cobrancas_agendamento c on c.agendamento_id=a.id and c.clinica_id=a.clinica_id
 left join public.procedimentos pr on pr.id=a.procedimento_id and pr.clinica_id=a.clinica_id
 where a.id=any(p_ids) and x.p->>'tipo' in ('MASTER','MASTER_FEM','ADMINISTRADOR','ADMINISTRADORA','SECRETARIA')
 ) select id,cobranca_id,original,desconto,devido,pago,greatest(devido-pago,0),case when devido<=pago then 'pago' when pago<=0 then 'pendente' else 'parcial' end,origem from base;
$$;

