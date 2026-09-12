const fs = require('fs');
const assert = require('assert');

const migrationPath = 'SUPABASE_SQL/SUPABASE_MIGRACAO_AGENDAMENTO_ONLINE_ESTRUTURA_20260912.sql';
const sql = fs.readFileSync(migrationPath, 'utf8');

assert(sql.includes('add column if not exists agendamento_online_ativo boolean not null default false'),
  'procedimentos deve permanecer fechado para agendamento online por padrão');
assert(sql.includes("add column if not exists origem text not null default 'interno'"),
  'agendamentos deve preservar origem interna por padrão');
assert(sql.includes("add column if not exists origem_cadastro text not null default 'interno'"),
  'pacientes existentes devem preservar origem interna por padrão');
assert(sql.includes('add column if not exists cadastro_validado boolean not null default true'),
  'pacientes existentes devem permanecer validados');
assert(sql.includes('create table if not exists public.configuracoes_agendamento_online'),
  'configuração do portal online deve ser explícita por clínica');
assert(sql.includes('ativo boolean not null default false'),
  'portal online deve ficar desativado por padrão');
assert(sql.includes('create table if not exists public.disponibilidade_agendamento_online'),
  'disponibilidade online deve ser uma camada própria de publicação');
assert(sql.includes('references public.equipe(id) on delete cascade'),
  'disponibilidade online deve estar vinculada a um profissional real');
assert(sql.includes('alter table public.configuracoes_agendamento_online enable row level security'),
  'configuração online deve usar RLS');
assert(sql.includes('alter table public.disponibilidade_agendamento_online enable row level security'),
  'publicação de horários online deve usar RLS');
assert(sql.includes('revoke all on table public.configuracoes_agendamento_online from anon'),
  'anon não pode acessar diretamente a configuração online');
assert(sql.includes('revoke all on table public.disponibilidade_agendamento_online from anon'),
  'anon não pode acessar diretamente a disponibilidade online');
assert(!/grant\s+[^;]+\s+to\s+anon\b/i.test(sql),
  'migration não pode conceder privilégios de tabela ao papel anon');
assert(!/security\s+definer/i.test(sql),
  'estrutura inicial não deve introduzir SECURITY DEFINER público');
assert(sql.includes("origem in ('interno', 'online')"),
  'origem do agendamento deve ter contrato explícito');
assert(sql.includes("origem_cadastro in ('interno', 'agendamento_online')"),
  'origem do cadastro do paciente deve ter contrato explícito');
assert(sql.includes("public.kinesys_pode_operar('agendamentos', 'SELECT')"),
  'RLS do agendamento online deve reutilizar o contrato de autorização da Agenda');
assert(sql.includes("public.kinesys_pode_operar('agendamentos', 'INSERT')"),
  'inserções internas da configuração/publicação devem respeitar kinesys_pode_operar');
assert(sql.includes("public.kinesys_pode_operar('agendamentos', 'UPDATE')"),
  'atualizações internas da configuração/publicação devem respeitar kinesys_pode_operar');
assert(sql.includes("public.kinesys_pode_operar('agendamentos', 'DELETE')"),
  'exclusões internas da configuração/publicação devem respeitar kinesys_pode_operar');
assert(sql.includes('public.kinesys_agenda_escopo_permitido(profissional_id)'),
  'disponibilidade online deve preservar o escopo profissional consolidado da Agenda');
assert(sql.includes("in ('MASTER', 'MASTER_FEM')"),
  'ativação e configuração global do portal devem permanecer administrativas');

console.log('agendamento_online_structure.contract: OK');
