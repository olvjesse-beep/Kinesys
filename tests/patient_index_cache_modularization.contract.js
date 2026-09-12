'use strict';
const fs=require('fs');
const assert=require('assert');

const html=fs.readFileSync('index.html','utf8');
const core=fs.readFileSync('src/core/script-1.18.0.js','utf8');
const patient=fs.readFileSync('src/patient/patient_index_cache_core-1.0.0.js','utf8');
const chart=fs.readFileSync('src/patient/patient_chart_read_core-1.0.0.js','utf8');
const deletion=fs.readFileSync('src/patient/patient_deletion_core-1.0.0.js','utf8');

assert.doesNotMatch(core,/async function obterPacientesBasicos\(\)/,'lightweight patient cache loader must leave the monolithic core');
assert.doesNotMatch(core,/function chaveCachePacientesBasicos\(\)/,'patient cache key helper must leave the monolithic core');
assert.doesNotMatch(core,/function lerPacientesLocaisComSeguranca\(\)/,'safe local patient reader must belong to the patient cache module');
assert.doesNotMatch(core,/KINESYS_PACIENTES_BASICOS_CACHE_TTL_MS/,'patient cache TTL must not be duplicated in the monolithic core');

assert.match(patient,/function lerPacientesLocaisComSeguranca\(\)/,'safe local patient fallback must remain available');
assert.match(patient,/const KINESYS_PACIENTES_BASICOS_CACHE_TTL_MS\s*=\s*15000\s*;/,'approved patient TTL must remain 15 seconds');
assert.match(patient,/function chaveCachePacientesBasicos\(\)[\s\S]{0,400}usuarioLogado\?\.id/,'cache key must remain scoped by active profile');
assert.match(patient,/function invalidarCachePacientesBasicos\(\)/,'mutation invalidation helper must remain public');
assert.match(patient,/async function consultarPacientesBasicosNaNuvem\(\)/,'lightweight cloud query must remain in the module');
assert.match(patient,/async function obterPacientesBasicos\(\)/,'historical lightweight patient API must remain available');
assert.match(patient,/KineSysDataCache\?\.get/,'patient index must keep using the central in-memory cache');
assert.match(patient,/key:chaveCachePacientesBasicos\(\)/,'patient index must preserve the cache key');
assert.match(patient,/ttl:KINESYS_PACIENTES_BASICOS_CACHE_TTL_MS/,'patient index must preserve the short TTL');
assert.match(patient,/pacientesBasicosEmCurso/,'in-flight fallback must remain if the central cache is unavailable');
assert.doesNotMatch(patient,/pacientesCompletosEmCurso/,'full-chart in-flight state belongs to the dedicated chart read layer after Phase 4J');
assert.doesNotMatch(patient,/\.select\('\*, avaliacoes\(\*\), evolucoes\(\*\)'\)/,'patient index module must not fetch full clinical histories');

assert.match(chart,/const pacientesCompletosEmCurso = new Map\(\);/,'selected full-chart in-flight dedup state must remain available in the chart read layer');
assert.match(chart,/async function obterPacienteCompletoPorId\(id\)/,'selected full-chart loader must remain available');
const fullStart=chart.indexOf('async function obterPacienteCompletoPorId(id)');
const fullEnd=chart.indexOf('async function obterPacientesSalvos()',fullStart);
const fullBlock=chart.slice(fullStart,fullEnd);
assert.doesNotMatch(fullBlock,/KineSysDataCache/,'full clinical charts must remain outside TTL cache');

const cachePos=html.indexOf('src/core/kinesys_data_cache-1.0.0.js');
const patientPos=html.indexOf('src/patient/patient_index_cache_core-1.0.0.js');
const corePos=html.indexOf('src/core/script-1.18.0.js');
assert.ok(cachePos>=0&&patientPos>cachePos&&corePos>patientPos,'Phase 4I load order must remain central cache -> patient index cache -> main core');

const saveStart=core.indexOf('async function salvarPacienteNaNuvem(pacienteObjeto, opcoes = {})');
assert.ok(saveStart>=0,'patient cloud save must remain in core');
assert.match(core.slice(saveStart,saveStart+700),/invalidarCachePacientesBasicos\(\)/,'patient save must still invalidate the lightweight cache before mutation');
assert.doesNotMatch(core,/async function excluirPaciente\(id\)/,'patient deletion must leave the monolithic core after Phase 4M');
const deleteStart=deletion.indexOf('async function excluirPaciente(id)');
assert.ok(deleteStart>=0,'patient deletion must remain available in the dedicated Phase 4M module');
assert.match(deletion.slice(deleteStart,deleteStart+900),/invalidarCachePacientesBasicos\(\)/,'patient deletion must still invalidate the lightweight cache');

console.log('Core Modularization Phase 4I: lightweight patient index/cache contracts remain preserved after Phase 4M.');
