'use strict';

const fs=require('fs');
const assert=require('assert');

const screen=fs.readFileSync('screen_loader-1.25.0.js','utf8');
const regional=fs.readFileSync('clinical_region_loader-1.0.0.js','utf8');

const regionalScripts=[
  'clinical_reasoning_shoulder-3.1.0.js',
  'clinical_reasoning_elbow-3.1.0.js',
  'clinical_reasoning_wrist-3.1.0.js',
  'clinical_reasoning_cervical-3.1.0.js'
];
const regionalStyles=[
  'clinical_reasoning_shoulder-3.1.0.css',
  'clinical_reasoning_elbow-3.1.0.css',
  'clinical_reasoning_wrist-3.1.0.css',
  'clinical_reasoning_cervical-3.1.0.css'
];

assert.ok(screen.includes('clinical_region_loader-1.0.0.js'),'Avaliação deve carregar o coordenador regional sob demanda');
assert.ok(screen.indexOf('clinical_reasoning_hma-3.0.0.js')<screen.indexOf('clinical_region_loader-1.0.0.js'),'loader regional deve iniciar depois do Motor HMA base');
for(const file of [...regionalScripts,...regionalStyles]){
  assert.ok(!screen.includes(file),`${file} não deve permanecer no bundle base da Avaliação`);
  assert.ok(regional.includes(file),`${file} deve permanecer registrado no loader regional`);
}
assert.match(regional,/const ORDEM=Object\.freeze\(\['ombro','cotovelo','punho_mao','cervical'\]\)/,'ordem histórica dos motores regionais deve ser explícita');
assert.match(regional,/punho_mao:Object\.freeze\(\{[\s\S]*?depends:Object\.freeze\(\['cotovelo'\]\)/,'Punho/Mão deve preservar dependência atual do enriquecedor de Cotovelo');
assert.match(regional,/cervical:Object\.freeze\(\{[\s\S]*?depends:Object\.freeze\(\['cotovelo'\]\)/,'Cervical deve preservar dependência atual do enriquecedor de Cotovelo');
assert.match(regional,/kinesys:motor3-plano-atualizado/,'loader regional deve reagir às regiões produzidas pelo Motor 3');
assert.match(regional,/kinesys:tela-ativada/,'retorno à Avaliação deve sincronizar regiões já inferidas');
assert.match(regional,/window\.atualizarMotorClinico3KineSys\(true\)/,'após carga regional o plano deve ser recalculado uma vez com o enriquecedor disponível');
assert.match(regional,/regioesCarregadas\.has\(id\)/,'região já carregada não deve baixar novamente');
assert.match(regional,/carregamentos\.has\(href\)/,'scripts regionais concorrentes devem ser deduplicados');
assert.match(regional,/estilos\.has\(href\)/,'estilos regionais concorrentes devem ser deduplicados');

console.log('Clinical region lazy loading contract: OK');
