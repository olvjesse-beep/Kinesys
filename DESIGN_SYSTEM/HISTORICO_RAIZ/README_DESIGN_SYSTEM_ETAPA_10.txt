KineSys Clinical v1.11.2 — DESIGN SYSTEM ETAPA 10

ETAPA 10 — LIMPEZA DE CSS LEGADO / REGRAS MORTAS

Concluído:
- ui_refinement.css removido do projeto de runtime;
- ui_expert.css removido do projeto de runtime;
- clinical_engine_v232.css removido definitivamente;
- regras vivas de refinamento promovidas para design_foundation.css;
- regras vivas das telas promovidas para design_screens.css;
- 105 declarações comprovadamente anuladas foram removidas;
- 35 regras vazias/redundantes desapareceram após a poda;
- 22 tokens sem qualquer referência ativa foram removidos;
- nenhum JavaScript funcional foi alterado.

MÉTRICAS
- Regras CSS externas: 1.185 -> 1.150
- Declarações CSS externas: 3.548 -> 3.421
- Tokens: 118 -> 96
- CSS externo: 151.488 -> 141.885 bytes
- !important ativos totais: 835 -> 826
- CSS ui_* no runtime: 2 -> 0
- Declarações externamente anuladas por regra idêntica posterior: 105 -> 0

PRÓXIMA ETAPA
Etapa 11 — redução sistemática de !important.

Auditoria detalhada:
DESIGN_SYSTEM/ETAPA_10_LEGADO/AUDITORIA_ETAPA_10_LEGADO.md
