# KineSys — Motor Clínico 2.3.2

## Objetivo desta revisão

Correção de integração entre exame específico, Navegador Clínico, Segurança e Síntese.

## Falha principal corrigida

No Motor 2.3.1 uma ferramenta específica podia atingir estado `positivo` (por exemplo, Hálux Valgo com três achados positivos), mas esse estado permanecia restrito ao card da ferramenta. Se o fisioterapeuta não clicasse manualmente em “Usar como hipótese na Síntese”, a Síntese podia terminar sem incorporar o resultado do exame.

No 2.3.2, quando o profissional abre deliberadamente uma ferramenta e registra achados suficientes para que a própria regra operacional resulte em `positivo`, o exame passa a alimentar a direção clínica. A ferramenta é marcada como investigada e a condição passa à Síntese como **Hipótese sustentada pelo exame**. Uma hipótese manual previamente escolhida pelo profissional continua tendo precedência; outras ferramentas positivas aparecem como associadas.

## Correção de posição das ferramentas

O card de testes não é mais anexado ao fim de toda a biblioteca. Ele é inserido imediatamente após a linha da condição aberta. O termo pesquisado é persistido no estado da avaliação, evitando que a lista inteira volte a aparecer a cada resultado informado. Ao abrir uma ferramenta, o viewport é reposicionado apenas até o bloco ativo.

## Motor iterativo

Resultados positivos de ferramentas investigadas passam a participar da comparação de rotas. Exemplo: uma ferramenta de mobilidade/deformidade positiva reforça a rota Mobilidade / articular. A impressão de uma rota ignorada também incorpora o estado do exame; novos achados podem fazer uma rota previamente ignorada voltar a ser elegível para comparação.

## Segurança

### Contexto da decisão
Decisões de Safety Global agora guardam uma impressão digital do contexto clínico. Se a HMA/origem/irradiação/idade/mecanismo forem modificados, uma decisão antiga para o mesmo ID de alerta não é aceita silenciosamente como revisão atual.

### Negação factual
O scanner foi refeito para verificar negação no termo clínico relevante, em vez do início de uma regex composta. Casos adversariais testados:

- `Sem febre e com falta de ar.` → detecta cardiorrespiratório, não infecção.
- `Cefaleia, nega visão dupla.` → não gera alerta neurológico por visão dupla.
- `Cefaleia sem febre.` → não gera alerta sistêmico por febre.
- `Dor no ombro ao esforço, nega dispneia e náusea.` → não gera alerta cardíaco apenas pelos termos negados.
- `Dor na panturrilha após corrida, sem edema.` → não gera alerta vascular isolado.
- `Dor na panturrilha com edema unilateral após cirurgia recente.` → gera alerta vascular.

### Gates derivados de ferramentas
Ferramentas específicas só podem criar gate regional automático quando possuem regra/limiar clínico explícito. Ferramentas que dependem apenas da regra genérica de dois positivos não podem bloquear finalização como Safety Gate.

## Integridade histórica dos achados

O 2.3.2 introduz chaves estáveis para achados e red flags. O estado anterior baseado em índice é migrado na primeira leitura:

- legado: `diferencial::hallux_valgus::0`
- estável: `finding::diferencial::hallux_valgus::<slug>_<hash>`

A versão 2 do esquema de resultados prioriza a chave estável. Os índices antigos continuam sendo gravados temporariamente apenas por compatibilidade, mas deixam de ser a fonte principal. Isso reduz o risco de um achado histórico mudar de significado após reordenação futura dos arrays.

## Síntese

Estados agora são diferenciados:

- positivo → hipótese sustentada/compatível;
- negativo → achados não sustentam a ferramenta;
- inconclusivo → resultado inconclusivo;
- pendente → dados insuficientes.

## Testes executados

- Hálux Valgo com três achados positivos → status positivo.
- Hálux Valgo positivo → direção automática `hipotese`, origem `exame_positivo`.
- Síntese → contém `Hipótese sustentada pelo exame: Hálux Valgo`.
- Casos adversariais de negação/safety descritos acima.
- `node --check` no motor e nos JavaScripts de runtime.
- validação de IDs HTML, referências locais e integridade do ZIP.

## Observação arquitetural

O 2.3.2 é uma versão de integridade. O Motor 2.4 ainda deve tipar ferramentas (cluster, medida, deformidade, déficit funcional, safety) para deixar de aplicar uma estrutura uniforme a condições clinicamente diferentes.
