/* ============================================================================
   KineSys — Motor Clínico 3.1 | Coluna Cervical
   Enriquecedor regional sobre o contrato existente do Motor 3.0.

   Princípios:
   - mantém a região estrutural existente `cervical`;
   - HMA prioriza investigação, não fecha diagnóstico anatômico;
   - segurança precede classificação musculoesquelética;
   - sinais isolados não confirmam radiculopatia, mielopatia ou cefaleia cervical;
   - sintomas de membro superior exigem comparação com ombro/cotovelo/punho-mão;
   - cefaleia/tontura associadas ao pescoço não são automaticamente cervicogênicas;
   - não utiliza testes posicionais vertebrobasilares como "liberação" para terapia manual.
   ============================================================================ */
(function instalarMotor31Cervical(){
  'use strict';

  const VERSION='3.1.0-cervical1';
  const n=(v='')=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').replace(/\s+/g,' ').trim()
    .replace(/\bpescoco duro\b/g,'rigidez no pescoco')
    .replace(/\bnuca dura\b/g,'rigidez na nuca')
    .replace(/\bmao boba\b/g,'mao desajeitada')
    .replace(/\bdedao\b/g,'polegar')
    .replace(/\bn\b/g,'nao');
  const arr=v=>Array.isArray(v)?v:[];
  const uniq=v=>Array.from(new Set(arr(v).filter(Boolean)));
  const hma=()=>String(document.getElementById('paciente_hma')?.value||'');
  const contexto=()=>{try{return typeof coletarContextoClinico==='function'?(coletarContextoClinico()||{}):{};}catch(_){return{};}};
  const banco=()=>{try{return typeof BANCO_MAPEAMENTO_CLINICO!=='undefined'?BANCO_MAPEAMENTO_CLINICO?.cervical:null;}catch(_){return null;}};
  const cacheBanco=new Map();
  const relatoTerceiro=(v='')=>/(?:minha|meu)\s+(?:mae|pai|esposa|marido|companheira|companheiro|irma|irmao|avo|filha|filho)\b/.test(n(v));
  const hmaPacienteAtual=()=>String(hma()).split(/[.!?;\n]+/).filter(x=>x.trim()&&!relatoTerceiro(x)).join(' ');

  const REFERENCIAS=[
    {ano:2017,titulo:'Neck Pain: Revision 2017 Clinical Practice Guidelines',uso:'classificação clínica, radiculopatia, mobilidade e coordenação do movimento'},
    {ano:2003,titulo:'Reliability and diagnostic accuracy of the clinical examination and patient self-report measures for cervical radiculopathy',uso:'cluster clínico de radiculopatia cervical'},
    {ano:2017,titulo:'Clinical Practice Guideline for Degenerative Cervical Myelopathy',uso:'triagem e encaminhamento de suspeita de mielopatia cervical degenerativa'},
    {ano:2020,titulo:'International IFOMPT Cervical Framework',uso:'raciocínio de risco vascular e segurança antes de intervenção cervical'},
    {ano:2001,titulo:'The Canadian C-Spine Rule for Radiography in Alert and Stable Trauma Patients',uso:'contexto de trauma cervical e necessidade de avaliação médica/imagem'},
    {ano:2018,titulo:'ICHD-3 — Headache attributed to disorder of the neck',uso:'diferenciação causal de cefaleia cervicogênica'}
  ];

  const BASE_PERGUNTAS=[
    'A dor é predominantemente no pescoço/nuca ou também desce para escápula, ombro, braço, mão ou dedos?',
    'Há formigamento, dormência, choque, fraqueza ou perda de destreza? Em quais dedos e tarefas?',
    'Virar, inclinar, estender ou flexionar o pescoço modifica a mesma dor ou os sintomas do braço/mão?',
    'Há dificuldade nova para caminhar, desequilíbrio, pernas pesadas, tropeços ou mãos desajeitadas/derrubando objetos?',
    'Há alteração urinária/intestinal nova associada a piora neurológica ou sintomas em vários membros?',
    'A dor/cefaleia começou de forma súbita, muito intensa ou diferente do habitual? Houve visão dupla, fala/engolir alterados, ataxia ou ptose?',
    'Houve trauma relevante, acidente, mergulho, queda, impacto ou mecanismo de aceleração-desaceleração? Quando?',
    'Há febre, calafrios, imunossupressão, infecção recente, cirurgia recente ou uso de drogas intravenosas?',
    'Há história pessoal de câncer, perda de peso inexplicada, dor noturna progressiva ou dor pouco relacionada ao movimento?',
    'Existe artrite reumatoide, doença inflamatória, síndrome do tecido conjuntivo ou cirurgia cervical alta?',
    'Se existe cefaleia: ela começa no pescoço/nuca e é reproduzida por movimento cervical, ou é pulsátil com náusea/foto-fonofobia?',
    'Se existe tontura: é nova/abrupta e acompanhada de sinais neurológicos, ou parece posicional/vestibular? Não presumir origem cervical.',
    'Houve cirurgia cervical? Qual procedimento, nível, data, restrições e evolução neurológica?',
    'Ombro, cotovelo ou punho/mão reproduzem melhor os sintomas distais do que a cervical?'
  ];

  const C=(id,ordem,rotulo,op={})=>({id,ordem,rotulo,urgente:false,bancoId:id,minScore:2.2,termos:[],perguntas:[],objetivos:[],reforca:[],enfraquece:[],...op});
  const CONDICOES=[
    C('cervical_vascular_suspeita',130,'Patologia vascular cervical/craniana — excluir imediatamente',{urgente:true,bancoId:null,minScore:4.6,termos:['dor cervical subita muito intensa','pior dor da vida na nuca','dor nova no pescoco com visao dupla','dor na nuca com fala enrolada','dor cervical com ptose e pupila pequena'],perguntas:['O início foi súbito/máximo rapidamente e diferente do habitual?','Há diplopia, disartria, disfagia, ataxia, nistagmo novo, déficit focal ou síndrome de Horner?'],objetivos:['Interromper provocação cervical e priorizar avaliação médica urgente quando o padrão for plausível','Não usar teste posicional vertebrobasilar como critério de liberação para manipulação'],reforca:['dor nova súbita/intensa','sinais neurológicos cranianos/focais'],enfraquece:['quadro recorrente mecânico familiar sem sinais neurológicos']}),
    C('cervical_trauma_estrutural',126,'Trauma cervical estrutural / fratura-luxação — excluir',{urgente:true,bancoId:null,minScore:4.3,termos:['trauma forte no pescoco','acidente com dor cervical intensa','queda com dor no meio do pescoco','mergulho com dor cervical','pescoco deformado depois do trauma'],perguntas:['Qual foi o mecanismo e a energia do trauma?','Há dor cervical mediana intensa, deformidade, parestesia, fraqueza ou incapacidade importante de mover?'],objetivos:['Evitar testes provocativos até excluir lesão estrutural quando indicado','Definir necessidade de avaliação médica/imagem segundo contexto de trauma e regras clínicas apropriadas'],reforca:['trauma relevante','dor mediana/incapacidade','déficit neurológico após trauma']}),
    C('cervical_infeccao',124,'Infecção cervical / espondilodiscite — excluir prioritariamente',{urgente:true,bancoId:null,minScore:4.2,termos:['febre com dor cervical forte','dor no pescoco com calafrio','dor cervical e infeccao recente','dor cervical em imunossuprimido'],perguntas:['Há febre/calafrios, infecção recente, imunossupressão, cirurgia/procedimento recente ou uso de drogas IV?','A dor é progressiva, constante e pouco mecânica?'],objetivos:['Avaliar estado geral e evitar tratamento musculoesquelético que atrase investigação médica','Encaminhar quando sinais sistêmicos e dor cervical forem coerentes com infecção'],reforca:['febre/sinais sistêmicos','fatores de risco infeccioso','dor não mecânica progressiva']}),
    C('cervical_neoplasia_suspeita',122,'Neoplasia / comprometimento ósseo cervical — excluir',{urgente:true,bancoId:null,minScore:4.2,termos:['cancer e dor cervical progressiva','perda de peso com dor no pescoco','dor cervical noturna constante','dor cervical em paciente oncologico'],perguntas:['Há história pessoal de câncer ou investigação oncológica atual?','Existe perda de peso inexplicada, dor noturna progressiva ou dor pouco relacionada ao movimento?'],objetivos:['Identificar padrão sistêmico/não mecânico e necessidade de investigação médica','Não atribuir dor progressiva com fatores oncológicos a alteração postural ou muscular isolada'],reforca:['história pessoal de câncer','perda de peso','dor progressiva não mecânica']}),
    C('mielopatia_cervical_suspeita',120,'Suspeita de Mielopatia Cervical Degenerativa',{urgente:true,minScore:3.5,termos:['maos desajeitadas','derrubando objetos','dificuldade para andar','pernas pesadas','tropecando','choque ao flexionar pescoco','sintomas nos quatro membros'],perguntas:['Há perda progressiva de destreza fina, marcha/equilíbrio ou sintomas bilaterais/multissegmentares?','Há urgência/retenção urinária ou alteração intestinal nova junto com piora neurológica?'],objetivos:['Exame neurológico completo de membros superiores e inferiores','Avaliar marcha, equilíbrio, destreza, reflexos, clônus e sinais de trato longo em conjunto','Encaminhar para avaliação médica especializada quando a suspeita for consistente']}),
    C('cervical_posop_complicacao',118,'Complicação pós-operatória cervical — excluir',{urgente:true,bancoId:null,minScore:4.2,termos:['depois da cirurgia cervical piorou a fraqueza','cirurgia cervical e febre','cirurgia cervical com secrecao','disfagia piorando depois da cirurgia cervical'],perguntas:['Após a cirurgia houve nova fraqueza/dormência, febre, secreção, disfagia progressiva ou dor desproporcional?'],objetivos:['Comparar déficit atual ao estado pré/pós-operatório imediato','Priorizar contato com equipe cirúrgica/avaliação médica quando houver deterioração neurológica ou sinais de complicação']}),
    C('instabilidade_craniocervical',115,'Instabilidade Craniocervical — hipótese de segurança',{urgente:false,minScore:3.6,termos:['instabilidade no pescoco','artrite reumatoide e pescoco instavel','ehlers danlos e pescoco instavel','pescoco parece sair do lugar'],perguntas:['Há trauma importante, doença inflamatória/tecido conjuntivo ou cirurgia cervical alta?','Existem sintomas neurológicos, sensação de instabilidade ou apreensão incompatíveis com quadro mecânico simples?'],objetivos:['Priorizar história/fatores de risco e exame neurológico','Evitar confiar em teste ligamentar isolado para autorizar manipulação']}),
    C('pos_operatorio_cervical',108,'Pós-operatório Cervical — artrodese / discectomia / descompressão',{minScore:2.8,termos:['artrodese cervical','discectomia cervical','cirurgia cervical','pos operatorio cervical','descompressao cervical'],perguntas:['Qual procedimento, data, níveis e restrições atuais?','Como estão dor, função e déficit neurológico em relação ao pré-operatório?'],objetivos:['Respeitar restrições do cirurgião e fase de consolidação','Quantificar função, ADM/tolerância e estado neurológico sem progressão automática por tempo']}),
    C('radiculopatia_cervical',104,'Radiculopatia Cervical — cluster de exame',{minScore:3.0,termos:['formigamento no braco','formigamento na mao','dormencia no braco','choque descendo pelo braco','dor do pescoco ate a mao','fraqueza no braco'],perguntas:['A dor/parestesia segue distribuição consistente e é modificada pela cervical?','Há alteração de miótomo, dermátomo ou reflexo concordante?'],objetivos:['Mapear dermátomos, miótomos e reflexos','Interpretar Spurling, distração, ULTT e rotação cervical em conjunto, não isoladamente','Comparar com neuropatias periféricas e dor de ombro/cotovelo/punho']}),
    C('dor_cervical_padrao_irradiado',100,'Dor Cervical com Padrão Irradiado — sem confirmação radicular',{minScore:2.8,termos:['dor do pescoco para o ombro','dor do pescoco para escapula','dor do pescoco para o braco','pescoco irradia'],perguntas:['A dor irradiada é modificada pela cervical sem déficit sensitivo/motor/reflexo?'],objetivos:['Reproduzir/modificar a dor com movimento cervical de forma graduada','Manter exame neurológico para não perder radiculopatia emergente']}),
    C('dor_cervical_coordenacao_movimento',98,'Dor Cervical com Déficit de Coordenação do Movimento / pós-trauma',{minScore:3.0,termos:['whiplash','chicote cervical','batida de carro','acidente de carro','dor cervical apos acidente'],perguntas:['O quadro começou após aceleração-desaceleração e persistem intolerância ao movimento, fadiga ou alteração de controle?','Há tontura, hipersensibilidade, sintomas de concussão ou sinais de segurança que mudam a prioridade?'],objetivos:['Excluir lesão estrutural/vascular/neurológica antes de classificar whiplash','Avaliar ROM, resistência/controle cervical, função e sintomas sensório-motores conforme irritabilidade']}),
    C('cefaleia_cervicogenica',96,'Cefaleia Cervicogênica — investigar relação causal',{minScore:3.0,termos:['dor de cabeca que comeca no pescoco','dor da nuca para a testa','cefaleia ao virar o pescoco','dor de cabeca piora mexendo o pescoco'],perguntas:['A cefaleia familiar começa/é reproduzida pela cervical e existe limitação concordante?','Há características migranosas ou red flags que expliquem melhor a cefaleia?'],objetivos:['Caracterizar a cefaleia antes dos testes cervicais','Avaliar ADM cervical e CFRT quando seguro, buscando reprodução da cefaleia familiar','Diferenciar de migrânea, tipo tensão, neuralgia occipital e causas secundárias']}),
    C('neuralgia_occipital',94,'Neuralgia Occipital — diferencial',{bancoId:null,minScore:3.0,termos:['choque na nuca','pontada na nuca','facada na nuca','dor occipital em choque','couro cabeludo sensivel na nuca'],perguntas:['A dor é paroxística em choque/pontada, com hipersensibilidade no trajeto occipital?'],objetivos:['Caracterizar duração, gatilhos e distribuição occipital','Diferenciar de cefaleia cervicogênica, migrânea e patologia secundária']}),
    C('lesao_muscular_cervical_aguda',90,'Lesão muscular cervical aguda / distensão — hipótese',{minScore:2.8,termos:['puxou o pescoco','distensao cervical','estiramento no pescoco','dor muscular cervical'],perguntas:['Houve movimento/carga aguda com dor focal sem trauma relevante ou déficit neurológico?'],objetivos:['Localizar tecido doloroso e reproduzir com carga/alongamento graduado','Excluir trauma estrutural e neurologia quando o mecanismo for relevante']}),
    C('dor_cervical_mecanica',86,'Dor Cervical Mecânica / com déficit de mobilidade',{minScore:2.6,termos:['dor no pescoco','dor cervical','cervicalgia','rigidez no pescoco','trava o pescoco','dor ao virar o pescoco'],perguntas:['Quais movimentos/posturas reproduzem e aliviam a dor?','Há limitação de ADM concordante sem padrão neurológico?'],objetivos:['Quantificar ADM e comportamento mecânico dos sintomas','Avaliar função e tolerância postural sem atribuir causalidade a postura isolada']})
  ];

  const MATRIZ_EXAME={
    cervical_vascular_suspeita:{essencial:['História de início, intensidade, novidade e evolução da dor/cefaleia','Screen neurológico/craniano conforme competência e urgência'],complementar:['Pressão arterial e sinais vitais quando apropriado','Encaminhamento médico urgente conforme padrão'],evitar:['Não realizar provocação, manipulação ou teste posicional vertebrobasilar para "liberar" tratamento']},
    cervical_trauma_estrutural:{essencial:['Mecanismo/energia do trauma e sintomas neurológicos','Inspeção e avaliação médica/imagem quando indicada'],complementar:['Aplicar regra clínica de trauma apropriada quando dentro do escopo'],evitar:['Não forçar ADM, testes de compressão ou manipulação antes de excluir instabilidade/fratura']},
    cervical_infeccao:{essencial:['Sinais sistêmicos, fatores de risco e evolução não mecânica','Estado neurológico e geral'],complementar:['Encaminhamento médico para investigação laboratorial/imagem'],evitar:['Não tratar como cervicalgia mecânica quando há padrão infeccioso plausível']},
    cervical_neoplasia_suspeita:{essencial:['História oncológica pessoal, perda de peso e comportamento não mecânico','Exame neurológico e avaliação médica'],complementar:['Imagem/investigação conforme avaliação médica'],evitar:['Não atribuir dor progressiva noturna a alteração muscular/postural isolada']},
    mielopatia_cervical_suspeita:{essencial:['Marcha/equilíbrio e destreza manual','Miótomos, dermátomos e reflexos em múltiplos segmentos','Hiperreflexia, clônus e sinais de trato longo interpretados em conjunto'],complementar:['Questionar função esfincteriana e progressão','Avaliação médica especializada'],evitar:['Não excluir mielopatia por Hoffmann negativo isolado']},
    cervical_posop_complicacao:{essencial:['Comparação neurológica com estado pré/pós-operatório','Ferida, febre, disfagia e dor desproporcional'],complementar:['Contato com equipe cirúrgica/encaminhamento'],evitar:['Não progredir carga/mobilização diante de piora neurológica ou complicação']},
    instabilidade_craniocervical:{essencial:['História de risco ligamentar/tecido conjuntivo e trauma','Exame neurológico e sinais de instabilidade'],complementar:['Avaliação médica/imagem quando a suspeita for relevante'],evitar:['Não usar Sharp-Purser/alar isolados como garantia de segurança']},
    pos_operatorio_cervical:{essencial:['Procedimento, níveis, data e restrições','Estado neurológico atual e função'],complementar:['ADM/tolerância conforme autorização','Medidas funcionais e retorno gradual'],evitar:['Não aplicar protocolo genérico sem considerar técnica e orientação cirúrgica']},
    radiculopatia_cervical:{essencial:['Dermátomos, miótomos e reflexos','Spurling, distração, ULTT e rotação cervical como cluster','Comparação com nervos periféricos e articulações distais'],complementar:['Força funcional e destreza','Imagem somente quando indicada pelo quadro/evolução'],evitar:['Não fechar nível radicular por parestesia isolada']},
    dor_cervical_padrao_irradiado:{essencial:['ADM cervical e modulação da dor irradiada','Screen neurológico normal/sem padrão radicular convincente'],complementar:['Mobilidade torácica/escapular conforme apresentação'],evitar:['Não rotular hérnia/raiz sem déficit ou cluster consistente']},
    dor_cervical_coordenacao_movimento:{essencial:['ROM cervical e tolerância ao movimento','Controle/resistência cervical e função','Screen de tontura/concussão/neurologia quando pertinente'],complementar:['Propriocepção/controle oculomotor conforme sintomas e escopo'],evitar:['Não classificar whiplash antes de excluir trauma grave/vascular quando aplicável']},
    cefaleia_cervicogenica:{essencial:['Fenótipo e red flags da cefaleia','ADM cervical com reprodução da cefaleia familiar','CFRT quando seguro e clinicamente indicado'],complementar:['Função cervical e resposta a modificação mecânica'],evitar:['Não chamar de cervicogênica só porque há dor cervical junto']},
    neuralgia_occipital:{essencial:['Caráter paroxístico/choque e distribuição occipital','Sensibilidade/alodinia focal no trajeto occipital'],complementar:['Screen neurológico e cefaleias primárias/secundárias'],evitar:['Não atribuir cefaleia contínua inespecífica a neuralgia occipital']},
    lesao_muscular_cervical_aguda:{essencial:['Dor focal e mecanismo de carga/movimento','Contração/alongamento graduado conforme irritabilidade'],complementar:['ADM e função'],evitar:['Não assumir distensão após trauma de alta energia sem excluir estrutura/neurologia']},
    dor_cervical_mecanica:{essencial:['ADM ativa e comportamento mecânico da dor','Exame neurológico de triagem quando indicado'],complementar:['NDI/medida funcional','Resistência e controle cervical conforme fase'],evitar:['Não usar postura isolada como diagnóstico causal']}
  };

  function textoContexto(c=contexto()){
    return [hmaPacienteAtual(),c?.origemIrradiacao||'',c?.irradiacao||'',c?.textoMedicamentos||'',c?.textoCirurgias||'',arr(c?.comorbidades).join(' '),c?.textoComorbidades||''].join(' ');
  }
  function negado(t,padrao){return new RegExp('(?:sem|nega(?:do|ou)?|nao(?:\\s+(?:houve|tem|tenho|teve|tive|sinto|sente|sentiu|apresenta|apresentou|esta|estou|ficou|e))?|nem)\\s*.{0,42}(?:'+padrao+')').test(t);}
  function hit(t,lista){return arr(lista).filter(x=>t.includes(n(x)));}
  const contar=xs=>xs.filter(Boolean).length;

  function pontuar(cond,texto,c){
    const t=n(texto);let hits=hit(t,cond.termos).slice(0,6);let score=Math.min(3,hits.length*1.15);const add=(v,m)=>{score+=v;if(m)hits.push(m);};
    const idade=Number(c?.idade||document.getElementById('paciente_idade')?.value||0);
    const temCervical=/pescoco|cervical|nuca|suboccip|occipital/.test(t);
    const dorCervical=/(?:dor|doi|dolor).{0,30}(?:pescoco|cervical|nuca)|(?:pescoco|cervical|nuca).{0,30}(?:dor|doi|dolor)|(?:rigidez|travamento|travado).{0,24}(?:pescoco|nuca|cervical)|(?:pescoco|nuca|cervical).{0,24}(?:rigidez|travamento|travado)/.test(t);
    const historiaRemotaResolvida=/(?:ha\s+)?\d+\s+anos?\b|anos?\s+atras/.test(t)&&/(?:recuperei|recuperou|fiquei\s+(?:bem|bom)|sem sequela|alta sem sequela|recebi alta|resolvido)/.test(t);
    const traumaNegado=negado(t,'queda|trauma|acidente|batida|pancada|mergulho|whiplash|chicote');
    const traumaMecanismo=/\b(?:queda|cai|caiu|acidente|batida|colisao|mergulho|impacto|trauma|whiplash|chicote cervical)\b|capot|pancad/.test(t);
    const traumaAtual=traumaMecanismo&&!traumaNegado&&!historiaRemotaResolvida;
    const traumaAltaEnergia=/(?:capot|mergulho|alta velocidade|queda de altura|acidente forte|colisao forte|moto|atropel)/.test(t);
    const dorMediana=/(?:meio|linha media|bem no centro).{0,24}(?:pescoco|cervical)|(?:pescoco|cervical).{0,24}(?:meio|linha media|bem no centro)/.test(t);
    const incapacidadeAguda=/(?:nao consigo|nao consegue|incapaz).{0,28}(?:mexer|virar|levantar)|deform/.test(t);

    const inicioSubitoNegado=/(?:nao|nem).{0,28}(?:comecou|inicio|foi).{0,22}(?:de repente|subit|repentin)|(?:nao foi|nao e).{0,22}(?:subit|repentin)/.test(t);
    const inicioSubito=/(?:subit|repentin|de repente|do nada|explod|maxima em segundos|pior dor da vida)/.test(t)&&!inicioSubitoNegado;
    const novaDiferenteNegada=/(?:nao e|nao foi|nao esta).{0,24}(?:nova|novo|diferente)|nao.{0,18}diferente do habitual/.test(t);
    const novaDiferente=/(?:nova|novo|diferente do habitual|nunca senti|pior dor|muito intensa|insuportavel)/.test(t)&&!novaDiferenteNegada;
    const neuroCranial=/(?:visao dupla|diplopia|fala enrolada|disartria|dificuldade para engolir|disfagia|ataxia|cambale|nistagmo|ptose|pupila pequena|horner|fraqueza de um lado|rosto torto|perda de visao)/.test(t)&&!negado(t,'visao dupla|diplopia|fala enrolada|disartria|disfagia|ataxia|nistagmo|ptose|horner|fraqueza de um lado|perda de visao');
    const dorCranioCervical=/(?:dor|cefaleia).{0,40}(?:pescoco|cervical|nuca|occipital|cabeca)|(?:pescoco|cervical|nuca|occipital|cabeca).{0,40}(?:dor|cefaleia)/.test(t);
    const vascularPositivo=dorCranioCervical&&((inicioSubito&&(novaDiferente||neuroCranial||traumaAtual))||(neuroCranial&&/(?:nova|subit|repentin|de repente|diferente)/.test(t)));
    const vascularNegado=negado(t,'visao dupla|diplopia|fala enrolada|disartria|disfagia|ataxia|nistagmo|ptose|horner|fraqueza focal')&&!inicioSubito;

    const febre=/(?:febre|calafrio)/.test(t)&&!negado(t,'febre|calafrio');
    const riscoInfeccao=/(?:imunossup|hiv|quimioterapia|transplante|droga intravenosa|drogas iv|infeccao recente|bacteremia|cirurgia cervical recente)/.test(t);
    const dorNaoMecanica=/(?:constante|nao muda com movimento|nao melhora em nenhuma posicao|progressiv|piora a noite|dor noturna)/.test(t)&&!negado(t,'constante|progressiva|dor noturna');
    const infeccaoPositiva=febre&&temCervical&&(riscoInfeccao||dorNaoMecanica||/rigidez intensa|muito rigido/.test(t));

    const cancerPessoal=/(?:tenho|tive|tratamento de|historia de|diagnostico de).{0,28}(?:cancer|tumor|neoplas)|(?:cancer|tumor|neoplas).{0,28}(?:em tratamento|metast|remissao|diagnostic)/.test(t)&&!relatoTerceiro(t);
    const perdaPeso=/(?:perdi|perda).{0,20}(?:peso|kg).{0,35}(?:sem querer|inexplic)|(?:perda de peso inexplic)/.test(t);
    const neoplasiaPositiva=cancerPessoal&&temCervical&&(perdaPeso||dorNaoMecanica);

    const destreza=/(?:maos? desajeitad|derrubando objetos|deixa cair objetos|dificuldade).{0,50}(?:abotoar|escrever|chave|talher)|(?:abotoar|escrever|chave|talher).{0,35}(?:dificuldade|piorou)/.test(t)&&!negado(t,'mao desajeitada|derruba objetos|dificuldade');
    const marcha=/(?:dificuldade para andar|cambale|tropec|equilibrio pior|pernas pesadas|marcha estranha)/.test(t)&&!negado(t,'dificuldade para andar|cambale|tropec|pernas pesadas|equilibrio');
    const tratoLongo=/(?:hiperreflexia|clonus|hoffmann|babinski|choque ao flexionar|lhermitte)/.test(t)&&!negado(t,'hiperreflexia|clonus|hoffmann|babinski|lhermitte');
    const bilateralMulti=/(?:duas maos|ambas as maos|dois bracos|bracos e pernas|quatro membros|varios membros|bilateral)/.test(t)&&/(?:formig|dormen|fraque|desajeit|choque)/.test(t);
    const esfincterCronicoEstavel=/(?:urgencia urinaria|incontinencia urinaria|retencao urinaria).{0,65}(?:ha muitos anos|ha \d+ anos|problema de prostata|sem mudanca recente)|(?:ha muitos anos|ha \d+ anos|problema de prostata).{0,65}(?:urgencia urinaria|incontinencia urinaria|retencao urinaria)/.test(t);
    const esfincter=/(?:urgencia urinaria|retencao urinaria|incontinencia urinaria|perdeu controle da urina|alteracao intestinal nova)/.test(t)&&!negado(t,'urgencia urinaria|retencao urinaria|incontinencia|alteracao intestinal')&&!esfincterCronicoEstavel;
    const dominiosMielo=contar([destreza,marcha,tratoLongo,bilateralMulti,esfincter]);

    const parestesiaNegada=negado(t,'formig\\w*|dormen\\w*|adormec\\w*|amortec\\w*|choque');
    const neuroDistal=/(?:formig|dormen|adormec|amortec|choque).{0,70}(?:braco|antebraco|mao|dedo|polegar|indicador|medio|anelar|mindinho)|(?:braco|antebraco|mao|dedo|polegar|indicador|medio|anelar|mindinho).{0,70}(?:formig|dormen|adormec|amortec|choque)/.test(t)&&!parestesiaNegada;
    const fraquezaDistal=/(?:fraqueza|perdeu forca|sem forca).{0,55}(?:braco|mao|dedo|triceps|biceps)|(?:braco|mao).{0,55}(?:fraqueza|perdeu forca)/.test(t)&&!negado(t,'fraqueza|perdeu forca|sem forca');
    const cervicalModula=/(?:virar|viro|vira|virou|mexer|mexo|mexe|inclinar|inclino|estender|estendo|olhar|olho).{0,30}(?:pescoco|cabeca).{0,70}(?:piora|melhora|aumenta|reduz|formig|choque|braco|mao)|(?:pescoco|cervical).{0,55}(?:piora|melhora|reproduz).{0,55}(?:braco|mao|formig|choque)/.test(t);
    const cervicalNaoModula=/(?:mexer|virar|inclinar).{0,30}(?:pescoco|cabeca).{0,35}(?:nao muda|nao piora|nao reproduz|sem efeito)/.test(t);
    const irradiacao=/(?:dor|sintoma).{0,20}(?:sai|parte|vem).{0,20}(?:pescoco|nuca).{0,80}(?:escapula|ombro|braco|antebraco|mao)|(?:pescoco|cervical).{0,45}(?:irradia|desce|vai).{0,55}(?:escapula|ombro|braco|mao)/.test(t);
    const medianoDistal=/(?:polegar|indicador|medio).{0,55}(?:dormen|formig)|(?:dormen|formig).{0,55}(?:polegar|indicador|medio)/.test(t)&&/(?:noite|madrugada|dirig|celular|sacud)/.test(t)&&!cervicalModula;
    const ulnarDistal=/(?:anelar|mindinho|quarto|quinto).{0,55}(?:dormen|formig)|(?:dormen|formig).{0,55}(?:anelar|mindinho|quarto|quinto)/.test(t)&&/(?:cotovelo.{0,20}(?:dobrad|dobro|flex)|(?:apoio|apoia|apoiado).{0,20}cotovelo|guidao|palma)/.test(t)&&!cervicalModula;
    const ombroLocal=/(?:dor|doi).{0,30}(?:lateral|lado de fora).{0,30}ombro|ombro.{0,30}(?:lateral|lado de fora)/.test(t)&&/(?:elevar|levantar|peso|acima da cabeca)/.test(t)&&!neuroDistal;

    const cefaleia=/(?:cefaleia|dor de cabeca|dor na cabeca)/.test(t);
    const cefaleiaOrigemNegada=/(?:cefaleia|dor de cabeca).{0,45}(?:nao comeca|nao parte|nao sai).{0,25}(?:pescoco|cervical|nuca)|(?:nao comeca|nao parte|nao sai).{0,30}(?:pescoco|cervical|nuca)/.test(t);
    const cefaleiaModulacaoNegada=/(?:mexer|virar|inclinar|estender).{0,35}(?:pescoco|cervical|cabeca).{0,38}(?:nao reproduz|nao piora|nao muda)|(?:cefaleia|dor de cabeca).{0,50}(?:nao reproduz|nao piora|nao muda).{0,28}(?:pescoco|cervical|virar|mexer)/.test(t);
    const cefaleiaParteCervical=cefaleia&&/(?:comeca|parte|sai).{0,25}(?:pescoco|cervical|nuca)|(?:pescoco|cervical|nuca).{0,35}(?:para|ate).{0,25}(?:testa|cabeca|olho)/.test(t)&&!cefaleiaOrigemNegada;
    const cefaleiaModulada=cefaleia&&/(?:virar|viro|vira|mexer|mexo|mexe|inclinar|estender).{0,30}(?:pescoco|cervical|cabeca).{0,45}(?:piora|reproduz|aumenta)|(?:piora|reproduz|aumenta).{0,30}(?:ao|quando).{0,15}(?:virar|mexer).{0,15}(?:pescoco|cervical)|(?:cefaleia|dor de cabeca).{0,50}(?:piora|reproduz).{0,28}(?:pescoco|cervical|virar|mexer)/.test(t)&&!cefaleiaModulacaoNegada;
    const migranoso=cefaleia&&/(?:latej|pulsatil)/.test(t)&&/(?:nausea|vomit|fotofobia|fonofobia|luz incomoda|barulho incomoda)/.test(t);
    const tensional=cefaleia&&/(?:faixa|aperto|pressao).{0,35}(?:cabeca|testa)|(?:bilateral|dos dois lados).{0,40}(?:cabeca|cefaleia)/.test(t)&&!cefaleiaModulada;
    const occipitalParox=/(?:choque|pontada|facada|fisgada).{0,35}(?:nuca|occipital|atras da cabeca)|(?:nuca|occipital).{0,35}(?:choque|pontada|facada|fisgada)/.test(t)&&!negado(t,'choque|pontada|facada|fisgada');

    const whiplash=/(?:whiplash|chicote cervical|batida de carro|acidente de carro|colisao traseira|bateu atras)/.test(t)&&traumaAtual;
    const esforcoMuscular=/(?:puxou|puxei|travou).{0,25}(?:pescoco|nuca)|(?:academia|treino|musculacao|levantando peso|carregando peso|movimento rapido).{0,50}(?:pescoco|cervical)/.test(t)&&!traumaAltaEnergia;
    const mecanicoLocal=dorCervical&&/(?:virar|viro|vira|virou|mexer|mexo|mexe|inclinar|inclino|olhar|olho|postura|computador|sentad|rigidez|travado|acordei|acordou)/.test(t)&&!neuroDistal;

    const cirurgiaCervical=/(?:artrodese|discectomia|descompressao|cirurgia).{0,35}cervical|cervical.{0,35}(?:artrodese|discectomia|descompressao|cirurgia)/.test(t);
    const posopComplicacao=cirurgiaCervical&&!historiaRemotaResolvida&&/(?:febre|secrecao|ferida abrindo|disfagia|dificuldade.{0,20}engolir|fraqueza.{0,24}(?:piorou|piora|nova)|nova.{0,20}fraqueza|dormencia.{0,24}(?:piorou|piora|nova))/.test(t)&&!negado(t,'febre|secrecao|disfagia|fraqueza.{0,24}(?:piorou|piora)|dormencia.{0,24}(?:piorou|piora)');
    const riscoInstabilidade=/(?:artrite reumatoide|ehlers danlos|down|tecido conjuntivo|cirurgia cervical alta)/.test(t)||traumaAltaEnergia;
    const sintomaInstabilidade=/(?:instavel|instabilidade|parece sair do lugar|cabeca pesada demais|preciso segurar a cabeca|apreensao cervical)/.test(t)&&!negado(t,'instavel|instabilidade|sair do lugar|segurar a cabeca');

    if(cond.id==='cervical_vascular_suspeita'){
      if(vascularPositivo)add(neuroCranial?7.2:5.4,neuroCranial?'dor cranio-cervical atípica + sinal neurológico':'dor cranio-cervical súbita/atípica');
      if(vascularNegado&&!inicioSubito){score=-5;hits=[];}
    }
    if(cond.id==='cervical_trauma_estrutural'){
      if(traumaAtual&&(traumaAltaEnergia||dorMediana||incapacidadeAguda||neuroDistal||fraquezaDistal))add(5.8,'trauma atual + marcador estrutural/neurológico');
      if(!traumaAtual||historiaRemotaResolvida){score=-5;hits=[];}
    }
    if(cond.id==='cervical_infeccao'){
      if(infeccaoPositiva)add(6,'febre/sinais sistêmicos + dor cervical coerente');
      if(negado(t,'febre|calafrio')&&!riscoInfeccao){score-=4;}
    }
    if(cond.id==='cervical_neoplasia_suspeita'){
      if(neoplasiaPositiva)add(6,'história oncológica pessoal + padrão não mecânico/sistêmico');
      if(!cancerPessoal){score-=3;}
    }
    if(cond.id==='mielopatia_cervical_suspeita'){
      if(dominiosMielo>=2)add(6.5,'múltiplos domínios compatíveis com mielopatia');
      else if(dominiosMielo===1&&(idade>=50||dorCervical))add(2.5,'um domínio neurológico relevante requer confirmação');
      if(dominiosMielo===0){score-=3;}
    }
    if(cond.id==='cervical_posop_complicacao'){
      if(posopComplicacao)add(6.5,'piora/sinal de complicação após cirurgia cervical');
      else {score=-5;hits=[];}
    }
    if(cond.id==='instabilidade_craniocervical'){
      if(riscoInstabilidade&&sintomaInstabilidade)add(5.4,'fator de risco + sensação/sinal de instabilidade');
      if(historiaRemotaResolvida&&!sintomaInstabilidade){score=-5;hits=[];}
    }
    if(cond.id==='pos_operatorio_cervical'){
      if(cirurgiaCervical&&!historiaRemotaResolvida)add(4.8,'cirurgia cervical atual/relevante');
      if(historiaRemotaResolvida){score=-5;hits=[];}
    }
    if(cond.id==='radiculopatia_cervical'){
      if(temCervical&&neuroDistal&&cervicalModula)add(5.2,'sintoma distal neurológico modulado pela cervical');
      else if(temCervical&&(neuroDistal||fraquezaDistal))add(3.2,'cervical + sintoma neurológico distal');
      if(medianoDistal||ulnarDistal||ombroLocal)score-=4.5;
      if(parestesiaNegada&&!fraquezaDistal)score-=3;
      if(cervicalNaoModula&&(medianoDistal||ulnarDistal))score-=3;
    }
    if(cond.id==='dor_cervical_padrao_irradiado'){
      if(irradiacao&&!neuroDistal&&!fraquezaDistal)add(4.5,'dor cervical irradiada sem padrão neurológico convincente');
      if(neuroDistal||fraquezaDistal)score-=2.5;
    }
    if(cond.id==='dor_cervical_coordenacao_movimento'){
      if(whiplash&&dorCervical)add(5,'mecanismo de aceleração-desaceleração + dor cervical');
      if(!whiplash)score-=2.5;
    }
    if(cond.id==='cefaleia_cervicogenica'){
      if(cefaleiaParteCervical&&cefaleiaModulada&&!migranoso)add(5.2,'cefaleia familiar inicia/modula com cervical');
      else if(cefaleia&&cefaleiaModulada&&!migranoso)add(3.3,'cefaleia mecanicamente modulada pela cervical');
      if(migranoso||tensional)score-=4;
      if(vascularPositivo)score-=6;
    }
    if(cond.id==='neuralgia_occipital'){
      if(occipitalParox)add(5,'dor occipital paroxística em choque/pontada');
      if(!occipitalParox)score-=2.5;
    }
    if(cond.id==='lesao_muscular_cervical_aguda'){
      if(esforcoMuscular&&dorCervical&&!neuroDistal&&!traumaAltaEnergia)add(4.2,'carga/movimento agudo + dor cervical focal sem neurologia');
      if(traumaAltaEnergia||neuroDistal)score-=4;
    }
    if(cond.id==='dor_cervical_mecanica'){
      if(mecanicoLocal&&!vascularPositivo&&!infeccaoPositiva&&!neoplasiaPositiva&&dominiosMielo<2)add(4,'dor cervical local mecanicamente modulada');
      if(neuroDistal||vascularPositivo||infeccaoPositiva||neoplasiaPositiva||dominiosMielo>=2)score-=4;
    }
    return {score:score+cond.ordem/1000,hits:uniq(hits).slice(0,6)};
  }

  function itemBanco(cond){
    if(!cond.bancoId)return null;if(cacheBanco.has(cond.id))return cacheBanco.get(cond.id);
    const item=[...arr(banco()?.clusters),...arr(banco()?.diferenciais)].find(x=>x?.id===cond.bancoId)||null;cacheBanco.set(cond.id,item);return item;
  }
  const textoTeste=t=>typeof t==='string'?t:String(t?.nome||t?.teste||t?.titulo||t?.descricao||'').trim();
  function hipotese(cond,p){
    const item=itemBanco(cond),matriz=MATRIZ_EXAME[cond.id]||{essencial:[],complementar:[],evitar:[]},testes=arr(item?.testes).map(textoTeste).filter(Boolean);
    return {id:item?.id||cond.id,regiaoId:'cervical',regiaoNome:'Coluna Cervical',grupo:item?.regraConfirmacao||item?.limiar?'cluster':'diferencial',nome:item?.nome||cond.rotulo,prioridadeOrdenacao:Number((p.score+2).toFixed(2)),aFavor:p.hits.length?p.hits.map(x=>`Relato: ${x}`):['Depende de perguntas discriminativas'],contra:[],aConfirmar:uniq([...cond.perguntas,...matriz.essencial,...cond.objetivos]).slice(0,8),testes,regraConfirmacao:item?.regraConfirmacao?.descricao||item?.regraConfirmacao||'',interpretacao:String(item?.interpretacao||''),evidencia:String(item?.evidencia||''),origemHMA:p.hits.length>0,item:item||{id:cond.id,nome:cond.rotulo,testes},motor31:{condicaoId:cond.id,perguntas:cond.perguntas.slice(),objetivos:cond.objetivos.slice(),frasesReconhecidas:p.hits,urgente:!!cond.urgente,reforca:cond.reforca,enfraquece:cond.enfraquece,matrizExame:matriz}};
  }
  function uniqObj(xs){const m=new Map();arr(xs).forEach(x=>{const k=n(`${x?.titulo||''}|${x?.descricao||''}`);if(k&&!m.has(k))m.set(k,x);});return [...m.values()];}
  function tipoObjetivo(t=''){const s=n(t);if(/marcha|equilibrio|reflex|miotom|dermatom|neurolog|clonus|hoffmann|destreza|craniano/.test(s))return'neurologica';if(/adm|mobilidade|rotacao|flexao|extensao|cfrt/.test(s))return'mobilidade';if(/forca|resistencia|carga|tolerancia/.test(s))return'forca_carga';if(/funcao|ndi|tarefa|retorno/.test(s))return'funcional';if(/pressao arterial|sinais vitais|ferida|febre|estado geral|oncolog/.test(s))return'seguranca';return'ortopedico';}
  const ROT={neurologica:'Exame neurológico',mobilidade:'Mobilidade e modulação mecânica',forca_carga:'Força / resistência / tolerância',funcional:'Função',seguranca:'Segurança / triagem sistêmica',ortopedico:'Diferenciação clínica'};
  function agrupar(itens){const g={};arr(itens).forEach(x=>(g[x.tipo]||(g[x.tipo]=[])).push(x));return Object.entries(g).map(([tipo,x])=>({tipo,titulo:ROT[tipo]||tipo,itens:x}));}

  function planoCervicalEspecialista(plano){
    if(!plano||plano.insuficiente)return plano;
    const t=n(hma()),tem=arr(plano.regioes).some(r=>r.id==='cervical')||/(pescoco|cervical|nuca|whiplash|chicote cervical|artrodese cervical|discectomia cervical)/.test(t);if(!tem)return plano;
    const c=contexto(),texto=textoContexto(c),fortes=CONDICOES.map(cond=>({cond,...pontuar(cond,texto,c)})).sort((a,b)=>b.score-a.score).filter(x=>x.score>=Number(x.cond.minScore||2.2)).slice(0,10);
    const especialistas=fortes.map(x=>hipotese(x.cond,x)),existentes=arr(plano.hipoteses).filter(h=>h.regiaoId!=='cervical'),base=arr(plano.hipoteses).filter(h=>h.regiaoId==='cervical'),mapa=new Map();
    [...especialistas,...base].forEach(h=>{const k=h.motor31?.condicaoId||h.id||n(h.nome);if(!mapa.has(k))mapa.set(k,h);else if(h.motor31)mapa.set(k,{...mapa.get(k),...h});});
    const finais=[...mapa.values()].sort((a,b)=>Number(b.prioridadeOrdenacao||0)-Number(a.prioridadeOrdenacao||0)).slice(0,10);plano.hipoteses=[...finais,...existentes].sort((a,b)=>Number(b.prioridadeOrdenacao||0)-Number(a.prioridadeOrdenacao||0));
    const distal=/(braco|antebraco|mao|dedo|formig|dormen|choque|fraqueza)/.test(t),temMS=distal||arr(plano.regioes).some(r=>['ombro','cotovelo','punho_mao'].includes(r.id)),temCefaleia=/(cefaleia|dor de cabeca|dor na cabeca|occipital)/.test(t);
    const perguntas=uniq([...BASE_PERGUNTAS,...fortes.flatMap(x=>x.cond.perguntas)]).slice(0,22),objetivos=uniq(fortes.flatMap(x=>x.cond.objetivos)).slice(0,22),seguranca=fortes.filter(x=>x.cond.urgente).map(x=>({titulo:x.cond.rotulo,descricao:`Padrão histórico que merece exclusão prioritária antes de testes provocativos. Pergunte: ${x.cond.perguntas[0]||BASE_PERGUNTAS[5]}`}));
    plano.exame.seguranca=uniqObj([...(plano.exame.seguranca||[]),...seguranca]);plano.exame.perguntasDirigidasCervical=perguntas;plano.exame.objetivosCervical=objetivos;
    plano.exame.familiasCervical=fortes.map(x=>({id:x.cond.id,nome:x.cond.rotulo,frases:x.hits,perguntas:x.cond.perguntas,objetivos:x.cond.objetivos,urgente:!!x.cond.urgente,matrizExame:MATRIZ_EXAME[x.cond.id]||{essencial:[],complementar:[],evitar:[]}}));
    plano.exame.matrizCervical=plano.exame.familiasCervical.map(x=>({id:x.id,nome:x.nome,...x.matrizExame}));
    plano.exame.correlacaoMembroSuperiorCervical={ativa:temMS,principio:'Sintomas no membro superior podem decorrer de raiz cervical, dor referida, plexo/nervo periférico ou estrutura local de ombro, cotovelo e punho/mão. Compare distribuição neurológica, modulação cervical e provocação distal antes de atribuir a origem.',perguntas:[BASE_PERGUNTAS[1],BASE_PERGUNTAS[2],BASE_PERGUNTAS[13]],criterios:['dermátomos/miótomos/reflexos','modulação por cervical','provocação neural','provocação local distal']};
    plano.exame.triagemCefaleiaCervical={ativa:temCefaleia,principio:'Cefaleia associada a dor cervical exige primeiro triagem de causas secundárias e fenótipo da cefaleia. Relação cervical causal só ganha força quando a cefaleia familiar é reproduzida/modulada pela cervical.',perguntas:[BASE_PERGUNTAS[5],BASE_PERGUNTAS[10],BASE_PERGUNTAS[11]],criterios:['início e padrão da cefaleia','sinais neurológicos/sistêmicos','fenótipo migranoso/tensional','reprodução cervical da cefaleia familiar']};
    const motor={versao:VERSION,regiao:'cervical',frasesReconhecidas:uniq(fortes.flatMap(x=>x.hits)),perguntas,condicoes:plano.exame.familiasCervical,correlacaoMembroSuperiorCervical:plano.exame.correlacaoMembroSuperiorCervical,triagemCefaleiaCervical:plano.exame.triagemCefaleiaCervical,aviso:'Prioridade de investigação. Segurança, neurologia e diferenciação regional precedem rótulos anatômicos; cefaleia/tontura não são cervicogênicas por associação temporal isolada.'};
    plano.motores31={...(plano.motores31||{}),cervical:motor};if(!plano.motor31)plano.motor31=motor;
    const itens=uniq([...fortes.flatMap(x=>arr(MATRIZ_EXAME[x.cond.id]?.essencial)),...objetivos,...fortes.flatMap(x=>arr(MATRIZ_EXAME[x.cond.id]?.complementar))]).slice(0,14).map((texto,i)=>({texto,tipo:tipoObjetivo(texto),hipoteses:fortes.slice(0,4).map(x=>x.cond.rotulo),prioridade:12-i/100,motor31:true,regiaoMotor31:'cervical'})),tm=new Map();
    [...itens,...arr(plano.exame.testesPrioritarios)].forEach(x=>{const k=n(x.texto);if(k&&!tm.has(k))tm.set(k,x);});plano.exame.testesPrioritarios=[...tm.values()].slice(0,temMS||temCefaleia?22:17);plano.exame.analises=agrupar(plano.exame.testesPrioritarios);plano.lacunas=uniq([...arr(plano.lacunas),...perguntas.slice(0,7).map(q=>`Cervical: ${q}`)]).slice(0,22);return plano;
  }

  const esc=(v='')=>String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;');
  function render(plano){
    const host=document.getElementById('ks31_cervical_interview');if(!host)return;const m=plano?.motores31?.cervical||(plano?.motor31?.regiao==='cervical'?plano.motor31:null);if(!m){host.hidden=true;host.innerHTML='';return;}host.hidden=false;const matriz=arr(plano?.exame?.matrizCervical).slice(0,7),cross=m.correlacaoMembroSuperiorCervical,head=m.triagemCefaleiaCervical,sig=JSON.stringify({v:VERSION,c:m.condicoes.map(x=>x.id),f:m.frasesReconhecidas,p:m.perguntas.slice(0,12),mx:matriz.map(x=>x.id),x:!!cross?.ativa,h:!!head?.ativa});if(host.dataset.ks31Signature===sig)return;host.dataset.ks31Signature=sig;
    host.innerHTML=`<header><div><span>Motor 3.1 · Coluna Cervical</span><strong>Segurança, neurologia, cefaleia e diferenciação regional antes do rótulo</strong></div><small>${m.condicoes.length} família(s) em investigação</small></header>${cross?.ativa?`<div class="ks31-cross-region"><strong>Cervical ↔ membro superior</strong><p>${esc(cross.principio)}</p></div>`:''}${head?.ativa?`<div class="ks31-cross-region"><strong>Cervical ↔ cefaleia/tontura</strong><p>${esc(head.principio)}</p></div>`:''}<div class="ks31-question-grid">${m.perguntas.slice(0,12).map((q,i)=>`<div><b>${i+1}</b><span>${esc(q)}</span></div>`).join('')}</div>${matriz.length?`<div class="ks31-exam-matrix"><strong>Exame por finalidade</strong>${matriz.map(x=>`<details><summary>${esc(x.nome)}</summary><div><b>Essencial</b>${arr(x.essencial).map(v=>`<p>${esc(v)}</p>`).join('')}<b>Complementar</b>${arr(x.complementar).map(v=>`<p>${esc(v)}</p>`).join('')}${arr(x.evitar).length?`<b>Cautela</b>${arr(x.evitar).map(v=>`<p>${esc(v)}</p>`).join('')}`:''}</div></details>`).join('')}</div>`:''}<footer>O motor não confirma diagnóstico por palavra-chave. Em cervical, piora neurológica, trauma relevante, padrão vascular, infecção, neoplasia e mielopatia têm prioridade sobre testes ortopédicos.</footer>`;
  }
  function garantirUI(){const etapa=document.getElementById('subtela_mapeamento');if(etapa&&!document.getElementById('ks31_cervical_interview')){const el=document.createElement('section');el.id='ks31_cervical_interview';el.className='ks31-cervical-interview';el.hidden=true;const o=document.getElementById('ks31_shoulder_interview'),p=document.getElementById('ks30_exam_plan');if(o)o.insertAdjacentElement('beforebegin',el);else if(p)p.insertAdjacentElement('afterend',el);else etapa.insertAdjacentElement('afterbegin',el);}}

  window.enriquecerPlanoCervicalKineSys=planoCervicalEspecialista;
  const anterior=window.enriquecerPlanoCotoveloKineSys;
  if(typeof anterior==='function'&&!anterior.__kinesysCervicalBridge){const ponte=function(plano){let p=anterior(plano)||plano;return planoCervicalEspecialista(p)||p;};ponte.__kinesysCervicalBridge=true;ponte.__original=anterior;window.enriquecerPlanoCotoveloKineSys=ponte;}
  window.KineSysMotor31Cervical={version:VERSION,condicoes:CONDICOES,perguntasBase:BASE_PERGUNTAS,referencias:REFERENCIAS,enriquecer:planoCervicalEspecialista};
  document.addEventListener('kinesys:motor3-plano-atualizado',()=>{garantirUI();const p=window.KineSysMotorClinico3?.ultimoPlano;if(p)render(p);});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',garantirUI,{once:true});else garantirUI();
})();