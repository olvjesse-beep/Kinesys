'use strict';
const fs=require('fs');
const assert=require('assert');

const agenda=fs.readFileSync('agenda-1.20.0.js','utf8');

assert.match(agenda,/const AGENDA_SEMANA_CACHE_TTL_MS\s*=\s*5000\s*;/,'Agenda week cache must use a short 5s TTL');
assert.match(agenda,/function chaveCacheAgendaSemana\(inicio, fim, profissionalEscopo = ''\)/,'Agenda week cache key helper must exist');
assert.match(agenda,/function prefixoCacheAgendaSemanaAtual\(\)/,'Agenda week cache prefix helper must exist');
assert.match(agenda,/function invalidarCacheAgendaSemana\(\)/,'Agenda week invalidation helper must exist');
assert.match(agenda,/usuarioLogado\?\.id/,'Agenda cache must be scoped by active profile');
assert.match(agenda,/usuarioLogado\?\.clinica_id/,'Agenda cache must be scoped by active clinic');

const loadStart=agenda.indexOf("async function carregarAgendamentosSemana(inicio, fim, profissionalEscopo = '')");
const loadEnd=agenda.indexOf('function renderizarGradeSemanal',loadStart);
assert.ok(loadStart>=0&&loadEnd>loadStart,'Agenda week loader must exist');
const load=agenda.slice(loadStart,loadEnd);
assert.match(load,/const buscarSemanaNuvem = async \(\) =>/,'Agenda week loader must isolate the cloud fetcher');
assert.match(load,/window\.KineSysDataCache\?\.get/,'Agenda week loader must use central data cache when available');
assert.match(load,/key:chaveCacheAgendaSemana\(inicio, fim, profissionalEscopo\)/,'Agenda week cache key must include range and professional scope');
assert.match(load,/ttl:AGENDA_SEMANA_CACHE_TTL_MS/,'Agenda week loader must apply the 5s TTL');
assert.match(load,/fetcher:buscarSemanaNuvem/,'Agenda cache miss must preserve the real Supabase fetcher');
assert.match(load,/clonarAgendamentosAgenda\(dadosNuvem\)/,'cached cloud rows must be cloned before local enrichment');
assert.match(load,/mesclarAgendamentosPendentesNaAgenda/,'local pending appointments must still be merged on every read');
assert.match(load,/if \(!_supabase\)[\s\S]*?somenteLocal/,'offline/local-only fallback must happen before cloud caching');

const editStart=agenda.indexOf('async function salvarEdicaoAtendimentoAtual');
const editEnd=agenda.indexOf('async function salvarAgendamento()',editStart);
assert.match(agenda.slice(editStart,editEnd),/invalidarCacheAgendaSemana\(\)/,'editing an appointment must invalidate week cache');

const saveStart=agenda.indexOf('async function salvarAgendamento()');
const saveEnd=agenda.indexOf('async function abrirDetalheAgendamento',saveStart);
assert.match(agenda.slice(saveStart,saveEnd),/invalidarCacheAgendaSemana\(\)/,'creating appointments must invalidate week cache before re-render');

const statusStart=agenda.indexOf("async function marcarStatusAgendamento(novoStatus, observacaoStatus = '')");
const statusEnd=agenda.indexOf('async function cancelarAgendamentoAtual',statusStart);
assert.match(agenda.slice(statusStart,statusEnd),/invalidarCacheAgendaSemana\(\)/,'status changes must invalidate week cache');

const planStart=agenda.indexOf('async function vincularPlanoAgendamentoAtual()');
const planEnd=agenda.indexOf("async function marcarStatusAgendamento",planStart);
assert.match(agenda.slice(planStart,planEnd),/invalidarCacheAgendaSemana\(\)/,'plan-link changes must invalidate week cache');

const syncStart=agenda.indexOf('async function sincronizarAgendamentosPendentes');
const syncEnd=agenda.indexOf('function configurarSincronizacaoConfiavelAgenda',syncStart);
assert.match(agenda.slice(syncStart,syncEnd),/if \(sincronizados > 0\) invalidarCacheAgendaSemana\(\);/,'successful background sync must invalidate week cache');

const conflictStart=agenda.indexOf('async function existeConflitoImediato');
assert.ok(conflictStart>=0,'immediate conflict checker must exist');
const conflict=agenda.slice(conflictStart,conflictStart+1300);
assert.doesNotMatch(conflict,/KineSysDataCache/,'immediate conflict checks must never rely on the week TTL cache');

console.log('Agenda Cache Phase 1B: 5s scoped week cache, cloning and surgical invalidation approved; conflict checks remain live.');
