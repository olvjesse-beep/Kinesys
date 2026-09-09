# KineSys — Auditoria Design System Etapa 12

## Objetivo
Remover estilos inline puramente visuais do runtime do KineSys sem alterar lógica clínica, regras de negócio, persistência, Supabase, permissões ou comportamento calculado.

## Resultado
- HTML principal: 129 atributos `style` na Etapa 11 -> 31 na Etapa 12.
- Os 31 restantes contêm somente `display:none`, usado como estado inicial de visibilidade.
- Propriedades visuais estáticas inline no HTML principal: 0.
- `script.js`: 56 trechos `style="..."` -> 0.
- `script.js`: 18 `style.cssText` -> 0.
- `script.js`: atribuições visuais diretas (cor/background/border/padding/margens/hover) removidas; permanecem 81 alterações de `display` e 1 `maxHeight` calculado em runtime.
- `home_detalhes.js`: 4 estilos inline gerados -> 0.
- `clinical_engine_v232.js`: estilos visuais inline -> 0; permanecem apenas 2 alterações de `display`.
- `balanco_financeiro_admin.js`: o trecho visual inline estático encontrado foi migrado para utilitários.

## Nova camada oficial
Foi criado `design_utilities.css`, carregado depois dos módulos. Ele contém utilitários explícitos de espaçamento, tipografia, alinhamento, superfícies e estados semânticos que substituem valores antes gravados no DOM.

A especificidade dos utilitários foi deliberadamente elevada sem `!important` para reproduzir a prioridade que o antigo atributo `style` possuía. Isso evita regressões sem voltar à estratégia de prioridade forçada.

## Estados dinâmicos convertidos para classes
Foram migrados para classes/modificadores:
- feedback de login (erro/sucesso/aviso/info);
- cores do termômetro EVA;
- hover dos autocompletes;
- alertas clínicos crítico/médio;
- borda do card de alertas;
- pendências por gravidade;
- status do Gemini;
- ícones de documentos;
- linhas de mapa/rota;
- margens e espaçamentos estáticos criados dinamicamente.

## Inline mantido propositalmente
Permanecem apenas estilos ligados a estado ou geometria calculada, como:
- `display` controlado por JavaScript;
- `max-height` calculado conforme a altura disponível da janela;
- `grid-row` / `grid-column` calculados da Agenda;
- larguras/alturas percentuais de gráficos e barras;
- estilos de documentos independentes/exportações que não herdam o Design System do app.

Esses casos não são CSS visual esquecido: são dados de runtime.

## `!important`
A contagem ativa permanece em 789.

Foi testada a remoção dos 152 `!important` de `design_typography.css`, mas a cascata mudou em centenas de elementos devido a conflitos CSS x CSS ainda existentes no HTML legado. A tentativa foi rejeitada. Portanto, a Etapa 12 não reduz a métrica artificialmente e preserva a aparência aprovada.

## Equivalência de cascata
Etapa 11 x Etapa 12 foi comparada com `body.ks-design-ready` nos cenários:
- Login 1440 px
- Home 1440 px
- Avaliação 1440 px
- Avaliação 620 px
- Pacientes 1120 px
- Financeiro 620 px
- Mídias 520 px
- Configurações 430 px

Resultado: 0 diferenças semânticas. A única diferença textual detectada é `grid-column:1/-1` x `grid-column:1 / -1`, valores CSS equivalentes.

## JavaScript
82 arquivos `.js` foram comparados com a Etapa 11:
- 78 byte a byte idênticos;
- 4 alterados somente para migração visual: `script.js`, `clinical_engine_v232.js`, `home_detalhes.js`, `balanco_financeiro_admin.js`.

## Validações
- 22/22 scripts locais carregados pelo HTML: `node --check` OK.
- 9/9 CSS externos carregados: parse OK.
- IDs: 500, duplicados: 0.
- Referências locais: 31/31 presentes.
- Tokens `--kds-*`: 79 usados / 79 definidos; indefinidos: 0.
- HTML principal: 0 propriedades visuais estáticas inline.
