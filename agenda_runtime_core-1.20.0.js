/* ==========================================================================
   KineSys — Agenda Runtime Core v1.20.0 / Phase 4B
   Núcleo eager mínimo: notificações globais, escopo do profissional e ponte
   da fila offline. A UI completa permanece em agenda-1.20.0.js sob demanda.
   ========================================================================== */
(function(){
'use strict';

const NOTIFICACOES_PENDENTES_KEY = 'kinesys_notificacoes_pendentes_v1';
const AGENDA_SYNC_CORE_KEY = 'kinesys_agendamentos_pendentes_sync_v1';
let notificacoesCache = [];
let notificacoesTimer = null;
let notificacoesPrimeiraCarga = true;
let equipeCoreCache = [];

function perfilNotificacoesAgendaAtual() {
    return String(typeof usuarioLogado !== 'undefined' && usuarioLogado?.tipo || '').toUpperCase();
}
function usuarioEhAdministradorAgendaCore() {
    return ['MASTER','MASTER_FEM','ADMINISTRADOR','ADMINISTRADORA'].includes(perfilNotificacoesAgendaAtual());
}
function usuarioPodeVerAgendaClinicaTodaCore() {
    return usuarioEhAdministradorAgendaCore() || perfilNotificacoesAgendaAtual() === 'SECRETARIA';
}
function encontrarProfissionalAgendaCore() {
    if (typeof usuarioLogado === 'undefined' || !usuarioLogado || !equipeCoreCache.length) return null;
    const idUsuario = String(usuarioLogado.id || '').trim();
    const emailUsuario = String(usuarioLogado.email || '').trim().toLowerCase();
    const nomeUsuario = String(usuarioLogado.nome || '').trim().toLowerCase();
    return equipeCoreCache.find(p => idUsuario && String(p.id || '').trim() === idUsuario)
        || equipeCoreCache.find(p => emailUsuario && String(p.email || '').trim().toLowerCase() === emailUsuario)
        || equipeCoreCache.find(p => nomeUsuario && String(p.nome || '').trim().toLowerCase() === nomeUsuario)
        || null;
}
async function carregarProfissionaisAgendaCore() {
    if (typeof _supabase === 'undefined' || !_supabase) return false;
    const identidadeInicial = String(typeof usuarioLogado !== 'undefined' && usuarioLogado?.id || '');
    const clinicaInicial = String(typeof usuarioLogado !== 'undefined' && usuarioLogado?.clinica_id || '');
    const resposta = await _supabase.rpc('kinesys_contexto_agenda');
    let error = resposta.error;
    const contexto = resposta.data;
    if (!error && (!identidadeInicial || String(contexto?.perfil_id || '') !== identidadeInicial
        || String(contexto?.clinica_id || '') !== clinicaInicial
        || String(usuarioLogado?.id || '') !== identidadeInicial
        || String(usuarioLogado?.clinica_id || '') !== clinicaInicial)) error = {message:'A sessão mudou. Entre novamente.'};
    if (error) {
        console.warn('Erro ao carregar equipe para agenda:', error);
        equipeCoreCache = [];
        return false;
    }
    equipeCoreCache = (contexto?.profissionais || [])
        .filter(p => p.aparece_na_agenda === true)
        .sort((a,b) => String(a.nome || '').localeCompare(String(b.nome || ''), 'pt-BR'));
    return true;
}
function profissionalAgendaRestritoAtualIdCore() {
    if (usuarioPodeVerAgendaClinicaTodaCore()) return '';
    return String(encontrarProfissionalAgendaCore()?.id || '');
}

function lerAgendamentosPendentesSyncCore() {
    try {
        const bruto = localStorage.getItem(AGENDA_SYNC_CORE_KEY);
        const lista = bruto ? JSON.parse(bruto) : [];
        return Array.isArray(lista) ? lista.filter(x => x && x.payload && x.payload.id) : [];
    } catch (_) { return []; }
}
function gravarAgendamentosPendentesSyncCore(lista) {
    try { localStorage.setItem(AGENDA_SYNC_CORE_KEY, JSON.stringify(Array.isArray(lista) ? lista : [])); return true; }
    catch (_) { return false; }
}
function salvarAgendamentoPendenteSyncCore(payload, metadados = {}) {
    if (!payload?.id) return false;
    const lista = lerAgendamentosPendentesSyncCore();
    const idx = lista.findIndex(x => String(x.payload?.id || '') === String(payload.id));
    const anterior = idx >= 0 ? lista[idx] : {};
    const item = {...anterior,payload:{...(anterior.payload||{}),...payload},metadados:{...(anterior.metadados||{}),...(metadados||{})},criado_em_local:anterior.criado_em_local||new Date().toISOString(),atualizado_em_local:new Date().toISOString(),tentativas:Number(anterior.tentativas||0),ultimo_erro:String(metadados?.ultimo_erro||anterior.ultimo_erro||''),conflito_sync:false};
    if (idx >= 0) lista[idx] = item; else lista.push(item);
    return gravarAgendamentosPendentesSyncCore(lista);
}
function atualizarPayloadAgendamentoPendenteSyncCore(id, alteracoes = {}) {
    const lista = lerAgendamentosPendentesSyncCore();
    const idx = lista.findIndex(x => String(x.payload?.id || '') === String(id || ''));
    if (idx < 0) return false;
    lista[idx] = {...lista[idx],payload:{...(lista[idx].payload||{}),...(alteracoes||{})},atualizado_em_local:new Date().toISOString()};
    return gravarAgendamentosPendentesSyncCore(lista);
}
function removerAgendamentoPendenteSyncCore(id) {
    return gravarAgendamentosPendentesSyncCore(lerAgendamentosPendentesSyncCore().filter(x => String(x.payload?.id || '') !== String(id || '')));
}
function atualizarAgendamentoPendenteSyncCore(id, alteracoes = {}) {
    const lista = lerAgendamentosPendentesSyncCore();
    const idx = lista.findIndex(x => String(x.payload?.id || '') === String(id || ''));
    if (idx < 0) return false;
    lista[idx] = {...lista[idx],...(alteracoes||{}),atualizado_em_local:new Date().toISOString()};
    return gravarAgendamentosPendentesSyncCore(lista);
}
async function sincronizarAgendamentosPendentesCore(opcoes = {}) {
    if (!lerAgendamentosPendentesSyncCore().length) return true;
    if (typeof _supabase === 'undefined' || !_supabase) return false;
    const bridge = window.sincronizarAgendamentosPendentes;
    const loader = window.KineSysScreenLoader;
    if (!loader || typeof loader.ensure !== 'function') return false;
    try {
        await loader.ensure('tela_agenda');
        const real = window.sincronizarAgendamentosPendentes;
        if (typeof real === 'function' && real !== bridge) return real(opcoes);
    } catch (error) {
        console.warn('Agenda: fila pendente aguardando carregamento do módulo completo.', error);
    }
    return false;
}

if (typeof window !== 'undefined') {
    if (typeof window.fecharModal !== 'function') window.fecharModal = id => { const el=document.getElementById(id); if(el) el.classList.remove('ativa'); };
    if (typeof window.abrirModal !== 'function') window.abrirModal = id => { const el=document.getElementById(id); if(el) el.classList.add('ativa'); };
    window.carregarProfissionaisAgenda = carregarProfissionaisAgendaCore;
    window.profissionalAgendaRestritoAtualId = profissionalAgendaRestritoAtualIdCore;
    window.usuarioEhAdministradorAgenda = usuarioEhAdministradorAgendaCore;
    window.usuarioPodeVerAgendaClinicaToda = usuarioPodeVerAgendaClinicaTodaCore;
    window.lerAgendamentosPendentesSync = lerAgendamentosPendentesSyncCore;
    window.gravarAgendamentosPendentesSync = gravarAgendamentosPendentesSyncCore;
    window.salvarAgendamentoPendenteSync = salvarAgendamentoPendenteSyncCore;
    window.atualizarPayloadAgendamentoPendenteSync = atualizarPayloadAgendamentoPendenteSyncCore;
    window.removerAgendamentoPendenteSync = removerAgendamentoPendenteSyncCore;
    window.atualizarAgendamentoPendenteSync = atualizarAgendamentoPendenteSyncCore;
    window.sincronizarAgendamentosPendentes = sincronizarAgendamentosPendentesCore;
}

function lerNotificacoesPendentesAgenda() {
    try { return JSON.parse(localStorage.getItem(NOTIFICACOES_PENDENTES_KEY) || '[]'); }
    catch (_) { return []; }
}
function gravarNotificacoesPendentesAgenda(lista) {
    try { localStorage.setItem(NOTIFICACOES_PENDENTES_KEY, JSON.stringify(Array.isArray(lista) ? lista : [])); return true; }
    catch (_) { return false; }
}
function enfileirarNotificacaoAgenda(row) {
    const lista = lerNotificacoesPendentesAgenda();
    if (!lista.some(x => x.origem_chave === row.origem_chave)) lista.push(row);
    return gravarNotificacoesPendentesAgenda(lista.slice(-100));
}
function removerNotificacaoPendenteAgenda(origemChave) {
    return gravarNotificacoesPendentesAgenda(lerNotificacoesPendentesAgenda().filter(x => x.origem_chave !== origemChave));
}
function erroSchemaNotificacoesAgenda(error) {
    return /notificacoes_internas|horario_extraordinario|schema cache|column .* does not exist|relation .* does not exist/i.test(String(error?.message || error?.details || error?.hint || ''));
}
async function sincronizarNotificacoesPendentesAgenda() {
    if (!_supabase) return false;
    const lista = lerNotificacoesPendentesAgenda();
    if (!lista.length) return true;
    let ok = true;
    for (const row of lista) {
        const { error } = await _supabase.from('notificacoes_internas').upsert([row], { onConflict:'origem_chave', ignoreDuplicates:true });
        if (!error) removerNotificacaoPendenteAgenda(row.origem_chave);
        else { ok = false; if (erroSchemaNotificacoesAgenda(error)) break; }
    }
    return ok;
}

function identidadeNotificacoesAgenda() {
    const email = String(usuarioLogado?.email || '').trim().toLowerCase();
    const id = usuarioLogado?.id ? String(usuarioLogado.id) : '';
    return { id, email };
}
function usuarioPodeReceberNotificacoesAgenda() {
    return !!usuarioLogado && perfilNotificacoesAgendaAtual() !== 'SECRETARIA';
}
function renderizarIndicadorNotificacoesAgenda() {
    const wrap = document.getElementById('ks_notificacoes_wrapper');
    const badge = document.getElementById('ks_notificacoes_badge');
    const lista = document.getElementById('ks_notificacoes_lista');
    if (!wrap || !badge || !lista) return;
    const pode = usuarioPodeReceberNotificacoesAgenda();
    wrap.hidden = !pode;
    if (!pode) {
        badge.hidden = true;
        badge.style.display = 'none';
        badge.setAttribute('aria-hidden', 'true');
        return;
    }
    const naoLidas = notificacoesCache.filter(n => !n.lida);
    const totalNaoLidas = naoLidas.length;
    badge.textContent = totalNaoLidas > 99 ? '99+' : String(totalNaoLidas);
    // O badge vermelho só existe visualmente quando há avisos não lidos.
    // Além do atributo hidden, controlamos display de forma defensiva porque
    // a classe do badge usa display:grid e alguns navegadores podem priorizá-la.
    badge.hidden = totalNaoLidas === 0;
    badge.style.display = totalNaoLidas > 0 ? 'grid' : 'none';
    badge.setAttribute('aria-hidden', totalNaoLidas > 0 ? 'false' : 'true');
    if (!notificacoesCache.length) {
        lista.innerHTML = '<div class="ks-notificacao-vazia">Nenhum aviso novo.</div>';
        return;
    }
    lista.innerHTML = notificacoesCache.map(n => `
        <button type="button" class="ks-notificacao-item ${n.lida ? '' : 'nao-lida'}" onclick="abrirNotificacaoAgenda('${escapeHTML(n.id || '')}')">
            <strong>${escapeHTML(n.titulo || 'Aviso da Agenda')}</strong>
            <span>${escapeHTML(n.mensagem || '')}</span>
            <small>${n.criada_em ? new Date(n.criada_em).toLocaleString('pt-BR') : ''}</small>
        </button>`).join('');
}
if (typeof window !== 'undefined') window.renderizarIndicadorNotificacoesAgenda = renderizarIndicadorNotificacoesAgenda;

async function carregarNotificacoesAgenda({ avisar = true } = {}) {
    if (!usuarioPodeReceberNotificacoesAgenda() || !_supabase) {
        notificacoesCache = [];
        renderizarIndicadorNotificacoesAgenda();
        return [];
    }
    const ident = identidadeNotificacoesAgenda();
    const resultados = [];
    const vistos = new Set();
    const adicionar = rows => (rows || []).forEach(n => { const k = n.id || n.origem_chave; if (!vistos.has(k)) { vistos.add(k); resultados.push(n); } });
    try {
        if (ident.id) {
            const r = await _supabase.from('notificacoes_internas').select('*').eq('destinatario_profissional_id', ident.id).order('criada_em', { ascending:false }).limit(20);
            if (r.error) throw r.error; adicionar(r.data);
        }
        if (ident.email) {
            const r = await _supabase.from('notificacoes_internas').select('*').eq('destinatario_email', ident.email).order('criada_em', { ascending:false }).limit(20);
            if (r.error) throw r.error; adicionar(r.data);
        }
        resultados.sort((a,b) => String(b.criada_em || '').localeCompare(String(a.criada_em || '')));
        const antes = notificacoesCache.filter(n => !n.lida).length;
        notificacoesCache = resultados.slice(0,20);
        renderizarIndicadorNotificacoesAgenda();
        const agora = notificacoesCache.filter(n => !n.lida).length;
        if (avisar && agora > 0 && (notificacoesPrimeiraCarga || agora > antes) && typeof mostrarToastKineSys === 'function') {
            mostrarToastKineSys(agora === 1 ? 'Você tem 1 novo aviso da Agenda.' : `Você tem ${agora} avisos não lidos da Agenda.`, 'aviso', 5200);
        }
        notificacoesPrimeiraCarga = false;
        return notificacoesCache;
    } catch (error) {
        if (!erroSchemaNotificacoesAgenda(error)) console.warn('Agenda: falha ao carregar notificações internas.', error);
        renderizarIndicadorNotificacoesAgenda();
        return [];
    }
}

function alternarPainelNotificacoes() {
    const painel = document.getElementById('ks_notificacoes_painel');
    if (!painel) return;
    painel.hidden = !painel.hidden;
    if (!painel.hidden) carregarNotificacoesAgenda({ avisar:false }).catch(console.warn);
}
if (typeof window !== 'undefined') window.alternarPainelNotificacoes = alternarPainelNotificacoes;

async function marcarTodasNotificacoesAgendaLidas() {
    const naoLidas = notificacoesCache.filter(n => !n.lida && n.id);
    if (!_supabase || !naoLidas.length) return;
    const ids = naoLidas.map(n => n.id);
    const { error } = await _supabase.from('notificacoes_internas').update({ lida:true, lida_em:new Date().toISOString() }).in('id', ids);
    if (!error) {
        notificacoesCache = notificacoesCache.map(n => ids.includes(n.id) ? { ...n, lida:true } : n);
        renderizarIndicadorNotificacoesAgenda();
    }
}
if (typeof window !== 'undefined') window.marcarTodasNotificacoesAgendaLidas = marcarTodasNotificacoesAgendaLidas;

async function abrirNotificacaoAgenda(id) {
    const n = notificacoesCache.find(x => String(x.id) === String(id));
    if (!n) return;
    if (_supabase && !n.lida && n.id) {
        await _supabase.from('notificacoes_internas').update({ lida:true, lida_em:new Date().toISOString() }).eq('id', n.id);
        n.lida = true; renderizarIndicadorNotificacoesAgenda();
    }
    const painel = document.getElementById('ks_notificacoes_painel'); if (painel) painel.hidden = true;
    if (typeof telaPermitida === 'function' && !telaPermitida('tela_agenda')) {
        if (typeof mostrarToastKineSys === 'function') mostrarToastKineSys(n.mensagem || 'Aviso da Agenda marcado como lido.', 'info', 6000);
        return;
    }
    const loader = typeof window !== 'undefined' ? window.KineSysScreenLoader : null;
    if (loader && typeof loader.ensure === 'function') {
        try { await loader.ensure('tela_agenda'); }
        catch (error) {
            console.error('Agenda: não foi possível carregar a tela a partir da notificação.', error);
            if (typeof mostrarToastKineSys === 'function') mostrarToastKineSys('Não foi possível abrir a Agenda agora.', 'erro', 5000);
            return;
        }
    }
    if (n.agendamento_data && typeof agendaDataSelecionada !== 'undefined') agendaDataSelecionada = new Date(n.agendamento_data + 'T00:00:00');
    if (typeof navegarPara === 'function') await Promise.resolve(navegarPara('tela_agenda'));
    if (typeof renderizarPainelAgenda === 'function') await renderizarPainelAgenda();
    if (n.agendamento_id && typeof abrirDetalheAgendamento === 'function') setTimeout(() => abrirDetalheAgendamento(String(n.agendamento_id)), 80);
}
if (typeof window !== 'undefined') window.abrirNotificacaoAgenda = abrirNotificacaoAgenda;

function iniciarNotificacoesAgenda() {
    if (notificacoesTimer) clearInterval(notificacoesTimer);
    notificacoesPrimeiraCarga = true;
    setTimeout(async () => {
        renderizarIndicadorNotificacoesAgenda();
        if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
        await sincronizarNotificacoesPendentesAgenda().catch(()=>false);
        await carregarNotificacoesAgenda({ avisar:true });
    }, 220);
    notificacoesTimer = setInterval(() => {
        if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return;
        sincronizarNotificacoesPendentesAgenda().catch(()=>false);
        carregarNotificacoesAgenda({ avisar:true }).catch(()=>[]);
    }, 60000);
}
if (typeof window !== 'undefined') window.iniciarNotificacoesAgenda = iniciarNotificacoesAgenda;
function pararNotificacoesAgenda() {
    if (notificacoesTimer) clearInterval(notificacoesTimer);
    notificacoesTimer = null;
    notificacoesCache = [];
    renderizarIndicadorNotificacoesAgenda();
}
if (typeof window !== 'undefined') window.pararNotificacoesAgenda = pararNotificacoesAgenda;

document.addEventListener('click', e => {
    const wrap = document.getElementById('ks_notificacoes_wrapper');
    const painel = document.getElementById('ks_notificacoes_painel');
    if (wrap && painel && !painel.hidden && !wrap.contains(e.target)) painel.hidden = true;
});



if (typeof window !== 'undefined') {
    window.lerNotificacoesPendentesAgenda = lerNotificacoesPendentesAgenda;
    window.gravarNotificacoesPendentesAgenda = gravarNotificacoesPendentesAgenda;
    window.enfileirarNotificacaoAgenda = enfileirarNotificacaoAgenda;
    window.removerNotificacaoPendenteAgenda = removerNotificacaoPendenteAgenda;
    window.erroSchemaNotificacoesAgenda = erroSchemaNotificacoesAgenda;
    window.sincronizarNotificacoesPendentesAgenda = sincronizarNotificacoesPendentesAgenda;
}
})();
