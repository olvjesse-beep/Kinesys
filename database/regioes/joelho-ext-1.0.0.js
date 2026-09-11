/* KineSys — extensão clínica regional joelho 1.0.0.
 * Gerada deterministicamente de condicoes_mobilidade_v23.js + diferenciais_neurais.js.
 * Não editar manualmente sem atualizar o contrato de equivalência.
 */
(function(){
  'use strict';
  if(typeof BANCO_MAPEAMENTO_CLINICO==='undefined')return;
  const r=BANCO_MAPEAMENTO_CLINICO["joelho"];
  if(!r)return;
  r["diferenciais"]=[...(Array.isArray(r["diferenciais"])?r["diferenciais"]:[]),...[
  {
    "id": "artrofibrose_joelho",
    "nome": "Artrofibrose / Rigidez Persistente do Joelho",
    "testes": [
      "Déficit persistente de extensão e/ou flexão comparado ao esperado para o estágio",
      "Qualidade do fim de movimento, dor e edema",
      "Mobilidade patelar e função de marcha/escadas",
      "História de cirurgia, trauma ou imobilização e evolução da ADM ao longo do tempo"
    ],
    "interpretacao": "Considere como problema de mobilidade quando há perda persistente de ADM com impacto funcional, especialmente após cirurgia/trauma. A evolução temporal e o estágio pós-operatório são fundamentais para decisão de encaminhamento e progressão.",
    "palavrasChaveHMA": [
      "artrofibrose",
      "joelho travado depois da cirurgia",
      "nao estica o joelho",
      "nao dobra o joelho depois da cirurgia"
    ],
    "mecanismoPreferido": [
      "pos_cirurgico",
      "trauma_agudo"
    ],
    "tagsBusca": [
      "rigidez joelho",
      "perda extensao",
      "perda flexao"
    ],
    "categoriaClinica": "mobilidade_deformidade"
  },
  {
    "id": "neuropatia_safeno",
    "nome": "Neuropatia do Nervo Safeno — diferencial",
    "testes": [
      "Dor/parestesia medial de joelho e perna sem déficit motor",
      "Sensibilidade ao longo do canal dos adutores/região safena conforme contexto",
      "Diferenciação de joelho local e radiculopatia L3-L4"
    ],
    "interpretacao": "O safeno é sensitivo; sintomas mediais sem fraqueza correspondente podem justificar investigação periférica.",
    "tipoDorPreferido": [
      "neuropatica"
    ]
  },
  {
    "id": "neuropatia_fibular_comum",
    "nome": "Neuropatia do Nervo Fibular Comum",
    "testes": [
      "Sintomas junto à cabeça da fíbula com extensão à perna lateral/dorso do pé",
      "Fraqueza de dorsiflexão e/ou eversão; pesquisar pé caído",
      "Diferenciação de radiculopatia L5 e lesões mais distais do fibular"
    ],
    "interpretacao": "Pé caído ou déficit de dorsiflexão/eversão requer localização neurológica cuidadosa entre nervo fibular, raiz L5 e outras causas.",
    "tipoDorPreferido": [
      "neuropatica"
    ]
  }
]];
})();
