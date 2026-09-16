/* ==========================================================================
   KineSys — PLANOS DE ATENDIMENTO E PAGAMENTOS v1.11.2 / ITEM 3
   - Persistência financeira com confirmação de gravação e fallback local.
   - Formas de pagamento múltiplas sem mudança de schema (armazenadas em TEXT).
   ========================================================================== */

let financeiroPacienteAtualId = '';
let financeiroPlanosCache = [];
let financeiroPagamentosCache = [];
let financeiroAgendamentosCache = [];
let financeiroProcedimentosCache = [];
let financeiroTabelaDisponivel = true;
let financeiroVinculoAgendaDisponivel = true;
let financeiroPlanoRenovacaoOrigemId = '';

const FINANCEIRO_LOCAL_PLANOS = 'kinesys_financeiro_planos_v1112';
const FINANCEIRO_LOCAL_PAGAMENTOS = 'kinesys_financeiro_pagamentos_v1112';
const FINANCEIRO_LOCAL_PAGAMENTOS_EXCLUIDOS = 'kinesys_financeiro_pagamentos_excluidos_v1112';
const FINANCEIRO_LOCAL_VINCULOS_AGENDA = 'kinesys_financeiro_agenda_vinculos_v1112';

// Estados que efetivamente consomem uma sessão contratada. `concluido` é
// mantido apenas para compatibilidade com atendimentos das versões anteriores.
const FINANCEIRO_STATUS_CONSOME_SESSAO = new Set(['atendido', 'falta_nao_justificada', 'concluido']);
const FINANCEIRO_STATUS_RESERVA_AGENDA = new Set(['pre_agendado', 'agendado', 'confirmado', 'em_recepcao']);
function financeiroStatusConsomeSessao(status) { return FINANCEIRO_STATUS_CONSOME_SESSAO.has(String(status || '')); }
function financeiroStatusReservaAgenda(status) { return FINANCEIRO_STATUS_RESERVA_AGENDA.has(String(status || '')); }

function financeiroHojeISO() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function financeiroTodosAgendamentosPaciente() {
    const mapa = new Map();
    enriquecerAgendamentosComVinculoLocal(financeiroAgendamentosCache || []).forEach(a => mapa.set(String(a.id || ''), a));
    if (typeof lerAgendamentosPendentesSync === 'function') {
        (lerAgendamentosPendentesSync() || []).forEach(item => {
            const a = item?.payload;
            if (!a || String(a.paciente_id || '') !== String(financeiroPacienteAtualId || '')) return;
            const enriquecido = enriquecerAgendamentosComVinculoLocal([a])[0] || a;
            mapa.set(String(a.id || ''), enriquecido);
        });
    }
    return Array.from(mapa.values());
}

function financeiroPreAgendamentosSemCobertura(plano = null) {
    const hoje = financeiroHojeISO();
    return financeiroTodosAgendamentosPaciente()
        .filter(a => String(a.status || '') === 'pre_agendado' && !a.plano_id && String(a.data || '') >= hoje)
        .filter(a => !plano?.procedimento_id || !a.procedimento_id || String(a.procedimento_id) === String(plano.procedimento_id))
        .sort((a,b) => `${a.data||''} ${a.hora_inicio||''}`.localeCompare(`${b.data||''} ${b.hora_inicio||''}`));
}

function financeiroResumoCoberturaAgenda() {
    const hoje = financeiroHojeISO();
    const todos = financeiroTodosAgendamentosPaciente().filter(a => String(a.data || '') >= hoje && financeiroStatusReservaAgenda(a.status));
    const semPacote = todos.filter(a => !a.plano_id);
    const preSemPacote = semPacote.filter(a => String(a.status || '') === 'pre_agendado');
    const metricas = new Map(financeiroPlanosCache.map(p => [String(p.id), metricasPlano(p)]));
    const comSaldoPendente = todos.filter(a => {
        if (!a.plano_id) return false;
        const m = metricas.get(String(a.plano_id));
        return !!m && m.saldo > 0.009;
    });
    return { todos, semPacote, preSemPacote, comSaldoPendente };
}

function rotuloPagamentoPlano(metricas) {
    if (!metricas || metricas.valorFinal <= 0 || metricas.saldo <= 0.009) return 'Quitado';
    if (metricas.pagos > 0) return 'Pagamento parcial';
    return 'Pagamento pendente';
}

function financeiroStatusElegivelCoberturaPagamento(status) {
    return financeiroStatusConsomeSessao(status) || financeiroStatusReservaAgenda(status);
}

function financeiroOrdenarAgendamentosCronologicamente(a, b) {
    return `${a?.data || ''} ${a?.hora_inicio || ''} ${a?.id || ''}`.localeCompare(`${b?.data || ''} ${b?.hora_inicio || ''} ${b?.id || ''}`);
}

function financeiroResumoPagamentoPlano(plano, pagamentos = []) {
    const contratadas = Math.max(0, Number(plano?.sessoes_contratadas) || 0);
    const valorFinal = Math.max(0, Number(plano?.valor_final) || 0);
    const pagos = (pagamentos || [])
        .filter(p => String(p?.plano_id || '') === String(plano?.id || ''))
        .reduce((s, p) => s + Math.max(0, Number(p?.valor) || 0), 0);
    const semCobranca = valorFinal <= 0.009;
    const quitado = semCobranca || pagos >= (valorFinal - 0.009);
    let sessoesPagas = 0;
    if (!semCobranca && contratadas > 0 && pagos > 0) {
        if (quitado) sessoesPagas = contratadas;
        else {
            const valorSessao = valorFinal / contratadas;
            sessoesPagas = valorSessao > 0 ? Math.min(contratadas, Math.floor((pagos / valorSessao) + 1e-9)) : 0;
        }
    }
    return { contratadas, valorFinal, pagos, saldo:Math.max(0, valorFinal-pagos), semCobranca, quitado, sessoesPagas };
}

function financeiroMesclarAgendamentosPorId(...listas) {
    const mapa = new Map();
    listas.flat().filter(Boolean).forEach(a => {
        if (!a?.id) return;
        const anterior = mapa.get(String(a.id)) || {};
        mapa.set(String(a.id), { ...anterior, ...a });
    });
    return Array.from(mapa.values());
}

async function obterMapaPagamentoAgendamentos(agendamentosBase = []) {
    const base = enriquecerAgendamentosComVinculoLocal(Array.isArray(agendamentosBase) ? agendamentosBase : []);
    const resultado = new Map();
    base.forEach(a => resultado.set(String(a.id || ''), {
        verificado: !a.plano_id,
        pago: false,
        semCobranca: false,
        cobravel: true,
        planoId: a.plano_id || null,
        motivo: a.plano_id ? 'nao_verificado' : 'sem_pacote'
    }));

    const planoIds = [...new Set(base.map(a => String(a.plano_id || '')).filter(Boolean))];
    if (!planoIds.length) return resultado;

    let planos = [];
    let pagamentos = [];
    let todosAgendamentos = [...base];
    let pagamentosVerificados = !_supabase;
    let agendaCompletaVerificada = !_supabase;

    if (typeof lerAgendamentosPendentesSync === 'function') {
        const pendentes = (lerAgendamentosPendentesSync() || []).map(x => x?.payload).filter(Boolean);
        todosAgendamentos = financeiroMesclarAgendamentosPorId(todosAgendamentos, enriquecerAgendamentosComVinculoLocal(pendentes));
    }

    if (_supabase) {
        try {
            const r = await _supabase.from('planos_atendimento')
                .select('id,paciente_id,procedimento_id,sessoes_contratadas,valor_final,status')
                .in('id', planoIds);
            if (!r.error) planos = r.data || [];
        } catch (_) {}
        try {
            const r = await _supabase.from('pagamentos')
                .select('id,plano_id,paciente_id,valor,data_pagamento,criado_em')
                .in('plano_id', planoIds);
            if (!r.error) {
                pagamentos = r.data || [];
                pagamentosVerificados = true;
            }
        } catch (_) {}
        try {
            const r = await _supabase.from('agendamentos')
                .select('id,plano_id,paciente_id,procedimento_id,status,data,hora_inicio')
                .in('plano_id', planoIds);
            if (!r.error) {
                todosAgendamentos = financeiroMesclarAgendamentosPorId(r.data || [], todosAgendamentos);
                todosAgendamentos = enriquecerAgendamentosComVinculoLocal(todosAgendamentos);
                agendaCompletaVerificada = true;
            }
        } catch (_) {}
    }

    const planosMap = new Map(planos.map(p => [String(p.id || ''), p]));
    for (const planoId of planoIds) {
        const plano = planosMap.get(String(planoId));
        if (!plano) continue;
        const resumo = financeiroResumoPagamentoPlano(plano, pagamentos);
        const elegiveis = todosAgendamentos
            .filter(a => String(a.plano_id || '') === String(planoId) && financeiroStatusElegivelCoberturaPagamento(a.status))
            .sort(financeiroOrdenarAgendamentosCronologicamente);
        const idsPagos = new Set(elegiveis.slice(0, resumo.sessoesPagas).map(a => String(a.id || '')));
        const parcialPrecisaOrdem = !resumo.semCobranca && !resumo.quitado && resumo.sessoesPagas > 0;
        const verificado = pagamentosVerificados && (!parcialPrecisaOrdem || agendaCompletaVerificada);

        base.filter(a => String(a.plano_id || '') === String(planoId)).forEach(a => {
            const elegivel = financeiroStatusElegivelCoberturaPagamento(a.status);
            resultado.set(String(a.id || ''), {
                verificado,
                pago: verificado && elegivel && idsPagos.has(String(a.id || '')),
                semCobranca: resumo.semCobranca,
                cobravel: !resumo.semCobranca,
                planoId,
                planoQuitado: resumo.quitado,
                pagos: resumo.pagos,
                valorFinal: resumo.valorFinal,
                sessoesPagas: resumo.sessoesPagas,
                motivo: resumo.semCobranca ? 'sem_cobranca' : (idsPagos.has(String(a.id || '')) ? 'pago' : 'pagamento_pendente')
            });
        });
    }
    return resultado;
}

async function obterSituacaoPagamentoAgendamento(agendamento) {
    if (!agendamento?.id) return { verificado:false, pago:false, semCobranca:false, cobravel:true, motivo:'indisponivel' };
    const mapa = await obterMapaPagamentoAgendamentos([agendamento]);
    return mapa.get(String(agendamento.id)) || { verificado:!agendamento.plano_id, pago:false, semCobranca:false, cobravel:true, motivo:agendamento.plano_id?'nao_verificado':'sem_pacote' };
}

async function realocarCoberturaPlanoParaPreAgendamentos(planoId, contexto = {}) {
    if (!planoId) return { promovidos:[], capacidadeLiberada:0 };
    let plano = lerFinanceiroLocal(FINANCEIRO_LOCAL_PLANOS).find(p => String(p.id || '') === String(planoId)) || null;
    if (_supabase) {
        try {
            const r = await _supabase.from('planos_atendimento')
                .select('id,paciente_id,procedimento_id,sessoes_contratadas,status')
                .eq('id', planoId).maybeSingle();
            if (!r.error && r.data) plano = { ...(plano || {}), ...r.data };
        } catch (_) {}
    }
    if (!plano) return { promovidos:[], capacidadeLiberada:0 };

    const pacienteId = contexto.pacienteId || plano.paciente_id || '';
    const procedimentoId = contexto.procedimentoId || plano.procedimento_id || '';
    if (!pacienteId) return { promovidos:[], capacidadeLiberada:0 };

    let agendamentos = [];
    if (_supabase) {
        try {
            const r = await _supabase.from('agendamentos')
                .select('id,paciente_id,procedimento_id,plano_id,status,data,hora_inicio')
                .eq('paciente_id', pacienteId)
                .order('data').order('hora_inicio');
            if (!r.error) agendamentos = r.data || [];
        } catch (_) {}
    }
    if (typeof lerAgendamentosPendentesSync === 'function') {
        const pendentes = (lerAgendamentosPendentesSync() || [])
            .map(x => x?.payload)
            .filter(a => a && String(a.paciente_id || '') === String(pacienteId));
        agendamentos = financeiroMesclarAgendamentosPorId(agendamentos, pendentes);
    }
    agendamentos = enriquecerAgendamentosComVinculoLocal(agendamentos);

    const contratadas = Math.max(0, Number(plano.sessoes_contratadas) || 0);
    const emUso = agendamentos.filter(a => String(a.plano_id || '') === String(planoId) && financeiroStatusElegivelCoberturaPagamento(a.status)).length;
    let capacidade = Math.max(0, contratadas - emUso);
    if (!capacidade) return { promovidos:[], capacidadeLiberada:0 };

    const hoje = financeiroHojeISO();
    const candidatos = agendamentos
        .filter(a => String(a.status || '') === 'pre_agendado' && !a.plano_id && String(a.data || '') >= hoje)
        .filter(a => !procedimentoId || !a.procedimento_id || String(a.procedimento_id) === String(procedimentoId))
        .sort(financeiroOrdenarAgendamentosCronologicamente);

    const promovidos = [];
    for (const a of candidatos.slice(0, capacidade)) {
        let preservado = false;
        const pendente = typeof lerAgendamentosPendentesSync === 'function'
            ? (lerAgendamentosPendentesSync() || []).some(x => String(x?.payload?.id || '') === String(a.id || ''))
            : false;
        if (pendente && typeof atualizarPayloadAgendamentoPendenteSync === 'function') {
            preservado = atualizarPayloadAgendamentoPendenteSync(a.id, { status:'agendado', plano_id:planoId });
        } else if (_supabase) {
            let r = await _supabase.from('agendamentos').update({ plano_id:planoId, status:'agendado' }).eq('id', a.id);
            if (r.error && /plano_id|schema cache|column .* does not exist/i.test(String(r.error.message || ''))) {
                if (typeof financeiroVinculoAgendaDisponivel !== 'undefined') financeiroVinculoAgendaDisponivel = false;
                r = await _supabase.from('agendamentos').update({ status:'agendado' }).eq('id', a.id);
                if (!r.error && typeof salvarVinculoAgendaLocal === 'function') {
                    salvarVinculoAgendaLocal(a.id, planoId, pacienteId, a.procedimento_id || procedimentoId, 'agendado');
                    preservado = true;
                }
            } else if (!r.error) {
                preservado = true;
                if (typeof removerVinculoAgendaLocal === 'function') removerVinculoAgendaLocal(a.id);
            }
        }
        if (preservado) {
            if (typeof salvarVinculoAgendaLocal === 'function' && (!_supabase || !financeiroVinculoAgendaDisponivel || pendente)) {
                salvarVinculoAgendaLocal(a.id, planoId, pacienteId, a.procedimento_id || procedimentoId, 'agendado');
            }
            promovidos.push({ ...a, plano_id:planoId, status:'agendado' });
        }
    }
    return { promovidos, capacidadeLiberada:capacidade };
}

function financeiroPodeEditar() {
    const tipo = String(usuarioLogado?.tipo || '').toUpperCase();
    return !!usuarioLogado && ['MASTER', 'MASTER_FEM', 'SECRETARIA', 'ADMINISTRADOR', 'ADMINISTRADORA'].includes(tipo);
}

function financeiroEhAdministrador() {
    const tipo = String(usuarioLogado?.tipo || '').toUpperCase();
    return !!usuarioLogado && ['MASTER', 'MASTER_FEM', 'ADMINISTRADOR', 'ADMINISTRADORA'].includes(tipo);
}

function financeiroDescontosPlano(plano = {}) {
    const pacote = Math.max(0, Number(plano.desconto_pacote) || 0);
    const cortesia = Math.max(0, Number(plano.desconto_cortesia) || 0);
    const totalRegistrado = Math.max(0, Number(plano.desconto_valor) || 0);
    const classificado = pacote + cortesia;
    const naoClassificado = Math.max(0, totalRegistrado - classificado);
    const total = Math.max(totalRegistrado, classificado);
    return { pacote, cortesia, naoClassificado, classificado, total };
}

function moedaBR(valor) {
    return Number(valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function numeroFinanceiro(valor) {
    if (valor === null || valor === undefined || valor === '') return 0;
    const s = String(valor).replace(/\./g, '').replace(',', '.').replace(/[^0-9.-]/g, '');
    const n = Number(s);
    return Number.isFinite(n) ? n : 0;
}

function gerarUUIDFinanceiro() {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

function gerarOperacaoFinanceiraId(prefixo) {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return `${prefixo}_${crypto.randomUUID()}`;
    return `${prefixo}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function erroFinanceiroTabelaAusente(err) {
    return /planos_atendimento|pagamentos|plano_id|schema cache|does not exist|relation|could not find the table|column .* does not exist/i.test(String(err?.message || err || ''));
}

function erroFinanceiroDuplicidade(err) {
    return String(err?.code || '') === '23505' || /duplicate key|unique constraint/i.test(String(err?.message || ''));
}

function mensagemFinanceiro(texto = '', tipo = '') {
    const el = document.getElementById('financeiro_feedback');
    if (!el) return;
    el.className = `finance-feedback${tipo ? ' ' + tipo : ''}`;
    el.textContent = texto;
}

function lerRascunhoFinanceiroLocal(chave) {
    try {
        const dados = JSON.parse(localStorage.getItem(chave) || '[]');
        return Array.isArray(dados) ? dados : [];
    } catch (err) {
        console.warn('Financeiro: falha ao ler armazenamento local.', err);
        return [];
    }
}

function lerFinanceiroLocal(chave) {
    // Rascunhos anteriores ficam preservados para revisão, sem participar do livro confirmado.
    if ([FINANCEIRO_LOCAL_PLANOS, FINANCEIRO_LOCAL_PAGAMENTOS, FINANCEIRO_LOCAL_PAGAMENTOS_EXCLUIDOS, FINANCEIRO_LOCAL_VINCULOS_AGENDA].includes(chave)) return [];
    return lerRascunhoFinanceiroLocal(chave);
}

function gravarFinanceiroLocal(chave, registros) {
    if ([FINANCEIRO_LOCAL_PLANOS, FINANCEIRO_LOCAL_PAGAMENTOS, FINANCEIRO_LOCAL_PAGAMENTOS_EXCLUIDOS, FINANCEIRO_LOCAL_VINCULOS_AGENDA].includes(chave)) return false;
    try {
        localStorage.setItem(chave, JSON.stringify(Array.isArray(registros) ? registros : []));
        return true;
    } catch (err) {
        console.error('Financeiro: falha ao gravar armazenamento local.', err);
        return false;
    }
}

function salvarRegistroFinanceiroLocal(chave, registro) {
    if ([FINANCEIRO_LOCAL_PLANOS, FINANCEIRO_LOCAL_PAGAMENTOS].includes(chave)) throw new Error('Reconecte para confirmar a operação financeira. Nenhum contrato ou pagamento foi criado.');
    const lista = lerFinanceiroLocal(chave);
    const idx = lista.findIndex(x => String(x.id || '') === String(registro.id || '') || (registro.operacao_id && x.operacao_id === registro.operacao_id));
    const novo = { ...registro, __local: true, __pending_sync: true };
    if (idx >= 0) lista[idx] = { ...lista[idx], ...novo };
    else lista.push(novo);
    if (!gravarFinanceiroLocal(chave, lista)) throw new Error('Não foi possível salvar os dados financeiros neste computador.');
    return novo;
}

function removerRegistroFinanceiroLocal(chave, id, operacaoId = '') {
    const lista = lerFinanceiroLocal(chave).filter(x => String(x.id || '') !== String(id || '') && (!operacaoId || x.operacao_id !== operacaoId));
    gravarFinanceiroLocal(chave, lista);
}

function obterFinanceiroLocalPaciente(chave, pacienteId) {
    return lerFinanceiroLocal(chave).filter(x => String(x.paciente_id || '') === String(pacienteId || ''));
}

function obterExclusoesPagamentosPendentes(pacienteId = '') {
    return lerFinanceiroLocal(FINANCEIRO_LOCAL_PAGAMENTOS_EXCLUIDOS)
        .filter(x => !pacienteId || String(x.paciente_id || '') === String(pacienteId || ''));
}

function pagamentoEstaMarcadoParaExclusao(pagamento, exclusoes = null) {
    if (!pagamento) return false;
    const lista = exclusoes || obterExclusoesPagamentosPendentes(pagamento.paciente_id || '');
    return lista.some(x =>
        String(x.id || '') === String(pagamento.id || '') ||
        (!!x.operacao_id && !!pagamento.operacao_id && String(x.operacao_id) === String(pagamento.operacao_id))
    );
}

function marcarPagamentoParaExclusao(pagamento) {
    const lista = lerFinanceiroLocal(FINANCEIRO_LOCAL_PAGAMENTOS_EXCLUIDOS);
    const idx = lista.findIndex(x => String(x.id || '') === String(pagamento.id || ''));
    const row = {
        id: pagamento.id,
        paciente_id: pagamento.paciente_id || financeiroPacienteAtualId || '',
        plano_id: pagamento.plano_id || null,
        operacao_id: pagamento.operacao_id || null,
        excluido_em: new Date().toISOString(),
        __pending_sync: true
    };
    if (idx >= 0) lista[idx] = { ...lista[idx], ...row };
    else lista.push(row);
    if (!gravarFinanceiroLocal(FINANCEIRO_LOCAL_PAGAMENTOS_EXCLUIDOS, lista)) {
        throw new Error('Não foi possível preservar a exclusão neste computador.');
    }
    return row;
}

function removerMarcacaoExclusaoPagamento(id) {
    const lista = lerFinanceiroLocal(FINANCEIRO_LOCAL_PAGAMENTOS_EXCLUIDOS)
        .filter(x => String(x.id || '') !== String(id || ''));
    gravarFinanceiroLocal(FINANCEIRO_LOCAL_PAGAMENTOS_EXCLUIDOS, lista);
}


function limparMetadadosFinanceiroLocal(registro) {
    const copia = { ...registro };
    delete copia.__local;
    delete copia.__pending_sync;
    delete copia.procedimentos;
    return copia;
}

function mesclarRegistrosFinanceiros(nuvem = [], locais = []) {
    const mapa = new Map();
    (nuvem || []).forEach(x => mapa.set(String(x.id || x.operacao_id || Math.random()), x));
    (locais || []).forEach(x => {
        const chaveId = String(x.id || x.operacao_id || Math.random());
        const existente = mapa.get(chaveId);
        mapa.set(chaveId, existente ? { ...existente, ...x } : x);
    });
    return Array.from(mapa.values());
}

function obterVinculosAgendaLocaisPaciente(pacienteId='') {
    const todos = lerFinanceiroLocal(FINANCEIRO_LOCAL_VINCULOS_AGENDA);
    return todos.filter(x => !pacienteId || String(x.paciente_id || '') === String(pacienteId || ''));
}

function obterVinculoAgendaLocal(agendamentoId) {
    return lerFinanceiroLocal(FINANCEIRO_LOCAL_VINCULOS_AGENDA).find(x => String(x.agendamento_id || '') === String(agendamentoId || '')) || null;
}

function salvarVinculoAgendaLocal(agendamentoId, planoId, pacienteId, procedimentoId='', status='agendado') {
    if (!agendamentoId || !planoId) return null;
    const lista = lerFinanceiroLocal(FINANCEIRO_LOCAL_VINCULOS_AGENDA);
    const idx = lista.findIndex(x => String(x.agendamento_id || '') === String(agendamentoId));
    const row = {
        agendamento_id: agendamentoId,
        plano_id: planoId,
        paciente_id: pacienteId || '',
        procedimento_id: procedimentoId || null,
        status: status || 'agendado',
        __local: true,
        __pending_sync: true,
        atualizado_em: new Date().toISOString()
    };
    if (idx >= 0) lista[idx] = { ...lista[idx], ...row };
    else lista.push(row);
    if (!gravarFinanceiroLocal(FINANCEIRO_LOCAL_VINCULOS_AGENDA, lista)) throw new Error('Não foi possível preservar o vínculo do pacote neste computador.');
    return row;
}

function removerVinculoAgendaLocal(agendamentoId) {
    const lista = lerFinanceiroLocal(FINANCEIRO_LOCAL_VINCULOS_AGENDA).filter(x => String(x.agendamento_id || '') !== String(agendamentoId || ''));
    gravarFinanceiroLocal(FINANCEIRO_LOCAL_VINCULOS_AGENDA, lista);
}

function atualizarStatusVinculoAgendaLocal(agendamentoId, status) {
    const atual = obterVinculoAgendaLocal(agendamentoId);
    if (!atual) return;
    salvarVinculoAgendaLocal(atual.agendamento_id, atual.plano_id, atual.paciente_id, atual.procedimento_id, status);
}

function enriquecerAgendamentosComVinculoLocal(registros = []) {
    return registros; // Vínculo confirmado no servidor é a única fonte de direitos.
}


function enriquecerPlanoProcedimento(plano) {
    if (!plano || plano.procedimentos?.nome) return plano;
    const proc = financeiroProcedimentosCache.find(x => String(x.id) === String(plano.procedimento_id || ''));
    return { ...plano, procedimentos: proc ? { nome: proc.nome } : null };
}

function obterFormasPagamentoSelecionadas(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return [];
    return Array.from(container.querySelectorAll('input[type="checkbox"]:checked')).map(x => x.value).filter(Boolean);
}

function definirFormasPagamentoSelecionadas(containerId, formas = ['PIX']) {
    const container = document.getElementById(containerId);
    if (!container) return;
    const set = new Set((Array.isArray(formas) ? formas : [formas]).map(String));
    container.querySelectorAll('input[type="checkbox"]').forEach(input => { input.checked = set.has(String(input.value)); });
    if (!container.querySelector('input[type="checkbox"]:checked')) {
        const pix = container.querySelector('input[value="PIX"]');
        if (pix) pix.checked = true;
    }
}

function serializarFormasPagamento(containerId) {
    return obterFormasPagamentoSelecionadas(containerId).join(' + ');
}

async function sincronizarFinanceiroLocalPaciente(pacienteId) {
    const pendentes = [FINANCEIRO_LOCAL_PLANOS, FINANCEIRO_LOCAL_PAGAMENTOS, FINANCEIRO_LOCAL_PAGAMENTOS_EXCLUIDOS, FINANCEIRO_LOCAL_VINCULOS_AGENDA]
        .some(chave => lerRascunhoFinanceiroLocal(chave).some(x=>String(x.paciente_id)===String(pacienteId)));
    if (pendentes) console.warn('Há rascunhos financeiros antigos preservados para revisão. Eles não geram direitos nem sobrescrevem contratos.');
    return !pendentes;
}

async function inicializarFinanceiro(preSelecionado = '') {
    const tela = document.getElementById('tela_financeiro');
    if (!tela) return;
    if (!financeiroPodeEditar()) {
        const painel = document.getElementById('financeiro_conteudo');
        if (painel) painel.innerHTML = '<div class="finance-empty">Seu perfil não possui permissão para lançar pagamentos.</div>';
        return;
    }
    await popularPacientesFinanceiro(preSelecionado || financeiroPacienteAtualId || '');
    await carregarProcedimentosFinanceiro();
    const sel = document.getElementById('financeiro_paciente_select');
    if (sel?.value) await carregarFinanceiroPaciente();
    else renderizarFinanceiroVazio();
}

async function popularPacientesFinanceiro(preSelecionado = '') {
    const sel = document.getElementById('financeiro_paciente_select');
    if (!sel) return;
    const pacientes = typeof obterPacientesBasicos === 'function'
        ? await obterPacientesBasicos()
        : await obterPacientesSalvos();
    sel.innerHTML = '<option value="">-- Selecione um paciente --</option>' + pacientes
        .slice().sort((a,b)=>String(a.nome||'').localeCompare(String(b.nome||''),'pt-BR'))
        .map(p=>`<option value="${escapeHTML(p.id)}">${escapeHTML(p.nome)}${p.cpf ? ' · '+escapeHTML(p.cpf) : ''}</option>`).join('');
    if (preSelecionado && pacientes.some(p=>String(p.id)===String(preSelecionado))) sel.value = preSelecionado;
}

async function carregarProcedimentosFinanceiro() {
    if (!_supabase) return;
    try {
        const { data, error } = await _supabase.from('procedimentos').select('id,nome,valor,ativo,sessoes_pacote').order('nome');
        if (error) throw error;
        financeiroProcedimentosCache = data || [];
        const sel = document.getElementById('fin_plano_procedimento');
        if (sel) sel.innerHTML = '<option value="">Sem procedimento específico</option>' + financeiroProcedimentosCache
            .filter(x=>x.ativo !== false).map(x=>`<option value="${x.id}" data-valor="${Number(x.valor||0)}" data-sessoes="${Number(x.sessoes_pacote)||1}">${escapeHTML(x.nome)}</option>`).join('');
    } catch (err) {
        console.warn('Financeiro: não foi possível carregar procedimentos.', err);
    }
}

async function consultarPlanosFinanceirosNuvem(pacienteId) {
    let resultado = await _supabase.from('planos_atendimento').select('*, procedimentos(nome)').eq('paciente_id', pacienteId).order('criado_em',{ascending:false});
    if (resultado.error && /relationship|procedimentos|foreign key/i.test(String(resultado.error?.message || ''))) {
        resultado = await _supabase.from('planos_atendimento').select('*').eq('paciente_id', pacienteId).order('criado_em',{ascending:false});
    }
    return resultado;
}

function renderizarFinanceiroVazio() {
    financeiroPacienteAtualId = '';
    financeiroPlanosCache = [];
    financeiroPagamentosCache = [];
    financeiroAgendamentosCache = [];
    ['fin_stat_sessoes','fin_stat_restantes','fin_stat_pago','fin_stat_saldo'].forEach(id=>{
        const el=document.getElementById(id);
        if(el) el.textContent = id.includes('pago')||id.includes('saldo') ? 'R$ 0,00' : '0';
    });
    const planos = document.getElementById('financeiro_planos_lista');
    const pagamentos = document.getElementById('financeiro_pagamentos_lista');
    if (planos) planos.innerHTML = '<div class="finance-empty">Selecione um paciente para visualizar os planos de atendimento.</div>';
    if (pagamentos) pagamentos.innerHTML = '<div class="finance-empty">Nenhum paciente selecionado.</div>';
    mensagemFinanceiro('');
}

async function consultarAgendamentosFinanceiroPaciente(pacienteId) {
    let r = await _supabase.from('agendamentos').select('id,plano_id,status,data,hora_inicio,procedimento_id').eq('paciente_id', pacienteId).neq('status','cancelado');
    if(r.error && /plano_id|schema cache|column .* does not exist/i.test(String(r.error.message||''))) {
        financeiroVinculoAgendaDisponivel = false;
        r = await _supabase.from('agendamentos').select('id,status,data,hora_inicio,procedimento_id').eq('paciente_id', pacienteId).neq('status','cancelado');
    }
    return r;
}

async function carregarFinanceiroPaciente() {
    const pacienteId = document.getElementById('financeiro_paciente_select')?.value || '';
    financeiroPacienteAtualId = pacienteId;
    if (!pacienteId) { renderizarFinanceiroVazio(); return; }

    mensagemFinanceiro('Atualizando planos e pagamentos…', 'info');
    let planosLocais = obterFinanceiroLocalPaciente(FINANCEIRO_LOCAL_PLANOS, pacienteId);
    let pagamentosLocais = obterFinanceiroLocalPaciente(FINANCEIRO_LOCAL_PAGAMENTOS, pacienteId);

    if (!_supabase) {
        const exclusoesPendentes = obterExclusoesPagamentosPendentes(pacienteId);
        financeiroPlanosCache = [];
        financeiroPagamentosCache = [];
        financeiroAgendamentosCache = [];
        renderizarFinanceiroPaciente();
        mensagemFinanceiro('Nuvem indisponível: os dados financeiros deste atendimento estão sendo mantidos neste computador.', 'aviso');
        return;
    }

    try {
        await sincronizarFinanceiroLocalPaciente(pacienteId);
        planosLocais = obterFinanceiroLocalPaciente(FINANCEIRO_LOCAL_PLANOS, pacienteId);
        pagamentosLocais = obterFinanceiroLocalPaciente(FINANCEIRO_LOCAL_PAGAMENTOS, pacienteId);

        const [planosR, pagamentosR, agendaR] = await Promise.all([
            consultarPlanosFinanceirosNuvem(pacienteId),
            _supabase.from('pagamentos').select('*').eq('paciente_id', pacienteId).order('data_pagamento',{ascending:false}).order('criado_em',{ascending:false}),
            consultarAgendamentosFinanceiroPaciente(pacienteId)
        ]);

        const erroPlanos = planosR.error || null;
        const erroPagamentos = pagamentosR.error || null;
        if (erroPlanos && erroFinanceiroTabelaAusente(erroPlanos)) financeiroTabelaDisponivel = false;
        else if (!erroPlanos) financeiroTabelaDisponivel = true;

        const exclusoesPendentes = obterExclusoesPagamentosPendentes(pacienteId);
        financeiroPlanosCache = (erroPlanos ? [] : (planosR.data || [])).map(enriquecerPlanoProcedimento);
        financeiroPagamentosCache = erroPagamentos ? [] : (pagamentosR.data || []);
        financeiroAgendamentosCache = agendaR.error ? enriquecerAgendamentosComVinculoLocal([]) : enriquecerAgendamentosComVinculoLocal(agendaR.data || []);
        renderizarFinanceiroPaciente();

        const falhas = [];
        if (erroPlanos) falhas.push('planos na nuvem');
        if (erroPagamentos) falhas.push('pagamentos na nuvem');
        if (agendaR.error && !/plano_id/i.test(String(agendaR.error?.message || ''))) falhas.push('vínculo com a agenda');
        if (falhas.length) {
            mensagemFinanceiro(`Não foi possível atualizar ${falhas.join(' e ')}. Reconecte para confirmar operações financeiras.`, 'aviso');
        } else if (planosLocais.length || pagamentosLocais.length) {
            mensagemFinanceiro('Há rascunhos antigos preservados neste computador para revisão; eles não alteram o saldo confirmado.', 'aviso');
        } else {
            mensagemFinanceiro('');
        }
    } catch (err) {
        console.error('Financeiro:', err);
        if (erroFinanceiroTabelaAusente(err)) financeiroTabelaDisponivel = false;
        const exclusoesPendentes = obterExclusoesPagamentosPendentes(pacienteId);
        financeiroPlanosCache = [];
        financeiroPagamentosCache = [];
        financeiroAgendamentosCache = [];
        renderizarFinanceiroPaciente();
        mensagemFinanceiro(`Não foi possível acessar o financeiro na nuvem. Reconecte antes de confirmar operações. ${err?.message || ''}`.trim(), 'aviso');
    }
}

function metricasPlano(plano) {
    const vinculados = financeiroAgendamentosCache.filter(a=>String(a.plano_id||'')===String(plano.id));
    const atendidas = vinculados.filter(a=>['atendido','concluido'].includes(String(a.status||''))).length;
    const faltasNaoJustificadas = vinculados.filter(a=>String(a.status||'')==='falta_nao_justificada').length;
    const consumidas = vinculados.filter(a=>financeiroStatusConsomeSessao(a.status)).length;
    const agendadas = vinculados.filter(a=>financeiroStatusReservaAgenda(a.status)).length;
    const contratadas = Math.max(0, Number(plano.sessoes_contratadas)||0);
    const restantes = plano.status === 'ativo' ? Math.max(0, contratadas - consumidas) : 0;
    const disponiveisVinculo = plano.status === 'ativo' ? Math.max(0, contratadas - consumidas - agendadas) : 0;
    const pagos = financeiroPagamentosCache.filter(p=>String(p.plano_id)===String(plano.id)).reduce((s,p)=>s+Number(p.valor||0),0);
    const valorFinal = Number(plano.valor_final || 0);
    const saldo = Math.max(0, valorFinal - pagos);
    return { contratadas, realizadas: consumidas, consumidas, atendidas, faltasNaoJustificadas, agendadas, restantes, disponiveisVinculo, pagos, valorFinal, saldo };
}

function renderizarFinanceiroPaciente() {
    const planosEl = document.getElementById('financeiro_planos_lista');
    const pagamentosEl = document.getElementById('financeiro_pagamentos_lista');
    const todasMetricas = financeiroPlanosCache.map(p=>({p,m:metricasPlano(p)}));
    const totalContratadas = todasMetricas.reduce((s,x)=>s+x.m.contratadas,0);
    const totalConsumidas = todasMetricas.reduce((s,x)=>s+x.m.consumidas,0);
    const totalRestantes = todasMetricas.filter(x=>x.p.status==='ativo').reduce((s,x)=>s+x.m.restantes,0);
    const totalPago = financeiroPagamentosCache.reduce((s,p)=>s+Number(p.valor||0),0);
    const totalFinal = financeiroPlanosCache.filter(p=>p.status!=='cancelado').reduce((s,p)=>s+Number(p.valor_final||0),0);
    const saldo = Math.max(0,totalFinal-totalPago);
    const set = (id,v)=>{const el=document.getElementById(id);if(el)el.textContent=v;};
    set('fin_stat_sessoes', `${totalConsumidas}/${totalContratadas}`);
    set('fin_stat_restantes', String(totalRestantes));
    set('fin_stat_pago', moedaBR(totalPago));
    set('fin_stat_saldo', moedaBR(saldo));

    if (planosEl) {
        const cobertura = financeiroResumoCoberturaAgenda();
        const resumoCobertura = (cobertura.preSemPacote.length || cobertura.comSaldoPendente.length)
            ? `<div class="finance-coverage-summary"><strong>Cobertura dos próximos atendimentos</strong><br>${cobertura.preSemPacote.length ? `<span class="warning"><b>${cobertura.preSemPacote.length}</b> pré-agendamento(s) ainda sem pacote/renovação.</span>` : 'Nenhum pré-agendamento sem pacote.'}${cobertura.comSaldoPendente.length ? `<br><span><b>${cobertura.comSaldoPendente.length}</b> agendamento(s) vinculado(s) a pacote com saldo financeiro pendente.</span>` : ''}</div>`
            : '';
        if (!financeiroPlanosCache.length) planosEl.innerHTML = resumoCobertura + '<div class="finance-empty">Nenhum pacote/plano cadastrado para este paciente.</div>';
        else planosEl.innerHTML = resumoCobertura + financeiroPlanosCache.map(plano=>{
            const m=metricasPlano(plano);
            const pct=m.contratadas?Math.min(100,Math.round((m.consumidas/m.contratadas)*100)):0;
            const statusLabel={ativo:'Ativo',concluido:'Concluído',cancelado:'Cancelado'}[plano.status]||plano.status;
            return `<article class="finance-plan-card ${escapeHTML(plano.status||'ativo')}">
                <div class="finance-plan-head"><div><span class="finance-status ${escapeHTML(plano.status||'ativo')}">${escapeHTML(statusLabel||'Ativo')}</span><h3>${escapeHTML(plano.nome||'Plano de atendimento')}</h3>${ehAtendimentoUnitario(plano)?'<span class="finance-status">Atendimento unitário · 1 sessão</span>':''}<p>${escapeHTML(plano.procedimentos?.nome || 'Atendimento fisioterapêutico')}</p></div><strong>${moedaBR(m.valorFinal)}</strong></div>
                <div class="finance-session-line"><span><b>${m.consumidas}</b> consumidas</span><span><b>${m.atendidas}</b> atendimentos</span>${m.faltasNaoJustificadas?`<span><b>${m.faltasNaoJustificadas}</b> falta(s) sem justificativa</span>`:''}<span><b>${m.agendadas}</b> agendadas</span><span><b>${m.restantes}</b> restantes</span><span><b>${m.contratadas}</b> contratadas</span></div>
                <div class="finance-progress"><i style="width:${pct}%"></i></div>
                <div class="finance-money-line"><span>Pagamento <b>${escapeHTML(rotuloPagamentoPlano(m))}</b></span><span>Pago <b>${moedaBR(m.pagos)}</b></span><span>Saldo <b>${moedaBR(m.saldo)}</b></span>${(()=>{const d=financeiroDescontosPlano(plano);return d.total>0?`<span>Desconto <b>${moedaBR(d.total)}</b>${d.pacote>0?` · pacote ${moedaBR(d.pacote)}`:''}${d.cortesia>0?` · cortesia ${moedaBR(d.cortesia)}`:''}${d.naoClassificado>0?` · histórico não classificado ${moedaBR(d.naoClassificado)}`:''}</span>`:''})()}${plano.forma_pagamento_prevista?`<span>Forma prevista <b>${escapeHTML(plano.forma_pagamento_prevista)}</b></span>`:''}</div>
                ${plano.observacoes?`<p class="finance-note">${escapeHTML(plano.observacoes)}</p>`:''}
                <div class="finance-plan-actions">${plano.status==='ativo'?`<button type="button" onclick="personalizarContratoFinanceiro('${escapeHTML(plano.id)}')">Personalizar</button>${plano.personalizacao?`<button type="button" onclick="removerPersonalizacaoFinanceiro('${escapeHTML(plano.id)}')">Excluir personalização</button>`:''}`:''}<button type="button" onclick="abrirModalPagamento('${escapeHTML(plano.id)}')">+ Pagamento</button>${plano.status==='ativo'&&m.disponiveisVinculo>0&&financeiroPreAgendamentosSemCobertura(plano).length?`<button type="button" onclick="vincularPreAgendamentosAoPlanoFinanceiro('${escapeHTML(plano.id)}')">Vincular pré-agendamentos</button>`:''}${!ehAtendimentoUnitario(plano)&&(plano.status==='concluido'||(plano.status!=='cancelado'&&m.contratadas>0&&m.restantes===0))?`<button type="button" onclick="abrirRenovacaoPlanoFinanceiro('${escapeHTML(plano.id)}')">Renovar plano</button>`:''}${plano.status==='ativo'&&m.restantes>0?`<button type="button" onclick="encerrarPlanoFinanceiro('${escapeHTML(plano.id)}')">Cancelar contratação</button>`:''}</div>
            </article>`;
        }).join('');
    }

    if (pagamentosEl) {
        if (!financeiroPagamentosCache.length) pagamentosEl.innerHTML='<div class="finance-empty">Nenhum pagamento lançado.</div>';
        else pagamentosEl.innerHTML=financeiroPagamentosCache.map(p=>{
            const plano=financeiroPlanosCache.find(x=>String(x.id)===String(p.plano_id));
            const data=p.data_pagamento?new Date(p.data_pagamento+'T00:00:00').toLocaleDateString('pt-BR'):'—';
            return `<div class="finance-payment-row"><div><strong>${moedaBR(p.valor)}</strong><span>${escapeHTML(plano?.nome||'Plano')} · ${escapeHTML(p.forma_pagamento||'Não informada')}</span></div><div class="finance-payment-meta"><b>${data}</b>${p.observacoes?`<small>${escapeHTML(p.observacoes)}</small>`:''}<button type="button" class="finance-payment-delete" onclick="excluirPagamentoFinanceiro('${escapeHTML(p.id)}')" aria-label="Apagar pagamento de ${escapeHTML(moedaBR(p.valor))}">Apagar</button></div></div>`;
        }).join('');
    }
}

function calcularValorFinalPlano() {
    const tabela = Math.max(0, numeroFinanceiro(document.getElementById('fin_plano_valor_tabela')?.value));
    const descontoPacote = Math.max(0, numeroFinanceiro(document.getElementById('fin_plano_desconto_pacote')?.value));
    const descontoCortesia = Math.max(0, numeroFinanceiro(document.getElementById('fin_plano_desconto_cortesia')?.value));
    const desconto = descontoPacote + descontoCortesia;
    const final = Math.max(0, tabela - desconto);
    const out=document.getElementById('fin_plano_valor_final'); if(out) out.value=final.toFixed(2).replace('.',',');
    const pct=document.getElementById('fin_plano_desconto_pct'); if(pct) pct.textContent=tabela>0?`${Math.min(100,(desconto/tabela)*100).toFixed(1).replace('.',',')}% de desconto total`:'0% de desconto';
    const resumo=document.getElementById('fin_plano_desconto_resumo');
    if(resumo) resumo.innerHTML=`Desconto total: <b>${moedaBR(desconto)}</b> · Pacote: <b>${moedaBR(descontoPacote)}</b> · Cortesia: <b>${moedaBR(descontoCortesia)}</b>`;
    return final;
}

function aoSelecionarProcedimentoPlano() {
    const opt=document.getElementById('fin_plano_procedimento')?.selectedOptions?.[0];
    const contratoId=document.getElementById('fin_plano_contrato_id')?.value;
    const original=financeiroPlanosCache.find(p=>String(p.id)===String(contratoId))?.condicoes_originais;
    if (!document.getElementById('fin_plano_personalizar')?.checked) {
        document.getElementById('fin_plano_sessoes').value=String(Number(original?.sessoes??opt?.dataset.sessoes)||1);
        document.getElementById('fin_plano_valor_tabela').value=Number(original?.valor??opt?.dataset.valor??0).toFixed(2).replace('.',',');
        document.getElementById('fin_plano_desconto_pacote').value=String(original?.desconto_pacote||0).replace('.',',');
        document.getElementById('fin_plano_desconto_cortesia').value=String(original?.desconto_cortesia||0).replace('.',',');
    }
    calcularValorFinalPlano();
}
function alternarPersonalizacaoContrato() {
    const personalizar=!!document.getElementById('fin_plano_personalizar')?.checked;
    ['fin_plano_sessoes','fin_plano_valor_tabela','fin_plano_desconto_pacote','fin_plano_desconto_cortesia'].forEach(id=>{document.getElementById(id).disabled=!personalizar;});
    aoSelecionarProcedimentoPlano();
}

function configurarCabecalhoModalPlanoFinanceiro(modo='novo', plano=null) {
    const titulo=document.getElementById('fin_plano_titulo');
    const contexto=document.getElementById('fin_plano_contexto');
    const salvar=document.getElementById('fin_plano_salvar_btn');
    if(modo==='renovar') {
        if(titulo) titulo.textContent='Renovar plano de atendimento';
        if(contexto) {
            contexto.hidden=false;
            contexto.textContent=`Novo ciclo baseado em “${plano?.nome||'plano anterior'}”. O histórico anterior será preservado.`;
        }
        if(salvar) salvar.textContent='Criar renovação';
    } else {
        if(titulo) titulo.textContent='Novo plano de atendimento';
        if(contexto) { contexto.hidden=true; contexto.textContent=''; }
        if(salvar) salvar.textContent='Salvar plano';
    }
}

function abrirModalNovoPlano() {
    const pacienteId=document.getElementById('financeiro_paciente_select')?.value||'';
    if(!pacienteId){alert('Selecione um paciente antes de criar o plano.');return;}
    financeiroPlanoRenovacaoOrigemId='';
    document.getElementById('fin_plano_contrato_id').value='';
    document.getElementById('fin_plano_procedimento').disabled=false;
    document.getElementById('fin_plano_personalizar').checked=false;
    configurarCabecalhoModalPlanoFinanceiro('novo');
    document.getElementById('fin_plano_operacao').value=gerarOperacaoFinanceiraId('plano');
    document.getElementById('fin_plano_nome').value='';
    document.getElementById('fin_plano_procedimento').value='';
    document.getElementById('fin_plano_sessoes').value='10';
    document.getElementById('fin_plano_valor_tabela').value='';
    document.getElementById('fin_plano_desconto_pacote').value='0';
    document.getElementById('fin_plano_desconto_cortesia').value='0';
    definirFormasPagamentoSelecionadas('fin_plano_forma', ['PIX']);
    document.getElementById('fin_plano_parcelas').value='1';
    document.getElementById('fin_plano_observacoes').value='';
    calcularValorFinalPlano();
    alternarPersonalizacaoContrato();
    abrirModal('modal_fin_plano');
}

async function abrirRenovacaoPlanoFinanceiro(planoId) {
    if(!financeiroPodeEditar()) { alert('Seu perfil não possui permissão para renovar planos.'); return; }
    const plano=financeiroPlanosCache.find(p=>String(p.id)===String(planoId));
    if(!plano){ alert('Plano não encontrado. Atualize o Financeiro e tente novamente.'); return; }
    if(String(plano.status||'')==='cancelado'){ alert('Planos cancelados não podem ser renovados por este atalho.'); return; }
    const m=metricasPlano(plano);
    if(m.restantes>0 && String(plano.status||'ativo')!=='concluido') {
        alert(`Este plano ainda possui ${m.restantes} sessão(ões) disponível(is). A renovação é liberada quando o ciclo termina.`);
        return;
    }

    abrirModalNovoPlano();
    financeiroPlanoRenovacaoOrigemId=String(plano.id);
    configurarCabecalhoModalPlanoFinanceiro('renovar',plano);
    document.getElementById('fin_plano_operacao').value=gerarOperacaoFinanceiraId('renovacao');
    document.getElementById('fin_plano_nome').value=plano.nome||'Plano de atendimento';

    const procSel=document.getElementById('fin_plano_procedimento');
    if(procSel && plano.procedimento_id) {
        if(!Array.from(procSel.options).some(o=>String(o.value)===String(plano.procedimento_id))) {
            const opt=document.createElement('option');
            opt.value=String(plano.procedimento_id);
            opt.textContent=plano.procedimentos?.nome||'Procedimento do plano anterior';
            procSel.appendChild(opt);
        }
        procSel.value=String(plano.procedimento_id);
    } else if(procSel) procSel.value='';

    document.getElementById('fin_plano_sessoes').value=String(Math.max(1,Number(plano.sessoes_contratadas)||1));
    document.getElementById('fin_plano_valor_tabela').value=Number(plano.valor_tabela||0).toFixed(2).replace('.',',');
    const descontosAnteriores=financeiroDescontosPlano(plano);
    document.getElementById('fin_plano_desconto_pacote').value=Number(descontosAnteriores.pacote||0).toFixed(2).replace('.',',');
    document.getElementById('fin_plano_desconto_cortesia').value=Number(descontosAnteriores.cortesia||0).toFixed(2).replace('.',',');
    if(descontosAnteriores.naoClassificado>0.009) {
        const contexto=document.getElementById('fin_plano_contexto');
        if(contexto){ contexto.hidden=false; contexto.textContent += ` O plano anterior possui ${moedaBR(descontosAnteriores.naoClassificado)} de desconto histórico sem categoria; classifique o desconto da nova renovação antes de salvar.`; }
    }
    const formas=String(plano.forma_pagamento_prevista||'PIX').split(/\s*\+\s*/).filter(Boolean);
    definirFormasPagamentoSelecionadas('fin_plano_forma',formas.length?formas:['PIX']);
    document.getElementById('fin_plano_parcelas').value=String(Math.max(1,Number(plano.parcelas)||1));
    document.getElementById('fin_plano_observacoes').value=plano.observacoes||'';
    document.getElementById('fin_plano_personalizar').checked=false;
    alternarPersonalizacaoContrato();
    abrirModal('modal_fin_plano');
}

async function salvarPlanoFinanceiro() {
    if(!financeiroPodeEditar() || !_supabase) return false;
    const btn=document.getElementById('fin_plano_salvar_btn');
    if(btn.disabled)return false;
    const contratoId=document.getElementById('fin_plano_contrato_id').value;
    const personalizar=document.getElementById('fin_plano_personalizar').checked;
    const personalizacao=personalizar?{
        sessoes:Number(document.getElementById('fin_plano_sessoes').value),
        valor:numeroFinanceiro(document.getElementById('fin_plano_valor_tabela').value),
        desconto_pacote:numeroFinanceiro(document.getElementById('fin_plano_desconto_pacote').value),
        desconto_cortesia:numeroFinanceiro(document.getElementById('fin_plano_desconto_cortesia').value)
    }:null;
    btn.disabled=true;
    try {
        const args=contratoId?{p_plano_id:contratoId,p_acao:personalizar?'personalizar':'remover_personalizacao',p_personalizacao:personalizacao,p_motivo:'Alteração das condições pelo financeiro'}:{
            p_paciente_id:document.getElementById('financeiro_paciente_select').value,
            p_procedimento_id:document.getElementById('fin_plano_procedimento').value,
            p_operacao_id:document.getElementById('fin_plano_operacao').value,p_personalizacao:personalizacao,
            p_detalhes:{nome:document.getElementById('fin_plano_nome').value,forma:serializarFormasPagamento('fin_plano_forma'),parcelas:Number(document.getElementById('fin_plano_parcelas').value)||1,observacoes:document.getElementById('fin_plano_observacoes').value}
        };
        const {error}=await _supabase.rpc(contratoId?'kinesys_alterar_contrato':'kinesys_contratar_pacote',args);
        if(error)throw error;
        fecharModal('modal_fin_plano');await carregarFinanceiroPaciente();
        mensagemFinanceiro('Contratação confirmada. As condições e o histórico foram preservados.','sucesso');return true;
    } catch(err) {alert('Não foi possível confirmar a contratação: '+(err.message||err));return false;}
    finally {btn.disabled=false;}
}
function personalizarContratoFinanceiro(id) {
    const pl=financeiroPlanosCache.find(p=>String(p.id)===String(id)); if(!pl)return;
    abrirModalNovoPlano();
    document.getElementById('fin_plano_contrato_id').value=id;
    document.getElementById('fin_plano_procedimento').disabled=true;
    document.getElementById('fin_plano_procedimento').value=pl.procedimento_id;
    document.getElementById('fin_plano_personalizar').checked=true;
    alternarPersonalizacaoContrato();
    document.getElementById('fin_plano_sessoes').value=pl.sessoes_contratadas;
    document.getElementById('fin_plano_valor_tabela').value=Number(pl.valor_tabela).toFixed(2).replace('.',',');
    document.getElementById('fin_plano_desconto_pacote').value=Number(pl.desconto_pacote||0).toFixed(2).replace('.',',');
    document.getElementById('fin_plano_desconto_cortesia').value=Number(pl.desconto_cortesia||0).toFixed(2).replace('.',',');
    document.getElementById('fin_plano_titulo').textContent='Personalizar contratação existente';
    calcularValorFinalPlano();
}
async function removerPersonalizacaoFinanceiro(id) {
    if(!await confirmarKineSys('Restaurar as condições originais deste contrato, mantendo a contratação?',{titulo:'Excluir personalização',confirmar:'Restaurar condições'}))return;
    const {error}=await _supabase.rpc('kinesys_alterar_contrato',{p_plano_id:id,p_acao:'remover_personalizacao',p_motivo:'Exclusão de personalização pelo financeiro'});
    if(error){alert(error.message);return;}await carregarFinanceiroPaciente();
}

async function vincularPreAgendamentosAoPlanoFinanceiro(planoId, opcoes = {}) {
    const plano = financeiroPlanosCache.find(p=>String(p.id)===String(planoId)) || opcoes.plano || null;
    if (!plano) { alert('Plano não encontrado. Atualize o Financeiro e tente novamente.'); return {ok:false,total:0}; }
    const m = metricasPlano(plano);
    const capacidade = Math.max(0, Number(opcoes.capacidade ?? m.disponiveisVinculo ?? 0));
    const candidatos = financeiroPreAgendamentosSemCobertura(plano);
    const qtd = Math.min(capacidade, candidatos.length);
    if (!qtd) {
        if (!opcoes.silencioso) alert(candidatos.length ? 'Este pacote já possui todas as sessões contratadas consumidas ou reservadas.' : 'Não há pré-agendamentos sem cobertura compatíveis com este plano.');
        return {ok:true,total:0};
    }
    if (opcoes.confirmar !== false) {
        const ok = await confirmarKineSys(
            `Foram encontrados ${candidatos.length} pré-agendamento(s) sem cobertura financeira.\n\nEste pacote pode cobrir ${capacidade} novo(s) horário(s). Deseja vincular os próximos ${qtd} ao pacote?\n\nEles passarão de Pré-agendado para Agendado. O pagamento continuará sendo controlado separadamente pelo saldo do plano.`,
            {titulo:'Vincular pré-agendamentos', confirmar:`Vincular ${qtd}`}
        );
        if (!ok) return {ok:false,total:0,cancelado:true};
    }

    const escolhidos = candidatos.slice(0,qtd);
    let vinculados = 0, locais = 0, falhas = 0;
    const planoNaNuvem = opcoes.planoNaNuvem !== false && !plano.__pending_sync;
    for (const a of escolhidos) {
        try {
            const pendente = typeof lerAgendamentosPendentesSync === 'function' && (lerAgendamentosPendentesSync()||[]).some(x=>String(x.payload?.id||'')===String(a.id||''));
            let vinculoNuvem = false;
            if (pendente && typeof atualizarPayloadAgendamentoPendenteSync === 'function') {
                const alt = {status:'agendado'};
                if (planoNaNuvem && financeiroVinculoAgendaDisponivel) alt.plano_id = plano.id;
                if (!atualizarPayloadAgendamentoPendenteSync(a.id, alt)) throw new Error('Não foi possível atualizar o pré-agendamento local.');
                vinculoNuvem = !!alt.plano_id;
            } else if (_supabase) {
                if (planoNaNuvem && financeiroVinculoAgendaDisponivel) {
                    const r = await _supabase.from('agendamentos').update({plano_id:plano.id,status:'agendado'}).eq('id',a.id);
                    if (!r.error) vinculoNuvem = true;
                    else if (!/plano_id|schema cache|column .* does not exist/i.test(String(r.error.message||''))) throw r.error;
                }
                if (!vinculoNuvem) {
                    const r2 = await _supabase.from('agendamentos').update({status:'agendado'}).eq('id',a.id);
                    if (r2.error) throw r2.error;
                }
            }
            if (vinculoNuvem) {
                removerVinculoAgendaLocal(a.id);
            } else {
                salvarVinculoAgendaLocal(a.id, plano.id, plano.paciente_id, a.procedimento_id, 'agendado');
                locais++;
            }
            a.plano_id = plano.id;
            a.status = 'agendado';
            vinculados++;
        } catch (err) {
            falhas++;
            console.warn('Financeiro: falha ao vincular pré-agendamento ao novo ciclo.',err);
        }
    }
    await carregarFinanceiroPaciente();
    if (!opcoes.silencioso) mensagemFinanceiro(`${vinculados} pré-agendamento(s) vinculado(s) ao pacote${locais ? ` · ${locais} vínculo(s) aguardando sincronização` : ''}${falhas ? ` · ${falhas} falha(s)` : ''}.`, falhas ? 'aviso':'sucesso');
    return {ok:falhas===0,total:vinculados,locais,falhas};
}

function abrirModalPagamento(planoId='') {
    const agCampo=document.getElementById('fin_pag_agendamento_id');if(agCampo)agCampo.value='';
    const grupoPlano=document.getElementById('fin_pag_plano_grupo');if(grupoPlano)grupoPlano.hidden=false;
    ['fin_pag_valores_agendamento','fin_pag_contexto_agendamento'].forEach(id=>{const el=document.getElementById(id);if(el)el.hidden=true;});

    const pacienteId=document.getElementById('financeiro_paciente_select')?.value||'';
    if(!pacienteId){alert('Selecione o paciente.');return;}
    const ativos=financeiroPlanosCache.filter(p=>p.status!=='cancelado');
    const sel=document.getElementById('fin_pag_plano');
    sel.innerHTML='<option value="">-- Selecione --</option>'+ativos.map(p=>`<option value="${escapeHTML(p.id)}">${escapeHTML(p.nome)}</option>`).join('');
    if(planoId) sel.value=planoId;
    document.getElementById('fin_pag_operacao').value=gerarOperacaoFinanceiraId('pag');
    document.getElementById('fin_pag_valor').value='';
    document.getElementById('fin_pag_data').value=new Date().toISOString().slice(0,10);
    definirFormasPagamentoSelecionadas('fin_pag_forma', ['PIX']);
    document.getElementById('fin_pag_observacoes').value='';
    abrirModal('modal_fin_pagamento');
}

async function salvarPagamentoFinanceiro() {
    if(!financeiroPodeEditar()) { alert('Seu perfil não possui permissão para registrar pagamentos.'); return false; }
    const pacienteId=document.getElementById('financeiro_paciente_select')?.value||'';
    const planoId=document.getElementById('fin_pag_plano')?.value||'';
    const valor=numeroFinanceiro(document.getElementById('fin_pag_valor')?.value);
    const formas=serializarFormasPagamento('fin_pag_forma');
    const composicao=typeof validarComposicaoFormasPagamento==='function'
        ? validarComposicaoFormasPagamento('fin_pag_forma',valor)
        : {ok:!!formas,itens:[]};
    if(!pacienteId||!planoId){alert('Selecione o plano.');return false;}
    if(!(valor>0)){alert('Informe um valor de pagamento maior que zero.');return false;}
    if(!formas){alert('Selecione pelo menos uma forma de pagamento.');return false;}
    if(!composicao.ok){alert('Na divisão do pagamento, informe quanto foi recebido em cada forma. A soma deve ser igual ao valor recebido.');return false;}

    const row={
        id:gerarUUIDFinanceiro(),
        plano_id:planoId,
        paciente_id:pacienteId,
        valor,
        forma_pagamento:formas,
        composicao_formas:composicao.itens,
        data_pagamento:document.getElementById('fin_pag_data')?.value||new Date().toISOString().slice(0,10),
        observacoes:document.getElementById('fin_pag_observacoes')?.value.trim()||null,
        criado_por:usuarioLogado?.nome||'Desconhecido',
        criado_em:new Date().toISOString(),
        operacao_id:document.getElementById('fin_pag_operacao')?.value||gerarOperacaoFinanceiraId('pag')
    };

    let salvoNaNuvem=false;
    let erroNuvem=null;
    const planoLocalPendente = obterFinanceiroLocalPaciente(FINANCEIRO_LOCAL_PLANOS,pacienteId).some(p=>String(p.id)===String(planoId) && p.__pending_sync);
    if(_supabase && !planoLocalPendente){
        try{
            const {error}=await _supabase.from('pagamentos').insert([row]);
            if(error && !erroFinanceiroDuplicidade(error)) throw error;
            salvoNaNuvem=true;
            financeiroTabelaDisponivel=true;
        }catch(err){
            erroNuvem=err;
            if(erroFinanceiroTabelaAusente(err)) financeiroTabelaDisponivel=false;
            console.error('Financeiro: falha ao salvar pagamento na nuvem.',err);
        }
    }

    if(!salvoNaNuvem){
        try{ salvarRegistroFinanceiroLocal(FINANCEIRO_LOCAL_PAGAMENTOS,row); }
        catch(err){ alert(`Não foi possível registrar o pagamento. ${err?.message||''}`); return false; }
    }

    fecharModal('modal_fin_pagamento');
    await carregarFinanceiroPaciente();
    if(salvoNaNuvem) mensagemFinanceiro('Pagamento registrado com sucesso.', 'sucesso');
    else mensagemFinanceiro(`Pagamento registrado neste computador${erroNuvem ? ' porque a nuvem não respondeu' : ''}. A sincronização será tentada automaticamente.`, 'aviso');
    return true;
}

async function excluirPagamentoFinanceiro(id) {
    if(window.KineSysFinanceiro?.estornarPagamento) return window.KineSysFinanceiro.estornarPagamento(id);
    alert('Aguarde o carregamento do financeiro para registrar um estorno auditável.');
    return false;
}

async function encerrarPlanoFinanceiro(id) {
    if(!financeiroPodeEditar() || !_supabase)return;
    if(!await confirmarKineSys('Cancelar a contratação e liberar as reservas? Pagamentos e histórico serão preservados. O cancelamento não estorna dinheiro.',{titulo:'Cancelar contratação',confirmar:'Cancelar contratação'}))return;
    const {error}=await _supabase.rpc('kinesys_alterar_contrato',{p_plano_id:id,p_acao:'cancelar',p_motivo:'Cancelamento solicitado no financeiro'});
    if(error){alert(error.message);return;}await carregarFinanceiroPaciente();
}

async function obterPlanosAtivosPaciente(pacienteId, procedimentoId='') {
    if (typeof usuarioEhAdministradorAgenda === 'function' && !usuarioEhAdministradorAgenda()) return [];
    // Agenda/Financeiro: o pacote local é um registro válido para seleção.
    // A sincronização com a nuvem é desejável, mas não pode bloquear a recepção.
    if(!pacienteId)return[];

    let planosLocais = obterFinanceiroLocalPaciente(FINANCEIRO_LOCAL_PLANOS, pacienteId)
        .filter(p => String(p.status || 'ativo') === 'ativo');
    let planosNuvem = [];
    let agendamentosVinculados = [];
    let erroNuvem = null;

    if(_supabase){
        // Não bloqueia o seletor esperando sincronização. Tenta em paralelo.
        sincronizarFinanceiroLocalPaciente(pacienteId).catch(err=>console.warn('Sincronização financeira em segundo plano:',err));
        try{
            const [planosR, agendaR] = await Promise.all([
                _supabase.from('planos_atendimento')
                    .select('id,nome,paciente_id,procedimento_id,sessoes_contratadas,status,valor_final,criado_em,operacao_id')
                    .eq('paciente_id',pacienteId).eq('status','ativo').order('criado_em'),
                _supabase.from('agendamentos')
                    .select('id,plano_id,status,data,hora_inicio,procedimento_id').eq('paciente_id',pacienteId).neq('status','cancelado')
            ]);
            if(planosR.error) throw planosR.error;
            if(agendaR.error && /plano_id/i.test(String(agendaR.error.message||''))) {
                financeiroVinculoAgendaDisponivel = false;
            } else if(agendaR.error) {
                throw agendaR.error;
            } else {
                financeiroVinculoAgendaDisponivel = true;
            }
            planosNuvem = planosR.data || [];
            agendamentosVinculados = enriquecerAgendamentosComVinculoLocal(agendaR.data || []);
            financeiroTabelaDisponivel = true;
        }catch(err){
            erroNuvem = err;
            if(erroFinanceiroTabelaAusente(err))financeiroTabelaDisponivel=false;
            console.warn('Planos na nuvem não disponíveis para a Agenda:',err);
        }
    }

    const idsNuvem = new Set(planosNuvem.map(p=>String(p.id)));
    const mesclados = planosNuvem;
    const consumidasPorPlano={}, reservadasPorPlano={};
    (agendamentosVinculados||[]).forEach(a=>{
        if(!a.plano_id) return;
        const k=String(a.plano_id);
        if(financeiroStatusConsomeSessao(a.status)) consumidasPorPlano[k]=(consumidasPorPlano[k]||0)+1;
        else if(financeiroStatusReservaAgenda(a.status)) reservadasPorPlano[k]=(reservadasPorPlano[k]||0)+1;
    });

    return mesclados
        .filter(p=>String(p.status||'ativo')==='ativo')
        .filter(p=>!procedimentoId||!p.procedimento_id||String(p.procedimento_id)===String(procedimentoId))
        .map(p=>({
            ...p,
            sessoes_realizadas:consumidasPorPlano[String(p.id)]||0,
            sessoes_reservadas:reservadasPorPlano[String(p.id)]||0,
            sessoes_restantes:Math.max(0,(Number(p.sessoes_contratadas)||0)-(consumidasPorPlano[String(p.id)]||0)),
            sessoes_disponiveis_vinculo:Math.max(0,(Number(p.sessoes_contratadas)||0)-(consumidasPorPlano[String(p.id)]||0)-(reservadasPorPlano[String(p.id)]||0)),
            __vinculavel_nuvem:idsNuvem.has(String(p.id)) && financeiroVinculoAgendaDisponivel,
            __vinculavel_local:!idsNuvem.has(String(p.id)) || !financeiroVinculoAgendaDisponivel,
            __vinculavel:true,
            __aguardando_sync:!idsNuvem.has(String(p.id)) && !!p.__pending_sync,
            __vinculo_schema_pendente:idsNuvem.has(String(p.id)) && !financeiroVinculoAgendaDisponivel,
            __erro_nuvem:erroNuvem ? String(erroNuvem.message||erroNuvem) : ''
        }))
        .filter(p=>p.sessoes_disponiveis_vinculo>0);
}

async function reconciliarPlanoFinanceiroPorConsumo(planoId) {
    // O trigger transacional do banco é o único responsável pelo encerramento.
    return !!planoId;
}

async function verificarEncerramentoAutomaticoPlano(planoId) {
    return reconciliarPlanoFinanceiroPorConsumo(planoId);
}

async function popularPlanosNoAgendamento(pacienteId, procedimentoId='', selecionado='') {
    if (typeof usuarioEhAdministradorAgenda === 'function' && !usuarioEhAdministradorAgenda()) {
        const campo=document.getElementById('ag_plano_select'); if(campo){campo.innerHTML='<option value="">Agendamento sem operação financeira</option>';campo.value='';} return;
    }
    const sel=document.getElementById('ag_plano_select'); if(!sel)return;
    const status=document.getElementById('ag_plano_status');
    sel.disabled=true;
    sel.innerHTML='<option value="">Carregando pacotes do Financeiro…</option>';
    if(status) status.textContent='';

    if(!pacienteId){
        sel.innerHTML='<option value="">Selecione um paciente para ver os pacotes</option>';
        sel.disabled=false;
        return;
    }

    try{
        const planos=await obterPlanosAtivosPaciente(pacienteId,procedimentoId);
        let html='<option value="">Sem pacote vinculado</option>';
        html += planos.map(p=>{
            const sufixo = p.__vinculavel_nuvem ? '' : ' · vínculo local';
            return `<option value="${escapeHTML(p.id)}" data-restantes="${Number(p.sessoes_restantes)||0}" data-disponiveis="${Number(p.sessoes_disponiveis_vinculo)||0}" data-reservadas="${Number(p.sessoes_reservadas)||0}" data-unitario="${ehAtendimentoUnitario(p)}" data-contratadas="${Number(p.sessoes_contratadas)||0}">${escapeHTML(p.nome)} · ${p.sessoes_disponiveis_vinculo} cobertura(s) livre(s) · ${p.sessoes_reservadas} já reservada(s)${sufixo}</option>`;
        }).join('');
        sel.innerHTML=html;
        sel.disabled=false;

        if(selecionado&&planos.some(p=>String(p.id)===String(selecionado))) sel.value=selecionado;
        else if(planos.length===1) sel.value=planos[0].id;

        if(status){
            const locais=planos.filter(p=>!p.__vinculavel_nuvem).length;
            if(planos.length) status.textContent=`${planos.length} pacote(s) ativo(s) disponível(is) para vincular${locais ? ` · ${locais} será(ão) preservado(s) localmente até a sincronização` : ''}.`;
            else status.textContent=procedimentoId ? 'Nenhum pacote ativo compatível com este paciente/procedimento.' : 'Nenhum pacote ativo encontrado para este paciente.';
        }
        atualizarResumoPacoteAgendamento();
    }catch(err){
        console.error('Erro ao carregar pacotes no agendamento:',err);
        sel.innerHTML='<option value="">Sem pacote vinculado</option>';
        sel.disabled=false;
        if(status) status.textContent='Não foi possível consultar os pacotes do Financeiro agora.';
    }
}


async function validarPlanoParaAgendamento(planoId, pacienteId, procedimentoId='') {
    if(!planoId) return {ok:true, plano:null, modo:'nenhum'};
    const planos=await obterPlanosAtivosPaciente(pacienteId, procedimentoId);
    const plano=planos.find(p=>String(p.id)===String(planoId));
    if(!plano) return {ok:false, mensagem:'O pacote selecionado não está mais ativo, não pertence a este paciente ou já possui todas as sessões contratadas consumidas/reservadas.'};
    // Se a FK/coluna já existe, usa vínculo nativo. Caso contrário, preserva o
    // vínculo localmente e sincroniza depois sem bloquear a recepção.
    return {ok:true, plano, modo:plano.__vinculavel_nuvem ? 'nuvem' : 'local'};
}


function atualizarResumoPacoteAgendamento() {
    const sel=document.getElementById('ag_plano_select');
    const resumo=document.getElementById('ag_plano_resumo');
    if(!sel||!resumo)return;
    const opt=sel.selectedOptions?.[0];
    if(!sel.value||!opt){resumo.hidden=true;resumo.textContent='';return;}
    const restantes=Number(opt.dataset.restantes||0);
    const disponiveis=Number(opt.dataset.disponiveis||restantes||0);
    const reservadas=Number(opt.dataset.reservadas||0);
    const contratadas=Number(opt.dataset.contratadas||0);
    resumo.hidden=false;
    resumo.textContent=`${opt.dataset.unitario === 'true' ? 'Atendimento unitário selecionado' : 'Pacote selecionado'} · ${disponiveis} cobertura(s) ainda livre(s) para novos horários · ${reservadas} já reservada(s) · ${restantes} sessão(ões) ainda não consumida(s), de ${contratadas}.`;
}

async function atualizarFinanceiroAposAgenda() {
    if(document.getElementById('tela_financeiro')?.classList.contains('ativa') && financeiroPacienteAtualId) await carregarFinanceiroPaciente();
}

if (typeof protegerFuncaoKineSys === 'function') {
    protegerFuncaoKineSys('salvarPlanoFinanceiro', ()=>'financeiro-plano', null, 'Salvando…');
    protegerFuncaoKineSys('salvarPagamentoFinanceiro', ()=>'financeiro-pagamento', null, 'Salvando…');
}


/* Atendimento unitário: reutiliza a cobrança e o consumo existentes, com 1 sessão.
   Sem migração de dados, pagamento automático ou alteração automática de presença. */
let atendimentoUnitarioContexto = null;
let atendimentoUnitarioSalvando = false;

function ehAtendimentoUnitario(registro) {
    return /^unitario[-_]/.test(String(registro?.operacao_id || ''));
}

function valorMonetarioUnitario(valor) {
    const s = String(valor || '').trim();
    if (/^\d+\.\d{1,2}$/.test(s)) return Number(s);
    if (!/^(?:\d+|\d{1,3}(?:\.\d{3})+)(?:,\d{1,2})?$/.test(s)) return NaN;
    return Number(s.replace(/\./g, '').replace(',', '.'));
}

async function idAtendimentoUnitarioAgenda(agendamentoId) {
    // UUID estável: a chave primária também impede duplicação entre abas,
    // independentemente de haver índice único em operacao_id.
    const bytes = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode('KineSys:unitario-agenda:v1:' + agendamentoId))).slice(0, 16);
    bytes[6] = (bytes[6] & 15) | 128;
    bytes[8] = (bytes[8] & 63) | 128;
    const hex = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
    return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
}

function mensagemAtendimentoUnitario(texto) {
    const el = document.getElementById('unitario_feedback');
    if (el) el.textContent = texto;
}

async function abrirCriarAtendimento(origem = 'financeiro') {
    if (!financeiroPodeEditar()) { alert('Somente a administração ou recepção pode criar cobranças de atendimento.'); return; }
    if (atendimentoUnitarioSalvando) return;
    let pacienteId = document.getElementById('financeiro_paciente_select')?.value || '';
    let procedimentoId = '', agendamentoId = '', pacienteNome = '';
    if (origem === 'agenda') {
        pacienteId = document.getElementById('ag_paciente_select')?.value || '';
        procedimentoId = document.getElementById('ag_procedimento_select')?.value || '';
        if (document.getElementById('ag_recorrencia_tipo')?.value !== 'nenhuma') {
            alert('Para um atendimento unitário, escolha “Não repetir” no agendamento.'); return;
        }
    } else if (origem === 'detalhe') {
        const a = agendaAgendamentosSemanaCache.find(x => String(x.id) === String(agendamentoDetalheAtualId))
            || agendaAgendamentosDoDiaCache.find(x => String(x.id) === String(agendamentoDetalheAtualId));
        if (!a) return;
        if (a.plano_id) { alert('Este horário já tem uma cobrança vinculada. Não será criada outra.'); return; }
        if (a.status === 'cancelado') { alert('Não é possível criar uma cobrança para um horário cancelado.'); return; }
        pacienteId = a.paciente_id; procedimentoId = a.procedimento_id;
        agendamentoId = a.id; pacienteNome = a.pacientes?.nome || '';
    }
    if (!pacienteId) { alert('Selecione o paciente antes de criar o atendimento.'); return; }
    const usuarioId = String(usuarioLogado?.id || '');
    const ctx = { origem, pacienteId: String(pacienteId), procedimentoId: String(procedimentoId || ''), agendamentoId,
        usuarioId, row: null, confirmado: false,
        operacaoId: agendamentoId ? 'unitario-agenda-' + agendamentoId : gerarOperacaoFinanceiraId('unitario') };
    atendimentoUnitarioContexto = ctx;
    mensagemAtendimentoUnitario('Carregando procedimentos…');
    await carregarProcedimentosFinanceiro();
    if (atendimentoUnitarioContexto !== ctx || String(usuarioLogado?.id || '') !== usuarioId) return;
    ['unitario_valor','unitario_cortesia','unitario_forma','unitario_observacoes'].forEach(id => { document.getElementById(id).disabled = false; });
    const select = document.getElementById('unitario_procedimento');
    select.innerHTML = '<option value="">-- Selecione --</option>' + financeiroProcedimentosCache
        .filter(p => p.ativo !== false || String(p.id) === ctx.procedimentoId)
        .map(p => `<option value="${escapeHTML(p.id)}" data-valor="${Number(p.valor) || 0}">${escapeHTML(p.nome)}</option>`).join('');
    select.value = ctx.procedimentoId;
    select.disabled = !!ctx.procedimentoId;
    document.getElementById('unitario_valor').value = '';
    document.getElementById('unitario_cortesia').value = '0';
    document.getElementById('unitario_observacoes').value = '';
    document.getElementById('unitario_forma').value = 'PIX';
    document.getElementById('unitario_salvar').disabled = false;
    document.getElementById('unitario_salvar').textContent = 'Criar atendimento';
    const pacienteSelect = document.getElementById(origem === 'agenda' ? 'ag_paciente_select' : 'financeiro_paciente_select');
    document.getElementById('unitario_paciente').textContent = pacienteNome || pacienteSelect?.selectedOptions?.[0]?.textContent || 'Paciente selecionado';
    document.getElementById('unitario_contexto').textContent = origem === 'detalhe'
        ? 'Uma única sessão, vinculada a este horário. O status do atendimento e o pagamento não serão alterados.'
        : origem === 'agenda' ? 'Uma única sessão. Após criar a cobrança, confirme o agendamento para reservar o horário.'
        : 'Uma única sessão, sem pacote. Depois, selecione este atendimento na agenda e registre o pagamento quando recebido.';
    atualizarValorAtendimentoUnitario();
    mensagemAtendimentoUnitario('');
    abrirModal('modal_atendimento_unitario');
}

function atualizarValorAtendimentoUnitario() {
    const opt = document.getElementById('unitario_procedimento')?.selectedOptions?.[0];
    document.getElementById('unitario_valor').value = Number(opt?.dataset?.valor || 0).toFixed(2).replace('.', ',');
    mensagemAtendimentoUnitario('');
}

function fecharAtendimentoUnitario() {
    if (atendimentoUnitarioSalvando) return;
    fecharModal('modal_atendimento_unitario');
    atendimentoUnitarioContexto = null;
}

async function salvarAtendimentoUnitario() {
    const ctx = atendimentoUnitarioContexto;
    if (!ctx || atendimentoUnitarioSalvando) return false;
    const btn = document.getElementById('unitario_salvar');
    try {
        if (!financeiroPodeEditar() || String(usuarioLogado?.id || '') !== ctx.usuarioId) throw Error('A sessão mudou. Reabra o atendimento.');
        if (!_supabase) throw Error('Conecte-se à internet para registrar este atendimento.');
        const procedimentoId = document.getElementById('unitario_procedimento').value;
        const valor = valorMonetarioUnitario(document.getElementById('unitario_valor').value);
        const desconto = valorMonetarioUnitario(document.getElementById('unitario_cortesia').value || '0');
        if (!procedimentoId) throw Error('Selecione o procedimento.');
        if (!Number.isFinite(valor) || valor < 0 || !document.getElementById('unitario_valor').value.trim()) throw Error('Informe um valor válido.');
        if (!Number.isFinite(desconto) || desconto < 0 || desconto > valor) throw Error('A cortesia deve estar entre zero e o valor do atendimento.');
        if (ctx.origem === 'agenda' && (String(document.getElementById('ag_paciente_select').value) !== ctx.pacienteId
            || String(document.getElementById('ag_procedimento_select').value) !== procedimentoId
            || document.getElementById('ag_recorrencia_tipo').value !== 'nenhuma')) throw Error('O agendamento mudou. Feche e reabra o atendimento unitário.');
        atendimentoUnitarioSalvando = true;
        btn.disabled = true; btn.textContent = 'Salvando…'; mensagemAtendimentoUnitario('');
        let horario = null;
        if (ctx.agendamentoId) {
            const r = await _supabase.from('agendamentos').select('id,paciente_id,procedimento_id,plano_id,status').eq('id', ctx.agendamentoId).single();
            if (r.error) throw r.error;
            horario = r.data;
            if (!horario || String(horario.paciente_id) !== ctx.pacienteId || String(horario.procedimento_id) !== procedimentoId || horario.status === 'cancelado') throw Error('O horário foi alterado ou não está disponível. Atualize a agenda.');
        }
        // A chave da operação permanece estável em novas tentativas e, no detalhe,
        // também entre abas. Uma resposta perdida não deve gerar outra cobrança.
        const existente = await _supabase.from('planos_atendimento').select('*').eq('operacao_id', ctx.operacaoId).maybeSingle();
        if (existente.error) throw existente.error;
        if (existente.data) {
            if (!ehAtendimentoUnitario(existente.data) || String(existente.data.paciente_id) !== ctx.pacienteId
                || String(existente.data.procedimento_id) !== procedimentoId || Number(existente.data.sessoes_contratadas) !== 1
                || existente.data.status === 'cancelado') throw Error('A cobrança existente não é compatível. Confira o Financeiro.');
            ctx.row = existente.data; ctx.confirmado = true;
        }
        if (horario?.plano_id && String(horario.plano_id) !== String(ctx.row?.id || '')) throw Error('Este horário já tem outra cobrança vinculada. Nenhum vínculo será substituído.');
        if (!ctx.row) {
            const proc = financeiroProcedimentosCache.find(p => String(p.id) === procedimentoId);
            ctx.row = { id: ctx.agendamentoId ? await idAtendimentoUnitarioAgenda(ctx.agendamentoId) : gerarUUIDFinanceiro(), paciente_id: ctx.pacienteId, procedimento_id: procedimentoId,
                nome: 'Atendimento unitário — ' + (proc?.nome || 'Sessão'), sessoes_contratadas: 1,
                valor_tabela: valor, desconto_valor: desconto, desconto_pacote: 0, desconto_cortesia: desconto,
                valor_final: Math.round((valor - desconto) * 100) / 100,
                forma_pagamento_prevista: document.getElementById('unitario_forma').value, parcelas: 1,
                observacoes: document.getElementById('unitario_observacoes').value.trim() || null,
                status: 'ativo', criado_por: usuarioLogado?.nome || 'Desconhecido', criado_em: new Date().toISOString(), operacao_id: ctx.operacaoId };
        }
        if (!ctx.confirmado) {
            if (atendimentoUnitarioContexto !== ctx || !financeiroPodeEditar() || String(usuarioLogado?.id || '') !== ctx.usuarioId) throw Error('A sessão mudou. Reabra o atendimento antes de salvar.');
            // O conteúdo da operação não muda durante uma tentativa de recuperação.
            ['unitario_procedimento','unitario_valor','unitario_cortesia','unitario_forma','unitario_observacoes'].forEach(id => { document.getElementById(id).disabled = true; });
            const r = await _supabase.from('planos_atendimento').insert([ctx.row]).select('id').single();
            if (r.error) {
                const recuperado = await _supabase.from('planos_atendimento').select('*').eq('operacao_id', ctx.operacaoId).maybeSingle();
                if (recuperado.error || !recuperado.data || String(recuperado.data.paciente_id) !== ctx.pacienteId
                    || String(recuperado.data.procedimento_id) !== procedimentoId || Number(recuperado.data.sessoes_contratadas) !== 1
                    || !ehAtendimentoUnitario(recuperado.data) || recuperado.data.status === 'cancelado') throw r.error;
                ctx.row = recuperado.data;
            } else if (String(r.data?.id) !== String(ctx.row.id)) throw Error('O servidor não confirmou a criação. Tente novamente.');
            ctx.confirmado = true;
        }
        if (!financeiroPodeEditar() || String(usuarioLogado?.id || '') !== ctx.usuarioId) throw Error('A cobrança foi criada, mas a sessão mudou. Confira o Financeiro antes de continuar.');
        if (horario && !horario.plano_id) {
            const r = await _supabase.from('agendamentos').update({ plano_id: ctx.row.id })
                .eq('id', ctx.agendamentoId).eq('paciente_id', ctx.pacienteId).eq('procedimento_id', procedimentoId)
                .eq('status', horario.status).is('plano_id', null).select('id');
            if (r.error) throw r.error;
            if (r.data?.length !== 1) {
                const confirmado = await _supabase.from('agendamentos').select('plano_id').eq('id', ctx.agendamentoId).single();
                if (confirmado.error || String(confirmado.data?.plano_id) !== String(ctx.row.id)) throw Error('O horário mudou. A cobrança está no Financeiro, mas o vínculo não foi confirmado.');
            }
            if (typeof removerVinculoAgendaLocal === 'function') removerVinculoAgendaLocal(ctx.agendamentoId);
        }
        if (ctx.origem === 'agenda') {
            await popularPlanosNoAgendamento(ctx.pacienteId, procedimentoId, ctx.row.id);
            if (String(document.getElementById('ag_plano_select').value) !== String(ctx.row.id)) throw Error('A cobrança está no Financeiro. Atualize a lista para selecioná-la neste horário.');
            atualizarResumoRecorrencia();
            mostrarFeedbackAgendaModal('Atendimento unitário criado e selecionado. Confirme o agendamento para salvar o horário. O pagamento continua pendente.', 'info');
        } else if (ctx.origem === 'detalhe') {
            await reconciliarPlanoFinanceiroPorConsumo(ctx.row.id);
            fecharModal('modal_detalhe_agendamento');
            await renderizarPainelAgenda();
        } else {
            await carregarFinanceiroPaciente();
            mensagemFinanceiro('Atendimento unitário criado: 1 sessão. Vincule na agenda e registre o pagamento quando recebido.', 'sucesso');
        }
        fecharModal('modal_atendimento_unitario'); atendimentoUnitarioContexto = null;
        return true;
    } catch (err) {
        mensagemAtendimentoUnitario((ctx?.confirmado ? 'A cobrança já foi criada. Não crie outra; tente concluir novamente. ' : '') + (err.message || 'Não foi possível confirmar no servidor. Tente novamente.'));
        return false;
    } finally {
        atendimentoUnitarioSalvando = false;
        if (btn) { btn.disabled = false; btn.textContent = ctx?.confirmado ? 'Concluir vínculo' : 'Criar atendimento'; }
    }
}


// Ponte de compatibilidade: expõe somente leitura para o módulo 1.19.0.
window.kinesysObterEstadoFinanceiro=()=>({planos:financeiroPlanosCache,pagamentos:financeiroPagamentosCache,agendamentos:financeiroAgendamentosCache,metricas:metricasPlano,supabase:_supabase,pacienteId:financeiroPacienteAtualId});

