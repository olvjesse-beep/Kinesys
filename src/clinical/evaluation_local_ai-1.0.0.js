/* Optional evaluation-only local AI connector. No automatic requests, saving,
 * global patient cache, external provider or fallback to cloud. */
(function(root){
 'use strict';
 function create({snapshot,context,fetchImpl=root.fetch?.bind(root),base='http://127.0.0.1:8766'}={}){
  if(base!=='http://127.0.0.1:8766'||typeof snapshot!=='function'||typeof context!=='function'||typeof fetchImpl!=='function')throw Error('Configuração local inválida.');
  let token='',generation=0,pending=null;
  const serialize=()=>JSON.stringify(snapshot()),contextKey=()=>JSON.stringify(context());
  function disconnect(){token='';generation++;pending?.abort();pending=null;}
  async function connect(code){disconnect();const run=generation,origin=contextKey();const response=await fetchImpl(base+'/api/pair',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({codigo:String(code)})});if(run!==generation||origin!==contextKey())throw Error('O contexto mudou durante a conexão.');const data=await response.json();if(!response.ok)throw Error(data.erro||'Falha na conexão local.');token=data.token;}
  async function analyze(){
   if(!token)throw Error('Conecte a IA local.');if(pending)throw Error('Uma avaliação já está em processamento.');
   const run=generation,ctx=contextKey(),raw=serialize(),input=JSON.parse(raw),controller=new AbortController();pending=controller;
   try{const response=await fetchImpl(base+'/api/avaliacao',{method:'POST',signal:controller.signal,headers:{'Content-Type':'application/json',Authorization:'Bearer '+token},body:raw});const data=await response.json();
    if(run!==generation||ctx!==contextKey()||raw!==serialize())throw Error('A avaliação mudou. O resultado anterior foi descartado.');
    if(!response.ok)throw Error(data.erro||'A análise local falhou.');
    const keys=['clinicaId','pacienteId','avaliacaoId','revisao'];
    if(!data.contexto||Object.keys(data.contexto).length!==keys.length||keys.some(k=>data.contexto[k]!==String(input.contexto[k]))||data.revisaoObrigatoria!==true||data.aplicacaoAutomatica!==false)throw Error('Resposta sem o contexto ou revisão obrigatórios.');
    return data;
   }finally{if(pending===controller)pending=null;}
  }
  return Object.freeze({conectar:connect,analisar:analyze,desconectar:disconnect});
 }
 root.KineSysEvaluationLocalAI=Object.freeze({version:'1.0.0',criar:create});
})(typeof window==='undefined'?globalThis:window);
