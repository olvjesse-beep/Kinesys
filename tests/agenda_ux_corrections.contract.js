'use strict';

const fs = require('fs');
const assert = require('assert');

const agenda = fs.readFileSync('agenda-1.20.0.js', 'utf8');
const html = fs.readFileSync('index.html', 'utf8');
const loader = fs.readFileSync('screen_loader-1.25.0.js', 'utf8');

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

// Busca de paciente: nenhum carregamento visual de toda a base ao abrir o modal.
assert.match(html, /id="ag_paciente_busca"[^>]*type="search"[^>]*oninput="filtrarPacientesAgendamento\(this\.value\)"/,
  'Modal deve possuir campo de busca incremental de paciente');
assert.match(html, /id="ag_paciente_busca_status"[^>]*aria-live="polite"/,
  'Busca deve expor status acessível');
assert.match(abrir, /prepararBuscaPacienteAgendamento\(pacientes, atendimentoEdicao\?\.paciente_id \|\| ''\)/,
  'Abertura deve preparar busca sem popular todos os pacientes');
assert.doesNotMatch(abrir, /pacientes\.map\(p => `<option/,
  'Abertura não pode renderizar toda a base de pacientes no select');
assert.match(busca, /\.startsWith\(termoNormalizado\)/,
  'Filtro deve carregar pacientes conforme o início digitado');
assert.match(busca, /localeCompare\([^\n]*'pt-BR'[^\n]*sensitivity:\s*'base'/,
  'Resultados devem ficar em ordem alfabética pt-BR');
assert.match(busca, /if \(!termoNormalizado && !preservarId\)/,
  'Sem termo digitado o select deve permanecer sem a lista completa');

// Retroativo: o relógio não elimina horários passados; conflitos/bloqueios/jornada permanecem no mesmo fluxo.
assert.doesNotMatch(slots, /fimSlot\s*<=\s*minutoAtual|ehHoje|horário já passou/,
  'Slots passados de hoje devem continuar selecionáveis');
assert.doesNotMatch(recorrencia, /horário já passou|minutoAtual|hojeISO/,
  'Validação de recorrência não deve rejeitar horário apenas por já ter passado');
assert.match(slots, /bloqueiosAgendaPara/,'Bloqueios continuam protegidos');
assert.match(slots, /statusAgendaOcupaHorario/,'Conflitos existentes continuam protegidos');
assert.match(recorrencia, /intervaloDentroDaJornadaPadrao/,'Jornada continua protegida');

// Edição: mesmo id, agora permitindo data + hora + procedimento + profissional.
assert.match(detalhe, /id="btn_editar_atendimento"[^>]*onclick="editarAgendamentoAtual\(\)"[^>]*>Editar agendamento<\/button>/,
  'Detalhe deve oferecer botão explícito Editar agendamento');
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
assert.match(html,/screen_loader-1\.25\.0\.js\?v=20260910-phase4d-r1&agenda_edit=20260911-r2/,
  'Index deve invalidar cache do Screen Loader para as correções da Agenda');
assert.match(loader,/agenda-1\.20\.0\.js\?v=20260911-agenda-edit-r2/,
  'Screen Loader deve entregar a Agenda corrigida');
assert.doesNotMatch(html,/<script[^>]+agenda-1\.20\.0\.js/i,'Agenda deve permanecer lazy');
assert.match(loader,/const VERSION='1\.25\.4-phase4d';/,'Versão contratual do Screen Loader deve permanecer intacta');

console.log('Agenda UX corrections contract: OK');
