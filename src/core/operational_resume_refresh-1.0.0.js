/* Agenda-only browser resume. No Home loaders, DOM writers or navigation interception. */
(function instalarOperationalResumeRefresh(){
    'use strict';

    const VERSION='1.3.0-agenda-only';
    const MIN_AUSENCIA_MS=1500;
    const TELA_REVALIDAVEL='tela_agenda';
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
