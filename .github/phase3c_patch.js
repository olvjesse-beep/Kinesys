'use strict';
const fs=require('fs');
const path='tests/screen_loader.contract.js';
let s=fs.readFileSync(path,'utf8');
const from=`const evaluationDatabaseLazyScripts=[
  'cirurgias-1.18.0.js',
  'database/medicamentos.js',
  'database/irradiacao_clinica.js',
  'database/mapeamento_clinico.js',
  'database/condicoes_mobilidade_v23.js',
  'database/diferenciais_neurais.js'
];
for(const file of evaluationDatabaseLazyScripts)assertLazyAsset(file,'script');

let evaluationDbPos=-1;
for(const file of evaluationDatabaseLazyScripts){
  const pos=loader.indexOf(file);
  assert.ok(pos>evaluationDbPos,\`${'${file}'} deve preservar a ordem clínica histórica no bundle da Avaliação\`);
  evaluationDbPos=pos;
}
assert.ok(loader.indexOf('database/mapeamento_clinico.js')<loader.indexOf('database/condicoes_mobilidade_v23.js'),'mapeamento clínico deve carregar antes da extensão de mobilidade');
assert.ok(loader.indexOf('database/mapeamento_clinico.js')<loader.indexOf('database/diferenciais_neurais.js'),'mapeamento clínico deve carregar antes dos diferenciais neurais');
assert.match(html,/<script[^>]+src=[\"'][^\"']*database\\/ocupacoes_esportes\\.js[^\"']*[\"']/i,'ocupações/esportes permanece eager nesta fase porque o núcleo principal ainda o valida no bootstrap');
assert.doesNotMatch(loader,/scripts:Object\\.freeze\\(\\[[\\s\\S]*?database\\/ocupacoes_esportes\\.js[\\s\\S]*?clinical_engine-1\\.17\\.0\\.js/,'ocupações/esportes não deve ser carregado duas vezes no bundle da Avaliação');

// Smoke test real das bases: scripts clássicos separados compartilham o mesmo lexical environment.
const clinicalDbContext={console};
vm.createContext(clinicalDbContext);
for(const file of evaluationDatabaseLazyScripts){
  vm.runInContext(fs.readFileSync(file,'utf8'),clinicalDbContext,{filename:file,timeout:1500});
}
assert.strictEqual(vm.runInContext('typeof dicionarioCirurgias',clinicalDbContext),'object','dicionário de cirurgias deve existir após carga tardia');
assert.strictEqual(vm.runInContext('typeof dicionarioMedicamentos',clinicalDbContext),'object','dicionário de medicamentos deve existir após carga tardia');
assert.strictEqual(vm.runInContext('typeof BANCO_IRRADIACAO_CLINICA',clinicalDbContext),'object','banco de irradiação deve existir após carga tardia');
assert.strictEqual(vm.runInContext('typeof BANCO_MAPEAMENTO_CLINICO',clinicalDbContext),'object','banco de mapeamento deve existir após carga tardia');
const evaluationDatabaseDeferredBytes=evaluationDatabaseLazyScripts.reduce((total,file)=>total+fs.statSync(file).size,0);
assert.ok(evaluationDatabaseDeferredBytes>=275000,\`Fase 4C deve adiar pelo menos 275 KB brutos; atual ${'${evaluationDatabaseDeferredBytes}'} bytes\`);`;
const to=`const evaluationDatabaseLazyScripts=[
  'cirurgias-1.18.0.js',
  'database/medicamentos.js',
  'database/irradiacao_clinica.js',
  'database/mapeamento_regioes-1.0.0.js'
];
for(const file of evaluationDatabaseLazyScripts)assertLazyAsset(file,'script');

let evaluationDbPos=-1;
for(const file of evaluationDatabaseLazyScripts){
  const pos=loader.indexOf(file);
  assert.ok(pos>evaluationDbPos,\`${'${file}'} deve preservar a ordem clínica histórica no bundle-base da Avaliação\`);
  evaluationDbPos=pos;
}
assert.match(html,/<script[^>]+src=[\"'][^\"']*database\\/ocupacoes_esportes\\.js[^\"']*[\"']/i,'ocupações/esportes permanece eager nesta fase porque o núcleo principal ainda o valida no bootstrap');
assert.doesNotMatch(loader,/scripts:Object\\.freeze\\(\\[[\\s\\S]*?database\\/ocupacoes_esportes\\.js[\\s\\S]*?clinical_engine-1\\.17\\.0\\.js/,'ocupações/esportes não deve ser carregado duas vezes no bundle da Avaliação');

// Smoke test das bases que continuam disponíveis ao abrir a Avaliação.
const clinicalDbContext={console};
vm.createContext(clinicalDbContext);
for(const file of evaluationDatabaseLazyScripts){
  vm.runInContext(fs.readFileSync(file,'utf8'),clinicalDbContext,{filename:file,timeout:1500});
}
assert.strictEqual(vm.runInContext('typeof dicionarioCirurgias',clinicalDbContext),'object','dicionário de cirurgias deve existir após carga tardia da Avaliação');
assert.strictEqual(vm.runInContext('typeof dicionarioMedicamentos',clinicalDbContext),'object','dicionário de medicamentos deve existir após carga tardia da Avaliação');
assert.strictEqual(vm.runInContext('typeof BANCO_IRRADIACAO_CLINICA',clinicalDbContext),'object','banco de irradiação deve existir antes da demanda regional');
assert.strictEqual(vm.runInContext('typeof BANCO_MAPEAMENTO_REGIOES',clinicalDbContext),'object','índice leve de regiões deve existir antes da demanda regional');
assert.strictEqual(vm.runInContext('typeof BANCO_MAPEAMENTO_CLINICO',clinicalDbContext),'undefined','banco clínico pesado não deve existir no bundle-base da Avaliação');`;
if(!s.includes(from))throw new Error('Bloco de bases da Avaliação não encontrado');
s=s.replace(from,to);
fs.writeFileSync(path,s);
