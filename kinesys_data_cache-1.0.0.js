/* KineSys — Data Cache 1.0.0
 * Cache em memória da sessão para dados operacionais leves.
 * Não persiste prontuário nem dados clínicos em localStorage/sessionStorage.
 */
(function instalarKineSysDataCache(){
    'use strict';

    const VERSION='1.0.0';
    const entradas=new Map();
    const emCurso=new Map();
    const metricas={hits:0,misses:0,deduplicados:0,gravacoes:0,invalidacoes:0,erros:0};

    function chave(valor){
        if(Array.isArray(valor))return valor.map(v=>String(v??'').trim()).join('::');
        return String(valor??'').trim();
    }

    function agora(){return Date.now();}

    function lerEntrada(k){
        const entrada=entradas.get(k);
        if(!entrada)return null;
        if(entrada.expiraEm<=agora()){
            entradas.delete(k);
            return null;
        }
        return entrada;
    }

    async function obter(opcoes={}){
        const k=chave(opcoes.key);
        const ttl=Math.max(0,Number(opcoes.ttl)||0);
        const buscar=opcoes.fetcher;
        const forcar=!!opcoes.force;
        if(!k)throw new Error('KineSysDataCache: key obrigatória.');
        if(typeof buscar!=='function')throw new Error('KineSysDataCache: fetcher obrigatório.');

        if(!forcar){
            const entrada=lerEntrada(k);
            if(entrada){metricas.hits++;return entrada.valor;}
            const pendente=emCurso.get(k);
            if(pendente){metricas.deduplicados++;return pendente;}
        }

        metricas.misses++;
        const promessa=Promise.resolve()
            .then(()=>buscar())
            .then(valor=>{
                if(ttl>0){
                    entradas.set(k,{valor,criadoEm:agora(),expiraEm:agora()+ttl});
                    metricas.gravacoes++;
                }
                return valor;
            })
            .catch(erro=>{metricas.erros++;throw erro;})
            .finally(()=>{
                if(emCurso.get(k)===promessa)emCurso.delete(k);
            });
        emCurso.set(k,promessa);
        return promessa;
    }

    function definir(key,valor,ttl){
        const k=chave(key),duracao=Math.max(0,Number(ttl)||0);
        if(!k||duracao<=0)return valor;
        entradas.set(k,{valor,criadoEm:agora(),expiraEm:agora()+duracao});
        metricas.gravacoes++;
        return valor;
    }

    function espiar(key){
        const entrada=lerEntrada(chave(key));
        return entrada?entrada.valor:undefined;
    }

    function invalidar(key){
        const k=chave(key);
        let alterou=false;
        if(entradas.delete(k))alterou=true;
        if(emCurso.delete(k))alterou=true;
        if(alterou)metricas.invalidacoes++;
        return alterou;
    }

    function invalidarPrefixo(prefixo){
        const p=chave(prefixo);
        if(!p)return 0;
        let total=0;
        for(const k of [...entradas.keys()])if(k.startsWith(p)){entradas.delete(k);total++;}
        for(const k of [...emCurso.keys()])if(k.startsWith(p)){emCurso.delete(k);total++;}
        if(total)metricas.invalidacoes+=total;
        return total;
    }

    function limpar(){
        const total=entradas.size+emCurso.size;
        entradas.clear();emCurso.clear();
        if(total)metricas.invalidacoes+=total;
        return total;
    }

    function stats(){
        return Object.freeze({version:VERSION,entries:entradas.size,inflight:emCurso.size,...metricas});
    }

    window.KineSysDataCache=Object.freeze({
        version:VERSION,
        get:obter,
        set:definir,
        peek:espiar,
        invalidate:invalidar,
        invalidatePrefix:invalidarPrefixo,
        clear:limpar,
        stats
    });
})();
