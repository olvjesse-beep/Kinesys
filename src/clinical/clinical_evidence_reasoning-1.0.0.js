/* Raciocínio documental compartilhado HMA → Radar → plano → relatório.
 * Camada determinística de prioridade de investigação, não probabilidade clínica.
 * Ausente, negado, incompatível e desconhecido são estados diferentes. */
(function(root){
 'use strict';
 const version='1.0.0',n=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase(),uniq=a=>[...new Set(a.filter(Boolean))];
 const CONCEITOS={
  plantar_calcanhar:['dor plantar/medial no calcâneo','(?:plantar|planta|sola|medial).{0,35}(?:calcanhar|calcaneo)|(?:calcanhar|calcaneo).{0,35}(?:plantar|medial|planta)'],
  calcanhar:['dor no calcanhar','calcanhar|calcaneo'],
  lateral_tornozelo:['localização lateral no tornozelo','(?:lateral|lado de fora).{0,35}(?:tornozelo|maleolo)|(?:tornozelo|maleolo).{0,25}(?:lateral|lado de fora)'],
  retromaleolar_lateral:['localização atrás do maléolo lateral','(?:atras|posterior|retro).{0,25}maleolo lateral|retromaleolar lateral'],
  acima_tornozelo:['localização acima da articulação do tornozelo','(?:acima|proximal).{0,30}(?:tornozelo|articulacao)|sindesmose'],
  profunda_tornozelo:['dor profunda no tornozelo','(?:profunda|dentro).{0,25}tornozelo|tornozelo.{0,25}(?:profunda|dentro)|domo talar'],
  posterior_tornozelo:['localização posterior/Aquiles','aquiles|(?:posterior|atras).{0,25}tornozelo'],
  sinus_tarsi:['localização no seio do tarso','seio do tarso|sinus tarsi'],
  tornozelo:['tornozelo informado','tornozelo'],
  primeiros_passos:['dor nos primeiros passos','primeiros? passos?|inicio da caminhada|ao comecar a andar'],
  carga:['relação com carga','(?:dor|piora).{0,25}(?:carga|correr|corrida|salto|apoio)|doi correndo'],
  entorse:['entorse relatada','entorse|torceu|torcido|virou o pe|torceu o pe'],
  inversao:['inversão relatada','inversao|virou.{0,20}para dentro'],
  rotacao_externa:['piora com rotação externa','rotacao externa|girar.{0,20}para fora'],
  eversao:['piora com eversão','eversao|mover.{0,20}pe para fora'],
  estalo_lateral:['estalo retromaleolar lateral','estalo.{0,40}maleolo lateral|estala.{0,40}maleolo lateral|maleolo lateral.{0,40}estal'],
  travamento:['travamento/bloqueio relatado','travamento|bloqueio|trava|bloqueia'],
  dor_persistente:['persistência relatada','dor persistente|dor profunda persistente|dor nao melhora|nao melhorou|dor ha.{0,12}(?:mes|ano)'],
  falseio:['falseio relatado','falseia|falseio|giving way'],
  recorrencia:['entorses recorrentes relatadas','entorses recorrentes|torce repetidamente|vira sempre|entorse recorrente'],
  terreno_irregular:['piora em terreno irregular','terreno irregular|piso irregular'],
  ossea:['dor óssea focal relatada','dor ossea|dor no osso|dor na ponta do maleolo'],
  apoio_impossivel:['incapacidade de apoio relatada','nao consegue apoiar|nao consegue dar quatro passos|incapaz de apoiar']
 };
 const hash=s=>{let h=2166136261;for(const c of String(s)){h^=c.charCodeAt(0);h=Math.imul(h,16777619);}return (h>>>0).toString(16);};
 function extrair(texto){
  const graph=root.KineSysSemanticGraph?.analisar(texto),fs=graph?.fatos||[],evidencias=[];
  fs.forEach(f=>{
   const raw=f.origens[0].trecho,t=n(raw),familiar=/\b(?:minha mae|meu pai|minha irma|meu irmao|minha esposa|meu marido|minha filha|meu filho|minha avo|meu avo|historico familiar)\b/.test(t);
   Object.entries(CONCEITOS).forEach(([conceito,[rotulo,rx]])=>{
    for(const m of t.matchAll(new RegExp(rx,'g'))){
     const antes=t.slice(0,m.index),trigger=[...antes.matchAll(/\b(?:nao nega|sem piora|nega que|nao sabe se|nega|negou|sem|nunca|nenhuma|nao apresenta|nao sente|nao houve|nao teve|nao sofreu|nao ha|nao tem|nao consegue|refere|relata|apresenta|sente)\b/g)].at(-1)?.[0]||'';
     const pseudo=/^(?:nao nega|sem piora|nega que|nao sabe se)$/.test(trigger);
     const negativa=!pseudo&&/^(?:nega|negou|sem|nunca|nenhuma|nao apresenta|nao sente|nao houve|nao teve|nao sofreu|nao ha|nao tem)$/.test(trigger);
     const estado=pseudo?'indeterminado':negativa?'negado':'relatado';
     const remoto=conceito==='entorse'&&/\b(?:antig[ao]|previa|infancia|ha\s+\d+\s+anos?|anos? atras)\b/.test(t);
     const recente=conceito==='entorse'&&/\b(?:ontem|hoje|recente)\b/.test(t);
     const tempoInformado=conceito==='entorse'?(raw.match(/\b(?:há|ha)\s+\d+\s+(?:dias?|semanas?|mes(?:es)?|anos?)\b|\b(?:ontem|hoje|recente)\b|\b\d{1,2}\/\d{1,2}\/\d{2,4}\b|\bem\s+\d{4}\b/i)?.[0]||''):'';
     const relacaoComSintomas=conceito==='entorse'&&/\b(?:dor.{0,45}(?:comecou|iniciou|surgiu).{0,30}(?:apos|depois|antes)|desde (?:a entorse|que torceu)|apos a entorse|depois da entorse)\b/.test(t)?'relatada':'nao_esclarecida';
     const sites=root.KineSysSemanticGraph.entidades(raw),site=sites.filter(s=>s.inicio<=m.index).at(-1)||sites[0];
     const ps=f.proposicoes.filter(p=>p.regiaoId===site?.regiaoId),lados=uniq(ps.map(p=>p.lado));
     evidencias.push({id:`${f.id}:${conceito}:${m.index}`,conceito,rotulo,estado,sujeito:familiar?'outra_pessoa':'paciente',temporalidade:remoto?'anterior':recente?'recente':tempoInformado?'tempo_informado':'nao_especificada',tempoInformado,relacaoComSintomas,
      fatoId:f.id,regiaoIds:site?.regiaoId?[site.regiaoId]:[],lados,origem:{campo:'paciente_hma',inicio:f.origens[0].inicio+m.index,fim:f.origens[0].inicio+m.index+m[0].length,trecho:raw.slice(m.index,m.index+m[0].length),clausula:raw}});
    }
   });
  });
  const entorses=evidencias.filter(e=>e.conceito==='entorse'&&e.sujeito==='paciente'&&e.estado==='relatado');
  const relacao=entorses.some(e=>e.relacaoComSintomas==='relatada')?'relatada':'nao_esclarecida';
  return {graph,evidencias,cronologia:{eventos:entorses,relacaoComSintomas:relacao,perguntarData:entorses.some(e=>!e.tempoInformado),perguntarRelacao:entorses.some(e=>e.relacaoComSintomas==='nao_esclarecida')}};
 }
 function analisar(texto){
  const catalogo=root.KineSysEvidenceProfiles,extra=extrair(String(texto||''));if(!catalogo||!extra.graph)return null;
  const todas=extra.evidencias.filter(e=>e.sujeito==='paciente'&&(!e.regiaoIds.length||e.regiaoIds.includes('tornozelo_pe'))),atuais=todas.filter(e=>e.estado==='relatado'&&e.temporalidade!=='anterior'),has=id=>atuais.some(e=>e.conceito===id),possui=id=>todas.some(e=>e.conceito===id&&e.estado==='relatado');
  const eventosPe=todas.filter(e=>e.conceito==='entorse'&&e.estado==='relatado');
  const cronologiaPe={eventos:eventosPe,relacaoComSintomas:eventosPe.some(e=>e.relacaoComSintomas==='relatada')?'relatada':'nao_esclarecida',perguntarData:eventosPe.some(e=>!e.tempoInformado),perguntarRelacao:eventosPe.some(e=>e.relacaoComSintomas==='nao_esclarecida')};
  const anatomicas=['plantar_calcanhar','calcanhar','lateral_tornozelo','retromaleolar_lateral','acima_tornozelo','profunda_tornozelo','posterior_tornozelo','sinus_tarsi'];
  const pe=extra.graph.problemas.some(p=>p.regiaoId==='tornozelo_pe')||has('tornozelo')||anatomicas.some(has);
  const hipoteses=catalogo.perfis.filter(p=>{
   if(!pe)return false;
   if(p.id==='entorse_lateral_tornozelo')return possui('entorse')&&has('lateral_tornozelo');
   if(p.id==='instabilidade_cronica_tornozelo')return has('tornozelo')&&(has('falseio')||has('recorrencia'));
   return p.pistas.some(has)&&(p.anatomia.some(has)||p.id==='dor_plantar_calcanhar'&&has('primeiros_passos'));
  }).map(p=>{
   const local=atuais.filter(e=>p.anatomia.includes(e.conceito)),favor=atuais.filter(e=>p.anatomia.includes(e.conceito)||p.pistas.includes(e.conceito));
   const mesmoLado=(a,b)=>!a.lados.length||!b.lados.length||a.lados.some(l=>b.lados.includes(l)||l==='bilateral'||b.lados.includes('bilateral'));
   const negadas=todas.filter(e=>e.estado==='negado'&&(p.anatomia.includes(e.conceito)||p.pistas.includes(e.conceito)||p.id==='dor_plantar_calcanhar'&&e.conceito==='calcanhar')&&(!local.length||local.some(l=>mesmoLado(l,e))));
   const pistas=atuais.filter(e=>p.pistas.includes(e.conceito)),ladosMisturados=local.length&&pistas.length&&!local.some(l=>pistas.some(e=>mesmoLado(l,e)));
   const outraLocalizacao=p.id==='dor_plantar_calcanhar'&&!local.length?atuais.filter(e=>anatomicas.includes(e.conceito)&&e.conceito!=='calcanhar'&&!p.anatomia.includes(e.conceito)):[];
   const remoto=p.id==='entorse_lateral_tornozelo'&&cronologiaPe.eventos.length&&cronologiaPe.eventos.every(e=>e.temporalidade==='anterior');
   let estado=!local.length?'localizacao_pendente':negadas.length?'dados_divergentes':'compativel_com_relato';if(outraLocalizacao.length||remoto)estado='menos_compativel';
   if(estado==='compativel_com_relato'&&p.id==='entorse_lateral_tornozelo'&&(cronologiaPe.perguntarData||cronologiaPe.perguntarRelacao))estado='cronologia_pendente';
   if(ladosMisturados)estado='lateralidade_pendente';
   const faltantes=[];if(!local.length)faltantes.push('Localização específica compatível ainda não informada.');
   if(ladosMisturados)faltantes.push('Localização e comportamento foram descritos em lados diferentes; não combinar esses achados.');
   if(p.id==='entorse_lateral_tornozelo'&&cronologiaPe.perguntarData)faltantes.push('Data da entorse não informada; não é possível classificá-la como lesão aguda atual.');
   if(p.id==='entorse_lateral_tornozelo'&&cronologiaPe.perguntarRelacao)faltantes.push('Relação temporal entre entorse e dor atual não esclarecida.');
   if(remoto)faltantes.push('Entorse descrita como antecedente remoto; esclarecer relevância para os sintomas atuais.');
   const contra=negadas.map(e=>({tipo:'negativa_explicita',texto:'Foi negado: '+e.rotulo,evidenciaIds:[e.id]}));
   if(outraLocalizacao.length)contra.push({tipo:'localizacao_divergente',texto:'O local relatado não é o padrão plantar do calcanhar; primeiros passos isolados não sustentam essa localização.',evidenciaIds:outraLocalizacao.map(e=>e.id)});
   return {id:p.id,nome:p.nome,regiaoId:p.regiaoId,estado,prioridade:estado==='compativel_com_relato'?0:estado==='dados_divergentes'?1:estado==='menos_compativel'?3:2,
    aFavor:favor.map(e=>({texto:e.rotulo,evidenciaIds:[e.id],origem:e.origem})),contra,faltantes,fontes:p.fontes,limite:p.limite};
  }).sort((a,b)=>a.prioridade-b.prioridade);
  const qs=[],add=id=>{const q=catalogo.perguntas[id];if(q&&!qs.some(x=>x.id===id))qs.push({...q});};
  if(pe&&(possui('entorse')||has('ossea')||has('apoio_impossivel')))add('seguranca');
  if(extra.cronologia.perguntarData||extra.cronologia.perguntarRelacao)add('evento');
  if(pe&&!anatomicas.some(has))add('local');
  if(has('primeiros_passos')&&!has('plantar_calcanhar'))add('plantar');
  if(has('lateral_tornozelo')||has('retromaleolar_lateral')){if(!has('estalo_lateral'))add('fibulares');if(!has('falseio'))add('falseio');}
  if(has('acima_tornozelo')&&!has('rotacao_externa'))add('sindesmose');
  if(has('entorse')&&!has('inversao'))add('entorse');
  if(has('dor_persistente')&&!has('travamento'))add('mecanica');
  if(hipoteses.some(h=>h.estado==='lateralidade_pendente'))qs.unshift({id:'lados',texto:'Separar a localização, o início e o comportamento dos sintomas de cada lado antes de associar os achados.',distingue:hipoteses.filter(h=>h.estado==='lateralidade_pendente').map(h=>h.id)});
  // Localização fina e cronologia são perguntas gerais para qualquer região.
  extra.graph.problemas.filter(p=>p.regiaoId!=='tornozelo_pe').forEach(p=>{
   const props=extra.graph.proposicoes.filter(x=>p.proposicaoIds.includes(x.id)),textos=props.map(x=>n(x.contextoLocal||x.origem.trecho)).join(' ');
   if(!/medial|lateral|anterior|posterior|plantar|dorsal|radial|ulnar|interlinha|peripatelar/.test(textos))qs.push({id:'local:'+p.id,regiaoId:p.regiaoId,texto:`Na região ${p.regiaoId.replace(/_/g,' ')}, onde exatamente ocorre o sintoma e qual tarefa o reproduz?`,distingue:[]});
   if(!props.some(x=>x.tempo.length))qs.push({id:'tempo:'+p.id,regiaoId:p.regiaoId,texto:`Quando começou a queixa em ${p.regiaoId.replace(/_/g,' ')} e como evoluiu?`,distingue:[]});
  });
  return {versao:version,fonteId:'hma:'+hash(texto),origemHMA:String(texto||''),evidencias:extra.evidencias,problemas:extra.graph.problemas,cronologia:extra.cronologia,hipoteses,perguntas:qs,
   limite:'Prioridade de investigação, não probabilidade diagnóstica. HMA isolada não confirma diagnóstico.'};
 }
 function refinarLeitura(resultado,texto){
  const r=analisar(texto);if(!r)return resultado;const cat=root.KineSysEvidenceProfiles;
  const perfilDe=h=>cat.perfis.find(p=>p.id===h?.id)||cat.perfis.flatMap(p=>p.aliases.filter(a=>n(h?.nome).includes(n(a))).map(a=>({p,tamanho:a.length}))).sort((a,b)=>b.tamanho-a.tamanho)[0]?.p;
  const aplicar=h=>{const p=perfilDe(h),av=r.hipoteses.find(x=>x.id===p?.id);if(!av)return h;
   return {...h,evidenciasCompartilhadas:av,estadoInvestigacao:av.estado,aFavor:av.aFavor.map(e=>e.texto),contra:av.contra.map(e=>e.texto),aConfirmar:av.faltantes};};
  const originais=[resultado.suspeitaPrincipal,...resultado.diferenciais||[]].filter(Boolean).map(aplicar),vistas=new Set(originais.map(h=>perfilDe(h)?.id));
  const adicionais=r.hipoteses.filter(h=>!vistas.has(h.id)).map(h=>aplicar({id:h.id,nome:h.nome,papel:'diferencial'}));
  const candidatas=[...originais,...adicionais].sort((a,b)=>(a.evidenciasCompartilhadas?.prioridade||0)-(b.evidenciasCompartilhadas?.prioridade||0));
  // Uma localização incompatível não pode ganhar destaque por palavra-chave.
  const aptas=candidatas.filter(h=>!h.evidenciasCompartilhadas||h.estadoInvestigacao==='compativel_com_relato');
  const principal=aptas[0]||null;
  const mecanismoPendente=r.cronologia.eventos.some(e=>e.temporalidade!=='recente');
  const achados=(resultado.achados||[]).map(a=>a.titulo==='Mecanismo relevante'&&mecanismoPendente?{...a,titulo:'Evento relatado — cronologia a esclarecer'}:a);
  return {...resultado,achados,suspeitaPrincipal:principal,diferenciais:candidatas.filter(h=>h!==principal),raciocinio:r,perguntasEntrevista:r.perguntas,
   lacunas:uniq([...r.perguntas.map(q=>q.texto),...resultado.lacunas||[]]).slice(0,12)};
 }
 function enriquecerPlano(plano,texto){
  const anterior=plano.hmaResultado?.raciocinio,r=anterior?.origemHMA===String(texto||'')?anterior:analisar(texto);if(!r)return plano;
  root.KineSysEvidenceProfiles.instalarBanco(typeof BANCO_MAPEAMENTO_CLINICO==='undefined'?null:BANCO_MAPEAMENTO_CLINICO);
  const avPor=h=>r.hipoteses.find(p=>p.id===h.id);
  const proposicoes=root.KineSysSemanticGraph?.analisar(texto)?.proposicoes||[];
  plano.raciocinio=r;plano.perguntasEntrevista=r.perguntas;
  plano.hipoteses=plano.hipoteses.map(h=>{const av=avPor(h),props=proposicoes.filter(p=>p.regiaoId===h.regiaoId&&p.estado==='relatado'&&p.sujeito==='paciente');
   const evidencias=av||{id:h.id,regiaoId:h.regiaoId,estado:props.length?'a_investigar':'historia_insuficiente',aFavor:props.map(p=>({texto:p.origem.trecho,evidenciaIds:[p.id],origem:p.origem})),contra:[],faltantes:['Correlacionar a hipótese com localização, história e exame específicos.'],fontes:[],limite:r.limite};
   return {...h,...(av?{aFavor:av.aFavor.map(e=>e.texto),contra:av.contra.map(e=>e.texto),aConfirmar:uniq([...av.faltantes,...h.aConfirmar||[]])}:{}),evidenciasCompartilhadas:evidencias,fonteRaciocinio:r.fonteId};
  }).sort((a,b)=>(avPor(a)?.prioridade||0)-(avPor(b)?.prioridade||0)||b.prioridadeOrdenacao-a.prioridadeOrdenacao);
  return plano;
 }
 root.KineSysEvidenceReasoning=Object.freeze({version,analisar,extrair,refinarLeitura,enriquecerPlano});
})(typeof window==='undefined'?globalThis:window);
