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

// 9. Panorama do administrador: valor conta de 0 numa camada visual; o texto real não muda.
{
  const html=`<section id="tela_home"><section id="ks_admin_home"><div class="ks-admin-metrics"><div><strong id="ks_admin_received">—</strong></div><div><strong id="ks_admin_receivable">—</strong></div></div><canvas id="ks_admin_chart"></canvas><strong id="ks_admin_attended">—</strong></section></section>`;
  const w=ambiente(html);
  const quadros=[];const timers=[];
  w.requestAnimationFrame=(fn)=>{quadros.push(fn);return quadros.length;};
  w.setTimeout=(fn)=>{timers.push(fn);return timers.length;};
  const tela=w.document.getElementById('tela_home');
  const rec=w.document.getElementById('ks_admin_received');
  w.KineSysMotion._varrer.painelAdmin(tela,false);
  assert.ok(!rec.classList.contains('ks-motion-contando'),'"—" não conta');
  rec.textContent='R$ 12.345,5';
  w.document.getElementById('ks_admin_attended').textContent='37';
  w.KineSysMotion._varrer.painelAdmin(tela,false);
  assert.ok(rec.classList.contains('ks-motion-contando'),'valor real passa a contar');
  assert.strictEqual(rec.getAttribute('data-ks-motion-valor'),'R$ 0','contagem começa em zero, com o mesmo formato');
  assert.strictEqual(rec.textContent,'R$ 12.345,5','texto real do sistema intacto');
  assert.ok(w.document.getElementById('ks_admin_attended').classList.contains('ks-motion-contando'),'atendimentos também contam');
  assert.ok(w.document.getElementById('ks_admin_chart').classList.contains('ks-motion-revelar'),'gráfico do fluxo é revelado');
  // Sem mudança, não conta de novo.
  timers.splice(0).forEach(f=>f());
  assert.ok(!rec.classList.contains('ks-motion-contando'),'camada removida no tempo máximo');
  assert.strictEqual(rec.hasAttribute('data-ks-motion-valor'),false);
  w.KineSysMotion._varrer.painelAdmin(tela,false);
  assert.ok(!rec.classList.contains('ks-motion-contando'),'mesmo valor não reconta');
  // Reentrada no Início (forçar) conta de novo.
  w.KineSysMotion._varrer.painelAdmin(tela,true);
  assert.ok(rec.classList.contains('ks-motion-contando'),'reentrada reconta');
  // "Ocultar valores" no meio da contagem: a camada sai na hora.
  rec.textContent='••••';
  quadros.splice(0).forEach(f=>f());
  assert.ok(!rec.classList.contains('ks-motion-contando'),'valores ocultos encerram a contagem');
  w.KineSysMotion._varrer.painelAdmin(tela,false);
  assert.ok(!rec.classList.contains('ks-motion-contando'),'"••••" não conta');
}

// 10. Relatório financeiro: conta ao abrir a aba; zero não conta.
{
  const html=`<section id="tela_financeiro"><div id="financeiro_painel_balanco" hidden><strong id="fin_bal_receita">R$ 4.200,00</strong><strong id="fin_bal_faltas">0</strong><strong id="fin_bal_resultado">-R$ 150,00</strong></div></section>`;
  const w=ambiente(html);
  w.requestAnimationFrame=()=>1;w.setTimeout=()=>1;
  const tela=w.document.getElementById('tela_financeiro');
  w.KineSysMotion._varrer.balanco(tela);
  const rec=w.document.getElementById('fin_bal_receita');
  assert.ok(!rec.classList.contains('ks-motion-contando'),'aba fechada não conta');
  w.document.getElementById('financeiro_painel_balanco').hidden=false;
  w.KineSysMotion._varrer.balanco(tela);
  assert.ok(rec.classList.contains('ks-motion-contando'),'abrir a aba conta');
  assert.ok(!w.document.getElementById('fin_bal_faltas').classList.contains('ks-motion-contando'),'zero não conta');
  assert.strictEqual(w.document.getElementById('fin_bal_resultado').getAttribute('data-ks-motion-valor'),'-R$ 0','sinal negativo preservado');
}

// 11. CSS: contagem some na impressão.
{
  assert.ok(/@media print\{[\s\S]*\.ks-motion-contando::after\{content:none!important\}/.test(css),'impressão mostra o valor real');
}

// Agenda real: grade #agenda_semana_grade com data-dias/data-periodo e cartões .agenda-celula[title] > .agenda-compromisso.
function gradeAgenda(dias,periodo,itens){
  return `<div id="agenda_semana_grade" data-dias="${dias}" data-periodo="${periodo}">${itens.map(([nome,hora,st])=>`<div class="agenda-celula agendado" title="${nome} · Fisioterapia · ${hora}–${hora.replace(/^(\d\d)/,h=>String(+h+1).padStart(2,'0'))}"><div class="agenda-compromisso status-${st}"><div class="paciente"><span class="agenda-paciente-nome">${nome}</span></div></div></div>`).join('')}</div>`;
}
const SEMANA='2026-11-09,2026-11-10,2026-11-11,2026-11-12,2026-11-13';
const SEMANA2='2026-11-16,2026-11-17,2026-11-18,2026-11-19,2026-11-20';

// 12. Paciente chegou: status → em_recepcao acende o cartão e mostra o aviso (uma vez).
{
  const w=ambiente('<section id="tela_agenda"></section>');
  w.setTimeout=()=>1;
  const tela=w.document.getElementById('tela_agenda');
  tela.innerHTML=gradeAgenda(SEMANA,'semana',[['Paciente C','11:00','confirmado'],['Paciente D','12:00','agendado']]);
  w.KineSysMotion._varrer.agenda(tela);
  assert.ok(!w.document.getElementById('ks_motion_aviso_chegada'),'linha de base sem aviso');
  tela.innerHTML=gradeAgenda(SEMANA,'semana',[['Paciente C','11:00','em_recepcao'],['Paciente D','12:00','agendado']]);
  const texto=tela.textContent;
  w.KineSysMotion._varrer.agenda(tela);
  assert.ok(tela.querySelector('.agenda-compromisso.ks-motion-chegou'),'cartão acende');
  const aviso=w.document.getElementById('ks_motion_aviso_chegada');
  assert.ok(aviso,'aviso aparece');
  assert.strictEqual(aviso.querySelector('strong').textContent,'Paciente C chegou');
  assert.ok(aviso.querySelector('small').textContent.includes('11:00'),'aviso traz o horário');
  assert.strictEqual(aviso.getAttribute('role'),'status');
  assert.strictEqual(tela.textContent,texto,'grade da agenda intacta');
  assert.ok(!tela.querySelector('.ks-motion-novo'),'mudança de status não é "novo agendamento"');
  // Re-renderização igual não repete o aviso.
  aviso.remove();
  tela.innerHTML=gradeAgenda(SEMANA,'semana',[['Paciente C','11:00','confirmado'],['Paciente D','12:00','agendado']]);
  w.KineSysMotion._varrer.agenda(tela);
  tela.innerHTML=gradeAgenda(SEMANA,'semana',[['Paciente C','11:00','em_recepcao'],['Paciente D','12:00','agendado']]);
  w.KineSysMotion._varrer.agenda(tela);
  assert.ok(!w.document.getElementById('ks_motion_aviso_chegada'),'mesmo paciente/horário não avisa duas vezes');
  // Nome com marcação aparece como texto, nunca como HTML.
  tela.innerHTML=gradeAgenda(SEMANA,'semana',[['Paciente C','11:00','em_recepcao'],['Paciente D','12:00','agendado'],['Paciente E','14:00','agendado']]);
  w.KineSysMotion._varrer.agenda(tela);
  tela.querySelectorAll('.agenda-paciente-nome')[2].textContent='<img src=x onerror=alert(1)>';
  tela.querySelectorAll('.agenda-compromisso')[2].className='agenda-compromisso status-em_recepcao';
  w.KineSysMotion._varrer.agenda(tela);
  const aviso2=w.document.getElementById('ks_motion_aviso_chegada');
  assert.ok(aviso2&&!aviso2.querySelector('img'),'nome nunca vira HTML');
}

// 13. Novo agendamento: 1 cartão novo na mesma semana brilha; carga inicial e troca de semana não.
{
  const w=ambiente('<section id="tela_agenda"></section>');
  w.setTimeout=()=>1;
  const tela=w.document.getElementById('tela_agenda');
  const base=[['Paciente A','08:00','agendado'],['Paciente B','09:00','agendado'],['Paciente C','10:00','confirmado']];
  tela.innerHTML=gradeAgenda(SEMANA,'semana',[]);
  w.KineSysMotion._varrer.agenda(tela);
  tela.innerHTML=gradeAgenda(SEMANA,'semana',base);
  w.KineSysMotion._varrer.agenda(tela);
  assert.ok(!tela.querySelector('.ks-motion-novo'),'grade que estava vazia (carregando) não anima');
  tela.innerHTML=gradeAgenda(SEMANA,'semana',[...base,['Paciente E','14:00','agendado']]);
  w.KineSysMotion._varrer.agenda(tela);
  const novos=tela.querySelectorAll('.ks-motion-novo');
  assert.strictEqual(novos.length,1,'somente o novo brilha');
  assert.ok(novos[0].parentElement.title.startsWith('Paciente E'));
  tela.innerHTML=gradeAgenda(SEMANA2,'semana',[['Paciente X','08:00','agendado'],['Paciente Y','09:00','agendado']]);
  w.KineSysMotion._varrer.agenda(tela);
  assert.ok(!tela.querySelector('.ks-motion-novo'),'outra semana não é "novo agendamento"');
  tela.innerHTML=gradeAgenda(SEMANA2,'semana',[['Paciente X','08:00','agendado'],['Paciente Y','09:00','agendado'],['P1','10:00','agendado'],['P2','11:00','agendado'],['P3','12:00','agendado']]);
  w.KineSysMotion._varrer.agenda(tela);
  assert.ok(!tela.querySelector('.ks-motion-novo'),'muitos de uma vez = recarga, não anima');
}

// 14. Navegação: próxima/anterior desliza; semana → dia abre a coluna do dia.
{
  const w=ambiente('<section id="tela_agenda"></section>');
  w.setTimeout=()=>1;
  const tela=w.document.getElementById('tela_agenda');
  const grade=()=>tela.querySelector('#agenda_semana_grade');
  tela.innerHTML=gradeAgenda(SEMANA,'semana',[]);
  w.KineSysMotion._varrer.agenda(tela);
  assert.ok(!/ks-motion-/.test(grade().className),'primeira grade não anima');
  tela.innerHTML=gradeAgenda(SEMANA2,'semana',[]);
  w.KineSysMotion._varrer.agenda(tela);
  assert.ok(grade().classList.contains('ks-motion-avancar'),'próxima semana desliza');
  tela.innerHTML=gradeAgenda(SEMANA,'semana',[]);
  w.KineSysMotion._varrer.agenda(tela);
  assert.ok(grade().classList.contains('ks-motion-voltar'),'semana anterior desliza ao contrário');
  tela.innerHTML=gradeAgenda('2026-11-12','dia',[]);
  w.KineSysMotion._varrer.agenda(tela);
  assert.ok(grade().classList.contains('ks-motion-abrir-dia'),'semana → dia abre a coluna');
  assert.strictEqual(grade().style.getPropertyValue('--ks-motion-l'),'60.00%','coluna de quinta (4ª de 5)');
  assert.strictEqual(grade().style.getPropertyValue('--ks-motion-r'),'20.00%');
  w.KineSysMotion._varrer.agenda(tela);
  assert.ok(grade().classList.contains('ks-motion-abrir-dia'),'mesma grade não reanima');
}

// 15. Meu dia: rótulo de status mudando não quebra a chave; "Em recepção" acende e avisa.
{
  const linha=(cls,rotulo)=>`<section id="tela_home"><article class="ks-fisio-day-row ${cls}"><div class="ks-fisio-day-time"><strong>11:00</strong><span class="ks-fisio-day-status">${rotulo}</span></div><strong class="ks-fisio-day-patient-name">Paciente C</strong></article></section>`;
  const w=ambiente('');
  w.setTimeout=()=>1;
  w.document.body.innerHTML=linha('is-upcoming','A ser atendido');
  w.KineSysMotion._varrer.meuDia(w.document.body);
  w.document.body.innerHTML=linha('is-current','Em atendimento');
  w.KineSysMotion._varrer.meuDia(w.document.body);
  assert.ok(w.document.querySelector('.ks-fisio-day-row.ks-motion-atual'),'atendimento atual destaca mesmo com rótulo diferente');
  w.document.body.innerHTML=linha('is-waiting','A ser atendido');
  w.KineSysMotion._varrer.meuDia(w.document.body);
  assert.ok(w.document.querySelector('.ks-fisio-day-row.ks-motion-chegou'),'paciente em recepção acende no Meu dia');
  assert.strictEqual(w.document.getElementById('ks_motion_aviso_chegada').querySelector('strong').textContent,'Paciente C chegou');
}

// 16. Evolução: nova sessão do MESMO paciente entra no topo; troca de paciente não anima.
{
  const evo=(pac,n)=>`<select id="evo_paciente_select"><option value="${pac}" selected>${pac}</option></select><div id="linha_tempo_evolucoes">${Array.from({length:n},(_,i)=>`<div>Atendimento ${n-i}</div>`).join('')}</div>`;
  const w=ambiente('<section id="tela_evolucao"></section>');
  w.setTimeout=()=>1;
  const tela=w.document.getElementById('tela_evolucao');
  tela.innerHTML=evo('p1',3);w.KineSysMotion._varrer.evolucao(tela);
  tela.innerHTML=evo('p2',4);w.KineSysMotion._varrer.evolucao(tela);
  assert.ok(!tela.querySelector('.ks-motion-evolucao-nova'),'outro paciente não anima');
  const texto=tela.textContent;
  tela.innerHTML=evo('p2',5);const t2=tela.textContent;w.KineSysMotion._varrer.evolucao(tela);
  const nova=tela.querySelector('#linha_tempo_evolucoes > div.ks-motion-evolucao-nova');
  assert.ok(nova&&nova.textContent==='Atendimento 5','nova sessão (topo) destacada');
  assert.strictEqual(tela.textContent,t2,'histórico clínico intacto');
  assert.notStrictEqual(texto,t2);
}

// 17. "Salvo": só no botão que acabou de salvar e só com o sinal do sistema.
{
  const w=ambiente('<section id="tela_evolucao"><button id="btn_salvar_evolucao">Registrar evolução</button><button id="outro">Outro</button></section><section id="tela_avaliacao"><button id="btn_av">Salvar avaliação</button></section>');
  w.setTimeout=()=>1;
  const b=id=>w.document.getElementById(id);
  const ocupar=(el,on)=>{if(on)el.setAttribute('aria-busy','true');else el.removeAttribute('aria-busy');w.KineSysMotion._aoMudarOcupado([{target:el}]);};
  // Sem salvamento recente: sinal não faz nada.
  w.KineSysMotion._confirmarSalvo('evolucao');
  assert.ok(!b('btn_salvar_evolucao').classList.contains('ks-motion-salvo'),'sem salvamento, sem "Salvo"');
  // Outro botão salvou: sinal de evolução não marca.
  ocupar(b('outro'),true);ocupar(b('outro'),false);
  w.KineSysMotion._confirmarSalvo('evolucao');
  assert.ok(!b('outro').classList.contains('ks-motion-salvo')&&!b('btn_salvar_evolucao').classList.contains('ks-motion-salvo'),'sinal de outro tipo não marca');
  // Evolução salvou de verdade.
  ocupar(b('btn_salvar_evolucao'),true);ocupar(b('btn_salvar_evolucao'),false);
  w.KineSysMotion._confirmarSalvo('evolucao');
  assert.ok(b('btn_salvar_evolucao').classList.contains('ks-motion-salvo'),'evolução salva mostra "Salvo"');
  assert.strictEqual(b('btn_salvar_evolucao').textContent,'Registrar evolução','texto do botão não é alterado');
  // Avaliação: sinal kinesys:avaliacao-salva só vale para botão da avaliação.
  ocupar(b('btn_av'),true);ocupar(b('btn_av'),false);
  w.KineSysMotion._confirmarSalvo('equipe');
  assert.ok(!b('btn_av').classList.contains('ks-motion-salvo'),'sinal de equipe não marca a avaliação');
  ocupar(b('btn_av'),true);ocupar(b('btn_av'),false);
  w.KineSysMotion._confirmarSalvo('avaliacao');
  assert.ok(b('btn_av').classList.contains('ks-motion-salvo'));
}

// 18. Pendências: item resolvido sai riscando (fantasma inerte); recarga grande não anima.
{
  const item=(id,t)=>`<button type="button" data-home-paciente="${id}" data-home-target="tela_avaliacao" class="ks-home-pending-item"><span><strong>${t}</strong><span>PSFS não registrada</span></span></button>`;
  const w=ambiente('<span id="home_pending_total">3 pendências</span><div id="lista_pendencias_clinicas"></div>');
  w.setTimeout=()=>1;
  const l=w.document.getElementById('lista_pendencias_clinicas');
  l.innerHTML=item('a','Paciente A')+item('b','Paciente B')+item('c','Paciente C');
  w.KineSysMotion._varrer.pendencias(l);
  l.innerHTML=item('a','Paciente A')+item('c','Paciente C');
  w.KineSysMotion._varrer.pendencias(l);
  const f=l.querySelector('.ks-motion-pendencia-saindo');
  assert.ok(f,'item resolvido aparece saindo');
  assert.strictEqual(l.children[1],f,'na posição antiga');
  assert.ok(f.inert===true||f.hasAttribute('inert')||f.getAttribute('aria-hidden')==='true','fantasma é inerte');
  assert.ok(!f.hasAttribute('data-home-paciente'),'fantasma não abre paciente');
  assert.strictEqual(l.querySelectorAll('[data-home-paciente]').length,2,'itens reais intactos');
  f.remove();
  w.KineSysMotion._varrer.pendencias(l);
  l.innerHTML=item('x','X')+item('y','Y')+item('z','Z');
  w.KineSysMotion._varrer.pendencias(l);
  assert.ok(!l.querySelector('.ks-motion-pendencia-saindo'),'troca completa (outro perfil/recarga) não anima');
}

// 19. Abas do prontuário: clique cria indicador temporário; tela entra pelo lado certo.
{
  const w=ambiente('<div id="ks_patient_context"><nav class="ks-patient-tabs"><button data-patient-target="tela_buscar" class="active">Resumo</button><button data-patient-target="tela_evolucao">Evolução</button></nav></div><section id="tela_evolucao" class="tela"></section>');
  w.document.dispatchEvent(new w.Event('DOMContentLoaded')); // o jsdom ainda está "loading": inicia o módulo
  const [r,e]=w.document.querySelectorAll('[data-patient-target]');
  e.dispatchEvent(new w.MouseEvent('click',{bubbles:true}));
  r.classList.remove('active');e.classList.add('active'); // o sistema troca a aba
  w.document.dispatchEvent(new w.CustomEvent('kinesys:tela-ativada',{detail:{id:'tela_evolucao'}}));
  assert.ok(w.document.getElementById('tela_evolucao').classList.contains('ks-motion-tela-avancar'),'tela entra pela direita (aba à direita)');
  assert.strictEqual(e.textContent,'Evolução');
}

// 21. Falta acende o cartão; cancelamento (cartão sai da grade) marca "Horário liberado" inerte.
{
  const w=ambiente('<section id="tela_agenda"></section>');
  w.setTimeout=()=>1;
  const tela=w.document.getElementById('tela_agenda');
  const base=[['Paciente A','08:00','agendado'],['Paciente B','09:00','agendado'],['Paciente C','10:00','confirmado']];
  tela.innerHTML=gradeAgenda(SEMANA,'semana',base);
  // jsdom não calcula layout: simula a posição dos cartões.
  tela.querySelectorAll('.agenda-celula').forEach((c,i)=>{c.getBoundingClientRect=()=>({left:100,top:50+i*60,width:120,height:50});});
  w.KineSysMotion._varrer.agenda(tela);
  tela.innerHTML=gradeAgenda(SEMANA,'semana',[base[0],['Paciente B','09:00','falta_nao_justificada'],base[2]]);
  w.KineSysMotion._varrer.agenda(tela);
  assert.ok(tela.querySelectorAll('.agenda-compromisso')[1].classList.contains('ks-motion-falta'),'falta acende');
  assert.ok(!w.document.querySelector('.ks-motion-horario-liberado'),'falta não é cancelamento');
  tela.querySelectorAll('.agenda-celula').forEach((c,i)=>{c.getBoundingClientRect=()=>({left:100,top:50+i*60,width:120,height:50});});
  w.KineSysMotion._varrer.agenda(tela);
  const textoAntes=tela.textContent;
  tela.innerHTML=gradeAgenda(SEMANA,'semana',[base[0],['Paciente B','09:00','falta_nao_justificada']]);
  w.KineSysMotion._varrer.agenda(tela);
  const marca=w.document.querySelector('.ks-motion-horario-liberado');
  assert.ok(marca,'horário liberado marcado');
  assert.strictEqual(marca.getAttribute('aria-hidden'),'true');
  assert.strictEqual(marca.parentElement,w.document.body,'marca fica fora da grade da agenda');
  assert.ok(/top: ?170px/.test(marca.style.cssText),'na posição do cartão que saiu');
  assert.ok(!tela.contains(marca));
  assert.notStrictEqual(tela.textContent,textoAntes);
  // Grade esvaziada (carregando) não marca todos como liberados.
  marca.remove();
  tela.innerHTML=gradeAgenda(SEMANA,'semana',[]);
  w.KineSysMotion._varrer.agenda(tela);
  assert.ok(!w.document.querySelector('.ks-motion-horario-liberado'),'grade vazia (consulta) não marca');
}

// 22. Troca de perfil/clínica zera a memória: nunca mostra item do contexto anterior.
{
  const item=(id,t)=>`<button type="button" data-home-paciente="${id}" class="ks-home-pending-item"><span><strong>${t}</strong></span></button>`;
  const w=ambiente('<div id="lista_pendencias_clinicas"></div>');
  w.setTimeout=()=>1;
  w.usuarioLogado={id:'u1',clinica_id:'c1'};
  const l=w.document.getElementById('lista_pendencias_clinicas');
  l.innerHTML=item('x','Paciente X da clínica 1')+item('y','Paciente Y da clínica 1');
  w.KineSysMotion._varrer.pendencias(l);
  w.usuarioLogado={id:'u2',clinica_id:'c2'};
  l.innerHTML=item('z','Paciente Z da clínica 2');
  w.KineSysMotion._varrer.pendencias(l);
  assert.ok(!l.querySelector('.ks-motion-pendencia-saindo'),'nenhum fantasma após troca de clínica');
  assert.ok(!l.textContent.includes('clínica 1'),'nada da clínica anterior aparece');
}

// 23. Trocar o filtro de profissional não é "novo agendamento" nem "horário liberado".
{
  const w=ambiente('<section id="tela_agenda"></section>');
  w.setTimeout=()=>1;
  const tela=w.document.getElementById('tela_agenda');
  const filtro=v=>`<select id="agenda_filtro_profissional"><option value="${v}" selected>${v||'Toda a clínica'}</option></select>`;
  tela.innerHTML=filtro('')+gradeAgenda(SEMANA,'semana',[['Paciente A · Dr. 1','08:00','agendado'],['Paciente B · Dr. 1','09:00','agendado']]);
  tela.querySelectorAll('.agenda-celula').forEach((c,i)=>{c.getBoundingClientRect=()=>({left:10,top:10+i*40,width:80,height:30});});
  w.KineSysMotion._varrer.agenda(tela);
  tela.innerHTML=filtro('prof1')+gradeAgenda(SEMANA,'semana',[['Paciente A','08:00','agendado']]);
  w.KineSysMotion._varrer.agenda(tela);
  assert.ok(!tela.querySelector('.ks-motion-novo'),'filtro trocado não brilha como novo');
  assert.ok(!w.document.querySelector('.ks-motion-horario-liberado'),'filtro trocado não marca horário liberado');
}

// 20. CSS: "Salvo"/girando/abas/pendências somem na impressão.
{
  assert.ok(/@media print\{[\s\S]*button\.ks-motion-salvo::after\{content:none!important\}/.test(css));
  assert.ok(/@media print\{[\s\S]*button\[aria-busy="true"\]::after\{content:none!important\}/.test(css));
}

// 25. Entrada do Meu dia: anima quando as linhas são DESENHADAS (não na ativação da tela),
// uma vez por login; tela oculta adia para a ativação; atualizações seguintes não repetem.
(async()=>{
  const w=ambiente('<section id="tela_home" class="tela"><div id="painel_fisio_lista"></div></section>');
  const chamadas=[];
  w.Element.prototype.animate=function(k,o){chamadas.push({el:this,delay:o.delay,dur:o.duration});return {};};
  const quadros=[];w.requestAnimationFrame=fn=>{quadros.push(fn);return quadros.length;};
  const rodarQuadros=()=>{while(quadros.length)quadros.shift()();};
  await new Promise(r=>w.document.readyState==='loading'?w.document.addEventListener('DOMContentLoaded',()=>w.setTimeout(r,0)):r());
  const home=w.document.getElementById('tela_home'),lista=w.document.getElementById('painel_fisio_lista');
  const desenhar=n=>{lista.innerHTML=Array.from({length:n},(_,i)=>'<article class="ks-fisio-day-row is-upcoming"><div class="ks-fisio-day-time"><strong>1'+i+':00</strong></div><strong class="ks-fisio-day-patient-name">P'+i+'</strong></article>').join('');w.document.dispatchEvent(new w.CustomEvent('kinesys:meu-dia-atualizado'));rodarQuadros();};
  // Sessão restaurada: a tela já está ativa antes de os dados chegarem.
  home.classList.add('ativa');
  desenhar(8);
  assert.strictEqual(chamadas.length,8,'todas as linhas entram no momento em que são desenhadas');
  assert.ok(chamadas.every(c=>c.dur>=450),'entrada suave (não rápida)');
  assert.ok(Math.max(...chamadas.map(c=>c.delay))<=225,'última linha começa em até 225 ms');
  desenhar(8);
  assert.strictEqual(chamadas.length,8,'atualização automática não repete a entrada');
  // Novo login: entra de novo; com a tela oculta, espera a ativação.
  w.document.dispatchEvent(new w.CustomEvent('kinesys:tela-ativada',{detail:{id:'tela_login'}}));
  home.classList.remove('ativa');
  desenhar(3);
  assert.strictEqual(chamadas.length,8,'tela oculta não anima');
  home.classList.add('ativa');
  await new Promise(r=>w.setTimeout(r,0));rodarQuadros();
  {
    assert.strictEqual(chamadas.length,11,'anima ao ativar a tela');
    assert.ok(!/ks-motion-entrada/.test(css),'sem cascata presa a classe/tempo');
  }
})().catch(e=>{console.error(e);process.exit(1);});

console.log('PASS: KineSys Motion anima somente transições, sem alterar conteúdo (25 cenários).');
