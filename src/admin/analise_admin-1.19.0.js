/* ============================================================================
   KineSys — ANÁLISE ADMINISTRATIVA v1.11.2
   - Aba exclusiva do administrador para acompanhar o ano vigente.
   - Reúne faturamento, lucratividade, aniversariantes, atendimentos,
     novos pacientes selecionados, crescimento e qualidade operacional.
   - Mantém fallback local para a marcação manual de "novos pacientes".
   ============================================================================ */

const ANALISE_ADMIN_LOCAL_FLAGS = 'kinesys_analise_admin_flags_v1112';
let analiseAdminCache = null;
let analiseAdminCarregando = false;

function usuarioPodeVerAnaliseAdmin() {
    if (typeof usuarioPodeVerBalancoFinanceiro === 'function') return usuarioPodeVerBalancoFinanceiro();
    if (typeof financeiroEhAdministrador === 'function') return financeiroEhAdministrador();
    const tipo = String(usuarioLogado?.tipo || '').toUpperCase();
    return ['MASTER','MASTER_FEM','ADMINISTRADOR','ADMINISTRADORA'].includes(tipo);
}

function analiseEscape(v='') { return (typeof escapeHTML === 'function') ? escapeHTML(v) : String(v||'').replace(/[&<>"']/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s])); }
function analiseMoeda(v=0) { return (typeof moedaBR === 'function') ? moedaBR(v) : Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'}); }
function analiseInteiro(v=0) { return Number(v||0).toLocaleString('pt-BR'); }
function analisePercentual(v=0, casas=1) { return `${Number(v||0).toLocaleString('pt-BR',{minimumFractionDigits:casas,maximumFractionDigits:casas})}%`; }
function analiseAnoAtual() { return new Date().getFullYear(); }
function analiseMesAtual() { return new Date().getMonth(); }
function analiseMeses() { return ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']; }
function analiseNormalizarTexto(v='') { return String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim(); }

function analiseData(v) {
    if (!v && v !== 0) return null;
    if (v instanceof Date && !isNaN(v)) return v;
    if (typeof v === 'number') {
        const d = new Date(v);
        return isNaN(d) ? null : d;
    }
    const s = String(v || '').trim();
    if (!s) return null;
    if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
        const d = new Date(`${s.slice(0,10)}T12:00:00`);
        return isNaN(d) ? null : d;
    }
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(s)) {
        const [dia,mes,ano] = s.split('/').map(Number);
        const d = new Date(ano, mes-1, dia, 12, 0, 0);
        return isNaN(d) ? null : d;
    }
    const d = new Date(s);
    return isNaN(d) ? null : d;
}

function analiseDataCadastroPaciente(p={}) {
    return analiseData(p.timestampCadastro || p.timestamp_cadastro || p.dataCadastroISO || p.data_cadastro_iso || p.dataCadastro || p.data_cadastro || null);
}
function analiseDataNascimentoPaciente(p={}) {
    return analiseData(p.nascimento || p.dataNascimento || p.data_nascimento || null);
}
function analiseDataBR(v) {
    const d = analiseData(v);
    return d ? d.toLocaleDateString('pt-BR') : '—';
}

function analiseMesclarPorId(nuvem=[], locais=[], chaveFn=null) {
    const mapa = new Map();
    [...(nuvem||[]), ...(locais||[])].forEach(item => {
        if (!item) return;
        const chave = chaveFn ? chaveFn(item) : (item.id != null ? String(item.id) : '');
        if (!chave) return;
        mapa.set(chave, { ...(mapa.get(chave) || {}), ...item });
    });
    return [...mapa.values()];
}

function lerFlagsAnaliseLocal() {
    try { return JSON.parse(localStorage.getItem(ANALISE_ADMIN_LOCAL_FLAGS) || '[]') || []; }
    catch(_) { return []; }
}
function gravarFlagsAnaliseLocal(lista) {
    try { localStorage.setItem(ANALISE_ADMIN_LOCAL_FLAGS, JSON.stringify(lista||[])); return true; }
    catch(_) { return false; }
}
function salvarFlagAnaliseLocal(flag={}) {
    const lista = lerFlagsAnaliseLocal();
    const chave = `${flag.ano_referencia || analiseAnoAtual()}::${flag.paciente_id || ''}`;
    const i = lista.findIndex(x => `${x.ano_referencia || analiseAnoAtual()}::${x.paciente_id || ''}` === chave);
    const payload = { ...flag, __local:true, __pending_sync:true, id: flag.id || chave };
    if (i >= 0) lista[i] = { ...lista[i], ...payload };
    else lista.push(payload);
    gravarFlagsAnaliseLocal(lista);
    return payload;
}
function removerPendenciaFlagAnalise(ano, pacienteId) {
    gravarFlagsAnaliseLocal(lerFlagsAnaliseLocal().map(x => (
        String(x.ano_referencia) === String(ano) && String(x.paciente_id) === String(pacienteId)
            ? { ...x, __pending_sync:false }
            : x
    )));
}

async function sincronizarFlagsAnalisePendentes() {
    if (!_supabase) return false;
    const pendentes = lerFlagsAnaliseLocal().filter(x => x.__pending_sync);
    let ok = true;
    for (const flag of pendentes) {
        try {
            const row = {
                paciente_id: flag.paciente_id,
                ano_referencia: Number(flag.ano_referencia) || analiseAnoAtual(),
                selecionado: !!flag.selecionado,
                marcado_em: flag.marcado_em || new Date().toISOString(),
                marcado_por: flag.marcado_por || (usuarioLogado?.nome || 'Administrador'),
                observacoes: flag.observacoes || null,
                operacao_id: flag.operacao_id || `${flag.ano_referencia || analiseAnoAtual()}_${flag.paciente_id || ''}`
            };
            const r = await _supabase.from('analise_pacientes_flags').upsert([row], { onConflict: 'paciente_id,ano_referencia' });
            if (r.error) throw r.error;
            removerPendenciaFlagAnalise(row.ano_referencia, row.paciente_id);
        } catch (err) {
            ok = false;
            console.warn('Análise ADM: marcação local de novo paciente aguardando sincronização.', err);
            break;
        }
    }
    return ok;
}

async function buscarFlagsAnaliseAno(ano) {
    const locais = lerFlagsAnaliseLocal().filter(x => Number(x.ano_referencia || 0) === Number(ano));
    if (!_supabase) return { flags: locais, aviso: 'Sem conexão com o Supabase: a seleção de novos pacientes usa somente este computador.' };
    try {
        const r = await _supabase
            .from('analise_pacientes_flags')
            .select('id,paciente_id,ano_referencia,selecionado,marcado_em,marcado_por,observacoes,operacao_id')
            .eq('ano_referencia', Number(ano));
        if (r.error) throw r.error;
        return {
            flags: analiseMesclarPorId(r.data || [], locais, x => `${x.ano_referencia || ano}::${x.paciente_id || ''}`),
            aviso: ''
        };
    } catch (err) {
        const msg = String(err?.message || err || '');
        const aviso = /analise_pacientes_flags|does not exist|schema cache|relation/i.test(msg)
            ? 'A migração da aba Análise ainda não foi aplicada no Supabase. A seleção de novos pacientes continua funcionando localmente.'
            : 'Não foi possível confirmar a seleção de novos pacientes na nuvem. O sistema manteve os dados locais disponíveis.';
        return { flags: locais, aviso };
    }
}

function analiseInicioAno(ano) { return `${ano}-01-01`; }
function analiseFimAno(ano) { return `${ano}-12-31`; }
function analiseInicioAnoTs(ano) { return `${ano}-01-01T00:00:00`; }
function analiseFimAnoExclusivoTs(ano) { return `${ano+1}-01-01T00:00:00`; }

function coletarAgendamentosLocaisAnalise(ano) {
    const inicio = analiseInicioAno(ano), fim = analiseFimAno(ano);
    const listas = [];
    try { if (typeof agendaAgendamentosSemanaCache !== 'undefined' && Array.isArray(agendaAgendamentosSemanaCache)) listas.push(agendaAgendamentosSemanaCache); } catch(_) {}
    try { if (typeof agendaAgendamentosDoDiaCache !== 'undefined' && Array.isArray(agendaAgendamentosDoDiaCache)) listas.push(agendaAgendamentosDoDiaCache); } catch(_) {}
    try { if (typeof lerAgendamentosPendentesSync === 'function') listas.push((lerAgendamentosPendentesSync() || []).map(x => x?.payload).filter(Boolean)); } catch(_) {}
    const mapa = new Map();
    listas.flat().forEach(a => {
        const data = String(a?.data || '');
        if (!a?.id || !data || data < inicio || data > fim) return;
        mapa.set(String(a.id), { ...(mapa.get(String(a.id)) || {}), ...a });
    });
    return [...mapa.values()];
}

async function carregarDadosAnaliseAdminAno(ano) {
    const inicio = analiseInicioAno(ano);
    const fim = analiseFimAno(ano);
    const inicioTs = analiseInicioAnoTs(ano);
    const fimTs = analiseFimAnoExclusivoTs(ano);
    const locaisPag = (typeof lerFinanceiroLocal === 'function' ? (lerFinanceiroLocal(typeof FINANCEIRO_LOCAL_PAGAMENTOS !== 'undefined' ? FINANCEIRO_LOCAL_PAGAMENTOS : 'kinesys_financeiro_pagamentos_v1112') || []) : [])
        .filter(p => String(p.data_pagamento || '').slice(0,10) >= inicio && String(p.data_pagamento || '').slice(0,10) <= fim)
        .filter(p => typeof pagamentoEstaMarcadoParaExclusao !== 'function' || !pagamentoEstaMarcadoParaExclusao(p));
    const locaisPlan = (typeof lerFinanceiroLocal === 'function' ? (lerFinanceiroLocal(typeof FINANCEIRO_LOCAL_PLANOS !== 'undefined' ? FINANCEIRO_LOCAL_PLANOS : 'kinesys_financeiro_planos_v1112') || []) : [])
        .filter(p => { const d = String(p.criado_em || '').slice(0,10); return d >= inicio && d <= fim; });
    const locaisDesp = (typeof lerDespesasLocaisBalanco === 'function' ? lerDespesasLocaisBalanco() : [])
        .filter(d => String(d.data_despesa || '').slice(0,10) >= inicio && String(d.data_despesa || '').slice(0,10) <= fim);
    const locaisAg = coletarAgendamentosLocaisAnalise(ano);

    const [pacientes, flagsCloud] = await Promise.all([
        (typeof obterPacientesSalvos === 'function' ? obterPacientesSalvos() : Promise.resolve([])).catch(()=>[]),
        buscarFlagsAnaliseAno(ano)
    ]);
    const avisos = [];
    if (flagsCloud.aviso) avisos.push(flagsCloud.aviso);

    if (!_supabase) {
        return { pacientes, pagamentos:locaisPag, planos:locaisPlan, despesas:locaisDesp, agendamentos:locaisAg, flags: flagsCloud.flags || [], aviso: avisos.join(' ') };
    }

    await sincronizarFlagsAnalisePendentes().catch(()=>false);
    let pagamentos = [], planos = [], despesas = [], agendamentos = [];

    try {
        const r = await _supabase.from('pagamentos').select('id,plano_id,paciente_id,valor,forma_pagamento,data_pagamento,criado_em,criado_por,observacoes').gte('data_pagamento', inicio).lte('data_pagamento', fim);
        if (r.error) throw r.error;
        pagamentos = r.data || [];
    } catch(err) { avisos.push('Não foi possível confirmar todos os pagamentos do ano na nuvem.'); }

    try {
        let r = await _supabase.from('planos_atendimento').select('id,paciente_id,nome,valor_final,desconto_valor,desconto_pacote,desconto_cortesia,sessoes_contratadas,status,criado_em,criado_por').gte('criado_em', inicioTs).lt('criado_em', fimTs);
        if (r.error && /desconto_pacote|desconto_cortesia|column|schema cache/i.test(String(r.error.message||''))) {
            r = await _supabase.from('planos_atendimento').select('id,paciente_id,nome,valor_final,desconto_valor,sessoes_contratadas,status,criado_em,criado_por').gte('criado_em', inicioTs).lt('criado_em', fimTs);
        }
        if (r.error) throw r.error;
        planos = r.data || [];
    } catch(err) { avisos.push('Não foi possível confirmar todos os planos/descontos do ano na nuvem.'); }

    try {
        const r = await _supabase.from('despesas_financeiras').select('id,descricao,categoria,subcategoria,valor,data_despesa,forma_pagamento,observacoes,criado_por,criado_em,operacao_id').gte('data_despesa', inicio).lte('data_despesa', fim);
        if (r.error) throw r.error;
        despesas = r.data || [];
    } catch(err) {
        const msg = String(err?.message || err || '');
        avisos.push(/despesas_financeiras|does not exist|schema cache|relation/i.test(msg) ? 'A tabela de despesas financeiras ainda não existe no Supabase deste projeto.' : 'Não foi possível confirmar as despesas do ano na nuvem.');
    }

    try {
        const r = await _supabase.from('agendamentos').select('id,paciente_id,profissional_id,data,hora_inicio,status,plano_id').gte('data', inicio).lte('data', fim);
        if (r.error) throw r.error;
        agendamentos = r.data || [];
    } catch(err) { avisos.push('Não foi possível confirmar todos os agendamentos do ano na nuvem.'); }

    return {
        pacientes,
        pagamentos: analiseMesclarPorId(pagamentos, locaisPag),
        planos: analiseMesclarPorId(planos, locaisPlan),
        despesas: analiseMesclarPorId(despesas, locaisDesp),
        agendamentos: analiseMesclarPorId(agendamentos, locaisAg),
        flags: flagsCloud.flags || [],
        aviso: avisos.join(' ')
    };
}

function analiseStatusAtendido(status='') { const s=String(status||'').toLowerCase(); return s==='atendido' || s==='concluido'; }
function analiseStatusFaltaJustificada(status='') { return String(status||'').toLowerCase() === 'falta_justificada'; }
function analiseStatusFaltaNaoJustificada(status='') { return String(status||'').toLowerCase() === 'falta_nao_justificada'; }
function analiseStatusCancelado(status='') { return String(status||'').toLowerCase() === 'cancelado'; }
function analiseStatusReserva(status='') {
    if (typeof financeiroStatusReservaAgenda === 'function') return financeiroStatusReservaAgenda(status);
    return ['pre_agendado','agendado','confirmado','em_recepcao'].includes(String(status||'').toLowerCase());
}

function montarResumoAnaliseAdmin(dados) {
    const ano = Number(dados?.ano || analiseAnoAtual());
    const pagamentos = (dados?.pagamentos || []).filter(x => String(x.data_pagamento || '').slice(0,4) === String(ano));
    const planos = (dados?.planos || []).filter(x => String(x.criado_em || '').slice(0,4) === String(ano));
    const despesas = (dados?.despesas || []).filter(x => String(x.data_despesa || '').slice(0,4) === String(ano));
    const agendamentos = (dados?.agendamentos || []).filter(x => String(x.data || '').slice(0,4) === String(ano));
    const pacientes = dados?.pacientes || [];
    const flags = (dados?.flags || []).filter(x => Number(x.ano_referencia || 0) === ano);
    const flagMap = new Map(flags.map(f => [String(f.paciente_id || ''), !!f.selecionado]));

    const receitaMensal = Array(12).fill(0);
    pagamentos.forEach(p => {
        const d = analiseData(p.data_pagamento);
        if (d) receitaMensal[d.getMonth()] += Number(p.valor) || 0;
    });

    const despesaMensal = Array(12).fill(0);
    despesas.forEach(desp => {
        const d = analiseData(desp.data_despesa);
        if (d) despesaMensal[d.getMonth()] += Math.max(0, Number(desp.valor) || 0);
    });

    const descontosMensal = Array(12).fill(0);
    planos.forEach(p => {
        const d = analiseData(p.criado_em);
        if (!d) return;
        let total = 0;
        if (typeof normalizarDescontosPlanoRelatorio === 'function') total = normalizarDescontosPlanoRelatorio(p).total || 0;
        else total = Math.max(Number(p.desconto_pacote)||0, Number(p.desconto_cortesia)||0, Number(p.desconto_valor)||0);
        descontosMensal[d.getMonth()] += Math.max(0, total);
    });

    const categoriaDespesas = {};
    if (typeof FINANCEIRO_CATEGORIAS_GASTOS !== 'undefined') FINANCEIRO_CATEGORIAS_GASTOS.forEach(c => categoriaDespesas[c] = 0);
    despesas.forEach(desp => {
        const cat = (typeof normalizarCategoriaGerencialBalanco === 'function') ? normalizarCategoriaGerencialBalanco(desp.categoria) : String(desp.categoria || 'Outros');
        categoriaDespesas[cat] = (categoriaDespesas[cat] || 0) + Math.max(0, Number(desp.valor) || 0);
    });

    const atendidosMensal = Array(12).fill(0), faltasJustMensal = Array(12).fill(0), faltasNaoMensal = Array(12).fill(0), canceladosMensal = Array(12).fill(0), reservasMensal = Array(12).fill(0);
    agendamentos.forEach(a => {
        const d = analiseData(a.data); if (!d) return;
        const m = d.getMonth();
        const status = String(a.status || '').toLowerCase();
        if (analiseStatusAtendido(status)) atendidosMensal[m] += 1;
        else if (analiseStatusFaltaJustificada(status)) faltasJustMensal[m] += 1;
        else if (analiseStatusFaltaNaoJustificada(status)) faltasNaoMensal[m] += 1;
        else if (analiseStatusCancelado(status)) canceladosMensal[m] += 1;
        else if (analiseStatusReserva(status)) reservasMensal[m] += 1;
    });

    const candidatosNovos = pacientes.filter(p => {
        const d = analiseDataCadastroPaciente(p);
        return d && d.getFullYear() === ano;
    }).sort((a,b) => (analiseDataCadastroPaciente(b)?.getTime() || 0) - (analiseDataCadastroPaciente(a)?.getTime() || 0));
    const novosSelecionados = candidatosNovos.filter(p => flagMap.get(String(p.id || '')));
    const cadastrosMensal = Array(12).fill(0);
    const selecionadosMensal = Array(12).fill(0);
    candidatosNovos.forEach(p => {
        const d = analiseDataCadastroPaciente(p); if (!d) return;
        cadastrosMensal[d.getMonth()] += 1;
        if (flagMap.get(String(p.id || ''))) selecionadosMensal[d.getMonth()] += 1;
    });

    const atendimentosPorPaciente = new Map();
    agendamentos.forEach(a => {
        const pid = String(a.paciente_id || '');
        if (!pid) return;
        const atual = atendimentosPorPaciente.get(pid) || { atendidos:0, faltas:0, reservas:0 };
        if (analiseStatusAtendido(a.status)) atual.atendidos += 1;
        else if (analiseStatusFaltaJustificada(a.status) || analiseStatusFaltaNaoJustificada(a.status)) atual.faltas += 1;
        else if (analiseStatusReserva(a.status)) atual.reservas += 1;
        atendimentosPorPaciente.set(pid, atual);
    });

    const aniversariantesMes = pacientes.filter(p => {
        const d = analiseDataNascimentoPaciente(p);
        return d && d.getMonth() === analiseMesAtual();
    }).map(p => {
        const nasc = analiseDataNascimentoPaciente(p);
        const hoje = new Date();
        let idade = null;
        if (nasc) {
            idade = hoje.getFullYear() - nasc.getFullYear();
            const antes = (hoje.getMonth() < nasc.getMonth()) || (hoje.getMonth() === nasc.getMonth() && hoje.getDate() < nasc.getDate());
            if (antes) idade -= 1;
        }
        return { ...p, __nascimento: nasc, __idade: idade };
    }).sort((a,b) => (a.__nascimento?.getDate() || 99) - (b.__nascimento?.getDate() || 99));

    const aniversariosSemana = [0,0,0,0,0];
    aniversariantesMes.forEach(p => {
        const dia = p.__nascimento?.getDate() || 1;
        const idx = Math.min(4, Math.floor((dia-1) / 7));
        aniversariosSemana[idx] += 1;
    });
    const aniversariosFaixa = { 'Até 17':0, '18–30':0, '31–45':0, '46–60':0, '61+':0 };
    aniversariantesMes.forEach(p => {
        const i = Number(p.__idade);
        if (!isFinite(i)) return;
        if (i <= 17) aniversariosFaixa['Até 17'] += 1;
        else if (i <= 30) aniversariosFaixa['18–30'] += 1;
        else if (i <= 45) aniversariosFaixa['31–45'] += 1;
        else if (i <= 60) aniversariosFaixa['46–60'] += 1;
        else aniversariosFaixa['61+'] += 1;
    });

    const pacientesAtivos = new Set();
    planos.forEach(p => { if (String(p.status || 'ativo') !== 'cancelado') pacientesAtivos.add(String(p.paciente_id || '')); });
    const hojeISO = new Date().toISOString().slice(0,10);
    agendamentos.forEach(a => {
        if (String(a.data || '') >= hojeISO && !analiseStatusCancelado(a.status)) pacientesAtivos.add(String(a.paciente_id || ''));
    });
    pacientesAtivos.delete('');

    const contagemPlanosPorPaciente = new Map();
    planos.forEach(p => {
        const pid = String(p.paciente_id || '');
        contagemPlanosPorPaciente.set(pid, (contagemPlanosPorPaciente.get(pid) || 0) + 1);
    });
    const renovacoes = [...contagemPlanosPorPaciente.values()].reduce((acc, n) => acc + Math.max(0, n - 1), 0);
    const recorrentes = [...atendimentosPorPaciente.values()].filter(x => x.atendidos >= 2).length;

    const receitaTotal = receitaMensal.reduce((a,b)=>a+b,0);
    const despesaTotal = despesaMensal.reduce((a,b)=>a+b,0);
    const lucroTotal = receitaTotal - despesaTotal;
    const descontosTotal = descontosMensal.reduce((a,b)=>a+b,0);
    const pagamentosCount = pagamentos.length;
    const atendidosTotal = atendidosMensal.reduce((a,b)=>a+b,0);
    const faltasJustTotal = faltasJustMensal.reduce((a,b)=>a+b,0);
    const faltasNaoTotal = faltasNaoMensal.reduce((a,b)=>a+b,0);
    const canceladosTotal = canceladosMensal.reduce((a,b)=>a+b,0);
    const reservasTotal = reservasMensal.reduce((a,b)=>a+b,0);
    const comparecimentoDen = atendidosTotal + faltasJustTotal + faltasNaoTotal + canceladosTotal;
    const taxaComparecimento = comparecimentoDen > 0 ? (atendidosTotal / comparecimentoDen) * 100 : 0;
    const taxaFaltaNao = comparecimentoDen > 0 ? (faltasNaoTotal / comparecimentoDen) * 100 : 0;
    const selecionadosComAtendimento = novosSelecionados.filter(p => (atendimentosPorPaciente.get(String(p.id || ''))?.atendidos || 0) > 0).length;

    return {
        ano,
        pacientes,
        pagamentos,
        planos,
        despesas,
        agendamentos,
        flags,
        categoriaDespesas,
        receitaMensal,
        despesaMensal,
        descontosMensal,
        atendidosMensal,
        faltasJustMensal,
        faltasNaoMensal,
        canceladosMensal,
        reservasMensal,
        candidatosNovos,
        novosSelecionados,
        cadastrosMensal,
        selecionadosMensal,
        atendimentosPorPaciente,
        aniversariantesMes,
        aniversariosSemana,
        aniversariosFaixa,
        receitaTotal,
        despesaTotal,
        lucroTotal,
        descontosTotal,
        pagamentosCount,
        atendidosTotal,
        faltasJustTotal,
        faltasNaoTotal,
        canceladosTotal,
        reservasTotal,
        taxaComparecimento,
        taxaFaltaNao,
        pacientesAtivos: pacientesAtivos.size,
        planosIniciados: planos.length,
        renovacoes,
        recorrentes,
        ticketMedioPagamento: pagamentosCount ? receitaTotal / pagamentosCount : 0,
        ticketMedioAtendimento: atendidosTotal ? receitaTotal / atendidosTotal : 0,
        receitaMediaMensal: receitaTotal / 12,
        atendimentosMediosMensais: atendidosTotal / 12,
        selecionadosComAtendimento
    };
}

function analiseSetTitulos(t1='', s1='', t2='', s2='', tl='', sl='') {
    const map = {
        fin_ana_chart1_titulo:t1, fin_ana_chart1_sub:s1,
        fin_ana_chart2_titulo:t2, fin_ana_chart2_sub:s2,
        fin_ana_lista_titulo:tl, fin_ana_lista_sub:sl
    };
    Object.entries(map).forEach(([id,valor])=>{ const el=document.getElementById(id); if(el) el.textContent=valor; });
}

function analiseRenderKPIs(lista=[]) {
    const el = document.getElementById('fin_ana_kpis');
    if (!el) return;
    if (!lista.length) { el.innerHTML = '<div class="ana-empty">Sem indicadores para esta visão.</div>'; return; }
    el.innerHTML = lista.map(k => `<div class="finance-analysis-kpi"><span>${analiseEscape(k.label)}</span><strong>${analiseEscape(k.valor)}</strong><small>${analiseEscape(k.ajuda || '')}</small></div>`).join('');
}

function analiseGraficoBarras(labels=[], series=[]) {
    const max = Math.max(0, ...series.flatMap(s => s.data || []));
    if (!labels.length || !series.length || max <= 0) return '<div class="ana-empty">Ainda não há dados suficientes para montar este gráfico.</div>';
    const legend = `<ul class="ana-legend">${series.map(s => `<li><i class="${analiseEscape(s.classe || '')}"></i>${analiseEscape(s.nome || '')}</li>`).join('')}</ul>`;
    const grupos = labels.map((label, idx) => {
        const bars = series.map(s => {
            const val = Math.max(0, Number((s.data || [])[idx] || 0));
            const altura = Math.max(val > 0 ? 8 : 4, (val / max) * 100);
            const tooltip = `${s.nome}: ${s.formatador ? s.formatador(val) : analiseInteiro(val)}`;
            return `<div class="ana-bar ${analiseEscape(s.classe || '')}" style="height:${altura}%" data-label="${analiseEscape(tooltip)}"></div>`;
        }).join('');
        return `<div class="ana-group"><div class="ana-bar-stack">${bars}</div><label>${analiseEscape(label)}</label></div>`;
    }).join('');
    return `${legend}<div class="ana-bars">${grupos}</div>`;
}

function analiseGraficoBarrasHorizontais(itens=[], opcoes={}) {
    if (!itens.length || !Math.max(0, ...itens.map(x=>Number(x.valor)||0))) return '<div class="ana-empty">Ainda não há dados suficientes para montar este gráfico.</div>';
    const max = Math.max(...itens.map(x => Number(x.valor) || 0), 1);
    return `<div class="ana-hbars">${itens.map((item, idx) => {
        const pct = Math.max(4, ((Number(item.valor)||0) / max) * 100);
        const cor = item.cor || (idx % 3 === 0 ? 'green' : idx % 3 === 1 ? 'orange' : '');
        return `<div class="ana-hbar-row"><span>${analiseEscape(item.label || 'Item')}</span><div class="track"><div class="fill ${analiseEscape(cor)}" style="width:${pct}%"></div></div><b>${analiseEscape((opcoes.formatador || analiseInteiro)(Number(item.valor)||0))}</b></div>`;
    }).join('')}</div>`;
}

function analiseRenderTabelaMensal(linhas=[], cabecalhos=[]) {
    if (!linhas.length) return '<div class="ana-empty">Sem dados no período selecionado.</div>';
    const head = `<div class="ana-table-head">${cabecalhos.map(h=>`<span>${analiseEscape(h)}</span>`).join('')}</div>`;
    const body = linhas.map(l => `<div class="ana-table-row">${l.map(c=>`<span>${c}</span>`).join('')}</div>`).join('');
    return `<div class="ana-table">${head}${body}</div>`;
}

function analiseAplicarBuscaPacientes(lista=[]) {
    const busca = analiseNormalizarTexto(document.getElementById('fin_ana_busca')?.value || '');
    if (!busca) return lista;
    return lista.filter(p => analiseNormalizarTexto(`${p.nome || ''} ${p.telefone || ''} ${p.responsavelNome || ''} ${p.responsavel_nome || ''}`).includes(busca));
}

function analiseDiasParaAniversario(data) {
    if (!data) return null;
    const hoje = new Date();
    let prox = new Date(hoje.getFullYear(), data.getMonth(), data.getDate());
    prox.setHours(0,0,0,0);
    const base = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
    if (prox < base) prox = new Date(hoje.getFullYear()+1, data.getMonth(), data.getDate());
    return Math.round((prox - base) / 86400000);
}

function renderizarAnaliseFaturamento(resumo) {
    analiseSetTitulos(
        'Faturamento x despesas por mês',
        `Ano ${resumo.ano} — acompanhamento de caixa recebido e gastos lançados.`,
        'Despesas por categoria',
        'Onde o dinheiro mais saiu ao longo do ano.',
        'Fechamento mês a mês',
        'Receita, despesa e resultado acumulados por competência.'
    );
    analiseRenderKPIs([
        { label:'Receita recebida no ano', valor:analiseMoeda(resumo.receitaTotal), ajuda:'Somatório dos pagamentos efetivamente lançados no período.' },
        { label:'Despesas do ano', valor:analiseMoeda(resumo.despesaTotal), ajuda:'Saídas administrativas registradas pelos administradores.' },
        { label:'Lucro / resultado', valor:analiseMoeda(resumo.lucroTotal), ajuda:'Receita menos despesas lançadas.' },
        { label:'Margem líquida', valor:analisePercentual(resumo.receitaTotal ? (resumo.lucroTotal / resumo.receitaTotal) * 100 : 0), ajuda:'Se a margem cair, o mês está “suando mais do que rendendo”.' },
        { label:'Descontos concedidos', valor:analiseMoeda(resumo.descontosTotal), ajuda:'Desconto por pacote, cortesia e histórico classificado.' },
        { label:'Ticket médio por pagamento', valor:analiseMoeda(resumo.ticketMedioPagamento), ajuda:'Ajuda a enxergar o valor médio de cada recebimento.' }
    ]);
    document.getElementById('fin_ana_chart1').innerHTML = analiseGraficoBarras(analiseMeses(), [
        { nome:'Receita', classe:'receita', data:resumo.receitaMensal, formatador:analiseMoeda },
        { nome:'Despesa', classe:'despesa', data:resumo.despesaMensal, formatador:analiseMoeda }
    ]);
    const cats = Object.entries(resumo.categoriaDespesas).sort((a,b)=>b[1]-a[1]).map(([label,valor])=>({label,valor,cor:'orange'}));
    document.getElementById('fin_ana_chart2').innerHTML = analiseGraficoBarrasHorizontais(cats, { formatador:analiseMoeda });
    const linhas = analiseMeses().map((mes, idx) => {
        const receita = resumo.receitaMensal[idx] || 0;
        const despesa = resumo.despesaMensal[idx] || 0;
        const resultado = receita - despesa;
        return [mes, analiseMoeda(receita), analiseMoeda(despesa), analiseMoeda(resultado)];
    });
    document.getElementById('fin_ana_lista').innerHTML = analiseRenderTabelaMensal(linhas, ['Mês','Recebido','Despesas','Resultado']);
}

function renderizarAnaliseAniversariantes(resumo) {
    const listaBruta = analiseAplicarBuscaPacientes(resumo.aniversariantesMes);
    const proximos7 = listaBruta.filter(p => {
        const dias = analiseDiasParaAniversario(p.__nascimento);
        return dias != null && dias <= 7;
    }).length;
    const idadeMedia = listaBruta.length ? listaBruta.reduce((s,p)=>s+(Number(p.__idade)||0),0) / listaBruta.length : 0;
    analiseSetTitulos(
        'Aniversariantes por semana do mês',
        'Distribuição para programar mensagens, mimos e relacionamento.',
        'Faixa etária dos aniversariantes',
        'Ajuda a visualizar o perfil dos pacientes comemorados no mês atual.',
        'Lista do mês',
        'Pacientes aniversariantes para relacionamento ativo da clínica.'
    );
    analiseRenderKPIs([
        { label:'Aniversariantes do mês', valor:analiseInteiro(listaBruta.length), ajuda:'Pacientes com mês de nascimento igual ao mês atual.' },
        { label:'Próximos 7 dias', valor:analiseInteiro(proximos7), ajuda:'Ótimo para ação rápida da recepção.' },
        { label:'Dependentes / menores', valor:analiseInteiro(listaBruta.filter(p => p.dependente || p.menor_dependente).length), ajuda:'Pode exigir contato com responsável.' },
        { label:'Idade média', valor:listaBruta.length ? `${Math.round(idadeMedia)} anos` : '—', ajuda:'Perfil médio dos aniversariantes do mês.' }
    ]);
    document.getElementById('fin_ana_chart1').innerHTML = analiseGraficoBarras(['1ª sem','2ª sem','3ª sem','4ª sem','5ª sem'], [
        { nome:'Aniversariantes', classe:'selecionado', data:resumo.aniversariosSemana, formatador:analiseInteiro }
    ]);
    const faixas = Object.entries(resumo.aniversariosFaixa).map(([label,valor])=>({label,valor,cor:'green'}));
    document.getElementById('fin_ana_chart2').innerHTML = analiseGraficoBarrasHorizontais(faixas, { formatador:analiseInteiro });
    if (!listaBruta.length) {
        document.getElementById('fin_ana_lista').innerHTML = '<div class="ana-empty">Nenhum aniversariante encontrado com este filtro.</div>';
        return;
    }
    document.getElementById('fin_ana_lista').innerHTML = listaBruta.map(p => {
        const dias = analiseDiasParaAniversario(p.__nascimento);
        const badge = dias === 0 ? 'Hoje' : dias === 1 ? 'Amanhã' : `Em ${dias} dias`;
        return `<div class="ana-list-row"><span class="ana-badge ${dias<=7?'ok':'warn'}">${analiseEscape(badge)}</span><div class="meta"><b>${analiseEscape(p.nome || 'Paciente')}</b><small>Nascimento: ${analiseEscape(analiseDataBR(p.__nascimento))} · ${analiseEscape(p.telefone || 'Sem telefone')} · ${analiseEscape((p.__idade ?? '—'))} anos</small></div><span class="ana-badge">${String(p.__nascimento?.getDate() || '').padStart(2,'0')}/${String((p.__nascimento?.getMonth() || 0)+1).padStart(2,'0')}</span></div>`;
    }).join('');
}

function renderizarAnaliseAtendimentos(resumo) {
    analiseSetTitulos(
        'Atendimentos x faltas por mês',
        `Ano ${resumo.ano} — produção assistencial e perdas operacionais.`,
        'Distribuição dos status',
        'Mostra onde a agenda está performando e onde está vazando.',
        'Tabela mensal de produção',
        'Boa para conferência rápida do ritmo da clínica.'
    );
    analiseRenderKPIs([
        { label:'Atendimentos realizados', valor:analiseInteiro(resumo.atendidosTotal), ajuda:'Sessões marcadas como atendidas ou concluídas.' },
        { label:'Faltas injustificadas', valor:analiseInteiro(resumo.faltasNaoTotal), ajuda:'Seu “ralo de agenda”.' },
        { label:'Faltas justificadas', valor:analiseInteiro(resumo.faltasJustTotal), ajuda:'Ausências reconhecidas e não penalizadas.' },
        { label:'Agendamentos cancelados', valor:analiseInteiro(resumo.canceladosTotal), ajuda:'Quantidade de agendamentos com status cancelado, independentemente da origem do cancelamento.' },
        { label:'Taxa de comparecimento', valor:analisePercentual(resumo.taxaComparecimento), ajuda:'Quanto maior, mais saudável está a operação.' },
        { label:'Média de atendimentos/mês', valor:analiseInteiro(resumo.atendimentosMediosMensais), ajuda:'Ajuda a dimensionar crescimento e equipe.' }
    ]);
    document.getElementById('fin_ana_chart1').innerHTML = analiseGraficoBarras(analiseMeses(), [
        { nome:'Atendidos', classe:'atendido', data:resumo.atendidosMensal, formatador:analiseInteiro },
        { nome:'Falta injustificada', classe:'falta', data:resumo.faltasNaoMensal, formatador:analiseInteiro }
    ]);
    document.getElementById('fin_ana_chart2').innerHTML = analiseGraficoBarrasHorizontais([
        { label:'Atendidos', valor:resumo.atendidosTotal, cor:'green' },
        { label:'Falta justificada', valor:resumo.faltasJustTotal, cor:'orange' },
        { label:'Falta injustificada', valor:resumo.faltasNaoTotal, cor:'orange' },
        { label:'Cancelados', valor:resumo.canceladosTotal, cor:'gray' },
        { label:'Agendados / reservados', valor:resumo.reservasTotal, cor:'' }
    ], { formatador:analiseInteiro });
    const linhas = analiseMeses().map((mes, idx) => {
        const atend = resumo.atendidosMensal[idx] || 0;
        const falta = (resumo.faltasJustMensal[idx] || 0) + (resumo.faltasNaoMensal[idx] || 0);
        const den = atend + falta + (resumo.canceladosMensal[idx] || 0);
        const taxa = den > 0 ? (atend / den) * 100 : 0;
        return [mes, analiseInteiro(atend), analiseInteiro(falta), analisePercentual(taxa)];
    });
    document.getElementById('fin_ana_lista').innerHTML = analiseRenderTabelaMensal(linhas, ['Mês','Atendidos','Faltas','Comparecimento']);
}

function renderizarAnaliseNovosPacientes(resumo) {
    const lista = analiseAplicarBuscaPacientes(resumo.candidatosNovos);
    const thisMonth = lista.filter(p => analiseDataCadastroPaciente(p)?.getMonth() === analiseMesAtual() && resumo.novosSelecionados.some(np => String(np.id) === String(p.id))).length;
    const ativacao = resumo.novosSelecionados.length ? (resumo.selecionadosComAtendimento / resumo.novosSelecionados.length) * 100 : 0;
    analiseSetTitulos(
        'Cadastros x novos pacientes selecionados',
        'Nem todo cadastro vira novo paciente estratégico — aqui quem manda é a curadoria do ADM.',
        'Situação dos novos pacientes selecionados',
        'Mostra quantos já iniciaram atendimento e quantos ainda precisam ser ativados.',
        'Curadoria de novos pacientes',
        'Selecione manualmente quem deve entrar no indicador de crescimento.'
    );
    analiseRenderKPIs([
        { label:'Cadastros do ano', valor:analiseInteiro(resumo.candidatosNovos.length), ajuda:'Todos os pacientes cadastrados no ano analisado.' },
        { label:'Selecionados como novos pacientes', valor:analiseInteiro(resumo.novosSelecionados.length), ajuda:'Este número é manual, do jeitinho que você pediu.' },
        { label:'Selecionados neste mês', valor:analiseInteiro(thisMonth), ajuda:'Mostra o fôlego mais recente da captação.' },
        { label:'Com 1º atendimento realizado', valor:analiseInteiro(resumo.selecionadosComAtendimento), ajuda:'Ajuda a medir ativação real do novo paciente.' },
        { label:'Taxa de ativação', valor:analisePercentual(ativacao), ajuda:'Selecionados que já viraram atendimento de fato.' }
    ]);
    document.getElementById('fin_ana_chart1').innerHTML = analiseGraficoBarras(analiseMeses(), [
        { nome:'Cadastros', classe:'cancelado', data:resumo.cadastrosMensal, formatador:analiseInteiro },
        { nome:'Selecionados', classe:'selecionado', data:resumo.selecionadosMensal, formatador:analiseInteiro }
    ]);
    document.getElementById('fin_ana_chart2').innerHTML = analiseGraficoBarrasHorizontais([
        { label:'Selecionados com atendimento', valor:resumo.selecionadosComAtendimento, cor:'green' },
        { label:'Selecionados sem atendimento', valor:Math.max(0, resumo.novosSelecionados.length - resumo.selecionadosComAtendimento), cor:'orange' },
        { label:'Cadastros não selecionados', valor:Math.max(0, resumo.candidatosNovos.length - resumo.novosSelecionados.length), cor:'gray' }
    ], { formatador:analiseInteiro });

    if (!lista.length) {
        document.getElementById('fin_ana_lista').innerHTML = '<div class="ana-empty">Nenhum paciente novo encontrado com este filtro.</div>';
        return;
    }
    document.getElementById('fin_ana_lista').innerHTML = lista.map(p => {
        const selecionado = resumo.novosSelecionados.some(np => String(np.id) === String(p.id));
        const at = resumo.atendimentosPorPaciente.get(String(p.id || ''))?.atendidos || 0;
        return `<div class="ana-list-row"><button type="button" class="ana-toggle ${selecionado?'active':''}" onclick="alternarNovoPacienteAnalise('${String(p.id||'').replace(/'/g,"\\'")}')">${selecionado?'Selecionado':'Selecionar'}</button><div class="meta"><b>${analiseEscape(p.nome || 'Paciente')}</b><small>Cadastro: ${analiseEscape(analiseDataBR(analiseDataCadastroPaciente(p)))} · ${analiseEscape(p.telefone || 'Sem telefone')} · Atendimentos realizados: ${analiseEscape(String(at))}</small></div><span class="ana-badge ${selecionado?'ok':'warn'}">${selecionado?'Conta como novo paciente':'Fora do indicador'}</span></div>`;
    }).join('');
}

function renderizarAnaliseCrescimento(resumo) {
    analiseSetTitulos(
        'Crescimento mensal da clínica',
        'Relaciona entrada de pacientes, início de planos e produção assistencial.',
        'Meses mais fortes em faturamento',
        'Boa visão de sazonalidade para tomada de decisão.',
        'Tabela de crescimento',
        'Use para comparar aquisição, ativação e entrega.'
    );
    const mesesReceita = analiseMeses().map((mes, idx) => ({ label:mes, valor:resumo.receitaMensal[idx] || 0, cor:'green' })).sort((a,b)=>b.valor-a.valor).slice(0,6);
    analiseRenderKPIs([
        { label:'Pacientes ativos', valor:analiseInteiro(resumo.pacientesAtivos), ajuda:'Plano ativo ou horário futuro no sistema.' },
        { label:'Planos iniciados', valor:analiseInteiro(resumo.planosIniciados), ajuda:'Mostra a tração comercial do ano.' },
        { label:'Renovações', valor:analiseInteiro(resumo.renovacoes), ajuda:'Plano repetido pelo mesmo paciente.' },
        { label:'Novos pacientes selecionados', valor:analiseInteiro(resumo.novosSelecionados.length), ajuda:'Seu indicador curado de captação real.' },
        { label:'Receita média por mês', valor:analiseMoeda(resumo.receitaMediaMensal), ajuda:'Ajuda a enxergar constância de crescimento.' },
        { label:'Pacientes recorrentes', valor:analiseInteiro(resumo.recorrentes), ajuda:'Paciente que já passou da 2ª sessão atendida no ano.' }
    ]);
    document.getElementById('fin_ana_chart1').innerHTML = analiseGraficoBarras(analiseMeses(), [
        { nome:'Novos selecionados', classe:'selecionado', data:resumo.selecionadosMensal, formatador:analiseInteiro },
        { nome:'Planos iniciados', classe:'receita', data:analiseMeses().map((_,idx)=>resumo.planos.filter(p=>analiseData(p.criado_em)?.getMonth()===idx).length), formatador:analiseInteiro },
        { nome:'Atendidos', classe:'atendido', data:resumo.atendidosMensal, formatador:analiseInteiro }
    ]);
    document.getElementById('fin_ana_chart2').innerHTML = analiseGraficoBarrasHorizontais(mesesReceita, { formatador:analiseMoeda });
    const linhas = analiseMeses().map((mes, idx) => [
        mes,
        analiseInteiro(resumo.selecionadosMensal[idx] || 0),
        analiseInteiro(resumo.planos.filter(p=>analiseData(p.criado_em)?.getMonth()===idx).length),
        analiseInteiro(resumo.atendidosMensal[idx] || 0)
    ]);
    document.getElementById('fin_ana_lista').innerHTML = analiseRenderTabelaMensal(linhas, ['Mês','Novos selecionados','Planos','Atendidos']);
}

function renderizarAnaliseQualidade(resumo) {
    analiseSetTitulos(
        'Qualidade operacional por mês',
        'Atendidos, faltas e cancelamentos: onde a clínica está performando e onde está escorregando.',
        'Indicadores de risco operacional',
        'Mostra as principais perdas do ano de forma simples.',
        'Resumo assistencial do ano',
        'Leitura rápida do comportamento da agenda e da adesão.'
    );
    const perdas = resumo.faltasNaoTotal + resumo.faltasJustTotal + resumo.canceladosTotal;
    analiseRenderKPIs([
        { label:'Taxa de comparecimento', valor:analisePercentual(resumo.taxaComparecimento), ajuda:'Quanto maior, melhor a aderência ao tratamento.' },
        { label:'Taxa de falta injustificada', valor:analisePercentual(resumo.taxaFaltaNao), ajuda:'Se isso subir, tem problema de confirmação, valor ou vínculo.' },
        { label:'Perdas operacionais', valor:analiseInteiro(perdas), ajuda:'Faltas + cancelamentos ao longo do ano.' },
        { label:'Atendimentos realizados', valor:analiseInteiro(resumo.atendidosTotal), ajuda:'Produção líquida entregue.' },
        { label:'Sessões ainda reservadas', valor:analiseInteiro(resumo.reservasTotal), ajuda:'Backlog futuro da agenda.' },
        { label:'Ticket médio por atendimento', valor:analiseMoeda(resumo.ticketMedioAtendimento), ajuda:'Quanto a clínica recebe, em média, por atendimento entregue.' }
    ]);
    document.getElementById('fin_ana_chart1').innerHTML = analiseGraficoBarras(analiseMeses(), [
        { nome:'Atendidos', classe:'atendido', data:resumo.atendidosMensal, formatador:analiseInteiro },
        { nome:'Faltas totais', classe:'falta', data:resumo.faltasJustMensal.map((v,idx)=>v+(resumo.faltasNaoMensal[idx]||0)), formatador:analiseInteiro },
        { nome:'Cancelados', classe:'cancelado', data:resumo.canceladosMensal, formatador:analiseInteiro }
    ]);
    document.getElementById('fin_ana_chart2').innerHTML = analiseGraficoBarrasHorizontais([
        { label:'Falta injustificada', valor:resumo.faltasNaoTotal, cor:'orange' },
        { label:'Falta justificada', valor:resumo.faltasJustTotal, cor:'orange' },
        { label:'Cancelamentos', valor:resumo.canceladosTotal, cor:'gray' },
        { label:'Agenda reservada futura', valor:resumo.reservasTotal, cor:'green' }
    ], { formatador:analiseInteiro });
    const linhas = analiseMeses().map((mes, idx) => {
        const at = resumo.atendidosMensal[idx] || 0;
        const perdasMes = (resumo.faltasJustMensal[idx] || 0) + (resumo.faltasNaoMensal[idx] || 0) + (resumo.canceladosMensal[idx] || 0);
        const taxa = (at + perdasMes) > 0 ? (at / (at + perdasMes)) * 100 : 0;
        return [mes, analiseInteiro(at), analiseInteiro(perdasMes), analisePercentual(taxa)];
    });
    document.getElementById('fin_ana_lista').innerHTML = analiseRenderTabelaMensal(linhas, ['Mês','Atendidos','Perdas','Qualidade']);
}

function renderizarAnaliseAdminVisao() {
    if (!analiseAdminCache?.resumo) {
        const lista = document.getElementById('fin_ana_lista');
        if (lista) lista.innerHTML = '<div class="ana-empty">Abra a aba para carregar os indicadores.</div>';
        return;
    }
    const visao = document.getElementById('fin_ana_visao')?.value || 'faturamento';
    const resumo = analiseAdminCache.resumo;
    if (visao === 'aniversariantes') return renderizarAnaliseAniversariantes(resumo);
    if (visao === 'atendimentos') return renderizarAnaliseAtendimentos(resumo);
    if (visao === 'novos_pacientes') return renderizarAnaliseNovosPacientes(resumo);
    if (visao === 'crescimento') return renderizarAnaliseCrescimento(resumo);
    if (visao === 'qualidade') return renderizarAnaliseQualidade(resumo);
    return renderizarAnaliseFaturamento(resumo);
}

async function carregarAnaliseAdmin(forcar=false) {
    if (!usuarioPodeVerAnaliseAdmin()) { try { alternarAbaFinanceiro('paciente'); } catch(_) {} return; }
    if (analiseAdminCarregando && !forcar) return;
    analiseAdminCarregando = true;
    const anoInput = document.getElementById('fin_ana_ano');
    if (anoInput && !anoInput.value) anoInput.value = String(analiseAnoAtual());
    const ano = Number(anoInput?.value || analiseAnoAtual()) || analiseAnoAtual();
    const feedback = document.getElementById('fin_ana_feedback');
    const periodo = document.getElementById('fin_ana_periodo');
    if (periodo) periodo.textContent = `Ano vigente em análise: ${ano} · aniversariantes do mês: ${new Date().toLocaleDateString('pt-BR',{month:'long'})}.`;
    if (feedback) { feedback.className = 'finance-feedback info'; feedback.textContent = 'Montando indicadores administrativos do ano…'; }
    try {
        const dados = await carregarDadosAnaliseAdminAno(ano);
        analiseAdminCache = { ano, dados, resumo: montarResumoAnaliseAdmin({ ...dados, ano }) };
        if (feedback) {
            feedback.className = `finance-feedback${dados.aviso ? ' aviso' : ' sucesso'}`;
            feedback.textContent = dados.aviso || `Análise atualizada com ${analiseInteiro(analiseAdminCache.resumo.pagamentosCount)} pagamento(s), ${analiseInteiro(analiseAdminCache.resumo.atendidosTotal)} atendimento(s) e ${analiseInteiro(analiseAdminCache.resumo.candidatosNovos.length)} cadastro(s) do ano.`;
        }
        renderizarAnaliseAdminVisao();
    } catch (err) {
        console.error('KineSys Análise ADM:', err);
        if (feedback) { feedback.className = 'finance-feedback erro'; feedback.textContent = 'Não foi possível montar a análise administrativa.'; }
        const lista = document.getElementById('fin_ana_lista');
        if (lista) lista.innerHTML = '<div class="ana-empty">Falha ao carregar a análise administrativa.</div>';
    } finally {
        analiseAdminCarregando = false;
    }
}

async function alternarNovoPacienteAnalise(pacienteId) {
    if (!usuarioPodeVerAnaliseAdmin()) return;
    const ano = Number(document.getElementById('fin_ana_ano')?.value || analiseAnoAtual()) || analiseAnoAtual();
    const atual = !!analiseAdminCache?.resumo?.novosSelecionados?.some(p => String(p.id) === String(pacienteId));
    const payload = {
        paciente_id: String(pacienteId),
        ano_referencia: ano,
        selecionado: !atual,
        marcado_em: new Date().toISOString(),
        marcado_por: usuarioLogado?.nome || 'Administrador',
        operacao_id: `${ano}_${pacienteId}`
    };
    salvarFlagAnaliseLocal(payload);
    const feedback = document.getElementById('fin_ana_feedback');
    if (feedback) {
        feedback.className = 'finance-feedback info';
        feedback.textContent = !atual ? 'Paciente incluído no indicador de novos pacientes. Sincronizando…' : 'Paciente removido do indicador de novos pacientes. Sincronizando…';
    }
    await carregarAnaliseAdmin(true);
}

function configurarAcessoAnaliseAdmin() {
    const pode = usuarioPodeVerAnaliseAdmin();
    const tab = document.getElementById('financeiro_tab_analise');
    if (tab) tab.hidden = !pode;
    const painel = document.getElementById('financeiro_painel_analise');
    if (!pode && painel && !painel.hidden) { try { alternarAbaFinanceiro('paciente'); } catch(_) {} }
    return pode;
}

if (typeof alternarAbaFinanceiro === 'function' && !alternarAbaFinanceiro.__analiseAdmWrapped) {
    const base = alternarAbaFinanceiro;
    const wrapped = function(aba='paciente') {
        const painel = document.getElementById('financeiro_painel_analise');
        const tab = document.getElementById('financeiro_tab_analise');
        if (aba === 'analise') {
            if (!usuarioPodeVerAnaliseAdmin()) return base('paciente');
            [
                'financeiro_painel_paciente','financeiro_painel_pendencias','financeiro_painel_descontos',
                'financeiro_painel_balanco','financeiro_painel_gastos','financeiro_painel_analise'
            ].forEach(id => { const el = document.getElementById(id); if (el) el.hidden = true; });
            [
                'financeiro_tab_paciente','financeiro_tab_pendencias','financeiro_tab_descontos',
                'financeiro_tab_balanco','financeiro_tab_gastos','financeiro_tab_analise'
            ].forEach(id => { const el = document.getElementById(id); if (el) { el.classList.remove('active'); el.setAttribute('aria-selected','false'); } });
            if (painel) painel.hidden = false;
            if (tab) { tab.classList.add('active'); tab.setAttribute('aria-selected','true'); }
            try { sessionStorage.setItem('kinesys_financeiro_aba','analise'); } catch(_) {}
            const anoInput = document.getElementById('fin_ana_ano');
            if (anoInput && !anoInput.value) anoInput.value = String(analiseAnoAtual());
            carregarAnaliseAdmin(false);
            return;
        }
        if (painel) painel.hidden = true;
        if (tab) { tab.classList.remove('active'); tab.setAttribute('aria-selected','false'); }
        return base(aba);
    };
    wrapped.__analiseAdmWrapped = true;
    alternarAbaFinanceiro = wrapped;
}

if (typeof inicializarFinanceiro === 'function' && !inicializarFinanceiro.__analiseAdmWrapped) {
    const base = inicializarFinanceiro;
    const wrapped = async function(...args) {
        const r = await base.apply(this,args);
        configurarAcessoAnaliseAdmin();
        const anoInput = document.getElementById('fin_ana_ano');
        if (anoInput && !anoInput.value) anoInput.value = String(analiseAnoAtual());
        let aba = 'paciente';
        try { aba = sessionStorage.getItem('kinesys_financeiro_aba') || 'paciente'; } catch(_) {}
        if (aba === 'analise' && usuarioPodeVerAnaliseAdmin()) alternarAbaFinanceiro('analise');
        return r;
    };
    wrapped.__analiseAdmWrapped = true;
    inicializarFinanceiro = wrapped;
}
