from pathlib import Path


def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise AssertionError(f'{label}: esperado 1 trecho, encontrado {count}')
    return text.replace(old, new, 1)

# Idempotência do runner temporário.
if 'const AGENDA_GRADE_PASSO_MIN = 10;' in Path('agenda-1.20.0.js').read_text(encoding='utf-8') and 'const JANELA_HOME_MINUTOS = 4 * 60;' in Path('home_fisioterapeuta_util-1.24.0.js').read_text(encoding='utf-8'):
    print('Transformação já aplicada; nada a fazer.')
    raise SystemExit(0)

# -----------------------------------------------------------------------------
# 1) Login: guard de Caps Lock
# -----------------------------------------------------------------------------
path = Path('login_access-1.18.0.js')
s = path.read_text(encoding='utf-8')
old = "el('login_senha').addEventListener('keyup',event=>el('login_caps').hidden=!event.getModifierState('CapsLock'));"
new = """el('login_senha').addEventListener('keyup',event=>{
    const capsAtivo=typeof event.getModifierState==='function' && event.getModifierState('CapsLock');
    el('login_caps').hidden=!capsAtivo;
});"""
s = replace_once(s, old, new, 'guard Caps Lock')
path.write_text(s, encoding='utf-8')

# -----------------------------------------------------------------------------
# 2) Gestão de equipe: mostrar inativos, reativar e enviar recuperação real
# -----------------------------------------------------------------------------
path = Path('script-1.18.0.js')
s = path.read_text(encoding='utf-8')
old_sort = """    const ordenados = data.filter(f => f.ativo !== false).sort((a,b) => {
        const am = normalizarNivelAcessoEquipe(a.tipo) === 'MASTER' ? 0 : 1;
        const bm = normalizarNivelAcessoEquipe(b.tipo) === 'MASTER' ? 0 : 1;
        return am - bm || String(a.nome || '').localeCompare(String(b.nome || ''), 'pt-BR');
    });"""
new_sort = """    const ordenados = data.slice().sort((a,b) => {
        const ai = a.ativo === false ? 1 : 0;
        const bi = b.ativo === false ? 1 : 0;
        const am = normalizarNivelAcessoEquipe(a.tipo) === 'MASTER' ? 0 : 1;
        const bm = normalizarNivelAcessoEquipe(b.tipo) === 'MASTER' ? 0 : 1;
        return ai - bi || am - bm || String(a.nome || '').localeCompare(String(b.nome || ''), 'pt-BR');
    });"""
s = replace_once(s, old_sort, new_sort, 'ordenação equipe com inativos')

old_rows = """    tbody.innerHTML = ordenados.map(f => `<tr>
        <td><strong>${escapeHTML(f.nome)}</strong></td>
        <td>${escapeHTML(f.email)}</td>
        <td>${escapeHTML(rotuloPerfil(normalizarNivelAcessoEquipe(f.tipo)))}</td>
        <td>${escapeHTML(f.registro || (conselhoFuncionarioEquipe(f) === 'SECRETARIA' ? 'Administrativo' : 'Sem registro clínico'))}</td>
        <td>${funcionarioPodeAparecerNaAgenda(f)
            ? '<span class=\"kds-u-ai-center kds-u-gap-5px kds-u-p-3px-7px kds-u-br-999px kds-u-bg-success-soft kds-u-text-success-text kds-u-fs-meta kds-u-fw-800 kds-u-d-inline-flex\">✓ Aparece</span>'
            : '<span class=\"kds-u-ai-center kds-u-gap-5px kds-u-p-3px-7px kds-u-br-999px kds-u-bg-neutral-soft kds-u-text-neutral-text kds-u-fs-meta kds-u-fw-800 kds-u-d-inline-flex\">Não aparece</span>'}</td>
        <td><div class=\"kds-u-gap-6px kds-u-wrap-wrap kds-u-d-flex\">
            <button type=\"button\" class=\"ks-team-action btn-secondary btn-compact\" data-equipe-editar=\"${escapeHTML(f.id)}\">Editar</button>
            <button type=\"button\" class=\"ks-team-action btn-danger btn-compact\" data-equipe-excluir=\"${escapeHTML(f.id)}\">Excluir</button>
        </div></td>
    </tr>`).join('');"""
new_rows = """    tbody.innerHTML = ordenados.map(f => {
        const ativo = f.ativo !== false;
        const status = ativo
            ? '<span class=\"kds-u-ai-center kds-u-gap-5px kds-u-p-3px-7px kds-u-br-999px kds-u-bg-success-soft kds-u-text-success-text kds-u-fs-meta kds-u-fw-800 kds-u-d-inline-flex\">Ativo</span>'
            : '<span class=\"kds-u-ai-center kds-u-gap-5px kds-u-p-3px-7px kds-u-br-999px kds-u-bg-neutral-soft kds-u-text-neutral-text kds-u-fs-meta kds-u-fw-800 kds-u-d-inline-flex\">Inativo</span>';
        const reativar = ativo ? '' : `<button type=\"button\" class=\"ks-team-action btn-primary btn-compact\" data-equipe-reativar=\"${escapeHTML(f.id)}\">Reativar</button>`;
        return `<tr class=\"${ativo ? '' : 'ks-team-row-inactive'}\">
        <td><strong>${escapeHTML(f.nome)}</strong></td>
        <td>${escapeHTML(f.email)}</td>
        <td>${escapeHTML(rotuloPerfil(normalizarNivelAcessoEquipe(f.tipo)))}</td>
        <td>${escapeHTML(f.registro || (conselhoFuncionarioEquipe(f) === 'SECRETARIA' ? 'Administrativo' : 'Sem registro clínico'))}</td>
        <td>${status}</td>
        <td>${funcionarioPodeAparecerNaAgenda(f)
            ? '<span class=\"kds-u-ai-center kds-u-gap-5px kds-u-p-3px-7px kds-u-br-999px kds-u-bg-success-soft kds-u-text-success-text kds-u-fs-meta kds-u-fw-800 kds-u-d-inline-flex\">✓ Aparece</span>'
            : '<span class=\"kds-u-ai-center kds-u-gap-5px kds-u-p-3px-7px kds-u-br-999px kds-u-bg-neutral-soft kds-u-text-neutral-text kds-u-fs-meta kds-u-fw-800 kds-u-d-inline-flex\">Não aparece</span>'}</td>
        <td><div class=\"kds-u-gap-6px kds-u-wrap-wrap kds-u-d-flex\">
            <button type=\"button\" class=\"ks-team-action btn-secondary btn-compact\" data-equipe-editar=\"${escapeHTML(f.id)}\">Editar</button>
            ${reativar}
            <button type=\"button\" class=\"ks-team-action btn-secondary btn-compact\" data-equipe-redefinir=\"${escapeHTML(f.id)}\">Redefinir acesso</button>
            <button type=\"button\" class=\"ks-team-action btn-danger btn-compact\" data-equipe-excluir=\"${escapeHTML(f.id)}\">Excluir</button>
        </div></td>
    </tr>`;
    }).join('');"""
s = replace_once(s, old_rows, new_rows, 'linhas equipe')

old_events = """            const editar = e.target.closest('[data-equipe-editar]');
            if (editar) { abrirEdicaoFuncionario(editar.dataset.equipeEditar); return; }
            const excluir = e.target.closest('[data-equipe-excluir]');
            if (excluir) excluirFuncionario(excluir.dataset.equipeExcluir);"""
new_events = """            const editar = e.target.closest('[data-equipe-editar]');
            if (editar) { abrirEdicaoFuncionario(editar.dataset.equipeEditar); return; }
            const reativar = e.target.closest('[data-equipe-reativar]');
            if (reativar) { reativarFuncionario(reativar.dataset.equipeReativar); return; }
            const redefinir = e.target.closest('[data-equipe-redefinir]');
            if (redefinir) { enviarRedefinicaoAcessoFuncionario(redefinir.dataset.equipeRedefinir); return; }
            const excluir = e.target.closest('[data-equipe-excluir]');
            if (excluir) excluirFuncionario(excluir.dataset.equipeExcluir);"""
s = replace_once(s, old_events, new_events, 'eventos equipe')

marker = "\nasync function excluirFuncionario(id) {"
functions = r'''
async function reativarFuncionario(id) {
    if (!usuarioEhMaster()) { alert('Apenas Administrador pode reativar usuários.'); return false; }
    if (!_supabase) { alert('Servidor indisponível. Nenhum cadastro foi alterado.'); return false; }
    try {
        const { data: cadastro, error: leituraError } = await _supabase.from('equipe').select('id,nome,email,ativo').eq('id', id).maybeSingle();
        if (leituraError) throw leituraError;
        if (!cadastro) throw new Error('Funcionário não encontrado ou sem permissão.');
        if (cadastro.ativo !== false) { await carregarListaEquipe(); return true; }
        const confirmado = await confirmarKineSys(
            `Reativar o acesso de ${cadastro.nome || 'este usuário'}? O perfil voltará a aparecer entre os usuários ativos. A senha da conta não será alterada.`,
            { titulo:'Reativar usuário', confirmar:'Reativar acesso', cancelar:'Cancelar' }
        );
        if (!confirmirmado) return false;
        const { data, error } = await _supabase.from('equipe').update({ ativo:true }).eq('id', id).select('id');
        if (error) throw error;
        if (data?.length !== 1) throw new Error('O banco não confirmou a reativação.');
        await carregarListaEquipe();
        if (typeof carregarProfissionaisAgenda === 'function') await carregarProfissionaisAgenda();
        alert('✅ Perfil reativado. Se a senha não for conhecida, use “Redefinir acesso”.');
        return true;
    } catch (err) {
        console.error('KineSys: falha ao reativar funcionário:', err);
        alert('Não foi possível reativar o usuário. ' + (err?.message || String(err)));
        return false;
    }
}

async function enviarRedefinicaoAcessoFuncionario(id) {
    if (!usuarioEhMaster()) { alert('Apenas Administrador pode iniciar a recuperação de acesso da equipe.'); return false; }
    if (!_supabase) { alert('Servidor indisponível. Nenhum e-mail foi enviado.'); return false; }
    try {
        const { data: cadastro, error: leituraError } = await _supabase.from('equipe').select('id,nome,email,ativo').eq('id', id).maybeSingle();
        if (leituraError) throw leituraError;
        if (!cadastro?.email) throw new Error('Este perfil não possui e-mail de acesso válido.');
        const confirmado = await confirmarKineSys(
            `Enviar um link de redefinição de senha para ${cadastro.nome || 'este usuário'}?\n\nO link será enviado para ${cadastro.email}. A senha atual não é exibida nem alterada pelo administrador.`,
            { titulo:'Redefinir acesso', confirmar:'Enviar link', cancelar:'Cancelar' }
        );
        if (!confirmado) return false;
        const redirectTo = new URL(location.pathname, location.origin);
        redirectTo.searchParams.set('recuperar', '1');
        const { error } = await _supabase.auth.resetPasswordForEmail(String(cadastro.email).trim().toLowerCase(), { redirectTo: redirectTo.href });
        if (error) throw error;
        alert(`✅ Link de redefinição enviado para ${cadastro.email}. O usuário deve abrir o e-mail e criar a nova senha.`);
        return true;
    } catch (err) {
        console.error('KineSys: falha ao enviar redefinição de acesso:', err);
        alert('Não foi possível enviar o link de redefinição. ' + (err?.message || String(err)));
        return false;
    }
}
'''
# Corrige typo deliberadamente antes de inserir.
functions = functions.replace('confirmirmado', 'confirmado')
if marker not in s:
    raise AssertionError('marcador excluirFuncionario ausente')
s = s.replace(marker, '\n' + functions + marker, 1)
path.write_text(s, encoding='utf-8')

# -----------------------------------------------------------------------------
# 3) Meu dia clínico: janela móvel de 4 horas + livres + estados operacionais
# -----------------------------------------------------------------------------
path = Path('home_fisioterapeuta_util-1.24.0.js')
s = path.read_text(encoding='utf-8')
s = replace_once(s, "    const LIMITE_COMPACTO = 3;", "    const JANELA_HOME_MINUTOS = 4 * 60;\n    let contextoAgendaHomeFisioterapeuta = null;", 'constante janela home')

old_situacao = """    function situacaoTemporal(agendamento,agoraMin,ehProximo){
        const status=String(agendamento?.status||'').toLowerCase();
        if(STATUS_AUSENCIA.has(status)) return {rotulo:'Falta',classe:'is-absence'};
        if(status==='em_recepcao') return {rotulo:'Recepção',classe:'is-current'};
        const inicio=horaMinutos(agendamento?.hora_inicio);
        const fim=horaMinutos(agendamento?.hora_fim);
        if(!STATUS_CONCLUIDOS.has(status) && inicio!==null && agoraMin>=inicio && agoraMin<=(fim!==null?fim:inicio+60)) return {rotulo:'Agora',classe:'is-current'};
        if(STATUS_CONCLUIDOS.has(status)) return {rotulo:'Concluído',classe:'is-done'};
        if(ehProximo) return {rotulo:'Próximo',classe:'is-next'};
        if(inicio!==null && inicio<agoraMin) return {rotulo:'Passado',classe:'is-past'};
        return {rotulo:'Hoje',classe:'is-upcoming'};
    }"""
new_situacao = r'''    function instanteHomeBrasilia(agora=new Date()){
        const partes=Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(agora).map(p=>[p.type,p.value]));
        return {data:`${partes.year}-${partes.month}-${partes.day}`,hora:`${partes.hour}:${partes.minute}`,minutos:Number(partes.hour)*60+Number(partes.minute)};
    }

    function agendamentoEhReagendadoHome(agendamento){
        return /reagendamento\s+do\s+atendimento/i.test(String(agendamento?.observacoes||''));
    }

    function situacaoTemporal(agendamento,agoraMin){
        const status=String(agendamento?.status||'').toLowerCase();
        if(status==='cancelado') return {rotulo:'Cancelado',classe:'is-cancelled'};
        if(agendamentoEhReagendadoHome(agendamento)) return {rotulo:'Remarcado',classe:'is-rescheduled'};
        if(status==='falta_justificada'||status==='faltou') return {rotulo:'Falta justificada',classe:'is-absence'};
        if(status==='falta_nao_justificada') return {rotulo:'Falta não justificada',classe:'is-absence'};
        if(STATUS_CONCLUIDOS.has(status)) return {rotulo:'Atendimento concluído',classe:'is-done'};
        if(status==='em_recepcao') return {rotulo:'A ser atendido',classe:'is-waiting'};
        const inicio=horaMinutos(agendamento?.hora_inicio);
        const fim=horaMinutos(agendamento?.hora_fim);
        if(inicio!==null && agoraMin>=inicio && agoraMin<(fim!==null?fim:inicio+60)) return {rotulo:'Em atendimento',classe:'is-current'};
        return {rotulo:'A ser atendido',classe:'is-upcoming'};
    }

    function diaSemanaISOHome(dataISO){
        const [a,m,d]=String(dataISO||'').split('-').map(Number);
        return Number.isFinite(a)&&Number.isFinite(m)&&Number.isFinite(d) ? new Date(a,m-1,d).getDay() : new Date().getDay();
    }

    function intersectarJanelasHome(gerais,especificas){
        const out=[];
        (gerais||[]).forEach(g=>{
            const gi=horaMinutos(g.hora_inicio), gf=horaMinutos(g.hora_fim);
            (especificas||[]).forEach(e=>{
                const ei=horaMinutos(e.hora_inicio), ef=horaMinutos(e.hora_fim);
                const inicio=Math.max(gi,ei),fim=Math.min(gf,ef);
                if(Number.isFinite(inicio)&&Number.isFinite(fim)&&inicio<fim) out.push({inicio,fim});
            });
        });
        return out;
    }

    function janelasAtendimentoHome(dataISO,profissionalId){
        const horarios=Array.isArray(contextoAgendaHomeFisioterapeuta?.horarios)?contextoAgendaHomeFisioterapeuta.horarios:[];
        const dia=diaSemanaISOHome(dataISO), pid=String(profissionalId||'');
        const gerais=horarios.filter(h=>Number(h.dia_semana)===dia&&!h.profissional_id).map(h=>({inicio:horaMinutos(h.hora_inicio),fim:horaMinutos(h.hora_fim)})).filter(j=>Number.isFinite(j.inicio)&&Number.isFinite(j.fim)&&j.inicio<j.fim);
        const todas=horarios.filter(h=>String(h.profissional_id||'')===pid);
        if(!todas.length) return gerais;
        const especificas=todas.filter(h=>Number(h.dia_semana)===dia);
        if(!especificas.length) return [];
        return intersectarJanelasHome(
            gerais.map(j=>({hora_inicio:minutosHoraHome(j.inicio),hora_fim:minutosHoraHome(j.fim)})),
            especificas
        );
    }

    function minutosHoraHome(minutos){
        const m=Math.max(0,Math.min(1439,Math.round(Number(minutos)||0)));
        return `${String(Math.floor(m/60)).padStart(2,'0')}:${String(m%60).padStart(2,'0')}`;
    }

    function bloqueiosAtendimentoHome(dataISO,profissionalId){
        const bloqueios=Array.isArray(contextoAgendaHomeFisioterapeuta?.bloqueios)?contextoAgendaHomeFisioterapeuta.bloqueios:[];
        return bloqueios.filter(b=>String(b.data||'')===String(dataISO)&&(!b.profissional_id||String(b.profissional_id)===String(profissionalId))).map(b=>({
            inicio:b.hora_inicio?horaMinutos(b.hora_inicio):0,
            fim:b.hora_fim?horaMinutos(b.hora_fim):24*60
        })).filter(x=>Number.isFinite(x.inicio)&&Number.isFinite(x.fim)&&x.inicio<x.fim);
    }

    function statusOcupaHorarioHome(status){
        return ['pre_agendado','agendado','confirmado','em_recepcao'].includes(String(status||'').toLowerCase());
    }

    function intervalosLivresHome(dataISO,profissionalId,inicioJanela,fimJanela,atendimentos){
        const janelas=janelasAtendimentoHome(dataISO,profissionalId);
        const bloqueios=bloqueiosAtendimentoHome(dataISO,profissionalId);
        const ocupados=(atendimentos||[]).filter(a=>statusOcupaHorarioHome(a.status)).map(a=>({
            inicio:horaMinutos(a.hora_inicio),fim:horaMinutos(a.hora_fim)
        })).filter(x=>Number.isFinite(x.inicio)&&Number.isFinite(x.fim)&&x.inicio<x.fim);
        const indisponiveis=[...bloqueios,...ocupados].sort((a,b)=>a.inicio-b.inicio);
        const livres=[];
        janelas.forEach(j=>{
            const inicio=Math.max(j.inicio,inicioJanela),fim=Math.min(j.fim,fimJanela);
            if(inicio>=fim)return;
            let cursor=inicio;
            indisponiveis.forEach(b=>{
                if(b.fim<=cursor||b.inicio>=fim)return;
                if(b.inicio>cursor)livres.push({inicio:cursor,fim:Math.min(b.inicio,fim)});
                cursor=Math.max(cursor,Math.min(b.fim,fim));
            });
            if(cursor<fim)livres.push({inicio:cursor,fim});
        });
        return livres.filter(x=>x.fim-x.inicio>=10);
    }'''
s = replace_once(s, old_situacao, new_situacao, 'situação temporal home')

start = s.index('    function prepararCabecalho(card,total=0){')
end = s.index('\n    async function carregarHistoricoAgenda', start)
new_render_helpers = r'''    function prepararCabecalho(card,total=0){
        card.classList.add('ks-fisio-util','ks-fisio-util-compact');
        card.classList.remove('is-expanded');
        const eyebrow=card.querySelector('.eyebrow');
        if(eyebrow) eyebrow.textContent='ROTINA CLÍNICA';
        const titulo=document.getElementById('painel_fisio_titulo');
        if(titulo) titulo.textContent='Meu dia clínico';
        const resumo=document.getElementById('painel_fisio_resumo');
        if(resumo){resumo.setAttribute('role','status');resumo.setAttribute('aria-live','polite');}
        const header=card.querySelector('.card-header');
        if(!header)return;
        let actions=header.querySelector('.ks-fisio-header-actions');
        if(!actions){actions=document.createElement('div');actions.className='ks-fisio-header-actions';header.appendChild(actions);}
        const original=Array.from(header.children).find(el=>el.tagName==='BUTTON');
        if(original){original.textContent='Atualizar';actions.appendChild(original);}
        let agenda=actions.querySelector('[data-ks-fisio-agenda]');
        if(!agenda){agenda=criarBotao('Agenda','btn-secondary',()=>{if(typeof navegarPara==='function')navegarPara('tela_agenda');});agenda.dataset.ksFisioAgenda='1';actions.prepend(agenda);}
        const toggle=actions.querySelector('[data-ks-fisio-toggle]');
        if(toggle)toggle.remove();
        card.dataset.ksTotal=String(total||0);
    }

    function montarLinha(item){
        const {agendamento,paciente,nome,clinica,situacao,registroPendente}=item;
        const row=document.createElement('article');
        row.className=`ks-fisio-day-row ${situacao.classe}${registroPendente?' has-record-pending':''}`;
        row.dataset.agendamentoId=String(agendamento.id||'');
        const time=document.createElement('div');time.className='ks-fisio-day-time';
        const horario=document.createElement('strong');horario.textContent=String(agendamento.hora_inicio||'').slice(0,5)||'—';
        const badge=document.createElement('span');badge.className='ks-fisio-day-status';badge.textContent=situacao.rotulo;time.append(horario,badge);
        const content=document.createElement('div');content.className='ks-fisio-day-content';
        const patientName=document.createElement('strong');patientName.className='ks-fisio-day-patient-name';patientName.textContent=nome;
        const category=document.createElement('div');category.className='ks-fisio-day-category';category.textContent=clinica.rotuloSessao;
        const detail=document.createElement('p');detail.className='ks-fisio-day-detail';detail.textContent=clinica.detalhe;content.append(patientName,category,detail);
        const actions=document.createElement('div');actions.className='ks-fisio-day-actions';
        const status=String(agendamento.status||'').toLowerCase();
        const bloqueiaAcao=STATUS_AUSENCIA.has(status)||status==='cancelado';
        if(!bloqueiaAcao){
            const modoDestino=clinica.familia==='avaliacao'?'avaliacao':'evolucao';
            const labelDestino=modoDestino==='avaliacao'?'Avaliação':'Evolução';
            actions.appendChild(criarBotao(labelDestino,'btn-primary',()=>abrirRegistroClinico(agendamento.paciente_id,modoDestino,agendamento.id)));
            if(clinica.registroHoje){const done=document.createElement('span');done.className='ks-fisio-record-done';done.textContent='Registro concluído';actions.appendChild(done);}
        }
        if(!paciente)row.classList.add('has-missing-record');
        row.append(time,content,actions);return row;
    }

    function montarLinhaLivre(intervalo){
        const row=document.createElement('article');row.className='ks-fisio-day-row is-free';
        const time=document.createElement('div');time.className='ks-fisio-day-time';
        const horario=document.createElement('strong');horario.textContent=minutosHoraHome(intervalo.inicio);
        const badge=document.createElement('span');badge.className='ks-fisio-day-status';badge.textContent='Livre';time.append(horario,badge);
        const content=document.createElement('div');content.className='ks-fisio-day-content';
        const nome=document.createElement('strong');nome.className='ks-fisio-day-patient-name';nome.textContent='Horário livre';
        const faixa=document.createElement('div');faixa.className='ks-fisio-day-category';faixa.textContent=`${minutosHoraHome(intervalo.inicio)}–${minutosHoraHome(intervalo.fim)}`;
        const detalhe=document.createElement('p');detalhe.className='ks-fisio-day-detail';detalhe.textContent='Disponível para novo agendamento';content.append(nome,faixa,detalhe);
        const actions=document.createElement('div');actions.className='ks-fisio-day-actions';row.append(time,content,actions);return row;
    }
'''
s = s[:start] + new_render_helpers + s[end:]

old_context_line = """        const {data:contexto,error}=await _supabase.rpc('kinesys_contexto_agenda');
        if(error) throw error;"""
new_context_line = """        const {data:contexto,error}=await _supabase.rpc('kinesys_contexto_agenda');
        if(error) throw error;
        contextoAgendaHomeFisioterapeuta=contexto||null;"""
s = replace_once(s, old_context_line, new_context_line, 'cache contexto agenda home')

start = s.index('    async function carregarPainelFisioterapeutaUtil(){')
end = s.index('\n    window.carregarPainelFisioterapeuta=', start)
new_panel = r'''    async function carregarPainelFisioterapeutaUtil(){
        const card=document.getElementById('card_painel_fisioterapeuta');
        if(!card)return;
        const eh=perfilFisioterapeuta();card.hidden=!eh;if(!eh)return;
        prepararCabecalho(card,0);
        const resumo=document.getElementById('painel_fisio_resumo'),lista=document.getElementById('painel_fisio_lista');
        if(!resumo||!lista)return;
        lista.replaceChildren();resumo.textContent='Organizando as próximas 4 horas…';
        if(typeof _supabase==='undefined'||!_supabase){resumo.textContent='Não foi possível acessar sua agenda agora.';return;}

        const perfilInicial=typeof usuarioLogado!=='undefined'?usuarioLogado:null;
        let profissionalId='';
        try{profissionalId=await resolverProfissionalHomeFisioterapeuta(perfilInicial);}catch(_){
            if((typeof usuarioLogado!=='undefined'?usuarioLogado:null)===perfilInicial)resumo.textContent='Não foi possível verificar seu vínculo com a agenda.';return;
        }
        if((typeof usuarioLogado!=='undefined'?usuarioLogado:null)!==perfilInicial)return;
        if(!profissionalId){resumo.textContent='Vincule seu perfil a um profissional da agenda para ver o seu dia clínico.';return;}

        const agora=instanteHomeBrasilia(),hoje=agora.data,inicioJanela=agora.minutos,fimJanela=Math.min(24*60,inicioJanela+JANELA_HOME_MINUTOS);
        let consulta=await _supabase.from('agendamentos')
            .select('id,paciente_id,procedimento_id,hora_inicio,hora_fim,status,observacoes,pacientes(id,nome),procedimentos(nome,duracao_minutos)')
            .eq('data',hoje).eq('profissional_id',profissionalId).order('hora_inicio');
        if(consulta.error&&/procedimentos|hora_fim|observacoes|relationship|schema cache/i.test(String(consulta.error.message||''))){
            consulta=await _supabase.from('agendamentos')
                .select('id,paciente_id,procedimento_id,hora_inicio,hora_fim,status,observacoes,pacientes(id,nome)')
                .eq('data',hoje).eq('profissional_id',profissionalId).order('hora_inicio');
        }
        if(consulta.error){resumo.textContent='Não foi possível carregar seus atendimentos agora.';return;}

        const atendimentosHoje=consulta.data||[];
        const atendimentos=atendimentosHoje.filter(a=>{
            const inicio=horaMinutos(a.hora_inicio),fim=horaMinutos(a.hora_fim);
            if(!Number.isFinite(inicio))return false;
            const termino=Number.isFinite(fim)&&fim>inicio?fim:inicio+30;
            return termino>inicioJanela&&inicio<fimJanela;
        });
        let pacientes=[];try{pacientes=typeof obterPacientesSalvos==='function'?await obterPacientesSalvos():[];}catch(_){}
        const mapaPacientes=new Map((pacientes||[]).map(p=>[String(p.id||''),p]));
        const historico=await carregarHistoricoAgenda(atendimentos,hoje,profissionalId);
        let concluidos=0,registrosPendentes=0,emAtendimento=0;
        const itens=atendimentos.map(a=>{
            const status=String(a.status||'').toLowerCase();if(STATUS_CONCLUIDOS.has(status))concluidos++;
            const paciente=mapaPacientes.get(String(a.paciente_id||'')),seq=sequenciaDoAtendimento(a,historico,hoje);
            let clinica=contextoClinico(paciente,a,hoje,seq),situacao=situacaoTemporal(a,inicioJanela);
            if(situacao.classe==='is-current')emAtendimento++;
            if(status==='cancelado')clinica={...clinica,detalhe:'Atendimento cancelado · horário liberado'};
            else if(agendamentoEhReagendadoHome(a))clinica={...clinica,detalhe:'Atendimento remarcado para este horário'};
            else if(status==='em_recepcao')clinica={...clinica,detalhe:'Paciente em espera na recepção'};
            const registroPendente=STATUS_CONCLUIDOS.has(status)&&!clinica.registroHoje;
            if(registroPendente)registrosPendentes++;
            return {tipo:'atendimento',inicio:horaMinutos(a.hora_inicio),agendamento:a,paciente,nome:String(a.pacientes?.nome||paciente?.nome||'Paciente'),clinica,situacao,registroPendente};
        });
        const livres=intervalosLivresHome(hoje,profissionalId,inicioJanela,fimJanela,atendimentosHoje).map(x=>({tipo:'livre',inicio:x.inicio,intervalo:x}));
        const timeline=[...itens,...livres].sort((a,b)=>a.inicio-b.inicio||(a.tipo==='atendimento'?-1:1));
        prepararCabecalho(card,timeline.length);

        if(!timeline.length){
            resumo.textContent='Próximas 4 horas · sem atendimentos ou horários disponíveis na sua jornada.';
            const empty=document.createElement('div');empty.className='ks-fisio-painel-vazio';empty.textContent='Não há atividade clínica disponível nesta janela. Abra a Agenda para consultar outros horários.';lista.appendChild(empty);return;
        }
        timeline.forEach(item=>lista.appendChild(item.tipo==='livre'?montarLinhaLivre(item.intervalo):montarLinha(item)));
        const partes=['Próximas 4 horas',`${itens.length} atendimento(s)`,`${livres.length} horário(s) livre(s)`];
        if(emAtendimento)partes.push(`${emAtendimento} em atendimento`);
        if(concluidos)partes.push(`${concluidos} concluído(s)`);
        if(registrosPendentes)partes.push(`${registrosPendentes} registro(s) pendente(s)`);
        resumo.textContent=partes.join(' · ');
    }
'''
s = s[:start] + new_panel + s[end:]
path.write_text(s, encoding='utf-8')

# -----------------------------------------------------------------------------
# 4) Agenda: escala visual de 10 min e marcador de horário coerente
# -----------------------------------------------------------------------------
path = Path('agenda-1.20.0.js')
s = path.read_text(encoding='utf-8')
insert_after = "let agendaExcecaoJornadaPromptadaChaveModal = '';"
s = replace_once(s, insert_after, insert_after + "\nconst AGENDA_GRADE_PASSO_MIN = 10;", 'passo agenda')
s = replace_once(s, "function posicaoMarcadorAgenda(agora, dias, inicio, fim, passo=30) {", "function posicaoMarcadorAgenda(agora, dias, inicio, fim, passo=AGENDA_GRADE_PASSO_MIN) {", 'passo marcador')
render_start = s.index('function renderizarGradeSemanal(inicio, fim, profissionalFiltro) {')
render_end = s.index('\nasync function renderizarPainelAgenda', render_start)
render = s[render_start:render_end]
render = replace_once(render, '    const passo = 30;', '    const passo = AGENDA_GRADE_PASSO_MIN;', 'passo grade')
render = replace_once(render, "        eixo.className = 'agenda-hora-eixo';", "        const restoHora=((minuto%60)+60)%60;\n        const classeLinha=restoHora===0?'hora-cheia':(restoHora===30?'meia-hora':'subhora');\n        eixo.className = 'agenda-hora-eixo ' + classeLinha;", 'classe eixo temporal')
old_cell = "            cell.className = 'agenda-celula ' + (r % 2 ? 'meia-hora ' : '') + (feriado ? 'feriado bloqueado' : bloq ? 'bloqueado' : dentro ? 'atendimento' : 'fora-atendimento');"
new_cell = "            cell.className = 'agenda-celula ' + classeLinha + ' ' + (feriado ? 'feriado bloqueado' : bloq ? 'bloqueado' : dentro ? 'atendimento' : 'fora-atendimento');"
render = replace_once(render, old_cell, new_cell, 'classe célula temporal')
s = s[:render_start] + render + s[render_end:]
path.write_text(s, encoding='utf-8')

# -----------------------------------------------------------------------------
# 5) Design Agenda/Home: overrides finais, só apresentação
# -----------------------------------------------------------------------------
path = Path('design_agenda.css')
s = path.read_text(encoding='utf-8')
append_css = r'''

/* ============================================================================
   Agenda compacta proporcional — 10 min = 1 unidade visual
   Mantém a escala temporal real; a altura total se adapta ao viewport desktop.
   ========================================================================== */
@media (min-width:761px){
  #tela_agenda .agenda-card-semanal{padding:10px}
  #tela_agenda .agenda-visoes{gap:6px;padding:8px 12px}
  #tela_agenda .agenda-toolbar-semanal{gap:8px;margin-bottom:4px}
  #tela_agenda .agenda-toolbar-filtros{gap:7px}
  #tela_agenda .agenda-grade-scroll{
    height:clamp(340px,calc(100dvh - 280px),620px);
    max-height:none;
    overflow-y:hidden;
  }
  #tela_agenda .agenda-semana-grade{
    --kds-agenda-header-height:42px;
    height:100%;
    grid-template-rows:var(--kds-agenda-header-height) repeat(var(--kds-agenda-runtime-slot-count),minmax(3px,1fr));
  }
  #tela_agenda .agenda-dia-cabecalho{padding:4px 3px}
  #tela_agenda .agenda-celula,
  #tela_agenda .agenda-hora-eixo{min-height:0}
  #tela_agenda .agenda-compromisso{min-height:0;padding:0 4px;border-radius:4px}
  #tela_agenda .agenda-hora-eixo{padding:0 6px 0 0;border-top-color:transparent;overflow:visible}
  #tela_agenda .agenda-hora-eixo.hora-cheia{border-top-color:var(--kds-line)}
  #tela_agenda .agenda-hora-eixo.meia-hora{border-top:1px dashed var(--kds-line-soft)}
  #tela_agenda .agenda-celula.subhora{border-top-color:#F4F7F6}
  #tela_agenda .agenda-celula.meia-hora{border-top:1px dashed #E8EFED}
  #tela_agenda .agenda-celula.hora-cheia{border-top:1px solid var(--kds-line)}
}

#tela_agenda .agenda-agora-linha{
  z-index:9;
  border-top-width:2px;
  border-top-color:var(--kds-accent);
  filter:drop-shadow(0 1px 1px rgba(23,59,69,.18));
}
#tela_agenda .agenda-agora-linha::before{width:10px;height:10px;left:-5px;top:-6px}
#tela_agenda .agenda-agora-linha span{
  top:-22px;
  padding:2px 6px;
  border-color:var(--kds-accent);
  background:var(--kds-accent);
  color:var(--kds-surface);
  font-weight:850;
}
'''
if 'Agenda compacta proporcional — 10 min = 1 unidade visual' in s:
    raise AssertionError('CSS agenda já contém override novo')
s += append_css
path.write_text(s, encoding='utf-8')

path = Path('home_fisioterapeuta_util-1.24.0.css')
s = path.read_text(encoding='utf-8')
append_home_css = r'''

/* Meu dia clínico — estados operacionais da janela móvel de 4 horas */
#card_painel_fisioterapeuta.ks-fisio-util-compact .ks-fisio-day-row.is-free{
  background:var(--kds-surface-soft);
  box-shadow:inset 3px 0 0 var(--kds-line);
}
#card_painel_fisioterapeuta.ks-fisio-util-compact .is-free .ks-fisio-day-status,
#card_painel_fisioterapeuta.ks-fisio-util-compact .is-free .ks-fisio-day-patient-name{color:var(--kds-muted)}
#card_painel_fisioterapeuta.ks-fisio-util-compact .ks-fisio-day-row.is-cancelled{
  opacity:.7;
  background:var(--kds-danger-soft);
  box-shadow:inset 3px 0 0 var(--kds-danger-line-strong);
}
#card_painel_fisioterapeuta.ks-fisio-util-compact .is-cancelled .ks-fisio-day-status{color:var(--kds-danger)}
#card_painel_fisioterapeuta.ks-fisio-util-compact .ks-fisio-day-row.is-rescheduled{
  background:var(--kds-warning-soft);
  box-shadow:inset 3px 0 0 var(--kds-warning);
}
#card_painel_fisioterapeuta.ks-fisio-util-compact .is-rescheduled .ks-fisio-day-status{color:var(--kds-warning)}
#card_painel_fisioterapeuta.ks-fisio-util-compact .ks-fisio-day-row.is-waiting{background:var(--kds-surface-soft)}
#card_painel_fisioterapeuta.ks-fisio-util-compact .is-waiting .ks-fisio-day-status{color:var(--kds-accent)}
'''
if 'Meu dia clínico — estados operacionais da janela móvel de 4 horas' in s:
    raise AssertionError('CSS home já contém estados novos')
s += append_home_css
path.write_text(s, encoding='utf-8')

# -----------------------------------------------------------------------------
# 6) HTML + cache busting + tabela de equipe
# -----------------------------------------------------------------------------
path = Path('index.html')
s = path.read_text(encoding='utf-8')
s = replace_once(s, '<link rel="stylesheet" href="design_agenda.css">', '<link rel="stylesheet" href="design_agenda.css?v=20260910-compact-r1">', 'cache CSS agenda')
s = replace_once(s, '<link rel="stylesheet" href="home_fisioterapeuta_util-1.24.0.css?v=20260909-r1">', '<link rel="stylesheet" href="home_fisioterapeuta_util-1.24.0.css?v=20260909-r1&home4h=20260910-r1">', 'cache CSS home')
s = replace_once(s, '<script defer src="script-1.18.0.js?v=20260910-hma-perf-r3&patient_self_service=20260910-r1"></script>', '<script defer src="script-1.18.0.js?v=20260910-hma-perf-r3&patient_self_service=20260910-r1&access_admin=20260910-r1"></script>', 'cache script')
s = replace_once(s, '<script defer src="screen_loader-1.25.0.js?v=20260910-phase4d-r1&agenda_edit=20260910-r1"></script>', '<script defer src="screen_loader-1.25.0.js?v=20260910-phase4d-r1&agenda_edit=20260910-r1&agenda_compact=20260910-r1"></script>', 'cache loader')
s = replace_once(s, '<script defer src="login_access-1.18.0.js"></script>', '<script defer src="login_access-1.18.0.js?v=20260910-access-r1"></script>', 'cache login')
s = replace_once(s, '<script defer src="home_fisioterapeuta_util-1.24.0.js?v=20260910-r3&fisio_home=20260910-r1"></script>', '<script defer src="home_fisioterapeuta_util-1.24.0.js?v=20260910-r3&fisio_home=20260910-r1&home4h=20260910-r1"></script>', 'cache home')
old_head = """                            <th>Perfil</th>
                            <th>Registro</th>
                            <th>Na Agenda</th>
                            <th>Ação</th>"""
new_head = """                            <th>Perfil</th>
                            <th>Registro</th>
                            <th>Status</th>
                            <th>Na Agenda</th>
                            <th>Ação</th>"""
s = replace_once(s, old_head, new_head, 'cabeçalho status equipe')
s = replace_once(s, '<tr><td colspan="6" class="kds-u-ta-center">Nenhum funcionário cadastrado.</td></tr>', '<tr><td colspan="7" class="kds-u-ta-center">Nenhum funcionário cadastrado.</td></tr>', 'colspan equipe')
old_actions = """                <div class="actions">
                    <button class="btn-primary" id="eq_btn_salvar" type="button" onclick="cadastrarNovoFuncionario()">Cadastrar funcionário</button>
                </div>"""
new_actions = """                <div class="actions">
                    <button class="btn-primary" id="eq_btn_salvar" type="button" onclick="cadastrarNovoFuncionario()">Cadastrar funcionário</button>
                </div>
                <p class="field-help"><strong>Acesso:</strong> editar nome, e-mail ou função não troca a senha da conta. Para recuperar a credencial real do Supabase Auth, use <strong>Redefinir acesso</strong> na lista abaixo. Perfis inativos permanecem visíveis e podem ser reativados pelo KineSys.</p>"""
s = replace_once(s, old_actions, new_actions, 'ajuda acesso equipe')
path.write_text(s, encoding='utf-8')

# -----------------------------------------------------------------------------
# 7) Screen loader: cache da Agenda lazy sem eager-load
# -----------------------------------------------------------------------------
path = Path('screen_loader-1.25.0.js')
s = path.read_text(encoding='utf-8')
s = replace_once(s, "'agenda-1.20.0.js?v=20260910-agenda-edit-r1'", "'agenda-1.20.0.js?v=20260910-agenda-edit-r1&compact_time=20260910-r1'", 'cache agenda lazy')
path.write_text(s, encoding='utf-8')

# -----------------------------------------------------------------------------
# 8) Contrato permanente
# -----------------------------------------------------------------------------
path = Path('tests/access_agenda_home4h.contract.js')
path.write_text(r''''use strict';
const fs=require('fs');
const assert=require('assert');

const login=fs.readFileSync('login_access-1.18.0.js','utf8');
const script=fs.readFileSync('script-1.18.0.js','utf8');
const agenda=fs.readFileSync('agenda-1.20.0.js','utf8');
const agendaCss=fs.readFileSync('design_agenda.css','utf8');
const home=fs.readFileSync('home_fisioterapeuta_util-1.24.0.js','utf8');
const homeCss=fs.readFileSync('home_fisioterapeuta_util-1.24.0.css','utf8');
const html=fs.readFileSync('index.html','utf8');
const loader=fs.readFileSync('screen_loader-1.25.0.js','utf8');

function bloco(texto,inicio,fim){const a=texto.indexOf(inicio);assert.ok(a>=0,`ausente: ${inicio}`);const b=texto.indexOf(fim,a);assert.ok(b>a,`fim ausente: ${fim}`);return texto.slice(a,b);}

// Login e administração de acesso.
assert.match(login,/typeof event\.getModifierState==='function'/,'Caps Lock deve tolerar eventos sem getModifierState');
const equipe=bloco(script,'async function carregarListaEquipe','async function excluirFuncionario');
assert.doesNotMatch(equipe,/data\.filter\(f => f\.ativo !== false\)/,'Perfis inativos não podem desaparecer da administração');
assert.match(equipe,/data-equipe-reativar/,'Lista deve permitir reativar perfil inativo');
assert.match(equipe,/data-equipe-redefinir/,'Lista deve permitir recuperar acesso');
assert.match(equipe,/resetPasswordForEmail/,'Redefinição deve atingir a credencial real do Supabase Auth');
assert.match(equipe,/update\(\{ ativo:true \}\)/,'Reativação deve preservar cadastro e apenas reabrir o perfil');
assert.match(html,/<th>Status<\/th>/,'Tabela deve mostrar status do perfil');
assert.match(html,/editar nome, e-mail ou função não troca a senha/,'UI deve explicar que editar cadastro não redefine senha');

// Agenda proporcional.
assert.match(agenda,/const AGENDA_GRADE_PASSO_MIN = 10;/,'Escala da grade deve ser de 10 minutos');
assert.match(agenda,/const passo = AGENDA_GRADE_PASSO_MIN;/,'Renderização deve usar o passo proporcional');
assert.match(agenda,/passo=AGENDA_GRADE_PASSO_MIN/,'Marcador Agora deve usar a mesma escala temporal');
assert.match(agenda,/restoHora===0\?'hora-cheia':\(restoHora===30\?'meia-hora':'subhora'\)/,'Grade deve manter hierarquia visual horária');
assert.match(agendaCss,/Agenda compacta proporcional — 10 min = 1 unidade visual/,'CSS compacto deve estar presente');
assert.match(agendaCss,/height:clamp\(340px,calc\(100dvh - 280px\),620px\)/,'Grade desktop deve se adaptar à altura disponível');
assert.match(agendaCss,/grid-template-rows:var\(--kds-agenda-header-height\) repeat\(var\(--kds-agenda-runtime-slot-count\),minmax\(3px,1fr\)\)/,'Slots devem dividir a altura disponível');
assert.match(agendaCss,/\.agenda-agora-linha\{[\s\S]*z-index:9/,'Linha Agora deve ficar destacada acima dos compromissos');
assert.match(loader,/agenda-1\.20\.0\.js\?v=20260910-agenda-edit-r1&compact_time=20260910-r1/,'Agenda lazy deve invalidar cache');
assert.doesNotMatch(html,/<script[^>]+agenda-1\.20\.0\.js/i,'Agenda deve continuar lazy');

// Meu dia clínico: somente janela seguinte de 4h, com estados e lacunas livres.
assert.match(home,/const JANELA_HOME_MINUTOS = 4 \* 60;/,'Home deve limitar a janela a quatro horas');
assert.match(home,/fimJanela=Math\.min\(24\*60,inicioJanela\+JANELA_HOME_MINUTOS\)/,'Janela deve ser móvel a partir do horário atual');
const painel=bloco(home,'async function carregarPainelFisioterapeutaUtil','window.carregarPainelFisioterapeuta=');
assert.doesNotMatch(painel,/\.neq\('status','cancelado'\)/,'Cancelados devem permanecer visíveis na janela');
assert.match(home,/rotulo:'Em atendimento'/,'Estado em atendimento deve existir');
assert.match(home,/rotulo:'Atendimento concluído'/,'Estado concluído deve existir');
assert.match(home,/rotulo:'Remarcado'/,'Estado remarcado deve existir');
assert.match(home,/rotulo:'Cancelado'/,'Estado cancelado deve existir');
assert.match(home,/rotulo:'A ser atendido'/,'Estado futuro deve existir');
assert.match(home,/function intervalosLivresHome/,'Home deve calcular lacunas livres reais da jornada');
assert.match(home,/nome\.textContent='Horário livre'/,'Lacunas devem ser explicitamente rotuladas');
assert.match(home,/contextoAgendaHomeFisioterapeuta=contexto\|\|null/,'Jornada e bloqueios devem vir do contexto seguro da Agenda');
assert.doesNotMatch(home,/LIMITE_COMPACTO/,'Home não deve voltar ao recorte arbitrário de três itens');
assert.match(homeCss,/is-free/,'Estado visual de horário livre deve existir');
assert.match(homeCss,/is-cancelled/,'Cancelamento deve ter estado visual próprio');
assert.match(homeCss,/is-rescheduled/,'Reagendamento deve ter estado visual próprio');

// Cache dos arquivos alterados sem remover revisões anteriores.
assert.match(html,/script-1\.18\.0\.js\?v=20260910-hma-perf-r3&patient_self_service=20260910-r1&access_admin=20260910-r1/);
assert.match(html,/screen_loader-1\.25\.0\.js\?v=20260910-phase4d-r1&agenda_edit=20260910-r1&agenda_compact=20260910-r1/);
assert.match(html,/login_access-1\.18\.0\.js\?v=20260910-access-r1/);
assert.match(html,/home_fisioterapeuta_util-1\.24\.0\.js\?v=20260910-r3&fisio_home=20260910-r1&home4h=20260910-r1/);

console.log('Access + Agenda compact + Home 4h contract: OK');
''', encoding='utf-8')

print('Transformação incremental preparada com sucesso.')