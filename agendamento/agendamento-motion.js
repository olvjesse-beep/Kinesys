/* KineSys — animações do agendamento online (1.0.0).
 * Somente efeito visual (Web Animations: opacidade, transform e cor de fundo).
 * Não altera textos, valores, botões nem a reserva. Qualquer erro é ignorado:
 * o agendamento segue funcionando sem animação. Funciona igual no celular.
 * Escolhas: 1C abertura com título em foco · 2A etapa desliza · 3C cartão escolhido ·
 * 4B preço por último · 5C dias livres acendem em verde · 6A horários em cascata ·
 * 7A campos em cascata · 8A check desenhado na confirmação.
 */
(() => {
'use strict';
if (typeof document === 'undefined' || typeof Element === 'undefined' || typeof Element.prototype.animate !== 'function') return;
const CURVA = 'cubic-bezier(.22,.61,.36,1)', MOLA = 'cubic-bezier(.34,1.45,.64,1)';
const ETAPAS = ['profissional', 'procedimento', 'horario', 'dados'];
const $ = id => document.getElementById(id);
const celular = () => !!(window.matchMedia && window.matchMedia('(max-width: 700px)').matches);
function anima(el, quadros, opcoes) {
  try {
    if (!el || !el.getClientRects().length) return null;
    return el.animate(quadros, Object.assign({ easing: CURVA, fill: 'backwards' }, opcoes));
  } catch (_) { return null; }
}
const sobe = px => [{ opacity: 0, transform: `translateY(${px}px)` }, { opacity: 1, transform: 'none' }];
const esmaece = [{ opacity: 0 }, { opacity: 1 }];
function cascata(els, { ini = 0, dur = 440, passo = 45, max = 300, px = 5 } = {}) {
  Array.from(els).forEach((el, i) => anima(el, sobe(px), { duration: dur, delay: ini + Math.min(i * passo, max) }));
}

// 1C. Abertura: título levemente ampliado; o restante esmaece junto.
function abertura() {
  anima(document.querySelector('.ks-public-intro'), [{ opacity: 0, transform: 'scale(.97)' }, { opacity: 1, transform: 'none' }], { duration: 520 });
  anima($('ks_public_flow'), esmaece, { duration: 520, delay: 140 });
}
// 2A. Etapa nova desliza para o lado em que o paciente avança (ou volta).
function etapa(secao, dir) {
  const painel = document.querySelector('.ks-public-booking-panel');
  const dx = (celular() ? 14 : 22) * dir;
  // Corta a sobra lateral só durante o movimento (sem rolagem horizontal no celular).
  if (painel) painel.style.overflowX = 'clip';
  const a = anima(secao, [{ opacity: 0, transform: `translateX(${dx}px)` }, { opacity: 1, transform: 'none' }], { duration: 380 });
  const fim = () => { if (painel) painel.style.overflowX = ''; };
  if (a) { a.onfinish = fim; a.oncancel = fim; } else fim();
}
// 3C. Cartão do profissional escolhido: anel verde que se expande; perfil esmaece.
function profissional(botao) {
  anima(botao, [{ boxShadow: '0 0 0 0 rgba(30,117,111,.45)' }, { boxShadow: '0 0 0 10px rgba(30,117,111,0)' }], { duration: 620, fill: 'none' });
  anima(botao, [{ transform: 'scale(.98)' }, { transform: 'none' }], { duration: 300, easing: MOLA });
  anima(document.querySelector('.ks-public-profile-panel'), [{ opacity: .4 }, { opacity: 1 }], { duration: 380 });
}
// 4B. Atendimentos aparecem; o preço desliza para o lugar logo depois, devagar.
function atendimentos() {
  document.querySelectorAll('#ks_public_procedimentos > *').forEach((c, i) => {
    anima(c, esmaece, { duration: 380, delay: 60 + i * 60 });
    anima(c.querySelector('.ks-public-option-meta'), [{ opacity: 0, transform: 'translateX(12px)' }, { opacity: 1, transform: 'none' }], { duration: 720, delay: 380 + i * 110 });
  });
}
// 5C. O mês aparece e os dias com horário "acendem" em verde forte, devagar,
// e assentam no verde-claro normal do calendário.
function calendario() {
  const grade = $('ks_public_datas');
  anima(grade, esmaece, { duration: 300 });
  Array.from(grade ? grade.querySelectorAll('[data-data]') : []).forEach((dia, i) => {
    if (dia.getAttribute('aria-pressed') === 'true') { anima(dia, [{ transform: 'scale(.85)', opacity: .3 }, { transform: 'none', opacity: 1 }], { duration: 700, delay: 200, easing: MOLA }); return; }
    const cs = getComputedStyle(dia);
    anima(dia, [
      { transform: 'scale(.85)', opacity: .3, backgroundColor: cs.backgroundColor, color: cs.color },
      { transform: 'scale(1.05)', opacity: 1, backgroundColor: '#2A9D8F', color: '#FFFFFF', offset: .45 },
      { transform: 'none', opacity: 1, backgroundColor: cs.backgroundColor, color: cs.color }
    ], { duration: 1100, delay: 200 + Math.min(i * 70, 1100), easing: 'ease-in-out', fill: 'backwards' });
  });
}
// 6A. Horários do dia em cascata; o resumo do horário escolhido sobe.
function horarios() { cascata(document.querySelectorAll('#ks_public_horarios > *'), { dur: 340, passo: 22, max: 260, px: 4 }); }
// 7A. Resumo e campos do formulário sobem em sequência.
function dados() {
  cascata(document.querySelectorAll('#ks_public_step_dados .ks-public-booking-summary, #ks_public_form > .ks-public-field, #ks_public_form > .ks-public-check-row'), { ini: 60, dur: 420, passo: 40, px: 5 });
}
// 8A. Confirmação: círculo com check desenhado; título e cartão sobem em seguida.
function confirmacao() {
  const s = $('ks_public_success'); if (!s) return;
  let icone = s.querySelector('.ks-public-success-check');
  if (!icone) {
    icone = document.createElement('div');
    icone.className = 'ks-public-success-check';
    icone.setAttribute('aria-hidden', 'true');
    icone.style.cssText = 'display:flex;justify-content:center;margin:0 0 8px';
    icone.innerHTML = '<svg viewBox="0 0 52 52" width="56" height="56"><circle cx="26" cy="26" r="23" fill="none" stroke="#1E756F" stroke-width="3" pathLength="1" stroke-dasharray="1"/><path d="M15 27l7 7 15-16" fill="none" stroke="#1E756F" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" pathLength="1" stroke-dasharray="1"/></svg>';
    s.prepend(icone);
  }
  const [circulo, check] = icone.querySelectorAll('circle,path');
  anima(circulo, [{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }], { duration: 520 });
  anima(check, [{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }], { duration: 360, delay: 420 });
  cascata(s.querySelectorAll('h1, .ks-public-success-message, .ks-public-success-card, .ks-public-success-address:not([hidden]), #ks_public_new_booking'), { ini: 500, dur: 440, passo: 60 });
}

let iniciado = false;
function iniciar() {
  if (iniciado) return; // nunca observa duas vezes
  const app = $('ks_public_app'), flow = $('ks_public_flow');
  if (!app || !flow || typeof MutationObserver !== 'function') return;
  iniciado = true;
  const quadro = fn => (window.requestAnimationFrame || setTimeout)(() => { try { fn(); } catch (_) { } });
  let abriu = false, etapaAnterior = null, selecaoVisivel = false, sucessoVisivel = false, erroTexto = '';
  const etapaAtual = () => app.dataset.bookingStep || 'profissional';
  new MutationObserver(() => {
    try {
      if (!flow.hidden && !abriu) { abriu = true; etapaAnterior = etapaAtual(); quadro(abertura); return; }
      if (flow.hidden) return;
      const at = etapaAtual();
      if (etapaAnterior !== null && at !== etapaAnterior) {
        const dir = ETAPAS.indexOf(at) >= ETAPAS.indexOf(etapaAnterior) ? 1 : -1;
        etapaAnterior = at;
        const secao = document.querySelector(`[data-step="${at}"]`);
        quadro(() => { etapa(secao, dir); if (at === 'procedimento') atendimentos(); if (at === 'dados') dados(); });
      }
    } catch (_) { }
  }).observe(document.body, { subtree: true, attributes: true, attributeFilter: ['hidden', 'data-booking-step'] });

  document.addEventListener('click', ev => {
    const b = ev.target && ev.target.closest ? ev.target.closest('[data-profissional]') : null;
    if (b) quadro(() => profissional(b));
  }, true);
  const datas = $('ks_public_datas'), horas = $('ks_public_horarios');
  // A página atualiza os horários sozinha (foco, a cada minuto) e esvazia a grade antes
  // de redesenhar: só anima quando o conteúdo desenhado muda.
  let assinDatas = '', assinHoras = '';
  const assinatura = (el, extra) => (extra || '') + '|' + Array.from(el.children).map(c => (c.dataset && (c.dataset.data || c.dataset.horario)) || '').join(',');
  if (datas) new MutationObserver(() => { const a = assinatura(datas, ($('ks_public_calendar_month') || {}).textContent); if (!datas.children.length || a === assinDatas) return; assinDatas = a; if (etapaAtual() === 'horario') quadro(calendario); }).observe(datas, { childList: true });
  if (horas) new MutationObserver(() => { const a = assinatura(horas, ($('ks_public_data_escolhida') || {}).textContent); if (!horas.children.length || a === assinHoras) return; assinHoras = a; quadro(horarios); }).observe(horas, { childList: true });
  new MutationObserver(() => {
    try {
      const sel = $('ks_public_selection');
      if (sel) { if (!sel.hidden && !selecaoVisivel) anima(sel, sobe(10), { duration: 380 }); selecaoVisivel = !sel.hidden; }
      const ok = $('ks_public_success');
      if (ok) { if (!ok.hidden && !sucessoVisivel) quadro(confirmacao); sucessoVisivel = !ok.hidden; }
      const fb = $('ks_public_form_feedback');
      if (fb) { const t = fb.hidden ? '' : fb.textContent; if (t && t !== erroTexto) anima(fb, sobe(6), { duration: 320 }); erroTexto = t; }
    } catch (_) { }
  }).observe(document.body, { subtree: true, attributes: true, attributeFilter: ['hidden'], childList: true, characterData: true });
}
try {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => { try { iniciar(); } catch (_) { } });
  else iniciar();
} catch (_) { }
})();
