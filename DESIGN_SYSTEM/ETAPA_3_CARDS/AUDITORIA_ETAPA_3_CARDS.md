# KineSys Design System — Etapa 3: componente Card

## Objetivo
Consolidar o componente visual `.card` sem redesenhar o produto. A Etapa 1 definiu o Design Freeze e a Etapa 2 unificou os tokens. Nesta etapa, a superfície, borda, raio, espaçamento, sombra e cabeçalho do card passam a ter uma única fonte de verdade.

## Fonte de verdade
Novo arquivo de runtime: `design_components.css`.

Ordem de carregamento relevante:
1. `design_tokens.css`
2. estilos legados / `ui_refinement.css`
3. `design_components.css`
4. `ui_expert.css`
5. `clinical_engine_v232.css`
6. `ui_typography_comfort.css`

`design_components.css` é carregado após o legado inline para neutralizar as definições globais antigas, mas antes dos módulos específicos, permitindo que variações legítimas por tela continuem funcionando.

## Contrato preservado
### Card desktop
- Superfície: branca (`--kds-surface`)
- Borda: `1px solid --kds-line`
- Radius: `14px`
- Padding: `22px 24px`
- Margem inferior: `14px`
- Sombra: `--kds-shadow-soft`

### Cabeçalho
- Layout flexível com quebra de linha
- Gap: `12px`
- Padding inferior: `11px`
- Margem inferior: `15px`
- Título: `18px`, line-height `1.3`
- Texto secundário: `13.5px`, line-height `1.5`

### Responsividade
- Até 820px: `19px 18px`
- Até 620px: `17px`, radius `12px`
- Até 520px: cabeçalho alinha pelo topo

## Variantes explícitas introduzidas
- `.card--nested`: substitui o comportamento implícito legado `.card .card`; usa fundo suave e sem sombra.
- `.card--flat`: superfície sem elevação. Já aplicada aos cards agrupados da Home pelo `design_system.js`.

Dois cards internos da Evolução foram migrados para `.card--nested`, removendo `box-shadow` e `background` inline que apenas repetiam o design.

## Limpeza efetuada
Foram removidas definições globais concorrentes de `.card`, `.card-header` e `.card-header h2` de:
- `KineSys.html`
- `ui_refinement.css`
- `ui_expert.css`
- `ui_typography_comfort.css`

Regras específicas de módulo foram preservadas quando comunicam intenção própria, por exemplo cards de Avaliação sem sombra, toolbars financeiras, cards colapsáveis e superfícies internas especiais.

## Métricas
| Métrica | Etapa 2 | Etapa 3 |
|---|---:|---:|
| `!important` total | 1.198 | 1.189 |
| ocorrências de regras `.card{}` nos arquivos legados principais | 19 | 8 |
| ocorrências de `.card-header{}` nos arquivos legados principais | 15 | 9 |
| ocorrências de `.card-header h2{}` nos arquivos legados principais | 11 | 6 |
| `:root` runtime | 1 | 1 |

As ocorrências remanescentes de `.card` nos arquivos legados são majoritariamente regras **específicas de módulo** ou regras de segurança responsiva (`min-width`, `width`), não uma nova definição global concorrente do componente.

## Validações
- Todos os JS de runtime: `node --check` aprovado.
- CSS: 0 erros de parsing.
- IDs HTML duplicados: 0.
- Referências locais ausentes: 0.
- `design_components.css` carregado antes dos módulos finais: confirmado.
- Design Freeze do card: aprovado por verificação estática.
- Nenhum SQL necessário.

## Próxima etapa
Etapa 4: consolidar botões (`primary`, `secondary`, `destructive`, compactos e estados), reduzindo alturas/paddings concorrentes sem alterar a hierarquia visual aprovada.
