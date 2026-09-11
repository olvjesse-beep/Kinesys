'use strict';
const fs=require('fs');
const vm=require('vm');
const path=require('path');

function snapshot(context){
  return JSON.parse(JSON.stringify(vm.runInContext('BANCO_MAPEAMENTO_CLINICO',context)));
}
function run(files){
  const context={console};
  vm.createContext(context);
  for(const file of files)vm.runInContext(fs.readFileSync(file,'utf8'),context,{filename:file,timeout:3000});
  return snapshot(context);
}
function stable(v){return JSON.stringify(v);}
function isPrefix(before,after){
  return Array.isArray(before)&&Array.isArray(after)&&before.length<=after.length&&before.every((v,i)=>stable(v)===stable(after[i]));
}

const base=run(['database/mapeamento_clinico.js']);
const final=run(['database/mapeamento_clinico.js','database/condicoes_mobilidade_v23.js','database/diferenciais_neurais.js']);
const outDir='database/regioes';
fs.mkdirSync(outDir,{recursive:true});
for(const name of fs.readdirSync(outDir)){
  if(/-ext-1\.0\.0\.js$/.test(name))fs.unlinkSync(path.join(outDir,name));
}
const manifest={};
for(const id of Object.keys(final)){
  const before=base[id]||{};
  const after=final[id]||{};
  const keys=[...new Set([...Object.keys(before),...Object.keys(after)])].filter(k=>stable(before[k])!==stable(after[k]));
  if(!keys.length)continue;
  const operations=[];
  for(const key of keys){
    if(isPrefix(before[key],after[key])){
      const additions=after[key].slice(before[key].length);
      operations.push(`  r[${JSON.stringify(key)}]=[...(Array.isArray(r[${JSON.stringify(key)}])?r[${JSON.stringify(key)}]:[]),...${JSON.stringify(additions,null,2)}];`);
    }else{
      operations.push(`  r[${JSON.stringify(key)}]=${JSON.stringify(after[key],null,2)};`);
    }
  }
  const file=`database/regioes/${id}-ext-1.0.0.js`;
  const source=`/* KineSys — extensão clínica regional ${id} 1.0.0.\n * Gerada deterministicamente de condicoes_mobilidade_v23.js + diferenciais_neurais.js.\n * Não editar manualmente sem atualizar o contrato de equivalência.\n */\n(function(){\n  'use strict';\n  if(typeof BANCO_MAPEAMENTO_CLINICO==='undefined')return;\n  const r=BANCO_MAPEAMENTO_CLINICO[${JSON.stringify(id)}];\n  if(!r)return;\n${operations.join('\n')}\n})();\n`;
  fs.writeFileSync(file,source);
  manifest[id]={file,keys,bytes:Buffer.byteLength(source)};
}
fs.writeFileSync('database/regioes/manifest-1.0.0.json',JSON.stringify(manifest,null,2)+'\n');
console.log(JSON.stringify(manifest,null,2));
