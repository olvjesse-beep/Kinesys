'use strict';
const assert = require('node:assert/strict'), fs = require('node:fs'), vm = require('node:vm');
const { profile, catalog, slots } = require('./helpers/public_booking_fixture.cjs');
const html = fs.readFileSync('agendamento/index.html', 'utf8');
const script = fs.readFileSync('agendamento/agendamento-publico-v2.js', 'utf8');
class Element {
  constructor() { this.hidden = false; this.disabled = false; this.dataset = {}; this.attrs = {}; this.events = {}; this.value = ''; this.checked = false; this.textContent = ''; this.innerHTML = ''; this.classList = { toggle() {} }; }
  addEventListener(name, fn) { this.events[name] = fn; }
  setAttribute(name, value) { this.attrs[name] = value; }
  removeAttribute(name) { delete this.attrs[name]; }
  querySelector(name) { return this[name] ||= new Element(); }
  scrollIntoView() {} focus() {}
}
function setup() {
  const nodes = Object.fromEntries([...html.matchAll(/id="([^"]+)"/g)].map(m => [m[1], new Element()]));
  const calls = [], errors = [];
  const stages = [...html.matchAll(/<section[^>]*id="([^"]+)"[^>]*data-step="([^"]+)"/g)].map(m => { nodes[m[1]].dataset.step = m[2]; return nodes[m[1]]; });
  const markers = Array.from({length:4}, (_, i) => {const e=new Element();e.dataset.progressSegment=String(i);return e;});
  let slotsResponse = () => ({ ok: true, json: async () => slots });
  let reservation = () => ({ ok: true, json: async () => ({ ok: true }) });
  const ctx = { Date, Intl, Map, Set, console: { ...console, error:e=>errors.push(e) }, URLSearchParams, setTimeout: fn => fn(), crypto: { randomUUID: () => 'request-demo' }, location: { search: '?clinica=demo' }, document: { getElementById: id => nodes[id], querySelectorAll: selector => selector==='[data-step]'?[...stages,...(nodes.ks_public_app.dataset.step?[nodes.ks_public_app]:[])]:selector==='[data-progress-segment]'?markers:[], addEventListener() {} }, window: { scrollTo() {} }, fetch: async (url, options) => { const body = options?.body ? JSON.parse(options.body) : null; calls.push({ url, body }); return body?.acao === 'slots' ? slotsResponse() : body?.acao === 'reservar' ? reservation() : { ok: true, json: async () => url.includes('perfil') ? profile : catalog }; } };
  vm.runInNewContext(fs.readFileSync('agendamento/calendario-publico.js', 'utf8'), ctx);
  vm.runInNewContext(script.replace('bind();load();', 'window.test={s,load,selectProfessional,selectProcedure,loadSlots,selectDate,selectTime,moveMonth,openStep,prepareData,book};bind();'), ctx);
  return { api: ctx.window.test, calendar: ctx.window.KineSysPublicCalendar, nodes, calls, errors, setSlots: fn => slotsResponse = fn, setReservation: fn => reservation = fn };
}
const flush = () => new Promise(r => setImmediate(r));
(async () => {
  const t = setup(), a = t.api, c = t.calendar;
  assert.equal(c.date('2026-02-30'), null);
  assert.equal(c.model([], '2026-13'), null);
  assert.equal(c.model([], '2024-02').cells.filter(Boolean).length, 29);
  const october = c.model(slots.dias, '2026-10');
  assert.equal(october.label, 'Outubro 2026');
  assert.equal(october.cells.findIndex(d => d?.day === 1), 3, 'Outubro começa quinta, não domingo');
  assert.equal(october.cells.findIndex(d => d?.day === 26) % 7, 0, '26/10 é segunda');
  assert.equal(october.cells.find(d => d?.day === 26).count, 1);
  assert.equal(october.cells.find(d => d?.day === 25).count, 0);
  assert.equal(c.model([], '2026-08').cells.length, 42, 'Meses de seis semanas não são cortados');
  assert.equal(c.days([{ data: 'inválida', horarios: [{}] }, { data: '2026-10-01', horarios: [] }]).length, 0);
  await a.load(); a.selectProfessional('prof-demo'); a.selectProcedure('osteo-demo'); await flush();
  assert.equal(a.s.data, '2026-10-26'); assert.equal(a.s.month, '2026-10');
  assert(t.nodes.ks_public_datas.innerHTML.includes('disabled'));
  assert(!t.nodes.ks_public_datas.innerHTML.includes('data-data="2026-10-25"'), 'Indisponíveis não têm ação');
  assert.equal(t.nodes.ks_public_month_prev.disabled, true); assert.equal(t.nodes.ks_public_month_next.disabled, false);
  a.selectDate('2026-10-25'); assert.equal(a.s.data, '2026-10-26', 'Não selecionar dia que o servidor não retornou');
  a.selectTime('11:00', '12:00'); assert.equal(t.nodes.ks_public_selection.hidden, false);
  a.moveMonth(1); assert.equal(a.s.month, '2026-11'); assert.equal(a.s.data, '2026-11-03'); assert.equal(a.s.horario, null);
  assert.equal(t.nodes.ks_public_month_next.disabled, true); a.moveMonth(1); assert.equal(a.s.month, '2026-11');
  a.moveMonth(-1); a.selectTime('11:00', '12:00'); a.prepareData();
  assert.equal(t.nodes.ks_public_app.dataset.bookingStep, 'dados'); assert.equal(t.nodes.ks_public_selection.hidden, true);
  assert.equal(t.nodes.ks_public_app.hidden, false, 'O estado visual da página não pertence ao seletor das etapas');
  assert.equal(t.nodes.ks_public_step_dados.hidden, false); assert.equal(t.nodes.ks_public_step_horario.hidden, true);
  a.openStep('horario'); assert.equal(t.nodes.ks_public_selection.hidden, false);
  a.selectProcedure('av-demo'); await flush(); assert.equal(a.s.horario, null); assert.equal(t.nodes.ks_public_selection.hidden, true);
  assert.equal(t.nodes.ks_public_summary_service.textContent, 'Avaliação · 60 min');
  a.selectTime('11:00', '12:00');
  t.nodes.ks_public_nome.value = 'Paciente de teste'; t.nodes.ks_public_nascimento.value = '1990-01-01'; t.nodes.ks_public_telefone.value = '11999990000'; t.nodes.ks_public_consentimento.checked = true;
  t.nodes.ks_public_dependente.checked = true; await a.book({ preventDefault() {} });
  assert(!t.calls.some(x => x.body?.acao === 'reservar'), 'Dados incompletos do responsável impedem envio');
  t.nodes.ks_public_responsavel_nome.value = 'Responsável de teste'; t.nodes.ks_public_responsavel_parentesco.value = 'Outro'; t.nodes.ks_public_responsavel_telefone.value = '11999990001';
  let resolve; t.setReservation(() => new Promise(r => resolve = r)); const pending = a.book({ preventDefault() {} });
  await a.book({ preventDefault() {} }); assert.equal(t.calls.filter(x => x.body?.acao === 'reservar').length, 1, 'Duplo clique não reserva duas vezes');
  resolve({ ok: true, json: async () => ({ ok: true }) }); await pending;
  const payload = t.calls.find(x => x.body?.acao === 'reservar').body;
  assert.equal(payload.profissional_id, 'prof-demo'); assert.equal(payload.procedimento_id, 'av-demo'); assert.equal(payload.data, '2026-10-26'); assert.equal(payload.hora_inicio, '11:00'); assert.equal(payload.paciente.responsavel_nome, 'Responsável de teste');
  assert.equal(t.nodes.ks_public_success.hidden, false);
  // Disponibilidade antiga não reaparece depois de trocar atendimento/profissional.
  let old; t.setSlots(() => new Promise(r => old = r)); const oldRequest = a.loadSlots();
  a.selectProfessional('prof-demo'); old({ ok: true, json: async () => slots }); await oldRequest;
  assert.equal(a.s.slots.length, 0); assert.equal(t.nodes.ks_public_calendar.hidden, true);
  t.setSlots(() => ({ ok: true, json: async () => ({ dias: [] }) })); a.selectProcedure('osteo-demo'); await flush();
  assert.equal(t.nodes.ks_public_sem_horarios.hidden, false); assert.equal(t.nodes.ks_public_calendar.hidden, true);
  t.setSlots(() => { throw new Error('Falha simulada'); }); await a.loadSlots(); assert.equal(t.nodes.ks_public_calendar.hidden, true);
  assert.equal(t.errors.length, 1, 'Erro simulado foi tratado uma vez');
  // Conflito libera nova escolha, sem confirmação fantasma; erro conserva dados.
  const conflict = setup(); await conflict.api.load(); conflict.api.selectProfessional('prof-demo'); conflict.api.selectProcedure('osteo-demo'); await flush(); conflict.api.selectTime('11:00','12:00');
  for(const [id,value] of Object.entries({ks_public_nome:'Paciente de teste',ks_public_nascimento:'1990-01-01',ks_public_telefone:'11999990000'})) conflict.nodes[id].value=value;
  conflict.nodes.ks_public_consentimento.checked=true;
  conflict.setReservation(()=>({ok:false,status:409,json:async()=>({codigo:'HORARIO_INDISPONIVEL'})}));
  await conflict.api.book({preventDefault(){}}); assert.equal(conflict.nodes.ks_public_app.dataset.bookingStep,'horario'); assert.equal(conflict.api.s.horario,null); assert.equal(conflict.nodes.ks_public_success.hidden,true);
  conflict.api.selectTime('11:00','12:00'); conflict.setReservation(()=>{throw new Error('Indisponível');}); await conflict.api.book({preventDefault(){}});
  assert.equal(conflict.nodes.ks_public_nome.value,'Paciente de teste'); assert.equal(conflict.api.s.reservando,false); assert.equal(conflict.nodes.ks_public_confirmar.disabled,false);
  // Assets do portal partilham revisão e o helper vem antes do controlador.
  const urls = [...html.matchAll(/(?:src|href)="\.\/([^"?]+)\?v=([^" ]+)"/g)];
  assert.equal(new Set(urls.map(x => x[2])).size, 1);
  assert(html.indexOf('calendario-publico.js') < html.indexOf('agendamento-publico-v2.js'));
  const ids = [...html.matchAll(/id="([^"]+)"/g)].map(x => x[1]); assert.equal(new Set(ids).size, ids.length);
  const css = fs.readFileSync('agendamento/agendamento-modelo2.css', 'utf8');
  for (const bp of ['1180', '900', '620', '430']) assert(css.includes(`max-width:${bp}px`));
  assert(css.includes('repeat(7,minmax(0,1fr))')); assert(!/#[0-9a-f]{3,8}\b/i.test(css));
  assert(css.includes("url('./banner-kinesys.png')"));
  console.log('PASS portal modelo 2: calendário UTC/meses, disponibilidade, resumo/contexto, fluxo completo, responsável, concorrência, vazio/erro e assets.');
})().catch(e => { console.error(e); process.exitCode = 1; });
