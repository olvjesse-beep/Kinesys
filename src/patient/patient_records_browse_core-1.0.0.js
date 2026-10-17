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

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', agendarDebounceBuscaPacientesKineSys, { once:true });
} else {
    agendarDebounceBuscaPacientesKineSys();
}
