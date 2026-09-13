const fs = require('fs');
const assert = require('assert');

const migration = fs.readFileSync('SUPABASE_SQL/SUPABASE_MIGRACAO_AGENDAMENTO_ONLINE_PERFIL_PUBLICO_20260913.sql', 'utf8');
const nameMigration = fs.readFileSync('SUPABASE_SQL/SUPABASE_MIGRACAO_AGENDAMENTO_ONLINE_NOME_PUBLICO_20260913.sql', 'utf8');
const fkIndex = fs.readFileSync('SUPABASE_SQL/SUPABASE_MIGRACAO_AGENDAMENTO_ONLINE_PERFIL_PUBLICO_FK_INDEX_20260913.sql', 'utf8');
const addon = fs.readFileSync('src/admin/configuracoes_agendamento_online_perfil_publico-1.0.0.js', 'utf8');
const addonCss = fs.readFileSync('styles/configuracoes_agendamento_online_perfil_publico-1.0.0.css', 'utf8');
const layout = fs.readFileSync('src/admin/configuracoes_agendamento_online_layout-1.0.0.js', 'utf8');
const layoutCss = fs.readFileSync('styles/configuracoes_agendamento_online_layout-1.0.0.css', 'utf8');
const glassCss = fs.readFileSync('styles/navigation_glass-1.0.0.css', 'utf8');
const designNavigation = fs.readFileSync('styles/design_navigation.css', 'utf8');
const designSystem = fs.readFileSync('src/core/design_system-1.20.1.js', 'utf8');
const bootstrap = fs.readFileSync('src/admin/access_admin-1.0.0.js', 'utf8');
const rootHtml = fs.readFileSync('index.html', 'utf8');
const htaccess = fs.readFileSync('.htaccess', 'utf8');

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

assert(layout.includes("{ id: 'geral'") && layout.includes("{ id: 'profissional'") && layout.includes("{ id: 'servicos'") && layout.includes("{ id: 'horarios'") && layout.includes("{ id: 'ausencias'"),
  'Configurações > Agenda deve usar cinco tarefas claras');
assert(layout.includes("sections: ['agenda_procedimentos', 'ks_online_sec_procedimentos']"),
  'Serviços deve reunir cadastro interno e publicação online no mesmo contexto');
assert(layout.includes("sections: ['agenda_horarios', 'ks_online_sec_horarios']"),
  'Horários deve reunir jornada interna e disponibilidade online');
assert(layout.includes("sections: ['agenda_bloqueios']"),
  'Ausências e bloqueios devem ficar em Configurações > Agenda');
assert(layout.includes("KineSysScreenLoader.ensure('tela_agenda')"),
  'hub administrativo deve carregar o bundle da Agenda sem navegar para a tela operacional');
assert(layout.includes("tab.textContent = 'Agenda'"),
  'aba administrativa principal deve se chamar Agenda');
assert(layout.includes("document.querySelector('#tela_agenda .ks-agenda-config-wrap')"),
  'Agenda operacional não deve manter um segundo menu de configurações concorrente');
assert(layout.includes("sessionStorage.setItem(STORAGE_KEY"),
  'etapa atual da configuração deve permanecer estável durante a sessão');
assert(layout.includes("role=\"tablist\"") && layout.includes('aria-selected'),
  'navegação interna deve preservar semântica acessível de tabs');

assert(layoutCss.includes('.ks-online-layout-nav'), 'workspace deve possuir navegação operacional própria');
assert(layoutCss.includes('repeat(5, minmax(0, 1fr))'),
  'desktop deve distribuir as cinco tarefas sem cards gigantes');
assert(layoutCss.includes('grid-template-columns: 112px 112px'),
  'horários HH:MM online não devem desperdiçar largura de desktop');
assert(layoutCss.includes('.ks-config-agenda-native'),
  'configurações nativas da Agenda devem receber tratamento visual dentro do hub');
assert(layoutCss.includes('#ks_config_panel_online .ks-week-row'),
  'jornada interna deve permanecer legível depois de movida para Configurações');
assert(layoutCss.includes('@media (max-width: 700px)') && layoutCss.includes('overflow-x: auto'),
  'navegação de tarefas deve adaptar-se a celular sem esmagar rótulos');
assert(layoutCss.includes('@media (max-width: 430px)'),
  'horários e ações devem possuir tratamento específico para celulares estreitos');
assert(!/#[0-9a-f]{3,8}\b/i.test(layoutCss), 'layout administrativo deve usar apenas tokens do KDS');

assert(/html body\.ks-design-ready #ks_sidebar\s*\{[\s\S]*?position:\s*fixed/.test(glassCss),
  'camada glass deve preservar o position fixed estrutural do próprio sidebar');
assert(glassCss.includes('backdrop-filter: blur(14px) saturate(155%) contrast(105%)') && glassCss.includes('-webkit-backdrop-filter: blur(14px) saturate(155%) contrast(105%)'),
  'clear liquid glass deve usar blur moderado e preservar transparência óptica com suporte WebKit');
assert(glassCss.includes('--ks-clear-glass-base: rgba(7, 61, 70, .46)') && glassCss.includes('--ks-clear-glass-base-deep: rgba(5, 46, 56, .54)'),
  'clear liquid glass deve preservar a família petróleo/teal com transparência real');
assert(glassCss.includes('radial-gradient') && glassCss.includes('--ks-clear-glass-specular') && glassCss.includes('border-right: 1px solid var(--ks-clear-glass-edge)'),
  'material deve construir profundidade por reflexão especular e borda óptica, não por névoa branca');
assert(glassCss.includes('backdrop-filter: blur(12px) saturate(158%) contrast(106%)'),
  'mobile deve usar blur ainda mais contido para manter leitura do fundo através do vidro');
assert(glassCss.includes('background: transparent') && glassCss.includes('box-shadow: none'),
  'itens internos devem permanecer flat e deixar o material glass no painel inteiro');
assert(glassCss.includes('@supports not'), 'glass deve possuir fallback para navegadores sem backdrop-filter');

assert(designNavigation.includes('width:min(86vw,360px)') && designNavigation.includes('max-width:calc(100vw - 44px)'),
  'drawer mobile deve usar largura previsível sem ocupar ou ultrapassar a viewport inteira');
assert(designNavigation.includes('height:100svh') && designNavigation.includes('height:100dvh'),
  'drawer mobile deve acompanhar a viewport útil do Safari/iPhone');
assert(designNavigation.includes('transform:translate3d(-104%,0,0)') && designNavigation.includes('transform:translate3d(0,0,0)'),
  'drawer deve ter estados fechado e aberto completos, sem posição intermediária');
assert(designNavigation.includes('visibility:hidden') && designNavigation.includes('pointer-events:none'),
  'estado fechado deve sincronizar visibilidade e interação');
assert(designNavigation.includes('.ks-nav-backdrop') && designNavigation.includes('opacity:0') && designNavigation.includes('pointer-events:none'),
  'backdrop deve permanecer montado e alternar por estado visual/interação');
assert(!designNavigation.includes('body.ks-design-ready.ks-nav-open .ks-nav-backdrop{display:block}'),
  'drawer não deve depender de display toggle no backdrop durante restauração do Safari');
assert(designNavigation.includes('env(safe-area-inset-top)') && designNavigation.includes('env(safe-area-inset-bottom)'),
  'drawer deve respeitar safe areas do iPhone');
assert(!designNavigation.includes('html.ks-nav-open body.ks-design-ready #ks_sidebar'),
  'estado visual do drawer deve ter uma única fonte de verdade no body');

assert(designSystem.includes('KineSysMobileDrawerHardening_v1300'),
  'design system deve instalar o hardening do drawer mobile existente');
assert(designSystem.includes("window.addEventListener('pageshow',reset)") && designSystem.includes("window.addEventListener('popstate',reset)"),
  'drawer deve normalizar estado após bfcache e histórico do Safari');
assert(designSystem.includes("window.addEventListener('orientationchange'") && designSystem.includes("window.addEventListener('resize'"),
  'drawer deve normalizar estado após rotação e mudança de breakpoint');
assert(designSystem.includes("document.documentElement.classList.toggle('ks-nav-open'") && designSystem.includes("document.body.classList.toggle('ks-nav-open'"),
  'hardening deve limpar estado residual tanto do html quanto do body');
assert(designSystem.includes('sidebar.inert=!shouldOpen'),
  'sidebar fechado deve sair da navegação por foco no mobile');
assert(designSystem.includes('list.scrollTop=0'),
  'cada abertura deve começar no topo e não reutilizar scroll parcial restaurado pelo Safari');

assert(bootstrap.includes('configuracoes_agendamento_online_perfil_publico-1.0.0.js'),
  'bootstrap deve carregar o módulo V2 de perfil público');
assert(bootstrap.includes('configuracoes_agendamento_online_layout-1.0.0.js'),
  'bootstrap deve carregar o workspace administrativo depois do perfil público');
assert(bootstrap.includes("ONLINE_CONFIG_REVISION='20260913-config-agenda-r1'"),
  'configuração base deve usar revisão inequívoca do novo hub');
assert(bootstrap.includes("ONLINE_PROFILE_CONFIG_REVISION='20260913-config-agenda-r1'"),
  'perfil público deve usar revisão inequívoca do novo hub');
assert(bootstrap.includes("ONLINE_LAYOUT_REVISION='20260913-config-agenda-r1'"),
  'workspace deve usar revisão inequívoca do novo hub');
assert(rootHtml.includes('src/admin/access_admin-1.0.0.js?v=20260913-config-agenda-r3'),
  'HTML raiz deve carregar diretamente a revisão atual do bootstrap administrativo');
assert(!rootHtml.includes('src/admin/access_admin-1.0.0.js?v=20260913-online-v4'),
  'HTML raiz não pode depender da revisão histórica do bootstrap');
assert(rootHtml.includes('styles/design_navigation.css?v=20260913-glass-r3'),
  'HTML raiz deve manter referência conhecida da folha estrutural antes da substituição de entrega');
assert(rootHtml.includes('styles/navigation_glass-1.0.0.css?v=20260913-glass-r3'),
  'HTML raiz deve manter referência conhecida do glass antes da substituição de entrega');
assert(rootHtml.includes('src/core/design_system-1.20.1.js?v=20260910-phase4e-r1'),
  'HTML raiz deve manter referência conhecida do design system antes da substituição de entrega');
assert(htaccess.includes('src/admin/access_admin-1.0.0.js?v=20260913-config-agenda-r1'),
  'servidor deve manter fallback de compatibilidade para HTML legado');
assert(htaccess.includes('navigation_glass-1\\.0\\.0\\.css') && htaccess.includes('design_navigation\\.css'),
  'servidor deve revalidar as folhas estrutural e glass da navegação');
assert(htaccess.includes('design_system-1\\.20\\.1\\.js'),
  'servidor deve revalidar o JavaScript do drawer mobile');
assert(htaccess.includes('Header always set Clear-Site-Data "\\"cache\\""'),
  'entrega deve limpar somente o cache uma vez para remover assets antigos');
assert(!htaccess.includes('Clear-Site-Data "\\"cookies\\"') && !htaccess.includes('Clear-Site-Data "\\"storage\\"'),
  'reset de entrega não pode limpar sessão, cookies ou armazenamento local');
assert(htaccess.includes('kinesys_delivery_clear_glass_r10_seen=1') && htaccess.includes('env=!kinesys_delivery_clear_glass_r10_seen'),
  'limpeza de cache deve ser protegida para ocorrer apenas na primeira abertura da revisão visual');
assert(htaccess.includes('src/core/design_system-1.20.1.js?v=20260913-drawer-r9'),
  'resposta HTML deve manter a revisão estável do lifecycle mobile');
assert(htaccess.includes('styles/design_navigation.css?v=20260913-drawer-r9'),
  'resposta HTML deve manter a revisão estável da estrutura do drawer');
assert(htaccess.includes('styles/navigation_glass-1.0.0.css?v=20260913-clear-glass-r10'),
  'resposta HTML deve entregar revisão inequívoca do clear liquid glass');

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