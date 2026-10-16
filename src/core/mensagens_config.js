/* KineSys Clinical v1.11.2 — Configuração administrativa de mensagens padrão
   Administradores editam os textos no próprio KineSys; todos os perfis usam
   o catálogo salvo no Supabase nos botões de WhatsApp/relacionamento. */

const KINESYS_MENSAGENS_PADRAO = Object.freeze([
    {
        chave: 'crm_checkin_24h',
        titulo: 'Check-in após 24 horas',
        grupo: 'CRM e relacionamento',
        descricao: 'Botão “Check-in (24h)” da Home.',
        mensagem: '{saudacao}, aqui é {profissional} da {clinica}. Como está a evolução 24 horas após a sessão? A dor melhorou?',
        variaveis: ['saudacao','paciente','destinatario','profissional','clinica']
    },
    {
        chave: 'crm_exercicios_3d',
        titulo: 'Lembrete de exercícios',
        grupo: 'CRM e relacionamento',
        descricao: 'Botão “Lembrete Exercícios” da Home.',
        mensagem: '{saudacao}, aqui é {profissional} da {clinica}. Passando para lembrar dos exercícios que combinamos. Qualquer dúvida, estou à disposição.',
        variaveis: ['saudacao','paciente','destinatario','profissional','clinica']
    },
    {
        chave: 'crm_lembrete_sessao',
        titulo: 'Lembrete de sessão pelo CRM',
        grupo: 'CRM e relacionamento',
        descricao: 'Botão “Lembrete Sessão (Pré-24h)” da Home.',
        mensagem: '{saudacao}, passando para lembrar do atendimento na {clinica}. Faltam aproximadamente {horas} horas para a sessão, marcada para {data} às {hora}. Confirma a presença?',
        variaveis: ['saudacao','paciente','destinatario','profissional','clinica','data','hora','horas']
    },
    {
        chave: 'agenda_lembrete_sessao',
        titulo: 'Lembrete do agendamento',
        grupo: 'Agenda',
        descricao: 'Botão de envio de lembrete dentro do agendamento.',
        mensagem: '{saudacao}! Passando para lembrar da sessão de {procedimento} no dia {data} às {hora}. {confirmacao}',
        variaveis: ['saudacao','paciente','destinatario','profissional','clinica','procedimento','data','hora','confirmacao','link_confirmacao']
    },
    {
        chave: 'agenda_oferta_lista_espera',
        titulo: 'Oferta de vaga da lista de espera',
        grupo: 'Agenda',
        descricao: 'Mensagem enviada ao oferecer uma vaga que acabou de abrir.',
        mensagem: '{saudacao}! Abriu uma vaga para {procedimento} no dia {data} às {hora}. Há interesse nesse horário? Responda para confirmarmos.',
        variaveis: ['saudacao','paciente','destinatario','profissional','clinica','procedimento','data','hora']
    }
]);

let kinesysMensagensCache = new Map(KINESYS_MENSAGENS_PADRAO.map((m, i) => [m.chave, {...m, ordem:i+1, origem:'padrao'}]));
let kinesysMensagensCarregadas = false;
let kinesysMensagensUltimoErro = null;
let kinesysMensagemEditando = 'agenda_lembrete_sessao';
const kinesysMensagensRascunhos = new Map();
let kinesysMensagemSalvando = false;

function usuarioEhAdministradorMensagens() {
    if (typeof usuarioEhMaster === 'function') return usuarioEhMaster();
    const tipo = String(window.usuarioLogado?.tipo || '').toUpperCase();
    return ['MASTER','MASTER_FEM'].includes(tipo);
}

function templatePadraoMensagem(chave) {
    return KINESYS_MENSAGENS_PADRAO.find(x => x.chave === chave) || null;
}

function escaparHTMLMensagens(valor='') {
    if (typeof escapeHTML === 'function') return escapeHTML(String(valor ?? ''));
    return String(valor ?? '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
}

function formatarDataHoraMensagem(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? String(iso) : d.toLocaleString('pt-BR', {dateStyle:'short', timeStyle:'short'});
}

function contextoExemploMensagem() {
    return {
        saudacao: 'Olá, Maria',
        paciente: 'Maria Silva',
        destinatario: 'Maria Silva',
        profissional: 'Larissa Almeida',
        clinica: 'Fisiofix',
        procedimento: 'Fisioterapia',
        data: '28/08/2026',
        hora: '14:00',
        horas: '24',
        confirmacao: 'Por favor, responda esta mensagem confirmando sua presença ou avisando se não puder ir.',
        link_confirmacao: 'https://exemplo.com/confirmar'
    };
}

function aplicarVariaveisMensagem(template, contexto={}) {
    const base = {...(contexto || {})};
    return String(template || '').replace(/\{([a-z0-9_]+)\}/gi, (match, chave) => {
        return Object.prototype.hasOwnProperty.call(base, chave) && base[chave] != null ? String(base[chave]) : match;
    });
}

function erroSchemaMensagens(error) {
    const txt = String(error?.message || error?.details || error?.hint || error || '');
    return /kinesys_listar_mensagens_padrao|kinesys_salvar_mensagem_padrao|configuracoes_mensagens|schema cache|does not exist|not found/i.test(txt);
}

async function carregarConfiguracoesMensagens(forcar=false) {
    if (kinesysMensagensCarregadas && !forcar) return Array.from(kinesysMensagensCache.values());
    if (!window._supabase && typeof _supabase === 'undefined') return Array.from(kinesysMensagensCache.values());
    const sb = (typeof _supabase !== 'undefined') ? _supabase : window._supabase;
    if (!sb) return Array.from(kinesysMensagensCache.values());
    try {
        const { data, error } = await sb.rpc('kinesys_listar_mensagens_padrao');
        if (error) throw error;
        const rows = Array.isArray(data) ? data : [];
        for (const base of KINESYS_MENSAGENS_PADRAO) {
            const row = rows.find(r => r.chave === base.chave);
            kinesysMensagensCache.set(base.chave, row ? {...base, ...row, origem:'supabase'} : {...base, origem:'padrao'});
        }
        kinesysMensagensCarregadas = true;
        kinesysMensagensUltimoErro = null;
    } catch (err) {
        kinesysMensagensUltimoErro = err;
        console.warn('KineSys: não foi possível carregar as mensagens padrão do Supabase. Usando os textos locais de segurança.', err);
    }
    return Array.from(kinesysMensagensCache.values());
}

async function obterMensagemPadraoConfigurada(chave, contexto={}, atualizar=true) {
    if (atualizar) await carregarConfiguracoesMensagens(true);
    else if (!kinesysMensagensCarregadas) await carregarConfiguracoesMensagens(false);
    const cfg = kinesysMensagensCache.get(chave) || templatePadraoMensagem(chave);
    return aplicarVariaveisMensagem(cfg?.mensagem || '', contexto);
}

async function salvarMensagemPadraoConfigurada(chave, titulo, mensagem) {
    if (!usuarioEhAdministradorMensagens()) throw new Error('Somente administradores podem alterar mensagens padrão.');
    const texto = String(mensagem || '').trim();
    if (texto.length < 8) throw new Error('A mensagem está muito curta. Revise o texto antes de salvar.');
    const base = templatePadraoMensagem(chave);
    if (!base) throw new Error('Modelo de mensagem não reconhecido.');
    if (typeof _supabase === 'undefined' || !_supabase) throw new Error('Supabase indisponível. A configuração precisa ser salva na nuvem para chegar aos demais funcionários.');
    const atorId = String(window.usuarioLogado?.id || usuarioLogado?.id || '');
    const atorNome = String(window.usuarioLogado?.nome || usuarioLogado?.nome || 'Administrador');
    const { data, error } = await _supabase.rpc('kinesys_salvar_mensagem_padrao', {
        p_chave: chave,
        p_titulo: String(titulo || base.titulo).trim() || base.titulo,
        p_mensagem: texto,
        p_atualizado_por_id: atorId || null,
        p_atualizado_por_nome: atorNome
    });
    if (error) throw error;
    await carregarConfiguracoesMensagens(true);
    return Array.isArray(data) ? data[0] : data;
}

function renderizarListaMensagensConfiguracao() {
    const lista = document.getElementById('cfg_msg_lista');
    if (!lista) return;
    const ordem = ['agenda_lembrete_sessao', 'crm_lembrete_sessao', 'crm_checkin_24h', 'crm_exercicios_3d', 'agenda_oferta_lista_espera'];
    const nomes = { agenda_lembrete_sessao: 'Lembrete de sessão', crm_lembrete_sessao: 'Lembrete pela Home', crm_checkin_24h: 'Check-in após atendimento', crm_exercicios_3d: 'Orientações de exercícios' };
    const itens = [...KINESYS_MENSAGENS_PADRAO].sort((a,b) => ordem.indexOf(a.chave) - ordem.indexOf(b.chave)).map(base => {
        const cfg = kinesysMensagensCache.get(base.chave) || base;
        const ativo = base.chave === kinesysMensagemEditando ? ' ativa' : '';
        const atualizado = cfg.atualizado_em ? `Atualizada ${formatarDataHoraMensagem(cfg.atualizado_em)}` : 'Texto padrão do sistema';
        return `<button type="button" class="ks-msg-template-item${ativo}" aria-pressed="${base.chave === kinesysMensagemEditando}" onclick="selecionarMensagemConfiguracao('${escaparHTMLMensagens(base.chave)}')">
            <span class="ks-msg-template-group">${escaparHTMLMensagens(base.grupo === 'CRM e relacionamento' ? 'WhatsApp da Home' : base.grupo)}</span>
            <strong>${escaparHTMLMensagens(cfg.titulo && cfg.titulo !== base.titulo ? cfg.titulo : nomes[base.chave] || base.titulo)}</strong>
            <small>${escaparHTMLMensagens(atualizado)}</small>
        </button>`;
    });
    const outros = document.getElementById('cfg_msg_outros');
    lista.innerHTML = (outros ? itens.slice(0,4) : itens).join('');
    if (outros) outros.innerHTML = itens.slice(4).join('');
}

function atualizarPreviewMensagemConfiguracao() {
    const textarea = document.getElementById('cfg_msg_texto');
    const preview = document.getElementById('cfg_msg_preview');
    if (preview && textarea) preview.textContent = aplicarVariaveisMensagem(textarea.value, contextoExemploMensagem());
    const contador = document.getElementById('cfg_msg_contador');
    if (contador && textarea) contador.textContent = `${textarea.value.length}/4000`;
    const titulo = document.getElementById('cfg_msg_titulo');
    if (textarea) kinesysMensagensRascunhos.set(kinesysMensagemEditando, { mensagem: textarea.value, titulo: titulo?.value || '' });
}

function selecionarMensagemConfiguracao(chave) {
    const base = templatePadraoMensagem(chave);
    if (!base) return;
    // Captura também o título antes da troca, sem gravar rascunhos na nuvem.
    const anteriorTexto = document.getElementById('cfg_msg_texto');
    const anteriorTitulo = document.getElementById('cfg_msg_titulo');
    if (anteriorTexto?.dataset.mensagemCarregada === '1') {
        kinesysMensagensRascunhos.set(kinesysMensagemEditando, { mensagem: anteriorTexto.value, titulo: anteriorTitulo?.value || '' });
    }
    kinesysMensagemEditando = chave;
    const cfg = kinesysMensagensRascunhos.get(chave) || kinesysMensagensCache.get(chave) || base;
    const titulo = document.getElementById('cfg_msg_titulo');
    const texto = document.getElementById('cfg_msg_texto');
    const descricao = document.getElementById('cfg_msg_descricao');
    const variaveis = document.getElementById('cfg_msg_variaveis');
    const meta = document.getElementById('cfg_msg_meta');
    if (titulo) titulo.value = cfg.titulo || base.titulo;
    if (texto) { texto.value = cfg.mensagem ?? base.mensagem; texto.dataset.mensagemCarregada = '1'; }
    if (descricao) descricao.textContent = base.descricao;
    if (variaveis) variaveis.innerHTML = base.variaveis.map(v => `<button type="button" class="ks-msg-var" onclick="inserirVariavelMensagem('{${escaparHTMLMensagens(v)}}')">{${escaparHTMLMensagens(v)}}</button>`).join('');
    if (meta) {
        meta.textContent = cfg.atualizado_em
            ? `Última alteração: ${formatarDataHoraMensagem(cfg.atualizado_em)} · ${cfg.atualizado_por_nome || 'Administrador'}`
            : 'Ainda usando o texto padrão desta versão.';
    }
    renderizarListaMensagensConfiguracao();
    atualizarPreviewMensagemConfiguracao();
}

function inserirVariavelMensagem(token) {
    const el = document.getElementById('cfg_msg_texto');
    if (!el) return;
    const ini = Number.isInteger(el.selectionStart) ? el.selectionStart : el.value.length;
    const fim = Number.isInteger(el.selectionEnd) ? el.selectionEnd : ini;
    el.value = el.value.slice(0, ini) + token + el.value.slice(fim);
    el.focus();
    el.selectionStart = el.selectionEnd = ini + token.length;
    atualizarPreviewMensagemConfiguracao();
}

async function abrirConfiguracoesMensagens() {
    if (!usuarioEhAdministradorMensagens()) {
        alert('🔒 Somente administradores podem acessar a configuração de mensagens padrão.');
        if (typeof navegarPara === 'function') navegarPara('tela_home');
        return;
    }
    const status = document.getElementById('cfg_msg_status');
    if (status) status.textContent = 'Carregando configurações da clínica…';
    await carregarConfiguracoesMensagens(true);
    renderizarListaMensagensConfiguracao();
    selecionarMensagemConfiguracao(kinesysMensagemEditando || KINESYS_MENSAGENS_PADRAO[0].chave);
    if (status) {
        if (kinesysMensagensUltimoErro) {
            status.innerHTML = erroSchemaMensagens(kinesysMensagensUltimoErro)
                ? '<strong>Configuração ainda não ativada no Supabase.</strong> Execute a migration de mensagens padrão incluída nesta versão.'
                : 'Não foi possível atualizar as mensagens na nuvem agora. Os textos locais continuam disponíveis.';
            status.className = 'ks-msg-status aviso';
        } else {
            status.textContent = 'Mensagens sincronizadas com o Supabase. Alterações salvas passam a valer para os demais funcionários.';
            status.className = 'ks-msg-status ok';
        }
    }
}

async function salvarMensagemConfiguracaoAtual() {
    if (kinesysMensagemSalvando) return;
    kinesysMensagemSalvando = true;
    const btn = document.getElementById('cfg_msg_salvar');
    const status = document.getElementById('cfg_msg_status');
    const chave = kinesysMensagemEditando;
    const titulo = document.getElementById('cfg_msg_titulo')?.value || '';
    const texto = document.getElementById('cfg_msg_texto')?.value || '';
    try {
        if (btn) { btn.disabled = true; btn.textContent = 'Salvando…'; }
        await salvarMensagemPadraoConfigurada(chave, titulo, texto);
        const atual = kinesysMensagensRascunhos.get(chave);
        if (atual?.mensagem === texto && atual?.titulo === titulo) kinesysMensagensRascunhos.delete(chave);
        renderizarListaMensagensConfiguracao();
        if (status) { status.textContent = '✓ Mensagem salva. Os próximos envios de qualquer funcionário já usarão esta versão.'; status.className = 'ks-msg-status ok'; }
        if (typeof mostrarToastKineSys === 'function') mostrarToastKineSys('Mensagem padrão atualizada para toda a equipe.', 'sucesso', 4500);
    } catch (err) {
        console.error('KineSys: erro ao salvar mensagem padrão', err);
        if (status) {
            status.textContent = erroSchemaMensagens(err)
                ? 'A estrutura de mensagens ainda não existe no Supabase. Execute o SQL desta correção e tente novamente.'
                : `Não foi possível salvar: ${err?.message || err}`;
            status.className = 'ks-msg-status erro';
        }
    } finally {
        kinesysMensagemSalvando = false;
        if (btn) { btn.disabled = false; btn.textContent = 'Salvar mensagem'; }
    }
}

async function restaurarMensagemPadraoAtual() {
    if (kinesysMensagemSalvando) return;
    const chave = kinesysMensagemEditando;
    const base = templatePadraoMensagem(kinesysMensagemEditando);
    if (!base) return;
    const ok = typeof confirmarKineSys === 'function'
        ? await confirmarKineSys(`Restaurar “${base.titulo}” para o texto padrão desta versão?`, {titulo:'Restaurar mensagem', confirmar:'Restaurar padrão'})
        : confirm(`Restaurar “${base.titulo}” para o texto padrão?`);
    if (!ok || kinesysMensagemEditando !== chave || kinesysMensagemSalvando) return;
    const titulo = document.getElementById('cfg_msg_titulo');
    const texto = document.getElementById('cfg_msg_texto');
    if (titulo) titulo.value = base.titulo;
    if (texto) texto.value = base.mensagem;
    atualizarPreviewMensagemConfiguracao();
    await salvarMensagemConfiguracaoAtual();
}

function inicializarConfiguracaoMensagens() {
    const area = document.getElementById('tela_configuracoes');
    if (area) area.dataset.adminOnly = '1';
    // Phase 4F: não disputa rede no bootstrap. Cada envio e a tela administrativa
    // carregam a configuração atual do Supabase no momento em que realmente precisam dela.
}

document.addEventListener('DOMContentLoaded', inicializarConfiguracaoMensagens);
window.carregarConfiguracoesMensagens = carregarConfiguracoesMensagens;
window.obterMensagemPadraoConfigurada = obterMensagemPadraoConfigurada;
window.abrirConfiguracoesMensagens = abrirConfiguracoesMensagens;
window.selecionarMensagemConfiguracao = selecionarMensagemConfiguracao;
window.salvarMensagemConfiguracaoAtual = salvarMensagemConfiguracaoAtual;
window.restaurarMensagemPadraoAtual = restaurarMensagemPadraoAtual;
window.inserirVariavelMensagem = inserirVariavelMensagem;
window.atualizarPreviewMensagemConfiguracao = atualizarPreviewMensagemConfiguracao;
