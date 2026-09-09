# KineSys — Design System | Etapa 4 — Botões

## Objetivo
Consolidar a linguagem visual dos botões sem redesenhar o produto e sem alterar lógica funcional.

## Contrato preservado do Design Freeze
- Botão padrão: **14 px**.
- Altura mínima: **42 px**.
- Raio: **8 px**.
- Sem `uppercase` automático.
- Sem deslocamento/`translateY` no hover.
- Ação primária em petróleo/teal, secundária branca com borda discreta.

## Fonte de verdade
O componente passou a viver em `design_components.css`.

Classes oficiais:
- `.btn-primary`
- `.btn-secondary`
- `.btn-nav` (compatibilidade; visual secundário por padrão)
- `.btn-danger`
- `.btn-compact`
- `.btn-link-compacto`

## Alterações realizadas
1. Removidas três gerações de estilo global de `btn-primary/secondary/nav` do `KineSys.html`.
2. Removidas redefinições globais equivalentes de `ui_refinement.css` e `ui_expert.css`.
3. `ui_typography_comfort.css` deixou de ser responsável por dimensionar os botões do Design System; mantém apenas conforto de botões legados/customizados.
4. Removidos overrides antigos de tamanho de botão do início de `clinical_engine_v232.css`; o bloco tipográfico específico do Motor 2.3.2 foi preservado porque faz parte do Design Freeze de Regiões/Eixos.
5. Criado estado destrutivo `.btn-danger`, discreto e consistente.
6. Criado modificador `.btn-compact` para ações auxiliares de linha/card.
7. `btn-link-compacto` passou a ter um único comportamento base.
8. Padronizados `focus-visible`, `disabled`, hover e transições.
9. Ações de Equipe deixaram de carregar CSS inline; `Editar` usa `btn-secondary btn-compact` e `Excluir` usa `btn-danger btn-compact`.
10. O botão de exclusão do prontuário recebeu semântica `.btn-danger`, preservando o tratamento visual especial sobre o card escuro.
11. O botão legado `Abrir ➔` deixou de carregar `style` inline e usa `btn-nav btn-compact`.
12. Removida uma regra morta da Equipe que dependia de procurar `background:#E74C3C` dentro do atributo `style`.

## Métricas
| Métrica | Etapa 3 | Etapa 4 |
|---|---:|---:|
| `!important` nos arquivos visuais principais | 1.189 | **1.175** |
| regras globais isoladas de botões nos arquivos legados | 8 | **0** |
| regras globais oficiais no componente consolidado | — | **1 sistema** |
| `<button style="...">` em HTML/JS runtime | 20 | **17** |

A redução de `!important` é deliberadamente gradual. Esta etapa removeu apenas os que pertenciam ao componente trabalhado.

## O que NÃO foi alterado
- Botões especializados da Agenda, Financeiro, mídia, chips, ícones e controles do shell permanecem com regras próprias quando sua função exige densidade/contexto diferente.
- Não houve alteração de fluxo, `onclick`, permissões ou regras de negócio.
- Não houve alteração de banco/Supabase.
- Os botões maiores de Regiões/Eixos continuam com a escala aprovada (até 14,5 px / 42 px) por regras específicas do Motor 2.3.2.

## Validação
- Todos os JS passaram em `node --check`.
- CSS: 0 erros de parsing.
- IDs HTML duplicados: 0.
- Referências locais ausentes: 0.
- ZIP íntegro.

## Próxima etapa
**Etapa 5 — consolidar inputs/selects/textarea**: uma régua única para controles de formulário, mantendo as exceções densas da Agenda de forma explícita.
