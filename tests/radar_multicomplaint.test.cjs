'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict'),vm=require('node:vm');
const core=fs.readFileSync('src/core/script-1.18.0.js','utf8').replace(/\r\n/g,'\n');
const helpers=fs.readFileSync('src/patient/patient_form_helpers_core-1.0.0.js','utf8');
let historia='',achados=[],selecionadas=[],controles=[];
const env={console,setTimeout:()=>0,clearTimeout(){},coletarContextoClinico:()=>({hma:historia}),
 document:{readyState:'loading',addEventListener(){},querySelector:()=>null,querySelectorAll:s=>s==='#grupo_regioes_mapeamento input:checked'?selecionadas:s==='#grupo_regioes_mapeamento input[data-regiao]'?controles:[],getElementById:id=>id==='paciente_hma'?{value:historia}:id==='paciente_nome'?{value:'Pessoa fictícia'}:id.startsWith('chk_regiao_')?controles.find(c=>c.dataset.regiao===id.slice(11))||null:null}};
env.window=env;env.coletarAchadosLaudoKineSys=()=>achados;vm.createContext(env);
const inicio=core.lastIndexOf('(function () {',core.indexOf('var VERSAO_MOTOR_HMA')),fim=core.indexOf('/* ==========================================================================',inicio);
for(const code of [core.slice(core.indexOf('function kinesysDividirClausulasHMA'),core.indexOf('function confirmarLeituraHMAKineSys')),helpers.slice(helpers.indexOf('function removerAcentos'),helpers.indexOf('function obterTextoExibicao')),core.slice(core.indexOf('const TERMOS_REGIAO_ESTRITOS'),core.indexOf('function analisarPadroesIrradiacao')),core.slice(core.indexOf('function trechoDesdeUltimaQuebraNegacao'),core.indexOf('function detectarAlertasTextuaisHMA')),core.slice(inicio,fim)])vm.runInContext(code,env);
for(const file of ['database/mapeamento_clinico.js','database/regioes/ombro-ext-1.0.0.js','src/clinical/clinical_language_rules-1.0.0.js','src/clinical/clinical_semantic_graph-1.0.0.js','src/clinical/clinical_reasoning_hma-3.0.0.js','src/clinical/clinical_reasoning_shoulder-3.1.0.js','src/clinical/clinical_reasoning_elbow-3.1.0.js','src/clinical/clinical_reasoning_wrist-3.1.0.js','src/clinical/clinical_reasoning_cervical-3.1.0.js'])vm.runInContext(fs.readFileSync(file,'utf8'),env);
let total=0;function caso(nome,fn){selecionadas=[];controles=[];achados=[];fn();total++;console.log('Radar multiqueixas: '+nome+' OK');}
const gerar=hma=>{historia=hma;return env.gerarPlanoClinicoHMAKineSys();};
caso('quatro regiões independentes, hipóteses e testes com bancos reais',()=>{
 const p=gerar('Dor no ombro direito ao elevar o braço acima da cabeça. Dor focal no epicôndilo lateral esquerdo ao apertar e estender o punho. Dor anterior no joelho direito ao agachar e subir escadas. Dor lateral no quadril esquerdo ao deitar sobre o lado doloroso.');
 const ids=Array.from(p.regioes,r=>r.id);for(const id of ['ombro','cotovelo','joelho','quadril']){
  assert(ids.includes(id),JSON.stringify(ids));assert(p.hipoteses.some(h=>h.regiaoId===id),`sem hipóteses em ${id}`);
  assert(p.exame.testesPrioritarios.some(t=>t.regiaoIds.includes(id)),`sem verificação prioritária em ${id}`);
 }
 assert(!ids.includes('punho_mao'),'movimento provocativo do punho não é uma quinta queixa local');
 assert(p.hipoteses.every(h=>h.problemaIds.length));assert(p.exame.testesPrioritarios.every(t=>t.hipoteseIds.length));
 assert.equal(p.problemas.length,4);assert(!/diagnóstico confirmado/i.test(p.aviso));
});
caso('irradiação não vira doença local, queixa independente permanece',()=>{
 const p=gerar('Dor cervical que desce pelo braço até a mão com dormência. Além disso, dor anterior no joelho direito ao agachar e subir escadas.');
 assert(p.regioes.some(r=>r.id==='cervical'));assert(p.regioes.some(r=>r.id==='joelho'));assert(!p.regioes.some(r=>r.id==='punho_mao'));
 assert(!p.hmaPorRegiao.joelho.includes('dormência'));assert(p.hmaPorRegiao.cervical.includes('dormência'));
});
caso('negação e familiar não criam regiões ou hipóteses da própria pessoa',()=>{
 const p=gerar('Minha irmã apresenta dor no quadril esquerdo. Nega dor no ombro. Dor anterior no joelho direito ao agachar e subir escadas.');
 assert.deepEqual(Array.from(p.regioes,r=>r.id),['joelho']);assert(p.hipoteses.every(h=>h.regiaoId==='joelho'));
});
caso('rótulo genérico em muitas regiões não força diagnósticos',()=>{
 const p=gerar('Dor no ombro. Dor no joelho. Dor no quadril.');
 assert.equal(p.regioes.length,3);assert(p.exame.coberturaPorRegiao.length===3);
 assert(p.lacunas.some(l=>l.includes('sem hipótese específica')));assert(!p.hipoteses.some(h=>h.exameAtual.situacao==='achados_favoraveis'));
});
caso('remoção manual continua soberana sobre a HMA',()=>{
 controles=[{dataset:{regiao:'joelho',tocadoManualmente:'true'}},{dataset:{regiao:'ombro',tocadoManualmente:'true'}}];selecionadas=[controles[0]];
 const p=gerar('Dor no joelho ao agachar. Dor no ombro ao elevar o braço. Dor no quadril ao deitar.');
 assert.deepEqual(Array.from(p.regioes,r=>r.id),['joelho']);
});
caso('exames ligados a duas hipóteses mantêm resultados separados',()=>{
 historia='Dor anterior no joelho com dor nas escadas e travamento do joelho com dor na interlinha.';
 const base=env.gerarPlanoClinicoHMAKineSys(),hs=base.hipoteses.filter(h=>h.regiaoId==='joelho'&&h.testes.length).slice(0,2);assert.equal(hs.length,2);
 achados=hs.map((h,i)=>({id:h.id,regiaoId:h.regiaoId,grupo:h.grupo,achados:h.testes.map(texto=>({texto,resultado:i?'negativo':'positivo'}))}));
 const p=env.gerarPlanoClinicoHMAKineSys();assert(p.hipoteses.find(h=>h.id===hs[0].id).exameAtual.positivos>0);assert.equal(p.hipoteses.find(h=>h.id===hs[1].id).exameAtual.positivos,0);
});
caso('nova HMA não herda lista de problemas da anterior',()=>{
 gerar('Dor no ombro. Dor no joelho. Dor no quadril.');const p=gerar('Dor lateral no quadril ao deitar sobre o lado doloroso.');
 assert.deepEqual(Array.from(p.regioes,r=>r.id),['quadril']);assert(p.problemas.every(pr=>pr.regiaoId==='quadril'));
});
caso('biópsia cervical contextualiza ombro sem criar nova queixa cervical',()=>{
 const p=gerar('Ombro caído após biópsia cervical, com fraqueza e atrofia do trapézio.');
 assert(p.regioes.some(r=>r.id==='ombro'));assert(!p.problemas.some(pr=>pr.regiaoId==='cervical'));
 assert(p.hmaPorRegiao.ombro.includes('biópsia cervical'));assert(p.hipoteses.some(h=>h.id==='neuropatia_acessorio_espinal'));
});
caso('trajeto do campo estruturado não vaza de cervical para joelho',()=>{
 const anterior=env.coletarContextoClinico;env.coletarContextoClinico=()=>({hma:historia,origemIrradiacao:'cervical',irradiacao:'braço e mão com dormência'});
 try{
  const p=gerar('Dor cervical. Dor anterior no joelho direito ao agachar e subir escadas.');
  assert.equal(p.contextoIrradiacaoPorRegiao.cervical.irradiacao,'braço e mão com dormência');assert.equal(p.contextoIrradiacaoPorRegiao.joelho.irradiacao,'');
  assert(!p.hipoteses.filter(h=>h.regiaoId==='joelho').some(h=>h.motivos?.some(m=>/dormencia|dormência/.test(m))));
 }finally{env.coletarContextoClinico=anterior;}
});
console.log(`${total} cenários com analisador HMA e bancos clínicos reais OK.`);
module.exports={env,gerar,limpar(){selecionadas=[];controles=[];achados=[];}};
