# Anamnese — modelo 2 e sugestões restauradas

## Escopo

Implementação restrita ao KineSys. Sete grupos com índice e um painel de preenchimento, checkboxes nativos, detalhes opcionais e fonte compacta. Campos canônicos movidos, não duplicados. Identificadores, dados do Radar e histórico anterior preservados.

As sugestões de medicamentos, cirurgias e atividades físicas são registros do relato, não prescrições. Consultam o catálogo atual, atualizam a busca ativa após lazy-load e mantêm um único listener por campo. Listas inline evitam recorte por diálogo/rodapé; seleção por teclado, fechamento acessível, relevância e deduplicação cobertos por testes.

## Persistência

Dados adicionais ficam em `clinicaEstruturada.contextoAnamnese`, dentro do JSON já existente. Sem migração de banco ou reescrita de pacientes. Chaves desconhecidas do JSON são preservadas. Estados Não informado, Nega e Relata são distintos; negativa contraditória não apaga informações. Observações opcionais preenchidas reabrem expandidas. Avaliação nova limpa contexto anterior; edição restaura o contexto salvo.

## Barreira de regressão

O workflow hospedado obrigatório `Agenda e planos - regressao critica` passou a executar também:

- `tests/input_helpers_modularization.contract.js`: montagem tardia, remontagem, catálogo atrasado, teclado, relevância, deduplicação e três bases reais.
- `tests/evaluation_context_model2.test.cjs`: campos únicos, resumo sem falso preenchimento, alternância sem perda, negativas, JSON, hooks reais de gravação/reabertura, limpeza por paciente e dez ciclos de timers.
- `tests/evaluation_context_lifecycle.contract.js`: suspensão fora da tela/aba, observer específico e isolamento dos resultados por HMA.

Na validação local também passaram o fluxo de três etapas e a correlação narrativa com 426 documentos em onze regiões. A suíte crítica existente de Agenda, Planos, pagamentos, câmeras, Documentos, Home, CRM e cache foi preservada e passou.

## Evidência e limites

QA visual detalhado no arquivo local `design-qa.md`, com comparação conjunta da referência e implementação, detalhe ampliado e capturas de 1672, 1366, 1280, 1024 e 390 pixels. Sem console errors na prévia autenticada. Testes de dados executados em memória; nenhum registro clínico real salvo para testar.

Dois contratos gerais já falham na base imutável `5745ac3fbb98c89a0a983ac02bea0e74af9472c8`: orçamento regional de ombro (71996 > 70000 bytes) e estrutura histórica da raiz (lista antiga de seis arquivos). Confirmados em cópia extraída do commit original. Não foram removidos nem afrouxados para esta entrega; não fazem parte da barreira crítica hospedada. A presença do QA local acrescenta ainda um arquivo não versionado à verificação antiga da raiz.

## Backup e reversão

Backup anterior verificado fora da pasta pública: `C:/Users/User/.codex/backups/kinesys-20261020-avaliacao-contexto/antes.zip`, SHA256 `33427EDB14EA289CAF73E862F4368968313E6B06E5C4099964BD235D3FB67C97`.

Reversão seletiva da PR, mantendo mudanças posteriores; nunca restaurar pastas inteiras, banco ou WordPress. Sem publicação neste pedido. Destino futuro autorizado para KineSys permanece exclusivamente `public_html/app`, após aprovação e check crítico hospedado bem-sucedido.
