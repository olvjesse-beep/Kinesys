# KineSys — Design Freeze v1.0

**Etapa 1 da consolidação do Design System**  
Base: Motor Clínico 2.3.2 + Tipografia Conforto + reforço de Regiões/Eixos.

## Objetivo

Registrar o **estado visual desejado** antes de consolidar tokens, componentes e cascata. Esta etapa **não altera o runtime** do KineSys. Ela cria uma referência objetiva para que as próximas etapas possam remover CSS legado sem regressão visual.

> Regra de aceitação das próximas etapas: **mesma identidade e conforto visual, menos CSS concorrente**.

## Princípios congelados

1. **Conforto de leitura acima de densidade extrema.** O KineSys é ferramenta de uso prolongado.
2. **Identidade petróleo + teal/verde clínico preservada.** Não transformar em template branco genérico.
3. **Tipografia funcional grande.** Informação operacional não deve depender de microtexto.
4. **Hierarquia curta.** Título de página → título de seção → conteúdo → metadado.
5. **Cards discretos.** Bordas leves; sombra apenas quando comunica elevação.
6. **Controles confortáveis.** Inputs/botões com alvo visual consistente.
7. **Agenda permanece densa, mas legível.** Nome do paciente nunca volta a 9–10 px.
8. **Avaliação deve ser escaneável durante atendimento.** Regiões/Eixos são protagonistas, não microcontroles.
9. **Motor Clínico é profissional e silencioso.** Sem linguagem infantilizada/professoral.
10. **Responsividade preserva tipografia.** Telas menores reorganizam layout; não encolhem informação crítica.

---

# Contrato visual por componente

## 1. Shell / Sidebar

- Largura desktop de referência: **244 px**.
- Em notebook pode reduzir aproximadamente para **226 px**, nunca comprimindo rótulos funcionais.
- Marca `KineSys`: **22 px**, tracking discreto.
- Navegação principal: **14.5 px**, peso médio/semibold, alvo mínimo **44 px**.
- Nome do usuário: **14.5 px**; função: **12.5 px**.
- Labels de agrupamento (“CLÍNICA”, “ATENDIMENTO”): podem ser menores, mas são decorativos; **10–11 px** é aceitável.
- Sidebar fixa escura e navegação lateral são parte da identidade e **não devem ser redesenhadas**.

## 2. Topbar / Cabeçalho de página

- Altura desktop: aproximadamente **90 px**.
- Título da página: **31 px**, peso ~700, line-height ~1.12.
- Subtítulo: **14–15 px**.
- Versão do sistema: metadado terciário, **11–12 px**.
- Não reintroduzir branding duplicado acima de todo título no desktop.

## 3. Contexto de paciente ativo

- Nome: **16 px**.
- Metadados: **13.5 px**.
- Tabs: **13.5 px**, altura mínima **38 px**.
- Deve ocupar pouco espaço vertical sem comprimir o nome.
- Ações nunca podem esmagar a coluna do nome ou produzir texto vertical.

## 4. Tipografia base

- Corpo funcional: **16 px**.
- Parágrafo: **15 px**, line-height ~1.55.
- Label: **13.5 px**.
- Campo de formulário: **15.5 px**.
- Texto auxiliar funcional: **12.5 px mínimo**.
- Título de card: **18 px**.
- Título de seção clínica: **20–22 px**.
- Metadado verdadeiramente terciário: **11–12 px**.
- Informação operacional crítica **não pode ficar abaixo de 12.5 px**.

## 5. Campos e formulários

- Input/select: altura mínima atual de referência **45 px**.
- Textarea normal: **96 px+**; HMA: **128 px+**.
- Fonte: **15.5 px**.
- Radius visual atual: ~8–9 px.
- Foco deve ser claro, discreto e acessível.
- Não aceitar controles vizinhos com alturas aleatórias de 38/39/41/43/44 px após a consolidação.

## 6. Botões

- Botão padrão: **14 px**, altura de referência **42 px**.
- Em áreas compactas pode existir variante compacta explícita; não criar altura diferente por tela sem motivo.
- Primário: teal/petróleo-esverdeado.
- Secundário: superfície branca/borda discreta.
- Destrutivo: deverá ter variante própria na etapa de componentes, sem competir visualmente com ação primária.

## 7. Cards

- Visual atual desejado: superfície branca, borda leve, sombra baixa.
- Radius de referência: **14 px** para card principal.
- Padding típico: **22–24 px** em desktop.
- Cards internos devem preferir fundo suave + sem sombra.
- Evitar “caixa dentro de caixa” quando a borda não comunica estrutura.

## 8. Tabelas / listas

- Cabeçalho: **13 px**.
- Célula: **14–14.5 px**.
- Padding de referência: **11–12 px**.
- Não voltar a cabeçalhos de 10–11 px em dados funcionais.
- Números podem usar `tabular-nums`.

## 9. Home

- Título hero: ~**27 px**.
- KPIs: número ~**27 px**; rótulo ~**13 px**.
- Cards devem permitir leitura em 5 segundos.
- Não aumentar decoração; priorizar sinal operacional.

## 10. Pacientes / Prontuário

- Nome no card: **15.5 px**.
- Metadados: **13 px**.
- Nome no resumo do prontuário: **22 px**.
- Texto: **14 px**.
- Ações devem quebrar de linha antes de comprimir a identidade do paciente.

## 11. Agenda

- Nome do paciente: **12.5 px mínimo**, sem retorno ao legado de 9 px.
- Horário: **12 px**.
- Data do dia: **16 px**.
- Dia da semana: **12 px**.
- Célula: **35 px mínimo** atualmente.
- Toolbar: labels **13 px**, campos **14 px**, altura ~**42 px**.
- A Agenda é exceção controlada de densidade. Mesmo assim, o texto operacional deve permanecer legível.
- Nomes longos devem truncar ou ajustar sem deslocar a barra.

## 12. Avaliação — Anamnese

- Título de seção: **22 px**.
- Labels: seguem base global.
- Chips: **13.5 px** no mínimo.
- HMA: área ampla, fonte de campo **15.5 px**.
- Testes/red flags: **14 px+**.
- Disclosure summary: **14.5 px**; texto auxiliar **12.5 px**.
- Deve permanecer rápida e limpa; não aumentar quantidade de campos para “preencher espaço”.

## 13. Avaliação — Regiões e Eixos de exame (BLOCO CRÍTICO)

Este bloco é parte do **freeze mais rígido**, por ter sido explicitamente considerado pequeno no uso real.

- Cabeçalho “Regiões e eixos de exame”: **20 px**.
- Chip de região anatômica: **17 px**, peso ~700, altura mínima **44 px**.
- Nome da região selecionada: **21 px**.
- Label/mode da região: **13 px**.
- Título “Direção / eixos”: **18 px**.
- Título de cada eixo: **18 px**.
- Descrição do eixo: **14.5 px**.
- Botões de eixo: **14–14.5 px**, altura **42 px**.
- Achados sugeridos: título **16.5 px**; item **15 px**.
- Biblioteca de direções: **15 px**; itens **14.5 px**.
- Cards de eixo: padding **16–17 px**, altura mínima ~**112 px**.
- Em largura intermediária, reduzir número de colunas **antes** de reduzir fonte.

**Critério de regressão:** qualquer consolidação que faça regiões, eixos, achados ou condições voltarem visualmente para ~10–13 px deve ser rejeitada.

## 14. Motor Clínico — condições/ferramentas

- Busca: **14.5 px**, altura **44 px**.
- Condição específica: **13.5–16 px** conforme hierarquia.
- Ferramenta aberta deve permanecer ancorada próxima ao item acionado.
- Mensagens devem ser clínicas e objetivas.
- Não reintroduzir parágrafos explicando ao profissional que “o raciocínio é dele”.

## 15. Segurança e Síntese

- Título/estado principal: **14.5–17 px**.
- Texto de decisão: **13 px+**.
- Alertas críticos devem se distinguir de “atenção clínica”.
- Vermelho forte reservado para segurança/erro/destruição, não para contexto genérico.

## 16. Financeiro

- KPI: ~**22 px**.
- Texto principal de linhas/cartões: **13–14.5 px**.
- Metadado: **12–12.5 px**.
- Badge: **11.5 px** apenas quando for realmente terciário.
- Financeiro não deve voltar aos textos legados de 8–10 px.

## 17. Modais, toasts e drawers

- Modal h2: **21 px**.
- Corpo: **14 px**.
- Toast título: **14.5 px**, corpo **13 px**.
- Drawer h2: **21 px**.
- Elevação/sombra pode ser mais forte aqui porque comunica camada sobreposta.

---

# Responsividade congelada

## Desktop amplo
- Sidebar fixa.
- Conteúdo central com largura máxima controlada.
- Agenda pode usar largura maior que o restante do produto.

## Notebook (~1180 px)
- Sidebar pode reduzir para ~226 px.
- Título continua grande (~28 px).
- Grids podem reduzir colunas antes de reduzir fonte.

## Tablet / mobile (<=820 px)
- Sidebar vira overlay/drawer.
- Conteúdo passa a margem zero.
- Inputs usam **16 px** para evitar zoom automático em iOS.
- Tipografia crítica não deve diminuir drasticamente.

## Mobile estreito
- Cards diminuem padding, não a legibilidade.
- Ações podem virar uma coluna.
- Regiões/eixos reorganizam cards antes de reduzir texto.

---

# Componentes/identidade que NÃO devem ser descaracterizados

- Paleta petróleo + teal/verde clínico.
- Sidebar escura fixa no desktop.
- Topbar sticky.
- Contexto de paciente ativo.
- Cards claros e discretos.
- Badges por status na Agenda (sem resolver semântica nesta etapa).
- Estrutura conceitual da Avaliação/Motor Clínico.
- Layout clínico minimalista e profissional.

---

# Dívida técnica congelada como baseline

Contagem na base desta etapa:

| Arquivo | `!important` | `:root` |
|---|---:|---:|
| `KineSys.html` | 581 | 3 |
| `ui_refinement.css` | 19 | 1 |
| `ui_expert.css` | 140 | 1 |
| `clinical_engine_v232.css` | 9 | 0 |
| `ui_typography_comfort.css` | 449 | 1 |
| **Total** | **1198** | **6** |

Esses números **não são meta visual**; são a dívida a ser reduzida nas próximas etapas sem alterar o contrato acima.

---

# Checklist obrigatório de regressão visual

Antes de aprovar qualquer etapa futura:

- [ ] Sidebar mantém leitura confortável e alinhamento.
- [ ] Título de página mantém presença visual.
- [ ] Nome/metadados do paciente ativo não comprimem.
- [ ] Inputs e botões continuam confortáveis.
- [ ] Agenda mantém nome do paciente >= 12.5 px.
- [ ] Financeiro não volta a microtexto.
- [ ] Anamnese permanece limpa e rápida.
- [ ] **Regiões permanecem ~17 px.**
- [ ] **Nome da região permanece ~21 px.**
- [ ] **Eixos permanecem ~18 px.**
- [ ] **Achados permanecem ~15 px.**
- [ ] Safety continua visualmente distinto de atenção clínica.
- [ ] Mobile reorganiza antes de encolher tipografia.
- [ ] Nenhuma funcionalidade é alterada por uma etapa puramente visual.

## Status da Etapa 1

**CONCLUÍDA — Design Freeze registrado.**  
Próxima etapa: **consolidar os sistemas de variáveis/tokens em uma única fonte de verdade**, preservando este contrato visual.
