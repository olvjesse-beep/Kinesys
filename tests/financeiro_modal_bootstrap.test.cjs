const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=fs.readFileSync('index.html','utf8');
const financeiro=fs.readFileSync('src/finance/financeiro-1.19.0.js','utf8');

// Retorno contextual: roda o salvamento integrado real com transporte simulado.
(async()=>{
 const integrado=fs.readFileSync('src/finance/financeiro_agendamento-1.21.0.js','utf8');
 const trecho=integrado.slice(integrado.indexOf('const salvarLegado=salvarPagamentoFinanceiro;'),integrado.indexOf('let hooksAgendaFinanceiroInstalados=false;'));
 for(const legacy of [false,true])for(const origem of ['', '1'])for(const falha of [false,true]){
  const navegacoes=[],modal={dataset:{retornoAgenda:origem}},ag={value:legacy?'':'ag-fixture'};
  const campos={modal_fin_pagamento:modal,financeiro_paciente_select:{value:'pac-fixture'},fin_pag_plano:{value:'pl-fixture'},fin_pag_cobranca_id:{value:legacy?'':'cob-fixture'},fin_pag_agendamento_id:ag,fin_pag_valor:{value:'100'},fin_pag_desconto:{value:'0'},fin_pag_data:{value:'2026-10-17'},fin_pag_observacoes:{value:''},fin_pag_operacao:{value:'operacao-fixture'}};
  const c={pagamentoSalvando:false,validarContextoModalPagamento:()=>true,usuarioLogado:{id:'perfil-fixture',clinica_id:'clinic-fixture'},document:{getElementById:id=>campos[id]||null,querySelectorAll:()=>[{value:'PIX'}]},salvarPagamentoFinanceiro:async()=>!falha,contextoPagamentoAgendamento:{modo:legacy?'plano':'agendamento',agendamento:{id:'ag-fixture'},pacienteId:'pac-fixture',clinicaId:'clinic-fixture',perfilId:'perfil-fixture',planoId:'pl-fixture',cobrancaId:legacy?'':'cob-fixture',operacaoId:'operacao-fixture'},_supabase:{rpc:async()=>({data:{valor_pendente:0},error:falha?{message:'falha simulada'}:null})},num:Number,fmt:String,alert(){},fecharModal(){},carregarFinanceiroPaciente:async()=>{},renderizarPainelAgenda:async()=>{},mensagemFinanceiro(){},navegarPara:t=>navegacoes.push(t)};
  vm.createContext(c);vm.runInContext(trecho,c);const salvo=await c.salvarPagamentoFinanceiro();
  assert.equal(salvo,!falha);assert.deepEqual(navegacoes,!falha&&origem==='1'?['tela_agenda']:[],'retorna só após sucesso e somente quando aberto pela Agenda');
  if(falha)assert.equal(modal.dataset.retornoAgenda,origem,'falha mantém contexto para nova tentativa');
 }
 console.log('PASS: retorno após pagamento unitário/pacote, erro e abertura pelo Financeiro.');
})().catch(e=>{console.error(e);process.exitCode=1;});
for(const id of new Set(Array.from(financeiro.matchAll(/getElementById\('(fin_plano_[^']+)'\)/g),m=>m[1])))assert.equal(html.split(`id="${id}"`).length-1,1,`Contrato HTML/JS do plano: campo ausente ou duplicado ${id}`);
assert.match(html, /id="fin_plano_personalizar"[^>]*onchange="alternarPersonalizacaoContrato\(\)"/);
assert(html.indexOf('src/ui/modal_helpers-1.0.0.js')>=0&&html.indexOf('src/ui/modal_helpers-1.0.0.js')<html.indexOf('src/finance/financeiro-1.19.0.js'),'helper deve existir e carregar antes do financeiro');
assert.doesNotMatch(fs.readFileSync('src/agenda/agenda-1.20.0.js','utf8'),/function (abrirModal|fecharModal)\(/);
const classes=new Set(),ctx=vm.createContext({document:{body:{classList:{add(){},remove(){}}},querySelector:()=>null,getElementById:id=>id==='modal_fin_plano'?{setAttribute(){},classList:{add:v=>classes.add(v),remove:v=>classes.delete(v)}}:null}});
vm.runInContext(fs.readFileSync('src/ui/modal_helpers-1.0.0.js','utf8'),ctx);
ctx.abrirModal('modal_fin_plano');assert(classes.has('ativa'));ctx.fecharModal('modal_fin_plano');assert(!classes.has('ativa'));ctx.abrirModal('ausente');
console.log('PASS: diálogos financeiros disponíveis sem carregar Agenda.');

// Abertura real com formulário derivado dos IDs publicados, sem substitutos
// para elementos ausentes: detecta regressões de HTML antes da publicação.
const camposPlano={financeiro_paciente_select:{value:'pac-fixture',selectedOptions:[{textContent:'Paciente sintético'}]}};
for(const match of html.matchAll(/id="(fin_plano_[^"]+)"/g))camposPlano[match[1]]={value:'',checked:false,disabled:false,hidden:false,textContent:'',innerHTML:'',selectedOptions:[{dataset:{sessoes:'10',valor:'800'}}]};
let abriuPlano=false;
const abertura={document:{getElementById:id=>camposPlano[id]||null},financeiroPlanoRenovacaoOrigemId:'',financeiroPlanosCache:[],gerarOperacaoFinanceiraId:()=> 'op-fixture',definirFormasPagamentoSelecionadas(){},numeroFinanceiro:v=>Number(String(v||0).replace(',','.')),moedaBR:v=>String(v),abrirModal:id=>{assert.equal(id,'modal_fin_plano');abriuPlano=true;},alert:message=>{throw Error(message);}};
vm.createContext(abertura);
vm.runInContext(financeiro.slice(financeiro.indexOf('function calcularValorFinalPlano'),financeiro.indexOf('async function abrirRenovacaoPlanoFinanceiro')),abertura);
abertura.abrirModalNovoPlano();assert.equal(abriuPlano,true);assert.equal(camposPlano.fin_plano_sessoes.disabled,true);
assert.equal(camposPlano.fin_plano_paciente.textContent,'Paciente sintético','novo plano identifica o paciente dentro da caixa');
camposPlano.fin_plano_personalizar.checked=true;abertura.alternarPersonalizacaoContrato();assert.equal(camposPlano.fin_plano_sessoes.disabled,false);
assert.equal(camposPlano.fin_plano_operacao.value,'op-fixture');
console.log('PASS: abertura real do plano e personalização compatíveis com o HTML publicado.');

// Usa o guard REAL com botão focado: disabled=true é apresentação, não lock.
async function testarContratacaoProtegida(){
 const source=fs.readFileSync('src/finance/financeiro-1.19.0.js','utf8');
 const botao={tagName:'BUTTON',disabled:false,textContent:'Confirmar',setAttribute(){},removeAttribute(){}};
 const inputs={fin_plano_salvar_btn:botao,fin_plano_contrato_id:{value:''},fin_plano_personalizar:{checked:false},fin_plano_operacao:{value:'operacao-estavel'},financeiro_paciente_select:{value:'pac-fixture'},fin_plano_procedimento:{value:'proc-fixture'},fin_plano_parcelas:{value:'1'}};
 let concluir,calls=0,erro=null,fechados=0;
 const context={console,document:{activeElement:botao,getElementById:id=>inputs[id]||{value:''},querySelector:()=>botao},financeiroPodeEditar:()=>true,serializarFormasPagamento:()=> 'PIX',fecharModal:()=>fechados++,carregarFinanceiroPaciente:async()=>{},mensagemFinanceiro:()=>{},alert:()=>{},_supabase:{rpc:async(nome,args)=>{calls++;assert.equal(nome,'kinesys_contratar_pacote');assert.equal(args.p_operacao_id,'operacao-estavel');await new Promise(resolve=>concluir=resolve);return {error:erro};}}};
 context.window=context;vm.createContext(context);
 vm.runInContext(fs.readFileSync('src/core/operation_guard-1.0.0.js','utf8'),context);
 vm.runInContext(source.slice(source.indexOf('let financeiroPlanoSalvando'),source.indexOf('function personalizarContratoFinanceiro')),context);
 context.protegerFuncaoKineSys('salvarPlanoFinanceiro',()=> 'financeiro-plano');
 const primeira=context.salvarPlanoFinanceiro();
 assert.equal(calls,1,'o clique protegido deve chegar ao RPC mesmo com botão disabled');
 assert.equal(botao.disabled,true);
 assert.equal(await context.salvarPlanoFinanceiro(),null,'segundo clique não cria outra contratação');
 assert.equal(await context.salvarPlanoFinanceiro.__original(),false,'chamada direta concorrente também deve ser bloqueada');
 concluir();assert.equal(await primeira,true);assert.equal(fechados,1);assert.equal(botao.disabled,false);
 erro={message:'falha simulada'};const falha=context.salvarPlanoFinanceiro();concluir();assert.equal(await falha,false);assert.equal(botao.disabled,false);
 erro=null;const nova=context.salvarPlanoFinanceiro();concluir();assert.equal(await nova,true,'falha não pode deixar o próximo envio bloqueado');
 assert.equal(calls,3);
 console.log('PASS: contratação com guard real, duplo clique, erro e nova tentativa.');
}
testarContratacaoProtegida().catch(error=>{console.error(error);process.exitCode=1;});

// Executa abertura, limpeza e gravação reais; transporte sintético, sem dados
// pessoais e sem efetuar recebimentos em qualquer ambiente conectado.
async function testarContextoPagamento(){
 const integrado=fs.readFileSync('src/finance/financeiro_agendamento-1.21.0.js','utf8');
 function harness(){
  const campos={};for(const id of ['modal_fin_pagamento','financeiro_paciente_select','fin_pag_plano','fin_pag_plano_grupo','fin_pag_agendamento_id','fin_pag_cobranca_id','fin_pag_contexto_agendamento','fin_pag_valores_agendamento','fin_pag_original','fin_pag_devido','fin_pag_pago','fin_pag_pendente','fin_pag_desconto','fin_pag_valor','fin_pag_operacao','fin_pag_data','fin_pag_observacoes','fin_pag_credito_box','fin_pag_usar_credito','fin_pag_credito_valor','fin_pag_parcelas','fin_pag_parcelas_grupo'])campos[id]={value:'',dataset:{},hidden:true,disabled:false,textContent:'',innerHTML:''};
  const pacientes={a:'pac-a',b:'pac-b'};
  const ag=id=>({id,clinica_id:'clinic',paciente_id:pacientes[id],plano_id:'pl-'+id,procedimento_id:'proc-'+id,profissional_id:'prof',status:'agendado',data:'2026-10-19',hora_inicio:'10:00',pacientes:{nome:'Paciente '+id},procedimentos:{nome:'Procedimento '+id},equipe:{nome:'Profissional fixture'}});
  const pl=id=>({id:'pl-'+id,paciente_id:pacientes[id],clinica_id:'clinic',procedimento_id:'proc-'+id,sessoes_contratadas:id==='a'?1:3,status:'ativo',nome:'Contrato '+id,valor_tabela:id==='a'?150:225,desconto_valor:0,valor_final:id==='a'?150:225});
  let op=0,abertos=0,legados=0,rpcs=0,espera=null,erroRPC=null;
  const pendentes=new Map(),alertas=[];
  const c={console,usuarioLogado:{id:'perfil',clinica_id:'clinic'},financeiroPacienteAtualId:'',financeiroPacienteDadosConfirmados:false,financeiroContextoModalPagamento:null,financeiroPlanosCache:[],financeiroPagamentosCache:[],document:{getElementById:id=>id==='tela_agenda'?{classList:{contains:()=>true}}:campos[id]||null,querySelectorAll:()=>[{value:'PIX'}]},escapeHTML:String,moedaBR:String,numeroFinanceiro:v=>Number(String(v||0).replace(',','.')),financeiroPodeEditar:()=>true,gerarOperacaoFinanceiraId:()=> 'op-'+(++op),definirFormasPagamentoSelecionadas(){},alert:m=>alertas.push(m),instalarCamposPagamentoAgendamento(){},navegarPara(){},alternarAbaFinanceiro(){},popularPacientesFinanceiro:async id=>{campos.financeiro_paciente_select.value=id;},carregarFinanceiroPaciente:async()=>{const pid=campos.financeiro_paciente_select.value,id=pid==='pac-a'?'a':'b';c.financeiroPacienteAtualId=pid;c.financeiroPlanosCache=[pl(id)];c.financeiroPacienteDadosConfirmados=true;return true;},financeiroResumoPagamentoPlano:()=>({recebido:0,creditoAplicado:0}),obterSituacaoPagamentoAgendamento:async a=>({agendamentoId:a.id,verificado:true,pagos:0,valorOriginal:a.id==='a'?150:225,desconto:0}),salvarPagamentoFinanceiro:async()=>{legados++;return true;},renderizarPainelAgenda:async()=>{},mensagemFinanceiro(){},abrirModal:()=>{abertos++;campos.modal_fin_pagamento.ativa=true;},fecharModal:id=>{if(id==='modal_fin_pagamento'){campos.modal_fin_pagamento.ativa=false;c.limparContextoPagamentoAgendamento?.();}},_supabase:{from:t=>{let filtros={};const q={select(){return q;},eq(k,v){filtros[k]=v;return q;},async maybeSingle(){const id=filtros.id;if(pendentes.has(id))await pendentes.get(id).promise;assert.equal(filtros.clinica_id,'clinic');return {data:ag(id)};},async single(){assert.equal(filtros.clinica_id,'clinic');const p=pl(filtros.id.slice(-1));assert.equal(filtros.paciente_id,p.paciente_id);return {data:p};}};return q;},rpc:async(n,args)=>{rpcs++;if(n==='kinesys_preparar_cobranca_agendamento')return {data:{id:'cob-a',agendamento_id:'a',paciente_id:'pac-a',clinica_id:'clinic',procedimento_id:'proc-a',plano_id:'pl-a',valor_original:150,desconto_valor:0}};if(espera)await espera.promise;return {data:{valor_pendente:0},error:erroRPC};}}};
  c.window=c;vm.createContext(c);
  vm.runInContext(integrado.slice(integrado.indexOf('let contextoPagamentoAgendamento'),integrado.indexOf('function instalarModalBaixaPendencia')),c);
  vm.runInContext(financeiro.slice(financeiro.indexOf('function abrirModalPagamento('),financeiro.indexOf('async function salvarPagamentoFinanceiro()')),c);
  vm.runInContext(integrado.slice(integrado.indexOf('window.atualizarResumoPagamentoAgendamento'),integrado.indexOf('let hooksAgendaFinanceiroInstalados=false;')),c);
  const gate=()=>{let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve};};
  return {c,campos,alertas,gate,pendentes,counts:()=>({abertos,legados,rpcs}),deferSave:g=>{espera=g;},failSave:e=>{erroRPC=e;}};
 }
 const h=harness(),{c,campos}=h;
 assert.equal(await c.abrirPagamentoAgendamentoIntegrado('a'),true);assert(campos.fin_pag_contexto_agendamento.innerHTML.includes('Paciente a'));assert.equal(campos.fin_pag_original.textContent,'150');assert.equal(campos.fin_pag_agendamento_id.value,'a');
 assert.equal(await c.abrirPagamentoAgendamentoIntegrado('b'),true);assert(campos.fin_pag_contexto_agendamento.innerHTML.includes('Paciente b'));assert(!campos.fin_pag_contexto_agendamento.innerHTML.includes('Paciente a'),'pacote não herda paciente anterior');assert.equal(campos.fin_pag_original.textContent,'225');assert.equal(campos.fin_pag_agendamento_id.value,'');assert.equal(campos.fin_pag_cobranca_id.value,'');assert.equal(campos.fin_pag_plano.value,'pl-b');assert(campos.fin_pag_plano.disabled);
 campos.financeiro_paciente_select.value='pac-a';assert.equal(await c.salvarPagamentoFinanceiro(),false);assert.equal(h.counts().legados,0,'paciente divergente não pode alcançar o gravador de pacote');campos.financeiro_paciente_select.value='pac-b';
 assert.equal(await c.salvarPagamentoFinanceiro(),true);assert.equal(h.counts().legados,1,'pacote correto mantém o fluxo de crédito e formas do legado');
 c.fecharModal('modal_fin_pagamento');assert(campos.fin_pag_contexto_agendamento.hidden);assert.equal(campos.fin_pag_contexto_agendamento.innerHTML,'');assert.equal(campos.fin_pag_original.textContent,'0');
 assert.equal(c.abrirModalPagamento('pl-b'),true);assert(campos.fin_pag_valores_agendamento.hidden,'pagamento genérico não mostra valores da ocorrência anterior');
 assert.equal(await c.abrirPagamentoAgendamentoIntegrado('a'),true);campos.fin_pag_valor.value='150';campos.fin_pag_agendamento_id.value='b';const antes=h.counts().rpcs;assert.equal(await c.salvarPagamentoFinanceiro(),false);assert.equal(h.counts().rpcs,antes,'ID divergente não chega ao RPC');campos.fin_pag_agendamento_id.value='a';
 const g=h.gate();h.deferSave(g);const primeiro=c.salvarPagamentoFinanceiro();assert.equal(await c.salvarPagamentoFinanceiro(),false,'duplo clique bloqueado independentemente do botão');assert.equal(await c.abrirPagamentoAgendamentoIntegrado('b'),false,'não abre outro paciente enquanto grava');g.resolve();assert.equal(await primeiro,true);
 await c.abrirPagamentoAgendamentoIntegrado('a');campos.fin_pag_valor.value='150';const operacao=campos.fin_pag_operacao.value;h.failSave({message:'falha fixture'});assert.equal(await c.salvarPagamentoFinanceiro(),false);assert.equal(campos.fin_pag_operacao.value,operacao,'retry mantém chave idempotente');h.failSave(null);assert.equal(await c.salvarPagamentoFinanceiro(),true);
 for(const cancelar of ['segunda-abertura','fechar','clinica']){
  const t=harness(),hold=t.gate();t.pendentes.set('a',hold);const lento=t.c.abrirPagamentoAgendamentoIntegrado('a');
  if(cancelar==='segunda-abertura'){assert.equal(await t.c.abrirPagamentoAgendamentoIntegrado('b'),true);}else if(cancelar==='fechar')t.c.fecharModal('modal_fin_pagamento');else t.c.usuarioLogado.clinica_id='outra';
  hold.resolve();assert.equal(await lento,false);assert.equal(t.counts().rpcs,0,'resposta antiga nem prepara uma cobrança');
  if(cancelar==='segunda-abertura')assert(t.campos.fin_pag_contexto_agendamento.innerHTML.includes('Paciente b'));else assert(!t.campos.modal_fin_pagamento.ativa);
 }
 const nav=harness(),ready=nav.gate();nav.c.financeiroInicializacaoPendente=ready.promise;
 const abrindo=nav.c.abrirPagamentoAgendamentoIntegrado('b');await new Promise(resolve=>setImmediate(resolve));assert.equal(nav.counts().abertos,0,'aguarda inicialização financeira da navegação');ready.resolve();assert.equal(await abrindo,true);
 // A primeira entrada lazy deve receber o paciente da Agenda e abandonar
 // o livro-caixa antes de selecionar a conta, inclusive com outro prontuário ativo.
 const lazy=harness(),init=lazy.gate();let contexto='pac-a',saiu=false;
 lazy.c.pacienteAtualId='pac-a';lazy.campos.financeiro_paciente_select.value='pac-a';
 lazy.c.definirPacienteContexto=async id=>{contexto=id;};
 lazy.c.KineSysFinanceiroLancamentos={sair(){saiu=true;}};
 lazy.c.navegarPara=async()=>{assert.equal(contexto,'pac-b');assert.equal(lazy.c.pacienteAtualId,'pac-b');lazy.c.financeiroInicializacaoPendente=init.promise;return true;};
 const primeiraAbertura=lazy.c.abrirPagamentoAgendamentoIntegrado('b');await new Promise(resolve=>setImmediate(resolve));
 assert.equal(lazy.counts().abertos,0);init.resolve();assert.equal(await primeiraAbertura,true);
 assert(saiu);assert.equal(lazy.campos.financeiro_paciente_select.value,'pac-b');assert.match(lazy.campos.fin_pag_contexto_agendamento.innerHTML,/Paciente b/);
 const falhaInit=harness();falhaInit.c.financeiroInicializacaoPendente=Promise.resolve(false);
 assert.equal(await falhaInit.c.abrirPagamentoAgendamentoIntegrado('b'),false);assert.equal(falhaInit.counts().abertos,0);assert.match(falhaInit.alertas.join(' '),/carregar o Financeiro/);
 const styles=fs.readFileSync('styles/financeiro_agendamento-1.21.0.css','utf8');assert.match(styles,/\.fin-ag-context\[hidden\],\.fin-ag-values\[hidden\]\{display:none!important\}/,'hidden deve prevalecer sobre display:grid');
 for(const id of ['fin_pag_plano_grupo','fin_pag_parcelas_grupo','fin_pag_credito_box'])assert(styles.includes('#'+id+'[hidden]'),'grupos não aplicáveis permanecem ocultos');
 console.log('PASS: unitário → pacote → genérico, dados limpos, vínculo imutável, troca rápida, fechamento, clínica, retry e duplo clique.');
}
testarContextoPagamento().catch(error=>{console.error(error);process.exitCode=1;});

async function testarCargasFinanceirasForaDeOrdem(){
 const gates=new Map(),consultados=new Map();
 const gate=()=>{let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve};};
 const campo={value:'a'},render=[];
 const c={console,document:{getElementById:id=>id==='financeiro_paciente_select'?campo:null},usuarioLogado:{id:'perfil',clinica_id:'clinic'},financeiroCargaPacienteRevisao:0,financeiroPacienteAtualId:'',financeiroPacienteDadosConfirmados:false,financeiroContextoModalPagamento:null,financeiroPlanosCache:[],financeiroPagamentosCache:[],financeiroAgendamentosCache:[],FINANCEIRO_LOCAL_PLANOS:'pl',FINANCEIRO_LOCAL_PAGAMENTOS:'pg',obterFinanceiroLocalPaciente:()=>[],obterExclusoesPagamentosPendentes:()=>[],mensagemFinanceiro(){},sincronizarFinanceiroLocalPaciente:async()=>{},enriquecerPlanoProcedimento:p=>p,enriquecerAgendamentosComVinculoLocal:x=>x,erroFinanceiroTabelaAusente:()=>false,renderizarFinanceiroPaciente:()=>render.push(c.financeiroPlanosCache.map(p=>p.id).join(',')),renderizarFinanceiroVazio(){},consultarPlanosFinanceirosNuvem:async id=>{consultados.get(id)?.resolve();await gates.get(id).promise;return {data:[{id:'pl-'+id,paciente_id:id}]};},consultarAgendamentosFinanceiroPaciente:async()=>({data:[]}),_supabase:{from:()=>{const q={select:()=>q,eq:()=>q,order:()=>q,then:resolve=>Promise.resolve({data:[]}).then(resolve)};return q;}}};
 vm.createContext(c);vm.runInContext(financeiro.slice(financeiro.indexOf('async function carregarFinanceiroPaciente()'),financeiro.indexOf('function metricasPlano(')),c);
 gates.set('a',gate());consultados.set('a',gate());const a=c.carregarFinanceiroPaciente();await consultados.get('a').promise;
 campo.value='b';gates.set('b',gate());consultados.set('b',gate());const b=c.carregarFinanceiroPaciente();await consultados.get('b').promise;gates.get('b').resolve();assert.equal(await b,true);gates.get('a').resolve();assert.equal(await a,false);assert.deepEqual(render,['pl-b'],'consulta anterior não pode substituir os planos do paciente atual');
 const credito=fs.readFileSync('src/finance/credito_cliente-1.19.0.js','utf8');let liberar;
 Object.assign(c,{financeiroCreditoTabelaDisponivel:true,financeiroCreditosUsosCache:[],obterExclusoesCreditosPendentes:()=>[],obterUsosCreditoLocaisPaciente:()=>[],usoCreditoEstaMarcadoParaExclusao:()=>false,mesclarRegistrosFinanceiros:(x,y)=>[...x,...y]});
 c._supabase.from=()=>{const q={select:()=>q,eq:()=>q,order:()=>q,then:resolve=>new Promise(r=>liberar=r).then(resolve)};return q;};
 vm.runInContext(credito.slice(credito.indexOf('async function carregarCreditosUsosPaciente('),credito.indexOf('const carregarFinanceiroPacienteSemCredito')),c);
 c.financeiroPacienteAtualId='a';const uso=c.carregarCreditosUsosPaciente('a');await Promise.resolve();c.financeiroPacienteAtualId='b';c.financeiroCargaPacienteRevisao++;c.financeiroCreditosUsosCache=[{id:'credito-b'}];liberar({data:[{id:'credito-a'}]});await uso;assert.equal(c.financeiroCreditosUsosCache[0].id,'credito-b','crédito de outro paciente não pode entrar pela resposta atrasada');
 console.log('PASS: consultas reais de planos/pagamentos e créditos rejeitam respostas fora de ordem.');
}
testarCargasFinanceirasForaDeOrdem().catch(error=>{console.error(error);process.exitCode=1;});
