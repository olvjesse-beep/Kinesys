'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const {buildCatalog,serialize,parseCsv}=require('../tools/import_medication_catalog.cjs');
const DATA='database/medicamentos_anvisa-20261024.js',ADAPTER='database/medicamentos.js';
const raw=fs.readFileSync(DATA,'utf8'),adapter=fs.readFileSync(ADAPTER,'utf8');
function load(){const c={};vm.createContext(c);vm.runInContext(raw,c);vm.runInContext(adapter,c);return c;}
const c=load(),api=c.KineSysMedicamentos,source=c.KineSysMedicamentosAnvisa;
assert.equal(api.total,6959);assert.equal(source.metadata.linhasOrigem,228869);assert.equal(source.metadata.linhasAtivas,85092);assert.equal(source.metadata.excluidasSemIdentidade,12367);
assert.equal(source.metadata.sha256,'f0b546e2d3a737a90fbc866348356cd766344bd2f4b8f488a43d66a0d7a30877');
assert.equal(new Set(source.products.map(p=>p.id)).size,api.total);
const norm=s=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\s+/g,' ').trim();
assert.equal(new Set(source.products.map(p=>api.obter(norm(p.nome)===norm(p.principioAtivo)?p.nome:p.nome+' ('+p.principioAtivo+')')?.chave)).size,api.total,'every product remains individually retrievable');
for(const p of source.products){assert(p.nome&&p.principioAtivo&&p.registros.length);assert(!/[\uFFFD\x00]/.test(p.nome+p.principioAtivo),'no broken accent/encoding');assert(p.registros.every(r=>/^\d+$/.test(r)));}
const exact=name=>{const x=api.buscar(name,50).find(x=>x.nome.toLowerCase()===name.toLowerCase());assert(x,'missing '+name);return x;};
assert.equal(exact('Naproxeno').texto,'Naproxeno');assert.equal(api.buscar('naproxeno')[0].nome,'Naproxeno');
assert.equal(api.buscar('dipi')[0].nome.startsWith('Dipirona'),true,'generic prefix before unrelated commercial prefix');
for(const name of ['ibuprofeno','paracetamol','losartana','pregabalina','omeprazol','amoxicilina','semaglutida','ondansetrona','atorvastatina','metformina','levotiroxina','enoxaparina','tansulosina','sertralina','etodolaco'])assert(api.buscar(name).length,name+' must be searchable');
assert.equal(exact('Dorflex uno').principioAtivo,'dipirona monoidratada');assert(!exact('Dorflex uno').texto.includes('tramadol'));
assert.match(exact('Dorflex').principioAtivo,/orfenadrina.*dipirona.*cafeína/);assert.notEqual(exact('Dorflex').chave,exact('Dorflex uno').chave);
assert.match(exact('Vonau').principioAtivo,/ondansetrona/);assert(!exact('Vonau').texto.includes('vonoprazana'));
assert.equal(exact('Lantus').principioAtivo,'insulina glargina');assert.equal(exact('Novorapid').principioAtivo,'insulina asparte');
assert.match(exact('Tylex').principioAtivo,/paracetamol.*codeína/);assert.match(exact('Lisador').principioAtivo,/dipirona.*prometazina.*adifenina/);
assert.match(exact('Infralax').principioAtivo,/paracetamol.*cafeína.*carisoprodol.*diclofenaco/);
assert.deepEqual(Array.from(api.buscar('SÓDICO NAPROXENO'),x=>x.chave),Array.from(api.buscar('sodico naproxeno'),x=>x.chave));
assert.equal(api.buscar('remedio pra dor').length,0,'a vague complaint must not choose ibuprofen');assert.equal(api.buscar('remedio pra afinar sangue').length,0,'vague description must not select warfarin');
assert.equal(api.buscar('n').length,0);assert(api.buscar('cloridrato').length<=20);assert.equal(api.obter('AINE (Ibuprofeno / Advil)'),null,'legacy labels are not silently reinterpreted');
assert(!adapter.includes('tramadol / Dorflex Uno'));assert(!adapter.includes('remedio pra dor'));
// Missing/late source never falls back to a clinically incorrect old table.
const late={};vm.createContext(late);vm.runInContext(adapter,late);assert.equal(late.KineSysMedicamentos.buscar('naproxeno'),null);vm.runInContext(raw,late);assert.equal(late.KineSysMedicamentos.buscar('naproxeno')[0].texto,'Naproxeno');
// Reproducible input, quoted fields, duplicates, salts, true products and inactive rows.
assert.deepEqual(parseCsv('a;b\n"A;B";"C""D"\n'),[['a','b'],['A;B','C"D']]);
const head='TIPO_PRODUTO;NOME_PRODUTO;PRINCIPIO_ATIVO;SITUACAO_REGISTRO;NUMERO_REGISTRO_PRODUTO;CLASSE_TERAPEUTICA;CATEGORIA_REGULATORIA\n';
const csv=head+'MEDICAMENTO;Marca;"sal A, forma A";Ativo;123;Classe;Similar\nMEDICAMENTO;Marca;"sal A, forma A";Ativo;456;Classe;Similar\nMEDICAMENTO;Marca;componente B;Ativo;789;Classe;Similar\nMEDICAMENTO;Antigo;ingrediente;Inativo;987;Classe;Similar\nMEDICAMENTO;Sem dado;;Ativo;852;Classe;Similar\n';
const built=buildCatalog(Buffer.from(csv,'latin1'),'2026-10-24');assert.equal(built.products.length,2);assert.equal(built.metadata.excluidasSemIdentidade,1);assert.equal(built.products[1].principioAtivo,'sal A, forma A');assert.equal(built.products[1].registros.length,2);assert.equal(serialize(built),serialize(buildCatalog(Buffer.from(csv,'latin1'),'2026-10-24')));
assert.throws(()=>buildCatalog(Buffer.from('wrong;header\n'),'2026-10-24'),/Missing column/);assert.throws(()=>parseCsv('"broken'),/Unclosed/);
console.log('Medication source identity, 6,959 products, ranking, accents, generic/brand separation and reproducible importer OK');

// Real autocomplete code: click, keyboard, free text, remount and label roundtrip.
const helpers=fs.readFileSync('src/ui/input_helpers_core-1.0.0.js','utf8'),nodes={},events={};
function node(){return {dataset:{},style:{},attributes:{},children:[],handlers:{},value:'',classList:{add(){},remove(){}},setAttribute(k,v){this.attributes[k]=v;},removeAttribute(k){delete this.attributes[k];},addEventListener(k,fn){(this.handlers[k]||(this.handlers[k]=[])).push(fn);},dispatchEvent(e){for(const f of this.handlers[e.type]||[])f(e);},appendChild(n){this.children.push(n);},contains(){return false;},remove(){nodes.tags_medicamentos.children=nodes.tags_medicamentos.children.filter(x=>x!==this);},set innerHTML(v){this.children=[];},set textContent(v){this.text=v;},get textContent(){return (this.text||'')+this.children.map(x=>x.textContent||'').join('');}};}
const env={window:{},console,Event:function(type){this.type=type;},document:{readyState:'loading',getElementById:id=>nodes[id]||null,createElement:()=>node(),createTextNode:s=>({textContent:s}),addEventListener(k,f){(events[k]||(events[k]=[])).push(f);}}};
vm.createContext(env);vm.runInContext(raw,env);vm.runInContext(adapter,env);vm.runInContext(helpers,env);
for(const id of ['input_medicamento','sugestao_box_med','tags_medicamentos'])nodes[id]=node();
const init=()=>env.window.inicializarSugestoesAvaliacaoKineSys(),input=nodes.input_medicamento,box=nodes.sugestao_box_med;
init();init();assert.equal(input.handlers.input.length,1);
const type=s=>{input.value=s;input.dispatchEvent({type:'input'});};
const key=k=>input.dispatchEvent({type:'keydown',key:k,preventDefault(){},stopPropagation(){}});
type('dorflex uno');assert.equal(box.children[0].children[0].textContent,'Dorflex uno');assert.match(box.children[0].children[1].textContent,/dipirona/);
key('ArrowDown');key('Enter');assert.equal(nodes.tags_medicamentos.children.length,1);assert.equal(nodes.tags_medicamentos.children[0].textContent.replace('✕',''),exact('Dorflex uno').texto);
type('dorflex uno');box.children[0].onclick({stopPropagation(){}});assert.equal(nodes.tags_medicamentos.children.length,1);
type('naproxeno');key('ArrowDown');key('Enter');assert.equal(nodes.tags_medicamentos.children.length,2);
type('Medicamento relatado, 25 mg');key('Enter');assert.equal(nodes.tags_medicamentos.children[2].textContent.replace('✕',''),'Medicamento relatado, 25 mg','no inference or dose loss');
const labels=nodes.tags_medicamentos.children.map(x=>x.textContent.replace('✕',''));
nodes.tags_medicamentos.children=[];for(const label of JSON.parse(JSON.stringify(labels)))env.adicionarTagMedicamento(label);assert.deepEqual(nodes.tags_medicamentos.children.map(x=>x.textContent.replace('✕','')),labels);
env.adicionarTagMedicamento('AINE (Ibuprofeno / Advil)');assert.equal(nodes.tags_medicamentos.children.at(-1).textContent.replace('✕',''),'AINE (Ibuprofeno / Advil)','historical labels remain verbatim');
type('naproxeno');key('Escape');assert.equal(input.attributes['aria-expanded'],'false');
console.log('Real medication autocomplete: selection, independent tags, deduplication, free text, keyboard and legacy roundtrip OK');

// Real report generator consumes the exact selected tag, not all search aliases.
const {fixture}=require('./evaluation_report_integration.test.cjs');
const f=fixture(),selected=exact('Dorflex uno').texto;
f.nodes.tags_medicamentos={children:[{cloneNode:()=>({querySelectorAll:()=>[],textContent:selected})}],textContent:selected};
const result=f.render();assert(result.texto.includes(selected));assert(!result.texto.includes('Tramal'));assert(!result.texto.includes('Tramadol'));
f.nodes.tags_medicamentos={children:[{cloneNode:()=>({querySelectorAll:()=>[],textContent:'Naproxeno, 250 mg, conforme relato'})}],textContent:'Naproxeno, 250 mg, conforme relato'};
assert(f.render().texto.includes('250 mg'),'dose remains reported, never inferred');
const loader=fs.readFileSync('src/ui/screen_loader-1.25.0.js','utf8');assert(loader.indexOf(DATA)<loader.indexOf(ADAPTER),'official data loads before adapter');
const css=fs.readFileSync('styles/design_evaluation_context-1.18.3.css','utf8');
assert(css.includes('.ks-context-card:has(#input_medicamento[aria-expanded="true"])>.clinical-actions{position:static!important}'),'sticky footer must not cover medication choices on mobile');
assert(fs.readFileSync('.github/workflows/agenda-edit-contract.yml','utf8').includes('node tests/medication_catalog.test.cjs'));
console.log('Medication → report integration, source loading order and permanent hosted regression gate OK');
