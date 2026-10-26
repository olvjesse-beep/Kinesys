// Composição real de HTML/CSS/Design System com transporte sintético fechado.
// Exclusivo da prévia local; não integra o bootstrap ou a publicação.
const fs=require('node:fs'),path=require('node:path');
module.exports=function fixture(root){
 let html=fs.readFileSync(path.join(root,'index.html'),'utf8').replace(/<script\b[^>]*>[\s\S]*?<\/script>/g,'');
 const setup=`
var usuarioLogado={id:'qa-admin',clinica_id:'qa-clinica',tipo:'MASTER',nome:'Administrador de demonstração'};
var pacienteAtualId=null, KINESYS_APP_VERSION='prévia', CAMPOS_PUBLICOS_PERFIL='id,nome,tipo';
function rotuloPerfil(){return 'Administrador';} function usuarioEhMaster(){return true;} function telaPermitida(){return true;}
function escapeHTML(x){return String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function fecharMenu(){} function idadeNumericaPaciente(p){return p.idade;} function removerAcentos(x){return String(x).normalize('NFD').replace(/[\\u0300-\\u036f]/g,'').toLowerCase();}
function obterPacientesSalvos(){return Promise.resolve([]);} function obterAvaliacoes(){return [];} function obterAvaliacaoMaisRecente(){return null;}
function carregarHistoricoEvolucao(){} function renderizarLinhaTempoClinicaCompleta(){} function onTipoDocumentoChange(){document.getElementById('campos_comparecimento').style.display='block';document.getElementById('bloco_ia').style.display='none';}
function renderizarPainelAgenda(){} function atualizarIndicadorEscopoAgenda(){} function atualizarMarcadorAgoraAgenda(){}
function navegarPara(id){document.querySelectorAll('.tela').forEach(e=>e.classList.toggle('ativa',e.id===id));document.body.dataset.tela=id;document.dispatchEvent(new CustomEvent('kinesys:tela-ativada',{detail:{id}}));if(id==='tela_equipe')carregarListaEquipe();return true;}
function irParaSubtela(){} function mostrarFeedbackLogin(){} function alternarPainelNotificacoes(){}
function abrirConfiguracoesCoresAgenda(){navegarPara('tela_configuracoes');window.KineSysConfiguracoesAgendaOnline.abrirAba('aparencia');}
function selecionarVisaoAgenda(v){['clinica','profissional'].forEach(x=>document.getElementById('agenda_visao_'+x).setAttribute('aria-pressed',String(v===x)));}
function selecionarPeriodoAgenda(v){document.querySelectorAll('[data-agenda-periodo]').forEach(e=>e.setAttribute('aria-pressed',String(e.dataset.agendaPeriodo===v)));}
function mudarSemanaAgenda(v){document.getElementById('agenda_dia_titulo').textContent=v>0?'02–08 de novembro de 2026':'19–25 de outubro de 2026';}
function irParaHojeAgenda(){document.getElementById('agenda_dia_titulo').textContent='26 de outubro de 2026';} function irParaDataAgenda(v){document.getElementById('agenda_dia_titulo').textContent=v;}
const qaEquipe=[{id:'qa1',nome:'Profissional de demonstração',email:'exemplo@example.com',tipo:'FISIOTERAPEUTA',registro:'CREFITO de exemplo',ativo:true},{id:'qa2',nome:'Administrador de demonstração',email:'admin@example.com',tipo:'MASTER',ativo:true}];
const qaProcedimentos=[{id:'p1',nome:'Avaliação',duracao_minutos:60,valor:100,ativo:true},{id:'p2',nome:'Sessão de Fisioterapia - Individual',duracao_minutos:60,valor:89.90,ativo:true}];
var _supabase={from(table){let single=false;const q={select(){return q;},eq(){return q;},order(){return q;},maybeSingle(){single=true;return q;},then(ok){return Promise.resolve({data:single?null:table==='equipe'?qaEquipe:table==='procedimentos'?qaProcedimentos:[],error:null}).then(ok);}};return q;},rpc(){return Promise.resolve({data:'qa-clinica',error:null});}};
document.addEventListener('DOMContentLoaded',()=>setTimeout(()=>{
 document.getElementById('header_welcome').hidden=false;document.getElementById('lbl_usuario_logado').textContent=usuarioLogado.nome;
 document.body.removeAttribute('data-ks-startup');document.getElementById('ks_startup')?.remove();
 document.querySelectorAll('[data-tela-menu]').forEach(e=>{e.hidden=false;e.style.display='';});
 document.getElementById('agenda_painel').classList.add('ativa');document.getElementById('agenda_dia_titulo').textContent='26 out – 01 nov de 2026';
 document.getElementById('agenda_data_input').value='2026-10-26';document.getElementById('agenda_semana_grade').innerHTML='<div class="agenda-vazio">Prévia de layout — sem agendamentos reais</div>';
 navegarPara(new URLSearchParams(location.search).get('tela')||'tela_relatorio');
 document.querySelectorAll('[onclick*="salvar"],[onclick*="cadastrar"],[onclick*="excluir"],[onclick*="Pagamento"],[onclick*="gerarProntuario"]').forEach(b=>b.disabled=true);
 document.body.insertAdjacentHTML('beforeend','<aside style="position:fixed;bottom:0;left:0;right:0;background:#173f47;color:white;padding:6px 12px;text-align:center;z-index:100000;font:12px sans-serif">Prévia isolada · dados fictícios · sem gravações</aside>');
},50));
`;
 const scripts=['src/ui/modal_helpers-1.0.0.js','src/ui/input_helpers_core-1.0.0.js','src/admin/team_management_core-1.0.0.js','src/core/design_system-1.20.1.js','src/agenda/agenda_lifecycle-1.0.0.js','src/admin/configuracoes_agendamento_online-1.0.0.js','src/ui/ui_experience.js'];
 return html.replace('</body>',`<script>${setup}</script>${scripts.map(src=>'<script defer src="/'+src+'"></script>').join('')}</body>`);
};
