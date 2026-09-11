'use strict';
const fs=require('fs');
const assert=require('assert');

const html=fs.readFileSync('index.html','utf8');
const core=fs.readFileSync('script-1.18.0.js','utf8');
const mod=fs.readFileSync('patient_pre_registration_core-1.0.0.js','utf8');

const funcoes=[
  'alternarFiltroPreCadastro',
  'fecharBuscaPacientesPreCadastro',
  'sincronizarBuscaPacientePreCadastro',
  'selecionarPacienteBuscaPreCadastro',
  'filtrarPacientesPreCadastro',
  'navegarBuscaPacientesPreCadastro',
  'atualizarSelectPacientesPreCadastro',
  'carregarPacientePreCadastradoNaAvaliacao'
];

for(const fn of funcoes){
  assert(!core.includes(`function ${fn}(`)&&!core.includes(`async function ${fn}(`),`declaração ${fn} permaneceu no monólito`);
  assert(mod.includes(`function ${fn}(`)||mod.includes(`async function ${fn}(`),`módulo perdeu ${fn}`);
  assert(mod.includes(`window.${fn} = ${fn};`),`API histórica ${fn} deve permanecer exposta via window`);
}

assert.doesNotMatch(core,/let exibindoTodosPreCadastros\s*=\s*true/,'estado do filtro de pré-cadastro permaneceu no monólito');
assert.match(mod,/let exibindoTodosPreCadastros\s*=\s*true/,'estado inicial do filtro deve permanecer buscando todos');
assert.match(mod,/diffHoras\s*=\s*\(agora - p\.timestampCadastro\) \/ \(1000 \* 60 \* 60\)/,'regra temporal deve continuar calculada em horas');
assert.match(mod,/if \(diffHoras > 2\) mostrar = false/,'filtro recente deve continuar limitado a 2 horas');
assert.match(mod,/const ehPacienteAtivo = !!contextoPacienteId/,'prontuário ativo deve continuar sendo exceção ao filtro');
assert.match(mod,/obterPacientesSalvos\(\)/,'seletor deve continuar usando prontuário completo para distinguir avaliações prévias');
assert.match(mod,/obterPacienteCompletoPorId\(pacienteIdAlvo\)/,'seleção deve continuar recarregando somente o prontuário escolhido');
assert.match(mod,/processarRadarEmTempoReal\(\)/,'carga do paciente deve continuar atualizando o Radar Clínico');
assert.match(mod,/cargasPacienteAvaliacaoKineSys\+\+/,'guarda de carga da Avaliação deve ser preservada');
assert.match(mod,/cargasPacienteAvaliacaoKineSys--/,'guarda de carga deve ser liberada em finally');
assert.doesNotMatch(mod,/_supabase/,'módulo de pré-cadastro não deve introduzir acesso direto ao Supabase');

// Helpers compartilhados continuam no core porque também são contratos do Motor Clínico/input helpers.
assert.match(core,/function removerAcentos\(str\)/,'helper compartilhado removerAcentos deve permanecer no core nesta fase');
assert.match(core,/function obterTextoExibicao\(item\)/,'helper compartilhado obterTextoExibicao deve permanecer no core nesta fase');
assert.match(core,/function calcularIdadeCadastro\(\)/,'cálculo de idade do cadastro fica fora do escopo da 4K');

const inputPos=html.indexOf('input_helpers_core-1.0.0.js');
const prePos=html.indexOf('patient_pre_registration_core-1.0.0.js');
const corePos=html.indexOf('script-1.18.0.js');
assert.ok(inputPos>=0&&prePos>inputPos&&corePos>prePos,'ordem deve manter input helpers -> pré-cadastro -> core');
assert.match(html,/core_mod=20260911-phase4q-r1/,'cache-bust do monólito deve acompanhar a modularização corrente após 4K');

console.log('Core Modularization Phase 4K: patient pre-registration selector extracted with 2h filter, active-context exception and clinical load trigger preserved.');
