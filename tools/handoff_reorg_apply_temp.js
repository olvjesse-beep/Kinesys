const fs = require('fs');
const path = require('path');

const root = process.cwd();
const rootFiles = fs.readdirSync(root, {withFileTypes:true}).filter(e=>e.isFile()).map(e=>e.name).sort();

function jsDest(name) {
  const n = name.toLowerCase();
  if (n.startsWith('agenda')) return `src/agenda/${name}`;
  if (n.includes('finance') || n.includes('credito') || n.includes('pendencia') || n.includes('desconto') || n.includes('balanco')) return `src/finance/${name}`;
  if (n.includes('patient') || n.includes('paciente') || n.startsWith('prontuario')) return `src/patient/${name}`;
  if (n.includes('clinical') || n.includes('hma') || n.includes('cirurgia') || n.startsWith('avaliacao_') || n.startsWith('evaluation_') || n.startsWith('proms_')) return `src/clinical/${name}`;
  if (n === 'access_admin-1.0.0.js' || n === 'analise_admin-1.19.0.js' || n === 'team_management_core-1.0.0.js') return `src/admin/${name}`;
  if (n === 'login_access-1.18.0.js' || n === 'login_ui_helpers_core-1.0.0.js') return `src/auth/${name}`;
  if (n.startsWith('home_')) return `src/home/${name}`;
  if (n.includes('report') || n.includes('relatorio')) return `src/reports/${name}`;
  if (n === 'screen_loader-1.25.0.js' || n === 'input_helpers_core-1.0.0.js' || n === 'menu_dropdown-1.0.0.js' || n === 'ui_experience.js' || n === 'ui_refinement.js') return `src/ui/${name}`;
  return `src/core/${name}`;
}

const moves = [];
for (const name of rootFiles) {
  const ext = path.extname(name).toLowerCase();
  if (ext === '.css') moves.push([name, `styles/${name}`]);
  else if (ext === '.js') moves.push([name, jsDest(name)]);
}

const TEXT_EXTS = new Set(['.js','.css','.html','.htm','.php','.json','.md','.yml','.yaml','.txt','.sql','.xml','.webmanifest']);
const SKIP_PREFIXES = ['.git/','.agents/','.impeccable/','DESIGN_SYSTEM/','docs/'];
function walk(dir, out=[]) {
  for (const ent of fs.readdirSync(dir,{withFileTypes:true})) {
    const full = path.join(dir,ent.name);
    const rel = path.relative(root,full).replace(/\\/g,'/');
    if (ent.isDirectory()) {
      if (ent.name === '.git' || ent.name === 'node_modules') continue;
      walk(full,out);
    } else out.push(rel);
  }
  return out;
}
function shouldRewrite(rel) {
  if (!TEXT_EXTS.has(path.extname(rel).toLowerCase())) return false;
  if (SKIP_PREFIXES.some(p=>rel.startsWith(p))) return false;
  if (rel.startsWith('tools/handoff_') && rel.endsWith('_temp.js')) return false;
  return true;
}
function regexLiteral(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
}

const allFiles = walk(root);
const rewriteFiles = allFiles.filter(shouldRewrite);
let replacements = 0;
let escapedReplacements = 0;
for (const rel of rewriteFiles) {
  const full = path.join(root,rel);
  let text;
  try { text = fs.readFileSync(full,'utf8'); } catch { continue; }
  const original = text;
  for (const [src,dst] of moves) {
    if (text.includes(src)) {
      const parts = text.split(src);
      replacements += parts.length - 1;
      text = parts.join(dst);
    }
    const escapedSrc = regexLiteral(src);
    const escapedDst = regexLiteral(dst);
    if (text.includes(escapedSrc)) {
      const parts = text.split(escapedSrc);
      escapedReplacements += parts.length - 1;
      text = parts.join(escapedDst);
    }
  }
  // Glob/path patterns not covered by exact filenames.
  text = text
    .replaceAll('clinical_reasoning_*.js','src/clinical/clinical_reasoning_*.js')
    .replaceAll('clinical_reasoning_*.css','styles/clinical_reasoning_*.css')
    .replaceAll('clinical_engine*.js','src/clinical/clinical_engine*.js')
    .replaceAll('cirurgias-*.js','src/clinical/cirurgias-*.js')
    .replaceAll('script-*.js','src/core/script-*.js');
  if (text !== original) fs.writeFileSync(full,text,'utf8');
}

for (const [src,dst] of moves) {
  const from = path.join(root,src);
  const to = path.join(root,dst);
  fs.mkdirSync(path.dirname(to),{recursive:true});
  if (fs.existsSync(to)) throw new Error(`Destination already exists: ${dst}`);
  fs.renameSync(from,to);
}

const designBase = path.join(root,'styles/design_base.css');
if (fs.existsSync(designBase)) {
  let css = fs.readFileSync(designBase,'utf8');
  css = css.replace(/url\((['"]?)assets\//g,'url($1../assets/');
  fs.writeFileSync(designBase,css,'utf8');
}

const leftovers = fs.readdirSync(root,{withFileTypes:true})
  .filter(e=>e.isFile() && ['.js','.css'].includes(path.extname(e.name).toLowerCase()))
  .map(e=>e.name);
if (leftovers.length) throw new Error('Root JS/CSS leftovers: ' + leftovers.join(', '));

const expectedRoot = ['DESIGN.md','PRODUCT.md','default.php','index.html','recuperar-acesso.html'].sort();
const actualRoot = fs.readdirSync(root,{withFileTypes:true}).filter(e=>e.isFile()).map(e=>e.name).sort();
const unexpected = actualRoot.filter(n=>!expectedRoot.includes(n));
const missing = expectedRoot.filter(n=>!actualRoot.includes(n));
if (unexpected.length || missing.length) {
  throw new Error(`Unexpected root state. unexpected=${unexpected.join(',')} missing=${missing.join(',')}`);
}

console.log(`Applied ${moves.length} moves, ${replacements} literal replacements and ${escapedReplacements} escaped-path replacements.`);
console.log('Root files: ' + actualRoot.join(', '));
