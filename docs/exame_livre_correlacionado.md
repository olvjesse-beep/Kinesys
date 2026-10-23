# Exame complementar em texto livre

## Interface e escopo

Na etapa 2 da Avaliação, o atalho “Registrar teste ou achado livre” leva ao espaço de registro complementar. Cada registro permite região, lado, descrição integral, resultado explicitamente classificado e vínculo opcional com um critério completo do catálogo atual. Podem ser adicionados vários registros para pacientes com várias queixas; editar um registro o devolve ao campo, sem apagar o conteúdo anterior em preenchimento.

O bloco visual “Integração multirregional” foi retirado do fragmento; raciocínio multiqueixa e hipóteses regionais continuam ativos. A revisão de segurança foi deslocada para a etapa 3, preservando decisões, condutas, justificativas e bloqueio de finalização. O Radar usa um único conjunto de IDs e acompanha a etapa: junto à leitura da HMA, ao apoio do exame ou à revisão do relatório. Não permanece atrás do cabeçalho/contexto fixo.

## Persistência e relatório

- JSON existente: `mapeamento.clinicaEstruturada.exameLivre`, sem migration ou tabela nova.
- Rascunho em preenchimento também é preservado; entra no relatório como descrição pendente, sem confirmar critérios.
- A camada documental inclui região, lado, resultado, texto original, ID do registro e vínculo escolhido. Liga a queixa da HMA ao registro por região, sem inferir causalidade.
- Testes com vínculo confirmado pelo profissional usam os índices/limiares já existentes, somente em região selecionada. Não se somam achados de lados diferentes, não se combina um registro unilateral com checklist guiado sem lado, e repetição do mesmo teste não aumenta a contagem.
- Divergências de texto/resultado/lado ou resultados contraditórios suspendem a síntese automática correspondente e são exibidas para revisão. Alterar a HMA invalida o vínculo anterior sem apagar o texto. Critério cujo texto mudou no catálogo exige novo vínculo.
- Texto profissional/revisado do relatório continua preservado; nova base requer confirmação. Troca de paciente/avaliação limpa o contexto imediatamente.
- Descrição livre sem correspondência não recebe diagnóstico ou pontuação artificial. Toda redação deve ser revista pelo profissional; os testes sintéticos não equivalem à validação clínica de um dispositivo de apoio à decisão.

Fundamentação documental, sem novos limiares diagnósticos: [APTA — Initial Examination and Evaluation](https://www.apta.org/your-practice/documentation/defensible-documentation/elements-within-the-patientclient-management-model/initial-examination) orienta documentar testes/medidas pertinentes às hipóteses e manter achados fáceis de acompanhar. [NICE NG59 — Assessment](https://www.nice.org.uk/guidance/ng59/chapter/recommendations) preserva avaliação de alternativas e causas específicas quando pertinente. Não extrapolar a diretriz lombar para criar regras de outras regiões.

## Verificação

`tests/evaluation_free_exam.test.cjs` executa o módulo, o compositor real e as funções reais de roundtrip clínico com dados exclusivamente sintéticos. Cobre múltiplas regiões, critérios canônicos, repetição, lados, divergência livre/guiado, texto profissional, catálogo alterado, rascunho, mudança de HMA, isolamento entre pessoas, preservação de chaves legadas, posição única do Radar e transferência da revisão de segurança à etapa 3. A suíte está adicionada à barreira hospedada existente, sem reduzir testes anteriores.

Prévia isolada: `node tests/helpers/free_exam_preview.cjs`, http://127.0.0.1:4185/. Usa fragmento/estilos/registro livre/compositor reais e um roteiro de apresentação sintético, sem core de rede nem conexão ao banco; não é substituto de teste clínico de produção.
