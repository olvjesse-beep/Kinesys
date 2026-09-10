'use strict';

const fs=require('fs');
const assert=require('assert');

const html=fs.readFileSync('index.html','utf8');
const loader=fs.readFileSync('screen_loader-1.25.0.js','utf8');
const app=fs.readFileSync('script-1.18.0.js','utf8');
const fragmentPath='screens/tela_avaliacao.html';
assert.ok(fs.existsSync(fragmentPath),'fragmento físico da Avaliação deve existir');
const fragment=fs.readFileSync(fragmentPath,'utf8');

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

const lazyStyles=[
  'design_evaluation_workspace-1.18.0.css',
  'design_evaluation_context-1.18.3.css',
  'avaliacao_experiencia-1.22.0.css',
  'clinical_reasoning_hma-3.0.0.css',
  'clinical_reasoning_shoulder-3.1.0.css',
  'clinical_reasoning_elbow-3.1.0.css',
  'radar_clinico_focus-3.0.0.css',
  'dialog_rascunho_focus-1.0.0.css'
];

assert.match(html,/screen_loader-1\.25\.0\.js/,'index.html deve carregar o Screen Loader');
assert.match(loader,/tela_avaliacao\s*:/,'bundle da Avaliação deve existir');
assert.ok(loader.includes('screens/tela_avaliacao.html'),'bundle deve registrar o fragmento da Avaliação');
assert.match(loader,/kinesys:tela-ativada/,'ciclo de vida deve emitir ativação');
assert.match(loader,/kinesys:tela-desativada/,'ciclo de vida deve emitir desativação');
assert.match(loader,/kinesys:tela-dom-pronta/,'loader deve emitir montagem de DOM');
assert.match(loader,/revisaoNavegacao/,'navegação tardia deve proteger contra corrida de cliques');
assert.match(loader,/fetch\(bundle\.fragment/,'fragmento deve ser buscado somente sob demanda');
assert.match(loader,/replaceChildren/,'fragmento deve ser montado no placeholder preservado');
assert.match(loader,/kinesysFragmentState/,'estado de montagem do fragmento deve ser rastreável');

assert.match(html,/<section id="tela_avaliacao" class="tela"[^>]*data-kinesys-fragment="screens\/tela_avaliacao\.html[^\"]*"[^>]*><\/section>/,'index deve preservar somente o placeholder público da Avaliação');
assert.doesNotMatch(fragment,/<script\b/i,'fragmento da Avaliação não pode conter scripts');
assert.doesNotMatch(fragment,/\bid=["']tela_avaliacao["']/i,'fragmento não pode duplicar o ID público da tela');

const clinicalIds=['paciente_hma','subtela_triagem','subtela_mapeamento','subtela_diagnostico','ks-laudo-texto'];
for(const id of clinicalIds){
  const re=new RegExp(`\\bid=["']${id}["']`,'i');
  assert.ok(!re.test(html),`${id} deve ficar fora do DOM inicial`);
  assert.ok(re.test(fragment),`${id} deve permanecer no fragmento da Avaliação`);
}

const ids=text=>Array.from(text.matchAll(/\\bid=["']([^"']+)["']/gi),m=>m[1]);
const shellIds=ids(html),fragmentIds=ids(fragment);
assert.strictEqual(new Set(fragmentIds).size,fragmentIds.length,'fragmento não pode introduzir IDs duplicados internamente');
const shellSet=new Set(shellIds);
const collisions=fragmentIds.filter(id=>shellSet.has(id));
assert.deepStrictEqual(collisions,[],'fragmento não pode colidir IDs com o shell inicial');

for(const file of lazyScripts){
  const escaped=file.replace(/[.*+?^${}()|[\\]\\\\]/g,'\\\\$&');
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

for(const file of lazyStyles){
  const escaped=file.replace(/[.*+?^${}()|[\\]\\\\]/g,'\\\\$&');
  const eager=new RegExp(`<link[^>]+href=["'][^"']*${escaped}[^"']*["']`,'i');
  assert.ok(!eager.test(html),`${file} não pode voltar ao CSS inicial`);
  assert.ok(loader.includes(file),`${file} deve permanecer no bundle de estilos sob demanda`);
  assert.ok(fs.existsSync(file),`${file} deve existir fisicamente no repositório`);
}

const workspace=fs.readFileSync('evaluation_workspace-1.17.0.js','utf8');
const proms=fs.readFileSync('proms_escalas.js','utf8');
assert.match(workspace,/document\.readyState===['"]loading['"]/,'workspace deve inicializar também em carregamento tardio');
assert.match(workspace,/clinicaEstruturadaPreservada/,'workspace tardio deve recuperar o laudo preservado');
assert.match(proms,/document\.readyState===['"]loading['"]/,'PROMs deve inicializar também em carregamento tardio');
assert.match(app,/function inicializarAvaliacaoDomKineSys\(/,'app global deve possuir inicializador idempotente do DOM tardio');
assert.match(app,/kinesys:tela-dom-pronta/,'app global deve reagir à montagem tardia da Avaliação');
const waits=(app.match(/const navegacao = await navegarPara\('tela_avaliacao', true\);/g)||[]).length;
assert.strictEqual(waits,2,'os dois fluxos que preenchem a Avaliação devem aguardar sua montagem');

console.log(`Screen Loader contract Phase 2C: ${lazyScripts.length} JS + ${lazyStyles.length} CSS sob demanda; DOM da Avaliação externalizado (${Buffer.byteLength(fragment)} bytes).`);
