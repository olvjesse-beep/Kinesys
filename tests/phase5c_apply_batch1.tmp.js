import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const stylesDir = path.join(root, 'styles');
const indexPath = path.join(root, 'index.html');

const moves = [
  ['design_polish.css', 'styles/design_polish.css'],
  ['design_experience.css', 'styles/design_experience.css']
];

fs.mkdirSync(stylesDir, { recursive: true });

for (const [from, to] of moves) {
  const source = path.join(root, from);
  const target = path.join(root, to);
  if (!fs.existsSync(source)) throw new Error(`arquivo de origem ausente: ${from}`);
  if (fs.existsSync(target)) throw new Error(`destino já existe: ${to}`);
  fs.renameSync(source, target);
}

let html = fs.readFileSync(indexPath, 'utf8');
const replacements = [
  ['href="design_polish.css?v=20260909-clean-r2"', 'href="styles/design_polish.css?v=20260909-clean-r2"'],
  ['href="design_experience.css?v=20260909-ux-r1"', 'href="styles/design_experience.css?v=20260909-ux-r1"']
];

for (const [before, after] of replacements) {
  const count = html.split(before).length - 1;
  if (count !== 1) throw new Error(`esperava exatamente 1 ocorrência de ${before}; encontrado: ${count}`);
  html = html.replace(before, after);
}

fs.writeFileSync(indexPath, html, 'utf8');

for (const [from, to] of moves) {
  if (fs.existsSync(path.join(root, from))) throw new Error(`origem antiga ainda existe: ${from}`);
  if (!fs.existsSync(path.join(root, to))) throw new Error(`destino novo ausente: ${to}`);
}

console.log('Phase 5C batch 1 applied: 2 CSS moved to styles/ and index.html paths updated.');
