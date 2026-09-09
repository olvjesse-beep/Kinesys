/* KineSys UI Refinement v1.11.2 — progressive disclosure puramente visual */
(function(){
  'use strict';
  function configurarCartao(id, rotuloFechado='Expandir', rotuloAberto='Recolher'){
    const card=document.getElementById(id);
    if(!card || card.dataset.ksUiCollapsible==='1') return;
    const head=card.querySelector(':scope > .card-header');
    if(!head) return;
    card.dataset.ksUiCollapsible='1';
    card.classList.add('ks-eval-collapsible');
    const btn=document.createElement('button');
    btn.type='button'; btn.className='ks-section-toggle'; btn.setAttribute('aria-expanded','false'); btn.textContent=rotuloFechado;
    btn.addEventListener('click',()=>{
      const aberto=card.classList.toggle('ks-eval-open');
      btn.setAttribute('aria-expanded',aberto?'true':'false');
      btn.textContent=aberto?rotuloAberto:rotuloFechado;
    });
    head.appendChild(btn);
  }
  function inicializar(){
    configurarCartao('card_objetivos_plano');
    configurarCartao('card_restricoes_posop');
    configurarCartao('card_medidas_outcomes');
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',inicializar,{once:true});
  else inicializar();
})();
