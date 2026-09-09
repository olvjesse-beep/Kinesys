# KineSys — Design System | Etapa 5 — Campos

## Objetivo
Consolidar `input`, `select` e `textarea` em uma única base visual, sem redesenhar o produto, sem alterar lógica funcional e sem permitir que Avaliação/Motor Clínico voltem a cair para controles de 11–14 px ou 38–44 px por regras antigas.

## Contrato preservado do Design Freeze
- `input` / `select`: **45 px** de altura mínima.
- Fonte de campo: **15,5 px**.
- Raio: **8 px**.
- Padding base: **10 px 12 px**.
- Borda e fundo únicos.
- Placeholder único.
- `focus` / `focus-visible` únicos.
- Estados `disabled`, `readonly`, `error` e `success` previsíveis.
- `textarea`: mesma linguagem visual, com altura funcional maior.
- Em telas móveis, campos sobem para **16 px** para evitar zoom automático do navegador.

## Fonte de verdade
O componente passou a viver em `design_components.css`.

Token principal:
- `--kds-control-height: 45px`

Token compacto explícito:
- `--kds-control-height-compact: 42px`

A base usa `:where()` para manter baixa especificidade. Isso permite que módulos ajustem largura ou altura funcional sem recriar tipografia, borda, raio e estados globais e sem depender de uma nova guerra de `!important`.

## Alterações realizadas
1. Removidas **6 bases globais concorrentes** de campos existentes no HTML/CSS legado.
2. `KineSys.html` deixou de definir a aparência global de `.input-group input/select/textarea`.
3. Removidas duas gerações adicionais de patches `body.ks-design-ready input/select/textarea` do HTML.
4. `ui_refinement.css` deixou de dimensionar e aplicar foco aos campos.
5. `ui_expert.css` deixou de dimensionar campos; o antigo `font: inherit` foi reduzido a `font-family: inherit` para não resetar `15,5 px`.
6. `ui_typography_comfort.css` deixou de ser a autoridade de tamanho dos campos.
7. O `select` de testes especiais da Avaliação não força mais `34–42 px` e `11–14 px`; herda **45 px / 15,5 px**.
8. O cabeçalho do paciente na Avaliação não força mais `39–43 px`.
9. A busca do Motor Clínico (`.ks-specific-search`) não cria mais altura/font/borda paralelas.
10. Controles de Safety do Motor não forçam mais `38 px`.
11. Removido do JavaScript um `select` dinâmico com `font-size:11px` e padding inline.
12. O seletor de importação de mídia deixou de forçar `36 px / 11 px`.
13. O seletor de plano da Agenda deixou de forçar `11 px`.
14. O seletor de Relatórios deixou de forçar `12,5 px`; mantém somente regras necessárias de largura.
15. O editor oficial de relatório mantém apenas altura/fonte documental específica, sem reduzir o tamanho global do campo.
16. Estados de validação cadastral (`error/success`) foram movidos para o componente oficial.

## Exceções explícitas
### Agenda densa
Somente os filtros da toolbar e os horários da grade semanal usam:
- **42 px**
- **14 px**

Essa é uma exceção do módulo, não outro sistema paralelo.

### Textareas funcionais
- HMA principal: altura mínima **128 px**.
- Editor oficial de relatório: altura mínima ampliada.
- Editor de mensagens/configuração: altura mínima ampliada.

Essas exceções alteram área de trabalho, não a linguagem visual do campo.

## Métricas
| Métrica | Etapa 4 | Etapa 5 |
|---|---:|---:|
| `!important` nos arquivos visuais principais | 1.175 | **1.144** |
| bases globais concorrentes de campos | 6 | **1** |
| `:root` no runtime | 1 | **1** |
| fonte global de campo | 15,5 px | **15,5 px** |
| altura global de input/select | 45 px | **45 px** |
| exceção compacta de Agenda | espalhada em 36/38/42 px | **42 px explícitos** |

A redução de `!important` continua deliberadamente gradual: **31 ocorrências removidas nesta etapa**, somente onde a consolidação de campos permitiu fazê-lo com segurança.

## Design Freeze — Regiões e Eixos
O bloco reforçado de tipografia de **Regiões/Eixos de Exame** em `ui_typography_comfort.css` foi comparado com a Etapa 4 e permaneceu **idêntico**. Portanto, esta etapa não reverte a correção que tornou essas áreas maiores e mais legíveis.

## O que NÃO foi alterado
- Supabase, banco, migrations ou autenticação.
- Permissões.
- Regras clínicas.
- Pesos, clusters, hipóteses ou fechamento diagnóstico.
- Fluxos da Agenda.
- Persistência financeira.
- Estrutura funcional dos relatórios.
- Checkboxes, radios, range/termômetro da dor e chips especializados.

## Validação
- **15/15 JS ativos** passaram em `node --check`.
- CSS externo: **0 erros de parsing**.
- Blocos `<style>` do HTML: **0 erros de parsing**.
- Seletores do `design_components.css`: **0 erros**.
- IDs HTML duplicados: **0**.
- Referências locais HTML verificadas: **28**, ausentes: **0**.
- URLs locais de CSS ausentes: **0**.
- Referências estáticas locais em JS ausentes: **0**.
- `:root` no runtime: **1**.
- Design Freeze de Regiões/Eixos: **preservado**.

### Observação sobre a auditoria histórica v1.11.2
O script histórico `ARQUIVO_DESENVOLVIMENTO/testes/auditoria_1112.js` continua acusando 2 verificações antigas (data automática da Evolução e regra textual do card da Agenda). O mesmo script acusa **as mesmas 2 falhas no ZIP original da Etapa 4**, portanto não são regressões introduzidas pela Etapa 5.

## Próxima etapa
**Etapa 6 — consolidação da tipografia global**: criar uma escala única para corpo, labels, metadata, títulos, tabelas, Agenda, cards e módulos clínicos, removendo tamanhos quase duplicados e impedindo o retorno de microtipografia.
