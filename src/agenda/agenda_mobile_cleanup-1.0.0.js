/* KineSys — Agenda Mobile Cleanup 1.0.0 / r34
 * Remove no mobile controles redundantes da Agenda diretamente no DOM entregue.
 * Carregado de forma eager pelo shell de produção; independe do Screen Loader.
 */
(function instalarAgendaMobileCleanup(){
    'use strict';

    const VERSION='1.0.0-r34';
    const MEDIA='(max-width: 760px)';
    let observer=null;
    let raf=0;

    function mobile(){
        return !!window.matchMedia?.(MEDIA).matches;
    }

    function garantirEstilo(){
        if(document.getElementById('ks_agenda_mobile_cleanup_style'))return;
        const style=document.createElement('style');
        style.id='ks_agenda_mobile_cleanup_style';
        style.textContent=`
@media (max-width:760px){
  #tela_agenda .agenda-semana-nav>.btn-hoje-agenda{display:none!important;}
  #tela_agenda #ks_agenda_controls>.ks-segmented>button[data-agenda-view="agenda_painel"]:not([data-ks-agenda-waitlist-toggle="1"]){display:none!important;}
  #tela_agenda #ks_agenda_controls>.ks-segmented{display:grid!important;grid-template-columns:1fr!important;}
  #tela_agenda #ks_agenda_controls>.ks-segmented>button[data-ks-agenda-waitlist-toggle="1"],
  #tela_agenda #ks_agenda_controls>.ks-segmented>button[data-agenda-view="agenda_lista_espera"]{width:100%!important;grid-column:1!important;}
  #tela_agenda .agenda-semana-nav{grid-template-columns:42px minmax(0,1fr) 42px!important;}
  #tela_agenda .agenda-semana-nav>button:first-of-type{grid-column:1!important;}
  #tela_agenda .agenda-semana-nav>button:last-of-type{grid-column:3!important;}
  #tela_agenda .agenda-semana-nav>div:not(.agenda-periodo-segmentado){grid-column:2!important;}
}
@media (max-width:390px){
  #tela_agenda .agenda-semana-nav{grid-template-columns:38px minmax(0,1fr) 38px!important;}
}`;
        document.head.appendChild(style);
    }

    function estadoListaAtiva(){
        return !!document.getElementById('agenda_lista_espera')?.classList.contains('ativa');
    }

    function prepararAlternadorLista(){
        const segmented=document.querySelector('#ks_agenda_controls>.ks-segmented');
        if(!segmented)return null;

        segmented.querySelectorAll('button[data-agenda-view="agenda_painel"]:not([data-ks-agenda-waitlist-toggle="1"])')
            .forEach(botao=>botao.remove());

        let botao=segmented.querySelector('button[data-ks-agenda-waitlist-toggle="1"]');
        if(!botao){
            botao=segmented.querySelector('button[data-agenda-view="agenda_lista_espera"]');
            if(botao)botao.dataset.ksAgendaWaitlistToggle='1';
        }
        if(!botao)return null;

        const listaAtiva=estadoListaAtiva();
        const destino=listaAtiva?'agenda_painel':'agenda_lista_espera';
        const texto=listaAtiva?'Voltar para agenda':'Lista de espera';
        if(botao.dataset.agendaView!==destino)botao.dataset.agendaView=destino;
        if(botao.textContent!==texto)botao.textContent=texto;
        botao.title=texto;
        botao.setAttribute('aria-label',texto);
        botao.classList.remove('active');
        return botao;
    }

    function limpar(){
        if(!mobile())return false;
        garantirEstilo();
        document.querySelectorAll('#tela_agenda .agenda-semana-nav>.btn-hoje-agenda').forEach(botao=>botao.remove());
        prepararAlternadorLista();
        const tela=document.getElementById('tela_agenda');
        if(tela)tela.dataset.ksAgendaMobileCleanup=VERSION;
        return true;
    }

    function agendar(){
        if(raf)return;
        raf=requestAnimationFrame(()=>{
            raf=0;
            limpar();
        });
    }

    function instalarObserver(){
        if(observer)return;
        const alvo=document.getElementById('tela_agenda');
        if(!alvo)return;
        observer=new MutationObserver(agendar);
        observer.observe(alvo,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});
    }

    function iniciar(){
        garantirEstilo();
        limpar();
        instalarObserver();
        document.addEventListener('kinesys:tela-ativada',agendar);
        document.addEventListener('kinesys:tela-dom-pronta',agendar);
        window.addEventListener('pageshow',agendar,{passive:true});
        window.addEventListener('resize',agendar,{passive:true});
        document.addEventListener('click',event=>{
            if(event.target.closest('#ks_agenda_controls [data-ks-agenda-waitlist-toggle="1"]')){
                requestAnimationFrame(agendar);
            }
        });
        requestAnimationFrame(agendar);
        setTimeout(agendar,0);
        setTimeout(agendar,600);
    }

    if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',iniciar,{once:true});
    else iniciar();

    window.KineSysAgendaMobileCleanup=Object.freeze({
        version:VERSION,
        sync:limpar,
        status(){
            return Object.freeze({
                mobile:mobile(),
                todayPresent:!!document.querySelector('#tela_agenda .agenda-semana-nav>.btn-hoje-agenda'),
                redundantWeekPresent:!!document.querySelector('#ks_agenda_controls>.ks-segmented>button[data-agenda-view="agenda_painel"]:not([data-ks-agenda-waitlist-toggle="1"])'),
                waitlistTogglePresent:!!document.querySelector('#ks_agenda_controls [data-ks-agenda-waitlist-toggle="1"]')
            });
        }
    });
})();
