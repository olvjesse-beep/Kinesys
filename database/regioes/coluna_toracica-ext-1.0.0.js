/* KineSys — extensão clínica regional coluna_toracica 1.0.0.
 * Gerada deterministicamente de condicoes_mobilidade_v23.js + diferenciais_neurais.js.
 * Não editar manualmente sem atualizar o contrato de equivalência.
 */
(function(){
  'use strict';
  if(typeof BANCO_MAPEAMENTO_CLINICO==='undefined')return;
  const r=BANCO_MAPEAMENTO_CLINICO["coluna_toracica"];
  if(!r)return;
  Object.assign(r,{
  "diferenciais": [
    {
      "id": "dor_visceral_toracica",
      "nome": "Origem Visceral / Cardiopulmonar / Gastrointestinal",
      "testes": [
        "Dor não reproduzida de forma convincente pelo exame musculoesquelético",
        "Relação com esforço cardiovascular, alimentação, respiração ou sintomas sistêmicos",
        "Sinais vitais/sintomas associados levantam suspeita não musculoesquelética"
      ],
      "interpretacao": "Dor torácica/interescapular não mecânica deve manter baixo limiar para investigação de causas cardiopulmonares, vasculares ou viscerais conforme perfil clínico."
    },
    {
      "id": "radiculopatia_toracica",
      "nome": "Radiculopatia Torácica / Herpes Zoster — diferencial",
      "testes": [
        "Dor em faixa dermatomérica ao redor do tórax",
        "Alodinia/hipersensibilidade cutânea segmentar",
        "Rash vesicular presente ou surgindo posteriormente (herpes zoster)"
      ],
      "interpretacao": "Padrão em faixa com alterações sensitivas pode sugerir radiculopatia ou herpes zoster. Investigue causas espinais e não espinais conforme contexto."
    },
    {
      "id": "fratura_compressao_toracica_diferencial",
      "nome": "Fratura Vertebral por Compressão — hipótese de segurança",
      "testes": [
        "Idade avançada/osteoporose/uso prolongado de corticoide",
        "Dor torácica aguda focal após trauma menor ou espontânea",
        "Dor à percussão/carga axial em contexto compatível"
      ],
      "interpretacao": "A combinação de risco ósseo e dor focal aguda deve levar à consideração de fratura por compressão e avaliação por imagem."
    },
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
  ]
});
})();
