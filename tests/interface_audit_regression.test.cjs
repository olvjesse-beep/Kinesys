// Regressões da auditoria. Dados sintéticos; nenhum acesso ao banco ou navegador.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const read=p=>fs.readFileSync(p,'utf8');
const design=read('src/core/design_system-1.20.1.js');
function fn(source,name){
 const start=source.search(new RegExp('(?:async )?function '+name+'\\('));assert(start>=0,name);
 const rest=source.slice(start),next=rest.slice(rest.indexOf('{')+1).search(/\n(?:async )?function \w+\(/);
 return next<0?rest:rest.slice(0,rest.indexOf('{')+1+next);
}
function node(){return {textContent:'',innerHTML:'',attributes:{},setAttribute(k,v){this.attributes[k]=v;},removeAttribute(k){delete this.attributes[k];}};}
async function navigation(){
 const start=design.indexOf('  function installRouteAnnouncements()'),end=design.indexOf("\n  document.addEventListener('keydown'",start);
 const nodes={ks_route_status:node(),ks_page_title:{...node(),focus(){this.focused=(this.focused||0)+1;}}},pending={},raf=[];
 let active='';
 for(const id of ['a','b','c'])nodes[id]={classList:{contains:()=>active===id},querySelector:()=>null};
 const env={document:{getElementById:id=>nodes[id]},requestAnimationFrame:callback=>raf.push(callback),window:{navegarPara:id=>new Promise(resolve=>pending[id]=resolve)}};
 vm.runInNewContext(design.slice(start,end)+'\ninstallRouteAnnouncements();',env);
 const first=env.window.navegarPara('a');const second=env.window.navegarPara('b');
 active='b';nodes.ks_page_title.textContent='Configurações';pending.b(true);await second;
 active='b';pending.a(true);await first;raf.splice(0).forEach(callback=>callback());
 assert.equal(nodes.ks_route_status.textContent,'Configurações','a resposta anterior não pode anunciar outra rota');
 assert.equal(nodes.ks_page_title.focused,1);
 const cancelled=env.window.navegarPara('c');pending.c(false);assert.equal(await cancelled,false);raf.splice(0).forEach(callback=>callback());assert.equal(nodes.ks_page_title.focused,1);
}
async function team(){
 const source=read('src/admin/team_management_core-1.0.0.js'),tbody=node(),requests=[];
 const env={document:{getElementById:()=>tbody},CAMPOS_PUBLICOS_PERFIL:'id,nome',usuarioLogado:{id:'u',clinica_id:'c'},_supabase:{from:()=>({select:()=>new Promise(resolve=>requests.push(resolve))})}};
 vm.runInNewContext('let equipeListaRevisao=0;\n'+fn(source,'carregarListaEquipe'),env);
 const first=env.carregarListaEquipe();assert.match(tbody.innerHTML,/Carregando/);
 requests.shift()({error:{message:'Falha sintética'}});await first;
 assert.match(tbody.innerHTML,/Não foi possível/);assert.match(tbody.innerHTML,/Tentar novamente/);assert.doesNotMatch(tbody.innerHTML,/Nenhum/);
 const retry=env.carregarListaEquipe();requests.shift()({data:[],error:null});await retry;assert.match(tbody.innerHTML,/Nenhum usuário/);
 const old=env.carregarListaEquipe(),current=env.carregarListaEquipe();const [finishOld,finishCurrent]=requests.splice(0);
 finishCurrent({error:{message:'Falha atual'}});await current;finishOld({data:[]});await old;assert.match(tbody.innerHTML,/Não foi possível/);
 const changed=env.carregarListaEquipe();env.usuarioLogado.clinica_id='outra';const previous=tbody.innerHTML;requests.shift()({data:[]});await changed;assert.equal(tbody.innerHTML,previous,'resposta de outra clínica não altera a tela');
}
async function finance(){
 const source=read('src/finance/pendencias_financeiras-1.19.0.js');
 const ids=['financeiro_pendencias_count','fin_pen_stat_ativos','fin_pen_stat_cobrar','fin_pen_stat_atender','fin_pen_stat_renovar','fin_pen_stat_semhorario','financeiro_pendencias_lista','financeiro_pendencias_feedback'];
 const nodes=Object.fromEntries(ids.map(id=>[id,node()]));let rejectLoad;
 const env={console:{error(){}},Date,document:{getElementById:id=>nodes[id]},financeiroPendenciasCache:[],financeiroPendenciasCarregando:false,financeiroPendenciasUltimaCarga:0,financeiroPendenciasAvisoParcial:'',carregarDadosPendenciasFinanceiras:()=>new Promise((resolve,reject)=>rejectLoad=reject),construirPendenciasPorPaciente:()=>[],renderizarPendenciasFinanceiras(){}};
 for(const name of ['atualizarResumoPendenciasFinanceiras','marcarPendenciasNaoConfirmadas','carregarPendenciasFinanceiras'])vm.runInNewContext(fn(source,name),env);
 const pending=env.carregarPendenciasFinanceiras(true);assert.equal(nodes.financeiro_pendencias_count.textContent,'—');
 rejectLoad(new Error('offline sintético'));await pending;assert.equal(nodes.financeiro_pendencias_count.textContent,'—');assert.match(nodes.financeiro_pendencias_lista.innerHTML,/Falha/);
 const errorMarkup=nodes.financeiro_pendencias_lista.innerHTML;
 vm.runInNewContext(fn(source,'renderizarPendenciasFinanceiras'),env);
 env.renderizarPendenciasFinanceiras();assert.equal(nodes.financeiro_pendencias_lista.innerHTML,errorMarkup,'filtrar após erro não exibe cache como resposta confirmada');
 env.renderizarPendenciasFinanceiras=()=>{};
 env.carregarDadosPendenciasFinanceiras=async()=>({pacientes:[],planos:[],pagamentos:[],usos:[],agendamentos:[]});await env.carregarPendenciasFinanceiras(true);
 assert.equal(nodes.financeiro_pendencias_count.textContent,'0');assert.equal(nodes.financeiro_pendencias_count.attributes['aria-label'],undefined);assert.match(nodes.financeiro_pendencias_feedback.textContent,/0 pacientes/);
}
function presentation(){
 const env={};
 const clean=design.match(/    function textoLimpo\(msg\)\{[^\n]+/)[0];
 const date=design.slice(design.indexOf('    function formatarDataDiretorio('),design.indexOf('    function prepararFinanceiro('));
 vm.runInNewContext(clean+'\n'+date,env);
 for(const mark of ['⚠️','✅','🔒','🛡️','💾','📌','✓'])assert.equal(env.textoLimpo(mark+' Ação válida'),'Ação válida');
 vm.runInNewContext(design.slice(design.indexOf('    function classificar('),design.indexOf('    function toast(')),env);
 for(const [text,hint,expected] of [['Dados inválidos','aviso','aviso'],['Perfil restrito','seguranca','seguranca'],['Cadastro concluído','sucesso','sucesso'],['O registro não foi salvo','erro','erro'],['Não foi possível consultar','aviso','erro'],['Falha parcial','sucesso','sucesso']])assert.equal(env.classificar(text,hint),expected,'remover emoji não perde a prioridade de gravidade');
 assert.equal(env.textoLimpo('⚠️ 🔒 Aviso'),'Aviso');assert.equal(env.textoLimpo('Texto 🧑‍⚕️ preservado'),'Texto 🧑‍⚕️ preservado');
 assert.equal(env.formatarDataDiretorio('2026-10-23T00:00:00Z'),'23/10/2026');assert.equal(env.formatarDataDiretorio('2026-10-23'),'23/10/2026');
 const css=read('styles/interface_audit-1.0.0.css');assert.match(css,/clip-path:none!important/);assert.match(css,/flex:0 1 auto!important/);assert.match(css,/min-width:660px/);assert.match(css,/overflow-x:auto/);
 assert.match(css,/ks-report-editor\{position:static!important;min-height:0!important/,'coluna de documento não recebe deslocamento sticky');
 assert.match(css,/checkbox-pill\{flex:0 0 auto!important;white-space:nowrap!important/,'estados clínicos não partem palavras');
 const lifecycle=read('src/agenda/agenda_lifecycle-1.0.0.js');assert.doesNotMatch(lifecycle,/nav\.remove\(/);assert.match(lifecycle,/hostTopo\.appendChild\(nav\)/);assert.match(lifecycle,/hostTopo\.appendChild\(data\)/);
 const bootstrap=lifecycle.slice(lifecycle.lastIndexOf('    requestAnimationFrame(()=>{'),lifecycle.indexOf('    window.KineSysAgendaLifecycle='));
 let organized=0;vm.runInNewContext(bootstrap,{requestAnimationFrame:callback=>callback(),modoMobileAgenda:()=>true,preservarNavegacaoMobileAgenda(){organized++;},organizarControlesMobileAgenda(){organized++;},observarEstruturaMobileAgenda(){organized++;}});assert.equal(organized,3,'bootstrap mobile executa sem referência obsoleta');
 const html=read('index.html');assert.match(html,/evo_eva_avaliada/);assert.match(html,/eva_slider_evo" disabled/);assert.match(html,/value="" checked><span>Não informado/);assert.match(html,/interface_audit-1\.0\.0\.css/);
 assert.doesNotMatch(html,/\p{Extended_Pictographic}/u,'HTML de entrada não contém emojis decorativos');
 assert.match(read('src/core/script-1.18.0.js'),/eva: ev\.eva \?\? null/,'transporte não transforma ausência em zero');
}
(async()=>{presentation();await navigation();await team();await finance();console.log('interface_audit_regression: OK (rotas concorrentes, erro/vazio/carga, Unicode, datas e contratos visuais)');})().catch(error=>{console.error(error);process.exitCode=1;});
