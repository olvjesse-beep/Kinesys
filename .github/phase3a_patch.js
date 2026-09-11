'use strict';
const fs=require('fs');
function replaceExact(path,from,to){
  let s=fs.readFileSync(path,'utf8');
  if(!s.includes(from))throw new Error(`Expected block not found in ${path}`);
  s=s.replace(from,to);
  fs.writeFileSync(path,s);
}
replaceExact('screen_loader-1.25.0.js',`                'clinical_reasoning_hma-3.0.0.css?v=20260910-r1',
                'clinical_reasoning_shoulder-3.1.0.css?v=20260910-r2',
                'clinical_reasoning_elbow-3.1.0.css?v=20260910-r1',
                'clinical_reasoning_wrist-3.1.0.css?v=20260910-r1',
                'clinical_reasoning_cervical-3.1.0.css?v=20260911-r1',
                'radar_clinico_focus-3.0.0.css?v=20260910-r1',`,`                'clinical_reasoning_hma-3.0.0.css?v=20260910-r1',
                'radar_clinico_focus-3.0.0.css?v=20260910-r1',`);
replaceExact('screen_loader-1.25.0.js',`                'clinical_reasoning_hma-3.0.0.js?v=20260910-perf-r2',
                'clinical_reasoning_shoulder-3.1.0.js?v=20260910-lang-r3&upperlimb=20260910-r1',
                'clinical_reasoning_elbow-3.1.0.js?v=20260910-r1&upperlimb=20260910-r1',
                'clinical_reasoning_wrist-3.1.0.js?v=20260910-r1&upperlimb=20260910-r1',
                'clinical_reasoning_cervical-3.1.0.js?v=20260911-r1'`,`                'clinical_reasoning_hma-3.0.0.js?v=20260910-perf-r2',
                'clinical_region_loader-1.0.0.js?v=20260911-phase3a-r1'`);

let test=fs.readFileSync('tests/screen_loader.contract.js','utf8');
function rep(from,to,label){
  if(!test.includes(from))throw new Error('Missing test block: '+label);
  test=test.replace(from,to);
}
rep(`const app=fs.readFileSync('script-1.18.0.js','utf8');`,`const app=fs.readFileSync('script-1.18.0.js','utf8');\nconst regionLoader=fs.readFileSync('clinical_region_loader-1.0.0.js','utf8');`,'region loader import');
rep(`  'clinical_reasoning_hma-3.0.0.js',
  'clinical_reasoning_shoulder-3.1.0.js',
  'clinical_reasoning_elbow-3.1.0.js',
  'clinical_reasoning_wrist-3.1.0.js',
  'clinical_reasoning_cervical-3.1.0.js'`,`  'clinical_reasoning_hma-3.0.0.js',
  'clinical_region_loader-1.0.0.js'`,'lazy scripts');
rep(`  'clinical_reasoning_hma-3.0.0.css',
  'clinical_reasoning_shoulder-3.1.0.css',
  'clinical_reasoning_elbow-3.1.0.css',
  'clinical_reasoning_wrist-3.1.0.css',
  'clinical_reasoning_cervical-3.1.0.css',
  'radar_clinico_focus-3.0.0.css',`,`  'clinical_reasoning_hma-3.0.0.css',
  'radar_clinico_focus-3.0.0.css',`,'lazy styles');
rep(`const lazyStyles=[`,`const regionalScripts=[
  'clinical_reasoning_shoulder-3.1.0.js',
  'clinical_reasoning_elbow-3.1.0.js',
  'clinical_reasoning_wrist-3.1.0.js',
  'clinical_reasoning_cervical-3.1.0.js'
];
const regionalStyles=[
  'clinical_reasoning_shoulder-3.1.0.css',
  'clinical_reasoning_elbow-3.1.0.css',
  'clinical_reasoning_wrist-3.1.0.css',
  'clinical_reasoning_cervical-3.1.0.css'
];

const lazyStyles=[`,'regional arrays');

const scriptMarker=`for(const file of lazyStyles){`;
if(!test.includes(scriptMarker))throw new Error('Missing marker before lazyStyles loop');
const regionalScriptChecks=`for(const file of regionalScripts){
  const escaped=file.replace(/[.*+?^${'${}'}()|[\\]\\\\]/g,'\\\\$&');
  const eager=new RegExp(\`<script[^>]+src=["'][^"']*${'${escaped}'}[^"']*["']\`,'i');
  assert.ok(!eager.test(html),\`${'${file}'} não pode voltar ao carregamento inicial\`);
  assert.ok(!loader.includes(file),\`${'${file}'} não deve permanecer no bundle base da Avaliação\`);
  assert.ok(regionLoader.includes(file),\`${'${file}'} deve permanecer no loader regional\`);
  assert.ok(fs.existsSync(file),\`${'${file}'} deve existir fisicamente no repositório\`);
}
let ultimaRegiao=-1;
for(const file of regionalScripts){
  const posicao=regionLoader.indexOf(file);
  assert.ok(posicao>ultimaRegiao,\`${'${file}'} deve preservar a ordem histórica no loader regional\`);
  ultimaRegiao=posicao;
}

`;
test=test.replace(scriptMarker,regionalScriptChecks+scriptMarker);

const styleMarker=`const phase4dClinicalStyles=`;
if(!test.includes(styleMarker))throw new Error('Missing phase4d style marker');
const regionalStyleChecks=`for(const file of regionalStyles){
  const escaped=file.replace(/[.*+?^${'${}'}()|[\\]\\\\]/g,'\\\\$&');
  const eager=new RegExp(\`<link[^>]+\\shref=["'][^"']*${'${escaped}'}[^"']*["']\`,'i');
  assert.ok(!eager.test(html),\`${'${file}'} não pode voltar ao CSS inicial\`);
  assert.ok(!loader.includes(file),\`${'${file}'} não deve permanecer no bundle base de estilos\`);
  assert.ok(regionLoader.includes(file),\`${'${file}'} deve permanecer no loader regional\`);
  assert.ok(fs.existsSync(file),\`${'${file}'} deve existir fisicamente no repositório\`);
}

`;
test=test.replace(styleMarker,regionalStyleChecks+styleMarker);
fs.writeFileSync('tests/screen_loader.contract.js',test);
