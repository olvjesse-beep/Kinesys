/* KineSys — polish da Home profissional v1.0.1
 * Ajusta composição visual sem alterar contratos clínicos ou consultas.
 * Inclui guarda defensiva contra duplicação visual do Meu dia clínico.
 */
(function(){
    'use strict';

    let frame=0;
    let observer=null;

    function ehProfissional(){
        const tipo=String(typeof usuarioLogado!=='undefined'?usuarioLogado?.tipo:'').toUpperCase();
        return tipo==='FISIOTERAPEUTA'||tipo==='PROFISSIONAL';
    }

    function esconderCardCadastros24h(home){
        const resumo=home.querySelector('[data-ks-home-detail="recentes"]');
        if(resumo){resumo.hidden=true;resumo.dataset.profHomeLegacyHidden='1';}
        const overview=home.querySelector('.ks-home-overview');
        if(overview){overview.hidden=true;overview.dataset.profHomeLegacyHidden='1';}
        const count=document.getElementById('ks_home_recent_count');
        if(count){
            const card=count.closest('[data-ks-home-detail="recentes"],.card,article');
            if(card&&card.id!=='card_painel_fisioterapeuta'&&card.id!=='ks_prof_home_workspace'){
                card.hidden=true;
                card.dataset.profHomeLegacyHidden='1';
            }
        }
        home.querySelectorAll('h1,h2,h3').forEach(titulo=>{
            const texto=String(titulo.textContent||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
            if(texto.includes('cadastros')&&texto.includes('ultimas 24 horas')){
                const card=titulo.closest('[data-ks-home-detail="recentes"],.card,article');
                if(card){card.hidden=true;card.dataset.profHomeLegacyHidden='1';}
            }
        });
    }

    function chaveLinhaMeuDia(linha){
        const agendamentoId=String(linha?.dataset?.agendamentoId||'').trim();
        if(agendamentoId)return `agendamento:${agendamentoId}`;
        const hora=String(linha?.querySelector('.ks-fisio-day-time strong')?.textContent||'').trim();
        const paciente=String(linha?.querySelector('.ks-fisio-day-patient-name')?.textContent||'').trim();
        const categoria=String(linha?.querySelector('.ks-fisio-day-category')?.textContent||'').trim();
        const chave=`${hora}|${paciente}|${categoria}`;
        return chave==='||'?'':`visual:${chave}`;
    }

    function removerDuplicatasMeuDia(home){
        const lista=home?.querySelector('#painel_fisio_lista');
        if(!lista)return 0;
        const linhas=Array.from(lista.children).filter(el=>el.matches?.('.ks-fisio-day-row'));
        if(linhas.length<2)return 0;
        const vistos=new Set();
        let removidos=0;

        // Percorre do fim para o início para preservar a versão mais recente
        // quando outro módulo inserir novamente a mesma linha no DOM.
        for(let i=linhas.length-1;i>=0;i--){
            const linha=linhas[i];
            const chave=chaveLinhaMeuDia(linha);
            if(!chave)continue;
            if(vistos.has(chave)){
                linha.remove();
                removidos++;
            }else{
                vistos.add(chave);
            }
        }

        if(removidos){
            const painel=home.querySelector('#card_painel_fisioterapeuta');
            if(painel){
                painel.dataset.ksMeuDiaDeduplicado='1';
                painel.dataset.ksMeuDiaDeduplicadoEm=String(Date.now());
            }
        }
        return removidos;
    }

    function normalizarPendencias(){
        const btn=document.getElementById('ks_prof_pendencias_btn');
        const painel=document.getElementById('card_painel_fisioterapeuta');
        if(!btn||!painel)return;
        btn.type='button';
        btn.className='ks-prof-pending-trigger'+(btn.classList.contains('has-pending')?' has-pending':'');
        btn.setAttribute('aria-haspopup','dialog');
        btn.setAttribute('aria-controls','ks_prof_pendencias_dialog');
        const badge=document.getElementById('ks_prof_pendencias_badge');
        const badgeTexto=badge?String(badge.textContent||'0'):'0';
        const badgeHidden=!badge||badge.hidden;
        btn.innerHTML='<span class="ks-prof-pending-icon" aria-hidden="true">✓</span><span>Pendências</span><strong id="ks_prof_pendencias_badge">'+badgeTexto+'</strong>';
        const novoBadge=document.getElementById('ks_prof_pendencias_badge');
        if(novoBadge)novoBadge.hidden=badgeHidden;
        btn.onclick=function(){
            const dialog=document.getElementById('ks_prof_pendencias_dialog');
            if(dialog&&!dialog.open)dialog.showModal();
        };
        const actions=painel.querySelector('.ks-fisio-header-actions');
        if(actions&&btn.parentElement!==actions)actions.appendChild(btn);
    }

    function limparSaudacao(home){
        const candidatos=home.querySelectorAll('h1,h2,h3,strong');
        for(const el of candidatos){
            const texto=String(el.textContent||'').trim().toLowerCase();
            if(texto.startsWith('olá,')||texto.startsWith('ola,')){
                el.classList.add('ks-prof-greeting-clean');
                el.removeAttribute('tabindex');
                break;
            }
        }
    }

    function aplicar(){
        frame=0;
        const home=document.getElementById('tela_home');
        if(!home||!ehProfissional())return;
        home.classList.add('ks-prof-home-active','ks-prof-home-polished');
        esconderCardCadastros24h(home);
        removerDuplicatasMeuDia(home);
        normalizarPendencias();
        limparSaudacao(home);
    }

    function agendar(){
        if(frame)return;
        frame=requestAnimationFrame(aplicar);
    }

    function iniciar(){
        aplicar();
        const home=document.getElementById('tela_home');
        if(!home)return;
        observer?.disconnect();
        observer=new MutationObserver(agendar);
        observer.observe(home,{childList:true,subtree:true,characterData:true});
    }

    document.addEventListener('kinesys:tela-ativada',e=>{if(e.detail?.id==='tela_home')setTimeout(iniciar,0);});
    if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(iniciar,0),{once:true});
    else setTimeout(iniciar,0);

    window.KineSysProfessionalHomePolish=Object.freeze({refresh:aplicar,dedupe(){const home=document.getElementById('tela_home');return home?removerDuplicatasMeuDia(home):0;}});
})();