'use strict';

const fs = require('fs');

const CORE_PATH = 'script-1.18.0.js';
const HTML_PATH = 'index.html';
const MODULE_PATH = 'login_ui_helpers_core-1.0.0.js';
const NAMES = [
  'mostrarFeedbackLogin',
  'sincronizarEstadoAutenticacaoVisual',
  'mensagemErroAutenticacao'
];

function extractFunction(source, name) {
  const marker = `function ${name}(`;
  const start = source.indexOf(marker);
  if (start < 0) throw new Error(`Função não encontrada no monólito: ${name}`);
  const braceStart = source.indexOf('{', start);
  if (braceStart < 0) throw new Error(`Abertura não encontrada para: ${name}`);
  let depth = 0;
  let quote = null;
  let escaped = false;
  for (let i = braceStart; i < source.length; i++) {
    const ch = source[i];
    if (quote) {
      if (escaped) { escaped = false; continue; }
      if (ch === '\\') { escaped = true; continue; }
      if (ch === quote) quote = null;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') { quote = ch; continue; }
    if (ch === '{') depth++;
    if (ch === '}') {
      depth--;
      if (depth === 0) return { start, end: i + 1, text: source.slice(start, i + 1) };
    }
  }
  throw new Error(`Fechamento não encontrado para: ${name}`);
}

if (fs.existsSync(MODULE_PATH)) {
  console.log('Phase 4R já aplicada; nenhuma transformação necessária.');
  process.exit(0);
}

let core = fs.readFileSync(CORE_PATH, 'utf8');
const extracted = NAMES.map(name => extractFunction(core, name));

for (const item of [...extracted].sort((a, b) => b.start - a.start)) {
  core = core.slice(0, item.start) + core.slice(item.end);
}
core = core.replace(/\n{4,}/g, '\n\n\n');

const header = `'use strict';\n/* ==========================================================================\n   KineSys — Login UI Helpers Core 1.0.0\n   Phase 4R: feedback, estado visual e mensagens de erro do login extraídos\n   sem alteração de comportamento.\n   Não acessa Supabase, rede, persistência ou regras de autorização.\n   ========================================================================== */\n\n`;
fs.writeFileSync(MODULE_PATH, header + extracted.map(item => item.text).join('\n\n') + '\n', 'utf8');
fs.writeFileSync(CORE_PATH, core, 'utf8');

let html = fs.readFileSync(HTML_PATH, 'utf8');
const coreTagNeedle = '    <script defer src="script-1.18.0.js?';
const corePos = html.indexOf(coreTagNeedle);
if (corePos < 0) throw new Error('Tag do monólito não encontrada no index.html');
const moduleTag = '    <script defer src="login_ui_helpers_core-1.0.0.js?v=20260911-phase4r-r1"></script>\n';
html = html.slice(0, corePos) + moduleTag + html.slice(corePos);
html = html.replace('core_mod=20260911-phase4q-r1', 'core_mod=20260911-phase4r-r1');
if (!html.includes('core_mod=20260911-phase4r-r1')) throw new Error('Cache-buster do core não foi atualizado');
fs.writeFileSync(HTML_PATH, html, 'utf8');

console.log('Phase 4R aplicada.');
console.log(`Módulo: ${fs.statSync(MODULE_PATH).size} bytes`);
console.log(`Monólito: ${fs.statSync(CORE_PATH).size} bytes`);
