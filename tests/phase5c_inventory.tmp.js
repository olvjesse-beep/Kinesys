import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const textExtensions = new Set([
  '.js', '.mjs', '.cjs', '.html', '.htm', '.css', '.md',
  '.yml', '.yaml', '.json', '.php', '.txt', '.sql'
]);
const ignoredDirs = new Set(['.git', 'node_modules']);

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory() && ignoredDirs.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (textExtensions.has(path.extname(entry.name).toLowerCase())) out.push(full);
  }
  return out;
}

const allTextFiles = walk(root);
const rootCss = fs.readdirSync(root, { withFileTypes: true })
  .filter(entry => entry.isFile() && entry.name.toLowerCase().endsWith('.css'))
  .map(entry => entry.name);

const rows = [];
for (const basename of rootCss) {
  const self = path.join(root, basename);
  const hits = [];
  let occurrences = 0;

  for (const full of allTextFiles) {
    if (full === self) continue;
    let text;
    try { text = fs.readFileSync(full, 'utf8'); }
    catch { continue; }
    if (!text.includes(basename)) continue;
    const count = text.split(basename).length - 1;
    occurrences += count;
    hits.push(path.relative(root, full).replace(/\\/g, '/'));
  }

  rows.push({
    file: basename,
    bytes: fs.statSync(self).size,
    refs: hits.length,
    occurrences,
    hits,
    risk: /clinical|avaliacao|evaluation|radar|financeiro|agenda|login|access/i.test(basename)
      ? 'domain'
      : 'generic'
  });
}

rows.sort((a, b) => a.refs - b.refs || a.risk.localeCompare(b.risk) || a.bytes - b.bytes || a.file.localeCompare(b.file));

console.log(`PHASE5C_ROOT_CSS_TOTAL=${rows.length}`);
for (const row of rows) {
  console.log([
    `file=${row.file}`,
    `bytes=${row.bytes}`,
    `ref_files=${row.refs}`,
    `occurrences=${row.occurrences}`,
    `risk=${row.risk}`,
    `refs=${row.hits.join(',') || '-'}`
  ].join(' | '));
}
