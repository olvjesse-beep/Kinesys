# KineSys Design System — Etapa 10: CSS legado e regras mortas

## Objetivo
Remover legado visual comprovadamente inativo ou redundante sem alterar o Design Freeze, a lógica clínica, a Agenda, o Supabase, permissões, persistência ou comportamento funcional.

## Mudanças realizadas
- `clinical_engine_v232.css` removido definitivamente. Desde a Etapa 9 ele já não era carregado no runtime e seu conteúdo havia sido consolidado em `design_clinical.css`.
- `ui_refinement.css` aposentado. As regras ainda efetivas foram promovidas para `design_foundation.css`.
- `ui_expert.css` aposentado. As regras ainda efetivas foram promovidas para `design_screens.css`.
- 105 declarações redundantes/mortas foram removidas dos dois arquivos legados por análise de cascata: somente propriedades comprovadamente anuladas depois pela mesma regra, no mesmo contexto e com precedência suficiente foram descartadas.
- 35 regras que ficaram sem nenhuma declaração efetiva após a poda foram eliminadas.
- 22 tokens/aliases sem qualquer referência no HTML, CSS ou JavaScript de runtime foram removidos de `design_tokens.css`.
- O runtime não possui mais CSS com prefixo `ui_` nem o CSS legado do Motor Clínico.

## Métricas
- Declarações em CSS externo carregado: 3.548 → 3.421 (-127).
- Regras em CSS externo carregado: 1.185 → 1.150 (-35).
- Tokens declarados em `design_tokens.css`: 118 → 96 (-22).
- Tamanho dos CSS externos carregados: 151.488 → 141.885 bytes (-9.603 bytes; -6,3%).
- `!important` ativos totais, incluindo CSS inline do HTML: 835 → 826 (-9).
- Declarações comprovadamente anuladas por uma regra posterior idêntica nos CSS externos: 105 → 0.
- CSS legado carregado (`ui_refinement.css`, `ui_expert.css`): 2 → 0.
- CSS clínico legado inativo (`clinical_engine_v232.css`): removido.

## Segurança
A análise foi conservadora. Não foram removidos seletores apenas por ausência em busca estática, porque classes e estados podem ser gerados dinamicamente pelo JavaScript.

Todos os arquivos `.js` permaneceram byte a byte idênticos à Etapa 9.

## Autoridades visuais após a Etapa 10
1. `design_tokens.css` — tokens e aliases ainda necessários.
2. `design_foundation.css` — fundação, ritmo e compatibilidade visual ainda efetiva.
3. `design_components.css` — cards, botões, campos e componentes globais.
4. `design_screens.css` — superfícies e telas não cobertas por módulos dedicados.
5. `design_typography.css` — escala tipográfica oficial.
6. `design_navigation.css` — Sidebar, Topbar e shell.
7. `design_agenda.css` — Agenda.
8. `design_clinical.css` — Avaliação e Motor Clínico.

## Próxima etapa
Etapa 11 — reduzir `!important` sistematicamente agora que a cascata está mais previsível.

## Validação final
- 8/8 CSS externos carregados: parse sem erro.
- JavaScript: todos os arquivos `.js` da base passaram em `node --check`.
- Todos os `.js` permaneceram byte a byte idênticos à Etapa 9.
- IDs duplicados no HTML: 0.
- Referências locais do HTML: 30; ausentes: 0.
- Tokens `--kds-*` usados e não definidos: 0.
- Referências de runtime a `ui_refinement.css`, `ui_expert.css` ou `clinical_engine_v232.css`: 0.
- Declarações em CSS externo comprovadamente anuladas por regra posterior idêntica: 0.
- O teste histórico `auditoria_1112.js` apresenta as mesmas 4 falhas já presentes na Etapa 9; não houve nova falha. Duas verificações dependem da arquitetura antiga (`ui_expert.css`/regra inline do termômetro) e duas são falhas históricas de Evolução/Agenda.

## Decisão conservadora
`ui_refinement.js` foi preservado porque não é código morto: ele implementa progressive disclosure dos cards de objetivos, restrições pós-operatórias e medidas/outcomes na Avaliação. Renomeá-lo ou refatorá-lo não é necessário para limpar CSS e aumentaria o escopo funcional da etapa.
