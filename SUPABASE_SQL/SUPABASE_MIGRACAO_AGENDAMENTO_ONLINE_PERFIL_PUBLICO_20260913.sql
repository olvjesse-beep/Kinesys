-- KineSys — Agendamento online V2 — perfil público, link por clínica e mensagem pós-agendamento
-- Camada aditiva. Não ativa o portal e não altera agendamentos existentes.

alter table public.configuracoes_agendamento_online
    add column if not exists slug_publico text,
    add column if not exists endereco_publico text not null default '',
    add column if not exists telefone_publico text not null default '',
    add column if not exists mensagem_confirmacao text not null default 'Seu atendimento foi agendado! No dia que precede a sua consulta entraremos em contato para confirmarmos a sua presença. Chegue com alguns minutos de antecedência e, quando possível, use roupas confortáveis que facilitem a avaliação e o atendimento. Caso possua exames, laudos ou encaminhamentos relacionados à sua queixa, leve-os no dia.';

comment on column public.configuracoes_agendamento_online.slug_publico is
    'Identificador amigável e exclusivo usado no link público do agendamento online.';
comment on column public.configuracoes_agendamento_online.endereco_publico is
    'Endereço exibido ao paciente no portal e na confirmação do agendamento.';
comment on column public.configuracoes_agendamento_online.telefone_publico is
    'Telefone público da clínica exibido no portal de agendamento.';
comment on column public.configuracoes_agendamento_online.mensagem_confirmacao is
    'Mensagem editável exibida ao paciente imediatamente após confirmar o agendamento.';

do $migration$
begin
    if not exists (
        select 1
          from pg_constraint
         where conrelid = 'public.configuracoes_agendamento_online'::regclass
           and conname = 'config_agendamento_online_slug_publico_valido'
    ) then
        alter table public.configuracoes_agendamento_online
            add constraint config_agendamento_online_slug_publico_valido
            check (
                slug_publico is null
                or slug_publico = ''
                or slug_publico ~ '^[a-z0-9][a-z0-9-]{1,79}$'
            );
    end if;
end
$migration$;

create unique index if not exists idx_config_agendamento_online_slug_publico
    on public.configuracoes_agendamento_online (lower(slug_publico))
    where slug_publico is not null and btrim(slug_publico) <> '';

create table if not exists public.agendamento_online_profissionais_config (
    clinica_id uuid not null references public.clinicas(id) on delete cascade,
    profissional_id text not null references public.equipe(id) on delete cascade,
    titulo_publico text not null default '',
    apresentacao text not null default '',
    formacao text not null default '',
    foto_url text not null default '',
    atende_convenios boolean not null default false,
    convenios text[] not null default '{}'::text[],
    local_atendimento text not null default '',
    criado_em timestamptz not null default now(),
    atualizado_em timestamptz not null default now(),
    primary key (clinica_id, profissional_id)
);

comment on table public.agendamento_online_profissionais_config is
    'Perfil público opcional do profissional no portal de agendamento online.';
comment on column public.agendamento_online_profissionais_config.titulo_publico is
    'Especialidade ou título curto exibido abaixo do nome do profissional.';
comment on column public.agendamento_online_profissionais_config.apresentacao is
    'Texto público de apresentação do profissional.';
comment on column public.agendamento_online_profissionais_config.formacao is
    'Formação pública em texto livre, uma linha por item quando desejado.';
comment on column public.agendamento_online_profissionais_config.foto_url is
    'URL pública opcional da foto do profissional.';
comment on column public.agendamento_online_profissionais_config.atende_convenios is
    'TRUE quando o profissional deseja publicar convênios atendidos.';
comment on column public.agendamento_online_profissionais_config.convenios is
    'Lista de convênios exibida publicamente quando atende_convenios=TRUE.';
comment on column public.agendamento_online_profissionais_config.local_atendimento is
    'Descrição opcional do local de atendimento específica do profissional.';

create index if not exists idx_agendamento_online_prof_config_clinica
    on public.agendamento_online_profissionais_config (clinica_id, profissional_id);

alter table public.agendamento_online_profissionais_config enable row level security;

revoke all on table public.agendamento_online_profissionais_config from public;
revoke all on table public.agendamento_online_profissionais_config from anon;
grant select, insert, update, delete on table public.agendamento_online_profissionais_config to authenticated;
grant all on table public.agendamento_online_profissionais_config to service_role;

drop policy if exists ks_agendamento_online_prof_config_select on public.agendamento_online_profissionais_config;
create policy ks_agendamento_online_prof_config_select
on public.agendamento_online_profissionais_config
for select to authenticated
using (
    clinica_id = public.kinesys_current_clinica_id()
    and public.kinesys_pode_operar('agendamentos', 'SELECT')
);

drop policy if exists ks_agendamento_online_prof_config_insert on public.agendamento_online_profissionais_config;
create policy ks_agendamento_online_prof_config_insert
on public.agendamento_online_profissionais_config
for insert to authenticated
with check (
    clinica_id = public.kinesys_current_clinica_id()
    and public.kinesys_pode_operar('agendamentos', 'INSERT')
    and coalesce(public.kinesys_perfil_sessao()->>'tipo', '') in ('MASTER', 'MASTER_FEM')
);

drop policy if exists ks_agendamento_online_prof_config_update on public.agendamento_online_profissionais_config;
create policy ks_agendamento_online_prof_config_update
on public.agendamento_online_profissionais_config
for update to authenticated
using (
    clinica_id = public.kinesys_current_clinica_id()
    and public.kinesys_pode_operar('agendamentos', 'UPDATE')
    and coalesce(public.kinesys_perfil_sessao()->>'tipo', '') in ('MASTER', 'MASTER_FEM')
)
with check (
    clinica_id = public.kinesys_current_clinica_id()
    and public.kinesys_pode_operar('agendamentos', 'UPDATE')
    and coalesce(public.kinesys_perfil_sessao()->>'tipo', '') in ('MASTER', 'MASTER_FEM')
);

drop policy if exists ks_agendamento_online_prof_config_delete on public.agendamento_online_profissionais_config;
create policy ks_agendamento_online_prof_config_delete
on public.agendamento_online_profissionais_config
for delete to authenticated
using (
    clinica_id = public.kinesys_current_clinica_id()
    and public.kinesys_pode_operar('agendamentos', 'DELETE')
    and coalesce(public.kinesys_perfil_sessao()->>'tipo', '') in ('MASTER', 'MASTER_FEM')
);
