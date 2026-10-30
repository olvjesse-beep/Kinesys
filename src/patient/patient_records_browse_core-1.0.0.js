/* KineSys — Patient Records Browse Core 1.0.0
 * Fallback de navegação/listagem de prontuários e recentes da Home extraído de
 * src/core/script-1.18.0.js. O Design System/Home Detalhes podem substituir estes
 * renderizadores depois, como já ocorre no runtime de produção.
 */
'use strict';

const KINESYS_BUSCA_PACIENTE_DEBOUNCE_MS = 320;
const KINESYS_BUSCA_PACIENTE_INSTALACAO_MS = 700;
let filtroPacientesSalvosTimer = null;
let filtroPacientesSalvosFila = [];

async function renderizarTabelaProntuarios(filtro = "") {
    if (typeof window.renderProntuarioCardsKineSys === 'function') {
        return window.renderProntuarioCardsKineSys(filtro);
    }
    console.warn('KineSys: renderizador moderno de prontuários ainda não foi inicializado.');
}

function filtrarPacientesSalvos() {
    return renderizarTabelaProntuarios(document.getElementById('input_busca_paciente')?.value || '');
}

function instalarDebounceBuscaPacientesKineSys() {
    const original = window.filtrarPacientesSalvos;
    if (typeof original !== 'function' || original.__kinesysDebounceBuscaPaciente) return false;

    let ultimoContexto = window;
    let ultimosArgumentos = [];
    const debounced = function(...args) {
        ultimoContexto = this;
        ultimosArgumentos = args;
        if (filtroPacientesSalvosTimer) clearTimeout(filtroPacientesSalvosTimer);

        const promessa = new Promise((resolve, reject) => {
            filtroPacientesSalvosFila.push({ resolve, reject });
        });

        filtroPacientesSalvosTimer = setTimeout(async () => {
            filtroPacientesSalvosTimer = null;
            const fila = filtroPacientesSalvosFila.splice(0);
            try {
                const resultado = await original.apply(ultimoContexto, ultimosArgumentos);
                fila.forEach(item => item.resolve(resultado));
            } catch (erro) {
                fila.forEach(item => item.reject(erro));
            }
        }, KINESYS_BUSCA_PACIENTE_DEBOUNCE_MS);

        return promessa;
    };
    debounced.__kinesysDebounceBuscaPaciente = true;
    debounced.__kinesysOriginal = original;
    window.filtrarPacientesSalvos = debounced;
    return true;
}

function agendarDebounceBuscaPacientesKineSys() {
    // O Design System agenda sua preparação final logo após DOMContentLoaded e
    // também mantém uma reaplicação de segurança em 500 ms. Instalar depois disso
    // evita que o wrapper seja sobrescrito, sem interferir no bootstrap do app.
    setTimeout(instalarDebounceBuscaPacientesKineSys, KINESYS_BUSCA_PACIENTE_INSTALACAO_MS);
}

async function renderizarPacientesRecentesHome() {
    const container = document.getElementById('lista_pacientes_recentes');
    if (!container) return;

    const lista = await obterPacientesBasicos();
    if (lista.length === 0) {
        container.innerHTML = `<p class="kds-u-text-muted kds-u-fs-ui kds-u-ta-center kds-u-p-20px">Nenhum prontuário salvo recentemente.</p>`;
        return;
    }

    const recentes = lista.slice(-3).reverse();
    let html = `<table class="tabela-pacientes"><thead><tr><th>Data</th><th>Nome</th><th>Profissão</th><th>Ação</th></tr></thead><tbody>`;

    recentes.forEach(p => {
        html += `
            <tr>
                <td>${escapeHTML(p.dataCadastro)}</td>
                <td><strong>${escapeHTML(p.nome)}</strong></td>
                <td>${escapeHTML(p.profissao || "-")}</td>
                <td><button class="btn-nav btn-compact" onclick="carregarPacienteParaEdicao('${escapeHTML(p.id)}')">Abrir ➔</button></td>
            </tr>
        `;
    });

    html += `</tbody></table>`;
    container.innerHTML = html;
}

window.renderizarTabelaProntuarios = renderizarTabelaProntuarios;
window.filtrarPacientesSalvos = filtrarPacientesSalvos;
window.renderizarPacientesRecentesHome = renderizarPacientesRecentesHome;
window.instalarDebounceBuscaPacientesKineSys = instalarDebounceBuscaPacientesKineSys;

// Histórico somente leitura, paginado na origem e independente do cache semanal.
// Não infere quitação pelo status clínico nem consulta valores para perfil restrito.
let historicoAgendamentosPacienteRevisao = 0;
async function abrirHistoricoAgendamentosPaciente(pacienteId, pagina=0) {
    if(typeof telaPermitida==='function'&&!telaPermitida('tela_agenda'))return;
    const clinica=String(typeof usuarioLogado!=='undefined'?usuarioLogado?.clinica_id||'':'');
    if(!pacienteId||!clinica||!_supabase)return;
    const revisao=++historicoAgendamentosPacienteRevisao;
    let dialog=document.getElementById('ks_patient_appointments');
    if(!dialog){
        dialog=document.createElement('dialog');dialog.id='ks_patient_appointments';dialog.className='ks-patient-history-dialog';
        dialog.setAttribute('aria-labelledby','ks_patient_appointments_title');
        document.body.append(dialog);
    }
    dialog.innerHTML='<header><h2 id="ks_patient_appointments_title">Histórico de agendamentos</h2><button type="button" class="btn-secondary" data-close-history>Fechar</button></header><div role="status">Carregando agendamentos…</div>';
    dialog.querySelector('[data-close-history]').onclick=()=>{historicoAgendamentosPacienteRevisao++;dialog.close();};
    if(!dialog.open)dialog.showModal();
    const atual=()=>revisao===historicoAgendamentosPacienteRevisao&&dialog.open&&clinica===String(typeof usuarioLogado!=='undefined'?usuarioLogado?.clinica_id||'':'');
    const identidade=document.createElement('p');identidade.className='ks-patient-history-identity';identidade.textContent='Paciente · '+String(pacienteId);dialog.querySelector('header').after(identidade);
    if(typeof obterPacientesBasicos==='function')Promise.resolve(obterPacientesBasicos()).then(pacientes=>{
        if(!atual())return;
        const paciente=(pacientes||[]).find(p=>String(p.id)===String(pacienteId));
        if(paciente)identidade.textContent=String(paciente.nome||'Paciente')+' · '+String(pacienteId);
    }).catch(()=>{});
    try{
        const inicio=Math.max(0,pagina)*50;
        const {data,error}=await _supabase.from('agendamentos')
            .select('id,data,hora_inicio,hora_fim,status,procedimento_id,profissional_id,plano_id,procedimentos(nome),equipe(nome)')
            .eq('clinica_id',clinica).eq('paciente_id',pacienteId)
            .order('data',{ascending:false}).order('hora_inicio',{ascending:false}).order('id',{ascending:false}).range(inicio,inicio+50);
        if(error)throw error;if(!atual())return;
        const linhas=(data||[]).slice(0,50),proxima=(data||[]).length>50;
        const verFinanceiro=typeof telaPermitida!=='function'||telaPermitida('tela_financeiro');
        let pagamentos=new Map();
        if(verFinanceiro&&linhas.length&&typeof obterMapaPagamentoAgendamentos==='function')pagamentos=await obterMapaPagamentoAgendamentos(linhas);
        if(!atual())return;
        const esc=v=>escapeHTML(String(v??''));
        const situacao=a=>{
            if(!verFinanceiro)return 'Acesso restrito';
            const s=pagamentos.get(String(a.id));
            if(!s?.verificado)return 'Não confirmado';
            if(s.semCobranca)return 'Sem cobrança';
            if(s.pago)return 'Pago';
            return s.parcial?'Pagamento parcial':'Pendente';
        };
        const conteudo=linhas.length?'<div class="ks-patient-history-scroll"><table><caption>Do mais recente para o mais antigo</caption><thead><tr><th>Dia</th><th>Hora</th><th>Status</th><th>Procedimento</th><th>Profissional</th><th>Pagamento</th></tr></thead><tbody>'+linhas.map(a=>'<tr><td>'+esc(String(a.data||'').split('-').reverse().join('/'))+'</td><td>'+esc(String(a.hora_inicio||'').slice(0,5)+'–'+String(a.hora_fim||'').slice(0,5))+'</td><td>'+esc(typeof rotuloStatusAgenda==='function'?rotuloStatusAgenda(a.status):String(a.status||'').replace(/_/g,' '))+'</td><td>'+esc(a.procedimentos?.nome||'Não informado')+'</td><td>'+esc(a.equipe?.nome||'Não informado')+'</td><td>'+esc(situacao(a))+'</td></tr>').join('')+'</tbody></table></div>':'<p>Nenhum agendamento encontrado.</p>';
        dialog.querySelector('[role="status"]').outerHTML=conteudo+'<footer><span>Página '+(pagina+1)+'</span><button type="button" class="btn-secondary" data-history-prev '+(pagina===0?'disabled':'')+'>Anterior</button><button type="button" class="btn-secondary" data-history-next '+(!proxima?'disabled':'')+'>Próxima</button></footer>';
        dialog.querySelector('[data-history-prev]').onclick=()=>abrirHistoricoAgendamentosPaciente(pacienteId,pagina-1);
        dialog.querySelector('[data-history-next]').onclick=()=>abrirHistoricoAgendamentosPaciente(pacienteId,pagina+1);
    }catch(err){
        if(!atual())return;
        const status=dialog.querySelector('[role="status"]');
        status.textContent='Não foi possível consultar os agendamentos. Nenhum dado foi alterado.';
        const retry=document.createElement('button');retry.type='button';retry.className='btn-secondary';retry.textContent='Tentar novamente';retry.onclick=()=>abrirHistoricoAgendamentosPaciente(pacienteId,pagina);status.append(retry);
        console.warn('Histórico de agendamentos indisponível.',err);
    }
}
window.abrirHistoricoAgendamentosPaciente=abrirHistoricoAgendamentosPaciente;

let avaliacaoSaidaDialogAberto=false;
window.confirmarSaidaAvaliacaoKineSys=function(prosseguir){
    if(!document.getElementById('tela_avaliacao')?.classList.contains('ativa')||!avaliacaoAlteradaKineSys)return true;
    if(avaliacaoSalvandoKineSys){alert('Aguarde a confirmação do salvamento antes de sair.','aviso');return false;}
    const voltarRota=()=>{if(window.location.hash!=='#tela_avaliacao')window.history.replaceState({tela:'tela_avaliacao'},'','#tela_avaliacao');};
    const aceitar=()=>{
        // Cópia recuperável imediata. Não equivale a salvar no prontuário.
        try{const r=coletarRascunhoKineSys();if(r)localStorage.setItem('kinesys_rascunho_avaliacao_v11',JSON.stringify(r));}catch(_){}
        avaliacaoAlteradaKineSys=false;
    };
    if(typeof prosseguir==='function'&&typeof window.confirmarKineSys==='function'){
        if(avaliacaoSaidaDialogAberto)return false;
        avaliacaoSaidaDialogAberto=true;voltarRota();
        const contexto=JSON.stringify(window.obterContextoAvaliacaoKineSys());
        Promise.resolve(window.confirmarKineSys('Há alterações que ainda não foram salvas no prontuário. Deseja sair da avaliação sem salvar?',{titulo:'Sair da avaliação?',confirmar:'Sair sem salvar',cancelar:'Continuar avaliando'})).then(ok=>{
            avaliacaoSaidaDialogAberto=false;
            if(ok&&window.contextoAvaliacaoContinuaKineSys(contexto)){aceitar();prosseguir();}
        }).catch(()=>{avaliacaoSaidaDialogAberto=false;});
        return false;
    }
    if(!window.confirm('Sair da avaliação? Há alterações não salvas no prontuário. Deseja sair sem salvar?')){voltarRota();return false;}
    aceitar();return true;
};
window.addEventListener?.('beforeunload',event=>{
    if(document.getElementById('tela_avaliacao')?.classList.contains('ativa')&&(avaliacaoAlteradaKineSys||avaliacaoSalvandoKineSys)){event.preventDefault();event.returnValue='';}
});

function renderizarRegistrosAvaliacao(p) {
    const c=document.getElementById('avaliacao_registros_paciente');if(!c)return;
    const avs=obterAvaliacoes(p||{});c.hidden=false;
    if(!p||!avs.length){c.style.display='none';c.replaceChildren();return;}
    c.style.display='block';c.replaceChildren();
    const title=document.createElement('strong');title.textContent=avaliacaoEdicaoId?'Editando avaliação salva':'Avaliações anteriores';c.appendChild(title);
    const choose=document.createElement('button');choose.type='button';choose.className='btn-secondary';choose.textContent='Escolher avaliação para editar';choose.onclick=()=>window.abrirEdicaoAvaliacoesPaciente?.(p.id);c.appendChild(choose);
    if(avaliacaoEdicaoId){
        const note=document.createElement('p');note.textContent='A data e a autoria originais serão preservadas. O histórico guardará a versão anterior e a identificação desta edição.';c.appendChild(note);
        const label=document.createElement('label');label.htmlFor='avaliacao_edicao_motivo';label.textContent='Motivo da edição';
        const input=document.createElement('input');input.id='avaliacao_edicao_motivo';input.type='text';input.maxLength=1000;input.placeholder='Ex.: complementar achados do exame';input.addEventListener('input',()=>agendarAutosaveKineSys());c.append(label,input);
    }
}

let revisaoEscolhaAvaliacao=0;
async function abrirEdicaoAvaliacoesPaciente(pacienteId,somenteHistorico=false){
    if(typeof telaPermitida==='function'&&!telaPermitida('tela_avaliacao'))return;
    const contexto=String(usuarioLogado?.id||'')+'|'+String(usuarioLogado?.clinica_id||'');
    const revisao=++revisaoEscolhaAvaliacao;
    let dialog=document.getElementById('ks_patient_evaluation_edits');
    if(!dialog){dialog=document.createElement('dialog');dialog.id='ks_patient_evaluation_edits';dialog.className='ks-patient-history-dialog';document.body.appendChild(dialog);}
    dialog.setAttribute('aria-labelledby','ks_patient_evaluation_edits_title');
    dialog.innerHTML='<header><h2 id="ks_patient_evaluation_edits_title">'+(somenteHistorico?'Histórico de edições':'Editar avaliação')+'</h2><button type="button" class="btn-secondary" data-close>Fechar</button></header><div role="status">Carregando avaliações…</div>';
    dialog.querySelector('[data-close]').onclick=()=>{++revisaoEscolhaAvaliacao;dialog.close();};
    if(!dialog.open)dialog.showModal();
    const atual=()=>revisao===revisaoEscolhaAvaliacao&&dialog.open&&contexto===String(usuarioLogado?.id||'')+'|'+String(usuarioLogado?.clinica_id||'');
    try{
        const p=await obterPacienteCompletoPorId(pacienteId);if(!atual())return;
        const body=dialog.querySelector('[role="status"]');body.replaceChildren();
        if(!p||p.__dadosLocaisPendentes)throw new Error('Conecte-se ao servidor para consultar e editar versões atualizadas.');
        const nome=document.createElement('p');nome.textContent=p.nome;body.appendChild(nome);
        const lista=obterAvaliacoes(p).slice().sort((a,b)=>String(obterRealizadoEmRegistro(b)||'').localeCompare(String(obterRealizadoEmRegistro(a)||''))||String(b.id).localeCompare(String(a.id)));
        if(!lista.length){const vazio=document.createElement('p');vazio.textContent='Este paciente ainda não possui avaliação salva.';body.appendChild(vazio);return;}
        const ajuda=document.createElement('p');ajuda.textContent=somenteHistorico?'Escolha a avaliação para consultar as alterações.':'Escolha a avaliação. Cada alteração preserva a versão anterior, a data original e a autoria.';body.appendChild(ajuda);
        for(const av of lista){
            const item=document.createElement('article');item.className='ks-evaluation-choice';
            const title=document.createElement('strong');title.textContent=(av.tipo||'Avaliação')+' · '+formatarDataHoraClinica(obterRealizadoEmRegistro(av));
            const info=document.createElement('p');info.textContent=profissionalRegistroClinico(av)+' · '+(av.status==='rascunho'?'Rascunho':'Finalizada');
            const actions=document.createElement('div');actions.className='ks-evaluation-choice-actions';
            if(!somenteHistorico){const edit=document.createElement('button');edit.type='button';edit.className='btn-primary';edit.textContent='Editar esta avaliação';edit.onclick=async()=>{if(!atual())return;dialog.close();await editarAvaliacaoClinica(p.id,av.id);};actions.appendChild(edit);}
            const history=document.createElement('button');history.type='button';history.className='btn-secondary';history.textContent='Ver histórico de edições';history.onclick=()=>abrirHistoricoEdicaoAvaliacao(p.id,av.id);actions.appendChild(history);
            item.append(title,info,actions);body.appendChild(item);
        }
    }catch(err){if(atual())dialog.querySelector('[role="status"]').textContent=String(err?.message||'Não foi possível carregar as avaliações. Tente novamente.');}
}

async function abrirHistoricoEdicaoAvaliacao(pacienteId,avaliacaoId,pagina=0){
    if(typeof telaPermitida==='function'&&!telaPermitida('tela_avaliacao'))return;
    const dialog=document.getElementById('ks_patient_evaluation_edits');if(!dialog?.open)return;
    const revisao=++revisaoEscolhaAvaliacao,contexto=String(usuarioLogado?.id||'')+'|'+String(usuarioLogado?.clinica_id||'');
    const body=dialog.querySelector('[role="status"]');body.textContent='Carregando histórico…';
    const atual=()=>dialog.open&&revisao===revisaoEscolhaAvaliacao&&contexto===String(usuarioLogado?.id||'')+'|'+String(usuarioLogado?.clinica_id||'');
    try{
        const {data,error}=await _supabase.rpc('kinesys_historico_avaliacao',{p_id:avaliacaoId,p_paciente_id:pacienteId,p_pagina:pagina});
        if(error)throw error;if(!atual())return;body.replaceChildren();
        const back=document.createElement('button');back.type='button';back.className='btn-secondary';back.textContent='Voltar às avaliações';back.onclick=()=>abrirEdicaoAvaliacoesPaciente(pacienteId,true);body.appendChild(back);
        const itens=Array.isArray(data)?data:[];
        if(!itens.length){const empty=document.createElement('p');empty.textContent='Nenhuma edição registrada para esta avaliação.';body.appendChild(empty);}
        const labels={hma:'História clínica',idade:'Idade',profissao:'Ocupação',esporte:'Atividade física',comorbidades:'Antecedentes',cirurgias:'Cirurgias',medicamentos:'Medicamentos',eva_inicial:'EVA',mapeamento:'Exame, diagnóstico e relatório'};
        for(const event of itens.slice(0,20)){
            const item=document.createElement('article');item.className='ks-evaluation-choice';
            const title=document.createElement('strong');title.textContent=formatarDataHoraClinica(event.alterado_em,true)+' · '+String(event.alterado_por_nome||'Profissional');
            const motivo=document.createElement('p');motivo.textContent='Motivo: '+String(event.motivo||'Edição registrada anteriormente');item.append(title,motivo);
            const campos=Object.keys(labels).filter(k=>JSON.stringify(event.antes?.[k])!==JSON.stringify(event.depois?.[k]));
            for(const key of campos){
                const details=document.createElement('details'),summary=document.createElement('summary');summary.textContent=labels[key];details.appendChild(summary);
                for(const [rotulo,obj] of [['Antes',event.antes],['Depois',event.depois]]){const value=document.createElement('pre');value.textContent=rotulo+':\n'+(typeof obj?.[key]==='string'?obj[key]:JSON.stringify(obj?.[key]??null,null,2));details.appendChild(value);}
                item.appendChild(details);
            }
            body.appendChild(item);
        }
        if(pagina>0){const prev=document.createElement('button');prev.type='button';prev.className='btn-secondary';prev.textContent='Mais recentes';prev.onclick=()=>abrirHistoricoEdicaoAvaliacao(pacienteId,avaliacaoId,pagina-1);body.appendChild(prev);}
        if(itens.length>20){const next=document.createElement('button');next.type='button';next.className='btn-secondary';next.textContent='Mais antigas';next.onclick=()=>abrirHistoricoEdicaoAvaliacao(pacienteId,avaliacaoId,pagina+1);body.appendChild(next);}
    }catch(err){if(atual())body.textContent='Não foi possível consultar o histórico. '+String(err?.message||'Tente novamente.');}
}
window.abrirEdicaoAvaliacoesPaciente=abrirEdicaoAvaliacoesPaciente;
window.abrirHistoricoEdicaoAvaliacao=abrirHistoricoEdicaoAvaliacao;

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', agendarDebounceBuscaPacientesKineSys, { once:true });
} else {
    agendarDebounceBuscaPacientesKineSys();
}
