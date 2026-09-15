'use strict';
const fs=require('fs');
const assert=require('assert');
const sql=fs.readFileSync('SUPABASE_SQL/SUPABASE_MIGRACAO_PERFORMANCE_LEITURA_SEGURA_20260915.sql','utf8');
assert.doesNotMatch(sql,/\b(insert\s+into|delete\s+from|update\s+(?:public\.)?[a-z_]+\s+set)\b/i,'Migration de performance não pode alterar dados de negócio');
assert.doesNotMatch(sql,/drop\s+(table|function|policy)|truncate/i,'Migration de performance não pode remover estruturas/regras existentes');
console.log('Performance migration business-data guard: OK');
