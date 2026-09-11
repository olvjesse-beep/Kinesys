/* KineSys — extensão clínica regional joelho 1.0.0.
 * Gerada deterministicamente de condicoes_mobilidade_v23.js + diferenciais_neurais.js.
 * Não editar manualmente sem atualizar o contrato de equivalência.
 */
(function(){
  'use strict';
  if(typeof BANCO_MAPEAMENTO_CLINICO==='undefined')return;
  const r=BANCO_MAPEAMENTO_CLINICO["joelho"];
  if(!r)return;
  Object.assign(r,{
  "diferenciais": [
    {
      "id": "dor_patelofemoral",
      "nome": "Dor Patelofemoral",
      "testes": [
        "Dor retropatelar/peripatelar durante agachamento, escadas, corrida ou salto",
        "Dor reproduzida em tarefa com flexão do joelho sob carga",
        "Ausência de outro diagnóstico mais provável"
      ],
      "interpretacao": "O diagnóstico é clínico e baseado em dor ao redor/atrás da patela agravada por atividades com joelho flexionado sob carga. Testes de compressão patelar isolados não são necessários e podem ser irritativos.",
      "palavrasChaveHMA": [
        "dor na frente do joelho",
        "dor na patela",
        "dor descendo escada",
        "dor agachando",
        "dor sentado muito tempo"
      ],
      "mecanismoPreferido": [
        "insidioso",
        "esforco_repetitivo"
      ],
      "tipoDorPreferido": [
        "mecanica"
      ],
      "fatoresPioraRisco": [
        "movimento",
        "posicao_sentada"
      ],
      "esportesRisco": [
        "corrida",
        "futebol",
        "basquete",
        "volei"
      ],
      "pesos": {
        "palavraChave": 2,
        "mecanismo": 0.7,
        "tipoDor": 1.2,
        "fatorPiora": 0.5,
        "esporte": 0.2,
        "ocupacao": 0,
        "comorbidade": 0,
        "medicamento": 0,
        "idade": 0,
        "cirurgia": 0.3
      }
    },
    {
      "id": "tendinopatia_patelar",
      "nome": "Tendinopatia Patelar",
      "testes": [
        "Dor bem localizada no polo inferior da patela / tendão patelar",
        "Dor reproduzida com carga do extensor (decline squat, salto ou resistência)",
        "Relação carga-sintoma típica, especialmente em esportes de salto"
      ],
      "interpretacao": "Tendinopatia patelar é uma condição de dor localizada e dependente de carga. Achados de imagem podem existir sem sintomas e não devem ser usados isoladamente.",
      "palavrasChaveHMA": [
        "dor no tendao patelar",
        "dor abaixo da patela",
        "dor pulando",
        "joelho do saltador"
      ],
      "mecanismoPreferido": [
        "esforco_repetitivo",
        "insidioso"
      ],
      "tipoDorPreferido": [
        "mecanica"
      ],
      "esportesRisco": [
        "volei",
        "basquete",
        "corrida",
        "futebol"
      ],
      "pesos": {
        "palavraChave": 2,
        "mecanismo": 1,
        "tipoDor": 1.2,
        "fatorPiora": 0.3,
        "esporte": 0.25,
        "ocupacao": 0,
        "comorbidade": 0,
        "medicamento": 0.2,
        "idade": 0,
        "cirurgia": 0.3
      }
    },
    {
      "id": "instabilidade_patelar",
      "nome": "Instabilidade Patelar",
      "testes": [
        "Apprehension patelar reproduz apreensão",
        "História de luxação/subluxação patelar",
        "Sinais de hipermobilidade patelar interpretados junto aos sintomas"
      ],
      "interpretacao": "História de luxação/subluxação e apreensão patelar são mais relevantes que hipermobilidade isolada."
    },
    {
      "id": "dor_lateral_corrida",
      "nome": "Dor Lateral do Joelho relacionada à corrida / trato iliotibial",
      "testes": [
        "Dor focal lateral próximo ao epicôndilo femoral, relacionada à corrida",
        "Dor reproduzida por tarefa/carga específica",
        "Outras causas intra-articulares e tendíneas foram consideradas"
      ],
      "interpretacao": "O termo 'síndrome da banda iliotibial' descreve uma apresentação de dor lateral relacionada à corrida. Testes como Ober não confirmam a condição nem demonstram 'encurtamento causal'."
    },
    {
      "id": "osteoartrite_joelho",
      "nome": "Osteoartrite de Joelho — hipótese clínica",
      "testes": [
        "Idade e história compatíveis com dor relacionada à atividade",
        "Rigidez matinal curta e/ou crepitação",
        "Redução de ADM, derrame ou sinais clínicos degenerativos em contexto compatível"
      ],
      "interpretacao": "OA pode ser suspeitada clinicamente; imagem não é obrigatória em todos os casos e alterações radiográficas não determinam intensidade da dor."
    },
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
  ]
});
})();
