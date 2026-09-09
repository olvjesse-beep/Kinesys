/* KineSys 1.21.0 — financeiro canônico por agendamento. Carregado após Agenda e Financeiro. */
(function(){
    'use strict';
    let contextoPagamentoAgendamento = null;
    let historicoAtendimentosSeq = 0;
    const fmt = v => typeof moedaBR === 'function' ? moedaBR(Number(v)||0) : (Number(v)||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
    const esc = v => typeof escapeHTML === 'function' ? escapeHTML(String(v??'')) : String(v??'');
    const num = v => typeof numeroFinanceiro === 'function' ? numeroFinanceiro(v) : Number(String(v||0).replace('.','').replace(',','.'));

    function instalarCamposPagamentoAgendamento(){
        const modal=document.getElementById('modal_fin_pagamento'); if(!modal||document.getElementById('fin_pag_agendamento_id'))return;
        const titulo=modal.querySelector('h2');
        titulo?.insertAdjacentHTML('afterend',`<input type="hidden" id="fin_pag_agendamento_id"><input type="hidden" id="fin_pag_cobranca_id"><div id="fin_pag_contexto_agendamento" class="fin-ag-context" hidden></div>`);
        const plano=document.getElementById('fin_pag_plano')?.closest('.input-group'); if(plano)plano.id='fin_pag_plano_grupo';
        const credito=document.getElementById('fin_pag_credito_box');
        credito?.insertAdjacentHTML('beforebegin',`<div id="fin_pag_valores_agendamento" class="fin-ag-values" hidden>
          <div><span>Valor original</span><strong id="fin_pag_original">R$ 0,00</strong></div>
          <label>Desconto por cortesia (R$)<input id="fin_pag_desconto" inputmode="decimal" value="0" oninput="atualizarResumoPagamentoAgendamento()"></label>
          <div><span>Valor devido</span><strong id="fin_pag_devido">R$ 0,00</strong></div><div><span>Já pago</span><strong id="fin_pag_pago">R$ 0,00</strong></div><div><span>Pendente</span><strong id="fin_pag_pendente">R$ 0,00</strong></div>
        </div>`);
        const forma=document.getElementById('fin_pag_forma');
        if(forma&&!forma.querySelector('input[value="Link de pagamento"]')) forma.insertAdjacentHTML('beforeend','<label><input type="checkbox" value="Link de pagamento"><span>Link de pagamento</span></label>');
        forma?.querySelectorAll('input[value="Transferência"],input[value="Outro"]').forEach(i=>{const label=i.closest('label');if(label)label.hidden=true;});
        forma?.closest('.input-group')?.insertAdjacentHTML('afterend','<div class="input-group" id="fin_pag_parcelas_grupo" hidden><label>Quantidade de parcelas</label><input id="fin_pag_parcelas" type="number" min="1" max="60" value="1"></div>');
        forma?.addEventListener('change',ev=>{
            if(contextoPagamentoAgendamento&&ev.target?.matches('input[type="checkbox"]')&&ev.target.checked)forma.querySelectorAll('input[type="checkbox"]').forEach(i=>{if(i!==ev.target)i.checked=false;});
            const credito=!!forma.querySelector('input[value="Cartão de crédito"]:checked');
            const box=document.getElementById('fin_pag_parcelas_grupo'); if(box)box.hidden=!credito;
            if(!credito)document.getElementById('fin_pag_parcelas').value='1';
        });
    }

    async function mapaFinanceiroAgendamentos(lista=[]){
        const mapa=new Map(), ids=[...new Set((lista||[]).map(a=>String(a?.id||'')).filter(Boolean))];
        lista.forEach(a=>mapa.set(String(a.id),{verificado:false,pago:false,parcial:false,cobravel:true,statusFinanceiro:'indisponivel',motivo:'indisponivel'}));
        if(!_supabase||!ids.length)return mapa;
        const {data,error}=await _supabase.rpc('kinesys_situacao_financeira_agendamentos',{p_ids:ids});
        if(error){console.warn('Financeiro por agendamento indisponível:',error);return mapa;}
        (data||[]).forEach(r=>mapa.set(String(r.agendamento_id),{
            verificado:true,pago:r.status_financeiro==='pago',parcial:r.status_financeiro==='parcial',semCobranca:Number(r.valor_devido)<=0,cobravel:Number(r.valor_devido)>0,
            statusFinanceiro:r.status_financeiro,motivo:r.status_financeiro,agendamentoId:r.agendamento_id,cobrancaId:r.cobranca_id,
            valorOriginal:Number(r.valor_original)||0,desconto:Number(r.desconto_valor)||0,valorDevido:Number(r.valor_devido)||0,pagos:Number(r.total_pago)||0,valorPendente:Number(r.valor_pendente)||0,origem:r.origem
        }));
        return mapa;
    }

    obterMapaPagamentoAgendamentos = mapaFinanceiroAgendamentos;
    obterSituacaoPagamentoAgendamento = async a => (await mapaFinanceiroAgendamentos([a])).get(String(a.id));
    iconePagamentoAgendaHTML = function(a){
        if(typeof usuarioEhAdministradorAgenda==='function'&&!usuarioEhAdministradorAgenda())return '';
        const s=typeof situacaoPagamentoAgenda==='function'?situacaoPagamentoAgenda(a):null;
        if(!s?.verificado)return '<span class="agenda-fin-icone desconhecido" title="Situação financeira indisponível">$</span>';
        const cls=s.pago?'pago':(s.parcial?'parcial':'pendente');
        const titulo=s.pago?'Pagamento quitado':s.parcial?`Pagamento parcial · pendente ${fmt(s.valorPendente)}`:`Pagamento pendente · ${fmt(s.valorPendente)}`;
        return `<span class="agenda-fin-icone ${cls}" title="${esc(titulo)}" aria-label="${esc(titulo)}">$</span>`;
    };

    window.atualizarResumoPagamentoAgendamento=function(){
        const c=contextoPagamentoAgendamento;if(!c)return;
        let desconto=num(document.getElementById('fin_pag_desconto')?.value||0); desconto=Math.max(0,Math.min(c.valorOriginal,desconto));
        const devido=Math.max(0,c.valorOriginal-desconto),pendente=Math.max(0,devido-c.pagos);
        document.getElementById('fin_pag_original').textContent=fmt(c.valorOriginal);
        document.getElementById('fin_pag_devido').textContent=fmt(devido);
        document.getElementById('fin_pag_pago').textContent=fmt(c.pagos);
        document.getElementById('fin_pag_pendente').textContent=fmt(pendente);
        const valor=document.getElementById('fin_pag_valor'); if(valor&&!valor.dataset.tocado)valor.value=pendente.toFixed(2).replace('.',',');
    };

    window.abrirPagamentoAgendamentoIntegrado=async function(id){
        if(typeof financeiroPodeEditar==='function'&&!financeiroPodeEditar()){alert('Seu perfil não possui permissão para registrar pagamentos.');return;}
        if(!_supabase){alert('Conecte-se à internet para lançar o pagamento com segurança.');return;}
        const a=(agendaAgendamentosSemanaCache||[]).concat(agendaAgendamentosDoDiaCache||[]).find(x=>String(x.id)===String(id));
        if(!a){alert('Agendamento não encontrado. Atualize a agenda.');return;}
        const prep=await _supabase.rpc('kinesys_preparar_cobranca_agendamento',{p_agendamento_id:id});
        if(prep.error){alert('Não foi possível preparar a cobrança: '+(prep.error.message||prep.error));return;}
        const sit=await obterSituacaoPagamentoAgendamento(a); if(!sit?.verificado){alert('Não foi possível confirmar a situação financeira.');return;}
        contextoPagamentoAgendamento={...sit,agendamento:a,planoId:prep.data?.plano_id||a.plano_id||'',cobrancaId:prep.data?.id||sit.cobrancaId,valorOriginal:Number(prep.data?.valor_original??sit.valorOriginal),desconto:Number(prep.data?.desconto_valor??sit.desconto),pagos:Number(sit.pagos)||0};
        fecharModal('modal_detalhe_agendamento');
        if(typeof navegarPara==='function')navegarPara('tela_financeiro');
        if(typeof alternarAbaFinanceiro==='function')alternarAbaFinanceiro('paciente');
        const paciente=document.getElementById('financeiro_paciente_select'); if(paciente){paciente.value=a.paciente_id;await carregarFinanceiroPaciente();}
        instalarCamposPagamentoAgendamento();
        document.getElementById('fin_pag_agendamento_id').value=id; document.getElementById('fin_pag_cobranca_id').value=contextoPagamentoAgendamento.cobrancaId||'';
        const grupo=document.getElementById('fin_pag_plano_grupo');if(grupo)grupo.hidden=true;
        const valores=document.getElementById('fin_pag_valores_agendamento');if(valores)valores.hidden=false;
        const ctx=document.getElementById('fin_pag_contexto_agendamento');ctx.hidden=false;ctx.innerHTML=`<strong>${esc(a.pacientes?.nome||prep.data?.paciente_nome||'Paciente')}</strong><span>${esc(a.procedimentos?.nome||prep.data?.procedimento_nome||'Atendimento')} · ${esc(a.equipe?.nome||prep.data?.profissional_nome||'Profissional')}</span><span>${esc(typeof formatarDataAgendaBR==='function'?formatarDataAgendaBR(a.data):a.data)} · ${esc(typeof horaCurta==='function'?horaCurta(a.hora_inicio):a.hora_inicio)}</span>`;
        const sel=document.getElementById('fin_pag_plano');sel.innerHTML=`<option value="${esc(contextoPagamentoAgendamento.planoId)}" selected>Cobrança deste agendamento</option>`;
        document.getElementById('fin_pag_operacao').value=typeof gerarOperacaoFinanceiraId==='function'?gerarOperacaoFinanceiraId('pag-agenda'):`pag-agenda-${Date.now()}`;
        document.getElementById('fin_pag_data').value=new Date().toISOString().slice(0,10);document.getElementById('fin_pag_observacoes').value='';
        document.getElementById('fin_pag_desconto').value=contextoPagamentoAgendamento.desconto.toFixed(2).replace('.',',');document.getElementById('fin_pag_desconto').disabled=contextoPagamentoAgendamento.pagos>0;
        const valor=document.getElementById('fin_pag_valor');valor.value='';delete valor.dataset.tocado;valor.oninput=()=>{valor.dataset.tocado='1';};
        if(typeof definirFormasPagamentoSelecionadas==='function')definirFormasPagamentoSelecionadas('fin_pag_forma',['PIX']);
        atualizarResumoPagamentoAgendamento();abrirModal('modal_fin_pagamento');
    };

    const salvarLegado=salvarPagamentoFinanceiro;
    salvarPagamentoFinanceiro=async function(){
        const agendamentoId=document.getElementById('fin_pag_agendamento_id')?.value||'';
        if(!agendamentoId)return salvarLegado();
        if(!contextoPagamentoAgendamento||!_supabase)return false;
        const valor=num(document.getElementById('fin_pag_valor')?.value),desconto=num(document.getElementById('fin_pag_desconto')?.value||0);
        const marcadas=[...document.querySelectorAll('#fin_pag_forma input:checked')]; if(marcadas.length!==1){alert('Selecione uma forma de pagamento para este lançamento.');return false;}
        const forma=marcadas[0].value,parcelas=forma==='Cartão de crédito'?Number(document.getElementById('fin_pag_parcelas')?.value||1):1;
        if(!(valor>0)){alert('Informe o valor recebido agora.');return false;}
        const composicao=[{forma,valor}];
        const {data,error}=await _supabase.rpc('kinesys_registrar_pagamento_agendamento',{p_agendamento_id:agendamentoId,p_valor:valor,p_desconto:desconto,p_desconto_tipo:desconto>0?'cortesia':'nenhum',p_forma:forma,p_parcelas:parcelas,p_data:document.getElementById('fin_pag_data').value,p_observacoes:document.getElementById('fin_pag_observacoes').value,p_composicao:composicao,p_operacao_id:document.getElementById('fin_pag_operacao').value});
        if(error){alert('Não foi possível registrar: '+(error.message||error));return false;}
        fecharModal('modal_fin_pagamento');contextoPagamentoAgendamento=null;document.getElementById('fin_pag_agendamento_id').value='';
        await carregarFinanceiroPaciente();if(typeof renderizarPainelAgenda==='function')await renderizarPainelAgenda();
        if(typeof mensagemFinanceiro==='function')mensagemFinanceiro(data?.valor_pendente>0?`Pagamento registrado. Ainda pendente: ${fmt(data.valor_pendente)}.`:'Pagamento registrado. Atendimento quitado.','sucesso');return true;
    };

    const abrirDetalheBase=abrirDetalheAgendamento;
    abrirDetalheAgendamento=async function(id){
        await abrirDetalheBase(id);
        if(typeof usuarioEhAdministradorAgenda==='function'&&!usuarioEhAdministradorAgenda())return;
        const a=(agendaAgendamentosSemanaCache||[]).concat(agendaAgendamentosDoDiaCache||[]).find(x=>String(x.id)===String(id));if(!a)return;
        const s=await obterSituacaoPagamentoAgendamento(a); const corpo=document.getElementById('detalhe_agendamento_corpo');if(!corpo||!s)return;
        corpo.querySelector('.agenda-pagamento-detalhe')?.remove();
        const status=s.pago?'Pago':s.parcial?'Parcial':'Pendente';
        const html=`<section class="agenda-fin-resumo ${esc(s.statusFinanceiro)}"><div><strong>Financeiro · ${status}</strong><span>Original ${fmt(s.valorOriginal)} · desconto ${fmt(s.desconto)} · devido ${fmt(s.valorDevido)}</span><span>Pago ${fmt(s.pagos)} · pendente <b>${fmt(s.valorPendente)}</b></span></div>${a.status!=='cancelado'&&s.valorPendente>0?`<button type="button" class="btn-primary" onclick="abrirPagamentoAgendamentoIntegrado('${esc(a.id)}')">LANÇAR PAGAMENTO</button>`:''}</section>`;
        const alvo=corpo.querySelector('.agenda-status-editor');if(alvo)alvo.insertAdjacentHTML('beforebegin',html);else corpo.insertAdjacentHTML('beforeend',html);
    };

    async function renderizarHistoricoAtendimentos(){
        const seq=++historicoAtendimentosSeq;
        const pacienteId=typeof financeiroPacienteAtualId!=='undefined'?financeiroPacienteAtualId:'';const lista=document.getElementById('financeiro_planos_lista');if(!pacienteId||!lista||!_supabase)return;
        lista.querySelector('#fin_historico_agendamentos')?.remove();
        const [cr,pag]=await Promise.all([_supabase.from('cobrancas_agendamento').select('*').eq('paciente_id',pacienteId).order('data_agendamento',{ascending:false}),_supabase.from('pagamentos').select('id,agendamento_id,valor,forma_pagamento,parcelas,data_pagamento,tipo').eq('paciente_id',pacienteId).not('agendamento_id','is',null).order('data_pagamento',{ascending:false})]);
        if(seq!==historicoAtendimentosSeq||cr.error||pag.error)return;lista.querySelector('#fin_historico_agendamentos')?.remove();const pagamentos=pag.data||[];
        const cards=(cr.data||[]).map(c=>{const ps=pagamentos.filter(p=>String(p.agendamento_id)===String(c.agendamento_id)),pago=ps.reduce((s,p)=>s+Number(p.valor||0),0),pend=Math.max(0,Number(c.valor_devido)-pago),status=pend<=0?'PAGO':pago>0?'PARCIAL':'PENDENTE';return `<article class="fin-ag-history-card"><header><div><strong>${esc(c.procedimento_nome||'Atendimento')}</strong><span>${new Date(c.data_agendamento+'T00:00:00').toLocaleDateString('pt-BR')} · ${esc(c.profissional_nome||'')}</span></div><b class="${status.toLowerCase()}">${status}</b></header><p>Original ${fmt(c.valor_original)} · desconto ${fmt(c.desconto_valor)} · devido ${fmt(c.valor_devido)} · pago ${fmt(pago)} · pendente <strong>${fmt(pend)}</strong></p>${ps.length?`<ul>${ps.map(p=>`<li>${new Date(p.data_pagamento+'T00:00:00').toLocaleDateString('pt-BR')} · ${fmt(p.valor)} · ${esc(p.forma_pagamento)}${p.forma_pagamento==='Cartão de crédito'?` · ${p.parcelas||1}x`:''}${p.tipo==='estorno'?' · estorno':''}</li>`).join('')}</ul>`:'<small>Nenhum pagamento lançado.</small>'}</article>`;}).join('');
        lista.insertAdjacentHTML('beforeend',`<section id="fin_historico_agendamentos" class="fin-ag-history"><h3>Histórico por atendimento</h3>${cards||'<div class="finance-empty">Nenhum atendimento com cobrança individual.</div>'}</section>`);
    }
    const renderPacienteBase=renderizarFinanceiroPaciente;
    renderizarFinanceiroPaciente=function(){const r=renderPacienteBase.apply(this,arguments);setTimeout(()=>renderizarHistoricoAtendimentos().catch(()=>{}),0);return r;};

    document.addEventListener('DOMContentLoaded',instalarCamposPagamentoAgendamento,{once:true});
    if(document.readyState!=='loading')instalarCamposPagamentoAgendamento();
})();
