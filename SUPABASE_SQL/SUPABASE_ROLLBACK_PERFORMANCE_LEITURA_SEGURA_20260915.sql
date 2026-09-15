-- KineSys — rollback da otimização conservadora de leitura / 2026-09-15
-- Restaura exatamente as expressões RLS anteriores e remove somente os índices
-- criados pela migration de performance de 2026-09-15.

alter policy ks_access_select on public.agendamentos
  using (
    clinica_id = public.kinesys_current_clinica_id()
    and public.kinesys_pode_operar('agendamentos','SELECT')
  );

alter policy ks_access_select on public.pacientes
  using (
    clinica_id = public.kinesys_current_clinica_id()
    and public.kinesys_pode_operar('pacientes','SELECT')
  );

alter policy ks_access_select on public.pagamentos
  using (
    clinica_id = public.kinesys_current_clinica_id()
    and public.kinesys_pode_operar('pagamentos','SELECT')
  );

alter policy ks_access_select on public.planos_atendimento
  using (
    clinica_id = public.kinesys_current_clinica_id()
    and public.kinesys_pode_operar('planos_atendimento','SELECT')
  );

alter policy ks_cobrancas_agendamento_select on public.cobrancas_agendamento
  using (
    clinica_id = public.kinesys_current_clinica_id()
    and ((public.kinesys_perfil_sessao()->>'tipo') = any (array['MASTER'::text,'MASTER_FEM'::text]))
  );

drop index if exists public.agendamentos_clinica_profissional_data_hora_idx;
drop index if exists public.horarios_atendimento_clinica_profissional_dia_idx;
drop index if exists public.bloqueios_agenda_clinica_profissional_data_idx;
drop index if exists public.pagamentos_clinica_cobranca_idx;
drop index if exists public.notificacoes_internas_profissional_data_idx;
drop index if exists public.notificacoes_internas_email_data_idx;
