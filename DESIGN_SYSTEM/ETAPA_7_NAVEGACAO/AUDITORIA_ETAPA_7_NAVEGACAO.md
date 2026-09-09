# KineSys — Design System — Etapa 7: Sidebar + Topbar

## Objetivo
Consolidar Sidebar, Topbar e gutters do shell em uma única fonte visual, removendo decisões concorrentes de `KineSys.html`, `ui_refinement.css`, `ui_expert.css` e `design_typography.css` sem alterar a lógica funcional da navegação.

## Diagnóstico da Etapa 6
A navegação era redefinida por quatro camadas. Havia larguras concorrentes de Sidebar (214 / 226 / 232 / 244 px), alturas concorrentes da Topbar (74 / 76 / 80 / 82 / 90 / 94 / 96 px) e diversos paddings para os mesmos itens.

Foram contabilizadas 195 ocorrências dos seletores de navegação nos arquivos legados principais:
- KineSys.html: 114
- ui_refinement.css: 11
- ui_expert.css: 44
- design_typography.css: 26

## Consolidação
Foi criado `design_navigation.css`, carregado depois da tipografia, como fonte de verdade para:
- largura e comportamento da Sidebar;
- identidade/brand da Sidebar;
- área do usuário;
- grupos e itens de navegação;
- ícones;
- estados hover / active / focus-visible;
- botão Sair;
- Topbar;
- título/subtítulo da página;
- badge de versão;
- botão de menu móvel;
- backdrop e drawer móvel;
- gutters do shell nos breakpoints;
- compactação controlada para janelas de baixa altura.

## Contrato preservado
- Sidebar desktop: 244 px
- Sidebar notebook: 226 px
- Sidebar móvel: até 300 px / 88vw
- Item de navegação: 44 px
- Ícone de navegação: 19 px
- Fonte de navegação: 14,5 px
- Topbar desktop: mínimo 90 px
- Topbar móvel: 80 px
- Título de página: 31 px desktop / 28 px notebook / 26 px mobile <=820 px

## Tokens adicionados
Foram adicionados tokens semânticos em `design_tokens.css` para dimensões e gutters do shell (`--kds-sidebar-*`, `--kds-nav-*`, `--kds-topbar-*`, `--kds-shell-*`).

## Resultado estrutural
- Ocorrências de seletores de navegação fora da fonte oficial: 195 -> 0
- `!important` nos estilos ativos: 1.144 -> 1.036
- A redução de 108 ocorreu pela remoção das camadas concorrentes; não foi feita a limpeza sistêmica prevista para a Etapa 11.
- Permanecem apenas 6 declarações prioritárias no arquivo de navegação para coexistir temporariamente com a base tipográfica global que ainda usa prioridade em `<p>` e `<li>`. Esses casos estão marcados para a Etapa 11.

## Segurança funcional
Arquivos funcionais principais permanecem byte a byte iguais à Etapa 6:
- design_system.js
- script.js
- agenda.js
- clinical_engine_v232.js
- clinical_engine_v232.css
- financeiro.js
- proms_escalas.js

A Etapa 7 não altera Supabase, permissões, regras clínicas, Agenda, Motor Clínico, persistência ou cálculos.

## Validação
- 22/22 JavaScripts ativos: `node --check` OK
- 7/7 CSS externos: parser OK
- CSS inline do HTML: parser OK
- IDs duplicados: 0
- Referências locais: 29, ausentes: 0
- Tokens `--kds-*` usados sem definição: 0
- Auditoria histórica v1.11.2: mantém as mesmas 2 falhas antigas da Etapa 6 (data atual da Evolução; teste histórico do cartão da Agenda)

## Próxima etapa
Etapa 8 — consolidação visual da Agenda.
