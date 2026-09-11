/* KineSys — extensão clínica regional coluna_toracica 1.0.0.
 * Gerada deterministicamente de condicoes_mobilidade_v23.js + diferenciais_neurais.js.
 * Não editar manualmente sem atualizar o contrato de equivalência.
 */
(function(){
  'use strict';
  if(typeof BANCO_MAPEAMENTO_CLINICO==='undefined')return;
  const r=BANCO_MAPEAMENTO_CLINICO["coluna_toracica"];
  if(!r)return;
  r["diferenciais"]=[...(Array.isArray(r["diferenciais"])?r["diferenciais"]:[]),...[
  {
    "id": "neuralgia_intercostal",
    "nome": "Neuralgia Intercostal / Dor em Faixa",
    "testes": [
      "Dor em faixa seguindo espaço intercostal",
      "Qualidade queimante/choque ou alodinia",
      "Triagem de causas cardiopulmonares, viscerais e herpes-zóster conforme contexto"
    ],
    "interpretacao": "Dor em faixa torácica pode ser neuropática/intercostal, mas exige exclusão de causas não musculoesqueléticas relevantes.",
    "tipoDorPreferido": [
      "neuropatica"
    ]
  }
]];
})();
