'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const design = fs.readFileSync('src/core/design_system-1.20.1.js', 'utf8');
const registration = fs.readFileSync('src/patient/patient_registration_core-1.0.0.js', 'utf8');
const summarySource = design.slice(design.indexOf('async function atualizarResumoPacienteContexto('), design.indexOf('window.atualizarResumoPacienteContexto='));
const actionSource = design.slice(design.indexOf('async function executarAcaoPacienteCard('), design.indexOf('window.executarAcaoPacienteCard='));
const bindingSource = design.slice(design.indexOf('function vincularAcoesProntuario('), design.indexOf('function escutarSeletoresPaciente('));

function fixture() {
  const added = [], listeners = {}, fields = {}, edits = [], routes = [], notices = [];
  const actions = { querySelector: () => null, insertBefore: fragment => added.push(...fragment.children) };
  const summary = { hidden: true, dataset: {}, innerHTML: '', replaceChildren() { this.innerHTML = ''; added.length = 0; },
    querySelector: () => actions, appendChild() {}, contains: button => added.includes(button),
    addEventListener: (name, handler) => { listeners[name] = handler; } };
  const a = { id: 'synthetic-patient-a', nome: 'Paciente Alfa', telefone: '00000000000', avaliacoes: [], evolucoes: [] };
  const b = { id: 'synthetic-patient-b', nome: 'Paciente Beta', telefone: '00000000001', avaliacoes: [], evolucoes: [] };
  let selected = a, allowed = true;
  const context = { console, contextoRevisao: 0, pacienteContextoId: a.id, pacienteAtualId: null,
    document: { getElementById: id => id === 'ks_prontuario_resumo' ? summary : id === 'ks_prontuario_cards' ? null : (fields[id] ||= { value: '', dataset: {} }),
      createElement: () => ({ dataset: {}, setAttribute() {} }), createDocumentFragment: () => ({ children: [], append(button) { this.children.push(button); } }) },
    obterPacienteContexto: async () => selected, escapeHTMLDS: text => String(text),
    definirPacienteContexto: async id => { selected = [a, b].find(p => p.id === id); context.pacienteContextoId = id; },
    toast: (...args) => notices.push(args), obterPacientesBasicos: async () => [a, b],
    navegarPara: (...args) => routes.push(args), pacienteEhDependente: () => false,
    definirStatusCEP() {}, definirUltimoCEPPesquisadoKineSys() {}, alternarCamposResponsavel() {}, atualizarAcoesCadastroPorPerfil() {} };
  context.window = context;
  context.telaPermitida = screen => screen !== 'tela_cadastro' || allowed;
  vm.createContext(context);
  vm.runInContext(design.slice(design.indexOf('    function formatarDataDiretorio('),design.indexOf('    function prepararFinanceiro(')),context);
  vm.runInContext(registration.slice(registration.indexOf('async function editarCadastro('), registration.indexOf('// APIs históricas')), context);
  const canonicalEdit = context.editarCadastro;
  context.editarCadastro = async id => { edits.push(id); return canonicalEdit(id); };
  vm.runInContext(summarySource + actionSource + bindingSource, context);
  return { context, summary, fields, added, listeners, edits, routes, notices, a, b,
    select(p) { selected = p; context.pacienteContextoId = p?.id || ''; }, deny() { allowed = false; } };
}

async function main() {
  const f = fixture();
  await f.context.atualizarResumoPacienteContexto();
  const button = f.added.find(b => b.dataset.ksPatientAction === 'editar');
  assert(button, 'prontuário ativo deve oferecer edição cadastral sem buscar outra vez');
  assert.equal(button.textContent, 'Editar cadastro');
  assert.equal(button.className, 'btn-secondary', 'reutiliza o estilo responsivo existente');
  for (const action of ['consultar_avaliacao', 'historico_evolucao', 'agendamentos', 'financeiro']) assert(f.added.some(b => b.dataset.ksPatientAction === action), 'demais atalhos permanecem');
  f.context.vincularAcoesProntuario();
  f.context.vincularAcoesProntuario();
  const click = target => f.listeners.click({ target: { closest: selector => selector.includes('close') ? null : target }, preventDefault() {}, stopPropagation() {} });
  await click(button);
  assert.deepEqual(f.edits, [f.a.id]);
  assert.equal(f.context.pacienteAtualId, f.a.id);
  assert.equal(f.fields.cad_nome.value, f.a.nome);
  assert.equal(f.fields.cad_telefone.value, f.a.telefone);
  assert.deepEqual(f.routes, [['tela_cadastro', true]], 'abre formulário canônico de edição, não avaliação nem novo cadastro');
  assert.equal(button.disabled, false);
  f.select(f.b);
  f.added.length = 0;
  await f.context.atualizarResumoPacienteContexto();
  await click(f.added.find(b => b.dataset.ksPatientAction === 'editar'));
  assert.deepEqual(f.edits, [f.a.id, f.b.id], 'troca de paciente usa o ID atual, nunca o último editado');
  assert.equal(f.fields.cad_nome.value, f.b.nome);
  assert.equal(f.context.pacienteAtualId, f.b.id);
  let voltou=false;f.context.abrirPacienteNaTela=async tela=>{assert.equal(tela,'tela_buscar');assert.equal(f.context.pacienteContextoId,f.b.id);voltou=true;};
  await f.context.cancelarEdicaoCadastro();assert(voltou,'cancelar volta ao prontuário por ID');assert.equal(f.fields.cad_cancelar_edicao.hidden,true);assert.equal(f.fields.tela_cadastro.dataset.editandoPaciente,undefined);
  f.a.avaliacoes=[{dataAvaliacao:'2026-10-21'}];f.select(f.a);await f.context.atualizarResumoPacienteContexto();assert.match(f.summary.innerHTML,/21\/10\/2026/,'última avaliação usa data brasileira');
  const denied = fixture(); denied.deny();
  await denied.context.atualizarResumoPacienteContexto();
  assert(!denied.added.some(b => b.dataset.ksPatientAction === 'editar'), 'perfil sem cadastro não recebe atalho');
  await denied.context.executarAcaoPacienteCard('editar', denied.a.id);
  assert.equal(denied.edits.length, 0, 'ação direta também respeita permissão');
  assert.equal(denied.routes.length, 0);
  f.select(null); await f.context.atualizarResumoPacienteContexto();
  assert.equal(f.summary.hidden, true);
  assert.equal(f.added.length, 0, 'sem paciente não permanece ação antiga');
  const failed = fixture();
  await failed.context.atualizarResumoPacienteContexto(); failed.context.vincularAcoesProntuario();
  const failButton = failed.added.find(b => b.dataset.ksPatientAction === 'editar');
  failed.context.editarCadastro = async () => { throw Error('Falha sintética'); };
  failed.context.console = { error() {} };
  await failed.listeners.click({ target: { closest: selector => selector.includes('close') ? null : failButton }, preventDefault() {}, stopPropagation() {} });
  assert.equal(failButton.disabled, false, 'falha permite tentar novamente');
  assert.equal(failed.notices.length, 1);
  assert(fs.readFileSync('index.html', 'utf8').includes('20261023-editar-cadastro-resumo-r1'), 'navegadores recebem o botão após atualização');
  console.log('PASS: editar cadastro pelo prontuário ativo; identidade, formulário canônico, permissões, remontagem, erro e cache.');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
