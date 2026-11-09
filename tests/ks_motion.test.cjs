// KineSys Motion: anima somente transições, nunca a primeira renderização,
// não altera texto/valores e respeita o desligamento.
const assert=require('assert');
const fs=require('fs');
const {JSDOM}=require(process.env.JSDOM_MODULE||'jsdom');

const codigo=fs.readFileSync('src/ui/ks_motion-1.0.0.js','utf8');
const css=fs.readFileSync('styles/ks_motion-1.0.0.css','utf8');

function ambiente(html,{off=false}={}){
  const dom=new JSDOM(`<!doctype html><body>${html}</body>`,{url:'https://kinesys.test/',runScripts:'outside-only',pretendToBeVisual:true});
  const w=dom.window;
  if(off)w.localStorage.setItem('ks_motion_off','1');
  w.eval(codigo);
  return w;
}

// 1. Detector: linha de base não anima; transição para o alvo anima uma vez.
{
  const w=ambiente('');
  const d=w.KineSysMotion.criarDetector();
  assert.strictEqual(d.transicao('k','pendente','positivo'),false,'primeira leitura é linha de base');
  assert.strictEqual(d.transicao('k','positivo','positivo'),true,'pendente → positivo anima');
  assert.strictEqual(d.transicao('k','positivo','positivo'),false,'sem mudança não anima de novo');
  assert.strictEqual(d.transicao('novo','positivo','positivo'),false,'item novo já positivo não anima');
}

// 2. Exame: card re-renderizado de pendente → positivo recebe a classe; texto intacto.
{
  const card=st=>`<div class="cluster-card ks-focused-exam ${st}"><select data-regiao="lombar" data-grupo="cluster" data-item="laslett"></select><div class="cluster-veredito">Achados compatíveis com esta ferramenta de investigação; não estabelece diagnóstico.</div></div>`;
  const w=ambiente(`<section id="tela_avaliacao">${card('')}</section>`);
  const tela=w.document.getElementById('tela_avaliacao');
  w.KineSysMotion._varrer.exame(tela);
  assert.ok(!tela.querySelector('.ks-motion-criterio'),'linha de base sem animação');
  tela.innerHTML=card('status-positivo');
  const antes=tela.textContent;
  w.KineSysMotion._varrer.exame(tela);
  assert.ok(tela.querySelector('.cluster-card.ks-motion-criterio'),'transição para positivo anima');
  assert.strictEqual(tela.textContent,antes,'animação não altera texto clínico');
}

// 3. Agenda: agendado → confirmado anima; outro status não.
{
  const comp=st=>`<div class="agenda-celula" title="Paciente Exemplo · Fisioterapia · 10:00–11:00"><div class="agenda-compromisso status-${st}"></div></div>`;
  const w=ambiente(`<section id="tela_agenda">${comp('agendado')}</section>`);
  const tela=w.document.getElementById('tela_agenda');
  w.KineSysMotion._varrer.agenda(tela);
  tela.innerHTML=comp('em_recepcao');
  w.KineSysMotion._varrer.agenda(tela);
  assert.ok(!tela.querySelector('.ks-motion-confirmado'),'status diferente de confirmado não anima');
  tela.innerHTML=comp('confirmado');
  w.KineSysMotion._varrer.agenda(tela);
  assert.ok(tela.querySelector('.agenda-compromisso.ks-motion-confirmado'),'confirmado anima');
}

// 4. Financeiro: pendente → Quitado anima o card; valores não são reescritos.
{
  const plano=(rot,pago)=>`<article class="finance-plan-card ativo"><div class="finance-plan-head">Pacote 10 sessões</div><div class="finance-money-line"><span>Pagamento <b>${rot}</b></span><span>Pago <b>${pago}</b></span></div></article>`;
  const w=ambiente(`<section id="tela_financeiro">${plano('Pagamento pendente','R$ 0,00')}</section>`);
  const tela=w.document.getElementById('tela_financeiro');
  w.KineSysMotion._varrer.financeiro(tela);
  tela.innerHTML=plano('Quitado','R$ 600,00');
  w.KineSysMotion._varrer.financeiro(tela);
  assert.ok(tela.querySelector('.finance-plan-card.ks-motion-quitado'));
  assert.ok(tela.textContent.includes('R$ 600,00'),'valor exibido pelo sistema é preservado');
}

// 5. A classe é removida depois (tempo máximo), mesmo sem animationend.
{
  const w=ambiente('<div id="x"></div>');
  const el=w.document.getElementById('x');
  let agendado=null;
  w.setTimeout=(fn)=>{agendado=fn;return 1;};
  assert.ok(w.KineSysMotion.pulsar(el,'ks-motion-teste'));
  assert.ok(el.classList.contains('ks-motion-teste'));
  agendado();
  assert.ok(!el.classList.contains('ks-motion-teste'),'classe removida pelo tempo máximo');
}

// 6. Gráfico: a prévia da avaliação (recalculada a cada ajuste) nunca é animada.
{
  const w=ambiente('<div id="avaliacao_eva_previa"><svg class="ks-fisio-evolution-chart"><polyline points="0,0 10,10"/></svg></div>');
  const svg=w.document.querySelector('svg');
  w.KineSysMotion._varrer.grafico(svg);
  assert.ok(!svg.classList.contains('ks-motion-desenhar'));
}

// 7. Desligamento: com ks_motion_off o módulo não inicia.
{
  const w=ambiente('',{off:true});
  assert.strictEqual(w.KineSysMotion.desligado(),true);
}

// 7b. "Menos movimento" do sistema operacional não desliga (decisão do produto).
{
  const w=ambiente('');
  w.matchMedia=()=>({matches:true});
  assert.strictEqual(w.KineSysMotion.desligado(),false,'menos movimento do SO não desliga');
}

// 8. CSS: nada nasce escondido; impressão desliga animações.
{
  assert.ok(/@media print\{[\s\S]*animation:none!important/.test(css),'impressão sem animação');
  assert.ok(!/@media\s*\(prefers-reduced-motion/.test(css),'menos movimento do SO não desliga');
  assert.ok(!/^[^@{}]*\{[^}]*opacity:0[^}]*\}/m.test(css.replace(/@keyframes[^{]*\{(?:[^{}]*\{[^}]*\})*[^}]*\}/g,'')),'nenhuma regra fixa opacity:0 fora de keyframes');
  assert.ok(/ksMotionDraw\s*1\.1s[^;]*backwards/.test(css),'linha do gráfico visível por padrão (fill backwards)');
}

console.log('PASS: KineSys Motion anima somente transições, sem alterar conteúdo (9 cenários).');
