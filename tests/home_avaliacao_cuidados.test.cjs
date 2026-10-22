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
 vm.runInNewContext(source.replace('window.KineSysMeuDiaClinico=Object.freeze({','window.__test={cuidadosPaciente,contextoClinico,montarLinha,instanteHomeBrasilia};window.KineSysMeuDiaClinico=Object.freeze({'),ctx);
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
 console.log('PASS Meu dia: avaliação/draft, vínculo, cuidados/origem, negativas, pós-op atual, atualização após salvar e isolamento.');
})().catch(e=>{console.error(e);process.exitCode=1;});
