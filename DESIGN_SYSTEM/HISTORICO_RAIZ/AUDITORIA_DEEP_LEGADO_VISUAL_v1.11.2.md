# KineSys Clinical v1.11.2 — Auditoria Deep de Legado Visual

## Objetivo

Esta revisão foi executada sobre a versão **AUDITORIA ESTÉTICA EXPERT** com um critério conservador: remover somente componentes, renderizadores e regras de apresentação herdados das primeiras versões que possuem evidência técnica de que **não participam mais da interface atual**.

Não foi realizada uma “faxina por nome de classe”. Antes de retirar um componente foi verificado se ele:

1. existe no HTML atual;
2. é criado dinamicamente pelo JavaScript;
3. é usado como estado oculto de modal, dropdown, accordion ou fluxo condicional;
4. é referenciado por lógica clínica, financeira, autenticação ou persistência;
5. foi substituído por um componente moderno atualmente visível.

Classes dinâmicas — por exemplo badges de status gerados em runtime — foram preservadas mesmo quando uma busca estática simples poderia classificá-las incorretamente como não utilizadas.

---

## Resumo do que foi encontrado

O principal custo legado não estava em uma única folha CSS. Havia componentes antigos ainda mantidos no DOM ou atualizados pelo JavaScript mesmo depois de terem sido visualmente substituídos.

### 1. Pacientes — renderização dupla invisível

A tela moderna usa cards de prontuário, porém o fluxo antigo ainda renderizava uma tabela completa escondida. A cada busca/atualização, o sistema fazia trabalho para duas interfaces e apenas uma era mostrada.

**Correção:**
- tabela antiga retirada do HTML;
- `renderizarTabelaProntuarios()` transformado em delegador leve para o renderizador moderno;
- busca de pacientes passa diretamente ao renderer atual.

**Ganho:** menos DOM, menos construção de HTML e uma única fonte de verdade visual para pacientes.

### 2. Agenda — abas antigas escondidas mas ainda atualizadas

Cinco abas da Agenda antiga continuavam no DOM. A interface moderna usa o controle segmentado novo, porém o JavaScript ainda mudava classes `active` nas abas antigas.

**Correção:**
- bloco `.agenda-abas/.agenda-aba` removido;
- `irParaSubtelaAgenda()` passa a atualizar somente `#ks_agenda_controls`.

### 3. Home — oito atalhos antigos ocultos

A Home moderna já substituiu os atalhos iniciais, mas oito `.action-card` antigos continuavam carregados e recebendo atualizações de permissão.

**Correção:**
- cards legados removidos do HTML;
- lógica de permissão que os atualizava foi retirada;
- Home passa a manipular apenas a estrutura atual.

### 4. Agenda — estatísticas invisíveis ainda calculadas

O bloco `.agenda-resumo-compacto` estava permanentemente oculto no design atual. Mesmo assim, o sistema calculava os valores e, em determinadas semanas, podia fazer uma consulta adicional ao Supabase apenas para atualizar números não exibidos.

**Correção:**
- bloco invisível removido;
- função `atualizarEstatisticasAgenda()` retirada;
- chamada associada removida.

**Ganho:** elimina processamento e uma possível consulta de rede que não produz saída visível.

### 5. Agenda — indicador “+ agendar” criado em cada célula livre e nunca mostrado

Cada slot livre recebia um `<span class="agenda-livre-indicador">+ agendar</span>`, mas o design atual suprimia permanentemente esse elemento.

**Correção:** a criação desse nó foi removida. A célula continua clicável e funcional.

### 6. Evolução — emoji de EVA invisível ainda atualizado

O emoji visual de EVA já estava oculto, porém continuava sendo criado/atualizado.

**Correção:** nós e atualizações do emoji foram removidos. Valor numérico e semântica de cor foram preservados.

### 7. Renderizadores clínicos v1.9 sem chamadas

Foram encontrados três renderizadores declarados como legado e sem qualquer chamada no runtime atual:

- `renderizarMapeamentoRegioes_legacy_v19`
- `construirCardRegiao_legacy_v19`
- `construirCardTestes_legacy_v19`

**Correção:** removidos. A lógica clínica ativa e os renderizadores atuais foram preservados.

### 8. CSS morto e CSS completamente sombreado

Foram removidos seletores de interfaces antigas sem representação no runtime atual, incluindo famílias relacionadas a:

- antiga visualização diária da Agenda (`agenda-stats`, `stat-card`, `agenda-dia-nav`, `slot-agenda`, legenda antiga);
- componentes clínicos de protótipos (`clinical-subcard`, `yellow-flag-summary`, `source-badge`, `exposure-grid`, `radar-vazio`, `clinical-toolbar`);
- labels/ajudas de versões antigas (`ks-role-help`, `ks-section-label`, `logo-placeholder`);
- regras de componentes HTML já retirados nesta limpeza;
- regras anteriores cujo mesmo seletor/contexto/propriedades são integralmente substituídos pela camada `ui_expert.css` carregada por último.

A limpeza de regras sobrescritas foi feita apenas em casos de sobreposição exata/provável, evitando remover fallbacks ou estados responsivos diferentes.

---

## Componentes deliberadamente preservados

Nem tudo que fica oculto em algum momento é legado. Foram mantidos:

- modais, dropdowns, accordions e painéis que alternam entre `display:none` e visível;
- seletores de paciente usados em fluxos condicionais;
- classes dinâmicas de status da Agenda e badges criados por JavaScript;
- componentes com nome `legacy` que ainda são acessíveis e funcionais ao usuário, como visualizações históricas explicitamente acionáveis;
- compatibilidade de dados, autenticação, banco local e fallbacks de persistência;
- toda lógica clínica, financeira, relatórios, Supabase e migrations;
- `ui_refinement.css`, pois ainda contém regras não cobertas pela camada Expert;
- `ui_expert.css` como autoridade visual final.

Esta revisão é uma limpeza de **apresentação/runtime visual**, não uma reescrita da arquitetura funcional.

---

## Comparação objetiva — antes × depois

Medições feitas com o mesmo parser sobre a versão Expert imediatamente anterior e esta versão:

| Métrica | Antes | Depois | Variação |
|---|---:|---:|---:|
| `KineSys.html` | 352.855 B | 335.012 B | **-17.843 B (-5,06%)** |
| CSS carregado (inline + arquivos) | 247.074 B | 227.870 B | **-19.204 B (-7,77%)** |
| Regras CSS qualificadas | 1.352 | 1.165 | **-187 (-13,83%)** |
| Elementos DOM iniciais | 1.995 | 1.913 | **-82 (-4,11%)** |
| Atributos `style` inline | 135 | 130 | **-5** |
| JavaScript de runtime | 1.266.114 B | 1.251.453 B | **-14.661 B (-1,16%)** |
| Pacientes: tabela invisível antiga | 1 | 0 | removida |
| Agenda: abas invisíveis antigas | 5 | 0 | removidas |
| Home: action cards antigos | 8 | 0 | removidos |
| Agenda: bloco de estatística invisível | 1 | 0 | removido |

O conjunto físico de arquivos de runtime ficou aproximadamente **40 KB menor (-1,82%)**. O ganho mais relevante, porém, não é o tamanho do ZIP: é a retirada de trabalho em runtime — renderização duplicada, atualização de componentes invisíveis, criação de nós que nunca aparecem e uma consulta de Agenda que podia ser feita sem qualquer benefício visível.

---

## Validação pós-limpeza

- JavaScript de todos os módulos raiz e `database/`: **sem erro de sintaxe (`node --check`)**.
- IDs duplicados no HTML: **0**.
- Referências locais quebradas em `script`, `link` e `img`: **0**.
- Erros de parsing CSS: **0**.
- Referências de runtime aos componentes removidos: **0**.
- Hooks modernos `renderProntuarioCardsKineSys` e `ks_agenda_controls`: **preservados**.

### Limite da validação

A auditoria comprova consistência estrutural e estática do pacote. O Chromium headless deste ambiente não concluiu o carregamento completo do aplicativo local dentro do tempo limite, portanto esta revisão não declara um teste visual automatizado integral de todos os fluxos após a poda. O teste final no Chrome real da clínica continua recomendado antes de substituir a versão de produção.

---

## Conclusão técnica

A versão anterior já tinha uma estética moderna, mas ainda carregava uma pequena “segunda interface fóssil” por baixo dela. Esta revisão removeu os componentes cuja substituição pôde ser demonstrada, sem aplicar uma exclusão agressiva por heurística.

O KineSys agora possui menos camadas concorrentes, menos DOM invisível e menos trabalho silencioso. A próxima etapa de redução de legado, se desejada, deve ser arquitetural e feita módulo por módulo com testes funcionais — especialmente autenticação, fallbacks locais e código de compatibilidade — e não deve ser misturada com limpeza visual.
