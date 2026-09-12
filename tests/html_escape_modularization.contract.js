const fs=require('fs');
const vm=require('vm');
const assert=require('assert');

const core=fs.readFileSync('src/core/script-1.18.0.js','utf8');
const mod=fs.readFileSync('src/core/html_escape-1.0.0.js','utf8');
const html=fs.readFileSync('index.html','utf8');

assert(!core.includes('function escapeHTML(valor)'), 'escapeHTML ainda está embutida no core');
assert(mod.includes('function escapeHTML(valor)'), 'Módulo extraído perdeu escapeHTML');
assert(mod.includes('.replace(/&/g, "&amp;")'), 'Escape de & mudou');
assert(mod.includes('.replace(/</g, "&lt;")'), 'Escape de < mudou');
assert(mod.includes('.replace(/>/g, "&gt;")'), 'Escape de > mudou');
assert(mod.includes('.replace(/\\"/g, "&quot;")') || mod.includes('.replace(/"/g, "&quot;")'), 'Escape de aspas duplas mudou');
assert(mod.includes('.replace(/\'/g, "&#039;")'), 'Escape de aspas simples mudou');

const guardTag='<script defer src="src/core/operation_guard-1.0.0.js?v=20260911-phase4b-r1"></script>';
const escapeTag='<script defer src="src/core/html_escape-1.0.0.js?v=20260911-phase4c-r1"></script>';
const coreNeedle='<script defer src="src/core/script-1.18.0.js';
assert(html.includes(escapeTag), 'index.html não carrega html_escape extraído');
assert(html.indexOf(guardTag) < html.indexOf(escapeTag), 'Ordem eager deve preservar operation guard antes de html_escape');
assert(html.indexOf(escapeTag) < html.indexOf(coreNeedle), 'html_escape deve carregar antes do core');

const context={};
vm.createContext(context);
vm.runInContext(mod,context,{filename:'src/core/html_escape-1.0.0.js'});
assert.strictEqual(context.escapeHTML(null),'');
assert.strictEqual(context.escapeHTML(undefined),'');
assert.strictEqual(context.escapeHTML('<div a="x">Tom & Jerry\'s</div>'),'&lt;div a=&quot;x&quot;&gt;Tom &amp; Jerry&#039;s&lt;/div&gt;');
assert.strictEqual(context.escapeHTML(123), '123');

console.log('HTML escape modularization contract Phase 4C: OK');
