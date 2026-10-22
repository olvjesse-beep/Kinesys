# Meu dia e consulta clínica - 22/10/2026

## Escopo

KineSys, branch `feat/meu-dia-avaliacao-cuidados`, base `e5c35685f2c8dbab7dddea02ae26680cbbdf22db`. Não altera dados de pacientes, banco, políticas RLS, WordPress, Agenda, cobrança ou critérios diagnósticos. Não publicado neste trabalho.

- Realizar avaliação: avaliação finalizada existente oculta esse atalho; rascunho não substitui avaliação finalizada. Evolução e reavaliação continuam disponíveis.
- Cuidados: tags cirúrgicas relevantes, relatos conservadoramente identificados na HMA e campo existente **Cirurgias e traumas / Detalhes do trauma ou restrições informadas**. Não há campo duplicado nem novo esquema. Restrições pós-operatórias da avaliação finalizada mais recente têm prioridade. A indicação não equivale a contraindicação automática.
- Pacientes: Consultar avaliação e Histórico de evoluções abrem visualização somente leitura em janela separada, com opção de impressão, sem entrar na edição; ordem decrescente e ID explícito. Permissões e perfil/clínica são conferidos.
- PDF: seções assistenciais em vez de achatamento recursivo indiscriminado do estado do motor. HMA, texto manual do relatório, procedimentos, medicamentos, contexto, exames, achados disponíveis, plano e evoluções permanecem documentais. Dados técnicos continuam no detalhado; legados não mapeados recebem aviso. Dados locais pendentes são sinalizados.

## Segurança e limites

Sem nova análise automática para indicar ou proibir técnicas. Dados faltantes não são liberação clínica. Uma frase familiar/negativa/planejada não cria antecedente próprio. A extração da HMA é deliberadamente conservadora; o profissional pode documentar limitações no campo existente. O histórico cirúrgico não define sozinho uma restrição atual.

Não altera recebimentos, prontuários reais, rascunhos, assinatura ou conteúdo manual. Conteúdo usado em testes é sintético; arquivo PDF real apenas lido para identificar a falha de apresentação. As alterações estão limitadas ao software KineSys.

## Verificação

- `home_avaliacao_cuidados.test.cjs`: ações condicionais, draft, vínculos, origem, negativas, prótese/artrodese, pós-op atual, sem mutações, troca de clínica e atualização após salvar.
- `prontuario_clinico.test.cjs`: todos os blocos clínicos previstos, ausência de fingerprint/JSON no simplificado, texto manual/escaping, anexo técnico, consultas por tipo, ordem, permissões e isolamento.
- Suíte integral de `.github/workflows/agenda-edit-contract.yml` mantida e executada localmente. Aprovação hospedada obrigatória antes de integrar.
- Conferência visual sintética com CSS de produção em folhas independentes: 1366, 1280, 1024 e 390px; detalhes expandidos, sem sobreposição/overflow. PDF sintético A4 de três páginas renderizado e inspecionado, sem dados de pacientes reais.

## Backup e reversão

Backup verificado fora do diretório público: `C:/Users/User/.codex/backups/kinesys-20261022-meu-dia-cuidados/antes.zip`, 532 entradas, SHA256 `BF3CFC2707CF27BB0A2DDA9C51CF9DAB433D6F91E59EF5FEE7735F8843ADFB54`.

Reverter apenas o commit desta PR por nova PR, mantendo publicações posteriores. Nenhuma restauração de banco é necessária. Quando autorizado publicar, destino exclusivo `/home/u760374282/domains/fisiofixfisioterapia.com/public_html/app`; nunca a pasta pai. Conferir os três domínios após publicação.

## Ajuste dos botões lado a lado

Ajuste exclusivamente visual solicitado após a publicação: remove o limite de 255px do grupo de ações e usa a largura efetiva do card para posicionar o grupo. Os três botões ficam na mesma linha; em cards estreitos, seus títulos podem ocupar duas linhas dentro do botão, sem cortar palavras. O indicador “Registro concluído” usa uma faixa separada. Nenhum handler, dado clínico ou critério de visibilidade foi alterado.

Teste `home_actions_inline.contract.cjs` acrescentado à barreira, sem retirar os contratos existentes. Validação visual com DOM e CSS reais, dados sintéticos e medição de bounding boxes: janelas de 1920, 1366, 1280, 1024, 900, 620, 390 e 320px, incluindo card de 905px como no exemplo enviado. Conferidos três botões na mesma linha, títulos sem recorte, dois botões com indicador de conclusão, ausência de sobreposição e overflow. Suíte local completa: 77 checks aprovados.

Backup anterior a este ajuste: `C:/Users/User/.codex/backups/kinesys-20261022-botoes-lado-a-lado/antes.zip`, 535 entradas, SHA256 `1A62A3EF006BB855A553622CC42F57641DAD7F591F569E63FF018A4483CB0617`. Base: `9f484bb8865e2adc51ff40e0141610c0962f43f6`. Reversão seletiva pelo commit/PR deste ajuste, sem desfazer a funcionalidade clínica da PR 220.
