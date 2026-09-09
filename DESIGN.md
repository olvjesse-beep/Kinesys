---
name: KineSys
description: Sistema clínico de precisão para fisioterapia
colors:
  background-clinical: "#F4F7F6"
  surface: "#FFFFFF"
  surface-soft: "#F8FAF9"
  petroleum-clinical: "#173B45"
  text-secondary: "#345158"
  muted: "#667A7F"
  line: "#D9E4E1"
  precision-teal: "#1E756F"
  precision-teal-hover: "#175F5A"
  precision-teal-soft: "#EAF5F2"
  danger: "#A53B33"
  success: "#2F735A"
  technology-teal: "#2AA79D"
typography:
  display:
    fontFamily: '"Segoe UI Variable", "Segoe UI", -apple-system, BlinkMacSystemFont, Roboto, Helvetica, Arial, sans-serif'
    fontSize: "31px"
    fontWeight: 720
    lineHeight: 1.12
    letterSpacing: "-0.6px"
  headline:
    fontFamily: '"Segoe UI Variable", "Segoe UI", -apple-system, BlinkMacSystemFont, Roboto, Helvetica, Arial, sans-serif'
    fontSize: "21px"
    fontWeight: 700
    lineHeight: 1.25
  title:
    fontFamily: '"Segoe UI Variable", "Segoe UI", -apple-system, BlinkMacSystemFont, Roboto, Helvetica, Arial, sans-serif'
    fontSize: "18px"
    fontWeight: 700
    lineHeight: 1.35
  body:
    fontFamily: '"Segoe UI Variable", "Segoe UI", -apple-system, BlinkMacSystemFont, Roboto, Helvetica, Arial, sans-serif'
    fontSize: "16px"
    lineHeight: 1.55
  label:
    fontFamily: '"Segoe UI Variable", "Segoe UI", -apple-system, BlinkMacSystemFont, Roboto, Helvetica, Arial, sans-serif'
    fontSize: "13.5px"
    fontWeight: 700
    lineHeight: 1.35
rounded:
  sm: "8px"
  md: "11px"
  lg: "14px"
  pill: "999px"
spacing:
  space-3: "12px"
  shell-gutter: "30px"
  shell-gutter-notebook: "23px"
  shell-gutter-mobile: "12px"
components:
  button-primary:
    backgroundColor: "{colors.precision-teal}"
    textColor: "{colors.surface}"
    rounded: "{rounded.sm}"
    padding: "9px 14px"
    height: "42px"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text-secondary}"
    rounded: "{rounded.sm}"
    padding: "9px 14px"
    height: "42px"
  card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.petroleum-clinical}"
    rounded: "12px"
    padding: "20px 22px"
  input-field:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.petroleum-clinical}"
    rounded: "{rounded.sm}"
    padding: "10px 12px"
    height: "45px"
---

# Design System: KineSys

## Overview

**Creative North Star: "Clínica de Precisão"**

O KineSys deve parecer uma ferramenta clínica construída para decisão profissional repetida ao longo do dia: precisa, estável e organizada, sem aparência genérica de dashboard administrativo. A linguagem visual combina uma base clínica sóbria com tecnologia discreta, usando petróleo para estrutura e leitura e teal para ação, foco e estados relevantes.

A personalidade é **clínica, moderna e tecnológica**. A interface aceita densidade quando ela melhora o trabalho clínico, mas nunca em troca de legibilidade. Ornamentação deve ser subordinada à função; a sensação de sofisticação vem de hierarquia, alinhamento, ritmo, estados claros e consistência entre módulos.

**Key Characteristics:**
- Petróleo + teal como identidade estrutural e interativa.
- Densidade clínica deliberada, sem microtipografia.
- Sidebar escura fixa no desktop e topbar sticky para orientação persistente.
- Superfícies de conteúdo predominantemente planas; elevação reservada a camadas que realmente sobem no fluxo.
- Componentes precisos, discretos e funcionais, com estados de foco claramente visíveis.
- Responsividade por reflow, stacking e redistribuição antes de qualquer compressão tipográfica.

## Colors

A paleta usa neutros clínicos claros para manter sessões longas confortáveis, petróleo para estrutura e teal para sinais de ação e tecnologia.

### Primary
- **Teal de Precisão** (`#1E756F`): ação primária, estados interativos e ênfase funcional.
- **Teal de Precisão — Hover** (`#175F5A`): aprofundamento do teal em hover e ações textuais compactas.
- **Teal Tecnológico** (`#2AA79D`): acento de marca, foco e sinais tecnológicos pontuais.

### Neutral
- **Petróleo Clínico** (`#173B45`): texto estrutural, títulos, estados selecionados e identidade principal.
- **Neutro Clínico — Fundo** (`#F4F7F6`): plano de fundo geral da aplicação.
- **Neutro Clínico — Superfície** (`#FFFFFF`): cards, campos, menus e superfícies elevadas.
- **Neutro Clínico — Suave** (`#F8FAF9`): superfícies secundárias e áreas de apoio.
- **Texto Secundário** (`#345158`): informação de menor hierarquia sem perder contraste.
- **Cinza Clínico** (`#667A7F`): metadados e textos auxiliares.
- **Linha Clínica** (`#D9E4E1`): separadores, bordas e estrutura de baixa ênfase.

### Semantic
- **Teal Suave** (`#EAF5F2`): hover e realce funcional de baixa intensidade.
- **Vermelho de Risco** (`#A53B33`): ações destrutivas e estados de risco.
- **Verde de Confirmação** (`#2F735A`): sucesso e confirmação.

### Named Rules

**The Clinical Signal Rule.** Teal comunica ação, foco, seleção ou tecnologia; petróleo comunica estrutura e leitura. Evitar usar teal como grande área decorativa quando não há significado funcional.

## Typography

**Display Font:** Segoe UI Variable / Segoe UI, com fallbacks de sistema.
**Body Font:** Segoe UI Variable / Segoe UI, com fallbacks de sistema.

**Character:** tipografia de interface contemporânea e neutra, pensada para leitura clínica prolongada. A escala privilegia diferenciação sem saltos excessivos e elimina microtexto operacional.

### Hierarchy
- **Display** (720, `31px`, `1.12`): título principal de página no desktop; reduz apenas para os tokens oficiais de notebook/mobile.
- **Headline** (700, `21px`, `1.25`): nomes de regiões, drawers, modais e cabeçalhos de maior hierarquia local.
- **Title** (700, `18px`, `1.35`): seções e cabeçalhos intermediários.
- **Body** (`16px`, `1.55`): texto-base do produto e referência de conforto de leitura.
- **Content** (`15px`, `1.55`): conteúdo operacional contínuo, listas e textos de interface.
- **Field** (`15.5px`, `1.5`): campos de formulário no desktop.
- **Navigation** (`14.5px`, `1.35`): navegação, tabelas e informação compacta de alta frequência.
- **Label** (700, `13.5px`, `1.35`): rótulos, tabs, ações compactas e cabeçalhos de tabela.
- **Metadata** (`12.5px`, `1.5`): menor papel operacional permitido; reservado a metadados, helpers, badges e notas auxiliares.

O contrato clínico congelado preserva **Regiões 17px / Região selecionada 21px / Eixos 18px / Achados 15px**. A Agenda mantém a exceção compacta oficial de **14px / 42px** para controles específicos.

### Named Rules

**The Official Scale Rule.** Código novo usa os papéis semânticos `--kds-font-*`; não criar tamanhos locais para resolver um problema de layout.

## Layout

O shell desktop usa sidebar fixa de `244px`, reduzida para `226px` em notebook. O conteúdo principal desloca-se ao lado da sidebar e usa gutters de `30px`, `23px` e `12px` conforme a largura. A largura geral de conteúdo é limitada semanticamente por `--kds-content-width: 1360px`, enquanto o núcleo clínico possui contrato próprio de `1080px`.

A topbar é sticky, com altura mínima de `90px` no desktop e `80px` no mobile. Em `820px` ou menos, a sidebar deixa de ocupar o fluxo lateral e vira drawer móvel de até `300px` / `88vw`, enquanto o conteúdo retorna a largura total. A navegação e o contexto do paciente permanecem elementos de orientação persistente.

Breakpoints oficiais de `max-width`: **1280, 1180, 1100, 980, 900, 820, 760, 700, 620, 560, 520 e 430px**. Existe ainda o complemento oficial `min-width: 701px`. Não criar breakpoints concorrentes sem necessidade explícita.

A Agenda é uma exceção de alta densidade conscientemente controlada: grade semanal com eixo de horas de `54px`, cabeçalho de `52px`, slots de `32px`, controles compactos de `42px` e scroll vertical limitado a `74vh`.

**The Legibility Before Density Rule.** Legibilidade clínica vence densidade: primeiro reorganizar, quebrar, empilhar ou redistribuir o layout; reduzir tipografia somente dentro das escalas oficiais já definidas.

## Elevation & Depth

O KineSys é **estruturalmente plano, hierarquicamente elevado**. Cards e superfícies de conteúdo permanecem planos; sombra é reservada para elementos temporariamente acima do fluxo — menus, popovers, drawers, overlays, painéis flutuantes e estados que precisam indicar elevação real.

### Shadow Vocabulary
- **Float** (`0 12px 30px rgba(20,51,58,.07)`): menus e camadas flutuantes leves.
- **Soft** (`0 1px 2px rgba(20,51,58,.035), 0 7px 20px rgba(20,51,58,.035)`): destaque discreto de controles ou estados selecionados.
- **Panel** (`0 14px 36px rgba(24,54,61,.08)`): painéis que precisam se separar claramente do plano de conteúdo.
- **Sidebar** (`6px 0 24px rgba(15,40,47,.08)`): separação lateral discreta da navegação fixa.

### Named Rules

**The Structurally Flat Rule.** Estruturalmente plano, hierarquicamente elevado. Cards permanecem planos; sombras aparecem quando um elemento realmente ocupa uma camada superior ou precisa comunicar elevação funcional.

## Shapes

A linguagem de forma é moderadamente arredondada, clínica e controlada. O sistema usa raios `8px`, `11px`, `14px` e `999px` como escala principal. Cards globais usam `12px`; em telas menores podem reduzir para `10px`. Controles e navegação usam principalmente `8px`, mantendo consistência e evitando aparência excessivamente lúdica.

Pills são reservadas a badges, tags, segmented controls e seleções compactas. A Agenda usa raios menores em elementos densos, incluindo `5px` para cards de compromisso. Bordas finas e neutras são preferidas a contornos pesados; risco clínico é exceção deliberada e pode usar bordas vermelhas mais fortes.

## Components

**Precisos, discretos e funcionais: controles devem comunicar claramente estado e hierarquia sem ornamentação desnecessária.**

### Buttons
- **Shape:** raio padrão de `8px`; altura mínima `42px`; padding `9px 14px`.
- **Primary:** fundo e borda `#1E756F`, texto branco, peso aproximado de 680.
- **Hover / Focus:** hover aprofunda para `#175F5A` com sombra teal leve; foco visível usa outline teal translúcido com offset.
- **Secondary / Nav:** superfície branca, borda neutra e texto petróleo/cinza; hover usa fundo muito claro e borda teal discreta.
- **Danger:** fundo branco e vermelho de risco; o perigo é inequívoco, mas não compete visualmente com a ação primária até ser necessário.
- **Compact:** altura reduzida apenas para ações auxiliares previstas pelo sistema.

### Chips
- **Style:** pills com fundo branco, borda neutra e texto secundário; variantes compactas usam espaçamento reduzido e raio de `9px`.
- **State:** selecionado troca para petróleo com texto branco. Chips de Agenda e Avaliação podem usar a exceção compacta compartilhada.

### Cards / Containers
- **Corner Style:** `12px` global; `10px` em telas menores quando previsto.
- **Background:** branco sobre fundo clínico claro.
- **Shadow Strategy:** sem sombra por padrão.
- **Border:** `1px` claro, como `#E1E9E6`.
- **Internal Padding:** `20px 22px` no desktop, reduzido progressivamente para `18px` / `16px` em telas menores.

### Inputs / Fields
- **Style:** altura mínima `45px`, padding `10px 12px`, raio `8px`, superfície branca e borda `#D4E0DD`.
- **Focus:** borda teal clara + halo `0 0 0 3px rgba(42,167,157,.10)` e `focus-visible` explícito.
- **Error / Disabled:** erro usa vermelho e fundo `#FFF7F7`; disabled usa superfície muted, texto faint e opacidade reduzida.
- **Mobile:** campos passam a `16px` para preservar legibilidade e evitar zoom automático do navegador.

### Navigation
- **Desktop:** sidebar fixa escura em gradiente petróleo, itens de `44px`, tipografia `14.5px`, ícones `19px` e active state com barra teal interna.
- **Topbar:** sticky, fundo clínico translúcido com blur leve e título de página dominante.
- **Mobile:** sidebar vira drawer; backdrop escuro separa a camada de navegação do conteúdo; botão de menu mantém foco visível.

### Agenda
A Agenda é o principal componente de densidade controlada: usa segmented control, toolbar compacta, cabeçalhos sticky e grade semanal dimensionada por tokens. Densidade não autoriza microtipografia; o contrato específico do módulo define onde `42px / 14px` é permitido.

### Clinical Engine
O Motor Clínico usa cartões, etapas, alertas, gates de segurança e painel Radar sem criar outro sistema visual. Red flags, estados inconclusivos e alertas médios preservam codificação semântica forte; pesos clínicos, lógica diagnóstica e fluxo permanecem fora da camada visual.

## Do's and Don'ts

### Do:
- **Do** preserve o vocabulário `--kds-*` existente e use tokens semânticos em novas interfaces.
- **Do** preserve a legibilidade clínica: faça reflow do layout antes de comprimir tipografia e mantenha texto operacional dentro da escala oficial.
- **Do** mantenha cards de conteúdo padrão planos e use elevação somente quando um elemento realmente estiver acima do fluxo do documento.
- **Do** mantenha ações primárias em teal, estrutura e leitura em petróleo e estados destrutivos discretos, porém inequívocos.
- **Do** preserve a exceção compacta da Agenda em `42px / 14px` apenas onde o contrato existente do módulo se aplica.
- **Do** preserve estados de foco visíveis e tipografia de `16px` para campos em mobile.

### Don't:
- **Don't** introduza tamanhos locais de fonte, cores, raios, sombras ou breakpoints arbitrários quando um token KDS ou contrato de módulo já cobre a necessidade.
- **Don't** adicione sombras decorativas a cards comuns nem transforme a interface em um dashboard de cartões flutuantes.
- **Don't** reduza texto clínico para resolver pressão responsiva; altere composição, quebra, stacking ou largura primeiro.
- **Don't** use teal vivo como grande área decorativa; ele é principalmente um sinal de ação, estado e foco.
- **Don't** neutralize alertas clínicos ou red flags de forma que enfraqueça a comunicação de risco.
- **Don't** altere IDs HTML, semântica clínica, comportamento do Supabase ou lógica de workflow como efeito colateral de trabalho visual.
