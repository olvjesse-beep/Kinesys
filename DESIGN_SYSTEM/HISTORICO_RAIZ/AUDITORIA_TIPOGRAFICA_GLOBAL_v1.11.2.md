# Auditoria tipográfica global — KineSys v1.11.2

## Veredito /critic /devil /expert

A reclamação de fadiga visual procede. O problema não era subjetivo nem restrito a uma tela: a escala tipográfica do pacote 2.3.2 ainda estava orientada a **densidade**, não a **uso prolongado**.

Na auditoria estática dos arquivos efetivamente carregados (`KineSys.html`, `ui_refinement.css`, `ui_expert.css` e `clinical_engine_v232.css`) foram encontradas **638 declarações explícitas de `font-size` em pixels**. Destas, **432 (67,7%) estavam em 12 px ou menos**.

Distribuição crítica:

| Arquivo | Declarações | <= 10 px | <= 11 px | <= 12 px | Mediana |
|---|---:|---:|---:|---:|---:|
| KineSys.html | 451 | 136 | 227 | 306 | 11 px |
| ui_refinement.css | 32 | 5 | 11 | 21 | 12 px |
| ui_expert.css | 106 | 18 | 44 | 65 | 12 px |
| clinical_engine_v232.css | 49 | 7 | 25 | 40 | 11 px |

Isso explica por que o sistema ainda parecia pequeno apesar das rodadas anteriores. A camada Expert melhorou hierarquia e estética, mas continuou usando **14 px como corpo-base** e preservou vários microtextos em **8–12 px** para manter densidade.

## Pontos mais cansativos encontrados

- Corpo geral: **14 px**.
- Sidebar: subtítulos e seções em **9–11 px**; navegação em **13 px**.
- Agenda: horários em **10 px**, nomes de pacientes em **11 px**, dias da semana em **10 px**.
- Financeiro: várias métricas, badges, cabeçalhos e detalhes em **8–11 px**.
- Motor Clínico: rotas, achados, biblioteca, Safety e textos auxiliares frequentemente em **9–12 px**.
- Pacientes/Prontuário: metadados e ações entre **10–12 px**.
- Tabelas: cabeçalhos em **11 px** e células em **12 px**.

Para uma aplicação clínica usada por horas, isso cria necessidade de aproximação visual, piora a leitura periférica e torna a interface cansativa mesmo quando o contraste é adequado.

## Correção aplicada: Tipografia Conforto

Foi criada uma camada final `ui_typography_comfort.css`, carregada **depois de todos os CSS atuais**, para que estilos legados e conteúdo dinâmico não voltem a reduzir a leitura.

Escala principal:

| Elemento | Antes típico | Novo alvo |
|---|---:|---:|
| Corpo do sistema | 14 px | **16 px** |
| Parágrafos/listas | 12–14 px | **15 px** |
| Labels | 11–12 px | **13,5 px** |
| Campos | 12–14 px | **15,5 px** |
| Botões principais | 11–12 px | **14 px** |
| Texto auxiliar | 9–12 px | **12,5 px** |
| Tabelas | 11–12 px | **13–14,5 px** |
| Título da página | 27 px | **31 px** |
| Navegação sidebar | 13 px | **14,5 px** |
| Home/KPIs | 11–22 px | **13–27 px** |
| Agenda — paciente | 11 px | **12,5 px** |
| Agenda — hora | 10 px | **12 px** |
| Motor Clínico — rotas/achados | 9–12 px | **12,5–17 px** |

## Ajustes de layout necessários para suportar a fonte maior

Aumentar fonte sem ajustar geometria causaria quebra de linha e recortes. Por isso também foram ajustados:

- sidebar de 232 px para **244 px** em desktop;
- altura mínima dos itens do menu para **44 px**;
- topbar para **90 px**;
- posição da barra de paciente ativo para acompanhar o novo topbar;
- campos para **45 px** de altura mínima;
- botões principais para **42 px**;
- células da Agenda para **35 px**;
- resumo e controles da Agenda para acomodar textos maiores;
- espaçamento das ferramentas do Motor Clínico;
- textos do Financeiro sem microtipografia de 8–10 px.

Checkboxes, radios, sliders e inputs ocultos foram explicitamente excluídos do aumento de altura para evitar regressão funcional.

## Critério estético

A mudança não busca transformar o KineSys em uma interface “gigante”. A hierarquia permanece: títulos maiores, corpo confortável, metadados menores — mas o menor texto operacional deixou de ser microscópico.

A prioridade agora é **legibilidade em uso prolongado**, mesmo que isso reduza um pouco a quantidade de informação que cabe simultaneamente na tela.

## Validação técnica

- `ui_typography_comfort.css`: parseado sem erro por `tinycss2`.
- CSS: chaves balanceadas.
- `ui_typography_comfort.css` confirmado como **último stylesheet carregado**.
- Todos os JavaScripts de runtime passaram em `node --check`.
- IDs HTML duplicados: **0**.
- Referências locais ausentes: **0**.
- Sem alteração em lógica clínica, Supabase ou banco de dados.

## Limitação da auditoria

O ambiente automatizado continua bloqueando a renderização local completa do KineSys em Chromium (`file://`/`localhost`). Por isso a correção foi validada estruturalmente e pela cascata CSS, mas não foi apresentada como um teste visual pixel-a-pixel pós-alteração em navegador real.

A validação final recomendada é abrir o ZIP no mesmo monitor usado na clínica e testar principalmente: Home, Agenda, Avaliação, Financeiro e Pacientes.
