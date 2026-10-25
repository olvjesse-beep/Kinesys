'use strict';
// Manual opt-in smoke test. Synthetic data only; never run by CI.
const assert=require('node:assert/strict');
const base='http://127.0.0.1:8766',headers={Origin:base,'Content-Type':'application/json'};
(async()=>{
 const payload={contexto:{clinicaId:'laboratorio',pacienteId:'pessoa-ficticia',avaliacaoId:'teste-local',revisao:'1'},fontes:[{id:'hma',tipo:'historia',texto:'Pessoa fictícia refere dor no pescoço direito há 3 semanas. A dor irradia pelo braço direito. Relata formigamento na mão direita. Nega febre. A mãe tem artrite.'},{id:'exame',tipo:'exame_registrado',texto:'Spurling: positivo à direita, reproduzindo a dor irradiada. Distração cervical: melhora dos sintomas à direita. ULTT1: não realizado. Hipótese de investigação: radiculopatia cervical, ainda não confirmada.'}]};
 if(process.argv.includes('--diagnostico')){
  const {SYSTEM,SCHEMA,MODEL,input,validate}=require('./server.cjs');
  const response=await fetch('http://127.0.0.1:11434/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({model:MODEL,stream:false,think:false,format:SCHEMA,options:{temperature:0,num_ctx:8192,num_predict:2048},messages:[{role:'system',content:SYSTEM},{role:'user',content:JSON.stringify({fontes:input(payload).fontes})}]})});const data=await response.json(),out=JSON.parse(data.message.content);console.log(JSON.stringify(out,null,2));
  for(const f of out.fatos){try{validate({fatos:[f],paragrafos:[{texto:f.trecho,fatoIds:[f.id]}],duvidas:[]},input(payload));}catch(error){console.log(f.id+': '+error.message);}}return;
 }
 const session=await fetch(base+'/api/session',{headers:{Origin:base}});assert(session.ok);
 const {codigo}=await session.json(),pair=await fetch(base+'/api/pair',{method:'POST',headers,body:JSON.stringify({codigo})});assert(pair.ok);const {token}=await pair.json();
 const start=Date.now(),response=await fetch(base+'/api/avaliacao',{method:'POST',headers:{...headers,Authorization:'Bearer '+token},signal:AbortSignal.timeout(270000),body:JSON.stringify(payload)});
 const data=await response.json();console.log(JSON.stringify({status:response.status,segundos:Math.round((Date.now()-start)/1000),...data},null,2));assert(response.ok,'O rascunho sintético não passou na validação local.');assert.equal(data.revisaoObrigatoria,true);assert.equal(data.aplicacaoAutomatica,false);
})().catch(error=>{console.error(error.message);process.exitCode=1;});
