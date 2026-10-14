/* KineSys — extensão clínica regional ombro 1.0.0.
 * Gerada deterministicamente de condicoes_mobilidade_v23.js + diferenciais_neurais.js.
 * Não editar manualmente sem atualizar o contrato de equivalência.
 */
(function(){
  'use strict';
  if(typeof BANCO_MAPEAMENTO_CLINICO==='undefined')return;
  const r=BANCO_MAPEAMENTO_CLINICO["ombro"];
  if(!r)return;
  r["diferenciais"]=[...(Array.isArray(r["diferenciais"])?r["diferenciais"]:[]),...[
  {
    "id": "neuropatia_dorsal_escapular",
    "nome": "Neuropatia do nervo dorsal da escápula — diferencial",
    "testes": [
      "Mapeamento da dor na borda medial da escápula e comparação com a queixa familiar",
      "Força de retração escapular dos romboides, comparando os lados",
      "Inspeção de assimetria, discinesia ou alamento escapular durante o movimento",
      "Exame neurológico cervical e do membro superior para diferenciação de origem proximal"
    ],
    "interpretacao": "Dor na borda medial da escápula associada a alterações dos romboides pode justificar investigação do nervo dorsal da escápula. Estes achados não constituem um conjunto diagnóstico validado; diferenciar causas cervicais, musculares e outras neuropatias e considerar investigação complementar conforme avaliação profissional.",
    "palavrasChaveHMA": ["dor borda medial escapula", "fraqueza romboides", "nervo dorsal escapula", "dor interescapular", "retracao escapular fraca"],
    "tipoDorPreferido": ["neuropatica", "mista"],
    "evidencia": "Muir 2017, revisão narrativa: https://pubmed.ncbi.nlm.nih.gov/28928496/; Sultan et al., estudo clínico de dor interescapular: https://pubmed.ncbi.nlm.nih.gov/23220342/"
  },
  {
    "id": "neuropatia_supraescapular",
    "nome": "Neuropatia do Nervo Supraescapular — diferencial",
    "testes": [
      "Dor posterior/superior do ombro com distribuição compatível",
      "Fraqueza de rotação externa e/ou abdução não explicada apenas por dor",
      "Atrofia de supra/infraespinal ou contexto de tração/compressão do nervo"
    ],
    "interpretacao": "Considere neuropatia supraescapular quando dor posterior do ombro e déficit motor/atrofia forem coerentes; correlacione com exame neurológico e, quando necessário, investigação complementar.",
    "palavrasChaveHMA": [
      "dor posterior ombro",
      "fraqueza rotacao externa",
      "atrofia infraespinhal"
    ],
    "tipoDorPreferido": [
      "neuropatica",
      "mista"
    ]
  }
]];
})();
