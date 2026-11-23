/* KineSys — tema de Natal (ks_natal 1.0.0, 23/11/2026)
 * Modelo 4: trenó + Papai Noel de guarda-chuva + guirlanda e enfeites que desviam de botões/textos.
 * Tema de Natal — KineSys / Atende CRM
 * Papai Noel em pixel art que anda pela tela, sobe nos botões, escala guirlandas, enfeita a árvore.
 * Leve: um único <canvas> transparente (pointer-events:none), ~30 qps, pausa com a aba oculta, sem imagens.
 * Liga sozinho de 12/11 a 31/12. Desliga com localStorage natal_off=1. Não aparece na impressão.
 * Config opcional antes de carregar: window.NATAL_CFG = { modelo:1..4, alvos:'button', topo:'header', forcar:false, manual:false, seed:7 }
 */
(function () {
  'use strict';
  if (window.__natalAtivo) return; window.__natalAtivo = true;
  var CFG = Object.assign({ modelo: 4, alvos: 'button', topo: 'body > header', forcar: false, manual: false, seed: 0, escala: 3, neve: null }, window.NATAL_CFG || {});
  function noPeriodo(d) { var m = d.getMonth(), dia = d.getDate(); return (m === 10 && dia >= 12) || m === 11; }
  if (!CFG.forcar && !noPeriodo(new Date())) return;
  try { if (localStorage.getItem('natal_off') === '1') return; } catch (e) { }

  /* ---------------- aleatório (com semente para gravar demos iguais) ---------------- */
  var semente = CFG.seed || (Date.now() % 100000);
  function rnd() { semente |= 0; semente = (semente + 0x6D2B79F5) | 0; var t = Math.imul(semente ^ (semente >>> 15), 1 | semente); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }

  /* ---------------- canvas ---------------- */
  var cv = document.createElement('canvas');
  cv.setAttribute('aria-hidden', 'true'); cv.className = 'natal-camada';
  cv.style.cssText = 'position:fixed;inset:0;width:100vw;height:100vh;pointer-events:none;z-index:2147483000;';
  var st = document.createElement('style'); st.textContent = '@media print{.natal-camada{display:none!important}}';
  var ctx = cv.getContext('2d');
  var W = 0, H = 0, DPR = 1, E = CFG.escala;
  function medir() { DPR = Math.min(window.devicePixelRatio || 1, 2); W = window.innerWidth; H = window.innerHeight; cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR); ctx.setTransform(DPR, 0, 0, DPR, 0, 0); ctx.imageSmoothingEnabled = false; plataformasVelhas = 0; }

  /* ---------------- plataformas = topo dos botões visíveis ---------------- */
  var plats = [], plataformasVelhas = 0;
  function coletar() {
    var lista = [];
    try {
      var els = document.querySelectorAll(CFG.alvos);
      for (var i = 0; i < els.length && lista.length < 60; i++) {
        var el = els[i], r = el.getBoundingClientRect();
        if (r.width < 34 || r.height < 14 || r.top < 70 || r.bottom > H - 4 || r.left < 0 || r.right > W) continue;
        if (!el.offsetParent && getComputedStyle(el).position !== 'fixed') continue;
        lista.push({ el: el, x1: r.left + 4, x2: r.right - 4, y: r.top });
      }
    } catch (e) { }
    plats = lista;
  }
  var obst = [];
  function coletarObst() { // só o teste ponto a ponto (vê apenas o que está visível); a lista de retângulos pegava elementos ocultos
    obst = []; return;
    try {
      var els = document.querySelectorAll('button, a, input, select, textarea, label, [role="button"], [tabindex], h1, h2');
      for (var i = 0; i < els.length && obst.length < 160; i++) { var r = els[i].getBoundingClientRect(); if (r.width < 2 || r.height < 2 || r.top > 200 || r.bottom < 0) continue; obst.push([r.left - 6, r.top - 6, r.right + 6, r.bottom + 6]); }
    } catch (e) { }
  }
  var CLIC = 'button,a,input,select,textarea,label,img,svg,[role="button"],[tabindex]';
  function ocupado(x, y) { // há algo visível/clicável neste ponto? (o canvas não conta: pointer-events none)
    if (x < 0 || y < 0 || x >= W || y >= H) return false;
    var el = document.elementFromPoint(x, y); if (!el || el === document.body || el === document.documentElement) return false;
    if (el.closest && el.closest(CLIC)) return true;
    for (var n = el.firstChild; n; n = n.nextSibling) if (n.nodeType === 3 && n.textContent.trim()) return true;
    return false;
  }
  function livre(x1, y1, x2, y2) {
    for (var i = 0; i < obst.length; i++) { var o = obst[i]; if (x1 < o[2] && x2 > o[0] && y1 < o[3] && y2 > o[1]) return false; }
    for (var yy = y1; yy <= y2; yy += Math.max(4, (y2 - y1) / 4)) for (var xx = x1; xx <= x2; xx += Math.max(4, (x2 - x1) / 3)) if (ocupado(xx, yy)) return false;
    return true;
  }
  function chao() { return { el: null, x1: -40, x2: W + 40, y: H }; }

  /* ---------------- cenário ---------------- */
  var t = 0; // segundos
  function topoY() { if (M === 4) return GY4(); if (CFG.topo) { var el = document.querySelector(CFG.topo); if (el) { var r = el.getBoundingClientRect(); return Math.max(6, Math.min(r.bottom - 4, 120)); } } return 10; }
  var GY = 10, GY4cache = null, GY4t = -99;
  function GY4() { // modelo 4: escolhe a altura (borda de cima ou base do cabeçalho) com mais espaço livre
    if (GY4cache !== null && t - GY4t < 5) return GY4cache;
    var cands = [4]; if (CFG.topo) { var el = document.querySelector(CFG.topo); if (el) { var r = el.getBoundingClientRect(); if (r.bottom > 20 && r.bottom < 160) cands.push(Math.round(r.bottom) - 2); } }
    var melhor = cands[0], mv = -1;
    cands.forEach(function (c) { var n = 0; for (var x = 14; x < W; x += 27) { var ok = true; for (var y = c + 2; y <= c + 24; y += 7) if (ocupado(x, y) || ocupado(x - 5, y) || ocupado(x + 5, y)) { ok = false; break; } if (ok) n++; } if (n > mv) { mv = n; melhor = c; } });
    GY4cache = melhor; GY4t = t; return melhor;
  }
  function guirlandaY(x) { var vao = 190, f = ((x % vao) + vao) % vao / vao; return GY + Math.sin(f * Math.PI) * (M === 4 ? 9 : 16); }
  var LUZES = ['#ff3b3b', '#ffd23f', '#3bd16f', '#3ba7ff', '#ff7bd5'];
  var ENF = [], LIVRES = [], CANTOS = [true, true]; // [x, comprimento, tipo, cor, fase]
  function montarEnfeites() {
    LIVRES = []; for (var kk = 0, xb = 14; xb < W; xb += 27, kk++) { var yb = guirlandaY(xb); LIVRES[kk] = livre(xb - 6, yb, xb + 6, yb + 16); }
    CANTOS = [livre(2, GY - 6, 44, GY + 30), livre(W - 44, GY - 6, W - 2, GY + 30)];
    ENF = []; var tipos = ['bola', 'bola', 'estrela', 'bengala', 'bola', 'sino'], cores = ['#d0152f', '#2f6fd6', '#f2c230', '#2c9a4d', '#8e3fd1', '#ffffff'];
    for (var x = 40, k = 0; x < W - 30; x += 41, k++) {
      var L = 16 + ((k * 37) % 5) * 9, tp = tipos[k % tipos.length], y0 = guirlandaY(x), tam = tp === 'bengala' ? 16 : 11;
      if (!livre(x - tam, y0 + 2, x + tam, y0 + L + tam * 2 + 4)) { L = 8; if (!livre(x - tam, y0 + 2, x + tam, y0 + L + tam * 2 + 4)) continue; }
      ENF.push([x, L, tp, cores[k % cores.length], k * 1.7]);
    }
  }
  function desenharEnfeites() {
    ENF.forEach(function (e) {
      var x = e[0], y0 = guirlandaY(x) + 3, L = e[1], ang = Math.sin(t * 1.6 + e[4]) * .12, ex = x + Math.sin(ang) * L, ey = y0 + Math.cos(ang) * L;
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
  function desenharGuirlanda(lateral) {
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#1b6b34'; ctx.lineWidth = 7; ctx.beginPath();
    for (var x = 0; x <= W; x += 6) { var y = guirlandaY(x); if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y); } ctx.stroke();
    ctx.strokeStyle = '#2fa352'; ctx.lineWidth = 2; ctx.setLineDash([3, 4]); ctx.stroke(); ctx.setLineDash([]);
    for (var k = 0, x2 = 14; x2 < W; x2 += 27, k++) { if (M === 4 && LIVRES[k] === false) continue; var on = (Math.floor(t * 2.2) + k) % 3 !== 0; lampada(x2, guirlandaY(x2) + 5, LUZES[k % 5], on); }
    for (var p = 0; p <= W; p += 190) lacoFita(p, GY);
    if (lateral) [12, W - 12].forEach(function (xl) {
      ctx.strokeStyle = '#1b6b34'; ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(xl, GY); ctx.lineTo(xl, H); ctx.stroke();
      ctx.strokeStyle = '#2fa352'; ctx.lineWidth = 2; ctx.beginPath();
      for (var yy = GY; yy < H; yy += 4) { var xx = xl + Math.sin(yy / 9) * 4; if (yy === GY) ctx.moveTo(xx, yy); else ctx.lineTo(xx, yy); } ctx.stroke();
      for (var j = 0, yy2 = GY + 30; yy2 < H - 10; yy2 += 34, j++) lampada(xl + (j % 2 ? 5 : -5), yy2, LUZES[(j + 2) % 5], (Math.floor(t * 2.2) + j) % 3 !== 0);
    });
  }
  function lampada(x, y, cor, on) {
    ctx.fillStyle = '#555'; ctx.fillRect(Math.round(x) - 2, Math.round(y) - 3, 4, 3);
    if (on) { ctx.globalAlpha = .28; ctx.fillStyle = cor; ctx.beginPath(); ctx.arc(x, y + 4, 8, 0, 6.29); ctx.fill(); ctx.globalAlpha = 1; }
    ctx.fillStyle = on ? cor : '#6d6d6d'; ctx.beginPath(); ctx.ellipse(x, y + 4, 3.2, 4.5, 0, 0, 6.29); ctx.fill();
  }
  function lacoFita(x, y) { ctx.fillStyle = '#d0142c'; ctx.fillRect(x - 7, y - 4, 6, 6); ctx.fillRect(x + 1, y - 4, 6, 6); ctx.fillRect(x - 2, y - 2, 4, 4); ctx.fillRect(x - 4, y + 2, 3, 8); ctx.fillRect(x + 1, y + 2, 3, 8); }

  var flocos = [];
  function neve(n) { flocos = []; for (var i = 0; i < n; i++) flocos.push({ x: rnd() * W, y: rnd() * H, v: 14 + rnd() * 22, r: 1 + rnd() * 1.8, f: rnd() * 6 }); }
  function desenharNeve(dt) { ctx.fillStyle = 'rgba(255,255,255,.9)'; flocos.forEach(function (f) { f.y += f.v * dt; f.x += Math.sin(t + f.f) * 8 * dt; if (f.y > H) { f.y = -4; f.x = rnd() * W; } ctx.beginPath(); ctx.arc(f.x, f.y, f.r, 0, 6.29); ctx.fill(); }); }

  /* ---------------- arte v2: desenho animado com contorno (vetor no canvas) ---------------- */
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
    var A = { pf: 0, pt: 0, bf: .15, bt: -.15, bob: 0, olho: 1 }, s = Math.sin(f);
    if (est === 'andar') { A.pf = s * .55; A.pt = -s * .55; A.bf = -s * .6; A.bt = s * .6; A.bob = Math.abs(Math.cos(f)) * 2.2; }
    else if (est === 'acena') { A.bf = 2.35 + Math.sin(f * 2.2) * .3; A.bt = .2; }
    else if (est === 'pulo' || est === 'cai') { A.pf = .7; A.pt = -.35; A.bf = 2.4; A.bt = 2.2; }
    else if (est === 'sobe' || est === 'pendura' || est === 'arvore') { A.bf = 2.75 + s * .22; A.bt = 2.95 - s * .22; A.pf = .35 + s * .45; A.pt = .35 - s * .45; }
    else if (est === 'paraquedas') { A.bf = 2.95; A.bt = -.25; A.pf = .25; A.pt = -.2; }
    if ((t % 3.7) < .12) A.olho = 0; // pisca
    return A;
  }
  function noelVetor(x, y, dir, est, f, saco) {
    var A = poseDe(est, f);
    ctx.save(); ctx.translate(Math.round(x), Math.round(y - A.bob)); ctx.scale(dir * ESC, ESC); ctx.lineJoin = 'round';
    perna(-4, -21, A.pt, '#a50d24');
    braco(-6, -45, A.bt, '#a50d24');
    if (saco) { oval(-18, -41, 11, 13, '#a0703f'); ctx.fillStyle = '#7d5530'; ctx.beginPath(); ctx.ellipse(-21, -38, 3.5, 4, .3, 0, 6.2832); ctx.fill(); capsula(-15, -54, -11, -51, 2.2, '#c9a06a'); ctx.fillStyle = '#c99358'; ctx.beginPath(); ctx.arc(-22, -46, 3, 0, 6.2832); ctx.fill(); }
    // corpo (barriga redonda com brilho)
    var gr = ctx.createRadialGradient(-6, -44, 3, 0, -35, 21); gr.addColorStop(0, '#ef4c5a'); gr.addColorStop(.55, '#cf1530'); gr.addColorStop(1, '#93091f');
    ctx.beginPath(); ctx.ellipse(0, -35, 18.5, 17.5, 0, 0, 6.2832); ctx.fillStyle = gr; ctx.fill(); ctx.strokeStyle = CONT; ctx.lineWidth = 2; ctx.stroke();
    ctx.save(); ctx.beginPath(); ctx.ellipse(0, -35, 17.5, 16.6, 0, 0, 6.2832); ctx.clip();
    ctx.fillStyle = '#ffffff'; ctx.fillRect(4, -53, 6.5, 32); ctx.fillStyle = '#dfe5ec'; ctx.fillRect(8.5, -53, 2, 32);
    ctx.fillStyle = '#1c1c20'; ctx.fillRect(-20, -36.5, 40, 6.5); ctx.fillStyle = '#3a3a42'; ctx.fillRect(-20, -36.5, 40, 1.4); ctx.restore();
    ctx.lineWidth = 2.2; ctx.strokeStyle = '#f2c230'; ctx.strokeRect(3.5, -38, 8.5, 9.5); ctx.strokeStyle = '#a87d12'; ctx.lineWidth = .8; ctx.strokeRect(5.5, -36, 4.5, 5.5);
    nuvem([[-14, -21, 4.6], [-8, -20, 4.8], [-2, -19.6, 4.8], [4, -19.6, 4.8], [10, -20, 4.8], [15, -21, 4.4]], '#ffffff', '#dfe5ec'); // barra do casaco
    perna(5, -21, A.pf, '#c8102e');
    // cabeça (maior, rosto à mostra)
    oval(-6, -60, 3.2, 4.2, '#e9b08c'); bola(5, -60, 12.5, '#f6caa5');
    nuvem([[7, -51, 7.2], [0, -52, 5.6], [13.5, -52, 5.4], [5, -46, 6.2], [11.5, -46.5, 5], [1, -42.5, 4.2], [8, -41.5, 3.8]], '#ffffff', '#e4e9ef'); // barba
    nuvem([[11, -55.5, 3.9], [15.6, -56, 3.2]], '#ffffff'); // bigode
    oval(8.8, -58.8, 3.2, 2.4, 'rgba(255,120,120,.7)', true); // bochecha
    bola(16.2, -59.2, 3.3, '#e8645c'); ctx.fillStyle = '#ffb3ad'; ctx.beginPath(); ctx.arc(15.3, -60.2, 1, 0, 6.2832); ctx.fill(); // nariz
    if (A.olho) { oval(11, -63, 1.9, 2.8, '#2b1b14', true); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(11.6, -64.1, .8, 0, 6.2832); ctx.fill(); } else { ctx.strokeStyle = '#2b1b14'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(9.2, -62.6); ctx.lineTo(12.8, -62.6); ctx.stroke(); }
    nuvem([[9.4, -67.4, 2.2], [12.6, -67.7, 2]], '#ffffff'); // sobrancelha
    // gorro caído para trás com pompom
    var gh = ctx.createLinearGradient(-14, -104, 14, -74); gh.addColorStop(0, '#93091f'); gh.addColorStop(.6, '#d0152f'); gh.addColorStop(1, '#e83b4b');
    ctx.beginPath(); ctx.moveTo(-9, -74); ctx.quadraticCurveTo(-6, -88, -15.5, -88.5); ctx.quadraticCurveTo(4, -106, 18, -74); ctx.closePath(); ctx.fillStyle = gh; ctx.fill(); ctx.strokeStyle = CONT; ctx.lineWidth = 2; ctx.stroke();
    nuvem([[-9.5, -74.5, 3.6], [-4, -75.3, 3.8], [2, -75.7, 3.8], [8, -75.7, 3.8], [13.6, -75.1, 3.6], [17.6, -74.2, 3]], '#ffffff', '#e1e6ec'); // aba de pelo
    nuvem([[-17, -88, 5.4]], '#ffffff', '#e1e6ec'); // pompom
    braco(A.bf > 1.5 ? 15 : 6, -45, A.bf, '#c8102e');
    ctx.restore();
  }
  function maoNoel() { return { dy: 66 * ESC }; } // da sola até as mãos levantadas

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
  var ARV = { x: 0, estrela: 0, presentes: 0 };
  var ARV_BOLAS = [[-20, -62, '#d0152f'], [22, -70, '#2f6fd6'], [-6, -88, '#f2c230'], [14, -104, '#d0152f'], [-16, -112, '#8e3fd1'], [4, -132, '#2f6fd6'], [-30, -50, '#f2c230'], [32, -48, '#8e3fd1'], [0, -60, '#ffffff'], [26, -92, '#f2c230']];
  var ARV_LUZ = [[-34, -54], [-20, -58], [-6, -60], [8, -60], [22, -56], [36, -52], [-26, -92], [-12, -96], [2, -98], [16, -96], [28, -90], [-16, -128], [-4, -130], [8, -128], [18, -124]];
  function camada(cx, topo, base, hw, c1, c2) {
    var g = ctx.createLinearGradient(cx - hw, 0, cx + hw, 0); g.addColorStop(0, c2); g.addColorStop(.45, c1); g.addColorStop(1, c2);
    ctx.beginPath(); ctx.moveTo(cx, topo); ctx.quadraticCurveTo(cx + hw * .45, topo + (base - topo) * .55, cx + hw, base);
    var n = 5; for (var i = 0; i < n; i++) { var x1 = cx + hw - (2 * hw) * (i / n), x2 = cx + hw - (2 * hw) * ((i + 1) / n); ctx.quadraticCurveTo((x1 + x2) / 2, base + 9, x2, base); }
    ctx.quadraticCurveTo(cx - hw * .45, topo + (base - topo) * .55, cx, topo); ctx.closePath();
    ctx.fillStyle = g; ctx.fill(); ctx.strokeStyle = '#0c3a1c'; ctx.lineWidth = 2.2; ctx.stroke();
  }
  function desenharArvore() {
    var cx = ARV.x, b = H; ctx.save(); ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.roundRect(cx - 9, b - 34, 18, 34, 3); ctx.fillStyle = '#7a4a26'; ctx.fill(); ctx.strokeStyle = CONT; ctx.lineWidth = 2; ctx.stroke();
    ctx.beginPath(); ctx.roundRect(cx - 20, b - 12, 40, 12, 3); ctx.fillStyle = '#b0172f'; ctx.fill(); ctx.stroke(); ctx.fillStyle = '#f2c230'; ctx.fillRect(cx - 20, b - 8, 40, 3);
    ctx.translate(cx, b);
    camada(0, -112, -36, 48, '#2c9a4d', '#17643a'); camada(0, -142, -72, 38, '#33a857', '#1a6e3f'); camada(0, -172, -108, 27, '#3ab460', '#1d7543');
    ctx.strokeStyle = '#f2c230'; ctx.lineWidth = 2.4; [[-40, -46, 40, -66], [-30, -84, 30, -100], [-20, -120, 20, -134]].forEach(function (f) { ctx.beginPath(); ctx.moveTo(f[0], f[1]); ctx.quadraticCurveTo(0, (f[1] + f[3]) / 2 + 10, f[2], f[3]); ctx.stroke(); });
    ARV_BOLAS.forEach(function (o) { bola(o[0], o[1], 4.6, o[2]); ctx.fillStyle = 'rgba(255,255,255,.75)'; ctx.beginPath(); ctx.arc(o[0] - 1.5, o[1] - 1.6, 1.4, 0, 6.2832); ctx.fill(); });
    ARV_LUZ.forEach(function (p, i) { var on = (Math.floor(t * 2.3) + i) % 3 !== 0, c = LUZES[i % 5]; if (on) { ctx.globalAlpha = .3; ctx.fillStyle = c; ctx.beginPath(); ctx.arc(p[0], p[1], 6, 0, 6.2832); ctx.fill(); ctx.globalAlpha = 1; } ctx.fillStyle = on ? c : '#1c4a2c'; ctx.beginPath(); ctx.ellipse(p[0], p[1], 2.2, 3, 0, 0, 6.2832); ctx.fill(); });
    ctx.restore();
    if (ARV.estrela > 0) estrela(cx, b - 172, ARV.estrela);
    for (var g2 = 0; g2 < ARV.presentes; g2++) presente(cx - 66 - g2 * 34 + (g2 % 2) * 8, H, g2);
  }
  function estrela(x, y, a) {
    var br = .75 + .25 * Math.sin(t * 6), k = Math.min(a, 1); ctx.save(); ctx.translate(x, y); ctx.scale(k, k);
    ctx.fillStyle = 'rgba(255,214,70,' + (.3 * br) + ')'; ctx.beginPath(); ctx.arc(0, 0, 22, 0, 6.2832); ctx.fill();
    ctx.beginPath(); for (var i = 0; i < 10; i++) { var an = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? 6 : 14; ctx.lineTo(Math.cos(an) * rr, Math.sin(an) * rr); } ctx.closePath();
    ctx.fillStyle = '#ffd23f'; ctx.fill(); ctx.strokeStyle = '#a87d12'; ctx.lineWidth = 1.8; ctx.stroke(); ctx.fillStyle = '#fff3b0'; ctx.beginPath(); ctx.arc(-2, -3, 2.4, 0, 6.2832); ctx.fill(); ctx.restore();
  }
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

  /* ---------------- Papai Noel ---------------- */
  var P = { x: 0, y: 0, dir: 1, est: 'andar', plat: null, vx: 0, vy: 0, alvo: null, tempo: 0, quadro: 0, saco: true, fila: [] };
  var G = 1100, VEL = 62;
  function noChao() { P.plat = chao(); P.y = H; }
  function emPlat() { return P.plat; }
  function pousar(dtY0, y1) {
    var cands = plats.concat([chao()]), melhor = null;
    cands.forEach(function (p) { if (P.x >= p.x1 && P.x <= p.x2 && dtY0 <= p.y + 1 && y1 >= p.y - 1) if (!melhor || p.y < melhor.y) melhor = p; });
    return melhor;
  }
  function pular(p) { // pulo balístico até a plataforma p
    var tx = Math.max(p.x1 + 14, Math.min(p.x2 - 14, P.x + (rnd() - .5) * 80)), dy = p.y - P.y, T = .55 + Math.min(.45, Math.abs(tx - P.x) / 700);
    P.vx = (tx - P.x) / T; P.vy = (dy - .5 * G * T * T) / T; P.dir = P.vx >= 0 ? 1 : -1; P.est = 'pulo'; P.alvo = p; P.plat = null;
  }
  function escolherPulo() {
    var ops = plats.filter(function (p) { var dy = P.y - p.y, dx = Math.min(Math.abs(p.x1 - P.x), Math.abs(p.x2 - P.x)); return p !== P.plat && dy > -60 && dy < 300 && Math.abs(dy) > 12 && (P.x >= p.x1 && P.x <= p.x2 || dx < 300); });
    if (!ops.length) return false; pular(ops[Math.floor(rnd() * ops.length)]); return true;
  }
  function atualizarPlat() { if (P.plat && P.plat.el) { var r = P.plat.el.getBoundingClientRect(); if (!P.plat.el.isConnected || r.width < 30 || Math.abs(r.top - P.plat.y) > 2) { P.est = 'cai'; P.vx = 0; P.vy = 0; P.plat = null; } } }

  function passoPadrao(dt) { // anda, pula em botões, cai, acena
    var p = P.plat;
    if (P.est === 'andar') {
      P.x += P.dir * VEL * dt; P.quadro += dt * 9;
      if (p && !p.el && (P.x < 30 || P.x > W - 30)) { P.dir *= -1; P.x = Math.max(30, Math.min(W - 30, P.x)); }
      if (p && p.el && (P.x < p.x1 || P.x > p.x2)) { if (rnd() < .3) { P.dir *= -1; P.x = Math.max(p.x1, Math.min(p.x2, P.x)); } else { P.est = 'cai'; P.vx = P.dir * 70; P.vy = -120; P.plat = null; } }
      P.tempo -= dt;
      if (P.tempo <= 0) { P.tempo = 1.1 + rnd() * 1.8; var r = rnd(); if (r < .6) escolherPulo(); else if (r < .78) { P.est = 'acena'; P.tempo = 1.6; } else if (r < .86) P.dir *= -1; }
    } else if (P.est === 'acena') { P.quadro += dt * 3; P.tempo -= dt; if (P.tempo <= 0) { P.est = 'andar'; P.tempo = 1 + rnd() * 2; } }
    else if (P.est === 'pulo' || P.est === 'cai') {
      var y0 = P.y; P.vy += G * dt; P.x += P.vx * dt; P.y += P.vy * dt;
      if (P.vy > 0) { var q = pousar(y0, P.y); if (q) { P.y = q.y; P.plat = q; P.est = 'andar'; P.vx = 0; P.tempo = 1 + rnd() * 2; } }
      if (P.y > H + 200) { P.x = W / 2; noChao(); P.est = 'andar'; }
    }
  }
  function desenharNoel() {
    if (P.est === 'paraquedas') guardaChuva(P.x, P.y);
    noelVetor(P.x, P.y, P.dir < 0 ? -1 : 1, P.est, P.quadro, P.saco && (P.est === 'andar' || P.est === 'acena'));
  }

  /* ---------------- modelos ---------------- */
  var M = CFG.modelo, fase = 'livre', faseT = 0;
  function iniciar() {
    GY = topoY(); coletar();
    if (CFG.neve === null) CFG.neve = (M === 1 || M === 3) ? 28 : M === 4 ? 22 : 12; neve(CFG.neve);
    noChao(); P.x = M === 2 ? 60 : M === 3 ? W * .35 : W * .45; P.dir = 1; P.tempo = 1.2;
    if (M === 3) { ARV.x = W - 110; fase = 'paraArvore'; }
    if (M === 2) fase = 'paraBorda';
    if (M === 4) { P.est = 'fora'; TR.ativo = true; TR.x = -260; TR.prox = 0; coletarObst(); montarEnfeites(); TR.y = 96; }
  }
  function passoModelo(dt) {
    faseT += dt;
    if (M === 2) { // guirlanda: sobe pela lateral, atravessa pendurado, desce do outro lado
      if (fase === 'paraBorda') { if (P.est === 'andar' && P.plat && !P.plat.el) { P.dir = -1; P.x += -VEL * dt; P.quadro += dt * 9; if (P.x <= 26) { P.x = 18; fase = 'sobe'; P.est = 'sobe'; } } else passoPadrao(dt); return; }
      if (fase === 'sobe') { P.y -= 58 * dt; P.quadro += dt * 6; var alvoY = GY + maoNoel().dy; if (P.y <= alvoY) { P.y = alvoY; fase = 'pendura'; P.est = 'pendura'; P.dir = 1; } return; }
      if (fase === 'pendura') { P.x += 48 * dt; P.y = guirlandaY(P.x) + maoNoel().dy; P.quadro += dt * 5; if (P.x >= W - 18) { P.x = W - 18; fase = 'desce'; P.est = 'sobe'; } return; }
      if (fase === 'desce') { P.y += 80 * dt; P.quadro += dt * 6; if (P.y >= H) { noChao(); P.est = 'andar'; P.dir = -1; fase = 'livre'; faseT = 0; P.tempo = .6; } return; }
      passoPadrao(dt); if (faseT > 16 && P.est === 'andar' && P.plat && !P.plat.el) fase = 'paraBorda';
      return;
    }
    if (M === 3) { // árvore: vai até a árvore, sobe, põe a estrela, desce, deixa presente
      var base = ARV.x;
      if (fase === 'paraArvore') { if (P.est === 'andar' && P.plat && !P.plat.el) { P.dir = base > P.x ? 1 : -1; P.x += P.dir * VEL * dt; P.quadro += dt * 9; if (Math.abs(P.x - base) < 4) { fase = 'sobe'; P.est = 'arvore'; } } else passoPadrao(dt); return; }
      if (fase === 'sobe') { P.y -= 44 * dt; P.quadro += dt * 6; P.x = base + Math.sin(P.y / 14) * 6; if (P.y <= H - 112) { fase = 'estrela'; faseT = 0; } return; }
      if (fase === 'estrela') { ARV.estrela = Math.min(1.25, faseT * 1.4); P.est = 'acena'; if (faseT > 1.6) { ARV.estrela = 1; fase = 'desce'; P.est = 'arvore'; } return; }
      if (fase === 'desce') { P.y += 70 * dt; P.quadro += dt * 6; P.x = base + Math.sin(P.y / 14) * 6; if (P.y >= H) { noChao(); P.x = base - 40; P.dir = -1; P.est = 'acena'; P.tempo = 1; ARV.presentes = Math.min(5, ARV.presentes + 1); P.saco = ARV.presentes < 5; fase = 'livre'; faseT = 0; } return; }
      passoPadrao(dt); if (faseT > 18 && P.est === 'andar' && P.plat && !P.plat.el) { fase = 'paraArvore'; if (ARV.presentes >= 5) { ARV.presentes = 0; ARV.estrela = 0; P.saco = true; } }
      return;
    }
    if (M === 4) { // trenó: passa no céu, solta o Noel de guarda-chuva num botão
      if (TR.ativo) { TR.x += TR.v * dt; if (P.est === 'fora' && TR.x > W * .3) { var bs = plats.filter(function (p) { return p.x2 > TR.x - 40; }); P.alvo = bs.length ? bs[Math.floor(rnd() * bs.length)] : null; P.x = TR.x + 20; P.y = TR.y + 6; P.est = 'paraquedas'; P.dir = 1; } if (TR.x > W + 340) { TR.ativo = false; TR.prox = 14 + rnd() * 8; } }
      else { TR.prox -= dt; if (TR.prox <= 0 && P.est === 'fora') { TR.ativo = true; TR.x = -260; TR.y = 92 + rnd() * 34; } }
      if (P.est === 'paraquedas') { var y0 = P.y; P.y += 70 * dt; if (P.alvo) P.x += Math.max(-40, Math.min(40, ((P.alvo.x1 + P.alvo.x2) / 2 - P.x))) * dt; P.x += Math.sin(t * 2) * 10 * dt; var q = pousar(y0, P.y); if (q) { P.y = q.y; P.plat = q; P.est = 'acena'; P.tempo = 1.2; faseT = 0; } return; }
      if (P.est === 'fora') return;
      if (faseT > 20 && P.est === 'andar' && P.plat && !P.plat.el) { P.dir = P.x < W / 2 ? -1 : 1; P.x += P.dir * VEL * 1.4 * dt; P.quadro += dt * 11; if (P.x < -40 || P.x > W + 40) { P.est = 'fora'; } return; }
      passoPadrao(dt); return;
    }
    passoPadrao(dt); // modelo 1
  }

  /* ---------------- laço ---------------- */
  var ultimo = 0, acum = 0, recolher = 0;
  function quadro(dt) {
    t += dt; recolher -= dt; if (recolher <= 0) { recolher = 1.2; coletar(); GY = topoY(); if (M === 4) { coletarObst(); montarEnfeites(); } }
    atualizarPlat(); passoModelo(dt);
    ctx.clearRect(0, 0, W, H);
    if (flocos.length) desenharNeve(dt);
    if (M === 2) desenharGuirlanda(true); else desenharGuirlanda(false);
    if (M === 4) { desenharEnfeites(); if (CANTOS[0]) lacoCanto(16, GY + 4, false); if (CANTOS[1]) lacoCanto(W - 16, GY + 4, true); }
    if (M === 3) desenharArvore();
    if (M === 4 && TR.ativo) desenharTreno();
    if (P.est !== 'fora') desenharNoel();
  }
  function laco(ts) {
    if (!document.hidden) { var dt = ultimo ? Math.min(.05, (ts - ultimo) / 1000) : 0; acum += dt; if (acum >= 1 / 30) { quadro(acum); acum = 0; } }
    ultimo = ts; requestAnimationFrame(laco);
  }
  function ligar() {
    document.head.appendChild(st); document.body.appendChild(cv); medir(); iniciar();
    window.addEventListener('resize', function () { medir(); GY = topoY(); if (P.plat && !P.plat.el) P.y = H; });
    document.addEventListener('visibilitychange', function () { ultimo = 0; });
    if (CFG.manual) window.NATAL = { passo: function (ms) { quadro(ms / 1000); }, pose: function (x, y, dir, est, f, saco, esc) { var e0 = ESC; ESC = esc || ESC; noelVetor(x, y, dir, est, f, saco); ESC = e0; }, limpar: function () { ctx.clearRect(0, 0, W, H); } };
    else requestAnimationFrame(laco);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ligar); else ligar();
})();
