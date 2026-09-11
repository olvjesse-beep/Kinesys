/* KineSys — banco clínico base regional coluna_toracica 1.0.0.
 * Gerado deterministicamente de database/mapeamento_clinico.js.
 * Não editar manualmente sem atualizar o contrato de equivalência.
 */
(function(){
  'use strict';
  if(typeof BANCO_MAPEAMENTO_CLINICO==='undefined')return;
  BANCO_MAPEAMENTO_CLINICO["coluna_toracica"]={
  "nome": "Coluna Torácica / Costelas",
  "palavrasChave": [
    "toracica",
    "dorsal",
    "costela",
    "interescapular",
    "meio das costas",
    "torax"
  ],
  "clusters": [
    {
      "id": "dor_toracica_musculoesqueletica",
      "nome": "Dor Torácica Musculoesquelética / Mecânica",
      "testes": [
        "Dor familiar reproduzida de forma consistente por movimento/carga torácica",
        "Palpação/mobilização local reproduz a queixa em conjunto com o restante do exame",
        "Ausência de sinais sistêmicos, neurológicos e viscerais preocupantes"
      ],
      "limiar": 2,
      "interpretacao": "Dor torácica pode ser classificada como musculoesquelética quando existe reprodução mecânica concordante e a triagem de causas sérias é tranquilizadora. Hipomobilidade palpada isoladamente não prova uma 'disfunção vertebral'.",
      "palavrasChaveHMA": [
        "dor no meio das costas",
        "dor entre as escapulas",
        "dor toracica ao mexer",
        "dor na costela ao movimento"
      ],
      "mecanismoPreferido": [
        "insidioso",
        "esforco_repetitivo",
        "trauma_agudo"
      ],
      "tipoDorPreferido": [
        "mecanica"
      ],
      "fatoresPioraRisco": [
        "movimento",
        "posicao_sentada"
      ],
      "pesos": {
        "palavraChave": 1.5,
        "mecanismo": 0.4,
        "tipoDor": 1.2,
        "fatorPiora": 0.4,
        "esporte": 0.05,
        "ocupacao": 0.05,
        "comorbidade": 0,
        "medicamento": 0,
        "idade": 0,
        "cirurgia": 0.3
      }
    },
    {
      "id": "lesao_costal_traumatica",
      "nome": "Lesão Costal / Fratura de Costela — suspeita",
      "testes": [
        "Trauma direto ou compressão torácica recente",
        "Dor focal costal intensa à palpação/respiração/tosse",
        "Dispneia ou sinais respiratórios associados exigem maior cautela"
      ],
      "limiar": 2,
      "interpretacao": "Dor costal focal após trauma pode representar contusão ou fratura. A presença de dispneia, hipóxia, dor pleurítica intensa ou trauma relevante requer avaliação médica para complicações torácicas.",
      "palavrasChaveHMA": [
        "pancada na costela",
        "caiu e bateu costela",
        "dor para respirar",
        "costela quebrada"
      ],
      "mecanismoPreferido": [
        "trauma_agudo"
      ],
      "pesos": {
        "palavraChave": 2.5,
        "mecanismo": 2.5,
        "tipoDor": 0.5,
        "fatorPiora": 0.5,
        "esporte": 0,
        "ocupacao": 0,
        "comorbidade": 0,
        "medicamento": 0,
        "idade": 0.5,
        "cirurgia": 0
      }
    },
    {
      "id": "fratura_toracica_compressao",
      "nome": "Suspeita / pós-fratura vertebral torácica por compressão",
      "testes": [
        "Trauma ou fragilidade óssea relevante",
        "Dor focal torácica nova e intensa",
        "História de osteoporose, câncer ou uso prolongado de corticoide",
        "Estado neurológico e respiratório sem deterioração"
      ],
      "limiar": 2,
      "interpretacao": "Dor torácica focal após trauma ou em pessoa com fragilidade óssea deve elevar a suspeita de fratura vertebral. Em pós-fratura, carga e exercício dependem de estabilidade, sintomas, consolidação e orientação médica; sinais neurológicos ou sistêmicos exigem reavaliação.",
      "palavrasChaveHMA": [
        "fratura toracica",
        "vertebra toracica quebrada",
        "compressao toracica",
        "fratura coluna dorsal"
      ],
      "mecanismoPreferido": [
        "trauma_agudo",
        "pos_cirurgico"
      ],
      "medicamentosRisco": [
        "corticoide"
      ],
      "idadeFaixaBonus": {
        "min": 65,
        "max": 100,
        "bonus": 1
      },
      "pesos": {
        "palavraChave": 2.5,
        "mecanismo": 2.3,
        "tipoDor": 0.3,
        "fatorPiora": 0,
        "esporte": 0,
        "ocupacao": 0,
        "comorbidade": 1,
        "medicamento": 1.5,
        "idade": 1,
        "cirurgia": 1
      }
    },
    {
      "id": "fratura_costela_reabilitacao",
      "nome": "Fratura de costela / trauma torácico musculoesquelético",
      "testes": [
        "Trauma torácico compatível e dor focal à palpação/respiração",
        "Dor com tosse, inspiração profunda ou movimento do tronco",
        "Saturação, dispneia e sinais respiratórios monitorados quando aplicável",
        "Sem sinais de pneumotórax, hemotórax ou deterioração respiratória"
      ],
      "limiar": 2,
      "interpretacao": "Fratura de costela pode ser tratada conservadoramente em muitos casos, mas a prioridade é reconhecer complicações respiratórias e dor que limita ventilação. Dispneia progressiva, dessaturação, trauma de alta energia ou piora sistêmica requerem avaliação médica imediata.",
      "palavrasChaveHMA": [
        "fratura costela",
        "costela quebrada",
        "pancada nas costelas",
        "dor para respirar depois de queda"
      ],
      "mecanismoPreferido": [
        "trauma_agudo"
      ],
      "pesos": {
        "palavraChave": 2.3,
        "mecanismo": 2.2,
        "tipoDor": 0.8,
        "fatorPiora": 0.4,
        "esporte": 0,
        "ocupacao": 0,
        "comorbidade": 0.3,
        "medicamento": 0,
        "idade": 0.2,
        "cirurgia": 0
      }
    },
    {
      "id": "lesao_intercostal",
      "nome": "Lesão muscular intercostal / parede torácica",
      "testes": [
        "Dor focal após rotação, tosse intensa ou esforço",
        "Dor reproduzida por contração/alongamento do tronco ou inspiração profunda",
        "Sensibilidade musculoesquelética localizada",
        "Ausência de sinais cardiorrespiratórios de alarme"
      ],
      "limiar": 2,
      "interpretacao": "Padrão musculoesquelético da parede torácica é plausível quando a dor é claramente reprodutível por movimento/carga e não há sinais sistêmicos ou cardiorrespiratórios. O diagnóstico por exclusão é particularmente importante na região torácica.",
      "palavrasChaveHMA": [
        "puxou intercostal",
        "dor muscular entre costelas",
        "estiramento toracico",
        "dor ao girar e respirar"
      ],
      "mecanismoPreferido": [
        "trauma_agudo",
        "esforco_repetitivo"
      ],
      "tipoDorPreferido": [
        "mecanica"
      ],
      "pesos": {
        "palavraChave": 1.8,
        "mecanismo": 1.5,
        "tipoDor": 1,
        "fatorPiora": 0.4,
        "esporte": 0.1,
        "ocupacao": 0.1,
        "comorbidade": 0,
        "medicamento": 0,
        "idade": 0,
        "cirurgia": 0
      }
    }
  ],
  "diferenciais": [
    {
      "id": "dor_visceral_toracica",
      "nome": "Origem Visceral / Cardiopulmonar / Gastrointestinal",
      "testes": [
        "Dor não reproduzida de forma convincente pelo exame musculoesquelético",
        "Relação com esforço cardiovascular, alimentação, respiração ou sintomas sistêmicos",
        "Sinais vitais/sintomas associados levantam suspeita não musculoesquelética"
      ],
      "interpretacao": "Dor torácica/interescapular não mecânica deve manter baixo limiar para investigação de causas cardiopulmonares, vasculares ou viscerais conforme perfil clínico."
    },
    {
      "id": "radiculopatia_toracica",
      "nome": "Radiculopatia Torácica / Herpes Zoster — diferencial",
      "testes": [
        "Dor em faixa dermatomérica ao redor do tórax",
        "Alodinia/hipersensibilidade cutânea segmentar",
        "Rash vesicular presente ou surgindo posteriormente (herpes zoster)"
      ],
      "interpretacao": "Padrão em faixa com alterações sensitivas pode sugerir radiculopatia ou herpes zoster. Investigue causas espinais e não espinais conforme contexto."
    },
    {
      "id": "fratura_compressao_toracica_diferencial",
      "nome": "Fratura Vertebral por Compressão — hipótese de segurança",
      "testes": [
        "Idade avançada/osteoporose/uso prolongado de corticoide",
        "Dor torácica aguda focal após trauma menor ou espontânea",
        "Dor à percussão/carga axial em contexto compatível"
      ],
      "interpretacao": "A combinação de risco ósseo e dor focal aguda deve levar à consideração de fratura por compressão e avaliação por imagem."
    }
  ],
  "redFlags": [
    "Dor torácica súbita/intensa com dispneia, sudorese, síncope, dor no peito ou irradiação — considerar emergência cardiopulmonar/vascular",
    "Dor interescapular abrupta e intensa com sintomas vasculares/neurológicos — considerar síndrome aórtica aguda",
    "Trauma torácico com dificuldade respiratória, hipóxia, assimetria ventilatória ou dor pleurítica importante",
    "História de câncer, perda de peso, dor progressiva não mecânica ou dor torácica persistente inexplicada",
    "Febre, imunossupressão, infecção recente ou dor espinal progressiva — considerar infecção",
    "Osteoporose, idade avançada ou uso prolongado de corticoide com dor torácica focal aguda — considerar fratura vertebral",
    "Sinais neurológicos de medula torácica: alteração de marcha, hiperreflexia, nível sensitivo, fraqueza bilateral ou disfunção esfincteriana",
    "Trauma torácico com dispneia, dessaturação, cianose, dor respiratória progressiva ou instabilidade clínica — considerar complicação intratorácica e encaminhar imediatamente"
  ]
};
})();
