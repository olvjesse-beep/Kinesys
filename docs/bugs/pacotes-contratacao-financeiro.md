# Pacotes e cobranças — correção da origem

Base auditada: main 0b13fd7e0c9f3011a58cf8385392bd200600b60b.

## Causas confirmadas

- O cadastro de procedimentos tinha preço, mas não quantidade de sessões. O formulário presumiu 10; renovações copiavam o preço antigo.
- Preparar cobrança criava um plano unitário para qualquer procedimento, inclusive pacote, sem contratação explícita.
- Filas locais faziam upsert de contratos e pagamentos e prevaleciam sobre o servidor, podendo ressuscitar estado antigo.
- Conversão não baixava a cobrança histórica individual. A situação financeira dava prioridade a essa cobrança e ignorava recebimentos gerais do pacote.
- A RPC de baixa já procurava a cobrança histórica primeiro. Uma execução via API foi confirmada. Contudo, bloqueava também recebimentos integralmente estornados porque contava todas as linhas de pagamento.

## Modelo

Procedimento guarda preço vigente e sessões por contratação. Contratar é uma RPC idempotente que captura os padrões do cadastro. Personalização substitui condições no mesmo ID; remover personalização restaura o acordo original, sem ler o preço atual. Cancelar revoga direitos e libera reservas futuras; não representa devolução de dinheiro. Estorno preserva o lançamento original e a contrapartida. Agendamento não contrata pacote.

O banco valida paciente/clínica/procedimento, contrato ativo e capacidade sob bloqueio do contrato. O encerramento automático pertence ao trigger existente. Exclusão física de contrato é recusada para preservar histórico e impedir recriação do ID. Rascunhos financeiros antigos permanecem no navegador para revisão, sem sobrescrever dados confirmados ou conceder saldo. Operações financeiras exigem confirmação do servidor.

Não há preço fixo no código. Os contratos anteriores mantêm valores, descontos e quantidades acordadas. O cadastro conhecido de PCT recebe 10 sessões na migração; seu preço não é alterado.

## Validação

`node tests/pacotes_contrato_frontend.test.cjs`

`npm install --no-save --prefix tests @electric-sql/pglite@0.5.8`

`node tests/pacotes_contrato_db.test.mjs`

O teste de banco usa Postgres local (PGlite) com a estrutura de colunas e funções financeiras auditadas, perfil sintético e sem dados reais. Abrange padrões, preço novo/antigo, idempotência, personalização substitutiva/restauração, reservas/capacidade, consumo/reversão, cancelamento, bloqueio de exclusão/reativação, conversão, pagamento válido bloqueando baixa, RPC real de estorno, baixa após estorno e proteção do pacote. Não substitui a validação da sessão/RLS e do deploy real.

## Publicação e reversão

Aplicar `SUPABASE_SQL/pacotes_contrato_canonico.sql` antes do frontend. Executar a reparação separada apenas após backup e nova confirmação da contagem esperada. A reparação não apaga pagamentos nem altera a contratação legítima.

Destino exclusivo: `public_html/app`. Preservar `public_html` e WordPress. Backups privados datados ficam fora do repositório e da pasta pública. Reversão deve ser seletiva por funções/arquivos do backup; não remover contratos ou auditoria criados após a publicação. Não restaurar dump inteiro sobre movimentações novas.
