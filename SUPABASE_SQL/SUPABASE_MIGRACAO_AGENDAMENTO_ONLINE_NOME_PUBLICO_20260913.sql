-- KineSys — Agendamento online V2 — nome público da clínica
alter table public.configuracoes_agendamento_online
    add column if not exists nome_publico text not null default '';

comment on column public.configuracoes_agendamento_online.nome_publico is
    'Nome comercial exibido no portal público de agendamento, sem alterar o nome interno legado da clínica.';
