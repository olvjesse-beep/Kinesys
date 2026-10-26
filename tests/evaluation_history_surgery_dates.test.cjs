'use strict';
// Entirely synthetic; no database, model, network or patient data.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const {fixture}=require('./evaluation_report_integration.test.cjs');
const history='Relata dor no ombro direito que irradia para mão. Essa dor piora ao deitar à noite e agrava ao elevar o braço. Outra coisa. Dor referida na região do tornozelo, principalmente porção medial. Refere que essa dor piora ao caminhar muito ou ficar muito tempo em pé.';
const f=fixture();f.fields[2].value=history;const r=f.render(),section=r.texto.split('História clínica\n\n')[1].split('\n\nAntecedentes e contexto')[0];
assert(section.includes('Relata dor no ombro direito, com irradiação para mão.'));
assert(section.includes('Essa dor piora ao deitar à noite e ao elevar o braço.\n\nRelata dor na região do tornozelo, principalmente na porção medial.'));
assert(section.includes('Essa dor piora ao caminhar muito ou ficar muito tempo em pé.'));
assert(!section.includes('Outra coisa'));assert(!section.includes('Refere que'));
assert.equal(f.fields[2].value,history);assert(r.semantica.marcadoresEstruturais.some(m=>m.trecho==='Outra coisa.'&&m.tipo==='transicao_discursiva'));
assert(r.semantica.validacao.significado.ok);assert.equal(r.validacao.relatoAusente.length,0);
assert(!section.includes('mão direita'));assert(!section.includes('tornozelo direito'),'do not transfer the shoulder side to an unspecified ankle');
const graph=f.c.window.KineSysSemanticGraph;
for(const text of ['Outra coisa importante foi a queda.','O paciente diz "Outra coisa. Senti dor".','Outra coisa: a mãe tem artrite.']){
 const parsed=graph.analisar(text);if(text.startsWith('Outra coisa:'))assert(parsed.proposicoes.every(p=>p.sujeito!=='paciente'));else assert(parsed.fatos.some(f=>f.origens.some(o=>o.trecho.includes('Outra coisa'))));
}
// Actual input helpers with a minimal DOM; no duplicate date label in the saved name.
const nodes={},events={};
class Node {
 constructor(tag='div'){this.tagName=tag.toUpperCase();this.children=[];this.dataset={};this.style={};this.attrs={};this.handlers={};this.value='';this.className='';this.text='';this.classList={add(){},remove(){},contains:()=>false};}
 set textContent(value){this.text=value;this.children=[];}get textContent(){return this.text+this.children.map(c=>c.textContent||'').join('');}
 set innerHTML(value){this.children=[];this.text='';}get innerHTML(){return '';}
 appendChild(n){this.children.push(n);n.parent=this;return n;}
 setAttribute(k,v){this.attrs[k]=v;}removeAttribute(k){delete this.attrs[k];}
 addEventListener(k,fn){(this.handlers[k]||=[]).push(fn);}dispatchEvent(e){for(const fn of this.handlers[e.type]||[])fn(e);}
 querySelectorAll(selector){const all=this.children.flatMap(c=>[c,...(c.querySelectorAll?.('*')||[])]);return all.filter(c=>selector==='*'||selector==='.ks-cirurgia-data'&&c.className==='ks-cirurgia-data'||selector.includes('button')&&c.tagName==='BUTTON');}
 querySelector(s){return this.querySelectorAll(s)[0]||null;}focus(){env.document.activeElement=this;}remove(){this.parent.children=this.parent.children.filter(c=>c!==this);}
}
const env={window:{},console,Event:class{constructor(type){this.type=type;}},document:{readyState:'loading',getElementById:id=>nodes[id]||null,querySelectorAll:()=>[],createElement:tag=>new Node(tag),createTextNode:text=>({textContent:text}),addEventListener(k,fn){events[k]=fn;}}};
for(const id of ['tags_cirurgias','input_cirurgia','sugestao_box'])nodes[id]=new Node(id==='input_cirurgia'?'input':'div');
vm.createContext(env);vm.runInContext(fs.readFileSync('src/ui/input_helpers_core-1.0.0.js','utf8'),env);env.inicializarAutocompleteCirurgia();
env.preencherCirurgiasAvaliacaoKineSys([{chave:'procedimento_a',texto:'Procedimento sintético A',dataCirurgia:'03/2019',origemExtra:'preservada'},{chave:'procedimento_b',texto:'Procedimento sintético B',dataCirurgia:'2021'}]);
assert.equal(nodes.tags_cirurgias.children.length,2);assert.equal(nodes.tags_cirurgias.children[0].querySelector('.ks-cirurgia-data').value,'03/2019');
const first=nodes.tags_cirurgias.children[0].querySelector('.ks-cirurgia-data');first.value='15/03/2019';first.dispatchEvent(new env.Event('input'));
let saved=JSON.parse(JSON.stringify(env.coletarCirurgiasAvaliacaoKineSys()));assert.equal(saved[0].texto,'Procedimento sintético A');assert.equal(saved[0].dataCirurgia,'15/03/2019');assert.equal(saved[1].dataCirurgia,'2021');assert.equal(saved[0].origemExtra,'preservada');
env.preencherCirurgiasAvaliacaoKineSys(saved);assert.deepEqual(JSON.parse(JSON.stringify(env.coletarCirurgiasAvaliacaoKineSys())),saved);
env.adicionarTagCirurgia('procedimento_a','Procedimento sintético A');assert.equal(nodes.tags_cirurgias.children.length,2);assert.equal(env.coletarCirurgiasAvaliacaoKineSys()[0].dataCirurgia,'15/03/2019');
// Roundtrip through the actual clinical-JSON collector and loader, not a second implementation.
env.coletarRestricoesPosOperatorias=()=>({ativo:false});env.preencherRestricoesPosOperatorias=()=>{};env.atualizarVisibilidadeRestricoesPosOp=()=>{};env.atualizarPSFSMedia=()=>{};
const core=fs.readFileSync('src/core/script-1.18.0.js','utf8').replace(/\r\n/g,'\n');vm.runInContext(core.slice(core.indexOf('let clinicaEstruturadaPreservada ='),core.indexOf('\n\nfunction montarContextoMotorParaSalvar')),env);
env.preencherClinicaEstruturada({cirurgias:saved,chaveLegada:{preservar:true}});const json=JSON.parse(JSON.stringify(env.coletarClinicaEstruturada()));assert.equal(json.cirurgias[0].dataCirurgia,'15/03/2019');assert(json.chaveLegada.preservar);
env.preencherClinicaEstruturada(json);assert.equal(env.coletarCirurgiasAvaliacaoKineSys()[1].dataCirurgia,'2021');
f.nodes.tags_cirurgias=nodes.tags_cirurgias;const dated=f.render();assert(dated.texto.includes('Procedimento sintético A (data informada: 15/03/2019)'));assert(dated.texto.includes('Procedimento sintético B (data informada: 2021)'));assert(!dated.texto.includes('Data (opcional)'));assert(dated.semantica.validacao.significado.ok);assert.equal(dated.semantica.validacao.ausentes.length,0);assert.equal(dated.modo,'revisao','unresolved source references must still require review');
assert.equal(dated.validacao.listasAusentes.length,0);
env.preencherClinicaEstruturada({});assert.equal(env.coletarCirurgiasAvaliacaoKineSys().length,0,'new context clears the previous surgeries and dates');
env.preencherCirurgiasAvaliacaoKineSys([{chave:'antigo',texto:'Procedimento legado sem data'}]);assert.equal(env.coletarCirurgiasAvaliacaoKineSys()[0].dataCirurgia,'');
env.preencherCirurgiasAvaliacaoKineSys(saved);nodes.tags_cirurgias.children[0].children.at(-1).onclick();assert.equal(env.coletarCirurgiasAvaliacaoKineSys()[0].texto,'Procedimento sintético B');
f.nodes.tags_cirurgias=nodes.tags_cirurgias;assert(!f.render().texto.includes('Procedimento sintético A'));
// Saved professional text is not regenerated by a template revision.
f.c.window.preencherLaudoAvaliacaoKineSys({...dated,texto:'Texto profissional protegido.',revisado:true});f.c.window.renderizarLaudoAvaliacaoKineSys();assert(f.nodes['ks-laudo-texto'].value.startsWith('Texto profissional protegido.'));
assert(core.includes('window.preencherCirurgiasAvaliacaoKineSys?.(avaliacaoRecente.mapeamento?.clinicaEstruturada?.cirurgias||avaliacaoRecente.cirurgias||[])'));
assert(core.includes('const tagsCirurgiasArr=window.coletarCirurgiasAvaliacaoKineSys?.()||[]'));
const exportLine=fs.readFileSync('src/patient/prontuario_export_impl.js','utf8').split(/\r?\n/).find(l=>l.startsWith('function itensClinicos('));
const exported=vm.runInNewContext(exportLine+'; itensClinicos('+JSON.stringify(saved)+')');assert(exported.includes('Procedimento sintético A (data informada: 15/03/2019)'));assert(exported.includes('Procedimento sintético B (data informada: 2021)'));
assert(fs.readFileSync('styles/design_evaluation_context-1.18.3.css','utf8').includes('#tela_avaliacao #tags_cirurgias .tag-cirurgia span{color:inherit;cursor:default}'),'legacy white tag spans must not hide the surgery name or date label');
console.log('História clínica: redação por estrutura, transições auditadas, escopo e original preservados. Cirurgias: datas individuais, JSON/reabertura, legado, remoção e isolamento OK.');
