/* ==========================================================================
   KineSys — núcleo global de notificações da Agenda v1.20.1
   Fase 4B: permanece eager para preservar avisos após login enquanto a UI
   completa da Agenda é carregada somente no primeiro acesso.
   Mantém os nomes públicos e a fila local já existentes.
   ========================================================================== */

let agendaNotificacoesCache = [];
let agendaNotificacoesTimer = null;
let agendaNotificacoesPrimeiraCarga = true;
let agendaNotificacoesEmCarga = null;
let agendaNotificacoesUltimaCargaEm = 0;
const AGENDA_NOTIFICACOES_CACHE_MS = 15000;
const AGENDA_NOTIFICACOES_PENDENTES_KEY = 'kinesys_notificacoes_pendentes_v1';

function lerNotificacoesPendentesAgenda() {
    try { return JSON.parse(localStorage.getItem(AGENDA_NOTIFICACOES_PENDENTES_KEY) || '[]'); }
    catch (_) { return []; }
}
function gravarNotificacoesPendentesAgenda(lista) {
    try { localStorage.setItem(AGENDA_NOTIFICACOES_PENDENTES_KEY, JSON.stringify(Array.isArray(lista) ? lista : [])); return true; }
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
    return !!usuarioLogado && String(usuarioLogado?.tipo || '').toUpperCase() !== 'SECRETARIA';
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
    const naoLidas = agendaNotificacoesCache.filter(n => !n.lida);
    const totalNaoLidas = naoLidas.length;
    badge.textContent = totalNaoLidas > 99 ? '99+' : String(totalNaoLidas);
    // O badge vermelho só existe visualmente quando há avisos não lidos.
    // Além do atributo hidden, controlamos display de forma defensiva porque
    // a classe do badge usa display:grid e alguns navegadores podem priorizá-la.
    badge.hidden = totalNaoLidas === 0;
    badge.style.display = totalNaoLidas > 0 ? 'grid' : 'none';
    badge.setAttribute('aria-hidden', totalNaoLidas > 0 ? 'false' : 'true');
    if (!agendaNotificacoesCache.length) {
        lista.innerHTML = '<div class="ks-notificacao-vazia">Nenhum aviso novo.</div>';
        return;
    }
    lista.innerHTML = agendaNotificacoesCache.map(n => `
        <button type="button" class="ks-notificacao-item ${n.lida ? '' : 'nao-lida'}" onclick="abrirNotificacaoAgenda('${escapeHTML(n.id || '')}')">
            <strong>${escapeHTML(n.titulo || 'Aviso da Agenda')}</strong>
            <span>${escapeHTML(n.mensagem || '')}</span>
            <small>${n.criada_em ? new Date(n.criada_em).toLocaleString('pt-BR') : ''}</small>
        </button>`).join('');
}
if (typeof window !== 'undefined') window.renderizarIndicadorNotificacoesAgenda = renderizarIndicadorNotificacoesAgenda;

async function carregarNotificacoesAgenda({ avisar = true, forcar = false } = {}) {
    if (!usuarioPodeReceberNotificacoesAgenda() || !_supabase) {
        agendaNotificacoesCache = [];
        agendaNotificacoesUltimaCargaEm = 0;
        renderizarIndicadorNotificacoesAgenda();
        return [];
    }

    // Home, cabeçalho e timer podem pedir a mesma leitura quase ao mesmo tempo.
    // Compartilhamos a requisição em andamento e, em leituras silenciosas, usamos
    // por poucos segundos o cache já exibido. Isso reduz round-trips sem atrasar
    // o polling normal de 60 s nem alterar o conteúdo das notificações.
    if (agendaNotificacoesEmCarga) return agendaNotificacoesEmCarga;
    const agoraMs = Date.now();
    if (!forcar && !avisar && agendaNotificacoesUltimaCargaEm && (agoraMs - agendaNotificacoesUltimaCargaEm) < AGENDA_NOTIFICACOES_CACHE_MS) {
        renderizarIndicadorNotificacoesAgenda();
        return agendaNotificacoesCache;
    }

    agendaNotificacoesEmCarga=(async()=>{
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
            const antes = agendaNotificacoesCache.filter(n => !n.lida).length;
            agendaNotificacoesCache = resultados.slice(0,20);
            agendaNotificacoesUltimaCargaEm = Date.now();
            renderizarIndicadorNotificacoesAgenda();
            const agora = agendaNotificacoesCache.filter(n => !n.lida).length;
            if (avisar && agora > 0 && (agendaNotificacoesPrimeiraCarga || agora > antes) && typeof mostrarToastKineSys === 'function') {
                mostrarToastKineSys(agora === 1 ? 'Você tem 1 novo aviso da Agenda.' : `Você tem ${agora} avisos não lidos da Agenda.`, 'aviso', 5200);
            }
            agendaNotificacoesPrimeiraCarga = false;
            return agendaNotificacoesCache;
        } catch (error) {
            if (!erroSchemaNotificacoesAgenda(error)) console.warn('Agenda: falha ao carregar notificações internas.', error);
            renderizarIndicadorNotificacoesAgenda();
            return [];
        }
    })().finally(()=>{agendaNotificacoesEmCarga=null;});

    return agendaNotificacoesEmCarga;
}

function alternarPainelNotificacoes() {
    const painel = document.getElementById('ks_notificacoes_painel');
    if (!painel) return;
    painel.hidden = !painel.hidden;
    if (!painel.hidden) carregarNotificacoesAgenda({ avisar:false }).catch(console.warn);
}
if (typeof window !== 'undefined') window.alternarPainelNotificacoes = alternarPainelNotificacoes;

async function marcarTodasNotificacoesAgendaLidas() {
    const naoLidas = agendaNotificacoesCache.filter(n => !n.lida && n.id);
    if (!_supabase || !naoLidas.length) return;
    const ids = naoLidas.map(n => n.id);
    const { error } = await _supabase.from('notificacoes_internas').update({ lida:true, lida_em:new Date().toISOString() }).in('id', ids);
    if (!error) {
        agendaNotificacoesCache = agendaNotificacoesCache.map(n => ids.includes(n.id) ? { ...n, lida:true } : n);
        renderizarIndicadorNotificacoesAgenda();
    }
}
if (typeof window !== 'undefined') window.marcarTodasNotificacoesAgendaLidas = marcarTodasNotificacoesAgendaLidas;

async function abrirNotificacaoAgenda(id) {
    const n = agendaNotificacoesCache.find(x => String(x.id) === String(id));
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
    if (typeof window !== 'undefined' && window.KineSysScreenLoader?.ensure) {
        try {
            await window.KineSysScreenLoader.ensure('tela_agenda');
        } catch (error) {
            console.error('Agenda: falha ao carregar módulo a partir da notificação.', error);
            if (typeof mostrarToastKineSys === 'function') mostrarToastKineSys('Não foi possível abrir a Agenda agora. Tente novamente.', 'erro', 6500);
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
    if (agendaNotificacoesTimer) clearInterval(agendaNotificacoesTimer);
    agendaNotificacoesPrimeiraCarga = true;
    setTimeout(async () => {
        renderizarIndicadorNotificacoesAgenda();
        if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
        await sincronizarNotificacoesPendentesAgenda().catch(()=>false);
        await carregarNotificacoesAgenda({ avisar:true });
    }, 220);
    agendaNotificacoesTimer = setInterval(() => {
        if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return;
        sincronizarNotificacoesPendentesAgenda().catch(()=>false);
        carregarNotificacoesAgenda({ avisar:true }).catch(()=>[]);
    }, 60000);
}
if (typeof window !== 'undefined') window.iniciarNotificacoesAgenda = iniciarNotificacoesAgenda;
function pararNotificacoesAgenda() {
    if (agendaNotificacoesTimer) clearInterval(agendaNotificacoesTimer);
    agendaNotificacoesTimer = null;
    agendaNotificacoesCache = [];
    agendaNotificacoesEmCarga = null;
    agendaNotificacoesUltimaCargaEm = 0;
    renderizarIndicadorNotificacoesAgenda();
}
if (typeof window !== 'undefined') window.pararNotificacoesAgenda = pararNotificacoesAgenda;

document.addEventListener('click', e => {
    const wrap = document.getElementById('ks_notificacoes_wrapper');
    const painel = document.getElementById('ks_notificacoes_painel');
    if (wrap && painel && !painel.hidden && !wrap.contains(e.target)) painel.hidden = true;
});
