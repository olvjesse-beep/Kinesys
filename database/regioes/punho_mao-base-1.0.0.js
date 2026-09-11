/* KineSys — banco clínico base regional punho_mao 1.0.0.
 * Gerado deterministicamente de database/mapeamento_clinico.js.
 * Não editar manualmente sem atualizar o contrato de equivalência.
 */
(function(){
  'use strict';
  if(typeof BANCO_MAPEAMENTO_CLINICO==='undefined')return;
  BANCO_MAPEAMENTO_CLINICO["punho_mao"]={
  "nome": "Punho e Mão",
  "palavrasChave": [
    "punho",
    "mao",
    "dedo",
    "polegar",
    "carpo",
    "escafoide",
    "formigamento"
  ],
  "clusters": [
    {
      "id": "tunel_carpo",
      "nome": "Síndrome do Túnel do Carpo — padrão clínico",
      "testes": [
        "Parestesia/dormência predominante em polegar, indicador e médio, especialmente noturna",
        "Carpal Compression / Durkan reproduz sintomas",
        "Phalen reproduz sintomas em contexto concordante",
        "Alteração sensitiva e/ou fraqueza/atrofia tenar em casos mais avançados"
      ],
      "limiar": 2,
      "interpretacao": "A suspeita de túnel do carpo deve combinar distribuição de sintomas, história e exame. Phalen/Tinel isolados não confirmam nem excluem; escores clínicos como CTS-6 podem aumentar padronização quando implementados.",
      "palavrasChaveHMA": [
        "formigamento na mao a noite",
        "dormencia polegar indicador medio",
        "mao adormece dirigindo",
        "tunel do carpo"
      ],
      "mecanismoPreferido": [
        "insidioso",
        "esforco_repetitivo"
      ],
      "tipoDorPreferido": [
        "neuropatica"
      ],
      "comorbidadesRisco": [
        "diabetico"
      ],
      "pesos": {
        "palavraChave": 2.5,
        "mecanismo": 0.5,
        "tipoDor": 2,
        "fatorPiora": 0.3,
        "esporte": 0.05,
        "ocupacao": 0.15,
        "comorbidade": 0.5,
        "medicamento": 0,
        "idade": 0.3,
        "cirurgia": 0.2
      }
    },
    {
      "id": "dequervain",
      "nome": "Tenossinovite de De Quervain",
      "testes": [
        "Dor sobre o 1º compartimento dorsal / estiloide radial",
        "Finkelstein reproduz dor típica",
        "WHAT test / abdução do polegar resistida reproduz sintomas"
      ],
      "limiar": 2,
      "interpretacao": "Dor radial focal e provocação dos tendões APL/EPB sustentam De Quervain. O teste de Eichhoff pode ser mais irritativo e gerar falsos positivos; preferir interpretação clínica conjunta.",
      "palavrasChaveHMA": [
        "dor no polegar",
        "dor do lado do radio",
        "de quervain",
        "dor pegando bebe"
      ],
      "mecanismoPreferido": [
        "esforco_repetitivo",
        "insidioso"
      ],
      "tipoDorPreferido": [
        "mecanica"
      ],
      "pesos": {
        "palavraChave": 2,
        "mecanismo": 0.7,
        "tipoDor": 1,
        "fatorPiora": 0.3,
        "esporte": 0,
        "ocupacao": 0.1,
        "comorbidade": 0,
        "medicamento": 0,
        "idade": 0,
        "cirurgia": 0.2
      }
    },
    {
      "id": "fratura_radio_distal_reabilitacao",
      "nome": "Fratura distal do rádio — conservador ou pós-operatório",
      "testes": [
        "Tipo de fratura e tratamento confirmados",
        "Estado de consolidação e restrições de carga documentados",
        "ADM de punho/antebraço, edema, força de preensão e função monitorados",
        "Sem sinais de síndrome compartimental, infecção, neuropatia mediana progressiva ou CRPS desproporcional"
      ],
      "limiar": 2,
      "interpretacao": "A avaliação deve acompanhar dor, edema, mobilidade, força e função, respeitando estabilidade e fase de consolidação. Intervenções e intensidade devem ser individualizadas; a CPG de 2024 fornece recomendações específicas para avaliação e reabilitação após fratura distal do rádio.",
      "palavrasChaveHMA": [
        "fratura radio distal",
        "fratura punho",
        "placa no punho",
        "colles",
        "cirurgia punho fratura"
      ],
      "mecanismoPreferido": [
        "trauma_agudo",
        "pos_cirurgico"
      ],
      "pesos": {
        "palavraChave": 2.6,
        "mecanismo": 2.5,
        "tipoDor": 0,
        "fatorPiora": 0,
        "esporte": 0,
        "ocupacao": 0,
        "comorbidade": 0.3,
        "medicamento": 0.2,
        "idade": 0.4,
        "cirurgia": 2.5
      },
      "evidencia": "JOSPT Clinical Practice Guideline: Distal Radius Fracture Rehabilitation, 2024."
    },
    {
      "id": "pos_operatorio_tendao_mao",
      "nome": "Pós-reparo de tendão flexor/extensor da mão",
      "testes": [
        "Tendão/dedo e zona da lesão registrados",
        "Técnica de reparo e protocolo de proteção identificados",
        "Deslizamento tendíneo, edema, ADM e integridade do reparo acompanhados",
        "Sem sinais de ruptura, infecção ou déficit neurovascular novo"
      ],
      "limiar": 2,
      "interpretacao": "Reparo de tendão da mão exige protocolo específico por tendão, zona, técnica cirúrgica e resistência do reparo. Não automatizar alongamento, fortalecimento ou amplitude sem essas informações; progressões inadequadas podem aumentar risco de aderência ou ruptura.",
      "palavrasChaveHMA": [
        "sutura tendao mao",
        "tendao flexor cortado",
        "tendao extensor cortado",
        "cirurgia tendao dedo"
      ],
      "mecanismoPreferido": [
        "pos_cirurgico",
        "trauma_agudo"
      ],
      "pesos": {
        "palavraChave": 2.5,
        "mecanismo": 2.7,
        "tipoDor": 0,
        "fatorPiora": 0,
        "esporte": 0,
        "ocupacao": 0.1,
        "comorbidade": 0.2,
        "medicamento": 0,
        "idade": 0,
        "cirurgia": 2.5
      }
    }
  ],
  "diferenciais": [
    {
      "id": "tfcc",
      "nome": "Lesão do Complexo da Fibrocartilagem Triangular (TFCC)",
      "testes": [
        "Dor ulnar do punho com carga/rotação",
        "Fovea Sign doloroso",
        "Ulnar grind / press test reproduz dor em contexto compatível"
      ],
      "interpretacao": "A suspeita de TFCC depende de localização ulnar, mecanismo e provocação por carga/rotação. Trauma com instabilidade da DRUJ merece avaliação especializada."
    },
    {
      "id": "instabilidade_escafolunar",
      "nome": "Lesão / Instabilidade Escafolunar",
      "testes": [
        "Dor dorsal-radial após queda/trauma",
        "Watson / Scaphoid Shift reproduz dor/clunk concordante",
        "Sinais de instabilidade persistente"
      ],
      "interpretacao": "Lesão escafolunar relevante pode evoluir para instabilidade crônica. Trauma importante com dor persistente requer imagem/especialista."
    },
    {
      "id": "rizartrose",
      "nome": "Osteoartrite CMC do Polegar / Rizartrose",
      "testes": [
        "Dor na base do polegar relacionada a pinça/preensão",
        "Grind test reproduz dor/crepitação em contexto compatível",
        "Redução funcional de pinça / deformidade em casos avançados"
      ],
      "interpretacao": "Dor típica de base do polegar e limitação funcional sustentam OA CMC; Grind positivo isolado não determina gravidade."
    },
    {
      "id": "radiculopatia_neuropatia_proximal",
      "nome": "Origem Cervical / Neuropatia Proximal — diferencial",
      "testes": [
        "Distribuição não restrita ao nervo mediano/ulnar local",
        "Sintomas modulados pela coluna cervical",
        "Exame neurológico proximal alterado"
      ],
      "interpretacao": "Quando o padrão sensitivo/motor não se encaixa em uma compressão local, investigue cervical e outros locais de compressão neural."
    }
  ],
  "redFlags": [
    "Trauma com dor na tabaqueira anatômica / suspeita de fratura de escafoide — considerar imobilização e imagem mesmo com radiografia inicial negativa conforme quadro",
    "Deformidade, ferida aberta, amputação parcial ou comprometimento vascular/sensitivo após trauma",
    "Dor intensa progressiva, edema tenso, parestesia ou dor ao alongamento passivo — considerar síndrome compartimental",
    "Mão quente/vermelha, ferida/inoculação, febre ou suspeita de infecção de bainha flexora/articulação",
    "Déficit motor progressivo, atrofia rápida ou perda sensitiva persistente",
    "Fenômeno vascular agudo: palidez/cianose persistente, frio ou perda de pulso/perfusão",
    "Dor desproporcional persistente com edema, alteração autonômica/sudomotora e perda funcional progressiva — considerar CRPS no contexto apropriado",
    "Pós-reparo de tendão com perda súbita do movimento ativo previamente presente — suspeitar falha do reparo"
  ]
};
})();
