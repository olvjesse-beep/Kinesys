'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const {env,api,exemplo}=require('./clinical_evidence_reasoning.test.cjs');
const {fixture}=require('./evaluation_report_integration.test.cjs');
let count=0;const caso=(nome,fn)=>{fn();count++;console.log('Integração evidências: '+nome+' OK');};
function preparar(hma){
 const t=fixture();for(const file of ['database/clinical_evidence_profiles-1.0.0.js','src/clinical/clinical_evidence_reasoning-1.0.0.js'])vm.runInContext(fs.readFileSync(file,'utf8'),t.c);
 t.fields[2].value=hma;t.c.BANCO_MAPEAMENTO_CLINICO.tornozelo_pe={nome:'Tornozelo e Pé'};t.regions.splice(0,t.regions.length,{dataset:{regiao:'tornozelo_pe'}});
 t.c.window.KineSysMotorClinico3.ultimoPlano={raciocinio:api.analisar(hma),hipoteses:[{id:'dor_plantar_calcanhar',nome:'Fasciopatia plantar',regiaoId:'tornozelo_pe'}],exame:{testesPrioritarios:[]}};
 t.c.gerarSinteseMapeamento=()=>({resumoPorRegiao:[{regiao:'Tornozelo e Pé',codigoHipotese:'dor_plantar_calcanhar',nomeHipotese:'Fasciopatia plantar',nivel:'positivo',redFlags:[]}],segurancaGlobal:{pistasGlobais:[]}});
 t.tests=[{regiao:'Tornozelo e Pé',regiaoId:'tornozelo_pe',id:'dor_plantar_calcanhar',nome:'Fasciopatia plantar',achados:[{texto:'Teste sintético vinculado à hipótese plantar',resultado:'positivo'}]}];return t;
}
caso('HMA e relatório preservam a mesma fonte, origens e limites',()=>{
 const t=preparar(exemplo),r=t.render();assert.equal(r.semantica.raciocinio.fonteId,api.analisar(exemplo).fonteId);
 assert.equal(r.semantica.correlacoes[0].evidenciasCompartilhadas.estado,'menos_compativel');assert.equal(r.semantica.correlacoes[0].fonteRaciocinio,r.semantica.raciocinio.fonteId);
 assert(r.texto.includes('a localização ou a história relatada ainda não é concordante'));assert(!r.texto.includes('dá suporte à hipótese de fasciopatia'));
 assert(r.semantica.validacao.correlacoesDivergentes.length);assert.equal(r.modo,'revisao');assert(t.nodes['ks-laudo-status'].textContent.includes('evidências do Radar'));
 assert.equal(t.fields[2].value,exemplo);
 const json=JSON.parse(JSON.stringify(r));t.c.window.preencherLaudoAvaliacaoKineSys(json);assert.equal(JSON.stringify(t.c.window.coletarLaudoAvaliacaoKineSys().semantica.raciocinio),JSON.stringify(json.semantica.raciocinio));
});
caso('metadados de outra HMA não reaparecem no relatório atual',()=>{
 const t=preparar('Dor plantar medial no calcanhar nos primeiros passos.');t.c.window.KineSysMotorClinico3.ultimoPlano.raciocinio=api.analisar(exemplo);
 const r=t.render();assert.equal(r.semantica.raciocinio.origemHMA,t.fields[2].value);assert.equal(r.semantica.raciocinio.hipoteses.find(h=>h.id==='dor_plantar_calcanhar').estado,'compativel_com_relato');
});
caso('texto manual continua preservado dentro da mesma avaliação',()=>{
 const t=preparar(exemplo),r=t.render();t.c.window.preencherLaudoAvaliacaoKineSys({...r,texto:'Redação profissional fictícia.',textoAutomatico:false,revisado:true});
 t.c.window.renderizarLaudoAvaliacaoKineSys();assert(t.nodes['ks-laudo-texto'].value.startsWith('Redação profissional fictícia.'));
});
caso('Radar real mostra entrevista, contraprovas e fontes sem duplicar perguntas',()=>{
 const field={value:exemplo},box={hidden:false,dataset:{}},list={innerHTML:''},old=env.document.getElementById;
 env.escapeHTML=s=>String(s).replace(/[&<>"']/g,x=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x]));
 env.document.getElementById=id=>id==='paciente_hma'?field:id==='ks20_hma_radar'?box:id==='ks20_hma_insights'?list:null;
 try{env.renderizarRadarHMAKineSys();assert(list.innerHTML.includes('Perguntas prioritárias da entrevista'));assert(list.innerHTML.includes('menor compatibilidade'));assert(list.innerHTML.includes('Base científica e limites'));
  const r=JSON.parse(box.dataset.raciocinio);for(const q of r.perguntas)assert.equal(list.innerHTML.split(env.escapeHTML(q.texto)).length-1,1);
  assert.equal(JSON.parse(box.dataset.fatos).raciocinio.fonteId,r.fonteId);
  field.value='';env.renderizarRadarHMAKineSys();assert(box.hidden);assert.equal(list.innerHTML,'');assert.equal(box.dataset.raciocinio,'null');
 }finally{env.document.getElementById=old;}
});
caso('carregamento lazy, cache e banco após região prontos usam a mesma camada',()=>{
 const loader=fs.readFileSync('src/ui/screen_loader-1.25.0.js','utf8'),region=fs.readFileSync('src/clinical/clinical_region_loader-1.0.0.js','utf8'),core=fs.readFileSync('src/core/script-1.18.0.js','utf8');
 assert(loader.indexOf('clinical_evidence_profiles-1.0.0.js')<loader.indexOf('clinical_evidence_reasoning-1.0.0.js'));assert(loader.indexOf('clinical_evidence_reasoning-1.0.0.js')<loader.indexOf('clinical_engine-1.17.0.js'));
 assert(loader.includes('window.renderizarRadarHMAKineSys?.()'));assert(region.includes('KineSysEvidenceProfiles?.instalarBanco'));assert(core.includes("(window.KineSysEvidenceReasoning?.version || 'legado')"));
});
console.log(`${count} cenários de integração HMA/Radar/relatório OK.`);
