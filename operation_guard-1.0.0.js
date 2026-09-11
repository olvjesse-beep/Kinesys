/* KineSys — Operation Guard 1.0.0
 * Extraído de script-1.18.0.js sem alterar contratos públicos, timing ou comportamento.
 */
'use strict';

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
