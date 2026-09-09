# Componente Tipografia — KineSys Design System / Etapa 6

## Fonte de verdade
- Valores: `design_tokens.css`
- Aplicação semântica: `design_typography.css`

## Escala principal
| Papel | Token | Valor |
|---|---|---:|
| Metadata / apoio | `--kds-font-metadata` | 12,5 px |
| Label | `--kds-font-label` | 13,5 px |
| UI / botão | `--kds-font-ui` | 14 px |
| Navegação | `--kds-font-nav` | 14,5 px |
| Conteúdo | `--kds-font-content` | 15 px |
| Campo | `--kds-font-field` | 15,5 px |
| Corpo | `--kds-font-body` | 16 px |
| Clínico destacado | `--kds-font-clinical` | 17 px |
| Heading pequeno | `--kds-font-heading-sm` | 18 px |
| Heading médio | `--kds-font-heading-md` | 20 px |
| Heading grande | `--kds-font-heading-lg` | 22 px |
| KPI | `--kds-font-kpi` | 27 px |
| Título da página | `--kds-font-title` | 31 px |

## Contrato clínico preservado
- Região: `--kds-font-region` = 17 px
- Nome da região selecionada: `--kds-font-region-name` = 21 px
- Eixo/direção: `--kds-font-axis` = 18 px
- Achado: `--kds-font-finding` = 15 px

## Regras
1. Não criar `font-size: Npx` em novos estilos do runtime.
2. Escolher o papel semântico mais próximo.
3. Metadata é o piso operacional normal: 12,5 px.
4. Não reduzir fonte para ganhar espaço; primeiro ajustar layout/responsividade.
5. PROMs é exceção técnica porque abre documento próprio; sua escala independente também não usa texto abaixo de 12,5 px.
6. A retirada de `!important` será feita de forma sistemática na Etapa 11.
