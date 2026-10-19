'use strict';
const fs=require('fs'); const assert=require('assert');
const core=fs.readFileSync('src/core/script-1.18.0.js','utf8');
const mod=fs.readFileSync('src/core/crm_relationship_core-1.0.0.js','utf8');
const html=fs.readFileSync('index.html','utf8');
assert(!core.includes('MÓDULO CRM E RELACIONAMENTO'),'CRM ainda embutido no monólito');
assert(mod.includes('MÓDULO CRM E RELACIONAMENTO'),'módulo perdeu marcador CRM');
for(const fn of ['popularSelectCRM','carregarPacienteCRM','enviarWhatsApp','obterProximoAgendamento']) assert(mod.includes(`function ${fn}(`)||mod.includes(`async function ${fn}(`),`módulo perdeu ${fn}`);
assert(mod.includes('let pacienteCRM = null;'),'módulo perdeu estado pacienteCRM');
assert(!core.includes('let pacienteCRM = null;'),'estado pacienteCRM permaneceu no core');
assert((core.match(/\bpopularSelectCRM\b/g)||[]).length>=2,'core perdeu consumidores de login e inicialização');
assert(fs.readFileSync('src/home/home_detalhes-1.18.5.js','utf8').includes('popularSelectCRM();'),'Home modularizada perdeu o terceiro consumidor histórico');
const tag=html.match(/<script defer src="src\/core\/crm_relationship_core-1\.0\.0\.js\?v=[^"]+"><\/script>/)?.[0];
const input='<script defer src="src/ui/input_helpers_core-1.0.0.js?v=20260911-phase4f-r1"></script>';
const main='<script defer src="src/core/script-1.18.0.js';
assert(tag&&html.includes(tag),'index não carrega CRM core');
assert(html.indexOf(input)<html.indexOf(tag),'CRM deve carregar após input helpers');
assert(html.indexOf(tag)<html.indexOf(main),'CRM deve carregar antes do core consumidor');
for(const api of ['carregarPacienteCRM','enviarWhatsApp']) assert(html.includes(api),`HTML perdeu consumidor ${api}`);
console.log('CRM relationship modularization contract Phase 4G: OK');

assert(html.includes('id="crm_paciente_busca" type="search"'),'WhatsApp deve permitir digitar o nome');
assert(/id="crm_paciente_select" hidden/.test(html),'select legado deve permanecer oculto');
const vm=require('vm');
async function testarBuscaCRM(){
  function elemento(){return {value:'',textContent:'',innerHTML:'',hidden:true,style:{},attrs:{},children:[],setAttribute(k,v){this.attrs[k]=v;},removeAttribute(k){delete this.attrs[k];},replaceChildren(){this.children=[];},appendChild(el){this.children.push(el);},contains(el){return this.children.includes(el);}};}
  const campos=Object.fromEntries(['crm_paciente_select','crm_paciente_busca','crm_paciente_sugestoes','crm_paciente_info','crm_nome','crm_telefone'].map(id=>[id,elemento()]));
  const pacientes=[{id:'d',nome:'Dilson José',telefone:'3333'},{id:'j',nome:'José Antônio',telefone:'1111'},{id:'b',nome:'Belizedi',telefone:'2222'}];
  let carregar=async()=>pacientes,links=0,template=async()=> 'Mensagem teste';
  const c={console,usuarioLogado:{id:'u',clinica_id:'clinica-a',nome:'Profissional'},document:{getElementById:id=>campos[id],addEventListener(){},createElement:()=>elemento(),body:{appendChild(){links++;},removeChild(){}}},obterPacientesBasicos:()=>carregar(),escapeHTML:String,obterContatoPreferencialPaciente:p=>({telefone:p.telefone}),pacienteEhDependente:()=>false,obterMensagemPadraoConfigurada:()=>template(),alert(){}};
  vm.createContext(c);vm.runInContext(mod,c);
  await c.popularSelectCRM();
  campos.crm_paciente_busca.value='jose';c.buscarPacienteCRM();
  assert(campos.crm_paciente_sugestoes.children[0].textContent.startsWith('José Antônio'),'começo do nome tem prioridade, ignorando acento');
  c.navegarBuscaPacienteCRM({key:'ArrowDown',preventDefault(){}});assert.equal(campos.crm_paciente_busca.attrs['aria-activedescendant'],'crm_paciente_opcao_0');
  await campos.crm_paciente_sugestoes.children[0].onclick();assert.equal(vm.runInContext('pacienteCRM.id',c),'j');assert.equal(campos.crm_paciente_select.value,'j');
  campos.crm_paciente_busca.value='bel';c.buscarPacienteCRM();assert.equal(vm.runInContext('pacienteCRM',c),null,'digitar outro nome invalida imediatamente o destinatário anterior');assert.equal(campos.crm_paciente_select.value,'');
  let liberar;carregar=()=>new Promise(r=>liberar=r);const antiga=c.selecionarPacienteBuscaCRM('j');
  campos.crm_paciente_busca.value='bel';c.buscarPacienteCRM();carregar=async()=>pacientes;await c.selecionarPacienteBuscaCRM('b');liberar(pacientes);await antiga;
  assert.equal(vm.runInContext('pacienteCRM.id',c),'b','resposta atrasada não pode substituir a escolha atual');
  let liberarMensagem;template=()=>new Promise(r=>liberarMensagem=r);const envio=c.enviarWhatsApp('checkin');
  campos.crm_paciente_busca.value='jose';c.buscarPacienteCRM();liberarMensagem('Mensagem teste');await envio;assert.equal(links,0,'troca durante preparação da mensagem não abre WhatsApp para paciente antigo');
  campos.crm_paciente_busca.value='inexistente';c.buscarPacienteCRM();assert.equal(campos.crm_paciente_sugestoes.children[0].textContent,'Nenhum paciente encontrado.');
  campos.crm_paciente_busca.value='';c.buscarPacienteCRM();assert(campos.crm_paciente_sugestoes.hidden);assert.equal(vm.runInContext('pacienteCRM',c),null);
  c.usuarioLogado.clinica_id='clinica-b';await c.selecionarPacienteBuscaCRM('b');assert.equal(vm.runInContext('pacienteCRM',c),null,'cache de outra clínica não seleciona destinatário');
  console.log('PASS: busca WhatsApp por nome, acentos/relevância, teclado, limpeza de seleção, respostas atrasadas e troca de clínica. Nenhuma mensagem enviada.');
}
testarBuscaCRM().catch(error=>{console.error(error);process.exitCode=1;});
