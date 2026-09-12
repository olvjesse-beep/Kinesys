const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const exists = (p) => fs.existsSync(path.join(root, p));
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

const failures = [];
const assert = (condition, message) => {
  if (!condition) failures.push(message);
};

assert(exists('styles/design_polish.css'), 'Missing styles/design_polish.css');
assert(exists('styles/design_experience.css'), 'Missing styles/design_experience.css');
assert(!exists('design_polish.css'), 'Legacy root design_polish.css must not return');
assert(!exists('design_experience.css'), 'Legacy root design_experience.css must not return');

assert(exists('DESIGN.md'), 'DESIGN.md must remain at repository root');
assert(exists('PRODUCT.md'), 'PRODUCT.md must remain at repository root');

const index = read('index.html');
assert(index.includes('href="styles/design_polish.css?v=20260909-clean-r2"'), 'index.html must reference styles/design_polish.css');
assert(index.includes('href="styles/design_experience.css?v=20260909-ux-r1"'), 'index.html must reference styles/design_experience.css');
assert(!index.includes('href="design_polish.css'), 'index.html must not reference root design_polish.css');
assert(!index.includes('href="design_experience.css'), 'index.html must not reference root design_experience.css');

const forbiddenTempFiles = [
  'tests/phase5c_inventory.tmp.js',
  'tests/phase5c_apply_batch1.tmp.js',
  '.github/workflows/phase5c-inventory.tmp.yml',
  '.github/workflows/phase5c-apply-batch1.tmp.yml'
];
for (const file of forbiddenTempFiles) {
  assert(!exists(file), `Temporary Phase 5C artifact must not remain: ${file}`);
}

if (failures.length) {
  console.error('Phase 5C closeout contract failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Phase 5C closeout contract passed.');
