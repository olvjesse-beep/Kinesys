import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const exists = rel => fs.existsSync(path.join(root, rel));

const removedArtifacts = [
  'KineSys_v1.15.0_DEPLOY_APP.zip',
  'agenda-audit__agenda-1.20.0.js'
];

for (const artifact of removedArtifacts) {
  assert.equal(exists(artifact), false, `artefato legado removido não deve voltar ao repositório: ${artifact}`);
}

console.log(`Phase 5 Cleanup Contract OK — ${removedArtifacts.length} artefatos legados permanecem ausentes.`);
