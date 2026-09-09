# KineSys — Design System Consolidation — Etapa 2

## Objetivo
Consolidar as variáveis de design em uma única fonte de verdade, sem redesenhar o sistema e sem alterar deliberadamente o contrato visual congelado na Etapa 1.

## O que mudou
- Criado `design_tokens.css`, carregado antes de todo CSS legado.
- O runtime passou de **6 blocos `:root` concorrentes para 1 único `:root`**.
- `ui_expert.css` deixou de usar `--ksx-*` e passou a consumir `--kds-*`.
- `ui_typography_comfort.css` deixou de usar `--kst-*` e passou a consumir `--kds-*`.
- `ui_refinement.css` deixou de depender de `--ks-ui-*` no único ponto ainda utilizado.
- Os três `:root` internos do `KineSys.html` foram removidos.
- Os `:root` de `ui_refinement.css`, `ui_expert.css` e `ui_typography_comfort.css` foram removidos.

## Estratégia conservadora
O HTML e alguns scripts antigos ainda consomem nomes históricos como `--azul-petroleo`, `--texto-secundario` e `--ks-*`. Nesta etapa eles **não foram reescritos em massa**, porque isso aumentaria o risco de regressão.

Esses nomes agora existem somente como **aliases de compatibilidade centralizados em `design_tokens.css`**, com os mesmos valores finais que tinham antes da consolidação. Código novo não deve utilizá-los.

## Prefixo oficial daqui em diante
`--kds-*` = **KineSys Design System**.

Exemplos:
- `--kds-bg`
- `--kds-text`
- `--kds-muted`
- `--kds-accent`
- `--kds-line`
- `--kds-font-body`
- `--kds-radius-lg`
- `--kds-space-4`

## O que NÃO foi feito
- Não houve redesign.
- Não houve redução global de `!important` nesta etapa.
- Não foram reescritos todos os seletores legados.
- Não foram alterados status, lógica de Agenda, Motor Clínico ou Supabase.
- Não foram removidos os aliases antigos ainda consumidos pelo HTML/JS.

## Critério de aceite
A Etapa 2 é aprovada se:
1. somente `design_tokens.css` possuir `:root` no runtime;
2. nenhum `--ksx-*`, `--kst-*` ou `--ks-ui-*` continuar sendo consumido pelos CSS modernos;
3. os valores finais dos tokens históricos forem preservados;
4. o contrato visual da Etapa 1 permanecer a referência obrigatória.

## Próxima etapa
**Etapa 3 — consolidar o componente `.card`**, removendo redefinições concorrentes e criando variações explícitas sem alterar o visual congelado.
