/* ============================================================================
   KineSys — Motor Clínico 3.1 | Ombro
   Piloto regional: linguagem do paciente -> perguntas discriminativas ->
   hipóteses abertas -> objetivos de exame.

   Segurança:
   - termos da HMA ajustam prioridade de investigação; não fecham diagnóstico;
   - testes especiais são interpretados no conjunto da história + exame;
   - condições urgentes e dor referida são priorizadas antes de rótulos locais.
   ============================================================================ */
(function instalarMotor31Ombro(){
  'use strict';

  const VERSION='3.1.3-shoulder4';
  const normBase=(v='')=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').replace(/\s+/g,' ').trim();
  const norm=(v='')=>normBase(v)
    .replace(/\bencima\b/g,'em cima')
    .replace(/\b(durmo|dorme|dormia|dormindo|dormir)\b/g,'dormir')
    .replace(/\b(deito|deita|deitado|deitada|deitando|deitar)\b/g,'deitar')
    .replace(/\b(apoio|apoia|apoiado|apoiada|apoiando|apoiar)\b/g,'apoiar')
    .replace(/\bpra\b/g,'para')
    .replace(/\s+/g,' ').trim();
  const arr=v=>Array.isArray(v)?v:[];
  const uniq=v=>Array.from(new Set(arr(v).filter(Boolean)));
  const hmaTexto=()=>String(document.getElementById('paciente_hma')?.value||'');
  const contem=(texto,termos)=>{
    const t=norm(texto);
    return arr(termos).filter(x=>t.includes(norm(x)));
  };
  const contexto=()=>{try{return typeof coletarContextoClinico==='function'?(coletarContextoClinico()||{}):{};}catch(_){return{};}};
  const PADRAO_DECUBITO_OMBRO=/(?:dormir|deitar|apoiar).{0,28}(?:em cima|sobre|lado).{0,22}(?:ombro|braco)|(?:ombro|braco).{0,22}(?:dormir|deitar|apoiar)/;
  const PERGUNTA_DECUBITO_OMBRO='Ao deitar/dormir sobre o braço ou ombro, o que surge exatamente: dor no topo, dor lateral, dor anterior, pressão, formigamento ou dormência?';
  const OBJETIVO_DECUBITO_OMBRO='Localizar o sintoma provocado pelo decúbito e diferenciar compressão local do ombro/AC de sintomas neurais no membro superior';

  const BASE_PERGUNTAS=[
    'Onde exatamente dói: frente, lado, topo, região posterior/escapular ou dor profunda dentro do ombro?',
    'A dor ultrapassa o cotovelo ou chega à mão? Há formigamento, dormência, choque ou perda de força distal?',
    'Movimentos do pescoço modificam ou reproduzem a dor do ombro/braço?',
    'Houve queda, tração, impacto, luxação, estalo traumático ou perda súbita de força?',
    'O movimento ativo está limitado por dor/fraqueza ou o ombro também está rígido quando outra pessoa tenta movimentá-lo?',
    'Qual movimento mais limita: elevar, alcançar acima da cabeça, mão nas costas, vestir-se, pentear o cabelo ou cruzar o braço?',
    'A dor piora ao deitar sobre o ombro? Acorda à noite mesmo sem estar apoiado sobre ele?',
    'Existe sensação de instabilidade, apreensão, braço morto, travamento, clique profundo ou sensação de algo prendendo?',
    'Houve mudança recente de treino, trabalho acima da cabeça, arremesso, carga ou repetição?',
    'Há cirurgia prévia, luxação anterior, infiltração, fratura, diabetes, doença tireoidiana ou doença inflamatória relevante?'
  ];

  const CONDICOES=[
    {
      id:'ombro_trauma_maior', ordem:100, urgente:true,
      nomes:[/fratura.*ombro|luxacao.*ombro|lesao traumatica importante|ruptura traumatica.*manguito/],
      rotulo:'Lesão traumática importante / fratura-luxação / ruptura aguda a excluir',
      termos:['caiu em cima do ombro','caiu sobre o braco','ombro saiu do lugar','ombro deslocou','deformou','nao consegue levantar o braco depois da queda','perdeu a forca na hora','estalo forte depois da queda','braco ficou pendurado'],
      perguntas:['Qual foi exatamente o mecanismo do trauma e a posição do braço?','Houve deformidade, luxação aparente, redução espontânea ou atendimento de urgência?','Consegue elevar o braço após o trauma? A perda de força foi imediata?','Há dormência, alteração de pulso, mudança de cor/temperatura ou déficit motor distal?'],
      objetivos:['Inspeção de deformidade e sinais traumáticos','Exame neurovascular distal','Capacidade ativa sem forçar manobras provocativas','Aplicar regras/critério de encaminhamento e necessidade de imagem conforme contexto'],
      reforca:['trauma','incapacidade súbita','deformidade','perda aguda de força'],
      enfraquece:['início insidioso sem trauma','função preservada']
    },
    {
      id:'ombro_cervical_referida', ordem:96,
      nomes:[/cervical.*referid|componente radicular|radicul|dor referida cervical|cervicobraquial/],
      rotulo:'Origem cervical / neural referida ao ombro — excluir ou confirmar',
      termos:['dor no pescoco e ombro','vem do pescoco','desce pelo braco','passa do cotovelo','vai ate a mao','formiga','dorme a mao','choque','dedos dormentes','mexer o pescoco piora','olhar para cima piora','dor na escapula e braco'],
      perguntas:['A dor passa do cotovelo ou alcança dedos específicos?','Existe dormência, parestesia, choque, perda de força ou alteração de reflexo percebida?','Rotação, extensão ou inclinação cervical modifica os sintomas?','A dor do ombro pode ser reproduzida independentemente pelo movimento/carga do ombro?'],
      objetivos:['Screening cervical antes de testes locais do ombro','Dermátomos, miótomos e reflexos quando indicado','Neurodinâmica/cluster cervical quando compatível','Comparar reprodução da dor familiar por cervical versus ombro'],
      reforca:['sintomas distais','modulação cervical','déficit neurológico'],
      enfraquece:['dor estritamente proximal','pescoço sem efeito sobre sintomas','exame neurológico normal não exclui sozinho']
    },
    {
      id:'ombro_capsulite', ordem:90,
      nomes:[/capsulite adesiva|ombro congelado/],
      rotulo:'Capsulite adesiva / padrão de rigidez glenoumeral',
      termos:['ombro congelado','ombro travado','ombro preso','nao consigo colocar a mao nas costas','nao consigo prender o sutia','nao consigo pentear o cabelo','perdi movimento aos poucos','cada mes mexe menos','ate outra pessoa nao consegue mexer','muito rigido'],
      perguntas:['A perda de movimento foi progressiva ao longo de semanas/meses?','A rotação externa é particularmente difícil? E mão nas costas?','A limitação existe tanto ativa quanto passivamente?','Há diabetes, doença tireoidiana, imobilização ou cirurgia recente?','A dor noturna precedeu ou acompanhou a perda progressiva de movimento?'],
      objetivos:['Comparar ADM ativa e passiva','Quantificar rotação externa passiva e demais amplitudes','Identificar padrão capsular versus limitação predominantemente dolorosa','Diferenciar de artrose, pós-operatório e perda ativa por fraqueza'],
      reforca:['rigidez progressiva','ADM passiva limitada','rotação externa passiva reduzida'],
      enfraquece:['ADM passiva preservada','instabilidade predominante']
    },
    {
      id:'ombro_artrose_gh', ordem:84,
      nomes:[/osteoartrose glenoumeral|artrose glenoumeral/],
      rotulo:'Osteoartrose glenoumeral / degeneração articular sintomática',
      termos:['desgaste no ombro','artrose no ombro','crepita','range dentro','raspa','dor profunda','ombro duro','perdeu rotacao','dificuldade para girar o braco','dor profunda com movimento'],
      perguntas:['A dor é profunda e acompanhada de rigidez/crepitação?','Houve perda gradual de rotação e elevação?','Existe histórico de trauma, luxação, cirurgia ou artrite?','Há radiografia ou outro exame mostrando artrose e isso concorda com o quadro clínico?'],
      objetivos:['ADM ativa/passiva e padrão global de rigidez','Crepitação e reprodução da dor familiar','Força e função sem supervalorizar achado radiográfico','Diferenciar de capsulite e dor relacionada ao manguito'],
      reforca:['rigidez global','crepitação','dor profunda','idade/contexto degenerativo'],
      enfraquece:['passivo normal','sintomas exclusivamente ligados a carga do manguito']
    },
    {
      id:'ombro_manguito', ordem:82,
      nomes:[/dor relacionada ao manguito|manguito rotador|subacromial/],
      rotulo:'Dor relacionada ao manguito rotador / complexo subacromial',
      termos:['doi para levantar o braco','doi para pegar coisa no alto','doi para colocar roupa','doi para pentear o cabelo','doi na lateral do braco','doi no deltoide','doi quando durmo em cima','doi para baixar o braco','braco pesa quando levanto','doi com peso acima da cabeca','doi no meio do movimento'],
      perguntas:['A dor é predominantemente lateral/deltoidea e provocada por elevação ou carga?','Existe arco de dor durante elevação e melhora relativa fora desse arco?','A força está reduzida por dor ou existe fraqueza marcada independente da dor?','A ADM passiva está relativamente preservada?','Há demanda repetitiva acima da cabeça ou aumento recente de carga?'],
      objetivos:['ADM ativa/passiva e comportamento durante elevação','Força/resistência de abdução e rotação externa','Reprodução da dor familiar com carga do manguito','Diferenciar de cervical, capsulite, AC e lesão traumática importante','Interpretar testes provocativos em conjunto; não usar Neer/Hawkins/Jobe isoladamente como diagnóstico'],
      reforca:['dor com elevação/carga','dor lateral','passivo relativamente preservado','fraqueza dolorosa'],
      enfraquece:['rigidez passiva global','sintomas neurológicos dominantes','deformidade traumática']
    },
    {
      id:'ombro_ruptura_manguito', ordem:81,
      nomes:[/ruptura.*manguito/],
      rotulo:'Ruptura relevante do manguito rotador — investigar extensão/impacto funcional',
      termos:['nao segura o braco','braco cai','nao consegue levantar mas passivamente vai','perdeu muita forca','fraqueza muito grande','estalo e ficou fraco','nao consegue manter o braco elevado'],
      perguntas:['A fraqueza começou abruptamente ou progrediu? Houve trauma?','Consegue elevar ativamente? Passivamente o movimento está disponível?','Existe lag, queda do braço ou perda marcada de rotação externa?','Qual é a idade, demanda funcional e histórico prévio do ombro?'],
      objetivos:['Comparar ADM ativa versus passiva','Força objetiva de abdução/rotação externa','Lag signs/queda do braço quando apropriado','Definir necessidade de imagem/avaliação médica conforme trauma e déficit funcional'],
      reforca:['perda ativa desproporcional','fraqueza objetiva','trauma em contexto compatível'],
      enfraquece:['força funcional preservada','rigidez passiva como principal achado']
    },
    {
      id:'ombro_ac', ordem:76,
      nomes:[/acromioclavicular|articulacao ac/],
      rotulo:'Dor acromioclavicular',
      termos:['doi em cima do ombro','dor na ponta do ombro','dor na clavicula','doi para cruzar o braco','doi para abracar','cinto de seguranca incomoda','doi quando durmo desse lado bem em cima','pancada em cima do ombro'],
      perguntas:['A dor é localizada com um dedo sobre a articulação AC/topo do ombro?','Cruzar o braço à frente do corpo reproduz a dor familiar?','Houve queda direta sobre o ombro?','A palpação da AC reproduz exatamente a queixa?'],
      objetivos:['Localização e palpação AC','Adução horizontal/cross-body e testes AC em conjunto','Diferenciar de manguito e dor cervical/referida'],
      reforca:['dor superior focal','cross-body doloroso','trauma direto'],
      enfraquece:['dor predominantemente lateral/deltoidea','sintomas distais']
    },
    {
      id:'ombro_biceps', ordem:74,
      nomes:[/cabeca longa.*biceps|biceps/],
      rotulo:'Tendão da cabeça longa do bíceps — envolvimento a investigar',
      termos:['dor na frente do ombro','doi no sulco','doi para carregar sacola','doi com palma para cima','doi para fazer rosca','doi puxando','dor na frente quando levanto peso','tendao do biceps'],
      perguntas:['A dor é claramente anterior, na região do sulco bicipital?','Flexão do ombro/cotovelo ou supinação resistida reproduz a dor familiar?','Há estalo, deformidade tipo Popeye ou evento súbito?','Existem sinais concomitantes de manguito ou labrum?'],
      objetivos:['Palpação do sulco como dado complementar','Flexão/supinação resistidas','Diferenciar bíceps de manguito e labrum','Não interpretar Speed/Yergason isoladamente como confirmação estrutural'],
      reforca:['dor anterior','carga em flexão/supinação'],
      enfraquece:['dor superior focal AC','rigidez passiva global']
    },
    {
      id:'ombro_instabilidade', ordem:78,
      nomes:[/instabilidade glenoumeral|luxacao recorrente/],
      rotulo:'Instabilidade glenoumeral / apreensão',
      termos:['parece que vai sair','ombro sai do lugar','ja saiu varias vezes','desloca facil','medo de armar o braco','braco morto','ombro frouxo','subluxa','tenho medo de jogar o braco para tras','fica solto'],
      perguntas:['Já houve luxação/subluxação documentada? Quantos episódios e em qual direção?','A posição de abdução + rotação externa provoca medo/apreensão mais do que apenas dor?','Há hiperlaxidade generalizada ou instabilidade bilateral?','O episódio inicial foi traumático? Existe perda óssea/imagem prévia?'],
      objetivos:['Apreensão e relocation quando apropriados','Laxidade/direção da instabilidade','Controle motor e função em posição de risco','Diferenciar instabilidade verdadeira de dor sem sensação de deslocamento'],
      reforca:['apreensão','história de luxação/subluxação','sensação de sair'],
      enfraquece:['somente dor sem apreensão','rigidez importante']
    },
    {
      id:'ombro_labral', ordem:70,
      nomes:[/labral|slap|labrum/],
      rotulo:'Lesão labral / SLAP — hipótese intra-articular a investigar',
      termos:['estalo la dentro','clique profundo','prende dentro do ombro','trava por dentro','doi fundo no ombro','estala quando arremesso','braco morto no arremesso','puxaram meu braco e comecou','pegando dentro'],
      perguntas:['O clique/travamento é profundo e reproduz dor, ou é apenas ruído indolor?','Há história de tração, queda, luxação ou arremesso repetitivo?','A dor aparece em posições específicas de carga/abdução-rotação?','Há instabilidade concomitante ou sintomas predominantemente do bíceps?'],
      objetivos:['História mecânica/intra-articular e demanda esportiva','Testes labrais apenas em combinação e com cautela devido à acurácia variável','Diferenciar instabilidade, bíceps e manguito','Considerar imagem/avaliação especializada quando achados clínicos e impacto funcional justificarem'],
      reforca:['clique doloroso profundo','travamento','tração/arremesso'],
      enfraquece:['clique isolado sem dor','padrão puramente cervical']
    },
    {
      id:'ombro_calcaria', ordem:72,
      nomes:[/calcaria|calcificacao/],
      rotulo:'Tendinopatia calcária / depósito calcificado — considerar correlação com imagem',
      termos:['calcificacao no ombro','tendinite calcaria','deposito de calcio','dor muito forte de repente sem cair','crise forte no ombro','nao consigo dormir de tanta dor','raio x mostrou calcio'],
      perguntas:['Existe exame de imagem demonstrando calcificação e o lado/local é concordante?','A crise foi abrupta e muito intensa sem trauma significativo?','Há limitação principalmente por dor ou rigidez passiva verdadeira?','Existem sinais sistêmicos que exijam excluir infecção/outra causa?'],
      objetivos:['ADM limitada por dor versus rigidez','Força tolerável e função','Correlacionar imagem com clínica sem assumir causalidade automática','Excluir sinais sistêmicos/traumáticos quando quadro muito intenso'],
      reforca:['imagem compatível','crise aguda intensa','dor noturna'],
      enfraquece:['achado incidental sem correlação clínica']
    },
    {
      id:'ombro_pmr', ordem:98, urgente:true,
      nomes:[/polimialgia reumatica/],
      rotulo:'Polimialgia reumática / condição sistêmica — rastrear',
      termos:['os dois ombros doem','dor nos dois ombros','acordo todo travado','rigidez de manha','demoro muito para destravar de manha','quadril e ombros doem juntos','cansaco e dor nos dois ombros'],
      perguntas:['O paciente tem 50 anos ou mais?','A dor/rigidez é bilateral e a rigidez matinal dura cerca de 45 minutos ou mais?','Há sintomas sistêmicos, perda de peso, febre ou mal-estar?','Existe dor/rigidez em cintura pélvica e investigação laboratorial/médica prévia?'],
      objetivos:['Reconhecer padrão sistêmico em vez de tratar como duas lesões locais','Encaminhamento/avaliação médica quando padrão compatível','Evitar excesso de testes ortopédicos locais antes de esclarecer condição sistêmica'],
      reforca:['bilateralidade','idade >=50','rigidez matinal prolongada'],
      enfraquece:['quadro unilateral claramente mecânico']
    }
  ];

  const VOCABULARIO_NACIONAL={
    ombro_trauma_maior:[
      'caiu com a mao no chao','caiu apoiando a mao','caiu com o braco esticado','bateu forte no ombro','levou uma pancada no ombro',
      'depois da queda nao levanta','desde a queda nao consegue erguer o braco','perdeu a forca logo depois da queda','ombro saiu e voltou sozinho'
    ],
    ombro_cervical_referida:[
      'dor sai do pescoco e vai para o ombro','dor vem da nuca para o ombro','dor corre pelo braco','dor desce ate os dedos','dor pega o braco inteiro',
      'mao formigando','mao adormece','dedos amortecidos','dor em choque','queimacao no braco','virar o pescoco piora o ombro','olhar para cima manda dor para o braco'
    ],
    ombro_capsulite:[
      'nao consigo coçar as costas','nao consigo pegar o bolso de tras','nao consigo fechar o sutiã','nao consigo colocar o cinto','nao consigo vestir a camisa direito',
      'nao consigo colocar o casaco','nao consigo lavar o cabelo','ombro endureceu','foi travando aos poucos','esta cada vez mais preso','outra pessoa tambem nao consegue levantar meu braco'
    ],
    ombro_artrose_gh:[
      'ombro gasto','desgaste na junta do ombro','junta do ombro raspando','ombro estalando e duro','parece areia dentro','ombro range','dor bem dentro da junta',
      'perdeu movimento devagar','dificuldade para girar o ombro','ombro duro para quase tudo'
    ],
    ombro_manguito:[
      'doi para estender roupa','doi para pegar coisa no armario','doi para colocar algo na prateleira','doi para levantar o filho','doi para tirar a camisa',
      'doi para colocar a mao na cabeca','doi para lavar o cabelo','doi quando levanto o braco de lado','doi quando levanto o braco para frente',
      'doi no lado de fora do ombro','dor desce so ate o meio do braco','doi no meio do levantamento','doi mais para subir do que parado'
    ],
    ombro_ruptura_manguito:[
      'nao consigo erguer sozinho mas alguem consegue levantar','o braco despenca','nao sustenta o braco levantado','ficou muito fraco depois de um estalo',
      'levanto com a outra mao','nao consegue segurar o peso do proprio braco','perdeu forca de repente'
    ],
    ombro_ac:[
      'dor bem em cima do ombro','dor onde termina a clavicula','dor no ossinho em cima do ombro','doi quando levo a mao para o outro ombro',
      'doi para colocar a mao no ombro contrario','doi com a alca do cinto','doi com mochila no ombro'
    ],
    ombro_biceps:[
      'dor na frente da junta','doi na frente quando carrego peso','doi para levantar uma sacola','doi para pegar panela com a palma para cima',
      'doi para puxar alguma coisa','dor na frente quando dobro o cotovelo com peso','dor na frente para fazer academia'
    ],
    ombro_instabilidade:[
      'parece que o ombro vai escapar','parece que vai desencaixar','parece que vai deslocar','sinto o ombro solto','sinto que a junta corre','fica inseguro quando jogo o braco para tras',
      'tenho medo de abrir o braco e girar para fora','tenho medo de colocar o braco atras da cabeca','parece que sai quando levanto o cotovelo e giro o braco',
      'ja desloquei o ombro','ja tive luxacao','ja saiu do lugar mais de uma vez','ombro desloca com facilidade','braço morto','armar o braco'
    ],
    ombro_labral:[
      'estalo doloroso dentro do ombro','clique com dor dentro','parece que agarra dentro','parece que prende por dentro','trava dentro da junta','estalido profundo',
      'doi no fundo do ombro','doi para arremessar','ombro morre depois de arremessar','puxaram meu braco e depois ficou doendo dentro'
    ],
    ombro_calcaria:[
      'crise de dor muito forte no ombro','acordou com o ombro muito dolorido sem cair','dor tao forte que nao consegue mexer','calcificacao apareceu no raio x',
      'medico falou que tem calcio no ombro','tendinite com calcio'
    ],
    ombro_pmr:[
      'os dois ombros amanhecem travados','ombros duros de manha','demora para soltar os ombros de manha','dor nos dois ombros e nos quadris',
      'os dois lados doem sem ter machucado','muita rigidez quando acorda'
    ]
  };

  const VOCABULARIO_COMPILADO={};
  CONDICOES.forEach(cond=>{
    VOCABULARIO_COMPILADO[cond.id]=uniq([...arr(cond.termos),...arr(VOCABULARIO_NACIONAL[cond.id])]).map(raw=>({raw,normalizado:norm(raw)}));
  });
  const ITEM_BANCO_CACHE=new Map();

  const MATRIZ_EXAME={
    ombro_trauma_maior:{
      essencial:['Inspeção e deformidade','Exame neurovascular distal','Capacidade ativa sem forçar provocação','Decisão sobre necessidade de imagem/avaliação médica'],
      complementar:['ADM passiva somente se segura','Força apenas quando trauma grave/fratura-luxação estiverem suficientemente excluídos'],
      evitar:['Não insistir em testes provocativos especiais antes de excluir lesão traumática importante']
    },
    ombro_cervical_referida:{
      essencial:['Screening cervical','Dermátomos, miótomos e reflexos quando houver sintomas distais','Reprodução/modulação por movimento cervical','Comparar reprodução da dor familiar por cervical e por ombro'],
      complementar:['Neurodinâmica do membro superior','Cluster cervical quando a apresentação justificar'],
      evitar:['Não interpretar Spurling, ULTT ou outro teste isolado como diagnóstico definitivo']
    },
    ombro_capsulite:{
      essencial:['ADM ativa e passiva','Rotação externa passiva comparativa','Padrão global de restrição e irritabilidade','História de progressão da rigidez'],
      complementar:['Medida de flexão/abdução e rotação interna','Função: mão nas costas/cabeça e atividades de vestir-se'],
      evitar:['Não fechar capsulite apenas por dor noturna ou por um único movimento limitado']
    },
    ombro_artrose_gh:{
      essencial:['ADM ativa e passiva','Padrão de rigidez e crepitação','Reprodução da dor profunda familiar','Impacto funcional'],
      complementar:['Força global','Correlação com radiografia quando disponível'],
      evitar:['Não assumir que artrose em imagem seja a causa principal sem concordância clínica']
    },
    ombro_manguito:{
      essencial:['ADM ativa e passiva','Comportamento durante elevação/arco doloroso','Força de abdução','Força de rotação externa','Reprodução da dor familiar sob carga'],
      complementar:['Jobe/Full Can conforme hipótese','Resistência à rotação externa','Hawkins-Kennedy ou Neer como testes de provocação','Avaliação de tolerância à carga e função overhead'],
      evitar:['Não usar Neer, Hawkins-Kennedy, Jobe/Empty Can ou arco doloroso isoladamente como diagnóstico estrutural']
    },
    ombro_ruptura_manguito:{
      essencial:['Comparar ADM ativa versus passiva','Força objetiva de abdução e rotação externa','Avaliar perda ativa desproporcional','História de trauma e início da fraqueza'],
      complementar:['External Rotation Lag Sign','Drop Arm quando apropriado','Hornblower/teres minor quando quadro indicar'],
      evitar:['Não diferenciar ruptura parcial de total apenas por testes clínicos; considerar imagem quando decisão clínica depender da integridade estrutural']
    },
    ombro_ac:{
      essencial:['Localização focal sobre articulação AC','Palpação reproduzindo a dor familiar','Adução horizontal/cross-body'],
      complementar:['Paxinos e outros testes AC em combinação quando disponíveis','História de trauma direto'],
      evitar:['Não usar cross-body ou palpação isoladamente como confirmação definitiva']
    },
    ombro_biceps:{
      essencial:['Localização anterior/sulco bicipital','Flexão do ombro/cotovelo resistida','Supinação resistida','Diferenciação de manguito e labrum'],
      complementar:['Speed','Yergason','Uppercut quando disponíveis no banco'],
      evitar:['Não usar Speed ou Yergason isoladamente para confirmar patologia da cabeça longa do bíceps']
    },
    ombro_instabilidade:{
      essencial:['História de luxação/subluxação e direção','Apreensão genuína em posição de risco','Apprehension e Relocation quando apropriados','Laxidade/direção e controle funcional'],
      complementar:['Load-and-shift','Sulcus sign em suspeita de componente inferior/multidirecional','Testes funcionais específicos do esporte'],
      evitar:['Dor isolada durante apprehension não equivale a instabilidade; valorizar sensação de apreensão/saída e história clínica']
    },
    ombro_labral:{
      essencial:['História de tração/arremesso/instabilidade','Sintomas mecânicos dolorosos profundos','Diferenciar instabilidade e bíceps','Impacto funcional específico'],
      complementar:['O’Brien/Active Compression','Crank','Biceps Load ou outros testes quando pertinentes'],
      evitar:['Não interpretar O’Brien, Crank ou outro teste labral isoladamente; acurácia é variável e clique indolor isolado tem baixo valor']
    },
    ombro_calcaria:{
      essencial:['ADM ativa/passiva limitada por dor versus rigidez','Intensidade/irritabilidade e início da crise','Correlação entre sintomas e imagem quando disponível'],
      complementar:['Força conforme tolerância','Ultrassom/radiografia quando clinicamente indicado'],
      evitar:['Não atribuir sintomas a depósito calcificado incidental sem correlação clínica']
    },
    ombro_pmr:{
      essencial:['Idade >=50','Bilateralidade','Duração da rigidez matinal','Sintomas sistêmicos e cintura pélvica','Decisão de encaminhamento médico'],
      complementar:['Revisão de exames/laboratório quando disponíveis'],
      evitar:['Não conduzir como duas lesões locais de ombro antes de esclarecer padrão sistêmico']
    }
  };

  function textoContexto(c=contexto()){
    return [hmaTexto(),c?.origemIrradiacao||'',c?.irradiacao||'',c?.textoMedicamentos||'',c?.textoCirurgias||'',arr(c?.comorbidades).join(' '),c?.textoComorbidades||''].join(' ');
  }

  function pontuar(cond,texto,c){
    const t=norm(texto);
    const hits=arr(VOCABULARIO_COMPILADO[cond.id]).filter(x=>x.normalizado&&t.includes(x.normalizado)).map(x=>x.raw);
    let score=Math.min(9,hits.length*1.35);
    const idade=Number(c?.idade||document.getElementById('paciente_idade')?.value||0);
    const temOmbro=/ombro|braco|deltoid|escapul/.test(t);
    const traumaMecanismo=/\b(?:cai|caiu|cair|queda|impacto|acidente|luxacao|deslocou|deslocamento)\b|\bpancad\w*/.test(t);
    const traumaNegado=/(?:sem|nega|negou|nao houve).{0,18}(?:cair|queda|trauma|pancad|impacto)/.test(t);
    const trauma=traumaMecanismo&&!traumaNegado&&temOmbro;
    const incapacidadeAguda=/(?:nao consegue|nao levanta|deform|pendurado|perdeu.{0,20}forca|fraqueza.{0,20}repente)/.test(t);
    const neuroDistal=/(?:formig|dormen|adormec|amortec|choque).{0,55}(?:mao|dedo|polegar|indicador|anelar|mindinho)|(?:mao|dedo|polegar|indicador|anelar|mindinho).{0,55}(?:formig|dormen|adormec|amortec|choque)/.test(t);
    const cervicalLigada=/(?:pescoco|nuca|cervic).{0,80}(?:ombro|braco|mao|dedo)|(?:virar|mexer|olhar).{0,30}(?:pescoco|cima).{0,80}(?:dor|braco|mao)/.test(t);
    const elevacao=/(?:levantar|levanto|elev|ergu|acima da cabeca|no alto|prateleira|armario)/.test(t);
    const lateral=/(?:lateral|lado de fora|deltoid)/.test(t);
    const decubito=/(?:dormir|deitar|apoiar).{0,45}(?:ombro|braco)|(?:ombro|braco).{0,45}(?:dormir|deitar|apoiar)/.test(t);
    const acSuperior=/(?:ossinho|clavicul|topo|ponta).{0,35}ombro|ombro.{0,35}(?:ossinho|clavicul|topo|ponta)/.test(t);
    const cruzarBraco=/(?:mao|braco).{0,35}(?:ombro contrario|outro ombro)|(?:cruzar|abracar).{0,30}braco/.test(t);
    const passivoPreservado=/(?:passiv).{0,30}(?:preserv|livre|vai|consegue)|(?:alguem consegue|outra pessoa consegue|levanto com a outra mao).{0,45}(?:levantar|erguer|braco)/.test(t)&&!/(?:alguem|outra pessoa).{0,25}(?:tambem )?nao consegue/.test(t);
    const perdaAtivaPassiva=/(?:nao consigo|nao consegue).{0,40}(?:erguer|levantar)|(?:braco despenca|nao sustenta o braco)/.test(t)&&passivoPreservado;

    if(cond.id==='ombro_pmr'&&idade>=50)score+=2;
    if(cond.id==='ombro_capsulite'&&(c?.diabetico||/diabet|tireo/.test(t)))score+=1.3;
    if(cond.id==='ombro_trauma_maior'&&trauma)score+=incapacidadeAguda?4.2:2.8;
    if(cond.id==='ombro_cervical_referida'){
      if(neuroDistal)score+=3.1;
      if(cervicalLigada)score+=2.2;
    }
    if(cond.id==='ombro_manguito'&&temOmbro){
      if(elevacao&&lateral)score+=3.2;
      else if(elevacao&&/(dor|doi)/.test(t))score+=2.7;
      if(decubito&&/(dor|doi)/.test(t))score+=1.2;
    }
    if(cond.id==='ombro_ac'){
      if(acSuperior)score+=2.9;
      if(cruzarBraco)score+=1.7;
    }
    if(cond.id==='ombro_ruptura_manguito'&&perdaAtivaPassiva)score+=4;
    return {score:score+cond.ordem/1000,hits:hits.slice(0,5)};
  }

  function itemBancoPorCondicao(cond){
    if(ITEM_BANCO_CACHE.has(cond.id))return ITEM_BANCO_CACHE.get(cond.id);
    try{
      const reg=typeof BANCO_MAPEAMENTO_CLINICO!=='undefined'?BANCO_MAPEAMENTO_CLINICO?.ombro:null;
      const itens=[...arr(reg?.clusters),...arr(reg?.diferenciais)];
      const item=itens.find(item=>cond.nomes.some(rx=>rx.test(norm(item?.nome||''))))||null;
      ITEM_BANCO_CACHE.set(cond.id,item);
      return item;
    }catch(_){return null;}
  }

  function testeNome(t){return typeof t==='string'?t:String(t?.nome||t?.teste||t?.titulo||t?.descricao||'').trim();}

  function criarHipotese(cond,p,c){
    const item=itemBancoPorCondicao(cond);
    const perguntas=cond.perguntas.slice();
    const objetivos=cond.objetivos.slice();
    const testes=arr(item?.testes).map(testeNome).filter(Boolean);
    const matriz=MATRIZ_EXAME[cond.id]||{essencial:[],complementar:[],evitar:[]};
    return {
      id:item?.id||cond.id,
      regiaoId:'ombro',
      regiaoNome:'Ombro',
      grupo:item?.regraConfirmacao||item?.limiar?'cluster':'diferencial',
      nome:item?.nome||cond.rotulo,
      prioridadeOrdenacao:Number((p.score+2).toFixed(2)),
      aFavor:p.hits.length?p.hits.map(x=>`Relato: ${x}`):['Padrão ainda depende de perguntas discriminativas'],
      contra:[],
      aConfirmar:uniq([...perguntas.slice(0,3),...matriz.essencial.slice(0,3),...objetivos.slice(0,2)]),
      testes,
      regraConfirmacao:item?.regraConfirmacao?.descricao||item?.regraConfirmacao||'',
      interpretacao:String(item?.interpretacao||''),
      evidencia:String(item?.evidencia||''),
      origemHMA:p.hits.length>0,
      item:item||{id:cond.id,nome:cond.rotulo,testes},
      motor31:{condicaoId:cond.id,perguntas,objetivos,frasesReconhecidas:p.hits,urgente:!!cond.urgente,reforca:cond.reforca,enfraquece:cond.enfraquece,matrizExame:matriz}
    };
  }

  function planoOmbroEspecialista(plano){
    if(!plano||plano.insuficiente)return plano;
    const temOmbro=arr(plano.regioes).some(r=>r.id==='ombro')||/ombro|escapul|deltoid|braco/.test(norm(hmaTexto()));
    if(!temOmbro)return plano;
    const c=contexto(); const texto=textoContexto(c);
    const relatoDecubito=PADRAO_DECUBITO_OMBRO.test(norm(hmaTexto()));
    const avaliadas=CONDICOES.map(cond=>({cond,...pontuar(cond,texto,c)})).sort((a,b)=>b.score-a.score);
    const fortes=avaliadas.filter(x=>x.hits.length||x.score>=2.5).slice(0,6);
    const especialistas=fortes.map(x=>criarHipotese(x.cond,x,c));

    const existentes=arr(plano.hipoteses).filter(h=>h.regiaoId!=='ombro');
    const ombroBase=arr(plano.hipoteses).filter(h=>h.regiaoId==='ombro');
    const mapa=new Map();
    [...especialistas,...ombroBase].forEach(h=>{
      const k=norm(h.nome);
      if(!mapa.has(k))mapa.set(k,h);
      else if(h.motor31)mapa.set(k,{...mapa.get(k),...h});
    });
    const ombroFinal=Array.from(mapa.values()).sort((a,b)=>Number(b.prioridadeOrdenacao||0)-Number(a.prioridadeOrdenacao||0)).slice(0,6);
    plano.hipoteses=[...ombroFinal,...existentes].sort((a,b)=>Number(b.prioridadeOrdenacao||0)-Number(a.prioridadeOrdenacao||0));

    const perguntas=uniq([...(relatoDecubito?[PERGUNTA_DECUBITO_OMBRO]:[]),...BASE_PERGUNTAS,...fortes.flatMap(x=>x.cond.perguntas)]).slice(0,14);
    const objetivos=uniq([...(relatoDecubito?[OBJETIVO_DECUBITO_OMBRO]:[]),...fortes.flatMap(x=>x.cond.objetivos)]).slice(0,16);
    const segurancaExtra=fortes.filter(x=>x.cond.urgente).map(x=>({titulo:x.cond.rotulo,descricao:`Padrão histórico que merece exclusão prioritária. Pergunte: ${x.cond.perguntas[0]}`}));
    plano.exame.seguranca=uniqObj([...(plano.exame.seguranca||[]),...segurancaExtra]);
    plano.exame.perguntasDirigidasOmbro=perguntas;
    plano.exame.objetivosOmbro=objetivos;
    plano.exame.familiasOmbro=fortes.map(x=>({id:x.cond.id,nome:x.cond.rotulo,frases:x.hits,perguntas:x.cond.perguntas,objetivos:x.cond.objetivos,urgente:!!x.cond.urgente,matrizExame:MATRIZ_EXAME[x.cond.id]||{essencial:[],complementar:[],evitar:[]}}));
    plano.exame.matrizOmbro=plano.exame.familiasOmbro.map(x=>({id:x.id,nome:x.nome,...x.matrizExame}));
    plano.motor31={versao:VERSION,regiao:'ombro',frasesReconhecidas:uniq([...(relatoDecubito?['relação com decúbito sobre ombro/membro superior']:[]),...fortes.flatMap(x=>x.hits)]),perguntas,condicoes:plano.exame.familiasOmbro,aviso:'Palavras e frases da HMA orientam investigação; não equivalem a diagnóstico.'};
    plano.motores31={...(plano.motores31||{}),ombro:plano.motor31};

    const extras=[];
    const objetivosExame=uniq([
      ...fortes.flatMap(x=>arr(MATRIZ_EXAME[x.cond.id]?.essencial)),
      ...objetivos,
      ...fortes.flatMap(x=>arr(MATRIZ_EXAME[x.cond.id]?.complementar))
    ]);
    objetivosExame.forEach((o,i)=>extras.push({texto:o,tipo:classificarObjetivo(o),hipoteses:fortes.slice(0,3).map(x=>x.cond.rotulo),prioridade:12-i/100,motor31:true}));
    const testeMap=new Map();
    [...extras,...arr(plano.exame.testesPrioritarios)].forEach(t=>{const k=norm(t.texto);if(k&&!testeMap.has(k))testeMap.set(k,t);});
    plano.exame.testesPrioritarios=Array.from(testeMap.values()).slice(0,14);
    plano.exame.analises=agrupar(plano.exame.testesPrioritarios);
    plano.lacunas=uniq([...arr(plano.lacunas),...perguntas.slice(0,5).map(q=>`Ombro: ${q}`)]).slice(0,12);
    return plano;
  }

  function uniqObj(lista){
    const m=new Map();arr(lista).forEach(x=>{const k=norm(`${x?.titulo||''}|${x?.descricao||''}`);if(k&&!m.has(k))m.set(k,x);});return Array.from(m.values());
  }
  function classificarObjetivo(t=''){
    const s=norm(t);
    if(/cervical|neuro|dermat|miot|reflex|neurodin/.test(s))return'neurologica';
    if(/adm|amplitude|rotacao|mobilidade|passiv|ativ/.test(s))return'mobilidade';
    if(/forca|resist|carga|dinam|contrat/.test(s))return'forca_carga';
    if(/funcao|esporte|arremesso|controle motor|posicao de risco/.test(s))return'funcional';
    if(/palpac|inspec|deform|crepit/.test(s))return'inspecao';
    return'ortopedico';
  }
  const ROT={neurologica:'Exame neurológico / cervical',mobilidade:'Mobilidade e ADM',forca_carga:'Força e tolerância à carga',funcional:'Função e controle',inspecao:'Inspeção / palpação',ortopedico:'Testes e diferenciação clínica'};
  function agrupar(itens){
    const g={};arr(itens).forEach(t=>(g[t.tipo]||(g[t.tipo]=[])).push(t));
    return Object.entries(g).map(([tipo,x])=>({tipo,titulo:ROT[tipo]||tipo,itens:x}));
  }

  function renderPerguntas(plano){
    const host=document.getElementById('ks31_shoulder_interview');
    if(!host)return;
    const m=plano?.motores31?.ombro||(plano?.motor31?.regiao==='ombro'?plano.motor31:null);
    if(!m){host.hidden=true;host.innerHTML='';return;}
    host.hidden=false;
    const matriz=arr(plano?.exame?.matrizOmbro).slice(0,4);
    const assinatura=JSON.stringify({v:VERSION,c:m.condicoes.map(x=>x.id),f:m.frasesReconhecidas,p:m.perguntas.slice(0,10),mx:matriz.map(x=>x.id)});
    if(host.dataset.ks31Signature===assinatura)return;
    host.dataset.ks31Signature=assinatura;
    host.innerHTML=`<header><div><span>Motor 3.1 · Ombro</span><strong>Perguntas que refinam a hipótese antes dos testes</strong></div><small>${m.condicoes.length} família(s) em investigação</small></header><div class="ks31-question-grid">${m.perguntas.slice(0,10).map((q,i)=>`<div><b>${i+1}</b><span>${esc(q)}</span></div>`).join('')}</div>${matriz.length?`<div class="ks31-exam-matrix"><strong>Exame por finalidade</strong>${matriz.map(x=>`<details><summary>${esc(x.nome)}</summary><div><b>Essencial</b>${arr(x.essencial).map(v=>`<p>${esc(v)}</p>`).join('')}<b>Complementar</b>${arr(x.complementar).map(v=>`<p>${esc(v)}</p>`).join('')}${arr(x.evitar).length?`<b>Cautela</b>${arr(x.evitar).map(v=>`<p>${esc(v)}</p>`).join('')}`:''}</div></details>`).join('')}</div>`:''}<footer>Use as respostas para mudar a prioridade das hipóteses. Uma frase isolada do paciente não confirma estrutura ou diagnóstico.</footer>`;
  }
  function esc(v=''){return String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;');}

  function garantirUI(){
    const etapa2=document.getElementById('subtela_mapeamento');
    if(etapa2&&!document.getElementById('ks31_shoulder_interview')){
      const el=document.createElement('section');el.id='ks31_shoulder_interview';el.className='ks31-shoulder-interview';el.hidden=true;
      const p=document.getElementById('ks30_exam_plan');
      if(p)p.insertAdjacentElement('afterend',el);else etapa2.insertAdjacentElement('afterbegin',el);
    }
  }

  window.enriquecerPlanoOmbroKineSys=planoOmbroEspecialista;
  window.KineSysMotor31Ombro={version:VERSION,condicoes:CONDICOES,perguntasBase:BASE_PERGUNTAS,enriquecer:planoOmbroEspecialista};
  document.addEventListener('kinesys:motor3-plano-atualizado',()=>{
    garantirUI();
    const p=window.KineSysMotorClinico3?.ultimoPlano;
    if(p)renderPerguntas(p);
  });
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',garantirUI,{once:true});else garantirUI();
})();
