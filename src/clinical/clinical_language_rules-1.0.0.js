/* Deterministic Portuguese clinical language: tokens, finite clauses and
 * source-bound references. No model, external service, diagnosis or learning. */
(function(root){
 'use strict';
 const VERSION='1.1.0',norm=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase(),copy=v=>JSON.parse(JSON.stringify(v));
 function tokens(text){return Array.from(String(text||'').matchAll(/[\p{L}\p{M}]+(?:-[\p{L}\p{M}]+)*|\d+(?:[.,]\d+)?|[^\s]/gu)).map(m=>({texto:m[0],normalizado:norm(m[0]),inicio:m.index,fim:m.index+m[0].length}));}
 const anatomy=[
  ['interescapular','coluna_toracica','','interescapular',['entre as escápulas','entre escápulas','região interescapular']],
  ['aquiles','tornozelo_pe','','tendao_aquiles',['tendão de Aquiles','tendão calcâneo','Aquiles']],
  ['halux','tornozelo_pe','','halux',['dedão do pé','dedo grande do pé','primeiro dedo do pé','hálux','hallux']],
  ['polegar','punho_mao','','polegar',['dedão da mão','dedo polegar','polegar']],
  ['dedo_minimo_mao','punho_mao','','dedo_minimo_mao',['dedinho da mão','mindinho da mão','dedo mínimo da mão']],
  ['dedo_minimo_pe','tornozelo_pe','','dedo_minimo_pe',['dedinho do pé','mindinho do pé','dedo mínimo do pé']],
  ['panturrilha','','perna','panturrilha',['batata da perna','panturrilha','panturrilhas']],
  ['cervical','cervical','','',['parte de trás do pescoço','parte de tras do pescoco']],
  ['lombar','lombar','','',['região lombar','parte lombar']],
  ['calcanhar','tornozelo_pe','','',['calcanhar do pé']],
  ['palma','punho_mao','','',['palma da mão']],
  ['planta','tornozelo_pe','','',['sola do pé','planta do pé','sola dos pés','sola dos dois pés','solas dos pés','planta dos pés','planta de ambos os pés']]
 ];
 const vocabulary=[
  ['parestesia','formigamento',['formigando','formigação','formigacoes']],
  ['parestesia','dormencia',['adormecida','adormecido','adormecidas','adormecidos']],
  ['edema','',['inchada','inchadas','inchados','inchando']],
  ['dor','',['dolorida','dolorido','doloridas','doloridos']]
 ];
 const uncertain=[
  ['dedão','Você se refere ao dedão da mão ou ao dedão do pé?'],
  ['dedinho','Você se refere a qual dedo e de qual mão ou pé?'],
  ['costas','Em qual parte das costas ocorre o sintoma? Especifique a localização sem presumir uma região da coluna.'],
  ['bacia','Qual é a localização exata descrita como “bacia”?'],
  ['junta','Qual articulação é descrita como “junta”?'],
  ['juntas','Quais articulações são descritas como “juntas”?'],
  ['travando','O que significa “travando” neste relato? Descreva o que acontece, onde e em qual movimento.'],
  ['repuxando','O que significa “repuxando” neste relato? Descreva a sensação e sua localização.'],
  ['pinicando','Como é a sensação descrita como “pinicando” e onde ela ocorre?'],
  ['nervo inflamado','“Nervo inflamado” é uma expressão do paciente ou um diagnóstico documentado? Registre a fonte sem presumir uma condição.'],
  ['escapola','Você quis dizer escápula? Confira o termo na fonte antes de corrigir.'],
  ['tornosselo','Você quis dizer tornozelo? Confira a localização na fonte antes de corrigir.']
 ];
 const compile=phrase=>tokens(phrase).map(t=>t.normalizado);
 function locate(ts,phrase){const pattern=Array.isArray(phrase)?phrase:compile(phrase),out=[];for(let i=0;i<=ts.length-pattern.length;i++)if(pattern.every((t,j)=>ts[i+j].normalizado===t))out.push({inicio:ts[i].inicio,fim:ts[i+pattern.length-1].fim,tokenInicio:i,tokenFim:i+pattern.length});return out;}
 const anatomyRules=anatomy.flatMap(([id,regiaoId,segmentoId,estruturaId,phrases])=>phrases.map(p=>({id,regiaoId,segmentoId,estruturaId,pattern:compile(p)})));
 const symptomRules=vocabulary.flatMap(([conceito,qualidade,phrases])=>phrases.map(p=>({conceito,qualidade,pattern:compile(p)})));
 const pendingRules=uncertain.map(([phrase,pergunta])=>({pattern:compile(phrase),pergunta}));
 function lexical(text){
  const ts=tokens(text),entities=[],symptoms=[],pending=[];
  for(const {id,regiaoId,segmentoId,estruturaId,pattern} of anatomyRules)for(const span of locate(ts,pattern))entities.push({...span,id,regiaoId,segmentoId,estruturaId,trecho:text.slice(span.inicio,span.fim),regra:'expressao_anatomica_explicita'});
  for(const {conceito,qualidade,pattern} of symptomRules)for(const span of locate(ts,pattern))symptoms.push({...span,conceito,qualidade,texto:text.slice(span.inicio,span.fim),regra:'descritor_relatado_nao_diagnostico'});
  for(const {pattern,pergunta} of pendingRules)for(const span of locate(ts,pattern))if(!entities.some(e=>e.inicio<=span.inicio&&e.fim>=span.fim))pending.push({...span,tipo:'vocabulario_ambiguo',pergunta,trecho:text.slice(span.inicio,span.fim),regra:'esclarecer_sem_substituir'});
  const unique=a=>a.filter((e,i)=>!a.slice(0,i).some(p=>p.inicio===e.inicio&&p.fim===e.fim));
  return {versao:VERSION,tokens:ts,entidades:unique(entities),sintomas:unique(symptoms),pendencias:unique(pending)};
 }
 const predicates=['não sabe se','não nega','não sente','não apresenta','não tem','nega','negou','sente','sentiu','apresenta','apresentou','está com','tem','teve','piora','melhora','aumenta','diminui','persiste','continua','irradia'];
 const predicateRules=predicates.map(verbo=>({verbo,pattern:compile(verbo)}));
 const behaviorRules=[...['piora','piorou','piorando','aumenta','aumentou','aumentando','agrava'].map(v=>({pattern:compile(v),relacao:'piora'})),...['melhora','melhorou','melhorando','alivia','aliviou','diminui','reduz'].map(v=>({pattern:compile(v),relacao:'melhora'})),...['persiste','persistência da dor','não passou'].map(v=>({pattern:compile(v),relacao:'persistencia',persistencia:v==='não passou'})),{pattern:compile('pior período de dor'),relacao:'piora'}];
 function behavior(text){const ts=tokens(text),out=[];for(const rule of behaviorRules)for(const span of locate(ts,rule.pattern)){const before=ts.slice(Math.max(0,span.tokenInicio-2),span.tokenInicio).map(t=>t.normalizado);const denied=!rule.persistencia&&before.some(t=>['nao','sem','nega','negou'].includes(t));out.push(rule.relacao+':'+(denied?'negado':'relatado'));}return Array.from(new Set(out)).sort();}
 function motionSite(text,site){
  const before=norm(text.slice(Math.max(0,site.inicio-65),site.inicio)),after=norm(text.slice(site.fim));
  return /\b(?:ao |para |durante |quando )?(?:elevar|levantar|estender|flexionar|girar|rodar|mover|movimentar|apoiar|apertar|flexao d[eo]|extensao d[eo])\s+(?:(?:o|a|os|as)\s+)?$/.test(before)||/\b(?:piora|melhora|agrava|alivia)\b/.test(norm(text))&&(/\bapoio (?:d[oa]|a[oa])\s*$/.test(before)||/\bcom (?:o|a|os|as)\s*$/.test(before)&&/^\s+(?:elevad[oa]s?|levantad[oa]s?)\b/.test(after));
 }
 function localQualifiers(text,site){
  if(!site)return [];
  const terms='lateral|medial|anterior|posterior|superior|inferior|proximal|distal',out=[];
  const before=norm(text.slice(0,site.inicio)),inside=norm(text.slice(site.inicio,site.fim)),after=norm(text.slice(site.fim));
  const prefix=new RegExp('\\b('+terms+')\\s+(?:d[ao]s?|n[ao]s?)\\s*$').exec(before),suffix=new RegExp('^\\s+(?:(?:direit[oa]|esquerd[oa])\\s+)?('+terms+')\\b').exec(after);
  if(/^(?:canelas?|pernas?|joelhos?|tornozelos?)$/.test(norm(site.trecho||''))){if(/\bparte de fora d[ao]\s*$/.test(before))out.push('lateral');if(/\bparte de dentro d[ao]\s*$/.test(before))out.push('medial');}
  if(prefix)out.push(prefix[1]);if(suffix)out.push(suffix[1]);for(const m of inside.matchAll(new RegExp('\\b(?:'+terms+')\\b','g')))out.push(m[0]);
  return Array.from(new Set(out)).sort();
 }
 function clause(text,propositions=[],base=0){
  const lex=lexical(text),verbs=[];for(const {verbo,pattern} of predicateRules)for(const span of locate(lex.tokens,pattern))verbs.push({...span,verbo});
  verbs.sort((a,b)=>a.inicio-b.inicio||b.fim-a.fim);
  const uniqueVerbs=verbs.filter((v,i)=>!verbs.slice(0,i).some(p=>p.inicio<=v.inicio&&p.fim>=v.fim));
  const frames=propositions.map(p=>({proposicaoId:p.id,sujeito:p.sujeito,estado:p.estado,certeza:p.certeza,
   sintoma:{conceito:p.conceito,termo:p.termo||'',qualidade:p.qualidade||''},
   local:{regiaoId:p.regiaoId||'',segmentoId:p.segmentoId||'',estruturaId:p.estruturaId||'',termo:p.local||'',lado:p.lado||'',qualificadores:copy(p.qualificadoresLocal||[]),papel:p.papel},
   tempo:{estado:p.temporalidade,duracao:copy(p.tempo||[]),momentos:copy(p.marcadoresTemporais||[])},
   comportamento:copy(p.comportamento||[]),
   predicado:copy(uniqueVerbs.filter(v=>v.inicio<=((p.origem?.fim??text.length+base)-base)).at(-1)||null),origem:copy(p.origem||{})}));
  return {...lex,modelo:'gramatica_superficial_finita',predicados:uniqueVerbs,quadros:frames};
 }
 function clauseCuts(text,entityReader){
  const ts=tokens(text),cuts=[];
  for(let i=0;i<ts.length-1;i++)if(ts[i].normalizado==='e'&&/^(?:dor|dores|dormencia|formigamento|fraqueza|edema|inchaco|rigidez|cefaleia|queimacao|hipersensibilidade|tontura|vertigem)$/.test(ts[i+1].normalizado)){
   const before=text.slice(0,ts[i].inicio),tail=norm(before.split(/[.!?;\n]/).at(-1));
   let quoted=false;for(const ch of before){if(ch==='"'||ch==='“')quoted=!quoted;else if(ch==='”')quoted=false;}
   if(quoted||/\b(?:nega|negou|nao|sem|ausencia|suspeita|talvez|possivel|se|mae|pai|irma|irmao)\b/.test(tail))continue;
   // Only a new symptom with an explicit location. Bare coordinated words may
   // share qualifiers or negation, so their scope must remain together.
   // Bare coordinated symptoms share the location stated after the pair.
   // Do not turn 'dor e rigidez no joelho' into an unlocated 'dor.' fragment.
   const hasLocation=typeof entityReader==='function'?entityReader(tail).length:lexical(tail).entidades.length;
   if(!hasLocation)continue;
   const after=ts.slice(i+2,i+5).map(t=>t.normalizado).join(' ');
   if(/^(?:no|na|nos|nas|em)\b/.test(after)){cuts.push(ts[i].inicio,ts[i+1].inicio);}
  }
  return cuts;
 }
 function noteStructure(text){
  // Closed list of document labels only. Never strip an arbitrary colon,
  // diagnostic name, dose, clinical finding or unfamiliar heading.
  const label=/^\s*(?:#{1,6}\s*)?(HMA|História da Moléstia Atual|História clínica|Queixa principal|Sintomas associados|Exame físico|Exame clínico)\s*:\s*/iu;
  let offset=0,m;while((m=label.exec(text.slice(offset))))offset+=m[0].length;
  // Only a closed, standalone conversational transition. The exact source is
  // retained in the ledger; clinical text, quotes and arbitrary headings stay.
  const transition=/^\s*(?:outra coisa|outra queixa|mais uma queixa)\s*[.:]\s*/iu.exec(text.slice(offset));
  if(transition)offset+=transition[0].length;
  return {conteudo:text.slice(offset),offset,marcador:text.slice(0,offset),tipo:transition?'transicao_discursiva':'rotulo_documental'};
 }
 const referenceRules=['essa dor','esta dor','a mesma dor','essa dormência','esta dormência','esse formigamento','este formigamento','esse sintoma','este sintoma'].map(compile);
 function resolveReferences(document,callbacks){
  const facts=document.fatos;
  for(let i=0;i<facts.length;i++){
   const f=facts[i],raw=f.origens[0].trecho;if(!/\b(?:essa|esta|esse|este|a mesma)\b/.test(norm(raw)))continue;const ts=tokens(raw);
   const refs=[];for(const pattern of referenceRules)for(const span of locate(ts,pattern))refs.push({...span,termo:raw.slice(span.inicio,span.fim)});
   if(!refs.length)continue;
   const ref=refs[0],refType=/formigamento|dormencia/.test(norm(ref.termo))?'parestesia':/dor/.test(norm(ref.termo))?'dor':'';
   const unresolved=()=>{if(!document.pendencias.some(q=>q.fatoId===f.id&&q.tipo==='referencia_nao_resolvida'))document.pendencias.push({fatoId:f.id,tipo:'referencia_nao_resolvida',mensagem:'Referência sem um único antecedente seguro; nenhuma localização foi presumida.',pergunta:'A qual queixa se refere “'+ref.termo+'”? Registre a localização na própria frase.'});};
   const refQuality=/formigamento/.test(norm(ref.termo))?'formigamento':/dormencia/.test(norm(ref.termo))?'dormencia':'';
   const prefix=norm(raw.slice(0,ref.inicio)),suffix=norm(raw.slice(ref.fim));
   const safePredicate=/^\s+(?:piora|melhora|aumenta|diminui|persiste|continua)\b/.test(suffix);
   const allowedPrefix=/^\s*(?:(?:(?:o|a) )?paciente )?(?:(?:refere|relata|informa)(?: que)?)?\s*$/.test(prefix);
   const protectedScope=!allowedPrefix||/\b(?:nega|negou|nao|sem|talvez|possivel|suspeita|mae|pai|irma|irmao)\b/.test(prefix)||/["“”]/.test(raw);
   const explicitSites=callbacks.entidades(raw).filter(e=>!motionSite(raw,e));
   const candidates=new Map();let blocked=refs.length!==1||!safePredicate||protectedScope||explicitSites.length>0||!!f.linguagem?.pendencias.length;
   for(const previous of facts.slice(0,i)){
    for(const p of previous.proposicoes||[]){
     if(p.referenciaOrigem)continue; // A resolved reference is not another independent episode.
     if(p.tipo!=='sintoma'||refType&&p.conceito!==refType||refQuality&&p.qualidade!==refQuality)continue;
     if(['destino_trajeto','movimento_modificador','procedimento_modificador'].includes(p.papel)){if(p.papel==='destino_trajeto')blocked=true;continue;}
     if(p.sujeito!=='paciente'||p.estado!=='relatado'||p.certeza!=='relatada'||p.temporalidade==='anterior'||!p.regiaoId&&!p.segmentoId||p.lado==='bilateral'||previous.linguagem?.pendencias.length){blocked=true;continue;}
     const key=JSON.stringify([p.conceito,p.qualidade,p.regiaoId,p.segmentoId,p.estruturaId,p.qualificadoresLocal,p.lado,p.temporalidade,p.tempo,p.marcadoresTemporais,p.quantificadores]);
     candidates.set(key,{fato:previous,p});
    }
   }
   if(blocked||candidates.size!==1){
    unresolved();continue;
   }
   const {fato:antecedent,p}=candidates.values().next().value;
   const anchor=p.estruturaId==='halux'?'hálux':p.estruturaId==='polegar'?'polegar':p.local;
   if(['dedo_minimo_mao','dedo_minimo_pe'].includes(p.estruturaId)){unresolved();continue;}
   const feminine=/^(?:mao|perna|panturrilha|canela|coluna|nuca|escapula|virilha|mandibula|palma|planta|sola|batata|parte|regiao)/.test(norm(anchor));
   const side=p.lado?(feminine?(p.lado==='direito'?' direita':' esquerda'):' '+p.lado):'';
   const head=/sintoma/.test(norm(ref.termo))?(p.conceito==='dor'?'dor':p.qualidade==='dormencia'?'dormência':p.qualidade==='formigamento'?'formigamento':'sintoma'):ref.termo.replace(/^(?:essa|esta|esse|este|a mesma)\s+/i,'');
   const qualifiers=(p.qualificadoresLocal||[]).filter(q=>!norm(anchor).split(/\s+/).includes(q));
   const location=qualifiers.length?' na região '+qualifiers.join(' e ')+(feminine?' da ':' do ')+anchor:(feminine?' na ':' no ')+anchor;
   const expanded=raw.slice(0,ref.inicio)+(/^(?:dor|dormência)$/.test(head)?'a ':'o ')+head+location+side+raw.slice(ref.fim);
   const parsed=callbacks.proposicoes(expanded,0,f.id);
   if(!parsed.some(x=>x.regiaoId===p.regiaoId&&x.segmentoId===p.segmentoId&&x.lado===p.lado&&x.conceito===p.conceito)){unresolved();continue;}
   const link={tipo:'referencia_contextual_resolvida',de:f.id,para:antecedent.id,regra:'antecedente_unico_explicito',referencia:{inicio:f.origens[0].inicio+ref.inicio,fim:f.origens[0].inicio+ref.fim,trecho:ref.termo},antecedente:copy(antecedent.origens[0])};
   f.referencias=[link];document.relacoes.push(link);f.textoInterpretado=expanded;
   f.proposicoes=parsed.map(p=>({...p,origemInterpretada:p.origem,origem:copy(link.referencia),referenciaOrigem:{fatoId:antecedent.id,origem:copy(link.antecedente)}}));
   f.redacao=callbacks.realizar?callbacks.realizar(expanded):expanded[0].toUpperCase()+expanded.slice(1);
   f.realizacoes=[f.redacao];f.atributos.regioes=Array.from(new Set(parsed.map(p=>p.regiaoId).filter(Boolean)));
   f.linguagem=clause(raw,f.proposicoes,f.origens[0].inicio);f.linguagem.referencia=copy(link);
   document.pendencias=document.pendencias.filter(q=>q.fatoId!==f.id||!['referencia_nao_resolvida','local_nao_especificado'].includes(q.tipo));
  }
  // Referência nominal definida: "a dor cervical" retoma a mesma queixa,
  // apenas quando há um único lado documentado para aquele território.
  // Não acrescenta duração, intensidade, causalidade ou palavras à HMA.
  for(let i=0;i<facts.length;i++){
   const f=facts[i],raw=f.origens[0].trecho,t=norm(raw);
   if(!/^(?:a dor|o formigamento|a dormencia|a queimacao|a hipersensibilidade)\b/.test(t)||!(/\b(?:piora|melhora|aumenta|diminui|persiste|continua|comecou|iniciou)\b/.test(t))||/["“”]|\b(?:nova|novo|outra|outro|ontem|hoje|nega|nao|sem|mae|pai)\b/.test(t))continue;
   for(const p of f.proposicoes||[]){
    if(p.tipo!=='sintoma'||p.lado||p.sujeito!=='paciente'||p.estado!=='relatado'||!p.regiaoId||!['local','origem_trajeto'].includes(p.papel))continue;
    const candidates=new Map();
    for(const anterior of facts.slice(0,i))for(const q of anterior.proposicoes||[]){
     if(q.referenciaOrigem||q.tipo!=='sintoma'||q.conceito!==p.conceito||q.regiaoId!==p.regiaoId||q.sujeito!=='paciente'||q.estado!=='relatado'||q.certeza!=='relatada'||q.temporalidade==='anterior'||!q.lado||!['local','origem_trajeto'].includes(q.papel)||(q.estruturaId||'')!==(p.estruturaId||'')||JSON.stringify(q.qualificadoresLocal||[])!==JSON.stringify(p.qualificadoresLocal||[]))continue;
     if(p.tempo?.length&&JSON.stringify(q.tempo)!==JSON.stringify(p.tempo))continue;
     const key=JSON.stringify([q.lado,q.temporalidade,q.tempo,q.marcadoresTemporais]);if(!candidates.has(key))candidates.set(key,{anterior,q});
    }
    if(candidates.size!==1)continue;
    const {anterior,q}=candidates.values().next().value,link={tipo:'referencia_nominal_resolvida',de:f.id,para:anterior.id,regra:'territorio_explicito_e_lado_unico',referencia:copy(f.origens[0]),antecedente:copy(anterior.origens[0])};
    p.lado=q.lado;p.referenciaOrigem={fatoId:anterior.id,origem:copy(anterior.origens[0])};
    f.referencias=[...(f.referencias||[]),link];document.relacoes.push(link);f.textoInterpretado=raw;
   }
  }
 }
 root.KineSysClinicalLanguage=Object.freeze({version:VERSION,tokenizar:tokens,extrair:lexical,analisarOracao:clause,cortesOracoes:clauseCuts,separarEstrutura:noteStructure,comportamento:behavior,qualificadoresLocal:localQualifiers,alvoDeMovimento:motionSite,resolverReferencias:resolveReferences});
})(typeof window==='undefined'?globalThis:window);
