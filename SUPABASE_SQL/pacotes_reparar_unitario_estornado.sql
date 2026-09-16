-- Executar somente após conferir o backup e a contagem esperada (1 no diagnóstico).
-- Não altera o contrato de pacote, nem apaga recebimentos/estornos.
do $$
declare r record; antes jsonb; depois jsonb; encontrados integer:=0;
begin
 for r in
  select c.id,c.plano_id,c.clinica_id,c.valor_original from public.cobrancas_agendamento c
  join public.agendamentos a on a.id=c.agendamento_id and a.clinica_id=c.clinica_id
  join public.planos_atendimento p on p.id=c.plano_id and p.clinica_id=c.clinica_id
  join public.procedimentos proc on proc.id=c.procedimento_id and proc.clinica_id=c.clinica_id
  where c.origem='unitario' and c.baixada_em is null and a.status='cancelado'
   and proc.sessoes_pacote>1 and p.sessoes_contratadas=1
   and p.operacao_id='unitario-agenda-'||a.id::text
   and exists(select 1 from public.pagamentos g where g.cobranca_agendamento_id=c.id and g.tipo='estorno')
   and not exists(select 1 from public.pagamentos g where (g.cobranca_agendamento_id=c.id or (g.cobranca_agendamento_id is null and g.agendamento_id=a.id)) and g.tipo<>'estorno' and not exists(select 1 from public.pagamentos e where e.estorno_de=g.id and e.tipo='estorno' and e.valor=-g.valor and e.clinica_id=c.clinica_id))
   and (select coalesce(sum(g.valor),0) from public.pagamentos g where g.cobranca_agendamento_id=c.id or (g.cobranca_agendamento_id is null and g.agendamento_id=a.id))=0
  for update of c,p
 loop
  encontrados:=encontrados+1;
  select to_jsonb(p) into antes from public.planos_atendimento p where id=r.plano_id;
  update public.cobrancas_agendamento set desconto_valor=valor_original,desconto_tipo='cortesia',baixa_tipo='lancamento_incorreto',baixa_motivo='Correção auditada: cobrança unitária automática de procedimento de pacote, agendamento cancelado e recebimento integralmente estornado',baixada_em=now(),baixada_por='Manutenção autorizada KineSys',atualizado_em=now() where id=r.id;
  update public.planos_atendimento set desconto_valor=valor_tabela,desconto_pacote=0,desconto_cortesia=valor_tabela,valor_final=0,status='cancelado',encerramento_automatico=false,encerrado_em=coalesce(encerrado_em,now()) where id=r.plano_id returning to_jsonb(planos_atendimento.*) into depois;
  insert into public.auditoria_contratos(clinica_id,plano_id,acao,antes,depois,motivo,autor) values(r.clinica_id,r.plano_id,'reparar_cobranca',antes,depois,'Unitário automático de pacote cancelado com estorno integral; cobrança histórica preservada','Manutenção autorizada KineSys');
 end loop;
 if encontrados<>1 then raise exception 'Diagnóstico mudou: esperava 1 registro, encontrado %. Transação revertida.',encontrados; end if;
end $$;
