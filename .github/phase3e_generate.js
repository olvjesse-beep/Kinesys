'use strict';
const fs=require('fs');
const vm=require('vm');
const path=require('path');

const context={console};
vm.createContext(context);
vm.runInContext(fs.readFileSync('database/mapeamento_clinico.js','utf8'),context,{filename:'database/mapeamento_clinico.js',timeout:5000});
const banco=JSON.parse(JSON.stringify(vm.runInContext('BANCO_MAPEAMENTO_CLINICO',context)));
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
console.log(JSON.stringify({sourceBytes:fs.statSync('database/mapeamento_clinico.js').size,regions:manifest},null,2));
