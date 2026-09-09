/* ============================================================================
   KINESYS — CONDIÇÕES DE MOBILIDADE / DEFORMIDADE v2.3
   Expansão clínica complementar. As condições abaixo são ferramentas opcionais
   de exame e documentação. Não alimentam o Navegador Clínico como diagnóstico.
   ============================================================================ */
(function kinesysCondicoesMobilidade23(){
    'use strict';
    if(typeof BANCO_MAPEAMENTO_CLINICO==='undefined') return;

    function add(regiao, grupo, item){
        const r=BANCO_MAPEAMENTO_CLINICO[regiao];
        if(!r) return;
        if(!Array.isArray(r[grupo])) r[grupo]=[];
        if(r[grupo].some(x=>x.id===item.id)) return;
        item.categoriaClinica=item.categoriaClinica||'mobilidade_deformidade';
        r[grupo].push(item);
    }
    function aliases(regiao, termos){
        const r=BANCO_MAPEAMENTO_CLINICO[regiao];
        if(!r) return;
        r.palavrasChave=[...new Set([...(r.palavrasChave||[]),...termos])];
    }

    aliases('punho_mao',['dedo em gatilho','trigger finger','dupuytren','dedo travando','dedo em martelo','boutonniere','rigidez dos dedos','dedos rigidos']);
    aliases('tornozelo_pe',['halux valgo','hallux valgus','joanete','halux rigido','hallux rigidus','dedo em garra','dedo em martelo','metatarsalgia','placa plantar','pe plano','pe cavo','bunionette','joanete do quinto','equinismo']);

    add('punho_mao','diferenciais',{
        id:'dedo_gatilho',
        nome:'Dedo em Gatilho / Tenossinovite Estenosante dos Flexores',
        testes:[
            'Travamento, ressalto ou clique durante flexão/extensão do dedo',
            'Sensibilidade ou espessamento na região da polia A1',
            'Perda de extensão ativa/passiva ou necessidade de destravar manualmente',
            'Comparar impacto funcional na preensão e tarefas repetitivas'
        ],
        interpretacao:'Padrão compatível quando há travamento mecânico do tendão flexor na região da polia A1. Diferencie de bloqueio articular, contratura fixa e outras causas de perda de movimento.',
        palavrasChaveHMA:['dedo em gatilho','dedo trava','dedo travando','estala ao abrir a mao','trigger finger'],
        fatoresPioraRisco:['movimento','carga'],
        tagsBusca:['tenossinovite estenosante','polia a1','travamento','trigger thumb'],
        evidencia:'Avaliação clínica de mobilidade tendínea e função da mão.'
    });

    add('punho_mao','diferenciais',{
        id:'contratura_dupuytren',
        nome:'Contratura de Dupuytren',
        testes:[
            'Nódulo ou cordão palmar palpável',
            'Déficit de extensão passiva de MCP/PIP',
            'Teste da mesa para incapacidade de apoiar a mão plana quando pertinente',
            'Documentar graus de contratura e impacto funcional'
        ],
        interpretacao:'A limitação é estrutural e progressiva em parte dos casos. Quantifique a perda de extensão e impacto funcional; encaminhamento especializado pode ser indicado conforme gravidade e progressão.',
        palavrasChaveHMA:['dupuytren','cordao na palma','dedo nao estica','contratura da mao'],
        tagsBusca:['fibromatose palmar','contratura palmar','perda de extensao']
    });

    add('punho_mao','diferenciais',{
        id:'rigidez_digital_pos_traumatica',
        nome:'Rigidez Digital Pós-traumática / Pós-imobilização',
        testes:[
            'ADM ativa e passiva por articulação (MCP, PIP e DIP)',
            'Diferença entre limitação ativa e passiva',
            'Deslizamento tendíneo e mobilidade de tecidos quando pertinentes',
            'Edema, dor e função de preensão/pinça'
        ],
        interpretacao:'Use como eixo de mobilidade quando a principal limitação é perda de movimento após trauma, cirurgia ou imobilização. Diferencie restrição capsular, aderência tendínea, dor e bloqueio mecânico.',
        palavrasChaveHMA:['dedo rigido','dedos rigidos','depois da tala','depois da imobilizacao','nao dobra o dedo','nao estica o dedo'],
        tagsBusca:['rigidez interfalangica','aderencia tendinea','pos imobilizacao']
    });

    add('punho_mao','diferenciais',{
        id:'dedo_martelo_mao',
        nome:'Dedo em Martelo (Mallet Finger) — sequela / reabilitação',
        testes:[
            'Déficit de extensão ativa da DIP',
            'Extensão passiva da DIP e presença de contratura',
            'História de trauma em flexão forçada da falange distal',
            'Integridade cutânea e alinhamento após imobilização quando aplicável'
        ],
        interpretacao:'Padrão típico envolve perda de extensão ativa da DIP após lesão do mecanismo extensor distal. Em trauma recente, deformidade importante ou suspeita óssea, seguir avaliação médica/ortopédica.',
        palavrasChaveHMA:['dedo em martelo','mallet finger','ponta do dedo caiu','nao estica a ponta do dedo'],
        mecanismoPreferido:['trauma_agudo'],
        tagsBusca:['extensor distal','dip','deformidade dedo']
    });

    add('punho_mao','diferenciais',{
        id:'deformidade_boutonniere',
        nome:'Deformidade em Boutonnière — sequela / mobilidade',
        testes:[
            'Flexão da PIP associada a hiperextensão relativa da DIP',
            'ADM ativa e passiva da PIP/DIP',
            'Teste de Elson quando clinicamente apropriado',
            'História de trauma, artrite ou evolução progressiva'
        ],
        interpretacao:'Avalie como alteração do mecanismo extensor e da mobilidade interfalângica. Em lesão aguda ou deformidade progressiva, considerar avaliação especializada.',
        palavrasChaveHMA:['boutonniere','dedo torto depois de trauma','pip dobrada','deformidade no dedo'],
        tagsBusca:['mecanismo extensor','pip','dip']
    });

    add('punho_mao','diferenciais',{
        id:'osteoartrite_interfalangica_mao',
        nome:'Osteoartrite Interfalângica da Mão — mobilidade e função',
        testes:[
            'Dor/rigidez em DIP/PIP com limitação funcional',
            'ADM ativa/passiva e deformidade articular quando presente',
            'Força de preensão/pinça se relevante',
            'Diferenciar padrão degenerativo de processo inflamatório sistêmico'
        ],
        interpretacao:'O exame deve priorizar mobilidade, função, carga tolerada e impacto nas tarefas, sem atribuir sintomas apenas à alteração estrutural.',
        palavrasChaveHMA:['artrose nos dedos','osteoartrite mao','nodulos nos dedos','dedos rigidos de manha'],
        idadeFaixaBonus:{min:45,max:100,bonus:.3},
        tagsBusca:['artrose interfalangica','heberden','bouchard']
    });

    add('punho_mao','diferenciais',{
        id:'rigidez_punho_pos_traumatica',
        nome:'Rigidez do Punho Pós-traumática / Pós-imobilização',
        testes:[
            'ADM ativa e passiva do punho e antebraço',
            'Comparar padrão capsular, dor e bloqueio mecânico',
            'Força de preensão quando segura e pertinente',
            'Função em apoio, preensão e tarefas manuais'
        ],
        interpretacao:'Útil quando a perda de mobilidade é o problema principal após fratura, cirurgia ou imobilização. Investigue causas mecânicas relevantes se houver bloqueio, dor desproporcional ou perda progressiva.',
        palavrasChaveHMA:['punho rigido','punho travado','depois do gesso','depois da fratura do punho'],
        tagsBusca:['pos imobilizacao','rigidez radiocarpal','prono supinacao']
    });

    add('tornozelo_pe','diferenciais',{
        id:'hallux_valgus',
        nome:'Hálux Valgo',
        testes:[
            'Alinhamento do hálux e primeiro raio em carga',
            'Mobilidade da primeira MTF, especialmente dorsiflexão',
            'Dor medial, tolerância ao calçado e função na propulsão',
            'Avaliar mobilidade/controle do pé e fatores funcionais associados sem presumir causalidade única'
        ],
        interpretacao:'A deformidade estrutural deve ser relacionada aos sintomas e à função. O exame fisioterapêutico pode quantificar mobilidade, força, tolerância à carga e impacto na marcha; gravidade estrutural e indicação cirúrgica dependem de avaliação especializada quando pertinente.',
        palavrasChaveHMA:['halux valgo','hallux valgus','joanete','dedao desviando','osso do dedao'],
        fatoresPioraRisco:['carga','movimento'],
        tagsBusca:['joanete','primeira mtf','primeiro raio','deformidade antepe']
    });

    add('tornozelo_pe','diferenciais',{
        id:'hallux_rigidus_limitus',
        nome:'Hálux Rígido / Hálux Limitus',
        testes:[
            'Dorsiflexão da primeira MTF em descarga e em função',
            'Dor e rigidez na primeira MTF durante propulsão',
            'Crepitação/bloqueio e mobilidade passiva quando presentes',
            'Compensações funcionais durante marcha, agachamento ou elevação do calcanhar'
        ],
        interpretacao:'Considere quando a limitação dolorosa da primeira MTF interfere na propulsão. Diferencie limitação estrutural, irritabilidade articular e restrição funcional dependente da carga.',
        palavrasChaveHMA:['halux rigido','hallux rigidus','hallux limitus','dedao rigido','nao dobra o dedao'],
        tagsBusca:['primeira mtf','dorsiflexao halux','artrose mtf']
    });

    add('tornozelo_pe','diferenciais',{
        id:'dedo_martelo_pe',
        nome:'Dedo em Martelo do Pé',
        testes:[
            'Flexão predominante da PIP com avaliação do alinhamento do dedo',
            'Redutibilidade passiva da deformidade',
            'Dor/calosidade e conflito com calçado',
            'Mobilidade MTF e função durante apoio/propulsão'
        ],
        interpretacao:'Classifique clinicamente como flexível ou rígido e relacione a deformidade aos sintomas, calçado e função. A fisioterapia atua sobre mobilidade, força e tolerância funcional; deformidade fixa sintomática pode exigir avaliação especializada.',
        palavrasChaveHMA:['dedo em martelo no pe','dedo do pe dobrado','hammertoe'],
        tagsBusca:['hammertoe','pip','deformidade antepe']
    });

    add('tornozelo_pe','diferenciais',{
        id:'dedo_garra_pe',
        nome:'Dedo em Garra do Pé',
        testes:[
            'Hiperextensão da MTF associada a flexão de PIP/DIP',
            'Redutibilidade passiva e mobilidade segmentar',
            'Calosidades, dor e tolerância ao calçado',
            'Triagem neurológica quando padrão for múltiplo, progressivo ou associado a fraqueza/sensibilidade'
        ],
        interpretacao:'A deformidade pode ser flexível ou fixa. Quando bilateral/múltipla ou acompanhada de sinais neurológicos, não tratar apenas como alteração local do pé.',
        palavrasChaveHMA:['dedo em garra','dedos em garra','claw toe','dedos enrolados no pe'],
        tagsBusca:['claw toe','deformidade dedos','mtf pip dip']
    });

    add('tornozelo_pe','diferenciais',{
        id:'instabilidade_placa_plantar_mtf',
        nome:'Instabilidade da MTF / Lesão da Placa Plantar',
        testes:[
            'Dor plantar na região da cabeça metatarsal, frequentemente 2ª MTF',
            'Alinhamento do dedo e possível desvio/subluxação',
            'Teste de drawer da MTF quando apropriado',
            'Dor com carga do antepé e relação com calçado/propulsão'
        ],
        interpretacao:'Considere quando há dor plantar focal do antepé associada a instabilidade da MTF. Diferencie de neuroma interdigital, fratura por estresse e metatarsalgia inespecífica.',
        palavrasChaveHMA:['placa plantar','dor embaixo do segundo dedo','dedo subindo','dor na cabeca do metatarso'],
        fatoresPioraRisco:['carga'],
        tagsBusca:['plantar plate','mtf','antepe','instabilidade dedo']
    });

    add('tornozelo_pe','diferenciais',{
        id:'metatarsalgia_mecanica',
        nome:'Metatarsalgia Mecânica / Sobrecarga do Antepé',
        testes:[
            'Dor plantar no antepé relacionada à carga',
            'Localização por cabeça metatarsal e presença de calosidade',
            'Mobilidade da primeira MTF/tornozelo e distribuição de carga durante marcha',
            'Diferenciar neuroma, placa plantar, fratura por estresse e condição inflamatória'
        ],
        interpretacao:'Use como padrão funcional quando a dor do antepé é predominantemente relacionada à carga e não há condição específica mais convincente.',
        palavrasChaveHMA:['metatarsalgia','dor no antepe','dor na sola perto dos dedos','dor nas cabecas dos metatarsos'],
        fatoresPioraRisco:['carga'],
        tagsBusca:['antepe','cabecas metatarsais','sobrecarga']
    });

    add('tornozelo_pe','diferenciais',{
        id:'bunionette_quinto_metatarso',
        nome:'Bunionette / Joanete do Quinto Metatarso',
        testes:[
            'Proeminência lateral do quinto metatarso e alinhamento do quinto dedo',
            'Dor, calosidade e conflito com calçado',
            'Mobilidade local e tolerância à carga',
            'Diferenciar irritação cutânea, fratura por estresse e outras causas laterais do antepé'
        ],
        interpretacao:'Relacione deformidade, calçado e sintomas. O objetivo fisioterapêutico é reduzir irritação, melhorar tolerância funcional e tratar limitações modificáveis.',
        palavrasChaveHMA:['bunionette','joanete do quinto','joanete pequeno','osso do lado de fora do pe'],
        tagsBusca:['tailors bunion','quinto metatarso','antepe lateral']
    });

    add('tornozelo_pe','diferenciais',{
        id:'pe_planovalgo_funcional',
        nome:'Pé Planovalgo / Pé Plano — avaliação funcional',
        testes:[
            'Alinhamento do arco e retropé em carga sem usar postura isolada como diagnóstico',
            'Mobilidade do tornozelo e complexo do pé',
            'Elevação unilateral do calcanhar e capacidade do tibial posterior quando pertinente',
            'Relação entre postura, sintomas e tarefa funcional'
        ],
        interpretacao:'Pé plano é uma característica estrutural frequente e não implica dor por si só. Use a ferramenta quando houver relação funcional plausível com sintomas, capacidade ou deformidade progressiva.',
        palavrasChaveHMA:['pe plano','pe chato','arco caiu','planovalgo'],
        tagsBusca:['pes planus','retrope valgo','arco medial']
    });

    add('tornozelo_pe','diferenciais',{
        id:'pe_cavo_funcional',
        nome:'Pé Cavo — avaliação funcional',
        testes:[
            'Arco elevado e distribuição de carga plantar',
            'Mobilidade do retropé/antepé e tornozelo',
            'Calosidades, estabilidade e tolerância ao impacto',
            'Triagem neurológica quando deformidade for progressiva, bilateral marcante ou associada a fraqueza'
        ],
        interpretacao:'Pé cavo pode ser apenas uma característica morfológica ou estar associado a sobrecarga e, em alguns casos, condição neurológica. Investigue progressão e sinais associados antes de assumir origem mecânica isolada.',
        palavrasChaveHMA:['pe cavo','arco muito alto','pes cavus'],
        tagsBusca:['pes cavus','arco alto','supinacao estrutural']
    });

    add('tornozelo_pe','diferenciais',{
        id:'limitacao_dorsiflexao_tornozelo_equinismo',
        nome:'Limitação de Dorsiflexão do Tornozelo / Equinismo Funcional',
        testes:[
            'Dorsiflexão em cadeia fechada e aberta conforme objetivo',
            'Comparar joelho flexionado e estendido quando útil para diferenciar contribuição do tríceps sural',
            'Mobilidade talocrural e resposta à carga',
            'Impacto funcional em agachamento, marcha, corrida ou escadas'
        ],
        interpretacao:'Trate como déficit de mobilidade quando a limitação é reproduzível e funcionalmente relevante. Evite atribuir causalidade a sintomas distantes sem testar se modificar a dorsiflexão muda a tarefa.',
        palavrasChaveHMA:['tornozelo duro','pouca dorsiflexao','calcanhar levanta no agachamento','equinismo'],
        tagsBusca:['dorsiflexao','gastrocnemio','soleo','talocrural']
    });

    add('cotovelo','diferenciais',{
        id:'rigidez_cotovelo_pos_traumatica',
        nome:'Rigidez do Cotovelo Pós-traumática / Pós-imobilização',
        testes:[
            'ADM de flexão/extensão e prono-supinação',
            'Diferença entre limitação ativa e passiva',
            'Dor, fim de movimento e possível bloqueio mecânico',
            'Impacto funcional em alcance, alimentação, higiene e tarefas de trabalho'
        ],
        interpretacao:'Use quando a limitação de mobilidade é o problema dominante após trauma, cirurgia ou imobilização. Bloqueio mecânico, piora progressiva ou sinais neurológicos exigem investigação adicional.',
        palavrasChaveHMA:['cotovelo rigido','cotovelo travado','nao estica o cotovelo','depois da fratura do cotovelo'],
        tagsBusca:['contratura cotovelo','pos imobilizacao','rigidez articular']
    });

    add('joelho','diferenciais',{
        id:'artrofibrose_joelho',
        nome:'Artrofibrose / Rigidez Persistente do Joelho',
        testes:[
            'Déficit persistente de extensão e/ou flexão comparado ao esperado para o estágio',
            'Qualidade do fim de movimento, dor e edema',
            'Mobilidade patelar e função de marcha/escadas',
            'História de cirurgia, trauma ou imobilização e evolução da ADM ao longo do tempo'
        ],
        interpretacao:'Considere como problema de mobilidade quando há perda persistente de ADM com impacto funcional, especialmente após cirurgia/trauma. A evolução temporal e o estágio pós-operatório são fundamentais para decisão de encaminhamento e progressão.',
        palavrasChaveHMA:['artrofibrose','joelho travado depois da cirurgia','nao estica o joelho','nao dobra o joelho depois da cirurgia'],
        mecanismoPreferido:['pos_cirurgico','trauma_agudo'],
        tagsBusca:['rigidez joelho','perda extensao','perda flexao']
    });

    add('quadril','diferenciais',{
        id:'rigidez_capsular_quadril',
        nome:'Déficit de Mobilidade do Quadril / Rigidez Capsular',
        testes:[
            'ADM ativa e passiva do quadril com comparação funcional',
            'Padrão de limitação e reprodução da queixa familiar',
            'Impacto em calçar sapatos, agachar, sentar, marcha ou escadas',
            'Diferenciar rigidez funcional de osteoartrite sintomática, irritabilidade ou bloqueio intra-articular'
        ],
        interpretacao:'Use como eixo de mobilidade quando a perda de ADM é clinicamente relevante sem forçar um diagnóstico estrutural específico.',
        palavrasChaveHMA:['quadril rigido','quadril travado','pouca mobilidade no quadril','dificuldade cruzar a perna'],
        tagsBusca:['mobilidade quadril','rigidez capsular','adm quadril']
    });
})();
