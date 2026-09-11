'use strict';
const fs=require('fs');
const assert=require('assert');
const core=fs.readFileSync('script-1.18.0.js','utf8');
const norm=fs.readFileSync('patient_data_normalization_core-1.0.0.js','utf8');
const index=fs.readFileSync('index.html','utf8');
const patient=fs.readFileSync('patient_index_cache_core-1.0.0.js','utf8');

const functions=[
  'calcularIdadePorNascimento','idadeNumericaPaciente','obterDadosResponsavelLocal',
  'salvarDadosResponsavelLocal','pacienteEhDependente','obterContatoPreferencialPaciente',
  'normalizarPacienteDoBanco'
];
for(const fn of functions){
  const re=new RegExp(`function\\s+${fn}\\(`);
  assert.match(norm,re,`${fn} deve existir no módulo de normalização`);
  assert.doesNotMatch(core,re,`${fn} não pode permanecer duplicada no monólito`);
}
assert.match(norm,/const KINESYS_RESPONSAVEIS_KEY\s*=\s*'kinesys_pacientes_responsaveis_v1'/,'chave histórica dos responsáveis deve ser preservada');
assert.doesNotMatch(core,/KINESYS_RESPONSAVEIS_KEY/,'estado local de responsáveis não deve permanecer duplicado no core');

assert.match(norm,/localStorage\.getItem\(KINESYS_RESPONSAVEIS_KEY\)/,'leitura local do responsável deve permanecer');
assert.match(norm,/localStorage\.setItem\(KINESYS_RESPONSAVEIS_KEY, JSON\.stringify\(base\)\)/,'gravação local do responsável deve permanecer');
assert.match(norm,/paciente\?\.dependente \?\? paciente\?\.menor_dependente/,'compatibilidade de dependente legado deve permanecer');
assert.match(norm,/if \(dependente && telefoneResponsavel\)/,'contato preferencial deve priorizar responsável quando aplicável');
assert.match(norm,/telefone: p\.telefone \|\| ''/,'contato preferencial deve manter fallback para o paciente');

const normalizerStart=norm.indexOf('function normalizarPacienteDoBanco(p)');
assert.ok(normalizerStart>=0,'normalizador de paciente deve existir');
const normalizer=norm.slice(normalizerStart);
assert.match(normalizer,/idade: idadeNormalizada/,'idade normalizada deve ser preservada');
assert.match(normalizer,/estadoCivil: p\.estadoCivil \|\| p\.estado_civil \|\| ''/,'estado civil legado deve continuar normalizado');
assert.match(normalizer,/responsavelNome:/,'dados de responsável devem continuar normalizados');
assert.match(normalizer,/avaliacoes: \(p\.avaliacoes \|\| \[\]\)\.map/,'avaliações devem continuar convertidas para o contrato camelCase');
assert.match(normalizer,/evolucoes: \(p\.evolucoes \|\| \[\]\)\.map/,'evoluções devem continuar convertidas para o contrato camelCase');
assert.match(normalizer,/agendamentoId: av\.agendamentoId \|\| av\.agendamento_id \|\| null/,'agendamento de avaliação deve permanecer normalizado');
assert.match(normalizer,/agendamentoId: ev\.agendamentoId \|\| ev\.agendamento_id \|\| null/,'agendamento de evolução deve permanecer normalizado');
assert.match(normalizer,/ultimaEdicaoPorNome:/,'rastreabilidade de edição deve permanecer normalizada');

assert.doesNotMatch(norm,/_supabase|\.from\(|\.upsert\(|\.delete\(/,'módulo de normalização não pode acessar ou mutar Supabase');
assert.match(core,/async function salvarPacienteNaNuvem\(pacienteObjeto, opcoes = \{\}\)/,'persistência do paciente deve continuar no core nesta fase');
assert.match(core,/salvarDadosResponsavelLocal\(pacienteObjeto\)/,'persistência deve continuar preservando responsável local via API extraída');
assert.match(patient,/normalizarPacienteDoBanco\(paciente \|\| \{\}\)/,'índice leve deve continuar consumindo o normalizador compartilhado');

const cachePos=index.indexOf('kinesys_data_cache-1.0.0.js');
const normPos=index.indexOf('patient_data_normalization_core-1.0.0.js');
const patientPos=index.indexOf('patient_index_cache_core-1.0.0.js');
const corePos=index.indexOf('script-1.18.0.js');
assert.ok(cachePos>=0&&normPos>cachePos&&patientPos>normPos&&corePos>patientPos,'ordem deve ser cache central -> normalização -> índice leve -> core');
assert.match(index,/core_mod=20260911-phase4q-r1/,'cache-buster do core deve acompanhar a Phase 4P');

const moduleSize=fs.statSync('patient_data_normalization_core-1.0.0.js').size;
const coreSize=fs.statSync('script-1.18.0.js').size;
assert.ok(moduleSize>5000,`módulo parece pequeno demais para o normalizador real: ${moduleSize}`);
assert.ok(coreSize<669721,`monólito deve reduzir em relação à 4O; atual=${coreSize}`);
console.log(`Patient data normalization modularization: OK | module=${moduleSize} bytes | monolith=${coreSize} bytes`);
