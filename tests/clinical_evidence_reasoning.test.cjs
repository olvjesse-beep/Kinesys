'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const {env,gerar,limpar}=require('./radar_multicomplaint.test.cjs');
for(const file of ['database/clinical_evidence_profiles-1.0.0.js','src/clinical/clinical_evidence_reasoning-1.0.0.js'])vm.runInContext(fs.readFileSync(file,'utf8'),env);
const api=env.KineSysEvidenceReasoning;let total=0;function caso(nome,fn){limpar();fn();total++;console.log('Evidências HMA: '+nome+' OK');}
const exemplo='Paciente relata dor no tornozelo ao amanhecer o dia no primeiro passo do dia. Essa dor está localizada na região lateral do tornozelo e percorre a canela na parte lateral. O mesmo relata que sofreu uma entorse.';
caso('caso lateral com primeiros passos não promove fasciopatia plantar',()=>{
 const r=env.analisarHMAClinicaKineSys(exemplo);assert(r.raciocinio);assert(!/fasciopatia/i.test(r.suspeitaPrincipal?.nome||''));
 const pf=r.raciocinio.hipoteses.find(h=>h.id==='dor_plantar_calcanhar');assert.equal(pf.estado,'menos_compativel');assert(pf.contra.some(e=>e.tipo==='localizacao_divergente'));
 assert(r.perguntasEntrevista.some(q=>q.id==='evento'));assert(r.perguntasEntrevista.some(q=>q.id==='plantar'));assert(r.achados.some(a=>a.titulo.includes('cronologia')));
 assert.equal(r.raciocinio.hipoteses.find(h=>h.id==='entorse_lateral_tornozelo').estado,'cronologia_pendente');
 assert(r.diferenciais.findIndex(h=>h.evidenciasCompartilhadas?.id==='entorse_lateral_tornozelo')<r.diferenciais.findIndex(h=>h.evidenciasCompartilhadas?.id==='dor_plantar_calcanhar'));
});
caso('plantar/calcanhar típico mantém hipótese e não vira entorse',()=>{
 const r=env.analisarHMAClinicaKineSys('Dor plantar medial no calcanhar nos primeiros passos da manhã.');
 assert(/fasciopatia/i.test(r.suspeitaPrincipal?.nome||''));assert(!r.raciocinio.hipoteses.some(h=>h.id==='entorse_lateral_tornozelo'));
});
caso('localização ausente e negativa são estados diferentes',()=>{
 const a=api.analisar('Dor no tornozelo nos primeiros passos.'),b=api.analisar('Nega dor no calcanhar. Dor na lateral do tornozelo nos primeiros passos.');
 assert.equal(a.hipoteses.find(h=>h.id==='dor_plantar_calcanhar').estado,'localizacao_pendente');
 assert(b.hipoteses.find(h=>h.id==='dor_plantar_calcanhar').contra.some(c=>c.tipo==='negativa_explicita'));
});
caso('entorse remota não se torna aguda nem desaparece',()=>{
 const r=api.analisar('Dor lateral no tornozelo. Teve entorse há 10 anos.');
 assert.equal(r.cronologia.eventos[0].temporalidade,'anterior');assert.equal(r.cronologia.relacaoComSintomas,'nao_esclarecida');
 assert.equal(r.hipoteses.find(h=>h.id==='entorse_lateral_tornozelo').estado,'menos_compativel');assert(r.perguntas.some(q=>q.id==='evento'));
});
caso('recente não significa causa e relação explícita permanece relatada',()=>{
 const a=api.analisar('Dor lateral no tornozelo. Entorse ontem.'),b=api.analisar('Dor lateral no tornozelo começou depois da entorse ontem.');
 assert.equal(a.cronologia.eventos[0].temporalidade,'recente');assert.equal(a.cronologia.relacaoComSintomas,'nao_esclarecida');assert.equal(b.cronologia.relacaoComSintomas,'relatada');
});
caso('duração não vira fase aguda automaticamente e outro evento não fornece causalidade',()=>{
 const r=api.analisar('Dor lateral no tornozelo. Entorse há 5000 dias.');assert.equal(r.cronologia.eventos[0].temporalidade,'tempo_informado');assert.equal(r.cronologia.eventos[0].tempoInformado,'há 5000 dias');assert(!r.cronologia.perguntarData);
 const outro=api.analisar('Dor no joelho começou depois da entorse ontem. Dor lateral no tornozelo.');assert(!outro.hipoteses.some(h=>h.id==='entorse_lateral_tornozelo'));
});
caso('familiar e negativa não alimentam evidência própria',()=>{
 const r=api.analisar('Minha mãe teve entorse ontem. Nega dor no calcanhar. Dor no joelho esquerdo nos primeiros passos.');
 assert.equal(r.hipoteses.length,0);assert(!r.cronologia.eventos.length);
});
caso('negativas verbais, incerteza e outros familiares não inventam entorse',()=>{
 for(const trecho of ['Não teve entorse.','Não sofreu entorse.','Nunca torceu o pé.','Minha esposa teve entorse.','Meu filho teve entorse.','Não sabe se sofreu uma entorse.']){
  const r=api.analisar('Dor lateral no tornozelo. '+trecho);assert(!r.hipoteses.some(h=>h.id==='entorse_lateral_tornozelo'),trecho);
 }
});
caso('primeiros passos do joelho não contaminam tornozelo',()=>{
 const r=api.analisar('Dor no joelho nos primeiros passos. Dor na lateral do tornozelo.');assert(!r.hipoteses.some(h=>h.id==='dor_plantar_calcanhar'));
});
caso('sintoma e localização em pés diferentes não são somados',()=>{
 const r=api.analisar('Dor plantar no calcanhar direito. Dor no tornozelo esquerdo nos primeiros passos.');
 const h=r.hipoteses.find(h=>h.id==='dor_plantar_calcanhar');assert.equal(h.estado,'lateralidade_pendente');assert(r.perguntas.some(q=>q.id==='lados'));
 const outra=api.analisar('Dor plantar no calcanhar direito nos primeiros passos. Nega dor no calcanhar esquerdo.');
 assert.equal(outra.hipoteses.find(h=>h.id==='dor_plantar_calcanhar').estado,'compativel_com_relato');
});
caso('diferenciais próximos distinguem localização e comportamento',()=>{
 const casos=[['Dor acima do tornozelo após entorse com piora na rotação externa.','lesao_sindesmose'],['Dor atrás do maléolo lateral e estalo atrás do maléolo lateral.','instabilidade_tendoes_fibulares'],['Dor profunda no tornozelo com travamento.','lesao_osteocondral_talus'],['Dor no seio do tarso ao caminhar em terreno irregular.','dor_sinus_tarsi'],['O tornozelo falseia e torce repetidamente.','instabilidade_cronica_tornozelo']];
 for(const [hma,id] of casos)assert(api.analisar(hma).hipoteses.some(h=>h.id===id&&h.estado==='compativel_com_relato'),id);
});
caso('banco suplementar idempotente e sem limiares novos',()=>{
 const banco=vm.runInContext('BANCO_MAPEAMENTO_CLINICO',env),antes=JSON.stringify(banco.tornozelo_pe.clusters);
 env.KineSysEvidenceProfiles.instalarBanco(banco);env.KineSysEvidenceProfiles.instalarBanco(banco);
 for(const id of ['patologia_tendoes_fibulares','instabilidade_tendoes_fibulares','lesao_osteocondral_talus','dor_sinus_tarsi']){const itens=banco.tornozelo_pe.diferenciais.filter(i=>i.id===id);assert.equal(itens.length,1);assert(!itens[0].limiar&&!itens[0].regraConfirmacao);assert(itens[0].testes.length&&itens[0].evidencia);}
 assert.equal(JSON.stringify(banco.tornozelo_pe.clusters),antes);
});
caso('plano e leitura usam a mesma fonte, sem apagar testes registrados',()=>{
 const p=gerar(exemplo);assert.equal(p.raciocinio.fonteId,p.hmaResultado.raciocinio.fonteId);assert(p.hipoteses.every(h=>h.fonteRaciocinio===p.raciocinio.fonteId));assert(p.exame.testesPrioritarios.length);
 assert(p.hipoteses.some(h=>h.id==='entorse_lateral_tornozelo'),'entorse em frase separada deve permanecer como evento a esclarecer');
 const plantar=p.hipoteses.find(h=>h.id==='dor_plantar_calcanhar');if(plantar)assert(!plantar.aFavor.some(x=>/corresponde à hipótese|relaciona-se a diferencial/.test(x)));
});
caso('calcanhar sem sublocalização pede esclarecimento em vez de afirmar padrão plantar',()=>{
 const hma='Dor no calcanhar nos primeiros passos ao acordar.',r=api.analisar(hma),p=gerar(hma);
 assert.equal(r.hipoteses.find(h=>h.id==='dor_plantar_calcanhar').estado,'localizacao_pendente');assert(p.exame.testesPrioritarios.length);
 assert(!r.hipoteses[0].contra.some(c=>c.tipo==='localizacao_divergente'));
});
caso('quatro novos diferenciais chegam ao plano canônico com testes próprios',()=>{
 const casos=[['Dor atrás do maléolo lateral e piora com eversão.','patologia_tendoes_fibulares'],['Dor atrás do maléolo lateral e estalo atrás do maléolo lateral.','instabilidade_tendoes_fibulares'],['Dor profunda no tornozelo com travamento.','lesao_osteocondral_talus'],['Dor no seio do tarso ao caminhar em terreno irregular.','dor_sinus_tarsi']];
 for(const [hma,id] of casos){const p=gerar(hma),h=p.hipoteses.find(h=>h.id===id);assert(h,id);assert(h.aFavor.length);assert.equal(h.evidenciasCompartilhadas.estado,'compativel_com_relato');assert(p.exame.testesPrioritarios.some(t=>t.hipoteseIds.includes(id)),id+' sem teste próprio');}
});
caso('origens exatas e fonte imutável; sem dados fictícios tratados como achados',()=>{
 const r=api.analisar(exemplo);assert.equal(r.origemHMA,exemplo);for(const e of r.evidencias)assert.equal(exemplo.slice(e.origem.inicio,e.origem.fim),e.origem.trecho);
 for(const h of r.hipoteses)for(const f of h.aFavor)assert(f.origem&&f.evidenciaIds.length);assert(r.hipoteses.every(h=>h.fontes.length&&h.limite));
});
caso('cache não conserva origem antiga após correção de caixa ou acento',()=>{
 env.analisarHMAClinicaKineSys(exemplo);const novo=exemplo.toUpperCase();assert.equal(env.analisarHMAClinicaKineSys(novo).raciocinio.origemHMA,novo);
});
caso('perguntas gerais cobrem outras regiões sem diagnosticar por omissão',()=>{
 const r=api.analisar('Dor cervical. Dor no ombro direito. Dor no joelho esquerdo.');
 for(const id of ['cervical','ombro','joelho'])assert(r.perguntas.some(q=>q.regiaoId===id));assert.equal(r.hipoteses.length,0);
});
console.log(`${total} cenários de evidência compartilhada OK.`);
module.exports={api,env,exemplo};
