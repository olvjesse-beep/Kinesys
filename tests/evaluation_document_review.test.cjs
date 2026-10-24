'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
class Element{
 constructor(tag,doc){this.tagName=tag;this.ownerDocument=doc;this.children=[];this.textContent='';this.events={};this.hidden=false;}
 append(...els){this.children.push(...els);}replaceChildren(...els){this.children=els;}
 addEventListener(name,fn){this.events[name]=fn;}
}
const document={createElement(tag){return new Element(tag,this);}},host=new Element('section',document),c={window:{}};
vm.createContext(c);vm.runInContext(fs.readFileSync('src/clinical/evaluation_document_review-1.0.0.js','utf8'),c);
const descendants=e=>[e,...e.children.flatMap(descendants)],text=e=>[e.textContent,...e.children.map(text)].join('\n');
let context='patient-a',visited=[];
const analysis={perguntas:[{id:'q1',pergunta:'Qual lado?',campoDestino:'paciente_hma',trechos:[{trecho:'<img src=x onerror=evil()> Dor no ombro.'}]},{id:'q2',pergunta:'Qual resultado?',campoDestino:'subtela_mapeamento',trechos:[]}],problemasClinicos:[{regiao:'ombro',lado:'',episodios:[{temporalidade:'atual',duracao:['há 3 dias'],momentos:[]}],sintomas:[{origem:{trecho:'Dor no ombro.'}}]}],matrizEvidencias:[{hipotese:'Hipótese sintética',conclusao:'criterio_registrado_nao_atendido',resultados:[{papel:'criterio_nao_atendido',teste:'Critério A'}]}]};
const options={host,analise:analysis,contexto:context,contextoAtual:()=>context,onRevisar:target=>visited.push(target)};
c.window.KineSysDocumentReview.renderizar(options);
assert(!host.hidden);assert(text(host).includes('Qual lado?'));assert(text(host).includes('não confirma nem exclui um diagnóstico'));
assert.equal(descendants(host).filter(e=>e.tagName==='details').length,3);
assert.equal(descendants(host).filter(e=>e.tagName==='img').length,0,'source shown as literal text, never HTML');
const buttons=descendants(host).filter(e=>e.tagName==='button');assert.equal(buttons.length,2);
buttons[0].events.click();buttons[1].events.click();assert.deepEqual(visited,['paciente_hma','subtela_mapeamento']);
context='patient-b';buttons[0].events.click();assert.equal(visited.length,2,'old callback never navigates in a new patient');
c.window.KineSysDocumentReview.renderizar({...options,analise:null});assert(host.hidden);assert.equal(host.children.length,0);
for(let i=0;i<3;i++)c.window.KineSysDocumentReview.renderizar(options);
assert.equal(descendants(host).filter(e=>e.tagName==='button').length,2,'remount does not duplicate questions/events');
c.window.KineSysDocumentReview.renderizar({...options,analise:{perguntas:[],problemasClinicos:[],matrizEvidencias:[]}});assert(host.hidden);
const ui=fs.readFileSync('screens/tela_avaliacao.html','utf8'),workspace=fs.readFileSync('src/clinical/evaluation_workspace-1.17.0.js','utf8'),loader=fs.readFileSync('src/ui/screen_loader-1.25.0.js','utf8');
assert.equal((ui.match(/id="ks-laudo-revisao-documental"/g)||[]).length,1);
assert(workspace.includes('revisao.replaceChildren();revisao.hidden=true'));assert(workspace.includes("origem?.focus()"));
assert(loader.indexOf('evaluation_document_review-1.0.0.js')<loader.indexOf('evaluation_workspace-1.17.0.js'));
assert(!/\.innerHTML\s*=|fetch\(|localStorage|supabase|confirm\(/.test(fs.readFileSync('src/clinical/evaluation_document_review-1.0.0.js','utf8')));
console.log('Document review: source-safe DOM, targeted navigation, stale patient guard, clear/remount, read-only, unique IDs and loader order OK');
