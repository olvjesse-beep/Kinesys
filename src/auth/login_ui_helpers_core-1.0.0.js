'use strict';
/* ==========================================================================
   KineSys — Login UI Helpers Core 1.0.0
   Phase 4R: feedback, estado visual e mensagens de erro do login extraídos
   sem alteração de comportamento.
   Não acessa Supabase, rede, persistência ou regras de autorização.
   ========================================================================== */

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
