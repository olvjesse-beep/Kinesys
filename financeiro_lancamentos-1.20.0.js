(function (global) {
    'use strict';

    const estado = { mes: '', tipo: 'entrada', busca: '', itens: [], carregando: false, ativa: false };
    const idsPaineis = ['financeiro_painel_paciente','financeiro_painel_pendencias','financeiro_painel_descontos','financeiro_painel_gastos','financeiro_painel_balanco','financeiro_painel_analise','financeiro_painel_lancamentos'];
    const idsAbas = ['financeiro_tab_paciente','financeiro_tab_pendencias','financeiro_tab_descontos','financeiro_tab_gastos','financeiro_tab_balanco','financeiro_tab_analise','financeiro_tab_lancamentos'];

    const porId = id => document.getElementById(id);
    const texto = valor => String(valor == null ? '' : valor);
    const escapeHTML = valor => texto(valor).replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
    const moeda = valor => Number(valor || 0).toLocaleString('pt-BR', { style:'currency', currency:'BRL' });
    const hojeMes = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`; };
    const normalizar = valor => texto(valor).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();

    function periodo(mes) {
        const [ano, numero] = mes.split('-').map(Number);
        const ultimo = new Date(ano, numero, 0).getDate();
        return { inicio:`${mes}-01`, fim:`${mes}-${String(ultimo).padStart(2,'0')}` };
    }

    function podeVer() {
        if (typeof global.usuarioPodeVerBalancoFinanceiro === 'function') return !!global.usuarioPodeVerBalancoFinanceiro();
        return texto(global.usuarioLogado?.role || global.usuarioLogado?.perfil).toLowerCase() === 'admin';
    }

    function supabase() {
        if (typeof global.kinesysObterEstadoFinanceiro === 'function') {
            const legado = global.kinesysObterEstadoFinanceiro();
            if (legado && legado.supabase) return legado.supabase;
        }
        return global._supabase || global.supabaseClient || null;
    }

    async function consultar(tabela, colunas, campoData, inicio, fim) {
        const cliente = supabase();
        if (!cliente) return { data:[], error:new Error('Sem conexão com o Supabase') };
        return cliente.from(tabela).select(colunas).gte(campoData,inicio).lte(campoData,fim).order(campoData,{ascending:false});
    }

    async function carregarDados() {
        const { inicio, fim } = periodo(estado.mes);
        const [pagamentos, despesas, pacientes] = await Promise.all([
            consultar('pagamentos','id,paciente_id,plano_id,valor,forma_pagamento,data_pagamento,criado_em,tipo,motivo_estorno,estorno_de','data_pagamento',inicio,fim),
            consultar('despesas_financeiras','id,descricao,categoria,subcategoria,valor,data_despesa,forma_pagamento,observacoes','data_despesa',inicio,fim),
            (() => { const c=supabase(); return c ? c.from('pacientes').select('id,nome') : Promise.resolve({data:[],error:null}); })()
        ]);
        if (pagamentos.error) throw pagamentos.error;
        if (despesas.error && !/does not exist|schema cache|relation/i.test(texto(despesas.error.message))) throw despesas.error;
        const nomes = new Map((pacientes.data || []).map(p => [texto(p.id), p.nome || 'Paciente']));
        const entradas = (pagamentos.data || []).map(p => {
            const valor = Number(p.valor || 0);
            const estorno = valor < 0 || texto(p.tipo).toLowerCase() === 'estorno';
            return {
                id:`pag-${p.id}`, origem:'recebimento', tipo:estorno?'estorno':'entrada', data:p.data_pagamento,
                descricao:estorno?'Estorno de recebimento':`Recebimento · ${nomes.get(texto(p.paciente_id)) || 'Paciente'}`,
                detalhe:estorno?(p.motivo_estorno || 'Ajuste auditável'):(p.forma_pagamento || 'Forma não informada'),
                valor, pacienteId:p.paciente_id
            };
        });
        const saidas = (despesas.data || []).map(d => ({
            id:`desp-${d.id}`, origem:'despesa', tipo:'saida', data:d.data_despesa,
            descricao:d.descricao || d.subcategoria || 'Despesa',
            detalhe:[d.categoria,d.forma_pagamento].filter(Boolean).join(' · '), valor:-Math.abs(Number(d.valor || 0))
        }));
        estado.itens = entradas.concat(saidas).sort((a,b) => texto(b.data).localeCompare(texto(a.data)) || texto(b.id).localeCompare(texto(a.id)));
    }

    function itensFiltrados() {
        const busca = normalizar(estado.busca);
        return estado.itens.filter(item => {
            if (estado.tipo !== 'todos' && item.tipo !== estado.tipo) return false;
            return !busca || normalizar(`${item.descricao} ${item.detalhe} ${item.data}`).includes(busca);
        });
    }

    function atualizarResumo() {
        const busca=normalizar(estado.busca);
        const base=!busca?estado.itens:estado.itens.filter(item=>normalizar(`${item.descricao} ${item.detalhe} ${item.data}`).includes(busca));
        const entradas = base.filter(i => i.tipo === 'entrada').reduce((s,i)=>s+i.valor,0);
        const estornos = Math.abs(base.filter(i => i.tipo === 'estorno').reduce((s,i)=>s+i.valor,0));
        const saidas = Math.abs(base.filter(i => i.tipo === 'saida').reduce((s,i)=>s+i.valor,0));
        const recebido = entradas - estornos;
        const resultado = recebido - saidas;
        porId('fin_lan_entradas').textContent = moeda(recebido);
        porId('fin_lan_saidas').textContent = moeda(saidas);
        porId('fin_lan_resultado').textContent = moeda(resultado);
        porId('fin_lan_resultado_card').classList.toggle('negativo', resultado < 0);
    }

    function renderizar() {
        atualizarResumo();
        const itens = itensFiltrados();
        const lista = porId('fin_lan_lista');
        porId('fin_lan_contagem').textContent = `${itens.length} lançamento${itens.length === 1 ? '' : 's'}`;
        if (!itens.length) {
            lista.innerHTML = '<div class="finance-ledger-empty"><strong>Nenhum lançamento encontrado.</strong><span>Ajuste os filtros ou registre uma nova entrada ou saída.</span></div>';
            return;
        }
        lista.innerHTML = itens.map(item => {
            const sinal = item.valor >= 0 ? '+' : '−';
            const data = new Date(`${item.data}T12:00:00`).toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit'});
            return `<article class="finance-ledger-row ${item.tipo}">
                <time>${escapeHTML(data)}</time>
                <div class="finance-ledger-copy"><strong>${escapeHTML(item.descricao)}</strong><span>${escapeHTML(item.detalhe || 'Sem detalhe')}</span></div>
                <span class="finance-ledger-kind">${item.tipo==='entrada'?'Recebido':item.tipo==='saida'?'Pago':'Estornado'}</span>
                <strong class="finance-ledger-value">${sinal} ${escapeHTML(moeda(Math.abs(item.valor)))}</strong>
            </article>`;
        }).join('');
    }

    function renderizarSugestoesPacientes(){
        const campo=porId('fin_lan_busca'),lista=porId('fin_lan_paciente_sugestoes');if(!campo||!lista)return;
        const termo=campo.value.trim();
        const pacientes=typeof global.KineSysFinanceiro?.buscarPacientes==='function'?global.KineSysFinanceiro.buscarPacientes(termo,6):[];
        if(!termo||!pacientes.length){lista.hidden=true;lista.innerHTML='';return;}
        lista.innerHTML='<div class="finance-ledger-suggestion-title">Pacientes cadastrados</div>'+pacientes.map(p=>`<button type="button" data-fin-ledger-paciente="${escapeHTML(p.value)}"><strong>${escapeHTML(p.nome||p.label)}</strong><span>${escapeHTML([p.cpf,p.telefone||p.celular,p.numero||p.codigo||p.prontuario].filter(Boolean).join(' · ')||'Abrir conta do paciente')}</span></button>`).join('');
        lista.hidden=false;
    }

    async function abrirPaciente(id){
        sairDaVisaoLancamentos();
        const lista=porId('fin_lan_paciente_sugestoes');if(lista){lista.hidden=true;lista.innerHTML='';}
        if(typeof global.alternarAbaFinanceiro==='function')global.alternarAbaFinanceiro('paciente');
        if(typeof global.KineSysFinanceiro?.abrirPaciente==='function')await global.KineSysFinanceiro.abrirPaciente(id);
    }

    async function carregar(forcar) {
        if (estado.carregando) return;
        const mes = porId('fin_lan_mes')?.value || hojeMes();
        if (!forcar && estado.mes === mes && estado.itens.length) { renderizar(); return; }
        estado.mes = mes;
        estado.carregando = true;
        const feedback = porId('fin_lan_feedback');
        feedback.className = 'finance-feedback info'; feedback.textContent = 'Carregando lançamentos…';
        try { await carregarDados(); feedback.textContent=''; feedback.className='finance-feedback'; renderizar(); }
        catch (erro) { console.error('Livro-caixa:',erro); feedback.className='finance-feedback erro'; feedback.textContent='Não foi possível carregar os lançamentos. Nenhum dado foi alterado.'; }
        finally { estado.carregando = false; }
    }

    function imporVisaoLancamentos() {
        idsPaineis.forEach(id => { const el=porId(id); if(el && el.hidden !== (id !== 'financeiro_painel_lancamentos')) el.hidden = id !== 'financeiro_painel_lancamentos'; });
        idsAbas.forEach(id => { const el=porId(id); if(el){ const ativo=id==='financeiro_tab_lancamentos'; if(el.classList.contains('active')!==ativo)el.classList.toggle('active',ativo); if(el.getAttribute('aria-selected')!==String(ativo))el.setAttribute('aria-selected',String(ativo)); }});
    }

    function sairDaVisaoLancamentos(){
        estado.ativa=false;
        const painel=porId('financeiro_painel_lancamentos');if(painel)painel.hidden=true;
        const tab=porId('financeiro_tab_lancamentos');if(tab){tab.classList.remove('active');tab.setAttribute('aria-selected','false');}
    }

    function abrir() {
        if (!podeVer()) { if (typeof global.alternarAbaFinanceiro === 'function') global.alternarAbaFinanceiro('paciente'); return; }
        estado.ativa = true;
        imporVisaoLancamentos();
        try { sessionStorage.setItem('kinesys_financeiro_aba','lancamentos'); } catch (_) {}
        const mes = porId('fin_lan_mes'); if (mes && !mes.value) mes.value=hojeMes();
        carregar(false);
    }

    function filtrar(tipo) {
        estado.tipo = tipo || 'entrada';
        document.querySelectorAll('[data-fin-lan-tipo]').forEach(b => b.classList.toggle('active',b.dataset.finLanTipo===estado.tipo));
        estado.busca = porId('fin_lan_busca')?.value || '';
        renderizar();
    }

    function mesAnterior(delta) {
        const campo=porId('fin_lan_mes'); const [ano,mes]=(campo.value||hojeMes()).split('-').map(Number);
        const d=new Date(ano,mes-1+delta,1); campo.value=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`; carregar(true);
    }

    function novaEntrada() {
        sairDaVisaoLancamentos();
        if (typeof global.alternarAbaFinanceiro === 'function') global.alternarAbaFinanceiro('paciente');
        setTimeout(()=>porId('financeiro_paciente_busca')?.focus(),80);
    }

    function novaSaida() { if (typeof global.abrirModalDespesaFinanceira === 'function') global.abrirModalDespesaFinanceira(); }

    function iniciar() {
        const tab=porId('financeiro_tab_lancamentos'); if(!tab)return;
        tab.hidden=!podeVer();
        document.querySelectorAll('.finance-workspace-tab:not(#financeiro_tab_lancamentos)').forEach(botao=>botao.addEventListener('click',sairDaVisaoLancamentos));
        const busca=porId('fin_lan_busca'); if(busca) busca.addEventListener('input',()=>{estado.busca=busca.value;renderizar();renderizarSugestoesPacientes();});
        const sugestoes=porId('fin_lan_paciente_sugestoes');if(sugestoes)sugestoes.addEventListener('click',e=>{const botao=e.target.closest('[data-fin-ledger-paciente]');if(botao)abrirPaciente(botao.dataset.finLedgerPaciente);});
        const menu=porId('menu_financeiro');
        if(menu) menu.addEventListener('click',()=>setTimeout(()=>{tab.hidden=!podeVer();if(podeVer())abrir();},120));
        const tela=porId('tela_financeiro');
        if(tela) new MutationObserver(()=>{if(estado.ativa)imporVisaoLancamentos();}).observe(tela,{subtree:true,attributes:true,attributeFilter:['hidden','class','aria-selected']});
    }

    global.KineSysFinanceiroLancamentos = { abrir, carregar, filtrar, mesAnterior, novaEntrada, novaSaida, estado };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',iniciar); else iniciar();
})(window);
