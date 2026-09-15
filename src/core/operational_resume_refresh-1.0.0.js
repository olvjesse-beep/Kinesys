/* KineSys — Operational Resume Refresh 1.0.0
 * Revalida somente a Agenda ao retornar ao navegador.
 * O Meu Dia Clínico possui ciclo de vida próprio em home_fisioterapeuta_util-1.24.0.js
 * e não deve ser recarregado, observado ou normalizado por este módulo.
 */
(function instalarOperationalResumeRefresh(){
    'use strict';

    const VERSION='1.1.1-home-dedupe-guard';
    const MIN_AUSENCIA_MS=1500;
    const TELA_REVALIDAVEL='tela_agenda';
    const PROFESSIONAL_HOME_SCRIPT='src/home/home_profissional_dashboard-1.0.0.js';
    const PROFESSIONAL_HOME_STYLE='styles/home_profissional_dashboard-1.0.0.css';
    const PROFESSIONAL_HOME_POLISH='src/home/home_profissional_polish-1.0.0.js';
    const PROFESSIONAL_HOME_ASSET_VERSION='20260915-home-dedupe-r6';
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
        if(tela!==TELA_REVALIDAVEL)return;
        if(!ausenteDesde){
            ausenteDesde=Date.now();
            telaAoAusentar=tela;
        }
        window.KineSysAgendaLifecycle?.suspend?.();
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

    function reativarAgendaSemReload(){
        if(telaAtual()===TELA_REVALIDAVEL)window.KineSysAgendaLifecycle?.activate?.();
    }

    async function processarRetorno(){
        if(destruido||document.visibilityState!=='visible'||!ausenteDesde)return false;
        const inicioAusencia=ausenteDesde;
        ausenteDesde=0;
        telaAoAusentar='';

        const duracao=Math.max(0,Date.now()-inicioAusencia);
        const tela=telaAtual();
        if(duracao<MIN_AUSENCIA_MS){
            reativarAgendaSemReload();
            return false;
        }
        if(!usuarioAtivo()||tela!==TELA_REVALIDAVEL){
            reativarAgendaSemReload();
            return false;
        }
        if(refreshEmCurso)return refreshEmCurso;

        refreshEmCurso=(async()=>{
            try {
                return await revalidarAgenda();
            } catch (erro) {
                console.warn('KineSys: falha ao revalidar a Agenda após retorno ao navegador.',erro);
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
