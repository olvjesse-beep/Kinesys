'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const src=fs.readFileSync('src/clinical/clinical_semantic_graph-1.0.0.js','utf8');
const c={window:{}};vm.createContext(c);vm.runInContext(src,c);const api=c.window.KineSysSemanticGraph;
const library=JSON.parse(fs.readFileSync('tests/fixtures/semantic_reference_cases.json','utf8'));
let total=0;function caso(nome,fn){fn();total++;console.log('Grafo semântico: '+nome+' OK');}
for(const ref of library.cases)caso('referência '+ref.id,()=>{
 const r=api.analisar(ref.hma);assert.equal(r.origem,ref.hma);
 for(const esperado of ref.expected)assert(r.proposicoes.some(p=>Object.entries(esperado).every(([k,v])=>JSON.stringify(p[k])===JSON.stringify(v))),JSON.stringify({esperado,obtido:r.proposicoes}));
 assert.deepEqual(Array.from(new Set(r.problemas.map(p=>p.regiaoId))).sort(),ref.regions.slice().sort());
 for(const f of r.fatos)for(const o of f.origens)assert.equal(ref.hma.slice(o.inicio,o.fim),o.trecho);
 assert(library.referenceNarratives[ref.id]);assert(api.validar(r,library.referenceNarratives[ref.id]).ok,'narrativa de referência deve conservar significado: '+ref.id);
});
caso('escopo de negação não atravessa contraste ou afirmação nova',()=>{
 const r=api.analisar('Nega dor no ombro esquerdo, mas apresenta dor no joelho direito.');
 assert(r.proposicoes.some(p=>p.regiaoId==='ombro'&&p.estado==='negado'));
 assert(r.proposicoes.some(p=>p.regiaoId==='joelho'&&p.estado==='relatado'));
});
caso('pseudonegativas e mudança do modificador não negam sintoma',()=>{
 for(const hma of ['Não nega dor no ombro direito.','Sem piora da dor no joelho esquerdo.','Nega que a dor no ombro direito seja persistente.']){
  const r=api.analisar(hma);assert(r.proposicoes.some(p=>p.estado==='indeterminado'));assert(!r.problemas.length);
 }
});
caso('duas lateralidades não se misturam na mesma frase',()=>{
 const r=api.analisar('Dor no ombro direito e no cotovelo esquerdo.');
 assert(r.proposicoes.some(p=>p.regiaoId==='ombro'&&p.lado==='direito'));assert(r.proposicoes.some(p=>p.regiaoId==='cotovelo'&&p.lado==='esquerdo'));
});
caso('negação, lateralidade e tempo adulterados são detectados',()=>{
 const r=api.analisar('Nega dor no ombro direito há 3 dias.');
 for(const adulterado of ['Refere dor no ombro direito há 3 dias.','Nega dor no ombro esquerdo há 3 dias.','Nega dor no ombro direito há 30 dias.']){
  const v=api.validar(r,adulterado);assert(!v.ok);assert(v.ausentes.length);assert(v.introduzidas.length);
 }
 assert(api.validar(r,r.origem).ok);
});
caso('momento de piora não pode migrar do sono para o despertar ou a manhã',()=>{
 const r=api.analisar('Dor no ombro direito ao dormir.');assert(api.validar(r,r.origem).ok);
 for(const falso of ['Dor no ombro direito ao acordar.','Dor no ombro direito de manhã.'])assert(!api.validar(r,falso).ok);
 assert(api.validar(api.analisar('Dor no ombro direito à noite.'),'Dor noturna no ombro direito.').ok);
});
caso('não basta manter as palavras se houver afirmação nova indevida',()=>{
 const r=api.analisar('Nega dor no ombro direito.');
 assert(!api.validar(r,r.origem+' Refere dor no ombro direito.').ok);
});
caso('comparação de referência mede significado, não igualdade de frases',()=>{
 const r=api.analisar('Refere dormência na mão esquerda.');
 assert(api.validar(r,'Relata adormecimento na mão esquerda.').ok,'equivalência documental deve manter a manifestação, estado/lado/local');
 assert(!api.validar(r,'Relata formigamento na mão esquerda.').ok,'sensações específicas não são sinônimos intercambiáveis');
 assert(!api.validar(r,'Relata adormecimento na mão direita.').ok);
});
caso('doses trocadas entre fármacos não passam porque todos os números existem',()=>{
 const hma='Usa medicamento Alfa 5 mg e medicamento Beta 10 mg.';const r=api.analisar(hma);
 assert.equal(r.proposicoes.filter(p=>p.tipo==='medicamento').length,2);assert(api.validar(r,hma).ok);
 assert(!api.validar(r,'Usa medicamento Alfa 10 mg e medicamento Beta 5 mg.').ok);
});
caso('contradições distintas de lado e momento não são fundidas',()=>{
 assert.equal(api.analisar('Dor no ombro esquerdo. Nega dor no ombro direito.').relacoes.length,0);
 assert.equal(api.analisar('No passado tinha dor no ombro esquerdo. Hoje nega dor no ombro esquerdo.').relacoes.length,0);
 assert(api.analisar('Dor no ombro esquerdo. Nega dor no ombro esquerdo.').relacoes.some(r=>r.tipo==='possivel_contradicao'));
});
caso('conteúdo não reconhecido e referência ambígua continuam rastreáveis',()=>{
 const hma='Evento descrito como "sensação alfa". Desde então, isso mudou.';const r=api.analisar(hma);
 assert.equal(r.origem,hma);assert(api.planejar(r).map(b=>b.texto).join(' ').includes('sensação alfa'));assert(r.pendencias.some(p=>p.tipo==='referencia_nao_resolvida'));
});
caso('diagnósticos e procedimentos não podem ser trocados por outro da mesma região',()=>{
 const a=api.analisar('Refere diagnóstico de doença alfa cervical.');
 assert(api.validar(a,a.origem).ok);assert(!api.validar(a,'Refere diagnóstico de doença beta cervical.').ok);
 const b=api.analisar('Aguarda artroplastia indicada para o quadril direito.');
 assert(api.validar(b,b.origem).ok);assert(!api.validar(b,'Aguarda artrodese indicada para o quadril direito.').ok);
});
caso('coocorrência não autoriza causalidade nova',()=>{
 const r=api.analisar('Dor cervical. Usa telefone.');const v=api.validar(r,'Dor cervical causada por telefone. Usa telefone.');
 assert(!v.ok);assert(v.causalidade.length);assert(api.validar(api.analisar('Dor cervical causada por postura segundo relato.'),'Dor cervical causada por postura segundo relato.').ok);
});
caso('planejamento por problema conserva significado e não inventa cabeçalhos',()=>{
 const r=api.analisar('Dor no joelho esquerdo. Dor no ombro direito. Rigidez no joelho esquerdo.'),bs=api.planejar(r),texto=bs.map(b=>b.texto).join('\n\n');
 assert.equal(bs.length,2);assert(bs[0].texto.includes('Rigidez no joelho'));assert(!bs[0].texto.includes('ombro'));assert(api.validar(r,texto).ok);
 assert(bs.every(b=>b.fatos.length));assert(!/HISTÓRIA|EXAME|IMPRESSÃO/.test(texto));
});
caso('biblioteca não se apresenta como aprovada pelo profissional nem envia dados',()=>{
 assert.equal(library.professionalReview,'pending');assert(!/fetch\(|XMLHttpRequest|localStorage|supabase|api[_-]?key|Math\.random/.test(src));
});
console.log(`${total} cenários de significado/origem/realização OK.`);
module.exports={api};
