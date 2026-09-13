const fs = require('fs');
const assert = require('assert');

const html = fs.readFileSync('agendamento/index.html', 'utf8');
const css = fs.readFileSync('agendamento/agendamento-publico.css', 'utf8');
const js = fs.readFileSync('agendamento/agendamento-publico-v2.js', 'utf8');
const edge = fs.readFileSync('supabase/functions/agendamento-publico/index.ts', 'utf8');
const profileEdge = fs.readFileSync('supabase/functions/agendamento-publico-perfil/index.ts', 'utf8');

assert(html.includes('viewport-fit=cover'), 'portal deve respeitar safe-area em celulares');
assert(html.includes('data-step="profissional"') && html.includes('data-step="procedimento"') && html.includes('data-step="horario"') && html.includes('data-step="dados"'),
  'portal deve usar fluxo progressivo profissional → atendimento → horário → dados');
assert(html.includes('Seu atendimento foi agendado!'),
  'confirmação deve usar a mensagem principal definida para o paciente');
assert(html.includes('ks_public_profile_insurances') && html.includes('Convênios atendidos'),
  'portal deve reservar área pública para convênios do profissional');
assert(html.includes('agendamento-publico-v2.js?v=20260913-v3'),
  'portal deve carregar explicitamente o controller V2');

assert(css.includes('env(safe-area-inset-bottom)'), 'portal deve proteger safe-area no celular');
assert(css.includes('min-height:44px') || css.includes('min-height: 44px'), 'controles touch devem manter alvo confortável');
assert(css.includes('font-size:16px'), 'campos mobile devem manter 16px para legibilidade e evitar zoom automático');
assert(css.includes('var(--kds-font-body)'), 'portal deve reutilizar a escala tipográfica oficial do KDS');
assert(css.includes('grid-template-columns:minmax(0,1fr) minmax(360px,430px)'),
  'desktop deve manter perfil do profissional e agenda em duas colunas proporcionais');
assert(css.includes('@media (max-width:820px)') && css.includes('.ks-public-booking-panel{order:1') && css.includes('.ks-public-profile-panel{order:2'),
  'em tablet/celular a ação de agendar deve vir antes do perfil longo do profissional');
assert(css.includes('@media (max-width:620px)') && css.includes('.ks-public-form{grid-template-columns:1fr}'),
  'formulário público deve refluír para uma coluna no celular');
assert(css.includes('@media (max-width:430px)') && css.includes('flex-wrap:wrap') && css.includes('.ks-public-clinic{width:100%'),
  'cabeçalho deve refluír sem colisão em celulares estreitos');
assert(css.includes('html,body{max-width:100%;overflow-x:hidden}'),
  'portal não deve criar rolagem horizontal acidental');
assert(css.includes('.ks-public-selection strong,.ks-public-selection small{white-space:normal'),
  'resumo do horário não deve truncar informações essenciais no celular');
assert(!/#[0-9a-f]{3,8}\b/i.test(css), 'portal deve usar tokens do KDS, sem cores locais arbitrárias');

assert(js.includes("const ETAPAS=['profissional','procedimento','horario','dados']"),
  'fluxo público deve iniciar pela escolha do profissional');
assert(js.includes('/functions/v1/agendamento-publico'), 'portal deve consumir a fronteira pública dedicada');
assert(js.includes('/functions/v1/agendamento-publico-perfil'), 'portal deve consumir o perfil público complementar');
assert(js.includes('api_slug'), 'slug amigável deve ser resolvido para o slug interno somente no cliente público controlado');
assert(js.includes('Atendimento particular'), 'ausência de convênios deve ser comunicada como atendimento particular');
assert(js.includes('mensagem_confirmacao'), 'mensagem pós-agendamento deve vir da configuração editável');
assert(!js.includes('SUPABASE_SERVICE_ROLE_KEY'), 'browser nunca pode receber service role');
assert(!js.includes(".from('agendamentos')") && !js.includes('.from("agendamentos")'),
  'browser público não deve consultar a agenda diretamente');
assert(!js.includes(".from('pacientes')") && !js.includes('.from("pacientes")'),
  'browser público não deve consultar pacientes diretamente');

assert(edge.includes('SUPABASE_SERVICE_ROLE_KEY'), 'fronteira pública de reserva deve permanecer no servidor');
assert(edge.includes('config?.ativo') || edge.includes('config.ativo'), 'fronteira pública deve respeitar o liga/desliga administrativo');
assert(edge.includes('agendamento_online_ativo'), 'fronteira pública deve respeitar publicação explícita');
assert(edge.includes('disponibilidade_agendamento_online'), 'slots devem respeitar somente períodos publicados online');
assert(edge.includes('idsComDisponibilidade') && edge.includes('.filter((p) => idsComDisponibilidade.has(String(p.id)))'),
  'catálogo não deve exibir profissional sem nenhum período online publicado');
assert(edge.includes('vinculadosOriginais.length && !vinculadosPublicos.length'),
  'procedimento restrito não deve aparecer se nenhum profissional autorizado estiver publicado');
assert(edge.includes('bloqueios_agenda'), 'slots devem respeitar bloqueios da Agenda');
assert(edge.includes('.neq("status", "cancelado")') && !edge.includes('OCUPA_HORARIO'),
  'slots públicos devem tratar todo agendamento não cancelado como indisponível, igual à constraint final');
assert(edge.includes('feriadoAgenda'), 'slots devem respeitar feriados da Agenda consolidada');
assert(!edge.includes('.from("pacientes")') && !edge.includes(".from('pacientes')"),
  'Edge pública não deve ler cadastro de pacientes para o navegador');
assert(!edge.includes('.insert(') && !edge.includes('.update(') && !edge.includes('.delete(') && !edge.includes('.upsert('),
  'Edge pública não deve fazer DML direto; toda gravação deve passar pela RPC atômica');
assert(edge.includes('supabase.rpc("kinesys_criar_agendamento_online"'),
  'gravação pública deve ser delegada exclusivamente à RPC de reserva atômica');

assert(profileEdge.includes('slug_publico') && profileEdge.includes('api_slug'),
  'perfil público deve resolver link amigável sem renomear o slug interno da clínica');
assert(profileEdge.includes('nome_publico'), 'perfil público deve usar nome comercial configurável');
assert(profileEdge.includes('agendamento_online_profissionais_config'),
  'perfil público deve ler somente a camada específica de apresentação dos profissionais');
assert(profileEdge.includes('atende_convenios') && profileEdge.includes('convenios'),
  'perfil público deve expor convênios somente pela configuração dedicada');
assert(!profileEdge.includes('.from("pacientes")') && !profileEdge.includes('.from("agendamentos")'),
  'endpoint de perfil não deve tocar pacientes nem agendamentos');
assert(profileEdge.includes('req.method !== "GET"'), 'endpoint de perfil público deve ser somente leitura');

console.log('agendamento_online_public_portal.contract: OK');
