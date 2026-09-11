'use strict';
const fs=require('fs');
const assert=require('assert');

const html=fs.readFileSync('index.html','utf8');
const app=fs.readFileSync('script-1.18.0.js','utf8');
const patient=fs.readFileSync('patient_index_cache_core-1.0.0.js','utf8');
const chart=fs.readFileSync('patient_chart_read_core-1.0.0.js','utf8');

const cachePos=html.indexOf('kinesys_data_cache-1.0.0.js');
const patientPos=html.indexOf('patient_index_cache_core-1.0.0.js');
const appPos=html.indexOf('script-1.18.0.js');
const chartPos=html.indexOf('patient_chart_read_core-1.0.0.js');
assert.ok(cachePos>=0,'data cache core must be loaded by index');
assert.ok(patientPos>cachePos,'patient index cache module must load after central data cache');
assert.ok(appPos>patientPos,'patient index cache module must load before the main application');
assert.ok(chartPos>appPos,'full-chart read module must load after the main core dependencies');

assert.match(patient,/const KINESYS_PACIENTES_BASICOS_CACHE_TTL_MS\s*=\s*15000\s*;/,'patient basic index must use the approved short TTL');
assert.match(patient,/function chaveCachePacientesBasicos\(\)[\s\S]{0,400}usuarioLogado\?\.id/,'patient cache key must be scoped by active profile');
assert.match(patient,/function invalidarCachePacientesBasicos\(\)/,'patient cache invalidation helper must exist');
assert.doesNotMatch(app,/KINESYS_PACIENTES_BASICOS_CACHE_TTL_MS/,'patient cache implementation must not be duplicated in the main core');

const basicStart=patient.indexOf('async function obterPacientesBasicos()');
assert.ok(basicStart>=0,'lightweight patient loader block must exist in the dedicated module');
const basicBlock=patient.slice(basicStart);
assert.match(basicBlock,/KineSysDataCache\?\.get/,'lightweight patient loader must use central data cache when available');
assert.match(basicBlock,/key:chaveCachePacientesBasicos\(\)/,'lightweight patient loader must use session-scoped cache key');
assert.match(basicBlock,/ttl:KINESYS_PACIENTES_BASICOS_CACHE_TTL_MS/,'lightweight patient loader must use short TTL');
assert.match(basicBlock,/fetcher:carregar/,'cache miss must preserve the existing lightweight fetcher');
assert.match(basicBlock,/pacientesBasicosEmCurso/,'legacy in-flight fallback must remain available if cache core is unavailable');

const fullStart=chart.indexOf('async function obterPacienteCompletoPorId(id)');
const fullEnd=chart.indexOf('async function obterPacientesSalvos()',fullStart);
assert.ok(fullStart>=0&&fullEnd>fullStart,'selected full-chart loader block must exist in its read module');
const fullBlock=chart.slice(fullStart,fullEnd);
assert.doesNotMatch(fullBlock,/KineSysDataCache/,'full clinical chart must not be TTL-cached');
assert.doesNotMatch(chart,/KINESYS_PACIENTES_BASICOS_CACHE_TTL_MS|ttl\s*:/,'full-chart read module must remain TTL-free');
assert.doesNotMatch(app,/async function obterPacienteCompletoPorId\(id\)/,'full chart implementation must not remain duplicated in the main core');

const saveStart=app.indexOf('async function salvarPacienteNaNuvem(pacienteObjeto, opcoes = {})');
assert.ok(saveStart>=0,'patient cloud save must exist');
assert.match(app.slice(saveStart,saveStart+700),/invalidarCachePacientesBasicos\(\)/,'patient save must invalidate lightweight index before mutation');

const deleteStart=app.indexOf('async function excluirPaciente(id)');
assert.ok(deleteStart>=0,'patient deletion must exist');
assert.match(app.slice(deleteStart,deleteStart+700),/invalidarCachePacientesBasicos\(\)/,'patient deletion must force a fresh lightweight index');

console.log('Data Cache integration: lightweight index remains cached for 15s while full clinical charts remain TTL-free after Phase 4J extraction.');
