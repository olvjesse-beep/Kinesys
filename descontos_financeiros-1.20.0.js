/* ============================================================================
   KineSys — AUDITORIA ADMINISTRATIVA DE DESCONTOS v1.11.2
   - Separa desconto por pacote e desconto por cortesia.
   - Relatório global por período exclusivo para Administrador.
   - Mantém descontos legados como não classificados, sem inferir sua origem.
   ============================================================================ */

let financeiroDescontosCache = [];
let financeiroDescontosCarregando = false;
let financeiroDescontosInicializado = false;

function usuarioPodeVerRelatorioDescontos() {
    if (typeof financeiroEhAdministrador === 'function') return financeiroEhAdministrador();
    const tipo=String(usuarioLogado?.tipo||'').toUpperCase();
    return ['MASTER','MASTER_FEM','ADMINISTRADOR','ADMINISTRADORA'].includes(tipo);
}

function configurarAcessoRelatorioDescontos() {
    const pode=usuarioPodeVerRelatorioDescontos();
    const tab=document.getElementById('financeiro_tab_descontos');
    if(tab) tab.hidden=!pode;
    if(!pode && !document.getElementById('financeiro_painel_descontos')?.hidden) {
        try { alternarAbaFinanceiro('paciente'); } catch(_) {}
    }
    return pode;
}

function dataISODesconto(d=new Date()) {
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function definirPeriodoDescontos(dias=30) {
    if(!usuarioPodeVerRelatorioDescontos()) return;
    const fim=new Date();
    const inicio=new Date();
    inicio.setDate(inicio.getDate()-Math.max(0,Number(dias||30)-1));
    const ei=document.getElementById('fin_desc_data_inicio');
    const ef=document.getElementById('fin_desc_data_fim');
    if(ei) ei.value=dataISODesconto(inicio);
    if(ef) ef.value=dataISODesconto(fim);
    carregarRelatorioDescontos(true);
}

function normalizarDescontosPlanoRelatorio(plano={}) {
    const pacote=Math.max(0,Number(plano.desconto_pacote)||0);
    const cortesia=Math.max(0,Number(plano.desconto_cortesia)||0);
    const legado=Math.max(0,Number(plano.desconto_valor)||0);
    const classificado=pacote+cortesia;
    const naoClassificado=Math.max(0,legado-classificado);
    const total=Math.max(legado,classificado);
    return {pacote,cortesia,naoClassificado,total};
}

function planoDentroPeriodoDesconto(plano,inicio,fim) {
    const data=String(plano?.criado_em||'').slice(0,10);
    return !!data && data>=inicio && data<=fim;
}

function mesclarPlanosRelatorioDesconto(nuvem=[],locais=[]) {
    if(typeof mesclarRegistrosFinanceiros==='function') return mesclarRegistrosFinanceiros(nuvem,locais);
    const mapa=new Map();
    [...nuvem,...locais].forEach(x=>{if(x?.id)mapa.set(String(x.id),{...(mapa.get(String(x.id))||{}),...x});});
    return [...mapa.values()];
}

async function buscarPlanosDescontosPeriodo(inicio,fim) {
    let locais=[];
    try { locais=(lerFinanceiroLocal(FINANCEIRO_LOCAL_PLANOS)||[]).filter(p=>planoDentroPeriodoDesconto(p,inicio,fim)); } catch(_) {}
    if(!_supabase) return {planos:locais,aviso:'Sem conexão com o Supabase: exibindo somente registros preservados neste computador.'};

    let nuvem=[];
    let aviso='';
    try {
        const inicioTs=`${inicio}T00:00:00`;
        const fimD=new Date(`${fim}T00:00:00`); fimD.setDate(fimD.getDate()+1);
        const fimTs=fimD.toISOString();
        let r=await _supabase.from('planos_atendimento')
            .select('id,paciente_id,nome,desconto_valor,desconto_pacote,desconto_cortesia,criado_em,criado_por,status')
            .gte('criado_em',inicioTs).lt('criado_em',fimTs).order('criado_em',{ascending:false});
        if(r.error && /desconto_pacote|desconto_cortesia|schema cache|column .* does not exist/i.test(String(r.error.message||''))) {
            const fallback=await _supabase.from('planos_atendimento')
                .select('id,paciente_id,nome,desconto_valor,criado_em,criado_por,status')
                .gte('criado_em',inicioTs).lt('criado_em',fimTs).order('criado_em',{ascending:false});
            if(fallback.error) throw fallback.error;
            nuvem=fallback.data||[];
            aviso='A migração que separa os tipos de desconto ainda não foi aplicada no Supabase. Os registros antigos aparecem como histórico não classificado.';
        } else if(r.error) throw r.error;
        else nuvem=r.data||[];
    } catch(err) {
        console.warn('Relatório de descontos:',err);
        aviso='Não foi possível confirmar todos os descontos na nuvem. O relatório mesclou os dados locais disponíveis.';
    }
    return {planos:mesclarPlanosRelatorioDesconto(nuvem,locais),aviso};
}

function formatarDataDesconto(valor='') {
    const data=String(valor||'').slice(0,10);
    if(!data) return '—';
    const [a,m,d]=data.split('-');
    return a&&m&&d?`${d}/${m}/${a}`:data;
}

function renderizarRelatorioDescontos(aviso='') {
    const lista=document.getElementById('fin_desc_lista');
    const feedback=document.getElementById('fin_desc_feedback');
    const set=(id,v)=>{const el=document.getElementById(id);if(el)el.textContent=moedaBR(v);};
    const validos=(financeiroDescontosCache||[]).filter(p=>String(p.status||'ativo')!=='cancelado');
    const enriquecidos=validos.map(p=>({p,d:normalizarDescontosPlanoRelatorio(p)})).filter(x=>x.d.total>0.009);
    const totais=enriquecidos.reduce((acc,x)=>({
        total:acc.total+x.d.total,
        pacote:acc.pacote+x.d.pacote,
        cortesia:acc.cortesia+x.d.cortesia,
        legacy:acc.legacy+x.d.naoClassificado
    }),{total:0,pacote:0,cortesia:0,legacy:0});
    set('fin_desc_total',totais.total); set('fin_desc_pacote',totais.pacote); set('fin_desc_cortesia',totais.cortesia); set('fin_desc_legacy',totais.legacy);
    if(feedback){feedback.className=`finance-feedback${aviso?' aviso':' sucesso'}`;feedback.textContent=aviso||`${enriquecidos.length} concessão(ões) de desconto encontrada(s) no período. Planos cancelados não entram no total.`;}
    if(!lista) return;
    if(!enriquecidos.length){lista.innerHTML='<div class="finance-empty">Nenhum desconto concedido neste período.</div>';return;}
    lista.innerHTML=`<div class="finance-discount-row header"><span>Data</span><span>Paciente</span><span>Plano</span><span>Pacote</span><span>Cortesia</span><span>Total</span></div>`+enriquecidos.map(({p,d})=>{
        const legacy=d.naoClassificado>0.009?`<small class="finance-discount-legacy"> + ${moedaBR(d.naoClassificado)} não classificado</small>`:'';
        const paciente=String(p.__paciente_nome||'Paciente').trim();
        const autor=String(p.criado_por||'').trim();
        const criadoPor=autor&&autor.toLocaleLowerCase('pt-BR')!==paciente.toLocaleLowerCase('pt-BR')?`<small>Criado por: ${escapeHTML(autor)}</small>`:'';
        return `<div class="finance-discount-row"><span>${escapeHTML(formatarDataDesconto(p.criado_em))}</span><span><b>${escapeHTML(paciente)}</b>${criadoPor}</span><span>${escapeHTML(p.nome||'Plano de atendimento')}</span><span>${escapeHTML(moedaBR(d.pacote))}</span><span>${escapeHTML(moedaBR(d.cortesia))}${legacy}</span><span><b>${escapeHTML(moedaBR(d.total))}</b></span></div>`;
    }).join('');
}

async function carregarRelatorioDescontos(forcar=false) {
    if(!usuarioPodeVerRelatorioDescontos()) { try{alternarAbaFinanceiro('paciente');}catch(_){} return; }
    if(financeiroDescontosCarregando&&!forcar)return;
    const inicio=document.getElementById('fin_desc_data_inicio')?.value||'';
    const fim=document.getElementById('fin_desc_data_fim')?.value||'';
    const feedback=document.getElementById('fin_desc_feedback');
    if(!inicio||!fim){if(feedback){feedback.className='finance-feedback aviso';feedback.textContent='Informe a data inicial e final.';}return;}
    if(inicio>fim){if(feedback){feedback.className='finance-feedback erro';feedback.textContent='A data inicial não pode ser posterior à data final.';}return;}
    financeiroDescontosCarregando=true;
    if(feedback){feedback.className='finance-feedback info';feedback.textContent='Calculando descontos concedidos no período…';}
    try {
        const [{planos,aviso},pacientes]=await Promise.all([
            buscarPlanosDescontosPeriodo(inicio,fim),
            (typeof obterPacientesSalvos==='function'?obterPacientesSalvos():Promise.resolve([])).catch(()=>[])
        ]);
        const nomes=new Map((pacientes||[]).map(p=>[String(p.id||''),p.nome||'Paciente']));
        financeiroDescontosCache=(planos||[]).filter(p=>planoDentroPeriodoDesconto(p,inicio,fim)).map(p=>({...p,__paciente_nome:nomes.get(String(p.paciente_id||''))||'Paciente'})).sort((a,b)=>String(b.criado_em||'').localeCompare(String(a.criado_em||'')));
        renderizarRelatorioDescontos(aviso);
    } catch(err) {
        console.error('Relatório de descontos:',err);
        if(feedback){feedback.className='finance-feedback erro';feedback.textContent='Não foi possível calcular os descontos deste período.';}
    } finally { financeiroDescontosCarregando=false; }
}

function inicializarPeriodoRelatorioDescontos() {
    if(financeiroDescontosInicializado)return;
    const fim=new Date(),inicio=new Date();inicio.setDate(inicio.getDate()-29);
    const ei=document.getElementById('fin_desc_data_inicio'),ef=document.getElementById('fin_desc_data_fim');
    if(ei&&!ei.value)ei.value=dataISODesconto(inicio);
    if(ef&&!ef.value)ef.value=dataISODesconto(fim);
    financeiroDescontosInicializado=true;
}

// Estende as subabas já existentes no Financeiro sem retirar Pendências.
if(typeof alternarAbaFinanceiro==='function'&&!alternarAbaFinanceiro.__descontosWrapped){
    const alternarBase=alternarAbaFinanceiro;
    const wrapped=function(aba='paciente'){
        const painelDesc=document.getElementById('financeiro_painel_descontos');
        const tabDesc=document.getElementById('financeiro_tab_descontos');
        if(aba==='descontos'){
            if(!usuarioPodeVerRelatorioDescontos()) return alternarBase('paciente');
            const pp=document.getElementById('financeiro_painel_paciente'),pd=document.getElementById('financeiro_painel_pendencias');
            const tp=document.getElementById('financeiro_tab_paciente'),td=document.getElementById('financeiro_tab_pendencias');
            if(pp)pp.hidden=true;if(pd)pd.hidden=true;if(painelDesc)painelDesc.hidden=false;
            if(tp){tp.classList.remove('active');tp.setAttribute('aria-selected','false');}
            if(td){td.classList.remove('active');td.setAttribute('aria-selected','false');}
            if(tabDesc){tabDesc.classList.add('active');tabDesc.setAttribute('aria-selected','true');}
            try{sessionStorage.setItem('kinesys_financeiro_aba','descontos');}catch(_){}
            inicializarPeriodoRelatorioDescontos();carregarRelatorioDescontos(false);return;
        }
        if(painelDesc)painelDesc.hidden=true;
        if(tabDesc){tabDesc.classList.remove('active');tabDesc.setAttribute('aria-selected','false');}
        return alternarBase(aba);
    };
    wrapped.__descontosWrapped=true;
    alternarAbaFinanceiro=wrapped;
}

if(typeof inicializarFinanceiro==='function'&&!inicializarFinanceiro.__descontosWrapped){
    const initBase=inicializarFinanceiro;
    const wrapped=async function(...args){
        const r=await initBase.apply(this,args);
        configurarAcessoRelatorioDescontos();
        let aba='paciente';try{aba=sessionStorage.getItem('kinesys_financeiro_aba')||'paciente';}catch(_){}
        if(aba==='descontos'&&usuarioPodeVerRelatorioDescontos())alternarAbaFinanceiro('descontos');
        return r;
    };
    wrapped.__descontosWrapped=true;
    inicializarFinanceiro=wrapped;
}
