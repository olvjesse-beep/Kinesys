const fs = require('fs');
const path = require('path');

const root = process.cwd();
const workflowDir = path.join(root, '.github', 'workflows');
const outputDir = path.join(root, 'tools', 'selfhost_workflow_output_temp');
fs.rmSync(outputDir, { recursive: true, force: true });
fs.mkdirSync(outputDir, { recursive: true });

const bashShell = "'C:\\PROGRA~1\\Git\\bin\\bash.exe --noprofile --norc -eo pipefail {0}'";
const changed = [];
const suspicious = [];

for (const name of fs.readdirSync(workflowDir).sort()) {
  if (!/\.ya?ml$/i.test(name)) continue;
  if (name.includes('-temp.')) continue;
  const src = path.join(workflowDir, name);
  let text = fs.readFileSync(src, 'utf8');
  const original = text;

  const runnerRegex = /^(\s*)runs-on:\s*ubuntu-(?:latest|[0-9.]+)\s*$/gm;
  const hadHostedRunner = runnerRegex.test(text);
  runnerRegex.lastIndex = 0;
  if (!hadHostedRunner) continue;

  text = text.replace(runnerRegex, '$1runs-on: [self-hosted, Windows, X64]');
  text = text.replace(/^(\s*)shell:\s*bash\s*$/gm, `$1shell: ${bashShell}`);

  // Workflows written for ubuntu assume bash for bare `run:` steps. Apply one
  // explicit Git for Windows Bash default at workflow level, unless one exists.
  if (!/^defaults:\s*$/m.test(text)) {
    const jobsNeedle = /^jobs:\s*$/m;
    if (!jobsNeedle.test(text)) throw new Error(`No top-level jobs: block in ${name}`);
    text = text.replace(jobsNeedle, `defaults:\n  run:\n    shell: ${bashShell}\n\njobs:`);
  }

  const linuxOnlyPatterns = [
    /\bapt-get\b/i,
    /\bsudo\s+apt\b/i,
    /\bsystemctl\b/i,
    /\/home\/runner\b/i,
    /\bxvfb-run\b/i,
    /\bbrew\s+install\b/i
  ];
  const lines = text.split(/\r?\n/);
  lines.forEach((line, index) => {
    if (linuxOnlyPatterns.some(re => re.test(line))) {
      suspicious.push(`${name}:${index + 1}: ${line.trim()}`);
    }
  });

  if (text !== original) {
    fs.writeFileSync(path.join(outputDir, name), text, 'utf8');
    changed.push(name);
  }
}

const manifest = { changed, suspicious };
fs.writeFileSync(path.join(outputDir, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n', 'utf8');
console.log(`Generated ${changed.length} self-hosted workflow copies.`);
console.log(`Suspicious Linux-only lines: ${suspicious.length}`);
if (suspicious.length) console.log(suspicious.join('\n'));
if (!changed.length) throw new Error('No ubuntu-hosted workflows found to migrate.');
