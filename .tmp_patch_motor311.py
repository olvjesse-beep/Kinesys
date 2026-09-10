from pathlib import Path

js=Path('clinical_reasoning_shoulder-3.1.0.js')
s=js.read_text(encoding='utf-8')

if "const VERSION='3.1.0-shoulder1';" not in s:
    raise SystemExit('version anchor missing')
s=s.replace("const VERSION='3.1.0-shoulder1';","const VERSION='3.1.1-shoulder2';",1)

anchor="""  function textoContexto(){
"""
if s.count(anchor)!=1:
    raise SystemExit(f'textoContexto anchor count={s.count(anchor)}')

insertion=r'''  const VOCABULARIO_NACIONAL={
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

'''
s=s.replace(anchor,insertion+anchor,1)

old="const hits=contem(texto,cond.termos);"
new="const hits=contem(texto,uniq([...arr(cond.termos),...arr(VOCABULARIO_NACIONAL[cond.id])]));"
if s.count(old)!=1:
    raise SystemExit(f'hits anchor count={s.count(old)}')
s=s.replace(old,new,1)

old="""    const testes=arr(item?.testes).map(testeNome).filter(Boolean);
    return {
"""
new="""    const testes=arr(item?.testes).map(testeNome).filter(Boolean);
    const matriz=MATRIZ_EXAME[cond.id]||{essencial:[],complementar:[],evitar:[]};
    return {
"""
if s.count(old)!=1:
    raise SystemExit(f'criarHipotese anchor count={s.count(old)}')
s=s.replace(old,new,1)

old="""      aConfirmar:uniq([...perguntas.slice(0,3),...objetivos.slice(0,2)]),
"""
new="""      aConfirmar:uniq([...perguntas.slice(0,3),...matriz.essencial.slice(0,3),...objetivos.slice(0,2)]),
"""
if s.count(old)!=1: raise SystemExit('aConfirmar anchor missing')
s=s.replace(old,new,1)

old="""      motor31:{condicaoId:cond.id,perguntas,objetivos,frasesReconhecidas:p.hits,urgente:!!cond.urgente,reforca:cond.reforca,enfraquece:cond.enfraquece}
"""
new="""      motor31:{condicaoId:cond.id,perguntas,objetivos,frasesReconhecidas:p.hits,urgente:!!cond.urgente,reforca:cond.reforca,enfraquece:cond.enfraquece,matrizExame:matriz}
"""
if s.count(old)!=1: raise SystemExit('motor31 object anchor missing')
s=s.replace(old,new,1)

old="""    plano.exame.familiasOmbro=fortes.map(x=>({id:x.cond.id,nome:x.cond.rotulo,frases:x.hits,perguntas:x.cond.perguntas,objetivos:x.cond.objetivos,urgente:!!x.cond.urgente}));
"""
new="""    plano.exame.familiasOmbro=fortes.map(x=>({id:x.cond.id,nome:x.cond.rotulo,frases:x.hits,perguntas:x.cond.perguntas,objetivos:x.cond.objetivos,urgente:!!x.cond.urgente,matrizExame:MATRIZ_EXAME[x.cond.id]||{essencial:[],complementar:[],evitar:[]}}));
    plano.exame.matrizOmbro=plano.exame.familiasOmbro.map(x=>({id:x.id,nome:x.nome,...x.matrizExame}));
"""
if s.count(old)!=1: raise SystemExit('familiasOmbro anchor missing')
s=s.replace(old,new,1)

old="""    const extras=[];
    objetivos.forEach((o,i)=>extras.push({texto:o,tipo:classificarObjetivo(o),hipoteses:fortes.slice(0,3).map(x=>x.cond.rotulo),prioridade:12-i/100,motor31:true}));
"""
new="""    const extras=[];
    const objetivosExame=uniq([
      ...fortes.flatMap(x=>arr(MATRIZ_EXAME[x.cond.id]?.essencial)),
      ...objetivos,
      ...fortes.flatMap(x=>arr(MATRIZ_EXAME[x.cond.id]?.complementar))
    ]);
    objetivosExame.forEach((o,i)=>extras.push({texto:o,tipo:classificarObjetivo(o),hipoteses:fortes.slice(0,3).map(x=>x.cond.rotulo),prioridade:12-i/100,motor31:true}));
"""
if s.count(old)!=1: raise SystemExit('extras anchor missing')
s=s.replace(old,new,1)

old="""    host.innerHTML=`<header><div><span>Motor 3.1 · Ombro</span><strong>Perguntas que refinam a hipótese antes dos testes</strong></div><small>${m.condicoes.length} família(s) em investigação</small></header><div class=\"ks31-question-grid\">${m.perguntas.slice(0,10).map((q,i)=>`<div><b>${i+1}</b><span>${esc(q)}</span></div>`).join('')}</div><footer>Use as respostas para mudar a prioridade das hipóteses. Uma frase isolada do paciente não confirma estrutura ou diagnóstico.</footer>`;
"""
new="""    const matriz=arr(plano?.exame?.matrizOmbro).slice(0,4);
    host.innerHTML=`<header><div><span>Motor 3.1 · Ombro</span><strong>Perguntas que refinam a hipótese antes dos testes</strong></div><small>${m.condicoes.length} família(s) em investigação</small></header><div class=\"ks31-question-grid\">${m.perguntas.slice(0,10).map((q,i)=>`<div><b>${i+1}</b><span>${esc(q)}</span></div>`).join('')}</div>${matriz.length?`<div class=\"ks31-exam-matrix\"><strong>Exame por finalidade</strong>${matriz.map(x=>`<details><summary>${esc(x.nome)}</summary><div><b>Essencial</b>${arr(x.essencial).map(v=>`<p>${esc(v)}</p>`).join('')}<b>Complementar</b>${arr(x.complementar).map(v=>`<p>${esc(v)}</p>`).join('')}${arr(x.evitar).length?`<b>Cautela</b>${arr(x.evitar).map(v=>`<p>${esc(v)}</p>`).join('')}`:''}</div></details>`).join('')}</div>`:''}<footer>Use as respostas para mudar a prioridade das hipóteses. Uma frase isolada do paciente não confirma estrutura ou diagnóstico.</footer>`;
"""
if s.count(old)!=1: raise SystemExit('renderPerguntas anchor missing')
s=s.replace(old,new,1)

js.write_text(s,encoding='utf-8')

idx=Path('index.html')
h=idx.read_text(encoding='utf-8')
h=h.replace('clinical_reasoning_shoulder-3.1.0.css?v=20260910-r1','clinical_reasoning_shoulder-3.1.0.css?v=20260910-r2')
h=h.replace('clinical_reasoning_shoulder-3.1.0.js?v=20260910-r1','clinical_reasoning_shoulder-3.1.0.js?v=20260910-r2')
idx.write_text(h,encoding='utf-8')

css=Path('clinical_reasoning_shoulder-3.1.0.css')
c=css.read_text(encoding='utf-8')
extra='''\n/* Motor 3.1.1 — matriz de exame por finalidade */\n.ks31-exam-matrix{margin-top:16px;padding-top:14px;border-top:1px solid var(--kds-line-soft)}\n.ks31-exam-matrix>strong{display:block;margin-bottom:8px;color:var(--kds-petrol-deep);font-size:var(--kds-font-label)}\n.ks31-exam-matrix details{border-top:1px solid var(--kds-line-soft)}\n.ks31-exam-matrix summary{cursor:pointer;padding:10px 0;color:var(--kds-petrol-deep);font-weight:700}\n.ks31-exam-matrix details>div{padding:0 0 10px}\n.ks31-exam-matrix details>div>b{display:block;margin:8px 0 4px;color:var(--kds-accent-hover);font-size:var(--kds-font-metadata)}\n.ks31-exam-matrix details>div>p{margin:3px 0;color:var(--kds-text);font-size:var(--kds-font-metadata);line-height:1.45}\n'''
if 'Motor 3.1.1 — matriz de exame por finalidade' not in c:
    c += extra
css.write_text(c,encoding='utf-8')
