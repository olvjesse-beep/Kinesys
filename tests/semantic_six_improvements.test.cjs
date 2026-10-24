'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),{fixture}=require('./evaluation_report_integration.test.cjs');
const c={};c.window=c;vm.createContext(c);
for(const file of ['clinical_semantic_graph-1.0.0.js','clinical_document_analyzer-1.0.0.js'])vm.runInContext(fs.readFileSync('src/clinical/'+file,'utf8'),c);
const graph=c.KineSysSemanticGraph,api=c.KineSysDocumentAnalyzer;
function analyze(text){
 const parsed=graph.analisar(text,{realizar:t=>api.analisarFrase(t).texto});
 const plan={...parsed,origemHMA:text,blocos:graph.planejar(parsed),correlacoes:[],fontes:[]};
 plan.analiseDocumental=api.analisarDocumento(plan,api.analisarAvaliacao({campos:{paciente_hma:text}}));
 return {parsed,plan,analysis:plan.analiseDocumental,text:plan.blocos.map(b=>b.texto).join('\n\n')};
}
function report(text){const t=fixture();t.fields[2].value=text;return {t,r:t.render()};}
let scenarios=0;
function test(name,fn){fn();scenarios++;console.log('PASS '+name);}
test('six improvements: independent complaints retain side, onset, modifiers and source',()=>{
 const text='Relata dor no ombro direito há 3 meses, piora ao elevar o braço. Relata dor no joelho esquerdo há 2 dias, piora ao caminhar. Relata dormência na mão direita.';
 const a=analyze(text),groups=a.analysis.problemasClinicos;
 assert(groups.some(p=>p.regiaoId==='ombro'&&p.lado==='direito'&&p.episodios[0].duracao.includes('há 3 meses')));
 assert(groups.some(p=>p.regiaoId==='joelho'&&p.lado==='esquerdo'&&p.episodios[0].duracao.includes('há 2 dias')));
 assert(groups.some(p=>p.regiaoId==='punho_mao'&&p.sintomas.some(s=>s.conceito==='parestesia')));
 assert(groups.find(p=>p.regiaoId==='joelho').episodios.every(e=>!JSON.stringify(e).includes('3 meses')));
 for(const p of groups)for(const e of p.episodios)for(const m of e.modificadores)assert.equal(m.escopo,'somente_fato_de_origem');
 for(const p of groups)for(const s of p.sintomas)assert.equal(text.slice(s.origem.inicio,s.origem.fim),s.origem.trecho);
});
test('chronology: distinct episodes never collapse into one timeline',()=>{
 const a=analyze('Antigamente tinha dor no ombro direito há 2 anos. Atualmente apresenta dor no ombro direito há 3 dias.');
 const g=a.analysis.problemasClinicos.find(x=>x.regiaoId==='ombro');assert.equal(g.episodios.length,2);
 assert(g.episodios.some(e=>e.temporalidade==='anterior'));assert(g.episodios.some(e=>e.temporalidade==='atual'));
 assert(graph.validar(a.parsed,a.text).ok);
 const onset=analyze('Relata dor no joelho esquerdo que iniciou no dia 3 de maio.');const start=onset.analysis.problemasClinicos[0].episodios[0].inicio[0];assert.equal(start.escopo,'somente_fato_de_origem');assert(start.texto.includes('dia 3 de maio'));assert(!JSON.stringify(onset.analysis).includes('2026-05-03'));
});
test('context: dependent negation, uncertainty, family and planned surgery stay distinct',()=>{
 const a=analyze('Nega dor no ombro esquerdo, a mãe apresenta dor no joelho direito. A paciente apresenta dormência na mão direita. Relata suspeita de radiculopatia cervical. Aguarda cirurgia na coluna lombar.');
 assert(a.parsed.proposicoes.some(p=>p.regiaoId==='ombro'&&p.estado==='negado'&&p.sujeito==='paciente'));
 assert(a.parsed.proposicoes.some(p=>p.regiaoId==='joelho'&&p.sujeito==='outra_pessoa'));
 assert(a.parsed.proposicoes.some(p=>p.regiaoId==='punho_mao'&&p.sujeito==='paciente'));
 assert(a.parsed.proposicoes.some(p=>p.tipo==='diagnostico_relatado'&&p.certeza==='hipotetica'));
 assert(a.parsed.proposicoes.some(p=>p.tipo==='procedimento'&&p.certeza==='planejada'));
 assert(!a.analysis.problemasClinicos.some(p=>p.regiaoId==='joelho'||p.regiaoId==='lombar'||p.regiaoId==='ombro'));
 assert.equal(a.analysis.problemasClinicos.length,1);assert(graph.validar(a.parsed,a.text).ok);
 assert.equal(api.analisarFrase('Nega sentir dor no ombro direito.').texto,'Nega dor no ombro direito.');
});
test('trajectory and movement do not become new complaints',()=>{
 const a=analyze('Relata dor na coluna cervical que irradia para a mão direita.');
 assert(a.analysis.problemasClinicos.some(p=>p.regiaoId==='cervical'));
 assert(!a.analysis.problemasClinicos.some(p=>p.regiaoId==='punho_mao'));
 const b=analyze('Dor no cotovelo direito ao estender o punho.');assert(!b.analysis.problemasClinicos.some(p=>p.regiaoId==='punho_mao'));
});
test('clarifications are targeted, source-linked, and not answers invented in the report',()=>{
 const {r}=report('Refere dor no ombro. Relata dormência na mão direita. Refere que o pior período de dor é ao dor. Essa sensação mudou.');
 const q=r.semantica.analiseDocumental.perguntas;
 assert(q.some(x=>x.tipo==='lado'&&x.pergunta.includes('ombro')));assert(q.some(x=>x.tipo==='expressao_incompleta'));
 assert(q.some(x=>x.tipo==='referencia'));assert(q.every(x=>x.campoDestino));
 assert(!r.texto.includes('direita, à esquerda'));assert(r.texto.includes('ao dor'));assert(!r.texto.includes('ao dormir'));
 assert.equal(r.modo,'revisao');
 const clear=report('Refere dor no ombro direito.').r.semantica.analiseDocumental;
 assert(!clear.perguntas.some(x=>x.tipo==='lado'||x.tipo==='expressao_incompleta'));
});
test('a modifier without location is not assigned to multiple independent complaints',()=>{
 const a=analyze('Relata dor no ombro direito. Relata dor no joelho esquerdo. Refere piora ao dormir.');
 assert(a.analysis.perguntas.some(q=>q.tipo==='modificador_sem_queixa'));
 for(const p of a.analysis.problemasClinicos)assert(!JSON.stringify(p.episodios).includes('ao dormir'));
});
test('contradiction question preserves both sources, sides and times are not conflated',()=>{
 assert(analyze('Refere dor no ombro direito. Nega dor no ombro direito.').analysis.perguntas.some(q=>q.tipo==='divergencia'&&q.trechos.length===2));
 assert(!analyze('Refere dor no ombro direito. Nega dor no ombro esquerdo.').analysis.perguntas.some(q=>q.tipo==='divergencia'));
});
test('same clause with several locations does not transfer a modifier between problems',()=>{
 const a=analyze('Relata dor no ombro direito e no joelho esquerdo, piora ao caminhar.');
 assert(a.analysis.perguntas.some(q=>q.tipo==='escopo_multiplas_queixas'));
 for(const p of a.analysis.problemasClinicos)assert(p.episodios.every(e=>!e.modificadores.length));
 assert(a.text.includes('piora ao caminhar'));assert(graph.validar(a.parsed,a.text).ok);
});
test('evidence: only explicit bindings, multiple hypotheses, negative is not exclusion',()=>{
 const a=analyze('Relata dor no ombro direito.');
 a.plan.correlacoes=[{hipoteseId:'h1',hipoteseAnamnese:'Hipótese sintética A',regiaoId:'ombro',regiao:'Ombro',criterioAtendido:false,resultados:[{eixoId:'h1',indice:0,teste:'Critério A',resultado:'positivo'},{eixoId:'h1',indice:1,teste:'Critério B',resultado:'negativo'}]},
 {hipoteseId:'h2',hipoteseAnamnese:'Hipótese sintética B',regiaoId:'ombro',criterioAtendido:null,resultados:[{eixoId:'h2',indice:0,teste:'Critério C',resultado:'inconclusivo'}]},
 {hipoteseId:'h3',hipoteseAnamnese:'Hipótese sem vínculo',regiaoId:'ombro',semVinculo:true,resultados:[]}];
 const audit=api.analisarDocumento(a.plan),[one,two,three]=audit.matrizEvidencias;
 assert.equal(audit.matrizEvidencias.length,3);assert.equal(one.resultados.length,2);assert(!one.resultados.some(t=>t.teste==='Critério C'));
 assert.equal(one.conclusao,'criterio_registrado_nao_atendido');assert.equal(one.resultados[1].papel,'criterio_nao_atendido');assert(one.limites.includes('negativo_nao_exclui_isoladamente'));
 assert.equal(two.resultados[0].papel,'inconclusivo');assert.equal(three.conclusao,'sem_vinculo');assert(audit.perguntas.some(q=>q.tipo==='vinculo_exame'));
 a.plan.correlacoes[0].resultados.push({...a.plan.correlacoes[0].resultados[0],indice:9});const repeated=api.analisarDocumento(a.plan).matrizEvidencias[0];assert.equal(repeated.resultados.length,2);assert.deepEqual(Array.from(repeated.resultados[0].indices),[0,9]);
 one.historia.forEach(h=>assert.equal(h.papel,'contexto_documental_nao_confirmatorio'));
 a.plan.correlacoes[0].evidenciasCompartilhadas={estado:'localizacao_pendente'};a.plan.correlacoes[0].criterioAtendido=true;
 assert.equal(api.analisarDocumento(a.plan).matrizEvidencias[0].conclusao,'esclarecer_historia');
});
test('real report evidence and measures survive existing save/reopen JSON and manual edits',()=>{
 const {t,r}=report('Refere dor na coluna cervical à direita. Refere dor no joelho esquerdo.');
 assert(r.semantica.analiseDocumental.matrizEvidencias[0].resultados.length===3);
 assert(r.texto.includes('teste de Spurling'));assert(r.texto.includes('Nega')===false);
 const saved=JSON.parse(JSON.stringify(r));t.c.window.preencherLaudoAvaliacaoKineSys(saved);t.c.window.renderizarLaudoAvaliacaoKineSys();
 assert.deepEqual(JSON.parse(JSON.stringify(t.c.window.coletarLaudoAvaliacaoKineSys().semantica.analiseDocumental)),saved.semantica.analiseDocumental);
 t.c.window.preencherLaudoAvaliacaoKineSys({...saved,texto:'Conclusão profissional protegida.',textoAutomatico:false,revisado:true});t.fields[2].value='Nova fonte no mesmo atendimento.';t.c.window.renderizarLaudoAvaliacaoKineSys();assert(t.nodes['ks-laudo-texto'].value.startsWith('Conclusão profissional protegida.'));
});

// Synthetic gold assertions, not a claim of clinical accuracy. Every mutation
// must be detected; a list of present words alone is insufficient.
const corpus=[
 ['dor no ombro direito há 3 meses','dor no ombro esquerdo há 3 meses'],
 ['dor no joelho esquerdo há 2 dias','dor no joelho esquerdo há 2 anos'],
 ['dormência na mão direita','formigamento na mão direita'],
 ['dor na coluna lombar à noite','dor na coluna lombar ao acordar'],
 ['dor no quadril direito','dor no joelho direito'],
 ['dor na lateral da canela esquerda','dor no tornozelo esquerdo']
];
for(const [source,mutation] of corpus)for(const opener of ['Refere ','Paciente apresenta ','A paciente informa que está com '])test('quality corpus: '+opener+source,()=>{
 const a=analyze(opener+source+'.'),ok=api.avaliarQualidade(a.plan,a.text);
 assert.equal(ok.omissoes,0);assert.equal(ok.introducoes,0);assert.equal(ok.nexosCausaisNovos,0);
 const bad=api.avaliarQualidade(a.plan,opener+mutation+'.');assert(bad.omissoes>0||bad.introducoes>0,mutation);
 assert(api.avaliarQualidade(a.plan,'').omissoes>0);
 const repeated=api.avaliarQualidade(a.plan,a.text+'\n'+a.text);assert(repeated.repeticoesLiterais.length);
 assert.equal(ok.tipo,'indicadores_documentais_nao_probabilidade_clinica');
});
test('quality detects new causality and medication dose changes without prescribing',()=>{
 const a=analyze('Refere dor no ombro direito. Usa Produto Alfa 25 mg e Produto Beta 50 mg.');
 assert(api.avaliarQualidade(a.plan,a.text+' Dor no ombro direito causada por lesão.').nexosCausaisNovos>0);
 assert(api.avaliarQualidade(a.plan,a.text.replace('25 mg','50 mg')).omissoes>0);
});
test('report contains only useful sections, no audit, duplicate headings or universal diagnosis',()=>{
 const {r}=report('Refere dor no joelho esquerdo há 2 meses. Refere dor no ombro direito há 3 dias.');
 assert.equal((r.texto.match(/História clínica/g)||[]).length,1);assert.equal((r.texto.match(/RELATÓRIO FISIOTERAPÊUTICO/g)||[]).length,1);
 assert(!/proposicoesFonte|matrizEvidencias|queixa:|semServicoExterno|pergunta:/.test(r.texto));
 assert.equal(r.semantica.validacao.indicadores.omissoes,0);assert.equal(r.semantica.validacao.indicadores.introducoes,0);
});
console.log('Six semantic improvements: '+scenarios+' synthetic scenarios; omissions, additions, context and mutation checks OK');
