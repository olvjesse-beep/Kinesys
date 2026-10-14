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
            input.addEventListener('change',()=>{original.checked=input.checked;original.dataset.tocadoManualmente='true';if(input.checked)regiaoAtiva=original.dataset.regiao;renderizarMapeamentoRegioes();original.dispatchEvent(new Event('change',{bubbles:true}));agendarAutosaveKineSys();});
            label.append(input,name);list.appendChild(label);
        });
        search.addEventListener('input',()=>{Array.from(list.children).forEach(row=>row.hidden=!normalizar(row.textContent).includes(normalizar(search.value)));});
        content.append(search,list);window.abrirPainelAvaliacaoKineSys('Regiões do exame',content,trigger);
    };
    window.definirRegiaoAtivaAvaliacaoKineSys=function(id){if(id)regiaoAtiva=id;return regiaoAtiva;};
    window.atualizarRegioesCompactasKineSys=function(ids){
        if(!ids.includes(regiaoAtiva))regiaoAtiva=ids[0]||'';
        const holder=document.getElementById('ks-regions-selected');if(!holder)return regiaoAtiva;
        holder.replaceChildren();
        ids.forEach(id=>{const chip=document.createElement('div'),choose=document.createElement('button'),remove=document.createElement('button');chip.className='ks-region-chip'+(id===regiaoAtiva?' active':'');choose.type=remove.type='button';choose.textContent=BANCO_MAPEAMENTO_CLINICO[id].nome;choose.setAttribute('aria-pressed',String(id===regiaoAtiva));choose.addEventListener('click',()=>{regiaoAtiva=id;renderizarMapeamentoRegioes();});remove.textContent='×';remove.setAttribute('aria-label','Remover região '+choose.textContent);remove.addEventListener('click',()=>{const input=document.getElementById('chk_regiao_'+id);input.checked=false;input.dataset.tocadoManualmente='true';renderizarMapeamentoRegioes();input.dispatchEvent(new Event('change',{bubbles:true}));agendarAutosaveKineSys();});chip.append(choose,remove);holder.appendChild(chip);});
        if(!ids.length){const text=document.createElement('span');text.textContent='Nenhuma região selecionada';holder.appendChild(text);}
        return regiaoAtiva;
    };

    function itemClinicoDaHipotese(hipotese){
        if(hipotese?.item)return hipotese.item;
        const id=normalizar(hipotese?.id);if(!id||typeof BANCO_MAPEAMENTO_CLINICO==='undefined')return null;
        for(const regiao of Object.values(BANCO_MAPEAMENTO_CLINICO||{})){
            const item=[...(regiao?.clusters||[]),...(regiao?.diferenciais||[])].find(c=>normalizar(c?.id)===id);
            if(item)return item;
        }
        return null;
    }
    function criterioDaHipotese(hipotese){
        const item=itemClinicoDaHipotese(hipotese)||{},regra=typeof item.regraConfirmacao==='object'?item.regraConfirmacao:typeof hipotese?.regraConfirmacao==='object'?hipotese.regraConfirmacao:{};
        const minimo=Number(regra.minimo||item.limiar||hipotese?.limiar||0);
        return {tipo:regra.tipo||'',minimo:Number.isFinite(minimo)?minimo:0,obrigatorios:Array.isArray(regra.obrigatorios)?regra.obrigatorios.filter(Number.isInteger):[]};
    }

    function dadosAtuais(){
        const sintese=gerarSinteseMapeamento(),achados=window.coletarAchadosLaudoKineSys?.()||[],seguranca=window.validarSegurancaParaFinalizacao();
        const planoAtual=window.KineSysMotorClinico3?.ultimoPlano||window.gerarPlanoClinicoHMAKineSys?.()||null;
        const plano=planoAtual?{
            versao:planoAtual.versao||'',
            insuficiente:!!planoAtual.insuficiente,
            hipoteses:(planoAtual.hipoteses||[]).filter(Boolean).map(h=>({id:h.id||'',nome:h.nome||'',regiaoId:h.regiaoId||'',aConfirmar:(h.aConfirmar||[]).filter(Boolean),criterio:criterioDaHipotese(h)})),
            testesPrioritarios:(planoAtual.exame?.testesPrioritarios||[]).filter(Boolean).map(t=>({texto:t.texto||t.nome||'',tipo:t.tipo||'',hipoteseId:t.hipoteseId||t.condicaoId||''})).filter(t=>t.texto),
            lacunas:(planoAtual.lacunas||[]).filter(Boolean)
        }:null;
        const identificacao=[],historia=[],campos={};
        const gruposAnamnese={
            fatoresPiora:[],comorbidades:[],exposicoesOcupacionais:[],exposicoesEsportivas:[],fatoresPsicossociais:[]
        };
        const ignorar=new Set(['input_cirurgia','input_medicamento','paciente_busca','busca_paciente_precadastro','select_paciente_precadastro','confirmacao_documental','paciente_tipo_dor','paciente_origem_irradiacao','paciente_irradiacao','chk_corticoide','exames_imagem_fonte']);
        const rotulos={eva_slider:'Dor atual (EVA 0–10)',origem_informacao_clinica:'Fonte das informações',avaliacao_realizado_em:'Data e hora do atendimento'};
        const grupoCampo=el=>el.classList.contains('chk_fator_piora')?'fatoresPiora':el.classList.contains('chk_exposicao_ocupacional')?'exposicoesOcupacionais':el.classList.contains('chk_exposicao_esportiva')?'exposicoesEsportivas':el.classList.contains('chk_yellow_flag')?'fatoresPsicossociais':/^chk_(tabagista|etilista|hipertenso|diabetico|corticoide_sistemico|corticoide_infiltracao|aine_recente|cirurgia)$/.test(el.id)?'comorbidades':'';
        const rotuloCampo=el=>limparTextoClinico(el.labels?.[0]?.querySelector('span')?.textContent||el.labels?.[0]?.textContent||el.closest('.input-group')?.querySelector('label')?.textContent||el.id.replace(/_/g,' '));
        document.querySelectorAll('#subtela_triagem input,#subtela_triagem textarea,#subtela_triagem select').forEach(el=>{
            if(el.type==='hidden'||el.type==='password'||ignorar.has(el.id)||el.disabled)return;
            if((el.type==='checkbox'||el.type==='radio')&&!el.checked)return;
            if(el.tagName==='SELECT'&&!el.value)return;
            const label=rotulos[el.id]||rotuloCampo(el);
            const value=el.type==='checkbox'||el.type==='radio'?'Marcado':el.tagName==='SELECT'?el.selectedOptions[0]?.textContent:el.value;
            if(!String(value||'').trim())return;
            const grupo=grupoCampo(el);
            if(grupo){if(label&&!gruposAnamnese[grupo].includes(label))gruposAnamnese[grupo].push(label);return;}
            if(el.id)campos[el.id]=String(value).trim();
            if(el.id==='paciente_hma')return; // já vira o parágrafo da anamnese
            const line=label.replace(/\s+/g,' ') + ': '+String(value).trim();
            (/^paciente_(nome|idade|cpf|telefone|sexo|nascimento)$/.test(el.id)?identificacao:historia).push(line);
        });
        if(campos.exames_imagem_descricao)campos.exames_imagem_fonte=document.getElementById('exames_imagem_fonte')?.value||'relato_paciente';
        const complementos={cirurgias:'',medicamentos:''};
        ['tags_cirurgias','tags_medicamentos'].forEach(id=>{const text=document.getElementById(id)?.textContent.replace(/[✕×]/g,'').replace(/\s+/g,' ').trim();if(text){const chave=id==='tags_cirurgias'?'cirurgias':'medicamentos';complementos[chave]=text;historia.push((chave==='cirurgias'?'Cirurgias/procedimentos: ':'Medicamentos: ')+text);}});
        const restricoes=coletarRestricoesPosOperatorias();
        if(restricoes.ativo)historia.push('Restrições pós-operatórias: '+Object.entries(restricoes).filter(([k,v])=>k!=='ativo'&&v).map(([k,v])=>k+': '+v).join('; '));
        const fonte=JSON.stringify({identificacao,historia,campos,gruposAnamnese,complementos,restricoes,plano,resumo:sintese.resumoPorRegiao.map(r=>({regiao:r.regiao,texto:r.textoDocumento,hipotese:r.hipotese,nome:r.nomeHipotese,nivel:r.nivel,anamnese:r.hipotesesAnamnese||[],redFlags:r.redFlags,conduta:r.redflagConduta,justificativa:r.redflagJustificativa})),achados,seguranca:sintese.segurancaGlobal});
        return {identificacao,historia,campos,gruposAnamnese,complementos,restricoes,plano,sintese,achados,seguranca,fonte,compativeis:achados.filter(a=>a.completo&&a.status==='positivo')};
    }
    function limparTextoClinico(value){return String(value||'').replace(/\s+/g,' ').replace(/\s+([,.;:])/g,'$1').trim();}
    function fraseClinica(value){const texto=limparTextoClinico(value);if(!texto)return'';return texto.charAt(0).toUpperCase()+texto.slice(1).replace(/[.;:,\s]+$/,'')+'.';}
    function minusculaInicial(value){const texto=limparTextoClinico(value);return texto?texto.charAt(0).toLowerCase()+texto.slice(1):'';}
    function valorCampo(d,id){return limparTextoClinico(d.campos?.[id]||'');}
    function primeiroCampo(d,ids){for(const id of ids){const valor=valorCampo(d,id);if(valor)return valor;}return'';}
    function unirNatural(itens){const lista=itens.map(limparTextoClinico).filter(Boolean);if(!lista.length)return'';if(lista.length===1)return lista[0];return lista.slice(0,-1).join(', ')+' e '+lista.at(-1);}
    function nomeClinico(value){return limparTextoClinico(nomeLimpo(value)).replace(/\s+[—–-]\s+(?:cluster(?: de exame)?|padrão clínico|suspeita|investigação causal|hipótese(?: clínica| funcional)?|diferencial(?: neurovascular| neurológico| médico)?|rastreamento).*$/i,'').trim();}
    function nomeEmFrase(value){const nome=nomeClinico(value);if(!nome)return'';return /^[A-ZÁÉÍÓÚÂÊÔÃÕÇ0-9]{2,}(?:\s|$)/.test(nome)?nome:nome.charAt(0).toLowerCase()+nome.slice(1);}
    function fatorEmFrase(value){const fator=limparTextoClinico(value).toLowerCase();return ({'em pé':'permanecer em pé','sentado':'permanecer sentado','noturno':'o período noturno','movimento':'o movimento','repouso':'o repouso','carga':'a aplicação de carga'})[fator]||fator;}
    function fatorJaDescrito(hma,fator){
        const texto=normalizar(hma),chave=normalizar(fator);
        const aliases={'em pe':['em pe','ortostatismo'],'sentado':['sentad','sedestacao'],'noturno':['noturn','a noite'],'movimento':['moviment'],'repouso':['repous'],'carga':['carga','peso']};
        return (aliases[chave]||[chave]).some(termo=>termo&&texto.includes(termo));
    }
    const BANCO_SEMANTICO_LAUDO=Object.freeze({
        anamnese:Object.freeze([
            'Na anamnese',
            'Durante a entrevista clínica',
            'Na história clínica apresentada',
            'Em relação à queixa atual',
            'No levantamento inicial',
            'Durante a avaliação subjetiva'
        ]),
        exame:Object.freeze([
            'No exame físico-funcional',
            'Durante a avaliação físico-funcional',
            'Na investigação clínica objetiva',
            'Ao exame físico-funcional',
            'Na etapa de testes clínicos',
            'A avaliação objetiva demonstrou'
        ]),
        integracao:Object.freeze([
            'Considerados em conjunto',
            'A integração desses dados mostra que',
            'Na correlação entre história e exame',
            'A leitura clínico-funcional do conjunto indica que',
            'Diante da convergência observada',
            'Com base na relação entre queixa e achados objetivos'
        ]),
        contexto:Object.freeze([
            'No contexto clínico',
            'Entre os elementos que podem modular o quadro',
            'Como informações complementares relevantes',
            'Na interpretação do caso',
            'Na avaliação de fatores associados'
        ]),
        resultado:Object.freeze({
            positivo:Object.freeze(['foi positivo','mostrou resposta positiva','reproduziu o achado esperado','apresentou resposta compatível']),
            negativo:Object.freeze(['foi negativo','não reproduziu o achado esperado','não apresentou resposta positiva','não ofereceu suporte ao achado pesquisado']),
            inconclusivo:Object.freeze(['permaneceu inconclusivo','não permitiu interpretação conclusiva','apresentou resposta indeterminada','exigiu correlação adicional'])
        }),
        mecanismos:Object.freeze({
            trauma_agudo:'associado a trauma agudo',
            esforco_repetitivo:'relacionado a esforço repetitivo ou sobrecarga',
            insidioso:'de instalação insidiosa, sem trauma definido',
            pos_cirurgico:'iniciado no período pós-cirúrgico ou pós-imobilização'
        }),
        fatores:Object.freeze({
            movimento:'o movimento',repouso:'o repouso',carga:'a aplicação de carga',periodo_noturno:'o período noturno',
            posicao_sentada:'a permanência sentada',posicao_em_pe:'a permanência em pé',em_pe:'a permanência em pé',sentado:'a permanência sentada',noturno:'o período noturno'
        }),
        carga:Object.freeze({nao:'sem aumento recente relevante',leve:'com aumento leve recente',moderado:'com aumento moderado recente',acentuado:'com aumento acentuado recente'}),
        fonte:Object.freeze({relato_paciente:'relato do paciente',relato_documento:'relato associado a documento conferido',laudo:'documento ou laudo apresentado',achado_fisioterapeuta:'achados da avaliação fisioterapêutica'})
    });
    function escolhaSemantica(chave,grupo){const opcoes=BANCO_SEMANTICO_LAUDO[grupo]||[];return fraseVariada(chave,opcoes);}
    function polirRelatoClinico(value){
        let texto=limparTextoClinico(value)
            .replace(/\ba cerca de\s+(?=\d)/gi,'há cerca de ')
            .replace(/\bsepsemia\b/gi,'septicemia')
            .replace(/\bperca de força\b/gi,'perda de força')
            .replace(/\bhipsilateral\b/gi,'ipsilateral')
            .replace(/\bdor a palpação\b/gi,'dor à palpação')
            .replace(/\bdéficiencia\b/gi,'deficiência')
            .replace(/\bpaciente relata também\b/gi,'Também refere')
            .replace(/\bpaciente relata\b/gi,'Refere')
            .replace(/\ba mesma relata\b/gi,'Relata')
            .replace(/\bhoje apresenta\b/gi,'Atualmente apresenta')
            .replace(/\bassociad[oa] a (?:isto|isso) apresenta\b/gi,'O quadro associa-se a')
            .replace(/\bme parece\b/gi,'foi levantada a possibilidade de');
        texto=texto.replace(/(^|[.!?]\s+)([a-záéíóúâêôãõç])/g,(_,inicio,letra)=>inicio+letra.toUpperCase());
        return texto;
    }
    // O relatório usa apenas informações registradas; hipóteses não são diagnósticos confirmados.
    const RESULTADO_LAUDO={positivo:'positivo',negativo:'negativo',inconclusivo:'inconclusivo'};
    const nomeLimpo=n=>(window.nomeHipoteseLimpoKineSys||(x=>x))(n);
    function dataLaudo(d){
        const bruto=valorCampo(d,'avaliacao_realizado_em');if(!bruto)return'';
        const dt=new Date(bruto);return Number.isNaN(dt.getTime())?bruto:dt.toLocaleDateString('pt-BR');
    }
    function secaoIdentificacao(d){
        const nome=primeiroCampo(d,['paciente_nome']);
        const idade=primeiroCampo(d,['paciente_idade']);
        const sexo=primeiroCampo(d,['paciente_sexo']),nascimento=primeiroCampo(d,['paciente_nascimento']);
        const ocupacao=primeiroCampo(d,['paciente_ocupacao']),data=dataLaudo(d),descricao=[];
        if(idade)descricao.push(`${idade} anos`);if(sexo)descricao.push(sexo.toLowerCase());if(nascimento)descricao.push(`nascimento em ${nascimento}`);if(ocupacao)descricao.push(ocupacao.toLowerCase());
        const sujeito=nome||'A pessoa avaliada';
        const abertura=fraseClinica(`${sujeito}${descricao.length?`, ${descricao.join(', ')}`:''}, compareceu à avaliação fisioterapêutica${data?` realizada em ${data}`:''}`);
        return `RELATÓRIO FISIOTERAPÊUTICO\n\n${abertura}`;
    }
    function valoresUnicos(valores){
        const vistos=new Set();return valores.map(limparTextoClinico).filter(valor=>{const chave=normalizar(valor);if(!chave||vistos.has(chave))return false;vistos.add(chave);return true;});
    }
    function construirFatosClinicos(d){
        const hma=primeiroCampo(d,['paciente_hma','hma']);
        const grupos=d.gruposAnamnese||{},eva=primeiroCampo(d,['eva_slider']);
        const fatores=(grupos.fatoresPiora||[]).filter(fator=>!fatorJaDescrito(hma,fator));
        const evaNumero=String(eva).replace(/\D/g,'');
        const evaJaDescrita=evaNumero&&new RegExp(`(?:eva\\s*(?:de\\s*)?${evaNumero}(?:\\s*\\/\\s*10)?|${evaNumero}\\s*\\/\\s*10)`,'i').test(hma);
        const mecanismo=primeiroCampo(d,['paciente_mecanismo_lesao']);
        const ocupacao=primeiroCampo(d,['paciente_ocupacao']),exposicoes=grupos.exposicoesOcupacionais||[];
        const esporte=primeiroCampo(d,['paciente_esporte']),freq=primeiroCampo(d,['esporte_frequencia']),duracao=primeiroCampo(d,['esporte_duracao']),nivel=primeiroCampo(d,['esporte_nivel']),mudanca=primeiroCampo(d,['esporte_mudanca_carga']),cargas=grupos.exposicoesEsportivas||[];
        const imagem=String(d.campos?.exames_imagem_descricao||'').split(/\r?\n/).map(limparTextoClinico).filter(Boolean).join('; ');
        const psicossociais=grupos.fatoresPsicossociais||[],obs=primeiroCampo(d,['yellow_flags_observacao']);
        const fonte=primeiroCampo(d,['origem_informacao_clinica']);
        return {
            relato:{hma,eva:eva&&!evaJaDescrita?eva:'',fatores:valoresUnicos(fatores)},
            inicio:mecanismo,
            ocupacao:{nome:ocupacao,exposicoes:valoresUnicos(exposicoes)},
            atividade:{nome:esporte,frequencia:freq,duracao,nivel,mudanca,cargas:valoresUnicos(cargas)},
            antecedentes:{comorbidades:valoresUnicos((grupos.comorbidades||[]).filter(x=>!/^Cirurgia/i.test(x))),cirurgias:d.complementos.cirurgias,medicamentos:d.complementos.medicamentos},
            restricoes:d.restricoes||{ativo:false},imagem:{descricao:imagem,fonte:d.campos.exames_imagem_fonte||''},
            contexto:{psicossociais:valoresUnicos(psicossociais),observacao:obs,fonte}
        };
    }
    function secaoHistoria(d){
        const f=construirFatosClinicos(d),paragrafos=[];
        const queixa=[];if(f.relato.hma){const relato=polirRelatoClinico(f.relato.hma);queixa.push(fraseClinica(`${escolhaSemantica(relato,'anamnese')}, ${minusculaInicial(relato)}`));}
        if(f.relato.eva||f.relato.fatores.length){
            const intensidade=f.relato.eva?`A intensidade atual foi registrada em ${f.relato.eva}/10 na EVA`:'';
            const agravantes=f.relato.fatores.length?`${intensidade?'com piora':'Os sintomas pioram'} durante ${unirNatural(f.relato.fatores.map(fatorEmFrase))}`:'';
            queixa.push(fraseClinica([intensidade,agravantes].filter(Boolean).join(', ')));
        }
        if(queixa.length)paragrafos.push(queixa.join(' '));
        const contexto=[];
        if(f.inicio){const chave=normalizar(f.inicio).replace(/\s+/g,'_'),inicio=BANCO_SEMANTICO_LAUDO.mecanismos[chave]||`descrito como ${f.inicio.toLowerCase()}`;contexto.push(fraseClinica(`O quadro teve início ${inicio}`));}
        if(f.ocupacao.exposicoes.length)contexto.push(fraseClinica(`A atividade profissional envolve ${unirNatural(f.ocupacao.exposicoes).toLowerCase()}`));
        const a=f.atividade;
        if(a.nome&&/^(n[aã]o|nenhum|sedent)/i.test(a.nome))contexto.push('Não pratica atividade física.');
        else if(a.nome||a.frequencia||a.duracao||a.nivel||a.mudanca||a.cargas.length){const detalhes=[];if(a.frequencia)detalhes.push(`${a.frequencia} vez${a.frequencia==='1'?'':'es'} por semana`);if(a.duracao)detalhes.push(`${a.duracao} minutos por sessão`);if(a.nivel)detalhes.push(a.nivel.toLowerCase());if(a.mudanca){const chaveMudanca=normalizar(a.mudanca).replace(/\s+/g,'_');detalhes.push(BANCO_SEMANTICO_LAUDO.carga[chaveMudanca]||a.mudanca.toLowerCase());}if(a.cargas.length)detalhes.push(`exposição a ${unirNatural(a.cargas).toLowerCase()}`);contexto.push(fraseClinica(`Pratica ${a.nome||'atividade física'}${detalhes.length?`, ${unirNatural(detalhes)}`:''}`));}
        if(contexto.length)paragrafos.push(contexto.join(' '));
        const modificadores=[];
        if(f.antecedentes.comorbidades.length)modificadores.push(fraseClinica(`Entre os antecedentes relevantes, constam ${unirNatural(f.antecedentes.comorbidades)}`));
        if(f.antecedentes.cirurgias)modificadores.push(fraseClinica(`Foram registrados os seguintes procedimentos prévios: ${f.antecedentes.cirurgias}`));
        if(f.antecedentes.medicamentos)modificadores.push(fraseClinica(`Medicamentos em uso: ${f.antecedentes.medicamentos}`));
        if(f.restricoes.ativo){const restricoes=Object.entries(f.restricoes).filter(([chave,valor])=>chave!=='ativo'&&valor).map(([chave,valor])=>`${chave.replace(/_/g,' ')}: ${valor}`);if(restricoes.length)modificadores.push(fraseClinica(`Mantêm-se as seguintes restrições pós-operatórias: ${restricoes.join('; ')}`));}
        if(f.imagem.descricao)modificadores.push(fraseClinica(`${f.imagem.fonte==='laudo_conferido'?'O documento de imagem apresentado descreve':'Segundo o relato, o exame de imagem descreve'} ${f.imagem.descricao}`));
        if(f.contexto.psicossociais.length||f.contexto.observacao)modificadores.push(fraseClinica(`${escolhaSemantica(f.relato.hma,'contexto')}, destacam-se ${[f.contexto.psicossociais.length?unirNatural(f.contexto.psicossociais):'',f.contexto.observacao].filter(Boolean).join('; ').toLowerCase()}`));
        if(f.contexto.fonte&&!/relato do paciente/i.test(f.contexto.fonte))modificadores.push(fraseClinica(`A informação clínica foi complementada por ${BANCO_SEMANTICO_LAUDO.fonte[f.contexto.fonte]||f.contexto.fonte.toLowerCase()}`));
        if(modificadores.length)paragrafos.push(modificadores.join(' '));
        return valoresUnicos(paragrafos).join('\n\n');
    }
    function secaoExame(d){
        const porRegiao=new Map();
        d.achados.forEach(item=>{
            const feitos=(item.achados||[]).filter(a=>RESULTADO_LAUDO[a.resultado]);
            if(!feitos.length)return;
            if(!porRegiao.has(item.regiao))porRegiao.set(item.regiao,[]);
            feitos.forEach(a=>{const lista=porRegiao.get(item.regiao),fato={teste:limparTextoClinico(a.texto),resultado:a.resultado};if(!lista.some(x=>normalizar(x.teste)===normalizar(fato.teste)&&x.resultado===fato.resultado))lista.push(fato);});
        });
        if(!porRegiao.size)return'';
        const blocos=[];porRegiao.forEach((resultados,regiao)=>{
            const grupo=resultado=>valoresUnicos(resultados.filter(x=>x.resultado===resultado).map(x=>x.teste)),partes=[];
            const positivos=grupo('positivo'),negativos=grupo('negativo'),inconclusivos=grupo('inconclusivo');
            if(positivos.length)partes.push(positivos.length===1?`${positivos[0]} ${fraseVariada(positivos[0],BANCO_SEMANTICO_LAUDO.resultado.positivo)}`:`${unirNatural(positivos)} apresentaram respostas positivas`);
            if(negativos.length)partes.push(negativos.length===1?`${negativos[0]} ${fraseVariada(negativos[0],BANCO_SEMANTICO_LAUDO.resultado.negativo)}`:`${unirNatural(negativos)} apresentaram respostas negativas`);
            if(inconclusivos.length)partes.push(inconclusivos.length===1?`${inconclusivos[0]} ${fraseVariada(inconclusivos[0],BANCO_SEMANTICO_LAUDO.resultado.inconclusivo)}`:`${unirNatural(inconclusivos)} permaneceram inconclusivos`);
            const abertura=escolhaSemantica(regiao,'exame');
            blocos.push(fraseClinica(`${abertura} de ${regiao.toLowerCase()}, ${unirNatural(partes)}`));
        });
        return blocos.join('\n\n');
    }
    function construirCorrelacoes(d){
        const hipoteses=d.plano?.hipoteses||[];
        return (d.sintese.resumoPorRegiao||[]).map(regiao=>{
            const alvo=normalizar(regiao.nomeHipotese);
            const codigo=normalizar(regiao.codigoHipotese||regiao.codigoEixo),regiaoAlvo=normalizar(regiao.regiao);
            const achadosRegiao=d.achados.filter(a=>a.regiao===regiao.regiao),idsEixos=new Set(achadosRegiao.map(a=>normalizar(a.id)).filter(Boolean));
            const idsVinculados=new Set((d.plano?.testesPrioritarios||[]).filter(t=>achadosRegiao.some(a=>(a.achados||[]).some(x=>normalizar(x.texto)===normalizar(t.texto)))).map(t=>normalizar(t.hipoteseId)).filter(Boolean));
            const hip=hipoteses.find(h=>codigo&&normalizar(h.id)===codigo)||hipoteses.find(h=>idsEixos.has(normalizar(h.id))||idsVinculados.has(normalizar(h.id)))||(alvo?hipoteses.find(h=>nomeLimpo(h.nome)===nomeLimpo(regiao.nomeHipotese)||normalizar(h.nome).includes(alvo)||alvo.includes(normalizar(h.nome))):null)||hipoteses.find(h=>normalizar(h.regiaoId)===regiaoAlvo);
            const sugeridos=[...(hip?.aConfirmar||[])];
            const achadosVinculados=hip?achadosRegiao.filter(a=>normalizar(a.id)===normalizar(hip.id)):[];
            const fonteResultados=achadosVinculados.length?achadosVinculados:achadosRegiao;
            const resultados=fonteResultados.flatMap(a=>(a.achados||[]).map((x,indice)=>({x,indice})).filter(({x})=>RESULTADO_LAUDO[x.resultado]).map(({x,indice})=>({teste:limparTextoClinico(x.texto),resultado:x.resultado,indice,eixo:a.nome,eixoId:a.id||''})));
            const contagem=resultados.reduce((acc,item)=>(acc[item.resultado]=(acc[item.resultado]||0)+1,acc),{});
            return {regiao:regiao.regiao,hipoteseAnamnese:hip?.nome||regiao.nomeHipotese||'',criterio:hip?.criterio||{tipo:'',minimo:0,obrigatorios:[]},motivos:sugeridos.slice(0,4),resultados,contagem,nivel:regiao.nivel,direcao:regiao.direcaoInvestigacao||regiao.hipotese||'',conclusao:regiao.textoDocumento||'',direcaoProfissional:regiao.direcaoProfissional||''};
        });
    }
    window.coletarContextoIntegradoAvaliacaoKineSys=function(){const d=dadosAtuais();return clone({...d,correlacoes:construirCorrelacoes(d)});};
    function estadoDoCriterio(c){
        const criterio=c.criterio||{},positivos=new Set(c.resultados.filter(r=>r.resultado==='positivo').map(r=>r.indice));
        const minimo=Number(criterio.minimo||0),obrigatorios=criterio.obrigatorios||[];
        if(criterio.tipo==='qualquer')return positivos.size>0;
        if(criterio.tipo==='combinada')return obrigatorios.every(indice=>positivos.has(indice))&&(!minimo||positivos.size>=minimo);
        if(minimo)return positivos.size>=minimo;
        return null;
    }
    function fraseVariada(chave,opcoes){
        const soma=Array.from(String(chave||'')).reduce((total,letra)=>total+letra.charCodeAt(0),0);
        return opcoes[soma%opcoes.length];
    }
    function conflitosDoExame(d){
        const resultados=new Map();
        d.achados.forEach(item=>(item.achados||[]).filter(a=>RESULTADO_LAUDO[a.resultado]).forEach(a=>{
            const chave=`${normalizar(item.regiao)}|${normalizar(a.texto)}`;
            if(!resultados.has(chave))resultados.set(chave,{teste:limparTextoClinico(a.texto),valores:new Set()});
            resultados.get(chave).valores.add(a.resultado);
        }));
        return Array.from(resultados.values()).filter(item=>item.valores.size>1).map(item=>item.teste);
    }
    function secaoCorrelacao(d){
        const correlacoes=construirCorrelacoes(d);
        const avaliadas=correlacoes.filter(c=>c.resultados.length);
        if(!avaliadas.length)return'';
        const conflitos=conflitosDoExame(d);
        if(conflitos.length)return fraseClinica(`A interpretação permanece inconclusiva porque ${unirNatural(conflitos)} possui resultados divergentes no exame registrado; revise esses achados antes de definir a impressão fisioterapêutica`);
        const temHistoria=!!primeiroCampo(d,['paciente_hma','hma']);
        return avaliadas.map(c=>{
            const hipotese=nomeEmFrase(c.hipoteseAnamnese);
            const positivos=c.contagem.positivo||0,negativos=c.contagem.negativo||0,inconclusivos=c.contagem.inconclusivo||0;
            const alvo=hipotese?`a hipótese de ${hipotese}`:'a hipótese em análise';
            const alvoIndireto=hipotese?`à hipótese de ${hipotese}`:'à hipótese em análise';
            const alvoInicio=alvo.charAt(0).toUpperCase()+alvo.slice(1);
            if(c.nivel==='alerta')return'A interpretação clínico-funcional permanece condicionada à análise dos sinais de alerta identificados na avaliação.';
            const criterio=estadoDoCriterio(c);
            if(criterio===true)return fraseVariada(c.hipoteseAnamnese,[
                `${escolhaSemantica(c.hipoteseAnamnese,'integracao')}, ${temHistoria?'a história clínica e os achados objetivos convergem':'os achados objetivos convergem'} e sustentam, no âmbito fisioterapêutico, ${alvo}. O conjunto atingiu o critério clínico definido para esta avaliação.`,
                `A correlação entre a queixa, sua distribuição e as respostas obtidas no exame apresenta coerência clínica, favorecendo ${alvo}. Os achados registrados preencheram o critério estabelecido.`,
                `O padrão encontrado na anamnese foi reproduzido de forma consistente no exame físico-funcional, oferecendo suporte clínico ${alvoIndireto} e atingindo o critério previsto.`
            ]);
            if(positivos&&criterio===false)return fraseVariada(c.hipoteseAnamnese,[
                `${escolhaSemantica(c.hipoteseAnamnese,'integracao')}, há elementos favoráveis ${alvoIndireto}; entretanto, a convergência ainda não preenche o critério clínico definido.`,
                `A relação entre a história e o exame mantém ${alvo} entre as possibilidades, embora os achados disponíveis ainda sejam insuficientes para atingir o critério estabelecido.`,
                `${alvoInicio} permanece uma possibilidade clínico-funcional, mas o conjunto registrado ainda não atende ao critério necessário para maior sustentação.`
            ]);
            if(positivos)return fraseVariada(c.hipoteseAnamnese,[
                `${escolhaSemantica(c.hipoteseAnamnese,'integracao')}, os achados favorecem ${alvo}, ainda sem força suficiente para uma conclusão isolada.`,
                `A correspondência entre queixa e exame oferece suporte parcial ${alvoIndireto}; a interpretação deve permanecer integrada aos demais achados clínicos.`
            ]);
            if(negativos&&!inconclusivos)return fraseVariada(c.hipoteseAnamnese,[
                `A correlação realizada não ofereceu suporte ${alvoIndireto}. Os resultados negativos, isoladamente, não permitem excluí-la.`,
                `Os testes registrados reduziram o suporte ${alvoIndireto}, mas esse resultado, por si só, não permite afastá-la.`
            ]);
            if(negativos&&inconclusivos)return`Os resultados disponíveis não sustentam ${alvo}; parte do exame permaneceu inconclusiva.`;
            return`O exame foi inconclusivo e não permitiu esclarecer ${alvo}.`;
        }).join('\n\n');
    }
    function secaoSeguranca(d){
        const registros=[];
        (d.sintese.segurancaGlobal?.pistasGlobais||[]).forEach(a=>registros.push([a.titulo,a.desc,a.condutaTexto,a.justificativa].filter(Boolean).join(': ')));
        (d.sintese.resumoPorRegiao||[]).forEach(r=>{
            if(r.redFlags?.length)registros.push(`${r.regiao}: ${r.redFlags.join('; ')}`);
            if(r.redflagConduta||r.redflagJustificativa)registros.push([r.regiao,r.redflagConduta,r.redflagJustificativa].filter(Boolean).join(': '));
        });
        return registros.length?fraseClinica(`Quanto à segurança clínica, ${registros.map(limparTextoClinico).join('; ')}`):'';
    }
    function validarNarrativaClinica(d,secoes){
        const exameRegistrado=d.achados.some(item=>(item.achados||[]).some(a=>RESULTADO_LAUDO[a.resultado]));
        const temHistoria=!!primeiroCampo(d,['paciente_hma','hma']),pendencias=[];
        if(!temHistoria)pendencias.push('preencher a História da Moléstia Atual');
        if(!exameRegistrado)pendencias.push('registrar ao menos um resultado do exame físico-funcional');
        const texto=secoes.join('\n\n'),testesAusentes=[];
        d.achados.forEach(item=>(item.achados||[]).filter(a=>RESULTADO_LAUDO[a.resultado]).forEach(a=>{if(!normalizar(texto).includes(normalizar(a.texto)))testesAusentes.push(limparTextoClinico(a.texto));}));
        const conflitos=conflitosDoExame(d);
        return {ok:!pendencias.length&&!testesAusentes.length&&!conflitos.length,pendencias,testesAusentes:valoresUnicos(testesAusentes),conflitos};
    }
    function textoBase(d){
        const historia=secaoHistoria(d),exame=secaoExame(d),impressao=secaoCorrelacao(d),seguranca=secaoSeguranca(d);
        const conteudo=[historia,exame,impressao,seguranca].filter(Boolean);
        const validacao=validarNarrativaClinica(d,conteudo);
        if(validacao.pendencias.length)return {texto:'',modo:'incompleto',fonte:d.fonte,revisado:false,textoAutomatico:true,versaoTexto:14,pendencias:validacao.pendencias,validacao,atualizadoEm:new Date().toISOString()};
        const secoes=[secaoIdentificacao(d),...conteudo];
        return {texto:secoes.join('\n\n'),modo:validacao.ok?'assistido':'revisao',fonte:d.fonte,revisado:false,textoAutomatico:true,versaoTexto:14,validacao,atualizadoEm:new Date().toISOString()};
    }
    window.preencherLaudoAvaliacaoKineSys=function(value){laudo=value&&typeof value==='object'?clone(value):null;const editor=document.getElementById('ks-laudo-texto');if(editor)editor.value=laudo?.texto||'';};
    window.coletarLaudoAvaliacaoKineSys=function(){return laudo?clone(laudo):null;};
    window.renderizarLaudoAvaliacaoKineSys=function(){
        const editor=document.getElementById('ks-laudo-texto');if(!editor)return;
        const d=dadosAtuais();
        // Enquanto ninguém editou o texto, ele acompanha o exame; texto editado é preservado.
        const textoLaudo=laudo?.texto||'';
        const legadoAuto=!!laudo&&!laudo.revisado&&(
            (textoLaudo.includes('foi avaliado(a) pela fisioterapia')&&textoLaudo.includes('Com base nos dados registrados, recomenda-se'))||
            (textoLaudo.startsWith('RELATÓRIO FISIOTERAPÊUTICO')&&textoLaudo.includes('Quanto à queixa atual, registra-se:')&&textoLaudo.includes('O exame físico ainda não contém resultados de testes registrados.')&&textoLaudo.includes('A hipótese clínica permanece em aberto até a correlação entre a anamnese e o exame físico.'))
        );
        if(!laudo||legadoAuto||(laudo.textoAutomatico&&!laudo.revisado&&(laudo.fonte!==d.fonte||laudo.versaoTexto!==14)))laudo=textoBase(d);
        const mudou=laudo.fonte!==d.fonte;
        if(mudou)laudo.revisado=false;
        editor.value=laudo.texto;
        document.getElementById('ks-laudo-revisado').checked=!!laudo.revisado;
        document.getElementById('ks-laudo-status').textContent=mudou?'A avaliação mudou. Seu texto foi preservado: atualize a base ou revise as diferenças antes de finalizar.':laudo.modo==='incompleto'?`Para gerar o relatório, falta ${unirNatural(laudo.pendencias||[])}.`:laudo.modo==='revisao'?'O relatório foi organizado, mas há achados divergentes que exigem revisão profissional.':'Relatório correlacionado à anamnese e ao exame. Revise a conclusão antes de finalizar.';
    };
    let workspaceInicializado=false;
    function inicializarWorkspaceAvaliacaoKineSys(){
        if(workspaceInicializado)return;
        const editor=document.getElementById('ks-laudo-texto'),review=document.getElementById('ks-laudo-revisado');
        if(!editor&&!review)return;
        workspaceInicializado=true;
        editor?.addEventListener('input',()=>{if(!laudo)return;laudo.texto=editor.value;laudo.textoAutomatico=false;laudo.revisado=false;laudo.atualizadoEm=new Date().toISOString();if(review)review.checked=false;agendarAutosaveKineSys();});
        review?.addEventListener('change',()=>{if(!laudo)return;if(review.checked&&(laudo.modo==='incompleto'||!laudo.texto.trim())){review.checked=false;document.getElementById('ks-laudo-status').textContent='Complete a anamnese e o exame antes de revisar o relatório.';return;}laudo.revisado=review.checked;if(review.checked)laudo.fonte=dadosAtuais().fonte;laudo.revisadoEm=review.checked?new Date().toISOString():null;agendarAutosaveKineSys();});
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


/* Product Design 2026-09-30 — Exame clínico por regiões, guiado pela queixa */
(function(){
'use strict';
function raizPD(){return document.getElementById('subtela_mapeamento');}
function regioesPD(){return Array.from(document.querySelectorAll('#grupo_regioes_mapeamento input[data-regiao]'));}
function nomeRegiaoPD(input){const id=input.dataset.regiao;return window.BANCO_MAPEAMENTO_CLINICO?.[id]?.nome||input.closest('label')?.textContent?.trim()||id;}
function criarGradePD(root){
 const container=root.querySelector('#container_clusters_regioes'); if(!container)return null;
 let grid=root.querySelector('.ks-pd-exam-grid');
 if(!grid){
  grid=document.createElement('div');grid.className='ks-pd-exam-grid';container.parentNode.insertBefore(grid,container);
  const main=document.createElement('main');main.className='ks-pd-exam-main';main.appendChild(container);
  const aside=document.createElement('details');aside.className='ks-pd-exam-summary';aside.setAttribute('aria-label','Resumo do exame');
  aside.innerHTML='<summary class="ks-pd-summary-head">Resumo do exame <span class="ks-pd-summary-status">Em andamento</span></summary><section class="ks-pd-summary-section"><div class="ks-pd-summary-title"><span>Regiões</span><span class="ks-pd-summary-count" id="ks-pd-region-count">0</span></div><div class="ks-pd-region-list"></div></section><section class="ks-pd-summary-section"><div class="ks-pd-summary-title"><span>Achados registrados</span><span class="ks-pd-summary-count" id="ks-pd-findings-count">0</span></div><div class="ks-pd-pending-list"></div></section>';
  grid.append(main,aside);
 }
 return grid;
}
function atualizarResumoPD(root){
 const aside=root.querySelector('.ks-pd-exam-summary');if(!aside)return;
 const selecionadas=regioesPD().filter(i=>i.checked);
 // Conta o que está gravado no estado do exame (inclui achados registrados na biblioteca/roteiro).
 const totalRegistrados=Array.from(root.querySelectorAll('select.teste-resultado-select')).filter(s=>s.value).length;
 const resultados={length:totalRegistrados};
 aside.querySelector('#ks-pd-region-count').textContent=String(selecionadas.length);
 aside.querySelector('#ks-pd-findings-count').textContent=String(resultados.length);
 const lista=aside.querySelector('.ks-pd-region-list');lista.replaceChildren();
 if(!selecionadas.length){const p=document.createElement('p');p.className='ks-pd-summary-empty';p.textContent='Nenhuma região selecionada.';lista.appendChild(p);}else selecionadas.forEach((input,index)=>{const row=document.createElement('div');row.className='ks-pd-summary-row'+(index===0?' is-started':'');row.textContent=nomeRegiaoPD(input);lista.appendChild(row);});
 const pend=aside.querySelector('.ks-pd-pending-list');pend.replaceChildren();
 const p=document.createElement('p');p.className='ks-pd-summary-empty';p.textContent=resultados.length?resultados.length+' achado(s) objetivo(s) registrado(s).':'Registre somente os testes pertinentes à queixa.';pend.appendChild(p);
 aside.querySelector('.ks-pd-summary-status').textContent=selecionadas.length?'Em andamento':'Aguardando região';
}
function atualizarPD(){
 const root=raizPD();if(!root)return;root.classList.add('ks-pd-region-first');
 criarGradePD(root);atualizarResumoPD(root);
}
let agendadoPD=false;
function agendarPD(){if(agendadoPD)return;agendadoPD=true;requestAnimationFrame(()=>{agendadoPD=false;atualizarPD();});}
function iniciarPD(){
 document.addEventListener('click',e=>{if(e.target?.closest?.('#step_indicador_2,[onclick*="avancarParaMapa"],[onclick*="subtela_mapeamento"]'))setTimeout(agendarPD,0);});
 document.addEventListener('change',e=>{if(e.target?.matches?.('#grupo_regioes_mapeamento input,select.teste-resultado-select'))agendarPD();});
 document.addEventListener('kinesys:motor3-plano-atualizado',agendarPD);
 const tela=document.getElementById('tela_avaliacao');if(tela)new MutationObserver(muts=>{if(muts.some(m=>!m.target.closest?.('.ks-pd-exam-summary')))agendarPD();}).observe(tela,{childList:true,subtree:true,attributes:true,attributeFilter:['hidden','class']});
 agendarPD();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',iniciarPD,{once:true});else iniciarPD();
})();

(function(){if(document.getElementById("ks-pd-exam-style"))return;const s=document.createElement("style");s.id="ks-pd-exam-style";s.textContent="\n\n/* Product Design 2026-09-30 — Exame clínico orientado pela queixa, opção 3 */\n#subtela_mapeamento.ks-pd-region-first{--ks-exam-border:#c8ddd9;--ks-exam-ink:#173f47;--ks-exam-muted:#627b80;--ks-exam-soft:#f4faf9;--ks-exam-accent:#0d8f86}\n#subtela_mapeamento .ks-pd-exam-intro{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:18px;align-items:center;margin:0 0 16px;padding:16px 18px;border:1px solid #e3c778;border-radius:12px;background:#fffaf0;color:var(--ks-exam-ink)}\n#subtela_mapeamento .ks-pd-exam-intro strong{display:block;margin-bottom:4px;font-size:15px}\n#subtela_mapeamento .ks-pd-exam-intro p{margin:0;color:var(--ks-exam-muted);line-height:1.45}\n#subtela_mapeamento .ks-pd-complaint-label{display:block;margin-bottom:5px;color:#8a6512;font-size:11px;font-weight:800;letter-spacing:.06em;text-transform:uppercase}\n#subtela_mapeamento .ks-pd-exam-intro .btn-secondary{white-space:nowrap;background:#fff}\n#subtela_mapeamento .ks-pd-suggestions{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin:0 0 16px;padding:12px 14px;border:1px solid var(--ks-exam-border);border-radius:12px;background:#fff}\n#subtela_mapeamento .ks-pd-suggestions>strong{font-size:13px;color:var(--ks-exam-ink);margin-right:3px}\n#subtela_mapeamento .ks-pd-suggestion{min-height:34px;padding:6px 11px;border:1px solid #9fc7c1;border-radius:999px;background:#eef9f7;color:#145f5a;font-weight:700;cursor:pointer}\n#subtela_mapeamento .ks-pd-suggestion:hover,#subtela_mapeamento .ks-pd-suggestion:focus-visible{border-color:var(--ks-exam-accent);background:#dff4f1;outline:2px solid rgba(13,143,134,.18);outline-offset:2px}\n#subtela_mapeamento .ks-pd-suggestions small{color:var(--ks-exam-muted)}\n#subtela_mapeamento .ks-pd-exam-grid{display:grid;grid-template-columns:minmax(0,1fr) 310px;gap:16px;align-items:start}\n#subtela_mapeamento .ks-pd-exam-main{min-width:0}\n#subtela_mapeamento .ks-pd-exam-summary{position:sticky;top:86px;display:grid;gap:0;border:1px solid var(--ks-exam-border);border-radius:14px;background:#fff;box-shadow:0 12px 30px rgba(20,73,75,.07);overflow:hidden}\n#subtela_mapeamento .ks-pd-summary-head{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:16px 17px;border-bottom:1px solid #dcebe8}\n#subtela_mapeamento .ks-pd-summary-head h3{margin:0;font-size:17px;color:var(--ks-exam-ink)}\n#subtela_mapeamento .ks-pd-summary-status{padding:5px 9px;border-radius:999px;background:#e6f5f3;color:#11716a;font-size:11px;font-weight:800}\n#subtela_mapeamento .ks-pd-summary-section{padding:15px 17px;border-bottom:1px solid #e5efed}\n#subtela_mapeamento .ks-pd-summary-section:last-child{border-bottom:0}\n#subtela_mapeamento .ks-pd-summary-title{display:flex;justify-content:space-between;gap:10px;margin-bottom:10px;color:var(--ks-exam-ink);font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:.04em}\n#subtela_mapeamento .ks-pd-summary-count{display:inline-grid;place-items:center;min-width:25px;height:25px;padding:0 7px;border-radius:999px;background:#edf4f3;color:#49686d}\n#subtela_mapeamento .ks-pd-region-list,#subtela_mapeamento .ks-pd-pending-list{display:grid;gap:8px}\n#subtela_mapeamento .ks-pd-summary-row{display:flex;align-items:center;gap:9px;min-height:30px;color:#365a61;font-size:13px}\n#subtela_mapeamento .ks-pd-summary-row::before{content:'';width:9px;height:9px;border:2px solid #7c9da0;border-radius:50%;flex:none}\n#subtela_mapeamento .ks-pd-summary-row.is-started::before{border-color:var(--ks-exam-accent);background:var(--ks-exam-accent)}\n#subtela_mapeamento .ks-pd-summary-empty{margin:0;color:var(--ks-exam-muted);font-size:13px;line-height:1.45}\n#subtela_mapeamento .ks-pd-clinical-tip{padding:14px 17px;background:#eff9f7;color:#41666a;font-size:12px;line-height:1.5}\n#subtela_mapeamento .ks-pd-clinical-tip strong{display:block;margin-bottom:4px;color:#135d58}\n#subtela_mapeamento #container_clusters_regioes>.ks-evaluation-overview{margin-top:0}\n#subtela_mapeamento #container_clusters_regioes>.region-card,#subtela_mapeamento #container_clusters_regioes>.cluster-card,#subtela_mapeamento #container_clusters_regioes>[class*=\"region\"]{border-radius:14px}\n#subtela_mapeamento .region-strip{margin-bottom:14px!important;padding:12px 0 14px!important}\n#subtela_mapeamento #ks-regions-selected{gap:7px}\n#subtela_mapeamento .ks-region-chip{background:#fff;box-shadow:0 3px 10px rgba(26,75,77,.04)}\n#subtela_mapeamento .ks-region-chip.active{border-color:var(--ks-exam-accent);background:#e6f6f3;box-shadow:0 0 0 2px rgba(13,143,134,.08)}\n@media(max-width:1050px){#subtela_mapeamento .ks-pd-exam-grid{grid-template-columns:1fr}#subtela_mapeamento .ks-pd-exam-summary{position:static;grid-template-columns:repeat(2,minmax(0,1fr))}#subtela_mapeamento .ks-pd-summary-head,#subtela_mapeamento .ks-pd-clinical-tip{grid-column:1/-1}}\n@media(max-width:680px){#subtela_mapeamento .ks-pd-exam-intro{grid-template-columns:1fr}#subtela_mapeamento .ks-pd-exam-intro .btn-secondary{width:100%}#subtela_mapeamento .ks-pd-exam-summary{grid-template-columns:1fr}#subtela_mapeamento .ks-pd-summary-head,#subtela_mapeamento .ks-pd-clinical-tip{grid-column:auto}#subtela_mapeamento .ks-pd-suggestions{align-items:flex-start}}\n";document.head.appendChild(s);})();


/* KineSys 2026-10-06 — normaliza o fluxo do resumo no rodapé da etapa 2 */
(function(){
 'use strict';
 function corrigirFluxo(){
  const root=document.getElementById('subtela_mapeamento');
  if(!root)return;
  root.querySelectorAll('.ks-pd-exam-summary,[aria-label="Resumo do exame"]').forEach(el=>{
   el.style.position='static';el.style.top='auto';el.style.right='auto';el.style.bottom='auto';el.style.inset='auto';el.style.float='none';el.style.transform='none';el.style.width='100%';el.style.maxHeight='none';el.style.height='auto';el.style.margin='16px 0 0';
  });
  root.querySelectorAll('.ks-pd-exam-grid').forEach(el=>{el.style.display='block';el.style.gridTemplateColumns='none';el.style.height='auto';el.style.minHeight='0';});
 }
 const tela=document.getElementById('tela_avaliacao');
 if(tela)new MutationObserver(corrigirFluxo).observe(tela,{childList:true,subtree:true,attributes:true,attributeFilter:['hidden','class','style']});
 corrigirFluxo();
})();


/* KineSys 2026-10-06 — alvo do painel-resumo real, independente de classe */
(function(){
 'use strict';
 function ajustarPainelReal(){
  const root=document.getElementById('subtela_mapeamento');
  if(!root)return;
  const heading=Array.from(root.querySelectorAll('h2,h3')).find(el=>el.textContent.trim()==='Resumo do exame');
  const card=heading?.closest('aside')||heading?.closest('[role="complementary"]')||heading?.parentElement?.parentElement;
  if(card){card.style.position='static';card.style.top='auto';card.style.right='auto';card.style.bottom='auto';card.style.inset='auto';card.style.float='none';card.style.transform='none';card.style.width='100%';card.style.maxHeight='none';card.style.height='auto';card.style.margin='16px 0 0';}
  const parent=card?.parentElement;
  if(parent&&parent!==root){parent.style.display='block';parent.style.gridTemplateColumns='none';parent.style.height='auto';parent.style.minHeight='0';}
 }
 const tela=document.getElementById('tela_avaliacao');
 if(tela)new MutationObserver(ajustarPainelReal).observe(tela,{childList:true,subtree:true,attributes:true,attributeFilter:['hidden','class','style']});
 ajustarPainelReal();
})();

