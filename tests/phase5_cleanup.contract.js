import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const exists = rel => fs.existsSync(path.join(root, rel));

const removedArtifacts = [
  'KineSys_v1.15.0_DEPLOY_APP.zip',
  'agenda-audit__agenda-1.20.0.js',
  'design_system-1.17.1.js',
  'design_system-1.18.0.js',
  'design_system-1.18.1.js',
  'design_system-1.18.2.js',
  'design_system-1.18.4.js',
  'design_system-1.18.5.js',
  'financeiro_workspace-1.19.0.js',
  'financeiro_workspace-1.19.0.css',
  'financeiro_workspace-1.20.0.js',
  'financeiro_workspace-1.20.0.css',
  'home_detalhes-1.18.2.js',
  'home_detalhes-1.18.4.js',
  'home_fisioterapeuta_util-1.23.0.js',
  'home_fisioterapeuta_util-1.23.0.css',
  'design_home_activity-1.18.2.css',
  'design_home_activity-1.18.4.css'
];

for (const artifact of removedArtifacts) {
  assert.equal(exists(artifact), false, `artefato legado removido não deve voltar ao repositório: ${artifact}`);
}

assert.equal(exists('design_system-1.20.1.js'), true, 'Design System ativo deve permanecer disponível');
assert.equal(exists('financeiro_workspace-1.20.1.js'), true, 'Financeiro workspace JS ativo deve permanecer disponível');
assert.equal(exists('financeiro_workspace-1.20.1.css'), true, 'Financeiro workspace CSS ativo deve permanecer disponível');
assert.equal(exists('home_detalhes-1.18.5.js'), true, 'Home detalhes ativo deve permanecer disponível');
assert.equal(exists('home_fisioterapeuta_util-1.24.0.js'), true, 'Home fisioterapeuta util JS ativo deve permanecer disponível');
assert.equal(exists('home_fisioterapeuta_util-1.24.0.css'), true, 'Home fisioterapeuta util CSS ativo deve permanecer disponível');
assert.equal(exists('design_home_activity-1.18.5.css'), true, 'Home activity CSS ativo deve permanecer disponível');

console.log(`Phase 5 Cleanup Contract OK — ${removedArtifacts.length} artefatos legados permanecem ausentes e os sucessores ativos estão preservados.`);
