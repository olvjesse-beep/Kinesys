/* ========================================================================== 
   KineSys Design System v1.11.1
   - Navegação lateral por perfil
   - Feedback interno (toasts + diálogos) sem alert/confirm do navegador
   - Contexto persistente do paciente
   - Redução de ruído visual e progressive disclosure nas telas legadas
   ========================================================================== */
(function(){
    'use strict';

    const DS_VERSION = '1.11.2';
    const APP_VERSION = typeof KINESYS_APP_VERSION !== 'undefined' ? KINESYS_APP_VERSION : '1.12.0';
    const TITULOS = {
        tela_home: ['Visão geral','O que precisa da sua atenção hoje'],
        tela_cadastro: ['Novo paciente','Cadastro administrativo e contato'],
        tela_buscar: ['Pacientes','Prontuários e histórico clínico'],
        tela_agenda: ['Agenda','Semana de atendimento e disponibilidade'],
        tela_avaliacao: ['Avaliação fisioterapêutica','Anamnese, mapeamento e síntese clínica'],
        tela_evolucao: ['Evolução fisioterapêutica','Registro da sessão e resposta ao tratamento'],
        tela_midias: ['Documentos','Fotos, documentos e anexos do prontuário'],
        tela_relatorio: ['Relatórios','Relatórios clínicos e declarações'],
        tela_financeiro: ['Planos e pagamentos','Pacotes, sessões, recebimentos e saldo'],
        tela_equipe: ['Equipe','Usuários, perfis e permissões'],
        tela_configuracoes: ['Configurações','Mensagens e preferências da clínica'],
        tela_login: ['Acesso ao KineSys','']
    };
    const PACIENTE_SELECTS = ['select_paciente_precadastro','evo_paciente_select','rel_paciente_select','midia_paciente_select','financeiro_paciente_select'];
    const TELAS_CONTEXTO_PACIENTE_ATENDIMENTO = new Set([
        'tela_avaliacao',
        'tela_evolucao',
        'tela_midias',
        'tela_relatorio'
    ]);
    function storageGet(chave){try{return localStorage.getItem(chave)||'';}catch(_){return '';}}
    function storageSet(chave,valor){try{if(valor)localStorage.setItem(chave,valor);else localStorage.removeItem(chave);}catch(_){}}
    // A seleção pertence ao acesso atual, nunca a uma sessão anterior.
    let pacienteContextoId = '';
    storageSet('kinesys_paciente_contexto','');
    let contextoRevisao = 0;
    let buscaRevisao = 0;
    function identidadePaciente(){
        const u=typeof usuarioLogado!=='undefined'?usuarioLogado:null;
        return u?[u.auth_user_id,u.id,u.tipo,u.clinica_id].join('|'):'';
    }
    let identidadeContexto = identidadePaciente();
    function limparSelecaoPaciente(){
        pacienteContextoId='';
        contextoRevisao++;
        storageSet('kinesys_paciente_contexto','');
        if(typeof pacienteAtualId!=='undefined') pacienteAtualId=null;
        PACIENTE_SELECTS.forEach(id=>{const el=document.getElementById(id);if(el){el.value='';delete el.dataset.ksContextLoaded;}});
        const resumo=document.getElementById('ks_prontuario_resumo');
        if(resumo){resumo.hidden=true;resumo.replaceChildren();}
        const barra=document.getElementById('ks_patient_context');
        if(barra) barra.hidden=true;
        document.body.classList.remove('ks-has-patient-context');
        document.querySelectorAll('.ks-patient-card.active').forEach(el=>el.classList.remove('active'));
        document.querySelectorAll('.ks-context-selector-hidden').forEach(el=>el.classList.remove('ks-context-selector-hidden'));
    }
    function sincronizarIdentidadeContexto(){
        const atual=identidadePaciente();
        if(atual!==identidadeContexto){identidadeContexto=atual;limparSelecaoPaciente();}
    }
    let dialogResolve = null;
    let dialogAnteriorFoco = null;

    function icon(nome){
        const paths = {
            home:'<path d="M3 10.5 12 3l9 7.5V21a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z"/>',
            user:'<path d="M20 21a8 8 0 0 0-16 0"/><circle cx="12" cy="7" r="4"/>',
            plus:'<path d="M12 5v14M5 12h14"/>',
            calendar:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/>',
            clinical:'<path d="M4 12h4l2-6 4 12 2-6h4"/>',
            edit:'<path d="M12 20h9"/><path d="m16.5 3.5 4 4L8 20l-5 1 1-5z"/>',
            files:'<path d="M14 2H6a2 2 0 0 0-2 2v16h16V8z"/><path d="M14 2v6h6M8 13h8M8 17h6"/>',
            report:'<path d="M6 2h9l5 5v15H6z"/><path d="M14 2v6h6M9 13h8M9 17h8"/>',
            money:'<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18M7 15h3"/>',
            team:'<circle cx="9" cy="8" r="3"/><circle cx="17" cy="9" r="2.5"/><path d="M3 21a6 6 0 0 1 12 0M14 16a5 5 0 0 1 7 5"/>',
            logout:'<path d="M10 17l5-5-5-5M15 12H3M14 3h7v18h-7"/>',
            chevron:'<path d="m9 18 6-6-6-6"/>',
            close:'<path d="M6 6l12 12M18 6 6 18"/>',
            check:'<path d="m5 12 4 4L19 6"/>',
            warning:'<path d="M12 3 2 21h20z"/><path d="M12 9v5M12 18h.01"/>',
            search:'<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
            menu:'<path d="M4 7h16M4 12h16M4 17h16"/>',
            settings:'<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-1.8 1.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-2.6V20a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1-1.8-1.8.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.6-1H6v-2.6h.2a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1 1.8-1.8.1.1a1.7 1.7 0 0 0 1.9.3 1.7 1.7 0 0 0 1-1.6V5h2.6v.2a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1 1.8 1.8-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v2.6H21a1.7 1.7 0 0 0-1.6 1z"/>'
        };
        return `<svg class="ks-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[nome]||paths.chevron}</svg>`;
    }

    /* -------------------------- Feedback interno -------------------------- */
    function ensureFeedback(){
        if(!document.getElementById('ks_toast_stack')){
            const stack=document.createElement('div'); stack.id='ks_toast_stack'; stack.className='ks-toast-stack'; stack.setAttribute('aria-live','polite'); document.body.appendChild(stack);
        }
        if(!document.getElementById('ks_dialog')){
            const wrap=document.createElement('div');
            wrap.id='ks_dialog'; wrap.className='ks-dialog-overlay'; wrap.hidden=true;
            wrap.innerHTML=`<div class="ks-dialog" role="dialog" aria-modal="true" aria-labelledby="ks_dialog_title" aria-describedby="ks_dialog_message">
                <button type="button" class="ks-dialog-x" aria-label="Fechar">${icon('close')}</button>
                <div class="ks-dialog-symbol" id="ks_dialog_symbol">${icon('warning')}</div>
                <div class="ks-dialog-copy"><h3 id="ks_dialog_title">Atenção</h3><div id="ks_dialog_message"></div></div>
                <div class="ks-dialog-actions"><button type="button" class="btn-secondary ks-danger" id="ks_dialog_alternative" hidden>Descartar rascunho</button><button type="button" class="btn-secondary" id="ks_dialog_cancel">Cancelar</button><button type="button" class="btn-primary" id="ks_dialog_ok">Confirmar</button></div>
            </div>`;
            document.body.appendChild(wrap);
            wrap.querySelector('.ks-dialog-x').addEventListener('click',()=>resolverDialog(false));
            wrap.querySelector('#ks_dialog_cancel').addEventListener('click',()=>resolverDialog(false));
            wrap.querySelector('#ks_dialog_ok').addEventListener('click',()=>resolverDialog(true));
            wrap.querySelector('#ks_dialog_alternative').addEventListener('click',()=>resolverDialog('descartar'));
            wrap.addEventListener('click',e=>{if(e.target===wrap)resolverDialog(false);});
        }
    }
    function textoLimpo(msg){ return String(msg??'').replace(/^[✅✓⚠️❌🔒🛡️💾⧉📌]\s*/,'').trim(); }
    function classificar(msg){
        const s=String(msg||'');
        if(/✅|^✓|sucesso|salv[oa] com sucesso|registrad[oa]\.?$/i.test(s)) return 'sucesso';
        if(/❌|erro|falha|indisponível|não foi possível/i.test(s)) return 'erro';
        if(/🔒|🛡️|bloquead|não tem acesso|não pode/i.test(s)) return 'seguranca';
        if(/⚠️|atenção|corrija|informe|selecione|nenhum/i.test(s)) return 'aviso';
        return 'info';
    }
    function toast(msg,tipo='info',tempo){
        ensureFeedback();
        const stack=document.getElementById('ks_toast_stack');
        const el=document.createElement('div'); el.className=`ks-toast ${tipo}`;
        const titulo={sucesso:'Concluído',erro:'Não foi possível',aviso:'Atenção',seguranca:'Acesso restrito',info:'KineSys'}[tipo]||'KineSys';
        el.innerHTML=`<div class="ks-toast-symbol">${icon(tipo==='sucesso'?'check':tipo==='erro'||tipo==='aviso'||tipo==='seguranca'?'warning':'check')}</div><div><strong>${titulo}</strong><p>${escapeHTMLDS(textoLimpo(msg)).replace(/\n/g,'<br>')}</p></div><button aria-label="Fechar">${icon('close')}</button>`;
        el.querySelector('button').onclick=()=>removerToast(el);
        stack.appendChild(el); requestAnimationFrame(()=>el.classList.add('show'));
        setTimeout(()=>removerToast(el),tempo|| (tipo==='erro'?6500:tipo==='aviso'?4800:3300));
        return el;
    }
    function removerToast(el){ if(!el||el.dataset.saindo)return; el.dataset.saindo='1'; el.classList.remove('show'); setTimeout(()=>el.remove(),220); }
    function escapeHTMLDS(v){ return String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;'); }
    function abrirDialog({titulo='Atenção',mensagem='',confirmar='Confirmar',cancelar='Cancelar',tipo='aviso',apenasOk=false,destrutivo=false,alternativa=''}={}){
        ensureFeedback();
        const o=document.getElementById('ks_dialog'); dialogAnteriorFoco=document.activeElement;
        o.querySelector('#ks_dialog_title').textContent=titulo;
        o.querySelector('#ks_dialog_message').innerHTML=escapeHTMLDS(textoLimpo(mensagem)).replace(/\n/g,'<br>');
        o.querySelector('#ks_dialog_symbol').innerHTML=icon(tipo==='sucesso'?'check':'warning');
        o.querySelector('.ks-dialog').dataset.tipo=tipo;
        const cancel=o.querySelector('#ks_dialog_cancel'); const ok=o.querySelector('#ks_dialog_ok');
        cancel.textContent=cancelar; cancel.hidden=!!apenasOk;
        const alternative=o.querySelector('#ks_dialog_alternative');alternative.textContent=alternativa;alternative.hidden=!alternativa;
        ok.textContent=confirmar; ok.classList.toggle('ks-danger',!!destrutivo);
        o.hidden=false; requestAnimationFrame(()=>o.classList.add('ativa')); setTimeout(()=>ok.focus(),30);
        return new Promise(resolve=>{dialogResolve=resolve;});
    }
    function resolverDialog(valor){
        const o=document.getElementById('ks_dialog'); if(!o||o.hidden)return;
        o.classList.remove('ativa'); setTimeout(()=>{o.hidden=true;},170);
        const r=dialogResolve; dialogResolve=null; if(r)r(valor==='descartar'?'descartar':!!valor);
        if(dialogAnteriorFoco && document.contains(dialogAnteriorFoco)) setTimeout(()=>dialogAnteriorFoco.focus(),30);
    }
    window.confirmarKineSys=function(mensagem,opcoes={}){
        return abrirDialog({titulo:opcoes.titulo||'Confirmar ação',mensagem,confirmar:opcoes.confirmar||'Confirmar',cancelar:opcoes.cancelar||'Cancelar',tipo:opcoes.tipo||'aviso',destrutivo:!!opcoes.destrutivo});
    };
    window.alert=function(mensagem){
        const tipo=classificar(mensagem);
        // Erros de acesso/segurança ou mensagens longas merecem diálogo; feedback comum vira toast e não interrompe o fluxo.
        if(tipo==='seguranca' || (tipo==='erro' && String(mensagem).length>150)){
            abrirDialog({titulo:tipo==='seguranca'?'Acesso restrito':'Não foi possível concluir',mensagem,confirmar:'Entendi',apenasOk:true,tipo});
        } else toast(mensagem,tipo);
    };
    window.mostrarToastKineSys=toast;
    window.mostrarDialogoKineSys=abrirDialog;

    document.addEventListener('keydown',e=>{
        const o=document.getElementById('ks_dialog');
        if(e.key==='Escape' && o && !o.hidden){e.preventDefault();resolverDialog(false);return;}
        if(e.key==='Tab' && o && !o.hidden){
            const f=[...o.querySelectorAll('button:not([hidden]),[href],input,select,textarea,[tabindex]:not([tabindex="-1"])')].filter(x=>!x.disabled);
            if(!f.length)return; const primeiro=f[0],ultimo=f[f.length-1];
            if(e.shiftKey&&document.activeElement===primeiro){e.preventDefault();ultimo.focus();}
            else if(!e.shiftKey&&document.activeElement===ultimo){e.preventDefault();primeiro.focus();}
        }
    });

    /* -------------------------- Navegação -------------------------- */
    const navConfig=[
        ['CLÍNICA',[
            ['tela_home','Início','home'],['tela_buscar','Pacientes','user'],['tela_cadastro','Novo paciente','plus'],['tela_agenda','Agenda','calendar']
        ]],
        ['ATENDIMENTO',[
            ['tela_avaliacao','Avaliação','clinical'],['tela_evolucao','Evolução','edit'],['tela_midias','Documentos','files'],['tela_relatorio','Relatórios','report']
        ]],
        ['GESTÃO',[
            ['tela_financeiro','Planos e pagamentos','money'],['tela_equipe','Equipe','team'],['tela_configuracoes','Configurações','settings']
        ]]
    ];
    function prepararSidebar(){
        const header=document.querySelector('body > header'); const ul=document.getElementById('dropdownContent'); if(!header||!ul)return;
        header.id='ks_sidebar'; header.classList.add('ks-sidebar');
        const bp=header.querySelector('.header-brand p'); if(bp)bp.textContent='Gestão clínica e apoio à decisão';
        const map=new Map();
        [...ul.querySelectorAll('li[data-tela-menu]')].forEach(li=>map.set(li.dataset.telaMenu,li));
        const sair=[...ul.querySelectorAll('li')].find(li=>/fazerLogout/.test(li.innerHTML));
        ul.innerHTML='';
        navConfig.forEach(([grupo,itens])=>{
            const label=document.createElement('li');label.className='ks-nav-label';label.textContent=grupo;ul.appendChild(label);
            itens.forEach(([id,rot,ico])=>{const li=map.get(id);if(!li)return;const a=li.querySelector('a');if(a)a.innerHTML=`<span class="ks-nav-icon">${icon(ico)}</span><span>${rot}</span>`;ul.appendChild(li);});
        });
        if(sair){sair.classList.add('ks-nav-logout'); const a=sair.querySelector('a');if(a)a.innerHTML=`<span class="ks-nav-icon">${icon('logout')}</span><span>Sair</span>`;ul.appendChild(sair);}
        const btn=document.getElementById('menuToggle'); if(btn)btn.innerHTML=`${icon('menu')}<span>Menu</span>`;
        const welcome=document.getElementById('header_welcome'); if(welcome){welcome.innerHTML=`<span class="ks-user-kicker">USUÁRIO</span><strong id="lbl_usuario_logado">${document.getElementById('lbl_usuario_logado')?.textContent||''}</strong><small id="ks_sidebar_role"></small>`;}
    }
    function criarTopbar(){
        const container=document.querySelector('body > .container'); if(!container||document.getElementById('ks_topbar'))return;
        const top=document.createElement('div');top.id='ks_topbar';top.className='ks-topbar';
        top.innerHTML=`<div class="ks-page-heading"><span id="ks_page_kicker">KINESYS</span><h1 id="ks_page_title">Visão geral</h1><p id="ks_page_subtitle"></p></div><div class="ks-topbar-actions"><div class="ks-notificacoes" id="ks_notificacoes_wrapper" hidden><button type="button" class="ks-notificacoes-btn" id="ks_notificacoes_btn" aria-label="Avisos da Agenda" title="Avisos da Agenda" onclick="alternarPainelNotificacoes()">🔔<span id="ks_notificacoes_badge" class="ks-notificacoes-badge" hidden>0</span></button><div id="ks_notificacoes_painel" class="ks-notificacoes-painel" hidden><div class="ks-notificacoes-head"><strong>Avisos da Agenda</strong><button type="button" onclick="marcarTodasNotificacoesAgendaLidas()">Marcar como lidas</button></div><div id="ks_notificacoes_lista" class="ks-notificacao-lista"><div class="ks-notificacao-vazia">Nenhum aviso novo.</div></div></div></div><button type="button" class="ks-mobile-menu" id="ks_mobile_menu" aria-label="Abrir menu">${icon('menu')}</button><span class="ks-version">v${APP_VERSION}</span></div>`;
        const ctx=document.createElement('div');ctx.id='ks_patient_context';ctx.className='ks-patient-context';ctx.hidden=true;
        ctx.innerHTML=`<div class="ks-patient-main"><span class="ks-patient-avatar">P</span><div><strong id="ks_patient_name"></strong><span id="ks_patient_meta"></span></div></div><nav class="ks-patient-tabs" aria-label="Atalhos do prontuário"><button data-patient-target="tela_buscar">Resumo</button><button data-patient-target="tela_avaliacao">Avaliação</button><button data-patient-target="tela_evolucao">Evolução</button><button data-patient-target="tela_midias">Documentos</button><button data-patient-target="tela_relatorio">Relatórios</button><button data-patient-target="tela_financeiro">Financeiro</button></nav><div class="ks-patient-actions"><button type="button" class="ks-patient-change" aria-label="Trocar paciente">${icon('user')}<span>Trocar paciente</span></button><button type="button" class="ks-patient-clear" aria-label="Fechar prontuário e ficar sem paciente selecionado" title="Fechar prontuário">${icon('close')}</button></div>`;
        container.insertBefore(ctx,container.firstChild);container.insertBefore(top,ctx);

        /* Navegação móvel robusta: backdrop clicável, Escape, aria-expanded e
           fechamento automático ao mudar de breakpoint. */
        let navBackdrop=document.getElementById('ks_nav_backdrop');
        if(!navBackdrop){
            navBackdrop=document.createElement('button');
            navBackdrop.type='button';
            navBackdrop.id='ks_nav_backdrop';
            navBackdrop.className='ks-nav-backdrop';
            navBackdrop.setAttribute('aria-label','Fechar menu de navegação');
            document.body.appendChild(navBackdrop);
        }
        const mobileBtn=top.querySelector('#ks_mobile_menu');
        const setNavOpen=(open)=>{
            document.body.classList.toggle('ks-nav-open',!!open);
            if(mobileBtn) mobileBtn.setAttribute('aria-expanded',open?'true':'false');
            navBackdrop.hidden=!open;
        };
        navBackdrop.hidden=true;
        navBackdrop.onclick=()=>setNavOpen(false);
        if(mobileBtn){
            mobileBtn.setAttribute('aria-controls','ks_sidebar');
            mobileBtn.setAttribute('aria-expanded','false');
            mobileBtn.onclick=()=>setNavOpen(!document.body.classList.contains('ks-nav-open'));
        }
        document.getElementById('dropdownContent')?.addEventListener('click',e=>{
            if(e.target.closest('a')) setNavOpen(false);
        });
        document.addEventListener('keydown',e=>{
            if(e.key==='Escape'&&document.body.classList.contains('ks-nav-open')) setNavOpen(false);
        });
        window.addEventListener('resize',()=>{
            if(window.innerWidth>820&&document.body.classList.contains('ks-nav-open')) setNavOpen(false);
        },{passive:true});
        ctx.querySelector('.ks-patient-change').onclick=async()=>{if(typeof window.fecharRadarKineSys==='function')window.fecharRadarKineSys(true);await definirPacienteContexto('');window.navegarPara('tela_buscar');setTimeout(()=>{const busca=document.getElementById('input_busca_paciente');busca?.focus();busca?.scrollIntoView({block:'center',behavior:'smooth'});},60);};
        ctx.querySelector('.ks-patient-clear').onclick=async()=>{if(typeof window.fecharRadarKineSys==='function')window.fecharRadarKineSys(true);await definirPacienteContexto('');const tela=document.querySelector('.tela.ativa')?.id||'';const ids={tela_avaliacao:'select_paciente_precadastro',tela_evolucao:'evo_paciente_select',tela_midias:'midia_paciente_select',tela_financeiro:'financeiro_paciente_select',tela_relatorio:'rel_paciente_select'};const sel=document.getElementById(ids[tela]||'');if(sel){sel.value='';sel.dispatchEvent(new Event('change',{bubbles:true}));setTimeout(()=>sel.focus(),30);}};
        ctx.querySelectorAll('[data-patient-target]').forEach(btn=>btn.addEventListener('click',()=>abrirPacienteNaTela(btn.dataset.patientTarget)));
        setTimeout(()=>{ if(typeof window.renderizarIndicadorNotificacoesAgenda==='function') window.renderizarIndicadorNotificacoesAgenda(); },0);
    }
    function atualizarGruposNav(){
        const ul=document.getElementById('dropdownContent');if(!ul)return;const labels=[...ul.querySelectorAll('.ks-nav-label')];
        labels.forEach(label=>{let n=label.nextElementSibling,vis=false;while(n&&!n.classList.contains('ks-nav-label')&&!n.classList.contains('ks-nav-logout')){if(n.dataset.telaMenu&&getComputedStyle(n).display!=='none')vis=true;n=n.nextElementSibling;}label.style.display=vis?'block':'none';});
    }
    function atualizarPaginaAtiva(id){
        const [tit,sub]=TITULOS[id]||['KineSys',''];
        const t=document.getElementById('ks_page_title'),s=document.getElementById('ks_page_subtitle'); if(t)t.textContent=tit;if(s)s.textContent=sub;
        document.querySelectorAll('#dropdownContent li[data-tela-menu]').forEach(li=>li.classList.toggle('ks-active',li.dataset.telaMenu===id));
        document.querySelectorAll('#ks_patient_context [data-patient-target]').forEach(b=>b.classList.toggle('active',b.dataset.patientTarget===id));
        document.body.dataset.tela=id;
        document.body.classList.remove('ks-nav-open');
        const navBackdrop=document.getElementById('ks_nav_backdrop'); if(navBackdrop) navBackdrop.hidden=true;
        const mobileMenu=document.getElementById('ks_mobile_menu'); if(mobileMenu) mobileMenu.setAttribute('aria-expanded','false');
        if(id==='tela_home')setTimeout(atualizarHomeOperacional,80);
        if(id==='tela_buscar'){
            // A tela Pacientes inicia sempre sem prontuário ativo. O contexto
            // só nasce após uma escolha explícita no resultado da busca.
            limparSelecaoPaciente();
            const busca=document.getElementById('input_busca_paciente');
            if(busca) busca.value='';
            setTimeout(()=>{renderProntuarioCards('');atualizarResumoPacienteContexto();},50);
        }
        setTimeout(()=>{atualizarContextoVisual();aplicarContextoNaTela(id);},10);
    }
    function wrapNavegacao(){
        if(typeof window.navegarPara!=='function'||window.navegarPara.__ksWrapped)return;
        const orig=window.navegarPara;
        const wrapped=function(...args){sincronizarIdentidadeContexto();if(args[0]==='tela_buscar'||args[0]==='tela_login')limparSelecaoPaciente();const r=orig.apply(this,args); const ativo=document.querySelector('.tela.ativa')?.id||args[0]; atualizarPaginaAtiva(ativo); return r;};
        wrapped.__ksWrapped=true;window.navegarPara=wrapped;
    }

    /* -------------------------- Contexto do paciente -------------------------- */
    async function obterPacienteContexto(){
        if(!pacienteContextoId||typeof window.obterPacientesSalvos!=='function')return null;
        const id=pacienteContextoId,revisao=contextoRevisao;
        try{const l=await window.obterPacientesSalvos();if(revisao!==contextoRevisao)return null;return (l||[]).find(p=>String(p.id)===String(id))||null;}catch(_){return null;}
    }
    async function definirPacienteContexto(id){
        sincronizarIdentidadeContexto();
        if(!id){limparSelecaoPaciente();return;}
        contextoRevisao++;
        pacienteContextoId=id||'';
        storageSet('kinesys_paciente_contexto',pacienteContextoId);
        await atualizarContextoVisual();
        if(document.getElementById('tela_buscar')?.classList.contains('ativa'))atualizarResumoPacienteContexto();
    }
    window.definirPacienteContexto=definirPacienteContexto;
    function atualizarSeletoresContexto(tela,paciente){
        const mapa={tela_avaliacao:'select_paciente_precadastro',tela_evolucao:'evo_paciente_select',tela_midias:'midia_paciente_select',tela_financeiro:'financeiro_paciente_select',tela_relatorio:'rel_paciente_select'};
        Object.entries(mapa).forEach(([t,id])=>{
            const sel=document.getElementById(id);if(!sel)return;
            const grp=sel.closest('.input-group')||sel.parentElement; if(!grp)return;
            grp.classList.add('ks-context-selector');
            grp.classList.toggle('ks-context-selector-hidden',!!paciente&&tela===t);
        });
    }

    async function atualizarContextoVisual(){
        const ctx=document.getElementById('ks_patient_context');if(!ctx)return;
        const p=await obterPacienteContexto();
        const tela=document.querySelector('.tela.ativa')?.id||'';
        const telaAtendimento=TELAS_CONTEXTO_PACIENTE_ATENDIMENTO.has(tela);
        document.body.classList.toggle('ks-has-patient-context',!!p&&telaAtendimento);
        atualizarSeletoresContexto(tela,p);
        if(!p||!telaAtendimento){ctx.hidden=true;return;}
        ctx.hidden=false;ctx.querySelector('#ks_patient_name').textContent=p.nome||'Paciente';
        const meta=[]; const idade=(typeof window.idadeNumericaPaciente==='function'?window.idadeNumericaPaciente(p):p.idade)||''; if(idade)meta.push(String(idade).replace(/\s*anos?/i,'')+' anos');if(p.profissao)meta.push(p.profissao);const avs=typeof window.obterAvaliacoes==='function'?window.obterAvaliacoes(p):(p.avaliacoes||[]);if(avs.length)meta.push(`${avs.length} avaliação(ões)`);ctx.querySelector('#ks_patient_meta').textContent=meta.join(' · ')||'Prontuário ativo';ctx.querySelector('.ks-patient-avatar').textContent=(p.nome||'P').trim().charAt(0).toUpperCase();
        ctx.querySelectorAll('[data-patient-target]').forEach(b=>{b.hidden=typeof window.telaPermitida==='function'&&!window.telaPermitida(b.dataset.patientTarget);});
    }
    async function selecionarPacienteControle(idControle, pacienteId, disparar=true){
        if(!idControle||!pacienteId)return false;
        for(let i=0;i<12;i++){
            const sel=document.getElementById(idControle);
            if(sel&&[...sel.options].some(o=>String(o.value)===String(pacienteId))){
                if(String(sel.value)!==String(pacienteId)){sel.value=pacienteId;if(disparar)sel.dispatchEvent(new Event('change',{bubbles:true}));}
                else if(disparar && !sel.dataset.ksContextLoaded){sel.dispatchEvent(new Event('change',{bubbles:true}));}
                sel.dataset.ksContextLoaded='1';return true;
            }
            await new Promise(r=>setTimeout(r,70));
        }
        return false;
    }
    async function aplicarContextoNaTela(tela){
        if(!pacienteContextoId)return;
        const ids={tela_avaliacao:'select_paciente_precadastro',tela_evolucao:'evo_paciente_select',tela_midias:'midia_paciente_select',tela_financeiro:'financeiro_paciente_select',tela_relatorio:'rel_paciente_select'};
        // A lista da Avaliação é carregada de forma assíncrona e historicamente
        // filtrava pacientes já avaliados. Aguarda sua reconstrução antes de
        // tentar selecionar o prontuário ativo para não depender de timeout.
        if(tela==='tela_avaliacao'&&typeof window.atualizarSelectPacientesPreCadastro==='function'){
            await window.atualizarSelectPacientesPreCadastro();
        }
        if(ids[tela])await selecionarPacienteControle(ids[tela],pacienteContextoId,true);
    }
    async function abrirPacienteNaTela(tela){
        const p=await obterPacienteContexto();if(!p)return;
        if(typeof window.telaPermitida==='function'&&!window.telaPermitida(tela)){toast('Seu perfil não tem acesso a esta área.','seguranca');return;}
        if(tela==='tela_buscar'){window.navegarPara(tela);return;}
        window.navegarPara(tela,true);
        await aplicarContextoNaTela(tela);
        // A Avaliação possui uma fila de pré-cadastro com filtros próprios.
        // Forçamos a carga pelo prontuário ativo para que pacientes já avaliados
        // também tenham nome, idade e profissão preenchidos ao abrir nova avaliação.
        if(tela==='tela_avaliacao'&&typeof window.carregarPacientePreCadastradoNaAvaliacao==='function'){
            await window.carregarPacientePreCadastradoNaAvaliacao();
        }
    }
    window.abrirPacienteNaTela=abrirPacienteNaTela;

    async function executarAcaoPacienteCard(acao,id){
        const pacienteId=String(id||'').trim();
        if(!pacienteId)return;
        await definirPacienteContexto(pacienteId);
        if(acao==='selecionar'){
            await atualizarResumoPacienteContexto();
            return;
        }
        if(acao==='editar'){
            if(typeof window.editarCadastro!=='function'){toast('Não foi possível abrir a edição deste paciente.','erro');return;}
            await window.editarCadastro(pacienteId);
            return;
        }
        if(acao==='evolucao'){
            await abrirPacienteNaTela('tela_evolucao');
            return;
        }
        if(acao==='avaliacao'){
            await abrirPacienteNaTela('tela_avaliacao');
            return;
        }
        if(acao==='documentos'){
            await abrirPacienteNaTela('tela_midias');
            return;
        }
        if(acao==='prontuario'){
            if(typeof window.abrirEscolhaProntuarioPDF!=='function'){toast('A exportação do prontuário não está disponível.','erro');return;}
            window.abrirEscolhaProntuarioPDF(pacienteId);
            return;
        }
        if(acao==='prontuario_simples'){
            if(typeof window.gerarProntuarioCompletoPDF!=='function'){toast('A exportação do prontuário não está disponível.','erro');return;}
            window.gerarProntuarioCompletoPDF(pacienteId,'simplificado');
            return;
        }
        if(acao==='prontuario_detalhado'){
            if(typeof window.gerarProntuarioCompletoPDF!=='function'){toast('A exportação do prontuário não está disponível.','erro');return;}
            window.gerarProntuarioCompletoPDF(pacienteId,'detalhado');
            return;
        }
        if(acao==='excluir'){
            if(typeof window.excluirPaciente!=='function'){toast('A exclusão de paciente não está disponível.','erro');return;}
            await window.excluirPaciente(pacienteId);
            return;
        }
    }
    window.executarAcaoPacienteCard=executarAcaoPacienteCard;

    function vincularAcoesProntuario(){
        const cards=document.getElementById('ks_prontuario_cards');
        if(cards&&!cards.dataset.ksActionsBound){
            cards.dataset.ksActionsBound='1';
            cards.addEventListener('click',async e=>{
                const btn=e.target.closest('[data-ks-patient-action]');
                if(!btn||!cards.contains(btn))return;
                e.preventDefault();e.stopPropagation();
                if(btn.disabled)return;
                btn.disabled=true;
                try{await executarAcaoPacienteCard(btn.dataset.ksPatientAction,btn.dataset.patientId);}
                catch(err){console.error('KineSys Pacientes: falha ao executar ação.',err);toast('Não foi possível concluir esta ação do paciente.','erro');}
                finally{btn.disabled=false;}
            });
        }
        const resumo=document.getElementById('ks_prontuario_resumo');
        if(resumo&&!resumo.dataset.ksActionsBound){
            resumo.dataset.ksActionsBound='1';
            resumo.addEventListener('keydown',e=>{
                if((e.key==='Enter'||e.key===' ')&&e.target.closest('[data-ks-patient-close]')){
                    e.preventDefault();e.stopPropagation();limparSelecaoPaciente();
                    document.getElementById('input_busca_paciente')?.focus();
                }
            });
            resumo.addEventListener('click',async e=>{
                if(e.target.closest('[data-ks-patient-close]')){
                    e.preventDefault();e.stopPropagation();limparSelecaoPaciente();
                    document.getElementById('input_busca_paciente')?.focus();return;
                }
                const btn=e.target.closest('[data-ks-patient-action]');
                if(!btn||!resumo.contains(btn))return;
                e.preventDefault();e.stopPropagation();
                if(btn.disabled)return;
                btn.disabled=true;
                try{await executarAcaoPacienteCard(btn.dataset.ksPatientAction,pacienteContextoId);}
                catch(err){console.error('KineSys Pacientes: falha ao executar ação do prontuário ativo.',err);toast('Não foi possível concluir esta ação do paciente.','erro');}
                finally{btn.disabled=false;}
            });
        }
    }
    function escutarSeletoresPaciente(){
        sincronizarIdentidadeContexto();
        PACIENTE_SELECTS.forEach(id=>{const el=document.getElementById(id);if(!el||el.dataset.ksContextListener)return;el.dataset.ksContextListener='1';el.addEventListener('change',()=>{if(el.value)definirPacienteContexto(el.value);});});
    }

    /* -------------------------- Home operacional -------------------------- */
    function prepararHome(){
        const home=document.getElementById('tela_home');if(!home||document.getElementById('ks_home_hero'))return;
        const hero=document.createElement('section');hero.id='ks_home_hero';hero.className='ks-home-hero';
        hero.innerHTML=`<div><span class="ks-eyebrow">PAINEL OPERACIONAL</span><h2 id="ks_home_greeting">Visão geral</h2><p id="ks_home_date"></p></div><button type="button" class="btn-primary ks-home-primary" data-tela="tela_agenda">Abrir agenda</button>`;
        const grid=document.createElement('div');grid.className='ks-home-stats';grid.innerHTML=`<div class="ks-home-stat-action" role="button" tabindex="0" data-ks-home-detail="atendimentos" aria-label="Abrir atendimentos realizados hoje"><span>Atendimentos realizados hoje</span><strong id="ks_home_agenda_count">—</strong><b class="ks-home-stat-arrow">›</b></div><div class="ks-home-stat-action" role="button" tabindex="0" data-ks-home-detail="pendencias" aria-label="Abrir pendências clínicas"><span>Pendências clínicas</span><strong id="ks_home_pend_count">—</strong><b class="ks-home-stat-arrow">›</b></div><div class="ks-home-stat-action" role="button" tabindex="0" data-ks-home-detail="recentes" aria-label="Abrir pacientes recentes"><span>Pacientes recentes</span><strong id="ks_home_recent_count">—</strong><b class="ks-home-stat-arrow">›</b></div>`;
        const ancora=home.querySelector(':scope > .card');home.insertBefore(hero,ancora||null);home.insertBefore(grid,ancora||null);
        hero.querySelector('[data-tela]').onclick=()=>window.navegarPara('tela_agenda');
        const rec=home.querySelector('#lista_pacientes_recentes')?.closest('.card');const pend=home.querySelector('#card_pendencias_clinicas');if(rec&&pend){const cols=document.createElement('div');cols.className='ks-home-columns';rec.classList.add('card--flat');pend.classList.add('card--flat');rec.parentNode.insertBefore(cols,rec);cols.append(rec,pend);}
        const crm=home.querySelector('#card_crm');if(crm&&!crm.closest('details')){const det=document.createElement('details');det.className='ks-home-crm';const sum=document.createElement('summary');sum.textContent='CRM e relacionamento';crm.parentNode.insertBefore(det,crm);det.append(sum,crm);crm.classList.add('ks-home-crm-card');}
    }
    async function atualizarHomeOperacional(){
        const d=document.getElementById('ks_home_date');if(d)d.textContent=new Intl.DateTimeFormat('pt-BR',{weekday:'long',day:'2-digit',month:'long'}).format(new Date());
        const g=document.getElementById('ks_home_greeting'); if(g&&((typeof usuarioLogado!=='undefined')?usuarioLogado:null))g.textContent=`Olá, ${(((typeof usuarioLogado!=='undefined')?usuarioLogado:null).nome||'').split(' ')[0]||'equipe'}`;
        const agendaBtn=document.querySelector('#ks_home_hero [data-tela="tela_agenda"]');if(agendaBtn&&typeof window.telaPermitida==='function')agendaBtn.hidden=!window.telaPermitida('tela_agenda');
        try{
            if(((typeof _supabase!=='undefined')?_supabase:null) && typeof window.telaPermitida==='function'&&window.telaPermitida('tela_agenda')){
                const agora=new Date();
                const hoje=`${agora.getFullYear()}-${String(agora.getMonth()+1).padStart(2,'0')}-${String(agora.getDate()).padStart(2,'0')}`;
                const tipo=String(((typeof usuarioLogado!=='undefined')?usuarioLogado:null)?.tipo||'').toUpperCase();
                const admin=['MASTER','MASTER_FEM','ADMINISTRADOR','ADMINISTRADORA'].includes(tipo);
                const clinico=['FISIOTERAPEUTA','PROFISSIONAL','MEDICO','EDUCADOR_FISICO'].includes(tipo);
                let q=((typeof _supabase!=='undefined')?_supabase:null).from('agendamentos').select('id,profissional_id,status').eq('data',hoje).in('status',['atendido','concluido']);
                if(!admin&&clinico&&((typeof usuarioLogado!=='undefined')?usuarioLogado:null)?.id)q=q.eq('profissional_id',String(((typeof usuarioLogado!=='undefined')?usuarioLogado:null).id));
                const {data,error}=await q;if(error)throw error;
                const e=document.getElementById('ks_home_agenda_count');if(e)e.textContent=(data||[]).length;
            }else{const e=document.getElementById('ks_home_agenda_count');if(e)e.textContent='—';}
        }catch(_){const e=document.getElementById('ks_home_agenda_count');if(e)e.textContent='—';}
        setTimeout(()=>{const p=document.getElementById('lista_pendencias_clinicas');const pe=document.getElementById('ks_home_pend_count');if(pe)pe.textContent=p?[...p.children].filter(x=>x.textContent.trim()).length:'—';const r=document.getElementById('lista_pacientes_recentes');const re=document.getElementById('ks_home_recent_count');if(re)re.textContent=r?Math.min(3,r.querySelectorAll('tr').length||r.querySelectorAll('.ks-recent-item').length):'—';},200);
    }

    /* -------------------------- Prontuário / paciente workspace -------------------------- */
    function prepararProntuarios(){
        const tela=document.getElementById('tela_buscar');if(!tela||document.getElementById('ks_prontuario_cards'))return;
        const card=tela.querySelector('.card');if(!card)return;card.classList.add('ks-prontuario-search-card');const cardTitle=card.querySelector('.card-header h2');if(cardTitle)cardTitle.textContent='Pacientes cadastrados';
        const resumo=document.createElement('div');resumo.id='ks_prontuario_resumo';resumo.className='ks-prontuario-resumo';resumo.hidden=true;card.parentNode.insertBefore(resumo,card);
        const cards=document.createElement('div');cards.id='ks_prontuario_cards';cards.className='ks-prontuario-cards';card.appendChild(cards);
        vincularAcoesProntuario();

        const input=document.getElementById('input_busca_paciente');if(input){input.placeholder='Buscar por nome, CPF ou telefone…';const grp=input.closest('.input-group');if(grp)grp.classList.add('ks-search-field');}
    }
    async function renderProntuarioCards(filtro){
        const c=document.getElementById('ks_prontuario_cards');if(!c||typeof window.obterPacientesSalvos!=='function')return;
        const revisao=++buscaRevisao;
        const q=String(filtro!==undefined?filtro:document.getElementById('input_busca_paciente')?.value||'').trim().toLowerCase();
        if(!q){c.innerHTML='<div class="ks-empty">Digite o nome, CPF ou telefone e selecione um paciente.</div>';return;}
        try{
            const lista=await window.obterPacientesSalvos();if(revisao!==buscaRevisao)return;
            const norm=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
            const digitos=q.replace(/\D/g,'');
            const itens=(lista||[]).filter(p=>norm(p.nome).includes(norm(q))||(digitos.length>0&&(String(p.cpf||'').replace(/\D/g,'').includes(digitos)||String(p.telefone||'').replace(/\D/g,'').includes(digitos))));
            if(!itens.length){c.innerHTML='<div class="ks-empty">Nenhum paciente encontrado.</div>';return;}
            c.innerHTML=itens.map(p=>{
                const avs=typeof window.obterAvaliacoes==='function'?window.obterAvaliacoes(p):p.avaliacoes||[];const ev=p.evolucoes||[];const av=avs[avs.length-1];const ult=ev.slice().sort((a,b)=>String(b.data||b.dataHoraISO||'').localeCompare(String(a.data||a.dataHoraISO||'')))[0];const id=escapeHTMLDS(p.id);const idade=typeof window.idadeNumericaPaciente==='function'?window.idadeNumericaPaciente(p):p.idade;
                return `<article class="ks-patient-card ${String(p.id)===String(pacienteContextoId)?'active':''}"><button type="button" class="ks-patient-card-main" data-ks-patient-action="selecionar" data-patient-id="${id}"><span class="ks-patient-initial">${escapeHTMLDS((p.nome||'P').charAt(0))}</span><span class="ks-patient-card-copy"><strong>${escapeHTMLDS(p.nome||'Paciente')}</strong><small>${escapeHTMLDS([idade?String(idade).replace(/\s*anos?/i,'')+' anos':'',p.profissao||''].filter(Boolean).join(' · ')||'Cadastro administrativo')}</small><em>${av?`${avs.length} avaliação(ões)`:'Sem avaliação finalizada'}${ult?` · Última evolução ${escapeHTMLDS(ult.data||'')}`:''}</em></span></button><div class="ks-patient-card-actions"><button type="button" data-ks-patient-action="evolucao" data-patient-id="${id}">Evolução</button><button type="button" data-ks-patient-action="documentos" data-patient-id="${id}">Documentos</button><button type="button" data-ks-patient-action="prontuario" data-patient-id="${id}">PDF</button><button type="button" class="ks-more" data-ks-patient-action="editar" data-patient-id="${id}">Editar</button></div></article>`;
            }).join('');
        }catch(e){if(revisao===buscaRevisao)c.innerHTML='<div class="ks-empty">Não foi possível carregar os pacientes.</div>';}
    }
    window.renderProntuarioCards=renderProntuarioCards;
    async function atualizarResumoPacienteContexto(){
        const r=document.getElementById('ks_prontuario_resumo');if(!r)return;const revisao=contextoRevisao;const p=await obterPacienteContexto();if(revisao!==contextoRevisao)return;if(!p){r.hidden=true;r.replaceChildren();return;}r.hidden=false;
        const avs=typeof window.obterAvaliacoes==='function'?window.obterAvaliacoes(p):p.avaliacoes||[];const ev=p.evolucoes||[];const av=avs[avs.length-1];const idade=typeof window.idadeNumericaPaciente==='function'?window.idadeNumericaPaciente(p):p.idade;
        const podeExcluir=typeof window.usuarioEhMaster==='function'&&window.usuarioEhMaster();
        r.innerHTML=`<div class="ks-prontuario-summary-main"><span class="ks-patient-initial lg">${escapeHTMLDS((p.nome||'P').charAt(0))}</span><div><span class="ks-eyebrow">PRONTUÁRIO ATIVO</span><h2>${escapeHTMLDS(p.nome||'Paciente')}</h2><p>${escapeHTMLDS([idade?String(idade).replace(/\s*anos?/i,'')+' anos':'',p.profissao||'',p.telefone||''].filter(Boolean).join(' · '))}</p></div></div><div class="ks-prontuario-metrics"><div><span>Avaliações</span><strong>${avs.length}</strong></div><div><span>Evoluções</span><strong>${ev.length}</strong></div><div><span>Última avaliação</span><strong>${escapeHTMLDS(av?.dataAvaliacao||'—')}</strong></div></div><div class="ks-prontuario-actions"><button type="button" class="btn-primary" data-ks-patient-action="evolucao">Registrar evolução</button><button type="button" class="btn-secondary" data-ks-patient-action="avaliacao">Nova avaliação</button><button type="button" class="btn-secondary" data-ks-patient-action="documentos">Documentos</button><button type="button" class="btn-secondary" data-ks-patient-action="prontuario_simples">PDF simplificado</button>${(typeof window.podeExportarProntuarioDetalhado==='function'&&window.podeExportarProntuarioDetalhado())?'<button type="button" class="btn-secondary" data-ks-patient-action="prontuario_detalhado">PDF detalhado</button>':''}${podeExcluir?'<button type="button" class="btn-danger ks-patient-delete" data-ks-patient-action="excluir" title="Excluir cadastro e todo o histórico">Excluir cadastro</button>':''}</div>`;
        const fechar=document.createElement('button');
        fechar.type='button';fechar.className='ks-prontuario-close';
        fechar.dataset.ksPatientClose='1';fechar.textContent='×';
        fechar.setAttribute('aria-label','Fechar paciente selecionado');
        fechar.title='Fechar paciente selecionado';r.appendChild(fechar);
    }
    window.atualizarResumoPacienteContexto=atualizarResumoPacienteContexto;
    function wrapProntuarioRender(){
        window.renderProntuarioCardsKineSys=renderProntuarioCards;
        window.renderizarTabelaProntuarios=async function(f=''){return renderProntuarioCards(f);};
        window.filtrarPacientesSalvos=function(){const v=document.getElementById('input_busca_paciente')?.value||'';return renderProntuarioCards(v);};
    }

    /* -------------------------- Evolução -------------------------- */
    function prepararEvolucao(){
        const tela=document.getElementById('tela_evolucao');if(!tela||tela.dataset.ksPrepared)return;tela.dataset.ksPrepared='1';
        const data=document.getElementById('evo_data');if(data&&!data.value)data.value=new Date().toISOString().slice(0,10);
        const principal=tela.querySelector(':scope > .card');if(principal){
            principal.classList.add('ks-evo-main');const nested=principal.querySelectorAll(':scope > .card');
            if(nested[0]){nested[0].classList.add('ks-evo-section','ks-evo-state');const checks=nested[0].querySelector('.checkbox-group');const mud=nested[0].querySelector('.input-group');if(checks&&mud&&!nested[0].querySelector('.ks-evo-compact-details')){const det=document.createElement('details');det.className='ks-evo-compact-details';det.innerHTML='<summary>Mudanças, intercorrências e segurança</summary><div class="ks-evo-compact-body"></div>';const body=det.querySelector('.ks-evo-compact-body');body.append(checks,mud);nested[0].appendChild(det);}}
            if(nested[1]){nested[1].classList.add('ks-evo-section','ks-evo-load');if(!nested[1].closest('.ks-evo-load-details')){const det=document.createElement('details');det.className='ks-evo-compact-details ks-evo-load-details';det.innerHTML='<summary>Resposta à carga e parâmetros da sessão</summary><div class="ks-evo-compact-body"></div>';const body=det.querySelector('.ks-evo-compact-body');nested[1].parentNode.insertBefore(det,nested[1]);body.appendChild(nested[1]);}}
        }
        const hist=tela.querySelectorAll(':scope > .card');[...hist].slice(1).forEach((card,i)=>{card.classList.add('ks-collapsible-card');const head=card.querySelector('.card-header');if(head&&!head.querySelector('.ks-collapse-toggle')){const btn=document.createElement('button');btn.type='button';btn.className='ks-collapse-toggle';btn.innerHTML=`${i===0?'Histórico de sessões':'Linha do tempo completa'} ${icon('chevron')}`;btn.onclick=()=>card.classList.toggle('ks-expanded');head.innerHTML='';head.appendChild(btn);}});
    }

    /* -------------------------- Relatório -------------------------- */
    function prepararRelatorio(){
        const tela=document.getElementById('tela_relatorio');if(!tela||document.getElementById('ks_report_workspace'))return;const card=tela.querySelector(':scope > .card');if(!card)return;
        card.classList.add('ks-report-shell');const oldHead=card.querySelector(':scope > .card-header');if(oldHead)oldHead.remove();
        const workspace=document.createElement('div');workspace.id='ks_report_workspace';workspace.className='ks-report-workspace';const left=document.createElement('div');left.className='ks-report-config';const right=document.createElement('div');right.className='ks-report-editor';right.innerHTML='<div class="ks-report-placeholder"><span class="ks-eyebrow">DOCUMENTO</span><h3>Seu relatório aparecerá aqui</h3><p>Escolha o paciente e o tipo de documento. Para relatórios, gere ou edite o texto antes de montar para impressão.</p></div>';
        const official=document.getElementById('bloco_relatorio_oficial');if(official){right.appendChild(official);official.classList.add('ks-report-official');}
        [...card.children].forEach(ch=>{if(ch!==workspace && ch!==official)left.appendChild(ch);});workspace.append(left,right);card.appendChild(workspace);
        const bloco=document.getElementById('bloco_ia');if(bloco&&!bloco.querySelector('.ks-report-advanced')){
            const opts=bloco.querySelector('.ai-options-grid'),checks=bloco.querySelector('.checkbox-group');
            if(opts&&checks){const adv=document.createElement('details');adv.className='ks-report-advanced';adv.innerHTML='<summary>Opções do relatório</summary><div class="ks-report-advanced-body"></div>';const body=adv.querySelector('.ks-report-advanced-body');body.append(opts,checks);bloco.insertBefore(adv,bloco.firstChild);}
        }
        const observer=new MutationObserver(()=>{const ph=right.querySelector('.ks-report-placeholder');if(ph&&official&&getComputedStyle(official).display!=='none')ph.style.display='none';});if(official)observer.observe(official,{attributes:true,attributeFilter:['style','class']});
        if(typeof window.onTipoDocumentoChange==='function')setTimeout(()=>window.onTipoDocumentoChange(),0);
    }

    /* -------------------------- Agenda -------------------------- */
    function prepararAgenda(){
        const tela=document.getElementById('tela_agenda');if(!tela||document.getElementById('ks_agenda_controls'))return;
        const painel=tela.querySelector('#agenda_painel');if(!painel)return;
        const ctl=document.createElement('div');ctl.id='ks_agenda_controls';ctl.className='ks-agenda-controls';
        ctl.innerHTML=`<div class="ks-segmented"><button class="active" data-agenda-view="agenda_painel">Semana</button><button data-agenda-view="agenda_lista_espera">Lista de espera</button></div><div class="ks-agenda-config-wrap"><button type="button" class="btn-secondary" id="ks_agenda_config_btn">Configurações</button><div class="ks-agenda-config-menu" id="ks_agenda_config_menu" hidden><button data-agenda-view="agenda_procedimentos">Procedimentos</button><button data-agenda-view="agenda_horarios">Horários de atendimento</button><button data-agenda-view="agenda_bloqueios">Bloqueios e folgas</button></div></div>`;
        tela.insertBefore(ctl,painel);
        ctl.querySelectorAll('[data-agenda-view]').forEach(b=>b.addEventListener('click',()=>{if(typeof window.irParaSubtelaAgenda==='function')window.irParaSubtelaAgenda(b.dataset.agendaView);if(b.dataset.agendaView==='agenda_horarios'&&typeof window.carregarEditorGradeSemanal==='function')window.carregarEditorGradeSemanal();ctl.querySelectorAll('.ks-segmented button').forEach(x=>x.classList.toggle('active',x.dataset.agendaView===b.dataset.agendaView));document.getElementById('ks_agenda_config_menu').hidden=true;}));
        const cfg=ctl.querySelector('#ks_agenda_config_btn'),menu=ctl.querySelector('#ks_agenda_config_menu');cfg.onclick=()=>menu.hidden=!menu.hidden;document.addEventListener('click',e=>{if(!ctl.querySelector('.ks-agenda-config-wrap').contains(e.target))menu.hidden=true;});
    }

    /* -------------------------- Mídias -------------------------- */
    function prepararMidias(){
        const tela=document.getElementById('tela_midias');if(!tela||tela.dataset.ksPrepared)return;tela.dataset.ksPrepared='1';
        const info=tela.querySelector('.midia-local-info');const helper=tela.querySelector('.midia-helper');const settings=tela.querySelector('.midia-settings-body');if(settings){if(info){settings.insertBefore(info,settings.firstChild);info.classList.add('ks-midia-local-moved');}if(helper){settings.insertBefore(helper,info?info.nextSibling:settings.firstChild);helper.classList.add('ks-midia-helper-moved');}}
        const hero=tela.querySelector('.midia-hero-head p');if(hero)hero.textContent='Capture, importe ou consulte arquivos vinculados ao prontuário ativo.';const heroTitle=tela.querySelector('.midia-hero-head h2');if(heroTitle)heroTitle.textContent='Arquivos do prontuário';
        const summary=tela.querySelector('.midia-settings-card > summary');if(summary)summary.textContent='iPhone, armazenamento e backup';
    }

    /* -------------------------- Equipe -------------------------- */
    function prepararEquipe(){
        const tela=document.getElementById('tela_equipe');if(!tela||document.getElementById('ks_team_drawer'))return;const cards=tela.querySelectorAll(':scope > .card');if(cards.length<2)return;const form=cards[0],lista=cards[1];
        const hero=document.createElement('div');hero.className='ks-team-hero';hero.innerHTML=`<div><span class="ks-eyebrow">ACESSOS E PERFIS</span><h2>Usuários e acessos</h2><p>Gerencie perfis, permissões e quem pode aparecer como profissional na Agenda.</p></div><button type="button" class="btn-primary" id="ks_new_team">+ Novo usuário</button>`;tela.insertBefore(hero,form);
        const drawer=document.createElement('div');drawer.id='ks_team_drawer';drawer.className='ks-drawer-overlay';drawer.hidden=true;const panel=document.createElement('div');panel.className='ks-drawer';panel.innerHTML=`<div class="ks-drawer-head"><div><span class="ks-eyebrow" id="ks_team_drawer_eyebrow">NOVO ACESSO</span><h2 id="ks_team_drawer_title">Cadastrar usuário</h2></div><button type="button" class="ks-drawer-close">${icon('close')}</button></div>`;form.classList.add('ks-team-form');form.querySelector('.card-header')?.remove();panel.appendChild(form);drawer.appendChild(panel);document.body.appendChild(drawer);
        const abrir=(modo='novo')=>{const editando=modo==='editar';const eye=panel.querySelector('#ks_team_drawer_eyebrow'),title=panel.querySelector('#ks_team_drawer_title');if(eye)eye.textContent=editando?'EDITAR ACESSO':'NOVO ACESSO';if(title)title.textContent=editando?'Editar usuário':'Cadastrar usuário';drawer.hidden=false;form.scrollTop=0;requestAnimationFrame(()=>drawer.classList.add('ativa'));setTimeout(()=>document.getElementById('eq_nome')?.focus(),40);};
        document.getElementById('ks_new_team').onclick=()=>{if(typeof window.limparFormularioEquipe==='function')window.limparFormularioEquipe();abrir('novo');};
        function fechar(){drawer.classList.remove('ativa');setTimeout(()=>drawer.hidden=true,170);}panel.querySelector('.ks-drawer-close').onclick=fechar;drawer.addEventListener('click',e=>{if(e.target===drawer)fechar();});
        const actions=form.querySelector('.actions');if(actions&&!actions.querySelector('.ks-team-cancel')){const b=document.createElement('button');b.type='button';b.className='btn-secondary ks-team-cancel';b.textContent='Cancelar';b.onclick=fechar;actions.insertBefore(b,actions.firstChild);}
        const sel=form.querySelector('#eq_tipo_registro');if(sel){const grp=sel.closest('.input-group');const label=grp?.querySelector('label');if(label)label.textContent='Profissão / registro profissional';}
        window.addEventListener('kinesys:equipe-editar',()=>abrir('editar'));
        window.addEventListener('kinesys:equipe-salva',fechar);
        lista.classList.add('ks-team-list');
    }

    /* -------------------------- Cadastro / geral -------------------------- */
    function prepararCadastro(){
        const tela=document.getElementById('tela_cadastro');if(!tela||tela.dataset.ksPrepared)return;tela.dataset.ksPrepared='1';
        const card=tela.querySelector('.card');if(!card)return;card.classList.add('ks-form-surface');const h=card.querySelector('.card-header h2');if(h)h.textContent='Dados do paciente';
        const grid=card.querySelector(':scope > .grid-2');if(!grid)return;
        const inserirTitulo=(texto,antes)=>{if(!antes)return;const d=document.createElement('div');d.className='ks-form-section-title ks-span-2';d.textContent=texto;grid.insertBefore(d,antes);};
        const nome=document.getElementById('cad_nome')?.closest('.input-group');
        const nasc=document.getElementById('cad_nascimento')?.closest('.grid-2')||document.getElementById('cad_nascimento')?.closest('.input-group');
        const telefone=document.getElementById('cad_telefone')?.closest('.input-group');
        const cep=document.getElementById('cad_cep')?.closest('.input-group');
        inserirTitulo('Identificação',nome);
        inserirTitulo('Contato',telefone);
        inserirTitulo('Endereço',cep);
        const endereco=document.getElementById('cad_endereco')?.closest('.input-group');if(endereco){endereco.classList.add('ks-span-2');grid.appendChild(endereco);}
        const opcionais=['cad_sexo','cad_estado_civil','cad_profissao'].map(id=>document.getElementById(id)?.closest('.input-group')).filter(Boolean);
        if(opcionais.length){
            const det=document.createElement('details');det.className='ks-form-details ks-span-2';det.innerHTML='<summary>Dados complementares</summary><div class="ks-form-details-grid"></div>';const wrap=det.querySelector('div');opcionais.forEach(x=>wrap.appendChild(x));
            const contatoTitle=[...grid.querySelectorAll('.ks-form-section-title')].find(x=>x.textContent==='Contato');grid.insertBefore(det,contatoTitle||telefone); 
        }
        const cepBtn=document.querySelector('#cad_cep')?.closest('.input-group')?.querySelector('button');if(cepBtn){cepBtn.textContent='Buscar CEP';cepBtn.classList.add('ks-inline-action');}
        const actions=card.querySelector('.actions');if(actions){const b1=actions.querySelector('.btn-secondary');const b2=actions.querySelector('.btn-primary');if(b1)b1.textContent='Salvar cadastro';if(b2)b2.textContent='Salvar e iniciar avaliação';}
    }
    function wrapAberturaPaciente(){
        ['carregarPacienteParaEdicao','editarCadastro'].forEach(nome=>{
            const fn=window[nome];if(typeof fn!=='function'||fn.__ksContextWrapped)return;
            const wrapped=async function(id,...rest){if(id)await definirPacienteContexto(id);return fn.call(this,id,...rest);};wrapped.__ksContextWrapped=true;window[nome]=wrapped;
        });
    }
    function prepararFinanceiro(){const tela=document.getElementById('tela_financeiro');if(!tela)return;tela.querySelector('.finance-hero')?.classList.add('ks-section-hero');}
    function limparTitulosEmoji(){document.querySelectorAll('.card-header h2,.finance-hero h2,.midia-hero-head h2').forEach(h=>{h.textContent=h.textContent.replace(/^[^\p{L}\p{N}]+/u,'').trim();});}

    function prepararTudo(){
        ensureFeedback();prepararSidebar();criarTopbar();prepararHome();prepararProntuarios();prepararCadastro();preparEvolucaoSafe();prepararRelatorio();prepararAgenda();prepararMidias();prepararFinanceiro();prepararEquipe();limparTitulosEmoji();wrapNavegacao();wrapProntuarioRender();wrapAberturaPaciente();escutarSeletoresPaciente();
        const ativo=document.querySelector('.tela.ativa')?.id||'tela_login';atualizarPaginaAtiva(ativo);atualizarContextoVisual();
        const role=document.getElementById('ks_sidebar_role');if(role&&((typeof usuarioLogado!=='undefined')?usuarioLogado:null)&&typeof window.rotuloPerfil==='function')role.textContent=window.rotuloPerfil(((typeof usuarioLogado!=='undefined')?usuarioLogado:null).tipo);
        document.body.classList.add('ks-design-ready');atualizarGruposNav();
    }
    function preparEvolucaoSafe(){try{prepararEvolucao();}catch(e){console.warn('Design evolução:',e);}}

    document.addEventListener('DOMContentLoaded',()=>setTimeout(prepararTudo,0));
    // Sessões restauradas podem chamar liberarAcessoSistema antes do design layer. Reaplica metadados logo depois.
    setTimeout(()=>{if(document.readyState!=='loading')prepararTudo();},500);

    // Atualiza barra lateral quando o login muda sem recarregar a página.
    const poll=setInterval(()=>{const role=document.getElementById('ks_sidebar_role');if(role&&((typeof usuarioLogado!=='undefined')?usuarioLogado:null)&&typeof window.rotuloPerfil==='function')role.textContent=window.rotuloPerfil(((typeof usuarioLogado!=='undefined')?usuarioLogado:null).tipo);escutarSeletoresPaciente();atualizarGruposNav();},1200);
    window.addEventListener('beforeunload',()=>clearInterval(poll));
})();
