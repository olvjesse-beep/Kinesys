'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync('src/agenda/agenda-1.20.0.js','utf8');
const start=source.indexOf('async function abrirDetalheAgendamento(id)');
const end=source.indexOf('async function abrirProntuarioAgendamentoAtual()',start);
assert(start>=0&&end>start);
async function run(){
 for(const response of [null,true,false]){
  const a={id:'fixture',paciente_id:'patient-fixture',pacientes:{nome:'Paciente de teste'},equipe:{nome:'Profissional de teste'},procedimentos:{nome:'Osteopatia'},hora_inicio:'16:00:00',hora_fim:'17:00:00',status:'confirmado',confirmado_pelo_paciente:response,status_atualizado_em:'2026-10-20T12:00:00Z',status_atualizado_por:'Profissional de teste'};
  const before=JSON.stringify(a),body={innerHTML:''};let opened='';
  const c={agendaAgendamentosSemanaCache:[a],agendaAgendamentosDoDiaCache:[],document:{getElementById:()=>body},
   atualizarControlesAgendaPorPerfil(){},usuarioPodeVerAgendaClinicaToda:()=>true,
   obterPlanosAtivosPaciente:async()=>[],configStatusAgenda:()=>({consomeSessao:false}),
   statusAgendaPermiteObservacao:()=>false,situacaoPagamentoAgenda:()=>({pago:false,verificado:true}),
   escapeHTML:s=>String(s),telaPermitida:()=>true,obterContatoAgendaPaciente:()=>({telefone:''}),
   horaCurta:s=>s.slice(0,5),agendamentoEhHorarioExtraordinario:()=>false,
   classeStatusAgenda:()=> 'confirmado',rotuloStatusAgenda:()=> 'Confirmado',
   opcoesStatusAgenda:()=> '<option>Confirmado</option>',statusAgendaPermiteReagendamento:()=>false,
   usuarioEhAdministradorAgenda:()=>true,financeiroPodeEditar:()=>false,abrirModal:id=>{opened=id;}};
  vm.createContext(c);vm.runInContext(source.slice(start,end),c);await c.abrirDetalheAgendamento('fixture');
  assert.equal(opened,'modal_detalhe_agendamento');
  assert.doesNotMatch(body.innerHTML,/Confirmação:|Ainda sem resposta|Paciente confirmou presença|Paciente avisou/);
  for(const text of ['Paciente de teste','Osteopatia','16:00','17:00','Status atual:','Confirmado','Status atualizado:','Histórico de status','Editar agendamento','Salvar status','Pagamento:','pendente','Abrir prontuário']) assert(body.innerHTML.includes(text),text+' must remain');
  assert.equal(JSON.stringify(a),before,'Presentation-only change must not mutate appointment/confirmation');
 }
 console.log('Agenda detalhe: linha de confirmação ausente nos três estados; status, histórico, prontuário, pagamento e dados preservados OK');
}
run().catch(e=>{console.error(e);process.exitCode=1;});
