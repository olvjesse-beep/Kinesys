KineSys Clinical — Design System ETAPA 13
========================================

Etapa: Consolidação da Responsividade

Arquivo novo:
- design_responsive.css

Contrato oficial de max-width:
1280 / 1180 / 1100 / 980 / 900 / 820 / 760 / 700 / 620 / 560 / 520 / 430 px

Complemento permitido:
- min-width: 701px para regras que são o inverso do breakpoint de 700 px.

Principais mudanças:
- patches globais de responsividade removidos do HTML;
- salvaguardas globais centralizadas em design_responsive.css;
- 6 media queries vazias removidas;
- breakpoints antigos/isolados normalizados;
- módulos continuam responsáveis por sua responsividade específica;
- nenhum JavaScript foi alterado;
- 789 !important preservados.

Próxima etapa:
ETAPA 14 — Auditoria visual e estrutural final.
