/* KineSys — análise documental e realização linguística locais.
 * Sem modelo generativo, serviço remoto, diagnóstico ou prescrição.
 * A gramática tem cobertura finita. Informação desconhecida não é adivinhada.
 */
(function(root){
 'use strict';
 const VERSION='1.1.0',norm=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\s+/g,' ').trim();
 const uniq=a=>Array.from(new Set(a.filter(x=>x!==undefined&&x!==null&&x!=='')));
 const regionNames={cervical:'coluna cervical',ombro:'ombro',cotovelo:'cotovelo',punho_mao:'punho e mão',coluna_toracica:'coluna torácica',lombar:'coluna lombar',quadril:'quadril',joelho:'joelho',tornozelo_pe:'tornozelo e pé',cefaleia:'cabeça / cefaleia',atm:'ATM',perna:'perna'};
 const clone=x=>JSON.parse(JSON.stringify(x)),sentence=s=>{s=String(s||'').trim().replace(/[.;\s]+$/,'');return s?s[0].toUpperCase()+s.slice(1)+'.':'';};
 const noun='(?:dor(?:es)?|dormência|formigamento|parestesia|fraqueza|rigidez|edema|inchaço|cefaleia|choques?|instabilidade|limitação|dificuldade)';
 const symptoms=new RegExp('^(?:(?:o mesmo|a mesma|o paciente|a paciente|paciente)\\s+)?(?:(?:sente|tem|apresenta|está com|esta com|vem apresentando|queixa-se de|se queixa de)\\s+)?((?:muita?\\s+|pouca?\\s+)?'+noun+')\\b([\\s\\S]*)$','iu');
 const wrapper=/^(?:(?:o|a)\s+)?paciente\s+(?:relata|refere|informa)(?:\s+também)?(?:\s+que)?\s+|^(?:também\s+)?(?:relata|refere|informa)(?:\s+também)?(?:\s+que)?\s+/i;
 function slots(text){
  const base=String(text||'').trim(),body=base.replace(wrapper,'').replace(/[.;\s]+$/,'');
  const negative=new RegExp('^Nega\\s+(?:sentir|apresentar|ter)\\s+('+noun+'\\b[\\s\\S]*)$','iu').exec(base.replace(/[.;\s]+$/,''));
  if(negative)return {modelo:'sintoma_negado',corpo:negative[1]};
  const m=symptoms.exec(body);
  if(m)return {modelo:'sintoma_referido',predicado:m[1],complemento:m[2],corpo:body};
  const course=/^(?:o mesmo |a mesma )?(a dor(?:[^.;]*?)?|os sintomas(?:[^.;]*?)?)\s+(piora(?:m)?|melhora(?:m)?|aumenta(?:m)?|irradia(?:m)?|persiste(?:m)?|iniciou|começou)\b([\s\S]*)$/iu.exec(body);
  if(course)return {modelo:'comportamento_explicito',sujeito:course[1],predicado:course[2],complemento:course[3],corpo:body};
  return {modelo:'preservacao_documental',corpo:base};
 }
 function realize(model){
  if(model.modelo==='sintoma_negado')return sentence('Nega '+model.corpo);
  if(model.modelo==='sintoma_referido')return sentence('Relata '+model.predicado+model.complemento);
  if(model.modelo==='comportamento_explicito')return sentence(model.sujeito+' '+model.predicado+model.complemento);
  return model.corpo;
 }
 function analyzeStatement(original,base=original){
  const graph=root.KineSysSemanticGraph,model=slots(base);
  const parsed=graph?.analisar(original),propositions=parsed?.proposicoes||[];
  const protectedScope=propositions.some(p=>p.sujeito!=='paciente'||p.estado!=='relatado'||p.certeza!=='relatada'||p.tipo==='diagnostico_relatado'||p.tipo==='procedimento'||p.tipo==='medicamento');
  // A symptom grammar cannot remove hypothesis, denial, family history, causality,
  // medication scope or a dependent temporal reference from its source.
  const guards=/\b(?:nega|negou|n[aã]o|sem|suspeita|poss[ií]vel|talvez|investiga|diagn[oó]stico|m[aã]e|pai|irm[aã]o?|cirurgia|operad[oa]|ap[oó]s isso|desde ent[aã]o|causad[oa]|devido|secund[aá]ri[oa])\b/i.test(base);
  let candidate=realize(model),status='realizado',check=null;
  const negativeSafe=model.modelo==='sintoma_negado'&&propositions.length&&propositions.every(p=>p.tipo==='sintoma'&&p.estado==='negado'&&p.sujeito==='paciente'&&p.certeza==='relatada');
  if(model.modelo==='preservacao_documental'||((protectedScope||guards)&&!negativeSafe)||!graph||!propositions.length){candidate=base;status='preservado';}
  else {
   check=graph.validar(parsed,candidate);
   // Raw note and professionally polished baseline must both retain meaning.
   // Failure is visible in the audit, not permission to weaken a semantic test.
   if(!check.ok){candidate=original;status='revisar';}
  }
  return {versao:VERSION,modelo:model.modelo,slots:model,estado:status,origem:String(original||''),base:String(base||''),texto:candidate,
   proposicoes:clone(propositions),validacao:check?clone(check):null,
   ambiguidades:(parsed?.pendencias||[]).map(p=>({tipo:p.tipo,mensagem:p.mensagem}))};
 }
 function redactContext(value,field){
  // These are metadata wrappers created by the form, not words from a patient.
  // Their replacement preserves the clinical content as an opaque, typed slot.
  const templates={
   contexto_saude_observacao:['Sobre os antecedentes de saúde, foi informado: ','Antecedentes referidos: '],
   contexto_cirurgia_regiao:['No histórico de procedimentos, a região e o lado informados foram: ','Região e lado do procedimento referido: '],
   contexto_cirurgia_data:['A data aproximada informada para o histórico cirúrgico foi: ','Data aproximada do procedimento referido: '],
   contexto_trauma_observacao:['Quanto a traumas e restrições prévios, foi registrado: ','Histórico de traumas e restrições: '],
   contexto_trabalho_observacao:['Quanto à carga ocupacional, foi informado: ','Carga ocupacional referida: ']
  };
  const t=String(value||''),rule=templates[field];
  return rule&&t.startsWith(rule[0])?rule[1]+t.slice(rule[0].length):t;
 }
 function realizePlannedFact(fact,text,hasPrevious){
  if(!hasPrevious||!root.KineSysSemanticGraph||fact.analiseDocumental?.estado!=='realizado')return text;
  // Nominal clinical sentences reduce conversational repetition, only after a
  // source-attributed opening. Never elide denial, a drug, a relative or doubt.
  if(fact.analiseDocumental.modelo!=='sintoma_referido'||!fact.proposicoes?.every(p=>p.regiaoId&&p.sujeito==='paciente'&&p.estado==='relatado'&&p.certeza==='relatada')||!/^Relata /u.test(text))return text;
  const model=slots(text),predicate=model.predicado;
  if(!predicate)return text;
  const masculine=/\b(?:formigamento|edema|inchaço|choques?)$/iu.test(predicate),plural=/\b(?:dores|choques)$/iu.test(predicate);
  const attribution=masculine?(plural?'referidos':'referido'):(plural?'referidas':'referida');
  const candidate=sentence(predicate+' '+attribution+model.complemento),check=root.KineSysSemanticGraph.validar(root.KineSysSemanticGraph.analisar(text),candidate);
  if(!check.ok)return text;
  fact.realizacoes=Array.from(new Set([...(fact.realizacoes||[]),candidate]));
  fact.analiseDocumental.realizacaoPlanejada={texto:candidate,regra:'sintagma_nominal_com_escopo_preservado',validacao:clone(check)};
  return candidate;
 }
 function analyzeAssessment(data){
  const entries=[],add=(field,value,type,extra={})=>{
   if(value==null||value==='')return;
   const text=typeof value==='string'?value:null,parsed=text?root.KineSysSemanticGraph?.analisar(text,{campo:field}):null;
   entries.push({id:'entrada:'+entries.length,campo:field,tipo:type,valor:clone(value),...clone(extra),
    unidades:parsed?.fatos.map(f=>({trecho:f.origens[0].trecho,inicio:f.origens[0].inicio,fim:f.origens[0].fim,categoria:f.categoria,proposicoes:clone(f.proposicoes)}))||[],
    pendencias:clone(parsed?.pendencias||[])});
  };
  const fields={...(data.contextoAnamnese?.campos||{}),...(data.campos||{})};
  for(const [id,value] of Object.entries(fields)){
   if(/^paciente_(?:cpf|telefone)$/.test(id))continue; // not part of narrative analysis
   add(id,value,id==='paciente_hma'||id==='hma'?'historia':/medicamento/.test(id)?'uso_relatado':/cirurgia|trauma/.test(id)?'antecedente_relatado':/exame.*imagem/.test(id)?'imagem_documentada':'campo_clinico');
  }
  for(const [group,items] of Object.entries(data.gruposAnamnese||{}))if(items.length)add('gruposAnamnese.'+group,items,'selecao_estruturada');
  for(const type of ['medicamentos','cirurgias'])(data.complementos?.[type+'Itens']||[]).forEach((value,index)=>add('tags_'+type+'['+index+']',value,type==='medicamentos'?'medicamento_relatado':'procedimento_relatado'));
  for(const [group,state] of Object.entries(data.contextoAnamnese?.estados||{}))add('contextoAnamnese.estados.'+group,state,'estado_documental');
  (data.achados||[]).forEach(e=>(e.achados||[]).forEach((a,index)=>add('mapeamento.'+(e.id||e.regiaoId)+'.'+index,a.texto,'exame_registrado',{resultado:a.resultado,regiaoId:e.regiaoId||'',eixoId:e.id||''})));
  (data.exameLivre||[]).forEach(r=>add('clinicaEstruturada.exameLivre.'+r.id,r.texto,'exame_livre',{regiaoId:r.regiaoId||'',lado:r.lado||'',resultado:r.resultado||'descritivo',situacao:clone(r.situacao||{})}));
  if(data.funcional)add('clinicaEstruturada.funcional',data.funcional,'medidas_objetivos_plano');
  if(data.restricoes)add('restricoesPosOperatorias',data.restricoes,'restricoes_documentadas');
  (data.plano?.hipoteses||[]).forEach(h=>add('planoClinico.hipoteses.'+h.id,{id:h.id,nome:h.nome||'',regiaoId:h.regiaoId||''},'hipotese_registrada'));
  return {versao:VERSION,hma:String(fields.paciente_hma||fields.hma||''),entradas:entries,
   principios:['fonte_preservada','negativa_distinta_de_ausencia','hipotese_nao_e_diagnostico','teste_somente_com_vinculo_explicito','sem_inferencia_de_dose_ou_causalidade']};
 }
 function problemModel(plan){
  const groups=new Map();
  for(const fact of (plan.fatos||[]).filter(f=>f.tipo==='relato'))for(const p of fact.proposicoes||[]){
   // An irradiation destination, a relative, a denial or a surgical site is
   // not another independent complaint. Historical episodes remain separate.
   if(p.tipo!=='sintoma'||p.sujeito!=='paciente'||p.estado!=='relatado'||p.certeza!=='relatada'||!['local','origem_trajeto'].includes(p.papel))continue;
   const region=p.regiaoId||p.segmentoId;if(!region)continue;
   const key=region+'|'+(p.lado||'nao_informado');
   if(!groups.has(key))groups.set(key,{id:'queixa:'+key,regiaoId:region,regiao:regionNames[region]||p.local,lado:p.lado||'',fatoIds:[],sintomas:[],episodios:[],hipoteses:[]});
   const group=groups.get(key),source=fact.origens?.[0],text=source?.trecho||fact.redacao;
   group.fatoIds=uniq([...group.fatoIds,fact.id]);
   group.sintomas.push({proposicaoId:p.id,conceito:p.conceito,termo:p.termo,qualidade:p.qualidade||'',origem:clone(source||{}),papel:p.papel});
   const timeKey=JSON.stringify([p.temporalidade,p.tempo||[],p.marcadoresTemporais||[]]);
   let episode=group.episodios.find(e=>e.chave===timeKey);
   if(!episode){episode={chave:timeKey,temporalidade:p.temporalidade,duracao:clone(p.tempo||[]),momentos:clone(p.marcadoresTemporais||[]),fatoIds:[],inicio:[],modificadores:[],repercussoes:[]};group.episodios.push(episode);}
   episode.fatoIds=uniq([...episode.fatoIds,fact.id]);
   // Preserve a whole source-scoped clause: no modifier is copied to another
   // complaint merely because it is nearby in the note.
   const locais=uniq((fact.proposicoes||[]).filter(x=>x.tipo==='sintoma'&&x.sujeito==='paciente'&&x.estado==='relatado'&&['local','origem_trajeto'].includes(x.papel)).map(x=>(x.regiaoId||x.segmentoId)+'|'+x.lado));
   if(locais.length===1&&/\b(?:iniciou|comecou|apareceu|teve inicio)\b/.test(norm(text)))episode.inicio.push({fatoId:fact.id,texto:text,escopo:'somente_fato_de_origem'});
   if(locais.length===1&&/\b(?:piora|melhora|aumenta|reduz|alivia|agrava|ao |durante|apos)\b/.test(norm(text)))episode.modificadores.push({fatoId:fact.id,texto:text,escopo:'somente_fato_de_origem'});
   if(locais.length===1&&/\b(?:dificuldade|limitacao|incapacidade|acorda|sono|dormir|trabalho)\b/.test(norm(text)))episode.repercussoes.push({fatoId:fact.id,texto:text,escopo:'somente_fato_de_origem'});
  }
  for(const g of groups.values())g.hipoteses=(plan.correlacoes||[]).filter(c=>c.regiaoId===g.regiaoId).map(c=>({id:c.hipoteseId,nome:c.hipoteseAnamnese,ligacao:'mesma_regiao_apenas',criterioAtendido:c.criterioAtendido??null}));
  return [...groups.values()];
 }
 function evidenceModel(plan){
  return (plan.correlacoes||[]).map((c,index)=>{
   const results=[],seen=new Map();
   for(const r of c.resultados||[]){
    const key=JSON.stringify([r.eixoId,r.teste,r.resultado,r.lado||'']);if(seen.has(key)){seen.get(key).indices=uniq([...seen.get(key).indices,r.indice]);continue;}
    const result={eixoId:r.eixoId,indice:r.indice,indices:[r.indice],teste:r.teste,resultado:r.resultado,lado:r.lado||'',
     papel:r.resultado==='positivo'?'criterio_atendido':r.resultado==='negativo'?'criterio_nao_atendido':'inconclusivo',origem:'vinculo_explicito_existente'};
    seen.set(key,result);results.push(result);
   }
   const history=(plan.fatos||[]).filter(f=>f.tipo==='relato'&&(f.proposicoes||[]).some(p=>p.regiaoId===c.regiaoId&&p.sujeito==='paciente'&&!['movimento_modificador','procedimento_modificador'].includes(p.papel))).map(f=>({fatoId:f.id,texto:f.origens?.[0]?.trecho||f.redacao,papel:'contexto_documental_nao_confirmatorio'}));
   const state=c.evidenciasCompartilhadas?.estado||'nao_classificada';
   const divergent=['menos_compativel','localizacao_pendente','lateralidade_pendente','cronologia_pendente','dados_divergentes'].includes(state);
   return {id:'correlacao:'+(c.hipoteseId||index),hipoteseId:c.hipoteseId||'',hipotese:c.hipoteseAnamnese||'Hipótese sem nome registrado',regiaoId:c.regiaoId||'',regiao:c.regiao||regionNames[c.regiaoId]||'',
    historia:history,resultados:results,criterioAtendido:c.criterioAtendido??null,estadoHistoria:state,
    conclusao:c.semVinculo||!results.length?'sem_vinculo':divergent?'esclarecer_historia':c.criterioAtendido===true?'criterio_registrado_atendido':c.criterioAtendido===false?'criterio_registrado_nao_atendido':'interpretacao_pendente',
    limites:['resultado_positivo_nao_e_diagnostico','negativo_nao_exclui_isoladamente','correspondencia_regional_nao_e_causalidade']};
  });
 }
 function clarificationQuestions(plan,problems,evidence){
  const questions=[],seen=new Set(),facts=plan.fatos||[];
  const add=(type,key,question,factIds=[],target='paciente_hma',extra={})=>{
   const id=type+':'+key;if(seen.has(id))return;seen.add(id);
   questions.push({id,tipo:type,pergunta:question,fatoIds:clone(factIds),campoDestino:target,
    trechos:factIds.flatMap(fid=>facts.find(f=>f.id===fid)?.origens||[]).filter(o=>o.trecho).map(o=>({campo:o.campo,trecho:o.trecho,inicio:o.inicio,fim:o.fim})),...extra});
  };
  for(const f of facts.filter(f=>f.tipo==='relato')){
   const raw=f.origens?.[0]?.trecho||f.redacao||'',t=norm(raw);
   for(const p of f.proposicoes||[]){
    if(p.sujeito!=='paciente'||p.estado!=='relatado')continue;
    if(p.tipo==='sintoma'&&!p.regiaoId&&!p.segmentoId&&!['febre','cefaleia'].includes(p.conceito)&&!(/\bao dor\b|\bcom para\b/.test(t)))add('localizacao',f.id,'Em qual localização ocorre '+(p.termo||'esse sintoma')+'?',[f.id]);
    if(p.tipo==='sintoma'&&(p.regiaoId||p.segmentoId)&&!p.lado&&!['cefaleia'].includes(p.conceito))add('lado',f.id+'|'+(p.regiaoId||p.segmentoId),'O sintoma em '+(regionNames[p.regiaoId||p.segmentoId]||p.local)+' ocorre à direita, à esquerda ou dos dois lados?',[f.id]);
   }
   if(/\bao dor\b|\bcom para\b/.test(t))add('expressao_incompleta',f.id,'Qual era o sentido deste trecho incompleto? Reescreva-o na HMA.',[f.id]);
   if(/\bTPG\b/.test(raw))add('sigla',f.id,'Qual é a sigla e o resultado no exame original? Confira sem presumir outra sigla.',[f.id]);
   if(/\b(?:piora|melhora|aumenta|alivia)\b/.test(t)&&!f.proposicoes?.some(p=>p.regiaoId||p.segmentoId)&&problems.length>1)add('modificador_sem_queixa',f.id,'A qual queixa se refere este fator de piora ou melhora? Registre a localização na própria frase.',[f.id]);
   const locais=uniq((f.proposicoes||[]).filter(p=>p.tipo==='sintoma'&&p.sujeito==='paciente'&&p.estado==='relatado'&&['local','origem_trajeto'].includes(p.papel)).map(p=>(p.regiaoId||p.segmentoId)+'|'+p.lado));
   if(locais.length>1&&/\b(?:piora|melhora|aumenta|alivia|dificuldade|limitacao|acorda)\b/.test(t))add('escopo_multiplas_queixas',f.id,'Nesta frase há mais de uma queixa. Qual delas apresenta o fator de piora, melhora ou limitação? Separe as informações por localização.',[f.id]);
  }
  for(const pending of plan.pendenciasInterpretacao||[])if(pending.tipo==='referencia_nao_resolvida')add('referencia',pending.fatoId,'A quem ou a qual queixa esta referência se refere? Esclareça a frase na HMA.',[pending.fatoId]);
  for(const relation of plan.relacoes||[])if(relation.tipo==='possivel_contradicao')add('divergencia',[relation.de,relation.para].sort().join('|'),'Esses registros se referem ao mesmo momento e local? Confira a informação afirmada e a negada.',[relation.de,relation.para]);
  for(const item of evidence){
   if(item.conclusao==='sem_vinculo')add('vinculo_exame',item.id,'Quais testes foram realizados e explicitamente vinculados à hipótese '+item.hipotese+'?',[],'subtela_mapeamento',{hipoteseId:item.hipoteseId});
   if(item.conclusao==='esclarecer_historia')add('concordancia',item.id,'Como esclarecer localização, lado ou cronologia antes de correlacionar os exames à hipótese '+item.hipotese+'?',item.historia.map(h=>h.fatoId));
  }
  for(const f of facts.filter(f=>f.tipo==='exame_livre'))if(['rascunho','revisar','divergente'].includes(f.situacao?.tipo))add('revisao_exame_livre',f.id,'O exame digitado está completo, com região, lado e resultado conferidos? Revise antes de vinculá-lo a um critério.',[f.id],'subtela_mapeamento');
  return questions;
 }
 function qualityMetrics(plan,text){
  const graph=root.KineSysSemanticGraph,history={origem:plan.origemHMA||'',proposicoes:plan.proposicoes||[],pendencias:plan.pendenciasInterpretacao||[]};
  const check=graph?.validar(history,text,(plan.fatos||[]).filter(f=>f.tipo!=='relato').map(f=>f.redacao))||null;
  const sentences=String(text||'').split(/(?<=[.!?])\s+|\n+/u).map(norm).filter(Boolean),seen=new Set(),duplicates=[];
  for(const s of sentences){if(seen.has(s)&&s.length>15)duplicates.push(s);seen.add(s);}
  return {tipo:'indicadores_documentais_nao_probabilidade_clinica',proposicoesFonte:history.proposicoes.length,
   omissoes:check?.ausentes.length??null,introducoes:check?.introduzidas.length??null,nexosCausaisNovos:check?.causalidade.length??null,
   repeticoesLiterais:uniq(duplicates),verbosDeRelato:(String(text||'').match(/\b(?:refere|relata|informa)\b/gi)||[]).length,
   pendenciasDeEsclarecimento:plan.analiseDocumental?.perguntas?.length||0,validacaoDeSignificado:check?clone(check):null};
 }
 function analyzeDocument(plan,input){
  const units=(plan.fatos||[]).map(f=>{
   const parsed=root.KineSysSemanticGraph?.analisar(f.redacao||'')||{proposicoes:[],pendencias:[]};
   const origins=clone(f.origens||[]),props=clone(f.proposicoes||parsed.proposicoes||[]);
   return {id:f.id,tipo:f.tipo,assunto:f.categoria||f.tipo,origens:origins,
    textoFonte:f.textoOriginal||origins.map(o=>o.trecho||'').filter(Boolean).join(' ')||f.redacao||'',
    textoDocumental:f.redacao||'',proposicoes:props,realizacao:clone(f.analiseDocumental||null),
    registrosDeExame:clone(f.trechosDocumentais||[]),
    revisaoNecessaria:f.analiseDocumental?.estado==='revisar'||(parsed.pendencias||[]).some(p=>p.tipo==='referencia_nao_resolvida')};
  });
  const itinerary=(plan.blocos||[]).map((b,i)=>({ordem:i,assunto:b.tipo,fatos:Array.from(new Set(b.fatos||[])),texto:b.texto}));
  const covered=new Set(itinerary.flatMap(p=>p.fatos));
  // A duplicate can be represented by the same full realization, never just a
  // shared word or anatomical region. Every source remains in the ledger.
  for(const u of units){const f=plan.fatos.find(x=>x.id===u.id);if((f.realizacoes||[]).some(t=>itinerary.some(b=>norm(b.texto).includes(norm(t)))))covered.add(u.id);}
  const problems=problemModel(plan),evidence=evidenceModel(plan);
  return {versao:VERSION,tipo:'analisador_documental_local',semServicoExterno:true,entrada:input||null,unidades:units,roteiro:itinerary,
   problemasClinicos:problems,matrizEvidencias:evidence,perguntas:clarificationQuestions(plan,problems,evidence),
   fontes:clone(plan.fontes||[]),relacoes:clone(plan.relacoes||[]),
   fatosSemRoteiro:units.filter(u=>!covered.has(u.id)).map(u=>u.id),
   trechosParaRevisar:units.filter(u=>u.revisaoNecessaria).map(u=>u.id)};
 }
 root.KineSysDocumentAnalyzer=Object.freeze({version:VERSION,analisarAvaliacao:analyzeAssessment,analisarFrase:analyzeStatement,redigirFatoPlanejado:realizePlannedFact,redigirContexto:redactContext,analisarDocumento:analyzeDocument,avaliarQualidade:qualityMetrics});
})(typeof window==='undefined'?globalThis:window);
