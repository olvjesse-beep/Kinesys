/* KineSys — banco clínico base regional cefaleia 1.0.0.
 * Gerado deterministicamente de database/mapeamento_clinico.js.
 * Não editar manualmente sem atualizar o contrato de equivalência.
 */
(function(){
  'use strict';
  if(typeof BANCO_MAPEAMENTO_CLINICO==='undefined')return;
  BANCO_MAPEAMENTO_CLINICO["cefaleia"]={
  "nome": "Cabeça / Cefaleia — triagem",
  "palavrasChave": [
    "cefaleia",
    "dor de cabeca",
    "dor na cabeca",
    "enxaqueca",
    "migranea",
    "temporal",
    "testa"
  ],
  "clusters": [
    {
      "id": "cefaleia_cervicogenica_triagem",
      "nome": "Cefaleia Cervicogênica — investigação causal",
      "testes": [
        "Há relação temporal clara entre o início/piora da cefaleia e o quadro cervical",
        "ADM cervical está reduzida e movimentos/manobras cervicais reproduzem ou pioram a cefaleia familiar",
        "Teste de Flexão-Rotação Cervical (CFRT) está restrito e/ou reproduz a cefaleia familiar",
        "A cefaleia melhora de forma concordante quando o quadro cervical melhora"
      ],
      "limiar": 2,
      "regraConfirmacao": {
        "tipo": "minimo",
        "minimo": 2
      },
      "interpretacao": "Compatibilidade aumenta quando existe evidência de relação causal com a coluna cervical. A coexistência de dor cervical e cefaleia, isoladamente, não confirma cefaleia cervicogênica. Diferenciar de cefaleias primárias e de causas secundárias.",
      "palavrasChaveHMA": [
        "dor de cabeca comeca no pescoco",
        "dor da nuca para a testa",
        "cefaleia piora ao mexer pescoco",
        "dor de cabeca ao virar pescoco"
      ],
      "mecanismoPreferido": [
        "insidioso",
        "esforco_repetitivo"
      ],
      "fatoresPioraRisco": [
        "movimento",
        "posicao_sentada"
      ],
      "pesos": {
        "palavraChave": 2.3,
        "mecanismo": 0.4,
        "tipoDor": 0.3,
        "fatorPiora": 0.4,
        "esporte": 0,
        "ocupacao": 0.1,
        "comorbidade": 0,
        "medicamento": 0,
        "idade": 0,
        "cirurgia": 0
      },
      "evidencia": "ICHD-3 11.2.1; critérios de causalidade cervical."
    },
    {
      "id": "cefaleia_atribuida_dtm_triagem",
      "nome": "Cefaleia atribuída à DTM — investigação causal",
      "testes": [
        "A cefaleia é temporal/preauricular e mudou em relação temporal com o início da dor/disfunção temporomandibular",
        "Movimento mandibular, mastigação ou parafunção (ex.: bruxismo/apertamento) pioram a cefaleia familiar",
        "Palpação do músculo temporal reproduz a cefaleia familiar",
        "Abertura, lateralidade ou protrusão mandibular reproduzem a cefaleia familiar"
      ],
      "limiar": 2,
      "regraConfirmacao": {
        "tipo": "minimo",
        "minimo": 2
      },
      "interpretacao": "A simples coexistência de dor na ATM e cefaleia não estabelece causalidade. Priorize reprodução da cefaleia familiar por função mandibular/palpação e relação temporal com DTM dolorosa.",
      "palavrasChaveHMA": [
        "dor temporal piora mastigar",
        "cefaleia piora mastigacao",
        "dor de cabeca piora bruxismo",
        "cefaleia reproduzida ao abrir boca"
      ],
      "pesos": {
        "palavraChave": 2.5,
        "mecanismo": 0,
        "tipoDor": 0,
        "fatorPiora": 0,
        "esporte": 0,
        "ocupacao": 0,
        "comorbidade": 0,
        "medicamento": 0,
        "idade": 0,
        "cirurgia": 0
      },
      "evidencia": "ICHD-3 11.7; DC/TMD headache attributed to TMD."
    }
  ],
  "diferenciais": [
    {
      "id": "fenotipo_migranoso_triagem",
      "nome": "Fenótipo migranoso — diferencial",
      "testes": [
        "Crises recorrentes com duração típica de horas e padrão semelhante entre episódios",
        "Dor pulsátil e/ou moderada a forte, frequentemente piorada por atividade física rotineira",
        "Náusea e/ou vômitos associados",
        "Fotofobia e/ou fonofobia associadas"
      ],
      "regraConfirmacao": {
        "tipo": "combinada",
        "obrigatorios": [
          0,
          3
        ],
        "minimo": 3
      },
      "interpretacao": "Achados podem ser compatíveis com fenótipo migranoso, mas o KineSys não confirma diagnóstico de migrânea. Em cefaleia nova, atípica ou com red flags, priorize investigação médica.",
      "palavrasChaveHMA": [
        "pulsatil",
        "latejante",
        "nausea",
        "fotofobia",
        "fonofobia",
        "enxaqueca",
        "migranea"
      ],
      "pesos": {
        "palavraChave": 1.5
      }
    },
    {
      "id": "fenotipo_tensional_triagem",
      "nome": "Fenótipo tipo tensão — diferencial",
      "testes": [
        "Dor bilateral ou difusa em pressão/aperto, não predominantemente pulsátil",
        "Intensidade leve a moderada",
        "Atividade física rotineira não agrava de forma importante",
        "Sem náusea/vômitos relevantes; quando há foto/fonofobia, no máximo uma delas é predominante"
      ],
      "regraConfirmacao": {
        "tipo": "minimo",
        "minimo": 3
      },
      "interpretacao": "Achados podem ser compatíveis com cefaleia tipo tensão, mas a classificação depende da história longitudinal e da exclusão de causas secundárias.",
      "palavrasChaveHMA": [
        "pressao na cabeca",
        "aperto na cabeca",
        "peso na cabeca",
        "cefaleia bilateral",
        "dor em faixa"
      ],
      "pesos": {
        "palavraChave": 1.4
      }
    },
    {
      "id": "cefaleia_uso_excessivo_medicacao",
      "nome": "Cefaleia por uso excessivo de medicação — rastreamento",
      "testes": [
        "Cefaleia ocorre em 15 ou mais dias por mês em paciente com cefaleia pré-existente",
        "Uso excessivo regular de medicação aguda/sintomática para cefaleia por mais de 3 meses",
        "O padrão de frequência aumentou no mesmo período do uso frequente de medicação"
      ],
      "regraConfirmacao": {
        "tipo": "combinada",
        "obrigatorios": [
          0,
          1
        ],
        "minimo": 2
      },
      "interpretacao": "Padrão que merece revisão médica do manejo farmacológico e da cefaleia de base. Não orientar retirada abrupta de medicação prescrita sem avaliação do profissional responsável.",
      "palavrasChaveHMA": [
        "analgesico todo dia",
        "remedio para dor de cabeca todo dia",
        "cefaleia diaria",
        "dor de cabeca quase todo dia"
      ],
      "pesos": {
        "palavraChave": 1.8,
        "medicamento": 1.2
      }
    },
    {
      "id": "neuralgia_occipital",
      "nome": "Neuralgia Occipital — diferencial",
      "testes": [
        "Dor paroxística em choque, pontada ou facada na região occipital, podendo irradiar anteriormente",
        "Hipersensibilidade, alodinia ou sensibilidade focal no trajeto do nervo occipital",
        "O padrão é episódico/paroxístico e não é melhor explicado apenas por cefaleia primária ou dor cervical mecânica"
      ],
      "regraConfirmacao": {
        "tipo": "minimo",
        "minimo": 2
      },
      "interpretacao": "Padrão neuralgiforme occipital deve ser diferenciado de cefaleia cervicogênica e migrânea. Déficits neurológicos ou apresentação atípica exigem avaliação médica.",
      "palavrasChaveHMA": [
        "choque na nuca",
        "pontada na nuca",
        "dor occipital em choque",
        "nervo occipital"
      ],
      "pesos": {
        "palavraChave": 2,
        "tipoDor": 1.2
      }
    },
    {
      "id": "cefaleia_rinossinusal_secundaria",
      "nome": "Cefaleia associada a rinossinusite — diferencial médico",
      "testes": [
        "Há sintomas nasossinusais objetivos/relevantes concomitantes, como secreção purulenta, obstrução nasal importante ou alteração de olfato",
        "A cefaleia surgiu ou piorou em relação temporal ao quadro nasossinusal",
        "A evolução da dor acompanha a melhora/piora do quadro nasossinusal"
      ],
      "regraConfirmacao": {
        "tipo": "minimo",
        "minimo": 2
      },
      "interpretacao": "Evite o rótulo inespecífico de 'cefaleia sinusal' sem sinais nasossinusais. Quando o padrão é convincente, orientar avaliação médica/otorrinolaringológica conforme gravidade e duração.",
      "palavrasChaveHMA": [
        "sinusite",
        "secrecao nasal",
        "nariz entupido e dor de cabeca",
        "dor facial com secrecao"
      ],
      "pesos": {
        "palavraChave": 1.8
      }
    }
  ],
  "redFlags": [
    "Cefaleia de início súbito/abrupto, máxima em segundos ou descrita como a pior da vida — requer avaliação médica urgente",
    "Cefaleia nova ou com mudança importante de padrão associada a déficit neurológico focal, alteração de consciência, convulsão ou papiledema",
    "Febre, rigidez cervical importante, imunossupressão, infecção sistêmica ou estado geral comprometido associados à cefaleia",
    "Cefaleia nova após trauma relevante, durante gestação/puerpério ou precipitada de forma incomum por tosse, esforço ou mudança postural",
    "Em paciente >50 anos: nova cefaleia temporal/occipital com claudicação mandibular, sensibilidade do couro cabeludo ou sintomas visuais — considerar arterite de células gigantes e encaminhamento urgente",
    "Dor ocular intensa com alterações visuais/autonômicas ou cefaleia progressiva/atípica sem explicação musculoesquelética"
  ]
};
})();
