/* KineSys — banco clínico base regional cotovelo 1.0.0.
 * Gerado deterministicamente de database/mapeamento_clinico.js.
 * Não editar manualmente sem atualizar o contrato de equivalência.
 */
(function(){
  'use strict';
  if(typeof BANCO_MAPEAMENTO_CLINICO==='undefined')return;
  BANCO_MAPEAMENTO_CLINICO["cotovelo"]={
  "nome": "Cotovelo / Antebraço",
  "palavrasChave": [
    "cotovelo",
    "epicondilo",
    "antebraco",
    "ulnar",
    "tenista",
    "golfista"
  ],
  "clusters": [
    {
      "id": "tendinopatia_lateral_cotovelo",
      "nome": "Dor Lateral do Cotovelo / Tendinopatia Extensora",
      "testes": [
        "Dor à palpação no epicôndilo lateral / origem extensora",
        "Extensão de punho resistida (Cozen) reproduz dor lateral familiar",
        "Extensão do dedo médio / Maudsley ou preensão reproduz dor",
        "Grip strength dolorosa/reduzida comparativamente"
      ],
      "limiar": 2,
      "interpretacao": "O diagnóstico é predominantemente clínico: dor lateral relacionada à carga dos extensores e redução de força de preensão por dor. Cozen/Mill/Maudsley isolados não definem gravidade estrutural.",
      "palavrasChaveHMA": [
        "dor do lado de fora do cotovelo",
        "cotovelo de tenista",
        "dor apertando",
        "dor segurando peso"
      ],
      "mecanismoPreferido": [
        "esforco_repetitivo",
        "insidioso"
      ],
      "tipoDorPreferido": [
        "mecanica"
      ],
      "ocupacoesRisco": [
        "mecanico",
        "pintor",
        "carpinteiro"
      ],
      "esportesRisco": [
        "tenis",
        "beach tennis",
        "padel"
      ],
      "pesos": {
        "palavraChave": 2,
        "mecanismo": 0.8,
        "tipoDor": 1,
        "fatorPiora": 0.3,
        "esporte": 0.15,
        "ocupacao": 0.15,
        "comorbidade": 0,
        "medicamento": 0.2,
        "idade": 0,
        "cirurgia": 0.2
      }
    },
    {
      "id": "tendinopatia_medial_cotovelo",
      "nome": "Dor Medial do Cotovelo / Tendinopatia Flexor-Pronadora",
      "testes": [
        "Dor à palpação na origem flexor-pronadora",
        "Flexão de punho/pronação resistida reproduz dor medial",
        "Alongamento passivo dos flexores reproduz dor local"
      ],
      "limiar": 2,
      "interpretacao": "Padrão de dor medial dependente de carga dos flexores/pronadores apoia tendinopatia medial. Diferenciar de UCL e neuropatia ulnar.",
      "palavrasChaveHMA": [
        "dor do lado de dentro do cotovelo",
        "cotovelo de golfista",
        "dor flexionando punho"
      ],
      "mecanismoPreferido": [
        "esforco_repetitivo"
      ],
      "tipoDorPreferido": [
        "mecanica"
      ],
      "pesos": {
        "palavraChave": 2,
        "mecanismo": 0.8,
        "tipoDor": 1,
        "fatorPiora": 0.3,
        "esporte": 0.1,
        "ocupacao": 0.1,
        "comorbidade": 0,
        "medicamento": 0,
        "idade": 0,
        "cirurgia": 0.2
      }
    },
    {
      "id": "instabilidade_ucl",
      "nome": "Lesão / Instabilidade do Ligamento Colateral Ulnar",
      "testes": [
        "Moving Valgus Stress Test reproduz dor/instabilidade medial",
        "Milking Maneuver / valgus stress concordante",
        "História de arremesso/valgo repetido ou trauma"
      ],
      "limiar": 2,
      "interpretacao": "Em atleta de arremesso, história e Moving Valgus Stress Test concordantes aumentam a suspeita de UCL. Diferencie dor flexor-pronadora e neuropatia ulnar.",
      "palavrasChaveHMA": [
        "dor medial arremessando",
        "cotovelo abre",
        "ligamento ulnar"
      ],
      "mecanismoPreferido": [
        "trauma_agudo",
        "esforco_repetitivo"
      ],
      "esportesRisco": [
        "beisebol",
        "handebol",
        "volei",
        "arremesso"
      ],
      "pesos": {
        "palavraChave": 2.2,
        "mecanismo": 1.5,
        "tipoDor": 0.8,
        "fatorPiora": 0.2,
        "esporte": 0.25,
        "ocupacao": 0,
        "comorbidade": 0,
        "medicamento": 0,
        "idade": 0,
        "cirurgia": 0.3
      }
    },
    {
      "id": "ruptura_biceps_distal",
      "nome": "Suspeita de ruptura do bíceps distal",
      "testes": [
        "Hook test alterado/ausência do tendão palpável em contexto compatível",
        "Mecanismo excêntrico súbito com estalo ou equimose anterior",
        "Fraqueza importante de supinação e flexão",
        "Alteração do contorno do bíceps / sinal clínico concordante"
      ],
      "limiar": 2,
      "interpretacao": "A combinação de história e exame físico pode identificar ruptura completa com boa confiança; suspeita de lesão parcial ou exame inconclusivo pode exigir imagem. Em ruptura completa aguda e paciente de alta demanda, avaliação ortopédica precoce é importante.",
      "palavrasChaveHMA": [
        "rompeu biceps",
        "estalo no cotovelo",
        "biceps subiu",
        "fraqueza para girar a palma"
      ],
      "mecanismoPreferido": [
        "trauma_agudo"
      ],
      "esportesRisco": [
        "musculacao",
        "crossfit",
        "powerlifting"
      ],
      "pesos": {
        "palavraChave": 2.8,
        "mecanismo": 2.5,
        "tipoDor": 0.5,
        "fatorPiora": 0,
        "esporte": 0.2,
        "ocupacao": 0.1,
        "comorbidade": 0,
        "medicamento": 0.3,
        "idade": 0.4,
        "cirurgia": 0
      },
      "evidencia": "Distal biceps diagnostic strategy cohort; systematic reviews of treatment/rehabilitation."
    },
    {
      "id": "fratura_cotovelo_pos_operatorio",
      "nome": "Pós-fratura do cotovelo — olécrano / cabeça do rádio / úmero distal",
      "testes": [
        "Tipo de fratura, fixação e estabilidade documentados",
        "Restrições de flexo-extensão, prono-supinação e carga registradas",
        "Edema, ADM, função e estado neurovascular monitorados",
        "Sem infecção, perda de redução, bloqueio mecânico novo ou neuropatia progressiva"
      ],
      "limiar": 2,
      "interpretacao": "O cotovelo é propenso a rigidez após trauma, mas a mobilização deve respeitar estabilidade da fratura/fixação e tecidos reparados. O KineSys deve registrar restrições específicas do procedimento em vez de sugerir ganho de ADM indiscriminado.",
      "palavrasChaveHMA": [
        "fratura cotovelo",
        "fratura olecrano",
        "fratura cabeca radio",
        "fratura umero distal",
        "placa cotovelo"
      ],
      "mecanismoPreferido": [
        "trauma_agudo",
        "pos_cirurgico"
      ],
      "pesos": {
        "palavraChave": 2.4,
        "mecanismo": 2.4,
        "tipoDor": 0,
        "fatorPiora": 0,
        "esporte": 0,
        "ocupacao": 0,
        "comorbidade": 0.2,
        "medicamento": 0.2,
        "idade": 0,
        "cirurgia": 2.5
      }
    }
  ],
  "diferenciais": [
    {
      "id": "tunel_cubital",
      "nome": "Neuropatia Ulnar no Cotovelo / Túnel Cubital",
      "testes": [
        "Parestesia em 4º/5º dedos / distribuição ulnar",
        "Tinel no túnel cubital reproduz sintomas",
        "Elbow Flexion + Pressure Provocation reproduz sintomas",
        "Fraqueza intrínseca da mão / sinais motores em casos avançados"
      ],
      "interpretacao": "Combinação de distribuição sensitiva típica, provocação no túnel cubital e achados motores apoia neuropatia ulnar. Diferenciar de radiculopatia C8-T1 e compressão no punho."
    },
    {
      "id": "bursite_olecrano",
      "nome": "Bursite do Olécrano",
      "testes": [
        "Edema focal superficial sobre o olécrano",
        "Dor/pressão local",
        "Avaliar calor, rubor, ferida e febre para excluir bursite séptica"
      ],
      "interpretacao": "Bursite asséptica costuma apresentar edema superficial. Calor, rubor e sintomas sistêmicos elevam preocupação com infecção."
    },
    {
      "id": "radial_tunnel",
      "nome": "Síndrome do Túnel Radial / PIN — diferencial",
      "testes": [
        "Dor mais distal/anterior que a origem extensora",
        "Supinação resistida ou extensão do dedo médio reproduz dor profunda",
        "Déficit motor de extensores sem alteração sensitiva sugere PIN"
      ],
      "interpretacao": "Considere compressão radial quando a distribuição e os achados não se encaixam em tendinopatia lateral."
    }
  ],
  "redFlags": [
    "Trauma com deformidade, perda importante de ADM, dor óssea focal intensa ou comprometimento neurovascular",
    "Cotovelo quente/vermelho com febre, ferida ou edema importante — considerar infecção/bursite séptica",
    "Déficit motor progressivo ou perda sensitiva persistente em território ulnar/radial/mediano",
    "Dor e edema importantes após trauma com suspeita de síndrome compartimental no antebraço",
    "Dor não mecânica progressiva, massa, história de câncer ou sintomas sistêmicos inexplicados",
    "Trauma ou pós-operatório com déficit neurovascular progressivo, deformidade, sinais de infecção ou perda súbita de função — encaminhar"
  ]
};
})();
