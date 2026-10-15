/* KineSys — extensão clínica regional quadril 1.0.0.
 * Gerada deterministicamente de condicoes_mobilidade_v23.js + diferenciais_neurais.js.
 * Não editar manualmente sem atualizar o contrato de equivalência.
 */
(function(){
  'use strict';
  if(typeof BANCO_MAPEAMENTO_CLINICO==='undefined')return;
  const r=BANCO_MAPEAMENTO_CLINICO["quadril"];
  if(!r)return;
  r.diferenciais=[...(Array.isArray(r.diferenciais)?r.diferenciais:[]),...[
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
      "Exame lombar e neurológico para diferenciar origem radicular",
      "Teste ativo do piriforme reproduz a dor glútea familiar",
      "Teste de alongamento do piriforme sentado reproduz a dor glútea familiar"
    ],
    "interpretacao": "Os testes ativo do piriforme e de alongamento sentado podem apoiar a investigação de aprisionamento glúteo do ciático. O estudo disponível é pequeno e selecionado; não autoriza diagnóstico automático. Comparar com exame lombar, neurológico e do quadril.",
    "palavrasChaveHMA": [
      "dor glutea piora sentado",
      "gluteo posterior coxa",
      "piriforme",
      "dor profunda glutea",
      "dor nadega sentado"
    ],
    "tipoDorPreferido": [
      "neuropatica",
      "mista"
    ],
    "sinonimos": [
      "sindrome glutea profunda",
      "sindrome do piriforme",
      "aprisionamento ciatico gluteo"
    ],
    "nivelEvidencia": "Estudo de acurácia retrospectivo com 33 participantes e referência endoscópica; aplicabilidade limitada à população estudada.",
    "evidencia": "Martin et al. 2014: https://pubmed.ncbi.nlm.nih.gov/24217716/"
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
]];
  const gtps=(r.clusters||[]).find(item=>item.id==='gtps');
  if(gtps)Object.assign(gtps,{
    regraConfirmacao:{tipo:'combinada',minimo:2,obrigatorios:[0,1],descricao:'Combinação estudada: palpação glútea/trocantérica e abdução resistida concordantes, no contexto de dor lateral do quadril.'},
    nivelEvidencia:'Revisão sistemática com meta-análise; certeza de muito baixa a moderada e dependência do contexto clínico.',
    evidencia:'Kinsella et al. 2024: https://pubmed.ncbi.nlm.nih.gov/37561820/',
    interpretacao:'Na dor lateral do quadril, palpação glútea/trocantérica e abdução resistida concordantes ajudam a modificar a suspeita de síndrome dolorosa trocantérica. Não equivale a escolher quaisquer dois dos quatro itens nem a confirmar uma lesão anatômica. Probabilidades do estudo não são probabilidades individuais do paciente.'
  });
})();
