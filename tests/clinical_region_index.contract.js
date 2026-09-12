'use strict';

const fs=require('fs');
const assert=require('assert');
const vm=require('vm');

const loader=fs.readFileSync('src/ui/screen_loader-1.25.0.js','utf8');
const regional=fs.readFileSync('src/clinical/clinical_region_loader-1.0.0.js','utf8');
const motor=fs.readFileSync('src/clinical/clinical_reasoning_hma-3.0.0.js','utf8');
const indexSource=fs.readFileSync('database/mapeamento_regioes-1.0.0.js','utf8');
const baseManifest=JSON.parse(fs.readFileSync('database/regioes/base-manifest-1.0.0.json','utf8'));

assert.ok(loader.includes('database/mapeamento_regioes-1.0.0.js'),'bundle da Avaliação deve carregar o índice leve de regiões');
assert.ok(loader.includes('database/mapeamento_clinico_core-1.0.0.js'),'bundle da Avaliação deve carregar o núcleo leve do contrato BANCO_MAPEAMENTO_CLINICO');
assert.ok(!loader.includes('database/mapeamento_clinico.js'),'banco clínico pesado não deve permanecer no bundle-base da Avaliação');
assert.ok(!regional.includes('database/mapeamento_clinico.js'),'banco clínico monolítico não deve permanecer no loader de produção após a regionalização-base');
for(const entry of Object.values(baseManifest)){
  assert.ok(regional.includes(entry.file),`${entry.file} deve permanecer registrado no loader clínico sob demanda`);
}
assert.ok(loader.indexOf('database/mapeamento_regioes-1.0.0.js')<loader.indexOf('database/mapeamento_clinico_core-1.0.0.js'),'índice regional deve existir antes do núcleo leve');
assert.ok(loader.indexOf('database/mapeamento_clinico_core-1.0.0.js')<loader.indexOf('src/clinical/clinical_reasoning_hma-3.0.0.js'),'núcleo leve deve existir antes do Motor HMA');
assert.match(motor,/function indiceRegioes\(\)/,'Motor HMA deve possuir acesso explícito ao índice leve');
assert.match(motor,/typeof BANCO_MAPEAMENTO_REGIOES!==['"]undefined['"]/,'Motor HMA deve preferir o índice leve quando disponível');
assert.match(motor,/const B=indiceRegioes\(\)/,'inferência inicial de região deve usar o índice leve');
assert.match(motor,/function candidatosRegiao\([\s\S]*?const reg=banco\(\)\[regiaoInfo\.id\]/,'conteúdo de hipóteses deve continuar vindo do banco clínico detalhado da região');
assert.match(motor,/return banco\(\)/,'índice deve possuir fallback compatível para o banco clínico');

const context={console};
vm.createContext(context);
for(const file of ['database/mapeamento_clinico.js','database/condicoes_mobilidade_v23.js','database/diferenciais_neurais.js']){
  vm.runInContext(fs.readFileSync(file,'utf8'),context,{filename:file,timeout:2000});
}
vm.runInContext(indexSource,context,{filename:'database/mapeamento_regioes-1.0.0.js',timeout:1000});
const banco=vm.runInContext('BANCO_MAPEAMENTO_CLINICO',context);
const indice=vm.runInContext('BANCO_MAPEAMENTO_REGIOES',context);
const esperado=Object.fromEntries(Object.entries(banco).map(([id,reg])=>[id,{nome:String(reg?.nome||id),palavrasChave:Array.from(new Set((reg?.palavrasChave||[]).filter(Boolean))) }]));
assert.deepStrictEqual(JSON.parse(JSON.stringify(indice)),JSON.parse(JSON.stringify(esperado)),'índice leve deve espelhar exatamente nomes e palavras-chave do banco clínico vigente');

const fullBytes=fs.statSync('database/mapeamento_clinico.js').size;
const indexBytes=fs.statSync('database/mapeamento_regioes-1.0.0.js').size;
assert.ok(indexBytes<fullBytes*0.15,`índice deve permanecer leve (<15% do banco completo); índice=${indexBytes}, banco=${fullBytes}`);

console.log('Clinical region index contract: OK');