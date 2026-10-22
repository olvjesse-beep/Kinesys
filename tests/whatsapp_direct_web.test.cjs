'use strict';
// Exercita os caminhos reais sem abrir o WhatsApp, enviar mensagens ou gravar pacientes.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const agenda=fs.readFileSync('src/agenda/agenda-1.20.0.js','utf8');
const crm=fs.readFileSync('src/core/crm_relationship_core-1.0.0.js','utf8');
const home=fs.readFileSync('src/home/home_detalhes-1.18.5.js','utf8');
const text='Olá, pessoa de teste! Confirma amanhã às 17:00? & + # 😀';
const phone='5538999990000';
function expectURL(value){const u=new URL(value);assert.equal(u.origin,'https://web.whatsapp.com');assert.equal(u.pathname,'/send');assert.equal(u.searchParams.get('phone'),phone);assert.equal(u.searchParams.get('text'),text);}
function section(source,start,end){const a=source.indexOf(start),b=source.indexOf(end,a+start.length);assert(a>=0&&b>a,start);return source.slice(a,b);}
async function run(){
 for(const source of [agenda,crm,home])assert.doesNotMatch(source,/https:\/\/(?:wa\.me|api\.whatsapp\.com)/,'nenhum caminho deve voltar à página intermediária');
 let urls=[],writes=[],refresh=0;
 const anchor=()=>({href:'',click(){urls.push(this.href);}});
 const patient={nome:'Pessoa sintética',telefone:'(38) 99999-0000'};
 const a={id:'fixture-agenda',pacientes:patient,data:'2026-10-23',hora_inicio:'17:00:00',procedimentos:{nome:'Procedimento de teste'}};
 let release;
 const c={console,Date,encodeURIComponent,agendamentoDetalheAtualId:a.id,agendaAgendamentosSemanaCache:[a],agendaAgendamentosDoDiaCache:[],
  CONFIRMACAO_BASE_URL:'',usuarioLogado:{nome:'Profissional de teste'},obterContatoAgendaPaciente:p=>({telefone:p.telefone}),montarSaudacaoAgenda:()=> 'Olá',horaCurta:t=>t.slice(0,5),
  obterMensagemPadraoConfigurada:()=>new Promise(resolve=>release=resolve),alert:message=>assert.fail(message),document:{createElement:anchor,body:{appendChild(){},removeChild(){}}},
  _supabase:{from(table){assert.equal(table,'agendamentos');return {update(values){return {async eq(key,id){writes.push({values,key,id});return {error:null};}};}};}},
  invalidarCacheAgendaSemana(){},fecharModal(){},async renderizarPainelAgenda(){refresh++;}};
 vm.createContext(c);vm.runInContext(section(agenda,'async function enviarLembreteAgendamentoAtual()','/* --------------------------------------------------------------------'),c);
 const sending=c.enviarLembreteAgendamentoAtual();assert.equal(urls.length,0);release(text);await sending;
 expectURL(urls.pop());assert.equal(writes.length,1);assert.equal(writes[0].id,a.id);assert.equal(refresh,1);
 // Oferta da lista de espera continua sem agendar se não houver confirmação explícita.
 c.agendaListaEsperaCache=[{id:'fixture-fila',pacientes:patient}];c.listaEsperaCombinaComVaga=()=>true;c.confirmarKineSys=async()=>false;c.obterMensagemPadraoConfigurada=async()=>text;
 vm.runInContext(section(agenda,'async function abrirOfertaListaEspera(','async function ',),c);
 await c.abrirOfertaListaEspera('profissional','2026-10-23','17:00','18:00');expectURL(urls.pop());assert.equal(writes.length,1);
 // CRM profissional: texto e número pertencem à seleção atual e permanecem codificados uma vez.
 const cc={console,Date,encodeURIComponent,usuarioLogado:{id:'u',clinica_id:'c'},alert:message=>assert.fail(message),
  document:{addEventListener(){},createElement:()=>({...anchor(),style:{}}),body:{appendChild(){},removeChild(){}}},obterContatoPreferencialPaciente:p=>({telefone:p.telefone}),
  obterMensagemPadraoConfigurada:async()=>text};
 vm.createContext(cc);vm.runInContext(crm,cc);vm.runInContext(`pacienteCRM=${JSON.stringify({id:'fixture-paciente',...patient})};crmEscopoCache=escopoPacienteCRM();`,cc);
 await cc.enviarWhatsApp('checkin');expectURL(urls.pop());
 // Home administrador: executa o callback real de atualização, inclusive após editar a mensagem.
 const update=home.match(/const update=\(\)=>\{link\.href=.*?\};/)?.[0];assert(update);
 const link={};const h={link,phone,encodeURIComponent,$:()=>({value:text})};vm.createContext(h);vm.runInContext(update+'update();',h);expectURL(link.href);
 const html=fs.readFileSync('index.html','utf8'),loader=fs.readFileSync('src/ui/screen_loader-1.25.0.js','utf8');
 assert(html.includes('home_detalhes-1.18.5.js?v=20261022-whatsapp-direto-r1'));assert(html.includes('crm_relationship_core-1.0.0.js?v=20261022-whatsapp-direto-r1'));assert(loader.includes('agenda-1.20.0.js?v=20261022-whatsapp-direto-r1'));
 console.log('WhatsApp: Agenda, fila, CRM e Home abrem /send diretamente; número, texto, confirmação e cache preservados. Nenhuma mensagem enviada.');
}
run().catch(e=>{console.error(e);process.exitCode=1;});
