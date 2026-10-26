'use strict';
// Executa os controladores reais com dados sintéticos, sem rede nem persistência.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const read=p=>fs.readFileSync(p,'utf8');
const design=read('src/core/design_system-1.20.1.js'),core=read('src/core/script-1.18.0.js');
function section(source,start,end){const a=source.indexOf(start),b=source.indexOf(end,a+start.length);assert(a>=0&&b>a,start);return source.slice(a,b);}
function element(){return {value:'',textContent:'',hidden:false,style:{},dataset:{},children:[],events:{},classList:{add(){},remove(){},contains(){return true;}},setAttribute(k,v){this[k]=v;},addEventListener(k,v){this.events[k]=v;},append(...items){this.children.push(...items);},replaceChildren(...items){this.children=items;},querySelector(){return null;},contains(){return false;}};}
function patientPickers(){
 for(const id of ['midia_paciente_select','esp_paciente_select']){
  const group={querySelector:()=>({})},select={...element(),options:[],selectedOptions:[],parentNode:{insertBefore(){}},closest:()=>group};
  select.options=[...Array.from({length:25},(_,i)=>({value:'d'+i,textContent:'Dilson José '+String(i).padStart(2,'0')})),{value:'j',textContent:'José Antônio'},{value:'exact',textContent:'José'},{value:'jo',textContent:'João José'}];
  Object.defineProperty(select,'selectedOptions',{get(){return this.options.filter(o=>o.value===this.value);}});
  const made=[],env={document:{getElementById:k=>k===id?select:null,createElement:()=>{const e=element();made.push(e);return e;},addEventListener(){}},MutationObserver:class{observe(){}},Event:class{constructor(type){this.type=type;}}};
  select.dispatchEvent=e=>select.events[e.type]?.(e);
  vm.runInNewContext(section(design,'    function prepararBuscasPaciente(){','    function prepararEvolucao(')+'\nprepararBuscasPaciente();',env);
  const input=made[1],list=made[2];input.value='jose';input.events.input();
  assert.equal(list.children.length,20);assert.equal(list.children[0].textContent,'José');assert.equal(list.children[1].textContent,'José Antônio','ordena antes de paginar');
  list.children[1].events.click();assert.equal(select.value,'j');assert.equal(input.value,'José Antônio');assert.equal(list.hidden,true);
  input.value='';input.events.input();assert.equal(list.children[0].textContent,'Dilson José 00','sem consulta preserva alfabética');
 }
}
async function stalePatientContext(){
 let release;const ready=new Promise(r=>release=r),changes=[];
 const select={value:'',options:[{value:'a'},{value:'b'}],dataset:{},dispatchEvent(){changes.push(this.value);}};
 const env={pacienteContextoId:'a',contextoRevisao:1,window:{atualizarSelectPacientesPreCadastro:()=>ready},document:{getElementById:id=>id==='tela_avaliacao'?{classList:{contains:()=>true}}:select},Event:class{},setTimeout};
 vm.createContext(env);vm.runInContext(section(design,'    async function selecionarPacienteControle(','    async function abrirPacienteNaTela('),env);
 const old=env.aplicarContextoNaTela('tela_avaliacao');env.pacienteContextoId='b';env.contextoRevisao++;release();await old;assert.deepEqual(changes,[],'contexto atrasado não seleciona outro paciente');
 await env.aplicarContextoNaTela('tela_avaliacao');assert.deepEqual(changes,['b']);
}
async function restoreFinancialTabs(){
 const source=read('src/finance/pendencias_financeiras-1.19.0.js');
 const wrapper=source.slice(source.indexOf("if (typeof inicializarFinanceiro === 'function'"));
 for(const initial of ['paciente','pendencias','descontos','gastos','balanco','analise','lancamentos']){
  let selected=initial,release;const calls=[],ready=new Promise(r=>release=r);
  const env={console,inicializarFinanceiro:async()=>{await ready;return true;},sessionStorage:{getItem:()=>selected},alternarAbaFinanceiro:aba=>calls.push(aba),carregarPendenciasFinanceiras:async()=>{},window:{KineSysFinanceiroLancamentos:{abrir:()=>calls.push('lancamentos')}}};
  vm.createContext(env);vm.runInContext(wrapper,env);const loading=env.inicializarFinanceiro();release();assert.equal(await loading,true);assert.deepEqual(calls,[initial]);
 }
 let selected='paciente',release;const calls=[],ready=new Promise(r=>release=r),env={console,inicializarFinanceiro:async()=>ready,sessionStorage:{getItem:()=>selected},alternarAbaFinanceiro:a=>calls.push(a),carregarPendenciasFinanceiras:async()=>{},window:{}};
 vm.createContext(env);vm.runInContext(wrapper,env);const loading=env.inicializarFinanceiro();selected='gastos';release();await loading;assert.deepEqual(calls,['gastos'],'terminar a carga não desfaz a escolha de Despesas');
}
function ledgerOwnership(){
 const nodes={financeiro_tab_lancamentos:element(),financeiro_painel_lancamentos:element(),tela_financeiro:element()},calls=[];
 const env={console,document:{readyState:'complete',getElementById:id=>nodes[id],querySelectorAll:()=>[]},usuarioPodeVerBalancoFinanceiro:()=>true,alternarAbaFinanceiro:aba=>calls.push(aba),MutationObserver:class{observe(){}},sessionStorage:{setItem(){}}};env.window=env;
 vm.createContext(env);vm.runInContext(read('src/finance/financeiro_lancamentos-1.20.0.js'),env);
 env.KineSysFinanceiroLancamentos.estado.ativa=true;env.alternarAbaFinanceiro('gastos');
 assert.equal(env.KineSysFinanceiroLancamentos.estado.ativa,false);assert.equal(nodes.financeiro_painel_lancamentos.hidden,true);assert.deepEqual(calls,['gastos']);
}
async function reportServiceErrors(){
 for(const status of [0,400,401,403,404,429]){
  let calls=0;const output={...element(),classList:{add(){},remove(){}}};
  const env={console:{error(){}},AbortController,setTimeout:()=>1,clearTimeout(){},GEMINI_CONFIG:{timeoutMs:1,maxOutputTokens:100,edgeFunction:'test',modelos:['a','b']},_supabase:{functions:{invoke:async()=>{calls++;return {error:{message:'Failed to send a request to the Edge Function',context:{status}}};}}},extrairSecoesObrigatoriasGemini:()=>[],document:{getElementById:()=>output}};
  vm.createContext(env);vm.runInContext(section(core,'async function requisitarGeminiRelatorioModelo(','async function completarRespostaGeminiSeNecessario('),env);vm.runInContext(section(core,'async function chamarGeminiRelatorio(','async function gerarDocumentoComIA('),env);
  assert.equal(await env.testarConexaoGemini(),false);assert.equal(calls,status===400?2:1,'mantém fallback de modelo e não repete falha de conexão');assert.doesNotMatch(output.textContent,/Failed|Edge Function|chave do Gemini/);assert.match(output.textContent,/gerador externo|sessão/);
 }
}
function evolutionTrend(){
 const source=read('src/home/home_fisioterapeuta_util-1.24.0.js');
 const code=section(source,'    function abrirAnaliseEvolucao(','\n    function ');
 for(const [values,expected] of [[[4],'Dados insuficientes para tendência'],[[4,4],'estabilidade'],[[6,3],'redução de 3'],[[3,6],'aumento de 3']]){
  const nodes={ks_fisio_evolution_patient:{},ks_fisio_evolution_body:{}},env={document:{getElementById:id=>nodes[id]},garantirDialogAnaliseEvolucao:()=>({open:true}),pontosEvolucaoPaciente:()=>values.map(eva=>({eva})),graficoEvolucaoSVG:()=>''};
  vm.runInNewContext(code+'\nabrirAnaliseEvolucao({nome:"Paciente sintético"});',env);assert(nodes.ks_fisio_evolution_body.innerHTML.includes(expected));
 }
}
function anonymousHypotheses(){
 const env={window:{}};vm.runInNewContext(read('src/clinical/clinical_document_analyzer-1.0.0.js'),env);
 const model=env.window.KineSysDocumentAnalyzer.analisarDocumento({fatos:[],correlacoes:[{regiaoId:'cervical',semVinculo:true,resultados:[]}]},{});
 assert.equal(model.matrizEvidencias.length,0);assert.doesNotMatch(JSON.stringify(model),/Hipótese sem nome registrado/);
}
(async()=>{patientPickers();await stalePatientContext();await restoreFinancialTabs();ledgerOwnership();await reportServiceErrors();evolutionTrend();anonymousHypotheses();console.log('Auditoria completa: ranking antes de paginar, contextos atrasados, primeira carga financeira, livro-caixa, falhas externas, tendência e hipótese anônima OK');})().catch(error=>{console.error(error);process.exitCode=1;});
