const assert = require('assert');

function referenciaAtendimentoHome(a){
    if(a.atendido_em){const t=Date.parse(a.atendido_em);return Number.isFinite(t)?{t,legado:false}:null;}
    if(!/^\d{4}-\d{2}-\d{2}$/.test(a.data||'')||!/^\d{2}:\d{2}/.test(a.hora_inicio||''))return null;
    const t=Date.parse(`${a.data}T${String(a.hora_inicio).slice(0,5)}:00-03:00`);
    return Number.isFinite(t)?{t,legado:true}:null;
}

function instanteAgendaHome(a){
    if(!/^\d{4}-\d{2}-\d{2}$/.test(a.data||'')||!/^\d{2}:\d{2}/.test(a.hora_inicio||''))return null;
    const t=Date.parse(`${a.data}T${String(a.hora_inicio).slice(0,5)}:00-03:00`);
    return Number.isFinite(t)?t:null;
}

function filtrarAtendimentos24hHome(dados,agora=Date.now(),profissional=''){
    return dados.filter(a=>['atendido','concluido'].includes(String(a.status||'').toLowerCase()))
        .filter(a=>!profissional||String(a.profissional_id)===profissional)
        .map(a=>({...a,__referencia:referenciaAtendimentoHome(a),__instanteAgenda:instanteAgendaHome(a)}))
        .filter(a=>a.__referencia&&Number.isFinite(a.__instanteAgenda)&&a.__instanteAgenda>=agora-86400000&&a.__instanteAgenda<=agora)
        .sort((a,b)=>b.__referencia.t-a.__referencia.t||String(a.id).localeCompare(String(b.id)));
}

const agora = Date.parse('2026-09-12T11:25:00-03:00');
const dados = [
    {
        id:'antigo',
        profissional_id:'prof-1',
        data:'2026-09-04',
        hora_inicio:'15:00:00',
        status:'atendido',
        atendido_em:'2026-09-11T15:32:28-03:00'
    },
    {
        id:'recente',
        profissional_id:'prof-1',
        data:'2026-09-11',
        hora_inicio:'15:00:00',
        status:'atendido',
        atendido_em:'2026-09-11T15:31:33-03:00'
    }
];

const resultado = filtrarAtendimentos24hHome(dados, agora, 'prof-1');
assert.deepStrictEqual(resultado.map(x=>x.id), ['recente']);
assert.strictEqual(resultado[0].__referencia.legado, false);

console.log('home_atendimentos_24h.contract.js OK');

// Executa o motor real da Home administrativa, sem mocks de suas regras.
const adminVM=require('vm');
const adminSource=require('fs').readFileSync('src/home/home_detalhes-1.18.5.js','utf8').split('/* Home administrativa:')[1];
assert(adminSource,'Home administrativa deve permanecer no módulo existente');
const listeners={};let networkCalls=0;
const adminContext={
  usuarioLogado:{id:'prof',tipo:'FISIOTERAPEUTA',clinica_id:'clinic-a'},
  document:{readyState:'loading',getElementById:()=>null,addEventListener:(name,fn)=>{listeners[name]=fn;},body:{classList:{remove(){}}}},
  window:{addEventListener(){}},Intl,Date,console,
  _supabase:{from:()=>{networkCalls++;throw new Error('não deve consultar sem administrador');}}
};
adminVM.createContext(adminContext);
adminVM.runInContext('/* Home administrativa:'+adminSource,adminContext);
const adminAPI=adminContext.window.KineSysAdminHome;
assert.equal(adminAPI.allowed(),false);
listeners.DOMContentLoaded();
assert.equal(networkCalls,0,'profissional não pode disparar consultas financeiras da nova Home');
adminContext.usuarioLogado.tipo='SECRETARIA';assert.equal(adminAPI.allowed(),false);
adminContext.usuarioLogado.tipo='MASTER';assert.equal(adminAPI.allowed(),true);
const p=adminAPI.period('2026-10','2026-10-17');
assert.equal(p.cut,'2026-10-17');assert.equal(adminAPI.period('2026-09','2026-10-17').cut,'2026-09-30');
assert.throws(()=>adminAPI.period('2026-11','2026-10-17'));
const data={
 pagamentos:[{id:'before',plano_id:'pl',valor:100,data_pagamento:'2026-09-30'},{id:'a',plano_id:'pl',valor:200,data_pagamento:'2026-10-01'},{id:'a',plano_id:'pl',valor:200,data_pagamento:'2026-10-01'},{id:'refund',plano_id:'pl',valor:-50,data_pagamento:'2026-10-02'},{id:'future',plano_id:'pl',valor:400,data_pagamento:'2026-10-18'}],
 planos:[{id:'pl',valor_final:1000,status:'ativo'},{id:'cancel',valor_final:500,status:'cancelado'}],
 creditos:[{id:'credit',plano_id:'pl',valor:100,data_uso:'2026-10-03'}],
 despesas:[{id:'e1',valor:50,data_despesa:'2026-10-04'},{id:'e2',valor:999,data_despesa:'2026-10-18'}],
 agendamentos:[{id:'done',paciente_id:'a',plano_id:'pl',data:'2026-10-01',status:'atendido'},{id:'book',paciente_id:'b',data:'2026-10-10',status:'agendado'},{id:'absence',data:'2026-10-11',status:'falta_nao_justificada'},{id:'future',paciente_id:'b',data:'2026-10-18',hora_inicio:'10:00',status:'confirmado'},{id:'cancel',paciente_id:'a',data:'2026-10-19',status:'cancelado'}],
 pacientes:[{id:'a',nome:'Ana',nascimento:'1990-10-17'},{id:'b',nome:'Bruno',nascimento:'18/10/1990'}],horarios:[],bloqueios:[],equipe:[]
};
const result=adminAPI.summarize(data,p);
assert.equal(result.received,150,'recebido é dinheiro do mês, líquido de estorno e sem duplicar registros');
assert.equal(result.receivable,650,'saldo inclui pagamentos anteriores e crédito aplicado, sem contar crédito como receita');
assert.equal(result.expenses,50);assert.equal(result.attended,1,'faltas e reservas não são atendimentos realizados');
assert.equal(result.absences,1);assert.equal(result.occupancy,null,'não inventar ocupação sem jornada');
assert.equal(result.income.reduce((a,b)=>a+b,0),result.received);
assert.equal(result.groups.aniversarios.length,1);assert.equal(result.groups.lembretes[0].id,'b');assert.equal(result.groups.retornos[0].id,'a');
const schedules={...data,equipe:[{id:'p',ativo:true,tipo:'FISIOTERAPEUTA'}],horarios:[{profissional_id:null,dia_semana:4,hora_inicio:'08:00',hora_fim:'12:00'}],bloqueios:[{data:'2026-10-01',hora_inicio:'10:00',hora_fim:'11:00'}],agendamentos:[{id:'a',profissional_id:'p',data:'2026-10-01',hora_inicio:'08:00',hora_fim:'09:00',status:'atendido'},{id:'b',profissional_id:'p',data:'2026-10-01',hora_inicio:'08:30',hora_fim:'09:30',status:'agendado'},{id:'out',profissional_id:'p',data:'2026-10-01',hora_inicio:'06:00',hora_fim:'07:00',status:'atendido'}]};
assert.equal(adminAPI.capacity(schedules,adminAPI.period('2026-10','2026-10-01')).occupancy,50,'ocupação une sobreposições, desconta bloqueios e não mistura encaixes com jornada');
const cssAdmin=require('fs').readFileSync('styles/design_home_activity-1.18.5.css','utf8');
assert(cssAdmin.includes('#tela_home.ks-admin-home-active>:not(#ks_admin_home)'),'ocultação da Home antiga deve exigir classe administrativa');
assert(adminSource.includes("['MASTER','MASTER_FEM','ADMINISTRADOR','ADMINISTRADORA']"));
assert(adminSource.includes(".eq('clinica_id',clinic)"),'todas as consultas devem ter escopo explícito de clínica');
assert(!adminSource.includes(".insert(")&&!adminSource.includes(".update(")&&!adminSource.includes(".delete("),'panorama é somente leitura');
console.log('Home administrador: isolamento de perfis, mês, estorno, crédito, sessões e ocupação OK.');

(async()=>{
 const paginatedContext={...adminContext,window:{addEventListener(){}},usuarioLogado:{id:'admin',tipo:'MASTER',clinica_id:'clinic-a'}};
 let requests=[],fail=false;
 paginatedContext._supabase={from:table=>{
   assert.equal(table,'pagamentos');let offset=0;
   const q={select:()=>q,eq:(key,value)=>{assert.equal(key,'clinica_id');assert.equal(value,'clinic-a');return q;},order:key=>{assert.equal(key,'id');return q;},range:(first,last)=>{offset=first;requests.push([first,last]);return q;},then:resolve=>Promise.resolve(fail?{error:{message:'offline'}}:{data:offset===0?Array.from({length:1000},(_,i)=>({id:String(i)})):[{id:'1000'}],error:null}).then(resolve)};return q;
 }};
 adminVM.createContext(paginatedContext);
 adminVM.runInContext(('/* Home administrativa:'+adminSource).replace('refresh,allowed,period,summarize,capacity','refresh,allowed,period,summarize,capacity,rows'),paginatedContext);
 const api=paginatedContext.window.KineSysAdminHome;
 assert.equal((await api.rows('pagamentos','id','clinic-a')).length,1001,'não truncar totais no limite padrão de 1000 linhas');
 assert.deepStrictEqual(requests,[[0,999],[1000,1999]]);
 fail=true;await assert.rejects(api.rows('pagamentos','id','clinic-a'),/Não foi possível confirmar/,'falha de consulta não pode virar total zero');
 console.log('Home administrador: paginação determinística, escopo e erro de leitura OK.');
 // Mantém refresh intacto; simula somente DOM e transporte para testar a corrida de sessão.
 let code='/* Home administrativa:'+adminSource;
 const replaceRange=(start,end,replacement)=>{const a=code.indexOf(start),b=code.indexOf(end,a);assert(a>=0&&b>a);code=code.slice(0,a)+replacement+'\n    '+code.slice(b);};
 replaceRange('async function load(', 'function icon(', 'async function load(){ return testLoad(); }');
 replaceRange('function mount(){', 'function setStatus(', 'function mount(){return testRoot;}');
 replaceRange('function setStatus(', 'function clear(){', 'function setStatus(text){testStatus(text);}');
 replaceRange('function clear(){', 'async function refresh(', 'function clear(){state.data=null;state.summary=null;}');
 replaceRange('function render(){', 'function draw(){', 'function render(){testRender();}');
 const callbacks=[],statuses=[];let renders=0;
 const root={setAttribute(){},remove(){},hidden:false},homeNode={classList:{contains:()=>true,add(){},remove(){}}};
 const monthNode={value:'',max:''};
 const race={usuarioLogado:{id:'admin',tipo:'MASTER',clinica_id:'clinic-a'},window:{addEventListener(){}},document:{readyState:'loading',addEventListener(){},getElementById:id=>id==='ks_admin_month'?monthNode:id==='tela_home'?homeNode:id==='ks_admin_home'?root:null,body:{classList:{toggle(){},remove(){}}}},Intl,Date,console,
 testRoot:root,testStatus:t=>statuses.push(t),testRender:()=>renders++,testLoad:()=>new Promise((resolve,reject)=>callbacks.push({resolve,reject}))};
 adminVM.createContext(race);adminVM.runInContext(code,race);const refreshAPI=race.window.KineSysAdminHome;
 const stale=refreshAPI.refresh(true);race.usuarioLogado.clinica_id='clinic-b';callbacks.shift().resolve(data);
 assert.equal(await stale,false);assert.equal(renders,0,'resposta de sessão anterior não pode renderizar dados financeiros');
 const fresh=refreshAPI.refresh(true);callbacks.shift().resolve(data);assert.equal(await fresh,true);assert.equal(renders,1);
 const failed=refreshAPI.refresh(true);callbacks.shift().reject(new Error('offline'));assert.equal(await failed,false);assert(statuses.at(-1).includes('Nenhum valor estimado'));
 const retry=refreshAPI.refresh(true);callbacks.shift().resolve(data);assert.equal(await retry,true,'falha não pode travar a nova tentativa');
 race.usuarioLogado.tipo='FISIOTERAPEUTA';assert.equal(await refreshAPI.refresh(true),false);assert.equal(callbacks.length,0);
 console.log('Home administrador: resposta tardia, troca de clínica, erro/retry e bloqueio do perfil profissional OK.');
})().catch(error=>{console.error(error);process.exitCode=1;});
