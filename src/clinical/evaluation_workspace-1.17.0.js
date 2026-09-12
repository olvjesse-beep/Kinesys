/* KineSys 1.17 — espaço de avaliação, sem inferência diagnóstica adicional. */
(function(){
    'use strict';
    let painel=null,retorno=null,regiaoAtiva='',laudo=null;
    const clone=value=>JSON.parse(JSON.stringify(value));
    const normalizar=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();

    window.fecharPainelAvaliacaoKineSys=function(){
        if(!painel)return;
        painel.close();
    };
    window.abrirPainelAvaliacaoKineSys=function(titulo,conteudo,trigger){
        window.fecharPainelAvaliacaoKineSys();
        retorno=trigger||document.activeElement;
        const dialog=document.createElement('dialog');dialog.className='ks-evaluation-dialog';
        dialog.dataset.tipo=conteudo.id==='ks_safety_panel'?'seguranca':'regioes';
        const head=document.createElement('header'),h=document.createElement('h2'),close=document.createElement('button');
        h.id='ks-evaluation-dialog-title';h.textContent=titulo;dialog.setAttribute('aria-labelledby',h.id);
        close.type='button';close.className='btn-secondary';close.textContent='Fechar';close.addEventListener('click',()=>dialog.close());
        head.append(h,close);const body=document.createElement('div');body.className='ks-evaluation-dialog-body';body.appendChild(conteudo);dialog.append(head,body);
        const foco=retorno;
        dialog.addEventListener('close',()=>{dialog.remove();if(painel===dialog)painel=null;if(!document.querySelector('.ks-evaluation-dialog[open]'))document.body.classList.remove('ks-evaluation-panel-open');if(foco?.isConnected)foco.focus({preventScroll:true});});
        dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();}});
        document.body.appendChild(dialog);painel=dialog;dialog.showModal();document.body.classList.add('ks-evaluation-panel-open');
    };
    window.atualizarPainelSegurancaKineSys=function(content){
        if(painel?.open&&painel.dataset.tipo==='seguranca'){
            const body=painel.querySelector('.ks-evaluation-dialog-body'),top=body.scrollTop;
            content.hidden=false;body.replaceChildren(content);body.scrollTop=top;
            painel.querySelector('button')?.focus({preventScroll:true});
        }
    };
    window.abrirRegioesAvaliacaoKineSys=function(trigger){
        const content=document.createElement('div'),search=document.createElement('input'),list=document.createElement('div');
        search.type='search';search.placeholder='Buscar região';search.setAttribute('aria-label','Buscar região');list.className='ks-region-picker-list';
        document.querySelectorAll('#grupo_regioes_mapeamento input').forEach(original=>{
            const label=document.createElement('label'),input=document.createElement('input'),name=document.createElement('span');
            input.type='checkbox';input.checked=original.checked;name.textContent=BANCO_MAPEAMENTO_CLINICO[original.dataset.regiao].nome;
            input.addEventListener('change',()=>{original.checked=input.checked;original.dataset.tocadoManualmente='true';if(input.checked)regiaoAtiva=original.dataset.regiao;renderizarMapeamentoRegioes();agendarAutosaveKineSys();});
            label.append(input,name);list.appendChild(label);
        });
        search.addEventListener('input',()=>{Array.from(list.children).forEach(row=>row.hidden=!normalizar(row.textContent).includes(normalizar(search.value)));});
        content.append(search,list);window.abrirPainelAvaliacaoKineSys('Regiões do exame',content,trigger);
    };
    window.atualizarRegioesCompactasKineSys=function(ids){
        if(!ids.includes(regiaoAtiva))regiaoAtiva=ids[0]||'';
        const holder=document.getElementById('ks-regions-selected');if(!holder)return regiaoAtiva;
        holder.replaceChildren();
        ids.forEach(id=>{const chip=document.createElement('div'),choose=document.createElement('button'),remove=document.createElement('button');chip.className='ks-region-chip'+(id===regiaoAtiva?' active':'');choose.type=remove.type='button';choose.textContent=BANCO_MAPEAMENTO_CLINICO[id].nome;choose.setAttribute('aria-pressed',String(id===regiaoAtiva));choose.addEventListener('click',()=>{regiaoAtiva=id;renderizarMapeamentoRegioes();});remove.textContent='×';remove.setAttribute('aria-label','Remover região '+choose.textContent);remove.addEventListener('click',()=>{const input=document.getElementById('chk_regiao_'+id);input.checked=false;input.dataset.tocadoManualmente='true';renderizarMapeamentoRegioes();agendarAutosaveKineSys();});chip.append(choose,remove);holder.appendChild(chip);});
        if(!ids.length){const text=document.createElement('span');text.textContent='Nenhuma região selecionada';holder.appendChild(text);}
        return regiaoAtiva;
    };

    function dadosAtuais(){
        const sintese=gerarSinteseMapeamento(),achados=window.coletarAchadosLaudoKineSys?.()||[],seguranca=window.validarSegurancaParaFinalizacao();
        const identificacao=[],historia=[];
        const ignorar=new Set(['input_cirurgia','input_medicamento','paciente_busca','busca_paciente_precadastro','select_paciente_precadastro','confirmacao_documental','paciente_tipo_dor','chk_corticoide']);
        const rotulos={eva_slider:'Dor atual (EVA 0–10)',origem_informacao_clinica:'Fonte das informações',avaliacao_realizado_em:'Data e hora do atendimento'};
        document.querySelectorAll('#subtela_triagem input,#subtela_triagem textarea,#subtela_triagem select').forEach(el=>{
            if(el.type==='hidden'||el.type==='password'||ignorar.has(el.id)||el.disabled)return;
            if((el.type==='checkbox'||el.type==='radio')&&!el.checked)return;
            if(el.tagName==='SELECT'&&!el.value)return;
            const label=rotulos[el.id]||el.labels?.[0]?.textContent?.trim()||el.closest('.input-group')?.querySelector('label')?.textContent?.trim()||el.id.replace(/_/g,' ');
            const value=el.type==='checkbox'||el.type==='radio'?'Marcado':el.tagName==='SELECT'?el.selectedOptions[0]?.textContent:el.value;
            if(!String(value||'').trim())return;
            const line=label.replace(/\s+/g,' ') + ': '+String(value).trim();
            (/^paciente_(nome|idade|cpf|telefone|sexo|nascimento)$/.test(el.id)?identificacao:historia).push(line);
        });
        ['tags_cirurgias','tags_medicamentos'].forEach(id=>{const text=document.getElementById(id)?.textContent.replace(/[✕×]/g,'').trim();if(text)historia.push((id==='tags_cirurgias'?'Cirurgias/procedimentos: ':'Medicamentos: ')+text);});
        const restricoes=coletarRestricoesPosOperatorias();
        if(restricoes.ativo)historia.push('Restrições pós-operatórias: '+Object.entries(restricoes).filter(([k,v])=>k!=='ativo'&&v).map(([k,v])=>k+': '+v).join('; '));
        const fonte=JSON.stringify({identificacao,historia,resumo:sintese.resumoPorRegiao.map(r=>({regiao:r.regiao,texto:r.textoDocumento,redFlags:r.redFlags,conduta:r.redflagConduta,justificativa:r.redflagJustificativa})),achados,seguranca:sintese.segurancaGlobal});
        return {identificacao,historia,sintese,achados,seguranca,fonte,compativeis:achados.filter(a=>a.completo&&a.status==='positivo')};
    }
    function textoBase(d){
        const automatico=d.seguranca.ok&&d.compativeis.length>0;
        const status={positivo:'positivo',negativo:'negativo',inconclusivo:'inconclusivo',nao_realizado:'não realizado',nao_aplicavel:'não aplicável',nao_avaliado:'não avaliado'};
        const lines=[automatico?'RASCUNHO DE LAUDO CLÍNICO-FUNCIONAL':'BASE PARA LAUDO ESCRITO PELO FISIOTERAPEUTA','Revisão profissional obrigatória. Este texto não confirma diagnóstico automaticamente.','', 'IDENTIFICAÇÃO',...d.identificacao,'','ANAMNESE E CONTEXTO',...d.historia,'','EXAME E ACHADOS'];
        d.achados.forEach(a=>{lines.push(a.regiao+' — '+a.nome);a.achados.forEach(t=>lines.push('• '+t.texto+': '+(status[t.resultado]||t.resultado)));});
        if(!d.achados.length)lines.push('Nenhum resultado de teste registrado.');
        lines.push('','DIREÇÃO DA AVALIAÇÃO',...d.sintese.resumoPorRegiao.map(r=>r.textoDocumento||r.hipotese),'','SEGURANÇA',d.seguranca.ok?'Revisão de segurança registrada.':d.seguranca.mensagem||'Revisão pendente.');
        (d.sintese.segurancaGlobal?.pistasGlobais||[]).forEach(a=>lines.push([a.titulo,a.desc,a.condutaTexto,a.justificativa].filter(Boolean).join(' — ')));
        d.sintese.resumoPorRegiao.forEach(r=>{if(r.redFlags?.length)lines.push(r.regiao+': '+r.redFlags.join('; '));if(r.redflagConduta||r.redflagJustificativa)lines.push([r.regiao,r.redflagConduta,r.redflagJustificativa].filter(Boolean).join(' — '));});
        lines.push('','CONCLUSÃO DO FISIOTERAPEUTA');
        if(automatico)lines.push('Achados completos compatíveis com os seguintes eixos de investigação: '+d.compativeis.map(a=>a.regiao+' — '+a.nome).join('; ')+'. A interpretação final depende da integração clínica e da revisão do profissional.');
        else lines.push('[Escreva a conclusão clínica. Os dados atuais não sustentam uma conclusão automática.]');
        return {texto:lines.join('\n'),modo:automatico?'assistido':'manual',fonte:d.fonte,revisado:false,atualizadoEm:new Date().toISOString()};
    }
    window.preencherLaudoAvaliacaoKineSys=function(value){laudo=value?clone(value):null;const editor=document.getElementById('ks-laudo-texto');if(editor)editor.value=laudo?.texto||'';};
    window.coletarLaudoAvaliacaoKineSys=function(){return laudo?clone(laudo):null;};
    window.renderizarLaudoAvaliacaoKineSys=function(){
        const editor=document.getElementById('ks-laudo-texto');if(!editor)return;
        const d=dadosAtuais();
        if(!laudo)laudo=textoBase(d);
        const mudou=laudo.fonte!==d.fonte;
        if(mudou)laudo.revisado=false;
        editor.value=laudo.texto;
        document.getElementById('ks-laudo-revisado').checked=!!laudo.revisado;
        document.getElementById('ks-laudo-status').textContent=mudou?'A avaliação mudou. Seu texto foi preservado: atualize a base ou revise as diferenças antes de finalizar.':laudo.modo==='assistido'?'Rascunho assistido com achados completos. Revise e complemente a conclusão.':'Investigação em aberto. Os dados foram reunidos abaixo para você escrever o laudo.';
        const alertas=document.getElementById('card_alertas_consolidados');if(alertas)alertas.hidden=d.seguranca.ok;
    };
    let workspaceInicializado=false;
    function inicializarWorkspaceAvaliacaoKineSys(){
        if(workspaceInicializado)return;
        const editor=document.getElementById('ks-laudo-texto'),review=document.getElementById('ks-laudo-revisado');
        if(!editor&&!review)return;
        workspaceInicializado=true;
        editor?.addEventListener('input',()=>{if(!laudo)return;laudo.texto=editor.value;laudo.revisado=false;laudo.atualizadoEm=new Date().toISOString();if(review)review.checked=false;agendarAutosaveKineSys();});
        review?.addEventListener('change',()=>{if(!laudo)return;laudo.revisado=review.checked;if(review.checked)laudo.fonte=dadosAtuais().fonte;laudo.revisadoEm=review.checked?new Date().toISOString():null;agendarAutosaveKineSys();});
        document.getElementById('ks-laudo-atualizar')?.addEventListener('click',async()=>{
            if(laudo&&!(await confirmarKineSys('Substituir o texto atual por uma nova base da avaliação? Copie o texto antes se quiser preservar sua redação.',{titulo:'Atualizar base do laudo',confirmar:'Atualizar base'})))return;
            laudo=textoBase(dadosAtuais());window.renderizarLaudoAvaliacaoKineSys();agendarAutosaveKineSys();
        });
        document.getElementById('ks-laudo-copiar')?.addEventListener('click',async()=>{try{await navigator.clipboard.writeText(editor.value);document.getElementById('ks-laudo-status').textContent='Texto copiado para a área de transferência.';}catch(_){editor.focus();editor.select();document.getElementById('ks-laudo-status').textContent='Texto selecionado. Use copiar no seu dispositivo.';}});
        if(typeof clinicaEstruturadaPreservada!=='undefined'&&Object.prototype.hasOwnProperty.call(clinicaEstruturadaPreservada||{},'laudo')){
            window.preencherLaudoAvaliacaoKineSys(clinicaEstruturadaPreservada.laudo||null);
        }
    }
    if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',inicializarWorkspaceAvaliacaoKineSys,{once:true});
    else inicializarWorkspaceAvaliacaoKineSys();
})();
