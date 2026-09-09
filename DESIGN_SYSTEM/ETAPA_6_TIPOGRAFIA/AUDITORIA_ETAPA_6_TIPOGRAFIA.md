# Auditoria — Etapa 6: Tipografia Global

## Objetivo
Transformar a antiga camada corretiva de tipografia em parte oficial do Design System e eliminar decisões numéricas concorrentes de tamanho de fonte nos estilos carregados.

## Alterações estruturais
- `ui_typography_comfort.css` foi substituído por `design_typography.css`.
- `design_tokens.css` recebeu escala semântica `--kds-font-*` e tokens de line-height.
- `KineSys.html`, `ui_refinement.css`, `ui_expert.css`, `clinical_engine_v232.css` e `design_components.css` foram migrados para consumir a escala; não foi criada uma nova camada de patch.
- Conteúdo visual gerado por `script.js` deixou de criar fontes literais de 10–18 px e passou a usar os tokens do produto.
- A janela independente de PROMs/Escalas foi revisada separadamente e seu menor texto passou a 12,5 px.

## Métrica principal
Nos stylesheets efetivamente carregados pelo KineSys:
- declarações literais `font-size: Npx`: **812 → 0**;
- declarações literais <= 12 px: **451 → 0**;
- tamanhos numéricos distintos: **37 → 0**.

Isso não significa que o CSS legado foi apagado: significa que ele deixou de inventar tamanhos e agora referencia a mesma escala. A poda estrutural completa fica para as Etapas 10–12.

## Design Freeze
Mantidos os alvos aprovados: corpo 16 px; campos 15,5 px; labels 13,5 px; títulos 31 px; sidebar 14,5 px; regiões 17 px; região selecionada 21 px; eixos 18 px; achados 15 px.

## `!important`
A contagem nos arquivos visuais de runtime permaneceu em **1.144**. Isso é intencional: a Etapa 6 consolida a escala e a Etapa 11 fará a retirada sistemática de `!important` por componente, evitando uma quebra de cascata prematura.

## Validação
- 22/22 JavaScripts carregados localmente: `node --check` OK.
- 6 CSS de runtime: parse `tinycss2` sem erro.
- IDs duplicados: 0.
- Referências locais: 28; ausentes: 0.
- Variáveis `--kds-*` referenciadas sem definição: 0.
- Decisões literais `font-size: Npx` nos estilos de runtime: 0.

## Limitação
A renderização automatizada local em Chromium foi bloqueada pelo ambiente (`ERR_BLOCKED_BY_ADMINISTRATOR` tanto em `file://` quanto em `localhost`). Portanto, a validação foi estrutural/cascata estática; não é apresentada como auditoria pixel-a-pixel em navegador real.
