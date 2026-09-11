/* KineSys — Clinical Region Loader 1.0.0
 * Carrega banco clínico completo e motores 3.1 somente quando uma região é necessária.
 * Preserva ordem/dependências históricas e mantém o índice leve no bundle-base.
 */
(function instalarClinicalRegionLoader(){
    'use strict';

    const VERSION='1.0.0';
    const carregamentos=new Map();
    const estilos=new Map();
    const regioesCarregadas=new Set();
    let bancoClinicoPronto=false;
    let bancoClinicoPromise=null;
    let fila=Promise.resolve();

    const BANCO_CLINICO_SCRIPTS=Object.freeze([
        'database/mapeamento_clinico.js',
        'database/condicoes_mobilidade_v23.js',
        'database/diferenciais_neurais.js'
    ]);

    const REGIOES=Object.freeze({
        ombro:Object.freeze({
            styles:Object.freeze(['clinical_reasoning_shoulder-3.1.0.css?v=20260910-r2']),
            scripts:Object.freeze(['clinical_reasoning_shoulder-3.1.0.js?v=20260910-lang-r3&upperlimb=20260910-r1'])
        }),
        cotovelo:Object.freeze({
            styles:Object.freeze(['clinical_reasoning_elbow-3.1.0.css?v=20260910-r1']),
            scripts:Object.freeze(['clinical_reasoning_elbow-3.1.0.js?v=20260910-r1&upperlimb=20260910-r1'])
        }),
        punho_mao:Object.freeze({
            depends:Object.freeze(['cotovelo']),
            styles:Object.freeze(['clinical_reasoning_wrist-3.1.0.css?v=20260910-r1']),
            scripts:Object.freeze(['clinical_reasoning_wrist-3.1.0.js?v=20260910-r1&upperlimb=20260910-r1'])
        }),
        cervical:Object.freeze({
            depends:Object.freeze(['cotovelo']),
            styles:Object.freeze(['clinical_reasoning_cervical-3.1.0.css?v=20260911-r1']),
            scripts:Object.freeze(['clinical_reasoning_cervical-3.1.0.js?v=20260911-r1'])
        })
    });
    const ORDEM=Object.freeze(['ombro','cotovelo','punho_mao','cervical']);

    function urlAbsoluta(src){return new URL(src,document.baseURI).href;}

    function carregarEstilo(src){
        const href=urlAbsoluta(src);
        if(estilos.has(href))return estilos.get(href);
        const existente=Array.from(document.querySelectorAll('link[rel="stylesheet"][href]')).find(link=>link.href===href);
        if(existente){const pronta=Promise.resolve(existente);estilos.set(href,pronta);return pronta;}
        const promessa=new Promise((resolve,reject)=>{
            const link=document.createElement('link');
            link.rel='stylesheet';link.href=src;link.dataset.kinesysClinicalRegion='1';
            link.addEventListener('load',()=>resolve(link),{once:true});
            link.addEventListener('error',()=>reject(new Error('Falha ao carregar estilo regional: '+src)),{once:true});
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
        if(existente){const pronta=Promise.resolve(existente);carregamentos.set(href,pronta);return pronta;}
        const promessa=new Promise((resolve,reject)=>{
            const script=document.createElement('script');
            script.src=src;script.async=false;script.dataset.kinesysClinicalRegion='1';
            script.addEventListener('load',()=>resolve(script),{once:true});
            script.addEventListener('error',()=>reject(new Error('Falha ao carregar módulo clínico: '+src)),{once:true});
            document.body.appendChild(script);
        });
        carregamentos.set(href,promessa);
        promessa.catch(()=>carregamentos.delete(href));
        return promessa;
    }

    async function garantirBancoClinico(){
        if(bancoClinicoPronto)return false;
        if(bancoClinicoPromise)return bancoClinicoPromise;
        bancoClinicoPromise=(async()=>{
            for(const src of BANCO_CLINICO_SCRIPTS)await carregarScript(src);
            bancoClinicoPronto=true;
            document.dispatchEvent(new CustomEvent('kinesys:clinical-bank-ready',{detail:{versao:VERSION}}));
            return true;
        })().catch(error=>{
            bancoClinicoPromise=null;
            throw error;
        });
        return bancoClinicoPromise;
    }

    function normalizarRegioes(ids){
        const solicitadas=new Set();
        (Array.isArray(ids)?ids:[]).forEach(id=>{
            const chave=String(id||'');
            if(!REGIOES[chave])return;
            solicitadas.add(chave);
            (REGIOES[chave].depends||[]).forEach(dep=>solicitadas.add(dep));
        });
        return ORDEM.filter(id=>solicitadas.has(id));
    }

    function regioesSelecionadasDom(){
        try{
            return Array.from(document.querySelectorAll('#grupo_regioes_mapeamento input:checked'))
                .map(input=>String(input.dataset.regiao||'')).filter(Boolean);
        }catch(_){return[];}
    }

    async function carregarRegiao(id){
        if(regioesCarregadas.has(id))return false;
        const config=REGIOES[id];
        if(!config)return false;
        await Promise.all(config.styles.map(carregarEstilo));
        for(const src of config.scripts)await carregarScript(src);
        regioesCarregadas.add(id);
        document.dispatchEvent(new CustomEvent('kinesys:clinical-region-ready',{detail:{id,versao:VERSION}}));
        return true;
    }

    async function executar(ids){
        const solicitadas=Array.from(new Set([...(Array.isArray(ids)?ids:[]),...regioesSelecionadasDom()].filter(Boolean)));
        if(!solicitadas.length)return[];
        let mudou=await garantirBancoClinico();
        const ordem=normalizarRegioes(solicitadas);
        for(const id of ordem){
            if(await carregarRegiao(id))mudou=true;
        }
        if(mudou&&typeof window.atualizarMotorClinico3KineSys==='function'){
            window.atualizarMotorClinico3KineSys(true);
        }
        return ordem;
    }

    function solicitar(ids){
        const lista=Array.isArray(ids)?ids.slice():[];
        fila=fila.then(()=>executar(lista)).catch(error=>{
            console.warn('KineSys Clinical Region Loader:',error);
            document.dispatchEvent(new CustomEvent('kinesys:clinical-region-error',{detail:{mensagem:String(error?.message||error),versao:VERSION}}));
            return [];
        });
        return fila;
    }

    function regioesDoPlano(plano){
        return Array.isArray(plano?.regioes)?plano.regioes.map(r=>r?.id).filter(Boolean):[];
    }

    function sincronizarPlanoAtual(){
        return solicitar(regioesDoPlano(window.KineSysMotorClinico3?.ultimoPlano));
    }

    document.addEventListener('kinesys:motor3-plano-atualizado',event=>{
        solicitar(Array.isArray(event.detail?.regioes)?event.detail.regioes:regioesDoPlano(window.KineSysMotorClinico3?.ultimoPlano));
    });
    document.addEventListener('kinesys:tela-ativada',event=>{
        if(event.detail?.id==='tela_avaliacao')sincronizarPlanoAtual();
    });
    document.addEventListener('change',event=>{
        if(event.target?.matches?.('#grupo_regioes_mapeamento input'))solicitar(regioesSelecionadasDom());
    });

    window.KineSysClinicalRegionLoader=Object.freeze({
        version:VERSION,
        ensure:solicitar,
        sync:sincronizarPlanoAtual,
        status(){return Object.freeze({bankLoaded:bancoClinicoPronto,loaded:Object.freeze(ORDEM.filter(id=>regioesCarregadas.has(id)))});}
    });

    sincronizarPlanoAtual();
})();