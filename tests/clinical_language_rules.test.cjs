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
test('nominal reference preserves the sole explicit side and does not inherit duration',()=>{
 const source='Dor cervical à direita há três meses. A dor cervical piora ao trabalhar. A dor cervical melhora com pausas.',r=graph.analisar(source);
 const links=r.relacoes.filter(x=>x.tipo==='referencia_nominal_resolvida');assert.equal(links.length,2);
 assert(r.proposicoes.slice(1).every(p=>p.lado==='direito'&&p.referenciaOrigem&&!p.tempo.length));
 assert.equal(r.origem,source);for(const link of links)assert.equal(source.slice(link.antecedente.inicio,link.antecedente.fim),link.antecedente.trecho);
 assert(graph.validar(r,graph.planejar(r).map(b=>b.texto).join(' ')).ok);
});
for(const source of [
 'Dor no ombro direito. Dor no ombro esquerdo. A dor no ombro piora ao elevar o braço.',
 'Minha mãe tem dor no ombro direito. A dor no ombro piora.',
 'Nega dor no ombro direito. A dor no ombro piora.',
 'Antigamente tinha dor no ombro direito. A dor no ombro piora.',
 'Dor no ombro direito há três meses. A dor no ombro piora há dois dias.',
 'Dor na lateral do joelho direito. A dor medial no joelho piora.'
])test('unsafe nominal reference cannot transfer side: '+source,()=>{
 const r=graph.analisar(source);assert(!r.relacoes.some(x=>x.tipo==='referencia_nominal_resolvida'));assert(!r.fatos.at(-1).proposicoes.some(p=>p.referenciaOrigem));
});
test('support and elevation of the arm are modifiers, not another complaint',()=>{
 for(const source of ['Dor cervical à direita melhora com apoio do braço.','Dor no ombro esquerdo piora com o braço elevado.']){
  const r=graph.analisar(source);assert(r.proposicoes.some(p=>p.segmentoId==='braco'&&p.papel==='movimento_modificador'));
  assert.equal(r.problemas.length,1);assert(graph.validar(r,source).ok);
 }
});
test('specific interscapular and Achilles locations preserve exact anatomy and offsets',()=>{
 for(const [source,region,structure] of [['Dor entre as escápulas há cinco meses.','coluna_toracica','interescapular'],['Dor no tendão de Aquiles esquerdo há dois meses.','tornozelo_pe','tendao_aquiles']]){
  const r=graph.analisar(source);assert(r.proposicoes.some(p=>p.regiaoId===region&&p.estruturaId===structure));assert.equal(r.origem,source);
  for(const f of r.fatos)for(const o of f.origens)assert.equal(source.slice(o.inicio,o.fim),o.trecho);
  assert(!graph.validar(r,source.replace('entre as escápulas','no ombro').replace('tendão de Aquiles','calcanhar')).ok);
 }
 assert(graph.analisar('Dor na escápula direita.').proposicoes.every(p=>p.estruturaId!=='interescapular'),'a localização entre as escápulas não é presumida numa escápula isolada');
});
test('direct coordinated symptoms share only their explicitly stated location',()=>{
 for(const source of ['Refere dor e rigidez no joelho direito.','Nega dor e rigidez no joelho direito.','Minha mãe apresenta dor e rigidez no joelho direito.','No passado tinha dor e rigidez no joelho direito.']){
  const r=graph.analisar(source);assert.equal(r.fatos.length,1);assert.equal(r.proposicoes.length,2);assert(r.proposicoes.every(p=>p.regiaoId==='joelho'&&p.lado==='direito'));
  if(source.startsWith('Nega'))assert(r.proposicoes.every(p=>p.estado==='negado'));if(source.startsWith('Minha'))assert(r.proposicoes.every(p=>p.sujeito==='outra_pessoa'));
  assert(graph.validar(r,source).ok);
 }
 const mixed=graph.analisar('Dor no ombro esquerdo e rigidez no joelho direito.');assert(mixed.proposicoes.some(p=>p.conceito==='dor'&&p.regiaoId==='ombro'&&p.lado==='esquerdo'));assert(mixed.proposicoes.some(p=>p.conceito==='rigidez'&&p.regiaoId==='joelho'&&p.lado==='direito'));
 const differentTimes=graph.analisar('Dor há três meses e rigidez no joelho direito.');assert(differentTimes.proposicoes.some(p=>p.conceito==='dor'&&!p.regiaoId),'tempo exclusivo interrompe a coordenação, sem completar anatomia por suposição');
});
test('burning, hypersensitivity and dizziness are symptoms, not diagnoses',()=>{
 const feet=graph.analisar('Queimação na sola dos dois pés.');assert(feet.proposicoes.some(p=>p.conceito==='queimacao'&&p.regiaoId==='tornozelo_pe'&&p.lado==='bilateral'));assert(!feet.proposicoes.some(p=>p.tipo==='diagnostico_relatado'));
 const dizzy=graph.analisar('Tontura ao virar para a direita na cama.');assert(dizzy.proposicoes.some(p=>p.conceito==='tontura'&&!p.regiaoId&&!p.lado));assert(!dizzy.pendencias.some(p=>p.tipo==='local_nao_especificado'));assert(!graph.validar(dizzy,'Nega tontura ao virar para a direita na cama.').ok);
 assert(!graph.validar(graph.analisar('Dor no joelho direito.'),'Dor no joelho direito. Tontura.').ok,'sintoma sem topografia obrigatória também precisa de origem');
 const scar=graph.analisar('Refere dor e hipersensibilidade na palma da mão direita após queimadura.');assert(scar.fatos.every(f=>f.categoria!=='antecedentes'));assert(scar.proposicoes.some(p=>p.conceito==='hipersensibilidade'&&p.lado==='direito'));
 assert(graph.analisar('Relata queimadura em 2020.').fatos.every(f=>f.categoria==='antecedentes'));
});
test('movement targets and chained unique references do not create another complaint',()=>{
 const r=graph.analisar('Dor no punho esquerdo melhora ao apoiar o antebraço.');assert(r.proposicoes.some(p=>p.segmentoId==='antebraco'&&p.papel==='movimento_modificador'));assert.equal(r.problemas.length,1);
 const text='Dor na parte de fora da canela direita. Essa dor piora na eversão. Essa dor melhora ao descansar.',chained=graph.analisar(text);assert.equal(references(chained).length,2);assert(chained.fatos.slice(1).every(f=>f.proposicoes.some(p=>p.qualificadoresLocal.includes('lateral'))));assert.equal(chained.origem,text);
 assert(!graph.validar(chained,graph.planejar(chained).map(b=>b.texto).join(' ').replaceAll('lateral','medial')).ok);
});
test('closed editorial spelling preserves levels, grades, scope and unknown terms',()=>{
 const raw='Espondilodiscroatrose caraterziada por espondilolise em L4, anterolistese grau I, protusões sem evidencia de conflito radicular; 75MG.';
 const polished=api.polirDocumento(raw);assert(polished.includes('espondilodiscoartrose'));assert(polished.includes('L4'));assert(polished.includes('grau I'));assert(polished.includes('sem evidência de conflito radicular'));assert(polished.includes('75 mg'));
 assert.equal(api.polirDocumento('O teste evidencia dor.'),'O teste evidencia dor.','não transformar verbo em substantivo');
 assert.equal(api.polirDocumento('Possível espondilodiscroatrose em L3-L4.'),'Possível espondilodiscoartrose em L3-L4.');
 assert.equal(api.polirDocumento('Termo clínico desconhecido; dose de 0,5 mg.'),'Termo clínico desconhecido; dose de 0,5 mg.');
 for(const text of ['Dor na região dos dois gluteos.','Nega dor na região dos dois gluteos.','Minha mãe tem dor na região dos dois gluteos.']){
  const source=graph.analisar(text),out=api.polirDocumento(text);assert(source.proposicoes.some(p=>p.lado==='bilateral'&&p.estruturaId==='glutea'));assert(graph.validar(source,out).ok);assert(!graph.validar(source,out.replace('bilateral','direita')).ok);
 }
 assert(graph.validar(graph.analisar('Fraqueza em MMII.'),api.polirDocumento('Fraqueza em MMII.')).ok);
});
console.log(count+' priority 1/2/4 synthetic language scenarios OK');
