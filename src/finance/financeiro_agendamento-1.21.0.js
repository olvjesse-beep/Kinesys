/* KineSys 1.21.0 — financeiro canônico por agendamento. Núcleo financeiro eager; hooks da Agenda instalados após o bundle da Agenda. */
(function(){
    'use strict';
    let contextoPagamentoAgendamento = null;
    let pagamentoAberturaRevisao = 0;
    let pagamentoSalvando = false;
    let contextoBaixaPendenciaAgendamento = null;
    let historicoAtendimentosSeq = 0;
    const fmt = v => typeof moedaBR === 'function' ? moedaBR(Number(v)||0) : (Number(v)||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
    const esc = v => typeof escapeHTML === 'function' ? escapeHTML(String(v??'')) : String(v??'');
    const num = v => typeof numeroFinanceiro === 'function' ? numeroFinanceiro(v) : Number(String(v||0).replace('.','').replace(',','.'));

    window.pagamentoFinanceiroEmCurso=()=>pagamentoSalvando;
    window.limparContextoPagamentoAgendamento=function(){
        pagamentoAberturaRevisao++;
        contextoPagamentoAgendamento=null;
        if(typeof financeiroContextoModalPagamento!=='undefined')financeiroContextoModalPagamento=null;
        ['fin_pag_agendamento_id','fin_pag_cobranca_id'].forEach(id=>{const e=document.getElementById(id);if(e)e.value='';});
        ['fin_pag_contexto_agendamento','fin_pag_valores_agendamento'].forEach(id=>{const e=document.getElementById(id);if(e)e.hidden=true;});
        const contexto=document.getElementById('fin_pag_contexto_agendamento');if(contexto)contexto.innerHTML='';
        ['fin_pag_original','fin_pag_devido','fin_pag_pago','fin_pag_pendente'].forEach(id=>{const e=document.getElementById(id);if(e)e.textContent=fmt(0);});
        const desconto=document.getElementById('fin_pag_desconto');if(desconto){desconto.value='0,00';desconto.disabled=false;}
        const valor=document.getElementById('fin_pag_valor');if(valor){valor.value='';delete valor.dataset.tocado;}
        const plano=document.getElementById('fin_pag_plano');if(plano){plano.disabled=false;plano.innerHTML='<option value="">-- Selecione --</option>';}
        const credito=document.getElementById('fin_pag_credito_box');if(credito)credito.hidden=true;
        const usar=document.getElementById('fin_pag_usar_credito');if(usar)usar.checked=false;
        const usado=document.getElementById('fin_pag_credito_valor');if(usado)usado.value='0';
        const parcelas=document.getElementById('fin_pag_parcelas');if(parcelas)parcelas.value='1';
        const grupo=document.getElementById('fin_pag_parcelas_grupo');if(grupo)grupo.hidden=true;
        const modal=document.getElementById('modal_fin_pagamento');if(modal)delete modal.dataset.retornoAgenda;
    };

    function instalarModalBaixaPendencia(){
        if(!document.body||document.getElementById('fin_ag_baixa_dialog'))return;
        document.body.insertAdjacentHTML('beforeend',`<dialog id="fin_ag_baixa_dialog" class="fin-ag-writeoff-dialog">
          <form id="fin_ag_baixa_form" class="fin-ag-writeoff-card">
            <div class="fin-ag-writeoff-head"><div><span>Ajuste financeiro</span><h2>Remover pendência</h2></div><button type="button" data-fin-ag-baixa-cancelar aria-label="Fechar">×</button></div>
            <p>Use esta ação quando a cobrança unitária não deve mais existir como valor a receber. Nenhum pagamento será criado.</p>
            <div class="input-group"><label for="fin_ag_baixa_tipo">Motivo da baixa</label><select id="fin_ag_baixa_tipo" required><option value="cortesia">Desconto / cortesia</option><option value="migracao_pacote">Paciente migrou para pacote</option><option value="lancamento_incorreto">Lançamento incorreto</option><option value="outro">Outro motivo</option></select></div>
            <div class="input-group"><label for="fin_ag_baixa_motivo">Justificativa</label><textarea id="fin_ag_baixa_motivo" rows="3" minlength="3" required placeholder="Ex.: paciente fechou pacote após o atendimento"></textarea></div>
            <div id="fin_ag_baixa_feedback" class="finance-feedback" hidden></div>
            <div class="fin-ag-writeoff-actions"><button type="button" class="btn-secondary" data-fin-ag-baixa-cancelar>Cancelar</button><button type="submit" class="btn-secondary fin-ag-writeoff-confirm">Remover pendência</button></div>
          </form>
        </dialog>`);
        const dialog=document.getElementById('fin_ag_baixa_dialog');
        dialog.querySelectorAll('[data-fin-ag-baixa-cancelar]').forEach(b=>b.addEventListener('click',()=>{contextoBaixaPendenciaAgendamento=null;dialog.close();}));
        dialog.addEventListener('cancel',()=>{contextoBaixaPendenciaAgendamento=null;});
        dialog.querySelector('#fin_ag_baixa_form')?.addEventListener('submit',confirmarBaixaPendenciaAgendamento);
    }

    window.abrirBaixaPendenciaAgendamentoFinanceiro=function(id){
        if(typeof financeiroPodeEditar==='function'&&!financeiroPodeEditar()){alert('Seu perfil não possui permissão para ajustar cobranças.');return;}
        if(!_supabase){alert('Conecte-se à internet para remover a pendência com segurança.');return;}
        instalarModalBaixaPendencia();
        contextoBaixaPendenciaAgendamento={agendamentoId:String(id||'')};
        const dialog=document.getElementById('fin_ag_baixa_dialog');
        document.getElementById('fin_ag_baixa_tipo').value='cortesia';
        document.getElementById('fin_ag_baixa_motivo').value='';
        const feedback=document.getElementById('fin_ag_baixa_feedback');feedback.hidden=true;feedback.textContent='';feedback.className='finance-feedback';
        dialog.showModal();
        setTimeout(()=>document.getElementById('fin_ag_baixa_tipo')?.focus(),0);
    };

    async function confirmarBaixaPendenciaAgendamento(event){
        event.preventDefault();
        const id=contextoBaixaPendenciaAgendamento?.agendamentoId;if(!id||!_supabase)return false;
        const tipo=document.getElementById('fin_ag_baixa_tipo')?.value||'';
        const motivo=document.getElementById('fin_ag_baixa_motivo')?.value.trim()||'';
        const feedback=document.getElementById('fin_ag_baixa_feedback');
        if(motivo.length<3){feedback.hidden=false;feedback.className='finance-feedback erro';feedback.textContent='Informe uma justificativa para a baixa.';return false;}
        const botao=document.querySelector('#fin_ag_baixa_form button[type="submit"]');if(botao){botao.disabled=true;botao.textContent='Removendo…';}
        const {error}=await _supabase.rpc('kinesys_baixar_cobranca_agendamento',{p_agendamento_id:id,p_tipo:tipo,p_motivo:motivo});
        if(botao){botao.disabled=false;botao.textContent='Remover pendência';}
        if(error){feedback.hidden=false;feedback.className='finance-feedback erro';feedback.textContent=error.message||'Não foi possível remover a pendência.';return false;}
        document.getElementById('fin_ag_baixa_dialog')?.close();contextoBaixaPendenciaAgendamento=null;
        if(typeof carregarFinanceiroPaciente==='function')await carregarFinanceiroPaciente();
        if(typeof renderizarPainelAgenda==='function')await renderizarPainelAgenda();
        if(typeof mensagemFinanceiro==='function')mensagemFinanceiro('Pendência removida. A baixa e sua justificativa foram preservadas no histórico de auditoria.','sucesso');
        return true;
    }

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
            if(contextoPagamentoAgendamento?.modo==='agendamento'&&ev.target?.matches('input[type="checkbox"]')&&ev.target.checked)forma.querySelectorAll('input[type="checkbox"]').forEach(i=>{if(i!==ev.target)i.checked=false;});
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
    function iconePagamentoAgendaIntegradoHTML(a){
        if(typeof usuarioEhAdministradorAgenda==='function'&&!usuarioEhAdministradorAgenda())return '';
        const s=typeof situacaoPagamentoAgenda==='function'?situacaoPagamentoAgenda(a):null;
        if(!s?.verificado)return '<span class="agenda-fin-icone desconhecido" title="Situação financeira indisponível">$</span>';
        const cls=s.pago?'pago':(s.parcial?'parcial':'pendente');
        const titulo=s.pago?'Pagamento quitado':s.parcial?`Pagamento parcial · pendente ${fmt(s.valorPendente)}`:`Pagamento pendente · ${fmt(s.valorPendente)}`;
        return `<span class="agenda-fin-icone ${cls}" title="${esc(titulo)}" aria-label="${esc(titulo)}">$</span>`;
    }

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
        const veioDaAgenda=document.getElementById('tela_agenda')?.classList.contains('ativa')===true;
        if(typeof financeiroPodeEditar==='function'&&!financeiroPodeEditar()){alert('Seu perfil não possui permissão para registrar pagamentos.');return;}
        if(!_supabase){alert('Conecte-se à internet para lançar o pagamento com segurança.');return;}
        if(pagamentoSalvando){alert('Aguarde a conclusão do pagamento em andamento.');return false;}
        fecharModal('modal_fin_pagamento');
        limparContextoPagamentoAgendamento();
        let revisao=pagamentoAberturaRevisao;
        const clinica=String(usuarioLogado?.clinica_id||''),perfil=String(usuarioLogado?.id||'');
        const atual=()=>revisao===pagamentoAberturaRevisao&&clinica===String(usuarioLogado?.clinica_id||'')&&perfil===String(usuarioLogado?.id||'');
        try {
            if(!clinica)throw Error('Sessão da clínica indisponível. Entre novamente.');
            const r=await _supabase.from('agendamentos').select('id,clinica_id,paciente_id,profissional_id,procedimento_id,plano_id,status,data,hora_inicio,pacientes(nome),procedimentos(nome),equipe(nome)').eq('id',id).eq('clinica_id',clinica).maybeSingle();
            if(!atual())return false;
            if(r.error)throw r.error;
            const a=r.data;
            if(!a||String(a.id)!==String(id)||String(a.clinica_id)!==clinica||a.status==='cancelado')throw Error('Agendamento indisponível. Atualize a Agenda.');
            let contrato=null;
            if(a.plano_id){
                const p=await _supabase.from('planos_atendimento').select('*').eq('id',a.plano_id).eq('paciente_id',a.paciente_id).eq('clinica_id',clinica).single();
                if(!atual())return false;
                if(p.error)throw p.error;
                contrato=p.data;
                if(!contrato||String(contrato.paciente_id)!==String(a.paciente_id)||String(contrato.clinica_id)!==clinica)throw Error('Contrato incompatível com o paciente.');
                if(Number(contrato.sessoes_contratadas)>1&&String(contrato.procedimento_id)!==String(a.procedimento_id))throw Error('O procedimento não corresponde ao pacote deste agendamento.');
            }
            const pacote=Number(contrato?.sessoes_contratadas)>1;
            let cobranca=null;
            if(!pacote){
                const prep=await _supabase.rpc('kinesys_preparar_cobranca_agendamento',{p_agendamento_id:id});
                if(!atual())return false;
                if(prep.error)throw prep.error;
                cobranca=prep.data;
                if(!cobranca||cobranca.baixada_em||String(cobranca.agendamento_id)!==String(a.id)||String(cobranca.paciente_id)!==String(a.paciente_id)||String(cobranca.clinica_id)!==clinica||String(cobranca.procedimento_id)!==String(a.procedimento_id))throw Error('Cobrança divergente do agendamento. Atualize a Agenda antes de registrar.');
            }
            const sit=await obterSituacaoPagamentoAgendamento(a);
            if(!atual())return false;
            if(!sit?.verificado||String(sit.agendamentoId)!==String(a.id))throw Error('Não foi possível confirmar a situação financeira deste agendamento.');
            fecharModal('modal_detalhe_agendamento');
            if(!document.getElementById('tela_financeiro')?.classList.contains('ativa')&&typeof navegarPara==='function')await navegarPara('tela_financeiro');
            await window.financeiroInicializacaoPendente;
            if(!atual())return false;
            if(typeof alternarAbaFinanceiro==='function')alternarAbaFinanceiro('paciente');
            await popularPacientesFinanceiro(a.paciente_id);
            if(!atual())return false;
            if(String(document.getElementById('financeiro_paciente_select')?.value)!==String(a.paciente_id))throw Error('Seleção de paciente alterada durante a abertura. Tente novamente.');
            const confirmado=await carregarFinanceiroPaciente();
            if(!atual())return false;
            if(confirmado!==true)throw Error('Aguarde a confirmação dos dados financeiros e abra novamente o pagamento.');
            const planoId=String(cobranca?.plano_id||a.plano_id||'');
            const plano=financeiroPlanosCache.find(p=>String(p.id)===planoId&&String(p.paciente_id)===String(a.paciente_id));
            if(!plano)throw Error('Contrato deste paciente não confirmado.');
            instalarCamposPagamentoAgendamento();
            // A abertura comum também limpa tudo. Só depois montamos um contexto
            // completo, exclusivo desta ocorrência, sem aproveitar HTML anterior.
            if(abrirModalPagamento(planoId)!==true)return false;
            revisao=pagamentoAberturaRevisao;
            const resumo=pacote?financeiroResumoPagamentoPlano(plano,financeiroPagamentosCache):null;
            contextoPagamentoAgendamento=Object.freeze({...sit,modo:pacote?'plano':'agendamento',agendamento:Object.freeze({...a}),pacienteId:String(a.paciente_id),clinicaId:clinica,perfilId:perfil,planoId,cobrancaId:pacote?'':String(cobranca.id),valorOriginal:Number(pacote?plano.valor_tabela:cobranca.valor_original),desconto:Number(pacote?plano.desconto_valor:cobranca.desconto_valor),pagos:pacote?Number(resumo.recebido||0)+Number(resumo.creditoAplicado||0):Number(sit.pagos||0),operacaoId:document.getElementById('fin_pag_operacao').value});
            const c=contextoPagamentoAgendamento;
            document.getElementById('fin_pag_agendamento_id').value=pacote?'':String(a.id);
            document.getElementById('fin_pag_cobranca_id').value=c.cobrancaId;
            document.getElementById('fin_pag_plano').disabled=true;
            const grupo=document.getElementById('fin_pag_plano_grupo');if(grupo)grupo.hidden=!pacote;
            const valores=document.getElementById('fin_pag_valores_agendamento');if(valores)valores.hidden=false;
            const ctx=document.getElementById('fin_pag_contexto_agendamento');ctx.hidden=false;ctx.innerHTML=`<strong>${esc(a.pacientes?.nome||cobranca?.paciente_nome||'Paciente')}</strong><span>${esc(a.procedimentos?.nome||cobranca?.procedimento_nome||'Atendimento')} · ${esc(a.equipe?.nome||cobranca?.profissional_nome||'Profissional')}</span><span>${esc(typeof formatarDataAgendaBR==='function'?formatarDataAgendaBR(a.data):a.data)} · ${esc(typeof horaCurta==='function'?horaCurta(a.hora_inicio):a.hora_inicio)}</span>`;
            document.getElementById('fin_pag_desconto').value=c.desconto.toFixed(2).replace('.',',');document.getElementById('fin_pag_desconto').disabled=pacote||c.pagos>0;
            const valor=document.getElementById('fin_pag_valor');valor.value='';delete valor.dataset.tocado;valor.oninput=()=>{valor.dataset.tocado='1';};
            if(!pacote){const credito=document.getElementById('fin_pag_credito_box');if(credito)credito.hidden=true;}
            atualizarResumoPagamentoAgendamento();
            const modal=document.getElementById('modal_fin_pagamento');if(modal)modal.dataset.retornoAgenda=veioDaAgenda?'1':'';
            return true;
        }catch(error){if(atual()){limparContextoPagamentoAgendamento();alert(error.message||'Não foi possível confirmar o contexto do pagamento.');}return false;}
    };

    const salvarLegado=salvarPagamentoFinanceiro;
    salvarPagamentoFinanceiro=async function(){
        if(pagamentoSalvando)return false;
        if(!validarContextoModalPagamento()){alert('Paciente ou cobrança mudou. Feche o formulário e abra novamente pelo agendamento correto.');return false;}
        const modal=document.getElementById('modal_fin_pagamento');
        const voltarAgenda=modal?.dataset.retornoAgenda==='1';
        const concluirRetorno=()=>{
            if(modal)delete modal.dataset.retornoAgenda;
            if(voltarAgenda&&typeof navegarPara==='function')navegarPara('tela_agenda');
        };
        const agendamentoId=document.getElementById('fin_pag_agendamento_id')?.value||'';
        const c=contextoPagamentoAgendamento;
        if(c&&(c.pacienteId!==String(document.getElementById('financeiro_paciente_select')?.value||'')||c.clinicaId!==String(usuarioLogado?.clinica_id||'')||c.perfilId!==String(usuarioLogado?.id||'')||c.planoId!==String(document.getElementById('fin_pag_plano')?.value||'')||c.operacaoId!==document.getElementById('fin_pag_operacao')?.value||String(agendamentoId)!==(c.modo==='plano'?'':String(c.agendamento.id))||String(document.getElementById('fin_pag_cobranca_id')?.value||'')!==c.cobrancaId)){
            alert('Os vínculos do pagamento foram alterados. Reabra pelo agendamento correto.');return false;
        }
        if(agendamentoId&&(!c||c.modo!=='agendamento')){alert('Contexto do agendamento não confirmado. Reabra o pagamento.');return false;}
        pagamentoSalvando=true;
        try{
        if(!agendamentoId){
            const salvo=await salvarLegado();
            if(salvo===true){concluirRetorno();if(voltarAgenda&&typeof renderizarPainelAgenda==='function')await renderizarPainelAgenda();}
            return salvo;
        }
        if(!_supabase)return false;
        const valor=num(document.getElementById('fin_pag_valor')?.value),desconto=num(document.getElementById('fin_pag_desconto')?.value||0);
        const marcadas=[...document.querySelectorAll('#fin_pag_forma input:checked')]; if(marcadas.length!==1){alert('Selecione uma forma de pagamento para este lançamento.');return false;}
        const forma=marcadas[0].value,parcelas=forma==='Cartão de crédito'?Number(document.getElementById('fin_pag_parcelas')?.value||1):1;
        if(!(valor>0)){alert('Informe o valor recebido agora.');return false;}
        const composicao=[{forma,valor}];
        const {data,error}=await _supabase.rpc('kinesys_registrar_pagamento_agendamento',{p_agendamento_id:c.agendamento.id,p_valor:valor,p_desconto:desconto,p_desconto_tipo:desconto>0?'cortesia':'nenhum',p_forma:forma,p_parcelas:parcelas,p_data:document.getElementById('fin_pag_data').value,p_observacoes:document.getElementById('fin_pag_observacoes').value,p_composicao:composicao,p_operacao_id:c.operacaoId});
        if(error){alert('Não foi possível registrar: '+(error.message||error));return false;}
        fecharModal('modal_fin_pagamento');contextoPagamentoAgendamento=null;document.getElementById('fin_pag_agendamento_id').value='';
        concluirRetorno();
        await carregarFinanceiroPaciente();if(typeof renderizarPainelAgenda==='function')await renderizarPainelAgenda();
        if(typeof mensagemFinanceiro==='function')mensagemFinanceiro(data?.valor_pendente>0?`Pagamento registrado. Ainda pendente: ${fmt(data.valor_pendente)}.`:'Pagamento registrado. Atendimento quitado.','sucesso');return true;
        }catch(error){alert('Não foi possível registrar: '+(error.message||error));return false;}
        finally{pagamentoSalvando=false;}
    };

    let hooksAgendaFinanceiroInstalados=false;
    function instalarHooksAgendaFinanceiro(){
        if(hooksAgendaFinanceiroInstalados)return true;
        if(typeof abrirDetalheAgendamento!=='function'||typeof situacaoPagamentoAgenda!=='function'||typeof iconePagamentoAgendaHTML!=='function')return false;
        iconePagamentoAgendaHTML=iconePagamentoAgendaIntegradoHTML;
        const abrirDetalheBase=abrirDetalheAgendamento;
        let revisaoDetalheFinanceiro=0;
        abrirDetalheAgendamento=async function(id){
            const revisao=++revisaoDetalheFinanceiro;
            await abrirDetalheBase(id);
            if(revisao!==revisaoDetalheFinanceiro||String(agendamentoDetalheAtualId)!==String(id))return;
            if(typeof usuarioEhAdministradorAgenda==='function'&&!usuarioEhAdministradorAgenda())return;
            const a=(agendaAgendamentosSemanaCache||[]).concat(agendaAgendamentosDoDiaCache||[]).find(x=>String(x.id)===String(id));if(!a)return;
            const s=await obterSituacaoPagamentoAgendamento(a); const corpo=document.getElementById('detalhe_agendamento_corpo');if(!corpo||!s||revisao!==revisaoDetalheFinanceiro||String(agendamentoDetalheAtualId)!==String(id))return;
            corpo.querySelectorAll('.agenda-fin-resumo').forEach(e=>e.remove());
            corpo.querySelector('.agenda-pagamento-detalhe')?.remove();
            const status=s.pago?'Pago':s.parcial?'Parcial':'Pendente';
            const html=`<section class="agenda-fin-resumo ${esc(s.statusFinanceiro)}"><div><strong>Financeiro · ${status}</strong><span>Original ${fmt(s.valorOriginal)} · desconto ${fmt(s.desconto)} · devido ${fmt(s.valorDevido)}</span><span>Pago ${fmt(s.pagos)} · pendente <b>${fmt(s.valorPendente)}</b></span></div>${a.status!=='cancelado'&&s.valorPendente>0?`<button type="button" class="btn-primary" onclick="abrirPagamentoAgendamentoIntegrado('${esc(a.id)}')">LANÇAR PAGAMENTO</button>`:''}</section>`;
            const alvo=corpo.querySelector('.agenda-status-editor');if(alvo)alvo.insertAdjacentHTML('beforebegin',html);else corpo.insertAdjacentHTML('beforeend',html);
        };
        hooksAgendaFinanceiroInstalados=true;
        return true;
    }
    document.addEventListener('kinesys:tela-modulos-prontos',event=>{
        if(event?.detail?.id==='tela_agenda')instalarHooksAgendaFinanceiro();
    });
    instalarHooksAgendaFinanceiro();


    async function renderizarHistoricoAtendimentos(){
        const seq=++historicoAtendimentosSeq;
        const pacienteId=typeof financeiroPacienteAtualId!=='undefined'?financeiroPacienteAtualId:'';const lista=document.getElementById('financeiro_planos_lista');if(!pacienteId||!lista||!_supabase)return;
        lista.querySelector('#fin_historico_agendamentos')?.remove();
        const [cr,pag]=await Promise.all([_supabase.from('cobrancas_agendamento').select('*').eq('paciente_id',pacienteId).order('data_agendamento',{ascending:false}),_supabase.from('pagamentos').select('id,agendamento_id,valor,forma_pagamento,parcelas,data_pagamento,tipo,estorno_de,cobranca_agendamento_id').eq('paciente_id',pacienteId).not('agendamento_id','is',null).order('data_pagamento',{ascending:false})]);
        if(seq!==historicoAtendimentosSeq||cr.error||pag.error)return;lista.querySelector('#fin_historico_agendamentos')?.remove();const pagamentos=pag.data||[];
        const cobrancas=cr.data||[],baixadas=cobrancas.filter(c=>!!c.baixada_em),ativas=cobrancas.filter(c=>!c.baixada_em&&c.origem!=='plano');
        const cards=ativas.map(c=>{
            const ps=pagamentos.filter(p=>String(p.agendamento_id)===String(c.agendamento_id)),pago=ps.reduce((s,p)=>s+Number(p.valor||0),0),pend=Math.max(0,Number(c.valor_devido)-pago),status=pend<=0?'PAGO':pago>0?'PARCIAL':'PENDENTE';
            const podeBaixar=pend>0&&pago===0&&!ps.some(p=>p.tipo!=='estorno'&&!ps.some(e=>e.estorno_de===p.id&&Number(e.valor)===-Number(p.valor)))&&c.origem!=='plano';
            const acoes=pend>0?`<div class="fin-ag-history-actions"><button type="button" class="btn-primary" onclick="abrirPagamentoAgendamentoIntegrado('${esc(c.agendamento_id)}')">Quitar</button>${podeBaixar?`<button type="button" class="btn-secondary fin-ag-remove-pending" onclick="abrirBaixaPendenciaAgendamentoFinanceiro('${esc(c.agendamento_id)}')">Remover pendência</button>`:''}</div>`:'';
            return `<article class="fin-ag-history-card"><header><div><strong>${esc(c.procedimento_nome||'Atendimento')}</strong><span>${new Date(c.data_agendamento+'T00:00:00').toLocaleDateString('pt-BR')} · ${esc(c.profissional_nome||'')}</span></div><b class="${status.toLowerCase()}">${status}</b></header><p>Original ${fmt(c.valor_original)} · desconto ${fmt(c.desconto_valor)} · devido ${fmt(c.valor_devido)} · pago ${fmt(pago)} · pendente <strong>${fmt(pend)}</strong></p>${ps.length?`<ul>${ps.map(p=>`<li>${new Date(p.data_pagamento+'T00:00:00').toLocaleDateString('pt-BR')} · ${fmt(p.valor)} · ${esc(p.forma_pagamento)}${p.forma_pagamento==='Cartão de crédito'?` · ${p.parcelas||1}x`:''}${p.tipo==='estorno'?' · estorno':''}</li>`).join('')}</ul>`:'<small>Nenhum pagamento lançado.</small>'}${acoes}</article>`;
        }).join('');
        const auditoria=baixadas.length?`<small class="fin-ag-history-audit-note">${baixadas.length} cobrança(s) removida(s) da pendência permanecem preservadas na auditoria financeira.</small>`:'';
        lista.insertAdjacentHTML('beforeend',`<section id="fin_historico_agendamentos" class="fin-ag-history"><h3>Histórico por atendimento</h3>${cards||'<div class="finance-empty">Nenhum atendimento com cobrança individual pendente.</div>'}${auditoria}</section>`);
    }
    const renderPacienteBase=renderizarFinanceiroPaciente;
    renderizarFinanceiroPaciente=function(){const r=renderPacienteBase.apply(this,arguments);setTimeout(()=>renderizarHistoricoAtendimentos().catch(()=>{}),0);return r;};

    document.addEventListener('DOMContentLoaded',()=>{instalarCamposPagamentoAgendamento();instalarModalBaixaPendencia();},{once:true});
    if(document.readyState!=='loading'){instalarCamposPagamentoAgendamento();instalarModalBaixaPendencia();}
})();

