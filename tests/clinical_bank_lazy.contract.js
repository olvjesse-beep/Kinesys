'use strict';

const fs=require('fs');
const assert=require('assert');

const screen=fs.readFileSync('src/ui/screen_loader-1.25.0.js','utf8');
const regional=fs.readFileSync('src/clinical/clinical_region_loader-1.0.0.js','utf8');

const legacyBase='database/mapeamento_clinico.js';
const core='database/mapeamento_clinico_core-1.0.0.js';
const legacyExtensions=[
  'database/condicoes_mobilidade_v23.js',
  'database/diferenciais_neurais.js'
];
const manifest=JSON.parse(fs.readFileSync('database/regioes/base-manifest-1.0.0.json','utf8'));
const baseFiles=Object.values(manifest).map(entry=>entry.file);

assert.ok(!screen.includes(legacyBase),'banco clínico monolítico não deve permanecer no bundle-base da Avaliação');
assert.ok(!regional.includes(legacyBase),'banco clínico monolítico não deve ser carregado em produção após regionalização-base');
assert.ok(fs.existsSync(legacyBase),'banco clínico monolítico deve permanecer como referência contratual');
assert.ok(screen.includes(core),'núcleo leve deve permanecer no bundle-base da Avaliação');
assert.ok(fs.existsSync(core),'núcleo leve deve existir fisicamente');

for(const file of baseFiles){
  assert.ok(!screen.includes(file),`${file} não deve permanecer no bundle-base da Avaliação`);
  assert.ok(regional.includes(file),`${file} deve ser registrado no loader regional`);
  assert.ok(fs.existsSync(file),`${file} deve existir fisicamente`);
}
for(const file of legacyExtensions){
  assert.ok(!screen.includes(file),`${file} não deve permanecer no bundle-base da Avaliação`);
  assert.ok(!regional.includes(file),`${file} monolítico não deve ser carregado em produção após regionalização`);
  assert.ok(fs.existsSync(file),`${file} histórico deve permanecer para contrato de equivalência`);
}

assert.ok(screen.includes('database/mapeamento_regioes-1.0.0.js'),'índice leve deve permanecer no bundle-base');
assert.ok(screen.includes('database/irradiacao_clinica.js'),'banco de irradiação deve permanecer disponível antes do plano regional');
assert.match(regional,/const BASES_BANCO=Object\.freeze\(\{/,'loader deve registrar bancos-base por região');
assert.match(regional,/async function garantirBancoRegiao\(id\)/,'loader deve possuir gate explícito por região');
assert.match(regional,/let mudou=await garantirBancoClinico\(solicitadas\)/,'banco da região deve carregar antes dos enriquecedores 3.1');
assert.match(regional,/if\(!solicitadas\.length\)return\[\]/,'Avaliação sem região não deve baixar banco detalhado');
assert.match(regional,/normalizarRegioesMotor\(solicitadas\)/,'dependências devem ser expandidas somente para motores 3.1');
assert.doesNotMatch(regional,/garantirBancoClinico\([^)]*normalizarRegioesMotor/,'dependência de motor não deve forçar banco clínico de outra região');
assert.match(regional,/bankLoaded:regioesBancoCarregadas\.size>0/,'status público deve preservar indicador agregado de banco carregado');
assert.match(regional,/bankRegions:Object\.freeze\(Array\.from\(regioesBancoCarregadas\)\)/,'status deve expor somente IDs das regiões já carregadas');

const legacyBytes=[legacyBase,...legacyExtensions].reduce((total,file)=>total+fs.statSync(file).size,0);
const coreBytes=fs.statSync(core).size;
const legacyBaseBytes=fs.statSync(legacyBase).size;
assert.ok(legacyBytes>=150000,`referência histórica deve continuar representando pelo menos 150 KB brutos; atual ${legacyBytes} bytes`);
assert.ok(coreBytes<legacyBaseBytes*0.2,`núcleo leve deve ter menos de 20% do banco monolítico; core=${coreBytes}, legado=${legacyBaseBytes}`);

console.log('Clinical bank lazy loading contract: OK');