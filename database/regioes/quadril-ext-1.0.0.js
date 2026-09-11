/* KineSys — extensão clínica regional quadril 1.0.0.
 * Gerada deterministicamente de condicoes_mobilidade_v23.js + diferenciais_neurais.js.
 * Não editar manualmente sem atualizar o contrato de equivalência.
 */
(function(){
  'use strict';
  if(typeof BANCO_MAPEAMENTO_CLINICO==='undefined')return;
  const r=BANCO_MAPEAMENTO_CLINICO["quadril"];
  if(!r)return;
  Object.assign(r,{
  "diferenciais": [
    {
      "id": "dor_referida_lombar_quadril",
      "nome": "Dor Referida de Origem Lombar",
      "testes": [
        "Movimento lombar modifica a dor no quadril/coxa",
        "Sinais neurológicos ou padrão radicular presentes",
        "Exame local do quadril não explica adequadamente a queixa"
      ],
      "interpretacao": "Diferencie origem lombar quando a apresentação do quadril é pouco concordante ou há modulação clara pela coluna."
    },
    {
      "id": "dor_inguinal_adutor",
      "nome": "Dor Inguinal relacionada a Adutores / Púbis / Parede Abdominal",
      "testes": [
        "Palpação e adução resistida reproduzem dor de adutor",
        "Sit-up/carga abdominal reproduz dor de parede abdominal",
        "Dor pubiana focal reproduzida à palpação/carga"
      ],
      "interpretacao": "Classifique dor inguinal pela estrutura clínica predominante (adutor, iliopsoas, inguinal, púbica ou relacionada ao quadril) em vez de agrupar tudo como 'pubalgia'."
    },
    {
      "id": "fratura_estresse_colo_femur",
      "nome": "Fratura por Estresse do Colo Femoral — hipótese de segurança",
      "testes": [
        "Dor na virilha com carga progressiva e corrida/salto",
        "Dor em repouso/noturna ou piora rápida",
        "Hop test/carga axial provoca dor importante — não insistir se suspeita alta"
      ],
      "interpretacao": "Suspeita de fratura por estresse do colo femoral exige interrupção da carga e avaliação por imagem, especialmente em atletas, baixa disponibilidade energética ou dor progressiva."
    },
    {
      "id": "rigidez_capsular_quadril",
      "nome": "Déficit de Mobilidade do Quadril / Rigidez Capsular",
      "testes": [
        "ADM ativa e passiva do quadril com comparação funcional",
        "Padrão de limitação e reprodução da queixa familiar",
        "Impacto em calçar sapatos, agachar, sentar, marcha ou escadas",
        "Diferenciar rigidez funcional de osteoartrite sintomática, irritabilidade ou bloqueio intra-articular"
      ],
      "interpretacao": "Use como eixo de mobilidade quando a perda de ADM é clinicamente relevante sem forçar um diagnóstico estrutural específico.",
      "palavrasChaveHMA": [
        "quadril rigido",
        "quadril travado",
        "pouca mobilidade no quadril",
        "dificuldade cruzar a perna"
      ],
      "tagsBusca": [
        "mobilidade quadril",
        "rigidez capsular",
        "adm quadril"
      ],
      "categoriaClinica": "mobilidade_deformidade"
    },
    {
      "id": "deep_gluteal",
      "nome": "Síndrome Glútea Profunda / Aprisionamento Não Discogênico do Ciático",
      "testes": [
        "Dor profunda glútea com possível irradiação posterior",
        "Piora sentada e/ou com posições que tensionam estruturas glúteas profundas",
        "Exame lombar e neurológico para diferenciar origem radicular"
      ],
      "interpretacao": "Síndrome glútea profunda descreve aprisionamento não discogênico do ciático no espaço glúteo profundo; deve ser diferenciada de radiculopatia lombar e patologia do quadril.",
      "palavrasChaveHMA": [
        "dor glutea piora sentado",
        "gluteo posterior coxa",
        "piriforme"
      ],
      "tipoDorPreferido": [
        "neuropatica",
        "mista"
      ]
    },
    {
      "id": "hamstring_proximal_neural",
      "nome": "Isquiotibiais Proximais / Interface com Nervo Ciático",
      "testes": [
        "Dor na tuberosidade isquiática ou glúteo inferior",
        "Dor reproduzida por carga de isquiotibiais/flexão de quadril e frequentemente por sedestação",
        "Pesquisar sintomas neurais quando houver irradiação distal"
      ],
      "interpretacao": "Diferencie tendinopatia/lesão proximal dos isquiotibiais de síndrome glútea profunda e radiculopatia quando houver sintomas posteriores irradiados.",
      "palavrasChaveHMA": [
        "dor isquio sentado",
        "posterior coxa corrida",
        "tuberosidade isquiatica"
      ]
    },
    {
      "id": "meralgia_parestetica",
      "nome": "Meralgia Parestésica — Nervo Cutâneo Femoral Lateral",
      "testes": [
        "Queimação/parestesia na face anterolateral da coxa",
        "Ausência de déficit motor atribuível ao nervo cutâneo femoral lateral",
        "Considerar compressão junto ao ligamento inguinal e diferenciar de radiculopatia"
      ],
      "interpretacao": "Padrão sensitivo anterolateral isolado da coxa é compatível com investigação de meralgia parestésica.",
      "palavrasChaveHMA": [
        "queimacao lateral coxa",
        "parestesia anterolateral coxa"
      ],
      "tipoDorPreferido": [
        "neuropatica"
      ]
    },
    {
      "id": "neuropatia_femoral",
      "nome": "Neuropatia Femoral — diferencial",
      "testes": [
        "Alteração sensitiva anterior da coxa/perna medial conforme distribuição",
        "Fraqueza de quadríceps/extensão do joelho",
        "Reflexo patelar reduzido e diferenciação de raízes L2-L4"
      ],
      "interpretacao": "Déficit motor de quadríceps associado a alterações sensitivas/reflexas exige diferenciação entre neuropatia femoral, plexopatia e radiculopatia L2-L4.",
      "tipoDorPreferido": [
        "neuropatica"
      ]
    },
    {
      "id": "neuropatia_obturatoria",
      "nome": "Neuropatia Obturatória — diferencial",
      "testes": [
        "Dor/parestesia medial da coxa",
        "Fraqueza de adução do quadril",
        "Diferenciação de lesão adutora, quadril e radiculopatia"
      ],
      "interpretacao": "Considere neuropatia obturatória em sintomas mediais da coxa associados a déficit de adução e contexto compatível.",
      "tipoDorPreferido": [
        "neuropatica"
      ]
    }
  ]
});
})();
