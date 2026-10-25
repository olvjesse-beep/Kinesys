'use strict';
let pending=false,revision=0;
const byId=id=>document.getElementById(id),status=text=>{byId('status').textContent=text;};
const context=()=>({clinicaId:'laboratorio',pacienteId:'pessoa-ficticia',avaliacaoId:'teste-local',revisao:String(revision)});
const snapshot=()=>({contexto:context(),fontes:[{id:'hma',tipo:'historia',texto:byId('history').value},{id:'exame',tipo:'exame_registrado',texto:byId('exam').value}].filter(f=>f.texto.trim())});
const connector=KineSysEvaluationLocalAI.criar({snapshot,context});
function clearResult(){byId('result').hidden=true;byId('draft').value='';for(const id of ['facts','warnings','pending'])byId(id).replaceChildren();byId('metrics').textContent='';}
async function pair(){const s=await fetch('/api/session',{cache:'no-store'});if(!s.ok)throw Error('Não foi possível abrir a sessão local.');const code=(await s.json()).codigo;byId('pair-code').textContent=code;await connector.conectar(code);const health=await (await fetch('/api/health')).json();byId('model').textContent='Modelo: '+health.modelo+' · Nuvem desativada';}
for(const id of ['history','exam'])byId(id).addEventListener('input',()=>{revision++;clearResult();status(pending?'Fonte alterada durante a análise. A resposta anterior será descartada.':'Fonte alterada. Gere um novo rascunho para esta versão.');});
byId('reconnect').addEventListener('click',async()=>{if(pending)return;byId('reconnect').disabled=true;status('Reconectando ao serviço local…');try{await pair();status('Conexão local renovada.');}catch(error){status(error.message);}finally{byId('reconnect').disabled=false;}});
byId('analyze').addEventListener('click',async()=>{
 if(pending)return;if(!byId('synthetic').checked){status('Confirme que os dados são fictícios antes do teste.');return;}
 if(!snapshot().fontes.length){status('Preencha a avaliação fictícia.');return;}
 pending=true;byId('analyze').disabled=true;byId('reconnect').disabled=true;clearResult();status('Organizando fontes, redigindo e conferindo no computador… A primeira carga pode demorar.');
 try{const result=await connector.analisar();
  byId('draft').value=result.rascunho;byId('warnings').replaceChildren();for(const warning of result.avisos){const p=document.createElement('p');p.textContent=warning;byId('warnings').appendChild(p);}byId('facts').replaceChildren();for(const fact of result.fatos){const tr=document.createElement('tr');for(const value of [fact.fonteId,fact.trecho,fact.verificacao==='conferencia_profissional'?'Revisão manual necessária':'Regras locais — não é validação clínica']){const td=document.createElement('td');td.textContent=value;tr.appendChild(td);}byId('facts').appendChild(tr);}byId('result').hidden=false;status('Rascunho preparado. Confira todas as fontes; nenhum prontuário foi alterado.');
  for(const item of result.pendencias||[]){const p=document.createElement('p');p.className='warning';p.textContent='Texto separado para conferência (não incorporado como dado clínico): '+item.trecho;byId('pending').appendChild(p);}
  const m=result.metricas,a=result.analiseDocumental;if(m&&a)byId('metrics').textContent=a.frasesFonte+' frases de origem · '+a.frasesVinculadas+' vinculadas à redação · '+a.frasesEmConferencia+' em conferência · '+(m.milissegundos/1000).toFixed(1)+' s · Sobreposição textual: '+m.sobreposicaoTextual4gramas+'%. Indicadores documentais, não acurácia clínica.';
 }catch(error){status(error.message);}finally{pending=false;byId('analyze').disabled=false;byId('reconnect').disabled=false;}
});
pair().catch(error=>status(error.message));
