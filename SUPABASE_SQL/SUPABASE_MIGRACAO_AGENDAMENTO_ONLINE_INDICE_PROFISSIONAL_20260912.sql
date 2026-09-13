-- KineSys — Agendamento online V1 — índice de cobertura da FK profissional
-- Mantém o delete cascade e consultas por profissional eficientes.

create index if not exists idx_disponibilidade_agendamento_online_profissional
    on public.disponibilidade_agendamento_online (profissional_id);
