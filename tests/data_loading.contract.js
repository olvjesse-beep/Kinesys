'use strict';
const fs=require('fs');
const assert=require('assert');
const src=fs.readFileSync('script-1.18.0.js','utf8');
const patient=fs.readFileSync('patient_index_cache_core-1.0.0.js','utf8');
const chart=fs.readFileSync('patient_chart_read_core-1.0.0.js','utf8');
const media=fs.readFileSync('midias_core-1.0.0.js','utf8');
const crm=fs.readFileSync('crm_relationship_core-1.0.0.js','utf8');
const runtime=patient+'\n'+src+'\n'+chart+'\n'+media+'\n'+crm;

assert.match(patient,/async function obterPacientesBasicos\(\)/,'lightweight patient index must exist in its dedicated module');
assert.match(chart,/async function obterPacienteCompletoPorId\(id\)/,'single-chart loader must exist in its dedicated read module');
assert.match(patient,/KINESYS_CAMPOS_PACIENTE_BASICO/,'explicit lightweight field contract must exist');
assert.doesNotMatch(src,/async function obterPacientesBasicos\(\)/,'lightweight patient index must not be duplicated in the monolithic core');
assert.doesNotMatch(src,/async function obterPacienteCompletoPorId\(id\)/,'single-chart loader must not be duplicated in the monolithic core');

const basicStart=patient.indexOf('async function consultarPacientesBasicosNaNuvem()');
const basicEnd=patient.indexOf('async function obterPacientesBasicos()',basicStart);
const basicBlock=patient.slice(basicStart,basicEnd);
assert.doesNotMatch(basicBlock,/avaliacoes\(\*\)|evolucoes\(\*\)/,'lightweight index cannot embed clinical histories');

const oneStart=chart.indexOf('async function obterPacienteCompletoPorId(id)');
const oneEnd=chart.indexOf('async function obterPacientesSalvos()',oneStart);
const oneBlock=chart.slice(oneStart,oneEnd);
assert.match(oneBlock,/\.eq\('id', chave\)/,'single-chart loader must filter by patient id');
assert.match(oneBlock,/\.maybeSingle\(\)/,'single-chart loader must request one patient');
assert.match(oneBlock,/avaliacoes\(\*\), evolucoes\(\*\)/,'single-chart loader must preserve full clinical history for the selected patient');

for(const marker of [
  "async function renderizarPacientesRecentesHome()",
  "async function atualizarSelectsPacientes()",
  "async function popularSelectCRM()",
  "async function popularSelectMidiasPaciente(preSelecionado = '')"
]){
  const pos=runtime.indexOf(marker);
  assert.ok(pos>=0,`${marker} must exist`);
  const chunk=runtime.slice(pos,pos+1800);
  assert.match(chunk,/obterPacientesBasicos\(\)/,`${marker} must use lightweight patient data`);
}

for(const marker of [
  "async function carregarPacienteParaEdicao(id, avaliacaoIdEditar = null)",
  "async function editarAvaliacaoClinica(pacienteId, avaliacaoId)",
  "async function carregarHistoricoEvolucao()"
]){
  const pos=src.indexOf(marker);
  assert.ok(pos>=0,`${marker} must exist`);
  const chunk=src.slice(pos,pos+2600);
  assert.match(chunk,/obterPacienteCompletoPorId\(/,`${marker} must load only the selected full chart`);
}

const fullHistoryQueries=(chart.match(/\.from\('pacientes'\)\s*\n\s*\.select\('\*, avaliacoes\(\*\), evolucoes\(\*\)'\)/g)||[]).length;
assert.strictEqual(fullHistoryQueries,2,'full-history patient query must exist only in selected-chart loader and legacy compatibility loader');
assert.doesNotMatch(src,/\.from\('pacientes'\)\s*\n\s*\.select\('\*, avaliacoes\(\*\), evolucoes\(\*\)'\)/,'full-history read queries must leave the monolithic core');

console.log('Data Loading contract: lightweight index + full-chart read module remain separated across the modular runtime.');
