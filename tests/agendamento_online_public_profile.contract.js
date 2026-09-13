const fs = require('fs');
const assert = require('assert');

const migration = fs.readFileSync('SUPABASE_SQL/SUPABASE_MIGRACAO_AGENDAMENTO_ONLINE_PERFIL_PUBLICO_20260913.sql', 'utf8');
const nameMigration = fs.readFileSync('SUPABASE_SQL/SUPABASE_MIGRACAO_AGENDAMENTO_ONLINE_NOME_PUBLICO_20260913.sql', 'utf8');
const fkIndex = fs.readFileSync('SUPABASE_SQL/SUPABASE_MIGRACAO_AGENDAMENTO_ONLINE_PERFIL_PUBLICO_FK_INDEX_20260913.sql', 'utf8');
const addon = fs.readFileSync('src/admin/configuracoes_agendamento_online_perfil_publico-1.0.0.js', 'utf8');
const addonCss = fs.readFileSync('styles/configuracoes_agendamento_online_perfil_publico-1.0.0.css', 'utf8');
const layout = fs.readFileSync('src/admin/configuracoes_agendamento_online_layout-1.0.0.js', 'utf8');
const layoutCss = fs.readFileSync('styles/configuracoes_agendamento_online_layout-1.0.0.css', 'utf8');
const bootstrap = fs.readFileSync('src/admin/access_admin-1.0.0.js', 'utf8');
const rootHtml = fs.readFileSync('index.html', 'utf8');

assert(migration.includes('slug_publico text'), 'configuração deve possuir slug público por clínica');
assert(migration.includes('mensagem_confirmacao text not null'), 'mensagem pós-agendamento deve ser persistida');
assert(migration.includes('create unique index if not exists idx_config_agendamento_online_slug_publico'),
  'slug público deve ser exclusivo');
assert(migration.includes('create table if not exists public.agendamento_online_profissionais_config'),
  'perfil público deve possuir tabela dedicada');
assert(migration.includes('atende_convenios boolean not null default false'),
  'convênios devem ser opt-in e seguros por padrão');
assert(migration.includes("convenios text[] not null default '{}'::text[]"),
  'lista de convênios deve possuir default vazio');
assert(migration.includes('enable row level security'), 'perfil público administrativo deve manter RLS');
assert(!/grant\s+[^;]+\s+to\s+anon\b/i.test(migration),
  'tabela administrativa do perfil não pode ser concedida ao anon');
assert(nameMigration.includes('nome_publico text not null'), 'nome comercial público deve ser separado do nome interno legado');
assert(fkIndex.includes('idx_agendamento_online_prof_config_profissional'), 'FK do perfil profissional deve ter índice próprio');

assert(addon.includes('ks_online_v2_nome_publico'), 'configurações devem permitir nome comercial público');
assert(addon.includes('ks_online_v2_slug'), 'configurações devem permitir slug público');
assert(addon.includes('ks_online_v2_link') && addon.includes('Copiar link'),
  'link público deve ficar visível e copiável em Configurações');
assert(addon.includes('ks_online_v2_mensagem_confirmacao'),
  'mensagem pós-agendamento deve ser editável em Configurações');
assert(addon.includes('ks_online_v2_atende_convenios') && addon.includes('ks_online_v2_convenios'),
  'configuração por profissional deve permitir convênios ou somente particular');
assert(addon.includes('ks_online_profissional_horarios') && addon.includes('Configurar profissional'),
  'configuração deve partir da seleção do profissional antes de horários e perfil');
assert(addon.includes('profissionais_ids') && addon.includes('filtrarProcedimentos'),
  'procedimentos devem ser apresentados no contexto do profissional selecionado');
assert(addon.includes("from('agendamento_online_profissionais_config')"),
  'perfil público deve persistir somente na tabela dedicada');
assert(!addon.includes("from('agendamentos')") && !addon.includes("from('pacientes')"),
  'editor de perfil público não deve tocar agendamentos ou pacientes');

assert(layout.includes("{ id: 'geral'") && layout.includes("{ id: 'profissional'") && layout.includes("{ id: 'servicos'") && layout.includes("{ id: 'horarios'"),
  'configuração deve usar divulgação progressiva em quatro tarefas claras');
assert(layout.includes("sessionStorage.setItem(STORAGE_KEY"),
  'etapa atual da configuração deve permanecer estável durante a sessão');
assert(layout.includes("role=\"tablist\"") && layout.includes('aria-selected'),
  'navegação interna deve preservar semântica acessível de tabs');
assert(layoutCss.includes('.ks-online-layout-nav'), 'layout destilado deve possuir navegação operacional própria');
assert(layoutCss.includes('grid-template-columns: 112px 112px'),
  'horários HH:MM não devem desperdiçar largura de desktop');
assert(layoutCss.includes('.ks-online-week') && layoutCss.includes('repeat(2, minmax(0, 1fr))'),
  'semana deve usar duas colunas no desktop para reduzir varredura vertical');
assert(layoutCss.includes('@media (max-width: 700px)') && layoutCss.includes('overflow-x: auto'),
  'navegação de tarefas deve adaptar-se a celular sem esmagar rótulos');
assert(layoutCss.includes('@media (max-width: 430px)'),
  'horários e ações devem possuir tratamento específico para celulares estreitos');
assert(!/#[0-9a-f]{3,8}\b/i.test(layoutCss), 'layout deve usar apenas tokens do KDS');

assert(bootstrap.includes('configuracoes_agendamento_online_perfil_publico-1.0.0.js'),
  'bootstrap deve carregar o módulo V2 de perfil público');
assert(bootstrap.includes('configuracoes_agendamento_online_layout-1.0.0.js'),
  'bootstrap deve carregar o layout destilado depois do perfil público');
assert(bootstrap.includes("ONLINE_PROFILE_CONFIG_REVISION='20260913-online-v5'"),
  'módulo V2 deve possuir revisão explícita de cache');
assert(bootstrap.includes("ONLINE_LAYOUT_REVISION='20260913-online-v5'"),
  'layout destilado deve possuir revisão explícita de cache');
assert(rootHtml.includes('src/admin/access_admin-1.0.0.js?v=20260913-online-v4'),
  'HTML principal mantém o bootstrap estável; atualização forçada revalida o módulo administrativo');

assert(addonCss.includes('@media (max-width: 620px)'), 'perfil administrativo deve refluír para celular');
assert(addonCss.includes('@media (max-width: 430px)'), 'perfil administrativo deve tratar celulares estreitos explicitamente');
assert(addonCss.includes('grid-template-columns: 1fr'), 'grids V2 devem colapsar para uma coluna no celular');
assert(addonCss.includes('font-size: 16px'), 'campos móveis do V2 devem manter 16px');
assert(addonCss.includes('min-height: 48px'), 'ações móveis principais devem manter alvo de toque ampliado');
assert(addonCss.includes('overflow-wrap: anywhere'), 'textos configuráveis longos não devem causar overflow horizontal');
assert(addonCss.includes('.ks-config-hub-header h1:focus') && addonCss.includes('outline: none !important'),
  'título não interativo de Configurações não deve exibir contorno nativo de foco como uma borda visual');
assert(!/#[0-9a-f]{3,8}\b/i.test(addonCss), 'CSS V2 deve usar exclusivamente tokens KDS');

console.log('agendamento_online_public_profile.contract: OK');
