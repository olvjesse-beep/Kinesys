'use strict';

const fs=require('fs');
const assert=require('assert');

const sql=fs.readFileSync('SUPABASE_SQL/SUPABASE_MIGRACAO_FINANCEIRO_BAIXA_COBRANCA_ORFA_20260915.sql','utf8');

assert.match(sql,/select \* into c\s+from public\.cobrancas_agendamento\s+where clinica_id=cid and agendamento_id=p_agendamento_id\s+for update/i,
  'Baixa deve localizar primeiro a cobrança histórica, sem depender do agendamento atual');
assert.match(sql,/if not found then\s+perform public\.kinesys_preparar_cobranca_agendamento/i,
  'Preparação pelo agendamento deve existir apenas como fallback para cobrança ainda não materializada');
assert.match(sql,/cobranca_agendamento_id=c\.id/i,
  'Verificação de pagamentos deve usar a identidade da cobrança histórica');
assert.match(sql,/c\.origem='plano'/i,
  'Baixa histórica continua protegendo cobranças originadas de pacote');
assert.match(sql,/pl\.operacao_id='unitario-agenda-'\|\|p_agendamento_id::text/i,
  'Ajuste de plano deve atingir apenas o plano unitário automático original');
assert.doesNotMatch(sql,/delete\s+from\s+public\.cobrancas_agendamento/i,
  'A correção não pode apagar a cobrança nem sua auditoria');

console.log('Financeiro orphan charge write-off contract: OK');
