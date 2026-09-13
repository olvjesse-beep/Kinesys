/* KineSys — Agenda Lifecycle 1.0.0
 * Suspende apenas trabalho visual da Agenda quando a tela fica inativa.
 * Não interfere na sincronização confiável de pendências/offline.
 */
(function instalarAgendaLifecycle(){
    'use strict';

    const VERSION='1.0.0';
    const MOBILE_STYLE_ID='ks_agenda_mobile_style';
    const MOBILE_STYLE_SRC='styles/agenda_mobile-1.0.0.css?v=20260913-mobile-r2';
    const MOBILE_GRID_STYLE_ID='ks_agenda_mobile_grid_style';
    const MOBILE_GRID_STYLE_SRC='styles/agenda_mobile_grid-1.0.0.css?v=20260913-grid-r18';
    let relogioTimer=null;
    let resizeObserver=null;
    let mutationObserver=null;
    let listenersAtivos=false;
    let alinharHojePendente=false;
    let destruido=false;

    function telaAgendaAtiva(){
        return !!document.getElementById('tela_agenda')?.classList.contains('ativa');
    }

    function garantirLinkEstilo(id,src,marcador){
        if(document.getElementById(id)||document.querySelector(`link[href*="${src.split('?')[0]}"]`))return;
        const link=document.createElement('link');
        link.id=id;
        link.rel='stylesheet';
        link.href=new URL(src,document.baseURI).href;
        link.dataset[marcador]='1';
        document.head.appendChild(link);
    }

    function garantirEstiloMobileAgenda(){
        garantirLinkEstilo(MOBILE_STYLE_ID,MOBILE_STYLE_SRC,'kinesysAgendaMobile');
        garantirLinkEstilo(MOBILE_GRID_STYLE_ID,MOBILE_GRID_STYLE_SRC,'kinesysAgendaMobileGrid');
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

    function alinharHojeNaGradeMobile(){
        if(!window.matchMedia?.('(max-width: 760px)').matches)return true;
        const scroll=document.querySelector('#agenda_painel .agenda-grade-scroll');
        if(!scroll)return false;
        const modoDia=!!document.querySelector('#agenda_painel [data-agenda-periodo="dia"][aria-pressed="true"]');
        if(modoDia){scroll.scrollLeft=0;return true;}
        const hoje=document.querySelector('#agenda_painel .agenda-dia-cabecalho.hoje');
        if(!hoje)return false;
        const alvo=hoje.offsetLeft-((scroll.clientWidth-hoje.offsetWidth)/2);
        scroll.scrollLeft=Math.max(0,alvo);
        return true;
    }

    function atualizarSeAtiva(){
        if(destruido||!telaAgendaAtiva()||document.visibilityState!=='visible')return;
        if(typeof atualizarMarcadorAgoraAgenda==='function')atualizarMarcadorAgoraAgenda();
    }

    function tentarAlinharHoje(){
        if(alinharHojePendente&&alinharHojeNaGradeMobile())alinharHojePendente=false;
    }

    function sincronizarGradeRenderizada(){
        atualizarSeAtiva();
        tentarAlinharHoje();
    }

    function aoVisibilityChange(){atualizarSeAtiva();}
    function aoResize(){atualizarSeAtiva();}

    function observarGrade(){
        const grade=document.getElementById('agenda_semana_grade');
        if(!grade)return;
        if(!resizeObserver&&typeof ResizeObserver!=='undefined'){
            resizeObserver=new ResizeObserver(()=>sincronizarGradeRenderizada());
            resizeObserver.observe(grade);
        }
        if(!mutationObserver&&typeof MutationObserver!=='undefined'){
            mutationObserver=new MutationObserver(()=>tentarAlinharHoje());
            mutationObserver.observe(grade,{childList:true,subtree:true});
        }
    }

    function activate(){
        if(destruido||!telaAgendaAtiva())return false;
        garantirEstiloMobileAgenda();
        sincronizarEstadoVisualAgenda();
        alinharHojePendente=true;
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
        requestAnimationFrame(()=>sincronizarGradeRenderizada());
        return true;
    }

    function suspend(){
        if(relogioTimer){clearInterval(relogioTimer);relogioTimer=null;}
        if(resizeObserver){resizeObserver.disconnect();resizeObserver=null;}
        if(mutationObserver){mutationObserver.disconnect();mutationObserver=null;}
        alinharHojePendente=false;
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
                observer:!!resizeObserver||!!mutationObserver,
                listeners:listenersAtivos,
                destroyed:destruido
            });
        }
    });
})();
