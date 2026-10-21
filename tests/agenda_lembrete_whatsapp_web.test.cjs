'use strict';
// Handler real com transporte isolado: não abre WhatsApp, não envia ou grava dados reais.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('src/agenda/agenda-1.20.0.js','utf8');
const start=source.indexOf('async function enviarLembreteAgendamentoAtual()');
const end=source.indexOf('\n/* --------------------------------------------------------------------',start);
assert(start>=0&&end>start);
const handler=source.slice(start,end);
async function scenario({phone='(00) 90000-0000',configured=true,day=false,missing=false,responsavel=false}={}){
 const appointment={id:'appointment-fixture',pacientes:{nome:'Paciente sintético'},profissionais:{nome:'Profissional sintético'},procedimentos:{nome:'Avaliação & reavaliação'},data:'2026-10-21',hora_inicio:'15:30:00'};
 const before=JSON.stringify(appointment),links=[],writes=[],alerts=[],events=[];
 const message='Olá! Avaliação & evolução?\nConfirme sua presença. Acentos: çã. + = # % 😀';
 const c={agendaAgendamentosSemanaCache:!day&&!missing?[appointment]:[],agendaAgendamentosDoDiaCache:day&&!missing?[appointment]:[],agendamentoDetalheAtualId:appointment.id,CONFIRMACAO_BASE_URL:'',usuarioLogado:{nome:'Equipe sintética'},
  obterContatoAgendaPaciente:()=>({telefone:phone,usaResponsavel:responsavel,nomeDestinatario:responsavel?'Responsável sintético':'Paciente sintético'}),montarSaudacaoAgenda:()=> 'Olá, Paciente sintético',horaCurta:t=>t.slice(0,5),alert:m=>alerts.push(m),
  document:{createElement:tag=>{assert.equal(tag,'a');const link={click(){links.push({href:this.href,target:this.target,rel:this.rel});}};return link;},body:{appendChild(){events.push('append');},removeChild(){events.push('remove');}}},
  _supabase:{from:table=>({update:payload=>({eq:async(key,id)=>{writes.push({table,payload,key,id});return {error:null};}})})},invalidarCacheAgendaSemana:()=>events.push('invalidate'),fecharModal:id=>events.push(id),renderizarPainelAgenda:async()=>events.push('render')};
 if(configured)c.obterMensagemPadraoConfigurada=async(type,context,refresh)=>{assert.equal(type,'agenda_lembrete_sessao');assert.equal(refresh,true);assert.equal(context.paciente,'Paciente sintético');assert.equal(context.hora,'15:30');return message;};
 vm.createContext(c);vm.runInContext(handler,c);await c.enviarLembreteAgendamentoAtual();assert.equal(JSON.stringify(appointment),before);
 return {links,writes,alerts,events,message};
}
(async()=>{
 for(const fixture of [{phone:'(00) 90000-0000',expected:'5500900000000'},{phone:'+55 (00) 90000-0000',expected:'5500900000000',day:true},{phone:'(00) 3000-0000',expected:'550030000000'},{phone:'+351 900 000 000',expected:'351900000000',responsavel:true}]){
  const result=await scenario(fixture);assert.equal(result.links.length,1);const link=result.links[0],url=new URL(link.href);
  assert.equal(url.origin,'https://web.whatsapp.com');assert.equal(url.pathname,'/send');assert.equal(url.searchParams.get('phone'),fixture.expected);assert.equal(url.searchParams.get('text'),result.message);
  assert.equal(link.target,'_blank');assert.equal(link.rel,'noopener noreferrer');assert(!url.searchParams.has('send'),'mensagem apenas preenchida, nunca enviada automaticamente');
  assert.equal(result.writes.length,1);assert.equal(result.writes[0].table,'agendamentos');assert.equal(result.writes[0].id,'appointment-fixture');assert(result.writes[0].payload.lembrete_enviado_em);assert(result.events.includes('render'));
 }
 const fallback=await scenario({configured:false});const text=new URL(fallback.links[0].href).searchParams.get('text');assert(text.includes('Avaliação & reavaliação'));assert(text.includes('21/10/2026'));assert(text.includes('15:30'));assert(text.includes('responda esta mensagem'));
 for(const fixture of [{phone:''},{phone:'',responsavel:true},{missing:true}]){const result=await scenario(fixture);assert.equal(result.links.length,0);assert.equal(result.writes.length,0);}
 const loader=fs.readFileSync('src/ui/screen_loader-1.25.0.js','utf8'),html=fs.readFileSync('index.html','utf8');assert(loader.includes('agenda-1.20.0.js?v=20261021-lembrete-whatsapp-web-r1'));assert(html.includes('screen_loader-1.25.0.js?v=20261021-lembrete-whatsapp-web-r1'));
 console.log('Lembrete Agenda: WhatsApp Web direto, telefone, responsável, mensagem/acentos, fallback e ausência de envio automático OK.');
})().catch(e=>{console.error(e);process.exitCode=1;});
