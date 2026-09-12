/* KineSys — Patient Pre-Registration Core 1.0.0
 * Seletor de paciente/pré-cadastro da Avaliação extraído de src/core/script-1.18.0.js.
 * Preserva filtro temporal, busca acessível, contexto ativo e carga do prontuário.
 */
'use strict';

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
        const p = await obterPacienteCompletoPorId(pacienteIdAlvo);
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

window.alternarFiltroPreCadastro = alternarFiltroPreCadastro;
window.fecharBuscaPacientesPreCadastro = fecharBuscaPacientesPreCadastro;
window.sincronizarBuscaPacientePreCadastro = sincronizarBuscaPacientePreCadastro;
window.selecionarPacienteBuscaPreCadastro = selecionarPacienteBuscaPreCadastro;
window.filtrarPacientesPreCadastro = filtrarPacientesPreCadastro;
window.navegarBuscaPacientesPreCadastro = navegarBuscaPacientesPreCadastro;
window.atualizarSelectPacientesPreCadastro = atualizarSelectPacientesPreCadastro;
window.carregarPacientePreCadastradoNaAvaliacao = carregarPacientePreCadastradoNaAvaliacao;
