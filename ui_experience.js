/* KineSys UI Experience — visual/interaction refinement only.
 * Preserva IDs, dados, Motor Clínico, Supabase e regras de negócio.
 */
(function(){
  'use strict';

  const q=(s,r=document)=>r.querySelector(s);
  const qa=(s,r=document)=>Array.from(r.querySelectorAll(s));
  const clean=(v)=>String(v??'').replace(/\s+/g,' ').trim();

  function configurarCartao(id,rotuloFechado='Expandir',rotuloAberto='Recolher'){
    const card=document.getElementById(id);
    if(!card||card.dataset.ksUiCollapsible==='1') return;
    const head=card.querySelector(':scope > .card-header');
    if(!head) return;
    card.dataset.ksUiCollapsible='1';
    card.classList.add('ks-eval-collapsible');
    const btn=document.createElement('button');
    btn.type='button';
    btn.className='ks-section-toggle';
    btn.setAttribute('aria-expanded','false');
    btn.textContent=rotuloFechado;
    btn.addEventListener('click',()=>{
      const aberto=card.classList.toggle('ks-eval-open');
      btn.setAttribute('aria-expanded',aberto?'true':'false');
      btn.textContent=aberto?rotuloAberto:rotuloFechado;
    });
    head.appendChild(btn);
  }

  function ensurePatientBar(){
    const screen=q('#tela_avaliacao');
    const loader=q('.precadastro-compacto',screen);
    if(!screen||!loader) return null;
    let bar=q('.ks-eval-patient-bar',screen);
    if(bar) return bar;

    bar=document.createElement('div');
    bar.className='ks-eval-patient-bar';
    bar.hidden=true;
    bar.setAttribute('aria-live','polite');
    bar.innerHTML='\
      <div class="ks-eval-patient-identity">\
        <span class="ks-eval-patient-label">Paciente em avaliação</span>\
        <strong data-ks-patient-name>Paciente</strong>\
        <span data-ks-patient-meta></span>\
      </div>\
      <div class="ks-eval-patient-actions">\
        <button type="button" class="btn-link-compacto" data-ks-edit-patient>Editar dados</button>\
        <button type="button" class="btn-secondary btn-compact" data-ks-switch-patient>Trocar paciente</button>\
      </div>';
    loader.insertAdjacentElement('afterend',bar);

    q('[data-ks-edit-patient]',bar)?.addEventListener('click',()=>{
      const editing=screen.classList.toggle('ks-eval-editing-patient');
      const btn=q('[data-ks-edit-patient]',bar);
      if(btn) btn.textContent=editing?'Concluir edição':'Editar dados';
      if(editing) setTimeout(()=>q('#paciente_nome')?.focus(),0);
    });

    q('[data-ks-switch-patient]',bar)?.addEventListener('click',()=>{
      const switching=screen.classList.toggle('ks-eval-switching');
      const btn=q('[data-ks-switch-patient]',bar);
      if(btn) btn.textContent=switching?'Cancelar troca':'Trocar paciente';
      if(switching){
        setTimeout(()=>{
          const input=q('#busca_paciente_precadastro');
          if(input){ input.focus(); input.select?.(); }
        },0);
      }
    });
    return bar;
  }

  function patientLoaded(){
    const native=q('#select_paciente_precadastro');
    const nome=q('#paciente_nome');
    return Boolean(clean(native?.value)||clean(nome?.value));
  }

  function syncPatientContext(){
    const screen=q('#tela_avaliacao');
    if(!screen) return;
    const bar=ensurePatientBar();
    if(!bar) return;
    const loaded=patientLoaded();
    screen.classList.toggle('ks-eval-patient-loaded',loaded);
    bar.hidden=!loaded;
    if(!loaded){
      screen.classList.remove('ks-eval-editing-patient');
      return;
    }

    const nome=clean(q('#paciente_nome')?.value)||'Paciente';
    const idade=clean(q('#paciente_idade')?.value);
    const profissao=clean(q('#paciente_ocupacao')?.value);
    const esporte=clean(q('#paciente_esporte')?.value);
    const meta=[];
    if(idade) meta.push(`${idade} anos`);
    if(profissao) meta.push(profissao);
    if(esporte) meta.push(esporte);
    q('[data-ks-patient-name]',bar).textContent=nome;
    q('[data-ks-patient-meta]',bar).textContent=meta.join(' · ')||'Dados clínicos carregados';
  }

  function syncStepper(){
    const screen=q('#tela_avaliacao');
    const steps=qa('.clinical-progress .step',screen);
    if(!screen||!steps.length) return;
    let active=steps.findIndex(step=>step.getAttribute('aria-selected')==='true'||step.classList.contains('active'));
    if(active<0) active=0;
    const reached=Math.max(Number(screen.dataset.ksMaxStep||1),active+1);
    screen.dataset.ksMaxStep=String(reached);
    steps.forEach((step,index)=>{
      const current=index===active;
      const complete=!current&&index<reached-1;
      step.classList.toggle('ks-step-complete',complete);
      step.classList.toggle('ks-step-current',current);
      if(current) step.setAttribute('aria-current','step');
      else step.removeAttribute('aria-current');
    });
  }

  function syncRadarState(){
    const card=q('#tela_avaliacao .hma-radar-card');
    const panel=q('#ks20_hma_radar');
    const insights=q('#ks20_hma_insights');
    if(!card||!panel) return;
    const active=!panel.hidden&&Boolean(clean(insights?.textContent)||clean(panel.textContent).replace(/Radar clínico da HMA|Revise e confirme os achados durante o exame\. O radar não estabelece diagnóstico\./gi,''));
    card.dataset.ksRadarState=active?'active':'empty';
  }

  function meaningfulControlValue(el){
    if(!el||el.closest('[hidden],[aria-hidden="true"]')) return false;
    const type=(el.getAttribute('type')||'').toLowerCase();
    if(type==='hidden') return false;
    if(type==='checkbox'||type==='radio') return Boolean(el.checked);
    const value=clean(el.value);
    if(!value) return false;
    return !['nao_verificado','não verificado','nao_informado','não informado'].includes(value.toLocaleLowerCase('pt-BR'));
  }

  function syncDisclosure(detail){
    const summary=q(':scope > summary',detail);
    if(!summary) return;
    let status=q('.ks-disclosure-status',summary);
    if(!status){
      status=document.createElement('span');
      status.className='ks-disclosure-status';
      summary.appendChild(status);
    }

    if(detail.classList.contains('fonte-disclosure')){
      const select=q('select',detail);
      const label=select?.selectedOptions?.[0]?.textContent;
      status.textContent=clean(label)||'Padrão';
      detail.classList.toggle('ks-has-data',Boolean(select?.value));
      return;
    }

    let count=qa('input,select,textarea',detail).filter(meaningfulControlValue).length;
    count+=qa('.tag-cirurgia,#tags_medicamentos > *',detail).length;
    detail.classList.toggle('ks-has-data',count>0);
    status.textContent=count?`${count} ${count===1?'item':'itens'}`:'Não preenchido';
  }

  function syncDisclosures(){
    qa('#tela_avaliacao .clinical-secondary-card details').forEach(syncDisclosure);
  }

  const actionBarSelector='.actions,.clinical-actions,.cluster-focus-actions,.finance-patient-actions,.finance-plan-actions,.ks-msg-toolbar > div';
  function decorateActionBars(root=document){
    const bars=[];
    if(root?.nodeType===1&&root.matches?.(actionBarSelector)) bars.push(root);
    if(root?.querySelectorAll) bars.push(...root.querySelectorAll(actionBarSelector));
    Array.from(new Set(bars)).forEach(bar=>{
      bar.classList.add('ks-action-bar');
      const primaries=qa('.btn-primary',bar);
      primaries.forEach(btn=>btn.classList.remove('ks-primary-action'));
      if(primaries.length) primaries[primaries.length-1].classList.add('ks-primary-action');
    });
  }

  function decorateHome(){
    const recent=q('#lista_pacientes_recentes')?.closest('.card');
    if(recent) recent.classList.add('ks-home-recent-card');
    q('#card_pendencias_clinicas')?.classList.add('ks-home-pending-card');
    q('#card_crm')?.classList.add('ks-home-crm-legacy-card');
    q('#card_painel_fisioterapeuta')?.classList.add('ks-home-today-card');
  }

  function normalizeText(value){
    return clean(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('pt-BR');
  }

  function decorateFinanceTabs(){
    const tabs=qa('#tela_financeiro .finance-workspace-tab');
    if(!tabs.length) return;
    tabs.forEach(tab=>{
      tab.classList.remove('ks-fin-operation','ks-fin-analysis','ks-fin-analysis-first');
      const t=normalizeText(tab.textContent);
      const analysis=/analise|relatorio|balanco|indicador/.test(t);
      tab.classList.add(analysis?'ks-fin-analysis':'ks-fin-operation');
    });
    const first=tabs.find(tab=>tab.classList.contains('ks-fin-analysis')&&getComputedStyle(tab).display!=='none');
    first?.classList.add('ks-fin-analysis-first');
  }

  function createDisclosure(label,nodes,className){
    if(!nodes.length) return null;
    const detail=document.createElement('details');
    detail.className=className;
    const summary=document.createElement('summary');
    summary.textContent=label;
    const body=document.createElement('div');
    body.className=`${className}-body`;
    nodes.forEach(node=>body.appendChild(node));
    detail.append(summary,body);
    return detail;
  }

  function decorateClinicalPlan(){
    const host=q('#ks30_exam_plan');
    if(!host) return;

    qa('.ks30-hypothesis',host).forEach(article=>{
      if(article.dataset.ksUiDisclosure==='1') return;
      article.dataset.ksUiDisclosure='1';
      const paragraphs=qa(':scope > p',article);
      const focus=paragraphs.find(p=>normalizeText(p.textContent).startsWith('o exame precisa esclarecer'))||paragraphs[paragraphs.length-1];
      if(focus) focus.classList.add('ks30-hypothesis-focus');
      const rationale=paragraphs.filter(p=>p!==focus);
      const detail=createDisclosure('Ver raciocínio',rationale,'ks30-hypothesis-detail');
      if(detail) article.appendChild(detail);
    });

    qa('.ks30-analysis',host).forEach(group=>{
      if(group.dataset.ksUiDisclosure==='1') return;
      group.dataset.ksUiDisclosure='1';
      const tests=qa(':scope > .ks30-test',group);
      if(tests.length<=3) return;
      const extras=tests.slice(3);
      const detail=createDisclosure(`Ver mais ${extras.length} ${extras.length===1?'item':'itens'}`,extras,'ks30-more-tests');
      if(detail) group.appendChild(detail);
    });

    qa('.ks30-section',host).forEach(section=>{
      if(section.dataset.ksUiSection==='1') return;
      section.dataset.ksUiSection='1';
      const title=normalizeText(q(':scope > .ks30-section-title strong',section)?.textContent);
      if(title.startsWith('contexto que modifica')){
        const lines=qa(':scope > .ks30-line',section);
        const detail=createDisclosure(`Ver ${lines.length} ${lines.length===1?'modificador':'modificadores'}`,lines,'ks30-context-detail');
        if(detail) section.appendChild(detail);
      }
      if(title.startsWith('antes de fechar a sintese')){
        const lines=qa(':scope > .ks30-line',section);
        const extras=lines.slice(2);
        const detail=createDisclosure(`Ver mais ${extras.length} ${extras.length===1?'pendência':'pendências'}`,extras,'ks30-more-gaps');
        if(detail) section.appendChild(detail);
      }
    });

    const head=q('.ks30-exam-head',host);
    if(head&&!q('.ks30-plan-overview',host)){
      const overview=document.createElement('div');
      overview.className='ks30-plan-overview';
      const hypotheses=qa('.ks30-hypothesis',host).length;
      const clusters=qa('.ks30-cluster',host).length;
      const tests=qa('.ks30-test',host).length;
      overview.innerHTML=`<span><strong>${hypotheses}</strong> hipóteses</span><span><strong>${clusters}</strong> clusters</span><span><strong>${tests}</strong> testes priorizados</span>`;
      head.insertAdjacentElement('afterend',overview);
    }
  }

  let clinicalPlanRaf=0;
  function scheduleClinicalPlan(){
    if(clinicalPlanRaf) return;
    clinicalPlanRaf=requestAnimationFrame(()=>{
      clinicalPlanRaf=0;
      decorateClinicalPlan();
    });
  }

  const decorativeEmoji=/[📌📱📲🏋️📅🗓️💳👥🛠️🏠👤🩺📂📷📈📄🚪🔔]/g;
  function cleanEmojiIn(root=document){
    const targets=[];
    if(root.nodeType===1&&root.matches?.('.tela button,.modal-box button,.card-header h2')) targets.push(root);
    if(root.querySelectorAll) targets.push(...root.querySelectorAll('.tela button,.modal-box button,.card-header h2'));
    targets.forEach(el=>{
      const walker=document.createTreeWalker(el,NodeFilter.SHOW_TEXT);
      const nodes=[];
      while(walker.nextNode()) nodes.push(walker.currentNode);
      nodes.forEach(node=>{
        const next=node.nodeValue.replace(decorativeEmoji,'').replace(/^\s{2,}/,' ');
        if(next!==node.nodeValue) node.nodeValue=next;
      });
    });
  }

  function refineSidebarLabels(){
    qa('#ks_sidebar .ks-nav-label').forEach(label=>{
      if(label.dataset.ksCase==='1') return;
      const raw=clean(label.textContent).toLocaleLowerCase('pt-BR');
      if(raw){
        label.textContent=raw.charAt(0).toLocaleUpperCase('pt-BR')+raw.slice(1);
        label.dataset.ksCase='1';
      }
    });
  }

  function rootTouches(root,selector){
    if(!root||root===document) return true;
    return !!(root.matches?.(selector)||root.closest?.(selector)||root.querySelector?.(selector));
  }

  let layoutRaf=0;
  const layoutRoots=new Set();
  function scheduleLayoutFor(root){
    const target=root?.nodeType===1?root:document.body;
    if(target) layoutRoots.add(target);
    if(layoutRaf) return;
    layoutRaf=requestAnimationFrame(()=>{
      layoutRaf=0;
      const roots=Array.from(layoutRoots);
      layoutRoots.clear();
      roots.forEach(scope=>{
        decorateActionBars(scope);
        if(rootTouches(scope,'#tela_home')) decorateHome();
        if(rootTouches(scope,'#tela_financeiro')) decorateFinanceTabs();
        if(rootTouches(scope,'#ks30_exam_plan,#tela_avaliacao')) scheduleClinicalPlan();
        if(rootTouches(scope,'#ks_sidebar')) refineSidebarLabels();
      });
    });
  }

  function refresh(){
    syncPatientContext();
    syncStepper();
    syncRadarState();
    syncDisclosures();
    decorateActionBars();
    decorateHome();
    decorateFinanceTabs();
    decorateClinicalPlan();
    refineSidebarLabels();
    cleanEmojiIn();
  }

  function inicializar(){
    configurarCartao('card_objetivos_plano');
    configurarCartao('card_restricoes_posop');
    configurarCartao('card_medidas_outcomes');
    refresh();

    const evalScreen=q('#tela_avaliacao');
    if(evalScreen){
      const patientContextIds=new Set(['select_paciente_precadastro','paciente_nome','paciente_idade','paciente_ocupacao','paciente_esporte']);
      evalScreen.addEventListener('input',event=>{
        const target=event.target;
        const patientChanged=patientContextIds.has(target?.id);
        const disclosureChanged=!!target?.closest?.('.clinical-secondary-card');
        const hmaChanged=target?.id==='paciente_hma';
        if(!patientChanged&&!disclosureChanged&&!hmaChanged) return;
        requestAnimationFrame(()=>{
          if(patientChanged) syncPatientContext();
          if(disclosureChanged) syncDisclosures();
          if(hmaChanged) syncRadarState();
        });
      });
      evalScreen.addEventListener('change',event=>requestAnimationFrame(()=>{
        const target=event.target;
        evalScreen.classList.remove('ks-eval-switching');
        const switchBtn=q('[data-ks-switch-patient]');
        if(switchBtn) switchBtn.textContent='Trocar paciente';
        if(patientContextIds.has(target?.id)) syncPatientContext();
        if(target?.closest?.('.clinical-secondary-card')) syncDisclosures();
        syncStepper();
      }));
      const progress=q('.clinical-progress',evalScreen);
      if(progress) new MutationObserver(syncStepper).observe(progress,{subtree:true,attributes:true,attributeFilter:['class','aria-selected']});
      const radar=q('#ks20_hma_radar');
      if(radar) new MutationObserver(syncRadarState).observe(radar,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['hidden','class']});
      const secondary=q('.clinical-secondary-card',evalScreen);
      if(secondary) new MutationObserver(()=>requestAnimationFrame(syncDisclosures)).observe(secondary,{subtree:true,childList:true});
      const examPlan=q('#ks30_exam_plan',evalScreen);
      if(examPlan) new MutationObserver(scheduleClinicalPlan).observe(examPlan,{subtree:true,childList:true});
      document.addEventListener('kinesys:tela-ativada',event=>{
        if(event.detail?.id==='tela_avaliacao')requestAnimationFrame(syncPatientContext);
      });
    }

    const observer=new MutationObserver(mutations=>{
      mutations.forEach(mutation=>{
        mutation.addedNodes.forEach(node=>{
          if(node.nodeType!==1) return;
          cleanEmojiIn(node);
          scheduleLayoutFor(node.parentElement||node);
        });
      });
    });
    observer.observe(document.body,{subtree:true,childList:true});
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',inicializar,{once:true});
  else inicializar();
})();
