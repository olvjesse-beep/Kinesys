'use strict';
let pending=false,revision=0;
const byId=id=>document.getElementById(id),status=text=>{byId('status').textContent=text;};
const context=()=>({clinicaId:'laboratorio',pacienteId:'pessoa-ficticia',avaliacaoId:'teste-local',revisao:String(revision)});
const snapshot=()=>({contexto:context(),fontes:[{id:'hma',tipo:'historia',texto:byId('history').value},{id:'exame',tipo:'exame_registrado',texto:byId('exam').value}].filter(f=>f.texto.trim())});
const connector=KineSysEvaluationLocalAI.criar({snapshot,context});
async function pair(){const s=await fetch('/api/session',{cache:'no-store'});if(!s.ok)throw Error('Não foi possível abrir a sessão local.');const code=(await s.json()).codigo;byId('pair-code').textContent=code;await connector.conectar(code);}
for(const id of ['history','exam'])byId(id).addEventListener('input',()=>{revision++;byId('result').hidden=true;});
byId('analyze').addEventListener('click',async()=>{
 if(pending)return;if(!byId('synthetic').checked){status('Confirme que os dados são fictícios antes do teste.');return;}
 if(!snapshot().fontes.length){status('Preencha a avaliação fictícia.');return;}
 pending=true;byId('analyze').disabled=true;byId('result').hidden=true;status('Processando no computador… A primeira execução precisa carregar o modelo.');
 try{const result=await connector.analisar();
  byId('draft').value=result.rascunho;byId('warnings').replaceChildren();for(const warning of result.avisos){const p=document.createElement('p');p.textContent=warning;byId('warnings').appendChild(p);}byId('facts').replaceChildren();for(const fact of result.fatos){const tr=document.createElement('tr');for(const value of [fact.fonteId,fact.trecho,fact.verificacao==='conferencia_profissional'?'Revisão manual necessária':'Regras locais — não é validação clínica']){const td=document.createElement('td');td.textContent=value;tr.appendChild(td);}byId('facts').appendChild(tr);}byId('result').hidden=false;status('Rascunho preparado. Confira todas as fontes; nenhum prontuário foi alterado.');
 }catch(error){status(error.message);}finally{pending=false;byId('analyze').disabled=false;}
});
pair().catch(error=>status(error.message));
