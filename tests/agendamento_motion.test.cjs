// Agendamento online: animações são só visuais, carregam depois do fluxo
// e não repetem quando a página atualiza os horários sozinha.
const assert=require('assert');
const fs=require('fs');
const {JSDOM}=require(process.env.JSDOM_MODULE||'jsdom');

const html=fs.readFileSync('agendamento/index.html','utf8');
const codigo=fs.readFileSync('agendamento/agendamento-motion.js','utf8');

// Carrega depois do fluxo de agendamento, com defer.
assert(html.indexOf('agendamento-publico-v2.js')<html.indexOf('agendamento-motion.js'),'motion depois do fluxo');
assert(/<script src="\.\/agendamento-motion\.js\?v=[^"]+" defer><\/script>/.test(html),'motion com defer e versão');
// Nunca toca em reserva, rede ou valores.
assert(!/fetch\(|XMLHttpRequest|\.value\s*=|localStorage|\.disabled\s*=/.test(codigo),'sem rede, valores ou estados de botão');
assert(/try\s*\{/.test(codigo),'erros são engolidos');

(async()=>{
  const corpo=fs.readFileSync('agendamento/index.html','utf8').replace(/<script[\s\S]*?<\/script>/g,'').replace(/<link[^>]*>/g,'');
  const dom=new JSDOM(corpo,{url:'https://kinesys.test/agendamento/?clinica=demo',runScripts:'outside-only',pretendToBeVisual:true});
  const w=dom.window,d=w.document,$=id=>d.getElementById(id);
  const chamadas=[];
  w.Element.prototype.getClientRects=function(){return [{}];};
  w.Element.prototype.animate=function(k,o){chamadas.push({el:this,o});return {};};
  w.eval(codigo);
  if(d.readyState==='loading')d.dispatchEvent(new w.Event('DOMContentLoaded')); // jsdom ainda em "loading"
  const quadro=()=>new Promise(r=>w.setTimeout(r,40));
  // 1C abertura: quando o fluxo aparece.
  $('ks_public_loading').hidden=true;$('ks_public_flow').hidden=false;await quadro();
  assert(chamadas.length>=2,'abertura anima título e fluxo');
  // 2A etapa: avançar desliza para a direita (translateX positivo).
  let n=chamadas.length;
  d.querySelectorAll('[data-step]').forEach(s=>s.hidden=s.dataset.step!=='horario');$('ks_public_app').dataset.bookingStep='horario';await quadro();
  const desl=chamadas.slice(n).find(c=>c.el.dataset&&c.el.dataset.step==='horario');
  assert(desl,'etapa nova anima');
  // 5C calendário: dias livres acendem em verde; atualização igual não repete.
  const desenhar=()=>{$('ks_public_datas').innerHTML='<button class="ks-public-date" data-data="2026-11-12"><strong>12</strong></button><button class="ks-public-date" data-data="2026-11-13"><strong>13</strong></button>';};
  n=chamadas.length;desenhar();await quadro();
  const dias=chamadas.slice(n).filter(c=>c.el.dataset&&c.el.dataset.data);
  assert.strictEqual(dias.length,2,'cada dia livre anima');
  assert(dias[0].o.duration>=1000,'devagar');
  n=chamadas.length;$('ks_public_datas').innerHTML='';await quadro();desenhar();await quadro();
  assert.strictEqual(chamadas.length,n,'atualização automática com o mesmo conteúdo não repete');
  assert.strictEqual($('ks_public_datas').textContent,'1213','texto não muda');
  // 8A confirmação: check desenhado, decorativo.
  n=chamadas.length;$('ks_public_flow').hidden=true;$('ks_public_success').hidden=false;await quadro();
  const check=$('ks_public_success').querySelector('.ks-public-success-check');
  assert(check&&check.getAttribute('aria-hidden')==='true','check decorativo');
  assert(chamadas.length>n,'confirmação anima');
  console.log('PASS: animações do agendamento online são só visuais e não repetem.');
})().catch(e=>{console.error(e);process.exit(1);});
