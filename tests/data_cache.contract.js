'use strict';
const fs=require('fs');
const assert=require('assert');
const vm=require('vm');

const source=fs.readFileSync('kinesys_data_cache-1.0.0.js','utf8');
assert.doesNotMatch(source,/localStorage|sessionStorage/,'data cache must remain memory-only');

const context={window:{},console,setTimeout,clearTimeout,Date,Map,Object,Promise,Error,String,Number,Array};
vm.createContext(context);
vm.runInContext(source,context,{filename:'kinesys_data_cache-1.0.0.js'});
const cache=context.window.KineSysDataCache;
assert.ok(cache&&typeof cache.get==='function','global data cache API must exist');

(async()=>{
    let chamadas=0;
    const fetcher=async()=>{chamadas++;return [{id:1}];};
    const a=await cache.get({key:'pacientes::perfil-1',ttl:60000,fetcher});
    const b=await cache.get({key:'pacientes::perfil-1',ttl:60000,fetcher});
    assert.strictEqual(chamadas,1,'fresh sequential reads must reuse cached value');
    assert.strictEqual(a,b,'fresh read may reuse the same immutable-by-contract result reference');

    let liberar;
    let concorrentes=0;
    const espera=new Promise(resolve=>{liberar=resolve;});
    const lento=async()=>{concorrentes++;await espera;return 'ok';};
    const p1=cache.get({key:'agenda::perfil-1::semana',ttl:1000,fetcher:lento});
    const p2=cache.get({key:'agenda::perfil-1::semana',ttl:1000,fetcher:lento});
    liberar();
    const [r1,r2]=await Promise.all([p1,p2]);
    assert.strictEqual(concorrentes,1,'concurrent identical reads must share one in-flight request');
    assert.strictEqual(r1,'ok');assert.strictEqual(r2,'ok');

    cache.invalidate('pacientes::perfil-1');
    await cache.get({key:'pacientes::perfil-1',ttl:60000,fetcher});
    assert.strictEqual(chamadas,2,'invalidated key must fetch again immediately');

    cache.set('equipe::perfil-1','a',60000);
    cache.set('equipe::perfil-2','b',60000);
    assert.strictEqual(cache.invalidatePrefix('equipe::'),2,'prefix invalidation must clear every matching scope');
    assert.strictEqual(cache.peek('equipe::perfil-1'),undefined);

    let tentativas=0;
    await assert.rejects(()=>cache.get({key:'erro',ttl:60000,fetcher:async()=>{tentativas++;throw new Error('falha');}}));
    const recuperado=await cache.get({key:'erro',ttl:60000,fetcher:async()=>{tentativas++;return 'recuperado';}});
    assert.strictEqual(recuperado,'recuperado','failed requests must not poison the cache');
    assert.strictEqual(tentativas,2,'failed request must be retried');

    const stats=cache.stats();
    assert.ok(stats.hits>=1,'cache metrics must expose hits');
    assert.ok(stats.deduplicados>=1,'cache metrics must expose in-flight deduplication');
    console.log('Data Cache contract: TTL, in-flight deduplication, invalidation, retry and memory-only storage approved.');
})().catch(error=>{console.error(error);process.exitCode=1;});
