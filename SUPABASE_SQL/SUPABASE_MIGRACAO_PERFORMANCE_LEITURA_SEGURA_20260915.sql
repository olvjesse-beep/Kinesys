-- KineSys — otimização conservadora de leitura / 2026-09-15
-- Objetivo: reduzir round-trips e trabalho repetido do RLS sem alterar regras de acesso.
-- Esta migration NÃO remove políticas, NÃO altera papéis, NÃO altera dados clínicos/financeiros.
-- Rollback correspondente: SUPABASE_ROLLBACK_PERFORMANCE_LEITURA_SEGURA_20260915.sql

-- Índices direcionados às consultas mais frequentes observadas em produção.
create index if not exists agendamentos_clinica_profissional_data_hora_idx
  on public.agendamentos (clinica_id, profissional_id, data, hora_inicio);

create index if not exists horarios_atendimento_clinica_profissional_dia_idx
  on public.horarios_atendimento (clinica_id, profissional_id, dia_semana);

create index if not exists bloqueios_agenda_clinica_profissional_data_idx
  on public.bloqueios_agenda (clinica_id, profissional_id, data);

create index if not exists pagamentos_clinica_cobranca_idx
  on public.pagamentos (clinica_id, cobranca_agendamento_id)
  where cobranca_agendamento_id is not null;

create index if not exists notificacoes_internas_profissional_data_idx
  on public.notificacoes_internas (destinatario_profissional_id, criada_em desc)
  where destinatario_profissional_id is not null;

create index if not exists notificacoes_internas_email_data_idx
  on public.notificacoes_internas (destinatario_email, criada_em desc)
  where destinatario_email is not null;

-- As funções abaixo não dependem da linha consultada. Envolvê-las em um SELECT
-- permite ao PostgreSQL tratá-las como initPlan e reaproveitar o resultado na
-- mesma instrução. A expressão booleana e os papéis autorizados permanecem iguais.
alter policy ks_access_select on public.agendamentos
  using (
    clinica_id = (select public.kinesys_current_clinica_id())
    and (select public.kinesys_pode_operar('agendamentos','SELECT'))
  );

alter policy ks_access_select on public.pacientes
  using (
    clinica_id = (select public.kinesys_current_clinica_id())
    and (select public.kinesys_pode_operar('pacientes','SELECT'))
  );

alter policy ks_access_select on public.pagamentos
  using (
    clinica_id = (select public.kinesys_current_clinica_id())
    and (select public.kinesys_pode_operar('pagamentos','SELECT'))
  );

alter policy ks_access_select on public.planos_atendimento
  using (
    clinica_id = (select public.kinesys_current_clinica_id())
    and (select public.kinesys_pode_operar('planos_atendimento','SELECT'))
  );

alter policy ks_cobrancas_agendamento_select on public.cobrancas_agendamento
  using (
    clinica_id = (select public.kinesys_current_clinica_id())
    and (((select public.kinesys_perfil_sessao())->>'tipo') = any (array['MASTER'::text,'MASTER_FEM'::text]))
  );
