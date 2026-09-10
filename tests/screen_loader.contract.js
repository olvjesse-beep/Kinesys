'use strict';

const fs=require('fs');
const assert=require('assert');
const vm=require('vm');

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
  'design_clinical.css',
  'design_clinical_direction-1.17.0.css',
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
  const eager=new RegExp(`<link[^>]+\shref=["'][^"']*${escaped}[^"']*["']`,'i');
  assert.ok(!eager.test(html),`${file} não pode voltar ao CSS inicial`);
  assert.ok(loader.includes(file),`${file} deve permanecer no bundle de estilos sob demanda`);
  assert.ok(fs.existsSync(file),`${file} deve existir fisicamente no repositório`);
}

const phase4dClinicalStyles=['design_clinical.css','design_clinical_direction-1.17.0.css'];
for(const file of phase4dClinicalStyles){
  const escaped=file.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  assert.match(html,new RegExp(`<link[^>]+rel=["']stylesheet["'][^>]+data-kinesys-lazy-href=["'][^"']*${escaped}[^"']*["']`,'i'),`${file} deve manter placeholder na posição histórica do head`);
}
assert.ok(html.indexOf('data-kinesys-lazy-href="design_clinical.css')<html.indexOf('data-kinesys-lazy-href="design_clinical_direction-1.17.0.css'),'cascade clínico deve preservar design_clinical antes de clinical_direction');
assert.ok(loader.indexOf('design_clinical.css')<loader.indexOf('design_clinical_direction-1.17.0.css'),'bundle deve preservar a ordem clínica das duas folhas');
assert.match(loader,/data-kinesys-lazy-href/,'Screen Loader deve reconhecer placeholders CSS lazy');
assert.match(loader,/reservado\.href=src/,'Screen Loader deve ativar o href no placeholder em vez de anexar a folha ao fim do head');
assert.match(loader,/reservado\.removeAttribute\('href'\)/,'falha de rede deve liberar o placeholder para uma nova tentativa real');
assert.match(loader,/removeEventListener\('load',aoCarregar\)/,'retry CSS não deve deixar listener de carga órfão após erro');
const phase4dCssDeferredBytes=phase4dClinicalStyles.reduce((total,file)=>total+fs.statSync(file).size,0);
assert.ok(phase4dCssDeferredBytes>=100000,`Fase 4D deve adiar pelo menos 100 KB brutos de CSS clínico; atual ${phase4dCssDeferredBytes} bytes`);
const allowedClinicalBreakpoints=new Set([1280,1180,1100,980,900,820,760,700,620,560,520,430]);
const tokenText=fs.readFileSync('design_tokens.css','utf8');
const definedClinicalTokens=new Set(Array.from(tokenText.matchAll(/(--kds-[a-z0-9-]+)\s*:/gi),m=>m[1]));
for(const jsFile of fs.readdirSync('.').filter(file=>file.endsWith('.js'))){
  const source=fs.readFileSync(jsFile,'utf8');
  for(const match of source.matchAll(/setProperty\(\s*['"](--kds-[a-z0-9-]+)['"]/gi))definedClinicalTokens.add(match[1]);
}
for(const file of phase4dClinicalStyles){
  const original=fs.readFileSync(file,'utf8');
  const css=original.replace(/\/\*[\s\S]*?\*\//g,'');
  const microtype=Array.from(css.matchAll(/font-size\s*:\s*([0-9]*\.?[0-9]+)px/gi)).filter(m=>Number(m[1])<12.5);
  assert.deepStrictEqual(microtype.map(m=>m[1]),[],`${file} não pode introduzir fonte abaixo de 12.5px ao ficar lazy`);
  const badBreakpoints=Array.from(css.matchAll(/@media[^\{]*\((max|min)-width\s*:\s*([0-9]+)px\)/gi)).filter(m=>{
    const kind=String(m[1]).toLowerCase(),value=Number(m[2]);
    return !allowedClinicalBreakpoints.has(value)&&!(kind==='min'&&value===701);
  });
  assert.deepStrictEqual(badBreakpoints.map(m=>`${m[1]}:${m[2]}`),[],`${file} deve respeitar os breakpoints oficiais mesmo sob demanda`);
  const used=new Set(Array.from(original.matchAll(/var\(\s*(--kds-[a-z0-9-]+)/gi),m=>m[1]));
  const undefinedTokens=[...used].filter(token=>!definedClinicalTokens.has(token));
  assert.deepStrictEqual(undefinedTokens,[],`${file} não pode usar token KDS indefinido`);
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

const financeLazyScripts=[
  'pendencias_financeiras-1.19.0.js',
  'descontos_financeiros-1.20.0.js',
  'balanco_financeiro_admin-1.19.0.js',
  'analise_admin-1.19.0.js',
  'financeiro_workspace-1.20.1.js',
  'financeiro_lancamentos-1.20.0.js'
];
const financeLazyStyles=[
  'financeiro_workspace-1.20.1.css',
  'financeiro_lancamentos-1.20.0.css',
  'financeiro_alignment.css'
];
const agendaLazyScripts=['agenda-1.20.0.js'];
const agendaLazyStyles=['agenda_referencia-1.20.0.css'];

assert.match(loader,/tela_financeiro\s*:/,'bundle do Financeiro deve existir');
assert.match(loader,/tela_agenda\s*:/,'bundle visual da Agenda deve existir');

function assertLazyAsset(file,kind){
  const escaped=file.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  const eager=kind==='script'
    ? new RegExp(`<script[^>]+src=["'][^"']*${escaped}[^"']*["']`,'i')
    : new RegExp(`<link[^>]+href=["'][^"']*${escaped}[^"']*["']`,'i');
  assert.ok(!eager.test(html),`${file} não pode voltar ao carregamento inicial`);
  assert.ok(loader.includes(file),`${file} deve permanecer registrado no Screen Loader`);
  assert.ok(fs.existsSync(file),`${file} deve existir fisicamente no repositório`);
}
for(const file of financeLazyScripts)assertLazyAsset(file,'script');
for(const file of financeLazyStyles)assertLazyAsset(file,'style');
for(const file of agendaLazyScripts)assertLazyAsset(file,'script');
for(const file of agendaLazyStyles)assertLazyAsset(file,'style');

const evaluationDatabaseLazyScripts=[
  'cirurgias-1.18.0.js',
  'database/medicamentos.js',
  'database/irradiacao_clinica.js',
  'database/mapeamento_clinico.js',
  'database/condicoes_mobilidade_v23.js',
  'database/diferenciais_neurais.js'
];
for(const file of evaluationDatabaseLazyScripts)assertLazyAsset(file,'script');

let evaluationDbPos=-1;
for(const file of evaluationDatabaseLazyScripts){
  const pos=loader.indexOf(file);
  assert.ok(pos>evaluationDbPos,`${file} deve preservar a ordem clínica histórica no bundle da Avaliação`);
  evaluationDbPos=pos;
}
assert.ok(loader.indexOf('database/mapeamento_clinico.js')<loader.indexOf('database/condicoes_mobilidade_v23.js'),'mapeamento clínico deve carregar antes da extensão de mobilidade');
assert.ok(loader.indexOf('database/mapeamento_clinico.js')<loader.indexOf('database/diferenciais_neurais.js'),'mapeamento clínico deve carregar antes dos diferenciais neurais');
assert.match(html,/<script[^>]+src=["'][^"']*database\/ocupacoes_esportes\.js[^"']*["']/i,'ocupações/esportes permanece eager nesta fase porque o núcleo principal ainda o valida no bootstrap');
assert.doesNotMatch(loader,/scripts:Object\.freeze\(\[[\s\S]*?database\/ocupacoes_esportes\.js[\s\S]*?clinical_engine-1\.17\.0\.js/,'ocupações/esportes não deve ser carregado duas vezes no bundle da Avaliação');

// Smoke test real das bases: scripts clássicos separados compartilham o mesmo lexical environment.
const clinicalDbContext={console};
vm.createContext(clinicalDbContext);
for(const file of evaluationDatabaseLazyScripts){
  vm.runInContext(fs.readFileSync(file,'utf8'),clinicalDbContext,{filename:file,timeout:1500});
}
assert.strictEqual(vm.runInContext('typeof dicionarioCirurgias',clinicalDbContext),'object','dicionário de cirurgias deve existir após carga tardia');
assert.strictEqual(vm.runInContext('typeof dicionarioMedicamentos',clinicalDbContext),'object','dicionário de medicamentos deve existir após carga tardia');
assert.strictEqual(vm.runInContext('typeof BANCO_IRRADIACAO_CLINICA',clinicalDbContext),'object','banco de irradiação deve existir após carga tardia');
assert.strictEqual(vm.runInContext('typeof BANCO_MAPEAMENTO_CLINICO',clinicalDbContext),'object','banco de mapeamento deve existir após carga tardia');
const evaluationDatabaseDeferredBytes=evaluationDatabaseLazyScripts.reduce((total,file)=>total+fs.statSync(file).size,0);
assert.ok(evaluationDatabaseDeferredBytes>=275000,`Fase 4C deve adiar pelo menos 275 KB brutos; atual ${evaluationDatabaseDeferredBytes} bytes`);


let financePos=-1;
for(const file of financeLazyScripts){
  const pos=loader.indexOf(file);
  assert.ok(pos>financePos,`${file} deve preservar a ordem histórica relativa do bundle Financeiro`);
  financePos=pos;
}

const eagerSharedScripts=[
  'financeiro-1.19.0.js',
  'credito_cliente-1.19.0.js',
  'agenda_notificacoes_core-1.20.1.js',
  'financeiro_agendamento-1.21.0.js'
];
for(const file of eagerSharedScripts){
  const escaped=file.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  assert.match(html,new RegExp(`<script[^>]+src=["'][^"']*${escaped}[^"']*["']`,'i'),`${file} deve continuar eager na Fase 4A por ser núcleo compartilhado`);
}
assert.match(html,/financeiro_agendamento-1\.21\.0\.css/,'CSS da integração Agenda/Financeiro deve continuar eager');
assert.match(html,/design_agenda\.css/,'CSS estrutural compartilhado da Agenda deve continuar eager nesta fase');
assert.match(app,/iniciarNotificacoesAgenda/,'bootstrap global deve continuar iniciando notificações após login');
assert.match(loader,/VERSION='1\.25\.4-phase4d'/,'Screen Loader deve identificar a Fase 4D');
assert.match(html,/screen_loader-1\.25\.0\.js\?v=20260910-phase4d-r1/,'index deve invalidar o cache do Screen Loader na Fase 4D');

const agendaModule=fs.readFileSync('agenda-1.20.0.js','utf8');
const notificationCore=fs.readFileSync('agenda_notificacoes_core-1.20.1.js','utf8');
const financeAgendaIntegration=fs.readFileSync('financeiro_agendamento-1.21.0.js','utf8');
assert.match(notificationCore,/function iniciarNotificacoesAgenda\(/,'núcleo eager deve preservar iniciarNotificacoesAgenda');
assert.match(notificationCore,/function pararNotificacoesAgenda\(/,'núcleo eager deve preservar pararNotificacoesAgenda');
assert.match(notificationCore,/function sincronizarNotificacoesPendentesAgenda\(/,'núcleo eager deve preservar sincronização da fila de avisos');
assert.match(notificationCore,/KineSysScreenLoader\?\.ensure\)\s*\{[\s\S]*ensure\('tela_agenda'\)/,'clique em aviso deve preparar Agenda lazy antes de usar seu estado');
assert.doesNotMatch(agendaModule,/function iniciarNotificacoesAgenda\(/,'módulo pesado não deve duplicar polling global');
assert.doesNotMatch(agendaModule,/let agendaNotificacoesTimer\s*=/,'estado global de polling deve existir somente no núcleo eager');
assert.match(agendaModule,/document\.readyState === 'loading'/,'Agenda deve inicializar eventos mesmo após DOMContentLoaded');
assert.match(financeAgendaIntegration,/function instalarHooksAgendaFinanceiro\(/,'integração deve possuir instalador tardio dos hooks da Agenda');
assert.match(financeAgendaIntegration,/kinesys:tela-modulos-prontos/,'integração deve aguardar o bundle da Agenda antes de sobrescrever hooks');

const coreBytes=fs.statSync('agenda_notificacoes_core-1.20.1.js').size;
const agendaLazyBytes=fs.statSync('agenda-1.20.0.js').size;
assert.ok(coreBytes<20000,`núcleo de notificações deve permanecer pequeno; atual ${coreBytes} bytes`);
assert.ok(agendaLazyBytes>180000,`módulo pesado da Agenda deve permanecer efetivamente fora do bootstrap; atual ${agendaLazyBytes} bytes`);

// Smoke test: the eager integration must execute while Agenda globals are absent.
const fakeDocument={
  readyState:'complete',
  getElementById(){return null;},
  addEventListener(){},
  querySelector(){return null;},
  querySelectorAll(){return [];}
};
const integrationContext={
  console,
  window:{},
  document:fakeDocument,
  setTimeout(){return 0;},
  clearTimeout(){},
  alert(){},
  _supabase:null,
  moedaBR:null,
  escapeHTML:null,
  numeroFinanceiro:null,
  obterMapaPagamentoAgendamentos:async()=>new Map(),
  obterSituacaoPagamentoAgendamento:async()=>({}),
  salvarPagamentoFinanceiro:async()=>true,
  renderizarFinanceiroPaciente(){},
};
assert.doesNotThrow(()=>vm.runInNewContext(financeAgendaIntegration,integrationContext,{timeout:1000}),'integração eager não pode exigir Agenda já carregada');

const deferredRawBytes=145198+27284+2983;
console.log(`Screen Loader contract Phase 4D: CSS clínico da Avaliação adia ${phase4dCssDeferredBytes} bytes brutos adicionais preservando cascade; bases clínicas lazy somam ${evaluationDatabaseDeferredBytes} bytes; Agenda continua lazy (${agendaLazyBytes} bytes).`);
