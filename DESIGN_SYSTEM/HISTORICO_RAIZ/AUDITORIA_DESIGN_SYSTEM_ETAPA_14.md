# KineSys Clinical — Auditoria Visual e Estrutural Final | Etapa 14

## Escopo
Auditoria final do Design System após as Etapas 1–13, com foco em:
- preservação do Design Freeze;
- legibilidade e microtipografia;
- consistência de componentes e tipografia;
- responsividade estrutural;
- conflitos de cascata;
- CSS/JS residual de apresentação;
- acessibilidade visual básica;
- prontidão estrutural para a versão de produção.

Esta etapa **não altera regras clínicas, pesos diagnósticos, Supabase, permissões, Agenda funcional, cálculos financeiros ou persistência**.

> Limitação: o Chromium headless disponível no ambiente continua bloqueado por DBus/zygote e não conclui a renderização. Portanto, a nota abaixo é uma auditoria estática/estrutural aprofundada, não uma alegação de inspeção pixel-a-pixel em navegador.

---

## Resultado executivo

### Nota técnica pré-produção: **8,8 / 10**

O KineSys já possui um contrato visual muito mais previsível do que no início da refatoração. Os componentes principais, tipografia, navegação, Agenda, Avaliação/Motor e responsividade têm fontes oficiais. O que impede uma nota estrutural próxima de 10/10 não é mais a linguagem visual em si: é a **cascata residual do HTML legado**.

### Pontuação por eixo
| Eixo | Nota | Diagnóstico |
|---|---:|---|
| Tipografia / legibilidade | 9,6 | Escala semântica preservada; microtipografia residual do app corrigida nesta etapa. |
| Campos / botões / cards | 9,4 | Contratos oficiais consolidados; exceções compactas explícitas. |
| Sidebar / Topbar | 9,4 | Autoridade única e dimensões previsíveis. |
| Agenda | 9,1 | Módulo visual único; ainda depende da cascata global em elementos compartilhados. |
| Avaliação / Motor Clínico | 9,1 | Design Freeze preservado; ainda concentra muitos `!important`. |
| Responsividade | 9,0 | 12 breakpoints oficiais, nenhum breakpoint fora do contrato. |
| Contraste / foco / reduced motion | 9,0 | Tokens principais com bom contraste; focus-visible e reduced-motion presentes. |
| Manutenibilidade estrutural | 7,1 | 6 blocos CSS inline, 157 seletores cruzando fontes, 197 aliases legados e 785 `!important`. |

---

## Correções realizadas na Etapa 14

### 1. Família tipográfica realmente unificada
Foi encontrada uma inconsistência de cascata: o CSS antigo aplicava `font-family` pelo seletor universal `*`, impedindo que vários elementos herdassem a pilha oficial definida no `body`.

Correção:
- criado `--kds-font-family-ui` em `design_tokens.css`;
- `*` passou a cuidar somente de `box-sizing`;
- `body` e `body.ks-design-ready` usam a mesma pilha por token;
- controles continuam herdando a fonte do app.

Resultado: uma única família tipográfica efetiva no runtime, sem alterar os tamanhos aprovados.

### 2. Microtipografia de 11 px no modal de exportação do prontuário
O modal **“Imprimir / salvar prontuário”** ainda era gerado pelo JavaScript com textos de `11px` e vários `style="..."` visuais.

Correção:
- removidos os estilos inline do modal;
- criadas classes `ks-prontuario-export-*` em `design_screens.css`;
- textos passam a usar os papéis semânticos do Design System;
- opções ficam responsivas em uma coluna abaixo de 620 px;
- estado `disabled` usa o contrato oficial dos botões, sem `style.opacity` em JavaScript.

### 3. Utilitários numéricos de fonte aposentados
Foram eliminados os utilitários:
- `kds-u-fs-12px`
- `kds-u-fs-13px`
- `kds-u-fs-14px`
- `kds-u-fs-16px`

Usos ativos foram migrados para:
- `kds-u-fs-meta`
- `kds-u-fs-label`
- `kds-u-fs-ui`
- `kds-u-fs-body`

Resultado: **0 referências a utilitários tipográficos numéricos** no runtime do app.

### 4. PROMs — estado vazio sem apresentação inline
O estado “Nenhuma escala encontrada...” ainda carregava grid, padding, borda, raio e background diretamente no JavaScript.

Correção:
- criado `.proms-empty-state` em `design_clinical.css`;
- JavaScript passa apenas a classe/estado.

### 5. Reduced motion duplicado
Havia duas autoridades para `prefers-reduced-motion`. A regra antiga no HTML era integralmente substituída pela regra oficial de `design_screens.css`.

Correção:
- removido o bloco morto do HTML;
- `!important` ativos: **789 → 785**.

---

## Design Freeze — verificação

| Contrato | Valor oficial | Estado |
|---|---:|---|
| Corpo | 16 px | ✅ protegido por `design_typography.css` |
| Campos | 15,5 px | ✅ |
| Altura input/select | 45 px | ✅ |
| Labels | 13,5 px | ✅ |
| Navegação/sidebar | 14,5 px | ✅ |
| Título de página | 31 px | ✅ |
| Regiões da Avaliação | 17 px | ✅ |
| Nome da região | 21 px | ✅ |
| Eixos | 18 px | ✅ |
| Achados | 15 px | ✅ |
| Botões principais | ~14 px / 42 px | ✅ |
| Agenda compacta | 14 px / 42 px | ✅ exceção explícita |

Não foi reduzida a tipografia global em mobile. Regras legadas anteriores ainda contêm valores menores, mas **não vencem a fonte tipográfica oficial**.

---

## Contraste dos tokens centrais
Razões calculadas segundo luminância relativa WCAG:

| Combinação | Contraste |
|---|---:|
| texto principal / branco | 12,01:1 |
| texto secundário / branco | 8,52:1 |
| muted / branco | 4,51:1 |
| accent / branco | 5,48:1 |
| branco / accent | 5,48:1 |
| danger / branco | 6,42:1 |
| success / branco | 5,64:1 |

`--kds-faint` fica em ~3,03:1 e deve continuar restrito a conteúdo desabilitado/de-emphasized, não a texto informacional normal.

---

## Métricas estruturais atuais

### Runtime
- CSS externos carregados: **10**
- blocos `<style>` inline: **6**
- tamanho aproximado desses blocos: **109,7 KB**
- regras CSS ativas/inline analisadas: **2.348**
- declarações analisadas: **6.966**
- seletores distintos: **1.872**
- seletores definidos em mais de uma fonte: **157**
- `!important` ativos: **785**
- referências a aliases/tokens legados: **197** em 19 nomes
- atributos `style=""` no HTML: **31**, todos exclusivamente para `display` inicial
- inline visual estático no HTML: **0**
- utilitários numéricos de fonte ativos: **0**

### Hotspots de cascata ainda existentes
Os maiores pontos de sobreposição são:
- `.ks-patient-context` — 6 fontes;
- `.eyebrow` / `.ks-eyebrow` — 5 fontes;
- contexto/metadados do paciente — 4–5 fontes;
- `.tela`, grids e actions globais — 4–5 fontes;
- cards/ações do prontuário — 4 fontes.

Esses pontos não significam bug visual automático, mas são os principais riscos de regressão durante manutenção futura.

### `!important` por fonte
- `design_clinical.css`: **283**
- `KineSys.html`: **201**
- `design_typography.css`: **152**
- `design_responsive.css`: **97**
- `design_screens.css`: **47**
- `design_components.css`: **4**
- `design_agenda.css`: **1**
- foundation/navigation/utilities/tokens: **0**

---

## Responsividade
Breakpoints máximos encontrados no runtime:

**430 / 520 / 560 / 620 / 700 / 760 / 820 / 900 / 980 / 1100 / 1180 / 1280 px**

Complemento lógico:
- `min-width:701px`

Resultado:
- breakpoints fora do contrato: **0**;
- queries vazias detectadas: **0**;
- novo modal de exportação usa o breakpoint oficial de 620 px.

---

## Validação técnica

- CSS externos: **10/10 sem erro de parse**
- blocos CSS inline: **6/6 sem erro de parse**
- JavaScript carregado: **22/22 em `node --check`**
- todos os JavaScripts do pacote: **82/82 em `node --check`**
- JS byte a byte idênticos à Etapa 13: **78/82**
- JS alterados apenas para apresentação: `clinical_engine_v232.js`, `home_detalhes.js`, `proms_escalas.js`, `prontuario_export.js`
- IDs no HTML: **498**
- IDs duplicados: **0**
- referências locais: **32/32 encontradas**
- tokens `--kds-*` definidos: **80**
- tokens `--kds-*` usados: **80**
- tokens KDS indefinidos: **0**
- breakpoints fora do contrato: **0**

### Auditor histórico `auditoria_1112.js`
Permanece com **4 falhas**, exatamente no conjunto histórico já conhecido:
1. “nova camada visual presente”;
2. “termômetro não herda o grid compacto antigo”;
3. “evolução abre com data atual”;
4. “CSS força cartão da agenda a mostrar só paciente”.

Nenhuma falha nova surgiu nesta etapa. As duas primeiras verificações estão acopladas à arquitetura visual antiga. As duas últimas são verificações funcionais/históricas e não foram alteradas pela Etapa 14.

---

## O que ainda impede o Design System de ser considerado versão final de produção

### P0 — crítico
**Nenhum P0 visual/estrutural novo encontrado.**

### P1 — deve ser resolvido na Etapa 15
1. **Extrair os 6 blocos `<style>` inline restantes** para arquivos semânticos finais.
2. **Resolver os 157 seletores que ainda cruzam múltiplas fontes**, escolhendo uma autoridade final por domínio.
3. **Migrar as 197 referências a aliases legados** para `--kds-*` ou para novos tokens semânticos de estado quando necessário.
4. Após 1–3, **reavaliar os 785 `!important`**. A maior oportunidade está no Motor, tipografia e CSS ainda preso ao HTML.
5. Consolidar a ordem final das folhas de estilo e, quando a cascata permitir, manter os links de CSS no `<head>` para evitar dependência de folhas tardias no corpo do documento.
6. Atualizar a auditoria automatizada para o novo Design System, para que testes de arquitetura antiga deixem de gerar falsos negativos.

### P2 — refinamento
- reduzir cores literais repetidas e promover estados recorrentes (`warning`, `info`, `critical`, `success`) a tokens semânticos;
- revisar aliases não apenas por equivalência de cor, mas por intenção semântica;
- executar QA real de navegador/teclado em Chrome/Edge no Windows antes do deploy.

---

## Conclusão
A Etapa 14 não encontrou motivo técnico para redesenhar novamente o KineSys. O contrato visual central está consistente e os bugs visuais objetivos encontrados foram corrigidos.

A **Etapa 15 deve ser uma consolidação de produção**, não uma nova rodada estética: remover a última camada de CSS inline legado, reduzir autoridades concorrentes, aposentar aliases e revalidar a cascata. Só depois disso faz sentido chamar o Design System de estruturalmente final.
