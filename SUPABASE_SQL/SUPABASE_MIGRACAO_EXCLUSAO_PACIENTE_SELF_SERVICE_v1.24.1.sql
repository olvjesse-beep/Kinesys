-- KineSys v1.24.1 — exclusão administrativa de paciente pelo próprio sistema
-- Mantém o wrapper público já existente e corrige apenas a ordem transacional
-- das dependências internas. Nenhuma exclusão direta pelo navegador é necessária.

create or replace function public.kinesys_excluir_paciente_completo_interno_v1112(p_paciente_id text)
returns jsonb
language plpgsql
set search_path to 'public', 'pg_temp'
as $$
declare
    v_nome text;
    v_total bigint := 0;
    v_rows bigint := 0;
    r record;
begin
    if p_paciente_id is null or btrim(p_paciente_id) = '' then
        raise exception 'KineSys: paciente_id é obrigatório.';
    end if;

    select nome into v_nome
    from public.pacientes
    where id::text = p_paciente_id
    for update;

    if not found then
        raise exception 'KineSys: paciente não encontrado (%).', p_paciente_id;
    end if;

    -- Tabelas futuras/auxiliares com paciente_id são removidas primeiro quando
    -- não fazem parte da ordem conhecida abaixo. Assim, filhos adicionais não
    -- impedem a remoção posterior dos registros principais.
    for r in
        select c.table_name
        from information_schema.columns c
        join information_schema.tables t
          on t.table_schema = c.table_schema
         and t.table_name = c.table_name
        where c.table_schema = 'public'
          and c.column_name = 'paciente_id'
          and t.table_type = 'BASE TABLE'
          and c.table_name not in (
              'pacientes','pagamentos','cobrancas_agendamento','agendamentos',
              'agendamentos_status_historico','lista_espera','arquivos_paciente',
              'documentos_timeline','evolucoes','avaliacoes','planos_atendimento',
              'creditos_paciente_usos'
          )
    loop
        execute format('delete from public.%I where paciente_id::text = $1', r.table_name)
        using p_paciente_id;
        get diagnostics v_rows = row_count;
        v_total := v_total + v_rows;
    end loop;

    -- 1. Filhos financeiros. Pagamentos referenciam cobrança, agendamento e plano.
    if to_regclass('public.pagamentos') is not null then
        delete from public.pagamentos where paciente_id::text = p_paciente_id;
        get diagnostics v_rows = row_count; v_total := v_total + v_rows;
    end if;

    if to_regclass('public.creditos_paciente_usos') is not null then
        delete from public.creditos_paciente_usos where paciente_id::text = p_paciente_id;
        get diagnostics v_rows = row_count; v_total := v_total + v_rows;
    end if;

    -- 2. Cobranças precisam sair ANTES de agendamentos/planos por FK RESTRICT.
    if to_regclass('public.cobrancas_agendamento') is not null then
        delete from public.cobrancas_agendamento where paciente_id::text = p_paciente_id;
        get diagnostics v_rows = row_count; v_total := v_total + v_rows;
    end if;

    -- 3. Histórico operacional sem FK direta para pacientes/agendamentos.
    if to_regclass('public.agendamentos_status_historico') is not null then
        delete from public.agendamentos_status_historico where paciente_id::text = p_paciente_id;
        get diagnostics v_rows = row_count; v_total := v_total + v_rows;
    end if;

    -- 4. Registros clínicos e auxiliares do paciente.
    if to_regclass('public.avaliacoes') is not null then
        delete from public.avaliacoes where paciente_id::text = p_paciente_id;
        get diagnostics v_rows = row_count; v_total := v_total + v_rows;
    end if;

    if to_regclass('public.evolucoes') is not null then
        delete from public.evolucoes where paciente_id::text = p_paciente_id;
        get diagnostics v_rows = row_count; v_total := v_total + v_rows;
    end if;

    if to_regclass('public.lista_espera') is not null then
        delete from public.lista_espera where paciente_id::text = p_paciente_id;
        get diagnostics v_rows = row_count; v_total := v_total + v_rows;
    end if;

    if to_regclass('public.arquivos_paciente') is not null then
        delete from public.arquivos_paciente where paciente_id::text = p_paciente_id;
        get diagnostics v_rows = row_count; v_total := v_total + v_rows;
    end if;

    if to_regclass('public.documentos_timeline') is not null then
        delete from public.documentos_timeline where paciente_id::text = p_paciente_id;
        get diagnostics v_rows = row_count; v_total := v_total + v_rows;
    end if;

    -- 5. Agora não há cobranças/pagamentos bloqueando o agendamento.
    if to_regclass('public.agendamentos') is not null then
        delete from public.agendamentos where paciente_id::text = p_paciente_id;
        get diagnostics v_rows = row_count; v_total := v_total + v_rows;
    end if;

    -- 6. Planos são removidos após seus pagamentos, usos e cobranças.
    if to_regclass('public.planos_atendimento') is not null then
        delete from public.planos_atendimento where paciente_id::text = p_paciente_id;
        get diagnostics v_rows = row_count; v_total := v_total + v_rows;
    end if;

    delete from public.pacientes where id::text = p_paciente_id;
    if not found then
        raise exception 'KineSys: o cadastro do paciente não pôde ser removido.';
    end if;

    return jsonb_build_object(
        'ok', true,
        'paciente_id', p_paciente_id,
        'paciente_nome', v_nome,
        'registros_historicos_removidos', v_total,
        'cadastro_removido', true
    );
end;
$$;

-- A função interna nunca deve ser chamável pelo cliente. O único ponto de entrada
-- permanece kinesys_excluir_paciente_completo(), que valida administrador e clínica.
revoke all on function public.kinesys_excluir_paciente_completo_interno_v1112(text) from public, anon, authenticated;
revoke all on function public.kinesys_excluir_paciente_completo(text) from public, anon;
grant execute on function public.kinesys_excluir_paciente_completo(text) to authenticated;
