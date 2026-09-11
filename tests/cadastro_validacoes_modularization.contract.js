'use strict';
const fs=require('fs');
const assert=require('assert');

const core=fs.readFileSync('script-1.18.0.js','utf8');
const cadastro=fs.readFileSync('cadastro_validacoes_core-1.0.0.js','utf8');
const html=fs.readFileSync('index.html','utf8');

assert(!core.includes('VALIDAÇÕES CADASTRAIS — v1.8.2'), 'Validações cadastrais ainda estão embutidas no monólito');
assert(!core.includes('CEP INTELIGENTE (v1.8.2)'), 'CEP inteligente ainda está embutido no monólito');
assert(cadastro.includes('VALIDAÇÕES CADASTRAIS — v1.8.2'), 'Módulo perdeu validações cadastrais');
assert(cadastro.includes('CEP INTELIGENTE (v1.8.2)'), 'Módulo perdeu CEP inteligente');

for(const fn of ['somenteDigitos','formatarCPF','formatarCEP','formatarTelefoneBR','cpfValido','cepValido','telefoneBRValido','definirEstadoCampo','limparEstadoCampo','validarCPFInput','validarCEPInput','definirStatusCEP','consultarCEPAutomaticamente','buscarCEPPeloBotao','validarTelefoneInput','alternarCamposResponsavel','validarResponsavelCadastro','configurarValidacoesCadastrais']) {
  assert(cadastro.includes(`function ${fn}(`) || cadastro.includes(`async function ${fn}(`), `Módulo perdeu ${fn}`);
}
assert(cadastro.includes("const cacheCEP = new Map();"), 'cache CEP deve permanecer encapsulado no módulo');
assert(cadastro.includes('let consultaCEPController = null;'), 'AbortController do CEP deve permanecer encapsulado no módulo');
assert(cadastro.includes("let ultimoCEPPesquisado = '';"), 'estado do último CEP deve permanecer encapsulado no módulo');
assert(!/\b(?:cacheCEP|consultaCEPController|ultimoCEPPesquisado)\b/.test(core), 'Estado interno do CEP não pode vazar para o core');
assert(cadastro.includes("function definirUltimoCEPPesquisadoKineSys(valor = '')"), 'Módulo deve expor sincronização mínima do último CEP');
assert(core.includes("definirUltimoCEPPesquisadoKineSys('');"), 'limpeza pós-salvamento deve preservar reset do último CEP');
assert(core.includes("definirUltimoCEPPesquisadoKineSys(p.cep || '');"), 'edição deve preservar sincronização do CEP carregado');
assert(cadastro.includes("document.addEventListener('DOMContentLoaded', configurarValidacoesCadastrais);"), 'bootstrap das validações deve permanecer registrado');

const cadastroTag='<script defer src="cadastro_validacoes_core-1.0.0.js?v=20260911-phase4e-r1"></script>';
const escapeTag='<script defer src="html_escape-1.0.0.js?v=20260911-phase4c-r1"></script>';
const mediaTag='<script defer src="midias_core-1.0.0.js?v=20260911-phase4d-r1"></script>';
const coreNeedle='<script defer src="script-1.18.0.js';
assert(html.includes(cadastroTag), 'index.html não carrega cadastro_validacoes_core');
assert(html.indexOf(escapeTag)<html.indexOf(cadastroTag), 'HTML escape deve carregar antes das validações cadastrais');
assert(html.indexOf(cadastroTag)<html.indexOf(mediaTag), 'validações cadastrais devem manter ordem eager determinística antes de Mídias');
assert(html.indexOf(cadastroTag)<html.indexOf(coreNeedle), 'validações cadastrais devem carregar antes do core consumidor');

console.log('Cadastro validations modularization contract Phase 4E: OK');
