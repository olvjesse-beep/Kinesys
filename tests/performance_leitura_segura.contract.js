'use strict';
const fs=require('fs');
const assert=require('assert');

const sql=fs.readFileSync('SUPABASE_SQL/SUPABASE_MIGRACAO_PERFORMANCE_LEITURA_SEGURA_20260915.sql','utf8');
const rollback=fs.readFileSync('SUPABASE_SQL/SUPABASE_ROLLBACK_PERFORMANCE_LEITURA_SEGURA_20260915.sql','utf8');
const notif=fs.readFileSync('src/agenda/agenda_notificacoes_core-1.20.1.js','utf8');

for(const tabela of ['agendamentos','pacientes','pagamentos','planos_atendimento']){
  assert.match(sql,new RegExp(`alter policy ks_access_select on public\\.${tabela}[\\s\\S]*?select public\\.kinesys_current_clinica_id\\(\\)`,'i'),
    `${tabela}: clínica deve continuar sendo validada pelo mesmo helper`);
  assert.match(sql,new RegExp(`kinesys_pode_operar\\('${tabela}','SELECT'\\)`,'i'),
    `${tabela}: permissão deve continuar usando a regra existente`);
  assert.match(rollback,new RegExp(`alter policy ks_access_select on public\\.${tabela}`,'i'),
    `${tabela}: rollback deve restaurar a política anterior`);
}

assert.doesNotMatch(sql,/drop\s+policy|create\s+policy/i,'Otimização não deve trocar o conjunto de políticas');
assert.doesNotMatch(sql,/insert\s+into|update\s+public\.|delete\s+from/i,'Otimização não deve modificar dados de negócio');
assert.match(sql,/agendamentos_clinica_profissional_data_hora_idx/,'Agenda deve ter índice para profissional+data');
assert.match(sql,/notificacoes_internas_profissional_data_idx/,'Notificações por profissional devem ter índice direto');
assert.match(sql,/notificacoes_internas_email_data_idx/,'Notificações por e-mail devem ter índice direto');
assert.match(sql,/pagamentos_clinica_cobranca_idx/,'Financeiro deve indexar vínculo por cobrança');

assert.match(notif,/let agendaNotificacoesEmCarga = null/,'Notificações devem coalescer chamadas concorrentes');
assert.match(notif,/AGENDA_NOTIFICACOES_CACHE_MS = 15000/,'Cache silencioso deve ser curto');
assert.match(notif,/if \(agendaNotificacoesEmCarga\) return agendaNotificacoesEmCarga/,'Leitura concorrente deve compartilhar a mesma Promise');
assert.match(notif,/!forcar && !avisar/,'Cache curto não pode impedir polling normal com aviso');
assert.match(notif,/setInterval\([\s\S]*60000\)/,'Polling de 60 s deve permanecer preservado');

console.log('Safe read performance contract: OK');
