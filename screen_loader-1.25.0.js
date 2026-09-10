/* KineSys 1.25 — carregamento sob demanda e ciclo de vida das telas.
 * Fase 2A: preserva IDs, funções públicas, contratos e regras clínicas.
 * Módulos são baixados apenas no primeiro acesso e permanecem em memória.
 */
(function(){
    'use strict';

    const VERSION='1.25.0-phase2b';
    const carregamentos=new Map();
    const estilos=new Map();
    const bundles=new Map();
    let revisaoNavegacao=0;
    let telaAtiva=document.querySelector('.tela.ativa')?.id||'';

    const BUNDLES=Object.freeze({
        tela_avaliacao:Object.freeze({
            id:'avaliacao',
            styles:Object.freeze([
                'design_evaluation_workspace-1.18.0.css',
                'design_evaluation_context-1.18.3.css',
                'avaliacao_experiencia-1.22.0.css?v=20260904-tabs-r1',
                'clinical_reasoning_hma-3.0.0.css?v=20260910-r1',
                'clinical_reasoning_shoulder-3.1.0.css?v=20260910-r2',
                'clinical_reasoning_elbow-3.1.0.css?v=20260910-r1',
                'radar_clinico_focus-3.0.0.css?v=20260910-r1',
                'dialog_rascunho_focus-1.0.0.css?v=20260910-r1'
            ]),
            scripts:Object.freeze([
                'clinical_engine-1.17.0.js',
                'evaluation_workspace-1.17.0.js',
                'proms_escalas.js',
                'evaluation_context_panels-1.18.3.js',
                'avaliacao_experiencia-1.22.0.js?v=20260904-tabs-r1',
                'clinical_reasoning_hma-3.0.0.js?v=20260910-perf-r2',
                'clinical_reasoning_shoulder-3.1.0.js?v=20260910-lang-r3',
                'clinical_reasoning_elbow-3.1.0.js?v=20260910-r1'
            ]),
            afterLoad(){
                if(typeof window.atualizarMotorClinico3KineSys==='function'){
                    window.atualizarMotorClinico3KineSys(true);
                }
            }
        })
    });

    function urlAbsoluta(src){return new URL(src,document.baseURI).href;}

    function carregarEstilo(src){
        const href=urlAbsoluta(src);
        if(estilos.has(href))return estilos.get(href);
        const existente=Array.from(document.querySelectorAll('link[rel="stylesheet"][href]')).find(link=>link.href===href);
        if(existente){
            const pronta=Promise.resolve(existente);
            estilos.set(href,pronta);
            return pronta;
        }
        const promessa=new Promise((resolve,reject)=>{
            const link=document.createElement('link');
            link.rel='stylesheet';link.href=src;link.dataset.kinesysLazy='1';
            link.addEventListener('load',()=>resolve(link),{once:true});
            link.addEventListener('error',()=>reject(new Error('Falha ao carregar estilo: '+src)),{once:true});
            document.head.appendChild(link);
        });
        estilos.set(href,promessa);
        promessa.catch(()=>estilos.delete(href));
        return promessa;
    }

    function carregarScript(src){
        const href=urlAbsoluta(src);
        if(carregamentos.has(href))return carregamentos.get(href);
        const existente=Array.from(document.scripts).find(script=>script.src===href);
        if(existente){
            const pronta=Promise.resolve(existente);
            carregamentos.set(href,pronta);
            return pronta;
        }
        const promessa=new Promise((resolve,reject)=>{
            const script=document.createElement('script');
            script.src=src;script.async=false;script.dataset.kinesysLazy='1';
            script.addEventListener('load',()=>resolve(script),{once:true});
            script.addEventListener('error',()=>reject(new Error('Falha ao carregar módulo: '+src)),{once:true});
            document.body.appendChild(script);
        });
        carregamentos.set(href,promessa);
        promessa.catch(()=>carregamentos.delete(href));
        return promessa;
    }

    async function carregarScriptsEmOrdem(lista){
        for(const src of lista)await carregarScript(src);
    }

    function bundleDaTela(idTela){return BUNDLES[idTela]||null;}

    function podeCarregarTela(idTela){
        if(idTela==='tela_login')return true;
        if(typeof usuarioLogado!=='undefined'&&!usuarioLogado)return false;
        if(typeof telaPermitida==='function'&&typeof usuarioLogado!=='undefined'&&usuarioLogado&&!telaPermitida(idTela))return false;
        return true;
    }

    async function garantirTela(idTela){
        const bundle=bundleDaTela(idTela);
        if(!bundle)return true;
        if(bundles.get(bundle.id)==='loaded')return true;
        if(bundles.get(bundle.id) instanceof Promise)return bundles.get(bundle.id);

        const promessa=(async()=>{
            await Promise.all([
                Promise.all(bundle.styles.map(carregarEstilo)),
                carregarScriptsEmOrdem(bundle.scripts)
            ]);
            bundle.afterLoad?.();
            bundles.set(bundle.id,'loaded');
            document.dispatchEvent(new CustomEvent('kinesys:tela-modulos-prontos',{detail:{id:idTela,bundle:bundle.id,versao:VERSION}}));
            return true;
        })().catch(error=>{
            bundles.delete(bundle.id);
            throw error;
        });
        bundles.set(bundle.id,promessa);
        return promessa;
    }

    function notificarCicloVida(){
        const atual=document.querySelector('.tela.ativa')?.id||'';
        if(!atual||atual===telaAtiva)return;
        const anterior=telaAtiva;
        telaAtiva=atual;
        if(anterior)document.dispatchEvent(new CustomEvent('kinesys:tela-desativada',{detail:{id:anterior,proxima:atual}}));
        document.dispatchEvent(new CustomEvent('kinesys:tela-ativada',{detail:{id:atual,anterior}}));
    }

    function feedbackFalha(idTela,error){
        console.error('KineSys: falha ao preparar módulos da tela',idTela,error);
        const mensagem='Não foi possível carregar este módulo agora. Verifique a conexão e tente novamente.';
        if(typeof window.mostrarToastKineSys==='function')window.mostrarToastKineSys(mensagem,'erro',6500);
        else if(typeof window.mostrarFeedbackLogin==='function'&&idTela==='tela_login')window.mostrarFeedbackLogin(mensagem,'erro');
        else window.alert(mensagem);
    }

    function instalarNavegacaoSobDemanda(){
        const original=window.navegarPara;
        if(typeof original!=='function'||original.__kinesysScreenLoader)return;

        const sobDemanda=function(idTela,contextoEdicao=false){
            const id=String(idTela||'');
            const bundle=bundleDaTela(id);
            const revisao=++revisaoNavegacao;

            if(!bundle||!podeCarregarTela(id)){
                const resultado=original.apply(this,arguments);
                notificarCicloVida();
                return resultado;
            }

            const tela=document.getElementById(id);
            tela?.setAttribute('aria-busy','true');
            document.body.classList.add('kinesys-carregando-tela');

            return garantirTela(id).then(()=>{
                if(revisao!==revisaoNavegacao)return false;
                const resultado=original.call(this,id,contextoEdicao);
                notificarCicloVida();
                return resultado;
            }).catch(error=>{
                if(revisao===revisaoNavegacao)feedbackFalha(id,error);
                return false;
            }).finally(()=>{
                tela?.removeAttribute('aria-busy');
                if(revisao===revisaoNavegacao)document.body.classList.remove('kinesys-carregando-tela');
            });
        };
        sobDemanda.__kinesysScreenLoader=true;
        sobDemanda.__original=original;
        window.navegarPara=sobDemanda;
    }

    instalarNavegacaoSobDemanda();

    window.KineSysScreenLoader=Object.freeze({
        version:VERSION,
        ensure:garantirTela,
        isLoaded(idTela){const bundle=bundleDaTela(idTela);return !bundle||bundles.get(bundle.id)==='loaded';},
        current(){return document.querySelector('.tela.ativa')?.id||telaAtiva||'';}
    });
})();
