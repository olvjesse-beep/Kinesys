if (typeof dicionarioOcupacoesEsportes === 'undefined') {
    console.error("🚨 KineSys: 'database/ocupacoes_esportes.js' não foi carregado corretamente no HTML!");
}

/* ==========================================================================
   FUNÇÃO DE SEGURANÇA: ESCAPE DE HTML (PROTEÇÃO CONTRA XSS)
   ========================================================================== */
function escapeHTML(valor) {
    if (valor === null || valor === undefined) return "";
    return String(valor)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

/* ================= v1.10.4 — PROTEÇÃO GLOBAL CONTRA DUPLO CLIQUE ================= */
const KINESYS_OPERACOES_EM_CURSO = new Set();

async function executarAcaoProtegida(chave, botao, textoOcupado, acao) {
    const chaveFinal = String(chave || 'operacao');
    if (KINESYS_OPERACOES_EM_CURSO.has(chaveFinal)) return null;
    KINESYS_OPERACOES_EM_CURSO.add(chaveFinal);
    const btn = botao && botao.tagName === 'BUTTON' ? botao : (document.activeElement?.tagName === 'BUTTON' ? document.activeElement : null);
    const textoAnterior = btn ? btn.textContent : '';
    if (btn) {
        btn.disabled = true;
        btn.setAttribute('aria-busy', 'true');
        if (textoOcupado) btn.textContent = textoOcupado;
    }
    try {
        return await acao();
    } finally {
        KINESYS_OPERACOES_EM_CURSO.delete(chaveFinal);
        if (btn) {
            btn.disabled = false;
            btn.removeAttribute('aria-busy');
            if (textoOcupado) btn.textContent = textoAnterior;
        }
    }
}

function protegerFuncaoKineSys(nome, chave, seletorBotao = null, textoOcupado = 'Salvando…') {
    const original = window[nome];
    if (typeof original !== 'function' || original.__kinesysProtegida) return;
    const protegida = async function(...args) {
        const chaveFinal = typeof chave === 'function' ? chave(...args) : chave;
        const btn = seletorBotao ? document.querySelector(seletorBotao) : (document.activeElement?.tagName === 'BUTTON' ? document.activeElement : null);
        return executarAcaoProtegida(chaveFinal || nome, btn, textoOcupado, () => original.apply(this, args));
    };
    protegida.__kinesysProtegida = true;
    protegida.__original = original;
    window[nome] = protegida;
}

/* ==========================================================================
   CONTROLE DO MENU DROPDOWN (JS com atraso para melhor usabilidade)
   ========================================================================== */
let menuTimeout = null;

function ajustarAlturaMenuDropdown() {
    const dropdown = document.getElementById('dropdownContent');
    const container = document.getElementById('menuDropdown');
    if (!dropdown || !container) return;

    // No layout lateral o menu já possui uma área flexível com rolagem própria.
    if (document.getElementById('ks_sidebar')?.contains(dropdown)) {
        dropdown.style.removeProperty('max-height');
        dropdown.classList.remove('kds-scroll-contained');
        return;
    }

    const rect = container.getBoundingClientRect();
    const margem = 12;
    const disponivel = Math.max(160, window.innerHeight - rect.bottom - margem);
    dropdown.style.maxHeight = `${disponivel}px`;
    dropdown.classList.add('kds-scroll-contained');
}

function toggleMenu(show) {
    const dropdown = document.getElementById('dropdownContent');
    if (!dropdown) return;
    if (show === undefined) {
        dropdown.classList.toggle('show');
    } else if (show) {
        dropdown.classList.add('show');
    } else {
        dropdown.classList.remove('show');
    }
    if (dropdown.classList.contains('show')) {
        requestAnimationFrame(ajustarAlturaMenuDropdown);
    }
}

function fecharMenu() {
    if (menuTimeout) {
        clearTimeout(menuTimeout);
        menuTimeout = null;
    }
    toggleMenu(false);
}

function abrirMenu() {
    if (menuTimeout) {
        clearTimeout(menuTimeout);
        menuTimeout = null;
    }
    toggleMenu(true);
}

document.addEventListener('DOMContentLoaded', function() {
    const menuToggle = document.getElementById('menuToggle');
    const dropdown = document.getElementById('dropdownContent');
    const container = document.getElementById('menuDropdown');

    if (menuToggle) {
        menuToggle.addEventListener('mouseenter', function() {
            if (menuTimeout) {
                clearTimeout(menuTimeout);
                menuTimeout = null;
            }
            abrirMenu();
        });
        menuToggle.addEventListener('click', function(e) {
            e.stopPropagation();
            toggleMenu();
        });
    }

    if (dropdown) {
        dropdown.addEventListener('mouseenter', function() {
            if (menuTimeout) {
                clearTimeout(menuTimeout);
                menuTimeout = null;
            }
            abrirMenu();
        });
        dropdown.addEventListener('mouseleave', function() {
            if (menuTimeout) clearTimeout(menuTimeout);
            menuTimeout = setTimeout(function() {
                fecharMenu();
            }, 200);
        });
    }

    if (container) {
        container.addEventListener('mouseleave', function(e) {
            if (menuTimeout) clearTimeout(menuTimeout);
            menuTimeout = setTimeout(function() {
                fecharMenu();
            }, 300);
        });
    }

    document.addEventListener('click', function(e) {
        if (container && !container.contains(e.target)) {
            fecharMenu();
        }
    });

    window.addEventListener('resize', function() {
        if (dropdown && dropdown.classList.contains('show')) ajustarAlturaMenuDropdown();
    }, { passive: true });
});

/* ==========================================================================
   KINESYS - SCRIPT DEFINITIVO (ID ÚNICO E SEM DUPLICATAS) - PARTE 1 DE 4
   Auth, SPA, Filtro de Pré-Cadastro e Utilitários
   ========================================================================== */

/* ================= 0. CONEXÃO NUVEM (SUPABASE) ================= */
const SUPABASE_URL = "https://yulkylvkofeisbjwnxhe.supabase.co";
// A chave publishable identifica o projeto e pode existir no navegador. Nunca use
// service_role, senhas administrativas ou qualquer outro segredo no frontend.
const SUPABASE_KEY = "sb_publishable_STAVKxWe_UAlyADqxyQxjQ_c3NP5npE";

const _supabase = (typeof window.supabase !== 'undefined') 
    ? window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY) 
    : null;

/* ================= 1. VARIÁVEIS GLOBAIS E AUTENTICAÇÃO ================= */
let usuarioLogado = null;
let avaliacaoEdicaoId = null;
let evolucaoEdicaoId = null;
let loginPerfisDisponiveis = [];
let loginCredencialChave = '';
let autenticacaoInicializada = false;
let authStateSubscription = null;

function mostrarFeedbackLogin(mensagem = '', tipo = 'info') {
    const el = document.getElementById('login_feedback');
    if (!el) return;
    const tipos = ['erro','sucesso','aviso','info'];
    const tipoVisual = tipos.includes(tipo) ? tipo : 'info';
    el.textContent = String(mensagem || '');
    tipos.forEach(x => el.classList.remove('ks-login-feedback--' + x));
    el.classList.toggle('has-message', !!mensagem);
    if (mensagem) el.classList.add('ks-login-feedback--' + tipoVisual);
    el.style.display = mensagem ? 'block' : 'none';
    el.setAttribute('role', tipo === 'erro' ? 'alert' : 'status');
    el.setAttribute('aria-live', tipo === 'erro' ? 'assertive' : 'polite');
}

function sincronizarEstadoAutenticacaoVisual() {
    const autenticado = !!usuarioLogado;
    const header = document.querySelector('body > header');
    const welcome = document.getElementById('header_welcome');
    const lbl = document.getElementById('lbl_usuario_logado');
    if (header) header.hidden = !autenticado;
    if (welcome) welcome.hidden = !autenticado;
    if (lbl) lbl.textContent = autenticado ? String(usuarioLogado.nome || '') : '';
    document.body.classList.toggle('kinesys-autenticado', autenticado);
}

let pacienteAtualId = null; 
let estadoMapeamento = {};
// Guarda a última lista de alertas do Radar Clínico calculada, para reuso
// no Painel Único de Alertas (Passo 3 da Avaliação) sem duplicar a lógica.
let ultimoRadarAlertas = [];
// Guarda o mapeamento anatômico da avaliação/reavaliação anterior deste
// paciente (se houver), como referência de comparação — não é editado,
// só consultado enquanto a nova avaliação é preenchida.
let mapeamentoAvaliacaoAnterior = null;

function limparSelecaoPerfilLogin() {
    loginPerfisDisponiveis = [];
    loginCredencialChave = '';
    const grp = document.getElementById('login_perfil_group');
    const sel = document.getElementById('login_perfil');
    if (grp) grp.style.display = 'none';
    if (sel) sel.innerHTML = '<option value="">-- Selecione o perfil --</option>';
}

function descreverPerfilLogin(u={}) {
    const tipo = normalizarNivelAcessoEquipe ? normalizarNivelAcessoEquipe(u.tipo) : String(u.tipo || '');
    const funcao = rotuloPerfil(tipo) || tipo || 'Perfil';
    const registro = String(u.registro || '').trim();
    return registro && !['MASTER','SECRETARIA'].includes(tipo) ? `${funcao} · ${registro}` : funcao;
}

let loginEmAndamento = false;

const CAMPOS_PUBLICOS_PERFIL = [
    'id', 'auth_user_id', 'nome', 'email', 'tipo', 'registro', 'conselho',
    'regional', 'numero_registro', 'aparece_na_agenda', 'idade', 'endereco', 'cpf'
].join(',');

function mensagemErroAutenticacao(error) {
    const texto = String(error?.message || '').toLowerCase();
    if (/invalid login credentials|email not confirmed/.test(texto)) {
        return /email not confirmed/.test(texto)
            ? 'Confirme seu e-mail antes de entrar.'
            : 'E-mail ou senha inválidos.';
    }
    if (/failed to fetch|network|fetch/.test(texto)) {
        return 'Não foi possível alcançar o servidor. Verifique a conexão e tente novamente.';
    }
    return 'Não foi possível autenticar agora. Tente novamente.';
}

async function buscarPerfisDoUsuarioAuth(authUser) {
    if (!_supabase || !authUser?.id) return [];
    const { data, error } = await _supabase
        .from('equipe')
        .select(CAMPOS_PUBLICOS_PERFIL)
        .eq('auth_user_id', authUser.id);
    if (error) {
        const detalhe = String(error.message || '');
        if (/auth_user_id|schema cache|column/i.test(detalhe)) {
            throw new Error('A Fase 1 ainda não foi ativada no banco. Execute SUPABASE_SQL/SUPABASE_MIGRACAO_FASE_1_AUTH_v1.12.0.sql.');
        }
        throw error;
    }
    return (data || []).map(perfil => ({
        ...perfil,
        email: String(perfil.email || authUser.email || '').toLowerCase(),
        tipo: normalizarNivelAcessoEquipe(perfil.tipo)
    }));
}

function concluirEntradaComPerfil(perfil) {
    if (!perfil) return false;
    usuarioLogado = { ...perfil };
    persistirSessao(usuarioLogado);
    limparSelecaoPerfilLogin();
    mostrarFeedbackLogin('', 'sucesso');
    liberarAcessoSistema();
    return true;
}

function solicitarEscolhaDePerfil(perfis, authUser) {
    const grp = document.getElementById('login_perfil_group');
    const sel = document.getElementById('login_perfil');
    if (!sel || !grp) throw new Error('Seletor de perfil indisponível.');
    loginPerfisDisponiveis = perfis;
    loginCredencialChave = String(authUser?.id || '');
    sel.innerHTML = '<option value="">-- Selecione o perfil --</option>' + perfis.map((u, idx) =>
        `<option value="${idx}">${escapeHTML(descreverPerfilLogin(u))}</option>`
    ).join('');
    grp.style.display = 'block';
    mostrarFeedbackLogin('Acesso autenticado. Escolha a função que deseja utilizar.', 'sucesso');
    sel.focus();
}

async function carregarAcessoDaSessao(authUser, { navegar = true } = {}) {
    const perfis = await buscarPerfisDoUsuarioAuth(authUser);
    if (!perfis.length) {
        await _supabase.auth.signOut();
        throw new Error('Sua conta foi autenticada, mas não possui um perfil na equipe KineSys. Procure um administrador.');
    }
    if (perfis.length === 1) {
        concluirEntradaComPerfil(perfis[0]);
        return;
    }
    usuarioLogado = null;
    sincronizarEstadoAutenticacaoVisual();
    if (navegar) navegarPara('tela_login');
    solicitarEscolhaDePerfil(perfis, authUser);
}

async function fazerLogin() {
    if (loginEmAndamento) return;

    const campoEmail = document.getElementById('login_email');
    const campoSenha = document.getElementById('login_senha');
    const botaoLogin = document.getElementById('btn_login_entrar');

    // A identidade já foi autenticada; falta apenas escolher uma das funções.
    if (loginPerfisDisponiveis.length && loginCredencialChave) {
        const idx = Number(document.getElementById('login_perfil')?.value);
        if (!Number.isInteger(idx) || !loginPerfisDisponiveis[idx]) {
            mostrarFeedbackLogin('Escolha com qual função deseja entrar.', 'aviso');
            document.getElementById('login_perfil')?.focus();
            return;
        }
        concluirEntradaComPerfil(loginPerfisDisponiveis[idx]);
        return;
    }

    const email = String(campoEmail?.value || '').trim().toLowerCase();
    const senha = String(campoSenha?.value || '');
    if (!email || !senha) {
        mostrarFeedbackLogin('Preencha e-mail e senha para continuar.', 'aviso');
        if (!email) campoEmail?.focus();
        else campoSenha?.focus();
        return;
    }

    loginEmAndamento = true;
    if (botaoLogin) {
        botaoLogin.disabled = true;
        botaoLogin.dataset.textoOriginal = botaoLogin.dataset.textoOriginal || botaoLogin.textContent;
        botaoLogin.textContent = 'Verificando…';
    }
    mostrarFeedbackLogin('Verificando credenciais…', 'info');

    try {
        if (!_supabase) throw new Error('Cliente de autenticação indisponível.');
        const { data, error } = await _supabase.auth.signInWithPassword({ email, password: senha });
        campoSenha.value = '';
        if (error) {
            mostrarFeedbackLogin(mensagemErroAutenticacao(error), 'erro');
            return;
        }
        await carregarAcessoDaSessao(data.user);
    } catch (err) {
        console.error('KineSys: falha de autenticação segura.', err);
        mostrarFeedbackLogin(err?.message || mensagemErroAutenticacao(err), 'erro');
    } finally {
        loginEmAndamento = false;
        if (botaoLogin) {
            botaoLogin.disabled = false;
            botaoLogin.textContent = botaoLogin.dataset.textoOriginal || 'Entrar no KineSys';
        }
    }
}

function persistirSessao(usuario) {
    // Supabase Auth é a única fonte de verdade da sessão. Um perfil salvo no
    // navegador jamais volta a ser aceito como prova de autenticação.
    localStorage.removeItem('kinesys_sessao_logada');
    if (usuario && Object.prototype.hasOwnProperty.call(usuario, 'senha')) delete usuario.senha;
}

/* ================= 1.1 PERMISSÕES POR PERFIL ================= */
const PERMISSOES_POR_PERFIL = {
    // Agenda é operacional: MASTER, fisioterapeutas e secretaria podem acessá-la.
    // Perfis exclusivamente consultivos continuam sem permissão de edição da agenda.
    MASTER:           ['tela_home', 'tela_home_atendimentos', 'tela_home_pendencias', 'tela_home_recentes', 'tela_cadastro', 'tela_avaliacao', 'tela_buscar', 'tela_midias', 'tela_evolucao', 'tela_relatorio', 'tela_agenda', 'tela_financeiro', 'tela_equipe', 'tela_configuracoes'],
    MASTER_FEM:       ['tela_home', 'tela_home_atendimentos', 'tela_home_pendencias', 'tela_home_recentes', 'tela_cadastro', 'tela_avaliacao', 'tela_buscar', 'tela_midias', 'tela_evolucao', 'tela_relatorio', 'tela_agenda', 'tela_financeiro', 'tela_equipe', 'tela_configuracoes'],
    FISIOTERAPEUTA:   ['tela_home', 'tela_home_atendimentos', 'tela_home_pendencias', 'tela_home_recentes', 'tela_cadastro', 'tela_avaliacao', 'tela_buscar', 'tela_midias', 'tela_evolucao', 'tela_relatorio', 'tela_agenda'],
    MEDICO:           ['tela_home', 'tela_home_recentes', 'tela_buscar'],
    EDUCADOR_FISICO:  ['tela_home', 'tela_home_recentes', 'tela_buscar'],
    // Secretaria pode acessar mídias administrativas (termos/documentos), Agenda e Financeiro.
    SECRETARIA:       ['tela_home', 'tela_cadastro', 'tela_home_atendimentos', 'tela_home_recentes', 'tela_buscar', 'tela_midias', 'tela_agenda', 'tela_financeiro'],
    // Compatibilidade com registros antigos da v1.x.
    PROFISSIONAL:     ['tela_home', 'tela_home_atendimentos', 'tela_home_pendencias', 'tela_home_recentes', 'tela_cadastro', 'tela_avaliacao', 'tela_buscar', 'tela_midias', 'tela_evolucao', 'tela_relatorio', 'tela_agenda']
};

function perfilDoUsuario() {
    return (usuarioLogado && usuarioLogado.tipo) ? usuarioLogado.tipo : null;
}
function usuarioEhMaster(usuario = usuarioLogado) {
    return !!usuario && ['MASTER','MASTER_FEM'].includes(String(usuario.tipo || '').toUpperCase());
}

function telaPermitida(idTela) {
    if (idTela === 'tela_login') return true;
    const perfil = perfilDoUsuario();
    if (!perfil) return false;
    const permitido = PERMISSOES_POR_PERFIL[perfil] || PERMISSOES_POR_PERFIL['SECRETARIA'];
    return permitido.includes(idTela);
}

function atualizarVisibilidadeAgenda() {
    const podeUsarAgenda = !!usuarioLogado && telaPermitida('tela_agenda');
    const menuAgenda = document.getElementById('menu_agenda');
    if (menuAgenda) menuAgenda.style.display = podeUsarAgenda ? 'block' : 'none';
}

function atualizarAcoesCadastroPorPerfil() {
    // O cadastro é administrativo, mas iniciar uma avaliação é uma ação clínica.
    // Perfis sem acesso à Avaliação (ex.: SECRETARIA) veem somente "Salvar cadastro".
    const btnSalvar = document.getElementById('btn_salvar_cadastro');
    const btnAvaliar = document.getElementById('btn_salvar_iniciar_avaliacao');
    const podeAvaliar = !!usuarioLogado && telaPermitida('tela_avaliacao');

    if (btnSalvar) {
        btnSalvar.style.display = '';
        btnSalvar.textContent = pacienteAtualId ? 'Salvar alterações' : 'Salvar cadastro';
    }
    if (btnAvaliar) {
        btnAvaliar.style.display = podeAvaliar ? '' : 'none';
        btnAvaliar.hidden = !podeAvaliar;
        btnAvaliar.setAttribute('aria-hidden', podeAvaliar ? 'false' : 'true');
    }
}

function atualizarVisibilidadeOperacional() {
    atualizarVisibilidadeAgenda();
    atualizarAcoesCadastroPorPerfil();
    const podeMidias = !!usuarioLogado && telaPermitida('tela_midias');
    const menuMidias = document.getElementById('menu_midias');
    if (menuMidias) menuMidias.style.display = podeMidias ? 'block' : 'none';
    const podeFinanceiro = !!usuarioLogado && telaPermitida('tela_financeiro');
    const menuFinanceiro = document.getElementById('menu_financeiro');
    if (menuFinanceiro) menuFinanceiro.style.display = podeFinanceiro ? 'block' : 'none';

    // O menu também respeita o perfil. Evita exibir opções que apenas gerariam
    // o alerta "seu perfil não tem acesso" ao serem clicadas.
    document.querySelectorAll('#dropdownContent [data-tela-menu]').forEach(item => {
        const alvo = item.dataset.telaMenu;
        item.style.display = telaPermitida(alvo) ? 'block' : 'none';
    });
}

function liberarAcessoSistema() {
    if (!usuarioLogado) {
        sincronizarEstadoAutenticacaoVisual();
        navegarPara('tela_login');
        return;
    }
    sincronizarEstadoAutenticacaoVisual();
    const lblUsuario = document.getElementById('lbl_usuario_logado');
    if (lblUsuario) {
        lblUsuario.innerText = usuarioLogado.nome;
    }

    const menuEquipe = document.getElementById('menu_equipe');
    if (menuEquipe) {
        menuEquipe.style.display = usuarioEhMaster() ? 'block' : 'none';
    }

    atualizarVisibilidadeOperacional();
    document.querySelectorAll('.btn-nav').forEach(btn => btn.style.display = 'none');

    atualizarSelectsPacientes();
    popularSelectCRM();
    navegarPara('tela_home');
    if (typeof iniciarNotificacoesAgenda === 'function') setTimeout(() => iniciarNotificacoesAgenda(), 0);
}

function rotuloPerfil(tipo) {
    if (tipo === 'MASTER') return 'Administrador';
    if (tipo === 'MASTER_FEM') return 'Administrador';
    if (tipo === 'FISIOTERAPEUTA' || tipo === 'PROFISSIONAL') return 'Fisioterapeuta';
    if (tipo === 'MEDICO') return 'Médico';
    if (tipo === 'EDUCADOR_FISICO') return 'Profissional de Educação Física';
    if (tipo === 'SECRETARIA') return 'Secretaria';
    return tipo || '';
}

async function fazerLogout() {
    if (typeof pararNotificacoesAgenda === 'function') pararNotificacoesAgenda();
    if (_supabase) {
        try {
            const { error } = await _supabase.auth.signOut();
            if (error) throw error;
        } catch (err) {
            console.error('KineSys: não foi possível encerrar a sessão no servidor.', err);
        }
    }
    limparSelecaoPerfilLogin();
    usuarioLogado = null;
    pacienteAtualId = null;
    localStorage.removeItem('kinesys_sessao_logada');
    mostrarFeedbackLogin('', 'info');
    sincronizarEstadoAutenticacaoVisual();
    const menuAgenda = document.getElementById('menu_agenda');
    const menuMidias = document.getElementById('menu_midias');
    const menuFinanceiro = document.getElementById('menu_financeiro');
    const menuEquipe = document.getElementById('menu_equipe');
    if (menuAgenda) menuAgenda.style.display = 'none';
    if (menuMidias) menuMidias.style.display = 'none';
    if (menuFinanceiro) menuFinanceiro.style.display = 'none';
    if (menuEquipe) menuEquipe.style.display = 'none';
    document.getElementById('login_email').value = "";
    document.getElementById('login_senha').value = "";
    fecharMenu();
    navegarPara('tela_login');
}

async function enviarRedefinicaoSenha() {
    const email = String(document.getElementById('login_email')?.value || '').trim().toLowerCase();
    if (!email) {
        mostrarFeedbackLogin('Informe seu e-mail para solicitar a redefinição de senha.', 'aviso');
        document.getElementById('login_email')?.focus();
        return;
    }
    if (!_supabase) {
        mostrarFeedbackLogin('Serviço de autenticação indisponível.', 'erro');
        return;
    }
    try {
        const { error } = await _supabase.auth.resetPasswordForEmail(email);
        if (error) throw error;
        mostrarFeedbackLogin('Se a conta existir, você receberá as instruções de redefinição por e-mail.', 'sucesso');
    } catch (err) {
        console.error('KineSys: falha ao solicitar redefinição de senha.', err);
        mostrarFeedbackLogin('Não foi possível solicitar a redefinição agora.', 'erro');
    }
}

/* ================= 2. NAVEGAÇÃO SPA INTELIGENTE ================= */
function navegarPara(idTela, contextoEdicao = false) {
    if (!usuarioLogado && idTela !== 'tela_login') idTela = 'tela_login';

    if (usuarioLogado && !telaPermitida(idTela)) {
        alert('🔒 Seu perfil (' + rotuloPerfil(usuarioLogado.tipo) + ') não tem acesso a esta tela.');
        idTela = 'tela_home';
    }

    document.querySelectorAll('.tela').forEach(tela => tela.classList.remove('ativa'));
    document.querySelectorAll('.btn-nav').forEach(btn => btn.classList.remove('active'));

    const telaAlvo = document.getElementById(idTela);
    if (telaAlvo) telaAlvo.classList.add('ativa');

    // Item 11B: o Radar pertence ao ciclo de vida da Avaliação.
    // Ao sair da tela, o painel é fechado e o componente perde o estado de contexto imediatamente.
    if (idTela !== 'tela_avaliacao' && typeof fecharRadarKineSys === 'function') fecharRadarKineSys(true);
    const radarDock = document.getElementById('radar_flutuante_container');
    if (radarDock) radarDock.classList.toggle('radar-contexto-avaliacao', idTela === 'tela_avaliacao');

    if (idTela === 'tela_cadastro') {
        atualizarAcoesCadastroPorPerfil();
    }

    if (idTela === 'tela_cadastro' && !contextoEdicao) {
        pacienteAtualId = null; 
        if (document.getElementById('titulo_tela_cadastro')) document.getElementById('titulo_tela_cadastro').innerText = "Cadastro Geral do Paciente";
        ['cad_nome','cad_cpf','cad_nascimento','cad_idade','cad_sexo','cad_estado_civil','cad_telefone','cad_profissao','cad_responsavel_nome','cad_responsavel_parentesco','cad_responsavel_telefone','cad_cep','cad_endereco'].forEach(id => {
            if(document.getElementById(id)) document.getElementById(id).value = "";
        });
        const cadDependente = document.getElementById('cad_dependente');
        if (cadDependente) cadDependente.checked = false;
        if (typeof alternarCamposResponsavel === 'function') alternarCamposResponsavel();
    }

    if (idTela === 'tela_avaliacao' && !contextoEdicao) {
        pacienteAtualId = null; 
        if(document.getElementById('select_paciente_precadastro')) document.getElementById('select_paciente_precadastro').value = "";
        if(document.getElementById('busca_paciente_precadastro')) document.getElementById('busca_paciente_precadastro').value = "";
        fecharBuscaPacientesPreCadastro();
        if(document.getElementById('paciente_nome')) document.getElementById('paciente_nome').value = "";
        if(document.getElementById('paciente_idade')) document.getElementById('paciente_idade').value = "";
        if(document.getElementById('paciente_ocupacao')) document.getElementById('paciente_ocupacao').value = "";
        if(document.getElementById('paciente_esporte')) document.getElementById('paciente_esporte').value = "";
        if(document.getElementById('paciente_hma')) document.getElementById('paciente_hma').value = "";
        if(document.getElementById('tags_cirurgias')) document.getElementById('tags_cirurgias').innerHTML = "";
        if(document.getElementById('tags_medicamentos')) document.getElementById('tags_medicamentos').innerHTML = "";
        
        ['chk_tabagista','chk_etilista','chk_hipertenso','chk_diabetico','chk_corticoide','chk_cirurgia'].forEach(id => {
            if(document.getElementById(id)) document.getElementById(id).checked = false;
        });
        if(document.getElementById('bloco_cirurgias')) document.getElementById('bloco_cirurgias').style.display = 'none';
        if (document.getElementById('eva_slider')) {
            document.getElementById('eva_slider').value = 0;
            document.getElementById('eva_slider').dispatchEvent(new Event('input'));
        }
        estadoMapeamento = {};
        mapeamentoAvaliacaoAnterior = null;
        if (document.getElementById('grupo_regioes_mapeamento')) document.getElementById('grupo_regioes_mapeamento').innerHTML = "";
        if (document.getElementById('container_clusters_regioes')) document.getElementById('container_clusters_regioes').innerHTML = "";
        avaliacaoEdicaoId = null;
        const realizadoAvaliacao = document.getElementById('avaliacao_realizado_em');
        if (realizadoAvaliacao) { realizadoAvaliacao.disabled = false; realizadoAvaliacao.value = valorDatetimeLocalAgora(); }
        const metaAvaliacao = document.getElementById('avaliacao_registros_paciente');
        if (metaAvaliacao) { metaAvaliacao.style.display='none'; metaAvaliacao.innerHTML=''; }
        const btnSalvarRapido = document.getElementById('btn_salvar_avaliacao_rapida');
        if (btnSalvarRapido) btnSalvarRapido.innerText = '💾 Salvar Avaliação';
        irParaSubtela('subtela_triagem');
    }

    if (idTela === 'tela_home') {
        renderizarPacientesRecentesHome();
        popularSelectCRM();
        renderizarPendenciasClinicas();
    }
    if (idTela === 'tela_buscar') renderizarTabelaProntuarios();
    if (idTela === 'tela_evolucao') {
        atualizarSelectsPacientes();
        if (!evolucaoEdicaoId) {
            const realizadoEvo = document.getElementById('evo_realizado_em');
            if (realizadoEvo && !realizadoEvo.value) realizadoEvo.value = valorDatetimeLocalAgora();
            const dataEvo = document.getElementById('evo_data');
            if (dataEvo && !dataEvo.value) dataEvo.value = valorDatetimeLocalAgora().slice(0,10);
        }
    }
    if (idTela === 'tela_relatorio') {
        atualizarSelectsPacientes();
        document.getElementById('preview_relatorio_container').style.display = 'none';
        onTipoDocumentoChange(); // garante que o bloco certo (Comparecimento/IA) apareça já na entrada da tela
    }
    if (idTela === 'tela_equipe') carregarListaEquipe();
    if (idTela === 'tela_agenda') {
        if (typeof inicializarAgenda === 'function') {
            Promise.resolve(inicializarAgenda()).catch(err => {
                console.error('KineSys Agenda: falha ao inicializar módulo.', err);
                const linha = document.getElementById('agenda_linha_tempo');
                if (linha) linha.innerHTML = '<div class="agenda-vazio">Não foi possível carregar a agenda. Verifique a conexão com o Supabase e se o complemento da agenda foi aplicado.</div>';
            });
        } else {
            console.error('KineSys Agenda: agenda.js não foi carregado.');
        }
    }
    if (idTela === 'tela_midias') {
        if (typeof configurarMidiasPorPerfil === 'function') configurarMidiasPorPerfil();
        const midiaPacienteId = typeof obterPacienteIdMidiasAtivo === 'function' ? obterPacienteIdMidiasAtivo() : (pacienteAtualId || '');
        if (typeof popularSelectMidiasPaciente === 'function') {
            Promise.resolve(popularSelectMidiasPaciente(midiaPacienteId)).then(() => {
                if (typeof sincronizarPacienteMidias === 'function') return sincronizarPacienteMidias(false);
            }).catch(err => console.warn('KineSys Documentos: não foi possível sincronizar o paciente ativo.', err));
        }
        if (typeof verificarKinesysLocal === 'function') verificarKinesysLocal(false);
    }
    if (idTela === 'tela_financeiro') {
        if (typeof inicializarFinanceiro === 'function') {
            Promise.resolve(inicializarFinanceiro(pacienteAtualId || '')).catch(err => console.error('KineSys Financeiro:', err));
        }
    }
    if (idTela === 'tela_avaliacao') {
        atualizarSelectPacientesPreCadastro();
        processarRadarEmTempoReal();
        // O rascunho só é oferecido quando o usuário realmente entra na
        // Avaliação. Nunca durante o login/inicialização da aplicação.
        if (!contextoEdicao) setTimeout(() => restaurarRascunhoKineSys().catch(err => console.warn('Rascunho KineSys:', err)), 120);
    }
}

/* ================= 3. IDADE E FILTRO DE 2 HORAS ================= */
function calcularIdadeCadastro() {
    const campoData = document.getElementById('cad_nascimento');
    const campoIdade = document.getElementById('cad_idade');
    if (!campoData || !campoIdade) return;
    
    const dataNasc = campoData.value;
    if (!dataNasc) { campoIdade.value = ""; return; }

    const hoje = new Date();
    const nasc = new Date(dataNasc);
    let idade = hoje.getFullYear() - nasc.getFullYear();
    const m = hoje.getMonth() - nasc.getMonth();

    if (m < 0 || (m === 0 && hoje.getDate() < nasc.getDate())) idade--;
    campoIdade.value = idade >= 0 ? idade + " anos" : "";

    // Menores de 18 anos entram automaticamente como dependentes.
    // Adultos continuam podendo ser marcados manualmente como dependentes/cuidadores.
    const chkDependente = document.getElementById('cad_dependente');
    if (chkDependente && idade >= 0 && idade < 18) {
        chkDependente.checked = true;
        if (typeof alternarCamposResponsavel === 'function') alternarCamposResponsavel();
    }
}

function removerAcentos(str) {
    if (!str) return "";
    return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function obterTextoExibicao(item) {
    if (!item) return "";
    return typeof item === 'object' && item.exibicao ? item.exibicao : item;
}

let exibindoTodosPreCadastros = true;
async function alternarFiltroPreCadastro() {
    exibindoTodosPreCadastros = !exibindoTodosPreCadastros;
    const botao = document.getElementById('btn_filtro_precadastro');
    if (botao) botao.textContent = exibindoTodosPreCadastros ? 'Somente recentes' : 'Buscar em todos';
    await atualizarSelectPacientesPreCadastro();
    filtrarPacientesPreCadastro();
}

function fecharBuscaPacientesPreCadastro() {
    const resultados = document.getElementById('resultados_busca_precadastro');
    const busca = document.getElementById('busca_paciente_precadastro');
    if (resultados) resultados.hidden = true;
    if (busca) busca.setAttribute('aria-expanded', 'false');
}

function sincronizarBuscaPacientePreCadastro() {
    const select = document.getElementById('select_paciente_precadastro');
    const busca = document.getElementById('busca_paciente_precadastro');
    const status = document.getElementById('status_busca_precadastro');
    if (!select || !busca) return;
    const opt = select.value ? select.options[select.selectedIndex] : null;
    if (opt) {
        busca.value = opt.dataset.nome || '';
        if (status) status.textContent = 'Paciente selecionado. Nome, idade e profissão foram carregados.';
    }
    fecharBuscaPacientesPreCadastro();
}

function selecionarPacienteBuscaPreCadastro(pacienteId) {
    const select = document.getElementById('select_paciente_precadastro');
    if (!select || ![...select.options].some(opt => opt.value === String(pacienteId))) return;
    select.value = String(pacienteId);
    sincronizarBuscaPacientePreCadastro();
    select.dispatchEvent(new Event('change', { bubbles: true }));
}

function filtrarPacientesPreCadastro() {
    const busca = document.getElementById('busca_paciente_precadastro');
    const select = document.getElementById('select_paciente_precadastro');
    const resultados = document.getElementById('resultados_busca_precadastro');
    const status = document.getElementById('status_busca_precadastro');
    if (!busca || !select || !resultados || !status) return;
    const termo = removerAcentos(busca.value.trim());
    resultados.replaceChildren();
    if (!termo) {
        fecharBuscaPacientesPreCadastro();
        status.textContent = exibindoTodosPreCadastros
            ? 'Digite o nome para buscar em todos os pacientes cadastrados.'
            : 'Digite o nome para buscar nos pré-cadastros das últimas 2 horas.';
        return;
    }
    const encontrados = [...select.options].filter(opt => opt.value && removerAcentos(opt.dataset.nome || '').includes(termo));
    encontrados.slice(0, 8).forEach((opt, indice) => {
        const botao = document.createElement('button');
        botao.type = 'button';
        botao.className = 'paciente-busca-opcao';
        botao.setAttribute('role', 'option');
        botao.setAttribute('aria-selected', String(opt.value === select.value));
        const nome = document.createElement('strong');
        nome.textContent = opt.dataset.nome || 'Paciente';
        const detalhe = document.createElement('span');
        detalhe.textContent = [opt.dataset.idade ? `${opt.dataset.idade} anos` : 'Idade não informada', opt.dataset.profissao || '', opt.dataset.cadastro || ''].filter(Boolean).join(' · ');
        botao.append(nome, detalhe);
        botao.addEventListener('click', () => selecionarPacienteBuscaPreCadastro(opt.value));
        botao.addEventListener('keydown', event => {
            const botoes = [...resultados.querySelectorAll('button')];
            if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
                event.preventDefault();
                const destino = indice + (event.key === 'ArrowDown' ? 1 : -1);
                if (destino < 0) busca.focus();
                else botoes[Math.min(destino, botoes.length - 1)]?.focus();
            } else if (event.key === 'Escape') {
                fecharBuscaPacientesPreCadastro();
                busca.focus();
                event.preventDefault();
            }
        });
        resultados.appendChild(botao);
    });
    resultados.hidden = encontrados.length === 0;
    busca.setAttribute('aria-expanded', String(encontrados.length > 0));
    status.textContent = encontrados.length
        ? `${encontrados.length} paciente(s) encontrado(s). ${encontrados.length > 8 ? 'Mostrando os 8 primeiros; refine o nome. ' : ''}Selecione o paciente para carregar os dados.`
        : `Nenhum paciente encontrado${exibindoTodosPreCadastros ? '.' : ' neste filtro. Use “Buscar em todos”.'}`;
}

function navegarBuscaPacientesPreCadastro(event) {
    const resultados = document.getElementById('resultados_busca_precadastro');
    if (event.key === 'Escape') { fecharBuscaPacientesPreCadastro(); return; }
    if (!resultados || resultados.hidden) return;
    const primeiro = resultados.querySelector('button');
    if (event.key === 'ArrowDown') { event.preventDefault(); primeiro?.focus(); }
    if (event.key === 'Enter') { event.preventDefault(); primeiro?.click(); }
}

async function atualizarSelectPacientesPreCadastro() {
    const select = document.getElementById('select_paciente_precadastro');
    if (!select) return;

    const lista = await obterPacientesSalvos();
    let options = `<option value="">-- Selecione para carregar os dados automaticamente --</option>`;
    const agora = new Date().getTime();

    // O prontuário ativo precisa SEMPRE existir neste seletor, mesmo quando o
    // paciente já tem avaliação anterior ou foi cadastrado há mais de 2 horas.
    // Caso contrário, o contexto global mostra o paciente selecionado, porém a
    // tela de Avaliação não consegue carregar seus dados para uma reavaliação.
    let contextoPacienteId = '';
    try { contextoPacienteId = String(localStorage.getItem('kinesys_paciente_contexto') || '').trim(); } catch (_) {}
    contextoPacienteId = contextoPacienteId || String(pacienteAtualId || '').trim();

    lista.forEach(p => {
        const ehPacienteAtivo = !!contextoPacienteId && String(p.id) === String(contextoPacienteId);

        // Para a fila normal de pré-cadastro mantemos as regras antigas.
        // A única exceção é o paciente atualmente aberto no prontuário.
        if (!ehPacienteAtivo && !exibindoTodosPreCadastros) {
            if (p.avaliacoes && p.avaliacoes.length > 0) return;
            if (p.avaliacao && p.avaliacao.hma) return;
        }

        let mostrar = true;
        if (!ehPacienteAtivo && !exibindoTodosPreCadastros && p.timestampCadastro) {
            const diffHoras = (agora - p.timestampCadastro) / (1000 * 60 * 60);
            if (diffHoras > 2) mostrar = false;
        }
        if (mostrar) {
            const idadeNumero = idadeNumericaPaciente(p);
            const idadeRotulo = idadeNumero ? `${idadeNumero} anos` : 'Idade N/I';
            const sufixoAtivo = ehPacienteAtivo ? ' · Prontuário ativo' : '';
            options += `<option value="${escapeHTML(p.id)}" data-idade="${escapeHTML(idadeNumero)}" data-nascimento="${escapeHTML(p.nascimento || '')}" data-nome="${escapeHTML(p.nome || '')}" data-profissao="${escapeHTML(p.profissao || '')}" data-cadastro="${escapeHTML(p.dataCadastro || '')}">${escapeHTML(p.nome)} (${escapeHTML(idadeRotulo)})${sufixoAtivo} - Atendente: ${escapeHTML(p.cadastradoPor || 'N/I')}</option>`;
        }
    });
    select.innerHTML = options;

    if (contextoPacienteId && [...select.options].some(o => String(o.value) === String(contextoPacienteId))) {
        select.value = contextoPacienteId;
        sincronizarBuscaPacientePreCadastro();
    }
}

async function carregarPacientePreCadastradoNaAvaliacao() {
    const select = document.getElementById('select_paciente_precadastro');
    if (!select) return;
    cargasPacienteAvaliacaoKineSys++;
    try {

    let contextoPacienteId = '';
    try { contextoPacienteId = String(localStorage.getItem('kinesys_paciente_contexto') || '').trim(); } catch (_) {}
    const pacienteIdAlvo = String(select.value || contextoPacienteId || pacienteAtualId || '').trim();
    if (!pacienteIdAlvo) {
        pacienteAtualId = null;
        return;
    }

    // Se o paciente veio do contexto global, sincroniza o select quando a opção
    // já estiver disponível. A carga dos dados não depende mais exclusivamente
    // deste <select>, portanto funciona também durante a inicialização assíncrona.
    if (!select.value && [...select.options].some(o => String(o.value) === pacienteIdAlvo)) {
        select.value = pacienteIdAlvo;
    }

    // v1.8.5+ — Preenchimento imediato a partir do próprio <option> quando
    // disponível, seguido de consulta ao prontuário como fonte definitiva.
    const opt = select.value ? select.options[select.selectedIndex] : null;
    const campoNome = document.getElementById('paciente_nome');
    const campoIdade = document.getElementById('paciente_idade');
    const campoOcupacao = document.getElementById('paciente_ocupacao');

    const idadeOption = String(opt?.dataset?.idade || '').replace(/\D/g, '');
    if (campoNome && opt?.dataset?.nome) campoNome.value = opt.dataset.nome;
    if (campoIdade && idadeOption) {
        campoIdade.value = idadeOption;
        campoIdade.dispatchEvent(new Event('input', { bubbles: true }));
        campoIdade.dispatchEvent(new Event('change', { bubbles: true }));
    }
    if (campoOcupacao && opt?.dataset?.profissao) campoOcupacao.value = opt.dataset.profissao;

    pacienteAtualId = pacienteIdAlvo;

    // Reconsulta para trazer o prontuário completo. Se a nuvem estiver lenta ou indisponível,
    // os dados essenciais acima já permanecerão preenchidos na avaliação.
    try {
        const lista = await obterPacientesSalvos();
        const p = lista.find(item => String(item.id) === String(pacienteIdAlvo));
        if (p) {
            if (campoNome) campoNome.value = p.nome || opt?.dataset?.nome || '';
            const idadePaciente = idadeNumericaPaciente(p) || idadeOption;
            if (campoIdade && idadePaciente) {
                campoIdade.value = String(idadePaciente).replace(/\D/g, '');
                campoIdade.dispatchEvent(new Event('input', { bubbles: true }));
                campoIdade.dispatchEvent(new Event('change', { bubbles: true }));
            }
            if (campoOcupacao) campoOcupacao.value = p.profissao || opt?.dataset?.profissao || '';
        }
    } catch (err) {
        console.warn('KineSys: prontuário completo não pôde ser recarregado; mantendo dados do pré-cadastro.', err);
    }

    sincronizarBuscaPacientePreCadastro();
    processarRadarEmTempoReal();
    } finally {
        cargasPacienteAvaliacaoKineSys--;
    }
}

/* ==========================================================================
   KINESYS - SCRIPT DEFINITIVO (ID ÚNICO E SEM DUPLICATAS) - PARTE 2 DE 4
   Gestão de Equipe, EVA e Autocompletes (Extensos e Originais)
   ========================================================================== */

/* ================= 4. GESTÃO DE EQUIPE ================= */
function perfilPorConselho(tipoRegistro) {
    // Compatibilidade com cadastros antigos. O nível de acesso agora é separado
    // da profissão/registro, mas esta função continua sendo usada como sugestão padrão.
    if (tipoRegistro === 'MASTER' || tipoRegistro === 'MASTER_FEM') return 'MASTER';
    if (tipoRegistro === 'SECRETARIA') return 'SECRETARIA';
    if (tipoRegistro === 'CREFITO') return 'FISIOTERAPEUTA';
    if (tipoRegistro === 'CRM') return 'MEDICO';
    if (tipoRegistro === 'CREF') return 'EDUCADOR_FISICO';
    return 'SECRETARIA';
}

function normalizarNivelAcessoEquipe(tipo) {
    const t = String(tipo || '').toUpperCase();
    if (['MASTER','MASTER_FEM'].includes(t)) return 'MASTER';
    if (t === 'PROFISSIONAL') return 'FISIOTERAPEUTA';
    if (['FISIOTERAPEUTA','SECRETARIA','MEDICO','EDUCADOR_FISICO'].includes(t)) return t;
    return 'SECRETARIA';
}

function conselhoFuncionarioEquipe(f = {}) {
    const conselho = String(f.conselho || '').toUpperCase();
    if (['CREFITO','CRM','CREF','CRO','CRP','SECRETARIA'].includes(conselho)) return conselho;
    const registro = String(f.registro || '').toUpperCase();
    if (registro.startsWith('CREFITO')) return 'CREFITO';
    if (registro.startsWith('CRM')) return 'CRM';
    if (registro.startsWith('CREF')) return 'CREF';
    if (registro.startsWith('CRO')) return 'CRO';
    if (registro.startsWith('CRP')) return 'CRP';
    const tipo = normalizarNivelAcessoEquipe(f.tipo);
    if (tipo === 'FISIOTERAPEUTA') return 'CREFITO';
    if (tipo === 'MEDICO') return 'CRM';
    if (tipo === 'EDUCADOR_FISICO') return 'CREF';
    return 'SECRETARIA';
}

function normalizarIdentificador(v) { return removerAcentos(String(v || '')).replace(/\s+/g, '').trim(); }
function somenteDigitosEquipe(v) { return String(v || '').replace(/\D/g, ''); }

function formatarRegistroProfissional(tipoRegistro, regional, numero) {
    const n = String(numero || '').trim().replace(/^\s*(CREFITO|CRM|CRO|CRP|CREF)(?:-?\w+)?\s*/i, '').trim();
    if (['MASTER','MASTER_FEM','SECRETARIA'].includes(tipoRegistro)) return '';
    const reg = String(regional || '').trim().toUpperCase();
    if (tipoRegistro === 'CREFITO') {
        const regionalNum = reg.replace(/\D/g, '');
        return `CREFITO${regionalNum ? '-' + regionalNum : ''} ${n}`.trim();
    }
    if (['CRM','CRO','CRP','CREF'].includes(tipoRegistro)) {
        return `${tipoRegistro}${reg ? '-' + reg : ''} ${n}`.trim();
    }
    return `${tipoRegistro} ${n}`.trim();
}

function atualizarAjudaNivelAcesso() {
    const select = document.getElementById('eq_nivel_acesso');
    const ajuda = document.getElementById('eq_nivel_acesso_ajuda');
    if (!select || !ajuda) return;
    const textos = {
        MASTER: 'Acesso total: pacientes, área clínica, agenda, documentos, financeiro, equipe e configurações administrativas.',
        SECRETARIA: 'Acesso administrativo: cadastro de pacientes, agenda, documentos administrativos e planos/pagamentos.',
        FISIOTERAPEUTA: 'Acesso clínico: avaliação, evolução, documentos clínicos, pacientes e agenda.',
        MEDICO: 'Acesso consultivo aos prontuários permitidos ao perfil médico.',
        EDUCADOR_FISICO: 'Acesso consultivo aos prontuários permitidos ao perfil de Educação Física.'
    };
    ajuda.textContent = textos[select.value] || '';
}

function sugerirNivelAcessoPorRegistro(forcar = false) {
    const editId = document.getElementById('eq_edit_id')?.value || '';
    if (editId && !forcar) return; // Em edição, mudar profissão não deve rebaixar/promover o acesso sozinho.
    const tipoRegistro = document.getElementById('eq_tipo_registro')?.value || 'SECRETARIA';
    const nivel = document.getElementById('eq_nivel_acesso');
    if (nivel) nivel.value = perfilPorConselho(tipoRegistro);
    atualizarAjudaNivelAcesso();
}

function alternarCampoRegistroProfissional() {
    const tipo = document.getElementById('eq_tipo_registro')?.value || 'SECRETARIA';
    const semRegistro = ['SECRETARIA','MASTER','MASTER_FEM'].includes(tipo);
    const grpNumero = document.getElementById('grp_eq_num_registro');
    if (grpNumero) grpNumero.style.display = semRegistro ? 'none' : 'flex';
    const grpRegional = document.getElementById('grp_eq_regional');
    if (grpRegional) grpRegional.style.display = semRegistro ? 'none' : 'flex';
    const lbl = document.getElementById('lbl_eq_regional');
    const input = document.getElementById('eq_regional');
    if (lbl && input) {
        if (tipo === 'CREFITO') { lbl.textContent = 'Regional do CREFITO'; input.placeholder = 'Ex: 4'; }
        else { lbl.textContent = 'UF / Regional do Conselho'; input.placeholder = 'Ex: MG'; }
    }
}

async function verificarDuplicidadeFuncionario({email, cpf, registro, nivelAcesso, excluirId = ''}) {
    if (!_supabase) throw new Error('Servidor indisponível: não é possível validar/cadastrar equipe offline.');
    const { data, error } = await _supabase.from('equipe').select('id,nome,email,cpf,registro,tipo');
    if (error) throw error;
    const e = String(email || '').trim().toLowerCase();
    const c = somenteDigitosEquipe(cpf);
    const r = normalizarIdentificador(registro);
    const nivel = normalizarNivelAcessoEquipe(nivelAcesso || '');

    // CPF/e-mail/registro podem se repetir quando representam FUNÇÕES diferentes.
    // O bloqueio permanece somente para duplicidade do mesmo perfil de acesso.
    const mesmoPerfil = (f) => normalizarNivelAcessoEquipe(f.tipo) === nivel;
    const duplicado = (data || []).find(f => String(f.id) !== String(excluirId || '') && mesmoPerfil(f) && (
        (e && String(f.email || '').trim().toLowerCase() === e) ||
        (c && somenteDigitosEquipe(f.cpf) === c) ||
        (r && normalizarIdentificador(f.registro) === r)
    ));
    if (!duplicado) return null;
    let campo = 'dados profissionais';
    if (e && String(duplicado.email || '').trim().toLowerCase() === e) campo = 'e-mail';
    else if (c && somenteDigitosEquipe(duplicado.cpf) === c) campo = 'CPF';
    else if (r && normalizarIdentificador(duplicado.registro) === r) campo = 'registro profissional';
    return { funcionario: duplicado, campo, nivel };
}

function funcionarioPodeAparecerNaAgenda(f) {
    if (!f) return false;
    if (typeof f.aparece_na_agenda === 'boolean') return f.aparece_na_agenda;
    // Compatibilidade temporária com bancos que ainda não executaram a migration.
    // Mantém o comportamento legado apenas até a coluna ser criada.
    return !['SECRETARIA'].includes(normalizarNivelAcessoEquipe(f.tipo));
}

function limparFormularioEquipe() {
    const ids = ['eq_edit_id','eq_nome','eq_email','eq_cpf','eq_regional','eq_num_registro','eq_idade','eq_endereco'];
    ids.forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
    const tipoRegistro = document.getElementById('eq_tipo_registro');
    if (tipoRegistro) tipoRegistro.value = 'CREFITO';
    const nivel = document.getElementById('eq_nivel_acesso');
    if (nivel) nivel.value = 'FISIOTERAPEUTA';
    const agendaAssistencial = document.getElementById('eq_aparece_na_agenda');
    if (agendaAssistencial) agendaAssistencial.checked = false;
    const btn = document.getElementById('eq_btn_salvar');
    if (btn) btn.textContent = 'Salvar usuário';
    limparEstadoCampo('eq_cpf');
    alternarCampoRegistroProfissional();
    atualizarAjudaNivelAcesso();
}

async function abrirEdicaoFuncionario(id) {
    if (!usuarioEhMaster()) { alert('Apenas Administrador pode editar a equipe.'); return; }
    if (!_supabase) { alert('⚠️ Servidor indisponível. A equipe não pode ser editada offline.'); return; }
    try {
        const { data, error } = await _supabase.from('equipe').select(CAMPOS_PUBLICOS_PERFIL).eq('id', id).limit(1);
        if (error) throw error;
        const f = data && data[0];
        if (!f) { alert('⚠️ Funcionário não encontrado.'); return; }
        const set = (elId, value) => { const el = document.getElementById(elId); if (el) el.value = value ?? ''; };
        set('eq_edit_id', f.id);
        set('eq_nome', f.nome);
        set('eq_email', f.email);
        set('eq_cpf', f.cpf);
        set('eq_tipo_registro', conselhoFuncionarioEquipe(f));
        set('eq_regional', f.regional);
        set('eq_num_registro', f.numero_registro);
        set('eq_nivel_acesso', normalizarNivelAcessoEquipe(f.tipo));
        const agendaAssistencial = document.getElementById('eq_aparece_na_agenda');
        if (agendaAssistencial) agendaAssistencial.checked = funcionarioPodeAparecerNaAgenda(f);
        set('eq_idade', f.idade);
        set('eq_endereco', f.endereco);
        const btn = document.getElementById('eq_btn_salvar');
        if (btn) btn.textContent = 'Salvar alterações';
        alternarCampoRegistroProfissional();
        atualizarAjudaNivelAcesso();
        window.dispatchEvent(new CustomEvent('kinesys:equipe-editar', { detail: { id: f.id, nome: f.nome, tipo: normalizarNivelAcessoEquipe(f.tipo) } }));
    } catch (err) {
        console.error('Erro ao abrir edição da equipe:', err);
        alert('⚠️ Não foi possível abrir este cadastro para edição. ' + (err.message || ''));
    }
}

async function cadastrarNovoFuncionario() {
    if (!usuarioEhMaster()) { alert('Apenas Administrador pode cadastrar ou editar a equipe.'); return; }
    const editId = document.getElementById('eq_edit_id')?.value || '';
    const nome = document.getElementById('eq_nome').value.trim();
    const email = document.getElementById('eq_email').value.trim().toLowerCase();
    const cpf = document.getElementById('eq_cpf').value.trim();
    const tipoRegistro = document.getElementById('eq_tipo_registro').value;
    const nivelAcesso = normalizarNivelAcessoEquipe(document.getElementById('eq_nivel_acesso')?.value || perfilPorConselho(tipoRegistro));
    const regional = document.getElementById('eq_regional')?.value.trim() || '';
    const numeroRegistro = document.getElementById('eq_num_registro')?.value.trim() || '';
    const apareceNaAgenda = !!document.getElementById('eq_aparece_na_agenda')?.checked;
    if (!nome || !email) { alert('⚠️ Nome e e-mail são obrigatórios.'); return; }
    if (!validarCPFInput('eq_cpf')) {
        document.getElementById('eq_cpf')?.focus();
        alert('⚠️ Corrija o CPF destacado em vermelho antes de salvar o profissional.');
        return;
    }
    if (tipoRegistro !== 'SECRETARIA' && !numeroRegistro) { alert('⚠️ Informe o número do registro profissional.'); return; }
    if (tipoRegistro === 'CREFITO' && !regional) { alert('⚠️ Informe o regional do CREFITO (ex.: 4).'); return; }
    const registro = formatarRegistroProfissional(tipoRegistro, regional, numeroRegistro);
    if (['CRO','CRP'].includes(tipoRegistro) && !['MASTER','SECRETARIA'].includes(nivelAcesso)) {
        alert('⚠️ Este conselho ainda não possui fluxo clínico específico. Use um nível administrativo/consultivo compatível até que o fluxo próprio seja implementado.');
        return;
    }
    // Um administrador cadastrado pela equipe pode editar os próprios dados, mas não
    // alterar o próprio nível de acesso na mesma sessão. Isso evita auto-bloqueio acidental.
    if (editId && usuarioLogado && String(usuarioLogado.id || '') === String(editId)) {
        const nivelAtual = normalizarNivelAcessoEquipe(usuarioLogado.tipo);
        if (nivelAcesso !== nivelAtual) {
            alert('⚠️ Por segurança, um administrador não pode alterar o próprio nível de acesso. Faça essa mudança usando outro administrador.');
            return;
        }
    }
    try {
        const dup = await verificarDuplicidadeFuncionario({email, cpf, registro, nivelAcesso, excluirId: editId});
        if (dup) { alert(`⚠️ Alteração bloqueada: já existe ${dup.campo} cadastrado para ${dup.funcionario.nome || 'outro funcionário'} com a mesma função (${rotuloPerfil(nivelAcesso)}). Para a mesma pessoa em outra função, escolha um nível de acesso diferente.`); return; }
        const { data: authUserId, error: authError } = await _supabase.rpc('kinesys_resolver_auth_user_id', { p_email: email });
        if (authError) throw authError;
        if (!authUserId) throw new Error('Crie primeiro a conta deste e-mail em Authentication > Users no Supabase.');
        const payload = {
            nome, email, cpf,
            auth_user_id: authUserId,
            tipo: nivelAcesso,
            conselho: tipoRegistro,
            regional: regional || null,
            numero_registro: numeroRegistro || null,
            registro: registro || null,
            aparece_na_agenda: apareceNaAgenda,
            idade: document.getElementById('eq_idade').value || null,
            endereco: document.getElementById('eq_endereco').value.trim()
        };
        if (editId) {
            const { error } = await _supabase.from('equipe').update(payload).eq('id', editId);
            if (error) throw error;
            if (usuarioLogado && String(usuarioLogado.id || '') === String(editId)) {
                usuarioLogado = { ...usuarioLogado, ...payload, id: editId };
                persistirSessao(usuarioLogado);
                const lblUsuario = document.getElementById('lbl_usuario_logado');
                if (lblUsuario) lblUsuario.innerText = usuarioLogado.nome;
            }
            alert('✅ Cadastro da equipe atualizado com sucesso!');
            window.dispatchEvent(new CustomEvent('kinesys:equipe-salva', { detail: { id: editId, tipo: nivelAcesso, editado: true } }));
        } else {
            const novoFuncionario = { id: 'func_' + Date.now(), ...payload };
            const { error } = await _supabase.from('equipe').insert([novoFuncionario]);
            if (error) throw error;
            alert('✅ Usuário cadastrado com sucesso!');
            window.dispatchEvent(new CustomEvent('kinesys:equipe-salva', { detail: { id: novoFuncionario.id, tipo: novoFuncionario.tipo, editado: false } }));
        }
        limparFormularioEquipe();
        carregarListaEquipe();
    } catch (err) {
        console.error('Erro ao salvar equipe:', err);
        const msg = String(err?.message || err?.details || '');
        if (/authentication|auth user|conta.*e-mail|kinesys_resolver_auth_user_id/i.test(msg)) {
            alert('⚠️ Este e-mail ainda não possui uma conta no Supabase Auth. Crie ou convide o usuário em Authentication > Users e tente novamente.');
            return;
        }
        if (/aparece_na_agenda|schema cache/i.test(msg)) {
            alert('⚠️ O banco ainda não possui o controle de profissionais da Agenda. Execute a migration SUPABASE_SQL/SUPABASE_MIGRACAO_PROFISSIONAIS_AGENDA_v1.11.2.sql no Supabase e tente novamente.');
            return;
        }
        alert('⚠️ Não foi possível salvar o profissional. ' + (err.message || 'Verifique a conexão com o servidor.'));
    }
}

async function carregarListaEquipe() {
    const tbody = document.getElementById('lista_equipe_corpo');
    if (!tbody) return;
    if (!_supabase) { tbody.innerHTML = `<tr><td colspan="6" class="kds-u-ta-center">Servidor indisponível. A equipe não é cadastrada offline.</td></tr>`; return; }
    const { data, error } = await _supabase.from('equipe').select(CAMPOS_PUBLICOS_PERFIL);
    if (error || !data || data.length === 0) { tbody.innerHTML = `<tr><td colspan="6" class="kds-u-ta-center">Nenhum funcionário cadastrado.</td></tr>`; return; }
    const ordenados = [...data].sort((a,b) => {
        const am = normalizarNivelAcessoEquipe(a.tipo) === 'MASTER' ? 0 : 1;
        const bm = normalizarNivelAcessoEquipe(b.tipo) === 'MASTER' ? 0 : 1;
        return am - bm || String(a.nome || '').localeCompare(String(b.nome || ''), 'pt-BR');
    });
    tbody.innerHTML = ordenados.map(f => `<tr>
        <td><strong>${escapeHTML(f.nome)}</strong></td>
        <td>${escapeHTML(f.email)}</td>
        <td>${escapeHTML(rotuloPerfil(normalizarNivelAcessoEquipe(f.tipo)))}</td>
        <td>${escapeHTML(f.registro || (conselhoFuncionarioEquipe(f) === 'SECRETARIA' ? 'Administrativo' : 'Sem registro clínico'))}</td>
        <td>${funcionarioPodeAparecerNaAgenda(f)
            ? '<span class="kds-u-ai-center kds-u-gap-5px kds-u-p-3px-7px kds-u-br-999px kds-u-bg-success-soft kds-u-text-success-text kds-u-fs-meta kds-u-fw-800 kds-u-d-inline-flex">✓ Aparece</span>'
            : '<span class="kds-u-ai-center kds-u-gap-5px kds-u-p-3px-7px kds-u-br-999px kds-u-bg-neutral-soft kds-u-text-neutral-text kds-u-fs-meta kds-u-fw-800 kds-u-d-inline-flex">Não aparece</span>'}</td>
        <td><div class="kds-u-gap-6px kds-u-wrap-wrap kds-u-d-flex">
            <button type="button" class="ks-team-action btn-secondary btn-compact" data-equipe-editar="${escapeHTML(f.id)}">Editar</button>
            <button type="button" class="ks-team-action btn-danger btn-compact" data-equipe-excluir="${escapeHTML(f.id)}">Excluir</button>
        </div></td>
    </tr>`).join('');
    if (!tbody.dataset.acoesEquipeVinculadas) {
        tbody.dataset.acoesEquipeVinculadas = '1';
        tbody.addEventListener('click', e => {
            const editar = e.target.closest('[data-equipe-editar]');
            if (editar) { abrirEdicaoFuncionario(editar.dataset.equipeEditar); return; }
            const excluir = e.target.closest('[data-equipe-excluir]');
            if (excluir) excluirFuncionario(excluir.dataset.equipeExcluir);
        });
    }
}

async function excluirFuncionario(id) {
    if (!usuarioEhMaster()) { alert('Apenas Administrador pode excluir usuários.'); return; }
    const proprioUsuario = usuarioLogado && String(usuarioLogado.id || '') === String(id);
    if (proprioUsuario) { alert('⚠️ Por segurança, você não pode excluir o próprio usuário enquanto está conectado.'); return; }
    if(await confirmarKineSys('Deseja realmente excluir este funcionário?', {titulo:'Excluir usuário', confirmar:'Excluir usuário', destrutivo:true})) {
        if(_supabase) {
            const { error } = await _supabase.from('equipe').delete().eq('id', id);
            if (error) { alert('⚠️ Não foi possível excluir este usuário. ' + (error.message || '')); return; }
            carregarListaEquipe();
        }
    }
}

/* ================= 5. TERMÔMETRO DA DOR (ESCALA EVA) ================= */
function aplicarClasseEvaKineSys(el, val) {
    if (!el) return;
    for (let i = 0; i <= 5; i++) el.classList.remove('kds-eva-level-' + i);
    const faixa = val === 0 ? 0 : val <= 3 ? 1 : val <= 5 ? 2 : val <= 7 ? 3 : val <= 9 ? 4 : 5;
    el.classList.add('kds-eva-level-' + faixa);
}

const sliderEVA = document.getElementById("eva_slider");
const valorEVA = document.getElementById("eva_valor");

if (sliderEVA) {
    sliderEVA.addEventListener("input", function() {
        const val = parseInt(this.value) || 0;
        if (valorEVA) {
            valorEVA.innerText = val + "/10";
            aplicarClasseEvaKineSys(valorEVA, val);
        }
    });
}

const sliderEvo = document.getElementById("eva_slider_evo");
const valorEvo = document.getElementById("eva_valor_evo");

if (sliderEvo) {
    sliderEvo.addEventListener("input", function() {
        const val = parseInt(this.value) || 0;
        if (valorEvo) {
            valorEvo.innerText = "Nível " + val;
            aplicarClasseEvaKineSys(valorEvo, val);
        }
    });
}

/* ================= 6. AUTOCOMPLETES (RESTAURADOS E ORIGINAIS) ================= */

function toggleCirurgias(labelElement) {
    const checkbox = labelElement.querySelector('input');
    const bloco = document.getElementById('bloco_cirurgias');
    const inputCirurgia = document.getElementById('input_cirurgia');
    const tagsCirurgias = document.getElementById('tags_cirurgias');
    const sugestaoBox = document.getElementById('sugestao_box');

    if (checkbox && checkbox.checked) {
        if (bloco) bloco.style.display = 'block';
        if (inputCirurgia) inputCirurgia.focus();
    } else {
        if (bloco) bloco.style.display = 'none';
        if (tagsCirurgias) tagsCirurgias.innerHTML = '';
        if (inputCirurgia) inputCirurgia.value = '';
        if (sugestaoBox) sugestaoBox.style.display = 'none';
        if (typeof processarRadarEmTempoReal === 'function') processarRadarEmTempoReal();
    }
}

// ============================================================================
// MOTOR 1.3 — SUGESTÕES CANÔNICAS INDIVIDUAIS
// Evita opções agrupadas como "Ciclismo / MTB / Gravel". O item selecionado
// permanece vinculado à chave-base do dicionário para compatibilidade com o
// Radar, mas a descrição exata escolhida fica preservada no campo/tag.
// ============================================================================
const OPCOES_INDIVIDUAIS_OCUPACAO_ESPORTE = {
    "Trabalho Administrativo / Escritório Geral": ["Assistente Administrativo", "Analista Administrativo", "Trabalho de Escritório"],
    "Programador / Desenvolvedor de Software / TI": ["Programador", "Desenvolvedor de Software", "Profissional de TI"],
    "Designer Gráfico / Ilustrador / Editor de Vídeo": ["Designer Gráfico", "Ilustrador", "Editor de Vídeo"],
    "Advogado / Jurídico / Promotor": ["Advogado", "Profissional Jurídico", "Promotor"],
    "Contador / Auditor / Analista Financeiro": ["Contador", "Auditor", "Analista Financeiro"],
    "Fisioterapeuta / Osteopata / Terapeuta Manual": ["Fisioterapeuta", "Osteopata", "Terapeuta Manual"],
    "Cirurgião-Dentista / Ortodontista / Endodontista": ["Cirurgião-Dentista", "Ortodontista", "Endodontista"],
    "Médico Cirurgião / Instrumentador Cirúrgico": ["Médico Cirurgião", "Instrumentador Cirúrgico"],
    "Enfermeiro / Técnico de Enfermagem / Cuidador": ["Enfermeiro", "Técnico de Enfermagem", "Cuidador"],
    "Pedreiro / Servente / Construção Civil": ["Pedreiro", "Servente de Obra", "Trabalhador da Construção Civil"],
    "Pintor / Marceneiro / Carpinteiro": ["Pintor", "Marceneiro", "Carpinteiro"],
    "Mecânico / Montador Industrial / Funileiro": ["Mecânico", "Montador Industrial", "Funileiro"],
    "Carregador / Estoquista / Carga e Descarga / Ajudante": ["Carregador", "Estoquista", "Trabalhador de Carga e Descarga", "Ajudante de Depósito"],
    "Motorista Profissional / Caminhoneiro / Uber / Taxista": ["Motorista Profissional", "Caminhoneiro", "Motorista de Aplicativo", "Taxista"],
    "Motoboy / Entregador de Motocicleta / Piloto": ["Motoboy", "Entregador de Motocicleta", "Piloto de Motocicleta"],
    "Cabeleireiro / Barbeiro / Esteticista Capilar": ["Cabeleireiro", "Barbeiro", "Esteticista Capilar"],
    "Massoterapeuta / Esteticista Corporal / Podólogo": ["Massoterapeuta", "Esteticista Corporal", "Podólogo"],
    "Professor / Educador / Atendente de Sala": ["Professor", "Educador", "Atendente de Sala"],
    "Vendedor / Caixa / Atendente de Balcão / Garçom": ["Vendedor", "Operador de Caixa", "Atendente de Balcão", "Garçom"],

    "Caminhada Recreativa / Aeróbico de Baixo Impacto": ["Caminhada Recreativa", "Aeróbico de Baixo Impacto"],
    "Pilates Solo / Aparelhos": ["Pilates Solo", "Pilates em Aparelhos"],
    "Yoga / Hatha / Vinyasa": ["Yoga", "Hatha Yoga", "Vinyasa Yoga"],
    "Corrida de Rua / Maratona / Trail Run": ["Corrida de Rua", "Maratona", "Trail Running"],
    "Ciclismo de Estrada / Mountain Bike (MTB) / Gravel": ["Ciclismo de Estrada (Speed)", "Mountain Bike (MTB)", "Ciclismo Gravel"],
    "Beach Tennis / Tênis de Arena / Padel": ["Beach Tennis", "Tênis", "Padel"],
    "Natação (Crawl / Costas / Peito / Borboleta)": ["Natação Crawl", "Natação Costas", "Natação Peito", "Natação Borboleta"],
    "CrossFit / Treinamento Funcional de Alta Intensidade": ["CrossFit", "Treinamento Funcional de Alta Intensidade"],
    "Musculação Pesada / Powerlifting / LPO": ["Musculação", "Powerlifting", "Levantamento de Peso Olímpico (LPO)"],
    "Futebol de Campo / Society": ["Futebol de Campo", "Futebol Society"],
    "Futsal / Futebol de Salão": ["Futsal", "Futebol de Salão"],
    "Basquetebol / Basquete 3x3": ["Basquetebol", "Basquete 3x3"],
    "Voleibol / Vôlei de Praia": ["Voleibol de Quadra", "Vôlei de Praia"],
    "Jiu-Jitsu / Lutas de Solo / Grappling": ["Jiu-Jitsu", "Luta de Solo", "Grappling"],
    "Muay Thai / Kickboxing / Boxe": ["Muay Thai", "Kickboxing", "Boxe"],
    "Judô / Lutas de Projeção": ["Judô", "Luta de Projeção"],
    "Surfe / Bodyboard": ["Surfe", "Bodyboard"],
    "Skate (Street / Park / Bowl)": ["Skate Street", "Skate Park", "Skate Bowl"],
    "Futebol / Futsal": ["Futebol", "Futsal"]
};

const OPCOES_INDIVIDUAIS_CIRURGIAS = {
    "Artrodese de Coluna (Parafusos / Hastes / Cages)": ["Artrodese de Coluna com Parafusos", "Artrodese de Coluna com Hastes", "Artrodese de Coluna com Cage"],
    "Herniectomia / Discectomia Lombar ou Cervical": ["Discectomia Lombar", "Discectomia Cervical", "Herniectomia Lombar", "Herniectomia Cervical"],
    "Vertebroplastia / Cifoplastia (Cimento Ósseo)": ["Vertebroplastia", "Cifoplastia"],
    "Artroplastia Total/Parcial de Quadril (ATQ)": ["Artroplastia Total de Quadril", "Artroplastia Parcial de Quadril"],
    "Osteossintese de Fêmur Proximal / Pelve": ["Osteossíntese de Fêmur Proximal", "Osteossíntese de Pelve"],
    "Artroscopia de Quadril (Impacto Femoroacetabular / Labrum)": ["Artroscopia de Quadril para FAI", "Artroscopia de Quadril com Reparo Labral"],
    "Osteotomia Periacetabular / Femoral": ["Osteotomia Periacetabular", "Osteotomia Femoral"],
    "Reparo / Sutura de Tendão Glúteo Médio/Mínimo": ["Reparo do Tendão Glúteo Médio", "Reparo do Tendão Glúteo Mínimo"],
    "Osteossíntese de Acetábulo / Pelve": ["Osteossíntese de Acetábulo", "Osteossíntese de Pelve"],
    "Reconstrução de Ligamento Colateral (LCM / LCL)": ["Reconstrução do Ligamento Colateral Medial (LCM)", "Reconstrução do Ligamento Colateral Lateral (LCL)"],
    "Meniscectomia / Sutura Meniscal": ["Meniscectomia", "Sutura Meniscal"],
    "Artroplastia Total/Parcial de Joelho (ATJ)": ["Artroplastia Total de Joelho", "Artroplastia Parcial de Joelho"],
    "Realinhamento Patelar / Reconstrução de MPFL": ["Realinhamento Patelar", "Reconstrução do Ligamento Patelofemoral Medial (MPFL)"],
    "Osteotomia Valgrizante / Varizante de Tíbia ou Fêmur": ["Osteotomia Valgizante de Tíbia", "Osteotomia Varizante de Tíbia", "Osteotomia Valgizante de Fêmur", "Osteotomia Varizante de Fêmur"],
    "Sutura / Reconstrução de Tendão Patelar ou Quadricipital": ["Sutura do Tendão Patelar", "Reconstrução do Tendão Patelar", "Sutura do Tendão Quadricipital", "Reconstrução do Tendão Quadricipital"],
    "Mosaicoplastia / Transplante Osteocondral de Joelho": ["Mosaicoplastia de Joelho", "Transplante Osteocondral de Joelho"],
    "Reparo / Sutura de Manguito Rotador (Artroscopia)": ["Reparo Artroscópico do Manguito Rotador", "Sutura Artroscópica do Manguito Rotador"],
    "Artroplastia Total / Inversa de Ombro": ["Artroplastia Total Anatômica de Ombro", "Artroplastia Reversa de Ombro"],
    "Reparo de Lesão de Bankart / SLAP (Instabilidade)": ["Reparo de Bankart", "Reparo de SLAP"],
    "Procedimento de Latarjet / Enxerto Ósseo Glenoidal": ["Procedimento de Latarjet", "Enxerto Ósseo Glenoidal"],
    "Acromioplastia / Descompressão Subacromial": ["Acromioplastia", "Descompressão Subacromial"],
    "Osteossíntese de Clavícula (Placa / Parafuso)": ["Osteossíntese de Clavícula com Placa", "Osteossíntese de Clavícula com Parafuso"],
    "Osteossíntese de Cotovelo / Olecrano / Cabeça do Rádio": ["Osteossíntese de Cotovelo", "Osteossíntese de Olécrano", "Osteossíntese de Cabeça do Rádio"],
    "Sutura / Reconstrução de Tendão Bíceps Distal": ["Sutura do Bíceps Distal", "Reconstrução do Bíceps Distal"],
    "Desbridamento / Liberação de Epicôndilo Lateral/Medial": ["Desbridamento do Epicôndilo Lateral", "Desbridamento do Epicôndilo Medial", "Liberação do Epicôndilo Lateral", "Liberação do Epicôndilo Medial"],
    "Osteossíntese de Rádio Distal / Ulna": ["Osteossíntese de Rádio Distal", "Osteossíntese de Ulna"],
    "Sutura / Reconstrução de Tendão de Aquiles (Calcâneo)": ["Sutura do Tendão de Aquiles", "Reconstrução do Tendão de Aquiles"],
    "Osteossíntese de Maleólo / Tornozelo (Placa / Parafusos)": ["Osteossíntese de Maléolo com Placa", "Osteossíntese de Maléolo com Parafusos", "Osteossíntese de Tornozelo"],
    "Artrodese Subtalar / Tiobiotalar": ["Artrodese Subtalar", "Artrodese Tibiotalar"],
    "Procedimento de Broström / Ligamentoplastia de Tornozelo": ["Procedimento de Broström", "Ligamentoplastia de Tornozelo"],
    "Fasciotomia Plantar / Liberação de Esporão": ["Fasciotomia Plantar", "Ressecção de Esporão Calcâneo"],
    "Abdominoplastia / Plicatura de Reto Abdominal": ["Abdominoplastia", "Plicatura do Reto Abdominal"],
    "Hernioplastia Umbilical / Inguinal / Incisional": ["Hernioplastia Umbilical", "Hernioplastia Inguinal", "Hernioplastia Incisional"],
    "Cirurgia Bariátrica (Bypass / Sleeve / Gastrectomia)": ["Bypass Gástrico", "Gastrectomia Sleeve", "Gastrectomia Bariátrica"],
    "Histerectomia Total / Parcial (Retirada do Útero)": ["Histerectomia Total", "Histerectomia Parcial"],
    "Cauterização / Exerese de Focos de Endometriose": ["Cauterização de Focos de Endometriose", "Exérese de Focos de Endometriose"],
    "Esternotomia / Revascularização do Miocárdio": ["Esternotomia", "Revascularização do Miocárdio"],
    "Procedimento por pneumotórax": ["Procedimento por pneumotórax — técnica não informada", "Drenagem torácica / toracostomia por pneumotórax", "Pleurodese por pneumotórax", "Cirurgia torácica por pneumotórax"],
    "Esternotomia / Troca Valvar Cardíaca": ["Esternotomia", "Troca Valvar Cardíaca"],
    "Esternotomia / Cirurgia Cardíaca Aberta": ["Esternotomia", "Cirurgia Cardíaca Aberta"],
    "Safenectomia / Escleroterapia Vascular de MMI": ["Safenectomia", "Escleroterapia Vascular de Membro Inferior"],
    "Explante de Prótese de Silicone Mamária / Capsulotomia": ["Explante de Prótese Mamária", "Capsulotomia Mamária"],
    "Mamoplastia Redutora / Mastopexia": ["Mamoplastia Redutora", "Mastopexia"],
    "Mastectomia Total / Parcial (Reconstrução Mamária)": ["Mastectomia Total", "Mastectomia Parcial", "Reconstrução Mamária"],
    "Lipoaspiração / Lipoescultura (Torse / Membros)": ["Lipoaspiração de Tronco", "Lipoaspiração de Membros", "Lipoescultura de Tronco", "Lipoescultura de Membros"],
    "Artroplastia / Cirurgia de ATM (Mandíbula)": ["Artroplastia de ATM", "Cirurgia de ATM"],
    "Osteotomia Ortognática (Maxilar / Mandíbula)": ["Osteotomia Ortognática Maxilar", "Osteotomia Ortognática Mandibular"],
    "Tireoidectomia Total / Parcial (Pescoço)": ["Tireoidectomia Total", "Tireoidectomia Parcial"],
    "Fixação Occipitocervical / Coluna Cervical Alta": ["Fixação Occipitocervical", "Fixação de Coluna Cervical Alta"],
    "Amputação Transtibial / Transfemoral (MMII)": ["Amputação Transtibial", "Amputação Transfemoral"],
    "Amputação Transradial / Transhumeral (MMSS)": ["Amputação Transradial", "Amputação Transhumeral"],
    "Osteossíntese com Fixador Externo (Gaiola / Ilizarov)": ["Osteossíntese com Fixador Externo", "Osteossíntese com Fixador Ilizarov"],
    "Enxerto Ósseo Autólogo / Homólogo": ["Enxerto Ósseo Autólogo", "Enxerto Ósseo Homólogo"]
};

function expandirSugestoesIndividuais(item, mapa) {
    const exibicao = obterTextoExibicao(item);
    return (mapa && mapa[exibicao]) ? mapa[exibicao] : [exibicao];
}

// --- AUTOCOMPLETE: CIRURGIAS ---
const inputCirurgia = document.getElementById('input_cirurgia');
const sugestaoBoxCirurgia = document.getElementById('sugestao_box');

if (inputCirurgia) {
    inputCirurgia.addEventListener("input", function() {
        let textoDigitado = removerAcentos(this.value);
        let sugestoesEncontradas = [];

        if (typeof dicionarioCirurgias !== 'undefined' && textoDigitado.length > 2) {
            for (let palavraChave in dicionarioCirurgias) {
                let palavraLimpa = removerAcentos(palavraChave);
                const objetoItem = dicionarioCirurgias[palavraChave];
                const opcoes = expandirSugestoesIndividuais(objetoItem, OPCOES_INDIVIDUAIS_CIRURGIAS);
                const bateChave = palavraLimpa.includes(textoDigitado) || textoDigitado.includes(palavraLimpa);
                const bateExibicao = opcoes.some(op => removerAcentos(op).includes(textoDigitado));
                const bateGrupo = removerAcentos(obterTextoExibicao(objetoItem)).includes(textoDigitado);
                if (bateChave || bateExibicao || bateGrupo) {
                    opcoes.forEach(textoExibicao => {
                        // Se o usuário digitou um subtipo específico (ex.: speed, MTB, reversa),
                        // prioriza/mostra somente opções semanticamente compatíveis quando houver match direto.
                        const opMatch = removerAcentos(textoExibicao).includes(textoDigitado);
                        if (bateExibicao && !opMatch && !bateChave) return;
                        if (!sugestoesEncontradas.some(s => s.texto === textoExibicao)) {
                            sugestoesEncontradas.push({ chave: palavraChave, texto: textoExibicao });
                        }
                    });
                }
            }
        }

        if (sugestaoBoxCirurgia) {
            if (sugestoesEncontradas.length > 0) {
                sugestaoBoxCirurgia.innerHTML = "";
                sugestoesEncontradas.forEach(item => {
                    const div = document.createElement('div');
                    div.classList.add('kds-u-p-10px', 'kds-u-bb-1px-solid-e2e8f0', 'kds-u-cursor-pointer', 'kds-u-text-petrol', 'kds-u-fw-600', 'kds-u-fs-ui', 'kds-u-transition-0p2s');
                    div.innerText = "➔ " + item.texto;
                    div.classList.add('kds-u-hover-soft');
                    div.onclick = function(e) {
                        e.stopPropagation();
                        adicionarTagCirurgia(item.chave, item.texto);
                    };
                    sugestaoBoxCirurgia.appendChild(div);
                });
                sugestaoBoxCirurgia.style.display = "block";
            } else {
                sugestaoBoxCirurgia.style.display = "none";
            }
        }
    });
}

function adicionarTagCirurgia(chave, termoExibicao) {
    const container = document.getElementById('tags_cirurgias');
    if (container) {
        const tag = document.createElement('div');
        tag.className = 'tag-cirurgia';
        tag.dataset.chave = chave;
        tag.dataset.exibicao = termoExibicao;

        const textoTag = document.createTextNode(termoExibicao + " ");
        const botaoRemover = document.createElement('span');
        botaoRemover.title = "Remover";
        botaoRemover.textContent = "✕";
        botaoRemover.onclick = function() {
            tag.remove();
            if (typeof processarRadarEmTempoReal === 'function') processarRadarEmTempoReal();
        };

        tag.appendChild(textoTag);
        tag.appendChild(botaoRemover);
        container.appendChild(tag);
    }
    if (inputCirurgia) inputCirurgia.value = '';
    if (sugestaoBoxCirurgia) sugestaoBoxCirurgia.style.display = 'none';
    if (typeof processarRadarEmTempoReal === 'function') processarRadarEmTempoReal();
}

// --- AUTOCOMPLETE: PROFISSÕES ---
const inputProfissao = document.getElementById('paciente_ocupacao');
const sugestaoBoxProfissao = document.getElementById('sugestao_box_profissao');

if (inputProfissao) {
    inputProfissao.addEventListener("input", function() {
        let textoDigitado = removerAcentos(this.value);
        let sugestoesEncontradas = [];

        if (typeof dicionarioOcupacoesEsportes !== 'undefined' && textoDigitado.length >= 2) {
            for (let palavraChave in dicionarioOcupacoesEsportes) {
                let item = dicionarioOcupacoesEsportes[palavraChave];
                if (item && item.tipo === "profissao") {
                    let palavraLimpa = removerAcentos(palavraChave);
                    const opcoes = expandirSugestoesIndividuais(item, OPCOES_INDIVIDUAIS_OCUPACAO_ESPORTE);
                    const bateChave = palavraLimpa.includes(textoDigitado);
                    const bateOpcao = opcoes.some(op => removerAcentos(op).includes(textoDigitado));
                    const bateGrupo = removerAcentos(obterTextoExibicao(item)).includes(textoDigitado);
                    if (bateChave || bateOpcao || bateGrupo) {
                        opcoes.forEach(textoExibicao => {
                            const opMatch = removerAcentos(textoExibicao).includes(textoDigitado);
                            if (bateOpcao && !opMatch && !bateChave) return;
                            if (!sugestoesEncontradas.some(s => s.texto === textoExibicao)) {
                                sugestoesEncontradas.push({ chave: palavraChave, texto: textoExibicao });
                            }
                        });
                    }
                }
            }
        }

        if (sugestaoBoxProfissao) {
            if (sugestoesEncontradas.length > 0) {
                sugestaoBoxProfissao.innerHTML = "";
                sugestoesEncontradas.forEach(item => {
                    const div = document.createElement('div');
                    div.classList.add('kds-u-p-10px', 'kds-u-bb-1px-solid-e2e8f0', 'kds-u-cursor-pointer', 'kds-u-text-003b46', 'kds-u-fw-600', 'kds-u-fs-ui', 'kds-u-transition-0p2s');
                    div.innerText = "➔ " + item.texto;
                    div.classList.add('kds-u-hover-soft');
                    
                    div.onclick = function(e) {
                        e.stopPropagation();
                        inputProfissao.value = item.texto;
                        sugestaoBoxProfissao.style.display = "none";
                        if (typeof processarRadarEmTempoReal === 'function') processarRadarEmTempoReal();
                    };

                    sugestaoBoxProfissao.appendChild(div);
                });
                sugestaoBoxProfissao.style.display = "block";
            } else {
                sugestaoBoxProfissao.style.display = "none";
            }
        }
    });
}

// --- AUTOCOMPLETE: ESPORTES ---
const inputEsporte = document.getElementById('paciente_esporte');
const sugestaoBoxEsporte = document.getElementById('sugestao_box_esporte');

if (inputEsporte) {
    inputEsporte.addEventListener("input", function() {
        let textoDigitado = removerAcentos(this.value);
        let sugestoesEncontradas = [];

        if (typeof dicionarioOcupacoesEsportes !== 'undefined' && textoDigitado.length >= 2) {
            for (let palavraChave in dicionarioOcupacoesEsportes) {
                let item = dicionarioOcupacoesEsportes[palavraChave];
                if (item && item.tipo === "esporte") {
                    let palavraLimpa = removerAcentos(palavraChave);
                    const opcoes = expandirSugestoesIndividuais(item, OPCOES_INDIVIDUAIS_OCUPACAO_ESPORTE);
                    const bateChave = palavraLimpa.includes(textoDigitado);
                    const bateOpcao = opcoes.some(op => removerAcentos(op).includes(textoDigitado));
                    const bateGrupo = removerAcentos(obterTextoExibicao(item)).includes(textoDigitado);
                    if (bateChave || bateOpcao || bateGrupo) {
                        opcoes.forEach(textoExibicao => {
                            const opMatch = removerAcentos(textoExibicao).includes(textoDigitado);
                            if (bateOpcao && !opMatch && !bateChave) return;
                            if (!sugestoesEncontradas.some(s => s.texto === textoExibicao)) {
                                sugestoesEncontradas.push({ chave: palavraChave, texto: textoExibicao });
                            }
                        });
                    }
                }
            }
        }

        if (sugestaoBoxEsporte) {
            if (sugestoesEncontradas.length > 0) {
                sugestaoBoxEsporte.innerHTML = "";
                sugestoesEncontradas.forEach(item => {
                    const div = document.createElement('div');
                    div.classList.add('kds-u-p-10px', 'kds-u-bb-1px-solid-e2e8f0', 'kds-u-cursor-pointer', 'kds-u-text-003b46', 'kds-u-fw-600', 'kds-u-fs-ui', 'kds-u-transition-0p2s');
                    div.innerText = "➔ " + item.texto;
                    div.classList.add('kds-u-hover-soft');
                    
                    div.onclick = function(e) {
                        e.stopPropagation();
                        inputEsporte.value = item.texto;
                        sugestaoBoxEsporte.style.display = "none";
                        if (typeof processarRadarEmTempoReal === 'function') processarRadarEmTempoReal();
                    };

                    sugestaoBoxEsporte.appendChild(div);
                });
                sugestaoBoxEsporte.style.display = "block";
            } else {
                sugestaoBoxEsporte.style.display = "none";
            }
        }
    });
}

// --- AUTOCOMPLETE: MEDICAMENTOS ---
const inputMedicamento = document.getElementById('input_medicamento');
const sugestaoBoxMed = document.getElementById('sugestao_box_med');

if (inputMedicamento) {
    inputMedicamento.addEventListener("input", function() {
        let textoDigitado = removerAcentos(this.value);
        let sugestoesEncontradas = [];

        if (typeof dicionarioMedicamentos !== 'undefined' && textoDigitado.length > 2) {
            for (let palavraChave in dicionarioMedicamentos) {
                let palavraLimpa = removerAcentos(palavraChave);
                let regexChaveNoTexto = new RegExp("\\b" + palavraLimpa + "\\b", "i");
                if (regexChaveNoTexto.test(textoDigitado) || palavraLimpa.includes(textoDigitado)) {
                    let termoTecnico = dicionarioMedicamentos[palavraChave];
                    if (!sugestoesEncontradas.includes(termoTecnico)) {
                        sugestoesEncontradas.push(termoTecnico);
                    }
                }
            }
        }

        if (sugestaoBoxMed) {
            if (sugestoesEncontradas.length > 0) {
                sugestaoBoxMed.innerHTML = "";
                sugestoesEncontradas.forEach(termo => {
                    const div = document.createElement('div');
                    div.classList.add('kds-u-p-10px', 'kds-u-bb-1px-solid-e2e8f0', 'kds-u-cursor-pointer', 'kds-u-text-d35400', 'kds-u-fw-600', 'kds-u-fs-ui', 'kds-u-transition-0p2s');
                    div.innerText = "➔ " + termo;
                    div.classList.add('kds-u-hover-warm');
                    div.onclick = function(e) {
                        e.stopPropagation();
                        adicionarTagMedicamento(termo);
                    };
                    sugestaoBoxMed.appendChild(div);
                });
                sugestaoBoxMed.style.display = "block";
            } else {
                sugestaoBoxMed.style.display = "none";
            }
        }
    });

    inputMedicamento.addEventListener("keypress", function(event) {
        if (event.key === "Enter") {
            event.preventDefault();
            let texto = this.value.trim();
            if (texto !== "") {
                adicionarTagMedicamento(texto.charAt(0).toUpperCase() + texto.slice(1));
            }
        }
    });
}

function adicionarTagMedicamento(termo) {
    const container = document.getElementById('tags_medicamentos');
    if (container) {
        const tag = document.createElement('div');
        tag.classList.add('kds-u-bg-e67e22', 'kds-u-text-white', 'kds-u-p-6px-12px', 'kds-u-br-4px', 'kds-u-fs-label', 'kds-u-fw-bold', 'kds-u-d-flex', 'kds-u-ai-center', 'kds-u-gap-8px');

        const textoTag = document.createTextNode(termo);
        const botaoRemover = document.createElement('span');
        botaoRemover.classList.add('kds-u-cursor-pointer', 'kds-u-text-rgba-255-255-255-0p7');
        botaoRemover.title = "Remover";
        botaoRemover.textContent = "✕";
        botaoRemover.onclick = function() {
            tag.remove();
            if (typeof processarRadarEmTempoReal === 'function') processarRadarEmTempoReal();
        };

        tag.appendChild(textoTag);
        tag.appendChild(botaoRemover);
        container.appendChild(tag);
    }
    if (inputMedicamento) inputMedicamento.value = '';
    if (sugestaoBoxMed) sugestaoBoxMed.style.display = 'none';
    if (typeof processarRadarEmTempoReal === 'function') processarRadarEmTempoReal();
}

// FECHAMENTO DE CAIXAS AO CLICAR FORA
document.addEventListener('click', function(e) {
    if (inputMedicamento && sugestaoBoxMed && !inputMedicamento.contains(e.target) && !sugestaoBoxMed.contains(e.target)) {
        sugestaoBoxMed.style.display = 'none';
    }
    if (inputCirurgia && sugestaoBoxCirurgia && !inputCirurgia.contains(e.target) && !sugestaoBoxCirurgia.contains(e.target)) {
        sugestaoBoxCirurgia.style.display = 'none';
    }
    if (inputProfissao && sugestaoBoxProfissao && !inputProfissao.contains(e.target) && !sugestaoBoxProfissao.contains(e.target)) {
        sugestaoBoxProfissao.style.display = 'none';
    }
    if (inputEsporte && sugestaoBoxEsporte && !inputEsporte.contains(e.target) && !sugestaoBoxEsporte.contains(e.target)) {
        sugestaoBoxEsporte.style.display = 'none';
    }
});

/* ==========================================================================
   KINESYS - SCRIPT DEFINITIVO (ID ÚNICO E SEM DUPLICATAS) - PARTE 3 DE 4
   Radar Clínico em Tempo Real
   ========================================================================== */

/* ================= 7. RADAR CLÍNICO EM TEMPO REAL ================= */
/* processarRadarEmTempoReal legado removido na v1.4 */

/* ==========================================================================
   KINESYS - SCRIPT DEFINITIVO (ID ÚNICO E SEM DUPLICATAS) - PARTE 4 DE 4
   Banco de Dados (Supabase), Prontuários, Edição, Evoluções e Init
   ========================================================================== */

/* ================= 8. BANCO DE DADOS (SUPABASE / LOCALSTORAGE) ================= */


function calcularIdadePorNascimento(dataNasc) {
    if (!dataNasc) return '';
    const txt = String(dataNasc).trim();
    let ano, mes, dia;
    let partes = txt.match(/^(\d{4})-(\d{2})-(\d{2})/); // DATE/TIMESTAMP do Supabase
    if (partes) {
        ano = Number(partes[1]); mes = Number(partes[2]); dia = Number(partes[3]);
    } else {
        partes = txt.match(/^(\d{2})\/(\d{2})\/(\d{4})$/); // legado pt-BR
        if (!partes) return '';
        dia = Number(partes[1]); mes = Number(partes[2]); ano = Number(partes[3]);
    }
    if (!ano || mes < 1 || mes > 12 || dia < 1 || dia > 31) return '';
    const hoje = new Date();
    let idade = hoje.getFullYear() - ano;
    const aindaNaoAniversariou = (hoje.getMonth() + 1 < mes) || ((hoje.getMonth() + 1 === mes) && hoje.getDate() < dia);
    if (aindaNaoAniversariou) idade--;
    return idade >= 0 && idade < 130 ? `${idade} anos` : '';
}

function idadeNumericaPaciente(p) {
    const bruta = p?.idade || calcularIdadePorNascimento(p?.nascimento) || '';
    const match = String(bruta).match(/\d{1,3}/);
    return match ? match[0] : '';
}

const KINESYS_RESPONSAVEIS_KEY = 'kinesys_pacientes_responsaveis_v1';

function obterDadosResponsavelLocal(pacienteId) {
    if (!pacienteId) return {};
    try {
        const base = JSON.parse(localStorage.getItem(KINESYS_RESPONSAVEIS_KEY) || '{}');
        return base[pacienteId] || {};
    } catch (_) { return {}; }
}

function salvarDadosResponsavelLocal(paciente) {
    if (!paciente?.id) return;
    try {
        const base = JSON.parse(localStorage.getItem(KINESYS_RESPONSAVEIS_KEY) || '{}');
        base[paciente.id] = {
            dependente: !!paciente.dependente,
            responsavelNome: paciente.responsavelNome || '',
            responsavelParentesco: paciente.responsavelParentesco || '',
            responsavelTelefone: paciente.responsavelTelefone || ''
        };
        localStorage.setItem(KINESYS_RESPONSAVEIS_KEY, JSON.stringify(base));
    } catch (err) { console.warn('KineSys: não foi possível preservar os dados do responsável localmente.', err); }
}

function pacienteEhDependente(paciente) {
    return !!(paciente?.dependente ?? paciente?.menor_dependente);
}

function obterContatoPreferencialPaciente(paciente) {
    const p = paciente || {};
    const dependente = pacienteEhDependente(p);
    const telefoneResponsavel = p.responsavelTelefone || p.responsavel_telefone || '';
    const nomeResponsavel = p.responsavelNome || p.responsavel_nome || '';
    if (dependente && telefoneResponsavel) {
        return {
            telefone: telefoneResponsavel,
            nomeDestinatario: nomeResponsavel || 'responsável',
            usaResponsavel: true,
            parentesco: p.responsavelParentesco || p.responsavel_parentesco || ''
        };
    }
    return {
        telefone: p.telefone || '',
        nomeDestinatario: p.nome || 'paciente',
        usaResponsavel: false,
        parentesco: ''
    };
}

function normalizarPacienteDoBanco(p) {
    const idadeNormalizada = p.idade || calcularIdadePorNascimento(p.nascimento) || '';
    const responsavelLocal = obterDadosResponsavelLocal(p.id);
    const dependenteBanco = p.dependente ?? p.menor_dependente ?? responsavelLocal.dependente ?? false;
    return {
        ...p,
        idade: idadeNormalizada,
        estadoCivil: p.estadoCivil || p.estado_civil || '',
        dependente: !!dependenteBanco,
        responsavelNome: p.responsavelNome || p.responsavel_nome || responsavelLocal.responsavelNome || '',
        responsavelParentesco: p.responsavelParentesco || p.responsavel_parentesco || responsavelLocal.responsavelParentesco || '',
        responsavelTelefone: p.responsavelTelefone || p.responsavel_telefone || responsavelLocal.responsavelTelefone || '',
        dataCadastro: p.dataCadastro || p.data_cadastro || '',
        cadastradoPor: p.cadastradoPor || p.cadastrado_por || '',
        timestampCadastro: p.timestampCadastro || p.timestamp_cadastro || null,
        avaliacoes: (p.avaliacoes || []).map(av => ({
            ...av,
            dataAvaliacao: av.dataAvaliacao || av.data_avaliacao || '',
            dataHoraISO: av.dataHoraISO || av.data_hora_iso || av.salvo_em || null,
            realizadoEm: av.realizadoEm || av.realizado_em || av.data_hora_iso || null,
            salvoEm: av.salvoEm || av.salvo_em || av.data_hora_iso || null,
            edicaoLimiteEm: av.edicaoLimiteEm || av.edicao_limite_em || null,
            profissionalId: av.profissionalId || av.profissional_id || null,
            profissionalNome: av.profissionalNome || av.profissional_nome || av.realizadoPor || av.realizado_por || '',
            profissionalRegistro: av.profissionalRegistro || av.profissional_registro || '',
            ultimaEdicaoEm: av.ultimaEdicaoEm || av.ultima_edicao_em || null,
            ultimaEdicaoPorId: av.ultimaEdicaoPorId || av.ultima_edicao_por_id || null,
            ultimaEdicaoPorNome: av.ultimaEdicaoPorNome || av.ultima_edicao_por_nome || '',
            realizadoPor: av.realizadoPor || av.realizado_por || av.profissional_nome || '',
            evaInicial: av.evaInicial ?? av.eva_inicial ?? 0,
            idade: av.idade || idadeNormalizada,
            status: av.status || av.mapeamento?.status || av.mapeamento?.meta?.status || ''
        })),
        evolucoes: (p.evolucoes || []).map(ev => ({
            ...ev,
            dataHoraISO: ev.dataHoraISO || ev.data_hora_iso || ev.salvo_em || null,
            realizadoEm: ev.realizadoEm || ev.realizado_em || ev.data_hora_iso || null,
            salvoEm: ev.salvoEm || ev.salvo_em || ev.data_hora_iso || null,
            edicaoLimiteEm: ev.edicaoLimiteEm || ev.edicao_limite_em || null,
            relatoLivre: ev.relatoLivre ?? ev.relato_livre ?? '',
            dadosEstruturados: ev.dadosEstruturados || ev.dados_estruturados || {},
            profissionalId: ev.profissionalId || ev.profissional_id || null,
            profissionalNome: ev.profissionalNome || ev.profissional_nome || ev.profissional || '',
            profissionalRegistro: ev.profissionalRegistro || ev.profissional_registro || '',
            ultimaEdicaoEm: ev.ultimaEdicaoEm || ev.ultima_edicao_em || null,
            ultimaEdicaoPorId: ev.ultimaEdicaoPorId || ev.ultima_edicao_por_id || null,
            ultimaEdicaoPorNome: ev.ultimaEdicaoPorNome || ev.ultima_edicao_por_nome || ''
        }))
    };
}

function lerPacientesLocaisComSeguranca() {
    try {
        const dados = JSON.parse(localStorage.getItem('kinesys_prontuarios') || '[]');
        return Array.isArray(dados) ? dados.filter(p => p && String(p.id || '').trim()) : [];
    } catch (err) {
        console.warn('KineSys: não foi possível ler os prontuários locais.', err);
        return [];
    }
}

function instanteRegistroClinico(registro) {
    const candidatos = [
        registro?.ultimaEdicaoEm, registro?.ultima_edicao_em,
        registro?.salvoEm, registro?.salvo_em,
        registro?.dataHoraISO, registro?.data_hora_iso,
        registro?.realizadoEm, registro?.realizado_em,
        registro?.dataAvaliacao, registro?.data_avaliacao,
        registro?.data
    ];
    for (const candidato of candidatos) {
        const data = new Date(candidato || '');
        if (Number.isFinite(data.getTime())) return data.getTime();
    }
    return 0;
}

function mesclarRegistrosCloudLocal(registrosCloud = [], registrosLocais = []) {
    const mapa = new Map();
    (Array.isArray(registrosCloud) ? registrosCloud : []).forEach(registro => {
        if (registro && String(registro.id || '').trim()) mapa.set(String(registro.id), { ...registro });
    });
    (Array.isArray(registrosLocais) ? registrosLocais : []).forEach(registro => {
        if (!registro || !String(registro.id || '').trim()) return;
        const id = String(registro.id);
        const atual = mapa.get(id);
        if (!atual) {
            mapa.set(id, { ...registro, __dadosLocaisPendentes: true });
            return;
        }
        // Quando há o mesmo registro nos dois lugares, conserva a versão mais
        // recente e mantém o marcador para que a migração assistida possa
        // reconciliar a cópia local sem duplicar o ID clínico.
        if (instanteRegistroClinico(registro) > instanteRegistroClinico(atual)) {
            mapa.set(id, { ...registro, __dadosLocaisPendentes: true });
        }
    });
    return Array.from(mapa.values());
}

function mesclarPacienteCloudLocal(pacienteCloud, pacienteLocal) {
    const cloud = pacienteCloud || {};
    const local = pacienteLocal || {};
    return {
        ...local,
        ...cloud,
        __dadosLocaisPendentes: !!local.__dadosLocaisPendentes,
        avaliacoes: mesclarRegistrosCloudLocal(cloud.avaliacoes || [], local.avaliacoes || []),
        evolucoes: mesclarRegistrosCloudLocal(cloud.evolucoes || [], local.evolucoes || []),
        documentos: mesclarRegistrosCloudLocal(cloud.documentos || [], local.documentos || [])
    };
}

async function obterPacientesSalvos() {
    const locais = lerPacientesLocaisComSeguranca();
    if (_supabase) {
        try {
            const { data, error } = await _supabase
                .from('pacientes')
                .select('*, avaliacoes(*), evolucoes(*)');

            if (!error && Array.isArray(data)) {
                const cloud = data.map(normalizarPacienteDoBanco);
                const locaisPorId = new Map(locais.map(p => [String(p.id), p]));
                const resultado = cloud.map(p => {
                    const local = locaisPorId.get(String(p.id));
                    if (local) locaisPorId.delete(String(p.id));
                    return mesclarPacienteCloudLocal(p, local);
                });
                // O Supabase é a fonte principal, mas um prontuário criado
                // durante uma falha de conexão não desaparece da tela antes
                // da migração assistida.
                locaisPorId.forEach(local => resultado.push(normalizarPacienteDoBanco({ ...local, __dadosLocaisPendentes: true })));
                return resultado;
            }
        } catch (err) {
            console.warn("⚠️ Conexão com a nuvem falhou. Carregando dados locais preservados...", err);
        }
    }
    return locais.map(p => normalizarPacienteDoBanco({ ...p, __dadosLocaisPendentes: true }));
}

async function salvarPacienteNaNuvem(pacienteObjeto, opcoes = {}) {
    const {
        id, nome, cpf, nascimento, telefone, profissao, sexo, estadoCivil, estado_civil,
        dependente, responsavelNome, responsavelParentesco, responsavelTelefone,
        cep, endereco, dataCadastro, cadastradoPor, timestampCadastro,
        avaliacoes = [], evolucoes = [], ...resto
    } = pacienteObjeto;

    const pacienteDataCore = {
        id,
        nome,
        cpf: cpf || '',
        nascimento: nascimento || '',
        telefone: telefone || '',
        profissao: profissao || '',
        sexo: sexo || '',
        estado_civil: estadoCivil || estado_civil || '',
        cep: cep || '',
        endereco: endereco || '',
        data_cadastro: dataCadastro || new Date().toLocaleDateString('pt-BR'),
        cadastrado_por: cadastradoPor || (usuarioLogado ? usuarioLogado.nome : 'Desconhecido'),
        timestamp_cadastro: timestampCadastro || new Date().getTime()
    };

    const pacienteDataComResponsavel = {
        ...pacienteDataCore,
        dependente: !!dependente,
        responsavel_nome: responsavelNome || '',
        responsavel_parentesco: responsavelParentesco || '',
        responsavel_telefone: responsavelTelefone || ''
    };

    // Mantém o contato do responsável disponível neste computador mesmo se a
    // migration da nuvem ainda não tiver sido executada.
    salvarDadosResponsavelLocal(pacienteObjeto);

    if (_supabase) {
        try {
            let { error: pacienteError } = await _supabase
                .from('pacientes')
                .upsert([pacienteDataComResponsavel], { onConflict: 'id' });

            // Compatibilidade com bancos antigos: se as novas colunas ainda não
            // existirem, salva o cadastro principal na nuvem e preserva os dados
            // do responsável localmente até a migration ITEM5 ser aplicada.
            if (pacienteError) {
                const tentativaCore = await _supabase
                    .from('pacientes')
                    .upsert([pacienteDataCore], { onConflict: 'id' });
                if (tentativaCore.error) throw pacienteError;
                console.warn('KineSys: cadastro salvo na nuvem sem as novas colunas de responsável. Execute SUPABASE_SQL/SUPABASE_MIGRACAO_v1.11.2_ITEM5_RESPONSAVEL.sql para sincronizá-las entre dispositivos.', pacienteError);
            }

            for (const av of avaliacoes) {
                const avData = {
                    id: av.id || `av_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
                    paciente_id: id,
                    data_avaliacao: av.dataAvaliacao || new Date().toLocaleDateString('pt-BR'),
                    data_hora_iso: av.dataHoraISO || av.salvoEm || new Date().toISOString(),
                    realizado_em: av.realizadoEm || av.dataHoraISO || new Date().toISOString(),
                    realizado_por: av.realizadoPor || av.profissionalNome || (usuarioLogado ? usuarioLogado.nome : 'Desconhecido'),
                    profissional_id: av.profissionalId || null,
                    profissional_nome: av.profissionalNome || av.realizadoPor || (usuarioLogado ? usuarioLogado.nome : 'Desconhecido'),
                    profissional_registro: av.profissionalRegistro || '',
                    ultima_edicao_em: av.ultimaEdicaoEm || null,
                    ultima_edicao_por_id: av.ultimaEdicaoPorId || null,
                    ultima_edicao_por_nome: av.ultimaEdicaoPorNome || null,
                    idade: av.idade || '',
                    profissao: av.profissao || '',
                    esporte: av.esporte || '',
                    comorbidades: av.comorbidades || {},
                    cirurgias: av.cirurgias || [],
                    medicamentos: av.medicamentos || [],
                    eva_inicial: av.evaInicial || 0,
                    hma: av.hma || '',
                    mapeamento: av.mapeamento || null,
                    tipo: av.tipo || 'Avaliação Inicial'
                };

                const { error: avError } = await _supabase
                    .from('avaliacoes')
                    .upsert([avData], { onConflict: 'id' });

                if (avError) throw avError;
            }

            for (const ev of evolucoes) {
                const evData = {
                    id: ev.id || `ev_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
                    paciente_id: id,
                    data: ev.data || String(ev.realizadoEm || '').slice(0,10) || new Date().toISOString().slice(0,10),
                    data_hora_iso: ev.dataHoraISO || ev.salvoEm || new Date().toISOString(),
                    realizado_em: ev.realizadoEm || ev.dataHoraISO || new Date().toISOString(),
                    eva: ev.eva ?? 0,
                    relato: ev.relato || '',
                    relato_livre: ev.relatoLivre || '',
                    dados_estruturados: ev.dadosEstruturados || {},
                    profissional: ev.profissional || (ev.profissionalNome ? `${ev.profissionalNome}${ev.profissionalRegistro ? ` (${ev.profissionalRegistro})` : ''}` : (usuarioLogado ? `${usuarioLogado.nome} (${usuarioLogado.registro})` : 'Desconhecido')),
                    profissional_id: ev.profissionalId || null,
                    profissional_nome: ev.profissionalNome || '',
                    profissional_registro: ev.profissionalRegistro || '',
                    ultima_edicao_em: ev.ultimaEdicaoEm || null,
                    ultima_edicao_por_id: ev.ultimaEdicaoPorId || null,
                    ultima_edicao_por_nome: ev.ultimaEdicaoPorNome || null
                };

                const { error: evError } = await _supabase
                    .from('evolucoes')
                    .upsert([evData], { onConflict: 'id' });

                if (evError) throw evError;
            }

            return true;
        } catch (err) {
            console.error("Erro ao salvar no Supabase:", err);
            if (opcoes.somenteNuvem || opcoes.exigirRastreabilidadeClinica) {
                const msg=String(err?.message||err||'');
                const dica=/realizado_em|salvo_em|edicao_limite_em|profissional_nome|ultima_edicao/i.test(msg)
                    ? '\n\nExecute primeiro a migration SUPABASE_SQL/SUPABASE_MIGRACAO_RASTREABILIDADE_CLINICA_24H_v1.11.2.sql no Supabase.' : '';
                if (!opcoes.silenciarErro) alert('❌ O registro clínico NÃO foi considerado salvo. A gravação na nuvem é obrigatória para manter o carimbo de rastreabilidade.'+dica+'\n\nDetalhe: '+msg);
                return false;
            }
            alert("⚠️ Atenção: O prontuário foi salvo neste PC, mas houve falha ao enviar para a nuvem.");
            salvarLocalStorage(pacienteObjeto);
            return true;
        }
    } else {
        if (opcoes.somenteNuvem || opcoes.exigirRastreabilidadeClinica) {
            if (!opcoes.silenciarErro) alert('❌ O registro clínico NÃO foi salvo. É necessária conexão com o Supabase para gerar o carimbo confiável de data/hora.');
            return false;
        }
        salvarLocalStorage(pacienteObjeto);
        return true;
    }
}

function salvarLocalStorage(pacienteObjeto) {
    salvarDadosResponsavelLocal(pacienteObjeto);
    let listaLocal = JSON.parse(localStorage.getItem('kinesys_prontuarios')) || [];
    const index = listaLocal.findIndex(p => p.id === pacienteObjeto.id);
    if (index >= 0) {
        listaLocal[index] = pacienteObjeto;
    } else {
        listaLocal.push(pacienteObjeto);
    }
    localStorage.setItem('kinesys_prontuarios', JSON.stringify(listaLocal));
}

/* ================= 9. CADASTRO E EDIÇÃO DO PACIENTE ================= */

function somenteDigitos(valor) {
    return (valor || "").replace(/\D/g, "");
}

/* ================= 9.1 VALIDAÇÕES CADASTRAIS — v1.8.2 =================
   Campos continuam opcionais quando já eram opcionais, porém, se preenchidos,
   precisam estar completos e consistentes antes do prontuário ser salvo.
   ========================================================================== */
function formatarCPF(valor) {
    const d = somenteDigitos(valor).slice(0, 11);
    if (d.length <= 3) return d;
    if (d.length <= 6) return `${d.slice(0,3)}.${d.slice(3)}`;
    if (d.length <= 9) return `${d.slice(0,3)}.${d.slice(3,6)}.${d.slice(6)}`;
    return `${d.slice(0,3)}.${d.slice(3,6)}.${d.slice(6,9)}-${d.slice(9,11)}`;
}

function formatarCEP(valor) {
    const d = somenteDigitos(valor).slice(0, 8);
    return d.length > 5 ? `${d.slice(0,5)}-${d.slice(5)}` : d;
}

function formatarTelefoneBR(valor) {
    const d = somenteDigitos(valor).slice(0, 11);
    if (!d) return '';
    if (d.length <= 2) return `(${d}`;
    if (d.length <= 6) return `(${d.slice(0,2)}) ${d.slice(2)}`;
    if (d.length <= 10) return `(${d.slice(0,2)}) ${d.slice(2,6)}-${d.slice(6)}`;
    return `(${d.slice(0,2)}) ${d.slice(2,7)}-${d.slice(7)}`;
}

function cpfValido(valor) {
    const cpf = somenteDigitos(valor);
    if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
    const calcular = (base, pesoInicial) => {
        let soma = 0;
        for (let i = 0; i < base.length; i++) soma += Number(base[i]) * (pesoInicial - i);
        const resto = (soma * 10) % 11;
        return resto === 10 ? 0 : resto;
    };
    const d1 = calcular(cpf.slice(0, 9), 10);
    const d2 = calcular(cpf.slice(0, 10), 11);
    return d1 === Number(cpf[9]) && d2 === Number(cpf[10]);
}

function cepValido(valor) {
    const cep = somenteDigitos(valor);
    return cep.length === 8 && !/^0{8}$/.test(cep);
}

function telefoneBRValido(valor) {
    const tel = somenteDigitos(valor);
    if (!tel) return true; // campo opcional
    if (![10, 11].includes(tel.length)) return false;
    if (/^(\d)\1+$/.test(tel)) return false;
    return tel.slice(0, 2) !== '00';
}

function definirEstadoCampo(id, valido, mensagem = '') {
    const input = document.getElementById(id);
    if (!input) return valido;
    const grupo = input.closest('.input-group');
    const erro = document.getElementById(id + '_erro');
    if (grupo) {
        grupo.classList.toggle('has-error', valido === false);
        grupo.classList.toggle('has-success', valido === true && !!String(input.value || '').trim());
    }
    input.setAttribute('aria-invalid', valido === false ? 'true' : 'false');
    if (erro) {
        erro.textContent = valido === false ? mensagem : '';
        erro.classList.toggle('show', valido === false);
    }
    return valido;
}

function limparEstadoCampo(id) {
    const input = document.getElementById(id);
    if (!input) return;
    const grupo = input.closest('.input-group');
    const erro = document.getElementById(id + '_erro');
    if (grupo) grupo.classList.remove('has-error', 'has-success');
    input.setAttribute('aria-invalid', 'false');
    if (erro) { erro.textContent = ''; erro.classList.remove('show'); }
}

function validarCPFInput(id, { obrigatorio = false } = {}) {
    const el = document.getElementById(id);
    if (!el) return true;
    const d = somenteDigitos(el.value);
    if (!d) return obrigatorio ? definirEstadoCampo(id, false, 'CPF inválido: informe os 11 números.') : (limparEstadoCampo(id), true);
    if (d.length !== 11) return definirEstadoCampo(id, false, `CPF inválido: informe 11 números. Foram digitados ${d.length}.`);
    if (!cpfValido(d)) return definirEstadoCampo(id, false, 'CPF inválido: verifique os números e os dígitos verificadores.');
    el.value = formatarCPF(d);
    return definirEstadoCampo(id, true);
}

function validarCEPInput(id, { obrigatorio = false } = {}) {
    const el = document.getElementById(id);
    if (!el) return true;
    const d = somenteDigitos(el.value);
    if (!d) return obrigatorio ? definirEstadoCampo(id, false, 'CEP inválido: informe os 8 números.') : (limparEstadoCampo(id), true);
    if (d.length !== 8) return definirEstadoCampo(id, false, `CEP inválido: informe 8 números. Foram digitados ${d.length}.`);
    if (!cepValido(d)) return definirEstadoCampo(id, false, 'CEP inválido: revise a numeração informada.');
    el.value = formatarCEP(d);
    return definirEstadoCampo(id, true);
}



/* ================= CEP INTELIGENTE (v1.8.2) =================
   Consulta endereço automaticamente após 8 dígitos.
   Provedor primário: ViaCEP. Fallback: BrasilAPI.
   A indisponibilidade da consulta NÃO bloqueia o cadastro; CEP inexistente, sim.
   ============================================================ */
const cacheCEP = new Map();
let consultaCEPController = null;
let ultimoCEPPesquisado = '';

function definirStatusCEP(tipo = '', mensagem = '') {
    const el = document.getElementById('cad_cep_status');
    if (!el) return;
    el.className = 'field-status' + (tipo ? ` show ${tipo}` : '');
    el.textContent = mensagem || '';
}

function montarEnderecoBaseCEP(dados) {
    if (!dados) return '';
    const logradouro = (dados.logradouro || dados.street || '').trim();
    const bairro = (dados.bairro || dados.neighborhood || '').trim();
    const cidade = (dados.localidade || dados.city || '').trim();
    const uf = (dados.uf || dados.state || '').trim();
    const partes = [];
    if (logradouro) partes.push(logradouro);
    if (bairro) partes.push(bairro);
    const cidadeUf = [cidade, uf].filter(Boolean).join(' - ');
    if (cidadeUf) partes.push(cidadeUf);
    return partes.join(', ');
}

async function buscarCEPViaCEP(cep) {
    const resp = await fetch(`https://viacep.com.br/ws/${cep}/json/`, {
        signal: consultaCEPController ? consultaCEPController.signal : undefined,
        headers: { 'Accept': 'application/json' }
    });
    if (!resp.ok) throw new Error(`ViaCEP HTTP ${resp.status}`);
    const dados = await resp.json();
    if (dados && dados.erro === true) {
        const erro = new Error('CEP não encontrado');
        erro.codigo = 'CEP_NAO_ENCONTRADO';
        throw erro;
    }
    return dados;
}

function buscarCEPViaJSONP(cep) {
    // Fallback para cenários em que o KineSys é aberto diretamente como arquivo local
    // e o navegador bloqueia fetch/CORS. O ViaCEP oferece callback JSONP oficialmente.
    return new Promise((resolve, reject) => {
        const callbackName = `kinesysViaCEP_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
        const script = document.createElement('script');
        const timeout = setTimeout(() => finalizar(new Error('ViaCEP JSONP timeout')), 7000);
        let concluido = false;
        function finalizar(erro, dados) {
            if (concluido) return;
            concluido = true;
            clearTimeout(timeout);
            try { delete window[callbackName]; } catch (_) { window[callbackName] = undefined; }
            script.remove();
            if (erro) reject(erro); else resolve(dados);
        }
        window[callbackName] = (dados) => {
            if (dados && dados.erro === true) {
                const erro = new Error('CEP não encontrado');
                erro.codigo = 'CEP_NAO_ENCONTRADO';
                finalizar(erro);
                return;
            }
            finalizar(null, dados || {});
        };
        script.onerror = () => finalizar(new Error('Falha ao carregar ViaCEP JSONP'));
        script.src = `https://viacep.com.br/ws/${cep}/json/?callback=${callbackName}`;
        document.head.appendChild(script);
    });
}

async function buscarCEPBrasilAPI(cep) {
    const resp = await fetch(`https://brasilapi.com.br/api/cep/v1/${cep}`, {
        signal: consultaCEPController ? consultaCEPController.signal : undefined,
        headers: { 'Accept': 'application/json' }
    });
    if (resp.status === 404) {
        const erro = new Error('CEP não encontrado');
        erro.codigo = 'CEP_NAO_ENCONTRADO';
        throw erro;
    }
    if (!resp.ok) throw new Error(`BrasilAPI HTTP ${resp.status}`);
    return await resp.json();
}

async function consultarCEPAutomaticamente({ forcar = false } = {}) {
    const cepEl = document.getElementById('cad_cep');
    const enderecoEl = document.getElementById('cad_endereco');
    if (!cepEl || !enderecoEl) return false;

    const cep = somenteDigitos(cepEl.value);
    if (cep.length !== 8 || !cepValido(cep)) {
        definirStatusCEP('', '');
        return false;
    }

    if (!forcar && cep === ultimoCEPPesquisado && cacheCEP.has(cep)) {
        const dados = cacheCEP.get(cep);
        const endereco = montarEnderecoBaseCEP(dados);
        if (endereco) {
            enderecoEl.value = endereco;
            enderecoEl.dataset.preenchidoPorCep = '1';
            enderecoEl.dataset.cepBase = endereco;
            definirStatusCEP('success', '✓ Endereço preenchido pelo CEP. Acrescente apenas número e complemento.');
            return true;
        }
    }

    if (consultaCEPController) consultaCEPController.abort();
    consultaCEPController = new AbortController();
    ultimoCEPPesquisado = cep;
    definirStatusCEP('loading', 'Consultando endereço do CEP…');

    let dados = null;
    let naoEncontradoConfirmado = false;

    try {
        try {
            dados = await buscarCEPViaCEP(cep);
        } catch (erroViaCEP) {
            if (erroViaCEP?.name === 'AbortError') return false;
            if (erroViaCEP?.codigo === 'CEP_NAO_ENCONTRADO') naoEncontradoConfirmado = true;

            // 2ª tentativa: JSONP do próprio ViaCEP. É especialmente útil quando o
            // sistema é executado como arquivo local e o navegador restringe fetch/CORS.
            try {
                dados = await buscarCEPViaJSONP(cep);
                naoEncontradoConfirmado = false;
            } catch (erroJSONP) {
                if (erroJSONP?.codigo === 'CEP_NAO_ENCONTRADO') naoEncontradoConfirmado = true;

                // 3ª tentativa: BrasilAPI.
                try {
                    dados = await buscarCEPBrasilAPI(cep);
                    naoEncontradoConfirmado = false;
                } catch (erroBrasilAPI) {
                    if (erroBrasilAPI?.name === 'AbortError') return false;
                    if (erroBrasilAPI?.codigo === 'CEP_NAO_ENCONTRADO') {
                        naoEncontradoConfirmado = true;
                    } else if (!naoEncontradoConfirmado) {
                        throw erroBrasilAPI;
                    }
                }
            }
        }

        if (!dados && naoEncontradoConfirmado) {
            definirEstadoCampo('cad_cep', false, 'CEP inválido: não foi encontrado nas bases consultadas.');
            definirStatusCEP('', '');
            // Só limpa se o endereço foi preenchido automaticamente anteriormente.
            if (enderecoEl.dataset.preenchidoPorCep === '1') {
                enderecoEl.value = '';
                delete enderecoEl.dataset.preenchidoPorCep;
                delete enderecoEl.dataset.cepBase;
            }
            return false;
        }
        if (!dados) throw new Error('Consulta sem resposta');

        cacheCEP.set(cep, dados);
        const endereco = montarEnderecoBaseCEP(dados);
        cepEl.value = formatarCEP(dados.cep || cep);
        definirEstadoCampo('cad_cep', true);

        if (endereco) {
            enderecoEl.value = endereco;
            enderecoEl.dataset.preenchidoPorCep = '1';
            enderecoEl.dataset.cepBase = endereco;
            definirStatusCEP('success', '✓ Endereço preenchido pelo CEP. Acrescente apenas número e complemento.');
            // Facilita o fluxo da secretaria: após o CEP, já vai para o endereço.
            setTimeout(() => {
                if (document.activeElement === cepEl) {
                    enderecoEl.focus();
                    try { enderecoEl.setSelectionRange(enderecoEl.value.length, enderecoEl.value.length); } catch (_) {}
                }
            }, 0);
        } else {
            definirStatusCEP('warning', 'CEP localizado, mas a base não informou logradouro. Complete o endereço manualmente.');
        }
        return true;
    } catch (erro) {
        if (erro?.name === 'AbortError') return false;
        console.warn('KineSys: consulta automática de CEP indisponível.', erro);
        // Importante: indisponibilidade externa não impede atender/cadastrar paciente.
        definirStatusCEP('warning', 'Não foi possível consultar o endereço agora. O CEP continua válido; preencha o endereço manualmente.');
        return false;
    }
}

async function buscarCEPPeloBotao() {
    const ok = validarCEPInput('cad_cep');
    if (!ok) return false;
    return await consultarCEPAutomaticamente({ forcar: true });
}

function validarTelefoneInput(id) {
    const el = document.getElementById(id);
    if (!el) return true;
    const d = somenteDigitos(el.value);
    if (!d) { limparEstadoCampo(id); return true; }
    if (![10,11].includes(d.length)) return definirEstadoCampo(id, false, `Telefone inválido: informe DDD + número (10 ou 11 dígitos). Foram digitados ${d.length}.`);
    if (!telefoneBRValido(d)) return definirEstadoCampo(id, false, 'Telefone inválido: revise DDD e número informados.');
    el.value = formatarTelefoneBR(d);
    return definirEstadoCampo(id, true);
}

function alternarCamposResponsavel() {
    const chk = document.getElementById('cad_dependente');
    const bloco = document.getElementById('cad_responsavel_bloco');
    if (!chk || !bloco) return;
    bloco.style.display = chk.checked ? 'block' : 'none';
    bloco.setAttribute('aria-hidden', chk.checked ? 'false' : 'true');
    if (!chk.checked) {
        limparEstadoCampo('cad_responsavel_telefone');
        limparEstadoCampo('cad_responsavel_nome');
    }
}

function validarResponsavelCadastro() {
    const dependente = !!document.getElementById('cad_dependente')?.checked;
    if (!dependente) return true;
    const nome = document.getElementById('cad_responsavel_nome');
    const telefone = document.getElementById('cad_responsavel_telefone');
    if (!nome?.value.trim()) {
        return definirEstadoCampo('cad_responsavel_nome', false, 'Informe o nome do responsável pelo paciente.');
    }
    definirEstadoCampo('cad_responsavel_nome', true);
    if (!telefone?.value.trim()) {
        return definirEstadoCampo('cad_responsavel_telefone', false, 'Informe o telefone/WhatsApp do responsável.');
    }
    return validarTelefoneInput('cad_responsavel_telefone');
}

function configurarValidacoesCadastrais() {
    const cpfIds = ['cad_cpf', 'eq_cpf'];
    cpfIds.forEach(id => {
        const el = document.getElementById(id);
        if (!el || el.dataset.validacaoConfigurada) return;
        el.dataset.validacaoConfigurada = '1';
        el.addEventListener('input', () => {
            el.value = formatarCPF(el.value);
            const n = somenteDigitos(el.value).length;
            if (n === 11) validarCPFInput(id); else limparEstadoCampo(id);
        });
        el.addEventListener('blur', () => validarCPFInput(id));
    });

    const cep = document.getElementById('cad_cep');
    if (cep && !cep.dataset.validacaoConfigurada) {
        cep.dataset.validacaoConfigurada = '1';
        let timerCEP = null;
        const dispararConsultaCEP = () => {
            if (timerCEP) clearTimeout(timerCEP);
            const n = somenteDigitos(cep.value).length;
            if (n === 8 && validarCEPInput('cad_cep')) {
                // Consulta praticamente imediata. O pequeno atraso só consolida paste/input
                // no mesmo ciclo e evita duas chamadas idênticas consecutivas.
                timerCEP = setTimeout(() => consultarCEPAutomaticamente({ forcar: true }), 40);
            }
        };
        cep.addEventListener('input', () => {
            cep.value = formatarCEP(cep.value);
            const n = somenteDigitos(cep.value).length;
            definirStatusCEP('', '');
            if (n === 8) dispararConsultaCEP();
            else {
                if (timerCEP) clearTimeout(timerCEP);
                limparEstadoCampo('cad_cep');
                ultimoCEPPesquisado = '';
            }
        });
        cep.addEventListener('change', dispararConsultaCEP);
        cep.addEventListener('paste', () => setTimeout(dispararConsultaCEP, 0));
        cep.addEventListener('blur', async () => {
            const ok = validarCEPInput('cad_cep');
            if (ok && somenteDigitos(cep.value).length === 8) await consultarCEPAutomaticamente({ forcar: true });
        });
    }

    const tel = document.getElementById('cad_telefone');
    if (tel && !tel.dataset.validacaoConfigurada) {
        tel.dataset.validacaoConfigurada = '1';
        tel.addEventListener('input', () => { tel.value = formatarTelefoneBR(tel.value); limparEstadoCampo('cad_telefone'); });
        tel.addEventListener('blur', () => validarTelefoneInput('cad_telefone'));
    }

    const nomeResp = document.getElementById('cad_responsavel_nome');
    if (nomeResp && !nomeResp.dataset.validacaoConfigurada) {
        nomeResp.dataset.validacaoConfigurada = '1';
        nomeResp.addEventListener('input', () => limparEstadoCampo('cad_responsavel_nome'));
    }

    const telResp = document.getElementById('cad_responsavel_telefone');
    if (telResp && !telResp.dataset.validacaoConfigurada) {
        telResp.dataset.validacaoConfigurada = '1';
        telResp.addEventListener('input', () => { telResp.value = formatarTelefoneBR(telResp.value); limparEstadoCampo('cad_responsavel_telefone'); });
        telResp.addEventListener('blur', () => { if (document.getElementById('cad_dependente')?.checked) validarTelefoneInput('cad_responsavel_telefone'); });
    }
}

document.addEventListener('DOMContentLoaded', configurarValidacoesCadastrais);

async function salvarCadastroSomente(redirecionar = true) {
    const nome = document.getElementById('cad_nome').value.trim();
    if (!nome) {
        alert("⚠️ O campo Nome Completo é obrigatório.");
        return null;
    }

    const cadastroValido = [
        validarCPFInput('cad_cpf'),
        validarCEPInput('cad_cep'),
        validarTelefoneInput('cad_telefone'),
        validarResponsavelCadastro()
    ].every(Boolean);
    if (!cadastroValido) {
        const primeiroErro = document.querySelector('#tela_cadastro .input-group.has-error input');
        if (primeiroErro) primeiroErro.focus();
        alert('⚠️ Corrija os campos destacados em vermelho antes de salvar o cadastro.');
        return null;
    }

    const cpfDigitado = document.getElementById('cad_cpf').value.trim();
    if (cpfDigitado && somenteDigitos(cpfDigitado).length > 0) {
        const listaAtual = await obterPacientesSalvos();
        const cpfConflito = listaAtual.find(p =>
            p.id !== pacienteAtualId &&
            p.cpf && somenteDigitos(p.cpf) === somenteDigitos(cpfDigitado)
        );
        if (cpfConflito) {
            alert(`⚠️ Já existe um paciente cadastrado com este CPF: "${cpfConflito.nome}".\n\nAbra o prontuário dele na tela "Prontuários" para editar, em vez de criar um cadastro novo.`);
            return null;
        }
    }

    const idFinal = pacienteAtualId ? pacienteAtualId : "pac_" + Date.now();
    const timestampAgra = pacienteAtualId ? undefined : new Date().getTime();

    let pacienteExistente = {};
    if (pacienteAtualId) {
        const lista = await obterPacientesSalvos();
        pacienteExistente = lista.find(p => p.id === pacienteAtualId) || {};
    }

    const nomeResponsavel = usuarioLogado ? usuarioLogado.nome : "Desconhecido";

    const novoPaciente = {
        ...pacienteExistente,
        id: idFinal,
        dataCadastro: pacienteExistente.dataCadastro || new Date().toLocaleDateString('pt-BR'),
        cadastradoPor: pacienteExistente.cadastradoPor || nomeResponsavel,
        nome: nome,
        cpf: document.getElementById('cad_cpf').value.trim(),
        nascimento: document.getElementById('cad_nascimento').value,
        idade: document.getElementById('cad_idade').value,
        sexo: document.getElementById('cad_sexo').value,
        estadoCivil: document.getElementById('cad_estado_civil').value,
        telefone: document.getElementById('cad_telefone').value.trim(),
        dependente: !!document.getElementById('cad_dependente')?.checked,
        responsavelNome: document.getElementById('cad_dependente')?.checked ? document.getElementById('cad_responsavel_nome')?.value.trim() || '' : '',
        responsavelParentesco: document.getElementById('cad_dependente')?.checked ? document.getElementById('cad_responsavel_parentesco')?.value || '' : '',
        responsavelTelefone: document.getElementById('cad_dependente')?.checked ? document.getElementById('cad_responsavel_telefone')?.value.trim() || '' : '',
        profissao: document.getElementById('cad_profissao').value.trim(),
        cep: document.getElementById('cad_cep').value.trim(),
        endereco: document.getElementById('cad_endereco').value.trim()
    };

    if (timestampAgra) novoPaciente.timestampCadastro = timestampAgra;
    if (!novoPaciente.evolucoes) novoPaciente.evolucoes = [];
    if (!novoPaciente.avaliacoes) novoPaciente.avaliacoes = [];

    const sucesso = await salvarPacienteNaNuvem(novoPaciente);
    
    if (sucesso) {
        if (redirecionar) {
            alert(pacienteAtualId ? "✅ Cadastro atualizado com sucesso!" : "✅ Cadastro salvo na nuvem e disponível para avaliação!");
            pacienteAtualId = null;
            
            ['cad_nome','cad_cpf','cad_nascimento','cad_idade','cad_sexo','cad_estado_civil','cad_telefone','cad_profissao','cad_responsavel_nome','cad_responsavel_parentesco','cad_responsavel_telefone','cad_cep','cad_endereco'].forEach(id => {
                if(document.getElementById(id)) document.getElementById(id).value = "";
            });
            const chkDependente = document.getElementById('cad_dependente');
            if (chkDependente) chkDependente.checked = false;
            alternarCamposResponsavel();
            ['cad_cpf','cad_cep','cad_telefone','cad_responsavel_nome','cad_responsavel_telefone'].forEach(limparEstadoCampo);
            definirStatusCEP('', '');
            ultimoCEPPesquisado = '';
            const cadEndereco = document.getElementById('cad_endereco');
            if (cadEndereco) { delete cadEndereco.dataset.preenchidoPorCep; delete cadEndereco.dataset.cepBase; }
            if(document.getElementById('titulo_tela_cadastro')) document.getElementById('titulo_tela_cadastro').innerText = "Cadastro Geral do Paciente";
            
            navegarPara('tela_home');
        }
        return novoPaciente;
    }
    return null;
}

async function salvarEIniciarAvaliacao() {
    // Proteção de rota: se um perfil administrativo disparar este fluxo por
    // teclado, HTML antigo em cache ou qualquer outro caminho residual, salva
    // normalmente e retorna ao fluxo permitido — sem tentar abrir Avaliação e
    // sem gerar o pop-up de acesso negado após o cadastro.
    if (!telaPermitida('tela_avaliacao')) {
        return await salvarCadastroSomente(true);
    }

    const paciente = await salvarCadastroSomente(false);
    if (paciente) {
        pacienteAtualId = paciente.id;
        
        document.getElementById('paciente_nome').value = paciente.nome;
        if (paciente.idade) document.getElementById('paciente_idade').value = paciente.idade.replace(' anos', '').trim();
        if (paciente.profissao) document.getElementById('paciente_ocupacao').value = paciente.profissao;
        
        navegarPara('tela_avaliacao', true);
    }
}

async function editarCadastro(id) {
    const lista = await obterPacientesSalvos();
    const p = lista.find(item => item.id === id);
    if (!p) return;

    pacienteAtualId = p.id;

    document.getElementById('titulo_tela_cadastro').innerText = "✏️ Editar Cadastro do Paciente";

    document.getElementById('cad_nome').value = p.nome || "";
    document.getElementById('cad_cpf').value = p.cpf || "";
    document.getElementById('cad_nascimento').value = p.nascimento || "";
    document.getElementById('cad_idade').value = p.idade || "";
    document.getElementById('cad_sexo').value = p.sexo || "";
    document.getElementById('cad_estado_civil').value = p.estadoCivil || "";
    document.getElementById('cad_telefone').value = p.telefone || "";
    document.getElementById('cad_profissao').value = p.profissao || "";
    const chkDependente = document.getElementById('cad_dependente');
    if (chkDependente) chkDependente.checked = pacienteEhDependente(p);
    document.getElementById('cad_responsavel_nome').value = p.responsavelNome || p.responsavel_nome || "";
    document.getElementById('cad_responsavel_parentesco').value = p.responsavelParentesco || p.responsavel_parentesco || "";
    document.getElementById('cad_responsavel_telefone').value = p.responsavelTelefone || p.responsavel_telefone || "";
    document.getElementById('cad_cep').value = p.cep || "";
    document.getElementById('cad_endereco').value = p.endereco || "";
    definirStatusCEP('', '');
    ultimoCEPPesquisado = somenteDigitos(p.cep || '');

    navegarPara('tela_cadastro', true);
    alternarCamposResponsavel();
    atualizarAcoesCadastroPorPerfil();
}

/* ================= 10. AVALIAÇÃO ================= */

/* Rastreabilidade clínica v1.11.2
   - realizadoEm = data/hora clínica declarada do atendimento/procedimento.
   - salvoEm = primeiro carimbo de gravação, protegido também no banco pela migration.
   - edicaoLimiteEm = janela fixa de 24 h calculada no primeiro registro.
   O relógio de edição nunca é recalculado quando a data clínica é corrigida. */
function valorDatetimeLocalAgora(data = new Date()) {
    const d = new Date(data);
    const pad = n => String(n).padStart(2,'0');
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function datetimeLocalParaISO(valor) {
    if (!valor) return null;
    const d = new Date(valor);
    return Number.isFinite(d.getTime()) ? d.toISOString() : null;
}
function formatarDataHoraClinica(valor, incluirSegundos=false) {
    if (!valor) return 'N/I';
    const d = new Date(valor);
    if (!Number.isFinite(d.getTime())) return String(valor);
    return d.toLocaleString('pt-BR', {day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit',...(incluirSegundos?{second:'2-digit'}:{})});
}
function obterRealizadoEmRegistro(reg={}) {
    return reg.realizadoEm || reg.realizado_em || reg.dataHoraRealizacao || reg.data_hora_realizacao || reg.dataHoraISO || reg.data_hora_iso || (reg.data ? `${reg.data}T12:00:00` : null);
}
function obterSalvoEmRegistro(reg={}) {
    return reg.salvoEm || reg.salvo_em || reg.dataHoraISO || reg.data_hora_iso || null;
}
function obterLimiteEdicaoRegistro(reg={}) {
    const explicito = reg.edicaoLimiteEm || reg.edicao_limite_em;
    if (explicito) return explicito;
    const realizado = obterRealizadoEmRegistro(reg);
    const d = realizado ? new Date(realizado) : null;
    return d && Number.isFinite(d.getTime()) ? new Date(d.getTime()+24*60*60*1000).toISOString() : null;
}
function registroClinicoPodeEditar(reg={}) {
    const limite = obterLimiteEdicaoRegistro(reg);
    if (!limite) return false;
    const t = new Date(limite).getTime();
    return Number.isFinite(t) && Date.now() <= t;
}
function textoJanelaEdicaoRegistro(reg={}) {
    const limite = obterLimiteEdicaoRegistro(reg);
    return limite ? (registroClinicoPodeEditar(reg) ? `Editável até ${formatarDataHoraClinica(limite)}` : `Edição encerrada em ${formatarDataHoraClinica(limite)}`) : 'Janela de edição não disponível';
}
function profissionalRegistroClinico(reg={}) {
    const nome = reg.profissionalNome || reg.profissional_nome || reg.realizadoPor || reg.realizado_por || reg.profissional || 'N/I';
    const registro = reg.profissionalRegistro || reg.profissional_registro || '';
    return registro && !String(nome).includes(registro) ? `${nome} · ${registro}` : nome;
}
function validarRealizacaoClinicaInput(idCampo) {
    const el = document.getElementById(idCampo);
    const iso = datetimeLocalParaISO(el?.value || '');
    if (!iso) { alert('⚠️ Informe a data e a hora em que o atendimento foi realizado.'); el?.focus(); return null; }
    const t = new Date(iso).getTime();
    if (t > Date.now() + 5*60*1000) { alert('⚠️ A data/hora de realização não pode estar no futuro.'); el?.focus(); return null; }
    return iso;
}
function metadadosProfissionalLogado() {
    return {
        profissionalId: usuarioLogado?.id || null,
        profissionalNome: usuarioLogado?.nome || 'Desconhecido',
        profissionalRegistro: usuarioLogado?.registro || ''
    };
}
function renderizarRegistrosAvaliacao(p) {
    const c=document.getElementById('avaliacao_registros_paciente'); if(!c)return;
    const avs=obterAvaliacoes(p||{}).slice().reverse();
    if(!p||!avs.length){c.style.display='none';c.innerHTML='';return;}
    c.style.display='block';
    c.innerHTML=`<div class="kds-u-jc-between kds-u-gap-12px kds-u-ai-center kds-u-mb-8px kds-u-d-flex"><strong class="kds-u-fs-meta kds-u-text-petrol">Rastreabilidade das avaliações</strong><span class="kds-u-fs-meta kds-u-text-muted">Edição: até 24 h da realização</span></div>`+avs.map(av=>{
        const pode=registroClinicoPodeEditar(av), salvo=obterSalvoEmRegistro(av), realizado=obterRealizadoEmRegistro(av);
        return `<div class="kds-u-p-10px-12px kds-u-border-1px-solid-e4ece9 kds-u-br-9px kds-u-bg-mint-surface kds-u-mt-7px kds-u-gap-12px kds-u-jc-between kds-u-ai-center kds-u-d-flex"><div class="kds-u-minw-0"><div class="kds-u-fw-750 kds-u-fs-meta kds-u-text-petrol">${escapeHTML(av.tipo||'Avaliação')} · ${escapeHTML(av.status||'registrada')}</div><div class="kds-u-fs-meta kds-u-text-muted kds-u-mt-3px">Realizada: ${escapeHTML(formatarDataHoraClinica(realizado))} · ${escapeHTML(profissionalRegistroClinico(av))}</div><div class="kds-u-fs-meta kds-u-text-muted">Salva: ${escapeHTML(formatarDataHoraClinica(salvo,true))} · ${escapeHTML(textoJanelaEdicaoRegistro(av))}${av.ultimaEdicaoEm?` · Última edição: ${escapeHTML(formatarDataHoraClinica(av.ultimaEdicaoEm,true))}${av.ultimaEdicaoPorNome?` por ${escapeHTML(av.ultimaEdicaoPorNome)}`:''}`:''}</div></div>${pode?`<button type="button" class="btn-secondary kds-u-p-6px-10px kds-u-fs-meta kds-u-ws-nowrap" onclick="editarAvaliacaoClinica('${escapeHTML(p.id)}','${escapeHTML(av.id)}')">✏️ Editar</button>`:`<span class="kds-u-fs-meta kds-u-text-lock kds-u-ws-nowrap">🔒 Bloqueada</span>`}</div>`;
    }).join('');
}
async function editarAvaliacaoClinica(pacienteId, avaliacaoId) {
    const lista=await obterPacientesSalvos(), p=lista.find(x=>String(x.id)===String(pacienteId));
    const av=p?obterAvaliacoes(p).find(x=>String(x.id)===String(avaliacaoId)):null;
    if(!p||!av){alert('⚠️ Avaliação não encontrada.');return;}
    if(!registroClinicoPodeEditar(av)){alert(`🔒 O prazo de edição desta avaliação terminou em ${formatarDataHoraClinica(obterLimiteEdicaoRegistro(av))}. O registro permanece disponível apenas para consulta.`);return;}
    await carregarPacienteParaEdicao(p.id, av.id);
}

function obterAvaliacoes(p) {
    return p.avaliacoes || [];
}
function obterAvaliacaoMaisRecente(p) {
    const lista = obterAvaliacoes(p);
    return lista.length > 0 ? lista[lista.length - 1] : null;
}
function obterAvaliacaoFinalizadaMaisRecente(p){const lista=obterAvaliacoes(p).filter(a=>a.status!=='rascunho');return lista.length?lista[lista.length-1]:null;}

/* salvarAvaliacaoAtual legado removido na v1.4 */

/* ================= 11. PRONTUÁRIOS E BUSCA ================= */
async function renderizarTabelaProntuarios(filtro = "") {
    if (typeof window.renderProntuarioCardsKineSys === 'function') {
        return window.renderProntuarioCardsKineSys(filtro);
    }
    console.warn('KineSys: renderizador moderno de prontuários ainda não foi inicializado.');
}

function filtrarPacientesSalvos() {
    return renderizarTabelaProntuarios(document.getElementById('input_busca_paciente')?.value || '');
}

async function renderizarPacientesRecentesHome() {
    const container = document.getElementById('lista_pacientes_recentes');
    if (!container) return;

    const lista = await obterPacientesSalvos();
    if (lista.length === 0) {
        container.innerHTML = `<p class="kds-u-text-muted kds-u-fs-ui kds-u-ta-center kds-u-p-20px">Nenhum prontuário salvo recentemente.</p>`;
        return;
    }

    const recentes = lista.slice(-3).reverse();
    let html = `<table class="tabela-pacientes"><thead><tr><th>Data</th><th>Nome</th><th>Profissão</th><th>Ação</th></tr></thead><tbody>`;

    recentes.forEach(p => {
        html += `
            <tr>
                <td>${escapeHTML(p.dataCadastro)}</td>
                <td><strong>${escapeHTML(p.nome)}</strong></td>
                <td>${escapeHTML(p.profissao || "-")}</td>
                <td><button class="btn-nav btn-compact" onclick="carregarPacienteParaEdicao('${escapeHTML(p.id)}')">Abrir ➔</button></td>
            </tr>
        `;
    });

    html += `</tbody></table>`;
    container.innerHTML = html;
}

async function carregarPacienteParaEdicao(id, avaliacaoIdEditar = null) {
    const lista = await obterPacientesSalvos();
    const p = lista.find(item => item.id === id);
    if (!p) return;

    pacienteAtualId = p.id;
    avaliacaoEdicaoId = avaliacaoIdEditar || null;
    estadoMapeamento = {};
    mapeamentoAvaliacaoAnterior = null; // será preenchido abaixo se houver avaliação anterior com mapeamento
    if (document.getElementById('grupo_regioes_mapeamento')) document.getElementById('grupo_regioes_mapeamento').innerHTML = '';
    if (document.getElementById('container_clusters_regioes')) document.getElementById('container_clusters_regioes').innerHTML = '';

    document.getElementById('paciente_nome').value = p.nome || "";
    if (p.idade) document.getElementById('paciente_idade').value = p.idade.replace(' anos', '').trim();
    if (p.profissao) document.getElementById('paciente_ocupacao').value = p.profissao || "";

    const avaliacaoRecente = avaliacaoIdEditar ? obterAvaliacoes(p).find(a=>String(a.id)===String(avaliacaoIdEditar)) : obterAvaliacaoMaisRecente(p);
    if (avaliacaoRecente) {
        if (avaliacaoIdEditar && avaliacaoRecente.mapeamento?.detalhes) estadoMapeamento = JSON.parse(JSON.stringify(avaliacaoRecente.mapeamento.detalhes));
        const realizadoEl=document.getElementById('avaliacao_realizado_em');
        if(realizadoEl){ realizadoEl.value=avaliacaoIdEditar?valorDatetimeLocalAgora(obterRealizadoEmRegistro(avaliacaoRecente)):valorDatetimeLocalAgora(); realizadoEl.disabled=!!avaliacaoIdEditar; }
        if (avaliacaoRecente.idade) document.getElementById('paciente_idade').value = avaliacaoRecente.idade;
        if (avaliacaoRecente.profissao) document.getElementById('paciente_ocupacao').value = avaliacaoRecente.profissao;
        if (avaliacaoRecente.esporte && document.getElementById('paciente_esporte')) {
            document.getElementById('paciente_esporte').value = avaliacaoRecente.esporte;
        }
        document.getElementById('paciente_hma').value = avaliacaoRecente.hma || "";

        if (avaliacaoRecente.comorbidades) {
            document.getElementById('chk_tabagista').checked = avaliacaoRecente.comorbidades.tabagista || false;
            document.getElementById('chk_etilista').checked = avaliacaoRecente.comorbidades.etilista || false;
            document.getElementById('chk_hipertenso').checked = avaliacaoRecente.comorbidades.hipertenso || false;
            document.getElementById('chk_diabetico').checked = avaliacaoRecente.comorbidades.diabetico || false;
            document.getElementById('chk_corticoide').checked = avaliacaoRecente.comorbidades.corticoide || false;
            if (document.getElementById('chk_corticoide_sistemico')) document.getElementById('chk_corticoide_sistemico').checked = avaliacaoRecente.comorbidades.corticoide_sistemico || false;
            if (document.getElementById('chk_corticoide_infiltracao')) document.getElementById('chk_corticoide_infiltracao').checked = avaliacaoRecente.comorbidades.corticoide_infiltracao || false;
            if (document.getElementById('chk_aine_recente')) document.getElementById('chk_aine_recente').checked = avaliacaoRecente.comorbidades.aine_recente || false;
            document.getElementById('chk_cirurgia').checked = avaliacaoRecente.comorbidades.cirurgia || false;
        }

        const contextoMotorAnterior = avaliacaoRecente.mapeamento && avaliacaoRecente.mapeamento.contextoMotor;
        if (contextoMotorAnterior) {
            const fonte = contextoMotorAnterior.fonteDados || {};
            if (document.getElementById('origem_informacao_clinica') && fonte.origem) document.getElementById('origem_informacao_clinica').value = fonte.origem;
            if (document.getElementById('confirmacao_documental') && fonte.confirmacao) document.getElementById('confirmacao_documental').value = fonte.confirmacao;
            (contextoMotorAnterior.exposicoesOcupacionais || []).forEach(v => { const el = document.querySelector(`.chk_exposicao_ocupacional[value="${v}"]`); if (el) el.checked = true; });
            const carga = contextoMotorAnterior.cargaEsportiva || {};
            if (document.getElementById('esporte_frequencia')) document.getElementById('esporte_frequencia').value = carga.frequenciaSemanal || '';
            if (document.getElementById('esporte_duracao')) document.getElementById('esporte_duracao').value = carga.duracaoMinutos || '';
            if (document.getElementById('esporte_nivel')) document.getElementById('esporte_nivel').value = carga.nivel || '';
            if (document.getElementById('esporte_mudanca_carga')) document.getElementById('esporte_mudanca_carga').value = carga.mudancaCarga4Semanas || '';
            (carga.exposicoes || []).forEach(v => { const el = document.querySelector(`.chk_exposicao_esportiva[value="${v}"]`); if (el) el.checked = true; });
            const yf = contextoMotorAnterior.yellowFlags || {};
            (yf.itens || []).forEach(v => { const el = document.querySelector(`.chk_yellow_flag[value="${v}"]`); if (el) el.checked = true; });
            if (document.getElementById('yellow_flags_observacao')) document.getElementById('yellow_flags_observacao').value = yf.observacao || '';
            const med = contextoMotorAnterior.medicamentosEstruturados || {};
            if (document.getElementById('chk_corticoide_sistemico')) document.getElementById('chk_corticoide_sistemico').checked = !!med.corticoideSistemico;
            if (document.getElementById('chk_corticoide_infiltracao')) document.getElementById('chk_corticoide_infiltracao').checked = !!med.corticoideInfiltracao;
            if (document.getElementById('chk_aine_recente')) document.getElementById('chk_aine_recente').checked = !!med.aineRecente;
        }

        if (avaliacaoRecente.mapeamento?.clinicaEstruturada) preencherClinicaEstruturada(avaliacaoRecente.mapeamento.clinicaEstruturada);
        else preencherClinicaEstruturada({});

        if (document.getElementById('eva_slider') && avaliacaoRecente.evaInicial != null) {
            document.getElementById('eva_slider').value = avaliacaoRecente.evaInicial;
            document.getElementById('eva_slider').dispatchEvent(new Event('input'));
        }

        if (obterAvaliacoes(p).length > 0) {
            const btnSalvar = document.getElementById('btn_salvar_avaliacao_rapida');
            if (btnSalvar) btnSalvar.innerText = avaliacaoIdEditar ? '💾 Salvar alterações da avaliação' : `💾 Registrar Reavaliação (${obterAvaliacoes(p).length}ª já registrada)`;
        }

        // REAVALIAÇÃO PUXA OS TESTES ANTERIORES: se a avaliação mais recente
        // já tem um Mapeamento Anatômico salvo, guardamos como referência —
        // as regiões testadas serão pré-marcadas e cada teste mostrará o
        // resultado anterior ao lado, pra facilitar comparar a evolução.
        if (avaliacaoRecente.mapeamento && avaliacaoRecente.mapeamento.detalhes) {
            mapeamentoAvaliacaoAnterior = {
                data: avaliacaoRecente.dataAvaliacao,
                detalhes: avaliacaoRecente.mapeamento.detalhes,
                resumoPorRegiao: avaliacaoRecente.mapeamento.resumoPorRegiao || []
            };
        }
    } else {
        const btnSalvar = document.getElementById('btn_salvar_avaliacao_rapida');
        if (btnSalvar) btnSalvar.innerText = '💾 Salvar Avaliação';
    }

    renderizarRegistrosAvaliacao(p);
    if (!avaliacaoRecente) { const realizadoEl=document.getElementById('avaliacao_realizado_em'); if(realizadoEl){realizadoEl.disabled=false;realizadoEl.value=valorDatetimeLocalAgora();} }
    irParaSubtela('subtela_triagem');
    navegarPara('tela_avaliacao', true);
}

function erroTabelaPacienteAusente(err) {
    return /does not exist|relation .* does not exist|schema cache|could not find the table/i.test(String(err?.message || err || ''));
}

function limparDadosLocaisPacienteExcluido(id) {
    const pid = String(id || '');
    if (!pid) return;
    try {
        let lista = JSON.parse(localStorage.getItem('kinesys_prontuarios') || '[]');
        if (Array.isArray(lista)) localStorage.setItem('kinesys_prontuarios', JSON.stringify(lista.filter(p => String(p.id || '') !== pid)));
    } catch (_) {}
    try {
        const base = JSON.parse(localStorage.getItem(KINESYS_RESPONSAVEIS_KEY) || '{}');
        delete base[pid];
        localStorage.setItem(KINESYS_RESPONSAVEIS_KEY, JSON.stringify(base));
    } catch (_) {}
    try {
        const base = JSON.parse(localStorage.getItem('kinesys_documentos_timeline') || '{}');
        delete base[pid];
        localStorage.setItem('kinesys_documentos_timeline', JSON.stringify(base));
    } catch (_) {}
    try {
        const pend = JSON.parse(localStorage.getItem('kinesys_agendamentos_pendentes_sync_v1') || '[]');
        if (Array.isArray(pend)) localStorage.setItem('kinesys_agendamentos_pendentes_sync_v1', JSON.stringify(pend.filter(x => String(x?.payload?.paciente_id || '') !== pid)));
    } catch (_) {}
    ['kinesys_financeiro_planos_v1112','kinesys_financeiro_pagamentos_v1112','kinesys_financeiro_pagamentos_excluidos_v1112','kinesys_financeiro_agenda_vinculos_v1112'].forEach(chave => {
        try {
            const lista = JSON.parse(localStorage.getItem(chave) || '[]');
            if (Array.isArray(lista)) localStorage.setItem(chave, JSON.stringify(lista.filter(x => String(x?.paciente_id || '') !== pid)));
        } catch (_) {}
    });
    try {
        const ctx = localStorage.getItem('kinesys_paciente_contexto') || '';
        if (String(ctx) === pid) localStorage.removeItem('kinesys_paciente_contexto');
    } catch (_) {}
    try {
        const r = JSON.parse(localStorage.getItem('kinesys_rascunho_avaliacao_v11') || 'null');
        if (r && String(r.pacienteAtualId || r.paciente_id || r.pacienteId || '') === pid) localStorage.removeItem('kinesys_rascunho_avaliacao_v11');
    } catch (_) {}
}

async function excluirPacienteNuvemSeguro(id) {
    if (!_supabase) throw new Error('Supabase indisponível. A exclusão definitiva exige conexão com a nuvem.');

    // Preferência: RPC transacional da migration de exclusão segura.
    try {
        const rpc = await _supabase.rpc('kinesys_excluir_paciente_completo', { p_paciente_id: id });
        if (!rpc.error) return { modo: 'transacional', resultado: rpc.data || null };
        if (!/kinesys_excluir_paciente_completo|function .* does not exist|schema cache|PGRST202/i.test(String(rpc.error?.message || rpc.error || ''))) {
            throw rpc.error;
        }
    } catch (err) {
        if (!/kinesys_excluir_paciente_completo|function .* does not exist|schema cache|PGRST202/i.test(String(err?.message || err || ''))) throw err;
    }

    // Compatibilidade com instalações que ainda não executaram a migration nova.
    // O paciente é removido por último; se algum vínculo obrigatório falhar, o
    // cadastro principal permanece e o sistema informa a falha.
    const tabelasDependentes = [
        'pagamentos', 'agendamentos', 'lista_espera', 'arquivos_paciente',
        'evolucoes', 'avaliacoes', 'planos_atendimento'
    ];
    for (const tabela of tabelasDependentes) {
        const { error } = await _supabase.from(tabela).delete().eq('paciente_id', id);
        if (error && !erroTabelaPacienteAusente(error)) throw new Error(`Não foi possível excluir ${tabela}: ${error.message || error}`);
    }
    const { error: pacienteError } = await _supabase.from('pacientes').delete().eq('id', id);
    if (pacienteError) throw pacienteError;
    return { modo: 'compatibilidade' };
}

async function excluirArquivosLocaisPaciente(id) {
    if (typeof kinesysLocalFetch !== 'function') return { ok: false, indisponivel: true };
    try {
        const r = await kinesysLocalFetch('/api/patient-delete', {
            method: 'POST',
            body: { patient_id: id, confirm_delete: true }
        }, 7000);
        return { ok: true, ...r };
    } catch (err) {
        // Serviço antigo não possui esta rota. O cadastro em nuvem não deve ser
        // restaurado por isso; apenas avisamos sobre os originais locais.
        return { ok: false, indisponivel: true, error: err };
    }
}

async function excluirPaciente(id) {
    if (!usuarioEhMaster()) {
        alert('🔒 Apenas Administrador pode excluir definitivamente um cadastro de paciente.');
        return false;
    }
    const lista = await obterPacientesSalvos();
    const paciente = lista.find(p => String(p.id) === String(id));
    if (!paciente) { alert('⚠️ Paciente não encontrado. Atualize a lista e tente novamente.'); return false; }

    const nome = paciente.nome || 'este paciente';
    const confirmado = await confirmarKineSys(
        `Você está prestes a excluir DEFINITIVAMENTE o cadastro de ${nome}.\n\n` +
        `Serão removidos o cadastro, avaliações, evoluções, agendamentos, lista de espera, planos/pagamentos e vínculos de fotos/documentos. Esta ação não pode ser desfeita.\n\n` +
        `Deseja realmente excluir TODO o histórico e o cadastro deste paciente?`,
        { titulo: 'Excluir paciente e todo o histórico', confirmar: 'Sim, excluir tudo', cancelar: 'Cancelar', destrutivo: true }
    );
    if (!confirmado) return false;

    try {
        const resultadoNuvem = await excluirPacienteNuvemSeguro(id);
        limparDadosLocaisPacienteExcluido(id);
        const arquivosLocais = await excluirArquivosLocaisPaciente(id);

        if (String(pacienteAtualId || '') === String(id)) pacienteAtualId = null;
        try {
            if (typeof definirPacienteContexto === 'function') await definirPacienteContexto('');
        } catch (_) {}
        if (typeof financeiroPacienteAtualId !== 'undefined' && String(financeiroPacienteAtualId || '') === String(id)) financeiroPacienteAtualId = '';

        await renderizarTabelaProntuarios();
        await renderizarPacientesRecentesHome();
        await atualizarSelectsPacientes();
        if (typeof atualizarSelectPacientesPreCadastro === 'function') await atualizarSelectPacientesPreCadastro();
        if (typeof popularSelectMidiasPaciente === 'function') await popularSelectMidiasPaciente('');
        if (typeof popularPacientesFinanceiro === 'function') await popularPacientesFinanceiro('');

        if (arquivosLocais.ok) {
            alert(`✅ Cadastro e todo o histórico de ${nome} foram excluídos definitivamente.`);
        } else {
            alert(`✅ Cadastro e histórico do sistema de ${nome} foram excluídos.\n⚠️ O KineSys Local não confirmou a remoção dos arquivos físicos deste computador/backup. Se houver fotos ou documentos locais, atualize/reinicie o KineSys Local desta versão e confira a pasta de dados.`);
        }
        return true;
    } catch (err) {
        console.error('KineSys: falha ao excluir paciente:', err);
        alert('❌ A exclusão não foi concluída. O cadastro principal não será considerado excluído enquanto o Supabase não confirmar a operação.\n\n' + (err.message || String(err)));
        return false;
    }
}

/* ================= 12. EVOLUÇÕES E RELATÓRIOS ================= */
function obterPacienteIdEvolucaoAtivo() {
    const select = document.getElementById('evo_paciente_select');
    const idSelect = String(select?.value || '').trim();
    if (idSelect) return idSelect;

    let contexto = '';
    try { contexto = String(localStorage.getItem('kinesys_paciente_contexto') || '').trim(); } catch (_) { contexto = ''; }

    return contexto || String(pacienteAtualId || '').trim();
}

function sincronizarSelectPacienteEvolucao(pacienteId) {
    const id = String(pacienteId || '').trim();
    const select = document.getElementById('evo_paciente_select');
    if (!id || !select) return false;
    const existe = [...select.options].some(o => String(o.value) === id);
    if (existe && String(select.value || '') !== id) select.value = id;
    return existe;
}

async function atualizarSelectsPacientes() {
    const selectEvo = document.getElementById('evo_paciente_select');
    const selectRel = document.getElementById('rel_paciente_select');
    const evoSelecionado = obterPacienteIdEvolucaoAtivo();
    const relSelecionado = String(selectRel?.value || '').trim() || (typeof obterPacienteIdRelatorioAtivo === 'function' ? String(obterPacienteIdRelatorioAtivo() || '').trim() : '');
    const lista = await obterPacientesSalvos();

    let options = `<option value="">-- Selecione um paciente --</option>`;
    lista.forEach(p => {
        options += `<option value="${escapeHTML(p.id)}">${escapeHTML(p.nome)} (CPF: ${escapeHTML(p.cpf || 'N/I')})</option>`;
    });

    if (selectEvo) {
        selectEvo.innerHTML = options;
        if (evoSelecionado && lista.some(p => String(p.id) === String(evoSelecionado))) selectEvo.value = evoSelecionado;
    }
    if (selectRel) {
        selectRel.innerHTML = options;
        if (relSelecionado && lista.some(p => String(p.id) === String(relSelecionado))) selectRel.value = relSelecionado;
    }
}

async function salvarEvolucaoSessao() {
    const pacienteId=obterPacienteIdEvolucaoAtivo();if(!pacienteId){alert('⚠️ Selecione um paciente para registrar a evolução.');return;}sincronizarSelectPacienteEvolucao(pacienteId);
    const relatoLivre=document.getElementById('evo_relato').value.trim();if(!relatoLivre){alert('⚠️ Preencha o relato/conduta da sessão.');return;}
    const realizadoInput=validarRealizacaoClinicaInput('evo_realizado_em');if(!realizadoInput)return;
    const estado=document.querySelector('input[name="evo_estado"]:checked')?.value||'igual';
    const mudancas=document.getElementById('evo_mudancas')?.value.trim()||'';
    const novoAlerta=!!document.getElementById('evo_novo_alerta')?.checked;
    if(novoAlerta&&!mudancas){alert('⚠️ Você marcou novo sinal de alerta. Descreva o que mudou antes de salvar.');return;}
    const listaAtual=await obterPacientesSalvos();const pacienteAtual=listaAtual.find(x=>String(x.id)===String(pacienteId));
    const registroEmEdicao=evolucaoEdicaoId?(pacienteAtual?.evolucoes||[]).find(e=>String(e.id)===String(evolucaoEdicaoId)):null;
    if(evolucaoEdicaoId&&!registroEmEdicao){alert('⚠️ Evolução em edição não encontrada. Recarregue o histórico.');evolucaoEdicaoId=null;return;}
    if(registroEmEdicao&&!registroClinicoPodeEditar(registroEmEdicao)){alert(`🔒 O prazo de edição terminou em ${formatarDataHoraClinica(obterLimiteEdicaoRegistro(registroEmEdicao))}. Nenhuma alteração foi salva.`);return;}
    const avFinalizada=pacienteAtual?obterAvaliacaoFinalizadaMaisRecente(pacienteAtual):null;const excecao=!!document.getElementById('evo_excecao_sem_avaliacao')?.checked;const justificativaExcecao=document.getElementById('evo_justificativa_excecao')?.value.trim()||'';if(!avFinalizada&&(!excecao||justificativaExcecao.length<10)){alert('🛡️ Este paciente não possui avaliação clínica finalizada. Finalize a avaliação ou marque a exceção e registre uma justificativa clínica/operacional (mínimo 10 caracteres).');return;}const avAtual=avFinalizada||(pacienteAtual?obterAvaliacaoMaisRecente(pacienteAtual):null);const restricoesAtuais=avAtual?.mapeamento?.clinicaEstruturada?.restricoesPosOperatorias||null;
    const dadosEstruturados={estadoClinico:estado,atendimentoSemAvaliacaoFinalizada:!avFinalizada,justificativaExcecao:!avFinalizada?justificativaExcecao:'',mudancas,novaIntercorrencia:!!document.getElementById('evo_nova_intercorrencia')?.checked,mudancaMedicacao:!!document.getElementById('evo_mudanca_medicacao')?.checked,novoExame:!!document.getElementById('evo_novo_exame')?.checked,novoAlerta,restricoesPosOperatorias:restricoesAtuais,respostaCarga:{dorDurante:valorNumeroOuNull('evo_dor_durante'),dor24h:valorNumeroOuNull('evo_dor_24h'),rpe:valorNumeroOuNull('evo_rpe'),duracaoMin:valorNumeroOuNull('evo_duracao'),resposta24h:document.getElementById('evo_resposta_24h')?.value||'',edema:document.getElementById('evo_edema')?.value||''}};
    const resumoEstruturado=montarResumoEvolucaoEstruturada(dadosEstruturados);const relatoCompleto=`${resumoEstruturado}${resumoEstruturado?'\n\n':''}${relatoLivre}`;
    const prof=metadadosProfissionalLogado(), agora=new Date();
    const realizadoEm=registroEmEdicao?obterRealizadoEmRegistro(registroEmEdicao):realizadoInput;
    const registro={
        id:registroEmEdicao?.id||`ev_${Date.now()}_${Math.random().toString(36).slice(2,7)}`,
        data:String(realizadoEm).slice(0,10),
        dataHoraISO:registroEmEdicao?.dataHoraISO||registroEmEdicao?.salvoEm||agora.toISOString(),
        realizadoEm,
        salvoEm:registroEmEdicao?obterSalvoEmRegistro(registroEmEdicao):null,
        edicaoLimiteEm:registroEmEdicao?obterLimiteEdicaoRegistro(registroEmEdicao):null,
        eva:document.getElementById('eva_slider_evo')?parseInt(document.getElementById('eva_slider_evo').value,10):0,
        relato:relatoCompleto,relatoLivre,dadosEstruturados,
        profissionalId:registroEmEdicao?.profissionalId||prof.profissionalId,
        profissionalNome:registroEmEdicao?.profissionalNome||prof.profissionalNome,
        profissionalRegistro:registroEmEdicao?.profissionalRegistro||prof.profissionalRegistro,
        profissional:registroEmEdicao?.profissional||`${registroEmEdicao?.profissionalNome||prof.profissionalNome}${(registroEmEdicao?.profissionalRegistro||prof.profissionalRegistro)?` (${registroEmEdicao?.profissionalRegistro||prof.profissionalRegistro})`:''}`,
        ultimaEdicaoEm:registroEmEdicao?agora.toISOString():null,
        ultimaEdicaoPorId:registroEmEdicao?prof.profissionalId:null,
        ultimaEdicaoPorNome:registroEmEdicao?prof.profissionalNome:null
    };
    if(!pacienteAtual)return;if(!pacienteAtual.evolucoes)pacienteAtual.evolucoes=[];
    if(registroEmEdicao) pacienteAtual.evolucoes=pacienteAtual.evolucoes.map(e=>String(e.id)===String(registroEmEdicao.id)?registro:e);
    else pacienteAtual.evolucoes.push(registro);
    const sucesso=await salvarPacienteNaNuvem(pacienteAtual,{exigirRastreabilidadeClinica:true});if(!sucesso)return;
    alert(registroEmEdicao?'✅ Evolução atualizada com rastreabilidade. O carimbo original de salvamento foi preservado.':'✅ Evolução registrada com data, profissional e horário de salvamento.');
    cancelarEdicaoEvolucao(true);
    ['evo_relato','evo_mudancas','evo_dor_durante','evo_dor_24h','evo_rpe','evo_duracao'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});['evo_nova_intercorrencia','evo_mudanca_medicacao','evo_novo_exame','evo_novo_alerta'].forEach(id=>{const el=document.getElementById(id);if(el)el.checked=false;});carregarHistoricoEvolucao();
}

function valorNumeroOuNull(id){const v=document.getElementById(id)?.value;return(v===''||v==null)?null:Number(v);}
function montarResumoEvolucaoEstruturada(d){const mapa={melhor:'Melhor',igual:'Igual',pior:'Pior',retornou_basal:'retornou ao basal em até 24 h',leve_piora:'piora leve e transitória',piora_persistente:'piora persistente >24 h',melhorou:'melhorou após a sessão',sem_aumento:'sem aumento de edema',aumento_leve:'aumento leve de edema',aumento_importante:'aumento importante de edema'};const itens=[`Estado clínico: ${mapa[d.estadoClinico]||d.estadoClinico}.`];if(d.mudancas)itens.push(`Mudanças: ${d.mudancas}${/[.!?]$/.test(d.mudancas.trim())?'':'.'}`);const flags=[];if(d.novaIntercorrencia)flags.push('nova intercorrência');if(d.mudancaMedicacao)flags.push('mudança de medicação');if(d.novoExame)flags.push('novo exame/laudo');if(d.novoAlerta)flags.push('novo sinal de alerta');if(flags.length)itens.push(`Atualizações: ${flags.join(', ')}.`);const r=d.respostaCarga||{};const carga=[];if(r.dorDurante!=null)carga.push(`dor durante ${r.dorDurante}/10`);if(r.dor24h!=null)carga.push(`dor 24 h ${r.dor24h}/10`);if(r.rpe!=null)carga.push(`RPE ${r.rpe}/10`);if(r.duracaoMin!=null)carga.push(`sessão ${r.duracaoMin} min`);if(r.resposta24h)carga.push(mapa[r.resposta24h]||r.resposta24h);if(r.edema)carga.push(mapa[r.edema]||r.edema);if(carga.length)itens.push(`Resposta à carga: ${carga.join('; ')}.`);return itens.join(' ');}

function renderResumoPaciente(idContainer, p) {
    const el = document.getElementById(idContainer);
    if (!el) return;
    if (!p) { el.style.display = 'none'; el.innerHTML = ''; return; }

    const statusAvaliacao = obterAvaliacaoMaisRecente(p) ? `✅ ${obterAvaliacoes(p).length} avaliação(ões) registrada(s)` : '⏳ Sem triagem/avaliação registrada';
    el.innerHTML = `
        <span class="resumo-item">👤 <strong>${escapeHTML(p.nome)}</strong></span>
        <span class="resumo-item">🎂 ${escapeHTML(p.idade || 'Idade N/I')}</span>
        <span class="resumo-item">🪪 CPF: ${escapeHTML(p.cpf || 'N/I')}</span>
        <span class="resumo-item">💼 ${escapeHTML(p.profissao || '-')}</span>
        <span class="resumo-status">${statusAvaliacao}</span>
    `;
    el.style.display = 'flex';
}

async function editarEvolucaoClinica(evolucaoId){
    const pacienteId=obterPacienteIdEvolucaoAtivo();if(!pacienteId)return;sincronizarSelectPacienteEvolucao(pacienteId);
    const lista=await obterPacientesSalvos(),p=lista.find(x=>String(x.id)===String(pacienteId)),e=(p?.evolucoes||[]).find(x=>String(x.id)===String(evolucaoId));
    if(!e){alert('⚠️ Evolução não encontrada.');return;}
    if(!registroClinicoPodeEditar(e)){alert(`🔒 O prazo de edição desta evolução terminou em ${formatarDataHoraClinica(obterLimiteEdicaoRegistro(e))}.`);return;}
    evolucaoEdicaoId=e.id;
    const realizado=document.getElementById('evo_realizado_em');if(realizado){realizado.value=valorDatetimeLocalAgora(obterRealizadoEmRegistro(e));realizado.disabled=true;}
    const data=document.getElementById('evo_data');if(data){data.value=String(obterRealizadoEmRegistro(e)||e.data||'').slice(0,10);data.disabled=true;}
    const d=e.dadosEstruturados||{},r=d.respostaCarga||{};const radio=document.querySelector(`input[name="evo_estado"][value="${d.estadoClinico||'igual'}"]`);if(radio)radio.checked=true;
    document.getElementById('evo_relato').value=e.relatoLivre||'';document.getElementById('evo_mudancas').value=d.mudancas||'';
    [['evo_dor_durante',r.dorDurante],['evo_dor_24h',r.dor24h],['evo_rpe',r.rpe],['evo_duracao',r.duracaoMin],['evo_resposta_24h',r.resposta24h||''],['evo_edema',r.edema||'']].forEach(([id,v])=>{const el=document.getElementById(id);if(el)el.value=v??'';});
    ['evo_nova_intercorrencia','evo_mudanca_medicacao','evo_novo_exame','evo_novo_alerta'].forEach(id=>{const el=document.getElementById(id);if(el)el.checked=!!d[({evo_nova_intercorrencia:'novaIntercorrencia',evo_mudanca_medicacao:'mudancaMedicacao',evo_novo_exame:'novoExame',evo_novo_alerta:'novoAlerta'})[id]];});
    if(document.getElementById('eva_slider_evo')){document.getElementById('eva_slider_evo').value=e.eva??0;document.getElementById('eva_slider_evo').dispatchEvent(new Event('input'));}
    const btn=document.getElementById('btn_salvar_evolucao');if(btn)btn.textContent='Salvar alterações';const cancelar=document.getElementById('btn_cancelar_edicao_evolucao');if(cancelar)cancelar.style.display='inline-flex';
    document.getElementById('evo_relato')?.focus();
}
function cancelarEdicaoEvolucao(atualizarCampos=true){
    evolucaoEdicaoId=null;const realizado=document.getElementById('evo_realizado_em');if(realizado){realizado.disabled=false;if(atualizarCampos)realizado.value=valorDatetimeLocalAgora();}
    const data=document.getElementById('evo_data');if(data){data.disabled=false;if(atualizarCampos)data.value=valorDatetimeLocalAgora().slice(0,10);}
    const btn=document.getElementById('btn_salvar_evolucao');if(btn)btn.textContent='Registrar evolução';const cancelar=document.getElementById('btn_cancelar_edicao_evolucao');if(cancelar)cancelar.style.display='none';
}

async function carregarHistoricoEvolucao() {
    const pacienteId = obterPacienteIdEvolucaoAtivo();
    sincronizarSelectPacienteEvolucao(pacienteId);
    const container = document.getElementById('linha_tempo_evolucoes');
    if (!container) return;

    if (!pacienteId) {
        renderResumoPaciente('resumo_paciente_evolucao', null);
        renderizarRestricoesPersistentesEvolucao(null);
        renderizarLinhaTempoClinicaCompleta(null);
        container.innerHTML = `<p class="kds-u-text-muted kds-u-fs-ui kds-u-ta-center">Selecione um paciente acima para carregar o histórico de atendimentos.</p>`;
        return;
    }

    const lista = await obterPacientesSalvos();
    const p = lista.find(item => String(item.id) === String(pacienteId));
    renderResumoPaciente('resumo_paciente_evolucao', p);
    renderizarRestricoesPersistentesEvolucao(p);
    renderizarLinhaTempoClinicaCompleta(p);
    carregarDocumentosTimelineNuvem(pacienteId).then(() => {
        if (String(obterPacienteIdEvolucaoAtivo() || '') === String(pacienteId)) renderizarLinhaTempoClinicaCompleta(p);
    }).catch(() => {});
    const blocoExc=document.getElementById('bloco_excecao_sem_avaliacao');if(blocoExc){const temFinal=!!obterAvaliacaoFinalizadaMaisRecente(p);blocoExc.style.display=temFinal?'none':'block';if(temFinal){const c=document.getElementById('evo_excecao_sem_avaliacao');if(c)c.checked=false;const j=document.getElementById('evo_justificativa_excecao');if(j)j.value='';}}

    if (!p || !p.evolucoes || p.evolucoes.length === 0) {
        container.innerHTML = `<p class="kds-u-text-muted kds-u-fs-ui kds-u-ta-center">Nenhuma evolução cadastrada para este paciente ainda.</p>`;
        return;
    }

    let html = "";
    p.evolucoes.slice().reverse().forEach(evo => {
        html += `
            <div class="kds-u-p-15px kds-u-bl-4px-solid-verde-cirurgico kds-u-bg-soft-slate kds-u-mb-15px kds-u-br-4px">
                <div class="kds-u-jc-between kds-u-gap-12px kds-u-ai-start kds-u-mb-7px kds-u-d-flex">
                    <div>
                        <div class="kds-u-fw-800 kds-u-fs-label kds-u-text-petrol">📅 Atendimento: ${escapeHTML(formatarDataHoraClinica(obterRealizadoEmRegistro(evo)))} · EVA ${escapeHTML(evo.eva)}${evo.dadosEstruturados?.estadoClinico ? ` · ${escapeHTML(({melhor:'Melhor',igual:'Igual',pior:'Pior'})[evo.dadosEstruturados.estadoClinico]||evo.dadosEstruturados.estadoClinico)}` : ''}</div>
                        <div class="kds-u-fs-meta kds-u-text-slate-text kds-u-mt-3px">Profissional: ${escapeHTML(profissionalRegistroClinico(evo))}</div>
                        <div class="kds-u-fs-meta kds-u-text-slate-text">Salva: ${escapeHTML(formatarDataHoraClinica(obterSalvoEmRegistro(evo),true))} · ${escapeHTML(textoJanelaEdicaoRegistro(evo))}${evo.ultimaEdicaoEm?` · Última edição: ${escapeHTML(formatarDataHoraClinica(evo.ultimaEdicaoEm,true))}${evo.ultimaEdicaoPorNome?` por ${escapeHTML(evo.ultimaEdicaoPorNome)}`:''}`:''}</div>
                    </div>
                    ${registroClinicoPodeEditar(evo)?`<button type="button" class="btn-secondary kds-u-p-6px-10px kds-u-fs-meta kds-u-ws-nowrap" onclick="editarEvolucaoClinica('${escapeHTML(evo.id)}')">✏️ Editar</button>`:`<span class="kds-u-fs-meta kds-u-text-lock kds-u-ws-nowrap">🔒 Bloqueada</span>`}
                </div>
                <p class="kds-u-m-0 kds-u-fs-ui kds-u-text-primary kds-u-ws-pre-wrap">${escapeHTML(evo.relato)}</p>
            </div>
        `;
    });

    container.innerHTML = html;
}

/* ================= NOVAS FUNÇÕES PARA O GERADOR DE DOCUMENTOS ================= */

/* função onPacienteRelatorioChange substituída pelo Clinical Engine 1.4 */

/* função onTipoDocumentoChange substituída pelo Clinical Engine 1.4 */

/* ==========================================================================
   RODAPÉ DE ASSINATURA (regra comum aos 3 tipos de documento)
   ==========================================================================
   Puxa automaticamente o profissional logado no sistema no momento da
   emissão — nunca um valor digitado à mão — para garantir que o documento
   saia sempre no nome de quem efetivamente está gerando/assinando.

   ⚠️ IMPORTANTE: o timbre (assets/timbrado-fisiofix.png) já traz, fixo na
   arte, o nome "Jessé Gonçalves" e o CREFITO dele no rodapé — isso é a
   marca/identidade da clínica, não a assinatura de quem gerou o documento.
   Por isso esta assinatura DINÂMICA é impressa ACIMA da faixa do timbre,
   deixando claro quem de fato atendeu/emitiu o documento (importante numa
   clínica com mais de um fisioterapeuta logado no sistema). Se a intenção
   for que todo documento saia sempre no nome do Jessé, independentemente
   de quem estiver logado, é só remover a chamada desta função.
   ========================================================================== */
/* função gerarRodapeAssinaturaHTML substituída pelo Clinical Engine 1.4 */

// Monta o miolo #documento_impressao com o timbre de fundo + o conteúdo
// (texto) por cima, na zona segura — usado pelos 3 tipos de documento.
function montarDocumentoComTimbrado(htmlConteudo) {
    const documento = document.getElementById('documento_impressao');
    documento.innerHTML = `
        <div class="timbrado-fundo"></div>
        <div class="timbrado-conteudo">${htmlConteudo}</div>
    `;

    const container = document.getElementById('preview_relatorio_container');
    container.style.display = 'block';
    container.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/* ==========================================================================
   1) COMPARECIMENTO — modelo fixo, SEM IA, padrão editorial clínico FISIOFIX
   ========================================================================== */
/* montarDocumentoComparecimento legado removido na v1.4 */

/* ==========================================================================
   2) RELATÓRIO FISIOTERAPÊUTICO — rascunho curto assistido por IA (Google Gemini)
   ==========================================================================
   ⚠️ AVISO DE SEGURANÇA — LEIA ANTES DE USAR COM PACIENTES REAIS:
   Chamar a API do Gemini diretamente do navegador expõe a API_KEY a
   qualquer pessoa que abrir o DevTools/Ctrl+U da página — exatamente o
   mesmo problema já sinalizado para a chave do Supabase no topo deste
   arquivo. Além disso, como esta chave foi colada em uma conversa de
   chat, o mais seguro é você revogá-la/gerar uma nova no Google AI
   Studio assim que possível e usar a nova chave só através de um backend
   (um pequeno servidor seu que guarda a chave em segredo e repassa a
   requisição). Deixei a chamada apontando "direto" para a API do Google
   porque foi o que você pediu para prototipagem — troque para um proxy
   próprio antes de usar com pacientes reais.
   ========================================================================== */
const GEMINI_CONFIG = {
    // Ordem de tentativa. Se o modelo principal não estiver disponível para a conta,
    // o KineSys tenta o fallback automaticamente.
    modelos: ["gemini-3.6-flash", "gemini-2.5-flash"],
    timeoutMs: 60000,
    // 2.200 tokens eram insuficientes para relatórios médios/longos e podiam
    // encerrar a resposta antes das seções finais. O KineSys agora também
    // detecta MAX_TOKENS e continua automaticamente a geração.
    maxOutputTokens: 5000,
    maxContinuacoes: 2,
    maxReparosEstrutura: 2,
    edgeFunction: 'kinesys-relatorio'
};
// A chave do provedor nunca fica no navegador. A chamada de IA passa por uma
// Supabase Edge Function autenticada, que guarda GEMINI_API_KEY em segredo.
const API_KEY = '';

function endpointGemini(modelo) {
    return `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(modelo)}:generateContent`;
}



/* gerarDocumentoComIA legado removido na v1.4 */

// Monta o documento final para impressão a partir do texto do "Relatório
// Oficial" — que pode ter vindo da IA e/ou sido editado manualmente pelo
// profissional — sempre carimbando o rodapé de assinatura no final.
/* função montarDocumentoIAParaImpressao substituída pelo Clinical Engine 1.4 */

let documentoAtualMeta=null;
const documentosTimelineNuvemCache = new Map();
function obterDocumentosTimelineLocal(pacienteId){try{const base=JSON.parse(localStorage.getItem('kinesys_documentos_timeline')||'{}');return Array.isArray(base[pacienteId])?base[pacienteId]:[];}catch{return[];}}
async function carregarDocumentosTimelineNuvem(pacienteId){
    const id=String(pacienteId||'');if(!id||!_supabase)return[];
    try{
        const {data,error}=await _supabase.from('documentos_timeline').select('id,paciente_id,tipo,titulo,data_hora,emitido_por,detalhes,criado_em').eq('paciente_id',id).order('data_hora',{ascending:false});
        if(error)throw error;
        const docs=(data||[]).map(d=>({id:d.id,pacienteId:d.paciente_id,tipo:d.tipo,titulo:d.titulo,dataHoraISO:d.data_hora,emitidoPor:d.emitido_por,detalhes:d.detalhes||{},criadoEm:d.criado_em}));
        documentosTimelineNuvemCache.set(id,docs);return docs;
    }catch(err){
        if(!/documentos_timeline|relation|schema cache|does not exist/i.test(String(err?.message||err)))console.warn('KineSys: não foi possível carregar eventos documentais da nuvem.',err);
        documentosTimelineNuvemCache.set(id,[]);return[];
    }
}
function salvarDocumentoTimelineLocal(pacienteId,doc){try{const base=JSON.parse(localStorage.getItem('kinesys_documentos_timeline')||'{}');if(!Array.isArray(base[pacienteId]))base[pacienteId]=[];base[pacienteId].push(doc);localStorage.setItem('kinesys_documentos_timeline',JSON.stringify(base));}catch(e){console.warn('Falha ao gravar evento documental local:',e);}}
function removerDocumentoTimelineLocal(pacienteId,docId){try{const base=JSON.parse(localStorage.getItem('kinesys_documentos_timeline')||'{}');if(!Array.isArray(base[pacienteId]))return;const restante=base[pacienteId].filter(doc=>String(doc?.id||'')!==String(docId||''));if(restante.length)base[pacienteId]=restante;else delete base[pacienteId];localStorage.setItem('kinesys_documentos_timeline',JSON.stringify(base));}catch(e){console.warn('Falha ao remover evento documental local após confirmação da nuvem:',e);}}
async function registrarDocumentoAtual(){
    if(!documentoAtualMeta?.pacienteId)return;
    const doc={id:`doc_${Date.now()}_${Math.random().toString(36).slice(2,6)}`,tipo:documentoAtualMeta.tipo,titulo:documentoAtualMeta.titulo,dataHoraISO:new Date().toISOString(),emitidoPor:usuarioLogado?.nome||'N/I',detalhes:documentoAtualMeta.detalhes||{}};
    let salvoNaNuvem=false;
    if(_supabase){
        try{
            const {error}=await _supabase.from('documentos_timeline').upsert([{id:doc.id,paciente_id:String(documentoAtualMeta.pacienteId),tipo:doc.tipo||'outro',titulo:doc.titulo||'Documento',data_hora:doc.dataHoraISO,emitido_por:doc.emitidoPor||'',detalhes:doc.detalhes||{},criado_em:doc.dataHoraISO}],{onConflict:'id'});
            salvoNaNuvem=!error;
        }catch(_){salvoNaNuvem=false;}
    }
    if(salvoNaNuvem){
        documentosTimelineNuvemCache.set(String(documentoAtualMeta.pacienteId),[doc,...(documentosTimelineNuvemCache.get(String(documentoAtualMeta.pacienteId))||[])]);
        removerDocumentoTimelineLocal(documentoAtualMeta.pacienteId,doc.id);
    }else salvarDocumentoTimelineLocal(documentoAtualMeta.pacienteId,doc);
}
async function imprimirDocumento() {
    await registrarDocumentoAtual();
    window.print();
}

/* ==========================================================================
   MÓDULO CRM E RELACIONAMENTO
   ========================================================================== */

let pacienteCRM = null;

async function popularSelectCRM() {
    const select = document.getElementById('crm_paciente_select');
    if (!select) return;
    const lista = await obterPacientesSalvos();
    let options = `<option value="">-- Selecione um paciente --</option>`;
    lista.forEach(p => {
        const contato = obterContatoPreferencialPaciente(p);
        const sufixo = contato.telefone ? `${contato.telefone}${contato.usaResponsavel ? ' · responsável' : ''}` : 'sem telefone';
        options += `<option value="${escapeHTML(p.id)}">${escapeHTML(p.nome)} (${escapeHTML(sufixo)})</option>`;
    });
    select.innerHTML = options;
}

async function carregarPacienteCRM() {
    const select = document.getElementById('crm_paciente_select');
    const id = select.value;
    if (!id) {
        document.getElementById('crm_paciente_info').style.display = 'none';
        pacienteCRM = null;
        return;
    }
    const lista = await obterPacientesSalvos();
    const p = lista.find(item => item.id === id);
    if (p) {
        pacienteCRM = p;
        const contato = obterContatoPreferencialPaciente(p);
        document.getElementById('crm_nome').textContent = p.nome;
        document.getElementById('crm_telefone').textContent = contato.telefone
            ? `${contato.telefone}${contato.usaResponsavel ? ` · Responsável: ${contato.nomeDestinatario}` : ''}`
            : 'Não informado';
        document.getElementById('crm_paciente_info').style.display = 'block';
    } else {
        pacienteCRM = null;
        document.getElementById('crm_paciente_info').style.display = 'none';
    }
}

/**
 * Dispara a mensagem via WhatsApp utilizando uma âncora invisível
 * com target fixo para reutilizar a mesma aba.
 */
async function enviarWhatsApp(tipo) {
    if (!pacienteCRM) {
        alert('⚠️ Selecione um paciente no CRM primeiro.');
        return;
    }
    const contato = obterContatoPreferencialPaciente(pacienteCRM);
    const telefone = contato.telefone;
    if (!telefone) {
        alert(pacienteEhDependente(pacienteCRM)
            ? '⚠️ Este paciente está marcado como dependente, mas não possui telefone do responsável cadastrado.'
            : '⚠️ Este paciente não possui telefone cadastrado.');
        return;
    }
    const numeroLimpo = '55' + telefone.replace(/\D/g, '');
    const nome = pacienteCRM.nome;
    const saudacao = contato.usaResponsavel
        ? `Olá ${contato.nomeDestinatario}! Sobre o atendimento de ${nome}`
        : `Olá ${nome}`;
    const contextoBase = {
        saudacao,
        paciente: nome,
        destinatario: contato.nomeDestinatario || nome,
        profissional: usuarioLogado?.nome || 'equipe',
        clinica: 'Fisiofix'
    };

    let mensagem = '';
    switch (tipo) {
        case 'checkin':
            mensagem = (typeof obterMensagemPadraoConfigurada === 'function')
                ? await obterMensagemPadraoConfigurada('crm_checkin_24h', contextoBase, true)
                : `${saudacao}, aqui é ${usuarioLogado?.nome || 'a equipe'} da Fisiofix. Como está a evolução 24 horas após a sessão? A dor melhorou?`;
            break;
        case 'exercicios':
            mensagem = (typeof obterMensagemPadraoConfigurada === 'function')
                ? await obterMensagemPadraoConfigurada('crm_exercicios_3d', contextoBase, true)
                : `${saudacao}, aqui é ${usuarioLogado?.nome || 'a equipe'} da Fisiofix. Passando para lembrar dos exercícios que combinamos. Qualquer dúvida, estou à disposição.`;
            break;
        case 'sessao': {
            const agendamento = obterProximoAgendamento(pacienteCRM.id);
            if (!agendamento) {
                alert('⚠️ Não foi possível obter o próximo agendamento.');
                return;
            }
            const agora = new Date();
            const diffMs = new Date(agendamento.dataHora) - agora;
            if (diffMs < 0) {
                alert('⚠️ O agendamento já passou.');
                return;
            }
            const horas = Math.floor(diffMs / (1000 * 60 * 60));
            const dataFormatada = new Date(agendamento.dataHora).toLocaleDateString('pt-BR');
            const horaFormatada = new Date(agendamento.dataHora).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
            const contexto = {...contextoBase, horas, data:dataFormatada, hora:horaFormatada};
            mensagem = (typeof obterMensagemPadraoConfigurada === 'function')
                ? await obterMensagemPadraoConfigurada('crm_lembrete_sessao', contexto, true)
                : `${saudacao}, passando para lembrar do atendimento na Fisiofix. Faltam aproximadamente ${horas} horas para a sessão (marcada para ${dataFormatada} às ${horaFormatada}). Confirma a presença?`;
            break;
        }
        default:
            alert('Tipo de mensagem inválido.');
            return;
    }

    const mensagemCodificada = encodeURIComponent(mensagem);
    const url = 'https://web.whatsapp.com/send?phone=' + numeroLimpo + '&text=' + mensagemCodificada;

    // Técnica da âncora invisível para forçar o reuso da aba
    const link = document.createElement('a');
    link.href = url;
    link.target = 'whatsapp_unico_crm';
    link.rel = 'noopener noreferrer';
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function obterProximoAgendamento(pacienteId) {
    // Mock: agendamento para amanhã às 10h
    const agora = new Date();
    const amanha = new Date(agora);
    amanha.setDate(agora.getDate() + 1);
    amanha.setHours(10, 0, 0, 0);
    return {
        pacienteId: pacienteId,
        dataHora: amanha.toISOString()
    };
}

/* ================= 13. MAPEAMENTO ANATÔMICO (RADAR DE CLUSTERS ORTOPÉDICOS) =================
   Motor de apoio à decisão clínica com 3 fases por região
   ================================================================= */

function irParaSubtela(idSubtela) {
    window.fecharModalInvestigacaoKineSys?.();
    window.fecharPainelAvaliacaoKineSys?.();
    document.querySelectorAll('#tela_avaliacao .subtela').forEach(s => s.classList.remove('ativa'));
    const alvo = document.getElementById(idSubtela);
    if (alvo) alvo.classList.add('ativa');

    const mapaPassos = { subtela_triagem: 1, subtela_mapeamento: 2, subtela_diagnostico: 3 };
    const passoAtual = mapaPassos[idSubtela] || 1;
    ['step_indicador_1', 'step_indicador_2', 'step_indicador_3'].forEach((idEl, idx) => {
        const el = document.getElementById(idEl);
        if (el) el.classList.toggle('active', (idx + 1) === passoAtual);
    });

    // A etapa 2 deve sempre abrir no seu cabeçalho. Sem esse reset, o foco
    // permanece no botão inferior da anamnese e o navegador pode reter a
    // posição antiga, fazendo o profissional entrar no fim do exame.
    if (alvo) {
        requestAnimationFrame(() => {
            alvo.tabIndex = -1;
            alvo.focus({preventScroll:true});
            const topo = Math.max(0, alvo.getBoundingClientRect().top + window.scrollY - 14);
            window.scrollTo({ top: topo, left: 0, behavior: 'auto' });
        });
    }
}

function avancarParaMapa() {
    const nome = document.getElementById('paciente_nome').value.trim();
    if (!nome) {
        alert("⚠️ Informe ao menos o nome do paciente antes de avançar para o mapeamento.");
        return;
    }
    processarRadarEmTempoReal();

    const grupo = document.getElementById('grupo_regioes_mapeamento');
    if (grupo && grupo.children.length === 0) {
        renderizarSeletorRegioes();
        sugerirRegioesPorHMA();
        sugerirRegioesPorAvaliacaoAnterior();
    }
    renderizarMapeamentoRegioes();
    irParaSubtela('subtela_mapeamento');
}

// Pré-marca as regiões que já foram mapeadas na avaliação/reavaliação
// anterior deste paciente (se houver), pra facilitar reaplicar os mesmos
// testes e comparar a evolução.
function sugerirRegioesPorAvaliacaoAnterior() {
    if (!mapeamentoAvaliacaoAnterior || !mapeamentoAvaliacaoAnterior.detalhes) return;
    Object.keys(mapeamentoAvaliacaoAnterior.detalhes).forEach(idRegiao => {
        if (idRegiao === '__segurancaGlobal') return;
        const chk = document.getElementById('chk_regiao_' + idRegiao);
        if (chk) chk.dataset.avaliacaoAnterior = 'true';
    });
}

/* função avancarParaDiagnostico substituída pelo Clinical Engine 1.4 */

// Painel Único de Alertas: junta os alertas do Radar Clínico (comorbidades,
// medicamentos, cirurgias, biomecânica ocupacional/esportiva) com as red
// flags marcadas em qualquer região do Mapeamento Anatômico, ordenados por
// gravidade (críticos primeiro).
function renderizarAlertasConsolidados() {
    const container = document.getElementById('container_alertas_consolidados');
    const card = document.getElementById('card_alertas_consolidados');
    if (!container) return;

    const itens = [];

    (ultimoRadarAlertas || []).forEach(a => {
        itens.push({ nivel: a.nivel, titulo: a.titulo, desc: a.desc, origem: 'Radar Clínico' });
    });

    const regioesMarcadas = Array.from(document.querySelectorAll('#grupo_regioes_mapeamento input:checked')).map(i => i.dataset.regiao);
    regioesMarcadas.forEach(idRegiao => {
        const regiao = BANCO_MAPEAMENTO_CLINICO[idRegiao];
        const estado = obterEstadoRegiao(idRegiao);
        regiao.redFlags.forEach((pergunta, i) => {
            if (estado.resultados['redflag::' + i]) {
                itens.push({ nivel: 'critico', titulo: `Red Flag — ${regiao.nome}`, desc: pergunta, origem: 'Mapeamento Anatômico' });
            }
        });
    });

    if (itens.length === 0) {
        container.innerHTML = `<p class="kds-u-text-muted kds-u-fs-label kds-u-ta-center kds-u-p-10px-0">Nenhum alerta crítico identificado com os dados preenchidos até agora.</p>`;
        if (card) card.classList.remove('ks-alert-summary-card--critical');
        return;
    }

    itens.sort((a, b) => (a.nivel === 'critico' ? 0 : 1) - (b.nivel === 'critico' ? 0 : 1));

    container.innerHTML = "";
    itens.forEach(item => {
        const div = document.createElement('div');
        div.className = 'ks-alert-inline ' + (item.nivel === 'critico' ? 'ks-alert-inline--critical' : 'ks-alert-inline--medium');
        div.innerHTML = `
            <div class="ks-alert-inline__meta">${item.origem} · ${item.nivel === 'critico' ? 'Risco Elevado' : 'Risco Médio'}</div>
            <div class="kds-u-fw-700 kds-u-fs-label kds-u-text-petrol kds-u-mt-2px-2">${item.titulo}</div>
            <div class="kds-u-fs-meta kds-u-text-muted kds-u-mt-2px-2">${item.desc}</div>
        `;
        container.appendChild(div);
    });

    if (card) card.classList.toggle('ks-alert-summary-card--critical', itens.some(i => i.nivel === 'critico'));
}

function renderizarSeletorRegioes() {
    const grupo = document.getElementById('grupo_regioes_mapeamento');
    if (!grupo) return;
    grupo.innerHTML = "";
    Object.entries(BANCO_MAPEAMENTO_CLINICO).forEach(([idRegiao, regiao]) => {
        const label = document.createElement('label');
        label.className = 'checkbox-pill';

        const input = document.createElement('input');
        input.type = 'checkbox';
        input.id = 'chk_regiao_' + idRegiao;
        input.dataset.regiao = idRegiao;
        input.addEventListener('change', function() {
            input.dataset.tocadoManualmente = 'true';
            renderizarMapeamentoRegioes();
        });

        const span = document.createElement('span');
        span.textContent = regiao.nome;

        label.appendChild(input);
        label.appendChild(span);
        grupo.appendChild(label);
    });
}

const TERMOS_REGIAO_ESTRITOS = {
    cefaleia:['cefaleia','dor de cabeca','dor na cabeca','enxaqueca','migranea','dor temporal','dor na testa'],
    cervical:['cervical','pescoco','nuca','cervicalgia','torcicolo'],
    atm:['atm','articulacao temporomandibular','mandibula','maxilar','masseter','mastigacao','mastigar','bruxismo','apertamento','pre auricular'],
    ombro:['ombro','ombros','manguito','supraespinhal','glenoumeral','escapula'],
    lombar:['lombar','lombossacra','lombalgia','sacro','coluna lombar'],
    joelho:['joelho','patela','patelar','menisco','lca','lcp'],
    quadril:['quadril','virilha','inguinal','trocanter','coxofemoral'],
    tornozelo_pe:['tornozelo','pe','calcaneo','aquiles','maleolo','plantar'],
    cotovelo:['cotovelo','epicondilo','supinador','pronador'],
    punho_mao:['punho','mao','carpo','polegar','dedo','dedos'],
    coluna_toracica:['toracica','toracico','interescapular','costela','costelas']
};

function regioesMencionadasNoTextoKineSys(texto){
    const ids=[];
    Object.entries(TERMOS_REGIAO_ESTRITOS).forEach(([id,termos])=>{
        if((termos||[]).some(t=>contemTermoInteiro(texto,t))) ids.push(id);
    });
    return ids;
}

function ultimaRegiaoMencionadaKineSys(texto){
    const t=removerAcentos(texto||''); let melhor=null, pos=-1;
    Object.entries(TERMOS_REGIAO_ESTRITOS).forEach(([id,termos])=>{
        (termos||[]).forEach(termo=>{const q=removerAcentos(termo);const i=t.lastIndexOf(q);if(i>pos){pos=i;melhor=id;}});
    });
    return melhor;
}

function analisarTopologiaSintomasKineSys(hmaRaw='', origemRaw='', destinoRaw=''){
    const hma=removerAcentos(hmaRaw||''), origem=removerAcentos(origemRaw||''), destino=removerAcentos(destinoRaw||'');
    const origemExplicita=new Set(regioesMencionadasNoTextoKineSys(origem));
    const destinoExplicito=new Set(regioesMencionadasNoTextoKineSys(destino));
    const diretas=new Set(regioesMencionadasNoTextoKineSys(hma));
    const pares=[];
    const re=/(.{0,90}?)(?:irradia(?:ndo|cao|ção)?\s*(?:para|ate|até)|vai\s+para|segue\s+para|espalha\s+para|desce\s+para|sobe\s+para)(.{0,110})/gi;
    let m;
    while((m=re.exec(hmaRaw||''))!==null){
        const origemMaisProxima=ultimaRegiaoMencionadaKineSys(m[1]||'');
        const trechoDestino=String(m[2]||'').split(/[,;.!?]|\s+e\s+dor\s+(?:na|no|nos|nas)\s+/i)[0];
        const o=origemMaisProxima?[origemMaisProxima]:[];
        const d=regioesMencionadasNoTextoKineSys(trechoDestino);
        o.forEach(x=>origemExplicita.add(x)); d.forEach(x=>destinoExplicito.add(x));
        o.forEach(a=>d.forEach(b=>{if(a!==b)pares.push({origem:a,destino:b,fonte:'hma'});}));
        if(m[0].length===0) re.lastIndex++;
    }
    origemExplicita.forEach(a=>destinoExplicito.forEach(b=>{if(a!==b&&!pares.some(p=>p.origem===a&&p.destino===b))pares.push({origem:a,destino:b,fonte:'campos'});}));
    const papel={};
    new Set([...diretas,...origemExplicita,...destinoExplicito]).forEach(id=>{
        const o=origemExplicita.has(id), d=destinoExplicito.has(id);
        papel[id]=o&&d?'misto':o?'origem':d?'destino':'direto';
    });
    return {origens:[...origemExplicita],destinos:[...destinoExplicito],diretas:[...diretas],pares,papel};
}
function escaparRegexKineSys(t){return String(t||'').replace(/[.*+?^${}()|[\]\\]/g,'\\$&');}
function contemTermoInteiro(texto,termo){
    const t=removerAcentos(texto||''), q=removerAcentos(termo||'').trim(); if(!q)return false;
    const re=new RegExp(`(^|[^a-z0-9])${escaparRegexKineSys(q).replace(/\\ /g,'\\s+')}($|[^a-z0-9])`,'i'); return re.test(t);
}
function contarMatchesLista(texto,lista){return (lista||[]).filter(x=>contemTermoInteiro(texto,x)).length;}
function analisarPadroesIrradiacao(contexto=coletarContextoClinico()){
    if(typeof BANCO_IRRADIACAO_CLINICA==='undefined')return [];
    const origem=removerAcentos(contexto.origemIrradiacao||''), destino=removerAcentos(contexto.irradiacao||''), hma=removerAcentos(contexto.hma||'');
    const clinico=[hma,destino].join(' ');
    return BANCO_IRRADIACAO_CLINICA.map(item=>{
        const mo=contarMatchesLista(origem,item.origens); const md=contarMatchesLista(destino,item.destinos); const mp=contarMatchesLista(clinico,item.pistas);
        let score=mo*4+Math.min(md,3)*2+Math.min(mp,3)*1.2;
        // origem explícita é obrigatória: evita tratar todo formigamento como mão/pé.
        if(!mo)score=0;
        // Exige destino coerente ou pelo menos duas pistas clínicas adicionais.
        if(mo && !md && mp<2)score=0;
        return {...item,score:Math.round(score*10)/10,matchesOrigem:mo,matchesDestino:md,matchesPistas:mp};
    }).filter(x=>x.score>0).sort((a,b)=>b.score-a.score);
}
function renderizarAnaliseIrradiacao(){
    const box=document.getElementById('analise_irradiacao_clinica');if(!box)return;const ctx=coletarContextoClinico();const itens=analisarPadroesIrradiacao(ctx).slice(0,5);
    if(!ctx.origemIrradiacao||!ctx.irradiacao){box.style.display='none';box.innerHTML='';return;}
    if(!itens.length){box.style.display='block';box.innerHTML='<strong>Mapa de origem e trajeto</strong><div class="kds-u-fs-meta kds-u-mt-4px kds-u-text-muted">Sem padrão priorizado.</div>';return;}
    box.style.display='block';box.innerHTML=`<strong>Mapa de origem e trajeto</strong>${itens.map((x,i)=>`<div class="ks-map-route-row ${i?'is-divided':''}"><strong class="kds-u-fs-meta">${escapeHTML(x.nome)}</strong><div class="kds-u-fs-meta kds-u-text-muted-dark">${escapeHTML(x.tipo)} · ${escapeHTML(BANCO_MAPEAMENTO_CLINICO[x.regiao]?.nome||x.regiao)}</div></div>`).join('')}`;
}
function sugerirRegioesPorHMA() {
    const contexto=coletarContextoClinico();
    const top=contexto.topologia||analisarTopologiaSintomasKineSys(contexto.hma,contexto.origemIrradiacao,contexto.irradiacao);
    const ranking=analisarPadroesIrradiacao(contexto);
    const regioesOrigem=new Set(ranking.filter(x=>x.score>=4).slice(0,2).map(x=>x.regiao));
    const detectadas=new Set([...(top.diretas||[]),...(top.origens||[]),...(top.destinos||[]),...regioesOrigem]);
    Object.entries(BANCO_MAPEAMENTO_CLINICO).forEach(([idRegiao]) => {
        const chk=document.getElementById('chk_regiao_'+idRegiao); if(!chk)return;
        chk.dataset.papelSintoma=top.papel?.[idRegiao]||'';
        chk.dataset.sugeridaHMA=detectadas.has(idRegiao)?'true':'false';
        // Desde o Motor 2.3.1 a história sugere regiões, mas não as seleciona.
        // A escolha anatômica permanece explícita do fisioterapeuta.
    });
    renderizarAnaliseIrradiacao();
    renderizarPainelIntegracaoMultirregional(contexto);
}

/* função coletarContextoClinico substituída pelo Clinical Engine 1.4 */

// Calcula a pontuação de UM cluster/diferencial cruzando suas "pistas"
// cadastradas com o contexto clínico coletado da Triagem — incluindo agora
// idade e os mesmos dados que alimentam o Radar Clínico (comorbidades e
// medicamentos), para que os dois sistemas "conversem" entre si. O terceiro
// parâmetro (bonusCirurgiaRelacionada) é calculado por região em
// ordenarClustersPorScore/ordenarDiferenciaisPorScore.
/* função calcularScoreItem substituída pelo Clinical Engine 1.4 */

/* função ordenarClustersPorScore substituída pelo Clinical Engine 1.4 */

/* função ordenarDiferenciaisPorScore substituída pelo Clinical Engine 1.4 */

// Converte a pontuação numérica (heurística, não um escore validado) num
// rótulo qualitativo — mais claro pra leitura rápida do que o número cru.
function rotuloCompatibilidade(score) {
    // O número não é probabilidade diagnóstica. O rótulo descreve somente
    // prioridade heurística de investigação pré-teste.
    if (score >= 6) return { texto: "Prioridade alta para investigar", classe: "compat-alta" };
    if (score >= 3) return { texto: "Prioridade moderada para investigar", classe: "compat-moderada" };
    if (score >= 1) return { texto: "Prioridade baixa para investigar", classe: "compat-baixa" };
    return { texto: "Sem pistas suficientes para priorizar", classe: "compat-nenhuma" };
}

/* função obterEstadoRegiao substituída pelo Clinical Engine 1.4 */

/* função avaliarCluster substituída pelo Clinical Engine 1.4 */

/* função avaliarDiferencial substituída pelo Clinical Engine 1.4 */

function obterCirurgiaRelacionadaRegiao(idRegiao) {
    const regiao = BANCO_MAPEAMENTO_CLINICO[idRegiao];
    const tags = document.querySelectorAll('#tags_cirurgias .tag-cirurgia');
    for (const tag of tags) {
        const texto = removerAcentos(tag.textContent.replace('✕', '').trim());
        if (regiao.palavrasChave.some(p => texto.includes(removerAcentos(p)))) {
            return tag.textContent.replace('✕', '').trim();
        }
    }
    return null;
}


/* função construirIndicadorFase substituída pelo Clinical Engine 1.4 */

/* função construirCardRegiao substituída pelo Clinical Engine 1.4 */

function renderizarFaseSuspeita(card, idRegiao, clustersOrdenados, estado) {
    if (clustersOrdenados.length === 0) {
        const aviso = document.createElement('p');
        aviso.classList.add('kds-u-text-muted', 'kds-u-fs-label', 'kds-u-ta-center', 'kds-u-p-10px-0');
        aviso.textContent = "Nenhum cluster cadastrado para esta região ainda.";
        card.appendChild(aviso);
        return;
    }

    const idEscolhido = estado.idClusterSuspeitaEscolhido || clustersOrdenados[0].item.id;
    const escolhido = clustersOrdenados.find(c => c.item.id === idEscolhido) || clustersOrdenados[0];

    if (clustersOrdenados.length > 1) {
        const select = document.createElement('select');
        select.className = 'seletor-suspeita';
        clustersOrdenados.forEach(c => {
            const opt = document.createElement('option');
            opt.value = c.item.id;
            opt.textContent = `${c.item.nome} — ${rotuloCompatibilidade(c.score).texto}`;
            if (c.item.id === escolhido.item.id) opt.selected = true;
            select.appendChild(opt);
        });
        select.addEventListener('change', function() {
            estado.idClusterSuspeitaEscolhido = select.value;
            renderizarMapeamentoRegioes();
        });
        card.appendChild(select);
    }

    const rotulo = rotuloCompatibilidade(escolhido.score);
    const scoreHint = document.createElement('div');
    scoreHint.className = 'score-hint';
    scoreHint.classList.add('kds-u-mb-10px');
    scoreHint.innerHTML = `🧠 Priorização heurística baseada no relato, padrão de dor, mecanismo, fatores de piora, idade e contexto clínico; esporte/profissão têm peso apenas contextual — <strong class="${rotulo.classe}">${rotulo.texto}</strong> <span class="kds-u-opacity-0p6">(índice heurístico: ${escolhido.score}; não representa probabilidade diagnóstica)</span>.`;
    card.appendChild(scoreHint);

    const status = avaliarCluster(idRegiao, escolhido.item);
    card.appendChild(construirCardTestes(idRegiao, escolhido.item, status, 'cluster'));

    if (status === 'negativo') {
        const aviso = document.createElement('div');
        aviso.classList.add('kds-u-ta-center', 'kds-u-mt-10px');
        aviso.innerHTML = `<button class="btn-secondary kds-u-fs-ui kds-u-p-8px-16px">Eixo inicialmente priorizado não sustentado — ver outros eixos ➔</button>`;
        aviso.querySelector('button').addEventListener('click', function() {
            estado.fase = 'diferencial';
            renderizarMapeamentoRegioes();
        });
        card.appendChild(aviso);
    }
}

function renderizarFaseDiferencial(card, idRegiao, regiao, clustersOrdenados, contexto, estado) {
    const aviso = document.createElement('div');
    aviso.classList.add('kds-u-bg-fffbeb', 'kds-u-border-1px-solid-f1c40f', 'kds-u-br-6px', 'kds-u-p-10px-14px', 'kds-u-fs-meta', 'kds-u-text-7a5b00', 'kds-u-mb-15px');
        aviso.textContent = "🔎 O eixo inicialmente priorizado não foi sustentado pelos achados registrados. Seguem outros eixos para investigação, ordenados pelo índice heurístico — não por probabilidade diagnóstica.";
    card.appendChild(aviso);

    const idJaTestado = estado.idClusterSuspeitaEscolhido || (clustersOrdenados[0] && clustersOrdenados[0].item.id);
    const outrosClusters = clustersOrdenados.filter(c => c.item.id !== idJaTestado);
    const diferenciaisOrdenados = ordenarDiferenciaisPorScore(idRegiao, contexto);

    const candidatos = [
        ...outrosClusters.map(c => ({ ...c, grupo: 'cluster' })),
        ...diferenciaisOrdenados.map(d => ({ ...d, grupo: 'diferencial' }))
    ].sort((a, b) => b.score - a.score);

    if (candidatos.length === 0) {
        const aviso = document.createElement('p');
        aviso.classList.add('kds-u-text-muted', 'kds-u-fs-label', 'kds-u-ta-center', 'kds-u-p-10px-0');
        aviso.textContent = "Não há outros eixos de investigação cadastrados para esta região.";
        card.appendChild(aviso);
    }

    let algumPositivo = false;
    let todosNegativos = candidatos.length > 0;

    candidatos.forEach(c => {
        const status = c.grupo === 'cluster' ? avaliarCluster(idRegiao, c.item) : avaliarDiferencial(idRegiao, c.item);
        if (status === 'positivo') algumPositivo = true;
        if (status !== 'negativo') todosNegativos = false;

        const scoreHint = document.createElement('div');
        scoreHint.className = 'score-hint';
        scoreHint.classList.add('kds-u-m-10px-0-4px');
        const rotuloC = rotuloCompatibilidade(c.score);
        scoreHint.innerHTML = `<strong class="${rotuloC.classe}">${rotuloC.texto}</strong> <span class="kds-u-opacity-0p6">(índice heurístico: ${c.score})</span>`;
        card.appendChild(scoreHint);

        card.appendChild(construirCardTestes(idRegiao, c.item, status, c.grupo));
    });

    const acoes = document.createElement('div');
    acoes.classList.add('kds-u-d-flex', 'kds-u-gap-10px', 'kds-u-mt-10px', 'kds-u-wrap-wrap');

    const btnVoltar = document.createElement('button');
    btnVoltar.className = 'btn-secondary';
    btnVoltar.classList.add('kds-u-fs-ui', 'kds-u-p-8px-16px');
    btnVoltar.textContent = "◀ Voltar ao eixo priorizado";
    btnVoltar.addEventListener('click', function() { estado.fase = 'suspeita'; renderizarMapeamentoRegioes(); });
    acoes.appendChild(btnVoltar);

    if (!algumPositivo) {
        const btnRedflag = document.createElement('button');
        btnRedflag.className = 'btn-primary';
        btnRedflag.classList.add('kds-u-fs-ui', 'kds-u-p-8px-16px');
        btnRedflag.textContent = todosNegativos ? "Nenhum eixo sustentado — revisar segurança ➔" : "Revisar segurança ➔";
        btnRedflag.addEventListener('click', function() { estado.fase = 'redflag'; renderizarMapeamentoRegioes(); });
        acoes.appendChild(btnRedflag);
    }

    card.appendChild(acoes);
}

function renderizarFaseRedFlag(card, idRegiao, regiao, estado, destacar) {
    card.appendChild(construirBlocoRedFlags(idRegiao, regiao, destacar));

    const btnVoltar = document.createElement('button');
    btnVoltar.className = 'btn-secondary';
    btnVoltar.classList.add('kds-u-fs-ui', 'kds-u-p-8px-16px', 'kds-u-mt-12px');
    btnVoltar.textContent = "◀ Voltar aos outros eixos";
    btnVoltar.addEventListener('click', function() { estado.fase = 'diferencial'; renderizarMapeamentoRegioes(); });
    card.appendChild(btnVoltar);
}

/* função construirCardTestes substituída pelo Clinical Engine 1.4 */

/* função construirBlocoRedFlags substituída pelo Clinical Engine 1.4 */

document.addEventListener('click', function(e) {
    const btn = e.target.closest('.teste-botoes button');
    if (!btn) return;
    const wrap = btn.parentElement;
    const idRegiao = wrap.dataset.regiao;
    const chave = wrap.dataset.grupo + '::' + wrap.dataset.item + '::' + wrap.dataset.indice;
    const resultado = btn.dataset.resultado;
    const estado = obterEstadoRegiao(idRegiao);
    estado.resultados[chave] = (estado.resultados[chave] === resultado) ? undefined : resultado;

    // Avalia avanço automático de fase
    const contexto = coletarContextoClinico();
    const clustersOrdenados = ordenarClustersPorScore(idRegiao, contexto);
    if (clustersOrdenados.length === 0) return;

    if (estado.fase === 'suspeita') {
        const idEscolhido = estado.idClusterSuspeitaEscolhido || clustersOrdenados[0].item.id;
        const escolhido = clustersOrdenados.find(c => c.item.id === idEscolhido) || clustersOrdenados[0];
        if (avaliarCluster(idRegiao, escolhido.item) === 'negativo') {
            estado.fase = 'diferencial';
        }
    } else if (estado.fase === 'diferencial') {
        const idJaTestado = estado.idClusterSuspeitaEscolhido || (clustersOrdenados[0] && clustersOrdenados[0].item.id);
        const outrosClusters = clustersOrdenados.filter(c => c.item.id !== idJaTestado);
        const diferenciaisOrdenados = ordenarDiferenciaisPorScore(idRegiao, contexto);
        const candidatos = [
            ...outrosClusters.map(c => ({ item: c.item, grupo: 'cluster' })),
            ...diferenciaisOrdenados.map(d => ({ item: d.item, grupo: 'diferencial' }))
        ];
        if (candidatos.length === 0) return;
        const todosNegativos = candidatos.every(c =>
            (c.grupo === 'cluster' ? avaliarCluster(idRegiao, c.item) : avaliarDiferencial(idRegiao, c.item)) === 'negativo'
        );
        if (todosNegativos) estado.fase = 'redflag';
    }

    renderizarMapeamentoRegioes();
});

/* ================= SÍNTESE FINAL ================= */

/* função gerarSinteseMapeamento substituída pelo Clinical Engine 1.4 */

function renderizarSinteseDiagnostica() {
    const container = document.getElementById('container_sintese_diagnostica');
    if (!container) return;
    const { html } = gerarSinteseMapeamento();
    container.innerHTML = html;
    window.renderizarLaudoAvaliacaoKineSys?.();
}

function coletarDadosMapeamentoParaSalvar() {
    const { resumoPorRegiao, segurancaGlobal } = gerarSinteseMapeamento();
    if (!resumoPorRegiao || resumoPorRegiao.length === 0) return null;
    return {
        resumoPorRegiao: resumoPorRegiao,
        segurancaGlobal: segurancaGlobal || null,
        detalhes: JSON.parse(JSON.stringify(estadoMapeamento))
    };
}

/* ================= 14. INICIALIZAÇÃO DE EVENTOS GERAIS ================= */

async function inicializarAutenticacaoKineSys() {
    if (autenticacaoInicializada) return;
    autenticacaoInicializada = true;
    localStorage.removeItem('kinesys_sessao_logada');

    if (!_supabase) {
        usuarioLogado = null;
        sincronizarEstadoAutenticacaoVisual();
        navegarPara('tela_login');
        mostrarFeedbackLogin('Serviço de autenticação indisponível.', 'erro');
        return;
    }

    const { data: listenerData } = _supabase.auth.onAuthStateChange((event) => {
        if (event !== 'SIGNED_OUT') return;
        usuarioLogado = null;
        limparSelecaoPerfilLogin();
        sincronizarEstadoAutenticacaoVisual();
        navegarPara('tela_login');
    });
    authStateSubscription = listenerData?.subscription || null;

    try {
        const { data, error } = await _supabase.auth.getSession();
        if (error) throw error;
        const authUser = data?.session?.user;
        if (!authUser) {
            usuarioLogado = null;
            sincronizarEstadoAutenticacaoVisual();
            navegarPara('tela_login');
            return;
        }
        const email = document.getElementById('login_email');
        if (email && !email.value) email.value = authUser.email || '';
        await carregarAcessoDaSessao(authUser);
    } catch (err) {
        console.error('KineSys: sessão do Supabase inválida ou perfil indisponível.', err);
        usuarioLogado = null;
        sincronizarEstadoAutenticacaoVisual();
        navegarPara('tela_login');
        mostrarFeedbackLogin(err?.message || 'Sua sessão expirou. Entre novamente.', 'erro');
    }
}

document.addEventListener("DOMContentLoaded", function() {
    // Login: Enter funciona como atalho de envio nos campos de e-mail, senha
    // e também na escolha de perfil quando uma credencial possui mais de uma função.
    const loginEmail = document.getElementById('login_email');
    const loginSenha = document.getElementById('login_senha');
    const loginPerfil = document.getElementById('login_perfil');
    [loginEmail, loginSenha, loginPerfil].forEach(campo => {
        campo?.addEventListener('keydown', (event) => {
            if (event.key !== 'Enter') return;
            event.preventDefault();
            fazerLogin();
        });
    });

    // Se e-mail/senha mudarem depois de uma tentativa com múltiplos perfis,
    // invalida a seleção anterior para não reutilizar uma credencial velha.
    [loginEmail, loginSenha].forEach(campo => {
        campo?.addEventListener('input', () => {
            if (loginPerfisDisponiveis.length || loginCredencialChave) limparSelecaoPerfilLogin();
            mostrarFeedbackLogin('', 'info');
        });
    });

    document.querySelectorAll('.checkbox-group input[type="checkbox"]').forEach(chk => {
        chk.addEventListener('change', processarRadarEmTempoReal);
    });

    const inputProfissao = document.getElementById('paciente_ocupacao');
    const inputEsporte = document.getElementById('paciente_esporte');

    if (inputProfissao) inputProfissao.addEventListener('input', processarRadarEmTempoReal);
    if (inputEsporte) inputEsporte.addEventListener('input', processarRadarEmTempoReal);

    atualizarSelectsPacientes();
    popularSelectCRM();

    document.getElementById('rel_paciente_select')?.addEventListener('change', onPacienteRelatorioChange);
    instalarObservadorCicloVidaRadar();

    inicializarAutenticacaoKineSys();
});
/* ========================================================================== 
   KINESYS CLINICAL ENGINE 1.2 — REVISÃO DE CLUSTERS, DIFERENCIAIS, RED FLAGS E PESOS
   Camada de compatibilidade adicionada ao final do arquivo para preservar a
   estrutura existente. As funções abaixo substituem as versões anteriores.
   ========================================================================== */

const KINESYS_MOTOR_VERSION = '2.5.0';
const KINESYS_APP_VERSION = '1.17.1';
let autosaveTimerKineSys = null;
let autosaveSuspensoKineSys = false;
let cargasPacienteAvaliacaoKineSys = 0;
const radarAlertasJaApresentados = new Set();

// Item 11B — controle centralizado de abertura/fechamento.
// O componente está fisicamente dentro de #tela_avaliacao e, adicionalmente,
// é fechado de forma explícita para não sobreviver a nenhuma troca de tela.
function fecharRadarKineSys(removerContexto = false) {
    const container = document.getElementById('radar_flutuante_container');
    const painel = document.getElementById('radar_painel');
    const launcher = document.getElementById('radar_launcher');
    if (painel) {
        painel.classList.remove('aberto');
        painel.setAttribute('aria-hidden', 'true');
    }
    if (launcher) {
        launcher.setAttribute('aria-expanded', 'false');
        launcher.classList.remove('novo-alerta');
    }
    if (container && removerContexto) container.classList.remove('radar-contexto-avaliacao');
}

function sincronizarCicloVidaRadar() {
    const tela = document.getElementById('tela_avaliacao');
    const container = document.getElementById('radar_flutuante_container');
    if (!tela || !container) return;
    const ativa = tela.classList.contains('ativa');
    container.classList.toggle('radar-contexto-avaliacao', ativa);
    if (!ativa) fecharRadarKineSys(true);
}

function instalarObservadorCicloVidaRadar() {
    const tela = document.getElementById('tela_avaliacao');
    if (!tela || tela.dataset.radarLifecycleBound === '1') return;
    const observer = new MutationObserver(() => sincronizarCicloVidaRadar());
    observer.observe(tela, { attributes: true, attributeFilter: ['class'] });
    tela.dataset.radarLifecycleBound = '1';
    sincronizarCicloVidaRadar();
}


function obterValoresMarcados(selector) {
    return Array.from(document.querySelectorAll(selector + ':checked')).map(el => el.value);
}

function obterConfiabilidadeFonte() {
    const origem = document.getElementById('origem_informacao_clinica')?.value || 'relato_paciente';
    const confirmacao = document.getElementById('confirmacao_documental')?.value || 'nao_verificado';
    let fator = 0.75;
    if (['laudo','imagem','encaminhamento','prontuario_anterior','achado_fisioterapeuta'].includes(origem)) fator = 0.9;
    if (confirmacao === 'parcial') fator = Math.max(fator, 0.9);
    if (confirmacao === 'confirmado') fator = 1;
    return { origem, confirmacao, fator };
}

function atualizarFonteDadosCompacta() {
    const select = document.getElementById('origem_informacao_clinica');
    const origem = select?.value || 'relato_paciente';
    const confirmacao = document.getElementById('confirmacao_documental');
    if (confirmacao) {
        const mapa = {
            relato_paciente: 'nao_verificado',
            relato_documento: 'confirmado',
            laudo: 'confirmado',
            achado_fisioterapeuta: 'parcial'
        };
        confirmacao.value = mapa[origem] || 'nao_verificado';
    }
    const resumo = document.getElementById('fonte_dados_resumo');
    if (resumo && select) resumo.textContent = select.options[select.selectedIndex]?.text || 'Relato do paciente';
}

/* função coletarContextoClinico substituída pelo Clinical Engine 1.4 */

// Pontuação 1.2: pesos específicos por hipótese.
// O escore apenas ORDENA investigação; nunca deve ser apresentado como probabilidade.
/* função calcularScoreItem substituída pelo Clinical Engine 1.4 */

function sugerirExposicoesOcupacionais() {
    const el = document.getElementById('sugestao_exposicoes_ocupacionais');
    if (!el) return;
    const p = removerAcentos(document.getElementById('paciente_ocupacao')?.value || '');
    const sugestoes = [];
    if (/motorista|caminhoneiro|taxista|uber|operador de maquina|tratorista/.test(p)) sugestoes.push('sedestação prolongada', 'vibração');
    if (/pedreiro|servente|estoquista|carregador|mecanico|marceneiro|carpinteiro/.test(p)) sugestoes.push('flexão/rotação com carga');
    if (/pintor|eletricista|cabeleireiro|barbeiro/.test(p)) sugestoes.push('trabalho acima da cabeça');
    if (/digitador|programador|secretaria|contador|designer|administrativo|recepcionista/.test(p)) sugestoes.push('sedestação prolongada', 'repetição de mãos/punhos');
    if (/fisioterapeuta|enfermeiro|cuidador/.test(p)) sugestoes.push('manejo de pacientes');
    el.textContent = sugestoes.length ? `Sugestões para confirmar na entrevista: ${[...new Set(sugestoes)].join(', ')}. Nada é marcado automaticamente.` : '';
}

function processarRadarEmTempoReal() {
    const containerFlutuante = document.getElementById('radar_flutuante_container');
    if (!containerFlutuante) return;
    const telaAvaliacao = document.getElementById('tela_avaliacao');
    if (!telaAvaliacao?.classList.contains('ativa')) {
        fecharRadarKineSys(true);
        return;
    }
    containerFlutuante.classList.add('radar-contexto-avaliacao');
    const contexto = coletarContextoClinico();
    const alertasMatriz = [];

    // Exposição ocupacional confirmada — não inferida apenas pelo cargo.
    const eo = contexto.exposicoesOcupacionais;
    if (eo.includes('sentado_prolongado')) alertasMatriz.push({nivel:'medio', titulo:'Exposição ocupacional: sedestação prolongada', desc:'Considere duração, pausas, variabilidade postural e relação temporal com os sintomas; a posição isolada não define a causa do quadro.'});
    if (eo.includes('em_pe_prolongado')) alertasMatriz.push({nivel:'medio', titulo:'Exposição ocupacional: ortostatismo prolongado', desc:'Considere tempo contínuo em pé, possibilidade de pausas e tolerância individual.'});
    if (eo.includes('flexao_rotacao_carga')) alertasMatriz.push({nivel:'medio', titulo:'Exposição ocupacional: manuseio de carga', desc:'Há flexão/rotação de tronco associada à carga. Quantifique peso, frequência, fadiga e técnica real de tarefa.'});
    if (eo.includes('acima_cabeca')) alertasMatriz.push({nivel:'medio', titulo:'Exposição ocupacional acima da cabeça', desc:'Quantifique duração e repetição de elevação dos membros superiores antes de relacionar a exposição aos sintomas.'});
    if (eo.includes('repeticao_maos')) alertasMatriz.push({nivel:'medio', titulo:'Exposição repetitiva de mãos/punhos', desc:'Investigue frequência, força de preensão, pausas e padrão de sintomas.'});
    if (eo.includes('vibracao')) alertasMatriz.push({nivel:'medio', titulo:'Exposição à vibração', desc:'Registre tipo, duração e frequência da vibração ocupacional como fator de exposição, não como diagnóstico.'});
    if (eo.includes('manejo_pacientes')) alertasMatriz.push({nivel:'medio', titulo:'Transferência/manejo de pacientes', desc:'Avalie frequência, assistência disponível, carga real e estratégias utilizadas durante transferências.'});

    // Carga esportiva: nome do esporte não gera alerta sozinho.
    const ee = contexto.exposicoesEsportivas;
    const mudanca = document.getElementById('esporte_mudanca_carga')?.value || '';
    const freq = parseInt(document.getElementById('esporte_frequencia')?.value,10) || 0;
    const duracao = parseInt(document.getElementById('esporte_duracao')?.value,10) || 0;
    if (['moderado','acentuado'].includes(mudanca)) alertasMatriz.push({nivel:'medio', titulo:'Mudança recente de carga esportiva', desc:`Foi relatado aumento ${mudanca} nas últimas 4 semanas. Correlacione temporalmente a mudança com o início/piora dos sintomas.`});
    if (freq >= 6 || (freq * duracao >= 600 && duracao > 0)) alertasMatriz.push({nivel:'medio', titulo:'Volume esportivo elevado', desc:'Carga semanal informada é alta. Interprete em relação ao histórico de treinamento, recuperação e tolerância do paciente.'});
    if (ee.includes('impacto')) alertasMatriz.push({nivel:'medio', titulo:'Exposição esportiva a impacto', desc:'Impacto repetido foi confirmado. Use como contexto de carga e não como marcador isolado de patologia.'});
    if (ee.includes('forca_alta')) alertasMatriz.push({nivel:'medio', titulo:'Exposição a força/carga externa alta', desc:'Considere intensidade relativa, progressão recente, técnica e recuperação.'});
    if (ee.includes('overhead')) alertasMatriz.push({nivel:'medio', titulo:'Gesto esportivo acima da cabeça', desc:'Quantifique volume, velocidade e relação com sintomas do ombro/cervical.'});
    if (ee.includes('rotacao')) alertasMatriz.push({nivel:'medio', titulo:'Pivô/rotação esportiva frequente', desc:'Contextualize o gesto com mecanismo, terreno, fadiga e sintomas específicos.'});
    if (ee.includes('endurance')) alertasMatriz.push({nivel:'medio', titulo:'Endurance prolongado', desc:'Considere volume total, recuperação, sono e mudança recente de carga.'});

    // Histórico cirúrgico permanece como dado de cautela, sem declarar causalidade.
    document.querySelectorAll('#tags_cirurgias .tag-cirurgia').forEach(tag => {
        const dados = typeof dicionarioCirurgias !== 'undefined' ? dicionarioCirurgias[tag.dataset.chave] : null;
        if (!dados) return;
        if ((dados.regiaoAnatomica || []).includes('coluna_vertebral')) alertasMatriz.push({nivel:'critico', titulo:'Histórico de intervenção em coluna', desc:`${tag.dataset.exibicao || dados.exibicao}. Antes de técnicas provocativas/manuais, confirme nível operado, tempo pós-operatório, consolidação e restrições médicas.`});
        else alertasMatriz.push({nivel:'medio', titulo:'Histórico cirúrgico relevante', desc:`${tag.dataset.exibicao || dados.exibicao}. Confirme data, técnica, evolução, restrições e documentação disponível.`});
    });

    // Radar medicamentoso 1.2 — classes separadas e linguagem de cautela.
    const meds = contexto.textoMedicamentos;
    const anticoag = /anticoagulante|varfarina|marevan|rivaroxabana|xarelto|apixabana|eliquis|dabigatrana|pradaxa|enoxaparina|clexane/.test(meds);
    const antiagreg = /antiagregante|aas|aspirina|clopidogrel|plavix/.test(meds);
    const quinolona = /ciprofloxacino|ciprofloxacin|levofloxacino|levofloxacin|moxifloxacino|moxifloxacin|fluoroquinolona|quinolona/.test(meds);
    const estatina = /estatina|sinvastatina|atorvastatina|rosuvastatina|pravastatina/.test(meds);
    const aine = contexto.comorbidades.aine_recente || /aine|ibuprofeno|diclofenaco|nimesulida|cetoprofeno|cetorolaco|piroxicam|meloxicam|celecoxibe|etoricoxibe/.test(meds);
    const cortSis = contexto.comorbidades.corticoide_sistemico || contexto.comorbidades.corticoide || /prednisona|prednisolona|dexametasona|betametasona|deflazacorte|corticosteroide|corticoide/.test(meds);
    const cortInf = contexto.comorbidades.corticoide_infiltracao;

    if (anticoag || antiagreg) alertasMatriz.push({nivel:'critico', titulo:'Terapia antitrombótica identificada', desc:'Aumente a cautela com procedimentos invasivos ou capazes de produzir trauma tecidual/hematoma. Confirme fármaco, dose, indicação e histórico de sangramento; não suspenda medicação por conta própria.'});
    if (aine && (anticoag || antiagreg)) alertasMatriz.push({nivel:'critico', titulo:'AINE + terapia antitrombótica', desc:'A combinação pode aumentar risco de sangramento. Registre o uso e oriente avaliação médica/farmacêutica quando houver dúvida, sinais de sangramento ou necessidade de procedimento invasivo.'});
    if (quinolona) alertasMatriz.push({nivel:'critico', titulo:'Fluoroquinolona em uso recente', desc:'Há associação conhecida com tendinopatia/ruptura tendínea. Considere tempo de uso, sintomas tendíneos, idade, uso concomitante de corticoide e ajuste de carga.'});
    if (cortSis) alertasMatriz.push({nivel:'medio', titulo:'Corticoide sistêmico', desc:'Considere dose, duração e contexto clínico por possíveis efeitos sobre tecido conjuntivo, osso, glicemia e cicatrização.'});
    if (cortInf) alertasMatriz.push({nivel:'medio', titulo:'Infiltração recente de corticoide', desc:'Registre local e data da infiltração e considere a orientação médica para progressão de carga do tecido tratado.'});
    if (estatina) alertasMatriz.push({nivel:'medio', titulo:'Estatina em uso', desc:'Se houver mialgia difusa, fraqueza ou sintomas musculares atípicos, considere o medicamento entre os diferenciais e encaminhe para revisão médica quando indicado.'});
    if (contexto.comorbidades.diabetico) alertasMatriz.push({nivel:'medio', titulo:'Diabetes', desc:'Considere controle glicêmico, sensibilidade periférica, integridade cutânea e possível influência na cicatrização conforme o caso.'});

    // Yellow flags: soma contextual, sem transformar em diagnóstico psicológico.
    const yf = contexto.yellowFlags.length;
    if (yf >= 4) alertasMatriz.push({nivel:'medio', titulo:'Yellow Flags — impacto contextual elevado', desc:`${yf} fatores contextuais foram marcados. Considere educação, metas funcionais graduais, comunicação de segurança e acompanhamento da resposta ao tratamento.`});
    else if (yf >= 2) alertasMatriz.push({nivel:'medio', titulo:'Yellow Flags — atenção contextual', desc:`${yf} fatores contextuais foram marcados e podem influenciar adesão, comportamento e recuperação.`});

    ultimoRadarAlertas = alertasMatriz;

    const launcher = document.getElementById('radar_launcher');
    const badge = document.getElementById('radar_badge');
    const painel = document.getElementById('radar_painel');
    const fechar = document.getElementById('radar_fechar');
    const resumo = document.getElementById('radar_painel_resumo');
    const lista = document.getElementById('radar_alertas_lista');
    if (!launcher || !badge || !painel || !lista) return;

    // Item 11: um único dock lateral. Alertas novos atualizam o contador, mas nunca
    // abrem cartões automaticamente sobre a área de leitura da avaliação.
    if (containerFlutuante.dataset.radarBound !== '1') {
        const definirPainelRadar = (aberto) => {
            if (!document.getElementById('tela_avaliacao')?.classList.contains('ativa')) {
                fecharRadarKineSys(true);
                return;
            }
            painel.classList.toggle('aberto', aberto);
            painel.setAttribute('aria-hidden', aberto ? 'false' : 'true');
            launcher.setAttribute('aria-expanded', aberto ? 'true' : 'false');
        };
        launcher.addEventListener('click', (ev) => {
            ev.stopPropagation();
            definirPainelRadar(!painel.classList.contains('aberto'));
        });
        fechar?.addEventListener('click', (ev) => {
            ev.stopPropagation();
            definirPainelRadar(false);
            launcher.focus({preventScroll:true});
        });
        document.addEventListener('click', (ev) => {
            if (painel.classList.contains('aberto') && !containerFlutuante.contains(ev.target)) definirPainelRadar(false);
        });
        document.addEventListener('keydown', (ev) => {
            if (ev.key === 'Escape' && painel.classList.contains('aberto')) {
                definirPainelRadar(false);
                launcher.focus({preventScroll:true});
            }
        });
        containerFlutuante.dataset.radarBound = '1';
    }

    const chaveAlerta = a => removerAcentos(`${a.nivel}|${a.titulo}|${a.desc}`).replace(/[^a-z0-9|]+/g,'_').slice(0,220);
    let existeNovoAlerta = false;
    alertasMatriz.forEach(alerta => {
        const key = chaveAlerta(alerta);
        if (!radarAlertasJaApresentados.has(key)) {
            radarAlertasJaApresentados.add(key);
            existeNovoAlerta = true;
        }
    });

    if (alertasMatriz.length === 0) {
        containerFlutuante.classList.remove('radar-ativo');
        launcher.classList.remove('tem-critico', 'novo-alerta');
        badge.textContent = '0';
        badge.setAttribute('aria-label', '0 alertas');
        lista.innerHTML = '';
        if (resumo) resumo.textContent = 'Nenhum alerta ativo.';
        painel.classList.remove('aberto');
        painel.setAttribute('aria-hidden', 'true');
        launcher.setAttribute('aria-expanded', 'false');
        return;
    }

    const criticos = alertasMatriz.filter(a => a.nivel === 'critico').length;
    const medios = alertasMatriz.length - criticos;
    const total = alertasMatriz.length;
    containerFlutuante.classList.add('radar-ativo');
    launcher.classList.toggle('tem-critico', criticos > 0);
    badge.textContent = total > 99 ? '99+' : String(total);
    badge.setAttribute('aria-label', `${total} alerta${total === 1 ? '' : 's'}`);
    launcher.setAttribute('title', `${total} alerta${total === 1 ? '' : 's'} no Radar KineSys — clique para revisar`);

    if (resumo) {
        const partes = [];
        if (criticos) partes.push(`${criticos} prioritário${criticos === 1 ? '' : 's'}`);
        if (medios) partes.push(`${medios} de atenção`);
        resumo.textContent = `${total} alerta${total === 1 ? '' : 's'} ativo${total === 1 ? '' : 's'} · ${partes.join(' · ')}. O painel só abre quando solicitado.`;
    }

    lista.innerHTML = alertasMatriz.map((alerta, index) => `
        <article class="alerta-card ${alerta.nivel}" id="alerta_card_${index}" data-radar-key="${escapeHTML(chaveAlerta(alerta))}" data-nivel="${escapeHTML(alerta.nivel)}">
            <div class="alerta-card-header"><span>RADAR KINESYS</span><span>${alerta.nivel === 'critico' ? 'ATENÇÃO PRIORITÁRIA' : 'ATENÇÃO'}</span></div>
            <div class="alerta-card-titulo">${escapeHTML(alerta.titulo)}</div>
            <div class="alerta-card-desc">${escapeHTML(alerta.desc)}</div>
        </article>`).join('');

    if (existeNovoAlerta && !painel.classList.contains('aberto')) {
        launcher.classList.remove('novo-alerta');
        void launcher.offsetWidth;
        launcher.classList.add('novo-alerta');
        setTimeout(() => launcher.classList.remove('novo-alerta'), 1500);
    }

}

/* função construirBlocoRedFlags substituída pelo Clinical Engine 1.4 */

/* função avancarParaDiagnostico substituída pelo Clinical Engine 1.4 */

// Síntese 1.2 evita a palavra “confirmada” para não transformar cluster em diagnóstico fechado.
/* função gerarSinteseMapeamento substituída pelo Clinical Engine 1.4 */


/* ================= 1.5 — MEDIDAS, DESFECHOS, OBJETIVOS E PLANO ================= */
let contadorMedidasObjetivas = 0;
let contadorOutcomes = 0;
let contadorPSFS = 0;
let contadorObjetivos = 0;

function adicionarMedidaObjetiva(dados={}) {
    const c=document.getElementById('lista_medidas_objetivas'); if(!c)return;
    const id=++contadorMedidasObjetivas; const row=document.createElement('div'); row.className='clinical-row medida-objetiva'; row.dataset.id=id;
    row.innerHTML=`<div><label>Medida / teste</label><input class="mo_nome" placeholder="Ex.: dorsiflexão lunge test, flexão de joelho, dinamometria" value="${escapeHTML(dados.nome||'')}"></div><div><label>Valor</label><input class="mo_valor" type="number" step="0.01" value="${escapeHTML(dados.valor??'')}"></div><div><label>Unidade</label><input class="mo_unidade" placeholder="° / cm / kgf / s" value="${escapeHTML(dados.unidade||'')}"></div><div><label>Lado / observação</label><input class="mo_obs" placeholder="D/E, posição, equipamento..." value="${escapeHTML(dados.observacao||'')}"></div><button type="button" class="btn-secondary" onclick="this.closest('.medida-objetiva').remove()">✕</button>`;
    c.appendChild(row);
}
function coletarMedidasObjetivas(){return Array.from(document.querySelectorAll('.medida-objetiva')).map(r=>{const raw=r.querySelector('.mo_valor')?.value;return{nome:r.querySelector('.mo_nome')?.value.trim()||'',valor:(raw===''||raw==null)?null:Number(raw),unidade:r.querySelector('.mo_unidade')?.value.trim()||'',observacao:r.querySelector('.mo_obs')?.value.trim()||''};}).filter(x=>x.nome||x.valor!==null);}

const OUTCOME_META={NDI:{nome:'Neck Disability Index',min:0,max:100,direcao:'menor_melhor'},ODI:{nome:'Oswestry Disability Index',min:0,max:100,direcao:'menor_melhor'},SPADI:{nome:'Shoulder Pain and Disability Index',min:0,max:100,direcao:'menor_melhor'},QuickDASH:{nome:'QuickDASH',min:0,max:100,direcao:'menor_melhor'},LEFS:{nome:'Lower Extremity Functional Scale',min:0,max:80,direcao:'maior_melhor'},KOOS12:{nome:'KOOS-12',min:0,max:100,direcao:'maior_melhor'},Outro:{nome:'Outro instrumento',min:'',max:'',direcao:'maior_melhor'}};
function adicionarOutcomeSelecionado(){const key=document.getElementById('outcome_modelo')?.value||'Outro';adicionarOutcome({instrumento:key});}
function adicionarOutcome(dados={}){
    const c=document.getElementById('lista_outcomes');if(!c)return; const key=dados.instrumento||'Outro',m=OUTCOME_META[key]||OUTCOME_META.Outro; const row=document.createElement('div');row.className='clinical-row outcome outcome-row';row.dataset.id=++contadorOutcomes;
    row.innerHTML=`<div><label>Instrumento</label><input class="out_nome" value="${escapeHTML(dados.nome||m.nome)}"></div><div><label>Resultado</label><input class="out_valor" type="number" step="0.1" value="${escapeHTML(dados.valor??'')}"></div><div><label>Faixa</label><input class="out_faixa" value="${escapeHTML(dados.faixa||((m.min!==''&&m.max!=='')?m.min+'–'+m.max:''))}"></div><div><label>Direção</label><select class="out_direcao"><option value="maior_melhor" ${((dados.direcao||m.direcao)==='maior_melhor')?'selected':''}>Maior = melhor</option><option value="menor_melhor" ${((dados.direcao||m.direcao)==='menor_melhor')?'selected':''}>Menor = melhor</option></select></div><div><label>Observação</label><input class="out_obs" value="${escapeHTML(dados.observacao||'')}"></div><button type="button" class="btn-secondary" onclick="this.closest('.outcome-row').remove()">✕</button>`;c.appendChild(row);
}
function coletarOutcomes(){return Array.from(document.querySelectorAll('.outcome-row')).map(r=>{const raw=r.querySelector('.out_valor')?.value;return{nome:r.querySelector('.out_nome')?.value.trim()||'',valor:(raw===''||raw==null)?null:Number(raw),faixa:r.querySelector('.out_faixa')?.value.trim()||'',direcao:r.querySelector('.out_direcao')?.value||'',observacao:r.querySelector('.out_obs')?.value.trim()||''};}).filter(x=>x.nome&&x.valor!==null);}

function adicionarAtividadePSFS(dados={}){const c=document.getElementById('lista_psfs');if(!c)return;const row=document.createElement('div');row.className='psfs-grid psfs-row';row.dataset.id=++contadorPSFS;row.innerHTML=`<div><label>Atividade relevante</label><input class="psfs_atividade" placeholder="Ex.: subir escadas, correr 5 km, levantar o braço" value="${escapeHTML(dados.atividade||'')}"></div><div><label>Capacidade 0–10</label><input class="psfs_valor" type="number" min="0" max="10" step="0.5" value="${escapeHTML(dados.valor??'')}" oninput="atualizarPSFSMedia()"></div><button type="button" class="btn-secondary" onclick="this.closest('.psfs-row').remove();atualizarPSFSMedia()">✕</button>`;c.appendChild(row);atualizarPSFSMedia();}
function coletarPSFS(){const itens=Array.from(document.querySelectorAll('.psfs-row')).map(r=>({atividade:r.querySelector('.psfs_atividade')?.value.trim()||'',valor:parseFloat(r.querySelector('.psfs_valor')?.value)})).filter(x=>x.atividade&&Number.isFinite(x.valor));const media=itens.length?itens.reduce((s,x)=>s+x.valor,0)/itens.length:null;return{itens,media:media===null?null:Math.round(media*100)/100};}
function atualizarPSFSMedia(){const r=coletarPSFS(),el=document.getElementById('psfs_resumo');if(!el)return;el.textContent=r.media===null?'PSFS: sem atividades registradas.':`PSFS média: ${r.media.toFixed(1)}/10 (${r.itens.length} atividade(s)).`;}

function adicionarObjetivoTerapeutico(dados={}){const c=document.getElementById('lista_objetivos_terapeuticos');if(!c)return;const row=document.createElement('div');row.className='clinical-row goal objetivo-row';row.dataset.id=++contadorObjetivos;const st=dados.status||'em_progresso';row.innerHTML=`<div><label>Objetivo funcional / clínico</label><input class="obj_texto" placeholder="Ex.: caminhar 30 min sem aumento sustentado da dor" value="${escapeHTML(dados.objetivo||'')}"></div><div><label>Baseline</label><input class="obj_base" placeholder="Ex.: 10 min / PSFS 3" value="${escapeHTML(dados.baseline||'')}"></div><div><label>Meta</label><input class="obj_meta" placeholder="Ex.: 30 min / PSFS 7" value="${escapeHTML(dados.meta||'')}"></div><div><label>Prazo</label><input class="obj_prazo" placeholder="Ex.: 4 semanas" value="${escapeHTML(dados.prazo||'')}"></div><div><label>Status</label><select class="obj_status"><option value="nao_iniciado" ${st==='nao_iniciado'?'selected':''}>Não iniciado</option><option value="em_progresso" ${st==='em_progresso'?'selected':''}>Em progresso</option><option value="atingido" ${st==='atingido'?'selected':''}>Atingido</option><option value="nao_atingido" ${st==='nao_atingido'?'selected':''}>Não atingido</option><option value="reformulado" ${st==='reformulado'?'selected':''}>Reformulado</option></select></div><button type="button" class="btn-secondary" onclick="this.closest('.objetivo-row').remove()">✕</button>`;c.appendChild(row);}
function coletarObjetivosPlano(){return{objetivos:Array.from(document.querySelectorAll('.objetivo-row')).map(r=>({objetivo:r.querySelector('.obj_texto')?.value.trim()||'',baseline:r.querySelector('.obj_base')?.value.trim()||'',meta:r.querySelector('.obj_meta')?.value.trim()||'',prazo:r.querySelector('.obj_prazo')?.value.trim()||'',status:r.querySelector('.obj_status')?.value||'em_progresso'})).filter(x=>x.objetivo),plano:document.getElementById('plano_terapeutico')?.value.trim()||'',frequencia:document.getElementById('plano_frequencia')?.value.trim()||'',criterios:document.getElementById('plano_criterios')?.value.trim()||'',criteriosAlta:document.getElementById('criterios_alta')?.value.trim()||'',previsaoAlta:document.getElementById('previsao_alta')?.value.trim()||''};}
function coletarRestricoesPosOperatorias(){return{ativo:!!document.getElementById('posop_ativo')?.checked,procedimento:document.getElementById('posop_procedimento')?.value.trim()||'',dataCirurgia:document.getElementById('posop_data_cirurgia')?.value||'',statusCarga:document.getElementById('posop_carga')?.value||'',ortese:document.getElementById('posop_ortese')?.value.trim()||'',restricaoADM:document.getElementById('posop_adm')?.value.trim()||'',proibicoes:document.getElementById('posop_proibicoes')?.value.trim()||'',orientacoesCirurgiao:document.getElementById('posop_orientacoes')?.value.trim()||'',retornoMedico:document.getElementById('posop_retorno_medico')?.value||'',protocoloDisponivel:document.getElementById('posop_protocolo')?.value||'nao_informado',observacoes:document.getElementById('posop_obs')?.value.trim()||''};}
function atualizarVisibilidadeRestricoesPosOp(){const box=document.getElementById('posop_campos');if(box)box.style.display=document.getElementById('posop_ativo')?.checked?'block':'none';}
function preencherRestricoesPosOperatorias(d={}){const mapa={posop_ativo:!!d.ativo,posop_procedimento:d.procedimento||'',posop_data_cirurgia:d.dataCirurgia||'',posop_carga:d.statusCarga||'',posop_ortese:d.ortese||'',posop_adm:d.restricaoADM||'',posop_proibicoes:d.proibicoes||'',posop_orientacoes:d.orientacoesCirurgiao||'',posop_retorno_medico:d.retornoMedico||'',posop_protocolo:d.protocoloDisponivel||'nao_informado',posop_obs:d.observacoes||''};Object.entries(mapa).forEach(([id,v])=>{const el=document.getElementById(id);if(!el)return;if(el.type==='checkbox')el.checked=!!v;else el.value=v;});atualizarVisibilidadeRestricoesPosOp();}
let clinicaEstruturadaPreservada = {};
function coletarClinicaEstruturada(){return{...JSON.parse(JSON.stringify(clinicaEstruturadaPreservada)),restricoesPosOperatorias:coletarRestricoesPosOperatorias(),laudo:window.coletarLaudoAvaliacaoKineSys?.()||null};}
function limparClinicaEstruturada(){clinicaEstruturadaPreservada={};window.preencherLaudoAvaliacaoKineSys?.(null);['lista_medidas_objetivas','lista_psfs','lista_outcomes','lista_objetivos_terapeuticos'].forEach(id=>{const el=document.getElementById(id);if(el)el.innerHTML='';});['plano_terapeutico','plano_frequencia','plano_criterios','criterios_alta','previsao_alta','posop_procedimento','posop_data_cirurgia','posop_ortese','posop_adm','posop_proibicoes','posop_orientacoes','posop_retorno_medico','posop_obs'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});const ativo=document.getElementById('posop_ativo');if(ativo)ativo.checked=false;const carga=document.getElementById('posop_carga');if(carga)carga.value='';const prot=document.getElementById('posop_protocolo');if(prot)prot.value='nao_informado';atualizarVisibilidadeRestricoesPosOp();atualizarPSFSMedia();}
function preencherClinicaEstruturada(d={}){limparClinicaEstruturada();clinicaEstruturadaPreservada=JSON.parse(JSON.stringify(d||{}));preencherRestricoesPosOperatorias(d.restricoesPosOperatorias||{});window.preencherLaudoAvaliacaoKineSys?.(d.laudo||null);}

function montarContextoMotorParaSalvar() {
    return {
        versaoMotor: KINESYS_MOTOR_VERSION,
        fonteDados: obterConfiabilidadeFonte(),
        irradiacaoEstruturada: { origem: document.getElementById('paciente_origem_irradiacao')?.value?.trim()||'', trajeto: document.getElementById('paciente_irradiacao')?.value?.trim()||'' },
        exposicoesOcupacionais: obterValoresMarcados('.chk_exposicao_ocupacional'),
        cargaEsportiva: {
            frequenciaSemanal: (()=>{const v=document.getElementById('esporte_frequencia')?.value;return(v===''||v==null)?null:parseInt(v,10);})(),
            duracaoMinutos: (()=>{const v=document.getElementById('esporte_duracao')?.value;return(v===''||v==null)?null:parseInt(v,10);})(),
            nivel: document.getElementById('esporte_nivel')?.value||'',
            mudancaCarga4Semanas: document.getElementById('esporte_mudanca_carga')?.value||'',
            exposicoes: obterValoresMarcados('.chk_exposicao_esportiva')
        },
        yellowFlags: { itens: obterValoresMarcados('.chk_yellow_flag'), observacao: document.getElementById('yellow_flags_observacao')?.value?.trim()||'' },
        medicamentosEstruturados: {
            corticoideSistemico: !!document.getElementById('chk_corticoide_sistemico')?.checked,
            corticoideInfiltracao: !!document.getElementById('chk_corticoide_infiltracao')?.checked,
            aineRecente: !!document.getElementById('chk_aine_recente')?.checked
        }
    };
}

function validarSegurancaParaFinalizacao() {
    const regioes=Array.from(document.querySelectorAll('#grupo_regioes_mapeamento input:checked')).map(i=>i.dataset.regiao);
    if(!regioes.length)return{ok:false,mensagem:'Selecione ao menos uma região e conclua o mapeamento antes de finalizar.'};
    const contexto=coletarContextoClinico();
    for(const id of regioes){const regiao=BANCO_MAPEAMENTO_CLINICO[id],estado=obterEstadoRegiao(id);const fp=fingerprintSeguranca(id,regiao,contexto);const marcadas=(regiao.redFlags||[]).some((_,i)=>estado.resultados['redflag::'+i]);const alertas=alertasTextuaisParaRegiaoKineSys(contexto,id);if(!estado.redflagsRevisadas||estado.safetyFingerprint!==fp)return{ok:false,mensagem:`Revise e confirme a triagem de segurança de ${regiao.nome} antes de finalizar.`};if((marcadas||alertas.length)&&!estado.redflagAcknowledge)return{ok:false,mensagem:`Há sinal/termo de alerta em ${regiao.nome} sem decisão clínica registrada.`};}
    return{ok:true};
}
async function salvarAvaliacaoAtual(finalizar=false) {
    if(finalizar){window.renderizarLaudoAvaliacaoKineSys?.();const laudo=window.coletarLaudoAvaliacaoKineSys?.();if(laudo&&!laudo.revisado){alert('Revise o texto do laudo e marque a confirmação de revisão antes de finalizar. Você pode salvar um rascunho a qualquer momento.');return;}}
    const nome=document.getElementById('paciente_nome')?.value.trim();
    if(!nome){alert('⚠️ Informe o nome do paciente na avaliação antes de salvar.');return;}
    const realizadoInput=validarRealizacaoClinicaInput('avaliacao_realizado_em');
    if(!realizadoInput)return;
    if(finalizar){const v=validarSegurancaParaFinalizacao();if(!v.ok){alert('Finalização bloqueada.\n\n'+v.mensagem+'\n\nO rascunho permanece disponível.');return;}}
    let lista=await obterPacientesSalvos();
    let pacienteExistente=pacienteAtualId?lista.find(p=>String(p.id)===String(pacienteAtualId)):null;
    if(!pacienteExistente&&!pacienteAtualId){const duplicados=lista.filter(p=>(p.nome||'').toLowerCase()===nome.toLowerCase());if(duplicados.length&&!(await confirmarKineSys(`Já existe(m) ${duplicados.length} paciente(s) chamado(s) "${nome}".\n\nSalvar como NOVO cadastro?`, {titulo:'Paciente com nome semelhante', confirmar:'Salvar como novo'})))return;}

    const historico=pacienteExistente?obterAvaliacoes(pacienteExistente):[];
    const registroEmEdicao=avaliacaoEdicaoId?historico.find(a=>String(a.id)===String(avaliacaoEdicaoId)):null;
    if(avaliacaoEdicaoId&&!registroEmEdicao){alert('⚠️ A avaliação em edição não foi encontrada. Reabra o prontuário.');avaliacaoEdicaoId=null;return;}
    if(registroEmEdicao&&!registroClinicoPodeEditar(registroEmEdicao)){alert(`🔒 O prazo de edição terminou em ${formatarDataHoraClinica(obterLimiteEdicaoRegistro(registroEmEdicao))}. Nenhuma alteração foi salva.`);return;}

    const tagsCirurgiasArr=[];document.querySelectorAll('#tags_cirurgias .tag-cirurgia').forEach(tag=>tagsCirurgiasArr.push({chave:tag.dataset.chave,texto:tag.textContent.replace('✕','').trim()}));
    const tagsMedArr=[];document.querySelectorAll('#tags_medicamentos div').forEach(tag=>tagsMedArr.push(tag.textContent.replace('✕','').trim()));
    const mapeamento=coletarDadosMapeamentoParaSalvar()||registroEmEdicao?.mapeamento||{resumoPorRegiao:[],detalhes:{}};
    mapeamento.contextoMotor=montarContextoMotorParaSalvar();
    mapeamento.analiseIrradiacao=analisarPadroesIrradiacao().slice(0,8).map(x=>({id:x.id,nome:x.nome,regiao:x.regiao,tipo:x.tipo,indiceHeuristico:x.score}));
    mapeamento.clinicaEstruturada=coletarClinicaEstruturada();
    const realizadoEm=registroEmEdicao?obterRealizadoEmRegistro(registroEmEdicao):realizadoInput;
    mapeamento.dataISO=String(realizadoEm||new Date().toISOString()).slice(0,10);
    const agora=new Date();
    const prof=metadadosProfissionalLogado();
    const finalizadas=historico.filter(a=>a.status!=='rascunho');
    const dadosAvaliacao={
        id:registroEmEdicao?.id||`av_${Date.now()}_${Math.random().toString(36).slice(2,7)}`,
        versaoMotor:KINESYS_MOTOR_VERSION,
        status:registroEmEdicao?.status||(finalizar?'finalizada':'rascunho'),
        registroImutavel:registroEmEdicao?!!registroEmEdicao.registroImutavel:!!finalizar,
        registroAnteriorId:registroEmEdicao?.registroAnteriorId||(historico.length?(historico[historico.length-1].id||null):null),
        dataAvaliacao:String(realizadoEm).slice(0,10),
        dataHoraISO:registroEmEdicao?.dataHoraISO||registroEmEdicao?.salvoEm||agora.toISOString(),
        realizadoEm,
        salvoEm:registroEmEdicao?obterSalvoEmRegistro(registroEmEdicao):null,
        edicaoLimiteEm:registroEmEdicao?obterLimiteEdicaoRegistro(registroEmEdicao):null,
        realizadoPor:registroEmEdicao?.realizadoPor||registroEmEdicao?.profissionalNome||prof.profissionalNome,
        profissionalId:registroEmEdicao?.profissionalId||prof.profissionalId,
        profissionalNome:registroEmEdicao?.profissionalNome||registroEmEdicao?.realizadoPor||prof.profissionalNome,
        profissionalRegistro:registroEmEdicao?.profissionalRegistro||prof.profissionalRegistro,
        ultimaEdicaoEm:registroEmEdicao?agora.toISOString():null,
        ultimaEdicaoPorId:registroEmEdicao?prof.profissionalId:null,
        ultimaEdicaoPorNome:registroEmEdicao?prof.profissionalNome:null,
        idade:document.getElementById('paciente_idade')?.value||'',
        profissao:document.getElementById('paciente_ocupacao')?.value||'',
        esporte:document.getElementById('paciente_esporte')?.value||'',
        comorbidades:{tabagista:!!document.getElementById('chk_tabagista')?.checked,etilista:!!document.getElementById('chk_etilista')?.checked,hipertenso:!!document.getElementById('chk_hipertenso')?.checked,diabetico:!!document.getElementById('chk_diabetico')?.checked,corticoide:!!document.getElementById('chk_corticoide_sistemico')?.checked||!!document.getElementById('chk_corticoide_infiltracao')?.checked,corticoide_sistemico:!!document.getElementById('chk_corticoide_sistemico')?.checked,corticoide_infiltracao:!!document.getElementById('chk_corticoide_infiltracao')?.checked,aine_recente:!!document.getElementById('chk_aine_recente')?.checked,cirurgia:!!document.getElementById('chk_cirurgia')?.checked},
        cirurgias:tagsCirurgiasArr,medicamentos:tagsMedArr,
        evaInicial:document.getElementById('eva_slider')?parseInt(document.getElementById('eva_slider').value,10)||0:0,
        hma:document.getElementById('paciente_hma')?.value||'',mapeamento
    };
    if(registroEmEdicao){
        dadosAvaliacao.tipo=registroEmEdicao.tipo||'Avaliação';
    }else{
        dadosAvaliacao.tipo=finalizadas.length===0?'Avaliação Inicial':'Reavaliação';
    }
    const pacienteObjeto=pacienteExistente||{id:'pac_'+Date.now(),dataCadastroISO:agora.toISOString().slice(0,10),cadastradoPor:prof.profissionalNome,nome,profissao:dadosAvaliacao.profissao,evolucoes:[],avaliacoes:[]};
    pacienteObjeto.nome=nome;
    if(registroEmEdicao) pacienteObjeto.avaliacoes=historico.map(a=>String(a.id)===String(registroEmEdicao.id)?dadosAvaliacao:a);
    else pacienteObjeto.avaliacoes=[...historico.filter(a=>a.status!=='rascunho'),dadosAvaliacao];
    pacienteObjeto.avaliadoPor=dadosAvaliacao.profissionalNome;
    const sucesso=await salvarPacienteNaNuvem(pacienteObjeto,{exigirRastreabilidadeClinica:true});
    if(!sucesso)return;
    if(registroEmEdicao){
        avaliacaoEdicaoId=null;
        limparRascunhoKineSys();
        alert(`✅ Avaliação atualizada. O horário original de salvamento foi preservado e a edição ficou registrada em ${formatarDataHoraClinica(agora.toISOString(),true)}.`);
        await carregarPacienteParaEdicao(pacienteObjeto.id);
        return;
    }
    if(finalizar){limparRascunhoKineSys();alert(`${dadosAvaliacao.tipo} finalizada e salva com rastreabilidade (Motor ${KINESYS_MOTOR_VERSION}).`);pacienteAtualId=null;estadoMapeamento={};mapeamentoAvaliacaoAnterior=null;navegarPara('tela_buscar');}
    else{pacienteAtualId=pacienteObjeto.id;atualizarStatusAutosave('✓ Rascunho persistido no prontuário');alert('💾 Rascunho da avaliação salvo. A avaliação ainda NÃO está finalizada.');}
}

function chaveUsuarioRascunhoKineSys() {
    if (!usuarioLogado) return '';
    return String(usuarioLogado.id || usuarioLogado.email || `${usuarioLogado.nome || ''}::${usuarioLogado.tipo || ''}` || '').trim().toLowerCase();
}
function existeContextoRealParaRascunhoKineSys() {
    if (!document.getElementById('tela_avaliacao')?.classList.contains('ativa')) return false;
    const pacienteSelecionado = String(document.getElementById('select_paciente_precadastro')?.value || '').trim();
    const nome = String(document.getElementById('paciente_nome')?.value || '').trim();
    return !!(pacienteAtualId || pacienteSelecionado || nome);
}
function rascunhoKineSysEhValido(r) {
    if (!r || typeof r !== 'object' || !r.campos || typeof r.campos !== 'object') return false;
    const pacienteId = String(r.pacienteAtualId || r.paciente_id || r.pacienteId || r.campos?.select_paciente_precadastro || '').trim();
    const nome = String(r.campos?.paciente_nome || '').trim();
    if (!pacienteId && !nome) return false;
    const dono = String(r.usuarioChave || '').trim().toLowerCase();
    const atual = chaveUsuarioRascunhoKineSys();
    if (dono && atual && dono !== atual) return false;
    return true;
}
function coletarRascunhoKineSys() {
    if (!existeContextoRealParaRascunhoKineSys()) return null;
    const campos = {};
    document.querySelectorAll('#tela_avaliacao input, #tela_avaliacao select, #tela_avaliacao textarea').forEach(el => {
        if (el.hasAttribute('data-no-autosave')) return;
        if (!el.id && !el.classList.contains('chk_fator_piora') && !el.classList.contains('chk_exposicao_ocupacional') && !el.classList.contains('chk_exposicao_esportiva') && !el.classList.contains('chk_yellow_flag')) return;
        const key = el.id || `${Array.from(el.classList).join('.')}:${el.value}`;
        campos[key] = (el.type === 'checkbox' || el.type === 'radio') ? el.checked : el.value;
    });
    return {versaoMotor:KINESYS_MOTOR_VERSION, salvoEm:new Date().toISOString(), pacienteAtualId, usuarioChave:chaveUsuarioRascunhoKineSys(), campos, estadoMapeamento:JSON.parse(JSON.stringify(estadoMapeamento)),clinicaEstruturada:coletarClinicaEstruturada()};
}
function atualizarStatusAutosave(texto) { const el=document.getElementById('autosave_status'); if(!el)return; el.style.display='block'; el.textContent=texto; }
function ocultarStatusAutosaveKineSys() { const el=document.getElementById('autosave_status'); if(el)el.style.display='none'; }
function agendarAutosaveKineSys() {
    clearTimeout(autosaveTimerKineSys);
    if (autosaveSuspensoKineSys || cargasPacienteAvaliacaoKineSys > 0) return;
    if (!existeContextoRealParaRascunhoKineSys()) { ocultarStatusAutosaveKineSys(); return; }
    atualizarStatusAutosave('Alterações pendentes…');
    autosaveTimerKineSys=setTimeout(()=>{ const r=coletarRascunhoKineSys(); if(!r){ocultarStatusAutosaveKineSys();return;} try{ localStorage.setItem('kinesys_rascunho_avaliacao_v11',JSON.stringify(r)); atualizarStatusAutosave('✓ Rascunho salvo '+new Date().toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})); }catch(e){ atualizarStatusAutosave('⚠ Falha ao salvar rascunho'); } },1200);
}
function limparRascunhoKineSys(){ clearTimeout(autosaveTimerKineSys); autosaveTimerKineSys=null; try{localStorage.removeItem('kinesys_rascunho_avaliacao_v11');}catch(e){} ocultarStatusAutosaveKineSys(); }
let rascunhoKineSysAvisadoNestaSessao = '';
let rascunhoDialogAbertoKineSys = false;


async function restaurarRascunhoKineSys() {
    if (rascunhoDialogAbertoKineSys) return false;
    let r=null; try{r=JSON.parse(localStorage.getItem('kinesys_rascunho_avaliacao_v11')||'null');}catch(e){}
    if (!r) return false;
    if (!rascunhoKineSysEhValido(r)) {
        // Rascunhos antigos sem paciente/contexto real eram criados por eventos
        // padrão da tela. Eles não devem gerar aviso no login nem na avaliação.
        try { localStorage.removeItem('kinesys_rascunho_avaliacao_v11'); } catch(_) {}
        return false;
    }
    const chaveAviso = String(r.salvoEm || `${r.pacienteAtualId || ''}:${r.campos?.paciente_nome || ''}`);
    if (chaveAviso && rascunhoKineSysAvisadoNestaSessao === chaveAviso) return false;
    rascunhoDialogAbertoKineSys = true;
    const autosaveAnterior=autosaveSuspensoKineSys;
    autosaveSuspensoKineSys=true;
    clearTimeout(autosaveTimerKineSys);autosaveTimerKineSys=null;
    let escolha;
    try {
        escolha=await mostrarDialogoKineSys({
            titulo:'Rascunho de avaliação encontrado',
            mensagem:'Há uma avaliação não finalizada neste dispositivo.\n\nRestaurar: retomar o preenchimento.\nDescartar rascunho: apagar somente este rascunho automático, sem possibilidade de desfazer. As avaliações salvas no prontuário não serão apagadas.\nCancelar: fechar esta janela e manter o rascunho.',
            confirmar:'Restaurar rascunho',cancelar:'Cancelar',alternativa:'Descartar rascunho'
        });
    } finally {
        rascunhoDialogAbertoKineSys=false;
        autosaveSuspensoKineSys=autosaveAnterior;
    }
    if(escolha==='descartar'){
        limparRascunhoKineSys();
        rascunhoKineSysAvisadoNestaSessao='';
        mostrarToastKineSys('Rascunho descartado. As avaliações salvas no prontuário foram preservadas.','sucesso');
        return false;
    }
    if(escolha!==true)return false;
    rascunhoKineSysAvisadoNestaSessao = chaveAviso;
    preencherClinicaEstruturada(r.clinicaEstruturada||{});
    Object.entries(r.campos).forEach(([key,value])=>{
        let el=document.getElementById(key);
        if(!el && key.includes(':')) { const [classes,val]=key.split(':'); el=Array.from(document.querySelectorAll('.'+classes.split('.').join('.'))).find(x=>x.value===val); }
        if(!el)return; if(el.type==='checkbox'||el.type==='radio')el.checked=!!value; else el.value=value;
    });
    pacienteAtualId = r.pacienteAtualId || r.paciente_id || r.pacienteId || pacienteAtualId;
    if(r.estadoMapeamento) estadoMapeamento=r.estadoMapeamento;
    sincronizarBuscaPacientePreCadastro();
    processarRadarEmTempoReal(); atualizarStatusAutosave('✓ Rascunho restaurado');
    return true;
}

document.addEventListener('DOMContentLoaded', function(){
    document.getElementById('paciente_ocupacao')?.addEventListener('input', sugerirExposicoesOcupacionais);
    document.getElementById('evo_realizado_em')?.addEventListener('change', e=>{const d=document.getElementById('evo_data');if(d&&e.target.value)d.value=e.target.value.slice(0,10);});
    const avRealizado=document.getElementById('avaliacao_realizado_em');if(avRealizado&&!avRealizado.value)avRealizado.value=valorDatetimeLocalAgora();
    const evoRealizado=document.getElementById('evo_realizado_em');if(evoRealizado&&!evoRealizado.value)evoRealizado.value=valorDatetimeLocalAgora();
    document.querySelectorAll('#tela_avaliacao input, #tela_avaliacao select, #tela_avaliacao textarea').forEach(el=>{
        if (el.hasAttribute('data-no-autosave')) return;
        el.addEventListener(el.type==='text'||el.tagName==='TEXTAREA'?'input':'change', event=>{
            processarRadarEmTempoReal();
            if(el.id==='paciente_origem_irradiacao'||el.id==='paciente_irradiacao'||el.id==='paciente_hma')renderizarAnaliseIrradiacao();
            agendarAutosaveKineSys();
        });
    });
    document.addEventListener('click', event => {
        if (!event.target.closest('.paciente-busca')) fecharBuscaPacientesPreCadastro();
    });
    if(!document.querySelector('.medida-objetiva')) adicionarMedidaObjetiva();
    if(!document.querySelector('.psfs-row')) adicionarAtividadePSFS();
    if(!document.querySelector('.objetivo-row')) adicionarObjetivoTerapeutico();
});


/* ========================================================================== 
   KINESYS CLINICAL ENGINE 1.4 — SAFETY GATES, PROCEDURE MATCHING E DOCUMENTAÇÃO
   ========================================================================== */

function obterEstadoRegiao(idRegiao) {
    if (!estadoMapeamento[idRegiao]) {
        estadoMapeamento[idRegiao] = {
            resultados: {},
            fase: 'suspeita',
            idClusterSuspeitaEscolhido: null,
            redflagsRevisadas: false,
            alertasTextuaisRevisados: false,
            redflagAcknowledge: false,
            redflagConduta: '',
            redflagJustificativa: ''
        };
    }
    const e = estadoMapeamento[idRegiao];
    if (e.fase === 'redflag') e.fase = 'suspeita';
    if (typeof e.redflagsRevisadas !== 'boolean') e.redflagsRevisadas = false;
    if (typeof e.alertasTextuaisRevisados !== 'boolean') e.alertasTextuaisRevisados = false;
    return e;
}

function tokenizarPistaClinica(txt) {
    const stop = new Set(['de','da','do','das','dos','e','em','no','na','nos','nas','com','por','para','um','uma','ao','aos','as','o','a']);
    return removerAcentos(txt || '').split(/[^a-z0-9]+/).filter(t => t.length > 2 && !stop.has(t));
}

function correspondePistaClinica(texto, pista) {
    const t = removerAcentos(texto || '');
    const p = removerAcentos(pista || '');
    if (!p) return false;
    if (t.includes(p)) return true;
    const tokens = tokenizarPistaClinica(p);
    if (tokens.length < 2) return tokens.length === 1 ? t.includes(tokens[0]) : false;
    return tokens.every(tok => t.includes(tok));
}

function coletarContextoClinico() {
    const val = id => document.getElementById(id)?.value || '';
    const chk = id => !!document.getElementById(id)?.checked;
    const hma = val('paciente_hma');
    const origemIrradiacao = val('paciente_origem_irradiacao');
    const irradiacao = val('paciente_irradiacao');
    const tipoDor = val('paciente_tipo_dor');
    const mecanismo = val('paciente_mecanismo_lesao');
    const esporte = val('paciente_esporte');
    const ocupacao = val('paciente_ocupacao');
    const eva = document.getElementById('eva_slider') ? parseInt(document.getElementById('eva_slider').value, 10) || 0 : 0;
    const idade = parseInt(val('paciente_idade'), 10) || 0;
    const fatoresPiora = obterValoresMarcados('.chk_fator_piora');
    const exposicoesOcupacionais = obterValoresMarcados('.chk_exposicao_ocupacional');
    const exposicoesEsportivas = obterValoresMarcados('.chk_exposicao_esportiva');
    const yellowFlags = obterValoresMarcados('.chk_yellow_flag');
    let textoMedicamentos = '';
    document.querySelectorAll('#tags_medicamentos div').forEach(tag => { textoMedicamentos += tag.textContent + ' '; });
    const cirurgias = [];
    document.querySelectorAll('#tags_cirurgias .tag-cirurgia').forEach(tag => cirurgias.push({
        chave: tag.dataset.chave || '',
        texto: tag.textContent.replace('✕','').trim()
    }));
    const fonte = obterConfiabilidadeFonte();
    const comorbidades = {
        tabagista: chk('chk_tabagista'), etilista: chk('chk_etilista'), hipertenso: chk('chk_hipertenso'), diabetico: chk('chk_diabetico'),
        corticoide: chk('chk_corticoide_sistemico') || chk('chk_corticoide_infiltracao') || chk('chk_corticoide'),
        corticoide_sistemico: chk('chk_corticoide_sistemico'), corticoide_infiltracao: chk('chk_corticoide_infiltracao'),
        aine_recente: chk('chk_aine_recente'), cirurgia: chk('chk_cirurgia')
    };
    const textoCombinado = [hma, origemIrradiacao, irradiacao, mecanismo].filter(Boolean).join(' ');
    const topologia = analisarTopologiaSintomasKineSys(hma, origemIrradiacao, irradiacao);
    return {
        hma: removerAcentos(hma), origemIrradiacao: removerAcentos(origemIrradiacao), irradiacao: removerAcentos(irradiacao), tipoDor, mecanismo,
        esporte: removerAcentos(esporte), ocupacao: removerAcentos(ocupacao), eva, idade, fatoresPiora,
        exposicoesOcupacionais, exposicoesEsportivas, yellowFlags, textoMedicamentos: removerAcentos(textoMedicamentos),
        textoCirurgias: removerAcentos(cirurgias.map(c=>`${c.chave} ${c.texto}`).join(' ')), cirurgias,
        textoCombinado: removerAcentos(textoCombinado), comorbidades, fonte, topologia
    };
}

const KINESYS_COMPATIBILIDADE_PROCEDIMENTOS = {
    pos_operatorio_cervical: /cervical|artrodese.*cerv|discectomia.*cerv|laminectomia.*cerv|descompress.*cerv/,
    fratura_proximal_umero_pos_operatorio: /(fratura|osteossintese|placa|parafuso).*(umero|ombro)|(umero|ombro).*(fratura|osteossintese|placa|parafuso)/,
    pos_operatorio_lombar: /lombar|artrodese.*lomb|discectomia.*lomb|laminectomia.*lomb|descompress.*lomb/,
    fratura_planalto_tibial_pos_operatorio: /planalto.*tib|tibial.*planalto/,
    fratura_quadril_pos_operatorio: /(fratura|osteossintese|placa|parafuso|haste|artroplastia).*(quadril|femur|colo)|(quadril|femur|colo).*(fratura|osteossintese|placa|parafuso|haste|artroplastia)/,
    fratura_tornozelo_pos_operatorio: /(fratura|osteossintese|placa|parafuso).*(tornozelo|maleolo|bimaleolar|trimaleolar)|(tornozelo|maleolo|bimaleolar|trimaleolar).*(fratura|osteossintese|placa|parafuso)/,
    ruptura_aquiles_pos_operatorio: /aquiles/,
    fratura_cotovelo_pos_operatorio: /(fratura|osteossintese|placa|parafuso).*(cotovelo|olecrano|radio|umero distal)|(cotovelo|olecrano|cabeca.*radio|umero distal).*(fratura|osteossintese|placa|parafuso)/,
    fratura_radio_distal_reabilitacao: /(fratura|osteossintese|placa|parafuso).*(radio distal|punho|colles)|(radio distal|punho|colles).*(fratura|osteossintese|placa|parafuso)/,
    pos_operatorio_tendao_mao: /(tendao|flexor|extensor).*(mao|dedo)|(mao|dedo).*(tendao|flexor|extensor)/
};

function pontuarCompatibilidadeCirurgica(item, contexto, temCirurgiaNaRegiao, pesoCirurgia) {
    if (!temCirurgiaNaRegiao || !(item.mecanismoPreferido || []).includes('pos_cirurgico')) return 0;
    const texto = contexto.textoCirurgias || '';
    const padrao = KINESYS_COMPATIBILIDADE_PROCEDIMENTOS[item.id];
    if (padrao) return padrao.test(texto) ? Math.max(3.5, pesoCirurgia || 0) : -Math.max(3, pesoCirurgia || 0);
    // Em hipóteses pós-operatórias sem mapa específico, cirurgia regional é apenas pista fraca.
    return Math.min(0.75, pesoCirurgia || 0.75);
}

/* ========================================================================== 
   KINESYS CLINICAL ENGINE 2.0 — EVIDÊNCIA ESTRUTURADA / FENÓTIPOS OPERACIONAIS
   Sem alteração de layout: esta camada usa os mesmos cards e controles.
   - não avaliado / não realizado / inconclusivo não contam como negativo;
   - achados do exame passam a modificar o ranking em tempo real;
   - critérios essenciais podem impedir fechamento prematuro;
   - quando uma patologia específica não fecha, o motor pode registrar um
     fenótipo operacional útil, mantendo incerteza etiológica explícita;
   - mais de uma hipótese positiva pode coexistir na síntese.
   ========================================================================== */

const KINESYS_META_CRITERIOS_2 = {
    cefaleia_cervicogenica_triagem: { essenciais:[0,1], essenciaisMinimo:1, minimo:2 },
    cefaleia_atribuida_dtm_triagem: { essenciais:[1,2,3], essenciaisMinimo:1, minimo:2 },
    fenotipo_migranoso_triagem: { essenciais:[0,3], essenciaisMinimo:2, minimo:3 },
    fenotipo_tensional_triagem: { minimo:3 },
    cefaleia_uso_excessivo_medicacao: { essenciais:[0,1], essenciaisMinimo:2, minimo:2 },
    neuralgia_occipital: { essenciais:[0], essenciaisMinimo:1, minimo:2 },
    dtm_dolorosa_muscular: { essenciais:[0], essenciaisMinimo:1, minimo:2 },
    dtm_artralgia: { essenciais:[0], essenciaisMinimo:1, minimo:2 },
    cefaleia_atribuida_dtm: { essenciais:[0,1], essenciaisMinimo:2, minimo:2 },
    dtm_disco_com_reducao: { essenciais:[0], essenciaisMinimo:1, minimo:2 },
    dtm_disco_sem_reducao_limitacao: { essenciais:[0,1], essenciaisMinimo:2, minimo:2 },
    dtm_subluxacao: { minimo:1 },
    neuralgia_trigeminal_diferencial: { essenciais:[0,1], essenciaisMinimo:2, minimo:2 },
    polimialgia_reumatica_rastreamento: { essenciais:[0,1], essenciaisMinimo:2, minimo:2 },
    dor_cervical_padrao_irradiado: { essenciais:[0,2], essenciaisMinimo:2, minimo:2 },
    radiculopatia_cervical: { minimo:3 },
    radiculopatia_lombossacra: { minimo:2 },
    ruptura_aquiles: { minimo:2 },
    ruptura_biceps_distal: { minimo:2 },
    ruptura_mecanismo_extensor: { minimo:2 },
    ruptura_manguito_maior: { minimo:2 },
    fratura_compressao_vertebral: { minimo:2 },
    fratura_estresse_colo_femur: { minimo:2 },
    mielopatia_cervical_suspeita: { minimo:2 }
};

const KINESYS_HIPOTESES_GATE_2 = {
    mielopatia_cervical_suspeita: ['Possível mielopatia cervical', 'Achados compatíveis com comprometimento medular exigem decisão clínica e avaliação médica prioritária.'],
    instabilidade_craniocervical: ['Possível instabilidade craniocervical', 'Contexto/achados compatíveis exigem cautela e avaliação médica quando a hipótese não pode ser excluída clinicamente.'],
    polimialgia_reumatica_rastreamento: ['Possível polimialgia reumática', 'Padrão compatível requer investigação médica; não conduzir como lesão local bilateral dos ombros sem revisão sistêmica.'],
    neuralgia_trigeminal_diferencial: ['Possível neuralgia do trigêmeo', 'Padrão neuralgiforme facial compatível requer avaliação médica/neurológica.'],
    fratura_compressao_vertebral: ['Possível fratura vertebral', 'Achados compatíveis com fratura vertebral exigem investigação médica/imagem conforme contexto.'],
    fratura_estresse_colo_femur: ['Possível fratura por estresse do colo femoral', 'Hipótese de alto impacto clínico: suspender carga de risco e encaminhar para avaliação médica/imagem.'],
    fratura_compressao_toracica_diferencial: ['Possível fratura vertebral torácica', 'Achados compatíveis exigem investigação médica/imagem.'],
    ruptura_aquiles: ['Possível ruptura do tendão de Aquiles', 'Achados compatíveis justificam avaliação ortopédica precoce.'],
    ruptura_biceps_distal: ['Possível ruptura do bíceps distal', 'Achados compatíveis justificam avaliação ortopédica precoce.'],
    ruptura_mecanismo_extensor: ['Possível ruptura do mecanismo extensor', 'Incapacidade de extensão ativa/achados compatíveis exigem avaliação ortopédica.'],
    ruptura_peitoral_maior: ['Possível ruptura do peitoral maior', 'Achados compatíveis em lesão relevante justificam avaliação ortopédica precoce.'],
    dor_visceral_toracica: ['Possível origem visceral/cardiopulmonar', 'Achados não musculoesqueléticos torácicos exigem decisão clínica e encaminhamento apropriado.']
};

const KINESYS_FENOTIPOS_OPERACIONAIS_2 = {
    cervical: (ctx)=>{
        const top=ctx.topologia||{}; const papel=top.papel?.cervical||'';
        const pares=top.pares||[]; const irradia=pares.some(p=>p.origem==='cervical'&&['ombro','punho_mao'].includes(p.destino)) || /irrad|braco|escapul|ombro/.test(ctx.irradiacao||'');
        if(irradia) return {nome:'Dor cervical com padrão irradiado/referido',texto:'Fenótipo operacional cervical com sintomas à distância; radiculopatia permanece dependente de achados neurológicos/cluster concordantes.'};
        if(/cefaleia|dor de cabeca/.test(ctx.textoCombinado||'')) return {nome:'Dor cervical com cefaleia associada',texto:'Fenótipo operacional: coexistência cervical–cefaleia identificada, sem atribuir causalidade até que critérios discriminativos sejam demonstrados.'};
        if(ctx.mecanismo==='trauma_agudo'||/whiplash|acidente|colisao|trauma cervical/.test(ctx.textoCombinado||'')) return {nome:'Dor cervical pós-trauma / déficit de coordenação do movimento em investigação',texto:'Fenótipo funcional pós-trauma sem rótulo estrutural específico enquanto segurança e achados neurológicos são revisados.'};
        return {nome:'Dor cervical musculoesquelética / mecânica em investigação',texto:'Fenótipo operacional para cervicalgia mecanicamente modulável quando não há dados suficientes para uma condição específica.'};
    },
    cefaleia: (ctx)=>{
        const t=ctx.textoCombinado||'';
        if(/pulsatil|latejant|fotofob|fonofob|nausea|migranea|enxaqueca/.test(t)) return {nome:'Cefaleia com características migranosas — fenótipo preliminar',texto:'Características migranosas foram relatadas, porém a classificação específica depende de história longitudinal e critérios completos.'};
        if(/aperto|pressao|peso na cabeca|faixa|bilateral/.test(t)) return {nome:'Cefaleia com características tipo tensão — fenótipo preliminar',texto:'Padrão de pressão/aperto bilateral pode orientar investigação, sem excluir migrânea ou cefaleia secundária.'};
        return {nome:'Cefaleia — fenótipo ainda não classificado',texto:'A presença de cefaleia foi reconhecida, mas ainda faltam dados para classificar o fenótipo ou estabelecer causalidade cervical/temporomandibular.'};
    },
    atm: (ctx)=>{
        const t=ctx.textoCombinado||'';
        if(/travou|travamento|nao consegue abrir|abertura limitada/.test(t)) return {nome:'Disfunção temporomandibular com alteração de mobilidade — fenótipo',texto:'Travamento/limitação mandibular direciona investigação intra-articular, sem definir deslocamento discal apenas pelo relato.'};
        return {nome:'Dor temporomandibular / orofacial — fenótipo em investigação',texto:'Fenótipo operacional de dor orofacial/ATM; a origem muscular, articular, neural ou referida depende de reprodução da dor familiar e critérios específicos.'};
    },
    ombro: (ctx)=>{
        const top=ctx.topologia||{}; const papel=top.papel?.ombro||'';
        if(papel==='destino' || (top.pares||[]).some(p=>p.origem==='cervical'&&p.destino==='ombro')) return {nome:'Dor no ombro como possível dor referida — origem a esclarecer',texto:'O ombro aparece como destino do trajeto; hipótese local só deve subir quando o exame do ombro reproduzir a queixa de forma independente.'};
        return {nome:'Dor relacionada ao ombro — fenótipo musculoesquelético',texto:'Fenótipo operacional de dor do ombro sem estrutura causal única definida; mobilidade, força, carga e reprodução da dor orientam o refinamento.'};
    },
    lombar: (ctx)=>{
        const t=ctx.textoCombinado||'';
        if(/irrad|ciatic|perna|formig|dormen|choque/.test(t)) return {nome:'Dor lombar com sintomas em membro inferior — fenótipo',texto:'Fenótipo operacional com sintomas à distância; radiculopatia exige correlação neurológica/neurodinâmica, e dor referida continua possível.'};
        return {nome:'Dor lombar inespecífica / mecanicamente modulável',texto:'Fenótipo operacional de lombalgia quando não há critérios suficientes para condição específica após triagem de segurança.'};
    },
    joelho: (ctx)=>{
        const t=ctx.textoCombinado||'';
        if(/patel|frente do joelho|anterior do joelho/.test(t)) return {nome:'Dor anterior do joelho — fenótipo patelofemoral em investigação',texto:'Fenótipo de dor anterior; carga, agachamento, escadas e exame local devem diferenciar dor patelofemoral, tendão patelar e outras fontes.'};
        return {nome:'Dor do joelho — fenótipo musculoesquelético',texto:'Fenótipo operacional do joelho enquanto trauma ligamentar/meniscal, osteoartrite e sobrecarga são diferenciados.'};
    },
    quadril: (ctx)=>{
        const t=ctx.textoCombinado||'';
        if(/lateral|trocanter/.test(t)) return {nome:'Dor lateral do quadril — fenótipo',texto:'Fenótipo operacional lateral; tendinopatia glútea/GTPS, dor referida lombar e outras causas permanecem concorrentes até o exame.'};
        if(/virilha|inguinal/.test(t)) return {nome:'Dor de quadril/virilha — fenótipo',texto:'Fenótipo operacional de quadril/virilha; FAI, osteoartrite, adutores e causas não musculoesqueléticas precisam de diferenciação.'};
        return {nome:'Dor relacionada ao quadril — fenótipo musculoesquelético',texto:'Fenótipo operacional sem estrutura causal específica definida.'};
    },
    tornozelo_pe: (ctx)=>{
        const t=ctx.textoCombinado||'';
        if(/aquiles/.test(t)) return {nome:'Dor do complexo Aquiles–panturrilha — fenótipo',texto:'Fenótipo operacional para diferenciar tendinopatia, lesão muscular e ruptura conforme mecanismo e exame.'};
        if(/calcanhar|plantar|sola do pe/.test(t)) return {nome:'Dor plantar do retropé — fenótipo',texto:'Fenótipo operacional para dor plantar/calcanhar, mantendo diferenciais locais, neurais e ósseos conforme contexto.'};
        return {nome:'Dor de tornozelo/pé — fenótipo musculoesquelético',texto:'Fenótipo operacional enquanto trauma, instabilidade, tendão e condições ósseas/neurológicas são diferenciados.'};
    },
    cotovelo: (ctx)=>{
        const t=ctx.textoCombinado||'';
        if(/lateral|epicondilo lateral|tenista/.test(t)) return {nome:'Dor lateral do cotovelo — fenótipo',texto:'Fenótipo operacional; tendão extensor, túnel radial e origem cervical/proximal devem ser diferenciados pela carga e exame neural.'};
        if(/medial|epicondilo medial|golfista/.test(t)) return {nome:'Dor medial do cotovelo — fenótipo',texto:'Fenótipo operacional; tendão flexor-pronador, nervo ulnar e ligamento colateral ulnar permanecem diferenciais.'};
        return {nome:'Dor do cotovelo/antebraço — fenótipo musculoesquelético',texto:'Fenótipo operacional sem estrutura específica definida.'};
    },
    punho_mao: (ctx)=>{
        const t=ctx.textoCombinado||'';
        if(/formig|dormen|choque|parestes/.test(t)) return {nome:'Sintomas neurais em punho/mão — fenótipo',texto:'Fenótipo neural periférico/proximal; túnel do carpo, nervo ulnar e origem cervical devem ser diferenciados por distribuição e exame neurológico.'};
        return {nome:'Dor de punho/mão — fenótipo musculoesquelético',texto:'Fenótipo operacional enquanto tendões, articulações, TFCC e causas neurais são diferenciados.'};
    },
    coluna_toracica: (ctx)=>({nome:'Dor torácica musculoesquelética — fenótipo em investigação',texto:'Fenótipo operacional apenas após triagem de causas cardiopulmonares, viscerais, ósseas e neurológicas quando indicadas.'})
};

function grupoDoItemKineSys(idRegiao,item){
    const r=BANCO_MAPEAMENTO_CLINICO[idRegiao];
    if((r?.clusters||[]).some(x=>x.id===item?.id))return'cluster';
    return'diferencial';
}

function obterMetaCriteriosKineSys(item,grupo='diferencial'){
    const regra=item?.regraConfirmacao||{};
    const base=KINESYS_META_CRITERIOS_2[item?.id]||{};
    let minimo=Number(base.minimo ?? regra.minimo ?? item?.limiar ?? 0);
    if(!minimo){
        const n=(item?.testes||[]).length;
        minimo=regra.tipo==='qualquer'?1:(n<=2?1:2);
    }
    const essenciais=Array.isArray(base.essenciais)?base.essenciais.slice():(Array.isArray(regra.obrigatorios)?regra.obrigatorios.slice():[]);
    const essenciaisMinimo=Number(base.essenciaisMinimo ?? (essenciais.length?essenciais.length:0));
    return {minimo,essenciais,essenciaisMinimo,tipo:regra.tipo||'minimo'};
}

function analisarRespostasItem(estado, grupo, item) {
    const respostas=(item.testes||[]).map((_,i)=>estado.resultados[`${grupo}::${item.id}::${i}`]||'');
    const positivos=respostas.filter(r=>r==='positivo').length;
    const negativos=respostas.filter(r=>r==='negativo').length;
    const inconclusivos=respostas.filter(r=>r==='inconclusivo').length;
    const naoRealizados=respostas.filter(r=>r==='nao_realizado').length;
    const naoAplicaveis=respostas.filter(r=>r==='nao_aplicavel').length;
    const naoAvaliados=respostas.filter(r=>!r).length;
    const naoConclusivos=inconclusivos+naoRealizados+naoAplicaveis;
    const decisivos=positivos+negativos;
    return {respostas,positivos,negativos,inconclusivos,naoRealizados,naoAplicaveis,naoAvaliados,naoConclusivos,decisivos,respondidos:respostas.length-naoAvaliados,todosRespondidos:naoAvaliados===0};
}

function avaliarHipoteseEstruturadaKineSys(idRegiao,item,grupo){
    const estado=obterEstadoRegiao(idRegiao), a=analisarRespostasItem(estado,grupo,item), meta=obterMetaCriteriosKineSys(item,grupo);
    const total=(item.testes||[]).length;
    if(!total)return'pendente';
    if(meta.tipo==='qualquer'){
        if(a.positivos>=1)return'positivo';
        if(a.naoAvaliados>0)return'pendente';
        if(a.naoConclusivos>0)return'inconclusivo';
        return'negativo';
    }
    const essResp=meta.essenciais.map(i=>a.respostas[i]||'');
    const essPos=essResp.filter(x=>x==='positivo').length;
    const essNeg=essResp.filter(x=>x==='negativo').length;
    const essNaoConclusivo=essResp.some(x=>['inconclusivo','nao_realizado','nao_aplicavel'].includes(x));
    const essNaoAvaliado=essResp.some(x=>!x);
    if(meta.essenciais.length && essNeg>0 && meta.essenciaisMinimo===meta.essenciais.length)return'negativo';
    const essenciaisOk=!meta.essenciais.length || essPos>=meta.essenciaisMinimo;
    if(essenciaisOk && a.positivos>=meta.minimo)return'positivo';
    const desconhecidos=a.naoAvaliados+a.naoConclusivos;
    const maxPosPossivel=a.positivos+desconhecidos;
    if(maxPosPossivel<meta.minimo)return'negativo';
    if(meta.essenciais.length && (essPos + essResp.filter(x=>!x||['inconclusivo','nao_realizado','nao_aplicavel'].includes(x)).length)<meta.essenciaisMinimo)return'negativo';
    if(a.naoAvaliados>0 || essNaoAvaliado)return'pendente';
    if(a.naoConclusivos>0 || essNaoConclusivo)return'inconclusivo';
    return'negativo';
}

function avaliarCluster(idRegiao, cluster) { return avaliarHipoteseEstruturadaKineSys(idRegiao,cluster,'cluster'); }
function avaliarDiferencial(idRegiao,dif){ return avaliarHipoteseEstruturadaKineSys(idRegiao,dif,'diferencial'); }

function calcularSuficienciaInvestigacaoKineSys(idRegiao,item,grupo){
    const estado=obterEstadoRegiao(idRegiao), a=analisarRespostasItem(estado,grupo,item), meta=obterMetaCriteriosKineSys(item,grupo);
    const ess=meta.essenciais;
    const essDec=ess.filter(i=>['positivo','negativo'].includes(a.respostas[i])).length;
    const alvoGeral=Math.min((item.testes||[]).length,Math.max(meta.minimo,ess.length||0,2));
    const geral=Math.min(1,a.decisivos/Math.max(1,alvoGeral));
    const essencial=ess.length?Math.min(1,essDec/ess.length):geral;
    const pct=Math.round((ess.length?(0.65*essencial+0.35*geral):geral)*100);
    const faltantes=[];
    ess.forEach(i=>{if(!a.respostas[i]||['inconclusivo','nao_realizado','nao_aplicavel'].includes(a.respostas[i]))faltantes.push(i);});
    for(let i=0;i<(item.testes||[]).length && faltantes.length<3;i++){
        if(faltantes.includes(i))continue;
        const r=a.respostas[i]; if(!r||['inconclusivo','nao_realizado','nao_aplicavel'].includes(r))faltantes.push(i);
    }
    return {percentual:pct,faltantes:faltantes.slice(0,3),analise:a,meta};
}

function pontuacaoExameKineSys(idRegiao,item,grupo){
    const s=calcularSuficienciaInvestigacaoKineSys(idRegiao,item,grupo), a=s.analise, meta=s.meta;
    let p=a.positivos*1.25-a.negativos*0.9;
    meta.essenciais.forEach(i=>{const r=a.respostas[i];if(r==='positivo')p+=0.8;else if(r==='negativo')p-=1.8;});
    const status=avaliarHipoteseEstruturadaKineSys(idRegiao,item,grupo);
    if(status==='positivo')p+=2.0; else if(status==='negativo')p-=2.5;
    return p;
}

function ajusteRelacionalKineSys(item,idRegiao,contexto){
    const top=contexto.topologia||{}, papel=top.papel?.[idRegiao]||'', id=item?.id||'';
    let p=0;
    const referido=/referid|radicul|neuropat|irradiad|cervical/.test(id);
    if(papel==='destino') p+=referido?1.2:-0.8;
    if(papel==='origem'&&!/referid/.test(id))p+=0.35;
    if(idRegiao==='ombro'&&(top.pares||[]).some(x=>x.origem==='cervical'&&x.destino==='ombro')){
        if(id==='dor_referida_cervical')p+=2.2;
        else if(!referido)p-=0.7;
    }
    // Cefaleia + cervical/ATM coexistentes não geram bônus causal automático.
    return p;
}

function calcularScoreContextualKineSys(item, contexto, bonusCirurgiaRelacionada, idRegiao) {
    // Motor 2.3: o ranking interno existe apenas na biblioteca específica; não alimenta o Navegador clínico.
    // Ele não fecha diagnóstico e não deve ser dominado por rótulos escritos na HMA,
    // profissão, esporte ou uma classificação precoce de "tipo de dor".
    let score=0;
    const texto=contexto.textoCombinado||'';
    const w={palavraChave:0.65,mecanismo:1.25,tipoDor:0,fatorPiora:0.45,esporte:0,ocupacao:0,comorbidade:0.45,medicamento:0.45,idade:0.35,cirurgia:1.5,...(item.pesos||{})};
    const matchesHMA=(item.palavrasChaveHMA||[]).filter(p=>correspondePistaClinica(texto,p)).length;
    score+=Math.min(matchesHMA,2)*Math.min(Number(w.palavraChave)||0,0.9);
    if((item.mecanismoPreferido||[]).includes(contexto.mecanismo))score+=Math.min(Number(w.mecanismo)||0,1.5);
    // tipoDor permanece no modelo somente por compatibilidade com prontuários antigos; não pontua no Motor 2.3.
    score+=Math.min((item.fatoresPioraRisco||[]).filter(f=>contexto.fatoresPiora.includes(f)).length,2)*Math.min(Number(w.fatorPiora)||0,0.6);
    if(item.evaAltaBonus&&contexto.eva>=7)score+=Math.min(Number(item.evaAltaBonus)||0,0.5);
    if(item.evaCronicaBonus&&contexto.eva>0&&contexto.eva<=6)score+=Math.min(Number(item.evaCronicaBonus)||0,0.25);
    if(item.idadeFaixaBonus&&contexto.idade){const {min=0,max=200,bonus=1}=item.idadeFaixaBonus;if(contexto.idade>=min&&contexto.idade<=max)score+=Math.min(Number(bonus)||0,Math.min(Number(w.idade)||0,0.5));}
    score+=Math.min((item.comorbidadesRisco||[]).filter(c=>contexto.comorbidades[c]).length,2)*Math.min(Number(w.comorbidade)||0,0.6);
    score+=Math.min((item.medicamentosRisco||[]).filter(m=>contexto.textoMedicamentos.includes(removerAcentos(m))).length,2)*Math.min(Number(w.medicamento)||0,0.6);
    score+=pontuarCompatibilidadeCirurgica(item,contexto,bonusCirurgiaRelacionada,Math.min(Number(w.cirurgia)||0,1.75));
    (item.palavrasChaveContra||[]).slice(0,2).forEach(p=>{if(correspondePistaClinica(texto,p))score-=0.35;});
    if((item.mecanismoContra||[]).includes(contexto.mecanismo))score-=0.35;
    // Fonte do dado é rastreabilidade, não multiplicador global de credibilidade.
    return Math.max(0,Math.round(score*10)/10);
}

function calcularScoreItem(item, contexto, bonusCirurgiaRelacionada, idRegiao, grupo=null) {
    const g=grupo||grupoDoItemKineSys(idRegiao,item);
    const base=calcularScoreContextualKineSys(item,contexto,bonusCirurgiaRelacionada,idRegiao);
    const exame=pontuacaoExameKineSys(idRegiao,item,g);
    const rel=ajusteRelacionalKineSys(item,idRegiao,contexto);
    return Math.max(0,Math.round((base+exame+rel)*10)/10);
}

function ordenarClustersPorScore(idRegiao, contexto) {
    const regiao=BANCO_MAPEAMENTO_CLINICO[idRegiao], tem=!!obterCirurgiaRelacionadaRegiao(idRegiao);
    return (regiao?.clusters||[]).map(c=>({item:c,score:calcularScoreItem(c,contexto,tem,idRegiao,'cluster')})).sort((a,b)=>b.score-a.score);
}
function ordenarDiferenciaisPorScore(idRegiao, contexto) {
    const regiao=BANCO_MAPEAMENTO_CLINICO[idRegiao], tem=!!obterCirurgiaRelacionadaRegiao(idRegiao);
    return (regiao?.diferenciais||[]).map(d=>({item:d,score:calcularScoreItem(d,contexto,tem,idRegiao,'diferencial')})).sort((a,b)=>b.score-a.score);
}

function inferirFenotipoOperacionalKineSys(idRegiao,contexto){
    const fn=KINESYS_FENOTIPOS_OPERACIONAIS_2[idRegiao];
    if(typeof fn!=='function')return null;
    try{return fn(contexto)||null;}catch(_){return null;}
}

function proximosAchadosDiscriminativosKineSys(idRegiao,candidato,candidatos){
    const estado=obterEstadoRegiao(idRegiao), out=[];
    const add=(c)=>{
        if(!c||out.length>=3)return;
        const g=c.grupo||grupoDoItemKineSys(idRegiao,c.item), item=c.item||c;
        const suf=calcularSuficienciaInvestigacaoKineSys(idRegiao,item,g);
        for(const i of suf.faltantes){
            const txt=item.testes?.[i]; if(txt&&!out.some(x=>x.texto===txt)){out.push({texto:txt,hipotese:item.nome});if(out.length>=3)break;}
        }
    };
    add(candidato);
    (candidatos||[]).filter(c=>chaveHipoteseKineSys(c)!==chaveHipoteseKineSys(candidato)).slice(0,3).forEach(add);
    return out;
}

function registrarAuditoriaMotorKineSys(idRegiao,contexto,candidatos){
    const estado=obterEstadoRegiao(idRegiao), reg=BANCO_MAPEAMENTO_CLINICO[idRegiao];
    const pre=[]; const tem=!!obterCirurgiaRelacionadaRegiao(idRegiao);
    (reg?.clusters||[]).forEach(x=>pre.push({grupo:'cluster',item:x,score:calcularScoreContextualKineSys(x,contexto,tem,idRegiao)}));
    (reg?.diferenciais||[]).forEach(x=>pre.push({grupo:'diferencial',item:x,score:calcularScoreContextualKineSys(x,contexto,tem,idRegiao)}));
    pre.sort((a,b)=>b.score-a.score);
    const escolhido=candidatoEscolhidoKineSys(candidatos,estado);
    const positivos=(candidatos||[]).filter(c=>statusHipoteseKineSys(idRegiao,c)==='positivo');
    const fen=inferirFenotipoOperacionalKineSys(idRegiao,contexto);
    estado.auditoriaMotor={
        versao:KINESYS_MOTOR_VERSION,dataISO:new Date().toISOString(),
        sugestaoContextual:pre[0]?chaveHipoteseKineSys(pre[0]):'',
        sugestaoAtual:candidatos?.[0]?chaveHipoteseKineSys(candidatos[0]):'',
        escolhaProfissional:escolhido?chaveHipoteseKineSys(escolhido):'',
        hipotesesPositivas:positivos.map(chaveHipoteseKineSys),
        fenotipoOperacional:fen?.nome||'',
        suficienciaPrincipal:escolhido?calcularSuficienciaInvestigacaoKineSys(idRegiao,escolhido.item,escolhido.grupo).percentual:0
    };
}


function trechoDesdeUltimaQuebraNegacao(texto,inicio){
    const antes=removerAcentos(String(texto||'').slice(0,inicio));
    const ultimaPont=Math.max(antes.lastIndexOf('.'),antes.lastIndexOf(';'),antes.lastIndexOf('!'),antes.lastIndexOf('?'),antes.lastIndexOf('\n'));
    let trecho=antes.slice(ultimaPont+1);

    // O escopo da negação termina quando a própria frase retoma uma afirmação.
    // Ex.: "sem febre e com falta de ar", "sem trauma, refere dor na panturrilha",
    // "nega parestesia, porém apresenta perda de força".
    const quebra=/\b(?:mas|porem|contudo|entretanto|todavia|e\s+com|apresenta|apresentou|refere|referiu|relata|relatou|possui|observa|observou|evolui\s+com|evoluiu\s+com|associad[oa]\s+a)\b/g;
    let m, ultimoFim=0;
    while((m=quebra.exec(trecho))!==null) ultimoFim=m.index+m[0].length;
    if(ultimoFim) trecho=trecho.slice(ultimoFim);
    return trecho;
}
function fraseTemNegacaoAntes(texto, inicio) {
    const trecho=trechoDesdeUltimaQuebraNegacao(texto,inicio);
    // Limita o alcance da negação. Isso mantém enumerações curtas
    // ("nega febre, tosse e dispneia") sem deixar um "sem" antigo
    // negar achados afirmados muito depois na mesma frase.
    const palavras=trecho.trim().split(/\s+/).filter(Boolean);
    const janela=palavras.slice(-14).join(' ');
    return /(?:\bnega\b|\bnegou\b|\bsem\b|\bnao\s+(?:apresenta|apresentou|refere|referiu|relata|relatou|tem|possui|observa|observou)|\bausencia\s+de|\bausente\b)\s*/.test(janela);
}
function regexTemMatchNaoNegado(texto, regex) {
    const flags = regex.flags.includes('g') ? regex.flags : regex.flags + 'g';
    const re = new RegExp(regex.source, flags); let m;
    while ((m = re.exec(texto)) !== null) { if (!fraseTemNegacaoAntes(texto, m.index)) return true; if (m[0].length===0) re.lastIndex++; }
    return false;
}
function detectarAlertasTextuaisHMA(contexto) {
    const t=removerAcentos([contexto.hma,contexto.irradiacao,contexto.origemIrradiacao].join(' ')); const alertas=[];
    const push=(id,titulo,desc,regex,regioes=null)=>{if(regexTemMatchNaoNegado(t,regex))alertas.push({id,titulo,desc,regioes});};
    push('vascular_mmii','Possível alerta vascular em membro inferior','Dor/edema de panturrilha ou edema unilateral exige revisão clínica de TVP/complicações vasculares, especialmente no pós-operatório.',/(edema|inchaco).*(panturrilha|perna)|(panturrilha|perna).*(edema|inchaco)|dor.*panturrilha/,['lombar','quadril','joelho','tornozelo_pe']);
    push('tep','Possível comprometimento cardiorrespiratório','Dispneia súbita, dor torácica ou falta de ar requerem triagem imediata conforme contexto.',/falta de ar|dispneia|dor toracica.*respir|dificuldade.*respirar/);
    push('infeccao_posop','Possível complicação infecciosa','Febre, secreção, calor/rubor progressivo ou piora sistêmica no pós-operatório devem ser revistos.',/febre|secrecao.*ferida|pus|ferida.*abriu|calor.*ferida/);
    push('cauda_equina','Possível síndrome de cauda equina','Alteração esfincteriana, anestesia em sela ou déficit bilateral/progressivo exige triagem urgente.',/anestesia.*sela|perda.*urina|retencao.*urina|incontinencia.*fecal|fraqueza.*duas pernas/,['lombar']);
    push('neurologico_progressivo','Déficit neurológico progressivo','Perda progressiva de força ou função neurológica requer reavaliação de prioridade.',/fraqueza.*piorando|perda.*forca.*progress|paralis/);
    push('mielopatia_cervical','Possível comprometimento medular cervical','Alteração de marcha/equilíbrio, perda de destreza manual, mãos desajeitadas ou sinais de neurônio motor superior requerem revisão neurológica prioritária.',/marcha.*(?:alter|atax|instavel)|desequilibr|perda.*destreza|maos?.*(?:desajeitad|travad)|deixando.*objetos.*cair|hiperreflexia|hoffmann|babinski|quatro membros/,['cervical']);

    const superior=/(mandib|pescoco|cervical|ombro|braco|peito|torac)/.test(t);
    const esforco=/(esforco|exercicio|caminh|subir escada|corrida|atividade fisica)/.test(t);
    const autonomico=/(falta de ar|dispneia|sudorese|suor frio|nausea|opressao|pressao no peito|aperto no peito)/.test(t);
    if(superior&&esforco&&autonomico){
        alertas.push({id:'possivel_isquemia_cardiaca_referida',titulo:'Dor superior associada ao esforço + sintomas autonômicos','desc':'Dor em mandíbula, pescoço, ombro/braço ou tórax relacionada ao esforço e acompanhada de dispneia, sudorese, náusea ou opressão exige triagem médica urgente para causa cardiovascular.',regioes:['cervical','atm','ombro','coluna_toracica']});
    }

    const temCefaleia=/(cefaleia|dor (?:de|na) cabeca|enxaqueca|migranea)/.test(t);
    if(temCefaleia){
        push('cefaleia_subita','Cefaleia de início súbito / padrão explosivo','Cefaleia que atinge intensidade máxima abruptamente ou é descrita como muito diferente do habitual exige avaliação médica urgente.',/(cefaleia|dor (?:de|na) cabeca).*(subit|repentin|explosiv|pior.*vida|segundos)|(subit|repentin|explosiv|pior.*vida).*(cefaleia|dor (?:de|na) cabeca)/,['cefaleia']);
        push('cefaleia_neurologica','Cefaleia com sinal neurológico/visual','Alteração neurológica focal, consciência, fala, visão ou convulsão associada à cefaleia exige revisão médica prioritária.',/(cefaleia|dor (?:de|na) cabeca).*(visao dupla|perda.*visao|fraqueza.*lado|fala.*enrol|confus|desmaio|convuls|horner|ataxia)|(visao dupla|perda.*visao|fraqueza.*lado|fala.*enrol|convuls).*(cefaleia|dor (?:de|na) cabeca)/,['cefaleia']);
        push('cefaleia_sistemica','Cefaleia com sinais sistêmicos','Febre, rigidez cervical importante ou comprometimento sistêmico associados à cefaleia precisam de triagem para causa secundária.',/(cefaleia|dor (?:de|na) cabeca).*(febre|rigidez.*nuca|rigidez.*cervical.*intensa)|(febre|rigidez.*nuca).*(cefaleia|dor (?:de|na) cabeca)/,['cefaleia']);
        if((contexto.idade||0)>=50 && /(claudicacao.*mandib|cansa.*mastig.*melhora.*repous|perda.*visao|visao.*turv|amaurose|sensibilidade.*couro.*cabeludo)/.test(t)){
            alertas.push({id:'arterite_celulas_gigantes',titulo:'Cefaleia + possível sinal de arterite de células gigantes',desc:'Em pessoas com 50 anos ou mais, nova cefaleia associada a claudicação mandibular, sintomas visuais ou sensibilidade do couro cabeludo requer avaliação médica urgente.',regioes:['cefaleia','atm']});
        }
        if(/(olho vermelho|olho muito vermelho|dor ocular|dor no olho).*(visao emba|halos|nausea)|(visao emba|halos).*(dor ocular|dor no olho|olho vermelho)/.test(t)){
            alertas.push({id:'glaucoma_agudo_rastreamento',titulo:'Cefaleia + dor ocular/alteração visual',desc:'Dor ocular intensa, olho vermelho e alteração visual/halos com cefaleia podem indicar emergência oftalmológica e exigem avaliação médica imediata.',regioes:['cefaleia']});
        }
        if(/(dor cervical|dor no pescoco|nuca|cefaleia).*(subit|repentin|nova|diferente).*(horner|ptose|pupila|visao dupla|ataxia|fala|fraqueza)|(horner|ptose|visao dupla|ataxia).*(dor cervical|pescoco|cefaleia)/.test(t)){
            alertas.push({id:'vascular_cervical_rastreamento',titulo:'Possível condição vascular cervical/craniana',desc:'Dor cervical/cefaleia nova ou incomum associada a sinais neurológicos/oculossimpáticos exige avaliação médica urgente; não usar testes posicionais como método de exclusão.',regioes:['cervical','cefaleia']});
        }
    }
    if((contexto.idade||0)>=50 && /(dois ombros|ambos.*ombros|ombros.*bilateral|bilateral.*ombros)/.test(t) && /(rigidez matinal|rigidez.*manha|mais de 45 minutos|45 min)/.test(t)){
        alertas.push({id:'polimialgia_reumatica_rastreamento',titulo:'Dor bilateral nos ombros + rigidez matinal em pessoa ≥50 anos',desc:'Esse padrão merece investigação médica para polimialgia reumática, principalmente se houver sintomas sistêmicos ou marcadores inflamatórios alterados.',regioes:['ombro']});
    }
    return alertas;
}

function alertasTextuaisParaRegiaoKineSys(contexto,idRegiao){
    const textuais=detectarAlertasTextuaisHMA(contexto).filter(a=>!Array.isArray(a.regioes)||a.regioes.length===0||a.regioes.includes(idRegiao));
    const clinicos=[];
    const candidatos=ordenarHipotesesRegiaoKineSys(idRegiao,contexto);
    candidatos.forEach(c=>{
        const gate=KINESYS_HIPOTESES_GATE_2[c.item.id];
        if(gate && statusHipoteseKineSys(idRegiao,c)==='positivo') clinicos.push({id:'hipotese_gate_'+c.item.id,titulo:gate[0],desc:gate[1],regioes:[idRegiao]});
    });
    const vistos=new Set(); return [...textuais,...clinicos].filter(a=>{if(vistos.has(a.id))return false;vistos.add(a.id);return true;});
}

function construirIndicadorFase(faseAtual) {
    const fases=[{id:'seguranca',label:'1. Segurança'},{id:'suspeita',label:'2. Eixo principal'},{id:'diferencial',label:'3. Eixos alternativos'}];
    const div=document.createElement('div'); div.className='fase-indicador';
    fases.forEach(f=>{ const sp=document.createElement('span'); sp.textContent=f.label; if(f.id==='seguranca')sp.classList.add('fase-concluida'); if(f.id===faseAtual)sp.classList.add('fase-ativa'); div.appendChild(sp); });
    return div;
}

function fingerprintSeguranca(idRegiao, regiao, contexto) {
    const estado = obterEstadoRegiao(idRegiao);
    const rf = (regiao.redFlags || []).map((_,i)=>estado.resultados['redflag::'+i] ? i : null).filter(v=>v!==null);
    const txt = alertasTextuaisParaRegiaoKineSys(contexto,idRegiao).map(a=>a.id).sort();
    return JSON.stringify({rf,txt});
}

function construirBlocoRedFlags(idRegiao, regiao, destacar=true) {
    const box=document.createElement('div'); box.className='bloco-redflags safety-gate-box';
    const estado=obterEstadoRegiao(idRegiao); const contexto=coletarContextoClinico();
    const titulo=document.createElement('h4'); titulo.textContent='🛡️ Triagem de segurança obrigatória'; box.appendChild(titulo);
    const alerts=alertasTextuaisParaRegiaoKineSys(contexto,idRegiao);
    if(alerts.length){
        const aviso=document.createElement('div'); aviso.className='alerta-redflag-ativo';
        aviso.innerHTML='<strong>Termos de alerta detectados automaticamente na HMA:</strong><br>'+alerts.map(a=>`• ${escapeHTML(a.titulo)} — ${escapeHTML(a.desc)}`).join('<br>')+'<br><small>Detecção textual é apenas um lembrete de triagem; não estabelece diagnóstico.</small>';
        box.appendChild(aviso);
    }
    (regiao.redFlags||[]).forEach((pergunta,i)=>{
        const linha=document.createElement('label'); linha.className='redflag-linha';
        const chk=document.createElement('input'); chk.type='checkbox'; const chave='redflag::'+i; chk.checked=!!estado.resultados[chave];
        chk.addEventListener('change',()=>{ estado.resultados[chave]=chk.checked; estado.redflagsRevisadas=false; estado.redflagAcknowledge=false; renderizarMapeamentoRegioes(); agendarAutosaveKineSys(); });
        const span=document.createElement('span'); span.textContent=pergunta; linha.append(chk,span); box.appendChild(linha);
    });
    const marcadas=(regiao.redFlags||[]).filter((_,i)=>estado.resultados['redflag::'+i]);
    const exigeDecisao = marcadas.length > 0 || alerts.length > 0;
    if(exigeDecisao){
        const gate=document.createElement('div'); gate.className='redflag-gate';
        gate.innerHTML=`<p><strong>🚨 Revisão de segurança necessária.</strong> ${marcadas.length ? 'Há sinal(is) de alerta marcado(s).' : 'A HMA contém termos que exigem revisão clínica explícita.'} Registre a decisão antes de continuar. O sistema não define urgência médica automaticamente.</p>`;
        const select=document.createElement('select'); select.innerHTML='<option value="">-- Conduta diante do alerta --</option><option value="encaminhamento_urgente">Encaminhamento médico urgente / pronto atendimento</option><option value="encaminhamento_prioritario">Encaminhamento médico prioritário</option><option value="avaliacao_medica_programada">Avaliação médica programada</option><option value="continuar_com_cautela">Continuar avaliação fisioterapêutica com cautela e monitorização</option>'; select.value=estado.redflagConduta||'';
        const ta=document.createElement('textarea'); ta.placeholder='Justificativa clínica / observações relevantes...'; ta.value=estado.redflagJustificativa||'';
        const btn=document.createElement('button'); btn.type='button'; btn.className='btn-primary'; btn.textContent=estado.redflagAcknowledge?'✓ Decisão registrada':'Registrar decisão clínica';
        btn.addEventListener('click',()=>{ if(!select.value||ta.value.trim().length<8){alert('Registre a conduta e uma justificativa clínica breve.');return;} estado.redflagConduta=select.value; estado.redflagJustificativa=ta.value.trim(); estado.redflagAcknowledge=true; estado.redflagsRevisadas=true; estado.alertasTextuaisRevisados=true; estado.safetyFingerprint=fingerprintSeguranca(idRegiao,regiao,coletarContextoClinico()); renderizarMapeamentoRegioes(); agendarAutosaveKineSys(); });
        gate.append(select,ta,btn); box.appendChild(gate);
    } else {
        const btn=document.createElement('button'); btn.type='button'; btn.className=estado.redflagsRevisadas?'btn-secondary':'btn-primary'; btn.classList.add('kds-u-mt-10px');
        btn.textContent=estado.redflagsRevisadas?'✓ Triagem de segurança revisada':'Confirmar revisão da triagem de segurança';
        btn.addEventListener('click',()=>{ estado.redflagsRevisadas=true; estado.alertasTextuaisRevisados=true; estado.safetyFingerprint=fingerprintSeguranca(idRegiao,regiao,coletarContextoClinico()); agendarAutosaveKineSys(); renderizarMapeamentoRegioes(); });
        box.appendChild(btn);
    }
    return box;
}



function avancarParaDiagnostico(){
    const regioes=Array.from(document.querySelectorAll('#grupo_regioes_mapeamento input:checked')).map(i=>i.dataset.regiao);
    if(!regioes.length){alert('Selecione ao menos uma região.');return;}
    const contexto=coletarContextoClinico();
    for(const id of regioes){
        const regiao=BANCO_MAPEAMENTO_CLINICO[id], estado=obterEstadoRegiao(id); const marcadas=(regiao.redFlags||[]).some((_,i)=>estado.resultados['redflag::'+i]);
        const fpAtual=fingerprintSeguranca(id,regiao,contexto);
        if(!estado.redflagsRevisadas || estado.safetyFingerprint!==fpAtual){ renderizarMapeamentoRegioes(); alert(`🛡️ Revise e confirme novamente a triagem de segurança de ${regiao.nome} antes de avançar. A HMA ou os sinais de alerta podem ter mudado.`); return; }
        const alertasTexto=alertasTextuaisParaRegiaoKineSys(contexto,id);
        if((marcadas||alertasTexto.length>0)&&!estado.redflagAcknowledge){ renderizarMapeamentoRegioes(); alert(`⚠️ Há sinal/termo de alerta em ${regiao.nome} sem decisão clínica registrada.`); return; }
    }
    regioes.forEach(id=>{
        const estado=obterEstadoRegiao(id), candidatos=ordenarHipotesesRegiaoKineSys(id,contexto);
        const fen=inferirFenotipoOperacionalKineSys(id,contexto);
        registrarAuditoriaMotorKineSys(id,contexto,candidatos);
        if(!haHipotesePositivaKineSys(id,candidatos)){
            if(fen){
                estado.fenotipoOperacional=fen;
                estado.incertezaEspecifica=true;
                estado.incertezaClinicaAceita=false;
                estado.incertezaClinicaMotivo='fenotipo_operacional_sem_condicao_especifica';
            }else if(!estado.incertezaClinicaAceita){
                estado.incertezaClinicaAceita=true;
                estado.incertezaClinicaMotivo='avanco_para_sintese_sem_hipotese';
                estado.incertezaClinicaDataISO=new Date().toISOString();
            }
        }else{
            estado.fenotipoOperacional=null;
            estado.incertezaEspecifica=false;
            estado.incertezaClinicaAceita=false;
        }
    });
    agendarAutosaveKineSys();
    renderizarAlertasConsolidados(); renderizarSinteseDiagnostica(); irParaSubtela('subtela_diagnostico');
}

function textoDocumentalDaHipotese(item, regiaoNome){
    const nome=item?.nome||'eixo clínico em investigação';
    return `${regiaoNome}: achados clínicos compatíveis com o eixo de investigação “${nome}”, registrados para orientar o exame fisioterapêutico. Esta informação não estabelece diagnóstico confirmado.`;
}

function gerarSinteseMapeamento(){
    const regioes=Array.from(document.querySelectorAll('#grupo_regioes_mapeamento input:checked')).map(i=>i.dataset.regiao);
    if(!regioes.length)return{html:'<p class="kds-u-text-muted kds-u-ta-center">Nenhuma região foi mapeada.</p>',resumoPorRegiao:[]};
    const contexto=coletarContextoClinico(); let html=''; const resumoPorRegiao=[];
    regioes.forEach(id=>{
        const reg=BANCO_MAPEAMENTO_CLINICO[id], est=obterEstadoRegiao(id), candidatos=ordenarHipotesesRegiaoKineSys(id,contexto);
        const positivos=candidatos.filter(c=>statusHipoteseKineSys(id,c)==='positivo');
        const rf=(reg.redFlags||[]).filter((_,i)=>est.resultados['redflag::'+i]);
        const alertasTxt=alertasTextuaisParaRegiaoKineSys(contexto,id);
        const fen=est.fenotipoOperacional||inferirFenotipoOperacionalKineSys(id,contexto);
        let hipotese,nivel,codigo='',nome='',textoDocumento='',associadas=[];
        if(rf.length||alertasTxt.length){
            hipotese=`Sinal(is) de alerta revisado(s). Conduta registrada: ${est.redflagConduta||'não registrada'}. ${est.redflagJustificativa||''}`;
            nivel='alerta'; textoDocumento=`${reg.nome}: sinal(is) de alerta identificado(s) durante a triagem; conduta clínica registrada no prontuário.`;
        }else if(positivos.length){
            const principal=positivos[0]; codigo=principal.item.id; nome=principal.item.nome;
            associadas=positivos.slice(1,4).map(c=>({codigo:c.item.id,nome:c.item.nome,grupo:c.grupo}));
            const suf=calcularSuficienciaInvestigacaoKineSys(id,principal.item,principal.grupo);
            hipotese=`Eixo de investigação principal: ${nome}. ${principal.item.interpretacao}`;
            if(associadas.length) hipotese+=` Eixo(s) associado(s) também compatível(is): ${associadas.map(x=>x.nome).join('; ')}.`;
            hipotese+=` Suficiência dos dados para a regra operacional principal: ${suf.percentual}%.`;
            nivel='positivo'; textoDocumento=textoDocumentalDaHipotese(principal.item,reg.nome);
            if(associadas.length) textoDocumento+=` Eixos associados compatíveis no exame: ${associadas.map(x=>x.nome).join('; ')}.`;
        }else if(fen){
            nome=fen.nome; hipotese=`Padrão operacional sugerido: ${fen.nome}. ${fen.texto} Condição específica ainda não definida.`;
            nivel='fenotipo'; textoDocumento=`${reg.nome}: ${fen.nome}. O padrão foi utilizado como direção operacional fisioterapêutica, mantendo incerteza quanto à condição específica e reavaliação conforme novos achados.`;
        }else if(est.incertezaClinicaAceita){
            hipotese='Sem eixo operacional definido nesta etapa. O quadro foi registrado como investigação em aberto após revisão clínica, sem impedir continuidade da avaliação.';
            nivel='indeterminado'; textoDocumento=`${reg.nome}: sem eixo operacional definido nesta etapa; avaliação prosseguiu com registro explícito de incerteza clínica e acompanhamento orientado por sinais, sintomas, função e evolução.`;
        }else{
            hipotese='Avaliação sem eixo operacional sustentado pelos achados preenchidos. É permitido prosseguir sem forçar um diagnóstico, mantendo reavaliação conforme novos achados e evolução.';
            nivel='pendente'; textoDocumento=`${reg.nome}: avaliação em andamento, sem hipótese operacional definida pelos achados registrados.`;
        }
        resumoPorRegiao.push({regiao:reg.nome,hipotese,nivel,codigoHipotese:codigo,nomeHipotese:nome,hipotesesAssociadas:associadas,fenotipoOperacional:fen?.nome||'',textoDocumento,incertezaClinicaAceita:!!est.incertezaClinicaAceita,incertezaEspecifica:!!est.incertezaEspecifica,incertezaClinicaMotivo:est.incertezaClinicaMotivo||'',redFlags:rf,alertasTextuais:alertasTxt.map(a=>a.id),redflagConduta:est.redflagConduta||'',redflagJustificativa:est.redflagJustificativa||'',segurancaRevisada:!!est.redflagsRevisadas,auditoriaMotor:est.auditoriaMotor||null});
        const c=nivel==='alerta'?'status-alerta':nivel==='positivo'?'status-positivo':(nivel==='fenotipo'||nivel==='indeterminado')?'status-inconclusivo':'status-negativo';
        html+=`<div class="cluster-card ${c}"><h4>🧩 ${escapeHTML(reg.nome)}</h4><p class="kds-u-fs-label kds-u-m-6px-0-0">${escapeHTML(hipotese)}</p></div>`;
    });
    return{html,resumoPorRegiao};
}

function obterTextoDocumentalUltimaAvaliacao(p){
    const av=obterAvaliacaoMaisRecente(p); if(!av?.mapeamento?.resumoPorRegiao)return'';
    return av.mapeamento.resumoPorRegiao.map(r=>r.textoDocumento||r.nomeHipotese||r.hipotese||'').filter(Boolean).join(' ');
}

function obterPacienteIdRelatorioAtivo(){
    const selecionado=document.getElementById('rel_paciente_select')?.value||'';
    if(selecionado)return selecionado;
    let contexto='';try{contexto=localStorage.getItem('kinesys_paciente_contexto')||'';}catch(_){contexto='';}
    return contexto || pacienteAtualId || '';
}

async function sincronizarPacienteRelatorio(){
    const id=obterPacienteIdRelatorioAtivo();
    const sel=document.getElementById('rel_paciente_select');
    if(id&&sel&&String(sel.value)!==String(id)&&[...sel.options].some(o=>String(o.value)===String(id)))sel.value=id;
    return id;
}

async function onPacienteRelatorioChange(){
    const pacienteId=await sincronizarPacienteRelatorio(); const cont=document.getElementById('preview_relatorio_container'); if(cont)cont.style.display='none';
    if(!pacienteId){renderResumoPaciente('resumo_paciente_relatorio',null);return;}
    const lista=await obterPacientesSalvos();const p=lista.find(x=>String(x.id)===String(pacienteId));renderResumoPaciente('resumo_paciente_relatorio',p);if(!p)return;const campo=document.getElementById('rel_comp_diagnostico');if(campo)campo.value=obterTextoDocumentalUltimaAvaliacao(p)||'Sem síntese clínica documental registrada.';
}

function onTipoDocumentoChange(){
    const tipo=document.getElementById('rel_tipo_documento')?.value||'comparecimento';
    const comp=document.getElementById('campos_comparecimento'), ia=document.getElementById('bloco_ia'), objetivo=document.getElementById('rel_objetivo'), grupoObjetivo=document.getElementById('rel_objetivo_group'), btnTxt=document.getElementById('btn_gerar_ia_texto'), label=document.getElementById('rel_documento_oficial_label');
    if(comp)comp.style.display=tipo==='comparecimento'?'block':'none';
    if(ia)ia.style.display=(tipo==='relatorio'||tipo==='encaminhamento')?'block':'none';
    if(tipo==='encaminhamento'&&objetivo){objetivo.value='avaliacao_medica';if(grupoObjetivo)grupoObjetivo.style.display='none';if(btnTxt)btnTxt.textContent='Gerar encaminhamento';if(label)label.firstChild.textContent='Encaminhamento ';}
    else {if(grupoObjetivo)grupoObjetivo.style.display='';if(btnTxt)btnTxt.textContent='Gerar relatório';if(label)label.firstChild.textContent='Relatório fisioterapêutico ';}
    const preview=document.getElementById('preview_relatorio_container');if(preview)preview.style.display='none';
    sincronizarPacienteRelatorio().then(()=>onPacienteRelatorioChange()).catch(()=>{});
}

function formatarDataPorExtenso(valor){
    let d;
    if(!valor) d=new Date();
    else if(valor instanceof Date) d=valor;
    else if(/^\d{4}-\d{2}-\d{2}$/.test(String(valor))){ const [a,m,dia]=String(valor).split('-').map(Number); d=new Date(a,m-1,dia); }
    else if(/^\d{2}\/\d{2}\/\d{4}$/.test(String(valor))){ const [dia,m,a]=String(valor).split('/').map(Number); d=new Date(a,m-1,dia); }
    else d=new Date(valor);
    if(!Number.isFinite(d.getTime())) return String(valor||'');
    const meses=['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
    return `${d.getDate()} de ${meses[d.getMonth()]} de ${d.getFullYear()}`;
}
function formatarHoraFormal(hora){
    const m=String(hora||'').match(/^(\d{1,2}):(\d{2})$/); if(!m)return String(hora||'');
    return `${String(m[1]).padStart(2,'0')}h${m[2]}`;
}
function rotuloFinalidadeRelatorio(objetivo){
    return ({
        geral:'Avaliação fisioterapêutica',
        evolucao:'Evolução fisioterapêutica',
        avaliacao_medica:'Encaminhamento',
        alta:'Alta fisioterapêutica',
        empresa:'Relatório para empresa / convênio',
        academia:'Orientação à academia / Profissional de Educação Física'
    })[objetivo]||'Avaliação fisioterapêutica';
}
function destinatarioRelatorio(objetivo){
    return ({
        avaliacao_medica:'Profissional médico ou especialista responsável pela avaliação',
        academia:'Profissional de Educação Física responsável pelo acompanhamento do paciente',
        empresa:'Setor responsável da empresa ou do convênio'
    })[objetivo]||'';
}
function gerarRodapeAssinaturaHTML(){
    const nome=escapeHTML(usuarioLogado?.nome||'Profissional não identificado');
    const regRaw=String(usuarioLogado?.registro||'').trim();
    const reg=escapeHTML(regRaw||'Registro profissional N/I');
    let profissao=rotuloPerfil(usuarioLogado?.tipo||'');
    if(/^CREFITO/i.test(regRaw)) profissao='Fisioterapeuta';
    else if(/^CRM/i.test(regRaw)) profissao='Médico';
    else if(/^CREF(?:-|\s)/i.test(regRaw)) profissao='Profissional de Educação Física';
    const perfilAdmin=['MASTER','MASTER_FEM','SECRETARIA'].includes(String(usuarioLogado?.tipo||'').toUpperCase());
    const linhaProfissao=(!perfilAdmin||regRaw)?`<p class="profissao-assinatura">${escapeHTML(profissao)}</p>`:'';
    const linhaRegistro=regRaw?`<p class="registro-assinatura">${reg}</p>`:'';
    return `<div class="fechamento-documento"><p class="local-data">Montes Claros, ${escapeHTML(formatarDataPorExtenso(new Date()))}.</p><div class="assinatura-dinamica"><div class="linha-assinatura"></div><p class="nome-assinatura">${nome}</p>${linhaProfissao}${linhaRegistro}</div></div>`;
}
function gerarCabecalhoRelatorioHTML(p,objetivo){
    const finalidade=rotuloFinalidadeRelatorio(objetivo);
    const idade=idadeNumericaPaciente(p);
    const av=p?(obterAvaliacaoFinalizadaMaisRecente(p)||obterAvaliacaoMaisRecente(p)):null;
    const evs=(p?.evolucoes||[]).slice().sort((a,b)=>String(a.data||a.dataHoraISO||'').localeCompare(String(b.data||b.dataHoraISO||'')));
    const primeiraData=av?.dataAvaliacao||'';
    const ultimaData=evs.at(-1)?.data||'';
    const dest=destinatarioRelatorio(objetivo);
    const linhas=[
        `<div class="doc-meta-row"><span class="doc-meta-label">Paciente</span><span>${escapeHTML(p?.nome||'Não identificado')}${idade?`, ${escapeHTML(idade)} anos`:''}</span></div>`,
        primeiraData?`<div class="doc-meta-row"><span class="doc-meta-label">Avaliação inicial</span><span>${escapeHTML(formatarDataPorExtenso(primeiraData))}</span></div>`:'',
        objetivo==='evolucao'&&primeiraData&&ultimaData?`<div class="doc-meta-row"><span class="doc-meta-label">Período referido</span><span>${escapeHTML(formatarDataPorExtenso(primeiraData))} a ${escapeHTML(formatarDataPorExtenso(ultimaData))}</span></div>`:'',
        dest?`<div class="doc-meta-row"><span class="doc-meta-label">Destinatário</span><span>${escapeHTML(dest)}</span></div>`:''
    ].filter(Boolean).join('');
    return `<p class="doc-titulo">Relatório Fisioterapêutico</p><p class="doc-finalidade">${escapeHTML(finalidade)}</p><div class="doc-meta">${linhas}</div>`;
}
function normalizarTituloSecaoRelatorio(linha){
    const limpo=String(linha||'').replace(/^#{1,4}\s*/,'').replace(/^\*\*(.*?)\*\*$/,'$1').replace(/:$/,'').trim();
    const n=removerAcentos(limpo).toLowerCase();
    const mapa=[
        ['contexto clinico','Contexto clínico'],['queixa principal','Contexto clínico'],
        ['avaliacao fisioterapeutica','Avaliação fisioterapêutica'],['achados clinicos','Avaliação fisioterapêutica'],['achados objetivos','Avaliação fisioterapêutica'],
        ['evolucao clinica e funcional','Evolução clínica e funcional'],['evolucao funcional','Evolução clínica e funcional'],['evolucao clinica','Evolução clínica e funcional'],
        ['condicao atual','Condição atual'],['capacidade funcional atual','Condição atual'],
        ['conduta fisioterapeutica','Conduta fisioterapêutica'],['conduta','Conduta fisioterapêutica'],['plano fisioterapeutico','Conduta fisioterapêutica'],
        ['recomendacoes temporarias','Recomendações temporárias'],['recomendacoes','Recomendações temporárias'],
        ['solicitacao de avaliacao medica','Solicitação de avaliação médica'],['motivo da avaliacao solicitada','Solicitação de avaliação médica'],
        ['consideracoes fisioterapeuticas','Considerações fisioterapêuticas'],['sintese fisioterapeutica','Considerações fisioterapêuticas'],['parecer','Considerações fisioterapêuticas'],
        ['orientacoes','Orientações'],['orientacoes de alta','Orientações'],
        ['condicao de alta','Condição de alta']
    ];
    const hit=mapa.find(([k])=>n===k); return hit?hit[1]:null;
}
function renderizarTextoRelatorioEstruturado(texto){
    const linhas=String(texto||'').replace(/\r/g,'').split('\n');
    const blocos=[]; let atual={titulo:null,linhas:[]};
    const flush=()=>{if(atual.linhas.some(x=>x.trim()))blocos.push(atual); atual={titulo:null,linhas:[]};};
    for(const linha of linhas){
        const titulo=normalizarTituloSecaoRelatorio(linha);
        if(titulo){flush();atual={titulo,linhas:[]};continue;}
        atual.linhas.push(linha);
    }
    flush();
    if(!blocos.length)blocos.push({titulo:null,linhas:[texto]});
    return blocos.map(b=>{
        const paras=b.linhas.join('\n').split(/\n{2,}/).map(x=>x.trim()).filter(Boolean).map(x=>`<p>${escapeHTML(x).replace(/\n/g,'<br>')}</p>`).join('');
        return b.titulo?`<section class="doc-secao"><h3 class="doc-secao-titulo">${escapeHTML(b.titulo)}</h3>${paras}</section>`:paras;
    }).join('');
}

async function montarDocumentoComparecimento(){
    const id=await sincronizarPacienteRelatorio();if(!id){alert('⚠️ Selecione um paciente primeiro.');return;}
    const lista=await obterPacientesSalvos(),p=lista.find(x=>x.id===id);if(!p){alert('Paciente não encontrado.');return;}
    const valorData=document.getElementById('rel_comp_data').value||new Date().toISOString().slice(0,10);
    const data=formatarDataPorExtenso(valorData);
    const entrada=document.getElementById('rel_comp_entrada')?.value||'',saida=document.getElementById('rel_comp_saida')?.value||'';
    if(!entrada||!saida){alert('⚠️ Informe a hora de entrada e a hora de saída.');return;}
    if(saida<=entrada){alert('⚠️ A hora de saída deve ser posterior à hora de entrada.');return;}
    const incluirCid=!!document.getElementById('rel_incluir_cid')?.checked,incluirDiag=!!document.getElementById('rel_incluir_diagnostico')?.checked;
    const cid=document.getElementById('rel_comp_cid').value.trim(),diag=document.getElementById('rel_comp_diagnostico').value.trim();
    const extras=(incluirCid&&cid?`<p class="info-linha"><strong>CID:</strong> ${escapeHTML(cid)}</p>`:'')+(incluirDiag&&diag?`<p class="info-linha"><strong>Informação clínica:</strong> ${escapeHTML(diag)}</p>`:'');
    const corpo=`<p class="doc-titulo">Declaração de Comparecimento</p><p>Declaro, para os devidos fins, que <strong>${escapeHTML(p.nome)}</strong>, CPF nº <strong>${escapeHTML(p.cpf||'não informado')}</strong>, compareceu à FISIOFIX em <strong>${escapeHTML(data)}</strong>, para atendimento fisioterapêutico, com entrada registrada às <strong>${escapeHTML(formatarHoraFormal(entrada))}</strong> e saída às <strong>${escapeHTML(formatarHoraFormal(saida))}</strong>.</p>${extras}<p>A presente declaração é emitida a pedido do interessado para fins de comprovação de comparecimento.</p>${gerarRodapeAssinaturaHTML()}`;
    documentoAtualMeta={pacienteId:id,tipo:'comparecimento',titulo:'Declaração de Comparecimento',detalhes:{data:valorData,entrada,saida}};
    montarDocumentoComTimbrado(corpo);
}

const PROMPT_SISTEMA_RELATORIO_FISIOTERAPEUTICO = `Você é um assistente de redação de documentação fisioterapêutica em português formal brasileiro. Produza texto técnico-profissional, claro, coeso, sóbrio e sem redundâncias. Use SOMENTE dados presentes no rascunho do fisioterapeuta e no contexto estruturado fornecido. Não invente diagnóstico, exame, achado, data, CID, conduta, prognóstico, restrição, recomendação, medida ou resposta clínica.

REGRAS DE REDAÇÃO:
- Diferencie sempre a origem da informação: use “o paciente relata/referia” para informação subjetiva; “ao exame fisioterapêutico, observou-se/registrou-se” para achado objetivo; “os achados mostram-se compatíveis com/considerou-se como hipótese clínico-funcional” para interpretação; e “segundo laudo/documento apresentado” somente quando houver documento registrado.
- Não transforme hipótese em diagnóstico confirmado. Evite linguagem absoluta quando os dados sustentam apenas hipótese clínico-funcional.
- Preserve números, unidades, lados e datas. Quando houver evolução longitudinal, compare estado inicial e atual e deixe claro o que melhorou, o que permaneceu e o que piorou.
- Não declare significância clínica, MCID ou prognóstico se isso não estiver explicitamente sustentado no contexto.
- Não preencha espaço com frases genéricas. Toda frase deve acrescentar informação clínica ou documental útil.
- Não mencione IA, algoritmo, motor, score, API, prompt ou instruções internas.
- Mantenha tom profissional entre profissionais de saúde. Não use linguagem infantilizada, professoral, condescendente ou explicações óbvias ao fisioterapeuta.
- Não inclua referências bibliográficas de rotina.
- Não use o título “Carta de Encaminhamento”. O documento será sempre um RELATÓRIO FISIOTERAPÊUTICO com finalidade específica.
- Use “Considerações fisioterapêuticas” como seção final de interpretação/conclusão; não use “Parecer”.
- Escreva as seções exatamente com os títulos solicitados pelo objetivo, cada título em uma linha própria. Não numere as seções e não use tabelas Markdown. A diagramação visual será feita pelo KineSys.
- Para academia/Profissional de Educação Física, informe capacidade funcional, limitações provocadas por carga, adaptações temporárias e critérios de interrupção/reavaliação quando registrados. Não prescreva periodização nem substitua a prescrição do profissional de Educação Física.
- Para empresa/convênio, minimize dados clínicos sensíveis não necessários à finalidade.
- Para alta, só declare alta quando houver registro explícito no contexto ou no rascunho.`;


function normalizarTituloGeminiIntegridade(valor='') {
    return String(valor || '')
        .replace(/^\s{0,3}#{1,6}\s*/, '')
        .replace(/^\s*(?:\d+[.)-]?|[-*•])\s*/, '')
        .replace(/\*\*/g, '')
        .replace(/[:.;]+\s*$/, '')
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .toLowerCase().replace(/\s+/g, ' ').trim();
}

function extrairSecoesObrigatoriasGemini(textoUsuario='') {
    const linha = String(textoUsuario || '').match(/^ESTRUTURA OBRIGATÓRIA:\s*(.+)$/mi)?.[1] || '';
    return linha.split('>').map(x => x.trim()).filter(Boolean);
}

function extrairBlocosRelatorioGemini(texto='', secoesEsperadas=[]) {
    const lookup = new Map(secoesEsperadas.map(sec => [normalizarTituloGeminiIntegridade(sec), sec]));
    const blocos = new Map(secoesEsperadas.map(sec => [sec, []]));
    const preambulo = [];
    let atual = null;
    String(texto || '').replace(/\r/g,'').split('\n').forEach(linha => {
        const titulo = lookup.get(normalizarTituloGeminiIntegridade(linha));
        if (titulo) { atual = titulo; return; }
        if (atual) blocos.get(atual).push(linha);
        else if (linha.trim()) preambulo.push(linha);
    });
    return { blocos, preambulo };
}

function avaliarIntegridadeRelatorioGemini(texto='', secoesEsperadas=[]) {
    if (!secoesEsperadas.length) return { ok:true, ausentes:[], incompletas:[], blocos:new Map() };
    const extraido = extrairBlocosRelatorioGemini(texto, secoesEsperadas);
    const ausentes = [], incompletas = [];
    secoesEsperadas.forEach(sec => {
        const corpo = (extraido.blocos.get(sec) || []).join('\n').trim();
        if (!corpo) ausentes.push(sec);
        else if (corpo.replace(/\s+/g,' ').length < 20) incompletas.push(sec);
    });
    return { ok:!ausentes.length && !incompletas.length, ausentes, incompletas, blocos:extraido.blocos, preambulo:extraido.preambulo };
}

function concatenarContinuacaoGemini(textoBase='', continuacao='') {
    const a = String(textoBase || '').trimEnd();
    const b = String(continuacao || '').trimStart();
    if (!a) return b;
    if (!b) return a;
    // Elimina uma eventual repetição curta do início da continuação.
    const limite = Math.min(400, a.length, b.length);
    for (let n=limite; n>=35; n--) {
        if (a.slice(-n) === b.slice(0,n)) return `${a}${b.slice(n)}`.trim();
    }
    return `${a}\n${b}`.trim();
}

function mesclarReparoSecoesGemini(textoBase='', textoReparo='', secoesEsperadas=[]) {
    const base = extrairBlocosRelatorioGemini(textoBase, secoesEsperadas);
    const reparo = extrairBlocosRelatorioGemini(textoReparo, secoesEsperadas);
    const partes = [];
    const pre = (base.preambulo || []).join('\n').trim();
    if (pre) partes.push(pre);
    secoesEsperadas.forEach(sec => {
        const original = (base.blocos.get(sec) || []).join('\n').trim();
        const complementar = (reparo.blocos.get(sec) || []).join('\n').trim();
        const corpo = original.replace(/\s+/g,' ').length >= 20 ? original : complementar;
        partes.push(`${sec}\n${corpo}`.trim());
    });
    return partes.filter(Boolean).join('\n\n').trim();
}

function geminiFoiInterrompidoPorTokens(finishReason='') {
    return /MAX[_\s-]?TOKENS|TOKEN_LIMIT|LENGTH/i.test(String(finishReason || ''));
}

function geminiFinishReasonBloqueante(finishReason='') {
    const motivo = String(finishReason || '').toUpperCase().trim();
    if (!motivo || motivo === 'STOP' || geminiFoiInterrompidoPorTokens(motivo)) return false;
    return /SAFETY|RECITATION|BLOCKLIST|PROHIBITED|SPII|MALFORMED|OTHER/i.test(motivo);
}

async function requisitarGeminiRelatorioModelo(modelo, systemPrompt, contents, maxOutputTokens=GEMINI_CONFIG.maxOutputTokens) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), GEMINI_CONFIG.timeoutMs);
    try {
        if (!_supabase?.functions?.invoke) throw new Error('A função segura de relatório ainda não está configurada no Supabase.');
        const { data: corpo, error: invokeError } = await _supabase.functions.invoke(GEMINI_CONFIG.edgeFunction, {
            body: {
                modelo,
                systemPrompt,
                contents,
                maxOutputTokens
            }
        });
        if (invokeError) throw new Error(invokeError.message || 'A função segura de relatório não respondeu.');
        if (!corpo) throw new Error('A função segura de relatório retornou uma resposta vazia.');
        const bloqueio = corpo?.promptFeedback?.blockReason;
        if (bloqueio) throw new Error(`A solicitação foi bloqueada pela API (${bloqueio}).`);
        const candidato = corpo?.candidates?.[0];
        const texto = (candidato?.content?.parts || [])
            .filter(parte => !parte.thought)
            .map(parte => parte.text || '').join('').trim();
        const finishReason = candidato?.finishReason || '';
        if (!texto) throw new Error(`O Gemini não retornou texto utilizável (${finishReason || 'sem conteúdo'}).`);
        if (geminiFinishReasonBloqueante(finishReason)) throw new Error(`A resposta do Gemini foi encerrada antes da conclusão (${finishReason}).`);
        return { texto, finishReason };
    } finally {
        clearTimeout(timer);
    }
}

async function completarRespostaGeminiSeNecessario(modelo, systemPrompt, textoUsuario, respostaInicial) {
    let texto = respostaInicial.texto;
    let finishReason = respostaInicial.finishReason;
    let continuacoes = 0;
    while (geminiFoiInterrompidoPorTokens(finishReason) && continuacoes < GEMINI_CONFIG.maxContinuacoes) {
        const pedido = `A resposta anterior foi interrompida pelo limite de saída. Continue EXATAMENTE do ponto em que parou. Não repita títulos nem parágrafos já escritos. Conclua todas as seções obrigatórias que ainda faltarem e encerre somente depois de terminar o relatório.`;
        const r = await requisitarGeminiRelatorioModelo(modelo, systemPrompt, [
            { role:'user', parts:[{ text:textoUsuario }] },
            { role:'model', parts:[{ text:texto }] },
            { role:'user', parts:[{ text:pedido }] }
        ]);
        texto = concatenarContinuacaoGemini(texto, r.texto);
        finishReason = r.finishReason;
        continuacoes += 1;
    }
    if (geminiFoiInterrompidoPorTokens(finishReason)) {
        throw new Error('O Gemini atingiu o limite de texto repetidamente. O KineSys não aceitou o relatório incompleto; tente novamente ou selecione uma extensão menor.');
    }
    return { texto, finishReason, continuacoes };
}

async function repararSecoesAusentesGemini(modelo, systemPrompt, textoUsuario, textoAtual, secoesEsperadas) {
    let texto = textoAtual;
    let reparos = 0;
    let integridade = avaliarIntegridadeRelatorioGemini(texto, secoesEsperadas);
    while (!integridade.ok && reparos < GEMINI_CONFIG.maxReparosEstrutura) {
        const faltando = [...integridade.ausentes, ...integridade.incompletas];
        const pedido = `O relatório anterior ficou incompleto. Gere SOMENTE as seções abaixo, na ordem indicada, com cada título exatamente em uma linha própria:\n${faltando.map(x=>`- ${x}`).join('\n')}\n\nUse exclusivamente os dados do contexto original. Não repita as seções que já estão completas. Se não houver dado adicional para uma seção, registre de forma breve que não há informação adicional documentada, sem inventar conteúdo.`;
        let r = await requisitarGeminiRelatorioModelo(modelo, systemPrompt, [
            { role:'user', parts:[{ text:textoUsuario }] },
            { role:'model', parts:[{ text:texto }] },
            { role:'user', parts:[{ text:pedido }] }
        ], Math.min(GEMINI_CONFIG.maxOutputTokens, 3200));
        r = await completarRespostaGeminiSeNecessario(modelo, systemPrompt, `${textoUsuario}

INSTRUÇÃO DE REPARO:
${pedido}`, r);
        texto = mesclarReparoSecoesGemini(texto, r.texto, secoesEsperadas);
        integridade = avaliarIntegridadeRelatorioGemini(texto, secoesEsperadas);
        reparos += 1;
    }
    if (!integridade.ok) {
        const pendentes = [...integridade.ausentes, ...integridade.incompletas];
        throw new Error(`O Gemini não concluiu todas as seções obrigatórias (${pendentes.join(', ')}). O KineSys recusou o texto parcial para evitar um relatório cortado.`);
    }
    return { texto, reparos, integridade };
}

async function chamarGeminiRelatorio(systemPrompt, textoUsuario) {
    if (!_supabase?.functions?.invoke) throw new Error('A IA está temporariamente indisponível: configure a Edge Function segura do Supabase.');
    const secoesEsperadas = extrairSecoesObrigatoriasGemini(textoUsuario);
    let ultimoErro = null;
    for (const modelo of GEMINI_CONFIG.modelos) {
        try {
            const inicial = await requisitarGeminiRelatorioModelo(modelo, systemPrompt, [
                { role:'user', parts:[{ text:textoUsuario }] }
            ]);
            const continuado = await completarRespostaGeminiSeNecessario(modelo, systemPrompt, textoUsuario, inicial);
            const reparado = await repararSecoesAusentesGemini(modelo, systemPrompt, textoUsuario, continuado.texto, secoesEsperadas);
            return {
                texto: reparado.texto,
                modelo,
                continuacoes: continuado.continuacoes,
                reparos: reparado.reparos,
                integridade: 'completo'
            };
        } catch (erro) {
            if (erro?.name === 'AbortError') {
                ultimoErro = new Error(`Tempo limite excedido ao consultar ${modelo}.`);
                continue;
            }
            const status = Number(erro?.status || 0);
            if ([400,404].includes(status)) {
                ultimoErro = new Error(`${modelo}: ${erro.message}`);
                continue;
            }
            if ([401,403].includes(status)) throw new Error('A API recusou a chave do Gemini. Verifique se a chave está ativa, autorizada para a Gemini API e com cota disponível.');
            if (status === 429) throw new Error('A cota da API Gemini foi atingida ou há excesso de requisições. Tente novamente em instantes.');
            ultimoErro = erro;
            if (/chave|cota|bloquead|SAFETY|RECITATION|PROHIBITED/i.test(erro.message || '')) throw erro;
        }
    }
    throw ultimoErro || new Error('Nenhum modelo Gemini respondeu.');
}

async function testarConexaoGemini() {
    const status = document.getElementById('status_gemini');
    if (status) {
        status.style.display = 'block';
        status.textContent = '⏳ Testando conexão com o Gemini...';
    }
    try {
        const r = await chamarGeminiRelatorio(
            'Responda somente com a palavra OK.',
            'Teste técnico de conectividade do KineSys. Responda somente OK.'
        );
        if (status) {
            status.textContent = `✅ Gemini conectado (${r.modelo}).`;
            status.classList.remove('ks-status-error','ks-status-muted','kds-u-text-muted'); status.classList.add('ks-status-success');
        }
        return true;
    } catch (e) {
        console.error('Teste Gemini:', e);
        if (status) {
            status.textContent = `❌ Gemini indisponível: ${e.message}`;
            status.classList.remove('ks-status-success','ks-status-muted','kds-u-text-muted'); status.classList.add('ks-status-error');
        }
        return false;
    }
}

async function gerarDocumentoComIA(){
    const pacienteId = await sincronizarPacienteRelatorio();
    if (!pacienteId) { alert('⚠️ Selecione um paciente primeiro.'); return; }

    const rascunho = document.getElementById('rel_rascunho_rapido').value.trim();

    const lista = await obterPacientesSalvos();
    const p = lista.find(x => x.id === pacienteId);
    const av = p ? (obterAvaliacaoFinalizadaMaisRecente(p)||obterAvaliacaoMaisRecente(p)) : null;
    const resumoMapa = (av?.mapeamento?.resumoPorRegiao || [])
        .map(r => r.textoDocumento || r.nomeHipotese || '')
        .filter(Boolean)
        .join(' | ');

    const tipoDocumento=document.getElementById('rel_tipo_documento')?.value||'relatorio';
    const objetivo=tipoDocumento==='encaminhamento'?'avaliacao_medica':(document.getElementById('rel_objetivo')?.value||'geral');
    if (!['MASTER','MASTER_FEM','FISIOTERAPEUTA','PROFISSIONAL'].includes(perfilDoUsuario())) { alert('🔒 Seu perfil não pode gerar relatórios clínicos.'); return; }
    const extensao=document.getElementById('rel_extensao')?.value||'medio';
    const qtdEvo=parseInt(document.getElementById('rel_evolucoes_qtd')?.value||'0',10);
    const clin=av?.mapeamento?.clinicaEstruturada||{};
    const evolucoes=(p?.evolucoes||[]).slice(qtdEvo===999?0:Math.max(0,(p?.evolucoes||[]).length-qtdEvo)).map(e=>({data:e.data||'',eva:e.eva??'',estado:e.dadosEstruturados?.estadoClinico||'',mudancas:e.dadosEstruturados?.mudancas||'',respostaCarga:e.dadosEstruturados?.respostaCarga||null,relato:e.relatoLivre||e.relato||''}));
    const contexto={paciente:p?{nome:p.nome,idade:p.idade||'',sexo:p.sexo||'',profissao:p.profissao||''}:null,avaliacao:av?{data:av.dataAvaliacao||'',eva:av.evaInicial??'',hma:av.hma||'',esporte:av.esporte||'',cirurgias:av.cirurgias||[],medicamentos:av.medicamentos||[],sinteseClinica:resumoMapa,tipo:av.tipo||'Avaliação',medidasObjetivas:document.getElementById('rel_inc_medidas')?.checked?(clin.medidasObjetivas||[]):[],psfs:document.getElementById('rel_inc_outcomes')?.checked?(clin.psfs||null):null,outcomes:document.getElementById('rel_inc_outcomes')?.checked?(clin.outcomes||[]):[],objetivosPlano:document.getElementById('rel_inc_objetivos')?.checked?(clin.objetivosPlano||null):null}:null,evolucoes};
    const rotulosObjetivo={geral:'relatório fisioterapêutico geral',evolucao:'relatório de evolução',avaliacao_medica:'relatório fisioterapêutico solicitando avaliação médica/especialista',alta:'relatório de alta fisioterapêutica',empresa:'relatório para empresa/convênio',academia:'relatório fisioterapêutico para academia / profissional de Educação Física'};
    const estruturas={
        geral:['Contexto clínico','Avaliação fisioterapêutica','Conduta fisioterapêutica','Considerações fisioterapêuticas'],
        evolucao:['Contexto clínico','Evolução clínica e funcional','Condição atual','Conduta fisioterapêutica','Considerações fisioterapêuticas'],
        avaliacao_medica:['Contexto clínico','Avaliação fisioterapêutica','Evolução clínica e funcional','Solicitação de avaliação médica','Considerações fisioterapêuticas'],
        alta:['Contexto clínico','Evolução clínica e funcional','Condição de alta','Orientações','Considerações fisioterapêuticas'],
        empresa:['Contexto clínico','Condição atual','Considerações fisioterapêuticas'],
        academia:['Contexto clínico','Condição atual','Recomendações temporárias','Considerações fisioterapêuticas']
    };
    const estrutura=(estruturas[objetivo]||estruturas.geral).join(' > ');
    const textoUsuario=`OBJETIVO DO DOCUMENTO: ${rotulosObjetivo[objetivo]||objetivo}\nEXTENSÃO DESEJADA: ${extensao}\nESTRUTURA OBRIGATÓRIA: ${estrutura}\n\nORIENTAÇÃO ADICIONAL DO FISIOTERAPEUTA:\n${rascunho||'[Sem orientação adicional: elaborar somente a partir dos dados estruturados disponíveis.]'}\n\nCONTEXTO ESTRUTURADO DO KINESYS (use somente dados realmente presentes; não complete lacunas):\n${JSON.stringify(contexto,null,2)}`;
    window.__kinesysUltimoContextoRelatorio={contexto,rascunho,objetivo,extensao,textoUsuario};

    const btn = document.getElementById('btn_gerar_ia');
    const txt = document.getElementById('btn_gerar_ia_texto');
    const status = document.getElementById('status_gemini');
    const orig = txt.textContent;
    btn.classList.add('carregando');
    txt.innerHTML = '<span class="spinner-ia"></span>Gerando relatório...';
    if (status) {
        status.style.display = 'block';
        status.classList.remove('ks-status-success','ks-status-error'); status.classList.add('ks-status-muted','kds-u-text-muted');
        status.textContent = '⏳ Enviando o resumo e os dados registrados para o Gemini...';
    }

    try {
        const resultado = await chamarGeminiRelatorio(PROMPT_SISTEMA_RELATORIO_FISIOTERAPEUTICO, textoUsuario);
        const campo = document.getElementById('rel_documento_oficial');
        campo.value = resultado.texto;
        campo.dataset.origemDocumento = 'ia';
        campo.dataset.modeloIA = resultado.modelo;
        campo.dataset.integridadeIA = resultado.integridade || 'completo';
        document.getElementById('bloco_relatorio_oficial').style.display = 'block';
        setTimeout(()=>validarRelatorioIA(false),0);
        if (status) {
            const ajustes = [resultado.continuacoes ? `${resultado.continuacoes} continuação(ões) automática(s)` : '', resultado.reparos ? `${resultado.reparos} reparo(s) de seção` : ''].filter(Boolean).join(' · ');
            status.textContent = `✅ Relatório completo e conferido pelo KineSys${ajustes ? ` — ${ajustes}` : ''}. Revise o texto antes da impressão.`;
            status.classList.remove('ks-status-error','ks-status-muted','kds-u-text-muted'); status.classList.add('ks-status-success');
        }
        campo.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (e) {
        console.error('Erro ao gerar relatório com Gemini:', e);
        if (status) {
            status.textContent = `❌ Falha na IA: ${e.message}`;
            status.classList.remove('ks-status-success','ks-status-muted','kds-u-text-muted'); status.classList.add('ks-status-error');
        }
        alert('❌ Não foi possível gerar o relatório com o Gemini.\n\n' + e.message);
    } finally {
        btn.classList.remove('carregando');
        txt.textContent = orig;
    }
}

async function montarDocumentoIAParaImpressao(){
    const pacienteId=await sincronizarPacienteRelatorio(),texto=document.getElementById('rel_documento_oficial').value.trim();
    if(!pacienteId){alert('⚠️ Selecione um paciente primeiro.');return;}
    if(!texto){alert('⚠️ O Relatório Oficial está vazio. Gere com a IA ou escreva manualmente.');return;}
    const validacao=validarRelatorioIA(false);if(validacao?.criticos?.length){if(!(await confirmarKineSys('O validador encontrou conteúdo potencialmente não sustentado pelos dados registrados. Deseja montar o documento mesmo assim para revisão?', {titulo:'Revisão necessária', confirmar:'Montar mesmo assim'})))return;}
    const lista=await obterPacientesSalvos(),p=lista.find(x=>x.id===pacienteId);
    const tipoDocumento=document.getElementById('rel_tipo_documento')?.value||'relatorio';
    const objetivo=tipoDocumento==='encaminhamento'?'avaliacao_medica':(document.getElementById('rel_objetivo')?.value||'geral');
    const corpo=renderizarTextoRelatorioEstruturado(texto);
    documentoAtualMeta={pacienteId,tipo:'relatorio_fisioterapeutico',titulo:'Relatório Fisioterapêutico',detalhes:{objetivo,origem:document.getElementById('rel_documento_oficial')?.dataset.origemDocumento||'manual'}};
    montarDocumentoComTimbrado(`${gerarCabecalhoRelatorioHTML(p,objetivo)}${corpo}${gerarRodapeAssinaturaHTML()}`);
}



/* ================= 1.6 — PRODUTIVIDADE, ALTA, RESTRIÇÕES, PENDÊNCIAS E AUDITORIA IA ================= */
function minutosEntreHoras(inicio,fim){if(!inicio||!fim)return null;const [hi,mi]=inicio.split(':').map(Number),[hf,mf]=fim.split(':').map(Number);const n=(hf*60+mf)-(hi*60+mi);return n>0?n:null;}
function atualizarDuracaoComparecimento(){const i=document.getElementById('rel_comp_entrada')?.value,f=document.getElementById('rel_comp_saida')?.value,el=document.getElementById('rel_comp_duracao');if(!el)return;const m=minutosEntreHoras(i,f);el.value=m==null?'':`${Math.floor(m/60)}h ${String(m%60).padStart(2,'0')}min`;}
document.addEventListener('change',e=>{if(['rel_comp_entrada','rel_comp_saida'].includes(e.target?.id))atualizarDuracaoComparecimento();});

function renderizarRestricoesPersistentesEvolucao(p){const box=document.getElementById('banner_restricoes_posop');if(!box)return;if(!p){box.style.display='none';box.innerHTML='';return;}const av=obterAvaliacaoFinalizadaMaisRecente(p)||obterAvaliacaoMaisRecente(p),r=av?.mapeamento?.clinicaEstruturada?.restricoesPosOperatorias;if(!r?.ativo){box.style.display='none';box.innerHTML='';return;}const carga={sem_carga:'Sem carga',toque:'Toque/contato',parcial:'Carga parcial',conforme_tolerado:'Carga conforme tolerado',total:'Carga total'}[r.statusCarga]||'Não informada';const itens=[r.procedimento&&`Procedimento: ${escapeHTML(r.procedimento)}`,`Carga: ${escapeHTML(carga)}`,r.ortese&&`Órtese: ${escapeHTML(r.ortese)}`,r.restricaoADM&&`ADM: ${escapeHTML(r.restricaoADM)}`,r.proibicoes&&`Proibições: ${escapeHTML(r.proibicoes)}`,r.retornoMedico&&`Retorno médico: ${escapeHTML(formatarDataBR(r.retornoMedico))}`].filter(Boolean);box.innerHTML=`<strong>⚠ Restrições pós-operatórias vigentes</strong><div class="kds-u-mt-5px kds-u-fs-label">${itens.join(' · ')}</div>`;box.style.display='block';}
function formatarDataBR(v){if(!v)return'';if(/^\d{4}-\d{2}-\d{2}$/.test(v)){const [a,m,d]=v.split('-');return `${d}/${m}/${a}`;}return v;}

async function duplicarUltimaEvolucao(){const id=obterPacienteIdEvolucaoAtivo();if(!id){alert('⚠️ Selecione um paciente.');return;}sincronizarSelectPacienteEvolucao(id);const lista=await obterPacientesSalvos(),p=lista.find(x=>String(x.id)===String(id)),e=(p?.evolucoes||[]).slice().sort((a,b)=>String(a.data||a.dataHoraISO||'').localeCompare(String(b.data||b.dataHoraISO||''))).pop();if(!p){alert('⚠️ O paciente selecionado não foi encontrado. Atualize o prontuário e tente novamente.');return;}if(!e){alert('Nenhuma sessão anterior para duplicar.');return;}const d=e.dadosEstruturados||{},r=d.respostaCarga||{};const radio=document.querySelector(`input[name="evo_estado"][value="${d.estadoClinico||'igual'}"]`);if(radio)radio.checked=true;document.getElementById('evo_relato').value=e.relatoLivre||'';document.getElementById('evo_mudancas').value='';[['evo_dor_durante',r.dorDurante],['evo_dor_24h',r.dor24h],['evo_rpe',r.rpe],['evo_duracao',r.duracaoMin],['evo_resposta_24h',r.resposta24h||''],['evo_edema',r.edema||'']].forEach(([campoId,v])=>{const el=document.getElementById(campoId);if(el)el.value=v??'';});['evo_nova_intercorrencia','evo_mudanca_medicacao','evo_novo_exame','evo_novo_alerta'].forEach(campoId=>{const el=document.getElementById(campoId);if(el)el.checked=false;});if(document.getElementById('eva_slider_evo')){document.getElementById('eva_slider_evo').value=e.eva??0;document.getElementById('eva_slider_evo').dispatchEvent(new Event('input'));}alert('⧉ Última sessão carregada como base. Revise parâmetros e conduta antes de salvar.');}

function renderizarLinhaTempoClinicaCompleta(p){const c=document.getElementById('linha_tempo_clinica_completa');if(!c)return;if(!p){c.innerHTML='<p class="kds-u-text-muted kds-u-fs-ui kds-u-ta-center">Selecione um paciente para visualizar a linha do tempo.</p>';return;}const ev=[];if(p.timestampCadastro||p.dataCadastro)ev.push({d:p.timestampCadastro?new Date(p.timestampCadastro).toISOString():p.dataCadastro,t:'cadastro',titulo:'Cadastro do paciente',desc:p.cadastradoPor?`Cadastrado por ${p.cadastradoPor}`:''});(obterAvaliacoes(p)||[]).forEach(a=>ev.push({d:obterRealizadoEmRegistro(a)||a.dataAvaliacao||'',t:'avaliacao',titulo:`${a.tipo||'Avaliação'} · ${a.status||'finalizada'}`,desc:`${profissionalRegistroClinico(a)} · salvo ${formatarDataHoraClinica(obterSalvoEmRegistro(a),true)} · EVA ${a.evaInicial??'N/I'}`}));(p.evolucoes||[]).forEach(e=>ev.push({d:obterRealizadoEmRegistro(e)||e.data||'',t:'evolucao',titulo:'Evolução fisioterapêutica',desc:`${profissionalRegistroClinico(e)} · salvo ${formatarDataHoraClinica(obterSalvoEmRegistro(e),true)} · EVA ${e.eva??'N/I'}${e.dadosEstruturados?.estadoClinico?' · '+e.dadosEstruturados.estadoClinico:''}`}));[...(p.documentos||[]),...obterDocumentosTimelineLocal(p.id),...(documentosTimelineNuvemCache.get(String(p.id))||[])].forEach(d=>ev.push({d:d.dataHoraISO||d.data_hora||'',t:'documento',titulo:d.titulo||'Documento',desc:d.emitidoPor||d.emitido_por?`Emitido por ${d.emitidoPor||d.emitido_por}`:''}));const ids=new Set();const eventosSemDuplicata=ev.filter(x=>{const chave=`${x.t}|${x.d}|${x.titulo}`;if(ids.has(chave))return false;ids.add(chave);return true;});eventosSemDuplicata.sort((a,b)=>String(b.d).localeCompare(String(a.d)));const icon={cadastro:'👤',avaliacao:'🩺',evolucao:'📈',documento:'📄'};c.innerHTML=eventosSemDuplicata.length?eventosSemDuplicata.map(x=>`<div class="kds-u-gtc-34px-125px-1fr kds-u-gap-10px kds-u-ai-start-2 kds-u-p-10px-0 kds-u-bb-1px-solid-edf1ef kds-u-d-grid"><div class="kds-u-fs-heading-sm">${icon[x.t]||'•'}</div><div class="kds-u-fs-meta kds-u-text-muted">${escapeHTML(formatarDataBR(String(x.d).slice(0,10)))}</div><div><strong class="kds-u-fs-label kds-u-text-petrol">${escapeHTML(x.titulo)}</strong><div class="kds-u-fs-meta kds-u-text-muted">${escapeHTML(x.desc||'')}</div></div></div>`).join(''):'<p>Nenhum evento registrado.</p>';}

async function renderizarPendenciasClinicas(){const c=document.getElementById('lista_pendencias_clinicas');if(!c)return;const lista=await obterPacientesSalvos();const hoje=Date.now(),itens=[];for(const p of lista){const avs=obterAvaliacoes(p),av=obterAvaliacaoFinalizadaMaisRecente(p);const ras=avs.find(a=>a.status==='rascunho');if(ras)itens.push({n:p.nome,p:'Avaliação em rascunho',nivel:'alto'});if(!av)itens.push({n:p.nome,p:'Sem avaliação clínica finalizada',nivel:'alto'});if(av){const clin=av.mapeamento?.clinicaEstruturada||{};if(!(clin.psfs?.itens||[]).length)itens.push({n:p.nome,p:'PSFS não registrada',nivel:'baixo'});const objs=clin.objetivosPlano?.objetivos||[];if(objs.some(o=>!['atingido','nao_atingido'].includes(o.status||'')))itens.push({n:p.nome,p:'Objetivos terapêuticos em acompanhamento',nivel:'baixo'});const ro=clin.restricoesPosOperatorias;if(ro?.ativo&&!ro.retornoMedico)itens.push({n:p.nome,p:'Pós-operatório com restrição ativa e retorno médico não informado',nivel:'medio'});}
const evs=(p.evolucoes||[]).slice().sort((a,b)=>String(a.data||a.dataHoraISO||'').localeCompare(String(b.data||b.dataHoraISO||'')));const ultima=evs.at(-1);if(ultima?.dadosEstruturados?.novoAlerta)itens.push({n:p.nome,p:'Última evolução registrou novo sinal de alerta',nivel:'alto'});if(ultima){const dt=new Date(ultima.dataHoraISO||ultima.data);if(Number.isFinite(dt.getTime())&&(hoje-dt.getTime())>14*864e5)itens.push({n:p.nome,p:'Sem evolução registrada há mais de 14 dias',nivel:'medio'});}}
c.innerHTML=itens.length?itens.slice(0,20).map(i=>`<div class="ks-pending-row ks-pending-row--${i.nivel==='alto'?'high':i.nivel==='medio'?'medium':'low'}"><strong>${escapeHTML(i.n)}</strong><span class="kds-u-fs-meta kds-u-text-muted"> — ${escapeHTML(i.p)}</span></div>`).join(''):'<p class="kds-u-text-success-dark kds-u-fs-ui">✓ Nenhuma pendência automática relevante encontrada.</p>';}

function extrairNumerosClinicos(texto){return (String(texto||'').match(/\b\d+(?:[.,]\d+)?\b/g)||[]).map(x=>x.replace(',','.'));}
function normalizarValidacao(t){return removerAcentos(String(t||'')).replace(/\s+/g,' ').trim();}
function validarRelatorioIA(mostrar=true){const campo=document.getElementById('rel_documento_oficial'),painel=document.getElementById('painel_validacao_ia');if(!campo)return null;const texto=campo.value.trim();const fonte=window.__kinesysUltimoContextoRelatorio||{};const base=JSON.stringify(fonte.contexto||{})+' '+String(fonte.rascunho||'');const numsBase=new Set(extrairNumerosClinicos(base));const numsTexto=[...new Set(extrairNumerosClinicos(texto))];const naoSustentados=numsTexto.filter(n=>!numsBase.has(n)&&!['1','2','3','4','5','6','7','8','9','10'].includes(n));const nt=normalizarValidacao(texto),nb=normalizarValidacao(base);const criticos=[];if(naoSustentados.length)criticos.push(`Valores numéricos não encontrados no contexto: ${naoSustentados.join(', ')}`);if(/diagnostico confirmado|confirmado o diagnostico|diagnostico definitivo/.test(nt)&&!/diagnostico confirmado|confirmado o diagnostico|diagnostico definitivo/.test(nb))criticos.push('Linguagem de diagnóstico confirmado não está sustentada pelo contexto.');if(/alta fisioterapeutica|recebe alta|alta do tratamento/.test(nt)&&!/alta fisioterapeutica|recebe alta|alta do tratamento/.test(nb))criticos.push('O texto declara alta sem registro correspondente na fonte.');const avisos=[];if(!fonte.contexto)avisos.push('Validação limitada: este texto não foi gerado nesta sessão ou o contexto original não está disponível.');const ok=!criticos.length;const result={ok,criticos,avisos};if(painel){painel.style.display='block';painel.innerHTML=`<strong>${ok?'✅ Validação local sem inconsistências óbvias':'⚠️ Revisão necessária'}</strong>${criticos.length?`<ul class="kds-u-m-8px-0-0-18px">${criticos.map(x=>`<li>${escapeHTML(x)}</li>`).join('')}</ul>`:''}${avisos.length?`<div class="kds-u-mt-8px kds-u-fs-meta kds-u-text-muted">${avisos.map(escapeHTML).join('<br>')}</div>`:''}<div class="kds-u-mt-8px kds-u-fs-meta kds-u-text-muted">Validador heurístico: compara números e afirmações críticas com os dados enviados ao relatório. A revisão profissional continua obrigatória.</div>`;}return result;}

// Marca internamente quando o texto gerado pela IA foi editado pelo profissional.
document.addEventListener('input',function(e){if(e.target?.id==='rel_documento_oficial'){const c=e.target;if(c.dataset.origemDocumento==='ia')c.dataset.origemDocumento='ia_editado';else if(!c.dataset.origemDocumento)c.dataset.origemDocumento='manual';}});


/* ===== v1.9 — Clinical Focus UI summaries ===== */
document.addEventListener('DOMContentLoaded', function(){
    atualizarFonteDadosCompacta();
    const configs = [
      ['grupo_yellow_flags', 'Fatores psicossociais'],
      ['grupo_exposicoes_ocupacionais', 'Exposição ocupacional'],
      ['grupo_exposicoes_esportivas', 'Carga esportiva']
    ];
    configs.forEach(([id]) => {
        const box = document.getElementById(id);
        if (!box) return;
        const details = box.closest('details');
        const small = details?.querySelector('summary small');
        const base = small?.textContent || '';
        const atualizar = () => {
            if (!small) return;
            const n = box.querySelectorAll('input[type="checkbox"]:checked').length;
            small.textContent = n ? `${n} selecionado${n>1?'s':''}` : base;
        };
        box.addEventListener('change', atualizar);
        atualizar();
    });
});

/* ========================================================================== 
   KINESYS v1.9.1 — CLUSTER FOCUS UI
   Interface progressiva: hipótese sugerida + resultado por select + diferenciais
   sob demanda + Safety Gate compacto. A lógica clínica/heurística permanece a mesma.
   ========================================================================== */

function abrirInfoMotorClinico(){
    const modal=document.getElementById('engine_info_modal'); if(modal) modal.hidden=false;
}
function fecharInfoMotorClinico(){
    const modal=document.getElementById('engine_info_modal'); if(modal) modal.hidden=true;
}

function rotuloResultadoTeste(valor){
    return ({
        '':'— Resultado —',
        positivo:'Positivo',
        negativo:'Negativo',
        inconclusivo:'Inconclusivo',
        nao_realizado:'Não realizado',
        nao_aplicavel:'Não aplicável'
    })[valor||''] || '— Resultado —';
}

function atualizarClasseSelectResultado(select){
    select.classList.remove('resultado-positivo','resultado-negativo','resultado-inconclusivo','resultado-nao_realizado','resultado-nao_aplicavel');
    if(select.value) select.classList.add('resultado-'+select.value);
}

function explicarContribuicoesHipotese(item, contexto, idRegiao, score){
    const entradas=[]; const texto=contexto.textoCombinado||'';
    const pistas=(item.palavrasChaveHMA||[]).filter(p=>correspondePistaClinica(texto,p)).slice(0,4);
    if(pistas.length)entradas.push(`<strong>Relato/padrão:</strong> ${pistas.map(escapeHTML).join(', ')}`);
    if((item.mecanismoPreferido||[]).includes(contexto.mecanismo)&&contexto.mecanismo)entradas.push(`<strong>Mecanismo:</strong> ${escapeHTML(contexto.mecanismo.replaceAll('_',' '))}`);
    const piora=(item.fatoresPioraRisco||[]).filter(f=>contexto.fatoresPiora.includes(f)); if(piora.length)entradas.push(`<strong>Fatores de piora:</strong> ${piora.map(x=>escapeHTML(x.replaceAll('_',' '))).join(', ')}`);
    const comorb=(item.comorbidadesRisco||[]).filter(c=>contexto.comorbidades[c]); if(comorb.length)entradas.push(`<strong>Antecedentes relevantes:</strong> ${comorb.map(x=>escapeHTML(x.replaceAll('_',' '))).join(', ')}`);
    const meds=(item.medicamentosRisco||[]).filter(m=>contexto.textoMedicamentos.includes(removerAcentos(m))); if(meds.length)entradas.push(`<strong>Medicamentos/contexto farmacológico:</strong> ${meds.map(escapeHTML).join(', ')}`);
    if(item.idadeFaixaBonus&&contexto.idade){const {min=0,max=200}=item.idadeFaixaBonus;if(contexto.idade>=min&&contexto.idade<=max)entradas.push(`<strong>Faixa etária:</strong> ${contexto.idade} anos`);}
    const temCirurgia=!!obterCirurgiaRelacionadaRegiao(idRegiao); if(temCirurgia&&(item.mecanismoPreferido||[]).includes('pos_cirurgico'))entradas.push('<strong>Histórico cirúrgico:</strong> procedimento compatível foi considerado no ranking');
    const contra=(item.palavrasChaveContra||[]).filter(p=>correspondePistaClinica(texto,p)).slice(0,2); if(contra.length)entradas.push(`<strong>Elementos que reduziram compatibilidade:</strong> ${contra.map(escapeHTML).join(', ')}`);

    const grupo=grupoDoItemKineSys(idRegiao,item), suf=calcularSuficienciaInvestigacaoKineSys(idRegiao,item,grupo), a=suf.analise;
    if(a.positivos||a.negativos)entradas.push(`<strong>Exame já registrado:</strong> ${a.positivos} favorável(is), ${a.negativos} contraditório(s); itens não avaliados/não realizados não contam como negativos.`);
    entradas.push(`<strong>Suficiência para a regra operacional:</strong> ${suf.percentual}% — mede cobertura dos dados necessários, não probabilidade diagnóstica.`);

    const candidatos=ordenarHipotesesRegiaoKineSys(idRegiao,contexto), atual=candidatos.find(c=>c.item.id===item.id&&c.grupo===grupo)||{item,grupo,score};
    const prox=proximosAchadosDiscriminativosKineSys(idRegiao,atual,candidatos);
    if(prox.length)entradas.push(`<strong>Próximos achados com maior utilidade para refinar/desempatar:</strong> ${prox.map(x=>escapeHTML(x.texto)).join(' · ')}`);
    if(!entradas.length)entradas.push('Nenhuma pista específica teve peso forte. O item permanece apenas como eixo de investigação até novos dados serem registrados.');
    return `<strong>O que influenciou esta sugestão</strong><br>${entradas.map(x=>'• '+x).join('<br>')}<br><span class="kds-u-opacity-p8">Índice interno de ordenação: ${escapeHTML(String(score))}. Serve apenas para organizar ferramentas opcionais; não representa probabilidade diagnóstica nem determina a direção clínica.</span>`;
}

function ordenarHipotesesRegiaoKineSys(idRegiao, contexto){
    const cls=ordenarClustersPorScore(idRegiao,contexto).map(c=>({...c,grupo:'cluster'}));
    const difs=ordenarDiferenciaisPorScore(idRegiao,contexto).map(d=>({...d,grupo:'diferencial'}));
    return [...cls,...difs].sort((a,b)=>b.score-a.score);
}
function chaveHipoteseKineSys(c){return c?`${c.grupo}::${c.item.id}`:'';}
function candidatoEscolhidoKineSys(candidatos,estado){
    const chave=estado.hipotesePrincipalAtiva||'';
    let escolhido=candidatos.find(c=>chaveHipoteseKineSys(c)===chave);
    if(!escolhido && estado.idClusterSuspeitaEscolhido) escolhido=candidatos.find(c=>c.grupo==='cluster'&&c.item.id===estado.idClusterSuspeitaEscolhido);
    return escolhido||candidatos[0]||null;
}

function construirCabecalhoHipotese(idRegiao, escolhido, candidatosOrdenados, estado, contexto){
    const wrap=document.createElement('div');
    const box=document.createElement('div'); box.className='cluster-hypothesis';
    const esquerda=document.createElement('div');
    esquerda.innerHTML=`<div class="label">Eixo de investigação sugerido</div><div class="name">${escapeHTML(escolhido.item.nome)}</div>`;
    const direita=document.createElement('div'); direita.className='cluster-compat';
    const rot=rotuloCompatibilidade(escolhido.score);
    direita.innerHTML=`<span class="${rot.classe}">${escapeHTML(rot.texto)}</span>`;
    const info=document.createElement('button'); info.type='button'; info.className='hypothesis-info-btn'; info.textContent='i'; info.title='Ver o que influenciou esta sugestão';
    direita.appendChild(info); box.append(esquerda,direita); wrap.appendChild(box);
    const pop=document.createElement('div'); pop.className='hypothesis-popover'; pop.innerHTML=explicarContribuicoesHipotese(escolhido.item,contexto,idRegiao,escolhido.score); wrap.appendChild(pop);
    info.addEventListener('click',()=>pop.classList.toggle('open'));

    if(candidatosOrdenados.length>1){
        const linha=document.createElement('div'); linha.classList.add('kds-u-d-flex', 'kds-u-ai-center', 'kds-u-gap-8px', 'kds-u-m-3px-0-12px', 'kds-u-wrap-wrap');
        const lab=document.createElement('span'); lab.textContent='Investigar outro eixo:'; lab.classList.add('kds-u-fs-meta', 'kds-u-text-muted');
        const sel=document.createElement('select'); sel.className='seletor-suspeita';
        candidatosOrdenados.forEach(c=>{const o=document.createElement('option');o.value=chaveHipoteseKineSys(c);o.textContent=c.item.nome+(c.grupo==='diferencial'?' · diferencial':'');if(chaveHipoteseKineSys(c)===chaveHipoteseKineSys(escolhido))o.selected=true;sel.appendChild(o);});
        sel.addEventListener('change',()=>{
            estado.hipotesePrincipalAtiva=sel.value;
            const [grupo,id]=sel.value.split('::');
            estado.idClusterSuspeitaEscolhido=grupo==='cluster'?id:null;
            estado.diferencialAtivo=null;
            renderizarMapeamentoRegioes();agendarAutosaveKineSys();
        });
        linha.append(lab,sel); wrap.appendChild(linha);
    }
    return wrap;
}

function construirCardTestes(idRegiao,item,status,grupo){
    const div=document.createElement('div'); div.className='cluster-card '+(status==='positivo'?'status-positivo':status==='negativo'?'status-negativo':status==='inconclusivo'?'status-inconclusivo':'');
    const h4=document.createElement('h4'); h4.textContent=item.nome; div.appendChild(h4);
    const sub=document.createElement('div'); sub.className='cluster-sub';
    const metaRegra=obterMetaCriteriosKineSys(item,grupo); sub.textContent=`Regra operacional: ${metaRegra.minimo} achado(s) favorável(is)${metaRegra.essenciais.length?' + critério(s) essencial(is) quando aplicável':''}. Itens não avaliados, não realizados ou inconclusivos permanecem neutros.`; div.appendChild(sub);
    if(item.evidencia){const ref=document.createElement('div');ref.className='base-evidencia';ref.textContent='Base clínica: '+item.evidencia;div.appendChild(ref);}
    const estado=obterEstadoRegiao(idRegiao);
    item.testes.forEach((teste,i)=>{
        const chave=`${grupo}::${item.id}::${i}`, atual=estado.resultados[chave]||'';
        const linha=document.createElement('div'); linha.className='teste-linha';
        const span=document.createElement('span'); span.textContent=teste;
        const select=document.createElement('select'); select.className='teste-resultado-select'; select.dataset.regiao=idRegiao;select.dataset.grupo=grupo;select.dataset.item=item.id;select.dataset.indice=i;
        [['','— Resultado —'],['positivo','Positivo'],['negativo','Negativo'],['inconclusivo','Inconclusivo'],['nao_realizado','Não realizado'],['nao_aplicavel','Não aplicável']].forEach(([v,t])=>{const o=document.createElement('option');o.value=v;o.textContent=t;if(v===atual)o.selected=true;select.appendChild(o);});
        atualizarClasseSelectResultado(select);
        select.addEventListener('change',()=>{
            if(select.value) estado.resultados[chave]=select.value; else delete estado.resultados[chave];
            atualizarClasseSelectResultado(select); agendarAutosaveKineSys(); renderizarMapeamentoRegioes();
        });
        linha.append(span,select); div.appendChild(linha);
    });
    const ver=document.createElement('div'); ver.className='cluster-veredito '+status;
    ver.textContent=status==='positivo'?'✓ Achados compatíveis com este eixo; não estabelece diagnóstico.':status==='negativo'?'Achados preenchidos não atingem a regra operacional deste eixo.':status==='inconclusivo'?'Resultado inconclusivo com os dados registrados.':'Complete apenas os achados pertinentes.';
    div.appendChild(ver); return div;
}

function candidatosDiferenciaisKineSys(idRegiao, candidatosOrdenados, contexto, estado, semPrincipal=false){
    const escolhido=semPrincipal?null:candidatoEscolhidoKineSys(candidatosOrdenados,estado);
    const chavePrincipal=escolhido?chaveHipoteseKineSys(escolhido):'';
    return candidatosOrdenados.filter(c=>chaveHipoteseKineSys(c)!==chavePrincipal);
}

function construirSecaoDiferenciais(idRegiao, candidatosOrdenados, contexto, estado, abrirPorPadrao=false, semPrincipal=false){
    const candidatos=candidatosDiferenciaisKineSys(idRegiao,candidatosOrdenados,contexto,estado,semPrincipal);
    if(!candidatos.length) return null;
    const sec=document.createElement('div'); sec.className='differential-section';
    const head=document.createElement('div');head.className='differential-heading';
    const title=document.createElement('strong'); title.textContent=semPrincipal?'Eixos possíveis para investigar':'Eixos alternativos para investigar';
    const toggle=document.createElement('button');toggle.type='button';toggle.className='cluster-info-link';
    const aberto=!!estado.diferenciaisAbertos || abrirPorPadrao || semPrincipal;
    toggle.textContent=aberto?'Ocultar':'Ver diferenciais'; head.append(title,toggle); sec.appendChild(head);
    const body=document.createElement('div'); body.style.display=aberto?'block':'none';
    const list=document.createElement('div');list.className='differential-list';
    candidatos.slice(0,10).forEach(c=>{
        const row=document.createElement('div');row.className='differential-row';
        const n=document.createElement('div');n.className='dif-name';n.textContent=c.item.nome;
        const rot=rotuloCompatibilidade(c.score); const comp=document.createElement('div');comp.className='dif-compat '+rot.classe;comp.textContent=rot.texto;
        const btn=document.createElement('button');btn.type='button';btn.textContent=(estado.diferencialAtivo===chaveHipoteseKineSys(c))?'Aberto':'Investigar';
        btn.addEventListener('click',()=>{estado.diferencialAtivo=(estado.diferencialAtivo===chaveHipoteseKineSys(c))?null:chaveHipoteseKineSys(c);estado.diferenciaisAbertos=true;renderizarMapeamentoRegioes();});
        row.append(n,comp,btn);list.appendChild(row);
    });
    body.appendChild(list);
    const ativo=candidatos.find(c=>estado.diferencialAtivo===chaveHipoteseKineSys(c));
    if(ativo){
        const box=document.createElement('div');box.className='differential-active';
        const st=ativo.grupo==='cluster'?avaliarCluster(idRegiao,ativo.item):avaliarDiferencial(idRegiao,ativo.item);
        box.appendChild(construirCardTestes(idRegiao,ativo.item,st,ativo.grupo)); body.appendChild(box);
    }
    sec.appendChild(body);
    toggle.addEventListener('click',()=>{estado.diferenciaisAbertos=!aberto;renderizarMapeamentoRegioes();});
    return sec;
}

function construirSafetyCompacto(idRegiao,regiao,estado,contexto){
    const alerts=alertasTextuaisParaRegiaoKineSys(contexto,idRegiao);
    const marcadas=(regiao.redFlags||[]).filter((_,i)=>estado.resultados['redflag::'+i]);
    const alerta=alerts.length>0||marcadas.length>0;
    const details=document.createElement('details');details.className='safety-compact'+(alerta?' alerta':'');
    details.open=alerta;
    const summary=document.createElement('summary');
    const status=alerta?`🔴 Segurança — ${alerts.length+marcadas.length} alerta(s) para revisar`:estado.redflagsRevisadas?'✓ Segurança revisada — sem sinais selecionados':'🛡 Segurança — revisar';
    summary.innerHTML=`<span>${status}</span><span class="kds-u-fs-meta kds-u-opacity-p7">${alerta?'aberto automaticamente':'clique para revisar'}</span>`;
    const body=document.createElement('div');body.className='safety-body';body.appendChild(construirBlocoRedFlags(idRegiao,regiao,alerta));
    details.append(summary,body);return details;
}

function construirNotaTopologiaKineSys(idRegiao, contexto){
    const top=contexto.topologia||{}; const papel=top.papel?.[idRegiao]||'';
    if(!papel) return null;
    const pares=(top.pares||[]).filter(p=>p.destino===idRegiao||p.origem===idRegiao);
    let texto='';
    if(papel==='destino'){
        const origens=[...new Set(pares.filter(p=>p.destino===idRegiao).map(p=>BANCO_MAPEAMENTO_CLINICO[p.origem]?.nome||p.origem))];
        texto=`Esta região aparece principalmente como destino do trajeto descrito${origens.length?` a partir de ${origens.join(', ')}`:''}. Não presuma lesão local apenas porque a dor chega aqui; confirme se o exame local reproduz a queixa familiar e compare com a modulação pela região de origem.`;
    } else if(papel==='origem'){
        texto='Esta região aparece como origem do trajeto informado. O motor dará mais peso ao comportamento dos sintomas a partir daqui do que à simples presença de dor nas regiões de destino.';
    } else if(papel==='misto'){
        texto='Esta região aparece tanto como local sintomático quanto em um trajeto de irradiação. Diferencie achado local de dor referida antes de assumir uma única fonte.';
    }
    if(idRegiao==='cefaleia') texto='Cefaleia é tratada aqui como um eixo de triagem, não como uma origem musculoesquelética presumida. Primeiro revise segurança; depois teste causalidade cervical, causalidade relacionada à DTM e fenótipos primários como diferenciais.';
    if(!texto) return null;
    const div=document.createElement('div'); div.className='kinesys-route-note'; div.textContent=texto; return div;
}

function renderizarPainelIntegracaoMultirregional(contexto=coletarContextoClinico()){
    const box=document.getElementById('painel_integracao_multirregional'); if(!box)return;
    const top=contexto.topologia||{},presentes=new Set([...(top.diretas||[]),...(top.origens||[]),...(top.destinos||[])]);
    const relevantes=['cefaleia','cervical','atm','ombro'].filter(x=>presentes.has(x));
    if(relevantes.length<2){box.style.display='none';box.innerHTML='';return;}
    const temCab=presentes.has('cefaleia'),temCerv=presentes.has('cervical'),temAtm=presentes.has('atm'),temOmbro=presentes.has('ombro'),eixos=[];
    if(temCab)eixos.push({t:'Cefaleia',d:'Segurança e padrão clínico.'});
    if(temCab&&temCerv)eixos.push({t:'Cervical',d:'Reprodução ou modulação da cefaleia pelo exame cervical.'});
    if(temCab&&temAtm)eixos.push({t:'ATM',d:'Relação com mastigação, abertura, apertamento e palpação.'});
    if(temCerv&&temOmbro)eixos.push({t:'Ombro / cervical',d:'Diferenciar componente local de dor referida.'});
    if(temAtm&&temCerv&&!temCab)eixos.push({t:'Cervical / orofacial',d:'Comparar qual exame reproduz a queixa familiar.'});
    box.style.display='block';
    box.innerHTML=`<div class="integration-head"><strong>Integração multirregional</strong></div><div class="integration-grid">${eixos.map(x=>`<div class="integration-axis"><strong>${escapeHTML(x.t)}</strong>${escapeHTML(x.d)}</div>`).join('')}</div>`;
}

function statusHipoteseKineSys(idRegiao,candidato){
    if(!candidato)return'pendente';
    return candidato.grupo==='cluster'?avaliarCluster(idRegiao,candidato.item):avaliarDiferencial(idRegiao,candidato.item);
}

function haHipotesePositivaKineSys(idRegiao,candidatos){
    return (candidatos||[]).some(c=>statusHipoteseKineSys(idRegiao,c)==='positivo');
}

function registrarIncertezaClinicaKineSys(idRegiao,motivo='sem_hipotese_compativel'){
    const estado=obterEstadoRegiao(idRegiao);
    estado.incertezaClinicaAceita=true;
    estado.incertezaClinicaMotivo=motivo;
    estado.incertezaClinicaDataISO=new Date().toISOString();
    estado.hipotesePrincipalAtiva=null;
    estado.idClusterSuspeitaEscolhido=null;
    estado.diferencialAtivo=null;
    agendarAutosaveKineSys();
}

function reabrirInvestigacaoKineSys(idRegiao){
    const estado=obterEstadoRegiao(idRegiao);
    estado.incertezaClinicaAceita=false;
    estado.incertezaClinicaMotivo='';
    estado.incertezaClinicaDataISO='';
    renderizarMapeamentoRegioes();
    agendarAutosaveKineSys();
}

function construirSaidaSemHipoteseKineSys(idRegiao,estado,{titulo='Nenhum eixo selecionado',texto='Os achados registrados não sustentam um eixo operacional neste momento.'}={}){
    const box=document.createElement('div');box.className='kinesys-uncertainty-exit';
    const copy=document.createElement('div');
    copy.innerHTML=`<strong>${escapeHTML(titulo)}</strong><span>${escapeHTML(texto)}</span>`;
    const acoes=document.createElement('div');acoes.className='kinesys-uncertainty-actions';
    const btn=document.createElement('button');btn.type='button';btn.className='btn-primary';btn.textContent='Continuar com investigação em aberto ➔';
    btn.addEventListener('click',()=>{registrarIncertezaClinicaKineSys(idRegiao,'encerramento_sem_hipotese');avancarParaDiagnostico();});
    acoes.appendChild(btn);box.append(copy,acoes);return box;
}

function construirStatusIncertezaKineSys(idRegiao,estado){
    const box=document.createElement('div');box.className='kinesys-uncertainty-accepted';
    const copy=document.createElement('div');copy.innerHTML='<strong>Região sem eixo operacional</strong><span>Incerteza clínica registrada.</span>';
    const btn=document.createElement('button');btn.type='button';btn.className='btn-secondary';btn.textContent='Reabrir investigação';btn.addEventListener('click',()=>reabrirInvestigacaoKineSys(idRegiao));
    box.append(copy,btn);return box;
}

function construirCardRegiao(idRegiao, contexto){
    const regiao=BANCO_MAPEAMENTO_CLINICO[idRegiao], estado=obterEstadoRegiao(idRegiao);
    if(estado.fase==='diferencial') estado.fase='suspeita';
    const card=document.createElement('section'); card.className='cluster-region-card';
    const header=document.createElement('div');header.className='cluster-region-header';header.innerHTML=`<h2>${escapeHTML(regiao.nome)}</h2>`;card.appendChild(header);

    if(mapeamentoAvaliacaoAnterior?.detalhes?.[idRegiao]){
        const resumo=(mapeamentoAvaliacaoAnterior.resumoPorRegiao||[]).find(r=>r.regiao===regiao.nome);
        const b=document.createElement('div');b.classList.add('kds-u-fs-meta', 'kds-u-text-416b7a', 'kds-u-m-4px-0-10px');b.textContent=`Última avaliação (${mapeamentoAvaliacaoAnterior.data}): ${resumo?resumo.hipotese:'resultados prévios disponíveis.'}`;card.appendChild(b);
    }
    const notaTopologia=construirNotaTopologiaKineSys(idRegiao,contexto); if(notaTopologia)card.appendChild(notaTopologia);
    const cirurgia=obterCirurgiaRelacionadaRegiao(idRegiao);
    if(cirurgia){const a=document.createElement('div');a.className='clinical-warning';a.textContent=`Procedimento relatado nesta região: “${cirurgia}”. A compatibilidade específica do procedimento é considerada no ranking.`;card.appendChild(a);}

    const candidatos=ordenarHipotesesRegiaoKineSys(idRegiao,contexto);
    if(!candidatos.length){
        card.insertAdjacentHTML('beforeend','<p class="helper-text">Nenhum eixo cadastrado para esta região.</p>');
        if(estado.incertezaClinicaAceita)card.appendChild(construirStatusIncertezaKineSys(idRegiao,estado));
        else card.appendChild(construirSaidaSemHipoteseKineSys(idRegiao,estado,{titulo:'Região sem eixo cadastrado',texto:'Não há uma condição operacional disponível para esta região no banco atual.'}));
        card.appendChild(construirSafetyCompacto(idRegiao,regiao,estado,contexto));return card;
    }
    const escolhido=candidatoEscolhidoKineSys(candidatos,estado);
    const escolhaManual=!!estado.hipotesePrincipalAtiva||!!estado.idClusterSuspeitaEscolhido;
    const semPrioridade=!escolhaManual && (!escolhido || escolhido.score<1);

    if(estado.incertezaClinicaAceita){
        card.appendChild(construirStatusIncertezaKineSys(idRegiao,estado));
    }else if(semPrioridade){
        const fen=inferirFenotipoOperacionalKineSys(idRegiao,contexto);
        const vazio=document.createElement('div');vazio.className='kinesys-no-priority';
        vazio.innerHTML=fen?`<strong>Padrão operacional: ${escapeHTML(fen.nome)}</strong>${escapeHTML(fen.texto)} A condição específica permanece aberta até novos achados.`:'<strong>Ainda sem eixo priorizado</strong>A região foi identificada no relato, mas faltam pistas discriminativas para escolher uma direção específica com segurança.';
        card.appendChild(vazio);
        const sec=construirSecaoDiferenciais(idRegiao,candidatos,contexto,estado,true,true);if(sec)card.appendChild(sec);
        if(!fen)card.appendChild(construirSaidaSemHipoteseKineSys(idRegiao,estado,{titulo:'Incerteza clínica aceitável',texto:'Nenhuma condição alcançou compatibilidade suficiente a partir dos dados atuais.'}));
    }else if(escolhido){
        card.appendChild(construirCabecalhoHipotese(idRegiao,escolhido,candidatos,estado,contexto));
        const status=statusHipoteseKineSys(idRegiao,escolhido);
        card.appendChild(construirCardTestes(idRegiao,escolhido.item,status,escolhido.grupo));
        const dif=construirSecaoDiferenciais(idRegiao,candidatos,contexto,estado,status==='negativo',false); if(dif)card.appendChild(dif);
        if(!haHipotesePositivaKineSys(idRegiao,candidatos) && (status==='negativo'||status==='inconclusivo')){
            const fen=inferirFenotipoOperacionalKineSys(idRegiao,contexto);
            if(fen){
                const box=document.createElement('div');box.className='kinesys-no-priority';box.innerHTML=`<strong>Direção por padrão operacional: ${escapeHTML(fen.nome)}</strong>${escapeHTML(fen.texto)} A condição específica testada não foi sustentada, mas o fluxo clínico permanece orientado pelo padrão.`;card.appendChild(box);
            }else card.appendChild(construirSaidaSemHipoteseKineSys(idRegiao,estado,{titulo:status==='negativo'?'Eixo principal não sustentado':'Resultado inconclusivo',texto:status==='negativo'?'Os achados preenchidos não sustentaram o eixo investigado.':'Os achados atuais não permitem sustentar nem afastar o eixo investigado.'}));
        }
    }
    card.appendChild(construirSafetyCompacto(idRegiao,regiao,estado,contexto));
    return card;
}

function renderizarMapeamentoRegioes(){
    const container=document.getElementById('container_clusters_regioes');if(!container)return;
    const contexto=coletarContextoClinico(); renderizarPainelIntegracaoMultirregional(contexto);
    const regioes=Array.from(document.querySelectorAll('#grupo_regioes_mapeamento input:checked')).map(i=>i.dataset.regiao);
    if(!regioes.length){container.innerHTML='<div class="kds-u-ta-center kds-u-text-muted kds-u-fs-meta kds-u-p-24px-10px">Selecione uma região acima para iniciar a investigação.</div>';return;}
    container.innerHTML='';regioes.forEach(id=>container.appendChild(construirCardRegiao(id,contexto)));
}



/* ========================================================================== 
   KINESYS v1.10 — KINESYS LOCAL / FOTOS CLÍNICAS
   Originais permanecem no Windows; Supabase recebe apenas metadados.
   ========================================================================== */
const KINESYS_LOCAL_URL = 'http://127.0.0.1:8765';
let kinesysLocalOnline = false;
let kinesysLocalStatus = null;
let midiasPacienteAtual = [];
let midiaComparacaoA = null;
let midiaComparacaoB = null;
let midiaPollTimer = null;
let midiaUltimaQuantidadeLocal = 0;
let midiaTabelaSupabaseDisponivel = true;

async function kinesysLocalFetch(path, options = {}, timeoutMs = 2200) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const headers = { ...(options.headers || {}) };
        if (options.body && typeof options.body !== 'string' && !(options.body instanceof Blob)) {
            headers['Content-Type'] = headers['Content-Type'] || 'application/json';
            options.body = JSON.stringify(options.body);
        }
        const resp = await fetch(KINESYS_LOCAL_URL + path, { ...options, headers, signal: controller.signal, cache: 'no-store' });
        const text = await resp.text();
        let data = null;
        try { data = text ? JSON.parse(text) : {}; } catch (_) { data = { raw: text }; }
        if (!resp.ok) throw new Error(data?.error || `KineSys Local respondeu ${resp.status}`);
        return data;
    } finally { clearTimeout(timer); }
}

function definirStatusKinesysLocal(online, texto) {
    kinesysLocalOnline = !!online;
    const box = document.getElementById('midia_status_local');
    if (!box) return;
    box.classList.toggle('online', !!online);
    box.classList.toggle('offline', !online);
    box.innerHTML = `<span class="midia-dot"></span>${escapeHTML(texto || (online ? 'KineSys Local conectado' : 'Serviço local não detectado'))}`;
}

async function verificarKinesysLocal(mostrarErro = false) {
    try {
        const st = await kinesysLocalFetch('/api/local-status', { method: 'GET' });
        kinesysLocalStatus = st;
        definirStatusKinesysLocal(true, 'KineSys Local conectado');
        const info = document.getElementById('midia_local_info');
        if (info) info.style.display = 'grid';
        const url = document.getElementById('midia_iphone_url'); if (url) url.textContent = st.iphone_url || '—';
        const code = document.getElementById('midia_pair_code'); if (code) code.textContent = st.pair_code || '—';
        const root = document.getElementById('midia_data_root'); if (root) root.textContent = st.data_root || '—';
        const backup = document.getElementById('midia_backup_resumo'); if (backup) backup.textContent = st.backup_root || 'Não configurado';
        const backupInput = document.getElementById('midia_backup_path'); if (backupInput && !backupInput.matches(':focus')) backupInput.value = st.backup_root || '';
        return st;
    } catch (err) {
        kinesysLocalStatus = null;
        definirStatusKinesysLocal(false, 'Serviço local não detectado');
        const info = document.getElementById('midia_local_info'); if (info) info.style.display = 'none';
        if (mostrarErro) alert('⚠️ O KineSys Local não está em execução neste Windows.\n\nAbra a pasta Windows_Local e execute "INICIAR_KINESYS_LOCAL.bat". Na primeira instalação, use "INSTALAR_KINESYS_LOCAL_ADMIN.bat".');
        return null;
    }
}

function perfilEhSecretaria() { return String(usuarioLogado?.tipo || '').toUpperCase() === 'SECRETARIA'; }
function tiposMidiaPermitidosParaPerfil() {
    if (perfilEhSecretaria()) return ['termo','identificacao','guia','exame','documento','outro_admin'];
    return ['avaliacao','evolucao','postura','ferida','edema','exame','termo','identificacao','guia','documento','outro','outro_admin'];
}
function configurarMidiasPorPerfil() {
    const secretaria = perfilEhSecretaria();
    const aviso = document.getElementById('midia_perfil_aviso');
    if (aviso) {
        aviso.style.display = 'block';
        aviso.className = 'midia-role-note ' + (secretaria ? 'administrativo' : 'clinico');
        aviso.textContent = secretaria
            ? 'Acesso administrativo: termos, identificação, guias, exames/laudos recebidos e documentos. Fotografias clínicas de avaliação/evolução permanecem restritas à equipe clínica.'
            : 'Acesso clínico: fotografias clínicas e documentos administrativos vinculados ao prontuário.';
    }
    const filtro = document.getElementById('midia_filtro_tipo');
    if (filtro) Array.from(filtro.options).forEach(opt => {
        if (!opt.value) { opt.hidden = false; opt.disabled = false; return; }
        const permitido = tiposMidiaPermitidosParaPerfil().includes(opt.value);
        opt.hidden = !permitido; opt.disabled = !permitido;
        if (!permitido && filtro.value === opt.value) filtro.value = '';
    });
    const btnComparar = document.getElementById('midia_btn_comparar');
    if (btnComparar) btnComparar.style.display = secretaria ? 'none' : 'inline-flex';
    const titulo = document.getElementById('midia_galeria_titulo');
    if (titulo) titulo.textContent = secretaria ? 'Documentos administrativos' : 'Galeria clínica e documental';
    const captura = document.getElementById('btn_captura_iphone');
    if (captura) captura.textContent = secretaria ? 'Digitalizar documento com iPhone' : 'Capturar com iPhone';
}

function obterPacienteIdMidiasAtivo() {
    const selecionado = String(document.getElementById('midia_paciente_select')?.value || '').trim();
    if (selecionado) return selecionado;
    let contexto = '';
    try { contexto = String(localStorage.getItem('kinesys_paciente_contexto') || '').trim(); } catch (_) { contexto = ''; }
    return contexto || String(pacienteAtualId || '').trim();
}

async function popularSelectMidiasPaciente(preSelecionado = '') {
    const select = document.getElementById('midia_paciente_select');
    if (!select) return;
    const lista = await obterPacientesSalvos();
    select.innerHTML = '<option value="">-- Selecione um paciente --</option>' + lista
        .slice().sort((a,b)=>String(a.nome||'').localeCompare(String(b.nome||''),'pt-BR'))
        .map(p => `<option value="${escapeHTML(p.id)}">${escapeHTML(p.nome)}${p.cpf ? ' · '+escapeHTML(p.cpf) : ''}</option>`).join('');
    const alvo = String(preSelecionado || '').trim();
    if (alvo && lista.some(p=>String(p.id)===alvo)) select.value = alvo;
}

async function sincronizarPacienteMidias(dispararChange = false) {
    const alvo = obterPacienteIdMidiasAtivo();
    const select = document.getElementById('midia_paciente_select');
    if (!alvo || !select) return alvo;

    let existe = [...select.options].some(o => String(o.value) === String(alvo));
    if (!existe) {
        await popularSelectMidiasPaciente(alvo);
        existe = [...select.options].some(o => String(o.value) === String(alvo));
    }
    if (existe && String(select.value) !== String(alvo)) {
        select.value = String(alvo);
        if (dispararChange) select.dispatchEvent(new Event('change', { bubbles:true }));
    }
    return existe ? String(alvo) : '';
}

async function abrirMidiasPaciente(pacienteId = '') {
    navegarPara('tela_midias');
    configurarMidiasPorPerfil();
    let contexto = '';
    try { contexto = String(localStorage.getItem('kinesys_paciente_contexto') || '').trim(); } catch (_) { contexto = ''; }
    const alvo = String(pacienteId || contexto || pacienteAtualId || '').trim();
    await popularSelectMidiasPaciente(alvo);
    await sincronizarPacienteMidias(false);
    await verificarKinesysLocal(false);
    const pacienteAtivo = obterPacienteIdMidiasAtivo();
    if (pacienteAtivo) await carregarMidiasPacienteSelecionado();
    else {
        const gal = document.getElementById('midia_galeria');
        if (gal) gal.innerHTML = '<p class="midia-empty">Selecione um paciente para visualizar os registros.</p>';
    }
}

async function carregarMidiasPacienteSelecionado() {
    midiaComparacaoA = null; midiaComparacaoB = null;
    atualizarPainelComparacao();
    await atualizarGaleriaMidias(true);
}

async function iniciarCapturaComIPhone() {
    const pacienteId = await sincronizarPacienteMidias(false);
    if (!pacienteId) { alert('⚠️ Selecione o paciente antes de iniciar a captura.'); return; }
    const st = await verificarKinesysLocal(true); if (!st) return;
    const lista = await obterPacientesSalvos();
    const p = lista.find(x=>String(x.id)===String(pacienteId)); if (!p) { alert('Paciente não encontrado.'); return; }
    try {
        const r = await kinesysLocalFetch('/api/session', {
            method:'POST',
            body:{ patient_id:p.id, patient_name:p.nome, started_by:usuarioLogado?.nome || 'Profissional não identificado', started_role:usuarioLogado?.tipo || '', allowed_types:tiposMidiaPermitidosParaPerfil() }
        });
        const msg = document.getElementById('midia_capture_status');
        if (msg) msg.innerHTML = `Aguardando foto do iPhone para <strong>${escapeHTML(p.nome)}</strong>…`;
        midiaUltimaQuantidadeLocal = (await obterMidiasLocais(p.id)).length;
        iniciarPollingMidias();
    } catch (err) { alert('❌ Não foi possível iniciar a captura pelo iPhone.\n\n'+err.message); }
}

function versaoKinesysLocalNumero(v) {
    const p=String(v||'0').split('.').map(x=>parseInt(x,10)||0);
    return (p[0]||0)*10000+(p[1]||0)*100+(p[2]||0);
}

async function abrirSeletorImportacaoComputador() {
    const pacienteId=await sincronizarPacienteMidias(false);
    if(!pacienteId){alert('⚠️ Selecione o paciente antes de importar um documento.');return;}
    const st=await verificarKinesysLocal(true); if(!st)return;
    if(versaoKinesysLocalNumero(st.version)<11002){
        alert('⚠️ O KineSys Local deste computador precisa ser atualizado para importar documentos.\n\nNa pasta Windows_Local desta versão, execute novamente INSTALAR_KINESYS_LOCAL_ADMIN.bat e depois reabra o KineSys.');
        return;
    }
    const input=document.getElementById('midia_import_input');
    if(!input)return;
    input.value='';
    input.click();
}

async function importarDocumentosComputador(input) {
    const arquivos=Array.from(input?.files||[]);
    if(!arquivos.length)return;
    const pacienteId=await sincronizarPacienteMidias(false);
    if(!pacienteId){input.value='';alert('⚠️ Selecione o paciente antes de importar.');return;}
    const lista=await obterPacientesSalvos();
    const p=lista.find(x=>String(x.id)===String(pacienteId));
    if(!p){input.value='';alert('Paciente não encontrado.');return;}
    const tipo=document.getElementById('midia_import_tipo')?.value||'documento';
    const tiposPermitidos=['documento','exame','termo','identificacao','guia','outro_admin'];
    if(!tiposPermitidos.includes(tipo)){input.value='';alert('Tipo de documento inválido.');return;}
    if(arquivos.length>20){input.value='';alert('⚠️ Importe no máximo 20 arquivos por vez.');return;}
    const extOk=/\.(pdf|jpe?g|png|webp|tiff?|bmp|docx?|xlsx?|txt|rtf)$/i;
    const invalidos=arquivos.filter(f=>!extOk.test(f.name)||f.size<=0||f.size>50*1024*1024);
    if(invalidos.length){
        input.value='';
        alert('⚠️ Há arquivo vazio, maior que 50 MB ou em formato não suportado:\n\n'+invalidos.map(f=>'• '+f.name).join('\n')+'\n\nUse PDF, JPG, PNG, WEBP, TIFF, BMP, DOC/DOCX, XLS/XLSX, TXT ou RTF.');
        return;
    }
    const btn=document.getElementById('btn_importar_documento_pc');
    const msg=document.getElementById('midia_capture_status');
    if(btn)btn.disabled=true;
    let ok=0; const falhas=[];
    try{
        for(let i=0;i<arquivos.length;i++){
            const f=arquivos[i];
            if(msg)msg.textContent=`Importando ${i+1} de ${arquivos.length}: ${f.name}…`;
            const qs=new URLSearchParams({
                patient_id:String(p.id), patient_name:p.nome||'', type:tipo,
                original_name:f.name, mime_type:f.type||'application/octet-stream',
                imported_by:usuarioLogado?.nome||'Usuário não identificado'
            });
            try{
                await kinesysLocalFetch('/api/import-document?'+qs.toString(),{
                    method:'POST', headers:{'Content-Type':f.type||'application/octet-stream'}, body:f
                },120000);
                ok++;
            }catch(err){falhas.push(`${f.name}: ${err.message||'falha no envio'}`);}
        }
        await atualizarGaleriaMidias(true);
        if(msg)msg.textContent=falhas.length?`✓ ${ok} arquivo(s) importado(s); ${falhas.length} falha(s).`:`✓ ${ok} arquivo(s) importado(s) e vinculado(s) ao prontuário.`;
        if(falhas.length)alert('Alguns arquivos não puderam ser importados:\n\n'+falhas.join('\n'));
    } finally {
        if(btn)btn.disabled=false;
        input.value='';
    }
}

function iniciarPollingMidias() {
    if (midiaPollTimer) clearInterval(midiaPollTimer);
    midiaPollTimer = setInterval(async()=>{
        const id=await sincronizarPacienteMidias(false); if(!id) return;
        try {
            const locais=await obterMidiasLocais(id);
            if (locais.length > midiaUltimaQuantidadeLocal) {
                midiaUltimaQuantidadeLocal = locais.length;
                const msg=document.getElementById('midia_capture_status'); if(msg) msg.textContent='✓ Foto recebida e vinculada ao prontuário.';
                await atualizarGaleriaMidias(true);
            }
        } catch(_){}
    },1800);
}

async function obterMidiasLocais(pacienteId) {
    if (!pacienteId) return [];
    try {
        const data = await kinesysLocalFetch('/api/uploads?patient_id=' + encodeURIComponent(pacienteId), {method:'GET'}, 3000);
        return Array.isArray(data?.items) ? data.items : [];
    } catch (_) { return []; }
}

async function obterMidiasSupabase(pacienteId) {
    if (!_supabase || !pacienteId || !midiaTabelaSupabaseDisponivel) return [];
    try {
        const {data,error}=await _supabase.from('arquivos_paciente').select('*').eq('paciente_id',pacienteId).order('data_hora',{ascending:false});
        if(error) throw error;
        return (data||[]).map(x=>({
            id:x.id, patient_id:x.paciente_id, patient_name:'', captured_at:x.data_hora,
            type:x.tipo || 'outro', region:x.regiao || '', description:x.descricao || '', filename:x.arquivo_nome || '',
            relative_path:x.caminho_relativo || '', size_bytes:x.tamanho_bytes || 0, mime_type:x.mime_type || 'image/jpeg',
            sha256:x.sha256 || '', backup_status:x.backup_status || 'pending', professional_id:x.profissional_id || null,
            professional_name:x.profissional_nome || '', station:x.estacao || '', cloud_only:true
        }));
    } catch(err) {
        console.warn('Tabela arquivos_paciente indisponível:',err);
        if(String(err.message||'').match(/arquivos_paciente|relation|does not exist|schema cache/i)) midiaTabelaSupabaseDisponivel=false;
        return [];
    }
}

async function sincronizarMetadadosMidiasSupabase(items) {
    if (!_supabase || !midiaTabelaSupabaseDisponivel || !Array.isArray(items) || !items.length) return;
    const rows=items.map(x=>({
        id:x.id, paciente_id:x.patient_id, data_hora:x.captured_at || new Date().toISOString(),
        tipo:x.type || 'outro', regiao:x.region || null, descricao:x.description || null, arquivo_nome:x.filename || null,
        caminho_relativo:x.relative_path || null, tamanho_bytes:Number(x.size_bytes)||0, mime_type:x.mime_type || 'image/jpeg',
        sha256:x.sha256 || null, backup_status:x.backup_status || 'pending', profissional_id:x.professional_id || null,
        profissional_nome:x.professional_name || null, estacao:x.station || null
    }));
    try {
        const {error}=await _supabase.from('arquivos_paciente').upsert(rows,{onConflict:'id'});
        if(error) throw error;
    } catch(err){
        console.warn('Não foi possível sincronizar metadados das fotos:',err);
        if(String(err.message||'').match(/arquivos_paciente|relation|does not exist|schema cache/i)) midiaTabelaSupabaseDisponivel=false;
    }
}

async function atualizarGaleriaMidias(silencioso=false) {
    const pacienteId=await sincronizarPacienteMidias(false);
    const gal=document.getElementById('midia_galeria');
    if(!pacienteId){if(gal)gal.innerHTML='<p class="midia-empty">Selecione um paciente para visualizar os registros.</p>';return;}
    if(!silencioso && gal) gal.innerHTML='<p class="midia-empty">Atualizando registros…</p>';
    await verificarKinesysLocal(false);
    const [locais,nuvem]=await Promise.all([obterMidiasLocais(pacienteId),obterMidiasSupabase(pacienteId)]);
    if(locais.length) await sincronizarMetadadosMidiasSupabase(locais);
    const map=new Map(); nuvem.forEach(x=>map.set(x.id,x)); locais.forEach(x=>map.set(x.id,{...(map.get(x.id)||{}),...x,cloud_only:false}));
    midiasPacienteAtual=[...map.values()].sort((a,b)=>String(b.captured_at||'').localeCompare(String(a.captured_at||'')));
    midiaUltimaQuantidadeLocal=locais.length;
    renderizarGaleriaMidias();
}

function formatarTamanhoArquivo(bytes){const n=Number(bytes)||0;if(n<1024)return n+' B';if(n<1048576)return (n/1024).toFixed(0)+' KB';return (n/1048576).toFixed(1)+' MB';}
function rotuloTipoMidia(t){return ({avaliacao:'Avaliação',evolucao:'Evolução',postura:'Postura',ferida:'Ferida / cicatriz',edema:'Edema',exame:'Exame / laudo',termo:'Termo / autorização',identificacao:'Identificação / CPF / RG',guia:'Guia / pedido',documento:'Documento',outro_admin:'Outro documento',outro:'Outro'}[t]||'Registro');}
function urlMidiaLocal(item,thumb=true){return `${KINESYS_LOCAL_URL}/${thumb?'thumb':'media'}/${encodeURIComponent(item.id)}?v=${encodeURIComponent(item.sha256||item.captured_at||'')}`;}

function renderizarGaleriaMidias(){
    const gal=document.getElementById('midia_galeria'); if(!gal)return;
    const filtro=document.getElementById('midia_filtro_tipo')?.value||'';
    const permitidos=tiposMidiaPermitidosParaPerfil();
    const itens=midiasPacienteAtual.filter(x=>permitidos.includes(x.type||'outro') && (!filtro||x.type===filtro));
    if(!itens.length){gal.innerHTML='<p class="midia-empty">Nenhuma foto ou documento registrado para este filtro.</p>';return;}
    gal.innerHTML=itens.map(item=>{
        const local=!item.cloud_only && kinesysLocalOnline;
        const dt=item.captured_at?new Date(item.captured_at).toLocaleString('pt-BR'):'Data N/I';
        const ehImagem=String(item.mime_type||'').toLowerCase().startsWith('image/');
        const iconeDoc=String(item.mime_type||'').toLowerCase().includes('pdf')?'PDF':'📄';
        const img=(local&&ehImagem)?`<img src="${urlMidiaLocal(item,true)}" alt="Registro clínico" loading="lazy" onerror="this.parentElement.innerHTML='📄'">`:`<span class="ks-media-doc-icon ${iconeDoc==='PDF'?'ks-media-doc-icon--pdf':'ks-media-doc-icon--generic'}">${iconeDoc}</span>`;
        return `<article class="midia-card">
            <div class="midia-thumb">${img}</div>
            <div class="midia-card-body">
                <div class="midia-card-title">${escapeHTML(rotuloTipoMidia(item.type))}${item.region?' · '+escapeHTML(item.region):''}</div>
                <div class="midia-card-meta">${escapeHTML(dt)}<br>${escapeHTML(item.filename||'arquivo')} · ${escapeHTML(formatarTamanhoArquivo(item.size_bytes))}</div>
                <div class="midia-card-badges"><span class="midia-badge ${local?'ok':'warn'}">${local?'Original local':'Original não disponível nesta estação'}</span><span class="midia-badge ${item.backup_status==='ok'?'ok':'warn'}">Backup ${item.backup_status==='ok'?'OK':'pendente'}</span></div>
                <div class="midia-card-actions">${local?`<button onclick="abrirMidiaLocal('${escapeHTML(item.id)}')">Abrir</button>${perfilEhSecretaria()?'':`<button onclick="selecionarMidiaComparacao('${escapeHTML(item.id)}','A')">Inicial</button><button onclick="selecionarMidiaComparacao('${escapeHTML(item.id)}','B')">Atual</button>`}`:''}</div>
            </div></article>`;
    }).join('');
}

function abrirMidiaLocal(id){window.open(`${KINESYS_LOCAL_URL}/media/${encodeURIComponent(id)}`,'_blank','noopener');}
function alternarComparacaoMidias(){const p=document.getElementById('midia_compare_panel');if(p)p.style.display=p.style.display==='none'?'grid':'none';}
function selecionarMidiaComparacao(id,lado){const item=midiasPacienteAtual.find(x=>x.id===id);if(!item)return;if(lado==='A')midiaComparacaoA=item;else midiaComparacaoB=item;const p=document.getElementById('midia_compare_panel');if(p)p.style.display='grid';atualizarPainelComparacao();}
function atualizarPainelComparacao(){[['midia_compare_a',midiaComparacaoA,'Inicial'],['midia_compare_b',midiaComparacaoB,'Atual']].forEach(([id,item,rot])=>{const el=document.getElementById(id);if(!el)return;if(!item){el.innerHTML=`Selecione uma foto como <strong>${rot}</strong>.`;return;}el.innerHTML=`<img src="${urlMidiaLocal(item,false)}" alt="${rot}">`;});}

async function salvarConfiguracaoBackupLocal(){
    const st=await verificarKinesysLocal(true);if(!st)return;
    const path=document.getElementById('midia_backup_path')?.value.trim()||'';
    try{const r=await kinesysLocalFetch('/api/config',{method:'POST',body:{backup_root:path}},4000);await verificarKinesysLocal(false);alert(path?'✓ Pasta de backup configurada.':'✓ Backup automático desativado.');}
    catch(err){alert('❌ Não foi possível salvar a configuração de backup.\n'+err.message);}
}
async function executarBackupLocal(){try{const r=await kinesysLocalFetch('/api/backup/run',{method:'POST',body:{}},15000);await atualizarGaleriaMidias(true);alert(`✓ Backup concluído. ${r.copied||0} arquivo(s) copiado(s); ${r.failed||0} falha(s).`);}catch(err){alert('❌ Falha no backup local.\n'+err.message);}}

// Proteção de gravações críticas contra cliques repetidos. A trava permanece até a Promise terminar.
document.addEventListener('DOMContentLoaded', function(){
    setTimeout(function(){
        protegerFuncaoKineSys('salvarCadastroSomente', ()=>'cadastro-paciente', null, 'Salvando…');
        protegerFuncaoKineSys('salvarAvaliacaoAtual', ()=>'avaliacao-paciente', null, 'Salvando…');
        protegerFuncaoKineSys('salvarEvolucaoSessao', ()=>'evolucao-paciente', null, 'Registrando…');
        protegerFuncaoKineSys('cadastrarNovoFuncionario', ()=>'cadastro-equipe', null, 'Salvando…');
        protegerFuncaoKineSys('salvarConfiguracaoBackupLocal', ()=>'config-backup-local', null, 'Salvando…');
        protegerFuncaoKineSys('salvarProcedimento', ()=>'agenda-procedimento', null, 'Salvando…');
        protegerFuncaoKineSys('salvarHorario', ()=>'agenda-horario', null, 'Salvando…');
        protegerFuncaoKineSys('salvarGradeSemanal', ()=>'agenda-grade-semanal', '#btn_salvar_grade_semanal', 'Salvando grade…');
        protegerFuncaoKineSys('salvarBloqueio', ()=>'agenda-bloqueio', null, 'Salvando…');
        protegerFuncaoKineSys('salvarAgendamento', ()=>'agenda-agendamento', '#btn_salvar_agendamento', 'Salvando…');
        protegerFuncaoKineSys('salvarListaEspera', ()=>'agenda-lista-espera', null, 'Adicionando…');
        protegerFuncaoKineSys('abrirOfertaListaEspera', (...args)=>'agenda-reencaixe-'+args.join('|'), null, 'Confirmando…');
    }, 0);
});

// Mantém o indicador do serviço atualizado quando a tela de mídias está aberta.
document.addEventListener('DOMContentLoaded',function(){
    setTimeout(()=>verificarKinesysLocal(false),900);
    setInterval(()=>{if(document.getElementById('tela_midias')?.classList.contains('ativa'))verificarKinesysLocal(false);},10000);
});