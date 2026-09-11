/* ==========================================================================
   KineSys — Módulo AGENDA v1.11.2 — recorrência + feriados + status livres + auditoria administrativa + sincronização confiável
   Agendamento de pacientes, procedimentos, horários de atendimento e
   bloqueios. Depende de variáveis/funções já existentes em script.js:
   _supabase, escapeHTML, usuarioLogado, obterPacientesSalvos, telaPermitida.
   ========================================================================== */

let agendaDataSelecionada = new Date();
let agendaPeriodoVisual = 'semana';
let agendaProcedimentosCache = [];
let agendaHorariosCache = [];
let agendaBloqueiosCache = [];
let agendaEquipeCache = [];
let agendaPacientesModalCache = [];
let agendaAgendamentosDoDiaCache = [];
let agendaAgendamentosSemanaCache = [];
let agendaListaEsperaCache = [];
let agendamentoDetalheAtualId = null;
let agendaHoraPreSelecionadaModal = '';
let agendaSalvando = false;
let agendamentoReagendamentoBuffer = null;
let agendaRecorrenciaDatasEspecificas = [];
let agendaPagamentoCoberturaCache = new Map();
let agendaHistoricoStatusCache = [];
let agendaEdicaoAtendimentoId = null;
// Evita repetir o mesmo diálogo de exceção várias vezes enquanto o usuário
// apenas completa os demais campos do mesmo agendamento.
let agendaExcecaoJornadaPromptadaChaveModal = '';
const AGENDA_GRADE_PASSO_MIN = 10;

const AGENDA_SELECT_SEMANA = '*, pacientes(id,nome,telefone,dependente,responsavel_nome,responsavel_parentesco,responsavel_telefone), procedimentos(nome,duracao_minutos), equipe(nome)';
const AGENDA_SELECT_SEMANA_LEGADO = '*, pacientes(id,nome,telefone), procedimentos(nome,duracao_minutos), equipe(nome)';
let agendaContatoResponsavelDisponivel = true;

const AGENDA_SEMANA_CACHE_TTL_MS = 5000;

function prefixoCacheAgendaSemanaAtual() {
    const perfilId = String(usuarioLogado?.id || 'sem_perfil').trim() || 'sem_perfil';
    const clinicaId = String(usuarioLogado?.clinica_id || 'sem_clinica').trim() || 'sem_clinica';
    return `agenda::semana::${perfilId}::${clinicaId}::`;
}

function chaveCacheAgendaSemana(inicio, fim, profissionalEscopo = '') {
    const inicioISO = formatarDataISO(inicio);
    const fimISO = formatarDataISO(fim);
    const profissional = String(profissionalEscopo || 'todos').trim() || 'todos';
    return `${prefixoCacheAgendaSemanaAtual()}${inicioISO}::${fimISO}::${profissional}`;
}

function invalidarCacheAgendaSemana() {
    try { return Number(window.KineSysDataCache?.invalidatePrefix?.(prefixoCacheAgendaSemanaAtual()) || 0); }
    catch (_) { return 0; }
}

function clonarAgendamentosAgenda(lista = []) {
    return (Array.isArray(lista) ? lista : []).map(item => ({
        ...item,
        pacientes: item?.pacientes ? { ...item.pacientes } : item?.pacientes,
        procedimentos: item?.procedimentos ? { ...item.procedimentos } : item?.procedimentos,
        equipe: item?.equipe ? { ...item.equipe } : item?.equipe
    }));
}

const AGENDA_PROCEDIMENTOS_CACHE_TTL_MS = 15000;

function chaveCacheProcedimentosAgenda() {
    const perfilId = String(usuarioLogado?.id || 'sem_perfil').trim() || 'sem_perfil';
    const clinicaId = String(usuarioLogado?.clinica_id || 'sem_clinica').trim() || 'sem_clinica';
    return `agenda::aux::procedimentos::${perfilId}::${clinicaId}`;
}

function invalidarCacheProcedimentosAgenda() {
    try { return !!window.KineSysDataCache?.invalidate?.(chaveCacheProcedimentosAgenda()); }
    catch (_) { return false; }
}

function clonarProcedimentosAgenda(lista = []) {
    return (Array.isArray(lista) ? lista : []).map(item => ({
        ...item,
        profissionais_ids: Array.isArray(item?.profissionais_ids) ? [...item.profissionais_ids] : item?.profissionais_ids
    }));
}

async function obterPacientesBasicosAgenda() {
    if (typeof obterPacientesBasicos === 'function') return obterPacientesBasicos();
    if (typeof obterPacientesSalvos === 'function') return obterPacientesSalvos();
    return [];
}


function normalizarBuscaPacienteAgenda(valor) {
    return String(valor || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLocaleLowerCase('pt-BR')
        .trim();
}

function ordenarPacientesAgenda(lista = []) {
    return [...(Array.isArray(lista) ? lista : [])].sort((a, b) =>
        String(a?.nome || '').localeCompare(String(b?.nome || ''), 'pt-BR', { sensitivity: 'base' })
    );
}

let agendaPacienteSugestaoAtiva = -1;

function pacienteAgendaPorId(id = '') {
    const alvo = String(id || '').trim();
    return agendaPacientesModalCache.find(p => String(p?.id || '') === alvo) || null;
}

function fecharSugestoesPacienteAgenda() {
    const busca = document.getElementById('ag_paciente_busca');
    const lista = document.getElementById('ag_paciente_sugestoes');
    agendaPacienteSugestaoAtiva = -1;
    if (lista) {
        lista.hidden = true;
        lista.innerHTML = '';
    }
    if (busca) {
        busca.setAttribute('aria-expanded', 'false');
        busca.removeAttribute('aria-activedescendant');
    }
}

function destacarSugestaoPacienteAgenda(indice) {
    const busca = document.getElementById('ag_paciente_busca');
    const lista = document.getElementById('ag_paciente_sugestoes');
    const opcoes = Array.from(lista?.querySelectorAll('[data-paciente-id]') || []);
    if (!opcoes.length) return;
    const limite = opcoes.length - 1;
    agendaPacienteSugestaoAtiva = Math.max(0, Math.min(limite, indice));
    opcoes.forEach((opcao, i) => {
        const ativa = i === agendaPacienteSugestaoAtiva;
        opcao.classList.toggle('is-active', ativa);
        opcao.setAttribute('aria-selected', String(ativa));
    });
    const ativa = opcoes[agendaPacienteSugestaoAtiva];
    if (ativa) {
        busca?.setAttribute('aria-activedescendant', ativa.id);
        ativa.scrollIntoView({ block: 'nearest' });
    }
}

function filtrarPacientesAgendamento(termo = '', preservarPacienteId = '') {
    const busca = document.getElementById('ag_paciente_busca');
    const lista = document.getElementById('ag_paciente_sugestoes');
    const status = document.getElementById('ag_paciente_busca_status');
    const selecionado = document.getElementById('ag_paciente_select');
    if (!busca || !lista || !selecionado) return [];

    const termoNormalizado = normalizarBuscaPacienteAgenda(termo);
    const preservarId = String(preservarPacienteId || '').trim();
    if (!termoNormalizado) {
        fecharSugestoesPacienteAgenda();
        if (status) status.textContent = 'Digite parte do nome para localizar um paciente cadastrado.';
        return [];
    }

    let resultados = agendaPacientesModalCache.filter(p =>
        normalizarBuscaPacienteAgenda(p?.nome).includes(termoNormalizado)
    );
    if (preservarId) {
        const atual = pacienteAgendaPorId(preservarId);
        if (atual && !resultados.some(p => String(p?.id || '') === preservarId)) resultados.push(atual);
    }
    resultados = ordenarPacientesAgenda(resultados);

    lista.innerHTML = resultados.map((p, i) =>
        `<button type="button" id="ag_paciente_opcao_${i}" class="agenda-patient-suggestion" role="option" aria-selected="false" data-paciente-id="${escapeHTML(String(p?.id || ''))}" onclick="selecionarPacienteAgendamento(this.dataset.pacienteId)">${escapeHTML(p?.nome || 'Paciente')}</button>`
    ).join('');
    lista.hidden = resultados.length === 0;
    busca.setAttribute('aria-expanded', resultados.length ? 'true' : 'false');
    busca.removeAttribute('aria-activedescendant');
    agendaPacienteSugestaoAtiva = -1;

    if (status) {
        status.textContent = resultados.length
            ? `${resultados.length} paciente(s) encontrado(s). Selecione uma sugestão.`
            : 'Nenhum paciente encontrado com esse trecho do nome.';
    }
    return resultados;
}

function limparDependenciasPacienteAgendamento() {
    const plano = document.getElementById('ag_plano_select');
    const statusPlano = document.getElementById('ag_plano_status');
    const resumoPlano = document.getElementById('ag_plano_resumo');
    if (plano) {
        plano.innerHTML = '<option value="">Selecione um paciente para ver os pacotes</option>';
        plano.disabled = false;
    }
    if (statusPlano) statusPlano.textContent = 'Selecione o paciente para carregar automaticamente os planos/pacotes ativos.';
    if (resumoPlano) {
        resumoPlano.hidden = true;
        resumoPlano.textContent = '';
    }
}

function aoDigitarPacienteAgendamento(valor = '') {
    const selecionado = document.getElementById('ag_paciente_select');
    const atual = pacienteAgendaPorId(selecionado?.value || '');
    if (selecionado && atual && normalizarBuscaPacienteAgenda(valor) !== normalizarBuscaPacienteAgenda(atual.nome)) {
        selecionado.value = '';
        limparDependenciasPacienteAgendamento();
    }
    return filtrarPacientesAgendamento(valor);
}

function selecionarPacienteAgendamento(id = '') {
    const paciente = pacienteAgendaPorId(id);
    const selecionado = document.getElementById('ag_paciente_select');
    const busca = document.getElementById('ag_paciente_busca');
    const status = document.getElementById('ag_paciente_busca_status');
    if (!paciente || !selecionado || !busca) return false;

    selecionado.value = String(paciente.id || '');
    busca.value = paciente.nome || '';
    fecharSugestoesPacienteAgenda();
    if (status) status.textContent = 'Paciente selecionado.';

    const procedimentoId = document.getElementById('ag_procedimento_select')?.value || '';
    if (typeof popularPlanosNoAgendamento === 'function') {
        Promise.resolve(popularPlanosNoAgendamento(selecionado.value, procedimentoId)).catch(err =>
            console.warn('Agenda: não foi possível carregar os planos do paciente selecionado.', err)
        );
    }
    if (typeof atualizarHorariosDisponiveisModal === 'function') atualizarHorariosDisponiveisModal();
    busca.focus();
    return true;
}

function aoTeclarBuscaPacienteAgendamento(event) {
    const lista = document.getElementById('ag_paciente_sugestoes');
    const opcoes = Array.from(lista?.querySelectorAll('[data-paciente-id]') || []);
    if (!opcoes.length) {
        if (event.key === 'Escape') fecharSugestoesPacienteAgenda();
        return;
    }
    if (event.key === 'ArrowDown') {
        event.preventDefault();
        destacarSugestaoPacienteAgenda(agendaPacienteSugestaoAtiva < opcoes.length - 1 ? agendaPacienteSugestaoAtiva + 1 : 0);
        return;
    }
    if (event.key === 'ArrowUp') {
        event.preventDefault();
        destacarSugestaoPacienteAgenda(agendaPacienteSugestaoAtiva > 0 ? agendaPacienteSugestaoAtiva - 1 : opcoes.length - 1);
        return;
    }
    if (event.key === 'Enter' && agendaPacienteSugestaoAtiva >= 0) {
        event.preventDefault();
        selecionarPacienteAgendamento(opcoes[agendaPacienteSugestaoAtiva]?.dataset?.pacienteId || '');
        return;
    }
    if (event.key === 'Escape') {
        event.preventDefault();
        fecharSugestoesPacienteAgenda();
    }
}

function prepararBuscaPacienteAgendamento(pacientes = [], pacienteSelecionadoId = '') {
    agendaPacientesModalCache = ordenarPacientesAgenda(pacientes);
    const busca = document.getElementById('ag_paciente_busca');
    const selecionado = document.getElementById('ag_paciente_select');
    const status = document.getElementById('ag_paciente_busca_status');
    const pacienteId = String(pacienteSelecionadoId || '').trim();
    const paciente = pacienteAgendaPorId(pacienteId);
    if (selecionado) selecionado.value = paciente?.id ? String(paciente.id) : '';
    if (busca) busca.value = paciente?.nome || '';
    fecharSugestoesPacienteAgenda();
    if (status) status.textContent = paciente ? 'Paciente selecionado.' : 'Digite parte do nome para localizar um paciente cadastrado.';
    return paciente;
}

if (typeof document !== 'undefined') {
    document.addEventListener('click', event => {
        if (!event.target?.closest?.('#modal_agendamento .agenda-patient-search')) fecharSugestoesPacienteAgenda();
    });
}
if (typeof window !== 'undefined') {
    window.filtrarPacientesAgendamento = filtrarPacientesAgendamento;
    window.aoDigitarPacienteAgendamento = aoDigitarPacienteAgendamento;
    window.aoTeclarBuscaPacienteAgendamento = aoTeclarBuscaPacienteAgendamento;
    window.selecionarPacienteAgendamento = selecionarPacienteAgendamento;
}

// Status oficiais da Agenda. O status é um estado operacional/administrativo;
// o consumo financeiro é definido explicitamente e não pelo nome do status.
const AGENDA_STATUS_CONFIG = Object.freeze({
    pre_agendado: { rotulo: 'Pré-agendado', ocupaHorario: true, consomeSessao: false },
    agendado: { rotulo: 'Agendado', ocupaHorario: true, consomeSessao: false },
    confirmado: { rotulo: 'Confirmado', ocupaHorario: true, consomeSessao: false },
    em_recepcao: { rotulo: 'Em espera na recepção', ocupaHorario: true, consomeSessao: false },
    atendido: { rotulo: 'Atendido', ocupaHorario: false, consomeSessao: true },
    falta_justificada: { rotulo: 'Falta justificada', ocupaHorario: false, consomeSessao: false, permiteObservacao: true, permiteReagendamento: true },
    falta_nao_justificada: { rotulo: 'Falta não justificada', ocupaHorario: false, consomeSessao: true, permiteObservacao: true },
    cancelado: { rotulo: 'Cancelado', ocupaHorario: false, consomeSessao: false, permiteObservacao: true, permiteReagendamento: true }
});

const AGENDA_STATUS_LEGADO = Object.freeze({
    concluido: { rotulo: 'Atendido (registro antigo)', ocupaHorario: false, consomeSessao: true, classe: 'atendido' },
    faltou: { rotulo: 'Falta — registro antigo', ocupaHorario: false, consomeSessao: false, classe: 'falta_justificada' }
});

function configStatusAgenda(status) {
    return AGENDA_STATUS_CONFIG[String(status || '')] || AGENDA_STATUS_LEGADO[String(status || '')] || { rotulo: String(status || '—'), ocupaHorario: false, consomeSessao: false };
}
function rotuloStatusAgenda(status) { return configStatusAgenda(status).rotulo; }
function classeStatusAgenda(status) { return configStatusAgenda(status).classe || String(status || 'agendado'); }
function statusAgendaOcupaHorario(status) { return !!configStatusAgenda(status).ocupaHorario; }
function statusAgendaConsomeSessao(status) { return !!configStatusAgenda(status).consomeSessao; }
function statusAgendaPermiteObservacao(status) { return !!AGENDA_STATUS_CONFIG[String(status || '')]?.permiteObservacao; }
function statusAgendaPermiteReagendamento(status) { return !!AGENDA_STATUS_CONFIG[String(status || '')]?.permiteReagendamento; }
function statusAgendaUsaCoberturaPacote(status) {
    const st = String(status || '');
    return statusAgendaConsomeSessao(st) || ['pre_agendado','agendado','confirmado','em_recepcao'].includes(st);
}

function situacaoPagamentoAgenda(agendamento) {
    if (!agendamento?.id) return { verificado:false, pago:false, cobravel:true, motivo:'indisponivel' };
    return agendaPagamentoCoberturaCache.get(String(agendamento.id)) || {
        verificado: !agendamento.plano_id,
        pago: false,
        semCobranca: false,
        cobravel: true,
        motivo: agendamento.plano_id ? 'nao_verificado' : 'sem_pacote'
    };
}

function iconePagamentoAgendaHTML(agendamento) {
    if (!usuarioEhAdministradorAgenda()) return '';
    const situacao = situacaoPagamentoAgenda(agendamento);
    if (situacao.pago) {
        return '<span class="agenda-pagamento-icone" title="Pagamento realizado para esta sessão" aria-label="Pagamento realizado">$</span>';
    }
    if (['atendido','concluido'].includes(String(agendamento?.status || '')) && situacao.verificado && situacao.cobravel && !situacao.semCobranca) {
        return '<span class="agenda-cobranca-icone" title="Atendimento sem cobertura paga — cobrar paciente" aria-label="Pagamento pendente">!</span>';
    }
    return '';
}

async function atualizarCoberturaPagamentoAgenda() {
    if (!usuarioEhAdministradorAgenda()) { agendaPagamentoCoberturaCache = new Map(); return agendaPagamentoCoberturaCache; }
    if (typeof obterMapaPagamentoAgendamentos !== 'function') {
        agendaPagamentoCoberturaCache = new Map();
        return agendaPagamentoCoberturaCache;
    }
    try {
        agendaPagamentoCoberturaCache = await obterMapaPagamentoAgendamentos(agendaAgendamentosSemanaCache || []);
    } catch (err) {
        console.warn('Agenda: não foi possível atualizar os marcadores financeiros.', err);
        agendaPagamentoCoberturaCache = new Map();
    }
    return agendaPagamentoCoberturaCache;
}


function opcoesStatusAgenda(statusAtual = '') {
    const atual = String(statusAtual || '');
    let html = '';
    if (atual && !AGENDA_STATUS_CONFIG[atual]) {
        html += `<option value="${escapeHTML(atual)}" selected disabled>${escapeHTML(rotuloStatusAgenda(atual))}</option>`;
    }
    html += Object.entries(AGENDA_STATUS_CONFIG).map(([valor, cfg]) =>
        `<option value="${valor}" ${valor === atual ? 'selected' : ''}>${escapeHTML(cfg.rotulo)}</option>`
    ).join('');
    return html;
}

// Agenda confiável: todo novo agendamento recebe um UUID antes de ir à nuvem.
// Em falhas transitórias, esse mesmo registro é preservado em uma fila local e
// reenviado de forma idempotente. O UUID evita duplicação se o Supabase tiver
// recebido o INSERT, mas a resposta tiver se perdido no caminho.
const AGENDA_SYNC_PENDENTES_KEY = 'kinesys_agendamentos_pendentes_sync_v1';
let agendaSyncEmCurso = false;
let agendaSyncTimer = null;

// Página pública de confirmação fica DESATIVADA por padrão nesta versão.
// Enquanto o painel ainda não usa Supabase Auth + RLS, publicar confirmação pública
// com a mesma chave do painel ampliaria a superfície de exposição. Quando a etapa
// de segurança estiver concluída, informe aqui a URL pública de confirmação.
const CONFIRMACAO_BASE_URL = "";

const DIAS_SEMANA_NOMES = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];

function perfilAgendaAtual() {
    return String(usuarioLogado?.tipo || '').toUpperCase();
}

function usuarioEhAdministradorAgenda() {
    return ['MASTER','MASTER_FEM','ADMINISTRADOR','ADMINISTRADORA'].includes(perfilAgendaAtual());
}

function usuarioPodeVerAgendaClinicaToda() {
    return usuarioEhAdministradorAgenda() || perfilAgendaAtual() === 'SECRETARIA';
}

function encontrarProfissionalAgendaDoUsuario() {
    if (!usuarioLogado || !Array.isArray(agendaEquipeCache) || !agendaEquipeCache.length) return null;
    const idUsuario = String(usuarioLogado.id || '').trim();
    const emailUsuario = String(usuarioLogado.email || '').trim().toLowerCase();
    const nomeUsuario = String(usuarioLogado.nome || '').trim().toLowerCase();
    return agendaEquipeCache.find(p => idUsuario && String(p.id || '').trim() === idUsuario)
        || agendaEquipeCache.find(p => emailUsuario && String(p.email || '').trim().toLowerCase() === emailUsuario)
        || agendaEquipeCache.find(p => nomeUsuario && String(p.nome || '').trim().toLowerCase() === nomeUsuario)
        || null;
}

function profissionalAgendaRestritoAtualId() {
    if (usuarioPodeVerAgendaClinicaToda()) return '';
    return String(encontrarProfissionalAgendaDoUsuario()?.id || '');
}

function atualizarIndicadorEscopoAgenda() {
    atualizarControlesAgendaPorPerfil();
    const filtro = document.getElementById('agenda_filtro_profissional');
    const info = document.getElementById('agenda_escopo_acesso');
    const label = document.querySelector('.agenda-profissional-filtro label');
    if (!filtro) return;
    const atualizarAcessibilidadeFiltro = () => {
        const opcao = filtro.options?.[filtro.selectedIndex];
        const nome = String(opcao?.textContent || '').trim();
        filtro.title = nome;
        filtro.setAttribute('aria-label', nome ? `Agenda: ${nome}` : 'Filtro da agenda');
    };
    if (usuarioPodeVerAgendaClinicaToda()) {
        filtro.disabled = false;
        filtro.setAttribute('aria-disabled', 'false');
        if (label) label.textContent = 'Agenda';
        if (info) info.textContent = filtro.value ? 'Visão de um profissional' : 'Visão de toda a clínica';
        atualizarAcessibilidadeFiltro();
        return;
    }
    const proprio = encontrarProfissionalAgendaDoUsuario();
    filtro.disabled = true;
    filtro.setAttribute('aria-disabled', 'true');
    if (label) label.textContent = 'Minha agenda';
    if (info) info.textContent = proprio
        ? 'Acesso restrito aos seus próprios atendimentos'
        : 'Seu usuário não está vinculado a um profissional habilitado na Agenda';
    atualizarAcessibilidadeFiltro();
}

function atualizarVisibilidadeAuditoriaStatusAgenda() {
    const btn = document.getElementById('agenda_btn_historico_status');
    if (btn) btn.hidden = !usuarioEhAdministradorAgenda();
}

function erroSchemaAuditoriaStatusAgenda(error) {
    return /agendamentos_status_historico|kinesys_listar_historico_status_agenda|status_atualizado_por_id|status_atualizado_por_tipo|schema cache|column .* does not exist|relation .* does not exist|function .* does not exist/i.test(
        String(error?.message || error?.details || error?.hint || error || '')
    );
}

function rotuloPerfilAuditoriaAgenda(tipo) {
    const t = String(tipo || '').toUpperCase();
    if (['MASTER','MASTER_FEM','ADMINISTRADOR','ADMINISTRADORA'].includes(t)) return 'Administrador';
    if (t === 'FISIOTERAPEUTA' || t === 'PROFISSIONAL') return 'Fisioterapeuta';
    if (t === 'SECRETARIA') return 'Secretaria';
    if (t === 'MEDICO') return 'Médico';
    if (t === 'EDUCADOR_FISICO') return 'Profissional de Educação Física';
    return String(tipo || 'Perfil não identificado');
}

async function consultarHistoricoStatusAgenda({ agendamentoId = null, limite = 100 } = {}) {
    if (!usuarioEhAdministradorAgenda()) throw new Error('A auditoria de status é exclusiva dos administradores.');
    if (!_supabase) throw new Error('Supabase indisponível.');
    const args = {
        p_solicitante_id: String(usuarioLogado?.id || ''),
        p_solicitante_tipo: String(usuarioLogado?.tipo || ''),
        p_solicitante_nome: String(usuarioLogado?.nome || ''),
        p_agendamento_id: agendamentoId ? String(agendamentoId) : null,
        p_limite: Math.max(1, Math.min(300, Number(limite) || 100))
    };
    const { data, error } = await _supabase.rpc('kinesys_listar_historico_status_agenda', args);
    if (error) throw error;
    return Array.isArray(data) ? data : [];
}

function renderizarHistoricoStatusAgenda(lista = []) {
    const el = document.getElementById('agenda_historico_status_lista');
    if (!el) return;
    if (!lista.length) {
        el.innerHTML = '<div class="agenda-audit-empty">Nenhuma alteração de status registrada após a ativação da auditoria.</div>';
        return;
    }
    el.innerHTML = lista.map(item => {
        const quando = item.alterado_em ? new Date(item.alterado_em).toLocaleString('pt-BR') : '—';
        const dataAtendimento = item.agendamento_data ? formatarDataAgendaBR(item.agendamento_data) : '—';
        const hora = item.agendamento_hora_inicio ? horaCurta(item.agendamento_hora_inicio) : '';
        const ator = item.alterado_por_nome || 'Usuário não identificado';
        const papel = rotuloPerfilAuditoriaAgenda(item.alterado_por_tipo);
        const de = rotuloStatusAgenda(item.status_anterior);
        const para = rotuloStatusAgenda(item.status_novo);
        const observacao = item.observacao_nova ? `<div class="agenda-audit-obs"><strong>Observação:</strong> ${escapeHTML(item.observacao_nova)}</div>` : '';
        return `<article class="agenda-audit-item">
            <div class="agenda-audit-head"><strong>${escapeHTML(item.paciente_nome || 'Paciente')}</strong><time>${escapeHTML(quando)}</time></div>
            <div class="agenda-audit-meta">Atendimento: ${escapeHTML(dataAtendimento)}${hora ? ' às ' + escapeHTML(hora) : ''}${item.profissional_responsavel_nome ? ' · Responsável: ' + escapeHTML(item.profissional_responsavel_nome) : ''}</div>
            <div class="agenda-audit-change"><span class="badge badge-${escapeHTML(classeStatusAgenda(item.status_anterior))}">${escapeHTML(de)}</span><b>→</b><span class="badge badge-${escapeHTML(classeStatusAgenda(item.status_novo))}">${escapeHTML(para)}</span></div>
            <div class="agenda-audit-actor">Alterado por <strong>${escapeHTML(ator)}</strong> · ${escapeHTML(papel)}</div>
            ${observacao}
        </article>`;
    }).join('');
}

async function abrirHistoricoStatusAgenda(agendamentoId = null) {
    if (!usuarioEhAdministradorAgenda()) {
        alert('🔒 O histórico de alterações de status é exclusivo dos administradores.');
        return;
    }
    const modal = document.getElementById('modal_historico_status_agenda');
    const lista = document.getElementById('agenda_historico_status_lista');
    if (!modal || !lista) return;
    lista.innerHTML = '<div class="agenda-audit-empty">Carregando histórico…</div>';
    abrirModal('modal_historico_status_agenda');
    try {
        agendaHistoricoStatusCache = await consultarHistoricoStatusAgenda({ agendamentoId, limite: agendamentoId ? 60 : 150 });
        renderizarHistoricoStatusAgenda(agendaHistoricoStatusCache);
    } catch (error) {
        console.error('Agenda: falha ao carregar auditoria de status.', error);
        lista.innerHTML = `<div class="agenda-audit-empty erro">${erroSchemaAuditoriaStatusAgenda(error)
            ? 'A auditoria ainda não foi ativada no Supabase. Execute o arquivo SUPABASE_SQL/SUPABASE_MIGRACAO_AUDITORIA_STATUS_AGENDA_v1.11.2.sql.'
            : escapeHTML(error?.message || 'Não foi possível carregar o histórico agora.')}</div>`;
    }
}
if (typeof window !== 'undefined') window.abrirHistoricoStatusAgenda = abrirHistoricoStatusAgenda;

function formatarDataAgendaBR(dataISO) {
    const d = agendaDataUTC(dataISO);
    return d ? d.toLocaleDateString('pt-BR', { timeZone:'UTC' }) : String(dataISO || '');
}
function agendamentoEhHorarioExtraordinario(a) {
    if (!a) return false;
    if (a.horario_extraordinario === true) return true;
    if (a.horario_extraordinario === false) return false;
    if (!a.data || !a.profissional_id || !a.hora_inicio || !a.hora_fim) return false;
    return !intervaloDentroDaJornadaPadrao(a.profissional_id, a.data, horaCurta(a.hora_inicio), horaCurta(a.hora_fim));
}
function iconeHorarioExtraordinarioHTML(a) {
    return agendamentoEhHorarioExtraordinario(a)
        ? '<span class="agenda-extra-icone" title="Horário extraordinário — fora da jornada padrão" aria-label="Horário extraordinário">◷</span>'
        : '';
}

async function registrarNotificacaoHorarioExtraordinario(agendamento, meta = {}) {
    if (!agendamento?.id || !agendamento?.profissional_id) return { ok:false, ignorada:true };
    const profissional = agendaEquipeCache.find(p => String(p.id) === String(agendamento.profissional_id)) || {};
    const dataBR = formatarDataAgendaBR(agendamento.data);
    const feriado = obterFeriadoAgenda(agendamento.data);
    const classificacaoExtra = meta.classificacao_extraordinario || classificarHorarioExtraordinarioAgenda(
        agendamento.profissional_id, agendamento.data, horaCurta(agendamento.hora_inicio), horaCurta(agendamento.hora_fim)
    );
    const motivoExtra = String(meta.motivo_extraordinario || classificacaoExtra?.motivo || (feriado ? `feriado — ${feriado.nome}` : 'fora da jornada padrão'));
    const origem = `horario_extraordinario:${agendamento.id}`;
    const foraJornadaProfissional = ['fora_dia_profissional','fora_horario_profissional'].includes(classificacaoExtra?.tipo);
    const tituloAviso = feriado
        ? 'Agendamento extraordinário em feriado'
        : (foraJornadaProfissional ? 'Agendamento fora da sua jornada' : 'Horário fora do padrão agendado');
    const complementoProfissional = classificacaoExtra?.tipo === 'fora_dia_profissional'
        ? ' Esta data não faz parte dos seus dias regulares de atendimento cadastrados no KineSys.'
        : (classificacaoExtra?.tipo === 'fora_horario_profissional' ? ' Este horário está fora da sua jornada regular cadastrada no KineSys.' : '');
    const row = {
        id: gerarIdAgendamentoKineSys(),
        destinatario_profissional_id: String(agendamento.profissional_id),
        destinatario_email: String(profissional.email || meta.profissional_email || '').trim().toLowerCase() || null,
        tipo: 'horario_extraordinario',
        titulo: tituloAviso,
        mensagem: `${meta.paciente_nome || 'Paciente'} foi agendado para ${dataBR}, ${horaCurta(agendamento.hora_inicio)}–${horaCurta(agendamento.hora_fim)}, em horário extraordinário (${motivoExtra}).${complementoProfissional} Agendado por ${agendamento.criado_por || meta.criado_por || 'equipe da clínica'}.`,
        agendamento_id: String(agendamento.id),
        agendamento_data: agendamento.data,
        origem_chave: origem,
        criada_por: agendamento.criado_por || meta.criado_por || usuarioLogado?.nome || 'KineSys',
        lida: false
    };
    if (!_supabase) {
        enfileirarNotificacaoAgenda(row);
        return { ok:true, pendente:true };
    }
    try {
        const { error } = await _supabase.from('notificacoes_internas').upsert([row], { onConflict:'origem_chave', ignoreDuplicates:true });
        if (error) throw error;
        removerNotificacaoPendenteAgenda(origem);
        return { ok:true, pendente:false };
    } catch (error) {
        console.warn('Agenda: agendamento salvo, mas a notificação interna ficou pendente.', error);
        enfileirarNotificacaoAgenda(row);
        return { ok:true, pendente:true, error };
    }
}

function inicializarEventosDomAgenda() {
    atualizarVisibilidadeAuditoriaStatusAgenda();
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) fecharModal(overlay.id);
        });
    });
}
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', inicializarEventosDomAgenda, { once:true });
} else {
    inicializarEventosDomAgenda();
}

function fecharModal(id) {
    const el = document.getElementById(id);
    if (el) el.classList.remove('ativa');
}
function abrirModal(id) {
    const el = document.getElementById(id);
    if (el) el.classList.add('ativa');
}

function irParaSubtelaAgenda(id) {
    if (!usuarioPodeVerAgendaClinicaToda() && id !== 'agenda_painel') return;
    if (!usuarioEhAdministradorAgenda() && ['agenda_procedimentos','agenda_horarios','agenda_bloqueios'].includes(id)) return;
    document.querySelectorAll('#tela_agenda .subtela').forEach(s => s.classList.remove('ativa'));
    const alvo = document.getElementById(id);
    if (alvo) alvo.classList.add('ativa');
    document.querySelectorAll('#ks_agenda_controls .ks-segmented [data-agenda-view]').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.agendaView === id);
    });
}

/* --------------------------------------------------------------------
   INICIALIZAÇÃO
   -------------------------------------------------------------------- */
function gerarIdAgendamentoKineSys() {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

function lerAgendamentosPendentesSync() {
    try {
        const bruto = localStorage.getItem(AGENDA_SYNC_PENDENTES_KEY);
        const lista = bruto ? JSON.parse(bruto) : [];
        return Array.isArray(lista) ? lista.filter(x => x && x.payload && x.payload.id) : [];
    } catch (err) {
        console.warn('Agenda: não foi possível ler a fila local de sincronização.', err);
        return [];
    }
}

function gravarAgendamentosPendentesSync(lista) {
    try {
        localStorage.setItem(AGENDA_SYNC_PENDENTES_KEY, JSON.stringify(Array.isArray(lista) ? lista : []));
        return true;
    } catch (err) {
        console.error('Agenda: não foi possível preservar a fila local de sincronização.', err);
        return false;
    }
}

function salvarAgendamentoPendenteSync(payload, metadados = {}) {
    if (!payload?.id) return false;
    const lista = lerAgendamentosPendentesSync();
    const idx = lista.findIndex(x => String(x.payload?.id || '') === String(payload.id));
    const anterior = idx >= 0 ? lista[idx] : {};
    const item = {
        ...anterior,
        payload: { ...(anterior.payload || {}), ...payload },
        metadados: { ...(anterior.metadados || {}), ...(metadados || {}) },
        criado_em_local: anterior.criado_em_local || new Date().toISOString(),
        atualizado_em_local: new Date().toISOString(),
        tentativas: Number(anterior.tentativas || 0),
        ultimo_erro: String(metadados?.ultimo_erro || anterior.ultimo_erro || ''),
        conflito_sync: false
    };
    if (idx >= 0) lista[idx] = item;
    else lista.push(item);
    return gravarAgendamentosPendentesSync(lista);
}

function atualizarPayloadAgendamentoPendenteSync(id, alteracoes = {}) {
    const lista = lerAgendamentosPendentesSync();
    const idx = lista.findIndex(x => String(x.payload?.id || '') === String(id || ''));
    if (idx < 0) return false;
    lista[idx] = {
        ...lista[idx],
        payload: { ...(lista[idx].payload || {}), ...(alteracoes || {}) },
        atualizado_em_local: new Date().toISOString()
    };
    return gravarAgendamentosPendentesSync(lista);
}

function removerAgendamentoPendenteSync(id) {
    const lista = lerAgendamentosPendentesSync().filter(x => String(x.payload?.id || '') !== String(id || ''));
    gravarAgendamentosPendentesSync(lista);
}

function atualizarAgendamentoPendenteSync(id, alteracoes = {}) {
    const lista = lerAgendamentosPendentesSync();
    const idx = lista.findIndex(x => String(x.payload?.id || '') === String(id || ''));
    if (idx < 0) return false;
    lista[idx] = { ...lista[idx], ...alteracoes, atualizado_em_local: new Date().toISOString() };
    return gravarAgendamentosPendentesSync(lista);
}

function erroAgendaStatusCheckDesatualizado(error) {
    if (!error) return false;
    const code = String(error.code || '');
    const texto = [error.message, error.details, error.hint].filter(Boolean).join(' ');
    return code === '23514' && /agendamentos_status_check|relation [\"']?agendamentos[\"']?.*check constraint/i.test(texto);
}

function mensagemErroSalvarAgenda(error) {
    if (erroAgendaStatusCheckDesatualizado(error)) {
        return 'O banco de dados da Agenda está com a regra de status desatualizada. Execute no Supabase o arquivo SUPABASE_SQL/SUPABASE_CORRECAO_AGENDAMENTOS_STATUS_CHECK_v1.11.2.sql e tente novamente. Nenhum agendamento foi perdido.';
    }
    return error?.message || String(error || 'Erro desconhecido ao salvar o agendamento.');
}

function erroAgendaEhTransitorio(error) {
    if (!error) return false;
    const code = String(error.code || '');
    const status = Number(error.status || error.statusCode || 0);
    const texto = [error.message, error.details, error.hint, error.name].filter(Boolean).join(' ');
    if (['23502','23503','23505','23514','23P01','42501','PGRST204'].includes(code)) return false;
    if ([408, 425, 429, 500, 502, 503, 504].includes(status)) return true;
    return /failed to fetch|fetch failed|network|offline|timeout|timed out|connection|econn|load failed|gateway|temporar|service unavailable/i.test(texto)
        || (!code && !status && /typeerror/i.test(String(error.name || '')));
}

function aguardarAgenda(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function consultarAgendamentoPorId(id) {
    if (!_supabase || !id) return { data: null, error: new Error('Supabase indisponível') };
    let r = await _supabase.from('agendamentos')
        .select('id,paciente_id,profissional_id,procedimento_id,data,hora_inicio,hora_fim,status,plano_id')
        .eq('id', id).maybeSingle();
    if (r.error && /plano_id|schema cache|column .* does not exist/i.test(String(r.error.message || ''))) {
        r = await _supabase.from('agendamentos')
            .select('id,paciente_id,profissional_id,procedimento_id,data,hora_inicio,hora_fim,status')
            .eq('id', id).maybeSingle();
    }
    return r;
}

async function inserirAgendamentoNuvemConfiavel(payload, { permitirFila = true, metadados = {} } = {}) {
    if (!agendaPodeMarcarProfissional(payload.profissional_id)) return {ok:false,error:new Error('Você só pode marcar na sua própria agenda.')};
    if (!usuarioPodeVerAgendaClinicaToda()) {
        permitirFila = false;
        if (payload.plano_id || payload.status !== 'agendado') return {ok:false,error:new Error('Seu perfil pode marcar horários sem operações financeiras.')};
    }
    if (!_supabase) {
        if (permitirFila && salvarAgendamentoPendenteSync(payload, { ...metadados, ultimo_erro: 'Supabase indisponível' })) {
            return { ok: true, sincronizado: false, pendente: true, vinculoLocal: !payload.plano_id };
        }
        return { ok: false, error: new Error('Conexão com o Supabase indisponível.') };
    }

    let row = { ...payload };
    let vinculoLocal = false;
    let ultimoErro = null;

    // Duas tentativas são suficientes porque o ID é estável. Antes de reenviar,
    // sempre conferimos se a primeira tentativa já chegou ao banco.
    for (let tentativa = 1; tentativa <= 2; tentativa++) {
        let resposta = await _supabase.from('agendamentos').insert([row]).select('id').single();

        if (resposta.error && ('horario_extraordinario' in row) && /horario_extraordinario|schema cache|column .* does not exist/i.test(String(resposta.error.message || ''))) {
            delete row.horario_extraordinario;
            delete row.horario_extraordinario_confirmado_por;
            delete row.horario_extraordinario_confirmado_em;
            resposta = await _supabase.from('agendamentos').insert([row]).select('id').single();
        }

        if (resposta.error && row.plano_id && /plano_id|schema cache|column .* does not exist/i.test(String(resposta.error.message || ''))) {
            delete row.plano_id;
            vinculoLocal = true;
            if (typeof financeiroVinculoAgendaDisponivel !== 'undefined') financeiroVinculoAgendaDisponivel = false;
            resposta = await _supabase.from('agendamentos').insert([row]).select('id').single();
        }

        if (!resposta.error) {
            removerAgendamentoPendenteSync(row.id);
            return { ok: true, sincronizado: true, pendente: false, data: resposta.data, vinculoLocal };
        }

        ultimoErro = resposta.error;

        // Se a resposta do INSERT se perdeu, o registro pode já estar no Supabase.
        // Como o UUID foi criado no cliente, conseguimos conferir exatamente o mesmo registro.
        try {
            const existente = await consultarAgendamentoPorId(row.id);
            if (!existente.error && existente.data?.id) {
                removerAgendamentoPendenteSync(row.id);
                return { ok: true, sincronizado: true, pendente: false, data: existente.data, vinculoLocal };
            }
        } catch (_) {}

        if (erroEhConflitoAgenda(ultimoErro)) return { ok: false, conflito: true, error: ultimoErro };
        if (!erroAgendaEhTransitorio(ultimoErro)) return { ok: false, error: ultimoErro };
        if (tentativa < 2) await aguardarAgenda(450);
    }

    if (permitirFila && salvarAgendamentoPendenteSync(row, { ...metadados, ultimo_erro: ultimoErro?.message || String(ultimoErro || '') })) {
        return { ok: true, sincronizado: false, pendente: true, error: ultimoErro, vinculoLocal: vinculoLocal || !row.plano_id };
    }
    return { ok: false, error: ultimoErro || new Error('Não foi possível confirmar o salvamento do agendamento.') };
}

function mesclarAgendamentosPendentesNaAgenda(registros = [], inicio = null, fim = null) {
    const mapa = new Map((registros || []).map(a => [String(a.id), a]));
    const inicioISO = inicio ? formatarDataISO(inicio) : '';
    const fimISO = fim ? formatarDataISO(fim) : '';
    lerAgendamentosPendentesSync().forEach(item => {
        const p = item.payload || {};
        if (!p.id || p.status === 'cancelado') return;
        if (inicioISO && p.data < inicioISO) return;
        if (fimISO && p.data > fimISO) return;
        if (mapa.has(String(p.id))) return;
        const meta = item.metadados || {};
        mapa.set(String(p.id), {
            ...p,
            __sync_pendente: true,
            pacientes: { nome: meta.paciente_nome || 'Paciente' },
            equipe: { nome: meta.profissional_nome || 'Profissional' },
            procedimentos: { nome: meta.procedimento_nome || 'Atendimento' }
        });
    });
    return Array.from(mapa.values()).sort((a,b) => String(a.data || '').localeCompare(String(b.data || '')) || String(a.hora_inicio || '').localeCompare(String(b.hora_inicio || '')));
}

async function sincronizarAgendamentosPendentes({ silencioso = true, renderizar = true } = {}) {
    if (agendaSyncEmCurso || !_supabase) return false;
    const pendentes = lerAgendamentosPendentesSync();
    if (!pendentes.length) return true;
    agendaSyncEmCurso = true;
    let sincronizados = 0;
    let conflitos = 0;
    let falhas = 0;
    const pacientesParaListaEspera = new Set();

    try {
        for (const item of pendentes) {
            const payload = item.payload || {};
            if (!payload.id) continue;
            atualizarAgendamentoPendenteSync(payload.id, { tentativas: Number(item.tentativas || 0) + 1 });

            try {
                const existente = await consultarAgendamentoPorId(payload.id);
                if (!existente.error && existente.data?.id) {
                    removerAgendamentoPendenteSync(payload.id);
                    sincronizados++;
                    if (item.metadados?.revisar_lista_espera && payload.paciente_id) pacientesParaListaEspera.add(payload.paciente_id);
                    if (item.metadados?.horario_extraordinario) await registrarNotificacaoHorarioExtraordinario(payload, item.metadados);
                    continue;
                }
            } catch (_) {}

            const resultado = await inserirAgendamentoNuvemConfiavel(payload, { permitirFila: false, metadados: item.metadados || {} });
            if (resultado.ok && resultado.sincronizado) {
                removerAgendamentoPendenteSync(payload.id);
                sincronizados++;
                if (item.metadados?.revisar_lista_espera && payload.paciente_id) pacientesParaListaEspera.add(payload.paciente_id);
                if (item.metadados?.horario_extraordinario) await registrarNotificacaoHorarioExtraordinario(payload, item.metadados);
            } else if (resultado.conflito) {
                conflitos++;
                atualizarAgendamentoPendenteSync(payload.id, {
                    conflito_sync: true,
                    ultimo_erro: 'O horário ficou ocupado antes da sincronização.'
                });
            } else {
                falhas++;
                atualizarAgendamentoPendenteSync(payload.id, { ultimo_erro: resultado.error?.message || String(resultado.error || '') });
                // Se a rede continua ruim, não castigamos o servidor nem a recepção.
                if (erroAgendaEhTransitorio(resultado.error)) break;
            }
        }
    } finally {
        agendaSyncEmCurso = false;
    }

    if (sincronizados > 0) invalidarCacheAgendaSemana();

    if (renderizar && document.getElementById('tela_agenda')?.classList.contains('ativa')) {
        await renderizarPainelAgenda({ pularSync: true });
    }

    if (!silencioso) {
        if (conflitos) mostrarFeedbackAgenda(`${conflitos} agendamento(s) pendente(s) não puderam sincronizar porque o horário ficou ocupado. Revise a Agenda.`, 'erro');
        else if (falhas) mostrarFeedbackAgenda('Ainda existem agendamentos aguardando sincronização. O KineSys tentará novamente automaticamente.', 'aviso');
        else if (sincronizados) mostrarFeedbackAgenda(`${sincronizados} agendamento(s) sincronizado(s) com a nuvem.`, 'sucesso');
    } else if (conflitos && document.getElementById('tela_agenda')?.classList.contains('ativa')) {
        mostrarFeedbackAgenda('Há um agendamento salvo localmente que entrou em conflito durante a sincronização. Revise o horário antes de continuar.', 'erro');
    }

    // A pergunta da lista de espera só acontece depois que o agendamento está
    // efetivamente confirmado na nuvem.
    if (document.getElementById('tela_agenda')?.classList.contains('ativa')) {
        for (const pacienteId of pacientesParaListaEspera) {
            await resolverListaEsperaAposAgendamento(pacienteId);
        }
    }
    return falhas === 0 && conflitos === 0;
}

function configurarSincronizacaoConfiavelAgenda() {
    if (agendaSyncTimer) return;
    if (typeof window !== 'undefined') {
        window.addEventListener('online', () => sincronizarAgendamentosPendentes({ silencioso: false }).catch(console.warn));
        window.addEventListener('focus', () => {
            if (lerAgendamentosPendentesSync().length) sincronizarAgendamentosPendentes({ silencioso: true }).catch(console.warn);
        });
    }
    if (typeof document !== 'undefined') {
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden && lerAgendamentosPendentesSync().length) sincronizarAgendamentosPendentes({ silencioso: true }).catch(console.warn);
        });
    }
    agendaSyncTimer = setInterval(() => {
        if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return;
        if (lerAgendamentosPendentesSync().length) sincronizarAgendamentosPendentes({ silencioso: true }).catch(console.warn);
    }, 20000);
}

async function inicializarAgenda() {
    configurarSincronizacaoConfiavelAgenda();
    if (!_supabase) {
        const linha = document.getElementById('agenda_semana_grade');
        if (linha) linha.innerHTML = '<div class="agenda-vazio">Agenda indisponível: conexão com o Supabase não inicializada.</div>';
        return;
    }

    // A equipe precisa ser carregada primeiro, pois procedimentos/horários exibem
    // nomes de profissionais a partir desse cache.
    const equipeCarregada = await carregarProfissionaisAgenda();
    if (!equipeCarregada) { mostrarFeedbackAgenda('Não foi possível carregar sua agenda. Atualize e tente novamente.', 'erro'); return; }
    atualizarControlesAgendaPorPerfil();
    iniciarRelogioAgenda();
    await Promise.all([
        carregarProcedimentos(),
        carregarHorarios(),
        carregarBloqueios(),
        usuarioPodeVerAgendaClinicaToda() ? carregarListaEspera() : Promise.resolve()
    ]);

    const inputData = document.getElementById('agenda_data_input');
    if (inputData) inputData.value = formatarDataISO(agendaDataSelecionada);
    await sincronizarAgendamentosPendentes({ silencioso: true, renderizar: false });
    await renderizarPainelAgenda({ pularSync: true });
}

function formatarDataISO(d) {
    const ano = d.getFullYear();
    const mes = String(d.getMonth() + 1).padStart(2, '0');
    const dia = String(d.getDate()).padStart(2, '0');
    return `${ano}-${mes}-${dia}`;
}
function horaCurta(hhmmss) {
    if (!hhmmss) return '';
    return hhmmss.slice(0, 5);
}
function minutosParaHora(min) {
    const h = String(Math.floor(min / 60)).padStart(2, '0');
    const m = String(min % 60).padStart(2, '0');
    return `${h}:${m}`;
}
function horaParaMinutos(hhmm) {
    const [h, m] = hhmm.split(':').map(Number);
    return h * 60 + m;
}

function erroEhConflitoAgenda(error) {
    if (!error) return false;
    // 23505 = unique_violation (índice legado de mesmo horário de início)
    // 23P01 = exclusion_violation (nova trava real contra sobreposição de intervalos)
    return error.code === '23505' || error.code === '23P01' ||
        /agendamentos_(sem_conflito|sem_sobreposicao|slot_ativo)/i.test(String(error.constraint || error.message || ''));
}

/* --------------------------------------------------------------------
   PROFISSIONAIS (reaproveita tabela equipe)
   -------------------------------------------------------------------- */
async function carregarProfissionaisAgenda() {
    if (!_supabase) return false;

    // Compatibilidade com bancos antigos: `conselho` foi adicionado em uma
    // migration posterior. Se a coluna ainda não existir, a Agenda não pode
    // perder a lista inteira de profissionais — especialmente no fluxo da
    // Secretaria. Repetimos a consulta apenas com os campos legados.
    let usaControleAssistencial = true;
    let data = [], error = null;
    const identidadeInicial = String(usuarioLogado?.id || '');
    const clinicaInicial = String(usuarioLogado?.clinica_id || '');
    const resposta = await _supabase.rpc('kinesys_contexto_agenda');
    error = resposta.error;
    const contexto = resposta.data;
    if (!error && (!identidadeInicial || String(contexto?.perfil_id || '') !== identidadeInicial
        || String(contexto?.clinica_id || '') !== clinicaInicial || String(usuarioLogado?.id || '') !== identidadeInicial
        || String(usuarioLogado?.clinica_id || '') !== clinicaInicial)) error = {message:'A sessão mudou. Entre novamente.'};
    agendaContextoSeguro = error ? null : contexto;
    data = error ? [] : (contexto.profissionais || []);
    if (error) {
        console.warn('Erro ao carregar equipe para agenda:', error);
        agendaEquipeCache = [];
        const selAg = document.getElementById('ag_profissional_select');
        if (selAg) {
            selAg.innerHTML = '<option value="">Não foi possível carregar os profissionais</option>';
            selAg.disabled = true;
        }
        return false;
    }
    // A presença na lista de profissionais é uma decisão administrativa explícita,
    // independente do nível de acesso. Administrador que também atende pode ser
    // marcado; fisioterapeuta/colaborador que não realiza assistência pode ser ocultado.
    // Antes da migration, preservamos temporariamente a regra legada para não derrubar a Agenda.
    agendaEquipeCache = (data || [])
        .filter(p => usaControleAssistencial
            ? p.aparece_na_agenda === true
            : !['SECRETARIA'].includes(String(p.tipo || '').toUpperCase()))
        .sort((a, b) => String(a.nome || '').localeCompare(String(b.nome || ''), 'pt-BR'));

    const selects = ['agenda_filtro_profissional', 'ag_profissional_select', 'hor_profissional_select', 'agenda_grade_profissional', 'bloq_profissional_select', 'esp_profissional_select'];
    selects.forEach(selId => {
        const sel = document.getElementById(selId);
        if (!sel) return;
        const valorAnterior = sel.value;
        const opcaoPadraoAtual = sel.querySelector('option');
        const textoPadrao = opcaoPadraoAtual?.textContent || '-- Selecione --';
        const valorPadrao = opcaoPadraoAtual?.value || '';
        sel.innerHTML = '';

        const padrao = document.createElement('option');
        padrao.value = valorPadrao;
        padrao.textContent = textoPadrao;
        sel.appendChild(padrao);

        agendaEquipeCache.forEach(p => {
            const opt = document.createElement('option');
            opt.value = p.id;
            opt.textContent = p.nome;
            sel.appendChild(opt);
        });
        if (valorAnterior && agendaEquipeCache.some(p => String(p.id) === String(valorAnterior))) {
            sel.value = valorAnterior;
        }
    });

    // Escopo da Agenda: Administrador/Secretaria podem consultar toda a clínica
    // ou qualquer profissional. Perfis assistenciais ficam obrigatoriamente
    // vinculados ao próprio profissional, evitando exposição acidental da agenda
    // dos colegas.
    const selAgendamento = document.getElementById('ag_profissional_select');
    const filtroPrincipal = document.getElementById('agenda_filtro_profissional');
    const podeVerClinicaToda = usuarioPodeVerAgendaClinicaToda();
    const proprio = encontrarProfissionalAgendaDoUsuario();

    if (filtroPrincipal) {
        if (podeVerClinicaToda) {
            const opcaoGeral = filtroPrincipal.querySelector('option[value=""]');
            if (opcaoGeral) opcaoGeral.textContent = 'Toda a clínica';
            filtroPrincipal.disabled = false;
            filtroPrincipal.setAttribute('aria-disabled', 'false');
            // Para Administração/Secretaria, vazio é intencionalmente a visão geral.
            if (filtroPrincipal.value && !agendaEquipeCache.some(p => String(p.id) === String(filtroPrincipal.value))) filtroPrincipal.value = '';
        } else {
            filtroPrincipal.innerHTML = proprio
                ? `<option value="${escapeHTML(proprio.id)}">${escapeHTML(proprio.nome)}</option>`
                : '<option value="">Sem profissional vinculado</option>';
            filtroPrincipal.value = proprio ? String(proprio.id) : '';
            filtroPrincipal.disabled = true;
            filtroPrincipal.setAttribute('aria-disabled', 'true');
        }
    }

    if (selAgendamento) {
        if (podeVerClinicaToda) {
            selAgendamento.disabled = agendaEquipeCache.length === 0;
            selAgendamento.setAttribute('aria-disabled', selAgendamento.disabled ? 'true' : 'false');
        } else {
            selAgendamento.innerHTML = proprio
                ? `<option value="${escapeHTML(proprio.id)}">${escapeHTML(proprio.nome)}</option>`
                : '<option value="">Sem profissional vinculado</option>';
            selAgendamento.value = proprio ? String(proprio.id) : '';
            selAgendamento.disabled = true;
            selAgendamento.setAttribute('aria-disabled', 'true');
        }
    }
    atualizarIndicadorEscopoAgenda();

    const toggle = document.getElementById('proc_profissionais_toggle');
    if (toggle) {
        toggle.innerHTML = agendaEquipeCache.map(p => `
            <label>
                <input type="checkbox" value="${p.id}" class="proc-prof-check">
                <span>${escapeHTML(p.nome)}</span>
            </label>
        `).join('');
    }
    return true;
}

/* --------------------------------------------------------------------
   PROCEDIMENTOS (CRUD)
   -------------------------------------------------------------------- */
async function carregarProcedimentos() {
    if (!usuarioEhAdministradorAgenda()) {
        agendaProcedimentosCache = agendaContextoDoUsuarioAtual()?.procedimentos || [];
        popularSelectProcedimentosModal();
        return;
    }
    if (!_supabase) return;

    const buscarProcedimentosAgenda = async () => {
        const { data, error } = await _supabase.from('procedimentos').select('*').order('nome');
        if (error) throw error;
        return clonarProcedimentosAgenda(data || []);
    };

    try {
        const dados = window.KineSysDataCache?.get
            ? await window.KineSysDataCache.get({
                key:chaveCacheProcedimentosAgenda(),
                ttl:AGENDA_PROCEDIMENTOS_CACHE_TTL_MS,
                fetcher:buscarProcedimentosAgenda
            })
            : await buscarProcedimentosAgenda();
        agendaProcedimentosCache = clonarProcedimentosAgenda(dados || []);
        renderizarListaProcedimentos();
        popularSelectProcedimentosModal();
    } catch (error) {
        console.warn('Erro ao carregar procedimentos:', error);
    }
}

function renderizarListaProcedimentos() {
    const container = document.getElementById('lista_procedimentos');
    if (!container) return;
    if (!agendaProcedimentosCache.length) {
        container.innerHTML = '<div class="agenda-vazio">Nenhum procedimento cadastrado ainda.</div>';
        return;
    }
    container.innerHTML = agendaProcedimentosCache.map(p => {
        const quemAtende = (p.profissionais_ids && p.profissionais_ids.length)
            ? p.profissionais_ids.map(id => agendaEquipeCache.find(e => e.id === id)?.nome || '—').join(', ')
            : 'Qualquer profissional';
        const valor = (p.valor !== null && p.valor !== undefined) ? `· R$ ${Number(p.valor).toFixed(2)}` : '';
        return `
            <div class="item-config ${p.ativo ? '' : 'inativo'}">
                <div class="item-config-info">
                    <strong>${escapeHTML(p.nome)}</strong>
                    <span>${p.duracao_minutos} min ${valor} · ${escapeHTML(quemAtende)}${p.ativo ? '' : ' · (inativo)'}</span>
                </div>
                <div class="item-config-acoes">
                    <button onclick="abrirModalProcedimento('${p.id}')">Editar</button>
                    <button onclick="alternarAtivoProcedimento('${p.id}', ${!p.ativo})">${p.ativo ? 'Desativar' : 'Ativar'}</button>
                    <button onclick="excluirProcedimento('${p.id}')">Excluir</button>
                </div>
            </div>
        `;
    }).join('');
}

function popularSelectProcedimentosModal() {
    const opts = '<option value="">-- Selecione --</option>' +
        agendaProcedimentosCache.filter(p => p.ativo).map(p =>
            `<option value="${p.id}" data-duracao="${p.duracao_minutos}">${escapeHTML(p.nome)} (${p.duracao_minutos} min)</option>`
        ).join('');
    const selAg = document.getElementById('ag_procedimento_select');
    if (selAg) selAg.innerHTML = opts;
    const selEsp = document.getElementById('esp_procedimento_select');
    if (selEsp) selEsp.innerHTML = '<option value="">Qualquer procedimento</option>' +
        agendaProcedimentosCache.filter(p => p.ativo).map(p => `<option value="${p.id}">${escapeHTML(p.nome)}</option>`).join('');
}

function abrirModalProcedimento(id) {
    document.getElementById('proc_id').value = id || '';
    document.querySelectorAll('.proc-prof-check').forEach(c => c.checked = false);
    if (id) {
        const p = agendaProcedimentosCache.find(x => x.id === id);
        if (!p) return;
        document.getElementById('modal_procedimento_titulo').textContent = 'Editar Procedimento';
        document.getElementById('proc_nome').value = p.nome;
        document.getElementById('proc_duracao').value = p.duracao_minutos;
        document.getElementById('proc_valor').value = p.valor ?? '';
        (p.profissionais_ids || []).forEach(pid => {
            const chk = document.querySelector(`.proc-prof-check[value="${pid}"]`);
            if (chk) chk.checked = true;
        });
    } else {
        document.getElementById('modal_procedimento_titulo').textContent = 'Novo Procedimento';
        document.getElementById('proc_nome').value = '';
        document.getElementById('proc_duracao').value = '';
        document.getElementById('proc_valor').value = '';
    }
    abrirModal('modal_procedimento');
}

async function salvarProcedimento() {
    const id = document.getElementById('proc_id').value;
    const nome = document.getElementById('proc_nome').value.trim();
    const duracao = parseInt(document.getElementById('proc_duracao').value, 10);
    const valorRaw = document.getElementById('proc_valor').value;
    const valor = valorRaw !== '' ? parseFloat(valorRaw) : null;
    const profissionaisIds = Array.from(document.querySelectorAll('.proc-prof-check:checked')).map(c => c.value);

    if (!nome) { alert('⚠️ Informe o nome do procedimento.'); return; }
    if (!duracao || duracao < 5) { alert('⚠️ Informe uma duração válida (mínimo 5 minutos).'); return; }

    const registro = { nome, duracao_minutos: duracao, valor, profissionais_ids: profissionaisIds };

    try {
        let error;
        if (id) {
            ({ error } = await _supabase.from('procedimentos').update(registro).eq('id', id));
        } else {
            registro.ativo = true;
            ({ error } = await _supabase.from('procedimentos').insert([registro]));
        }
        if (error) throw error;
        invalidarCacheProcedimentosAgenda();
        fecharModal('modal_procedimento');
        await carregarProcedimentos();
    } catch (err) {
        alert('❌ Erro ao salvar procedimento: ' + (err.message || err));
    }
}

async function alternarAtivoProcedimento(id, novoValor) {
    const { error } = await _supabase.from('procedimentos').update({ ativo: novoValor }).eq('id', id);
    if (error) { alert('❌ Erro ao atualizar procedimento.'); return; }
    invalidarCacheProcedimentosAgenda();
    await carregarProcedimentos();
}

async function excluirProcedimento(id) {
    if (!(await confirmarKineSys('Excluir este procedimento definitivamente? Agendamentos já feitos com ele não serão apagados.', {titulo:'Excluir procedimento', confirmar:'Excluir', destrutivo:true}))) return;
    const { error } = await _supabase.from('procedimentos').delete().eq('id', id);
    if (error) { alert('❌ Não foi possível excluir (pode haver agendamentos vinculados). Considere apenas desativar.'); return; }
    invalidarCacheProcedimentosAgenda();
    await carregarProcedimentos();
}

/* --------------------------------------------------------------------
   HORÁRIOS DE ATENDIMENTO (CRUD)
   -------------------------------------------------------------------- */
async function carregarHorarios() {
    if (!usuarioEhAdministradorAgenda()) {
        agendaHorariosCache = agendaContextoDoUsuarioAtual()?.horarios || [];
        
        return;
    }
    if (!_supabase) return;
    const { data, error } = await _supabase.from('horarios_atendimento').select('*').order('dia_semana').order('hora_inicio');
    if (error) { console.warn('Erro ao carregar horários:', error); return; }
    agendaHorariosCache = data || [];
    renderizarListaHorarios();
    carregarEditorGradeSemanal();
}

function renderizarListaHorarios() {
    const container = document.getElementById('lista_horarios');
    if (!container) return;
    if (!agendaHorariosCache.length) {
        container.innerHTML = '<div class="agenda-vazio">Nenhuma janela de atendimento definida — a agenda pública não terá horários disponíveis até que isso seja configurado.</div>';
        return;
    }
    container.innerHTML = agendaHorariosCache.map(h => {
        const prof = h.profissional_id ? (agendaEquipeCache.find(e => e.id === h.profissional_id)?.nome || '—') : 'Geral da clínica';
        return `
            <div class="item-config">
                <div class="item-config-info">
                    <strong>${DIAS_SEMANA_NOMES[h.dia_semana]}</strong>
                    <span>${horaCurta(h.hora_inicio)} – ${horaCurta(h.hora_fim)} · ${escapeHTML(prof)}</span>
                </div>
                <div class="item-config-acoes">
                    <button onclick="excluirHorario('${h.id}')">Excluir</button>
                </div>
            </div>
        `;
    }).join('');
}


const AGENDA_DIAS_EDITOR = [
    [1,'Segunda-feira'],[2,'Terça-feira'],[3,'Quarta-feira'],[4,'Quinta-feira'],[5,'Sexta-feira'],[6,'Sábado'],[0,'Domingo']
];

function horariosExatosDoEditor(diaSemana, profissionalId) {
    return agendaHorariosCache
        .filter(h => h.dia_semana === diaSemana && String(h.profissional_id || '') === String(profissionalId || ''))
        .sort((a,b) => String(a.hora_inicio || '').localeCompare(String(b.hora_inicio || '')));
}

function renderizarEditorGradeSemanal(containerId, profissionalId = '') {
    const container = document.getElementById(containerId);
    if (!container) return;
    const cab = `<div class="ks-week-headers"><span>Dia</span><span>1º período</span><span>2º período</span></div>`;
    const linhas = AGENDA_DIAS_EDITOR.map(([dia,nome]) => {
        const itens = horariosExatosDoEditor(dia, profissionalId);
        const p1 = itens[0] || {};
        const p2 = itens[1] || {};
        const extra = itens.length > 2 ? `<small title="Ao salvar, a grade será substituída pelos dois períodos exibidos">+${itens.length-2} registro(s) antigo(s)</small>` : '';
        return `<div class="ks-week-row" data-dia="${dia}">
            <div class="ks-week-day">${nome}${extra}</div>
            <input type="time" data-grade="inicio1" value="${horaCurta(p1.hora_inicio || '')}" aria-label="${nome}: início do primeiro período">
            <div class="ks-week-sep">às</div>
            <input type="time" data-grade="fim1" value="${horaCurta(p1.hora_fim || '')}" aria-label="${nome}: fim do primeiro período">
            <div class="ks-week-break">e</div>
            <input type="time" data-grade="inicio2" value="${horaCurta(p2.hora_inicio || '')}" aria-label="${nome}: início do segundo período">
            <div class="ks-week-sep">às</div>
            <input type="time" data-grade="fim2" value="${horaCurta(p2.hora_fim || '')}" aria-label="${nome}: fim do segundo período">
        </div>`;
    }).join('');
    container.innerHTML = cab + linhas;
}

function carregarEditorGradeSemanal() {
    // Nível 1: horário de funcionamento da clínica.
    renderizarEditorGradeSemanal('agenda_grade_semanal_editor', '');

    // Nível 2: jornada recorrente do profissional selecionado.
    const profissionalId = document.getElementById('agenda_grade_profissional')?.value || '';
    const containerProf = document.getElementById('agenda_grade_profissional_editor');
    const vazioProf = document.getElementById('agenda_profissional_sem_selecao');
    const statusProf = document.getElementById('agenda_grade_profissional_status');
    if (!profissionalId) {
        if (containerProf) containerProf.innerHTML = '';
        if (vazioProf) vazioProf.hidden = false;
        if (statusProf) statusProf.textContent = 'Selecione um profissional para configurar a jornada individual.';
        return;
    }
    if (vazioProf) vazioProf.hidden = true;
    renderizarEditorGradeSemanal('agenda_grade_profissional_editor', profissionalId);
    if (statusProf) {
        const possuiGrade = agendaHorariosCache.some(h => String(h.profissional_id || '') === String(profissionalId));
        statusProf.textContent = possuiGrade
            ? 'Grade própria ativa. A agenda respeitará a interseção entre esta jornada e o horário da clínica.'
            : 'Sem grade própria: este profissional herda o horário da clínica. Salve uma grade abaixo para limitar a jornada dele.';
    }
}

function feedbackGradeSemanal(texto, tipo='info') {
    const el = document.getElementById('agenda_grade_feedback');
    if (!el) return;
    el.className = `agenda-feedback ${tipo}`;
    el.textContent = texto || '';
}

function coletarGradeSemanalEditor(containerId = 'agenda_grade_semanal_editor') {
    const registros = [];
    const erros = [];
    document.querySelectorAll(`#${containerId} .ks-week-row`).forEach(row => {
        const dia = Number(row.dataset.dia);
        const nome = AGENDA_DIAS_EDITOR.find(x => x[0] === dia)?.[1] || 'Dia';
        const pares = [
            [row.querySelector('[data-grade="inicio1"]')?.value || '', row.querySelector('[data-grade="fim1"]')?.value || ''],
            [row.querySelector('[data-grade="inicio2"]')?.value || '', row.querySelector('[data-grade="fim2"]')?.value || '']
        ];
        const validos = [];
        pares.forEach(([inicio,fim], idx) => {
            if (!inicio && !fim) return;
            if (!inicio || !fim) { erros.push(`${nome}: complete início e fim do ${idx+1}º período.`); return; }
            if (horaParaMinutos(inicio) >= horaParaMinutos(fim)) { erros.push(`${nome}: o início precisa ser anterior ao fim.`); return; }
            validos.push([inicio,fim]);
        });
        validos.sort((x,y)=>horaParaMinutos(x[0])-horaParaMinutos(y[0]));
        if (validos.length === 2 && horaParaMinutos(validos[1][0]) < horaParaMinutos(validos[0][1])) erros.push(`${nome}: os dois períodos não podem se sobrepor.`);
        validos.forEach(([hora_inicio,hora_fim]) => registros.push({dia_semana:dia,hora_inicio,hora_fim}));
    });
    return {registros, erros};
}

async function salvarGradeSemanalAlvo(profissionalId, containerId, feedbackId, nomeAlvo) {
    if (!_supabase) { alert('❌ Agenda indisponível: conexão com o banco não inicializada.'); return; }
    const {registros, erros} = coletarGradeSemanalEditor(containerId);
    if (erros.length) {
        feedbackGradeSemanalAlvo(feedbackId, erros[0], 'erro');
        alert('⚠️ ' + erros[0]);
        return;
    }

    // A jornada individual nunca pode abrir a clínica fora do expediente geral.
    if (profissionalId) {
        const foraDaClinica = registros.find(r => {
            const gerais = agendaHorariosCache.filter(h => h.dia_semana === r.dia_semana && !h.profissional_id);
            if (!gerais.length) return true;
            const ini = horaParaMinutos(r.hora_inicio), fim = horaParaMinutos(r.hora_fim);
            return !gerais.some(g => ini >= horaParaMinutos(horaCurta(g.hora_inicio)) && fim <= horaParaMinutos(horaCurta(g.hora_fim)));
        });
        if (foraDaClinica) {
            const nomeDia = DIAS_SEMANA_NOMES[foraDaClinica.dia_semana];
            const msg = `${nomeDia}: a jornada do profissional precisa ficar dentro do horário de funcionamento da clínica.`;
            feedbackGradeSemanalAlvo(feedbackId, msg, 'erro');
            alert('⚠️ ' + msg);
            return;
        }
    }

    if (!(await confirmarKineSys(`Salvar a grade semanal de ${nomeAlvo}? Os horários atuais desta mesma grade serão substituídos.`, {titulo:'Salvar grade semanal', confirmar:'Salvar grade'}))) return;
    feedbackGradeSemanalAlvo(feedbackId, 'Salvando grade semanal…','info');
    try {
        let q = _supabase.from('horarios_atendimento').delete();
        q = profissionalId ? q.eq('profissional_id', profissionalId) : q.is('profissional_id', null);
        const { error: erroDelete } = await q;
        if (erroDelete) throw erroDelete;
        if (registros.length) {
            const payload = registros.map(r => ({...r, profissional_id: profissionalId || null}));
            const { error: erroInsert } = await _supabase.from('horarios_atendimento').insert(payload);
            if (erroInsert) throw erroInsert;
        }
        await carregarHorarios();
        await renderizarPainelAgenda();
        feedbackGradeSemanalAlvo(feedbackId, 'Grade semanal salva.','sucesso');
        alert('✅ Grade semanal salva com sucesso.');
    } catch (err) {
        console.error('Erro ao salvar grade semanal:', err);
        feedbackGradeSemanalAlvo(feedbackId, 'Não foi possível salvar a grade semanal.','erro');
        alert('❌ Não foi possível salvar a grade semanal. ' + (err.message || err));
    }
}

function feedbackGradeSemanalAlvo(id, texto, tipo='info') {
    const el = document.getElementById(id);
    if (!el) return;
    el.className = `agenda-feedback ${tipo}`;
    el.textContent = texto || '';
}

async function salvarGradeClinica() {
    return salvarGradeSemanalAlvo(null, 'agenda_grade_semanal_editor', 'agenda_grade_feedback', 'clínica');
}

async function salvarGradeProfissional() {
    const profissionalId = document.getElementById('agenda_grade_profissional')?.value || '';
    if (!profissionalId) {
        feedbackGradeSemanalAlvo('agenda_grade_profissional_feedback', 'Selecione um profissional antes de salvar.', 'erro');
        alert('⚠️ Selecione um profissional.');
        return;
    }
    const nomeAlvo = agendaEquipeCache.find(p=>String(p.id)===String(profissionalId))?.nome || 'profissional';
    return salvarGradeSemanalAlvo(profissionalId, 'agenda_grade_profissional_editor', 'agenda_grade_profissional_feedback', nomeAlvo);
}

// Compatibilidade com chamadas antigas: salva a grade da clínica.
async function salvarGradeSemanal() {
    return salvarGradeClinica();
}

function abrirModalHorario() {
    document.getElementById('hor_id').value = '';
    document.getElementById('hor_profissional_select').value = '';
    document.getElementById('hor_dia_semana').value = '1';
    document.getElementById('hor_inicio').value = '';
    document.getElementById('hor_fim').value = '';
    abrirModal('modal_horario');
}

async function salvarHorario() {
    const profissionalId = document.getElementById('hor_profissional_select').value || null;
    const diaSemana = parseInt(document.getElementById('hor_dia_semana').value, 10);
    const inicio = document.getElementById('hor_inicio').value;
    const fim = document.getElementById('hor_fim').value;

    if (!inicio || !fim) { alert('⚠️ Informe início e fim da janela.'); return; }
    if (horaParaMinutos(inicio) >= horaParaMinutos(fim)) { alert('⚠️ O horário de início precisa ser antes do horário de fim.'); return; }

    try {
        const { error } = await _supabase.from('horarios_atendimento').insert([{
            profissional_id: profissionalId, dia_semana: diaSemana, hora_inicio: inicio, hora_fim: fim
        }]);
        if (error) throw error;
        fecharModal('modal_horario');
        await carregarHorarios();
    } catch (err) {
        alert('❌ Erro ao salvar janela de horário: ' + (err.message || err));
    }
}

async function excluirHorario(id) {
    if (!(await confirmarKineSys('Remover esta janela de atendimento?', {titulo:'Remover horário', confirmar:'Remover', destrutivo:true}))) return;
    const { error } = await _supabase.from('horarios_atendimento').delete().eq('id', id);
    if (error) { alert('❌ Erro ao excluir horário.'); return; }
    await carregarHorarios();
}

/* --------------------------------------------------------------------
   BLOQUEIOS (folgas, feriados, imprevistos)
   -------------------------------------------------------------------- */
async function carregarBloqueios() {
    if (!usuarioEhAdministradorAgenda()) {
        agendaBloqueiosCache = agendaContextoDoUsuarioAtual()?.bloqueios || [];
        
        return;
    }
    if (!_supabase) return;
    const { data, error } = await _supabase.from('bloqueios_agenda').select('*').order('data');
    if (error) { console.warn('Erro ao carregar bloqueios:', error); return; }
    agendaBloqueiosCache = data || [];
    renderizarListaBloqueios();
}

function renderizarListaBloqueios() {
    const container = document.getElementById('lista_bloqueios');
    if (!container) return;
    if (!agendaBloqueiosCache.length) {
        container.innerHTML = '<div class="agenda-vazio">Nenhum bloqueio cadastrado.</div>';
        return;
    }
    container.innerHTML = agendaBloqueiosCache.map(b => {
        const prof = b.profissional_id ? (agendaEquipeCache.find(e => e.id === b.profissional_id)?.nome || '—') : 'Toda a clínica';
        const tipoBloqueio = b.profissional_id ? 'Ausência individual' : 'Bloqueio da clínica';
        const periodo = (b.hora_inicio && b.hora_fim) ? `${horaCurta(b.hora_inicio)} – ${horaCurta(b.hora_fim)}` : 'Dia todo';
        const dataFormatada = new Date(b.data + 'T00:00:00').toLocaleDateString('pt-BR');
        return `
            <div class="item-config">
                <div class="item-config-info">
                    <strong>${dataFormatada} · ${periodo}</strong>
                    <span>${escapeHTML(tipoBloqueio)} · ${escapeHTML(prof)} — ${escapeHTML(b.motivo || 'Sem motivo informado')}</span>
                </div>
                <div class="item-config-acoes">
                    <button onclick="excluirBloqueio('${b.id}')">Excluir</button>
                </div>
            </div>
        `;
    }).join('');
}

function abrirModalBloqueio() {
    document.getElementById('bloq_id').value = '';
    document.getElementById('bloq_profissional_select').value = '';
    document.getElementById('bloq_data').value = formatarDataISO(agendaDataSelecionada);
    document.getElementById('bloq_inicio').value = '';
    document.getElementById('bloq_fim').value = '';
    document.getElementById('bloq_motivo').value = '';
    abrirModal('modal_bloqueio');
}

async function salvarBloqueio() {
    const profissionalId = document.getElementById('bloq_profissional_select').value || null;
    const data = document.getElementById('bloq_data').value;
    const inicio = document.getElementById('bloq_inicio').value || null;
    const fim = document.getElementById('bloq_fim').value || null;
    const motivo = document.getElementById('bloq_motivo').value.trim();

    if (!data) { alert('⚠️ Informe a data do bloqueio.'); return; }
    if ((inicio && !fim) || (!inicio && fim)) { alert('⚠️ Informe início e fim, ou deixe os dois vazios para bloquear o dia todo.'); return; }
    if (inicio && fim && horaParaMinutos(inicio) >= horaParaMinutos(fim)) { alert('⚠️ O início da ausência precisa ser anterior ao fim.'); return; }

    try {
        const { error } = await _supabase.from('bloqueios_agenda').insert([{
            profissional_id: profissionalId, data, hora_inicio: inicio, hora_fim: fim, motivo
        }]);
        if (error) throw error;
        fecharModal('modal_bloqueio');
        await carregarBloqueios();
        await renderizarPainelAgenda();
    } catch (err) {
        alert('❌ Erro ao salvar bloqueio: ' + (err.message || err));
    }
}

async function excluirBloqueio(id) {
    if (!(await confirmarKineSys('Remover este bloqueio?', {titulo:'Remover bloqueio', confirmar:'Remover', destrutivo:true}))) return;
    const { error } = await _supabase.from('bloqueios_agenda').delete().eq('id', id);
    if (error) { alert('❌ Erro ao excluir bloqueio.'); return; }
    await carregarBloqueios();
    await renderizarPainelAgenda();
}

/* --------------------------------------------------------------------
   DISPONIBILIDADE + GRADE SEMANAL
   -------------------------------------------------------------------- */
function inicioSemanaAgenda(data) {
    const d = new Date(data);
    d.setHours(0, 0, 0, 0);
    const dia = d.getDay();
    const delta = dia === 0 ? -6 : 1 - dia; // segunda-feira
    d.setDate(d.getDate() + delta);
    return d;
}

function somarDiasAgenda(data, dias) {
    const d = new Date(data);
    d.setDate(d.getDate() + dias);
    return d;
}

function mostrarFeedbackAgenda(texto, tipo = 'info') {
    const el = document.getElementById('agenda_feedback');
    if (!el) return;
    el.className = 'agenda-feedback ' + (tipo || '');
    el.textContent = texto || '';
}

function mostrarFeedbackAgendaModal(texto, tipo = 'info') {
    const el = document.getElementById('ag_feedback');
    if (!el) return;
    el.className = 'agenda-modal-feedback ' + (tipo || '');
    el.textContent = texto || '';
}

function intersectarJanelasAgenda(janelasA, janelasB) {
    const resultado = [];
    (janelasA || []).forEach(a => {
        const ai = horaParaMinutos(horaCurta(a.hora_inicio));
        const af = horaParaMinutos(horaCurta(a.hora_fim));
        (janelasB || []).forEach(b => {
            const bi = horaParaMinutos(horaCurta(b.hora_inicio));
            const bf = horaParaMinutos(horaCurta(b.hora_fim));
            const inicio = Math.max(ai, bi);
            const fim = Math.min(af, bf);
            if (inicio < fim) resultado.push({
                dia_semana: a.dia_semana ?? b.dia_semana ?? null,
                profissional_id: b.profissional_id || a.profissional_id || null,
                hora_inicio: minutosParaHora(inicio),
                hora_fim: minutosParaHora(fim)
            });
        });
    });
    const unicas = new Map(resultado.map(j => [`${j.hora_inicio}-${j.hora_fim}`, j]));
    return Array.from(unicas.values()).sort((x,y)=>String(x.hora_inicio).localeCompare(String(y.hora_inicio)));
}

// --------------------------------------------------------------------
// FERIADOS — Brasil + Município de Montes Claros/MG
// A agenda padrão fica automaticamente fechada em feriados. Pontos
// facultativos NÃO entram nesta regra. Uma exceção só pode ser criada pelo
// fluxo explícito de "horário extraordinário", que gera aviso ao profissional.
// --------------------------------------------------------------------
const agendaFeriadosCachePorAno = new Map();

function dataISOAgendaUTC(data) {
    if (!(data instanceof Date) || Number.isNaN(data.getTime())) return '';
    return `${data.getUTCFullYear()}-${String(data.getUTCMonth()+1).padStart(2,'0')}-${String(data.getUTCDate()).padStart(2,'0')}`;
}

function calcularPascoaAgenda(ano) {
    // Algoritmo gregoriano de Meeus/Jones/Butcher.
    const a = ano % 19;
    const b = Math.floor(ano / 100);
    const c = ano % 100;
    const d = Math.floor(b / 4);
    const e = b % 4;
    const f = Math.floor((b + 8) / 25);
    const g = Math.floor((b - f + 1) / 3);
    const h = (19 * a + b - d - g + 15) % 30;
    const i = Math.floor(c / 4);
    const k = c % 4;
    const l = (32 + 2 * e + 2 * i - h - k) % 7;
    const m = Math.floor((a + 11 * h + 22 * l) / 451);
    const mes = Math.floor((h + l - 7 * m + 114) / 31);
    const dia = ((h + l - 7 * m + 114) % 31) + 1;
    return new Date(Date.UTC(ano, mes - 1, dia));
}

function montarFeriadosAgendaAno(ano) {
    const mapa = new Map();
    const adicionar = (dataISO, nome, tipo) => mapa.set(dataISO, { data:dataISO, nome, tipo });
    const fixosNacionais = [
        ['01-01','Confraternização Universal'],
        ['04-21','Tiradentes'],
        ['05-01','Dia do Trabalho'],
        ['09-07','Independência do Brasil'],
        ['10-12','Nossa Senhora Aparecida'],
        ['11-02','Finados'],
        ['11-15','Proclamação da República'],
        ['11-20','Dia Nacional de Zumbi e da Consciência Negra'],
        ['12-25','Natal']
    ];
    fixosNacionais.forEach(([md,nome]) => adicionar(`${ano}-${md}`, nome, 'nacional'));

    // Datas móveis reconhecidas no calendário oficial de Montes Claros.
    const pascoa = calcularPascoaAgenda(ano);
    const sextaSanta = new Date(pascoa.getTime()); sextaSanta.setUTCDate(sextaSanta.getUTCDate() - 2);
    const corpusChristi = new Date(pascoa.getTime()); corpusChristi.setUTCDate(corpusChristi.getUTCDate() + 60);
    adicionar(dataISOAgendaUTC(sextaSanta), 'Sexta-feira Santa', 'oficial_montes_claros');
    adicionar(dataISOAgendaUTC(corpusChristi), 'Corpus Christi', 'municipal');

    // Feriado municipal fixo de Montes Claros.
    adicionar(`${ano}-07-03`, 'Aniversário de Montes Claros', 'municipal');
    return mapa;
}

function obterFeriadoAgenda(dataISO) {
    const m = String(dataISO || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!m) return null;
    const ano = Number(m[1]);
    if (!agendaFeriadosCachePorAno.has(ano)) agendaFeriadosCachePorAno.set(ano, montarFeriadosAgendaAno(ano));
    return agendaFeriadosCachePorAno.get(ano).get(String(dataISO)) || null;
}

function rotuloTipoFeriadoAgenda(feriado) {
    if (!feriado) return '';
    if (feriado.tipo === 'nacional') return 'Feriado nacional';
    if (feriado.tipo === 'municipal') return 'Feriado municipal';
    return 'Feriado oficial em Montes Claros';
}

function obterContextoJornadaProfissionalAgenda(profissionalId, dataISO) {
    const d = agendaDataUTC(dataISO);
    if (!d || !profissionalId) return {
        valido:false, diaSemana:null, nomeDia:'', possuiJornadaPropria:false,
        janelasClinica:[], janelasProfissional:[], semAtendimentoNoDia:false
    };
    const diaSemana = d.getUTCDay();
    const pid = String(profissionalId);
    const todasProfissional = agendaHorariosCache.filter(h => String(h.profissional_id || '') === pid);
    const janelasProfissional = todasProfissional.filter(h => h.dia_semana === diaSemana);
    const janelasClinica = agendaHorariosCache.filter(h => h.dia_semana === diaSemana && !h.profissional_id);
    const possuiJornadaPropria = todasProfissional.length > 0;
    return {
        valido:true,
        diaSemana,
        nomeDia:DIAS_SEMANA_NOMES[diaSemana] || 'dia selecionado',
        possuiJornadaPropria,
        todasProfissional,
        janelasProfissional,
        janelasClinica,
        semAtendimentoNoDia: possuiJornadaPropria && janelasProfissional.length === 0
    };
}

function intervaloContidoEmJanelasAgenda(horaInicio, horaFim, janelas = []) {
    const ini = horaParaMinutos(horaInicio);
    const fim = horaParaMinutos(horaFim);
    if (!Number.isFinite(ini) || !Number.isFinite(fim) || fim <= ini) return false;
    return (janelas || []).some(j =>
        ini >= horaParaMinutos(horaCurta(j.hora_inicio)) && fim <= horaParaMinutos(horaCurta(j.hora_fim))
    );
}

function classificarHorarioExtraordinarioAgenda(profissionalId, dataISO, horaInicio, horaFim) {
    const feriado = obterFeriadoAgenda(dataISO);
    if (feriado) return {
        tipo:'feriado',
        motivo:`${rotuloTipoFeriadoAgenda(feriado).toLowerCase()} — ${feriado.nome}`,
        feriado
    };

    const contexto = obterContextoJornadaProfissionalAgenda(profissionalId, dataISO);
    const profissional = agendaEquipeCache.find(p => String(p.id) === String(profissionalId)) || {};
    const nomeProfissional = profissional.nome || 'profissional';
    if (contexto.semAtendimentoNoDia) {
        return {
            tipo:'fora_dia_profissional',
            motivo:`fora do dia de atendimento de ${nomeProfissional} (${contexto.nomeDia})`,
            contexto
        };
    }
    if (contexto.possuiJornadaPropria && !intervaloContidoEmJanelasAgenda(horaInicio, horaFim, contexto.janelasProfissional)) {
        return {
            tipo:'fora_horario_profissional',
            motivo:`fora do horário de atendimento de ${nomeProfissional}`,
            contexto
        };
    }
    if (!intervaloContidoEmJanelasAgenda(horaInicio, horaFim, contexto.janelasClinica)) {
        return { tipo:'fora_horario_clinica', motivo:'fora do horário de funcionamento da clínica', contexto };
    }
    return { tipo:'fora_padrao', motivo:'fora da jornada padrão da clínica/profissional', contexto };
}

function motivoHorarioExtraordinarioAgenda(profissionalId, dataISO, horaInicio, horaFim) {
    return classificarHorarioExtraordinarioAgenda(profissionalId, dataISO, horaInicio, horaFim).motivo;
}

function janelasAgendaPara(diaSemana, profissionalId) {
    // A clínica é a camada superior e define quando o estabelecimento está aberto.
    const gerais = agendaHorariosCache.filter(h => h.dia_semana === diaSemana && !h.profissional_id);

    // Na visão geral, nunca usamos horários individuais para "abrir" a clínica.
    if (!profissionalId) return gerais;

    const pid = String(profissionalId);
    const gradeCompletaProfissional = agendaHorariosCache.filter(h => String(h.profissional_id || '') === pid);

    // Só herda o expediente geral quando o profissional NÃO possui grade própria.
    // Antes desta correção a herança era decidida dia a dia: um profissional
    // cadastrado apenas na segunda-feira acabava herdando, por engano, a terça,
    // quarta etc. da clínica.
    if (!gradeCompletaProfissional.length) return gerais;

    const especificas = gradeCompletaProfissional.filter(h => h.dia_semana === diaSemana);

    // Possui grade própria, mas nenhum período neste dia = não atende nesse dia.
    if (!especificas.length) return [];

    // Com jornada própria, a disponibilidade real é clínica ∩ profissional.
    // Isso impede que a grade individual abra a clínica fora do expediente geral.
    return intersectarJanelasAgenda(gerais, especificas);
}

function intervaloDentroDaJornadaPadrao(profissionalId, dataISO, horaInicio, horaFim) {
    const d = agendaDataUTC(dataISO);
    if (!d || !profissionalId || !horaInicio || !horaFim) return false;
    // Feriado fecha a agenda padrão, ainda que o mesmo dia da semana possua
    // jornada cadastrada. O bypass existe somente no fluxo extraordinário.
    if (obterFeriadoAgenda(dataISO)) return false;
    const ini = horaParaMinutos(horaInicio);
    const fim = horaParaMinutos(horaFim);
    return janelasAgendaPara(d.getUTCDay(), profissionalId).some(j =>
        ini >= horaParaMinutos(horaCurta(j.hora_inicio)) && fim <= horaParaMinutos(horaCurta(j.hora_fim))
    );
}

function bloqueiosAgendaPara(dataISO, profissionalId) {
    if (!profissionalId) {
        // Na visão geral, apenas bloqueios da clínica inteira devem escurecer a coluna.
        return agendaBloqueiosCache.filter(b => b.data === dataISO && !b.profissional_id);
    }
    return agendaBloqueiosCache.filter(b =>
        b.data === dataISO && (!b.profissional_id || b.profissional_id === profissionalId)
    );
}

function minutoDentroDeJanela(minuto, janelas) {
    return janelas.some(j => {
        const ini = horaParaMinutos(horaCurta(j.hora_inicio));
        const fim = horaParaMinutos(horaCurta(j.hora_fim));
        return minuto >= ini && minuto < fim;
    });
}

function bloqueioNoMinuto(minuto, bloqueios) {
    return bloqueios.find(b => {
        if (!b.hora_inicio || !b.hora_fim) return true;
        const ini = horaParaMinutos(horaCurta(b.hora_inicio));
        const fim = horaParaMinutos(horaCurta(b.hora_fim));
        return minuto >= ini && minuto < fim;
    }) || null;
}

function calcularSlotsLivres(profissionalId, dataISO, duracaoMin, agendamentosBase = null) {
    if (!profissionalId || !dataISO || !duracaoMin) return [];
    // Em feriado, a lista padrão deve permanecer vazia. Para exceções, o
    // usuário precisa ativar explicitamente o horário extraordinário.
    if (obterFeriadoAgenda(dataISO)) return [];
    const diaSemana = new Date(dataISO + 'T00:00:00').getDay();
    const janelas = janelasAgendaPara(diaSemana, profissionalId);
    if (!janelas.length) return [];

    const bloqueiosDoDia = bloqueiosAgendaPara(dataISO, profissionalId);
    const fonteAgendamentos = Array.isArray(agendamentosBase) ? agendamentosBase : agendaAgendamentosDoDiaCache;
    const ocupados = fonteAgendamentos.filter(a =>
        a.profissional_id === profissionalId && a.data === dataISO && statusAgendaOcupaHorario(a.status)
    ).map(a => [horaParaMinutos(horaCurta(a.hora_inicio)), horaParaMinutos(horaCurta(a.hora_fim))]);

    bloqueiosDoDia.forEach(b => {
        if (b.hora_inicio && b.hora_fim) {
            ocupados.push([horaParaMinutos(horaCurta(b.hora_inicio)), horaParaMinutos(horaCurta(b.hora_fim))]);
        } else {
            ocupados.push([0, 24 * 60]);
        }
    });

    const livres = [];

    janelas.forEach(j => {
        const inicioJanela = horaParaMinutos(horaCurta(j.hora_inicio));
        const fimJanela = horaParaMinutos(horaCurta(j.hora_fim));
        // O passo acompanha a duração do procedimento (ex.: 60 min = 07:00, 08:00, 09:00...).
        for (let ini = inicioJanela; ini + duracaoMin <= fimJanela; ini += duracaoMin) {
            const fimSlot = ini + duracaoMin;
            const conflita = ocupados.some(([oi, of]) => ini < of && fimSlot > oi);
            if (!conflita) livres.push({ inicio: minutosParaHora(ini), fim: minutosParaHora(fimSlot) });
        }
    });

    // Remove duplicatas quando houver janelas adjacentes/sobrepostas.
    const unicos = new Map(livres.map(l => [`${l.inicio}|${l.fim}`, l]));
    return Array.from(unicos.values()).sort((a, b) => a.inicio.localeCompare(b.inicio));
}

function diasVisiveisDaSemana(inicio, profissionalId) {
    if (agendaPeriodoVisual === 'dia') {
        const data = new Date(agendaDataSelecionada);
        return [{ data, dataISO: formatarDataISO(data), diaSemana: data.getDay() }];
    }
    const resultado = [];
    for (let i = 0; i < 7; i++) {
        const data = somarDiasAgenda(inicio, i);
        const dataISO = formatarDataISO(data);
        const diaSemana = data.getDay();
        const temJanela = janelasAgendaPara(diaSemana, profissionalId).length > 0;
        const temAgendamento = agendaAgendamentosSemanaCache.some(a => a.data === dataISO && (!profissionalId || a.profissional_id === profissionalId));
        const temBloqueio = agendaBloqueiosCache.some(b => b.data === dataISO && (!b.profissional_id || !profissionalId || b.profissional_id === profissionalId));
        if (temJanela || temAgendamento || temBloqueio) resultado.push({ data, dataISO, diaSemana });
    }
    // Se ainda não houver configuração, mantém seg-sex visível para deixar a tela compreensível.
    if (!resultado.length) {
        for (let i = 0; i < 5; i++) {
            const data = somarDiasAgenda(inicio, i);
            resultado.push({ data, dataISO: formatarDataISO(data), diaSemana: data.getDay() });
        }
    }
    return resultado;
}

function limitesHorariosGrade(dias, profissionalId) {
    let min = Infinity;
    let max = -Infinity;
    dias.forEach(d => {
        janelasAgendaPara(d.diaSemana, profissionalId).forEach(j => {
            min = Math.min(min, horaParaMinutos(horaCurta(j.hora_inicio)));
            max = Math.max(max, horaParaMinutos(horaCurta(j.hora_fim)));
        });
        agendaAgendamentosSemanaCache.filter(a => a.data === d.dataISO && (!profissionalId || a.profissional_id === profissionalId)).forEach(a => {
            min = Math.min(min, horaParaMinutos(horaCurta(a.hora_inicio)));
            max = Math.max(max, horaParaMinutos(horaCurta(a.hora_fim)));
        });
    });
    if (!Number.isFinite(min) || !Number.isFinite(max) || min >= max) return { inicio: 7 * 60, fim: 20 * 60 };
    min = Math.floor(min / AGENDA_GRADE_PASSO_MIN) * AGENDA_GRADE_PASSO_MIN;
    max = Math.ceil(max / AGENDA_GRADE_PASSO_MIN) * AGENDA_GRADE_PASSO_MIN;
    return { inicio: Math.max(0, min), fim: Math.min(24 * 60, max) };
}

function descricaoSemana(inicio, fim) {
    const mesmoMes = inicio.getMonth() === fim.getMonth() && inicio.getFullYear() === fim.getFullYear();
    const fmtDia = d => String(d.getDate()).padStart(2, '0');
    const meses = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
    if (mesmoMes) return `${fmtDia(inicio)}–${fmtDia(fim)} de ${meses[inicio.getMonth()]} de ${inicio.getFullYear()}`;
    return `${fmtDia(inicio)} ${meses[inicio.getMonth()]} – ${fmtDia(fim)} ${meses[fim.getMonth()]} de ${fim.getFullYear()}`;
}

async function mudarSemanaAgenda(delta) {
    agendaDataSelecionada = somarDiasAgenda(agendaDataSelecionada, delta * (agendaPeriodoVisual === 'dia' ? 1 : 7));
    const input = document.getElementById('agenda_data_input');
    if (input) input.value = formatarDataISO(agendaDataSelecionada);
    await renderizarPainelAgenda();
}

async function selecionarPeriodoAgenda(periodo) {
    agendaPeriodoVisual = periodo === 'dia' ? 'dia' : 'semana';
    document.querySelectorAll('[data-agenda-periodo]').forEach(botao => {
        const ativo = botao.dataset.agendaPeriodo === agendaPeriodoVisual;
        botao.classList.toggle('active', ativo);
        botao.setAttribute('aria-pressed', String(ativo));
    });
    await renderizarPainelAgenda();
}

async function irParaHojeAgenda() {
    agendaDataSelecionada = new Date();
    const input = document.getElementById('agenda_data_input');
    if (input) input.value = formatarDataISO(agendaDataSelecionada);
    await renderizarPainelAgenda();
}

function obterContatoAgendaPaciente(paciente) {
    if (typeof obterContatoPreferencialPaciente === 'function') return obterContatoPreferencialPaciente(paciente);
    const p = paciente || {};
    const dependente = !!(p.dependente ?? p.menor_dependente);
    const telefoneResponsavel = p.responsavelTelefone || p.responsavel_telefone || '';
    const nomeResponsavel = p.responsavelNome || p.responsavel_nome || '';
    if (dependente && telefoneResponsavel) return { telefone: telefoneResponsavel, nomeDestinatario: nomeResponsavel || 'responsável', usaResponsavel: true };
    return { telefone: p.telefone || '', nomeDestinatario: p.nome || 'paciente', usaResponsavel: false };
}

function montarSaudacaoAgenda(paciente) {
    const contato = obterContatoAgendaPaciente(paciente);
    return contato.usaResponsavel
        ? `Olá, ${contato.nomeDestinatario}! Sobre o atendimento de ${paciente?.nome || 'seu dependente'}`
        : `Olá, ${paciente?.nome || 'paciente'}`;
}

// Compatibilidade com versões anteriores que ainda chamavam navegação por dia.
async function mudarDiaAgenda(delta) {
    agendaDataSelecionada = somarDiasAgenda(agendaDataSelecionada, delta);
    const input = document.getElementById('agenda_data_input');
    if (input) input.value = formatarDataISO(agendaDataSelecionada);
    await renderizarPainelAgenda();
}

async function irParaDataAgenda(valor) {
    if (!valor) return;
    agendaDataSelecionada = new Date(valor + 'T00:00:00');
    await renderizarPainelAgenda();
}

async function carregarAgendamentosSemana(inicio, fim, profissionalEscopo = '') {
    if (!usuarioPodeVerAgendaClinicaToda()) {
        profissionalEscopo = profissionalAgendaRestritoAtualId();
        if (!profissionalEscopo) return {data:[],error:new Error('Sua agenda não pôde ser identificada.')};
    }
    const filtrarEscopo = (lista) => (lista || []).filter(a => !profissionalEscopo || String(a.profissional_id || '') === String(profissionalEscopo));
    if (!_supabase) {
        const locais = filtrarEscopo(mesclarAgendamentosPendentesNaAgenda([], inicio, fim));
        return locais.length
            ? { data: locais, error: null, somenteLocal: true, erroNuvem: new Error('Supabase indisponível') }
            : { data: [], error: new Error('Supabase indisponível') };
    }

    const buscarSemanaNuvem = async () => {
        const montarConsultaSemana = (selecao) => {
            let query = _supabase.from('agendamentos')
                .select(selecao)
                .gte('data', formatarDataISO(inicio))
                .lte('data', formatarDataISO(fim))
                .neq('status', 'cancelado');
            if (profissionalEscopo) query = query.eq('profissional_id', profissionalEscopo);
            return query.order('data').order('hora_inicio');
        };
        let resultado = await montarConsultaSemana(agendaContatoResponsavelDisponivel ? AGENDA_SELECT_SEMANA : AGENDA_SELECT_SEMANA_LEGADO);
        if (resultado.error && agendaContatoResponsavelDisponivel && /dependente|responsavel_nome|responsavel_parentesco|responsavel_telefone|schema cache|column .* does not exist/i.test(String(resultado.error?.message || resultado.error || ''))) {
            agendaContatoResponsavelDisponivel = false;
            resultado = await montarConsultaSemana(AGENDA_SELECT_SEMANA_LEGADO);
        }
        if (resultado.error) throw resultado.error;
        return clonarAgendamentosAgenda(resultado.data || []);
    };

    try {
        const dadosNuvem = window.KineSysDataCache?.get
            ? await window.KineSysDataCache.get({
                key:chaveCacheAgendaSemana(inicio, fim, profissionalEscopo),
                ttl:AGENDA_SEMANA_CACHE_TTL_MS,
                fetcher:buscarSemanaNuvem
            })
            : await buscarSemanaNuvem();
        let dados = clonarAgendamentosAgenda(dadosNuvem);
        if (typeof enriquecerAgendamentosComVinculoLocal === 'function') dados = enriquecerAgendamentosComVinculoLocal(dados || []);
        dados = filtrarEscopo(mesclarAgendamentosPendentesNaAgenda(dados || [], inicio, fim));
        return { data:dados, error:null };
    } catch (error) {
        // Falhas e resultados somente locais nunca entram no TTL cache.
        const locais = filtrarEscopo(mesclarAgendamentosPendentesNaAgenda([], inicio, fim));
        if (locais.length && erroAgendaEhTransitorio(error)) {
            return { data: locais, error: null, somenteLocal: true, erroNuvem: error };
        }
        return { data:null, error };
    }
}

function renderizarGradeSemanal(inicio, fim, profissionalFiltro) {
    const container = document.getElementById('agenda_semana_grade');
    if (!container) return;
    const dias = diasVisiveisDaSemana(inicio, profissionalFiltro);
    const limites = limitesHorariosGrade(dias, profissionalFiltro);
    const passo = AGENDA_GRADE_PASSO_MIN;
    const totalSlots = Math.max(1, Math.ceil((limites.fim - limites.inicio) / passo));
    const hojeISO = instanteAgendaSaoPaulo().data;
    container.dataset.dias = dias.map(d => d.dataISO).join(',');
    container.dataset.inicio = String(limites.inicio);
    container.dataset.fim = String(limites.fim);

    // Etapa 8: o JS informa somente quantidades dinâmicas; dimensões visuais pertencem ao Design System.
    container.style.setProperty('--kds-agenda-runtime-day-count', String(dias.length));
    container.style.setProperty('--kds-agenda-runtime-slot-count', String(totalSlots));
    container.innerHTML = '';

    const canto = document.createElement('div');
    canto.className = 'agenda-canto';
    canto.style.gridColumn = '1';
    canto.style.gridRow = '1';
    container.appendChild(canto);

    dias.forEach((d, idx) => {
        const cab = document.createElement('div');
        const feriado = obterFeriadoAgenda(d.dataISO);
        cab.className = 'agenda-dia-cabecalho' + (d.dataISO === hojeISO ? ' hoje' : '') + (feriado ? ' feriado' : '');
        cab.style.gridColumn = String(idx + 2);
        cab.style.gridRow = '1';
        const nome = d.data.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '');
        const tagFeriado = feriado ? `<span class="agenda-feriado-tag" title="${escapeHTML(rotuloTipoFeriadoAgenda(feriado) + ' — ' + feriado.nome)}">FERIADO</span>` : '';
        cab.innerHTML = `<span class="dia-semana">${escapeHTML(nome)}</span><span class="dia-data">${String(d.data.getDate()).padStart(2, '0')}/${String(d.data.getMonth()+1).padStart(2,'0')}</span>${tagFeriado}`;
        if (feriado) cab.title = `${rotuloTipoFeriadoAgenda(feriado)} — ${feriado.nome}. Agenda padrão bloqueada; exceções somente por horário extraordinário.`;
        container.appendChild(cab);
    });

    for (let r = 0; r < totalSlots; r++) {
        const minuto = limites.inicio + r * passo;
        const eixo = document.createElement('div');
        const restoHora=((minuto%60)+60)%60;
        const classeLinha=restoHora===0?'hora-cheia':(restoHora===30?'meia-hora':'subhora');
        eixo.className = 'agenda-hora-eixo ' + classeLinha;
        eixo.style.gridColumn = '1';
        eixo.style.gridRow = String(r + 2);
        eixo.textContent = minuto % 60 === 0 ? minutosParaHora(minuto) : '';
        container.appendChild(eixo);

        dias.forEach((d, c) => {
            const feriado = obterFeriadoAgenda(d.dataISO);
            const janelas = janelasAgendaPara(d.diaSemana, profissionalFiltro);
            const bloqueios = bloqueiosAgendaPara(d.dataISO, profissionalFiltro);
            const dentro = minutoDentroDeJanela(minuto, janelas);
            const bloq = bloqueioNoMinuto(minuto, bloqueios);
            const cell = document.createElement('div');
            cell.dataset.dia = d.dataISO; cell.dataset.minuto = String(minuto);
            cell.style.gridColumn = String(c + 2);
            cell.style.gridRow = String(r + 2);
            cell.className = 'agenda-celula ' + classeLinha + ' ' + (feriado ? 'feriado bloqueado' : bloq ? 'bloqueado' : dentro ? 'atendimento' : 'fora-atendimento');

            const hh = minutosParaHora(minuto);
            if (feriado) {
                if (r === 0) cell.innerHTML = `<div class="agenda-bloqueio-texto agenda-feriado-texto">${escapeHTML(feriado.nome)}</div>`;
                cell.title = `${rotuloTipoFeriadoAgenda(feriado)} — ${feriado.nome}. Agenda padrão bloqueada. Use horário extraordinário para uma exceção.`;
            } else if (bloq) {
                const inicioBloq = !bloq.hora_inicio || horaCurta(bloq.hora_inicio) === hh;
                if (inicioBloq) cell.innerHTML = `<div class="agenda-bloqueio-texto">${escapeHTML(bloq.motivo || 'Bloqueado')}</div>`;
            } else if (dentro) {
                cell.addEventListener('click', () => abrirModalAgendamento(profissionalFiltro || '', d.dataISO, hh));
                cell.title = profissionalFiltro ? `Agendar às ${hh}` : `Escolher profissional e agendar às ${hh}`;
            }
            container.appendChild(cell);
        });
    }

    if (profissionalFiltro) {
        agendaAgendamentosSemanaCache.filter(a => a.profissional_id === profissionalFiltro).forEach(a => {
            const diaIdx = dias.findIndex(d => d.dataISO === a.data);
            if (diaIdx < 0) return;
            const ini = horaParaMinutos(horaCurta(a.hora_inicio));
            const fimA = horaParaMinutos(horaCurta(a.hora_fim));
            if (fimA <= limites.inicio || ini >= limites.fim) return;
            const rowInicio = Math.floor((Math.max(ini, limites.inicio) - limites.inicio) / passo) + 2;
            const span = Math.max(1, Math.ceil((Math.min(fimA, limites.fim) - Math.max(ini, limites.inicio)) / passo));
            const overlay = document.createElement('div');
            overlay.className = 'agenda-celula agendado';
            const duracaoVisual = Math.max(passo, fimA - ini);
            overlay.dataset.duracaoMinutos = String(duracaoVisual);
            if (duracaoVisual <= 10) overlay.classList.add('agenda-duracao-minima');
            else if (duracaoVisual < 30) overlay.classList.add('agenda-duracao-curta');
            overlay.style.gridColumn = String(diaIdx + 2);
            overlay.style.gridRow = `${rowInicio} / span ${span}`;
            overlay.style.zIndex = '3';
            overlay.addEventListener('click', () => abrirDetalheAgendamento(a.id));
            overlay.title = `${a.pacientes?.nome || 'Paciente'} · ${a.procedimentos?.nome || 'Atendimento'} · ${horaCurta(a.hora_inicio)}–${horaCurta(a.hora_fim)}`;
            overlay.innerHTML = `<div class="agenda-compromisso status-${escapeHTML(classeStatusAgenda(a.status))}"><div class="paciente"><span class="agenda-paciente-nome">${escapeHTML(a.pacientes?.nome || 'Paciente')}</span>${iconePagamentoAgendaHTML(a)}${iconeHorarioExtraordinarioHTML(a)}</div></div>`;
            container.appendChild(overlay);
        });
    } else {
        // Visão da clínica: duração real no eixo vertical e uma faixa horizontal
        // estável por profissional. Atendimentos simultâneos não se sobrepõem.
        dias.forEach((d, diaIdx) => {
            const atendimentosDia = agendaAgendamentosSemanaCache.filter(a => a.data === d.dataISO);
            const profissionaisDia = Array.from(new Set(atendimentosDia.map(a => String(a.profissional_id || 'sem-profissional'))));
            const totalFaixas = Math.max(1, profissionaisDia.length);
            const faixaPorProfissional = new Map(profissionaisDia.map((id, idx) => [id, idx]));

            atendimentosDia.forEach(a => {
                const ini = horaParaMinutos(horaCurta(a.hora_inicio));
                const fimA = horaParaMinutos(horaCurta(a.hora_fim));
                if (!Number.isFinite(ini) || !Number.isFinite(fimA) || fimA <= limites.inicio || ini >= limites.fim) return;
                const inicioVisivel = Math.max(ini, limites.inicio);
                const fimVisivel = Math.min(fimA, limites.fim);
                const rowInicio = Math.floor((inicioVisivel - limites.inicio) / passo) + 2;
                const span = Math.max(1, Math.ceil((fimVisivel - inicioVisivel) / passo));
                const duracaoVisual = Math.max(passo, fimA - ini);
                const faixa = faixaPorProfissional.get(String(a.profissional_id || 'sem-profissional')) || 0;

                const overlay = document.createElement('div');
                overlay.className = 'agenda-celula agendado agenda-geral-faixa';
                overlay.dataset.duracaoMinutos = String(duracaoVisual);
                if (duracaoVisual <= 10) overlay.classList.add('agenda-duracao-minima');
                else if (duracaoVisual < 30) overlay.classList.add('agenda-duracao-curta');
                overlay.style.gridColumn = String(diaIdx + 2);
                overlay.style.gridRow = `${rowInicio} / span ${span}`;
                overlay.style.zIndex = '3';
                overlay.style.width = `calc(100% / ${totalFaixas})`;
                overlay.style.justifySelf = 'start';
                overlay.style.transform = `translateX(${faixa * 100}%)`;
                overlay.addEventListener('click', e => { e.stopPropagation(); abrirDetalheAgendamento(a.id); });
                overlay.title = `${a.pacientes?.nome || 'Paciente'} · ${a.equipe?.nome || 'Profissional'} · ${horaCurta(a.hora_inicio)}–${horaCurta(a.hora_fim)}`;
                overlay.innerHTML = `<div class="agenda-compromisso status-${escapeHTML(classeStatusAgenda(a.status))}"><div class="paciente"><span class="agenda-paciente-nome">${escapeHTML(a.pacientes?.nome || 'Paciente')}</span>${iconePagamentoAgendaHTML(a)}${iconeHorarioExtraordinarioHTML(a)}</div></div>`;
                container.appendChild(overlay);
            });
        });
    }
    iniciarRelogioAgenda();
}

async function renderizarPainelAgenda({ pularSync = false } = {}) {
    const revisao = ++agendaRevisaoVisual;
    const identidade = String(usuarioLogado?.id || '') + '|' + String(usuarioLogado?.clinica_id || '');
    const aindaAtual = () => revisao === agendaRevisaoVisual && identidade === String(usuarioLogado?.id || '') + '|' + String(usuarioLogado?.clinica_id || '');
    atualizarVisibilidadeAuditoriaStatusAgenda();
    const container = document.getElementById('agenda_semana_grade');
    if (!_supabase) {
        if (container) container.innerHTML = '<div class="agenda-grade-aviso">Agenda indisponível: conexão com o Supabase não inicializada.</div>';
        mostrarFeedbackAgenda('Não foi possível conectar a agenda ao banco de dados.', 'erro');
        return;
    }

    mostrarFeedbackAgenda('Atualizando agenda…', 'info');
    if (!pularSync && lerAgendamentosPendentesSync().length) {
        await sincronizarAgendamentosPendentes({ silencioso: true, renderizar: false });
    }
    atualizarIndicadorEscopoAgenda();
    const filtroSolicitado = document.getElementById('agenda_filtro_profissional')?.value || '';
    const podeVerClinicaToda = usuarioPodeVerAgendaClinicaToda();
    const profissionalProprioId = profissionalAgendaRestritoAtualId();
    if (!podeVerClinicaToda && !profissionalProprioId) {
        if (container) container.innerHTML = '<div class="agenda-grade-aviso">Seu usuário não está vinculado a um profissional habilitado para aparecer na Agenda.<br><small>Peça a um administrador para abrir Equipe e ativar “Pode aparecer como profissional na Agenda” no seu cadastro.</small></div>';
        mostrarFeedbackAgenda('Acesso à Agenda restrito: seu usuário ainda não possui vínculo assistencial ativo.', 'aviso');
        return;
    }
    const profissionalFiltro = podeVerClinicaToda ? filtroSolicitado : profissionalProprioId;
    const inicio = inicioSemanaAgenda(agendaDataSelecionada);
    const fim = somarDiasAgenda(inicio, 6);
    const titulo = document.getElementById('agenda_dia_titulo');
    if (titulo) titulo.textContent = agendaPeriodoVisual === 'dia'
        ? agendaDataSelecionada.toLocaleDateString('pt-BR',{weekday:'long',day:'2-digit',month:'long',year:'numeric'})
        : descricaoSemana(inicio, fim);

    try {
        const resultadoCarga = await carregarAgendamentosSemana(inicio, fim, profissionalFiltro);
        if (!aindaAtual()) return;
        const { data, error } = resultadoCarga;
        if (error) throw error;
        agendaAgendamentosSemanaCache = data || [];
        agendaAgendamentosDoDiaCache = agendaAgendamentosSemanaCache.filter(a => a.data === formatarDataISO(agendaDataSelecionada));
        await atualizarCoberturaPagamentoAgenda();
        if (!aindaAtual()) return;
        renderizarGradeSemanal(inicio, fim, profissionalFiltro);
        if (resultadoCarga.somenteLocal) {
            mostrarFeedbackAgenda('Conexão instável: os agendamentos pendentes continuam visíveis neste computador e serão sincronizados automaticamente.', 'aviso');
        } else {
            mostrarFeedbackAgenda(
                profissionalFiltro
                    ? (podeVerClinicaToda ? 'Agenda filtrada por profissional. Clique em qualquer horário livre para iniciar um agendamento.' : 'Minha agenda. Clique em qualquer horário livre para iniciar um agendamento.')
                    : 'Visão de toda a clínica. Selecione um profissional para visualizar a disponibilidade individual e os horários livres.',
                'info'
            );
        }
    } catch (err) {
        if (!aindaAtual()) return;
        console.error('Erro ao carregar agenda semanal:', err);
        if (container) container.innerHTML = `<div class="agenda-grade-aviso">Não foi possível carregar a agenda semanal.<br><small>${escapeHTML(err?.message || String(err))}</small></div>`;
        mostrarFeedbackAgenda('Erro ao carregar a agenda. Verifique a conexão e a estrutura do Supabase.', 'erro');
    }
}

/* --------------------------------------------------------------------
   RECORRÊNCIA DE AGENDAMENTOS
   -------------------------------------------------------------------- */
function agendaDataUTC(dataISO) {
    const m = String(dataISO || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!m) return null;
    return new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
}

function agendaDataISOUTC(data) {
    if (!(data instanceof Date) || Number.isNaN(data.getTime())) return '';
    return `${data.getUTCFullYear()}-${String(data.getUTCMonth()+1).padStart(2,'0')}-${String(data.getUTCDate()).padStart(2,'0')}`;
}

function agendaSomarDiasISO(dataISO, dias) {
    const d = agendaDataUTC(dataISO);
    if (!d) return '';
    d.setUTCDate(d.getUTCDate() + Number(dias || 0));
    return agendaDataISOUTC(d);
}

function gerarDatasRecorrenciaAgenda(config = {}) {
    const tipo = String(config.tipo || 'nenhuma');
    const dataInicial = String(config.dataInicial || '');
    if (!agendaDataUTC(dataInicial)) return [];
    if (tipo === 'nenhuma') return [dataInicial];

    const MAX = 60;
    if (tipo === 'datas_especificas') {
        return Array.from(new Set([dataInicial, ...(config.datasEspecificas || [])]
            .map(String).filter(x => agendaDataUTC(x))))
            .sort().slice(0, MAX);
    }

    const modoFim = String(config.modoFim || 'quantidade');
    const quantidade = Math.min(MAX, Math.max(2, Number(config.quantidade || 2)));
    const dataLimite = String(config.dataLimite || '');
    if (modoFim === 'data' && (!agendaDataUTC(dataLimite) || dataLimite < dataInicial)) return [];

    const resultado = [dataInicial];
    if (tipo === 'cada_7_dias') {
        let atual = dataInicial;
        while (resultado.length < MAX) {
            atual = agendaSomarDiasISO(atual, 7);
            if (!atual) break;
            if (modoFim === 'data') {
                if (atual > dataLimite) break;
            } else if (resultado.length >= quantidade) break;
            resultado.push(atual);
        }
        return resultado;
    }

    if (tipo === 'dias_semana') {
        const dias = new Set((config.diasSemana || []).map(Number).filter(n => n >= 0 && n <= 6));
        if (!dias.size) return [];
        let cursor = dataInicial;
        let seguranca = 0;
        while (resultado.length < MAX && seguranca < 730) {
            cursor = agendaSomarDiasISO(cursor, 1);
            seguranca++;
            if (!cursor) break;
            if (modoFim === 'data' && cursor > dataLimite) break;
            const d = agendaDataUTC(cursor);
            if (dias.has(d.getUTCDay())) resultado.push(cursor);
            if (modoFim !== 'data' && resultado.length >= quantidade) break;
        }
        return resultado;
    }
    return [dataInicial];
}

function obterDiasSemanaRecorrenciaSelecionados() {
    return Array.from(document.querySelectorAll('#ag_recorrencia_dias_grupo input[type="checkbox"]:checked')).map(el => Number(el.value));
}

function lerConfiguracaoRecorrenciaModal() {
    return {
        tipo: document.getElementById('ag_recorrencia_tipo')?.value || 'nenhuma',
        dataInicial: document.getElementById('ag_data_input')?.value || '',
        modoFim: document.getElementById('ag_recorrencia_fim_tipo')?.value || 'quantidade',
        quantidade: Number(document.getElementById('ag_recorrencia_quantidade')?.value || 0),
        dataLimite: document.getElementById('ag_recorrencia_data_limite')?.value || '',
        diasSemana: obterDiasSemanaRecorrenciaSelecionados(),
        datasEspecificas: [...agendaRecorrenciaDatasEspecificas]
    };
}

function resetarRecorrenciaAgendamento() {
    agendaRecorrenciaDatasEspecificas = [];
    const tipo = document.getElementById('ag_recorrencia_tipo'); if (tipo) tipo.value = 'nenhuma';
    const fim = document.getElementById('ag_recorrencia_fim_tipo'); if (fim) fim.value = 'quantidade';
    const qtd = document.getElementById('ag_recorrencia_quantidade'); if (qtd) qtd.value = '10';
    const limite = document.getElementById('ag_recorrencia_data_limite'); if (limite) limite.value = '';
    const custom = document.getElementById('ag_recorrencia_data_custom'); if (custom) custom.value = '';
    document.querySelectorAll('#ag_recorrencia_dias_grupo input[type="checkbox"]').forEach(el => { el.checked = false; });
    atualizarInterfaceRecorrencia();
}

function atualizarInterfaceRecorrencia() {
    const tipo = document.getElementById('ag_recorrencia_tipo')?.value || 'nenhuma';
    const fimTipo = document.getElementById('ag_recorrencia_fim_tipo')?.value || 'quantidade';
    const repeticaoRegular = tipo === 'cada_7_dias' || tipo === 'dias_semana';
    const fimTipoGrupo = document.getElementById('ag_recorrencia_fim_tipo_grupo'); if (fimTipoGrupo) fimTipoGrupo.hidden = !repeticaoRegular;
    const diasGrupo = document.getElementById('ag_recorrencia_dias_grupo'); if (diasGrupo) diasGrupo.hidden = tipo !== 'dias_semana';
    const fimGrupo = document.getElementById('ag_recorrencia_fim_grupo'); if (fimGrupo) fimGrupo.hidden = !repeticaoRegular;
    const qtdGrupo = document.getElementById('ag_recorrencia_quantidade_grupo'); if (qtdGrupo) qtdGrupo.hidden = !repeticaoRegular || fimTipo !== 'quantidade';
    const limiteGrupo = document.getElementById('ag_recorrencia_data_limite_grupo'); if (limiteGrupo) limiteGrupo.hidden = !repeticaoRegular || fimTipo !== 'data';
    const customGrupo = document.getElementById('ag_recorrencia_custom_grupo'); if (customGrupo) customGrupo.hidden = tipo !== 'datas_especificas';
    atualizarResumoRecorrencia();
}

function adicionarDataEspecificaRecorrencia() {
    const input = document.getElementById('ag_recorrencia_data_custom');
    const data = input?.value || '';
    const inicial = document.getElementById('ag_data_input')?.value || '';
    if (!agendaDataUTC(data)) { mostrarFeedbackAgendaModal('Escolha uma data válida para adicionar à repetição.', 'erro'); return; }
    if (inicial && data < inicial) { mostrarFeedbackAgendaModal('As datas específicas devem ser iguais ou posteriores ao primeiro agendamento.', 'erro'); return; }
    if (!agendaRecorrenciaDatasEspecificas.includes(data)) agendaRecorrenciaDatasEspecificas.push(data);
    agendaRecorrenciaDatasEspecificas.sort();
    if (input) input.value = '';
    renderizarDatasEspecificasRecorrencia();
    atualizarResumoRecorrencia();
}

function removerDataEspecificaRecorrencia(data) {
    agendaRecorrenciaDatasEspecificas = agendaRecorrenciaDatasEspecificas.filter(x => x !== data);
    renderizarDatasEspecificasRecorrencia();
    atualizarResumoRecorrencia();
}

function renderizarDatasEspecificasRecorrencia() {
    const lista = document.getElementById('ag_recorrencia_datas_lista');
    if (!lista) return;
    lista.innerHTML = agendaRecorrenciaDatasEspecificas.map(data => {
        const d = agendaDataUTC(data);
        const rotulo = d ? d.toLocaleDateString('pt-BR', { timeZone:'UTC' }) : data;
        return `<span class="agenda-recorrencia-chip">${escapeHTML(rotulo)} <button type="button" aria-label="Remover ${escapeHTML(rotulo)}" onclick="removerDataEspecificaRecorrencia('${escapeHTML(data)}')">✕</button></span>`;
    }).join('');
}

function usarSaldoPacoteNaRecorrencia() {
    const plano = document.getElementById('ag_plano_select');
    const opt = plano?.selectedOptions?.[0];
    const disponiveis = Number(opt?.dataset?.disponiveis || opt?.dataset?.restantes || 0);
    if (!plano?.value || !disponiveis) {
        mostrarFeedbackAgendaModal('Selecione um pacote com capacidade livre para novos vínculos.', 'erro');
        return;
    }
    if (disponiveis < 2) {
        mostrarFeedbackAgendaModal('Este pacote possui apenas 1 vaga de cobertura ainda não reservada. Mantenha “Não repetir” ou crie as demais como Pré-agendado.', 'info');
        return;
    }
    const qtd = document.getElementById('ag_recorrencia_quantidade');
    if (qtd) qtd.value = String(Math.min(60, disponiveis));
    atualizarResumoRecorrencia();
}

function atualizarResumoRecorrencia() {
    const resumo = document.getElementById('ag_recorrencia_resumo');
    if (!resumo) return;
    const cfg = lerConfiguracaoRecorrenciaModal();
    const limiteInput = document.getElementById('ag_recorrencia_data_limite'); if (limiteInput && cfg.dataInicial) limiteInput.min = cfg.dataInicial;
    const customInput = document.getElementById('ag_recorrencia_data_custom'); if (customInput && cfg.dataInicial) customInput.min = cfg.dataInicial;
    if (cfg.tipo === 'nenhuma') { resumo.hidden = true; resumo.textContent = ''; return; }
    if (cfg.tipo === 'datas_especificas') {
        agendaRecorrenciaDatasEspecificas = agendaRecorrenciaDatasEspecificas.filter(d => !cfg.dataInicial || d >= cfg.dataInicial);
        renderizarDatasEspecificasRecorrencia();
    }
    const datas = gerarDatasRecorrenciaAgenda(cfg);
    if (!datas.length) {
        resumo.hidden = false;
        resumo.textContent = cfg.tipo === 'dias_semana' && !cfg.diasSemana.length
            ? 'Escolha pelo menos um dia da semana.'
            : 'Complete as regras da repetição para visualizar a série.';
        return;
    }
    const mostrar = datas.slice(0,5).map(d => agendaDataUTC(d)?.toLocaleDateString('pt-BR',{timeZone:'UTC'}) || d).join(' · ');
    const statusInicial = document.getElementById('ag_status_inicial')?.value || 'agendado';
    const planoOpt = document.getElementById('ag_plano_select')?.selectedOptions?.[0];
    const cobertura = Number(planoOpt?.dataset?.disponiveis || 0);
    let complemento = statusInicial === 'pre_agendado' ? ' A série será criada como Pré-agendada enquanto não houver cobertura de pacote.' : '';
    if (document.getElementById('ag_plano_select')?.value && datas.length > cobertura) complemento = ` ${Math.min(datas.length,cobertura)} ocorrência(s) cabem no pacote; ${Math.max(0,datas.length-cobertura)} excedente(s) ficarão Pré-agendadas sem cobertura até a renovação.`;
    resumo.hidden = false;
    resumo.textContent = `${datas.length} agendamento(s) previsto(s). Primeiro agendamento: ${mostrar}${datas.length>5?' · …':''}. O mesmo profissional, horário e procedimento serão usados em toda a série.${horarioExtraordinarioAtivoModal() ? ' Horário extraordinário habilitado: as ocorrências fora da jornada padrão exigirão confirmação e gerarão aviso ao profissional.' : ''}${complemento}`;
}

function horarioExtraordinarioAtivoModal() {
    return !!document.getElementById('ag_horario_extra_toggle')?.checked;
}
function duracaoProcedimentoModal() {
    const sel = document.getElementById('ag_procedimento_select');
    return Math.max(1, parseInt(sel?.selectedOptions?.[0]?.dataset?.duracao || '30', 10) || 30);
}
function lerHorarioExtraordinarioModal() {
    const inicio = document.getElementById('ag_horario_extra_inicio')?.value || '';
    if (!inicio) return { inicio:'', fim:'', valido:false };
    const ini = horaParaMinutos(inicio);
    const fimMin = ini + duracaoProcedimentoModal();
    if (!Number.isFinite(ini) || fimMin > 24*60) return { inicio, fim:'', valido:false };
    return { inicio, fim:minutosParaHora(fimMin), valido:true };
}
function atualizarResumoHorarioExtraordinario() {
    const resumo = document.getElementById('ag_horario_extra_resumo');
    if (!resumo) return;
    const h = lerHorarioExtraordinarioModal();
    const dataISO = document.getElementById('ag_data_input')?.value || '';
    const feriado = obterFeriadoAgenda(dataISO);
    if (!horarioExtraordinarioAtivoModal()) { resumo.textContent = ''; return; }
    resumo.textContent = h.valido
        ? (feriado
            ? `Exceção em feriado: ${feriado.nome} · ${h.inicio} – ${h.fim}. O profissional responsável receberá um aviso.`
            : `Horário extraordinário: ${h.inicio} – ${h.fim}. O sistema confirmará antes de salvar.`)
        : 'Informe o horário de início. O fim será calculado pela duração do procedimento.';
}
async function aoAlternarHorarioExtraordinario() {
    const ativo = horarioExtraordinarioAtivoModal();
    const bloco = document.getElementById('ag_horario_extra_bloco');
    const sel = document.getElementById('ag_horario_select');
    if (bloco) bloco.hidden = !ativo;
    if (sel) sel.disabled = ativo;
    if (ativo) {
        const input = document.getElementById('ag_horario_extra_inicio');
        const regular = sel?.value?.split('|')?.[0] || agendaHoraPreSelecionadaModal || '';
        if (input && !input.value) input.value = regular || '07:00';
        atualizarResumoHorarioExtraordinario();
        const dataISO = document.getElementById('ag_data_input')?.value || '';
        const feriado = obterFeriadoAgenda(dataISO);
        mostrarFeedbackAgendaModal(
            feriado
                ? `${feriado.nome}: a agenda padrão está bloqueada por feriado. A exceção extraordinária está liberada e será notificada ao profissional responsável; conflitos e bloqueios manuais continuam sendo respeitados.`
                : 'Horário extraordinário habilitado. Você poderá agendar fora da jornada padrão; conflitos e bloqueios continuam sendo respeitados.',
            'aviso'
        );
    } else {
        atualizarResumoHorarioExtraordinario();
        await atualizarHorariosDisponiveisModal();
    }
    atualizarResumoRecorrencia();
}
if (typeof window !== 'undefined') window.aoAlternarHorarioExtraordinario = aoAlternarHorarioExtraordinario;
if (typeof window !== 'undefined') window.atualizarResumoHorarioExtraordinario = atualizarResumoHorarioExtraordinario;

function intervaloDisponivelNaJornadaRecorrencia(profissionalId, dataISO, horaInicio, horaFim, opcoes = {}) {
    const d = agendaDataUTC(dataISO);
    if (!d) return { ok:false, motivo:'data inválida' };
    const ini = horaParaMinutos(horaInicio);
    const fim = horaParaMinutos(horaFim);
    const feriado = obterFeriadoAgenda(dataISO);
    const dentroPadrao = intervaloDentroDaJornadaPadrao(profissionalId, dataISO, horaInicio, horaFim);
    if (feriado && !opcoes.permitirExtraordinario) {
        return { ok:false, motivo:`feriado — ${feriado.nome}` };
    }
    if (!dentroPadrao && !opcoes.permitirExtraordinario) {
        return { ok:false, motivo:'fora do horário da clínica/profissional' };
    }
    const bloqueio = bloqueiosAgendaPara(dataISO, profissionalId).find(b => {
        if (!b.hora_inicio || !b.hora_fim) return true;
        const bi = horaParaMinutos(horaCurta(b.hora_inicio));
        const bf = horaParaMinutos(horaCurta(b.hora_fim));
        return ini < bf && fim > bi;
    });
    if (bloqueio) return { ok:false, motivo:`bloqueado${bloqueio.motivo ? ': '+bloqueio.motivo : ''}` };
    return { ok:true, extraordinario:!dentroPadrao };
}

async function analisarDatasRecorrenciaAgenda(datas, profissionalId, horaInicio, horaFim, opcoes = {}) {
    const validas = [];
    const indisponiveis = [];
    const ordenadas = Array.from(new Set((datas || []).filter(Boolean))).sort();
    if (!ordenadas.length) return { validas, indisponiveis };

    let existentesNuvem = [];
    if (_supabase) {
        const r = await _supabase.from('agendamentos')
            .select('id,data,hora_inicio,hora_fim,status')
            .eq('profissional_id', profissionalId)
            .gte('data', ordenadas[0])
            .lte('data', ordenadas[ordenadas.length - 1])
            .neq('status', 'cancelado');
        if (r.error && !erroAgendaEhTransitorio(r.error)) throw r.error;
        if (r.error) console.warn('Agenda: recorrência validada contra jornada e fila local; conflitos da nuvem serão rechecados no INSERT.', r.error);
        else existentesNuvem = r.data || [];
    }
    const pendentes = lerAgendamentosPendentesSync().map(x => x.payload || {}).filter(a =>
        String(a.profissional_id || '') === String(profissionalId || '') && statusAgendaOcupaHorario(a.status)
    );
    const ini = horaParaMinutos(horaInicio);
    const fim = horaParaMinutos(horaFim);

    for (const dataISO of ordenadas) {
        const jornada = intervaloDisponivelNaJornadaRecorrencia(profissionalId, dataISO, horaInicio, horaFim, opcoes);
        if (!jornada.ok) { indisponiveis.push({data:dataISO,motivo:jornada.motivo}); continue; }
        const ocupados = [...existentesNuvem, ...pendentes].filter(a => a.data === dataISO && statusAgendaOcupaHorario(a.status));
        const conflito = ocupados.some(a => ini < horaParaMinutos(horaCurta(a.hora_fim)) && fim > horaParaMinutos(horaCurta(a.hora_inicio)));
        if (conflito) indisponiveis.push({data:dataISO,motivo:'horário já ocupado'});
        else validas.push(dataISO);
    }
    return { validas, indisponiveis };
}

function textoDatasIndisponiveisRecorrencia(lista = []) {
    return lista.slice(0,8).map(item => {
        const d = agendaDataUTC(item.data);
        const rotulo = d ? d.toLocaleDateString('pt-BR',{timeZone:'UTC'}) : item.data;
        return `${rotulo} — ${item.motivo}`;
    }).join('\n') + (lista.length > 8 ? `\n… e mais ${lista.length-8}` : '');
}

/* --------------------------------------------------------------------
   MODAL: NOVO AGENDAMENTO
   -------------------------------------------------------------------- */
function configurarModalEdicaoAtendimento(agendamento = null) {
    const editando = !!agendamento?.id;
    agendaEdicaoAtendimentoId = editando ? String(agendamento.id) : null;
    const paciente = document.getElementById('ag_paciente_select');
    const pacienteBusca = document.getElementById('ag_paciente_busca');
    const data = document.getElementById('ag_data_input');
    const recorrencia = document.getElementById('ag_recorrencia_bloco');
    const extra = document.getElementById('ag_horario_extra_toggle')?.closest('.input-group');
    const observacoes = document.getElementById('ag_observacoes')?.closest('.input-group');
    const listaEspera = document.querySelector('#modal_agendamento button[onclick*="abrirModalListaEspera"]');
    const botaoSalvar = document.getElementById('btn_salvar_agendamento');
    const avisoEdicao = document.getElementById('ag_edicao_escopo');
    document.querySelectorAll('#modal_agendamento .agenda-finance-link').forEach(el => {
        el.hidden = editando || !usuarioEhAdministradorAgenda();
    });
    if (avisoEdicao) {
        avisoEdicao.hidden = !editando;
        avisoEdicao.textContent = editando
            ? 'Editando somente esta ocorrência. Altere Data, Horário, Procedimento ou Profissional. Paciente, recorrência, status, confirmação e financeiro serão preservados.'
            : '';
    }
    if (paciente) {
        paciente.disabled = editando;
        paciente.setAttribute('aria-disabled', String(editando));
    }
    if (pacienteBusca) {
        pacienteBusca.disabled = editando;
        pacienteBusca.setAttribute('aria-disabled', String(editando));
    }
    if (data) {
        data.disabled = false;
        data.setAttribute('aria-disabled', 'false');
    }
    if (recorrencia) recorrencia.hidden = editando;
    if (extra) extra.hidden = editando;
    if (observacoes) observacoes.hidden = editando;
    if (listaEspera) listaEspera.hidden = editando || !usuarioPodeVerAgendaClinicaToda();
    if (botaoSalvar) botaoSalvar.textContent = editando ? 'Salvar alterações' : 'Confirmar Agendamento';
}

async function abrirModalAgendamento(profissionalPre, dataPre, horaPre, opcoes = {}) {
    if (!_supabase) {
        mostrarFeedbackAgenda('Agenda indisponível: conexão com o banco não inicializada.', 'erro');
        return;
    }
    const atendimentoEdicao = opcoes?.agendamento?.id ? opcoes.agendamento : null;
    agendaEdicaoAtendimentoId = atendimentoEdicao ? String(atendimentoEdicao.id) : null;
    document.getElementById('ag_id').value = agendaEdicaoAtendimentoId || '';
    document.getElementById('modal_agendamento_titulo').textContent = atendimentoEdicao ? 'Editar atendimento' : 'Novo agendamento';
    document.getElementById('ag_observacoes').value = '';
    const statusInicial = document.getElementById('ag_status_inicial'); if (statusInicial) statusInicial.value = 'agendado';
    const extraToggle = document.getElementById('ag_horario_extra_toggle'); if (extraToggle) extraToggle.checked = false;
    const extraBloco = document.getElementById('ag_horario_extra_bloco'); if (extraBloco) extraBloco.hidden = true;
    const extraInicio = document.getElementById('ag_horario_extra_inicio'); if (extraInicio) extraInicio.value = '';
    const extraResumo = document.getElementById('ag_horario_extra_resumo'); if (extraResumo) extraResumo.textContent = '';
    resetarRecorrenciaAgendamento();
    mostrarFeedbackAgendaModal('', 'info');
    agendaHoraPreSelecionadaModal = horaPre || '';
    agendaExcecaoJornadaPromptadaChaveModal = '';

    try {
        // Atualiza a equipe no momento da abertura para que profissionais recém-
        // cadastrados apareçam imediatamente e para não depender do cache da tela.
        if (!await carregarProfissionaisAgenda()) throw new Error('Não foi possível atualizar os profissionais.');
        if (!usuarioEhAdministradorAgenda()) await Promise.all([carregarProcedimentos(),carregarHorarios(),carregarBloqueios()]);
        const selProfissional = document.getElementById('ag_profissional_select');
        const podeVerClinicaToda = usuarioPodeVerAgendaClinicaToda();
        const profissionalProprio = encontrarProfissionalAgendaDoUsuario();
        if (selProfissional && !agendaEquipeCache.length) {
            selProfissional.innerHTML = '<option value="">Nenhum profissional de atendimento cadastrado</option>';
            selProfissional.disabled = true;
        } else if (selProfissional && podeVerClinicaToda) {
            selProfissional.disabled = false;
        } else if (selProfissional) {
            if (!profissionalProprio) {
                mostrarFeedbackAgenda('Seu usuário não está vinculado a um profissional habilitado na Agenda.', 'aviso');
                return;
            }
            selProfissional.innerHTML = `<option value="${escapeHTML(profissionalProprio.id)}">${escapeHTML(profissionalProprio.nome)}</option>`;
            selProfissional.value = String(profissionalProprio.id);
            selProfissional.disabled = true;
        }

        const pacientes = await obterPacientesBasicosAgenda();
        const selPaciente = document.getElementById('ag_paciente_select');
        prepararBuscaPacienteAgendamento(pacientes, atendimentoEdicao?.paciente_id || '');

        const profissionalInicial = podeVerClinicaToda
            ? (atendimentoEdicao?.profissional_id || profissionalPre || document.getElementById('agenda_filtro_profissional')?.value || '')
            : String(profissionalProprio?.id || '');
        document.getElementById('ag_profissional_select').value = profissionalInicial;
        document.getElementById('ag_data_input').value = atendimentoEdicao?.data || dataPre || formatarDataISO(agendaDataSelecionada);
        const dataBaseRec = document.getElementById('ag_data_input').value;
        const dataLimiteRec = document.getElementById('ag_recorrencia_data_limite'); if (dataLimiteRec) dataLimiteRec.min = dataBaseRec;
        const dataCustomRec = document.getElementById('ag_recorrencia_data_custom'); if (dataCustomRec) dataCustomRec.min = dataBaseRec;
        atualizarResumoRecorrencia();
        document.getElementById('ag_procedimento_select').value = atendimentoEdicao?.procedimento_id || '';
        document.getElementById('ag_horario_select').innerHTML = '<option value="">-- Escolha profissional e procedimento --</option>';
        const selPlano = document.getElementById('ag_plano_select');
        if (selPlano) { selPlano.innerHTML = '<option value="">Selecione um paciente para ver os pacotes</option>'; selPlano.disabled = false; }
        const statusPlano = document.getElementById('ag_plano_status'); if (statusPlano) statusPlano.textContent = 'Selecione o paciente para carregar automaticamente os planos/pacotes ativos.';
        const resumoPlano = document.getElementById('ag_plano_resumo'); if (resumoPlano) { resumoPlano.hidden = true; resumoPlano.textContent = ''; }
        if (atendimentoEdicao) {
            selPaciente.value = atendimentoEdicao.paciente_id || '';
            document.getElementById('ag_observacoes').value = atendimentoEdicao.observacoes || '';
        }
        atualizarControlesAgendaPorPerfil();
        configurarModalEdicaoAtendimento(atendimentoEdicao);
        abrirModal('modal_agendamento');
        if (atendimentoEdicao) await atualizarHorariosDisponiveisModal(horaCurta(atendimentoEdicao.hora_inicio));
    } catch (err) {
        console.error('Erro ao preparar novo agendamento:', err);
        mostrarFeedbackAgenda('Não foi possível abrir o agendamento: ' + (err.message || err), 'erro');
    }
}

async function oferecerExcecaoJornadaProfissionalModal(profissionalId, dataISO) {
    if (!profissionalId || !dataISO || horarioExtraordinarioAtivoModal()) return false;
    const contexto = obterContextoJornadaProfissionalAgenda(profissionalId, dataISO);
    if (!contexto.semAtendimentoNoDia) return false;

    const selHorario = document.getElementById('ag_horario_select');
    if (selHorario) {
        selHorario.disabled = false;
        selHorario.innerHTML = `<option value="">${escapeHTML(contexto.nomeDia)} fora da jornada deste profissional</option>`;
    }
    const profissionalNome = document.getElementById('ag_profissional_select')?.selectedOptions?.[0]?.textContent?.trim() || 'Este profissional';
    const dataBR = formatarDataAgendaBR(dataISO);
    mostrarFeedbackAgendaModal(
        `${profissionalNome} não possui horário de atendimento cadastrado para ${contexto.nomeDia.toLowerCase()} (${dataBR}). Este agendamento é uma exceção e precisa ser feito como horário extraordinário.`,
        'aviso'
    );

    const chave = `${profissionalId}|${dataISO}`;
    if (agendaExcecaoJornadaPromptadaChaveModal === chave) return true;
    agendaExcecaoJornadaPromptadaChaveModal = chave;

    const confirmar = await confirmarKineSys(
        `${profissionalNome} não atende normalmente em ${contexto.nomeDia.toLowerCase()}.

Data escolhida: ${dataBR}.

Deseja continuar e criar um agendamento fora do dia/horário de atendimento desse profissional? Se você prosseguir, o KineSys tratará o atendimento como extraordinário, pedirá a confirmação final do horário antes de salvar e notificará ${profissionalNome} após o agendamento.`,
        { titulo:'Fora da jornada do profissional', confirmar:'Continuar com exceção', cancelar:'Voltar e escolher outra data', tipo:'aviso' }
    );
    if (!confirmar) return true;

    const toggle = document.getElementById('ag_horario_extra_toggle');
    if (toggle) toggle.checked = true;
    const inputExtra = document.getElementById('ag_horario_extra_inicio');
    if (inputExtra && !inputExtra.value) {
        const inicioClinica = contexto.janelasClinica?.[0]?.hora_inicio ? horaCurta(contexto.janelasClinica[0].hora_inicio) : '';
        inputExtra.value = agendaHoraPreSelecionadaModal || inicioClinica || '08:00';
    }
    await aoAlternarHorarioExtraordinario();
    mostrarFeedbackAgendaModal(
        `Exceção liberada para ${profissionalNome} em ${dataBR}. Informe o horário extraordinário. O profissional será notificado quando o agendamento for salvo.`,
        'aviso'
    );
    return true;
}

async function atualizarHorariosDisponiveisModal(horaParaPreSelecionar) {
    const profissionalId = document.getElementById('ag_profissional_select').value;
    const procedimentoSel = document.getElementById('ag_procedimento_select');
    const procedimentoId = procedimentoSel.value;
    const dataISO = document.getElementById('ag_data_input').value;
    const selHorario = document.getElementById('ag_horario_select');
    const preferida = horaParaPreSelecionar || agendaHoraPreSelecionadaModal;

    mostrarFeedbackAgendaModal('', 'info');
    if (!profissionalId || !procedimentoId || !dataISO) {
        selHorario.innerHTML = '<option value="">-- Escolha profissional, procedimento e data --</option>';
        return;
    }

    const procedimento = agendaProcedimentosCache.find(p => String(p.id) === String(procedimentoId));
    if (procedimento && Array.isArray(procedimento.profissionais_ids) && procedimento.profissionais_ids.length && !procedimento.profissionais_ids.includes(profissionalId)) {
        selHorario.innerHTML = '<option value="">Procedimento não habilitado para este profissional</option>';
        mostrarFeedbackAgendaModal('O procedimento selecionado não está habilitado para este profissional.', 'erro');
        return;
    }

    const duracao = parseInt(procedimentoSel.selectedOptions[0]?.dataset.duracao || '30', 10);
    if (horarioExtraordinarioAtivoModal()) {
        selHorario.innerHTML = '<option value="">Horário extraordinário definido abaixo</option>';
        selHorario.disabled = true;
        atualizarResumoHorarioExtraordinario();
        return;
    }
    const feriado = obterFeriadoAgenda(dataISO);
    if (feriado) {
        selHorario.disabled = false;
        selHorario.innerHTML = '<option value="">Agenda padrão bloqueada por feriado</option>';
        mostrarFeedbackAgendaModal(`${rotuloTipoFeriadoAgenda(feriado)} — ${feriado.nome}. Não há horários padrão disponíveis nesta data. Para criar uma exceção, ative “Agendar fora do horário padrão”; o profissional responsável será notificado.`, 'aviso');
        return;
    }

    // Se o profissional possui uma jornada própria e o dia escolhido não faz
    // parte dela, não herdamos silenciosamente a agenda geral da clínica.
    // O KineSys identifica a exceção, pergunta se deve prosseguir e, em caso
    // positivo, abre automaticamente o fluxo extraordinário com notificação.
    if (await oferecerExcecaoJornadaProfissionalModal(profissionalId, dataISO)) return;

    selHorario.disabled = false;
    try {
        const { data: agendamentosDia, error } = await _supabase.from('agendamentos')
            .select('id,profissional_id,data,hora_inicio,hora_fim,status')
            .eq('data', dataISO).eq('profissional_id', profissionalId).neq('status', 'cancelado');
        if (error) throw error;

        const agendamentosConsiderados = (agendamentosDia || []).filter(a => String(a.id) !== String(agendaEdicaoAtendimentoId || ''));
        const livres = calcularSlotsLivres(profissionalId, dataISO, duracao, agendamentosConsiderados);
        if (!livres.length) {
            selHorario.innerHTML = '<option value="">Nenhum horário livre nesta data</option>';
            mostrarFeedbackAgendaModal('Não há horário livre compatível com a duração deste procedimento.', 'info');
            return;
        }
        selHorario.innerHTML = '<option value="">-- Selecione um horário --</option>' + livres.map(l =>
            `<option value="${l.inicio}|${l.fim}">${l.inicio} – ${l.fim}</option>`
        ).join('');

        if (preferida) {
            const opcao = Array.from(selHorario.options).find(o => o.value.startsWith(preferida + '|'));
            if (opcao) selHorario.value = opcao.value;
        }
        agendaHoraPreSelecionadaModal = '';
    } catch (err) {
        console.error('Erro ao calcular horários disponíveis:', err);
        selHorario.innerHTML = '<option value="">Erro ao carregar horários</option>';
        mostrarFeedbackAgendaModal('Não foi possível consultar os horários: ' + (err.message || err), 'erro');
    }
}

async function existeConflitoImediato(profissionalId, dataISO, horaInicio, horaFim, agendamentoIgnoradoId = null) {
    let data = [];
    let error = null;
    if (_supabase) {
        const resposta = await _supabase.from('agendamentos')
            .select('id,hora_inicio,hora_fim,status')
            .eq('data', dataISO)
            .eq('profissional_id', profissionalId)
            .neq('status', 'cancelado');
        data = resposta.data || [];
        error = resposta.error;
    } else {
        error = new Error('Supabase indisponível');
    }
    if (error && !erroAgendaEhTransitorio(error)) throw error;
    if (error) console.warn('Agenda: conflito imediato conferido apenas contra a fila local; a nuvem será validada na sincronização.', error);

    const pendentes = lerAgendamentosPendentesSync()
        .map(x => x.payload || {})
        .filter(a => String(a.profissional_id || '') === String(profissionalId || '') && a.data === dataISO && statusAgendaOcupaHorario(a.status));
    const ini = horaParaMinutos(horaInicio);
    const fim = horaParaMinutos(horaFim);
    return [...data, ...pendentes]
        .filter(a => String(a.id || '') !== String(agendamentoIgnoradoId || '') && statusAgendaOcupaHorario(a.status))
        .some(a => ini < horaParaMinutos(horaCurta(a.hora_fim)) && fim > horaParaMinutos(horaCurta(a.hora_inicio)));
}

async function resolverListaEsperaAposAgendamento(pacienteId) {
    if (!usuarioPodeVerAgendaClinicaToda()) return {encontrou:false,removeu:false};
    if (!_supabase || !pacienteId) return { encontrou: false, removeu: false };
    try {
        const { data, error } = await _supabase.from('lista_espera')
            .select('id,paciente_id,status')
            .eq('paciente_id', pacienteId)
            .eq('status', 'ativo');
        if (error) throw error;

        const entradasAtivas = data || [];
        if (!entradasAtivas.length) return { encontrou: false, removeu: false };

        const quantidade = entradasAtivas.length;
        const mensagem = quantidade === 1
            ? 'Este paciente está na lista de espera e acabou de receber um agendamento. Deseja retirar o nome dele da lista de espera ou mantê-lo para outras possibilidades de horário?'
            : `Este paciente possui ${quantidade} entradas ativas na lista de espera e acabou de receber um agendamento. Deseja retirar todas as entradas da lista ou mantê-las?`;

        const retirar = await confirmarKineSys(mensagem, {
            titulo: 'Paciente está na lista de espera',
            confirmar: quantidade === 1 ? 'Retirar da lista' : 'Retirar todas',
            cancelar: 'Manter na lista',
            tipo: 'info'
        });

        if (!retirar) return { encontrou: true, removeu: false };

        const ids = entradasAtivas.map(item => item.id).filter(Boolean);
        if (!ids.length) return { encontrou: true, removeu: false };
        const { error: erroUpdate } = await _supabase.from('lista_espera')
            .update({ status: 'atendido' })
            .in('id', ids);
        if (erroUpdate) throw erroUpdate;

        await carregarListaEspera();
        mostrarFeedbackAgenda(quantidade === 1
            ? 'Paciente retirado da lista de espera após o agendamento.'
            : `${quantidade} entradas do paciente foram retiradas da lista de espera.`, 'sucesso');
        return { encontrou: true, removeu: true };
    } catch (err) {
        console.warn('Agendamento salvo, mas não foi possível revisar a lista de espera:', err);
        alert('⚠️ O agendamento foi salvo, mas não foi possível verificar/atualizar a lista de espera. Revise a fila manualmente.');
        return { encontrou: false, removeu: false, erro: err };
    }
}

async function salvarEdicaoAtendimentoAtual({ profissionalId, procedimentoId, dataISO, horarioVal }) {
    const id = String(agendaEdicaoAtendimentoId || '');
    const a = agendaAgendamentosSemanaCache.find(x => String(x.id) === id)
        || agendaAgendamentosDoDiaCache.find(x => String(x.id) === id);
    if (!id || !a) {
        mostrarFeedbackAgendaModal('O atendimento não foi encontrado. Feche a edição e atualize a agenda.', 'erro');
        return false;
    }
    if (!usuarioPodeVerAgendaClinicaToda() || !agendaPodeMarcarProfissional(profissionalId)) {
        mostrarFeedbackAgendaModal('Seu perfil não possui autorização para editar este atendimento.', 'erro');
        return false;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(dataISO || ''))) {
        mostrarFeedbackAgendaModal('Selecione uma data válida.', 'erro');
        return false;
    }
    const procedimento = agendaProcedimentosCache.find(p => String(p.id) === String(procedimentoId));
    if (!procedimento) {
        mostrarFeedbackAgendaModal('Selecione um procedimento disponível.', 'erro');
        return false;
    }
    if (Array.isArray(procedimento.profissionais_ids) && procedimento.profissionais_ids.length
        && !procedimento.profissionais_ids.some(idProf => String(idProf) === String(profissionalId))) {
        mostrarFeedbackAgendaModal('O procedimento selecionado não está habilitado para este profissional.', 'erro');
        return false;
    }
    const [horaInicio, horaFim] = String(horarioVal || '').split('|');
    if (!horaInicio || !horaFim) {
        mostrarFeedbackAgendaModal('Selecione um horário disponível.', 'erro');
        return false;
    }
    const conflito = await existeConflitoImediato(profissionalId, dataISO, horaInicio, horaFim, id);
    if (conflito) {
        mostrarFeedbackAgendaModal('Este profissional já possui outro atendimento nesse horário. Escolha um horário disponível.', 'erro');
        return false;
    }

    const mudouProcedimento = String(a.procedimento_id || '') !== String(procedimentoId || '');
    let financeiroAnterior = null;
    if (mudouProcedimento && typeof obterSituacaoPagamentoAgendamento === 'function') {
        try { financeiroAnterior = await obterSituacaoPagamentoAgendamento(a); } catch (_) {}
    }
    if (mudouProcedimento && Number(financeiroAnterior?.pagos || 0) > 0) {
        const continuar = await confirmarKineSys(
            'Este atendimento já possui pagamento registrado. O pagamento e o histórico financeiro serão preservados no mesmo atendimento; apenas o procedimento da ocorrência será atualizado. Deseja continuar?',
            { titulo:'Preservar pagamento existente', confirmar:'Salvar alteração', cancelar:'Voltar' }
        );
        if (!continuar) return false;
    }

    const alteracoes = {
        profissional_id: profissionalId,
        procedimento_id: procedimentoId,
        data: dataISO,
        hora_inicio: horaInicio,
        hora_fim: horaFim
    };
    const pendenteLocal = lerAgendamentosPendentesSync().some(x => String(x.payload?.id || '') === id);
    let salvo = false;
    if (_supabase) {
        const { data, error } = await _supabase.from('agendamentos').update(alteracoes)
            .eq('id', id)
            .eq('data', a.data)
            .eq('hora_inicio', a.hora_inicio)
            .select('id');
        if (error) {
            if (erroEhConflitoAgenda(error)) {
                mostrarFeedbackAgendaModal('O horário acabou de ser ocupado por outro atendimento. Escolha outro horário.', 'erro');
                return false;
            }
            if (!(erroAgendaEhTransitorio(error) && pendenteLocal)) throw error;
        } else {
            if (data?.length !== 1 && !pendenteLocal) {
                throw new Error('O atendimento foi alterado por outra pessoa. Atualize a agenda e tente novamente.');
            }
            salvo = data?.length === 1;
        }
    }
    if (!salvo && pendenteLocal) {
        salvo = atualizarPayloadAgendamentoPendenteSync(id, alteracoes);
    }
    if (!salvo) throw new Error('Não foi possível confirmar a atualização do atendimento.');
    if (typeof invalidarCacheAgendaSemana === 'function') invalidarCacheAgendaSemana();

    Object.assign(a, alteracoes, {
        equipe: agendaEquipeCache.find(p => String(p.id) === String(profissionalId)) || a.equipe,
        procedimentos: procedimento
    });
    if (a.plano_id && typeof salvarVinculoAgendaLocal === 'function') {
        salvarVinculoAgendaLocal(id, a.plano_id, a.paciente_id, procedimentoId, a.status || 'agendado');
    }
    if (mudouProcedimento && Number(financeiroAnterior?.pagos || 0) <= 0 && _supabase) {
        try { await _supabase.rpc('kinesys_preparar_cobranca_agendamento', { p_agendamento_id:id }); }
        catch (err) { console.warn('Atendimento atualizado; cobrança será reconciliada na próxima abertura do Financeiro.', err); }
    }

    agendaEdicaoAtendimentoId = null;
    document.getElementById('ag_id').value = '';
    agendaDataSelecionada = new Date(dataISO + 'T00:00:00');
    const inputDataAgenda = document.getElementById('agenda_data_input');
    if (inputDataAgenda) inputDataAgenda.value = dataISO;
    fecharModal('modal_agendamento');
    const filtroProfissional = document.getElementById('agenda_filtro_profissional');
    if (filtroProfissional?.value && String(filtroProfissional.value) !== String(profissionalId)) {
        filtroProfissional.value = String(profissionalId);
        agendaUltimoProfissional = String(profissionalId);
    }
    await renderizarPainelAgenda();
    mostrarFeedbackAgenda('Atendimento atualizado. A ocorrência selecionada e seus vínculos foram preservados.', 'sucesso');
    await abrirDetalheAgendamento(id);
    return true;
}

async function salvarAgendamento() {
    if (agendaSalvando) return;
    const btn = document.getElementById('btn_salvar_agendamento');
    const pacienteId = document.getElementById('ag_paciente_select').value;
    const profissionalId = document.getElementById('ag_profissional_select').value;
    if (!agendaPodeMarcarProfissional(profissionalId)) { mostrarFeedbackAgendaModal('Selecione um profissional autorizado para sua agenda.', 'erro'); return; }
    const procedimentoId = document.getElementById('ag_procedimento_select').value;
    const dataISO = document.getElementById('ag_data_input').value;
    const horarioVal = document.getElementById('ag_horario_select').value;
    const usarHorarioExtraordinario = horarioExtraordinarioAtivoModal();
    const horarioExtra = usarHorarioExtraordinario ? lerHorarioExtraordinarioModal() : null;
    const observacoes = document.getElementById('ag_observacoes').value.trim();
    const statusInicialSolicitado = usuarioPodeVerAgendaClinicaToda() && document.getElementById('ag_status_inicial')?.value === 'pre_agendado' ? 'pre_agendado' : 'agendado';

    if (!_supabase) {
        mostrarFeedbackAgendaModal('Conexão com o Supabase não inicializada. Recarregue o sistema e tente novamente.', 'erro');
        return;
    }
    const faltantes = [];
    if (!pacienteId) faltantes.push('paciente');
    if (!profissionalId) faltantes.push('profissional');
    if (!procedimentoId) faltantes.push('procedimento');
    if (!dataISO) faltantes.push('data');
    if (!usarHorarioExtraordinario && !horarioVal) faltantes.push('horário');
    if (usarHorarioExtraordinario && !horarioExtra?.valido) faltantes.push('horário extraordinário válido');
    if (faltantes.length) {
        mostrarFeedbackAgendaModal('Preencha: ' + faltantes.join(', ') + '.', 'erro');
        return;
    }

    if (agendaEdicaoAtendimentoId) {
        agendaSalvando = true;
        if (btn) { btn.disabled = true; btn.textContent = 'Salvando alterações…'; }
        mostrarFeedbackAgendaModal('Validando e atualizando este atendimento…', 'info');
        try {
            await salvarEdicaoAtendimentoAtual({ profissionalId, procedimentoId, dataISO, horarioVal });
        } catch (err) {
            console.error('Erro ao editar atendimento:', err);
            mostrarFeedbackAgendaModal('Não foi possível salvar as alterações: ' + mensagemErroSalvarAgenda(err), 'erro');
        } finally {
            agendaSalvando = false;
            if (btn) { btn.disabled = false; btn.textContent = agendaEdicaoAtendimentoId ? 'Salvar alterações' : 'Confirmar Agendamento'; }
        }
        return;
    }

    const cfgRecorrencia = lerConfiguracaoRecorrenciaModal();
    let datasSolicitadas = gerarDatasRecorrenciaAgenda(cfgRecorrencia);
    if (!datasSolicitadas.length) {
        const msg = cfgRecorrencia.tipo === 'dias_semana' && !cfgRecorrencia.diasSemana.length
            ? 'Escolha pelo menos um dia da semana para a repetição.'
            : 'Complete corretamente a regra de repetição (quantidade ou data final).';
        mostrarFeedbackAgendaModal(msg, 'erro');
        return;
    }
    if (cfgRecorrencia.tipo === 'datas_especificas' && datasSolicitadas.length < 2) {
        mostrarFeedbackAgendaModal('Adicione pelo menos uma outra data para criar uma repetição por datas específicas.', 'erro');
        return;
    }

    const [horaInicio, horaFim] = usarHorarioExtraordinario
        ? [horarioExtra.inicio, horarioExtra.fim]
        : horarioVal.split('|');
    agendaSalvando = true;
    if (btn) { btn.disabled = true; btn.textContent = datasSolicitadas.length > 1 ? 'Criando série…' : 'Salvando…'; }
    mostrarFeedbackAgendaModal(datasSolicitadas.length > 1 ? `Validando ${datasSolicitadas.length} agendamentos…` : 'Salvando agendamento…', 'info');

    try {
        const planoId = usuarioEhAdministradorAgenda() ? (document.getElementById('ag_plano_select')?.value || '') : '';
        let validacaoPlano = {ok:true, modo:'nenhum', plano:null};
        if (planoId && typeof validarPlanoParaAgendamento === 'function') {
            validacaoPlano = await validarPlanoParaAgendamento(planoId, pacienteId, procedimentoId);
            if (!validacaoPlano.ok) {
                mostrarFeedbackAgendaModal(validacaoPlano.mensagem || 'Não foi possível vincular este pacote.', 'erro');
                await popularPlanosNoAgendamento(pacienteId, procedimentoId, planoId);
                return;
            }
        }

        if (typeof ehAtendimentoUnitario === 'function' && ehAtendimentoUnitario(validacaoPlano.plano) && datasSolicitadas.length !== 1) {
            mostrarFeedbackAgendaModal('Um atendimento unitário cobre apenas um horário. Escolha Não repetir.', 'erro');
            return;
        }
        const optPlano = document.getElementById('ag_plano_select')?.selectedOptions?.[0];
        const capacidadePacote = Number(optPlano?.dataset?.disponiveis || validacaoPlano.plano?.sessoes_disponiveis_vinculo || optPlano?.dataset?.restantes || 0);

        const analise = await analisarDatasRecorrenciaAgenda(datasSolicitadas, profissionalId, horaInicio, horaFim, { permitirExtraordinario: usarHorarioExtraordinario });
        if (!analise.validas.length) {
            mostrarFeedbackAgendaModal('Nenhuma das datas solicitadas está disponível nesse horário.\n' + textoDatasIndisponiveisRecorrencia(analise.indisponiveis), 'erro');
            return;
        }
        if (analise.indisponiveis.length) {
            const seguir = await confirmarKineSys(
                `${analise.indisponiveis.length} data(s) da série não estão disponíveis e serão ignoradas:\n\n${textoDatasIndisponiveisRecorrencia(analise.indisponiveis)}\n\nCriar os ${analise.validas.length} agendamentos disponíveis?`,
                { titulo:'Conflitos na série', confirmar:'Criar datas disponíveis' }
            );
            if (!seguir) return;
        }
        datasSolicitadas = analise.validas;

        const datasExtraordinarias = datasSolicitadas.filter(d => !intervaloDentroDaJornadaPadrao(profissionalId, d, horaInicio, horaFim));
        if (datasExtraordinarias.length) {
            const profissionalNome = document.getElementById('ag_profissional_select')?.selectedOptions?.[0]?.textContent || 'profissional';
            const primeira = formatarDataAgendaBR(datasExtraordinarias[0]);
            const resumoDatas = datasExtraordinarias.length === 1 ? primeira : `${datasExtraordinarias.length} datas da série (a primeira em ${primeira})`;
            const classificacoesExtra = datasExtraordinarias.map(d => ({ data:d, ...classificarHorarioExtraordinarioAgenda(profissionalId, d, horaInicio, horaFim) }));
            const feriadosExtra = classificacoesExtra.filter(x => x.tipo === 'feriado');
            const foraDiaProfissional = classificacoesExtra.filter(x => x.tipo === 'fora_dia_profissional');
            const foraHorarioProfissional = classificacoesExtra.filter(x => x.tipo === 'fora_horario_profissional');
            const detalheFeriado = feriadosExtra.length
                ? `

${feriadosExtra.length === 1 ? 'A data selecionada é' : `${feriadosExtra.length} datas da série são`} feriado: ${feriadosExtra.slice(0,3).map(x => `${formatarDataAgendaBR(x.data)} — ${x.feriado?.nome || 'feriado'}`).join('; ')}${feriadosExtra.length > 3 ? '; …' : ''}. A agenda padrão fica fechada nessas datas.`
                : '';
            const detalheJornada = foraDiaProfissional.length
                ? `

${profissionalNome} não possui jornada cadastrada ${foraDiaProfissional.length === 1 ? 'nesse dia da semana' : `em ${foraDiaProfissional.length} dessas datas`}. Este é um agendamento fora do dia regular de atendimento do profissional.`
                : (foraHorarioProfissional.length ? `

O horário escolhido está fora da jornada cadastrada de ${profissionalNome}.` : '');
            const confirmarExtra = await confirmarKineSys(
                `O horário ${horaInicio}–${horaFim} é uma exceção à jornada padrão em ${resumoDatas}.${detalheFeriado}${detalheJornada}

Conflitos de agenda e bloqueios manuais continuam protegidos. Se você confirmar, o agendamento será salvo como extraordinário e ${profissionalNome} receberá um aviso interno.

Deseja realmente realizar esse agendamento?`,
                { titulo: feriadosExtra.length ? 'Agendamento extraordinário em feriado' : (foraDiaProfissional.length ? 'Fora do dia de atendimento' : 'Horário fora do padrão'), confirmar:'Sim, agendar mesmo assim', cancelar:'Voltar e revisar', tipo:'aviso' }
            );
            if (!confirmarExtra) return;
        }

        if (planoId && datasSolicitadas.length > capacidadePacote) {
            const excedentes = Math.max(0, datasSolicitadas.length - capacidadePacote);
            const continuar = await confirmarKineSys(
                `Esta série possui ${datasSolicitadas.length} horário(s), mas o pacote tem cobertura disponível para ${capacidadePacote}.\n\nOs primeiros ${Math.min(capacidadePacote,datasSolicitadas.length)} serão vinculados ao pacote e ${excedentes} ficarão como Pré-agendado sem cobertura financeira, preservando o horário para uma possível renovação.\n\nDeseja continuar?`,
                { titulo:'Pré-agendamentos além do pacote', confirmar:'Criar série' }
            );
            if (!continuar) return;
        }

        const metaBase = {
            paciente_nome: pacienteAgendaPorId(pacienteId)?.nome || document.getElementById('ag_paciente_busca')?.value?.trim() || 'Paciente',
            profissional_nome: document.getElementById('ag_profissional_select')?.selectedOptions?.[0]?.textContent || 'Profissional',
            procedimento_nome: document.getElementById('ag_procedimento_select')?.selectedOptions?.[0]?.textContent || 'Atendimento',
            profissional_email: agendaEquipeCache.find(p => String(p.id) === String(profissionalId))?.email || null,
            criado_por: usuarioLogado?.nome || 'Desconhecido',
            revisar_lista_espera: usuarioPodeVerAgendaClinicaToda()
        };

        let salvos = 0, sincronizados = 0, pendentes = 0, conflitosTardios = 0, falhas = 0, preAgendadosSemCobertura = 0, avisosProfissionalEnviados = 0, avisosProfissionalPendentes = 0;
        let primeiroErro = null;
        const idsSalvos = [];
        for (let i = 0; i < datasSolicitadas.length; i++) {
            const dataOcorrencia = datasSolicitadas[i];
            mostrarFeedbackAgendaModal(`Salvando ${i+1} de ${datasSolicitadas.length}…`, 'info');
            const cobertoPeloPacote = !!planoId && i < capacidadePacote;
            const excedenteDoPacote = !!planoId && !cobertoPeloPacote;
            const statusOcorrencia = excedenteDoPacote ? 'pre_agendado' : (cobertoPeloPacote ? 'agendado' : statusInicialSolicitado);
            const ehExtraordinario = !intervaloDentroDaJornadaPadrao(profissionalId, dataOcorrencia, horaInicio, horaFim);
            const classificacaoExtraordinario = ehExtraordinario ? classificarHorarioExtraordinarioAgenda(profissionalId, dataOcorrencia, horaInicio, horaFim) : null;
            const motivoExtraordinario = ehExtraordinario ? (classificacaoExtraordinario?.motivo || motivoHorarioExtraordinarioAgenda(profissionalId, dataOcorrencia, horaInicio, horaFim)) : '';
            const novoAgendamento = {
                id: gerarIdAgendamentoKineSys(),
                paciente_id: pacienteId,
                profissional_id: profissionalId,
                procedimento_id: procedimentoId,
                data: dataOcorrencia,
                hora_inicio: horaInicio,
                hora_fim: horaFim,
                status: statusOcorrencia,
                observacoes,
                criado_por: usuarioLogado?.nome || 'Desconhecido',
                horario_extraordinario: ehExtraordinario,
                horario_extraordinario_confirmado_por: ehExtraordinario ? (usuarioLogado?.nome || 'Desconhecido') : null,
                horario_extraordinario_confirmado_em: ehExtraordinario ? new Date().toISOString() : null
            };
            if (cobertoPeloPacote && validacaoPlano.modo === 'nuvem') novoAgendamento.plano_id = planoId;

            const persistencia = await inserirAgendamentoNuvemConfiavel(novoAgendamento, {
                permitirFila: true,
                metadados: { ...metaBase, recorrencia: cfgRecorrencia.tipo, recorrencia_indice: i+1, recorrencia_total: datasSolicitadas.length, horario_extraordinario: ehExtraordinario, motivo_extraordinario: motivoExtraordinario, tipo_extraordinario: classificacaoExtraordinario?.tipo || null, classificacao_extraordinario: classificacaoExtraordinario ? { tipo: classificacaoExtraordinario.tipo, motivo: classificacaoExtraordinario.motivo } : null, cobertura_financeira: cobertoPeloPacote ? 'pacote' : (statusOcorrencia === 'pre_agendado' ? 'pre_agendado_sem_cobertura' : 'sem_pacote') }
            });
            if (!persistencia.ok) {
                if (persistencia.conflito || erroEhConflitoAgenda(persistencia.error)) { conflitosTardios++; continue; }
                falhas++;
                primeiroErro = primeiroErro || persistencia.error;
                continue;
            }
            salvos++;
            if (novoAgendamento.status === 'pre_agendado' && !novoAgendamento.plano_id && !cobertoPeloPacote) preAgendadosSemCobertura++;
            idsSalvos.push(novoAgendamento.id);
            if (persistencia.sincronizado) {
                sincronizados++;
                if (ehExtraordinario) {
                    const aviso = await registrarNotificacaoHorarioExtraordinario(novoAgendamento, { ...metaBase, motivo_extraordinario: motivoExtraordinario, tipo_extraordinario: classificacaoExtraordinario?.tipo || null, classificacao_extraordinario: classificacaoExtraordinario ? { tipo: classificacaoExtraordinario.tipo, motivo: classificacaoExtraordinario.motivo } : null });
                    if (aviso?.pendente) avisosProfissionalPendentes++; else if (aviso?.ok) avisosProfissionalEnviados++;
                }
            } else {
                pendentes++;
                if (ehExtraordinario) avisosProfissionalPendentes++;
            }
            const vinculoLocal = cobertoPeloPacote && (validacaoPlano.modo !== 'nuvem' || persistencia.vinculoLocal || persistencia.pendente);
            if (cobertoPeloPacote && vinculoLocal && typeof salvarVinculoAgendaLocal === 'function') {
                salvarVinculoAgendaLocal(novoAgendamento.id, planoId, pacienteId, procedimentoId, statusOcorrencia);
            }
        }

        if (!salvos) {
            throw primeiroErro || new Error('Nenhum agendamento da série pôde ser salvo.');
        }
        invalidarCacheAgendaSemana();

        agendaDataSelecionada = new Date(datasSolicitadas[0] + 'T00:00:00');
        const inputData = document.getElementById('agenda_data_input');
        if (inputData) inputData.value = datasSolicitadas[0];
        fecharModal('modal_agendamento');
        await renderizarPainelAgenda({ pularSync: pendentes > 0 });

        const partes = [`${salvos} agendamento(s) criado(s)`];
        if (sincronizados) partes.push(`${sincronizados} sincronizado(s)`);
        if (pendentes) partes.push(`${pendentes} aguardando sincronização`);
        if (analise.indisponiveis.length) partes.push(`${analise.indisponiveis.length} data(s) indisponível(is) ignorada(s)`);
        if (conflitosTardios) partes.push(`${conflitosTardios} conflito(s) detectado(s) no salvamento`);
        if (preAgendadosSemCobertura) partes.push(`${preAgendadosSemCobertura} pré-agendado(s) sem cobertura financeira`);
        const qtdExtra = datasSolicitadas.filter(d => !intervaloDentroDaJornadaPadrao(profissionalId, d, horaInicio, horaFim)).length;
        if (qtdExtra) partes.push(`${qtdExtra} horário(s) extraordinário(s)`);
        if (avisosProfissionalEnviados) partes.push(`${avisosProfissionalEnviados} aviso(s) entregue(s) ao profissional`);
        if (avisosProfissionalPendentes) partes.push(`${avisosProfissionalPendentes} aviso(s) aguardando sincronização`);
        if (falhas) partes.push(`${falhas} falha(s)`);
        mostrarFeedbackAgenda(partes.join(' · ') + '.', falhas ? 'aviso' : 'sucesso');

        // Uma única revisão da lista de espera por série é suficiente.
        // Só acontece se pelo menos uma ocorrência já estiver confirmada na nuvem.
        if (sincronizados > 0) await resolverListaEsperaAposAgendamento(pacienteId);
    } catch (err) {
        console.error('Erro ao salvar agendamento/recorrência:', err);
        const mensagemErro = mensagemErroSalvarAgenda(err);
        mostrarFeedbackAgendaModal('Erro ao salvar: ' + mensagemErro, 'erro');
        alert('❌ Não foi possível concluir o agendamento. ' + mensagemErro);
    } finally {
        agendaSalvando = false;
        if (btn) { btn.disabled = false; btn.textContent = 'Confirmar Agendamento'; }
    }
}

/* --------------------------------------------------------------------
   MODAL: DETALHE / STATUS / CANCELAMENTO / LEMBRETE
   -------------------------------------------------------------------- */
async function abrirDetalheAgendamento(id) {
    atualizarControlesAgendaPorPerfil();
    const a = agendaAgendamentosSemanaCache.find(x => x.id === id) || agendaAgendamentosDoDiaCache.find(x => x.id === id);
    if (!a) return;
    if (!usuarioPodeVerAgendaClinicaToda()) return abrirDetalheAgendaPessoal(a);
    agendamentoDetalheAtualId = id;
    let respostaTexto = 'Ainda sem resposta do paciente';
    if (a.confirmado_pelo_paciente === true) respostaTexto = '✅ Paciente confirmou presença';
    else if (a.confirmado_pelo_paciente === false) respostaTexto = '⚠️ Paciente avisou que não vai poder ir';
    let planos = [];
    if (typeof obterPlanosAtivosPaciente === 'function') planos = await obterPlanosAtivosPaciente(a.paciente_id, a.procedimento_id);
    const planosVinculaveis = planos.filter(p=>p.__vinculavel || p.__vinculavel_nuvem || p.__vinculavel_local || String(p.id)===String(a.plano_id||''));
    const atualPresente = a.plano_id && planosVinculaveis.some(p=>String(p.id)===String(a.plano_id));
    const optionsPlano = `<option value="">Sem pacote vinculado</option>` +
        (a.plano_id && !atualPresente ? `<option value="${escapeHTML(a.plano_id)}" selected>Cobrança atual</option>` : '') +
        planosVinculaveis.map(p=>`<option value="${escapeHTML(p.id)}" ${String(p.id)===String(a.plano_id||'')?'selected':''}>${escapeHTML(p.nome)} · ${p.sessoes_restantes ?? p.sessoes_contratadas} restante(s)</option>`).join('');
    const statusCfg = configStatusAgenda(a.status);
    const permiteObs = statusAgendaPermiteObservacao(a.status);
    let pagamento = situacaoPagamentoAgenda(a);
    if (!pagamento.verificado && typeof obterSituacaoPagamentoAgendamento === 'function') {
        try {
            pagamento = await obterSituacaoPagamentoAgendamento(a);
            agendaPagamentoCoberturaCache.set(String(a.id), pagamento);
        } catch (_) {}
    }
    let linhaPagamento = '';
    if (pagamento.pago) linhaPagamento = '<p class="agenda-pagamento-detalhe pago"><strong>Pagamento:</strong> <span class="agenda-pagamento-icone">$</span> Sessão paga</p>';
    else if (pagamento.semCobranca) linhaPagamento = '<p class="agenda-pagamento-detalhe neutro"><strong>Pagamento:</strong> sessão sem cobrança</p>';
    else if (!a.plano_id && String(a.status || '') === 'pre_agendado') linhaPagamento = '<p class="agenda-pagamento-detalhe pendente"><strong>Pagamento:</strong> aguardando renovação/pacote</p>';
    else if (pagamento.verificado) linhaPagamento = '<p class="agenda-pagamento-detalhe pendente"><strong>Pagamento:</strong> pendente</p>';
    else linhaPagamento = '<p class="agenda-pagamento-detalhe neutro"><strong>Pagamento:</strong> não foi possível confirmar agora</p>';
    const corpo = document.getElementById('detalhe_agendamento_corpo');
    corpo.innerHTML = `
        <p><strong>Paciente:</strong> ${escapeHTML(a.pacientes?.nome || '—')}</p>
        <p><strong>Contato:</strong> ${escapeHTML((() => { const c = obterContatoAgendaPaciente(a.pacientes); return c.telefone ? c.telefone + (c.usaResponsavel ? ' · Responsável: ' + c.nomeDestinatario : '') : 'Não informado'; })())}</p>
        <p><strong>Profissional:</strong> ${escapeHTML(a.equipe?.nome || '—')}</p>
        <p><strong>Procedimento:</strong> ${escapeHTML(a.procedimentos?.nome || '—')}</p>
        <p><strong>Horário:</strong> ${horaCurta(a.hora_inicio)} – ${horaCurta(a.hora_fim)} ${agendamentoEhHorarioExtraordinario(a) ? '<span class="badge agenda-extra-badge">Horário extraordinário</span>' : ''}</p>
        <p><strong>Status atual:</strong> <span class="badge badge-${escapeHTML(classeStatusAgenda(a.status))}">${escapeHTML(rotuloStatusAgenda(a.status))}</span></p>
        <p><strong>Confirmação:</strong> ${respostaTexto}</p>
        ${linhaPagamento}
        ${a.resposta_em ? `<p><strong>Resposta registrada em:</strong> ${new Date(a.resposta_em).toLocaleString('pt-BR')}</p>` : ''}
        ${a.observacoes ? `<p><strong>Observações do agendamento:</strong> ${escapeHTML(a.observacoes)}</p>` : ''}
        ${a.status_observacao ? `<p><strong>Observação do status:</strong> ${escapeHTML(a.status_observacao)}</p>` : ''}
        ${a.status_atualizado_em ? `<p><strong>Status atualizado:</strong> ${new Date(a.status_atualizado_em).toLocaleString('pt-BR')}${a.status_atualizado_por ? ' · ' + escapeHTML(a.status_atualizado_por) : ''}</p>` : ''}
        ${a.lembrete_enviado_em ? `<p><span class="badge badge-lembrete-ok">Lembrete enviado</span></p>` : ''}

        <div class="agenda-status-editor">
            <label for="detalhe_status_select">Alterar status</label>
            <select id="detalhe_status_select" onchange="aoMudarStatusDetalhe()">${opcoesStatusAgenda(a.status)}</select>
            <div id="detalhe_status_observacao_grupo" class="agenda-status-observacao" ${permiteObs ? '' : 'hidden'}>
                <label for="detalhe_status_observacao">Observação do status <span>(opcional)</span></label>
                <textarea id="detalhe_status_observacao" placeholder="Ex.: paciente avisou pela manhã, apresentou atestado, motivo do cancelamento...">${escapeHTML(a.status_observacao || '')}</textarea>
            </div>
            <div id="detalhe_status_impacto" class="agenda-status-impacto ${statusCfg.consomeSessao ? 'consome' : ''}">${statusCfg.consomeSessao ? 'Este status consome 1 sessão do pacote vinculado.' : 'Este status não consome sessão do pacote.'}</div>
            <div class="agenda-status-actions">
                <button type="button" id="btn_editar_atendimento" class="btn-secondary" onclick="editarAgendamentoAtual()">Editar agendamento</button>
                <button type="button" class="btn-primary" onclick="salvarStatusAgendamentoAtual()">Salvar status</button>
                ${statusAgendaPermiteReagendamento(a.status) ? '<button type="button" class="btn-secondary" onclick="reagendarAgendamentoAtual()">Reagendar</button>' : ''}
                ${usuarioEhAdministradorAgenda() ? `<button type="button" class="btn-secondary agenda-audit-inline-btn" onclick="abrirHistoricoStatusAgenda('${escapeHTML(a.id)}')">Histórico de status</button>` : ''}
            </div>
        </div>

        <div class="agenda-plano-vinculo"><label>Plano ou atendimento unitário</label>${!a.plano_id && String(a.status||'')==='pre_agendado'?'<div class="agenda-status-impacto">Pré-agendamento sem cobertura financeira. O horário está reservado. Vincule um plano ou registre um atendimento unitário.</div>':''}<div><select id="detalhe_plano_select">${optionsPlano}</select><button type="button" onclick="vincularPlanoAgendamentoAtual()">Vincular</button></div>${!a.plano_id && a.status !== 'cancelado' && typeof financeiroPodeEditar === 'function' && financeiroPodeEditar() ? '<button type="button" class="btn-secondary" onclick="abrirCriarAtendimento(\'detalhe\')">Registrar atendimento unitário</button>' : ''}<small>${a.plano_id?'Este atendimento tem uma cobrança vinculada. ':'Sem cobrança vinculada. '}Atendido e falta não justificada consomem sessão; falta justificada e cancelamento não consomem.</small></div>
    `;
    abrirModal('modal_detalhe_agendamento');
}

async function editarAgendamentoAtual() {
    if (!agendamentoDetalheAtualId || !usuarioPodeVerAgendaClinicaToda()) return;
    const a = agendaAgendamentosSemanaCache.find(x => String(x.id) === String(agendamentoDetalheAtualId))
        || agendaAgendamentosDoDiaCache.find(x => String(x.id) === String(agendamentoDetalheAtualId));
    if (!a) {
        alert('Atendimento não encontrado. Atualize a agenda e tente novamente.');
        return;
    }
    fecharModal('modal_detalhe_agendamento');
    await abrirModalAgendamento(a.profissional_id || '', a.data, horaCurta(a.hora_inicio), { agendamento:a });
}

function aoMudarStatusDetalhe() {
    const status = document.getElementById('detalhe_status_select')?.value || '';
    const grupo = document.getElementById('detalhe_status_observacao_grupo');
    const impacto = document.getElementById('detalhe_status_impacto');
    if (grupo) grupo.hidden = !statusAgendaPermiteObservacao(status);
    if (impacto) {
        const consome = statusAgendaConsomeSessao(status);
        impacto.classList.toggle('consome', consome);
        impacto.textContent = consome ? 'Este status consome 1 sessão do pacote vinculado.' : 'Este status não consome sessão do pacote.';
    }
}

async function salvarStatusAgendamentoAtual() {
    const status = document.getElementById('detalhe_status_select')?.value || '';
    if (!AGENDA_STATUS_CONFIG[status]) return;
    const observacao = statusAgendaPermiteObservacao(status)
        ? (document.getElementById('detalhe_status_observacao')?.value || '').trim()
        : '';
    await marcarStatusAgendamento(status, observacao);
}

async function reagendarAgendamentoAtual() {
    if (!agendamentoDetalheAtualId) return;
    const a = agendaAgendamentosSemanaCache.find(x=>x.id===agendamentoDetalheAtualId) || agendaAgendamentosDoDiaCache.find(x=>x.id===agendamentoDetalheAtualId) || agendamentoReagendamentoBuffer;
    if (!a || !statusAgendaPermiteReagendamento(a.status)) return;
    const hoje = formatarDataISO(new Date());
    const dataInicial = a.data && a.data >= hoje ? a.data : hoje;
    fecharModal('modal_detalhe_agendamento');
    await abrirModalAgendamento(a.profissional_id || '', dataInicial, '');
    const procedimento = document.getElementById('ag_procedimento_select');
    prepararBuscaPacienteAgendamento(agendaPacientesModalCache, a.paciente_id || '');
    if (procedimento) procedimento.value = a.procedimento_id || '';
    await popularPlanosNoAgendamento(a.paciente_id || '', a.procedimento_id || '', a.plano_id || '');
    const plano = document.getElementById('ag_plano_select');
    if (plano && a.plano_id && Array.from(plano.options).some(o=>String(o.value)===String(a.plano_id))) plano.value = a.plano_id;
    atualizarResumoPacoteAgendamento();
    await atualizarHorariosDisponiveisModal();
    const obs = document.getElementById('ag_observacoes');
    if (obs) obs.value = `Reagendamento do atendimento de ${new Date(a.data+'T00:00:00').toLocaleDateString('pt-BR')}.`;
    agendamentoReagendamentoBuffer = null;
}

async function vincularPlanoAgendamentoAtual() {
    if (!usuarioEhAdministradorAgenda()) return;
    if (!agendamentoDetalheAtualId) return;
    const planoId = document.getElementById('detalhe_plano_select')?.value || null;
    const a = agendaAgendamentosSemanaCache.find(x=>x.id===agendamentoDetalheAtualId) || agendaAgendamentosDoDiaCache.find(x=>x.id===agendamentoDetalheAtualId);
    if (!a) return;
    try {
        if (!planoId) {
            if (typeof removerVinculoAgendaLocal === 'function') removerVinculoAgendaLocal(agendamentoDetalheAtualId);
            const {error}=await _supabase.from('agendamentos').update({plano_id:null}).eq('id',agendamentoDetalheAtualId);
            if(error && !/plano_id|schema cache|column .* does not exist/i.test(String(error.message||''))) throw error;
            a.plano_id=null;
        } else {
            const validacao = typeof validarPlanoParaAgendamento === 'function'
                ? await validarPlanoParaAgendamento(planoId, a.paciente_id, a.procedimento_id)
                : {ok:true,modo:'local'};
            if(!validacao.ok) throw new Error(validacao.mensagem || 'Pacote indisponível.');
            let gravadoNuvem=false;
            if(validacao.modo==='nuvem') {
                const {error}=await _supabase.from('agendamentos').update({plano_id:planoId}).eq('id',agendamentoDetalheAtualId);
                if(!error) gravadoNuvem=true;
                else if(!/plano_id|schema cache|column .* does not exist/i.test(String(error.message||''))) throw error;
            }
            if(gravadoNuvem) {
                if(typeof removerVinculoAgendaLocal==='function') removerVinculoAgendaLocal(agendamentoDetalheAtualId);
            } else if(typeof salvarVinculoAgendaLocal==='function') {
                salvarVinculoAgendaLocal(agendamentoDetalheAtualId, planoId, a.paciente_id, a.procedimento_id, a.status || 'agendado');
            }
            a.plano_id=planoId;
        }
        invalidarCacheAgendaSemana();
        fecharModal('modal_detalhe_agendamento');
        await renderizarPainelAgenda();
        if(typeof atualizarFinanceiroAposAgenda==='function')await atualizarFinanceiroAposAgenda();
    } catch(err) {
        alert('Não foi possível vincular o pacote.\n\n'+(err.message||err));
    }
}

async function marcarStatusAgendamento(novoStatus, observacaoStatus = '') {
    if (!usuarioPodeVerAgendaClinicaToda()) return;
    if (!agendamentoDetalheAtualId || !AGENDA_STATUS_CONFIG[novoStatus]) return;
    const a = agendaAgendamentosSemanaCache.find(x => x.id === agendamentoDetalheAtualId) || agendaAgendamentosDoDiaCache.find(x => x.id === agendamentoDetalheAtualId);
    if (!a) return;

    // Qualquer status oficial pode ser corrigido para qualquer outro status oficial,
    // inclusive em atendimentos de dias anteriores. A Agenda não usa uma máquina
    // de estados irreversível; a rastreabilidade fica por conta da auditoria.
    const statusAnterior = String(a.status || '');
    const agora = new Date().toISOString();
    const alteracoes = {
        status: novoStatus,
        status_observacao: statusAgendaPermiteObservacao(novoStatus) ? (observacaoStatus || null) : null,
        status_atualizado_em: agora,
        status_atualizado_por: usuarioLogado?.nome || 'Desconhecido',
        status_atualizado_por_id: usuarioLogado?.id ? String(usuarioLogado.id) : null,
        status_atualizado_por_tipo: perfilAgendaAtual() || null
    };
    if (novoStatus === 'em_recepcao') alteracoes.chegada_em = agora;
    if (novoStatus === 'atendido') alteracoes.atendido_em = agora;
    else if (['atendido','concluido'].includes(statusAnterior)) alteracoes.atendido_em = null;

    let planoAutoLocal = null;
    if (statusAgendaConsomeSessao(novoStatus) && !a.plano_id && typeof obterPlanosAtivosPaciente === 'function') {
        const planos = await obterPlanosAtivosPaciente(a.paciente_id, a.procedimento_id);
        if (planos.length === 1) {
            const unico = planos[0];
            if(unico.__vinculavel_nuvem) alteracoes.plano_id = unico.id;
            else planoAutoLocal = unico.id;
        } else if (planos.length > 1) {
            alert('Este paciente possui mais de um pacote compatível. Selecione o pacote no detalhe do agendamento antes de marcar este status, para não consumir a sessão do plano errado.');
            return;
        }
    }

    // Se o agendamento ainda está somente na fila local, atualizamos o próprio
    // payload que será sincronizado. Assim o status não se perde antes do INSERT.
    const pendenteLocal = lerAgendamentosPendentesSync().some(x => String(x.payload?.id || '') === String(agendamentoDetalheAtualId));
    let salvo = false;
    if (pendenteLocal) {
        const payloadLocal = { ...alteracoes };
        delete payloadLocal.status_observacao;
        delete payloadLocal.status_atualizado_em;
        delete payloadLocal.status_atualizado_por;
        delete payloadLocal.status_atualizado_por_id;
        delete payloadLocal.status_atualizado_por_tipo;
        delete payloadLocal.chegada_em;
        delete payloadLocal.atendido_em;
        if (observacaoStatus) {
            const atualPendente = lerAgendamentosPendentesSync().find(x=>String(x.payload?.id||'')===String(agendamentoDetalheAtualId));
            const prefixo = `[${new Date().toLocaleString('pt-BR')}] ${rotuloStatusAgenda(novoStatus)}: ${observacaoStatus}`;
            payloadLocal.observacoes = [atualPendente?.payload?.observacoes || a.observacoes || '', prefixo].filter(Boolean).join('\n');
        }
        if (planoAutoLocal) delete payloadLocal.plano_id;
        salvo = atualizarPayloadAgendamentoPendenteSync(agendamentoDetalheAtualId, payloadLocal);
        if (!salvo) { alert('❌ Não foi possível preservar a mudança de status neste computador.'); return; }
    } else {
        let resposta = await _supabase.from('agendamentos').update(alteracoes).eq('id', agendamentoDetalheAtualId);
        const erroColunasNovas = resposta.error && /status_observacao|status_atualizado|status_atualizado_por_id|status_atualizado_por_tipo|chegada_em|atendido_em|schema cache|column .* does not exist/i.test(String(resposta.error.message||''));
        if (erroColunasNovas) {
            const fallback = { status: novoStatus };
            if (alteracoes.plano_id) fallback.plano_id = alteracoes.plano_id;
            if (observacaoStatus) {
                const prefixo = `[${new Date().toLocaleString('pt-BR')}] ${rotuloStatusAgenda(novoStatus)}: ${observacaoStatus}`;
                fallback.observacoes = [a.observacoes || '', prefixo].filter(Boolean).join('\n');
            }
            resposta = await _supabase.from('agendamentos').update(fallback).eq('id', agendamentoDetalheAtualId);
        }
        if(resposta.error && alteracoes.plano_id && /plano_id|schema cache|column .* does not exist/i.test(String(resposta.error.message||''))) {
            planoAutoLocal = alteracoes.plano_id;
            const fallback = { status: novoStatus };
            if (observacaoStatus) {
                const prefixo = `[${new Date().toLocaleString('pt-BR')}] ${rotuloStatusAgenda(novoStatus)}: ${observacaoStatus}`;
                fallback.observacoes = [a.observacoes || '', prefixo].filter(Boolean).join('\n');
            }
            resposta = await _supabase.from('agendamentos').update(fallback).eq('id', agendamentoDetalheAtualId);
        }
        if (resposta.error) { alert('❌ Erro ao atualizar status: ' + (resposta.error.message || resposta.error)); return; }
        salvo = true;
    }

    if (!salvo) return;
    invalidarCacheAgendaSemana();
    if (planoAutoLocal && typeof salvarVinculoAgendaLocal==='function') salvarVinculoAgendaLocal(agendamentoDetalheAtualId, planoAutoLocal, a.paciente_id, a.procedimento_id, novoStatus);
    else if(typeof atualizarStatusVinculoAgendaLocal==='function') atualizarStatusVinculoAgendaLocal(agendamentoDetalheAtualId, novoStatus);

    const planoRelacionado = alteracoes.plano_id || planoAutoLocal || a.plano_id || null;
    a.status = novoStatus;
    a.status_observacao = statusAgendaPermiteObservacao(novoStatus) ? (observacaoStatus || null) : null;
    a.status_atualizado_em = agora;
    a.status_atualizado_por = usuarioLogado?.nome || 'Desconhecido';
    a.status_atualizado_por_id = usuarioLogado?.id ? String(usuarioLogado.id) : null;
    a.status_atualizado_por_tipo = perfilAgendaAtual() || null;
    if (alteracoes.plano_id) a.plano_id = alteracoes.plano_id;
    if (statusAgendaPermiteReagendamento(novoStatus)) agendamentoReagendamentoBuffer = { ...a };

    fecharModal('modal_detalhe_agendamento');
    if (planoRelacionado && typeof reconciliarPlanoFinanceiroPorConsumo === 'function') {
        await reconciliarPlanoFinanceiroPorConsumo(planoRelacionado, { statusAnterior, statusNovo: novoStatus });
    } else if (planoRelacionado && statusAgendaConsomeSessao(novoStatus) && typeof verificarEncerramentoAutomaticoPlano === 'function') {
        await verificarEncerramentoAutomaticoPlano(planoRelacionado);
    }

    const liberouCobertura = !!planoRelacionado && statusAgendaUsaCoberturaPacote(statusAnterior) && !statusAgendaUsaCoberturaPacote(novoStatus);
    let realocacao = null;
    if (liberouCobertura && typeof realocarCoberturaPlanoParaPreAgendamentos === 'function') {
        try {
            realocacao = await realocarCoberturaPlanoParaPreAgendamentos(planoRelacionado, {
                pacienteId: a.paciente_id,
                procedimentoId: a.procedimento_id,
                origemAgendamentoId: a.id
            });
        } catch (err) {
            console.warn('Agenda: não foi possível realocar automaticamente a cobertura liberada.', err);
        }
    }

    if (typeof atualizarFinanceiroAposAgenda === 'function') await atualizarFinanceiroAposAgenda();
    await renderizarPainelAgenda({ pularSync: pendenteLocal });

    if (['atendido','concluido'].includes(String(novoStatus)) && typeof obterSituacaoPagamentoAgendamento === 'function') {
        try {
            const atualizado = agendaAgendamentosSemanaCache.find(x => String(x.id) === String(a.id)) || a;
            const situacao = await obterSituacaoPagamentoAgendamento(atualizado);
            agendaPagamentoCoberturaCache.set(String(a.id), situacao);
            if (situacao.verificado && situacao.cobravel && !situacao.pago && !situacao.semCobranca) {
                if (typeof mostrarDialogoKineSys === 'function') {
                    await mostrarDialogoKineSys({
                        titulo: 'Pagamento pendente',
                        mensagem: `${atualizado.pacientes?.nome || 'Este paciente'} teve o atendimento marcado como concluído, mas esta sessão ainda não possui cobertura paga. Faça a cobrança ou registre o pagamento no Financeiro.`,
                        confirmar: 'Entendi',
                        apenasOk: true,
                        tipo: 'aviso'
                    });
                } else {
                    alert('⚠️ Atendimento concluído, mas esta sessão ainda não está paga. Registre o pagamento ou faça a cobrança da paciente.');
                }
            }
        } catch (err) {
            console.warn('Agenda: não foi possível verificar o pagamento após concluir o atendimento.', err);
        }
    }

    if (realocacao?.promovidos?.length) {
        mostrarFeedbackAgenda(`${realocacao.promovidos.length} pré-agendamento(s) futuro(s) recebeu(ram) automaticamente a cobertura liberada do pacote.`, 'info');
    }

    if (statusAgendaPermiteReagendamento(novoStatus)) {
        const querReagendar = await confirmarKineSys(`${rotuloStatusAgenda(novoStatus)} registrado. Deseja reagendar este paciente agora?`, {
            titulo: 'Status atualizado', confirmar: 'Reagendar agora', cancelar: 'Agora não', tipo: 'info'
        });
        if (querReagendar) {
            agendamentoDetalheAtualId = a.id;
            await reagendarAgendamentoAtual();
        }
    }
}

async function cancelarAgendamentoAtual() {
    if (!agendamentoDetalheAtualId) return;
    if (!(await confirmarKineSys('Cancelar este agendamento? O horário voltará a ficar disponível.', {titulo:'Cancelar agendamento', confirmar:'Cancelar agendamento', destrutivo:true}))) return;
    await marcarStatusAgendamento('cancelado');
}

async function enviarLembreteAgendamentoAtual() {
    if (!agendamentoDetalheAtualId) return;
    const a = agendaAgendamentosSemanaCache.find(x => x.id === agendamentoDetalheAtualId) || agendaAgendamentosDoDiaCache.find(x => x.id === agendamentoDetalheAtualId);
    if (!a) return;
    const contato = obterContatoAgendaPaciente(a.pacientes);
    const telefone = (contato.telefone || '').replace(/\D/g, '');
    if (!telefone) { alert(contato.usaResponsavel ? '⚠️ O telefone do responsável não está cadastrado.' : '⚠️ Este paciente não tem telefone cadastrado.'); return; }

    const dataFormatada = new Date(a.data + 'T00:00:00').toLocaleDateString('pt-BR');
    const podeConfirmarPorLink = !!CONFIRMACAO_BASE_URL && !!a.token_confirmacao;
    const linkConfirmacao = podeConfirmarPorLink
        ? `${CONFIRMACAO_BASE_URL}${CONFIRMACAO_BASE_URL.includes('?') ? '&' : '?'}token=${encodeURIComponent(a.token_confirmacao)}`
        : '';
    const chamadaConfirmacao = podeConfirmarPorLink
        ? `Por favor, confirme sua presença ou avise se não puder ir: ${linkConfirmacao}`
        : 'Por favor, responda esta mensagem confirmando sua presença ou avisando se não puder ir.';
    const saudacaoMensagem = montarSaudacaoAgenda(a.pacientes);
    const contextoMensagem = {
        saudacao: saudacaoMensagem,
        paciente: a.pacientes?.nome || 'Paciente',
        destinatario: contato.nomeDestinatario || a.pacientes?.nome || 'Paciente',
        profissional: a.profissionais?.nome || usuarioLogado?.nome || 'equipe',
        clinica: 'Fisiofix',
        procedimento: a.procedimentos?.nome || 'atendimento',
        data: dataFormatada,
        hora: horaCurta(a.hora_inicio),
        confirmacao: chamadaConfirmacao,
        link_confirmacao: linkConfirmacao
    };
    const mensagem = (typeof obterMensagemPadraoConfigurada === 'function')
        ? await obterMensagemPadraoConfigurada('agenda_lembrete_sessao', contextoMensagem, true)
        : `${saudacaoMensagem}! Passando para lembrar da sessão de ${a.procedimentos?.nome || 'atendimento'} no dia ${dataFormatada} às ${horaCurta(a.hora_inicio)}. ${chamadaConfirmacao}`;
    const numeroCompleto = telefone.length <= 11 ? '55' + telefone : telefone;
    const url = `https://wa.me/${numeroCompleto}?text=${encodeURIComponent(mensagem)}`;

    const link = document.createElement('a');
    link.href = url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    const { error } = await _supabase.from('agendamentos').update({ lembrete_enviado_em: new Date().toISOString() }).eq('id', agendamentoDetalheAtualId);
    if (!error) {
        invalidarCacheAgendaSemana();
        fecharModal('modal_detalhe_agendamento');
        await renderizarPainelAgenda();
    }
}

/* --------------------------------------------------------------------
   LISTA DE ESPERA + OFERTA DE VAGA (reencaixe)
   Item 7: preferencia flexivel por intervalo + dias da semana.
   Para manter compatibilidade com o schema atual, os metadados estruturados
   ficam encapsulados no inicio de observacoes e sao removidos antes da exibicao.
   Entradas antigas que usam apenas data_preferida continuam funcionando.
   -------------------------------------------------------------------- */
const KS_LISTA_ESPERA_PREF_PREFIX = '[[KS_PREF:';

function _normalizarDiasSemanaListaEspera(dias) {
    if (!Array.isArray(dias)) return [];
    return [...new Set(dias.map(Number).filter(d => Number.isInteger(d) && d >= 0 && d <= 6))].sort((a,b) => a-b);
}

function _extrairPreferenciaListaEspera(item) {
    const legado = item?.data_preferida || null;
    let inicio = item?.data_preferencia_inicio || legado;
    let fim = item?.data_preferencia_fim || legado;
    let dias = _normalizarDiasSemanaListaEspera(item?.dias_semana_preferidos);
    let observacoes = String(item?.observacoes || '');

    if (observacoes.startsWith(KS_LISTA_ESPERA_PREF_PREFIX)) {
        const fimMarcador = observacoes.indexOf(']]');
        if (fimMarcador > KS_LISTA_ESPERA_PREF_PREFIX.length) {
            try {
                const bruto = observacoes.slice(KS_LISTA_ESPERA_PREF_PREFIX.length, fimMarcador);
                const meta = JSON.parse(bruto);
                inicio = meta.inicio || inicio || null;
                fim = meta.fim || fim || inicio || null;
                dias = _normalizarDiasSemanaListaEspera(meta.dias);
                observacoes = observacoes.slice(fimMarcador + 2).replace(/^\s*\n?/, '');
            } catch (_) { /* registro antigo/corrompido: usa fallback */ }
        }
    }

    if (inicio && !fim) fim = inicio;
    if (fim && !inicio) inicio = fim;
    return { inicio: inicio || null, fim: fim || null, dias, observacoes };
}

function _serializarPreferenciaListaEspera(inicio, fim, dias, observacoes) {
    const meta = { inicio: inicio || null, fim: fim || null, dias: _normalizarDiasSemanaListaEspera(dias) };
    const nota = String(observacoes || '').trim();
    return `${KS_LISTA_ESPERA_PREF_PREFIX}${JSON.stringify(meta)}]]${nota ? '\n' + nota : ''}`;
}

function _dataISOParaDiaSemana(dataISO) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(dataISO || ''))) return null;
    const [ano, mes, dia] = dataISO.split('-').map(Number);
    return new Date(ano, mes - 1, dia, 12, 0, 0).getDay();
}

function listaEsperaAceitaData(item, dataISO) {
    const pref = _extrairPreferenciaListaEspera(item);
    if (pref.inicio && dataISO < pref.inicio) return false;
    if (pref.fim && dataISO > pref.fim) return false;
    if (pref.dias.length) {
        const diaSemana = _dataISOParaDiaSemana(dataISO);
        if (diaSemana === null || !pref.dias.includes(diaSemana)) return false;
    }
    return true;
}

function listaEsperaAceitaPeriodo(item, horaInicio) {
    const periodo = item?.periodo_preferido || 'qualquer';
    if (periodo === 'qualquer' || !horaInicio) return true;
    const hora = Number(String(horaInicio).slice(0, 2));
    if (!Number.isFinite(hora)) return true;
    return periodo === 'manha' ? hora < 12 : hora >= 12;
}

function listaEsperaCombinaComVaga(item, profissionalId, dataISO, horaInicio = null) {
    if (!item) return false;
    const profissionalOk = item.profissional_id === null || !item.profissional_id || item.profissional_id === profissionalId;
    return profissionalOk && listaEsperaAceitaData(item, dataISO) && listaEsperaAceitaPeriodo(item, horaInicio);
}

function _formatarDataCurtaListaEspera(dataISO) {
    return dataISO ? new Date(dataISO + 'T12:00:00').toLocaleDateString('pt-BR') : '';
}

function _descreverPreferenciaListaEspera(item) {
    const pref = _extrairPreferenciaListaEspera(item);
    let janela = 'Qualquer data';
    if (pref.inicio && pref.fim) {
        janela = pref.inicio === pref.fim
            ? _formatarDataCurtaListaEspera(pref.inicio)
            : `${_formatarDataCurtaListaEspera(pref.inicio)} a ${_formatarDataCurtaListaEspera(pref.fim)}`;
    }
    const nomes = {0:'Dom',1:'Seg',2:'Ter',3:'Qua',4:'Qui',5:'Sex',6:'Sáb'};
    if (pref.dias.length) janela += ` · ${pref.dias.map(d => nomes[d]).join('/')}`;
    return janela;
}

async function carregarListaEspera() {
    if (!_supabase) return;
    const { data, error } = await _supabase.from('lista_espera')
        .select('*, pacientes(*), equipe(nome), procedimentos(nome,duracao_minutos)')
        .eq('status', 'ativo')
        .order('criado_em');
    if (error) { console.warn('Erro ao carregar lista de espera:', error); return; }
    agendaListaEsperaCache = data || [];
    renderizarListaEspera();
}

function renderizarListaEspera() {
    const container = document.getElementById('lista_lista_espera');
    if (!container) return;
    if (!agendaListaEsperaCache.length) {
        container.innerHTML = '<div class="agenda-vazio">Ninguém na lista de espera no momento.</div>';
        return;
    }
    container.innerHTML = agendaListaEsperaCache.map(w => {
        const prof = w.profissional_id ? (w.equipe?.nome || '—') : 'Qualquer profissional';
        const dataPref = _descreverPreferenciaListaEspera(w);
        const pref = _extrairPreferenciaListaEspera(w);
        const periodo = { manha: 'Manhã', tarde: 'Tarde', qualquer: 'Qualquer horário' }[w.periodo_preferido] || 'Qualquer horário';
        return `
            <div class="item-config">
                <div class="item-config-info">
                    <strong>${escapeHTML(w.pacientes?.nome || '—')}</strong>
                    <span>${escapeHTML(w.procedimentos?.nome || 'Qualquer procedimento')} · ${escapeHTML(prof)} · ${escapeHTML(dataPref)} · ${escapeHTML(periodo)}${pref.observacoes ? ' · ' + escapeHTML(pref.observacoes) : ''}</span>
                </div>
                <div class="item-config-acoes">
                    <button onclick="removerListaEspera('${w.id}')">Remover</button>
                </div>
            </div>
        `;
    }).join('');
}

function abrirModalListaEspera() {
    preencherModalListaEspera();
    abrirModal('modal_lista_espera');
}

function atualizarJanelaListaEspera(origem) {
    const inicioEl = document.getElementById('esp_data_inicio');
    const fimEl = document.getElementById('esp_data_fim');
    if (!inicioEl || !fimEl) return;

    if (origem === 'inicio' && inicioEl.value) {
        fimEl.min = inicioEl.value;
        if (!fimEl.value || fimEl.value < inicioEl.value) fimEl.value = inicioEl.value;
    }
    if (origem === 'fim' && fimEl.value) {
        if (!inicioEl.value || inicioEl.value > fimEl.value) inicioEl.value = fimEl.value;
        fimEl.min = inicioEl.value || '';
    }
    if (!inicioEl.value) fimEl.min = '';
}

async function preencherModalListaEspera() {
    const pacientes = await obterPacientesBasicosAgenda();
    const selPaciente = document.getElementById('esp_paciente_select');
    selPaciente.innerHTML = '<option value="">-- Selecione --</option>' +
        pacientes.map(p => `<option value="${p.id}">${escapeHTML(p.nome)}</option>`).join('');
    document.getElementById('esp_data_inicio').value = '';
    document.getElementById('esp_data_fim').value = '';
    document.getElementById('esp_data_fim').min = '';
    document.querySelectorAll('.esp_dia_semana').forEach(el => { el.checked = false; });
    document.getElementById('esp_periodo').value = 'qualquer';
    document.getElementById('esp_observacoes').value = '';
}

async function salvarListaEspera() {
    const pacienteId = document.getElementById('esp_paciente_select').value;
    const profissionalId = document.getElementById('esp_profissional_select').value || null;
    const procedimentoId = document.getElementById('esp_procedimento_select').value || null;
    let dataInicio = document.getElementById('esp_data_inicio').value || null;
    let dataFim = document.getElementById('esp_data_fim').value || null;
    const diasSemana = [...document.querySelectorAll('.esp_dia_semana:checked')].map(el => Number(el.value));
    const periodo = document.getElementById('esp_periodo').value;
    const observacoesUsuario = document.getElementById('esp_observacoes').value.trim();

    if (!pacienteId) { alert('⚠️ Selecione o paciente.'); return; }
    if (dataInicio && !dataFim) dataFim = dataInicio;
    if (dataFim && !dataInicio) dataInicio = dataFim;
    if (dataInicio && dataFim && dataFim < dataInicio) {
        alert('⚠️ A data final da preferência não pode ser anterior à data inicial.');
        return;
    }

    // data_preferida continua preenchida apenas no caso de uma data exata,
    // preservando compatibilidade com versões anteriores do KineSys.
    const dataPreferidaLegada = dataInicio && dataFim && dataInicio === dataFim ? dataInicio : null;
    const observacoes = _serializarPreferenciaListaEspera(dataInicio, dataFim, diasSemana, observacoesUsuario);

    try {
        const { error } = await _supabase.from('lista_espera').insert([{
            paciente_id: pacienteId, profissional_id: profissionalId, procedimento_id: procedimentoId,
            data_preferida: dataPreferidaLegada, periodo_preferido: periodo, observacoes,
            criado_por: usuarioLogado?.nome || 'Desconhecido'
        }]);
        if (error) throw error;
        fecharModal('modal_lista_espera');
        await carregarListaEspera();
        await renderizarPainelAgenda();
    } catch (err) {
        alert('❌ Erro ao adicionar à lista de espera: ' + (err.message || err));
    }
}

async function removerListaEspera(id) {
    if (!(await confirmarKineSys('Remover este paciente da lista de espera?', {titulo:'Remover da lista de espera', confirmar:'Remover', destrutivo:true}))) return;
    const { error } = await _supabase.from('lista_espera').update({ status: 'cancelado' }).eq('id', id);
    if (error) { alert('❌ Erro ao remover.'); return; }
    await carregarListaEspera();
    await renderizarPainelAgenda();
}

/** Quantos candidatos da lista de espera combinam com este profissional+data. */
function contarCandidatosListaEspera(profissionalId, dataISO, horaInicio = null) {
    if (!profissionalId) return 0;
    return agendaListaEsperaCache.filter(w => listaEsperaCombinaComVaga(w, profissionalId, dataISO, horaInicio)).length;
}

/** Abre o WhatsApp já com o convite pro primeiro candidato compatível com a vaga. */
async function abrirOfertaListaEspera(profissionalId, dataISO, horaInicio, horaFim) {
    const candidato = agendaListaEsperaCache.find(w => listaEsperaCombinaComVaga(w, profissionalId, dataISO, horaInicio));
    if (!candidato) { alert('Nenhum candidato disponível na lista de espera para este horário.'); return; }

    const contato = obterContatoAgendaPaciente(candidato.pacientes);
    const telefone = (contato.telefone || '').replace(/\D/g, '');
    const dataFormatada = new Date(dataISO + 'T00:00:00').toLocaleDateString('pt-BR');
    const nomeProcedimento = candidato.procedimentos?.nome || 'atendimento';
    const saudacaoOferta = montarSaudacaoAgenda(candidato.pacientes);
    const contextoOferta = {
        saudacao: saudacaoOferta,
        paciente: candidato.pacientes?.nome || 'Paciente',
        destinatario: contato.nomeDestinatario || candidato.pacientes?.nome || 'Paciente',
        profissional: usuarioLogado?.nome || 'equipe',
        clinica: 'Fisiofix',
        procedimento: nomeProcedimento,
        data: dataFormatada,
        hora: horaInicio
    };
    const mensagem = (typeof obterMensagemPadraoConfigurada === 'function')
        ? await obterMensagemPadraoConfigurada('agenda_oferta_lista_espera', contextoOferta, true)
        : `${saudacaoOferta}! Abriu uma vaga para ${nomeProcedimento} no dia ${dataFormatada} às ${horaInicio}. Há interesse nesse horário? Responda para confirmarmos.`;

    if (telefone) {
        const numeroCompleto = telefone.length <= 11 ? '55' + telefone : telefone;
        const url = `https://wa.me/${numeroCompleto}?text=${encodeURIComponent(mensagem)}`;
        const link = document.createElement('a');
        link.href = url; link.target = '_blank'; link.rel = 'noopener noreferrer';
        document.body.appendChild(link); link.click(); document.body.removeChild(link);
    } else {
        alert(contato.usaResponsavel ? '⚠️ O responsável deste paciente não tem telefone cadastrado — contate por outro meio.' : '⚠️ Este paciente da fila não tem telefone cadastrado — contate por outro meio.');
    }

    if (await confirmarKineSys(`Confirmar agora o agendamento de ${candidato.pacientes?.nome} para ${horaInicio}–${horaFim}? Faça isso somente depois que o paciente aceitar o horário.`, {titulo:'Confirmar reencaixe', confirmar:'Confirmar agendamento'})) {
        try {
            const { error: erroInsert } = await _supabase.from('agendamentos').insert([{
                paciente_id: candidato.paciente_id,
                profissional_id: profissionalId,
                procedimento_id: candidato.procedimento_id || document.getElementById('ag_procedimento_select')?.value || null,
                data: dataISO, hora_inicio: horaInicio, hora_fim: horaFim,
                status: 'agendado', observacoes: 'Reencaixe via lista de espera',
                criado_por: usuarioLogado?.nome || 'Desconhecido'
            }]);
            if (erroInsert) {
                if (erroEhConflitoAgenda(erroInsert)) { alert('⚠️ Esse horário se sobrepõe a outro agendamento ativo. O reencaixe não pôde ser concluído automaticamente.'); return; }
                throw erroInsert;
            }
            await _supabase.from('lista_espera').update({ status: 'atendido' }).eq('id', candidato.id);
            await carregarListaEspera();
            await renderizarPainelAgenda();
        } catch (err) {
            alert('❌ Erro ao confirmar reencaixe: ' + (err.message || err));
        }
    }
}



let agendaContextoSeguro = null;
let agendaUltimoProfissional = '';
let agendaRevisaoVisual = 0;
let agendaRelogioTimer = null;
let agendaRelogioResize = null;
let agendaCancelandoProprio = false;

function agendaContextoDoUsuarioAtual() {
    return agendaContextoSeguro && String(agendaContextoSeguro.perfil_id) === String(usuarioLogado?.id || '')
        && String(agendaContextoSeguro.clinica_id) === String(usuarioLogado?.clinica_id || '') ? agendaContextoSeguro : null;
}

function agendaPodeMarcarProfissional(profissionalId) {
    if (!usuarioLogado || !profissionalId) return false;
    if (usuarioPodeVerAgendaClinicaToda()) return true;
    return ['FISIOTERAPEUTA','PROFISSIONAL'].includes(perfilAgendaAtual())
        && String(profissionalId) === String(profissionalAgendaRestritoAtualId())
        && String(profissionalId) === String(usuarioLogado.id);
}

function atualizarControlesAgendaPorPerfil() {
    const ampla = usuarioPodeVerAgendaClinicaToda();
    const admin = usuarioEhAdministradorAgenda();
    const filtro = document.getElementById('agenda_filtro_profissional');
    const clinica = document.getElementById('agenda_visao_clinica');
    const individual = document.getElementById('agenda_visao_profissional');
    if (clinica) { clinica.hidden = !ampla; clinica.setAttribute('aria-pressed', String(ampla && !filtro?.value)); }
    if (individual) {
        individual.textContent = ampla ? 'Agenda por profissional' : 'Minha agenda';
        individual.setAttribute('aria-pressed', String(!ampla || !!filtro?.value));
    }
    if (filtro?.value && ampla) agendaUltimoProfissional = filtro.value;
    document.querySelectorAll('#ks_agenda_controls .ks-agenda-config-wrap').forEach(el => { el.hidden = !admin; });
    document.querySelectorAll('[data-agenda-view="agenda_lista_espera"]').forEach(el => { el.hidden = !ampla; });
    document.querySelectorAll('#modal_agendamento .agenda-finance-link').forEach(el => { el.hidden = !admin; });
    document.querySelectorAll('#modal_agendamento button[onclick*="abrirModalListaEspera"], #modal_detalhe_agendamento button[onclick="enviarLembreteAgendamentoAtual()"]').forEach(el => { el.hidden = !ampla; });
    if (!ampla) {
        const plano = document.getElementById('ag_plano_select'); if (plano) plano.value = '';
        const status = document.getElementById('ag_status_inicial'); if (status) status.value = 'agendado';
        document.querySelectorAll('#tela_agenda .subtela.ativa').forEach(el => { if (el.id !== 'agenda_painel') el.classList.remove('ativa'); });
        document.getElementById('agenda_painel')?.classList.add('ativa');
    }
}

async function selecionarVisaoAgenda(modo) {
    const filtro = document.getElementById('agenda_filtro_profissional');
    if (!filtro) return;
    if (!usuarioPodeVerAgendaClinicaToda()) filtro.value = profissionalAgendaRestritoAtualId();
    else if (modo === 'clinica') filtro.value = '';
    else {
        filtro.value = agendaEquipeCache.some(p => String(p.id) === String(agendaUltimoProfissional))
            ? agendaUltimoProfissional : String(agendaEquipeCache[0]?.id || '');
        if (!filtro.value) { mostrarFeedbackAgenda('Cadastre um profissional de atendimento ativo na Equipe.', 'aviso'); return; }
    }
    atualizarIndicadorEscopoAgenda();
    await renderizarPainelAgenda();
}

function abrirDetalheAgendaPessoal(a) {
    if (!agendaPodeMarcarProfissional(a?.profissional_id)) return;
    agendamentoDetalheAtualId = a.id;
    const podeCancelar = ['agendado','pre_agendado','confirmado','em_recepcao'].includes(a.status);
    document.getElementById('detalhe_agendamento_corpo').innerHTML = `
        <p><strong>Paciente:</strong> ${escapeHTML(a.pacientes?.nome || 'Paciente')}</p>
        <p><strong>Profissional:</strong> ${escapeHTML(encontrarProfissionalAgendaDoUsuario()?.nome || usuarioLogado?.nome || '')}</p>
        <p><strong>Procedimento:</strong> ${escapeHTML(a.procedimentos?.nome || agendaProcedimentosCache.find(p => String(p.id) === String(a.procedimento_id))?.nome || 'Atendimento')}</p>
        <p><strong>Horário:</strong> ${escapeHTML(formatarDataAgendaBR(a.data))} · ${horaCurta(a.hora_inicio)} – ${horaCurta(a.hora_fim)}</p>
        <p><strong>Status:</strong> ${escapeHTML(rotuloStatusAgenda(a.status))}</p>
        ${a.observacoes ? `<p><strong>Observações:</strong> ${escapeHTML(a.observacoes)}</p>` : ''}
        <p class="field-help">Você pode marcar e cancelar horários na sua própria agenda. Cobranças, pagamentos e alterações administrativas são feitos pela administração.</p>
        ${podeCancelar ? '<button type="button" class="btn-secondary" id="agenda_cancelar_proprio" onclick="cancelarAgendamentoProprio()">Cancelar agendamento</button>' : '<p>Para corrigir um atendimento já realizado ou uma falta, solicite à administração.</p>'}`;
    atualizarControlesAgendaPorPerfil();
    abrirModal('modal_detalhe_agendamento');
}

async function cancelarAgendamentoProprio() {
    if (agendaCancelandoProprio) return;
    const a = agendaAgendamentosSemanaCache.find(x => String(x.id) === String(agendamentoDetalheAtualId));
    if (!a || !agendaPodeMarcarProfissional(a.profissional_id) || usuarioPodeVerAgendaClinicaToda()) return;
    const usuarioInicial = String(usuarioLogado.id);
    const aceito = await confirmarKineSys('Cancelar este horário na sua agenda? O registro será preservado no histórico.', {titulo:'Cancelar agendamento',confirmar:'Cancelar horário',cancelar:'Manter horário'});
    if (!aceito || String(usuarioLogado?.id || '') !== usuarioInicial) return;
    agendaCancelandoProprio = true;
    try {
        if (!_supabase) throw Error('Conecte-se para confirmar o cancelamento.');
        const {data,error} = await _supabase.from('agendamentos').update({status:'cancelado',status_observacao:'Cancelado pelo profissional responsável.'})
            .eq('id',a.id).eq('profissional_id',usuarioInicial).eq('status',a.status).select('id');
        if (error) throw error;
        if (data?.length !== 1) throw Error('O horário mudou ou o cancelamento não foi autorizado. Atualize a agenda.');
        fecharModal('modal_detalhe_agendamento');
        await renderizarPainelAgenda();
        mostrarFeedbackAgenda('Agendamento cancelado. O horário está livre e o histórico foi preservado.', 'info');
    } catch (err) { alert('Não foi possível cancelar: ' + (err.message || err)); }
    finally { agendaCancelandoProprio = false; }
}

function instanteAgendaSaoPaulo(agora = new Date()) {
    const partes = Object.fromEntries(new Intl.DateTimeFormat('en-CA', {timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).formatToParts(agora).map(p => [p.type,p.value]));
    return {data:`${partes.year}-${partes.month}-${partes.day}`,hora:`${partes.hour}:${partes.minute}`,minutos:Number(partes.hour)*60+Number(partes.minute)+Number(partes.second)/60};
}

function posicaoMarcadorAgenda(agora, dias, inicio, fim, passo=AGENDA_GRADE_PASSO_MIN) {
    const dia = dias.indexOf(agora.data);
    if (dia < 0 || agora.minutos < inicio || agora.minutos >= fim) return null;
    const slot = (agora.minutos-inicio)/passo;
    return {coluna:dia+2,linha:Math.floor(slot)+2,fracao:slot-Math.floor(slot),minutoCelula:inicio+Math.floor(slot)*passo};
}

function atualizarMarcadorAgoraAgenda() {
    const agora = instanteAgendaSaoPaulo();
    const relogio = document.getElementById('agenda_agora_relogio');
    if (relogio) relogio.textContent = `Agora ${agora.hora} · Brasília`;
    const grade = document.getElementById('agenda_semana_grade');
    if (!grade || !grade.dataset.dias) return;
    let linha = grade.querySelector('.agenda-agora-linha');
    const pos = posicaoMarcadorAgenda(agora, grade.dataset.dias.split(','), Number(grade.dataset.inicio), Number(grade.dataset.fim));
    if (!pos) { if (linha) linha.hidden = true; return; }
    if (!linha) {
        linha = document.createElement('div'); linha.className = 'agenda-agora-linha';
        linha.innerHTML = '<span></span>'; grade.appendChild(linha);
    }
    const celula = grade.querySelector(`[data-dia="${agora.data}"][data-minuto="${pos.minutoCelula}"]`);
    if (!celula) { linha.hidden = true; return; }
    linha.hidden = false;
    linha.style.gridColumn = String(pos.coluna); linha.style.gridRow = String(pos.linha);
    linha.style.transform = `translateY(${pos.fracao * celula.getBoundingClientRect().height}px)`;
    linha.querySelector('span').textContent = `Agora ${agora.hora}`;
    linha.setAttribute('aria-label',`Horário atual: ${agora.hora}, horário de Brasília`);
}

function iniciarRelogioAgenda() {
    atualizarMarcadorAgoraAgenda();
    if (!agendaRelogioTimer) {
        agendaRelogioTimer = setInterval(() => { if (document.visibilityState === 'visible') atualizarMarcadorAgoraAgenda(); }, 30000);
        document.addEventListener('visibilitychange', atualizarMarcadorAgoraAgenda);
        window.addEventListener('resize', atualizarMarcadorAgoraAgenda);
    }
    const grade = document.getElementById('agenda_semana_grade');
    if (!agendaRelogioResize && grade && typeof ResizeObserver !== 'undefined') {
        agendaRelogioResize = new ResizeObserver(atualizarMarcadorAgoraAgenda); agendaRelogioResize.observe(grade);
    }
}

async function irParaHorarioAtualAgenda() {
    const hoje = instanteAgendaSaoPaulo().data;
    const input = document.getElementById('agenda_data_input');
    if (input) input.value = hoje;
    await irParaDataAgenda(hoje);
    const linha = document.querySelector('.agenda-agora-linha:not([hidden])');
    if (linha) linha.scrollIntoView({block:'center',inline:'nearest',behavior:'smooth'});
    else mostrarFeedbackAgenda('O horário atual está fora da faixa de horários exibida na grade de hoje.', 'info');
}
