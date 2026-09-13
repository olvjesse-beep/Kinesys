# KineSys — System Liquid Glass r12

## Direção

Aplicação sistêmica do material **Liquid Glass** em modo operacional (`Operate`), preservando o princípio KDS **estruturalmente plano, hierarquicamente elevado**.

## Hierarquia de aplicação

- **Glass forte:** login, topbar, modais, drawers e toasts.
- **Glass moderado:** botões, tabs, chips, filtros e campos.
- **Glass leve:** cards e painéis operacionais.
- **Flat intencional:** tabelas, documentos e superfícies clínicas de leitura prolongada.

## Regras

1. `styles/design_tokens.css` continua sendo o único `:root` oficial.
2. Tokens do tema são escopados a `body.ks-design-ready`.
3. O tema não altera DOM, IDs, contratos, persistência, Supabase ou lógica clínica.
4. Avaliação, Evolução, Relatórios e outras superfícies de leitura prolongada preservam fundos sólidos quando a transparência reduzir legibilidade.
5. Camadas realmente elevadas podem usar blur/refração mais forte.
6. O tema respeita `prefers-reduced-transparency` e `prefers-reduced-motion`.
7. O fallback sem `backdrop-filter` mantém superfícies legíveis e sólidas.

## Auditoria

`Impeccable detailed visual audit` deve rodar em alterações dos arquivos visuais centrais e da própria camada `design_liquid_glass-1.0.0.css`.

O contrato `tests/system_liquid_glass.contract.js` protege a hierarquia do material e impede regressão para glass decorativo em dados densos.
