'use strict';
// Manual model comparison. Synthetic fixtures only. Never part of hosted CI.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {MODELS,generate}=require('./report_engine.cjs'),cases=require('./benchmark_cases.cjs');
const {input,validate}=require('./server.cjs');
const root=path.resolve(__dirname,'../..'),scope={};scope.window=scope;vm.createContext(scope);
for(const file of ['clinical_language_rules-1.0.0.js','clinical_semantic_graph-1.0.0.js'])vm.runInContext(fs.readFileSync(path.join(root,'src/clinical',file),'utf8'),scope);
(async()=>{
 const results=[],modelOption=process.argv.find(a=>a.startsWith('--model='))?.slice(8),selected=modelOption?[modelOption]:process.argv.includes('--new-only')?[MODELS[1]]:MODELS;
 if(selected.some(m=>!MODELS.includes(m)))throw Error('Modelo não autorizado.');
 for(const model of selected)for(const item of cases){
  const started=Date.now(),snapshot={contexto:{clinicaId:'laboratorio',pacienteId:'ficticio-'+item.id,avaliacaoId:item.id,revisao:'1'},fontes:item.fontes};
  try{const result=validate(await generate(snapshot,{graph:scope.KineSysSemanticGraph,model}),input(snapshot),scope.KineSysSemanticGraph);results.push({caso:item.id,model,aceito:true,...result});console.log(JSON.stringify({caso:item.id,model,aceito:true,...result.metricas}));}
  catch(error){results.push({caso:item.id,model,aceito:false,erro:error.message,diagnostico:error.diagnostico,milissegundos:Date.now()-started});console.log(JSON.stringify({...results.at(-1),diagnostico:undefined}));}
 }
 const output={data:new Date().toISOString(),dados:'exclusivamente_sinteticos',aviso:'Aceitação por regras não é acurácia clínica. Rever os textos e os casos bloqueados.',casos:cases,resultados:results};
 const destination=path.resolve('G:/KineSys-IA/Resultados/benchmark-'+Date.now()+'.json');
 if(!destination.toLowerCase().startsWith(path.resolve('G:/KineSys-IA/Resultados').toLowerCase()+path.sep))throw Error('Destino inválido.');
 fs.writeFileSync(destination,JSON.stringify(output,null,2),{flag:'wx'});console.log('Resultado sintético: '+destination);
 for(const model of selected){const rows=results.filter(r=>r.model===model),ok=rows.filter(r=>r.aceito);console.log(JSON.stringify({model,aceitos:ok.length,total:rows.length,sobreposicaoMedia:ok.length?Math.round(ok.reduce((n,r)=>n+r.metricas.sobreposicaoTextual4gramas,0)/ok.length):null,naoEquivaleAValidacaoClinica:true}));}
})().catch(error=>{console.error(error.message);process.exitCode=1;});
