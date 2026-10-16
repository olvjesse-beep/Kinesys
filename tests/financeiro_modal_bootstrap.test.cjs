const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=fs.readFileSync('index.html','utf8');
assert(html.indexOf('src/ui/modal_helpers-1.0.0.js')<html.indexOf('src/finance/financeiro-1.19.0.js'));
assert.doesNotMatch(fs.readFileSync('src/agenda/agenda-1.20.0.js','utf8'),/function (abrirModal|fecharModal)\(/);
const classes=new Set(),ctx=vm.createContext({document:{body:{classList:{add(){},remove(){}}},querySelector:()=>null,getElementById:id=>id==='modal_fin_plano'?{setAttribute(){},classList:{add:v=>classes.add(v),remove:v=>classes.delete(v)}}:null}});
vm.runInContext(fs.readFileSync('src/ui/modal_helpers-1.0.0.js','utf8'),ctx);
ctx.abrirModal('modal_fin_plano');assert(classes.has('ativa'));ctx.fecharModal('modal_fin_plano');assert(!classes.has('ativa'));ctx.abrirModal('ausente');
console.log('PASS: diálogos financeiros disponíveis sem carregar Agenda.');

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
