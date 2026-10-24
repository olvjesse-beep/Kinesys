'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),{fixture}=require('./evaluation_report_integration.test.cjs');
const c={window:{}};vm.createContext(c);for(const f of ['clinical_language_rules-1.0.0.js','clinical_semantic_graph-1.0.0.js','clinical_document_analyzer-1.0.0.js'])vm.runInContext(fs.readFileSync('src/clinical/'+f,'utf8'),c);
const api=c.window.KineSysClinicalLanguage,graph=c.window.KineSysSemanticGraph;let count=0;
function test(name,fn){fn();count++;console.log('PASS language: '+name);}
const references=r=>r.relacoes.filter(x=>x.tipo==='referencia_contextual_resolvida');
function report(text){const f=fixture();f.fields[2].value=text;return {f,r:f.render()};}
test('tokens preserve accented/decomposed original offsets and decimal dose',()=>{
 const source='Mão / ma\u0303o: 25,5 mg; pés.';const ts=api.tokenizar(source);
 for(const t of ts)assert.equal(source.slice(t.inicio,t.fim),t.texto);
 assert.equal(ts.filter(t=>t.normalizado==='mao').length,2);assert(ts.some(t=>t.texto==='25,5'));
 assert(!ts.some(t=>t.normalizado==='nao_informado'));
});
test('clause frames bind patient, predicate, complaint, side and time',()=>{
 const r=graph.analisar('Paciente sente dor no ombro direito há 3 meses e dormência na mão esquerda.');
 assert.equal(r.fatos.length,2);const [first,second]=r.fatos.map(f=>f.linguagem.quadros[0]);
 assert.equal(first.sujeito,'paciente');assert.equal(first.predicado.verbo,'sente');assert.equal(first.local.regiaoId,'ombro');assert.equal(first.local.lado,'direito');assert(first.tempo.duracao.includes('há 3 meses'));
 assert.equal(second.local.regiaoId,'punho_mao');assert.equal(second.local.lado,'esquerdo');assert.equal(second.sintoma.qualidade,'dormencia');assert.equal(second.tempo.duracao.length,0);
 for(const f of r.fatos)for(const o of f.origens)assert.equal(r.origem.slice(o.inicio,o.fim),o.trecho);
});
for(const text of ['Nega dor no ombro direito e dormência na mão esquerda.','Suspeita de dor no ombro direito e dormência na mão esquerda.','Minha mãe sente dor no ombro direito e dormência na mão esquerda.'])test('coordinated scope is not broken: '+text,()=>{
 const r=graph.analisar(text);assert.equal(r.fatos.length,1);
 if(text.startsWith('Nega'))assert(r.proposicoes.every(p=>p.estado==='negado'));
 if(text.startsWith('Suspeita'))assert(r.proposicoes.every(p=>p.certeza==='hipotetica'));
 if(text.startsWith('Minha'))assert(r.proposicoes.every(p=>p.sujeito==='outra_pessoa'));
});
const aliases=[
 ['dedão do pé esquerdo','hálux esquerdo','tornozelo_pe','halux'],['dedo grande do pé direito','hálux direito','tornozelo_pe','halux'],
 ['dedão da mão direita','polegar direito','punho_mao','polegar'],['dedinho da mão esquerda','dedo mínimo da mão esquerda','punho_mao','dedo_minimo_mao'],
 ['dedinho do pé esquerdo','dedo mínimo do pé esquerdo','tornozelo_pe','dedo_minimo_pe'],['batata da perna direita','panturrilha direita','','panturrilha'],
 ['sola do pé esquerdo','planta do pé esquerdo','tornozelo_pe','']
];
for(const [term,canonical,region,structure] of aliases)test('source-bound anatomy: '+term,()=>{
 const text='Refere dor no '+term+'.',r=graph.analisar(text),p=r.proposicoes[0];assert.equal(p.regiaoId,region);assert.equal(p.estruturaId,structure);assert.equal(r.origem,text);
 assert(graph.validar(r,'Refere dor no '+canonical+'.').ok,JSON.stringify(graph.validar(r,'Refere dor no '+canonical+'.')));
 if(structure==='panturrilha'){assert.equal(p.segmentoId,'perna');assert(!r.problemas.some(p=>p.regiaoId==='tornozelo_pe'));}
});
test('specific structures cannot be exchanged even in the same region',()=>{
 const r=graph.analisar('Dor no dedão do pé esquerdo.');assert(!graph.validar(r,'Dor no dedinho do pé esquerdo.').ok);
 const {r:doc}=report('Dor no dedão do pé esquerdo. Dor no dedinho do pé esquerdo.');assert.equal(doc.semantica.analiseDocumental.problemasClinicos.filter(p=>p.regiaoId==='tornozelo_pe').length,2);
});
for(const text of ['Refere que a mão direita está adormecida.','Refere que o pé esquerdo está formigando.','Relata que a mão esquerda está inchada.','Relata que o ombro direito está dolorido.'])test('descriptor is not a diagnosis: '+text,()=>{
 const r=graph.analisar(text);assert(r.proposicoes.some(p=>p.tipo==='sintoma'));assert(!r.proposicoes.some(p=>p.tipo==='diagnostico_relatado'));assert(!references(r).length);
 assert(graph.validar(r,text).ok);
});
for(const term of ['travando','repuxando','pinicando','nervo inflamado','dedão','costas','bacia','junta','escapola','tornosselo'])test('ambiguous vocabulary asks, never substitutes: '+term,()=>{
 const text='Paciente relata '+term+'.',r=graph.analisar(text);assert(r.pendencias.some(p=>p.tipo==='vocabulario_ambiguo'),JSON.stringify(r.pendencias));
 assert.equal(graph.planejar(r).map(b=>b.texto).join(' '),text);assert(!r.proposicoes.some(p=>p.tipo==='diagnostico_relatado'));
 const {r:doc}=report(text);assert(doc.texto.toLowerCase().includes(term));assert(doc.semantica.analiseDocumental.perguntas.some(q=>q.tipo==='vocabulario'));
 assert.equal(doc.modo,'revisao');
});
for(const [first,ref,anchor] of [
 ['Dor no ombro direito.','Essa dor piora ao elevar o braço.','ombro'],
 ['Dor no joelho esquerdo há 3 meses.','Essa dor aumenta ao caminhar.','joelho'],
 ['Dormência na mão direita.','Essa dormência piora à noite.','punho_mao'],
 ['Formigamento na mão esquerda.','Esse formigamento persiste.','punho_mao'],
 ['Dor no dedão do pé direito.','Essa dor aumenta ao caminhar.','tornozelo_pe']
])test('single safe reference: '+first+' '+ref,()=>{
 const r=graph.analisar(first+' '+ref);assert.equal(references(r).length,1,JSON.stringify(r.pendencias));const f=r.fatos.at(-1);
 assert(f.proposicoes.some(p=>p.regiaoId===anchor&&p.referenciaOrigem));
 assert(f.textoInterpretado);assert.equal(f.origens[0].trecho,ref);
 const link=references(r)[0];assert.equal(r.origem.slice(link.referencia.inicio,link.referencia.fim),link.referencia.trecho);assert.equal(r.origem.slice(link.antecedente.inicio,link.antecedente.fim),link.antecedente.trecho);
 assert(!r.pendencias.some(p=>p.fatoId===f.id&&p.tipo==='referencia_nao_resolvida'));
 const text=graph.planejar(r).map(b=>b.texto).join(' ');assert(graph.validar(r,text).ok,JSON.stringify(graph.validar(r,text)));
 if(ref.includes('braço')){assert(f.proposicoes.some(p=>p.papel==='movimento_modificador'));assert(!r.problemas.some(p=>p.regiaoId==='punho_mao'));}
});
const ambiguous=[
 'Dor no ombro direito. Dor no joelho esquerdo. Essa dor aumenta ao caminhar.',
 'Dor no ombro direito. Dor no ombro esquerdo. Essa dor aumenta.',
 'Nega dor no ombro direito. Essa dor aumenta.',
 'Minha mãe apresenta dor no ombro direito. Essa dor aumenta.',
 'Suspeita de dor no ombro direito. Essa dor aumenta.',
 'Antigamente tinha dor no ombro direito. Essa dor aumenta.',
 'Dor no ombro direito ao acordar. Dor no ombro direito à noite. Essa dor aumenta.',
 'Dor no ombro direito. "Essa dor aumenta".',
 'Dor no ombro direito. Caso essa dor aumenta, avisa.',
 'Dor no ombro direito. O médico disse que essa dor aumenta.',
 'Dor lombar que irradia para a perna esquerda. Essa dor aumenta.',
 'Dor no ombro direito. Essa dor aumenta no joelho esquerdo.',
 'Dor no ombro direito. Essa dor aumenta na bacia.',
 'Dor no ombro direito. Essa dor aumenta nas costas.',
 'Essa dor aumenta.',
 'Dormência na mão direita. Esse formigamento aumenta.'
];
for(const text of ambiguous)test('unsafe reference remains literal: '+text,()=>{
 const r=graph.analisar(text);assert.equal(references(r).length,0);assert(r.pendencias.some(p=>p.tipo==='referencia_nao_resolvida'));assert(graph.planejar(r).some(b=>/essa dor|esse formigamento/i.test(b.texto)));
});
test('full report, persistence, quality, source preservation and manual protection',()=>{
 const text='Refere dor no ombro direito há 3 meses. Essa dor piora ao elevar o braço.';
 const {f,r}=report(text);assert.equal(f.fields[2].value,text);assert(r.texto.includes('ombro direito piora ao elevar o braço'));
 assert(r.semantica.relacoes.some(x=>x.tipo==='referencia_contextual_resolvida'));assert(r.semantica.analiseDocumental.unidades.some(u=>u.referencias.length&&u.linguagem.quadros.length));
 assert.equal(r.validacao.relatoAusente.length,0);assert.equal(r.semantica.validacao.indicadores.omissoes,0);assert.equal(r.semantica.validacao.indicadores.introducoes,0);
 const second=r.semantica.proposicoes.filter(p=>p.referenciaOrigem);assert(second.every(p=>!p.tempo.length&&!p.quantificadores.length),'antecedent duration is not copied to a new clause');
 const saved=JSON.parse(JSON.stringify(r));f.c.window.preencherLaudoAvaliacaoKineSys(saved);f.c.window.renderizarLaudoAvaliacaoKineSys();assert.equal(f.nodes['ks-laudo-texto'].value,r.texto);
 f.c.window.preencherLaudoAvaliacaoKineSys({...saved,texto:'Texto profissional protegido.',textoAutomatico:false,revisado:true});f.fields[2].value='Dor no joelho esquerdo.';f.c.window.renderizarLaudoAvaliacaoKineSys();assert(f.nodes['ks-laudo-texto'].value.startsWith('Texto profissional protegido.'));
 assert(!graph.validar(graph.analisar(text),r.texto.replaceAll('ombro direito','ombro esquerdo')).ok);
});
test('reference context is local, never shared across analyses or patients',()=>{
 graph.analisar('Dor no ombro direito. Essa dor aumenta.');const b=graph.analisar('Essa dor aumenta.');assert.equal(references(b).length,0);
 const {r}=report('Essa dor aumenta.');assert(!r.texto.includes('ombro direito'));assert(r.semantica.analiseDocumental.perguntas.some(q=>q.tipo==='referencia'));
});
test('predicate relationships cannot reverse worsening/improvement or deny a modifier silently',()=>{
 const r=graph.analisar('Dor no ombro direito piora ao dormir.');assert(r.proposicoes[0].comportamento.includes('piora:relatado'));
 assert(!graph.validar(r,'Dor no ombro direito melhora ao dormir.').ok);assert(!graph.validar(r,'Dor no ombro direito não piora ao dormir.').ok);
 assert(graph.validar(r,'Dor no ombro direito aumenta ao dormir.').ok);
 const n=graph.analisar('Dor no ombro direito não piora ao dormir.');assert(!graph.validar(n,'Dor no ombro direito piora ao dormir.').ok);
 const modifier=graph.analisar('Nega piora da dor no ombro direito.');assert.equal(modifier.proposicoes[0].estado,'indeterminado');assert.equal(modifier.proposicoes[0].modificadorNegado,'piora');assert(!graph.validar(modifier,'Nega dor no ombro direito.').ok);
});
test('anatomical qualifiers remain attached and are not guessed between complaints',()=>{
 const r=graph.analisar('Dor na lateral da canela direita. Essa dor piora ao caminhar.');assert.equal(references(r).length,1);assert(r.fatos[1].proposicoes.some(p=>p.qualificadoresLocal.includes('lateral')));
 assert(!graph.validar(r,graph.planejar(r).map(b=>b.texto).join(' ').replaceAll('lateral','medial')).ok);
 const two=graph.analisar('Dor na lateral da canela direita. Dor na face medial da canela direita. Essa dor piora.');assert.equal(references(two).length,0);
 const {r:doc}=report('Dor na face lateral do joelho direito. Dor na face medial do joelho direito.');assert.equal(doc.semantica.analiseDocumental.problemasClinicos.filter(p=>p.regiaoId==='joelho').length,2);
});
test('no network, trained model, global clinical cache or altered diagnostic threshold',()=>{
 const source=fs.readFileSync('src/clinical/clinical_language_rules-1.0.0.js','utf8');assert(!/fetch\(|XMLHttpRequest|localStorage|sessionStorage|supabase|transformers|tensorflow|onnx|limiar\s*[:=]/i.test(source));
 const loader=fs.readFileSync('src/ui/screen_loader-1.25.0.js','utf8');assert(loader.indexOf('clinical_language_rules-1.0.0.js')<loader.indexOf('clinical_semantic_graph-1.0.0.js'));
});
console.log(count+' priority 1/2/4 synthetic language scenarios OK');
