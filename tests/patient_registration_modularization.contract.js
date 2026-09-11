'use strict';
const fs=require('fs');
const assert=require('assert');
const core=fs.readFileSync('script-1.18.0.js','utf8');
const reg=fs.readFileSync('patient_registration_core-1.0.0.js','utf8');
const index=fs.readFileSync('index.html','utf8');

for(const fn of ['salvarCadastroSomente','salvarEIniciarAvaliacao','editarCadastro']){
  assert.match(reg,new RegExp(`async function ${fn}\\(`),`${fn} deve existir no módulo de cadastro`);
  assert.doesNotMatch(core,new RegExp(`async function ${fn}\\(`),`${fn} não pode permanecer duplicada no monólito`);
  assert.match(reg,new RegExp(`window\\.${fn}\\s*=\\s*${fn}`),`${fn} deve preservar contrato global`);
}

assert.match(core,/async function salvarPacienteNaNuvem\(pacienteObjeto, opcoes = \{\}\)/,'persistência central deve continuar no monólito nesta fase');
assert.match(core,/async function carregarPacienteParaEdicao\(/,'edição clínica do prontuário deve permanecer fora do escopo da 4N');

const saveStart=reg.indexOf('async function salvarCadastroSomente');
const startEval=reg.indexOf('async function salvarEIniciarAvaliacao');
const editStart=reg.indexOf('async function editarCadastro');
assert.ok(saveStart>=0&&startEval>saveStart&&editStart>startEval,'ordem histórica das três APIs deve ser preservada');
const saveBlock=reg.slice(saveStart,startEval);
assert.match(saveBlock,/obterPacientesBasicos\(\)/,'cadastro deve manter verificação leve de CPF');
assert.match(saveBlock,/obterPacienteCompletoPorId\(pacienteAtualId\)/,'edição deve preservar histórico completo do paciente');
assert.match(saveBlock,/salvarPacienteNaNuvem\(novoPaciente\)/,'cadastro deve continuar usando persistência central');
assert.match(saveBlock,/validarResponsavelCadastro\(\)/,'validação de responsável deve permanecer');

const evalBlock=reg.slice(startEval,editStart);
assert.match(evalBlock,/telaPermitida\('tela_avaliacao'\)/,'perfil sem Avaliação deve continuar protegido');
assert.match(evalBlock,/await salvarCadastroSomente\(false\)/,'salvar + avaliar deve reutilizar o mesmo cadastro');
assert.match(evalBlock,/navegarPara\('tela_avaliacao', true\)/,'navegação para Avaliação deve permanecer explícita');

const editBlock=reg.slice(editStart);
assert.match(editBlock,/obterPacientesBasicos\(\)/,'abrir edição deve continuar usando índice leve');
assert.match(editBlock,/navegarPara\('tela_cadastro', true\)/,'edição deve continuar abrindo a tela de cadastro');
assert.match(editBlock,/atualizarAcoesCadastroPorPerfil\(\)/,'ações por perfil devem continuar sincronizadas');

const corePos=index.indexOf('script-1.18.0.js');
const delPos=index.indexOf('patient_deletion_core-1.0.0.js');
const chartPos=index.indexOf('patient_chart_read_core-1.0.0.js');
const regPos=index.indexOf('patient_registration_core-1.0.0.js');
const loaderPos=index.indexOf('screen_loader-1.25.0.js');
assert.ok(corePos>=0&&delPos>corePos&&chartPos>delPos&&regPos>chartPos,'cadastro deve carregar depois das dependências de prontuário');
assert.ok(loaderPos<0||regPos<loaderPos,'cadastro deve estar disponível antes dos fluxos de tela posteriores');
assert.match(index,/core_mod=20260911-phase4o-r1/,'cache-buster do core deve acompanhar a Phase 4N');

const regSize=fs.statSync('patient_registration_core-1.0.0.js').size;
const coreSize=fs.statSync('script-1.18.0.js').size;
assert.ok(regSize>4000,'extração parece pequena demais para conter o fluxo real de cadastro');
assert.ok(coreSize<703202,`monólito deve reduzir em relação à 4M; atual=${coreSize}`);
console.log(`Patient registration modularization: OK | module=${regSize} bytes | monolith=${coreSize} bytes`);
