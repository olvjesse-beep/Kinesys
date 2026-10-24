'use strict';
// Dados exclusivamente sintéticos; executa o compositor real, sem rede/banco/paciente real.
const assert=require('node:assert/strict'),fs=require('node:fs');
const {fixture}=require('./evaluation_report_integration.test.cjs');
let count=0;
function caso(nome,fn){fn();count++;console.log('Semântica: '+nome+' OK');}
function preparar(hma){const f=fixture();f.fields[2].value=hma;return f;}
caso('fatos, planejamento, equivalência e origem imutável',()=>{
 const original='Paciente relata que no dia 3 de maio a mesma relata que sentiu uma fisgada no pescoço para o ombro. Relata que a dor não passou. Refere que fez mais de um mês a dor. Relata que a dor irradiou para escapula. A memsa relata que a mesma apresenta cefaleia cervicogenica. A mesma relata que a dor piora ao dormir. Paciente relata que a dor acorda a mesma anoite. Paciente relata que usa muito telefone. Paciente relata que sofreu queimadura na coxa.';
 const t=preparar(original),r=t.render(),s=r.semantica;
 assert.equal(t.fields[2].value,original);assert.equal(s.origemHMA,original);assert.equal(r.versaoTexto,22);
 assert(s.fatos.some(f=>f.tipo==='relato'&&f.categoria==='antecedentes'));assert(s.fatos.some(f=>f.tipo==='relato'&&f.categoria==='rotina'));
 assert(s.relacoes.some(r=>r.tipo==='detalhado_por'));assert(s.relacoes.some(r=>r.tipo==='mesmo_comportamento_dos_sintomas'));
 assert(r.texto.includes('A dor piora ao dormir e provoca despertares noturnos.'));
 assert(!r.texto.includes('Refere persistência da dor.'));assert(r.texto.includes('há mais de um mês'));
 const narrativaNormalizada=r.texto.toLocaleLowerCase('pt-BR');
 assert(narrativaNormalizada.indexOf('fisgada')<narrativaNormalizada.indexOf('cefaleia'));assert(narrativaNormalizada.indexOf('cefaleia')<narrativaNormalizada.indexOf('queimadura'));
 assert(s.fatos.filter(f=>f.tipo==='relato').every(f=>f.origens[0].campo==='paciente_hma'));
 assert.equal(s.validacao.ausentes.length,0);assert.equal(r.validacao.relatoAusente.length,0);
 assert(!/A Refere|memsa|a mesma|atingindo o critério|atingiu o critério/.test(r.texto));
});
caso('negação, lateralidade, quantificadores e dose',()=>{
 const t=preparar('Refere dor no ombro esquerdo. Nega dormência no braço direito. Usa dose informada de 25 mg à noite e refere dor de 3.5/10.');
 const r=t.render(),f=r.semantica.fatos.find(f=>f.atributos?.conceitos.some(c=>c.nome==='parestesia'));
 assert.equal(f.atributos.conceitos[0].estado,'negado');assert.deepEqual(Array.from(f.atributos.lados),['direito']);
 assert(r.texto.includes('25 mg'));assert(r.texto.includes('3.5/10'));assert(!r.texto.includes('ombro direito'));
 const alterado=t.c.window.validarTextoSemanticoAvaliacaoKineSys(r.texto.replace('25 mg','250 mg'));
 assert(alterado.ausentes.length>0);assert(alterado.numerosSemOrigem.includes('250'));
});
caso('contradição real exige revisão e suspende síntese',()=>{
 const t=preparar('Refere dormência na mão esquerda. Nega dormência na mão esquerda.'),r=t.render();
 assert(r.semantica.validacao.contradicoes.length>0);assert.equal(r.modo,'revisao');
 assert(r.texto.includes('depende do esclarecimento'));assert(!r.texto.includes('conjunto dos resultados registrados dá suporte'));
 assert(t.nodes['ks-laudo-status'].textContent.includes('contradições'));
});
caso('lados e momentos diferentes não viram contradição',()=>{
 for(const hma of ['Refere dormência na mão esquerda. Nega dormência na mão direita.','No passado, tinha dormência na mão esquerda. Atualmente nega dormência na mão esquerda.']){
  const r=preparar(hma).render();assert.equal(r.semantica.validacao.contradicoes.length,0);
 }
});
caso('escopo da negativa não inventa ausência nem presença',()=>{
 for(const hma of ['Não nega dormência na mão esquerda. Refere dormência na mão esquerda.','Sem piora da dormência na mão esquerda. Refere dormência na mão esquerda.','Nega que a dormência seja persistente. Refere dormência.']){
  const r=preparar(hma).render();assert.equal(r.semantica.validacao.contradicoes.length,0);assert(r.semantica.fatos.some(f=>f.atributos?.conceitos.some(c=>c.estado==='indeterminado')));
 }
});
caso('suspeita relatada não vira diagnóstico confirmado',()=>{
 const r=preparar('Refere possível cefaleia cervicogênica, ainda em investigação.').render();
 assert(r.semantica.fatos.some(f=>f.atributos?.incerteza));assert(r.texto.includes('possível'));assert(!/diagnóstico confirmado|cefaleia confirmada/.test(r.texto));
});
caso('teste de outro eixo não sustenta a hipótese alvo',()=>{
 const t=preparar('Refere dor no pescoço e no ombro.');
 t.tests=[{regiaoId:'cervical',regiao:'Coluna cervical',id:'outro_eixo',nome:'Outro eixo',achados:[{texto:'Teste sintético A',resultado:'positivo'},{texto:'Teste sintético B',resultado:'positivo'},{texto:'Teste sintético C',resultado:'positivo'}]}];
 const r=t.render();assert(r.texto.includes('sem vínculo registrado'));assert(r.validacao.hipotesesSemVinculo.length);
 assert.equal(r.semantica.correlacoes[0].resultados.length,0);assert.equal(r.semantica.correlacoes[0].criterioAtendido,null);
 assert(!r.semantica.relacoes.some(r=>r.tipo==='fundamenta_sintese_documental'));assert(!r.texto.includes('dá suporte'));
});
caso('duplicação de teste não aumenta a sustentação',()=>{
 const t=preparar('Refere dor cervical.');
 t.tests=[{regiaoId:'cervical',regiao:'Coluna cervical',id:'radiculopatia_cervical',nome:'Radiculopatia Cervical',achados:[{texto:'Teste único',resultado:'positivo'},{texto:'Teste único',resultado:'positivo'},{texto:'Teste único',resultado:'positivo'}]}];
 const r=t.render();assert.equal(r.semantica.correlacoes[0].resultados.length,1);assert.equal(r.semantica.correlacoes[0].criterioAtendido,false);
 assert(r.texto.includes('a combinação de resultados ainda é insuficiente'));
});
caso('associação documental rastreável, nunca causalidade inventada',()=>{
 const r=preparar('Refere dor no pescoço. Usa telefone por muitas horas. Relata queimadura antiga na coxa.').render(),s=r.semantica;
 assert(s.relacoes.some(r=>r.tipo==='mesma_regiao_documentada'));assert(s.relacoes.some(r=>r.tipo==='fundamenta_sintese_documental'));
 for(const e of s.relacoes.filter(r=>r.tipo==='fundamenta_sintese_documental')){
  const origem=s.fatos.find(f=>f.id===e.de);assert.equal(origem.eixoId,'radiculopatia_cervical');assert.equal(origem.tipo,'exame');
 }
 assert(!/causad[ao] por|devido ao telefone|queimadura causou/.test(r.texto));
});
caso('caracterização da dor é incorporada e rastreada',()=>{
 const t=preparar('Refere desconforto durante atividade.');
 t.fields.push({id:'paciente_tipo_dor',value:'queimação',type:'text',tagName:'INPUT',disabled:false,labels:[{textContent:'Qualidade da dor',querySelector:()=>null}],classList:{contains:()=>false},closest:()=>null});
 const r=t.render();assert(r.texto.includes('qualidade da dor foi registrada como queimação'));
 assert(r.semantica.fontes.some(f=>f.campo==='paciente_tipo_dor'));assert(r.semantica.fatos.some(f=>f.origens.some(o=>o.campo==='paciente_tipo_dor')));
});
caso('fatos não reconhecidos e âncoras temporais são preservados',()=>{
 const t=preparar('Apresentou evento descrito como "zumbido mecânico". Desde então, evita a mesma atividade. Refere melhora apenas após 12 minutos.');
 const r=t.render();assert(r.texto.includes('"zumbido mecânico"'));assert(r.texto.indexOf('evento descrito')<r.texto.indexOf('Desde então'));assert(r.texto.includes('12 minutos'));
 assert.equal(r.semantica.validacao.ausentes.length,0);
});
caso('omissão e texto inventado não passam como cobertura válida',()=>{
 const t=preparar('Refere dor no ombro esquerdo. Nega parestesia na mão direita.'),r=t.render();
 const v=t.c.window.validarTextoSemanticoAvaliacaoKineSys(r.texto.replace('Nega parestesia na mão direita.',''));
 assert(v.ausentes.some(id=>id.startsWith('hma:')));assert(!v.ok);
 assert(!t.c.window.validarTextoSemanticoAvaliacaoKineSys(r.texto+'\nNova dose de 999 mg.').ok);
});
caso('JSON persistido preserva fatos, relações, texto e original',()=>{
 const t=preparar('Refere dor cervical há 4 semanas. Nega febre.'),r=t.render(),json=JSON.parse(JSON.stringify(r));
 t.c.window.preencherLaudoAvaliacaoKineSys(json);t.c.window.renderizarLaudoAvaliacaoKineSys();
 const reaberto=t.c.window.coletarLaudoAvaliacaoKineSys();assert.equal(reaberto.texto,r.texto);assert.equal(JSON.stringify(reaberto.semantica),JSON.stringify(r.semantica));
 t.c.window.preencherLaudoAvaliacaoKineSys({...r,texto:'Texto profissional preservado.',textoAutomatico:false,revisado:true});t.c.window.renderizarLaudoAvaliacaoKineSys();
 assert(t.nodes['ks-laudo-texto'].value.startsWith('Texto profissional preservado.'));
});
caso('grafo sem origem vazia e sem referências a fatos inexistentes',()=>{
 const r=preparar('Refere dor cervical. Refere dor cervical. Refere piora ao dormir.').render(),s=r.semantica,ids=new Set(s.fatos.map(f=>f.id));
 assert(s.fatos.every(f=>f.origens.length));
 for(const relacao of s.relacoes){assert(ids.has(relacao.para));if(relacao.de)assert(ids.has(relacao.de));else assert(relacao.origem.campo);}
 for(const bloco of s.blocos)for(const id of bloco.fatos)assert(ids.has(id));
});
caso('narrativa longa é dividida sem perder fatos',()=>{
 const hma=Array.from({length:30},(_,i)=>`Refere dor com característica informada número ${i+1}, mantendo detalhe descritivo específico.`).join(' ');
 const r=preparar(hma).render();assert(r.semantica.blocos.filter(b=>b.tipo==='queixa').length>1);assert.equal(r.semantica.validacao.ausentes.length,0);
 for(let i=1;i<=30;i++)assert(r.texto.includes(`número ${i},`));
});
caso('motor sem rede, IA externa ou nova tabela',()=>{
 const src=fs.readFileSync('src/clinical/evaluation_workspace-1.17.0.js','utf8');
 const core=src.slice(src.indexOf('const CONCEITOS_RELATO'),src.indexOf('function descricaoDocumentalDoAchado'));
 assert(!/fetch\(|XMLHttpRequest|\b(?:supabase|supabaseClient)\.(?:rpc|from)\(|api[_-]?key|Math\.random/.test(core));
});
caso('quadro multirregional: queixas agrupadas e diagnóstico/indicação apenas relatados',()=>{
 const original='Refere que está apresentando diagnóstico de hernia lombar e hernia de disco cervical. O mesmo recebeu indicação de cirurgia da lombar e cervical. Refere que sente dores na região do cotovelo bilateralmente. Refere que sente dores no ombro direito. O mesmo relata que sente choques na região do halux direito e dedo mínimo esquerdo. Refere que o GAMA GP/TPG está alto.';
 const t=preparar(original),r=t.render(),s=r.semantica;
 assert.equal(s.origemHMA,original);assert.equal(t.fields[2].value,original);
 assert(r.texto.includes('Relata dor em ambos os cotovelos e no ombro direito.'));
 assert(r.texto.includes('Segundo o relato, há diagnóstico de hérnia lombar e hérnia de disco cervical.'));
 assert(r.texto.includes('Informa indicação cirúrgica da lombar e cervical.'));
 assert(r.texto.includes('choques no hálux direito e dedo mínimo esquerdo'));
 assert(r.texto.includes('GAMA GP/TPG'));assert(!r.texto.includes('TGP'));assert(!/O mesmo|A mesma/.test(r.texto));
 assert(s.blocos.some(b=>b.tipo==='diagnosticos_relatados'));assert(s.blocos.some(b=>b.tipo==='indicacoes_relatadas'));
 assert.equal(s.validacao.ausentes.length,0);assert.equal(r.validacao.relatoAusente.length,0);
 assert(!/cirurgia realizada|foi operado|hérnia confirmada/.test(r.texto));
});
caso('negação contextual não ganha prefixo burocrático nem cirurgia positiva',()=>{
 const t=preparar('Refere dor cervical.');t.notes.contexto_trauma_observacao='Nega cirurgias.';
 t.notes.contexto_saude_observacao='Paciente relata que era tabagista e etilista porém parou há 2 anos.';
 const r=t.render();assert(r.texto.includes('Nega cirurgias.'));assert(!r.texto.includes('foi registrado: Nega'));
 assert(r.texto.includes('interrupção de ambos há 2 anos'));assert.equal(r.validacao.contextoAusente.length,0);assert.equal(r.semantica.validacao.ausentes.length,0);
});
caso('critério neurológico negativo não inverte o significado do resultado',()=>{
 for(const resultado of ['positivo','negativo','inconclusivo']){
  const t=preparar('Refere dor cervical.');t.tests=[{regiaoId:'cervical',regiao:'Coluna cervical',id:'eixo_mecanico',achados:[{texto:'Exame neurológico sem padrão radicular ou mielopático',resultado}]}];
  const r=t.render();assert(!r.texto.includes('houve resposta positiva'));assert.equal(r.validacao.testesAusentes.length,0);assert.equal(r.semantica.validacao.ausentes.length,0);
  if(resultado==='positivo')assert(r.texto.includes('não foi identificado padrão radicular ou mielopático'));
  if(resultado==='negativo'){assert(r.texto.includes('não confirmou a ausência'));assert(!r.texto.includes('foi identificado padrão radicular'));}
  if(resultado==='inconclusivo')assert(r.texto.includes('permaneceu inconclusivo'));
 }
});
console.log(`${count} cenários semânticos adversariais completos OK.`);
