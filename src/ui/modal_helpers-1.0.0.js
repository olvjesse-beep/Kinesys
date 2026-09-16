// Diálogos compartilhados são disponíveis antes de qualquer tela lazy.
function fecharModal(id) {
    const el = document.getElementById(id);
    if (el) el.classList.remove('ativa');
}
function abrirModal(id) {
    const el = document.getElementById(id);
    if (el) el.classList.add('ativa');
}
