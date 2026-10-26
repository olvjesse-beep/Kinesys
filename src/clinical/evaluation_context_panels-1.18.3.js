/* Contexto da anamnese — índice e painel único. Move os controles originais,
 * sem clonar IDs, alterar valores canônicos ou consultar pacientes. */
(function(){
 'use strict';
 const icons={saude:'heart',cirurgias:'bandage',medicamentos:'pill',exames:'photo',trabalho:'briefcase',atividade:'barbell',psicossocial:'users'};
 let card,paineis=[],aberto=null,activeKey='saude',sincronizacaoTimer=null,avaliacaoAtivaRef=null,navegacao,preservado={};
 const el=(tag,cls,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text)e.textContent=text;return e;};
 function icon(name){const img=el('img','context-icon');img.src='assets/vendor/tabler/'+name+'.svg';img.alt='';img.setAttribute('aria-hidden','true');return img;}
 function campos(item){return Array.from(item.details.querySelectorAll('input,select,textarea')).filter(e=>e.dataset.contextUi!=='true'&&e.type!=='hidden'&&e.id!=='chk_corticoide'&&!['exames_imagem_fonte','input_cirurgia','input_medicamento'].includes(e.id));}
 function valores(item){
  const texts=campos(item).filter(e=>!['checkbox','radio'].includes(e.type)&&String(e.value||'').trim()).map(e=>e.tagName==='SELECT'?e.selectedOptions[0]?.textContent:String(e.value).trim()).filter(Boolean);
  const marcados=campos(item).filter(e=>e.type==='checkbox'&&e.checked).map(e=>e.closest('label')?.querySelector('span')?.textContent?.trim()||e.value);
  const tags=Array.from(item.details.querySelectorAll('#tags_cirurgias > *,#tags_medicamentos > *')).map(e=>e.dataset?.exibicao?e.dataset.exibicao+(e.dataset.dataCirurgia?' · '+e.dataset.dataCirurgia:''):e.textContent.replace(/[✕×]/g,'').trim());
  return [...marcados,...tags,...texts];
 }
 function estado(item){return item.radios.find(e=>e.checked)?.value||'nao_informado';}
 function setEstado(item,value){item.radios.forEach(r=>r.checked=r.value===value);}
 function mudarEstado(item,value){
  item.message.textContent='';
  if(value!=='relata'&&valores(item).length){setEstado(item,'relata');item.message.textContent='Existem informações registradas. Revise-as antes de declarar negativa ou não informado; nenhum dado foi apagado.';atualizar(item);return false;}
  setEstado(item,value);atualizar(item);return true;
 }
 function atualizar(item){
  const data=valores(item);if(data.length&&estado(item)!=='relata')setEstado(item,'relata');
  const state=estado(item);
  item.status.textContent=data.length?data.slice(0,2).join(' · ')+(data.length>2?' · +'+(data.length-2):''):state==='nega'?'Nega os itens investigados':state==='relata'?'Relata · selecione ou detalhe':'Não informado';
  item.button.classList.toggle('has-data',data.length>0||state==='nega');item.body.hidden=state==='nega';
  item.details.querySelectorAll('[data-context-condition="checked"]').forEach(box=>{box.hidden=!campos(item).some(e=>e.type==='checkbox'&&e.checked);});
  const cirurgia=document.getElementById('bloco_cirurgias');if(item.key==='cirurgias'&&cirurgia)cirurgia.style.display=document.getElementById('chk_cirurgia')?.checked||item.details.querySelector('#tags_cirurgias > *')?'block':'none';
 }
 function abrir(item,focus=false){
  activeKey=item.key;aberto=item;
  paineis.forEach(p=>{const active=p===item;p.details.hidden=!active;p.button.setAttribute('aria-selected',String(active));p.button.tabIndex=active?0:-1;});
  window.fecharSugestoesAvaliacaoKineSys?.();atualizar(item);if(focus)item.button.focus({preventScroll:true});
 }
 function fechar(){window.fecharSugestoesAvaliacaoKineSys?.();aberto=null;}
 function pararSincronizacaoContexto(){if(sincronizacaoTimer){clearInterval(sincronizacaoTimer);sincronizacaoTimer=null;}}
 function sincronizarContextoSeAtivo(){
  if(!avaliacaoAtivaRef?.classList.contains('ativa')||document.visibilityState!=='visible')return;
  paineis.forEach(atualizar);
 }
 function iniciarSincronizacaoContexto(){
  if(sincronizacaoTimer||!avaliacaoAtivaRef?.classList.contains('ativa')||document.visibilityState!=='visible')return;
  sincronizarContextoSeAtivo();sincronizacaoTimer=setInterval(sincronizarContextoSeAtivo,1000);
 }
 function coletar(){
  const estados={};paineis.forEach(p=>{atualizar(p);estados[p.key]=estado(p);});
  const camposExtras={};card?.querySelectorAll('[data-context-field][id]').forEach(e=>camposExtras[e.id]=String(e.value||''));
  return {...preservado,versao:1,estados:{...preservado.estados,...estados},campos:{...preservado.campos,...camposExtras}};
 }
 function preencher(data={}){
  preservado=JSON.parse(JSON.stringify(data||{}));
  paineis.forEach(p=>{setEstado(p,data.estados?.[p.key]||'nao_informado');});
  card?.querySelectorAll('[data-context-field][id]').forEach(e=>{e.value=typeof data.campos?.[e.id]==='string'?data.campos[e.id]:'';});
  card?.querySelectorAll('details.context-extra').forEach(d=>{d.open=Array.from(d.querySelectorAll('input,textarea')).some(e=>String(e.value||'').trim());});
  paineis.forEach(atualizar);
 }
 function limpar(){
  paineis.forEach(p=>{campos(p).forEach(e=>{if(e.type==='checkbox')e.checked=false;else e.value='';});p.details.querySelectorAll('#tags_cirurgias,#tags_medicamentos').forEach(e=>e.replaceChildren());});
  ['input_cirurgia','input_medicamento'].forEach(id=>{const input=document.getElementById(id);if(input)input.value='';});
  const fonte=document.getElementById('origem_informacao_clinica');if(fonte)fonte.value='relato_paciente';
  const confirmacao=document.getElementById('confirmacao_documental');if(confirmacao)confirmacao.value='nao_verificado';
  preencher();window.fecharSugestoesAvaliacaoKineSys?.();
 }
 function iniciar(){
  const next=document.getElementById('chk_tabagista')?.closest('.clinical-secondary-card');
  if(!next||next.dataset.contextPanels==='2')return;
  pararSincronizacaoContexto();navegacao?.disconnect();paineis=[];card=next;card.dataset.contextPanels='2';card.classList.add('ks-context-card');
  const originals=Array.from(card.querySelectorAll(':scope > details.clinical-disclosure'));
  const fonte=originals.find(d=>d.dataset.contextKey==='fonte');if(!fonte)return;
  const shell=el('div','context-workspace'),index=el('div','context-index'),content=el('div','context-content');
  index.setAttribute('role','tablist');index.setAttribute('aria-label','Grupos da anamnese');index.setAttribute('aria-orientation','vertical');
  card.insertBefore(shell,originals[0]);shell.append(index,content);
  originals.filter(d=>d!==fonte).forEach((details,i)=>{
   const key=details.dataset.contextKey,summary=details.querySelector(':scope > summary'),title=summary.querySelector('span').textContent.trim(),description=summary.querySelector('small')?.textContent||'';
   const button=el('button','context-index-item');button.type='button';button.id='context-tab-'+key;button.setAttribute('role','tab');button.setAttribute('aria-controls','context-panel-'+key);
   const label=el('span','context-index-copy'),strong=el('strong','',title),status=el('span','context-index-status','Não informado');label.append(strong,status);button.append(icon(icons[key]),label,icon('chevron-right'));index.append(button);
   details.id='context-panel-'+key;details.setAttribute('role','tabpanel');details.setAttribute('aria-labelledby',button.id);details.classList.add('context-panel');details.open=true;summary.hidden=true;
   const head=el('header','context-panel-heading');head.append(el('h3','',title),el('p','',description));const body=details.querySelector('.disclosure-body');
   const states=el('fieldset','context-states'),legend=el('legend','clinical-visually-hidden','Informação sobre '+title);states.append(legend);
   const radios=[['nao_informado','Não informado'],['nega','Nega'],['relata','Relata']].map(([value,text])=>{const l=el('label'),r=el('input');r.type='radio';r.name='context_state_'+key;r.id='context_state_'+key+'_'+value;r.dataset.contextUi='true';r.value=value;r.checked=value==='nao_informado';l.append(r,document.createTextNode(text));states.append(l);return r;});
   const message=el('p','context-message');message.setAttribute('role','status');
   const hint=el('p','context-hint','Sem marcação não significa ausência. Detalhe somente o que foi informado.');
   hint.prepend(icon('info-circle'));
   details.insertBefore(head,body);details.insertBefore(states,body);details.append(message,hint);content.append(details);
   const item={key,details,body,button,status,radios,message};paineis.push(item);
   button.addEventListener('click',()=>abrir(item));
   button.addEventListener('keydown',e=>{const keys=['ArrowDown','ArrowUp','ArrowRight','ArrowLeft','Home','End'];if(!keys.includes(e.key))return;e.preventDefault();const offset=['ArrowDown','ArrowRight'].includes(e.key)?1:-1;const at=e.key==='Home'?0:e.key==='End'?paineis.length-1:(i+offset+paineis.length)%paineis.length;abrir(paineis[at],true);});
   radios.forEach(r=>r.addEventListener('change',()=>{mudarEstado(item,r.value);if(typeof agendarAutosaveKineSys==='function')agendarAutosaveKineSys();}));
   details.addEventListener('input',()=>atualizar(item));details.addEventListener('change',()=>atualizar(item));
  });
  const source=el('div','context-source'),sourceBody=fonte.querySelector('.disclosure-body');source.append(sourceBody);content.append(source);fonte.remove();
  card.querySelectorAll('.context-extra>summary').forEach(s=>s.prepend(icon('plus')));
  const sourceLabel=source.querySelector('label');if(sourceLabel){sourceLabel.classList.remove('clinical-visually-hidden');sourceLabel.textContent='Fonte dos dados';}
  // One canonical physical-activity input, moved rather than copied or replaced.
  const activity=paineis.find(p=>p.key==='atividade'),sports=document.getElementById('paciente_esporte')?.closest('.input-group');
  if(activity&&sports)activity.body.prepend(sports);
  card.querySelectorAll('.checkbox-pill').forEach(l=>{const input=l.querySelector('input');if(input?.id)l.htmlFor=input.id;input?.removeAttribute('aria-label');});
  window.inicializarSugestoesAvaliacaoKineSys?.();
  const triagem=document.getElementById('subtela_triagem');avaliacaoAtivaRef=document.getElementById('tela_avaliacao');
  navegacao=new MutationObserver(()=>{if(aberto&&!triagem.classList.contains('ativa'))fechar(false);});
  navegacao.observe(triagem,{attributes:true,attributeFilter:['class']});
  abrir(paineis.find(p=>p.key===activeKey)||paineis[0]);iniciarSincronizacaoContexto();
 }
 window.KineSysContextoAnamnese={coletar,preencher,limpar,atualizar:()=>paineis.forEach(atualizar)};
 document.addEventListener('kinesys:tela-dom-pronta',e=>{if(e.detail?.id==='tela_avaliacao')iniciar();});
 document.addEventListener('kinesys:tela-ativada',e=>{if(e.detail?.id==='tela_avaliacao'){iniciar();iniciarSincronizacaoContexto();}});
 document.addEventListener('kinesys:tela-desativada',event=>{if(event.detail?.id==='tela_avaliacao'){pararSincronizacaoContexto();if(aberto)fechar(false);}});
 document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')iniciarSincronizacaoContexto();else pararSincronizacaoContexto();});
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',iniciar,{once:true});else iniciar();
})();
