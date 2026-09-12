/* KineSys Financeiro 1.20.1
 * Camada de apresentação e segurança operacional.
 * Mantém compatibilidade com os módulos legados enquanto centraliza a API nova.
 */
(function iniciarModuloFinanceiro(global){
    'use strict';
    const VERSAO='1.20.1';
    const estado={pacientes:[],renderBase:null,vazioBase:null,popularBase:null,inicializado:false};
    const porId=id=>document.getElementById(id);
    const texto=v=>String(v??'');
    const normalizar=v=>texto(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();

    function pagamentoEhEstorno(p={}) { return p.tipo==='estorno'||!!p.estorno_de||Number(p.valor||0)<0; }
    function pagamentoFoiEstornado(p={},todos=[]) { return !!p.estornado_em||todos.some(x=>texto(x.estorno_de)===texto(p.id)); }
    function pagamentosLiquidos(lista=[]) { return lista.reduce((s,p)=>s+Number(p.valor||0),0); }

    function resumoSeguro(planos=[],pagamentos=[],metricasFn=null){
        const cobrancas=planos.filter(p=>p.status!=='cancelado');
        const metricas=cobrancas.map(p=>({p,m:typeof metricasFn==='function'?metricasFn(p):{}}));
        return {
            sessoesUsadas:metricas.reduce((s,x)=>s+Number(x.m.consumidas||0),0),
            sessoesContratadas:metricas.reduce((s,x)=>s+Number(x.m.contratadas||0),0),
            sessoesDisponiveis:metricas.filter(x=>x.p.status==='ativo').reduce((s,x)=>s+Number(x.m.restantes||0),0),
            recebidoLiquido:pagamentosLiquidos(pagamentos),
            saldo:metricas.reduce((s,x)=>s+Math.max(0,Number(x.m.saldo||0)),0)
        };
    }

    function atualizarContextoPaciente(){
        const sel=porId('financeiro_paciente_select');
        const titulo=porId('financeiro_paciente_contexto_nome');
        const acoes=document.querySelectorAll('[data-fin-requer-paciente]');
        const escolhido=sel?.selectedOptions?.[0];
        const tem=!!sel?.value;
        if(titulo) titulo.textContent=tem?escolhido?.textContent||'Paciente selecionado':'Busque um paciente para começar';
        const fechar=porId('financeiro_fechar_paciente');if(fechar)fechar.hidden=!tem;
        acoes.forEach(b=>{b.disabled=!tem;b.setAttribute('aria-disabled',String(!tem));});
        atualizarAcoesContextuais();
    }

    function atualizarAcoesContextuais(){
        const contaVisivel=!porId('financeiro_painel_paciente')?.hidden;
        const pacienteSelecionado=!!porId('financeiro_paciente_select')?.value;
        document.querySelectorAll('[data-fin-patient-action]').forEach(botao=>botao.hidden=!(contaVisivel&&pacienteSelecionado));
    }

    function chavePaciente(x={}){return normalizar([x.label,x.nome,x.cpf,x.telefone,x.celular,x.numero,x.codigo,x.prontuario,x.value].filter(Boolean).join(' '));}

    function buscarPacientes(termo='',limite=8){
        const busca=normalizar(termo);
        if(!busca)return [];
        return estado.pacientes.filter(x=>chavePaciente(x).includes(busca)).slice(0,limite);
    }

    function renderizarSugestoesPaciente(){
        const campo=porId('financeiro_paciente_busca'),lista=porId('financeiro_paciente_sugestoes');
        if(!campo||!lista)return;
        const itens=buscarPacientes(campo.value);
        if(!normalizar(campo.value)){lista.hidden=true;lista.innerHTML='';return;}
        lista.innerHTML=itens.length?itens.map(x=>`<button type="button" data-fin-paciente-id="${escapeHTML(x.value)}"><strong>${escapeHTML(x.nome||x.label)}</strong><span>${escapeHTML([x.cpf,x.telefone||x.celular,x.numero||x.codigo||x.prontuario].filter(Boolean).join(' · ')||'Cadastro de paciente')}</span></button>`).join(''):'<div class="finance-patient-no-result">Nenhum paciente cadastrado encontrado.</div>';
        lista.hidden=false;
    }

    async function abrirPaciente(id){
        const sel=porId('financeiro_paciente_select');if(!sel)return false;
        const paciente=estado.pacientes.find(x=>texto(x.value)===texto(id));if(!paciente)return false;
        sel.value=paciente.value;
        const busca=porId('financeiro_paciente_busca');if(busca)busca.value='';
        const sugestoes=porId('financeiro_paciente_sugestoes');if(sugestoes){sugestoes.hidden=true;sugestoes.innerHTML='';}
        atualizarContextoPaciente();
        if(typeof global.carregarFinanceiroPaciente==='function')await global.carregarFinanceiroPaciente();
        return true;
    }

    async function fecharPaciente(){
        const sel=porId('financeiro_paciente_select');if(sel)sel.value='';
        const busca=porId('financeiro_paciente_busca');if(busca)busca.value='';
        const sugestoes=porId('financeiro_paciente_sugestoes');if(sugestoes){sugestoes.hidden=true;sugestoes.innerHTML='';}
        if(typeof global.carregarFinanceiroPaciente==='function')await global.carregarFinanceiroPaciente();
        atualizarContextoPaciente();
        busca?.focus();
    }

    function abrirIndicadores(){
        if(typeof global.alternarAbaFinanceiro!=='function')return;
        global.alternarAbaFinanceiro('analise');
        const relatorios=porId('financeiro_tab_balanco');
        const indicadores=porId('financeiro_tab_analise');
        if(indicadores){indicadores.classList.remove('active');indicadores.setAttribute('aria-selected','false');}
        if(relatorios){relatorios.classList.add('active');relatorios.setAttribute('aria-selected','true');}
    }

    function filtrarPacientes(){
        const busca=normalizar(porId('financeiro_paciente_busca')?.value);
        const sel=porId('financeiro_paciente_select');
        if(!sel)return;
        const atual=sel.value;
        const lista=estado.pacientes.filter(x=>!busca||chavePaciente(x).includes(busca));
        sel.innerHTML='<option value="">-- Selecione um paciente --</option>'+lista.map(x=>`<option value="${escapeHTML(x.value)}">${escapeHTML(x.label)}</option>`).join('');
        if(lista.some(x=>x.value===atual))sel.value=atual;
        atualizarContextoPaciente();
        renderizarSugestoesPaciente();
    }

    async function capturarPacientes(){
        const sel=porId('financeiro_paciente_select');
        if(!sel)return;
        const opcoes=Array.from(sel.options).filter(o=>o.value).map(o=>({value:o.value,label:o.textContent||''}));
        let registros=[];
        try{if(typeof global.obterPacientesSalvos==='function')registros=await global.obterPacientesSalvos()||[];}catch(_){}
        const porIdPaciente=new Map(registros.map(p=>[texto(p.id),p]));
        estado.pacientes=opcoes.map(o=>{const p=porIdPaciente.get(texto(o.value))||{};return {...p,value:o.value,label:o.label,nome:p.nome||o.label.split(' · ')[0]};});
        atualizarContextoPaciente();
    }

    function prepararDetalhesPlanos(){
        document.querySelectorAll('#financeiro_planos_lista .finance-plan-card').forEach(card=>{
            if(card.querySelector('.finance-plan-details'))return;
            const blocos=['.finance-session-line','.finance-progress','.finance-money-line','.finance-note'].map(s=>card.querySelector(s)).filter(Boolean);
            if(!blocos.length)return;
            const detalhes=document.createElement('details');detalhes.className='finance-plan-details';
            const resumo=document.createElement('summary');resumo.textContent='Ver detalhes do plano';detalhes.appendChild(resumo);
            blocos.forEach(x=>detalhes.appendChild(x));
            const acoes=card.querySelector('.finance-plan-actions');card.insertBefore(detalhes,acoes||null);
        });
    }

    function obterEstadoLegado(){return typeof global.kinesysObterEstadoFinanceiro==='function'?global.kinesysObterEstadoFinanceiro():{planos:[],pagamentos:[],metricas:null,supabase:null};}

    function atualizarResumoSeguro(){
        const legado=obterEstadoLegado();
        const r=resumoSeguro(legado.planos,legado.pagamentos,legado.metricas);
        const set=(id,v)=>{const el=porId(id);if(el)el.textContent=v;};
        set('fin_stat_sessoes',`${r.sessoesUsadas}/${r.sessoesContratadas}`);
        set('fin_stat_restantes',String(r.sessoesDisponiveis));
        set('fin_stat_pago',typeof global.moedaBR==='function'?global.moedaBR(r.recebidoLiquido):String(r.recebidoLiquido));
        set('fin_stat_saldo',typeof global.moedaBR==='function'?global.moedaBR(r.saldo):String(r.saldo));
    }

    function prepararPagamentos(){
        const todos=obterEstadoLegado().pagamentos;
        const linhas=Array.from(document.querySelectorAll('#financeiro_pagamentos_lista .finance-payment-row'));
        linhas.forEach((linha,i)=>{
            const p=todos[i];if(!p)return;
            if(pagamentoEhEstorno(p)){linha.classList.add('estorno');linha.querySelector('strong')?.insertAdjacentHTML('afterend','<span class="finance-audit-badge">Estorno</span>');}
            const botao=linha.querySelector('.finance-payment-delete');
            if(!botao)return;
            if(pagamentoEhEstorno(p)||pagamentoFoiEstornado(p,todos)){
                botao.remove();
                linha.classList.add('estornado');
                if(!pagamentoEhEstorno(p))linha.querySelector('.finance-payment-meta')?.insertAdjacentHTML('beforeend','<span class="finance-audit-badge">Estornado</span>');
            }else{
                botao.textContent='Estornar';botao.classList.add('finance-payment-reverse');
                botao.setAttribute('onclick',`KineSysFinanceiro.estornarPagamento('${texto(p.id).replaceAll("'",'')}')`);
            }
        });
    }

    function aposRender(){atualizarContextoPaciente();atualizarResumoSeguro();prepararDetalhesPlanos();prepararPagamentos();atualizarDivisaoPagamento();}

    function obterComposicaoFormasPagamento(containerId,valorTotal){
        const container=porId(containerId);if(!container)return [];
        const marcados=Array.from(container.querySelectorAll('label')).filter(l=>l.querySelector('input[type="checkbox"]:checked'));
        if(marcados.length===1)return [{forma:marcados[0].querySelector('input[type="checkbox"]').value,valor:Number(valorTotal||0)}];
        return marcados.map(l=>({forma:l.querySelector('input[type="checkbox"]').value,valor:numeroFinanceiro(l.querySelector('.finance-split-value')?.value||0)}));
    }

    function validarComposicaoFormasPagamento(containerId,valorTotal){
        const itens=obterComposicaoFormasPagamento(containerId,valorTotal);
        if(itens.length<2)return {ok:itens.length===1,itens};
        const soma=itens.reduce((s,x)=>s+Number(x.valor||0),0);
        return {ok:itens.every(x=>x.valor>0)&&Math.abs(soma-Number(valorTotal||0))<0.01,itens,soma};
    }

    function atualizarDivisaoPagamento(){
        const container=porId('fin_pag_forma');if(!container)return;
        const marcados=container.querySelectorAll('input[type="checkbox"]:checked').length;
        container.querySelectorAll('label').forEach(label=>{
            let campo=label.querySelector('.finance-split-value');
            if(!campo){campo=document.createElement('input');campo.className='finance-split-value';campo.inputMode='decimal';campo.placeholder='R$ 0,00';campo.setAttribute('aria-label','Valor nesta forma');label.appendChild(campo);}
            campo.hidden=marcados<2||!label.querySelector('input[type="checkbox"]:checked');
        });
        const dica=porId('fin_pag_forma_divisao');if(dica)dica.hidden=marcados<2;
    }

    async function estornarPagamento(id){
        const legado=obterEstadoLegado();
        const p=legado.pagamentos.find(x=>texto(x.id)===texto(id));
        if(!p||pagamentoEhEstorno(p)||pagamentoFoiEstornado(p,legado.pagamentos))return;
        if(p.__pending_sync){alert('Este recebimento ainda aguarda sincronização. Conecte o sistema antes de estorná-lo.');return;}
        if(typeof global.calcularComponentesCreditoPaciente==='function'){
            const simulados=legado.pagamentos.filter(x=>texto(x.id)!==texto(id));
            const comp=global.calcularComponentesCreditoPaciente(simulados,legado.planos,global.financeiroCreditosUsosCache||[]);
            if(Number(comp?.liquido||0)<-0.009){alert(`Este recebimento gerou crédito que já foi utilizado. Estorne primeiro ${global.moedaBR(Math.abs(comp.liquido))} no histórico de crédito.`);return;}
        }
        if(!legado.supabase){alert('Sem conexão: o recebimento não pode ser estornado com segurança.');return;}
        const motivo=prompt(`Motivo do estorno de ${global.moedaBR?global.moedaBR(p.valor):p.valor}:`,'');
        if(motivo===null)return;
        if(motivo.trim().length<3){alert('Informe um motivo para preservar o histórico financeiro.');return;}
        const {data,error}=await legado.supabase.rpc('kinesys_estornar_pagamento',{p_pagamento_id:id,p_motivo:motivo.trim()});
        if(error){console.error('Financeiro: estorno recusado.',error);alert(error.message||'Não foi possível estornar o recebimento.');return;}
        if(typeof global.mensagemFinanceiro==='function')global.mensagemFinanceiro('Recebimento estornado. O lançamento original foi preservado no histórico.','sucesso');
        if(typeof global.carregarFinanceiroPaciente==='function')await global.carregarFinanceiroPaciente();
        return data;
    }

    function inicializar(){
        if(estado.inicializado)return;estado.inicializado=true;
        estado.renderBase=global.renderizarFinanceiroPaciente;
        estado.vazioBase=global.renderizarFinanceiroVazio;
        estado.popularBase=global.popularPacientesFinanceiro;
        if(typeof estado.renderBase==='function')global.renderizarFinanceiroPaciente=function(...a){const r=estado.renderBase.apply(this,a);aposRender();return r;};
        if(typeof estado.vazioBase==='function')global.renderizarFinanceiroVazio=function(...a){const r=estado.vazioBase.apply(this,a);atualizarContextoPaciente();return r;};
        if(typeof estado.popularBase==='function')global.popularPacientesFinanceiro=async function(...a){const r=await estado.popularBase.apply(this,a);await capturarPacientes();return r;};
        global.excluirPagamentoFinanceiro=estornarPagamento;
        const busca=porId('financeiro_paciente_busca');if(busca)busca.addEventListener('input',filtrarPacientes);
        const sugestoes=porId('financeiro_paciente_sugestoes');if(sugestoes)sugestoes.addEventListener('click',e=>{const botao=e.target.closest('[data-fin-paciente-id]');if(botao)abrirPaciente(botao.dataset.finPacienteId);});
        const sel=porId('financeiro_paciente_select');if(sel)sel.addEventListener('change',()=>{
            const atual=sel.value,b=porId('financeiro_paciente_busca');if(b)b.value='';
            sel.innerHTML='<option value="">-- Selecione um paciente --</option>'+estado.pacientes.map(x=>`<option value="${escapeHTML(x.value)}">${escapeHTML(x.label)}</option>`).join('');
            sel.value=atual;atualizarContextoPaciente();
        });
        const formas=porId('fin_pag_forma');if(formas)formas.addEventListener('change',atualizarDivisaoPagamento);
        const painelPaciente=porId('financeiro_painel_paciente');if(painelPaciente)new MutationObserver(atualizarAcoesContextuais).observe(painelPaciente,{attributes:true,attributeFilter:['hidden']});
        capturarPacientes();aposRender();
    }

    global.KineSysFinanceiro=Object.freeze({versao:VERSAO,inicializar,resumoSeguro,estornarPagamento,obterComposicaoFormasPagamento,validarComposicaoFormasPagamento,atualizarDivisaoPagamento,aposRender,buscarPacientes,abrirPaciente,fecharPaciente,abrirIndicadores});
    global.obterComposicaoFormasPagamento=obterComposicaoFormasPagamento;
    global.validarComposicaoFormasPagamento=validarComposicaoFormasPagamento;
    if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',inicializar,{once:true});else inicializar();
})(window);
