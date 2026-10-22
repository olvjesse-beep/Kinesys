/* Metadados de investigação, não clusters diagnósticos nem probabilidades.
 * Fontes primárias/consensos: limites explícitos e nenhum limiar inventado.
 * Este catálogo suplementa os bancos regionais sem reescrever os fragmentos gerados. */
(function(root){
 'use strict';
 const fontes={
  plantar:{titulo:'JOSPT — Heel Pain / Plantar Fasciitis, 2023',url:'https://doi.org/10.2519/jospt.2023.0303',tipo:'diretriz',limite:'Padrão de história e exame; primeiros passos isoladamente não localizam a dor nem confirmam fasciopatia.'},
  aquiles:{titulo:'JOSPT — Midportion Achilles Tendinopathy, 2024',url:'https://doi.org/10.2519/jospt.2024.0302',tipo:'diretriz',limite:'Diretriz para a porção média do Aquiles; localização, carga e exame precisam concordar. Dor posterior isolada não define tendinopatia nem sua localização no tendão.'},
  entorse:{titulo:'JOSPT — Lateral Ankle Ligament Sprains, 2021',url:'https://doi.org/10.2519/jospt.2021.0302',tipo:'diretriz',limite:'História, exame, função e diagnósticos diferenciais; trauma prévio não equivale a lesão aguda atual.'},
  fibulares:{titulo:'ESSKA-AFAS — Peroneal Tendon Pathologies, 2018',url:'https://pmc.ncbi.nlm.nih.gov/articles/PMC6154028/',tipo:'consenso',limite:'Evidência limitada para vários testes; diferenciar tendão, ligamento e instabilidade tendínea sem confirmação por contagem.'},
  imagem:{titulo:'ACR — Acute Trauma to the Ankle, 2020',url:'https://pubmed.ncbi.nlm.nih.gov/33153549/',tipo:'diretriz_imagem',limite:'Necessidade de imagem depende de trauma, exame e aplicabilidade das regras; não calcular Ottawa a partir de HMA incompleta.'},
  sinus:{titulo:'Sinus Tarsi Syndrome — Critical Review, 2023',url:'https://pubmed.ncbi.nlm.nih.gov/37959343/',tipo:'revisao_critica',limite:'Síndrome heterogênea, sem teste clínico isolado que estabeleça o diagnóstico.'}
 };
 // id, título, nomes legados, anatomia aceitável, pistas discriminativas, fonte.
 const linhas=[
  ['dor_plantar_calcanhar','Fasciopatia plantar — investigar',['fasciopatia plantar','dor plantar do calcaneo'],['plantar_calcanhar'],['primeiros_passos','carga'],['plantar']],
  ['entorse_lateral_tornozelo','Lesão ligamentar lateral após entorse — investigar',['entorse lateral'],['lateral_tornozelo'],['entorse','inversao'],['entorse','imagem']],
  ['lesao_sindesmose','Lesão da sindesmose — investigar',['sindesmose','entorse alta'],['acima_tornozelo'],['rotacao_externa','entorse'],['entorse','imagem']],
  ['patologia_tendoes_fibulares','Patologia dos tendões fibulares — investigar',['fibulares','peroneais'],['retromaleolar_lateral'],['eversao','estalo_lateral'],['fibulares']],
  ['instabilidade_tendoes_fibulares','Instabilidade dos tendões fibulares — investigar',['instabilidade dos fibulares'],['retromaleolar_lateral'],['estalo_lateral'],['fibulares']],
  ['lesao_osteocondral_talus','Lesão osteocondral do tálus — investigar',['osteocondral','domo talar'],['profunda_tornozelo'],['travamento','dor_persistente'],['entorse','imagem']],
  ['dor_sinus_tarsi','Dor do seio do tarso — investigar',['seio do tarso','sinus tarsi'],['sinus_tarsi'],['terreno_irregular','entorse'],['sinus']],
  ['instabilidade_cronica_tornozelo','Instabilidade crônica do tornozelo — investigar',['instabilidade cronica do tornozelo'],['lateral_tornozelo','tornozelo'],['falseio','recorrencia'],['entorse']],
  ['tendinopatia_aquiles','Tendinopatia do Aquiles — investigar',['tendinopatia do tendao de aquiles','tendinopatia do aquiles'],['posterior_tornozelo'],['carga'],['aquiles']]
 ];
 const perguntas={
  local:{id:'local',texto:'Onde exatamente está a dor: planta/calcanhar, à frente, atrás, acima ou ao lado do maléolo?',distingue:['dor_plantar_calcanhar','entorse_lateral_tornozelo','lesao_sindesmose','patologia_tendoes_fibulares']},
  evento:{id:'evento',texto:'Quando ocorreu a entorse? A dor atual começou naquele episódio, apareceu depois ou já existia antes?',distingue:['entorse_lateral_tornozelo','instabilidade_cronica_tornozelo','lesao_osteocondral_talus']},
  entorse:{id:'entorse',texto:'Como o pé virou e houve edema ou equimose logo após o episódio?',distingue:['entorse_lateral_tornozelo','lesao_sindesmose']},
  plantar:{id:'plantar',texto:'A dor dos primeiros passos fica sob o calcanhar, especialmente na porção medial, ou apenas na lateral do tornozelo?',distingue:['dor_plantar_calcanhar','entorse_lateral_tornozelo']},
  fibulares:{id:'fibulares',texto:'Há dor ou estalo atrás do maléolo lateral ao mover o pé para fora?',distingue:['patologia_tendoes_fibulares','instabilidade_tendoes_fibulares','entorse_lateral_tornozelo']},
  sindesmose:{id:'sindesmose',texto:'A dor fica acima da articulação e piora ao girar o pé para fora?',distingue:['lesao_sindesmose','entorse_lateral_tornozelo']},
  mecanica:{id:'mecanica',texto:'Há dor profunda, travamento ou bloqueio persistente após a entorse?',distingue:['lesao_osteocondral_talus','instabilidade_cronica_tornozelo']},
  falseio:{id:'falseio',texto:'O tornozelo falseia ou torce repetidamente? Isso já acontecia antes da lesão atual?',distingue:['instabilidade_cronica_tornozelo','entorse_lateral_tornozelo']},
  seguranca:{id:'seguranca',texto:'Após o trauma, verificar capacidade de apoio, dor óssea específica e aplicabilidade das regras de Ottawa antes de testes provocativos.',distingue:['triagem_fratura'],seguranca:true}
 };
 const exames={
  patologia_tendoes_fibulares:['Palpação do trajeto retromaleolar lateral reproduz a dor familiar','Eversão resistida e avaliação dinâmica dos fibulares, quando seguras','Diferenciação de lesão ligamentar, fratura e origem neural conforme exame'],
  instabilidade_tendoes_fibulares:['Estalo ou deslocamento retromaleolar lateral observado em avaliação dinâmica segura','Correlação entre o movimento, o sintoma familiar e a estabilidade tendínea','Avaliação especializada/imagem dinâmica quando necessária; não presumir instabilidade por estalo isolado'],
  lesao_osteocondral_talus:['Dor profunda e limitação funcional persistentes após trauma documentadas','Investigar bloqueio, derrame e dor articular familiar no exame','Correlacionar com avaliação médica e imagem quando indicadas; exame clínico isolado não confirma lesão osteocondral'],
  dor_sinus_tarsi:['Dor focal no seio do tarso reproduzida à palpação','Avaliação subtalar e tolerância a terreno irregular conforme segurança','Diferenciação de instabilidade, tendões fibulares e outras causas de dor lateral do retropé']
 };
 const perfis=linhas.map(([id,nome,aliases,anatomia,pistas,refs])=>({id,nome,regiaoId:'tornozelo_pe',aliases,anatomia,pistas,fontes:refs.map(k=>fontes[k]),testes:exames[id]||[],
  limite:'Hipótese de investigação. Não confirma diagnóstico, causalidade ou indicação de cirurgia; exige história e exame concordantes.'}));
 function instalarBanco(banco){
  const reg=banco?.tornozelo_pe;if(!reg)return 0;reg.diferenciais=reg.diferenciais||[];let total=0;
  perfis.filter(p=>p.testes.length).forEach(p=>{if([...reg.clusters||[],...reg.diferenciais].some(i=>i.id===p.id))return;
   reg.diferenciais.push({id:p.id,nome:p.nome,testes:p.testes.slice(),palavrasChaveHMA:p.aliases.slice(),interpretacao:p.limite,
    evidencia:p.fontes.map(f=>f.titulo+': '+f.url).join('; '),nivelEvidencia:p.fontes.map(f=>f.tipo+' — '+f.limite).join(' '),categoriaClinica:'investigacao_contextual'});total++;});return total;
 }
 root.KineSysEvidenceProfiles=Object.freeze({version:'1.0.0',perfis:Object.freeze(perfis),perguntas:Object.freeze(perguntas),fontes:Object.freeze(fontes),instalarBanco});
})(typeof window==='undefined'?globalThis:window);
