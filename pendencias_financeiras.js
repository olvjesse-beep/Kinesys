/* ============================================================================
   KineSys — PENDÊNCIAS FINANCEIRAS / ASSISTENCIAIS v1.11.2
   Visão global para identificar:
   - pacientes ativos;
   - valores ainda a receber;
   - sessões já pagas que a clínica ainda deve realizar;
   - pré-agendamentos aguardando renovação/cobertura;
   - pacientes ativos sem próximo horário.

   Esta camada não cria novo schema. Ela deriva os indicadores das tabelas já
   usadas pelo Financeiro, Agenda e Crédito do paciente.
   ============================================================================ */

let financeiroPendenciasCache = [];
let financeiroPendenciasFiltro = 'todos';
let financeiroPendenciasUltimaCarga = 0;
let financeiroPendenciasCarregando = false;
let financeiroPendenciasAvisoParcial = '';

function normalizarTextoPendencias(valor='') {
    return String(valor || '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
}

function dataHoraPendenciaChave(a={}) {
    return `${a.data || ''} ${a.hora_inicio || ''}`.trim();
}

function formatarDataHoraPendencia(a) {
    if (!a?.data) return 'Sem próximo horário';
    const [ano,mes,dia] = String(a.data).split('-');
    const data = (ano && mes && dia) ? `${dia}/${mes}/${ano}` : String(a.data);
    return `${data}${a.hora_inicio ? ` · ${String(a.hora_inicio).slice(0,5)}` : ''}`;
}

function dinheiroPendencia(v) {
    return typeof moedaBR === 'function' ? moedaBR(v) : Number(v || 0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
}

function mergePorIdPendencias(nuvem=[], locais=[]) {
    if (typeof mesclarRegistrosFinanceiros === 'function') return mesclarRegistrosFinanceiros(nuvem,locais);
    const mapa = new Map();
    [...(nuvem||[]), ...(locais||[])].forEach(x=>{
        if (!x?.id) return;
        mapa.set(String(x.id), {...(mapa.get(String(x.id))||{}), ...x});
    });
    return [...mapa.values()];
}

async function consultarTabelaPaginadaPendencias(tabela, campos='*', configurar=null) {
    if (!_supabase) return {data:[],error:null,online:false};
    const saida=[];
    const lote=1000;
    try {
        for (let inicio=0; inicio<10000; inicio+=lote) {
            let q = _supabase.from(tabela).select(campos).range(inicio,inicio+lote-1);
            if (typeof configurar === 'function') q = configurar(q) || q;
            const {data,error} = await q;
            if (error) return {data:saida,error,online:true};
            const bloco=data||[];
            saida.push(...bloco);
            if (bloco.length<lote) break;
        }
        return {data:saida,error:null,online:true};
    } catch(err) {
        return {data:saida,error:err,online:true};
    }
}

function obterAgendamentosLocaisPendencias() {
    const listas=[];
    try {
        if (typeof agendaAgendamentosSemanaCache !== 'undefined' && Array.isArray(agendaAgendamentosSemanaCache)) listas.push(agendaAgendamentosSemanaCache);
    } catch(_) {}
    try {
        if (typeof agendaAgendamentosDoDiaCache !== 'undefined' && Array.isArray(agendaAgendamentosDoDiaCache)) listas.push(agendaAgendamentosDoDiaCache);
    } catch(_) {}
    try {
        if (typeof lerAgendamentosPendentesSync === 'function') listas.push((lerAgendamentosPendentesSync()||[]).map(x=>x?.payload).filter(Boolean));
    } catch(_) {}
    const mapa=new Map();
    listas.flat().forEach(a=>{ if(a?.id) mapa.set(String(a.id), {...(mapa.get(String(a.id))||{}),...a}); });
    return [...mapa.values()];
}

function obterLocaisPendenciasFinanceiras() {
    let planos=[], pagamentos=[], usos=[];
    try { planos = lerFinanceiroLocal(FINANCEIRO_LOCAL_PLANOS) || []; } catch(_) {}
    try { pagamentos = (lerFinanceiroLocal(FINANCEIRO_LOCAL_PAGAMENTOS) || []).filter(p=>typeof pagamentoEstaMarcadoParaExclusao!=='function'||!pagamentoEstaMarcadoParaExclusao(p)); } catch(_) {}
    try {
        if (typeof FINANCEIRO_LOCAL_CREDITOS_USOS !== 'undefined') {
            usos = (lerFinanceiroLocal(FINANCEIRO_LOCAL_CREDITOS_USOS)||[]).filter(u=>typeof usoCreditoEstaMarcadoParaExclusao!=='function'||!usoCreditoEstaMarcadoParaExclusao(u));
        }
    } catch(_) {}
    return {planos,pagamentos,usos,agendamentos:obterAgendamentosLocaisPendencias()};
}

function calcularCreditoGlobalPaciente(planos,pagamentos,usos) {
    if (typeof calcularComponentesCreditoPaciente === 'function') {
        try { return calcularComponentesCreditoPaciente(pagamentos,planos,usos); } catch(_) {}
    }
    return {gerado:0,usado:0,liquido:0,disponivel:0};
}

function resumoPlanoPendencias(plano, pagamentos, usos, agendamentos) {
    const contratadas=Math.max(0,Number(plano?.sessoes_contratadas)||0);
    const valorFinal=Math.max(0,Number(plano?.valor_final)||0);
    const agendaPlano=(agendamentos||[]).filter(a=>String(a.plano_id||'')===String(plano?.id||''));
    const consumidas=agendaPlano.filter(a=>typeof financeiroStatusConsomeSessao==='function' ? financeiroStatusConsomeSessao(a.status) : ['atendido','falta_nao_justificada','concluido'].includes(String(a.status||''))).length;
    const reservadas=agendaPlano.filter(a=>typeof financeiroStatusReservaAgenda==='function' ? financeiroStatusReservaAgenda(a.status) : ['pre_agendado','agendado','confirmado','em_recepcao'].includes(String(a.status||''))).length;
    let resumoPagamento;
    if (typeof financeiroResumoPagamentoPlano === 'function') {
        try { resumoPagamento=financeiroResumoPagamentoPlano(plano,pagamentos,usos); } catch(_) {}
    }
    if (!resumoPagamento) {
        const recebido=(pagamentos||[]).filter(p=>String(p.plano_id||'')===String(plano.id||'')).reduce((s,p)=>s+Math.max(0,Number(p.valor)||0),0);
        const aplicado=(usos||[]).filter(u=>String(u.plano_id||'')===String(plano.id||'')).reduce((s,u)=>s+Math.max(0,Number(u.valor)||0),0);
        const efetivo=recebido+aplicado;
        const unit=contratadas?valorFinal/contratadas:0;
        const sessoesPagas=valorFinal<=.009?contratadas:(unit>0?Math.min(contratadas,Math.floor((efetivo/unit)+1e-9)):0);
        resumoPagamento={pagos:Math.min(valorFinal,efetivo),saldo:Math.max(0,valorFinal-efetivo),sessoesPagas,valorFinal};
    }
    const sessoesPagas=Math.max(0,Number(resumoPagamento.sessoesPagas)||0);
    const pagasARealizar=Math.max(0,Math.min(contratadas,sessoesPagas)-Math.min(contratadas,consumidas));
    const valorSessao=contratadas>0?valorFinal/contratadas:0;
    const pagoEfetivo=Math.max(0,valorFinal-Math.max(0,Number(resumoPagamento.saldo)||0));
    const valorServicoConsumido=Math.min(contratadas,consumidas)*valorSessao;
    const valorPrestadoSemCobertura=Math.max(0,Math.min(Math.max(0,Number(resumoPagamento.saldo)||0),valorServicoConsumido-pagoEfetivo));
    const restantes=Math.max(0,contratadas-consumidas);
    return {
        contratadas,consumidas,reservadas,restantes,
        saldo:Math.max(0,Number(resumoPagamento.saldo)||0),
        pagoEfetivo,pagasARealizar,valorPrestadoSemCobertura,valorSessao
    };
}

function construirPendenciasPorPaciente(pacientes,planos,pagamentos,usos,agendamentos) {
    const hoje = typeof financeiroHojeISO === 'function' ? financeiroHojeISO() : new Date().toISOString().slice(0,10);
    const pacientesMap=new Map((pacientes||[]).map(p=>[String(p.id||''),p]));
    const ids=new Set();
    (planos||[]).forEach(x=>ids.add(String(x.paciente_id||'')));
    (pagamentos||[]).forEach(x=>ids.add(String(x.paciente_id||'')));
    (usos||[]).forEach(x=>ids.add(String(x.paciente_id||'')));
    (agendamentos||[]).forEach(x=>ids.add(String(x.paciente_id||'')));
    (pacientes||[]).forEach(x=>ids.add(String(x.id||'')));
    ids.delete('');

    const linhas=[];
    ids.forEach(id=>{
        const paciente=pacientesMap.get(id)||{id,nome:'Paciente'};
        const pPlanos=(planos||[]).filter(p=>String(p.paciente_id||'')===id && String(p.status||'ativo')!=='cancelado');
        const pPag=(pagamentos||[]).filter(p=>String(p.paciente_id||'')===id && (typeof pagamentoEstaMarcadoParaExclusao!=='function'||!pagamentoEstaMarcadoParaExclusao(p)));
        const pUsos=(usos||[]).filter(u=>String(u.paciente_id||'')===id && (typeof usoCreditoEstaMarcadoParaExclusao!=='function'||!usoCreditoEstaMarcadoParaExclusao(u)));
        const pAgenda=(agendamentos||[]).filter(a=>String(a.paciente_id||'')===id && String(a.status||'')!=='cancelado');
        const futuras=pAgenda.filter(a=>String(a.data||'')>=hoje && !['atendido','concluido','falta_justificada','falta_nao_justificada'].includes(String(a.status||''))).sort((a,b)=>dataHoraPendenciaChave(a).localeCompare(dataHoraPendenciaChave(b)));
        const proximo=futuras[0]||null;
        const preSemPacote=futuras.filter(a=>String(a.status||'')==='pre_agendado'&&!a.plano_id).length;
        const resumos=pPlanos.map(pl=>({plano:pl,m:resumoPlanoPendencias(pl,pPag,pUsos,pAgenda)}));
        const planosAtivos=resumos.filter(x=>String(x.plano.status||'ativo')==='ativo');
        const saldoReceber=resumos.reduce((s,x)=>s+x.m.saldo,0);
        const cobrarServicoPrestado=resumos.reduce((s,x)=>s+x.m.valorPrestadoSemCobertura,0);
        const sessoesPagasARealizar=resumos.reduce((s,x)=>s+x.m.pagasARealizar,0);
        const sessoesRestantesAtivas=planosAtivos.reduce((s,x)=>s+x.m.restantes,0);
        const credito=calcularCreditoGlobalPaciente(pPlanos,pPag,pUsos);
        const ativo=planosAtivos.length>0||futuras.length>0;
        const aCobrar=saldoReceber>0.009;
        const clinicaDeve=sessoesPagasARealizar>0 || Number(credito.disponivel||0)>0.009;
        const aguardaRenovacao=preSemPacote>0;
        const semProximo=planosAtivos.length>0 && sessoesRestantesAtivas>0 && !proximo;
        const emDia=ativo&&!aCobrar&&!aguardaRenovacao;
        if (!(ativo||aCobrar||clinicaDeve||aguardaRenovacao||semProximo)) return;
        linhas.push({
            id,nome:paciente.nome||'Paciente',telefone:paciente.telefone||'',cpf:paciente.cpf||'',
            ativo,aCobrar,clinicaDeve,aguardaRenovacao,semProximo,emDia,
            saldoReceber,cobrarServicoPrestado,sessoesPagasARealizar,sessoesRestantesAtivas,
            creditoDisponivel:Math.max(0,Number(credito.disponivel)||0),preSemPacote,proximo,
            prioridade:(cobrarServicoPrestado>0.009?100:0)+(aCobrar?40:0)+(aguardaRenovacao?25:0)+(semProximo?15:0)+(clinicaDeve?5:0)
        });
    });
    return linhas.sort((a,b)=>b.prioridade-a.prioridade||String(a.nome).localeCompare(String(b.nome),'pt-BR'));
}

async function carregarDadosPendenciasFinanceiras() {
    const locais=obterLocaisPendenciasFinanceiras();
    let pacientes=[];
    try { pacientes=await obterPacientesSalvos(); } catch(_) { pacientes=[]; }
    financeiroPendenciasAvisoParcial='';

    if (!_supabase) {
        financeiroPendenciasAvisoParcial='Sem conexão com o Supabase: a lista usa somente dados preservados neste computador e pode estar incompleta.';
        return {pacientes, ...locais};
    }

    const [plR,pagR,usoR,agR] = await Promise.all([
        consultarTabelaPaginadaPendencias('planos_atendimento','id,paciente_id,procedimento_id,nome,sessoes_contratadas,valor_final,status,criado_em'),
        consultarTabelaPaginadaPendencias('pagamentos','id,plano_id,paciente_id,valor,data_pagamento,criado_em'),
        consultarTabelaPaginadaPendencias('creditos_paciente_usos','id,plano_id,paciente_id,valor,data_uso,criado_em'),
        consultarTabelaPaginadaPendencias('agendamentos','id,paciente_id,plano_id,procedimento_id,status,data,hora_inicio')
    ]);

    const falhas=[];
    if (plR.error) falhas.push('planos');
    if (pagR.error) falhas.push('pagamentos');
    // A tabela de crédito é opcional para compatibilidade com instalações que ainda não rodaram a migration.
    if (usoR.error && !/creditos_paciente_usos|does not exist|schema cache|relation/i.test(String(usoR.error?.message||usoR.error||''))) falhas.push('créditos');
    if (agR.error) falhas.push('agenda');
    if (falhas.length) financeiroPendenciasAvisoParcial=`Não foi possível confirmar ${falhas.join(', ')} na nuvem. A lista mesclou os dados disponíveis localmente.`;

    return {
        pacientes,
        planos:mergePorIdPendencias(plR.data||[],locais.planos),
        pagamentos:mergePorIdPendencias(pagR.data||[],locais.pagamentos).filter(p=>typeof pagamentoEstaMarcadoParaExclusao!=='function'||!pagamentoEstaMarcadoParaExclusao(p)),
        usos:mergePorIdPendencias(usoR.error?[]:(usoR.data||[]),locais.usos).filter(u=>typeof usoCreditoEstaMarcadoParaExclusao!=='function'||!usoCreditoEstaMarcadoParaExclusao(u)),
        agendamentos:mergePorIdPendencias(agR.data||[],locais.agendamentos)
    };
}

function atualizarResumoPendenciasFinanceiras() {
    const l=financeiroPendenciasCache||[];
    const set=(id,v)=>{const el=document.getElementById(id);if(el)el.textContent=String(v)};
    set('fin_pen_stat_ativos',l.filter(x=>x.ativo).length);
    set('fin_pen_stat_cobrar',l.filter(x=>x.aCobrar).length);
    set('fin_pen_stat_atender',l.filter(x=>x.clinicaDeve).length);
    set('fin_pen_stat_renovar',l.filter(x=>x.aguardaRenovacao).length);
    set('fin_pen_stat_semhorario',l.filter(x=>x.semProximo).length);
    const count=document.getElementById('financeiro_pendencias_count');
    if(count) count.textContent=String(l.filter(x=>x.aCobrar||x.aguardaRenovacao||x.semProximo).length);
}

function filtroPendenciaAceita(item,filtro) {
    if(filtro==='cobrar')return item.aCobrar;
    if(filtro==='atender')return item.clinicaDeve;
    if(filtro==='renovar')return item.aguardaRenovacao;
    if(filtro==='sem_horario')return item.semProximo;
    if(filtro==='em_dia')return item.emDia;
    return true;
}

function renderizarPendenciasFinanceiras() {
    const lista=document.getElementById('financeiro_pendencias_lista');
    if(!lista)return;
    const busca=normalizarTextoPendencias(document.getElementById('financeiro_pendencias_busca')?.value||'');
    const filtrados=(financeiroPendenciasCache||[]).filter(x=>filtroPendenciaAceita(x,financeiroPendenciasFiltro)).filter(x=>{
        if(!busca)return true;
        return normalizarTextoPendencias(`${x.nome} ${x.telefone} ${x.cpf}`).includes(busca);
    });
    if(!filtrados.length){
        lista.innerHTML='<div class="finance-empty">Nenhum paciente corresponde a este filtro.</div>';
        return;
    }
    lista.innerHTML=filtrados.map(x=>{
        const badges=[];
        if(x.ativo)badges.push('<span class="finance-pending-badge ativo">Ativo</span>');
        if(x.aCobrar)badges.push('<span class="finance-pending-badge cobrar">A cobrar</span>');
        if(x.clinicaDeve)badges.push('<span class="finance-pending-badge atender">Clínica deve atender</span>');
        if(x.aguardaRenovacao)badges.push('<span class="finance-pending-badge renovar">Aguardando renovação</span>');
        if(x.semProximo)badges.push('<span class="finance-pending-badge sem-horario">Sem próximo horário</span>');
        if(x.creditoDisponivel>0.009)badges.push('<span class="finance-pending-badge credito">Tem crédito</span>');
        const contato=[x.telefone,x.cpf].filter(Boolean).join(' · ')||'Sem telefone cadastrado';
        const detalhes=[];
        if(x.saldoReceber>0.009)detalhes.push(`<div class="danger">Saldo a receber: <b>${escapeHTML(dinheiroPendencia(x.saldoReceber))}</b></div>`);
        if(x.cobrarServicoPrestado>0.009)detalhes.push(`<div class="danger">Já prestado e sem cobertura: <b>${escapeHTML(dinheiroPendencia(x.cobrarServicoPrestado))}</b></div>`);
        if(x.sessoesPagasARealizar>0)detalhes.push(`<div class="ok">Sessões pagas a realizar: <b>${x.sessoesPagasARealizar}</b></div>`);
        if(x.creditoDisponivel>0.009)detalhes.push(`<div class="ok">Crédito disponível: <b>${escapeHTML(dinheiroPendencia(x.creditoDisponivel))}</b></div>`);
        if(x.preSemPacote>0)detalhes.push(`<div>Pré-agendamentos sem pacote: <b>${x.preSemPacote}</b></div>`);
        if(x.sessoesRestantesAtivas>0)detalhes.push(`<div>Sessões restantes em planos ativos: <b>${x.sessoesRestantesAtivas}</b></div>`);
        detalhes.push(`<div>Próximo atendimento: <b>${escapeHTML(formatarDataHoraPendencia(x.proximo))}</b></div>`);
        return `<article class="finance-pending-card ${x.cobrarServicoPrestado>0.009?'prioridade':''}">
            <div class="finance-pending-patient"><strong>${escapeHTML(x.nome)}</strong><small>${escapeHTML(contato)}</small><div class="finance-pending-badges">${badges.join('')}</div></div>
            <div class="finance-pending-detail">${detalhes.join('')}</div>
            <div class="finance-pending-actions"><button type="button" class="primary" onclick="abrirFinanceiroPacientePendencias('${escapeHTML(x.id)}')">Abrir financeiro</button>${x.telefone?`<button type="button" onclick="copiarContatoPendencias('${escapeHTML(x.id)}')">Copiar contato</button>`:''}</div>
        </article>`;
    }).join('');
}

function filtrarPendenciasFinanceiras(filtro='todos') {
    financeiroPendenciasFiltro=filtro;
    document.querySelectorAll('[data-fin-pen-filter]').forEach(b=>b.classList.toggle('active',b.dataset.finPenFilter===filtro));
    renderizarPendenciasFinanceiras();
}

async function carregarPendenciasFinanceiras(forcar=false) {
    if(financeiroPendenciasCarregando)return;
    const agora=Date.now();
    if(!forcar && financeiroPendenciasCache.length && (agora-financeiroPendenciasUltimaCarga)<60000){
        atualizarResumoPendenciasFinanceiras();renderizarPendenciasFinanceiras();return;
    }
    financeiroPendenciasCarregando=true;
    const feedback=document.getElementById('financeiro_pendencias_feedback');
    const lista=document.getElementById('financeiro_pendencias_lista');
    if(feedback){feedback.className='finance-feedback info';feedback.textContent='Atualizando pendências de todos os pacientes…';}
    if(lista)lista.innerHTML='<div class="finance-empty">Carregando situação financeira e assistencial…</div>';
    try{
        const d=await carregarDadosPendenciasFinanceiras();
        financeiroPendenciasCache=construirPendenciasPorPaciente(d.pacientes,d.planos,d.pagamentos,d.usos,d.agendamentos);
        financeiroPendenciasUltimaCarga=Date.now();
        atualizarResumoPendenciasFinanceiras();
        renderizarPendenciasFinanceiras();
        if(feedback){
            feedback.className='finance-feedback '+(financeiroPendenciasAvisoParcial?'aviso':'sucesso');
            feedback.textContent=financeiroPendenciasAvisoParcial||`Lista atualizada: ${financeiroPendenciasCache.length} paciente(s) com atividade ou pendência.`;
        }
    }catch(err){
        console.error('KineSys Pendências:',err);
        if(feedback){feedback.className='finance-feedback erro';feedback.textContent='Não foi possível montar a lista de pendências. Verifique a conexão e tente novamente.';}
        if(lista)lista.innerHTML='<div class="finance-empty erro">Falha ao carregar as pendências.</div>';
    }finally{financeiroPendenciasCarregando=false;}
}

function alternarAbaFinanceiro(aba='paciente') {
    const pend=aba==='pendencias';
    const painelPaciente=document.getElementById('financeiro_painel_paciente');
    const painelPend=document.getElementById('financeiro_painel_pendencias');
    const tabPaciente=document.getElementById('financeiro_tab_paciente');
    const tabPend=document.getElementById('financeiro_tab_pendencias');
    if(painelPaciente)painelPaciente.hidden=pend;
    if(painelPend)painelPend.hidden=!pend;
    if(tabPaciente){tabPaciente.classList.toggle('active',!pend);tabPaciente.setAttribute('aria-selected',String(!pend));}
    if(tabPend){tabPend.classList.toggle('active',pend);tabPend.setAttribute('aria-selected',String(pend));}
    try{sessionStorage.setItem('kinesys_financeiro_aba',pend?'pendencias':'paciente');}catch(_){}
    if(pend)carregarPendenciasFinanceiras(false);
}

async function abrirFinanceiroPacientePendencias(pacienteId) {
    alternarAbaFinanceiro('paciente');
    try { if(typeof definirPacienteContexto==='function') await definirPacienteContexto(pacienteId); } catch(_) {}
    const sel=document.getElementById('financeiro_paciente_select');
    if(sel){
        if(!Array.from(sel.options).some(o=>String(o.value)===String(pacienteId)) && typeof popularPacientesFinanceiro==='function') await popularPacientesFinanceiro(pacienteId);
        sel.value=String(pacienteId);
    }
    if(typeof carregarFinanceiroPaciente==='function') await carregarFinanceiroPaciente();
}

async function copiarContatoPendencias(pacienteId) {
    const item=(financeiroPendenciasCache||[]).find(x=>String(x.id)===String(pacienteId));
    if(!item?.telefone)return;
    const texto=`${item.nome} — ${item.telefone}`;
    try{
        await navigator.clipboard.writeText(texto);
        const feedback=document.getElementById('financeiro_pendencias_feedback');
        if(feedback){feedback.className='finance-feedback sucesso';feedback.textContent='Contato copiado.';}
    }catch(_){
        const ta=document.createElement('textarea');ta.value=texto;document.body.appendChild(ta);ta.select();document.execCommand('copy');ta.remove();
    }
}

// Ao entrar no Financeiro, preserva a última subaba e atualiza silenciosamente
// o contador de pendências. A carga pesada é reaproveitada por até 60 segundos.
if (typeof inicializarFinanceiro === 'function' && !inicializarFinanceiro.__pendenciasWrapped) {
    const inicializarFinanceiroBase=inicializarFinanceiro;
    const wrapped=async function(...args){
        const r=await inicializarFinanceiroBase.apply(this,args);
        let aba='paciente';
        try{aba=sessionStorage.getItem('kinesys_financeiro_aba')||'paciente';}catch(_){}
        alternarAbaFinanceiro(aba==='pendencias'?'pendencias':'paciente');
        carregarPendenciasFinanceiras(false).catch(err=>console.warn('Pendências financeiras:',err));
        return r;
    };
    wrapped.__pendenciasWrapped=true;
    inicializarFinanceiro=wrapped;
}
