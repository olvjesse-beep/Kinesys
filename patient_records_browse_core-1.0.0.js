/* KineSys — Patient Records Browse Core 1.0.0
 * Fallback de navegação/listagem de prontuários e recentes da Home extraído de
 * script-1.18.0.js. O Design System/Home Detalhes podem substituir estes
 * renderizadores depois, como já ocorre no runtime de produção.
 */
'use strict';

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
