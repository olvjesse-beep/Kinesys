// Dados exclusivamente sintéticos; nenhuma consulta ou mutação de pacientes reais.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('src/home/home_fisioterapeuta_util-1.24.0.js','utf8');
class Element{
 constructor(tag='div'){this.tagName=tag.toUpperCase();this.children=[];this.dataset={};this.attrs={};this.events={};this.className='';this.textContent='';this.hidden=false;this.style={};this.classList={add:(c)=>this.className+=' '+c,remove:c=>this.className=this.className.split(' ').filter(x=>x!==c).join(' '),contains:c=>this.className.split(' ').includes(c)};}
 append(...nodes){this.children.push(...nodes.flatMap(n=>n.tagName==='FRAGMENT'?n.children:[n]));}appendChild(n){this.append(n);return n;}replaceChildren(...n){this.children=[];this.append(...n);}setAttribute(k,v){this.attrs[k]=v;}addEventListener(k,f){this.events[k]=f;}querySelector(){return null;}
}
const flatten=e=>[e,...e.children.flatMap(flatten)];
function setup(){
 const nodes={card_painel_fisioterapeuta:new Element(),painel_fisio_resumo:new Element(),painel_fisio_lista:new Element(),tela_home:new Element()};
 const listeners={},calls=[],contexts=[];let patients=[],appointments=[],pending=null,fail=false;
 const ctx={console,Intl,Date,Map,Set,Promise,setTimeout,clearTimeout,usuarioLogado:{id:'prof1',tipo:'FISIOTERAPEUTA',clinica_id:'clinica1'},CustomEvent:class{constructor(type,options={}){this.type=type;this.detail=options.detail;}},document:{readyState:'loading',getElementById:id=>nodes[id]||null,createElement:t=>new Element(t),createDocumentFragment:()=>new Element('fragment'),addEventListener:(n,f)=>listeners[n]=f,dispatchEvent:e=>listeners[e.type]?.(e)},window:{},obterAvaliacoes:p=>p?.avaliacoes||[],obterPacientesSalvos:async()=>pending?pending:patients,abrirAtendimentoDoPainel:async(id,mode)=>calls.push([id,mode]),_supabase:{rpc:async()=>({data:{perfil_id:'prof1',clinica_id:'clinica1',profissionais:[{id:'prof1'}]}}),from(){const q={select(){return q;},eq(){return q;},order(){return q;},in(){return q;},lte(){return q;},neq(){return q;},then(resolve,reject){return Promise.resolve(fail?{error:{message:'Indisponível'}}:{data:appointments}).then(resolve,reject);}};return q;}}};
 ctx.window.definirAgendamentoClinicoContexto=(...a)=>contexts.push(a);
 vm.runInNewContext(source.replace('window.KineSysMeuDiaClinico=Object.freeze({','window.__test={cuidadosPaciente,contextoClinico,montarLinha,instanteHomeBrasilia,sequenciaDoAtendimento,carregarHistoricoAgenda};window.KineSysMeuDiaClinico=Object.freeze({'),ctx);
 const patient=(id='p1',avaliacoes=[])=>({id,clinica_id:'clinica1',nome:'Paciente sintético '+id,avaliacoes,evolucoes:[]});
 function row(p,familia='fisioterapia',status='agendado'){
  const a={id:'agenda1',paciente_id:p?.id||'p1',hora_inicio:'10:00',status};
  return ctx.window.__test.montarLinha({agendamento:a,paciente:p,nome:'Paciente sintético',clinica:ctx.window.__test.contextoClinico(p,a,'2026-10-22',{familia,rotulo:'Sessão',primeiroAtendimentoClinica:false}),situacao:{classe:'is-upcoming',rotulo:'Agendado'}});
 }
 function schedule(){const now=ctx.window.__test.instanteHomeBrasilia();appointments=[{id:'agenda1',paciente_id:'p1',hora_inicio:now.hora,hora_fim:'23:59',status:'agendado',procedimentos:{nome:'Fisioterapia'}}];}
 return {ctx,nodes,listeners,calls,contexts,patient,row,schedule,set patients(v){patients=v;},set pending(v){pending=v;},set fail(v){fail=v;}};
}
(async()=>{
 const t=setup(),api=t.ctx.window.__test,p=t.patient();
 const buttons=r=>flatten(r).filter(e=>e.tagName==='BUTTON');
 let r=t.row(p);let av=buttons(r).find(e=>e.textContent==='Realizar avaliação');assert(av);await av.events.click();
 assert.deepEqual(t.calls,[['p1','avaliacao']]);assert.deepEqual(t.contexts,[['agenda1','p1','avaliacao']]);assert(buttons(r).some(e=>e.textContent==='Evolução'),'Exceção de evolução preservada');
 assert.equal(buttons(t.row(p,'avaliacao')).filter(e=>e.textContent==='Realizar avaliação').length,1);
 for(const record of [{status:'rascunho'},{mapeamento:{meta:{status:'rascunho'}}}])assert(buttons(t.row(t.patient('p1',[record]))).some(e=>e.textContent==='Realizar avaliação'));
 for(const record of [{status:'finalizada'},{}])assert(!buttons(t.row(t.patient('p1',[record]))).some(e=>e.textContent==='Realizar avaliação'));
 assert(buttons(t.row(t.patient('p1',[{status:'finalizada'}]),'avaliacao')).some(e=>e.textContent==='Reavaliar'));
 for(const status of ['cancelado','falta_justificada','falta_nao_justificada','faltou'])assert.equal(buttons(t.row(p,'fisioterapia',status)).length,0);
 assert.equal(buttons(t.row(null)).length,0);p.__dadosLocaisPendentes=true;assert.equal(buttons(t.row(p)).length,0);delete p.__dadosLocaisPendentes;
 const old={id:'av1',status:'finalizada',dataAvaliacao:'2026-09-01',cirurgias:[{texto:'Artrodese lombar L4-L5'},'Prótese de quadril direito'],hma:'Mãe tem artrodese cervical. Paciente aguarda artroplastia do quadril. Nega amputação. Usa prótese dentária.',mapeamento:{clinicaEstruturada:{restricoesPosOperatorias:{ativo:true,proibicoes:'Restrição antiga'}}}};
 const recent={id:'av2',status:'finalizada',dataAvaliacao:'2026-10-22',mapeamento:{clinicaEstruturada:{contextoAnamnese:{campos:{contexto_trauma_observacao:'Evitar apoio no membro direito conforme orientação registrada.'}},restricoesPosOperatorias:{ativo:true,procedimento:'Artroplastia de quadril',statusCarga:'parcial',restricaoADM:'Limite documentado: 80 graus',orientacoesCirurgiao:'Conferir protocolo individual',proibicoes:'Sem mobilização forçada'}}}};
 p.avaliacoes=[old,recent];const snapshot=JSON.stringify(p);const care=api.cuidadosPaciente(p);assert.equal(JSON.stringify(p),snapshot);
 const text=care.map(x=>x.texto).join('\n');for(const s of ['Artrodese lombar L4-L5','Prótese de quadril direito','80 graus','Sem mobilização forçada','Evitar apoio'])assert(text.includes(s));
 for(const s of ['Mãe','aguarda','Nega amputação','dentária','Restrição antiga'])assert(!text.includes(s));assert(care[0].tipo.startsWith('Pós-operatório'));
 const row=t.row(p);const all=flatten(row);assert(all.find(e=>e.className==='ks-fisio-day-care'));assert(all.find(e=>e.tagName==='SUMMARY'));assert(all.find(e=>e.textContent.includes('22/10/2026')));
 p.avaliacoes.push({...recent,id:'draft',status:'rascunho',dataAvaliacao:'2026-10-23',cirurgias:['Amputação de perna']});assert(!api.cuidadosPaciente(p).some(x=>/Amputação/.test(x.texto)));
 p.avaliacoes=[{...old,paciente_id:'outro'},{...old,clinica_id:'outra'}];assert.equal(api.cuidadosPaciente(p).length,0);
 p.avaliacoes=[{status:'finalizada',hma:'Paciente tem artrodese cervical C5-C6.'}];assert(api.cuidadosPaciente(p).some(i=>i.texto.includes('C5-C6')));
 p.avaliacoes=[{status:'finalizada',hma:'Sem artrodese. Prótese de quadril indicada. Pai possui marca-passo.'}];assert.equal(api.cuidadosPaciente(p).length,0);
 p.avaliacoes=[{status:'finalizada',hma:'Relata coxartrose com indicação para artroplastia total. Será submetido a artrodese lombar.'}];assert.equal(api.cuidadosPaciente(p).length,0);
 // Diagnóstico é digitado pelo profissional, da avaliação finalizada mais recente.
 const dx=(id,data,texto,status='finalizada')=>({id,realizadoEm:data,status,mapeamento:{clinicaEstruturada:{diagnosticoProfissional:texto}}});
 p.avaliacoes=[dx('a2','2026-10-22T10:00:00Z','Prótese total de quadril esquerdo'),dx('a1','2026-10-21T10:00:00Z','Diagnóstico anterior'),dx('a3','2026-10-23T10:00:00Z','Rascunho não concluído','rascunho')];
 let diagnoses=flatten(t.row(p)).filter(e=>e.className==='ks-fisio-day-diagnosis');assert.equal(diagnoses.length,1);assert.equal(diagnoses[0].textContent,'Diagnóstico: Prótese total de quadril esquerdo');
 p.avaliacoes.push(dx('a4','2026-10-24T10:00:00Z',''));assert.equal(flatten(t.row(p)).filter(e=>e.className==='ks-fisio-day-diagnosis').length,0,'limpar na avaliação atual não ressuscita diagnóstico antigo');
 p.avaliacoes=[{...dx('outro','2026-10-25','Não pode aparecer'),paciente_id:'outra-pessoa'}];assert.equal(flatten(t.row(p)).filter(e=>e.className==='ks-fisio-day-diagnosis').length,0);
 // Pipeline real de consulta, fotografia atômica, finalização e retorno à Home.
 t.schedule();t.patients=[t.patient()];assert.equal(await t.ctx.window.KineSysMeuDiaClinico.refresh(),true);
 assert(flatten(t.nodes.painel_fisio_lista).some(e=>e.textContent==='Realizar avaliação'));
 t.patients=[t.patient('p1',[{status:'finalizada',cirurgias:['Artrodese cervical']}])];
 t.ctx.document.dispatchEvent(new t.ctx.CustomEvent('kinesys:avaliacao-salva',{detail:{clinicaId:'clinica1',pacienteId:'p1'}}));
 assert.equal(await t.ctx.window.KineSysMeuDiaClinico.ensure(),true);
 assert(!flatten(t.nodes.painel_fisio_lista).some(e=>e.textContent==='Realizar avaliação'));
 assert(flatten(t.nodes.painel_fisio_lista).some(e=>e.textContent==='Artrodese cervical'));
 // Resposta antiga não substitui dados após troca de clínica.
 let resolve;t.pending=new Promise(r=>resolve=r);const inflight=t.ctx.window.KineSysMeuDiaClinico.refresh();await new Promise(r=>setTimeout(r,0));
 const renders=t.ctx.window.KineSysMeuDiaClinico.status().renders;t.ctx.usuarioLogado={...t.ctx.usuarioLogado,clinica_id:'clinica2'};resolve([t.patient()]);await inflight;assert.equal(t.ctx.window.KineSysMeuDiaClinico.status().renders,renders);
 t.ctx.usuarioLogado={id:'admin',tipo:'ADMINISTRADOR',clinica_id:'clinica1'};assert.equal(await t.ctx.window.KineSysMeuDiaClinico.refresh(),false);assert(t.nodes.card_painel_fisioterapeuta.hidden);
 const core=fs.readFileSync('src/core/script-1.18.0.js','utf8');assert(core.indexOf("new CustomEvent('kinesys:avaliacao-salva'")>core.indexOf('const sucesso=await salvarPacienteNaNuvem(pacienteObjeto'));
 // Contagem documental do pacote: sete presenças e duas faltas consomem nove sessões.
 // Não usa nome, preço, número de sessões do procedimento ou contratos anteriores.
 const consulta=setup(),contagem=consulta.ctx.window.__test;
 const visita=(id,status='atendido',plano_id='plano-atual',extra={})=>({id,paciente_id:'p1',clinica_id:'clinica1',plano_id,procedimento_id:'fisio',procedimentos:{nome:'Fisioterapia'},data:'2026-11-03',hora_inicio:'10:00',status,...extra});
 const atual=visita('atual','atendido','plano-atual',{data:'2026-11-04'});
 const historico=[...Array.from({length:6},(_,i)=>visita('presenca-'+i)),visita('falta-1','falta_nao_justificada'),visita('falta-2','falta_nao_justificada'),atual,
  visita('cancelado','cancelado'),visita('justificada','falta_justificada'),visita('legado','faltou'),visita('reservado','agendado'),visita('recepcao','em_recepcao'),visita('pre','pre_agendado'),visita('confirmado','confirmado'),
  visita('outro-pacote','atendido','plano-anterior'),visita('outro-paciente','atendido','plano-atual',{paciente_id:'p2'}),visita('outra-clinica','atendido','plano-atual',{clinica_id:'clinica2'}),visita('futuro','agendado','plano-atual',{data:'2026-11-09'})];
 const antes=JSON.stringify(historico),contar=(a=atual,h=historico)=>contagem.sequenciaDoAtendimento(a,h,'2026-11-04');
 let seq=contar();assert.equal(seq.rotulo,'Fisioterapia · 9 sessões consumidas do plano');assert.equal(seq.resumoSessoes,'7 atendimentos realizados · 2 faltas não justificadas');assert.equal(JSON.stringify(historico),antes);
 seq=contar(atual,[...historico,atual]);assert.equal(seq.rotulo,'Fisioterapia · 9 sessões consumidas do plano','registro atual não é contado duas vezes');
 const render=contagem.montarLinha({agendamento:atual,paciente:consulta.patient(),nome:'Paciente sintético',clinica:contagem.contextoClinico(consulta.patient(),atual,'2026-11-04',seq),situacao:{classe:'is-done',rotulo:'Atendido'}});
 assert(flatten(render).some(e=>e.textContent===seq.rotulo));assert(flatten(render).some(e=>e.dataset.ksResumoSessoes==='1'&&e.textContent==='7 atendimentos realizados · 2 faltas não justificadas'));
 // Agendamento futuro/reservado não é presença nem consumo; estado atual prevalece sobre cache.
 seq=contar({...atual,status:'agendado'});assert.equal(seq.rotulo,'Fisioterapia · 8 sessões consumidas do plano');assert.match(seq.resumoSessoes,/^6 atendimentos realizados/);
 seq=contar({...atual,status:'falta_nao_justificada'});assert.equal(seq.rotulo,'Fisioterapia · 9 sessões consumidas do plano');assert.equal(seq.resumoSessoes,'6 atendimentos realizados · 3 faltas não justificadas');
 seq=contar({...atual,status:'falta_justificada'});assert.equal(seq.rotulo,'Fisioterapia · 8 sessões consumidas do plano');
 seq=contar({...atual,plano_id:'novo'},[]);assert.equal(seq.rotulo,'Fisioterapia · 1 sessão consumida do plano');assert.equal(seq.resumoSessoes,'1 atendimento realizado · 0 faltas não justificadas');
 seq=contar({...atual,plano_id:'novo',status:'agendado'},historico);assert.equal(seq.rotulo,'Fisioterapia · 0 sessões consumidas do plano');
 seq=contar({...atual,plano_id:null},historico);assert.equal(seq.rotulo,'Fisioterapia · 8ª sessão');assert.equal(seq.resumoSessoes,undefined);
 seq=contar(atual,null);assert.doesNotMatch(seq.rotulo,/\d|sessão/);assert.match(seq.resumoSessoes,/indisponível/);assert.equal(seq.primeiroAtendimentoClinica,false,'falha não equivale a primeiro atendimento');
 // O pacote pode ter mais de um profissional/procedimento. Consumo segue o vínculo por ID.
 seq=contar(atual,[...historico,visita('outro-prof','concluido','plano-atual',{profissional_id:'prof2',procedimento_id:'outro',procedimentos:{nome:'Outro serviço'}})]);assert.match(seq.rotulo,/10 sessões consumidas/);
 // Transporte real paginado, somente leitura, sem fallback limitado ao profissional.
 const requisicoes=[];let responder=req=>({data:req.range[0]===0?Array.from({length:500},(_,i)=>visita('paginada-'+i)): [visita('ultima')]});
 consulta.ctx._supabase.from=table=>{const req={table,filters:[],orders:[]};requisicoes.push(req);const q={select(s){req.select=s;return q;},eq(...a){req.filters.push(a);return q;},in(...a){req.filters.push(a);return q;},lte(...a){req.filters.push(a);return q;},neq(...a){req.filters.push(a);return q;},order(s){req.orders.push(s);return q;},range(...a){req.range=a;return q;},then(resolve,reject){return Promise.resolve(responder(req)).then(resolve,reject);}};return q;};
 const perfil=consulta.ctx.usuarioLogado,carregar=()=>contagem.carregarHistoricoAgenda([atual],'2026-11-04',perfil);
 let completo=await carregar();assert.equal(completo.length,501);assert.deepEqual(requisicoes.map(r=>r.range),[[0,499],[500,999]]);
 for(const req of requisicoes){assert.equal(req.table,'agendamentos');assert(req.filters.some(f=>f[0]==='clinica_id'&&f[1]==='clinica1'));assert(!req.filters.some(f=>f[0]==='profissional_id'));assert.match(req.select,/plano_id/);assert.deepEqual(req.orders,['data','hora_inicio','id']);assert.doesNotMatch(req.select,/pagamento|valor|desconto/);}
 responder=req=>req.range[0]===0?{data:Array.from({length:500},(_,i)=>visita('p-'+i))}:{error:{message:'Falha na segunda página'}};assert.equal(await carregar(),null,'não exibir totais parciais como completos');
 requisicoes.length=0;responder=req=>req.select.includes('procedimentos(')?{error:{message:'procedimentos relationship'}}:{data:[atual]};completo=await carregar();assert.equal(completo.length,1);assert.equal(requisicoes.length,2);assert.match(requisicoes[1].select,/plano_id/);
 responder=()=>{throw Error('offline');};assert.equal(await carregar(),null);
 responder=()=>({data:Array.from({length:500},(_,i)=>visita('repetida-'+i))});assert.equal(await carregar(),null,'página repetida interrompe sem contagem falsa');
 consulta.ctx.usuarioLogado={...perfil,clinica_id:'outra'};assert.equal(await carregar(),null);
 console.log('PASS Meu dia: pacote 7 presenças + 2 faltas = 9 consumidas; contratos/pacientes/clínicas separados; estado e rótulos reais; paginação completa, falha parcial e isolamento.');
 console.log('PASS Meu dia: avaliação/draft, vínculo, cuidados/origem, negativas, pós-op atual, atualização após salvar e isolamento.');
})().catch(e=>{console.error(e);process.exitCode=1;});
