'use strict';
const fs=require('fs');
const assert=require('assert');

const html=fs.readFileSync('index.html','utf8');
const core=fs.readFileSync('script-1.18.0.js','utf8');
const mod=fs.readFileSync('patient_records_browse_core-1.0.0.js','utf8');
const design=fs.readFileSync('design_system-1.20.1.js','utf8');
const home=fs.readFileSync('home_detalhes-1.18.5.js','utf8');

for(const fn of ['renderizarTabelaProntuarios','filtrarPacientesSalvos','renderizarPacientesRecentesHome']){
  assert(!core.includes(`function ${fn}(`)&&!core.includes(`async function ${fn}(`),`declaração ${fn} permaneceu no monólito`);
  assert(mod.includes(`function ${fn}(`)||mod.includes(`async function ${fn}(`),`módulo perdeu ${fn}`);
  assert(mod.includes(`window.${fn} = ${fn};`),`API histórica ${fn} deve permanecer exposta via window`);
}

assert.match(mod,/typeof window\.renderProntuarioCardsKineSys === 'function'/,'fallback deve continuar delegando ao renderizador moderno quando disponível');
assert.match(mod,/return window\.renderProntuarioCardsKineSys\(filtro\)/,'filtro deve ser repassado ao renderizador moderno sem transformação');
assert.match(mod,/renderizador moderno de prontuários ainda não foi inicializado/,'aviso de fallback deve ser preservado');
assert.match(mod,/document\.getElementById\('input_busca_paciente'\)\?\.value \|\| ''/,'filtro histórico deve continuar lendo o campo de busca');
assert.match(mod,/await obterPacientesBasicos\(\)/,'recentes da Home devem continuar usando o índice leve de pacientes');
assert.match(mod,/lista\.slice\(-3\)\.reverse\(\)/,'fallback da Home deve continuar limitado aos 3 registros mais recentes');
assert.match(mod,/escapeHTML\(p\.dataCadastro\)/,'data do cadastro deve continuar escapada');
assert.match(mod,/escapeHTML\(p\.nome\)/,'nome deve continuar escapado');
assert.match(mod,/escapeHTML\(p\.profissao \|\| "-"\)/,'profissão deve continuar escapada');
assert.match(mod,/carregarPacienteParaEdicao\('\$\{escapeHTML\(p\.id\)\}'\)/,'ação Abrir deve continuar apontando para a API histórica de edição');
assert.doesNotMatch(mod,/_supabase/,'browse de prontuários não deve introduzir acesso direto ao Supabase');
assert.doesNotMatch(mod,/obterPacienteCompletoPorId/,'browse não deve carregar prontuários clínicos completos');
assert.doesNotMatch(mod,/KineSysDataCache/,'browse não deve criar uma segunda política de cache');

assert.match(core,/if \(idTela === 'tela_buscar'\) renderizarTabelaProntuarios\(\)/,'navegação do core deve continuar consumindo a API histórica');
assert.match(core,/renderizarPacientesRecentesHome\(\)/,'core deve continuar podendo atualizar recentes da Home');
assert.match(html,/oninput="filtrarPacientesSalvos\(\)"/,'handler inline da busca de prontuários deve permanecer intacto');

const modulePos=html.indexOf('patient_records_browse_core-1.0.0.js');
const corePos=html.indexOf('script-1.18.0.js');
const designPos=html.indexOf('design_system-1.20.1.js');
const homePos=html.indexOf('home_detalhes-1.18.5.js');
assert.ok(modulePos>=0&&modulePos<corePos,'módulo de browse deve carregar antes do core consumidor');
assert.ok(designPos>corePos&&homePos>corePos,'overrides modernos devem continuar carregando depois do fallback/core');
assert.match(design,/window\.renderizarTabelaProntuarios\s*=\s*async function/,'Design System ativo deve continuar substituindo a listagem fallback');
assert.match(design,/window\.filtrarPacientesSalvos\s*=\s*function/,'Design System ativo deve continuar substituindo o filtro fallback');
assert.match(home,/window\.renderizarPacientesRecentesHome\s*=\s*\(\)=>carregarAtendimentosHojeDetalhes\(\)/,'Home Detalhes deve continuar substituindo o fallback de recentes');
assert.match(html,/core_mod=20260911-phase4m-r1/,'cache-bust do monólito deve avançar para 4L');

console.log('Core Modularization Phase 4L: patient records browse fallbacks extracted while later Design System/Home overrides remain authoritative.');
