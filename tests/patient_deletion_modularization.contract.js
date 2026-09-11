'use strict';
const fs = require('fs');
const assert = require('assert');

const core = fs.readFileSync('patient_deletion_core-1.0.0.js','utf8');
const monolith = fs.readFileSync('script-1.18.0.js','utf8');
const index = fs.readFileSync('index.html','utf8');

const moved = [
  'limparDadosLocaisPacienteExcluido',
  'excluirPacienteNuvemSeguro',
  'excluirArquivosLocaisPaciente',
  'excluirPaciente'
];
for (const fn of moved) {
  assert.ok(core.includes(`function ${fn}(`), `${fn} deve existir no módulo dedicado`);
  assert.ok(!monolith.includes(`function ${fn}(`), `${fn} não pode permanecer duplicada no monólito`);
}

assert.match(core,/\.rpc\('kinesys_excluir_paciente_completo',\s*\{\s*p_paciente_id:\s*id\s*\}\)/,'Exclusão deve manter RPC transacional existente');
assert.match(core,/usuarioEhMaster\(\)/,'Exclusão deve continuar exclusiva do administrador');
assert.match(core,/kinesys_prontuarios/,'Limpeza local do índice legado deve ser preservada');
assert.match(core,/kinesys_rascunho_avaliacao_v11/,'Rascunho local do paciente excluído deve ser limpo');
assert.match(core,/\/api\/patient-delete/,'Limpeza de arquivos do KineSys Local deve ser preservada');
assert.match(core,/invalidarCachePacientesBasicos\(\)/,'Índice leve de pacientes deve ser invalidado');
assert.match(core,/Nenhum dado foi removido parcialmente/,'Mensagem de atomicidade deve permanecer');
assert.match(core,/window\.excluirPaciente\s*=\s*excluirPaciente/,'Contrato global de excluirPaciente deve ser explícito');

const monolithPos = index.indexOf('script-1.18.0.js');
const deletionPos = index.indexOf('patient_deletion_core-1.0.0.js');
const chartPos = index.indexOf('patient_chart_read_core-1.0.0.js');
assert.ok(monolithPos >= 0 && deletionPos > monolithPos, 'Módulo de exclusão deve carregar depois do core legado');
assert.ok(chartPos < 0 || deletionPos < chartPos, 'Módulo de exclusão deve estar disponível antes dos módulos carregados depois do core');

const statCore = fs.statSync('patient_deletion_core-1.0.0.js').size;
const statMonolith = fs.statSync('script-1.18.0.js').size;
assert.ok(statCore > 1500, 'Extração de exclusão parece pequena demais para ser real');
assert.ok(statMonolith < 709195, `Monólito deve reduzir em relação à Phase 4L; atual=${statMonolith}`);

console.log(`Patient deletion modularization: OK | module=${statCore} bytes | monolith=${statMonolith} bytes`);
