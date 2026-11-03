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
 // Responsável e paciente não podem se confundir, mesmo com modelo antigo salvo.
 vm.runInContext(section(agenda,'function montarLembreteResponsavelAgenda(','async function enviarLembreteAgendamentoAtual()'),c);
 c.instanteAgendaSaoPaulo=()=>({data:'2026-11-03'});
 const dependente={id:'fixture-dependente',data:'2026-11-04',hora_inicio:'15:00:00',pacientes:{nome:'Paciente sintético',telefone:'38999990000'}};
 const responsavel={usaResponsavel:true,nomeDestinatario:'Responsável sintético',telefone:'11999990000'};
 c.agendamentoDetalheAtualId=dependente.id;c.agendaAgendamentosSemanaCache=[dependente];
 c.obterContatoAgendaPaciente=()=>responsavel;
 c.obterMensagemPadraoConfigurada=async()=> 'Olá! Sobre o atendimento de alguém. Confirme sua sessão.';
 await c.enviarLembreteAgendamentoAtual();
 const aviso=new URL(urls.pop());assert.equal(aviso.searchParams.get('phone'),'5511999990000');
 assert.equal(aviso.searchParams.get('text'),'Olá, Responsável sintético! Aqui quem fala é a Larissa da Fisiofix, tudo bem?\n\nEstou entrando em contato para lembrar da sessão de Paciente sintético amanhã, dia 04/11/2026 às 15:00 no endereço Rua Rosalvo Carvalho, n° 324B - João Botelho.\n\nPosso confirmar a presença?');
 assert.equal(writes.at(-1).id,dependente.id);
 for(const [data,hoje,termo] of [['2026-11-03','2026-11-03','hoje, dia 03/11/2026'],['2026-11-06','2026-11-03','no dia 06/11/2026'],['2027-01-01','2026-12-31','amanhã, dia 01/01/2027']]){
  const msg=c.montarLembreteResponsavelAgenda({...dependente,data},responsavel,hoje);assert(msg.includes(termo));
  assert(!msg.includes('sua sessão')&&!msg.includes('Sobre o atendimento de'));
 }
 // Brasília define “amanhã”, inclusive após a virada do dia em UTC.
 vm.runInContext(section(agenda,'function instanteAgendaSaoPaulo(','function posicaoMarcadorAgenda('),c);
 assert.equal(c.instanteAgendaSaoPaulo(new Date('2026-11-04T00:30:00Z')).data,'2026-11-03');
 // Navegar para outro agendamento durante a consulta não abre mensagem nem marca outro lembrete.
 c.obterMensagemPadraoConfigurada=()=>new Promise(resolve=>release=resolve);
 const antes=urls.length,gravacoes=writes.length;
 const tardio=c.enviarLembreteAgendamentoAtual();c.agendamentoDetalheAtualId='outro-agendamento';release(text);await tardio;
 assert.equal(urls.length,antes);assert.equal(writes.length,gravacoes);
 c.agendamentoDetalheAtualId=a.id;c.agendaAgendamentosSemanaCache=[a];c.obterContatoAgendaPaciente=p=>({telefone:p.telefone});
 // Oferta da lista de espera continua sem agendar se não houver confirmação explícita.
 c.agendaListaEsperaCache=[{id:'fixture-fila',pacientes:patient}];c.listaEsperaCombinaComVaga=()=>true;c.confirmarKineSys=async()=>false;c.obterMensagemPadraoConfigurada=async()=>text;
 vm.runInContext(section(agenda,'async function abrirOfertaListaEspera(','async function ',),c);
 await c.abrirOfertaListaEspera('profissional','2026-10-23','17:00','18:00');expectURL(urls.pop());assert.equal(writes.length,gravacoes);
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
 for(const path of ['src/home/home_detalhes-1.18.5.js','src/core/crm_relationship_core-1.0.0.js']){
  const tag=html.split('\n').find(line=>line.includes('src="'+path+'?'));
  assert(tag,'consumidor WhatsApp deve carregar no bootstrap: '+path);
  const url=tag.match(/src="([^\"]+)"/)?.[1];assert(new URL(url,'https://kinesys.example').searchParams.get('v'),'consumidor deve ter revisão explícita');
 }
 assert(/agenda-1\.20\.0\.js\?v=[^'"\s]+/.test(loader),'Agenda deve ter revisão explícita no bundle lazy');
 console.log('WhatsApp: Agenda, fila, CRM e Home abrem /send diretamente; número, texto, confirmação e cache preservados. Nenhuma mensagem enviada.');
}
run().catch(e=>{console.error(e);process.exitCode=1;});
