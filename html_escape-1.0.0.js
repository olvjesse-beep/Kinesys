/* KineSys — HTML Escape 1.0.0
 * Extraído de script-1.18.0.js sem alterar nome, contrato ou comportamento.
 */
'use strict';

function escapeHTML(valor) {
    if (valor === null || valor === undefined) return "";
    return String(valor)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\"/g, "&quot;")
        .replace(/'/g, "&#039;");
}
