/* KineSys — análise documental e realização linguística locais.
 * Sem modelo generativo, serviço remoto, diagnóstico ou prescrição.
 * A gramática tem cobertura finita. Informação desconhecida não é adivinhada.
 */
(function(root){
 'use strict';
 const VERSION='1.0.0',norm=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\s+/g,' ').trim();
 const clone=x=>JSON.parse(JSON.stringify(x)),sentence=s=>{s=String(s||'').trim().replace(/[.;\s]+$/,'');return s?s[0].toUpperCase()+s.slice(1)+'.':'';};
 const noun='(?:dor(?:es)?|dormência|formigamento|parestesia|fraqueza|rigidez|edema|inchaço|cefaleia|choques?|instabilidade|limitação|dificuldade)';
 const symptoms=new RegExp('^(?:(?:o mesmo|a mesma|o paciente|a paciente|paciente)\\s+)?(?:(?:sente|tem|apresenta|está com|esta com|vem apresentando|queixa-se de|se queixa de)\\s+)?((?:muita?\\s+|pouca?\\s+)?'+noun+')\\b([\\s\\S]*)$','iu');
 const wrapper=/^(?:(?:o|a)\s+)?paciente\s+(?:relata|refere|informa)(?:\s+também)?(?:\s+que)?\s+|^(?:também\s+)?(?:relata|refere|informa)(?:\s+também)?(?:\s+que)?\s+/i;
 function slots(text){
  const base=String(text||'').trim(),body=base.replace(wrapper,'').replace(/[.;\s]+$/,'');
  const m=symptoms.exec(body);
  if(m)return {modelo:'sintoma_referido',predicado:m[1],complemento:m[2],corpo:body};
  const course=/^(?:o mesmo |a mesma )?(a dor(?:[^.;]*?)?|os sintomas(?:[^.;]*?)?)\s+(piora(?:m)?|melhora(?:m)?|aumenta(?:m)?|irradia(?:m)?|persiste(?:m)?|iniciou|começou)\b([\s\S]*)$/iu.exec(body);
  if(course)return {modelo:'comportamento_explicito',sujeito:course[1],predicado:course[2],complemento:course[3],corpo:body};
  return {modelo:'preservacao_documental',corpo:base};
 }
 function realize(model){
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
  if(model.modelo==='preservacao_documental'||protectedScope||guards||!graph||!propositions.length){candidate=base;status='preservado';}
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
  return {versao:VERSION,tipo:'analisador_documental_local',semServicoExterno:true,entrada:input||null,unidades:units,roteiro:itinerary,
   fontes:clone(plan.fontes||[]),relacoes:clone(plan.relacoes||[]),
   fatosSemRoteiro:units.filter(u=>!covered.has(u.id)).map(u=>u.id),
   trechosParaRevisar:units.filter(u=>u.revisaoNecessaria).map(u=>u.id)};
 }
 root.KineSysDocumentAnalyzer=Object.freeze({version:VERSION,analisarAvaliacao:analyzeAssessment,analisarFrase:analyzeStatement,redigirFatoPlanejado:realizePlannedFact,redigirContexto:redactContext,analisarDocumento:analyzeDocument});
})(typeof window==='undefined'?globalThis:window);
