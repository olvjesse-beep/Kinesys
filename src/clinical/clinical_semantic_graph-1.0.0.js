/* KineSys — interpretação documental local, sem inferência diagnóstica.
 * Inspiração metodológica: ConText (Harkema et al., 2009), escopo de negação,
 * temporalidade e sujeito. Implementação própria em português, não uma versão
 * validada do ConText. Limites/ambiguidade são dados, não lacunas para adivinhar.
 * Modelo de múltiplos problemas/achados: HL7 FHIR ClinicalImpression/Condition.
 */
(function(root){
 'use strict';
 const VERSION='1.3.0',norm=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
 const uniq=a=>Array.from(new Set(a.filter(Boolean))),copy=o=>JSON.parse(JSON.stringify(o));
 const natural=a=>a.length<2?(a[0]||''):a.slice(0,-1).join(', ')+' e '+a.at(-1);
 const sentence=t=>{t=String(t||'').trim().replace(/[.;,\s]+$/,'');return t?t[0].toUpperCase()+t.slice(1)+'.':'';};
 const REGIOES=Object.freeze({
  cervical:/\b(?:coluna cervical|cervical|cervicalgia|pescoco|nuca)\b/g,
  ombro:/\b(?:ombros?|escapulas?|escapular|romboides|manguito|glenoumeral|trapezio|serr[aá]til)\b/g,
  cotovelo:/\b(?:cotovelos?|epicondilos?|epicondilo lateral|epicondilo medial)\b/g,
  punho_mao:/\b(?:punhos?|maos?|carpo|palma da mao|dedos? da mao|qui rodactilo|quirodactilos?)\b/g,
  coluna_toracica:/\b(?:coluna toracica|toracica|torax|interescapular|costelas?)\b/g,
  lombar:/\b(?:lombar|lombossacra|lombalgia|sacroiliaca)\b/g,
  quadril:/\b(?:quadris|quadril|virilha|pelve|glute[oa]s?|nadegas?|coxartrose)\b/g,
  joelho:/\b(?:joelhos?|patela|gonartrose)\b/g,
  tornozelo_pe:/\b(?:tornozelos?|pes?|halux|pododactilos?|calcaneo|calcanhar|plantar|antepe|mediope)\b/g,
  cefaleia:/\b(?:cefaleia|dor de cabeca|enxaqueca|migranea)\b/g,
  atm:/\b(?:mandibula|temporomandibular|atm|orofacial)\b/g
 });
 const CONCEITOS=Object.freeze({
  dor:/\b(?:dor|dores|doi|doem|doendo|dolorimento|fisgada|pontada|desconforto)\b/g,
  parestesia:/\b(?:dormencia|dormentes?|parestesia|formigamento|formiga|choques?|adormecimento)\b/g,
  fraqueza:/\b(?:fraqueza|perda de forca|reducao da forca|deficit de forca)\b/g,
  cefaleia:/\bcefaleia\b/g,edema:/\b(?:edema|inchaco|inchado)\b/g,
  rigidez:/\brigidez\b/g,instabilidade:/\b(?:instabilidade|falseio)\b/g,
  limitacao:/\b(?:limitacao|incapacidade|dificuldade)\b/g,febre:/\bfebre\b/g,
  alteracao_escapular:/\b(?:ombro caido|escapula alada)\b/g
 });
 function matches(text,rx){return Array.from(text.matchAll(new RegExp(rx.source,rx.flags.includes('g')?rx.flags:rx.flags+'g'))).map(m=>({inicio:m.index,fim:m.index+m[0].length,texto:m[0]}));}
 function entidades(text){
  const t=norm(text),out=[...(root.KineSysClinicalLanguage?.extrair(text).entidades||[])];
  Object.entries(REGIOES).forEach(([regiaoId,rx])=>matches(t,rx).forEach(e=>out.push({...e,regiaoId,trecho:text.slice(e.inicio,e.fim)})));
  matches(t,/\b(?:dedo minimo|dedo indicador|dedo medio|dedo anelar|mindinho|bracos?|antebracos?|canelas?|pernas?|membro superior|membro inferior)\b/g).forEach(e=>out.push({...e,regiaoId:'',segmentoId:/^(?:canelas?|pernas?)$/.test(e.texto)?'perna':'',trecho:text.slice(e.inicio,e.fim)}));
  return out.sort((a,b)=>a.inicio-b.inicio||b.fim-a.fim).filter((e,i,a)=>!a.slice(0,i).some(o=>o.inicio<=e.inicio&&o.fim>=e.fim));
 }
 function lados(text){return uniq((norm(text).match(/\b(?:direit[oa]s?|esquerd[oa]s?|bilateral(?:mente)?|ambos|ambas)\b/g)||[]).map(x=>/^direit/.test(x)?'direito':/^esquerd/.test(x)?'esquerdo':'bilateral'));}
 function tempo(text){
  const t=norm(text),expressoes=matches(t,/\b(?:ha|desde|por|durante)\s+(?:(?:cerca de|mais de|menos de)\s+)?(?:\d+(?:[.,]\d+)?|um|uma|dois|duas|tres|quatro|cinco)\s+(?:dias?|semanas?|mes(?:es)?|anos?|horas?|minutos?)\b/g).map(x=>text.slice(x.inicio,x.fim));
  const estado=/\b(?:atualmente|hoje|agora|persiste|continua)\b/.test(t)?'atual':/\b(?:no passado|antigamente|previamente|historico|historia de|antecedente|ja teve|tinha|era)\b/.test(t)?'anterior':'nao_especificada';
  return {estado,expressoes,marcadores:uniq((t.match(/\b(?:ontem|hoje|atualmente|ao dormir|ao deitar|a noite|anoite|noturn[oa]s?|ao acordar|de manha|pela manha|a tarde|no passado)\b/g)||[]).map(m=>/^(?:a noite|anoite|noturn)/.test(m)?'noturno':m==='pela manha'?'de manha':m))};
 }
 function escopo(text,inicio,fim){
  const t=norm(text),antes=t.slice(0,inicio),depois=t.slice(fim);
  const triggers=matches(antes,/\b(?:nao nega|nao sabe se|nega que|nao pode excluir|nao descarta|(?:sem|nega) (?:piora|melhora|aumento|reducao|mudanca)|nega|negou|sem|ausencia de|nao apresenta|nao refere|nao relata|nao sente|nao tem|nao houve|nao evidenciou|nao foi identificado|nao foi identificada|refere|relata|apresenta|sente|evidenciou|identificou)\b/g);
  const trigger=triggers.at(-1)?.texto||'',declaracao=matches(antes,/\b(?:possivel|possibilidade de|suspeita de|hipotese de|talvez|a investigar|se apresentar|se houver)\b/g).at(-1);
  let estado=/^(?:nao nega|nao sabe se|nega que|nao pode excluir|nao descarta|(?:sem|nega) (?:piora|melhora|aumento|reducao|mudanca))$/.test(trigger)?'indeterminado':/^(?:nega|negou|sem|ausencia|nao)/.test(trigger)?'negado':'relatado';
  // Negativa pós-conceito só quando explicitamente predicada; não cruza outro sintoma.
  if(/^\s*(?:(?:foi|esta|e)\s+)?(?:ausente|negad[oa])\b/.test(depois))estado='negado';
  const sujeitos=matches(antes,/\b(?:o paciente|a paciente|paciente|em si|comigo|minha mae|meu pai|minha irma|meu irmao|irma|irmao|mae|pai|historico familiar|antecedente familiar)\b/g);
  const ultimoSujeito=sujeitos.at(-1)?.texto||'';
  const sujeito=ultimoSujeito&&!/^(?:o paciente|a paciente|paciente|em si|comigo)$/.test(ultimoSujeito)||!ultimoSujeito&&/^\s+(?:na|no|em|da|do)\s+(?:minha |meu |sua |seu )?(?:mae|pai|irma|irmao)\b/.test(depois)?'outra_pessoa':'paciente';
  return {estado,sujeito,certeza:declaracao?'hipotetica':estado==='indeterminado'?'indeterminada':'relatada',modificadorNegado:/^(?:sem|nega) (?:piora|melhora|aumento|reducao|mudanca)$/.test(trigger)?trigger.replace(/^(?:sem|nega) /,''):''};
 }
 function recortes(texto){
  const raw=String(texto||''),cuts=new Set([0,raw.length]);
  // Decimal, dose e abreviação não são limites de frases.
  for(const cut of root.KineSysClinicalLanguage?.cortesOracoes(raw)||[])cuts.add(cut);
  for(const m of raw.matchAll(/[;\n!?]+|\.(?=\s|$)/g)){
   const antes=raw.slice(Math.max(0,m.index-12),m.index+1);
   if(/\b(?:dr|dra|sr|sra|prof|aprox|min|max)\.$/i.test(antes)&&m[0]==='.')continue;
   cuts.add(m.index+m[0].length);
  }
  for(const m of raw.matchAll(/\b(?:mas|porém|porem|entretanto|enquanto|além disso|alem disso)\b|(?<![\p{L}\p{N}_])e\s+(?=(?:nega|negou|refere|relata|informa|apresenta|hoje|atualmente)\b)/giu))cuts.add(m.index);
  // Clinical notes often omit the period before a new, capitalized report
  // clause. Split only an explicit sentence opener, outside quoted speech and
  // outside a dependent denial. Offsets still refer to the untouched source.
  for(const m of raw.matchAll(/\s+(?=(?:Refere|Relata|Informa|Paciente\s+(?:refere|relata|informa)|[OA]\s+paciente\s+(?:refere|relata|informa))\b)/gu)){
   const before=raw.slice(0,m.index),tail=before.split(/[.!?;\n]/).at(-1);
   let quoted=false;for(const ch of before){if(ch==='"'||ch==='“')quoted=!quoted;else if(ch==='”')quoted=false;}
   if(quoted||/\b(?:nega|negou|não sabe|não nega)\b[^.!?;]*\bque\b[^.!?;]*$/iu.test(tail)||/\b(?:que|se|quando|como|médico|familiar|mãe|pai|irmã|irmão)\s*$/iu.test(tail))continue;
   cuts.add(m.index+m[0].length);
  }
  // An explicitly stated new subject starts its own scope, even without a
  // period. Never split dependent denial or quoted speech by this rule.
  for(const m of raw.matchAll(/(?:,\s*|\s+e\s+)(?=(?:(?:o|a|sua|seu)\s+)?(?:paciente|mãe|pai|irmã|irmão)\s+(?:relata|refere|nega|apresenta|tem|teve|sente|aguarda)\b)/giu)){
   const before=raw.slice(0,m.index),tail=before.split(/[.!?;\n]/).at(-1);
   let quoted=false;for(const ch of before){if(ch==='"'||ch==='“')quoted=!quoted;else if(ch==='”')quoted=false;}
   if(quoted||/\b(?:nega|negou|não sabe|não nega)\b[^.!?;]*\bque\b[^.!?;]*$/iu.test(tail))continue;
   cuts.add(m.index);cuts.add(m.index+m[0].length);
  }
  const xs=[...cuts].sort((a,b)=>a-b),out=[];
  for(let i=1;i<xs.length;i++){
   let inicio=xs[i-1],fim=xs[i];while(inicio<fim&&/\s/.test(raw[inicio]))inicio++;
   const trecho=raw.slice(inicio,fim).trim();if(trecho&&!/^(?:,|e)$/i.test(trecho))out.push({inicio,fim,trecho});
  }
  return out;
 }
 function proposicoesDaFrase(texto,base=0,fatoId=''){
  const t=norm(texto),sites=entidades(texto),conceitos=[...(root.KineSysClinicalLanguage?.extrair(texto).sintomas||[])];
  Object.entries(CONCEITOS).forEach(([conceito,rx])=>matches(t,rx).forEach(e=>conceitos.push({...e,conceito})));
  conceitos.sort((a,b)=>a.inicio-b.inicio);for(let i=conceitos.length-1;i>=0;i--)if(conceitos.slice(0,i).some(c=>c.inicio===conceitos[i].inicio&&c.fim===conceitos[i].fim&&c.conceito===conceitos[i].conceito))conceitos.splice(i,1);
  const out=[],trajeto=/\b(?:irradia\w*|desce|descer|vai ate|chega a|ate os dedos)\b/.test(t),regioes=uniq(sites.map(e=>e.regiaoId));
  const numericos=segmento=>uniq((norm(segmento).match(/\b\d+(?:[.,]\d+)?(?:\s*\/\s*\d+)?(?:\s*(?:mg|mcg|ml|cm|mm|kg|dias?|semanas?|meses?|anos?|horas?|minutos?))?\b/g)||[]));
  function add(c,site,index){
   const next=sites[index+1],prev=sites[index-1],a=site?.inicio??c.inicio,b=site?.fim??c.fim;
   const inicioContexto=site?(prev?site.inicio:0):c.inicio;
   const fimContexto=next?next.inicio:texto.length;
   const local=texto.slice(inicioContexto,fimContexto),apos=site?texto.slice(b,fimContexto):'';
   let lado=site?lados(apos):[];
   if(!lado.length&&site&&/\b(?:bilateral(?:mente)?(?: nos| nas)?|ambos os|ambas as)\s+$/.test(t.slice(prev?.fim||0,a)))lado=['bilateral'];
   if(!lado.length&&sites.length===1)lado=lados(texto);
   // Adjetivo plural no final de enumeração: ombro e cotovelo esquerdos.
   if(!lado.length&&sites.length>1&&/\b(?:direit[oa]s|esquerd[oa]s)\b/.test(t.slice(sites.at(-1).fim))&&lados(texto).length===1)lado=lados(texto);
   if(lado.length>1)lado=[]; // não escolhe um lado se o trecho não permite ligação segura.
   const ep=escopo(texto,c.inicio,c.fim),temporal=tempo(local),id=`${fatoId}:p${out.length}`;
   let papel='local';if(trajeto&&sites.length>1)papel=index===0?'origem_trajeto':'destino_trajeto';
   if(site&&(index>0||root.KineSysClinicalLanguage?.alvoDeMovimento(texto,site))&&/\b(?:estender|flexionar|girar|rodar|elevar|levantar|movimentar|apertar|extensao d[eo]|flexao d[eo])\s+(?:(?:o|a|os|as)\s+)?$/.test(t.slice(Math.max(0,a-35),a)))papel='movimento_modificador';
   if(site&&/\b(?:biopsia|cirurgia|procedimento|operacao|infiltracao)(?:\s+(?:na|no|da|do|de))?\s+$/.test(t.slice(Math.max(0,a-40),a)))papel='procedimento_modificador';
   const prefixo=site&&!sites.some(s=>s.inicio>c.inicio&&s.inicio<site.inicio)?texto.slice(c.fim,site.inicio):'';
   const termo=texto.slice(c.inicio,c.fim),nt=norm(termo),qualidade=c.qualidade||(c.conceito==='parestesia'?/dorm|adorm/.test(nt)?'dormencia':/formig/.test(nt)?'formigamento':/choque/.test(nt)?'choque':'nao_especificada':c.conceito==='dor'&&/fisgada|pontada|desconforto/.test(nt)?nt:'');
   out.push({id,fatoId,tipo:'sintoma',conceito:c.conceito,qualidade,termo,regiaoId:site?.regiaoId||'',segmentoId:site?.segmentoId||'',estruturaId:site?.estruturaId||'',local:site?.trecho||'',contextoLocal:site?(prefixo+' '+texto.slice(site.inicio,fimContexto)).trim().replace(/\s+/g,' '):'',lado:lado[0]||'',
    ...ep,temporalidade:temporal.estado,tempo:temporal.expressoes,marcadoresTemporais:temporal.marcadores,papel,
    comportamento:root.KineSysClinicalLanguage?.comportamento(local)||[],
    qualificadoresLocal:root.KineSysClinicalLanguage?.qualificadoresLocal(texto,site)||[],
    quantificadores:numericos(local),origem:{inicio:base+Math.min(c.inicio,a),fim:base+Math.max(c.fim,b),trecho:texto.slice(Math.min(c.inicio,a),Math.max(c.fim,b))}});
  }
  sites.forEach((site,i)=>{
   const proximo=sites[i+1]?.inicio??texto.length;
   const antes=conceitos.filter(c=>c.inicio<=site.inicio),noTrecho=conceitos.filter(c=>c.inicio>=site.fim&&c.inicio<proximo);
   const c=antes.at(-1)||noTrecho[0];if(c)add(c,site,i);
  });
  conceitos.filter(c=>!out.some(p=>p.termo===texto.slice(c.inicio,c.fim))).forEach(c=>add(c,null,-1));
  if(/\b(?:diagnostico|diagnosticad[oa]|hipotese de|suspeita de)\b/.test(t)){
   const ep=escopo(texto,t.search(/diagnostico|diagnosticad|hipotese de|suspeita de/),texto.length);
   const marcador=/\b(?:diagnostico|diagnosticad[oa]|hipotese de|suspeita de)\b/.exec(t),rotuloDiagnostico=t.slice(marcador.index+marcador[0].length).replace(/^(?:\s+(?:previo|confirmado|de))+/,'').replace(/[.;,\s]+$/,'').trim();
   for(const regiaoId of regioes.length?regioes:[''])out.push({id:`${fatoId}:p${out.length}`,fatoId,tipo:'diagnostico_relatado',conceito:'diagnostico',rotuloDiagnostico,regiaoId,lado:'',...ep,
    certeza:/hipotese|suspeita|possivel/.test(t)?'hipotetica':'relatada',temporalidade:tempo(texto).estado,tempo:tempo(texto).expressoes,papel:'diagnostico_relatado',quantificadores:numericos(texto),origem:{inicio:base,fim:base+texto.length,trecho:texto}});
  }
  if(/\b(?:cirurgia|cirurgic\w*|artroplastia|artrodese|operad[oa])\b/.test(t)){
   const planejado=/\b(?:indicacao|indicad[oa]|aguarda|aguardando|planejad[oa]|programad[oa]|propost[oa]|vai operar)\b/.test(t),ep=escopo(texto,t.search(/cirurgia|cirurgic|artroplastia|artrodese|operad/),texto.length);
   const procedimento=t.match(/\b(?:artroplastia|artrodese|cirurgia|operad[oa])\b/)?.[0]||'cirurgia';
   out.push({id:`${fatoId}:p${out.length}`,fatoId,tipo:'procedimento',conceito:'cirurgia',procedimento,regiaoId:regioes.length===1?regioes[0]:'',lado:lados(texto).length===1?lados(texto)[0]:'',...ep,
    certeza:planejado?'planejada':ep.certeza,temporalidade:planejado?'futura':tempo(texto).estado,tempo:tempo(texto).expressoes,papel:planejado?'indicacao_relatada':'procedimento_relatado',quantificadores:numericos(texto),origem:{inicio:base,fim:base+texto.length,trecho:texto}});
  }
  if(/\b(?:usa|toma|uso|medicamentos?|medicacao)\b/.test(t)){
   for(const m of texto.matchAll(/([\p{L}][\p{L}\s()/.-]{1,70}?)\s+(\d+(?:[.,]\d+)?)\s*(mg|mcg|g|ml|UI)\b/giu)){
    const nome=m[1].replace(/^(?:e\s+)?(?:(?:usa|toma|informa uso de|em uso de|medicamentos? em uso|medicamentos?)\s*:?\s*)/i,'').trim();
    if(!nome||/^(?:uso |informad[oa]|de |nao |sem )/i.test(nome))continue;
    const ep=escopo(texto,m.index,m.index+m[0].length);
    out.push({id:`${fatoId}:p${out.length}`,fatoId,tipo:'medicamento',conceito:'medicamento',medicamento:norm(nome.replace(/^e\s+/i,'')),dose:m[2].replace(',','.'),unidade:norm(m[3]),regiaoId:'',lado:'',...ep,temporalidade:tempo(texto).estado,tempo:[],papel:'uso_relatado',quantificadores:[m[2].replace(',','.')+' '+norm(m[3])],origem:{inicio:base+m.index,fim:base+m.index+m[0].length,trecho:m[0]}});
   }
  }
  return out;
 }
 function categoria(text,props){
  const t=norm(text);
  if(props.some(p=>p.tipo==='procedimento'&&p.certeza==='planejada'))return 'indicacoes_relatadas';
  if(props.some(p=>p.tipo==='diagnostico_relatado'))return 'diagnosticos_relatados';
  if(props.some(p=>p.sujeito==='outra_pessoa')||/^(?:(?:o|a) )?(?:mae|pai|irmao|irma|avo|avo materna|avo paterna)\b/.test(t)||/antecedente|historico|cirurgia|queimadura|pneumonia|septicemia/.test(t))return 'antecedentes';
  if(/\b(?:apos isso|desde entao|por isso|essa dor|o mesmo sintoma)\b/.test(t))return 'continuidade';
  if(/\b(?:ao dormir|sono|despert\w*|acorda|noite|noturn\w*)\b/.test(t))return 'repercussoes';
  if(/\b(?:telefone|celular|rotina|trabalho)\b/.test(t)&&!props.some(p=>p.conceito==='dor'))return 'rotina';
  if(/\b(?:gama|resultado|laboratorial)\b/.test(t))return 'informacoes_complementares';
  return props.length&&!props.some(p=>p.conceito==='dor')?'associados':'queixa';
 }
 function analisar(value,opcoes={}){
  const origem=String(value||''),fatos=[],proposicoes=[],relacoes=[],pendencias=[],marcadoresEstruturais=[];
  recortes(origem).forEach((parte,indice)=>{
   const structure=root.KineSysClinicalLanguage?.separarEstrutura(parte.trecho);
   if(structure?.marcador){
    marcadoresEstruturais.push({campo:opcoes.campo||'paciente_hma',inicio:parte.inicio,fim:parte.inicio+structure.offset,trecho:origem.slice(parte.inicio,parte.inicio+structure.offset),tipo:structure.tipo||'rotulo_documental',uso:'estrutura_nao_achado'});
    parte={...parte,inicio:parte.inicio+structure.offset,trecho:structure.conteudo};
    if(!parte.trecho.trim())return;
   }
   const id=`hma:${indice}`,redacao=opcoes.realizar?opcoes.realizar(parte.trecho):sentence(parte.trecho.replace(/^(?:mas|porém|porem|entretanto|além disso|alem disso|e)\s+/i,''));
   const props=proposicoesDaFrase(parte.trecho,parte.inicio,id);
   const fato={id,tipo:'relato',redacao,categoria:categoria(parte.trecho,props),proposicoes:props,
    atributos:{conceitos:props.map(p=>({nome:p.conceito,estado:p.estado})),regioes:uniq(props.map(p=>p.regiaoId)),lados:uniq(props.map(p=>p.lado)),temporalidade:tempo(parte.trecho).estado,incerteza:props.some(p=>p.certeza==='hipotetica'||p.estado==='indeterminado'),quantificadores:uniq(props.flatMap(p=>p.quantificadores))},
    origens:[{campo:opcoes.campo||'paciente_hma',indice,inicio:parte.inicio,fim:parte.fim,trecho:origem.slice(parte.inicio,parte.fim),trechoNormalizado:parte.trecho}]};
   fato.linguagem=root.KineSysClinicalLanguage?.analisarOracao(parte.trecho,props,parte.inicio)||null;
   for(const p of fato.linguagem?.pendencias||[])pendencias.push({...p,fatoId:id,inicio:parte.inicio+p.inicio,fim:parte.inicio+p.fim});
   if(/\b(?:esse|essa|isso|ela|ele)\b/.test(norm(parte.trecho))&&props.length===0)pendencias.push({fatoId:id,tipo:'referencia_nao_resolvida',mensagem:'Referência sem vínculo anatômico inequívoco; mantida a redação de origem.'});
   if(props.some(p=>!p.regiaoId&&!p.segmentoId&&p.tipo==='sintoma'))pendencias.push({fatoId:id,tipo:'local_nao_especificado',mensagem:'Há sintoma sem localização inequívoca.'});
   fatos.push(fato);proposicoes.push(...props);
  });
  if(root.KineSysClinicalLanguage){
   const documental={origem,fatos,proposicoes,relacoes,pendencias};
   root.KineSysClinicalLanguage.resolverReferencias(documental,{entidades,proposicoes:proposicoesDaFrase,realizar:opcoes.realizar});
   pendencias.splice(0,pendencias.length,...documental.pendencias);proposicoes.splice(0,proposicoes.length,...fatos.flatMap(f=>f.proposicoes));
   for(const f of fatos){f.atributos.lados=uniq(f.proposicoes.map(p=>p.lado));f.atributos.conceitos=f.proposicoes.map(p=>({nome:p.conceito,estado:p.estado}));}
  }
  const problemas=new Map();
  proposicoes.filter(p=>p.regiaoId&&p.estado==='relatado'&&p.certeza!=='hipotetica'&&p.sujeito==='paciente'&&p.temporalidade!=='anterior'&&!['destino_trajeto','movimento_modificador','procedimento_modificador'].includes(p.papel)&&p.tipo!=='procedimento').forEach(p=>{
   const chave=p.regiaoId+'|'+p.lado+(p.estruturaId?'|'+p.estruturaId:'')+(p.qualificadoresLocal?.length?'|'+p.qualificadoresLocal.join(','):'');
   if(!problemas.has(chave))problemas.set(chave,{id:'problema:'+chave,regiaoId:p.regiaoId,lado:p.lado,estado:'a_investigar',fatoIds:[],proposicaoIds:[],diagnosticoApenasRelatado:p.tipo==='diagnostico_relatado'});
   const pr=problemas.get(chave);pr.fatoIds=uniq([...pr.fatoIds,p.fatoId]);pr.proposicaoIds.push(p.id);
  });
  // Contradição só dentro do mesmo evento anatômico/lado/momento/sujeito.
  proposicoes.forEach((a,i)=>proposicoes.slice(i+1).forEach(b=>{
   if(!a.regiaoId||a.tipo!==b.tipo||a.conceito!==b.conceito||a.regiaoId!==b.regiaoId||a.lado!==b.lado||a.sujeito!==b.sujeito||a.temporalidade!==b.temporalidade||JSON.stringify(a.tempo)!==JSON.stringify(b.tempo))return;
   if(new Set([a.estado,b.estado]).has('relatado')&&new Set([a.estado,b.estado]).has('negado')&&a.certeza==='relatada'&&b.certeza==='relatada')relacoes.push({tipo:'possivel_contradicao',de:a.fatoId,para:b.fatoId,proposicoes:[a.id,b.id]});
  }));
  return {versao:VERSION,origem,fatos,proposicoes,problemas:[...problemas.values()],relacoes,pendencias,marcadoresEstruturais,manterOrdem:fatos.some(f=>f.categoria==='continuidade')||pendencias.some(p=>p.tipo==='referencia_nao_resolvida')};
 }
 function planejar(relato){
  const ordem=['queixa','associados','repercussoes','diagnosticos_relatados','indicacoes_relatadas','antecedentes','informacoes_complementares','rotina','continuidade'],grupos=new Map();
  // Agrupa problemas regionais apenas quando cada frase de sintoma tem vínculo
  // inequívoco. "Essa dor" e sintomas sem localização não migram entre regiões.
  const sintomas=relato.fatos.filter(f=>['queixa','associados'].includes(f.categoria)&&f.proposicoes.some(p=>p.tipo==='sintoma'&&p.estado==='relatado'&&p.certeza==='relatada'&&p.sujeito==='paciente'));
  const chaveRegiao=f=>{const props=f.proposicoes.filter(p=>p.tipo==='sintoma'&&p.estado==='relatado'&&p.sujeito==='paciente'&&!['destino_trajeto','movimento_modificador','procedimento_modificador'].includes(p.papel)),locais=uniq(props.map(p=>p.regiaoId||p.segmentoId)),eventos=uniq(props.map(p=>JSON.stringify([p.lado,p.estruturaId,p.qualificadoresLocal,p.temporalidade,p.tempo,p.marcadoresTemporais])));return props.every(p=>p.regiaoId||p.segmentoId)&&locais.length===1&&eventos.length===1?locais[0]+'|'+eventos[0]:'';};
  const porProblema=!relato.manterOrdem&&sintomas.length>1&&sintomas.every(f=>chaveRegiao(f))&&uniq(sintomas.map(chaveRegiao)).length>1;
  relato.fatos.forEach(f=>{const tipo=relato.manterOrdem?'queixa':porProblema&&sintomas.includes(f)?'problema:'+chaveRegiao(f):f.categoria;if(!grupos.has(tipo))grupos.set(tipo,[]);grupos.get(tipo).push(f);});
  const blocos=[];
  const chaves=porProblema?[...grupos.keys()].filter(k=>k.startsWith('problema:')).concat(ordem.filter(k=>grupos.has(k))):ordem.filter(k=>grupos.has(k));
  chaves.forEach(chave=>{
   const tipo=chave.startsWith('problema:')?'queixa':chave;
   const fs=grupos.get(chave);
   const omitidos=new Set(),textos=new Map();
   const primeiras=new Map();fs.forEach(f=>{const chave=norm(f.redacao),primeira=primeiras.get(chave);if(primeira){omitidos.add(f.id);f.realizacoes=[primeira.redacao];relato.relacoes.push({tipo:'mesmo_fato_repetido',de:f.id,para:primeira.id});}else primeiras.set(chave,f);});
   const simples=fs.filter(f=>!omitidos.has(f.id)&&/^Relata dor (?:no|na|nos|nas|em ambos|em ambas) [^.;]+\.$/.test(f.redacao)&&!f.atributos.incerteza&&!/(?<!\p{L})(?:e|mas|com|porém|após|quando|há|desde|durante)(?!\p{L})|,/iu.test(f.redacao.slice(11,-1))&&f.proposicoes.every(p=>p.sujeito==='paciente'&&p.estado==='relatado'&&!p.tempo?.length&&!p.marcadoresTemporais?.length&&!p.quantificadores?.length));
   if(simples.length>1&&!relato.manterOrdem){
    const frase='Relata dor '+natural(simples.map(f=>f.redacao.slice(11,-1)))+'.';textos.set(simples[0].id,frase);
    simples.forEach((f,i)=>{f.realizacoes=[frase];if(i)omitidos.add(f.id);});
   }
   if(!relato.manterOrdem){
    const generico=fs.find(f=>f.redacao==='Refere persistência da dor.'),detalhado=fs.find(f=>/^Refere persistência da dor há .+\.$/.test(f.redacao));
    if(generico&&detalhado){omitidos.add(generico.id);generico.realizacoes=[detalhado.redacao];relato.relacoes.push({tipo:'detalhado_por',de:generico.id,para:detalhado.id});}
    const sono=fs.find(f=>f.redacao==='A dor piora ao dormir.'),despertar=fs.find(f=>f.redacao==='A dor provoca despertares noturnos.');
    if(sono&&despertar){
     const frase='A dor piora ao dormir e provoca despertares noturnos.',primeiro=fs.indexOf(sono)<fs.indexOf(despertar)?sono:despertar,segundo=primeiro===sono?despertar:sono;
     textos.set(primeiro.id,frase);omitidos.add(segundo.id);sono.realizacoes=despertar.realizacoes=[frase];relato.relacoes.push({tipo:'mesmo_comportamento_dos_sintomas',de:sono.id,para:despertar.id});
    }
   }
   let bloco={tipo,fatos:[],texto:''};
   fs.filter(f=>!omitidos.has(f.id)).forEach(f=>{
    const anterior=bloco.fatos.length?relato.fatos.find(x=>x.id===bloco.fatos.at(-1)):null;
    const inicio=f.origens?.[0]?.inicio,fimAnterior=anterior?.origens?.at(-1)?.fim;
    const transicao=(relato.marcadoresEstruturais||[]).some(m=>m.tipo==='transicao_discursiva'&&m.inicio>=(fimAnterior??Infinity)&&m.fim<=(inicio??-1));
    if(bloco.texto&&transicao){blocos.push(bloco);bloco={tipo,fatos:[],texto:''};}
    const base=textos.get(f.id)||f.redacao;
    const texto=root.KineSysDocumentAnalyzer?.redigirFatoPlanejado(f,base,!!bloco.texto||blocos.length>0)||base;
    if(bloco.texto&&bloco.texto.length+texto.length>550){blocos.push(bloco);bloco={tipo,fatos:[],texto:''};}
    bloco.texto+=(bloco.texto?' ':'')+texto;bloco.fatos.push(...fs.filter(o=>o.id===f.id||o.realizacoes?.includes(texto)).map(o=>o.id));
   });if(bloco.texto)blocos.push(bloco);
   // A repeated source follows the final realization of its representative,
   // including a sentence combined from multiple distinct (not repeated) facts.
   relato.relacoes.filter(r=>r.tipo==='mesmo_fato_repetido').forEach(r=>{const original=fs.find(f=>f.id===r.para),duplicate=fs.find(f=>f.id===r.de);if(original&&duplicate)duplicate.realizacoes=original.realizacoes?.slice()||[textos.get(original.id)||original.redacao];});
  });
  return blocos;
 }
 function assinatura(p){return [p.tipo,p.conceito,p.qualidade||'',p.rotuloDiagnostico||'',p.procedimento||'',p.medicamento||'',p.dose||'',p.unidade||'',p.regiaoId,p.segmentoId||'',p.estruturaId||'',p.lado,p.estado,p.sujeito,p.certeza,p.temporalidade,p.papel,(p.comportamento||[]).join(',')].join('|');}
 function compativel(a,b){
  if(a.tipo!==b.tipo||a.conceito!==b.conceito||a.regiaoId!==b.regiaoId||a.lado!==b.lado||a.estado!==b.estado||a.sujeito!==b.sujeito)return false;
  if((a.segmentoId||'')!==(b.segmentoId||''))return false;
  if((a.estruturaId||'')!==(b.estruturaId||''))return false;
  if(JSON.stringify(a.qualificadoresLocal||[])!==JSON.stringify(b.qualificadoresLocal||[]))return false;
  if(JSON.stringify(a.comportamento||[])!==JSON.stringify(b.comportamento||[]))return false;
  if((a.qualidade||'')!==(b.qualidade||'')||(a.medicamento||'')!==(b.medicamento||'')||(a.dose||'')!==(b.dose||'')||(a.unidade||'')!==(b.unidade||''))return false;
  if((a.rotuloDiagnostico||'')!==(b.rotuloDiagnostico||'')||(a.procedimento||'')!==(b.procedimento||''))return false;
  if(a.certeza!==b.certeza||a.temporalidade!==b.temporalidade)return false;
  if(a.papel!==b.papel)return false;
  return a.tempo.every(v=>b.tempo.some(x=>norm(x)===norm(v)))&&a.quantificadores.every(v=>b.quantificadores.includes(v));
 }
 function validar(relato,texto,adicionais=[]){
  const lido=analisar(texto),originais=[...relato.proposicoes,...adicionais.flatMap(t=>analisar(t).proposicoes)],ausentes=[],introduzidas=[];
  relato.proposicoes.forEach(p=>{const cs=lido.proposicoes.filter(g=>compativel(p,g));if(!cs.length||!(p.marcadoresTemporais||[]).every(m=>cs.some(g=>(g.marcadoresTemporais||[]).includes(m))))ausentes.push({proposicaoId:p.id,fatoId:p.fatoId,esperado:assinatura(p)});});
  lido.proposicoes.filter(p=>p.regiaoId||p.tipo==='procedimento'||p.tipo==='medicamento').forEach(p=>{const cs=originais.filter(o=>compativel(p,o));if(!cs.length||!(p.marcadoresTemporais||[]).every(m=>cs.some(o=>(o.marcadoresTemporais||[]).includes(m))))introduzidas.push({trecho:p.origem.trecho,observado:assinatura(p)});});
  // Associação regional não autoriza escrever causalidade. Marcadores causais
  // novos exigem revisão mesmo quando todas as palavras clínicas estão presentes.
  const causal=/\b(?:causad[oa]s? por|decorrente de|devido a|secundari[oa] a|em decorrencia de|responsavel por)\b/g;
  const base=norm([relato.origem||'',...adicionais].join(' ')),nexosBase=matches(base,causal),nexosTexto=matches(norm(texto),causal);
  const causalidade=nexosTexto.filter((n,i)=>nexosTexto.slice(0,i+1).filter(x=>x.texto===n.texto).length>nexosBase.filter(x=>x.texto===n.texto).length).map(n=>({tipo:'vinculo_causal_novo',marcador:n.texto}));
  return {ok:!ausentes.length&&!introduzidas.length&&!causalidade.length,ausentes,introduzidas,causalidade,limites:relato.pendencias};
 }
 function porRegiao(relato,id){
  // Não leva sintomas/diagnósticos de outra região para uma hipótese local.
  return relato.fatos.filter(f=>f.proposicoes.some(p=>p.regiaoId===id&&p.sujeito==='paciente'&&p.temporalidade!=='anterior')||
    // Vocabulário não extraído (por exemplo um nome de condição) não deve
    // desaparecer do analisador clínico já existente. Só admite aqui uma região
    // explícita única, deixando negação/sujeito ao analisador clínico original.
    !f.proposicoes.length&&(()=>{const ids=uniq(entidades(f.origens[0].trecho).map(e=>e.regiaoId));return ids.length===1&&ids[0]===id;})())
   .map(f=>{
    const props=f.proposicoes.filter(p=>p.regiaoId===id),outras=f.proposicoes.filter(p=>p.regiaoId&&p.regiaoId!==id);
    // Segmento multirregional simples pode ser reconstituído por slots; caso
    // contrário fica disponível como contexto, sem inventar uma frase parcial.
    return {fatoId:f.id,texto:f.redacao,proposicoes:copy(props),compartilhado:outras.some(p=>!['destino_trajeto','movimento_modificador','procedimento_modificador'].includes(p.papel))&&!props.some(p=>p.papel==='origem_trajeto')};
   });
 }
 root.KineSysSemanticGraph=Object.freeze({version:VERSION,analisar,planejar,validar,porRegiao,proposicoesDaFrase,assinatura,entidades});
})(typeof window==='undefined'?globalThis:window);
