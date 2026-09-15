/* KineSys — Patient Records Browse Core 1.0.0
 * Fallback de navegação/listagem de prontuários e recentes da Home extraído de
 * src/core/script-1.18.0.js. O Design System/Home Detalhes podem substituir estes
 * renderizadores depois, como já ocorre no runtime de produção.
 */
'use strict';

const KINESYS_BUSCA_PACIENTE_DEBOUNCE_MS = 320;
let filtroPacientesSalvosTimer = null;
let filtroPacientesSalvosFila = [];

async function renderizarTabelaProntuarios(filtro = "") {
    if (typeof window.renderProntuarioCardsKineSys === 'function') {
        return window.renderProntuarioCardsKineSys(filtro);
    }
    console.warn('KineSys: renderizador moderno de prontuários ainda não foi inicializado.');
}

function filtrarPacientesSalvos() {
    return renderizarTabelaProntuarios(document.getElementById('input_busca_paciente')?.value || '');
}

function instalarDebounceBuscaPacientesKineSys() {
    const original = window.filtrarPacientesSalvos;
    if (typeof original !== 'function' || original.__kinesysDebounceBuscaPaciente) return false;

    let ultimoContexto = window;
    let ultimosArgumentos = [];
    const debounced = function(...args) {
        ultimoContexto = this;
        ultimosArgumentos = args;
        if (filtroPacientesSalvosTimer) clearTimeout(filtroPacientesSalvosTimer);

        const promessa = new Promise((resolve, reject) => {
            filtroPacientesSalvosFila.push({ resolve, reject });
        });

        filtroPacientesSalvosTimer = setTimeout(async () => {
            filtroPacientesSalvosTimer = null;
            const fila = filtroPacientesSalvosFila.splice(0);
            try {
                const resultado = await original.apply(ultimoContexto, ultimosArgumentos);
                fila.forEach(item => item.resolve(resultado));
            } catch (erro) {
                fila.forEach(item => item.reject(erro));
            }
        }, KINESYS_BUSCA_PACIENTE_DEBOUNCE_MS);

        return promessa;
    };
    debounced.__kinesysDebounceBuscaPaciente = true;
    debounced.__kinesysOriginal = original;
    window.filtrarPacientesSalvos = debounced;
    return true;
}

async function renderizarPacientesRecentesHome() {
    const container = document.getElementById('lista_pacientes_recentes');
    if (!container) return;

    const lista = await obterPacientesBasicos();
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

window.renderizarTabelaProntuarios = renderizarTabelaProntuarios;
window.filtrarPacientesSalvos = filtrarPacientesSalvos;
window.renderizarPacientesRecentesHome = renderizarPacientesRecentesHome;
window.instalarDebounceBuscaPacientesKineSys = instalarDebounceBuscaPacientesKineSys;

// O Design System redefine o renderizador de busca depois deste módulo. O listener
// roda após todos os scripts defer, então envolve a implementação final sem mudar
// seu contrato; apenas agrupa digitações consecutivas em uma única renderização.
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', instalarDebounceBuscaPacientesKineSys, { once:true });
} else {
    setTimeout(instalarDebounceBuscaPacientesKineSys, 0);
}
