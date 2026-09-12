/* ============================================================================
   KineSys — BALANÇO FINANCEIRO MENSAL ADMINISTRATIVO v1.11.2
   - Competência sempre do dia 01 ao último dia do mês selecionado.
   - Receita = pagamentos efetivamente recebidos no período.
   - Despesa = gastos administrativos registrados no período.
   - Resultado = receita - despesa. Descontos são informativos e NÃO são
     subtraídos novamente, pois já reduzem o valor contratado/recebível.
   ============================================================================ */

const FINANCEIRO_LOCAL_DESPESAS = 'kinesys_financeiro_despesas_v1112';
let financeiroBalancoCarregando = false;
let financeiroBalancoCache = { pagamentos:[], planos:[], despesas:[], agendamentos:[] };

let financeiroGastosCache = [];

const FINANCEIRO_CATEGORIAS_GASTOS = ['Contas fixas','Despesas variáveis','Manutenção','Investimento','Marketing','Multas','Outros'];
const FINANCEIRO_TIPOS_GASTOS = {
    'Contas fixas':['Água','Energia elétrica','Internet / telefone','Aluguel / condomínio','Pró-labore','Simples Nacional / impostos recorrentes','Contabilidade','Folha / encargos','Software / assinaturas','Outro gasto fixo'],
    'Despesas variáveis':['Insumos','Materiais clínicos','Medicamentos','Serviços terceirizados','Taxas bancárias / cartão','Frete / entrega','Limpeza / consumo','Combustível / deslocamento','Outro gasto variável'],
    'Manutenção':['Manutenção de equipamentos','Manutenção predial','Manutenção de informática / TI','Peças / reposição','Calibração / assistência técnica','Outra manutenção'],
    'Investimento':['Equipamentos','Mobiliário','Obras / reformas','Tecnologia','Cursos / treinamentos','Aquisição patrimonial','Outro investimento'],
    'Marketing':['Tráfego pago','Redes sociais / design','Material gráfico','Eventos / parcerias','Produção de conteúdo','Outro marketing'],
    'Multas':['Multa tributária','Juros / mora','Multa contratual','Multa administrativa','Outra multa'],
    'Outros':['Outros']
};

function normalizarCategoriaGerencialBalanco(categoria='') {
    const raw=String(categoria||'').trim();
    if(FINANCEIRO_CATEGORIAS_GASTOS.includes(raw)) return raw;
    const c=raw.toLocaleLowerCase('pt-BR');
    if(/aluguel|condom|folha|pr[oó]-?labore|imposto|simples|software|assinatura|[aá]gua|energia|internet|contabil/.test(c)) return 'Contas fixas';
    if(/material|medicamento|insumo|terceir|taxa banc|cart[aã]o|frete|limpeza|combust/.test(c)) return 'Despesas variáveis';
    if(/manuten|reparo|calibra|assist[eê]ncia t[eé]cnica/.test(c)) return 'Manutenção';
    if(/equipamento|invest|mobili|obra|reforma|treinamento|curso|patrimon/.test(c)) return 'Investimento';
    if(/marketing|publicidade|tr[aá]fego|social|gr[aá]fico|evento/.test(c)) return 'Marketing';
    if(/multa|juros|mora/.test(c)) return 'Multas';
    return 'Outros';
}

function detalheCategoriaLegadaBalanco(despesa={}) {
    if(despesa.subcategoria) return String(despesa.subcategoria);
    const raw=String(despesa.categoria||'').trim();
    if(raw && !FINANCEIRO_CATEGORIAS_GASTOS.includes(raw)) return raw;
    return '';
}

function atualizarTiposDespesaFinanceira(valorSelecionado='') {
    const categoria=document.getElementById('fin_desp_categoria')?.value||'Contas fixas';
    const select=document.getElementById('fin_desp_subcategoria');if(!select)return;
    const tipos=FINANCEIRO_TIPOS_GASTOS[categoria]||['Outros'];
    select.innerHTML=tipos.map(x=>`<option value="${escapeHTML(x)}">${escapeHTML(x)}</option>`).join('');
    if(valorSelecionado && !tipos.includes(valorSelecionado)) select.insertAdjacentHTML('beforeend',`<option value="${escapeHTML(valorSelecionado)}">${escapeHTML(valorSelecionado)}</option>`);
    if(valorSelecionado) select.value=valorSelecionado;
}

function usuarioPodeVerBalancoFinanceiro() {
    if (typeof financeiroEhAdministrador === 'function') return financeiroEhAdministrador();
    const tipo = String(usuarioLogado?.tipo || '').toUpperCase();
    return ['MASTER','MASTER_FEM','ADMINISTRADOR','ADMINISTRADORA'].includes(tipo);
}

function mesAtualBalanco() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
}

function intervaloMesBalanco(valor='') {
    const v = /^\d{4}-\d{2}$/.test(String(valor||'')) ? String(valor) : mesAtualBalanco();
    const [ano,mes] = v.split('-').map(Number);
    const ultimo = new Date(ano, mes, 0).getDate();
    return {
        mes:v,
        inicio:`${ano}-${String(mes).padStart(2,'0')}-01`,
        fim:`${ano}-${String(mes).padStart(2,'0')}-${String(ultimo).padStart(2,'0')}`,
        inicioTs:`${ano}-${String(mes).padStart(2,'0')}-01T00:00:00`,
        fimExclusivoTs: new Date(ano, mes, 1).toISOString()
    };
}

function dataBRBalanco(iso='') {
    const v=String(iso||'').slice(0,10), p=v.split('-');
    return p.length===3?`${p[2]}/${p[1]}/${p[0]}`:'—';
}

function chaveDataBalanco(x, campo) { return String(x?.[campo]||'').slice(0,10); }
function dentroPeriodoBalanco(x,campo,inicio,fim) { const d=chaveDataBalanco(x,campo); return !!d&&d>=inicio&&d<=fim; }

function lerDespesasLocaisBalanco() {
    try { return (typeof lerFinanceiroLocal==='function'?lerFinanceiroLocal(FINANCEIRO_LOCAL_DESPESAS):JSON.parse(localStorage.getItem(FINANCEIRO_LOCAL_DESPESAS)||'[]')) || []; }
    catch(_) { return []; }
}
function gravarDespesasLocaisBalanco(lista) {
    if(typeof gravarFinanceiroLocal==='function') return gravarFinanceiroLocal(FINANCEIRO_LOCAL_DESPESAS,lista);
    try{localStorage.setItem(FINANCEIRO_LOCAL_DESPESAS,JSON.stringify(lista||[]));return true;}catch(_){return false;}
}
function salvarDespesaLocalBalanco(row) {
    const lista=lerDespesasLocaisBalanco();
    const i=lista.findIndex(x=>String(x.id||'')===String(row.id||'')||(row.operacao_id&&x.operacao_id===row.operacao_id));
    const local={...row,__local:true,__pending_sync:true};
    if(i>=0)lista[i]={...lista[i],...local};else lista.push(local);
    if(!gravarDespesasLocaisBalanco(lista)) throw new Error('Não foi possível preservar a despesa neste computador.');
    return local;
}
function removerDespesaLocalBalanco(id) { gravarDespesasLocaisBalanco(lerDespesasLocaisBalanco().filter(x=>String(x.id||'')!==String(id||''))); }

function mesclarBalanco(nuvem=[],locais=[]) {
    if(typeof mesclarRegistrosFinanceiros==='function') return mesclarRegistrosFinanceiros(nuvem,locais);
    const m=new Map();[...(nuvem||[]),...(locais||[])].forEach(x=>{if(x?.id)m.set(String(x.id),{...(m.get(String(x.id))||{}),...x});});return [...m.values()];
}

async function sincronizarDespesasFinanceirasLocais() {
    if(!_supabase || !usuarioPodeVerBalancoFinanceiro()) return false;
    const pendentes=lerDespesasLocaisBalanco().filter(x=>x.__pending_sync);
    let ok=true;
    for(const desp of pendentes){
        try{
            const row={...desp};delete row.__local;delete row.__pending_sync;
            const r=await _supabase.from('despesas_financeiras').upsert([row],{onConflict:'id'});
            if(r.error)throw r.error;
            removerDespesaLocalBalanco(desp.id);
        }catch(err){ok=false;console.warn('Balanço: despesa aguardando sincronização.',err);break;}
    }
    return ok;
}

function configurarAcessoBalancoFinanceiro() {
    const pode=usuarioPodeVerBalancoFinanceiro();
    const tab=document.getElementById('financeiro_tab_balanco');
    const tabGastos=document.getElementById('financeiro_tab_gastos');
    if(tab)tab.hidden=!pode;if(tabGastos)tabGastos.hidden=!pode;
    if(!pode&&(!document.getElementById('financeiro_painel_balanco')?.hidden||!document.getElementById('financeiro_painel_gastos')?.hidden)){try{alternarAbaFinanceiro('paciente');}catch(_){}}
    return pode;
}

async function buscarDadosBalancoMensal(inicio,fim,inicioTs,fimExclusivoTs) {
    const locaisPag=(typeof lerFinanceiroLocal==='function'?lerFinanceiroLocal(FINANCEIRO_LOCAL_PAGAMENTOS):[])
        .filter(p=>dentroPeriodoBalanco(p,'data_pagamento',inicio,fim))
        .filter(p=>typeof pagamentoEstaMarcadoParaExclusao!=='function'||!pagamentoEstaMarcadoParaExclusao(p));
    const locaisPlan=(typeof lerFinanceiroLocal==='function'?lerFinanceiroLocal(FINANCEIRO_LOCAL_PLANOS):[]).filter(p=>dentroPeriodoBalanco(p,'criado_em',inicio,fim));
    const locaisDesp=lerDespesasLocaisBalanco().filter(d=>dentroPeriodoBalanco(d,'data_despesa',inicio,fim));
    let locaisAg=[];
    try{if(typeof lerAgendamentosPendentesSync==='function')locaisAg=(lerAgendamentosPendentesSync()||[]).map(x=>x?.payload).filter(Boolean).filter(a=>dentroPeriodoBalanco(a,'data',inicio,fim));}catch(_){}
    if(!_supabase)return {pagamentos:locaisPag,planos:locaisPlan,despesas:locaisDesp,agendamentos:locaisAg,aviso:'Sem conexão com o Supabase: o balanço usa somente dados preservados neste computador e pode estar incompleto.'};

    let pag=[],plan=[],desp=[],ag=[],avisos=[];
    try{const r=await _supabase.from('pagamentos').select('id,plano_id,paciente_id,valor,forma_pagamento,data_pagamento,criado_em,criado_por').gte('data_pagamento',inicio).lte('data_pagamento',fim);if(r.error)throw r.error;pag=r.data||[];}catch(e){avisos.push('recebimentos');}
    try{
        let r=await _supabase.from('planos_atendimento').select('id,paciente_id,nome,valor_final,desconto_valor,desconto_pacote,desconto_cortesia,status,criado_em,criado_por').gte('criado_em',inicioTs).lt('criado_em',fimExclusivoTs);
        if(r.error&&/desconto_pacote|desconto_cortesia|column|schema cache/i.test(String(r.error.message||'')))r=await _supabase.from('planos_atendimento').select('id,paciente_id,nome,valor_final,desconto_valor,status,criado_em,criado_por').gte('criado_em',inicioTs).lt('criado_em',fimExclusivoTs);
        if(r.error)throw r.error;plan=r.data||[];
    }catch(e){avisos.push('planos/descontos');}
    try{let r=await _supabase.from('despesas_financeiras').select('id,descricao,categoria,subcategoria,valor,data_despesa,forma_pagamento,observacoes,criado_por,criado_em,operacao_id').gte('data_despesa',inicio).lte('data_despesa',fim).order('data_despesa',{ascending:false});if(r.error&&/subcategoria|column|schema cache/i.test(String(r.error.message||'')))r=await _supabase.from('despesas_financeiras').select('id,descricao,categoria,valor,data_despesa,forma_pagamento,observacoes,criado_por,criado_em,operacao_id').gte('data_despesa',inicio).lte('data_despesa',fim).order('data_despesa',{ascending:false});if(r.error)throw r.error;desp=r.data||[];}catch(e){if(!/does not exist|schema cache|relation/i.test(String(e?.message||e||'')))avisos.push('despesas');else avisos.push('despesas — execute a migration');}
    try{const r=await _supabase.from('agendamentos').select('id,status,data').gte('data',inicio).lte('data',fim);if(r.error)throw r.error;ag=r.data||[];}catch(e){avisos.push('agenda');}
    return {
        pagamentos:mesclarBalanco(pag,locaisPag).filter(p=>dentroPeriodoBalanco(p,'data_pagamento',inicio,fim)).filter(p=>typeof pagamentoEstaMarcadoParaExclusao!=='function'||!pagamentoEstaMarcadoParaExclusao(p)),
        planos:mesclarBalanco(plan,locaisPlan).filter(p=>dentroPeriodoBalanco(p,'criado_em',inicio,fim)),
        despesas:mesclarBalanco(desp,locaisDesp).filter(d=>dentroPeriodoBalanco(d,'data_despesa',inicio,fim)),
        agendamentos:mesclarBalanco(ag,locaisAg).filter(a=>dentroPeriodoBalanco(a,'data',inicio,fim)),
        aviso:avisos.length?`Não foi possível confirmar ${avisos.join(', ')} na nuvem. O painel mesclou os dados disponíveis.`:''
    };
}

function calcularResumoBalanco(dados) {
    const pagamentos=(dados.pagamentos||[]).filter(x=>Number(x.valor)!==0);
    const recebimentos=pagamentos.filter(x=>Number(x.valor)>0);
    const planos=(dados.planos||[]).filter(x=>String(x.status||'ativo')!=='cancelado');
    const despesas=(dados.despesas||[]).filter(x=>Number(x.valor)>0);
    const ag=(dados.agendamentos||[]);
    const receita=pagamentos.reduce((s,x)=>s+(Number(x.valor)||0),0);
    const recebidoBruto=recebimentos.reduce((s,x)=>s+Math.max(0,Number(x.valor)||0),0);
    const gasto=despesas.reduce((s,x)=>s+Math.max(0,Number(x.valor)||0),0);
    const desc=planos.reduce((acc,p)=>{
        const d=typeof financeiroDescontosPlano==='function'?financeiroDescontosPlano(p):{pacote:Number(p.desconto_pacote)||0,cortesia:Number(p.desconto_cortesia)||0,naoClassificado:Math.max(0,(Number(p.desconto_valor)||0)-(Number(p.desconto_pacote)||0)-(Number(p.desconto_cortesia)||0)),total:Number(p.desconto_valor)||0};
        acc.pacote+=d.pacote||0;acc.cortesia+=d.cortesia||0;acc.legacy+=d.naoClassificado||0;acc.total+=d.total||0;return acc;
    },{pacote:0,cortesia:0,legacy:0,total:0});
    const atendidos=ag.filter(a=>['atendido','concluido'].includes(String(a.status||''))).length;
    const faltas=ag.filter(a=>String(a.status||'')==='falta_nao_justificada').length;
    return {receita,gasto,resultado:receita-gasto,desc,pagamentos:recebimentos.length,ticket:recebimentos.length?recebidoBruto/recebimentos.length:0,planos:planos.length,atendidos,faltas,despesas:despesas.length};
}

function renderizarBalancoMensal(dados,intervalo,aviso='') {
    const r=calcularResumoBalanco(dados);
    const set=(id,v)=>{const el=document.getElementById(id);if(el)el.textContent=v;};
    set('fin_bal_receita',moedaBR(r.receita));set('fin_bal_despesas',moedaBR(r.gasto));set('fin_bal_resultado',moedaBR(r.resultado));set('fin_bal_descontos',moedaBR(r.desc.total));
    set('fin_bal_qtd_pagamentos',String(r.pagamentos));set('fin_bal_ticket',moedaBR(r.ticket));set('fin_bal_planos',String(r.planos));set('fin_bal_atendidos',String(r.atendidos));set('fin_bal_faltas',String(r.faltas));set('fin_bal_qtd_despesas',String(r.despesas));
    set('fin_bal_periodo',`${dataBRBalanco(intervalo.inicio)} até ${dataBRBalanco(intervalo.fim)}`);
    const card=document.getElementById('fin_bal_resultado_card');if(card){card.classList.toggle('positivo',r.resultado>=0);card.classList.toggle('negativo',r.resultado<0);}
    const feedback=document.getElementById('fin_bal_feedback');if(feedback){feedback.className=`finance-feedback${aviso?' aviso':' sucesso'}`;feedback.textContent=aviso||`Competência fechada de ${dataBRBalanco(intervalo.inicio)} a ${dataBRBalanco(intervalo.fim)}.`;}
    const comp=document.getElementById('fin_bal_composicao');if(comp)comp.innerHTML=[
        ['Recebimentos efetivos',r.receita],['Despesas registradas',r.gasto],['Resultado operacional',r.resultado],['Desconto por pacote',r.desc.pacote],['Desconto por cortesia',r.desc.cortesia],['Desconto antigo não classificado',r.desc.legacy]
    ].map(([l,v])=>`<div class="finance-balance-break-row"><span>${escapeHTML(l)}</span><b>${escapeHTML(moedaBR(v))}</b></div>`).join('');
    const categorias={};(dados.despesas||[]).forEach(d=>{const c=normalizarCategoriaGerencialBalanco(d.categoria);categorias[c]=(categorias[c]||0)+Math.max(0,Number(d.valor)||0);});
    const cat=document.getElementById('fin_bal_categorias');if(cat)cat.innerHTML=Object.keys(categorias).length?Object.entries(categorias).sort((a,b)=>b[1]-a[1]).map(([c,v])=>`<div class="finance-balance-break-row"><span>${escapeHTML(c)}</span><b>${escapeHTML(moedaBR(v))}</b></div>`).join(''):'<div class="finance-balance-empty">Nenhuma despesa registrada neste mês.</div>';
    renderizarListaDespesasBalanco(dados.despesas||[]);
}

function renderizarListaDespesasBalanco(lista=[]) {
    const el=document.getElementById('fin_bal_despesas_lista');if(!el)return;
    const itens=[...lista].sort((a,b)=>`${b.data_despesa||''} ${b.criado_em||''}`.localeCompare(`${a.data_despesa||''} ${a.criado_em||''}`));
    if(!itens.length){el.innerHTML='<div class="finance-balance-empty">Nenhuma despesa registrada neste mês.</div>';return;}
    el.innerHTML='<div class="finance-expense-row header"><span>Data</span><span>Descrição</span><span>Categoria</span><span>Valor</span><span></span></div>'+itens.map(d=>`<div class="finance-expense-row"><span>${escapeHTML(dataBRBalanco(d.data_despesa))}</span><span><b>${escapeHTML(d.descricao||'Despesa')}</b><small>${escapeHTML(d.forma_pagamento||'Forma não informada')}${d.criado_por?` · por ${escapeHTML(d.criado_por)}`:''}</small></span><span>${escapeHTML(normalizarCategoriaGerencialBalanco(d.categoria))}${detalheCategoriaLegadaBalanco(d)?`<small>${escapeHTML(detalheCategoriaLegadaBalanco(d))}</small>`:''}</span><span><b>${escapeHTML(moedaBR(d.valor))}</b></span><button type="button" class="finance-expense-delete" title="Excluir despesa" aria-label="Excluir despesa" onclick="excluirDespesaFinanceira('${String(d.id||'').replace(/'/g,"\\'")}')">×</button></div>`).join('');
}

async function carregarBalancoFinanceiroMensal(forcar=false) {
    if(!usuarioPodeVerBalancoFinanceiro()){try{alternarAbaFinanceiro('paciente');}catch(_){}return;}
    if(financeiroBalancoCarregando&&!forcar)return;
    const input=document.getElementById('fin_bal_mes');if(input&&!input.value)input.value=mesAtualBalanco();
    const intervalo=intervaloMesBalanco(input?.value||'');
    financeiroBalancoCarregando=true;
    const fb=document.getElementById('fin_bal_feedback');if(fb){fb.className='finance-feedback info';fb.textContent='Calculando o balanço mensal…';}
    try{
        await sincronizarDespesasFinanceirasLocais().catch(()=>false);
        const dados=await buscarDadosBalancoMensal(intervalo.inicio,intervalo.fim,intervalo.inicioTs,intervalo.fimExclusivoTs);
        financeiroBalancoCache=dados;renderizarBalancoMensal(dados,intervalo,dados.aviso||'');
    }catch(err){console.error('Balanço mensal:',err);if(fb){fb.className='finance-feedback erro';fb.textContent='Não foi possível calcular o balanço financeiro deste mês.';}}
    finally{financeiroBalancoCarregando=false;}
}

function abrirModalDespesaFinanceira() {
    if(!usuarioPodeVerBalancoFinanceiro()){alert('Somente administradores podem registrar despesas.');return;}
    const edit=document.getElementById('fin_desp_edit_id');if(edit)edit.value='';
    const titulo=document.getElementById('fin_desp_titulo');if(titulo)titulo.textContent='Registrar gasto';
    const btn=document.getElementById('fin_desp_salvar_btn');if(btn)btn.textContent='Registrar gasto';
    const op=document.getElementById('fin_desp_operacao');if(op)op.value=typeof gerarOperacaoFinanceiraId==='function'?gerarOperacaoFinanceiraId('desp'):`desp_${Date.now()}`;
    const desc=document.getElementById('fin_desp_descricao');if(desc)desc.value='';
    const val=document.getElementById('fin_desp_valor');if(val)val.value='';
    const data=document.getElementById('fin_desp_data');if(data)data.value=typeof financeiroHojeISO==='function'?financeiroHojeISO():new Date().toISOString().slice(0,10);
    const cat=document.getElementById('fin_desp_categoria');if(cat)cat.value='Contas fixas';atualizarTiposDespesaFinanceira();
    const forma=document.getElementById('fin_desp_forma');if(forma)forma.value='';
    const obs=document.getElementById('fin_desp_observacoes');if(obs)obs.value='';
    abrirModal('modal_fin_despesa');
}

async function salvarDespesaFinanceira() {
    if(!usuarioPodeVerBalancoFinanceiro()){alert('Somente administradores podem registrar despesas.');return false;}
    const descricao=document.getElementById('fin_desp_descricao')?.value.trim()||'';
    const categoria=document.getElementById('fin_desp_categoria')?.value||'Outros';
    const valor=typeof numeroFinanceiro==='function'?numeroFinanceiro(document.getElementById('fin_desp_valor')?.value):Number(document.getElementById('fin_desp_valor')?.value||0);
    const data=document.getElementById('fin_desp_data')?.value||'';
    if(!descricao){alert('Informe a descrição da despesa.');return false;}if(!(valor>0)){alert('Informe um valor maior que zero.');return false;}if(!data){alert('Informe a data da despesa.');return false;}
    const editId=document.getElementById('fin_desp_edit_id')?.value||'';
    const original=(financeiroGastosCache||[]).find(x=>String(x.id||'')===String(editId))||(financeiroBalancoCache.despesas||[]).find(x=>String(x.id||'')===String(editId));
    const row={id:editId||(typeof gerarUUIDFinanceiro==='function'?gerarUUIDFinanceiro():crypto.randomUUID()),descricao,categoria,subcategoria:document.getElementById('fin_desp_subcategoria')?.value||null,valor,data_despesa:data,forma_pagamento:document.getElementById('fin_desp_forma')?.value||null,observacoes:document.getElementById('fin_desp_observacoes')?.value.trim()||null,criado_por:original?.criado_por||usuarioLogado?.nome||'Administrador',criado_em:original?.criado_em||new Date().toISOString(),operacao_id:original?.operacao_id||document.getElementById('fin_desp_operacao')?.value||`desp_${Date.now()}`};
    let nuvem=false,erro=null;
    if(_supabase){try{const r=await _supabase.from('despesas_financeiras').upsert([row],{onConflict:'id'});if(r.error&&!/duplicate key|23505/i.test(String(r.error.message||r.error.code||'')))throw r.error;nuvem=true;}catch(e){erro=e;}}
    if(!nuvem){try{salvarDespesaLocalBalanco(row);}catch(e){alert(e.message||'Não foi possível salvar a despesa.');return false;}}
    else removerDespesaLocalBalanco(row.id);
    fecharModal('modal_fin_despesa');
    const mes=document.getElementById('fin_bal_mes');if(mes)mes.value=String(data).slice(0,7);
    await carregarBalancoFinanceiroMensal(true);
    if(document.getElementById('financeiro_painel_gastos')&&!document.getElementById('financeiro_painel_gastos').hidden){const gm=document.getElementById('fin_gastos_mes');if(gm)gm.value=String(data).slice(0,7);await carregarLancamentosGastos(true);}
    const fb=document.getElementById('fin_bal_feedback');if(fb&&erro){fb.className='finance-feedback aviso';fb.textContent='Gasto preservado neste computador; a sincronização com a nuvem será tentada novamente.';}
    const fbg=document.getElementById('fin_gastos_feedback');if(fbg&&erro&&!document.getElementById('financeiro_painel_gastos')?.hidden){fbg.className='finance-feedback aviso';fbg.textContent='Gasto preservado neste computador; execute a migration se a categoria detalhada ainda não estiver disponível na nuvem.';}
    return true;
}

async function excluirDespesaFinanceira(id) {
    if(!usuarioPodeVerBalancoFinanceiro()){alert('Somente administradores podem excluir despesas.');return false;}
    const d=(financeiroGastosCache||[]).find(x=>String(x.id||'')===String(id||''))||(financeiroBalancoCache.despesas||[]).find(x=>String(x.id||'')===String(id||''));if(!d)return false;
    const ok=typeof confirmarKineSys==='function'?await confirmarKineSys(`Excluir a despesa “${d.descricao||'Despesa'}” de ${moedaBR(d.valor)}?`,{titulo:'Excluir despesa',confirmar:'Excluir',destrutivo:true}):confirm('Excluir esta despesa?');if(!ok)return false;
    const local=lerDespesasLocaisBalanco().find(x=>String(x.id||'')===String(id||''));
    if(local?.__pending_sync){removerDespesaLocalBalanco(id);await carregarBalancoFinanceiroMensal(true);if(!document.getElementById('financeiro_painel_gastos')?.hidden)await carregarLancamentosGastos(true);return true;}
    if(!_supabase){alert('Sem conexão: esta despesa já foi sincronizada e não pode ser excluída com segurança agora.');return false;}
    try{const r=await _supabase.from('despesas_financeiras').delete().eq('id',id);if(r.error)throw r.error;removerDespesaLocalBalanco(id);await carregarBalancoFinanceiroMensal(true);if(!document.getElementById('financeiro_painel_gastos')?.hidden)await carregarLancamentosGastos(true);return true;}catch(err){console.error(err);alert('Não foi possível excluir a despesa na nuvem. Nenhum valor foi alterado.');return false;}
}

// Estende as subabas existentes sem retirar Conta, Pendências ou Descontos.
if(typeof alternarAbaFinanceiro==='function'&&!alternarAbaFinanceiro.__balancoWrapped){
    const base=alternarAbaFinanceiro;
    const wrapped=function(aba='paciente'){
        const painel=document.getElementById('financeiro_painel_balanco'),tab=document.getElementById('financeiro_tab_balanco');
        const painelGastos=document.getElementById('financeiro_painel_gastos'),tabGastos=document.getElementById('financeiro_tab_gastos');
        if(aba==='balanco'||aba==='gastos'){
            if(!usuarioPodeVerBalancoFinanceiro())return base('paciente');
            ['financeiro_painel_paciente','financeiro_painel_pendencias','financeiro_painel_descontos','financeiro_painel_balanco','financeiro_painel_gastos'].forEach(id=>{const el=document.getElementById(id);if(el)el.hidden=true;});
            ['financeiro_tab_paciente','financeiro_tab_pendencias','financeiro_tab_descontos','financeiro_tab_balanco','financeiro_tab_gastos'].forEach(id=>{const el=document.getElementById(id);if(el){el.classList.remove('active');el.setAttribute('aria-selected','false');}});
            if(aba==='balanco'){
                if(painel)painel.hidden=false;if(tab){tab.classList.add('active');tab.setAttribute('aria-selected','true');}
                try{sessionStorage.setItem('kinesys_financeiro_aba','balanco');}catch(_){}
                const mes=document.getElementById('fin_bal_mes');if(mes&&!mes.value)mes.value=mesAtualBalanco();
                carregarBalancoFinanceiroMensal(false);
            } else {
                if(painelGastos)painelGastos.hidden=false;if(tabGastos){tabGastos.classList.add('active');tabGastos.setAttribute('aria-selected','true');}
                try{sessionStorage.setItem('kinesys_financeiro_aba','gastos');}catch(_){}
                const mes=document.getElementById('fin_gastos_mes');if(mes&&!mes.value)mes.value=mesAtualBalanco();carregarLancamentosGastos(false);
            }
            return;
        }
        if(painel)painel.hidden=true;if(tab){tab.classList.remove('active');tab.setAttribute('aria-selected','false');}
        if(painelGastos)painelGastos.hidden=true;if(tabGastos){tabGastos.classList.remove('active');tabGastos.setAttribute('aria-selected','false');}
        return base(aba);
    };
    wrapped.__balancoWrapped=true;alternarAbaFinanceiro=wrapped;
}



function abrirEditarDespesaFinanceira(id) {
    if(!usuarioPodeVerBalancoFinanceiro())return;
    const d=(financeiroGastosCache||[]).find(x=>String(x.id||'')===String(id||''))||(financeiroBalancoCache.despesas||[]).find(x=>String(x.id||'')===String(id||''));
    if(!d)return;
    const edit=document.getElementById('fin_desp_edit_id');if(edit)edit.value=String(d.id||'');
    const titulo=document.getElementById('fin_desp_titulo');if(titulo)titulo.textContent='Editar gasto';
    const btn=document.getElementById('fin_desp_salvar_btn');if(btn)btn.textContent='Salvar alterações';
    const op=document.getElementById('fin_desp_operacao');if(op)op.value=d.operacao_id||'';
    const desc=document.getElementById('fin_desp_descricao');if(desc)desc.value=d.descricao||'';
    const val=document.getElementById('fin_desp_valor');if(val)val.value=(Number(d.valor)||0).toFixed(2).replace('.',',');
    const data=document.getElementById('fin_desp_data');if(data)data.value=String(d.data_despesa||'').slice(0,10);
    const categoria=normalizarCategoriaGerencialBalanco(d.categoria);const cat=document.getElementById('fin_desp_categoria');if(cat)cat.value=categoria;
    atualizarTiposDespesaFinanceira(detalheCategoriaLegadaBalanco(d));
    const forma=document.getElementById('fin_desp_forma');if(forma)forma.value=d.forma_pagamento||'';
    const obs=document.getElementById('fin_desp_observacoes');if(obs)obs.value=d.observacoes||'';
    abrirModal('modal_fin_despesa');
}

async function carregarLancamentosGastos(forcar=false) {
    if(!usuarioPodeVerBalancoFinanceiro()){try{alternarAbaFinanceiro('paciente');}catch(_){}return;}
    const mesEl=document.getElementById('fin_gastos_mes');if(mesEl&&!mesEl.value)mesEl.value=mesAtualBalanco();
    const int=intervaloMesBalanco(mesEl?.value||'');
    const fb=document.getElementById('fin_gastos_feedback');if(fb){fb.className='finance-feedback info';fb.textContent='Carregando lançamentos do mês…';}
    try{
        await sincronizarDespesasFinanceirasLocais().catch(()=>false);
        const dados=await buscarDadosBalancoMensal(int.inicio,int.fim,int.inicioTs,int.fimExclusivoTs);
        financeiroGastosCache=[...(dados.despesas||[])];
        if(fb){fb.className=`finance-feedback${dados.aviso?' aviso':' sucesso'}`;fb.textContent=dados.aviso||`Gastos de ${dataBRBalanco(int.inicio)} a ${dataBRBalanco(int.fim)}.`;}
        renderizarLancamentosGastos();
    }catch(err){console.error('Lançamentos de gastos:',err);if(fb){fb.className='finance-feedback erro';fb.textContent='Não foi possível carregar os lançamentos de gastos.';}}
}

function renderizarLancamentosGastos() {
    const listaEl=document.getElementById('fin_gastos_lista');if(!listaEl)return;
    const filtro=document.getElementById('fin_gastos_categoria_filtro')?.value||'';
    const busca=(document.getElementById('fin_gastos_busca')?.value||'').trim().toLocaleLowerCase('pt-BR');
    const todos=[...(financeiroGastosCache||[])].sort((a,b)=>`${b.data_despesa||''} ${b.criado_em||''}`.localeCompare(`${a.data_despesa||''} ${a.criado_em||''}`));
    const porCategoria={};FINANCEIRO_CATEGORIAS_GASTOS.forEach(c=>porCategoria[c]=0);
    todos.forEach(d=>{const c=normalizarCategoriaGerencialBalanco(d.categoria);porCategoria[c]=(porCategoria[c]||0)+Math.max(0,Number(d.valor)||0);});
    const itens=todos.filter(d=>{
        const c=normalizarCategoriaGerencialBalanco(d.categoria);if(filtro&&c!==filtro)return false;
        if(!busca)return true;const texto=[d.descricao,c,detalheCategoriaLegadaBalanco(d),d.forma_pagamento,d.observacoes,d.criado_por].join(' ').toLocaleLowerCase('pt-BR');return texto.includes(busca);
    });
    const total=itens.reduce((s,d)=>s+Math.max(0,Number(d.valor)||0),0);
    const maior=Object.entries(porCategoria).sort((a,b)=>b[1]-a[1])[0]||['—',0];
    const set=(id,v)=>{const el=document.getElementById(id);if(el)el.textContent=v;};set('fin_gastos_total',moedaBR(total));set('fin_gastos_qtd',String(itens.length));set('fin_gastos_maior_categoria',maior[1]>0?`${maior[0]} · ${moedaBR(maior[1])}`:'—');
    const resumo=document.getElementById('fin_gastos_resumo_categorias');if(resumo)resumo.innerHTML=FINANCEIRO_CATEGORIAS_GASTOS.map(c=>{const v=porCategoria[c]||0;const qtd=todos.filter(d=>normalizarCategoriaGerencialBalanco(d.categoria)===c).length;return `<button type="button" class="finance-expense-break-card kds-u-ta-left kds-u-cursor-pointer" onclick="document.getElementById('fin_gastos_categoria_filtro').value='${c.replace(/'/g,"\\'")}';renderizarLancamentosGastos()"><span>${escapeHTML(c)}</span><strong>${escapeHTML(moedaBR(v))}</strong><small>${qtd} lançamento${qtd===1?'':'s'}</small></button>`;}).join('');
    if(!itens.length){listaEl.innerHTML='<div class="finance-balance-empty">Nenhum gasto encontrado com estes filtros.</div>';return;}
    listaEl.innerHTML='<div class="finance-expense-admin-row header"><span>Data</span><span>Descrição</span><span>Categoria</span><span>Tipo</span><span>Valor</span><span></span></div>'+itens.map(d=>{const c=normalizarCategoriaGerencialBalanco(d.categoria),sub=detalheCategoriaLegadaBalanco(d)||'—';return `<div class="finance-expense-admin-row"><span>${escapeHTML(dataBRBalanco(d.data_despesa))}</span><span><b>${escapeHTML(d.descricao||'Gasto')}</b><small>${escapeHTML(d.forma_pagamento||'Forma não informada')}${d.criado_por?` · ${escapeHTML(d.criado_por)}`:''}</small></span><span>${escapeHTML(c)}</span><span>${escapeHTML(sub)}</span><span><b>${escapeHTML(moedaBR(d.valor))}</b></span><span class="finance-expense-admin-actions"><button type="button" title="Editar" aria-label="Editar gasto" onclick="abrirEditarDespesaFinanceira('${String(d.id||'').replace(/'/g,"\\'")}')">✎</button><button type="button" class="danger" title="Excluir" aria-label="Excluir gasto" onclick="excluirDespesaFinanceira('${String(d.id||'').replace(/'/g,"\\'")}')">×</button></span></div>`;}).join('');
}

if(typeof inicializarFinanceiro==='function'&&!inicializarFinanceiro.__balancoWrapped){
    const base=inicializarFinanceiro;
    const wrapped=async function(...args){
        const r=await base.apply(this,args);configurarAcessoBalancoFinanceiro();
        const mes=document.getElementById('fin_bal_mes');if(mes&&!mes.value)mes.value=mesAtualBalanco();
        const mesGastos=document.getElementById('fin_gastos_mes');if(mesGastos&&!mesGastos.value)mesGastos.value=mesAtualBalanco();
        let aba='paciente';try{aba=sessionStorage.getItem('kinesys_financeiro_aba')||'paciente';}catch(_){}
        if(['balanco','gastos'].includes(aba)&&usuarioPodeVerBalancoFinanceiro())alternarAbaFinanceiro(aba);
        return r;
    };wrapped.__balancoWrapped=true;inicializarFinanceiro=wrapped;
}
