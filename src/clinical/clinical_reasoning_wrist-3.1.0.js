/* ============================================================================
   KineSys — Motor Clínico 3.1 | Punho e Mão
   Enriquecedor regional sobre o contrato existente do Motor 3.0.

   Princípios:
   - mantém a região estrutural existente `punho_mao`;
   - HMA prioriza investigação, não fecha diagnóstico;
   - rótulo informado pelo paciente não vale como confirmação;
   - trauma, infecção, síndrome compartimental e déficit neurovascular precedem
     hipóteses musculoesqueléticas eletivas;
   - sintomas na mão exigem diferenciação entre fonte local, cotovelo e cervical.
   ============================================================================ */
(function instalarMotor31PunhoMao(){
  'use strict';

  const VERSION='3.1.2-wrist3';
  const n=(v='')=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').replace(/\s+/g,' ').trim().replace(/\bdedao\b/g,'polegar').replace(/\bdedo do meio\b/g,'medio').replace(/\bn\b/g,'nao');
  const arr=v=>Array.isArray(v)?v:[];
  const uniq=v=>Array.from(new Set(arr(v).filter(Boolean)));
  const hma=()=>String(document.getElementById('paciente_hma')?.value||'');
  const contexto=()=>{try{return typeof coletarContextoClinico==='function'?(coletarContextoClinico()||{}):{};}catch(_){return{};}};
  const banco=()=>{try{return typeof BANCO_MAPEAMENTO_CLINICO!=='undefined'?BANCO_MAPEAMENTO_CLINICO?.punho_mao:null;}catch(_){return null;}};
  const cacheBanco=new Map();

  const REFERENCIAS=[
    {pmid:'42676086',ano:2026,titulo:'Hand Pain and Sensory Deficits: Carpal Tunnel Syndrome: 2026 Revision',uso:'avaliação e manejo de síndrome do túnel do carpo'},
    {ano:2024,titulo:'Distal Radius Fracture Rehabilitation Clinical Practice Guideline',uso:'avaliação/reabilitação após fratura distal do rádio; referência já cadastrada no banco KineSys'},
    {pmid:'40300919',ano:2026,titulo:'Pyogenic flexor tenosynovitis: A current problem of hand surgery',uso:'triagem de infecção da bainha flexora'},
    {pmid:'40931478',ano:2026,titulo:"Comparative short-term effects ... among De Quervain's tenosynovitis patients",uso:'evidência recente em reabilitação de De Quervain'}
  ];

  const BASE_PERGUNTAS=[
    'Onde exatamente está o sintoma: lado do polegar/radial, dorso/centro, lado do mindinho/ulnar, palma, base do polegar ou dedos?',
    'É principalmente dor, formigamento/dormência, choque, fraqueza, estalo/travamento ou inchaço?',
    'Quais dedos formigam: polegar/indicador/médio ou anelar/mindinho? A palma também é afetada?',
    'Acorda à noite, aparece dirigindo/segurando celular ou melhora ao sacudir a mão?',
    'Pescoço, posição do ombro ou cotovelo dobrado/apoiado modificam a mesma queixa?',
    'Houve queda sobre a mão, torção, impacto, corte, estalo traumático ou edema rápido?',
    'Após trauma, há dor na tabaqueira anatômica, deformidade ou incapacidade de usar a mão?',
    'Dor ulnar piora ao girar chave/maçaneta, apoiar peso na mão ou fazer pronação-supinação?',
    'Dor radial piora ao usar o polegar, pegar bebê, abrir potes ou desviar o punho?',
    'Há calor, vermelhidão, ferida, secreção, febre, edema tenso ou dor desproporcional?',
    'Há mão fria/pálida/arroxeada, alteração de pulso/perfusão, perda sensitiva ou fraqueza progressiva?',
    'Houve fratura, cirurgia, imobilização ou reparo de tendão? Qual data, lado e restrição atual?'
  ];

  const C=(id,ordem,rotulo,op={})=>({id,ordem,rotulo,urgente:false,bancoId:id,termos:[],perguntas:[],objetivos:[],reforca:[],enfraquece:[],...op});
  const CONDICOES=[
    C('punho_infeccao',116,'Infecção da mão/punho ou bainha flexora — excluir prioritariamente',{urgente:true,bancoId:null,termos:['mao quente vermelha e inchada','punho quente vermelho e inchado','febre e mao inchada','corte na mao e febre','ferida na mao com pus'],perguntas:['Há febre/calafrios junto com calor, rubor, ferida ou inchaço?','Houve corte, mordida, perfuração ou cirurgia recente?'],objetivos:['Inspecionar ferida, rubor, edema, secreção e postura dos dedos','Evitar testes vigorosos e definir encaminhamento médico urgente quando plausível'],reforca:['febre','rubor/calor','ferida/inoculação'],enfraquece:['quadro mecânico sem sinais sistêmicos']}),
    C('punho_compartimental',114,'Síndrome compartimental aguda de antebraço/mão — excluir imediatamente',{urgente:true,bancoId:null,termos:['dor insuportavel depois do trauma','antebraco muito tenso','edema tenso','dor ao esticar os dedos depois do trauma'],perguntas:['A dor aumenta rapidamente e parece desproporcional?','Há edema tenso ou dor marcada ao alongamento passivo dos dedos?'],objetivos:['Não atrasar avaliação médica por testes musculoesqueléticos','Avaliar perfusão e estado sensitivo/motor distal rapidamente'],reforca:['dor desproporcional','edema tenso','dor ao alongamento passivo']}),
    C('punho_vascular_agudo',113,'Comprometimento vascular agudo da mão — excluir imediatamente',{urgente:true,bancoId:null,termos:['mao fria e palida','mao roxa e fria','sem pulso na mao','perdeu o pulso','dedos azulados e frios'],perguntas:['A alteração de cor/temperatura começou subitamente?','Há pulso/perfusão ou enchimento capilar alterados?'],objetivos:['Comparar cor, temperatura, enchimento capilar e pulsos quando apropriado','Encaminhar sem atrasos quando a perfusão estiver ameaçada'],reforca:['palidez/cianose','frialdade','pulso/perfusão alterado']}),
    C('punho_trauma_maior',111,'Trauma importante / fratura-luxação do punho ou mão — excluir',{urgente:true,bancoId:null,termos:['punho deformado depois da queda','mao deformada depois do trauma','nao consegue mexer depois da queda','trauma forte no punho','luxou o punho'],perguntas:['Qual foi o mecanismo e a posição da mão/punho?','Há deformidade, incapacidade importante ou déficit neurovascular?'],objetivos:['Inspeção/palpação cautelosa e exame neurovascular distal','Definir necessidade de imagem/encaminhamento antes de testes provocativos'],reforca:['trauma','deformidade','incapacidade aguda']}),
    C('punho_escafoide',109,'Suspeita de fratura de escafoide — excluir',{urgente:true,bancoId:null,termos:['dor na tabaqueira anatomica','dor no escafoide depois da queda','queda sobre a mao com dor perto do polegar'],perguntas:['Houve queda sobre a mão espalmada/hiperextensão?','A dor é focal na tabaqueira ou tubérculo do escafoide?'],objetivos:['Palpar cautelosamente tabaqueira/tubérculo do escafoide','Considerar imobilização e avaliação por imagem conforme suspeita clínica'],reforca:['queda sobre mão espalmada','dor óssea radial focal'],enfraquece:['sem trauma e padrão tendíneo']}),
    C('fratura_radio_distal_reabilitacao',104,'Fratura distal do rádio — estado de consolidação/reabilitação',{termos:['fratura do radio distal','fratura no punho','quebrei o punho','quebrou o punho','placa no punho','colles','gesso no punho'],perguntas:['Qual tipo/data da fratura e tratamento?','Quais restrições de carga e movimento permanecem?'],objetivos:['Confirmar consolidação, estabilidade e restrições','Quantificar ADM, edema, preensão e função na fase permitida']}),
    C('pos_operatorio_tendao_mao',101,'Pós-reparo de tendão flexor/extensor da mão',{termos:['reparo de tendao flexor','reparo de tendao extensor','tendao flexor cortado','tendao extensor cortado','cirurgia de tendao no dedo'],perguntas:['Qual tendão/zona, data e protocolo cirúrgico?','Houve perda súbita de movimento ativo antes presente?'],objetivos:['Respeitar protocolo de proteção específico','Monitorar edema, deslizamento tendíneo, ADM e integridade do reparo']}),
    C('punho_crps',99,'Síndrome de dor regional complexa (CRPS) — investigar',{bancoId:null,termos:['dor desproporcional depois da fratura','mao muda de cor e sua','dor ate ao toque depois da fratura','alodinia depois da fratura'],perguntas:['Há alteração vasomotora/sudomotora, edema, alodinia ou perda funcional desproporcional?'],objetivos:['Documentar distribuição de dor, edema, temperatura/cor, sudorese e função','Aplicar critérios clínicos apropriados sem inferir CRPS por dor isolada']}),
    C('radiculopatia_neuropatia_proximal',98,'Origem cervical / neuropatia proximal — diferenciar',{termos:['dor do pescoco ate a mao','formigamento muda com o pescoco','dedos formigam quando dobra o cotovelo','formiga quando apoia o cotovelo','tunel cubital'],perguntas:['Movimentos cervicais modificam a queixa?','Sintomas ulnares pioram com cotovelo flexionado/apoiado?'],objetivos:['Screening cervical e exame neurológico conforme distribuição','Comparar provocação por cervical/cotovelo versus punho']}),
    C('punho_mediano_proximal',97,'Neuropatia mediana proximal / síndrome do pronador — diferencial',{bancoId:null,termos:['dor no antebraco com formigamento no polegar indicador e medio','formigamento mediano piora ao pronar','nervo mediano no antebraco'],perguntas:['Há dor/parestesia na face volar proximal do antebraço associada aos sintomas medianos?','Pronação resistida ou carga de flexores do cotovelo/antebraço reproduz a queixa?','O padrão é pouco noturno e não melhora ao sacudir a mão, ao contrário do padrão clássico de túnel do carpo?'],objetivos:['Mapear território mediano incluindo antebraço/palma e função motora','Comparar provocação proximal no antebraço com provocação no túnel do carpo','Screening cervical para excluir fonte ainda mais proximal'],reforca:['sintomas medianos + dor volar do antebraço','provocação com pronação/carga proximal'],enfraquece:['padrão noturno clássico e alívio ao sacudir a mão']}),
    C('tunel_carpo',96,'Síndrome do túnel do carpo — padrão mediano a investigar',{termos:['formigamento na mao a noite','dormencia no polegar indicador e medio','mao adormece dirigindo','sacudir a mao melhora'],perguntas:['Parestesia predomina em polegar, indicador e médio e piora à noite?','Há perda de destreza, oposição ou atrofia tenar?'],objetivos:['Mapear sensibilidade mediana e função tenar','Usar provocação/CTS-6 quando apropriado, sem interpretar Phalen/Tinel isoladamente']}),
    C('punho_ulnar_guyon',94,'Neuropatia ulnar distal / canal de Guyon — investigar',{bancoId:null,termos:['formigamento no anelar e mindinho no guidao','formigamento no mindinho apoiando a palma','canal de guyon'],perguntas:['Sintomas ulnares aparecem com pressão na palma/hipotenar?','O cotovelo dobrado/apoiado ou o pescoço modificam a queixa?'],objetivos:['Mapear sensibilidade e força intrínseca em território ulnar','Comparar compressão distal com túnel cubital e C8-T1']}),
    C('punho_ecu',92,'Tendão extensor ulnar do carpo (ECU) / instabilidade tendínea — investigar',{bancoId:null,termos:['dor dorsal ulnar no punho com estalo do tendao','tendao pula no lado ulnar do punho','dor no ecu ao girar o antebraco'],perguntas:['A dor é dorsal-ulnar e existe estalo/subluxação tendínea com rotação do antebraço?','Desvio ulnar ou extensão resistida reproduz a dor mais superficialmente que carga profunda do TFCC?'],objetivos:['Localizar ECU versus fóvea/DRUJ','Avaliar carga resistida e estabilidade dinâmica do ECU quando seguro','Diferenciar de TFCC e instabilidade da DRUJ'],reforca:['dor dorsal-ulnar','estalo/subluxação tendínea','rotação/desvio ulnar'],enfraquece:['dor profunda foveal sem estalo tendíneo']}),
    C('tfcc',91,'Lesão do complexo da fibrocartilagem triangular (TFCC) — investigar',{termos:['dor ulnar no punho','dor do lado do mindinho no punho','dor ao girar chave','dor ao girar macaneta','dor ao apoiar peso na mao'],perguntas:['A dor é focal ulnar e piora com rotação/carga axial?','Há sensação de instabilidade da DRUJ?'],objetivos:['Localizar dor/fóvea ulnar e avaliar DRUJ','Usar press/fovea e testes de carga apenas no conjunto clínico']}),
    C('punho_intersecao',91,'Síndrome de interseção dorsal — diferencial de dor radial',{bancoId:null,termos:['dor dorsoradial acima do punho','crepitacao alguns centimetros acima do punho','dor no antebraco dorsal radial com extensao repetitiva'],perguntas:['O ponto doloroso fica alguns centímetros proximal à estiloide radial, no dorso do antebraço, em vez do primeiro compartimento junto ao polegar?','Há crepitação e relação com extensão repetitiva do punho?'],objetivos:['Distinguir topograficamente síndrome de interseção de De Quervain','Provocar de forma graduada com extensão resistida/repetitiva conforme irritabilidade'],reforca:['dor dorsoradial proximal à estiloide','crepitação','extensão repetitiva'],enfraquece:['dor focal no primeiro compartimento junto ao polegar']}),
    C('dequervain',90,'Tenossinovite de De Quervain — investigar',{termos:['dor na estiloide radial','dor perto do polegar pegando bebe','dor radial mexendo o polegar','dor no lado do polegar'],perguntas:['A dor é focal no primeiro compartimento dorsal/estiloide radial?','Uso/abdução do polegar reproduz a dor?'],objetivos:['Localização do primeiro compartimento e provocação por carga do polegar','Interpretar Finkelstein/WHAT no contexto, evitando irritação desnecessária']}),
    C('instabilidade_escafolunar',89,'Lesão / instabilidade escafolunar — investigar',{termos:['dor no dorso do punho depois da queda','clique doloroso no punho depois da queda','punho estala depois da queda'],perguntas:['Houve queda sobre mão espalmada e dor dorsal persistente?','Há clunk/instabilidade mecânica com carga?'],objetivos:['Localizar dor escafolunar e avaliar estabilidade com cautela','Definir necessidade de imagem/especialista quando persistente']}),
    C('rizartrose',84,'Osteoartrite CMC do polegar / rizartrose — investigar',{termos:['dor na base do polegar','dor para fazer pinca','crepitacao na base do polegar','rizartrose'],perguntas:['A dor é na base do polegar e piora com pinça/preensão?','Há crepitação, deformidade ou perda funcional?'],objetivos:['Avaliar CMC, pinça/preensão e função','Interpretar grind como dado complementar, não como gravidade isolada']}),
    C('punho_sobrecarga_tendinea',80,'Sobrecarga tendínea/musculotendínea do punho — investigar',{bancoId:null,termos:['dor no punho ao estender contra peso','dor no punho ao flexionar contra peso','dor depois de aumentar a musculacao','dor no punho depois de usar muito o computador'],perguntas:['Qual movimento resistido reproduz a dor focal?','Houve aumento recente de carga/repetição sem trauma?'],objetivos:['Localizar tendão/região sintomática e comparar contração/alongamento','Quantificar força e tolerância à carga sem assumir tendão específico pela HMA']})
  ];

  const MATRIZ_EXAME={
    punho_infeccao:{essencial:['Inspeção de ferida, rubor, calor, edema e secreção','Estado sistêmico/sinais vitais quando indicado'],complementar:['Sinais de bainha flexora quando clinicamente apropriado'],evitar:['Testes vigorosos que atrasem encaminhamento']},
    punho_compartimental:{essencial:['Dor desproporcional, edema tenso e dor ao alongamento passivo','Exame neurovascular distal rápido'],complementar:[],evitar:['Carga, massagem ou testes que atrasem urgência']},
    punho_vascular_agudo:{essencial:['Cor, temperatura, enchimento capilar e perfusão/pulsos','Estado sensitivo e motor distal'],complementar:[],evitar:['Manobras provocativas diante de perfusão ameaçada']},
    punho_trauma_maior:{essencial:['Inspeção, dor óssea focal e exame neurovascular','ADM ativa tolerada sem forçar'],complementar:['Critérios de imagem/encaminhamento conforme contexto'],evitar:['Testes ligamentares vigorosos antes de excluir fratura']},
    punho_escafoide:{essencial:['Mecanismo e dor focal em tabaqueira/tubérculo do escafoide'],complementar:['Imagem/seguimento quando suspeita persiste'],evitar:['Carga repetida para tentar confirmar fratura']},
    punho_mediano_proximal:{essencial:['Mapa sensitivo/motor mediano e localização da dor no antebraço','Pronação/carga proximal versus provocação no carpo','Screening cervical'],complementar:['Neurodinâmica e avaliação eletrofisiológica quando indicada'],evitar:['Rotular túnel do carpo por distribuição mediana sem diferenciar compressão proximal']},
    tunel_carpo:{essencial:['Distribuição sensitiva mediana e função tenar','Provocação local/CTS-6 quando apropriado'],complementar:['Neurodinâmica e rastreio proximal se padrão atípico'],evitar:['Fechar diagnóstico por Phalen/Tinel isolados']},
    punho_ulnar_guyon:{essencial:['Distribuição ulnar sensitiva/motora e provocação distal'],complementar:['Comparar cotovelo e C8-T1'],evitar:['Atribuir todo formigamento ulnar ao punho']},
    radiculopatia_neuropatia_proximal:{essencial:['Screening cervical e neurológico','Comparar modulação por cotovelo/cervical versus punho'],complementar:['Neurodinâmica conforme distribuição'],evitar:['Rotular compressão distal sem concordância clínica']},
    punho_intersecao:{essencial:['Localização dorsoradial proximal à estiloide','Crepitação e relação com extensão repetitiva'],complementar:['Extensão resistida/repetitiva conforme tolerância'],evitar:['Confundir com De Quervain apenas por estar no lado radial']},
    dequervain:{essencial:['Dor focal radial/primeiro compartimento e carga do polegar'],complementar:['Finkelstein/WHAT no conjunto'],evitar:['Provocação excessiva ou Eichhoff isolado']},
    punho_ecu:{essencial:['Localização dorsal-ulnar do ECU','Carga de extensão/desvio ulnar e rotação','Instabilidade/subluxação tendínea dinâmica quando segura'],complementar:['Ultrassom dinâmico quando clinicamente indicado','Comparação com fóvea/DRUJ'],evitar:['Atribuir todo sintoma ulnar ao TFCC sem localizar a estrutura']},
    tfcc:{essencial:['Dor ulnar, fóvea/DRUJ e carga-rotação'],complementar:['Press/fovea conforme tolerância'],evitar:['Concluir TFCC por teste isolado']},
    instabilidade_escafolunar:{essencial:['Mecanismo, dor dorsal e estabilidade'],complementar:['Watson quando apropriado'],evitar:['Repetir clunk doloroso em trauma agudo']},
    rizartrose:{essencial:['Localização CMC, pinça/preensão e função'],complementar:['Grind como dado complementar'],evitar:['Usar grind isolado como gravidade']},
    fratura_radio_distal_reabilitacao:{essencial:['Consolidação/restrições, edema, ADM e preensão'],complementar:['Função e sinais de neuropatia/CRPS'],evitar:['Carga incompatível com estabilidade/fase']},
    pos_operatorio_tendao_mao:{essencial:['Tendão/zona, técnica, protocolo e integridade'],complementar:['Edema, ADM e deslizamento permitido'],evitar:['Progressão fora do protocolo']},
    punho_crps:{essencial:['Dor, sensibilidade, edema, cor/temperatura, sudorese e função'],complementar:['Critérios clínicos padronizados'],evitar:['Rotular por dor pós-fratura isolada']},
    punho_sobrecarga_tendinea:{essencial:['Localização, contração resistida e tolerância à carga'],complementar:['ADM, força e função comparativa'],evitar:['Nomear tendão específico sem achados concordantes']}
  };

  function textoContexto(c){return [hma(),c?.origemIrradiacao,c?.irradiacao,c?.textoComorbidades,c?.textoMedicamentos,c?.textoCirurgias,...arr(c?.comorbidades),...arr(c?.medicamentos),...arr(c?.cirurgias).map(x=>typeof x==='string'?x:(x?.texto||x?.nome||''))].filter(Boolean).join(' ');}
  function negado(t,padrao){return new RegExp('(?:sem|nega(?:do|ou)?|nao(?:\\s+(?:houve|tem|tenho|teve|tive|sinto|sente|esta|estou|ficou|e))?|nem)\\s*.{0,38}(?:'+padrao+')').test(t);}
  function hit(t,lista){return arr(lista).filter(x=>t.includes(n(x)));}

  function pontuar(cond,texto,c){
    const t=n(texto);let hits=hit(t,cond.termos);let score=Math.min(2.4,hits.length*1.2);const add=(v,m)=>{score+=v;if(m)hits.push(m);};
    const trauma=/\b(cai|caiu|cair|queda|trauma|impacto|pancada|acidente|luxou|luxacao)\b/.test(t)&&!negado(t,'queda|trauma|impacto|pancada|cai');
    const febre=/\b(febre|calafrio|calafrios)\b/.test(t)&&!negado(t,'febre|calafrio');
    const inflam=[/vermelh|rubor/.test(t)&&!negado(t,'vermelh|rubor'),/quente|calor/.test(t)&&!negado(t,'quente|calor'),/inch|edema/.test(t)].filter(Boolean).length;
    const parestesiaMedianaNegada=/(?:sem|nao\s+(?:tenho|tem|sinto|sente)|nem)\s*(?:formig\w*|dorm\w*|adormec\w*).{0,70}(?:polegar|indicador|medio)|(?:polegar|indicador|medio).{0,38}(?:nao\s+(?:formig\w*|dorm\w*|adormec\w*)|sem\s+(?:formig\w*|dorm\w*|adormec\w*))/.test(t);
    const parestesiaUlnarNegada=/(?:sem|nao(?:\s+(?:tenho|tem|sinto|sente))?|nem).{0,55}(?:formig|dormen|adormec).{0,70}(?:anelar|mindinho|quarto|quinto|4o|5o)|(?:sem|nao(?:\s+(?:tenho|tem|sinto|sente))?).{0,70}(?:anelar|mindinho|quarto|quinto|4o|5o).{0,45}(?:formig|dormen|adormec)/.test(t);
    const parestesiaMediana=/(?:formig|dorme|dormenc|adormec)/.test(t);
    const mediano=/(polegar.{0,35}(indicador|medio)|(indicador|medio).{0,35}polegar)/.test(t)&&parestesiaMediana&&!parestesiaMedianaNegada;
    const ulnar=/(anelar|mindinho|quarto|quinto|4o|5o).{0,45}(formig|dormen|adormec)|(formig|dormen|adormec).{0,45}(anelar|mindinho|quarto|quinto|4o|5o)/.test(t)&&!parestesiaUlnarNegada;
    const cotovelo=/(cotovelo).{0,45}(dobrad|flex|apoi)|(dobrad|flex|apoi).{0,45}cotovelo/.test(t);
    const cervical=/(pescoco|cervical).{0,70}(mao|dedo|formig|dormen)|(mao|dedo|formig|dormen).{0,70}(pescoco|cervical)/.test(t);
    const radial=/(radial|estiloide radial|lado do polegar|perto do polegar)/.test(t);
    const basePolegar=/base do polegar/.test(t);
    const noturno=/(?:noite|noturn|acord).{0,50}(?:formig|dormen|mao|dedo)|(?:formig|dormen).{0,50}(?:noite|noturn|acord)/.test(t);
    const antebracoVolar=/(?:frente|volar|anterior).{0,30}antebraco|antebraco.{0,30}(?:frente|volar|anterior)/.test(t);
    const pronacaoProvoca=/(?:pron|virar a palma).{0,35}(?:forca|resist|piora|dor|reproduz)|(?:piora|dor|reproduz).{0,35}(?:pron|virar a palma)/.test(t);
    const medianoProximal=mediano&&antebracoVolar&&pronacaoProvoca;
    const radialProximal=/(?:dorso radial|dorsoradial).{0,45}(?:antebraco|acima do punho)|(?:antebraco).{0,45}(?:dorso radial|dorsoradial|acima do punho)/.test(t);
    const crepitacaoRadial=/crepit|rangendo|raspando/.test(t);
    const ulnarDor=/(?:dor ulnar|lado ulnar|regiao ulnar|lado do mindinho).{0,35}punho|punho.{0,35}(?:ulnar|lado ulnar|regiao ulnar|lado do mindinho)/.test(t);
    const ulnarDorsal=/(?:dorso|dorsal).{0,35}(?:ulnar|lado do mindinho).{0,35}punho|punho.{0,35}(?:dorso|dorsal).{0,35}(?:ulnar|lado do mindinho)/.test(t);
    const estaloTendineo=/(?:estalo|clique|pula|salta|sublux).{0,35}tendao|tendao.{0,35}(?:estalo|clique|pula|salta|sublux)/.test(t)&&!negado(t,'estalo|clique');
    const rotCarga=/(girar|giro|chave|macaneta|apoiar|apoio|peso|pronacao|supinacao)/.test(t);
    const dorso=/dor.{0,25}(dorso|dorsal).{0,25}punho|punho.{0,25}(dorso|dorsal)/.test(t);
    const clique=/(clique|estalo|clunk|instabil)/.test(t)&&!negado(t,'clique|estalo');
    const labelOnly=/(medico|doutor|laudo|exame).{0,35}(falou|disse|mostrou|deu).{0,35}(tunel do carpo|tfcc|tendinite|de quervain)/.test(t)&&!/(formig|dormen|radial|ulnar|tabaqueira|base do polegar|trauma|queda|noite|dirig|carga|movimento)/.test(t.replace(/tunel do carpo|tfcc|tendinite|de quervain/g,''));
    const historiaRemotaResolvida=/(?:ha\s+)?\d+\s+anos?\b|anos?\s+atras/.test(t)&&/(?:alta|sem sequela|recuperei|recuperou|fiquei\s+(?:bem|bom)|resolvido)/.test(t);
    const vascularNegado=negado(t,'fria|frio|palida|palido|roxa|azulada|cianose|sem pulso|perdeu o pulso');
    const compartimentalNegado=negado(t,'tenso|dura|desproporcional|insuportavel')||/(?:esticar|alongar).{0,25}dedos.{0,30}(?:nao piora|nao doi|sem dor)/.test(t);
    const crpsNegado=negado(t,'desproporcional|alodinia|doi ate ao toque|dor ate ao toque')&&negado(t,'muda de cor|temperatura|sua|sudorese|edema');

    if(cond.id==='punho_infeccao'){if(febre&&inflam>=1)add(5.6,'febre + inflamação local');if(/corte|ferida|mordida|pus|secrecao/.test(t)&&inflam>=1)add(2.4,'porta de entrada + inflamação');if(negado(t,'febre')&&inflam<2)score-=4;}
    const estiramentoPassivoPositivo=/(?:esticar os dedos|alongamento passivo).{0,30}(?:doi|doeu|piora|piorou|aumenta a dor)|(?:doi|doeu|piora|piorou|aumenta a dor).{0,30}(?:esticar os dedos|alongamento passivo)/.test(t)&&!/(?:esticar os dedos|alongamento passivo).{0,30}(?:nao doi|nao piora|sem dor)/.test(t);
    const compartimentalPositivo=/(?:tenso|dura|desproporcional|insuportavel)/.test(t)&&!compartimentalNegado||estiramentoPassivoPositivo;
    if(cond.id==='punho_compartimental'&&trauma&&compartimentalPositivo)add(5.7,'trauma + padrão compartimental');
    if(cond.id==='punho_vascular_agudo'&&(/\b(fria|frio|palida|palido|roxa|azulada|cianose)\b/.test(t)||/sem pulso|perdeu o pulso/.test(t))&&!vascularNegado)add(6,'alteração vascular distal');
    if(cond.id==='punho_trauma_maior'&&trauma&&/(deform|nao consigo|nao consegue|incapac|luxou|luxacao)/.test(t))add(5,'trauma + perda estrutural/funcional');
    if(cond.id==='punho_escafoide'){if(trauma&&/(tabaqueira|escafoide)/.test(t))add(6,'trauma + dor em escafoide');else if(trauma&&radial)add(2.2,'trauma + dor radial');if(!trauma)score-=4;}
    if(cond.id==='fratura_radio_distal_reabilitacao'&&!historiaRemotaResolvida&&/(fratura|quebrei|quebrou|gesso|placa).{0,45}(punho|radio)|(punho|radio).{0,45}(fratura|gesso|placa)/.test(t))add(4.2,'fratura de punho/rádio distal');
    if(cond.id==='punho_mediano_proximal'){if(medianoProximal)add(5.7,'distribuição mediana + provocação proximal');if(noturno&&/sacud/.test(t))score-=2.5;}
    if(cond.id==='tunel_carpo'){if(mediano)add(4.8,'distribuição mediana');if(mediano&&/(noite|noturn|dirig|celular|sacud)/.test(t))add(1.5,'comportamento típico');if(labelOnly)score=-5;if(ulnar&&!mediano)score-=3;if(cervical||medianoProximal)score-=5;}
    if(cond.id==='punho_ulnar_guyon'){if(ulnar&&!cotovelo&&!cervical)add(4.1,'distribuição ulnar distal');if(ulnar&&/(palma|guidao|hipotenar)/.test(t))add(1.8,'compressão palmar');if(cotovelo||cervical)score-=5;}
    if(cond.id==='radiculopatia_neuropatia_proximal'){if(cervical)add(5.5,'modulação cervical');if(ulnar&&cotovelo)add(5,'ulnar + provocação no cotovelo');}
    if(cond.id==='punho_intersecao'){if(radialProximal&&crepitacaoRadial&&/(extens|repet|remo|treino|trabalho)/.test(t))add(5.7,'dor dorsoradial proximal + crepitação/carga repetitiva');else if(radialProximal&&/(extens|repet)/.test(t))add(4.4,'dor dorsoradial proximal + extensão repetitiva');}
    if(cond.id==='dequervain'){if(radial&&/(polegar|bebe|abrir pote|potes)/.test(t)&&!trauma&&!radialProximal)add(4.8,'dor radial + carga do polegar');if(basePolegar&&!radial)score-=1.5;if(trauma)score-=2.5;if(radialProximal)score-=4;}
    if(cond.id==='punho_ecu'){if(ulnarDorsal&&estaloTendineo&&rotCarga)add(5.9,'dor dorsal-ulnar + instabilidade tendínea dinâmica');}
    if(cond.id==='tfcc'){if(ulnarDor&&rotCarga&&!ulnar)add(5,'dor ulnar + rotação/carga');if(ulnar)score-=3;if(ulnarDorsal&&estaloTendineo)score-=4;}
    if(cond.id==='instabilidade_escafolunar'){if(trauma&&dorso&&clique)add(5.4,'trauma + dor dorsal + clique');else if(trauma&&dorso)add(2.6,'trauma + dor dorsal');if(!trauma)score-=2.5;}
    if(cond.id==='rizartrose'){if(basePolegar&&/(pinca|abrir pote|potes|crepit)/.test(t))add(4.6,'base do polegar + pinça/preensão');if(Number(c?.idade)>=50&&basePolegar)add(.6,'faixa etária compatível');}
    if(cond.id==='punho_sobrecarga_tendinea'){if(!trauma&&!mediano&&!ulnar&&!febre&&/(punho).{0,60}(estender|flexionar|peso|musculacao|computador|repet)|(musculacao|computador|repet).{0,60}punho/.test(t))add(4,'sobrecarga mecânica sem trauma/neuro');if(radial)score-=1.5;if(ulnarDor)score-=5;}
    if(cond.id==='pos_operatorio_tendao_mao'&&!historiaRemotaResolvida&&/(cirurgia|reparo|sutura|pos operatorio).{0,55}(tendao|flexor|extensor)|(tendao|flexor|extensor).{0,55}(cirurgia|reparo|sutura)/.test(t))add(5.5,'pós-reparo tendíneo');
    const crpsDor=/(desproporcional|alodinia|doi ate ao toque|dor ate ao toque)/.test(t)&&!negado(t,'desproporcional|alodinia|doi ate ao toque|dor ate ao toque');
    const crpsAutonomico=/(muda de cor|temperatura|sua|sudorese|edema)/.test(t)&&!negado(t,'muda de cor|temperatura|sua|sudorese|edema');
    if(cond.id==='punho_crps'&&crpsDor&&crpsAutonomico)add(5.5,'dor desproporcional + alteração autonômica');
    if(cond.id==='tunel_carpo'&&parestesiaMedianaNegada){score=-5;hits=[];}
    if(cond.id==='punho_ulnar_guyon'&&parestesiaUlnarNegada){score=-5;hits=[];}
    if(cond.id==='punho_vascular_agudo'&&vascularNegado){score=-5;hits=[];}
    if(cond.id==='punho_compartimental'&&compartimentalNegado&&!compartimentalPositivo){score=-5;hits=[];}
    if(cond.id==='punho_crps'&&crpsNegado){score=-5;hits=[];}
    if((cond.id==='fratura_radio_distal_reabilitacao'||cond.id==='pos_operatorio_tendao_mao')&&historiaRemotaResolvida){score=-5;hits=[];}
    return {score:score+cond.ordem/1000,hits:uniq(hits).slice(0,6)};
  }

  function itemBanco(cond){
    if(!cond.bancoId)return null;if(cacheBanco.has(cond.id))return cacheBanco.get(cond.id);
    const item=[...arr(banco()?.clusters),...arr(banco()?.diferenciais)].find(x=>x?.id===cond.bancoId)||null;cacheBanco.set(cond.id,item);return item;
  }
  const textoTeste=t=>typeof t==='string'?t:String(t?.nome||t?.teste||t?.titulo||t?.descricao||'').trim();
  function hipotese(cond,p){
    const item=itemBanco(cond), matriz=MATRIZ_EXAME[cond.id]||{essencial:[],complementar:[],evitar:[]}, testes=arr(item?.testes).map(textoTeste).filter(Boolean);
    return {id:item?.id||cond.id,regiaoId:'punho_mao',regiaoNome:'Punho e Mão',grupo:item?.regraConfirmacao||item?.limiar?'cluster':'diferencial',nome:item?.nome||cond.rotulo,prioridadeOrdenacao:Number((p.score+2).toFixed(2)),aFavor:p.hits.length?p.hits.map(x=>`Relato: ${x}`):['Depende de perguntas discriminativas'],contra:[],aConfirmar:uniq([...cond.perguntas,...matriz.essencial,...cond.objetivos]).slice(0,7),testes,regraConfirmacao:item?.regraConfirmacao?.descricao||item?.regraConfirmacao||'',interpretacao:String(item?.interpretacao||''),evidencia:String(item?.evidencia||''),origemHMA:p.hits.length>0,item:item||{id:cond.id,nome:cond.rotulo,testes},motor31:{condicaoId:cond.id,perguntas:cond.perguntas.slice(),objetivos:cond.objetivos.slice(),frasesReconhecidas:p.hits,urgente:!!cond.urgente,reforca:cond.reforca,enfraquece:cond.enfraquece,matrizExame:matriz}};
  }
  function uniqObj(xs){const m=new Map();arr(xs).forEach(x=>{const k=n(`${x?.titulo||''}|${x?.descricao||''}`);if(k&&!m.has(k))m.set(k,x);});return [...m.values()];}
  function tipoObjetivo(t=''){const s=n(t);if(/cervical|neuro|sensitiv|motor|mediano|ulnar|reflex/.test(s))return'neurologica';if(/adm|mobilidade|flexao|extensao|pronacao|supinacao/.test(s))return'mobilidade';if(/forca|carga|preensao|pinca|tolerancia/.test(s))return'forca_carga';if(/funcao|destreza|tarefa/.test(s))return'funcional';if(/inspec|palpa|edema|ferida|cor|temperatura|pulso|perfusao/.test(s))return'inspecao';return'ortopedico';}
  const ROT={neurologica:'Exame neurológico / proximal',mobilidade:'Mobilidade e ADM',forca_carga:'Força e tolerância à carga',funcional:'Função e destreza',inspecao:'Inspeção / palpação / neurovascular',ortopedico:'Testes e diferenciação clínica'};
  function agrupar(itens){const g={};arr(itens).forEach(x=>(g[x.tipo]||(g[x.tipo]=[])).push(x));return Object.entries(g).map(([tipo,x])=>({tipo,titulo:ROT[tipo]||tipo,itens:x}));}

  function planoPunhoMaoEspecialista(plano){
    if(!plano||plano.insuficiente)return plano;
    const t=n(hma()),tem=arr(plano.regioes).some(r=>r.id==='punho_mao')||/(punho|mao|dedo|polegar|carpo|escafoide|tabaqueira|cmc|tfcc|guyon)/.test(t);if(!tem)return plano;
    const c=contexto(),texto=textoContexto(c),fortes=CONDICOES.map(cond=>({cond,...pontuar(cond,texto,c)})).sort((a,b)=>b.score-a.score).filter(x=>x.score>=2).slice(0,8);
    const especialistas=fortes.map(x=>hipotese(x.cond,x)), existentes=arr(plano.hipoteses).filter(h=>h.regiaoId!=='punho_mao'), base=arr(plano.hipoteses).filter(h=>h.regiaoId==='punho_mao'), mapa=new Map();
    [...especialistas,...base].forEach(h=>{const k=h.motor31?.condicaoId||h.id||n(h.nome);if(!mapa.has(k))mapa.set(k,h);else if(h.motor31)mapa.set(k,{...mapa.get(k),...h});});
    const finais=[...mapa.values()].sort((a,b)=>Number(b.prioridadeOrdenacao||0)-Number(a.prioridadeOrdenacao||0)).slice(0,8);plano.hipoteses=[...finais,...existentes].sort((a,b)=>Number(b.prioridadeOrdenacao||0)-Number(a.prioridadeOrdenacao||0));
    const temCotovelo=arr(plano.regioes).some(r=>r.id==='cotovelo')||/cotovelo|tunel cubital/.test(t),temCervical=/pescoco|cervical|braco|ombro/.test(t),correlacao=(temCotovelo||temCervical)&&/(mao|punho|dedo|formig|dormen)/.test(t);
    const perguntas=uniq([...BASE_PERGUNTAS,...fortes.flatMap(x=>x.cond.perguntas)]).slice(0,18), objetivos=uniq(fortes.flatMap(x=>x.cond.objetivos)).slice(0,20), seguranca=fortes.filter(x=>x.cond.urgente).map(x=>({titulo:x.cond.rotulo,descricao:`Padrão histórico que merece exclusão prioritária. Pergunte: ${x.cond.perguntas[0]}`}));
    plano.exame.seguranca=uniqObj([...(plano.exame.seguranca||[]),...seguranca]);plano.exame.perguntasDirigidasPunhoMao=perguntas;plano.exame.objetivosPunhoMao=objetivos;
    plano.exame.familiasPunhoMao=fortes.map(x=>({id:x.cond.id,nome:x.cond.rotulo,frases:x.hits,perguntas:x.cond.perguntas,objetivos:x.cond.objetivos,urgente:!!x.cond.urgente,matrizExame:MATRIZ_EXAME[x.cond.id]||{essencial:[],complementar:[],evitar:[]}}));plano.exame.matrizPunhoMao=plano.exame.familiasPunhoMao.map(x=>({id:x.id,nome:x.nome,...x.matrizExame}));
    plano.exame.correlacaoProximalPunhoMao={ativa:correlacao,principio:'Sintomas no punho/mão podem decorrer de estrutura local, neuropatia distal, compressão mais proximal no cotovelo ou origem cervical. Compare distribuição, provocação local e modulação proximal antes de atribuir a origem.',perguntas:[BASE_PERGUNTAS[2],BASE_PERGUNTAS[4],BASE_PERGUNTAS[10]],criterios:['distribuição sensitiva/motora','provocação local','modulação por cervical/cotovelo','estado neurovascular distal']};
    const motor={versao:VERSION,regiao:'punho_mao',frasesReconhecidas:uniq(fortes.flatMap(x=>x.hits)),perguntas,condicoes:plano.exame.familiasPunhoMao,correlacaoProximalPunhoMao:plano.exame.correlacaoProximalPunhoMao,aviso:'Prioridade de investigação; dor ou parestesia na mão não confirma origem local, e rótulo relatado não substitui história + exame.'};plano.motores31={...(plano.motores31||{}),punho_mao:motor};if(!plano.motor31)plano.motor31=motor;
    const itens=uniq([...fortes.flatMap(x=>arr(MATRIZ_EXAME[x.cond.id]?.essencial)),...objetivos,...fortes.flatMap(x=>arr(MATRIZ_EXAME[x.cond.id]?.complementar))]).slice(0,11).map((texto,i)=>({texto,tipo:tipoObjetivo(texto),hipoteses:fortes.slice(0,3).map(x=>x.cond.rotulo),prioridade:11.4-i/100,motor31:true,regiaoMotor31:'punho_mao'})), tm=new Map();
    [...itens,...arr(plano.exame.testesPrioritarios)].forEach(x=>{const k=n(x.texto);if(k&&!tm.has(k))tm.set(k,x);});plano.exame.testesPrioritarios=[...tm.values()].slice(0,(temCotovelo||temCervical)?20:15);plano.exame.analises=agrupar(plano.exame.testesPrioritarios);plano.lacunas=uniq([...arr(plano.lacunas),...perguntas.slice(0,6).map(q=>`Punho/Mão: ${q}`)]).slice(0,18);return plano;
  }

  const esc=(v='')=>String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;');
  function render(plano){
    const host=document.getElementById('ks31_wrist_interview');if(!host)return;const m=plano?.motores31?.punho_mao||(plano?.motor31?.regiao==='punho_mao'?plano.motor31:null);if(!m){host.hidden=true;host.innerHTML='';return;}host.hidden=false;const matriz=arr(plano?.exame?.matrizPunhoMao).slice(0,6),cross=m.correlacaoProximalPunhoMao,sig=JSON.stringify({v:VERSION,c:m.condicoes.map(x=>x.id),f:m.frasesReconhecidas,p:m.perguntas.slice(0,10),mx:matriz.map(x=>x.id),x:!!cross?.ativa});if(host.dataset.ks31Signature===sig)return;host.dataset.ks31Signature=sig;
    host.innerHTML=`<header><div><span>Motor 3.1 · Punho e Mão</span><strong>Diferenciar trauma, fonte local, neuropatia distal e origem proximal</strong></div><small>${m.condicoes.length} família(s) em investigação</small></header>${cross?.ativa?`<div class="ks31-cross-region"><strong>Integração proximal ↔ punho/mão</strong><p>${esc(cross.principio)}</p></div>`:''}<div class="ks31-question-grid">${m.perguntas.slice(0,10).map((q,i)=>`<div><b>${i+1}</b><span>${esc(q)}</span></div>`).join('')}</div>${matriz.length?`<div class="ks31-exam-matrix"><strong>Exame por finalidade</strong>${matriz.map(x=>`<details><summary>${esc(x.nome)}</summary><div><b>Essencial</b>${arr(x.essencial).map(v=>`<p>${esc(v)}</p>`).join('')}<b>Complementar</b>${arr(x.complementar).map(v=>`<p>${esc(v)}</p>`).join('')}${arr(x.evitar).length?`<b>Cautela</b>${arr(x.evitar).map(v=>`<p>${esc(v)}</p>`).join('')}`:''}</div></details>`).join('')}</div>`:''}<footer>A localização do sintoma não define sozinha a origem. Segurança primeiro; depois compare carga local, distribuição neural e modulação por cotovelo/cervical.</footer>`;
  }
  function garantirUI(){const etapa=document.getElementById('subtela_mapeamento');if(etapa&&!document.getElementById('ks31_wrist_interview')){const el=document.createElement('section');el.id='ks31_wrist_interview';el.className='ks31-wrist-interview';el.hidden=true;const c=document.getElementById('ks31_elbow_interview'),o=document.getElementById('ks31_shoulder_interview'),p=document.getElementById('ks30_exam_plan');if(c)c.insertAdjacentElement('afterend',el);else if(o)o.insertAdjacentElement('afterend',el);else if(p)p.insertAdjacentElement('afterend',el);else etapa.insertAdjacentElement('afterbegin',el);}}

  window.enriquecerPlanoPunhoMaoKineSys=planoPunhoMaoEspecialista;
  const anterior=window.enriquecerPlanoCotoveloKineSys;
  if(typeof anterior==='function'&&!anterior.__kinesysWristBridge){const ponte=function(plano){let p=anterior(plano)||plano;return planoPunhoMaoEspecialista(p)||p;};ponte.__kinesysWristBridge=true;ponte.__original=anterior;window.enriquecerPlanoCotoveloKineSys=ponte;}
  window.KineSysMotor31PunhoMao={version:VERSION,condicoes:CONDICOES,perguntasBase:BASE_PERGUNTAS,referencias:REFERENCIAS,enriquecer:planoPunhoMaoEspecialista};
  document.addEventListener('kinesys:motor3-plano-atualizado',()=>{garantirUI();const p=window.KineSysMotorClinico3?.ultimoPlano;if(p)render(p);});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',garantirUI,{once:true});else garantirUI();
})();
