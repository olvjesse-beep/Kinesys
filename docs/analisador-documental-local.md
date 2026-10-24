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

A análise fica em `laudo.semantica.analiseDocumental`, no JSON já existente, com a entrada, unidades, roteiro e relações. A fonte da HMA permanece literal. A revisão semântica passou a 3; a versão documental 22 e seu cabeçalho/seções foram preservados. Texto profissional ou revisado de versões anteriores nunca é regenerado automaticamente: atualizar a base continua exigindo confirmação. Avaliação nova não herda o relatório ou sua análise de outra pessoa.

Não há migração, alteração de Supabase, nova tabela, gravação em prontuários reais ou alteração da interface nesta entrega. O fluxo de salvamento, cópia e PDF continua usando o mesmo texto final e metadados existentes.

## Evidência e limites

O tratamento de escopo segue a abordagem geral de [ConText, Harkema et al., 2009](https://pmc.ncbi.nlm.nih.gov/articles/PMC2757457/). Esta é uma implementação própria em português, não uma reprodução validada ou certificada desse algoritmo. As regras e os testes sintéticos não equivalem a validação clínica profissional.

`clinical_document_analyzer.test.cjs` exercita o fluxo real, gramáticas, estados protegidos, dose, lateralidade, tempo, perda de sentido, dados desconhecidos, duplicatas com origem, entrada completa, reabertura do JSON e proteção de texto manual. As suítes de significado, exames, múltiplas queixas, isolamento de pacientes e Agenda permanecem obrigatórias.
