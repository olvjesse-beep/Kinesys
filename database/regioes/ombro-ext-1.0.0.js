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
