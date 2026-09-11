'use strict';

const fs = require('fs');
const assert = require('assert');

const agenda = fs.readFileSync('agenda-1.20.0.js', 'utf8');
const html = fs.readFileSync('index.html', 'utf8');
const loader = fs.readFileSync('screen_loader-1.25.0.js', 'utf8');
const agendaCss = fs.readFileSync('design_agenda.css', 'utf8');

function trechoEntre(inicio, fim) {
  const a = agenda.indexOf(inicio);
  const b = agenda.indexOf(fim, a + inicio.length);
  assert.ok(a >= 0, `início não encontrado: ${inicio}`);
  assert.ok(b > a, `fim não encontrado depois de ${inicio}: ${fim}`);
  return agenda.slice(a, b);
}

const busca = trechoEntre('function normalizarBuscaPacienteAgenda', '\n// Status oficiais da Agenda');
const abrir = trechoEntre('async function abrirModalAgendamento', '\nasync function oferecerExcecaoJornadaProfissionalModal');
const slots = trechoEntre('function calcularSlotsLivres', '\nfunction diasVisiveisDaSemana');
const recorrencia = trechoEntre('function intervaloDisponivelNaJornadaRecorrencia', '\nasync function analisarDatasRecorrenciaAgenda');
const configurar = trechoEntre('function configurarModalEdicaoAtendimento', '\nasync function abrirModalAgendamento');
const editar = trechoEntre('async function salvarEdicaoAtendimentoAtual', '\nasync function salvarAgendamento');
const detalhe = trechoEntre('async function abrirDetalheAgendamento', '\nasync function editarAgendamentoAtual');

// Busca de paciente: um único campo funciona como entrada + seleção via lista suspensa.
const inputBusca = html.match(/<input[^>]*id="ag_paciente_busca"[^>]*>/)?.[0] || '';
assert.match(inputBusca, /type="search"/,'Busca de paciente deve usar input search');
assert.match(inputBusca, /role="combobox"/,'Busca de paciente deve expor semântica de combobox');
assert.match(inputBusca, /aria-controls="ag_paciente_sugestoes"/,'Combobox deve controlar a lista de sugestões');
assert.match(inputBusca, /oninput="aoDigitarPacienteAgendamento\(this\.value\)"/,
  'Busca de paciente deve reagir à digitação no mesmo campo');
assert.match(inputBusca, /onkeydown="aoTeclarBuscaPacienteAgendamento\(event\)"/,
  'Busca deve suportar teclado na lista de sugestões');
assert.match(html, /<input[^>]*type="hidden"[^>]*id="ag_paciente_select"[^>]*>/,
  'ID do paciente deve ser preservado em campo oculto para compatibilidade');
assert.doesNotMatch(html, /<select[^>]*id="ag_paciente_select"/,
  'Não pode existir um segundo seletor visual de paciente');
assert.match(html, /id="ag_paciente_sugestoes"[^>]*role="listbox"/,
  'Sugestões devem aparecer em uma lista suspensa acessível');
assert.match(html, /id="ag_paciente_busca_status"[^>]*aria-live="polite"/,
  'Busca deve expor status acessível');
assert.match(abrir, /prepararBuscaPacienteAgendamento\(pacientes, atendimentoEdicao\?\.paciente_id \|\| ''\)/,
  'Abertura deve preparar o autocomplete sem popular a interface com toda a base');
assert.doesNotMatch(abrir, /pacientes\.map\(p => `<option/,
  'Abertura não pode renderizar toda a base de pacientes em select');
assert.match(busca, /\.includes\(termoNormalizado\)/,
  'Filtro deve encontrar o trecho digitado em qualquer posição do nome');
assert.doesNotMatch(busca, /\.startsWith\(termoNormalizado\)/,
  'Filtro não deve ficar limitado ao início do nome');
assert.match(busca, /localeCompare\([^\n]*'pt-BR'[^\n]*sensitivity:\s*'base'/,
  'Resultados devem ficar em ordem alfabética pt-BR');
assert.match(busca, /function selecionarPacienteAgendamento/,
  'Autocomplete deve possuir seleção explícita da sugestão');
assert.match(busca, /popularPlanosNoAgendamento\(selecionado\.value, procedimentoId\)/,
  'Selecionar paciente deve atualizar os vínculos financeiros do modal');
assert.match(busca, /ArrowDown/,'Autocomplete deve aceitar navegação por seta para baixo');
assert.match(busca, /ArrowUp/,'Autocomplete deve aceitar navegação por seta para cima');
assert.match(busca, /event\.key === 'Enter'/,'Autocomplete deve aceitar Enter para selecionar');

// Impeccable/KDS: modal menos poluído, alinhado e sem caixas concorrentes.
assert.match(html, /class="modal-box agenda-appointment-modal"/,
  'Modal deve usar o contrato visual específico do agendamento');
assert.match(agendaCss, /#modal_agendamento \.agenda-patient-suggestions\{/,
  'Autocomplete deve possuir camada flutuante própria no Design System');
assert.match(agendaCss, /\.agenda-finance-link\{[\s\S]*?border-top:1px solid var\(--kds-line-soft\)/,
  'Blocos financeiros devem usar divisores discretos em vez de caixas empilhadas');
assert.match(agendaCss, /\.agenda-recurrencia\{[\s\S]*?background:transparent/,
  'Recorrência deve manter superfície plana e hierarquia por divisor');
assert.match(agendaCss, /font-size:var\(--kds-font-field\)/,
  'Campos do modal devem usar a escala tipográfica oficial');
assert.doesNotMatch(agendaCss, /@media\s*\([^)]*(?:max|min)-width\s*:\s*600px/i,
  'Modal não pode criar breakpoint fora do contrato KDS');

// Retroativo: o relógio não elimina horários passados; conflitos/bloqueios/jornada permanecem no mesmo fluxo.
assert.doesNotMatch(slots, /fimSlot\s*<=\s*minutoAtual|ehHoje|horário já passou/,
  'Slots passados de hoje devem continuar selecionáveis');
assert.doesNotMatch(recorrencia, /horário já passou|minutoAtual|hojeISO/,
  'Validação de recorrência não deve rejeitar horário apenas por já ter passado');
assert.match(slots, /bloqueiosAgendaPara/,'Bloqueios continuam protegidos');
assert.match(slots, /statusAgendaOcupaHorario/,'Conflitos existentes continuam protegidos');
assert.match(recorrencia, /intervaloDentroDaJornadaPadrao/,'Jornada continua protegida');

// Edição: mesmo id, permitindo data + hora + procedimento + profissional sem trocar paciente.
assert.match(detalhe, /id="btn_editar_atendimento"[^>]*onclick="editarAgendamentoAtual\(\)"[^>]*>Editar agendamento<\/button>/,
  'Detalhe deve oferecer botão explícito Editar agendamento');
assert.match(configurar, /pacienteBusca\.disabled = editando/,'Busca de paciente deve ficar bloqueada no modo edição');
assert.match(configurar, /data\.disabled = false/,'Data deve permanecer editável no modo edição');
assert.match(configurar, /Data, Horário, Procedimento ou Profissional/,
  'Aviso de edição deve comunicar os quatro campos editáveis');
assert.match(editar, /async function salvarEdicaoAtendimentoAtual\(\{ profissionalId, procedimentoId, dataISO, horarioVal \}\)/,
  'Persistência de edição deve receber a nova data');
assert.match(editar, /existeConflitoImediato\(profissionalId, dataISO, horaInicio, horaFim, id\)/,
  'Conflito deve ser verificado na nova data ignorando apenas o próprio id');
assert.match(editar, /const alteracoes = \{[\s\S]*?\bdata:\s*dataISO[\s\S]*?\}/,
  'UPDATE deve incluir a nova data');
assert.match(editar, /\.eq\('id', id\)/,'UPDATE continua limitado ao mesmo id');
assert.doesNotMatch(editar, /\.insert\(|\.upsert\(/,'Edição não pode recriar o agendamento');

// Cache bust obrigatório mantendo Agenda lazy e Screen Loader contratual.
assert.match(html,/design_agenda\.css\?v=20260911-modal-r6/,
  'Index deve invalidar o CSS do modal corrigido');
assert.match(html,/screen_loader-1\.25\.0\.js\?v=20260910-phase4d-r1&agenda_edit=20260911-r3&agenda_compact=20260910-r2&agenda_patient=20260911-r1/,
  'Index deve invalidar cache do Screen Loader para o autocomplete');
assert.match(loader,/agenda-1\.20\.0\.js\?v=20260911-agenda-edit-r3&compact_time=20260910-r2&data_cache=20260911-r2&patient_autocomplete=20260911-r1/,
  'Screen Loader deve entregar a Agenda corrigida');
assert.doesNotMatch(html,/<script[^>]+agenda-1\.20\.0\.js/i,'Agenda deve permanecer lazy');
assert.match(loader,/const VERSION='1\.25\.4-phase4d';/,'Versão contratual do Screen Loader deve permanecer intacta');

console.log('Agenda UX corrections contract: autocomplete + modal polish OK');
