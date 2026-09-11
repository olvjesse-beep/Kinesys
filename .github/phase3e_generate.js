'use strict';
const fs=require('fs');
const vm=require('vm');
const path=require('path');

function run(file,expr){
  const context={console};
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(file,'utf8'),context,{filename:file,timeout:5000});
  return JSON.parse(JSON.stringify(vm.runInContext(expr,context)));
}

const banco=run('database/mapeamento_clinico.js','BANCO_MAPEAMENTO_CLINICO');
const indice=run('database/mapeamento_regioes-1.0.0.js','BANCO_MAPEAMENTO_REGIOES');
const outDir='database/regioes';
fs.mkdirSync(outDir,{recursive:true});
for(const name of fs.readdirSync(outDir)){
  if(/-base-1\.0\.0\.js$/.test(name))fs.unlinkSync(path.join(outDir,name));
}
const manifest={};
for(const [id,reg] of Object.entries(banco)){
  const file=`database/regioes/${id}-base-1.0.0.js`;
  const source=`/* KineSys — banco clínico base regional ${id} 1.0.0.\n * Gerado deterministicamente de database/mapeamento_clinico.js.\n * Não editar manualmente sem atualizar o contrato de equivalência.\n */\n(function(){\n  'use strict';\n  if(typeof BANCO_MAPEAMENTO_CLINICO==='undefined')return;\n  BANCO_MAPEAMENTO_CLINICO[${JSON.stringify(id)}]=${JSON.stringify(reg,null,2)};\n})();\n`;
  fs.writeFileSync(file,source);
  manifest[id]={file,bytes:Buffer.byteLength(source)};
}
fs.writeFileSync('database/regioes/base-manifest-1.0.0.json',JSON.stringify(manifest,null,2)+'\n');

const coreEntries={};
for(const [id,meta] of Object.entries(indice)){
  coreEntries[id]={
    nome:String(meta?.nome||id),
    palavrasChave:Array.isArray(meta?.palavrasChave)?meta.palavrasChave:[],
    clusters:[],
    diferenciais:[],
    redFlags:[]
  };
}
const core=`/* KineSys — núcleo leve do banco clínico 1.0.0.\n * Mantém IDs/metadados regionais disponíveis antes dos bancos detalhados sob demanda.\n * Gerado deterministicamente de database/mapeamento_regioes-1.0.0.js.\n */\nconst BANCO_MAPEAMENTO_CLINICO = ${JSON.stringify(coreEntries,null,2)};\n`;
fs.writeFileSync('database/mapeamento_clinico_core-1.0.0.js',core);
console.log(JSON.stringify({sourceBytes:fs.statSync('database/mapeamento_clinico.js').size,coreBytes:Buffer.byteLength(core),regions:manifest},null,2));
