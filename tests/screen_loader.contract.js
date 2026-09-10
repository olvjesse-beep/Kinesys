'use strict';

const fs=require('fs');
const assert=require('assert');

const html=fs.readFileSync('index.html','utf8');
const loader=fs.readFileSync('screen_loader-1.25.0.js','utf8');

const lazyScripts=[
  'clinical_engine-1.17.0.js',
  'evaluation_workspace-1.17.0.js',
  'proms_escalas.js',
  'evaluation_context_panels-1.18.3.js',
  'avaliacao_experiencia-1.22.0.js',
  'clinical_reasoning_hma-3.0.0.js',
  'clinical_reasoning_shoulder-3.1.0.js',
  'clinical_reasoning_elbow-3.1.0.js'
];

assert.match(html,/screen_loader-1\.25\.0\.js/,'index.html deve carregar o Screen Loader');
assert.match(loader,/tela_avaliacao\s*:/,'bundle da Avaliação deve existir');
assert.match(loader,/kinesys:tela-ativada/,'ciclo de vida deve emitir ativação');
assert.match(loader,/kinesys:tela-desativada/,'ciclo de vida deve emitir desativação');
assert.match(loader,/revisaoNavegacao/,'navegação tardia deve proteger contra corrida de cliques');

for(const file of lazyScripts){
  const escaped=file.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  const eager=new RegExp(`<script[^>]+src=["'][^"']*${escaped}[^"']*["']`,'i');
  assert.ok(!eager.test(html),`${file} não pode voltar ao carregamento inicial`);
  assert.ok(loader.includes(file),`${file} deve permanecer no bundle sob demanda`);
  assert.ok(fs.existsSync(file),`${file} deve existir fisicamente no repositório`);
}

let ultimaPosicao=-1;
for(const file of lazyScripts){
  const posicao=loader.indexOf(file);
  assert.ok(posicao>ultimaPosicao,`${file} deve manter a ordem histórica relativa do bundle da Avaliação`);
  ultimaPosicao=posicao;
}

const workspace=fs.readFileSync('evaluation_workspace-1.17.0.js','utf8');
const proms=fs.readFileSync('proms_escalas.js','utf8');
assert.match(workspace,/document\.readyState===['"]loading['"]/, 'workspace deve inicializar também em carregamento tardio');
assert.match(workspace,/clinicaEstruturadaPreservada/, 'workspace tardio deve recuperar o laudo preservado');
assert.match(proms,/document\.readyState===['"]loading['"]/, 'PROMs deve inicializar também em carregamento tardio');

console.log(`Screen Loader contract: ${lazyScripts.length} módulos de Avaliação sob demanda, ordenados e presentes no repositório.`);
