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
    if(!/^\d{4}-\d{2}-\d{2}$/.test(a.data||'')||!/^\d{2}:\d{2}/.test(a.hora_inicio||''))return null;
    const t=Date.parse(`${a.data}T${String(a.hora_inicio).slice(0,5)}:00-03:00`);
    return Number.isFinite(t)?{t,legado:true}:null;
}
function filtrarAtendimentos24hHome(dados,agora=Date.now(),profissional=''){
    return dados.filter(a=>['atendido','concluido'].includes(String(a.status||'').toLowerCase()))
        .filter(a=>!profissional||String(a.profissional_id)===profissional)
        .map(a=>({...a,__referencia:referenciaAtendimentoHome(a)}))
        .filter(a=>a.__referencia&&a.__referencia.t>=agora-86400000&&a.__referencia.t<=agora)
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
    const inicio=new Date(agora-86400000).toISOString(),fim=new Date(agora).toISOString();
    const diaInicio=dataClinicaHome(agora-86400000),diaFim=dataClinicaHome(agora);
    const campos='id,paciente_id,profissional_id,data,hora_inicio,status'+(comHorario?',atendido_em':'');
    const todos=[];
    for(let offset=0;;offset+=500){
        let q=_supabase.from('agendamentos').select(campos).in('status',['atendido','concluido']);
        if(comHorario)q=q.or(`and(atendido_em.gte.${inicio},atendido_em.lte.${fim}),and(atendido_em.is.null,data.gte.${diaInicio},data.lte.${diaFim})`);
        else q=q.gte('data',diaInicio).lte('data',diaFim);
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
    if(typeof telaPermitida==='function'&&!telaPermitida(tela)){alert('🔒 Seu perfil não tem acesso a este detalhamento.');return;}
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

if(typeof navegarPara==='function'&&!navegarPara.__homeDetalhesWrapped){
    const base=navegarPara;
    const wrapped=function(idTela,...args){const r=base.call(this,idTela,...args);setTimeout(()=>{
        prepararHomeCompacta();configurarCardsHomeDetalhes();
        if(idTela==='tela_home'){fecharPendenciasHome(false);carregarAtendimentosHojeDetalhes();carregarPacientesRecentesDetalhes();}
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
    prepararHomeCompacta();configurarCardsHomeDetalhes();
    if(document.getElementById('tela_home')?.classList.contains('ativa')){
        carregarAtendimentosHojeDetalhes();
        carregarPendenciasClinicasDetalhes(false).catch(()=>{});
        carregarPacientesRecentesDetalhes(false).catch(()=>{});
    }
}
document.addEventListener('DOMContentLoaded',()=>setTimeout(inicializarHomeDetalhes,80));
setTimeout(()=>{if(document.readyState!=='loading')inicializarHomeDetalhes();},700);
let homeDetalhesRefreshTimer=null;

function homeDetalhesTelaAtiva(){
    return !!document.getElementById('tela_home')?.classList.contains('ativa');
}
function executarRefreshPeriodicoHome(){
    if(document.visibilityState!=='visible'||!homeDetalhesTelaAtiva())return;
    carregarAtendimentosHojeDetalhes();
    carregarPacientesRecentesDetalhes();
}
function ativarLifecycleHomeDetalhes(){
    if(!homeDetalhesTelaAtiva())return;
    if(!homeDetalhesRefreshTimer)homeDetalhesRefreshTimer=setInterval(executarRefreshPeriodicoHome,60000);
}
function suspenderLifecycleHomeDetalhes(){
    if(homeDetalhesRefreshTimer){clearInterval(homeDetalhesRefreshTimer);homeDetalhesRefreshTimer=null;}
    fecharAtendimentosHome(false);
    fecharPendenciasHome(false);
}
function aoTelaAtivadaHomeDetalhes(event){
    if(event.detail?.id==='tela_home')ativarLifecycleHomeDetalhes();
}
function aoTelaDesativadaHomeDetalhes(event){
    if(event.detail?.id==='tela_home')suspenderLifecycleHomeDetalhes();
}

document.addEventListener('kinesys:tela-ativada',aoTelaAtivadaHomeDetalhes);
document.addEventListener('kinesys:tela-desativada',aoTelaDesativadaHomeDetalhes);
if(document.readyState!=='loading'&&homeDetalhesTelaAtiva())ativarLifecycleHomeDetalhes();
