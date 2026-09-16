'use strict';

const fs=require('fs');
const assert=require('assert');

const js=fs.readFileSync('src/finance/financeiro_agendamento-1.21.0.js','utf8');
const css=fs.readFileSync('styles/financeiro_agendamento-1.21.0.css','utf8');
const html=fs.readFileSync('index.html','utf8');
const loader=fs.readFileSync('src/ui/screen_loader-1.25.0.js','utf8');
const sqlBase=fs.readFileSync('SUPABASE_SQL/SUPABASE_MIGRACAO_FINANCEIRO_BAIXA_COBRANCA_AGENDAMENTO_20260911.sql','utf8');
const sqlGuard=fs.readFileSync('SUPABASE_SQL/SUPABASE_MIGRACAO_FINANCEIRO_BAIXA_COBRANCA_GUARD_20260911.sql','utf8');
const sql=sqlBase+'\n'+sqlGuard;

assert.match(js,/>Quitar<\/button>/,'Histórico deve oferecer Quitar quando existe saldo pendente');
assert.match(js,/abrirPagamentoAgendamentoIntegrado\('\$\{esc\(c\.agendamento_id\)\}'\)/,'Quitar deve reutilizar o pagamento canônico por agendamento');
assert.match(js,/>Remover pendência<\/button>/,'Cobrança unitária sem pagamento deve oferecer remoção da pendência');
assert.match(js,/podeBaixar=pend>0&&pago===0.*estorno_de.*c\.origem!=='plano'/,'Remoção exige ausência de recebimento válido e protege o pacote');
assert.match(js,/cobrancas\.filter\(c=>!c\.baixada_em&&c\.origem!=='plano'\)/,'Cobranças baixadas não devem continuar na lista de pendências ativas');
assert.match(js,/kinesys_baixar_cobranca_agendamento/,'Frontend deve usar a RPC auditável de baixa');
assert.match(js,/id="fin_ag_baixa_tipo"/,'Baixa deve registrar tipo/motivo');
assert.match(js,/id="fin_ag_baixa_motivo"/,'Baixa deve exigir justificativa');

assert.match(js,/typeof agendaAgendamentosSemanaCache!=='undefined'/,'Pagamento aberto pelo Financeiro não pode depender de Agenda já carregada');
assert.match(js,/from\('agendamentos'\)\.select\('id,paciente_id,profissional_id,procedimento_id,plano_id,status,data,hora_inicio'\)/,'Quitar deve buscar o agendamento no banco quando o bundle/cache da Agenda não estiver disponível');
assert.match(js,/prep\.data\?\.baixada_em/,'Cobrança já baixada não pode reabrir pagamento');

assert.match(sqlBase,/add column if not exists baixa_tipo text/i,'Schema deve guardar tipo da baixa');
assert.match(sqlBase,/add column if not exists baixa_motivo text/i,'Schema deve guardar justificativa');
assert.match(sqlBase,/add column if not exists baixada_em timestamptz/i,'Schema deve guardar quando ocorreu a baixa');
assert.match(sqlBase,/add column if not exists baixada_por text/i,'Schema deve guardar quem fez a baixa');
assert.match(sql,/if found and c\.baixada_em is not null then return to_jsonb\(c\)/i,'Preparação não pode recriar cobrança já baixada');
assert.match(sql,/Esta cobrança foi removida da pendência e não aceita novos pagamentos/i,'Pagamento deve falhar fechado após baixa');
assert.match(sqlGuard,/if c\.origem='plano' then raise exception/i,'Baixa direta não pode alterar contabilidade de pacote');
assert.match(sqlGuard,/select count\(\*\) into qtd_pagamentos from public\.pagamentos/i,'RPC deve verificar pagamentos existentes');
assert.match(sqlGuard,/if qtd_pagamentos>0 then raise exception/i,'RPC deve impedir baixa quando existe pagamento lançado');
assert.match(sqlGuard,/set desconto_valor=valor_original/i,'Baixa deve zerar o valor devido sem fabricar recebimento');
assert.match(sqlGuard,/valor_final=0/i,'Atendimento unitário automático deve deixar de gerar saldo no plano');
assert.match(sqlGuard,/grant execute on function public\.kinesys_baixar_cobranca_agendamento\(uuid,text,text\) to authenticated/i,'RPC deve ser executável somente pelo cliente autenticado após validação interna');
assert.match(sqlGuard,/revoke all on function public\.kinesys_baixar_cobranca_agendamento\(uuid,text,text\) from anon/i,'Anon não pode executar baixa financeira');
assert.doesNotMatch(sql,/delete\s+from\s+public\.cobrancas_agendamento/i,'Baixa não pode apagar fisicamente a auditoria da cobrança');
assert.doesNotMatch(js,/from\('cobrancas_agendamento'\)\.delete\(/,'Frontend não pode apagar a cobrança diretamente');

assert.match(css,/\.fin-ag-history-actions/,'Ações de quitação/baixa devem possuir layout próprio');
assert.match(css,/\.fin-ag-writeoff-dialog/,'Baixa deve usar diálogo visual dedicado');
assert.match(html,/styles\/financeiro_agendamento-1\.21\.0\.css\?v=20260911-pending-r1/,'CSS deve ter cache bust da correção');
assert.match(html,/src\/finance\/financeiro_agendamento-1\.21\.0\.js\?v=20260916-contratos-r1/,'JS deve ter cache bust da correção');
assert.match(loader,/const VERSION\s*=\s*['"]1\.25\.10-agenda-repeat-until-r44['"]/,'Versão pública atual do Screen Loader deve permanecer intacta');

console.log('Financeiro pending appointment contract: OK');

