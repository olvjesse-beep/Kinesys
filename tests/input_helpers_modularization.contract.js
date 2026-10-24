'use strict';
const fs=require('fs'); const assert=require('assert');
const core=fs.readFileSync('src/core/script-1.18.0.js','utf8');
const mod=fs.readFileSync('src/ui/input_helpers_core-1.0.0.js','utf8');
const html=fs.readFileSync('index.html','utf8');
assert(!core.includes('TERMÔMETRO DA DOR (ESCALA EVA)'), 'EVA ainda embutido no monólito');
assert(!core.includes('AUTOCOMPLETES (RESTAURADOS E ORIGINAIS)'), 'autocompletes ainda embutidos no monólito');
assert(mod.includes('TERMÔMETRO DA DOR (ESCALA EVA)'), 'módulo perdeu EVA');
assert(mod.includes('AUTOCOMPLETES (RESTAURADOS E ORIGINAIS)'), 'módulo perdeu autocompletes');
for(const fn of ['aplicarClasseEvaKineSys','toggleCirurgias','expandirSugestoesIndividuais','adicionarTagCirurgia','adicionarTagMedicamento']) assert(mod.includes(`function ${fn}(`),`módulo perdeu ${fn}`);
for(const state of ['OPCOES_INDIVIDUAIS_OCUPACAO_ESPORTE','OPCOES_INDIVIDUAIS_CIRURGIAS']) assert(mod.includes(`const ${state} =`),`módulo perdeu ${state}`);
assert(!core.includes('OPCOES_INDIVIDUAIS_OCUPACAO_ESPORTE'), 'estado autocomplete vazou para core');
assert(!core.includes('OPCOES_INDIVIDUAIS_CIRURGIAS'), 'estado cirurgias vazou para core');
const tag=(html.match(/<script defer src="src\/ui\/input_helpers_core-1\.0\.0\.js\?v=[^"]+"><\/script>/)||[])[0];
const cadastro='<script defer src="src/core/cadastro_validacoes_core-1.0.0.js?v=20260911-phase4e-r1"></script>';
const media='<script defer src="src/core/midias_core-1.0.0.js?v=20260911-phase4d-r1"></script>';
const main='<script defer src="src/core/script-1.18.0.js';
assert(tag,'index não carrega input helpers com revisão explícita');
assert(html.indexOf(cadastro)<html.indexOf(tag),'input helpers deve carregar após cadastro validations');
assert(/<script defer src="src\/core\/midias_core-1\.0\.0\.js/.test(html),'módulo de mídias deve manter carregamento independente');
assert(html.indexOf(tag)<html.indexOf(main),'input helpers deve carregar antes do core consumidor');
console.log('Input helpers modularization contract Phase 4F: OK');

const vm=require('vm');
const nodes={},eventos={};
function node(){return {value:'',dataset:{},style:{},attributes:{},children:[],handlers:{},classList:{add(){},remove(){}},setAttribute(k,v){this.attributes[k]=v;},removeAttribute(k){delete this.attributes[k];},addEventListener(k,fn){(this.handlers[k]||(this.handlers[k]=[])).push(fn);},dispatchEvent(e){(this.handlers[e.type]||[]).forEach(fn=>fn.call(this,e));},appendChild(n){this.children.push(n);},contains(){return false;},focus(){},set innerHTML(v){this.children=[];},get innerHTML(){return '';},set textContent(v){this.text=v;},get textContent(){return (this.text||'')+this.children.map(c=>c.textContent||'').join('');}};}
const env={window:{},Event:function(type){this.type=type;},console,removerAcentos:s=>String(s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase(),obterTextoExibicao:x=>typeof x==='string'?x:x.exibicao,
  dicionarioOcupacoesEsportes:{corrida:{tipo:'esporte',exibicao:'Corrida'},professor:{tipo:'profissao',exibicao:'Professor'}},dicionarioMedicamentos:{dipirona:'Dipirona'},dicionarioCirurgias:{artroscopia:{exibicao:'Artroscopia de joelho'}},
  document:{readyState:'loading',getElementById:id=>nodes[id]||null,createElement:()=>node(),createTextNode:text=>({textContent:text}),addEventListener(k,fn){(eventos[k]||(eventos[k]=[])).push(fn);}}};
vm.runInNewContext(mod,env); // avaliação ainda não foi montada
for(const id of ['paciente_esporte','sugestao_box_esporte','paciente_ocupacao','sugestao_box_profissao','input_cirurgia','sugestao_box','tags_cirurgias','input_medicamento','sugestao_box_med','tags_medicamentos'])nodes[id]=node();
function montar(){(eventos['kinesys:tela-dom-pronta']||[]).forEach(fn=>fn({detail:{id:'tela_avaliacao'}}));}
montar();montar();
for(const [id,box,termo] of [['paciente_esporte','sugestao_box_esporte','corr'],['input_cirurgia','sugestao_box','artro'],['input_medicamento','sugestao_box_med','dipi']]){
  assert.strictEqual(nodes[id].handlers.input.length,1,'montagem repetida não deve duplicar eventos de '+id);
  nodes[id].value=termo;nodes[id].dispatchEvent(new env.Event('input'));
  assert.ok(nodes[box].children.length,'autocomplete deve funcionar quando a avaliação monta depois do aplicativo: '+id);
}
nodes.sugestao_box_med.children[0].onclick({stopPropagation(){}});
assert.strictEqual(nodes.tags_medicamentos.children.length,1,'escolher medicamento deve criar apenas uma tag');
nodes.paciente_esporte=node();nodes.sugestao_box_esporte=node();montar();
nodes.paciente_esporte.value='corr';nodes.paciente_esporte.dispatchEvent(new env.Event('input'));
assert.ok(nodes.sugestao_box_esporte.children.length,'remontagem da tela deve continuar oferecendo as sugestões');
console.log('Autocomplete lazy mounting and remounting: OK');

// Catalog can finish loading after the user already focused and typed.
delete env.dicionarioMedicamentos;
env.document.activeElement=nodes.input_medicamento;
nodes.input_medicamento.value='dipi';nodes.input_medicamento.dispatchEvent(new env.Event('input'));
assert.match(nodes.sugestao_box_med.children[0].textContent,/Carregando catálogo/);
env.dicionarioMedicamentos={anlodipino:'Anlodipino',dipirona:'Dipirona'};
(eventos['kinesys:tela-modulos-prontos']||[]).forEach(fn=>fn({detail:{id:'tela_avaliacao'}}));
assert.equal(nodes.sugestao_box_med.children[0].textContent,'Dipirona','active query must refresh and rank direct prefix first without another keystroke');
const key=(input,value)=>input.dispatchEvent({type:'keydown',key:value,preventDefault(){},stopPropagation(){}});
key(nodes.input_medicamento,'ArrowDown');assert.ok(nodes.input_medicamento.attributes['aria-activedescendant']);key(nodes.input_medicamento,'Enter');
assert.equal(nodes.tags_medicamentos.children.length,1,'choosing existing medication must not duplicate it');
assert.equal(nodes.input_medicamento.attributes['aria-expanded'],'false');
nodes.paciente_esporte.value='corr';nodes.paciente_esporte.dispatchEvent(new env.Event('input'));key(nodes.paciente_esporte,'ArrowDown');key(nodes.paciente_esporte,'Enter');
assert.equal(nodes.paciente_esporte.value,'Corrida');
nodes.paciente_esporte.dispatchEvent(new env.Event('input'));key(nodes.paciente_esporte,'Escape');assert.equal(nodes.paciente_esporte.attributes['aria-expanded'],'false');
nodes.paciente_esporte.dispatchEvent(new env.Event('input'));(eventos.click||[]).forEach(fn=>fn({target:{}}));assert.equal(nodes.paciente_esporte.attributes['aria-expanded'],'false','outside click must close visually and accessibly');
nodes.input_cirurgia.value='artro';nodes.input_cirurgia.dispatchEvent(new env.Event('input'));key(nodes.input_cirurgia,'ArrowDown');key(nodes.input_cirurgia,'Enter');
assert.equal(nodes.tags_cirurgias.children.length,1);assert.equal(nodes.tags_cirurgias.children[0].dataset.chave,'artroscopia');
montar();assert.equal(nodes.input_cirurgia.handlers.input.length,1);assert.equal(nodes.input_medicamento.handlers.input.length,1);
assert.equal(env.buscarSugestoesClinicasKineSys('esporte','prof').length,0,'profession cannot appear as a sport');
console.log('Autocomplete late catalog, ranking, keyboard, deduplication and accessible dismissal: OK');

const catalogEnv={window:{},console,document:{readyState:'loading',getElementById:()=>null,addEventListener(){}},obterTextoExibicao:x=>typeof x==='string'?x:x.exibicao};
const catalogs=['medicamentos_anvisa-20261024','medicamentos','cirurgias','ocupacoes_esportes'].map(name=>fs.readFileSync('database/'+name+'.js','utf8')).join('\n');
vm.runInNewContext(catalogs+'\n'+mod,catalogEnv);
assert.match(catalogEnv.buscarSugestoesClinicasKineSys('medicamento','dipi')[0].texto,/Dipirona/);
assert.ok(catalogEnv.buscarSugestoesClinicasKineSys('cirurgia','artro').some(x=>/Artroscopia/.test(x.texto)));
assert.ok(catalogEnv.buscarSugestoesClinicasKineSys('esporte','corr').some(x=>/Corrida/.test(x.texto)));
assert.ok(catalogEnv.buscarSugestoesClinicasKineSys('esporte','musculação').length,'accented activity must match production dictionary');
assert.equal(catalogEnv.buscarSugestoesClinicasKineSys('esporte','musculação')[0].texto,'Musculação','exact activity must precede siblings sharing the same catalog key');
console.log('Production dictionaries: medication, surgery and accented activity searches OK');
