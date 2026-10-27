/* KineSys — análise documental e realização linguística locais.
 * Sem modelo generativo, serviço remoto, diagnóstico ou prescrição.
 * A gramática tem cobertura finita. Informação desconhecida não é adivinhada.
 */
(function(root){
 'use strict';
 const VERSION='1.5.0',norm=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\s+/g,' ').trim();
 const uniq=a=>Array.from(new Set(a.filter(x=>x!==undefined&&x!==null&&x!=='')));
 const regionNames={cervical:'coluna cervical',ombro:'ombro',cotovelo:'cotovelo',punho_mao:'punho e mão',coluna_toracica:'coluna torácica',lombar:'coluna lombar',quadril:'quadril',joelho:'joelho',tornozelo_pe:'tornozelo e pé',cefaleia:'cabeça / cefaleia',atm:'ATM',perna:'perna'};
 const clone=x=>JSON.parse(JSON.stringify(x)),sentence=s=>{s=String(s||'').trim().replace(/[.;\s]+$/,'');return s?s[0].toUpperCase()+s.slice(1)+'.':'';};
 const noun='(?:dor(?:es)?|dormência|formigamento|parestesia|fraqueza|rigidez|edema|inchaço|cefaleia|choques?|instabilidade|limitação|dificuldade|queimação|hipersensibilidade|tontura|vertigem)';
 const symptoms=new RegExp('^(?:(?:o mesmo|a mesma|o paciente|a paciente|paciente)\\s+)?(?:(?:sente|tem|apresenta|está com|esta com|vem apresentando|queixa-se de|se queixa de)\\s+)?((?:muita?\\s+|pouca?\\s+)?'+noun+')\\b([\\s\\S]*)$','iu');
 const wrapper=/^(?:(?:o|a)\s+)?paciente\s+(?:relata|refere|informa)(?:\s+também)?(?:\s+que)?\s+|^(?:também\s+)?(?:relata|refere|informa)(?:\s+também)?(?:\s+que)?\s+/i;
 function slots(text){
  const base=String(text||'').trim(),body=base.replace(wrapper,'').replace(/[.;\s]+$/,'');
  const duracao=/^(?:A|Há|Ha)\s+(\d+)\s+(dias?|semanas?|m[eê]s(?:es)?|anos?)$/iu.exec(body);
  if(duracao)return {modelo:'duracao_informada',quantidade:duracao[1],unidade:duracao[2].toLowerCase(),escopo:'oracao_positiva_explicita'};
  const localSolto=/^D[oa]\s+(tornozelo|joelho|quadril|ombro|punho)\s+(esquerdo|direito)$/iu.exec(body);
  if(localSolto)return {modelo:'local_mencionado',local:localSolto[1].toLowerCase(),lado:localSolto[2].toLowerCase(),escopo:'oracao_positiva_explicita'};
  if(/^(?:Conta|Relata|Refere) que começou devagar e foi aumentando$/iu.test(body))return {modelo:'inicio_progressao_relatados',corpo:body,escopo:'oracao_positiva_explicita'};
  if(/^Os episódios duram (?:cerca de )?(?:[\p{L}]+|[\d.,]+) segundos e melhoram ao permanecer parado$/iu.test(body))return {modelo:'duracao_episodios_literal',corpo:base};
  // Closed documentary negatives remain literal. Recognition here does not
  // invent an examination, anatomy, diagnosis or the absent event's cause.
  const eventosNegados=/^Nega (.+)$/iu.exec(body);
  if(eventosNegados&&eventosNegados[1].split(/,\s*|\s+(?:e|ou)\s+/iu).every(item=>/^(?:novo trauma|trauma(?: recente)?|queda|estalo|febre|perda s[uú]bita de impuls[aã]o|feridas nos p[eé]s|dor no peito|falta de ar|perda de consci[eê]ncia|vis[aã]o dupla|fraqueza nos membros)$/iu.test(item.trim())))return {modelo:'negativa_eventos_literal',corpo:base};
  if(/^N[aã]o sofreu (?:entorse|trauma|queda)$/iu.test(body)||/^N[aã]o relata irradia[çc][aã]o para (?:os bra[çc]os|as m[aã]os|as pernas)$/iu.test(body))return {modelo:'negativa_eventos_literal',corpo:base};
  if(/^apertamento dos dentes(?: durante [\p{L}\s]+)?$/iu.test(body))return {modelo:'habito_mandibular_literal',corpo:base};
  if(/^Nega (?:travamento\b|perda de controle urinário\b)/iu.test(body))return {modelo:'negativa_clinica_literal',corpo:base};
  if(/^(?:A mãe|O pai|A irmã|O irmão) (?:tem|teve|apresenta)\s+.+$/iu.test(body))return {modelo:'antecedente_familiar_literal',corpo:base};
  if(/^(?:(?:o|a) paciente\s+)?(?:(?:apresenta|tem|relata|refere)\s+)?sono ruim$/iu.test(body))return {modelo:'qualidade_sono_relatada',corpo:body,escopo:'oracao_positiva_explicita'};
  const use=/^(?:(?:o|a) paciente\s+)?(?:usa|utiliza|toma|faz uso de)\s+(.+)$/iu.exec(body);
  if(use&&classifyFreeNote(body).medicamentoReconhecido)return {modelo:'uso_medicamentoso_relatado',complemento:use[1],corpo:body,escopo:'oracao_positiva_explicita'};
  const radiation=/^(dor)\s+(.+?)\s+que\s+irradia\s+(para\s+.+)$/iu.exec(body);
  if(radiation)return {modelo:'sintoma_com_irradiacao',predicado:radiation[1],origemLocal:radiation[2],trajeto:radiation[3],corpo:body};
  const sublocation=/^dor(?:\s+referida)?\s+na região\s+(d[oa]\s+.+?),\s*principalmente\s+(?:na\s+)?porção\s+(medial|lateral|anterior|posterior)$/iu.exec(body);
  if(sublocation)return {modelo:'sintoma_com_sublocalizacao',local:sublocation[1],qualificador:sublocation[2],corpo:body};
  const coordinated=/^((?:essa|esta|a) dor(?:\s+n[oa]\s+[^.;]+?)?)\s+piora\s+(.+?)\s+e\s+(?:agrava|piora|aumenta)\s+(.+)$/iu.exec(body);
  if(coordinated)return {modelo:'agravantes_coordenados',sujeito:coordinated[1],circunstancias:[coordinated[2],coordinated[3]],corpo:body};
  const negative=new RegExp('^Nega\\s+(?:sentir|apresentar|ter)\\s+('+noun+'\\b[\\s\\S]*)$','iu').exec(base.replace(/[.;\s]+$/,''));
  if(negative)return {modelo:'sintoma_negado',corpo:negative[1]};
  const activity=new RegExp('^(Ao\\s+[^,.;]+),\\s*(?:'+ '(?:o|a) paciente\\s+)?(?:refere\\s+|relata\\s+)?(?:sentir|sente|apresenta)\\s+('+noun+'\\b[\\s\\S]*)$','iu').exec(body);
  if(activity)return {modelo:'sintoma_com_circunstancia',predicado:activity[2],circunstancia:activity[1],corpo:body};
  const descriptor=/^(?:(?:(?:o|a) paciente|paciente)\s+(?:refere que\s+|relata que\s+)?)?(?:o|a)\s+(.+?)\s+(?:está|esta|permanece)\s+(dolorid[oa]|adormecid[oa]|inchad[oa])([\s\S]*)$/iu.exec(body);
  if(descriptor)return {modelo:'descritor_local_relatado',local:descriptor[1],predicado:descriptor[2],complemento:descriptor[3],corpo:body};
  const m=symptoms.exec(body);
  if(m)return {modelo:'sintoma_referido',predicado:m[1],complemento:m[2],corpo:body};
  const course=/^(?:o mesmo |a mesma )?(a dor(?:[^.;]*?)?|os sintomas(?:[^.;]*?)?)\s+(piora(?:m)?|melhora(?:m)?|aumenta(?:m)?|irradia(?:m)?|persiste(?:m)?|iniciou|começou)\b([\s\S]*)$/iu.exec(body);
  if(course)return {modelo:'comportamento_explicito',sujeito:course[1],predicado:course[2],complemento:course[3],corpo:body};
  return {modelo:'preservacao_documental',corpo:base};
 }
 function realize(model){
  if(model.modelo==='duracao_informada')return `Foi informada duração de ${model.quantidade} ${model.unidade}.`;
  if(model.modelo==='local_mencionado')return `Também foi mencionado o ${model.local} ${model.lado}.`;
  if(model.modelo==='inicio_progressao_relatados')return 'O início foi gradual, com aumento progressivo dos sintomas.';
  if(model.modelo==='qualidade_sono_relatada')return 'Relata sono de má qualidade.';
  if(model.modelo==='uso_medicamentoso_relatado')return sentence('Informa uso de '+model.complemento);
  if(model.modelo==='sintoma_com_irradiacao')return sentence('Relata '+model.predicado+' '+model.origemLocal+', com irradiação '+model.trajeto);
  if(model.modelo==='sintoma_com_sublocalizacao')return sentence('Relata dor na região '+model.local+', principalmente na porção '+model.qualificador);
  if(model.modelo==='agravantes_coordenados')return sentence(model.sujeito+' piora '+model.circunstancias.join(' e '));
  if(model.modelo==='sintoma_negado')return sentence('Nega '+model.corpo);
  if(model.modelo==='sintoma_com_circunstancia')return sentence('Relata '+model.predicado+', '+model.circunstancia[0].toLowerCase()+model.circunstancia.slice(1));
  if(model.modelo==='descritor_local_relatado')return sentence('Relata '+model.local+' '+model.predicado+model.complemento);
  if(model.modelo==='sintoma_referido')return sentence('Relata '+model.predicado[0].toLowerCase()+model.predicado.slice(1)+model.complemento);
  if(model.modelo==='comportamento_explicito')return sentence(model.sujeito+' '+model.predicado+model.complemento);
  return model.corpo;
 }
 function analyzeStatement(original,base=original){
  const graph=root.KineSysSemanticGraph,model=slots(base);
  const parsed=graph?.analisar(original),propositions=parsed?.proposicoes||[];
  const protectedScope=propositions.some(p=>p.sujeito!=='paciente'||p.estado!=='relatado'||p.certeza!=='relatada'||p.tipo==='diagnostico_relatado'||p.tipo==='procedimento'||p.tipo==='medicamento');
  // A symptom grammar cannot remove hypothesis, denial, family history, causality,
  // medication scope or a dependent temporal reference from its source.
  const guards=/["“”]|\b(?:nega|negou|n[aã]o|sem|suspeita|poss[ií]vel|talvez|investiga|diagn[oó]stico|m[aã]e|pai|irm[aã]o?|cirurgia|operad[oa]|ap[oó]s isso|desde ent[aã]o|causad[oa]|devido|secund[aá]ri[oa])\b/i.test(base);
  let candidate=realize(model),status='realizado',check=null;
  const negativeSafe=model.modelo==='sintoma_negado'&&propositions.length&&propositions.every(p=>p.tipo==='sintoma'&&p.estado==='negado'&&p.sujeito==='paciente'&&p.certeza==='relatada');
  const contextSafe=model.escopo==='oracao_positiva_explicita'&&!guards;
  if(model.modelo==='preservacao_documental'||((protectedScope||guards)&&!negativeSafe&&!contextSafe)||!graph||(!propositions.length&&!contextSafe)){candidate=base;status='preservado';}
  else {
   check=graph.validar(parsed,candidate);
   // Raw note and professionally polished baseline must both retain meaning.
   // Failure is visible in the audit, not permission to weaken a semantic test.
   if(!check.ok){candidate=original;status='revisar';}
  }
  return {versao:VERSION,modelo:model.modelo,slots:model,estado:status,origem:String(original||''),base:String(base||''),texto:candidate,
   proposicoes:clone(propositions),validacao:check?clone(check):null,interpretacaoPendente:model.modelo==='preservacao_documental'&&!propositions.length,
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
 function classifyFreeNote(value){
  // Classificação documental, não confirmação de diagnóstico ou de procedimento.
  // O campo onde se digitou não transforma um antecedente em teste realizado.
  const text=String(value||''),t=norm(text);
  const exam=/\b(?:teste|manobra|palpacao|amplitude|adm|reflexos?|mensurad[oa]|medida|positivo|negativo|inconclusivo|graus|slr|slump|spurling|faber(?:e)?|patrick|ultt\d*)\b/.test(t);
  const symptom=/\b(?:dor|dores|parestesia|fraqueza|dormencia|formigamento|edema|limitacao)\b/.test(t);
  const surgery=/\b(?:cirurgias?|cirurgic[oa]s?|operad[oa]|artrodeses?|artroplastias?|proteses?|cesariana|apendicectomia|mamoplastia|meniscectomia|colecistectomia|histerectomia)\b/.test(t);
  const usage=/\b(?:usa|usava|utiliza|utilizava|toma|tomava|uso de|em uso)\s+(.+)/i.exec(text);
  const query=usage?.[1]?.replace(/^(?:de|o|a)\s+/i,'').replace(/[.;]+$/,'').trim();
  let knownDrug=false;
  if(query&&root.KineSysMedicamentos?.buscar){
   const candidates=root.KineSysMedicamentos.buscar(query.split(/\s+/)[0])||[];
   knownDrug=candidates.some(item=>{const name=norm(item.nome||item.texto);return name&&(norm(query)===name||norm(query).startsWith(name+' '));});
  }
  const medication=/\b(?:medicamentos?|medicacao|infiltracao)\b/.test(t)||!!(usage&&(/\b\d+(?:[.,]\d+)?\s*(?:mg|mcg|ml)\b/.test(t)||knownDrug));
  const sleep=/\b(?:sono|insonia|dormir|dorme)\b/.test(t);
  const tipo=!exam&&surgery&&!symptom?'cirurgias':!exam&&medication?'medicamentos':!exam&&sleep&&!symptom?'antecedentes':'exame_livre';
  return {tipo,regra:tipo==='exame_livre'?'registro_de_exame_ou_descricao_a_revisar':'assunto_explicitamente_registrado',medicamentoReconhecido:knownDrug,textoOriginal:text};
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
   const qualifiers=p.qualificadoresLocal||[],key=region+'|'+(p.lado||'nao_informado')+(p.estruturaId?'|'+p.estruturaId:'')+(qualifiers.length?'|'+qualifiers.join(','):'');
   if(!groups.has(key))groups.set(key,{id:'queixa:'+key,regiaoId:region,regiao:(p.estruturaId?(regionNames[region]||region)+' — '+p.local:regionNames[region]||p.local)+(qualifiers.length?' ('+qualifiers.join(', ')+')':''),estruturaId:p.estruturaId||'',qualificadoresLocal:clone(qualifiers),lado:p.lado||'',fatoIds:[],sintomas:[],episodios:[],hipoteses:[]});
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
  // Regiões ainda sem hipótese ou exame não são hipóteses anônimas.
  return (plan.correlacoes||[]).filter(c=>c.hipoteseId||c.hipoteseAnamnese||(c.resultados||[]).length).map((c,index)=>{
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
   return {id:'correlacao:'+(c.hipoteseId||index),hipoteseId:c.hipoteseId||'',hipotese:c.hipoteseAnamnese||'Exame complementar registrado',regiaoId:c.regiaoId||'',regiao:c.regiao||regionNames[c.regiaoId]||'',
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
   if(f.analiseDocumental?.interpretacaoPendente)add('interpretacao_pendente',f.id,'Este trecho foi preservado, mas não recebeu interpretação automática. Confira e esclareça sua informação clínica na origem.',[f.id]);
   for(const p of f.proposicoes||[]){
    if(p.sujeito!=='paciente'||p.estado!=='relatado')continue;
    const modificador=['destino_trajeto','movimento_modificador','procedimento_modificador'].includes(p.papel),tarefa=p.conceito==='limitacao'&&/\b(?:para|ao|em) (?:calcar|vestir|caminhar|sentar|subir|descer|levantar|agachar)\b/.test(t);
    if(p.tipo==='sintoma'&&!p.regiaoId&&!p.segmentoId&&!modificador&&!tarefa&&!f.linguagem?.pendencias?.length&&!['febre','cefaleia','tontura','vertigem'].includes(p.conceito)&&!(/\bao dor\b|\bcom para\b/.test(t)))add('localizacao',f.id,'Em qual localização ocorre '+(p.termo||'esse sintoma')+'?',[f.id]);
    if(p.tipo==='sintoma'&&(p.regiaoId||p.segmentoId)&&!p.lado&&!modificador&&!['cefaleia','tontura','vertigem'].includes(p.conceito))add('lado',f.id+'|'+(p.regiaoId||p.segmentoId),'O sintoma em '+(regionNames[p.regiaoId||p.segmentoId]||p.local)+' ocorre à direita, à esquerda ou dos dois lados?',[f.id]);
   }
   if(/\bao dor\b|\bcom para\b/.test(t))add('expressao_incompleta',f.id,'Qual era o sentido deste trecho incompleto? Reescreva-o na HMA.',[f.id]);
   if(/\bTPG\b/.test(raw))add('sigla',f.id,'Qual é a sigla e o resultado no exame original? Confira sem presumir outra sigla.',[f.id]);
   if(/\b(?:piora|melhora|aumenta|alivia)\b/.test(t)&&!f.proposicoes?.some(p=>p.regiaoId||p.segmentoId)&&problems.length>1)add('modificador_sem_queixa',f.id,'A qual queixa se refere este fator de piora ou melhora? Registre a localização na própria frase.',[f.id]);
   const locais=uniq((f.proposicoes||[]).filter(p=>p.tipo==='sintoma'&&p.sujeito==='paciente'&&p.estado==='relatado'&&['local','origem_trajeto'].includes(p.papel)).map(p=>(p.regiaoId||p.segmentoId)+'|'+p.lado));
   if(locais.length>1&&/\b(?:piora|melhora|aumenta|alivia|dificuldade|limitacao|acorda)\b/.test(t))add('escopo_multiplas_queixas',f.id,'Nesta frase há mais de uma queixa. Qual delas apresenta o fator de piora, melhora ou limitação? Separe as informações por localização.',[f.id]);
  }
  for(const pending of plan.pendenciasInterpretacao||[]){
   if(pending.tipo==='referencia_nao_resolvida')add('referencia',pending.fatoId,pending.pergunta||'A quem ou a qual queixa esta referência se refere? Esclareça a frase na HMA.',[pending.fatoId]);
   if(pending.tipo==='vocabulario_ambiguo')add('vocabulario',pending.fatoId+'|'+pending.inicio,pending.pergunta,[pending.fatoId]);
  }
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
    linguagem:clone(f.linguagem||null),referencias:clone(f.referencias||[]),textoInterpretado:f.textoInterpretado||'',
    registrosDeExame:clone(f.trechosDocumentais||[]),
    revisaoNecessaria:f.analiseDocumental?.estado==='revisar'||!!f.analiseDocumental?.interpretacaoPendente||(parsed.pendencias||[]).some(p=>p.tipo==='referencia_nao_resolvida')};
  });
  const itinerary=(plan.blocos||[]).map((b,i)=>({ordem:i,assunto:b.tipo,fatos:Array.from(new Set(b.fatos||[])),texto:b.texto}));
  const covered=new Set(itinerary.flatMap(p=>p.fatos));
  // A duplicate can be represented by the same full realization, never just a
  // shared word or anatomical region. Every source remains in the ledger.
  for(const u of units){const f=plan.fatos.find(x=>x.id===u.id);if((f.realizacoes||[]).some(t=>itinerary.some(b=>norm(b.texto).includes(norm(t)))))covered.add(u.id);}
  const problems=problemModel(plan),evidence=evidenceModel(plan);
  return {versao:VERSION,tipo:'analisador_documental_local',semServicoExterno:true,entrada:input||null,unidades:units,roteiro:itinerary,
   problemasClinicos:problems,matrizEvidencias:evidence,perguntas:clarificationQuestions(plan,problems,evidence),
   fontes:clone(plan.fontes||[]),relacoes:clone(plan.relacoes||[]),marcadoresEstruturais:clone(plan.marcadoresEstruturais||[]),
   fatosSemRoteiro:units.filter(u=>!covered.has(u.id)).map(u=>u.id),
   trechosParaRevisar:units.filter(u=>u.revisaoNecessaria).map(u=>u.id)};
 }
 root.KineSysDocumentAnalyzer=Object.freeze({version:VERSION,classificarAnotacaoLivre:classifyFreeNote,analisarAvaliacao:analyzeAssessment,analisarFrase:analyzeStatement,redigirFatoPlanejado:realizePlannedFact,redigirContexto:redactContext,analisarDocumento:analyzeDocument,avaliarQualidade:qualityMetrics});
})(typeof window==='undefined'?globalThis:window);
