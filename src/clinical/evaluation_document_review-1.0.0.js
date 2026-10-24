/* Read-only documentary review. Answers are recorded in their original fields. */
(function(root){
 'use strict';
 const labels={criterio_atendido:'Critério marcado como atendido',criterio_nao_atendido:'Critério marcado como não atendido',inconclusivo:'Resultado inconclusivo',sem_vinculo:'Sem testes explicitamente vinculados',esclarecer_historia:'História ou localização a esclarecer',criterio_registrado_atendido:'Combinação de critérios registrada como atendida',criterio_registrado_nao_atendido:'Combinação de critérios não atendida',interpretacao_pendente:'Interpretação pendente'};
 function render({host,analise,contexto,contextoAtual,onRevisar}){
  if(!host)return;
  host.replaceChildren();host.hidden=!analise;if(!analise)return;
  const doc=host.ownerDocument,make=(tag,text,cls)=>{const el=doc.createElement(tag);if(text)el.textContent=text;if(cls)el.className=cls;return el;};
  const questions=analise.perguntas||[],evidence=analise.matrizEvidencias||[],problems=analise.problemasClinicos||[];
  host.hidden=!questions.length&&!evidence.length&&!problems.length;if(host.hidden)return;
  const h=make('h3','Conferência da avaliação');host.append(h,make('p','Revise as fontes antes de finalizar. Estes itens não são diagnósticos e não fazem parte do texto do relatório.'));
  if(questions.length){
   const detail=make('details');detail.open=true;detail.append(make('summary','Esclarecer '+questions.length+' ponto(s) da avaliação'));
   const list=make('ol');
   for(const q of questions){
    const item=make('li');item.append(make('strong',q.pergunta));
    for(const source of q.trechos||[])item.append(make('blockquote',source.trecho));
    const button=make('button',q.campoDestino==='subtela_mapeamento'?'Revisar no exame':'Esclarecer na HMA','btn-secondary');button.type='button';
    button.addEventListener('click',()=>{if(contexto!==contextoAtual())return;onRevisar(q.campoDestino);});
    item.append(button);list.append(item);
   }
   detail.append(list);host.append(detail);
  }
  if(problems.length){
   const detail=make('details');detail.append(make('summary','Queixas organizadas por localização, lado e episódio'));
   const list=make('ul');
   for(const p of problems){const item=make('li');item.append(make('strong',p.regiao+' · '+(p.lado||'lado não informado')));
    for(const e of p.episodios||[])item.append(make('p',[e.temporalidade==='anterior'?'Episódio anterior':e.temporalidade==='atual'?'Episódio atual':'Momento não especificado',...(e.duracao||[]),...(e.momentos||[])].join(' · ')));
    const sources=new Set();for(const s of p.sintomas||[]){const text=s.origem?.trecho;if(text&&!sources.has(text)){sources.add(text);item.append(make('blockquote',text));}}
    list.append(item);
   }
   detail.append(list);host.append(detail);
  }
  if(evidence.length){
   const detail=make('details');detail.append(make('summary','Exames e limites de cada hipótese'));
   const list=make('ul');for(const e of evidence){const item=make('li');item.append(make('strong',e.hipotese),make('p',labels[e.conclusao]||'Interpretação pendente'));
    if(e.historia?.length){item.append(make('p','História registrada — contexto documental:'));for(const h of e.historia)item.append(make('blockquote',h.texto));}
    for(const r of e.resultados||[])item.append(make('p',(labels[r.papel]||'Resultado a revisar')+': '+r.teste+(r.lado?' · '+r.lado:'')));
    item.append(make('p','A classificação descreve o critério registrado, não confirma nem exclui um diagnóstico. A história da mesma região é contexto documental, não confirmação.'));list.append(item);}
   detail.append(list);host.append(detail);
  }
 }
 root.KineSysDocumentReview=Object.freeze({renderizar:render});
})(typeof window==='undefined'?globalThis:window);
