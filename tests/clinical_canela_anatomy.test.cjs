'use strict';
const assert=require('node:assert/strict');
const {env,api}=require('./clinical_evidence_reasoning.test.cjs');
const {fixture}=require('./evaluation_report_integration.test.cjs');
const fs=require('node:fs'),vm=require('node:vm');
const hma='Paciente apresenta dor na lateral da canela, o mesmo relata que essa dor apareceu gradativamente e foi aumentando, a dor aumenta ao fazer movimento de eversão';
let count=0;const caso=(nome,fn)=>{fn();count++;console.log('Anatomia canela: '+nome+' OK');};
caso('texto da imagem: resumo visível reconhece sublocalização e comportamento',()=>{
 const r=env.analisarHMAClinicaKineSys(hma);
 assert(r.achados.some(a=>a.titulo==='Sintoma principal'&&a.valor.includes('região lateral da perna (canela)')));
 assert(!r.achados.some(a=>a.valor.includes('não especificado')));
 assert(r.achados.some(a=>/eversão/.test(a.valor)));
 assert(r.perguntasEntrevista.some(q=>q.id==='local:perna:eversao'));
 assert(!r.raciocinio.hipoteses.some(h=>h.regiaoId==='tornozelo_pe'),'perna não vira tornozelo nem diagnóstico tendíneo automaticamente');
});
caso('alias no singular, plural e caixa alta usa topologia existente',()=>{
 for(const text of ['Dor na canela.','Dor nas canelas.','DOR NA LATERAL DA CANELA DIREITA.']){
  const r=env.analisarHMAClinicaKineSys(text);assert(r.achados.some(a=>a.titulo==='Sintoma principal'&&a.valor.includes('perna (canela)')),text);
 }
});
caso('renderizador real mostra a localização reconhecida e as perguntas',()=>{
 const old=env.document.getElementById,oldEscape=env.escapeHTML,box={hidden:false,dataset:{}},list={innerHTML:''};
 env.escapeHTML=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 env.document.getElementById=id=>id==='paciente_hma'?{value:hma}:id==='ks20_hma_radar'?box:id==='ks20_hma_insights'?list:null;
 try{env.renderizarRadarHMAKineSys();assert(!box.hidden);assert(list.innerHTML.includes('Dor na região lateral da perna (canela)'));assert(!list.innerHTML.includes('Dor em não especificado'));assert(list.innerHTML.includes('Em que ponto da perna a eversão reproduz a dor?'));}
 finally{env.document.getElementById=old;env.escapeHTML=oldEscape;}
});
caso('grafo e origens conhecem canela sem inventar banco articular',()=>{
 const r=env.KineSysSemanticGraph.analisar(hma),p=r.proposicoes.find(p=>p.local==='canela');assert(p);assert.equal(p.segmentoId,'perna');assert.equal(p.regiaoId,'');assert(p.contextoLocal.includes('lateral da canela'));
 assert(!r.pendencias.some(p=>p.tipo==='local_nao_especificado'));assert.equal(hma.slice(p.origem.inicio,p.origem.fim),p.origem.trecho);
 assert(env.KineSysSemanticGraph.validar(r,hma).ok);
 assert(!env.KineSysSemanticGraph.validar(r,hma.replace('canela','antebraço')).ok);
});
caso('negativa e familiar não viram achado próprio',()=>{
 for(const text of ['Nega dor na lateral da canela ao fazer eversão.','Minha mãe apresenta dor na lateral da canela ao fazer eversão.']){
  const r=api.analisar(text);assert(!r.perguntas.some(q=>q.id==='local:perna:eversao'));assert(!r.hipoteses.length);
 }
});
caso('comportamento da canela não contamina o calcanhar',()=>{
 const r=api.analisar('Dor na canela nos primeiros passos. Dor plantar medial no calcanhar.');assert(!r.hipoteses.some(h=>h.id==='dor_plantar_calcanhar'));
 const e=r.evidencias.find(e=>e.conceito==='primeiros_passos');assert.equal(e.segmentoId,'perna');
 const irradiado=api.analisar('Dor lombar que irradia para a canela direita.');assert(!irradiado.perguntas.some(q=>q.id==='lado:perna'||q.id==='tempo:perna'));
});
caso('texto e localização da canela persistem no relatório sem editar HMA',()=>{
 const t=fixture();for(const file of ['database/clinical_evidence_profiles-1.0.0.js','src/clinical/clinical_evidence_reasoning-1.0.0.js'])vm.runInContext(fs.readFileSync(file,'utf8'),t.c);
 t.fields[2].value=hma;const r=t.render();assert.equal(t.fields[2].value,hma);assert(r.texto.includes('canela'));assert(r.texto.includes('eversão'));
 assert(r.semantica.proposicoes.some(p=>p.segmentoId==='perna'&&p.local==='canela'));
 assert(r.semantica.raciocinio.perguntas.some(q=>q.id==='local:perna:eversao'));
});
console.log(`${count} cenários de reconhecimento canela/resumo/grafo/relatório OK.`);
