-- KineSys — Agendamento online V1 — estrutura de dados
-- Camada aditiva e fechada por padrão. Esta migration não publica horários
-- existentes e não concede acesso anônimo às tabelas internas.

-- 1) Procedimentos: somente itens explicitamente liberados poderão aparecer
-- no portal público.
alter table public.procedimentos
    add column if not exists agendamento_online_ativo boolean not null default false;

comment on column public.procedimentos.agendamento_online_ativo is
    'TRUE somente quando o procedimento pode ser oferecido no agendamento online.';

-- 2) Agenda única: o registro continua em public.agendamentos; origem apenas
-- identifica como o horário foi criado.
alter table public.agendamentos
    add column if not exists origem text not null default 'interno';

do $migration$
begin
    if not exists (
        select 1
          from pg_constraint
         where conrelid = 'public.agendamentos'::regclass
           and conname = 'agendamentos_origem_valida'
    ) then
        alter table public.agendamentos
            add constraint agendamentos_origem_valida
            check (origem in ('interno', 'online'));
    end if;
end
$migration$;

comment on column public.agendamentos.origem is
    'Origem operacional do agendamento: interno ou online.';

-- 3) Paciente: novos registros vindos do portal podem entrar como pré-cadastro
-- sem rebaixar os pacientes já existentes.
alter table public.pacientes
    add column if not exists origem_cadastro text not null default 'interno',
    add column if not exists cadastro_validado boolean not null default true;

do $migration$
begin
    if not exists (
        select 1
          from pg_constraint
         where conrelid = 'public.pacientes'::regclass
           and conname = 'pacientes_origem_cadastro_valida'
    ) then
        alter table public.pacientes
            add constraint pacientes_origem_cadastro_valida
            check (origem_cadastro in ('interno', 'agendamento_online'));
    end if;
end
$migration$;

comment on column public.pacientes.origem_cadastro is
    'Origem do cadastro do paciente. agendamento_online identifica pré-cadastro criado pelo portal.';
comment on column public.pacientes.cadastro_validado is
    'FALSE quando o cadastro ainda precisa de conferência administrativa pela equipe.';

-- 4) Configuração da clínica. Sem linha ativa, o portal deve responder como
-- indisponível. A ausência da linha equivale a ativo=false.
create table if not exists public.configuracoes_agendamento_online (
    clinica_id uuid primary key
        references public.clinicas(id) on delete cascade,
    ativo boolean not null default false,
    antecedencia_minima_minutos integer not null default 120
        check (antecedencia_minima_minutos >= 0 and antecedencia_minima_minutos <= 10080),
    horizonte_dias integer not null default 30
        check (horizonte_dias >= 1 and horizonte_dias <= 180),
    criado_em timestamptz not null default now(),
    atualizado_em timestamptz not null default now()
);

comment on table public.configuracoes_agendamento_online is
    'Configuração por clínica do portal público de agendamento. Fechado por padrão.';

-- 5) Publicação online. Estes períodos NÃO substituem horarios_atendimento.
-- A disponibilidade final será a interseção entre a Agenda interna efetiva e
-- os períodos ativos abaixo, descontando bloqueios, feriados e agendamentos.
create table if not exists public.disponibilidade_agendamento_online (
    id uuid primary key default gen_random_uuid(),
    clinica_id uuid not null default public.kinesys_current_clinica_id()
        references public.clinicas(id) on delete cascade,
    profissional_id text not null
        references public.equipe(id) on delete cascade,
    dia_semana smallint not null
        check (dia_semana between 0 and 6),
    hora_inicio time not null,
    hora_fim time not null,
    ativo boolean not null default true,
    criado_em timestamptz not null default now(),
    atualizado_em timestamptz not null default now(),
    constraint disponibilidade_agendamento_online_intervalo_valido
        check (hora_fim > hora_inicio),
    constraint disponibilidade_agendamento_online_periodo_unico
        unique (clinica_id, profissional_id, dia_semana, hora_inicio, hora_fim)
);

comment on table public.disponibilidade_agendamento_online is
    'Subconjunto da disponibilidade interna que o profissional/gestão publicou para o portal online.';

create index if not exists idx_disponibilidade_agendamento_online_lookup
    on public.disponibilidade_agendamento_online (clinica_id, profissional_id, dia_semana)
    where ativo = true;

create index if not exists idx_procedimentos_agendamento_online
    on public.procedimentos (clinica_id)
    where ativo = true and agendamento_online_ativo = true;

create index if not exists idx_pacientes_cadastro_online_pendente
    on public.pacientes (clinica_id)
    where origem_cadastro = 'agendamento_online' and cadastro_validado = false;

-- 6) RLS. Nenhuma tabela de configuração/publicação recebe permissão anon.
alter table public.configuracoes_agendamento_online enable row level security;
alter table public.disponibilidade_agendamento_online enable row level security;

revoke all on table public.configuracoes_agendamento_online from anon;
revoke all on table public.disponibilidade_agendamento_online from anon;
revoke all on table public.configuracoes_agendamento_online from public;
revoke all on table public.disponibilidade_agendamento_online from public;

grant select, insert, update, delete on table public.configuracoes_agendamento_online to authenticated;
grant select, insert, update, delete on table public.disponibilidade_agendamento_online to authenticated;
grant all on table public.configuracoes_agendamento_online to service_role;
grant all on table public.disponibilidade_agendamento_online to service_role;

-- Configuração geral: equipe interna pode ler; somente administradores podem
-- ativar/desativar o portal ou alterar antecedência/horizonte.
drop policy if exists ks_agendamento_online_config_select on public.configuracoes_agendamento_online;
create policy ks_agendamento_online_config_select
on public.configuracoes_agendamento_online
for select
to authenticated
using (
    clinica_id = public.kinesys_current_clinica_id()
    and coalesce(public.kinesys_perfil_sessao()->>'tipo', '') in
        ('MASTER', 'MASTER_FEM', 'SECRETARIA', 'FISIOTERAPEUTA')
);

drop policy if exists ks_agendamento_online_config_insert on public.configuracoes_agendamento_online;
create policy ks_agendamento_online_config_insert
on public.configuracoes_agendamento_online
for insert
to authenticated
with check (
    clinica_id = public.kinesys_current_clinica_id()
    and coalesce(public.kinesys_perfil_sessao()->>'tipo', '') in ('MASTER', 'MASTER_FEM')
);

drop policy if exists ks_agendamento_online_config_update on public.configuracoes_agendamento_online;
create policy ks_agendamento_online_config_update
on public.configuracoes_agendamento_online
for update
to authenticated
using (
    clinica_id = public.kinesys_current_clinica_id()
    and coalesce(public.kinesys_perfil_sessao()->>'tipo', '') in ('MASTER', 'MASTER_FEM')
)
with check (
    clinica_id = public.kinesys_current_clinica_id()
    and coalesce(public.kinesys_perfil_sessao()->>'tipo', '') in ('MASTER', 'MASTER_FEM')
);

drop policy if exists ks_agendamento_online_config_delete on public.configuracoes_agendamento_online;
create policy ks_agendamento_online_config_delete
on public.configuracoes_agendamento_online
for delete
to authenticated
using (
    clinica_id = public.kinesys_current_clinica_id()
    and coalesce(public.kinesys_perfil_sessao()->>'tipo', '') in ('MASTER', 'MASTER_FEM')
);

-- Publicação de horários: administradores/secretaria gerenciam qualquer
-- profissional da clínica; fisioterapeuta gerencia somente a própria agenda.
drop policy if exists ks_agendamento_online_disponibilidade_select on public.disponibilidade_agendamento_online;
create policy ks_agendamento_online_disponibilidade_select
on public.disponibilidade_agendamento_online
for select
to authenticated
using (
    clinica_id = public.kinesys_current_clinica_id()
    and (
        coalesce(public.kinesys_perfil_sessao()->>'tipo', '') in ('MASTER', 'MASTER_FEM', 'SECRETARIA')
        or (
            coalesce(public.kinesys_perfil_sessao()->>'tipo', '') = 'FISIOTERAPEUTA'
            and profissional_id = coalesce(public.kinesys_perfil_sessao()->>'id', '')
        )
    )
);

drop policy if exists ks_agendamento_online_disponibilidade_insert on public.disponibilidade_agendamento_online;
create policy ks_agendamento_online_disponibilidade_insert
on public.disponibilidade_agendamento_online
for insert
to authenticated
with check (
    clinica_id = public.kinesys_current_clinica_id()
    and (
        coalesce(public.kinesys_perfil_sessao()->>'tipo', '') in ('MASTER', 'MASTER_FEM', 'SECRETARIA')
        or (
            coalesce(public.kinesys_perfil_sessao()->>'tipo', '') = 'FISIOTERAPEUTA'
            and profissional_id = coalesce(public.kinesys_perfil_sessao()->>'id', '')
        )
    )
);

drop policy if exists ks_agendamento_online_disponibilidade_update on public.disponibilidade_agendamento_online;
create policy ks_agendamento_online_disponibilidade_update
on public.disponibilidade_agendamento_online
for update
to authenticated
using (
    clinica_id = public.kinesys_current_clinica_id()
    and (
        coalesce(public.kinesys_perfil_sessao()->>'tipo', '') in ('MASTER', 'MASTER_FEM', 'SECRETARIA')
        or (
            coalesce(public.kinesys_perfil_sessao()->>'tipo', '') = 'FISIOTERAPEUTA'
            and profissional_id = coalesce(public.kinesys_perfil_sessao()->>'id', '')
        )
    )
)
with check (
    clinica_id = public.kinesys_current_clinica_id()
    and (
        coalesce(public.kinesys_perfil_sessao()->>'tipo', '') in ('MASTER', 'MASTER_FEM', 'SECRETARIA')
        or (
            coalesce(public.kinesys_perfil_sessao()->>'tipo', '') = 'FISIOTERAPEUTA'
            and profissional_id = coalesce(public.kinesys_perfil_sessao()->>'id', '')
        )
    )
);

drop policy if exists ks_agendamento_online_disponibilidade_delete on public.disponibilidade_agendamento_online;
create policy ks_agendamento_online_disponibilidade_delete
on public.disponibilidade_agendamento_online
for delete
to authenticated
using (
    clinica_id = public.kinesys_current_clinica_id()
    and (
        coalesce(public.kinesys_perfil_sessao()->>'tipo', '') in ('MASTER', 'MASTER_FEM', 'SECRETARIA')
        or (
            coalesce(public.kinesys_perfil_sessao()->>'tipo', '') = 'FISIOTERAPEUTA'
            and profissional_id = coalesce(public.kinesys_perfil_sessao()->>'id', '')
        )
    )
);
