/* KineSys — banco clínico base regional atm 1.0.0.
 * Gerado deterministicamente de database/mapeamento_clinico.js.
 * Não editar manualmente sem atualizar o contrato de equivalência.
 */
(function(){
  'use strict';
  if(typeof BANCO_MAPEAMENTO_CLINICO==='undefined')return;
  BANCO_MAPEAMENTO_CLINICO["atm"]={
  "nome": "ATM / Dor Orofacial",
  "palavrasChave": [
    "atm",
    "articulacao temporomandibular",
    "mandibula",
    "maxilar",
    "masseter",
    "temporal",
    "mastigar",
    "mastigacao",
    "bruxismo",
    "apertamento",
    "estalo na mandibula",
    "travamento da boca"
  ],
  "clusters": [
    {
      "id": "dtm_dolorosa_muscular",
      "nome": "DTM dolorosa — componente muscular",
      "testes": [
        "Dor familiar em masseter/temporal é modificada por movimento mandibular, mastigação ou parafunção",
        "Palpação de masseter e/ou temporal reproduz a dor familiar do paciente",
        "Abertura máxima ou movimentos mandibulares reproduzem a dor familiar",
        "Não há sinais de condição odontogênica, infecciosa, traumática ou neurológica que expliquem melhor o quadro"
      ],
      "limiar": 2,
      "regraConfirmacao": {
        "tipo": "minimo",
        "minimo": 2
      },
      "interpretacao": "Padrão compatível com DTM dolorosa quando a dor familiar é modificada por função/parafunção mandibular e reproduzida no exame. Evite atribuir sintomas apenas a ruídos articulares ou postura.",
      "palavrasChaveHMA": [
        "dor na atm",
        "dor na mandibula",
        "dor no masseter",
        "dor ao mastigar",
        "dor ao abrir boca",
        "apertamento",
        "bruxismo"
      ],
      "mecanismoPreferido": [
        "insidioso",
        "esforco_repetitivo"
      ],
      "pesos": {
        "palavraChave": 2.1,
        "mecanismo": 0.4,
        "tipoDor": 0.3,
        "fatorPiora": 0,
        "esporte": 0,
        "ocupacao": 0,
        "comorbidade": 0,
        "medicamento": 0,
        "idade": 0,
        "cirurgia": 0.3
      },
      "evidencia": "DC/TMD Axis I; pain-related TMD."
    },
    {
      "id": "dtm_artralgia",
      "nome": "DTM dolorosa — artralgia da ATM",
      "testes": [
        "Dor familiar localizada na região pré-auricular/ATM é modificada por movimento ou função mandibular",
        "Palpação da ATM/lateral do polo condilar reproduz a dor familiar",
        "Abertura, lateralidade ou protrusão reproduzem a dor familiar na ATM",
        "Ausência de sinais que indiquem trauma/fratura, infecção ou outra condição que explique melhor a dor"
      ],
      "limiar": 2,
      "regraConfirmacao": {
        "tipo": "minimo",
        "minimo": 2
      },
      "interpretacao": "Compatibilidade com artralgia depende da reprodução de dor familiar na ATM em contexto coerente. Ruído articular isolado não é suficiente para classificar dor articular.",
      "palavrasChaveHMA": [
        "dor na articulacao da mandibula",
        "dor pre auricular",
        "dor na atm",
        "dor na frente do ouvido"
      ],
      "pesos": {
        "palavraChave": 2,
        "mecanismo": 0.2,
        "tipoDor": 0.3,
        "fatorPiora": 0,
        "esporte": 0,
        "ocupacao": 0,
        "comorbidade": 0,
        "medicamento": 0,
        "idade": 0,
        "cirurgia": 0.3
      },
      "evidencia": "DC/TMD Axis I; arthralgia."
    }
  ],
  "diferenciais": [
    {
      "id": "cefaleia_atribuida_dtm",
      "nome": "Cefaleia atribuída à DTM",
      "testes": [
        "Há DTM dolorosa clinicamente compatível",
        "A cefaleia temporal é agravada por mastigação, movimento mandibular ou parafunção",
        "Palpação do temporal e/ou movimentos mandibulares reproduzem a cefaleia familiar"
      ],
      "interpretacao": "A coexistência de cefaleia e DTM não implica que uma cause a outra. A reprodução da cefaleia familiar e a modulação pela função mandibular aumentam a plausibilidade causal.",
      "palavrasChaveHMA": [
        "cefaleia piora mastigar",
        "dor temporal mastigar",
        "dor de cabeca bruxismo",
        "dor de cabeca ao abrir boca"
      ],
      "pesos": {
        "palavraChave": 2.4
      },
      "evidencia": "ICHD-3 11.7; DC/TMD headache attributed to TMD."
    },
    {
      "id": "dor_orofacial_referida_cervical",
      "nome": "Componente cervical associado / dor referida",
      "testes": [
        "Movimentos cervicais reproduzem ou modificam a dor orofacial/temporal familiar",
        "Há limitação cervical ou achados cervicais concordantes com o comportamento dos sintomas",
        "O exame da ATM isoladamente não explica toda a queixa"
      ],
      "interpretacao": "Dor cervical e DTM frequentemente coexistem. Use reprodução familiar e comportamento mecânico para identificar contribuição cervical sem assumir causalidade automática.",
      "palavrasChaveHMA": [
        "dor cervical e atm",
        "dor no pescoco e mandibula",
        "pescoco irradia para mandibula"
      ],
      "pesos": {
        "palavraChave": 1.4
      }
    },
    {
      "id": "dtm_disco_com_reducao",
      "nome": "Deslocamento de disco da ATM com redução — hipótese",
      "testes": [
        "Estalido articular reprodutível durante abertura e fechamento em padrão compatível",
        "História de clique/estalido da ATM associado ao movimento mandibular",
        "Não há travamento fechado persistente ou limitação importante de abertura que sugira deslocamento sem redução"
      ],
      "regraConfirmacao": {
        "tipo": "combinada",
        "obrigatorios": [
          0
        ],
        "minimo": 2
      },
      "interpretacao": "Ruído articular isolado não implica necessidade de tratamento. A hipótese é mais relevante quando o som é reprodutível e associado a sintomas ou alteração funcional.",
      "palavrasChaveHMA": [
        "estalo na atm",
        "mandibula estala",
        "clique na mandibula"
      ],
      "pesos": {
        "palavraChave": 1.7
      }
    },
    {
      "id": "dtm_disco_sem_reducao_limitacao",
      "nome": "Deslocamento de disco da ATM sem redução com limitação — hipótese",
      "testes": [
        "História de travamento fechado/episódio em que a boca deixou de abrir normalmente",
        "Abertura máxima está reduzida de forma clinicamente relevante e há desvio/deflexão compatível",
        "O padrão atual não é explicado melhor por dor muscular isolada, trauma/fratura ou processo infeccioso"
      ],
      "regraConfirmacao": {
        "tipo": "combinada",
        "obrigatorios": [
          0,
          1
        ],
        "minimo": 2
      },
      "interpretacao": "Travamento e limitação de abertura sustentam a hipótese de deslocamento sem redução, mas diagnóstico definitivo depende de critérios clínicos apropriados e, quando necessário, avaliação odontológica especializada/imagem.",
      "palavrasChaveHMA": [
        "travou a boca",
        "mandibula travada",
        "nao consegue abrir a boca",
        "abertura limitada"
      ],
      "pesos": {
        "palavraChave": 2.1
      }
    },
    {
      "id": "dtm_doenca_articular_degenerativa",
      "nome": "Doença articular degenerativa da ATM — hipótese",
      "testes": [
        "Crepitação grosseira/reprodutível durante movimento mandibular",
        "Dor/rigidez articular e limitação funcional compatíveis com envolvimento articular",
        "História e exame justificam considerar avaliação odontológica/imagem quando o resultado puder alterar a conduta"
      ],
      "regraConfirmacao": {
        "tipo": "minimo",
        "minimo": 2
      },
      "interpretacao": "Crepitação associada a sintomas articulares pode justificar investigação de doença degenerativa. Ruído isolado em paciente assintomático não deve ser tratado como doença por si só.",
      "palavrasChaveHMA": [
        "crepitacao na atm",
        "atm rangendo",
        "artrose na atm",
        "mandibula rangendo"
      ],
      "idadeFaixaBonus": {
        "min": 40,
        "max": 100,
        "bonus": 0.5
      },
      "pesos": {
        "palavraChave": 1.8,
        "idade": 0.4
      }
    },
    {
      "id": "dtm_subluxacao",
      "nome": "Subluxação / travamento aberto da ATM — hipótese",
      "testes": [
        "História de travamento em posição aberta ou necessidade de manobra para conseguir fechar a boca",
        "Episódios recorrentes de hipermobilidade mandibular com sensação de deslocamento"
      ],
      "regraConfirmacao": {
        "tipo": "qualquer"
      },
      "interpretacao": "Episódios de travamento aberto sugerem hipermobilidade/subluxação. Luxação persistente ou incapacidade atual de fechar a boca exige atendimento médico/odontológico imediato.",
      "palavrasChaveHMA": [
        "boca travou aberta",
        "mandibula saiu do lugar",
        "nao consegue fechar a boca"
      ],
      "pesos": {
        "palavraChave": 2.3
      }
    },
    {
      "id": "neuralgia_trigeminal_diferencial",
      "nome": "Neuralgia do Trigêmeo — diferencial neurológico",
      "testes": [
        "Dor facial unilateral em choques/descargas, de duração breve e recorrente",
        "Crises são desencadeadas por estímulos leves como tocar o rosto, falar, escovar dentes ou mastigar",
        "O padrão neuralgiforme não é reproduzido como dor musculoesquelética familiar pela palpação/movimento da ATM"
      ],
      "regraConfirmacao": {
        "tipo": "combinada",
        "obrigatorios": [
          0,
          1
        ],
        "minimo": 2
      },
      "interpretacao": "Padrão sugestivo de neuralgia trigeminal requer avaliação médica/neurológica. Não atribuir automaticamente a DTM quando a dor é paroxística, elétrica e desencadeada por estímulos leves.",
      "palavrasChaveHMA": [
        "choque no rosto",
        "dor eletrica no rosto",
        "choque ao tocar rosto",
        "neuralgia trigemeo"
      ],
      "pesos": {
        "palavraChave": 2.4,
        "tipoDor": 1.2
      }
    },
    {
      "id": "origem_dentaria_otologica",
      "nome": "Origem dentária / otológica — diferencial de encaminhamento",
      "testes": [
        "Dor dentária localizada, hipersensibilidade térmica, edema gengival ou história odontológica compatível",
        "Otalgia, secreção, perda auditiva ou sintomas otológicos predominantes",
        "Sintomas não são reproduzidos de forma consistente pelo exame musculoesquelético da ATM/cervical"
      ],
      "interpretacao": "Quando os achados sugerem origem dentária ou otológica, encaminhar para avaliação profissional apropriada em vez de atribuir o quadro à DTM.",
      "palavrasChaveHMA": [
        "dor de dente",
        "dente sensivel",
        "ouvido inflamado",
        "secrecao no ouvido",
        "perda auditiva"
      ],
      "pesos": {
        "palavraChave": 1.8
      }
    }
  ],
  "redFlags": [
    "Trauma facial/mandibular importante, deformidade, maloclusão nova ou incapacidade de fechar/abrir a boca — considerar fratura/luxação e encaminhamento",
    "Edema facial progressivo, febre, calor/rubor, secreção ou comprometimento sistêmico — considerar infecção odontogênica/articular",
    "Trismo progressivo sem explicação mecânica, massa, perda de peso ou dor noturna progressiva — investigar causa não musculoesquelética",
    "Alteração sensitiva facial nova, déficit de nervos cranianos ou sintomas neurológicos associados",
    "Em paciente >50 anos: dor/fadiga mandibular ao mastigar associada a nova cefaleia temporal, sensibilidade do couro cabeludo ou sintomas visuais — não presumir DTM; considerar arterite de células gigantes"
  ]
};
})();
