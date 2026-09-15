/* ============================================================================
   KineSys — Home focada do profissional v1.0.0
   - Mantém Meu dia clínico como área principal
   - Pendências de registro em indicador discreto
   - Atendimentos realizados no mês agrupados por paciente
   - Notificações: aniversários + notificações internas existentes
   ============================================================================ */
(function(){
    'use strict';

    let refreshToken = 0;

    function ehProfissional(){
        const tipo=String(typeof usuarioLogado!=='undefined'?usuarioLogado?.tipo:'').toUpperCase();
        return tipo==='FISIOTERAPEUTA'||tipo==='PROFISSIONAL';
    }

    function escapar(v=''){
        return typeof escapeHTML==='function' ? escapeHTML(String(v??'')) : String(v??'').replace(/[&<>"']/g,s=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s]));
    }

    function agoraBrasilia(){
        const partes=Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date()).map(p=>[p.type,p.value]));
        return {ano:Number(partes.year),mes:Number(partes.month),dia:Number(partes.day),iso:`${partes.year}-${partes.month}-${partes.day}`};
    }

    function limitesMesAtual(){
        const a=agoraBrasilia();
        const inicio=`${a.ano}-${String(a.mes).padStart(2,'0')}-01`;
        const proximo=a.mes===12?`${a.ano+1}-01-01`:`${a.ano}-${String(a.mes+1).padStart(2,'0')}-01`;
        return {inicio,proximo,hoje:a.iso};
    }

    function nomeMesAtual(){
        return new Intl.DateTimeFormat('pt-BR',{timeZone:'America/Sao_Paulo',month:'long'}).format(new Date());
    }

    function profissionalAtualId(){
        if(typeof profissionalAgendaRestritoAtualId==='function'){
            const id=String(profissionalAgendaRestritoAtualId()||'').trim();
            if(id)return id;
        }
        return String(typeof usuarioLogado!=='undefined'?usuarioLogado?.id||'':'').trim();
    }

    function esconderCardsLegados(){
        const home=document.getElementById('tela_home');if(!home)return;
        const overview=home.querySelector('.ks-home-overview');
        if(overview){overview.hidden=true;overview.dataset.profHomeLegacyHidden='1';}
        const cadastro24h=home.querySelector('[data-ks-home-detail="recentes"]');
        if(cadastro24h){cadastro24h.hidden=true;cadastro24h.dataset.profHomeLegacyHidden='1';}
        const recente=document.getElementById('lista_pacientes_recentes')?.closest('.card');
        if(recente){recente.hidden=true;recente.dataset.profHomeLegacyHidden='1';}
        const pend=document.getElementById('card_pendencias_clinicas');
        if(pend){pend.hidden=true;pend.dataset.profHomeLegacyHidden='1';}
        home.querySelectorAll('.card').forEach(card=>{
            if(card.id==='card_painel_fisioterapeuta'||card.id==='ks_prof_home_workspace')return;
            const texto=String(card.querySelector('h2')?.textContent||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
            if((texto.includes('cadastros')||texto.includes('atendimentos'))&&texto.includes('ultimas 24 horas')){
                card.hidden=true;card.dataset.profHomeLegacyHidden='1';
            }
        });
    }

    function restaurarCardsLegados(){
        document.querySelectorAll('[data-prof-home-legacy-hidden="1"]').forEach(el=>{el.hidden=false;delete el.dataset.profHomeLegacyHidden;});
    }

    function garantirEstrutura(){
        const home=document.getElementById('tela_home');
        const painel=document.getElementById('card_painel_fisioterapeuta');
        if(!home||!painel)return null;
        if(!ehProfissional()){
            restaurarCardsLegados();
            document.getElementById('ks_prof_home_workspace')?.remove();
            document.getElementById('ks_prof_pendencias_btn')?.remove();
            home.classList.remove('ks-prof-home-active');
            return null;
        }
        home.classList.add('ks-prof-home-active');
        esconderCardsLegados();

        const header=painel.querySelector('.card-header');
        if(header&&!document.getElementById('ks_prof_pendencias_btn')){
            const btn=document.createElement('button');
            btn.type='button';btn.id='ks_prof_pendencias_btn';btn.className='ks-prof-pending-trigger';
            btn.setAttribute('aria-haspopup','dialog');btn.setAttribute('aria-controls','ks_prof_pendencias_dialog');
            btn.innerHTML='<span class="ks-prof-pending-icon" aria-hidden="true">✓</span><span>Pendências</span><strong id="ks_prof_pendencias_badge" hidden>0</strong>';
            btn.addEventListener('click',abrirPendencias);
            header.appendChild(btn);
        }

        let workspace=document.getElementById('ks_prof_home_workspace');
        if(!workspace){
            workspace=document.createElement('section');workspace.id='ks_prof_home_workspace';workspace.className='card ks-prof-home-workspace';
            workspace.innerHTML=`
                <div class="ks-prof-home-grid">
                    <article class="ks-prof-home-module ks-prof-month-card" id="ks_prof_month_card">
                        <button type="button" class="ks-prof-module-head" id="ks_prof_month_toggle" aria-expanded="false" aria-controls="ks_prof_month_details">
                            <span><small>ATIVIDADE DO MÊS</small><strong>Atendimentos realizados</strong></span>
                            <span class="ks-prof-month-number" id="ks_prof_month_total">—</span>
                        </button>
                        <p class="ks-prof-module-sub" id="ks_prof_month_sub">Carregando ${escapar(nomeMesAtual())}…</p>
                        <div id="ks_prof_month_details" class="ks-prof-expand-panel" hidden></div>
                    </article>
                    <article class="ks-prof-home-module ks-prof-notifications-card">
                        <div class="ks-prof-module-title"><span><small>ATENÇÃO</small><strong>Notificações</strong></span><span class="ks-prof-notification-count" id="ks_prof_notification_count" hidden>0</span></div>
                        <div id="ks_prof_notifications_list" class="ks-prof-notification-list"><p class="ks-prof-empty">Carregando notificações…</p></div>
                    </article>
                </div>
                <dialog id="ks_prof_pendencias_dialog" class="ks-prof-pending-dialog" aria-labelledby="ks_prof_pendencias_title">
                    <div class="ks-prof-dialog-head"><div><small>REGISTROS CLÍNICOS</small><h2 id="ks_prof_pendencias_title">Pendências</h2></div><button type="button" data-prof-close aria-label="Fechar">×</button></div>
                    <p class="ks-prof-dialog-intro">Itens concluídos na agenda que ainda precisam do respectivo registro clínico.</p>
                    <div id="ks_prof_pendencias_list" class="ks-prof-pending-list"></div>
                </dialog>`;
            const crm=document.getElementById('card_crm');
            if(crm&&crm.parentElement===home)home.insertBefore(workspace,crm);else home.appendChild(workspace);
            workspace.querySelector('#ks_prof_month_toggle')?.addEventListener('click',alternarMes);
            workspace.querySelector('[data-prof-close]')?.addEventListener('click',fecharPendencias);
            workspace.querySelector('#ks_prof_pendencias_dialog')?.addEventListener('cancel',e=>{e.preventDefault();fecharPendencias();});
        }
        return workspace;
    }

    function obterAvaliacoesPaciente(paciente){
        try{return typeof obterAvaliacoes==='function'?(obterAvaliacoes(paciente)||[]):(paciente?.avaliacoes||[]);}catch(_){return paciente?.avaliacoes||[];}
    }

    function registroVinculado(registro,agendamentoId){
        const vinculo=String(registro?.agendamentoId||registro?.agendamento_id||'');
        return !!vinculo&&vinculo===String(agendamentoId||'');
    }

    function ehProcedimentoAvaliativo(nome=''){
        const n=String(nome||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
        return /\b(re)?avaliacao\b|\breavaliacao\b/.test(n);
    }

    async function carregarPendenciasProfissional(token){
        const profissional=profissionalAtualId();if(!profissional||!_supabase)return [];
        const hoje=agoraBrasilia().iso;
        let r=await _supabase.from('agendamentos')
            .select('id,paciente_id,procedimento_id,data,hora_inicio,status,pacientes(id,nome),procedimentos(nome)')
            .eq('profissional_id',profissional).eq('data',hoje).in('status',['atendido','concluido']).order('hora_inicio');
        if(r.error&&/procedimentos|relationship|schema cache/i.test(String(r.error.message||''))){
            r=await _supabase.from('agendamentos').select('id,paciente_id,procedimento_id,data,hora_inicio,status,pacientes(id,nome)')
                .eq('profissional_id',profissional).eq('data',hoje).in('status',['atendido','concluido']).order('hora_inicio');
        }
        if(r.error||token!==refreshToken)return [];
        let pacientes=[];try{pacientes=typeof obterPacientesSalvos==='function'?await obterPacientesSalvos():[];}catch(_){}
        if(token!==refreshToken)return [];
        const pmap=new Map((pacientes||[]).map(p=>[String(p.id||''),p]));
        const itens=[];
        for(const a of r.data||[]){
            const paciente=pmap.get(String(a.paciente_id||''));
            if(!paciente)continue;
            const avaliacoes=obterAvaliacoesPaciente(paciente);
            const finalizadas=avaliacoes.filter(av=>String(av?.status||'').toLowerCase()!=='rascunho');
            const procedimentoNome=String((Array.isArray(a.procedimentos)?a.procedimentos[0]?.nome:a.procedimentos?.nome)||'');
            const avaliativo=ehProcedimentoAvaliativo(procedimentoNome);
            const modo=(!finalizadas.length||avaliativo)?'avaliacao':'evolucao';
            const registros=modo==='avaliacao'?finalizadas:(Array.isArray(paciente.evolucoes)?paciente.evolucoes:[]);
            if(registros.some(reg=>registroVinculado(reg,a.id)))continue;
            itens.push({
                id:String(a.id),pacienteId:String(a.paciente_id||''),
                nome:String((Array.isArray(a.pacientes)?a.pacientes[0]?.nome:a.pacientes?.nome)||paciente.nome||'Paciente'),
                hora:String(a.hora_inicio||'').slice(0,5),modo,
                titulo:modo==='avaliacao'?'Avaliação a concluir':'Evolução a concluir',
                target:modo==='avaliacao'?'tela_avaliacao':'tela_evolucao'
            });
        }
        return itens;
    }

    function renderizarPendencias(itens=[]){
        const badge=document.getElementById('ks_prof_pendencias_badge');
        const trigger=document.getElementById('ks_prof_pendencias_btn');
        const lista=document.getElementById('ks_prof_pendencias_list');
        const total=itens.length;
        if(badge){badge.textContent=total>99?'99+':String(total);badge.hidden=!total;}
        trigger?.classList.toggle('has-pending',total>0);
        if(!lista)return;
        if(!total){lista.innerHTML='<div class="ks-prof-empty-state"><strong>Sem pendências de registro hoje</strong><span>Os atendimentos concluídos estão com avaliação ou evolução vinculada.</span></div>';return;}
        lista.innerHTML=itens.map(item=>`<button type="button" class="ks-prof-pending-item" data-paciente="${escapar(item.pacienteId)}" data-target="${escapar(item.target)}"><span class="ks-prof-pending-time">${escapar(item.hora)}</span><span><strong>${escapar(item.nome)}</strong><small>${escapar(item.titulo)}</small></span><span class="ks-prof-pending-arrow" aria-hidden="true">→</span></button>`).join('');
        lista.querySelectorAll('[data-paciente]').forEach(btn=>btn.addEventListener('click',()=>{
            fecharPendencias();
            if(typeof abrirPacienteHomeDetalhe==='function')abrirPacienteHomeDetalhe(btn.dataset.paciente,btn.dataset.target);
        }));
    }

    async function carregarAtendimentosMes(token){
        const totalEl=document.getElementById('ks_prof_month_total'),sub=document.getElementById('ks_prof_month_sub'),det=document.getElementById('ks_prof_month_details');
        const profissional=profissionalAtualId();if(!profissional||!_supabase)return;
        const limites=limitesMesAtual();
        const r=await _supabase.from('agendamentos').select('id,paciente_id,data,status,pacientes(id,nome)')
            .eq('profissional_id',profissional).in('status',['atendido','concluido']).gte('data',limites.inicio).lt('data',limites.proximo).order('data',{ascending:false});
        if(token!==refreshToken)return;
        if(r.error){if(totalEl)totalEl.textContent='—';if(sub)sub.textContent='Não foi possível atualizar o mês.';if(det)det.innerHTML='<p class="ks-prof-empty">Tente novamente mais tarde.</p>';return;}
        const grupos=new Map();
        (r.data||[]).forEach(a=>{
            const id=String(a.paciente_id||'');if(!id)return;
            const nome=String((Array.isArray(a.pacientes)?a.pacientes[0]?.nome:a.pacientes?.nome)||'Paciente');
            const atual=grupos.get(id)||{id,nome,total:0};atual.total++;grupos.set(id,atual);
        });
        const pacientes=[...grupos.values()].sort((a,b)=>b.total-a.total||a.nome.localeCompare(b.nome,'pt-BR'));
        const total=(r.data||[]).length;
        if(totalEl)totalEl.textContent=String(total);
        if(sub)sub.textContent=`${pacientes.length} paciente(s) atendido(s) em ${nomeMesAtual()}. Clique para ver a distribuição.`;
        if(det)det.innerHTML=pacientes.length?pacientes.map(p=>`<div class="ks-prof-month-row"><span>${escapar(p.nome)}</span><strong aria-label="${p.total} atendimentos">${p.total}</strong></div>`).join(''):'<p class="ks-prof-empty">Nenhum atendimento realizado neste mês.</p>';
    }

    function nascimentoHoje(valor,hoje){
        const m=String(valor||'').match(/^\d{4}-(\d{2})-(\d{2})$/);return !!m&&Number(m[1])===hoje.mes&&Number(m[2])===hoje.dia;
    }

    async function carregarNotificacoesHome(token){
        const lista=document.getElementById('ks_prof_notifications_list'),count=document.getElementById('ks_prof_notification_count');if(!lista)return;
        let pacientes=[];try{pacientes=typeof obterPacientesSalvos==='function'?await obterPacientesSalvos():[];}catch(_){}
        if(token!==refreshToken)return;
        const hoje=agoraBrasilia();
        const aniversarios=(pacientes||[]).filter(p=>nascimentoHoje(p.nascimento,hoje)).sort((a,b)=>String(a.nome||'').localeCompare(String(b.nome||''),'pt-BR')).map(p=>({tipo:'aniversario',titulo:'Aniversário hoje',mensagem:String(p.nome||'Paciente')}));
        try{if(typeof carregarNotificacoesAgenda==='function')await carregarNotificacoesAgenda({avisar:false});}catch(_){}
        if(token!==refreshToken)return;
        let internas=[];
        try{internas=Array.isArray(agendaNotificacoesCache)?agendaNotificacoesCache.slice(0,8):[];}catch(_){}
        const itens=[...aniversarios,...internas.map(n=>({tipo:'agenda',id:n.id,titulo:n.titulo||'Aviso da Agenda',mensagem:n.mensagem||'',lida:!!n.lida,criada_em:n.criada_em}))].slice(0,8);
        if(count){const naoLidas=itens.filter(i=>i.tipo==='aniversario'||!i.lida).length;count.textContent=String(naoLidas);count.hidden=!naoLidas;}
        if(!itens.length){lista.innerHTML='<div class="ks-prof-empty-state compact"><strong>Nenhuma notificação agora</strong><span>Aniversários e avisos da agenda aparecerão aqui.</span></div>';return;}
        lista.innerHTML=itens.map((i,idx)=>`<button type="button" class="ks-prof-notification-item ${i.tipo==='agenda'&&!i.lida?'is-unread':''}" data-index="${idx}" ${i.tipo==='aniversario'?'disabled':''}><span class="ks-prof-notification-dot" aria-hidden="true"></span><span><strong>${escapar(i.titulo)}</strong><small>${escapar(i.mensagem)}</small></span></button>`).join('');
        lista.querySelectorAll('[data-index]').forEach(btn=>{
            const item=itens[Number(btn.dataset.index)];if(!item||item.tipo!=='agenda'||!item.id)return;
            btn.disabled=false;btn.addEventListener('click',()=>{if(typeof abrirNotificacaoAgenda==='function')abrirNotificacaoAgenda(item.id);});
        });
    }

    function alternarMes(){
        const det=document.getElementById('ks_prof_month_details'),toggle=document.getElementById('ks_prof_month_toggle');if(!det||!toggle)return;
        det.hidden=!det.hidden;toggle.setAttribute('aria-expanded',String(!det.hidden));
    }

    function abrirPendencias(){const d=document.getElementById('ks_prof_pendencias_dialog');if(d&&!d.open)d.showModal();}
    function fecharPendencias(){const d=document.getElementById('ks_prof_pendencias_dialog');if(d?.open)d.close();}

    async function atualizar(){
        if(!ehProfissional())return garantirEstrutura();
        if(!garantirEstrutura())return;
        const token=++refreshToken;
        const [pendencias]=await Promise.all([carregarPendenciasProfissional(token),carregarAtendimentosMes(token),carregarNotificacoesHome(token)]);
        if(token!==refreshToken)return;
        renderizarPendencias(pendencias||[]);
    }

    document.addEventListener('kinesys:meu-dia-atualizado',atualizar);
    document.addEventListener('kinesys:tela-ativada',e=>{if(e.detail?.id==='tela_login')refreshToken++;});
    window.KineSysProfessionalHome={refresh:atualizar,limitesMesAtual};
})();
