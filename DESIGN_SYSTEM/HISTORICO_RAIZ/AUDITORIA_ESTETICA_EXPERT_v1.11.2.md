# Auditoria estética Expert / Devil / Critic — KineSys v1.11.2

## Escopo
Revisão de tipografia, hierarquia, espaçamento, densidade, alinhamento, menus, caixas, botões, estados vazios, responsividade, coerência textual e organização da cascata CSS. Nenhuma regra clínica, financeira, de permissões ou persistência foi alterada nesta etapa.

## Diagnóstico técnico
A interface já possuía uma identidade forte: azul-petróleo, verde cirúrgico, superfícies claras, navegação lateral e linguagem clínica. O problema passou a ser **entropia visual de legado**, não falta de design.

Antes da camada Expert, o HTML/CSS acumulado continha aproximadamente:
- 9 blocos `<style>` no HTML;
- 570 declarações de `font-size`;
- 157 declarações de fonte com 10 px ou menos;
- 269 declarações com 11 px ou menos;
- 35 tamanhos de fonte distintos;
- 18 raios de borda distintos;
- 65 sombras distintas;
- 135 atributos `style="..."` inline;
- 630 usos de `!important` considerando as camadas legadas;
- centenas de cores hexadecimais declaradas ao longo das versões.

Esses números não significam que todos os estilos apareçam simultaneamente. Eles revelam que várias gerações de interface coexistem no mesmo arquivo e podem disputar a cascata.

## Falha mais importante encontrada
A camada `ui_refinement.css` era carregada no `<head>`, mas ainda existiam blocos `<style>` dentro do `<body>` mais abaixo. Portanto, estilos antigos podiam ser declarados **depois** da camada de refinamento e recuperar prioridade por ordem de cascata.

### Correção
Foi criada `ui_expert.css`, carregada **depois de todos os estilos inline legados e antes dos scripts**. Ela passa a ser a autoridade visual final do KineSys.

## Correções aplicadas

### 1. Tipografia
- Adoção explícita de `Segoe UI Variable` / sistema operacional, sem depender de fonte web externa.
- Suavização e kerning para melhor leitura em Windows e iOS.
- Escala final reduzida para 17 tamanhos discretos na camada Expert, em vez de dezenas de frações concorrentes.
- Labels, metadados, tabelas, Agenda e Financeiro deixam de depender de microtexto recorrente.
- Pesos muito agressivos foram reduzidos visualmente para 600–720 nos componentes principais.

### 2. Hierarquia de página
- O kicker “KINESYS” da topbar deixa de repetir a marca no desktop; permanece disponível no mobile, onde a sidebar não está visível.
- Título de página recebe prioridade clara; subtítulo passa a ser contextual e curto.
- Configurações passa a ter título/subtítulo corretos na topbar.
- “Fotos e documentos” no menu foi simplificado para “Documentos”, coerente com a tela.

### 3. Redundância visual
- Financeiro não repete “Planos e pagamentos” como um segundo grande hero abaixo do título da página.
- Configurações não repete seu próprio título em um segundo hero sem função.
- Prontuários usa “Pacientes cadastrados” em vez de “Prontuários e Avaliações Salvas”, reduzindo texto e redundância.
- Equipe passa de “Equipe cadastrada” para “Usuários e acessos”, descrevendo melhor a função da tela.

### 4. Cards e superfícies
- Cards principais usam uma única linguagem de borda, raio e sombra discreta.
- Cards aninhados perdem sombra adicional; caixas dentro de caixas deixam de parecer camadas independentes.
- Estados vazios usam a mesma superfície e borda tracejada.
- A interface fica mais “produto clínico” e menos “painel de templates”.

### 5. Contexto do paciente
- Barra do paciente ativo ficou mais baixa e funcional.
- Nome ganhou prioridade, metadados ficaram secundários.
- Abas viraram um grupo visual leve, sem competir com o título da página.
- Botões de trocar/fechar paciente mantêm alvo confortável sem inflar a barra.

### 6. Avaliação fisioterapêutica
Foi o principal alvo desta rodada.
- Largura máxima reduzida para favorecer leitura e reduzir varredura ocular.
- Stepper mais compacto.
- Card principal e card de contexto passam a usar borda sem sombra pesada.
- Dados de nome/idade/profissão/atividade física ficam em uma faixa visual secundária, em vez de parecer outro formulário principal.
- Termômetro da dor permanece destacado, mas menos volumoso.
- Chips de fatores de piora ficam menores e mais consistentes.
- Blocos `<details>` ganham menor densidade e maior separação sem criar novas caixas.
- Áreas avançadas da Síntese continuam em progressive disclosure.
- PROMs e barras regionais foram compactados sem reduzir legibilidade.
- Bloco final de navegação/salvamento fica visualmente secundário, deixando “Finalizar e salvar avaliação” como ação dominante.

### 7. Evolução
- Formulário principal com largura de leitura mais controlada.
- Histórico passa a parecer conteúdo secundário e não competir com o registro atual.
- Textos de edição padronizados para “Registrar evolução” e “Salvar alterações”, sem emoji prototípico.

### 8. Agenda
- Mantida alta densidade operacional.
- Redução de bordas/sombras desnecessárias.
- Textos de paciente e cabeçalhos permanecem compactos, porém legíveis.
- Toolbar semanal ganha espaçamento mais previsível.
- Menu de configuração recebe elevação apenas quando aberto.

### 9. Financeiro
- Remoção do hero duplicado.
- KPIs e planos ficam mais escaneáveis.
- Microtextos críticos foram elevados.
- Ações de plano permanecem compactas, mas com alvo e contraste suficientes.
- O módulo continua denso por natureza, sem parecer uma planilha comprimida.

### 10. Prontuário ativo
- Botões continuam em linha própria e não podem comprimir o nome do paciente.
- “Excluir cadastro” perde aparência de ação primária e fica visualmente separado à direita; no mobile ocupa linha própria.
- Isso reduz risco de clique acidental e melhora hierarquia de risco.

### 11. Equipe e Configurações
- Drawer de usuário com sombra lateral mais natural e cabeçalho mais compacto.
- “Usuários e acessos” descreve melhor o módulo.
- Editor de mensagens usa cartões mais planos e preview com hierarquia consistente.

### 12. Responsividade
- Desktop: sidebar reduzida de 244 para 232 px, liberando espaço de conteúdo.
- Notebook: sidebar cai para 214 px.
- Tablet/mobile: topbar e contexto reduzem altura, mantendo o título da página.
- Inputs usam 16 px em telas pequenas para evitar zoom automático no iOS.
- Ações passam para grid de 1 coluna quando necessário.
- Ações do prontuário usam 2 colunas no mobile médio e 1 coluna no mobile estreito.
- Respeito a `prefers-reduced-motion` adicionado.

## Coerência textual
Foram ajustadas expressões de interface sem alterar significado funcional:
- “Fotos e documentos” → “Documentos” no menu;
- “Prontuários e Avaliações Salvas” → “Pacientes cadastrados”;
- “Equipe cadastrada” → “Usuários e acessos”;
- “Entrar no Sistema” → “Entrar no KineSys”;
- “Novo Agendamento” → “Novo agendamento”;
- “Registrar Evolução ➔” → “Registrar evolução”.

## Validação técnica
- `node --check` passou em todos os JavaScripts de runtime e bancos locais JS.
- HTML com **0 IDs duplicados**.
- Todas as referências locais de script/CSS apontam para arquivos existentes.
- `ui_expert.css` analisado com `tinycss2`: **0 erros de parsing**.
- Chaves CSS balanceadas.
- A folha Expert é carregada depois dos últimos `<style>` legados.
- A camada Expert não altera funções de negócio; os diffs em JS são somente texto/rotulagem e metadados de tela.

### Sobre a suíte histórica de testes
Os testes foram mantidos em `ARQUIVO_DESENVOLVIMENTO/testes/` e seus caminhos foram atualizados para a nova organização do ZIP. A suíte histórica contém testes de versões antigas cujas expectativas já divergem de decisões funcionais posteriores do projeto; por isso ela não é usada como certificado da estética desta rodada. As validações de sintaxe, referências, estrutura HTML e CSS foram executadas diretamente sobre o runtime atual.

## Direção visual resultante
O KineSys mantém sua essência:
- azul-petróleo;
- verde clínico;
- interface clara;
- sidebar fixa;
- linguagem profissional;
- foco em prontuário, avaliação, agenda e financeiro.

A diferença é que agora há uma regra visual clara: **menos componentes competindo por atenção, menos elevação, menos repetição, melhor tipografia e prioridade explícita para a ação que o usuário precisa executar naquele momento.**
