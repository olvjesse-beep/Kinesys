'use strict';
// Regressão documental sintética; nenhum prontuário de produção é importado.
const assert=require('node:assert/strict');
const {fixture}=require('./evaluation_report_integration.test.cjs');
function exemplo(){
 const f=fixture();f.fields[0].value='Pessoa Exemplo';f.fields[1].value='46';
 f.fields.push({id:'paciente_ocupacao',value:'Atividade doméstica',type:'text',tagName:'INPUT',disabled:false,labels:[{textContent:'Ocupação',querySelector:()=>null}],classList:{contains:()=>false},closest:()=>null});
 f.fields[2].value='Refere dor na região da coluna. Relata que investiga fibromialgia. Refere que sente dor no ombro esquerdo e dor na região do ciatico direito. Refere que sente dor há 2 anos. Refere que não houve trauma. Refere que a dor iniciou na região da lombar e descia para perna direita. Também relata que dor irradia para perna direita e braço esquerdo. Refere que já passou por 2 raqui. Refere que sente dor no calcanhar direito. Refere que tem dor de cabeça. Refere que a dor aumenta principalmente ao final do dia e a acorda durante a noite.';
 f.nodes.tags_cirurgias={children:[],textContent:''};f.nodes.tags_medicamentos={children:[],textContent:''};
 for(const k of Object.keys(f.notes))delete f.notes[k];
 f.notes.contexto_saude_observacao='Refere que o pai tem fibromialgia/artrite reumatoide.';
 f.notes.contexto_medicamento_observacao='Refere que mesmo tomando o medicamento para dormir, não consegue dormir bem.';
 f.context.estados={saude:'relata',cirurgias:'nao_informado',medicamentos:'relata',atividade:'nega',exames:'nega'};
 for(const [id,nome] of Object.entries({ombro:'Ombro',lombar:'Coluna lombar',tornozelo_pe:'Tornozelo e pé',quadril:'Quadril'}))f.c.BANCO_MAPEAMENTO_CLINICO[id]={nome};
 f.regions.splice(0,f.regions.length,...['cefaleia','ombro','lombar','tornozelo_pe'].map(id=>({dataset:{regiao:id}})));
 f.tests=[];
 const original='SLR positivo a esquerda, Slump positivo a esquerda, Spurling positivo para dor irradiada para o ombro, Patrick fabere positivo para dor inguinal do lado esquerdo, Rotação interna associado a flexão, positivo para dor coxofemoral a esquerda';
 const registro={id:'exame-sintetico',texto:original,resultado:'descritivo',situacao:{tipo:'rascunho',mensagem:'Texto em preenchimento: incluído como descrição, sem confirmar critérios.'}};
 f.c.window.KineSysExameLivre={documentar:()=>[registro]};
 return {f,registro,original};
}
{
 const {f,original}=exemplo(),r=f.render(),t=r.texto;
 assert(t.startsWith('RELATÓRIO FISIOTERAPÊUTICO\n\nPaciente: Pessoa Exemplo\nIdade: 46 anos\nOcupação: Atividade doméstica'));
 assert(t.includes('Data da avaliação: 21/10/2026'));assert(t.includes('Motivo da avaliação (conforme relato): Dor na região da coluna.'));
 assert(!t.includes('passou por avaliação fisioterapêutica'));assert.equal((t.match(/Pessoa Exemplo/g)||[]).length,1);
 for(const titulo of ['História clínica','Antecedentes e contexto','Exame físico-funcional e correlação clínica'])assert(t.includes('\n\n'+titulo+'\n\n'));
 assert((t.match(/\b(?:Refere|Relata)\b/g)||[]).length<7,'não volta ao excesso de verbos do exemplo');
 assert(t.includes('Informa investigação de fibromialgia'));assert(t.includes('Antecedente familiar referido: o pai com fibromialgia/artrite reumatoide'));
 assert(t.includes('2 raqui'));assert(!/diagnóstico de fibromialgia|anestesia|cesariana|artroplastia/.test(t));
 const livre=r.semantica.fatos.find(x=>x.tipo==='exame_livre');assert.equal(livre.textoOriginal,original);assert.equal(livre.trechosDocumentais.length,5);
 assert.deepEqual(Array.from(livre.trechosDocumentais,x=>x.regiaoId),['lombar','lombar','cervical','quadril','quadril']);
 for(const trecho of livre.trechosDocumentais){assert(t.includes('• '+trecho.texto));assert(original.slice(trecho.inicio,trecho.fim).trim()===trecho.textoOriginal);}
 assert(t.includes('SLR positivo à esquerda'));assert(t.includes('Spurling positivo para dor irradiada para o ombro'));
 assert(t.includes('Rotação interna associada à flexão'));assert(!t.includes('associado a flexão'));
 assert(!t.includes('Região não especificada'));assert(!t.includes('em preenchimento'));assert(!t.includes('confirmar critérios'));
 assert(t.includes('pendente de revisão profissional'));assert(r.validacao.exameLivrePendente.length);assert.equal(r.modo,'revisao');
 assert(!r.validacao.regioesPendentes.includes('Coluna lombar'),'achados lombares descritos não são omitidos por estarem sem combo regional');
 for(const n of ['Cabeça / Cefaleia — triagem','Ombro','Tornozelo e pé'])assert(r.validacao.regioesPendentes.includes(n));
 assert.equal(r.validacao.testesAusentes.length,0);assert.equal(r.validacao.relatoAusente.length,0);assert.equal(r.semantica.validacao.ausentes.length,0);
 assert(r.semantica.correlacoes.every(c=>c.criterioAtendido!==true),'organização documental não confirma um critério do catálogo');
 assert(!r.semantica.relacoes.some(x=>x.tipo==='fundamenta_sintese_documental'));
 f.c.window.preencherLaudoAvaliacaoKineSys(JSON.parse(JSON.stringify(r)));f.c.window.renderizarLaudoAvaliacaoKineSys();assert.equal(f.nodes['ks-laudo-texto'].value,t);
 if(process.env.KINESYS_STRUCTURED_REPORT_EXAMPLE==='1')console.log(t);
}
{
 const {f,registro}=exemplo();registro.texto='  SLR negativo à esquerda, Slump inconclusivo à direita; Dado desconhecido com medida de 1.5 cm e dose informada de 25 mg.  ';
 const r=f.render(),a=r.semantica.fatos.find(x=>x.tipo==='exame_livre');
 assert.equal(a.trechosDocumentais.length,3);assert(r.texto.includes('SLR negativo à esquerda'));assert(r.texto.includes('Slump inconclusivo à direita'));assert(r.texto.includes('1.5 cm e dose informada de 25 mg'));
 for(const trecho of a.trechosDocumentais)assert.equal(registro.texto.slice(trecho.inicio,trecho.fim).trim(),trecho.textoOriginal,'offsets apontam ao registro original inclusive quando há espaços externos');
 assert.equal(a.trechosDocumentais[2].regiaoId,'');assert.equal(r.validacao.testesAusentes.length,0);
 assert(!r.texto.includes('SLR positivo'));assert(r.semantica.correlacoes.every(c=>c.criterioAtendido!==true));
 const omitido=f.c.window.validarTextoSemanticoAvaliacaoKineSys(r.texto.replace('• Slump inconclusivo à direita.',''));
 assert(omitido.ausentes.includes(a.id),'o auditor detecta remoção de um trecho do exame');
}
{
 const {f,registro}=exemplo();registro.regiaoId='ombro';registro.regiao='Ombro';registro.lado='direito';registro.texto='Teste descritivo, com 15 graus de limitação.';registro.situacao={tipo:'descritivo'};
 const r=f.render(),a=r.semantica.fatos.find(x=>x.tipo==='exame_livre');assert(r.texto.includes('Ombro — lado direito'));assert.equal(a.trechosDocumentais[0].origemLocalizacao,'registro');
 registro.texto='SLR negativo à esquerda';const explicito=f.render().semantica.fatos.find(x=>x.tipo==='exame_livre');
 assert.equal(explicito.trechosDocumentais[0].regiaoId,'ombro','a organização não sobrescreve a região expressamente selecionada pelo profissional');
 assert(explicito.trechosDocumentais[0].localizacaoDivergente);assert(f.render().validacao.exameLivrePendente.length);
 assert(f.render().validacao.regioesPendentes.includes('Ombro'),'SLR rotulado como ombro pede revisão, não cobre falsamente esse exame');
 registro.regiaoId='';registro.regiao='';registro.texto='SLR não realizado; Palpação dolorosa no ombro direito.';
 const pendente=f.render();assert(pendente.validacao.regioesPendentes.includes('Coluna lombar'),'teste não realizado não cobre a região');assert(!pendente.validacao.regioesPendentes.includes('Ombro'));
}
{
 const {f}=exemplo(),base=f.render();
 for(const salvo of [{...base,texto:'Documento profissional já revisado.',revisado:true},{...base,texto:'Redação manual atual.',textoAutomatico:false,revisado:false}]){
  f.c.window.preencherLaudoAvaliacaoKineSys({...salvo,revisaoSemantica:1});f.c.window.renderizarLaudoAvaliacaoKineSys();assert(f.nodes['ks-laudo-texto'].value.startsWith(salvo.texto));assert(f.nodes['ks-laudo-status'].textContent.includes('Seu texto foi preservado'));
 }
 f.c.window.preencherLaudoAvaliacaoKineSys({...base,texto:'Base automática anterior.',revisaoSemantica:1,revisado:false});f.c.window.renderizarLaudoAvaliacaoKineSys();assert(f.nodes['ks-laudo-texto'].value.includes('Paciente: Pessoa Exemplo'));
 const legadoManual='RELATÓRIO FISIOTERAPÊUTICO\nQuanto à queixa atual, registra-se: texto escrito pelo profissional. O exame físico ainda não contém resultados de testes registrados. A hipótese clínica permanece em aberto até a correlação entre a anamnese e o exame físico.';
 f.c.window.preencherLaudoAvaliacaoKineSys({...base,texto:legadoManual,textoAutomatico:false,revisado:false,revisaoSemantica:1});f.c.window.renderizarLaudoAvaliacaoKineSys();assert(f.nodes['ks-laudo-texto'].value.startsWith(legadoManual),'nem assinatura de modelo antigo autoriza substituir texto explicitamente manual');
}
console.log('Documento clínico: cabeçalho, seções, sintaxe, achados multirregionais, fonte íntegra, revisão, lados/negação e texto profissional preservados OK.');
