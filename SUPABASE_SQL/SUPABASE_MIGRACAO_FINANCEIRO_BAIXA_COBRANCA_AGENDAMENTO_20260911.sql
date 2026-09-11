-- KineSys — baixa auditável de cobrança individual por agendamento
-- Aplicada em produção como: financeiro_baixa_cobranca_agendamento_20260911

alter table public.cobrancas_agendamento
  add column if not exists baixa_tipo text,
  add column if not exists baixa_motivo text,
  add column if not exists baixada_em timestamptz,
  add column if not exists baixada_por text;

alter table public.cobrancas_agendamento
  drop constraint if exists cobrancas_agendamento_baixa_tipo_check;

alter table public.cobrancas_agendamento
  add constraint cobrancas_agendamento_baixa_tipo_check
  check (baixa_tipo is null or baixa_tipo in ('cortesia','migracao_pacote','lancamento_incorreto','outro'));

create or replace function public.kinesys_preparar_cobranca_agendamento(p_agendamento_id uuid)
returns jsonb
language plpgsql
security definer
set search_path to 'public','pg_temp'
as $function$
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
  if found and c.baixada_em is not null then return to_jsonb(c); end if;

  select * into p from public.procedimentos where id=a.procedimento_id and clinica_id=cid;
  if not found then raise exception 'Serviço do agendamento não encontrado'; end if;
  v_plano_id:=a.plano_id;
  if v_plano_id is not null then
    select * into pl from public.planos_atendimento where id=v_plano_id and clinica_id=cid;
    if found then
      v_origem:=case when coalesce(pl.sessoes_contratadas,1)=1 then 'unitario' else 'plano' end;
      v_original:=round(coalesce(pl.valor_tabela,0)/greatest(coalesce(pl.sessoes_contratadas,1),1),2);
      v_desconto:=round(coalesce(pl.desconto_valor,0)/greatest(coalesce(pl.sessoes_contratadas,1),1),2);
    end if;
  end if;
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
end $function$;

create or replace function public.kinesys_registrar_pagamento_agendamento(p_agendamento_id uuid, p_valor numeric, p_desconto numeric, p_desconto_tipo text, p_forma text, p_parcelas integer, p_data date, p_observacoes text, p_composicao jsonb, p_operacao_id text)
returns jsonb
language plpgsql
security definer
set search_path to 'public','pg_temp'
as $function$
declare
  perfil jsonb:=public.kinesys_perfil_sessao(); cid uuid:=(perfil->>'clinica_id')::uuid; papel text:=perfil->>'tipo';
  c public.cobrancas_agendamento%rowtype; pago numeric(12,2); pendente numeric(12,2); novo_id uuid:=gen_random_uuid(); existente uuid;
begin
  if cid is null or papel not in ('MASTER','MASTER_FEM') then raise exception 'Somente administradores podem registrar pagamentos' using errcode='42501'; end if;
  if p_valor<=0 then raise exception 'Informe um valor recebido maior que zero'; end if;
  if p_forma not in ('PIX','Cartão de débito','Cartão de crédito','Dinheiro','Link de pagamento') then raise exception 'Forma de pagamento inválida'; end if;
  if p_forma<>'Cartão de crédito' then p_parcelas:=1; end if;
  if coalesce(p_parcelas,0)<1 or p_parcelas>60 then raise exception 'Quantidade de parcelas inválida'; end if;
  select id into existente from public.pagamentos where clinica_id=cid and operacao_id=p_operacao_id limit 1;
  if existente is not null then return jsonb_build_object('ok',true,'pagamento_id',existente,'repetido',true); end if;
  perform public.kinesys_preparar_cobranca_agendamento(p_agendamento_id);
  select * into c from public.cobrancas_agendamento where clinica_id=cid and agendamento_id=p_agendamento_id for update;
  if c.baixada_em is not null then raise exception 'Esta cobrança foi removida da pendência e não aceita novos pagamentos'; end if;
  select coalesce(sum(valor),0) into pago from public.pagamentos where clinica_id=cid and agendamento_id=p_agendamento_id;
  if pago=0 then
    if p_desconto<0 or p_desconto>c.valor_original then raise exception 'Desconto inválido'; end if;
    update public.cobrancas_agendamento set desconto_valor=round(p_desconto,2),desconto_tipo=case when p_desconto=0 then 'nenhum' else coalesce(nullif(p_desconto_tipo,''),'cortesia') end,atualizado_em=now() where id=c.id returning * into c;
    update public.planos_atendimento set desconto_valor=c.desconto_valor,desconto_cortesia=case when c.desconto_tipo='cortesia' then c.desconto_valor else 0 end,
      desconto_pacote=case when c.desconto_tipo='pacote' then c.desconto_valor else 0 end,valor_final=c.valor_devido where id=c.plano_id and coalesce(sessoes_contratadas,1)=1;
  elsif round(p_desconto,2)<>c.desconto_valor then raise exception 'O desconto não pode ser alterado depois do primeiro pagamento'; end if;
  pendente:=greatest(c.valor_devido-pago,0);
  if p_valor>pendente then raise exception 'O valor recebido ultrapassa o pendente de %',to_char(pendente,'FM999999990D00'); end if;
  insert into public.pagamentos(id,plano_id,paciente_id,valor,forma_pagamento,data_pagamento,observacoes,criado_por,criado_em,operacao_id,clinica_id,
    tipo,composicao_formas,agendamento_id,cobranca_agendamento_id,parcelas)
  values(novo_id,c.plano_id,c.paciente_id,round(p_valor,2),p_forma,coalesce(p_data,current_date),nullif(btrim(coalesce(p_observacoes,'')),''),
    coalesce(perfil->>'nome','Administrador'),now(),p_operacao_id,cid,'recebimento',coalesce(p_composicao,'[]'::jsonb),p_agendamento_id,c.id,p_parcelas);
  return jsonb_build_object('ok',true,'pagamento_id',novo_id,'valor_devido',c.valor_devido,'total_pago',pago+p_valor,'valor_pendente',greatest(c.valor_devido-pago-p_valor,0));
end $function$;

create or replace function public.kinesys_baixar_cobranca_agendamento(p_agendamento_id uuid, p_tipo text, p_motivo text)
returns jsonb
language plpgsql
security definer
set search_path to 'public','pg_temp'
as $function$
declare
  perfil jsonb:=public.kinesys_perfil_sessao(); cid uuid:=(perfil->>'clinica_id')::uuid; papel text:=perfil->>'tipo';
  c public.cobrancas_agendamento%rowtype; pl public.planos_atendimento%rowtype;
  qtd_pagamentos integer:=0; tipo text:=lower(btrim(coalesce(p_tipo,''))); motivo text:=nullif(btrim(coalesce(p_motivo,'')),'');
  desconto_tipo_novo text;
begin
  if cid is null or papel not in ('MASTER','MASTER_FEM') then raise exception 'Somente administradores podem remover pendências financeiras' using errcode='42501'; end if;
  if tipo not in ('cortesia','migracao_pacote','lancamento_incorreto','outro') then raise exception 'Tipo de baixa inválido'; end if;
  if motivo is null or length(motivo)<3 then raise exception 'Informe o motivo da baixa'; end if;
  perform public.kinesys_preparar_cobranca_agendamento(p_agendamento_id);
  select * into c from public.cobrancas_agendamento where clinica_id=cid and agendamento_id=p_agendamento_id for update;
  if not found then raise exception 'Cobrança não encontrada nesta clínica'; end if;
  if c.baixada_em is not null then return jsonb_build_object('ok',true,'repetido',true,'agendamento_id',p_agendamento_id,'baixada_em',c.baixada_em); end if;
  select count(*) into qtd_pagamentos from public.pagamentos where clinica_id=cid and agendamento_id=p_agendamento_id;
  if qtd_pagamentos>0 then raise exception 'Há pagamento lançado neste atendimento. Estorne o recebimento antes de remover a pendência'; end if;
  desconto_tipo_novo:=case when tipo='migracao_pacote' then 'pacote' else 'cortesia' end;
  update public.cobrancas_agendamento
     set desconto_valor=valor_original,desconto_tipo=desconto_tipo_novo,baixa_tipo=tipo,baixa_motivo=motivo,
         baixada_em=now(),baixada_por=coalesce(perfil->>'nome','Administrador'),atualizado_em=now()
   where id=c.id returning * into c;
  if c.plano_id is not null then
    select * into pl from public.planos_atendimento where id=c.plano_id and clinica_id=cid for update;
    if found and coalesce(pl.sessoes_contratadas,1)=1 and pl.operacao_id='unitario-agenda-'||p_agendamento_id::text then
      update public.planos_atendimento
         set desconto_valor=valor_tabela,
             desconto_pacote=case when tipo='migracao_pacote' then valor_tabela else 0 end,
             desconto_cortesia=case when tipo='cortesia' then valor_tabela else 0 end,
             valor_final=0,status='concluido',encerrado_em=coalesce(encerrado_em,now()),
             observacoes=concat_ws(E'\n',nullif(observacoes,''),'Baixa financeira ['||tipo||']: '||motivo)
       where id=pl.id;
    end if;
  end if;
  return jsonb_build_object('ok',true,'agendamento_id',p_agendamento_id,'cobranca_id',c.id,'baixa_tipo',tipo,'baixa_motivo',motivo,'valor_pendente',0);
end $function$;

revoke all on function public.kinesys_baixar_cobranca_agendamento(uuid,text,text) from public;
revoke all on function public.kinesys_baixar_cobranca_agendamento(uuid,text,text) from anon;
grant execute on function public.kinesys_baixar_cobranca_agendamento(uuid,text,text) to authenticated;
