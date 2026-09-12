/* KineSys — Operational Resume Refresh 1.0.0
 * Revalida dados operacionais ao retornar ao navegador sem criar polling novo.
 * Agenda: força leitura fresca dos agendamentos da semana.
 * Home: atualiza o Meu Dia Clínico do fisioterapeuta e o painel profissional focado.
 */
(function instalarOperationalResumeRefresh(){
    'use strict';

    const VERSION='1.0.0';
    const MIN_AUSENCIA_MS=1500;
    const TELAS_REVALIDAVEIS=new Set(['tela_agenda','tela_home']);
    const PROFESSIONAL_HOME_SCRIPT='src/home/home_profissional_dashboard-1.0.0.js';
    const PROFESSIONAL_HOME_STYLE='styles/home_profissional_dashboard-1.0.0.css';
    const PROFESSIONAL_HOME_POLISH='src/home/home_profissional_polish-1.0.0.js';
    const PROFESSIONAL_HOME_ASSET_VERSION='20260912-home-mobile-r4';
    let ausenteDesde=0;
    let telaAoAusentar='';
    let refreshEmCurso=null;
    let destruido=false;

    function telaAtual(){
        try {
            return String(window.KineSysScreenLoader?.current?.() || document.querySelector('.tela.ativa')?.id || '');
        } catch (_) {
            return String(document.querySelector('.tela.ativa')?.id || '');
        }
    }

    function usuarioAtivo(){
        return typeof usuarioLogado!=='undefined' && !!usuarioLogado;
    }

    function carregarScriptUmaVez(base,globalName){
        if(globalName&&window[globalName])return;
        if(document.querySelector(`script[src^="${base}"]`))return;
        const script=document.createElement('script');
        script.src=`${base}?v=${PROFESSIONAL_HOME_ASSET_VERSION}`;
        script.async=false;
        document.body.appendChild(script);
    }

    function garantirHomeProfissionalFocada(){
        if(!document.querySelector(`link[href^="${PROFESSIONAL_HOME_STYLE}"]`)){
            const link=document.createElement('link');
            link.rel='stylesheet';
            link.href=`${PROFESSIONAL_HOME_STYLE}?v=${PROFESSIONAL_HOME_ASSET_VERSION}`;
            document.head.appendChild(link);
        }
        carregarScriptUmaVez(PROFESSIONAL_HOME_SCRIPT,'KineSysProfessionalHome');
        carregarScriptUmaVez(PROFESSIONAL_HOME_POLISH,'KineSysProfessionalHomePolish');
    }

    function marcarAusencia(){
        if(destruido)return;
        const tela=telaAtual();
        if(!TELAS_REVALIDAVEIS.has(tela))return;
        if(!ausenteDesde){
            ausenteDesde=Date.now();
            telaAoAusentar=tela;
        }
        // O lifecycle visual da Agenda já sabe parar relógio/observer/listeners.
        // A sincronização confiável de pendências permanece independente.
        if(tela==='tela_agenda')window.KineSysAgendaLifecycle?.suspend?.();
    }

    async function revalidarAgenda(){
        window.KineSysAgendaLifecycle?.activate?.();
        if(typeof invalidarCacheAgendaSemana==='function')invalidarCacheAgendaSemana();
        if(typeof renderizarPainelAgenda==='function'){
            await renderizarPainelAgenda();
            return true;
        }
        if(typeof inicializarAgenda==='function'){
            await inicializarAgenda();
            return true;
        }
        return false;
    }

    async function revalidarMeuDiaClinico(){
        let atualizou=false;
        if(typeof carregarPainelFisioterapeuta==='function'){
            await carregarPainelFisioterapeuta();
            atualizou=true;
        }
        if(window.KineSysProfessionalHome?.refresh){
            await window.KineSysProfessionalHome.refresh();
            atualizou=true;
        }
        window.KineSysProfessionalHomePolish?.refresh?.();
        return atualizou;
    }

    function reativarAgendaSemReload(){
        if(telaAtual()==='tela_agenda')window.KineSysAgendaLifecycle?.activate?.();
    }

    async function processarRetorno(){
        if(destruido||document.visibilityState!=='visible'||!ausenteDesde)return false;
        const inicioAusencia=ausenteDesde;
        const telaAnterior=telaAoAusentar;
        ausenteDesde=0;
        telaAoAusentar='';

        const duracao=Math.max(0,Date.now()-inicioAusencia);
        const tela=telaAtual();
        if(duracao<MIN_AUSENCIA_MS){
            reativarAgendaSemReload();
            return false;
        }
        if(!usuarioAtivo()||!TELAS_REVALIDAVEIS.has(tela)){
            reativarAgendaSemReload();
            return false;
        }
        if(refreshEmCurso)return refreshEmCurso;

        refreshEmCurso=(async()=>{
            try {
                if(tela==='tela_agenda')return await revalidarAgenda();
                if(tela==='tela_home')return await revalidarMeuDiaClinico();
                return false;
            } catch (erro) {
                console.warn('KineSys: falha ao revalidar dados após retorno ao navegador.',erro);
                return false;
            } finally {
                refreshEmCurso=null;
            }
        })();
        return refreshEmCurso;
    }

    function aoVisibilityChange(){
        if(document.visibilityState==='hidden')marcarAusencia();
        else processarRetorno();
    }
    function aoBlur(){marcarAusencia();}
    function aoFocus(){processarRetorno();}
    function aoPageHide(){marcarAusencia();}
    function aoPageShow(event){if(event.persisted)processarRetorno();}

    function destroy(){
        if(destruido)return true;
        destruido=true;
        document.removeEventListener('visibilitychange',aoVisibilityChange);
        window.removeEventListener('blur',aoBlur);
        window.removeEventListener('focus',aoFocus);
        window.removeEventListener('pagehide',aoPageHide);
        window.removeEventListener('pageshow',aoPageShow);
        reativarAgendaSemReload();
        return true;
    }

    garantirHomeProfissionalFocada();
    document.addEventListener('visibilitychange',aoVisibilityChange);
    window.addEventListener('blur',aoBlur,{passive:true});
    window.addEventListener('focus',aoFocus,{passive:true});
    window.addEventListener('pagehide',aoPageHide,{passive:true});
    window.addEventListener('pageshow',aoPageShow,{passive:true});

    window.KineSysOperationalResumeRefresh=Object.freeze({
        version:VERSION,
        refresh:processarRetorno,
        destroy,
        status(){
            return Object.freeze({
                away:!!ausenteDesde,
                awayScreen:telaAoAusentar,
                refreshing:!!refreshEmCurso,
                currentScreen:telaAtual()
            });
        }
    });
})();
