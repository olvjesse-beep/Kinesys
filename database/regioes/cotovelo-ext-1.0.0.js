/* KineSys — extensão clínica regional cotovelo 1.0.0.
 * Gerada deterministicamente de condicoes_mobilidade_v23.js + diferenciais_neurais.js.
 * Não editar manualmente sem atualizar o contrato de equivalência.
 */
(function(){
  'use strict';
  if(typeof BANCO_MAPEAMENTO_CLINICO==='undefined')return;
  const r=BANCO_MAPEAMENTO_CLINICO["cotovelo"];
  if(!r)return;
  Object.assign(r,{
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
    },
    {
      "id": "rigidez_cotovelo_pos_traumatica",
      "nome": "Rigidez do Cotovelo Pós-traumática / Pós-imobilização",
      "testes": [
        "ADM de flexão/extensão e prono-supinação",
        "Diferença entre limitação ativa e passiva",
        "Dor, fim de movimento e possível bloqueio mecânico",
        "Impacto funcional em alcance, alimentação, higiene e tarefas de trabalho"
      ],
      "interpretacao": "Use quando a limitação de mobilidade é o problema dominante após trauma, cirurgia ou imobilização. Bloqueio mecânico, piora progressiva ou sinais neurológicos exigem investigação adicional.",
      "palavrasChaveHMA": [
        "cotovelo rigido",
        "cotovelo travado",
        "nao estica o cotovelo",
        "depois da fratura do cotovelo"
      ],
      "tagsBusca": [
        "contratura cotovelo",
        "pos imobilizacao",
        "rigidez articular"
      ],
      "categoriaClinica": "mobilidade_deformidade"
    },
    {
      "id": "pronador_mediano",
      "nome": "Síndrome do Pronador / Neuropatia Proximal do Mediano",
      "testes": [
        "Dor volar/proximal do antebraço agravada por pronação resistida ou esforço repetitivo",
        "Parestesia em distribuição do mediano incluindo possível palma/eminência tenar",
        "Diferenciação de túnel do carpo e radiculopatia cervical"
      ],
      "interpretacao": "Padrão compatível com compressão proximal do nervo mediano deve ser diferenciado de túnel do carpo, radiculopatia cervical e outras neuropatias.",
      "palavrasChaveHMA": [
        "dor antebraco pronacao",
        "parestesia mediano",
        "pronador"
      ],
      "tipoDorPreferido": [
        "neuropatica"
      ]
    }
  ]
});
})();
