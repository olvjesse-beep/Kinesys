/* Contexto da avaliação: campos originais em diálogos persistentes na triagem.
 * Não clona campos nem altera seus IDs, listeners, regras ou persistência.
 */
(function(){
    'use strict';
    let aberto=null;
    let sincronizacaoTimer=null;
    let avaliacaoAtivaRef=null;
    const paineis=[];
    function fechar(retornarFoco=true){
        if(!aberto)return;
        const item=aberto;aberto=null;
        item.retornarFoco=retornarFoco;
        item.dialog.close();
        document.body.classList.remove('ks-context-modal-open');
    }
    function atualizar(item){
        const campos=Array.from(item.details.querySelectorAll('input,select,textarea'));
        const preenchidos=campos.filter(el=>{
            if(el.type==='hidden'||el.id==='chk_corticoide'||['input_cirurgia','input_medicamento'].includes(el.id))return false;
            return ['checkbox','radio'].includes(el.type)?el.checked:String(el.value||'').trim()!=='';
        }).length;
        const tags=item.details.querySelectorAll('#tags_cirurgias > *,#tags_medicamentos > *').length;
        const n=preenchidos+tags;
        item.status.textContent=n?`${n} ${n===1?'item preenchido':'itens preenchidos'}`:'Abrir';
        item.button.classList.toggle('has-data',n>0);
        item.button.setAttribute('aria-expanded',String(item.dialog.open));
    }
    function abrir(item){
        if(aberto===item)return;
        fechar(false);
        window.fecharPainelAvaliacaoKineSys?.();
        item.retornarFoco=true;aberto=item;
        item.details.open=true;
        item.dialog.showModal();
        item.body.scrollTop=0;
        document.body.classList.add('ks-context-modal-open');
        item.close.focus({preventScroll:true});atualizar(item);
    }
    function pararSincronizacaoContexto(){
        if(sincronizacaoTimer){clearInterval(sincronizacaoTimer);sincronizacaoTimer=null;}
    }
    function sincronizarContextoSeAtivo(){
        if(!avaliacaoAtivaRef?.classList.contains('ativa')||document.visibilityState!=='visible')return;
        paineis.forEach(atualizar);
    }
    function iniciarSincronizacaoContexto(){
        if(sincronizacaoTimer||!avaliacaoAtivaRef?.classList.contains('ativa')||document.visibilityState!=='visible')return;
        sincronizarContextoSeAtivo();
        sincronizacaoTimer=setInterval(sincronizarContextoSeAtivo,1000);
    }
    function iniciar(){
        const campo=document.getElementById('chk_tabagista');
        const card=campo?.closest('.clinical-secondary-card');
        if(!card||card.dataset.contextPanels)return;
        card.dataset.contextPanels='1';card.classList.add('ks-context-card');
        const originais=Array.from(card.querySelectorAll(':scope > details.clinical-disclosure'));
        if(!originais.length)return;
        const grid=document.createElement('div');grid.className='ks-context-buttons';
        card.insertBefore(grid,originais[0]);
        originais.forEach((details,i)=>{
            const summary=details.querySelector(':scope > summary');
            const titulo=summary?.querySelector('span')?.textContent?.trim()||'Contexto';
            const subtitulo=summary?.querySelector('small')?.textContent?.trim()||'';
            const button=document.createElement('button');button.type='button';button.className='ks-context-button';
            const title=document.createElement('strong'),status=document.createElement('span'),arrow=document.createElement('span');
            title.textContent=titulo;status.className='ks-context-button-status';arrow.textContent='↗';arrow.className='ks-context-button-arrow';arrow.setAttribute('aria-hidden','true');
            button.append(title,status,arrow);button.setAttribute('aria-haspopup','dialog');button.setAttribute('aria-expanded','false');
            const dialog=document.createElement('dialog');dialog.id=`ks-context-dialog-${i}`;dialog.className='ks-context-dialog';button.setAttribute('aria-controls',dialog.id);
            const head=document.createElement('div');head.className='ks-context-dialog-head';
            const heading=document.createElement('h2');heading.id=dialog.id+'-title';heading.textContent=titulo;dialog.setAttribute('aria-labelledby',heading.id);
            const close=document.createElement('button');close.type='button';close.textContent='×';close.className='ks-context-close';close.setAttribute('aria-label','Fechar '+titulo);
            head.append(heading,close);
            const body=document.createElement('div');body.className='ks-context-dialog-body';
            const intro=document.createElement('p');intro.className='ks-context-intro';intro.textContent=subtitulo;body.append(intro,details);
            details.open=true;details.classList.add('ks-context-original');
            if(summary){summary.hidden=true;summary.setAttribute('aria-hidden','true');}
            details.querySelectorAll('input[id],select[id],textarea[id]').forEach(el=>{
                if(el.type==='hidden'||el.labels?.length)return;
                const label=el.closest('.input-group')?.querySelector(':scope > label');
                if(label&&!label.htmlFor)label.htmlFor=el.id;
                else if(!el.getAttribute('aria-label'))el.setAttribute('aria-label',titulo);
            });
            const foot=document.createElement('div');foot.className='ks-context-dialog-foot';
            const hint=document.createElement('span');hint.textContent='Ao fechar, os campos permanecem preenchidos na avaliação.';
            const done=document.createElement('button');done.type='button';done.className='btn-primary';done.textContent='Voltar à avaliação';foot.append(hint,done);
            dialog.append(head,body,foot);card.appendChild(dialog);grid.appendChild(button);
            const item={dialog,details,button,status,body,close,retornarFoco:true};paineis.push(item);
            button.addEventListener('click',()=>abrir(item));
            close.addEventListener('click',()=>fechar());done.addEventListener('click',()=>fechar());
            dialog.addEventListener('cancel',e=>{e.preventDefault();fechar();});
            dialog.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();fechar();}});
            dialog.addEventListener('close',()=>{
                if(aberto===item)aberto=null;
                if(!aberto)document.body.classList.remove('ks-context-modal-open');
                atualizar(item);
                if(item.retornarFoco&&document.getElementById('subtela_triagem')?.classList.contains('ativa'))button.focus({preventScroll:true});
            });
            // Fechamento explícito: clicar fora não descarta nem fecha acidentalmente.
            details.addEventListener('input',()=>atualizar(item));details.addEventListener('change',()=>atualizar(item));
            atualizar(item);
        });
        const triagem=document.getElementById('subtela_triagem'),avaliacao=document.getElementById('tela_avaliacao');
        avaliacaoAtivaRef=avaliacao;
        const navegacao=new MutationObserver(()=>{if(aberto&&!triagem.classList.contains('ativa'))fechar(false);});
        navegacao.observe(triagem,{attributes:true,attributeFilter:['class']});

        document.addEventListener('kinesys:tela-ativada',event=>{
            if(event.detail?.id==='tela_avaliacao')iniciarSincronizacaoContexto();
        });
        document.addEventListener('kinesys:tela-desativada',event=>{
            if(event.detail?.id==='tela_avaliacao'){
                pararSincronizacaoContexto();
                if(aberto)fechar(false);
            }
        });
        document.addEventListener('visibilitychange',()=>{
            if(document.visibilityState==='visible')iniciarSincronizacaoContexto();
            else pararSincronizacaoContexto();
        });
        iniciarSincronizacaoContexto();
    }
    if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',iniciar);else iniciar();
})();
