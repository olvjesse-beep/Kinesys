KineSys Clinical v1.11.2 — DESIGN SYSTEM — ETAPA 9
===================================================

ETAPA 9 — CONSOLIDAÇÃO DA AVALIAÇÃO + MOTOR CLÍNICO

Objetivo
--------
Transformar a camada visual da Avaliação e do Motor Clínico em um módulo único,
previsível e sustentável, sem alterar raciocínio clínico, pesos, compatibilidade,
regras diagnósticas, persistência, Supabase ou fluxo funcional.

Fonte visual oficial criada
---------------------------
- design_clinical.css

Responsabilidade do arquivo
---------------------------
- fluxo visual da Avaliação;
- progresso clínico;
- cabeçalho/contexto do paciente dentro da Avaliação;
- termômetro de dor;
- disclosures e seções compactas;
- Regiões anatômicas;
- Eixos/Rotas de exame;
- testes especiais e seus estados visuais;
- diagnósticos diferenciais;
- red flags / safety gates;
- incerteza clínica e integração;
- síntese/alertas do Motor;
- Radar KineSys no contexto da Avaliação;
- responsividade específica do módulo.

Arquitetura
-----------
Antes, regras do módulo estavam ativas simultaneamente em:
- KineSys.html (vários blocos <style>);
- ui_refinement.css;
- design_components.css (exceção HMA);
- ui_expert.css;
- clinical_engine_v232.css;
- design_typography.css.

Agora:
- regras específicas do módulo: design_clinical.css;
- componentes compartilhados continuam em design_components.css;
- escala tipográfica continua em design_typography.css / design_tokens.css;
- clinical_engine_v232.css não é mais carregado no runtime e foi mantido apenas
  temporariamente para rastreabilidade até a Etapa 10.

Design Freeze preservado
------------------------
- Regiões: 17 px (--kds-font-region)
- Nome da região: 21 px (--kds-font-region-name)
- Eixos: 18 px (--kds-font-axis)
- Achados: 15 px (--kds-font-finding)
- campos seguem 45 px / 15,5 px do Design System global;
- botões seguem o contrato global da Etapa 4.

Novos tokens do módulo
----------------------
- --kds-clinical-content-width: 1080px
- --kds-clinical-test-result-width: 180px
- --kds-clinical-route-card-min-height: 112px
- --kds-clinical-radar-width: 620px
- --kds-clinical-panel-gap: 14px
- --kds-clinical-region-padding-x: 22px

Nota sobre componentes compartilhados
-------------------------------------
O modificador .compact-chips é utilizado também fora da Avaliação (ex.: Agenda),
portanto permaneceu como componente compartilhado em design_components.css.
Isso evita que design_clinical.css controle módulos que não pertencem ao Motor.

Segurança funcional
-------------------
Nenhum JavaScript funcional foi alterado nesta etapa.
Foram preservados byte a byte, entre outros:
- script.js
- clinical_engine_v232.js
- agenda.js
- design_system.js
- financeiro.js
- proms_escalas.js

Validação executada
-------------------
- 22/22 JavaScripts ativos: node --check OK;
- 8/8 CSS externos ativos: parse OK;
- CSS inline: parse OK;
- IDs duplicados: 0;
- referências locais ausentes: 0;
- tokens --kds-* indefinidos: 0;
- :root efetivos no runtime: 1;
- font-size literal em px dentro de design_clinical.css: 0;
- seletores visuais específicos da Avaliação/Motor fora da fonte oficial: 0.

Auditoria histórica v1.11.2
---------------------------
O teste antigo procura algumas regras literalmente dentro de KineSys.html.
Com a consolidação, o teste do termômetro passa a dar falso negativo porque a regra
foi corretamente movida para design_clinical.css. As demais falhas históricas já
existiam na base da Etapa 8. Não foi reintroduzido CSS no HTML apenas para satisfazer
um teste de localização obsoleto.

Próxima etapa
-------------
ETAPA 10 — limpar regras mortas / CSS legado.
