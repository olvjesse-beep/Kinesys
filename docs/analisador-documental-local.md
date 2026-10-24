# Analisador documental local do relatório

## Escopo

O relatório é composto no navegador, sem modelo generativo, credencial, chamada a serviço de IA ou envio de dados clínicos para análise externa. O módulo `clinical_document_analyzer-1.0.0.js` organiza a entrada completa antes da composição e realiza estruturas linguísticas suportadas por gramáticas explícitas. O grafo clínico existente preserva escopo de negação, sujeito, tempo, localização, lado, certeza e evidências. As regras diagnósticas, critérios e limiares não foram alterados.

Não é uma IA geral nem interpretação ilimitada de português livre. Dados originais continuam necessários. Não existe garantia de texto automaticamente correto para qualquer relato. Um termo desconhecido, referência ambígua ou realização que falhe na validação é preservado e/ou sinalizado para revisão, nunca completado por uma história plausível.

## Fluxo

1. **Inventário tipado antes da redação:** HMA, campos clínicos dos sete grupos, estados informado/nega/não informado, medicamentos individuais, procedimentos, resultados de testes, registros de exame livre, medidas, objetivos, restrições e hipóteses registradas. CPF/telefone não entram nesse inventário narrativo. Cada entrada retém campo, valor e recortes de origem.
2. **Decomposição:** frases e proposições com origem e escopo. Um sintoma familiar não vira achado do paciente; cirurgia indicada não vira realizada; ausência de resultado não vira teste negativo.
3. **Planejamento:** assuntos e problemas clínicos, relação com os testes explicitamente vinculados, dados pendentes e cobertura documental. Destino de irradiação não cria queixa independente. Nenhum novo diagnóstico é inventado pelo redator.
4. **Realização:** gramáticas com slots explícitos transformam construções como “a paciente informa que está com dormência na mão esquerda” em “Relata dormência na mão esquerda”. Frases nominais reduzem a repetição de verbos de relato depois da abertura atribuída. Só ocorre se a validação conservar significado. Prefixos burocráticos do próprio formulário são substituídos por rótulos clínicos breves.
5. **Deduplicação:** conteúdo completo equivalente é apresentado uma vez, com todas as origens no JSON. Lado, momento, negação, incerteza, dose ou informação adicional impedem tratar o registro como uma duplicata. Associações por palavras parecidas não bastam.
6. **Auditoria:** correspondência entre unidades e roteiro; cobertura de fontes; significado contra proposições; detecção de causalidade nova, números sem origem, ambiguidades e fatos sem exame. Falha de realização preserva a frase original. O relatório indica revisão pendente, sem esconder os dados.

Os termos clínicos e valores registrados necessariamente reaparecem no documento: “não copiar” significa não colar integralmente as notas sem organização, não substituir dados reais por conteúdo inventado. Exames de imagem, testes digitados e informações sem gramática segura conservam seu teor documental. O módulo não escolhe um medicamento a partir de sintoma nem corrige automaticamente siglas laboratoriais ambíguas.

## Persistência e compatibilidade

A análise fica em `laudo.semantica.analiseDocumental`, no JSON já existente, com a entrada, unidades, roteiro e relações. A fonte da HMA permanece literal. A revisão semântica atual é 5, com a camada de [linguagem contextual](linguagem-clinica-contextual.md); a versão documental 22 e seu cabeçalho/seções foram preservados. Texto profissional ou revisado de versões anteriores nunca é regenerado automaticamente: atualizar a base continua exigindo confirmação. Avaliação nova não herda o relatório ou sua análise de outra pessoa.

Não há migração, alteração de Supabase, nova tabela ou gravação em prontuários reais. O painel de conferência documental foi adicionado exclusivamente antes do editor do relatório. O fluxo de salvamento, cópia e PDF continua usando o mesmo texto final e metadados existentes.

## Seis aprimoramentos da revisão 4

1. `problemasClinicos`: queixas independentes por região/segmento e lado, com episódios, duração, momentos, modificadores e repercussões rastreáveis. Não distribuir um fator de piora sem localização entre todas as queixas. Destino de irradiação, familiar, negativa e local cirúrgico não criam nova queixa.
2. `matrizEvidencias`: critérios positivos/negativos/inconclusivos do vínculo já registrado, hipótese por hipótese. O texto da HMA é contexto, não evidência confirmatória por mera presença de uma região. Preserva divergências e combinação de critérios existente, sem inventar um escore.
3. Troca de sujeito explícito inicia escopo próprio em orações independentes, inclusive sem ponto. Negativas dependentes e fala entre aspas não usam essa divisão. Preserva hipótese relatada, antecedente e indicação cirúrgica. Gramática de negativa simples só é aceita após validação.
4. `perguntas`: localização/lado pendente, referência, expressão incompleta, modificador sem queixa, divergência e vínculo de exame. Cada pergunta mostra a fonte e leva à HMA ou ao exame para que o profissional responda no local original. Não escreve na avaliação, não escolhe uma resposta e não afirma que toda ambiguidade do português é detectável.
5. História organizada por localização/lado/episódio quando cada fato tem vínculo inequívoco. Conteúdo sem vínculo seguro e dependências temporais mantêm fonte e ordem. Cabeçalho, seções úteis, exame/interpretação regional e conclusão profissional continuam preservados; perguntas e contagens não entram no relatório.
6. `validacao.indicadores`: contagens de proposições, omissões, introduções, causalidade nova, repetição literal e verbos de relato. Não há nota ou probabilidade de acerto clínico. O corpus sintético verifica alterações de significado, múltiplas queixas, família, tempo, sintomas, doses, revisão e reabertura. `semantic_six_improvements.test.cjs` e `evaluation_document_review.test.cjs` complementam todas as barreiras anteriores.

A separação entre problemas, achados, fontes e síntese é compatível conceitualmente com o [escopo do FHIR ClinicalImpression](https://hl7.org/fhir/clinicalimpression.html), mas não constitui exportação FHIR, certificação ou validação diagnóstica.

## Evidência e limites

O tratamento de escopo segue a abordagem geral de [ConText, Harkema et al., 2009](https://pmc.ncbi.nlm.nih.gov/articles/PMC2757457/). Esta é uma implementação própria em português, não uma reprodução validada ou certificada desse algoritmo. As regras e os testes sintéticos não equivalem a validação clínica profissional.

`clinical_document_analyzer.test.cjs` exercita o fluxo real, gramáticas, estados protegidos, dose, lateralidade, tempo, perda de sentido, dados desconhecidos, duplicatas com origem, entrada completa, reabertura do JSON e proteção de texto manual. As suítes de significado, exames, múltiplas queixas, isolamento de pacientes e Agenda permanecem obrigatórias.
