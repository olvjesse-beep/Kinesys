import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const exists = rel => fs.existsSync(path.join(root, rel));
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');

const resolvedLegacy = [
  'agenda.js',
  'design_clinical_direction.css',
  'cirurgias-1.17.0.js',
  'clinical_engine_v232.js',
  'script.js'
];

for (const artifact of resolvedLegacy) {
  assert.equal(exists(artifact), false, `legado resolvido na Phase 5B não deve retornar: ${artifact}`);
}

const activeSuccessors = [
  'src/agenda/agenda-1.20.0.js',
  'styles/design_clinical_direction-1.17.0.css',
  'src/clinical/cirurgias-1.18.0.js',
  'src/clinical/clinical_engine-1.17.0.js',
  'src/core/script-1.18.0.js'
];

for (const artifact of activeSuccessors) {
  assert.equal(exists(artifact), true, `sucessor ativo da Phase 5B deve permanecer disponível: ${artifact}`);
}

const cleanupContract = read('tests/phase5_cleanup.contract.js');
for (const artifact of resolvedLegacy) {
  assert.ok(
    cleanupContract.includes(`'${artifact}'`),
    `Phase 5 Cleanup Contract deve continuar protegendo o legado resolvido: ${artifact}`
  );
}

const html = read('index.html');
assert.match(
  html,
  /<script\b[^>]*\bsrc=["'][^"']*src\/core\/script-1\.18\.0\.js(?:[?"'])/i,
  'index.html deve continuar carregando src/core/script-1.18.0.js'
);
assert.ok(
  !/<script\b[^>]*\bsrc=["'][^"']*script\.js(?:[?"'])/i.test(html),
  'index.html não deve voltar a carregar script.js'
);
assert.ok(
  html.includes('styles/design_clinical_direction-1.17.0.css'),
  'index.html deve continuar apontando para styles/design_clinical_direction-1.17.0.css'
);

const screenLoader = read('src/ui/screen_loader-1.25.0.js');
for (const runtimeAsset of [
  'src/agenda/agenda-1.20.0.js',
  'styles/design_clinical_direction-1.17.0.css',
  'src/clinical/cirurgias-1.18.0.js',
  'src/clinical/clinical_engine-1.17.0.js'
]) {
  assert.ok(
    screenLoader.includes(runtimeAsset),
    `screen loader deve continuar apontando para o sucessor ativo: ${runtimeAsset}`
  );
}

assert.equal(exists('src/patient/prontuario_export.js'), true, 'fachada de exportação do prontuário deve permanecer disponível');
assert.equal(exists('src/patient/prontuario_export_impl.js'), true, 'implementação lazy de exportação deve permanecer disponível');
assert.ok(
  read('src/patient/prontuario_export.js').includes('src/patient/prontuario_export_impl.js'),
  'fachada de prontuário deve continuar carregando a implementação lazy'
);

function walk(dir, output = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === '.git' || entry.name === 'node_modules') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, output);
    else output.push(full);
  }
  return output;
}

const temporaryPattern = /phase5b[a-z0-9_-]*(?:temp|preflight|extract)/i;
const temporaryArtifacts = walk(root)
  .map(full => path.relative(root, full).replace(/\\/g, '/'))
  .filter(rel => temporaryPattern.test(path.basename(rel)));

assert.deepEqual(
  temporaryArtifacts,
  [],
  `artefatos temporários da Phase 5B não devem permanecer após o closeout: ${temporaryArtifacts.join(', ')}`
);

console.log(
  `Phase 5B Closeout Contract OK — ${resolvedLegacy.length} legados resolvidos permanecem ausentes, sucessores ativos e lazy loading preservados.`
);
