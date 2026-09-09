# KineSys Design System — Etapa 11

## Objetivo
Reduzir `!important` apenas onde a arquitetura consolidada já garante a mesma cascata por escopo, especificidade ou ordem de carregamento, sem alterar o resultado visual calculado.

## Resultado
- Etapa 10: 826 `!important` ativos.
- Etapa 11: 789 `!important` ativos.
- Removidos nesta etapa: 37 (-4,48%).
- `design_foundation.css`: 14 -> 0.
- `design_navigation.css`: 6 -> 0.
- `KineSys.html`: 319 -> 302.
- `design_typography.css`: mantido em 152.
- `design_clinical.css`: mantido em 283.
- `design_screens.css`: mantido em 47.
- `design_components.css`: mantido em 4.
- `design_agenda.css`: mantido em 1 (`[hidden]`).

## Critério de segurança
Uma tentativa exploratória de remoção ampla reduziu a contagem para dezenas, mas foi rejeitada porque a simulação de runtime com `body.ks-design-ready` demonstrou regressões reais. Em especial, a tipografia oficial ainda precisa vencer centenas de estilos inline legados; a remoção desses estilos é a Etapa 12.

Nesta versão foram removidos apenas:
1. prioridades obsoletas em `design_foundation.css`;
2. prioridades obsoletas em `design_navigation.css`;
3. prioridades de regras HTML únicas/autocontidas que mantêm o mesmo vencedor de cascata sem `!important` (`.box-sugestoes`, `button[aria-busy="true"]` e classes `.compat-*`).

## Validação de cascata
Comparação computada entre Etapa 10 e Etapa 11 simulando `body.ks-design-ready` e telas representativas em desktop e mobile:
- Login 1440 px: 0 diferenças;
- Home 1440 px: 0 diferenças;
- Avaliação 1440 px: 0 diferenças;
- Avaliação 620 px: 0 diferenças;
- Financeiro 620 px: 0 diferenças;
- Mídias 520 px: 0 diferenças;
- Pacientes 1120 px: 0 diferenças;
- Configurações 430 px: 0 diferenças.

## Decisão arquitetural
Os 789 `!important` remanescentes não são tratados como meta final. A maior parte está concentrada em `KineSys.html`, `design_clinical.css` e `design_typography.css`, onde ainda protege a interface contra estilos inline e regras históricas. A Etapa 12 deve remover estilos inline visuais primeiro; depois disso, uma nova queda substancial de `!important` ficará segura sem alterar a aparência.
