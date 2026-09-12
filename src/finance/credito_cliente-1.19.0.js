/* ==========================================================================\n   KineSys — CRÉDITO DO PACIENTE v1.11.2\n   - Excedente recebido acima do saldo do plano vira crédito disponível.\n   - Crédito pode ser aplicado a cobranças futuras sem contar como novo dinheiro recebido.\n   - Uso de crédito participa da cobertura paga das sessões na Agenda.\n   ========================================================================== */

var financeiroCreditosUsosCache = [];
var financeiroCreditoTabelaDisponivel = true;
const FINANCEIRO_LOCAL_CREDITOS_USOS = 'kinesys_financeiro_creditos_usos_v1112';
const FINANCEIRO_LOCAL_CREDITOS_EXCLUIDOS = 'kinesys_financeiro_creditos_usos_excluidos_v1112';

function erroTabelaCreditoAusente(err) {
    return /creditos_paciente_usos|schema cache|does not exist|relation|could not find the table|column .* does not exist/i.test(String(err?.message || err || ''));
}

function obterUsosCreditoLocaisPaciente(pacienteId='') {
    return lerFinanceiroLocal(FINANCEIRO_LOCAL_CREDITOS_USOS)
        .filter(x => !pacienteId || String(x.paciente_id || '') === String(pacienteId || ''));
}

function obterExclusoesCreditosPendentes(pacienteId='') {
    return lerFinanceiroLocal(FINANCEIRO_LOCAL_CREDITOS_EXCLUIDOS)
        .filter(x => !pacienteId || String(x.paciente_id || '') === String(pacienteId || ''));
}

function usoCreditoEstaMarcadoParaExclusao(uso, exclusoes=null) {
    if (!uso) return false;
    const lista = exclusoes || obterExclusoesCreditosPendentes(uso.paciente_id || '');
    return lista.some(x => String(x.id || '') === String(uso.id || '') || (!!x.operacao_id && !!uso.operacao_id && String(x.operacao_id) === String(uso.operacao_id)));
}

function marcarUsoCreditoParaExclusao(uso) {
    const lista = lerFinanceiroLocal(FINANCEIRO_LOCAL_CREDITOS_EXCLUIDOS);
    const idx = lista.findIndex(x => String(x.id || '') === String(uso.id || ''));
    const row = {
        id: uso.id,
        paciente_id: uso.paciente_id || financeiroPacienteAtualId || '',
        plano_id: uso.plano_id || null,
        operacao_id: uso.operacao_id || null,
        excluido_em: new Date().toISOString(),
        __pending_sync: true
    };
    if (idx >= 0) lista[idx] = { ...lista[idx], ...row };
    else lista.push(row);
    if (!gravarFinanceiroLocal(FINANCEIRO_LOCAL_CREDITOS_EXCLUIDOS, lista)) throw new Error('Não foi possível preservar o estorno do crédito neste computador.');
    return row;
}

function removerMarcacaoExclusaoCredito(id) {
    const lista = lerFinanceiroLocal(FINANCEIRO_LOCAL_CREDITOS_EXCLUIDOS).filter(x => String(x.id || '') !== String(id || ''));
    gravarFinanceiroLocal(FINANCEIRO_LOCAL_CREDITOS_EXCLUIDOS, lista);
}

function calcularComponentesCreditoPaciente(pagamentos=financeiroPagamentosCache, planos=financeiroPlanosCache, usos=financeiroCreditosUsosCache) {
    const pagamentosValidos = (pagamentos || []).filter(p => !pagamentoEstaMarcadoParaExclusao(p));
    const usosValidos = (usos || []).filter(u => !usoCreditoEstaMarcadoParaExclusao(u));
    const porPlanoPag = new Map();
    const porPlanoUso = new Map();
    pagamentosValidos.forEach(p => {
        const k = String(p.plano_id || '');
        if (!k) return;
        porPlanoPag.set(k, (porPlanoPag.get(k) || 0) + (Number(p.valor) || 0));
    });
    usosValidos.forEach(u => {
        const k = String(u.plano_id || '');
        if (!k) return;
        porPlanoUso.set(k, (porPlanoUso.get(k) || 0) + Math.max(0, Number(u.valor) || 0));
    });
    let gerado = 0;
    (planos || []).forEach(plano => {
        const k = String(plano.id || '');
        const recebido = porPlanoPag.get(k) || 0;
        const creditoAplicado = porPlanoUso.get(k) || 0;
        const valorFinal = Math.max(0, Number(plano.valor_final) || 0);
        const valorQueAindaPrecisavaSerPagoEmDinheiro = Math.max(0, valorFinal - creditoAplicado);
        gerado += Math.max(0, recebido - valorQueAindaPrecisavaSerPagoEmDinheiro);
    });
    const usado = usosValidos.reduce((s,u)=>s+Math.max(0,Number(u.valor)||0),0);
    const liquido = gerado - usado;
    return { gerado, usado, liquido, disponivel:Math.max(0,liquido) };
}

function calcularCreditoDisponivelPaciente() {
    return calcularComponentesCreditoPaciente().disponivel;
}

function creditoAplicadoPlano(planoId, usos=financeiroCreditosUsosCache) {
    return (usos || []).filter(u => String(u.plano_id || '') === String(planoId || '') && !usoCreditoEstaMarcadoParaExclusao(u))
        .reduce((s,u)=>s+Math.max(0,Number(u.valor)||0),0);
}

const financeiroResumoPagamentoPlanoSemCredito = financeiroResumoPagamentoPlano;
financeiroResumoPagamentoPlano = function(plano, pagamentos=[], usosCredito=financeiroCreditosUsosCache) {
    const contratadas = Math.max(0, Number(plano?.sessoes_contratadas) || 0);
    const valorFinal = Math.max(0, Number(plano?.valor_final) || 0);
    const recebido = (pagamentos || [])
        .filter(p => String(p?.plano_id || '') === String(plano?.id || '') && !pagamentoEstaMarcadoParaExclusao(p))
        .reduce((s,p)=>s+(Number(p?.valor)||0),0);
    const creditoAplicado = (usosCredito || [])
        .filter(u => String(u?.plano_id || '') === String(plano?.id || '') && !usoCreditoEstaMarcadoParaExclusao(u))
        .reduce((s,u)=>s+Math.max(0,Number(u?.valor)||0),0);
    const pagoEfetivo = recebido + creditoAplicado;
    const semCobranca = valorFinal <= 0.009;
    const quitado = semCobranca || pagoEfetivo >= (valorFinal - 0.009);
    let sessoesPagas = 0;
    if (!semCobranca && contratadas > 0 && pagoEfetivo > 0) {
        if (quitado) sessoesPagas = contratadas;
        else {
            const valorSessao = valorFinal / contratadas;
            sessoesPagas = valorSessao > 0 ? Math.min(contratadas, Math.floor((pagoEfetivo / valorSessao) + 1e-9)) : 0;
        }
    }
    return {
        contratadas,
        valorFinal,
        pagos:Math.min(valorFinal,pagoEfetivo),
        recebido,
        creditoAplicado,
        saldo:Math.max(0,valorFinal-pagoEfetivo),
        semCobranca,
        quitado,
        sessoesPagas,
        creditoGerado:Math.max(0, recebido - Math.max(0, valorFinal-creditoAplicado))
    };
};

const metricasPlanoSemCredito = metricasPlano;
metricasPlano = function(plano) {
    const vinculados = financeiroAgendamentosCache.filter(a=>String(a.plano_id||'')===String(plano.id));
    const atendidas = vinculados.filter(a=>['atendido','concluido'].includes(String(a.status||''))).length;
    const faltasNaoJustificadas = vinculados.filter(a=>String(a.status||'')==='falta_nao_justificada').length;
    const consumidas = vinculados.filter(a=>financeiroStatusConsomeSessao(a.status)).length;
    const agendadas = vinculados.filter(a=>financeiroStatusReservaAgenda(a.status)).length;
    const contratadas = Math.max(0, Number(plano.sessoes_contratadas)||0);
    const restantes = Math.max(0, contratadas-consumidas);
    const disponiveisVinculo = Math.max(0, contratadas-consumidas-agendadas);
    const resumo = financeiroResumoPagamentoPlano(plano, financeiroPagamentosCache, financeiroCreditosUsosCache);
    return {
        contratadas,
        realizadas:consumidas,
        consumidas,
        atendidas,
        faltasNaoJustificadas,
        agendadas,
        restantes,
        disponiveisVinculo,
        pagos:resumo.pagos,
        recebido:resumo.recebido,
        creditoAplicado:resumo.creditoAplicado,
        creditoGerado:resumo.creditoGerado,
        valorFinal:resumo.valorFinal,
        saldo:resumo.saldo
    };
};

async function sincronizarExclusoesCreditosLocais(pacienteId='') {
    if (!_supabase || !financeiroCreditoTabelaDisponivel) return false;
    const pendentes = obterExclusoesCreditosPendentes(pacienteId);
    let ok = true;
    for (const exclusao of pendentes) {
        try {
            const { error } = await _supabase.from('creditos_paciente_usos').delete().eq('id', exclusao.id);
            if (error) throw error;
            removerMarcacaoExclusaoCredito(exclusao.id);
        } catch (err) {
            ok = false;
            if (erroTabelaCreditoAusente(err)) financeiroCreditoTabelaDisponivel = false;
            console.warn('Financeiro: estorno de crédito aguardando sincronização.', err);
            break;
        }
    }
    return ok;
}

async function sincronizarUsosCreditoLocais(pacienteId='') {
    if (!_supabase || !financeiroCreditoTabelaDisponivel) return false;
    const exclusoesOk = await sincronizarExclusoesCreditosLocais(pacienteId);
    if (!exclusoesOk && obterExclusoesCreditosPendentes(pacienteId).length) return false;
    const exclusoes = obterExclusoesCreditosPendentes(pacienteId);
    const pendentes = obterUsosCreditoLocaisPaciente(pacienteId).filter(x => x.__pending_sync && !usoCreditoEstaMarcadoParaExclusao(x,exclusoes));
    for (const uso of pendentes) {
        try {
            const row = limparMetadadosFinanceiroLocal(uso);
            const { error } = await _supabase.from('creditos_paciente_usos').upsert([row], {onConflict:'id'});
            if (error && !erroFinanceiroDuplicidade(error)) throw error;
            removerRegistroFinanceiroLocal(FINANCEIRO_LOCAL_CREDITOS_USOS, uso.id, uso.operacao_id);
        } catch (err) {
            if (erroTabelaCreditoAusente(err)) financeiroCreditoTabelaDisponivel = false;
            console.warn('Financeiro: uso de crédito aguardando sincronização.', err);
            return false;
        }
    }
    return true;
}

const sincronizarFinanceiroLocalPacienteSemCredito = sincronizarFinanceiroLocalPaciente;
sincronizarFinanceiroLocalPaciente = async function(pacienteId) {
    const okBase = await sincronizarFinanceiroLocalPacienteSemCredito(pacienteId);
    let okCredito = true;
    if (_supabase && financeiroCreditoTabelaDisponivel) okCredito = await sincronizarUsosCreditoLocais(pacienteId);
    return !!okBase && !!okCredito;
};

async function carregarCreditosUsosPaciente(pacienteId) {
    if (!pacienteId) { financeiroCreditosUsosCache=[]; return []; }
    const exclusoes = obterExclusoesCreditosPendentes(pacienteId);
    let locais = obterUsosCreditoLocaisPaciente(pacienteId).filter(u=>!usoCreditoEstaMarcadoParaExclusao(u,exclusoes));
    let nuvem=[];
    if (_supabase && financeiroCreditoTabelaDisponivel) {
        try {
            const {data,error} = await _supabase.from('creditos_paciente_usos').select('*').eq('paciente_id',pacienteId).order('data_uso',{ascending:false}).order('criado_em',{ascending:false});
            if (error) throw error;
            nuvem=data||[];
            financeiroCreditoTabelaDisponivel=true;
        } catch(err) {
            if (erroTabelaCreditoAusente(err)) financeiroCreditoTabelaDisponivel=false;
            else console.warn('Financeiro: não foi possível carregar usos de crédito.',err);
        }
    }
    financeiroCreditosUsosCache = mesclarRegistrosFinanceiros(nuvem,locais).filter(u=>!usoCreditoEstaMarcadoParaExclusao(u,exclusoes));
    return financeiroCreditosUsosCache;
}

const carregarFinanceiroPacienteSemCredito = carregarFinanceiroPaciente;
carregarFinanceiroPaciente = async function() {
    financeiroCreditosUsosCache=[];
    await carregarFinanceiroPacienteSemCredito();
    if (financeiroPacienteAtualId) {
        await carregarCreditosUsosPaciente(financeiroPacienteAtualId);
        renderizarFinanceiroPaciente();
    }
};

const renderizarFinanceiroVazioSemCredito = renderizarFinanceiroVazio;
renderizarFinanceiroVazio = function() {
    financeiroCreditosUsosCache=[];
    renderizarFinanceiroVazioSemCredito();
    const stat=document.getElementById('fin_stat_credito'); if(stat)stat.textContent='R$ 0,00';
    const aviso=document.getElementById('financeiro_credito_aviso'); if(aviso){aviso.hidden=true;aviso.innerHTML='';}
};

const renderizarFinanceiroPacienteSemCredito = renderizarFinanceiroPaciente;
renderizarFinanceiroPaciente = function() {
    renderizarFinanceiroPacienteSemCredito();
    const componentes = calcularComponentesCreditoPaciente();
    const statCredito=document.getElementById('fin_stat_credito');
    if(statCredito) statCredito.textContent=moedaBR(componentes.disponivel);
    const saldoTotal = financeiroPlanosCache.filter(p=>String(p.status||'')!=='cancelado').reduce((s,p)=>s+metricasPlano(p).saldo,0);
    const statSaldo=document.getElementById('fin_stat_saldo'); if(statSaldo)statSaldo.textContent=moedaBR(saldoTotal);
    const aviso=document.getElementById('financeiro_credito_aviso');
    if(aviso){
        if(componentes.disponivel>0.009){
            aviso.hidden=false;
            aviso.innerHTML=`<span>Este paciente possui valor já pago disponível para outros procedimentos.</span><strong>${escapeHTML(moedaBR(componentes.disponivel))} em crédito</strong>`;
        }else{aviso.hidden=true;aviso.innerHTML='';}
    }

    const cards=Array.from(document.querySelectorAll('#financeiro_planos_lista .finance-plan-card'));
    financeiroPlanosCache.forEach((plano,i)=>{
        const card=cards[i]; if(!card)return;
        const m=metricasPlano(plano);
        if(m.creditoAplicado>0.009 || m.creditoGerado>0.009){
            const nota=document.createElement('div'); nota.className='finance-credit-note';
            const partes=[];
            if(m.creditoAplicado>0.009)partes.push(`${moedaBR(m.creditoAplicado)} abatidos com crédito do paciente`);
            if(m.creditoGerado>0.009)partes.push(`${moedaBR(m.creditoGerado)} gerados como crédito por pagamento excedente`);
            nota.textContent=partes.join(' · ');
            card.appendChild(nota);
        }
    });

    const pagamentosEl=document.getElementById('financeiro_pagamentos_lista');
    if(pagamentosEl && financeiroCreditosUsosCache.length){
        const vazio=pagamentosEl.querySelector('.finance-empty'); if(vazio)vazio.remove();
        const titulo=document.createElement('div');
        titulo.className='finance-credit-note';
        titulo.textContent='Movimentações de crédito usadas em procedimentos futuros';
        pagamentosEl.appendChild(titulo);
        financeiroCreditosUsosCache.slice().sort((a,b)=>`${b.data_uso||''} ${b.criado_em||''}`.localeCompare(`${a.data_uso||''} ${a.criado_em||''}`)).forEach(u=>{
            const plano=financeiroPlanosCache.find(p=>String(p.id)===String(u.plano_id));
            const data=u.data_uso?new Date(u.data_uso+'T00:00:00').toLocaleDateString('pt-BR'):'—';
            const row=document.createElement('div'); row.className='finance-payment-row finance-credit-use-row';
            row.innerHTML=`<div><strong>− ${escapeHTML(moedaBR(u.valor))}</strong><span class="credit-label">Crédito utilizado · ${escapeHTML(plano?.nome||'Procedimento futuro')}</span></div><div class="finance-payment-meta"><b>${escapeHTML(data)}</b>${u.observacoes?`<small>${escapeHTML(u.observacoes)}</small>`:''}<button type="button" class="finance-credit-use-delete" onclick="estornarUsoCreditoFinanceiro('${escapeHTML(u.id)}')">Estornar uso</button></div>`;
            pagamentosEl.appendChild(row);
        });
    }
};

const obterMapaPagamentoAgendamentosSemCredito = obterMapaPagamentoAgendamentos;
obterMapaPagamentoAgendamentos = async function(agendamentosBase=[]) {
    const base=enriquecerAgendamentosComVinculoLocal(Array.isArray(agendamentosBase)?agendamentosBase:[]);
    const resultado=new Map();
    base.forEach(a=>resultado.set(String(a.id||''),{verificado:!a.plano_id,pago:false,semCobranca:false,cobravel:true,planoId:a.plano_id||null,motivo:a.plano_id?'nao_verificado':'sem_pacote'}));
    const planoIds=[...new Set(base.map(a=>String(a.plano_id||'')).filter(Boolean))];
    if(!planoIds.length)return resultado;

    let planos=lerFinanceiroLocal(FINANCEIRO_LOCAL_PLANOS).filter(p=>planoIds.includes(String(p.id||'')));
    let pagamentos=lerFinanceiroLocal(FINANCEIRO_LOCAL_PAGAMENTOS).filter(p=>planoIds.includes(String(p.plano_id||''))).filter(p=>!pagamentoEstaMarcadoParaExclusao(p));
    let usos=lerFinanceiroLocal(FINANCEIRO_LOCAL_CREDITOS_USOS).filter(u=>planoIds.includes(String(u.plano_id||''))).filter(u=>!usoCreditoEstaMarcadoParaExclusao(u));
    let todosAgendamentos=[...base];
    let pagamentosVerificados=!_supabase;
    let usosVerificados=!_supabase || !financeiroCreditoTabelaDisponivel;
    let agendaCompletaVerificada=!_supabase;
    if(typeof lerAgendamentosPendentesSync==='function'){
        const pendentes=(lerAgendamentosPendentesSync()||[]).map(x=>x?.payload).filter(Boolean);
        todosAgendamentos=financeiroMesclarAgendamentosPorId(todosAgendamentos,enriquecerAgendamentosComVinculoLocal(pendentes));
    }
    if(_supabase){
        try{const r=await _supabase.from('planos_atendimento').select('id,paciente_id,procedimento_id,sessoes_contratadas,valor_final,status').in('id',planoIds);if(!r.error)planos=mesclarRegistrosFinanceiros(r.data||[],planos);}catch(_){}
        try{const r=await _supabase.from('pagamentos').select('id,plano_id,paciente_id,valor,data_pagamento,criado_em').in('plano_id',planoIds);if(!r.error){pagamentos=mesclarRegistrosFinanceiros(r.data||[],pagamentos).filter(p=>!pagamentoEstaMarcadoParaExclusao(p));pagamentosVerificados=true;}}catch(_){}
        if(financeiroCreditoTabelaDisponivel){
            try{const r=await _supabase.from('creditos_paciente_usos').select('id,plano_id,paciente_id,valor,data_uso,criado_em').in('plano_id',planoIds);if(r.error)throw r.error;usos=mesclarRegistrosFinanceiros(r.data||[],usos).filter(u=>!usoCreditoEstaMarcadoParaExclusao(u));usosVerificados=true;}catch(err){if(erroTabelaCreditoAusente(err)){financeiroCreditoTabelaDisponivel=false;usosVerificados=true;}}
        }
        try{const r=await _supabase.from('agendamentos').select('id,plano_id,paciente_id,procedimento_id,status,data,hora_inicio').in('plano_id',planoIds);if(!r.error){todosAgendamentos=financeiroMesclarAgendamentosPorId(r.data||[],todosAgendamentos);todosAgendamentos=enriquecerAgendamentosComVinculoLocal(todosAgendamentos);agendaCompletaVerificada=true;}}catch(_){}
    }
    const planosMap=new Map(planos.map(p=>[String(p.id||''),p]));
    for(const planoId of planoIds){
        const plano=planosMap.get(String(planoId)); if(!plano)continue;
        const resumo=financeiroResumoPagamentoPlano(plano,pagamentos,usos);
        const elegiveis=todosAgendamentos.filter(a=>String(a.plano_id||'')===String(planoId)&&financeiroStatusElegivelCoberturaPagamento(a.status)).sort(financeiroOrdenarAgendamentosCronologicamente);
        const idsPagos=new Set(elegiveis.slice(0,resumo.sessoesPagas).map(a=>String(a.id||'')));
        const parcialPrecisaOrdem=!resumo.semCobranca&&!resumo.quitado&&resumo.sessoesPagas>0;
        const verificado=pagamentosVerificados&&usosVerificados&&(!parcialPrecisaOrdem||agendaCompletaVerificada);
        base.filter(a=>String(a.plano_id||'')===String(planoId)).forEach(a=>{
            const elegivel=financeiroStatusElegivelCoberturaPagamento(a.status);
            resultado.set(String(a.id||''),{verificado,pago:verificado&&elegivel&&idsPagos.has(String(a.id||'')),semCobranca:resumo.semCobranca,cobravel:!resumo.semCobranca,planoId,planoQuitado:resumo.quitado,pagos:resumo.pagos,valorFinal:resumo.valorFinal,sessoesPagas:resumo.sessoesPagas,creditoAplicado:resumo.creditoAplicado,motivo:resumo.semCobranca?'sem_cobranca':(idsPagos.has(String(a.id||''))?'pago':'pagamento_pendente')});
        });
    }
    return resultado;
};

function atualizarResumoPagamentoFinanceiro() {
    const box=document.getElementById('fin_pag_credito_box'); if(!box)return;
    const planoId=document.getElementById('fin_pag_plano')?.value||'';
    const chk=document.getElementById('fin_pag_usar_credito');
    const hidden=document.getElementById('fin_pag_credito_valor');
    const out=document.getElementById('fin_pag_credito_disponivel');
    const resumoEl=document.getElementById('fin_pag_resumo_calculo');
    if(!planoId){box.hidden=true;if(chk)chk.checked=false;if(hidden)hidden.value='0';return;}
    const plano=financeiroPlanosCache.find(p=>String(p.id)===String(planoId));
    if(!plano){box.hidden=true;return;}
    const credito=calcularCreditoDisponivelPaciente();
    const m=metricasPlano(plano);
    const dinheiro=Math.max(0,numeroFinanceiro(document.getElementById('fin_pag_valor')?.value));
    const usar=!!chk?.checked&&credito>0.009;
    const creditoUsar=usar?Math.min(credito,Math.max(0,m.saldo-dinheiro)):0;
    const restante=Math.max(0,m.saldo-dinheiro-creditoUsar);
    const creditoNovo=Math.max(0,dinheiro-Math.max(0,m.saldo-creditoUsar));
    box.hidden=false;
    if(out)out.textContent=moedaBR(credito);
    if(hidden)hidden.value=creditoUsar.toFixed(2);
    if(chk){chk.disabled=credito<=0.009;if(credito<=0.009)chk.checked=false;}
    if(resumoEl){
        const partes=[`Saldo desta cobrança: <b>${escapeHTML(moedaBR(m.saldo))}</b>`];
        if(creditoUsar>0.009)partes.push(`Crédito aplicado: <b>${escapeHTML(moedaBR(creditoUsar))}</b>`);
        if(restante>0.009)partes.push(`Ainda ficará pendente: <b>${escapeHTML(moedaBR(restante))}</b>`); else partes.push('<b>Cobrança quitada</b>');
        if(creditoNovo>0.009)partes.push(`Excedente que ficará como novo crédito: <b>${escapeHTML(moedaBR(creditoNovo))}</b>`);
        resumoEl.innerHTML=partes.join(' · ');
    }
}

const abrirModalPagamentoSemCredito = abrirModalPagamento;
abrirModalPagamento = function(planoId='') {
    abrirModalPagamentoSemCredito(planoId);
    const chk=document.getElementById('fin_pag_usar_credito'); if(chk)chk.checked=false;
    const hidden=document.getElementById('fin_pag_credito_valor'); if(hidden)hidden.value='0';
    atualizarResumoPagamentoFinanceiro();
};

async function salvarUsoCredito(row) {
    let salvoNuvem=false, erroNuvem=null;
    if(_supabase && financeiroCreditoTabelaDisponivel){
        try{
            const {error}=await _supabase.from('creditos_paciente_usos').insert([row]);
            if(error&&!erroFinanceiroDuplicidade(error))throw error;
            salvoNuvem=true;
            financeiroCreditoTabelaDisponivel=true;
        }catch(err){
            erroNuvem=err;
            if(erroTabelaCreditoAusente(err))financeiroCreditoTabelaDisponivel=false;
        }
    }
    if(!salvoNuvem) salvarRegistroFinanceiroLocal(FINANCEIRO_LOCAL_CREDITOS_USOS,row);
    return {salvoNuvem,erroNuvem};
}

salvarPagamentoFinanceiro = async function() {
    if(!financeiroPodeEditar()){alert('Seu perfil não possui permissão para registrar pagamentos.');return false;}
    const pacienteId=document.getElementById('financeiro_paciente_select')?.value||'';
    const planoId=document.getElementById('fin_pag_plano')?.value||'';
    const valor=Math.max(0,numeroFinanceiro(document.getElementById('fin_pag_valor')?.value));
    const formas=serializarFormasPagamento('fin_pag_forma');
    if(!pacienteId||!planoId){alert('Selecione o plano/cobrança.');return false;}
    const plano=financeiroPlanosCache.find(p=>String(p.id)===String(planoId));
    if(!plano){alert('Plano/cobrança não encontrado. Atualize o Financeiro e tente novamente.');return false;}
    const creditoAntes=calcularCreditoDisponivelPaciente();
    const mAntes=metricasPlano(plano);
    const usarCredito=!!document.getElementById('fin_pag_usar_credito')?.checked;
    const creditoSolicitado=usarCredito?Math.max(0,Number(document.getElementById('fin_pag_credito_valor')?.value)||0):0;
    const creditoUsado=Math.min(creditoAntes,creditoSolicitado,Math.max(0,mAntes.saldo-valor));
    if(!(valor>0)||!formas){
        if(valor>0&&!formas){alert('Selecione pelo menos uma forma de pagamento.');return false;}
        if(!(valor>0)&&!(creditoUsado>0)){alert('Informe um valor recebido ou marque o uso do crédito disponível.');return false;}
    }
    const data=document.getElementById('fin_pag_data')?.value||new Date().toISOString().slice(0,10);
    const obs=document.getElementById('fin_pag_observacoes')?.value.trim()||null;
    const operacaoBase=document.getElementById('fin_pag_operacao')?.value||gerarOperacaoFinanceiraId('pag');
    let pagamentoSalvoNuvem=false, pagamentoErroNuvem=null;
    if(valor>0){
        const row={id:gerarUUIDFinanceiro(),plano_id:planoId,paciente_id:pacienteId,valor,forma_pagamento:formas,data_pagamento:data,observacoes:obs,criado_por:usuarioLogado?.nome||'Desconhecido',criado_em:new Date().toISOString(),operacao_id:operacaoBase};
        const planoLocalPendente=obterFinanceiroLocalPaciente(FINANCEIRO_LOCAL_PLANOS,pacienteId).some(p=>String(p.id)===String(planoId)&&p.__pending_sync);
        if(_supabase&&!planoLocalPendente){
            try{const {error}=await _supabase.from('pagamentos').insert([row]);if(error&&!erroFinanceiroDuplicidade(error))throw error;pagamentoSalvoNuvem=true;financeiroTabelaDisponivel=true;}catch(err){pagamentoErroNuvem=err;if(erroFinanceiroTabelaAusente(err))financeiroTabelaDisponivel=false;}
        }
        if(!pagamentoSalvoNuvem){try{salvarRegistroFinanceiroLocal(FINANCEIRO_LOCAL_PAGAMENTOS,row);}catch(err){alert(`Não foi possível registrar o pagamento. ${err?.message||''}`);return false;}}
    }
    let creditoPersistencia=null;
    if(creditoUsado>0.009){
        const uso={id:gerarUUIDFinanceiro(),paciente_id:pacienteId,plano_id:planoId,valor:creditoUsado,data_uso:data,observacoes:obs?`Crédito aplicado. ${obs}`:'Crédito do paciente aplicado a esta cobrança.',criado_por:usuarioLogado?.nome||'Desconhecido',criado_em:new Date().toISOString(),operacao_id:`cred_${operacaoBase}`};
        try{creditoPersistencia=await salvarUsoCredito(uso);}catch(err){alert(`O pagamento foi preservado, mas não foi possível registrar o uso do crédito. ${err?.message||''}`);await carregarFinanceiroPaciente();return false;}
    }
    fecharModal('modal_fin_pagamento');
    await carregarFinanceiroPaciente();
    const creditoGerado=Math.max(0,valor-Math.max(0,mAntes.saldo-creditoUsado));
    const partes=[];
    if(valor>0)partes.push(`Recebimento de ${moedaBR(valor)} registrado`);
    if(creditoUsado>0.009)partes.push(`${moedaBR(creditoUsado)} abatidos do crédito do paciente`);
    if(creditoGerado>0.009)partes.push(`${moedaBR(creditoGerado)} ficaram como novo crédito`);
    const algumLocal=(valor>0&&!pagamentoSalvoNuvem)||(creditoUsado>0.009&&!creditoPersistencia?.salvoNuvem);
    mensagemFinanceiro(`${partes.join(' · ')}.${algumLocal?' Parte do registro está preservada neste computador e aguardará sincronização.':''}`,algumLocal?'aviso':'sucesso');
    return true;
};

async function estornarUsoCreditoFinanceiro(id) {
    if(!financeiroPodeEditar()){alert('Seu perfil não possui permissão para estornar crédito.');return false;}
    const uso=financeiroCreditosUsosCache.find(u=>String(u.id)===String(id));
    if(!uso)return false;
    const ok=typeof confirmarKineSys==='function'?await confirmarKineSys(`Estornar o uso de ${moedaBR(uso.valor)} em crédito? O valor voltará a ficar disponível para o paciente e o saldo do procedimento será recalculado.`,{titulo:'Estornar crédito',confirmar:'Estornar'}):confirm('Estornar este uso de crédito?');
    if(!ok)return false;
    const local=obterUsosCreditoLocaisPaciente(uso.paciente_id).find(u=>String(u.id)===String(id));
    removerRegistroFinanceiroLocal(FINANCEIRO_LOCAL_CREDITOS_USOS,uso.id,uso.operacao_id||'');
    let removido=!!local?.__pending_sync;
    if(!removido&&_supabase&&financeiroCreditoTabelaDisponivel){
        try{const {error}=await _supabase.from('creditos_paciente_usos').delete().eq('id',uso.id);if(error)throw error;removido=true;removerMarcacaoExclusaoCredito(uso.id);}catch(err){try{marcarUsoCreditoParaExclusao(uso);removido=true;}catch(_){}if(erroTabelaCreditoAusente(err))financeiroCreditoTabelaDisponivel=false;}
    }else if(!removido){
        try{marcarUsoCreditoParaExclusao(uso);removido=true;}catch(_){}
    }
    await carregarFinanceiroPaciente();
    mensagemFinanceiro(removido?'Uso de crédito estornado. O valor voltou ao saldo disponível do paciente.':'Não foi possível estornar o crédito com segurança.',removido?'sucesso':'erro');
    return removido;
}

const excluirPagamentoFinanceiroSemCredito = excluirPagamentoFinanceiro;
excluirPagamentoFinanceiro = async function(id) {
    const pagamento=financeiroPagamentosCache.find(p=>String(p.id)===String(id));
    if(pagamento){
        const simulados=financeiroPagamentosCache.filter(p=>String(p.id)!==String(id));
        const comp=calcularComponentesCreditoPaciente(simulados,financeiroPlanosCache,financeiroCreditosUsosCache);
        if(comp.liquido < -0.009){
            alert(`Este pagamento gerou crédito que já foi utilizado em outro procedimento. Antes de apagá-lo, estorne pelo menos ${moedaBR(Math.abs(comp.liquido))} no histórico de crédito.`);
            return false;
        }
    }
    return excluirPagamentoFinanceiroSemCredito(id);
};
