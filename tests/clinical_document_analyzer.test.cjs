'use strict';
// Synthetic data only. Exercises the real source → facts → plan → report pipeline.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const {fixture}=require('./evaluation_report_integration.test.cjs');
const code=fs.readFileSync('src/clinical/clinical_document_analyzer-1.0.0.js','utf8');
const env={window:{}};vm.createContext(env);vm.runInContext(fs.readFileSync('src/clinical/clinical_semantic_graph-1.0.0.js','utf8'),env);vm.runInContext(code,env);
const api=env.window.KineSysDocumentAnalyzer,graph=env.window.KineSysSemanticGraph;
for(const [original,expected] of [
 ['Paciente apresenta dor no ombro direito há 3 meses.','Relata dor no ombro direito há 3 meses.'],
 ['A paciente informa que está com dormência na mão esquerda.','Relata dormência na mão esquerda.'],
 ['Paciente queixa-se de rigidez no joelho esquerdo ao acordar.','Relata rigidez no joelho esquerdo ao acordar.'],
 ['O paciente vem apresentando formigamento no pé esquerdo.','Relata formigamento no pé esquerdo.'],
 ['Refere que a dor no ombro direito piora ao dormir.','A dor no ombro direito piora ao dormir.']
]){
 const result=api.analisarFrase(original);assert.equal(result.estado,'realizado',JSON.stringify(result));assert.equal(result.texto,expected);assert(graph.validar(graph.analisar(original),result.texto).ok);
 assert(result.slots.predicado);assert(result.proposicoes.length);assert.equal(result.origem,original);
}
for(const original of [
 'Nega dor no ombro direito.','Não nega dor no joelho esquerdo.','Refere possível dor cervical.',
 'A mãe apresenta dor no ombro direito.','Paciente nega que sente dor no ombro direito.',
 'Aguarda artroplastia do quadril esquerdo.','Usa fármaco Alfa 5 mg e fármaco Beta 10 mg.',
 'Desde então, isso mudou.','Refere que o pior período de dor é ao dor.',
 'Evento descrito como sensação alfa.','Dor no ombro direito causada por trauma, segundo relato.'
]){const r=api.analisarFrase(original);assert.equal(r.texto,original,'uncertainty/source must not be silently rewritten: '+original);assert.equal(r.estado,'preservado');}
// The gate rejects a grammatical candidate that loses chronology or subject.
const invalid=api.analisarFrase('No passado, o paciente tinha dor no ombro direito.','Paciente apresenta dor no ombro direito.');
assert.equal(invalid.estado,'revisar');assert(invalid.validacao.ausentes.length);assert.equal(invalid.texto,'No passado, o paciente tinha dor no ombro direito.');
assert(!/fetch\s*\(|XMLHttpRequest|WebSocket|localStorage|supabase|api[_-]?key|Math\.random|https?:\/\//.test(code),'the analyzer must not call or depend on any remote service');
const unpunctuated='Paciente apresenta dor no ombro direito Refere dormência na mão direita Relata dor no joelho esquerdo.';
const separated=graph.analisar(unpunctuated);assert.equal(separated.fatos.length,3);
for(const fact of separated.fatos)for(const origin of fact.origens)assert.equal(unpunctuated.slice(origin.inicio,origin.fim),origin.trecho);
assert.equal(graph.analisar('O paciente diz "Refere dor no ombro direito Relata dor no joelho".').fatos.length,1,'quoted speech must not be split by a reporting verb');
assert.equal(graph.analisar('Nega que o médico Refere dor no ombro direito.').fatos.length,1,'dependent negative statement must keep its scope');

function prepared(hma){const f=fixture();f.fields[2].value=hma;return f;}
const f=prepared('Paciente apresenta dor no ombro direito há 3 meses. A paciente informa que está com dormência na mão direita. Nega febre.');
f.notes.contexto_saude_observacao='Hipertensão informada';f.notes.contexto_trabalho_observacao='Sem afastamento do trabalho';
const original=f.fields[2].value,r=f.render(),analysis=r.semantica.analiseDocumental;
assert.equal(r.revisaoSemantica,4);assert.equal(r.semantica.versao,4);assert.equal(analysis.tipo,'analisador_documental_local');assert.equal(analysis.semServicoExterno,true);
assert.equal(analysis.entrada.hma,original);assert.equal(f.fields[2].value,original);
assert(analysis.entrada.entradas.some(x=>x.campo==='contexto_saude_observacao'&&x.valor==='Hipertensão informada'));
assert(analysis.entrada.entradas.some(x=>x.campo==='tags_medicamentos[1]'&&x.valor==='Medicamento B'));
assert(analysis.entrada.entradas.some(x=>x.campo==='mapeamento.radiculopatia_cervical.0'&&x.resultado==='positivo'));
assert(analysis.entrada.entradas.some(x=>x.campo==='contextoAnamnese.estados.atividade'&&x.valor==='nega'));
assert(analysis.unidades.every(x=>x.id&&x.origens.length));assert.equal(analysis.fatosSemRoteiro.length,0);
assert.match(r.texto,/Relata dor no ombro direito há 3 meses\.\s+Dormência referida na mão direita\.\s+Nega febre\./);
assert(!r.texto.includes('Sobre os antecedentes de saúde, foi informado:'));assert(r.texto.includes('Antecedentes referidos: Hipertensão informada'));
assert.equal(r.validacao.relatoAusente.length,0);assert.equal(r.validacao.contextoAusente.length,0);
assert.equal(r.semantica.validacao.significado.ausentes.length,0,JSON.stringify(r.semantica.validacao.significado));
assert(analysis.roteiro.every(x=>x.fatos.length));
// Mutation of side, dose, assertion and a new causal link must still fail.
for(const bad of [r.texto.replace('mão direita','mão esquerda'),r.texto.replace('Nega febre.','Refere febre.'),r.texto+' Dor no ombro direito decorrente de compressão nervosa.'])assert(!f.c.window.validarTextoSemanticoAvaliacaoKineSys(bad).ok);
const saved=JSON.parse(JSON.stringify(r));f.c.window.preencherLaudoAvaliacaoKineSys(saved);f.c.window.renderizarLaudoAvaliacaoKineSys();assert.equal(f.nodes['ks-laudo-texto'].value,r.texto);assert.deepEqual(JSON.parse(JSON.stringify(f.c.window.coletarLaudoAvaliacaoKineSys().semantica.analiseDocumental)),JSON.parse(JSON.stringify(analysis)));

// Same full statement in history + context occurs once; both sources remain.
const dup=prepared('Refere dor no ombro direito. Refere dor no ombro direito. Refere dor no cotovelo esquerdo.');
dup.notes.contexto_saude_observacao='Refere dor no ombro direito.';const dr=dup.render();
assert(!dr.texto.includes('no ombro direito, no ombro direito'));assert(dr.semantica.relacoes.some(x=>x.tipo==='mesmo_conteudo_documentado'));
assert.equal(dr.semantica.validacao.ausentes.length,0,JSON.stringify(dr.semantica.validacao));assert.equal(dr.semantica.analiseDocumental.fatosSemRoteiro.length,0);
assert(dr.semantica.fatos.some(x=>x.origens.some(o=>o.campo==='contexto_saude_observacao')));

// Duration belongs to its source complaint, never to another merged location.
const chronology=prepared('Paciente apresenta dor no ombro direito há 3 meses Refere dormência na mão direita. Nega febre. A mãe apresenta artrite. Refere dor no joelho esquerdo.').render();
assert(chronology.texto.includes('Relata dor no ombro direito há 3 meses.'));
assert(!chronology.texto.includes('há 3 meses e no joelho'));
assert(!chronology.texto.includes('punho_mao'));assert(chronology.texto.includes('punho e mão'));
assert.equal(chronology.semantica.validacao.significado.ausentes.length,0);
assert.equal(chronology.semantica.fatos.find(x=>x.textoOriginal==='A mãe apresenta artrite.'||x.origens?.some(o=>o.trecho==='A mãe apresenta artrite.')).categoria,'antecedentes');

// An incomplete/unknown expression is kept, not completed to a plausible story.
const pending=prepared('Evento descrito como sensação alfa. Desde então, isso mudou. Refere que o pior período de dor é ao dor.').render();
assert(pending.texto.includes('sensação alfa'));assert(pending.texto.includes('ao dor'));assert(!pending.texto.includes('ao dormir'));assert.equal(pending.modo,'revisao');assert(pending.semantica.analiseDocumental.trechosParaRevisar.length);
// The complete evaluation includes free tests, measures and multiple hypotheses.
const source=api.analisarAvaliacao({campos:{paciente_hma:'Dor no joelho direito.',paciente_cpf:'sensitive-id',paciente_telefone:'private-phone'},contextoAnamnese:{campos:{contexto_saude_observacao:'Nega trauma.'},estados:{cirurgias:'nao_informado'}},gruposAnamnese:{fatoresPiora:['carga']},complementos:{medicamentosItens:['Produto A','Produto B']},achados:[{id:'eixo-1',regiaoId:'joelho',achados:[{texto:'Teste sintético',resultado:'inconclusivo'}]}],exameLivre:[{id:'livre-1',texto:'SLR negativo à direita.',resultado:'descritivo',regiaoId:'lombar',lado:'direito'}],funcional:{medidasObjetivas:[{nome:'Medida',valor:0,unidade:'graus'}]},restricoes:{ativo:true,procedimento:'Artrodese lombar'},plano:{hipoteses:[{id:'h1',nome:'Hipótese 1',regiaoId:'joelho'},{id:'h2',nome:'Hipótese 2',regiaoId:'lombar'}]}});
assert(!JSON.stringify(source).includes('sensitive-id'));assert(!JSON.stringify(source).includes('private-phone'));
assert.equal(source.entradas.filter(x=>x.tipo==='hipotese_registrada').length,2);assert(source.entradas.some(x=>x.tipo==='exame_livre'&&x.resultado==='descritivo'));assert(source.entradas.some(x=>x.tipo==='medidas_objetivos_plano'&&x.valor.medidasObjetivas[0].valor===0));

// Manual/reviewed reports and other patients cannot inherit this generated model.
for(const protectedReport of [{...r,texto:'Documento profissional protegido.',textoAutomatico:false,revisado:false,revisaoSemantica:2},{...r,texto:'Documento já revisado.',textoAutomatico:true,revisado:true,revisaoSemantica:2}]){f.c.window.preencherLaudoAvaliacaoKineSys(protectedReport);f.c.window.renderizarLaudoAvaliacaoKineSys();assert(f.nodes['ks-laudo-texto'].value.startsWith(protectedReport.texto));}
const other=prepared('Refere dor no joelho esquerdo.').render();assert(!JSON.stringify(other.semantica.analiseDocumental).includes('há 3 meses'));assert(!JSON.stringify(other.semantica.analiseDocumental).includes('mão direita'));
const loader=fs.readFileSync('src/ui/screen_loader-1.25.0.js','utf8');assert(loader.indexOf('clinical_semantic_graph-1.0.0.js')<loader.indexOf('clinical_document_analyzer-1.0.0.js'));assert(loader.indexOf('clinical_document_analyzer-1.0.0.js')<loader.indexOf('evaluation_workspace-1.17.0.js'));
console.log('Local document analyzer: typed full-assessment input, finite grammar, source/meaning validation, deduplication, scope, persistence, patient isolation and no remote service OK');
if(process.env.KINESYS_LOCAL_DOCUMENT_EXAMPLE==='1')console.log(r.texto);
