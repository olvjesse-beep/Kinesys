import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const exists = rel => fs.existsSync(path.join(root, rel));
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');

const movedStyles = [
  ['design_polish.css', 'styles/design_polish.css'],
  ['design_experience.css', 'styles/design_experience.css']
];

for (const [legacyPath, organizedPath] of movedStyles) {
  assert.equal(exists(legacyPath), false, `CSS organizado não deve voltar à raiz: ${legacyPath}`);
  assert.equal(exists(organizedPath), true, `CSS organizado deve permanecer disponível: ${organizedPath}`);
  assert.ok(fs.statSync(path.join(root, organizedPath)).size > 0, `CSS organizado não pode estar vazio: ${organizedPath}`);
}

const html = read('index.html');
assert.ok(
  html.includes('href="styles/design_polish.css?v=20260909-clean-r2"'),
  'index.html deve carregar design_polish.css a partir de styles/'
);
assert.ok(
  html.includes('href="styles/design_experience.css?v=20260909-ux-r1"'),
  'index.html deve carregar design_experience.css a partir de styles/'
);
assert.ok(
  !html.includes('href="design_polish.css'),
  'index.html não deve voltar a carregar design_polish.css pela raiz'
);
assert.ok(
  !html.includes('href="design_experience.css'),
  'index.html não deve voltar a carregar design_experience.css pela raiz'
);

assert.equal(exists('DESIGN.md'), true, 'DESIGN.md deve permanecer na raiz como manifesto de design do projeto');
assert.equal(exists('PRODUCT.md'), true, 'PRODUCT.md deve permanecer na raiz como contexto de produto do projeto');
assert.ok(read('PRODUCT.md').includes('impeccable:product-schema'), 'PRODUCT.md deve preservar o schema do Impeccable');

for (const temporary of [
  'tests/phase5c_inventory.tmp.js',
  'tests/phase5c_apply_batch1.tmp.js',
  '.github/workflows/phase5c-inventory.tmp.yml',
  '.github/workflows/phase5c-apply-batch1.tmp.yml'
]) {
  assert.equal(exists(temporary), false, `artefato temporário da Phase 5C não deve permanecer: ${temporary}`);
}

console.log('Phase 5C Styles Batch 1 Contract OK — 2 CSS organizados em styles/, paths ativos e contexto Impeccable preservados.');
