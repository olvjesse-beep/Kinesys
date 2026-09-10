'use strict';
const fs=require('fs');
const assert=require('assert');
const src=fs.readFileSync('script-1.18.0.js','utf8');

assert.match(src,/async function obterPacientesBasicos\(\)/,'lightweight patient index must exist');
assert.match(src,/async function obterPacienteCompletoPorId\(id\)/,'single-chart loader must exist');
assert.match(src,/KINESYS_CAMPOS_PACIENTE_BASICO/,'explicit lightweight field contract must exist');

const basicStart=src.indexOf('async function consultarPacientesBasicosNaNuvem()');
const basicEnd=src.indexOf('async function obterPacientesBasicos()',basicStart);
const basicBlock=src.slice(basicStart,basicEnd);
assert.doesNotMatch(basicBlock,/avaliacoes\(\*\)|evolucoes\(\*\)/,'lightweight index cannot embed clinical histories');

const oneStart=src.indexOf('async function obterPacienteCompletoPorId(id)');
const oneEnd=src.indexOf('async function obterPacientesSalvos()',oneStart);
const oneBlock=src.slice(oneStart,oneEnd);
assert.match(oneBlock,/\.eq\('id', chave\)/,'single-chart loader must filter by patient id');
assert.match(oneBlock,/\.maybeSingle\(\)/,'single-chart loader must request one patient');
assert.match(oneBlock,/avaliacoes\(\*\), evolucoes\(\*\)/,'single-chart loader must preserve full clinical history for the selected patient');

for(const marker of [
  "async function renderizarPacientesRecentesHome()",
  "async function atualizarSelectsPacientes()",
  "async function popularSelectCRM()",
  "async function popularSelectMidiasPaciente(preSelecionado = '')"
]){
  const pos=src.indexOf(marker);
  assert.ok(pos>=0,`${marker} must exist`);
  const chunk=src.slice(pos,pos+1800);
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

const oldAllHistory=(src.match(/\.from\('pacientes'\)\s*\n\s*\.select\('\*, avaliacoes\(\*\), evolucoes\(\*\)'\)/g)||[]).length;
assert.strictEqual(oldAllHistory,2,'full-history patient query must exist only in selected-chart loader and legacy compatibility loader');

console.log('Data Loading contract Phase 3A: lightweight index + selected full chart are separated.');
