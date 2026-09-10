-- KineSys v1.24.0 — vínculo explícito entre Agenda e registros clínicos
-- Aplicado em produção em 2026-09-10.
-- Mantém compatibilidade com registros históricos sem agendamento associado.

alter table public.avaliacoes
  add column if not exists agendamento_id uuid null;

alter table public.evolucoes
  add column if not exists agendamento_id uuid null;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'avaliacoes_agendamento_id_fkey'
  ) THEN
    ALTER TABLE public.avaliacoes
      ADD CONSTRAINT avaliacoes_agendamento_id_fkey
      FOREIGN KEY (agendamento_id)
      REFERENCES public.agendamentos(id)
      ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'evolucoes_agendamento_id_fkey'
  ) THEN
    ALTER TABLE public.evolucoes
      ADD CONSTRAINT evolucoes_agendamento_id_fkey
      FOREIGN KEY (agendamento_id)
      REFERENCES public.agendamentos(id)
      ON DELETE SET NULL;
  END IF;
END $$;

create index if not exists idx_avaliacoes_agendamento_id
  on public.avaliacoes(agendamento_id);

create index if not exists idx_evolucoes_agendamento_id
  on public.evolucoes(agendamento_id);
