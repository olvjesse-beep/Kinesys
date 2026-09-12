const fs=require('fs');
const assert=require('assert');

const core=fs.readFileSync('src/core/script-1.18.0.js','utf8');
const menu=fs.readFileSync('src/ui/menu_dropdown-1.0.0.js','utf8');
const html=fs.readFileSync('index.html','utf8');

assert(!core.includes('CONTROLE DO MENU DROPDOWN'), 'Menu dropdown ainda está embutido no script principal');
assert(!core.includes('let menuTimeout = null'), 'Estado do menu ainda está no script principal');
assert(menu.includes('let menuTimeout = null'), 'Módulo extraído perdeu o estado do menu');
assert(menu.includes("document.addEventListener('DOMContentLoaded'"), 'Módulo extraído perdeu bootstrap DOMContentLoaded');
assert(menu.includes("window.addEventListener('resize'"), 'Módulo extraído perdeu ajuste responsivo');
assert(/setTimeout\(function\(\) \{\r?\n\s*fecharMenu\(\);\r?\n\s*\}, 200\)/.test(menu), 'Delay de saída do dropdown mudou');
assert(/setTimeout\(function\(\) \{\r?\n\s*fecharMenu\(\);\r?\n\s*\}, 300\)/.test(menu), 'Delay de saída do container mudou');

const menuTag='<script defer src="src/ui/menu_dropdown-1.0.0.js?v=20260911-phase4a-r1"></script>';
const coreNeedle='<script defer src="src/core/script-1.18.0.js';
assert(html.includes(menuTag), 'index.html não carrega o módulo de menu extraído');
assert(html.indexOf(menuTag) < html.indexOf(coreNeedle), 'Módulo de menu deve carregar antes do script principal');

console.log('Menu dropdown modularization contract Phase 4A: OK');
