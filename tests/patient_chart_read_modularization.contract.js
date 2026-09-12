'use strict';
const fs=require('fs');
const assert=require('assert');

const html=fs.readFileSync('index.html','utf8');
const core=fs.readFileSync('src/core/script-1.18.0.js','utf8');
const indexCache=fs.readFileSync('src/patient/patient_index_cache_core-1.0.0.js','utf8');
const chart=fs.readFileSync('src/patient/patient_chart_read_core-1.0.0.js','utf8');

for(const fn of ['instanteRegistroClinico','mesclarRegistrosCloudLocal','mesclarPacienteCloudLocal','obterPacienteCompletoPorId','obterPacientesSalvos']) {
  assert(!core.includes(`function ${fn}(`)&&!core.includes(`async function ${fn}(`),`declaração ${fn} permaneceu no monólito`);
  assert(chart.includes(`function ${fn}(`)||chart.includes(`async function ${fn}(`),`módulo perdeu ${fn}`);
}

assert.doesNotMatch(indexCache,/pacientesCompletosEmCurso/,'estado de deduplicação do prontuário completo não deve permanecer no índice leve');
assert.match(chart,/const pacientesCompletosEmCurso = new Map\(\);/,'módulo deve preservar deduplicação em voo por prontuário');
assert.match(chart,/pacientesCompletosEmCurso\.has\(chave\)/,'loader individual deve reutilizar requisição em voo');
assert.match(chart,/pacientesCompletosEmCurso\.delete\(chave\)/,'deduplicação em voo deve ser liberada ao concluir');

const oneStart=chart.indexOf('async function obterPacienteCompletoPorId(id)');
const allStart=chart.indexOf('async function obterPacientesSalvos()',oneStart);
assert.ok(oneStart>=0&&allStart>oneStart,'loaders clínicos devem existir no módulo em ordem histórica');
const oneBlock=chart.slice(oneStart,allStart);
assert.match(oneBlock,/\.select\('\*, avaliacoes\(\*\), evolucoes\(\*\)'\)/,'loader individual deve preservar histórico clínico completo');
assert.match(oneBlock,/\.eq\('id', chave\)/,'loader individual deve continuar filtrado por paciente');
assert.match(oneBlock,/\.maybeSingle\(\)/,'loader individual deve continuar retornando um prontuário');
assert.doesNotMatch(oneBlock,/KineSysDataCache/,'prontuário completo não pode ganhar cache TTL');

const allBlock=chart.slice(allStart);
assert.match(allBlock,/\.select\('\*, avaliacoes\(\*\), evolucoes\(\*\)'\)/,'loader legado deve preservar consulta completa existente');
assert.doesNotMatch(allBlock,/KineSysDataCache/,'loader legado de prontuários completos não pode ganhar cache TTL');
assert.match(chart,/lerPacientesLocaisComSeguranca\(\)/,'fallback local preservado');
assert.match(chart,/normalizarPacienteDoBanco/,'normalização histórica preservada');
assert.match(chart,/window\.obterPacienteCompletoPorId = obterPacienteCompletoPorId/,'API individual deve permanecer disponível via window');
assert.match(chart,/window\.obterPacientesSalvos = obterPacientesSalvos/,'API legada deve permanecer disponível via window');

const indexPos=html.indexOf('src/patient/patient_index_cache_core-1.0.0.js');
const corePos=html.indexOf('src/core/script-1.18.0.js');
const chartPos=html.indexOf('src/patient/patient_chart_read_core-1.0.0.js');
const screenPos=html.indexOf('src/ui/screen_loader-1.25.0.js');
assert.ok(indexPos>=0&&corePos>indexPos,'índice leve deve continuar antes do core');
assert.ok(chartPos>corePos,'módulo de prontuário deve carregar após o core que fornece normalização e Supabase');
assert.ok(screenPos>chartPos,'módulo de prontuário deve estar disponível antes dos módulos operacionais lazy');
assert.match(html,/core_mod=20260911-phase4[a-z]+-r\d+/,'cache-bust do core deve acompanhar a modularização corrente após 4J');

console.log('Core Modularization Phase 4J: full patient chart read layer extracted without TTL cache or query changes.');
