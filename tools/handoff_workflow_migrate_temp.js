const fs = require('fs');
const path = require('path');

const root = process.cwd();
const workflowsDir = path.join(root,'.github','workflows');
const outDir = path.join(root,'tools','handoff_workflow_output_temp');
fs.rmSync(outDir,{recursive:true,force:true});
fs.mkdirSync(outDir,{recursive:true});

function walk(dir,out=[]) {
  if (!fs.existsSync(dir)) return out;
  for (const ent of fs.readdirSync(dir,{withFileTypes:true})) {
    const full=path.join(dir,ent.name);
    if (ent.isDirectory()) walk(full,out); else out.push(full);
  }
  return out;
}

const movedFiles = [
  ...walk(path.join(root,'src')).filter(f=>f.endsWith('.js')),
  ...walk(path.join(root,'styles')).filter(f=>f.endsWith('.css'))
];
const map = new Map();
for (const full of movedFiles) {
  const rel=path.relative(root,full).replace(/\\/g,'/');
  const base=path.basename(rel);
  // Files that were already in styles before Phase 5D did not come from root.
  if (['design_polish.css','design_experience.css'].includes(base)) continue;
  map.set(base,rel);
}

function migrate(text) {
  let out=text;
  for (const [base,rel] of map) out=out.split(base).join(rel);
  out=out
    .replaceAll('clinical_reasoning_*.js','src/clinical/clinical_reasoning_*.js')
    .replaceAll('clinical_reasoning_*.css','styles/clinical_reasoning_*.css')
    .replaceAll('clinical_engine*.js','src/clinical/clinical_engine*.js')
    .replaceAll('cirurgias-*.js','src/clinical/cirurgias-*.js')
    .replaceAll('script-*.js','src/core/script-*.js');
  return out;
}

const changed=[];
for (const name of fs.readdirSync(workflowsDir).filter(n=>/\.ya?ml$/i.test(n)).sort()) {
  if (/^handoff-(?:inventory|reorg-apply)-temp\.yml$/i.test(name)) continue;
  const original=fs.readFileSync(path.join(workflowsDir,name),'utf8');
  const next=migrate(original);
  if (next===original) continue;
  fs.writeFileSync(path.join(outDir,name),next,'utf8');
  changed.push(name);
}
fs.writeFileSync(path.join(outDir,'manifest.json'),JSON.stringify({changed},null,2)+'\n','utf8');
console.log(`Generated ${changed.length} workflow migrations.`);
changed.forEach(n=>console.log(n));
