# KineSys — Componente de Botões | Etapa 4

Fonte de verdade: `design_components.css`.

## Hierarquia
- `.btn-primary`: ação principal da tela/modal.
- `.btn-secondary`: ação secundária/alternativa.
- `.btn-nav`: compatibilidade de navegação; visual secundário por padrão.
- `.btn-danger`: ação destrutiva, deliberadamente discreta.
- `.btn-compact`: modificador para ações auxiliares em linhas/cards.
- `.btn-link-compacto`: ação textual curta.

## Contrato
- Padrão: 14 px / 42 px de altura mínima / raio 8 px.
- Compacto: 13 px / 34 px de altura mínima / raio 7 px.
- Sem uppercase automático, sem salto/translate no hover.
- `focus-visible` uniforme e estado disabled previsível.

## Regra de manutenção
Módulos podem alterar largura, distribuição e contexto (ex.: botão sobre superfície escura), mas não devem redefinir globalmente tamanho, raio, peso e linguagem de `btn-primary/secondary/nav/danger`.
