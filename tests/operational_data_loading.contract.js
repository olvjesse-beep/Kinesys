'use strict';
const fs=require('fs');
const assert=require('assert');

const agenda=fs.readFileSync('src/agenda/agenda-1.20.0.js','utf8');
const notificacoesAgenda=fs.readFileSync('src/agenda/agenda_notificacoes_core-1.20.1.js','utf8');
const financeiro=fs.readFileSync('src/finance/financeiro-1.19.0.js','utf8');

assert.match(agenda,/async function obterPacientesBasicosAgenda\(\)/,'Agenda must expose a lightweight patient adapter');
assert.match(agenda,/typeof obterPacientesBasicos === ['"]function['"]/,'Agenda adapter must prefer the lightweight global patient index');

const directHeavyAgenda=(agenda.match(/const pacientes = await obterPacientesSalvos\(\);/g)||[]).length;
assert.strictEqual(directHeavyAgenda,0,'Agenda selectors must not directly load every full patient chart');
const lightweightAgenda=(agenda.match(/const pacientes = await obterPacientesBasicosAgenda\(\);/g)||[]).length;
assert.strictEqual(lightweightAgenda,2,'Agenda appointment and waiting-list selectors must use lightweight patient data');

const notifStart=notificacoesAgenda.indexOf('function iniciarNotificacoesAgenda()');
assert.ok(notifStart>=0,'Agenda notification lifecycle must exist in the eager notification core');
const notifChunk=notificacoesAgenda.slice(notifStart,notifStart+1800);
assert.match(notifChunk,/visibilityState === ['"]hidden['"]/, 'Agenda initial notification refresh must skip hidden tabs');
assert.match(notifChunk,/visibilityState !== ['"]visible['"]/, 'Agenda notification interval must stop work outside visible tabs');
assert.doesNotMatch(agenda,/function iniciarNotificacoesAgenda\(\)/,'Heavy Agenda module must not duplicate the global notification lifecycle');

const syncTimer=agenda.indexOf('agendaSyncTimer = setInterval');
assert.ok(syncTimer>=0,'Agenda reliable-sync timer must exist');
const syncChunk=agenda.slice(syncTimer,syncTimer+600);
assert.match(syncChunk,/visibilityState !== ['"]visible['"]/, 'Agenda sync interval must stop work outside visible tabs');

const finStart=financeiro.indexOf("async function popularPacientesFinanceiro(preSelecionado = '')");
assert.ok(finStart>=0,'Finance patient selector must exist');
const finChunk=financeiro.slice(finStart,finStart+850);
assert.match(finChunk,/obterPacientesBasicos\(\)/,'Finance patient selector must prefer lightweight patient data');
assert.doesNotMatch(finChunk,/avaliacoes\(\*\)|evolucoes\(\*\)/,'Finance selector cannot request clinical histories');

const weekStart=agenda.indexOf('async function carregarAgendamentosSemana');
const weekEnd=agenda.indexOf('function renderizarGradeSemanal',weekStart);
assert.ok(weekStart>=0&&weekEnd>weekStart,'Agenda week loader must exist');
const weekChunk=agenda.slice(weekStart,weekEnd);
assert.doesNotMatch(weekChunk,/pacientes\(\*\)/,'Agenda week query must not request every patient column');
assert.match(agenda,/AGENDA_SELECT_SEMANA = ['"][^'"]*pacientes\(id,nome,telefone,dependente,responsavel_nome,responsavel_parentesco,responsavel_telefone\)/,'Agenda week query must request only patient identity/contact fields');
assert.match(agenda,/AGENDA_SELECT_SEMANA_LEGADO/,'Agenda must retain a legacy patient-contact select');
assert.match(weekChunk,/AGENDA_SELECT_SEMANA/,'Agenda week loader must use the explicit relation contract');
assert.match(agenda,/agendaContatoResponsavelDisponivel/,'Agenda must cache schema compatibility after a legacy fallback');

console.log('Operational Data Loading contract Phase 4B: Agenda/Finance selectors remain lightweight, notification polling sleeps when hidden from the eager core, and Agenda week joins only required patient fields.');
