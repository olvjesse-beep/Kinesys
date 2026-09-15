/* KineSys — Operational Resume Refresh 1.0.0
 * Revalida dados operacionais ao retornar ao navegador sem criar polling novo.
 * Agenda: força leitura fresca dos agendamentos da semana.
 * Home: atualiza o Meu Dia Clínico do fisioterapeuta e o painel profissional focado.
 * Protege o Meu Dia contra renderização/linhas duplicadas após navegação Agenda -> Home.
 */
(function instalarOperationalResumeRefresh(){
    'use strict';

    const VERSION='1.0.2-meu-dia-observer';
    const MIN_AUSENCIA_MS=1500;
    const TELAS_REVALIDAVEIS=new Set(['tela_agenda','tela_home']);
    const PROFESSIONAL_HOME_SCRIPT='src/home/home_profissional_dashboard-1.0.0.js';
    const PROFESSIONAL_HOME_STYLE='styles/home_profissional_dashboard-1.0.0.css';
    const PROFESSIONAL_HOME_POLISH='src/home/home_profissional_polish-1.0.0.js';
    const PROFESSIONAL_HOME_ASSET_VERSION='20260912-home-mobile-r5';
    let ausenteDesde=0;
    let telaAoAusentar='';
    let refreshEmCurso=null;
    let destruido=false;
    let meuDiaEmCurso=null;
    let observadorMeuDia=null;
    let listaMeuDiaObservada=null;

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

    function chaveLinhaMeuDia(linha){
        const agendamentoId=String(linha?.dataset?.agendamentoId||'').trim();
        if(agendamentoId)return `agendamento:${agendamentoId}`;
        if(!linha?.classList?.contains('is-free'))return '';
        const inicio=String(linha.querySelector('.ks-fisio-day-time strong')?.textContent||'').trim();
        const faixa=String(linha.querySelector('.ks-fisio-day-category')?.textContent||'').trim();
        return inicio||faixa ? `livre:${inicio}|${faixa}` : '';
    }

    function normalizarMeuDiaClinico(){
        const cards=Array.from(document.querySelectorAll('#card_painel_fisioterapeuta'));
        if(cards.length>1)cards.slice(1).forEach(card=>card.remove());
        const card=cards[0]||null;
        const lista=card?.querySelector('#painel_fisio_lista')||document.getElementById('painel_fisio_lista');
        if(!lista)return false;

        const vistos=new Set();
        Array.from(lista.querySelectorAll('.ks-fisio-day-row')).forEach(linha=>{
            const chave=chaveLinhaMeuDia(linha);
            if(!chave)return;
            if(vistos.has(chave))linha.remove();
            else vistos.add(chave);
        });

        const linhas=Array.from(lista.querySelectorAll('.ks-fisio-day-row'));
        const atendimentos=linhas.filter(linha=>!!String(linha.dataset?.agendamentoId||'').trim());
        const livres=linhas.filter(linha=>linha.classList.contains('is-free'));
        const emAtendimento=atendimentos.filter(linha=>linha.classList.contains('is-current')).length;
        const concluidos=atendimentos.filter(linha=>linha.classList.contains('is-done')).length;
        const registrosPendentes=atendimentos.filter(linha=>linha.classList.contains('has-record-pending')).length;
        const resumo=card?.querySelector('#painel_fisio_resumo')||document.getElementById('painel_fisio_resumo');

        if(resumo&&linhas.length&&String(resumo.textContent||'').includes('Próximas 4 horas')){
            const partes=['Próximas 4 horas',`${atendimentos.length} atendimento(s)`,`${livres.length} horário(s) livre(s)`];
            if(emAtendimento)partes.push(`${emAtendimento} em atendimento`);
            if(concluidos)partes.push(`${concluidos} concluído(s)`);
            if(registrosPendentes)partes.push(`${registrosPendentes} registro(s) pendente(s)`);
            resumo.textContent=partes.join(' · ');
        }
        if(card)card.dataset.ksTotal=String(linhas.length);
        return true;
    }

    function observarMeuDiaClinico(){
        const lista=document.getElementById('painel_fisio_lista');
        if(!lista||typeof MutationObserver==='undefined')return false;
        if(observadorMeuDia&&listaMeuDiaObservada===lista)return true;
        observadorMeuDia?.disconnect();
        listaMeuDiaObservada=lista;
        observadorMeuDia=new MutationObserver(mudancas=>{
            if(destruido)return;
            const mudouFilhos=mudancas.some(m=>m.type==='childList'&&(m.addedNodes.length||m.removedNodes.length));
            if(mudouFilhos)normalizarMeuDiaClinico();
        });
        observadorMeuDia.observe(lista,{childList:true});
        normalizarMeuDiaClinico();
        return true;
    }

    function instalarProtecaoMeuDia(){
        observarMeuDiaClinico();
        const atual=window.carregarPainelFisioterapeuta;
        if(typeof atual!=='function'||atual.__kinesysMeuDiaIdempotente)return false;
        const original=atual;
        const protegido=function(...args){
            if(meuDiaEmCurso)return meuDiaEmCurso;
            meuDiaEmCurso=Promise.resolve(original.apply(this,args))
                .then(resultado=>{
                    observarMeuDiaClinico();
                    normalizarMeuDiaClinico();
                    return resultado;
                })
                .finally(()=>{meuDiaEmCurso=null;});
            return meuDiaEmCurso;
        };
        protegido.__kinesysMeuDiaIdempotente=true;
        protegido.__kinesysOriginal=original;
        window.carregarPainelFisioterapeuta=protegido;
        return true;
    }

    function marcarAusencia(){
        if(destruido)return;
        const tela=telaAtual();
        if(!TELAS_REVALIDAVEIS.has(tela))return;
        if(!ausenteDesde){
            ausenteDesde=Date.now();
            telaAoAusentar=tela;
        }
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
        instalarProtecaoMeuDia();
        if(typeof carregarPainelFisioterapeuta==='function'){
            await carregarPainelFisioterapeuta();
            atualizou=true;
        }
        if(window.KineSysProfessionalHome?.refresh){
            await window.KineSysProfessionalHome.refresh();
            atualizou=true;
        }
        observarMeuDiaClinico();
        normalizarMeuDiaClinico();
        window.KineSysProfessionalHomePolish?.refresh?.();
        return atualizou;
    }

    function reativarAgendaSemReload(){
        if(telaAtual()==='tela_agenda')window.KineSysAgendaLifecycle?.activate?.();
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

    function aoTelaAtivadaMeuDia(event){
        if(event.detail?.id!=='tela_home')return;
        instalarProtecaoMeuDia();
        observarMeuDiaClinico();
        setTimeout(()=>{
            observarMeuDiaClinico();
            normalizarMeuDiaClinico();
        },0);
    }

    function destroy(){
        if(destruido)return true;
        destruido=true;
        observadorMeuDia?.disconnect();
        observadorMeuDia=null;
        listaMeuDiaObservada=null;
        document.removeEventListener('visibilitychange',aoVisibilityChange);
        document.removeEventListener('kinesys:tela-ativada',aoTelaAtivadaMeuDia);
        window.removeEventListener('blur',aoBlur);
        window.removeEventListener('focus',aoFocus);
        window.removeEventListener('pagehide',aoPageHide);
        window.removeEventListener('pageshow',aoPageShow);
        reativarAgendaSemReload();
        return true;
    }

    garantirHomeProfissionalFocada();
    instalarProtecaoMeuDia();
    observarMeuDiaClinico();
    document.addEventListener('visibilitychange',aoVisibilityChange);
    document.addEventListener('kinesys:tela-ativada',aoTelaAtivadaMeuDia);
    window.addEventListener('blur',aoBlur,{passive:true});
    window.addEventListener('focus',aoFocus,{passive:true});
    window.addEventListener('pagehide',aoPageHide,{passive:true});
    window.addEventListener('pageshow',aoPageShow,{passive:true});

    window.KineSysOperationalResumeRefresh=Object.freeze({
        version:VERSION,
        refresh:processarRetorno,
        normalizeMeuDia:normalizarMeuDiaClinico,
        observeMeuDia:observarMeuDiaClinico,
        destroy,
        status(){
            return Object.freeze({
                away:!!ausenteDesde,
                awayScreen:telaAoAusentar,
                refreshing:!!refreshEmCurso,
                observingMeuDia:!!observadorMeuDia,
                currentScreen:telaAtual()
            });
        }
    });
})();
