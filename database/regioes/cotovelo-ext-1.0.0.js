/* KineSys — extensão clínica regional cotovelo 1.0.0.
 * Gerada deterministicamente de condicoes_mobilidade_v23.js + diferenciais_neurais.js.
 * Não editar manualmente sem atualizar o contrato de equivalência.
 */
(function(){
  'use strict';
  if(typeof BANCO_MAPEAMENTO_CLINICO==='undefined')return;
  const r=BANCO_MAPEAMENTO_CLINICO["cotovelo"];
  if(!r)return;
  r["diferenciais"]=[...(Array.isArray(r["diferenciais"])?r["diferenciais"]:[]),...[
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
]];
})();
