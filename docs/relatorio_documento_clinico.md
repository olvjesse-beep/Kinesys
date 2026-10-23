# Relatório com identificação e seções clínicas

## Escopo

Revisão semântica 2 do compositor local da versão 22. Não altera o formulário de avaliação, os critérios diagnósticos, o banco ou os dados de pacientes. Não usa IA externa nem envia conteúdo clínico a terceiros.

- Cabeçalho: paciente, idade, ocupação, sexo/nascimento quando preenchidos, data da avaliação e motivo documental quando existe uma queixa própria explícita. Não inventa prioridade ou motivo a partir de familiar/negativa/hipótese do Radar. A anamnese completa continua na história clínica.
- Seções presentes somente quando há conteúdo: história; antecedentes/contexto; imagem; exame físico-funcional e correlação; capacidade funcional; plano registrado; segurança/cuidados. Exame e interpretação de cada região permanecem adjacentes.
- Corrige a regra de sintaxe que não reconhecia “dor” no singular. Usa modelos documentais conservadores; não completa “raqui” nem ambiguidade por suposição. Não agrupa numa enumeração simples frases compostas, temporais ou com modificadores.
- Achados livres são segmentados apenas em separadores inequívocos (linha, ponto e vírgula e início conhecido de teste), preservando medidas decimais, doses e texto original. SLR/Slump, Spurling e Patrick/FABER têm localização documental pelo nome; localização explicitamente selecionada continua soberana. Menção anatômica explícita única também pode organizar a descrição. Não é reconhecimento ilimitado de testes.
- Cada trecho guarda offsets, fonte, lado, localização e método de localização na auditoria. A formatação não altera o registro original nem alimenta critérios canônicos ou confirma hipóteses. Teste não realizado/planejado não cobre exame regional.
- Avisos de rascunho, histórico modificado, conflito e vínculo de catálogo permanecem no painel e nos metadados. O documento usa uma ressalva clínica curta quando há revisão pendente, sem exportar fingerprint ou estado de edição como prosa.
- A cobertura regional considera os achados livres explicitamente descritos: não volta a dizer que não há exame lombar quando SLR/Slump foram escritos. Queixas sem exame permanecem como lacunas; achado cervical não é exame do ombro só porque a resposta irradiou para ele.
- Texto profissional/manual ou revisado não é substituído. Base automática não revisada recebe a nova composição; documentos protegidos mostram orientação de “Atualizar base da avaliação”, com confirmação existente.

Referência de organização, não de novos critérios diagnósticos: [APTA — Initial Examination and Evaluation](https://www.apta.org/your-practice/documentation/defensible-documentation/elements-within-the-patientclient-management-model/initial-examination) distingue história, testes/medidas e integração clínica. A organização do documento não transforma relatos em achados confirmados.

## Verificação

`tests/evaluation_report_document.test.cjs` usa um quadro poliqueixoso sintético, sem nome/dados de produção. Verifica identificação, fontes, múltiplos testes/lados, ausência de confirmação artificial, original íntegro, reabertura e preservação de texto manual/revisado. Incluído no workflow hospedado de Agenda e Planos, sem remover suítes anteriores.

Expectativas antigas de identificação em frase e proibição de subtítulos foram atualizadas estritamente para o cabeçalho/seções expressamente solicitados. A deduplicação da história, data correta, adjacência regional, conservação dos fatos e assinatura continuam testadas.

Prévia sem rede/banco: `node tests/helpers/free_exam_preview.cjs --document-report`, http://127.0.0.1:4186/. Não equivale a gravação em prontuário real nem a validação clínica profissional.
