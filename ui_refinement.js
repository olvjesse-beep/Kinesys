/* KineSys UI Refinement v1.11.2 — progressive disclosure + guards de desempenho */
(function(){
  'use strict';

  function instalarGuardsDesempenho(){
    const originalPacientes=window.obterPacientesSalvos;
    if(typeof originalPacientes==='function'&&!originalPacientes.__kinesysCoalescida){
      let emCurso=null;
      const coalescida=async function(...args){
        if(emCurso)return emCurso;
        emCurso=Promise.resolve(originalPacientes.apply(this,args)).finally(()=>{emCurso=null;});
        return emCurso;
      };
      coalescida.__kinesysCoalescida=true;
      coalescida.__original=originalPacientes;
      window.obterPacientesSalvos=coalescida;
    }

    const originalLocal=window.verificarKinesysLocal;
    if(typeof originalLocal==='function'&&!originalLocal.__kinesysSobDemanda){
      const sobDemanda=async function(mostrarErro=false,...args){
        const telaMidias=document.getElementById('tela_midias');
        const ativa=!!telaMidias?.classList.contains('ativa');
        if(!mostrarErro&&!ativa)return null;
        return originalLocal.call(this,mostrarErro,...args);
      };
      sobDemanda.__kinesysSobDemanda=true;
      sobDemanda.__original=originalLocal;
      window.verificarKinesysLocal=sobDemanda;
    }
  }

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
    instalarGuardsDesempenho();
    configurarCartao('card_objetivos_plano');
    configurarCartao('card_restricoes_posop');
    configurarCartao('card_medidas_outcomes');
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',inicializar,{once:true});
  else inicializar();
})();
