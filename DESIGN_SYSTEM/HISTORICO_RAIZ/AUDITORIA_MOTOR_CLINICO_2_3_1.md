# KineSys Clinical — Motor Clínico 2.3.1

## Objetivo desta revisão

A versão 2.3.1 é uma revisão de segurança/coerência do Motor 2.3. Não amplia o banco de condições e não tenta criar um novo modelo diagnóstico. O foco foi corrigir pontos de risco encontrados na auditoria crítica do 2.3 sem aumentar o tempo de avaliação.

## Correções implementadas

### 1. Parser de negação com escopo clínico menor

O parser anterior podia interpretar uma negação no início da frase como se ela alcançasse achados afirmados depois.

Exemplos agora tratados corretamente:

- `Sem febre e com falta de ar.` → falta de ar permanece afirmada.
- `Sem trauma, refere dor na panturrilha.` → dor na panturrilha permanece afirmada.
- `Nega febre, mas apresenta dispneia.` → dispneia permanece afirmada.
- `Nega febre, tosse e dispneia.` → a enumeração permanece negada.
- `Nega parestesia, porém apresenta perda de força.` → perda de força permanece afirmada.

A lógica encerra o escopo de negação quando a frase retoma uma afirmação explícita e também limita o alcance da negação a uma janela lexical curta.

### 2. Segurança global e Síntese usam o mesmo estado

A decisão de segurança textual global passa a ser consolidada em um único resumo (`segurancaGlobal`) salvo junto ao mapeamento.

A Síntese não volta a interpretar uma pista global como se fosse uma decisão regional. Isso evita situações em que a conduta já havia sido registrada globalmente, mas aparecia como `pendente` na Síntese de uma região.

### 3. Sem região não significa “seguro por padrão”

Quando nenhuma região anatômica está selecionada, a Síntese consulta o estado global real de segurança.

- pista global pendente → `segurancaRevisada = false`;
- pista global com decisão registrada → a segurança pode ser liberada;
- ausência de pistas → continua sendo necessária a revisão global explícita antes da finalização.

A Síntese continua acessível independentemente disso.

### 4. Alertas resolvidos não competem com pendências

Na Síntese, pistas já revisadas recebem apresentação visual de estado resolvido e exibem a conduta registrada. Apenas pistas realmente pendentes mantêm o destaque de alerta ativo.

### 5. Regiões não são mais selecionadas automaticamente

A HMA e a avaliação anterior passam a gerar apenas sugestões. O Motor 2.3.1 não marca automaticamente caixas de região.

O fluxo passa a ser:

`História/avaliação anterior → regiões sugeridas → escolha do fisioterapeuta`.

A detecção de regiões sugeridas também passou a respeitar negação textual para reduzir sugestões como Cervical quando a HMA diz `nega cervicalgia`.

### 6. Fallback regional corrigido

Quando nenhuma rota alcança o limiar de sugestão, o Motor usa o nome do adaptador regional em vez do rótulo genérico.

Exemplo validado:

`Cefaleia frontal pulsátil` → fallback `Fenótipo de cefaleia`, e não `Exame geral / indefinido`.

### 7. “Exame geral / indefinido” é exclusivo

A rota geral representa ausência de direção específica. Ela não pode coexistir com Neurológica, Mobilidade, Carga etc.

- selecionar `Exame geral` remove rotas específicas;
- selecionar uma rota específica remove `Exame geral`.

### 8. Direção manual sem veto do adaptador regional

Os adaptadores regionais continuam organizando as rotas mais pertinentes, porém o fisioterapeuta pode abrir `Definir direção manualmente` e acessar qualquer rota do navegador.

O adaptador sugere; não proíbe.

## Banco clínico — contagem executada

A contagem foi feita carregando o banco real `mapeamento_clinico.js` + `condicoes_mobilidade_v23.js`:

- Regiões: **11**
- Condições/ferramentas: **123**
- Achados/testes cadastrados: **429**
- IDs únicos: **123**
- Itens com campo explícito de evidência: **18**

A documentação anterior que informava 137/471 estava incorreta e foi corrigida.

## Testes automatizados desta revisão

Foi criado `ARQUIVO_DESENVOLVIMENTO/testes_motor_231/test_motor_231.js`.

Casos validados:

1. pista global sem região bloqueia somente a finalização;
2. Síntese sem região não declara segurança falsamente;
3. decisão global resolve a pista mesmo sem região;
4. Síntese passa a refletir a decisão global;
5. fallback da Cefaleia usa `Fenótipo de cefaleia`;
6. HMA não seleciona região automaticamente.

Também foi executada bateria separada do parser de negação com oito frases adversariais.

## O que ainda NÃO foi feito

A versão 2.3.1 não implementa a arquitetura maior proposta para o futuro Motor 2.4:

- ferramentas tipadas (cluster, medida, deformidade, perfil, safety);
- adaptadores regionais com regras clínicas próprias por região;
- reavaliação iterativa das rotas a partir dos achados do exame;
- remoção completa dos overrides legados do motor antigo;
- expansão sistemática de campos de evidência por condição.

Essas mudanças exigem uma refatoração estrutural maior e devem ser feitas separadamente para não misturar correções de segurança com reconstrução do motor.

## Banco de dados

Nenhuma migration Supabase é necessária para o Motor Clínico 2.3.1.
