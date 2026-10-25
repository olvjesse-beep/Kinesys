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
        tela_financeiro: ['Financeiro','Caixa, pacientes, despesas e relatórios'],
        tela_equipe: ['Equipe','Usuários, perfis e permissões'],
        tela_configuracoes: ['Configurações','Controle da clínica, comunicação e conexões'],
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
    let preservarResumoPacienteNaNavegacao = false;
    storageSet('kinesys_paciente_contexto','');
    let contextoRevisao = 0;
    let buscaRevisao = 0;
    let paginaProntuarios = 1;
    let filtroProntuariosAtivo = "";
    let pacientesProntuariosCarregados = null;
    function identidadePaciente(){
        const u=typeof usuarioLogado!=='undefined'?usuarioLogado:null;
        return u?[u.auth_user_id,u.id,u.tipo,u.clinica_id].join('|'):'';
    }
    let identidadeContexto = identidadePaciente();
    function limparSelecaoPaciente(){
        preservarResumoPacienteNaNavegacao=false;
        pacienteContextoId='';
        contextoRevisao++;
        storageSet('kinesys_paciente_contexto','');
        if((typeof pacienteAtualId!=='undefined'&&pacienteAtualId)||document.getElementById('paciente_nome')?.value||document.getElementById('paciente_hma')?.value)window.iniciarContextoAvaliacaoKineSys?.();
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
            bell:'<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/>',
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
    function textoLimpo(msg){ return String(msg??'').replace(/^(?:(?:✅|✓|⚠|❌|🔒|🛡|💾|⧉|📌)\uFE0F?\s*)+/u,'').trim(); }
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
            ['tela_financeiro','Financeiro','money'],['tela_equipe','Equipe','team'],['tela_configuracoes','Configurações','settings']
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
        top.innerHTML=`<div class="ks-page-heading"><span id="ks_page_kicker">KINESYS</span><h1 id="ks_page_title">Visão geral</h1><p id="ks_page_subtitle"></p></div><div class="ks-topbar-actions"><div class="ks-notificacoes" id="ks_notificacoes_wrapper" hidden><button type="button" class="ks-notificacoes-btn" id="ks_notificacoes_btn" aria-label="Avisos da Agenda" title="Avisos da Agenda" onclick="alternarPainelNotificacoes()">${icon('bell')}<span id="ks_notificacoes_badge" class="ks-notificacoes-badge" hidden>0</span></button><div id="ks_notificacoes_painel" class="ks-notificacoes-painel" hidden><div class="ks-notificacoes-head"><strong>Avisos da Agenda</strong><button type="button" onclick="marcarTodasNotificacoesAgendaLidas()">Marcar como lidas</button></div><div id="ks_notificacoes_lista" class="ks-notificacao-lista"><div class="ks-notificacao-vazia">Nenhum aviso novo.</div></div></div></div><button type="button" class="ks-mobile-menu" id="ks_mobile_menu" aria-label="Abrir menu">${icon('menu')}</button><span class="ks-version">v${APP_VERSION}</span></div>`;
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
        ctx.querySelector('.ks-patient-clear').onclick=async()=>{if(typeof window.fecharRadarKineSys==='function')window.fecharRadarKineSys(true);await definirPacienteContexto('');const tela=document.querySelector('.tela.ativa')?.id||'';const ids={tela_avaliacao:'select_paciente_precadastro',tela_evolucao:'evo_paciente_select',tela_midias:'midia_paciente_select',tela_financeiro:'financeiro_paciente_select',tela_relatorio:'rel_paciente_select'};const sel=document.getElementById(ids[tela]||'');if(sel){sel.value='';sel.dispatchEvent(new Event('change',{bubbles:true}));const campo=document.getElementById(sel.id+'_busca')||sel;setTimeout(()=>campo.focus(),30);}};
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
            pacientesProntuariosCarregados=null;
            // O menu Pacientes começa sem seleção. Atalhos explícitos de um
            // paciente (Agenda/Resumo) conservam o ID escolhido, inclusive no
            // reaplicar do MutationObserver após a navegação.
            if(!preservarResumoPacienteNaNavegacao)limparSelecaoPaciente();
            const busca=document.getElementById('input_busca_paciente');
            if(busca) busca.value='';
            setTimeout(()=>{renderProntuarioCards('');atualizarResumoPacienteContexto();},50);
        }
        setTimeout(()=>{atualizarContextoVisual();aplicarContextoNaTela(id);},10);
    }
    function wrapNavegacao(){
        if(typeof window.navegarPara!=='function'||window.navegarPara.__ksWrapped)return;
        const orig=window.navegarPara;
        const wrapped=function(...args){
            sincronizarIdentidadeContexto();preservarResumoPacienteNaNavegacao=args[1]===true;
            if((args[0]==='tela_buscar'&&!preservarResumoPacienteNaNavegacao)||args[0]==='tela_login')limparSelecaoPaciente();
            const r=orig.apply(this,args);
            const atualizar=()=>atualizarPaginaAtiva(document.querySelector('.tela.ativa')?.id||args[0]);
            // Não reaplica a tela antiga enquanto o fragmento solicitado ainda carrega.
            if(r&&typeof r.then==='function')return r.then(resultado=>{if(resultado!==false)atualizar();return resultado;});
            atualizar();return r;
        };
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
        if(document.getElementById('tela_avaliacao')?.classList.contains('ativa')&&typeof pacienteAtualId!=='undefined'&&String(pacienteAtualId||'')!==String(id))window.iniciarContextoAvaliacaoKineSys?.(id);
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
        const meta=[]; const idade=(typeof window.idadeNumericaPaciente==='function'?window.idadeNumericaPaciente(p):p.idade)||''; if(idade)meta.push(String(idade).replace(/\s*anos?/i,'')+' anos');if(p.profissao)meta.push(p.profissao);const avs=typeof window.obterAvaliacoes==='function'?window.obterAvaliacoes(p):(p.avaliacoes||[]);if(avs.length)meta.push(`${avs.length} ${avs.length===1?'avaliação':'avaliações'}`);ctx.querySelector('#ks_patient_meta').textContent=meta.join(' · ')||'Prontuário ativo';ctx.querySelector('.ks-patient-avatar').textContent=(p.nome||'P').trim().charAt(0).toUpperCase();
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
        if(tela==='tela_buscar'){window.navegarPara(tela,true);await atualizarResumoPacienteContexto();return;}
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
            if(typeof window.telaPermitida==='function'&&!window.telaPermitida('tela_cadastro')){toast('Seu perfil não tem acesso a esta área.','seguranca');return;}
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
        if(acao==='financeiro'){
            await abrirPacienteNaTela('tela_financeiro');
            if(typeof window.popularPacientesFinanceiro==='function')await window.popularPacientesFinanceiro(pacienteId);
            if(typeof window.carregarFinanceiroPaciente==='function')await window.carregarFinanceiroPaciente();
            if(typeof window.alternarAbaFinanceiro==='function')window.alternarAbaFinanceiro('paciente');
            return;
        }
        if(acao==='agendamentos'){
            if(typeof window.abrirHistoricoAgendamentosPaciente==='function')await window.abrirHistoricoAgendamentosPaciente(pacienteId);
            return;
        }
        if(acao==='consultar_avaliacao'||acao==='historico_evolucao'){
            const tela=acao==='consultar_avaliacao'?'tela_avaliacao':'tela_evolucao';
            if(typeof window.telaPermitida==='function'&&!window.telaPermitida(tela))return;
            if(typeof window.gerarProntuarioCompletoPDF!=='function'){toast('A consulta do prontuário não está disponível.','erro');return;}
            return window.gerarProntuarioCompletoPDF(pacienteId,acao==='consultar_avaliacao'?'avaliacoes':'evolucoes');
        }
        if(acao==='prontuario'){
            if(typeof window.abrirEscolhaProntuarioPDF!=='function'){toast('A exportação do prontuário não está disponível.','erro');return;}
            return window.abrirEscolhaProntuarioPDF(pacienteId);
        }
        if(acao==='prontuario_simples'){
            if(typeof window.gerarProntuarioCompletoPDF!=='function'){toast('A exportação do prontuário não está disponível.','erro');return;}
            return window.gerarProntuarioCompletoPDF(pacienteId,'simplificado');
        }
        if(acao==='prontuario_detalhado'){
            if(typeof window.gerarProntuarioCompletoPDF!=='function'){toast('A exportação do prontuário não está disponível.','erro');return;}
            return window.gerarProntuarioCompletoPDF(pacienteId,'detalhado');
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
        PACIENTE_SELECTS.forEach(id=>{const el=document.getElementById(id);if(!el||el.dataset.ksContextListener)return;el.dataset.ksContextListener='1';el.addEventListener('change',()=>definirPacienteContexto(el.value));});
    }

    /* -------------------------- Home operacional -------------------------- */
    function prepararHome(){
        const home=document.getElementById('tela_home');if(!home||document.getElementById('ks_home_hero'))return;
        const hero=document.createElement('section');hero.id='ks_home_hero';hero.className='ks-home-hero';
        hero.innerHTML=`<div><span class="ks-eyebrow">PAINEL OPERACIONAL</span><h2 id="ks_home_greeting">Visão geral</h2><p id="ks_home_date"></p></div><button type="button" class="btn-primary ks-home-primary" data-tela="tela_agenda">Abrir agenda</button>`;
        const grid=document.createElement('div');grid.className='ks-home-overview';grid.innerHTML=`<div class="ks-home-registration" role="button" tabindex="0" data-ks-home-detail="recentes" aria-label="Abrir cadastros das últimas 24 horas"><strong>Cadastros · últimas 24 horas</strong><span id="ks_home_recent_count" aria-live="polite">—</span><small>Clique para expandir →</small></div>`;
        const ancora=home.querySelector(':scope > .card');home.insertBefore(hero,ancora||null);home.insertBefore(grid,ancora||null);
        hero.querySelector('[data-tela]').onclick=()=>window.navegarPara('tela_agenda');
        const rec=home.querySelector('#lista_pacientes_recentes')?.closest('.card');const pend=home.querySelector('#card_pendencias_clinicas');if(rec&&pend){rec.classList.add('card--flat');pend.classList.add('card--flat');grid.append(pend,rec);}
        const crm=home.querySelector('#card_crm');if(crm&&!crm.closest('details')){const det=document.createElement('details');det.className='ks-home-crm';const sum=document.createElement('summary');sum.textContent='CRM e relacionamento';crm.parentNode.insertBefore(det,crm);det.append(sum,crm);crm.classList.add('ks-home-crm-card');}
    }
    async function atualizarHomeOperacional(){
        const d=document.getElementById('ks_home_date');if(d)d.textContent=new Intl.DateTimeFormat('pt-BR',{weekday:'long',day:'2-digit',month:'long'}).format(new Date());
        const g=document.getElementById('ks_home_greeting'); if(g&&((typeof usuarioLogado!=='undefined')?usuarioLogado:null))g.textContent=`Olá, ${(((typeof usuarioLogado!=='undefined')?usuarioLogado:null).nome||'').split(' ')[0]||'equipe'}`;
        const agendaBtn=document.querySelector('#ks_home_hero [data-tela="tela_agenda"]');if(agendaBtn&&typeof window.telaPermitida==='function')agendaBtn.hidden=!window.telaPermitida('tela_agenda');
    }

    /* -------------------------- Prontuário / paciente workspace -------------------------- */
    function prepararProntuarios(){
        const tela=document.getElementById('tela_buscar');if(!tela||document.getElementById('ks_prontuario_cards'))return;
        const card=tela.querySelector('.card');if(!card)return;card.classList.add('ks-prontuario-search-card');const cardTitle=card.querySelector('.card-header h2');if(cardTitle)cardTitle.textContent='Pacientes cadastrados';
        const resumo=document.createElement('div');resumo.id='ks_prontuario_resumo';resumo.className='ks-prontuario-resumo';resumo.hidden=true;card.parentNode.insertBefore(resumo,card);
        const cards=document.createElement('div');cards.id='ks_prontuario_cards';cards.className='ks-prontuario-cards';card.appendChild(cards);
        const paginacao=document.createElement('nav');paginacao.id='ks_prontuario_paginacao';paginacao.className='ks-prontuario-paginacao';paginacao.setAttribute('aria-label','Páginas de pacientes');card.appendChild(paginacao);
        paginacao.addEventListener('click',event=>{const botao=event.target.closest('button[data-pagina]');if(!botao||botao.disabled)return;paginaProntuarios=Number(botao.dataset.pagina)||1;renderProntuarioCards(filtroProntuariosAtivo);});
        vincularAcoesProntuario();

        const input=document.getElementById('input_busca_paciente');if(input){input.placeholder='Buscar por nome, CPF ou telefone…';const grp=input.closest('.input-group');if(grp)grp.classList.add('ks-search-field');}
    }
    async function renderProntuarioCards(filtro){
        const c=document.getElementById('ks_prontuario_cards');if(!c||typeof window.obterPacientesSalvos!=='function')return;
        const revisao=++buscaRevisao;
        const q=String(filtro!==undefined?filtro:document.getElementById('input_busca_paciente')?.value||'').trim().toLowerCase();
        if(q!==filtroProntuariosAtivo){filtroProntuariosAtivo=q;paginaProntuarios=1;}
        try{
            const lista=pacientesProntuariosCarregados||await window.obterPacientesSalvos();if(revisao!==buscaRevisao)return;pacientesProntuariosCarregados=lista;
            const norm=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
            const digitos=q.replace(/\D/g,'');
            const busca=norm(q).replace(/\s+/g,' ');
            // Relevância antes da paginação: nome completo, início do nome,
            // início de uma palavra e, por último, ocorrência interna.
            const relevancia=p=>{
                const nome=norm(p.nome).trim().replace(/\s+/g,' ');
                if(!busca)return 0;
                if(nome===busca)return 0;
                if(nome.startsWith(busca+' '))return 1;
                if(nome.startsWith(busca))return 2;
                if((' '+nome).includes(' '+busca+' ')||nome.endsWith(' '+busca))return 3;
                if((' '+nome).includes(' '+busca))return 4;
                return nome.includes(busca)?5:6;
            };
            const itens=(lista||[]).filter(p=>!busca||norm(p.nome).includes(busca)||(digitos.length>0&&(String(p.cpf||'').replace(/\D/g,'').includes(digitos)||String(p.telefone||'').replace(/\D/g,'').includes(digitos)))).sort((a,b)=>relevancia(a)-relevancia(b)||String(a.nome||'').localeCompare(String(b.nome||''),'pt-BR',{sensitivity:'base'}));
            const paginacao=document.getElementById('ks_prontuario_paginacao');
            if(!itens.length){c.innerHTML='<div class="ks-empty">Nenhum paciente encontrado.</div>';if(paginacao)paginacao.hidden=true;return;}
            const totalPaginas=Math.ceil(itens.length/10);paginaProntuarios=Math.min(Math.max(1,paginaProntuarios),totalPaginas);
            const inicio=(paginaProntuarios-1)*10;
            const paginaItens=itens.slice(inicio,inicio+10);
            c.innerHTML=paginaItens.map(p=>{
                const avs=typeof window.obterAvaliacoes==='function'?window.obterAvaliacoes(p):p.avaliacoes||[];const ev=p.evolucoes||[];const av=avs[avs.length-1];const ult=ev.slice().sort((a,b)=>String(b.data||b.dataHoraISO||'').localeCompare(String(a.data||a.dataHoraISO||'')))[0];const id=escapeHTMLDS(p.id);const idade=typeof window.idadeNumericaPaciente==='function'?window.idadeNumericaPaciente(p):p.idade;
                const contagemAvaliacoes=`${avs.length} ${avs.length===1?'avaliação':'avaliações'}`;
                return `<article class="ks-patient-card ${String(p.id)===String(pacienteContextoId)?'active':''}"><button type="button" class="ks-patient-card-main" data-ks-patient-action="selecionar" data-patient-id="${id}"><span class="ks-patient-initial">${escapeHTMLDS((p.nome||'P').charAt(0))}</span><span class="ks-patient-card-copy"><strong>${escapeHTMLDS(p.nome||'Paciente')}</strong><small>${escapeHTMLDS([idade?String(idade).replace(/\s*anos?/i,'')+' anos':'',p.profissao||''].filter(Boolean).join(' · ')||'Cadastro administrativo')}</small><em>${av?contagemAvaliacoes:'Sem avaliação finalizada'}${ult?` · Última evolução ${escapeHTMLDS(formatarDataDiretorio(ult.data||ult.realizadoEm||ult.dataHoraISO))}`:''}</em></span></button><div class="ks-patient-card-actions"><button type="button" data-ks-patient-action="evolucao" data-patient-id="${id}">Evolução</button><button type="button" data-ks-patient-action="documentos" data-patient-id="${id}">Documentos</button><button type="button" data-ks-patient-action="prontuario" data-patient-id="${id}">Exportar PDF</button><button type="button" class="ks-more" data-ks-patient-action="editar" data-patient-id="${id}">Editar</button></div></article>`;
            }).join('');
            if(paginacao){
                paginacao.hidden=false;
                paginacao.innerHTML='<span>Mostrando '+(inicio+1)+'–'+Math.min(inicio+10,itens.length)+' de '+itens.length+' pacientes</span><div><button type="button" data-pagina="'+(paginaProntuarios-1)+'" aria-label="Página anterior" '+(paginaProntuarios===1?'disabled':'')+'>‹</button><span>Página '+paginaProntuarios+' de '+totalPaginas+'</span><button type="button" data-pagina="'+(paginaProntuarios+1)+'" aria-label="Próxima página" '+(paginaProntuarios===totalPaginas?'disabled':'')+'>›</button></div>';
            }
        }catch(e){if(revisao===buscaRevisao)c.innerHTML='<div class="ks-empty">Não foi possível carregar os pacientes.</div>';}
    }
    window.renderProntuarioCards=renderProntuarioCards;
    async function atualizarResumoPacienteContexto(){
        const r=document.getElementById('ks_prontuario_resumo');if(!r)return;const revisao=contextoRevisao;const p=await obterPacienteContexto();if(revisao!==contextoRevisao)return;if(!p){r.hidden=true;r.replaceChildren();return;}r.hidden=false;
        const avs=typeof window.obterAvaliacoes==='function'?window.obterAvaliacoes(p):p.avaliacoes||[];const ev=p.evolucoes||[];const av=avs[avs.length-1];const idade=typeof window.idadeNumericaPaciente==='function'?window.idadeNumericaPaciente(p):p.idade;
        const podeExcluir=typeof window.usuarioEhMaster==='function'&&window.usuarioEhMaster();
        r.innerHTML=`<div class="ks-prontuario-summary-main"><span class="ks-patient-initial lg">${escapeHTMLDS((p.nome||'P').charAt(0))}</span><div><span class="ks-eyebrow">PRONTUÁRIO ATIVO</span><h2>${escapeHTMLDS(p.nome||'Paciente')}</h2><p>${escapeHTMLDS([idade?String(idade).replace(/\s*anos?/i,'')+' anos':'',p.profissao||'',p.telefone||''].filter(Boolean).join(' · '))}</p></div></div><div class="ks-prontuario-metrics"><div><span>Avaliações</span><strong>${avs.length}</strong></div><div><span>Evoluções</span><strong>${ev.length}</strong></div><div><span>Última avaliação</span><strong>${escapeHTMLDS(av?.dataAvaliacao||'—')}</strong></div></div><div class="ks-prontuario-actions"><button type="button" class="btn-primary" data-ks-patient-action="evolucao">Registrar evolução</button><button type="button" class="btn-secondary" data-ks-patient-action="avaliacao">Nova avaliação</button><button type="button" class="btn-secondary" data-ks-patient-action="documentos">Documentos</button><button type="button" class="btn-secondary" data-ks-patient-action="prontuario_simples">PDF simplificado</button>${(typeof window.podeExportarProntuarioDetalhado==='function'&&window.podeExportarProntuarioDetalhado())?'<button type="button" class="btn-secondary" data-ks-patient-action="prontuario_detalhado">PDF detalhado</button>':''}${podeExcluir?'<button type="button" class="btn-danger ks-patient-delete" data-ks-patient-action="excluir" title="Excluir cadastro e todo o histórico">Excluir cadastro</button>':''}</div>`;
        const acoes=r.querySelector('.ks-prontuario-actions');
        if(acoes){
            const extra=document.createDocumentFragment();
            [['editar','Editar cadastro','tela_cadastro'],['consultar_avaliacao','Consultar avaliação','tela_avaliacao'],['historico_evolucao','Histórico de evoluções','tela_evolucao'],['agendamentos','Histórico de agendamentos','tela_agenda'],['financeiro','Financeiro','tela_financeiro']].forEach(([acao,label,tela])=>{
                if(typeof window.telaPermitida==='function'&&!window.telaPermitida(tela))return;
                const b=document.createElement('button');b.type='button';b.className='btn-secondary';b.dataset.ksPatientAction=acao;b.textContent=label;extra.append(b);
            });
            acoes.insertBefore(extra,acoes.querySelector('.ks-patient-delete'));
        }
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

    function prepararBuscasPaciente(){
        ['evo_paciente_select','rel_paciente_select','midia_paciente_select'].forEach(id=>{
            const select=document.getElementById(id);
            if(!select||select.dataset.ksBuscaInstalada)return;
            select.dataset.ksBuscaInstalada='1';
            const group=select.closest('.input-group');if(!group)return;
            const label=group.querySelector('label[for="'+id+'"]');
            const box=document.createElement('div');box.className='ks-patient-picker';
            const input=document.createElement('input');input.type='search';input.id=id+'_busca';input.className='ks-patient-picker-input';input.placeholder='Digite o nome do paciente';input.autocomplete='off';input.setAttribute('role','combobox');input.setAttribute('aria-autocomplete','list');input.setAttribute('aria-expanded','false');
            const list=document.createElement('div');list.className='ks-patient-picker-options';list.id=id+'_sugestoes';list.setAttribute('role','listbox');list.hidden=true;input.setAttribute('aria-controls',list.id);
            if(label)label.htmlFor=input.id;
            select.parentNode.insertBefore(box,select);box.append(input,list,select);select.classList.add('ks-patient-source-select');select.hidden=true;select.style.display='none';select.tabIndex=-1;select.setAttribute('aria-hidden','true');
            const normalizar=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('pt-BR').trim();
            const nomeOpcao=option=>String(option?.textContent||'').replace(/\s*\(CPF:.*\)\s*$/i,'').trim();
            const opcoes=()=>Array.from(select.options).filter(option=>option.value).sort((a,b)=>nomeOpcao(a).localeCompare(nomeOpcao(b),'pt-BR',{sensitivity:'base'}));
            const fechar=()=>{list.hidden=true;input.setAttribute('aria-expanded','false');};
            const escolher=option=>{select.value=option.value;input.value=nomeOpcao(option);fechar();select.dispatchEvent(new Event('change',{bubbles:true}));};
            const mostrar=()=>{const busca=normalizar(input.value);const itens=opcoes().filter(option=>!busca||normalizar(nomeOpcao(option)).includes(busca)).slice(0,20);list.replaceChildren();if(!itens.length){const empty=document.createElement('span');empty.className='ks-patient-picker-empty';empty.textContent='Nenhum paciente encontrado';list.append(empty);}else itens.forEach(option=>{const button=document.createElement('button');button.type='button';button.setAttribute('role','option');button.textContent=nomeOpcao(option);button.addEventListener('mousedown',event=>event.preventDefault());button.addEventListener('click',()=>escolher(option));list.append(button);});list.hidden=false;input.setAttribute('aria-expanded','true');};
            const sincronizar=()=>{const option=select.selectedOptions[0];input.value=option&&option.value?nomeOpcao(option):'';fechar();};
            input.addEventListener('focus',mostrar);
            input.addEventListener('input',()=>{if(select.value&&normalizar(nomeOpcao(select.selectedOptions[0]))!==normalizar(input.value)){const digitado=input.value;select.value='';select.dispatchEvent(new Event('change',{bubbles:true}));input.value=digitado;}mostrar();});
            input.addEventListener('keydown',event=>{if(event.key==='Escape'){fechar();return;}if(event.key==='ArrowDown'){event.preventDefault();if(list.hidden)mostrar();list.querySelector('button')?.focus();}if(event.key==='Enter'&&!list.hidden){event.preventDefault();const first=list.querySelector('button');if(first)first.click();}});
            list.addEventListener('keydown',event=>{if(event.key==='Escape'){fechar();input.focus();}else if(event.key==='ArrowDown'||event.key==='ArrowUp'){event.preventDefault();const buttons=Array.from(list.querySelectorAll('button'));const index=buttons.indexOf(document.activeElement);buttons[Math.max(0,Math.min(buttons.length-1,index+(event.key==='ArrowDown'?1:-1)))]?.focus();}});
            document.addEventListener('click',event=>{if(!box.contains(event.target))fechar();});
            select.addEventListener('change',sincronizar);
            new MutationObserver(sincronizar).observe(select,{childList:true,subtree:true});
            sincronizar();
        });
    }

    /* -------------------------- Evolução -------------------------- */
    function prepararEvolucao(){
        const tela=document.getElementById('tela_evolucao');if(!tela||tela.dataset.ksPrepared)return;tela.dataset.ksPrepared='1';
        const data=document.getElementById('evo_data');if(data&&!data.value)data.value=new Date().toISOString().slice(0,10);
        const principal=tela.querySelector(':scope > .card');if(principal){
            principal.classList.add('ks-evo-main');const nested=principal.querySelectorAll(':scope > .card');
            if(nested[0])nested[0].classList.add('ks-evo-section','ks-evo-state');
            if(nested[1]){nested[1].classList.add('ks-evo-section','ks-evo-load');if(!nested[1].closest('.ks-evo-load-details')){const det=document.createElement('details');det.className='ks-evo-compact-details ks-evo-load-details';det.innerHTML='<summary>Resposta à carga e parâmetros da sessão</summary><div class="ks-evo-compact-body"></div>';const body=det.querySelector('.ks-evo-compact-body');nested[1].parentNode.insertBefore(det,nested[1]);body.appendChild(nested[1]);}}
        }
        if(principal&&!principal.querySelector('.ks-evo-workspace-top')){
            const titulo=principal.querySelector(':scope > .card-header h2');if(titulo)titulo.textContent='Registro guiado por sessão';
            const cabecalho=principal.querySelector(':scope > .card-header');if(cabecalho&&!cabecalho.querySelector('.ks-evo-intro')){const intro=document.createElement('p');intro.className='ks-evo-intro';intro.textContent='Registre a evolução clínica de forma estruturada e objetiva.';cabecalho.append(intro);}
            const dados=principal.querySelector(':scope > .grid-2');
            const duplicar=principal.querySelector(':scope > .actions');
            const estado=principal.querySelector(':scope > .ks-evo-state');
            const eva=principal.querySelector(':scope > .input-group:has(#eva_slider_evo)');
            const flags=estado?.querySelector('.checkbox-group');
            const carga=principal.querySelector(':scope > .ks-evo-load-details');
            const relato=principal.querySelector(':scope > .input-group:has(#evo_relato)');
            if(dados&&estado&&eva&&carga&&relato){
                const topo=document.createElement('div');topo.className='ks-evo-workspace-top';topo.append(dados);if(cabecalho)principal.before(cabecalho,topo);else principal.before(topo);
                const vitais=document.createElement('div');vitais.className='ks-evo-workspace-vitals';const vitaisTitulo=document.createElement('div');vitaisTitulo.className='ks-evo-vitals-heading';vitaisTitulo.innerHTML='<h3>Como o paciente está hoje?</h3><p>Compare com a sessão anterior e registre a percepção geral e a dor.</p>';estado.classList.add('ks-evo-status-card');eva.classList.add('ks-evo-eva-card');vitais.append(vitaisTitulo,estado,eva);
                const detalhes=document.createElement('div');detalhes.className='ks-evo-workspace-details';
                const apoio=document.createElement('div');apoio.className='ks-evo-workspace-support';
                const apoioTitulo=document.createElement('div');apoioTitulo.className='ks-evo-details-heading';
                apoioTitulo.innerHTML='<h3>Mudanças, intercorrências e segurança</h3><p>Registre apenas o que mudou desde a última sessão.</p>';
                const campos=document.createElement('div');campos.className='ks-evo-change-fields';
                campos.innerHTML='<div class="input-group"><label for="evo_novo_exame_texto">Novo exame ou laudo</label><textarea id="evo_novo_exame_texto" rows="2" placeholder="Exame, data e achado relevante, se houver."></textarea></div><div class="input-group"><label for="evo_intercorrencia_texto">Nova intercorrência</label><textarea id="evo_intercorrencia_texto" rows="2" placeholder="Descreva o ocorrido e a conduta, se houver."></textarea></div><div class="input-group"><label for="evo_medicacao_texto">Mudança de medicação</label><textarea id="evo_medicacao_texto" rows="2" placeholder="Medicamento e alteração relatada, se houver."></textarea></div><div class="input-group"><label for="evo_alerta_texto">Novo sinal de alerta</label><textarea id="evo_alerta_texto" rows="2" placeholder="Descreva o sinal e a orientação adotada, se houver."></textarea></div>';
                if(flags){flags.style.display='none';apoio.append(flags);}
                carga.style.display='none';
                apoio.append(apoioTitulo,campos,carga);
                detalhes.append(apoio,relato);relato.classList.add('ks-evo-narrative-card');
                const rodape=principal.querySelector('#btn_salvar_evolucao')?.closest('.actions');
                const duplicarBotao=duplicar?.querySelector('button');if(duplicarBotao){duplicarBotao.textContent='Duplicar última sessão';if(rodape){rodape.prepend(duplicarBotao);duplicar?.remove();}}
                estado.querySelectorAll('.evo-status-grid .checkbox-pill span').forEach(span=>{span.textContent=span.textContent.replace(/[↗→↘]/g,'').trim();});
                const excecao=principal.querySelector('#bloco_excecao_sem_avaliacao');(excecao||topo).after(vitais,detalhes);if(cabecalho){const historico=document.createElement('button');historico.type='button';historico.className='btn-secondary ks-evo-history-action';historico.textContent='Ver histórico deste paciente';historico.addEventListener('click',()=>{const card=tela.querySelector(':scope > .ks-collapsible-card');if(card){card.classList.add('ks-expanded');card.scrollIntoView({behavior:'smooth',block:'start'});}});if(rodape)rodape.prepend(historico);else cabecalho.append(historico);}const salvar=principal.querySelector('#btn_salvar_evolucao');if(salvar){salvar.textContent='Salvar evolução';rodape?.append(salvar);}
            }
        }
        const hist=tela.querySelectorAll(':scope > .card');[...hist].slice(1).forEach((card,i)=>{card.classList.add('ks-collapsible-card');const head=card.querySelector('.card-header');if(head&&!head.querySelector('.ks-collapse-toggle')){const btn=document.createElement('button');btn.type='button';btn.className='ks-collapse-toggle';btn.innerHTML=`${i===0?'Histórico de sessões':'Linha do tempo completa'} ${icon('chevron')}`;btn.onclick=()=>card.classList.toggle('ks-expanded');head.innerHTML='';head.appendChild(btn);}});
        prepararEvolucaoModelo1(tela,principal);
    }

    function prepararEvolucaoModelo1(tela,principal){
        if(!principal||tela.classList.contains('ks-evo-model1'))return;
        const vitais=tela.querySelector('.ks-evo-workspace-vitals'),relato=tela.querySelector('.ks-evo-narrative-card'),apoio=tela.querySelector('.ks-evo-workspace-support');
        if(!vitais||!relato||!apoio)return;
        tela.classList.add('ks-evo-model1');
        const layout=document.createElement('div');layout.className='ks-evo-editor-layout';
        const documento=document.createElement('div');documento.className='ks-evo-document';
        principal.insertBefore(layout,principal.querySelector(':scope > .actions'));documento.append(vitais,relato);layout.append(documento,apoio);
        principal.querySelectorAll('.ks-evo-workspace-details').forEach(e=>{if(!e.children.length)e.remove();});
        const carga=apoio.querySelector('.ks-evo-load-details');if(carga){carga.style.display='';documento.append(carga);}
        const titulo=vitais.querySelector('.ks-evo-vitals-heading');if(titulo)titulo.hidden=true;
        const apoioTitulo=apoio.querySelector('.ks-evo-details-heading');if(apoioTitulo){apoioTitulo.querySelector('h3').textContent='Mudanças desde a última sessão';apoioTitulo.querySelector('p').textContent='Marque apenas o que mudou.';}
        const labelRelato=relato.querySelector('label');if(labelRelato)labelRelato.textContent='Relato do paciente e conduta terapêutica';
        const orientacao=document.createElement('p');orientacao.className='ks-evo-field-hint';orientacao.textContent='Registre a resposta do paciente, a intervenção realizada, a dosagem e a decisão para a próxima sessão.';labelRelato?.after(orientacao);
        const estadoCabecalho=vitais.querySelector('.ks-evo-status-card .card-header');if(estadoCabecalho){const hint=document.createElement('p');hint.className='ks-evo-field-hint';hint.textContent='Comparado com a sessão anterior.';estadoCabecalho.append(hint);}
        const evaLabel=vitais.querySelector('.ks-evo-eva-card>label');if(evaLabel)evaLabel.textContent='Selecione a dor (EVA)';
        const editor=document.getElementById('evo_relato');editor.placeholder='Descreva a resposta do paciente, a intervenção realizada, a dosagem e a decisão para a próxima sessão.';
        const contadorRelato=document.createElement('small');contadorRelato.className='ks-evo-character-count';relato.append(contadorRelato);
        const campos=apoio.querySelector('.ks-evo-change-fields'),rows=[];
        const defs=[['evo_novo_exame','evo_novo_exame_texto','Novo exame ou laudo'],['evo_nova_intercorrencia','evo_intercorrencia_texto','Intercorrência'],['evo_mudanca_medicacao','evo_medicacao_texto','Mudança de medicação'],['evo_novo_alerta','evo_alerta_texto','Sinal de alerta']];
        defs.forEach(([id,campoId,nome])=>{
            const check=document.getElementById(id),input=document.getElementById(campoId),label=check?.closest('label'),detail=input?.closest('.input-group');if(!check||!label||!detail)return;
            const row=document.createElement('div');row.className='ks-evo-change-row';label.querySelector('span').textContent=nome;
            const hint=document.createElement('small');hint.className='ks-evo-field-hint';hint.textContent=input.placeholder;label.querySelector('span').append(hint);
            check.setAttribute('aria-controls',campoId+'-details');detail.id=campoId+'-details';
            const count=document.createElement('small');count.className='ks-evo-character-count';detail.append(count);
            const message=document.createElement('small');message.className='ks-evo-change-message';message.setAttribute('role','status');
            row.append(label,detail,message);campos.append(row);rows.push({check,input,detail,count,message});
            check.addEventListener('change',()=>{message.textContent='';if(!check.checked&&input.value.trim()){check.checked=true;message.textContent='O detalhe foi mantido. Apague o texto para desmarcar esta mudança.';}atualizar();});
            input.addEventListener('input',()=>{if(input.value.trim())check.checked=true;atualizar();});
        });
        apoio.querySelectorAll(':scope > .checkbox-group').forEach(e=>{if(!e.querySelector('input'))e.remove();});
        function atualizar(){
            rows.forEach(({check,input,detail,count})=>{if(input.value.trim())check.checked=true;detail.hidden=!check.checked;check.setAttribute('aria-expanded',String(check.checked));count.textContent=input.value.length+' caracteres';});
            contadorRelato.textContent=editor.value.length+' caracteres';
            const salvar=document.getElementById('btn_salvar_evolucao');if(salvar&&salvar.textContent==='Registrar evolução')salvar.textContent='Salvar evolução';
        }
        editor.addEventListener('input',atualizar);
        window.KineSysEvolucaoUI={atualizar};atualizar();
    }

    /* -------------------------- Relatório -------------------------- */
    function prepararRelatorio(){
        const tela=document.getElementById('tela_relatorio');if(!tela||document.getElementById('ks_report_workspace'))return;const card=tela.querySelector(':scope > .card');if(!card)return;
        card.classList.add('ks-report-shell');const oldHead=card.querySelector(':scope > .card-header');if(oldHead)oldHead.remove();
        const workspace=document.createElement('div');workspace.id='ks_report_workspace';workspace.className='ks-report-workspace';const left=document.createElement('div');left.className='ks-report-config';const right=document.createElement('div');right.className='ks-report-editor';right.innerHTML='<div class="ks-report-placeholder"><span class="ks-eyebrow">DOCUMENTO</span><h3>A prévia do documento aparecerá aqui</h3><p>Escolha o paciente e o tipo de documento. Para relatórios, gere ou edite o texto antes de montar para impressão.</p></div>';
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
    function fecharConfiguracoesAgendaAoClicarFora(event){
        const wrap=document.querySelector('#ks_agenda_controls .ks-agenda-config-wrap');
        const menu=document.getElementById('ks_agenda_config_menu');
        if(wrap&&menu&&!wrap.contains(event.target))menu.hidden=true;
    }
    document.addEventListener('click',fecharConfiguracoesAgendaAoClicarFora);
    function prepararAgenda(){
        const tela=document.getElementById('tela_agenda');if(!tela||document.getElementById('ks_agenda_controls'))return;
        const painel=tela.querySelector('#agenda_painel');if(!painel)return;
        const ctl=document.createElement('div');ctl.id='ks_agenda_controls';ctl.className='ks-agenda-controls';
        ctl.innerHTML=`<div class="ks-segmented"><button class="active" data-agenda-view="agenda_painel">Semana</button><button data-agenda-view="agenda_lista_espera">Lista de espera</button></div><div class="ks-agenda-config-wrap"><button type="button" class="btn-secondary" id="ks_agenda_config_btn">Configurações</button><div class="ks-agenda-config-menu" id="ks_agenda_config_menu" hidden><button data-agenda-view="agenda_procedimentos">Procedimentos</button><button data-agenda-view="agenda_horarios">Horários de atendimento</button><button data-agenda-view="agenda_bloqueios">Bloqueios e folgas</button></div></div>`;
        tela.insertBefore(ctl,painel);
        ctl.querySelectorAll('[data-agenda-view]').forEach(b=>b.addEventListener('click',()=>{if(typeof window.irParaSubtelaAgenda==='function')window.irParaSubtelaAgenda(b.dataset.agendaView);if(b.dataset.agendaView==='agenda_horarios'&&typeof window.carregarEditorGradeSemanal==='function')window.carregarEditorGradeSemanal();ctl.querySelectorAll('.ks-segmented button').forEach(x=>x.classList.toggle('active',x.dataset.agendaView===b.dataset.agendaView));document.getElementById('ks_agenda_config_menu').hidden=true;}));
        const cfg=ctl.querySelector('#ks_agenda_config_btn'),menu=ctl.querySelector('#ks_agenda_config_menu');cfg.onclick=()=>menu.hidden=!menu.hidden;
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
        const drawer=document.createElement('div');drawer.id='ks_team_drawer';drawer.className='ks-drawer-overlay';drawer.hidden=true;const panel=document.createElement('div');panel.className='ks-drawer';panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','true');panel.setAttribute('aria-labelledby','ks_team_drawer_title');panel.innerHTML=`<div class="ks-drawer-head"><div><span class="ks-eyebrow" id="ks_team_drawer_eyebrow">NOVO ACESSO</span><h2 id="ks_team_drawer_title">Cadastrar usuário</h2></div><button type="button" class="ks-drawer-close" aria-label="Fechar cadastro de usuário">${icon('close')}</button></div>`;form.classList.add('ks-team-form');form.querySelector('.card-header')?.remove();panel.appendChild(form);drawer.appendChild(panel);document.body.appendChild(drawer);
        let focoAnteriorDrawer=null;
        const abrir=(modo='novo')=>{const editando=modo==='editar';const eye=panel.querySelector('#ks_team_drawer_eyebrow'),title=panel.querySelector('#ks_team_drawer_title');if(eye)eye.textContent=editando?'EDITAR ACESSO':'NOVO ACESSO';if(title)title.textContent=editando?'Editar usuário':'Cadastrar usuário';focoAnteriorDrawer=document.activeElement instanceof HTMLElement?document.activeElement:null;drawer.hidden=false;form.scrollTop=0;requestAnimationFrame(()=>drawer.classList.add('ativa'));setTimeout(()=>document.getElementById('eq_nome')?.focus({preventScroll:true}),40);};
        document.getElementById('ks_new_team').onclick=()=>{if(typeof window.limparFormularioEquipe==='function')window.limparFormularioEquipe();abrir('novo');};
        function fechar(){drawer.classList.remove('ativa');setTimeout(()=>{drawer.hidden=true;if(focoAnteriorDrawer?.isConnected)focoAnteriorDrawer.focus({preventScroll:true});},170);}panel.querySelector('.ks-drawer-close').onclick=fechar;drawer.addEventListener('click',e=>{if(e.target===drawer)fechar();});
        drawer.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();fechar();return;}if(e.key!=='Tab')return;const itens=Array.from(panel.querySelectorAll('button:not([disabled]),input:not([disabled]):not([type="hidden"]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])')).filter(el=>el.getClientRects().length);if(!itens.length)return;const primeiro=itens[0],ultimo=itens[itens.length-1];if(e.shiftKey&&document.activeElement===primeiro){e.preventDefault();ultimo.focus();}else if(!e.shiftKey&&document.activeElement===ultimo){e.preventDefault();primeiro.focus();}});
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
            const wrapped=async function(id,...rest){const carga=id?definirPacienteContexto(id):null,revisao=contextoRevisao;await carga;if(revisao!==contextoRevisao)return;return fn.call(this,id,...rest);};wrapped.__ksContextWrapped=true;window[nome]=wrapped;
        });
    }
    function formatarDataDiretorio(valor){
        const data=String(valor||'').match(/^(\d{4})-(\d{2})-(\d{2})(?:T|$)/);
        return data?`${data[3]}/${data[2]}/${data[1]}`:String(valor||'Não informada');
    }
    function prepararFinanceiro(){const tela=document.getElementById('tela_financeiro');if(!tela)return;tela.querySelector('.finance-hero')?.classList.add('ks-section-hero');}
    function limparTitulosEmoji(){document.querySelectorAll('.card-header h2,.finance-hero h2,.midia-hero-head h2').forEach(h=>{h.textContent=h.textContent.replace(/^[^\p{L}\p{N}]+/u,'').trim();});}

    function prepararTudo(){
        // Compatibilidade com HTML antigo em cache: a apresentação nunca oculta a página inteira.
        document.body.classList.remove('ks-app-booting');
        ensureFeedback();prepararSidebar();criarTopbar();prepararHome();prepararProntuarios();prepararCadastro();preparEvolucaoSafe();prepararRelatorio();prepararAgenda();prepararMidias();prepararBuscasPaciente();prepararFinanceiro();prepararEquipe();limparTitulosEmoji();wrapNavegacao();wrapProntuarioRender();wrapAberturaPaciente();escutarSeletoresPaciente();
        const ativo=document.querySelector('.tela.ativa')?.id||'tela_login';atualizarPaginaAtiva(ativo);atualizarContextoVisual();
        const role=document.getElementById('ks_sidebar_role');if(role&&((typeof usuarioLogado!=='undefined')?usuarioLogado:null)&&typeof window.rotuloPerfil==='function')role.textContent=window.rotuloPerfil(((typeof usuarioLogado!=='undefined')?usuarioLogado:null).tipo);
        document.body.classList.add('ks-design-ready');atualizarGruposNav();
        document.dispatchEvent(new CustomEvent('kinesys:design-ready'));
    }
    function preparEvolucaoSafe(){try{prepararEvolucao();}catch(e){console.warn('Design evolução:',e);}}

    document.addEventListener('DOMContentLoaded',()=>setTimeout(prepararTudo,0));
    // Sessões restauradas podem chamar liberarAcessoSistema antes do design layer. Reaplica metadados logo depois.
    setTimeout(()=>{if(document.readyState!=='loading')prepararTudo();},500);

    // Reage ao lifecycle oficial em vez de manter polling global permanente.
    function sincronizarDesignDinamico(){
        const telaAtivada=arguments[0]?.detail?.id||'';
        if(telaAtivada) atualizarPaginaAtiva(telaAtivada);
        const role=document.getElementById('ks_sidebar_role');
        const usuario=(typeof usuarioLogado!=='undefined')?usuarioLogado:null;
        if(role&&usuario&&typeof window.rotuloPerfil==='function') role.textContent=window.rotuloPerfil(usuario.tipo);
        escutarSeletoresPaciente();
        prepararBuscasPaciente();
        atualizarGruposNav();
    }
    document.addEventListener('kinesys:tela-ativada',sincronizarDesignDinamico);
    document.addEventListener('kinesys:tela-dom-pronta',sincronizarDesignDinamico);
})();


/* KineSysAccessibilityHardening_v1221
 * Acessibilidade transversal sem alterar IDs, funções clínicas ou contratos de dados.
 */
(function KineSysAccessibilityHardening_v1221(){
  'use strict';

  const focusableSelector = [
    'a[href]', 'button:not([disabled])', 'input:not([disabled]):not([type="hidden"])',
    'select:not([disabled])', 'textarea:not([disabled])', '[tabindex]:not([tabindex="-1"])'
  ].join(',');
  const modalReturnFocus = new WeakMap();
  let activeLegacyModal = null;

  function bindLabels(root=document){
    root.querySelectorAll('.input-group label:not([for])').forEach(label => {
      if (label.querySelector('input,select,textarea')) return;
      const group = label.closest('.input-group');
      if (!group) return;
      const controls = Array.from(group.querySelectorAll('input:not([type="hidden"]),select,textarea'));
      const control = controls.find(node => !node.closest('.checkbox-group,[role="group"],.finance-payment-methods,.toggle-pill'));
      if (control && control.id) label.htmlFor = control.id;
    });
  }

  function normalizeLegacyDialogs(root=document){
    root.querySelectorAll('.modal-overlay').forEach((overlay, index) => {
      const box = overlay.querySelector(':scope > .modal-box');
      if (!box) return;
      box.setAttribute('role','dialog');
      box.setAttribute('aria-modal','true');
      const title = box.querySelector('h1,h2,h3');
      if (title) {
        if (!title.id) title.id = (overlay.id || 'ks_modal_' + index) + '_titulo';
        box.setAttribute('aria-labelledby', title.id);
      }
      const close = box.querySelector('.modal-fechar');
      if (close) {
        close.type = 'button';
        if (!close.hasAttribute('aria-label')) {
          close.setAttribute('aria-label', title ? 'Fechar ' + title.textContent.trim() : 'Fechar diálogo');
        }
      }
    });
  }

  function modalIsVisible(overlay){
    if (!overlay || overlay.hidden) return false;
    const style = getComputedStyle(overlay);
    return style.display !== 'none' && style.visibility !== 'hidden' && overlay.getClientRects().length > 0;
  }

  function syncLegacyModalFocus(){
    const visible = Array.from(document.querySelectorAll('.modal-overlay')).filter(modalIsVisible);
    const current = visible.length ? visible[visible.length - 1] : null;
    if (current === activeLegacyModal) return;

    if (activeLegacyModal && !current) {
      const returnTo = modalReturnFocus.get(activeLegacyModal);
      activeLegacyModal.dataset.ksA11yOpen = '0';
      activeLegacyModal = null;
      if (returnTo && returnTo.isConnected && typeof returnTo.focus === 'function') {
        requestAnimationFrame(() => returnTo.focus({preventScroll:true}));
      }
      return;
    }

    if (current) {
      activeLegacyModal = current;
      if (current.dataset.ksA11yOpen !== '1') {
        modalReturnFocus.set(current, document.activeElement);
        current.dataset.ksA11yOpen = '1';
        const box = current.querySelector(':scope > .modal-box');
        const first = box && box.querySelector(focusableSelector);
        if (first) requestAnimationFrame(() => first.focus({preventScroll:true}));
        else if (box) { box.tabIndex = -1; requestAnimationFrame(() => box.focus({preventScroll:true})); }
      }
    }
  }

  function installRouteAnnouncements(){
    if (!document.getElementById('ks_route_status')) {
      const live = document.createElement('div');
      live.id = 'ks_route_status';
      live.className = 'kds-visually-hidden';
      live.setAttribute('role','status');
      live.setAttribute('aria-live','polite');
      live.setAttribute('aria-atomic','true');
      document.body.appendChild(live);
    }

    const original = window.navegarPara;
    if (typeof original !== 'function' || original.__ksA11yWrapped) return;
    let revisaoAnuncio=0;
    const wrapped = function(idTela, ...args){
      const revisao=++revisaoAnuncio;
      const result = original.call(this, idTela, ...args);
      const concluir=resultado=>{
        if(resultado===false||idTela==='tela_login')return resultado;
        requestAnimationFrame(() => {
          if(revisao!==revisaoAnuncio)return;
          const target = document.getElementById(idTela);
          if (!target || !target.classList.contains('ativa')) return;
          const heading = document.getElementById('ks_page_title') || target.querySelector('h1,h2');
          const live = document.getElementById('ks_route_status');
          const label = heading ? heading.textContent.trim() : 'Tela atualizada';
          if (live) live.textContent = label;
          if (heading) {
            heading.setAttribute('tabindex','-1');
            heading.focus({preventScroll:true});
          }
        });
        return resultado;
      };
      return result&&typeof result.then==='function'?result.then(concluir):concluir(result);
    };
    wrapped.__ksA11yWrapped = true;
    wrapped.__original = original;
    window.navegarPara = wrapped;
  }

  document.addEventListener('keydown', event => {
    if (!activeLegacyModal || !modalIsVisible(activeLegacyModal)) return;
    const box = activeLegacyModal.querySelector(':scope > .modal-box');
    if (!box) return;
    if (event.key === 'Escape') {
      const close = box.querySelector('.modal-fechar');
      if (close) { event.preventDefault(); close.click(); }
      return;
    }
    if (event.key !== 'Tab') return;
    const items = Array.from(box.querySelectorAll(focusableSelector)).filter(el => el.getClientRects().length > 0);
    if (!items.length) { event.preventDefault(); box.focus(); return; }
    const first = items[0], last = items[items.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  });

  function init(){
    bindLabels();
    normalizeLegacyDialogs();
    installRouteAnnouncements();
    syncLegacyModalFocus();
    const observer = new MutationObserver(mutations => {
      const childChanged = mutations.some(mutation => mutation.type === 'childList');
      const modalStateChanged = mutations.some(mutation =>
        mutation.type === 'attributes' && mutation.target.classList && mutation.target.classList.contains('modal-overlay')
      );
      if (childChanged) {
        bindLabels();
        normalizeLegacyDialogs();
      }
      if (childChanged || modalStateChanged) syncLegacyModalFocus();
    });
    observer.observe(document.body, {subtree:true, childList:true, attributes:true, attributeFilter:['class','style','hidden']});
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, {once:true});
  else init();
})();

/* KineSysMobileDrawerHardening_v1300
 * Mantém o drawer existente e apenas normaliza seu lifecycle no mobile,
 * inclusive bfcache/history do Safari iOS. */
(function KineSysMobileDrawerHardening_v1300(){
  'use strict';

  const BREAKPOINT = 820;
  const mobile = () => window.matchMedia(`(max-width:${BREAKPOINT}px)`).matches;

  function elements(){
    return {
      sidebar: document.getElementById('ks_sidebar'),
      button: document.getElementById('ks_mobile_menu'),
      backdrop: document.getElementById('ks_nav_backdrop'),
      list: document.getElementById('dropdownContent')
    };
  }

  function setOpen(open, {focusButton=false}={}){
    const {sidebar,button,backdrop,list}=elements();
    if(!sidebar||!button||!backdrop)return false;
    const shouldOpen=!!open&&mobile();

    document.documentElement.classList.toggle('ks-nav-open',shouldOpen);
    document.body.classList.toggle('ks-nav-open',shouldOpen);
    button.setAttribute('aria-expanded',shouldOpen?'true':'false');
    button.setAttribute('aria-label',shouldOpen?'Fechar menu':'Abrir menu');

    backdrop.hidden=false;
    backdrop.setAttribute('aria-hidden',shouldOpen?'false':'true');

    if(mobile()){
      sidebar.setAttribute('aria-hidden',shouldOpen?'false':'true');
      sidebar.inert=!shouldOpen;
    }else{
      sidebar.removeAttribute('aria-hidden');
      sidebar.inert=false;
    }

    if(shouldOpen&&list){
      list.scrollTop=0;
      requestAnimationFrame(()=>list.scrollTop=0);
    }
    if(!shouldOpen&&focusButton&&button.isConnected){
      requestAnimationFrame(()=>button.focus({preventScroll:true}));
    }
    return shouldOpen;
  }

  function bind(){
    const {sidebar,button,backdrop,list}=elements();
    if(!sidebar||!button||!backdrop)return false;
    if(button.dataset.ksDrawerHardening==='1')return true;

    button.dataset.ksDrawerHardening='1';
    button.setAttribute('aria-controls','ks_sidebar');
    button.onclick=event=>{
      event.preventDefault();
      event.stopPropagation();
      setOpen(!document.body.classList.contains('ks-nav-open'));
    };
    backdrop.onclick=event=>{
      event.preventDefault();
      setOpen(false,{focusButton:true});
    };
    list?.addEventListener('click',event=>{
      if(event.target.closest('a'))setOpen(false);
    });
    return true;
  }

  function reset(){
    bind();
    setOpen(false);
  }

  document.addEventListener('keydown',event=>{
    if(event.key==='Escape'&&document.body.classList.contains('ks-nav-open')){
      event.preventDefault();
      setOpen(false,{focusButton:true});
    }
  });

  document.addEventListener('kinesys:tela-ativada',()=>setOpen(false));
  document.addEventListener('kinesys:tela-dom-pronta',bind);

  window.addEventListener('pageshow',reset);
  window.addEventListener('popstate',reset);
  window.addEventListener('orientationchange',()=>{
    setOpen(false);
    setTimeout(reset,80);
  });
  window.addEventListener('resize',()=>{
    if(!mobile())setOpen(false);
  },{passive:true});

  if(window.visualViewport){
    window.visualViewport.addEventListener('resize',()=>{
      if(document.body.classList.contains('ks-nav-open')&&!mobile())setOpen(false);
    },{passive:true});
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',()=>setTimeout(reset,20),{once:true});
  }else{
    setTimeout(reset,20);
  }
  setTimeout(reset,650);
})();

