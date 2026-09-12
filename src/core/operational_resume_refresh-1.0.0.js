/* KineSys — Operational Resume Refresh 1.0.0
 * Revalida dados operacionais ao retornar ao navegador sem criar polling novo.
 * Agenda: força leitura fresca dos agendamentos da semana.
 * Home: atualiza o Meu Dia Clínico do fisioterapeuta.
 */
(function instalarOperationalResumeRefresh(){
    'use strict';

    const VERSION='1.0.0';
    const MIN_AUSENCIA_MS=1500;
    const TELAS_REVALIDAVEIS=new Set(['tela_agenda','tela_home']);
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
        if(typeof carregarPainelFisioterapeuta!=='function')return false;
        await carregarPainelFisioterapeuta();
        return true;
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
