'use strict';

const fs=require('fs');
const assert=require('assert');

const screen=fs.readFileSync('screen_loader-1.25.0.js','utf8');
const regional=fs.readFileSync('clinical_region_loader-1.0.0.js','utf8');

const legacyExtensions=[
  'database/condicoes_mobilidade_v23.js',
  'database/diferenciais_neurais.js'
];
const base='database/mapeamento_clinico.js';

assert.ok(!screen.includes(base),'banco clínico-base não deve permanecer no bundle-base da Avaliação');
assert.ok(regional.includes(base),'banco clínico-base deve continuar sob demanda no loader clínico');
assert.ok(fs.existsSync(base),'banco clínico-base deve existir fisicamente');
for(const file of legacyExtensions){
  assert.ok(!screen.includes(file),`${file} não deve permanecer no bundle-base da Avaliação`);
  assert.ok(!regional.includes(file),`${file} monolítico não deve ser carregado em produção após regionalização`);
  assert.ok(fs.existsSync(file),`${file} histórico deve permanecer para contrato de equivalência`);
}

assert.ok(screen.includes('database/mapeamento_regioes-1.0.0.js'),'índice leve deve permanecer no bundle-base');
assert.ok(screen.includes('database/irradiacao_clinica.js'),'banco de irradiação deve permanecer disponível antes do plano regional');
assert.match(regional,/async function garantirBancoBase\(\)/,'loader deve possuir gate explícito do banco-base');
assert.match(regional,/async function garantirExtensoesBanco\(ids\)/,'loader deve possuir gate explícito das extensões regionais');
assert.match(regional,/let mudou=await garantirBancoClinico\(solicitadas\)/,'banco da região deve carregar antes dos enriquecedores 3.1');
assert.match(regional,/if\(!solicitadas\.length\)return\[\]/,'Avaliação sem região não deve baixar banco pesado');
assert.match(regional,/regioesSelecionadasDom\(\)/,'seleção manual deve participar da demanda mesmo antes do banco completo');
assert.match(regional,/#grupo_regioes_mapeamento input:checked/,'loader deve ler IDs das regiões selecionadas no DOM');
assert.match(regional,/event\.target\?\.matches\?\.\('#grupo_regioes_mapeamento input'\)/,'mudança manual de região deve acordar o loader clínico');
assert.match(regional,/kinesys:clinical-bank-region-ready/,'conclusão da extensão regional deve ser observável');
assert.match(regional,/bankLoaded:bancoClinicoPronto/,'status público deve preservar estado agregado do banco-base');
assert.match(regional,/bankRegions:Object\.freeze\(Array\.from\(regioesBancoCarregadas\)\)/,'status deve expor regiões do banco já carregadas sem dados clínicos');

const deferred=[base,...legacyExtensions].reduce((total,file)=>total+fs.statSync(file).size,0);
assert.ok(deferred>=150000,`Fase 3C/3D deve continuar adiando pelo menos 150 KB brutos; atual ${deferred} bytes`);

console.log('Clinical bank lazy loading contract: OK');