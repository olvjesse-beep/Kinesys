const fs = require('fs');
const assert = require('assert');

const sql = fs.readFileSync('SUPABASE_SQL/SUPABASE_MIGRACAO_AGENDAMENTO_ONLINE_RESERVA_ATOMICA_20260912.sql', 'utf8');
const rateSql = fs.readFileSync('SUPABASE_SQL/SUPABASE_MIGRACAO_AGENDAMENTO_ONLINE_RATE_LIMIT_20260912.sql', 'utf8');
const edge = fs.readFileSync('supabase/functions/agendamento-publico/index.ts', 'utf8');
const portal = fs.readFileSync('agendamento/agendamento-publico.js', 'utf8');
const html = fs.readFileSync('agendamento/index.html', 'utf8');

assert(sql.includes('kinesys_criar_agendamento_online'), 'migration deve criar a transação atômica de reserva');
assert(sql.includes('security definer'), 'transação deve executar em fronteira privilegiada controlada');
assert(sql.includes('set search_path = public, pg_temp'), 'SECURITY DEFINER deve fixar search_path');
assert(sql.includes('revoke all on function public.kinesys_criar_agendamento_online') && sql.includes('from public, anon, authenticated'),
  'anon/authenticated não podem chamar a reserva atômica diretamente');
assert(sql.includes('grant execute on function public.kinesys_criar_agendamento_online') && sql.includes('to service_role'),
  'somente service_role deve receber execução da reserva');

assert(sql.includes("a.id = p_request_id") && sql.includes("v_existente_origem = 'online'"),
  'request UUID deve tornar reenvios idempotentes');
assert(sql.includes("origem_cadastro = 'agendamento_online'") && sql.includes('cadastro_validado is false'),
  'pré-cadastro online deve permanecer não validado até revisão interna');
assert(sql.includes("regexp_replace(coalesce(p.cpf, ''), '\\D', '', 'g') = v_cpf"),
  'reuso de prontuário deve usar CPF normalizado como identidade forte');
assert(sql.includes("p.origem_cadastro = 'agendamento_online'") && sql.includes("p.cadastro_validado is false"),
  'sem CPF, dedupe só pode reutilizar outro pré-cadastro online não validado');
assert(sql.includes("'online'"), 'agendamento criado pelo portal deve registrar origem online');
assert(sql.includes("'agendamento_online', 'Novo agendamento online'"), 'reserva deve criar notificação interna própria');
assert(sql.includes('agendamentos_sem_sobreposicao') || sql.includes('when exclusion_violation'),
  'corrida final de horário deve ser tratada pela constraint de sobreposição');
assert(sql.includes('disponibilidade_agendamento_online') && sql.includes('bloqueios_agenda') && sql.includes('horarios_atendimento'),
  'transação deve revalidar publicação, jornada e bloqueios dentro do banco');
assert(sql.includes('kinesys_agendamento_online_feriado'), 'transação deve revalidar feriados');

assert(rateSql.includes('agendamento_online_rate_limit'), 'migration deve criar armazenamento mínimo para rate limit público');
assert(rateSql.includes('kinesys_consumir_limite_agendamento_online'), 'migration deve criar consumo atômico do rate limit');
assert(rateSql.includes('enable row level security') && rateSql.includes('revoke all on table public.agendamento_online_rate_limit from public, anon, authenticated'),
  'rate limit não pode ficar exposto a anon/authenticated');
assert(rateSql.includes('revoke all on function public.kinesys_consumir_limite_agendamento_online') && rateSql.includes('to service_role'),
  'consumo do rate limit deve ser exclusivo da fronteira de servidor');

assert(edge.includes('body.acao === "reservar"'), 'Edge pública deve possuir ação explícita de reserva');
assert(edge.includes('supabase.rpc("kinesys_criar_agendamento_online"'), 'Edge deve delegar gravação à transação atômica');
assert(!edge.includes('.from("pacientes").insert') && !edge.includes('.from("agendamentos").insert'),
  'Edge pública não deve gravar tabelas diretamente');
assert(edge.includes('MAX_BODY_CHARS'), 'Edge deve limitar tamanho da solicitação pública');
assert(edge.includes('HORARIO_INDISPONIVEL') && edge.includes('23P01'), 'conflito concorrente deve virar resposta 409 compreensível');
assert(edge.includes('reservaDentroDoLimite') && edge.includes('kinesys_consumir_limite_agendamento_online'),
  'reserva pública deve consumir rate limit no servidor antes da transação');
assert(edge.includes('LIMITE_EXCEDIDO') && edge.includes('429'),
  'excesso de tentativas deve retornar HTTP 429 identificável pelo portal');
assert(edge.includes('crypto.subtle.sign("HMAC"'),
  'rate limit deve persistir somente chave HMAC opaca, nunca o IP em claro');

assert(portal.includes("acao: 'reservar'"), 'portal deve confirmar pela ação pública de reserva');
assert(portal.includes('uuidSolicitacao'), 'portal deve reutilizar um request UUID em retentativas');
assert(portal.includes("resposta.status === 409") && portal.includes("HORARIO_INDISPONIVEL"),
  'portal deve recuperar conflito de horário voltando à escolha de slots');
assert(!portal.includes('SUPABASE_SERVICE_ROLE_KEY'), 'service role jamais pode existir no navegador');
assert(html.includes('id="ks_public_step_dados"') && html.includes('id="ks_public_form"'),
  'portal mobile deve possuir etapa explícita de dados e confirmação');
assert(html.includes('id="ks_public_dependente"') && html.includes('id="ks_public_responsavel"'),
  'portal deve suportar dados mínimos de responsável para dependente');

console.log('agendamento_online_booking.contract: OK');
