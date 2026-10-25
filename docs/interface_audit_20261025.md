# Correções da auditoria de interface — 25/10/2026

Escopo: KineSys, onze achados da auditoria. As alterações anteriores de HMA e datas cirúrgicas da mesma branch foram preservadas. Nenhuma integração de IA, migração ou correção de dados de pacientes faz parte desta mudança.

| Achado | Correção |
|---|---|
| F01 | Agenda mantém navegação semanal, período e data no celular; reposiciona os controles existentes. |
| F02 | Evolução distingue estado não informado, EVA não avaliada e EVA zero explicitamente avaliada; persiste e reabre sem converter ausência em zero. |
| F03 | Checkboxes de declaração visíveis, com área e foco próprios. |
| F04 | Equipe com tabela legível, ações inteiras e rolagem lateral; herói móvel sem espaço excessivo. |
| F05 | Tabela de procedimentos mantém cabeçalhos e nomes legíveis no celular. |
| F06 | Carregamento, erro, vazio e zero confirmados são estados distintos; consulta da equipe aceita nova tentativa e protege contra respostas atrasadas. |
| F07 | Anúncios e foco de navegação aguardam a rota assíncrona e descartam transições antigas. |
| F08 | Colunas de Relatórios alinhadas e estado vazio proporcional ao conteúdo. |
| F09 | Terminologia de Início/Pacientes/documento, número do prontuário e instruções do portal padronizadas. |
| F10 | Última evolução exibida em dia/mês/ano sem conversão indevida de fuso. |
| F11 | Limpeza de ícones Unicode completos, preservando conteúdo textual e classificação dos avisos. |

## Verificação

- Executar os comandos Node de `.github/workflows/agenda-edit-contract.yml`, incluindo a nova regressão da auditoria e persistência de evolução com dados sintéticos.
- O contrato adicional de handoff da raiz já diverge da base desta branch: exige seis arquivos, mas a revisão anterior contém `AGENTS.md`, `camera.html` e arquivos de compatibilidade JS/CSS na raiz. A correção visual não remove esses arquivos nem reduz esse contrato para obter aprovação; essa falha prévia deve ser tratada separadamente antes de exigir aprovação integral de todos os workflows antigos.
- A coluna `public.evolucoes.eva` existente é inteira, aceita NULL e não possui default numérico. A mudança usa o contrato existente, sem alterar schema ou registros históricos.
- Prévia local: `node tests/helpers/ui_preview.cjs`; abre `http://127.0.0.1:4201/` usando autenticação normal. Para composição isolada de layout: `/__audit_fixture?tela=tela_relatorio`, `tela_evolucao`, `tela_equipe` ou `tela_agenda`. A composição usa os arquivos reais de interface e transporte fictício, sem gravações; não substitui homologação autenticada nem valida funcionamento de servidor PHP.
- Conferir 390×844, 1024×768, 1280×720 e 1366×768. Verificar início direto da agenda móvel, redimensionamento para desktop, datas, estado não avaliado/zero explícito, checkboxes, foco e rolagem das tabelas. Não confirmar reservas, pagamentos ou salvar prontuários reais para testar apresentação.
- Capturas e relatório da auditoria original permanecem privados, fora do repositório. A autenticação da prévia não foi aceita com as credenciais fornecidas durante esta execução; a conferência visual das correções utiliza composição sintética isolada.

## Entrega e reversão

Assets usam a revisão `20261025-interface-audit-r1`. Integração depende do check hospedado **Agenda e planos - regressao critica** no commit da mudança. O pedido atual autoriza correções, não publicação; não houve deploy, merge em main ou alteração do site institucional.

Backup anterior às correções: arquivo local datado `auditoria-interface-f218a5d-20261025.zip`, SHA256 `E9F4902EB6241D708E01DA4EB929175ACBC8B0FBDEC4763D60B9FCC5CA1EE6D5`. Reverter seletivamente o commit das correções se necessário, preservando HMA/datas cirúrgicas anteriores e quaisquer alterações posteriores. Não restaurar banco nem diretórios de produção inteiros.
