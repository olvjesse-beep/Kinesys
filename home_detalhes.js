/* ============================================================================
   KineSys — HOME OPERACIONAL COM DRILL-DOWN v1.11.2
   Cards clicáveis:
   - Atendimentos realizados hoje
   - Pendências clínicas
   - Pacientes recentes
   ============================================================================ */

let homeDetalhesAtendimentosCache = [];
let homeDetalhesPendenciasCache = [];
let homeDetalhesRecentesCache = [];
let homeDetalhesEquipeCache = [];

function hojeLocalHomeDetalhes() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function normalizarHomeDetalhes(v='') {
    return String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
}
function escaparHomeDetalhes(v='') {
    return typeof escapeHTML === 'function' ? escapeHTML(v) : String(v||'').replace(/[&<>"']/g, s=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s]));
}
function ehAdminHomeDetalhes() {
    const tipo=String(usuarioLogado?.tipo||'').toUpperCase();
    return ['MASTER','MASTER_FEM','ADMINISTRADOR','ADMINISTRADORA'].includes(tipo);
}
function ehClinicoHomeDetalhes() {
    return ['FISIOTERAPEUTA','PROFISSIONAL'].includes(String(usuarioLogado?.tipo||'').toUpperCase());
}
function dataCadastroHomeDetalhes(p={}) {
    const bruto=p.timestampCadastro||p.timestamp_cadastro||p.dataCadastroISO||p.data_cadastro_iso||p.dataCadastro||p.data_cadastro||'';
    if(typeof bruto==='number'){const d=new Date(bruto);return isNaN(d)?null:d;}
    const s=String(bruto||'').trim();
    if(/^\d{4}-\d{2}-\d{2}/.test(s)){const d=new Date(`${s.slice(0,10)}T12:00:00`);return isNaN(d)?null:d;}
    if(/^\d{2}\/\d{2}\/\d{4}$/.test(s)){const [dd,mm,aa]=s.split('/').map(Number);return new Date(aa,mm-1,dd,12);}
    const d=new Date(s);return isNaN(d)?null:d;
}
function dataBRHomeDetalhes(v) {
    const d=v instanceof Date?v:dataCadastroHomeDetalhes({dataCadastro:v});
    return d&&!isNaN(d)?d.toLocaleDateString('pt-BR'):(String(v||'')||'—');
}
function mesclarHomeDetalhes(nuvem=[],locais=[]) {
    const m=new Map();
    [...(nuvem||[]),...(locais||[])].forEach(x=>{if(x?.id)m.set(String(x.id),{...(m.get(String(x.id))||{}),...x});});
    return [...m.values()];
}

async function equipeHomeDetalhes() {
    try {
        if(typeof agendaEquipeCache!=='undefined'&&Array.isArray(agendaEquipeCache)&&agendaEquipeCache.length){
            homeDetalhesEquipeCache=[...agendaEquipeCache];return homeDetalhesEquipeCache;
        }
    } catch(_) {}
    if(_supabase){
        try{const r=await _supabase.from('equipe').select('id,nome,tipo,email');if(!r.error)homeDetalhesEquipeCache=r.data||[];}catch(_){}
    }
    if(!homeDetalhesEquipeCache.length&&usuarioLogado?.id)homeDetalhesEquipeCache=[{id:usuarioLogado.id,nome:usuarioLogado.nome||'Profissional',tipo:usuarioLogado.tipo||''}];
    return homeDetalhesEquipeCache;
}

function agendamentosLocaisHojeHomeDetalhes(hoje) {
    const listas=[];
    try{if(typeof agendaAgendamentosSemanaCache!=='undefined'&&Array.isArray(agendaAgendamentosSemanaCache))listas.push(agendaAgendamentosSemanaCache);}catch(_){}
    try{if(typeof agendaAgendamentosDoDiaCache!=='undefined'&&Array.isArray(agendaAgendamentosDoDiaCache))listas.push(agendaAgendamentosDoDiaCache);}catch(_){}
    try{if(typeof lerAgendamentosPendentesSync==='function')listas.push((lerAgendamentosPendentesSync()||[]).map(x=>x?.payload).filter(Boolean));}catch(_){}
    const m=new Map();listas.flat().forEach(a=>{if(a?.id&&String(a.data||'')===hoje)m.set(String(a.id),{...(m.get(String(a.id))||{}),...a});});return [...m.values()];
}

async function carregarAtendimentosHojeDetalhes(forcar=false) {
    const listaEl=document.getElementById('home_det_atend_lista');
    if(listaEl)listaEl.innerHTML='<div class="ks-home-empty">Atualizando atendimentos realizados hoje…</div>';
    const hoje=hojeLocalHomeDetalhes();
    const locais=agendamentosLocaisHojeHomeDetalhes(hoje).filter(a=>['atendido','concluido'].includes(String(a.status||'').toLowerCase()));
    let nuvem=[];
    if(_supabase){
        try{
            let q=_supabase.from('agendamentos').select('id,paciente_id,profissional_id,data,hora_inicio,hora_fim,status,procedimento_id,plano_id').eq('data',hoje).in('status',['atendido','concluido']);
            if(!ehAdminHomeDetalhes()&&ehClinicoHomeDetalhes()&&usuarioLogado?.id)q=q.eq('profissional_id',String(usuarioLogado.id));
            const r=await q;if(r.error)throw r.error;nuvem=r.data||[];
        }catch(err){console.warn('Home detalhes — atendimentos:',err);}
    }
    let dados=mesclarHomeDetalhes(nuvem,locais).filter(a=>String(a.data||'')===hoje&&['atendido','concluido'].includes(String(a.status||'').toLowerCase()));
    if(!ehAdminHomeDetalhes()&&ehClinicoHomeDetalhes()&&usuarioLogado?.id)dados=dados.filter(a=>String(a.profissional_id||'')===String(usuarioLogado.id));
    const [pacientes,equipe]=await Promise.all([
        typeof obterPacientesSalvos==='function'?obterPacientesSalvos().catch(()=>[]):Promise.resolve([]),
        equipeHomeDetalhes()
    ]);
    const pmap=new Map((pacientes||[]).map(p=>[String(p.id||''),p]));
    const emap=new Map((equipe||[]).map(e=>[String(e.id||''),e]));
    homeDetalhesAtendimentosCache=dados.map(a=>({...a,__paciente:pmap.get(String(a.paciente_id||''))||null,__profissional:emap.get(String(a.profissional_id||''))||null})).sort((a,b)=>String(a.hora_inicio||'').localeCompare(String(b.hora_inicio||'')));
    const count=document.getElementById('ks_home_agenda_count');if(count)count.textContent=String(homeDetalhesAtendimentosCache.length);
    popularFiltroProfissionaisAtendimentosHome();
    renderizarAtendimentosHojeDetalhes();
}

function popularFiltroProfissionaisAtendimentosHome(){
    const wrap=document.getElementById('home_det_atend_prof_wrap'),sel=document.getElementById('home_det_atend_prof');if(!sel)return;
    const mostrar=!ehClinicoHomeDetalhes();if(wrap)wrap.hidden=!mostrar;if(!mostrar)return;
    const atual=sel.value;const unicos=new Map();homeDetalhesAtendimentosCache.forEach(a=>{const id=String(a.profissional_id||'');if(id)unicos.set(id,a.__profissional?.nome||'Profissional');});
    sel.innerHTML='<option value="">Todos os profissionais</option>'+[...unicos.entries()].sort((a,b)=>a[1].localeCompare(b[1],'pt-BR')).map(([id,n])=>`<option value="${escaparHomeDetalhes(id)}">${escaparHomeDetalhes(n)}</option>`).join('');
    if([...sel.options].some(o=>o.value===atual))sel.value=atual;
}

function renderizarAtendimentosHojeDetalhes(){
    const lista=document.getElementById('home_det_atend_lista');if(!lista)return;
    const busca=normalizarHomeDetalhes(document.getElementById('home_det_atend_busca')?.value||'');
    const prof=document.getElementById('home_det_atend_prof')?.value||'';
    const filtrados=(homeDetalhesAtendimentosCache||[]).filter(a=>!prof||String(a.profissional_id||'')===prof).filter(a=>!busca||normalizarHomeDetalhes(`${a.__paciente?.nome||''} ${a.__profissional?.nome||''}`).includes(busca));
    const profissionais=new Set(filtrados.map(a=>String(a.profissional_id||'')).filter(Boolean));
    const resumo=document.getElementById('home_det_atend_resumo');if(resumo)resumo.innerHTML=`<div><span>Realizados hoje</span><strong>${filtrados.length}</strong></div><div><span>Profissionais com atendimento</span><strong>${profissionais.size}</strong></div><div><span>Data</span><strong class="kds-u-fs-body">${new Date().toLocaleDateString('pt-BR')}</strong></div>`;
    const sub=document.getElementById('home_det_atend_subtitulo');if(sub)sub.textContent=ehClinicoHomeDetalhes()?`Exibindo somente os atendimentos de ${usuarioLogado?.nome||'profissional'} realizados hoje.`:'Exibindo todos os atendimentos efetivamente realizados hoje.';
    if(!filtrados.length){lista.innerHTML='<div class="ks-home-empty">Nenhum atendimento realizado hoje corresponde a este filtro.</div>';return;}
    const agrupar=!ehClinicoHomeDetalhes();
    if(!agrupar){lista.innerHTML=filtrados.map(cardAtendimentoHomeDetalhes).join('');return;}
    const grupos=new Map();filtrados.forEach(a=>{const nome=a.__profissional?.nome||'Profissional não identificado';if(!grupos.has(nome))grupos.set(nome,[]);grupos.get(nome).push(a);});
    lista.innerHTML=[...grupos.entries()].sort((a,b)=>a[0].localeCompare(b[0],'pt-BR')).map(([nome,itens])=>`<div class="ks-home-pro-group">${escaparHomeDetalhes(nome)} · ${itens.length}</div>${itens.map(cardAtendimentoHomeDetalhes).join('')}`).join('');
}
function cardAtendimentoHomeDetalhes(a){
    const paciente=a.__paciente?.nome||'Paciente';const prof=a.__profissional?.nome||'Profissional não identificado';
    return `<div class="ks-home-detail-row"><div class="ks-home-detail-time">${escaparHomeDetalhes(String(a.hora_inicio||'').slice(0,5)||'—')}</div><div class="ks-home-detail-main"><strong>${escaparHomeDetalhes(paciente)}</strong><small>${escaparHomeDetalhes(prof)} · ${escaparHomeDetalhes(String(a.status||'atendido')==='concluido'?'Concluído':'Atendido')}</small></div><div class="ks-home-detail-actions">${a.paciente_id?`<button type="button" class="btn-secondary" onclick="abrirPacienteHomeDetalhe('${escaparHomeDetalhes(a.paciente_id)}','tela_buscar')">Prontuário</button>`:''}<button type="button" class="btn-secondary" onclick="navegarPara('tela_agenda')">Agenda</button></div></div>`;
}

async function obterPendenciasClinicasHomeDetalhes(){
    const pacientes=typeof obterPacientesSalvos==='function'?await obterPacientesSalvos().catch(()=>[]):[];
    const agora=Date.now(),itens=[];
    for(const p of pacientes){
        const avs=typeof obterAvaliacoes==='function'?obterAvaliacoes(p):(p.avaliacoes||[]);
        const av=typeof obterAvaliacaoFinalizadaMaisRecente==='function'?obterAvaliacaoFinalizadaMaisRecente(p):(avs.filter(a=>a.status==='finalizada').slice(-1)[0]||null);
        const ras=avs.find(a=>a.status==='rascunho');
        if(ras)itens.push({id:p.id,n:p.nome,p:'Avaliação em rascunho',nivel:'alto',target:'tela_avaliacao'});
        if(!av)itens.push({id:p.id,n:p.nome,p:'Sem avaliação clínica finalizada',nivel:'alto',target:'tela_avaliacao'});
        if(av){
            const clin=av.mapeamento?.clinicaEstruturada||{};
            if(!(clin.psfs?.itens||[]).length)itens.push({id:p.id,n:p.nome,p:'PSFS não registrada',nivel:'baixo',target:'tela_avaliacao'});
            const objs=clin.objetivosPlano?.objetivos||[];
            if(objs.some(o=>!['atingido','nao_atingido'].includes(o.status||'')))itens.push({id:p.id,n:p.nome,p:'Objetivos terapêuticos em acompanhamento',nivel:'baixo',target:'tela_avaliacao'});
            const ro=clin.restricoesPosOperatorias;
            if(ro?.ativo&&!ro.retornoMedico)itens.push({id:p.id,n:p.nome,p:'Pós-operatório com restrição ativa e retorno médico não informado',nivel:'medio',target:'tela_avaliacao'});
        }
        const evs=(p.evolucoes||[]).slice().sort((a,b)=>String(a.data||a.dataHoraISO||'').localeCompare(String(b.data||b.dataHoraISO||'')));const ultima=evs.at(-1);
        if(ultima?.dadosEstruturados?.novoAlerta)itens.push({id:p.id,n:p.nome,p:'Última evolução registrou novo sinal de alerta',nivel:'alto',target:'tela_evolucao'});
        if(ultima){const dt=new Date(ultima.dataHoraISO||ultima.data);if(Number.isFinite(dt.getTime())&&(agora-dt.getTime())>14*864e5)itens.push({id:p.id,n:p.nome,p:'Sem evolução registrada há mais de 14 dias',nivel:'medio',target:'tela_evolucao'});}
    }
    return itens;
}

async function carregarPendenciasClinicasDetalhes(forcar=false){
    if(typeof telaPermitida==='function'&&!telaPermitida('tela_home_pendencias'))return;
    const lista=document.getElementById('home_det_pend_lista');if(lista)lista.innerHTML='<div class="ks-home-empty">Atualizando pendências clínicas…</div>';
    homeDetalhesPendenciasCache=await obterPendenciasClinicasHomeDetalhes();
    const count=document.getElementById('ks_home_pend_count');if(count)count.textContent=String(homeDetalhesPendenciasCache.length);
    renderizarPendenciasClinicasDetalhes();
}
function renderizarPendenciasClinicasDetalhes(){
    const lista=document.getElementById('home_det_pend_lista');if(!lista)return;
    const busca=normalizarHomeDetalhes(document.getElementById('home_det_pend_busca')?.value||''),nivel=document.getElementById('home_det_pend_nivel')?.value||'';
    const itens=(homeDetalhesPendenciasCache||[]).filter(i=>!nivel||i.nivel===nivel).filter(i=>!busca||normalizarHomeDetalhes(`${i.n} ${i.p}`).includes(busca));
    const resumo=document.getElementById('home_det_pend_resumo');if(resumo){const alto=homeDetalhesPendenciasCache.filter(i=>i.nivel==='alto').length,medio=homeDetalhesPendenciasCache.filter(i=>i.nivel==='medio').length,baixo=homeDetalhesPendenciasCache.filter(i=>i.nivel==='baixo').length;resumo.innerHTML=`<div><span>Total de pendências</span><strong>${homeDetalhesPendenciasCache.length}</strong></div><div><span>Prioridade alta</span><strong>${alto}</strong></div><div><span>Prioridade média</span><strong>${medio}</strong></div><div><span>Acompanhamento</span><strong>${baixo}</strong></div>`;}
    if(!itens.length){lista.innerHTML='<div class="ks-home-empty">Nenhuma pendência corresponde a este filtro.</div>';return;}
    lista.innerHTML=itens.map(i=>`<div class="ks-home-detail-row" role="button" tabindex="0" onclick="abrirPacienteHomeDetalhe('${escaparHomeDetalhes(i.id)}','${escaparHomeDetalhes(i.target)}')" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();this.click()}"><div class="ks-home-pending-level ${i.nivel}"></div><div class="ks-home-detail-main"><strong>${escaparHomeDetalhes(i.n)}</strong><small>${escaparHomeDetalhes(i.p)}</small></div><div class="ks-home-detail-actions"><button type="button" class="btn-secondary" onclick="event.stopPropagation();abrirPacienteHomeDetalhe('${escaparHomeDetalhes(i.id)}','${escaparHomeDetalhes(i.target)}')">Abrir →</button></div></div>`).join('');
}

async function carregarPacientesRecentesDetalhes(forcar=false){
    const lista=document.getElementById('home_det_recent_lista');if(lista)lista.innerHTML='<div class="ks-home-empty">Atualizando pacientes recentes…</div>';
    const pacientes=typeof obterPacientesSalvos==='function'?await obterPacientesSalvos().catch(()=>[]):[];
    homeDetalhesRecentesCache=[...(pacientes||[])].sort((a,b)=>(dataCadastroHomeDetalhes(b)?.getTime()||0)-(dataCadastroHomeDetalhes(a)?.getTime()||0));
    const count=document.getElementById('ks_home_recent_count');if(count)count.textContent=String(Math.min(3,homeDetalhesRecentesCache.length));
    renderizarPacientesRecentesDetalhes();
}
function renderizarPacientesRecentesDetalhes(){
    const lista=document.getElementById('home_det_recent_lista');if(!lista)return;
    const busca=normalizarHomeDetalhes(document.getElementById('home_det_recent_busca')?.value||'');
    const itens=(homeDetalhesRecentesCache||[]).filter(p=>!busca||normalizarHomeDetalhes(`${p.nome||''} ${p.telefone||''} ${p.cpf||''}`).includes(busca)).slice(0,20);
    const resumo=document.getElementById('home_det_recent_resumo');if(resumo){const hoje=Date.now(),ult7=homeDetalhesRecentesCache.filter(p=>{const d=dataCadastroHomeDetalhes(p);return d&&(hoje-d.getTime())<=7*864e5;}).length;resumo.innerHTML=`<div><span>Exibidos</span><strong>${itens.length}</strong></div><div><span>Cadastrados nos últimos 7 dias</span><strong>${ult7}</strong></div><div><span>Limite da lista</span><strong>20</strong></div>`;}
    if(!itens.length){lista.innerHTML='<div class="ks-home-empty">Nenhum paciente recente corresponde a esta busca.</div>';return;}
    lista.innerHTML=itens.map(p=>`<div class="ks-home-detail-row" role="button" tabindex="0" onclick="abrirPacienteHomeDetalhe('${escaparHomeDetalhes(p.id)}','tela_buscar')" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();this.click()}"><div class="ks-home-recent-avatar">${escaparHomeDetalhes((p.nome||'P').trim().charAt(0).toUpperCase())}</div><div class="ks-home-detail-main"><strong>${escaparHomeDetalhes(p.nome||'Paciente')}</strong><small>Cadastro: ${escaparHomeDetalhes(dataBRHomeDetalhes(dataCadastroHomeDetalhes(p)))}${p.profissao?` · ${escaparHomeDetalhes(p.profissao)}`:''}${p.telefone?` · ${escaparHomeDetalhes(p.telefone)}`:''}</small></div><div class="ks-home-detail-actions"><button type="button" class="btn-secondary" onclick="event.stopPropagation();abrirPacienteHomeDetalhe('${escaparHomeDetalhes(p.id)}','tela_buscar')">Abrir prontuário</button></div></div>`).join('');
}

async function abrirPacienteHomeDetalhe(pacienteId,target='tela_buscar'){
    if(!pacienteId)return;
    try{
        if(typeof definirPacienteContexto==='function')await definirPacienteContexto(String(pacienteId));
        if(typeof abrirPacienteNaTela==='function'){await abrirPacienteNaTela(target);return;}
        navegarPara(target,true);
    }catch(err){console.error('Home detalhes — abrir paciente:',err);alert('Não foi possível abrir este paciente.');}
}
window.abrirPacienteHomeDetalhe=abrirPacienteHomeDetalhe;

async function abrirDetalheHome(tipo){
    const mapa={atendimentos:'tela_home_atendimentos',pendencias:'tela_home_pendencias',recentes:'tela_home_recentes'};const tela=mapa[tipo];if(!tela)return;
    if(typeof telaPermitida==='function'&&!telaPermitida(tela)){alert('🔒 Seu perfil não tem acesso a este detalhamento.');return;}
    navegarPara(tela);
}
window.abrirDetalheHome=abrirDetalheHome;

function configurarCardsHomeDetalhes(){
    const cards=document.querySelectorAll('[data-ks-home-detail]');
    cards.forEach(card=>{
        if(card.dataset.homeDetailBound)return;card.dataset.homeDetailBound='1';const tipo=card.dataset.ksHomeDetail;const tela={atendimentos:'tela_home_atendimentos',pendencias:'tela_home_pendencias',recentes:'tela_home_recentes'}[tipo];
        const pode=!tela||typeof telaPermitida!=='function'||telaPermitida(tela);card.hidden=!pode;
        if(!pode)return;card.addEventListener('click',()=>abrirDetalheHome(tipo));card.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();abrirDetalheHome(tipo);}});
    });
    const cardPend=document.getElementById('card_pendencias_clinicas');if(cardPend&&typeof telaPermitida==='function')cardPend.hidden=!telaPermitida('tela_home_pendencias');
}

// Substitui apenas a renderização da caixa resumida da Home para que cada
// pendência mostrada ali também seja clicável e o contador reflita o total real.
window.renderizarPendenciasClinicas=async function(){
    const c=document.getElementById('lista_pendencias_clinicas');if(!c)return;
    if(typeof telaPermitida==='function'&&!telaPermitida('tela_home_pendencias')){c.innerHTML='';const card=document.getElementById('card_pendencias_clinicas');if(card)card.hidden=true;const count=document.getElementById('ks_home_pend_count');if(count)count.textContent='—';return;}
    const itens=await obterPendenciasClinicasHomeDetalhes();homeDetalhesPendenciasCache=itens;
    const count=document.getElementById('ks_home_pend_count');if(count)count.textContent=String(itens.length);
    c.innerHTML=itens.length?itens.slice(0,20).map(i=>`<button type="button" onclick="abrirPacienteHomeDetalhe('${escaparHomeDetalhes(i.id)}','${escaparHomeDetalhes(i.target)}')" class="ks-pending-row ks-pending-row--${i.nivel==='alto'?'high':i.nivel==='medio'?'medium':'low'}"><strong>${escaparHomeDetalhes(i.n)}</strong><span class="kds-u-fs-meta kds-u-text-muted"> — ${escaparHomeDetalhes(i.p)}</span></button>`).join(''):'<p class="kds-u-text-success-dark kds-u-fs-ui">✓ Nenhuma pendência automática relevante encontrada.</p>';
};

if(typeof navegarPara==='function'&&!navegarPara.__homeDetalhesWrapped){
    const base=navegarPara;
    const wrapped=function(idTela,...args){const r=base.call(this,idTela,...args);setTimeout(()=>{
        configurarCardsHomeDetalhes();
        if(idTela==='tela_home_atendimentos')carregarAtendimentosHojeDetalhes(false);
        if(idTela==='tela_home_pendencias')carregarPendenciasClinicasDetalhes(false);
        if(idTela==='tela_home_recentes')carregarPacientesRecentesDetalhes(false);
    },0);return r;};wrapped.__homeDetalhesWrapped=true;navegarPara=wrapped;
}

window.carregarAtendimentosHojeDetalhes=carregarAtendimentosHojeDetalhes;
window.renderizarAtendimentosHojeDetalhes=renderizarAtendimentosHojeDetalhes;
window.carregarPendenciasClinicasDetalhes=carregarPendenciasClinicasDetalhes;
window.renderizarPendenciasClinicasDetalhes=renderizarPendenciasClinicasDetalhes;
window.carregarPacientesRecentesDetalhes=carregarPacientesRecentesDetalhes;
window.renderizarPacientesRecentesDetalhes=renderizarPacientesRecentesDetalhes;

function inicializarHomeDetalhes(){
    configurarCardsHomeDetalhes();
    if(document.getElementById('tela_home')?.classList.contains('ativa')){
        carregarPendenciasClinicasDetalhes(false).catch(()=>{});
        carregarPacientesRecentesDetalhes(false).catch(()=>{});
    }
}
document.addEventListener('DOMContentLoaded',()=>setTimeout(inicializarHomeDetalhes,80));
setTimeout(()=>{if(document.readyState!=='loading')inicializarHomeDetalhes();},700);
