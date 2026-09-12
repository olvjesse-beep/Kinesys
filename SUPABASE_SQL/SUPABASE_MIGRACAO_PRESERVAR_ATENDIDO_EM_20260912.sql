-- KineSys — preserva o instante original de realização enquanto o agendamento
-- permanece em um estado realizado. Evita que atualizações posteriores do
-- mesmo registro sobrescrevam `atendido_em` sem uma nova transição real.

create or replace function public.kinesys_preservar_atendido_em()
returns trigger
language plpgsql
set search_path to 'public', 'pg_temp'
as $function$
begin
    if old.status in ('atendido', 'concluido')
       and new.status in ('atendido', 'concluido')
       and old.atendido_em is not null then
        new.atendido_em := old.atendido_em;
    end if;

    return new;
end;
$function$;

drop trigger if exists trg_kinesys_preservar_atendido_em on public.agendamentos;

create trigger trg_kinesys_preservar_atendido_em
before update of status, atendido_em on public.agendamentos
for each row
execute function public.kinesys_preservar_atendido_em();
