// Composição real de HTML/CSS/Design System com transporte sintético fechado.
// Exclusivo da prévia local; não integra o bootstrap ou a publicação.
const fs=require('node:fs'),path=require('node:path');
module.exports=function fixture(root){
 let html=fs.readFileSync(path.join(root,'index.html'),'utf8').replace(/<script\b[^>]*>[\s\S]*?<\/script>/g,'');
 html=html.replace(/(<section id="tela_avaliacao"[^>]*>)[\s\S]*?<\/section>/,'$1'+fs.readFileSync(path.join(root,'screens/tela_avaliacao.html'),'utf8')+'</section>');
 html=html.replace('</head>', ['styles/design_clinical.css','styles/design_evaluation_workspace-1.18.0.css','styles/design_evaluation_context-1.18.3.css','styles/avaliacao_experiencia-1.22.0.css'].map(src=>'<link rel="stylesheet" href="/'+src+'">').join('')+'</head>');
 const exportFixture=require('../prontuario_clinico.test.cjs'),patient=exportFixture.fixture();
 const clin=patient.avaliacoes[0].mapeamento.clinicaEstruturada;clin.contextoAnamnese.estados.psicossocial='relata';const fonte=JSON.parse(clin.laudo.fonte);fonte.gruposAnamnese.fatoresPsicossociais=['Sono ruim'];clin.laudo.fonte=JSON.stringify(fonte);
 const report=exportFixture.setup().ctx.window.__test.montarDocumento(patient,[],'detalhado');
 const core=fs.readFileSync(path.join(root,'src/core/script-1.18.0.js'),'utf8').replace(/\r\n/g,'\n');
 const radarStart=core.indexOf('    const launcher =',core.indexOf('    ultimoRadarAlertas = alertasMatriz;'));
 const radarUI=core.slice(radarStart,core.indexOf('\n}\n\n/* função construirBlocoRedFlags',radarStart));
 const radarClose=core.slice(core.indexOf('function fecharRadarKineSys('),core.indexOf('function sincronizarCicloVidaRadar('));
 const agenda=fs.readFileSync(path.join(root,'src/agenda/agenda-1.20.0.js'),'utf8');
 const trechoAgenda=(a,b)=>agenda.slice(agenda.indexOf(a),agenda.indexOf(b,agenda.indexOf(a)+a.length));
 const agendaExcecoes=trechoAgenda('function calcularFaixasSobrepostasAgenda','\nasync function resolverListaEsperaAposAgendamento')+trechoAgenda('function abrirModalBloqueio()','\nasync function excluirBloqueio')+trechoAgenda('function renderizarGradeSemanal(','\nasync function renderizarPainelAgenda');
 const setup=`
var radarAlertasJaApresentados=new Set();
${radarClose}
function qaRadar(alertasMatriz){const containerFlutuante=document.getElementById('radar_flutuante_container');${radarUI}}
var usuarioLogado={id:'qa-admin',clinica_id:'qa-clinica',tipo:new URLSearchParams(location.search).has('notificacoes')?'FISIOTERAPEUTA':'MASTER',nome:'Administrador de demonstração'};
var agendaNotificacoesCache=new URLSearchParams(location.search).has('notificacoes')?Array.from({length:12},(_,i)=>({id:'qa-aviso-'+i,titulo:'Horário excepcional agendado',mensagem:'Paciente de demonstração '+(i+1)+' agendado para 29/10/2026, 13:00–14:00, em horário extraordinário. Confira os detalhes na Agenda.',lida:false})):[];
function carregarNotificacoesAgenda(){return Promise.resolve(agendaNotificacoesCache);}function abrirNotificacaoAgenda(id){alert('Aviso de demonstração: '+id);}
var pacienteAtualId=null, BANCO_MAPEAMENTO_CLINICO={}, KINESYS_APP_VERSION='prévia', CAMPOS_PUBLICOS_PERFIL='id,nome,tipo';
function rotuloPerfil(){return 'Administrador';} function usuarioEhMaster(){return true;} function telaPermitida(){return true;}
function escapeHTML(x){return String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function fecharMenu(){} function idadeNumericaPaciente(p){return p.idade;} function removerAcentos(x){return String(x).normalize('NFD').replace(/[\\u0300-\\u036f]/g,'').toLowerCase();}
function obterPacientesSalvos(){return Promise.resolve([]);} function obterAvaliacoes(p){return p?.avaliacoes||[];} function obterAvaliacaoMaisRecente(){return null;}
function carregarHistoricoEvolucao(){} function renderizarLinhaTempoClinicaCompleta(){} function onTipoDocumentoChange(){document.getElementById('campos_comparecimento').style.display='block';document.getElementById('bloco_ia').style.display='none';}
function renderizarPainelAgenda(){} function atualizarIndicadorEscopoAgenda(){} function atualizarMarcadorAgoraAgenda(){}
function obterContextoAvaliacaoKineSys(){return {pacienteId:'qa1',clinicaId:'qa-clinica',usuarioId:'qa-admin',avaliacaoId:'',revisao:1};} function agendarAutosaveKineSys(){}
function obterPacienteCompletoPorId(){return Promise.resolve({id:'qa1',nome:'Paciente de demonstração',avaliacoes:[{id:'qa-av1',status:'finalizada',realizadoEm:'2026-10-26T09:00',evaInicial:6}],evolucoes:[]});}
function navegarPara(id){document.querySelectorAll('.tela').forEach(e=>e.classList.toggle('ativa',e.id===id));document.body.dataset.tela=id;document.dispatchEvent(new CustomEvent('kinesys:tela-ativada',{detail:{id}}));if(id==='tela_equipe')carregarListaEquipe();return true;}
function irParaSubtela(){} function mostrarFeedbackLogin(){} function alternarPainelNotificacoes(){}
function abrirConfiguracoesCoresAgenda(){navegarPara('tela_configuracoes');window.KineSysConfiguracoesAgendaOnline.abrirAba('aparencia');}
function selecionarVisaoAgenda(v){['clinica','profissional'].forEach(x=>document.getElementById('agenda_visao_'+x).setAttribute('aria-pressed',String(v===x)));}
function selecionarPeriodoAgenda(v){document.querySelectorAll('[data-agenda-periodo]').forEach(e=>e.setAttribute('aria-pressed',String(e.dataset.agendaPeriodo===v)));}
function mudarSemanaAgenda(v){document.getElementById('agenda_dia_titulo').textContent=v>0?'02–08 de novembro de 2026':'19–25 de outubro de 2026';}
function irParaHojeAgenda(){document.getElementById('agenda_dia_titulo').textContent='26 de outubro de 2026';} function irParaDataAgenda(v){document.getElementById('agenda_dia_titulo').textContent=v;}
const qaEquipe=[{id:'qa1',nome:'Profissional de demonstração',email:'exemplo@example.com',tipo:'FISIOTERAPEUTA',registro:'CREFITO de exemplo',ativo:true},{id:'qa2',nome:'Administrador de demonstração',email:'admin@example.com',tipo:'MASTER',ativo:true}];
const qaProcedimentos=[{id:'p1',nome:'Avaliação',duracao_minutos:60,valor:100,ativo:true},{id:'p2',nome:'Sessão de Fisioterapia - Individual',duracao_minutos:60,valor:89.90,ativo:true}];
const qaHorarios=Array.from({length:5},(_,i)=>[{dia_semana:i+1,profissional_id:null,hora_inicio:'08:00',hora_fim:'12:00'},{dia_semana:i+1,profissional_id:null,hora_inicio:'14:00',hora_fim:'19:00'}]).flat();
var _supabase={from(table){let single=false;const q={select(){return q;},eq(){return q;},in(){return q;},gte(){return q;},lt(){return q;},order(){return q;},maybeSingle(){single=true;return q;},then(ok){return Promise.resolve({data:single?(table==='configuracoes_agendamento_online'?{seguir_agenda_interna:new URLSearchParams(location.search).has('seguirAgenda')}:null):table==='equipe'?qaEquipe:table==='procedimentos'?qaProcedimentos:table==='horarios_atendimento'?qaHorarios:[],error:null}).then(ok);}};return q;},rpc(){return Promise.resolve({data:'qa-clinica',error:null});}};
document.addEventListener('DOMContentLoaded',()=>setTimeout(()=>{
 if(new URLSearchParams(location.search).get('prontuario')==='1'){document.open();document.write(${JSON.stringify(report)});document.close();return;}
 document.getElementById('header_welcome').hidden=false;document.getElementById('lbl_usuario_logado').textContent=usuarioLogado.nome;
 document.body.removeAttribute('data-ks-startup');document.getElementById('ks_startup')?.remove();
 document.querySelectorAll('[data-tela-menu]').forEach(e=>{e.hidden=false;e.style.display='';});
 document.getElementById('agenda_painel').classList.add('ativa');document.getElementById('agenda_dia_titulo').textContent='26 out – 01 nov de 2026';
 document.getElementById('agenda_data_input').value='2026-10-26';document.getElementById('agenda_semana_grade').innerHTML='<div class="agenda-vazio">Prévia de layout — sem agendamentos reais</div>';
 navegarPara(new URLSearchParams(location.search).get('tela')||'tela_relatorio');
 if(new URLSearchParams(location.search).get('tela')==='tela_avaliacao'){
  const eva=new URLSearchParams(location.search).get('eva');if(eva!==null)preencherEvaAvaliacaoKineSys(Number(eva));
  document.getElementById('avaliacao_realizado_em').value='2026-10-26T09:00';atualizarEvaAvaliacaoKineSys();
  const qaAlertas=[{nivel:'medio',titulo:'Limitação informada',desc:'Conferir as orientações já registradas no prontuário.'},{nivel:'medio',titulo:'Informação a esclarecer',desc:'Detalhar o comportamento noturno dos sintomas.'}];
  KineSysContextoAnamnese.atualizarAlertas(qaAlertas);const dock=document.getElementById('radar_flutuante_container');document.getElementById('ks_radar_context_host').append(dock);dock.classList.add('radar-contexto-avaliacao');qaRadar(qaAlertas);
 }
 document.querySelectorAll('[onclick*="salvar"],[onclick*="cadastrar"],[onclick*="excluir"],[onclick*="Pagamento"],[onclick*="gerarProntuario"]').forEach(b=>b.disabled=true);
 document.body.insertAdjacentHTML('beforeend','<aside style="position:fixed;bottom:0;left:0;right:0;background:#173f47;color:white;padding:6px 12px;text-align:center;z-index:100000;font:12px sans-serif">Prévia isolada · dados fictícios · sem gravações</aside>');
 if(new URLSearchParams(location.search).get('agendaExcecoes')==='1')qaPrepararAgendaExcecoes();
},50));
${agendaExcecoes}
var agendaDataSelecionada=new Date('2026-10-26T12:00:00'),AGENDA_GRADE_PASSO_MIN=10,agendaAgendamentosSemanaCache=[];
function horaCurta(x){return String(x||'').slice(0,5);}function horaParaMinutos(x){const [h,m]=x.split(':').map(Number);return h*60+m;}
function minutosParaHora(x){return String(Math.floor(x/60)).padStart(2,'0')+':'+String(x%60).padStart(2,'0');}
function diasVisiveisDaSemana(){return Array.from({length:5},(_,i)=>({dataISO:'2026-10-'+(26+i),data:new Date('2026-10-'+(26+i)+'T12:00:00'),diaSemana:i+1}));}
function limitesHorariosGrade(){return {inicio:480,fim:1080};}function instanteAgendaSaoPaulo(){return {data:'2026-10-28'};}
function obterFeriadoAgenda(){return null;}function janelasAgendaPara(){return [{inicio:480,fim:1080}];}
function bloqueiosAgendaPara(){return [];}function minutoDentroDeJanela(){return true;}function bloqueioNoMinuto(){return null;}
function intervaloEntreJanelasAgenda(){return null;}function intervalosEntreJanelasAgenda(){return [];}
function classeStatusAgenda(x){return x;}function classeTipoVisualAgendamentoAgenda(){return 'tipo-fisioterapia';}
function iconePagamentoAgendaHTML(){return '';}function iconeHorarioExtraordinarioHTML(){return '';}
function aplicarCoresAgenda(){}function carregarCoresAgendaCompartilhadas(){return Promise.resolve();}function iniciarRelogioAgenda(){}
function abrirDetalheAgendamento(id){alert('Agendamento fictício: '+id);}function gerarIdAgendamentoKineSys(){return crypto.randomUUID();}
function formatarDataISO(d){return d.toISOString().slice(0,10);}function formatarDataAgendaBR(d){return d.split('-').reverse().join('/');}
function carregarBloqueios(){return Promise.resolve();}
function irParaSubtelaAgenda(id){document.querySelectorAll('#tela_agenda .subtela').forEach(e=>e.classList.toggle('ativa',e.id===id));}
function qaPrepararAgendaExcecoes(){
 agendaAgendamentosSemanaCache=[['a','09:00','10:00','Paciente de exemplo A'],['b','09:00','10:00','Paciente de exemplo B'],['c','10:00','11:00','Paciente de exemplo C']].map(([id,hora_inicio,hora_fim,nome])=>({id,hora_inicio,hora_fim,data:'2026-10-28',profissional_id:'qa1',pacientes:{nome},equipe:qaEquipe[0],procedimentos:qaProcedimentos[1],status:'agendado'}));
 renderizarPainelAgenda=async()=>renderizarGradeSemanal(null,null,'qa1');renderizarPainelAgenda();
 const select=document.getElementById('bloq_profissional_select');select.innerHTML='<option value="">Toda a clínica</option><option value="qa1">Profissional de demonstração</option>';
 document.getElementById('btn_salvar_bloqueio').disabled=false;
 _supabase.rpc=async(nome,args)=>nome==='kinesys_consultar_excecoes_agenda'?{data:{contexto:{profissional_id:args.p_profissional_id,data:args.p_data,inicio:args.p_inicio,fim:args.p_fim},conflitos:['a','b'],bloqueios:[],feriado:''},error:null}:{data:{ok:true,dias:(Date.parse(args.p_data_fim)-Date.parse(args.p_data_inicio))/86400000+1},error:null};
 const botao=document.querySelector('[onclick="novoAgendamento()"]')||document.querySelector('#agenda_painel .btn-primary');
 if(botao){botao.textContent='Conferir encaixe (prévia)';botao.onclick=()=>confirmarExcecoesAgenda('qa1','2026-10-28','09:00','10:00');}
 document.querySelectorAll('[onclick="abrirModalBloqueio()"]')[0]?.removeAttribute('disabled');
}
`;
 const scripts=['src/clinical/cirurgias-1.18.0.js','database/medicamentos_anvisa-20261024.js','database/medicamentos.js','database/ocupacoes_esportes.js','src/ui/modal_helpers-1.0.0.js','src/ui/input_helpers_core-1.0.0.js','src/home/home_fisioterapeuta_util-1.24.0.js','src/clinical/evaluation_context_panels-1.18.3.js','src/admin/team_management_core-1.0.0.js','src/core/design_system-1.20.1.js','src/agenda/agenda_lifecycle-1.0.0.js','src/admin/configuracoes_agendamento_online-1.0.0.js','src/ui/ui_experience.js'];
 scripts.push('src/home/home_profissional_dashboard-1.0.0.js');
 return html.replace('</body>',`<script>${setup}</script>${scripts.map(src=>'<script defer src="/'+src+'"></script>').join('')}</body>`);
};
