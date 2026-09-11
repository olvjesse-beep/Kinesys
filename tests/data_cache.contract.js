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

    let pacientesObservados=0;
    const chavePacientes='pacientes::basicos::perfil-observabilidade';
    const buscarPacientes=async()=>{pacientesObservados++;return [];};
    await cache.get({key:chavePacientes,ttl:60000,fetcher:buscarPacientes});
    await cache.get({key:chavePacientes,ttl:60000,fetcher:buscarPacientes});
    assert.strictEqual(pacientesObservados,1,'patient observability must not change cache behavior');

    let liberarAgenda;
    let agendaObservada=0;
    const esperaAgenda=new Promise(resolve=>{liberarAgenda=resolve;});
    const buscarAgenda=async()=>{agendaObservada++;await esperaAgenda;return [];};
    const chaveAgenda='agenda::semana::perfil-observabilidade::clinica-observabilidade::2026-09-07::2026-09-13::todos';
    const agenda1=cache.get({key:chaveAgenda,ttl:5000,fetcher:buscarAgenda});
    const agenda2=cache.get({key:chaveAgenda,ttl:5000,fetcher:buscarAgenda});
    liberarAgenda();
    await Promise.all([agenda1,agenda2]);
    assert.strictEqual(agendaObservada,1,'Agenda observability must preserve in-flight deduplication');

    let procedimentosObservados=0;
    const chaveProcedimentos='agenda::aux::procedimentos::perfil-observabilidade::clinica-observabilidade';
    const buscarProcedimentos=async()=>{procedimentosObservados++;return [];};
    await cache.get({key:chaveProcedimentos,ttl:15000,fetcher:buscarProcedimentos});
    await cache.get({key:chaveProcedimentos,ttl:15000,fetcher:buscarProcedimentos});
    assert.strictEqual(procedimentosObservados,1,'procedure observability must not change cache behavior');

    const stats=cache.stats();
    assert.ok(stats.hits>=1,'cache metrics must expose hits');
    assert.ok(stats.deduplicados>=1,'cache metrics must expose in-flight deduplication');
    assert.ok(stats.escopos&&stats.escopos.pacientes&&stats.escopos.agenda&&stats.escopos.procedimentos,'cache stats must expose approved operational scopes');
    assert.strictEqual(stats.escopos.pacientes.hits,1,'patient scope must count cache hits');
    assert.strictEqual(stats.escopos.pacientes.misses,1,'patient scope must count cache misses');
    assert.strictEqual(stats.escopos.pacientes.deduplicados,0,'patient scope must count deduplications independently');
    assert.strictEqual(stats.escopos.pacientes.leiturasEvitadasEstimadas,1,'patient scope must estimate avoided fetches');
    assert.strictEqual(stats.escopos.agenda.hits,0,'Agenda scope must count hits independently');
    assert.strictEqual(stats.escopos.agenda.misses,1,'Agenda scope must count cache misses');
    assert.strictEqual(stats.escopos.agenda.deduplicados,1,'Agenda scope must count in-flight deduplication');
    assert.strictEqual(stats.escopos.agenda.leiturasEvitadasEstimadas,1,'Agenda scope must estimate avoided fetches');
    assert.strictEqual(stats.escopos.procedimentos.hits,1,'procedure scope must count cache hits');
    assert.strictEqual(stats.escopos.procedimentos.misses,1,'procedure scope must count cache misses');
    assert.strictEqual(stats.escopos.procedimentos.deduplicados,0,'procedure scope must count deduplications independently');
    assert.strictEqual(stats.escopos.procedimentos.leiturasEvitadasEstimadas,1,'procedure scope must estimate avoided fetches');
    assert.ok(stats.leiturasEvitadasEstimadas>=3,'global stats must estimate avoided fetches without exposing cached data');
    assert.ok(Object.isFrozen(stats)&&Object.isFrozen(stats.escopos)&&Object.isFrozen(stats.escopos.pacientes),'observability snapshots must be read-only');
    console.log('Data Cache contract: TTL, in-flight deduplication, invalidation, retry, memory-only storage and scoped observability approved.');
})().catch(error=>{console.error(error);process.exitCode=1;});
