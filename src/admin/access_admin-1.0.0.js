/* KineSys — Access Admin 1.0.0
 * Administração segura de credenciais pela aba Equipe.
 * Senhas são alteradas somente no Supabase Auth por Edge Function autenticada.
 */
(function instalarKineSysAccessAdmin(){
    'use strict';

    const VERSION='1.0.0';
    const DIALOG_ID='ks_access_admin_dialog';
    const ONLINE_CONFIG_SCRIPT='src/admin/configuracoes_agendamento_online-1.0.0.js';
    const ONLINE_CONFIG_REVISION='20261028-espelhar-agenda-r1';
    const ONLINE_PROFILE_CONFIG_SCRIPT='src/admin/configuracoes_agendamento_online_perfil_publico-1.0.0.js';
    const ONLINE_PROFILE_CONFIG_REVISION='20261016-config-paginas-r1';
    const ONLINE_LAYOUT_SCRIPT='src/admin/configuracoes_agendamento_online_layout-1.0.0.js';
    const ONLINE_LAYOUT_REVISION='20261016-config-paginas-r1';
    let alvoAtual=null;
    let busy=false;

    function ehMaster(){
        if(typeof usuarioEhMaster==='function')return !!usuarioEhMaster();
        return ['MASTER','MASTER_FEM'].includes(String(typeof usuarioLogado!=='undefined'?usuarioLogado?.tipo:'').toUpperCase());
    }

    function validarSenha(senha=''){
        const valor=String(senha||'');
        if(valor.length<12)return 'Use pelo menos 12 caracteres.';
        if(!/[a-z]/.test(valor))return 'Inclua pelo menos uma letra minúscula.';
        if(!/[A-Z]/.test(valor))return 'Inclua pelo menos uma letra maiúscula.';
        if(!/\d/.test(valor))return 'Inclua pelo menos um número.';
        return '';
    }

    function dialog(){return document.getElementById(DIALOG_ID);}

    function garantirDialog(){
        let d=dialog();
        if(d)return d;
        d=document.createElement('dialog');
        d.id=DIALOG_ID;
        d.className='ks-access-admin-dialog';
        d.setAttribute('aria-labelledby','ks_access_admin_title');
        d.innerHTML=`
            <form method="dialog" class="ks-access-admin-card" id="ks_access_admin_form">
                <div class="ks-access-admin-head">
                    <div><span class="eyebrow">ACESSO DO FUNCIONÁRIO</span><h2 id="ks_access_admin_title">Definir nova senha</h2></div>
                    <button type="button" class="ks-access-admin-close" aria-label="Fechar">×</button>
                </div>
                <p class="ks-access-admin-intro">A nova senha será gravada no Supabase Auth. Ela não é armazenada no cadastro da equipe.</p>
                <div class="ks-access-admin-person" aria-live="polite">
                    <strong id="ks_access_admin_nome">Funcionário</strong>
                    <span id="ks_access_admin_email"></span>
                </div>
                <div class="input-group">
                    <label for="ks_access_admin_senha">Nova senha</label>
                    <div class="ks-access-admin-password"><input id="ks_access_admin_senha" type="password" autocomplete="new-password" minlength="12" required><button type="button" data-access-password="ks_access_admin_senha">Mostrar</button></div>
                    <small>12+ caracteres, com maiúscula, minúscula e número.</small>
                </div>
                <div class="input-group">
                    <label for="ks_access_admin_confirmar">Confirmar nova senha</label>
                    <div class="ks-access-admin-password"><input id="ks_access_admin_confirmar" type="password" autocomplete="new-password" minlength="12" required><button type="button" data-access-password="ks_access_admin_confirmar">Mostrar</button></div>
                </div>
                <div id="ks_access_admin_feedback" class="ks-access-admin-feedback" role="status" aria-live="polite"></div>
                <p class="ks-access-admin-note">Após a alteração, o funcionário deverá entrar novamente com a nova senha. Sessões de perfil KineSys vinculadas à conta são invalidadas.</p>
                <div class="actions ks-access-admin-actions"><button type="button" class="btn-secondary" data-access-cancel>Cancelar</button><button type="submit" class="btn-primary" id="ks_access_admin_submit">Salvar nova senha</button></div>
            </form>`;
        document.body.appendChild(d);
        const form=d.querySelector('#ks_access_admin_form');
        const fechar=()=>{if(!busy&&d.open)d.close();};
        d.querySelector('.ks-access-admin-close').addEventListener('click',fechar);
        d.querySelector('[data-access-cancel]').addEventListener('click',fechar);
        d.addEventListener('cancel',event=>{if(busy)event.preventDefault();});
        d.addEventListener('close',()=>{
            alvoAtual=null;
            form.reset();
            feedback('');
            d.querySelectorAll('[data-access-password]').forEach(button=>{button.textContent='Mostrar';button.setAttribute('aria-pressed','false');});
            d.querySelectorAll('input[type="password"],input[type="text"]').forEach(input=>{if(input.id.startsWith('ks_access_admin_'))input.type='password';});
        });
        d.querySelectorAll('[data-access-password]').forEach(button=>button.addEventListener('click',()=>{
            const input=document.getElementById(button.dataset.accessPassword);
            if(!input)return;
            const mostrar=input.type==='password';input.type=mostrar?'text':'password';button.textContent=mostrar?'Ocultar':'Mostrar';button.setAttribute('aria-pressed',String(mostrar));
        }));
        form.addEventListener('submit',event=>{event.preventDefault();salvarNovaSenha();});
        return d;
    }

    function feedback(mensagem='',tipo=''){
        const el=document.getElementById('ks_access_admin_feedback');
        if(!el)return;
        el.textContent=String(mensagem||'');
        el.dataset.tipo=tipo||'';
        el.hidden=!mensagem;
    }

    function setBusy(valor){
        busy=!!valor;
        const d=dialog();if(!d)return;
        d.querySelectorAll('input,button').forEach(el=>el.disabled=busy);
        const submit=d.querySelector('#ks_access_admin_submit');if(submit)submit.textContent=busy?'Salvando…':'Salvar nova senha';
    }

    async function buscarFuncionario(id){
        if(typeof _supabase==='undefined'||!_supabase)throw new Error('Servidor indisponível.');
        const {data,error}=await _supabase.from('equipe').select('id,nome,email,tipo,ativo,auth_user_id,clinica_id').eq('id',String(id)).maybeSingle();
        if(error)throw error;
        if(!data)throw new Error('Funcionário não encontrado ou sem permissão.');
        return data;
    }

    async function abrir(id){
        if(!ehMaster()){
            if(typeof mostrarToastKineSys==='function')mostrarToastKineSys('Somente administradores podem redefinir senhas.','erro',5000);
            else alert('Somente administradores podem redefinir senhas.');
            return false;
        }
        try{
            const funcionario=await buscarFuncionario(id);
            if(!funcionario.auth_user_id)throw new Error('Este perfil ainda não possui uma conta de acesso vinculada.');
            if(typeof usuarioLogado!=='undefined'&&String(funcionario.auth_user_id)===String(usuarioLogado?.auth_user_id||''))throw new Error('Para alterar a sua própria senha, use a recuperação de conta na tela de login.');
            alvoAtual=funcionario;
            const d=garantirDialog();
            d.querySelector('#ks_access_admin_nome').textContent=funcionario.nome||'Funcionário';
            d.querySelector('#ks_access_admin_email').textContent=funcionario.email||'';
            feedback('');
            d.showModal();
            setTimeout(()=>d.querySelector('#ks_access_admin_senha')?.focus(),0);
            return true;
        }catch(error){
            const mensagem=error?.message||'Não foi possível abrir a redefinição de senha.';
            if(typeof mostrarToastKineSys==='function')mostrarToastKineSys(mensagem,'erro',6000);else alert(mensagem);
            return false;
        }
    }

    async function salvarNovaSenha(){
        if(busy||!alvoAtual||!ehMaster())return false;
        const senha=document.getElementById('ks_access_admin_senha')?.value||'';
        const confirmar=document.getElementById('ks_access_admin_confirmar')?.value||'';
        const erroSenha=validarSenha(senha);
        if(erroSenha){feedback(erroSenha,'erro');document.getElementById('ks_access_admin_senha')?.focus();return false;}
        if(senha!==confirmar){feedback('As senhas não coincidem.','erro');document.getElementById('ks_access_admin_confirmar')?.focus();return false;}
        setBusy(true);feedback('Atualizando a credencial com segurança…','info');
        try{
            const {data,error}=await _supabase.functions.invoke('cadastrar-equipe',{
                body:{
                    action:'reset_password',
                    target_profile_id:String(alvoAtual.id),
                    new_password:senha,
                    solicitante_perfil_id:String(usuarioLogado?.id||'')
                }
            });
            if(error)throw error;
            if(data?.error)throw new Error(data.error);
            if(!data?.ok)throw new Error('O servidor não confirmou a alteração da senha.');
            feedback('Senha alterada com sucesso. O funcionário já pode entrar com a nova senha.','sucesso');
            const d=dialog();
            setTimeout(()=>{if(d?.open)d.close();},900);
            return true;
        }catch(error){
            console.error('KineSys: falha ao redefinir senha do funcionário.',error);
            const contexto=error?.context;
            let mensagem=error?.message||'Não foi possível alterar a senha.';
            try{
                const body=await contexto?.json?.();
                if(body?.error)mensagem=body.error;
            }catch(_){}
            feedback(mensagem,'erro');
            return false;
        }finally{setBusy(false);}
    }

    function interceptarClique(event){
        const botao=event.target?.closest?.('[data-equipe-redefinir]');
        if(!botao)return;
        event.preventDefault();event.stopPropagation();event.stopImmediatePropagation();
        abrir(botao.dataset.equipeRedefinir);
    }

    function telaConfiguracoesAtiva(){
        return !!document.getElementById('tela_configuracoes')?.classList.contains('ativa');
    }

    function prepararEntradaAgendaConfiguracoes(){
        try{
            const atual=sessionStorage.getItem('kinesys_config_tab');
            if(!['clinica','online','aparencia','equipe','mensagens','documentos','integracoes','dados'].includes(atual))sessionStorage.setItem('kinesys_config_tab','mensagens');
        }catch(_){}
    }

    function ativarConfiguracoesAgenda(){
        if(!telaConfiguracoesAtiva()||!ehMaster())return false;
        prepararEntradaAgendaConfiguracoes();
        const configuracoes=window.KineSysConfiguracoesAgendaOnline;
        configuracoes?.onOpen?.();
        // O perfil necessita do DOM do hub antes de montar; módulos podem ter
        // sido carregados enquanto a sessão ainda estava sendo restaurada.
        window.KineSysConfiguracoesAgendaOnlinePerfilPublico?.onOpen?.();
        let aba='online';
        try{aba=sessionStorage.getItem('kinesys_config_tab')||'online';}catch(_){}
        configuracoes?.abrirAba?.(aba);
        window.KineSysConfiguracoesAgendaOnlineLayout?.onOpen?.();
        return !!configuracoes;
    }

    function carregarLayoutAgendaOnline(){
        if(window.KineSysConfiguracoesAgendaOnlineLayout){
            ativarConfiguracoesAgenda();
            return;
        }
        const existente=document.querySelector(`script[src^="${ONLINE_LAYOUT_SCRIPT}"]`);
        if(existente){
            existente.addEventListener('load',ativarConfiguracoesAgenda,{once:true});
            return;
        }
        const script=document.createElement('script');
        script.src=`${ONLINE_LAYOUT_SCRIPT}?v=${ONLINE_LAYOUT_REVISION}`;
        script.async=false;
        script.addEventListener('load',ativarConfiguracoesAgenda);
        document.body.appendChild(script);
    }

    function carregarPerfilPublicoAgendaOnline(){
        if(window.KineSysConfiguracoesAgendaOnlinePerfilPublico){
            window.KineSysConfiguracoesAgendaOnlinePerfilPublico.onOpen?.();
            carregarLayoutAgendaOnline();
            return;
        }
        const existente=document.querySelector(`script[src^="${ONLINE_PROFILE_CONFIG_SCRIPT}"]`);
        if(existente){
            existente.addEventListener('load',carregarLayoutAgendaOnline,{once:true});
            return;
        }
        const script=document.createElement('script');
        script.src=`${ONLINE_PROFILE_CONFIG_SCRIPT}?v=${ONLINE_PROFILE_CONFIG_REVISION}`;
        script.async=false;
        script.addEventListener('load',()=>{
            window.KineSysConfiguracoesAgendaOnlinePerfilPublico?.onOpen?.();
            carregarLayoutAgendaOnline();
        });
        document.body.appendChild(script);
    }

    function carregarConfiguracoesAgendaOnline(){
        if(window.KineSysConfiguracoesAgendaOnline){
            carregarPerfilPublicoAgendaOnline();
            return;
        }
        const existente=document.querySelector(`script[src^="${ONLINE_CONFIG_SCRIPT}"]`);
        if(existente){
            existente.addEventListener('load',()=>{
                carregarPerfilPublicoAgendaOnline();
                ativarConfiguracoesAgenda();
            },{once:true});
            return;
        }
        const script=document.createElement('script');
        script.src=`${ONLINE_CONFIG_SCRIPT}?v=${ONLINE_CONFIG_REVISION}`;
        script.async=false;
        script.addEventListener('load',()=>{
            carregarPerfilPublicoAgendaOnline();
            ativarConfiguracoesAgenda();
        });
        document.body.appendChild(script);
    }

    function encaminharAberturaConfiguracoes(event){
        if(!event.target?.closest?.('#menu_configuracoes a'))return;
        prepararEntradaAgendaConfiguracoes();
        carregarConfiguracoesAgendaOnline();
        setTimeout(()=>{
            ativarConfiguracoesAgenda();
            if(!window.KineSysConfiguracoesAgendaOnlineLayout)carregarPerfilPublicoAgendaOnline();
        },0);
    }

    function observarConfiguracoesAtivas(){
        const tela=document.getElementById('tela_configuracoes');
        if(!tela)return;
        let estavaAtiva=tela.classList.contains('ativa');
        const observer=new MutationObserver(()=>{
            const estaAtiva=tela.classList.contains('ativa');
            if(estaAtiva&&!estavaAtiva){
                prepararEntradaAgendaConfiguracoes();
                carregarConfiguracoesAgendaOnline();
                setTimeout(ativarConfiguracoesAgenda,0);
            }
            estavaAtiva=estaAtiva;
        });
        observer.observe(tela,{attributes:true,attributeFilter:['class']});
    }

    document.addEventListener('click',interceptarClique,true);
    document.addEventListener('click',encaminharAberturaConfiguracoes,true);
    if(document.readyState==='loading'){
        document.addEventListener('DOMContentLoaded',()=>{carregarConfiguracoesAgendaOnline();observarConfiguracoesAtivas();},{once:true});
    }else{
        carregarConfiguracoesAgendaOnline();
        observarConfiguracoesAtivas();
    }

    async function diagnosticos(){
        if(!ehMaster())return;
        let d=document.getElementById('ks_access_log_dialog');
        if(!d){d=document.createElement('dialog');d.id='ks_access_log_dialog';d.className='ks-access-log-dialog';d.setAttribute('aria-labelledby','ks_access_log_title');
            d.innerHTML='<h2 id="ks_access_log_title">Diagnósticos de acesso</h2><p>Últimos 14 dias · Horário de Brasília. A conta informada antes do login não comprova a identidade. Falhas sem conexão chegam quando o computador volta a se conectar.</p><label for="ks_access_log_search">Buscar conta ou código de atendimento</label><input id="ks_access_log_search" type="search"><p role="status" data-log-state></p><div class="ks-access-log-scroll" data-log-content></div><div class="actions"><button type="button" class="btn-secondary" data-log-close>Fechar</button></div>';
            document.body.appendChild(d);d.querySelector('[data-log-close]').onclick=()=>d.close();
        }
        if(!d.open)d.showModal();
        const profile=typeof usuarioLogado!=='undefined'?String(usuarioLogado?.id||''):'';
        const state=d.querySelector('[data-log-state]'),content=d.querySelector('[data-log-content]');content.replaceChildren();state.textContent='Carregando registros…';
        const labels={iniciado:'Tentativa iniciada',sucesso:'Concluído',credenciais_invalidas:'Credenciais recusadas',email_nao_confirmado:'E-mail não confirmado',limite_tentativas:'Limite de tentativas',rede_indisponivel:'Navegador sem conexão',falha_conexao:'Conexão falhou; DNS, bloqueio ou CORS não distinguíveis pelo navegador',tempo_esgotado:'Tempo de espera excedido',sessao_invalida:'Sessão inválida',acesso_negado:'Permissão recusada',servidor_indisponivel:'Servidor respondeu com erro',recurso_indisponivel:'Arquivo não carregou',erro_execucao:'Erro de execução',falha_desconhecida:'Causa não determinada'};
        try{const {data,error}=await _supabase.rpc('kinesys_listar_diagnosticos_acesso');if(error)throw error;
            if(!d.open||!ehMaster()||profile!==String(usuarioLogado?.id||'')){content.replaceChildren();d.close();return;}
            const rows=Array.isArray(data)?data:[];
            const render=()=>{const q=d.querySelector('input').value.trim().toLowerCase();const filtered=rows.filter(r=>[r.conta_informada,r.tentativa].join(' ').toLowerCase().includes(q));
                state.textContent=filtered.length+' registro(s). Sem senhas, tokens ou dados clínicos. A causa de uma falha de rede pode exigir análise do computador.';
                content.replaceChildren();const table=document.createElement('table'),head=table.createTHead().insertRow();['Horário','Conta informada','Etapa e resultado','Código'].forEach(text=>{const th=document.createElement('th');th.scope='col';th.textContent=text;head.appendChild(th);});
                const body=table.createTBody();filtered.forEach(r=>{const row=body.insertRow();[new Date(r.ocorrido_em).toLocaleString('pt-BR',{timeZone:'America/Sao_Paulo'}),r.conta_informada||'Não identificada',r.etapa+' · '+(labels[r.motivo]||'Causa não determinada')+(r.status?' · HTTP '+r.status:''),r.tentativa].forEach(value=>{const cell=row.insertCell();cell.textContent=String(value);});});content.appendChild(table);
            };d.querySelector('input').value='';d.querySelector('input').oninput=render;render();
        }catch(_){state.textContent='Não foi possível carregar os diagnósticos. Tente novamente quando a conexão voltar.';}
    }
    function limparDiagnosticos(){const d=document.getElementById('ks_access_log_dialog');if(d){d.querySelector('[data-log-content]')?.replaceChildren();const input=d.querySelector('input');if(input){input.value='';input.oninput=null;}if(d.open)d.close();}}
    window.KineSysAccessAdmin=Object.freeze({version:VERSION,open:abrir,validatePassword:validarSenha,diagnostics:diagnosticos,clearDiagnostics:limparDiagnosticos});
})();
