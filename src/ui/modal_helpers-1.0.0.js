// Diálogos compartilhados são disponíveis antes de qualquer tela lazy.
function fecharModal(id) {
    const el = document.getElementById(id);
    if (el) {
        el.classList.remove('ativa');
        el.setAttribute('aria-hidden','true');
        if (!document.querySelector('.modal-overlay.ativa')) document.body.classList.remove('ks-modal-open');
    }
}
function abrirModal(id) {
    const el = document.getElementById(id);
    if (el) {
        el.classList.add('ativa');
        el.setAttribute('aria-hidden','false');
        document.body.classList.add('ks-modal-open');
    }
}
