/* KineSys — Agenda Lifecycle 1.0.0
 * Suspende apenas trabalho visual da Agenda quando a tela fica inativa.
 * Não interfere na sincronização confiável de pendências/offline.
 */
(function instalarAgendaLifecycle(){
    'use strict';

    const VERSION='1.0.0-r41';
    const MOBILE_STYLE_ID='ks_agenda_mobile_style';
    const MOBILE_STYLE_SRC='styles/agenda_mobile-1.0.0.css?v=20260913-mobile-r2';
    const MOBILE_GRID_STYLE_ID='ks_agenda_mobile_grid_style';
    const MOBILE_GRID_STYLE_SRC='styles/agenda_mobile_grid-1.0.0.css?v=20260913-grid-r19';
    const MOBILE_ORDER_STYLE_ID='ks_agenda_mobile_order_style';
    const MOBILE_ORDER_STYLE_SRC='styles/agenda_mobile_order-1.0.0.css?v=20260914-postgrid-r41';
    const origensMobile=new Map();
    let relogioTimer=null;
    let resizeObserver=null;
    let mutationObserver=null;
    let structureObserver=null;
    let listenersAtivos=false;
    let alinharHojePendente=false;
    let organizacaoMobilePendente=false;
    let organizandoMobile=false;
    let destruido=false;

    function telaAgendaAtiva(){
        return !!document.getElementById('tela_agenda')?.classList.contains('ativa');
    }

    function modoMobileAgenda(){
        return !!window.matchMedia?.('(max-width: 760px)').matches;
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
        garantirLinkEstilo(MOBILE_ORDER_STYLE_ID,MOBILE_ORDER_STYLE_SRC,'kinesysAgendaMobileOrder');
    }

    function registrarOrigemMobile(no){
        if(!no||origensMobile.has(no)||!no.parentNode)return;
        const marcador=document.createComment('ks-agenda-mobile-origin');
        no.parentNode.insertBefore(marcador,no);
        origensMobile.set(no,marcador);
    }

    function restaurarAlternadorListaEspera(){
        const alternador=document.querySelector('#ks_agenda_controls [data-ks-agenda-waitlist-toggle="1"]');
        if(!alternador)return;
        alternador.dataset.agendaView='agenda_lista_espera';
        alternador.textContent='Lista de espera';
        alternador.title='Abrir lista de espera';
        alternador.setAttribute('aria-label','Abrir lista de espera');
        alternador.classList.remove('active');
    }

    function restaurarOrdemDesktopAgenda(){
        Array.from(origensMobile.entries()).reverse().forEach(([no,marcador])=>{
            if(marcador.parentNode){
                marcador.parentNode.insertBefore(no,marcador.nextSibling);
                marcador.remove();
            }
        });
        origensMobile.clear();
        document.getElementById('ks_agenda_mobile_order')?.remove();
        document.getElementById('ks_agenda_mobile_post_grid')?.remove();
        restaurarAlternadorListaEspera();
        const tela=document.getElementById('tela_agenda');
        if(tela)delete tela.dataset.agendaSubtela;
    }

    function prepararAlternadorListaEsperaMobile(){
        const tabs=document.getElementById('ks_agenda_controls');
        const segmented=tabs?.querySelector('.ks-segmented');
        if(!tabs||!segmented)return null;

        let alternador=segmented.querySelector('[data-ks-agenda-waitlist-toggle="1"]');
        if(!alternador){
            alternador=segmented.querySelector('[data-agenda-view="agenda_lista_espera"]');
            if(alternador)alternador.dataset.ksAgendaWaitlistToggle='1';
        }

        const semanaRedundante=Array.from(segmented.querySelectorAll('[data-agenda-view="agenda_painel"]'))
            .find(botao=>botao!==alternador&&!botao.dataset.ksAgendaWaitlistToggle);
        if(semanaRedundante){
            registrarOrigemMobile(semanaRedundante);
            semanaRedundante.remove();
        }

        if(!tabs.dataset.ksAgendaMobileModeListener){
            tabs.addEventListener('click',()=>requestAnimationFrame(sincronizarSubtelaMobile));
            tabs.dataset.ksAgendaMobileModeListener='1';
        }
        return alternador;
    }

    function removerControlesSuperioresMobileAgenda(){
        if(!modoMobileAgenda())return false;
        const nav=document.querySelector('#tela_agenda .agenda-semana-nav');
        if(nav){
            registrarOrigemMobile(nav);
            nav.remove();
        }
        prepararAlternadorListaEsperaMobile();
        return true;
    }

    function garantirHostTopo(tela,painel){
        if(!tela||!painel)return null;
        let host=document.getElementById('ks_agenda_mobile_order');
        if(!host){
            host=document.createElement('div');
            host.id='ks_agenda_mobile_order';
            host.className='ks-agenda-mobile-order';
        }
        if(host.parentElement!==tela||host.nextElementSibling!==painel)tela.insertBefore(host,painel);
        return host;
    }

    function garantirHostPosGrade(painel){
        if(!painel)return null;
        let host=document.getElementById('ks_agenda_mobile_post_grid');
        if(!host){
            host=document.createElement('div');
            host.id='ks_agenda_mobile_post_grid';
            host.className='ks-agenda-mobile-post-grid';
        }
        if(painel.nextElementSibling!==host)painel.insertAdjacentElement('afterend',host);
        return host;
    }

    function sincronizarSubtelaMobile(){
        const painel=document.getElementById('agenda_painel');
        if(!painel)return;
        const listaAtiva=!painel.classList.contains('ativa');
        const hostTopo=document.getElementById('ks_agenda_mobile_order');
        const hostPosGrade=document.getElementById('ks_agenda_mobile_post_grid');
        const tela=document.getElementById('tela_agenda');
        if(hostTopo)hostTopo.dataset.subtela=listaAtiva?'lista':'semana';
        if(hostPosGrade)hostPosGrade.dataset.subtela=listaAtiva?'lista':'semana';
        if(tela)tela.dataset.agendaSubtela=listaAtiva?'lista':'semana';

        const alternador=prepararAlternadorListaEsperaMobile();
        if(alternador){
            alternador.dataset.agendaView=listaAtiva?'agenda_painel':'agenda_lista_espera';
            alternador.textContent=listaAtiva?'Voltar para agenda':'Lista de espera';
            alternador.title=listaAtiva?'Voltar para agenda':'Abrir lista de espera';
            alternador.setAttribute('aria-label',alternador.title);
            alternador.classList.remove('active');
        }
    }

    function organizarControlesMobileAgenda(){
        if(organizandoMobile)return true;
        organizandoMobile=true;
        try{
            const mobile=modoMobileAgenda();
            if(!mobile){
                restaurarOrdemDesktopAgenda();
                return true;
            }

            removerControlesSuperioresMobileAgenda();

            const tela=document.getElementById('tela_agenda');
            const tabs=document.getElementById('ks_agenda_controls');
            const painel=document.getElementById('agenda_painel');
            const card=painel?.querySelector('.agenda-card-semanal');
            if(!tela||!tabs||!painel||!card){
                sincronizarSubtelaMobile();
                return false;
            }

            const hostTopo=garantirHostTopo(tela,painel);
            const hostPosGrade=garantirHostPosGrade(painel);
            const visoes=painel.querySelector('.agenda-visoes')||document.querySelector('#ks_agenda_mobile_order .agenda-visoes');
            const novo=painel.querySelector('.ks-new-appointment')||document.querySelector('#ks_agenda_mobile_order .ks-new-appointment');
            const historico=document.querySelector('#tela_agenda .agenda-audit-btn');

            [visoes,novo,tabs,historico].filter(Boolean).forEach(registrarOrigemMobile);

            if(hostTopo){
                if(visoes&&visoes.parentElement!==hostTopo)hostTopo.appendChild(visoes);
                if(novo&&novo.parentElement!==hostTopo)hostTopo.appendChild(novo);
            }

            if(hostPosGrade){
                if(tabs.parentElement!==hostPosGrade)hostPosGrade.appendChild(tabs);
                if(historico&&historico.parentElement!==hostPosGrade)hostPosGrade.appendChild(historico);
            }

            sincronizarSubtelaMobile();
            return true;
        }finally{
            organizandoMobile=false;
        }
    }

    function agendarOrganizacaoMobile(){
        if(organizacaoMobilePendente||destruido||!modoMobileAgenda())return;
        organizacaoMobilePendente=true;
        requestAnimationFrame(()=>{
            organizacaoMobilePendente=false;
            if(telaAgendaAtiva())organizarControlesMobileAgenda();
        });
    }

    function observarEstruturaMobileAgenda(){
        if(structureObserver||typeof MutationObserver==='undefined')return;
        const tela=document.getElementById('tela_agenda');
        if(!tela)return;
        structureObserver=new MutationObserver(()=>agendarOrganizacaoMobile());
        structureObserver.observe(tela,{childList:true,subtree:true,attributes:true,attributeFilter:['class','hidden']});
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
        if(!modoMobileAgenda())return true;
        const scroll=document.querySelector('#agenda_painel .agenda-grade-scroll');
        if(!scroll)return false;
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
    function aoResize(){
        organizarControlesMobileAgenda();
        atualizarSeAtiva();
    }

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
        organizarControlesMobileAgenda();
        observarEstruturaMobileAgenda();
        alinharHojePendente=true;
        atualizarSeAtiva();
        if(!listenersAtivos){
            document.addEventListener('visibilitychange',aoVisibilityChange);
            window.addEventListener('resize',aoResize,{passive:true});
            listenersAtivos=true;
        }
        if(!relogioTimer)relogioTimer=setInterval(atualizarSeAtiva,30000);
        observarGrade();
        requestAnimationFrame(()=>{
            organizarControlesMobileAgenda();
            sincronizarGradeRenderizada();
        });
        return true;
    }

    function suspend(){
        if(relogioTimer){clearInterval(relogioTimer);relogioTimer=null;}
        if(resizeObserver){resizeObserver.disconnect();resizeObserver=null;}
        if(mutationObserver){mutationObserver.disconnect();mutationObserver=null;}
        if(structureObserver){structureObserver.disconnect();structureObserver=null;}
        alinharHojePendente=false;
        organizacaoMobilePendente=false;
        if(listenersAtivos){
            document.removeEventListener('visibilitychange',aoVisibilityChange);
            window.removeEventListener('resize',aoResize);
            listenersAtivos=false;
        }
        return true;
    }

    function destroy(){
        suspend();
        restaurarOrdemDesktopAgenda();
        destruido=true;
        document.removeEventListener('kinesys:tela-ativada',aoTelaAtivada);
        document.removeEventListener('kinesys:tela-desativada',aoTelaDesativada);
        return true;
    }

    function aoTelaAtivada(event){if(event.detail?.id==='tela_agenda')activate();}
    function aoTelaDesativada(event){if(event.detail?.id==='tela_agenda')suspend();}

    function iniciarRelogioAgendaLifecycle(){return activate();}
    iniciarRelogioAgendaLifecycle.__kinesysLifecycle=true;
    if(typeof iniciarRelogioAgenda==='function')iniciarRelogioAgenda=iniciarRelogioAgendaLifecycle;

    document.addEventListener('kinesys:tela-ativada',aoTelaAtivada);
    document.addEventListener('kinesys:tela-desativada',aoTelaDesativada);

    requestAnimationFrame(()=>{
        if(modoMobileAgenda()){
            removerControlesSuperioresMobileAgenda();
            organizarControlesMobileAgenda();
            observarEstruturaMobileAgenda();
        }
    });

    window.KineSysAgendaLifecycle=Object.freeze({
        version:VERSION,
        activate,
        suspend,
        destroy,
        status(){
            const topo=document.getElementById('ks_agenda_mobile_order');
            const pos=document.getElementById('ks_agenda_mobile_post_grid');
            const visoes=document.querySelector('#tela_agenda .agenda-visoes');
            const novo=document.querySelector('#tela_agenda .ks-new-appointment');
            const tabs=document.getElementById('ks_agenda_controls');
            const historico=document.querySelector('#tela_agenda .agenda-audit-btn');
            return Object.freeze({
                active:telaAgendaAtiva(),
                timer:!!relogioTimer,
                observer:!!resizeObserver||!!mutationObserver||!!structureObserver,
                listeners:listenersAtivos,
                mobileOrder:!!topo,
                postGrid:!!pos,
                topNavigationRemoved:modoMobileAgenda()&&!document.querySelector('#tela_agenda .agenda-semana-nav'),
                clinicProfessionalOnTop:!!topo&&topo.contains(visoes),
                newAppointmentOnTop:!!topo&&topo.contains(novo),
                waitlistAfterAgenda:!!pos&&pos.contains(tabs),
                historyAfterAgenda:!!pos&&pos.contains(historico),
                destroyed:destruido
            });
        }
    });
})();
