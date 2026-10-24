# Linguagem clínica local — prioridades 1, 2 e 4

## Escopo e arquitetura

`clinical_language_rules-1.0.0.js` é carregado antes do grafo semântico. Implementa tokenização com offsets UTF-16 da origem, expressões compostas, gramática superficial finita de orações e resolução documental conservadora de referências. Não usa rede, serviço de IA, modelo treinado, novo pacote ou armazenamento de contexto de paciente entre chamadas. Referência metodológica: [regras sobre tokens e expressões](https://spacy.io/usage/rule-based-matching); esta implementação é JavaScript próprio, não utiliza o pipeline estatístico do spaCy.

1. **Estrutura:** quadros de sujeito, estado/certeza, predicado explícito, sintoma, localização/lado/papel e tempo. Coordenação entre sintomas com localização explícita permite separá-los sem trocar lado ou duração. Não aplica essa divisão a negativas compartilhadas, hipótese, familiar ou citação. Alvo de movimento não vira uma nova queixa. A gramática é superficial, não uma árvore sintática completa de todo o português.
2. **Referências:** apenas expressões suportadas, como “essa dor” e “esse formigamento”, com predicados de comportamento suportados. Exige um único antecedente explícito, afirmado e do paciente. Outros lados, locais, qualidades, momentos, duração, negativas, história anterior/familiar, hipótese, trajeto ambíguo, citação ou construção não suportada suspendem a resolução. Não usa a queixa mais próxima como desempate. “Ele/ela”, “por isso”, “após isso” e causalidade não são completados por essa regra.
3. **Vocabulário:** expressões completas reconhecidas mantêm a forma original, região/segmento e, quando explícita, estrutura anatômica. Exemplos: dedão do pé/hálux, dedão da mão/polegar, dedinho com mão/pé informado, batata da perna/panturrilha, sola/planta do pé. Hálux e quinto dedo não são equivalentes por pertencerem à mesma região. São descrições documentais, não diagnósticos.

Expressões como “dedão” sem mão/pé, “costas”, “bacia”, “junta”, “travando”, “repuxando”, “pinicando” e “nervo inflamado” geram perguntas específicas. Grafias selecionadas como “escapola” e “tornosselo” podem receber sugestão para conferência, nunca substituição automática. Não há correção difusa de nomes de medicamento, dose, lado ou exame.

O vocabulário é uma curadoria local finita, não uma ontologia clínica universal ou certificada. Referências de anatomia para os termos canônicos: [Ministério da Saúde — hálux como primeiro dedo](https://bvsms.saude.gov.br/bvs/publicacoes/manual_calcados_final.pdf), [Ministério da Saúde — polegar](https://www.into.saude.gov.br/lista-dicas-dos-especialistas/191-mao/284-inflamacao-dos-tendoes-do-polegar), [DeCS — panturrilha na descrição anatômica](https://decs.bvsalud.org/ths/resource/?id=134). Esses documentos não validam o motor nem tornam uma expressão popular um diagnóstico.

## Origem, realização e compatibilidade

- HMA original nunca é modificada. Cada vínculo guarda trecho/offset da referência e antecedente. O texto interpretado é separado e a realização explícita pode mencionar o local para evitar ambiguidade. Não transfere a duração ou intensidade do antecedente à oração seguinte.
- A validação inclui a estrutura anatômica específica e qualificadores explícitos, como lateral/medial. Mudança de estrutura, local, lado, negação ou qualidade do sintoma continua inválida mesmo que as palavras gerais sejam parecidas. Relações de piora, melhora e persistência também são comparadas: trocar piora por melhora ou remover a negação de um modificador não é uma paráfrase equivalente.
- Campos `linguagem`, `referencias` e `textoInterpretado` ficam na auditoria existente. Perguntas continuam no painel de revisão já existente, fora do texto e PDF. Não há mudança de layout, formulário, schema ou Supabase.
- Revisão semântica 5, documento 22. Texto manual/revisado não é refeito automaticamente. Ausência da camada opcional mantém compatibilidade com o grafo anterior; o loader de produção carrega a camada antes do grafo.
- Não altera limiares, critérios, bancos diagnósticos ou hipóteses para forçar uma interpretação. Funciona com gramáticas explícitas; cobertura finita e revisão profissional continuam necessárias.

## Testes

`clinical_language_rules.test.cjs` usa somente dados sintéticos: tokens/offsets, estrutura e coordenação, vocabulário, equivalência anatômica e mutações, referência segura/ambígua, negativas/família/hipótese, fonte imutável, relatório real, JSON, texto profissional e isolamento entre chamadas/pacientes. Os fixtures e testes anteriores de grafo, anamnese/relatório e múltiplas queixas carregam a nova camada, sem enfraquecer suas asserções. A barreira hospedada inclui sintaxe e a nova suíte, além de todas as anteriores.
