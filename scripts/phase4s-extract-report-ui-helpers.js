'use strict';

import fs from 'node:fs';

const CORE_PATH = 'script-1.18.0.js';
const INDEX_PATH = 'index.html';
const MODULE_PATH = 'report_ui_helpers_core-1.0.0.js';

let core = fs.readFileSync(CORE_PATH, 'utf8');
let index = fs.readFileSync(INDEX_PATH, 'utf8');

function takeRange(startMarker, endMarker, label) {
  const start = core.indexOf(startMarker);
  if (start < 0) throw new Error(`Início não encontrado para ${label}`);
  const end = core.indexOf(endMarker, start);
  if (end < 0) throw new Error(`Fim não encontrado para ${label}`);
  const block = core.slice(start, end).trim();
  if (!block.startsWith(startMarker)) throw new Error(`Bloco inválido para ${label}`);
  core = core.slice(0, start) + core.slice(end);
  return block;
}

function takeLine(marker, label) {
  const pos = core.indexOf(marker);
  if (pos < 0) throw new Error(`Linha não encontrada para ${label}`);
  if (core.indexOf(marker, pos + marker.length) >= 0) throw new Error(`Marcador duplicado para ${label}`);
  const start = core.lastIndexOf('\n', pos) + 1;
  const endPos = core.indexOf('\n', pos);
  const end = endPos < 0 ? core.length : endPos + 1;
  const line = core.slice(start, end).trim();
  core = core.slice(0, start) + core.slice(end);
  return line;
}

const montarDocumento = takeRange(
  'function montarDocumentoComTimbrado(htmlConteudo) {',
  '/* ==========================================================================\n   1) COMPARECIMENTO',
  'montarDocumentoComTimbrado'
);

const endpointGemini = takeRange(
  'function endpointGemini(modelo) {',
  '/* gerarDocumentoComIA legado removido na v1.4 */',
  'endpointGemini'
);

const minutos = takeLine('function minutosEntreHoras(inicio,fim)', 'minutosEntreHoras');
const duracao = takeLine('function atualizarDuracaoComparecimento()', 'atualizarDuracaoComparecimento');
const listener = takeLine("document.addEventListener('change',e=>{if(['rel_comp_entrada','rel_comp_saida']", 'listener duração comparecimento');
const dataBR = takeLine('function formatarDataBR(v)', 'formatarDataBR');

const module = `'use strict';\n\n/* Phase 4S — helpers de apresentação/formatação de documentos.\n * Sem persistência, Supabase, autorização ou regra clínica.\n */\n\n${[
  montarDocumento,
  endpointGemini,
  minutos,
  duracao,
  listener,
  dataBR
].join('\n\n')}\n`;

const forbidden = /_supabase|\.rpc\s*\(|localStorage|sessionStorage|PERMISSOES_POR_PERFIL|telaPermitida|salvarPacienteNaNuvem/;
if (forbidden.test(module)) throw new Error('Acoplamento proibido detectado no módulo 4S');

for (const fn of ['montarDocumentoComTimbrado','endpointGemini','minutosEntreHoras','atualizarDuracaoComparecimento','formatarDataBR']) {
  if (core.includes(`function ${fn}(`)) throw new Error(`${fn} permaneceu no monólito`);
  if (!module.includes(`function ${fn}(`)) throw new Error(`${fn} não foi extraída`);
}

let lines = index.split('\n');
const coreIdx = lines.findIndex(line => line.includes('script-1.18.0.js'));
if (coreIdx < 0) throw new Error('script-1.18.0.js não encontrado no index');
if (!index.includes('report_ui_helpers_core-1.0.0.js')) {
  const indent = (lines[coreIdx].match(/^\s*/) || ['    '])[0];
  lines.splice(coreIdx, 0, `${indent}<script defer src="report_ui_helpers_core-1.0.0.js?v=20260911-phase4s-r1"></script>`);
}
index = lines.join('\n');

const coreModMatches = index.match(/core_mod=20260911-phase4[a-z]+-r\d+/g) || [];
if (coreModMatches.length !== 1) throw new Error(`Esperado 1 core_mod Phase 4; encontrado ${coreModMatches.length}`);
index = index.replace(/core_mod=20260911-phase4[a-z]+-r\d+/, 'core_mod=20260911-phase4s-r1');

fs.writeFileSync(CORE_PATH, core);
fs.writeFileSync(MODULE_PATH, module);
fs.writeFileSync(INDEX_PATH, index);

console.log(`Phase 4S preparada: module=${Buffer.byteLength(module)} bytes; monolith=${Buffer.byteLength(core)} bytes`);
