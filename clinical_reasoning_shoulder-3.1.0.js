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

  const VERSION='3.1.0-shoulder1';
  const norm=(v='')=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').replace(/\s+/g,' ').trim();
  const arr=v=>Array.isArray(v)?v:[];
  const uniq=v=>Array.from(new Set(arr(v).filter(Boolean)));
  const hmaTexto=()=>String(document.getElementById('paciente_hma')?.value||'');
  const contem=(texto,termos)=>{
    const t=norm(texto);
    return arr(termos).filter(x=>t.includes(norm(x)));
  };
  const contexto=()=>{try{return typeof coletarContextoClinico==='function'?(coletarContextoClinico()||{}):{};}catch(_){return{};}};

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

  function textoContexto(){
    const c=contexto();
    return [hmaTexto(),c?.origemIrradiacao||'',c?.irradiacao||'',c?.textoMedicamentos||'',c?.textoCirurgias||'',arr(c?.comorbidades).join(' '),c?.textoComorbidades||''].join(' ');
  }

  function pontuar(cond,texto,c){
    const hits=contem(texto,cond.termos);
    let score=Math.min(9,hits.length*1.35);
    const idade=Number(c?.idade||document.getElementById('paciente_idade')?.value||0);
    if(cond.id==='ombro_pmr'&&idade>=50)score+=2;
    if(cond.id==='ombro_capsulite'&&(c?.diabetico||/diabet|tireo/.test(norm(texto))))score+=1.3;
    if(cond.id==='ombro_trauma_maior'&&/trauma|queda|lux|acidente|pancada/.test(norm(texto)))score+=2;
    if(cond.id==='ombro_cervical_referida'&&/(formig|dormen|choque|mao|dedos|pescoco)/.test(norm(texto)))score+=1.5;
    return {score:score+cond.ordem/1000,hits:hits.slice(0,5)};
  }

  function itemBancoPorCondicao(cond){
    try{
      const reg=typeof BANCO_MAPEAMENTO_CLINICO!=='undefined'?BANCO_MAPEAMENTO_CLINICO?.ombro:null;
      const itens=[...arr(reg?.clusters),...arr(reg?.diferenciais)];
      return itens.find(item=>cond.nomes.some(rx=>rx.test(norm(item?.nome||''))))||null;
    }catch(_){return null;}
  }

  function testeNome(t){return typeof t==='string'?t:String(t?.nome||t?.teste||t?.titulo||t?.descricao||'').trim();}

  function criarHipotese(cond,p,c){
    const item=itemBancoPorCondicao(cond);
    const perguntas=cond.perguntas.slice();
    const objetivos=cond.objetivos.slice();
    const testes=arr(item?.testes).map(testeNome).filter(Boolean);
    return {
      id:item?.id||cond.id,
      regiaoId:'ombro',
      regiaoNome:'Ombro',
      grupo:item?.regraConfirmacao||item?.limiar?'cluster':'diferencial',
      nome:item?.nome||cond.rotulo,
      prioridadeOrdenacao:Number((p.score+2).toFixed(2)),
      aFavor:p.hits.length?p.hits.map(x=>`Relato: ${x}`):['Padrão ainda depende de perguntas discriminativas'],
      contra:[],
      aConfirmar:uniq([...perguntas.slice(0,3),...objetivos.slice(0,2)]),
      testes,
      regraConfirmacao:item?.regraConfirmacao?.descricao||item?.regraConfirmacao||'',
      interpretacao:String(item?.interpretacao||''),
      evidencia:String(item?.evidencia||''),
      origemHMA:p.hits.length>0,
      item:item||{id:cond.id,nome:cond.rotulo,testes},
      motor31:{condicaoId:cond.id,perguntas,objetivos,frasesReconhecidas:p.hits,urgente:!!cond.urgente,reforca:cond.reforca,enfraquece:cond.enfraquece}
    };
  }

  function planoOmbroEspecialista(plano){
    if(!plano||plano.insuficiente)return plano;
    const temOmbro=arr(plano.regioes).some(r=>r.id==='ombro')||/ombro|escapul|deltoid|braco/.test(norm(hmaTexto()));
    if(!temOmbro)return plano;
    const c=contexto(); const texto=textoContexto();
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

    const perguntas=uniq([...BASE_PERGUNTAS,...fortes.flatMap(x=>x.cond.perguntas)]).slice(0,14);
    const objetivos=uniq(fortes.flatMap(x=>x.cond.objetivos)).slice(0,16);
    const segurancaExtra=fortes.filter(x=>x.cond.urgente).map(x=>({titulo:x.cond.rotulo,descricao:`Padrão histórico que merece exclusão prioritária. Pergunte: ${x.cond.perguntas[0]}`}));
    plano.exame.seguranca=uniqObj([...(plano.exame.seguranca||[]),...segurancaExtra]);
    plano.exame.perguntasDirigidasOmbro=perguntas;
    plano.exame.objetivosOmbro=objetivos;
    plano.exame.familiasOmbro=fortes.map(x=>({id:x.cond.id,nome:x.cond.rotulo,frases:x.hits,perguntas:x.cond.perguntas,objetivos:x.cond.objetivos,urgente:!!x.cond.urgente}));
    plano.motor31={versao:VERSION,regiao:'ombro',frasesReconhecidas:uniq(fortes.flatMap(x=>x.hits)),perguntas,condicoes:plano.exame.familiasOmbro,aviso:'Palavras e frases da HMA orientam investigação; não equivalem a diagnóstico.'};

    const extras=[];
    objetivos.forEach((o,i)=>extras.push({texto:o,tipo:classificarObjetivo(o),hipoteses:fortes.slice(0,3).map(x=>x.cond.rotulo),prioridade:12-i/100,motor31:true}));
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
    const m=plano?.motor31;
    if(!m||m.regiao!=='ombro'){host.hidden=true;host.innerHTML='';return;}
    host.hidden=false;
    host.innerHTML=`<header><div><span>Motor 3.1 · Ombro</span><strong>Perguntas que refinam a hipótese antes dos testes</strong></div><small>${m.condicoes.length} família(s) em investigação</small></header><div class="ks31-question-grid">${m.perguntas.slice(0,10).map((q,i)=>`<div><b>${i+1}</b><span>${esc(q)}</span></div>`).join('')}</div><footer>Use as respostas para mudar a prioridade das hipóteses. Uma frase isolada do paciente não confirma estrutura ou diagnóstico.</footer>`;
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
