-- KineSys — Agendamento online V1
-- Reserva atômica, deduplicação segura de paciente e notificação interna.
-- A função de escrita é exclusiva do service_role e nunca deve ser chamada diretamente pelo navegador.

create or replace function public.kinesys_agendamento_online_cpf_valido(p_cpf text)
returns boolean
language plpgsql
immutable
set search_path = pg_catalog, public, pg_temp
as $$
declare
  v text := regexp_replace(coalesce(p_cpf, ''), '\D', '', 'g');
  soma integer := 0;
  resto integer;
  d1 integer;
  d2 integer;
  i integer;
begin
  if length(v) <> 11 or v ~ '^([0-9])\1{10}$' then
    return false;
  end if;

  for i in 1..9 loop
    soma := soma + substring(v from i for 1)::integer * (11 - i);
  end loop;
  resto := soma % 11;
  d1 := case when resto < 2 then 0 else 11 - resto end;
  if d1 <> substring(v from 10 for 1)::integer then return false; end if;

  soma := 0;
  for i in 1..10 loop
    soma := soma + substring(v from i for 1)::integer * (12 - i);
  end loop;
  resto := soma % 11;
  d2 := case when resto < 2 then 0 else 11 - resto end;
  return d2 = substring(v from 11 for 1)::integer;
end;
$$;

create or replace function public.kinesys_agendamento_online_feriado(p_data date)
returns text
language plpgsql
immutable
set search_path = pg_catalog, public, pg_temp
as $$
declare
  ano integer := extract(year from p_data)::integer;
  a integer; b integer; c integer; d integer; e integer; f integer;
  g integer; h integer; i integer; k integer; l integer; m integer;
  mes integer; dia integer;
  pascoa date;
  md text := to_char(p_data, 'MM-DD');
begin
  case md
    when '01-01' then return 'Confraternização Universal';
    when '04-21' then return 'Tiradentes';
    when '05-01' then return 'Dia do Trabalho';
    when '07-03' then return 'Aniversário de Montes Claros';
    when '09-07' then return 'Independência do Brasil';
    when '10-12' then return 'Nossa Senhora Aparecida';
    when '11-02' then return 'Finados';
    when '11-15' then return 'Proclamação da República';
    when '11-20' then return 'Dia Nacional de Zumbi e da Consciência Negra';
    when '12-25' then return 'Natal';
    else null;
  end case;

  a := ano % 19;
  b := floor(ano / 100.0)::integer;
  c := ano % 100;
  d := floor(b / 4.0)::integer;
  e := b % 4;
  f := floor((b + 8) / 25.0)::integer;
  g := floor((b - f + 1) / 3.0)::integer;
  h := (19 * a + b - d - g + 15) % 30;
  i := floor(c / 4.0)::integer;
  k := c % 4;
  l := (32 + 2 * e + 2 * i - h - k) % 7;
  m := floor((a + 11 * h + 22 * l) / 451.0)::integer;
  mes := floor((h + l - 7 * m + 114) / 31.0)::integer;
  dia := ((h + l - 7 * m + 114) % 31) + 1;
  pascoa := make_date(ano, mes, dia);

  if p_data = pascoa - 2 then return 'Sexta-feira Santa'; end if;
  if p_data = pascoa + 60 then return 'Corpus Christi'; end if;
  return null;
end;
$$;

create or replace function public.kinesys_criar_agendamento_online(
  p_clinica_slug text,
  p_request_id uuid,
  p_profissional_id text,
  p_procedimento_id uuid,
  p_data date,
  p_hora_inicio time without time zone,
  p_nome text,
  p_cpf text,
  p_nascimento date,
  p_telefone text,
  p_dependente boolean default false,
  p_responsavel_nome text default null,
  p_responsavel_parentesco text default null,
  p_responsavel_telefone text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_clinica_id uuid;
  v_clinica_nome text;
  v_ativo boolean;
  v_antecedencia integer;
  v_horizonte integer;
  v_duracao integer;
  v_procedimento_nome text;
  v_profissionais_ids text[];
  v_profissional_nome text;
  v_profissional_email text;
  v_hora_fim time without time zone;
  v_inicio_local timestamp without time zone;
  v_fim_local timestamp without time zone;
  v_inicio_tz timestamptz;
  v_hoje date := (now() at time zone 'America/Sao_Paulo')::date;
  v_dia_semana integer;
  v_tem_grade_profissional boolean;
  v_feriado text;
  v_cpf text := regexp_replace(coalesce(p_cpf, ''), '\D', '', 'g');
  v_telefone text := regexp_replace(coalesce(p_telefone, ''), '\D', '', 'g');
  v_resp_telefone text := regexp_replace(coalesce(p_responsavel_telefone, ''), '\D', '', 'g');
  v_nome text := btrim(regexp_replace(coalesce(p_nome, ''), '\s+', ' ', 'g'));
  v_resp_nome text := btrim(regexp_replace(coalesce(p_responsavel_nome, ''), '\s+', ' ', 'g'));
  v_resp_parentesco text := btrim(regexp_replace(coalesce(p_responsavel_parentesco, ''), '\s+', ' ', 'g'));
  v_paciente_id text;
  v_existente_origem text;
  v_existente_clinica uuid;
begin
  if p_request_id is null then
    raise exception 'Solicitação inválida.' using errcode = '22023';
  end if;

  select c.id, c.nome
    into v_clinica_id, v_clinica_nome
  from public.clinicas c
  where c.slug = lower(btrim(coalesce(p_clinica_slug, '')))
    and c.ativa is true
  limit 1;

  if v_clinica_id is null then
    raise exception 'Agendamento online indisponível.' using errcode = 'P0001';
  end if;

  -- Idempotência: o UUID da solicitação é também o UUID do agendamento.
  select a.origem, a.clinica_id
    into v_existente_origem, v_existente_clinica
  from public.agendamentos a
  where a.id = p_request_id;

  if found then
    if v_existente_origem = 'online' and v_existente_clinica = v_clinica_id then
      return jsonb_build_object('ok', true, 'agendamento_id', p_request_id, 'repetido', true);
    end if;
    raise exception 'Solicitação inválida.' using errcode = '23505';
  end if;

  select cfg.ativo, cfg.antecedencia_minima_minutos, cfg.horizonte_dias
    into v_ativo, v_antecedencia, v_horizonte
  from public.configuracoes_agendamento_online cfg
  where cfg.clinica_id = v_clinica_id;

  if coalesce(v_ativo, false) is not true then
    raise exception 'Agendamento online indisponível.' using errcode = 'P0001';
  end if;

  v_antecedencia := greatest(0, coalesce(v_antecedencia, 120));
  v_horizonte := greatest(1, least(90, coalesce(v_horizonte, 30)));

  if length(v_nome) < 3 or length(v_nome) > 120 then
    raise exception 'Informe o nome completo do paciente.' using errcode = '22023';
  end if;
  if p_nascimento is null or p_nascimento > v_hoje or p_nascimento < date '1900-01-01' then
    raise exception 'Informe uma data de nascimento válida.' using errcode = '22023';
  end if;
  if length(v_telefone) not between 10 and 11 then
    raise exception 'Informe um telefone válido.' using errcode = '22023';
  end if;
  if v_cpf <> '' and not public.kinesys_agendamento_online_cpf_valido(v_cpf) then
    raise exception 'Informe um CPF válido ou deixe o campo vazio.' using errcode = '22023';
  end if;
  if coalesce(p_dependente, false) then
    if length(v_resp_nome) < 3 or length(v_resp_telefone) not between 10 and 11 or length(v_resp_parentesco) < 2 then
      raise exception 'Complete os dados do responsável pelo dependente.' using errcode = '22023';
    end if;
  else
    v_resp_nome := '';
    v_resp_parentesco := '';
    v_resp_telefone := '';
  end if;

  select e.nome, e.email
    into v_profissional_nome, v_profissional_email
  from public.equipe e
  where e.clinica_id = v_clinica_id
    and e.id = p_profissional_id
    and e.ativo is true
    and e.aparece_na_agenda is true
    and e.agendamento_online_ativo is true
  limit 1;

  if v_profissional_nome is null then
    raise exception 'Profissional indisponível para agendamento online.' using errcode = 'P0001';
  end if;

  select pr.nome, pr.duracao_minutos, pr.profissionais_ids
    into v_procedimento_nome, v_duracao, v_profissionais_ids
  from public.procedimentos pr
  where pr.clinica_id = v_clinica_id
    and pr.id = p_procedimento_id
    and pr.ativo is true
    and pr.agendamento_online_ativo is true
  limit 1;

  if v_procedimento_nome is null or coalesce(v_duracao, 0) < 5 then
    raise exception 'Procedimento indisponível para agendamento online.' using errcode = 'P0001';
  end if;
  if cardinality(coalesce(v_profissionais_ids, '{}'::text[])) > 0
     and not (p_profissional_id = any(v_profissionais_ids)) then
    raise exception 'Procedimento indisponível para este profissional.' using errcode = 'P0001';
  end if;

  if p_data is null or p_hora_inicio is null then
    raise exception 'Data e horário são obrigatórios.' using errcode = '22023';
  end if;
  if p_data < v_hoje or p_data > (v_hoje + (v_horizonte - 1)) then
    raise exception 'Data fora do período disponível para agendamento.' using errcode = '22023';
  end if;

  v_inicio_local := p_data::timestamp + p_hora_inicio;
  v_fim_local := v_inicio_local + make_interval(mins => v_duracao);
  if v_fim_local::date <> p_data then
    raise exception 'Horário inválido para a duração do procedimento.' using errcode = '22023';
  end if;
  v_hora_fim := v_fim_local::time;
  v_inicio_tz := v_inicio_local at time zone 'America/Sao_Paulo';
  if v_inicio_tz < now() + make_interval(mins => v_antecedencia) then
    raise exception 'Este horário não respeita a antecedência mínima.' using errcode = 'P0001';
  end if;

  v_feriado := public.kinesys_agendamento_online_feriado(p_data);
  if v_feriado is not null then
    raise exception 'Esta data não possui horários online disponíveis.' using errcode = 'P0001';
  end if;

  v_dia_semana := extract(dow from p_data)::integer;

  -- Nível 1: horário geral da clínica.
  if not exists (
    select 1 from public.horarios_atendimento h
    where h.clinica_id = v_clinica_id
      and h.profissional_id is null
      and h.dia_semana = v_dia_semana
      and p_hora_inicio >= h.hora_inicio
      and v_hora_fim <= h.hora_fim
  ) then
    raise exception 'Horário fora do funcionamento da clínica.' using errcode = 'P0001';
  end if;

  -- Nível 2: se o profissional possui qualquer grade própria, não herda dias ausentes.
  select exists (
    select 1 from public.horarios_atendimento h
    where h.clinica_id = v_clinica_id and h.profissional_id = p_profissional_id
  ) into v_tem_grade_profissional;

  if v_tem_grade_profissional and not exists (
    select 1 from public.horarios_atendimento h
    where h.clinica_id = v_clinica_id
      and h.profissional_id = p_profissional_id
      and h.dia_semana = v_dia_semana
      and p_hora_inicio >= h.hora_inicio
      and v_hora_fim <= h.hora_fim
  ) then
    raise exception 'Horário fora da jornada do profissional.' using errcode = 'P0001';
  end if;

  -- Nível 3: período explicitamente publicado para o portal.
  if not exists (
    select 1 from public.disponibilidade_agendamento_online d
    where d.clinica_id = v_clinica_id
      and d.profissional_id = p_profissional_id
      and d.ativo is true
      and d.dia_semana = v_dia_semana
      and p_hora_inicio >= d.hora_inicio
      and v_hora_fim <= d.hora_fim
  ) then
    raise exception 'Horário não publicado para agendamento online.' using errcode = 'P0001';
  end if;

  -- Bloqueios gerais ou individuais continuam prevalecendo.
  if exists (
    select 1 from public.bloqueios_agenda b
    where b.clinica_id = v_clinica_id
      and b.data = p_data
      and (b.profissional_id is null or b.profissional_id = p_profissional_id)
      and (
        b.hora_inicio is null or b.hora_fim is null
        or (p_hora_inicio < b.hora_fim and v_hora_fim > b.hora_inicio)
      )
  ) then
    raise exception 'Horário bloqueado pela clínica.' using errcode = 'P0001';
  end if;

  -- Checagem amigável antes da constraint de exclusão que resolve a corrida final.
  if exists (
    select 1 from public.agendamentos a
    where a.clinica_id = v_clinica_id
      and a.profissional_id = p_profissional_id
      and a.data = p_data
      and a.status <> 'cancelado'
      and p_hora_inicio < a.hora_fim
      and v_hora_fim > a.hora_inicio
  ) then
    raise exception 'Este horário não está mais disponível.' using errcode = '23P01';
  end if;

  -- Reutiliza prontuário por CPF forte. Sem CPF, só reaproveita pré-cadastro online
  -- não validado com nome+nascimento+telefone exatos; nunca adivinha prontuário validado.
  if v_cpf <> '' then
    select p.id into v_paciente_id
    from public.pacientes p
    where p.clinica_id = v_clinica_id
      and regexp_replace(coalesce(p.cpf, ''), '\D', '', 'g') = v_cpf
    order by p.cadastro_validado desc, (p.origem_cadastro = 'interno') desc, p.id
    limit 1;
  else
    select p.id into v_paciente_id
    from public.pacientes p
    where p.clinica_id = v_clinica_id
      and p.origem_cadastro = 'agendamento_online'
      and p.cadastro_validado is false
      and lower(btrim(regexp_replace(p.nome, '\s+', ' ', 'g'))) = lower(v_nome)
      and coalesce(p.nascimento, '') = p_nascimento::text
      and regexp_replace(coalesce(p.telefone, ''), '\D', '', 'g') = v_telefone
    order by p.id
    limit 1;
  end if;

  if v_paciente_id is null then
    v_paciente_id := 'pac_online_' || replace(gen_random_uuid()::text, '-', '');
    insert into public.pacientes (
      id, nome, cpf, nascimento, telefone,
      data_cadastro, cadastrado_por, timestamp_cadastro,
      dependente, responsavel_nome, responsavel_parentesco, responsavel_telefone,
      clinica_id, origem_cadastro, cadastro_validado
    ) values (
      v_paciente_id, v_nome, nullif(v_cpf, ''), p_nascimento::text, v_telefone,
      to_char(v_hoje, 'DD/MM/YYYY'), 'Agendamento online', floor(extract(epoch from clock_timestamp()) * 1000)::bigint,
      coalesce(p_dependente, false), v_resp_nome, v_resp_parentesco, v_resp_telefone,
      v_clinica_id, 'agendamento_online', false
    );
  end if;

  insert into public.agendamentos (
    id, paciente_id, profissional_id, procedimento_id,
    data, hora_inicio, hora_fim, status,
    observacoes, criado_por, clinica_id, origem
  ) values (
    p_request_id, v_paciente_id, p_profissional_id, p_procedimento_id,
    p_data, p_hora_inicio, v_hora_fim, 'agendado',
    null, 'Portal de agendamento online', v_clinica_id, 'online'
  );

  insert into public.notificacoes_internas (
    destinatario_profissional_id, destinatario_email, tipo, titulo, mensagem,
    agendamento_id, agendamento_data, origem_chave, criada_por, lida, clinica_id
  ) values (
    p_profissional_id, nullif(lower(btrim(coalesce(v_profissional_email, ''))), ''),
    'agendamento_online', 'Novo agendamento online',
    format('Novo agendamento online de %s para %s em %s, %s–%s.', v_nome, v_procedimento_nome, to_char(p_data, 'DD/MM/YYYY'), to_char(p_hora_inicio, 'HH24:MI'), to_char(v_hora_fim, 'HH24:MI')),
    p_request_id::text, p_data, 'agendamento_online:' || p_request_id::text,
    'Portal de agendamento online', false, v_clinica_id
  ) on conflict (origem_chave) do nothing;

  return jsonb_build_object(
    'ok', true,
    'agendamento_id', p_request_id,
    'data', p_data,
    'hora_inicio', to_char(p_hora_inicio, 'HH24:MI'),
    'hora_fim', to_char(v_hora_fim, 'HH24:MI'),
    'repetido', false
  );
exception
  when exclusion_violation then
    raise exception 'Este horário não está mais disponível.' using errcode = '23P01';
  when unique_violation then
    -- Corrida idempotente: se a mesma solicitação acabou de ser confirmada por outra
    -- execução, responde sucesso sem revelar qualquer dado do paciente.
    if exists (
      select 1 from public.agendamentos a
      where a.id = p_request_id and a.clinica_id = v_clinica_id and a.origem = 'online'
    ) then
      return jsonb_build_object('ok', true, 'agendamento_id', p_request_id, 'repetido', true);
    end if;
    raise;
end;
$$;

revoke all on function public.kinesys_agendamento_online_cpf_valido(text) from public, anon, authenticated;
revoke all on function public.kinesys_agendamento_online_feriado(date) from public, anon, authenticated;
revoke all on function public.kinesys_criar_agendamento_online(text, uuid, text, uuid, date, time without time zone, text, text, date, text, boolean, text, text, text) from public, anon, authenticated;

grant execute on function public.kinesys_criar_agendamento_online(text, uuid, text, uuid, date, time without time zone, text, text, date, text, boolean, text, text, text) to service_role;
