'use strict';

const fs = require('fs');
const vm = require('vm');
const assert = require('assert');

const html = fs.readFileSync('index.html','utf8');
const core = fs.readFileSync('script-1.18.0.js','utf8');
const mod = fs.readFileSync('report_ui_helpers_core-1.0.0.js','utf8');

const funcoes = [
  'montarDocumentoComTimbrado',
  'endpointGemini',
  'minutosEntreHoras',
  'atualizarDuracaoComparecimento',
  'formatarDataBR'
];

for (const fn of funcoes) {
  assert(!core.includes(`function ${fn}(`), `declaração ${fn} permaneceu no monólito`);
  assert(mod.includes(`function ${fn}(`), `módulo perdeu ${fn}`);
}

assert.doesNotMatch(mod, /_supabase|\.rpc\s*\(|localStorage|sessionStorage/,
  'helpers de relatório não devem acessar Supabase ou persistência');
assert.doesNotMatch(mod, /PERMISSOES_POR_PERFIL|telaPermitida|salvarPacienteNaNuvem|obterPacienteCompletoPorId/,
  'helpers de relatório não devem conter autorização ou persistência de paciente');
assert.doesNotMatch(mod, /estadoMapeamento|processarRadar|analisarHMA|clinical/i,
  'helpers de relatório não devem incorporar lógica do Motor Clínico');

const modulePos = html.indexOf('report_ui_helpers_core-1.0.0.js');
const corePos = html.indexOf('script-1.18.0.js');
assert.ok(modulePos >= 0 && corePos > modulePos, 'ordem deve manter report UI helpers antes do monólito');
assert.match(html, /report_ui_helpers_core-1\.0\.0\.js\?v=20260911-phase4s-r1/,
  'módulo 4S deve usar cache-buster próprio');
assert.match(html, /core_mod=20260911-phase4[a-z]+-r\d+/,
  'cache-bust do monólito deve permanecer versionado na série Phase 4');

function element(initial = {}) {
  return {
    value:'',
    innerHTML:'',
    style:{display:''},
    scrollCalls:[],
    scrollIntoView(options){ this.scrollCalls.push(options); },
    ...initial
  };
}

const documento = element();
const preview = element();
const entrada = element({value:'08:00'});
const saida = element({value:'09:30'});
const duracao = element();
const elements = {
  documento_impressao: documento,
  preview_relatorio_container: preview,
  rel_comp_entrada: entrada,
  rel_comp_saida: saida,
  rel_comp_duracao: duracao
};
const listeners = {};
const context = {
  document: {
    getElementById(id){ return elements[id] || null; },
    addEventListener(type, handler){ listeners[type] = handler; }
  },
  encodeURIComponent
};
vm.createContext(context);
vm.runInContext(mod, context, {filename:'report_ui_helpers_core-1.0.0.js'});

assert.equal(context.minutosEntreHoras('08:00','09:30'), 90);
assert.equal(context.minutosEntreHoras('09:30','08:00'), null);
assert.equal(context.minutosEntreHoras('','09:00'), null);
assert.equal(context.formatarDataBR('2026-09-11'), '11/09/2026');
assert.equal(context.formatarDataBR('texto'), 'texto');
assert.equal(context.endpointGemini('gemini 2.5/flash'),
  'https://generativelanguage.googleapis.com/v1beta/models/gemini%202.5%2Fflash:generateContent');

context.atualizarDuracaoComparecimento();
assert.equal(duracao.value, '1h 30min');
assert.equal(typeof listeners.change, 'function', 'listener de duração deve continuar registrado');
entrada.value='10:00'; saida.value='10:45';
listeners.change({target:{id:'rel_comp_saida'}});
assert.equal(duracao.value, '0h 45min');

context.montarDocumentoComTimbrado('<p>Conteúdo</p>');
assert.match(documento.innerHTML, /timbrado-fundo/);
assert.match(documento.innerHTML, /<p>Conteúdo<\/p>/);
assert.equal(preview.style.display, 'block');
assert.equal(preview.scrollCalls.length, 1);
assert.equal(preview.scrollCalls[0].behavior, 'smooth');

assert(core.includes('montarDocumentoComTimbrado('), 'consumidores do timbrado devem permanecer no runtime');
assert(core.includes('formatarDataBR('), 'consumidores de formatação de data devem permanecer no runtime');

console.log('Core Modularization Phase 4S: report UI helpers extracted without persistence, auth or clinical logic changes.');
