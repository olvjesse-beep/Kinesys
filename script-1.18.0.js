if (typeof dicionarioOcupacoesEsportes === 'undefined') {
    console.error("🚨 KineSys: 'database/ocupacoes_esportes.js' não foi carregado corretamente no HTML!");
}

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
let agendamentoClinicoContexto = null;
const KINESYS_AGENDAMENTO_CLINICO_CONTEXTO_KEY = 'kinesys_agendamento_clinico_contexto_v1';

function definirAgendamentoClinicoContexto(agendamentoId, pacienteId, modo = '') {
    const id = String(agendamentoId || '').trim();
    if (!id) { limparAgendamentoClinicoContexto(); return null; }
    agendamentoClinicoContexto = {
        agendamentoId: id,
        pacienteId: String(pacienteId || '').trim(),
        modo: String(modo || '').trim().toLowerCase(),
        definidoEm: new Date().toISOString()
    };
    try { sessionStorage.setItem(KINESYS_AGENDAMENTO_CLINICO_CONTEXTO_KEY, JSON.stringify(agendamentoClinicoContexto)); } catch (_) {}
    return agendamentoClinicoContexto;
}

function obterAgendamentoClinicoContexto(pacienteId = '', modo = '') {
    let contexto = agendamentoClinicoContexto;
    if (!contexto) {
        try {
            const salvo = sessionStorage.getItem(KINESYS_AGENDAMENTO_CLINICO_CONTEXTO_KEY);
            if (salvo) contexto = JSON.parse(salvo);
        } catch (_) {}
    }
    if (!contexto?.agendamentoId) return null;
    const pacienteEsperado = String(pacienteId || '').trim();
    const modoEsperado = String(modo || '').trim().toLowerCase();
    if (pacienteEsperado && contexto.pacienteId && pacienteEsperado !== String(contexto.pacienteId)) return null;
    if (modoEsperado && contexto.modo && modoEsperado !== String(contexto.modo)) return null;
    agendamentoClinicoContexto = contexto;
    return String(contexto.agendamentoId);
}

function limparAgendamentoClinicoContexto() {
    agendamentoClinicoContexto = null;
    try { sessionStorage.removeItem(KINESYS_AGENDAMENTO_CLINICO_CONTEXTO_KEY); } catch (_) {}
}
window.definirAgendamentoClinicoContexto = definirAgendamentoClinicoContexto;
window.obterAgendamentoClinicoContexto = obterAgendamentoClinicoContexto;
window.limparAgendamentoClinicoContexto = limparAgendamentoClinicoContexto;

async function resolverAgendamentoClinicoParaRegistro(pacienteId, realizadoEm, modo = '') {
    const direto = obterAgendamentoClinicoContexto(pacienteId, modo);
    if (direto) return direto;
    if (!_supabase || !pacienteId) return null;
    const data = String(realizadoEm || '').slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) return null;
    try {
        const { data: agendamentos, error } = await _supabase
            .from('agendamentos')
            .select('id,status')
            .eq('paciente_id', String(pacienteId))
            .eq('data', data)
            .neq('status', 'cancelado')
            .limit(3);
        if (error) return null;
        const candidatos = (agendamentos || []).filter(a => !['falta_justificada','falta_nao_justificada','faltou'].includes(String(a?.status || '').toLowerCase()));
        return candidatos.length === 1 ? String(candidatos[0].id) : null;
    } catch (_) {
        return null;
    }
}
window.resolverAgendamentoClinicoParaRegistro = resolverAgendamentoClinicoParaRegistro;
let loginPerfisDisponiveis = [];
let loginCredencialChave = '';
let autenticacaoInicializada = false;
let authStateSubscription = null;


let pacienteAtualId = null; 
let estadoMapeamento = {};
// Guarda a última lista de alertas do Radar Clínico calculada, para reuso
// no Painel Único de Alertas (Passo 3 da Avaliação) sem duplicar a lógica.
let ultimoRadarAlertas = [];
// Guarda o mapeamento anatômico da avaliação/reavaliação anterior deste
// paciente (se houver), como referência de comparação — não é editado,
// só consultado enquanto a nova avaliação é preenchida.
let mapeamentoAvaliacaoAnterior = null;

function limparSelecaoPerfilLogin() { KineSysLogin.clearPending(); }

function descreverPerfilLogin(u={}) {
    const tipo = normalizarNivelAcessoEquipe ? normalizarNivelAcessoEquipe(u.tipo) : String(u.tipo || '');
    const funcao = rotuloPerfil(tipo) || tipo || 'Perfil';
    const registro = String(u.registro || '').trim();
    return registro && !['MASTER','SECRETARIA'].includes(tipo) ? `${funcao} · ${registro}` : funcao;
}

let loginEmAndamento = false;

const CAMPOS_PUBLICOS_PERFIL = [
    'id', 'auth_user_id', 'nome', 'email', 'tipo', 'registro', 'conselho',
    'regional', 'numero_registro', 'aparece_na_agenda', 'ativo', 'idade', 'endereco', 'cpf'
].join(',');


async function buscarPerfisDoUsuarioAuth(authUser) {
    if (!authUser?.id) return [];
    const {data,error}=await _supabase.rpc('kinesys_meus_perfis');
    if(error)throw error;
    return data || [];
}

async function concluirEntradaComPerfil(perfil) { return KineSysLogin.activate(perfil); }


async function carregarAcessoDaSessao() { return KineSysLogin.resume(); }

async function fazerLogin() { return KineSysLogin.login(); }

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
    // Profissões futuras ficam armazenadas, mas aguardam seus módulos próprios.
    MEDICO:           [],
    NUTRICIONISTA:    [],
    PSICOLOGO:        [],
    EDUCADOR_FISICO:  [],
    // Secretaria pode acessar apenas rotinas operacionais; dados financeiros são administrativos.
    SECRETARIA:       ['tela_home', 'tela_cadastro', 'tela_home_atendimentos', 'tela_home_recentes', 'tela_buscar', 'tela_midias', 'tela_agenda'],
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
    const permitido = PERMISSOES_POR_PERFIL[perfil] || [];
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
    const pacoteAgenda = document.getElementById('agenda_pacote_financeiro_wrap');
    if (pacoteAgenda) pacoteAgenda.hidden = !usuarioEhMaster();

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
    const rotaSalva = window.location.hash.slice(1);
    navegarPara(rotaSalva && document.getElementById(rotaSalva) && telaPermitida(rotaSalva) ? rotaSalva : 'tela_home');
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
            const { error } = await _supabase.auth.signOut({scope:'local'});
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
    // Limpa o estado em memória para não reaproveitar telas do perfil anterior.
    location.reload();
}

async function enviarRedefinicaoSenha() { return KineSysLogin.sendRecovery(); }

/* ================= 2. NAVEGAÇÃO SPA INTELIGENTE ================= */
function navegarPara(idTela, contextoEdicao = false) {
    if (usuarioLogado && idTela !== 'tela_login' && window.location.hash !== '#' + idTela) window.history.pushState({ tela: idTela }, '', '#' + idTela);
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
        carregarPainelFisioterapeuta();
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

/* ==========================================================================
   KINESYS - SCRIPT DEFINITIVO (ID ÚNICO E SEM DUPLICATAS) - PARTE 2 DE 4
   Gestão de Equipe, EVA e Autocompletes (Extensos e Originais)
   ========================================================================== */

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


async function salvarPacienteNaNuvem(pacienteObjeto, opcoes = {}) {
    invalidarCachePacientesBasicos();
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

            // Cadastro administrativo não regrava o conteúdo clínico já existente.
            const podeGravarClinica = usuarioEhMaster() || perfilDoUsuario() === 'FISIOTERAPEUTA' || perfilDoUsuario() === 'PROFISSIONAL';
            for (const av of (podeGravarClinica ? avaliacoes : [])) {
                const avData = {
                    id: av.id || `av_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
                    paciente_id: id,
                    agendamento_id: av.agendamentoId || av.agendamento_id || null,
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

            for (const ev of (podeGravarClinica ? evolucoes : [])) {
                const evData = {
                    id: ev.id || `ev_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
                    paciente_id: id,
                    agendamento_id: ev.agendamentoId || ev.agendamento_id || null,
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
    const p=await obterPacienteCompletoPorId(pacienteId);
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
async function carregarPacienteParaEdicao(id, avaliacaoIdEditar = null) {
    const p = await obterPacienteCompletoPorId(id);
    if (!p) return;

    pacienteAtualId = p.id;
    avaliacaoEdicaoId = avaliacaoIdEditar || null;
    const navegacao = await navegarPara('tela_avaliacao', true);
    if (navegacao === false) return;
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
    processarRadarEmTempoReal();
}

function erroTabelaPacienteAusente(err) {
    return /does not exist|relation .* does not exist|schema cache|could not find the table/i.test(String(err?.message || err || ''));
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
    const lista = await obterPacientesBasicos();

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
    const pacienteAtual=await obterPacienteCompletoPorId(pacienteId);
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
        agendamentoId:registroEmEdicao?.agendamentoId||registroEmEdicao?.agendamento_id||await resolverAgendamentoClinicoParaRegistro(pacienteId,realizadoEm,'evolucao'),
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
    if(registro.agendamentoId) limparAgendamentoClinicoContexto();
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
    const sessoesRealizadas = Array.isArray(p.evolucoes) ? p.evolucoes.length : 0;
    el.innerHTML = `
        <span class="resumo-item">👤 <strong>${escapeHTML(p.nome)}</strong></span>
        <span class="resumo-item">🎂 ${escapeHTML(p.idade || 'Idade N/I')}</span>
        <span class="resumo-item">🪪 CPF: ${escapeHTML(p.cpf || 'N/I')}</span>
        <span class="resumo-item">💼 ${escapeHTML(p.profissao || '-')}</span>
        <span class="resumo-status">${statusAvaliacao}</span>
        <span class="resumo-status">🩺 ${sessoesRealizadas} sessão(ões) realizada(s)</span>
    `;
    el.style.display = 'flex';
}

async function editarEvolucaoClinica(evolucaoId){
    const pacienteId=obterPacienteIdEvolucaoAtivo();if(!pacienteId)return;sincronizarSelectPacienteEvolucao(pacienteId);
    const p=await obterPacienteCompletoPorId(pacienteId),e=(p?.evolucoes||[]).find(x=>String(x.id)===String(evolucaoId));
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

    const p = await obterPacienteCompletoPorId(pacienteId);
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
            if (!input.checked) {
                renderizarMapeamentoRegioes();
                return;
            }
            const loader = window.KineSysClinicalRegionLoader;
            if (!loader?.ensure) {
                input.checked = false;
                if (typeof window.mostrarToastKineSys === 'function') window.mostrarToastKineSys('Os dados clínicos desta região ainda não estão disponíveis. Tente novamente.','erro',6500);
                return;
            }
            loader.ensure([idRegiao]).then(() => {
                const carregada = loader.status?.().bankRegions?.includes(idRegiao);
                if (carregada) renderizarMapeamentoRegioes();
                else {
                    input.checked = false;
                    if (typeof window.mostrarToastKineSys === 'function') window.mostrarToastKineSys('Não foi possível carregar os dados clínicos desta região. Tente novamente.','erro',6500);
                }
            });
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
    cervical:['cervical','pescoco','nuca','cervicalgia','torcicolo','vertebra cervical','linha media cervical'],
    atm:['atm','articulacao temporomandibular','mandibula','maxilar','masseter','mastigacao','mastigar','bruxismo','apertamento','pre auricular'],
    ombro:['ombro','ombros','manguito','supraespinhal','glenoumeral','escapula','labrum','slap','calcificacao do ombro'],
    lombar:['lombar','lombossacra','lombalgia','sacro','coluna lombar'],
    joelho:['joelho','patela','patelar','menisco','lca','lcp'],
    quadril:['quadril','virilha','inguinal','trocanter','coxofemoral','femur','cabeca femoral','lateral da coxa'],
    tornozelo_pe:['tornozelo','pe','calcaneo','aquiles','maleolo','plantar','halux','metatarso','antepe','tunel tarsal','navicular','metatarsofalangica','sesamoide'],
    cotovelo:['cotovelo','epicondilo','supinador','pronador','olecrano','fossa cubital','biceps distal','ligamento colateral ulnar do cotovelo'],
    punho_mao:['punho','mao','carpo','polegar','dedo','dedos','radio distal'],
    coluna_toracica:['toracica','toracico','interescapular','costela','costelas','intercostal']
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


/* ================= KINESYS — ANATOMIA SEGMENTADA + LATERALIDADE =================
   A topologia deixa de trabalhar apenas com macrorregiões e passa a preservar:
   - segmento anatômico;
   - ordem proximal → distal;
   - lado explícito quando informado;
   - cadeia anatômica (membro superior / membro inferior);
   - conflito de lateralidade em um trajeto narrado.
   Nenhuma inferência topológica atravessa lados explicitamente opostos. */
const KINESYS_ANATOMIA_SEGMENTADA = Object.freeze({
    cervical:    {macro:'cervical', cadeia:'ms', ordem:0, rotulo:'cervical', termos:['coluna cervical','regiao cervical','cervical','pescoco','nuca']},
    escapula:    {macro:'ombro', cadeia:'ms', ordem:1, rotulo:'escápula', termos:['borda medial da escapula','regiao escapular','escapula','omoplata']},
    ombro:       {macro:'ombro', cadeia:'ms', ordem:1, rotulo:'ombro', termos:['articulacao do ombro','regiao do ombro','ombro']},
    braco:       {macro:'braco', cadeia:'ms', ordem:2, rotulo:'braço', termos:['parte superior dos bracos','parte superior do braco','bracos','braco']},
    cotovelo:    {macro:'cotovelo', cadeia:'ms', ordem:3, rotulo:'cotovelo', termos:['regiao do cotovelo','cotovelo']},
    antebraco:   {macro:'antebraco', cadeia:'ms', ordem:4, rotulo:'antebraço', termos:['antebraco']},
    punho:       {macro:'punho_mao', cadeia:'ms', ordem:5, rotulo:'punho', termos:['articulacao do punho','punho','carpo']},
    mao:         {macro:'punho_mao', cadeia:'ms', ordem:6, rotulo:'mão', termos:['palmas das maos','palma da mao','dorso das maos','dorso da mao','maos','mao']},
    dedos_mao:   {macro:'punho_mao', cadeia:'ms', ordem:7, rotulo:'dedos da mão', termos:['dedo minimo','dedo mindinho','quinto dedo','5o dedo','dedo anelar','quarto dedo','4o dedo','dedo medio','terceiro dedo','3o dedo','indicador','segundo dedo','2o dedo','polegar','dedao da mao','dedos da mao']},

    lombar:      {macro:'lombar', cadeia:'mi', ordem:0, rotulo:'lombar', termos:['coluna lombar','regiao lombar','lombossacra','lombar']},
    gluteo:      {macro:'quadril', cadeia:'mi', ordem:1, rotulo:'glúteo', termos:['regiao glutea','nadega','gluteo']},
    quadril:     {macro:'quadril', cadeia:'mi', ordem:1, rotulo:'quadril/virilha', termos:['articulacao do quadril','coxofemoral','trocanter','virilha','inguinal','quadril']},
    coxa_lateral:{macro:'coxa', cadeia:'mi', ordem:2, rotulo:'lateral da coxa', termos:['parte de fora da coxa','lado de fora da coxa','lateral da coxa']},
    coxa:        {macro:'coxa', cadeia:'mi', ordem:2, rotulo:'coxa', termos:['posterior da coxa','anterior da coxa','parte de tras da coxa','parte da frente da coxa','coxa']},
    joelho:      {macro:'joelho', cadeia:'mi', ordem:3, rotulo:'joelho', termos:['articulacao do joelho','patela','rotula','joelho']},
    perna:       {macro:'perna', cadeia:'mi', ordem:4, rotulo:'perna', termos:['parte de baixo das pernas','parte de baixo da perna','pernas','canela','perna']},
    panturrilha: {macro:'perna', cadeia:'mi', ordem:4, rotulo:'panturrilha', termos:['panturrilha','batata da perna']},
    tornozelo:   {macro:'tornozelo_pe', cadeia:'mi', ordem:5, rotulo:'tornozelo', termos:['articulacao do tornozelo','maleolo','tornozelo']},
    pe:          {macro:'tornozelo_pe', cadeia:'mi', ordem:6, rotulo:'pé', termos:['dorso dos pes','dorso do pe','planta dos pes','planta do pe','antepe','mediope','calcaneo','calcanhar','pes','pe']},
    dedos_pe:    {macro:'tornozelo_pe', cadeia:'mi', ordem:7, rotulo:'dedos do pé', termos:['halux','dedao do pe','primeiro dedo do pe','quinto dedo do pe','dedos do pe']}
});

const KINESYS_TERMOS_ANATOMIA_SEGMENTADA = Object.freeze((function(){
    var lista=[];
    Object.keys(KINESYS_ANATOMIA_SEGMENTADA).forEach(function(segmento){
        var cfg=KINESYS_ANATOMIA_SEGMENTADA[segmento];
        (cfg.termos||[]).forEach(function(termo){
            lista.push({segmento:segmento,termo:removerAcentos(termo),macro:cfg.macro,cadeia:cfg.cadeia,ordem:cfg.ordem,rotulo:cfg.rotulo});
        });
    });
    return lista.sort(function(a,b){return b.termo.length-a.termo.length;});
})());

function lateralidadesNoTextoKineSys(texto){
    var t=removerAcentos(texto||''), itens=[];
    var re=/\b(?:lado\s+)?(direit[oa]|esquerd[oa])\b/g, m;
    while((m=re.exec(t))!==null){
        itens.push({lado:/^direit/.test(m[1])?'direita':'esquerda',inicio:m.index,fim:re.lastIndex,termo:m[0]});
        if(m[0].length===0)re.lastIndex++;
    }
    return itens;
}

function ladoProximoMencaoKineSys(textoNormalizado,inicio,fim){
    var laterais=lateralidadesNoTextoKineSys(textoNormalizado), centro=(inicio+fim)/2, melhor=null,dist=Infinity;
    laterais.forEach(function(l){
        var c=(l.inicio+l.fim)/2, d=Math.abs(c-centro);
        // Janela curta reduz a chance de o lado de outra região contaminar esta menção.
        if(d<=28&&d<dist){melhor=l;dist=d;}
    });
    return melhor?melhor.lado:null;
}

function extrairMencoesAnatomicasKineSys(textoRaw){
    var t=removerAcentos(textoRaw||''), candidatos=[];
    KINESYS_TERMOS_ANATOMIA_SEGMENTADA.forEach(function(item){
        var re=new RegExp('(^|[^a-z0-9])('+escaparRegexKineSys(item.termo).replace(/\\ /g,'\\s+')+')(?=$|[^a-z0-9])','g'),m;
        while((m=re.exec(t))!==null){
            var desloc=m[1]?m[1].length:0, ini=m.index+desloc, fim=ini+m[2].length;
            candidatos.push({segmento:item.segmento,macro:item.macro,cadeia:item.cadeia,ordem:item.ordem,rotulo:item.rotulo,termo:m[2],inicio:ini,fim:fim});
            if(m[0].length===0)re.lastIndex++;
        }
    });
    candidatos.sort(function(a,b){return a.inicio-b.inicio||(b.fim-b.inicio)-(a.fim-a.inicio);});
    var escolhidos=[];
    candidatos.forEach(function(c){
        var sobrepoe=escolhidos.some(function(e){return !(c.fim<=e.inicio||c.inicio>=e.fim);});
        if(!sobrepoe)escolhidos.push(c);
    });
    escolhidos.sort(function(a,b){return a.inicio-b.inicio;});
    escolhidos.forEach(function(m){m.ladoExplicito=ladoProximoMencaoKineSys(t,m.inicio,m.fim);});
    return escolhidos;
}

function ladosCompativeisKineSys(a,b){return !a||!b||a===b;}

function padraoPropagacaoKineSys(){
    return /\b(?:irradia(?:ndo|cao|ção)?|desce|sobe|vai|segue|espalha|corre|caminha|pega|puxa|percorre|passa|se\s+estende|estende|chega|atinge|volta|vem)\b(?:\s+(?:de|do|da|dos|das|para|ate|até|pela|pelo|por|abaixo\s+do|abaixo\s+da|acima\s+do|acima\s+da))?/i;
}

function analisarTopologiaSintomasKineSys(hmaRaw='', origemRaw='', destinoRaw=''){
    var texto=String(hmaRaw||'').replace(/\s+/g,' ').trim();
    var clausulas=kinesysDividirClausulasHMA(texto);
    var trajetos=[], pares=[], conflitos=[], mencoesGlobais=[], ultimaMencaoAnterior=null;

    clausulas.forEach(function(c){
        var mencoes=extrairMencoesAnatomicasKineSys(c.texto).map(function(m){return Object.assign({},m,{inicioGlobal:(c.inicio||0)+m.inicio,fimGlobal:(c.inicio||0)+m.fim,clausulaId:c.id});});
        mencoesGlobais=mencoesGlobais.concat(mencoes);
        var textoClausulaNormalizado=removerAcentos(c.texto);
        var rePropBase=padraoPropagacaoKineSys(), reProp=new RegExp(rePropBase.source,'ig'), props=[], mp;
        while((mp=reProp.exec(textoClausulaNormalizado))!==null){
            var antesProp=textoClausulaNormalizado.slice(Math.max(0,mp.index-18),mp.index);
            var negadoProp=/\b(?:nao|sem)\s*$/.test(antesProp);
            if(!negadoProp) props.push(mp);
            if(mp[0].length===0) reProp.lastIndex++;
        }
        var prop=props.find(function(pr){
            var ini=pr.index, fim=pr.index+pr[0].length;
            return mencoes.some(function(m){return m.fim<=ini;})&&mencoes.some(function(m){return m.inicio>=fim;});
        })||null;
        if(prop){
            var posProp=prop.index, fimProp=prop.index+prop[0].length;
            var antes=mencoes.filter(function(m){return m.fim<=posProp;});
            // A propagação termina antes de uma nova oração/sintoma independente.
            // Ex.: "desce até a mão, apresenta dormência e perda de força no braço"
            // não pode virar artificialmente cervical → mão → braço.
            var limiteTrajeto=c.texto.length;
            var restoTrajeto=c.texto.slice(fimProp);
            var quebraTrajeto=/,\s*(?:e\s+)?(?:apresenta|refere|relata|queixa|informa|associad[oa]|com\s+(?:dorm[eê]ncia|formigamento|parestesia|fraqueza|perda\s+de\s+for[cç]a))/i.exec(restoTrajeto);
            if(quebraTrajeto) limiteTrajeto=fimProp+quebraTrajeto.index;
            var depois=mencoes.filter(function(m){return m.inicio>=fimProp&&m.inicio<limiteTrajeto;});
            var origem=antes.length?antes[antes.length-1]:ultimaMencaoAnterior;
            if(origem&&depois.length){
                // Evita reaproveitar uma âncora muito distante de outra frase não relacionada.
                if(!antes.length&&origem.fimGlobal!=null&&((c.inicio||0)-origem.fimGlobal)>180)origem=null;
            }
            if(origem&&depois.length){
                var ladoHerdado=origem.ladoExplicito||null;
                var caminho=[Object.assign({},origem,{ladoEfetivo:origem.ladoExplicito||null})];
                var conflitoTrajeto=false;
                depois.forEach(function(dest){
                    var ladoDestino=dest.ladoExplicito||ladoHerdado||null;
                    var comp=ladosCompativeisKineSys(origem.ladoExplicito,dest.ladoExplicito);
                    if(!comp){
                        conflitoTrajeto=true;
                        conflitos.push({clausulaId:c.id,trecho:c.texto,origem:origem.segmento,destino:dest.segmento,ladoOrigem:origem.ladoExplicito,ladoDestino:dest.ladoExplicito});
                    }
                    caminho.push(Object.assign({},dest,{ladoEfetivo:ladoDestino,compatibilidadeLateral:comp}));
                    if(comp){
                        pares.push({origem:origem.macro,destino:dest.macro,origemSegmento:origem.segmento,destinoSegmento:dest.segmento,ladoOrigem:origem.ladoExplicito||ladoHerdado||null,ladoDestino:ladoDestino,compatibilidadeLateral:true,fonte:'hma',clausulaId:c.id,trecho:c.texto});
                    }
                });
                trajetos.push({id:'T'+(trajetos.length+1),clausulaId:c.id,trecho:c.texto,cadeia:origem.cadeia,segmentos:caminho,conflitoLateralidade:conflitoTrajeto});
            }
        }
        if(mencoes.length)ultimaMencaoAnterior=mencoes[mencoes.length-1];
    });

    // Campos estruturados de origem/destino continuam compatíveis com o restante do sistema.
    var origemM=extrairMencoesAnatomicasKineSys(origemRaw||''), destinoM=extrairMencoesAnatomicasKineSys(destinoRaw||'');
    if(origemM.length&&destinoM.length){
        var o=origemM[origemM.length-1];
        destinoM.forEach(function(d){
            if(!ladosCompativeisKineSys(o.ladoExplicito,d.ladoExplicito)){
                conflitos.push({clausulaId:null,trecho:[origemRaw,destinoRaw].filter(Boolean).join(' → '),origem:o.segmento,destino:d.segmento,ladoOrigem:o.ladoExplicito,ladoDestino:d.ladoExplicito});
                return;
            }
            pares.push({origem:o.macro,destino:d.macro,origemSegmento:o.segmento,destinoSegmento:d.segmento,ladoOrigem:o.ladoExplicito||null,ladoDestino:d.ladoExplicito||o.ladoExplicito||null,compatibilidadeLateral:true,fonte:'campos',clausulaId:null,trecho:[origemRaw,destinoRaw].filter(Boolean).join(' → ')});
        });
    }

    var origemExplicita=new Set(pares.map(function(p){return p.origem;}));
    var destinoExplicito=new Set(pares.map(function(p){return p.destino;}));
    var diretas=new Set(regioesMencionadasNoTextoKineSys(texto));
    var papel={};
    new Set([].concat(Array.from(diretas),Array.from(origemExplicita),Array.from(destinoExplicito))).forEach(function(id){
        var o=origemExplicita.has(id),d=destinoExplicito.has(id);papel[id]=o&&d?'misto':o?'origem':d?'destino':'direto';
    });
    var ladosPresentes=Array.from(new Set(mencoesGlobais.map(function(m){return m.ladoExplicito;}).filter(Boolean)));
    return {
        versaoTopologia:4,
        origens:Array.from(origemExplicita),destinos:Array.from(destinoExplicito),diretas:Array.from(diretas),pares:pares,papel:papel,
        mencoesAnatomicas:mencoesGlobais,trajetosSegmentados:trajetos,conflitosLateralidade:conflitos,
        lateralidadeGlobal:ladosPresentes.length===1?ladosPresentes[0]:(ladosPresentes.length>1?'mista':null),ladosPresentes:ladosPresentes
    };
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

async function inicializarAutenticacaoKineSys() { return KineSysLogin.start(); }

document.addEventListener("DOMContentLoaded", function() {
    // Os eventos de login são gerenciados em login_access.js.

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

const KINESYS_MOTOR_VERSION = '2.6.0';
const KINESYS_APP_VERSION = '1.18.0';
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
    const sincronizarSeAvaliacao = event => {
        if (event?.detail?.id === 'tela_avaliacao') sincronizarCicloVidaRadar();
    };
    document.addEventListener('kinesys:tela-ativada', sincronizarSeAvaliacao);
    document.addEventListener('kinesys:tela-desativada', sincronizarSeAvaliacao);
    tela.dataset.radarLifecycleBound = '1';
    sincronizarCicloVidaRadar();
}

function inicializarAvaliacaoDomKineSys() {
    const tela = document.getElementById('tela_avaliacao');
    if (!tela || !document.getElementById('paciente_hma')) return false;
    if (tela.dataset.kinesysDomInit === '1') return true;
    tela.dataset.kinesysDomInit = '1';

    tela.querySelectorAll('.checkbox-group input[type="checkbox"]').forEach(chk => {
        if (chk.dataset.kinesysRadarBound === '1') return;
        chk.dataset.kinesysRadarBound = '1';
        chk.addEventListener('change', processarRadarEmTempoReal);
    });

    const inputProfissao = document.getElementById('paciente_ocupacao');
    const inputEsporte = document.getElementById('paciente_esporte');
    if (inputProfissao && inputProfissao.dataset.kinesysRadarInputBound !== '1') {
        inputProfissao.dataset.kinesysRadarInputBound = '1';
        inputProfissao.addEventListener('input', processarRadarEmTempoReal);
        inputProfissao.addEventListener('input', sugerirExposicoesOcupacionais);
    }
    if (inputEsporte && inputEsporte.dataset.kinesysRadarInputBound !== '1') {
        inputEsporte.dataset.kinesysRadarInputBound = '1';
        inputEsporte.addEventListener('input', processarRadarEmTempoReal);
    }

    const avRealizado = document.getElementById('avaliacao_realizado_em');
    if (avRealizado && !avRealizado.value) avRealizado.value = valorDatetimeLocalAgora();

    tela.querySelectorAll('input, select, textarea').forEach(el => {
        if (el.hasAttribute('data-no-autosave') || el.dataset.kinesysAutosaveBound === '1') return;
        el.dataset.kinesysAutosaveBound = '1';
        el.addEventListener(el.type === 'text' || el.tagName === 'TEXTAREA' ? 'input' : 'change', event => {
            const ehDigitacaoHMA = el.id === 'paciente_hma' && event.type === 'input';
            if (!ehDigitacaoHMA) {
                processarRadarEmTempoReal();
                if (el.id === 'paciente_origem_irradiacao' || el.id === 'paciente_irradiacao') renderizarAnaliseIrradiacao();
            }
            agendarAutosaveKineSys();
        });
    });

    if (!tela.querySelector('.medida-objetiva')) adicionarMedidaObjetiva();
    if (!tela.querySelector('.psfs-row')) adicionarAtividadePSFS();
    if (!tela.querySelector('.objetivo-row')) adicionarObjetivoTerapeutico();

    atualizarFonteDadosCompacta();
    [
        ['grupo_yellow_flags', 'Fatores psicossociais'],
        ['grupo_exposicoes_ocupacionais', 'Exposição ocupacional'],
        ['grupo_exposicoes_esportivas', 'Carga esportiva']
    ].forEach(([id, fallback]) => {
        const box = document.getElementById(id);
        if (!box || box.dataset.kinesysSummaryBound === '1') return;
        box.dataset.kinesysSummaryBound = '1';
        const details = box.closest('details');
        const small = details?.querySelector('summary small');
        const base = small?.textContent || fallback;
        const atualizar = () => {
            if (!small) return;
            const n = box.querySelectorAll('input[type="checkbox"]:checked').length;
            small.textContent = n ? `${n} selecionado${n > 1 ? 's' : ''}` : base;
        };
        box.addEventListener('change', atualizar);
        atualizar();
    });

    instalarObservadorCicloVidaRadar();
    protegerFuncaoKineSys('salvarAvaliacaoAtual', () => 'avaliacao-paciente', null, 'Salvando…');
    return true;
}

document.addEventListener('kinesys:tela-dom-pronta', event => {
    if (event.detail?.id === 'tela_avaliacao') inicializarAvaliacaoDomKineSys();
});


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
    let pacienteExistente=pacienteAtualId?await obterPacienteCompletoPorId(pacienteAtualId):null;
    if(!pacienteExistente&&!pacienteAtualId){const listaBasica=await obterPacientesBasicos();const duplicados=listaBasica.filter(p=>(p.nome||'').toLowerCase()===nome.toLowerCase());if(duplicados.length&&!(await confirmarKineSys(`Já existe(m) ${duplicados.length} paciente(s) chamado(s) "${nome}".\n\nSalvar como NOVO cadastro?`, {titulo:'Paciente com nome semelhante', confirmar:'Salvar como novo'})))return;}

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
        agendamentoId:registroEmEdicao?.agendamentoId||registroEmEdicao?.agendamento_id||await resolverAgendamentoClinicoParaRegistro(pacienteExistente?.id||pacienteAtualId||'',realizadoEm,'avaliacao'),
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
        hma:document.getElementById('paciente_hma')?.value||'',hmaInsights:obterInsightsHMAKineSys(),sinteseKinesys20:{diagnosticoCinetico:document.getElementById('ks20_diagnostico_cinetico')?.value||'',hipoteseMedica:document.getElementById('ks20_hipotese_medica')?.value||''},mapeamento
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
    if(dadosAvaliacao.agendamentoId) limparAgendamentoClinicoContexto();
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
            mensagem:'Há uma avaliação não finalizada neste dispositivo.',
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
            const ehDigitacaoHMA = el.id === 'paciente_hma' && event.type === 'input';
            if (!ehDigitacaoHMA) {
                processarRadarEmTempoReal();
                if(el.id==='paciente_origem_irradiacao'||el.id==='paciente_irradiacao')renderizarAnaliseIrradiacao();
            }
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


/* ==========================================================================
   KINESYS CLINICAL SYNTHESIS 2.6 — RECONCILIAÇÃO HMA ↔ EXAME
   --------------------------------------------------------------------------
   Camada aditiva: não altera IDs, chaves de resultados nem regras existentes.
   Reúne proveniência da HMA e do exame, explicita incerteza e impede que um
   achado positivo isolado seja promovido a eixo sustentado sem regra explícita.
   Índices servem apenas para ordenação/suporte; nunca representam probabilidade.
   ========================================================================== */
function pistasHMAHipoteseKineSys(item, contexto){
    const hma=String(contexto?.hma||'');
    const favor=(item?.palavrasChaveHMA||[]).filter(p=>correspondePistaClinica(hma,p)).slice(0,5);
    const contra=(item?.palavrasChaveContra||[]).filter(p=>correspondePistaClinica(hma,p)).slice(0,4);
    return {favor,contra};
}

function regraExplicitaPermiteAchadoUnicoKineSys(item){
    const regra=item?.regraConfirmacao||{};
    const base=KINESYS_META_CRITERIOS_2[item?.id]||{};
    if(regra.tipo==='qualquer')return true;
    const minimo=base.minimo ?? regra.minimo ?? item?.limiar;
    return minimo!==undefined && minimo!==null && Number(minimo)<=1;
}

function sintetizarHipotesesClinicasKineSys(idRegiao, contexto=coletarContextoClinico(), candidatos=null, fenotipo=null){
    const reg=BANCO_MAPEAMENTO_CLINICO[idRegiao];
    const estado=obterEstadoRegiao(idRegiao);
    const lista=Array.isArray(candidatos)?candidatos:ordenarHipotesesRegiaoKineSys(idRegiao,contexto);
    const rf=(reg?.redFlags||[]).map((texto,i)=>estado.resultados['redflag::'+i]?{indice:i,texto}:null).filter(Boolean);
    const alertas=alertasTextuaisParaRegiaoKineSys(contexto,idRegiao);
    const segurancaAtiva=rf.length>0||alertas.length>0;
    const chaveEscolhida=estado.hipotesePrincipalAtiva||'';

    const hipoteses=lista.map(c=>{
        const item=c.item||{};
        const grupo=c.grupo||grupoDoItemKineSys(idRegiao,item);
        const statusBase=statusHipoteseKineSys(idRegiao,c);
        const analise=analisarRespostasItem(estado,grupo,item);
        const meta=obterMetaCriteriosKineSys(item,grupo);
        const pistas=pistasHMAHipoteseKineSys(item,contexto);
        const exame=(item.testes||[]).map((teste,i)=>({teste,resultado:analise.respostas[i]||''}));
        const favorExame=exame.filter(x=>x.resultado==='positivo').map(x=>x.teste);
        const contraExame=exame.filter(x=>x.resultado==='negativo').map(x=>x.teste);
        const indicesPendentes=[];
        (meta.essenciais||[]).forEach(i=>{const r=analise.respostas[i]||'';if(!r||['inconclusivo','nao_realizado','nao_aplicavel'].includes(r))indicesPendentes.push(i);});
        exame.forEach((x,i)=>{if(indicesPendentes.includes(i))return;if(!x.resultado||['inconclusivo','nao_realizado','nao_aplicavel'].includes(x.resultado))indicesPendentes.push(i);});
        const aConfirmar=indicesPendentes.slice(0,4).map(i=>item.testes?.[i]).filter(Boolean);
        const positivoIsoladoSemRegra=statusBase==='positivo'&&analise.positivos===1&&!regraExplicitaPermiteAchadoUnicoKineSys(item);

        let estadoSintese='a_confirmar';
        if(statusBase==='positivo'&&!positivoIsoladoSemRegra)estadoSintese='sustentada';
        else if(statusBase==='negativo')estadoSintese=(pistas.favor.length||analise.positivos>0)?'enfraquecida':'nao_sustentada';
        else if(statusBase==='inconclusivo'||statusBase==='pendente')estadoSintese='a_confirmar';

        const aFavor=[
            ...pistas.favor.map(x=>`HMA: ${x}`),
            ...favorExame.map(x=>`Exame: ${x} — positivo`)
        ];
        const contra=[
            ...pistas.contra.map(x=>`HMA: ${x}`),
            ...contraExame.map(x=>`Exame: ${x} — negativo`)
        ];
        if(positivoIsoladoSemRegra)aConfirmar.unshift('Achado positivo isolado: buscar concordância clínica antes de sustentar este eixo.');

        return {
            id:item.id||'',nome:item.nome||'',grupo,statusBase,estadoSintese,
            aFavor:Array.from(new Set(aFavor)),contra:Array.from(new Set(contra)),aConfirmar:Array.from(new Set(aConfirmar)).slice(0,5),
            indiceSuporte:Number(c.score)||0,
            proveniencia:{
                hma:[...pistas.favor.map(trecho=>({sentido:'a_favor',trecho})),...pistas.contra.map(trecho=>({sentido:'contra',trecho}))],
                exame
            },
            achadoPositivoIsoladoSemRegra:positivoIsoladoSemRegra,
            selecionadaPeloProfissional:chaveEscolhida===chaveHipoteseKineSys(c)
        };
    });

    const sustentadas=hipoteses.filter(h=>h.estadoSintese==='sustentada');
    const manual=sustentadas.find(h=>h.selecionadaPeloProfissional);
    const preferencial=segurancaAtiva?null:(manual||sustentadas[0]||null);
    const diferenciaisAbertos=hipoteses.filter(h=>!preferencial||h.id!==preferencial.id||h.grupo!==preferencial.grupo)
        .filter(h=>['sustentada','a_confirmar','enfraquecida'].includes(h.estadoSintese)).slice(0,6);
    const escolha=hipoteses.find(h=>h.selecionadaPeloProfissional)||null;

    return {
        versao:KINESYS_MOTOR_VERSION,
        regiaoId:idRegiao,
        regiaoNome:reg?.nome||idRegiao,
        seguranca:{
            ativa:segurancaAtiva,
            redFlags:rf,
            alertasTextuais:alertas.map(a=>({id:a.id,titulo:a.titulo})),
            revisada:!!estado.redflagsRevisadas,
            decisaoRegistrada:!!estado.redflagAcknowledge,
            conduta:estado.redflagConduta||'',
            justificativa:estado.redflagJustificativa||'',
            bloqueiaPreferenciaLocal:segurancaAtiva
        },
        hipotesePreferencial:preferencial,
        escolhaProfissional:escolha,
        hipoteses,
        diferenciaisAbertos,
        insuficiente:segurancaAtiva||!preferencial,
        fenotipoOperacional:fenotipo||inferirFenotipoOperacionalKineSys(idRegiao,contexto),
        geradoEm:new Date().toISOString()
    };
}
window.sintetizarHipotesesClinicasKineSys=sintetizarHipotesesClinicasKineSys;
/* KINESYS CLINICAL SYNTHESIS 2.6 — END */

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
        estado.sinteseClinica=sintetizarHipotesesClinicasKineSys(id,contexto,candidatos,fen);
        if(estado.sinteseClinica.seguranca.ativa){
            estado.fenotipoOperacional=null;
            estado.incertezaEspecifica=false;
            estado.incertezaClinicaAceita=false;
            estado.incertezaClinicaMotivo='';
        }else if(!estado.sinteseClinica.hipotesePreferencial){
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
        const rf=(reg.redFlags||[]).filter((_,i)=>est.resultados['redflag::'+i]);
        const alertasTxt=alertasTextuaisParaRegiaoKineSys(contexto,id);
        const fen=est.fenotipoOperacional||inferirFenotipoOperacionalKineSys(id,contexto);
        const sintese=sintetizarHipotesesClinicasKineSys(id,contexto,candidatos,fen);
        est.sinteseClinica=sintese;
        let hipotese,nivel,codigo='',nome='',textoDocumento='',associadas=[];
        if(rf.length||alertasTxt.length){
            hipotese=`Sinal(is) de alerta revisado(s). Conduta registrada: ${est.redflagConduta||'não registrada'}. ${est.redflagJustificativa||''}`;
            nivel='alerta'; textoDocumento=`${reg.nome}: sinal(is) de alerta identificado(s) durante a triagem; conduta clínica registrada no prontuário.`;
        }else if(sintese.hipotesePreferencial){
            const principal=sintese.hipotesePreferencial; codigo=principal.id; nome=principal.nome;
            associadas=sintese.hipoteses.filter(h=>h.estadoSintese==='sustentada'&&(h.id!==principal.id||h.grupo!==principal.grupo)).slice(0,3).map(h=>({codigo:h.id,nome:h.nome,grupo:h.grupo}));
            hipotese=`Eixo de investigação sustentado pelo conjunto dos achados: ${nome}.`;
            if(principal.aFavor.length)hipotese+=` A favor: ${principal.aFavor.slice(0,4).join('; ')}.`;
            if(principal.contra.length)hipotese+=` Achados que enfraquecem: ${principal.contra.slice(0,3).join('; ')}.`;
            if(principal.aConfirmar.length)hipotese+=` Ainda a esclarecer: ${principal.aConfirmar.slice(0,3).join('; ')}.`;
            if(associadas.length)hipotese+=` Eixo(s) associado(s) também sustentado(s): ${associadas.map(x=>x.nome).join('; ')}.`;
            nivel='positivo'; textoDocumento=textoDocumentalDaHipotese({id:principal.id,nome:principal.nome},reg.nome);
            if(associadas.length)textoDocumento+=` Eixos associados compatíveis no exame: ${associadas.map(x=>x.nome).join('; ')}.`;
        }else if(fen){
            nome=fen.nome; hipotese=`Padrão operacional sugerido: ${fen.nome}. ${fen.texto} Condição específica ainda não definida.`;
            const abertos=sintese.diferenciaisAbertos.filter(h=>h.estadoSintese==='a_confirmar'||h.estadoSintese==='enfraquecida').slice(0,3);
            if(abertos.length)hipotese+=` Eixos ainda em aberto: ${abertos.map(h=>h.nome).join('; ')}.`;
            nivel='fenotipo'; textoDocumento=`${reg.nome}: ${fen.nome}. O padrão foi utilizado como direção operacional fisioterapêutica, mantendo incerteza quanto à condição específica e reavaliação conforme novos achados.`;
        }else if(est.incertezaClinicaAceita){
            hipotese='Sem eixo operacional definido nesta etapa. O quadro foi registrado como investigação em aberto após revisão clínica, sem impedir continuidade da avaliação.';
            const abertos=sintese.diferenciaisAbertos.filter(h=>h.estadoSintese==='a_confirmar'||h.estadoSintese==='enfraquecida').slice(0,3);
            if(abertos.length)hipotese+=` Permanecem para reavaliação: ${abertos.map(h=>h.nome).join('; ')}.`;
            nivel='indeterminado'; textoDocumento=`${reg.nome}: sem eixo operacional definido nesta etapa; avaliação prosseguiu com registro explícito de incerteza clínica e acompanhamento orientado por sinais, sintomas, função e evolução.`;
        }else{
            hipotese='Avaliação sem eixo operacional sustentado pelos achados preenchidos. É permitido prosseguir sem forçar um diagnóstico, mantendo reavaliação conforme novos achados e evolução.';
            nivel='pendente'; textoDocumento=`${reg.nome}: avaliação em andamento, sem hipótese operacional definida pelos achados registrados.`;
        }
        resumoPorRegiao.push({regiao:reg.nome,hipotese,nivel,codigoHipotese:codigo,nomeHipotese:nome,hipotesesAssociadas:associadas,fenotipoOperacional:fen?.nome||'',textoDocumento,incertezaClinicaAceita:!!est.incertezaClinicaAceita,incertezaEspecifica:!!est.incertezaEspecifica,incertezaClinicaMotivo:est.incertezaClinicaMotivo||'',redFlags:rf,alertasTextuais:alertasTxt.map(a=>a.id),redflagConduta:est.redflagConduta||'',redflagJustificativa:est.redflagJustificativa||'',segurancaRevisada:!!est.redflagsRevisadas,auditoriaMotor:est.auditoriaMotor||null,sinteseClinica:sintese});
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
    const p=await obterPacienteCompletoPorId(pacienteId);renderResumoPaciente('resumo_paciente_relatorio',p);if(!p)return;const campo=document.getElementById('rel_comp_diagnostico');if(campo)campo.value=obterTextoDocumentalUltimaAvaliacao(p)||'Sem síntese clínica documental registrada.';
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
    const p=await obterPacienteCompletoPorId(id);if(!p){alert('Paciente não encontrado.');return;}
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

    const p = await obterPacienteCompletoPorId(pacienteId);
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
    const p=await obterPacienteCompletoPorId(pacienteId);
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

async function abrirAtendimentoDoPainel(pacienteId,tipo){if(!pacienteId)return;try{localStorage.setItem("kinesys_paciente_contexto",String(pacienteId));}catch(_){}await atualizarSelectsPacientes();if(tipo==="evolucao"){sincronizarSelectPacienteEvolucao(pacienteId);navegarPara("tela_evolucao");setTimeout(function(){carregarHistoricoEvolucao();},0);}else{pacienteAtualId=pacienteId;navegarPara("tela_avaliacao");}}
async function carregarPainelFisioterapeuta(){var card=document.getElementById("card_painel_fisioterapeuta");if(!card)return;var eh=String(usuarioLogado&&usuarioLogado.tipo||"").toUpperCase()==="FISIOTERAPEUTA";card.hidden=!eh;if(!eh||!_supabase)return;var resumo=document.getElementById("painel_fisio_resumo"),lista=document.getElementById("painel_fisio_lista"),iso=new Date().toISOString().slice(0,10);lista.innerHTML="";resumo.textContent="Carregando sua agenda…";const perfilInicial=usuarioLogado;try{if(typeof carregarProfissionaisAgenda!=="function"||!await carregarProfissionaisAgenda())throw new Error("Equipe indisponível");}catch(error){if(usuarioLogado===perfilInicial)resumo.textContent="Não foi possível verificar seu vínculo com a agenda. Tente novamente.";return;}if(usuarioLogado!==perfilInicial)return;var pid=typeof profissionalAgendaRestritoAtualId==="function"?profissionalAgendaRestritoAtualId():String(usuarioLogado.id||"");if(!pid){resumo.textContent="Vincule seu perfil a um profissional da agenda para ver os atendimentos.";return;}var q=await _supabase.from("agendamentos").select("id,paciente_id,hora_inicio,status,pacientes(id,nome)").eq("data",iso).eq("profissional_id",pid).neq("status","cancelado").order("hora_inicio");if(q.error){resumo.textContent="Não foi possível carregar sua agenda agora.";return;}var ps=await obterPacientesSalvos(),at=q.data||[],done=at.filter(function(a){return ["atendido","concluido"].includes(String(a.status||""));}).length;resumo.textContent=at.length?(at.length+" atendimento(s) hoje · "+done+" concluído(s)"):"Nenhum atendimento agendado para hoje.";lista.innerHTML=at.length?at.map(function(a){var p=ps.find(function(x){return String(x.id)===String(a.paciente_id);}),nome=a.pacientes&&a.pacientes.nome||p&&p.nome||"Paciente",has=!!p&&!!obterAvaliacaoFinalizadaMaisRecente(p),con=["atendido","concluido"].includes(String(a.status||""));return "<div class=\"ks-fisio-painel-item\"><div><strong>"+escapeHTML(String(a.hora_inicio||"").slice(0,5))+"</strong><span>"+escapeHTML(nome)+"</span><small>"+(con?"Registro finalizado":(has?"Avaliação já realizada":"Avaliação pendente"))+"</small></div>"+(con?"":"<button type=\"button\" class=\"btn-primary\" onclick=\"abrirAtendimentoDoPainel('"+escapeHTML(a.paciente_id)+"','"+(has?"evolucao":"avaliacao")+"')\">"+(has?"Realizar evolução":"Realizar avaliação")+"</button>")+"</div>";}).join(""):"<div class=\"ks-fisio-painel-vazio\">Tudo tranquilo por aqui. Nenhum atendimento previsto para hoje.</div>";}async function renderizarPendenciasClinicas(){const c=document.getElementById('lista_pendencias_clinicas');if(!c)return;const lista=await obterPacientesSalvos();const hoje=Date.now(),itens=[];for(const p of lista){const avs=obterAvaliacoes(p),av=obterAvaliacaoFinalizadaMaisRecente(p);const ras=avs.find(a=>a.status==='rascunho');if(ras)itens.push({n:p.nome,p:'Avaliação em rascunho',nivel:'alto'});if(!av)itens.push({n:p.nome,p:'Sem avaliação clínica finalizada',nivel:'alto'});if(av){const clin=av.mapeamento?.clinicaEstruturada||{};if(!(clin.psfs?.itens||[]).length)itens.push({n:p.nome,p:'PSFS não registrada',nivel:'baixo'});const objs=clin.objetivosPlano?.objetivos||[];if(objs.some(o=>!['atingido','nao_atingido'].includes(o.status||'')))itens.push({n:p.nome,p:'Objetivos terapêuticos em acompanhamento',nivel:'baixo'});const ro=clin.restricoesPosOperatorias;if(ro?.ativo&&!ro.retornoMedico)itens.push({n:p.nome,p:'Pós-operatório com restrição ativa e retorno médico não informado',nivel:'medio'});}
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

// Mantém o serviço local ativo somente enquanto a tela de Mídias está em uso.
document.addEventListener('kinesys:tela-ativada', event => {
    if (event.detail?.id === 'tela_midias') ativarLifecycleMidiasKineSys();
});
document.addEventListener('kinesys:tela-desativada', event => {
    if (event.detail?.id === 'tela_midias') suspenderLifecycleMidiasKineSys();
});

window.addEventListener('popstate', () => { const tela = window.location.hash.slice(1); if (usuarioLogado && tela && document.getElementById(tela) && telaPermitida(tela)) navegarPara(tela); });

/* KineSys — HMA: parser narrativo e motor clínico determinístico único. */
function kinesysDividirClausulasHMA(texto='') {
    const bruto = String(texto || '').replace(/\s+/g, ' ').trim();
    if (!bruto) return [];
    const separador = /[.;!?]+|\b(?:mas|por[eé]m|contudo|entretanto)\b/gi;
    const clausulas = [];
    let inicio = 0;
    let match;
    const adicionar = (fim, separadorEncontrado = '') => {
        const trechoBruto = bruto.slice(inicio, fim);
        const esquerda = trechoBruto.match(/^\s*/)?.[0]?.length || 0;
        const direita = trechoBruto.match(/\s*$/)?.[0]?.length || 0;
        const textoClausula = trechoBruto.slice(esquerda, Math.max(esquerda, trechoBruto.length - direita));
        if (textoClausula) {
            clausulas.push({
                id: 'C' + (clausulas.length + 1),
                texto: textoClausula,
                inicio: inicio + esquerda,
                fim: fim - direita,
                separadorPosterior: separadorEncontrado || ''
            });
        }
    };
    while ((match = separador.exec(bruto)) !== null) {
        adicionar(match.index, match[0]);
        inicio = separador.lastIndex;
        if (match[0].length === 0) separador.lastIndex++;
    }
    adicionar(bruto.length, '');
    return clausulas;
}

function confirmarLeituraHMAKineSys() {
    const box = document.getElementById('ks20_hma_radar');
    if (!box) return;
    box.dataset.confirmado = 'true';
    const btn = box.querySelector('button');
    if (btn) btn.textContent = 'Leitura confirmada';
    atualizarSinteseKinesys20();
}

function obterInsightsHMAKineSys() {
    const box = document.getElementById('ks20_hma_radar');
    const confirmado = box?.dataset.confirmado === 'true';
    try {
        const dados = JSON.parse(box?.dataset.fatos || '{}');
        if (!dados || Array.isArray(dados) || typeof dados !== 'object') throw new Error('Contrato HMA inválido');
        return {
            confirmado,
            ...dados,
            fatos: Array.isArray(dados.eventos) ? dados.eventos : []
        };
    } catch (_) {
        return { confirmado, fatos: [], eventos: [], achados: [], diferenciais: [], alertas: [] };
    }
}

function sugestaoKinesys20() {
    const insights = obterInsightsHMAKineSys();
    const principal = insights.suspeitaPrincipal || null;
    const local = insights.local && !/não definida|nao definida/.test(insights.local) ? insights.local : 'região informada';
    const eventoPrincipal = (insights.eventos || insights.fatos || []).find(f => f.status === 'presente' && f.tipo === 'sintoma');

    if (!principal && !eventoPrincipal) {
        return {
            dcf: 'Registre os achados funcionais e a conclusão do fisioterapeuta.',
            medica: 'Hipóteses médicas a investigar após história, exame e revisão de segurança.'
        };
    }

    const dcf = eventoPrincipal
        ? 'Quadro cinético-funcional com ' + eventoPrincipal.sintoma + ' em ' + (eventoPrincipal.local === 'não especificado' ? local : eventoPrincipal.local) + ', a correlacionar com limitações de atividade, carga e achados objetivos do exame.'
        : 'Quadro cinético-funcional em ' + local + ', a correlacionar com limitações de atividade, carga e achados objetivos do exame.';
    const medica = principal
        ? 'Hipótese principal a investigar: ' + principal.nome + '. Correlacionar com exame físico, diferenciais e alertas de segurança antes de concluir.'
        : 'Hipóteses médicas a investigar após história, exame e revisão de segurança.';
    return { dcf, medica };
}

function atualizarSinteseKinesys20() {
    const host = document.getElementById('subtela_diagnostico');
    if (!host) return;
    let card = document.getElementById('ks20_sintese_card');
    const s = sugestaoKinesys20();
    if (!card) {
        card = document.createElement('section');
        card.id = 'ks20_sintese_card';
        card.className = 'card kds-u-m-0-0-14px';
        card.innerHTML = '<div class="card-header"><div><span class="card-kicker">KINESYS 2.0</span><h2>Síntese de decisão clínica</h2><p>Revise e ajuste antes de concluir.</p></div></div><div class="input-group"><label>Diagnóstico cinético-funcional</label><textarea id="ks20_diagnostico_cinetico"></textarea></div><div class="input-group"><label>Hipótese diagnóstica médica a investigar</label><textarea id="ks20_hipotese_medica"></textarea></div><small>O KineSys organiza evidências; a conclusão e qualquer encaminhamento permanecem sob decisão profissional.</small>';
        host.insertBefore(card, host.firstChild);
    }
    const d = document.getElementById('ks20_diagnostico_cinetico');
    const m = document.getElementById('ks20_hipotese_medica');
    if (d && !d.dataset.editado) d.value = s.dcf;
    if (m && !m.dataset.editado) m.value = s.medica;
    [d, m].forEach(el => el?.addEventListener('input', () => el.dataset.editado = 'true', { once: true }));
}

let kinesysHmaTempoRealTimer = null;
let kinesysHmaUltimaAssinatura = null;
function assinaturaHMAKineSys(valor='') {
    return String(valor || '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase()
        .replace(/[^a-z0-9\s]/g,' ').replace(/\bencima\b/g,'em cima').replace(/\s+/g,' ').trim();
}
function executarHMAEmTempoRealKineSys(forcar=false) {
    const campo = document.getElementById('paciente_hma');
    if (!campo) return;
    const assinatura = assinaturaHMAKineSys(campo.value);
    if (!forcar && assinatura === kinesysHmaUltimaAssinatura) return;
    kinesysHmaUltimaAssinatura = assinatura;
    if (typeof window.renderizarRadarHMAKineSys === 'function') window.renderizarRadarHMAKineSys();
    if (typeof processarRadarEmTempoReal === 'function') processarRadarEmTempoReal();
    const origem = document.getElementById('paciente_origem_irradiacao')?.value || '';
    const destino = document.getElementById('paciente_irradiacao')?.value || '';
    if ((origem || destino) && typeof renderizarAnaliseIrradiacao === 'function') renderizarAnaliseIrradiacao();
}
function agendarHMAEmTempoRealKineSys(atraso=300, forcar=false) {
    clearTimeout(kinesysHmaTempoRealTimer);
    kinesysHmaTempoRealTimer = setTimeout(() => executarHMAEmTempoRealKineSys(forcar), atraso);
}
document.addEventListener('input', e => {
    if (e.target?.id !== 'paciente_hma') return;
    const box = document.getElementById('ks20_hma_radar');
    if (box) box.dataset.confirmado = 'false';
    if (e.isComposing) return;
    agendarHMAEmTempoRealKineSys(300, false);
});
document.addEventListener('compositionend', e => {
    if (e.target?.id === 'paciente_hma') agendarHMAEmTempoRealKineSys(80, true);
});
document.addEventListener('focusout', e => {
    if (e.target?.id === 'paciente_hma') agendarHMAEmTempoRealKineSys(40, false);
}, true);
document.addEventListener('click', e => {
    if (e.target?.id === 'step_indicador_3' || e.target?.textContent?.includes('Ver resumo e laudo')) setTimeout(atualizarSinteseKinesys20, 80);
});

(function () {
  'use strict';

  var VERSAO_MOTOR_HMA = '11.1.1-flexao-profunda-topografia-joelho';
  window.KINESYS_HMA_ENGINE_VERSION = VERSAO_MOTOR_HMA;

  var LEXICO = {
  "toracica": [
    "coluna torácica",
    "coluna toracica",
    "região torácica",
    "regiao toracica",
    "meio das costas",
    "entre as escápulas",
    "entre as escapulas",
    "dor na dorsal",
    "dor torácica posterior",
    "dor entre as omoplatas",
    "dor na parte alta das costas",
    "dor torácica",
    "dor toracica"
  ],
  "costal": [
    "costela",
    "arco costal",
    "dor ao respirar fundo",
    "dor ao tossir",
    "dor ao espirrar",
    "dor na costela",
    "dor ao encher o pulmão",
    "pontada ao respirar",
    "dor ao girar o tronco"
  ],
  "cardiopulmonar": [
    "dor no peito",
    "opressão no peito",
    "opressao no peito",
    "falta de ar",
    "dispneia",
    "suor frio",
    "desmaio",
    "aperto no peito",
    "peso no peito",
    "cansaço para respirar",
    "fôlego curto",
    "palpitação com mal estar",
    "dor torácica com esforço"
  ],
  "riscoFratura": [
    "osteoporose",
    "uso de corticoide",
    "corticoide prolongado",
    "trauma leve",
    "fratura por fragilidade",
    "osso fraco",
    "baixa densidade óssea",
    "queda da própria altura",
    "histórico de fratura vertebral",
    "tratamento prolongado com corticoide"
  ],
  "inflamatoria": [
    "melhora com movimento",
    "piora em repouso",
    "acorda na segunda metade da noite",
    "dor alternada nas nádegas",
    "dor alternada nas nadegas",
    "rigidez por mais de trinta minutos",
    "rigidez matinal prolongada",
    "melhora ao se exercitar",
    "dor glútea alternante",
    "piora parado",
    "dor noturna que melhora ao levantar"
  ],
  "sacroiliaca": [
    "sacroiliaca",
    "sacroilíaca",
    "perto da covinha",
    "posterior da pelve",
    "dor de um lado no gluteo",
    "dor na articulação sacroilíaca",
    "dor abaixo da cintura de um lado",
    "dor junto ao sacro",
    "dor unilateral na pelve posterior",
    "covinha da pelve",
    "junto à covinha da pelve",
    "junto a covinha da pelve",
    "covinha da bacia"
  ],
  "transferencia": [
    "virar na cama",
    "levantar da cadeira",
    "entrar no carro",
    "sair do carro",
    "subir escada",
    "dor ao rolar na cama",
    "dor ao levantar do sofá",
    "dor ao entrar no automóvel",
    "dor ao apoiar para vestir roupa"
  ],
  "adutor": [
    "adutor",
    "parte interna da coxa",
    "virilha ao chutar",
    "dor ao apertar as pernas",
    "dor na virilha ao fechar as pernas",
    "dor medial da coxa",
    "puxão na virilha",
    "dor ao mudar de direção",
    "adutores",
    "dor nos adutores",
    "dor dos adutores",
    "dor ao contrair adutores"
  ],
  "isquiotibial": [
    "posterior da coxa",
    "isquiotibial",
    "atrás da coxa",
    "atras da coxa",
    "puxou posterior da coxa",
    "estiramento posterior da coxa",
    "dor abaixo do glúteo",
    "dor ao acelerar"
  ],
  "corridaRapida": [
    "arrancada",
    "sprint",
    "corrida rápida",
    "corrida rapida",
    "aceleração",
    "aceleracao",
    "tiro de corrida",
    "corrida em velocidade",
    "arranque",
    "chute forte",
    "desaceleração rápida"
  ],
  "tibiaMedial": [
    "borda interna da tíbia",
    "borda interna da tibia",
    "canela por dentro",
    "dor difusa na canela",
    "canelite",
    "dor espalhada na borda medial da tíbia",
    "dor ao longo da canela",
    "sensibilidade extensa na canela",
    "dor medial da tíbia",
    "dor medial da tibia",
    "sensibilidade na borda medial da tíbia",
    "sensibilidade na borda medial da tibia"
  ],
  "tibiaFocal": [
    "ponto específico na tíbia",
    "ponto especifico na tibia",
    "dor focal na canela",
    "dor em um ponto do osso",
    "dor pontual na tíbia",
    "dor bem localizada na canela",
    "sensibilidade óssea focal",
    "dor localizada ao saltar",
    "ponto ósseo na tíbia",
    "ponto osseo na tibia",
    "pequeno ponto ósseo doloroso",
    "pequeno ponto osseo doloroso"
  ],
  "pernaExercicio": [
    "pressão na perna ao correr",
    "pressao na perna ao correr",
    "perna endurece ao correr",
    "dor previsível com exercício",
    "dor previsivel com exercicio",
    "perna fica dura durante corrida",
    "queimação previsível na perna",
    "formigamento durante exercício",
    "alivia poucos minutos após parar",
    "tensão na perna durante corrida",
    "tensao na perna durante corrida",
    "dor e tensão na perna durante corrida",
    "dor e tensao na perna durante corrida",
    "sintomas previsíveis durante corrida",
    "sintomas previsiveis durante corrida"
  ],
  "cervical": [
    "cervical",
    "pescoço",
    "pescoco",
    "nuca",
    "coluna cervical",
    "dor cervical",
    "dor no pescoço",
    "pescoço travado",
    "dor cervicotorácica"
  ],
  "irradiacaoBraco": [
    "irradia para o braço",
    "irradia para o braco",
    "desce para o braço",
    "desce para o braco",
    "dor no braço",
    "dor no braco",
    "vai para a mão",
    "vai para a mao",
    "dor vai para o braço",
    "dor corre pelo braço",
    "irradia até a mão",
    "irradia ate a mao",
    "dor desce até os dedos",
    "dor desce ate os dedos",
    "dor do pescoço para o braço",
    "dor do ombro para a mão",
    "dor do ombro para a mao",
    "dor do ombro até a mão",
    "dor do ombro ate a mao",
    "desce do ombro para a mão",
    "desce do ombro para a mao",
    "desce para a mão",
    "desce para a mao",
    "desce para o cotovelo",
    "desce para cotovelo",
    "ombro até a mão",
    "ombro ate a mao",
    "desce pelo braço",
    "desce pelo braco",
    "desce pelo braço até o polegar",
    "desce pelo braco ate o polegar",
    "do pescoço até o polegar",
    "do pescoco ate o polegar",
    "cervical até a mão",
    "cervical ate a mao",
    "irradia para os braços",
    "irradia para os bracos",
    "irradia para as mãos",
    "irradia para as maos",
    "desce para os braços",
    "desce para os bracos",
    "vai para os braços",
    "vai para os bracos",
    "dor pega o braço inteiro",
    "dor pega o braco inteiro",
    "pega o braço inteiro",
    "pega o braco inteiro",
    "dor sai do pescoço e vai para o braço",
    "dor sai do pescoco e vai para o braco",
    "vem do pescoço para o braço",
    "vem do pescoco para o braco"
  ],
  "cefaleiaCervical": [
    "dor de cabeça",
    "dor de cabeca",
    "cefaleia",
    "dor na nuca",
    "dor de cabeça começando na nuca",
    "cefaleia de um lado",
    "dor sobe da nuca",
    "dor de cabeça ao mexer o pescoço"
  ],
  "mielopatia": [
    "desequilibrio ao andar",
    "mãos desajeitadas",
    "maos desajeitadas",
    "perda de destreza",
    "fraqueza nas duas pernas",
    "choques ao flexionar o pescoço",
    "dificuldade com botões",
    "deixa objetos cair",
    "marcha instável",
    "pernas pesadas e mãos fracas",
    "alteração de equilíbrio e destreza"
  ],
  "ombro": [
    "ombro",
    "manguito rotador",
    "subacromial",
    "deltoide",
    "dor no ombro",
    "articulação do ombro",
    "região deltoidea",
    "dor no braço perto do ombro"
  ],
  "elevacaoBraco": [
    "elevar o braço",
    "elevar o braco",
    "levantar o braço",
    "levantar o braco",
    "alcançar acima",
    "alcancar acima",
    "pentear o cabelo",
    "dor ao colocar objeto no alto",
    "dor ao vestir camiseta",
    "arco doloroso",
    "dor acima da cabeça",
    "dor ao alcançar prateleira",
    "dor ao elevar o braço com peso",
    "dor ao elevar o braco com peso",
    "piora ao elevar o braço",
    "piora ao elevar o braco",
    "dor no ombro ao elevar",
    "piora no ombro ao elevar",
    "dor ao elevar o membro superior",
    "piora ao elevar o membro superior",
    "elevação do braço",
    "elevacao do braco"
  ],
  "decubitoOmbro": [
    "dormir em cima do ombro",
    "dormir encima do ombro",
    "dormir sobre o ombro",
    "deitar em cima do ombro",
    "deitar encima do ombro",
    "deitar sobre o ombro",
    "dorme em cima do ombro",
    "deita em cima do ombro",
    "dormir em cima do braço",
    "dormir encima do braço",
    "dormir sobre o braço",
    "deitar em cima do braço",
    "deitar encima do braço",
    "deitar sobre o braço",
    "dorme em cima do braço",
    "deita em cima do braço",
    "piora ao dormir de lado sobre o ombro",
    "piora ao deitar de lado sobre o ombro",
    "não consegue dormir sobre o ombro",
    "nao consegue dormir sobre o ombro",
    "dor quando apoia o ombro na cama",
    "dor ao apoiar o ombro na cama"
  ],
  "provocacaoOmbro": [
    "movimentar o ombro",
    "mexer o ombro",
    "mover o ombro",
    "movimento do ombro piora",
    "piora ao movimentar o ombro",
    "piora ao mexer o ombro",
    "piora quando mexe o ombro",
    "dor ao movimentar o ombro",
    "dor ao mexer o ombro"
  ],
  "rotacaoOmbro": [
    "mão nas costas",
    "mao nas costas",
    "vestir camisa",
    "abotoar sutiã",
    "abotoar sutia",
    "rotação externa",
    "rotacao externa",
    "dificuldade para prender sutiã",
    "dificuldade para colocar a mão atrás",
    "dor ao vestir casaco",
    "não alcança as costas",
    "rotação do ombro limitada",
    "rotacao do ombro limitada",
    "limitação da rotação do ombro",
    "limitacao da rotacao do ombro"
  ],
  "rigidezOmbro": [
    "ombro rígido",
    "ombro rigido",
    "perdeu movimento do ombro",
    "não consegue mexer o ombro",
    "nao consegue mexer o ombro",
    "ombro congelado",
    "movimento do ombro muito limitado",
    "perda progressiva da amplitude",
    "ombro preso",
    "ombro ficou rígido",
    "ombro ficou rigido",
    "ombro rígido progressivamente",
    "ombro rigido progressivamente",
    "ficou rígido progressivamente",
    "ficou rigido progressivamente",
    "ficando progressivamente rígido",
    "ficando progressivamente rigido",
    "progressivamente rígido no ombro",
    "progressivamente rigido no ombro"
  ],
  "traumaOmbro": [
    "caiu sobre o ombro",
    "queda sobre o braço",
    "queda sobre o braco",
    "luxação do ombro",
    "luxacao do ombro",
    "impacto direto no ombro",
    "queda com mão apoiada",
    "ombro saiu do lugar",
    "pancada no ombro"
  ],
  "instabilidadeOmbro": [
    "ombro sai do lugar",
    "ombro desloca",
    "apreensão no ombro",
    "apreensao no ombro",
    "sensação de soltar",
    "sensacao de soltar",
    "sensação de que o ombro vai sair",
    "sensação de que vai sair",
    "parece que vai deslocar",
    "medo ao armar o braço",
    "subluxação recorrente",
    "ombro frouxo",
    "ombro parece que vai sair",
    "episódios prévios de subluxação",
    "episodios previos de subluxacao",
    "episódios de subluxação",
    "episodios de subluxacao"
  ],
  "acromioclavicular": [
    "topo do ombro",
    "articulação acromioclavicular",
    "articulacao acromioclavicular",
    "dor ao cruzar o braço",
    "dor ao cruzar o braco",
    "dor sobre a clavícula",
    "dor na ponta do ombro",
    "dor ao abraçar",
    "dor na articulação ac"
  ],
  "cotoveloLateral": [
    "lado de fora do cotovelo",
    "epicondilo lateral",
    "epicôndilo lateral",
    "cotovelo de tenista",
    "dor lateral no cotovelo",
    "dor no epicôndilo lateral",
    "dor externa do cotovelo",
    "dor ao estender o punho",
    "parte de fora do cotovelo",
    "dor na parte de fora do cotovelo"
  ],
  "preensao": [
    "apertar",
    "segurar objeto",
    "abrir pote",
    "carregar sacola",
    "preensão",
    "preensao",
    "dor ao apertar a mão",
    "dor ao segurar xícara",
    "dor ao torcer pano",
    "perde força para pegar objetos",
    "dor ao usar alicate"
  ],
  "punhoMao": [
    "punho",
    "mão",
    "mao",
    "polegar",
    "indicador",
    "carpo",
    "canal do carpo",
    "estiloide radial",
    "estiloide ulnar",
    "radio distal",
    "ulna distal",
    "dor no punho",
    "dor na mão",
    "sintoma nos dedos",
    "formigamento na mão"
  ],
  "mediano": [
    "três primeiros dedos",
    "tres primeiros dedos",
    "formigamento no polegar e indicador",
    "formigamento no polegar indicador e médio",
    "formigamento no polegar indicador e medio",
    "dormência nos três primeiros dedos",
    "dormencia nos tres primeiros dedos",
    "choque no dedo médio",
    "choque no dedo medio",
    "polegar indicador e médio adormecem",
    "polegar indicador e medio adormecem",
    "polegar indicador e médio dormem",
    "polegar indicador e medio dormem",
    "polegar indicador e dedo médio ficam dormentes",
    "polegar indicador e dedo medio ficam dormentes",
    "polegar indicador e médio ficam dormentes",
    "polegar indicador e medio ficam dormentes",
    "dormência em polegar indicador e médio",
    "dormencia em polegar indicador e medio",
    "formigamento em polegar indicador e médio",
    "formigamento em polegar indicador e medio",
    "dormência no polegar indicador e médio",
    "dormencia no polegar indicador e medio"
  ],
  "poupaDedoMinimo": [
    "poupa o dedo mínimo",
    "poupa o dedo minimo",
    "não pega o dedo mínimo",
    "nao pega o dedo minimo",
    "não chega no dedo mínimo",
    "nao chega no dedo minimo",
    "sem sintomas no dedo mínimo",
    "sem sintomas no dedo minimo",
    "dedo mínimo poupado",
    "dedo minimo poupado"
  ],
  "noturnoMao": [
    "acorda com a mão dormente",
    "acorda com a mao dormente",
    "formigamento na mão à noite",
    "formigamento na mao a noite",
    "formigamento nos dedos à noite",
    "formigamento nos dedos a noite",
    "sacode a mão",
    "sacode a mao",
    "mão adormece de madrugada",
    "acorda sacudindo a mão",
    "piora noturna na mão",
    "mão adormece à noite",
    "mao adormece a noite",
    "dedos adormecem à noite",
    "dedos adormecem a noite",
    "dormência nos dedos à noite",
    "dormencia nos dedos a noite",
    "polegar indicador e dedo médio ficam dormentes à noite",
    "polegar indicador e dedo medio ficam dormentes a noite",
    "três primeiros dedos ficam dormentes à noite",
    "tres primeiros dedos ficam dormentes a noite",
    "dedos da mão ficam dormentes à noite",
    "dedos da mao ficam dormentes a noite",
    "dormência em polegar indicador e médio à noite",
    "dormencia em polegar indicador e medio a noite",
    "polegar indicador e médio dormentes à noite",
    "polegar indicador e medio dormentes a noite"
  ],
  "alivioSacudirMao": [
    "melhora ao sacudir a mão",
    "melhora ao sacudir a mao",
    "alivia ao sacudir a mão",
    "alivia ao sacudir a mao",
    "formigamento melhora ao sacudir a mão",
    "formigamento melhora ao sacudir a mao",
    "dormência melhora ao sacudir a mão",
    "dormencia melhora ao sacudir a mao",
    "sacudir a mão alivia",
    "sacudir a mao alivia",
    "melhora sacudindo a mão",
    "melhora sacudindo a mao",
    "alivia sacudindo a mão",
    "alivia sacudindo a mao"
  ],
  "polegarRadial": [
    "base do polegar",
    "lado do polegar no punho",
    "punho radial",
    "primeiro compartimento",
    "dor no lado radial do punho",
    "dor ao mover o polegar",
    "dor perto do estiloide radial",
    "dor ao segurar bebê"
  ],
  "perdaForcaAgudaOmbro": [
    "não consegue levantar o braço após queda",
    "nao consegue levantar o braco apos queda",
    "fraqueza súbita no ombro",
    "fraqueza subita no ombro",
    "braço caiu após trauma",
    "incapaz de elevar após queda",
    "perdeu força imediatamente no ombro",
    "não sustenta o braço"
  ],
  "whiplash": [
    "acidente de carro",
    "colisão traseira",
    "colisao traseira",
    "efeito chicote",
    "batida de automóvel",
    "batida de automovel",
    "cabeça foi para frente e para trás",
    "cabeca foi para frente e para tras"
  ],
  "bicepsOmbro": [
    "dor na frente do ombro",
    "dor no sulco bicipital",
    "dor ao carregar com palma para cima",
    "dor ao flexionar o cotovelo",
    "dor no tendão do bíceps",
    "dor no tendao do biceps"
  ],
  "rupturaManguito": [
    "não consegue elevar o braço após trauma",
    "nao consegue elevar o braco apos trauma",
    "não consegue elevar o braço",
    "nao consegue elevar o braco",
    "incapaz de levantar o braço depois da queda",
    "braço despenca ao baixar",
    "braco despenca ao baixar",
    "fraqueza súbita para elevar",
    "perda de força após queda"
  ],
  "trajetoAlemCotovelo": [
    "dor que desce até o antebraço",
    "dor que desce ate o antebraco",
    "dor que vai até a mão",
    "dor que vai ate a mao",
    "formigamento que desce até os dedos",
    "formigamento que desce ate os dedos",
    "dor que passa do cotovelo",
    "dor até os dedos da mão",
    "dor ate os dedos da mao",
    "do ombro até a mão",
    "do ombro ate a mao",
    "ombro até a mão",
    "ombro ate a mao",
    "cotovelo até a mão",
    "cotovelo ate a mao",
    "do cotovelo até a mão",
    "do cotovelo ate a mao",
    "desce do ombro para a mão",
    "desce do ombro para a mao",
    "desce para o cotovelo até a mão",
    "desce para o cotovelo ate a mao",
    "desce para cotovelo até mão",
    "desce para cotovelo ate mao",
    "até o polegar",
    "ate o polegar",
    "chega ao polegar",
    "chega no polegar",
    "desce pelo braço até o polegar",
    "desce pelo braco ate o polegar",
    "chega à mão",
    "chega a mao",
    "chega nos dedos",
    "chega na mão",
    "chega na mao",
    "chega nas mãos",
    "chega nas maos",
    "vai até a mão",
    "vai ate a mao",
    "passa pelo cotovelo",
    "passa do cotovelo e chega na mão",
    "passa do cotovelo e chega na mao",
    "pega o braço inteiro e chega na mão",
    "pega o braco inteiro e chega na mao",
    "corre pelo braço e chega nos dedos",
    "corre pelo braco e chega nos dedos"
  ],
  "trajetoRestritoOmbro": [
    "dor que fica no ombro e braço proximal",
    "dor que não passa do cotovelo",
    "dor que nao passa do cotovelo",
    "não passa do cotovelo",
    "nao passa do cotovelo",
    "dor que não desce além do cotovelo",
    "dor limitada ao ombro e parte superior do braço"
  ],
  "dermatomaMaoEspecifico": [
    "formigamento no polegar e indicador",
    "formigamento no dedo mínimo",
    "dormência em dedos específicos",
    "formigamento em um dedo específico",
    "quinto dedo formiga",
    "dedo mínimo formiga",
    "dedo minimo formiga",
    "polegar formiga",
    "formiga o polegar",
    "formigamento no polegar",
    "formigamento no dedo médio",
    "formigamento no dedo medio",
    "dormência no polegar",
    "dormencia no polegar",
    "dormência no dedo mínimo",
    "dormencia no dedo minimo"
  ],
  "pioraMovimentoPescoco": [
    "piora ao virar o pescoço",
    "piora ao mexer o pescoço",
    "piora ao olhar para os lados",
    "piora ao inclinar a cabeça"
  ],
  "posturaCervical": [
    "trabalha muito tempo no computador",
    "fica muito tempo com a cabeça baixa no celular",
    "postura mantida no trabalho",
    "muitas horas sentado olhando para tela"
  ],
  "inicioInsidiosoCervical": [
    "dor cervical começou aos poucos",
    "dor no pescoço sem trauma",
    "dor cervical sem motivo aparente",
    "dor no pescoço há semanas sem trauma"
  ],
  "torcicoloAgudo": [
    "não consegue mexer o pescoço",
    "nao consegue mexer o pescoco",
    "pescoço travou de repente",
    "pescoco travou de repente",
    "trava súbita do pescoço",
    "pescoço preso ao acordar"
  ],
  "inicioAoAcordarCervical": [
    "acordou com dor no pescoço",
    "dor cervical começou ao acordar",
    "dormiu bem e acordou com o pescoço travado"
  ],
  "cronicaCervical": [
    "dor cervical há meses",
    "dor no pescoço há anos",
    "cervicalgia crônica",
    "dor cervical de longa data"
  ],
  "trapezioSuperior": [
    "dor na região do trapézio",
    "dor entre o pescoço e o ombro",
    "dor no trapézio superior",
    "peso sobre os ombros e pescoço"
  ],
  "pontoGatilhoCervical": [
    "ponto doloroso ao apertar o trapézio",
    "nó muscular dolorido no pescoço",
    "ponto de gatilho no trapézio",
    "dor reproduzida ao pressionar músculo cervical"
  ],
  "instabilidadeCervical": [
    "sensação de cabeça pesada após trauma cervical",
    "sensação de instabilidade no pescoço",
    "medo de movimentar o pescoço após trauma",
    "dor cervical com sensação de falha"
  ],
  "elevadorEscapula": [
    "dor no ângulo superior da escápula",
    "dor entre a borda da escápula e o pescoço",
    "dor ao virar a cabeça para o lado oposto",
    "ponto doloroso no elevador da escápula"
  ],
  "esforcoCervical": [
    "movimento brusco do pescoço",
    "girou rápido o pescoço",
    "torceu o pescoço de repente",
    "esforço súbito e dor cervical"
  ],
  "occipitalUnilateral": [
    "dor na nuca de um lado",
    "dor atrás da cabeça de um lado",
    "dor occipital unilateral"
  ],
  "nervoOccipital": [
    "choque na nuca ao tocar",
    "pontada atrás da cabeça ao pressionar",
    "dor elétrica no trajeto occipital",
    "couro cabeludo sensível atrás da cabeça"
  ],
  "tonturaCervical": [
    "tontura ao mexer o pescoço",
    "tontura junto com dor cervical",
    "desequilíbrio relacionado ao movimento cervical"
  ],
  "desfiladeiroToracico": [
    "formigamento ao manter os braços elevados",
    "mão fica dormente com braço acima da cabeça",
    "peso no braço ao pentear o cabelo",
    "sintomas no braço no teste de elevação sustentada",
    "formigamento na mão com braço acima da cabeça",
    "formigamento na mao com braco acima da cabeca",
    "formigamento na mão ao elevar o braço acima da cabeça",
    "formigamento na mao ao elevar o braco acima da cabeca",
    "peso no braço com braço elevado",
    "peso no braco com braco elevado",
    "peso no braço acima da cabeça",
    "peso no braco acima da cabeca",
    "mão formiga quando eleva o braço",
    "mao formiga quando eleva o braco"
  ],
  "cotoveloMedial": [
    "dor medial no cotovelo",
    "dor na parte de dentro do cotovelo",
    "epicôndilo medial",
    "epicondilo medial",
    "cotovelo de golfista",
    "dor ao flexionar o punho"
  ],
  "nervoUlnar": [
    "choque no cotovelo para a mão",
    "choque no cotovelo para a mao",
    "formigamento no dedo mínimo",
    "formigamento no dedo minimo",
    "formigamento no anelar",
    "piora com cotovelo dobrado",
    "piora apoiando o cotovelo",
    "quarto e quinto dedos formigam",
    "quarto e quinto dedos dormem",
    "quinto dedo formiga",
    "quando apoia o cotovelo",
    "mantém o cotovelo dobrado",
    "mantem o cotovelo dobrado"
  ],
  "punhoUlnar": [
    "dor do lado do dedo mínimo no punho",
    "dor do lado do dedo minimo no punho",
    "dor ulnar no punho",
    "dor ao girar chave",
    "clique no punho ao rodar",
    "dor ao apoiar a mão no punho"
  ],
  "mecanicoPunhoUlnar": [
    "dor ao girar chave",
    "clique no punho ao rodar",
    "clique ao rodar",
    "clique ao girar",
    "dor ao apoiar a mão no punho",
    "dor ao apoiar a mao no punho",
    "dor ao apoiar a mão",
    "dor ao apoiar a mao",
    "clique ulnar ao girar o punho",
    "dor ulnar ao girar o punho",
    "clique do lado do dedo mínimo ao rodar o punho",
    "clique do lado do dedo minimo ao rodar o punho"
  ],
  "flexorQuadril": [
    "dor anterior do quadril ao levantar a coxa",
    "dor ao levantar a coxa",
    "dor ao subir a perna",
    "dor ao flexionar o quadril",
    "piora ao levar o joelho ao peito",
    "dor no iliopsoas",
    "estalido anterior no quadril"
  ],
  "quadrilMecanico": [
    "clique profundo no quadril",
    "travamento no quadril",
    "ressalto no quadril",
    "sensação de prender na virilha",
    "sensacao de prender na virilha"
  ],
  "irradiacaoLateralAteJoelhoQuadril": [
    "dor pela lateral da coxa até o joelho",
    "dor pela lateral da coxa ate o joelho",
    "dor lateral da coxa até o joelho",
    "dor lateral da coxa ate o joelho",
    "irradia pela lateral da coxa",
    "irradia pela lateral da coxa até o joelho",
    "irradia pela lateral da coxa ate o joelho",
    "desce pela lateral da coxa",
    "desce pela lateral da coxa até o joelho",
    "desce pela lateral da coxa ate o joelho",
    "dor do quadril pela lateral da coxa",
    "dor do trocânter até o joelho",
    "dor do trocanter ate o joelho",
    "puxa para a lateral da coxa até o joelho",
    "puxa para a lateral da coxa ate o joelho",
    "vai pela lateral da coxa até o joelho",
    "vai pela lateral da coxa ate o joelho"
  ],
  "isquioProximal": [
    "dor no osso ao sentar",
    "dor na tuberosidade isquiática",
    "dor na tuberosidade isquiatica",
    "dor abaixo do glúteo ao sentar",
    "dor proximal dos isquiotibiais"
  ],
  "ligamentoMedialJoelho": [
    "trauma em valgo",
    "pancada por fora do joelho",
    "dor no ligamento medial",
    "dor interna após contato lateral",
    "entorse medial do joelho"
  ],
  "ligamentoLateralJoelho": [
    "trauma em varo",
    "pancada por dentro do joelho",
    "dor no ligamento lateral",
    "dor externa após contato medial",
    "entorse lateral do joelho"
  ],
  "tratoIliotibial": [
    "dor lateral do joelho ao correr",
    "dor na banda iliotibial",
    "piora correndo em descida",
    "dor externa repetitiva na corrida",
    "dor após alguns quilômetros",
    "lateral do joelho durante corrida em descida",
    "dor somente na lateral do joelho durante corrida em descida"
  ],
  "pataGanso": [
    "dor abaixo da linha medial do joelho",
    "dor no joelho abaixo da linha medial",
    "dor abaixo da interlinha medial",
    "dor na pata de ganso",
    "dor medial abaixo do joelho",
    "dor interna abaixo do joelho",
    "sensibilidade na tíbia medial proximal",
    "dor ao subir escada na parte interna"
  ],
  "cistoPopliteo": [
    "caroço atrás do joelho",
    "caroco atras do joelho",
    "inchaço atrás do joelho",
    "inchaco atras do joelho",
    "pressão na fossa poplítea",
    "pressao na fossa poplitea"
  ],
  "sindesmose": [
    "dor acima do tornozelo",
    "dor acima da articulação do tornozelo",
    "dor no tornozelo acima da articulação",
    "entorse alta do tornozelo",
    "dor ao girar o pé para fora",
    "dor com rotação externa do pé",
    "dor entre tíbia e fíbula",
    "dor entre tibia e fibula"
  ],
  "provocacaoSindesmose": [
    "dor ao girar o pé para fora",
    "dor com rotação externa do pé",
    "rotação externa do pé piora a dor",
    "rotacao externa do pe piora a dor",
    "dor acima do tornozelo ao girar o pé para fora",
    "dor entre tíbia e fíbula ao girar o pé para fora",
    "piora com rotação externa do pé",
    "piora com rotacao externa do pe",
    "rotação externa do pé piora",
    "rotacao externa do pe piora"
  ],
  "tibialPosterior": [
    "dor atrás do maléolo medial",
    "dor atras do maleolo medial",
    "dor no arco medial do pé",
    "arco do pé caindo",
    "dificuldade para elevar o calcanhar em uma perna",
    "pé achatando ao apoiar",
    "dor no arco medial",
    "dor no arco medial com dificuldade para elevar o calcanhar",
    "dificuldade para elevar o calcanhar"
  ],
  "insuficienciaTibialPosterior": [
    "arco do pé caindo",
    "pé achatando ao apoiar",
    "dificuldade para elevar o calcanhar em uma perna",
    "não consegue elevar o calcanhar em uma perna",
    "nao consegue elevar o calcanhar em uma perna",
    "não consegue ficar na ponta do pé com uma perna",
    "nao consegue ficar na ponta do pe com uma perna",
    "dificuldade para elevar o calcanhar",
    "perda de força para elevar o calcanhar",
    "perda de forca para elevar o calcanhar"
  ],
  "fibulares": [
    "dor atrás do maléolo lateral",
    "dor atras do maleolo lateral",
    "dor no tornozelo atrás do maléolo lateral",
    "dor lateral atrás do maléolo",
    "dor ao virar o pé para fora",
    "dor ao evertir o pé",
    "dor nos tendões fibulares",
    "estalo lateral no tornozelo"
  ],
  "instabilidadeFibulares": [
    "estalo lateral no tornozelo",
    "tendão fibular estala atrás do maléolo lateral",
    "tendao fibular estala atras do maleolo lateral",
    "subluxação dos tendões fibulares",
    "subluxacao dos tendoes fibulares",
    "tendão fibular sai do lugar atrás do maléolo",
    "tendao fibular sai do lugar atras do maleolo"
  ],
  "metatarsoFocal": [
    "dor focal no metatarso",
    "dor em um ponto no peito do pé",
    "dor óssea no antepé",
    "dor ao saltar no antepé",
    "dor no segundo metatarso"
  ],
  "morton": [
    "queimação entre os dedos",
    "queimacao entre os dedos",
    "pedrinha dentro do sapato",
    "dor entre terceiro e quarto dedos",
    "choque no antepé",
    "piora com sapato apertado"
  ],
  "traumaMediope": [
    "trauma no mediopé",
    "trauma no mediope",
    "entorse no mediopé",
    "entorse no mediope",
    "torção no meio do pé",
    "torcao no meio do pe",
    "machucou o meio do pé após trauma",
    "machucou o meio do pe apos trauma",
    "dor no meio do pé após trauma",
    "dor no meio do pe apos trauma"
  ],
  "lisfranc": [
    "equimose na sola do pé",
    "equimose na sola do pe",
    "equimose plantar",
    "hematoma plantar",
    "hematoma na sola do pé",
    "hematoma na sola do pe",
    "dor intensa no meio do pé após trauma",
    "dor intensa no meio do pe apos trauma"
  ],
  "sinalEspecificoLisfranc": [
    "equimose na sola do pé",
    "equimose na sola do pe",
    "equimose plantar",
    "hematoma plantar",
    "hematoma na sola do pé",
    "hematoma na sola do pe"
  ],
  "rupturaAquilesAguda": [
    "estalo no aquiles",
    "estalo no tendão de aquiles",
    "estalo no tendao de aquiles",
    "sentiu um chute atrás do tornozelo",
    "sensação de chute atrás do tornozelo",
    "sensacao de chute atras do tornozelo",
    "falha na impulsão após estalo no aquiles",
    "falha na impulsao apos estalo no aquiles",
    "não consegue ficar na ponta do pé após lesão no aquiles",
    "nao consegue ficar na ponta do pe apos lesao no aquiles",
    "não consigo ficar na ponta do pé após lesão no aquiles",
    "nao consigo ficar na ponta do pe apos lesao no aquiles",
    "não consegue elevar o calcanhar após estalo no aquiles",
    "nao consegue elevar o calcanhar apos estalo no aquiles",
    "pedrada atrás do tornozelo",
    "pedrada atras do tornozelo",
    "pareceu uma pedrada atrás do tornozelo",
    "pareceu uma pedrada atras do tornozelo",
    "não consegue ficar na ponta do pé",
    "nao consegue ficar na ponta do pe",
    "não consigo ficar na ponta do pé",
    "nao consigo ficar na ponta do pe",
    "estalo atrás do tornozelo",
    "estalo atras do tornozelo",
    "perda de impulsão",
    "perda de impulsao",
    "piora da impulsão",
    "piora da impulsao"
  ],
  "alivioFlexaoLombar": [
    "melhora ao sentar",
    "alivia ao sentar",
    "melhora sentado",
    "melhora ao inclinar para frente",
    "alivia ao inclinar para frente",
    "melhora curvado para frente",
    "melhora apoiando no carrinho",
    "melhora ao apoiar no carrinho"
  ],
  "centralizacaoLombar": [
    "dor da perna volta para a lombar",
    "dor centraliza com movimento",
    "dor sai da perna e fica nas costas",
    "movimento repetido reduz a dor na perna",
    "dor na perna volta para a lombar",
    "dor volta para a lombar",
    "sintoma volta para a lombar",
    "volta da perna para a lombar",
    "volta da perna para as costas",
    "sintoma volta da perna para a lombar",
    "centralização",
    "centralizacao",
    "centralização dos sintomas",
    "centralizacao dos sintomas"
  ],
  "periferizacaoLombar": [
    "dor desce mais para a perna",
    "dor se espalha para baixo com movimento",
    "movimento leva a dor até o pé",
    "dor lombar passa a irradiar mais distalmente",
    "dor vai ficando mais distal na perna",
    "vai ficando mais distal na perna",
    "sintomas ficam mais distais na perna",
    "sintomas descem mais distalmente"
  ],
  "valsalvaLombar": [
    "piora ao tossir",
    "piora ao espirrar",
    "dor ao fazer força para evacuar",
    "dor aumenta com valsalva"
  ],
  "facetaLombar": [
    "dor lombar unilateral ao inclinar para trás",
    "dor ao estender e girar a lombar",
    "piora ao arquear e rodar as costas",
    "dor paravertebral unilateral em extensão",
    "piora em extensão e rotação",
    "piora em extensao e rotacao",
    "dor lombar em extensão e rotação",
    "dor lombar em extensao e rotacao"
  ],
  "extensaoRepetidaJovem": [
    "ginasta com dor ao estender a coluna",
    "atleta jovem com dor em extensão repetida",
    "dor lombar ao sacar no vôlei",
    "dor lombar ao chutar e arquear"
  ],
  "instabilidadeLombar": [
    "travamento súbito na lombar ao movimento",
    "arco doloroso ao retornar da flexão",
    "precisa apoiar as mãos nas coxas para levantar",
    "sensação de lombar instável",
    "episódios recorrentes de falha lombar"
  ],
  "degrauLombar": [
    "degrau palpável na coluna lombar",
    "vértebra parece deslocada na lombar",
    "escorregamento de vértebra lombar"
  ],
  "dorFocalVertebralLombar": [
    "dor bem localizada sobre uma vértebra lombar",
    "dor focal ao percutir a coluna lombar",
    "dor pontual no osso da coluna lombar"
  ],
  "infeccaoColunaRisco": [
    "febre com dor lombar constante",
    "infecção recente e dor na coluna",
    "uso de droga injetável com dor lombar",
    "imunossupressão com dor lombar",
    "cirurgia recente da coluna com febre"
  ],
  "oncologicoColunaRisco": [
    "histórico de câncer e nova dor lombar",
    "câncer prévio com dor nas costas",
    "perda de peso inexplicada e dor lombar constante",
    "dor lombar progressiva sem alívio em repouso"
  ],
  "visceralRenal": [
    "dor no flanco com náusea",
    "dor lombar com ardor ao urinar",
    "sangue na urina e dor nas costas",
    "cólica que vai para a virilha",
    "dor lombar não muda com movimento"
  ],
  "padraoMobilidadeLombar": [
    "lombar rígida ao acordar por pouco tempo",
    "dor e limitação para mover a lombar",
    "rigidez segmentar na coluna lombar",
    "dor melhora após movimentos leves"
  ],
  "controleMovimentoLombar": [
    "dor com movimentos repetidos no trabalho",
    "dificuldade de controlar a lombar ao levantar peso",
    "dor recorrente ao mudar de posição",
    "dor lombar recorrente ao mudar de posição",
    "dor com movimento descoordenado do tronco"
  ],
  "quadrilDominante": [
    "dor profunda na virilha ao rodar o quadril",
    "dor em c no quadril",
    "quadril rígido para calçar sapato",
    "dor reproduzida ao movimentar o quadril"
  ],
  "sacroiliacaDominante": [
    "dor abaixo da cintura de um lado",
    "dor localizada junto à espinha ilíaca posterior",
    "dor ao virar na cama e subir escada",
    "dor pélvica posterior unilateral"
  ],
  "aquilesCarga": [
    "dor no aquiles ao correr",
    "rigidez no aquiles pela manhã",
    "rigidez no aquiles pela manha",
    "dor dois a seis centímetros acima do calcanhar",
    "dor no aquiles que melhora aquecendo",
    "melhora aquecendo",
    "melhora após aquecer",
    "melhora apos aquecer",
    "melhora depois de aquecer",
    "melhora com aquecimento",
    "dor ao elevar o calcanhar"
  ],
  "joelho": [
    "joelho",
    "patela",
    "rotula",
    "femoropatelar",
    "linha articular",
    "interlinha",
    "menisco",
    "meniscal",
    "lca",
    "lcp",
    "ligamento cruzado anterior",
    "ligamento cruzado posterior",
    "fossa poplítea",
    "fossa poplitea",
    "dor no joelho",
    "região do joelho",
    "articulação do joelho",
    "dor ao redor do joelho"
  ],
  "joelhoAnterior": [
    "frente do joelho",
    "dor anterior no joelho",
    "dor na patela",
    "dor atras da patela",
    "ao redor da patela",
    "dor na frente do joelho",
    "dor atrás da rótula",
    "dor peripatelar",
    "dor na parte da frente da patela",
    "abaixo da patela",
    "dor abaixo da patela",
    "polo inferior da patela"
  ],
  "flexaoJoelhoCarga": [
    "agachar",
    "agachamento",
    "subir escada",
    "descer escada",
    "sentar por muito tempo",
    "levantar da cadeira",
    "correr",
    "saltar",
    "dor nas escadas",
    "dor ao descer degrau",
    "dor ao levantar do assento",
    "dor sentado muito tempo",
    "dor ao ajoelhar",
    "dor em escada",
    "dor na escada",
    "dor durante escadas",
    "descer escadas",
    "subir escadas",
    "ficar muito tempo sentado",
    "piora ficando muito tempo sentado"
  ],
  "torcaoJoelho": [
    "torceu o joelho",
    "torcao no joelho",
    "giro com pe apoiado",
    "girar o joelho",
    "girou o joelho",
    "movimento de pivo",
    "movimento de pivô",
    "mudanca de direcao",
    "pivo",
    "pivô",
    "joelho rodou",
    "torção com pé preso",
    "mudou direção com pé apoiado",
    "giro em apoio",
    "entorse rotacional",
    "após torção",
    "apos torcao",
    "depois de torção",
    "depois de torcao"
  ],
  "linhaArticularJoelho": [
    "parte de dentro do joelho",
    "face medial do joelho",
    "face media do joelho",
    "linha articular medial",
    "interlinha medial",
    "lado interno do joelho",
    "parte de fora do joelho",
    "linha articular lateral",
    "dor na interlinha do joelho",
    "dor medial do joelho",
    "dor interna do joelho",
    "dor lateral na linha articular",
    "sensível na linha articular"
  ],
  "joelhoMedial": [
    "dor medial no joelho",
    "dor medial do joelho",
    "dor na parte medial do joelho",
    "dor na parte interna do joelho",
    "parte interna do joelho",
    "dor na parte de dentro do joelho",
    "parte de dentro do joelho",
    "dor no lado interno do joelho",
    "lado interno do joelho",
    "lado interno do joelho dolorido",
    "face medial do joelho",
    "face medial do joelho dolorida",
    "vai para parte interna do joelho",
    "vai para a parte interna do joelho",
    "segue para parte interna do joelho",
    "segue para a parte interna do joelho",
    "irradia para parte interna do joelho",
    "irradia para a parte interna do joelho"
  ],
  "joelhoLateral": [
    "dor lateral no joelho",
    "dor lateral do joelho",
    "dor na parte lateral do joelho",
    "dor na parte externa do joelho",
    "parte externa do joelho",
    "dor na parte de fora do joelho",
    "parte de fora do joelho",
    "dor no lado externo do joelho",
    "lado externo do joelho",
    "lado externo do joelho dolorido",
    "face lateral do joelho",
    "face lateral do joelho dolorida",
    "vai para parte externa do joelho",
    "vai para a parte externa do joelho",
    "segue para parte externa do joelho",
    "segue para a parte externa do joelho",
    "irradia para parte externa do joelho",
    "irradia para a parte externa do joelho"
  ],
  "linhaArticularMedialJoelho": [
    "linha articular medial",
    "linha articular medial do joelho",
    "interlinha medial",
    "interlinha medial do joelho",
    "dor na interlinha medial",
    "dor na linha articular medial",
    "sensibilidade na interlinha medial"
  ],
  "linhaArticularLateralJoelho": [
    "linha articular lateral",
    "linha articular lateral do joelho",
    "interlinha lateral",
    "interlinha lateral do joelho",
    "dor na interlinha lateral",
    "dor na linha articular lateral",
    "sensibilidade na interlinha lateral"
  ],
  "flexaoProfundaJoelho": [
    "dobrar o joelho completamente",
    "dobrar muito o joelho",
    "dor ao dobrar muito o joelho",
    "dor quando dobra muito o joelho",
    "flexionar muito o joelho",
    "dor ao flexionar muito o joelho",
    "flexão completa do joelho",
    "flexao completa do joelho",
    "flexão máxima do joelho",
    "flexao maxima do joelho",
    "joelho muito dobrado",
    "ficar de cocoras",
    "ficar de cócoras",
    "dor ao ficar de cocoras",
    "dor ao ficar de cócoras",
    "agachamento profundo",
    "agachar fundo",
    "agachar até o chão",
    "agachar ate o chao",
    "agachamento completo",
    "dor no fim da flexão",
    "dor no fim da flexao",
    "dor ao encostar o calcanhar",
    "dor agachando até o chão",
    "dor agachando ate o chao",
    "dor ajoelhado e sentado sobre os pés"
  ],
  "hiperextensaoJoelho": [
    "esticar o joelho completamente",
    "hiperextensão do joelho",
    "hiperextensao do joelho",
    "dor ao travar o joelho para trás",
    "dor no final da extensão",
    "dor ao forçar o joelho esticado"
  ],
  "mecanicoJoelho": [
    "travamento",
    "joelho trava",
    "bloqueio",
    "estalido doloroso",
    "clique doloroso",
    "joelho prende",
    "joelho fica bloqueado",
    "sensação de algo agarrando",
    "clique na linha articular",
    "não consegue destravar",
    "fica prendendo",
    "fica preso",
    "ficou bloqueado",
    "joelho ficou bloqueado",
    "bloqueado e não consegue estender",
    "bloqueado e nao consegue estender"
  ],
  "bloqueioVerdadeiroJoelho": [
    "joelho fica bloqueado",
    "não consegue destravar",
    "nao consegue destravar",
    "não consegue estender completamente o joelho",
    "nao consegue estender completamente o joelho",
    "não consegue esticar completamente o joelho",
    "nao consegue esticar completamente o joelho",
    "joelho travou e não estende",
    "joelho travou e nao estende",
    "joelho preso sem conseguir estender",
    "joelho bloqueado sem conseguir estender"
  ],
  "instabilidadeJoelho": [
    "joelho falha",
    "falseio",
    "sai do lugar",
    "instabilidade no joelho",
    "cedeu",
    "joelho cede",
    "joelho bamboleia",
    "insegurança para mudar direção",
    "falha ao apoiar",
    "sensação de joelho solto",
    "ficou instável",
    "ficou instavel",
    "joelho ficou instável",
    "joelho ficou instavel",
    "agora falseia",
    "joelho falseia"
  ],
  "falseioObjetivoJoelho": [
    "joelho falha",
    "falseio",
    "cedeu",
    "joelho cede",
    "falha ao apoiar",
    "joelho cedeu ao apoiar",
    "joelho falhou ao apoiar",
    "joelho dobrou sozinho ao apoiar",
    "falseia",
    "agora falseia",
    "joelho falseia"
  ],
  "derrameJoelho": [
    "joelho inchou",
    "joelho inchado",
    "joelho está inchado",
    "joelho esta inchado",
    "inchaço no joelho",
    "inchaco no joelho",
    "derrame",
    "edema no joelho",
    "inchaço horas depois",
    "joelho cheio de líquido",
    "edema tardio",
    "aumento de volume no joelho"
  ],
  "plenitudeJoelho": [
    "sensação de joelho cheio",
    "sensacao de joelho cheio",
    "joelho parece cheio",
    "pressão dentro do joelho",
    "pressao dentro do joelho",
    "sensação de pressão no joelho",
    "sensacao de pressao no joelho",
    "pressão no joelho ao dobrar",
    "pressao no joelho ao dobrar"
  ],
  "derramePrecoceJoelho": [
    "joelho inchou imediatamente",
    "inchaço imediato no joelho",
    "inchaco imediato no joelho",
    "edema imediato no joelho",
    "joelho inchou logo após a torção",
    "joelho inchou logo apos a torcao",
    "joelho inchou logo após o trauma",
    "joelho inchou logo apos o trauma",
    "joelho inchou em uma hora",
    "joelho inchou nas primeiras horas",
    "derrame imediato no joelho"
  ],
  "derrameTardioJoelho": [
    "inchaço horas depois",
    "inchaco horas depois",
    "joelho inchou horas depois",
    "edema tardio",
    "edema tardio no joelho",
    "edema apareceu horas depois",
    "inchaço apareceu mais tarde",
    "inchaco apareceu mais tarde",
    "derrame tardio no joelho"
  ],
  "salto": [
    "saltar",
    "salto",
    "pular",
    "voleibol",
    "basquete",
    "esporte de salto",
    "dor depois de pular",
    "saltos repetidos",
    "aterrissagem",
    "durante saltos",
    "ao aterrissar",
    "durante aterrissagem"
  ],
  "tornozelo": [
    "tornozelo",
    "talocrural",
    "maleolo",
    "pe e tornozelo",
    "dor no tornozelo",
    "articulação do tornozelo",
    "dor ao redor dos maléolos",
    "dor no peito do pé próximo ao tornozelo"
  ],
  "inversao": [
    "virou o pe para dentro",
    "entorse em inversao",
    "pisou em falso",
    "torceu o tornozelo",
    "pé virou para dentro",
    "entorse lateral",
    "virada de tornozelo",
    "caiu com o pé torto",
    "inversão",
    "inversao",
    "após inversão",
    "apos inversao",
    "virou o tornozelo para dentro",
    "virou o pé para dentro",
    "virou o pe para dentro",
    "tornozelo virou para dentro"
  ],
  "lateralTornozelo": [
    "lado de fora do tornozelo",
    "lateral do tornozelo",
    "maleolo lateral",
    "dor abaixo do maléolo lateral",
    "dor externa no tornozelo",
    "inchaço lateral do tornozelo",
    "dor nos ligamentos laterais",
    "dor lateral no tornozelo",
    "dor na lateral do tornozelo"
  ],
  "posteriorTornozelo": [
    "atras do tornozelo",
    "tendao de aquiles",
    "aquiles",
    "panturrilha distal",
    "dor atrás do calcanhar",
    "dor no aquiles",
    "dor na inserção do aquiles",
    "dor na parte posterior do tornozelo"
  ],
  "calcanhar": [
    "calcanhar",
    "fascia plantar",
    "sola do pe",
    "planta do pe",
    "dor no calcanhar",
    "dor sob o calcâneo",
    "dor plantar no calcâneo",
    "dor na sola perto do calcanhar"
  ],
  "primeirosPassos": [
    "primeiros passos",
    "primeiro passo",
    "ao levantar da cama",
    "inicio da caminhada",
    "piora nos primeiros passos",
    "dor ao pisar de manhã",
    "dor ao começar a andar",
    "melhora depois de alguns passos"
  ],
  "incapazQuatroPassos": [
    "nao consegue dar quatro passos",
    "não consegue dar quatro passos",
    "nao da quatro passos",
    "não dá quatro passos",
    "nao consegue apoiar",
    "incapaz de caminhar",
    "nao consegue caminhar",
    "não consegue caminhar",
    "não deu quatro passos",
    "nao deu quatro passos",
    "não suporta peso no pé",
    "nao suporta peso no pe",
    "não conseguiu caminhar após entorse",
    "nao conseguiu caminhar apos entorse",
    "incapaz de apoiar imediatamente"
  ],
  "dorOsseaTornozelo": [
    "dor no osso do maleolo",
    "dor na ponta do maleolo",
    "dor na base do quinto metatarso",
    "dor no navicular",
    "dor óssea no maléolo",
    "sensibilidade na base do quinto metatarso",
    "dor óssea no navicular",
    "dor na borda posterior do maléolo"
  ],
  "panturrilhaVascular": [
    "panturrilha inchada",
    "inchaco unilateral da panturrilha",
    "panturrilha quente",
    "vermelhidao na panturrilha",
    "aumento súbito da panturrilha",
    "uma panturrilha maior que a outra",
    "edema unilateral na perna",
    "dor e calor na panturrilha",
    "panturrilha vermelha"
  ],
  "lombar": [
    "lombar",
    "lombalgia",
    "coluna lombar",
    "costas baixas",
    "parte baixa das costas",
    "regiao lombar"
  ],
  "irradiacaoPerna": [
    "irradia para perna",
    "irradia para a perna",
    "irradiação para perna",
    "irradiacao para perna",
    "irradiação para a perna",
    "irradiacao para a perna",
    "dor lombar com irradiação para perna",
    "dor lombar com irradiacao para perna",
    "dor lombar que desce para o membro inferior",
    "dor lombar que vai para o membro inferior",
    "dor que irradia para a perna",
    "dor que desce para a perna",
    "dor que vai para a perna",
    "dor que desce para o membro inferior",
    "desce para perna",
    "desce para a perna",
    "desce pela perna",
    "desce pela a perna",
    "ate o joelho",
    "dor ciatica",
    "ciatalgia",
    "dor vai para a perna",
    "dor corre pela coxa",
    "dor da lombar para a perna",
    "dor lombar desce abaixo do joelho",
    "desce abaixo do joelho",
    "desce até o pé",
    "desce ate o pe",
    "dor desce até o pé",
    "dor desce ate o pe",
    "lombar desce até o pé",
    "lombar desce ate o pe",
    "irradia para as pernas",
    "desce para as pernas",
    "dor desce para as pernas",
    "dor vai para as pernas",
    "vem da lombar para a perna",
    "dor vem da lombar para a perna"
  ],
  "trajetoAlemJoelhoLombar": [
    "abaixo do joelho",
    "irradia abaixo do joelho",
    "dor desce até o pé",
    "dor até o pé",
    "dor que passa do joelho",
    "dor que desce além do joelho",
    "formigamento até o pé",
    "formigamento que desce até os dedos do pé",
    "dor na panturrilha e no pé",
    "dor até o tornozelo",
    "passa do joelho e vai para a panturrilha",
    "passa do joelho e chega ao pé",
    "passa do joelho e chega ao pe",
    "chega no pé",
    "chega no pe",
    "vai até o pé",
    "vai ate o pe",
    "vem da lombar e vai até o pé",
    "vem da lombar e vai ate o pe"
  ],
  "trajetoRestritoJoelhoLombar": [
    "dor que não passa do joelho",
    "dor que nao passa do joelho",
    "não passa do joelho",
    "nao passa do joelho",
    "dor que fica só até o joelho",
    "dor que fica so ate o joelho",
    "dor que não desce além do joelho",
    "não desce além do joelho",
    "nao desce alem do joelho",
    "dor limitada até o joelho"
  ],
  "dermatomaPeEspecifico": [
    "formigamento no hálux",
    "formigamento no halux",
    "formigamento no dedão do pé",
    "formigamento no dedao do pe",
    "dormência no quinto dedo do pé",
    "dormencia no quinto dedo do pe",
    "formigamento na borda lateral do pé",
    "dormência no dorso do pé",
    "formiga o hálux",
    "formiga o halux",
    "hálux formiga",
    "halux formiga",
    "quinto dedo do pé fica dormente",
    "quinto dedo do pe fica dormente",
    "quinto dedo do pé formiga",
    "quinto dedo do pe formiga",
    "dormência na borda lateral do pé",
    "dormencia na borda lateral do pe"
  ],
  "neurologico": [
    "formigamento",
    "dormencia",
    "parestesia",
    "fraqueza",
    "perda de forca",
    "pe caido",
    "choque",
    "queimacao",
    "agulhadas",
    "perda de sensibilidade",
    "fraqueza muscular",
    "choque elétrico",
    "alteração de reflexo",
    "formiga",
    "formigam",
    "fica dormente",
    "ficam dormentes",
    "adormece",
    "adormecem",
    "mao formiga",
    "mão formiga",
    "dedo formiga",
    "dedos formigam",
    "dedos dormem",
    "quarto e quinto dedos dormem",
    "quinto dedo formiga",
    "hálux formiga",
    "halux formiga",
    "formiga o hálux",
    "formiga o halux",
    "perde força",
    "perde forca",
    "fraqueza referida"
  ],
  "flexao": [
    "sentar",
    "sentado",
    "curvar",
    "flexionar",
    "abaixar",
    "amarrar o sapato",
    "inclinar para frente",
    "piora ao sentar",
    "dor ao inclinar para frente",
    "dor ao calçar sapato",
    "dor ao pegar objeto no chão"
  ],
  "extensao": [
    "ficar em pe",
    "andar",
    "caminhar",
    "extensao",
    "arquear",
    "inclinar para tras",
    "piora ao ficar parado em pé",
    "dor ao caminhar ereto",
    "piora ao inclinar para trás",
    "dor em extensão lombar"
  ],
  "marchaLimitada": [
    "nao consegue caminhar",
    "incapaz de caminhar",
    "claudica",
    "manca",
    "mancar",
    "nao consegue andar",
    "limita a caminhada",
    "limita caminhar",
    "precisa parar ao caminhar",
    "precisa parar durante a caminhada",
    "peso nas pernas ao caminhar",
    "caminha poucos metros",
    "perna pesa ao andar",
    "marcha reduzida pela dor",
    "dificuldade para caminhar",
    "dificuldade para andar",
    "anda mancando",
    "fica mancando",
    "dor nas pernas ao caminhar",
    "dor desce para as pernas ao caminhar",
    "dor que desce para as pernas ao caminhar",
    "pernas doem ao caminhar",
    "desce para as pernas ao caminhar",
    "dor irradiada nas pernas ao caminhar"
  ],
  "quadril": [
    "quadril",
    "anca",
    "virilha",
    "regiao inguinal",
    "trocanter",
    "nadega",
    "gluteo",
    "dor no quadril",
    "articulação do quadril",
    "dor na anca",
    "dor ao redor do quadril"
  ],
  "lateralQuadril": [
    "lateral do quadril",
    "lateral no quadril",
    "dor lateral no quadril",
    "lado do quadril",
    "trocanter",
    "grande trocanter",
    "gluteo lateral",
    "dor sobre o grande trocânter",
    "dor externa do quadril",
    "dor na lateral da coxa proximal",
    "sensibilidade trocantérica",
    "lado da bacia",
    "dor do lado da bacia",
    "dor na lateral da bacia",
    "dor do lado do quadril",
    "dor na parte de fora do quadril",
    "dor do lado do glúteo",
    "dor do lado do gluteo",
    "dor na lateral do glúteo",
    "dor na lateral do gluteo",
    "dor no osso do lado do quadril"
  ],
  "decubitoLateral": [
    "deitar de lado",
    "dormir de lado",
    "dorme de lado",
    "ao deitar sobre",
    "decubito lateral",
    "não consegue dormir sobre o lado",
    "nao consegue dormir sobre o lado",
    "não consigo dormir sobre o lado",
    "nao consigo dormir sobre o lado",
    "piora ao deitar de lado",
    "piora quando deita de lado",
    "dor ao apoiar o quadril na cama",
    "acorda ao virar de lado",
    "dor comprimindo a lateral do quadril",
    "piora deitado de lado",
    "piora deitada de lado",
    "piora quando fica deitado de lado",
    "piora quando fica deitada de lado",
    "pior deitado de lado",
    "pior deitada de lado"
  ],
  "apoioUnipodal": [
    "uma perna so",
    "apoio unipodal",
    "ficar numa perna",
    "ficar em uma perna",
    "subir escada",
    "dor apoiando numa perna",
    "dor ao vestir calça em pé",
    "dor no teste de uma perna",
    "dor ao subir degrau com uma perna"
  ],
  "virilha": [
    "virilha",
    "inguinal",
    "frente do quadril",
    "dor profunda na virilha",
    "dor em c no quadril",
    "dor anterior do quadril",
    "dor inguinal ao flexionar"
  ],
  "carga": [
    "correr",
    "corrida",
    "caminhar",
    "caminhada",
    "subir escada",
    "descer escada",
    "ficar em pe",
    "apoio",
    "impacto",
    "treino",
    "levantar peso",
    "dor após levantar peso",
    "piora com peso",
    "piora ao apoiar",
    "dor durante atividade",
    "aumento recente de treino",
    "dor após esforço",
    "aumentou o volume",
    "aumentou muito a carga",
    "aumento de volume",
    "aumento da carga",
    "aumento de carga",
    "aumentou a carga de treino"
  ],
  "rigidez": [
    "ao acordar",
    "pela manha",
    "matinal",
    "rigidez",
    "inicio do movimento",
    "primeiros passos",
    "travado ao levantar",
    "rigidez depois de repouso",
    "demora para soltar",
    "movimento preso pela manhã",
    "joelho rígido após repouso",
    "joelho rigido apos repouso",
    "rígido após repouso",
    "rigido apos repouso",
    "tornozelo rígido",
    "tornozelo rigido",
    "rigidez no tornozelo"
  ],
  "trauma": [
    "queda",
    "trauma",
    "impacto",
    "acidente",
    "fratura",
    "trauma recente",
    "pancada",
    "entorse",
    "queda recente",
    "acidente esportivo",
    "caiu",
    "bateu",
    "virou o pé",
    "virou o pe",
    "pivô sem contato",
    "pivo sem contato",
    "durante pivô",
    "durante pivo",
    "caiu sobre a mão",
    "caiu sobre a mao",
    "queda sobre a mão estendida",
    "queda sobre a mao estendida"
  ],
  "noturna": [
    "dor noturna",
    "acorda pela dor",
    "dor a noite",
    "pior a noite",
    "pior à noite",
    "piora a noite",
    "dor durante a madrugada",
    "acorda à noite por dor",
    "dor em repouso noturno",
    "piora quando dorme"
  ],
  "sistemico": [
    "febre",
    "calafrio",
    "perda de peso",
    "emagrecimento inexplicado",
    "mal estar",
    "febre persistente",
    "sudorese noturna",
    "fadiga inexplicada",
    "histórico de câncer",
    "infecção recente",
    "imunossupressão"
  ],
  "caudaEquina": [
    "incontinencia",
    "retencao urinaria",
    "anestesia em sela",
    "dormencia na sela",
    "perda de controle urinario",
    "perdeu sensibilidade genital",
    "dormência entre as pernas",
    "incontinência fecal",
    "fraqueza bilateral progressiva"
  ],
  "centralizacao": [
    "dor da perna volta para a lombar",
    "dor centraliza com movimento",
    "dor sai da perna e fica nas costas",
    "movimento repetido reduz a dor na perna",
    "dor na perna volta para a lombar",
    "dor volta para a lombar",
    "sintoma volta para a lombar"
  ],
  "lateralJoelho": [
    "lateral do joelho",
    "dor lateral do joelho",
    "lado de fora do joelho"
  ],
  "popliteo": [
    "atrás do joelho",
    "atras do joelho",
    "fossa poplítea",
    "fossa poplitea",
    "caroço atrás do joelho",
    "caroco atras do joelho"
  ],
  "provocacaoEpicondiloMedial": [
    "flexionar o punho",
    "flexão do punho",
    "flexao do punho",
    "pronar",
    "pronação",
    "pronacao",
    "flexionar o punho e pronar"
  ],
  "distribuicaoUlnarMao": [
    "quarto e quinto dedos formigam",
    "4º e 5º dedos formigam",
    "quarto e quinto dedos dormem",
    "quinto dedo formiga",
    "dedo mínimo formiga",
    "dedo minimo formiga"
  ],
  "provocacaoUlnarCotovelo": [
    "piora quando o cotovelo fica dobrado",
    "piora com o cotovelo dobrado",
    "cotovelo fica dobrado",
    "mantém o cotovelo dobrado",
    "mantem o cotovelo dobrado",
    "apoia o cotovelo",
    "apoiar o cotovelo",
    "quando apoia o cotovelo",
    "piora apoiando o cotovelo"
  ],
  "tunelRadial": [
    "dor profunda na parte lateral proximal do antebraço ao supinar",
    "dor profunda na parte lateral proximal do antebraco ao supinar",
    "dor lateral proximal do antebraço ao supinar",
    "dor lateral proximal do antebraco ao supinar",
    "dor no túnel radial",
    "dor no tunel radial",
    "dor profunda no antebraço ao supinar",
    "dor profunda no antebraco ao supinar"
  ],
  "guyon": [
    "quarto e quinto dedos dormem ao pedalar apoiando o punho",
    "quarto e quinto dedos formigam ao pedalar apoiando o punho",
    "formigamento ulnar ao apoiar o punho no guidão",
    "formigamento ulnar ao apoiar o punho no guidao",
    "canal de guyon",
    "síndrome de guyon",
    "sindrome de guyon",
    "quarto e quinto dedos formigam ao pedalar apoiando a palma no guidão",
    "quarto e quinto dedos formigam ao pedalar apoiando a palma no guidao",
    "formigamento ulnar apoiando a palma no guidão",
    "formigamento ulnar apoiando a palma no guidao"
  ],
  "traumaPunhoMao": [
    "caiu sobre a mão estendida",
    "caiu sobre a mao estendida",
    "queda sobre a mão estendida",
    "queda sobre a mao estendida",
    "foosh"
  ],
  "tabaqueiraEscafoide": [
    "tabaqueira anatômica",
    "tabaqueira anatomica",
    "dor na tabaqueira anatômica",
    "dor na tabaqueira anatomica"
  ],
  "costalMecanico": [
    "girar o tronco",
    "ao girar o tronco",
    "reproduzida ao girar o tronco",
    "reproduz ao girar o tronco",
    "movimento do tronco reproduz a dor",
    "dor à palpação da costela",
    "dor a palpacao da costela"
  ],
  "provocacaoRespiratoriaToracica": [
    "respirar fundo",
    "ao respirar fundo",
    "piora ao respirar fundo",
    "tossir",
    "ao tossir",
    "piora ao tossir",
    "espirrar",
    "ao espirrar",
    "piora ao espirrar"
  ],
  "respiratorioInfeccioso": [
    "dor torácica pior ao tossir com febre",
    "dor toracica pior ao tossir com febre",
    "tosse com febre persistente",
    "dor torácica com febre persistente",
    "dor toracica com febre persistente"
  ],
  "herpesZoster": [
    "vesículas na pele",
    "vesiculas na pele",
    "queimação em faixa com vesículas",
    "queimacao em faixa com vesiculas",
    "herpes zoster",
    "herpes-zóster",
    "cobreiro"
  ],
  "alteracaoUrinaria": [
    "dificuldade para urinar",
    "jato urinário fraco",
    "jato urinario fraco",
    "hesitação urinária",
    "hesitacao urinaria"
  ],
  "sistemicoAltoRisco": [
    "febre persistente",
    "calafrio",
    "calafrios",
    "emagrecimento inexplicado",
    "perda de peso inexplicada",
    "histórico de câncer",
    "historico de cancer",
    "imunossupressão",
    "imunossupressao",
    "infecção recente com febre",
    "infeccao recente com febre"
  ],
  "padraoLCP": [
    "parte da frente da tíbia no painel",
    "parte da frente da tibia no painel",
    "tíbia no painel do carro",
    "tibia no painel do carro",
    "joelho flexionado e bateu a tíbia",
    "joelho flexionado e bateu a tibia",
    "trauma anterior da tíbia com joelho flexionado",
    "trauma anterior da tibia com joelho flexionado",
    "trauma direto na frente da tíbia com joelho flexionado",
    "trauma direto na frente da tibia com joelho flexionado",
    "instabilidade posterior após trauma anterior da tíbia",
    "instabilidade posterior apos trauma anterior da tibia"
  ],
  "deficitNeurologicoProgressivo": [
    "fraqueza progressiva",
    "perda de força progressiva",
    "perda de forca progressiva",
    "fraqueza piorando",
    "força piorando",
    "forca piorando",
    "pé caído piorando",
    "pe caido piorando",
    "mão ficando mais fraca",
    "mao ficando mais fraca"
  ],
  "patelarFocal": [
    "dor focal abaixo da patela",
    "dor no polo inferior da patela",
    "polo inferior da patela doloroso"
  ],
  "cmcPolegar": [
    "artrose na base do polegar",
    "artrose da base do polegar",
    "artrose trapézio metacarpal",
    "artrose trapezio metacarpal",
    "artrose trapeziometacarpal",
    "dor na articulação da base do polegar",
    "dor na articulacao da base do polegar",
    "dor na base do polegar ao pinçar",
    "dor na base do polegar ao pincar",
    "dor na base do polegar ao abrir pote",
    "dor na base do polegar ao girar chave",
    "dor na base do polegar com pinça",
    "dor na base do polegar com pinca"
  ],
  "instabilidadePatelar": [
    "patela saiu do lugar",
    "rótula saiu do lugar",
    "rotula saiu do lugar",
    "luxação da patela",
    "luxacao da patela",
    "luxação patelar",
    "luxacao patelar",
    "subluxação patelar",
    "subluxacao patelar",
    "patela desloca para fora",
    "patela deslocou para fora",
    "patela deslocou lateralmente",
    "rótula deslocou lateralmente",
    "rotula deslocou lateralmente",
    "patela escapa para fora",
    "sensação de que a patela vai sair",
    "sensacao de que a patela vai sair",
    "apreensão patelar",
    "apreensao patelar"
  ],
  "padraoLCA": [
    "pivô sem contato com estalo",
    "pivo sem contato com estalo",
    "mudança de direção com estalo no joelho",
    "mudanca de direcao com estalo no joelho",
    "joelho torceu sem contato e estalou",
    "aterrissou e o joelho cedeu com estalo",
    "estalo no joelho e inchaço imediato após pivô",
    "estalo no joelho e inchaco imediato apos pivo",
    "lesão do lca",
    "lesao do lca",
    "ruptura do lca",
    "ligamento cruzado anterior lesionado"
  ],
  "incapacidadeExtensaoAtivaJoelho": [
    "não consegue estender ativamente o joelho",
    "nao consegue estender ativamente o joelho",
    "não consegue fazer extensão ativa do joelho",
    "nao consegue fazer extensao ativa do joelho",
    "não consegue levantar a perna reta",
    "nao consegue levantar a perna reta",
    "não consegue elevar a perna com o joelho reto",
    "nao consegue elevar a perna com o joelho reto",
    "não consegue manter o joelho estendido",
    "nao consegue manter o joelho estendido"
  ],
  "rupturaMecanismoExtensorJoelho": [
    "estalo na frente do joelho ao saltar",
    "após salto sentiu estalo na frente do joelho",
    "apos salto sentiu estalo na frente do joelho",
    "sentiu estalo na frente do joelho após salto",
    "sentiu estalo na frente do joelho apos salto",
    "estalo acima da patela ao saltar",
    "estalo abaixo da patela ao saltar",
    "depressão no tendão patelar",
    "depressao no tendao patelar",
    "falha palpável no tendão patelar",
    "falha palpavel no tendao patelar",
    "falha palpável no tendão quadricipital",
    "falha palpavel no tendao quadricipital",
    "ruptura do tendão patelar",
    "ruptura do tendao patelar",
    "ruptura do tendão quadricipital",
    "ruptura do tendao quadricipital"
  ],
  "artroseGlenoumeral": [
    "artrose glenoumeral",
    "osteoartrose glenoumeral",
    "desgaste glenoumeral",
    "dor profunda no ombro com crepitação",
    "dor profunda no ombro com crepitacao",
    "ombro rígido e crepita",
    "ombro rigido e crepita",
    "rigidez progressiva do ombro com crepitação",
    "rigidez progressiva do ombro com crepitacao",
    "dor profunda no ombro com perda progressiva de rotação",
    "dor profunda no ombro com perda progressiva de rotacao"
  ],
  "labralOmbro": [
    "lesão labral do ombro",
    "lesao labral do ombro",
    "lesão de labrum do ombro",
    "lesao de labrum do ombro",
    "lesão slap",
    "lesao slap",
    "slap no ombro",
    "clique profundo no ombro",
    "estalo profundo dentro do ombro",
    "travamento profundo no ombro",
    "sensação de pegar dentro do ombro",
    "sensacao de pegar dentro do ombro",
    "dor profunda no ombro ao arremessar",
    "ombro prende por dentro ao elevar"
  ],
  "fraturaQuadrilAguda": [
    "fratura de quadril",
    "fratura do colo do fêmur",
    "fratura do colo do femur",
    "fratura proximal do fêmur",
    "fratura proximal do femur",
    "queda com dor forte no quadril e não consegue apoiar",
    "queda com dor forte no quadril e nao consegue apoiar",
    "queda com dor forte na virilha e não consegue ficar em pé",
    "queda com dor forte na virilha e nao consegue ficar em pe",
    "após queda não consegue apoiar por dor no quadril",
    "apos queda nao consegue apoiar por dor no quadril"
  ],
  "deformidadeFraturaQuadril": [
    "perna encurtada e rodada para fora",
    "perna mais curta e rodada para fora",
    "membro encurtado em rotação externa",
    "membro encurtado em rotacao externa",
    "pé rodado para fora após queda com dor no quadril",
    "pe rodado para fora apos queda com dor no quadril"
  ],
  "riscoOsteonecroseQuadril": [
    "uso prolongado de corticoide",
    "uso prolongado de corticoides",
    "corticoide por muito tempo",
    "etilismo pesado",
    "uso excessivo de álcool",
    "uso excessivo de alcool",
    "anemia falciforme",
    "luxação prévia do quadril",
    "luxacao previa do quadril",
    "osteonecrose prévia",
    "osteonecrose previa"
  ],
  "padraoOsteonecroseQuadril": [
    "osteonecrose da cabeça femoral",
    "osteonecrose da cabeca femoral",
    "necrose avascular da cabeça femoral",
    "necrose avascular da cabeca femoral",
    "dor profunda na virilha em repouso",
    "dor progressiva na virilha sem trauma",
    "dor profunda no quadril em repouso e à noite",
    "dor profunda no quadril em repouso e a noite"
  ],
  "deformidadeOmbroTrauma": [
    "ombro deformado após queda",
    "ombro deformado apos queda",
    "deformidade no ombro após trauma",
    "deformidade no ombro apos trauma",
    "ombro saiu do lugar e não voltou",
    "ombro saiu do lugar e nao voltou",
    "ombro visivelmente fora do lugar",
    "deformidade evidente do ombro"
  ],
  "suspeitaArticulacaoSeptica": [
    "articulação quente inchada com febre",
    "articulacao quente inchada com febre",
    "articulação muito quente e inchada com febre",
    "articulacao muito quente e inchada com febre",
    "joelho quente e muito inchado com febre",
    "tornozelo quente e muito inchado com febre",
    "punho quente e muito inchado com febre",
    "dor articular súbita com febre e inchaço",
    "dor articular subita com febre e inchaco",
    "artrite séptica",
    "artrite septica"
  ],
  "traumaCervicalImportante": [
    "queda de altura com dor no pescoço",
    "queda de altura com dor no pescoco",
    "mergulho com impacto na cabeça",
    "mergulho com impacto na cabeca",
    "impacto axial na cabeça com dor cervical",
    "impacto axial na cabeca com dor cervical",
    "acidente de carro com dor cervical intensa",
    "colisão de alta energia com dor cervical",
    "colisao de alta energia com dor cervical",
    "bateu a cabeça e ficou com dor cervical",
    "bateu a cabeca e ficou com dor cervical"
  ],
  "dorLinhaMediaCervical": [
    "dor na linha média cervical",
    "dor na linha media cervical",
    "dor no meio da coluna cervical",
    "dor sobre as vértebras cervicais",
    "dor sobre as vertebras cervicais",
    "sensibilidade óssea no meio do pescoço",
    "sensibilidade ossea no meio do pescoco",
    "dor ao apertar as vértebras do pescoço",
    "dor ao apertar as vertebras do pescoco"
  ],
  "vascularCervicalDorIncomum": [
    "dor cervical súbita e muito intensa",
    "dor cervical subita e muito intensa",
    "dor no pescoço súbita diferente do habitual",
    "dor no pescoco subita diferente do habitual",
    "pior dor de cabeça da vida com dor cervical",
    "pior dor de cabeca da vida com dor cervical",
    "cefaleia súbita explosiva com dor no pescoço",
    "cefaleia subita explosiva com dor no pescoco",
    "dor occipital súbita incomum",
    "dor occipital subita incomum"
  ],
  "vascularCervicalNeuroCraniano": [
    "visão dupla com dor cervical",
    "visao dupla com dor cervical",
    "fala enrolada com dor cervical",
    "dificuldade para falar com dor cervical",
    "dificuldade para engolir com dor cervical",
    "queda súbita sem perder a consciência com dor cervical",
    "queda subita sem perder a consciencia com dor cervical",
    "pálpebra caída e pupila pequena com dor cervical",
    "palpebra caida e pupila pequena com dor cervical",
    "rosto dormente com dor cervical",
    "ataxia com dor cervical",
    "desequilíbrio intenso com dor cervical",
    "desequilibrio intenso com dor cervical"
  ],
  "bicepsDistal": [
    "dor na frente do cotovelo ao supinar",
    "dor na frente do cotovelo ao virar a palma para cima",
    "dor na fossa cubital ao levantar peso",
    "dor no tendão distal do bíceps",
    "dor no tendao distal do biceps",
    "dor anterior no cotovelo ao flexionar contra resistência",
    "dor anterior no cotovelo ao flexionar contra resistencia",
    "dor ao girar a palma para cima com o cotovelo"
  ],
  "rupturaBicepsDistal": [
    "estalo na frente do cotovelo ao levantar peso",
    "sentiu estalo no bíceps perto do cotovelo",
    "sentiu estalo no biceps perto do cotovelo",
    "hematoma na frente do cotovelo após esforço",
    "hematoma na frente do cotovelo apos esforco",
    "bíceps subiu após estalo no cotovelo",
    "biceps subiu apos estalo no cotovelo",
    "perdeu força para supinar após estalo",
    "perdeu forca para supinar apos estalo"
  ],
  "bursiteOlecrano": [
    "inchaço na ponta do cotovelo",
    "inchaco na ponta do cotovelo",
    "bola na ponta do cotovelo",
    "caroço sobre o olécrano",
    "caroco sobre o olecrano",
    "bolsa inchada atrás do cotovelo",
    "bolsa inchada atras do cotovelo",
    "dor ao apoiar a ponta do cotovelo",
    "inchaço sobre o olécrano",
    "inchaco sobre o olecrano"
  ],
  "fraturaRadioDistal": [
    "deformidade em garfo no punho após queda",
    "deformidade em garfo no punho apos queda",
    "punho deformado após cair sobre a mão",
    "punho deformado apos cair sobre a mao",
    "dor óssea no rádio distal após queda",
    "dor ossea no radio distal apos queda",
    "dor intensa no rádio distal após queda sobre a mão",
    "dor intensa no radio distal apos queda sobre a mao",
    "deformidade do punho após queda sobre a mão",
    "deformidade do punho apos queda sobre a mao",
    "caiu sobre a mão e ficou com punho deformado",
    "caiu sobre a mao e ficou com punho deformado",
    "punho deformado e dor intensa no rádio distal",
    "punho deformado e dor intensa no radio distal"
  ],
  "dedoGatilho": [
    "dedo trava ao dobrar",
    "dedo trava ao fechar a mão",
    "dedo prende ao dobrar",
    "dedo estala e destrava",
    "dedo fica preso em flexão",
    "dedo fica preso em flexao",
    "ressalto no dedo ao abrir a mão",
    "ressalto no dedo ao abrir a mao",
    "nódulo doloroso na palma na base do dedo",
    "nodulo doloroso na palma na base do dedo",
    "dedo engatilha pela manhã",
    "dedo engatilha pela manha"
  ],
  "intercostalNeuralgia": [
    "queimação em faixa ao longo da costela",
    "queimacao em faixa ao longo da costela",
    "dor em faixa unilateral entre as costelas",
    "choques ao longo de uma costela",
    "pele muito sensível em faixa no tórax",
    "pele muito sensivel em faixa no torax",
    "dor neuropática em faixa no tórax",
    "dor neuropatica em faixa no torax",
    "queimação intercostal sem vesículas",
    "queimacao intercostal sem vesiculas"
  ],
  "gluteoProfundo": [
    "dor profunda no glúteo pior ao sentar",
    "dor profunda no gluteo pior ao sentar",
    "dor no meio da nádega que piora sentado",
    "dor no meio da nadega que piora sentado",
    "queimação profunda no glúteo ao sentar",
    "queimacao profunda no gluteo ao sentar",
    "dor glútea que desce pela parte de trás da coxa e piora sentado",
    "dor glutea que desce pela parte de tras da coxa e piora sentado",
    "dor profunda na nádega ao cruzar a perna",
    "dor profunda na nadega ao cruzar a perna",
    "dor glútea profunda ao sentar",
    "dor glutea profunda ao sentar",
    "dor profunda na nádega ao sentar",
    "dor profunda na nadega ao sentar"
  ],
  "bursitePrepatelar": [
    "inchaço na frente da patela",
    "inchaco na frente da patela",
    "bola sobre a patela",
    "bolsa inchada na frente do joelho",
    "dor e inchaço ao ajoelhar",
    "dor e inchaco ao ajoelhar",
    "inchaço superficial sobre a rótula",
    "inchaco superficial sobre a rotula"
  ],
  "tunelTarsal": [
    "queimação na sola do pé e atrás do maléolo medial",
    "queimacao na sola do pe e atras do maleolo medial",
    "formigamento na planta do pé vindo do tornozelo medial",
    "formigamento na planta do pe vindo do tornozelo medial",
    "choque na sola ao bater atrás do maléolo medial",
    "choque na sola ao bater atras do maleolo medial",
    "dormência plantar pior em pé",
    "dormencia plantar pior em pe",
    "formigamento no calcanhar e planta do pé",
    "formigamento no calcanhar e planta do pe",
    "formigamento na planta do pé vindo de trás do maléolo medial",
    "formigamento na planta do pe vindo de tras do maleolo medial",
    "formigamento plantar vindo de trás do maléolo medial",
    "formigamento plantar vindo de tras do maleolo medial"
  ],
  "halluxRigidus": [
    "dor e rigidez na articulação do dedão do pé",
    "dor e rigidez na articulacao do dedao do pe",
    "primeira metatarsofalângica rígida e dolorosa",
    "primeira metatarsofalangica rigida e dolorosa",
    "dor no dedão ao empurrar o chão",
    "dor no dedao ao empurrar o chao",
    "dor no hálux ao caminhar e pouca dorsiflexão",
    "dor no halux ao caminhar e pouca dorsiflexao",
    "dedão do pé rígido ao caminhar",
    "dedao do pe rigido ao caminhar",
    "dedão do pé rígido e doloroso",
    "dedao do pe rigido e doloroso",
    "pouca dorsiflexão do dedão do pé",
    "pouca dorsiflexao do dedao do pe"
  ],
  "metatarsalgia": [
    "dor difusa no antepé sob as cabeças dos metatarsos",
    "dor difusa no antepe sob as cabecas dos metatarsos",
    "dor na planta do antepé ao ficar em pé",
    "dor na planta do antepe ao ficar em pe",
    "dor sob os metatarsos ao caminhar",
    "dor na bola do pé ao caminhar",
    "dor na bola do pe ao caminhar",
    "sensibilidade difusa nas cabeças metatarsais",
    "sensibilidade difusa nas cabecas metatarsais",
    "dor difusa na bola do pé ao caminhar",
    "dor difusa na bola do pe ao caminhar",
    "dor difusa na bola do pé sob várias cabeças metatarsais",
    "dor difusa na bola do pe sob varias cabecas metatarsais",
    "dor difusa sob várias cabeças metatarsais",
    "dor difusa sob varias cabecas metatarsais"
  ],
  "pronadorMediano": [
    "dor no antebraço proximal com formigamento no polegar indicador e médio",
    "dor no antebraco proximal com formigamento no polegar indicador e medio",
    "formigamento nos três primeiros dedos pior ao pronar",
    "formigamento nos tres primeiros dedos pior ao pronar",
    "sintomas medianos pioram com pronação resistida",
    "sintomas medianos pioram com pronacao resistida",
    "dor na face anterior do antebraço com parestesia mediana",
    "dor na face anterior do antebraco com parestesia mediana",
    "síndrome do pronador",
    "sindrome do pronador"
  ],
  "escafolunar": [
    "dor dorsal central no punho após queda",
    "dor dorsal central no punho apos queda",
    "dor no intervalo escafolunar",
    "estalo central no punho após queda",
    "estalo central no punho apos queda",
    "clique central no punho ao apoiar",
    "punho estala no centro ao apoiar",
    "dor central no punho ao fazer apoio",
    "instabilidade escafolunar"
  ],
  "ligamentoUlnarPolegar": [
    "polegar abriu para fora após trauma",
    "polegar abriu para fora apos trauma",
    "dor na base do polegar após hiperabdução",
    "dor na base do polegar apos hiperabducao",
    "polegar do esquiador",
    "gamekeeper thumb",
    "instabilidade na metacarpofalângica do polegar",
    "instabilidade na metacarpofalangica do polegar",
    "dor no lado ulnar da mcp do polegar após trauma",
    "dor no lado ulnar da mcp do polegar apos trauma"
  ],
  "calcificacaoOmbro": [
    "calcificação no ombro",
    "calcificacao no ombro",
    "tendinite calcária",
    "tendinite calcaria",
    "tendinopatia calcária",
    "tendinopatia calcaria",
    "depósito de cálcio no manguito",
    "deposito de calcio no manguito",
    "calcificação do supraespinhal",
    "calcificacao do supraespinhal"
  ],
  "ligamentoUlnarCotovelo": [
    "dor medial no cotovelo durante arremesso",
    "dor na parte interna do cotovelo ao arremessar",
    "piora em valgo durante arremesso",
    "instabilidade medial do cotovelo ao arremessar",
    "dor medial no cotovelo ao lançar",
    "dor interna do cotovelo no saque",
    "ligamento colateral ulnar do cotovelo",
    "lesão do lcu do cotovelo",
    "lesao do lcu do cotovelo"
  ],
  "meralgiaParestesica": [
    "queimação na lateral da coxa sem fraqueza",
    "queimacao na lateral da coxa sem fraqueza",
    "dormência na parte de fora da coxa",
    "dormencia na parte de fora da coxa",
    "formigamento na face anterolateral da coxa",
    "formigamento na lateral da coxa",
    "piora com cinto apertado",
    "piora com roupa apertada na cintura",
    "meralgia parestésica",
    "meralgia parestesica"
  ],
  "tendaoQuadriceps": [
    "dor acima da patela ao saltar",
    "dor no tendão do quadríceps acima da patela",
    "dor no tendao do quadriceps acima da patela",
    "dor no polo superior da patela ao agachar",
    "dor acima da rótula ao pular",
    "dor acima da rotula ao pular",
    "tendinopatia do quadríceps",
    "tendinopatia do quadriceps"
  ],
  "impactoAnteriorTornozelo": [
    "dor na frente do tornozelo ao agachar fundo",
    "dor anterior no tornozelo em dorsiflexão",
    "dor anterior no tornozelo em dorsiflexao",
    "pinçamento na frente do tornozelo",
    "pincamento na frente do tornozelo",
    "dor anterior do tornozelo ao levar o joelho para frente",
    "impacto anterior do tornozelo",
    "impingement anterior do tornozelo",
    "dor na frente do tornozelo no agachamento profundo em dorsiflexão",
    "dor na frente do tornozelo no agachamento profundo em dorsiflexao"
  ],
  "impactoPosteriorTornozelo": [
    "dor profunda atrás do tornozelo em flexão plantar máxima",
    "dor profunda atras do tornozelo em flexao plantar maxima",
    "dor posterior do tornozelo ao ficar na ponta do pé",
    "dor posterior do tornozelo ao ficar na ponta do pe",
    "dor atrás do tornozelo ao apontar o pé",
    "dor atras do tornozelo ao apontar o pe",
    "impacto posterior do tornozelo",
    "impingement posterior do tornozelo",
    "dor posterior profunda no tornozelo ao chutar"
  ],
  "placaPlantar": [
    "dor plantar sob a segunda metatarsofalângica",
    "dor plantar sob a segunda metatarsofalangica",
    "dor embaixo do segundo dedo na bola do pé",
    "dor embaixo do segundo dedo na bola do pe",
    "segundo dedo desviando para cima",
    "segundo dedo cruzando sobre o outro",
    "instabilidade da segunda metatarsofalângica",
    "instabilidade da segunda metatarsofalangica",
    "lesão da placa plantar",
    "lesao da placa plantar",
    "dor plantar sob a segunda mtf",
    "dor plantar bem sob a segunda mtf",
    "segundo dedo está subindo",
    "segundo dedo esta subindo",
    "segundo dedo subindo e desviando"
  ],
  "stressNavicular": [
    "dor focal no navicular após aumento de corrida",
    "dor focal no navicular apos aumento de corrida",
    "dor dorsal no mediopé sobre o navicular em corredor",
    "dor dorsal no mediope sobre o navicular em corredor",
    "ponto doloroso no navicular ao correr",
    "dor óssea focal no navicular com carga",
    "dor ossea focal no navicular com carga",
    "lesão por estresse do navicular",
    "lesao por estresse do navicular",
    "dor focal no navicular ao correr",
    "dor no navicular ao correr",
    "navicular doloroso após aumentar corrida",
    "navicular doloroso apos aumentar corrida"
  ],
  "stressCalcaneo": [
    "dor profunda no calcâneo após aumento de corrida",
    "dor profunda no calcaneo apos aumento de corrida",
    "dor no calcanhar ao comprimir os lados",
    "teste de compressão do calcâneo doloroso",
    "teste de compressao do calcaneo doloroso",
    "dor óssea profunda no calcâneo com carga",
    "dor ossea profunda no calcaneo com carga",
    "fratura por estresse do calcâneo",
    "fratura por estresse do calcaneo"
  ],
  "aquilesInsercionalRetrocalcanea": [
    "dor na inserção do aquiles no calcâneo",
    "dor na insercao do aquiles no calcaneo",
    "dor atrás do calcanhar pior com sapato fechado",
    "dor atras do calcanhar pior com sapato fechado",
    "inchaço entre aquiles e calcâneo",
    "inchaco entre aquiles e calcaneo",
    "bursite retrocalcânea",
    "bursite retrocalcanea",
    "saliência atrás do calcanhar dolorosa no sapato",
    "saliencia atras do calcanhar dolorosa no sapato"
  ],
  "sesamoidePrimeiroRaio": [
    "dor embaixo do dedão do pé ao impulsionar",
    "dor embaixo do dedao do pe ao impulsionar",
    "dor plantar sob a primeira metatarsofalângica",
    "dor plantar sob a primeira metatarsofalangica",
    "dor nos sesamoides ao caminhar",
    "dor no sesamoide do hálux",
    "dor no sesamoide do halux",
    "sesamoidite",
    "fratura por estresse do sesamoide",
    "dor plantar embaixo do dedão do pé",
    "dor plantar embaixo do dedao do pe",
    "sensibilidade sobre os sesamoides"
  ],
  "passivaOmbroLimitada": [
    "passivo do ombro limitado",
    "movimento passivo do ombro limitado",
    "movimento passivo também limitado",
    "movimento passivo tambem limitado",
    "não consegue girar passivamente o ombro",
    "nao consegue girar passivamente o ombro",
    "examinador não consegue girar o ombro",
    "examinador nao consegue girar o ombro",
    "amplitude passiva do ombro reduzida",
    "adm passiva do ombro reduzida",
    "rotação passiva limitada no ombro",
    "rotacao passiva limitada no ombro"
  ],
  "rotacaoExternaPassivaOmbro": [
    "rotação externa passiva limitada",
    "rotacao externa passiva limitada",
    "girar para fora passivamente",
    "quase não consegue girar para fora passivamente",
    "quase nao consegue girar para fora passivamente",
    "perda de rotação externa passiva",
    "perda de rotacao externa passiva",
    "rotação externa passiva muito limitada",
    "rotacao externa passiva muito limitada"
  ],
  "amplitudePassivaPreservadaOmbro": [
    "movimento passivo está preservado",
    "movimento passivo esta preservado",
    "movimento passivo preservado",
    "amplitude passiva preservada",
    "adm passiva preservada",
    "passivamente mexe normal",
    "passivamente movimenta normal",
    "passivo preservado no ombro"
  ],
  "apreensaoInstabilidadeOmbro": [
    "parece que vai sair quando arma o braço",
    "parece que vai sair quando arma o braco",
    "vai sair em abdução e rotação externa",
    "vai sair em abducao e rotacao externa",
    "apreensão em abdução e rotação externa",
    "apreensao em abducao e rotacao externa",
    "medo em abdução e rotação externa",
    "medo em abducao e rotacao externa",
    "episódios prévios de subluxação",
    "episodios previos de subluxacao",
    "episódios de subluxação",
    "episodios de subluxacao"
  ],
  "trajetoC8Cervical": [
    "dor cervical e medial do antebraço até quarto e quinto dedos",
    "dor cervical e medial do antebraco ate quarto e quinto dedos",
    "dor do pescoço pela face medial do antebraço até quarto e quinto dedos",
    "dor do pescoco pela face medial do antebraco ate quarto e quinto dedos",
    "cervical para face medial do antebraço e quarto quinto dedos",
    "cervical para face medial do antebraco e quarto quinto dedos",
    "pescoço até quarto e quinto dedos pela face medial do antebraço",
    "pescoco ate quarto e quinto dedos pela face medial do antebraco"
  ],
  "sinalTeatroFemoropatelar": [
    "dor depois de ficar muito tempo sentado",
    "dor após ficar muito tempo sentado",
    "dor apos ficar muito tempo sentado",
    "piora ficando muito tempo sentado",
    "ficar muito tempo sentado piora o joelho",
    "dor no joelho depois de ficar sentado",
    "sinal do cinema",
    "dor ao levantar depois de ficar sentado"
  ],
  "crepitacaoJoelho": [
    "joelho crepita",
    "crepitação no joelho",
    "crepitacao no joelho",
    "joelho range",
    "joelho estala como areia",
    "crepitação ao movimentar o joelho",
    "crepitacao ao movimentar o joelho"
  ],
  "rigidezCurtaJoelho": [
    "rigidez curta após repouso",
    "rigidez curta apos repouso",
    "joelho rígido nos primeiros passos",
    "joelho rigido nos primeiros passos",
    "rigidez após ficar parado",
    "rigidez apos ficar parado",
    "rigidez matinal curta no joelho"
  ],
  "dorsiflexaoCarregadaTornozelo": [
    "dorsiflexão carregada do tornozelo",
    "dorsiflexao carregada do tornozelo",
    "dor na frente do tornozelo no agachamento profundo em dorsiflexão",
    "dor na frente do tornozelo no agachamento profundo em dorsiflexao",
    "pinça na frente do tornozelo ao levar o joelho para frente",
    "pinca na frente do tornozelo ao levar o joelho para frente"
  ]
};

  var PERFIS = [
  {
    "nome": "Dor cervical associada a chicote — investigar",
    "nivel": "prioritaria",
    "todos": [
      "cervical"
    ],
    "pontos": {
      "whiplash": 3,
      "trauma": 2,
      "cefaleiaCervical": 1,
      "neurologico": 2
    },
    "minimoPontos": 3,
    "perguntas": [
      "Mecanismo e velocidade, sintomas neurológicos, tontura, cefaleia, amplitude, coordenação e sinais de fratura."
    ]
  },
  {
    "nome": "Cervicalgia mecânica postural — investigar",
    "nivel": "alternativa",
    "todos": [
      "cervical"
    ],
    "pontos": {
      "posturaCervical": 3,
      "inicioInsidiosoCervical": 2,
      "rigidez": 1,
      "neurologico": -2
    },
    "minimoPontos": 3,
    "perguntas": [
      "Posturas mantidas, mobilidade cervical ativa, resistência muscular, carga ocupacional e exame neurológico de segurança."
    ]
  },
  {
    "nome": "Síndrome do desfiladeiro torácico — investigar",
    "nivel": "prioritaria",
    "todos": [
      "desfiladeiroToracico"
    ],
    "pontos": {
      "neurologico": 2,
      "irradiacaoBraco": 1,
      "elevacaoBraco": 1,
      "pioraMovimentoPescoco": -2,
      "desfiladeiroToracico": 2
    },
    "minimoPontos": 2,
    "perguntas": [
      "Distribuição dos sintomas, elevação sustentada, exame neurovascular, coluna cervical, primeira costela e testes provocativos interpretados em conjunto."
    ]
  },
  {
    "nome": "Torcicolo agudo / bloqueio muscular cervical — investigar",
    "nivel": "alternativa",
    "todos": [
      "cervical"
    ],
    "pontos": {
      "torcicoloAgudo": 4,
      "inicioAoAcordarCervical": 1,
      "rigidez": 1,
      "trauma": -1
    },
    "minimoPontos": 4,
    "perguntas": [
      "Início, postura antálgica, amplitude ativa/passiva, espasmo, trauma e exame neurológico."
    ]
  },
  {
    "nome": "Espondilose cervical / osteoartrose cervical — investigar",
    "nivel": "alternativa",
    "todos": [
      "cervical"
    ],
    "pontos": {
      "cronicaCervical": 3,
      "rigidez": 2,
      "pioraMovimentoPescoco": 1,
      "neurologico": 1
    },
    "minimoPontos": 4,
    "perguntas": [
      "Idade e duração, amplitude, crepitação, exame neurológico, sinais de mielopatia e necessidade de investigação médica."
    ]
  },
  {
    "nome": "Cervicobraquialgia miofascial — investigar",
    "nivel": "alternativa",
    "todos": [
      "cervical"
    ],
    "pontos": {
      "irradiacaoBraco": 2,
      "trapezioSuperior": 2,
      "pontoGatilhoCervical": 1,
      "trajetoAlemCotovelo": -2,
      "dermatomaMaoEspecifico": -2
    },
    "minimoPontos": 3,
    "perguntas": [
      "Trajeto, reprodução por palpação, mobilidade cervical, exame do ombro e rastreio neurológico."
    ]
  },
  {
    "nome": "Síndrome miofascial do trapézio superior — investigar",
    "nivel": "alternativa",
    "todos": [
      "trapezioSuperior"
    ],
    "pontos": {
      "pontoGatilhoCervical": 3,
      "posturaCervical": 1,
      "cervical": 1,
      "neurologico": -2
    },
    "minimoPontos": 3,
    "perguntas": [
      "Palpação e reprodução da dor, postura, resistência cervical/escapular e exclusão de origem neural."
    ]
  },
  {
    "nome": "Possível instabilidade cervical pós-traumática — avaliação médica prioritária",
    "nivel": "urgente",
    "todos": [
      "cervical"
    ],
    "pontos": {
      "instabilidadeCervical": 4,
      "trauma": 2,
      "neurologico": 1
    },
    "minimoPontos": 4,
    "perguntas": [
      "Mecanismo, dor intensa, sintomas neurológicos, sinais vasculares, regras de decisão para trauma cervical e necessidade de imagem."
    ]
  },
  {
    "nome": "Síndrome do elevador da escápula — investigar",
    "nivel": "alternativa",
    "todos": [
      "elevadorEscapula"
    ],
    "pontos": {
      "elevadorEscapula": 3,
      "cervical": 1,
      "rigidez": 1,
      "posturaCervical": 1
    },
    "minimoPontos": 3,
    "perguntas": [
      "Palpação no ângulo superior, rotação cervical, alongamento, controle escapular e diferenciação do trapézio."
    ]
  },
  {
    "nome": "Distensão muscular cervical aguda — investigar",
    "nivel": "alternativa",
    "todos": [
      "cervical"
    ],
    "pontos": {
      "esforcoCervical": 4,
      "trauma": 1,
      "rigidez": 1,
      "neurologico": -2
    },
    "minimoPontos": 4,
    "perguntas": [
      "Mecanismo, palpação, contração resistida, amplitude, sinais neurológicos e critérios de trauma."
    ]
  },
  {
    "nome": "Neuralgia occipital — investigar",
    "nivel": "prioritaria",
    "todos": [
      "occipitalUnilateral"
    ],
    "pontos": {
      "nervoOccipital": 4,
      "cefaleiaCervical": 1,
      "cervical": 1
    },
    "minimoPontos": 4,
    "perguntas": [
      "Trajeto occipital, sensibilidade do couro cabeludo, palpação do nervo occipital, exame cervical e diferenciação de cefaleias."
    ]
  },
  {
    "nome": "Tontura cervicogênica — hipótese após exclusão — investigar",
    "nivel": "prioritaria",
    "todos": [
      "cervical"
    ],
    "pontos": {
      "tonturaCervical": 4,
      "pioraMovimentoPescoco": 1,
      "rigidez": 1
    },
    "minimoPontos": 4,
    "perguntas": [
      "Relação temporal com dor cervical, exame neurológico e vestibular, sinais vasculares e exclusão de causas não cervicais."
    ]
  },
  {
    "nome": "Possível ruptura traumática do manguito do ombro — avaliação médica prioritária",
    "nivel": "urgente",
    "todos": [
      "ombro"
    ],
    "pontos": {
      "rupturaManguito": 4,
      "trauma": 2,
      "traumaOmbro": 2,
      "perdaForcaAgudaOmbro": 3
    },
    "minimoPontos": 5,
    "perguntas": [
      "Incapacidade de elevar, força, queda do braço, deformidade, exame neurovascular e necessidade de imagem."
    ]
  },
  {
    "nome": "Tendinopatia da cabeça longa do bíceps — investigar",
    "nivel": "alternativa",
    "todos": [
      "ombro"
    ],
    "pontos": {
      "bicepsOmbro": 3,
      "carga": 1,
      "elevacaoBraco": 1
    },
    "minimoPontos": 3,
    "perguntas": [
      "Palpação do sulco, flexão/supinação resistidas, carga e diferenciação do manguito/labrum."
    ]
  },
  {
    "nome": "Epicondilalgia medial — investigar",
    "nivel": "alternativa",
    "todos": [
      "cotoveloMedial"
    ],
    "pontos": {
      "preensao": 2,
      "carga": 1,
      "provocacaoEpicondiloMedial": 3
    },
    "minimoPontos": 3,
    "perguntas": [
      "Flexão/pronação resistidas, preensão, palpação e rastreio do nervo ulnar."
    ]
  },
  {
    "nome": "Neuropatia ulnar no cotovelo — investigar",
    "nivel": "prioritaria",
    "todos": [
      "provocacaoUlnarCotovelo"
    ],
    "pontos": {
      "distribuicaoUlnarMao": 3,
      "nervoUlnar": 1,
      "neurologico": 1,
      "preensao": 1
    },
    "minimoPontos": 3,
    "perguntas": [
      "Distribuição no quarto/quinto dedos, relação com flexão/apoio do cotovelo, força intrínseca, sensibilidade e diferenciação C8/T1 e canal de Guyon."
    ]
  },
  {
    "nome": "Lesão do complexo fibrocartilaginoso triangular — investigar",
    "nivel": "alternativa",
    "todos": [
      "punhoUlnar"
    ],
    "pontos": {
      "trauma": 1,
      "preensao": 1,
      "carga": 1,
      "mecanicoPunhoUlnar": 1
    },
    "minimoPontos": 1,
    "perguntas": [
      "Carga axial, rotação, clique, estabilidade radioulnar distal e mecanismo traumático."
    ]
  },
  {
    "nome": "Sobrecarga do flexor do quadril/iliopsoas — investigar",
    "nivel": "alternativa",
    "todos": [
      "quadril"
    ],
    "pontos": {
      "flexorQuadril": 3,
      "carga": 1,
      "quadrilMecanico": 1
    },
    "minimoPontos": 3,
    "perguntas": [
      "Flexão resistida, extensão do quadril, ressalto, carga esportiva e diferenciação intra-articular."
    ]
  },
  {
    "nome": "Tendinopatia proximal dos isquiotibiais — investigar",
    "nivel": "alternativa",
    "todos": [
      "isquioProximal"
    ],
    "pontos": {
      "isquiotibial": 1,
      "carga": 1
    },
    "minimoPontos": 1,
    "perguntas": [
      "Dor ao sentar, palpação isquiática, testes de carga em alongamento e diferenciação neural."
    ]
  },
  {
    "nome": "Lesão do ligamento colateral medial — investigar",
    "nivel": "prioritaria",
    "todos": [
      "joelho"
    ],
    "pontos": {
      "ligamentoMedialJoelho": 3,
      "trauma": 1,
      "linhaArticularJoelho": 1
    },
    "minimoPontos": 3,
    "perguntas": [
      "Mecanismo em valgo, palpação, estresse em 0°/30°, estabilidade e lesões associadas."
    ]
  },
  {
    "nome": "Lesão do ligamento colateral lateral — investigar",
    "nivel": "prioritaria",
    "todos": [
      "joelho"
    ],
    "pontos": {
      "ligamentoLateralJoelho": 3,
      "trauma": 1,
      "instabilidadeJoelho": 1
    },
    "minimoPontos": 3,
    "perguntas": [
      "Mecanismo em varo, palpação, estresse em 0°/30°, complexo posterolateral e exame neurovascular."
    ]
  },
  {
    "nome": "Síndrome da banda iliotibial — investigar",
    "nivel": "alternativa",
    "todos": [
      "joelho"
    ],
    "pontos": {
      "tratoIliotibial": 3,
      "carga": 1,
      "corridaRapida": 1
    },
    "minimoPontos": 3,
    "perguntas": [
      "Tempo/distância para início, corrida em descida, palpação lateral, controle de quadril e carga."
    ]
  },
  {
    "nome": "Síndrome da pata de ganso — investigar",
    "nivel": "alternativa",
    "todos": [
      "joelho"
    ],
    "pontos": {
      "pataGanso": 3,
      "flexaoJoelhoCarga": 1,
      "carga": 1
    },
    "minimoPontos": 3,
    "perguntas": [
      "Palpação abaixo da interlinha medial, escadas, força e diferenciação meniscal/MCL."
    ]
  },
  {
    "nome": "Cisto poplíteo / derrame posterior — investigar",
    "nivel": "alternativa",
    "todos": [
      "joelho"
    ],
    "pontos": {
      "cistoPopliteo": 3,
      "derrameJoelho": 1
    },
    "minimoPontos": 3,
    "perguntas": [
      "Massa posterior, variação com flexão, derrame intra-articular e diferenciação vascular."
    ]
  },
  {
    "nome": "Entorse da sindesmose — investigar",
    "nivel": "prioritaria",
    "todos": [
      "tornozelo"
    ],
    "pontos": {
      "sindesmose": 3,
      "provocacaoSindesmose": 2,
      "trauma": 1,
      "carga": 1
    },
    "minimoPontos": 3,
    "perguntas": [
      "Rotação externa, squeeze, altura da dor, capacidade de carga e critérios de imagem."
    ]
  },
  {
    "nome": "Disfunção/tendinopatia do tibial posterior — investigar",
    "nivel": "prioritaria",
    "todos": [
      "tibialPosterior"
    ],
    "pontos": {
      "tibialPosterior": 3,
      "insuficienciaTibialPosterior": 2,
      "carga": 1,
      "apoioUnipodal": 1
    },
    "minimoPontos": 3,
    "perguntas": [
      "Elevação unilateral do calcanhar, arco, alinhamento, força de inversão e progressão da deformidade."
    ]
  },
  {
    "nome": "Tendinopatia ou instabilidade dos fibulares — investigar",
    "nivel": "alternativa",
    "todos": [
      "tornozelo"
    ],
    "pontos": {
      "fibulares": 3,
      "instabilidadeFibulares": 2,
      "inversao": 1,
      "carga": 1
    },
    "minimoPontos": 3,
    "perguntas": [
      "Eversão resistida, palpação retromaleolar, subluxação, estabilidade lateral e carga."
    ]
  },
  {
    "nome": "Lesão óssea por estresse do metatarso — excluir se compatível",
    "nivel": "prioritaria",
    "todos": [
      "metatarsoFocal"
    ],
    "pontos": {
      "carga": 2,
      "noturna": 1,
      "marchaLimitada": 1
    },
    "minimoPontos": 2,
    "perguntas": [
      "Dor focal, salto, progressão de carga, saúde óssea e necessidade de imagem."
    ]
  },
  {
    "nome": "Neuroma de Morton — investigar",
    "nivel": "alternativa",
    "todos": [
      "morton"
    ],
    "pontos": {
      "carga": 1,
      "neurologico": 1
    },
    "minimoPontos": 1,
    "perguntas": [
      "Espaço interdigital, compressão do antepé, calçado, sintomas neurais e diferenciação metatarsal."
    ]
  },
  {
    "nome": "Possível lesão de Lisfranc — avaliação médica prioritária",
    "nivel": "urgente",
    "todos": [
      "lisfranc"
    ],
    "pontos": {
      "trauma": 2,
      "traumaMediope": 1,
      "sinalEspecificoLisfranc": 3,
      "incapazQuatroPassos": 2,
      "carga": 1
    },
    "minimoPontos": 2,
    "perguntas": [
      "Equimose plantar, dor no mediopé, carga, alinhamento e necessidade de imagem com apoio."
    ]
  },
  {
    "nome": "Tendinopatia do Aquiles — investigar",
    "nivel": "alternativa",
    "todos": [
      "posteriorTornozelo"
    ],
    "pontos": {
      "aquilesCarga": 3,
      "carga": 1,
      "rigidez": 1
    },
    "minimoPontos": 3,
    "perguntas": [
      "Localização insercional ou porção média, elevação do calcanhar, rigidez matinal e resposta à carga."
    ]
  },
  {
    "nome": "Sintomas torácicos/cardiorrespiratórios — avaliação médica urgente",
    "nivel": "urgente",
    "todos": [
      "cardiopulmonar"
    ],
    "perguntas": [
      "Início súbito, dispneia, opressão, sudorese, síncope, relação com esforço e sinais vitais."
    ]
  },
  {
    "nome": "Possível fratura vertebral — avaliação médica prioritária",
    "nivel": "urgente",
    "todos": [
      "toracica"
    ],
    "pontos": {
      "riscoFratura": 3,
      "trauma": 2,
      "noturna": 1
    },
    "minimoPontos": 4,
    "perguntas": [
      "Trauma, osteoporose, corticoide, dor focal, deformidade, déficit neurológico e necessidade de imagem."
    ]
  },
  {
    "nome": "Dor torácica musculoesquelética/costal — investigar",
    "nivel": "alternativa",
    "todos": [
      "toracica"
    ],
    "pontos": {
      "costalMecanico": 3,
      "provocacaoRespiratoriaToracica": 1,
      "trauma": 1,
      "carga": 1,
      "cardiopulmonar": -4,
      "sistemicoAltoRisco": -3
    },
    "minimoPontos": 3,
    "perguntas": [
      "Reprodução com movimento/palpação, mobilidade torácica e costal; dor respiratório-dependente exige rastreio pleuropulmonar antes de atribuir origem musculoesquelética."
    ]
  },
  {
    "nome": "Dor lombar inflamatória / possível espondiloartrite axial — encaminhar para investigação",
    "nivel": "prioritaria",
    "todos": [
      "lombar"
    ],
    "pontos": {
      "inflamatoria": 4,
      "noturna": 1,
      "rigidez": 1,
      "sacroiliaca": 1,
      "carga": -1
    },
    "minimoPontos": 4,
    "perguntas": [
      "Idade de início, duração acima de três meses, despertar na segunda metade da noite, melhora com exercício, dor glútea alternante, psoríase, uveíte e histórico familiar."
    ]
  },
  {
    "nome": "Dor lombar mecânica inespecífica — investigar",
    "nivel": "alternativa",
    "todos": [
      "lombar"
    ],
    "pontos": {
      "carga": 2,
      "padraoMobilidadeLombar": 1,
      "controleMovimentoLombar": 1,
      "sistemico": -4,
      "visceralRenal": -4
    },
    "minimoPontos": 2,
    "perguntas": [
      "Relação com carga e posições, incapacidade funcional, sono, fatores psicossociais, exame neurológico e resposta a movimentos."
    ]
  },
  {
    "nome": "Dor lombar com déficit de mobilidade — investigar",
    "nivel": "alternativa",
    "todos": [
      "lombar"
    ],
    "pontos": {
      "padraoMobilidadeLombar": 3,
      "rigidez": 1,
      "flexao": 1,
      "extensao": 1,
      "neurologico": -2
    },
    "minimoPontos": 3,
    "perguntas": [
      "Amplitude ativa, mobilidade segmentar, duração da rigidez, quadril, marcha e tarefa funcional limitada."
    ]
  },
  {
    "nome": "Dor lombar com alteração de coordenação do movimento — investigar",
    "nivel": "alternativa",
    "todos": [
      "lombar"
    ],
    "pontos": {
      "controleMovimentoLombar": 3,
      "instabilidadeLombar": 2,
      "carga": 1,
      "neurologico": -2
    },
    "minimoPontos": 3,
    "perguntas": [
      "Controle lombo-pélvico, arco doloroso, retorno da flexão, transferência de carga, recorrência e medo de movimento."
    ]
  },
  {
    "nome": "Dor lombar com padrão discogênico / resposta direcional — investigar",
    "nivel": "prioritaria",
    "todos": [
      "lombar"
    ],
    "pontos": {
      "centralizacaoLombar": 4,
      "periferizacaoLombar": 3,
      "flexao": 1,
      "valsalvaLombar": 1,
      "quadrilDominante": -3
    },
    "minimoPontos": 4,
    "perguntas": [
      "Centralização/periferização com movimentos repetidos, posição agravante, exame neurológico, tosse/Valsalva e tolerância ao sentar."
    ]
  },
  {
    "nome": "Dor lombar com predomínio facetário/extensão-rotação — investigar",
    "nivel": "alternativa",
    "todos": [
      "lombar"
    ],
    "pontos": {
      "facetaLombar": 4,
      "extensao": 1,
      "irradiacaoPerna": -1,
      "quadrilDominante": -2
    },
    "minimoPontos": 4,
    "perguntas": [
      "Extensão-rotação, localização paravertebral, movimento combinado, quadril e exame neurológico."
    ]
  },
  {
    "nome": "Possível espondilólise lombar — investigar e considerar imagem",
    "nivel": "prioritaria",
    "todos": [
      "lombar"
    ],
    "pontos": {
      "extensaoRepetidaJovem": 4,
      "facetaLombar": 1,
      "carga": 1,
      "riscoFratura": 1
    },
    "minimoPontos": 4,
    "perguntas": [
      "Idade, esporte com extensão repetida, apoio unipodal, carga recente, dor focal e necessidade de avaliação médica/imagem."
    ]
  },
  {
    "nome": "Possível espondilolistese lombar sintomática — investigar",
    "nivel": "prioritaria",
    "todos": [
      "lombar"
    ],
    "pontos": {
      "degrauLombar": 4,
      "instabilidadeLombar": 2,
      "extensao": 1,
      "neurologico": 1
    },
    "minimoPontos": 4,
    "perguntas": [
      "Degrau palpável, extensão, alinhamento, sintomas neurológicos, marcha e necessidade de imagem."
    ]
  },
  {
    "nome": "Possível fratura por compressão lombar — avaliação médica prioritária",
    "nivel": "urgente",
    "todos": [
      "lombar"
    ],
    "pontos": {
      "riscoFratura": 3,
      "dorFocalVertebralLombar": 3,
      "trauma": 2,
      "noturna": 1
    },
    "minimoPontos": 5,
    "perguntas": [
      "Trauma, osteoporose, corticoide, percussão focal, deformidade, exame neurológico e indicação de imagem."
    ]
  },
  {
    "nome": "Possível infecção vertebral lombar — avaliação médica prioritária",
    "nivel": "urgente",
    "todos": [
      "lombar"
    ],
    "pontos": {
      "infeccaoColunaRisco": 5,
      "sistemico": 2,
      "noturna": 1
    },
    "minimoPontos": 5,
    "perguntas": [
      "Febre, infecção ou procedimento recente, imunossupressão, uso de drogas injetáveis, dor constante e estado geral."
    ]
  },
  {
    "nome": "Possível doença neoplásica com manifestação lombar — avaliação médica prioritária",
    "nivel": "urgente",
    "todos": [
      "lombar"
    ],
    "pontos": {
      "oncologicoColunaRisco": 5,
      "sistemico": 2,
      "noturna": 1
    },
    "minimoPontos": 5,
    "perguntas": [
      "Histórico de câncer, perda de peso, progressão, dor noturna/repouso, exame neurológico e investigação médica."
    ]
  },
  {
    "nome": "Possível origem renal/visceral da dor lombar — avaliação médica",
    "nivel": "urgente",
    "todos": [
      "lombar"
    ],
    "pontos": {
      "visceralRenal": 5,
      "sistemico": 1,
      "carga": -2,
      "flexao": -1,
      "extensao": -1
    },
    "minimoPontos": 5,
    "perguntas": [
      "Sintomas urinários, hematúria, febre, náusea, cólica para virilha, palpação abdominal e sinais vitais."
    ]
  },
  {
    "nome": "Dor relacionada à articulação sacroilíaca/cintura pélvica — investigar",
    "nivel": "alternativa",
    "todos": [
      "sacroiliaca"
    ],
    "pontos": {
      "transferencia": 2,
      "apoioUnipodal": 2,
      "carga": 1
    },
    "minimoPontos": 2,
    "perguntas": [
      "Localização com um dedo, transferências, apoio unilateral e conjunto de testes provocativos."
    ]
  },
  {
    "nome": "Lesão ou sobrecarga de adutores — investigar",
    "nivel": "alternativa",
    "todos": [
      "adutor"
    ],
    "pontos": {
      "carga": 2,
      "trauma": 2,
      "corridaRapida": 1
    },
    "minimoPontos": 2,
    "perguntas": [
      "Adução resistida, palpação, amplitude do quadril, mudança de direção e diferenciação inguinal."
    ]
  },
  {
    "nome": "Lesão dos isquiotibiais — investigar",
    "nivel": "prioritaria",
    "todos": [
      "isquiotibial"
    ],
    "pontos": {
      "corridaRapida": 3,
      "trauma": 2,
      "carga": 1
    },
    "minimoPontos": 3,
    "perguntas": [
      "Início súbito, equimose, palpação, força em diferentes comprimentos e função neural."
    ]
  },
  {
    "nome": "Síndrome do estresse tibial medial — investigar",
    "nivel": "alternativa",
    "todos": [
      "tibiaMedial"
    ],
    "pontos": {
      "carga": 2,
      "corridaRapida": 1
    },
    "minimoPontos": 2,
    "perguntas": [
      "Área dolorosa maior que 5 cm, progressão de carga, palpação, salto e fatores biomecânicos."
    ]
  },
  {
    "nome": "Lesão óssea por estresse da tíbia — excluir se compatível",
    "nivel": "prioritaria",
    "todos": [
      "tibiaFocal"
    ],
    "pontos": {
      "carga": 2,
      "noturna": 2,
      "apoioUnipodal": 1
    },
    "minimoPontos": 2,
    "perguntas": [
      "Dor focal menor que 5 cm, dor ao salto, repouso/noite, progressão de carga e fatores de saúde óssea."
    ]
  },
  {
    "nome": "Síndrome compartimental crônica por esforço — investigar",
    "nivel": "prioritaria",
    "todos": [
      "pernaExercicio"
    ],
    "pontos": {
      "neurologico": 2,
      "carga": 1
    },
    "minimoPontos": 1,
    "perguntas": [
      "Tempo e distância previsíveis para início, pressão/tensão, parestesias e resolução após parar."
    ]
  },
  {
    "nome": "Possível mielopatia cervical — avaliação médica prioritária",
    "nivel": "urgente",
    "todos": [
      "cervical",
      "mielopatia"
    ],
    "perguntas": [
      "Marcha, equilíbrio, destreza das mãos, sinais de neurônio motor superior e alterações esfincterianas."
    ]
  },
  {
    "nome": "Lesão traumática importante do ombro — avaliação médica prioritária",
    "nivel": "urgente",
    "todos": [
      "ombro",
      "traumaOmbro",
      "perdaForcaAgudaOmbro"
    ],
    "perguntas": [
      "Deformidade, incapacidade funcional súbita, exame neurovascular e necessidade de imagem."
    ]
  },
  {
    "nome": "Déficit neurológico progressivo — avaliação médica prioritária",
    "nivel": "urgente",
    "todos": [
      "deficitNeurologicoProgressivo"
    ],
    "perguntas": [
      "Documentar progressão da força, distribuição neurológica, reflexos, sensibilidade, marcha/destreza e necessidade de avaliação médica prioritária."
    ]
  },
  {
    "nome": "Dor cervical com componente radicular — investigar",
    "nivel": "prioritaria",
    "todos": [
      "cervical"
    ],
    "pontos": {
      "irradiacaoBraco": 3,
      "neurologico": 2,
      "trajetoAlemCotovelo": 3,
      "dermatomaMaoEspecifico": 2,
      "trajetoC8Cervical": 3,
      "pioraMovimentoPescoco": 2,
      "trajetoRestritoOmbro": -3
    },
    "minimoPontos": 4,
    "perguntas": [
      "Dermátomos, miótomos, reflexos, teste neurodinâmico, Spurling, distração e diferenciação do ombro."
    ]
  },
  {
    "nome": "Cefaleia cervicogênica — investigar",
    "nivel": "alternativa",
    "todos": [
      "cervical"
    ],
    "pontos": {
      "cefaleiaCervical": 3,
      "rigidez": 1
    },
    "minimoPontos": 3,
    "perguntas": [
      "Relação com movimento/postura cervical, amplitude, flexão-rotação e exclusão de sinais neurológicos."
    ]
  },
  {
    "nome": "Dor cervical com déficit de mobilidade — investigar",
    "nivel": "alternativa",
    "todos": [
      "cervical"
    ],
    "pontos": {
      "rigidez": 3,
      "flexao": 1,
      "extensao": 1
    },
    "minimoPontos": 3,
    "perguntas": [
      "Amplitude cervical ativa, mobilidade cervicotorácica, duração da rigidez e tarefa funcional limitante."
    ]
  },
  {
    "nome": "Dor relacionada ao manguito rotador — investigar",
    "nivel": "prioritaria",
    "todos": [
      "ombro"
    ],
    "pontos": {
      "elevacaoBraco": 3,
      "decubitoOmbro": 1,
      "amplitudePassivaPreservadaOmbro": 2,
      "passivaOmbroLimitada": -2,
      "carga": 1,
      "noturna": 1,
      "trajetoRestritoOmbro": 1,
      "trajetoAlemCotovelo": -3,
      "pioraMovimentoPescoco": -2
    },
    "minimoPontos": 4,
    "perguntas": [
      "Arco doloroso, força de rotação externa/abdução, amplitude, função cervical e resposta à carga."
    ]
  },
  {
    "nome": "Dor local do ombro — padrão musculoesquelético a investigar",
    "nivel": "alternativa",
    "todos": [
      "ombro"
    ],
    "pontos": {
      "provocacaoOmbro": 2,
      "elevacaoBraco": 2,
      "carga": 1,
      "trajetoRestritoOmbro": 1,
      "trajetoAlemCotovelo": -2,
      "neurologico": -1
    },
    "minimoPontos": 2,
    "perguntas": [
      "Confirmar se o movimento do ombro reproduz de forma independente a queixa familiar, localizar a dor, testar amplitude/força e diferenciar origem cervical/neural."
    ]
  },
  {
    "nome": "Capsulite adesiva — investigar",
    "nivel": "alternativa",
    "todos": [
      "ombro"
    ],
    "pontos": {
      "rigidezOmbro": 3,
      "rotacaoOmbro": 2,
      "passivaOmbroLimitada": 3,
      "rotacaoExternaPassivaOmbro": 2,
      "noturna": 1
    },
    "minimoPontos": 5,
    "perguntas": [
      "Perda global ativa e passiva, rotação externa, evolução temporal, diabetes e função diária."
    ]
  },
  {
    "nome": "Instabilidade glenoumeral — investigar",
    "nivel": "prioritaria",
    "todos": [
      "ombro"
    ],
    "pontos": {
      "instabilidadeOmbro": 3,
      "apreensaoInstabilidadeOmbro": 3,
      "traumaOmbro": 2
    },
    "minimoPontos": 3,
    "perguntas": [
      "Direção e número de episódios, apreensão, hipermobilidade, controle escapular e exame neurovascular."
    ]
  },
  {
    "nome": "Dor acromioclavicular — investigar",
    "nivel": "alternativa",
    "todos": [
      "ombro"
    ],
    "pontos": {
      "acromioclavicular": 3,
      "traumaOmbro": 1
    },
    "minimoPontos": 3,
    "perguntas": [
      "Palpação localizada, adução horizontal, mecanismo traumático e diferenciação glenoumeral/cervical."
    ]
  },
  {
    "nome": "Epicondilalgia lateral — investigar",
    "nivel": "alternativa",
    "todos": [
      "cotoveloLateral"
    ],
    "pontos": {
      "preensao": 3,
      "carga": 1
    },
    "minimoPontos": 3,
    "perguntas": [
      "Preensão, extensão resistida do punho, carga repetitiva e diferenciação cervical/radial."
    ]
  },
  {
    "nome": "Síndrome do túnel do carpo — investigar",
    "nivel": "prioritaria",
    "todos": [
      "punhoMao"
    ],
    "pontos": {
      "mediano": 3,
      "noturnoMao": 2,
      "poupaDedoMinimo": 1,
      "alivioSacudirMao": 1,
      "neurologico": 1,
      "pioraMovimentoPescoco": -1
    },
    "minimoPontos": 4,
    "perguntas": [
      "Distribuição sensitiva, sintomas noturnos, alívio ao sacudir a mão, força tenar, sensibilidade e testes provocativos combinados."
    ]
  },
  {
    "nome": "Tenossinovite de De Quervain — investigar",
    "nivel": "alternativa",
    "todos": [
      "punhoMao"
    ],
    "pontos": {
      "polegarRadial": 3,
      "preensao": 2,
      "carga": 1
    },
    "minimoPontos": 3,
    "perguntas": [
      "Carga do polegar, palpação do primeiro compartimento e testes provocativos graduais."
    ]
  },
  {
    "nome": "Possível fratura de tornozelo/pé — aplicar regra de Ottawa e encaminhar se positiva",
    "nivel": "urgente",
    "todos": [
      "dorOsseaTornozelo"
    ],
    "pontos": {
      "trauma": 2,
      "incapazQuatroPassos": 3,
      "dorOsseaTornozelo": 3
    },
    "minimoPontos": 5,
    "perguntas": [
      "Capacidade de dar quatro passos e dor óssea em maléolos, navicular e base do quinto metatarso."
    ]
  },
  {
    "nome": "Sinais vasculares em panturrilha — avaliação médica prioritária",
    "nivel": "urgente",
    "todos": [
      "panturrilhaVascular"
    ],
    "perguntas": [
      "Início súbito, assimetria, calor, cirurgia ou imobilização recente, dispneia e dor torácica."
    ]
  },
  {
    "nome": "Dor femoropatelar — investigar",
    "nivel": "prioritaria",
    "todos": [
      "joelho"
    ],
    "pontos": {
      "joelhoAnterior": 3,
      "flexaoJoelhoCarga": 2,
      "flexaoProfundaJoelho": 2,
      "sinalTeatroFemoropatelar": 2,
      "carga": 1,
      "patelarFocal": -2
    },
    "minimoPontos": 4,
    "perguntas": [
      "Agachamento, step-down, escadas, corrida, alinhamento dinâmico, mobilidade e força de quadril/joelho."
    ]
  },
  {
    "nome": "Lesão meniscal — investigar",
    "nivel": "prioritaria",
    "todos": [
      "joelho"
    ],
    "pontos": {
      "torcaoJoelho": 3,
      "linhaArticularJoelho": 2,
      "flexaoProfundaJoelho": 2,
      "hiperextensaoJoelho": 2,
      "mecanicoJoelho": 3,
      "bloqueioVerdadeiroJoelho": 1,
      "derrameJoelho": 2,
      "derrameTardioJoelho": 1,
      "derramePrecoceJoelho": -1,
      "padraoLCA": -3,
      "padraoLCP": -2,
      "trauma": 1
    },
    "minimoPontos": 4,
    "perguntas": [
      "Linha articular, derrame, perda de extensão, travamento verdadeiro e testes meniscais conforme irritabilidade."
    ]
  },
  {
    "nome": "Lesão meniscal medial — investigar",
    "nivel": "prioritaria",
    "todos": [
      "joelho"
    ],
    "algum": [
      "joelhoMedial",
      "linhaArticularMedialJoelho"
    ],
    "minimoAlgum": 1,
    "pontos": {
      "linhaArticularMedialJoelho": 4,
      "joelhoMedial": 3,
      "flexaoProfundaJoelho": 2,
      "torcaoJoelho": 2,
      "mecanicoJoelho": 2,
      "bloqueioVerdadeiroJoelho": 1,
      "derrameTardioJoelho": 1,
      "joelhoLateral": -3,
      "linhaArticularLateralJoelho": -4,
      "joelhoAnterior": -1
    },
    "minimoPontos": 4,
    "perguntas": [
      "Confirmar se a dor é realmente na interlinha medial, presença de torção, travamento/bloqueio, derrame e reprodução com flexão profunda."
    ]
  },
  {
    "nome": "Lesão meniscal lateral — investigar",
    "nivel": "prioritaria",
    "todos": [
      "joelho"
    ],
    "algum": [
      "joelhoLateral",
      "linhaArticularLateralJoelho"
    ],
    "minimoAlgum": 1,
    "pontos": {
      "linhaArticularLateralJoelho": 4,
      "joelhoLateral": 3,
      "flexaoProfundaJoelho": 2,
      "torcaoJoelho": 2,
      "mecanicoJoelho": 2,
      "bloqueioVerdadeiroJoelho": 1,
      "derrameTardioJoelho": 1,
      "joelhoMedial": -3,
      "linhaArticularMedialJoelho": -4,
      "joelhoAnterior": -1
    },
    "minimoPontos": 4,
    "perguntas": [
      "Confirmar se a dor é realmente na interlinha lateral, presença de torção, travamento/bloqueio, derrame e reprodução com flexão profunda."
    ]
  },
  {
    "nome": "Derrame / irritação intra-articular do joelho — investigar",
    "nivel": "alternativa",
    "todos": [
      "joelho"
    ],
    "algum": [
      "derrameJoelho",
      "plenitudeJoelho"
    ],
    "minimoAlgum": 1,
    "pontos": {
      "derrameJoelho": 4,
      "plenitudeJoelho": 2,
      "flexaoProfundaJoelho": 1,
      "derramePrecoceJoelho": 1,
      "derrameTardioJoelho": 1,
      "bursitePrepatelar": -2
    },
    "minimoPontos": 3,
    "perguntas": [
      "Confirmar derrame intra-articular versus edema superficial: baloteio/onda, plenitude suprapatelar, perda de flexão, calor, trauma e tempo de instalação."
    ]
  },
  {
    "nome": "Lesão ligamentar do joelho — investigar",
    "nivel": "prioritaria",
    "todos": [
      "joelho"
    ],
    "pontos": {
      "trauma": 2,
      "instabilidadeJoelho": 3,
      "falseioObjetivoJoelho": 1,
      "derrameJoelho": 2,
      "derramePrecoceJoelho": 1,
      "torcaoJoelho": 1
    },
    "minimoPontos": 4,
    "perguntas": [
      "Mecanismo, tempo do edema, sensação de estalo, falseio e testes ligamentares comparativos."
    ]
  },
  {
    "nome": "Tendinopatia patelar — investigar",
    "nivel": "alternativa",
    "todos": [
      "joelhoAnterior"
    ],
    "pontos": {
      "salto": 3,
      "carga": 2,
      "flexaoJoelhoCarga": 1,
      "patelarFocal": 3
    },
    "minimoPontos": 4,
    "perguntas": [
      "Dor localizada no polo inferior da patela, resposta a saltos/agachamento e carga recente."
    ]
  },
  {
    "nome": "Osteoartrose de joelho — investigar",
    "nivel": "alternativa",
    "todos": [
      "joelho"
    ],
    "pontos": {
      "rigidez": 3,
      "rigidezCurtaJoelho": 2,
      "crepitacaoJoelho": 2,
      "carga": 2,
      "flexaoJoelhoCarga": 1,
      "torcaoJoelho": -2,
      "padraoLCA": -3,
      "padraoLCP": -3
    },
    "minimoPontos": 4,
    "perguntas": [
      "Rigidez matinal, crepitação, amplitude, derrame, marcha e tolerância às tarefas com carga."
    ]
  },
  {
    "nome": "Entorse lateral de tornozelo — investigar",
    "nivel": "prioritaria",
    "todos": [
      "tornozelo"
    ],
    "pontos": {
      "inversao": 3,
      "lateralTornozelo": 2,
      "trauma": 1
    },
    "minimoPontos": 4,
    "perguntas": [
      "Edema/equimose, palpação ligamentar, carga, amplitude, estabilidade e critérios de Ottawa."
    ]
  },
  {
    "nome": "Lesão do tendão de Aquiles — excluir ruptura se compatível",
    "nivel": "prioritaria",
    "todos": [
      "posteriorTornozelo"
    ],
    "pontos": {
      "trauma": 2,
      "marchaLimitada": 2,
      "carga": 1,
      "rupturaAquilesAguda": 3
    },
    "minimoPontos": 2,
    "perguntas": [
      "Estalo súbito, falha na impulsão, elevação unilateral do calcanhar, palpação e teste de Thompson."
    ],
    "algum": [
      "rupturaAquilesAguda",
      "marchaLimitada"
    ],
    "minimoAlgum": 1
  },
  {
    "nome": "Fasciopatia plantar — investigar",
    "nivel": "alternativa",
    "todos": [
      "calcanhar"
    ],
    "pontos": {
      "primeirosPassos": 3,
      "carga": 1,
      "rigidez": 1
    },
    "minimoPontos": 3,
    "perguntas": [
      "Dor medial do calcâneo, primeiros passos, carga acumulada, dorsiflexão e teste de Windlass."
    ]
  },
  {
    "nome": "Osteoartrose talocrural pós-traumática — investigar",
    "nivel": "alternativa",
    "todos": [
      "tornozelo"
    ],
    "pontos": {
      "rigidez": 2,
      "trauma": 2,
      "carga": 1
    },
    "minimoPontos": 4,
    "perguntas": [
      "Fratura prévia, tempo de evolução, dorsiflexão, edema, deformidade, marcha e resposta ao aquecimento."
    ]
  },
  {
    "nome": "Sinais neurológicos graves — avaliação médica urgente",
    "nivel": "urgente",
    "todos": [
      "lombar",
      "caudaEquina"
    ],
    "perguntas": [
      "Início NOVO de retenção/incontinência, anestesia em sela, função intestinal, déficit motor bilateral/progressivo e necessidade de avaliação médica urgente."
    ]
  },
  {
    "nome": "Sinais sistêmicos associados à dor — investigação prioritária",
    "nivel": "urgente",
    "todos": [
      "sistemicoAltoRisco"
    ],
    "perguntas": [
      "Febre mensurada, infecção recente, perda de peso, histórico oncológico e estado geral."
    ],
    "pontos": {
      "sistemico": 1
    },
    "minimoPontos": 1
  },
  {
    "nome": "Lombociatalgia / dor lombar irradiada — investigar",
    "nivel": "prioritaria",
    "todos": [
      "lombar"
    ],
    "pontos": {
      "irradiacaoPerna": 3,
      "trajetoAlemJoelhoLombar": 3,
      "dermatomaPeEspecifico": 2,
      "quadrilDominante": -3,
      "sacroiliacaDominante": -2,
      "trajetoRestritoJoelhoLombar": -2
    },
    "minimoPontos": 3,
    "perguntas": [
      "Até onde a dor segue, relação entre lombar e perna, centralização/periferização, exame neurológico e diferenciação de quadril/sacroilíaca."
    ]
  },
  {
    "nome": "Dor lombar com componente radicular — investigar",
    "nivel": "prioritaria",
    "todos": [
      "lombar"
    ],
    "pontos": {
      "irradiacaoPerna": 3,
      "trajetoAlemJoelhoLombar": 3,
      "dermatomaPeEspecifico": 2,
      "neurologico": 2,
      "valsalvaLombar": 1,
      "periferizacaoLombar": 1,
      "quadrilDominante": -3,
      "sacroiliacaDominante": -2,
      "trajetoRestritoJoelhoLombar": -2
    },
    "minimoPontos": 4,
    "perguntas": [
      "Trajeto abaixo do joelho, dermátomos, força, reflexos, sensibilidade e tosse/Valsalva."
    ]
  },
  {
    "nome": "Claudicação neurogênica / estenose lombar — investigar",
    "nivel": "prioritaria",
    "todos": [
      "lombar"
    ],
    "pontos": {
      "marchaLimitada": 3,
      "extensao": 2,
      "irradiacaoPerna": 1,
      "alivioFlexaoLombar": 3,
      "flexao": -1,
      "quadrilDominante": -2
    },
    "minimoPontos": 4,
    "perguntas": [
      "Distância de marcha, alívio ao sentar ou inclinar-se e comparação com bicicleta."
    ]
  },
  {
    "nome": "Dor lombar com predomínio de flexão — investigar",
    "nivel": "alternativa",
    "todos": [
      "lombar"
    ],
    "pontos": {
      "flexao": 3,
      "irradiacaoPerna": 1,
      "quadrilDominante": -2
    },
    "minimoPontos": 3,
    "perguntas": [
      "Centralização ou periferização, repetição de movimentos e exame neurológico."
    ]
  },
  {
    "nome": "Síndrome dolorosa trocantérica / tendinopatia glútea — investigar",
    "nivel": "prioritaria",
    "todos": [
      "lateralQuadril"
    ],
    "pontos": {
      "decubitoLateral": 3,
      "apoioUnipodal": 2,
      "irradiacaoPerna": 1,
      "irradiacaoLateralAteJoelhoQuadril": 2,
      "carga": 1
    },
    "minimoPontos": 2,
    "perguntas": [
      "Palpação trocantérica, abdução resistida, apoio unipodal de 30 segundos, trajeto lateral da coxa até o joelho, escada e rastreio lombar."
    ]
  },
  {
    "nome": "Osteoartrose de quadril — investigar",
    "nivel": "alternativa",
    "todos": [
      "quadril"
    ],
    "pontos": {
      "virilha": 2,
      "rigidez": 3,
      "carga": 1
    },
    "minimoPontos": 4,
    "perguntas": [
      "Rotação interna e flexão, rigidez, marcha, tarefas de vestir-se e dor na virilha."
    ]
  },
  {
    "nome": "Dor intra-articular / conflito femoroacetabular — investigar",
    "nivel": "alternativa",
    "todos": [
      "quadril"
    ],
    "pontos": {
      "virilha": 2,
      "flexao": 2,
      "carga": 1,
      "quadrilMecanico": 3
    },
    "minimoPontos": 3,
    "perguntas": [
      "Dor em C, flexão, adução e rotação, clique/travamento/ressalto, sintomas mecânicos e impacto funcional."
    ]
  },
  {
    "nome": "Lesão por estresse do colo femoral — excluir se compatível",
    "nivel": "prioritaria",
    "todos": [
      "quadril"
    ],
    "pontos": {
      "carga": 2,
      "marchaLimitada": 2,
      "noturna": 2,
      "virilha": 1
    },
    "minimoPontos": 4,
    "perguntas": [
      "Progressão recente da carga, dor em repouso ou à noite, dor inguinal, apoio e fatores de risco ósseo."
    ]
  },
  {
    "nome": "Dor cervical mecânica/referida — investigar",
    "nivel": "alternativa",
    "todos": [
      "cervical"
    ],
    "pontos": {
      "trajetoRestritoOmbro": 2,
      "rigidez": 1,
      "pioraMovimentoPescoco": 1,
      "neurologico": -2,
      "trajetoAlemCotovelo": -2
    },
    "minimoPontos": 2,
    "perguntas": [
      "Movimento cervical que reproduz a dor, mobilidade, região escapular/ombro e rastreio neurológico se houver sintomas distais."
    ]
  },
  {
    "nome": "Síndrome do túnel radial / nervo interósseo posterior — investigar",
    "nivel": "alternativa",
    "todos": [
      "tunelRadial"
    ],
    "pontos": {
      "tunelRadial": 3,
      "cotoveloLateral": 1,
      "preensao": 1
    },
    "minimoPontos": 3,
    "perguntas": [
      "Dor no túnel radial, supinação/extensão resistida do terceiro dedo, déficit motor do PIN e diferenciação da epicondilalgia lateral."
    ]
  },
  {
    "nome": "Neuropatia ulnar no canal de Guyon — investigar",
    "nivel": "prioritaria",
    "todos": [
      "guyon"
    ],
    "pontos": {
      "guyon": 3,
      "distribuicaoUlnarMao": 2,
      "neurologico": 1,
      "provocacaoUlnarCotovelo": -2
    },
    "minimoPontos": 3,
    "perguntas": [
      "Distribuição ulnar palmar, pressão no canal de Guyon/guidão, força intrínseca, dorso ulnar da mão e diferenciação do cotovelo/C8-T1."
    ]
  },
  {
    "nome": "Possível fratura de escafoide — avaliação médica prioritária",
    "nivel": "urgente",
    "todos": [
      "tabaqueiraEscafoide"
    ],
    "pontos": {
      "traumaPunhoMao": 3,
      "trauma": 1,
      "punhoMao": 1
    },
    "minimoPontos": 3,
    "perguntas": [
      "Queda sobre mão estendida, tabaqueira anatômica, tubérculo do escafoide, compressão axial do polegar e necessidade de imagem/imobilização."
    ]
  },
  {
    "nome": "Possível herpes-zóster torácico — avaliação médica",
    "nivel": "urgente",
    "todos": [
      "herpesZoster"
    ],
    "pontos": {
      "neurologico": 1,
      "toracica": 1
    },
    "minimoPontos": 1,
    "perguntas": [
      "Início da erupção, distribuição dermatomérica unilateral, imunossupressão e avaliação médica precoce."
    ]
  },
  {
    "nome": "Sinais torácicos/cardiorrespiratórios infecciosos — avaliação médica prioritária",
    "nivel": "urgente",
    "todos": [
      "respiratorioInfeccioso"
    ],
    "pontos": {
      "toracica": 1,
      "sistemico": 2,
      "provocacaoRespiratoriaToracica": 1
    },
    "minimoPontos": 2,
    "perguntas": [
      "Febre, tosse, dispneia, saturação, dor pleurítica, ausculta/avaliação médica e estado geral."
    ]
  },
  {
    "nome": "Dor lombar — padrão ainda inespecífico, caracterizar",
    "nivel": "alternativa",
    "todos": [
      "lombar"
    ],
    "perguntas": [
      "Caracterizar comportamento mecânico, irradiação, exame neurológico, quadril/sacroilíaca e sinais de segurança antes de classificar o fenótipo."
    ]
  },
  {
    "nome": "Possível lesão do LCP — investigar",
    "nivel": "prioritaria",
    "todos": [
      "joelho"
    ],
    "pontos": {
      "padraoLCP": 3,
      "trauma": 1,
      "instabilidadeJoelho": 1
    },
    "minimoPontos": 3,
    "perguntas": [
      "Mecanismo de trauma anterior da tíbia/hiperflexão, posteriorização tibial, teste da gaveta posterior, sag sign e lesões associadas."
    ]
  },
  {
    "nome": "Osteoartrose CMC do polegar — investigar",
    "nivel": "alternativa",
    "todos": [
      "cmcPolegar"
    ],
    "pontos": {
      "cmcPolegar": 4,
      "preensao": 2,
      "rigidez": 1,
      "polegarRadial": 1
    },
    "minimoPontos": 4,
    "perguntas": [
      "Localização exata na CMC1, pinça, abertura de potes/chaves, grind test, força de pinça e diferenciação de De Quervain."
    ]
  },
  {
    "nome": "Instabilidade / luxação patelar — investigar",
    "nivel": "prioritaria",
    "todos": [
      "instabilidadePatelar"
    ],
    "pontos": {
      "instabilidadePatelar": 4,
      "trauma": 1,
      "derrameJoelho": 1,
      "instabilidadeJoelho": 1
    },
    "minimoPontos": 4,
    "perguntas": [
      "História de luxação/subluxação, apreensão patelar, derrame, MPFL, alinhamento, mecanismo e lesão osteocondral associada."
    ]
  },
  {
    "nome": "Possível lesão do LCA — investigar",
    "nivel": "prioritaria",
    "todos": [
      "padraoLCA"
    ],
    "pontos": {
      "padraoLCA": 4,
      "torcaoJoelho": 1,
      "derramePrecoceJoelho": 2,
      "falseioObjetivoJoelho": 1,
      "instabilidadeJoelho": 1,
      "bloqueioVerdadeiroJoelho": -2,
      "trauma": 1
    },
    "minimoPontos": 4,
    "perguntas": [
      "Mecanismo de pivô/desaceleração, estalo, hemartrose precoce, Lachman, pivot shift e lesões meniscais/colaterais associadas."
    ]
  },
  {
    "nome": "Possível ruptura do mecanismo extensor do joelho — avaliação médica prioritária",
    "nivel": "urgente",
    "todos": [
      "incapacidadeExtensaoAtivaJoelho"
    ],
    "pontos": {
      "rupturaMecanismoExtensorJoelho": 3,
      "incapacidadeExtensaoAtivaJoelho": 2,
      "trauma": 2,
      "joelhoAnterior": 1
    },
    "minimoPontos": 2,
    "perguntas": [
      "Extensão ativa e straight-leg raise, hiato tendíneo, posição patelar, mecanismo, edema/equimose e avaliação ortopédica/imagem."
    ]
  },
  {
    "nome": "Osteoartrose glenoumeral — investigar",
    "nivel": "alternativa",
    "todos": [
      "artroseGlenoumeral"
    ],
    "pontos": {
      "artroseGlenoumeral": 4,
      "rigidezOmbro": 2,
      "rotacaoOmbro": 2,
      "carga": 1,
      "noturna": 1
    },
    "minimoPontos": 4,
    "perguntas": [
      "Perda global de ADM com rotação externa, crepitação, dor profunda, histórico traumático/cirúrgico e diferenciação de capsulite e manguito."
    ]
  },
  {
    "nome": "Lesão labral / SLAP do ombro — investigar",
    "nivel": "prioritaria",
    "todos": [
      "labralOmbro"
    ],
    "pontos": {
      "labralOmbro": 4,
      "instabilidadeOmbro": 1,
      "elevacaoBraco": 1,
      "traumaOmbro": 1,
      "bicepsOmbro": 1
    },
    "minimoPontos": 4,
    "perguntas": [
      "Clique/travamento profundo, mecanismo de tração/queda/arremesso, instabilidade, bíceps, testes labrais e necessidade de imagem conforme exame."
    ]
  },
  {
    "nome": "Possível fratura proximal do fêmur/quadril — avaliação médica urgente",
    "nivel": "urgente",
    "todos": [
      "fraturaQuadrilAguda"
    ],
    "pontos": {
      "fraturaQuadrilAguda": 4,
      "deformidadeFraturaQuadril": 3,
      "trauma": 2,
      "marchaLimitada": 2,
      "virilha": 1
    },
    "minimoPontos": 4,
    "perguntas": [
      "Mecanismo de queda, incapacidade de carga, encurtamento/rotação externa, dor inguinal, neurovascular e encaminhamento imediato para imagem."
    ]
  },
  {
    "nome": "Osteonecrose da cabeça femoral — investigar prioritariamente",
    "nivel": "prioritaria",
    "todos": [
      "quadril"
    ],
    "pontos": {
      "padraoOsteonecroseQuadril": 3,
      "riscoOsteonecroseQuadril": 3,
      "virilha": 1,
      "noturna": 1,
      "carga": 1
    },
    "minimoPontos": 4,
    "perguntas": [
      "Corticoides, álcool, trauma/luxação, doenças hematológicas, dor inguinal profunda, rotação interna e necessidade de avaliação médica/imagem."
    ]
  },
  {
    "nome": "Possível fratura/luxação traumática do ombro — avaliação médica urgente",
    "nivel": "urgente",
    "todos": [
      "deformidadeOmbroTrauma"
    ],
    "pontos": {
      "traumaOmbro": 2,
      "trauma": 1,
      "perdaForcaAgudaOmbro": 1
    },
    "minimoPontos": 1,
    "perguntas": [
      "Deformidade, mecanismo, estado neurovascular, sensibilidade axilar, incapacidade funcional e encaminhamento para redução/imagem conforme suspeita."
    ]
  },
  {
    "nome": "Possível artrite séptica — avaliação médica urgente",
    "nivel": "urgente",
    "todos": [
      "suspeitaArticulacaoSeptica"
    ],
    "perguntas": [
      "Febre, início agudo, articulação quente/inchada, incapacidade de carga/movimento, imunossupressão, cirurgia/infiltração recente e avaliação médica imediata."
    ]
  },
  {
    "nome": "Possível fratura cervical pós-trauma — avaliação médica urgente",
    "nivel": "urgente",
    "todos": [
      "cervical"
    ],
    "pontos": {
      "traumaCervicalImportante": 3,
      "dorLinhaMediaCervical": 3,
      "neurologico": 2,
      "riscoFratura": 2,
      "trauma": 1
    },
    "minimoPontos": 5,
    "perguntas": [
      "Mecanismo de alta energia/axial, dor na linha média, déficit neurológico, idade/fragilidade, estado neurovascular e necessidade de imobilização/imagem médica."
    ]
  },
  {
    "nome": "Possível disfunção arterial cervical — avaliação médica urgente",
    "nivel": "urgente",
    "todos": [
      "cervical"
    ],
    "pontos": {
      "vascularCervicalDorIncomum": 3,
      "vascularCervicalNeuroCraniano": 4,
      "cefaleiaCervical": 1,
      "neurologico": 1
    },
    "minimoPontos": 4,
    "perguntas": [
      "Início súbito e incomum, cefaleia/occipitalgia intensa, diplopia, disartria, disfagia, ataxia, sinais de Horner e avaliação médica imediata quando o padrão for compatível."
    ]
  },
  {
    "nome": "Tendinopatia / lesão do bíceps distal — investigar",
    "nivel": "prioritaria",
    "todos": [
      "bicepsDistal"
    ],
    "pontos": {
      "carga": 1,
      "preensao": 1,
      "rupturaBicepsDistal": -4
    },
    "minimoPontos": 1,
    "perguntas": [
      "Dor na fossa cubital, flexão resistida, supinação resistida, palpação distal do bíceps e sinais de ruptura."
    ]
  },
  {
    "nome": "Possível ruptura do bíceps distal — avaliação médica prioritária",
    "nivel": "urgente",
    "todos": [
      "rupturaBicepsDistal"
    ],
    "pontos": {
      "rupturaBicepsDistal": 4,
      "bicepsDistal": 2,
      "trauma": 1,
      "carga": 1
    },
    "minimoPontos": 4,
    "perguntas": [
      "Estalo agudo, equimose, alteração do contorno do bíceps, perda de força de supinação/flexão e encaminhamento ortopédico precoce."
    ]
  },
  {
    "nome": "Bursite olecraniana — investigar",
    "nivel": "alternativa",
    "todos": [
      "bursiteOlecrano"
    ],
    "pontos": {
      "bursiteOlecrano": 4,
      "carga": 1
    },
    "minimoPontos": 4,
    "perguntas": [
      "Edema superficial sobre o olécrano, apoio repetido, trauma, calor/rubor, ferida e sinais sistêmicos para excluir infecção."
    ]
  },
  {
    "nome": "Possível fratura do rádio distal — avaliação médica prioritária",
    "nivel": "urgente",
    "todos": [
      "fraturaRadioDistal"
    ],
    "pontos": {
      "traumaPunhoMao": 2,
      "trauma": 1,
      "punhoMao": 1
    },
    "minimoPontos": 1,
    "perguntas": [
      "Queda sobre a mão, deformidade, dor óssea distal do rádio, edema, estado neurovascular e necessidade de radiografia/imobilização."
    ]
  },
  {
    "nome": "Dedo em gatilho / tenossinovite estenosante — investigar",
    "nivel": "alternativa",
    "todos": [
      "dedoGatilho"
    ],
    "perguntas": [
      "Qual dedo trava, ressalto durante flexão/extensão, dor na polia A1/base palmar, rigidez matinal e impacto funcional."
    ]
  },
  {
    "nome": "Neuralgia intercostal / dor neuropática torácica — investigar",
    "nivel": "prioritaria",
    "todos": [
      "intercostalNeuralgia"
    ],
    "pontos": {
      "neurologico": 1,
      "toracica": 1,
      "herpesZoster": -3,
      "cardiopulmonar": -3
    },
    "minimoPontos": 1,
    "perguntas": [
      "Distribuição em faixa, hiperalgesia/alodinia, relação com movimento/respiração, lesões cutâneas, cirurgia/trauma e exclusão de causas cardiopulmonares e herpes-zóster."
    ]
  },
  {
    "nome": "Síndrome glútea profunda — investigar",
    "nivel": "prioritaria",
    "todos": [
      "gluteoProfundo"
    ],
    "pontos": {
      "gluteoProfundo": 4,
      "irradiacaoPerna": 1,
      "neurologico": 1,
      "flexao": 1,
      "isquioProximal": -4
    },
    "minimoPontos": 4,
    "perguntas": [
      "Dor profunda glútea, piora sentado, trajeto posterior, testes de tensão/rotação do quadril, exame lombar e diferenciação de isquiotibial proximal."
    ]
  },
  {
    "nome": "Bursite pré-patelar — investigar",
    "nivel": "alternativa",
    "todos": [
      "bursitePrepatelar"
    ],
    "pontos": {
      "bursitePrepatelar": 4,
      "joelhoAnterior": 1,
      "carga": 1
    },
    "minimoPontos": 4,
    "perguntas": [
      "Edema superficial sobre a patela, trabalho/atividade ajoelhada, trauma local, calor/rubor e sinais sistêmicos."
    ]
  },
  {
    "nome": "Síndrome do túnel do tarso — investigar",
    "nivel": "prioritaria",
    "todos": [
      "tunelTarsal"
    ],
    "pontos": {
      "tunelTarsal": 4,
      "neurologico": 2,
      "carga": 1,
      "tibialPosterior": 1
    },
    "minimoPontos": 4,
    "perguntas": [
      "Distribuição plantar, região retromaleolar medial, piora em ortostatismo/caminhada, Tinel no túnel do tarso e diferenciação de radiculopatia e tibial posterior."
    ]
  },
  {
    "nome": "Hallux rigidus / osteoartrose da 1ª MTF — investigar",
    "nivel": "alternativa",
    "todos": [
      "halluxRigidus"
    ],
    "pontos": {
      "halluxRigidus": 4,
      "rigidez": 1,
      "carga": 1
    },
    "minimoPontos": 1,
    "perguntas": [
      "Dor e rigidez da 1ª metatarsofalângica, dorsiflexão do hálux, impulso na marcha, calçados e deformidade/osteófitos."
    ]
  },
  {
    "nome": "Metatarsalgia mecânica — investigar",
    "nivel": "alternativa",
    "todos": [
      "metatarsalgia"
    ],
    "pontos": {
      "metatarsalgia": 4,
      "carga": 1,
      "morton": -2,
      "metatarsoFocal": -2
    },
    "minimoPontos": 4,
    "perguntas": [
      "Localização sob cabeças metatarsais, distribuição difusa versus focal, calçados, calosidades, carga do antepé e diferenciação de Morton e lesão por estresse."
    ]
  },
  {
    "nome": "Neuropatia do nervo mediano no antebraço / síndrome do pronador — investigar",
    "nivel": "prioritaria",
    "todos": [
      "pronadorMediano"
    ],
    "pontos": {
      "pronadorMediano": 4,
      "mediano": 1,
      "neurologico": 1,
      "noturnoMao": -2,
      "alivioSacudirMao": -2
    },
    "minimoPontos": 4,
    "perguntas": [
      "Dor proximal do antebraço, pronação resistida, distribuição mediana, sensibilidade palmar tenar e diferenciação de túnel do carpo/C6-C7."
    ]
  },
  {
    "nome": "Lesão do ligamento escafolunar / instabilidade carpiana — investigar",
    "nivel": "prioritaria",
    "todos": [
      "escafolunar"
    ],
    "pontos": {
      "escafolunar": 4,
      "trauma": 1,
      "carga": 1,
      "punhoUlnar": -2
    },
    "minimoPontos": 4,
    "perguntas": [
      "Trauma em extensão, dor dorsal central, Watson/scaphoid shift conforme competência, estabilidade carpiana e indicação de imagem."
    ]
  },
  {
    "nome": "Lesão do ligamento colateral ulnar do polegar — investigar prioritariamente",
    "nivel": "prioritaria",
    "todos": [
      "ligamentoUlnarPolegar"
    ],
    "pontos": {
      "ligamentoUlnarPolegar": 4,
      "trauma": 2,
      "preensao": 1
    },
    "minimoPontos": 4,
    "perguntas": [
      "Mecanismo em abdução/valgo da MCP, dor ulnar, estabilidade em extensão/flexão e suspeita de lesão de Stener."
    ]
  },
  {
    "nome": "Tendinopatia calcária do ombro — investigar / considerar imagem",
    "nivel": "prioritaria",
    "todos": [
      "calcificacaoOmbro"
    ],
    "pontos": {
      "calcificacaoOmbro": 4,
      "ombro": 1,
      "noturna": 1,
      "elevacaoBraco": 1
    },
    "minimoPontos": 4,
    "perguntas": [
      "Histórico de calcificação/imagem, fase dolorosa aguda, amplitude, manguito e outras causas de dor subacromial."
    ]
  },
  {
    "nome": "Lesão do ligamento colateral ulnar do cotovelo — investigar",
    "nivel": "prioritaria",
    "todos": [
      "ligamentoUlnarCotovelo"
    ],
    "pontos": {
      "ligamentoUlnarCotovelo": 4,
      "cotoveloMedial": 1,
      "trauma": 1,
      "nervoUlnar": 1
    },
    "minimoPontos": 4,
    "perguntas": [
      "Carga em valgo, esporte de arremesso, moving valgus stress/milking maneuver, nervo ulnar e instabilidade medial."
    ]
  },
  {
    "nome": "Meralgia parestésica — investigar",
    "nivel": "alternativa",
    "todos": [
      "meralgiaParestesica"
    ],
    "pontos": {
      "meralgiaParestesica": 4,
      "neurologico": 1,
      "irradiacaoPerna": -1,
      "dermatomaPeEspecifico": -2,
      "valsalvaLombar": -2
    },
    "minimoPontos": 4,
    "perguntas": [
      "Área anterolateral da coxa, ausência de déficit motor/reflexo, compressão inguinal/cintos e diferenciação de L2-L3/quadril."
    ]
  },
  {
    "nome": "Tendinopatia do quadríceps — investigar",
    "nivel": "alternativa",
    "todos": [
      "tendaoQuadriceps"
    ],
    "pontos": {
      "tendaoQuadriceps": 4,
      "salto": 1,
      "flexaoJoelhoCarga": 1,
      "incapacidadeExtensaoAtivaJoelho": -3
    },
    "minimoPontos": 4,
    "perguntas": [
      "Dor focal no polo superior da patela, extensão resistida, carga de saltos/agachamento e integridade do mecanismo extensor."
    ]
  },
  {
    "nome": "Síndrome de impacto anterior do tornozelo — investigar",
    "nivel": "alternativa",
    "todos": [
      "impactoAnteriorTornozelo"
    ],
    "pontos": {
      "impactoAnteriorTornozelo": 4,
      "dorsiflexaoCarregadaTornozelo": 2,
      "tornozelo": 1,
      "carga": 1,
      "rigidez": 1
    },
    "minimoPontos": 4,
    "perguntas": [
      "Dor anterior em dorsiflexão carregada, histórico de entorses, amplitude talocrural e diferenciação de lesão osteocondral/sindesmose."
    ]
  },
  {
    "nome": "Síndrome de impacto posterior do tornozelo — investigar",
    "nivel": "alternativa",
    "todos": [
      "impactoPosteriorTornozelo"
    ],
    "pontos": {
      "impactoPosteriorTornozelo": 4,
      "posteriorTornozelo": 1,
      "carga": 1,
      "rupturaAquilesAguda": -3
    },
    "minimoPontos": 4,
    "perguntas": [
      "Dor profunda em flexão plantar máxima, esporte/dança, região do processo posterior/os trigonum e diferenciação do Aquiles."
    ]
  },
  {
    "nome": "Lesão da placa plantar / instabilidade metatarsofalângica — investigar",
    "nivel": "prioritaria",
    "todos": [
      "placaPlantar"
    ],
    "pontos": {
      "placaPlantar": 4,
      "carga": 1,
      "metatarsalgia": 1,
      "morton": -2
    },
    "minimoPontos": 4,
    "perguntas": [
      "Dor plantar focal na MTF, alinhamento do dedo, drawer da MTF, capacidade de apoio e diferenciação de Morton/metatarsalgia."
    ]
  },
  {
    "nome": "Possível lesão óssea por estresse do navicular — avaliação médica prioritária",
    "nivel": "urgente",
    "todos": [
      "stressNavicular"
    ],
    "pontos": {
      "stressNavicular": 4,
      "carga": 2,
      "marchaLimitada": 1,
      "noturna": 1
    },
    "minimoPontos": 4,
    "perguntas": [
      "Aumento de carga, ponto N do navicular, salto unipodal, dor no mediopé e necessidade de imagem por se tratar de localização de maior risco."
    ]
  },
  {
    "nome": "Possível fratura por estresse do calcâneo — investigar prioritariamente",
    "nivel": "prioritaria",
    "todos": [
      "stressCalcaneo"
    ],
    "pontos": {
      "stressCalcaneo": 4,
      "carga": 2,
      "marchaLimitada": 1,
      "primeirosPassos": -1
    },
    "minimoPontos": 4,
    "perguntas": [
      "Mudança recente de carga, dor óssea profunda, compressão medial-lateral do calcâneo e diferenciação de fasciopatia plantar."
    ]
  },
  {
    "nome": "Tendinopatia insercional do Aquiles / bursite retrocalcânea — investigar",
    "nivel": "alternativa",
    "todos": [
      "aquilesInsercionalRetrocalcanea"
    ],
    "pontos": {
      "aquilesInsercionalRetrocalcanea": 4,
      "posteriorTornozelo": 1,
      "carga": 1,
      "rupturaAquilesAguda": -3
    },
    "minimoPontos": 4,
    "perguntas": [
      "Localização na inserção versus porção média, compressão pelo calçado, edema retrocalcâneo e resposta à carga."
    ]
  },
  {
    "nome": "Sesamoidite / lesão por estresse dos sesamoides — investigar",
    "nivel": "prioritaria",
    "todos": [
      "sesamoidePrimeiroRaio"
    ],
    "pontos": {
      "sesamoidePrimeiroRaio": 4,
      "carga": 1,
      "halluxRigidus": -1,
      "metatarsalgia": 1
    },
    "minimoPontos": 4,
    "perguntas": [
      "Dor plantar sob a 1ª MTF, impulsão, extensão do hálux, carga recente e necessidade de imagem se suspeita de fratura por estresse."
    ]
  }
];

  var GRUPOS_HIPOTESES_HMA = {
    'Lombociatalgia / dor lombar irradiada — investigar': 'lombar_neural',
    'Dor lombar com componente radicular — investigar': 'lombar_neural',
    'Lesão meniscal — investigar': 'joelho_meniscal',
    'Lesão meniscal medial — investigar': 'joelho_meniscal',
    'Lesão meniscal lateral — investigar': 'joelho_meniscal'
  };

  var RELACOES_DIFERENCIAIS_HMA = [
  [
    "Dor cervical com componente radicular — investigar",
    "Dor relacionada ao manguito rotador — investigar"
  ],
  [
    "Dor cervical com componente radicular — investigar",
    "Síndrome do desfiladeiro torácico — investigar"
  ],
  [
    "Dor cervical com componente radicular — investigar",
    "Cervicobraquialgia miofascial — investigar"
  ],
  [
    "Dor cervical com componente radicular — investigar",
    "Neuropatia ulnar no cotovelo — investigar"
  ],
  [
    "Dor cervical com componente radicular — investigar",
    "Síndrome do túnel do carpo — investigar"
  ],
  [
    "Dor relacionada ao manguito rotador — investigar",
    "Tendinopatia da cabeça longa do bíceps — investigar"
  ],
  [
    "Dor relacionada ao manguito rotador — investigar",
    "Dor acromioclavicular — investigar"
  ],
  [
    "Dor relacionada ao manguito rotador — investigar",
    "Capsulite adesiva — investigar"
  ],
  [
    "Epicondilalgia medial — investigar",
    "Neuropatia ulnar no cotovelo — investigar"
  ],
  [
    "Lombociatalgia / dor lombar irradiada — investigar",
    "Síndrome dolorosa trocantérica / tendinopatia glútea — investigar"
  ],
  [
    "Dor lombar com componente radicular — investigar",
    "Síndrome dolorosa trocantérica / tendinopatia glútea — investigar"
  ],
  [
    "Lombociatalgia / dor lombar irradiada — investigar",
    "Osteoartrose de quadril — investigar"
  ],
  [
    "Dor lombar com componente radicular — investigar",
    "Osteoartrose de quadril — investigar"
  ],
  [
    "Lombociatalgia / dor lombar irradiada — investigar",
    "Dor intra-articular / conflito femoroacetabular — investigar"
  ],
  [
    "Dor lombar com componente radicular — investigar",
    "Dor intra-articular / conflito femoroacetabular — investigar"
  ],
  [
    "Lombociatalgia / dor lombar irradiada — investigar",
    "Dor relacionada à articulação sacroilíaca/cintura pélvica — investigar"
  ],
  [
    "Dor lombar com componente radicular — investigar",
    "Dor relacionada à articulação sacroilíaca/cintura pélvica — investigar"
  ],
  [
    "Lombociatalgia / dor lombar irradiada — investigar",
    "Tendinopatia proximal dos isquiotibiais — investigar"
  ],
  [
    "Dor lombar com componente radicular — investigar",
    "Tendinopatia proximal dos isquiotibiais — investigar"
  ],
  [
    "Síndrome dolorosa trocantérica / tendinopatia glútea — investigar",
    "Osteoartrose de quadril — investigar"
  ],
  [
    "Síndrome dolorosa trocantérica / tendinopatia glútea — investigar",
    "Dor intra-articular / conflito femoroacetabular — investigar"
  ],
  [
    "Dor intra-articular / conflito femoroacetabular — investigar",
    "Sobrecarga do flexor do quadril/iliopsoas — investigar"
  ],
  [
    "Lesão meniscal — investigar",
    "Lesão ligamentar do joelho — investigar"
  ],
  [
    "Lesão meniscal — investigar",
    "Lesão do ligamento colateral medial — investigar"
  ],
  [
    "Lesão meniscal — investigar",
    "Lesão do ligamento colateral lateral — investigar"
  ],
  [
    "Lesão meniscal — investigar",
    "Osteoartrose de joelho — investigar"
  ],
  [
    "Lesão meniscal medial — investigar",
    "Dor femoropatelar — investigar"
  ],
  [
    "Lesão meniscal lateral — investigar",
    "Dor femoropatelar — investigar"
  ],
  [
    "Lesão meniscal medial — investigar",
    "Derrame / irritação intra-articular do joelho — investigar"
  ],
  [
    "Lesão meniscal lateral — investigar",
    "Derrame / irritação intra-articular do joelho — investigar"
  ],
  [
    "Lesão meniscal — investigar",
    "Derrame / irritação intra-articular do joelho — investigar"
  ],
  [
    "Dor femoropatelar — investigar",
    "Derrame / irritação intra-articular do joelho — investigar"
  ],
  [
    "Osteoartrose de joelho — investigar",
    "Derrame / irritação intra-articular do joelho — investigar"
  ],
  [
    "Dor femoropatelar — investigar",
    "Tendinopatia patelar — investigar"
  ],
  [
    "Dor femoropatelar — investigar",
    "Osteoartrose de joelho — investigar"
  ],
  [
    "Lesão do ligamento colateral medial — investigar",
    "Síndrome da pata de ganso — investigar"
  ],
  [
    "Lesão do ligamento colateral medial — investigar",
    "Lesão meniscal — investigar"
  ],
  [
    "Lesão do ligamento colateral lateral — investigar",
    "Síndrome da banda iliotibial — investigar"
  ],
  [
    "Cisto poplíteo / derrame posterior — investigar",
    "Osteoartrose de joelho — investigar"
  ],
  [
    "Cisto poplíteo / derrame posterior — investigar",
    "Lesão meniscal — investigar"
  ],
  [
    "Entorse lateral de tornozelo — investigar",
    "Tendinopatia ou instabilidade dos fibulares — investigar"
  ],
  [
    "Entorse lateral de tornozelo — investigar",
    "Entorse da sindesmose — investigar"
  ],
  [
    "Entorse lateral de tornozelo — investigar",
    "Possível fratura de tornozelo/pé — aplicar regra de Ottawa e encaminhar se positiva"
  ],
  [
    "Tendinopatia do Aquiles — investigar",
    "Lesão do tendão de Aquiles — excluir ruptura se compatível"
  ],
  [
    "Tendinopatia do Aquiles — investigar",
    "Osteoartrose talocrural pós-traumática — investigar"
  ],
  [
    "Lesão óssea por estresse do metatarso — excluir se compatível",
    "Neuroma de Morton — investigar"
  ],
  [
    "Lesão óssea por estresse do metatarso — excluir se compatível",
    "Possível lesão de Lisfranc — avaliação médica prioritária"
  ],
  [
    "Síndrome do estresse tibial medial — investigar",
    "Lesão óssea por estresse da tíbia — excluir se compatível"
  ],
  [
    "Síndrome do estresse tibial medial — investigar",
    "Síndrome compartimental crônica por esforço — investigar"
  ],
  [
    "Dor torácica musculoesquelética/costal — investigar",
    "Possível fratura vertebral — avaliação médica prioritária"
  ],
  [
    "Síndrome do túnel radial / nervo interósseo posterior — investigar",
    "Epicondilalgia lateral — investigar"
  ],
  [
    "Neuropatia ulnar no canal de Guyon — investigar",
    "Neuropatia ulnar no cotovelo — investigar"
  ],
  [
    "Neuropatia ulnar no canal de Guyon — investigar",
    "Dor cervical com componente radicular — investigar"
  ],
  [
    "Possível lesão do LCP — investigar",
    "Lesão ligamentar do joelho — investigar"
  ],
  [
    "Possível lesão do LCP — investigar",
    "Lesão meniscal — investigar"
  ],
  [
    "Dor cervical com componente radicular — investigar",
    "Dor local do ombro — padrão musculoesquelético a investigar"
  ],
  [
    "Dor relacionada ao manguito rotador — investigar",
    "Dor local do ombro — padrão musculoesquelético a investigar"
  ],
  [
    "Dor cervical mecânica/referida — investigar",
    "Dor relacionada ao manguito rotador — investigar"
  ],
  [
    "Dor cervical mecânica/referida — investigar",
    "Dor local do ombro — padrão musculoesquelético a investigar"
  ],
  [
    "Dor cervical mecânica/referida — investigar",
    "Cervicobraquialgia miofascial — investigar"
  ],
  [
    "Dor cervical mecânica/referida — investigar",
    "Síndrome miofascial do trapézio superior — investigar"
  ],
  [
    "Dor cervical mecânica/referida — investigar",
    "Síndrome do elevador da escápula — investigar"
  ],
  [
    "Cervicobraquialgia miofascial — investigar",
    "Dor relacionada ao manguito rotador — investigar"
  ],
  [
    "Cervicobraquialgia miofascial — investigar",
    "Síndrome do desfiladeiro torácico — investigar"
  ],
  [
    "Síndrome do desfiladeiro torácico — investigar",
    "Síndrome do túnel do carpo — investigar"
  ],
  [
    "Síndrome do desfiladeiro torácico — investigar",
    "Neuropatia ulnar no cotovelo — investigar"
  ],
  [
    "Síndrome do desfiladeiro torácico — investigar",
    "Neuropatia ulnar no canal de Guyon — investigar"
  ],
  [
    "Síndrome do túnel do carpo — investigar",
    "Neuropatia ulnar no canal de Guyon — investigar"
  ],
  [
    "Síndrome do túnel do carpo — investigar",
    "Neuropatia ulnar no cotovelo — investigar"
  ],
  [
    "Lesão do complexo fibrocartilaginoso triangular — investigar",
    "Neuropatia ulnar no canal de Guyon — investigar"
  ],
  [
    "Capsulite adesiva — investigar",
    "Dor local do ombro — padrão musculoesquelético a investigar"
  ],
  [
    "Dor acromioclavicular — investigar",
    "Tendinopatia da cabeça longa do bíceps — investigar"
  ],
  [
    "Dor acromioclavicular — investigar",
    "Dor local do ombro — padrão musculoesquelético a investigar"
  ],
  [
    "Instabilidade glenoumeral — investigar",
    "Dor relacionada ao manguito rotador — investigar"
  ],
  [
    "Epicondilalgia medial — investigar",
    "Neuropatia ulnar no canal de Guyon — investigar"
  ],
  [
    "Dor lombar mecânica inespecífica — investigar",
    "Dor relacionada à articulação sacroilíaca/cintura pélvica — investigar"
  ],
  [
    "Dor lombar mecânica inespecífica — investigar",
    "Síndrome dolorosa trocantérica / tendinopatia glútea — investigar"
  ],
  [
    "Dor lombar mecânica inespecífica — investigar",
    "Osteoartrose de quadril — investigar"
  ],
  [
    "Dor lombar mecânica inespecífica — investigar",
    "Dor intra-articular / conflito femoroacetabular — investigar"
  ],
  [
    "Dor lombar com déficit de mobilidade — investigar",
    "Dor lombar mecânica inespecífica — investigar"
  ],
  [
    "Dor lombar com predomínio facetário/extensão-rotação — investigar",
    "Dor lombar mecânica inespecífica — investigar"
  ],
  [
    "Dor lombar com padrão discogênico / resposta direcional — investigar",
    "Dor lombar com componente radicular — investigar"
  ],
  [
    "Dor lombar com padrão discogênico / resposta direcional — investigar",
    "Lombociatalgia / dor lombar irradiada — investigar"
  ],
  [
    "Dor lombar com padrão discogênico / resposta direcional — investigar",
    "Dor lombar mecânica inespecífica — investigar"
  ],
  [
    "Claudicação neurogênica / estenose lombar — investigar",
    "Dor lombar com componente radicular — investigar"
  ],
  [
    "Claudicação neurogênica / estenose lombar — investigar",
    "Osteoartrose de quadril — investigar"
  ],
  [
    "Dor lombar inflamatória / possível espondiloartrite axial — encaminhar para investigação",
    "Dor relacionada à articulação sacroilíaca/cintura pélvica — investigar"
  ],
  [
    "Tendinopatia proximal dos isquiotibiais — investigar",
    "Síndrome dolorosa trocantérica / tendinopatia glútea — investigar"
  ],
  [
    "Tendinopatia proximal dos isquiotibiais — investigar",
    "Dor relacionada à articulação sacroilíaca/cintura pélvica — investigar"
  ],
  [
    "Lesão ou sobrecarga de adutores — investigar",
    "Dor intra-articular / conflito femoroacetabular — investigar"
  ],
  [
    "Lesão ou sobrecarga de adutores — investigar",
    "Sobrecarga do flexor do quadril/iliopsoas — investigar"
  ],
  [
    "Lesão ou sobrecarga de adutores — investigar",
    "Osteoartrose de quadril — investigar"
  ],
  [
    "Lesão por estresse do colo femoral — excluir se compatível",
    "Dor intra-articular / conflito femoroacetabular — investigar"
  ],
  [
    "Lesão por estresse do colo femoral — excluir se compatível",
    "Osteoartrose de quadril — investigar"
  ],
  [
    "Lesão por estresse do colo femoral — excluir se compatível",
    "Lesão ou sobrecarga de adutores — investigar"
  ],
  [
    "Lesão do ligamento colateral medial — investigar",
    "Osteoartrose de joelho — investigar"
  ],
  [
    "Lesão do ligamento colateral lateral — investigar",
    "Dor femoropatelar — investigar"
  ],
  [
    "Síndrome da banda iliotibial — investigar",
    "Dor femoropatelar — investigar"
  ],
  [
    "Síndrome da pata de ganso — investigar",
    "Osteoartrose de joelho — investigar"
  ],
  [
    "Síndrome da pata de ganso — investigar",
    "Lesão meniscal — investigar"
  ],
  [
    "Cisto poplíteo / derrame posterior — investigar",
    "Dor femoropatelar — investigar"
  ],
  [
    "Osteoartrose de joelho — investigar",
    "Tendinopatia patelar — investigar"
  ],
  [
    "Possível lesão do LCP — investigar",
    "Lesão do ligamento colateral medial — investigar"
  ],
  [
    "Possível lesão do LCP — investigar",
    "Lesão do ligamento colateral lateral — investigar"
  ],
  [
    "Entorse da sindesmose — investigar",
    "Tendinopatia ou instabilidade dos fibulares — investigar"
  ],
  [
    "Entorse da sindesmose — investigar",
    "Possível fratura de tornozelo/pé — aplicar regra de Ottawa e encaminhar se positiva"
  ],
  [
    "Disfunção/tendinopatia do tibial posterior — investigar",
    "Osteoartrose talocrural pós-traumática — investigar"
  ],
  [
    "Tendinopatia do Aquiles — investigar",
    "Fasciopatia plantar — investigar"
  ],
  [
    "Lesão do tendão de Aquiles — excluir ruptura se compatível",
    "Entorse lateral de tornozelo — investigar"
  ],
  [
    "Fasciopatia plantar — investigar",
    "Disfunção/tendinopatia do tibial posterior — investigar"
  ],
  [
    "Osteoartrose talocrural pós-traumática — investigar",
    "Entorse da sindesmose — investigar"
  ],
  [
    "Lesão óssea por estresse da tíbia — excluir se compatível",
    "Síndrome compartimental crônica por esforço — investigar"
  ],
  [
    "Osteoartrose CMC do polegar — investigar",
    "Tenossinovite de De Quervain — investigar"
  ],
  [
    "Osteoartrose CMC do polegar — investigar",
    "Síndrome do túnel do carpo — investigar"
  ],
  [
    "Instabilidade / luxação patelar — investigar",
    "Dor femoropatelar — investigar"
  ],
  [
    "Instabilidade / luxação patelar — investigar",
    "Lesão ligamentar do joelho — investigar"
  ],
  [
    "Instabilidade / luxação patelar — investigar",
    "Lesão meniscal — investigar"
  ],
  [
    "Possível lesão do LCA — investigar",
    "Lesão meniscal — investigar"
  ],
  [
    "Possível lesão do LCA — investigar",
    "Lesão do ligamento colateral medial — investigar"
  ],
  [
    "Possível lesão do LCA — investigar",
    "Lesão do ligamento colateral lateral — investigar"
  ],
  [
    "Osteoartrose glenoumeral — investigar",
    "Capsulite adesiva — investigar"
  ],
  [
    "Osteoartrose glenoumeral — investigar",
    "Dor relacionada ao manguito rotador — investigar"
  ],
  [
    "Osteoartrose glenoumeral — investigar",
    "Lesão labral / SLAP do ombro — investigar"
  ],
  [
    "Lesão labral / SLAP do ombro — investigar",
    "Tendinopatia da cabeça longa do bíceps — investigar"
  ],
  [
    "Lesão labral / SLAP do ombro — investigar",
    "Instabilidade glenoumeral — investigar"
  ],
  [
    "Lesão labral / SLAP do ombro — investigar",
    "Dor relacionada ao manguito rotador — investigar"
  ],
  [
    "Osteonecrose da cabeça femoral — investigar prioritariamente",
    "Osteoartrose de quadril — investigar"
  ],
  [
    "Osteonecrose da cabeça femoral — investigar prioritariamente",
    "Dor intra-articular / conflito femoroacetabular — investigar"
  ],
  [
    "Osteonecrose da cabeça femoral — investigar prioritariamente",
    "Lesão por estresse do colo femoral — excluir se compatível"
  ],
  [
    "Tendinopatia / lesão do bíceps distal — investigar",
    "Síndrome do túnel radial / nervo interósseo posterior — investigar"
  ],
  [
    "Tendinopatia / lesão do bíceps distal — investigar",
    "Epicondilalgia lateral — investigar"
  ],
  [
    "Bursite olecraniana — investigar",
    "Epicondilalgia medial — investigar"
  ],
  [
    "Dedo em gatilho / tenossinovite estenosante — investigar",
    "Osteoartrose CMC do polegar — investigar"
  ],
  [
    "Neuralgia intercostal / dor neuropática torácica — investigar",
    "Possível herpes-zóster torácico — avaliação médica"
  ],
  [
    "Neuralgia intercostal / dor neuropática torácica — investigar",
    "Dor torácica musculoesquelética/costal — investigar"
  ],
  [
    "Síndrome glútea profunda — investigar",
    "Lombociatalgia / dor lombar irradiada — investigar"
  ],
  [
    "Síndrome glútea profunda — investigar",
    "Dor lombar com componente radicular — investigar"
  ],
  [
    "Síndrome glútea profunda — investigar",
    "Tendinopatia proximal dos isquiotibiais — investigar"
  ],
  [
    "Síndrome glútea profunda — investigar",
    "Dor relacionada à articulação sacroilíaca/cintura pélvica — investigar"
  ],
  [
    "Bursite pré-patelar — investigar",
    "Dor femoropatelar — investigar"
  ],
  [
    "Bursite pré-patelar — investigar",
    "Tendinopatia patelar — investigar"
  ],
  [
    "Síndrome do túnel do tarso — investigar",
    "Dor lombar com componente radicular — investigar"
  ],
  [
    "Síndrome do túnel do tarso — investigar",
    "Disfunção/tendinopatia do tibial posterior — investigar"
  ],
  [
    "Síndrome do túnel do tarso — investigar",
    "Fasciopatia plantar — investigar"
  ],
  [
    "Hallux rigidus / osteoartrose da 1ª MTF — investigar",
    "Metatarsalgia mecânica — investigar"
  ],
  [
    "Metatarsalgia mecânica — investigar",
    "Neuroma de Morton — investigar"
  ],
  [
    "Metatarsalgia mecânica — investigar",
    "Lesão óssea por estresse do metatarso — excluir se compatível"
  ],
  [
    "Neuropatia do nervo mediano no antebraço / síndrome do pronador — investigar",
    "Síndrome do túnel do carpo — investigar"
  ],
  [
    "Neuropatia do nervo mediano no antebraço / síndrome do pronador — investigar",
    "Dor cervical com componente radicular — investigar"
  ],
  [
    "Lesão do ligamento escafolunar / instabilidade carpiana — investigar",
    "Possível fratura de escafoide — avaliação médica prioritária"
  ],
  [
    "Lesão do ligamento escafolunar / instabilidade carpiana — investigar",
    "Lesão do complexo fibrocartilaginoso triangular — investigar"
  ],
  [
    "Lesão do ligamento colateral ulnar do polegar — investigar prioritariamente",
    "Osteoartrose CMC do polegar — investigar"
  ],
  [
    "Tendinopatia calcária do ombro — investigar / considerar imagem",
    "Dor relacionada ao manguito rotador — investigar"
  ],
  [
    "Tendinopatia calcária do ombro — investigar / considerar imagem",
    "Capsulite adesiva — investigar"
  ],
  [
    "Lesão do ligamento colateral ulnar do cotovelo — investigar",
    "Epicondilalgia medial — investigar"
  ],
  [
    "Lesão do ligamento colateral ulnar do cotovelo — investigar",
    "Neuropatia ulnar no cotovelo — investigar"
  ],
  [
    "Meralgia parestésica — investigar",
    "Dor lombar com componente radicular — investigar"
  ],
  [
    "Meralgia parestésica — investigar",
    "Síndrome dolorosa trocantérica / tendinopatia glútea — investigar"
  ],
  [
    "Tendinopatia do quadríceps — investigar",
    "Dor femoropatelar — investigar"
  ],
  [
    "Tendinopatia do quadríceps — investigar",
    "Tendinopatia patelar — investigar"
  ],
  [
    "Síndrome de impacto anterior do tornozelo — investigar",
    "Osteoartrose talocrural pós-traumática — investigar"
  ],
  [
    "Síndrome de impacto anterior do tornozelo — investigar",
    "Entorse da sindesmose — investigar"
  ],
  [
    "Síndrome de impacto posterior do tornozelo — investigar",
    "Tendinopatia do Aquiles — investigar"
  ],
  [
    "Síndrome de impacto posterior do tornozelo — investigar",
    "Tendinopatia insercional do Aquiles / bursite retrocalcânea — investigar"
  ],
  [
    "Lesão da placa plantar / instabilidade metatarsofalângica — investigar",
    "Metatarsalgia mecânica — investigar"
  ],
  [
    "Lesão da placa plantar / instabilidade metatarsofalângica — investigar",
    "Neuroma de Morton — investigar"
  ],
  [
    "Possível lesão óssea por estresse do navicular — avaliação médica prioritária",
    "Possível lesão de Lisfranc — avaliação médica prioritária"
  ],
  [
    "Possível lesão óssea por estresse do navicular — avaliação médica prioritária",
    "Lesão óssea por estresse do metatarso — excluir se compatível"
  ],
  [
    "Possível fratura por estresse do calcâneo — investigar prioritariamente",
    "Fasciopatia plantar — investigar"
  ],
  [
    "Possível fratura por estresse do calcâneo — investigar prioritariamente",
    "Tendinopatia insercional do Aquiles / bursite retrocalcânea — investigar"
  ],
  [
    "Tendinopatia insercional do Aquiles / bursite retrocalcânea — investigar",
    "Tendinopatia do Aquiles — investigar"
  ],
  [
    "Sesamoidite / lesão por estresse dos sesamoides — investigar",
    "Hallux rigidus / osteoartrose da 1ª MTF — investigar"
  ],
  [
    "Sesamoidite / lesão por estresse dos sesamoides — investigar",
    "Metatarsalgia mecânica — investigar"
  ]
];

  var CONFIG_DIFERENCIAIS_HMA = {
  "Dor cervical com componente radicular — investigar": {
    "pontos": {
      "irradiacaoBraco": 3,
      "neurologico": 2,
      "trajetoAlemCotovelo": 3,
      "dermatomaMaoEspecifico": 2,
      "distribuicaoUlnarMao": 1,
      "pioraMovimentoPescoco": 2,
      "trajetoRestritoOmbro": -3
    },
    "minimoPontos": 2,
    "algum": [
      "cervical",
      "irradiacaoBraco",
      "trajetoAlemCotovelo",
      "dermatomaMaoEspecifico",
      "distribuicaoUlnarMao",
      "desfiladeiroToracico"
    ],
    "minimoAlgum": 1,
    "confirmarRotulos": {
      "cervical": "origem cervical ou reprodução dos sintomas no exame cervical"
    }
  },
  "Síndrome dolorosa trocantérica / tendinopatia glútea — investigar": {
    "pontos": {
      "lateralQuadril": 3,
      "decubitoLateral": 3,
      "apoioUnipodal": 2,
      "irradiacaoPerna": 1,
      "irradiacaoLateralAteJoelhoQuadril": 2,
      "carga": 1
    },
    "minimoPontos": 4,
    "algum": [
      "lateralQuadril",
      "decubitoLateral",
      "apoioUnipodal"
    ],
    "minimoAlgum": 1
  },
  "Dor relacionada à articulação sacroilíaca/cintura pélvica — investigar": {
    "pontos": {
      "sacroiliacaDominante": 3,
      "transferencia": 2,
      "apoioUnipodal": 2,
      "carga": 1
    },
    "minimoPontos": 3,
    "algum": [
      "sacroiliacaDominante",
      "transferencia",
      "apoioUnipodal"
    ],
    "minimoAlgum": 1
  },
  "Dor relacionada ao manguito rotador — investigar": {
    "pontos": {
      "elevacaoBraco": 3,
      "carga": 1,
      "noturna": 1,
      "decubitoOmbro": 1,
      "rigidezOmbro": 1,
      "trajetoRestritoOmbro": 1,
      "trajetoAlemCotovelo": -3,
      "pioraMovimentoPescoco": -2
    },
    "minimoPontos": 2,
    "algum": [
      "elevacaoBraco",
      "trajetoRestritoOmbro",
      "rigidezOmbro"
    ],
    "minimoAlgum": 1
  },
  "Tendinopatia da cabeça longa do bíceps — investigar": {
    "pontos": {
      "bicepsOmbro": 3,
      "carga": 1,
      "elevacaoBraco": 1
    },
    "minimoPontos": 3,
    "algum": [
      "bicepsOmbro"
    ],
    "minimoAlgum": 1
  },
  "Osteoartrose de quadril — investigar": {
    "pontos": {
      "quadril": 1,
      "virilha": 2,
      "rigidez": 3,
      "carga": 1
    },
    "minimoPontos": 5,
    "algum": [
      "quadril",
      "virilha",
      "rigidez"
    ],
    "minimoAlgum": 2
  },
  "Dor intra-articular / conflito femoroacetabular — investigar": {
    "pontos": {
      "quadril": 1,
      "virilha": 2,
      "flexao": 2,
      "quadrilMecanico": 2,
      "carga": 1
    },
    "minimoPontos": 4,
    "algum": [
      "virilha",
      "quadrilMecanico"
    ],
    "minimoAlgum": 1
  },
  "Sobrecarga do flexor do quadril/iliopsoas — investigar": {
    "pontos": {
      "flexorQuadril": 3,
      "carga": 1,
      "quadrilMecanico": 1
    },
    "minimoPontos": 3,
    "algum": [
      "flexorQuadril"
    ],
    "minimoAlgum": 1
  },
  "Dor torácica musculoesquelética/costal — investigar": {
    "pontos": {
      "costal": 3,
      "trauma": 1,
      "carga": 1
    },
    "minimoPontos": 3,
    "algum": [
      "costal"
    ],
    "minimoAlgum": 1
  },
  "Entorse lateral de tornozelo — investigar": {
    "pontos": {
      "inversao": 3,
      "lateralTornozelo": 2,
      "trauma": 1,
      "instabilidadeFibulares": 1,
      "sindesmose": 1
    },
    "minimoPontos": 3,
    "algum": [
      "inversao",
      "lateralTornozelo",
      "instabilidadeFibulares"
    ],
    "minimoAlgum": 1
  },
  "Disfunção/tendinopatia do tibial posterior — investigar": {
    "pontos": {
      "tibialPosterior": 3,
      "insuficienciaTibialPosterior": 2,
      "carga": 1,
      "apoioUnipodal": 1
    },
    "minimoPontos": 3,
    "algum": [
      "tibialPosterior",
      "insuficienciaTibialPosterior"
    ],
    "minimoAlgum": 1
  },
  "Tendinopatia ou instabilidade dos fibulares — investigar": {
    "pontos": {
      "fibulares": 3,
      "instabilidadeFibulares": 2,
      "inversao": 2,
      "lateralTornozelo": 1,
      "carga": 1
    },
    "minimoPontos": 3,
    "algum": [
      "fibulares",
      "instabilidadeFibulares",
      "inversao"
    ],
    "minimoAlgum": 1
  },
  "Neuropatia ulnar no cotovelo — investigar": {
    "pontos": {
      "distribuicaoUlnarMao": 3,
      "nervoUlnar": 1,
      "neurologico": 1,
      "provocacaoUlnarCotovelo": 3
    },
    "minimoPontos": 3,
    "algum": [
      "distribuicaoUlnarMao",
      "nervoUlnar"
    ],
    "minimoAlgum": 1,
    "confirmarRotulos": {
      "provocacaoUlnarCotovelo": "reprodução com flexão/apoio do cotovelo para localizar a neuropatia"
    }
  },
  "Lesão meniscal — investigar": {
    "pontos": {
      "torcaoJoelho": 3,
      "linhaArticularJoelho": 2,
      "flexaoProfundaJoelho": 2,
      "mecanicoJoelho": 3,
      "bloqueioVerdadeiroJoelho": 2,
      "derrameJoelho": 2,
      "derrameTardioJoelho": 1,
      "trauma": 1
    },
    "minimoPontos": 2,
    "algum": [
      "torcaoJoelho",
      "linhaArticularJoelho",
      "flexaoProfundaJoelho",
      "mecanicoJoelho",
      "bloqueioVerdadeiroJoelho"
    ],
    "minimoAlgum": 1,
    "confirmarRotulos": {
      "linhaArticularJoelho": "localizar a dor na interlinha medial ou lateral",
      "mecanicoJoelho": "travamento, bloqueio ou clique doloroso",
      "derrameJoelho": "derrame/edema e tempo de instalação"
    }
  },
  "Lesão meniscal medial — investigar": {
    "pontos": {
      "linhaArticularMedialJoelho": 4,
      "joelhoMedial": 3,
      "flexaoProfundaJoelho": 2,
      "torcaoJoelho": 2,
      "mecanicoJoelho": 2,
      "derrameTardioJoelho": 1
    },
    "minimoPontos": 4,
    "algum": [
      "joelhoMedial",
      "linhaArticularMedialJoelho"
    ],
    "minimoAlgum": 1
  },
  "Lesão meniscal lateral — investigar": {
    "pontos": {
      "linhaArticularLateralJoelho": 4,
      "joelhoLateral": 3,
      "flexaoProfundaJoelho": 2,
      "torcaoJoelho": 2,
      "mecanicoJoelho": 2,
      "derrameTardioJoelho": 1
    },
    "minimoPontos": 4,
    "algum": [
      "joelhoLateral",
      "linhaArticularLateralJoelho"
    ],
    "minimoAlgum": 1
  },
  "Derrame / irritação intra-articular do joelho — investigar": {
    "pontos": {
      "derrameJoelho": 4,
      "plenitudeJoelho": 2,
      "flexaoProfundaJoelho": 1,
      "derramePrecoceJoelho": 1,
      "derrameTardioJoelho": 1,
      "bursitePrepatelar": -2
    },
    "minimoPontos": 3,
    "algum": [
      "derrameJoelho",
      "plenitudeJoelho"
    ],
    "minimoAlgum": 1
  },
  "Lesão ligamentar do joelho — investigar": {
    "pontos": {
      "trauma": 2,
      "instabilidadeJoelho": 3,
      "falseioObjetivoJoelho": 2,
      "derramePrecoceJoelho": 2,
      "torcaoJoelho": 1
    },
    "minimoPontos": 3,
    "algum": [
      "instabilidadeJoelho",
      "falseioObjetivoJoelho",
      "derramePrecoceJoelho",
      "torcaoJoelho"
    ],
    "minimoAlgum": 1
  },
  "Tendinopatia patelar — investigar": {
    "pontos": {
      "joelhoAnterior": 3,
      "salto": 3,
      "flexaoJoelhoCarga": 1,
      "carga": 1
    },
    "minimoPontos": 3,
    "algum": [
      "joelhoAnterior",
      "salto"
    ],
    "minimoAlgum": 1
  },
  "Dor femoropatelar — investigar": {
    "pontos": {
      "joelhoAnterior": 3,
      "flexaoJoelhoCarga": 2,
      "flexaoProfundaJoelho": 2,
      "carga": 1,
      "salto": 1
    },
    "minimoPontos": 2,
    "algum": [
      "joelhoAnterior",
      "flexaoJoelhoCarga",
      "flexaoProfundaJoelho"
    ],
    "minimoAlgum": 1,
    "confirmarRotulos": {
      "joelhoAnterior": "confirmar localização anterior/peripatelar ou retropatelar",
      "flexaoJoelhoCarga": "reprodução em escadas, agachamento, corrida ou permanência sentada"
    }
  },
  "Neuroma de Morton — investigar": {
    "pontos": {
      "morton": 3,
      "metatarsoFocal": 1,
      "carga": 1,
      "neurologico": 1
    },
    "minimoPontos": 2,
    "algum": [
      "morton",
      "metatarsoFocal"
    ],
    "minimoAlgum": 1,
    "confirmarRotulos": {
      "morton": "queimação/choque interdigital, piora com calçado e espaço intermetatarsal"
    }
  },
  "Epicondilalgia lateral — investigar": {
    "pontos": {
      "cotoveloLateral": 3,
      "preensao": 2,
      "tunelRadial": 1,
      "carga": 1
    },
    "minimoPontos": 1,
    "algum": [
      "cotoveloLateral",
      "tunelRadial"
    ],
    "minimoAlgum": 1
  },
  "Síndrome do túnel radial / nervo interósseo posterior — investigar": {
    "pontos": {
      "tunelRadial": 3,
      "cotoveloLateral": 1
    },
    "minimoPontos": 1,
    "algum": [
      "tunelRadial",
      "cotoveloLateral"
    ],
    "minimoAlgum": 1
  },
  "Neuropatia ulnar no canal de Guyon — investigar": {
    "pontos": {
      "guyon": 3,
      "distribuicaoUlnarMao": 2,
      "neurologico": 1
    },
    "minimoPontos": 2,
    "algum": [
      "guyon",
      "distribuicaoUlnarMao"
    ],
    "minimoAlgum": 1
  },
  "Possível lesão do LCP — investigar": {
    "pontos": {
      "padraoLCP": 3,
      "trauma": 1,
      "instabilidadeJoelho": 1
    },
    "minimoPontos": 2,
    "algum": [
      "padraoLCP",
      "trauma"
    ],
    "minimoAlgum": 1
  },
  "Dor local do ombro — padrão musculoesquelético a investigar": {
    "pontos": {
      "provocacaoOmbro": 2,
      "elevacaoBraco": 2,
      "carga": 1,
      "trajetoRestritoOmbro": 1,
      "trajetoAlemCotovelo": -2,
      "neurologico": -1
    },
    "minimoPontos": 2,
    "algum": [
      "provocacaoOmbro",
      "elevacaoBraco",
      "trajetoRestritoOmbro"
    ],
    "minimoAlgum": 1,
    "confirmarRotulos": {
      "ombro": "reprodução independente da dor pelo exame do ombro"
    }
  },
  "Dor cervical associada a chicote — investigar": {
    "pontos": {
      "whiplash": 3,
      "trauma": 2,
      "cefaleiaCervical": 1,
      "neurologico": 2
    },
    "minimoPontos": 3,
    "algum": [
      "whiplash",
      "trauma"
    ],
    "minimoAlgum": 1,
    "confirmarRotulos": {
      "cervical": "dor/limitação cervical relacionada ao mecanismo"
    }
  },
  "Cervicalgia mecânica postural — investigar": {
    "pontos": {
      "posturaCervical": 3,
      "inicioInsidiosoCervical": 2,
      "rigidez": 1,
      "neurologico": -2
    },
    "minimoPontos": 3,
    "algum": [
      "posturaCervical",
      "inicioInsidiosoCervical"
    ],
    "minimoAlgum": 1,
    "confirmarRotulos": {
      "cervical": "reprodução mecânica cervical sem padrão neurológico dominante"
    }
  },
  "Síndrome do desfiladeiro torácico — investigar": {
    "pontos": {
      "desfiladeiroToracico": 2,
      "neurologico": 2,
      "irradiacaoBraco": 1,
      "elevacaoBraco": 1,
      "pioraMovimentoPescoco": -2
    },
    "minimoPontos": 3,
    "algum": [
      "desfiladeiroToracico",
      "elevacaoBraco"
    ],
    "minimoAlgum": 1,
    "confirmarRotulos": {
      "desfiladeiroToracico": "relação dos sintomas com elevação sustentada e exame neurovascular"
    }
  },
  "Cervicobraquialgia miofascial — investigar": {
    "pontos": {
      "irradiacaoBraco": 2,
      "trapezioSuperior": 2,
      "pontoGatilhoCervical": 1,
      "trajetoAlemCotovelo": -2,
      "dermatomaMaoEspecifico": -2
    },
    "minimoPontos": 2,
    "algum": [
      "irradiacaoBraco",
      "trapezioSuperior",
      "pontoGatilhoCervical"
    ],
    "minimoAlgum": 1,
    "confirmarRotulos": {
      "cervical": "reprodução da dor por palpação/movimento cervical sem déficit neural objetivo"
    }
  },
  "Síndrome miofascial do trapézio superior — investigar": {
    "pontos": {
      "trapezioSuperior": 2,
      "pontoGatilhoCervical": 3,
      "posturaCervical": 1,
      "cervical": 1,
      "neurologico": -2
    },
    "minimoPontos": 3,
    "algum": [
      "trapezioSuperior",
      "pontoGatilhoCervical"
    ],
    "minimoAlgum": 1
  },
  "Síndrome do elevador da escápula — investigar": {
    "pontos": {
      "elevadorEscapula": 3,
      "cervical": 1,
      "rigidez": 1,
      "posturaCervical": 1
    },
    "minimoPontos": 3,
    "algum": [
      "elevadorEscapula"
    ],
    "minimoAlgum": 1
  },
  "Neuralgia occipital — investigar": {
    "pontos": {
      "occipitalUnilateral": 2,
      "nervoOccipital": 4,
      "cefaleiaCervical": 1,
      "cervical": 1
    },
    "minimoPontos": 3,
    "algum": [
      "occipitalUnilateral",
      "nervoOccipital"
    ],
    "minimoAlgum": 1
  },
  "Dor cervical com déficit de mobilidade — investigar": {
    "pontos": {
      "rigidez": 3,
      "flexao": 1,
      "extensao": 1,
      "cervical": 1,
      "neurologico": -2
    },
    "minimoPontos": 3,
    "algum": [
      "rigidez"
    ],
    "minimoAlgum": 1,
    "confirmarRotulos": {
      "cervical": "déficit objetivo de mobilidade cervical"
    }
  },
  "Dor cervical mecânica/referida — investigar": {
    "pontos": {
      "trajetoRestritoOmbro": 2,
      "rigidez": 1,
      "pioraMovimentoPescoco": 1,
      "cervical": 1,
      "neurologico": -2,
      "trajetoAlemCotovelo": -2
    },
    "minimoPontos": 2,
    "algum": [
      "trajetoRestritoOmbro",
      "pioraMovimentoPescoco",
      "rigidez"
    ],
    "minimoAlgum": 1
  },
  "Capsulite adesiva — investigar": {
    "pontos": {
      "rigidezOmbro": 3,
      "rotacaoOmbro": 2,
      "noturna": 1,
      "ombro": 1
    },
    "minimoPontos": 3,
    "algum": [
      "rigidezOmbro",
      "rotacaoOmbro"
    ],
    "minimoAlgum": 1,
    "confirmarRotulos": {
      "ombro": "restrição passiva global, especialmente rotação externa"
    }
  },
  "Instabilidade glenoumeral — investigar": {
    "pontos": {
      "instabilidadeOmbro": 3,
      "traumaOmbro": 2,
      "ombro": 1
    },
    "minimoPontos": 3,
    "algum": [
      "instabilidadeOmbro"
    ],
    "minimoAlgum": 1
  },
  "Dor acromioclavicular — investigar": {
    "pontos": {
      "acromioclavicular": 3,
      "traumaOmbro": 1,
      "decubitoOmbro": 1,
      "ombro": 1
    },
    "minimoPontos": 3,
    "algum": [
      "acromioclavicular"
    ],
    "minimoAlgum": 1
  },
  "Síndrome do túnel do carpo — investigar": {
    "pontos": {
      "mediano": 3,
      "noturnoMao": 2,
      "poupaDedoMinimo": 1,
      "alivioSacudirMao": 1,
      "neurologico": 1
    },
    "minimoPontos": 3,
    "algum": [
      "mediano",
      "noturnoMao",
      "alivioSacudirMao"
    ],
    "minimoAlgum": 1,
    "confirmarRotulos": {
      "punhoMao": "distribuição mediana e provocação distal no punho/mão"
    }
  },
  "Tenossinovite de De Quervain — investigar": {
    "pontos": {
      "polegarRadial": 3,
      "preensao": 2,
      "carga": 1
    },
    "minimoPontos": 3,
    "algum": [
      "polegarRadial"
    ],
    "minimoAlgum": 1,
    "confirmarRotulos": {
      "punhoMao": "dor radial focal no primeiro compartimento extensor"
    }
  },
  "Epicondilalgia medial — investigar": {
    "pontos": {
      "cotoveloMedial": 2,
      "provocacaoEpicondiloMedial": 3,
      "preensao": 2,
      "carga": 1
    },
    "minimoPontos": 3,
    "algum": [
      "cotoveloMedial",
      "provocacaoEpicondiloMedial"
    ],
    "minimoAlgum": 1
  },
  "Lesão do complexo fibrocartilaginoso triangular — investigar": {
    "pontos": {
      "punhoUlnar": 2,
      "mecanicoPunhoUlnar": 2,
      "trauma": 1,
      "preensao": 1,
      "carga": 1
    },
    "minimoPontos": 3,
    "algum": [
      "punhoUlnar",
      "mecanicoPunhoUlnar"
    ],
    "minimoAlgum": 1
  },
  "Dor lombar inflamatória / possível espondiloartrite axial — encaminhar para investigação": {
    "pontos": {
      "inflamatoria": 4,
      "noturna": 1,
      "rigidez": 1,
      "sacroiliaca": 1,
      "carga": -1
    },
    "minimoPontos": 4,
    "algum": [
      "inflamatoria"
    ],
    "minimoAlgum": 1,
    "confirmarRotulos": {
      "lombar": "padrão axial persistente e contexto compatível"
    }
  },
  "Dor lombar com déficit de mobilidade — investigar": {
    "pontos": {
      "padraoMobilidadeLombar": 3,
      "rigidez": 1,
      "flexao": 1,
      "extensao": 1,
      "neurologico": -2
    },
    "minimoPontos": 3,
    "algum": [
      "padraoMobilidadeLombar",
      "rigidez"
    ],
    "minimoAlgum": 1
  },
  "Dor lombar com alteração de coordenação do movimento — investigar": {
    "pontos": {
      "controleMovimentoLombar": 3,
      "instabilidadeLombar": 2,
      "carga": 1,
      "neurologico": -2
    },
    "minimoPontos": 3,
    "algum": [
      "controleMovimentoLombar",
      "instabilidadeLombar"
    ],
    "minimoAlgum": 1
  },
  "Dor lombar com padrão discogênico / resposta direcional — investigar": {
    "pontos": {
      "centralizacaoLombar": 4,
      "periferizacaoLombar": 3,
      "flexao": 1,
      "valsalvaLombar": 1,
      "quadrilDominante": -3
    },
    "minimoPontos": 3,
    "algum": [
      "centralizacaoLombar",
      "periferizacaoLombar"
    ],
    "minimoAlgum": 1
  },
  "Dor lombar com predomínio facetário/extensão-rotação — investigar": {
    "pontos": {
      "facetaLombar": 4,
      "extensao": 1,
      "irradiacaoPerna": -1,
      "quadrilDominante": -2
    },
    "minimoPontos": 3,
    "algum": [
      "facetaLombar"
    ],
    "minimoAlgum": 1
  },
  "Claudicação neurogênica / estenose lombar — investigar": {
    "pontos": {
      "marchaLimitada": 3,
      "extensao": 2,
      "irradiacaoPerna": 1,
      "alivioFlexaoLombar": 3,
      "flexao": -1,
      "quadrilDominante": -2
    },
    "minimoPontos": 3,
    "algum": [
      "marchaLimitada",
      "alivioFlexaoLombar"
    ],
    "minimoAlgum": 1,
    "confirmarRotulos": {
      "lombar": "relação com marcha/extensão e alívio em flexão/sentado"
    }
  },
  "Tendinopatia proximal dos isquiotibiais — investigar": {
    "pontos": {
      "isquioProximal": 3,
      "isquiotibial": 1,
      "carga": 1
    },
    "minimoPontos": 3,
    "algum": [
      "isquioProximal"
    ],
    "minimoAlgum": 1
  },
  "Lesão ou sobrecarga de adutores — investigar": {
    "pontos": {
      "adutor": 3,
      "carga": 2,
      "trauma": 2,
      "corridaRapida": 1
    },
    "minimoPontos": 3,
    "algum": [
      "adutor"
    ],
    "minimoAlgum": 1
  },
  "Lesão por estresse do colo femoral — excluir se compatível": {
    "pontos": {
      "quadril": 1,
      "virilha": 2,
      "carga": 2,
      "marchaLimitada": 2,
      "noturna": 2
    },
    "minimoPontos": 4,
    "algum": [
      "virilha",
      "marchaLimitada",
      "noturna"
    ],
    "minimoAlgum": 2,
    "confirmarRotulos": {
      "quadril": "dor profunda de quadril/virilha e provocação por carga"
    }
  },
  "Lesão do ligamento colateral medial — investigar": {
    "pontos": {
      "ligamentoMedialJoelho": 3,
      "linhaArticularJoelho": 1,
      "trauma": 1,
      "joelho": 1
    },
    "minimoPontos": 3,
    "algum": [
      "ligamentoMedialJoelho"
    ],
    "minimoAlgum": 1
  },
  "Lesão do ligamento colateral lateral — investigar": {
    "pontos": {
      "ligamentoLateralJoelho": 3,
      "instabilidadeJoelho": 1,
      "trauma": 1,
      "lateralJoelho": 1
    },
    "minimoPontos": 3,
    "algum": [
      "ligamentoLateralJoelho"
    ],
    "minimoAlgum": 1
  },
  "Síndrome da banda iliotibial — investigar": {
    "pontos": {
      "tratoIliotibial": 3,
      "lateralJoelho": 2,
      "carga": 1,
      "corridaRapida": 1
    },
    "minimoPontos": 3,
    "algum": [
      "tratoIliotibial",
      "lateralJoelho"
    ],
    "minimoAlgum": 1
  },
  "Síndrome da pata de ganso — investigar": {
    "pontos": {
      "pataGanso": 3,
      "flexaoJoelhoCarga": 1,
      "carga": 1
    },
    "minimoPontos": 3,
    "algum": [
      "pataGanso"
    ],
    "minimoAlgum": 1
  },
  "Cisto poplíteo / derrame posterior — investigar": {
    "pontos": {
      "cistoPopliteo": 3,
      "popliteo": 2,
      "derrameJoelho": 1
    },
    "minimoPontos": 3,
    "algum": [
      "cistoPopliteo",
      "popliteo"
    ],
    "minimoAlgum": 1
  },
  "Osteoartrose de joelho — investigar": {
    "pontos": {
      "rigidez": 3,
      "carga": 2,
      "flexaoJoelhoCarga": 1,
      "joelho": 1
    },
    "minimoPontos": 4,
    "algum": [
      "rigidez",
      "flexaoJoelhoCarga"
    ],
    "minimoAlgum": 1
  },
  "Entorse da sindesmose — investigar": {
    "pontos": {
      "sindesmose": 3,
      "provocacaoSindesmose": 2,
      "trauma": 1,
      "carga": 1
    },
    "minimoPontos": 3,
    "algum": [
      "sindesmose",
      "provocacaoSindesmose"
    ],
    "minimoAlgum": 1,
    "confirmarRotulos": {
      "tornozelo": "dor acima da articulação e testes de sindesmose"
    }
  },
  "Lesão óssea por estresse do metatarso — excluir se compatível": {
    "pontos": {
      "metatarsoFocal": 3,
      "carga": 2,
      "noturna": 1,
      "marchaLimitada": 1
    },
    "minimoPontos": 3,
    "algum": [
      "metatarsoFocal"
    ],
    "minimoAlgum": 1
  },
  "Tendinopatia do Aquiles — investigar": {
    "pontos": {
      "posteriorTornozelo": 2,
      "aquilesCarga": 3,
      "carga": 1,
      "rigidez": 1
    },
    "minimoPontos": 2,
    "algum": [
      "aquilesCarga",
      "posteriorTornozelo"
    ],
    "minimoAlgum": 1
  },
  "Lesão do tendão de Aquiles — excluir ruptura se compatível": {
    "pontos": {
      "posteriorTornozelo": 1,
      "rupturaAquilesAguda": 3,
      "trauma": 2,
      "marchaLimitada": 2,
      "carga": 1
    },
    "minimoPontos": 3,
    "algum": [
      "rupturaAquilesAguda",
      "marchaLimitada"
    ],
    "minimoAlgum": 1
  },
  "Fasciopatia plantar — investigar": {
    "pontos": {
      "calcanhar": 2,
      "primeirosPassos": 3,
      "carga": 1,
      "rigidez": 1
    },
    "minimoPontos": 3,
    "algum": [
      "primeirosPassos",
      "calcanhar"
    ],
    "minimoAlgum": 1
  },
  "Osteoartrose talocrural pós-traumática — investigar": {
    "pontos": {
      "tornozelo": 1,
      "rigidez": 2,
      "trauma": 2,
      "carga": 1
    },
    "minimoPontos": 4,
    "algum": [
      "rigidez",
      "trauma"
    ],
    "minimoAlgum": 2
  },
  "Síndrome do estresse tibial medial — investigar": {
    "pontos": {
      "tibiaMedial": 3,
      "carga": 2,
      "corridaRapida": 1
    },
    "minimoPontos": 3,
    "algum": [
      "tibiaMedial"
    ],
    "minimoAlgum": 1
  },
  "Lesão óssea por estresse da tíbia — excluir se compatível": {
    "pontos": {
      "tibiaFocal": 3,
      "carga": 2,
      "noturna": 2,
      "apoioUnipodal": 1
    },
    "minimoPontos": 4,
    "algum": [
      "tibiaFocal"
    ],
    "minimoAlgum": 1
  },
  "Síndrome compartimental crônica por esforço — investigar": {
    "pontos": {
      "pernaExercicio": 3,
      "neurologico": 2,
      "carga": 1
    },
    "minimoPontos": 3,
    "algum": [
      "pernaExercicio"
    ],
    "minimoAlgum": 1
  },
  "Osteoartrose CMC do polegar — investigar": {
    "pontos": {
      "cmcPolegar": 4,
      "preensao": 2,
      "rigidez": 1,
      "polegarRadial": 1
    },
    "minimoPontos": 4,
    "algum": [
      "cmcPolegar"
    ],
    "minimoAlgum": 1
  },
  "Instabilidade / luxação patelar — investigar": {
    "pontos": {
      "instabilidadePatelar": 4,
      "trauma": 1,
      "derrameJoelho": 1,
      "instabilidadeJoelho": 1
    },
    "minimoPontos": 4,
    "algum": [
      "instabilidadePatelar"
    ],
    "minimoAlgum": 1
  },
  "Possível lesão do LCA — investigar": {
    "pontos": {
      "padraoLCA": 4,
      "torcaoJoelho": 1,
      "derramePrecoceJoelho": 2,
      "falseioObjetivoJoelho": 1,
      "instabilidadeJoelho": 1
    },
    "minimoPontos": 4,
    "algum": [
      "padraoLCA",
      "derramePrecoceJoelho",
      "falseioObjetivoJoelho"
    ],
    "minimoAlgum": 1
  },
  "Osteoartrose glenoumeral — investigar": {
    "pontos": {
      "artroseGlenoumeral": 4,
      "rigidezOmbro": 2,
      "rotacaoOmbro": 2,
      "carga": 1,
      "noturna": 1
    },
    "minimoPontos": 4,
    "algum": [
      "artroseGlenoumeral",
      "rigidezOmbro"
    ],
    "minimoAlgum": 1
  },
  "Lesão labral / SLAP do ombro — investigar": {
    "pontos": {
      "labralOmbro": 4,
      "instabilidadeOmbro": 1,
      "elevacaoBraco": 1,
      "traumaOmbro": 1,
      "bicepsOmbro": 1
    },
    "minimoPontos": 4,
    "algum": [
      "labralOmbro"
    ],
    "minimoAlgum": 1
  },
  "Osteonecrose da cabeça femoral — investigar prioritariamente": {
    "pontos": {
      "padraoOsteonecroseQuadril": 3,
      "riscoOsteonecroseQuadril": 3,
      "quadril": 1,
      "virilha": 1,
      "noturna": 1,
      "carga": 1
    },
    "minimoPontos": 4,
    "algum": [
      "padraoOsteonecroseQuadril",
      "quadril",
      "virilha"
    ],
    "minimoAlgum": 1,
    "confirmarRotulos": {
      "quadril": "origem intra-articular do quadril e perda de rotação interna"
    }
  },
  "Tendinopatia / lesão do bíceps distal — investigar": {
    "pontos": {
      "bicepsDistal": 3,
      "carga": 1,
      "preensao": 1,
      "rupturaBicepsDistal": -4
    },
    "minimoPontos": 3,
    "algum": [
      "bicepsDistal"
    ],
    "minimoAlgum": 1,
    "confirmarRotulos": {
      "bicepsDistal": "dor localizada na fossa cubital reproduzida por supinação/flexão resistida"
    }
  },
  "Bursite olecraniana — investigar": {
    "pontos": {
      "bursiteOlecrano": 4,
      "carga": 1
    },
    "minimoPontos": 4,
    "algum": [
      "bursiteOlecrano"
    ],
    "minimoAlgum": 1
  },
  "Dedo em gatilho / tenossinovite estenosante — investigar": {
    "pontos": {
      "dedoGatilho": 4
    },
    "minimoPontos": 4,
    "algum": [
      "dedoGatilho"
    ],
    "minimoAlgum": 1
  },
  "Neuralgia intercostal / dor neuropática torácica — investigar": {
    "pontos": {
      "intercostalNeuralgia": 4,
      "neurologico": 1,
      "herpesZoster": -3,
      "cardiopulmonar": -3
    },
    "minimoPontos": 4,
    "algum": [
      "intercostalNeuralgia"
    ],
    "minimoAlgum": 1,
    "confirmarRotulos": {
      "toracica": "distribuição em faixa e exame neurológico/cutâneo compatíveis"
    }
  },
  "Síndrome glútea profunda — investigar": {
    "pontos": {
      "gluteoProfundo": 4,
      "irradiacaoPerna": 1,
      "neurologico": 1,
      "flexao": 1,
      "isquioProximal": -4
    },
    "minimoPontos": 4,
    "algum": [
      "gluteoProfundo"
    ],
    "minimoAlgum": 1,
    "confirmarRotulos": {
      "quadril": "dor profunda glútea reproduzida por testes locais e não explicada melhor pela coluna"
    }
  },
  "Bursite pré-patelar — investigar": {
    "pontos": {
      "bursitePrepatelar": 4,
      "joelhoAnterior": 1,
      "carga": 1
    },
    "minimoPontos": 4,
    "algum": [
      "bursitePrepatelar"
    ],
    "minimoAlgum": 1
  },
  "Síndrome do túnel do tarso — investigar": {
    "pontos": {
      "tunelTarsal": 4,
      "neurologico": 2,
      "carga": 1,
      "tibialPosterior": 1
    },
    "minimoPontos": 4,
    "algum": [
      "tunelTarsal"
    ],
    "minimoAlgum": 1,
    "confirmarRotulos": {
      "tunelTarsal": "reprodução dos sintomas no túnel do tarso e distribuição plantar"
    }
  },
  "Hallux rigidus / osteoartrose da 1ª MTF — investigar": {
    "pontos": {
      "halluxRigidus": 4,
      "rigidez": 1,
      "carga": 1
    },
    "minimoPontos": 4,
    "algum": [
      "halluxRigidus"
    ],
    "minimoAlgum": 1
  },
  "Metatarsalgia mecânica — investigar": {
    "pontos": {
      "metatarsalgia": 4,
      "carga": 1,
      "morton": -2,
      "metatarsoFocal": -2
    },
    "minimoPontos": 4,
    "algum": [
      "metatarsalgia"
    ],
    "minimoAlgum": 1
  },
  "Neuropatia do nervo mediano no antebraço / síndrome do pronador — investigar": {
    "pontos": {
      "pronadorMediano": 4,
      "mediano": 1,
      "neurologico": 1,
      "noturnoMao": -2,
      "alivioSacudirMao": -2
    },
    "minimoPontos": 3,
    "algum": [
      "pronadorMediano"
    ],
    "minimoAlgum": 1
  },
  "Lesão do ligamento escafolunar / instabilidade carpiana — investigar": {
    "pontos": {
      "escafolunar": 4,
      "trauma": 1,
      "carga": 1,
      "punhoUlnar": -2
    },
    "minimoPontos": 3,
    "algum": [
      "escafolunar"
    ],
    "minimoAlgum": 1
  },
  "Lesão do ligamento colateral ulnar do polegar — investigar prioritariamente": {
    "pontos": {
      "ligamentoUlnarPolegar": 4,
      "trauma": 2,
      "preensao": 1
    },
    "minimoPontos": 3,
    "algum": [
      "ligamentoUlnarPolegar"
    ],
    "minimoAlgum": 1
  },
  "Tendinopatia calcária do ombro — investigar / considerar imagem": {
    "pontos": {
      "calcificacaoOmbro": 4,
      "ombro": 1,
      "noturna": 1,
      "elevacaoBraco": 1
    },
    "minimoPontos": 3,
    "algum": [
      "calcificacaoOmbro"
    ],
    "minimoAlgum": 1
  },
  "Lesão do ligamento colateral ulnar do cotovelo — investigar": {
    "pontos": {
      "ligamentoUlnarCotovelo": 4,
      "cotoveloMedial": 1,
      "trauma": 1,
      "nervoUlnar": 1
    },
    "minimoPontos": 3,
    "algum": [
      "ligamentoUlnarCotovelo"
    ],
    "minimoAlgum": 1
  },
  "Meralgia parestésica — investigar": {
    "pontos": {
      "meralgiaParestesica": 4,
      "neurologico": 1,
      "irradiacaoPerna": -1,
      "dermatomaPeEspecifico": -2,
      "valsalvaLombar": -2
    },
    "minimoPontos": 3,
    "algum": [
      "meralgiaParestesica"
    ],
    "minimoAlgum": 1
  },
  "Tendinopatia do quadríceps — investigar": {
    "pontos": {
      "tendaoQuadriceps": 4,
      "salto": 1,
      "flexaoJoelhoCarga": 1,
      "incapacidadeExtensaoAtivaJoelho": -3
    },
    "minimoPontos": 3,
    "algum": [
      "tendaoQuadriceps"
    ],
    "minimoAlgum": 1
  },
  "Síndrome de impacto anterior do tornozelo — investigar": {
    "pontos": {
      "impactoAnteriorTornozelo": 4,
      "tornozelo": 1,
      "carga": 1,
      "rigidez": 1
    },
    "minimoPontos": 3,
    "algum": [
      "impactoAnteriorTornozelo"
    ],
    "minimoAlgum": 1
  },
  "Síndrome de impacto posterior do tornozelo — investigar": {
    "pontos": {
      "impactoPosteriorTornozelo": 4,
      "posteriorTornozelo": 1,
      "carga": 1,
      "rupturaAquilesAguda": -3
    },
    "minimoPontos": 3,
    "algum": [
      "impactoPosteriorTornozelo"
    ],
    "minimoAlgum": 1
  },
  "Lesão da placa plantar / instabilidade metatarsofalângica — investigar": {
    "pontos": {
      "placaPlantar": 4,
      "carga": 1,
      "metatarsalgia": 1,
      "morton": -2
    },
    "minimoPontos": 3,
    "algum": [
      "placaPlantar"
    ],
    "minimoAlgum": 1
  },
  "Possível fratura por estresse do calcâneo — investigar prioritariamente": {
    "pontos": {
      "stressCalcaneo": 4,
      "carga": 2,
      "marchaLimitada": 1,
      "primeirosPassos": -1
    },
    "minimoPontos": 3,
    "algum": [
      "stressCalcaneo"
    ],
    "minimoAlgum": 1
  },
  "Tendinopatia insercional do Aquiles / bursite retrocalcânea — investigar": {
    "pontos": {
      "aquilesInsercionalRetrocalcanea": 4,
      "posteriorTornozelo": 1,
      "carga": 1,
      "rupturaAquilesAguda": -3
    },
    "minimoPontos": 3,
    "algum": [
      "aquilesInsercionalRetrocalcanea"
    ],
    "minimoAlgum": 1
  },
  "Sesamoidite / lesão por estresse dos sesamoides — investigar": {
    "pontos": {
      "sesamoidePrimeiroRaio": 4,
      "carga": 1,
      "halluxRigidus": -1,
      "metatarsalgia": 1
    },
    "minimoPontos": 3,
    "algum": [
      "sesamoidePrimeiroRaio"
    ],
    "minimoAlgum": 1
  }
};

  var ROTULOS_EVIDENCIA = {
  "toracica": "dor torácica",
  "costal": "comportamento costal ou respiratório",
  "cardiopulmonar": "sintomas cardiorrespiratórios",
  "riscoFratura": "fatores de risco para fratura",
  "inflamatoria": "padrão inflamatório",
  "sacroiliaca": "dor sacroilíaca",
  "transferencia": "dor nas transferências",
  "adutor": "dor nos adutores",
  "isquiotibial": "dor nos isquiotibiais",
  "corridaRapida": "mecanismo em alta velocidade",
  "tibiaMedial": "dor difusa na borda medial da tíbia",
  "tibiaFocal": "dor óssea focal na tíbia",
  "pernaExercicio": "sintomas previsíveis durante exercício",
  "cervical": "dor cervical",
  "irradiacaoBraco": "irradiação para o braço",
  "cefaleiaCervical": "cefaleia relacionada à cervical",
  "mielopatia": "alterações de marcha ou destreza",
  "ombro": "dor no ombro",
  "elevacaoBraco": "dor ao elevar o braço",
  "decubitoOmbro": "relação dos sintomas com deitar ou dormir sobre o ombro/membro superior",
  "provocacaoOmbro": "dor reproduzida pelo movimento do ombro",
  "rotacaoOmbro": "limitação funcional de rotação",
  "rigidezOmbro": "rigidez do ombro",
  "traumaOmbro": "trauma no ombro",
  "instabilidadeOmbro": "apreensão ou instabilidade",
  "acromioclavicular": "dor acromioclavicular",
  "cotoveloLateral": "dor lateral no cotovelo",
  "preensao": "dor ou fraqueza na preensão",
  "punhoMao": "sintomas no punho ou mão",
  "mediano": "distribuição do nervo mediano",
  "poupaDedoMinimo": "preservação do dedo mínimo na distribuição sensitiva",
  "noturnoMao": "sintomas noturnos na mão",
  "alivioSacudirMao": "alívio dos sintomas ao sacudir a mão",
  "polegarRadial": "dor radial na base do polegar",
  "perdaForcaAgudaOmbro": "perda aguda de força",
  "joelho": "dor no joelho",
  "joelhoAnterior": "dor anterior no joelho",
  "flexaoJoelhoCarga": "carga com o joelho flexionado",
  "torcaoJoelho": "torção ou pivô",
  "linhaArticularJoelho": "dor na linha articular",
  "joelhoMedial": "dor na região medial do joelho",
  "joelhoLateral": "dor na região lateral do joelho",
  "linhaArticularMedialJoelho": "dor na interlinha medial",
  "linhaArticularLateralJoelho": "dor na interlinha lateral",
  "flexaoProfundaJoelho": "dor em flexão profunda",
  "hiperextensaoJoelho": "dor em extensão final",
  "mecanicoJoelho": "travamento ou bloqueio",
  "bloqueioVerdadeiroJoelho": "bloqueio mecânico verdadeiro do joelho",
  "instabilidadeJoelho": "falseio ou instabilidade",
  "falseioObjetivoJoelho": "episódio de falseio ou cedência do joelho",
  "derrameJoelho": "derrame ou edema",
  "plenitudeJoelho": "sensação de plenitude/pressão intra-articular",
  "derramePrecoceJoelho": "derrame de início precoce",
  "derrameTardioJoelho": "derrame de início tardio",
  "salto": "sobrecarga por saltos",
  "tornozelo": "dor no tornozelo",
  "inversao": "mecanismo de inversão",
  "lateralTornozelo": "dor lateral no tornozelo",
  "posteriorTornozelo": "dor no tendão de Aquiles",
  "calcanhar": "dor no calcanhar",
  "primeirosPassos": "dor nos primeiros passos",
  "incapazQuatroPassos": "incapacidade de dar quatro passos",
  "dorOsseaTornozelo": "dor óssea nos pontos de Ottawa",
  "panturrilhaVascular": "edema, calor ou assimetria da panturrilha",
  "irradiacaoPerna": "irradiação para a perna",
  "neurologico": "sintomas neurológicos",
  "flexao": "relação com flexão",
  "extensao": "relação com extensão",
  "marchaLimitada": "limitação da marcha",
  "quadril": "dor no quadril",
  "lateralQuadril": "dor lateral no quadril",
  "decubitoLateral": "dor ao deitar de lado",
  "apoioUnipodal": "dor no apoio unipodal",
  "virilha": "dor inguinal",
  "carga": "relação com carga",
  "rigidez": "rigidez",
  "trauma": "trauma",
  "noturna": "dor noturna",
  "sistemico": "sinais sistêmicos",
  "caudaEquina": "alterações esfincterianas ou em sela",
  "whiplash": "mecanismo de chicote",
  "bicepsOmbro": "dor anterior no trajeto do bíceps",
  "rupturaManguito": "perda traumática de elevação",
  "cotoveloMedial": "dor medial no cotovelo",
  "nervoUlnar": "distribuição do nervo ulnar",
  "punhoUlnar": "dor ulnar no punho",
  "mecanicoPunhoUlnar": "sintomas mecânicos no lado ulnar do punho",
  "flexorQuadril": "dor com flexão do quadril",
  "quadrilMecanico": "clique ou travamento no quadril",
  "irradiacaoLateralAteJoelhoQuadril": "irradiação pela lateral da coxa até o joelho",
  "isquioProximal": "dor isquiática ao sentar",
  "ligamentoMedialJoelho": "mecanismo e dor do ligamento medial",
  "ligamentoLateralJoelho": "mecanismo e dor do ligamento lateral",
  "tratoIliotibial": "dor lateral relacionada à corrida",
  "pataGanso": "dor medial abaixo da interlinha",
  "cistoPopliteo": "massa ou pressão poplítea",
  "sindesmose": "dor alta na região da sindesmose",
  "provocacaoSindesmose": "dor provocada por rotação externa",
  "tibialPosterior": "dor medial e alteração do arco",
  "insuficienciaTibialPosterior": "sinais de insuficiência do tibial posterior",
  "fibulares": "dor ou estalo retromaleolar lateral",
  "instabilidadeFibulares": "estalo ou subluxação dos tendões fibulares",
  "metatarsoFocal": "dor óssea focal no metatarso",
  "morton": "dor neural interdigital",
  "traumaMediope": "trauma localizado no mediopé",
  "lisfranc": "padrão compatível com lesão do mediopé",
  "sinalEspecificoLisfranc": "equimose ou hematoma plantar",
  "aquilesCarga": "padrão de carga do Aquiles",
  "rupturaAquilesAguda": "sinais agudos de possível ruptura do Aquiles",
  "trajetoAlemCotovelo": "sintomas além do cotovelo",
  "trajetoRestritoOmbro": "sintomas restritos ao ombro e braço proximal",
  "dermatomaMaoEspecifico": "distribuição sensitiva específica na mão",
  "pioraMovimentoPescoco": "piora ao movimentar o pescoço",
  "posturaCervical": "exposição postural cervical",
  "inicioInsidiosoCervical": "início cervical insidioso",
  "torcicoloAgudo": "bloqueio cervical agudo",
  "inicioAoAcordarCervical": "início ao acordar",
  "cronicaCervical": "dor cervical persistente",
  "trapezioSuperior": "dor no trapézio superior",
  "pontoGatilhoCervical": "dor miofascial reproduzível",
  "instabilidadeCervical": "sensação de instabilidade cervical",
  "elevadorEscapula": "dor no elevador da escápula",
  "esforcoCervical": "esforço ou movimento cervical súbito",
  "occipitalUnilateral": "dor occipital unilateral",
  "nervoOccipital": "sensibilidade no trajeto occipital",
  "tonturaCervical": "tontura relacionada ao movimento cervical",
  "desfiladeiroToracico": "sintomas com elevação sustentada dos braços",
  "alivioFlexaoLombar": "alívio ao sentar/fletir a lombar",
  "centralizacaoLombar": "centralização dos sintomas",
  "periferizacaoLombar": "periferização dos sintomas",
  "valsalvaLombar": "piora com tosse, espirro ou Valsalva",
  "facetaLombar": "padrão unilateral em extensão-rotação",
  "extensaoRepetidaJovem": "extensão repetida em atleta jovem",
  "instabilidadeLombar": "sinais de instabilidade lombar",
  "degrauLombar": "degrau ou escorregamento vertebral",
  "dorFocalVertebralLombar": "dor vertebral lombar focal",
  "infeccaoColunaRisco": "fatores de risco para infecção vertebral",
  "oncologicoColunaRisco": "fatores de risco oncológicos",
  "visceralRenal": "padrão renal ou visceral",
  "padraoMobilidadeLombar": "déficit de mobilidade lombar",
  "controleMovimentoLombar": "alteração de coordenação do movimento",
  "quadrilDominante": "achados predominantes do quadril",
  "sacroiliacaDominante": "achados predominantes da sacroilíaca",
  "centralizacao": "centralização dos sintomas",
  "lateralJoelho": "dor lateral no joelho",
  "popliteo": "região poplítea",
  "distribuicaoUlnarMao": "distribuição sensitiva ulnar da mão",
  "provocacaoUlnarCotovelo": "reprodução dos sintomas com flexão/apoio do cotovelo",
  "provocacaoEpicondiloMedial": "dor com flexão de punho/pronação",
  "tunelRadial": "padrão clínico do túnel radial/interósseo posterior",
  "guyon": "padrão de compressão ulnar no canal de Guyon",
  "traumaPunhoMao": "trauma sobre mão/punho",
  "tabaqueiraEscafoide": "dor na tabaqueira anatômica",
  "costalMecanico": "reprodução mecânica torácica/costal",
  "provocacaoRespiratoriaToracica": "dor provocada por respiração/tosse/espirro",
  "respiratorioInfeccioso": "padrão torácico respiratório com sinais infecciosos",
  "herpesZoster": "padrão dermatomérico cutâneo compatível com herpes-zóster",
  "alteracaoUrinaria": "alteração urinária inespecífica a contextualizar",
  "sistemicoAltoRisco": "sinal sistêmico de maior relevância clínica",
  "padraoLCP": "mecanismo sugestivo de lesão do LCP",
  "deficitNeurologicoProgressivo": "déficit neurológico progressivo",
  "patelarFocal": "dor focal no polo inferior da patela",
  "cmcPolegar": "padrão localizado na CMC do polegar",
  "instabilidadePatelar": "luxação/subluxação ou apreensão patelar",
  "padraoLCA": "mecanismo/padrão sugestivo de LCA",
  "incapacidadeExtensaoAtivaJoelho": "incapacidade de extensão ativa do joelho",
  "rupturaMecanismoExtensorJoelho": "sinais de ruptura do mecanismo extensor",
  "artroseGlenoumeral": "padrão glenoumeral degenerativo com rigidez/crepitação",
  "labralOmbro": "clique/travamento profundo sugestivo de lesão labral",
  "fraturaQuadrilAguda": "padrão traumático compatível com fratura proximal do fêmur",
  "deformidadeFraturaQuadril": "encurtamento/rotação externa após trauma",
  "riscoOsteonecroseQuadril": "fator de risco para osteonecrose da cabeça femoral",
  "padraoOsteonecroseQuadril": "padrão clínico compatível com osteonecrose da cabeça femoral",
  "deformidadeOmbroTrauma": "deformidade traumática do ombro",
  "suspeitaArticulacaoSeptica": "articulação quente/inchada associada a febre",
  "traumaCervicalImportante": "trauma cervical de maior energia / mecanismo axial",
  "dorLinhaMediaCervical": "dor ou sensibilidade na linha média cervical",
  "vascularCervicalDorIncomum": "dor cervical/cefaleia súbita e incomum",
  "vascularCervicalNeuroCraniano": "sinais neurológicos cranianos associados à cervicalgia",
  "bicepsDistal": "padrão do bíceps distal",
  "rupturaBicepsDistal": "sinais de possível ruptura do bíceps distal",
  "bursiteOlecrano": "edema/bursite sobre o olécrano",
  "fraturaRadioDistal": "sinais de possível fratura do rádio distal",
  "dedoGatilho": "travamento/ressalto compatível com dedo em gatilho",
  "intercostalNeuralgia": "dor neuropática em faixa intercostal",
  "gluteoProfundo": "padrão de dor glútea profunda",
  "bursitePrepatelar": "edema superficial pré-patelar",
  "tunelTarsal": "padrão sensitivo do túnel do tarso",
  "halluxRigidus": "dor/rigidez da primeira metatarsofalângica",
  "metatarsalgia": "dor mecânica difusa nas cabeças metatarsais",
  "pronadorMediano": "padrão de neuropatia mediana proximal/pronador",
  "escafolunar": "dor ou instabilidade escafolunar",
  "ligamentoUlnarPolegar": "mecanismo e dor do ligamento colateral ulnar do polegar",
  "calcificacaoOmbro": "história ou imagem de calcificação do manguito",
  "ligamentoUlnarCotovelo": "padrão medial em valgo/arremesso",
  "meralgiaParestesica": "parestesia anterolateral da coxa sem padrão motor",
  "tendaoQuadriceps": "dor focal no tendão do quadríceps",
  "impactoAnteriorTornozelo": "dor anterior em dorsiflexão carregada",
  "impactoPosteriorTornozelo": "dor posterior profunda em flexão plantar",
  "placaPlantar": "dor/instabilidade plantar metatarsofalângica",
  "stressNavicular": "dor óssea focal no navicular relacionada à carga",
  "stressCalcaneo": "dor óssea profunda do calcâneo relacionada à carga",
  "aquilesInsercionalRetrocalcanea": "dor insercional/retrocalcânea do Aquiles",
  "sesamoidePrimeiroRaio": "dor plantar focal sob a 1ª MTF/sesamoides",
  "passivaOmbroLimitada": "amplitude passiva do ombro limitada",
  "rotacaoExternaPassivaOmbro": "perda de rotação externa passiva",
  "amplitudePassivaPreservadaOmbro": "amplitude passiva do ombro preservada",
  "apreensaoInstabilidadeOmbro": "apreensão em abdução/rotação externa ou subluxação recorrente",
  "trajetoC8Cervical": "trajeto cervical/medial do antebraço até quarto-quinto dedos",
  "sinalTeatroFemoropatelar": "dor femoropatelar após posição sentada prolongada",
  "crepitacaoJoelho": "crepitação do joelho",
  "rigidezCurtaJoelho": "rigidez curta após repouso",
  "dorsiflexaoCarregadaTornozelo": "dor anterior em dorsiflexão carregada do tornozelo"
};

  function normalizar(valor) {
    return String(valor || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim()
      .replace(/\bencima\b/g, 'em cima')
      .replace(/\b(durmo|dorme|dormia|dormindo|dormir)\b/g, 'dormir')
      .replace(/\b(deito|deita|deitado|deitada|deitando|deitar)\b/g, 'deitar')
      .replace(/\b(apoio|apoia|apoiado|apoiada|apoiando|apoiar)\b/g, 'apoiar')
      .replace(/\bpra\b/g, 'para')
      .replace(/\s+/g, ' ').trim();
  }

  var STOP_TOKENS_HMA = { a: 1, ao: 1, aos: 1, com: 1, da: 1, das: 1, de: 1, do: 1, dos: 1, e: 1, em: 1, na: 1, nas: 1, no: 1, nos: 1, o: 1, os: 1, para: 1, pela: 1, pelo: 1, por: 1, que: 1, uma: 1, um: 1 };
  var ANCORAS_HMA = ['lombar', 'cervical', 'pescoco', 'ombro', 'braco', 'antebraco', 'escapula', 'cotovelo', 'punho', 'mao', 'dedo', 'dedos', 'polegar', 'carpo', 'radio', 'ulna', 'estiloide', 'quadril', 'virilha', 'gluteo', 'coxa', 'perna', 'trocanter', 'pelve', 'isquio', 'isquiatico', 'joelho', 'patela', 'rotula', 'menisco', 'interlinha', 'ligamento', 'lca', 'lcp', 'poplitea', 'tibia', 'fibula', 'tornozelo', 'maleolo', 'maleolos', 'aquiles', 'calcanhar', 'calcaneo', 'pe', 'antepe', 'mediope', 'navicular', 'metatarso', 'panturrilha', 'toracica', 'costela', 'femur', 'glenoumeral', 'labrum', 'cmc', 'dedao', 'halux', 'metatarsofalangica', 'sesamoide', 'sesamoides'];
  var LOCALIZADORES_HMA = ['abaixo', 'acima', 'atras', 'frente', 'lateral', 'medial', 'interna', 'externa', 'anterior', 'posterior', 'proximal', 'distal', 'entre', 'dentro'];
  var CONCEITOS_MATCH_EXATO_HMA = new Set(['fraturaRadioDistal','punhoUlnar','mecanicoPunhoUlnar','joelhoAnterior']);

  function clausulasDetalhadasHMA(textoOriginal) {
    return kinesysDividirClausulasHMA(textoOriginal || '').map(function (c) {
      return Object.assign({}, c, { normalizado: normalizar(c.texto || '') });
    });
  }

  function palavraEquivaleTokenHMA(palavra, token) {
    return palavra === token || (token.length >= 5 && palavra.length >= 5 && (palavra.indexOf(token) === 0 || token.indexOf(palavra) === 0));
  }

  function negacaoDiretaAntesHMA(textoAntes) {
    var t=textoAntes||'';
    if (/\bsem\s+dor(?:\s+\w+){0,5}\s*$/.test(t)) return true;
    if (/(?:\bnega(?:ou)?(?:\s+\w+){0,4}\s*$|\bsem(?:\s+\w+){0,3}\s*$|\bausencia de(?:\s+\w+){0,3}\s*$|\bnao\s+(?:sente|apresenta|relata|refere|tem|teve|houve|existe)(?:\s+\w+){0,4}\s*$|\bnao\s*$)/.test(t)) return true;
    // Coordenação negativa curta: "sem dor no quadril ou virilha" / "sem X nem Y".
    // Não amplia o escopo através de uma nova oração positiva como "sem febre e piora...".
    return /\b(?:sem|ausencia de)(?:\s+\w+){0,4}\s+(?:ou|nem)\s*$/.test(t);
  }

  function varianteNegativaEhAchadoPositivoHMA(termo) {
    return /\b(?:nao|sem|ausencia)\b/.test(termo || '');
  }

  function escaparRegexHMA(valor) { return String(valor || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

  function indiceTermoComLimitesHMA(parte, termo) {
    // O matcher clínico de substring respeita limites de palavra.
    // Evita falsos positivos graves como "anca" dentro de "pancada".
    var re = new RegExp('(?:^|\\s)' + escaparRegexHMA(termo) + '(?=$|\\s)');
    var m = re.exec(parte || '');
    if (!m) return -1;
    return m.index + (m[0].charAt(0) === ' ' ? 1 : 0);
  }

  function negacaoDeEfeitoDepoisHMA(parte, indice, termo) {
    var depois = String(parte || '').slice(indice + String(termo || '').length, indice + String(termo || '').length + 80);
    // Ex.: "apoiar o cotovelo não interfere" / "mexer o pescoço não piora".
    // É ausência de provocação, não achado positivo.
    return /^\s*(?:e\s+|ou\s+)?nao\s+(?:modifica|interfere|piora|reproduz|altera|provoca|desencadeia|muda)(?:\s|$)/.test(depois);
  }

  function avaliarTermoNaClausulaHMA(clausula, termoOriginal) {
    var parte = clausula.normalizado || normalizar(clausula.texto || '');
    var termo = normalizar(termoOriginal);
    if (!parte || !termo) return null;

    var indice = indiceTermoComLimitesHMA(parte, termo);
    if (indice >= 0) {
      var antes = parte.slice(Math.max(0, indice - 75), indice);
      var negado = negacaoDiretaAntesHMA(antes) || negacaoDeEfeitoDepoisHMA(parte, indice, termo);
      return {
        afirmado: !negado, negado: negado, modo: 'substring', termo: termoOriginal,
        termoNormalizado: termo, clausulaId: clausula.id, trecho: clausula.texto,
        inicioClausula: clausula.inicio, fimClausula: clausula.fim,
        indiceNormalizado: indice, tokensEncontrados: []
      };
    }

    var tokens = termo.split(' ').filter(function (p) { return p.length > 2 && !STOP_TOKENS_HMA[p]; });
    if (tokens.length < 3) return null;
    var palavras = parte.split(' ').filter(Boolean);
    var ancorasDaVariante = tokens.filter(function (token) { return ANCORAS_HMA.indexOf(token) >= 0; });
    if (!ancorasDaVariante.length || !ancorasDaVariante.every(function (ancora) { return palavras.indexOf(ancora) >= 0; })) return null;

    var localizadoresDaVariante = tokens.filter(function (token) { return LOCALIZADORES_HMA.indexOf(token) >= 0; });
    if (!localizadoresDaVariante.every(function (token) { return palavras.some(function (palavra) { return palavraEquivaleTokenHMA(palavra, token); }); })) return null;

    var tokensEncontrados = [], posicoesEncontradas = [];
    tokens.forEach(function (token) {
      var pos = palavras.findIndex(function (palavra) { return palavraEquivaleTokenHMA(palavra, token); });
      if (pos >= 0) { tokensEncontrados.push(token); posicoesEncontradas.push(pos); }
    });
    var limiar = tokens.length < 5 ? 1 : 0.75;
    if (tokensEncontrados.length / tokens.length < limiar) return null;

    var primeiraPos = posicoesEncontradas.length ? Math.min.apply(null, posicoesEncontradas) : 0;
    var antesTokens = palavras.slice(Math.max(0, primeiraPos - 6), primeiraPos).join(' ');
    var temNegacaoClinicaLocal = /\b(?:nega|negou|sem|ausencia|nao|nunca|jamais)\b/.test(antesTokens);
    var negacaoJuntoToken = posicoesEncontradas.some(function(pos){
      var antesToken = palavras.slice(Math.max(0, pos - 4), pos).join(' ');
      return /\b(?:nega|negou|sem|ausencia|nao|nunca|jamais)\b/.test(antesToken);
    });
    var negacaoIntencionalNaVariante = varianteNegativaEhAchadoPositivoHMA(termo);
    var negadoTokens = (temNegacaoClinicaLocal || negacaoJuntoToken) && !negacaoIntencionalNaVariante;
    return {
      afirmado: !negadoTokens, negado: negadoTokens, modo: 'tokens', termo: termoOriginal,
      termoNormalizado: termo, clausulaId: clausula.id, trecho: clausula.texto,
      inicioClausula: clausula.inicio, fimClausula: clausula.fim,
      indiceNormalizado: -1, tokensEncontrados: tokensEncontrados
    };
  }

  function localizarTermoHMA(textoOriginal, termo) {
    var clausulas = clausulasDetalhadasHMA(textoOriginal || ''), positivos = [], negados = [];
    clausulas.forEach(function (clausula) {
      var match = avaliarTermoNaClausulaHMA(clausula, termo);
      if (!match) return;
      if (match.afirmado) positivos.push(match); else if (match.negado) negados.push(match);
    });
    return { positivos: positivos, negados: negados };
  }

  function termoAfirmado(texto, termo) {
    return localizarTermoHMA(texto, termo).positivos.length > 0;
  }

  function clausulaTemPropagacaoAfirmadaHMA(textoClausula) {
    var t = removerAcentos(textoClausula || '');
    var base = padraoPropagacaoKineSys(), re = new RegExp(base.source, 'ig'), m;
    while ((m = re.exec(t)) !== null) {
      var antes = t.slice(Math.max(0, m.index - 18), m.index);
      if (!/\b(?:nao|sem)\s*$/.test(antes)) return true;
      if (m[0].length === 0) re.lastIndex++;
    }
    return false;
  }

  function extrairSinaisDetalhadosHMA(textoOriginal) {
    var sinais = new Set(), proveniencia = {}, negacoes = [], clausulas = clausulasDetalhadasHMA(textoOriginal || '');
    Object.keys(LEXICO).forEach(function (chave) {
      var positivosChave = [], negadosChave = [];
      (LEXICO[chave] || []).forEach(function (termo) {
        clausulas.forEach(function (clausula) {
          var match = avaliarTermoNaClausulaHMA(clausula, termo);
          if (!match) return;
          // Dedo do pé e dedo da mão não podem compartilhar conceitos distais.
          // A desambiguação é feita antes de registrar a evidência, preservando
          // o LEXICO como fonte única e evitando C8/ulnar/CTS em sintomas do pé.
          var txtAnat = clausula.normalizado || normalizar(clausula.texto || '');
          var conceitosMao = ['dermatomaMaoEspecifico','nervoUlnar','distribuicaoUlnarMao','mediano','punhoMao','noturnoMao','poupaDedoMinimo','alivioSacudirMao','guyon'];
          var conceitosPe = ['dermatomaPeEspecifico'];
          var dedoPeExplicito = /\b(?:dedo|dedos|quinto dedo|primeiro dedo)\b.{0,16}\b(?:pe|pes)\b/.test(txtAnat) || /\b(?:halux|hálux)\b/.test(String(clausula.texto||'').toLowerCase());
          var dedoMaoExplicito = /\b(?:dedo|dedos|polegar|indicador|dedo medio|dedo minimo)\b.{0,16}\b(?:mao|maos)\b/.test(txtAnat);
          if (dedoPeExplicito && conceitosMao.indexOf(chave) >= 0 && !/\b(?:mao|maos|punho|cotovelo|braco|antebraco)\b/.test(txtAnat)) return;
          if (dedoMaoExplicito && conceitosPe.indexOf(chave) >= 0 && !/\b(?:pe|pes|perna|panturrilha|tornozelo)\b/.test(txtAnat)) return;
          if (match.modo === 'tokens' && CONCEITOS_MATCH_EXATO_HMA.has(chave)) return;
          if (match.afirmado && match.modo === 'tokens' && ['irradiacaoBraco','irradiacaoPerna','trajetoAlemCotovelo','trajetoAlemJoelhoLombar','irradiacaoLateralAteJoelhoQuadril'].indexOf(chave) >= 0) {
            var txtProp = removerAcentos(clausula.texto || '');
            if (!clausulaTemPropagacaoAfirmadaHMA(txtProp) && !/\birradiacao\b/.test(txtProp)) return;
          }
          var alvo = match.afirmado ? positivosChave : negadosChave;
          if (!alvo.some(function (m) { return m.clausulaId === match.clausulaId && m.termoNormalizado === match.termoNormalizado; })) alvo.push(match);
        });
      });
      if (negadosChave.length && positivosChave.length) {
        positivosChave = positivosChave.filter(function(p) {
          return !(p.modo === 'tokens' && negadosChave.some(function(n) { return n.clausulaId === p.clausulaId && n.modo === 'substring'; }));
        });
      }
      if (positivosChave.length) {
        sinais.add(chave);
        var porClausula = [];
        positivosChave.forEach(function (m) { if (!porClausula.some(function (x) { return x.clausulaId === m.clausulaId; })) porClausula.push(m); });
        proveniencia[chave] = porClausula.map(function (m) { return Object.assign({ conceito: chave, fonte: 'lexico' }, m); });
      }
      var negadosPorClausula = [];
      negadosChave.forEach(function (m) { if (!negadosPorClausula.some(function (x) { return x.clausulaId === m.clausulaId; })) negadosPorClausula.push(m); });
      negadosPorClausula.forEach(function (m) { negacoes.push(Object.assign({ conceito: chave, fonte: 'lexico' }, m)); });
    });
    // Resolve colisões lógicas em que uma expressão restritiva contém literalmente
    // a versão positiva. Ex.: "não passa do cotovelo" não pode significar ao mesmo
    // tempo "passa do cotovelo". Mantemos o achado restritivo e removemos apenas
    // o falso positivo lexical; evidência topológica independente continua preservada.
    function resolverParRestritivo(restritivo, alem) {
      if(!sinais.has(restritivo)||!sinais.has(alem)) return;
      var provAlem=proveniencia[alem]||[];
      var temTopologia=provAlem.some(function(x){return x.fonte==='topologia';});
      if(temTopologia) return;
      sinais.delete(alem);
      delete proveniencia[alem];
    }
    resolverParRestritivo('trajetoRestritoOmbro','trajetoAlemCotovelo');
    resolverParRestritivo('trajetoRestritoJoelhoLombar','trajetoAlemJoelhoLombar');
    return { sinais: sinais, proveniencia: proveniencia, negacoes: negacoes, clausulas: clausulas };
  }

  function extrairSinais(textoOriginal) {
    return extrairSinaisDetalhadosHMA(textoOriginal || '').sinais;
  }

  function classificarConceitoHMA(chave) {
    var mecanismo = ['trauma','whiplash','traumaOmbro','torcaoJoelho','inversao','traumaMediope','ligamentoMedialJoelho','ligamentoLateralJoelho','esforcoCervical','padraoLCA','fraturaQuadrilAguda','deformidadeOmbroTrauma'];
    var incapacidade = ['marchaLimitada','incapazQuatroPassos','perdaForcaAgudaOmbro','bloqueioVerdadeiroJoelho','insuficienciaTibialPosterior','rupturaAquilesAguda','instabilidadeJoelho','falseioObjetivoJoelho','incapacidadeExtensaoAtivaJoelho'];
    var temporalidade = ['cronica','cronicaCervical','noturna','matinal','inicioInsidiosoCervical','inicioAoAcordarCervical','derramePrecoceJoelho','derrameTardioJoelho'];
    var sintomas = ['neurologico','dermatomaMaoEspecifico','dermatomaPeEspecifico','mielopatia','caudaEquina','sistemico','cardiopulmonar','cefaleia','tonturaCervical'];
    var comportamento = ['carga','flexao','extensao','decubitoLateral','apoioUnipodal','transferencia','elevacaoBraco','decubitoOmbro','provocacaoOmbro','preensao','salto','valsalvaLombar','pioraMovimentoPescoco','provocacaoSindesmose','flexaoProfundaJoelho'];
    if (mecanismo.indexOf(chave) >= 0) return 'mecanismo';
    if (incapacidade.indexOf(chave) >= 0) return 'incapacidade';
    if (temporalidade.indexOf(chave) >= 0) return 'temporalidade';
    if (sintomas.indexOf(chave) >= 0) return 'sintoma';
    if (comportamento.indexOf(chave) >= 0) return 'comportamento';
    return 'achado';
  }

  function construirEventosClinicosHMA(extracao, topologia) {
    var eventos = [], id = 0;
    Object.keys(extracao.proveniencia || {}).forEach(function (conceito) {
      (extracao.proveniencia[conceito] || []).forEach(function (p) {
        eventos.push({ id: 'E' + (++id), tipo: classificarConceitoHMA(conceito), status: 'presente', conceito: conceito,
          rotulo: ROTULOS_EVIDENCIA[conceito] || conceito, clausulaId: p.clausulaId || null,
          trecho: p.trecho || '', termo: p.termo || '', fonte: p.fonte || 'lexico', modoMatch: p.modo || null });
      });
    });
    (extracao.negacoes || []).forEach(function (p) {
      eventos.push({ id: 'E' + (++id), tipo: classificarConceitoHMA(p.conceito), status: 'negado', conceito: p.conceito,
        rotulo: ROTULOS_EVIDENCIA[p.conceito] || p.conceito, clausulaId: p.clausulaId || null,
        trecho: p.trecho || '', termo: p.termo || '', fonte: p.fonte || 'lexico', modoMatch: p.modo || null });
    });
    (topologia?.pares || []).forEach(function (p) {
      eventos.push({ id: 'E' + (++id), tipo: 'trajeto', status: 'presente', conceito: 'trajetoAnatomico', rotulo: 'trajeto anatômico', clausulaId: p.clausulaId || null, trecho: p.trecho || '', fonte: 'topologia', origem: p.origem, destino: p.destino, origemSegmento:p.origemSegmento||null, destinoSegmento:p.destinoSegmento||null, ladoOrigem:p.ladoOrigem||null, ladoDestino:p.ladoDestino||null });
    });
    return eventos;
  }

  function mapearSobreposicoesEvidenciaHMA(proveniencia) {
    var grupos = {};
    Object.keys(proveniencia || {}).forEach(function (conceito) {
      (proveniencia[conceito] || []).forEach(function (p) {
        if ((p.fonte || 'lexico') !== 'lexico') return;
        var termo = normalizar(p.termo || '');
        if (!termo) return;
        var chave = (p.clausulaId || '?') + '|' + termo;
        if (!grupos[chave]) grupos[chave] = { clausulaId: p.clausulaId || null, termo: p.termo || '', trecho: p.trecho || '', conceitos: [] };
        if (grupos[chave].conceitos.indexOf(conceito) < 0) grupos[chave].conceitos.push(conceito);
      });
    });
    return Object.keys(grupos).map(function (k) { return grupos[k]; }).filter(function (g) { return g.conceitos.length > 1; });
  }

  function rotuloEvidenciaHMA(chave) {
    return ROTULOS_EVIDENCIA[chave] || String(chave || '').replace(/([A-Z])/g, ' $1').toLowerCase();
  }

  function prioridadeNivelHMA(nivel) {
    return ({ urgente: 3, prioritaria: 2, alternativa: 1 })[nivel] || 0;
  }

  function grupoHipoteseHMA(nome) {
    return GRUPOS_HIPOTESES_HMA[nome] || nome;
  }

  function hipotesesRelacionadasHMA(nomeA, nomeB) {
    if (!nomeA || !nomeB || nomeA === nomeB) return false;
    return RELACOES_DIFERENCIAIS_HMA.some(function (par) {
      return (par[0] === nomeA && par[1] === nomeB) || (par[0] === nomeB && par[1] === nomeA);
    });
  }

  /* ================= SCORE CONTEXTUAL, DUPLA CONTAGEM E CONCEITOS GLOBAIS =================
     Princípios:
     1) pesos originais dos PERFIS não são alterados;
     2) gates continuam determinísticos;
     3) conceitos globais (carga/flexão/extensão/rigidez/trauma) só contam quando
        a cláusula é anatomicamente compatível com o perfil;
     4) a elegibilidade continua usando a soma de pesos do perfil, agora sobre
        evidências contextualmente válidas;
     5) deduplicação afeta SOMENTE a ordenação, nunca remove o bônus específico
        nem reduz silenciosamente pesos antigos;
     6) suporte normalizado serve apenas para ordenar/auditar — não é probabilidade. */
  var KINESYS_CONCEITOS_GLOBAIS_SCORE = new Set(['carga','flexao','extensao','rigidez','trauma']);

  var KINESYS_REGIOES_CONCEITOS_SCORE = {
    cervical: ['cervical','posturaCervical','inicioInsidiosoCervical','torcicoloAgudo','inicioAoAcordarCervical','cronicaCervical','trapezioSuperior','pontoGatilhoCervical','instabilidadeCervical','elevadorEscapula','esforcoCervical','occipitalUnilateral','nervoOccipital','tonturaCervical','cefaleiaCervical','pioraMovimentoPescoco','mielopatia','whiplash','irradiacaoBraco','trajetoAlemCotovelo','trajetoRestritoOmbro','dermatomaMaoEspecifico','trajetoC8Cervical','traumaCervicalImportante','dorLinhaMediaCervical','vascularCervicalDorIncomum','vascularCervicalNeuroCraniano'],
    ombro: ['ombro','bicepsOmbro','elevacaoBraco','decubitoOmbro','provocacaoOmbro','traumaOmbro','rupturaManguito','perdaForcaAgudaOmbro','acromioclavicular','rigidezOmbro','trajetoRestritoOmbro','artroseGlenoumeral','labralOmbro','deformidadeOmbroTrauma','calcificacaoOmbro','passivaOmbroLimitada','rotacaoExternaPassivaOmbro','amplitudePassivaPreservadaOmbro','apreensaoInstabilidadeOmbro'],
    cotovelo: ['cotoveloMedial','cotoveloLateral','nervoUlnar','bicepsDistal','rupturaBicepsDistal','bursiteOlecrano','pronadorMediano','ligamentoUlnarCotovelo'],
    punho_mao: ['punhoMao','punhoUlnar','mecanicoPunhoUlnar','polegarRadial','mediano','noturnoMao','poupaDedoMinimo','alivioSacudirMao','cmcPolegar','fraturaRadioDistal','dedoGatilho','escafolunar','ligamentoUlnarPolegar'],
    toracica: ['toracica','costal','cardiopulmonar','intercostalNeuralgia'],
    lombar: ['lombar','irradiacaoPerna','trajetoAlemJoelhoLombar','trajetoRestritoJoelhoLombar','dermatomaPeEspecifico','centralizacaoLombar','periferizacaoLombar','valsalvaLombar','facetaLombar','extensaoRepetidaJovem','instabilidadeLombar','degrauLombar','dorFocalVertebralLombar','infeccaoColunaRisco','oncologicoColunaRisco','visceralRenal','padraoMobilidadeLombar','controleMovimentoLombar','caudaEquina'],
    quadril: ['quadril','lateralQuadril','virilha','quadrilMecanico','irradiacaoLateralAteJoelhoQuadril','flexorQuadril','isquioProximal','adutor','sacroiliaca','sacroiliacaDominante','quadrilDominante','fraturaQuadrilAguda','deformidadeFraturaQuadril','riscoOsteonecroseQuadril','padraoOsteonecroseQuadril','gluteoProfundo','meralgiaParestesica'],
    joelho: ['joelho','joelhoAnterior','joelhoMedial','joelhoLateral','linhaArticularJoelho','linhaArticularMedialJoelho','linhaArticularLateralJoelho','torcaoJoelho','flexaoJoelhoCarga','flexaoProfundaJoelho','sinalTeatroFemoropatelar','crepitacaoJoelho','rigidezCurtaJoelho','hiperextensaoJoelho','mecanicoJoelho','bloqueioVerdadeiroJoelho','derrameJoelho','plenitudeJoelho','derramePrecoceJoelho','derrameTardioJoelho','instabilidadeJoelho','falseioObjetivoJoelho','ligamentoMedialJoelho','ligamentoLateralJoelho','tratoIliotibial','pataGanso','cistoPopliteo','salto','instabilidadePatelar','padraoLCA','incapacidadeExtensaoAtivaJoelho','rupturaMecanismoExtensorJoelho','bursitePrepatelar','tendaoQuadriceps'],
    tornozelo_pe: ['tornozelo','posteriorTornozelo','calcanhar','lateralTornozelo','inversao','sindesmose','provocacaoSindesmose','tibialPosterior','insuficienciaTibialPosterior','fibulares','instabilidadeFibulares','metatarsoFocal','morton','traumaMediope','lisfranc','sinalEspecificoLisfranc','aquilesCarga','rupturaAquilesAguda','dorOsseaTornozelo','incapazQuatroPassos','primeirosPassos','tunelTarsal','halluxRigidus','metatarsalgia','impactoAnteriorTornozelo','dorsiflexaoCarregadaTornozelo','impactoPosteriorTornozelo','placaPlantar','stressNavicular','stressCalcaneo','aquilesInsercionalRetrocalcanea','sesamoidePrimeiroRaio'],
    perna: ['isquiotibial','tibiaMedial','tibiaFocal','pernaExercicio']
  };

  var KINESYS_REGIAO_POR_CONCEITO_SCORE = (function(){
    var mapa = {};
    Object.keys(KINESYS_REGIOES_CONCEITOS_SCORE).forEach(function(regiao){
      (KINESYS_REGIOES_CONCEITOS_SCORE[regiao] || []).forEach(function(chave){
        if (!mapa[chave]) mapa[chave] = [];
        if (mapa[chave].indexOf(regiao) < 0) mapa[chave].push(regiao);
      });
    });
    return mapa;
  })();

  function regioesConceitoScoreHMA(chave, prov) {
    var regioes = (KINESYS_REGIAO_POR_CONCEITO_SCORE[chave] || []).slice();
    if (prov) {
      [prov.origemSegmento, prov.destinoSegmento].filter(Boolean).forEach(function(seg){
        var cfg = (typeof KINESYS_ANATOMIA_SEGMENTADA !== 'undefined' && KINESYS_ANATOMIA_SEGMENTADA[seg]) || null;
        var macro = cfg && cfg.macro;
        var traduz = ({ braco:'ombro', antebraco:'cotovelo', punho_mao:'punho_mao', coluna_toracica:'toracica', coxa:'quadril', perna:'perna', tornozelo_pe:'tornozelo_pe' })[macro] || macro;
        if (traduz && regioes.indexOf(traduz) < 0) regioes.push(traduz);
      });
    }
    return regioes;
  }

  function regioesPerfilScoreHMA(perfil, pontos) {
    var regioes = [];
    var chaves = (perfil.todos || []).concat(perfil.algum || [], Object.keys(pontos || perfil.pontos || {}));
    chaves.forEach(function(chave){
      if (KINESYS_CONCEITOS_GLOBAIS_SCORE.has(chave)) return;
      (KINESYS_REGIAO_POR_CONCEITO_SCORE[chave] || []).forEach(function(regiao){
        if (regioes.indexOf(regiao) < 0) regioes.push(regiao);
      });
    });
    return regioes;
  }

  function mapaRegioesPorClausulaScoreHMA(proveniencia) {
    var mapa = {};
    Object.keys(proveniencia || {}).forEach(function(conceito){
      if (KINESYS_CONCEITOS_GLOBAIS_SCORE.has(conceito)) return;
      (proveniencia[conceito] || []).forEach(function(p){
        if (!p.clausulaId) return;
        if (!mapa[p.clausulaId]) mapa[p.clausulaId] = new Set();
        regioesConceitoScoreHMA(conceito, p).forEach(function(r){ mapa[p.clausulaId].add(r); });
      });
    });
    return mapa;
  }

  function indiceClausulaScoreHMA(id) {
    var m = String(id || '').match(/C(\d+)/i);
    return m ? Number(m[1]) : null;
  }

  function regioesContextoClausulaScoreHMA(clausulaId, mapa) {
    var diretas = mapa[clausulaId] ? Array.from(mapa[clausulaId]) : [];
    if (diretas.length) return diretas;
    var idx = indiceClausulaScoreHMA(clausulaId);
    if (!idx) return [];
    // Comportamentos e mecanismos frequentemente vêm em frase curta logo antes/depois
    // da região. Só herdamos quando o vizinho possui UMA única região inequívoca.
    var candidatas = [];
    [idx - 1, idx + 1].forEach(function(i){
      if (i < 1) return;
      var regs = mapa['C' + i] ? Array.from(mapa['C' + i]) : [];
      if (regs.length === 1 && candidatas.indexOf(regs[0]) < 0) candidatas.push(regs[0]);
    });
    return candidatas.length === 1 ? candidatas : [];
  }

  function intersecaoRegioesScoreHMA(a, b) {
    return (a || []).some(function(x){ return (b || []).indexOf(x) >= 0; });
  }

  function macroAnatomicoParaRegiaoScoreHMA(macro) {
    return ({ braco:'ombro', antebraco:'cotovelo', punho_mao:'punho_mao', coluna_toracica:'toracica', coxa:'quadril', perna:'perna', tornozelo_pe:'tornozelo_pe' })[macro] || macro || null;
  }

  function regioesProximasOcorrenciaScoreHMA(p) {
    if (!p || p.indiceNormalizado == null || p.indiceNormalizado < 0 || typeof extrairMencoesAnatomicasKineSys !== 'function') return [];
    var mencoes = extrairMencoesAnatomicasKineSys(p.trecho || '');
    var centro = Number(p.indiceNormalizado) || 0;
    var regs = [];
    mencoes.forEach(function(m){
      var d = Math.min(Math.abs((m.inicio || 0) - centro), Math.abs((m.fim || 0) - centro));
      if (d > 38) return;
      var reg = macroAnatomicoParaRegiaoScoreHMA(m.macro);
      if (reg && regs.indexOf(reg) < 0) regs.push(reg);
    });
    return regs;
  }

  function conceitoGlobalCompativelComPerfilHMA(chave, perfil, pontos, proveniencia) {
    if (!KINESYS_CONCEITOS_GLOBAIS_SCORE.has(chave)) return true;
    if (!proveniencia || !(proveniencia[chave] || []).length) return true; // compatibilidade defensiva
    var regioesPerfil = regioesPerfilScoreHMA(perfil, pontos);
    if (!regioesPerfil.length) return true;
    var mapaClausulas = mapaRegioesPorClausulaScoreHMA(proveniencia);
    return (proveniencia[chave] || []).some(function(p){
      // Uma região citada muito perto do termo global é mais informativa que a
      // simples coexistência de várias regiões na mesma cláusula. Ex.:
      // “agachar e FLEXIONAR O QUADRIL” não perde a flexão do quadril só porque
      // “agachar” também ativou um conceito específico de joelho.
      var proximas = regioesProximasOcorrenciaScoreHMA(p);
      if (proximas.length) return intersecaoRegioesScoreHMA(regioesPerfil, proximas);
      var regs = regioesContextoClausulaScoreHMA(p.clausulaId, mapaClausulas);
      // Se a mesma cláusula contém várias regiões e não há anatomia próxima ao
      // comportamento, ele é ambíguo e não deve favorecer uma delas artificialmente.
      if (regs.length !== 1) return false;
      return intersecaoRegioesScoreHMA(regioesPerfil, regs);
    });
  }

  function ocorrenciasTermoConceitoScoreHMA(chave, proveniencia) {
    return (proveniencia && proveniencia[chave] || []).filter(function(p){ return (p.fonte || 'lexico') === 'lexico'; }).map(function(p){
      return { chave: chave, clausulaId: p.clausulaId || '?', termo: normalizar(p.termoNormalizado || p.termo || ''), trecho: p.trecho || '' };
    }).filter(function(x){ return x.termo; });
  }

  function penalidadeDuplaContagemOrdenacaoHMA(pontos, chavesPositivas, proveniencia) {
    var grupos = {};
    (chavesPositivas || []).filter(function(chave){ return KINESYS_CONCEITOS_GLOBAIS_SCORE.has(chave); }).forEach(function(chave){
      ocorrenciasTermoConceitoScoreHMA(chave, proveniencia).forEach(function(o){
        var id = o.clausulaId + '|' + o.termo;
        if (!grupos[id]) grupos[id] = { clausulaId:o.clausulaId, termo:o.termo, trecho:o.trecho, chaves:[] };
        if (grupos[id].chaves.indexOf(chave) < 0) grupos[id].chaves.push(chave);
      });
    });
    var penalidade = 0, duplicidades = [];
    Object.keys(grupos).forEach(function(id){
      var g = grupos[id];
      if (g.chaves.length < 2) return;
      var pesos = g.chaves.map(function(chave){ return { chave:chave, peso:Math.max(0, Number((pontos || {})[chave]) || 0) }; }).filter(function(x){ return x.peso > 0; });
      if (pesos.length < 2) return;
      var soma = pesos.reduce(function(acc,x){ return acc + x.peso; }, 0);
      var maior = Math.max.apply(null, pesos.map(function(x){ return x.peso; }));
      var p = Math.max(0, soma - maior);
      if (!p) return;
      penalidade += p;
      duplicidades.push({ clausulaId:g.clausulaId, termo:g.termo, trecho:g.trecho, conceitos:pesos.map(function(x){return x.chave;}), penalidade:p });
    });
    return { penalidade:penalidade, duplicidades:duplicidades };
  }

  function avaliarPontosHMA(pontos, sinais, perfil, proveniencia) {
    pontos = pontos || {};
    var aFavor = [], contra = [], suprimidasContexto = [], positiva = 0, negativa = 0;
    var positivaBrutaGlobal = 0, negativaBrutaGlobal = 0;
    Object.keys(pontos).forEach(function (chave) {
      if (!sinais.has(chave)) return;
      var peso = Number(pontos[chave]) || 0;
      if (peso > 0) positivaBrutaGlobal += peso; else if (peso < 0) negativaBrutaGlobal += Math.abs(peso);
      if (peso !== 0 && perfil && KINESYS_CONCEITOS_GLOBAIS_SCORE.has(chave) && !conceitoGlobalCompativelComPerfilHMA(chave, perfil, pontos, proveniencia)) {
        suprimidasContexto.push(chave);
        return;
      }
      if (peso > 0) {
        positiva += peso;
        aFavor.push(chave);
      } else if (peso < 0) {
        negativa += Math.abs(peso);
        contra.push(chave);
      }
    });
    var total = positiva - negativa;
    var dup = penalidadeDuplaContagemOrdenacaoHMA(pontos, aFavor, proveniencia);
    var positivaAjustada = Math.max(0, positiva - dup.penalidade);
    var totalAjustado = positivaAjustada - negativa;
    var maxPositivo = Object.keys(pontos).reduce(function(acc,chave){ var p=Number(pontos[chave])||0; return acc + (p>0?p:0); },0);
    var suporteNormalizado = maxPositivo > 0 ? Math.max(0, Math.min(1, totalAjustado / maxPositivo)) : 0;
    var positivaEspecifica = aFavor.reduce(function(acc,chave){
      var p=Number(pontos[chave])||0;
      return acc + (!KINESYS_CONCEITOS_GLOBAIS_SCORE.has(chave) && p>0 ? p : 0);
    },0);
    var suporteEspecifico = positivaAjustada > 0 ? Math.max(0, Math.min(1, positivaEspecifica / positivaAjustada)) : 0;
    var indiceOrdenacao = totalAjustado + (suporteNormalizado * 1.5) + (suporteEspecifico * 0.25);
    return {
      aFavor:aFavor, contra:contra, positiva:positiva, negativa:negativa, total:total,
      positivaBrutaGlobal:positivaBrutaGlobal, negativaBrutaGlobal:negativaBrutaGlobal,
      positivaAjustada:positivaAjustada, totalAjustado:totalAjustado,
      suporteNormalizado:suporteNormalizado, suporteEspecifico:suporteEspecifico, indiceOrdenacao:indiceOrdenacao,
      suprimidasContexto:suprimidasContexto, duplicidadesOrdenacao:dup.duplicidades, penalidadeDuplicidade:dup.penalidade
    };
  }

  function avaliarPerfilEstritoHMA(perfil, sinais, proveniencia) {
    var todosPerfil = perfil.todos || [];
    var faltantes = todosPerfil.filter(function (chave) { return !sinais.has(chave); });
    var algum = perfil.algum || [];
    var quantidadeAlgum = algum.filter(function (chave) { return sinais.has(chave); }).length;
    var avaliacao = avaliarPontosHMA(perfil.pontos, sinais, perfil, proveniencia);
    var atendePontos = !perfil.pontos || avaliacao.total >= (perfil.minimoPontos || 1);
    var atendeAlgum = !algum.length || quantidadeAlgum >= (perfil.minimoAlgum || 1);
    var atende = faltantes.length === 0 && atendePontos && atendeAlgum;
    if (!atende) return null;

    var gatesAFavor = todosPerfil.concat(algum).filter(function (chave, indice, lista) {
      return sinais.has(chave) && lista.indexOf(chave) === indice && avaliacao.aFavor.indexOf(chave) < 0 && avaliacao.contra.indexOf(chave) < 0;
    });
    var evidenciasAFavor = gatesAFavor.concat(avaliacao.aFavor).filter(function (chave, indice, lista) { return lista.indexOf(chave) === indice; });
    return Object.assign({}, perfil, {
      tipoMatch: 'estrito',
      evidencias: evidenciasAFavor,
      evidenciasAFavor: evidenciasAFavor,
      evidenciasContra: avaliacao.contra,
      aConfirmar: [],
      pontuacaoPositiva: avaliacao.positiva,
      pontuacaoNegativa: avaliacao.negativa,
      pontuacaoClinica: perfil.pontos ? avaliacao.total : Math.max(2, evidenciasAFavor.length * 2),
      pontuacaoClinicaAjustada: perfil.pontos ? avaliacao.totalAjustado : Math.max(2, evidenciasAFavor.length * 2),
      suporteNormalizado: perfil.pontos ? avaliacao.suporteNormalizado : 1,
      suporteEspecifico: perfil.pontos ? avaliacao.suporteEspecifico : 1,
      indiceOrdenacao: perfil.pontos ? avaliacao.indiceOrdenacao : Math.max(2, evidenciasAFavor.length * 2),
      evidenciasSuprimidasContexto: avaliacao.suprimidasContexto || [],
      duplicidadesOrdenacao: avaliacao.duplicidadesOrdenacao || [],
      penalidadeDuplicidade: avaliacao.penalidadeDuplicidade || 0,
      pontuacaoBrutaGlobal: (avaliacao.positivaBrutaGlobal || 0) - (avaliacao.negativaBrutaGlobal || 0)
    });
  }

  function avaliarPerfilDiferencialHMA(perfil, sinais, proveniencia) {
    if (perfil.nivel === 'urgente') return null; // red flags só entram por match estrito
    var cfg = CONFIG_DIFERENCIAIS_HMA[perfil.nome];
    if (!cfg) return null;
    var avaliacao = avaliarPontosHMA(cfg.pontos || perfil.pontos, sinais, perfil, proveniencia);
    var algum = cfg.algum || [];
    var quantidadeAlgum = algum.filter(function (chave) { return sinais.has(chave); }).length;
    if (algum.length && quantidadeAlgum < (cfg.minimoAlgum || 1)) return null;
    // No modo diferencial, o limiar usa somente evidência POSITIVA.
    // Discriminadores negativos continuam registrados em "contra" e reduzem
    // a ordenação, mas não apagam um diferencial que possui sinais próprios.
    if (avaliacao.positiva < (cfg.minimoPontos || perfil.minimoPontos || 1)) return null;

    var faltantes = (perfil.todos || []).filter(function (chave) { return !sinais.has(chave); });
    var evidenciasAFavor = avaliacao.aFavor.slice();
    return Object.assign({}, perfil, {
      tipoMatch: 'diferencial',
      evidencias: evidenciasAFavor,
      evidenciasAFavor: evidenciasAFavor,
      evidenciasContra: avaliacao.contra,
      aConfirmar: faltantes,
      confirmarRotulos: cfg.confirmarRotulos || {},
      pontuacaoPositiva: avaliacao.positiva,
      pontuacaoNegativa: avaliacao.negativa,
      pontuacaoClinica: avaliacao.total,
      pontuacaoClinicaAjustada: avaliacao.totalAjustado,
      suporteNormalizado: avaliacao.suporteNormalizado,
      suporteEspecifico: avaliacao.suporteEspecifico,
      indiceOrdenacao: avaliacao.indiceOrdenacao,
      evidenciasSuprimidasContexto: avaliacao.suprimidasContexto || [],
      duplicidadesOrdenacao: avaliacao.duplicidadesOrdenacao || [],
      penalidadeDuplicidade: avaliacao.penalidadeDuplicidade || 0,
      pontuacaoBrutaGlobal: (avaliacao.positivaBrutaGlobal || 0) - (avaliacao.negativaBrutaGlobal || 0)
    });
  }

  function ordenarPerfisHMA(lista) {
    return lista.sort(function (a, b) {
      // Ordenação: score contextual ajustado + suporte do próprio perfil primeiro.
      // O score bruto permanece disponível e continua definindo a elegibilidade.
      return ((b.indiceOrdenacao || b.pontuacaoClinica || 0) - (a.indiceOrdenacao || a.pontuacaoClinica || 0)) ||
             ((b.pontuacaoClinicaAjustada || b.pontuacaoClinica || 0) - (a.pontuacaoClinicaAjustada || a.pontuacaoClinica || 0)) ||
             ((b.suporteNormalizado || 0) - (a.suporteNormalizado || 0)) ||
             (b.pontuacaoClinica - a.pontuacaoClinica) ||
             (prioridadeNivelHMA(b.nivel) - prioridadeNivelHMA(a.nivel)) ||
             ((b.evidenciasAFavor || []).length - (a.evidenciasAFavor || []).length);
    });
  }

  function perfisCompativeis(sinaisOuTexto, proveniencia) {
    var sinais, prov = proveniencia || null;
    if (sinaisOuTexto instanceof Set) { sinais = sinaisOuTexto; }
    else { var ex = extrairSinaisDetalhadosHMA(sinaisOuTexto || ''); sinais = ex.sinais; prov = ex.proveniencia; }
    return ordenarPerfisHMA(PERFIS.map(function (perfil) { return avaliarPerfilEstritoHMA(perfil, sinais, prov); }).filter(Boolean));
  }

  // O Safety Engine é avaliado em trilha própria. Red flags não entram
  // no ranking da suspeita musculoesquelética e não são candidatas a diferencial parcial.
  function alertasSegurancaCompativeisHMA(sinais, proveniencia) {
    return ordenarPerfisHMA(PERFIS.filter(function(perfil){return perfil.nivel==='urgente';}).map(function(perfil){
      return avaliarPerfilEstritoHMA(perfil,sinais,proveniencia);
    }).filter(Boolean));
  }

  function perfisClinicosEstritosHMA(sinais, proveniencia) {
    return ordenarPerfisHMA(PERFIS.filter(function(perfil){return perfil.nivel!=='urgente';}).map(function(perfil){
      return avaliarPerfilEstritoHMA(perfil,sinais,proveniencia);
    }).filter(Boolean));
  }

  // CORREÇÃO CRÍTICA 6.1 — arbitragem clínica por padrão de alta especificidade.
  // Origem proximal explícita + extensão distal + achado neurológico deve prevalecer
  // sobre um perfil articular local que apenas modula a dor. O local continua diferencial.
  function aplicarDominanciaClinicaHMA(lista, sinais, topologia) {
    var perfis=(lista||[]).slice();
    var pares=(topologia?.pares||[]).filter(function(p){return p.compatibilidadeLateral!==false;});
    var ordem=function(seg){return KINESYS_ANATOMIA_SEGMENTADA?.[seg]?.ordem;};
    var cervicalDistal=sinais.has('cervical')&&sinais.has('neurologico')&&sinais.has('trajetoAlemCotovelo')&&pares.some(function(p){
      var od=ordem(p.destinoSegmento);
      return p.origemSegmento==='cervical'&&od!=null&&od>3;
    });
    var lombarDistal=sinais.has('lombar')&&sinais.has('neurologico')&&sinais.has('trajetoAlemJoelhoLombar')&&pares.some(function(p){
      var od=ordem(p.destinoSegmento);
      return p.origemSegmento==='lombar'&&od!=null&&od>3;
    });
    var peso=function(p){
      if(cervicalDistal&&p.nome==='Dor cervical com componente radicular — investigar') return 100;
      if(lombarDistal&&p.nome==='Dor lombar com componente radicular — investigar') return 100;
      return 0;
    };
    perfis.sort(function(a,b){
      var d=peso(b)-peso(a); if(d) return d;
      return ((b.indiceOrdenacao||b.pontuacaoClinica||0)-(a.indiceOrdenacao||a.pontuacaoClinica||0))||
             ((b.pontuacaoClinicaAjustada||b.pontuacaoClinica||0)-(a.pontuacaoClinicaAjustada||a.pontuacaoClinica||0))||
             ((b.suporteNormalizado||0)-(a.suporteNormalizado||0))||
             ((b.pontuacaoClinica||0)-(a.pontuacaoClinica||0));
    });
    if(cervicalDistal){var pc=perfis.find(function(x){return x.nome==='Dor cervical com componente radicular — investigar';});if(pc)pc.motivoDominancia='origem cervical + extensão distal ao cotovelo + achado neurológico';}
    if(lombarDistal){var pl=perfis.find(function(x){return x.nome==='Dor lombar com componente radicular — investigar';});if(pl)pl.motivoDominancia='origem lombar + extensão distal ao joelho + achado neurológico';}
    return perfis;
  }

  function perfilCompartilhaRegiaoComSinaisHMA(perfil, sinais) {
    var pontos = (CONFIG_DIFERENCIAIS_HMA[perfil.nome] && CONFIG_DIFERENCIAIS_HMA[perfil.nome].pontos) || perfil.pontos || {};
    var regioesPerfil = regioesPerfilScoreHMA(perfil, pontos);
    if (!regioesPerfil.length) return true;
    var regioesSinais = [];
    sinais.forEach(function(chave){
      (KINESYS_REGIAO_POR_CONCEITO_SCORE[chave] || []).forEach(function(regiao){
        if (regioesSinais.indexOf(regiao) < 0) regioesSinais.push(regiao);
      });
    });
    if (!regioesSinais.length) return true;
    return intersecaoRegioesScoreHMA(regioesPerfil, regioesSinais);
  }

  function diferenciaisCompativeisHMA(sinais, estritosClinicos, principal, proveniencia) {
    var nomesEstritos = new Set(estritosClinicos.map(function (p) { return p.nome; }));
    var grupoPrincipal = principal ? grupoHipoteseHMA(principal.nome) : null;

    var secundariosEstritos = estritosClinicos.filter(function (p) {
      if (!principal || p.nome === principal.nome) return false;
      // Evita duplicidade semântica óbvia (ex.: lombociatalgia x componente radicular).
      return grupoHipoteseHMA(p.nome) !== grupoPrincipal;
    }).map(function (p) { return Object.assign({}, p, { papel: 'diferencial' }); });

    var nomesFallback = new Set([
      'Dor lombar — padrão ainda inespecífico, caracterizar',
      'Dor local do ombro — padrão musculoesquelético a investigar'
    ]);
    var principalEhFallback = !!(principal && nomesFallback.has(principal.nome));

    var parciais = PERFIS.map(function (perfil) {
      if (nomesEstritos.has(perfil.nome)) return null;
      if (principal && grupoHipoteseHMA(perfil.nome) === grupoPrincipal) return null;
      var parcial = avaliarPerfilDiferencialHMA(perfil, sinais, proveniencia);
      if (!parcial) return null;
      // Sem principal específico, a sensibilidade continua alta, mas o candidato
      // precisa compartilhar região anatômica com os sinais presentes. Isso evita
      // que uma HMA isolada de joelho ofereça, por exemplo, sacroilíaca como diferencial.
      if ((!principal || principalEhFallback) && !perfilCompartilhaRegiaoComSinaisHMA(perfil, sinais)) return null;
      // Com principal específico, a matriz clínica explícita governa diferenciais
      // inclusive quando a relação cruza regiões (ex.: cervical x túnel do carpo).
      if (principal && !principalEhFallback && !hipotesesRelacionadasHMA(principal.nome, perfil.nome)) return null;
      return parcial;
    }).filter(Boolean).map(function (p) { return Object.assign({}, p, { papel: 'diferencial' }); });

    var todos = secundariosEstritos.concat(parciais).filter(function (p, indice, lista) {
      return lista.findIndex(function (x) { return x.nome === p.nome; }) === indice;
    });
    // Fallback genérico só sai quando já existe outro diferencial específico
    // DA MESMA região. Assim, uma reprodução independente no ombro continua
    // visível ao lado de uma radiculopatia cervical se ainda não há diagnóstico
    // local mais específico sustentado.
    var especificosLombar = todos.some(function(p){ return p.nome !== 'Dor lombar — padrão ainda inespecífico, caracterizar' && /lombar|sacroil[ií]aca|quadril|trocant|isquiotib/i.test(p.nome); });
    var especificosOmbro = todos.some(function(p){ return p.nome !== 'Dor local do ombro — padrão musculoesquelético a investigar' && /manguito|capsulite|acromioclavicular|b[ií]ceps|glenoumeral/i.test(p.nome); });
    todos = todos.filter(function(p){
      if (p.nome === 'Dor lombar — padrão ainda inespecífico, caracterizar' && especificosLombar) return false;
      if (p.nome === 'Dor local do ombro — padrão musculoesquelético a investigar' && especificosOmbro) return false;
      return true;
    });

    return todos.sort(function (a, b) {
      var relA = principal && hipotesesRelacionadasHMA(principal.nome, a.nome) ? 1 : 0;
      var relB = principal && hipotesesRelacionadasHMA(principal.nome, b.nome) ? 1 : 0;
      if (relA !== relB) return relB - relA;
      var estritoA = a.tipoMatch === 'estrito' ? 1 : 0;
      var estritoB = b.tipoMatch === 'estrito' ? 1 : 0;
      if (estritoA !== estritoB) return estritoB - estritoA;
      return ((b.indiceOrdenacao || b.pontuacaoClinica || 0) - (a.indiceOrdenacao || a.pontuacaoClinica || 0)) ||
             ((b.pontuacaoClinicaAjustada || b.pontuacaoClinica || 0) - (a.pontuacaoClinicaAjustada || a.pontuacaoClinica || 0)) ||
             ((b.suporteNormalizado || 0) - (a.suporteNormalizado || 0)) ||
             (b.pontuacaoClinica - a.pontuacaoClinica) ||
             (prioridadeNivelHMA(b.nivel) - prioridadeNivelHMA(a.nivel)) ||
             ((b.evidenciasAFavor || []).length - (a.evidenciasAFavor || []).length);
    }).slice(0, 3);
  }

  function perfilParaHipoteseHMA(p, papel) {
    if (!p) return null;
    return {
      nome: p.nome,
      papel: papel || p.papel || 'diferencial',
      forca: p.nivel,
      score: p.pontuacaoClinica,
      scoreAjustado: p.pontuacaoClinicaAjustada != null ? p.pontuacaoClinicaAjustada : p.pontuacaoClinica,
      suporteNormalizado: p.suporteNormalizado != null ? p.suporteNormalizado : null,
      indiceOrdenacao: p.indiceOrdenacao != null ? p.indiceOrdenacao : p.pontuacaoClinica,
      penalidadeDuplicidade: p.penalidadeDuplicidade || 0,
      evidenciasSuprimidasContexto: (p.evidenciasSuprimidasContexto || []).map(rotuloEvidenciaHMA),
      tipoMatch: p.tipoMatch || 'estrito',
      motivoDominancia: p.motivoDominancia || '',
      aFavor: (p.evidenciasAFavor || p.evidencias || []).map(rotuloEvidenciaHMA),
      contra: (p.evidenciasContra || []).map(rotuloEvidenciaHMA),
      aConfirmar: (p.aConfirmar || []).map(function (chave) { return (p.confirmarRotulos || {})[chave] || rotuloEvidenciaHMA(chave); })
    };
  }

  function rotuloRegiaoTopologiaHMA(id) {
    var cfg=(typeof KINESYS_ANATOMIA_SEGMENTADA!=='undefined'&&KINESYS_ANATOMIA_SEGMENTADA[id])||null;
    if(cfg&&cfg.rotulo)return cfg.rotulo;
    return ({
      cervical: 'cervical', escapula:'escápula', ombro: 'ombro', braco:'braço', cotovelo: 'cotovelo', antebraco:'antebraço', punho:'punho', mao:'mão', dedos_mao:'dedos da mão', punho_mao: 'mão',
      coluna_toracica: 'torácica', lombar: 'lombar', gluteo:'glúteo', quadril: 'quadril', coxa_lateral:'lateral da coxa', coxa:'coxa', joelho: 'joelho', perna:'perna', panturrilha:'panturrilha', tornozelo:'tornozelo', pe:'pé', dedos_pe:'dedos do pé',
      tornozelo_pe: 'tornozelo/pé', cefaleia: 'cabeça', atm: 'ATM'
    })[id] || String(id || '').replace(/_/g, ' ');
  }

  function enriquecerSinaisPelaTopologiaHMA(texto, sinais, proveniencia, origemRaw, destinoRaw) {
    if (typeof analisarTopologiaSintomasKineSys !== 'function') return null;
    var topologia = analisarTopologiaSintomasKineSys(texto || '', origemRaw || '', destinoRaw || '');
    var pares = (topologia?.pares || []).filter(function(p){return p.compatibilidadeLateral!==false;});
    var registrarTopologia = function (conceito, paresFonte) {
      if(!(paresFonte||[]).length)return;
      sinais.add(conceito);
      if (!proveniencia) return;
      if (!proveniencia[conceito]) proveniencia[conceito] = [];
      (paresFonte || []).forEach(function (p) {
        if (proveniencia[conceito].some(function (x) { return x.fonte === 'topologia' && x.origemSegmento === p.origemSegmento && x.destinoSegmento === p.destinoSegmento && x.clausulaId===p.clausulaId; })) return;
        proveniencia[conceito].push({ conceito: conceito, fonte: 'topologia', modo: 'trajeto', termo: '', termoNormalizado: '', clausulaId: p.clausulaId || null, trecho: p.trecho || String(texto || ''), origem: p.origem, destino: p.destino, origemSegmento:p.origemSegmento||null, destinoSegmento:p.destinoSegmento||null, ladoOrigem:p.ladoOrigem||null, ladoDestino:p.ladoDestino||null });
      });
    };

    // Campos estruturados "onde começa / para onde segue" são evidência clínica explícita.
    // Quando informados, a origem anatômica alimenta o mesmo gate regional usado pela HMA.
    var paresCampos = pares.filter(function(p){ return p.fonte === 'campos'; });
    [['cervical','cervical'],['lombar','lombar'],['ombro','ombro'],['quadril','quadril']].forEach(function(item){
      var fonte = paresCampos.filter(function(p){ return p.origemSegmento === item[0]; });
      registrarTopologia(item[1], fonte);
    });

    var ordemMS=function(seg){var c=KINESYS_ANATOMIA_SEGMENTADA?.[seg];return c&&c.cadeia==='ms'?c.ordem:null;};
    var ordemMI=function(seg){var c=KINESYS_ANATOMIA_SEGMENTADA?.[seg];return c&&c.cadeia==='mi'?c.ordem:null;};
    var origemMS=function(p){return ['cervical','escapula','ombro'].indexOf(p.origemSegmento)>=0||p.origem==='cervical'||p.origem==='ombro';};
    var paresIrradiacaoBraco=pares.filter(function(p){var od=ordemMS(p.destinoSegmento);return origemMS(p)&&od!=null&&od>=2;});
    registrarTopologia('irradiacaoBraco',paresIrradiacaoBraco);
    var paresAlemCotovelo=pares.filter(function(p){var od=ordemMS(p.destinoSegmento);return origemMS(p)&&od!=null&&od>3;});
    registrarTopologia('trajetoAlemCotovelo',paresAlemCotovelo);

    var origemLombar=function(p){return p.origemSegmento==='lombar'||p.origem==='lombar';};
    var paresIrradiacaoPerna=pares.filter(function(p){var od=ordemMI(p.destinoSegmento);return origemLombar(p)&&od!=null&&od>=2;});
    registrarTopologia('irradiacaoPerna',paresIrradiacaoPerna);
    var paresAlemJoelho=pares.filter(function(p){var od=ordemMI(p.destinoSegmento);return origemLombar(p)&&od!=null&&od>3;});
    registrarTopologia('trajetoAlemJoelhoLombar',paresAlemJoelho);

    // Trajeto lombar que termina no joelho, sem destino mais distal, é um discriminador útil.
    (topologia?.trajetosSegmentados||[]).forEach(function(t){
      if(t.conflitoLateralidade||!t.segmentos?.length)return;
      var primeiro=t.segmentos[0], destinos=t.segmentos.slice(1), max=Math.max.apply(null,destinos.map(function(x){return ordemMI(x.segmento)??-1;}));
      if(primeiro.segmento==='lombar'&&max===3){
        var fonte=pares.filter(function(p){return p.clausulaId===t.clausulaId&&p.origemSegmento==='lombar'&&ordemMI(p.destinoSegmento)===3;});
        registrarTopologia('trajetoRestritoJoelhoLombar',fonte);
      }
    });

    var paresLateralQuadril=pares.filter(function(p){
      return ['quadril','gluteo'].indexOf(p.origemSegmento)>=0&&(['coxa_lateral','joelho'].indexOf(p.destinoSegmento)>=0);
    });
    var trajetosLateral=(topologia?.trajetosSegmentados||[]).filter(function(t){return !t.conflitoLateralidade&&t.segmentos?.some(function(s){return s.segmento==='coxa_lateral';});});
    if(trajetosLateral.length&&paresLateralQuadril.length)registrarTopologia('irradiacaoLateralAteJoelhoQuadril',paresLateralQuadril);

    // Se uma única cláusula descreve explicitamente lados opostos, sinais de trajeto
    // originados exclusivamente dessa cláusula não podem ser usados como conexão anatômica.
    var conflitosClausula=new Set((topologia?.conflitosLateralidade||[]).map(function(c){return c.clausulaId;}).filter(Boolean));
    ['irradiacaoBraco','trajetoAlemCotovelo','irradiacaoPerna','trajetoAlemJoelhoLombar','trajetoRestritoJoelhoLombar','irradiacaoLateralAteJoelhoQuadril'].forEach(function(conceito){
      if(!sinais.has(conceito)||!proveniencia?.[conceito]||!conflitosClausula.size)return;
      var restante=proveniencia[conceito].filter(function(p){return !conflitosClausula.has(p.clausulaId);});
      if(restante.length)proveniencia[conceito]=restante;else{delete proveniencia[conceito];sinais.delete(conceito);}
    });
    // Restrição explícita de trajeto prevalece sobre uma conexão topológica
    // construída a partir do mesmo trecho negado. Ex.: "até o joelho e não
    // chega ao pé" não pode gerar simultaneamente trajeto além do joelho.
    if (sinais.has('trajetoRestritoJoelhoLombar') && sinais.has('trajetoAlemJoelhoLombar')) {
      var provAlem = proveniencia?.trajetoAlemJoelhoLombar || [];
      var filtrada = provAlem.filter(function(p){
        var t = removerAcentos(p.trecho || '');
        return !/\bnao\s+(?:chega|vai|passa|desce|alcanca|atinge)\b.{0,28}\b(?:pe|tornozelo|panturrilha|canela)\b/.test(t);
      });
      if (filtrada.length) proveniencia.trajetoAlemJoelhoLombar = filtrada;
      else { delete proveniencia.trajetoAlemJoelhoLombar; sinais.delete('trajetoAlemJoelhoLombar'); }
    }
    return topologia;
  }

  function enriquecerAchadosNarrativosHMA(texto, resultado, sinais, topologia) {
    var achados = Array.isArray(resultado.achados) ? resultado.achados.slice() : [];
    var chaves = new Set(achados.map(function (a) { return String(a.titulo || '') + '|' + String(a.valor || ''); }));
    var add = function (titulo, valor) {
      if (!valor) return;
      var chave = titulo + '|' + valor;
      if (chaves.has(chave)) return;
      chaves.add(chave);
      achados.push({ titulo: titulo, valor: valor });
    };

    var bruto = String(texto || '');
    var t = normalizar(bruto);
    var trajetosSegmentados = topologia?.trajetosSegmentados || [];
    var trajetosValidos = trajetosSegmentados.filter(function(t){return !t.conflitoLateralidade && (t.segmentos||[]).length>1;});
    if (trajetosValidos.length) {
      var trajetos = trajetosValidos.map(function(t){
        return (t.segmentos||[]).map(function(seg){
          var r=rotuloRegiaoTopologiaHMA(seg.segmento);
          return seg.ladoEfetivo ? r+' ('+seg.ladoEfetivo+')' : r;
        }).filter(function(v,i,a){return !i||v!==a[i-1];}).join(' → ');
      });
      add('Trajeto dos sintomas', Array.from(new Set(trajetos)).join('; '));
    } else if (sinais.has('trajetoAlemCotovelo')) {
      add('Trajeto dos sintomas', 'sintomas ultrapassam o cotovelo');
    }
    if ((topologia?.conflitosLateralidade || []).length) {
      add('Lateralidade do trajeto', 'há regiões explicitamente descritas em lados opostos; o motor não conectou esses segmentos como um único trajeto');
    } else if (topologia?.lateralidadeGlobal) {
      add('Lateralidade', topologia.lateralidadeGlobal === 'mista' ? 'mais de um lado citado na HMA' : topologia.lateralidadeGlobal);
    }

    var sintomasNeurais = [];
    if (termoAfirmado(bruto,'formigamento')) sintomasNeurais.push('formigamento');
    if (termoAfirmado(bruto,'dormência')||termoAfirmado(bruto,'dormencia')) sintomasNeurais.push('dormência');
    if (termoAfirmado(bruto,'parestesia')) sintomasNeurais.push('parestesia');
    if (termoAfirmado(bruto,'choque')||termoAfirmado(bruto,'choques')) sintomasNeurais.push('choque');
    if (termoAfirmado(bruto,'queimação')||termoAfirmado(bruto,'queimacao')) sintomasNeurais.push('queimação');
    if (sintomasNeurais.length) add('Sintomas neurológicos', sintomasNeurais.join(', '));

    var fraquezaAfirmada=['fraqueza','perda de força','perda de forca','perdeu força','perdeu forca','força reduzida','forca reduzida'].some(function(x){return termoAfirmado(bruto,x);});
    if (fraquezaAfirmada) {
      add('Déficit motor referido', 'fraqueza/perda de força');
    }
    if (sinais.has('decubitoOmbro')) {
      add('Comportamento ao deitar/dormir', 'sintoma relacionado ao apoio/decúbito sobre ombro ou membro superior; esclarecer localização e natureza do sintoma');
    }
    if (sinais.has('trajetoAlemCotovelo')) {
      add('Extensão distal', 'sintomas alcançam região distal ao cotovelo');
    }
    var origemCervicalDistal=(topologia?.pares||[]).some(function(p){
      var cfg=KINESYS_ANATOMIA_SEGMENTADA?.[p.destinoSegmento];
      return p.compatibilidadeLateral!==false&&p.origemSegmento==='cervical'&&cfg?.cadeia==='ms'&&cfg.ordem>3;
    });
    if (origemCervicalDistal && sinais.has('neurologico')) {
      add('Padrão neurológico proximal', 'origem cervical com extensão distal ao cotovelo/mão e sintomas neurológicos; priorizar investigação radicular/proximal');
    }
    resultado.achados = achados;
  }

  function construirEventosNarrativosHMA(clausulas) {
    var fatos = [];
    var vistos = new Set();
    function adicionar(rotulo, status, tipo, trecho, sintoma, local) {
      var chave = [rotulo, status, tipo, trecho].join('|');
      if (vistos.has(chave)) return;
      vistos.add(chave);
      fatos.push({ rotulo: rotulo, status: status, tipo: tipo, trecho: trecho, sintoma: sintoma || '', local: local || '' });
    }
    function localizar(trecho) {
      var m = String(trecho || '').match(/\b(joelho|perna|panturrilha|lombar|coluna|quadril|virilha|gl[uú]teo|coxa|ombro|bra[cç]o|antebra[cç]o|cotovelo|punho|m[aã]o|dedos?|pesco[cç]o|cervical|tor[aá]cica|t[oó]rax|costela|tornozelo|p[eé]|calcanhar|cabe[cç]a)\b/i);
      return m ? m[1].toLowerCase() : 'não especificado';
    }
    (clausulas || []).forEach(function (clausula) {
      var trecho = String(clausula?.texto || '').trim();
      if (!trecho) return;
      var incerto = /\b(talvez|suspeita|poss[ií]vel|a investigar|parece)\b/i.test(trecho);
      var local = localizar(trecho);
      var sintomas = [
        ['dor', /\bdor\b/i],
        ['formigamento', /\bformigamento\b/i],
        ['dormência', /\bdorm[eê]ncia\b/i],
        ['fraqueza', /\bfraqueza\b|\bperda de for[cç]a\b/i],
        ['inchaço', /\bincha[cç]o\b/i],
        ['edema', /\bedema\b/i],
        ['travamento', /\btravamento\b|\btravou\b/i],
        ['instabilidade', /\binstabilidade\b|\bfalseio\b|\bcede\b/i],
        ['febre', /\bfebre\b/i],
        ['falta de ar', /\bfalta de ar\b|\bdispneia\b/i]
      ];
      sintomas.forEach(function (def) {
        var sintoma = def[0], regex = def[1];
        if (!regex.test(trecho)) return;
        var sintomaEsc = sintoma === 'dormência' ? 'dorm[eê]ncia' :
          sintoma === 'inchaço' ? 'incha[cç]o' :
          sintoma === 'fraqueza' ? '(?:fraqueza|perda de for[cç]a)' :
          sintoma === 'falta de ar' ? '(?:falta de ar|dispneia)' : sintoma;
        var negado = new RegExp('\\b(?:n[aã]o|nega|negou|sem|aus[eê]ncia de)\\b.{0,18}\\b' + sintomaEsc + '\\b', 'i').test(trecho);
        adicionar(sintoma + ' em ' + local, negado ? 'negado' : incerto ? 'a esclarecer' : 'presente', 'sintoma', trecho, sintoma, local);
      });
      if (/\b(queda|trauma|colis[aã]o|tor[cç][aã]o|impacto|entorse)\b/i.test(trecho)) {
        var achado = trecho.match(/(?:queda|trauma|colis[aã]o|tor[cç][aã]o|impacto|entorse)[^.;,]*/i)?.[0] || trecho;
        adicionar('Mecanismo: ' + achado.replace(/^(o paciente |paciente )?(relata )?(que houve )?/i, '').trim(), 'relatado', 'mecanismo', trecho, '', local);
      }
      var piora = trecho.match(/\b(piora|agrava|aumenta)\s+(?:ao|a|quando)?\s*([^,.;]+)/i);
      if (piora) {
        var fator = piora[2].trim().replace(/^ficar de p[eé]$/i, 'ficar em pé');
        adicionar('Piora ao ' + fator, 'presente', 'fator de piora', trecho, '', local);
      }
      if (/\b(ao acordar|pela manh[aã])\b/i.test(trecho) && !piora) {
        adicionar('Padrão temporal: piora ao acordar', 'presente', 'padrão temporal', trecho, '', local);
      }
    });
    return fatos;
  }

  function criarResultadoBaseHMA(extracaoDetalhada) {
    var eventos = construirEventosNarrativosHMA(extracaoDetalhada?.clausulas || []);
    var achados = [];
    var vistos = new Set();
    var add = function (titulo, valor) {
      if (!valor) return;
      var chave = String(titulo) + '|' + String(valor);
      if (vistos.has(chave)) return;
      vistos.add(chave);
      achados.push({ titulo: titulo, valor: valor });
    };

    var dorPrincipal = eventos.find(function (e) { return e.tipo === 'sintoma' && e.sintoma === 'dor' && e.status === 'presente'; });
    if (dorPrincipal) add('Sintoma principal', 'Dor em ' + (dorPrincipal.local || 'região não definida'));
    eventos.filter(function (e) { return e.tipo === 'mecanismo'; }).forEach(function (e) { add('Mecanismo relevante', String(e.rotulo || '').replace(/^Mecanismo:\s*/i, '')); });
    eventos.filter(function (e) { return e.tipo === 'fator de piora'; }).forEach(function (e) { add('Comportamento dos sintomas', e.rotulo); });
    eventos.filter(function (e) { return e.tipo === 'padrão temporal'; }).forEach(function (e) { add('Padrão temporal', String(e.rotulo || '').replace(/^Padrão temporal:\s*/i, '')); });

    return {
      local: dorPrincipal && dorPrincipal.local && dorPrincipal.local !== 'não especificado' ? dorPrincipal.local : 'região não definida',
      achados: achados,
      lacunas: [],
      eventos: eventos
    };
  }

  window.analisarHMAClinicaKineSys = function (texto, contexto) {
    contexto = contexto || {};
    var extracaoDetalhada = extrairSinaisDetalhadosHMA(texto || '');
    var resultado = criarResultadoBaseHMA(extracaoDetalhada);
    resultado.versaoMotor = VERSAO_MOTOR_HMA;
    var sinaisLocais = extracaoDetalhada.sinais;
    var topologiaHMA = enriquecerSinaisPelaTopologiaHMA(texto || '', sinaisLocais, extracaoDetalhada.proveniencia, contexto.origemIrradiacao || '', contexto.irradiacao || '');
    var regioes = [['suspeitaArticulacaoSeptica','articulação'], ['deformidadeOmbroTrauma','ombro'], ['labralOmbro','ombro'], ['artroseGlenoumeral','ombro'], ['cmcPolegar','punho/mão'], ['instabilidadePatelar','joelho'], ['padraoLCA','joelho'], ['incapacidadeExtensaoAtivaJoelho','joelho'], ['rupturaMecanismoExtensorJoelho','joelho'], ['fraturaQuadrilAguda','quadril'], ['deformidadeFraturaQuadril','quadril'], ['padraoOsteonecroseQuadril','quadril'], ['riscoOsteonecroseQuadril','quadril'], ['tabaqueiraEscafoide','punho/mão'], ['guyon','punho/mão'], ['tunelRadial','cotovelo/antebraço'], ['popliteo','joelho'], ['herpesZoster','tórax/pele'], ['costalMecanico','torácica/costal'], ['irradiacaoLateralAteJoelhoQuadril', 'quadril/coxa lateral'], ['occipitalUnilateral', 'cervical/occipital'], ['nervoOccipital', 'cervical/occipital'], ['desfiladeiroToracico', 'cintura escapular/membro superior'], ['trapezioSuperior', 'cervical/ombro'], ['elevadorEscapula', 'cervical/escápula'], ['sinalEspecificoLisfranc', 'mediopé'], ['lisfranc', 'mediopé'], ['traumaMediope', 'mediopé'], ['morton', 'antepé'], ['metatarsoFocal', 'antepé'], ['punhoUlnar', 'punho'], ['nervoUlnar', 'cotovelo/mão'], ['isquioProximal', 'coxa posterior'], ['cardiopulmonar', 'tórax'], ['toracica', 'torácica'], ['sacroiliaca', 'sacroilíaca'], ['adutor', 'virilha/coxa medial'], ['isquiotibial', 'coxa posterior'], ['tibiaMedial', 'perna'], ['tibiaFocal', 'perna'], ['pernaExercicio', 'perna'], ['cervical', 'cervical'], ['ombro', 'ombro'], ['cotoveloLateral', 'cotovelo'], ['posteriorTornozelo', 'tornozelo/Aquiles'], ['calcanhar', 'calcanhar'], ['polegarRadial', 'punho/mão'], ['joelhoAnterior', 'joelho'], ['linhaArticularMedialJoelho', 'joelho'], ['linhaArticularLateralJoelho', 'joelho'], ['joelhoMedial', 'joelho'], ['joelhoLateral', 'joelho'], ['linhaArticularJoelho', 'joelho'], ['punhoMao', 'punho/mão'], ['joelho', 'joelho'], ['tornozelo', 'tornozelo'], ['quadril', 'quadril'], ['lombar', 'lombar']];
    var regiaoDetectada = (regioes.find(function (item) { return sinaisLocais.has(item[0]); }) || [])[1];
    if (regiaoDetectada) {
      resultado.local = regiaoDetectada;
      (resultado.achados || []).forEach(function (a) {
        if (a.titulo === 'Sintoma principal' && /não definida|nao definida/.test(a.valor || '')) a.valor = 'Dor em ' + regiaoDetectada;
      });
    }
    enriquecerAchadosNarrativosHMA(texto || '', resultado, sinaisLocais, topologiaHMA);
    var sinais = sinaisLocais;
    var alertas = alertasSegurancaCompativeisHMA(sinais, extracaoDetalhada.proveniencia);
    var clinicosEstritos = perfisClinicosEstritosHMA(sinais, extracaoDetalhada.proveniencia);
    clinicosEstritos = aplicarDominanciaClinicaHMA(clinicosEstritos, sinais, topologiaHMA);
    var principalPerfil = clinicosEstritos.length ? clinicosEstritos[0] : null;
    var diferenciaisPerfis = diferenciaisCompativeisHMA(sinais, clinicosEstritos, principalPerfil, extracaoDetalhada.proveniencia);

    var principal = perfilParaHipoteseHMA(principalPerfil, 'principal');
    var diferenciais = diferenciaisPerfis.map(function (p) { return perfilParaHipoteseHMA(p, 'diferencial'); });

    resultado.suspeitaPrincipal = principal;
    resultado.diferenciais = diferenciais;
    resultado.sinais = Array.from(sinais);
    resultado.clausulas = extracaoDetalhada.clausulas.map(function (c) { return { id: c.id, texto: c.texto, inicio: c.inicio, fim: c.fim }; });
    resultado.provenienciaSinais = extracaoDetalhada.proveniencia;
    resultado.negacoesDetectadas = extracaoDetalhada.negacoes;
    resultado.eventosNarrativos = Array.isArray(resultado.eventos) ? resultado.eventos.slice() : [];
    resultado.eventosClinicos = construirEventosClinicosHMA(extracaoDetalhada, topologiaHMA);
    resultado.topologiaAnatomica = topologiaHMA || null;
    resultado.conflitosLateralidade = topologiaHMA?.conflitosLateralidade || [];
    resultado.sobreposicoesEvidencia = mapearSobreposicoesEvidenciaHMA(extracaoDetalhada.proveniencia);

    var lacunasBase = resultado.lacunas || [];
    if (principalPerfil || diferenciaisPerfis.length) {
      var genericasAntigas = new Set([
        'Início, irritabilidade e comportamento em 24 horas',
        'Tarefa funcional limitante',
        'Achados de mobilidade, força, controle e exame de segurança'
      ]);
      lacunasBase = lacunasBase.filter(function (item) { return !genericasAntigas.has(item); });
    }
    if (/\b(fraqueza|perda de forca|perdeu forca|forca reduzida)\b/.test(normalizar(texto || ''))) {
      lacunasBase.unshift('Caracterizar a fraqueza: início, progressão, distribuição, miótomos, reflexos e diferença entre déficit motor e inibição por dor.');
    }
    if (sinais.has('decubitoOmbro')) {
      lacunasBase.unshift('Ao deitar/dormir sobre o braço ou ombro, esclarecer onde surge o sintoma e se é dor no topo/lateral/anterior, pressão, formigamento ou dormência.');
    }
    if (sinais.has('flexaoProfundaJoelho')) {
      var temLocalizacaoJoelho = sinais.has('joelhoAnterior') || sinais.has('joelhoMedial') || sinais.has('joelhoLateral') || sinais.has('linhaArticularMedialJoelho') || sinais.has('linhaArticularLateralJoelho');
      if (!temLocalizacaoJoelho) lacunasBase.unshift('Localizar a dor provocada pela flexão profunda: anterior/peripatelar, interlinha medial, interlinha lateral ou posterior.');
      if (!sinais.has('derrameJoelho') && !sinais.has('plenitudeJoelho')) lacunasBase.unshift('Verificar derrame/edema ou sensação de joelho cheio, pois a limitação dolorosa em flexão profunda pode acompanhar irritação intra-articular.');
    }
    resultado.lacunas = Array.from(new Set(alertas.concat(principalPerfil ? [principalPerfil] : [], diferenciaisPerfis).flatMap(function (p) { return p.perguntas || []; }).concat(lacunasBase))).slice(0, 9);
    resultado.alertas = alertas.map(function (p) {
      return {
        nome: p.nome,
        acao: 'Priorize avaliação médica antes da conduta fisioterapêutica.',
        aFavor: (p.evidenciasAFavor || p.evidencias || []).map(rotuloEvidenciaHMA),
        contra: (p.evidenciasContra || []).map(rotuloEvidenciaHMA)
      };
    });
    return resultado;
  };

  window.inspecionarScoreHMAKineSys = function (texto) {
    var extracao = extrairSinaisDetalhadosHMA(texto || '');
    var sinais = extracao.sinais;
    enriquecerSinaisPelaTopologiaHMA(texto || '', sinais, extracao.proveniencia);
    return PERFIS.map(function(perfil){
      var pontos = perfil.pontos || {};
      var av = avaliarPontosHMA(pontos, sinais, perfil, extracao.proveniencia);
      var faltantes = (perfil.todos || []).filter(function(chave){ return !sinais.has(chave); });
      return {
        nome:perfil.nome, nivel:perfil.nivel, faltantes:faltantes,
        scoreBrutoGlobal:av.positivaBrutaGlobal-av.negativaBrutaGlobal,
        scoreContextual:av.total, scoreAjustado:av.totalAjustado,
        suporteNormalizado:av.suporteNormalizado, indiceOrdenacao:av.indiceOrdenacao,
        aFavor:av.aFavor.slice(), contra:av.contra.slice(),
        suprimidasContexto:av.suprimidasContexto.slice(),
        penalidadeDuplicidade:av.penalidadeDuplicidade, duplicidades:av.duplicidadesOrdenacao.slice()
      };
    }).sort(function(a,b){return b.indiceOrdenacao-a.indiceOrdenacao;});
  };

  window.inspecionarProvenienciaHMAKineSys = function (texto) {
    var r = window.analisarHMAClinicaKineSys(texto || '');
    return {
      clausulas: r.clausulas || [],
      sinais: r.sinais || [],
      provenienciaSinais: r.provenienciaSinais || {},
      negacoesDetectadas: r.negacoesDetectadas || [],
      eventosClinicos: r.eventosClinicos || [],
      sobreposicoesEvidencia: r.sobreposicoesEvidencia || []
    };
  };

  (function memoizarAnaliseHMAKineSys(){
    var original = window.analisarHMAClinicaKineSys;
    if (typeof original !== 'function' || original.__kinesysMemoized) return;
    var ultimaChave = null;
    var ultimoResultado = null;
    var memo = function(texto, contexto){
      var chave = normalizar(texto || '') + '|' + JSON.stringify(contexto || {});
      if (chave === ultimaChave && ultimoResultado) return ultimoResultado;
      ultimoResultado = original.call(this, texto, contexto);
      ultimaChave = chave;
      return ultimoResultado;
    };
    memo.__kinesysMemoized = true;
    memo.__original = original;
    window.analisarHMAClinicaKineSys = memo;
  })();

  window.renderizarRadarHMAKineSys = function () {
    var campo = document.getElementById('paciente_hma');
    var box = document.getElementById('ks20_hma_radar');
    var lista = document.getElementById('ks20_hma_insights');
    if (!campo || !box || !lista) return;
    var r = window.analisarHMAClinicaKineSys(campo.value, {
      origemIrradiacao: document.getElementById('paciente_origem_irradiacao')?.value?.trim() || '',
      irradiacao: document.getElementById('paciente_irradiacao')?.value?.trim() || ''
    });
    box.hidden = !(r.achados.length || (r.alertas || []).length || r.suspeitaPrincipal || (r.diferenciais || []).length);
    if (box.hidden) return;
    var alertas = (r.alertas || []).map(function (a) { return '<div role="alert"><strong>' + escapeHTML(a.nome) + '</strong><br><small>' + escapeHTML(a.acao) + '</small></div>'; }).join('');
    var achados = r.achados.map(function (a) { return '<li><strong>' + escapeHTML(a.titulo) + ':</strong> ' + escapeHTML(a.valor) + '</li>'; }).join('');
    var principal = r.suspeitaPrincipal ? (function (h) {
      var contra = (h.contra || []).length ? '<br><small><strong>Contra:</strong> ' + escapeHTML(h.contra.join(' · ')) + '.</small>' : '';
      return '<div><strong>' + escapeHTML(h.nome) + '</strong><br><small><strong>O que sustenta:</strong> ' + escapeHTML((h.aFavor || []).filter(Boolean).join(' · ') || 'dados ainda insuficientes') + '.</small>' + contra + '</div>';
    })(r.suspeitaPrincipal) : '';
    var diferenciais = (r.diferenciais || []).map(function (h) {
      var contra = (h.contra || []).length ? '<br><small><strong>Contra:</strong> ' + escapeHTML(h.contra.join(' · ')) + '.</small>' : '';
      var confirmar = (h.aConfirmar || []).length ? '<br><small><strong>Confirmar no exame:</strong> ' + escapeHTML(h.aConfirmar.join(' · ')) + '.</small>' : '';
      return '<div><strong>' + escapeHTML(h.nome) + '</strong><br><small><strong>A favor:</strong> ' + escapeHTML((h.aFavor || []).filter(Boolean).join(' · ') || 'compatibilidade parcial') + '.</small>' + contra + confirmar + '</div>';
    }).join('');
    var lacunas = r.lacunas.length ? '<div><strong>Para decidir melhor no exame:</strong><ul>' + r.lacunas.map(function (x) { return '<li>' + escapeHTML(x) + '</li>'; }).join('') + '</ul></div>' : '';
    lista.innerHTML = alertas +
      (achados ? '<div><strong>Resumo clínico extraído</strong><ul>' + achados + '</ul></div>' : '') +
      (principal ? '<div><strong>Suspeita principal</strong>' + principal + '</div>' : '') +
      (diferenciais ? '<div><strong>Diagnósticos diferenciais a investigar</strong>' + diferenciais + '</div>' : '') +
      lacunas;
    box.dataset.engineVersion = VERSAO_MOTOR_HMA;
    box.dataset.fatos = JSON.stringify({ versao: VERSAO_MOTOR_HMA, local: r.local, eventos: r.eventos || [], eventosClinicos: r.eventosClinicos || [], clausulas: r.clausulas || [], provenienciaSinais: r.provenienciaSinais || {}, negacoesDetectadas: r.negacoesDetectadas || [], topologiaAnatomica:r.topologiaAnatomica||null, conflitosLateralidade:r.conflitosLateralidade||[], sobreposicoesEvidencia: r.sobreposicoesEvidencia || [], sinais: r.sinais || [], achados: r.achados, suspeitaPrincipal: r.suspeitaPrincipal, diferenciais: r.diferenciais, lacunas: r.lacunas, alertas: r.alertas });
  };
})();

/* ========================================================================== 
   KINESYS — SUÍTE DE REGRESSÃO DO MOTOR HMA
   --------------------------------------------------------------------------
   - Não roda automaticamente em produção.
   - Executar no console do navegador: executarRegressaoHMAKineSys()
   - A suíte funciona como especificação clínica executável. Casos que ainda
     falham permanecem visíveis como lacunas a corrigir nas próximas etapas.
   ========================================================================== */
(function instalarRegressaoHMAKineSys(){
  function caso(id, regiao, hma, esperado){
    return Object.freeze({ id:id, regiao:regiao, hma:hma, esperado:Object.freeze(esperado || {}) });
  }

  var CASOS = Object.freeze([
    // CERVICAL / OMBRO / MEMBRO SUPERIOR — 10
    caso('C1','cervical_ombro','Dor cervical que desce pelo braço até o polegar, com dormência e fraqueza.',{
      principalUmDe:['componente radicular'], sinaisIncluem:['cervical','irradiacaoBraco','trajetoAlemCotovelo','neurologico']
    }),
    caso('C2','cervical_ombro','Dor no ombro ao elevar o braço, piora à noite, mas não passa do cotovelo.',{
      principalUmDe:['manguito rotador'], naoDeveIncluir:['componente radicular'], sinaisIncluem:['ombro','elevacaoBraco','noturna','trajetoRestritoOmbro']
    }),
    caso('C2ISO1','cervical_ombro','Dormir encima do braço incomoda.',{
      sinaisIncluem:['decubitoOmbro']
    }),
    caso('C2ISO2','cervical_ombro','Ao deitar sobre o braco piora.',{
      sinaisIncluem:['decubitoOmbro']
    }),
    caso('C2A','cervical_ombro','Dor no ombro e piora ao dormir em cima do braço.',{
      sinaisIncluem:['ombro','decubitoOmbro']
    }),
    caso('C2B','cervical_ombro','Dor no ombro e piora ao deitar encima do braco.',{
      sinaisIncluem:['ombro','decubitoOmbro']
    }),
    caso('C3','cervical_ombro','Dor cervical vai para o ombro, mas não passa do cotovelo e não apresenta formigamento.',{
      qualquerHipoteseInclui:['cervical'], naoDeveIncluir:['tunel do carpo'], sinaisIncluem:['cervical','trajetoRestritoOmbro']
    }),
    caso('C4','cervical_ombro','Quarto e quinto dedos formigam e pioram quando o cotovelo fica dobrado.',{
      principalUmDe:['neuropatia ulnar no cotovelo'], diferenciaisIncluem:['cervical'], naoDeveIncluir:['tunel do carpo'], sinaisIncluem:['nervoUlnar','neurologico']
    }),
    caso('C5','cervical_ombro','Polegar, indicador e dedo médio ficam dormentes à noite e melhora ao sacudir a mão.',{
      principalUmDe:['tunel do carpo'], naoDeveIncluir:['neuropatia ulnar no cotovelo'], sinaisIncluem:['punhoMao','mediano','noturnoMao','alivioSacudirMao','neurologico']
    }),
    caso('C6','cervical_ombro','O braço pesa e a mão formiga quando fica acima da cabeça por algum tempo.',{
      principalUmDe:['desfiladeiro toracico'], diferenciaisIncluem:['cervical'], sinaisIncluem:['desfiladeiroToracico','neurologico']
    }),
    caso('C7','cervical_ombro','Caiu sobre o ombro e desde então não consegue elevar o braço, com fraqueza súbita.',{
      alertasIncluem:['ombro'], qualquerHipoteseInclui:['ruptura traumatica'], sinaisIncluem:['ombro','traumaOmbro','perdaForcaAgudaOmbro']
    }),
    caso('C8','cervical_ombro','O ombro ficou rígido progressivamente, não alcança as costas e piora à noite.',{
      principalUmDe:['capsulite'], diferenciaisIncluem:['manguito'], sinaisIncluem:['ombro','rigidezOmbro','noturna']
    }),
    caso('C9','cervical_ombro','Dor cervical, mãos desajeitadas, deixa objetos cair e está andando desequilibrado.',{
      alertasIncluem:['mielopatia'], sinaisIncluem:['cervical','mielopatia']
    }),
    caso('C10','cervical_ombro','Após colisão traseira apresenta dor cervical e cefaleia desde o acidente.',{
      principalUmDe:['chicote'], sinaisIncluem:['cervical','whiplash']
    }),

    // LOMBAR / QUADRIL — 10
    caso('L1','lombar_quadril','Dor na lombar há cerca de 6 meses, piora ao deitar de lado, irradia para joelho e perna, piora ao evacuar, tossir e espirrar, com dificuldade para fletir o tronco.',{
      principalUmDe:['lombar com componente radicular','lombociatalgia'], diferenciaisIncluem:['trocant'], sinaisIncluem:['lombar','irradiacaoPerna']
    }),
    caso('L2','lombar_quadril','Dor na lateral do quadril que piora ao deitar sobre esse lado e desce pela lateral da coxa até o joelho.',{
      principalUmDe:['trocant'], sinaisIncluem:['lateralQuadril','decubitoLateral','irradiacaoLateralAteJoelhoQuadril']
    }),
    caso('L3','lombar_quadril','Dor profunda na virilha ao agachar e flexionar o quadril, com clique profundo.',{
      principalUmDe:['intra-articular','femoroacetabular'], diferenciaisIncluem:['iliopsoas'], sinaisIncluem:['virilha','quadrilMecanico']
    }),
    caso('L4','lombar_quadril','Paciente de 68 anos com dor na virilha, rigidez após repouso e piora para caminhar.',{
      principalUmDe:['osteoartrose de quadril'], qualquerHipoteseInclui:['quadril'], naoDeveIncluir:['trocant']
    }),
    caso('L5','lombar_quadril','Dor no osso abaixo do glúteo, pior para sentar e correr.',{
      principalUmDe:['isquiotibiais'], qualquerHipoteseInclui:['isquiotibiais'], sinaisIncluem:['isquioProximal']
    }),
    caso('L6','lombar_quadril','Dor unilateral junto à covinha da pelve, piora ao virar na cama e ao subir escada.',{
      principalUmDe:['sacroiliaca','cintura pelvica'], qualquerHipoteseInclui:['sacroiliaca'], sinaisIncluem:['sacroiliaca']
    }),
    caso('L7','lombar_quadril','Dor na perna volta para a lombar quando repete movimentos da coluna.',{
      principalUmDe:['discogenico','resposta direcional'], sinaisIncluem:['lombar','centralizacao']
    }),
    caso('L8','lombar_quadril','Dor lombar desce abaixo do joelho até o pé e formiga o hálux.',{
      principalUmDe:['componente radicular','lombociatalgia'], sinaisIncluem:['lombar','irradiacaoPerna','trajetoAlemJoelhoLombar','dermatomaPeEspecifico','neurologico']
    }),
    caso('L9','lombar_quadril','Lombalgia e dificuldade para urinar desde a adolescência, sem piora recente e sem dormência em sela.',{
      qualquerHipoteseInclui:['lombar'], alertasNaoIncluem:['neurologicos graves'], sinaisIncluem:['lombar']
    }),
    caso('L10','lombar_quadril','Corredor aumentou muito a carga; apresenta dor profunda na virilha, dificuldade para caminhar e dor noturna.',{
      principalUmDe:['estresse do colo femoral'], sinaisIncluem:['virilha','marchaLimitada','noturna']
    }),

    // JOELHO — 10
    caso('J1','joelho','Durante pivô sem contato sentiu estalo; o joelho inchou imediatamente e agora falseia.',{
      principalUmDe:['ligamentar do joelho','lca'], diferenciaisIncluem:['meniscal'], sinaisIncluem:['joelho','derramePrecoceJoelho','instabilidadeJoelho','falseioObjetivoJoelho']
    }),
    caso('J2','joelho','Bateu a parte da frente da tíbia no painel do carro com o joelho flexionado e ficou instável.',{
      qualquerHipoteseInclui:['ligamentar do joelho','lcp'], sinaisIncluem:['joelho','trauma']
    }),
    caso('J3','joelho','Recebeu pancada por fora do joelho, com dor medial e sensação de instabilidade.',{
      principalUmDe:['ligamento colateral medial'], diferenciaisIncluem:['meniscal'], sinaisIncluem:['joelho','ligamentoMedialJoelho']
    }),
    caso('J4','joelho','Após torção apresenta dor na interlinha, joelho inchou horas depois e fica prendendo.',{
      principalUmDe:['meniscal'], diferenciaisIncluem:['ligamentar'], sinaisIncluem:['joelho','torcaoJoelho','linhaArticularJoelho','derrameTardioJoelho','mecanicoJoelho']
    }),
    caso('J5','joelho','Após torção o joelho ficou bloqueado e não consegue estender completamente.',{
      principalUmDe:['meniscal'], sinaisIncluem:['joelho','bloqueioVerdadeiroJoelho','mecanicoJoelho']
    }),
    caso('J6','joelho','Dor ao redor da patela, pior em escadas, agachamento e depois de ficar sentado muito tempo.',{
      principalUmDe:['femoropatelar'], diferenciaisIncluem:['patelar'], sinaisIncluem:['joelho','joelhoAnterior','flexaoJoelhoCarga']
    }),
    caso('J7','joelho','Dor focal abaixo da patela ao saltar e aterrissar.',{
      principalUmDe:['tendinopatia patelar'], diferenciaisIncluem:['femoropatelar'], sinaisIncluem:['joelhoAnterior','salto']
    }),
    caso('J8','joelho','Paciente de 65 anos com joelho rígido após repouso, crepitação e piora para caminhar.',{
      principalUmDe:['osteoartrose de joelho'], qualquerHipoteseInclui:['osteoartrose'], sinaisIncluem:['joelho','rigidez']
    }),
    caso('J9','joelho','Apresenta caroço e sensação de pressão atrás do joelho, com inchaço recorrente.',{
      principalUmDe:['cisto popliteo','derrame posterior'], qualquerHipoteseInclui:['popliteo'], sinaisIncluem:['popliteo']
    }),
    caso('J10','joelho','Dor somente na lateral do joelho durante corrida em descida.',{
      principalUmDe:['banda iliotibial'], naoDeveIncluir:['ligamento colateral medial'], sinaisIncluem:['lateralJoelho']
    }),

    // TORNOZELO / PÉ — 10
    caso('T1','tornozelo_pe','Virou o pé para dentro, com dor lateral no tornozelo e edema.',{
      principalUmDe:['entorse lateral'], diferenciaisIncluem:['fibulares'], sinaisIncluem:['tornozelo','inversao','lateralTornozelo','trauma']
    }),
    caso('T2','tornozelo_pe','Entorse alta do tornozelo, dor acima da articulação e piora com rotação externa do pé.',{
      principalUmDe:['sindesmose'], diferenciaisIncluem:['entorse lateral'], sinaisIncluem:['tornozelo','sindesmose','provocacaoSindesmose']
    }),
    caso('T3','tornozelo_pe','Dor atrás do maléolo lateral e o tendão estala durante o movimento.',{
      principalUmDe:['fibulares'], diferenciaisIncluem:['entorse lateral'], sinaisIncluem:['fibulares','instabilidadeFibulares']
    }),
    caso('T4','tornozelo_pe','Aquiles rígido pela manhã, dói ao correr e melhora depois de aquecer.',{
      principalUmDe:['tendinopatia do aquiles'], naoDeveIncluir:['ruptura'], sinaisIncluem:['posteriorTornozelo','aquilesCarga']
    }),
    caso('T5','tornozelo_pe','Sentiu como uma pedrada atrás do tornozelo e não consegue ficar na ponta do pé.',{
      principalUmDe:['lesao do tendao de aquiles','ruptura'], sinaisIncluem:['posteriorTornozelo','rupturaAquilesAguda']
    }),
    caso('T6','tornozelo_pe','Após entorse apresenta dor óssea na base do quinto metatarso e não dá quatro passos.',{
      alertasIncluem:['fratura de tornozelo','ottawa'], qualquerHipoteseInclui:['fratura'], sinaisIncluem:['dorOsseaTornozelo','incapazQuatroPassos','trauma']
    }),
    caso('T7','tornozelo_pe','Trauma no mediopé, equimose plantar e não consegue apoiar.',{
      alertasIncluem:['lisfranc'], sinaisIncluem:['traumaMediope','lisfranc','sinalEspecificoLisfranc']
    }),
    caso('T8','tornozelo_pe','Corredor aumentou o volume e desenvolveu dor focal no segundo metatarso.',{
      principalUmDe:['estresse do metatarso'], diferenciaisIncluem:['morton'], sinaisIncluem:['metatarsoFocal','carga']
    }),
    caso('T9','tornozelo_pe','Queimação entre o terceiro e quarto dedos, sensação de pedrinha no sapato e piora com sapato apertado.',{
      principalUmDe:['morton'], naoDeveIncluir:['tunel do carpo'], sinaisIncluem:['morton']
    }),
    caso('T10','tornozelo_pe','Dor no arco medial do pé, o arco está caindo e não consegue elevar o calcanhar com uma perna.',{
      principalUmDe:['tibial posterior'], sinaisIncluem:['tibialPosterior','insuficienciaTibialPosterior']
    }),

    // COTOVELO — 5
    caso('E1','cotovelo','Dor na parte de fora do cotovelo ao apertar a mão e carregar objetos.',{
      principalUmDe:['epicondilalgia lateral'], sinaisIncluem:['cotoveloLateral','preensao']
    }),
    caso('E2','cotovelo','Dor medial no cotovelo ao flexionar o punho e pronar, sem formigamento.',{
      principalUmDe:['epicondilalgia medial'], naoDeveIncluir:['neuropatia ulnar no cotovelo'], sinaisIncluem:['cotoveloMedial']
    }),
    caso('E3','cotovelo','Quarto e quinto dedos formigam quando apoia o cotovelo ou mantém ele dobrado.',{
      principalUmDe:['neuropatia ulnar no cotovelo'], diferenciaisIncluem:['cervical'], sinaisIncluem:['nervoUlnar','neurologico']
    }),
    caso('E4','cotovelo','O pescoço dói e o quinto dedo formiga, mas dobrar ou apoiar o cotovelo não modifica os sintomas.',{
      principalUmDe:['componente radicular'], diferenciaisIncluem:['ulnar'], sinaisIncluem:['cervical','neurologico']
    }),
    caso('E5','cotovelo','Dor profunda na parte lateral proximal do antebraço ao supinar, com pouco desconforto sobre o epicôndilo.',{
      qualquerHipoteseInclui:['tunel radial','interosseo posterior'], diferenciaisIncluem:['epicondilalgia lateral']
    }),

    // PUNHO / MÃO — 5
    caso('P1','punho_mao','A mão adormece à noite nos três primeiros dedos e melhora ao sacudir a mão.',{
      principalUmDe:['tunel do carpo'], naoDeveIncluir:['neuropatia ulnar'], sinaisIncluem:['punhoMao','mediano','noturnoMao','alivioSacudirMao']
    }),
    caso('P2','punho_mao','Dor radial na base do polegar ao carregar o bebê.',{
      principalUmDe:['de quervain'], qualquerHipoteseInclui:['de quervain'], sinaisIncluem:['punhoMao','polegarRadial']
    }),
    caso('P3','punho_mao','Dor ulnar no punho, com clique ao rodar e dor ao apoiar a mão.',{
      principalUmDe:['fibrocartilaginoso triangular'], sinaisIncluem:['punhoMao','punhoUlnar','mecanicoPunhoUlnar']
    }),
    caso('P4','punho_mao','Quarto e quinto dedos dormem ao pedalar apoiando o punho; mexer ou apoiar o cotovelo não interfere.',{
      qualquerHipoteseInclui:['guyon'], diferenciaisIncluem:['cervical','ulnar']
    }),
    caso('P5','punho_mao','Caiu sobre a mão estendida e apresenta dor forte na tabaqueira anatômica.',{
      alertasIncluem:['escafoide'], qualquerHipoteseInclui:['escafoide']
    }),

    // TORÁCICA — 5
    caso('R1','toracica','Dor entre as escápulas reproduzida ao girar o tronco, sem falta de ar.',{
      principalUmDe:['toracica musculoesqueletica','costal'], alertasNaoIncluem:['cardiorrespiratorios'], sinaisIncluem:['toracica']
    }),
    caso('R2','toracica','Dor no peito ao respirar fundo acompanhada de falta de ar.',{
      alertasIncluem:['cardiorrespiratorios'], sinaisIncluem:['cardiopulmonar']
    }),
    caso('R3','toracica','Paciente idosa com osteoporose caiu da própria altura e ficou com dor focal na coluna torácica.',{
      alertasIncluem:['fratura vertebral'], qualquerHipoteseInclui:['fratura vertebral'], sinaisIncluem:['toracica','riscoFratura','trauma']
    }),
    caso('R4','toracica','Queimação em faixa de um lado do tórax e depois surgiram pequenas vesículas na pele.',{
      qualquerHipoteseInclui:['herpes','zoster']
    }),
    caso('R5','toracica','Dor torácica pior ao tossir, com febre persistente e mal-estar.',{
      alertasIncluem:['sistemicos','cardiorrespiratorios'], sinaisIncluem:['toracica','sistemico']
    })
  ]);

  function norm(v){
    return String(v == null ? '' : v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
  }
  function contem(haystack, needle){
    var h=norm(haystack), n=norm(needle);
    return !!n && h.indexOf(n)>=0;
  }
  function nomesResultado(r){
    var nomes=[];
    if(r && r.suspeitaPrincipal && r.suspeitaPrincipal.nome) nomes.push(r.suspeitaPrincipal.nome);
    (r && r.diferenciais || []).forEach(function(h){ if(h && h.nome) nomes.push(h.nome); });
    (r && r.alertas || []).forEach(function(h){ if(h && h.nome) nomes.push(h.nome); });
    return nomes;
  }
  function algumNomeInclui(nomes, termo){ return nomes.some(function(n){ return contem(n, termo); }); }
  function avaliarCaso(c){
    var falhas=[];
    var r;
    try { r=window.analisarHMAClinicaKineSys(c.hma); }
    catch(err){ return { id:c.id, regiao:c.regiao, hma:c.hma, passou:false, erroExecucao:String(err && err.stack || err), falhas:['erro de execução'] }; }
    var e=c.esperado || {};
    var principal=r && r.suspeitaPrincipal && r.suspeitaPrincipal.nome || '';
    var difs=(r && r.diferenciais || []).map(function(x){return x.nome||'';});
    var alertas=(r && r.alertas || []).map(function(x){return x.nome||'';});
    var sinais=(r && r.sinais || []);
    var todosNomes=nomesResultado(r);

    if(e.principalUmDe && e.principalUmDe.length && !e.principalUmDe.some(function(x){return contem(principal,x);})){
      falhas.push('principal esperado: '+e.principalUmDe.join(' OU ')+' | obtido: '+(principal||'nenhum'));
    }
    (e.diferenciaisIncluem||[]).forEach(function(x){ if(!algumNomeInclui(difs,x)) falhas.push('diferencial ausente: '+x); });
    (e.qualquerHipoteseInclui||[]).forEach(function(x){ if(!algumNomeInclui(todosNomes,x)) falhas.push('hipótese/alerta ausente: '+x); });
    (e.naoDeveIncluir||[]).forEach(function(x){ if(algumNomeInclui(todosNomes,x)) falhas.push('hipótese indevida: '+x); });
    (e.alertasIncluem||[]).forEach(function(x){ if(!algumNomeInclui(alertas,x)) falhas.push('alerta ausente: '+x); });
    (e.alertasNaoIncluem||[]).forEach(function(x){ if(algumNomeInclui(alertas,x)) falhas.push('alerta indevido: '+x); });
    (e.sinaisIncluem||[]).forEach(function(x){ if(sinais.indexOf(x)<0) falhas.push('sinal ausente: '+x); });

    return {
      id:c.id, regiao:c.regiao, hma:c.hma, passou:falhas.length===0, falhas:falhas,
      principal:principal || null, diferenciais:difs, alertas:alertas, sinais:sinais
    };
  }

  window.KINESYS_HMA_REGRESSION_CASES = CASOS;

  window.executarAuditoriaProvenienciaHMAKineSys = function(opcoes){
    opcoes=opcoes||{};
    var testes=[
      {id:'PV1',hma:'Dor no ombro sem febre e piora ao elevar o braço.',validar:function(r){return r.sinais.indexOf('ombro')>=0&&r.sinais.indexOf('elevacaoBraco')>=0&&r.sinais.indexOf('sistemico')<0;},descricao:'negação distante não contamina achado mecânico'},
      {id:'PV2',hma:'Dor no ombro, mas não apresenta formigamento na mão.',validar:function(r){return r.sinais.indexOf('ombro')>=0&&r.sinais.indexOf('neurologico')<0&&(r.negacoesDetectadas||[]).some(function(x){return x.conceito==='neurologico';});},descricao:'negação verdadeira é preservada como fato negado'},
      {id:'PV3',hma:'Após torção o joelho ficou bloqueado e não consegue estender completamente.',validar:function(r){return r.sinais.indexOf('bloqueioVerdadeiroJoelho')>=0&&(r.provenienciaSinais?.bloqueioVerdadeiroJoelho||[]).length>0;},descricao:'não consegue continua sendo incapacidade positiva'},
      {id:'PV4',hma:'Dor no joelho. O joelho inchou horas depois.',validar:function(r){var a=r.provenienciaSinais?.joelho||[],b=r.provenienciaSinais?.derrameTardioJoelho||[];return a.length>0&&b.length>0&&a[0].clausulaId!==b[0].clausulaId;},descricao:'achados mantêm cláusula de origem distinta'},
      {id:'PV5',hma:'Dor no ombro que desce para o cotovelo e vai para a mão.',validar:function(r){return r.sinais.indexOf('trajetoAlemCotovelo')>=0&&(r.provenienciaSinais?.trajetoAlemCotovelo||[]).some(function(x){return x.fonte==='topologia';});},descricao:'sinal sintético de trajeto registra fonte topológica'}
    ];
    var resultados=testes.map(function(t){var r,erro='';try{r=window.analisarHMAClinicaKineSys(t.hma);}catch(e){erro=String(e&&e.stack||e);}var passou=!erro&&!!t.validar(r||{});return{id:t.id,descricao:t.descricao,hma:t.hma,passou:passou,erro:erro,clausulas:r?.clausulas||[],negacoes:r?.negacoesDetectadas||[],sobreposicoes:r?.sobreposicoesEvidencia||[]};});
    var resumo={versao:window.KINESYS_HMA_ENGINE_VERSION||'6.2-core-unico',total:resultados.length,passou:resultados.filter(function(x){return x.passou;}).length};resumo.falhou=resumo.total-resumo.passou;
    if(opcoes.console!==false&&typeof console!=='undefined'){console.group('KineSys — auditoria de proveniência HMA');console.log('Resumo:',resumo);if(typeof console.table==='function')console.table(resultados.map(function(x){return{id:x.id,passou:x.passou,descricao:x.descricao};}));console.groupEnd();}
    return{resumo:resumo,resultados:resultados};
  };

  window.executarRegressaoHMAKineSys = function(opcoes){
    opcoes=opcoes||{};
    if(typeof window.analisarHMAClinicaKineSys!=='function') throw new Error('KineSys: analisarHMAClinicaKineSys não está disponível.');
    var resultados=CASOS.map(avaliarCaso);
    var falhas=resultados.filter(function(x){return !x.passou;});
    var porRegiao={};
    resultados.forEach(function(x){
      if(!porRegiao[x.regiao]) porRegiao[x.regiao]={total:0,passou:0,falhou:0};
      porRegiao[x.regiao].total++;
      if(x.passou) porRegiao[x.regiao].passou++; else porRegiao[x.regiao].falhou++;
    });
    var resumo={
      versao:window.KINESYS_HMA_ENGINE_VERSION||'6.2-core-unico', total:resultados.length,
      passou:resultados.length-falhas.length, falhou:falhas.length,
      taxa:resultados.length?Math.round(((resultados.length-falhas.length)/resultados.length)*1000)/10:0,
      porRegiao:porRegiao
    };
    if(opcoes.console!==false && typeof console!=='undefined'){
      console.group('KineSys — regressão clínica HMA');
      console.log('Resumo:',resumo);
      if(typeof console.table==='function') console.table(resultados.map(function(x){return {id:x.id,regiao:x.regiao,passou:x.passou,principal:x.principal||'',falhas:(x.falhas||[]).join(' | ')};}));
      if(falhas.length){ console.group('Falhas clínicas / lacunas atuais'); falhas.forEach(function(x){console.warn(x.id,x.hma,x.falhas);}); console.groupEnd(); }
      console.groupEnd();
    }
    return { resumo:resumo, resultados:resultados, falhas:falhas };
  };
})();


/* ================= AUDITORIA DE TOPOLOGIA E LATERALIDADE ================= */
(function instalarAuditoriaTopologiaEtapa4(){
  window.executarAuditoriaTopologiaHMAKineSys=function(opcoes){
    opcoes=opcoes||{};
    var testes=[
      {id:'TP1',hma:'Dor cervical direita que desce pelo braço até o polegar direito.',validar:function(r){var t=r.topologiaAnatomica;return r.sinais.includes('irradiacaoBraco')&&r.sinais.includes('trajetoAlemCotovelo')&&(t?.trajetosSegmentados||[]).some(function(x){return !x.conflitoLateralidade&&x.segmentos.some(function(s){return s.segmento==='dedos_mao';});});},descricao:'cadeia cervical → braço → dedo é reconhecida'},
      {id:'TP2',hma:'Dor no ombro direito que vai para a mão esquerda.',validar:function(r){return (r.conflitosLateralidade||[]).length>0&&!((r.provenienciaSinais?.trajetoAlemCotovelo||[]).some(function(p){return p.fonte==='topologia';}));},descricao:'lados opostos não formam trajeto topológico'},
      {id:'TP3',hma:'Dor lombar esquerda que desce pela coxa, passa do joelho e chega ao pé esquerdo.',validar:function(r){var t=r.topologiaAnatomica;return r.sinais.includes('irradiacaoPerna')&&r.sinais.includes('trajetoAlemJoelhoLombar')&&(t?.trajetosSegmentados||[]).some(function(x){return !x.conflitoLateralidade&&x.segmentos.some(function(s){return s.segmento==='pe';});});},descricao:'cadeia lombar → coxa → joelho → pé é reconhecida'},
      {id:'TP4',hma:'Dor do lado de fora do quadril direito que desce pela lateral da coxa até o joelho direito.',validar:function(r){return r.sinais.includes('irradiacaoLateralAteJoelhoQuadril')&&(r.topologiaAnatomica?.trajetosSegmentados||[]).some(function(x){return x.segmentos.some(function(s){return s.segmento==='coxa_lateral';});});},descricao:'trajeto lateral de quadril preserva subtipo da coxa'},
      {id:'TP5',hma:'Dor no ombro direito. A mão esquerda adormece à noite.',validar:function(r){return !(r.topologiaAnatomica?.pares||[]).some(function(p){return p.origemSegmento==='ombro'&&p.destinoSegmento==='mao';});},descricao:'menções separadas sem verbo de propagação não viram trajeto'},
      {id:'TP6',hma:'Dor no ombro direito que desce para o cotovelo e antebraço.',validar:function(r){var tr=(r.topologiaAnatomica?.trajetosSegmentados||[])[0];return !!tr&&tr.segmentos.slice(1).every(function(s){return s.ladoEfetivo==='direita';});},descricao:'lado explícito proximal é herdado por destinos sem lado explícito'},
      {id:'TP7',hma:'Dor lombar que desce abaixo do joelho até o pé.',validar:function(r){return r.sinais.includes('trajetoAlemJoelhoLombar')&&r.sinais.includes('irradiacaoPerna');},descricao:'expressão abaixo do joelho até o pé gera extensão distal correta'}
    ];
    var resultados=testes.map(function(t){var r,erro='';try{r=window.analisarHMAClinicaKineSys(t.hma);}catch(e){erro=String(e&&e.stack||e);}var passou=!erro&&!!t.validar(r||{});return{id:t.id,descricao:t.descricao,hma:t.hma,passou:passou,erro:erro,topologia:r?.topologiaAnatomica||null,sinais:r?.sinais||[]};});
    var resumo={versao:window.KINESYS_HMA_ENGINE_VERSION||'6.2-core-unico',total:resultados.length,passou:resultados.filter(function(x){return x.passou;}).length};resumo.falhou=resumo.total-resumo.passou;
    if(opcoes.console!==false&&typeof console!=='undefined'){console.group('KineSys — auditoria topologia/lateralidade HMA');console.log('Resumo:',resumo);if(typeof console.table==='function')console.table(resultados.map(function(x){return{id:x.id,passou:x.passou,descricao:x.descricao};}));console.groupEnd();}
    return{resumo:resumo,resultados:resultados};
  };
})();


/* ================= AUDITORIA DE SCORE / CONTEXTO / DUPLA CONTAGEM ================= */
(function instalarAuditoriaScoreEtapa5(){
  window.executarAuditoriaScoreHMAKineSys=function(opcoes){
    opcoes=opcoes||{};
    function normScore(v){return String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();}
    function perfil(texto, trechoNome){
      var lista=window.inspecionarScoreHMAKineSys(texto);
      var alvo=normScore(trechoNome);
      return lista.find(function(x){return normScore(x.nome).indexOf(alvo)>=0;})||null;
    }
    var testes=[
      {id:'SC1',descricao:'carga de outra região não favorece ombro',validar:function(){
        var p=perfil('Dor no ombro ao elevar o braço. Caminhar piora o joelho.','manguito rotador');
        return !!p&&p.suprimidasContexto.indexOf('carga')>=0&&p.aFavor.indexOf('elevacaoBraco')>=0;
      }},
      {id:'SC2',descricao:'carga em cláusula compatível continua contando',validar:function(){
        var p=perfil('Dor no ombro. Piora ao levantar peso.','manguito rotador');
        return !!p&&p.aFavor.indexOf('carga')>=0&&p.suprimidasContexto.indexOf('carga')<0;
      }},
      {id:'SC3',descricao:'mesmo termo global duplicado sofre penalidade só na ordenação',validar:function(){
        var p=perfil('Dor ulnar no punho após impacto no punho.','fibrocartilaginoso triangular');
        return !!p&&p.scoreContextual===p.scoreBrutoGlobal&&p.penalidadeDuplicidade>0&&p.scoreAjustado<p.scoreContextual;
      }},
      {id:'SC4',descricao:'achado específico continua aditivo ao geral',validar:function(){
        var p=perfil('Dor cervical que desce pelo braço e passa do cotovelo até a mão, com dormência.','componente radicular');
        return !!p&&p.aFavor.indexOf('irradiacaoBraco')>=0&&p.aFavor.indexOf('trajetoAlemCotovelo')>=0&&p.penalidadeDuplicidade===0;
      }},
      {id:'SC5',descricao:'suporte normalizado aumenta com padrão mais completo do mesmo perfil',validar:function(){
        var a=perfil('Dor cervical que irradia para o braço.','componente radicular');
        var b=perfil('Dor cervical que irradia para o braço, passa do cotovelo até a mão, com dormência e piora ao mexer o pescoço.','componente radicular');
        return !!a&&!!b&&b.suporteNormalizado>a.suporteNormalizado;
      }},
      {id:'SC6',descricao:'comportamento em cláusula seguinte herda região inequívoca adjacente',validar:function(){
        var p=perfil('Dor no ombro. Piora ao levantar peso.','manguito rotador');
        return !!p&&p.aFavor.indexOf('carga')>=0;
      }}
    ];
    var resultados=testes.map(function(t){var erro='',passou=false;try{passou=!!t.validar();}catch(e){erro=String(e&&e.stack||e);}return{id:t.id,descricao:t.descricao,passou:passou,erro:erro};});
    var resumo={versao:window.KINESYS_HMA_ENGINE_VERSION||'6.2-core-unico',total:resultados.length,passou:resultados.filter(function(x){return x.passou;}).length};resumo.falhou=resumo.total-resumo.passou;
    if(opcoes.console!==false&&typeof console!=='undefined'){console.group('KineSys — auditoria de score HMA');console.log('Resumo:',resumo);if(typeof console.table==='function')console.table(resultados);console.groupEnd();}
    return{resumo:resumo,resultados:resultados};
  };
})();


/* ================= AUDITORIA DE DIAGNÓSTICOS DIFERENCIAIS — ETAPA 7 =================
   Especificação executável da matriz de diferenciais. Não roda em produção. */
(function instalarAuditoriaDiferenciaisEtapa7(){
  window.executarAuditoriaDiferenciaisHMAKineSys=function(opcoes){
    opcoes=opcoes||{};
    function n(v){return String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();}
    function lista(r){return [r?.suspeitaPrincipal?.nome||''].concat((r?.diferenciais||[]).map(function(x){return x.nome||'';}));}
    function tem(r,trecho){var q=n(trecho);return lista(r).some(function(x){return n(x).indexOf(q)>=0;});}
    function diff(r,trecho){var q=n(trecho);return (r?.diferenciais||[]).some(function(x){return n(x.nome||'').indexOf(q)>=0;});}
    var pares=[
      ['D01','Dor cervical que irradia para o braço e a mão formiga quando mantém o braço elevado acima da cabeça.','componente radicular','desfiladeiro toracico'],
      ['D02','Dor cervical que vai para o ombro e trapézio, não passa do cotovelo e possui ponto doloroso no trapézio.','cervical','cervicobraquialgia'],
      ['D03','Dor no ombro ao elevar o braço, ficando progressivamente rígido e com rotação do ombro limitada.','manguito','capsulite'],
      ['D04','Dor localizada no topo do ombro ao cruzar o braço e piora ao elevar o braço com peso.','acromioclavicular','manguito'],
      ['D05','Formigamento no polegar, indicador e médio, pior à noite, associado a dor cervical ocasional.','tunel do carpo','componente radicular'],
      ['D06','Dor ulnar no punho com clique ao girar e formigamento no quarto e quinto dedos ao apoiar a mão no guidão.','fibrocartilaginoso triangular','guyon'],
      ['D07','Dor medial no cotovelo ao fazer força de preensão e formigamento no quinto dedo quando mantém o cotovelo dobrado.','neuropatia ulnar no cotovelo','epicondilalgia medial'],
      ['D08','Dor lateral no cotovelo ao apertar objetos e dor profunda no antebraço durante supinação.','epicondilalgia lateral','tunel radial'],
      ['D09','Dor lombar com centralização dos sintomas ao repetir movimentos e ocasionalmente desce para a perna.','discogenico','lombociatalgia'],
      ['D10','Dor lombar pior em extensão e rotação, mas caminhar por muito tempo gera peso nas pernas e melhora ao sentar.','claudicacao neurogenica','facetario'],
      ['D11','Dor lombar e dor junto à covinha da pelve, pior ao virar na cama.','sacroiliaca','lombar'],
      ['D12','Dor lombar e também dor lateral no quadril ao deitar sobre o lado doloroso.','trocant','lombar'],
      ['D13','Dor profunda na virilha ao flexionar o quadril e dor dos adutores ao apertar as pernas.','intra-articular','adutores'],
      ['D14','Dor profunda na virilha ao caminhar, rigidez após repouso e clique ao flexionar o quadril.','osteoartrose de quadril','intra-articular'],
      ['D15','Corredor com dor profunda na virilha, dor noturna, dificuldade para caminhar e dor ao contrair adutores.','estresse do colo femoral','adutores'],
      ['D16','Dor abaixo do glúteo ao sentar, associada a dor lombar que desce pela posterior da coxa.','lombociatalgia','isquiotibiais'],
      ['D17','Após torção do joelho houve dor na interlinha medial e dor do ligamento medial após pancada em valgo.','meniscal','ligamento colateral medial'],
      ['D18','Dor lateral do joelho na corrida em descida com sensação de instabilidade após trauma em varo.','ligamento colateral lateral','banda iliotibial'],
      ['D19','Dor anterior no joelho e dor em escada, com dor focal abaixo da patela durante saltos.','femoropatelar','tendinopatia patelar'],
      ['D20','Joelho rígido após repouso, inchaço recorrente e pressão atrás do joelho.','osteoartrose de joelho','cisto popliteo'],
      ['D21','Torção do joelho com edema precoce, falseio e sensação de travamento.','ligamentar do joelho','meniscal'],
      ['D22','Trauma anterior da tíbia com joelho flexionado e dor na interlinha após torção associada.','lcp','meniscal'],
      ['D23','Entorse lateral com dor acima do tornozelo e piora na rotação externa.','sindesmose','entorse lateral'],
      ['D24','Após inversão há dor lateral no tornozelo e estalo atrás do maléolo lateral.','entorse lateral','fibulares'],
      ['D25','Dor no Aquiles pela manhã e ao correr; depois sentiu estalo atrás do tornozelo e perda de impulsão.','lesao do tendao de aquiles','tendinopatia do aquiles'],
      ['D26','Dor focal no segundo metatarso com carga e também queimação entre terceiro e quarto dedos em sapato apertado.','estresse do metatarso','morton'],
      ['D27','Dor medial da tíbia durante corrida, com pequeno ponto ósseo doloroso e dor noturna.','estresse da tibia','estresse tibial medial'],
      ['D28','Dor e tensão na perna durante corrida com formigamento, além de sensibilidade na borda medial da tíbia.','compartimental','estresse tibial medial'],
      ['D29','Dor no calcanhar nos primeiros passos e dor no arco medial com dificuldade para elevar o calcanhar.','tibial posterior','fasciopatia plantar'],
      ['D30','Tornozelo rígido e doloroso ao caminhar anos após trauma; o Aquiles fica rígido pela manhã e dói ao correr.','osteoartrose talocrural','tendinopatia do aquiles']
    ];
    var negativos=[
      ['N01','Queimação entre terceiro e quarto dedos do pé em sapato apertado.','componente radicular'],
      ['N02','Formigamento na perna durante corrida, sem dor cervical ou sintomas nos braços.','componente radicular'],
      ['N03','Dor anterior no joelho ao subir escada.','tunel do carpo'],
      ['N04','Dor no ombro ao elevar o braço, sem dor lombar.','lombociatalgia'],
      ['N05','Dor ulnar no punho com clique ao girar.','lesao meniscal'],
      ['N06','Dormência na mão à noite nos três primeiros dedos, melhora ao sacudir.','claudicacao neurogenica'],
      ['N07','Formigamento no quinto dedo do pé após corrida.','neuropatia ulnar no cotovelo'],
      ['N08','Entorse de tornozelo após pisar em falso.','chicote']
    ];
    var resultados=pares.map(function(c){var r,erro='',passou=false;try{r=window.analisarHMAClinicaKineSys(c[1]);passou=tem(r,c[2])&&tem(r,c[3])&&(diff(r,c[2])||diff(r,c[3]));}catch(e){erro=String(e&&e.stack||e);}return{id:c[0],tipo:'par',hma:c[1],esperadoA:c[2],esperadoB:c[3],passou:passou,principal:r?.suspeitaPrincipal?.nome||'',diferenciais:(r?.diferenciais||[]).map(function(x){return x.nome;}),erro:erro};});
    negativos.forEach(function(c){var r,erro='',passou=false;try{r=window.analisarHMAClinicaKineSys(c[1]);passou=!tem(r,c[2]);}catch(e){erro=String(e&&e.stack||e);}resultados.push({id:c[0],tipo:'negativo',hma:c[1],naoDeve:c[2],passou:passou,principal:r?.suspeitaPrincipal?.nome||'',diferenciais:(r?.diferenciais||[]).map(function(x){return x.nome;}),erro:erro});});
    var passou=resultados.filter(function(x){return x.passou;}).length;
    var resumo={versao:window.KINESYS_HMA_ENGINE_VERSION||'7.0-diferenciais-ampliados',total:resultados.length,passou:passou,falhou:resultados.length-passou,taxa:Math.round(passou/resultados.length*1000)/10};
    if(opcoes.console!==false&&typeof console!=='undefined'){console.group('KineSys — auditoria de diferenciais HMA');console.log('Resumo:',resumo);if(typeof console.table==='function')console.table(resultados.map(function(x){return{id:x.id,tipo:x.tipo,passou:x.passou,principal:x.principal};}));console.groupEnd();}
    return{resumo:resumo,resultados:resultados};
  };
})();

/* ================= AUDITORIA DO SAFETY ENGINE ================= */
(function instalarAuditoriaSafetyEtapa6(){
  window.executarRegressaoCriticaRadicularOmbroKineSys=function(){
    var casos=[
      {id:'CR1',hma:'Dor na cervical que desce até a mão, apresenta dormência e perda de força no braço. Iniciou após carregar uma caixa, durante o trabalho. piora principalmente ao movimentar o ombro',validar:function(r){return /componente radicular/i.test(r?.suspeitaPrincipal?.nome||'')&&r.local==='cervical'&&(r.sinais||[]).includes('neurologico')&&(r.sinais||[]).includes('trajetoAlemCotovelo')&&(r.diferenciais||[]).some(function(x){return /ombro/i.test(x.nome);});}},
      {id:'CR2',hma:'Dor cervical que vai até a mão com dormência, mas mexer o ombro piora a dor.',validar:function(r){return /componente radicular/i.test(r?.suspeitaPrincipal?.nome||'')&&(r.diferenciais||[]).some(function(x){return /ombro/i.test(x.nome);});}},
      {id:'CR3',hma:'Dor no ombro que piora ao movimentar o ombro, não passa do cotovelo e não apresenta dormência.',validar:function(r){return /ombro/i.test(r?.suspeitaPrincipal?.nome||'')&&!/componente radicular/i.test(r?.suspeitaPrincipal?.nome||'');}},
      {id:'CR4',hma:'Dor cervical desce até a mão com dormência, mas mexer o ombro não modifica os sintomas.',validar:function(r){return /componente radicular/i.test(r?.suspeitaPrincipal?.nome||'')&&!(r.sinais||[]).includes('provocacaoOmbro');}},
      {id:'CR5',hma:'Dor no ombro direito. A mão esquerda fica dormente à noite.',validar:function(r){return !/componente radicular/i.test(r?.suspeitaPrincipal?.nome||'');}}
    ];
    var resultados=casos.map(function(c){var r,erro='';try{r=window.analisarHMAClinicaKineSys(c.hma);}catch(e){erro=String(e&&e.stack||e);}var passou=!erro&&!!c.validar(r||{});return{id:c.id,passou:passou,hma:c.hma,principal:r?.suspeitaPrincipal?.nome||'',diferenciais:(r?.diferenciais||[]).map(function(x){return x.nome;}),sinais:r?.sinais||[],erro:erro};});
    var passou=resultados.filter(function(x){return x.passou;}).length;
    return {resumo:{versao:window.KINESYS_HMA_ENGINE_VERSION||'6.2-core-unico',total:resultados.length,passou:passou,falhou:resultados.length-passou,taxa:Math.round(passou/resultados.length*1000)/10},resultados:resultados};
  };

  window.executarAuditoriaSafetyHMAKineSys=function(opcoes){
    opcoes=opcoes||{};
    function norm(v){return String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();}
    function nomes(r){return (r?.alertas||[]).map(function(x){return x.nome||'';});}
    function tem(lista,trecho){var q=norm(trecho);return (lista||[]).some(function(x){return norm(x).indexOf(q)>=0;});}
    var testes=[
      {id:'SF1',descricao:'dificuldade urinária crônica isolada não gera cauda equina',hma:'Dor lombar com dificuldade para urinar há muitos anos, sem anestesia em sela e sem perda de controle urinário.',validar:function(r){return !tem(nomes(r),'neurologicos graves')&&r.sinais.includes('alteracaoUrinaria')&&!r.sinais.includes('caudaEquina');}},
      {id:'SF2',descricao:'retenção aguda + sela em lombalgia gera alerta neurológico urgente',hma:'Dor lombar intensa com retenção urinária aguda e anestesia em sela.',validar:function(r){return tem(nomes(r),'neurologicos graves')&&r.sinais.includes('caudaEquina');}},
      {id:'SF3',descricao:'febre baixa inespecífica não vira alerta sistêmico maior',hma:'Dor no joelho e febre baixa ontem durante quadro gripal, sem calor ou inchaço articular.',validar:function(r){return !tem(nomes(r),'sistemicos associados')&&!r.sinais.includes('sistemicoAltoRisco');}},
      {id:'SF4',descricao:'dor torácica + tosse + febre persistente gera safety respiratório e sistêmico',hma:'Dor torácica pior ao tossir, febre persistente e mal-estar.',validar:function(r){var n=nomes(r);return tem(n,'cardiorrespiratorios infecciosos')&&tem(n,'sistemicos associados');}},
      {id:'SF5',descricao:'dor torácica mecanicamente reproduzível sem dispneia não gera alerta cardiopulmonar',hma:'Dor entre as escápulas reproduzida ao girar o tronco, sem falta de ar.',validar:function(r){return !tem(nomes(r),'cardiorrespiratorios')&&!!r.suspeitaPrincipal&&norm(r.suspeitaPrincipal.nome).indexOf('toracica')>=0;}},
      {id:'SF6',descricao:'FOOSH + tabaqueira anatômica gera alerta de escafoide',hma:'Caiu sobre a mão estendida e apresenta dor forte na tabaqueira anatômica.',validar:function(r){return tem(nomes(r),'escafoide');}},
      {id:'SF7',descricao:'Ottawa do pé funciona sem exigir a palavra tornozelo',hma:'Após entorse apresenta dor óssea na base do quinto metatarso e não dá quatro passos.',validar:function(r){return tem(nomes(r),'fratura de tornozelo')&&r.sinais.includes('dorOsseaTornozelo')&&r.sinais.includes('incapazQuatroPassos');}},
      {id:'SF8',descricao:'dor torácica com dispneia/opressão permanece alerta cardiorrespiratório',hma:'Dor torácica com falta de ar e aperto no peito.',validar:function(r){return tem(nomes(r),'cardiorrespiratorios');}}
    ];
    var resultados=testes.map(function(t){var r,erro='',passou=false;try{r=window.analisarHMAClinicaKineSys(t.hma);passou=!!t.validar(r||{});}catch(e){erro=String(e&&e.stack||e);}return{id:t.id,descricao:t.descricao,hma:t.hma,passou:passou,erro:erro,alertas:r?.alertas||[],sinais:r?.sinais||[]};});
    var resumo={versao:window.KINESYS_HMA_ENGINE_VERSION||'6.2-core-unico',total:resultados.length,passou:resultados.filter(function(x){return x.passou;}).length};resumo.falhou=resumo.total-resumo.passou;
    if(opcoes.console!==false&&typeof console!=='undefined'){console.group('KineSys — auditoria Safety Engine HMA');console.log('Resumo:',resumo);if(typeof console.table==='function')console.table(resultados.map(function(x){return{id:x.id,passou:x.passou,descricao:x.descricao};}));console.groupEnd();}
    return{resumo:resumo,resultados:resultados};
  };
})();

/* ========================================================================== 
   KINESYS — AUDITORIA DE REPERTÓRIO CLÍNICO — ETAPA 8
   --------------------------------------------------------------------------
   Testes somente de desenvolvimento. Não executam automaticamente em produção.
   Objetivo: validar novos perfis e negativos que impedem sobre-diagnóstico.
   ========================================================================== */
(function instalarAuditoriaRepertorioEtapa8HMAKineSys(){
  function norm(v){return String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();}
  function nomes(r){return [r?.suspeitaPrincipal?.nome||''].concat((r?.diferenciais||[]).map(function(x){return x.nome||'';}),(r?.alertas||[]).map(function(x){return x.nome||'';}));}
  function tem(r,q){var n=norm(q);return nomes(r).some(function(x){return norm(x).indexOf(n)>=0;});}
  function principal(r,q){return norm(r?.suspeitaPrincipal?.nome||'').indexOf(norm(q))>=0;}
  function alerta(r,q){return (r?.alertas||[]).some(function(x){return norm(x.nome).indexOf(norm(q))>=0;});}
  function sinal(r,q){return (r?.sinais||[]).indexOf(q)>=0;}
  function diff(r,q){return (r?.diferenciais||[]).some(function(x){return norm(x.nome).indexOf(norm(q))>=0;});}

  var CASOS=[
    ['E801','Dor na articulação da base do polegar, pior ao abrir pote e fazer pinça.',function(r){return principal(r,'osteoartrose cmc')&&diff(r,'de quervain')&&!tem(r,'tunel do carpo')&&sinal(r,'cmcPolegar')&&!sinal(r,'mediano');}],
    ['E802','Dor radial perto do estiloide ao mover o polegar e ao segurar bebê.',function(r){return principal(r,'de quervain')&&!tem(r,'osteoartrose cmc');}],
    ['E803','Polegar, indicador e dedo médio ficam dormentes à noite e melhora ao sacudir a mão.',function(r){return principal(r,'tunel do carpo')&&sinal(r,'mediano')&&!tem(r,'osteoartrose cmc');}],
    ['E804','A patela saiu do lugar durante o jogo, voltou e o joelho inchou.',function(r){return principal(r,'instabilidade / luxacao patelar')&&sinal(r,'instabilidadePatelar');}],
    ['E805','Dor ao redor da patela em escadas e agachamento, sem episódios de a patela sair do lugar.',function(r){return principal(r,'femoropatelar')&&!tem(r,'luxacao patelar');}],
    ['E806','Pivô sem contato com estalo no joelho, inchou imediatamente e agora falseia.',function(r){return principal(r,'lca')&&diff(r,'meniscal')&&sinal(r,'padraoLCA');}],
    ['E807','Bateu a parte da frente da tíbia no painel do carro com o joelho flexionado e ficou instável.',function(r){return principal(r,'lcp')&&tem(r,'ligamentar do joelho');}],
    ['E808','Após salto sentiu estalo na frente do joelho e não consegue levantar a perna reta.',function(r){return alerta(r,'mecanismo extensor')&&sinal(r,'incapacidadeExtensaoAtivaJoelho')&&sinal(r,'rupturaMecanismoExtensorJoelho');}],
    ['E809','Dor anterior no joelho ao agachar, mas consegue estender o joelho normalmente.',function(r){return !alerta(r,'mecanismo extensor');}],
    ['E810','Dor profunda no ombro com crepitação, ombro rígido e perda progressiva de rotação.',function(r){return principal(r,'osteoartrose glenoumeral')&&diff(r,'capsulite')&&sinal(r,'artroseGlenoumeral');}],
    ['E811','Ombro ficou rígido progressivamente, não alcança as costas e piora à noite.',function(r){return principal(r,'capsulite');}],
    ['E812','Clique profundo no ombro, sensação de pegar por dentro e dor ao arremessar acima da cabeça.',function(r){return principal(r,'labral / slap')&&sinal(r,'labralOmbro');}],
    ['E813','Ombro sai do lugar repetidamente e dá medo ao armar o braço, sem clique profundo.',function(r){return principal(r,'instabilidade glenoumeral')&&!tem(r,'labral / slap')&&!sinal(r,'labralOmbro');}],
    ['E814','Após queda tem dor forte no quadril, não consegue apoiar e a perna ficou mais curta e rodada para fora.',function(r){return alerta(r,'fratura proximal do femur')&&sinal(r,'fraturaQuadrilAguda')&&sinal(r,'deformidadeFraturaQuadril');}],
    ['E815','Corredor aumentou a carga, tem dor profunda na virilha, manca e acorda pela dor durante a noite, sem queda.',function(r){return tem(r,'estresse do colo femoral')&&!alerta(r,'fratura proximal do femur');}],
    ['E816','Uso prolongado de corticoide e dor progressiva profunda na virilha, pior à noite e ao caminhar.',function(r){return principal(r,'osteonecrose')&&sinal(r,'riscoOsteonecroseQuadril');}],
    ['E817','Dor no quadril com rigidez ao levantar e piora ao caminhar, sem corticoide e sem álcool.',function(r){return principal(r,'osteoartrose de quadril')&&!principal(r,'osteonecrose');}],
    ['E818','Caiu sobre o ombro e ficou com deformidade evidente, ombro visivelmente fora do lugar.',function(r){return alerta(r,'fratura/luxacao traumatica do ombro')&&sinal(r,'deformidadeOmbroTrauma');}],
    ['E819','Caiu sobre o ombro e desde então não consegue elevar o braço, com perda súbita de força, sem deformidade.',function(r){return alerta(r,'ruptura traumatica do manguito')&&!alerta(r,'fratura/luxacao traumatica do ombro');}],
    ['E820','Joelho quente e muito inchado com febre e dor intensa para mexer.',function(r){return alerta(r,'artrite septica')&&sinal(r,'suspeitaArticulacaoSeptica');}],
    ['E821','Dor no joelho ao agachar e subir escada, sem febre e sem calor local.',function(r){return !alerta(r,'artrite septica');}],
    ['E822','Dor na base do polegar ao abrir pote, sem dormência e sem formigamento.',function(r){return !sinal(r,'mediano')&&!tem(r,'tunel do carpo');}],
    ['E823','Polegar, indicador e médio dormem à noite e melhora ao sacudir a mão.',function(r){return principal(r,'tunel do carpo')&&sinal(r,'mediano');}],
    ['E824','Dor somente no joelho ao agachar e subir escada.',function(r){return !tem(r,'sacroiliaca');}],
    ['E825','Uso prolongado de corticoide, porém sem dor no quadril ou virilha.',function(r){return !tem(r,'osteonecrose');}],
    ['E826','Dor profunda no quadril em repouso e à noite.',function(r){return tem(r,'osteonecrose')||tem(r,'osteoartrose de quadril')||tem(r,'intra-articular');}],
    ['E827','Estalo superficial no ombro ao mexer, sem clique profundo e sem travamento.',function(r){return !tem(r,'labral / slap');}],
    ['E828','Joelho falseia após trauma, mas não houve pivô, estalo ou inchaço imediato.',function(r){return !tem(r,'possivel lesao do lca');}],
    ['E829','Dor na base do polegar ao fazer pinça, sem sintomas noturnos e sem parestesia.',function(r){return tem(r,'osteoartrose cmc')&&!tem(r,'tunel do carpo');}],
    ['E830','Patela deslocou lateralmente durante uma mudança de direção, mas não houve bloqueio articular.',function(r){return tem(r,'instabilidade / luxacao patelar')&&!alerta(r,'mecanismo extensor');}]
  ];

  window.executarAuditoriaRepertorioEtapa8HMAKineSys=function(opcoes){
    opcoes=opcoes||{};
    var resultados=CASOS.map(function(c){var r,erro='',passou=false;try{r=window.analisarHMAClinicaKineSys(c[1]);passou=!!c[2](r||{});}catch(e){erro=String(e&&e.stack||e);}return{id:c[0],hma:c[1],passou:passou,erro:erro,principal:r?.suspeitaPrincipal?.nome||'',diferenciais:(r?.diferenciais||[]).map(function(x){return x.nome;}),alertas:(r?.alertas||[]).map(function(x){return x.nome;}),sinais:r?.sinais||[]};});
    var resumo={versao:window.KINESYS_HMA_ENGINE_VERSION||'8.0-repertorio-ampliado',total:resultados.length,passou:resultados.filter(function(x){return x.passou;}).length};resumo.falhou=resumo.total-resumo.passou;resumo.taxa=resumo.total?Math.round(resumo.passou/resumo.total*1000)/10:0;
    if(opcoes.console!==false&&typeof console!=='undefined'){console.group('KineSys — auditoria repertório Etapa 8');console.log('Resumo:',resumo);if(typeof console.table==='function')console.table(resultados.map(function(x){return{id:x.id,passou:x.passou,principal:x.principal};}));var f=resultados.filter(function(x){return !x.passou;});if(f.length)console.log('Falhas:',f);console.groupEnd();}
    return{resumo:resumo,resultados:resultados};
  };
})();

/* ==========================================================================
   KINESYS — AUDITORIA DE COBERTURA REGIONAL — ETAPA 9
   --------------------------------------------------------------------------
   Testes de desenvolvimento. Não executam automaticamente em produção.
   Cobrem lacunas prioritárias identificadas na auditoria regional.
   ========================================================================== */
(function instalarAuditoriaCoberturaRegionalEtapa9HMAKineSys(){
  function norm(v){return String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();}
  function nomes(r){return [r?.suspeitaPrincipal?.nome||''].concat((r?.diferenciais||[]).map(function(x){return x.nome||'';}),(r?.alertas||[]).map(function(x){return x.nome||'';}));}
  function tem(r,q){var n=norm(q);return nomes(r).some(function(x){return norm(x).indexOf(n)>=0;});}
  function principal(r,q){return norm(r?.suspeitaPrincipal?.nome||'').indexOf(norm(q))>=0;}
  function alerta(r,q){return (r?.alertas||[]).some(function(x){return norm(x.nome).indexOf(norm(q))>=0;});}
  function sinal(r,q){return (r?.sinais||[]).indexOf(q)>=0;}

  var CASOS=[
    ['E901','Após queda de altura apresenta dor cervical e dor na linha média sobre as vértebras do pescoço.',function(r){return alerta(r,'fratura cervical')&&sinal(r,'traumaCervicalImportante')&&sinal(r,'dorLinhaMediaCervical');}],
    ['E902','Dor cervical leve após dormir mal, sem trauma e sem dor na linha média.',function(r){return !alerta(r,'fratura cervical');}],
    ['E903','Dor cervical súbita e muito intensa acompanhada de visão dupla.',function(r){return alerta(r,'disfunção arterial cervical')&&sinal(r,'vascularCervicalDorIncomum')&&sinal(r,'vascularCervicalNeuroCraniano');}],
    ['E904','Tontura leve com dor cervical mecânica antiga, sem visão dupla, fala enrolada ou cefaleia súbita.',function(r){return !alerta(r,'disfunção arterial cervical');}],
    ['E905','Dor na frente do cotovelo ao supinar e levantar peso, sem estalo ou hematoma.',function(r){return principal(r,'bíceps distal')&&!alerta(r,'ruptura do bíceps distal')&&sinal(r,'bicepsDistal');}],
    ['E906','Ao levantar uma caixa sentiu estalo na frente do cotovelo, hematoma e perdeu força para supinar.',function(r){return alerta(r,'ruptura do bíceps distal')&&sinal(r,'rupturaBicepsDistal');}],
    ['E907','Bola na ponta do cotovelo, pior ao apoiar sobre a mesa.',function(r){return principal(r,'bursite olecraniana')&&sinal(r,'bursiteOlecrano');}],
    ['E908','Dor lateral do cotovelo ao apertar e carregar, sem inchaço na ponta.',function(r){return principal(r,'epicondilalgia lateral')&&!tem(r,'bursite olecraniana');}],
    ['E909','Caiu sobre a mão e ficou com punho deformado e dor intensa no rádio distal.',function(r){return alerta(r,'fratura do rádio distal')&&sinal(r,'fraturaRadioDistal');}],
    ['E910','Caiu sobre a mão estendida e dói somente na tabaqueira anatômica, sem deformidade.',function(r){return alerta(r,'escafoide')&&!alerta(r,'rádio distal');}],
    ['E911','O dedo anelar trava ao fechar a mão e precisa destravar com ressalto pela manhã.',function(r){return principal(r,'dedo em gatilho')&&sinal(r,'dedoGatilho');}],
    ['E912','Dor na base do polegar ao abrir pote, sem dedo travando.',function(r){return !tem(r,'dedo em gatilho');}],
    ['E913','Queimação em faixa unilateral ao longo de uma costela, pele sensível, sem vesículas.',function(r){return principal(r,'neuralgia intercostal')&&sinal(r,'intercostalNeuralgia')&&!tem(r,'herpes-zóster');}],
    ['E914','Queimação em faixa no tórax com vesículas na pele.',function(r){return tem(r,'herpes-zóster');}],
    ['E915','Dor profunda no glúteo que piora muito sentado e desce pela parte de trás da coxa.',function(r){return principal(r,'glútea profunda')&&sinal(r,'gluteoProfundo');}],
    ['E916','Dor lombar que desce abaixo do joelho até o pé e piora ao tossir.',function(r){return principal(r,'radicular')&&!principal(r,'glútea profunda');}],
    ['E917','Bola superficial na frente da patela com dor e inchaço ao ajoelhar.',function(r){return principal(r,'bursite pré-patelar')&&sinal(r,'bursitePrepatelar');}],
    ['E918','Dor ao redor da patela apenas em escadas e agachamento, sem inchaço superficial.',function(r){return principal(r,'femoropatelar')&&!tem(r,'bursite pré-patelar');}],
    ['E919','Formigamento na planta do pé vindo de trás do maléolo medial, pior em pé.',function(r){return principal(r,'túnel do tarso')&&sinal(r,'tunelTarsal');}],
    ['E920','Dor no arco medial com pé achatando e dificuldade para elevar o calcanhar, sem formigamento plantar.',function(r){return principal(r,'tibial posterior')&&!tem(r,'túnel do tarso');}],
    ['E921','Dor e rigidez na articulação do dedão do pé, pior no impulso da caminhada e com pouca dorsiflexão.',function(r){return principal(r,'hallux rigidus')&&sinal(r,'halluxRigidus');}],
    ['E922','Queimação entre o terceiro e quarto dedos com sensação de pedrinha no sapato.',function(r){return principal(r,'morton')&&!tem(r,'hallux rigidus');}],
    ['E923','Dor difusa na bola do pé ao caminhar, sob várias cabeças metatarsais, sem queimação entre os dedos.',function(r){return principal(r,'metatarsalgia')&&sinal(r,'metatarsalgia');}],
    ['E924','Dor focal no segundo metatarso após aumento de corrida.',function(r){return principal(r,'estresse do metatarso')&&!principal(r,'metatarsalgia');}],
    ['E925','Dor glútea profunda ao sentar, mas também dor lombar com formigamento até o pé.',function(r){return tem(r,'glútea profunda')&&tem(r,'radicular');}],
    ['E926','Dor em faixa no tórax pior ao girar o tronco e sem características de queimação ou choque.',function(r){return !principal(r,'neuralgia intercostal');}],
    ['E927','Inchaço sobre a patela com febre e joelho muito quente.',function(r){return alerta(r,'artrite séptica');}],
    ['E928','Bola na ponta do cotovelo sem febre, sem calor e sem vermelhidão.',function(r){return tem(r,'bursite olecraniana')&&!alerta(r,'artrite séptica');}],
    ['E929','Dor no dedão do pé ao caminhar, mas sem rigidez e com movimento completo.',function(r){return !principal(r,'hallux rigidus');}],
    ['E930','Dormência plantar associada a dor lombar que desce até o pé.',function(r){return tem(r,'radicular')&&!principal(r,'túnel do tarso');}]
  ];

  window.executarAuditoriaCoberturaRegionalEtapa9HMAKineSys=function(opcoes){
    opcoes=opcoes||{};
    var resultados=CASOS.map(function(c){var r,erro='',passou=false;try{r=window.analisarHMAClinicaKineSys(c[1]);passou=!!c[2](r||{});}catch(e){erro=String(e&&e.stack||e);}return{id:c[0],hma:c[1],passou:passou,erro:erro,principal:r?.suspeitaPrincipal?.nome||'',diferenciais:(r?.diferenciais||[]).map(function(x){return x.nome;}),alertas:(r?.alertas||[]).map(function(x){return x.nome;}),sinais:r?.sinais||[]};});
    var resumo={versao:window.KINESYS_HMA_ENGINE_VERSION||'9.0-cobertura-regional-1',total:resultados.length,passou:resultados.filter(function(x){return x.passou;}).length};resumo.falhou=resumo.total-resumo.passou;resumo.taxa=resumo.total?Math.round(resumo.passou/resumo.total*1000)/10:0;
    if(opcoes.console!==false&&typeof console!=='undefined'){console.group('KineSys — auditoria cobertura regional Etapa 9');console.log('Resumo:',resumo);if(typeof console.table==='function')console.table(resultados.map(function(x){return{id:x.id,passou:x.passou,principal:x.principal};}));var f=resultados.filter(function(x){return !x.passou;});if(f.length)console.log('Falhas:',f);console.groupEnd();}
    return{resumo:resumo,resultados:resultados};
  };
})();
/* ==========================================================================
   KINESYS — AUDITORIA DE COBERTURA REGIONAL — ETAPA 10
   --------------------------------------------------------------------------
   Testes de desenvolvimento. Não executam automaticamente em produção.
   Cobrem novos diferenciais de membro superior, quadril/coxa, joelho e pé.
   ========================================================================== */
(function instalarAuditoriaCoberturaRegionalEtapa10HMAKineSys(){
  function norm(v){return String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();}
  function nomes(r){return [r?.suspeitaPrincipal?.nome||''].concat((r?.diferenciais||[]).map(function(x){return x.nome||'';}),(r?.alertas||[]).map(function(x){return x.nome||'';}));}
  function tem(r,q){var n=norm(q);return nomes(r).some(function(x){return norm(x).indexOf(n)>=0;});}
  function principal(r,q){return norm(r?.suspeitaPrincipal?.nome||'').indexOf(norm(q))>=0;}
  function alerta(r,q){return (r?.alertas||[]).some(function(x){return norm(x.nome).indexOf(norm(q))>=0;});}
  function sinal(r,q){return (r?.sinais||[]).indexOf(q)>=0;}

  var CASOS=[
    ['E1001','Dor no antebraço proximal com formigamento no polegar, indicador e médio, piora ao pronar contra resistência.',function(r){return principal(r,'pronador')&&sinal(r,'pronadorMediano');}],
    ['E1002','Polegar, indicador e médio dormem à noite e melhora ao sacudir a mão, sem dor no antebraço.',function(r){return principal(r,'túnel do carpo')&&!principal(r,'pronador');}],
    ['E1003','Dor cervical que desce pelo braço até polegar e indicador, com dormência e piora ao mexer o pescoço.',function(r){return principal(r,'radicular')&&!principal(r,'pronador');}],
    ['E1004','Após queda sobre a mão apresenta dor dorsal central no punho e clique central ao apoiar.',function(r){return principal(r,'escafolunar')&&sinal(r,'escafolunar');}],
    ['E1005','Caiu sobre a mão estendida e dói somente na tabaqueira anatômica.',function(r){return alerta(r,'escafoide')&&!principal(r,'escafolunar');}],
    ['E1006','Dor ulnar no punho com clique ao girar chave, sem dor dorsal central.',function(r){return principal(r,'fibrocartilaginoso triangular')&&!principal(r,'escafolunar');}],
    ['E1007','Polegar abriu para fora após trauma e ficou doloroso e instável na articulação da base.',function(r){return principal(r,'colateral ulnar do polegar')&&sinal(r,'ligamentoUlnarPolegar');}],
    ['E1008','Dor crônica na base do polegar ao fazer pinça, sem trauma ou instabilidade.',function(r){return tem(r,'osteoartrose cmc')&&!tem(r,'colateral ulnar do polegar');}],
    ['E1009','Exame anterior mostrou calcificação do supraespinhal e agora há dor intensa no ombro à noite.',function(r){return principal(r,'calcária do ombro')&&sinal(r,'calcificacaoOmbro');}],
    ['E1010','Dor no ombro ao elevar o braço e pior à noite, sem diagnóstico ou imagem de calcificação.',function(r){return principal(r,'manguito')&&!tem(r,'calcária do ombro');}],
    ['E1011','Arremessador apresenta dor medial no cotovelo durante arremesso e sensação de instabilidade em valgo.',function(r){return principal(r,'colateral ulnar do cotovelo')&&sinal(r,'ligamentoUlnarCotovelo');}],
    ['E1012','Dor medial no cotovelo ao flexionar o punho e pronar, sem relação com arremesso.',function(r){return principal(r,'epicondilalgia medial')&&!principal(r,'colateral ulnar do cotovelo');}],
    ['E1013','Quarto e quinto dedos formigam quando mantém o cotovelo dobrado, sem dor no arremesso.',function(r){return principal(r,'ulnar no cotovelo')&&!principal(r,'colateral ulnar do cotovelo');}],
    ['E1014','Dormência e queimação na parte de fora da coxa, pior com cinto apertado, sem fraqueza.',function(r){return principal(r,'meralgia')&&sinal(r,'meralgiaParestesica');}],
    ['E1015','Dor lateral no quadril que piora ao deitar sobre o lado e desce pela lateral da coxa até o joelho, sem dormência.',function(r){return principal(r,'trocantérica')&&!principal(r,'meralgia');}],
    ['E1016','Dor lombar que desce abaixo do joelho até o pé com formigamento.',function(r){return principal(r,'radicular')&&!principal(r,'meralgia');}],
    ['E1017','Dor focal acima da patela ao saltar e agachar.',function(r){return principal(r,'quadríceps')&&sinal(r,'tendaoQuadriceps');}],
    ['E1018','Dor focal abaixo da patela durante saltos, sem dor acima da patela.',function(r){return principal(r,'patelar')&&!principal(r,'quadríceps');}],
    ['E1019','Após estalo no joelho não consegue elevar a perna estendida.',function(r){return alerta(r,'mecanismo extensor')&&!principal(r,'quadríceps');}],
    ['E1020','Dor na frente do tornozelo ao agachar fundo e ao levar o joelho para frente.',function(r){return principal(r,'impacto anterior')&&sinal(r,'impactoAnteriorTornozelo');}],
    ['E1021','Entorse alta com dor acima do tornozelo e piora na rotação externa.',function(r){return principal(r,'sindesmose')&&!principal(r,'impacto anterior');}],
    ['E1022','Dançarina com dor profunda atrás do tornozelo apenas em flexão plantar máxima e ponta do pé.',function(r){return principal(r,'impacto posterior')&&sinal(r,'impactoPosteriorTornozelo');}],
    ['E1023','Aquiles rígido de manhã, dói correndo e melhora aquecendo, sem dor em flexão plantar máxima.',function(r){return principal(r,'tendinopatia do aquiles')&&!principal(r,'impacto posterior');}],
    ['E1024','Sentiu uma pedrada atrás do tornozelo e não consegue ficar na ponta do pé.',function(r){return tem(r,'lesão do tendão de aquiles')&&!principal(r,'impacto posterior');}],
    ['E1025','Dor plantar sob a segunda metatarsofalângica e o segundo dedo está começando a subir.',function(r){return principal(r,'placa plantar')&&sinal(r,'placaPlantar');}],
    ['E1026','Queimação entre terceiro e quarto dedos com sensação de pedrinha no sapato.',function(r){return principal(r,'morton')&&!principal(r,'placa plantar');}],
    ['E1027','Dor difusa sob várias cabeças metatarsais ao caminhar, sem desvio dos dedos.',function(r){return principal(r,'metatarsalgia')&&!principal(r,'placa plantar');}],
    ['E1028','Corredor aumentou muito o volume e apresenta dor focal no navicular ao correr.',function(r){return alerta(r,'estresse do navicular')&&sinal(r,'stressNavicular');}],
    ['E1029','Trauma no mediopé com equimose plantar e incapacidade de apoiar.',function(r){return alerta(r,'lisfranc')&&!alerta(r,'estresse do navicular');}],
    ['E1030','Dor focal no segundo metatarso após aumento de corrida.',function(r){return principal(r,'estresse do metatarso')&&!alerta(r,'estresse do navicular');}],
    ['E1031','Após aumentar a corrida apareceu dor profunda no calcâneo e dói ao comprimir os lados do calcanhar.',function(r){return principal(r,'estresse do calcâneo')&&sinal(r,'stressCalcaneo');}],
    ['E1032','Dor plantar no calcanhar principalmente nos primeiros passos da manhã.',function(r){return principal(r,'fasciopatia plantar')&&!principal(r,'estresse do calcâneo');}],
    ['E1033','Dor na inserção do Aquiles no calcâneo, com inchaço atrás do calcanhar e piora com sapato fechado.',function(r){return principal(r,'insercional do aquiles')&&sinal(r,'aquilesInsercionalRetrocalcanea');}],
    ['E1034','Dor no meio do tendão de Aquiles ao correr, rigidez matinal e melhora aquecendo, sem dor na inserção.',function(r){return principal(r,'tendinopatia do aquiles')&&!principal(r,'insercional');}],
    ['E1035','Dor plantar embaixo do dedão do pé ao impulsionar e sensibilidade sobre os sesamoides.',function(r){return principal(r,'sesamoidite')&&sinal(r,'sesamoidePrimeiroRaio');}],
    ['E1036','Dedão do pé rígido e doloroso na articulação, com pouca dorsiflexão ao caminhar.',function(r){return principal(r,'hallux rigidus')&&!principal(r,'sesamoidite');}],
    ['E1037','Dor difusa na bola do pé sob várias cabeças metatarsais, sem dor específica embaixo do dedão.',function(r){return principal(r,'metatarsalgia')&&!principal(r,'sesamoidite');}],
    ['E1038','Dormência na lateral da coxa e dor lombar que desce até o pé com fraqueza progressiva.',function(r){return tem(r,'radicular')&&alerta(r,'déficit neurológico progressivo')&&!principal(r,'meralgia');}]
  ];

  window.executarAuditoriaCoberturaRegionalEtapa10HMAKineSys=function(opcoes){
    opcoes=opcoes||{};
    var resultados=CASOS.map(function(c){var r,erro='',passou=false;try{r=window.analisarHMAClinicaKineSys(c[1]);passou=!!c[2](r||{});}catch(e){erro=String(e&&e.stack||e);}return{id:c[0],hma:c[1],passou:passou,erro:erro,principal:r?.suspeitaPrincipal?.nome||'',diferenciais:(r?.diferenciais||[]).map(function(x){return x.nome;}),alertas:(r?.alertas||[]).map(function(x){return x.nome;}),sinais:r?.sinais||[]};});
    var resumo={versao:window.KINESYS_HMA_ENGINE_VERSION||'10.0-cobertura-regional-2',total:resultados.length,passou:resultados.filter(function(x){return x.passou;}).length};resumo.falhou=resumo.total-resumo.passou;resumo.taxa=resumo.total?Math.round(resumo.passou/resumo.total*1000)/10:0;
    if(opcoes.console!==false&&typeof console!=='undefined'){console.group('KineSys — auditoria cobertura regional Etapa 10');console.log('Resumo:',resumo);if(typeof console.table==='function')console.table(resultados.map(function(x){return{id:x.id,passou:x.passou,principal:x.principal};}));var f=resultados.filter(function(x){return !x.passou;});if(f.length)console.log('Falhas:',f);console.groupEnd();}
    return{resumo:resumo,resultados:resultados};
  };
})();


/* ========================================================================== 
   KINESYS — AUDITORIA DE DISCRIMINAÇÃO FENOTÍPICA — ETAPA 11
   --------------------------------------------------------------------------
   Testes de desenvolvimento. Não executam automaticamente em produção.
   Objetivo: diferenciar condições com apresentações sobrepostas na mesma região.
   ========================================================================== */
(function instalarAuditoriaDiscriminacaoFenotipicaEtapa11(){
  function norm(v){return String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();}
  function nomes(r){return [r?.suspeitaPrincipal?.nome||''].concat((r?.diferenciais||[]).map(function(x){return x.nome||'';}),(r?.alertas||[]).map(function(x){return x.nome||'';}));}
  function tem(r,q){var n=norm(q);return nomes(r).some(function(x){return norm(x).indexOf(n)>=0;});}
  function principal(r,q){return norm(r?.suspeitaPrincipal?.nome||'').indexOf(norm(q))>=0;}
  function diff(r,q){return (r?.diferenciais||[]).some(function(x){return norm(x.nome).indexOf(norm(q))>=0;});}
  var C=[
    ['E1101','Ombro rígido progressivamente; tanto eu quanto o examinador quase não conseguimos girar para fora passivamente. Sem crepitação.',function(r){return principal(r,'capsulite')&&!principal(r,'osteoartrose glenoumeral');}],
    ['E1102','Dor profunda no ombro com crepitação e rigidez global, especialmente para rotação externa passiva.',function(r){return principal(r,'osteoartrose glenoumeral');}],
    ['E1103','Dor lateral no ombro ao elevar, arco doloroso, mas o movimento passivo está preservado.',function(r){return principal(r,'manguito')&&!principal(r,'capsulite');}],
    ['E1104','Dor bem na frente do ombro no sulco do bíceps, piora ao flexionar o cotovelo e supinar contra resistência, sem clique profundo.',function(r){return principal(r,'bíceps')&&!principal(r,'labral');}],
    ['E1105','Clique profundo dentro do ombro, sensação de agarrar e dor no arremesso, sem rigidez global.',function(r){return principal(r,'labral');}],
    ['E1106','Ombro parece que vai sair quando arma o braço em abdução e rotação externa; episódios prévios de subluxação.',function(r){return principal(r,'instabilidade glenoumeral');}],
    ['E1107','Dor cervical que desce pela face lateral do braço e antebraço até polegar e indicador, piora ao mexer o pescoço.',function(r){return principal(r,'radicular')&&!principal(r,'túnel do carpo');}],
    ['E1108','Polegar, indicador e médio ficam dormentes à noite, melhora sacudindo a mão e piora ao dobrar o punho; sem dor cervical.',function(r){return principal(r,'túnel do carpo')&&!principal(r,'radicular');}],
    ['E1109','Quarto e quinto dedos formigam quando o cotovelo fica dobrado e quando apoio o cotovelo.',function(r){return principal(r,'ulnar no cotovelo');}],
    ['E1110','Quarto e quinto dedos formigam ao pedalar apoiando a palma no guidão; mexer ou apoiar o cotovelo não interfere.',function(r){return principal(r,'guyon')&&!principal(r,'ulnar no cotovelo');}],
    ['E1111','Dor proximal no antebraço e parestesias no polegar, indicador e médio pioram ao pronar contra resistência; não acorda à noite.',function(r){return principal(r,'pronador')&&!principal(r,'túnel do carpo');}],
    ['E1112','Dor cervical e medial do antebraço até quarto e quinto dedos, com fraqueza da mão; cotovelo dobrado não modifica.',function(r){return principal(r,'radicular')&&!principal(r,'ulnar no cotovelo');}],
    ['E1113','Fraqueza para estender os dedos, dor lateral proximal no antebraço, mas sem dormência.',function(r){return tem(r,'túnel radial')||tem(r,'interósseo posterior');}],
    ['E1114','Dormência no polegar e indicador só à noite e melhora sacudindo a mão; movimento cervical não muda nada.',function(r){return principal(r,'túnel do carpo');}],
    ['E1115','Após pivô sem contato ouviu estalo, joelho inchou em uma hora e desde então falseia.',function(r){return principal(r,'lca')&&diff(r,'meniscal');}],
    ['E1116','Após torção com pé preso houve dor na interlinha, inchaço apenas horas depois e agora o joelho prende.',function(r){return principal(r,'meniscal')&&!principal(r,'lca');}],
    ['E1117','Trauma direto na frente da tíbia com joelho flexionado e sensação de instabilidade posterior.',function(r){return principal(r,'lcp');}],
    ['E1118','Dor ao redor da patela ao descer escadas e ficar muito tempo sentado; sem dor focal no polo inferior.',function(r){return principal(r,'femoropatelar')&&!principal(r,'tendinopatia patelar');}],
    ['E1119','Dor muito focal no polo inferior da patela durante saltos; sentar muito tempo não piora.',function(r){return principal(r,'patelar')&&!principal(r,'femoropatelar');}],
    ['E1120','Joelho com rigidez curta após repouso, crepitação e dor progressiva ao caminhar; sem torção recente.',function(r){return principal(r,'osteoartrose de joelho')&&!principal(r,'meniscal');}],
    ['E1121','Joelho travou após torção e não consegue estender completamente.',function(r){return principal(r,'meniscal');}],
    ['E1122','Inchaço superficial como uma bola sobre a patela depois de trabalhar ajoelhado.',function(r){return principal(r,'bursite pré-patelar');}],
    ['E1123','Virou o tornozelo para dentro, dor abaixo do maléolo lateral e edema local.',function(r){return principal(r,'entorse lateral');}],
    ['E1124','Após entorse há dor acima da articulação do tornozelo e piora forte com rotação externa do pé.',function(r){return principal(r,'sindesmose')&&!principal(r,'entorse lateral');}],
    ['E1125','Dor retromaleolar lateral e estalo dos tendões atrás do maléolo, pior ao evertir o pé.',function(r){return principal(r,'fibulares');}],
    ['E1126','Após entorse há dor óssea na borda posterior do maléolo e não consegue dar quatro passos.',function(r){return tem(r,'fratura de tornozelo');}],
    ['E1127','Dor na frente do tornozelo só no agachamento profundo em dorsiflexão, sem trauma recente.',function(r){return principal(r,'impacto anterior');}],
    ['E1128','Dor profunda atrás do tornozelo apenas em flexão plantar máxima e na ponta do pé.',function(r){return principal(r,'impacto posterior');}],
    ['E1129','Dor na inserção do Aquiles no calcâneo, pior com sapato fechado; sem dor na porção média do tendão.',function(r){return principal(r,'insercional do aquiles');}],
    ['E1130','Queimação entre terceiro e quarto dedos, piora com sapato apertado e parece ter uma pedra dentro do sapato.',function(r){return principal(r,'morton')&&!principal(r,'placa plantar');}],
    ['E1131','Dor plantar bem sob a segunda MTF e o segundo dedo está subindo e desviando.',function(r){return principal(r,'placa plantar')&&!principal(r,'morton');}],
    ['E1132','Dor difusa na bola do pé sob várias cabeças metatarsais ao caminhar, sem queimação interdigital.',function(r){return principal(r,'metatarsalgia')&&!principal(r,'morton');}],
    ['E1133','Dor focal no segundo metatarso após aumentar corrida, sensível exatamente sobre o osso.',function(r){return principal(r,'estresse do metatarso')&&!principal(r,'metatarsalgia');}],
    ['E1134','Dedão rígido e doloroso na articulação, pouca dorsiflexão e dor na impulsão.',function(r){return principal(r,'hallux rigidus');}],
    ['E1135','Dor plantar focal embaixo do dedão sobre os sesamoides, pior na impulsão, mas a articulação do dedão não é rígida.',function(r){return principal(r,'sesamoidite')&&!principal(r,'hallux rigidus');}],
    ['E1136','Formigamento e queimação na sola vindo de trás do maléolo medial, pior em pé.',function(r){return principal(r,'túnel do tarso');}]
  ];
  window.executarAuditoriaDiscriminacaoFenotipicaEtapa11HMAKineSys=function(opcoes){opcoes=opcoes||{};var resultados=C.map(function(c){var r,erro='',passou=false;try{r=window.analisarHMAClinicaKineSys(c[1]);passou=!!c[2](r||{});}catch(e){erro=String(e&&e.stack||e);}return{id:c[0],hma:c[1],passou:passou,erro:erro,principal:r?.suspeitaPrincipal?.nome||'',diferenciais:(r?.diferenciais||[]).map(function(x){return x.nome;}),alertas:(r?.alertas||[]).map(function(x){return x.nome;}),sinais:r?.sinais||[]};});var resumo={versao:window.KINESYS_HMA_ENGINE_VERSION||'11.0-discriminacao-fenotipica',total:resultados.length,passou:resultados.filter(function(x){return x.passou;}).length};resumo.falhou=resumo.total-resumo.passou;resumo.taxa=resumo.total?Math.round(resumo.passou/resumo.total*1000)/10:0;if(opcoes.console!==false&&typeof console!=='undefined'){console.group('KineSys — auditoria discriminação fenotípica Etapa 11');console.log('Resumo:',resumo);if(typeof console.table==='function')console.table(resultados.map(function(x){return{id:x.id,passou:x.passou,principal:x.principal};}));var f=resultados.filter(function(x){return !x.passou;});if(f.length)console.log('Falhas:',f);console.groupEnd();}return{resumo:resumo,resultados:resultados};};


  /* ================= AUDITORIA ETAPA 11.1 — FLEXÃO PROFUNDA DO JOELHO ================= */
  window.executarAuditoriaFlexaoProfundaJoelhoEtapa11_1HMAKineSys=function(opcoes){
    opcoes=opcoes||{};
    function norm(v){return String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();}
    function nomes(r){return [r?.suspeitaPrincipal?.nome||''].concat((r?.diferenciais||[]).map(function(x){return x.nome||'';}));}
    function tem(r,q){q=norm(q);return nomes(r).some(function(n){return norm(n).indexOf(q)>=0;});}
    function principal(r,q){return norm(r?.suspeitaPrincipal?.nome||'').indexOf(norm(q))>=0;}
    function sinal(r,s){return (r?.sinais||[]).indexOf(s)>=0;}
    var C=[
      ['JF1','Dor no joelho ao ficar de cócoras.',function(r){return sinal(r,'flexaoProfundaJoelho')&&tem(r,'meniscal')&&tem(r,'femoropatelar')&&!tem(r,'derrame / irritação intra-articular');}],
      ['JF2','Dor no joelho ao dobrar muito o joelho.',function(r){return sinal(r,'flexaoProfundaJoelho')&&tem(r,'meniscal')&&tem(r,'femoropatelar');}],
      ['JF3','Dor medial no joelho ao ficar de cócoras.',function(r){return principal(r,'meniscal medial')&&sinal(r,'joelhoMedial');}],
      ['JF4','Dor na interlinha medial ao dobrar muito o joelho.',function(r){return principal(r,'meniscal medial')&&sinal(r,'linhaArticularMedialJoelho');}],
      ['JF5','Dor lateral no joelho em agachamento profundo.',function(r){return principal(r,'meniscal lateral')&&sinal(r,'joelhoLateral');}],
      ['JF6','Dor atrás da patela ao dobrar muito o joelho.',function(r){return principal(r,'femoropatelar')&&sinal(r,'joelhoAnterior');}],
      ['JF7','Joelho inchado e com pressão ao dobrar muito o joelho.',function(r){return principal(r,'derrame / irritação intra-articular')&&sinal(r,'derrameJoelho')&&sinal(r,'flexaoProfundaJoelho');}],
      ['JF8','Dor no joelho ao agachar, sem inchaço.',function(r){return !tem(r,'derrame / irritação intra-articular');}],
      ['JF9','Sem dor no joelho ao ficar de cócoras.',function(r){return !sinal(r,'flexaoProfundaJoelho');}],
      ['JF10','Dor no cotovelo ao dobrar muito o cotovelo.',function(r){return !sinal(r,'flexaoProfundaJoelho')&&!tem(r,'meniscal')&&!tem(r,'femoropatelar');}],
      ['JF11','Dor no joelho ao ficar de cócoras que vai para parte interna do joelho.',function(r){return principal(r,'meniscal medial')&&sinal(r,'flexaoProfundaJoelho')&&sinal(r,'joelhoMedial');}],
      ['JF12','Dor no joelho que vai para parte interna do joelho.',function(r){return !principal(r,'meniscal medial')&&sinal(r,'joelhoMedial')&&!sinal(r,'flexaoProfundaJoelho');}],
      ['JF13','Dor no joelho ao ficar de cócoras que vai para parte externa do joelho.',function(r){return principal(r,'meniscal lateral')&&sinal(r,'flexaoProfundaJoelho')&&sinal(r,'joelhoLateral');}]
    ];
    var resultados=C.map(function(c){var r,erro='',passou=false;try{r=window.analisarHMAClinicaKineSys(c[1]);passou=!!c[2](r||{});}catch(e){erro=String(e&&e.stack||e);}return{id:c[0],hma:c[1],passou:passou,erro:erro,principal:r?.suspeitaPrincipal?.nome||'',diferenciais:(r?.diferenciais||[]).map(function(x){return x.nome;}),sinais:r?.sinais||[]};});
    var resumo={versao:window.KINESYS_HMA_ENGINE_VERSION||'11.1-flexao-profunda-joelho',total:resultados.length,passou:resultados.filter(function(x){return x.passou;}).length};
    resumo.falhou=resumo.total-resumo.passou;resumo.taxa=resumo.total?Math.round(resumo.passou/resumo.total*1000)/10:0;
    if(opcoes.console!==false&&typeof console!=='undefined'){console.group('KineSys — auditoria flexão profunda do joelho Etapa 11.1');console.log('Resumo:',resumo);if(typeof console.table==='function')console.table(resultados.map(function(x){return{id:x.id,passou:x.passou,principal:x.principal,diferenciais:x.diferenciais.join(' | ')};}));var f=resultados.filter(function(x){return !x.passou;});if(f.length)console.log('Falhas:',f);console.groupEnd();}
    return{resumo:resumo,resultados:resultados};
  };
})();
