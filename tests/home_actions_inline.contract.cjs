const fs=require('node:fs'),assert=require('node:assert/strict');
const css=fs.readFileSync('styles/home_profissional_dashboard-1.0.0.css','utf8');
const html=fs.readFileSync('index.html','utf8');
const home=fs.readFileSync('src/home/home_fisioterapeuta_util-1.24.0.js','utf8');
assert(!css.includes('max-width:255px'),'O grupo de três ações não pode continuar limitado a 255px');
assert.match(css,/#tela_home\.ks-prof-home-active #card_painel_fisioterapeuta\{container:ks-meu-dia \/ inline-size\}/,'Responsividade precisa considerar a largura real do card na grade de duas colunas');
const compact=css.slice(css.indexOf('@container ks-meu-dia (max-width:720px)'));
assert.match(compact,/grid-column:2;justify-content:flex-start;width:100%/,'Em card estreito, ações usam a faixa abaixo do paciente');
assert.match(compact,/flex:1 1 0;min-width:0;white-space:normal;word-break:normal;overflow-wrap:normal/,'Três botões dividem a linha sem cortar títulos ou quebrar letras');
assert.match(compact,/@container ks-meu-dia \(max-width:480px\)[\s\S]*grid-column:1/,'No celular o grupo horizontal usa toda a largura');
assert.match(css,/\.ks-fisio-record-done\{flex-basis:100%;justify-content:flex-end\}/,'Carimbo de conclusão tem faixa própria e não empurra um botão para outra linha');
for(const label of ['Análise da evolução','Realizar avaliação','Evolução'])assert(home.includes(label),'Preservar ação: '+label);
assert(home.includes("abrirRegistroClinico(agendamento.paciente_id,'avaliacao',agendamento.id)"),'Preservar vínculo clínico');
const href=html.match(/href="(styles\/home_profissional_dashboard-1\.0\.0\.css\?[^"\s]+)"/)?.[1];
assert(new URL(href,'https://app.fisiofixfisioterapia.com/').searchParams.get('v'),'CSS precisa de revisão explícita');
console.log('PASS Meu dia: grupo horizontal, responsividade pelo card, títulos completos, carimbo separado e vínculos preservados.');

// Executa a apresentação real da Home com transporte e elementos isolados.
// Nenhum aviso de produção é consultado, marcado como lido ou apagado.
const vm=require('node:vm');
const dashboard=fs.readFileSync('src/home/home_profissional_dashboard-1.0.0.js','utf8');
function notificationsSetup(){
 const listeners={},opened=[];
 class Element{
  constructor(){this.hidden=false;this.textContent='';this.attrs={};this.events={};this.rows=[];this.classes=new Set();this.scrollTop=0;this.classList={toggle:(c,on)=>on?this.classes.add(c):this.classes.delete(c)};}
  setAttribute(k,v){this.attrs[k]=v;}addEventListener(k,f){this.events[k]=f;}
  set innerHTML(s){this.html=s;this.rows=[...s.matchAll(/<button\b[^>]*data-index="(\d+)"[^>]*>/g)].map(m=>{const e=new Element();e.dataset={index:m[1]};e.disabled=/\bdisabled/.test(m[0]);return e;});}
  get innerHTML(){return this.html;}querySelectorAll(){return this.rows;}
 }
 const ids=Object.fromEntries(['ks_prof_notifications_list','ks_prof_notification_count','ks_prof_notifications_toggle'].map(id=>[id,new Element()]));
 const ctx={console,Intl,Date,Map,Set,Promise,window:{},usuarioLogado:{id:'prof1',tipo:'FISIOTERAPEUTA',clinica_id:'clinica1'},agendaNotificacoesCache:[],obterPacientesSalvos:async()=>[],carregarNotificacoesAgenda:async()=>[],abrirNotificacaoAgenda:id=>opened.push(id),document:{readyState:'loading',getElementById:id=>ids[id]||null,addEventListener:(n,f)=>listeners[n]=f}};
 vm.runInNewContext(dashboard.replace('window.KineSysProfessionalHome={','window.__test={carregarNotificacoesHome,alternarNotificacoes,token:()=>refreshToken,agoraBrasilia};window.KineSysProfessionalHome={'),ctx);
 const api=ctx.window.__test;
 return {ctx,ids,api,listeners,opened,load:()=>api.carregarNotificacoesHome(api.token())};
}
(async()=>{
 const t=notificationsSetup(),list=t.ids.ks_prof_notifications_list,toggle=t.ids.ks_prof_notifications_toggle,count=t.ids.ks_prof_notification_count;
 const avisos=Array.from({length:12},(_,i)=>({id:'aviso-'+i,titulo:i===0?'<script>não executar</script>':'Horário excepcional',mensagem:'Texto completo do aviso '+i,lida:i===1,agendamento_data:'2030-01-01'}));
 const snapshot=JSON.stringify(avisos);t.ctx.agendaNotificacoesCache=avisos;await t.load();
 assert.equal(list.rows.length,12,'Não truncar o cache canônico em oito avisos');
 assert.equal(list.rows.filter(x=>!x.hidden).length,2);assert.equal(toggle.hidden,false);assert.equal(toggle.attrs['aria-expanded'],'false');assert.equal(toggle.textContent,'Expandir avisos (12)');assert.equal(count.textContent,'11');
 assert(list.html.includes('&lt;script&gt;'));assert(!list.html.includes('<script>'));
 t.api.alternarNotificacoes();assert.equal(list.rows.filter(x=>!x.hidden).length,12);assert.equal(toggle.attrs['aria-expanded'],'true');assert(list.classes.has('is-expanded'));
 assert.equal(toggle.textContent,'Recolher avisos');list.rows[11].events.click();assert.deepEqual(t.opened,['aviso-11']);
 assert.equal(JSON.stringify(avisos),snapshot,'Expandir e recolher não alteram dados/lida');
 await t.load();assert.equal(list.rows.filter(x=>!x.hidden).length,12,'Refresh preserva a expansão no mesmo contexto');
 list.scrollTop=150;t.api.alternarNotificacoes();assert.equal(list.scrollTop,0);assert.equal(list.rows.filter(x=>!x.hidden).length,2);
 t.api.alternarNotificacoes();t.ctx.usuarioLogado.clinica_id='clinica2';await t.load();assert.equal(toggle.attrs['aria-expanded'],'false','Troca de clínica recolhe a lista');
 t.ctx.agendaNotificacoesCache=avisos.slice(0,2);await t.load();assert.equal(toggle.hidden,true);assert.equal(list.rows.filter(x=>!x.hidden).length,2);
 t.ctx.agendaNotificacoesCache=[];const today=t.api.agoraBrasilia();t.ctx.obterPacientesSalvos=async()=>[{id:'sintetico',nome:'Aniversariante de exemplo',nascimento:`1990-${String(today.mes).padStart(2,'0')}-${String(today.dia).padStart(2,'0')}`}];await t.load();
 assert.equal(list.rows.length,1);assert.equal(list.rows[0].disabled,true);assert.equal(count.textContent,'1');assert.equal(toggle.hidden,true);
 t.ctx.obterPacientesSalvos=async()=>[];await t.load();assert.equal(count.hidden,true);assert.equal(toggle.hidden,true);assert(list.html.includes('Nenhuma notificação agora'));assert(!list.classes.has('is-expanded'));
 // Resposta anterior ao logout não pode voltar a preencher a Home.
 let finish;t.ctx.obterPacientesSalvos=()=>new Promise(resolve=>{finish=resolve;});const pending=t.load();
 t.listeners['kinesys:tela-ativada']({detail:{id:'tela_login'}});finish([]);await pending;assert(list.html.includes('Nenhuma notificação agora'));
 assert.match(css,/\.ks-prof-notification-item\[hidden\],[\s\S]*display:none!important/);
 assert.match(css,/\.ks-prof-notification-list\.is-expanded\{[^}]*max-height:[^}]*overflow-y:auto/,'Lista expandida deve ter altura limitada e rolagem');
 assert.match(css,/\.ks-prof-notifications-toggle\{[^}]*min-height:44px/,'Controle acessível por toque');
 assert.match(dashboard,/aria-controls="ks_prof_notifications_list"/);assert(!dashboard.includes('Somente avisos com data de hoje'));
 const script=html.match(/src="(src\/home\/home_profissional_dashboard-1\.0\.0\.js\?[^"\s]+)"/)?.[1];
 assert.equal(new URL(script,'https://app.fisiofixfisioterapia.com/').searchParams.get('v'),new URL(href,'https://app.fisiofixfisioterapia.com/').searchParams.get('v'),'JS e CSS da expansão pertencem à mesma publicação');
 console.log('PASS Notificações: 2 resumos, expansão de 12 avisos, recolhimento, leitura completa, vínculo original, aniversário, XSS, refresh e isolamento de contexto.');
})().catch(e=>{console.error(e);process.exitCode=1;});
