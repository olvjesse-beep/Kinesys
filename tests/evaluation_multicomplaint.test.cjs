'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {fixture}=require('./evaluation_report_integration.test.cjs');
const graph=fs.readFileSync('src/clinical/clinical_semantic_graph-1.0.0.js','utf8');
let count=0;function caso(nome,fn){fn();count++;console.log('Multiqueixas: '+nome+' OK');}
function report(hma){const t=fixture();vm.runInContext(graph,t.c);t.fields[2].value=hma;return t;}
caso('módulo semântico real integra origens, problemas, significado e JSON',()=>{
 const t=report('Refere dor no ombro direito há 3 semanas. Nega dor no joelho esquerdo.');const r=t.render();
 assert(r.semantica.proposicoes.length);assert(r.semantica.problemas.some(p=>p.regiaoId==='ombro'));
 assert.equal(r.semantica.validacao.significado.ausentes.length,0,JSON.stringify(r.semantica.validacao.significado));
 assert.equal(r.validacao.relatoAusente.length,0);assert.equal(t.fields[2].value,r.semantica.origemHMA);
 const salvo=JSON.parse(JSON.stringify(r));t.c.window.preencherLaudoAvaliacaoKineSys(salvo);assert.equal(JSON.stringify(t.c.window.coletarLaudoAvaliacaoKineSys().semantica),JSON.stringify(salvo.semantica));
});
caso('duas hipóteses na mesma região conservam testes e limites próprios',()=>{
 const t=report('Dor cervical com cefaleia referida.');
 t.c.window.KineSysMotorClinico3.ultimoPlano.hipoteses.push({id:'hipotese_b',nome:'Hipótese sintética B',regiaoId:'cervical',limiar:2});
 t.tests=[{regiaoId:'cervical',regiao:'Coluna cervical',id:'radiculopatia_cervical',nome:'Radiculopatia Cervical',achados:[{texto:'Teste exclusivo A',resultado:'positivo'}]},
 {regiaoId:'cervical',regiao:'Coluna cervical',id:'hipotese_b',nome:'Hipótese sintética B',achados:[{texto:'Teste exclusivo B1',resultado:'negativo'},{texto:'Teste exclusivo B2',resultado:'negativo'}]}];
 const r=t.render(),cs=r.semantica.correlacoes;
 assert.equal(cs.length,2);assert(cs[0].resultados.every(x=>x.eixoId==='radiculopatia_cervical'));assert(cs[1].resultados.every(x=>x.eixoId==='hipotese_b'));
 assert(r.texto.includes('radiculopatia cervical'));assert(r.texto.includes('hipótese sintética B'));assert(r.texto.includes('reduziram o suporte')||r.texto.includes('não ofereceu suporte'));
 const sinteses=r.semantica.fatos.filter(f=>f.tipo==='sintese');assert.equal(sinteses.length,2);
 for(const edge of r.semantica.relacoes.filter(e=>e.tipo==='fundamenta_sintese_documental'))assert.equal(r.semantica.fatos.find(f=>f.id===edge.de).eixoId,edge.hipoteseId);
});
caso('troca de lado com vocabulário completo falha na validação de significado',()=>{
 const t=report('Refere dormência na mão esquerda.');const r=t.render();
 const bad=t.c.window.validarTextoSemanticoAvaliacaoKineSys(r.texto.replace('mão esquerda','mão direita'));
 assert(!bad.ok);assert(bad.significado.ausentes.length);assert(bad.significado.introduzidas.length);
});
caso('exame de outra região não confirma hipótese nem apaga a queixa sem exame',()=>{
 const t=report('Dor no ombro direito. Dor no joelho esquerdo.');
 const r=t.render();assert(r.texto.includes('ombro direito'));assert(r.texto.includes('joelho esquerdo'));
 assert(!r.semantica.correlacoes.some(c=>c.regiao==='Joelho'&&c.criterioAtendido===true));
 assert(r.texto.includes('ainda não dispõem de resultados de exame registrados'));assert.equal(r.modo,'revisao');
 assert(t.nodes['ks-laudo-status'].textContent.includes('Queixas ainda sem exame registrado'));
 assert.deepEqual(Array.from(r.semantica.coberturaProblemas,p=>p.regiaoId).sort(),['joelho','ombro']);
 assert(r.semantica.coberturaProblemas.every(p=>!p.possuiExameRegistrado));
 assert.deepEqual(Array.from(t.regions,r=>r.dataset.regiao),['cervical','cefaleia'],'documentar lacuna não pode selecionar uma região removida pelo profissional');
});
console.log(`${count} cenários de integração real do relatório multiqueixas OK.`);
