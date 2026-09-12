const fs = require('fs');
const path = require('path');

const root = process.cwd();
const workflows = path.join(root, '.github', 'workflows');
const out = path.join(root, 'tools', 'selfhost_env_fix_output_temp');
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });

const changed = [];
const manifest = [];

function insertAfterCheckout(text, block) {
  const re = /(^\s*-\s+uses:\s+actions\/checkout@v4(?:\r?\n(?:\s+with:\r?\n(?:\s{10,}.*\r?\n)*))?)/m;
  const m = text.match(re);
  if (!m) throw new Error('checkout@v4 step not found');
  return text.replace(re, (match) => match + (match.endsWith('\n') ? '' : '\n') + block);
}

for (const name of fs.readdirSync(workflows).sort()) {
  if (!/\.ya?ml$/i.test(name) || name.includes('-temp.')) continue;
  const file = path.join(workflows, name);
  let text = fs.readFileSync(file, 'utf8');
  if (!text.includes('runs-on: [self-hosted, Windows, X64]')) continue;
  const before = text;
  const fixes = [];

  const needsNode = /(^|\n)\s*(?:node|npm|npx)\s/m.test(text);
  if (needsNode && !text.includes('actions/setup-node@')) {
    text = insertAfterCheckout(text, `      - name: Setup Node\n        uses: actions/setup-node@v4\n        with:\n          node-version: '22'\n`);
    fixes.push('setup-node');
  }

  const needsPython = /(^|\n)\s*python(?:3)?\s/m.test(text);
  if (needsPython && !text.includes('actions/setup-python@')) {
    text = insertAfterCheckout(text, `      - name: Setup Python\n        uses: actions/setup-python@v5\n        with:\n          python-version: '3.13'\n`);
    fixes.push('setup-python');
  }

  if (name === 'impeccable-detail-audit.yml') {
    text = text
      .replaceAll('/tmp/impeccable.json', '.impeccable-detail.json')
      .replaceAll('/tmp/impeccable.err', '.impeccable-detail.err');
    if (text !== before && !fixes.includes('portable-temp-path')) fixes.push('portable-temp-path');
  }

  if (text !== before) {
    fs.writeFileSync(path.join(out, name), text, 'utf8');
    changed.push(name);
    manifest.push({ name, fixes });
  }
}

fs.writeFileSync(path.join(out, 'manifest.json'), JSON.stringify({ changed, manifest }, null, 2) + '\n', 'utf8');
console.log(`Environment fixes generated for ${changed.length} workflow(s).`);
for (const item of manifest) console.log(`${item.name}: ${item.fixes.join(', ')}`);
if (!changed.length) throw new Error('No environment fixes were required.');
