const fs = require('fs');
const path = require('path');
const cp = require('child_process');

const root = process.cwd();
const expectedRoot = ['DESIGN.md','PRODUCT.md','default.php','index.html','recuperar-acesso.html'].sort();
const actualRoot = fs.readdirSync(root,{withFileTypes:true}).filter(e=>e.isFile()).map(e=>e.name).sort();
if (JSON.stringify(actualRoot)!==JSON.stringify(expectedRoot)) throw new Error('Root layout mismatch: '+actualRoot.join(','));

function walk(dir,out=[]) {
  for (const ent of fs.readdirSync(dir,{withFileTypes:true})) {
    const full=path.join(dir,ent.name);
    if (ent.isDirectory()) walk(full,out); else out.push(full);
  }
  return out;
}

const jsFiles = walk(path.join(root,'src')).filter(f=>f.endsWith('.js'));
for (const f of jsFiles) {
  const r=cp.spawnSync(process.execPath,['--check',f],{encoding:'utf8'});
  if (r.status!==0) throw new Error(`Syntax failed ${path.relative(root,f)}\n${r.stderr||r.stdout}`);
}
console.log(`JS syntax OK: ${jsFiles.length} runtime files`);

function localAssetRefs(htmlFile) {
  const text=fs.readFileSync(htmlFile,'utf8');
  const refs=[];
  for (const m of text.matchAll(/(?:src|href)=["']([^"']+)["']/gi)) {
    let ref=m[1];
    if (/^(?:https?:|data:|mailto:|tel:|#|javascript:)/i.test(ref)) continue;
    ref=ref.split('#')[0].split('?')[0];
    if (!ref) continue;
    refs.push(ref.replace(/^\.\//,''));
  }
  return refs;
}
for (const entry of ['index.html','recuperar-acesso.html']) {
  for (const ref of localAssetRefs(path.join(root,entry))) {
    if (!fs.existsSync(path.join(root,ref))) throw new Error(`${entry} missing local asset: ${ref}`);
  }
}
console.log('Entrypoint local assets exist');

for (const cssFile of walk(path.join(root,'styles')).filter(f=>f.endsWith('.css'))) {
  const text=fs.readFileSync(cssFile,'utf8');
  for (const m of text.matchAll(/url\((['"]?)([^)'"?]+)\1\)/gi)) {
    const ref=m[2].trim();
    if (/^(?:data:|https?:|#)/i.test(ref)) continue;
    const target=path.resolve(path.dirname(cssFile),ref);
    if (!fs.existsSync(target)) throw new Error(`${path.relative(root,cssFile)} missing url asset: ${ref}`);
  }
}
console.log('CSS local url() assets exist');

const testDir=path.join(root,'tests');
const runnable=fs.readdirSync(testDir)
  .filter(n=>/\.(?:contract|regression|adversarial|chaos)\.js$/i.test(n))
  .sort();
let passed=0;
for (const name of runnable) {
  const r=cp.spawnSync(process.execPath,[path.join(testDir,name)],{cwd:root,encoding:'utf8',timeout:120000});
  if (r.status!==0) {
    console.error(`FAILED ${name}`);
    console.error((r.stdout||'').slice(-4000));
    console.error((r.stderr||'').slice(-4000));
    process.exit(2);
  }
  passed++;
}
console.log(`Standalone contracts/regressions OK: ${passed}`);
