'use strict';

const fs=require('fs');
const assert=require('assert');
const vm=require('vm');

function execute(files){
  const context={console};
  vm.createContext(context);
  for(const file of files){
    vm.runInContext(fs.readFileSync(file,'utf8'),context,{filename:file,timeout:3000});
  }
  return JSON.parse(JSON.stringify(vm.runInContext('BANCO_MAPEAMENTO_CLINICO',context)));
}

const historical=[
  'database/mapeamento_clinico.js',
  'database/condicoes_mobilidade_v23.js',
  'database/diferenciais_neurais.js'
];
const manifest=JSON.parse(fs.readFileSync('database/regioes/manifest-1.0.0.json','utf8'));
const baseManifest=JSON.parse(fs.readFileSync('database/regioes/base-manifest-1.0.0.json','utf8'));
const regionalFiles=Object.values(manifest).map(item=>item.file);
const baseFiles=Object.values(baseManifest).map(item=>item.file);

assert.deepStrictEqual(Object.keys(manifest).sort(),[
  'coluna_toracica','cotovelo','joelho','ombro','punho_mao','quadril','tornozelo_pe'
].sort(),'manifesto regional deve conter exatamente as regiões historicamente modificadas');
for(const file of [...baseFiles,...regionalFiles]){
  assert.ok(fs.existsSync(file),`${file} deve existir`);
  assert.doesNotThrow(()=>require('child_process').execFileSync(process.execPath,['--check',file]),`${file} deve ter sintaxe válida`);
}

const esperado=execute(historical);
const reconstruidoLegadoBase=execute(['database/mapeamento_clinico.js',...regionalFiles]);
assert.deepStrictEqual(reconstruidoLegadoBase,esperado,'fragmentos de extensão devem permanecer equivalentes quando aplicados ao banco monolítico de referência');

const caminhoProducao=execute(['database/mapeamento_clinico_core-1.0.0.js',...baseFiles,...regionalFiles]);
assert.deepStrictEqual(caminhoProducao,esperado,'núcleo + bases regionais + extensões regionais deve reconstruir exatamente o banco histórico completo');

for(const [id,item] of Object.entries(manifest)){
  const base=execute(['database/mapeamento_clinico.js']);
  const isolado=execute(['database/mapeamento_clinico.js',item.file]);
  const esperadoRegiao=esperado[id];
  assert.deepStrictEqual(isolado[id],esperadoRegiao,`${id}: fragmento deve reproduzir exatamente a região histórica final`);
  for(const outro of Object.keys(base)){
    if(outro===id)continue;
    assert.deepStrictEqual(isolado[outro],base[outro],`${id}: fragmento não pode alterar a região ${outro}`);
  }
}

const legacyBytes=fs.statSync('database/condicoes_mobilidade_v23.js').size+fs.statSync('database/diferenciais_neurais.js').size;
const regionalBytes=regionalFiles.reduce((total,file)=>total+fs.statSync(file).size,0);
assert.ok(regionalBytes<=legacyBytes*1.25,`fragmentação não deve inflar materialmente o conteúdo clínico: regional=${regionalBytes}, legado=${legacyBytes}`);

console.log(`Clinical bank regional equivalence contract: OK (${regionalFiles.length} regiões, ${regionalBytes} bytes regionais vs ${legacyBytes} bytes legados)`);