/* Login UI and session-bound access. Database RPCs are authoritative. */
const KineSysLogin = (() => {
    const roles = {
        gestao: [['MASTER','Administrador(a)'],['SECRETARIA','Secretaria']],
        profissional: [['FISIOTERAPEUTA','Fisioterapeuta']]
    };
    let area = 'gestao', pending = [], pendingUser = '', busy = false, recovery = false;
    let recoveryBusy = false, resetBusy = false;
    const el = id => document.getElementById(id);
    const normalize = value => ({MASTER_FEM:'MASTER',PROFISSIONAL:'FISIOTERAPEUTA'})[value] || value;
    const known = value => Object.values(roles).flat().some(([id])=>id === normalize(value));
    const roleLabel = value => ({MASTER:'Administrador(a)',SECRETARIA:'Secretaria',FISIOTERAPEUTA:'Fisioterapeuta'})[normalize(value)] || normalize(value) || 'Perfil';

    function profileLabel(profile={}) {
        return [roleLabel(profile.tipo),profile.clinica_nome,profile.registro].filter(Boolean).join(' · ') || profile.nome || 'Perfil';
    }
    function show(view = 'normal') {
        for (const name of ['normal','recuperar','nova_senha','conta']) el('login_acesso_'+name).hidden = name !== view;
        mostrarFeedbackLogin('');
    }
    function clearPending() {
        pending=[];pendingUser='';loginPerfisDisponiveis=[];loginCredencialChave='';
        el('login_perfil_group').style.display='none';el('login_perfil').replaceChildren(new Option('Selecione seu perfil',''));
        el('login_senha').required=true;el('login_senha').disabled=false;el('login_email').readOnly=false;
    }
    function configureUnifiedLogin() {
        document.querySelector('.ks-access-tabs')?.setAttribute('hidden','');
        const roleGroup=el('login_funcao')?.closest('.input-group');
        if(roleGroup)roleGroup.hidden=true;
        const intro=document.querySelector('.ks-access-intro > p');
        if(intro)intro.textContent='Entre com sua conta. O KineSys libera somente os perfis realmente vinculados ao seu e-mail.';
        const note=document.querySelector('.ks-access-note');
        if(note)note.textContent='Se sua conta possui mais de um vínculo, você escolhe o perfil depois que o e-mail e a senha forem confirmados.';
        el('login_acesso_titulo').textContent='Acesso ao KineSys';
        el('login_acesso_descricao').textContent='Informe seu e-mail e senha. Seu perfil autorizado será identificado automaticamente.';
        el('btn_login_entrar').textContent='Entrar';
    }
    function setArea(next, focus = false) {
        // Mantido apenas como compatibilidade com HTML/cache antigo. A função escolhida
        // pelo usuário não é mais fonte de autorização: o banco devolve os perfis reais.
        if(busy || !roles[next])return;
        area=next;
        if(focus)el('login_email')?.focus();
    }
    function setBusy(value) {
        busy=value;loginEmAndamento=value;
        document.querySelectorAll('#login_acesso_normal button,#login_email,#login_senha,#login_perfil').forEach(node=>node.disabled=value);
        el('login_senha').disabled=value || pending.length>0;
        el('btn_login_entrar').textContent=value?'Verificando acesso…':pending.length?'Entrar com este perfil':'Entrar';
    }
    async function rpc(name, args) {
        if(!_supabase)throw new Error('Serviço de autenticação indisponível.');
        const {data,error}=await _supabase.rpc(name,args);
        if(error)throw new Error(/PGRST202|42883/.test(error.code||'')?'A atualização de acesso ainda não foi ativada no servidor. Procure o administrador.':'Não foi possível validar este acesso. Entre novamente ou procure o administrador.');
        return data;
    }
    function enter(profile) {
        if(!profile?.id || !known(profile.tipo))throw new Error('Perfil não autorizado. Procure o administrador.');
        if(usuarioLogado?.id===profile.id && usuarioLogado.tipo===normalize(profile.tipo))return;
        if(usuarioLogado){location.reload();return;}
        usuarioLogado={...profile,tipo:normalize(profile.tipo)};persistirSessao(usuarioLogado);clearPending();
        mostrarFeedbackLogin('');liberarAcessoSistema();
    }
    async function activate(profile) {
        if(!profile?.id || !known(profile.tipo))throw new Error('Selecione um perfil válido.');
        const expectedType=normalize(profile.tipo);
        const active=await rpc('kinesys_ativar_perfil',{p_perfil_id:String(profile.id)});
        if(!active || String(active.id)!==String(profile.id) || normalize(active.tipo)!==expectedType)throw new Error('O acesso retornado não corresponde ao perfil solicitado. Saia e entre novamente.');
        enter(active);return true;
    }
    async function resume() {
        if(recovery)return;
        const active=await rpc('kinesys_perfil_sessao');
        if(recovery)return;
        if(active)enter(active);
        else {if(usuarioLogado){location.reload();return;}usuarioLogado=null;sincronizarEstadoAutenticacaoVisual();navegarPara('tela_login');}
    }
    async function login() {
        if(busy || recovery)return;
        if(!pending.length && !el('login_form').reportValidity())return;
        if(pending.length && el('login_perfil').value===''){mostrarFeedbackLogin('Selecione o perfil para continuar.','aviso');return;}
        setBusy(true);mostrarFeedbackLogin(pending.length?'Validando o perfil selecionado…':'Verificando credenciais e perfis…');
        try {
            if(pending.length){
                const chosen=pending.find(p=>String(p.id)===el('login_perfil').value);
                const {data,error}=await _supabase.auth.getUser();
                if(error || data?.user?.id!==pendingUser || !chosen)throw new Error('Sua sessão mudou. Entre novamente.');
                await activate(chosen);return;
            }
            const email=el('login_email').value.trim().toLowerCase(),password=el('login_senha').value;
            if(!_supabase)throw new Error('Serviço de autenticação indisponível.');
            const {data,error}=await _supabase.auth.signInWithPassword({email,password});
            el('login_senha').value='';
            if(error)throw new Error(mensagemErroAutenticacao(error));
            const profiles=(await rpc('kinesys_meus_perfis') || []).filter(p=>known(p.tipo));
            if(!profiles.length){await _supabase.auth.signOut({scope:'local'});throw new Error('Esta conta não possui nenhum perfil ativo no KineSys. Procure o administrador da clínica.');}
            if(profiles.length===1){await activate(profiles[0]);return;}
            pending=profiles.slice().sort((a,b)=>profileLabel(a).localeCompare(profileLabel(b),'pt-BR',{sensitivity:'base'}));
            loginPerfisDisponiveis=[...pending];pendingUser=data.user.id;
            el('login_perfil').replaceChildren(new Option('Selecione seu perfil',''),...pending.map(p=>new Option(profileLabel(p),String(p.id))));
            el('login_perfil_group').style.display='block';el('login_senha').required=false;el('login_email').readOnly=true;
            mostrarFeedbackLogin('Identidade confirmada. Escolha um dos perfis vinculados à sua conta.','sucesso');
        } catch(error){usuarioLogado=null;sincronizarEstadoAutenticacaoVisual();mostrarFeedbackLogin(error.message || 'Não foi possível entrar. Tente novamente.','erro');}
        finally{setBusy(false);if(pending.length)el('login_perfil').focus();}
    }
    async function sendRecovery() {
        if(recoveryBusy || !el('login_recovery_form').reportValidity())return;
        recoveryBusy=true;el('login_recovery_submit').disabled=true;
        try{
            if(!_supabase)throw new Error();
            const redirectTo=new URL('recuperar-acesso.html',location.href);
            const {error}=await _supabase.auth.resetPasswordForEmail(el('login_recovery_email').value.trim().toLowerCase(),{redirectTo:redirectTo.href});
            if(error)throw error;
            mostrarFeedbackLogin('Se a conta existir, você receberá um link para criar uma nova senha. Confira também a caixa de spam.','sucesso');
        }catch{mostrarFeedbackLogin('Não foi possível enviar agora. Aguarde alguns minutos e tente novamente.','erro');}
        finally{recoveryBusy=false;el('login_recovery_submit').disabled=false;}
    }
    function recoveryView(){recovery=true;usuarioLogado=null;clearPending();sincronizarEstadoAutenticacaoVisual();navegarPara('tela_login');show('nova_senha');}
    async function resetPassword(){
        if(resetBusy || !recovery || !el('login_reset_form').reportValidity())return;
        if(el('login_nova_senha').value!==el('login_confirmar_senha').value){mostrarFeedbackLogin('As senhas não coincidem. Confira os dois campos.','aviso');return;}
        resetBusy=true;el('login_reset_submit').disabled=true;
        try{
            const {data,error:identityError}=await _supabase.auth.getUser();
            if(identityError || !data?.user)throw new Error('O link expirou ou é inválido. Solicite outro link.');
            const {error}=await _supabase.auth.updateUser({password:el('login_nova_senha').value});
            if(error)throw new Error('A senha não foi aceita. Use uma senha longa e diferente da anterior ou solicite outro link.');
            await _supabase.auth.signOut({scope:'local'});
            recovery=false;el('login_reset_form').reset();show();history.replaceState(null,'',location.pathname);
            mostrarFeedbackLogin('Senha atualizada. Entre com seu e-mail e a nova senha.','sucesso');
        }catch(error){mostrarFeedbackLogin(error.message || 'Não foi possível redefinir sua senha.','erro');}
        finally{resetBusy=false;el('login_reset_submit').disabled=false;}
    }
    async function start(){
        if(autenticacaoInicializada)return;autenticacaoInicializada=true;
        localStorage.removeItem('kinesys_sessao_logada');
        recovery=new URLSearchParams(location.search).get('recuperar')==='1';
        if(!_supabase){mostrarFeedbackLogin('Serviço de autenticação indisponível.','erro');return;}
        const {data}= _supabase.auth.onAuthStateChange(event=>{
            if(event==='PASSWORD_RECOVERY'){recoveryView();return;}
            if(event==='SIGNED_OUT'){usuarioLogado=null;clearPending();sincronizarEstadoAutenticacaoVisual();navegarPara('tela_login');return;}
            if(event==='SIGNED_IN' && !busy && !recovery){setTimeout(()=>resume().catch(()=>{usuarioLogado=null;sincronizarEstadoAutenticacaoVisual();navegarPara('tela_login');}),0);}
        });authStateSubscription=data?.subscription;
        try{
            if(recovery){recoveryView();return;}
            const {data:session,error}=await _supabase.auth.getSession();
            if(error)throw error;
            if(session?.session)await resume();
        }catch{usuarioLogado=null;sincronizarEstadoAutenticacaoVisual();navegarPara('tela_login');mostrarFeedbackLogin('Não foi possível recuperar o acesso. Entre novamente.','aviso');}
    }
    document.addEventListener('DOMContentLoaded',()=>{
        configureUnifiedLogin();
        document.querySelectorAll('[data-access-area]').forEach(button=>{
            button.addEventListener('click',()=>setArea(button.dataset.accessArea));
        });
        el('login_email').addEventListener('input',()=>{clearPending();mostrarFeedbackLogin('');});
        el('login_form').addEventListener('submit',event=>{event.preventDefault();login();});
        el('login_recovery_form').addEventListener('submit',event=>{event.preventDefault();sendRecovery();});
        el('login_reset_form').addEventListener('submit',event=>{event.preventDefault();resetPassword();});
        el('btn_login_redefinir').onclick=()=>{el('login_recovery_email').value=el('login_email').value;show('recuperar');el('login_recovery_email').focus();};
        el('btn_login_conta').onclick=()=>show('conta');
        document.querySelectorAll('[data-access-back]').forEach(button=>button.onclick=()=>show());
        el('login_cancelar_recovery').onclick=async()=>{if(resetBusy)return;await _supabase?.auth.signOut({scope:'local'});recovery=false;el('login_reset_form').reset();show();history.replaceState(null,'',location.pathname);};
        document.querySelectorAll('[data-toggle-password]').forEach(button=>button.onclick=()=>{const input=el(button.dataset.togglePassword),visible=input.type==='password';input.type=visible?'text':'password';button.textContent=visible?'Ocultar':'Mostrar';button.setAttribute('aria-pressed',String(visible));button.setAttribute('aria-label',visible?'Ocultar senha':'Mostrar senha');});
        el('login_senha').addEventListener('keyup',event=>{
            const capsAtivo=typeof event.getModifierState==='function' && event.getModifierState('CapsLock');
            el('login_caps').hidden=!capsAtivo;
        });
    });
    return {start,login,resume,activate,sendRecovery,clearPending};
})();
