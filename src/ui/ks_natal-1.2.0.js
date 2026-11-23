/* KineSys — tema de Natal (ks_natal 1.2.0, 60 qps)
 * Tema de Natal 3.0 — KineSys / Atende CRM (23/11/2026)
 * Trenó traz o Papai Noel, que fica 1–3 min passeando pelos botões (anda, corre, pula, senta, cochila,
 * lê a lista, dança, espreguiça, olha em volta, acena) e depois vai embora no trenó; guirlanda com enfeites.
 * FEITO PARA NÃO TRAVAR:
 *  - nenhuma leitura de layout durante a animação: medições só quando o navegador está ocioso (requestIdleCallback);
 *  - guirlanda numa faixa fina (luzes piscam 2x/s); Papai Noel e trenó são figurinhas pequenas movidas pela placa de vídeo
 *    (transform, 60 qps) e só redesenhadas quando a pose muda;
 *  - para durante a rolagem e com a aba oculta; 0 trabalho entre as visitas;
 *  - freio automático: mede o próprio custo e o atraso dos quadros; reduz ou desliga os personagens sozinho.
 * Liga de 12/11 a 31/12. Desliga: localStorage natal_off=1. Some na impressão. Não bloqueia cliques.
 */
(function () {
  'use strict';
  if (window.__natalAtivo) return; window.__natalAtivo = true;
  var CFG = Object.assign({ alvos: 'button', topo: 'body > header', forcar: false, manual: false, seed: 0, visita: [75, 170], intervalo: [30, 75], primeira: 4 }, window.NATAL_CFG || {});
  function noPeriodo(d) { var m = d.getMonth(), dia = d.getDate(); return (m === 10 && dia >= 12) || m === 11; }
  if (!CFG.forcar && !noPeriodo(new Date())) return;
  try { if (localStorage.getItem('natal_off') === '1') return; } catch (e) { }

  var semente = CFG.seed || (Date.now() % 100000);
  function rnd() { semente |= 0; semente = (semente + 0x6D2B79F5) | 0; var q = Math.imul(semente ^ (semente >>> 15), 1 | semente); q = (q + Math.imul(q ^ (q >>> 7), 61 | q)) ^ q; return ((q ^ (q >>> 14)) >>> 0) / 4294967296; }
  function entre(a) { return a[0] + rnd() * (a[1] - a[0]); }
  var agora = (window.performance && performance.now) ? function () { return performance.now(); } : Date.now;

  /* ---------------- camadas: faixa fina da guirlanda + 2 figurinhas que a placa de vídeo move ---------------- */
  function camadaNova(z, w, h) { var c = document.createElement('canvas'); c.setAttribute('aria-hidden', 'true'); c.className = 'natal-camada'; c.style.cssText = 'position:fixed;left:0;top:0;width:' + w + 'px;height:' + h + 'px;pointer-events:none;z-index:' + z + ';contain:strict;will-change:transform;display:none;'; return c; }
  var SW = 130, SH = 210, SOX = 65, SOY = 192, TW = 480, TH = 140, TOX = 175, TOY = 112;
  var cvF = camadaNova(2147482999, 10, 10), cvS = camadaNova(2147483000, SW, SH), cvT = camadaNova(2147483000, TW, TH);
  var cF = cvF.getContext('2d'), cS = cvS.getContext('2d'), cT = cvT.getContext('2d'), ctx = cF;
  var estilo = document.createElement('style'); estilo.textContent = '@media print{.natal-camada{display:none!important}}';
  var W = 0, H = 0, DPR = 1, t = 0;
  function dimensionar() {
    DPR = Math.min(window.devicePixelRatio || 1, 2); W = window.innerWidth; H = window.innerHeight;
    [[cvS, cS, SW, SH], [cvT, cT, TW, TH]].forEach(function (p) { p[0].width = Math.round(p[2] * DPR); p[0].height = Math.round(p[3] * DPR); p[1].setTransform(DPR, 0, 0, DPR, 0, 0); });
    chaveS = chaveT = ''; decorSujo = true; baseSuja = true;
  }

  var CONT = '#3a1218', ESC = CFG.escala2 || 0.8;
  function capsula(x1, y1, x2, y2, r, cor) { ctx.lineCap = 'round'; ctx.strokeStyle = CONT; ctx.lineWidth = 2 * r + 3.2; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); ctx.strokeStyle = cor; ctx.lineWidth = 2 * r; ctx.stroke(); }
  function bola(x, y, r, cor, sem) { ctx.beginPath(); ctx.arc(x, y, r, 0, 6.2832); ctx.fillStyle = cor; ctx.fill(); if (!sem) { ctx.strokeStyle = CONT; ctx.lineWidth = 1.8; ctx.stroke(); } }
  function oval(x, y, rx, ry, cor, sem) { ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, 6.2832); ctx.fillStyle = cor; ctx.fill(); if (!sem) { ctx.strokeStyle = CONT; ctx.lineWidth = 1.8; ctx.stroke(); } }
  function nuvem(cs, cor, sombra) { // várias bolas com contorno só por fora (barba, pelo)
    ctx.strokeStyle = CONT; ctx.lineWidth = 3.6; cs.forEach(function (c) { ctx.beginPath(); ctx.arc(c[0], c[1], c[2], 0, 6.2832); ctx.stroke(); });
    ctx.fillStyle = cor; cs.forEach(function (c) { ctx.beginPath(); ctx.arc(c[0], c[1], c[2], 0, 6.2832); ctx.fill(); });
    if (sombra) { ctx.fillStyle = sombra; cs.forEach(function (c) { ctx.beginPath(); ctx.arc(c[0] + c[2] * .25, c[1] + c[2] * .35, c[2] * .55, 0, 6.2832); ctx.fill(); }); ctx.fillStyle = cor; cs.forEach(function (c) { ctx.beginPath(); ctx.arc(c[0] - c[2] * .15, c[1] - c[2] * .2, c[2] * .7, 0, 6.2832); ctx.fill(); }); }
  }
  function membro(x0, y0, ang, L) { return [x0 + Math.sin(ang) * L, y0 + Math.cos(ang) * L]; }
  function bota(x, y) { ctx.beginPath(); ctx.roundRect(x - 5, y - 4, 13, 8, 3.5); ctx.fillStyle = '#1e1e22'; ctx.fill(); ctx.strokeStyle = CONT; ctx.lineWidth = 1.8; ctx.stroke(); ctx.fillStyle = '#4b4b55'; ctx.fillRect(x + 1, y - 2.6, 4, 1.6); oval(x, y - 5, 5.5, 2.4, '#ffffff'); }
  function luva(x, y) { bola(x, y, 4.6, '#2d6a3e'); ctx.fillStyle = '#4f9a63'; ctx.beginPath(); ctx.arc(x - 1.3, y - 1.4, 1.6, 0, 6.2832); ctx.fill(); }
  function braco(x0, y0, ang, cor) { var e = membro(x0, y0, ang, 15); capsula(x0, y0, e[0], e[1], 4.6, cor); var c = membro(x0, y0, ang, 12.5); capsula(c[0], c[1], membro(x0, y0, ang, 13.5)[0], membro(x0, y0, ang, 13.5)[1], 4.4, '#ffffff'); var m = membro(x0, y0, ang, 18.5); luva(m[0], m[1]); return m; }
  function perna(x0, y0, ang, cor) { var e = membro(x0, y0, ang, 12); capsula(x0, y0, e[0], e[1], 5, cor); bota(e[0] + 1, e[1] + 3); }
  function poseDe(est, f) {
    var A = { pf: 0, pt: 0, bf: .15, bt: -.15, bob: 0, olho: 1, senta: 0, lista: false }, s = Math.sin(f);
    if (est === 'andar') { A.pf = s * .55; A.pt = -s * .55; A.bf = -s * .6; A.bt = s * .6; A.bob = Math.abs(Math.cos(f)) * 2.2; }
    else if (est === 'acena') { A.bf = 2.35 + Math.sin(f * 2.2) * .3; A.bt = .2; }
    else if (est === 'pulo' || est === 'cai' || est === 'sobeTreno') { A.pf = .7; A.pt = -.35; A.bf = 2.4; A.bt = 2.2; }
    else if (est === 'paraquedas') { A.bf = 2.95; A.bt = -.25; A.pf = .25; A.pt = -.2; }
    else if (est === 'sentar' || est === 'dormir') { A.pf = 1.5; A.pt = 1.38; A.bf = .55; A.bt = .35; A.senta = 13; if (est === 'dormir') A.olho = 0; else A.pf = 1.5 + Math.sin(f * .9) * .12; }
    else if (est === 'lista') { A.bf = 1.2; A.bt = 1.05; A.lista = true; }
    else if (est === 'dancar') { A.pf = s * .5; A.pt = -s * .5; A.bf = 2.45 + s * .45; A.bt = 2.3 - s * .45; A.bob = Math.abs(s) * 4; }
    else if (est === 'espreguica') { A.bf = 2.95; A.bt = 2.95; A.bob = -1.5; }
    else if (est === 'pulinhos') { var h = Math.abs(Math.sin(f)); A.bob = h * 13; A.pf = .5 * h; A.pt = -.3 * h; A.bf = .9 * h; A.bt = .6 * h; }
    else if (est === 'esperaTreno') { A.bf = 2.6 + s * .3; A.bt = 2.4 - s * .3; }
    if (A.olho && (t % 3.7) < .12) A.olho = 0; // pisca
    return A;
  }
  function noelVetor(x, y, dir, est, f, saco) {
    var A = poseDe(est, f);
    ctx.save(); ctx.translate(Math.round(x), Math.round(y - A.bob + A.senta * ESC)); ctx.scale(dir * ESC, ESC); ctx.lineJoin = 'round';
    perna(-4, -21, A.pt, '#a50d24');
    braco(-6, -45, A.bt, '#a50d24');
    if (saco) { oval(-18, -41, 11, 13, '#a0703f'); ctx.fillStyle = '#7d5530'; ctx.beginPath(); ctx.ellipse(-21, -38, 3.5, 4, .3, 0, 6.2832); ctx.fill(); capsula(-15, -54, -11, -51, 2.2, '#c9a06a'); ctx.fillStyle = '#c99358'; ctx.beginPath(); ctx.arc(-22, -46, 3, 0, 6.2832); ctx.fill(); }
    var gr = ctx.createRadialGradient(-6, -44, 3, 0, -35, 21); gr.addColorStop(0, '#ef4c5a'); gr.addColorStop(.55, '#cf1530'); gr.addColorStop(1, '#93091f');
    ctx.beginPath(); ctx.ellipse(0, -35, 18.5, 17.5, 0, 0, 6.2832); ctx.fillStyle = gr; ctx.fill(); ctx.strokeStyle = CONT; ctx.lineWidth = 2; ctx.stroke();
    ctx.save(); ctx.beginPath(); ctx.ellipse(0, -35, 17.5, 16.6, 0, 0, 6.2832); ctx.clip();
    ctx.fillStyle = '#ffffff'; ctx.fillRect(4, -53, 6.5, 32); ctx.fillStyle = '#dfe5ec'; ctx.fillRect(8.5, -53, 2, 32);
    ctx.fillStyle = '#1c1c20'; ctx.fillRect(-20, -36.5, 40, 6.5); ctx.fillStyle = '#3a3a42'; ctx.fillRect(-20, -36.5, 40, 1.4); ctx.restore();
    ctx.lineWidth = 2.2; ctx.strokeStyle = '#f2c230'; ctx.strokeRect(3.5, -38, 8.5, 9.5); ctx.strokeStyle = '#a87d12'; ctx.lineWidth = .8; ctx.strokeRect(5.5, -36, 4.5, 5.5);
    nuvem([[-14, -21, 4.6], [-8, -20, 4.8], [-2, -19.6, 4.8], [4, -19.6, 4.8], [10, -20, 4.8], [15, -21, 4.4]], '#ffffff', '#dfe5ec');
    perna(5, -21, A.pf, '#c8102e');
    oval(-6, -60, 3.2, 4.2, '#e9b08c'); bola(5, -60, 12.5, '#f6caa5');
    nuvem([[7, -51, 7.2], [0, -52, 5.6], [13.5, -52, 5.4], [5, -46, 6.2], [11.5, -46.5, 5], [1, -42.5, 4.2], [8, -41.5, 3.8]], '#ffffff', '#e4e9ef');
    nuvem([[11, -55.5, 3.9], [15.6, -56, 3.2]], '#ffffff');
    oval(8.8, -58.8, 3.2, 2.4, 'rgba(255,120,120,.7)', true);
    bola(16.2, -59.2, 3.3, '#e8645c'); ctx.fillStyle = '#ffb3ad'; ctx.beginPath(); ctx.arc(15.3, -60.2, 1, 0, 6.2832); ctx.fill();
    if (A.olho) { var oy = A.lista ? -62 : -63; oval(11, oy, 1.9, 2.8, '#2b1b14', true); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(11.6, oy - 1.1, .8, 0, 6.2832); ctx.fill(); } else { ctx.strokeStyle = '#2b1b14'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(9.2, -62.6); ctx.quadraticCurveTo(11, -61.4, 12.8, -62.6); ctx.stroke(); }
    nuvem([[9.4, -67.4, 2.2], [12.6, -67.7, 2]], '#ffffff');
    var gh = ctx.createLinearGradient(-14, -104, 14, -74); gh.addColorStop(0, '#93091f'); gh.addColorStop(.6, '#d0152f'); gh.addColorStop(1, '#e83b4b');
    ctx.beginPath(); ctx.moveTo(-9, -74); ctx.quadraticCurveTo(-6, -88, -15.5, -88.5); ctx.quadraticCurveTo(4, -106, 18, -74); ctx.closePath(); ctx.fillStyle = gh; ctx.fill(); ctx.strokeStyle = CONT; ctx.lineWidth = 2; ctx.stroke();
    nuvem([[-9.5, -74.5, 3.6], [-4, -75.3, 3.8], [2, -75.7, 3.8], [8, -75.7, 3.8], [13.6, -75.1, 3.6], [17.6, -74.2, 3]], '#ffffff', '#e1e6ec');
    nuvem([[-17, -88, 5.4]], '#ffffff', '#e1e6ec');
    if (A.lista) { // lista de presentes aberta nas mãos
      ctx.save(); ctx.translate(26, -40); ctx.rotate(-.12); ctx.beginPath(); ctx.roundRect(-8, -14, 16, 28, 2); ctx.fillStyle = '#fbf3dc'; ctx.fill(); ctx.strokeStyle = '#8a6d3b'; ctx.lineWidth = 1.4; ctx.stroke();
      ctx.strokeStyle = '#9b8a6a'; ctx.lineWidth = 1; for (var i = 0; i < 6; i++) { ctx.beginPath(); ctx.moveTo(-5, -9 + i * 4); ctx.lineTo(4 - (i % 3) * 2, -9 + i * 4); ctx.stroke(); }
      ctx.fillStyle = '#e7d7ae'; ctx.fillRect(-9, 12, 18, 4); ctx.restore();
    }
    braco(A.bf > 1.5 ? 15 : 6, -45, A.bf, '#c8102e');
    ctx.restore();
    if (est === 'dormir') { ctx.save(); ctx.fillStyle = '#3a5a8a'; ctx.font = 'bold 13px system-ui,sans-serif'; for (var z = 0; z < 3; z++) { var fz = (t * .6 + z / 3) % 1; ctx.globalAlpha = 1 - fz; ctx.fillText('z', x + dir * (12 + fz * 18) * ESC + z * 2, y - (92 + fz * 34) * ESC); } ctx.restore(); }
  }


  // guarda-chuva (para o modelo 4)
  function guardaChuva(x, y) {
    var cy = y - 118 * ESC, R = 34;
    ctx.save(); ctx.lineJoin = 'round';
    ctx.strokeStyle = '#5b3a1e'; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(x + 6 * ESC, y - 66 * ESC); ctx.lineTo(x, cy); ctx.stroke();
    for (var i = 0; i < 6; i++) { ctx.beginPath(); ctx.moveTo(x, cy); ctx.arc(x, cy, R, Math.PI + i * Math.PI / 6, Math.PI + (i + 1) * Math.PI / 6); ctx.closePath(); ctx.fillStyle = i % 2 ? '#ffffff' : '#d0152f'; ctx.fill(); }
    ctx.beginPath(); ctx.arc(x, cy, R, Math.PI, 0); ctx.lineTo(x - R, cy); ctx.strokeStyle = CONT; ctx.lineWidth = 2; ctx.stroke();
    for (var k = 0; k < 6; k++) { ctx.beginPath(); ctx.arc(x - R + R / 6 + k * R / 3, cy, R / 6, 0, Math.PI); ctx.fillStyle = k % 2 ? '#ffffff' : '#d0152f'; ctx.fill(); ctx.stroke(); }
    bola(x, cy - R - 2, 3, '#f2c230'); ctx.restore();
  }

  // árvore de desenho: 3 camadas recortadas, bolas, luzes, festão dourado, estrela
  var PRES = [['#d0152f', '#ffd23f'], ['#2c9a4d', '#ffffff'], ['#2f6fd6', '#ffd23f'], ['#8e3fd1', '#ffffff'], ['#f08a24', '#d0152f']];
  function presente(x, y, i) {
    var c = PRES[i % 5], w = 28 + (i % 3) * 4, h = 22 + (i % 2) * 6; ctx.save(); ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.roundRect(x - w / 2, y - h, w, h, 2.5); ctx.fillStyle = c[0]; ctx.fill(); ctx.strokeStyle = CONT; ctx.lineWidth = 1.8; ctx.stroke();
    ctx.fillStyle = c[1]; ctx.fillRect(x - 2.5, y - h, 5, h); ctx.fillRect(x - w / 2, y - h * .55, w, 4.5);
    oval(x - 5, y - h - 3, 5, 3.4, c[1]); oval(x + 5, y - h - 3, 5, 3.4, c[1]); ctx.restore();
  }

  // trenó e renas de desenho
  var TR = { ativo: false, x: -300, y: 70, v: 150, prox: 3 };
  function rena(x, y, f, i) {
    ctx.save(); ctx.translate(x, y); ctx.lineJoin = 'round';
    var s = Math.sin(f), pe = [[-11, s * .7], [-6, -s * .7], [10, -s * .7], [15, s * .7]];
    pe.slice(0, 2).forEach(function (p) { var e = membro(p[0], -20, p[1], 14); capsula(p[0], -20, e[0], e[1], 2.6, '#7a4a26'); bola(e[0], e[1] + 1, 2.6, '#2b1a10'); });
    var g = ctx.createLinearGradient(0, -34, 0, -14); g.addColorStop(0, '#a46b37'); g.addColorStop(1, '#7a4a26');
    ctx.beginPath(); ctx.ellipse(2, -25, 20, 10, 0, 0, 6.2832); ctx.fillStyle = g; ctx.fill(); ctx.strokeStyle = CONT; ctx.lineWidth = 1.8; ctx.stroke();
    oval(2, -20, 12, 4, '#d8ad7a', true); oval(-18, -28, 4, 3, '#f4e4cc');
    pe.slice(2).forEach(function (p) { var e = membro(p[0], -20, p[1], 14); capsula(p[0], -20, e[0], e[1], 2.6, '#8b5a2b'); bola(e[0], e[1] + 1, 2.6, '#2b1a10'); });
    capsula(16, -30, 23, -41, 5, '#9a6232');
    ctx.strokeStyle = '#d9b77c'; ctx.lineWidth = 2.4; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(24, -49); ctx.lineTo(19, -62); ctx.lineTo(13, -66); ctx.moveTo(20, -58); ctx.lineTo(26, -64); ctx.moveTo(28, -49); ctx.lineTo(29, -61); ctx.lineTo(35, -64); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(28, -45, 9, 6, -.15, 0, 6.2832); ctx.fillStyle = '#a46b37'; ctx.fill(); ctx.strokeStyle = CONT; ctx.lineWidth = 1.8; ctx.stroke();
    oval(33, -43, 4.5, 3.4, '#d8ad7a', true); oval(21, -50, 2.4, 4, '#7a4a26');
    ctx.fillStyle = '#1b1b1b'; ctx.beginPath(); ctx.arc(28, -47, 1.4, 0, 6.2832); ctx.fill();
    var nariz = i === 0; if (nariz) { ctx.globalAlpha = .35 + .2 * Math.sin(t * 7); bola(37.5, -44, 7, '#ff3030', true); ctx.globalAlpha = 1; }
    bola(37.5, -44, 3, nariz ? '#ff2b2b' : '#3b2418');
    capsula(16, -33, 20, -36, 2.4, '#d0152f'); bola(19, -31, 2.6, '#f2c230');
    ctx.restore();
  }
  function desenharTreno() {
    var x = TR.x, y = TR.y + Math.sin(t * 3) * 4, f = t * 11;
    ctx.save(); ctx.lineJoin = 'round';
    for (var s = 1; s < 9; s++) { ctx.globalAlpha = .55 - s * .06; ctx.fillStyle = s % 2 ? '#ffd23f' : '#ffffff'; ctx.beginPath(); ctx.arc(x - 30 - s * 14, y - 10 + Math.sin(t * 9 + s) * 5, 2, 0, 6.2832); ctx.fill(); } ctx.globalAlpha = 1;
    ctx.strokeStyle = '#7a5230'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x + 46, y - 24); ctx.lineTo(x + 196, y - 24); ctx.stroke();
    for (var i = 2; i >= 0; i--) rena(x + 92 + i * 56, y + Math.sin(t * 3 + i) * 3, f + i * .9, 2 - i);
    oval(x + 4, y - 32, 14, 13, '#a0703f'); presente(x + 22, y - 18, 0); presente(x - 8, y - 20, 2);
    ctx.beginPath(); ctx.moveTo(-26 + x, y - 26); ctx.quadraticCurveTo(-30 + x, y - 4, x - 10, y); ctx.lineTo(x + 40, y); ctx.quadraticCurveTo(x + 52, y - 4, x + 50, y - 22); ctx.lineTo(x + 30, y - 18); ctx.quadraticCurveTo(x + 4, y - 10, x - 26, y - 26);
    var g = ctx.createLinearGradient(0, y - 26, 0, y); g.addColorStop(0, '#e23a4a'); g.addColorStop(1, '#9a0c22'); ctx.fillStyle = g; ctx.fill(); ctx.strokeStyle = CONT; ctx.lineWidth = 2; ctx.stroke();
    ctx.strokeStyle = '#f2c230'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x - 20, y - 8); ctx.quadraticCurveTo(x + 10, y - 14, x + 44, y - 8); ctx.stroke();
    ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x - 24, y + 8); ctx.lineTo(x + 52, y + 8); ctx.quadraticCurveTo(x + 64, y + 8, x + 62, y - 2); ctx.stroke();
    ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x - 8, y); ctx.lineTo(x - 8, y + 8); ctx.moveTo(x + 34, y); ctx.lineTo(x + 34, y + 8); ctx.stroke();
    ctx.restore();
  }


  /* ---------------- medição (só no ocioso) ---------------- */
  var plats = [], GY = 4, LIVRES = [], CANTOS = [false, false], ENF = [], decorSujo = true, versaoMedida = 0;
  var CLIC = 'button,a,input,select,textarea,label,img,svg,[role="button"],[tabindex]';
  function ocupado(x, y) {
    if (x < 0 || y < 0 || x >= W || y >= H) return false;
    var el = document.elementFromPoint(x, y); if (!el || el === document.body || el === document.documentElement) return false;
    if (el.closest && el.closest(CLIC)) return true;
    for (var n = el.firstChild; n; n = n.nextSibling) if (n.nodeType === 3 && n.textContent.trim()) return true;
    return false;
  }
  function livre(x1, y1, x2, y2) { for (var yy = y1; yy <= y2; yy += Math.max(4, (y2 - y1) / 4)) for (var xx = x1; xx <= x2; xx += Math.max(4, (x2 - x1) / 3)) if (ocupado(xx, yy)) return false; return true; }
  function guirlandaY(x) { var vao = 190, f = ((x % vao) + vao) % vao / vao; return GY + Math.sin(f * Math.PI) * 9; }
  function medirBotoes() {
    var lista = [];
    try {
      var els = document.querySelectorAll(CFG.alvos);
      for (var i = 0; i < els.length && lista.length < 60; i++) {
        var r = els[i].getBoundingClientRect();
        if (r.width < 34 || r.height < 14 || r.top < 70 || r.bottom > H - 4 || r.left < 0 || r.right > W) continue;
        lista.push({ el: els[i], x1: r.left + 4, x2: r.right - 4, y: r.top });
      }
    } catch (e) { }
    // o Papai Noel acompanha o botão em que está (ou cai se ele sumiu)
    if (P.plat && P.plat.el) { var novo = null; for (var k = 0; k < lista.length; k++) if (lista[k].el === P.plat.el) novo = lista[k]; if (novo) { P.y += novo.y - P.plat.y; P.plat = novo; } else if (P.est !== 'fora') { P.plat = null; P.est = 'cai'; P.vx = 0; P.vy = 0; } }
    plats = lista;
  }
  function filaEnfeites() { // lista de tarefas curtas; o resultado só entra em vigor no fim
    var R = { GY: 4, LIVRES: [], CANTOS: [false, false], ENF: [] }, q = [], cands = [4], conta = {}, el = CFG.topo && document.querySelector(CFG.topo);
    if (el) { var r = el.getBoundingClientRect(); if (r.bottom > 20 && r.bottom < 160) cands.push(Math.round(r.bottom) - 2); }
    cands.forEach(function (c) { conta[c] = 0; for (var x = 14; x < W; x += 27) (function (x, c) { q.push(function () { for (var y = c + 2; y <= c + 24; y += 7) if (ocupado(x, y) || ocupado(x - 5, y) || ocupado(x + 5, y)) return; conta[c]++; }); })(x, c); });
    q.push(function () { var mv = -1; cands.forEach(function (c) { if (conta[c] > mv) { mv = conta[c]; R.GY = c; } }); var gy0 = GY; GY = R.GY;
      for (var kk = 0, xb = 14; xb < W; xb += 27, kk++) (function (kk, xb) { q.push(function () { var yb = guirlandaY(xb); R.LIVRES[kk] = livre(xb - 6, yb, xb + 6, yb + 16); }); })(kk, xb);
      q.push(function () { R.CANTOS = [livre(2, GY - 6, 44, GY + 30), livre(W - 44, GY - 6, W - 2, GY + 30)]; });
      var tipos = ['bola', 'bola', 'estrela', 'bengala', 'bola', 'sino'], cores = ['#d0152f', '#2f6fd6', '#f2c230', '#2c9a4d', '#8e3fd1', '#ffffff'];
      for (var x2 = 40, k = 0; x2 < W - 30; x2 += 41, k++) (function (x2, k) { q.push(function () { var L = 16 + ((k * 37) % 5) * 9, tp = tipos[k % tipos.length], y0 = guirlandaY(x2), tam = tp === 'bengala' ? 16 : 11;
        if (!livre(x2 - tam, y0 + 2, x2 + tam, y0 + L + tam * 2 + 4)) { L = 8; if (!livre(x2 - tam, y0 + 2, x2 + tam, y0 + L + tam * 2 + 4)) return; } R.ENF.push([x2, L, tp, cores[k % cores.length], k * 1.7]); }); })(x2, k);
      q.push(function () { LIVRES = R.LIVRES; CANTOS = R.CANTOS; ENF = R.ENF; decorSujo = true; baseSuja = true; });
      GY = gy0; q.push(function () { GY = R.GY; });
    });
    return q;
  }
  var tarefas = [];
  function rodarTarefas(prazo) { // prazo(): ms livres restantes
    while (tarefas.length && prazo() > 3) tarefas.shift()();
    if (tarefas.length) ocioso(function (d) { if (rolando || document.hidden) { tarefas = []; return; } rodarTarefas(d && d.timeRemaining ? function () { return d.timeRemaining(); } : tempoFixo()); });
  }
  function tempoFixo() { var ini = agora(); return function () { return 6 - (agora() - ini); }; }
  var ultMedBot = -99, ultMedEnf = -99, medindo = false;
  var ocioso = window.requestIdleCallback ? function (f) { window.requestIdleCallback(f, { timeout: 1500 }); } : function (f) { setTimeout(f, 200); };
  function agendarMedicao(forcar) {
    if (medindo || rolando) return;
    var precisaBot = forcar || t - ultMedBot > 2.5, precisaEnf = forcar || t - ultMedEnf > 8;
    if (!precisaBot && !precisaEnf) return;
    medindo = true;
    var faz = function (d) { medindo = false; if (rolando || document.hidden) return; if (precisaBot) { medirBotoes(); ultMedBot = t; } if (precisaEnf && !tarefas.length) { ultMedEnf = t; tarefas = filaEnfeites(); if (CFG.manual) while (tarefas.length) tarefas.shift()(); else rodarTarefas(d && d.timeRemaining ? function () { return d.timeRemaining(); } : tempoFixo()); } versaoMedida++; };
    if (CFG.manual) faz(); else ocioso(faz);
  }

  /* ---------------- enfeites (camada de fundo, 2x por segundo) ---------------- */
  var LUZES = ['#ff3b3b', '#ffd23f', '#3bd16f', '#3ba7ff', '#ff7bd5'], piscaAnt = -1, faixaAnt = 0, baseSuja = true, base = document.createElement('canvas'), cB = base.getContext('2d');
  function desenharEnfeites() {
    ENF.forEach(function (e) {
      var x = e[0], y0 = guirlandaY(x) + 3, L = e[1], ang = 0, ex = x + Math.sin(ang) * L, ey = y0 + Math.cos(ang) * L;
      ctx.strokeStyle = '#b08d3c'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(x, y0); ctx.lineTo(ex, ey); ctx.stroke();
      ctx.save(); ctx.translate(ex, ey); ctx.rotate(ang); ctx.lineJoin = 'round';
      if (e[2] === 'bola') { ctx.fillStyle = '#b08d3c'; ctx.fillRect(-2.5, -1, 5, 3.5); bola(0, 9, 8, e[3]); ctx.fillStyle = 'rgba(255,255,255,.75)'; ctx.beginPath(); ctx.arc(-2.6, 6, 2.2, 0, 6.2832); ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(-7, 9); ctx.quadraticCurveTo(0, 12, 7, 9); ctx.stroke(); }
      else if (e[2] === 'estrela') { ctx.translate(0, 10); ctx.beginPath(); for (var i = 0; i < 10; i++) { var a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? 4.2 : 10; ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); } ctx.closePath(); ctx.fillStyle = '#ffd23f'; ctx.fill(); ctx.strokeStyle = '#a87d12'; ctx.lineWidth = 1.5; ctx.stroke(); }
      else if (e[2] === 'sino') { ctx.beginPath(); ctx.moveTo(-8, 15); ctx.quadraticCurveTo(-7, 2, 0, 1); ctx.quadraticCurveTo(7, 2, 8, 15); ctx.closePath(); ctx.fillStyle = '#f2c230'; ctx.fill(); ctx.strokeStyle = '#a87d12'; ctx.lineWidth = 1.5; ctx.stroke(); bola(0, 16, 2.4, '#a87d12', true); capsula(-3, 1, 3, 1, 1.6, '#d0152f'); }
      else { ctx.lineCap = 'round'; ctx.strokeStyle = CONT; ctx.lineWidth = 6.5; ctx.beginPath(); ctx.moveTo(0, 28); ctx.lineTo(0, 8); ctx.arc(-5, 8, 5, 0, Math.PI, true); ctx.stroke(); ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 4; ctx.stroke(); ctx.strokeStyle = '#d0152f'; ctx.setLineDash([3, 3]); ctx.stroke(); ctx.setLineDash([]); }
      ctx.restore();
    });
  }
  function lacoCanto(x, y, vira) { ctx.save(); ctx.translate(x, y); ctx.scale(vira ? -1 : 1, 1); ctx.lineJoin = 'round'; oval(-9, 0, 9, 6, '#d0152f'); oval(9, 0, 9, 6, '#d0152f'); capsula(-3, 4, -8, 22, 3, '#d0152f'); capsula(3, 4, 9, 20, 3, '#d0152f'); bola(0, 0, 4.5, '#a50d24'); ctx.fillStyle = '#2c9a4d'; ctx.beginPath(); ctx.ellipse(16, -4, 8, 3.5, .5, 0, 6.2832); ctx.fill(); ctx.beginPath(); ctx.ellipse(13, 5, 7, 3, -.4, 0, 6.2832); ctx.fill(); bola(18, 2, 2.6, '#e0142c', true); bola(21, 5, 2.3, '#e0142c', true); ctx.restore(); }
  function lampada(x, y, cor, on) {
    ctx.fillStyle = '#555'; ctx.fillRect(Math.round(x) - 2, Math.round(y) - 3, 4, 3);
    if (on) { ctx.globalAlpha = .28; ctx.fillStyle = cor; ctx.beginPath(); ctx.arc(x, y + 4, 8, 0, 6.29); ctx.fill(); ctx.globalAlpha = 1; }
    ctx.fillStyle = on ? cor : '#6d6d6d'; ctx.beginPath(); ctx.ellipse(x, y + 4, 3.2, 4.5, 0, 0, 6.29); ctx.fill();
  }
  function lacoFita(x, y) { ctx.fillStyle = '#d0142c'; ctx.fillRect(x - 7, y - 4, 6, 6); ctx.fillRect(x + 1, y - 4, 6, 6); ctx.fillRect(x - 2, y - 2, 4, 4); ctx.fillRect(x - 4, y + 2, 3, 8); ctx.fillRect(x + 1, y + 2, 3, 8); }
  function pintarBase() {
    var faixa = GY + 80; base.width = Math.round(W * DPR); base.height = Math.round(faixa * DPR); cB.setTransform(DPR, 0, 0, DPR, 0, 0); ctx = cB;
    ctx.lineCap = 'round'; ctx.strokeStyle = '#1b6b34'; ctx.lineWidth = 7; ctx.beginPath();
    for (var x = 0; x <= W; x += 6) { var y = guirlandaY(x); if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y); } ctx.stroke();
    ctx.strokeStyle = '#2fa352'; ctx.lineWidth = 2; ctx.setLineDash([3, 4]); ctx.stroke(); ctx.setLineDash([]);
    for (var k = 0, x2 = 14; x2 < W; x2 += 27, k++) if (LIVRES[k] !== false) { ctx.fillStyle = '#555'; ctx.fillRect(Math.round(x2) - 2, Math.round(guirlandaY(x2) + 5) - 3, 4, 3); }
    for (var p = 0; p <= W; p += 190) lacoFita(p, GY);
    desenharEnfeites();
    if (CANTOS[0]) lacoCanto(16, GY + 4, false); if (CANTOS[1]) lacoCanto(W - 16, GY + 4, true);
    baseSuja = false;
  }
  function pintarEnfeites() {
    var pisca = Math.floor(t * 2.2);
    if (!decorSujo && pisca === piscaAnt) return;
    if (baseSuja) pintarBase();
    piscaAnt = pisca; decorSujo = false; ctx = cF;
    var faixa = Math.ceil(GY + 80); if (faixa !== faixaAnt || cvF.width !== Math.round(W * DPR)) { cvF.width = Math.round(W * DPR); cvF.height = Math.round(faixa * DPR); cvF.style.width = W + 'px'; cvF.style.height = faixa + 'px'; cvF.style.display = 'block'; faixaAnt = faixa; }
    cF.setTransform(DPR, 0, 0, DPR, 0, 0); cF.clearRect(0, 0, W, faixa);
    cF.drawImage(base, 0, 0, W, base.height / DPR);
    for (var k = 0, x2 = 14; x2 < W; x2 += 27, k++) { if (LIVRES[k] === false) continue; lampada(x2, guirlandaY(x2) + 5, LUZES[k % 5], (pisca + k) % 3 !== 0); }
  }

  /* ---------------- personagens ---------------- */
  var chaveS = '', chaveT = '';
  var P = { x: 0, y: 0, dir: 1, est: 'fora', plat: null, vx: 0, vy: 0, alvo: null, tempo: 0, quadro: 0, saco: true, ativ: '', ultAtiv: '', visita: 0, partindo: false };
  var G = 1100, VEL = 60;
  function chao() { return { el: null, x1: 20, x2: W - 20, y: H }; }
  function pousar(y0, y1) { var melhor = null; plats.concat([chao()]).forEach(function (p) { if (P.x >= p.x1 && P.x <= p.x2 && y0 <= p.y + 1 && y1 >= p.y - 1) if (!melhor || p.y < melhor.y) melhor = p; }); return melhor; }
  function pular(p) { var tx = Math.max(p.x1 + 14, Math.min(p.x2 - 14, P.x + (rnd() - .5) * 80)), dy = p.y - P.y, T = .55 + Math.min(.45, Math.abs(tx - P.x) / 700); P.vx = (tx - P.x) / T; P.vy = (dy - .5 * G * T * T) / T; P.dir = P.vx >= 0 ? 1 : -1; P.est = 'pulo'; P.plat = null; }
  function escolherPulo() { var ops = plats.filter(function (p) { var dy = P.y - p.y, dx = Math.min(Math.abs(p.x1 - P.x), Math.abs(p.x2 - P.x)); return p !== P.plat && dy > -80 && dy < 300 && Math.abs(dy) > 12 && (P.x >= p.x1 && P.x <= p.x2 || dx < 300); }); if (!ops.length) return false; pular(ops[Math.floor(rnd() * ops.length)]); return true; }

  // atividades: [nome, peso, duração]
  var ATIV = [['andar', 5, [3, 8]], ['correr', 2, [2, 4]], ['pular', 5, [0, 0]], ['sentar', 3, [6, 12]], ['dormir', 2, [7, 12]], ['lista', 2, [5, 9]], ['dancar', 2, [3, 6]], ['espreguica', 1, [2, 3]], ['olhar', 2, [3, 5]], ['acena', 2, [2, 3.5]], ['pulinhos', 2, [2, 3]]];
  function proximaAtividade() {
    var ops = ATIV.filter(function (a) { return a[0] !== P.ultAtiv; }), tot = 0; ops.forEach(function (a) { tot += a[1]; });
    var r = rnd() * tot, a = ops[0]; for (var i = 0; i < ops.length; i++) { r -= ops[i][1]; if (r <= 0) { a = ops[i]; break; } }
    P.ativ = a[0]; P.ultAtiv = a[0]; P.tempo = entre(a[2]); P.est = a[0] === 'correr' ? 'andar' : a[0];
    if (a[0] === 'pular' && !escolherPulo()) { P.ativ = 'andar'; P.est = 'andar'; P.tempo = 3; }
    if (a[0] === 'andar' || a[0] === 'correr') P.dir = rnd() < .5 ? -1 : 1;
  }
  function passoVisita(dt) {
    var p = P.plat;
    if (P.est === 'pulo' || P.est === 'cai') {
      var y0 = P.y; P.vy += G * dt; P.x += P.vx * dt; P.y += P.vy * dt;
      if (P.vy > 0) { var q = pousar(y0, P.y); if (q) { P.y = q.y; P.plat = q; P.vx = 0; P.est = 'parado'; P.tempo = .5 + rnd() * .6; P.ativ = 'pousou'; } }
      if (P.y > H + 60) { P.x = Math.max(40, Math.min(W - 40, P.x)); P.plat = chao(); P.y = H; P.est = 'parado'; P.tempo = .5; }
      return;
    }
    if (P.est === 'sobeTreno') { P.quadro += dt; var k = Math.min(1, dt * 5); P.y += (TR.y + 4 - P.y) * k - 120 * dt; P.x += (TR.x + 20 - P.x) * k; if (P.y < TR.y + 14) { P.est = 'fora'; } return; }
    if (P.est === 'esperaTreno') { P.quadro += dt * 3; if (TR.ativo && Math.abs(TR.x + 20 - P.x) < 40) { P.est = 'sobeTreno'; P.vy = -760; } return; }
    var anda = P.est === 'andar', vel = P.ativ === 'correr' ? VEL * 2.1 : VEL;
    if (anda) {
      P.x += P.dir * vel * dt; P.quadro += dt * (P.ativ === 'correr' ? 15 : 9);
      if (p && !p.el && (P.x < 30 || P.x > W - 30)) { P.dir *= -1; P.x = Math.max(30, Math.min(W - 30, P.x)); }
      if (p && p.el && (P.x < p.x1 || P.x > p.x2)) { if (rnd() < .45) { P.dir *= -1; P.x = Math.max(p.x1, Math.min(p.x2, P.x)); } else { P.est = 'cai'; P.vx = P.dir * 70; P.vy = -120; P.plat = null; return; } }
    } else if (P.est === 'pulinhos') { P.quadro += dt * 7; }
    else if (P.est === 'olhar') { P.quadro += dt; if (Math.floor(P.quadro / .9) % 2 !== Math.floor((P.quadro - dt) / .9) % 2) P.dir *= -1; }
    else P.quadro += dt * (P.est === 'dancar' ? 9 : 3);
    P.tempo -= dt;
    if (P.tempo <= 0) {
      if (t > P.visita && !P.partindo) { P.partindo = true; P.est = 'esperaTreno'; P.saco = true; TR.ativo = true; TR.x = -300; TR.y = 92 + rnd() * 30; TR.levar = true; return; }
      proximaAtividade();
    }
  }
  // trenó: chega, solta o Papai Noel de guarda-chuva; depois volta para buscá-lo
  var proxVisita = 0;
  function passoTreno(dt) {
    if (TR.ativo) {
      TR.x += TR.v * dt;
      if (!TR.levar && P.est === 'fora' && TR.x > W * .28) { var bs = plats.filter(function (p) { return p.x2 > TR.x; }); P.alvo = bs.length ? bs[Math.floor(rnd() * bs.length)] : null; P.x = TR.x + 20; P.y = TR.y + 6; P.est = 'paraquedas'; P.dir = 1; P.quadro = 0; }
      if (TR.x > W + 360) { TR.ativo = false; if (TR.levar) { TR.levar = false; P.partindo = false; P.est = 'fora'; P.plat = null; proxVisita = t + entre(CFG.intervalo); } }
    } else if (P.est === 'fora' && t >= proxVisita) { TR.ativo = true; TR.x = -300; TR.y = 92 + rnd() * 30; TR.levar = false; }
    if (P.est === 'paraquedas') {
      var y0 = P.y; P.y += 70 * dt; if (P.alvo) P.x += Math.max(-40, Math.min(40, (P.alvo.x1 + P.alvo.x2) / 2 - P.x)) * dt; P.x += Math.sin(t * 2) * 10 * dt;
      var q = pousar(y0, P.y); if (q) { P.y = q.y; P.plat = q; P.est = 'acena'; P.ativ = 'acena'; P.tempo = 2; P.visita = t + entre(CFG.visita); P.saco = true; }
    }
  }
  function mover(c, x, y) { c.style.transform = 'translate3d(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px,0)'; }
  function pintarPersonagens() {
    // trenó
    if (TR.ativo) {
      var kT = Math.floor(t * 14); if (kT !== chaveT) { chaveT = kT; ctx = cT; cT.clearRect(0, 0, TW, TH); var gx = TR.x, gy = TR.y; TR.x = TOX; TR.y = TOY; desenharTreno(); TR.x = gx; TR.y = gy; }
      if (cvT.style.display !== 'block') cvT.style.display = 'block'; mover(cvT, TR.x - TOX, TR.y - TOY);
    } else if (cvT.style.display !== 'none') cvT.style.display = 'none';
    // Papai Noel
    if (P.est !== 'fora' && modo !== 'sem-personagens') {
      var saco = P.saco && (P.est === 'andar' || P.est === 'acena' || P.est === 'olhar'), passos = modo === 'leve' ? 6 : 12;
      var fase = Math.floor(P.quadro / (6.2832 / passos)), olho = (t % 3.7) < .12 ? 0 : 1, z = P.est === 'dormir' ? Math.floor(t * 8) : 0;
      var kS = P.est + '|' + fase + '|' + (P.dir < 0 ? -1 : 1) + '|' + saco + '|' + olho + '|' + z;
      if (kS !== chaveS) { chaveS = kS; ctx = cS; cS.clearRect(0, 0, SW, SH); if (P.est === 'paraquedas') guardaChuva(SOX, SOY); noelVetor(SOX, SOY, P.dir < 0 ? -1 : 1, P.est, fase * (6.2832 / passos), saco); }
      if (cvS.style.display !== 'block') cvS.style.display = 'block'; mover(cvS, P.x - SOX, P.y - SOY);
    } else if (cvS.style.display !== 'none') cvS.style.display = 'none';
  }

  /* ---------------- laço a 60 qps (física + transform); freio automático ---------------- */
  var rolando = false, fimRolagem = 0, ultimoTs = 0, custo = 0, lentos = 0, modo = 'normal';
  function quadro(dt) {
    t += dt;
    agendarMedicao(false);
    passoTreno(dt); if (P.est !== 'fora' && P.est !== 'paraquedas') passoVisita(dt);
    var t0 = agora();
    pintarEnfeites(); pintarPersonagens();
    var c = agora() - t0; custo = custo * .95 + c * .05;
    if (custo > 3 && modo === 'normal') modo = 'leve';
    if (custo > 7) modo = 'sem-personagens';
  }
  function laco(ts) {
    requestAnimationFrame(laco);
    if (document.hidden || rolando) { ultimoTs = 0; return; }
    var dt = ultimoTs ? (ts - ultimoTs) / 1000 : 1 / 60; ultimoTs = ts;
    if (dt > .08) { lentos++; if (lentos > 40 && modo === 'normal') modo = 'leve'; if (lentos > 120) modo = 'sem-personagens'; } else if (lentos > 0 && dt < .03) lentos -= .2;
    quadro(Math.min(dt, .05));
  }
  function ligar() {
    if (!document.body) return;
    document.head.appendChild(estilo); document.body.appendChild(cvF); document.body.appendChild(cvT); document.body.appendChild(cvS);
    dimensionar(); proxVisita = CFG.primeira;
    var redim = 0; window.addEventListener('resize', function () { clearTimeout(redim); redim = setTimeout(function () { dimensionar(); agendarMedicao(true); }, 200); });
    window.addEventListener('scroll', function () { if (!rolando) { rolando = true; cvS.style.display = 'none'; cvT.style.display = 'none'; } clearTimeout(fimRolagem); fimRolagem = setTimeout(function () { rolando = false; agendarMedicao(true); }, 220); }, { passive: true, capture: true });
    document.addEventListener('visibilitychange', function () { ultimoTs = 0; if (!document.hidden) agendarMedicao(true); });
    window.addEventListener('hashchange', function () { setTimeout(function () { agendarMedicao(true); }, 400); });
    agendarMedicao(true);
    if (CFG.manual) window.NATAL = { passo: function (ms) { quadro(ms / 1000); }, estado: function () { return { est: P.est, ativ: P.ativ, t: t, modo: modo, custo: custo }; } };
    else requestAnimationFrame(laco);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ligar); else ligar();
})();
