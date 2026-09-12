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

const dests = new Set();
let collision = false;
for (const [,dest] of moves) {
  if (dests.has(dest) || fs.existsSync(path.join(root,dest))) {
    console.log('COLLISION ' + dest);
    collision = true;
  }
  dests.add(dest);
}

console.log('=== REORGANIZATION PLAN ===');
console.log(`moves=${moves.length}`);
console.log(`root_after=${rootFiles.length - moves.length}`);
for (const [src,dst] of moves) console.log(`${src} -> ${dst}`);

console.log('\n=== CSS RELATIVE DEPENDENCIES ===');
let cssDeps = 0;
for (const [src] of moves.filter(([s])=>s.endsWith('.css'))) {
  const lines = fs.readFileSync(path.join(root,src),'utf8').split(/\r?\n/);
  lines.forEach((line,i)=>{
    if (/url\s*\(|@import\b/i.test(line)) {
      cssDeps++;
      console.log(`${src}:${i+1}: ${line.trim()}`);
    }
  });
}
console.log(`css_dependency_lines=${cssDeps}`);

console.log('\n=== DESTINATION COUNTS ===');
const counts = {};
for (const [,dst] of moves) {
  const dir = path.dirname(dst).replace(/\\/g,'/');
  counts[dir] = (counts[dir]||0)+1;
}
console.log(JSON.stringify(counts,null,2));

if (collision) process.exit(2);
