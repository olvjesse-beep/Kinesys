'use strict';

const fs=require('fs');
const assert=require('assert');

const screen=fs.readFileSync('screen_loader-1.25.0.js','utf8');
const regional=fs.readFileSync('clinical_region_loader-1.0.0.js','utf8');

const heavy=[
  'database/mapeamento_clinico.js',
  'database/condicoes_mobilidade_v23.js',
  'database/diferenciais_neurais.js'
];

for(const file of heavy){
  assert.ok(!screen.includes(file),`${file} não deve permanecer no bundle-base da Avaliação`);
  assert.ok(regional.includes(file),`${file} deve ser registrado no loader clínico sob demanda`);
  assert.ok(fs.existsSync(file),`${file} deve existir fisicamente`);
}

let pos=-1;
for(const file of heavy){
  const atual=regional.indexOf(file);
  assert.ok(atual>pos,`${file} deve preservar a ordem histórica do banco clínico`);
  pos=atual;
}

assert.ok(screen.includes('database/mapeamento_regioes-1.0.0.js'),'índice leve deve permanecer no bundle-base');
assert.ok(screen.includes('database/irradiacao_clinica.js'),'banco de irradiação deve permanecer disponível antes do plano regional');
assert.match(regional,/async function garantirBancoClinico\(\)/,'loader deve possuir gate explícito do banco completo');
assert.match(regional,/let mudou=await garantirBancoClinico\(\)/,'banco completo deve carregar antes dos enriquecedores 3.1');
assert.match(regional,/if\(!solicitadas\.length\)return\[\]/,'Avaliação sem região não deve baixar banco pesado');
assert.match(regional,/regioesSelecionadasDom\(\)/,'seleção manual deve participar da demanda mesmo antes do banco completo');
assert.match(regional,/#grupo_regioes_mapeamento input:checked/,'loader deve ler IDs das regiões selecionadas no DOM');
assert.match(regional,/event\.target\?\.matches\?\.\('#grupo_regioes_mapeamento input'\)/,'mudança manual de região deve acordar o loader clínico');
assert.match(regional,/kinesys:clinical-bank-ready/,'conclusão do banco deve ser observável');
assert.match(regional,/bankLoaded:bancoClinicoPronto/,'status público deve expor somente estado agregado do banco');

const deferred=heavy.reduce((total,file)=>total+fs.statSync(file).size,0);
assert.ok(deferred>=150000,`Fase 3C deve adiar pelo menos 150 KB brutos; atual ${deferred} bytes`);

console.log('Clinical bank lazy loading contract: OK');