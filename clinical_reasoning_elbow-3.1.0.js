/* ============================================================================
   KineSys — Motor Clínico 3.1 | Cotovelo
   Piloto regional: linguagem do paciente -> diferenciais locais/proximais ->
   perguntas discriminativas -> objetivos de exame.

   Segurança:
   - dor percebida no cotovelo pode ser local, referida do ombro ou neural/cervical;
   - "bursite do ombro" relatada pelo paciente não é convertida em diagnóstico;
   - testes especiais são interpretados no conjunto da história + exame;
   - trauma, infecção e déficits neurológicos/vasculares têm prioridade.
   ============================================================================ */
(function instalarMotor31Cotovelo(){
  'use strict';

  const VERSION='3.1.3-elbow4';
  const normBase=(v='')=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').replace(/\s+/g,' ').trim();
  const norm=(v='')=>normBase(v)
    .replace(/\bcotuvelo\b/g,'cotovelo')
    .replace(/\bpra\b/g,'para')
    .replace(/\s+/g,' ').trim();
  const arr=v=>Array.isArray(v)?v:[];
  const uniq=v=>Array.from(new Set(arr(v).filter(Boolean)));
  const hmaTexto=()=>String(document.getElementById('paciente_hma')?.value||'');
  const contexto=()=>{try{return typeof coletarContextoClinico==='function'?(coletarContextoClinico()||{}):{};}catch(_){return{};}};
  const contem=(texto,termos)=>{const t=norm(texto);return arr(termos).filter(x=>t.includes(norm(x)));};
  const ITEM_BANCO_CACHE=new Map();

  const REFERENCIAS=[
    {pmid:'36453071',ano:2022,titulo:'Lateral Elbow Pain and Muscle Function Impairments',uso:'diretriz clínica para avaliação, diferenciais, testes/medidas e manejo da dor lateral do cotovelo'},
    {pmid:'39180299',ano:2024,titulo:'Physiotherapy practices in the clinical assessment of lateral elbow tendinopathy',uso:'reforça avaliação de força, membro superior, cervical e sistema neurológico'},
    {pmid:'42437185',ano:2026,titulo:'Inadequate cervicothoracic assessment is nearly universal for screening participants with lateral elbow tendinopathy',uso:'reforça necessidade de rastrear origem cervicotorácica/proximal em dor lateral do cotovelo'}
  ];

  const BASE_PERGUNTAS=[
    'Onde exatamente está a dor: lado de fora, lado de dentro, frente/fossa cubital, ponta do olécrano ou dor difusa no antebraço?',
    'A dor começou no cotovelo ou começou no ombro/pescoço e desceu pelo braço até o cotovelo?',
    'Elevar, sustentar peso ou movimentar o ombro reproduz a mesma dor sentida no braço/cotovelo mesmo sem exigir o punho?',
    'Apertar a mão, segurar xícara/sacola, usar mouse/ferramenta ou estender o punho contra resistência reproduz a dor lateral?',
    'Flexionar o punho, pronar, puxar ou apertar reproduz dor na parte medial do cotovelo?',
    'Há formigamento, dormência ou choque no quarto/quinto dedos, na mão ou no antebraço? Piora com o cotovelo dobrado ou apoiado?',
    'A dor ultrapassa o cotovelo e chega à mão/dedos? Movimentos do pescoço modificam os sintomas?',
    'Houve queda, puxão forte, estalo, hematoma, deformidade, luxação ou perda súbita de força para dobrar o cotovelo/supinar?',
    'Existe inchaço visível, calor, vermelhidão, ferida ou febre junto com a dor no cotovelo?',
    'Há travamento verdadeiro, bloqueio, estalo intra-articular, rigidez importante ou perda de extensão?',
    'Pratica arremesso, tênis, musculação, trabalho manual repetitivo ou atividade com grande carga de preensão/pronação-supinação?',
    'O sintoma melhora quando evita carga local do cotovelo, ou continua mesmo sem usar o cotovelo/punho?'
  ];

  const CONDICOES=[
    {id:'cotovelo_infeccao_articular',ordem:110,urgente:true,nomes:[/artrite septica|infecc.*cotovelo|bursite septica/],rotulo:'Infecção articular/bursal do cotovelo — excluir prioritariamente',termos:['cotovelo quente vermelho e inchado','cotovelo vermelho inchado com febre','febre e cotovelo inchado','ferida no cotovelo com inchaço','pus no cotovelo','bursite infectada no cotovelo'],perguntas:['Há febre, calafrios ou mal-estar associados ao inchaço/calor local?','Existe ferida, punção, cirurgia recente, imunossupressão ou infecção próxima?','A mobilidade está muito limitada por dor mesmo sem carga?'],objetivos:['Inspeção de calor, rubor, edema e integridade cutânea','Sinais vitais e estado sistêmico quando indicado','Evitar testes provocativos vigorosos e definir encaminhamento médico prioritário'],reforca:['calor/rubor','febre','ferida','dor intensa não mecânica'],enfraquece:['quadro mecânico estável sem sinais sistêmicos']},
    {id:'cotovelo_trauma_maior',ordem:106,urgente:true,nomes:[/fratura.*cotovelo|luxacao.*cotovelo|trauma.*cotovelo/],rotulo:'Trauma importante / fratura-luxação do cotovelo — excluir',termos:['caiu em cima do cotovelo','caiu sobre a mao e machucou o cotovelo','cotovelo saiu do lugar','cotovelo deformado','nao consegue mexer depois da queda','trauma forte no cotovelo','pancada forte no cotovelo'],perguntas:['Qual foi o mecanismo e a posição do braço no trauma?','Há deformidade, edema rápido, incapacidade funcional importante ou dor óssea focal?','Existe dormência, alteração de pulso, cor/temperatura ou déficit motor distal?'],objetivos:['Inspeção e palpação cautelosa de sinais traumáticos','Exame neurovascular distal','ADM ativa tolerada sem forçar testes especiais','Aplicar critério de encaminhamento/imagem conforme contexto'],reforca:['trauma','deformidade','incapacidade aguda'],enfraquece:['início insidioso sem trauma']},
    {id:'cotovelo_ruptura_biceps_distal',ordem:102,urgente:true,nomes:[/ruptura.*biceps distal/],rotulo:'Ruptura aguda do bíceps distal — excluir/encaminhar precocemente',termos:['estalo na frente do cotovelo','hematoma na frente do cotovelo','biceps subiu depois do estalo','perdeu força para supinar depois do estalo','perdeu força para virar a palma para cima','rasgou o biceps no cotovelo'],perguntas:['Houve estalo súbito sob carga seguido de equimose ou mudança do contorno do bíceps?','A perda de força de supinação é marcante e nova?','Quando ocorreu o evento e houve avaliação ortopédica?'],objetivos:['Inspeção de equimose/alteração do contorno','Força de supinação e flexão com cautela','Hook test quando apropriado','Encaminhamento ortopédico precoce quando ruptura aguda for plausível'],reforca:['estalo sob carga','equimose','perda aguda de supinação'],enfraquece:['dor insidiosa sem perda objetiva de força']},
    {id:'cotovelo_cervical_neural',ordem:98,nomes:[/cervical.*referid|radicul|cervicobraquial|origem cervical/],rotulo:'Origem cervical/neural referida ao cotovelo — excluir ou confirmar',termos:['dor vem do pescoco e chega no cotovelo','dor desce do pescoco pelo braco','dor passa do cotovelo e vai para a mao','formigamento no braco e mao','dedos dormentes com dor no cotovelo','choque ate a mao','mexer o pescoco muda a dor no cotovelo'],perguntas:['A dor ultrapassa o cotovelo e chega à mão ou a dedos específicos?','Há parestesia, dormência, choque ou perda de força distal?','Rotação, extensão ou inclinação cervical modifica a dor familiar?','A carga local do cotovelo/punho consegue reproduzir a queixa independentemente do pescoço?'],objetivos:['Screening cervical antes de atribuir a dor a tecido local','Dermátomos, miótomos e reflexos quando indicado','Neurodinâmica conforme distribuição','Comparar reprodução do sintoma por cervical versus carga local do cotovelo'],reforca:['sintoma além do cotovelo','parestesia','modulação cervical'],enfraquece:['dor focal consistentemente reproduzida por carga local']},
    {id:'cotovelo_ombro_referida',ordem:96,nomes:[/dor referida.*ombro|origem proximal.*ombro|manguito.*referid/],rotulo:'Dor referida/irradiada de origem proximal no ombro — investigar',termos:['dor comeca no ombro e vai ate o cotovelo','dor do ombro desce ate o cotovelo','dor do ombro vai para o cotovelo','dor lateral do braco ate o cotovelo','bursite no ombro e dor no cotovelo','tendinite no ombro e dor no cotovelo','manguito e dor no cotovelo','levantar o braco da dor ate o cotovelo'],perguntas:['O sintoma começa no ombro/lateral do braço e termina próximo ao cotovelo, ou o cotovelo é o ponto inicial?','Elevação, abdução, rotação ou carga do ombro reproduz exatamente a dor percebida no braço/cotovelo?','Preensão, extensão/flexão do punho ou pronação-supinação reproduzem a dor independentemente do ombro?','Há sintomas que passam do cotovelo até mão/dedos ou modulação pelo pescoço?'],objetivos:['Mapear início e distribuição do sintoma no membro superior','Comparar provocação pelo ombro versus provocação por carga local do cotovelo/punho','ADM ativa/passiva e força do ombro quando o relato indicar origem proximal','Screening cervical/neural se houver sintomas distais ou modulação cervical'],reforca:['início no ombro','dor lateral do braço até cotovelo','reprodução por elevação/carga do ombro'],enfraquece:['dor focal no epicôndilo reproduzida por punho/preensão','parestesia distal dominante']},
    {id:'cotovelo_lateral',ordem:88,nomes:[/epicondilalgia lateral|epicondilite lateral|tendinopatia.*extensor/],rotulo:'Dor lateral do cotovelo / tendinopatia extensora — investigar',termos:['dor do lado de fora do cotovelo','dor lateral no cotovelo','cotovelo de tenista','doi para apertar a mao','doi para carregar sacola','doi para pegar xicara','doi para usar mouse','doi para estender o punho','epicondilo lateral dolorido'],perguntas:['A dor é focal no epicôndilo lateral/região extensora proximal?','Preensão ou extensão resistida do punho reproduz a dor familiar?','Há perda de força de preensão relacionada à dor?','Existe dor mais distal no túnel radial, sintomas neurais ou influência cervical?'],objetivos:['Localização/palpação da origem extensora como dado complementar','Preensão sem dor ou dinamometria comparativa quando disponível','Extensão de punho/dedos resistida e tolerância à carga','Diferenciar túnel radial e origem cervical/proximal'],reforca:['dor lateral focal','preensão dolorosa','carga extensora'],enfraquece:['parestesia distal','dor reproduzida primariamente pelo ombro/pescoço']},
    {id:'cotovelo_tunel_radial',ordem:86,nomes:[/tunel radial|interosseo posterior|nervo radial/],rotulo:'Síndrome do túnel radial / nervo interósseo posterior — investigar',termos:['dor no tunel radial','dor mais para baixo do epicondilo lateral','dor lateral no antebraco','doi para supinar','dor ao virar a palma para cima','fraqueza para estender os dedos','nervo radial no cotovelo'],perguntas:['A dor é mais distal que o epicôndilo lateral, sobre a massa extensora/supinador?','Supinação resistida reproduz a dor?','Existe fraqueza motora de extensão dos dedos/polegar sem perda sensitiva típica?','Os testes de carga extensora focal no epicôndilo reproduzem a mesma dor ou uma dor diferente?'],objetivos:['Localização do ponto doloroso relativo ao epicôndilo lateral','Supinação resistida','Exame motor do nervo interósseo posterior/radial','Neurodinâmica e screening cervical conforme contexto'],reforca:['dor distal ao epicôndilo','supinação dolorosa','déficit motor radial'],enfraquece:['dor estritamente focal no epicôndilo com preensão/extensão de punho']},
    {id:'cotovelo_medial',ordem:84,nomes:[/epicondilalgia medial|epicondilite medial|tendinopatia.*flexor|flexor pronador/],rotulo:'Dor medial do cotovelo / tendinopatia flexor-pronadora — investigar',termos:['dor do lado de dentro do cotovelo','dor medial no cotovelo','cotovelo de golfista','doi para flexionar o punho','doi para pronar','doi para apertar do lado de dentro','epicondilo medial dolorido'],perguntas:['A dor é focal sobre o epicôndilo medial/origem flexor-pronadora?','Flexão de punho ou pronação resistida reproduz a dor familiar?','Há parestesia no quarto/quinto dedos ou piora com flexão prolongada do cotovelo?','Há dor com valgo/arremesso que sugira ligamento colateral ulnar?'],objetivos:['Palpação/localização medial','Flexão de punho e pronação resistidas','Preensão e tolerância à carga','Diferenciar nervo ulnar e ligamento colateral ulnar'],reforca:['dor medial focal','carga flexor-pronadora'],enfraquece:['parestesia ulnar predominante','dor de valgo em arremesso']},
    {id:'cotovelo_ulnar',ordem:90,nomes:[/neuropatia ulnar.*cotovelo|tunel cubital|nervo ulnar/],rotulo:'Neuropatia ulnar no cotovelo / túnel cubital — investigar',termos:['quarto e quinto dedos formigam','dedo anelar e mindinho formigam','mindinho dormente','formiga quando dobra o cotovelo','formiga quando apoia o cotovelo','choque no nervo do cotovelo','tunel cubital'],perguntas:['O formigamento envolve quarto/quinto dedos e borda ulnar da mão?','Piora ao apoiar o cotovelo ou mantê-lo flexionado?','Há fraqueza de pinça, abertura dos dedos ou perda de destreza?','Há dor cervical ou sintomas proximais compatíveis com C8-T1?'],objetivos:['Sensibilidade em distribuição ulnar','Força dos intrínsecos e músculos ulnar-inervados relevantes','Flexão sustentada/compressão cubital e Tinel como provocação complementar','Screening cervical C8-T1 e diferenciação de Guyon quando indicado'],reforca:['parestesia 4º/5º dedos','flexão/apoio provocam','fraqueza intrínseca'],enfraquece:['dor medial sem sintomas neurais']},
    {id:'cotovelo_biceps_distal',ordem:82,nomes:[/biceps distal|bíceps distal/],rotulo:'Tendinopatia / lesão do bíceps distal — investigar',termos:['dor na frente do cotovelo','dor na fossa cubital','doi para supinar','doi para fazer rosca','doi para virar a palma para cima','dor no biceps perto do cotovelo'],perguntas:['A dor é focal na fossa cubital/tendão distal do bíceps?','Supinação resistida reproduz mais que flexão?','O início foi insidioso ou houve estalo/hematoma/perda súbita de força?'],objetivos:['Palpação do tendão distal como dado complementar','Supinação e flexão resistidas','Força comparativa quando seguro','Excluir ruptura aguda quando houver mecanismo/deficit compatíveis'],reforca:['dor anterior focal','carga em supinação/flexão'],enfraquece:['equimose e perda súbita importante sugerem ruptura']},
    {id:'cotovelo_olecrano',ordem:80,nomes:[/bursite olecraniana|olecrano/],rotulo:'Bursite olecraniana / dor posterior superficial — investigar',termos:['bola na ponta do cotovelo','inchaco na ponta do cotovelo','caroco no olecrano','doi para apoiar o cotovelo','bursite no cotovelo','cotovelo inchado atras'],perguntas:['Existe edema superficial claramente localizado sobre o olécrano?','Há história de apoio repetido, trauma direto ou pressão prolongada?','Há calor, rubor, ferida, febre ou dor intensa que levante suspeita de infecção?'],objetivos:['Inspeção do edema superficial e pele','Palpação cautelosa e mobilidade tolerada','Triagem de sinais infecciosos antes de tratar como quadro mecânico'],reforca:['edema superficial','apoio repetido'],enfraquece:['ausência de edema','dor profunda intra-articular']},
    {id:'cotovelo_ucl',ordem:79,nomes:[/ligamento colateral ulnar.*cotovelo|ligamento ulnar.*cotovelo|ucl/],rotulo:'Ligamento colateral ulnar / sobrecarga em valgo — investigar',termos:['dor medial ao arremessar','doi no cotovelo quando arremessa','dor no valgo do cotovelo','ligamento ulnar do cotovelo','estalo medial arremessando','pitcher elbow'],perguntas:['A dor surge durante aceleração/arremesso ou outra carga em valgo?','Houve estalo agudo, perda de velocidade/controle ou sensação de instabilidade?','Há sintomas do nervo ulnar associados?','Como estão mobilidade/força do ombro e controle da cadeia cinética do arremesso?'],objetivos:['História específica da fase do arremesso/carga em valgo','Valgus stress e moving valgus stress/milking quando apropriados','Avaliação do nervo ulnar','Avaliar ombro/escápula e cadeia cinética quando esporte overhead for relevante'],reforca:['arremesso','dor medial sob valgo','instabilidade'],enfraquece:['dor reproduzida apenas por flexão/pronação de punho']},
    {id:'cotovelo_triceps_posterior',ordem:72,nomes:[/triceps distal|tríceps distal|tendinopatia.*triceps/],rotulo:'Tríceps distal / dor posterior por carga — investigar',termos:['dor atras do cotovelo ao empurrar','doi no triceps perto do cotovelo','doi para estender o cotovelo contra peso','dor no cotovelo no supino','dor no cotovelo na flexao de braco'],perguntas:['A dor é posterior no tendão do tríceps, sem edema bursal superficial?','Extensão resistida/carga de empurrar reproduz a dor familiar?','Houve estalo, equimose ou perda súbita de extensão?'],objetivos:['Localização posterior tendínea versus bursal','Extensão resistida e função de empurrar','Força e integridade do mecanismo extensor quando houver trauma'],reforca:['carga de extensão','dor tendínea posterior'],enfraquece:['edema superficial do olécrano','travamento intra-articular']},
    {id:'cotovelo_articular',ordem:70,nomes:[/artrose.*cotovelo|osteoartrose.*cotovelo|corpo livre.*cotovelo/],rotulo:'Componente articular / rigidez ou bloqueio do cotovelo — investigar',termos:['cotovelo travando','cotovelo bloqueia','nao estica o cotovelo','cotovelo muito rigido','cotovelo range','crepitacao no cotovelo','corpo livre no cotovelo'],perguntas:['Existe perda persistente de extensão/flexão ou pronação-supinação?','O travamento é verdadeiro, impedindo o movimento, ou apenas doloroso?','Há crepitação profunda, derrame ou história de trauma/artrose?'],objetivos:['ADM ativa/passiva de flexão-extensão e pronação-supinação','Fim de movimento, rigidez e crepitação','Avaliar necessidade de imagem/encaminhamento se houver bloqueio verdadeiro ou perda progressiva'],reforca:['rigidez','bloqueio verdadeiro','crepitação profunda'],enfraquece:['ADM plena com dor exclusivamente tendínea sob carga']}
  ];

  const MATRIZ_EXAME={
    cotovelo_infeccao_articular:{essencial:['Inspeção de edema, calor, rubor e integridade cutânea','Sinais vitais/estado sistêmico quando indicado','Definir necessidade de avaliação médica prioritária'],complementar:['História de ferida, punção, cirurgia, imunossupressão ou infecção recente'],evitar:['Não realizar carga vigorosa, mobilização agressiva ou punção fora do escopo/condição apropriada diante de suspeita infecciosa']},
    cotovelo_trauma_maior:{essencial:['Inspeção de deformidade/edema','Exame neurovascular distal','ADM ativa tolerada sem forçar','Triagem para necessidade de imagem/encaminhamento'],complementar:['Palpação óssea dirigida conforme mecanismo'],evitar:['Não insistir em testes especiais provocativos diante de fratura/luxação plausível']},
    cotovelo_ruptura_biceps_distal:{essencial:['Inspeção de equimose e contorno do bíceps','Força de supinação/flexão com cautela','Hook test quando apropriado','Tempo desde a lesão e encaminhamento ortopédico'],complementar:['Imagem quando a decisão médica depender de confirmação/extensão'],evitar:['Não reduzir ruptura aguda a "tendinite" quando houver estalo, equimose e perda objetiva de força']},
    cotovelo_cervical_neural:{essencial:['Movimentos cervicais e reprodução do sintoma familiar','Dermátomos, miótomos e reflexos quando indicado','Comparar cervical/neurodinâmica com provocação local do cotovelo'],complementar:['Spurling/distração e neurodinâmica conforme hipótese'],evitar:['Não atribuir sintomas distais/parestésicos a epicondilalgia apenas porque existe dor no cotovelo']},
    cotovelo_ombro_referida:{essencial:['Mapear início e trajeto da dor ombro–braço–cotovelo','ADM ativa/passiva do ombro','Carga/força do ombro reproduzindo ou não a dor familiar','Carga local do cotovelo/punho para comparação'],complementar:['Screening cervical/neural se o sintoma ultrapassar o cotovelo ou houver parestesia','Comparar comportamento com elevação do braço versus preensão/punho'],evitar:['Não confirmar bursite, manguito ou outra estrutura do ombro apenas pela irradiação; usar o padrão completo da história e exame']},
    cotovelo_lateral:{essencial:['Localização lateral e origem extensora','Preensão sem dor/dinamometria comparativa quando disponível','Extensão de punho/dedos resistida e tolerância à carga','Screening cervical/neural e túnel radial conforme apresentação'],complementar:['Cozen, Mill ou Maudsley como testes de provocação dentro do conjunto clínico','PRTEE/DASH quando aplicável'],evitar:['Não usar Cozen, Mill, Maudsley ou palpação isoladamente como confirmação estrutural']},
    cotovelo_tunel_radial:{essencial:['Localização do sintoma distal ao epicôndilo lateral','Supinação resistida','Exame motor radial/PIN','Diferenciação de epicondilalgia lateral'],complementar:['Extensão resistida do terceiro dedo e neurodinâmica como dados complementares'],evitar:['Não interpretar um único teste provocativo como diagnóstico definitivo de túnel radial/PIN']},
    cotovelo_medial:{essencial:['Localização medial/origem flexor-pronadora','Flexão de punho resistida','Pronação resistida','Diferenciar nervo ulnar e UCL'],complementar:['Preensão/dinamometria e tolerância à carga funcional'],evitar:['Não usar dor à palpação ou um teste resistido isolado como confirmação de estrutura específica']},
    cotovelo_ulnar:{essencial:['Mapa sensitivo ulnar','Força intrínseca/destreza conforme déficit','Provocação com flexão/compressão cubital','Screening cervical C8-T1'],complementar:['Tinel no túnel cubital','Diferenciar compressão no canal de Guyon','Eletroneuromiografia/ultrassom quando clinicamente indicados'],evitar:['Não excluir neuropatia somente porque Tinel isolado é negativo']},
    cotovelo_biceps_distal:{essencial:['Localização na fossa cubital/tendão distal','Supinação resistida','Flexão resistida','Excluir padrão agudo de ruptura'],complementar:['Força objetiva de supinação/flexão quando seguro'],evitar:['Não provocar repetidamente carga máxima se houver suspeita de lesão aguda relevante']},
    cotovelo_olecrano:{essencial:['Inspeção de edema superficial sobre olécrano','Calor/rubor/ferida e sintomas sistêmicos','História de apoio/trauma local'],complementar:['ADM para diferenciar edema superficial de comprometimento articular'],evitar:['Não tratar automaticamente como bursite mecânica se houver sinais de infecção']},
    cotovelo_ucl:{essencial:['História de carga em valgo/arremesso','Valgus stress conforme tolerância','Moving valgus stress/milking quando apropriados','Nervo ulnar e cadeia cinética proximal'],complementar:['Avaliação específica do ombro/escápula e controle do arremesso','Imagem quando decisão esportiva/médica exigir'],evitar:['Não usar teste de valgo isolado para definir grau de lesão ligamentar']},
    cotovelo_triceps_posterior:{essencial:['Localização tendínea posterior versus bursa','Extensão resistida','Força do mecanismo extensor'],complementar:['Carga funcional de empurrar conforme tolerância'],evitar:['Não confundir edema superficial do olécrano com tendinopatia do tríceps']},
    cotovelo_articular:{essencial:['ADM ativa/passiva de flexão-extensão','Pronação-supinação','Fim de movimento, rigidez, crepitação e bloqueio verdadeiro'],complementar:['Imagem quando houver bloqueio verdadeiro, trauma ou perda progressiva de movimento'],evitar:['Não atribuir rigidez/bloqueio persistente a tendinopatia sem examinar componente articular']}
  };

  function textoContexto(c=contexto()){return [hmaTexto(),c?.origemIrradiacao||'',c?.irradiacao||'',c?.textoMedicamentos||'',c?.textoCirurgias||'',arr(c?.comorbidades).join(' '),c?.textoComorbidades||''].join(' ');}
  function pontuar(cond,texto){
    const t=norm(texto);let hits=contem(texto,cond.termos).slice(0,6);let score=Math.min(9,hits.length*1.35);
    const negado=(termo)=>new RegExp(`(?:(?:sem|nega|negou|nao tem|nao tenho|nao sente|nao sinto|nao apresenta|nao esta|nao ficou)\\s+(?:sinais?\\s+de\\s+)?|nem\\s+)${termo}`).test(t);
    const neuroNegado=/(?:sem|nao tenho|nao tem|nao sinto|nao sente|nega|negou).{0,55}(?:formig|dormen|adormec|amortec|choque)/.test(t);
    const neuroDistalRaw=/(?:formig|dormen|adormec|amortec|choque).{0,55}(?:mao|dedo|polegar|indicador|anelar|mindinho)|(?:mao|dedo|polegar|indicador|anelar|mindinho).{0,55}(?:formig|dormen|adormec|amortec|choque)/.test(t);
    const neuroDistal=neuroDistalRaw&&!neuroNegado;
    const cervicalNegada=/(?:mexer|virar|movimentar|olhar).{0,35}(?:pescoco|nuca).{0,35}(?:nao muda|nao altera|nao piora|nao reproduz|sem efeito)|(?:pescoco|nuca).{0,45}(?:nao muda|nao altera|sem efeito)/.test(t);
    const cervicalLigadaRaw=/(?:pescoco|nuca|cervic).{0,90}(?:braco|cotovelo|mao|dedo)|(?:mexer|virar|olhar).{0,35}(?:pescoco|cima).{0,90}(?:dor|braco|cotovelo|mao)/.test(t);
    const cervicalLigada=cervicalLigadaRaw&&!cervicalNegada;
    const origemCervicalPositiva=/(?:dor|sintoma).{0,20}(?:vem|sai|comeca).{0,25}(?:pescoco|nuca)|(?:vem|sai|comeca).{0,20}(?:do |da )?(?:pescoco|nuca)/.test(t);
    const distal=/(?:passa|ultrapassa|vai|chega).{0,35}(?:cotovelo).{0,55}(?:mao|dedo|polegar|indicador|anelar|mindinho)|(?:ate).{0,20}(?:mao|dedo|polegar|indicador|anelar|mindinho)/.test(t);
    const ombroNegado=/(?:ombro).{0,30}(?:nao doi|sem dor)|(?:nao doi|sem dor).{0,30}ombro/.test(t);
    const ombroRemoto=/(?:ombro).{0,35}(?:anos? atras|ha [0-9]+ anos?)|(?:anos? atras|ha [0-9]+ anos?).{0,35}ombro/.test(t);
    const relacaoOmbroDireta=/(?:ombro).{0,60}(?:desce|vai|corre|irrad).{0,55}(?:cotovelo|braco)|(?:comeca|vem|sai).{0,30}(?:do |da )?ombro.{0,80}(?:cotovelo|braco)|(?:levantar|elevar).{0,35}braco.{0,70}(?:cotovelo|dor)/.test(t);
    const ombroSintomatico=/(?:dor|doi|desconfort).{0,25}ombro|ombro.{0,25}(?:doi|dor|desconfort)/.test(t)&&!ombroNegado&&!ombroRemoto;
    const relacaoOmbro=relacaoOmbroDireta||ombroSintomatico;
    const lateralAnatomica=/(?:lateral|lado de fora|epicondilo lateral).{0,35}cotovelo|cotovelo.{0,35}(?:lateral|lado de fora|epicondilo lateral)/.test(t);
    const cargaExtensoraLocal=/(?:cotovelo).{0,85}(?:apert|preens|estend.{0,12}punho)|(?:apert|preens|estend.{0,12}punho).{0,85}cotovelo/.test(t);
    const localLateral=lateralAnatomica||cargaExtensoraLocal;
    const localMedial=/(?:medial|lado de dentro|epicondilo medial).{0,55}cotovelo|cotovelo.{0,55}(?:medial|lado de dentro)/.test(t);
    const digitosUlnaresRaw=/(?:quarto|quinto|4o|5o|anelar|mindinho).{0,55}(?:formig|dormen|adormec|amortec|choque)|(?:formig|dormen|adormec|amortec|choque).{0,55}(?:quarto|quinto|4o|5o|anelar|mindinho)/.test(t);
    const digitosUlnares=digitosUlnaresRaw&&!neuroNegado;
    const flexaoApoio=/(?:dobrad|flex|apoi).{0,45}(?:cotovelo)|cotovelo.{0,45}(?:dobrad|flex|apoi)/.test(t);
    const traumaMecanismo=/\b(?:cai|caiu|cair|queda|trauma|impacto|acidente|luxacao)\b|\bpancad\w*|saiu do lugar|deform/.test(t);
    const traumaNegado=/(?:sem|nega|negou|nao houve|nao teve).{0,24}(?:cair|queda|trauma|pancad|impacto|bateu)/.test(t);
    const trauma=traumaMecanismo&&!traumaNegado&&/cotovelo/.test(t);
    const incapacidadeTrauma=/(?:deform|nao consegue|nao mexe|incapac|edema rapido)/.test(t);
    const arremessoValgo=/(?:arremess|pitcher|valgo).{0,70}(?:cotovelo|medial)|(?:cotovelo|medial).{0,70}(?:arremess|valgo)/.test(t);
    const tricepsLocal=/(?:dor|doi).{0,25}(?:atras|posterior).{0,35}cotovelo|cotovelo.{0,35}(?:posterior|triceps)|triceps.{0,35}cotovelo/.test(t);
    const cargaExtensaoCotovelo=/(?:estend|extens).{0,20}cotovelo|cotovelo.{0,20}(?:estend|extens)|empurr|supino|flexao de braco/.test(t);
    const tricepsCarga=tricepsLocal&&cargaExtensaoCotovelo;
    const travaPositiva=/(?:trav|bloque)/.test(t)&&!/(?:nao|sem).{0,16}(?:trav|bloque)/.test(t);
    const rigidezPositiva=/rigid/.test(t)&&!/(?:nao esta|nao tenho|nao tem|sem).{0,18}rigid/.test(t);
    const crepitacaoPositiva=/(?:range|crepit)/.test(t)&&!/(?:nao|sem).{0,16}(?:range|crepit)/.test(t);
    const perdaExtensao=/(?:nao estic|perdeu.{0,25}extens|perda.{0,25}extens)/.test(t);
    const articular=/cotovelo/.test(t)&&(travaPositiva||rigidezPositiva||crepitacaoPositiva||perdaExtensao);
    const olecrano=/(?:bola|caroco|inch|edema).{0,60}(?:ponta|atras|olecrano|cotovelo)|(?:ponta|atras|olecrano).{0,60}(?:bola|caroco|inch|edema)/.test(t);
    const bicepsLocal=/(?:frente|fossa cubital|biceps).{0,55}cotovelo|cotovelo.{0,55}(?:frente|fossa cubital|biceps)/.test(t);
    const cargaSupinacao=/(?:supin|palma para cima|rosca)/.test(t);
    const estaloPositivo=/(?:estalo|rasgou)/.test(t)&&!negado('estalo');
    const hematomaPositivo=/(?:hematoma|equimose)/.test(t)&&!negado('hematoma')&&!negado('equimose');
    const perdaSupinacao=/(?:perdeu|perda|muita|grande).{0,35}(?:forca).{0,55}(?:supin|palma para cima)|(?:supin).{0,55}(?:perdeu|perda).{0,30}(?:forca)/.test(t);
    const sintomasSistemicosNegados=/(?:sem|nao tenho|nao tem|nao apresenta|nega|negou).{0,35}(?:febre|calafrio)/.test(t);
    const febrePositiva=/(?:febre|calafrio)/.test(t)&&!sintomasSistemicosNegados;
    const ruborPositivo=/(?:vermelh|rubor)/.test(t)&&!/(?:sem|nao esta|nao ficou|nao tem|nao apresenta).{0,20}(?:vermelh|rubor)/.test(t);
    const calorPositivo=/(?:quente|calor)/.test(t)&&!/(?:sem|nao esta|nao ficou|nao tem|nao apresenta).{0,20}(?:quente|calor)/.test(t);
    const edemaPositivo=/(?:inch|edema)/.test(t)&&!/(?:sem|nao esta|nao ficou|nao tem|nao apresenta).{0,20}(?:inch|edema)/.test(t);
    const sinaisInfeccao=[ruborPositivo,calorPositivo,edemaPositivo].filter(Boolean).length;
    const inflamacaoLocal=sinaisInfeccao>=3;

    if(cond.id==='cotovelo_cervical_neural'&&neuroNegado&&cervicalNegada&&!origemCervicalPositiva)return{score:-6,hits:[],bloqueada:true};
    if(cond.id==='cotovelo_ombro_referida'&&(ombroNegado||ombroRemoto)&&!relacaoOmbroDireta)return{score:-5,hits:[],bloqueada:true};

    if(cond.id==='cotovelo_ombro_referida'&&relacaoOmbroDireta){score+=2.8;hits.push('relação proximal ombro–braço/cotovelo');}
    else if(cond.id==='cotovelo_ombro_referida'&&ombroSintomatico&&/cotovelo/.test(t)){score+=3.6;hits.push('ombro sintomático coexistente com cotovelo');}
    if(cond.id==='cotovelo_ombro_referida'&&relacaoOmbroDireta&&/bursite.{0,35}ombro|ombro.{0,35}bursite|manguito|supraespinhal/.test(t))score+=1.2;
    if(cond.id==='cotovelo_ombro_referida'&&(distal||neuroDistal||cervicalLigada))score-=2.2;
    if(cond.id==='cotovelo_ombro_referida'&&localLateral&&/(apert|punho|preens|segur|carreg)/.test(t))score-=1.1;

    if(cond.id==='cotovelo_cervical_neural'){
      if(neuroDistal||distal)score+=3.2;
      if(cervicalLigada||origemCervicalPositiva)score+=2.4;
    }
    if(cond.id==='cotovelo_lateral'&&localLateral)score+=2.8;
    if(cond.id==='cotovelo_lateral'&&relacaoOmbroDireta&&/lateral do braco/.test(t)&&!cargaExtensoraLocal)score-=3.2;
    if(cond.id==='cotovelo_medial'&&localMedial)score+=2.8;
    if(cond.id==='cotovelo_ulnar'){
      if(digitosUlnares)score+=3.4;
      if(digitosUlnares&&flexaoApoio)score+=1.2;
      if(neuroNegado&&!digitosUlnares)score-=3;
    }
    if(cond.id==='cotovelo_ruptura_biceps_distal'){
      const marcadores=[estaloPositivo,hematomaPositivo,perdaSupinacao].filter(Boolean).length;
      if(marcadores>=2)score+=5.2;else if(marcadores===1&&bicepsLocal)score+=2.7;
    }
    if(cond.id==='cotovelo_infeccao_articular'){
      if(febrePositiva&&sinaisInfeccao>=1)score+=5.4;
      else if(febrePositiva&&/cotovelo/.test(t))score+=4.2;
      if(inflamacaoLocal)score+=2.6;
      if(sintomasSistemicosNegados&&!inflamacaoLocal)score-=4;
    }
    if(cond.id==='cotovelo_trauma_maior'&&trauma)score+=incapacidadeTrauma?4.5:3;
    if(cond.id==='cotovelo_ucl'&&arremessoValgo)score+=/valgo/.test(t)?5.2:4.5;
    if(cond.id==='cotovelo_medial'&&arremessoValgo&&!/(?:flexion|flexao|pron|punho)/.test(t))score-=1.1;
    if(cond.id==='cotovelo_triceps_posterior'&&tricepsCarga)score+=3.3;
    if(cond.id==='cotovelo_articular'&&articular)score+=3.4;
    if(cond.id==='cotovelo_olecrano'&&olecrano)score+=3.1;
    if(cond.id==='cotovelo_biceps_distal'&&bicepsLocal&&cargaSupinacao)score+=2.9;
    if(cond.id==='cotovelo_tunel_radial'&&/(?:mais para baixo|distal|antebraco).{0,60}(?:epicond|lateral)|(?:lateral).{0,60}antebraco/.test(t)&&cargaSupinacao)score+=3.2;
    return {score:score+cond.ordem/1000,hits:uniq(hits).slice(0,6),bloqueada:false};
  }
  function itemBancoPorCondicao(cond){
    if(ITEM_BANCO_CACHE.has(cond.id))return ITEM_BANCO_CACHE.get(cond.id);
    try{const reg=typeof BANCO_MAPEAMENTO_CLINICO!=='undefined'?BANCO_MAPEAMENTO_CLINICO?.cotovelo:null;const itens=[...arr(reg?.clusters),...arr(reg?.diferenciais)];const item=itens.find(item=>cond.nomes.some(rx=>rx.test(norm(item?.nome||''))))||null;ITEM_BANCO_CACHE.set(cond.id,item);return item;}catch(_){return null;}
  }
  function testeNome(t){return typeof t==='string'?t:String(t?.nome||t?.teste||t?.titulo||t?.descricao||'').trim();}
  function criarHipotese(cond,p){
    const item=itemBancoPorCondicao(cond);const matriz=MATRIZ_EXAME[cond.id]||{essencial:[],complementar:[],evitar:[]};const testes=arr(item?.testes).map(testeNome).filter(Boolean);
    return {id:item?.id||cond.id,regiaoId:'cotovelo',regiaoNome:'Cotovelo',grupo:item?.regraConfirmacao||item?.limiar?'cluster':'diferencial',nome:item?.nome||cond.rotulo,prioridadeOrdenacao:Number((p.score+2).toFixed(2)),aFavor:p.hits.length?p.hits.map(x=>`Relato: ${x}`):['Padrão ainda depende de perguntas discriminativas'],contra:[],aConfirmar:uniq([...cond.perguntas.slice(0,3),...matriz.essencial.slice(0,4),...cond.objetivos.slice(0,2)]),testes,regraConfirmacao:item?.regraConfirmacao?.descricao||item?.regraConfirmacao||'',interpretacao:String(item?.interpretacao||''),evidencia:String(item?.evidencia||''),origemHMA:p.hits.length>0,item:item||{id:cond.id,nome:cond.rotulo,testes},motor31:{condicaoId:cond.id,perguntas:cond.perguntas.slice(),objetivos:cond.objetivos.slice(),frasesReconhecidas:p.hits,urgente:!!cond.urgente,reforca:cond.reforca,enfraquece:cond.enfraquece,matrizExame:matriz}};
  }
  function uniqObj(lista){const m=new Map();arr(lista).forEach(x=>{const k=norm(`${x?.titulo||''}|${x?.descricao||''}`);if(k&&!m.has(k))m.set(k,x);});return Array.from(m.values());}
  function classificarObjetivo(t=''){const s=norm(t);if(/cervical|neuro|dermat|miot|reflex|neurodin|ulnar|radial|interosseo/.test(s))return'neurologica';if(/adm|amplitude|rotacao|mobilidade|flexao extensao|pronacao supinacao|passiv|ativ/.test(s))return'mobilidade';if(/forca|resist|carga|dinam|preensao|supinacao|pronacao/.test(s))return'forca_carga';if(/funcao|esporte|arremesso|controle|cadeia cinetica/.test(s))return'funcional';if(/palpac|inspec|deform|edema|equimose|rubor|calor/.test(s))return'inspecao';return'ortopedico';}
  const ROT={neurologica:'Exame neurológico / proximal',mobilidade:'Mobilidade e ADM',forca_carga:'Força e tolerância à carga',funcional:'Função e cadeia cinética',inspecao:'Inspeção / palpação',ortopedico:'Testes e diferenciação clínica'};
  function agrupar(itens){const g={};arr(itens).forEach(t=>(g[t.tipo]||(g[t.tipo]=[])).push(t));return Object.entries(g).map(([tipo,x])=>({tipo,titulo:ROT[tipo]||tipo,itens:x}));}

  function planoCotoveloEspecialista(plano){
    if(!plano||plano.insuficiente)return plano;
    const textoHma=norm(hmaTexto());const temCotovelo=arr(plano.regioes).some(r=>r.id==='cotovelo')||/cotovelo|epicond|olecran|fossa cubital|antebraco/.test(textoHma);if(!temCotovelo)return plano;
    const c=contexto();const texto=textoContexto(c);const avaliadas=CONDICOES.map(cond=>({cond,...pontuar(cond,texto,c)})).sort((a,b)=>b.score-a.score);let fortes=avaliadas.filter(x=>!x.bloqueada&&(x.hits.length||x.score>=2.5)).slice(0,7);
    const especialistas=fortes.map(x=>criarHipotese(x.cond,x));const existentes=arr(plano.hipoteses).filter(h=>h.regiaoId!=='cotovelo');const cotoveloBase=arr(plano.hipoteses).filter(h=>h.regiaoId==='cotovelo');const mapa=new Map();
    [...especialistas,...cotoveloBase].forEach(h=>{const k=norm(h.nome);if(!mapa.has(k))mapa.set(k,h);else if(h.motor31)mapa.set(k,{...mapa.get(k),...h});});
    const cotoveloFinal=Array.from(mapa.values()).sort((a,b)=>Number(b.prioridadeOrdenacao||0)-Number(a.prioridadeOrdenacao||0)).slice(0,7);plano.hipoteses=[...cotoveloFinal,...existentes].sort((a,b)=>Number(b.prioridadeOrdenacao||0)-Number(a.prioridadeOrdenacao||0));
    const temOmbro=arr(plano.regioes).some(r=>r.id==='ombro')||/ombro|manguito|supraespinhal|bursite no ombro/.test(textoHma);const correlacaoAtiva=temOmbro&&(/cotovelo|braco/.test(textoHma)||arr(plano.regioes).some(r=>r.id==='cotovelo'));
    const perguntas=uniq([...BASE_PERGUNTAS,...fortes.flatMap(x=>x.cond.perguntas)]).slice(0,16);const objetivos=uniq([...fortes.flatMap(x=>x.cond.objetivos)]).slice(0,18);const segurancaExtra=fortes.filter(x=>x.cond.urgente).map(x=>({titulo:x.cond.rotulo,descricao:`Padrão histórico que merece exclusão prioritária. Pergunte: ${x.cond.perguntas[0]}`}));
    plano.exame.seguranca=uniqObj([...(plano.exame.seguranca||[]),...segurancaExtra]);plano.exame.perguntasDirigidasCotovelo=perguntas;plano.exame.objetivosCotovelo=objetivos;plano.exame.familiasCotovelo=fortes.map(x=>({id:x.cond.id,nome:x.cond.rotulo,frases:x.hits,perguntas:x.cond.perguntas,objetivos:x.cond.objetivos,urgente:!!x.cond.urgente,matrizExame:MATRIZ_EXAME[x.cond.id]||{essencial:[],complementar:[],evitar:[]}}));plano.exame.matrizCotovelo=plano.exame.familiasCotovelo.map(x=>({id:x.id,nome:x.nome,...x.matrizExame}));
    plano.exame.correlacaoOmbroCotovelo={ativa:correlacaoAtiva,principio:'Dor percebida no cotovelo pode ser local ou proveniente de fonte proximal. Comparar ombro, cotovelo/punho e cervical/neural antes de atribuir o sintoma a uma estrutura.',perguntas:[BASE_PERGUNTAS[1],BASE_PERGUNTAS[2],BASE_PERGUNTAS[6]],criterios:['reprodução da dor familiar por carga/movimento do ombro','reprodução independente por carga local do cotovelo/punho','presença de sintomas distais ou modulação cervical']};
    const motorCotovelo={versao:VERSION,regiao:'cotovelo',frasesReconhecidas:uniq(fortes.flatMap(x=>x.hits)),perguntas,condicoes:plano.exame.familiasCotovelo,correlacaoOmbroCotovelo:plano.exame.correlacaoOmbroCotovelo,aviso:'Prioridade de investigação; dor no cotovelo não implica origem local e relato de bursite/tendinite não confirma estrutura.'};
    plano.motores31={...(plano.motores31||{}),cotovelo:motorCotovelo};if(!plano.motor31)plano.motor31=motorCotovelo;
    const objetivosExame=uniq([...fortes.flatMap(x=>arr(MATRIZ_EXAME[x.cond.id]?.essencial)),...objetivos,...fortes.flatMap(x=>arr(MATRIZ_EXAME[x.cond.id]?.complementar))]).slice(0,10);const extras=objetivosExame.map((o,i)=>({texto:o,tipo:classificarObjetivo(o),hipoteses:fortes.slice(0,3).map(x=>x.cond.rotulo),prioridade:11.5-i/100,motor31:true,regiaoMotor31:'cotovelo'}));const testeMap=new Map();const combinados=temOmbro?[...extras.slice(0,8),...arr(plano.exame.testesPrioritarios)]:[...extras,...arr(plano.exame.testesPrioritarios)];combinados.forEach(t=>{const k=norm(t.texto);if(k&&!testeMap.has(k))testeMap.set(k,t);});plano.exame.testesPrioritarios=Array.from(testeMap.values()).slice(0,temOmbro?18:14);plano.exame.analises=agrupar(plano.exame.testesPrioritarios);plano.lacunas=uniq([...arr(plano.lacunas),...perguntas.slice(0,6).map(q=>`Cotovelo: ${q}`)]).slice(0,16);return plano;
  }

  function esc(v=''){return String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;');}
  function renderPerguntas(plano){
    const host=document.getElementById('ks31_elbow_interview');if(!host)return;const m=plano?.motores31?.cotovelo||(plano?.motor31?.regiao==='cotovelo'?plano.motor31:null);if(!m){host.hidden=true;host.innerHTML='';return;}host.hidden=false;const matriz=arr(plano?.exame?.matrizCotovelo).slice(0,5);const cross=m?.correlacaoOmbroCotovelo;const assinatura=JSON.stringify({v:VERSION,c:m.condicoes.map(x=>x.id),f:m.frasesReconhecidas,p:m.perguntas.slice(0,10),mx:matriz.map(x=>x.id),cross:!!cross?.ativa});if(host.dataset.ks31Signature===assinatura)return;host.dataset.ks31Signature=assinatura;
    host.innerHTML=`<header><div><span>Motor 3.1 · Cotovelo</span><strong>Diferenciar origem local, ombro e componente cervical/neural</strong></div><small>${m.condicoes.length} família(s) em investigação</small></header>${cross?.ativa?`<div class="ks31-cross-region"><strong>Integração ombro ↔ cotovelo</strong><p>${esc(cross.principio)}</p></div>`:''}<div class="ks31-question-grid">${m.perguntas.slice(0,10).map((q,i)=>`<div><b>${i+1}</b><span>${esc(q)}</span></div>`).join('')}</div>${matriz.length?`<div class="ks31-exam-matrix"><strong>Exame por finalidade</strong>${matriz.map(x=>`<details><summary>${esc(x.nome)}</summary><div><b>Essencial</b>${arr(x.essencial).map(v=>`<p>${esc(v)}</p>`).join('')}<b>Complementar</b>${arr(x.complementar).map(v=>`<p>${esc(v)}</p>`).join('')}${arr(x.evitar).length?`<b>Cautela</b>${arr(x.evitar).map(v=>`<p>${esc(v)}</p>`).join('')}`:''}</div></details>`).join('')}</div>`:''}<footer>A localização da dor não define sozinha a origem. Compare reprodução do sintoma pelo ombro, carga local do cotovelo/punho e triagem cervical/neural.</footer>`;
  }
  function garantirUI(){const etapa2=document.getElementById('subtela_mapeamento');if(etapa2&&!document.getElementById('ks31_elbow_interview')){const el=document.createElement('section');el.id='ks31_elbow_interview';el.className='ks31-elbow-interview';el.hidden=true;const ombro=document.getElementById('ks31_shoulder_interview');const p=document.getElementById('ks30_exam_plan');if(ombro)ombro.insertAdjacentElement('afterend',el);else if(p)p.insertAdjacentElement('afterend',el);else etapa2.insertAdjacentElement('afterbegin',el);}}

  window.enriquecerPlanoCotoveloKineSys=planoCotoveloEspecialista;
  window.KineSysMotor31Cotovelo={version:VERSION,condicoes:CONDICOES,perguntasBase:BASE_PERGUNTAS,referencias:REFERENCIAS,enriquecer:planoCotoveloEspecialista};
  document.addEventListener('kinesys:motor3-plano-atualizado',()=>{garantirUI();const p=window.KineSysMotorClinico3?.ultimoPlano;if(p)renderPerguntas(p);});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',garantirUI,{once:true});else garantirUI();
})();
