const fs=require('fs');
const vm=require('vm');
const assert=require('assert');

const core=fs.readFileSync('script-1.18.0.js','utf8');
const guard=fs.readFileSync('operation_guard-1.0.0.js','utf8');
const html=fs.readFileSync('index.html','utf8');

assert(!core.includes('const KINESYS_OPERACOES_EM_CURSO = new Set()'), 'Estado do operation guard ainda está embutido no core');
assert(!core.includes('async function executarAcaoProtegida('), 'executarAcaoProtegida ainda está embutida no core');
assert(!core.includes('function protegerFuncaoKineSys('), 'protegerFuncaoKineSys ainda está embutida no core');
assert(core.includes("protegerFuncaoKineSys('salvarAvaliacaoAtual'"), 'Ponto de instalação da proteção da Avaliação foi removido');
assert(core.includes("protegerFuncaoKineSys('salvarCadastroSomente'"), 'Bootstrap de proteção das gravações críticas foi removido');
assert(core.includes("protegerFuncaoKineSys('salvarAgendamento'"), 'Proteção do salvamento da Agenda foi removida');

assert(guard.includes("const KINESYS_OPERACOES_EM_CURSO = new Set()"), 'Módulo perdeu o conjunto de operações em curso');
assert(guard.includes('async function executarAcaoProtegida('), 'Módulo perdeu executarAcaoProtegida');
assert(guard.includes('function protegerFuncaoKineSys('), 'Módulo perdeu protegerFuncaoKineSys');
assert(guard.includes("protegida.__kinesysProtegida = true"), 'Idempotência do wrapper foi alterada');
assert(guard.includes("protegida.__original = original"), 'Referência à função original foi alterada');

const guardTag='<script defer src="operation_guard-1.0.0.js?v=20260911-phase4b-r1"></script>';
const coreNeedle='<script defer src="script-1.18.0.js';
const menuNeedle='<script defer src="menu_dropdown-1.0.0.js?v=20260911-phase4a-r1"></script>';
assert(html.includes(guardTag), 'index.html não carrega o operation guard extraído');
assert(html.indexOf(menuNeedle) < html.indexOf(guardTag), 'Ordem eager existente deve ser preservada: menu antes do guard');
assert(html.indexOf(guardTag) < html.indexOf(coreNeedle), 'Operation guard deve carregar antes do script principal');

function criarBotao(){
  const attrs=new Map();
  return {
    tagName:'BUTTON', textContent:'Salvar', disabled:false,
    setAttribute(k,v){attrs.set(k,String(v));},
    removeAttribute(k){attrs.delete(k);},
    getAttribute(k){return attrs.get(k) ?? null;}
  };
}

(async()=>{
  const botao=criarBotao();
  const context={
    console,
    document:{activeElement:null,querySelector:()=>botao},
    window:{}
  };
  context.window=context;
  vm.createContext(context);
  vm.runInContext(guard,context,{filename:'operation_guard-1.0.0.js'});

  let resolver;
  let execucoes=0;
  const primeira=context.executarAcaoProtegida('mesma-chave',botao,'Salvando…',()=>{
    execucoes++;
    return new Promise(resolve=>{resolver=resolve;});
  });
  await Promise.resolve();
  assert.strictEqual(botao.disabled,true,'Botão deve ficar desabilitado enquanto a ação está pendente');
  assert.strictEqual(botao.getAttribute('aria-busy'),'true','aria-busy deve permanecer durante a ação');
  assert.strictEqual(botao.textContent,'Salvando…','Texto ocupado deve permanecer durante a ação');

  const segunda=await context.executarAcaoProtegida('mesma-chave',botao,'Salvando…',async()=>{execucoes++;});
  assert.strictEqual(segunda,null,'Segundo clique com a mesma chave deve ser ignorado');
  assert.strictEqual(execucoes,1,'Segundo clique não pode executar a ação');

  resolver('ok');
  assert.strictEqual(await primeira,'ok','Resultado da ação original deve ser preservado');
  assert.strictEqual(botao.disabled,false,'Botão deve ser reabilitado no finally');
  assert.strictEqual(botao.getAttribute('aria-busy'),null,'aria-busy deve ser removido no finally');
  assert.strictEqual(botao.textContent,'Salvar','Texto original do botão deve ser restaurado');

  let chamadas=0;
  context.salvarTeste=async()=>{chamadas++; return 42;};
  context.protegerFuncaoKineSys('salvarTeste',()=> 'teste','#btn','Processando…');
  const protegida=context.salvarTeste;
  assert.strictEqual(protegida.__kinesysProtegida,true,'Wrapper deve manter marcador público de proteção');
  assert.strictEqual(typeof protegida.__original,'function','Wrapper deve manter referência à função original');
  assert.strictEqual(await protegida(),42,'Wrapper deve preservar retorno da função original');
  assert.strictEqual(chamadas,1,'Wrapper deve executar a função original uma vez');
  context.protegerFuncaoKineSys('salvarTeste',()=> 'teste','#btn','Processando…');
  assert.strictEqual(context.salvarTeste,protegida,'Proteção repetida deve continuar idempotente');

  console.log('Operation guard modularization contract Phase 4B: OK');
})().catch(err=>{console.error(err);process.exit(1);});
