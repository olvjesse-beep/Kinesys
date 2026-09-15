-- KineSys — baixa de cobrança unitária desacoplada do estado atual do agendamento
-- Permite encerrar pendências históricas mesmo quando o agendamento foi alterado,
-- cancelado ou excluído, preservando a cobrança e a trilha de auditoria.

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
     and (cobranca_agendamento_id=c.id or (cobranca_agendamento_id is null and agendamento_id=p_agendamento_id));
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
             status='concluido',
             encerrado_em=coalesce(encerrado_em,now()),
             observacoes=concat_ws(E'\n',nullif(observacoes,''),'Baixa financeira ['||tipo||']: '||motivo)
       where id=pl.id;
    end if;
  end if;

  return jsonb_build_object('ok',true,'agendamento_id',p_agendamento_id,'cobranca_id',c.id,'baixa_tipo',tipo,'baixa_motivo',motivo,'valor_pendente',0);
end $function$;

revoke all on function public.kinesys_baixar_cobranca_agendamento(uuid,text,text) from public;
revoke all on function public.kinesys_baixar_cobranca_agendamento(uuid,text,text) from anon;
grant execute on function public.kinesys_baixar_cobranca_agendamento(uuid,text,text) to authenticated;
