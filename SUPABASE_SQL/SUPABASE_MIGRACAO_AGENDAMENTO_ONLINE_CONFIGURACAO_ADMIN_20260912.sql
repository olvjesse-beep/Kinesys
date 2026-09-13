-- KineSys — Agendamento online V1 — configuração administrativa
-- Camada aditiva. Nada é publicado automaticamente.

alter table public.configuracoes_agendamento_online
    add column if not exists titulo_publico text not null default 'Agende seu atendimento',
    add column if not exists descricao_publica text not null default 'Escolha o atendimento, o profissional e um horário disponível.',
    add column if not exists mensagem_fechado text not null default 'O agendamento online está temporariamente indisponível. Entre em contato com a clínica para agendar.',
    add column if not exists mostrar_valores boolean not null default false;

comment on column public.configuracoes_agendamento_online.titulo_publico is
    'Título exibido no portal público de agendamento.';
comment on column public.configuracoes_agendamento_online.descricao_publica is
    'Texto introdutório exibido no portal público de agendamento.';
comment on column public.configuracoes_agendamento_online.mensagem_fechado is
    'Mensagem exibida quando o portal público está administrativamente fechado.';
comment on column public.configuracoes_agendamento_online.mostrar_valores is
    'TRUE permite exibir o valor cadastrado do procedimento no portal público.';

alter table public.equipe
    add column if not exists agendamento_online_ativo boolean not null default false,
    add column if not exists agendamento_online_ordem integer not null default 0;

do $migration$
begin
    if not exists (
        select 1
          from pg_constraint
         where conrelid = 'public.equipe'::regclass
           and conname = 'equipe_agendamento_online_ordem_valida'
    ) then
        alter table public.equipe
            add constraint equipe_agendamento_online_ordem_valida
            check (agendamento_online_ordem between 0 and 9999);
    end if;
end
$migration$;

comment on column public.equipe.agendamento_online_ativo is
    'TRUE somente quando o profissional pode aparecer no portal público de agendamento.';
comment on column public.equipe.agendamento_online_ordem is
    'Ordem administrativa de exibição do profissional no portal público.';

create index if not exists idx_equipe_agendamento_online_publicacao
    on public.equipe (clinica_id, agendamento_online_ordem, nome)
    where ativo = true
      and aparece_na_agenda = true
      and agendamento_online_ativo = true;

-- Segurança: esta migration não cria grants para anon e não expõe nenhuma tabela.
-- A publicação externa continuará acontecendo apenas pela futura fronteira pública controlada.