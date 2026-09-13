-- KineSys — Agendamento online V2 — índice do vínculo de profissional
create index if not exists idx_agendamento_online_prof_config_profissional
    on public.agendamento_online_profissionais_config (profissional_id);
