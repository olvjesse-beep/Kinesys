'use strict';
// Apenas pacientes fictícios. Sem rede nem gravação de prontuários reais.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {fixture}=require('./evaluation_report_integration.test.cjs');
const core=fs.readFileSync('src/core/script-1.18.0.js','utf8');
const workspace=fs.readFileSync('src/clinical/evaluation_workspace-1.17.0.js','utf8');
const pre=fs.readFileSync('src/patient/patient_pre_registration_core-1.0.0.js','utf8');
const flush=()=>new Promise(resolve=>setImmediate(resolve));
function setup(){
 const t=fixture();t.c.pacienteAtualId='paciente-a';t.c.avaliacaoEdicaoId=null;
 t.c.usuarioLogado={id:'profissional-a',clinica_id:'clinica-a',nome:'Profissional fictício',registro:'TESTE'};
 let revision=1;
 t.c.window.obterContextoAvaliacaoKineSys=()=>({pacienteId:t.c.pacienteAtualId||'',avaliacaoId:t.c.avaliacaoEdicaoId||'',usuarioId:t.c.usuarioLogado.id,clinicaId:t.c.usuarioLogado.clinica_id,revisao:revision});
 t.c.window.contextoAvaliacaoContinuaKineSys=token=>token===JSON.stringify(t.c.window.obterContextoAvaliacaoKineSys());
 t.next=(id)=>{t.c.pacienteAtualId=id;revision++;};
 t.render();return t;
}
async function main(){
 let checks=0;const ok=nome=>{checks++;console.log('Isolamento: '+nome+' OK');};
 for(const kind of ['automatico','manual','revisado']){
  const t=setup(),r=t.c.window.coletarLaudoAvaliacaoKineSys();
  t.c.window.preencherLaudoAvaliacaoKineSys({...r,texto:'Conteúdo exclusivo de A.',textoAutomatico:kind==='automatico',revisado:kind==='revisado'});
  t.next('paciente-b');t.fields[0].value='Pessoa B';
  assert.equal(t.c.window.coletarLaudoAvaliacaoKineSys(),null);assert.equal(t.nodes['ks-laudo-texto'].value,'');assert.equal(t.nodes['ks-laudo-revisado'].checked,false);
  t.c.window.preencherLaudoAvaliacaoKineSys(r);assert.equal(t.nodes['ks-laudo-texto'].value,'');
  t.c.window.renderizarLaudoAvaliacaoKineSys();const b=t.c.window.coletarLaudoAvaliacaoKineSys();assert(b.texto.includes('Pessoa B'));assert.equal(b.contextoPaciente.pacienteId,'paciente-b');
  ok('A → B, laudo '+kind+' não é exibido nem coletado');
 }
 for(const change of ['avaliacao','usuario','clinica','nova-sessao','novo-sem-id']){
  const t=setup();
  if(change==='avaliacao')t.c.avaliacaoEdicaoId='avaliacao-outra';
  if(change==='usuario')t.c.usuarioLogado.id='profissional-b';
  if(change==='clinica')t.c.usuarioLogado.clinica_id='clinica-b';
  if(change==='nova-sessao')t.next('paciente-a');
  if(change==='novo-sem-id')t.next(null);
  assert.equal(t.c.window.coletarLaudoAvaliacaoKineSys(),null);assert.equal(t.nodes['ks-laudo-texto'].value,'');ok(change);
 }
 {
  const t=setup(),r=t.c.window.coletarLaudoAvaliacaoKineSys();
  t.c.window.preencherLaudoAvaliacaoKineSys({...r,texto:'Redação própria.',textoAutomatico:false,revisado:true});
  t.fields[2].value+=' Mais um detalhe da mesma pessoa.';t.c.window.renderizarLaudoAvaliacaoKineSys();assert(t.nodes['ks-laudo-texto'].value.startsWith('Redação própria.'));ok('texto profissional preservado no mesmo atendimento');
 }
 {
  const t=setup(),r=t.c.window.coletarLaudoAvaliacaoKineSys();delete r.contextoPaciente;
  t.fields[0].value='Pessoa B';t.c.window.preencherLaudoAvaliacaoKineSys(r);assert.equal(t.nodes['ks-laudo-texto'].value,'');ok('legado com identificação divergente é rejeitado');
 }
 {
  const t=setup();let done,loaded=false;
  t.c.window.KineSysClinicalRegionLoader={status:()=>({bankRegions:loaded?['cervical','cefaleia']:[]}),ensure:()=>new Promise(r=>done=()=>{loaded=true;r();})};
  t.c.window.renderizarLaudoAvaliacaoKineSys();await flush();t.next('paciente-b');t.c.window.preencherLaudoAvaliacaoKineSys(null);
  done();await flush();assert.equal(t.nodes['ks-laudo-texto'].value,'');assert.equal(t.c.window.coletarLaudoAvaliacaoKineSys(),null);ok('resposta de catálogo atrasada não gera laudo para outro atendimento');
 }
 {
  // Executa a limpeza canônica real, incluindo laudo, HMA, JSON e plano em memória.
  const t=setup(),store=new Map(),select={value:'paciente-a'};t.nodes.select_paciente_precadastro=select;
  Object.assign(t.c,{clearTimeout,autosaveTimerKineSys:null,revisaoContextoAvaliacaoKineSys:0,clinicaEstruturadaPreservada:{laudo:{texto:'A'}},estadoMapeamento:{antigo:true},mapeamentoAvaliacaoAnterior:{antigo:true},localStorage:{setItem:(k,v)=>store.set(k,v),removeItem:k=>store.delete(k)},valorDatetimeLocalAgora:()=>'2026-10-21T10:00',ocultarStatusAutosaveKineSys(){},limparClinicaEstruturada(){t.c.clinicaEstruturadaPreservada={};t.c.window.preencherLaudoAvaliacaoKineSys(null);}});
  vm.runInContext(core.slice(core.indexOf('// Identidade independente'),core.indexOf('function limparSelecaoPerfilLogin')),t.c);
  const before=JSON.stringify(t.c.window.obterContextoAvaliacaoKineSys());t.c.window.iniciarContextoAvaliacaoKineSys('paciente-b');
  assert(!t.c.window.contextoAvaliacaoContinuaKineSys(before));assert.equal(t.fields[2].value,'');assert.equal(t.nodes['ks-laudo-texto'].value,'');assert.equal(Object.keys(t.c.clinicaEstruturadaPreservada).length,0);assert.equal(t.c.window.KineSysMotorClinico3.ultimoPlano,null);assert.equal(select.value,'paciente-b');
  t.c.window.iniciarContextoAvaliacaoKineSys();assert.equal(t.c.pacienteAtualId,null);assert(!store.has('kinesys_paciente_contexto'));ok('limpeza completa e invalidação síncrona');
 }
 {
  const t=setup();let resolver,gravacoes=0;
  Object.assign(t.c,{cargasPacienteAvaliacaoKineSys:0,validarRealizacaoClinicaInput:()=>'2026-10-21T10:00',alert(){},obterPacienteCompletoPorId:()=>new Promise(r=>resolver=r),salvarPacienteNaNuvem:()=>{gravacoes++;}});
  vm.runInContext(core.slice(core.indexOf('async function salvarAvaliacaoAtual('),core.indexOf('function chaveUsuarioRascunhoKineSys')),t.c);
  const salvar=t.c.salvarAvaliacaoAtual();t.next('paciente-b');resolver({id:'paciente-a'});await salvar;assert.equal(gravacoes,0);ok('troca de paciente durante salvamento aborta antes de gravar');
 }
 {
  const t=setup(),handlers={};let confirmar,copias=0;
  for(const id of ['ks-laudo-texto','ks-laudo-revisado','ks-laudo-atualizar','ks-laudo-copiar']){
   t.nodes[id]||={};t.nodes[id].addEventListener=(event,fn)=>handlers[id+':'+event]=fn;
  }
  t.c.document.readyState='complete';t.c.confirmarKineSys=()=>new Promise(r=>confirmar=r);t.c.agendarAutosaveKineSys=()=>{};
  t.c.navigator={clipboard:{writeText:async()=>{copias++;}}};
  vm.runInContext(workspace.slice(0,workspace.indexOf('/* Product Design')),t.c);
  t.c.window.renderizarLaudoAvaliacaoKineSys();
  const atualizar=handlers['ks-laudo-atualizar:click']();t.next('paciente-b');t.c.window.preencherLaudoAvaliacaoKineSys(null);confirmar(true);await atualizar;
  assert.equal(t.c.window.coletarLaudoAvaliacaoKineSys(),null);assert.equal(t.nodes['ks-laudo-texto'].value,'');
  await handlers['ks-laudo-copiar:click']();assert.equal(copias,0);ok('confirmação atrasada e botão Copiar respeitam a identidade');
 }
 {
  const t=setup();let decidir,aplicacoes=0;
  const draft={pacienteAtualId:'paciente-a',usuarioChave:'profissional-a',campos:{paciente_nome:'Pessoa A'}};
  Object.assign(t.c,{rascunhoDialogAbertoKineSys:false,rascunhoKineSysAvisadoNestaSessao:'',autosaveSuspensoKineSys:false,autosaveTimerKineSys:null,clearTimeout,
   localStorage:{getItem:()=>JSON.stringify(draft),removeItem(){throw Error('não pode descartar rascunho de outro contexto');}},rascunhoKineSysEhValido:()=>true,chaveUsuarioRascunhoKineSys:()=>'profissional-a',mostrarDialogoKineSys:()=>new Promise(r=>decidir=r),preencherClinicaEstruturada(){aplicacoes++;}});
  t.c.document.querySelector=()=>null;
  vm.runInContext(core.slice(core.indexOf('async function restaurarRascunhoKineSys()'),core.indexOf("document.addEventListener('DOMContentLoaded', function(){",core.indexOf('async function restaurarRascunhoKineSys()'))),t.c);
  const restoring=t.c.restaurarRascunhoKineSys();t.next('paciente-b');decidir(true);await restoring;
  assert.equal(aplicacoes,0);assert.equal(t.c.pacienteAtualId,'paciente-b');assert.equal(t.c.autosaveSuspensoKineSys,false);ok('recuperação atrasada não restaura A sobre B');
 }
 {
  const ds=fs.readFileSync('src/core/design_system-1.20.1.js','utf8');let terminar,active='tela_buscar',limpezas=0;const atualizacoes=[];
  const c={window:{navegarPara:()=>new Promise(r=>terminar=r)},document:{querySelector:()=>({id:active})},sincronizarIdentidadeContexto(){},limparSelecaoPaciente(){limpezas++;},atualizarPaginaAtiva:id=>atualizacoes.push(id),preservarResumoPacienteNaNavegacao:false};
  vm.createContext(c);vm.runInContext(ds.slice(ds.indexOf('function wrapNavegacao(){'),ds.indexOf('/* -------------------------- Contexto do paciente')),c);c.wrapNavegacao();
  const navigation=c.window.navegarPara('tela_avaliacao',true);assert.equal(atualizacoes.length,0);active='tela_avaliacao';terminar(true);await navigation;
  assert.deepEqual(atualizacoes,['tela_avaliacao']);assert.equal(limpezas,0);ok('montagem lazy não reaplica a tela antiga nem limpa o paciente novo');
 }
 {
  // A consulta A termina depois de B: não muda nome/idade/ocupação de B.
  const t=setup(),pending={},select={value:'paciente-a',selectedIndex:0,options:[{value:'paciente-a',dataset:{nome:'Pessoa A'}},{value:'paciente-b',dataset:{nome:'Pessoa B'}}]};
  t.nodes.select_paciente_precadastro=select;
  Object.assign(t.c,{cargasPacienteAvaliacaoKineSys:0,localStorage:{getItem:()=>''},Event:class{},idadeNumericaPaciente:()=>'',sincronizarBuscaPacientePreCadastro(){},processarRadarEmTempoReal(){},obterPacienteCompletoPorId:id=>new Promise(r=>pending[id]=r)});
  t.c.window.iniciarContextoAvaliacaoKineSys=id=>t.next(id);
  vm.runInContext(pre.slice(pre.indexOf('async function carregarPacientePreCadastradoNaAvaliacao()'),pre.indexOf('window.alternarFiltroPreCadastro')),t.c);
  const a=t.c.carregarPacientePreCadastradoNaAvaliacao();select.value='paciente-b';select.selectedIndex=1;const b=t.c.carregarPacientePreCadastradoNaAvaliacao();
  pending['paciente-b']({nome:'Pessoa B'});await b;pending['paciente-a']({nome:'Pessoa A'});await a;
  assert.equal(t.nodes.paciente_nome.value,'Pessoa B');assert.equal(t.c.pacienteAtualId,'paciente-b');assert.equal(t.c.cargasPacienteAvaliacaoKineSys,0);ok('consultas de pacientes fora de ordem');
 }
 assert(core.includes('contextoAvaliacaoContinuaKineSys(contextoSalvar)'));assert(core.includes('contextoAvaliacaoContinuaKineSys(contextoRestaurar)'));assert(workspace.includes('contextoConfirmacao!==JSON.stringify(contextoAtual())'));
 console.log(`${checks} cenários de isolamento completos OK.`);
}
main().catch(e=>{console.error(e);process.exitCode=1;});
