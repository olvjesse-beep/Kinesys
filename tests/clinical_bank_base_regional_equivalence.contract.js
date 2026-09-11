'use strict';

const fs=require('fs');
const vm=require('vm');
const assert=require('assert');

function run(files){
  const context={console};
  vm.createContext(context);
  for(const file of files)vm.runInContext(fs.readFileSync(file,'utf8'),context,{filename:file,timeout:5000});
  return JSON.parse(JSON.stringify(vm.runInContext('BANCO_MAPEAMENTO_CLINICO',context)));
}

const legacy=run(['database/mapeamento_clinico.js']);
const manifest=JSON.parse(fs.readFileSync('database/regioes/base-manifest-1.0.0.json','utf8'));
const ids=Object.keys(legacy);
assert.deepStrictEqual(Object.keys(manifest),ids,'manifesto-base deve preservar exatamente a ordem/IDs do banco monolítico');

const baseFiles=ids.map(id=>manifest[id].file);
for(const file of baseFiles){
  assert.ok(fs.existsSync(file),`${file} deve existir`);
}

const rebuilt=run(['database/mapeamento_clinico_core-1.0.0.js',...baseFiles]);
assert.deepStrictEqual(rebuilt,legacy,'núcleo leve + todos os bancos-base regionais deve reconstruir exatamente o banco monolítico');

const core=run(['database/mapeamento_clinico_core-1.0.0.js']);
assert.deepStrictEqual(Object.keys(core),ids,'núcleo leve deve manter todos os IDs regionais');
for(const id of ids){
  assert.strictEqual(core[id].nome,legacy[id].nome,`${id}: nome deve estar disponível no núcleo leve`);
  assert.ok(Array.isArray(core[id].clusters)&&core[id].clusters.length===0,`${id}: clusters não devem ser antecipados no núcleo`);
  assert.ok(Array.isArray(core[id].diferenciais)&&core[id].diferenciais.length===0,`${id}: diferenciais não devem ser antecipados no núcleo`);
  assert.ok(Array.isArray(core[id].redFlags)&&core[id].redFlags.length===0,`${id}: red flags não devem ser antecipadas no núcleo`);

  const isolated=run(['database/mapeamento_clinico_core-1.0.0.js',manifest[id].file]);
  assert.deepStrictEqual(isolated[id],legacy[id],`${id}: banco-base isolado deve ser idêntico ao bloco legado`);
  for(const other of ids.filter(x=>x!==id)){
    assert.deepStrictEqual(isolated[other],core[other],`${id}: carregar uma região não pode alterar ${other}`);
  }
}

const sourceBytes=fs.statSync('database/mapeamento_clinico.js').size;
const coreBytes=fs.statSync('database/mapeamento_clinico_core-1.0.0.js').size;
const regionBytes=baseFiles.reduce((sum,file)=>sum+fs.statSync(file).size,0);
assert.ok(coreBytes<sourceBytes*0.2,`núcleo deve permanecer <20% do monólito; core=${coreBytes}, legado=${sourceBytes}`);
assert.ok(regionBytes<sourceBytes*1.15,`fragmentação-base não deve inflar mais de 15%; regionais=${regionBytes}, legado=${sourceBytes}`);

console.log('Clinical base regional equivalence contract: OK');