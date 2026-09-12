const fs = require('fs');
const path = require('path');

const root = process.cwd();
const SKIP_DIRS = new Set(['.git', 'node_modules']);
const TEXT_EXTS = new Set(['.js','.css','.html','.htm','.php','.json','.md','.yml','.yaml','.txt','.sql','.xml','.webmanifest']);

function walk(dir, out = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, ent.name);
    const rel = path.relative(root, full).replace(/\\/g, '/');
    if (ent.isDirectory()) {
      if (!SKIP_DIRS.has(ent.name)) walk(full, out);
    } else {
      out.push(rel);
    }
  }
  return out;
}

const allFiles = walk(root);
const textFiles = allFiles.filter(f => TEXT_EXTS.has(path.extname(f).toLowerCase()));
const contents = new Map();
for (const f of textFiles) {
  try { contents.set(f, fs.readFileSync(path.join(root, f), 'utf8')); } catch (_) {}
}

const rootFiles = fs.readdirSync(root, { withFileTypes: true })
  .filter(e => e.isFile())
  .map(e => e.name)
  .sort();

function refsFor(name) {
  const refs = [];
  for (const [f, text] of contents) {
    if (f === name) continue;
    if (text.includes(name)) refs.push(f);
  }
  return refs;
}

function category(name) {
  const n = name.toLowerCase();
  const ext = path.extname(n);
  if (['index.html','default.php','.htaccess','robots.txt','favicon.ico'].includes(n)) return 'entrypoint';
  if (n === 'design.md' || n === 'product.md') return 'tool-context';
  if (ext === '.css') return 'style';
  if (ext !== '.js') return 'other';
  if (n.includes('clinical') || n.includes('hma') || n.includes('cirurgia') || n.includes('avaliacao') || n.includes('evolucao')) return 'clinical';
  if (n.startsWith('agenda')) return 'agenda';
  if (n.includes('finance') || n.includes('credito') || n.includes('pendencia') || n.includes('desconto') || n.includes('balanco')) return 'finance';
  if (n.includes('patient') || n.includes('paciente') || n.includes('prontuario')) return 'patient';
  if (n.includes('admin') || n.includes('team') || n.includes('access') || n.includes('role') || n.includes('usuario') || n.includes('permiss')) return 'admin';
  if (n.includes('login') || n.includes('auth') || n.includes('session')) return 'auth';
  if (n.includes('report') || n.includes('relatorio')) return 'reports';
  if (n.includes('home')) return 'home';
  if (n.includes('ui') || n.includes('modal') || n.includes('toast') || n.includes('screen') || n.includes('loader') || n.includes('form') || n.includes('input')) return 'ui';
  return 'core-other';
}

const rows = rootFiles.map(name => {
  const refs = refsFor(name);
  return { name, ext: path.extname(name).toLowerCase() || '(none)', category: category(name), refs: refs.length, referencedBy: refs.slice(0, 12) };
});

const byCategory = {};
for (const row of rows) byCategory[row.category] = (byCategory[row.category] || 0) + 1;

console.log('=== HANDOFF INVENTORY ===');
console.log(`root_files=${rows.length}`);
console.log(`all_files=${allFiles.length}`);
console.log('categories=' + JSON.stringify(byCategory));
console.log('\n=== ROOT FILES ===');
for (const r of rows) console.log(`${r.category}\t${r.refs}\t${r.name}\t${r.referencedBy.join(',')}`);

console.log('\n=== ZERO-LITERAL-REF ROOT JS/CSS ===');
for (const r of rows.filter(r => (r.ext === '.js' || r.ext === '.css') && r.refs === 0)) console.log(`${r.category}\t${r.name}`);

console.log('\n=== EXISTING TOP-LEVEL DIRECTORIES ===');
for (const e of fs.readdirSync(root, { withFileTypes: true }).filter(e => e.isDirectory()).map(e => e.name).sort()) console.log(e);
