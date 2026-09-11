/* KineSys — extensão clínica regional tornozelo_pe 1.0.0.
 * Gerada deterministicamente de condicoes_mobilidade_v23.js + diferenciais_neurais.js.
 * Não editar manualmente sem atualizar o contrato de equivalência.
 */
(function(){
  'use strict';
  if(typeof BANCO_MAPEAMENTO_CLINICO==='undefined')return;
  const r=BANCO_MAPEAMENTO_CLINICO["tornozelo_pe"];
  if(!r)return;
  Object.assign(r,{
  "palavrasChave": [
    "tornozelo",
    "pe",
    "calcanhar",
    "aquiles",
    "fascia",
    "metatarso",
    "maleolo",
    "plantar",
    "halux valgo",
    "hallux valgus",
    "joanete",
    "halux rigido",
    "hallux rigidus",
    "dedo em garra",
    "dedo em martelo",
    "metatarsalgia",
    "placa plantar",
    "pe plano",
    "pe cavo",
    "bunionette",
    "joanete do quinto",
    "equinismo"
  ],
  "diferenciais": [
    {
      "id": "dor_plantar_calcanhar",
      "nome": "Dor Plantar do Calcâneo / Fasciopatia Plantar",
      "testes": [
        "Dor medial plantar no calcâneo, pior nos primeiros passos após repouso",
        "Palpação da inserção medial da fáscia reproduz dor",
        "Windlass test / dorsiflexão dos dedos reproduz dor em contexto compatível"
      ],
      "interpretacao": "A apresentação típica é dor plantar medial no calcâneo com padrão de primeiros passos e sensibilidade local. O termo 'esporão' não deve ser usado como explicação causal automática.",
      "palavrasChaveHMA": [
        "dor no calcanhar de manha",
        "primeiros passos doem",
        "dor na sola do pe",
        "fascite plantar"
      ],
      "mecanismoPreferido": [
        "insidioso",
        "esforco_repetitivo"
      ],
      "tipoDorPreferido": [
        "mecanica"
      ],
      "fatoresPioraRisco": [
        "posicao_em_pe"
      ],
      "pesos": {
        "palavraChave": 2,
        "mecanismo": 0.6,
        "tipoDor": 1,
        "fatorPiora": 0.4,
        "esporte": 0.1,
        "ocupacao": 0.1,
        "comorbidade": 0,
        "medicamento": 0,
        "idade": 0,
        "cirurgia": 0.2
      }
    },
    {
      "id": "tendinopatia_tibial_posterior",
      "nome": "Disfunção do Tendão Tibial Posterior / Pé Plano Adquirido",
      "testes": [
        "Dor/edema no trajeto posteromedial do tornozelo",
        "Single-leg heel raise doloroso, fraco ou incapaz",
        "Queda progressiva do arco / sinal de muitos dedos em contexto compatível"
      ],
      "interpretacao": "A incapacidade de elevação unilateral do calcâneo e deformidade progressiva aumentam a suspeita de disfunção do tibial posterior."
    },
    {
      "id": "neuroma_morton",
      "nome": "Neuroma de Morton / Dor Intermetatarsal",
      "testes": [
        "Dor/parestesia em espaço intermetatarsal, frequentemente 3º",
        "Compressão do antepé reproduz sintomas",
        "Mulder click pode estar presente, mas não é obrigatório"
      ],
      "interpretacao": "Considere neuroma quando há dor neuropática focal no antepé e reprodução por compressão. Diferencie de metatarsalgia, fratura por estresse e neuropatia."
    },
    {
      "id": "tendinopatia_aquiles",
      "nome": "Tendinopatia do Tendão de Aquiles",
      "testes": [
        "Dor localizada no tendão de Aquiles relacionada à carga, corrida, salto ou elevação de calcanhar",
        "Palpação/carga do tendão reproduz a dor familiar sem sinais de ruptura aguda",
        "Capacidade de elevação de calcanhar está dolorosa ou reduzida, mas Thompson não sugere ruptura completa"
      ],
      "regraConfirmacao": {
        "tipo": "minimo",
        "minimo": 2
      },
      "interpretacao": "Padrão compatível com tendinopatia quando a dor é localizada e relacionada à carga. Diferenciar de ruptura, bursite, dor referida e condições inflamatórias conforme contexto.",
      "palavrasChaveHMA": [
        "dor no aquiles",
        "tendinite aquiles",
        "dor no tendao de aquiles",
        "aquiles doi correndo"
      ],
      "mecanismoPreferido": [
        "insidioso",
        "esforco_repetitivo"
      ],
      "pesos": {
        "palavraChave": 2,
        "mecanismo": 0.8,
        "esporte": 0.2
      }
    },
    {
      "id": "instabilidade_cronica_tornozelo",
      "nome": "Instabilidade Crônica do Tornozelo — hipótese funcional",
      "testes": [
        "História de entorses recorrentes ou sensação de falseio/giving way",
        "Déficit funcional em equilíbrio, salto ou tarefas específicas após entorse prévia",
        "Laxidade mecânica pode estar presente, mas sintomas recorrentes e função são considerados em conjunto"
      ],
      "regraConfirmacao": {
        "tipo": "minimo",
        "minimo": 2
      },
      "interpretacao": "Fenótipo útil após entorse quando persistem falseio e déficits funcionais. Diferenciar instabilidade funcional de lesão aguda não cicatrizada, sindesmose e causas neurológicas.",
      "palavrasChaveHMA": [
        "tornozelo falseia",
        "entorse recorrente",
        "tornozelo vira sempre",
        "instabilidade tornozelo"
      ],
      "mecanismoPreferido": [
        "trauma_agudo",
        "esforco_repetitivo"
      ],
      "pesos": {
        "palavraChave": 1.9,
        "mecanismo": 0.4
      }
    },
    {
      "id": "neuropatia_periferica",
      "nome": "Neuropatia Periférica / Risco de Pé Diabético",
      "testes": [
        "Monofilamento de 10 g com perda de sensibilidade protetora",
        "Sensibilidade vibratória/neurológica alterada",
        "Inspeção de pele, perfusão e deformidades"
      ],
      "interpretacao": "Em diabetes ou suspeita neuropática, priorize avaliação de sensibilidade protetora, integridade cutânea e perfusão. Úlcera, infecção ou isquemia exigem encaminhamento apropriado.",
      "comorbidadesRisco": [
        "diabetico"
      ],
      "pesos": {
        "palavraChave": 1,
        "mecanismo": 0,
        "tipoDor": 1,
        "fatorPiora": 0,
        "esporte": 0,
        "ocupacao": 0,
        "comorbidade": 2,
        "medicamento": 0,
        "idade": 0.3,
        "cirurgia": 0
      }
    },
    {
      "id": "hallux_valgus",
      "nome": "Hálux Valgo",
      "testes": [
        "Alinhamento do hálux e primeiro raio em carga",
        "Mobilidade da primeira MTF, especialmente dorsiflexão",
        "Dor medial, tolerância ao calçado e função na propulsão",
        "Avaliar mobilidade/controle do pé e fatores funcionais associados sem presumir causalidade única"
      ],
      "interpretacao": "A deformidade estrutural deve ser relacionada aos sintomas e à função. O exame fisioterapêutico pode quantificar mobilidade, força, tolerância à carga e impacto na marcha; gravidade estrutural e indicação cirúrgica dependem de avaliação especializada quando pertinente.",
      "palavrasChaveHMA": [
        "halux valgo",
        "hallux valgus",
        "joanete",
        "dedao desviando",
        "osso do dedao"
      ],
      "fatoresPioraRisco": [
        "carga",
        "movimento"
      ],
      "tagsBusca": [
        "joanete",
        "primeira mtf",
        "primeiro raio",
        "deformidade antepe"
      ],
      "categoriaClinica": "mobilidade_deformidade"
    },
    {
      "id": "hallux_rigidus_limitus",
      "nome": "Hálux Rígido / Hálux Limitus",
      "testes": [
        "Dorsiflexão da primeira MTF em descarga e em função",
        "Dor e rigidez na primeira MTF durante propulsão",
        "Crepitação/bloqueio e mobilidade passiva quando presentes",
        "Compensações funcionais durante marcha, agachamento ou elevação do calcanhar"
      ],
      "interpretacao": "Considere quando a limitação dolorosa da primeira MTF interfere na propulsão. Diferencie limitação estrutural, irritabilidade articular e restrição funcional dependente da carga.",
      "palavrasChaveHMA": [
        "halux rigido",
        "hallux rigidus",
        "hallux limitus",
        "dedao rigido",
        "nao dobra o dedao"
      ],
      "tagsBusca": [
        "primeira mtf",
        "dorsiflexao halux",
        "artrose mtf"
      ],
      "categoriaClinica": "mobilidade_deformidade"
    },
    {
      "id": "dedo_martelo_pe",
      "nome": "Dedo em Martelo do Pé",
      "testes": [
        "Flexão predominante da PIP com avaliação do alinhamento do dedo",
        "Redutibilidade passiva da deformidade",
        "Dor/calosidade e conflito com calçado",
        "Mobilidade MTF e função durante apoio/propulsão"
      ],
      "interpretacao": "Classifique clinicamente como flexível ou rígido e relacione a deformidade aos sintomas, calçado e função. A fisioterapia atua sobre mobilidade, força e tolerância funcional; deformidade fixa sintomática pode exigir avaliação especializada.",
      "palavrasChaveHMA": [
        "dedo em martelo no pe",
        "dedo do pe dobrado",
        "hammertoe"
      ],
      "tagsBusca": [
        "hammertoe",
        "pip",
        "deformidade antepe"
      ],
      "categoriaClinica": "mobilidade_deformidade"
    },
    {
      "id": "dedo_garra_pe",
      "nome": "Dedo em Garra do Pé",
      "testes": [
        "Hiperextensão da MTF associada a flexão de PIP/DIP",
        "Redutibilidade passiva e mobilidade segmentar",
        "Calosidades, dor e tolerância ao calçado",
        "Triagem neurológica quando padrão for múltiplo, progressivo ou associado a fraqueza/sensibilidade"
      ],
      "interpretacao": "A deformidade pode ser flexível ou fixa. Quando bilateral/múltipla ou acompanhada de sinais neurológicos, não tratar apenas como alteração local do pé.",
      "palavrasChaveHMA": [
        "dedo em garra",
        "dedos em garra",
        "claw toe",
        "dedos enrolados no pe"
      ],
      "tagsBusca": [
        "claw toe",
        "deformidade dedos",
        "mtf pip dip"
      ],
      "categoriaClinica": "mobilidade_deformidade"
    },
    {
      "id": "instabilidade_placa_plantar_mtf",
      "nome": "Instabilidade da MTF / Lesão da Placa Plantar",
      "testes": [
        "Dor plantar na região da cabeça metatarsal, frequentemente 2ª MTF",
        "Alinhamento do dedo e possível desvio/subluxação",
        "Teste de drawer da MTF quando apropriado",
        "Dor com carga do antepé e relação com calçado/propulsão"
      ],
      "interpretacao": "Considere quando há dor plantar focal do antepé associada a instabilidade da MTF. Diferencie de neuroma interdigital, fratura por estresse e metatarsalgia inespecífica.",
      "palavrasChaveHMA": [
        "placa plantar",
        "dor embaixo do segundo dedo",
        "dedo subindo",
        "dor na cabeca do metatarso"
      ],
      "fatoresPioraRisco": [
        "carga"
      ],
      "tagsBusca": [
        "plantar plate",
        "mtf",
        "antepe",
        "instabilidade dedo"
      ],
      "categoriaClinica": "mobilidade_deformidade"
    },
    {
      "id": "metatarsalgia_mecanica",
      "nome": "Metatarsalgia Mecânica / Sobrecarga do Antepé",
      "testes": [
        "Dor plantar no antepé relacionada à carga",
        "Localização por cabeça metatarsal e presença de calosidade",
        "Mobilidade da primeira MTF/tornozelo e distribuição de carga durante marcha",
        "Diferenciar neuroma, placa plantar, fratura por estresse e condição inflamatória"
      ],
      "interpretacao": "Use como padrão funcional quando a dor do antepé é predominantemente relacionada à carga e não há condição específica mais convincente.",
      "palavrasChaveHMA": [
        "metatarsalgia",
        "dor no antepe",
        "dor na sola perto dos dedos",
        "dor nas cabecas dos metatarsos"
      ],
      "fatoresPioraRisco": [
        "carga"
      ],
      "tagsBusca": [
        "antepe",
        "cabecas metatarsais",
        "sobrecarga"
      ],
      "categoriaClinica": "mobilidade_deformidade"
    },
    {
      "id": "bunionette_quinto_metatarso",
      "nome": "Bunionette / Joanete do Quinto Metatarso",
      "testes": [
        "Proeminência lateral do quinto metatarso e alinhamento do quinto dedo",
        "Dor, calosidade e conflito com calçado",
        "Mobilidade local e tolerância à carga",
        "Diferenciar irritação cutânea, fratura por estresse e outras causas laterais do antepé"
      ],
      "interpretacao": "Relacione deformidade, calçado e sintomas. O objetivo fisioterapêutico é reduzir irritação, melhorar tolerância funcional e tratar limitações modificáveis.",
      "palavrasChaveHMA": [
        "bunionette",
        "joanete do quinto",
        "joanete pequeno",
        "osso do lado de fora do pe"
      ],
      "tagsBusca": [
        "tailors bunion",
        "quinto metatarso",
        "antepe lateral"
      ],
      "categoriaClinica": "mobilidade_deformidade"
    },
    {
      "id": "pe_planovalgo_funcional",
      "nome": "Pé Planovalgo / Pé Plano — avaliação funcional",
      "testes": [
        "Alinhamento do arco e retropé em carga sem usar postura isolada como diagnóstico",
        "Mobilidade do tornozelo e complexo do pé",
        "Elevação unilateral do calcanhar e capacidade do tibial posterior quando pertinente",
        "Relação entre postura, sintomas e tarefa funcional"
      ],
      "interpretacao": "Pé plano é uma característica estrutural frequente e não implica dor por si só. Use a ferramenta quando houver relação funcional plausível com sintomas, capacidade ou deformidade progressiva.",
      "palavrasChaveHMA": [
        "pe plano",
        "pe chato",
        "arco caiu",
        "planovalgo"
      ],
      "tagsBusca": [
        "pes planus",
        "retrope valgo",
        "arco medial"
      ],
      "categoriaClinica": "mobilidade_deformidade"
    },
    {
      "id": "pe_cavo_funcional",
      "nome": "Pé Cavo — avaliação funcional",
      "testes": [
        "Arco elevado e distribuição de carga plantar",
        "Mobilidade do retropé/antepé e tornozelo",
        "Calosidades, estabilidade e tolerância ao impacto",
        "Triagem neurológica quando deformidade for progressiva, bilateral marcante ou associada a fraqueza"
      ],
      "interpretacao": "Pé cavo pode ser apenas uma característica morfológica ou estar associado a sobrecarga e, em alguns casos, condição neurológica. Investigue progressão e sinais associados antes de assumir origem mecânica isolada.",
      "palavrasChaveHMA": [
        "pe cavo",
        "arco muito alto",
        "pes cavus"
      ],
      "tagsBusca": [
        "pes cavus",
        "arco alto",
        "supinacao estrutural"
      ],
      "categoriaClinica": "mobilidade_deformidade"
    },
    {
      "id": "limitacao_dorsiflexao_tornozelo_equinismo",
      "nome": "Limitação de Dorsiflexão do Tornozelo / Equinismo Funcional",
      "testes": [
        "Dorsiflexão em cadeia fechada e aberta conforme objetivo",
        "Comparar joelho flexionado e estendido quando útil para diferenciar contribuição do tríceps sural",
        "Mobilidade talocrural e resposta à carga",
        "Impacto funcional em agachamento, marcha, corrida ou escadas"
      ],
      "interpretacao": "Trate como déficit de mobilidade quando a limitação é reproduzível e funcionalmente relevante. Evite atribuir causalidade a sintomas distantes sem testar se modificar a dorsiflexão muda a tarefa.",
      "palavrasChaveHMA": [
        "tornozelo duro",
        "pouca dorsiflexao",
        "calcanhar levanta no agachamento",
        "equinismo"
      ],
      "tagsBusca": [
        "dorsiflexao",
        "gastrocnemio",
        "soleo",
        "talocrural"
      ],
      "categoriaClinica": "mobilidade_deformidade"
    },
    {
      "id": "tunel_tarsal_neural",
      "nome": "Síndrome do Túnel do Tarso / Neuropatia Tibial",
      "testes": [
        "Dor/queimação ou parestesia posterior ao maléolo medial",
        "Irradiação para planta do pé/dedos conforme distribuição tibial",
        "Provocação local e diferenciação de radiculopatia S1/S2 e causas plantares"
      ],
      "interpretacao": "Sintomas plantares neuropáticos originados no tornozelo medial podem justificar investigação do nervo tibial/túnel do tarso.",
      "tipoDorPreferido": [
        "neuropatica"
      ]
    },
    {
      "id": "fibular_superficial",
      "nome": "Neuropatia do Nervo Fibular Superficial",
      "testes": [
        "Parestesia/dor em perna anterolateral e dorso do pé",
        "Distribuição costuma poupar o primeiro espaço interdigital",
        "Avaliar eversão e diferenciar de L5/fibular comum"
      ],
      "interpretacao": "Localize a lesão comparando distribuição sensitiva, força e sítio de provocação.",
      "tipoDorPreferido": [
        "neuropatica"
      ]
    },
    {
      "id": "fibular_profundo",
      "nome": "Neuropatia do Nervo Fibular Profundo / Túnel Tarsal Anterior",
      "testes": [
        "Sintomas dorsais no tornozelo/pé com parestesia no primeiro espaço interdigital",
        "Possível associação a compressão por calçado/retináculo",
        "Diferenciação de L5 e fibular comum"
      ],
      "interpretacao": "Parestesia focal no primeiro espaço interdigital é uma pista de distribuição do fibular profundo, sempre correlacionada ao exame.",
      "tipoDorPreferido": [
        "neuropatica"
      ]
    },
    {
      "id": "neuropatia_sural",
      "nome": "Neuropatia do Nervo Sural — diferencial",
      "testes": [
        "Dor/parestesia posterolateral da panturrilha/tornozelo",
        "Irradiação para maléolo lateral e borda lateral do pé",
        "Ausência de déficit motor atribuível ao sural"
      ],
      "interpretacao": "O sural é predominantemente sensitivo; diferencie de S1 e de outras neuropatias periféricas.",
      "tipoDorPreferido": [
        "neuropatica"
      ]
    }
  ]
});
})();
