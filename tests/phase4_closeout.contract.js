import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const exists = rel => fs.existsSync(path.join(root, rel));

const html = read('index.html');
const strip = value => String(value || '').split('#')[0].split('?')[0].replace(/^\//, '');
const isLocal = value => value && !/^(?:https?:|data:|\/\/)/i.test(value);

const scripts = [...html.matchAll(/<script\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi)]
  .map(match => match[1])
  .filter(isLocal)
  .map(strip);
const styles = [...html.matchAll(/<link\b[^>]*\bhref=["']([^"']+)["'][^>]*>/gi)]
  .map(match => match[1])
  .filter(isLocal)
  .map(strip);
const assets = [...scripts, ...styles];

assert.equal(new Set(assets).size, assets.length, 'index.html não deve carregar asset local duplicado');
for (const asset of assets) {
  assert.ok(exists(asset), `asset local referenciado pelo index.html deve existir: ${asset}`);
}

assert.equal(
  scripts.filter(item => item === 'script-1.18.0.js').length,
  1,
  'o monólito ativo script-1.18.0.js deve ser carregado exatamente uma vez'
);

const legacyDirectRefs = [
  'script.js',
  'script-1.17.0.js',
  'script-1.17.1.js',
  'agenda.js',
  'agenda-audit__agenda-1.20.0.js',
  'KineSys_v1.15.0_DEPLOY_APP.zip'
];
for (const legacy of legacyDirectRefs) {
  assert.ok(!assets.includes(legacy), `legado não deve voltar ao carregamento direto do runtime: ${legacy}`);
}

function walk(dir, output = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === '.git' || entry.name === 'node_modules') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, output);
    else output.push(full);
  }
  return output;
}

const tempNamePattern = /phase4[a-z0-9_-]*(?:temp|preflight|extract)/i;
const tempArtifacts = walk(root)
  .map(full => path.relative(root, full).replace(/\\/g, '/'))
  .filter(rel => tempNamePattern.test(path.basename(rel)));

assert.deepEqual(
  tempArtifacts,
  [],
  `artefatos temporários da Phase 4 não devem permanecer após o closeout: ${tempArtifacts.join(', ')}`
);

console.log(
  `Phase 4 Closeout Contract OK — ${scripts.length} scripts locais, ${styles.length} estilos locais, sem assets ausentes, duplicados ou artefatos temporários.`
);
