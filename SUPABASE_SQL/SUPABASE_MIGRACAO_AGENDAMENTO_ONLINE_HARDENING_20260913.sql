-- KineSys — Agendamento online V1 — hardening administrativo
-- Fecha a escrita da publicação semanal para administração e registra no
-- repositório a negação explícita já aplicada ao rate limit público.

-- A leitura dos períodos continua seguindo o escopo da Agenda, mas a decisão
-- de publicar/remover horários no portal é administrativa nesta V1.
drop policy if exists ks_agendamento_online_disponibilidade_insert
    on public.disponibilidade_agendamento_online;
create policy ks_agendamento_online_disponibilidade_insert
on public.disponibilidade_agendamento_online
for insert
to authenticated
with check (
    clinica_id = public.kinesys_current_clinica_id()
    and public.kinesys_pode_operar('agendamentos', 'INSERT')
    and public.kinesys_agenda_escopo_permitido(profissional_id)
    and coalesce(public.kinesys_perfil_sessao()->>'tipo', '') in ('MASTER', 'MASTER_FEM')
);

drop policy if exists ks_agendamento_online_disponibilidade_update
    on public.disponibilidade_agendamento_online;
create policy ks_agendamento_online_disponibilidade_update
on public.disponibilidade_agendamento_online
for update
to authenticated
using (
    clinica_id = public.kinesys_current_clinica_id()
    and public.kinesys_pode_operar('agendamentos', 'UPDATE')
    and public.kinesys_agenda_escopo_permitido(profissional_id)
    and coalesce(public.kinesys_perfil_sessao()->>'tipo', '') in ('MASTER', 'MASTER_FEM')
)
with check (
    clinica_id = public.kinesys_current_clinica_id()
    and public.kinesys_pode_operar('agendamentos', 'UPDATE')
    and public.kinesys_agenda_escopo_permitido(profissional_id)
    and coalesce(public.kinesys_perfil_sessao()->>'tipo', '') in ('MASTER', 'MASTER_FEM')
);

drop policy if exists ks_agendamento_online_disponibilidade_delete
    on public.disponibilidade_agendamento_online;
create policy ks_agendamento_online_disponibilidade_delete
on public.disponibilidade_agendamento_online
for delete
to authenticated
using (
    clinica_id = public.kinesys_current_clinica_id()
    and public.kinesys_pode_operar('agendamentos', 'DELETE')
    and public.kinesys_agenda_escopo_permitido(profissional_id)
    and coalesce(public.kinesys_perfil_sessao()->>'tipo', '') in ('MASTER', 'MASTER_FEM')
);

-- Defesa em profundidade: clientes nunca consultam nem alteram o rate limit.
drop policy if exists ks_agendamento_online_rate_limit_deny_client
    on public.agendamento_online_rate_limit;
create policy ks_agendamento_online_rate_limit_deny_client
on public.agendamento_online_rate_limit
for all
to anon, authenticated
using (false)
with check (false);
