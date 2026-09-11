'use strict';
const fs=require('fs');
const assert=require('assert');

const html=fs.readFileSync('index.html','utf8');
const app=fs.readFileSync('script-1.18.0.js','utf8');

const cachePos=html.indexOf('kinesys_data_cache-1.0.0.js');
const appPos=html.indexOf('script-1.18.0.js');
assert.ok(cachePos>=0,'data cache core must be loaded by index');
assert.ok(appPos>cachePos,'data cache core must load before the main application');

assert.match(app,/const KINESYS_PACIENTES_BASICOS_CACHE_TTL_MS\s*=\s*15000\s*;/,'patient basic index must use the approved short TTL');
assert.match(app,/function chaveCachePacientesBasicos\(\)[\s\S]{0,400}usuarioLogado\?\.id/,'patient cache key must be scoped by active profile');
assert.match(app,/function invalidarCachePacientesBasicos\(\)/,'patient cache invalidation helper must exist');

const basicStart=app.indexOf('async function obterPacientesBasicos()');
const basicEnd=app.indexOf('async function obterPacienteCompletoPorId(id)',basicStart);
assert.ok(basicStart>=0&&basicEnd>basicStart,'lightweight patient loader block must exist');
const basicBlock=app.slice(basicStart,basicEnd);
assert.match(basicBlock,/KineSysDataCache\?\.get/,'lightweight patient loader must use central data cache when available');
assert.match(basicBlock,/key:chaveCachePacientesBasicos\(\)/,'lightweight patient loader must use session-scoped cache key');
assert.match(basicBlock,/ttl:KINESYS_PACIENTES_BASICOS_CACHE_TTL_MS/,'lightweight patient loader must use short TTL');
assert.match(basicBlock,/fetcher:carregar/,'cache miss must preserve the existing lightweight fetcher');
assert.match(basicBlock,/pacientesBasicosEmCurso/,'legacy in-flight fallback must remain available if cache core is unavailable');

const fullStart=basicEnd;
const fullEnd=app.indexOf('async function obterPacientesSalvos()',fullStart);
const fullBlock=app.slice(fullStart,fullEnd);
assert.doesNotMatch(fullBlock,/KineSysDataCache/,'full clinical chart must not be TTL-cached in Phase 1A');

const saveStart=app.indexOf('async function salvarPacienteNaNuvem(pacienteObjeto, opcoes = {})');
assert.ok(saveStart>=0,'patient cloud save must exist');
assert.match(app.slice(saveStart,saveStart+700),/invalidarCachePacientesBasicos\(\)/,'patient save must invalidate lightweight index before mutation');

const deleteStart=app.indexOf('async function excluirPaciente(id)');
assert.ok(deleteStart>=0,'patient deletion must exist');
assert.match(app.slice(deleteStart,deleteStart+700),/invalidarCachePacientesBasicos\(\)/,'patient deletion must force a fresh lightweight index');

console.log('Data Cache integration Phase 1A: lightweight patient index uses a 15s session-scoped cache with mutation invalidation; full charts remain uncached.');
