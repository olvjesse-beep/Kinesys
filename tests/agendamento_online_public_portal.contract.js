const fs = require('fs');
const assert = require('assert');

const html = fs.readFileSync('agendamento/index.html', 'utf8');
const css = fs.readFileSync('agendamento/agendamento-publico.css', 'utf8');
const js = fs.readFileSync('agendamento/agendamento-publico.js', 'utf8');
const edge = fs.readFileSync('supabase/functions/agendamento-publico/index.ts', 'utf8');

assert(html.includes('viewport-fit=cover'), 'portal deve respeitar safe-area em celulares');
assert(html.includes('data-step="procedimento"') && html.includes('data-step="profissional"') && html.includes('data-step="horario"'),
  'portal deve usar fluxo progressivo procedimento → profissional → horário');
assert(css.includes('env(safe-area-inset-bottom)'), 'portal deve proteger a barra inferior no iPhone');
assert(css.includes('min-height:48px') || css.includes('min-height: 48px'), 'controles touch devem manter alvo confortável');
assert(css.includes('var(--kds-font-body)'), 'portal deve reutilizar a escala tipográfica oficial do KDS');

assert(js.includes("/functions/v1/agendamento-publico"), 'portal deve consumir somente a fronteira pública dedicada');
assert(!js.includes('SUPABASE_SERVICE_ROLE_KEY'), 'browser nunca pode receber service role');
assert(!js.includes(".from('agendamentos')") && !js.includes('.from("agendamentos")'),
  'browser público não deve consultar a agenda diretamente');
assert(!js.includes(".from('pacientes')") && !js.includes('.from("pacientes")'),
  'browser público não deve consultar pacientes diretamente');

assert(edge.includes('SUPABASE_SERVICE_ROLE_KEY'), 'consulta pública deve permanecer no servidor');
assert(edge.includes('config?.ativo') || edge.includes('config.ativo'), 'fronteira pública deve respeitar o liga/desliga administrativo');
assert(edge.includes('agendamento_online_ativo'), 'fronteira pública deve respeitar publicação explícita');
assert(edge.includes('disponibilidade_agendamento_online'), 'slots devem respeitar somente períodos publicados online');
assert(edge.includes('bloqueios_agenda'), 'slots devem respeitar bloqueios da Agenda');
assert(edge.includes('OCUPA_HORARIO'), 'slots devem respeitar apenas status que ocupam horário');
assert(edge.includes('feriadoAgenda'), 'slots devem respeitar feriados da Agenda consolidada');
assert(!edge.includes('.from("pacientes")') && !edge.includes(".from('pacientes')"),
  'fronteira de leitura não deve acessar cadastro de pacientes');
assert(!edge.includes('.insert(') && !edge.includes('.update(') && !edge.includes('.delete(') && !edge.includes('.upsert('),
  'esta etapa pública deve ser estritamente somente leitura');

console.log('agendamento_online_public_portal.contract: OK');
