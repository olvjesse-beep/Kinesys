/* KineSys — Agenda Lifecycle 1.0.0
 * Suspende apenas trabalho visual da Agenda quando a tela fica inativa.
 * Não interfere na sincronização confiável de pendências/offline.
 */
(function instalarAgendaLifecycle(){
    'use strict';

    const VERSION='1.0.0';
    const MOBILE_STYLE_ID='ks_agenda_mobile_style';
    const MOBILE_STYLE_SRC='styles/agenda_mobile-1.0.0.css?v=20260913-mobile-r1';
    let relogioTimer=null;
    let resizeObserver=null;
    let listenersAtivos=false;
    let destruido=false;

    function telaAgendaAtiva(){
        return !!document.getElementById('tela_agenda')?.classList.contains('ativa');
    }

    function garantirEstiloMobileAgenda(){
        if(document.getElementById(MOBILE_STYLE_ID))return;
        const link=document.createElement('link');
        link.id=MOBILE_STYLE_ID;
        link.rel='stylesheet';
        link.href=new URL(MOBILE_STYLE_SRC,document.baseURI).href;
        link.dataset.kinesysAgendaMobile='1';
        document.head.appendChild(link);
    }

    function sincronizarEstadoVisualAgenda(){
        if(!telaAgendaAtiva())return;
        document.body.dataset.tela='tela_agenda';
        const titulo=document.getElementById('ks_page_title');
        const subtitulo=document.getElementById('ks_page_subtitle');
        if(titulo)titulo.textContent='Agenda';
        if(subtitulo)subtitulo.textContent='Semana de atendimento e disponibilidade';
        document.querySelectorAll('#dropdownContent li[data-tela-menu]').forEach(item=>{
            item.classList.toggle('ks-active',item.dataset.telaMenu==='tela_agenda');
        });
    }

    function atualizarSeAtiva(){
        if(destruido||!telaAgendaAtiva()||document.visibilityState!=='visible')return;
        if(typeof atualizarMarcadorAgoraAgenda==='function')atualizarMarcadorAgoraAgenda();
    }

    function aoVisibilityChange(){atualizarSeAtiva();}
    function aoResize(){atualizarSeAtiva();}

    function observarGrade(){
        if(resizeObserver||typeof ResizeObserver==='undefined')return;
        const grade=document.getElementById('agenda_semana_grade');
        if(!grade)return;
        resizeObserver=new ResizeObserver(()=>atualizarSeAtiva());
        resizeObserver.observe(grade);
    }

    function activate(){
        if(destruido||!telaAgendaAtiva())return false;
        garantirEstiloMobileAgenda();
        sincronizarEstadoVisualAgenda();
        atualizarSeAtiva();
        if(!listenersAtivos){
            document.addEventListener('visibilitychange',aoVisibilityChange);
            window.addEventListener('resize',aoResize,{passive:true});
            listenersAtivos=true;
        }
        if(!relogioTimer){
            relogioTimer=setInterval(atualizarSeAtiva,30000);
        }
        observarGrade();
        return true;
    }

    function suspend(){
        if(relogioTimer){clearInterval(relogioTimer);relogioTimer=null;}
        if(resizeObserver){resizeObserver.disconnect();resizeObserver=null;}
        if(listenersAtivos){
            document.removeEventListener('visibilitychange',aoVisibilityChange);
            window.removeEventListener('resize',aoResize);
            listenersAtivos=false;
        }
        return true;
    }

    function destroy(){
        suspend();
        destruido=true;
        document.removeEventListener('kinesys:tela-ativada',aoTelaAtivada);
        document.removeEventListener('kinesys:tela-desativada',aoTelaDesativada);
        return true;
    }

    function aoTelaAtivada(event){
        if(event.detail?.id==='tela_agenda')activate();
    }

    function aoTelaDesativada(event){
        if(event.detail?.id==='tela_agenda')suspend();
    }

    function iniciarRelogioAgendaLifecycle(){return activate();}
    iniciarRelogioAgendaLifecycle.__kinesysLifecycle=true;

    if(typeof iniciarRelogioAgenda==='function'){
        iniciarRelogioAgenda=iniciarRelogioAgendaLifecycle;
    }

    document.addEventListener('kinesys:tela-ativada',aoTelaAtivada);
    document.addEventListener('kinesys:tela-desativada',aoTelaDesativada);

    window.KineSysAgendaLifecycle=Object.freeze({
        version:VERSION,
        activate,
        suspend,
        destroy,
        status(){
            return Object.freeze({
                active:telaAgendaAtiva(),
                timer:!!relogioTimer,
                observer:!!resizeObserver,
                listeners:listenersAtivos,
                destroyed:destruido
            });
        }
    });
})();
