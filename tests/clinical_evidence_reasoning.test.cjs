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
caso('catálogo amplo de condições informadas possui IDs e famílias válidos',()=>{
 const cat=env.KineSysEvidenceProfiles;assert(cat.condicoes.length>=85);assert.equal(new Set(cat.condicoes.map(c=>c.id)).size,cat.condicoes.length);
 for(const c of cat.condicoes){assert(cat.familiasCondicoes[c.familia]);const r=api.extrairCondicoesInformadas('Paciente com diagnóstico de '+c.nome+'.');assert(r.condicoes.some(x=>x.condicaoId===c.id),c.id);assert(r.condicoes.every(x=>x.confirmacaoPeloSistema===false&&x.relacaoComQueixa==='nao_inferida'));}
});
caso('fratura tibial pós-operatória é condição informada e não planalto ou diagnóstico do sistema',()=>{
 const hma='Paciente com diagnóstico de fratura de tíbia esquerda em pós-operatório há 20 dias.',r=api.analisar(hma),c=r.condicoesInformadas[0];
 assert.equal(c.condicaoId,'fratura_tibia');assert.equal(c.fase,'pos_operatorio_informado');assert.equal(c.lateralidade,'esquerda');assert.equal(c.tempoInformado[0],'há 20 dias');assert.equal(c.confirmacaoPeloSistema,false);assert(!r.condicoesInformadas.some(x=>/planalto|pilao/.test(x.condicaoId)));assert(c.perguntas.some(p=>/restrições/.test(p)));
 assert.equal(hma.slice(c.origem.inicio,c.origem.fim),c.origem.trecho);assert.equal(r.origemHMA,hma);
 for(const s of ['Pós-operatório de fratura de tíbia.','Paciente com fratura da tíbia, pós-operatório.'])assert.equal(api.analisar(s).condicoesInformadas[0].fase,'pos_operatorio_informado');
});
caso('menção específica não duplica condição genérica; vocabulário não inventa subtipo',()=>{
 assert.deepEqual(Array.from(api.analisar('Paciente com artrite reumatoide e fratura do planalto tibial.').condicoesInformadas,c=>c.condicaoId),['artrite_reumatoide','fratura_planalto']);
 const r=api.analisar('Paciente com reumatismo e artrite.');assert(!r.condicoesInformadas.some(c=>c.condicaoId==='artrite_reumatoide'));assert.equal(r.condicoesInformadas.length,2);
 assert.equal(api.analisar('Paciente com chikungunha.').condicoesInformadas[0].condicaoId,'chikungunya');
});
caso('negativas e incerteza não viram diagnóstico já existente',()=>{
 for(const s of ['Nega artrite reumatoide.','Não tem artrite reumatoide.','Sem histórico de artrite reumatoide.','Nega diagnóstico de artrite reumatoide.','Não foi diagnosticada com artrite reumatoide.','Nega pós-operatório de fratura de tíbia.','Suspeita de artrite reumatoide.','Investiga artrite reumatoide.','Não sabe se tem artrite reumatoide.','Não nega artrite reumatoide.','Sem diagnóstico confirmado de artrite reumatoide.','Suspeita de diagnóstico de artrite reumatoide.','Artrite reumatoide em investigação.','Artrite reumatoide descartada.','Paciente refere que nega ser portador de artrite reumatoide.','Paciente refere que nega ter diagnóstico de artrite reumatoide.','Paciente tem necessidade de descartar artrite reumatoide.','Paciente tem dor, não está com artrite reumatoide.','Paciente tem artrite reumatoide (possível).'])assert.equal(api.analisar(s).condicoesInformadas.length,0,s);
});
caso('negação coordenada e mudança explícita de predicado mantêm escopo',()=>{
 const r=api.analisar('Nega diabetes e hipertensão. Nega artrite reumatoide, mas tem lúpus.');assert.deepEqual(Array.from(r.condicoesInformadas,c=>c.condicaoId),['lupus']);
 const outro=api.analisar('Paciente sem febre e com diagnóstico de artrite reumatoide.');assert.equal(outro.condicoesInformadas.length,1);
});
caso('histórico familiar não se confunde com o paciente',()=>{
 for(const s of ['Minha mãe tem artrite reumatoide.','Histórico familiar de artrite reumatoide.','Diagnóstico de artrite reumatoide na mãe.','Meu marido tem chikungunya.'])assert.equal(api.analisar(s).condicoesInformadas.length,0,s);
 const r=api.analisar('Minha mãe tem lúpus e o paciente tem artrite reumatoide.');assert.deepEqual(Array.from(r.condicoesInformadas,c=>c.condicaoId),['artrite_reumatoide']);
});
caso('chikungunya antiga não define fase crônica nem causa da dor',()=>{
 const r=api.analisar('Teve chikungunya há 4 anos. Dor no ombro direito ao elevar o braço.');const c=r.condicoesInformadas[0];assert.equal(c.temporalidade,'antecedente_informado');assert.equal(c.tempoInformado[0],'há 4 anos');assert.equal(c.relacaoComQueixa,'nao_inferida');assert(!/cronica|ativa/.test(c.fase));assert(!r.hipoteses.some(h=>/chikungunya/.test(h.id)));
});
caso('procedimento indicado não é realizado e não ativa pós-operatório',()=>{
 for(const hma of ['Indicação de artroplastia total de quadril.','Vai realizar artroplastia de quadril.','Artroplastia de quadril programada.']){const r=api.analisar(hma);assert.equal(r.condicoesInformadas.length,0,hma);assert.equal(r.mencoesCondicoes[0].estado,'procedimento_planejado');}
 const c=api.analisar('Realizou artroplastia de quadril direita em 2023.').condicoesInformadas[0];assert.equal(c.fase,'procedimento_realizado_informado');assert.equal(c.lateralidade,'direita');
});
caso('múltiplas condições e datas mantêm identidade e trecho original',()=>{
 const hma='Paciente com diagnóstico de fratura de tíbia esquerda em 2020. Tem artrite reumatoide desde 2015. Relata osteoporose.',r=api.analisar(hma);assert.equal(r.condicoesInformadas.length,3);
 for(const c of r.mencoesCondicoes)assert.equal(hma.slice(c.origem.inicio,c.origem.fim),c.origem.trecho);
 assert.equal(r.condicoesInformadas[0].lateralidade,'esquerda');assert.equal(r.condicoesInformadas[1].lateralidade,'');
 const composto='Paciente com diagnóstico de fratura de ti\u0301bia.';const cc=api.analisar(composto).condicoesInformadas[0];assert.equal(composto.slice(cc.origem.inicio,cc.origem.fim),cc.origem.trecho);
 const prefixo='\uD83D\uDCCB Paciente com diagnóstico de fratura de tíbia.';const cp=api.analisar(prefixo).condicoesInformadas[0];assert.equal(prefixo.slice(cp.origem.inicio,cp.origem.fim),cp.origem.trecho);
});
caso('diagnóstico não catalogado é conservado como relato sem criar cluster',()=>{
 const c=api.analisar('Encaminhamento com diagnóstico de condição rara denominada XYZ.').condicoesInformadas[0];assert.equal(c.condicaoId,'outra_condicao');assert.equal(c.fonte,'documento_mencionado');assert.equal(c.termoInformado,'condição rara denominada XYZ');assert(!c.confirmacaoPeloSistema);
 assert.equal(api.analisar('Picada de carrapato. Dor em várias articulações.').condicoesInformadas.length,0);
});
caso('plano conserva condição informada e hipóteses independentes sem testes falsos',()=>{
 const p=gerar('Paciente com diagnóstico de artrite reumatoide. Dor anterior no joelho direito ao agachar e subir escadas.');assert.equal(p.condicoesInformadas[0].condicaoId,'artrite_reumatoide');assert(p.hipoteses.some(h=>h.regiaoId==='joelho'));assert(!p.hipoteses.some(h=>h.id==='artrite_reumatoide'));assert(p.hipoteses.every(h=>h.exameAtual.positivos===0));
 assert.equal(gerar('Dor lateral no quadril ao deitar sobre o lado.').condicoesInformadas.length,0);
});
caso('afirmação e negativa divergentes ficam auditáveis',()=>{
 const r=api.analisar('Tem artrite reumatoide. Nega artrite reumatoide.');assert.equal(r.condicoesInformadas.length,1);assert(r.condicoesInformadas[0].divergencia);assert.equal(r.mencoesCondicoes.length,2);
});
caso('menção solta pede esclarecimento em vez de afirmar doença',()=>{
 const r=api.analisar('Fibromialgia? Dor difusa.');assert.equal(r.condicoesInformadas.length,0);assert.equal(r.mencoesCondicoes[0].estado,'mencao_a_esclarecer');
});
caso('família continua na frase seguinte até troca explícita de sujeito',()=>{
 assert.equal(api.analisar('Minha mãe tem lúpus. Tem artrite reumatoide.').condicoesInformadas.length,0);
 const r=api.analisar('Minha mãe tem lúpus. O paciente tem osteoporose.');assert.deepEqual(Array.from(r.condicoesInformadas,c=>c.condicaoId),['osteoporose']);
});
caso('datas anteriores e declaração posterior permanecem documentais',()=>{
 const c=api.analisar('Em 2020 teve chikungunya.').condicoesInformadas[0];assert.equal(c.tempoInformado[0],'Em 2020');assert.equal(c.temporalidade,'antecedente_informado');
 assert.equal(api.analisar('Artrite reumatoide diagnosticada em 2023.').condicoesInformadas.length,1);
 assert.equal(api.analisar('Paciente com artrite reumatoide?').condicoesInformadas.length,0);
});
caso('Radar real exibe condições isoladas, escapa fonte e limpa contexto anterior',()=>{
 const get=env.document.getElementById,box={hidden:true,dataset:{}},lista={innerHTML:''};env.escapeHTML=s=>String(s??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
 env.document.getElementById=id=>id==='ks20_hma_radar'?box:id==='ks20_hma_insights'?lista:get(id);
 try{
  gerar('Paciente com diagnóstico de fratura de tíbia esquerda em pós-operatório.');env.renderizarRadarHMAKineSys();assert.equal(box.hidden,false);assert(lista.innerHTML.includes('Diagnósticos e condições informados'));assert(lista.innerHTML.includes('Pós-operatório informado'));assert(lista.innerHTML.includes('Fratura de tíbia'));
  gerar('Paciente com diagnóstico de condição rara <img src=x onerror=alert(1)>.');env.renderizarRadarHMAKineSys();assert(!lista.innerHTML.includes('<img'));assert(lista.innerHTML.includes('&lt;img'));assert(!lista.innerHTML.includes('Fratura de tíbia'));
  gerar('');env.renderizarRadarHMAKineSys();assert.equal(box.hidden,true);assert.equal(lista.innerHTML,'');assert.equal(box.dataset.raciocinio,'null');
 }finally{env.document.getElementById=get;}
});
console.log(`${total} cenários de evidência compartilhada OK; ${env.KineSysEvidenceProfiles.condicoes.length} condições nominais verificadas.`);
module.exports={api,env,exemplo};
