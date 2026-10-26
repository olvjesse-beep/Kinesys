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
let homeAtendimentosRevisao = 0;
let homeAtendimentosEmCurso = null;
let homeAtendimentosEscopo = '';
let homePendenciasRevisao = 0;
let homeCadastrosRevisao = 0;
let homeCadastrosSemHorario = 0;

function escopoHomeAtual(){
    const u=typeof usuarioLogado!=='undefined'?usuarioLogado:null;
    return u?[u.id,u.tipo,u.clinica_id].join('|'):'';
}
function profissionalHomeAtual(){
    return typeof profissionalAgendaRestritoAtualId==='function'
        ? String(profissionalAgendaRestritoAtualId()||usuarioLogado?.id||'') : String(usuarioLogado?.id||'');
}
function dataClinicaHome(ms){
    return new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(ms));
}
function referenciaAtendimentoHome(a){
    // Horário de marcação como atendido; legado explicitamente identificado na UI.
    if(a.atendido_em){const t=Date.parse(a.atendido_em);return Number.isFinite(t)?{t,legado:false}:null;}
    const t=instanteAgendaHome(a);
    return Number.isFinite(t)?{t,legado:true}:null;
}
function instanteAgendaHome(a){
    if(!/^\d{4}-\d{2}-\d{2}$/.test(a.data||'')||!/^\d{2}:\d{2}/.test(a.hora_inicio||''))return null;
    const t=Date.parse(`${a.data}T${String(a.hora_inicio).slice(0,5)}:00-03:00`);
    return Number.isFinite(t)?t:null;
}
function filtrarAtendimentos24hHome(dados,agora=Date.now(),profissional=''){
    return dados.filter(a=>['atendido','concluido'].includes(String(a.status||'').toLowerCase()))
        .filter(a=>!profissional||String(a.profissional_id)===profissional)
        .map(a=>({...a,__referencia:referenciaAtendimentoHome(a),__instanteAgenda:instanteAgendaHome(a)}))
        .filter(a=>a.__referencia&&Number.isFinite(a.__instanteAgenda)&&a.__instanteAgenda>=agora-86400000&&a.__instanteAgenda<=agora)
        .sort((a,b)=>b.__referencia.t-a.__referencia.t||String(a.id).localeCompare(String(b.id)));
}

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
    for(const bruto of [p.timestampCadastro,p.timestamp_cadastro,p.dataCadastroISO,p.data_cadastro_iso,p.created_at]){
        const s=String(bruto??'').trim();let d;
        if(typeof bruto==='number'||/^\d{13}$/.test(s))d=new Date(Number(bruto));
        else if(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(s))d=new Date(/Z$|[+-]\d{2}:?\d{2}$/.test(s)?s:s+'-03:00');
        if(d&&!isNaN(d))return d;
    }
    return null;
}
function filtrarCadastros24hHome(pacientes,agora=Date.now()){
    return pacientes.map(p=>({...p,__cadastro:dataCadastroHomeDetalhes(p)})).filter(p=>p.__cadastro&&p.__cadastro.getTime()>=agora-86400000&&p.__cadastro.getTime()<=agora).sort((a,b)=>b.__cadastro-a.__cadastro);
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

async function consultarAtendimentos24hHome(agora,profissional,comHorario=true){
    const diaInicio=dataClinicaHome(agora-86400000),diaFim=dataClinicaHome(agora);
    const campos='id,paciente_id,profissional_id,data,hora_inicio,status'+(comHorario?',atendido_em':'');
    const todos=[];
    for(let offset=0;;offset+=500){
        let q=_supabase.from('agendamentos').select(campos).in('status',['atendido','concluido']).gte('data',diaInicio).lte('data',diaFim);
        if(profissional)q=q.eq('profissional_id',profissional);
        const r=await q.order('id').range(offset,offset+499);
        if(r.error){
            if(comHorario&&/atendido_em/i.test(r.error.message||'')&&['42703','PGRST204'].includes(r.error.code))return consultarAtendimentos24hHome(agora,profissional,false);
            throw r.error;
        }
        todos.push(...(r.data||[]));if((r.data||[]).length<500)return todos;
    }
}
async function carregarAtendimentosHojeDetalhes(forcar=false){
    const escopo=escopoHomeAtual();
    if(!escopo||typeof telaPermitida==='function'&&!telaPermitida('tela_home_atendimentos'))return;
    if(homeAtendimentosEmCurso&&homeAtendimentosEscopo===escopo&&!forcar)return homeAtendimentosEmCurso;
    homeAtendimentosEscopo=escopo;const revisao=++homeAtendimentosRevisao;
    prepararHomeCompacta();
    const trabalho=(async()=>{
        const valido=()=>revisao===homeAtendimentosRevisao&&escopo===escopoHomeAtual();
        try{
            const agora=Date.now(),prof=ehClinicoHomeDetalhes()&&!ehAdminHomeDetalhes()?profissionalHomeAtual():'';
            if(ehClinicoHomeDetalhes()&&!ehAdminHomeDetalhes()&&!prof)throw new Error('Perfil sem profissional vinculado');
            if(!_supabase)throw new Error('Sem conexão com a agenda');
            const nuvem=await consultarAtendimentos24hHome(agora,prof);
            const pacientes=typeof obterPacientesSalvos==='function'?await obterPacientesSalvos():[];
            let equipe=[];
            if(!ehClinicoHomeDetalhes()){const r=await _supabase.from('equipe').select('id,nome');if(!r.error)equipe=r.data||[];}
            if(!valido())return;
            const pmap=new Map(pacientes.map(p=>[String(p.id),p]));
            const emap=new Map(equipe.map(p=>[String(p.id),p]));
            homeDetalhesAtendimentosCache=filtrarAtendimentos24hHome(nuvem,Date.now(),prof).map(a=>({...a,__paciente:pmap.get(String(a.paciente_id))||null,__profissional:emap.get(String(a.profissional_id))||null}));
            const count=document.getElementById('ks_home_agenda_count');if(count)count.textContent=String(homeDetalhesAtendimentosCache.length);
            popularFiltroProfissionaisAtendimentosHome();renderizarResumoAtendimentosHome();renderizarAtendimentosHojeDetalhes();
        }catch(err){
            if(!valido())return;homeDetalhesAtendimentosCache=[];
            const mensagem='<div class="ks-home-empty" role="status">Não foi possível atualizar os atendimentos. Tente novamente.</div>';
            for(const id of ['lista_pacientes_recentes','home_det_atend_lista','ks-home-activity-full']){const el=document.getElementById(id);if(el)el.innerHTML=mensagem;}
            const count=document.getElementById('ks_home_agenda_count');if(count)count.textContent='—';
            const total=document.getElementById('home_activity_total');if(total)total.textContent='—';
            const expand=document.querySelector('[data-home-all-activity]');if(expand)expand.textContent='Clique para atualizar';
            const detalhe=document.getElementById('home_det_atend_resumo');if(detalhe)detalhe.replaceChildren();
            console.warn('Home: falha ao atualizar atendimentos.',err);
        }
    })();
    homeAtendimentosEmCurso=trabalho;
    try{await trabalho;}finally{if(revisao===homeAtendimentosRevisao)homeAtendimentosEmCurso=null;}
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
    const filtrados=(homeDetalhesAtendimentosCache||[]).filter(a=>!prof||String(a.profissional_id)===prof).filter(a=>!busca||normalizarHomeDetalhes(`${a.__paciente?.nome||''} ${a.__profissional?.nome||''}`).includes(busca));
    const profissionais=new Set(filtrados.map(a=>String(a.profissional_id||'')).filter(Boolean));
    const resumo=document.getElementById('home_det_atend_resumo');if(resumo)resumo.innerHTML=`<div><span>Últimas 24 horas</span><strong>${filtrados.length}</strong></div><div><span>Profissionais com atendimento</span><strong>${profissionais.size}</strong></div>`;
    const sub=document.getElementById('home_det_atend_subtitulo');if(sub)sub.textContent=ehClinicoHomeDetalhes()?'Seus atendimentos realizados nas últimas 24 horas.':'Atendimentos realizados nas últimas 24 horas.';
    if(!filtrados.length){lista.innerHTML='<div class="ks-home-empty">Nenhum atendimento realizado nas últimas 24 horas corresponde a este filtro.</div>';return;}
    lista.innerHTML=notaHorarioLegadoHome(filtrados)+filtrados.map(cardAtendimentoHomeDetalhes).join('');
}
function cardAtendimentoHomeDetalhes(a){
    const paciente=a.__paciente?.nome||'Paciente';
    const horario=new Intl.DateTimeFormat('pt-BR',{timeZone:'America/Sao_Paulo',day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}).format(new Date(a.__referencia.t));
    return `<div class="ks-home-activity-row"><div><strong>${escaparHomeDetalhes(paciente)}</strong><span>${escaparHomeDetalhes(horario)} · ${a.__referencia.legado?'Horário da agenda':'Marcado como realizado'}</span></div><button type="button" class="btn-secondary" data-home-paciente="${escaparHomeDetalhes(a.paciente_id||'')}">Prontuário</button></div>`;
}
function notaHorarioLegadoHome(itens){return itens.some(a=>a.__referencia.legado)?'<p class="ks-home-time-note">Registros sem horário de realização usam o horário da agenda como referência para as 24 horas.</p>':'';}
function renderizarResumoAtendimentosHome(){
    const el=document.getElementById('lista_pacientes_recentes');if(!el)return;
    const itens=homeDetalhesAtendimentosCache;
    el.innerHTML=itens.length?itens.slice(0,2).map(a=>`<div class="ks-home-preview-person"><strong title="${escaparHomeDetalhes(a.__paciente?.nome||'Paciente')}">${escaparHomeDetalhes(a.__paciente?.nome||'Paciente')}</strong><span>${escaparHomeDetalhes(new Intl.DateTimeFormat('pt-BR',{timeZone:'America/Sao_Paulo',hour:'2-digit',minute:'2-digit'}).format(new Date(a.__referencia.t)))}${a.__referencia.legado?' · agenda':''}</span></div>`).join(''):'<div class="ks-home-empty">Nenhum atendimento nas últimas 24 horas.</div>';
    const full=document.getElementById('ks-home-activity-full');if(full)full.innerHTML=itens.length?notaHorarioLegadoHome(itens)+itens.map(cardAtendimentoHomeDetalhes).join(''):'<p>Nenhum atendimento realizado nas últimas 24 horas.</p>';
    const expand=document.querySelector('[data-home-all-activity]');if(expand)expand.textContent=itens.length>2?`Expandir · ver todos (${itens.length})`:'Clique para expandir';
    const total=document.getElementById('home_activity_total');if(total)total.textContent=String(itens.length);
}
// O nome legado é chamado pela navegação principal; não representa mais cadastros.
window.renderizarPacientesRecentesHome=()=>carregarAtendimentosHojeDetalhes();

async function obterPendenciasClinicasHomeDetalhes(){
    const pacientes=typeof obterPacientesSalvos==='function'?await obterPacientesSalvos():[];
    const agora=Date.now(),itens=[];
    for(const p of pacientes){
        const avs=typeof obterAvaliacoes==='function'?obterAvaliacoes(p):(p.avaliacoes||[]);
        const av=typeof obterAvaliacaoFinalizadaMaisRecente==='function'?obterAvaliacaoFinalizadaMaisRecente(p):(avs.filter(a=>a.status==='finalizada').slice(-1)[0]||null);
        const ras=avs.find(a=>a.status==='rascunho');
        if(ras)itens.push({id:p.id,n:p.nome,p:'Avaliação em rascunho',nivel:'alto',target:'tela_avaliacao'});
        if(!av)itens.push({id:p.id,n:p.nome,p:'Sem avaliação clínica finalizada',nivel:'alto',target:'tela_avaliacao'});
        if(av){
            const clin=av.mapeamento?.clinicaEstruturada||{};
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
    await window.renderizarPendenciasClinicas();
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
    if(!escopoHomeAtual()||typeof telaPermitida==='function'&&!telaPermitida('tela_home_recentes'))return;
    const revisao=++homeCadastrosRevisao,escopo=escopoHomeAtual();
    const lista=document.getElementById('home_det_recent_lista');if(lista)lista.innerHTML='<div class="ks-home-empty">Atualizando pacientes recentes…</div>';
    try{
        const pacientes=typeof obterPacientesSalvos==='function'?await obterPacientesSalvos():[];
        if(revisao!==homeCadastrosRevisao||escopo!==escopoHomeAtual())return;
        homeCadastrosSemHorario=pacientes.filter(p=>!dataCadastroHomeDetalhes(p)).length;
        homeDetalhesRecentesCache=filtrarCadastros24hHome(pacientes);
        const count=document.getElementById('ks_home_recent_count');if(count)count.textContent=String(homeDetalhesRecentesCache.length);
        renderizarPacientesRecentesDetalhes();
    }catch(_){
        if(revisao!==homeCadastrosRevisao||escopo!==escopoHomeAtual())return;
        homeDetalhesRecentesCache=[];
        const count=document.getElementById('ks_home_recent_count');if(count)count.textContent='—';
        if(lista)lista.innerHTML='<p role="status">Não foi possível atualizar os cadastros. Tente novamente.</p>';
        document.getElementById('home_det_recent_resumo')?.replaceChildren();
    }
}
function renderizarPacientesRecentesDetalhes(){
    const lista=document.getElementById('home_det_recent_lista');if(!lista)return;
    const busca=normalizarHomeDetalhes(document.getElementById('home_det_recent_busca')?.value||'');
    const itens=(homeDetalhesRecentesCache||[]).filter(p=>!busca||normalizarHomeDetalhes(`${p.nome||''} ${p.telefone||''} ${p.cpf||''}`).includes(busca));
    const resumo=document.getElementById('home_det_recent_resumo');if(resumo)resumo.innerHTML=`<div><span>Cadastros nas últimas 24 horas</span><strong>${homeDetalhesRecentesCache.length}</strong></div><div><span>Exibidos</span><strong>${itens.length}</strong></div>`;
    const aviso=homeCadastrosSemHorario?'<p class="ks-home-time-note">Cadastros antigos sem horário registrado não entram neste intervalo de 24 horas.</p>':'';
    if(!itens.length){lista.innerHTML=aviso+'<div class="ks-home-empty">Nenhum cadastro nas últimas 24 horas corresponde a esta busca.</div>';return;}
    lista.innerHTML=aviso+itens.map(p=>`<div class="ks-home-activity-row"><div><strong>${escaparHomeDetalhes(p.nome||'Paciente')}</strong><span>Cadastro: ${escaparHomeDetalhes(p.__cadastro.toLocaleString('pt-BR',{timeZone:'America/Sao_Paulo',dateStyle:'short',timeStyle:'short'}))}</span></div><button type="button" class="btn-secondary" data-home-paciente="${escaparHomeDetalhes(p.id)}">Abrir prontuário</button></div>`).join('');
}

async function abrirPacienteHomeDetalhe(pacienteId,target='tela_buscar'){
    if(!pacienteId)return;
    fecharPendenciasHome(false);
    fecharAtendimentosHome(false);
    try{
        if(target==='tela_buscar'){
            // A navegação limpa a seleção; a escolha explícita acontece depois dela.
            const escopo=escopoHomeAtual();
            navegarPara(target,true);
            await new Promise(resolve=>setTimeout(resolve,80));
            if(escopo!==escopoHomeAtual()||!document.getElementById(target)?.classList.contains('ativa'))return;
            if(typeof definirPacienteContexto==='function')await definirPacienteContexto(String(pacienteId));
            return;
        }
        if(typeof definirPacienteContexto==='function')await definirPacienteContexto(String(pacienteId));
        if(typeof abrirPacienteNaTela==='function'){await abrirPacienteNaTela(target);return;}
        navegarPara(target,true);
    }catch(err){console.error('Home detalhes — abrir paciente:',err);alert('Não foi possível abrir este paciente.');}
}
window.abrirPacienteHomeDetalhe=abrirPacienteHomeDetalhe;

async function abrirDetalheHome(tipo){
    const mapa={atendimentos:'tela_home_atendimentos',pendencias:'tela_home_pendencias',recentes:'tela_home_recentes'};const tela=mapa[tipo];if(!tela)return;
    if(typeof telaPermitida==='function'&&!telaPermitida(tela)){alert('Seu perfil não tem acesso a este detalhamento.', 'seguranca');return;}
    navegarPara(tela);
}
window.abrirDetalheHome=abrirDetalheHome;

function configurarCardsHomeDetalhes(){
    const cards=document.querySelectorAll('[data-ks-home-detail]');
    cards.forEach(card=>{
        const tipo=card.dataset.ksHomeDetail;const tela={atendimentos:'tela_home_atendimentos',pendencias:'tela_home_pendencias',recentes:'tela_home_recentes'}[tipo];
        const pode=!tela||typeof telaPermitida!=='function'||telaPermitida(tela);card.hidden=!pode;
        if(!pode||card.dataset.homeDetailBound)return;card.dataset.homeDetailBound='1';card.addEventListener('click',()=>abrirDetalheHome(tipo));card.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();abrirDetalheHome(tipo);}});
    });
    const cardPend=document.getElementById('card_pendencias_clinicas');if(cardPend&&typeof telaPermitida==='function'){cardPend.hidden=!telaPermitida('tela_home_pendencias');if(cardPend.hidden)fecharPendenciasHome(false);}
}

// Substitui apenas a renderização da caixa resumida da Home para que cada
// pendência mostrada ali também seja clicável e o contador reflita o total real.
window.renderizarPendenciasClinicas=async function(){
    prepararHomeCompacta();
    const c=document.getElementById('lista_pendencias_clinicas');if(!c)return;
    const revisao=++homePendenciasRevisao,escopo=escopoHomeAtual();
    if(typeof telaPermitida==='function'&&!telaPermitida('tela_home_pendencias')){c.innerHTML='';const card=document.getElementById('card_pendencias_clinicas');if(card)card.hidden=true;const count=document.getElementById('ks_home_pend_count');if(count)count.textContent='—';return;}
    try{
        const ordem={alto:0,medio:1,baixo:2};
        const itens=(await obterPendenciasClinicasHomeDetalhes()).sort((a,b)=>ordem[a.nivel]-ordem[b.nivel]);
        if(revisao!==homePendenciasRevisao||escopo!==escopoHomeAtual())return;
        homeDetalhesPendenciasCache=itens;
        const count=document.getElementById('home_pending_total');if(count)count.textContent=itens.length===1?'1 pendência':`${itens.length} pendências`;
        c.innerHTML=itens.length?itens.map(i=>`<button type="button" data-home-paciente="${escaparHomeDetalhes(i.id)}" data-home-target="${escaparHomeDetalhes(i.target)}" class="ks-home-pending-item"><span><strong>${escaparHomeDetalhes(i.n)}</strong><span>${escaparHomeDetalhes(i.p)}</span></span><span aria-hidden="true">→</span></button>`).join(''):'<p class="ks-home-empty">Nenhuma pendência automática encontrada.</p>';
    }catch(err){
        if(revisao!==homePendenciasRevisao||escopo!==escopoHomeAtual())return;
        homeDetalhesPendenciasCache=[];
        const count=document.getElementById('home_pending_total');if(count)count.textContent='Indisponível';
        c.innerHTML='<p role="status">Não foi possível atualizar as pendências. Tente novamente.</p>';
    }
};

function fecharPendenciasHome(foco=true){
    const dialog=document.getElementById('ks-home-pending-dialog');if(!dialog?.open)return;
    dialog.dataset.returnFocus=String(foco);dialog.close();document.body.classList.remove('ks-home-pending-open');
}
function fecharAtendimentosHome(foco=true){
    const dialog=document.getElementById('ks-home-activity-dialog');if(!dialog?.open)return;
    dialog.dataset.returnFocus=String(foco);dialog.close();document.body.classList.remove('ks-home-pending-open');
}
function abrirAtendimentosHome(){
    if(typeof telaPermitida==='function'&&!telaPermitida('tela_home_atendimentos'))return;
    const dialog=document.getElementById('ks-home-activity-dialog');if(!dialog||dialog.open)return;
    dialog.dataset.returnFocus='true';dialog.showModal();document.body.classList.add('ks-home-pending-open');
    document.querySelector('[data-home-all-activity]').setAttribute('aria-expanded','true');
    dialog.querySelector('.ks-home-pending-body').scrollTop=0;dialog.querySelector('button').focus({preventScroll:true});
    carregarAtendimentosHojeDetalhes(true);
}
function abrirPendenciasHome(){
    if(typeof telaPermitida==='function'&&!telaPermitida('tela_home_pendencias'))return;
    const dialog=document.getElementById('ks-home-pending-dialog');if(!dialog||dialog.open)return;
    dialog.dataset.returnFocus='true';dialog.showModal();document.body.classList.add('ks-home-pending-open');
    document.getElementById('card_pendencias_clinicas').setAttribute('aria-expanded','true');
    dialog.querySelector('.ks-home-pending-body').scrollTop=0;dialog.querySelector('button').focus({preventScroll:true});
    window.renderizarPendenciasClinicas();
}
function prepararHomeCompacta(){
    const home=document.getElementById('tela_home');if(!home)return;
    const rec=document.getElementById('lista_pacientes_recentes')?.closest('.card');
    if(rec&&!rec.dataset.homeCompact){
        rec.dataset.homeCompact='1';rec.classList.add('ks-home-activity');
        const h=rec.querySelector('.card-header');if(h)h.innerHTML='<div><h2>Atendimentos · últimas 24 horas</h2><p><span id="home_activity_total">—</span> realizados</p></div>';
        const expand=document.createElement('button');expand.type='button';expand.className='ks-home-expand';expand.setAttribute('data-home-all-activity','');expand.setAttribute('aria-haspopup','dialog');expand.setAttribute('aria-controls','ks-home-activity-dialog');expand.setAttribute('aria-expanded','false');expand.textContent='Clique para expandir';rec.appendChild(expand);
        const dialog=document.createElement('dialog');dialog.id='ks-home-activity-dialog';dialog.className='ks-home-modal';dialog.setAttribute('aria-labelledby','ks-home-activity-title');
        dialog.innerHTML='<div class="ks-home-pending-head"><h2 id="ks-home-activity-title">Atendimentos · últimas 24 horas</h2><button type="button" aria-label="Fechar atendimentos">×</button></div><div class="ks-home-pending-body"><p>Todos os atendimentos, do mais recente para o mais antigo.</p><div id="ks-home-activity-full"></div></div>';home.appendChild(dialog);
        dialog.querySelector('button').addEventListener('click',()=>fecharAtendimentosHome());
        dialog.addEventListener('cancel',e=>{e.preventDefault();fecharAtendimentosHome();});
        dialog.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();fecharAtendimentosHome();}});
        dialog.addEventListener('close',()=>{document.body.classList.remove('ks-home-pending-open');expand.setAttribute('aria-expanded','false');if(dialog.dataset.returnFocus!=='false'&&home.classList.contains('ativa'))expand.focus({preventScroll:true});});
    }
    const antigo=document.getElementById('card_pendencias_clinicas');
    if(antigo&&antigo.tagName!=='BUTTON'){
        const trigger=document.createElement('button');trigger.id=antigo.id;trigger.type='button';trigger.className='ks-home-pending-trigger';trigger.hidden=antigo.hidden;
        trigger.innerHTML='<strong>Pendências clínicas</strong><span>Clique para expandir</span><small id="home_pending_total" aria-live="polite">Carregando…</small>';
        trigger.setAttribute('aria-haspopup','dialog');trigger.setAttribute('aria-controls','ks-home-pending-dialog');trigger.setAttribute('aria-expanded','false');
        const dialog=document.createElement('dialog');dialog.id='ks-home-pending-dialog';dialog.className='ks-home-modal';dialog.setAttribute('aria-labelledby','ks-home-pending-title');
        const head=document.createElement('div');head.className='ks-home-pending-head';head.innerHTML='<h2 id="ks-home-pending-title">Pendências clínicas</h2><button type="button" aria-label="Fechar pendências clínicas">×</button>';
        const body=document.createElement('div');body.className='ks-home-pending-body';
        const explicacao=document.createElement('p');explicacao.textContent='Lembretes do prontuário para revisar. Não substituem a decisão clínica.';body.appendChild(explicacao);
        const lista=antigo.querySelector('#lista_pendencias_clinicas');if(lista)body.appendChild(lista);
        dialog.append(head,body);antigo.replaceWith(trigger);home.appendChild(dialog);
        trigger.addEventListener('click',abrirPendenciasHome);
        head.querySelector('button').addEventListener('click',()=>fecharPendenciasHome());
        dialog.addEventListener('cancel',e=>{e.preventDefault();fecharPendenciasHome();});
        dialog.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();fecharPendenciasHome();}});
        dialog.addEventListener('close',()=>{document.body.classList.remove('ks-home-pending-open');trigger.setAttribute('aria-expanded','false');if(dialog.dataset.returnFocus!=='false'&&home.classList.contains('ativa'))trigger.focus({preventScroll:true});});
    }
    if(rec&&typeof telaPermitida==='function'){rec.hidden=!telaPermitida('tela_home_atendimentos');if(rec.hidden)fecharAtendimentosHome(false);}
    const pend=document.getElementById('card_pendencias_clinicas');
    if(rec&&pend&&rec.parentElement===pend.parentElement){
        if(pend.nextElementSibling!==rec)rec.parentElement.insertBefore(pend,rec);
    }
    const recentes=document.querySelector('#tela_home_recentes .ks-home-detail-hero');
    if(recentes){recentes.querySelector('h2').textContent='Cadastros · últimas 24 horas';recentes.querySelector('p').textContent='Pacientes cadastrados nas últimas 24 horas, do mais recente para o mais antigo.';}
    const titulo=document.querySelector('#tela_home_atendimentos h2');if(titulo)titulo.textContent='Atendimentos · últimas 24 horas';
    if(!document.body.dataset.homeActivityBound){
        document.body.dataset.homeActivityBound='1';
        document.addEventListener('click',e=>{
            const b=e.target.closest('button');if(!b)return;
            if(b.hasAttribute('data-home-paciente'))abrirPacienteHomeDetalhe(b.dataset.homePaciente,b.dataset.homeTarget||'tela_buscar');
            else if(b.hasAttribute('data-home-all-activity'))abrirAtendimentosHome();
            else if(b.hasAttribute('data-home-all-pending'))abrirDetalheHome('pendencias');
            else if(b.hasAttribute('data-home-refresh')){carregarAtendimentosHojeDetalhes(true);window.renderizarPendenciasClinicas();carregarPacientesRecentesDetalhes(true);}
        });
    }
}

window.carregarAtendimentosHojeDetalhes=carregarAtendimentosHojeDetalhes;
window.renderizarAtendimentosHojeDetalhes=renderizarAtendimentosHojeDetalhes;
window.carregarPendenciasClinicasDetalhes=carregarPendenciasClinicasDetalhes;
window.renderizarPendenciasClinicasDetalhes=renderizarPendenciasClinicasDetalhes;
window.carregarPacientesRecentesDetalhes=carregarPacientesRecentesDetalhes;
window.renderizarPacientesRecentesDetalhes=renderizarPacientesRecentesDetalhes;

let homeDetalhesInicializada=false;
function inicializarHomeDetalhes(){
    if(homeDetalhesInicializada||!escopoHomeAtual())return;
    homeDetalhesInicializada=true;
    prepararHomeCompacta();configurarCardsHomeDetalhes();
    popularSelectCRM();renderizarPendenciasClinicas();
    carregarAtendimentosHojeDetalhes();
    carregarPacientesRecentesDetalhes(false).catch(()=>{});
}
document.addEventListener('kinesys:tela-ativada',event=>{
    const id=event.detail?.id;
    if(id==='tela_login'){homeDetalhesInicializada=false;return;}
    if(id==='tela_home')inicializarHomeDetalhes();
    if(id==='tela_home_atendimentos')carregarAtendimentosHojeDetalhes(false);
    if(id==='tela_home_pendencias')carregarPendenciasClinicasDetalhes(false);
    if(id==='tela_home_recentes')carregarPacientesRecentesDetalhes(false);
});
document.addEventListener('kinesys:tela-desativada',event=>{
    if(event.detail?.id==='tela_home'){fecharAtendimentosHome(false);fecharPendenciasHome(false);}
});

function iniciarHomeDetalhesVisivel(){
    if(document.getElementById('tela_home')?.classList.contains('ativa'))inicializarHomeDetalhes();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',iniciarHomeDetalhesVisivel,{once:true});
else iniciarHomeDetalhesVisivel();

/* Home administrativa: leitura confirmada, sem alterar a Home dos demais perfis.
 * O panorama usa os mesmos contratos financeiros, sem criar lançamentos ou planos. */
(function(){
    'use strict';
    const state={scope:'',month:'',data:null,summary:null,token:0,pending:null,loadedAt:0,hidden:false,tab:'aniversarios'};
    const $=id=>document.getElementById(id);
    const norm=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
    const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    function user(){return (typeof usuarioLogado!=='undefined'&&usuarioLogado)||null;}
    function allowed(){return ['MASTER','MASTER_FEM','ADMINISTRADOR','ADMINISTRADORA'].includes(String(user()?.tipo||'').toUpperCase());}
    function scope(){const u=user();return allowed()&&u?.clinica_id?`${u.clinica_id}|${u.id}|${u.tipo}`:'';}
    function today(){return new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());}
    function dayAdd(iso,n){return new Date(Date.parse(iso+'T12:00:00Z')+n*86400000).toISOString().slice(0,10);}
    function period(month,now=today()){
        if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(month))throw new Error('Mês inválido.');
        const [y,m]=month.split('-').map(Number),end=new Date(Date.UTC(y,m,0)).toISOString().slice(0,10);
        if(month>now.slice(0,7))throw new Error('Escolha o mês atual ou um mês anterior.');
        return {month,start:month+'-01',end,cut:end<now?end:now,now};
    }
    function cash(v){return Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL',minimumFractionDigits:0,maximumFractionDigits:2});}
    function metric(v){return state.hidden?'••••':cash(v);}
    function byId(items){return [...new Map((items||[]).map(x=>[String(x.id),x])).values()];}
    const minutes=v=>{const m=/^(\d{2}):(\d{2})/.exec(String(v||''));return m?Number(m[1])*60+Number(m[2]):NaN;};
    function union(items){
        const out=[];items.filter(x=>Number.isFinite(x[0])&&Number.isFinite(x[1])&&x[1]>x[0]).sort((a,b)=>a[0]-b[0]).forEach(x=>{
            const last=out[out.length-1];if(last&&x[0]<=last[1])last[1]=Math.max(last[1],x[1]);else out.push([...x]);
        });return out;
    }
    function subtract(windows,busy){
        return windows.flatMap(([a,b])=>{let cursor=a,out=[];union(busy).forEach(([c,d])=>{
            if(d<=cursor||c>=b)return;if(c>cursor)out.push([cursor,Math.min(c,b)]);cursor=Math.max(cursor,Math.min(d,b));
        });if(cursor<b)out.push([cursor,b]);return out;});
    }
    function capacity(data,p){
        let available=0,occupied=0,free=0;
        const professionals=(data.equipe||[]).filter(e=>e.ativo!==false&&(e.aparece_na_agenda||['FISIOTERAPEUTA','PROFISSIONAL'].includes(String(e.tipo).toUpperCase())));
        const slots=a=>[minutes(a.hora_inicio),minutes(a.hora_fim)];
        const dates=[];for(let date=p.start;date<=p.cut;date=dayAdd(date,1))dates.push(date);
        if(!dates.includes(p.now))dates.push(p.now);
        for(const date of dates){
            const weekday=new Date(date+'T12:00:00Z').getUTCDay();
            professionals.forEach(prof=>{
                const general=data.horarios.filter(h=>!h.profissional_id&&Number(h.dia_semana)===weekday).map(slots);
                const specific=data.horarios.filter(h=>String(h.profissional_id)===String(prof.id));
                let windows=union(general);
                if(specific.length){const own=specific.filter(h=>Number(h.dia_semana)===weekday).map(slots);windows=union(general.flatMap(a=>own.map(b=>[Math.max(a[0],b[0]),Math.min(a[1],b[1])])));}
                const blocks=data.bloqueios.filter(b=>b.data===date&&(!b.profissional_id||String(b.profissional_id)===String(prof.id))).map(b=>[b.hora_inicio?minutes(b.hora_inicio):0,b.hora_fim?minutes(b.hora_fim):1440]);
                const open=subtract(windows,blocks);
                const appointments=data.agendamentos.filter(a=>a.data===date&&String(a.profissional_id)===String(prof.id)&&!['cancelado','falta_justificada'].includes(a.status)).map(slots);
                const used=union(open.flatMap(a=>appointments.map(b=>[Math.max(a[0],b[0]),Math.min(a[1],b[1])])));
                if(date>=p.start&&date<=p.cut){available+=open.reduce((s,x)=>s+x[1]-x[0],0);occupied+=used.reduce((s,x)=>s+x[1]-x[0],0);}
                if(date===p.now){const t=new Date(),parts=Object.fromEntries(new Intl.DateTimeFormat('en-GB',{timeZone:'America/Sao_Paulo',hour:'2-digit',minute:'2-digit'}).formatToParts(t).map(x=>[x.type,x.value]));
                    const nowMinutes=Number(parts.hour)*60+Number(parts.minute);
                    free+=subtract(open,appointments).reduce((s,x)=>s+Math.max(0,Math.floor((x[1]-Math.max(x[0],nowMinutes))/60)),0);
                }
            });
        }
        return {occupancy:available?Math.round(100*occupied/available):null,free:professionals.length&&data.horarios.length?free:null};
    }
    function summarize(data,p){
        const inPeriod=v=>v>=p.start&&v<=p.cut;
        const payments=byId(data.pagamentos).filter(x=>String(x.data_pagamento||'').slice(0,10)<=p.cut);
        const expenses=byId(data.despesas).filter(x=>inPeriod(x.data_despesa));
        const agenda=byId(data.agendamentos);
        const count=Number(p.cut.slice(-2)),income=Array(count).fill(0),out=Array(count).fill(0);
        payments.filter(x=>inPeriod(String(x.data_pagamento||'').slice(0,10))).forEach(x=>income[Number(String(x.data_pagamento).slice(8,10))-1]+=Number(x.valor)||0);
        expenses.forEach(x=>out[Number(x.data_despesa.slice(8,10))-1]+=Math.max(0,Number(x.valor)||0));
        const paid=new Map(),credits=new Map();payments.forEach(x=>paid.set(String(x.plano_id),(paid.get(String(x.plano_id))||0)+(Number(x.valor)||0)));
        byId(data.creditos).filter(x=>String(x.data_uso).slice(0,10)<=p.cut).forEach(x=>credits.set(String(x.plano_id),(credits.get(String(x.plano_id))||0)+Math.max(0,Number(x.valor)||0)));
        const pending=byId(data.planos).filter(x=>x.status!=='cancelado').map(x=>({...x,saldo:Math.max(0,(Number(x.valor_final)||0)-(paid.get(String(x.id))||0)-(credits.get(String(x.id))||0))})).filter(x=>x.saldo>.009);
        const pendingIds=new Set(pending.map(x=>String(x.id)));
        const tomorrow=dayAdd(p.now,1),future=new Set(agenda.filter(a=>a.data>=p.now&&['pre_agendado','agendado','confirmado','em_recepcao'].includes(a.status)).map(a=>String(a.paciente_id)));
        const recent=new Set(agenda.filter(a=>a.data>=dayAdd(p.now,-60)&&a.data<=p.now&&['atendido','concluido'].includes(a.status)).map(a=>String(a.paciente_id)));
        const birth=value=>{const v=String(value||'');if(/^\d{4}-\d{2}-\d{2}/.test(v))return v.slice(5,10);const m=/^(\d{2})\/(\d{2})\/\d{4}$/.exec(v);return m?`${m[2]}-${m[1]}`:'';};
        const reminderIds=new Set(agenda.filter(a=>a.data===tomorrow&&['agendado','confirmado','em_recepcao'].includes(a.status)).map(a=>String(a.paciente_id)));
        const patients=byId(data.pacientes);
        const groups={aniversarios:patients.filter(x=>birth(x.nascimento)===p.now.slice(5)),lembretes:patients.filter(x=>reminderIds.has(String(x.id))),retornos:patients.filter(x=>recent.has(String(x.id))&&!future.has(String(x.id)))};
        return {p,income,out,received:income.reduce((s,v)=>s+v,0),expenses:out.reduce((s,v)=>s+v,0),receivable:pending.reduce((s,x)=>s+x.saldo,0),pendingCount:pending.length,
            uncovered:agenda.filter(a=>['atendido','concluido'].includes(a.status)&&inPeriod(a.data)&&pendingIds.has(String(a.plano_id))).length,
            attended:agenda.filter(a=>inPeriod(a.data)&&['atendido','concluido'].includes(a.status)).length,
            absences:agenda.filter(a=>inPeriod(a.data)&&['falta_justificada','falta_nao_justificada'].includes(a.status)).length,
            scheduled:agenda.filter(a=>a.data===p.now&&['pre_agendado','agendado','confirmado','em_recepcao','atendido','concluido'].includes(a.status)).length,
            todayExpenses:expenses.filter(x=>x.data_despesa===p.now).length,groups,...capacity(data,p)};
    }
    async function rows(table,fields,clinic,configure=q=>q){
        const client=typeof _supabase!=='undefined'?_supabase:null;if(!client)throw new Error('Conexão indisponível.');
        const result=[];
        for(let offset=0;offset<50000;offset+=1000){
            const response=await configure(client.from(table).select(fields).eq('clinica_id',clinic)).order('id').range(offset,offset+999);
            if(response.error)throw new Error(`Não foi possível confirmar ${table}.`);
            result.push(...(response.data||[]));if((response.data||[]).length<1000)return result;
        }
        throw new Error('Volume de dados acima do limite do panorama. Consulte o Financeiro.');
    }
    async function load(clinic,p){
        const end=dayAdd(p.cut,1)+'T00:00:00-03:00';
        const [pagamentos,planos,despesas,creditos,agendamentos,pacientes,horarios,bloqueios,equipe]=await Promise.all([
            rows('pagamentos','id,plano_id,paciente_id,valor,data_pagamento',clinic,q=>q.lte('data_pagamento',p.cut)),
            rows('planos_atendimento','id,paciente_id,valor_final,status,criado_em',clinic,q=>q.lt('criado_em',end)),
            rows('despesas_financeiras','id,valor,data_despesa',clinic,q=>q.gte('data_despesa',p.start).lte('data_despesa',p.cut)),
            rows('creditos_paciente_usos','id,plano_id,valor,data_uso',clinic,q=>q.lte('data_uso',p.cut)),
            rows('agendamentos','id,paciente_id,profissional_id,data,hora_inicio,hora_fim,status,plano_id',clinic,q=>q.gte('data',p.start<dayAdd(p.now,-60)?p.start:dayAdd(p.now,-60))),
            rows('pacientes','id,nome,nascimento,telefone,dependente,responsavel_nome,responsavel_telefone',clinic),
            rows('horarios_atendimento','id,profissional_id,dia_semana,hora_inicio,hora_fim',clinic),
            rows('bloqueios_agenda','id,profissional_id,data,hora_inicio,hora_fim',clinic,q=>q.gte('data',p.start).lte('data',p.now)),
            rows('equipe','id,tipo,ativo,aparece_na_agenda',clinic,q=>q.eq('ativo',true))
        ]);
        return {pagamentos,planos,despesas,creditos,agendamentos,pacientes,horarios,bloqueios,equipe};
    }
    function icon(selector){return document.querySelector(selector)?.outerHTML||'';}
    // Ícones Feather 4.29.2 (MIT), distribuídos como ativos SVG da biblioteca,
    // não desenhos próprios: https://github.com/feathericons/feather/tree/v4.29.2/icons
    /* The MIT License (MIT) — Copyright (c) 2013-2023 Cole Bemis
     * Permission is hereby granted, free of charge, to any person obtaining a copy
     * of this software and associated documentation files (the "Software"), to deal
     * in the Software without restriction, including without limitation the rights
     * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
     * copies of the Software, and to permit persons to whom the Software is
     * furnished to do so, subject to the following conditions:
     * The above copyright notice and this permission notice shall be included in all
     * copies or substantial portions of the Software.
     * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
     * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
     * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
     * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
     * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
     * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
     */
    const feather={
        eye:'<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle>',
        clock:'<circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline>',
        trend:'<line x1="7" y1="17" x2="17" y2="7"></line><polyline points="7 7 17 7 17 17"></polyline>',
        alert:'<circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line>',
        right:'<polyline points="9 18 15 12 9 6"></polyline>',
        left:'<polyline points="15 18 9 12 15 6"></polyline>',
        search:'<circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line>'
    };
    function libraryIcon(name,color='\x23173B45'){
        const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${feather[name]||feather.right}</svg>`;
        return `<img class="ks-admin-library-icon" alt="" aria-hidden="true" src="data:image/svg+xml,${encodeURIComponent(svg)}">`;
    }
    function decorate(){
        const root=$('ks_admin_home');if(!root)return;
        const privacy=root.querySelector('[data-admin-action="privacy"]');privacy.innerHTML=libraryIcon('eye');privacy.setAttribute('aria-label',state.hidden?'Mostrar valores':'Ocultar valores');privacy.title=privacy.getAttribute('aria-label');
        ['prev','next'].forEach((name,i)=>root.querySelector(`[data-admin-action="${name}"]`).innerHTML=libraryIcon(i?'right':'left'));
        root.querySelectorAll('.ks-admin-metrics>div').forEach((el,i)=>{if(!el.querySelector('.ks-admin-metric-icon')){const span=document.createElement('span');span.className='ks-admin-metric-icon';span.innerHTML=libraryIcon(i===1?'clock':'trend',i===2?'\x23A53B33':i===1?'\x232F7EAD':'\x231E756F');el.appendChild(span);}});
        root.querySelectorAll('.ks-admin-alert-icon').forEach(el=>{el.innerHTML=libraryIcon('alert','\x23F0CE4B');});
        root.querySelectorAll('.ks-admin-chevron').forEach(el=>{el.innerHTML=libraryIcon('right','\x23E5F6F2');});
        const label=$('ks_admin_patient_search')?.parentElement;if(label&&!label.querySelector('img'))label.insertAdjacentHTML('afterbegin',libraryIcon('search'));
        const calendar=icon('a[href="#tela_agenda"] .ks-icon'),periodLabel=root.querySelector('.ks-admin-period label');
        if(calendar&&!periodLabel.querySelector('.ks-icon'))periodLabel.insertAdjacentHTML('afterbegin',calendar);
        const messageIcon=root.querySelector('.ks-admin-message-icon');
        const whatsapp=document.querySelector('#ks_config_panel_integracoes img[alt*="WhatsApp"]');
        if(whatsapp&&!messageIcon.firstElementChild)messageIcon.appendChild(whatsapp.cloneNode());
        else if(!messageIcon.firstElementChild){const image=document.createElement('img');image.alt='';image.src='data:image/svg+xml;base64,PHN2ZyBmaWxsPSIjMUU3NTZGIiByb2xlPSJpbWciIHZpZXdCb3g9IjAgMCAyNCAyNCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48dGl0bGU+V2hhdHNBcHA8L3RpdGxlPjxwYXRoIGQ9Ik0xNy40NzIgMTQuMzgyYy0uMjk3LS4xNDktMS43NTgtLjg2Ny0yLjAzLS45NjctLjI3My0uMDk5LS40NzEtLjE0OC0uNjcuMTUtLjE5Ny4yOTctLjc2Ny45NjYtLjk0IDEuMTY0LS4xNzMuMTk5LS4zNDcuMjIzLS42NDQuMDc1LS4yOTctLjE1LTEuMjU1LS40NjMtMi4zOS0xLjQ3NS0uODgzLS43ODgtMS40OC0xLjc2MS0xLjY1My0yLjA1OS0uMTczLS4yOTctLjAxOC0uNDU4LjEzLS42MDYuMTM0LS4xMzMuMjk4LS4zNDcuNDQ2LS41Mi4xNDktLjE3NC4xOTgtLjI5OC4yOTgtLjQ5Ny4wOTktLjE5OC4wNS0uMzcxLS4wMjUtLjUyLS4wNzUtLjE0OS0uNjY5LTEuNjEyLS45MTYtMi4yMDctLjI0Mi0uNTc5LS40ODctLjUtLjY2OS0uNTEtLjE3My0uMDA4LS4zNzEtLjAxLS41Ny0uMDEtLjE5OCAwLS41Mi4wNzQtLjc5Mi4zNzItLjI3Mi4yOTctMS4wNCAxLjAxNi0xLjA0IDIuNDc5IDAgMS40NjIgMS4wNjUgMi44NzUgMS4yMTMgMy4wNzQuMTQ5LjE5OCAyLjA5NiAzLjIgNS4wNzcgNC40ODcuNzA5LjMwNiAxLjI2Mi40ODkgMS42OTQuNjI1LjcxMi4yMjcgMS4zNi4xOTUgMS44NzEuMTE4LjU3MS0uMDg1IDEuNzU4LS43MTkgMi4wMDYtMS40MTMuMjQ4LS42OTQuMjQ4LTEuMjg5LjE3My0xLjQxMy0uMDc0LS4xMjQtLjI3Mi0uMTk4LS41Ny0uMzQ3bS01LjQyMSA3LjQwM2gtLjAwNGE5Ljg3IDkuODcgMCAwMS01LjAzMS0xLjM3OGwtLjM2MS0uMjE0LTMuNzQxLjk4Mi45OTgtMy42NDgtLjIzNS0uMzc0YTkuODYgOS44NiAwIDAxLTEuNTEtNS4yNmMuMDAxLTUuNDUgNC40MzYtOS44ODQgOS44ODgtOS44ODQgMi42NCAwIDUuMTIyIDEuMDMgNi45ODggMi44OThhOS44MjUgOS44MjUgMCAwMTIuODkzIDYuOTk0Yy0uMDAzIDUuNDUtNC40MzcgOS44ODQtOS44ODUgOS44ODRtOC40MTMtMTguMjk3QTExLjgxNSAxMS44MTUgMCAwMDEyLjA1IDBDNS40OTUgMCAuMTYgNS4zMzUuMTU3IDExLjg5MmMwIDIuMDk2LjU0NyA0LjE0MiAxLjU4OCA1Ljk0NUwuMDU3IDI0bDYuMzA1LTEuNjU0YTExLjg4MiAxMS44ODIgMCAwMDUuNjgzIDEuNDQ4aC4wMDVjNi41NTQgMCAxMS44OS01LjMzNSAxMS44OTMtMTEuODkzYTExLjgyMSAxMS44MjEgMCAwMC0zLjQ4LTguNDEzWiIvPjwvc3ZnPg==';messageIcon.appendChild(image);}
    }
    function markup(){return `<header class="ks-admin-heading"><div><h1>Panorama da clínica</h1><p>Visão financeira e operacional da sua clínica</p></div><div class="ks-admin-head-actions"><button type="button" class="btn-secondary" data-admin-action="privacy" aria-pressed="false">Ocultar valores</button><span id="ks_admin_date"></span><button type="button" class="btn-primary" data-admin-action="finance">Abrir financeiro</button></div></header>
        <div class="ks-admin-panorama"><div class="ks-admin-main"><div class="ks-admin-period"><label for="ks_admin_month"><span class="kds-sr-only">Mês do panorama</span><input id="ks_admin_month" type="month"></label><button type="button" class="ks-admin-month-nav" data-admin-action="prev" aria-label="Mês anterior">Anterior</button><span id="ks_admin_month_label"></span><button type="button" class="ks-admin-month-nav" data-admin-action="next" aria-label="Próximo mês">Próximo</button></div>
        <div class="ks-admin-metrics"><div><span>Recebido</span><strong id="ks_admin_received">—</strong></div><div><span>A receber</span><strong id="ks_admin_receivable" title="Saldo confirmado dos contratos existentes até a data de corte; inclui contratos de meses anteriores.">—</strong></div><div><span>Despesas pagas</span><strong id="ks_admin_expenses" title="Despesas lançadas no período, conforme a data registrada no Financeiro.">—</strong></div></div>
        <section class="ks-admin-flow" aria-labelledby="ks_admin_flow_title"><h2 id="ks_admin_flow_title">Fluxo do mês</h2><div class="ks-admin-flow-description"><p id="ks_admin_flow_period">Recebimentos × Despesas (acumulado)</p><div class="ks-admin-legend"><span>Recebido (acumulado)</span><span>Despesas pagas (acumulado)</span></div></div><div class="ks-admin-chart"><canvas id="ks_admin_chart" role="img" aria-label="Fluxo acumulado de recebimentos e despesas"></canvas><p id="ks_admin_chart_message" hidden></p></div><details class="ks-admin-chart-details"><summary>Ver valores do gráfico</summary><div id="ks_admin_chart_table"></div></details></section></div>
        <aside class="ks-admin-glass" aria-label="Atendimentos e alertas"><div><span id="ks_admin_volume_period">Este mês até hoje</span><strong id="ks_admin_attended">—</strong><h2>atendimentos realizados</h2><p><span id="ks_admin_occupancy" title="Minutos ocupados sobre os minutos disponíveis na jornada, descontados os bloqueios. Não inclui encaixes fora da jornada.">—</span> ocupação · <span id="ks_admin_absences">—</span> faltas</p></div><section><h2>Hoje na clínica</h2><p class="ks-admin-today-number"><strong id="ks_admin_scheduled">—</strong> atendimentos previstos</p><p class="ks-admin-today-number"><strong id="ks_admin_free">—</strong> horários livres</p><small>Vagas de 60 min na jornada restante de hoje.</small><button type="button" class="btn-secondary" data-admin-action="agenda">Abrir agenda</button></section><section class="ks-admin-alerts"><h2>Alertas financeiros</h2><button type="button" data-admin-action="pending"><span class="ks-admin-alert-icon"></span><span><strong id="ks_admin_pending">Carregando pendências…</strong><span id="ks_admin_pending_value"></span></span><span class="ks-admin-chevron"></span></button><button type="button" data-admin-action="expenses"><span class="ks-admin-alert-icon"></span><span><strong id="ks_admin_expense_alert">Conferindo despesas…</strong><small>Consulte os lançamentos financeiros.</small></span><span class="ks-admin-chevron"></span></button><button type="button" class="ks-admin-review" data-admin-action="pending">Revisar pendências <span class="ks-admin-chevron"></span></button></section></aside></div>
        <div id="ks_admin_status" class="ks-admin-status" role="status" aria-live="polite"></div>
        <section class="ks-admin-messages" aria-labelledby="ks_admin_messages_title"><header><div><h2 id="ks_admin_messages_title"><span class="ks-admin-message-icon"></span>WhatsApp — mensagens aos pacientes</h2><p>Mantenha o relacionamento e a adesão ao tratamento</p></div><label><span class="kds-sr-only">Buscar paciente nas mensagens</span><input type="search" id="ks_admin_patient_search" placeholder="Buscar paciente"></label></header><div class="ks-admin-message-tabs" role="tablist" aria-label="Tipos de mensagem"><button type="button" role="tab" data-admin-group="aniversarios" aria-selected="true">Aniversários de hoje <span></span></button><button type="button" role="tab" data-admin-group="lembretes" aria-selected="false">Lembretes <span></span></button><button type="button" role="tab" data-admin-group="retornos" aria-selected="false">Retornos sem agendamento <span></span></button></div><div id="ks_admin_message_list" role="tabpanel" aria-label="Pacientes para mensagem"></div><footer>Revise a mensagem antes de abrir o WhatsApp.<span id="ks_admin_sync"></span></footer></section>
        <dialog id="ks_admin_message_dialog" class="ks-home-modal" aria-labelledby="ks_admin_message_title"><div class="ks-home-pending-head"><h2 id="ks_admin_message_title">Revisar mensagem</h2><button type="button" data-admin-action="close-message" aria-label="Fechar mensagem">Fechar</button></div><div class="ks-home-pending-body"><p id="ks_admin_message_recipient"></p><label for="ks_admin_message_text">Texto da mensagem</label><textarea id="ks_admin_message_text" rows="6"></textarea><p>A mensagem será aberta no WhatsApp. O envio continua sob sua confirmação.</p><a id="ks_admin_whatsapp_link" class="btn-primary" target="_blank" rel="noopener noreferrer">Abrir WhatsApp</a></div></dialog>`;}
    function mount(){
        const home=$('tela_home');if(!home||!scope())return null;
        let root=$('ks_admin_home');if(root)return root;
        root=document.createElement('section');root.id='ks_admin_home';root.className='ks-admin-home';root.innerHTML=markup();home.appendChild(root);
        const calendar=icon('a[href="#tela_agenda"] .ks-icon'),chevron=icon('.ks-patient-tabs + .ks-patient-actions .ks-icon');
        if(calendar)root.querySelector('.ks-admin-period label').insertAdjacentHTML('afterbegin',calendar);
        const warning=icon('#ks_dialog_symbol .ks-icon')||icon('a[href="#tela_financeiro"] .ks-icon');
        root.querySelectorAll('.ks-admin-alert-icon').forEach(el=>{el.innerHTML=warning;});
        const arrow=icon('.ks-collapse-toggle .ks-icon')||chevron;
        root.querySelectorAll('.ks-admin-chevron').forEach(el=>{el.innerHTML=arrow;});
        const whatsapp=document.querySelector('#ks_config_panel_integracoes img[alt*="WhatsApp"]');
        if(whatsapp)root.querySelector('.ks-admin-message-icon').appendChild(whatsapp.cloneNode());
        $('ks_admin_month').addEventListener('change',()=>{if($('ks_admin_month').value){state.month=$('ks_admin_month').value;refresh(true);}});
        $('ks_admin_patient_search').addEventListener('input',renderMessages);
        root.querySelector('.ks-admin-message-tabs').addEventListener('keydown',event=>{
            if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
            const buttons=[...root.querySelectorAll('[data-admin-group]')],i=buttons.indexOf(document.activeElement);if(i<0)return;
            event.preventDefault();const next=event.key==='Home'?0:event.key==='End'?buttons.length-1:(i+(event.key==='ArrowRight'?1:-1)+buttons.length)%buttons.length;
            state.tab=buttons[next].dataset.adminGroup;renderMessages();buttons[next].focus();
        });
        root.addEventListener('click',async event=>{
            const group=event.target.closest('[data-admin-group]');if(group){state.tab=group.dataset.adminGroup;renderMessages();return;}
            const prepare=event.target.closest('[data-admin-patient]');if(prepare){await prepareMessage(prepare.dataset.adminPatient,prepare);return;}
            const b=event.target.closest('[data-admin-action]');if(!b||!allowed())return;
            const action=b.dataset.adminAction;
            if(action==='privacy'){state.hidden=!state.hidden;b.setAttribute('aria-pressed',String(state.hidden));decorate();render();}
            if(action==='prev'||action==='next'){const base=state.month+'-15',delta=action==='prev'?-1:1,d=new Date(base+'T12:00:00Z');d.setUTCMonth(d.getUTCMonth()+delta);state.month=d.toISOString().slice(0,7);refresh(true);}
            if(action==='retry')refresh(true);
            if(action==='close-message')$('ks_admin_message_dialog').close();
            if(action==='agenda')window.navegarPara?.('tela_agenda');
            if(['finance','pending','expenses'].includes(action)){
                const selected=action==='pending'?'pendencias':action==='expenses'?'gastos':'balanco';
                try{await window.KineSysScreenLoader?.ensure('tela_financeiro');if(!allowed())return;await window.navegarPara?.('tela_financeiro');window.alternarAbaFinanceiro?.(selected);}
                catch(_){setStatus('Não foi possível abrir o Financeiro. Tente novamente.');}
            }
        });
        decorate();return root;
    }
    function setStatus(text,error=false){const el=$('ks_admin_status');if(el){el.textContent=text;if(error)el.insertAdjacentHTML('beforeend',' <button class="btn-secondary" type="button" data-admin-action="retry">Tentar novamente</button>');}}
    function clear(){state.data=null;state.summary=null;['received','receivable','expenses','attended','occupancy','absences','scheduled','free','pending','pending_value','expense_alert'].forEach(id=>{if($('ks_admin_'+id))$('ks_admin_'+id).textContent='—';});if($('ks_admin_chart_table'))$('ks_admin_chart_table').replaceChildren();if($('ks_admin_message_list'))$('ks_admin_message_list').textContent='Dados não carregados.';draw();}
    async function refresh(force=false){
        const key=scope();if(!key){deactivate();return false;}
        if(state.scope!==key){state.token++;state.scope=key;state.month=today().slice(0,7);state.hidden=false;state.loadedAt=0;state.pending=null;state.data=null;state.summary=null;}
        const root=mount();if(!root)return false;
        $('tela_home').classList.add('ks-admin-home-active');document.body.classList.toggle('ks-admin-home-route',$('tela_home').classList.contains('ativa'));
        root.hidden=false;
        if(state.pending&&state.pending.month===state.month)return state.pending.promise;
        if(!force&&state.data&&Date.now()-state.loadedAt<30000){render();return true;}
        let p;try{p=period(state.month);}catch(err){state.month=state.summary?.p.month||today().slice(0,7);setStatus(err.message);$('ks_admin_month').value=state.month;return false;}
        $('ks_admin_month').max=today().slice(0,7);$('ks_admin_month').value=state.month;
        const token=++state.token;clear();setStatus('Atualizando dados confirmados da clínica…');root.setAttribute('aria-busy','true');
        const request={month:state.month,promise:null};
        request.promise=(async()=>{try{
            const data=await load(user().clinica_id,p);
            if(token!==state.token||key!==scope()||state.month!==p.month)return false;
            state.data=data;state.summary=summarize(data,p);state.loadedAt=Date.now();setStatus('');render();return true;
        }catch(err){if(token===state.token&&key===scope()){clear();setStatus(`${err.message} Nenhum valor estimado foi exibido.`,true);}return false;}
        finally{if(token===state.token)root.setAttribute('aria-busy','false');if(state.pending===request)state.pending=null;}})();
        state.pending=request;return request.promise;
    }
    function render(){
        if(!state.summary||!allowed())return;const r=state.summary,p=r.p;
        const set=(id,value)=>{if($('ks_admin_'+id))$('ks_admin_'+id).textContent=value;};
        const label=new Date(p.start+'T12:00:00Z').toLocaleDateString('pt-BR',{month:'long',year:'numeric',timeZone:'America/Sao_Paulo'});
        const dateLabel=new Date().toLocaleDateString('pt-BR',{weekday:'long',day:'numeric',month:'long',year:'numeric',timeZone:'America/Sao_Paulo'});
        set('date',dateLabel[0].toUpperCase()+dateLabel.slice(1));
        set('month_label',label);set('volume_period',p.month===p.now.slice(0,7)?'Este mês até hoje':label);
        set('received',metric(r.received));set('receivable',metric(r.receivable));set('expenses',metric(r.expenses));set('attended',r.attended);set('occupancy',r.occupancy===null?'—':r.occupancy+'%');set('absences',r.absences);set('scheduled',r.scheduled);
        set('free',r.free===null?'—':r.free);
        set('pending',`${r.pendingCount} contrato${r.pendingCount===1?'':'s'} a receber`);set('pending_value',metric(r.receivable));set('expense_alert',`${r.todayExpenses} despesa${r.todayExpenses===1?'':'s'} hoje`);
        $('ks_admin_home').querySelector('[data-admin-action="expenses"] small').textContent='Lançamentos registrados';
        set('flow_period',`Recebimentos × Despesas (acumulado) · 1–${Number(p.cut.slice(-2))} de ${new Date(p.start+'T12:00:00Z').toLocaleDateString('pt-BR',{month:'long',timeZone:'America/Sao_Paulo'})}`);
        set('sync','Dados confirmados');
        const next=$('ks_admin_home').querySelector('[data-admin-action="next"]');next.disabled=p.month===p.now.slice(0,7);
        if(!state.hidden){let a=0,b=0;$('ks_admin_chart_table').innerHTML='<table><caption>Valores acumulados por dia</caption><thead><tr><th>Dia</th><th>Recebido</th><th>Despesas pagas</th></tr></thead><tbody>'+r.income.map((x,i)=>{a+=x;b+=r.out[i];return `<tr><td>${i+1}</td><td>${esc(cash(a))}</td><td>${esc(cash(b))}</td></tr>`;}).join('')+'</tbody></table>';}
        else $('ks_admin_chart_table').textContent='Valores ocultos.';
        renderMessages();requestAnimationFrame(draw);
    }
    function draw(){
        const canvas=$('ks_admin_chart');if(!canvas)return;const box=canvas.getBoundingClientRect(),ratio=window.devicePixelRatio||1;
        canvas.width=Math.max(1,box.width*ratio);canvas.height=Math.max(1,box.height*ratio);const ctx=canvas.getContext('2d');if(!ctx)return;ctx.scale(ratio,ratio);ctx.clearRect(0,0,box.width,box.height);
        const message=$('ks_admin_chart_message');message.hidden=!!state.summary&&!state.hidden;
        message.textContent=state.hidden?'Valores financeiros ocultos.':state.pending?'Carregando fluxo…':'O gráfico será exibido após confirmar os dados.';
        canvas.setAttribute('aria-label',state.hidden?'Valores financeiros ocultos':'Recebimentos e despesas acumulados por dia; valores também disponíveis na tabela.');
        if(!state.summary||state.hidden)return;
        const style=getComputedStyle($('ks_admin_home')),color=name=>style.getPropertyValue(name).trim();
        const r=state.summary,series=[r.income,r.out].map(list=>{let sum=0;return [0,...list.map(x=>sum+=x)];});
        const max=Math.max(100,...series.flat()),min=Math.min(0,...series.flat()),step=Math.pow(10,Math.floor(Math.log10(max-min))),top=Math.ceil(max*1.12/step)*step,bottom=Math.floor(min/step)*step;
        const w=box.width,h=box.height,left=76,right=28,yTop=24,yBottom=h-48,plotW=w-left-right,plotH=yBottom-yTop;
        ctx.font='13px '+style.fontFamily;ctx.lineWidth=1;ctx.textBaseline='middle';
        for(let i=0;i<=4;i++){const y=yTop+plotH*i/4;ctx.strokeStyle=color('--kds-line-soft');ctx.setLineDash([2,3]);ctx.beginPath();ctx.moveTo(left,y);ctx.lineTo(w-right,y);ctx.stroke();ctx.fillStyle=color('--kds-muted');ctx.textAlign='right';ctx.fillText(cash(top-(top-bottom)*i/4),left-10,y);}
        ctx.setLineDash([]);
        const n=r.income.length,xPos=i=>left+plotW*i/n,yPos=v=>yBottom-(v-bottom)/(top-bottom)*plotH;
        ctx.strokeStyle=color('--kds-line-soft');ctx.lineWidth=1;ctx.setLineDash([2,3]);for(let i=0;i<=n;i++){ctx.beginPath();ctx.moveTo(xPos(i),yTop);ctx.lineTo(xPos(i),yBottom);ctx.stroke();}ctx.setLineDash([]);
        series.forEach((values,index)=>{const stroke=color(index?'--kds-eva-severe':'--kds-accent');ctx.beginPath();values.forEach((v,i)=>i?ctx.lineTo(xPos(i),yPos(v)):ctx.moveTo(xPos(i),yPos(v)));ctx.strokeStyle=stroke;ctx.lineWidth=2.2;ctx.stroke();ctx.lineTo(xPos(n),yBottom);ctx.lineTo(xPos(0),yBottom);ctx.closePath();ctx.globalAlpha=.08;ctx.fillStyle=stroke;ctx.fill();ctx.globalAlpha=1;
            values.forEach((v,i)=>{if(!i)return;ctx.beginPath();ctx.arc(xPos(i),yPos(v),3.4,0,Math.PI*2);ctx.fillStyle=stroke;ctx.fill();});
            ctx.fillStyle=stroke;ctx.textAlign='right';ctx.font='600 12px '+style.fontFamily;ctx.fillText(cash(values[n]),xPos(n)+12,yPos(values[n])-15);ctx.font='13px '+style.fontFamily;
        });
        ctx.fillStyle=color('--kds-muted');ctx.textAlign='center';const stride=w<550?Math.ceil(n/7):1;
        for(let i=1;i<=n;i++)if(i===1||i===n||i%stride===0)ctx.fillText(String(i),xPos(i),h-28);
        ctx.fillText('Dia do mês',left+plotW/2,h-7);
    }
    function renderMessages(){
        if(!state.summary||!allowed())return;const root=$('ks_admin_home'),groups=state.summary.groups;
        root.querySelectorAll('[data-admin-group]').forEach(b=>{const active=b.dataset.adminGroup===state.tab;b.setAttribute('aria-selected',String(active));b.tabIndex=active?0:-1;b.querySelector('span').textContent=`(${groups[b.dataset.adminGroup].length})`;});
        const term=norm($('ks_admin_patient_search').value),items=groups[state.tab].filter(p=>norm(p.nome).includes(term)).sort((a,b)=>String(a.nome).localeCompare(String(b.nome),'pt-BR'));
        const description={aniversarios:'Aniversário hoje',lembretes:'Sessão amanhã',retornos:'Sem novo agendamento após atendimento nos últimos 60 dias'};
        $('ks_admin_message_list').innerHTML=items.length?items.map(p=>`<div class="ks-admin-message-row"><span class="ks-admin-avatar" aria-hidden="true">${esc(String(p.nome||'').split(/\s+/).filter(Boolean).slice(0,2).map(x=>x[0]).join(''))}</span><strong>${esc(p.nome||'Paciente')}</strong><span>${description[state.tab]}</span><button class="btn-secondary" type="button" data-admin-patient="${esc(p.id)}">Preparar mensagem</button></div>`).join(''):'<p class="ks-admin-empty">Nenhum paciente encontrado nesta categoria.</p>';
    }
    let messageOrigin=null;
    async function prepareMessage(id,button){
        if(!allowed()||!state.data)return;
        const patient=state.summary.groups[state.tab].find(p=>String(p.id)===String(id));if(!patient)return;
        const contact=typeof obterContatoPreferencialPaciente==='function'?obterContatoPreferencialPaciente(patient):{telefone:patient.telefone,nomeDestinatario:patient.nome};
        let phone=String(contact.telefone||'').replace(/\D/g,'');if(phone.length===10||phone.length===11)phone='55'+phone;
        if(!/^55\d{10,11}$/.test(phone)){setStatus('Este paciente não possui um telefone válido. Confira o cadastro antes de preparar a mensagem.');return;}
        const greeting=contact.usaResponsavel?`Olá, ${contact.nomeDestinatario}! Sobre ${patient.nome}`:`Olá, ${patient.nome}!`;
        const clinic=String(typeof usuarioLogado!=='undefined'?usuarioLogado?.clinica_nome||'nossa clínica':'nossa clínica');
        let text=state.tab==='aniversarios'?`${greeting} A equipe da ${clinic} deseja um feliz aniversário, com muita saúde e bem-estar!`: `${greeting} Tudo bem? Gostaríamos de combinar seu próximo atendimento. Quando podemos conversar?`;
        if(state.tab==='lembretes'){
            const a=state.data.agendamentos.filter(x=>String(x.paciente_id)===String(id)&&x.data===dayAdd(today(),1)&&['agendado','confirmado','em_recepcao'].includes(x.status)).sort((a,b)=>String(a.hora_inicio).localeCompare(String(b.hora_inicio)))[0];
            if(!a)return;const date=a.data.split('-').reverse().join('/'),time=String(a.hora_inicio).slice(0,5);
            text=`${greeting} Passando para lembrar do atendimento em ${date}, às ${time}. Você confirma a presença?`;
        }
        $('ks_admin_message_recipient').textContent=`Destinatário: ${contact.nomeDestinatario||patient.nome}${contact.usaResponsavel?' (responsável)':''}`;
        $('ks_admin_message_text').value=text;const link=$('ks_admin_whatsapp_link');
        const update=()=>{link.href=`https://web.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent($('ks_admin_message_text').value)}`;};
        $('ks_admin_message_text').oninput=update;update();messageOrigin=button;
        const dialog=$('ks_admin_message_dialog');dialog.onclose=()=>messageOrigin?.isConnected&&messageOrigin.focus();dialog.showModal();$('ks_admin_message_text').focus();
    }
    function deactivate(){
        state.token++;state.scope='';state.pending=null;state.data=null;state.summary=null;state.loadedAt=0;state.hidden=false;
        $('ks_admin_message_dialog')?.close();$('ks_admin_home')?.remove();$('tela_home')?.classList.remove('ks-admin-home-active');document.body.classList.remove('ks-admin-home-route');
    }
    document.addEventListener('kinesys:tela-ativada',event=>{
        if(event.detail?.id==='tela_login'||!allowed()){deactivate();return;}
        document.body.classList.toggle('ks-admin-home-route',event.detail?.id==='tela_home');
        if(event.detail?.id==='tela_home')refresh();
    });
    document.addEventListener('kinesys:tela-desativada',event=>{if(event.detail?.id==='tela_home'){document.body.classList.remove('ks-admin-home-route');$('ks_admin_message_dialog')?.close();}});
    document.addEventListener('kinesys:design-ready',()=>{if(allowed())decorate();});
    window.addEventListener('resize',()=>{if(allowed()&&$('tela_home')?.classList.contains('ativa'))draw();},{passive:true});
    const start=()=>{if(allowed()&&$('tela_home')?.classList.contains('ativa'))refresh();};
    if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
    window.KineSysAdminHome=Object.freeze({refresh,allowed,period,summarize,capacity});
})();
