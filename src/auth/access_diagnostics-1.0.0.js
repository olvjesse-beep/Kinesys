/* Diagnóstico de acesso: somente metadados permitidos, nunca formulários, tokens ou texto clínico. */
(function(){
    'use strict';
    if(!window.crypto?.randomUUID)return;
    const KEY='kinesys_diagnostico_acesso_v1', VERSION='20261029-acesso-r1';
    const ENDPOINT='https://yulkylvkofeisbjwnxhe.supabase.co/rest/v1/rpc/kinesys_registrar_diagnostico_acesso';
    const PUBLIC_KEY='sb_publishable_STAVKxWe_UAlyADqxyQxjQ_c3NP5npE';
    const stages=new Set(['inicializacao','sessao','credenciais','perfis','ativacao','entrada','recurso','execucao']);
    const kinds=new Set(['iniciado','sucesso','credenciais_invalidas','email_nao_confirmado','limite_tentativas','rede_indisponivel','falha_conexao','tempo_esgotado','sessao_invalida','acesso_negado','servidor_indisponivel','recurso_indisponivel','erro_execucao','falha_desconhecida']);
    const nativeFetch=window.fetch?.bind(window), uuid=()=>crypto.randomUUID();
    let attempt=uuid(), account=null, queue=[], sending=false, last=null;
    try{queue=JSON.parse(localStorage.getItem(KEY)||'[]');if(!Array.isArray(queue))queue=[];}catch(_){queue=[];}
    function clean(item){
        if(!item||!stages.has(item.etapa)||!kinds.has(item.motivo)||!/^[a-f0-9-]{36}$/i.test(item.id||'')||!/^[a-f0-9-]{36}$/i.test(item.tentativa||''))return null;
        const time=Date.parse(item.ocorrido_em);if(!Number.isFinite(time)||time<Date.now()-86400000||time>Date.now()+300000)return null;
        return {id:item.id,tentativa:item.tentativa,ocorrido_em:new Date(time).toISOString(),etapa:item.etapa,motivo:item.motivo,conta_ref:/^[a-f0-9]{64}$/.test(item.conta_ref||'')?item.conta_ref:null,status:Number.isInteger(item.status)&&item.status>=100&&item.status<=599?item.status:null,duracao_ms:Math.min(120000,Math.max(0,Math.round(Number(item.duracao_ms)||0))),online:item.online===true,versao:VERSION};
    }
    function save(){queue=queue.map(clean).filter(Boolean).slice(-30);try{localStorage.setItem(KEY,JSON.stringify(queue));}catch(_){/* O diagnóstico não pode bloquear o login. */}}
    function classify(error){
        const code=String(error?.code||'').toLowerCase(),message=String(error?.message||'').toLowerCase(),status=Number(error?.status||0);
        if(code==='invalid_credentials'||/invalid login credentials|e-mail ou senha inválidos/.test(message))return 'credenciais_invalidas';
        if(code==='email_not_confirmed'||/email not confirmed/.test(message))return 'email_nao_confirmado';
        if(status===429||/rate.limit|too many requests/.test(message))return 'limite_tentativas';
        if(error?.name==='TimeoutError'||error?.name==='AbortError')return 'tempo_esgotado';
        if(navigator.onLine===false)return 'rede_indisponivel';
        if(/failed to fetch|network|fetch|alcançar o servidor/.test(message)||error?.name==='AuthRetryableFetchError')return 'falha_conexao';
        if(status>=500)return 'servidor_indisponivel';
        if(status===401)return 'sessao_invalida';if(status===403)return 'acesso_negado';
        return 'falha_desconhecida';
    }
    function report(etapa,motivo,details={},context={attempt,account}){
        try{const event=clean({id:uuid(),tentativa:context.attempt,ocorrido_em:new Date().toISOString(),etapa,motivo,conta_ref:context.account,status:details.status,duracao_ms:details.duracao_ms,online:navigator.onLine===true});if(!event)return;
            queue.push(event);last=event;save();render();void flush();return event.id;
        }catch(_){return null;}
    }
    async function begin(email=''){
        attempt=uuid();account=null;
        // Somente hash do e-mail normalizado; nenhum nome digitado ou credencial é persistido.
        const normalized=String(email).trim().toLowerCase();
        if(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)&&normalized.length<=254){try{const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(normalized));account=Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('');}catch(_){}}
        return attempt;
    }
    async function flush(){
        if(sending||!nativeFetch||navigator.onLine===false||!queue.length)return;
        sending=true;let progress=false;const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),5000);
        try{const batch=queue.slice(0,10),response=await nativeFetch(ENDPOINT,{method:'POST',headers:{apikey:PUBLIC_KEY,'Content-Type':'application/json'},body:JSON.stringify({p_eventos:batch}),signal:controller.signal,credentials:'omit'});
            if(response.ok){const result=await response.json();if(result?.ok===true&&Array.isArray(result.recebidos)){const ids=new Set(result.recebidos);progress=batch.some(e=>ids.has(e.id));queue=queue.filter(e=>!ids.has(e.id));save();}}
        }catch(_){/* Offline permanece na fila por até 24h, sem gerar outro erro de diagnóstico. */}
        finally{clearTimeout(timer);sending=false;if(progress&&queue.length)setTimeout(()=>void flush(),1000);}
    }
    function download(){
        const safe=queue.map(clean).filter(Boolean);if(last&&!safe.some(e=>e.id===last.id))safe.push(last);
        const url=URL.createObjectURL(new Blob([JSON.stringify({versao:VERSION,eventos:safe},null,2)],{type:'application/json'}));
        const link=document.createElement('a');link.href=url;link.download='kinesys-diagnostico-acesso.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
    }
    function render(){
        for(const id of ['ks_startup_diagnostico','login_diagnostico']){const host=document.getElementById(id);if(!host)continue;host.hidden=!last||['iniciado','sucesso'].includes(last.motivo);const code=host.querySelector('[data-access-code]');if(code&&last)code.textContent='Código de atendimento: '+last.tentativa;}
    }
    // Instrumenta somente o transporte do cliente Supabase, sem ler corpo, cabeçalhos ou resposta.
    async function transport(input,options){
        const started=Date.now(),context={attempt,account};let target;try{target=new URL(typeof input==='string'?input:input.url);}catch(_){return nativeFetch(input,options);}
        if(target.origin!=='https://yulkylvkofeisbjwnxhe.supabase.co'||target.pathname.endsWith('/kinesys_registrar_diagnostico_acesso'))return nativeFetch(input,options);
        const etapa=target.pathname.endsWith('/kinesys_perfil_sessao')?'sessao':target.pathname.endsWith('/kinesys_meus_perfis')?'perfis':target.pathname.endsWith('/kinesys_ativar_perfil')?'ativacao':target.pathname.startsWith('/auth/')?'credenciais':'execucao';
        if(etapa==='execucao'&&!context.account)return nativeFetch(input,options);
        try{const response=await nativeFetch(input,options);if(response.status>=400)report(etapa,response.status===429?'limite_tentativas':response.status>=500?'servidor_indisponivel':response.status===401?'sessao_invalida':response.status===403?'acesso_negado':'falha_desconhecida',{status:response.status,duracao_ms:Date.now()-started},context);return response;}
        catch(error){report(etapa,classify(error),{duracao_ms:Date.now()-started},context);throw error;}
    }
    save();
    window.addEventListener('online',()=>void flush());
    window.addEventListener('error',event=>{const target=event.target;if(target?.tagName==='SCRIPT'||target?.tagName==='LINK')report('recurso','recurso_indisponivel');else report('execucao','erro_execucao');},true);
    window.addEventListener('unhandledrejection',event=>report('execucao',classify(event.reason)));
    document.addEventListener('click',event=>{if(event.target.closest?.('[data-access-download]'))download();});
    document.addEventListener('DOMContentLoaded',()=>{render();void flush();});
    const watch=setTimeout(()=>{if(document.body?.hasAttribute('data-ks-startup')){report('inicializacao','tempo_esgotado');const retry=document.getElementById('ks_startup_retry');if(retry)retry.hidden=false;const msg=document.getElementById('ks_startup_message');if(msg)msg.textContent='A abertura não foi concluída. Recarregue ou baixe o diagnóstico para suporte.';}},18000);
    window.KineSysAccessDiagnostics=Object.freeze({begin,report,classify,flush,download,transport,clearIdentity(){attempt=uuid();account=null;last=null;render();},ready(){clearTimeout(watch);render();},reference:()=>last?.tentativa||attempt});
})();
