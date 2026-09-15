'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const read=p=>fs.readFileSync(p,'utf8');
const source=read('src/home/home_fisioterapeuta_util-1.24.0.js');
class Element {
  constructor(tag='div'){this.tagName=tag.toUpperCase();this.children=[];this.dataset={};this.attrs={};this.listeners={};this.textContent='';this.className='';this.hidden=false;this.writes=0;
    this.classList={add:(...c)=>{this.className=[...new Set([...this.className.split(' '),...c])].join(' ');},remove:(...c)=>{this.className=this.className.split(' ').filter(x=>!c.includes(x)).join(' ');},contains:c=>this.className.split(' ').includes(c)};}
  appendChild(e){if(e.tagName==='#FRAGMENT'){for(const n of [...e.children])this.appendChild(n);return e;}e.remove();this.children.push(e);e.parentElement=this;return e;}
  append(...nodes){nodes.forEach(n=>this.appendChild(n));}
  prepend(e){this.appendChild(e);this.children.unshift(this.children.pop());}
  remove(){if(this.parentElement)this.parentElement.children=this.parentElement.children.filter(x=>x!==this);this.parentElement=null;}
  replaceChildren(...nodes){this.children.forEach(e=>e.parentElement=null);this.children=[];this.append(...nodes);this.writes++;}
  setAttribute(k,v){this.attrs[k]=v;}
  removeAttribute(k){delete this.attrs[k];}
  addEventListener(k,fn){(this.listeners[k]??=[]).push(fn);}
  click(){for(const f of this.listeners.click||[])f();}
  querySelector(s){const match=e=>s.startsWith('.')?e.classList.contains(s.slice(1)):s==='[data-ks-fisio-agenda]'?'ksFisioAgenda' in e.dataset:false;for(const e of this.children){if(match(e))return e;const n=e.querySelector(s);if(n)return n;}return null;}
}
function fixture(){
  const ids={};for(const id of ['tela_home','card_painel_fisioterapeuta','painel_fisio_resumo','painel_fisio_lista','painel_fisio_titulo'])ids[id]=new Element();
  const card=ids.card_painel_fisioterapeuta,header=new Element();header.className='card-header';const button=new Element('button');header.appendChild(button);card.append(header,ids.painel_fisio_lista);
  const events={},windowEvents={};let active='tela_login',queries=0,rpcs=0,gate=null,fail=false;
  const doc={readyState:'loading',visibilityState:'visible',getElementById:id=>ids[id]||null,createElement:t=>new Element(t),createDocumentFragment:()=>new Element('#fragment'),addEventListener:(n,f)=>(events[n]??=[]).push(f),removeEventListener:()=>{},dispatchEvent:e=>{for(const f of events[e.type]||[])f(e);},querySelector:s=>s==='.tela.ativa'?{id:active}:null};
  const ctx={Date:class extends Date{constructor(...a){super(...(a.length?a:['2026-09-15T11:00:00Z']));}},console,document:doc,CustomEvent:class{constructor(type,options={}){this.type=type;this.detail=options.detail;}},usuarioLogado:{id:'test',clinica_id:'clinic',tipo:'FISIOTERAPEUTA'},obterPacientesSalvos:async()=>[],addEventListener:(n,f)=>(windowEvents[n]??=[]).push(f),removeEventListener:()=>{},setTimeout:()=>{throw Error('unexpected lifecycle timeout');},setInterval:()=>{throw Error('unexpected polling');},_supabase:{rpc:async()=>{rpcs++;if(gate)await gate;if(fail)throw Error('offline');return {data:{perfil_id:'test',clinica_id:'clinic',profissionais:[{id:'test'}],horarios:Array.from({length:7},(_,dia_semana)=>({dia_semana,hora_inicio:'00:00',hora_fim:'23:59'}))}};},from:()=>{queries++;const q={select:()=>q,eq:()=>q,order:()=>q,then:(resolve,reject)=>Promise.resolve({data:[]}).then(resolve,reject)};return q;}}};ctx.window=ctx;vm.createContext(ctx);vm.runInContext(source,ctx);
  return {ctx,ids,button,events,windowEvents,setGate:p=>gate=p,setFail:v=>fail=v,counts:()=>({queries,rpcs,writes:ids.painel_fisio_lista.writes}),activate:id=>{active=id;ids.tela_home.className=id==='tela_home'?'ativa':'';doc.dispatchEvent({type:'kinesys:tela-ativada',detail:{id}});},settle:async()=>{for(let i=0;i<30;i++)await Promise.resolve();}};
}
(async()=>{
  const f=fixture();f.activate('tela_home');await f.settle();
  assert.deepEqual(f.counts(),{queries:1,rpcs:1,writes:1});
  assert.equal(f.ids.painel_fisio_lista.children.length,1,'zero appointments yields exactly one free interval');
  for(let i=0;i<20;i++){
    f.activate('tela_agenda');await f.settle();const before=f.counts(),row=f.ids.painel_fisio_lista.children[0];
    f.activate('tela_home');await f.settle();assert.deepEqual(f.counts(),before,'Agenda → Home must do zero queries and zero renders');assert.equal(f.ids.painel_fisio_lista.children[0],row,'same DOM snapshot retained');assert.equal(f.ids.painel_fisio_lista.children.length,1);
  }
  let before=f.counts();f.button.click();await f.settle();assert.equal(f.counts().queries,before.queries+1);assert.equal(f.counts().writes,before.writes+1);assert.equal(f.ids.painel_fisio_lista.children.length,1);
  vm.runInContext(read('src/core/operational_resume_refresh-1.0.0.js'),f.ctx);
  before=f.counts();for(const e of ['blur','focus','pageshow'])for(const fn of f.windowEvents[e]||[])fn({persisted:true});for(const fn of f.events.visibilitychange||[])fn();await f.settle();assert.deepEqual(f.counts(),before,'focus/blur/pageshow on Home do not refresh snapshot');
  const reloaded=fixture();reloaded.activate('tela_home');await reloaded.settle();assert.equal(reloaded.counts().writes,1,'reload loads once');
  const slow=fixture();let release;slow.setGate(new Promise(r=>release=r));slow.activate('tela_home');slow.activate('tela_agenda');slow.activate('tela_home');release();await slow.settle();assert.equal(slow.counts().writes,1,'stale initial response cannot overwrite Agenda snapshot');
  const failure=fixture();failure.setFail(true);failure.activate('tela_home');await failure.settle();const failed=failure.counts();failure.activate('tela_home');await failure.settle();assert.deepEqual(failure.counts(),failed,'Home navigation is not an implicit retry');failure.setFail(false);await failure.ctx.KineSysMeuDiaClinico.refresh();assert.equal(failure.counts().writes,1,'manual refresh recovers');
  const core=read('src/core/script-1.18.0.js'),resume=read('src/core/operational_resume_refresh-1.0.0.js'),polish=read('src/home/home_profissional_polish-1.0.0.js');
  for(const s of [core,resume,polish])assert.doesNotMatch(s,/carregarPainelFisioterapeuta|painel_fisio_lista|KineSysMeuDiaClinico/);
  assert.doesNotMatch(resume,/navegarPara|MutationObserver|setInterval/);assert.doesNotMatch(polish,/MutationObserver|setTimeout|dedupe|removerDuplicatas/);
  assert.match(source,/lista\.replaceChildren\(fragmento\)/);assert.doesNotMatch(source,/window\.carregarPainelFisioterapeuta/);
  const menu=read('src/ui/menu_dropdown-1.0.0.js');vm.runInContext(menu,f.ctx);assert.equal(typeof f.ctx.fecharMenu,'function');assert.doesNotThrow(()=>f.ctx.fecharMenu());
  const design=read('src/core/design_system-1.20.1.js');const handler=design.slice(design.indexOf('    function fecharConfiguracoesAgendaAoClicarFora'),design.indexOf("    document.addEventListener('click',fecharConfiguracoesAgendaAoClicarFora)"));vm.runInContext(handler,f.ctx);assert.doesNotThrow(()=>f.ctx.fecharConfiguracoesAgendaAoClicarFora({target:new Element()}),'removed Agenda controls do not throw null.contains');
  const html=read('index.html');for(const path of ['src/core/script-1.18.0.js','src/home/home_fisioterapeuta_util-1.24.0.js','src/core/operational_resume_refresh-1.0.0.js','src/ui/menu_dropdown-1.0.0.js','src/core/design_system-1.20.1.js','src/ui/screen_loader-1.25.0.js'])assert(html.split('\n').some(l=>l.includes(path)&&l.includes('meudia=20260915-owner-r1')),path+' must be cache-busted');
  assert.match(design,/\$\{icon\('bell'\)\}/);assert.doesNotMatch(design,/>🔔<span/);
  console.log('PASS: 20 Home → Agenda → Home cycles; manual refresh; focus/blur/pageshow; reload; delayed response; failure/retry; sole writer; menu and detached Agenda controls; asset versions; SVG notification.');
})().catch(e=>{console.error(e);process.exitCode=1;});
