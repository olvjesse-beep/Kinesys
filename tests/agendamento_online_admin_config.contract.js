const fs = require('fs');
const assert = require('assert');

const migration = fs.readFileSync('SUPABASE_SQL/SUPABASE_MIGRACAO_AGENDAMENTO_ONLINE_CONFIGURACAO_ADMIN_20260912.sql', 'utf8');
const hardening = fs.readFileSync('SUPABASE_SQL/SUPABASE_MIGRACAO_AGENDAMENTO_ONLINE_HARDENING_20260913.sql', 'utf8');
const js = fs.readFileSync('src/admin/configuracoes_agendamento_online-1.0.0.js', 'utf8');
const css = fs.readFileSync('styles/configuracoes_agendamento_online-1.0.0.css', 'utf8');
const adminBootstrap = fs.readFileSync('src/admin/access_admin-1.0.0.js', 'utf8');

assert(migration.includes("add column if not exists titulo_publico text not null default 'Agende seu atendimento'"),
  'configuração pública deve ter título seguro por padrão');
assert(migration.includes('add column if not exists agendamento_online_ativo boolean not null default false'),
  'profissionais não podem ser publicados online automaticamente');
assert(migration.includes('add column if not exists agendamento_online_ordem integer not null default 0'),
  'ordem pública de profissionais deve ser explícita');
assert(!/grant\s+[^;]+\s+to\s+anon\b/i.test(migration),
  'configuração administrativa não pode conceder acesso de tabela a anon');
assert((hardening.match(/in \('MASTER', 'MASTER_FEM'\)/g) || []).length >= 4,
  'publicação semanal deve permanecer gravável somente pela administração');

assert(js.includes("from('configuracoes_agendamento_online')"),
  'aba deve persistir configuração administrativa no Supabase');
assert(js.includes("from('disponibilidade_agendamento_online')"),
  'aba deve gerenciar publicação de horários existente');
assert(js.includes("from('equipe')"),
  'aba deve controlar quais profissionais aparecem online');
assert(js.includes("from('procedimentos')"),
  'aba deve controlar quais procedimentos aparecem online');
assert(!js.includes("from('agendamentos')"),
  'configuração administrativa não deve criar ou alterar agendamentos');
assert(js.includes('capturarHorariosProfissionalAtual'),
  'editor deve validar e capturar os horários por profissional');
assert(js.includes('existem horários publicados que se sobrepõem'),
  'editor deve impedir sobreposição de períodos publicados');
assert(js.includes('Para abrir o portal, publique pelo menos um profissional.'),
  'portal ativo deve exigir ao menos um profissional publicado');
assert(js.includes('Para abrir o portal, publique pelo menos um procedimento.'),
  'portal ativo deve exigir ao menos um procedimento publicado');
assert(js.includes('Para abrir o portal, publique pelo menos um período para um profissional publicado.'),
  'portal ativo deve exigir disponibilidade de profissional efetivamente publicado');
assert(js.includes('não possui profissional publicado com horário online compatível'),
  'procedimento restrito deve exigir profissional publicado com disponibilidade online');
assert(js.includes('profissionaisComHorarios'),
  'validação administrativa deve cruzar procedimento com profissional que possui período publicado');
assert(js.includes('const anterior = state.profissionalSelecionado') && js.includes('evento.target.value = anterior'),
  'troca de profissional não deve descartar intervalos inválidos ainda em edição');
assert(js.includes("await salvarConfiguracaoPortal(client, { ...cfg, ativo: false })") &&
       js.includes('if (cfg.ativo) await salvarConfiguracaoPortal(client, cfg)'),
  'salvamento deve fechar o portal antes das dependências e reativar somente ao final');
assert(js.includes('window.KineSysConfiguracoesAgendaOnline'),
  'módulo deve expor contrato estável para abertura/refresh');
assert(!js.includes('setInterval('),
  'configuração não deve usar polling contínuo');

assert(adminBootstrap.includes('configuracoes_agendamento_online-1.0.0.js'),
  'bootstrap administrativo deve carregar a nova aba sem acoplar ao Motor Clínico');
assert(adminBootstrap.includes('ONLINE_CONFIG_REVISION'),
  'asset da configuração deve ter revisão explícita para invalidação de cache');

assert(css.includes('min-height: 44px'),
  'controles móveis devem preservar alvos de toque de pelo menos 44px');
assert(css.includes('font: 400 16px/'),
  'campos móveis devem usar 16px para evitar zoom e preservar legibilidade');
assert(css.includes('env(safe-area-inset-bottom)'),
  'barra de salvar deve respeitar safe area do celular');
assert(css.includes('@media (max-width: 430px)'),
  'layout deve tratar celulares estreitos no breakpoint oficial');
assert(css.includes('@media (min-width: 701px)'),
  'layout deve evoluir para desktop somente no breakpoint oficial complementar');
assert(css.includes('grid-template-columns: minmax(0, .8fr) minmax(0, 1.2fr)'),
  'configuração desktop deve modularizar profissionais e procedimentos sem empilhar tudo em largura total');
assert(css.includes('grid-template-columns: 112px 112px 82px'),
  'editor desktop de horários deve dimensionar inputs e ação pelo conteúdo, sem campos de hora elásticos');
assert(css.includes('max-width: 360px') && css.includes('.ks-online-profissional-select'),
  'seleção de profissional deve permanecer compacta e proporcional ao conteúdo');
assert(!/#[0-9a-f]{3,8}\b/i.test(css),
  'CSS novo deve usar somente tokens --kds-* e não cores locais');

console.log('agendamento_online_admin_config.contract: OK');
