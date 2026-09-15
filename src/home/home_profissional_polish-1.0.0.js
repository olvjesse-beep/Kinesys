/* KineSys — polish da Home profissional v1.0.2
 * Ajusta composição visual sem alterar contratos clínicos ou consultas.
 * Apenas composição visual; nenhuma escrita na timeline.
 */
(function(){
    'use strict';


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
        const home=document.getElementById('tela_home');
        if(!home||!ehProfissional())return;
        home.classList.add('ks-prof-home-active','ks-prof-home-polished');
        esconderCardCadastros24h(home);
        normalizarPendencias();
        limparSaudacao(home);
    }

    document.addEventListener('kinesys:meu-dia-atualizado',aplicar);
    window.KineSysProfessionalHomePolish=Object.freeze({version:'1.1.0-layout-only',refresh:aplicar});
})();
