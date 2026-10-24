/* KineSys 1.17 — espaço de avaliação, sem inferência diagnóstica adicional. */
(function(){
    'use strict';
    let painel=null,retorno=null,regiaoAtiva='',laudo=null,carregamentoLaudo=null;
    const clone=value=>JSON.parse(JSON.stringify(value));
    const normalizar=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
    const contextoAtual=()=>window.obterContextoAvaliacaoKineSys?.()||{pacienteId:typeof pacienteAtualId!=='undefined'?String(pacienteAtualId||''):'',avaliacaoId:typeof avaliacaoEdicaoId!=='undefined'?String(avaliacaoEdicaoId||''):'',usuarioId:typeof usuarioLogado!=='undefined'?String(usuarioLogado?.id||usuarioLogado?.email||''):'',clinicaId:'',revisao:0};
    let contextoDoLaudo=JSON.stringify(contextoAtual());
    function limparLaudoDoContexto(){
        laudo=null;carregamentoLaudo=null;contextoDoLaudo=JSON.stringify(contextoAtual());
        const editor=document.getElementById('ks-laudo-texto'),review=document.getElementById('ks-laudo-revisado'),status=document.getElementById('ks-laudo-status');
        if(editor)editor.value='';if(review)review.checked=false;if(status)status.textContent='Preencha e revise a avaliação deste paciente para gerar o relatório.';
        const revisao=document.getElementById('ks-laudo-revisao-documental');if(revisao){revisao.replaceChildren();revisao.hidden=true;}
    }
    function conferirContextoLaudo(){
        if(contextoDoLaudo!==JSON.stringify(contextoAtual())){limparLaudoDoContexto();return false;}return true;
    }

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
        let planoAtual=window.KineSysMotorClinico3?.ultimoPlano||window.gerarPlanoClinicoHMAKineSys?.()||null;
        const hmaFonte=document.getElementById('paciente_hma')?.value?.trim()||'';
        if(window.KineSysEvidenceReasoning&&planoAtual?.raciocinio?.origemHMA!==hmaFonte)planoAtual=window.gerarPlanoClinicoHMAKineSys?.()||planoAtual;
        const plano=planoAtual?{
            versao:planoAtual.versao||'',
            insuficiente:!!planoAtual.insuficiente,
            hipoteses:(planoAtual.hipoteses||[]).filter(Boolean).map(h=>({id:h.id||'',nome:h.nome||'',regiaoId:h.regiaoId||'',aConfirmar:(h.aConfirmar||[]).filter(Boolean),criterio:criterioDaHipotese(h)})),
            testesPrioritarios:(planoAtual.exame?.testesPrioritarios||[]).filter(Boolean).map(t=>({texto:t.texto||t.nome||'',tipo:t.tipo||'',hipoteseId:t.hipoteseId||t.condicaoId||'',hipoteseIds:t.hipoteseIds||[],regiaoIds:t.regiaoIds||[]})).filter(t=>t.texto),
            lacunas:(planoAtual.lacunas||[]).filter(Boolean),
            raciocinio:clone(planoAtual.raciocinio||planoAtual.hmaResultado?.raciocinio||null)
        }:null;
        const identificacao=[],historia=[],campos={},rotulosCampos={};
        const gruposAnamnese={
            fatoresPiora:[],comorbidades:[],exposicoesOcupacionais:[],exposicoesEsportivas:[],fatoresPsicossociais:[]
        };
        const ignorar=new Set(['input_cirurgia','input_medicamento','paciente_busca','busca_paciente_precadastro','select_paciente_precadastro','confirmacao_documental','chk_corticoide','exames_imagem_fonte']);
        const rotulos={eva_slider:'Dor atual (EVA 0–10)',origem_informacao_clinica:'Fonte das informações',avaliacao_realizado_em:'Data e hora do atendimento'};
        const grupoCampo=el=>el.classList.contains('chk_fator_piora')?'fatoresPiora':el.classList.contains('chk_exposicao_ocupacional')?'exposicoesOcupacionais':el.classList.contains('chk_exposicao_esportiva')?'exposicoesEsportivas':el.classList.contains('chk_yellow_flag')?'fatoresPsicossociais':/^chk_(tabagista|etilista|hipertenso|diabetico|corticoide_sistemico|corticoide_infiltracao|aine_recente|cirurgia)$/.test(el.id)?'comorbidades':'';
        const rotuloCampo=el=>limparTextoClinico(el.labels?.[0]?.querySelector('span')?.textContent||el.labels?.[0]?.textContent||el.closest('.input-group')?.querySelector('label')?.textContent||el.id.replace(/_/g,' '));
        document.querySelectorAll('#subtela_triagem input,#subtela_triagem textarea,#subtela_triagem select').forEach(el=>{
            if(el.type==='hidden'||el.type==='password'||el.dataset?.contextUi==='true'||ignorar.has(el.id)||el.disabled)return;
            if((el.type==='checkbox'||el.type==='radio')&&!el.checked)return;
            if(el.tagName==='SELECT'&&!el.value)return;
            const label=rotulos[el.id]||rotuloCampo(el);
            const value=el.type==='checkbox'||el.type==='radio'?'Marcado':el.tagName==='SELECT'?el.selectedOptions[0]?.textContent:el.value;
            if(!String(value||'').trim())return;
            const grupo=grupoCampo(el);
            if(grupo){if(label&&!gruposAnamnese[grupo].includes(label))gruposAnamnese[grupo].push(label);return;}
            if(el.id){campos[el.id]=String(value).trim();rotulosCampos[el.id]=label;}
            if(el.id==='paciente_hma')return; // já vira o parágrafo da anamnese
            const line=label.replace(/\s+/g,' ') + ': '+String(value).trim();
            (/^paciente_(nome|idade|cpf|telefone|sexo|nascimento)$/.test(el.id)?identificacao:historia).push(line);
        });
        if(campos.exames_imagem_descricao)campos.exames_imagem_fonte=document.getElementById('exames_imagem_fonte')?.value||'relato_paciente';
        const dataAtendimento=document.getElementById('avaliacao_realizado_em')?.value;
        if(dataAtendimento)campos.avaliacao_realizado_em=dataAtendimento;
        if(plano&&window.KineSysEvidenceReasoning&&plano.raciocinio?.origemHMA!==String(campos.paciente_hma||campos.hma||''))plano.raciocinio=window.KineSysEvidenceReasoning.analisar(campos.paciente_hma||campos.hma||'');
        const complementos={cirurgias:'',medicamentos:'',cirurgiasItens:[],medicamentosItens:[]};
        ['tags_cirurgias','tags_medicamentos'].forEach(id=>{
            const container=document.getElementById(id),chave=id==='tags_cirurgias'?'cirurgias':'medicamentos';
            const itens=valoresUnicos(Array.from(container?.children||[]).map(tag=>{
                const copia=tag.cloneNode(true);copia.querySelectorAll('button,[role="button"]').forEach(b=>b.remove());return copia.textContent.replace(/[✕×]/g,'');
            }));
            // Compatibilidade com registros/ambientes antigos sem elementos de tag separados.
            const legado=!itens.length?limparTextoClinico(container?.textContent?.replace(/[✕×]/g,'')):'';
            complementos[chave+'Itens']=itens.length?itens:legado?[legado]:[];
            complementos[chave]=unirNatural(complementos[chave+'Itens']);
            if(complementos[chave])historia.push((chave==='cirurgias'?'Cirurgias/procedimentos: ':'Medicamentos: ')+complementos[chave]);
        });
        const restricoes=coletarRestricoesPosOperatorias();
        const preservado=typeof clinicaEstruturadaPreservada!=='undefined'?clinicaEstruturadaPreservada||{}:{};
        const contextoAnamnese=clone(window.KineSysContextoAnamnese?.coletar()||preservado.contextoAnamnese||{});
        const exameLivre=clone(window.KineSysExameLivre?.documentar()||preservado.exameLivre?.registros||[]);
        const regioesSelecionadas=Array.from(document.querySelectorAll('#grupo_regioes_mapeamento input:checked')).map(el=>{
            const id=el.dataset.regiao;return {id,nome:(typeof BANCO_MAPEAMENTO_CLINICO!=='undefined'?BANCO_MAPEAMENTO_CLINICO[id]?.nome:'')||el.labels?.[0]?.textContent||id};
        }).filter(r=>r.id);
        // Reutiliza dados da avaliação carregada; não consulta outras sessões nem introduz questionários.
        const funcional=clone({medidasObjetivas:preservado.medidasObjetivas||[],psfs:preservado.psfs||null,outcomes:preservado.outcomes||[],objetivosPlano:preservado.objetivosPlano||null});
        const profissional=profissionalDoLaudo();
        if(restricoes.ativo)historia.push('Restrições pós-operatórias: '+Object.entries(restricoes).filter(([k,v])=>k!=='ativo'&&v).map(([k,v])=>k+': '+v).join('; '));
        const fonte=JSON.stringify({identificacao,historia,campos,gruposAnamnese,complementos,contextoAnamnese,exameLivre,regioesSelecionadas,restricoes,funcional,profissional,plano,resumo:sintese.resumoPorRegiao.map(r=>({regiao:r.regiao,texto:r.textoDocumento,hipotese:r.hipotese,nome:r.nomeHipotese,nivel:r.nivel,anamnese:r.hipotesesAnamnese||[],redFlags:r.redFlags,conduta:r.redflagConduta,justificativa:r.redflagJustificativa})),achados,seguranca:sintese.segurancaGlobal});
        return {identificacao,historia,campos,rotulosCampos,gruposAnamnese,complementos,contextoAnamnese,exameLivre,regioesSelecionadas,restricoes,funcional,profissional,plano,sintese,achados,seguranca,fonte,compativeis:achados.filter(a=>a.completo&&a.status==='positivo')};
    }
    function limparTextoClinico(value){return String(value||'').replace(/\s+/g,' ').replace(/\s+([,.;:])/g,'$1').trim();}
    function fraseClinica(value){const texto=limparTextoClinico(value);if(!texto)return'';return texto.charAt(0).toUpperCase()+texto.slice(1).replace(/[.;:,\s]+$/,'')+'.';}
    function minusculaInicial(value){const texto=limparTextoClinico(value);return /^[A-ZÁÉÍÓÚÂÊÔÃÕÇ0-9]{2,}(?:\s|\b)/u.test(texto)?texto:texto?texto.charAt(0).toLowerCase()+texto.slice(1):'';}
    function valorCampo(d,id){return limparTextoClinico(d.campos?.[id]||'');}
    function primeiroCampo(d,ids){for(const id of ids){const valor=valorCampo(d,id);if(valor)return valor;}return'';}
    function unirNatural(itens){const lista=itens.map(limparTextoClinico).filter(Boolean);if(!lista.length)return'';if(lista.length===1)return lista[0];return lista.slice(0,-1).join(', ')+' e '+lista.at(-1);}
    function nomeClinico(value){return limparTextoClinico(nomeLimpo(value)).replace(/\bNervo\b/g,'nervo').replace(/\bnervo (Supraescapular|Mediano|Ulnar|Radial|Ciático|Tibial|Fibular|Trigêmeo)\b/g,termo=>termo.toLowerCase()).replace(/\s+[—–-]\s+(?:cluster(?: de exame)?|padrão clínico|suspeita|investigação causal|hipótese(?: clínica| funcional)?|diferencial(?: neurovascular| neurológico| médico)?|rastreamento).*$/i,'').trim();}
    function nomeEmFrase(value){const nome=nomeClinico(value).replace(/\b(Cervical|Lombar|Lombossacra|Torácica)\b/g,x=>x.toLowerCase());if(!nome)return'';return /^[A-ZÁÉÍÓÚÂÊÔÃÕÇ0-9]{2,}(?:\s|$)/.test(nome)?nome:nome.charAt(0).toLowerCase()+nome.slice(1);}
    function fatorEmFrase(value){const fator=limparTextoClinico(value).toLowerCase();return ({'em pé':'a permanência em pé','sentado':'a permanência sentada','noturno':'o período noturno','movimento':'o movimento','repouso':'o repouso','carga':'a aplicação de carga'})[fator]||fator;}
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
            'Na avaliação objetiva'
        ]),
        integracao:Object.freeze([
            'Considerados em conjunto',
            'Na integração dos dados registrados',
            'Na correlação entre história e exame',
            'Na análise clínico-funcional do conjunto',
            'Considerando os resultados disponíveis',
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
        exposicoes:Object.freeze({
            'sedestacao prolongada':'permanência prolongada em posição sentada',
            'ortostatismo prolongado':'ortostatismo prolongado',
            'flexao/rotacao com carga':'movimentos de flexão e rotação sob carga',
            'acima da cabeca':'atividades com os membros superiores elevados acima da cabeça',
            'repeticao maos/punhos':'movimentos repetitivos de mãos e punhos',
            'vibracao':'exposição a vibração',
            'manejo de pacientes':'manejo e transferência de pacientes',
            'impacto':'atividades de impacto',
            'forca alta':'esforços de alta intensidade',
            'overhead':'atividades com os membros superiores acima da cabeça',
            'rotacao/pivo':'movimentos de rotação e pivô',
            'endurance':'atividades de resistência prolongada'
        }),
        carga:Object.freeze({nao:'sem aumento recente relevante',leve:'com aumento leve recente',moderado:'com aumento moderado recente',acentuado:'com aumento acentuado recente'}),
        fonte:Object.freeze({relato_paciente:'relato do paciente',relato_documento:'relato associado a documento conferido',laudo:'documento ou laudo apresentado',achado_fisioterapeuta:'achados da avaliação fisioterapêutica'})
    });
    const VOCABULARIO_DOCUMENTAL_LAUDO=Object.freeze({
        antecedentes:Object.freeze({'dm':'diabetes mellitus (DM)','has':'hipertensão arterial sistêmica (HAS)','tabagismo':'tabagismo','etilismo':'consumo de álcool','corticoide sistemico':'uso de corticoide sistêmico','infiltracao recente':'infiltração recente','aine recente':'uso recente de anti-inflamatório não esteroidal (AINE)'}),
        contexto:Object.freeze({'sono ruim':'alterações do sono','medo de movimento/relesao':'medo de movimento ou de nova lesão','catastrofizacao':'catastrofização relacionada aos sintomas','baixa autoeficacia':'baixa autoeficácia percebida','evitacao':'evitação de atividades','estresse elevado':'estresse elevado','barreiras de retorno':'barreiras para retorno às atividades','expectativa negativa':'expectativa negativa quanto à recuperação'}),
        carga:Object.freeze({sem_carga:'sem apoio de carga',toque:'apoio de toque ou contato',parcial:'apoio parcial de carga',conforme_tolerado:'apoio de carga conforme tolerância',total:'apoio total de carga'}),
        estadoObjetivo:Object.freeze({nao_iniciado:'não iniciado',em_progresso:'em acompanhamento',atingido:'atingido',nao_atingido:'não atingido',reformulado:'reformulado'}),
        testes:Object.freeze(['SLR','Slump','Lasègue','Spurling','ULTT','FADIR','FABER','Thompson','Tinel','Phalen','Cozen','McMurray','Roos','Windlass','Hawkins','Neer','Jobe','Speed','Yergason','Lachman','Apley','Ober','Thomas','Ely','Patte','Adson','EAST','Dix-Hallpike','Ottawa'])
    });
    function termoDocumental(grupo,value){return VOCABULARIO_DOCUMENTAL_LAUDO[grupo]?.[normalizar(value).trim()]||limparTextoClinico(value);}
    function profissionalDoLaudo(){
        const u=(typeof usuarioLogado!=='undefined'?usuarioLogado:null)||window.usuarioLogado||{};
        const nome=limparTextoClinico(u.nome),conselho=limparTextoClinico(u.conselho),numero=limparTextoClinico(u.numero_registro),regional=limparTextoClinico(u.regional),registro=limparTextoClinico(u.registro);
        const prefixo=conselho?(conselho+(regional&&!conselho.endsWith('-'+regional)?`-${regional}`:'')):'';
        const completo=registro?(/^[\d]/.test(registro)&&prefixo?`${prefixo} ${registro}`:registro):[prefixo,numero].filter(Boolean).join(' ');
        return {id:u.id||'',nome,registro:completo};
    }
    function dataDocumental(value){
        const texto=limparTextoClinico(value),m=texto.match(/^(\d{4})-(\d{2})-(\d{2})(?:T|$)/);
        return m?`${m[3]}/${m[2]}/${m[1]}`:texto;
    }
    function fechamentoDoLaudo(d){
        const data=new Intl.DateTimeFormat('pt-BR',{timeZone:'America/Sao_Paulo',day:'2-digit',month:'long',year:'numeric'}).format(new Date());
        return `Data de emissão: ${data}\n\n________________________________________\n${d.profissional.nome||'Nome do profissional: ____________________'}\n${d.profissional.registro||'Registro profissional (conselho e número): ____________________'}`;
    }
    function garantirFechamentoLaudo(d){
        if(!laudo?.texto?.trim())return;
        const fechamento=fechamentoDoLaudo(d),anterior=laudo.fechamentoAutomatico;
        // Só substitui o bloco que o motor inseriu e que continua intacto; redação manual é preservada.
        if(anterior&&laudo.texto.endsWith(anterior))laudo.texto=laudo.texto.slice(0,-anterior.length).trimEnd();
        else if(/\nData de emissão:[\s\S]*_{10,}/.test(laudo.texto))return;
        laudo.texto=laudo.texto.trimEnd()+'\n\n'+fechamento;
        laudo.fechamentoAutomatico=fechamento;
    }
    function escolhaSemantica(chave,grupo){const opcoes=BANCO_SEMANTICO_LAUDO[grupo]||[];return fraseVariada(chave,opcoes);}
    function descreverExposicao(value){return BANCO_SEMANTICO_LAUDO.exposicoes[normalizar(value).trim()]||limparTextoClinico(value).toLowerCase();}
    function descreverInicio(value){
        const chave=normalizar(value);
        if(/trauma.agudo/.test(chave))return 'O início esteve associado a trauma agudo';
        if(/esforco.repetitivo|sobrecarga/.test(chave))return 'O início foi relacionado a esforço repetitivo ou sobrecarga';
        if(/insidioso/.test(chave))return 'O quadro teve início insidioso, sem trauma definido';
        if(/pos.cirurgico|pos.imobilizacao/.test(chave))return 'O quadro começou no período pós-cirúrgico ou pós-imobilização';
        return `O início foi descrito como ${limparTextoClinico(value).toLowerCase()}`;
    }
    function polirRelatoClinico(value){
        let texto=limparTextoClinico(value)
            .replace(/\bpacient\s+erelata\b/gi,'Paciente relata')
            .replace(/\bmemsa\b/gi,'mesma')
            .replace(/\banoite\b/gi,'à noite')
            .replace(/\bcervicogenica\b/gi,'cervicogênica')
            .replace(/\bhernia\b/gi,'hérnia')
            .replace(/\bhalux\b/gi,'hálux')
            .replace(/\bprotusão\b/gi,'protrusão')
            .replace(/\bperiodo\b/gi,'período')
            .replace(/((?:no dia|em)\s+\d{1,2}\s+de\s+[a-zçãáéíóú]+(?:\s+de\s+\d{4})?)\s+(?:a mesma|o mesmo|a paciente|o paciente)\s+relata\s+que\s+/gi,'$1, ')
            .replace(/([^\s.!?,;:])\s+(?=(?:(?:a|o)\s+(?:paciente|mesma|mesmo)|paciente)\s+(?:relata|refere)\b)/gi,(trecho,letra,indice,origem)=>/\b(?:nega|negou|não(?:\s+\w+){0,3})\s+que$/i.test(origem.slice(0,indice+1))?trecho:letra+'. ')
            .replace(/\b(?:a|o)\s+paciente\s+relata\b/gi,'Paciente relata')
            .replace(/\b(?:a mesma|o mesmo)\s+relata\s+que\s+(?:a mesma|o mesmo)\s+/gi,'Relata que ')
            .replace(/\ba cerca de\s+(?=\d)/gi,'há cerca de ')
            .replace(/\bsepsemia\b/gi,'septicemia')
            .replace(/\bperca de força\b/gi,'perda de força')
            .replace(/\bhipsilateral\b/gi,'ipsilateral')
            .replace(/\bdor a palpação\b/gi,'dor à palpação')
            .replace(/\bdéficiencia\b/gi,'deficiência')
            .replace(/\bescapula\b/gi,'escápula')
            .replace(/\bdormencia\b/gi,'dormência')
            .replace(/\bciatico\b/gi,'ciático')
            .replace(/\bformigamneto\b/gi,'formigamento')
            .replace(/\bdor na região da escápula\b/gi,'dor na região escapular')
            .replace(/\birradia para base inferior\b/gi,'irradia para sua porção inferior')
            .replace(/\bfraqueza de rotação externa,?\s*e abdução (?:de|do) ombro\b/gi,'redução da força na rotação externa e na abdução do ombro')
            .replace(/\bTambém refere dormência na região e dor à palpação,\s*região medial da escápula/gi,'Relata dormência local e dor à palpação na região medial da escápula')
            .replace(/(região medial da escápula),\s*apresenta\b/gi,'$1. Também relata')
            .replace(/,\s*(Também refere|Refere|Relata|Apresenta)\b/gi,'. $1')
            .replace(/\bpaciente relata também\b/gi,'Também refere')
            .replace(/\bpaciente relata\b/gi,'Refere')
            .replace(/\ba mesma relata também\b/gi,'Também refere')
            .replace(/\ba mesma relata\b/gi,'Relata')
            .replace(/\bo mesmo relata\b/gi,'Relata')
            .replace(/(^|[.!?]\s+)(?:o mesmo|a mesma)\s+(?=(?:refere|recebeu)\b)/gi,'$1')
            .replace(/\b(?:Refere|Relata) que fez ((?:mais de|cerca de)\s+)?(\d+|um|uma|dois|duas|três)\s+(dias?|semanas?|m[eê]s(?:es)?|anos?)\s+(?:a )?dor\b/gi,(_,aproximacao,quantidade,unidade)=>`Refere persistência da dor há ${aproximacao||''}${quantidade} ${unidade}`)
            .replace(/\ba dor acorda (?:a mesma|o mesmo)\b/gi,'a dor provoca despertar')
            .replace(/\bhoje apresenta\b/gi,'Atualmente apresenta')
            .replace(/\bassociad[oa] a (?:isto|isso) apresenta\b/gi,'O quadro associa-se a')
            .replace(/\bO quadro associa-se a (?=perda\b|fraqueza\b|dor\b|limitação\b)/gi,'O quadro associa-se à ')
            .replace(/\bme parece\b/gi,'foi levantada a possibilidade de');
        texto=texto.replace(/,\s*(Também refere|Refere|Relata)\b/gi,'. $1').replace(/(^|[.!?]\s+)([a-záéíóúâêôãõç])/g,(_,inicio,letra)=>inicio+letra.toUpperCase());
        return texto;
    }
    function paragrafosClinicos(texto,limite=500){
        const frases=texto.split(/(?<=[.!?])\s+(?=[A-ZÁÉÍÓÚÂÊÔÃÕÇ])/u),blocos=[];let bloco='';
        frases.forEach(frase=>{if(bloco&&bloco.length+frase.length>limite){blocos.push(bloco);bloco='';}bloco+=(bloco?' ':'')+frase;});if(bloco)blocos.push(bloco);return blocos;
    }
    function frasesDoRelato(value){
        // Divide somente em limites de frases; números, abreviações e a negação permanecem intactos.
        const texto=polirRelatoClinico(value);
        const frases=texto.split(/(?<=[.!?])\s+(?=[A-ZÁÉÍÓÚÂÊÔÃÕÇ])/u),vistos=new Set();
        return frases.filter(frase=>{const chave=normalizar(frase).replace(/[.!?]+$/,'').trim();if(!chave||vistos.has(chave))return false;vistos.add(chave);return true;});
    }
    function narrativaDoRelato(value){
        return extrairFatosDoRelato(value).fatos.map(f=>f.redacao).join(' ');
    }
    // Camada de significado documental. Não diagnostica, não consulta outras pessoas e não
    // transforma proximidade entre palavras em causalidade. Trechos não reconhecidos permanecem.
    const CONCEITOS_RELATO={dor:/\b(?:dor|dores)\b/,parestesia:/\b(?:dormencia|parestesia|formigamento|choques)\b/,fraqueza:/\b(?:fraqueza|perda de forca|reducao da forca)\b/,cefaleia:/\bcefaleia\b/,febre:/\bfebre\b/};
    const REGIOES_RELATO={cervical:/\b(?:cervical|pescoco)\b/,ombro:/\b(?:ombro|escapul\w*|glenoumeral)\b/,lombar:/\b(?:lombar|lombossacr\w*)\b/,toracica:/\btoracic\w*\b/,cotovelo:/\b(?:cotovelo|antebraco)\b/,punho_mao:/\b(?:punho|mao|dedos)\b/,quadril:/\b(?:quadril|virilha|pelve)\b/,joelho:/\bjoelho\b/,tornozelo_pe:/\b(?:tornozelo|pe|calcane\w*)\b/,cefaleia:/\b(?:cefaleia|cabeca)\b/};
    function atributosDoFato(texto){
        const t=normalizar(texto),conceitos=[];
        Object.entries(CONCEITOS_RELATO).forEach(([nome,re])=>{
            const m=re.exec(t);if(!m)return;
            const antes=t.slice(0,m.index),marcadores=Array.from(antes.matchAll(/\b(nao nega|nao sabe se|nega que|nega|negou|sem|nao apresenta|nao refere|nao relata|refere|relata|apresenta)\b/g));
            const ultimo=marcadores.at(-1)?.[1]||'';
            const incerto=/^(nao nega|nao sabe se|nega que)$/.test(ultimo)||ultimo==='sem'&&/\b(?:piora|melhora|aumento|reducao|mudanca)\b/.test(antes.slice((marcadores.at(-1)?.index||0)+ultimo.length));
            const negado=!incerto&&/^(nega|negou|sem|nao apresenta|nao refere|nao relata)/.test(ultimo);
            conceitos.push({nome,estado:incerto?'indeterminado':negado?'negado':'relatado'});
        });
        return {conceitos,regioes:Object.entries(REGIOES_RELATO).filter(([,re])=>re.test(t)).map(([id])=>id),
            lados:valoresUnicos(t.match(/\b(?:esquerdo|esquerda|direito|direita|bilateral|ipsilateral|contralateral)\b/g)||[]).map(l=>/^esquerd/.test(l)?'esquerdo':/^direit/.test(l)?'direito':l),
            temporalidade:/\b(?:previamente|antigamente|no passado|antecedente|historico de|ja teve|tinha)\b/.test(t)?'anterior':'nao_especificada',
            incerteza:/\b(?:possivel|suspeita|talvez|parece|hipotese)\b/.test(t),
            quantificadores:texto.match(/\d+(?:[.,]\d+)?(?:\s*\/\s*\d+)?(?:\s*(?:mg|mcg|ml|cm|mm|kg|dias?|semanas?|meses?|anos?|horas?|minutos?))?/gi)||[]};
    }
    function categoriaDoRelato(texto){
        const t=normalizar(texto);
        if(/\b(?:apos isso|desde entao|nesse periodo|por isso|essa dor|o mesmo sintoma)\b/.test(t))return 'continuidade';
        if(/\b(?:indicacao cirurgica|indicacao de cirurgia)\b/.test(t))return 'indicacoes_relatadas';
        if(/\bdiagnostico\b/.test(t))return 'diagnosticos_relatados';
        if(/\b(?:exame laboratorial|gama|resultado.*positivo para|houve positivo para)\b/.test(t))return 'informacoes_complementares';
        if(/\b(?:queimadura|pneumonia|septicemia|apendicectomia|cesariana|cirurgia previa|medicamento|medicacao)\b/.test(t)&&!/^.*\bdor\b.*\b(?:apos|desde)\b/.test(t))return 'antecedentes';
        if(/\b(?:dormir|sono|despert\w*|acorda|noite|noturn\w*)\b/.test(t))return 'repercussoes';
        if(/\b(?:telefone|celular|trabalh\w*|atividade profissional|rotina)\b/.test(t)&&!CONCEITOS_RELATO.dor.test(t))return 'rotina';
        if(/\b(?:dormencia|parestesia|formigamento|choques|cefaleia|fraqueza)\b/.test(t)&&!CONCEITOS_RELATO.dor.test(t))return 'associados';
        return 'queixa';
    }
    function realizarFatoDoRelato(texto){
        let t=fraseClinica(texto);
        t=t.replace(/^(?:Refere|Relata) que está apresentando diagnóstico de (.+)\.$/i,'Segundo o relato, há diagnóstico de $1.');
        t=t.replace(/^(?:(?:Refere|Relata) que )?recebeu indicação de cirurgia (.+)\.$/i,'Informa indicação cirúrgica $1.');
        t=t.replace(/^(?:Refere|Relata)(?: que)? (?:sente|tem|apresenta) (dor(?:es)?|choques) (.+)\.$/i,(_,sintoma,local)=>`Relata ${/^dores$/i.test(sintoma)?'dor':sintoma.toLowerCase()} ${local}.`);
        t=t.replace(/^(?:Refere|Relata) (dor(?:es)?) (.+)\.$/i,(_,sintoma,local)=>`Relata dor ${local}.`);
        t=t.replace(/^(?:Também (?:refere|relata)|Refere|Relata)(?: que)? (?:a )?dor ((?:aumenta|piora|melhora|irradia|iniciou|inicia|começou|acorda|provoca)\b.+)\.$/i,(_,frase)=>fraseClinica('A dor '+frase));
        t=t.replace(/^(?:Refere|Relata)(?: que)? não houve trauma\.$/i,'Nega ocorrência de trauma.');
        t=t.replace(/^(?:Refere|Relata)(?: que)? já passou por (.+)\.$/i,'Informa ter passado por $1.');
        t=t.replace(/^(?:Refere|Relata)(?: que)? investiga (.+)\.$/i,'Informa investigação de $1.');
        t=t.replace(/^(?:Refere|Relata) que (a mãe|o pai|a irmã|o irmão) tem (.+)\.$/i,'Antecedente familiar referido: $1 com $2.');
        t=t.replace(/^(?:Refere|Relata) que mesmo tomando (.+), não consegue dormir bem\.$/i,'Informa dificuldade para dormir, mesmo com o uso relatado de $1.');
        t=t.replace(/\bdor na região do cotovelo bilateralmente\b/i,'dor em ambos os cotovelos');
        t=t.replace(/\b(?:dor|choques) na região do (ombro|hálux|dedo mínimo)\b/i,(x,local)=>x.replace('na região do '+local,'no '+local));
        t=t.replace(/^(?:Refere|Relata) que era tabagista e etilista porém parou (.+)\.$/i,'Informa histórico de tabagismo e etilismo, com interrupção de ambos $1.');
        // Modelos de oração, com slots copiados do registro, não escolha de sinônimos aleatória.
        t=t.replace(/^(?:Refere|Relata) que no dia (\d{1,2} de [\p{L}]+(?: de \d{4})?),?\s+(?:que\s+)?(?:sentiu|apresentou) (.+)\.$/iu,'Relata início dos sintomas em $1, com $2.');
        t=t.replace(/^(?:Refere|Relata) que a dor não passou\.$/i,'Refere persistência da dor.');
        t=t.replace(/^(?:Refere|Relata) que a dor irradiou para (.+)\.$/i,'A dor apresentou irradiação para $1.');
        t=t.replace(/^(?:Relata|Também refere) (?:também )?que (?:a mesma |o mesmo )?apresenta (.+)\.$/i,'Refere $1.');
        t=t.replace(/^(?:Refere|Relata) que usa muito (?:o )?(telefone|celular)\.$/i,'Relata uso frequente do $1.');
        t=t.replace(/^(?:Refere|Relata) que usa (.+)\.$/i,'Informa uso de $1.').replace(/^Informa uso de a /,'Informa uso da ').replace(/^Informa uso de o /,'Informa uso do ');
        t=t.replace(/^(?:Refere|Relata) que sofreu (.+)\.$/i,'Relata antecedente de $1.');
        t=t.replace(/^(?:(?:Refere|Relata) que )?a dor provoca despertar à noite\.$/i,'A dor provoca despertares noturnos.');
        t=t.replace(/^(?:Também refere|Refere|Relata)(?: que)? (?:o pior período de dor é|a dor piora) (ao dormir|à noite)\.$/i,'A dor piora $1.');
        if(/^(?:dor\b|queimação\b|fraqueza\b|parestesia\b|edema\b|rigidez\b|perda\b|limitação\b)/i.test(t))t='Refere '+minusculaInicial(t);
        return t;
    }
    // Leitura documental de testes escritos: organiza o que foi explicitamente
    // descrito, sem alimentar critérios, alterar a região escolhida ou diagnosticar.
    function documentarExameLivreNoLaudo(registro){
        const original=String(registro.texto||'');
        const inicioTeste='(?:SLR\\b|Slump\\b|Spurling\\b|Patrick\\b|FABER(?:E)?\\b|rota[çc][ãa]o interna\\b)';
        const separador=new RegExp('[;\\n]+|,\\s*(?='+inicioTeste+')|\\.(?=\\s+(?:'+inicioTeste+'))','gi');
        const partes=[];let inicio=0;
        for(const m of original.matchAll(separador)){partes.push({inicio,fim:m.index});inicio=m.index+m[0].length;}
        partes.push({inicio,fim:original.length});
        const nomes={cervical:'Coluna cervical',lombar:'Coluna lombar / lombossacra',quadril:'Quadril / região inguinal',ombro:'Ombro',tornozelo_pe:'Tornozelo e pé',joelho:'Joelho'};
        const trechos=partes.map(parte=>{
            const textoOriginal=original.slice(parte.inicio,parte.fim).trim();if(!textoOriginal)return null;
            const n=normalizar(textoOriginal),explicitos=[];
            if(/\b(?:cervical|pescoco)\b/.test(n))explicitos.push('cervical');
            if(/\b(?:lombar|lombossacr\w*)\b/.test(n))explicitos.push('lombar');
            if(/\b(?:quadril|quadris|coxofemoral|inguinal|virilha)\b/.test(n))explicitos.push('quadril');
            if(/\b(?:ombro|glenoumeral)\b/.test(n))explicitos.push('ombro');
            if(/\b(?:tornozelo|calcanhar|calcaneo)\b/.test(n))explicitos.push('tornozelo_pe');
            if(/\bjoelho\b/.test(n))explicitos.push('joelho');
            const peloTeste=/^(?:teste (?:de |do )?)?(?:SLR|Slump)\b/i.test(textoOriginal)?'lombar':/^(?:teste (?:de |do )?)?Spurling\b/i.test(textoOriginal)?'cervical':/^(?:teste (?:de |do )?)?(?:Patrick|FABER(?:E)?)\b/i.test(textoOriginal)?'quadril':'';
            const localUnico=valoresUnicos(explicitos).length===1?explicitos[0]:'';
            // O destino da dor provocada por Spurling não muda o território do teste.
            const regiaoId=registro.regiaoId||peloTeste||localUnico;
            const origemLocalizacao=registro.regiaoId?'registro':peloTeste?'nome_do_teste':localUnico?'local_expresso':'nao_definida';
            const lados=valoresUnicos((n.match(/\b(?:direit[oa]|esquerd[oa]|bilateral)\b/g)||[]).map(l=>/^direit/.test(l)?'direito':/^esquerd/.test(l)?'esquerdo':l));
            const lado=lados.length===1?lados[0]:registro.lado||'';
            const localizacaoDivergente=!!(registro.regiaoId&&peloTeste&&registro.regiaoId!==peloTeste);
            const regiaoBase=(registro.regiaoId?(registro.regiao||nomes[regiaoId]||regiaoId):nomes[regiaoId]||'Achados sem localização definida')+(localizacaoDivergente?' — localização do teste a conferir':'');
            const regiao=regiaoBase+(registro.lado&&lados.length===0?` — ${({direito:'lado direito',esquerdo:'lado esquerdo',bilateral:'bilateral'})[registro.lado]||registro.lado}`:'');
            const texto=fraseClinica(textoOriginal.replace(/\ba (esquerda|direita)\b/gi,'à $1').replace(/\brotação interna associado a flexão\b/gi,'Rotação interna associada à flexão'));
            const realizado=!/\b(?:nao (?:foi )?(?:realizad[oa]|testad[oa]|executad[oa])|nao se realizou|a realizar|a testar|teste pendente|apenas planejado)\b/.test(n);
            return {...parte,textoOriginal,texto,regiaoId,regiao,lado,origemLocalizacao,realizado,localizacaoDivergente};
        }).filter(Boolean);
        const grupos=new Map();trechos.forEach(t=>{if(!grupos.has(t.regiao))grupos.set(t.regiao,[]);grupos.get(t.regiao).push(t.texto);});
        const linhas=Array.from(grupos,([regiao,itens])=>`${regiao}:\n${itens.map(t=>'• '+t).join('\n')}`);
        if(['positivo','negativo','inconclusivo'].includes(registro.resultado))linhas.push(`Classificação informada para o registro: ${registro.resultado}.`);
        if(registro.referencia?.nome)linhas.push(`Vínculo informado pelo profissional: ${nomeClinico(registro.referencia.nome)}.`);
        if(registro.situacao?.mensagem?.includes('lados diferentes'))linhas.push('Os achados de lados distintos foram mantidos separados na interpretação.');
        // Estado de edição, fingerprint e catálogo ficam nos avisos/auditoria,
        // não são exportados como jargão técnico no documento do paciente.
        return {texto:linhas.join('\n\n'),trechos};
    }
    function comporDocumentoSemantico(plano){
        const grupos=[
            ['História clínica',['queixa','associados','repercussoes','diagnosticos_relatados','indicacoes_relatadas','caracterizacao','continuidade']],
            ['Antecedentes e contexto',['antecedentes','cirurgias','medicamentos','trabalho','atividade','rotina','informacoes_complementares','complemento']],
            ['Exames de imagem',['imagem']],
            ['Exame físico-funcional e correlação clínica',['exame_livre','exame','sintese','limite']],
            ['Capacidade funcional',['funcional']],
            ['Plano registrado',['plano']],
            ['Segurança e cuidados',['seguranca']]
        ];
        const usados=new Set(),secoes=[];
        const identificacao=plano.blocos.filter(b=>b.tipo==='identificacao');
        if(identificacao.length)secoes.push(identificacao.map(b=>b.texto).join('\n\n'));
        grupos.forEach(([titulo,tipos])=>{const blocos=plano.blocos.filter(b=>tipos.includes(b.tipo));if(!blocos.length)return;blocos.forEach(b=>usados.add(b));secoes.push(titulo+'\n\n'+blocos.map(b=>b.texto).join('\n\n'));});
        // Um tipo novo nunca desaparece porque ainda não recebeu uma seção.
        const outros=plano.blocos.filter(b=>b.tipo!=='identificacao'&&!usados.has(b));
        if(outros.length)secoes.push('Informações adicionais\n\n'+outros.map(b=>b.texto).join('\n\n'));
        return secoes;
    }
    function extrairFatosDoRelato(value){
        if(window.KineSysSemanticGraph){
            const relato=window.KineSysSemanticGraph.analisar(value,{realizar:t=>{
                const base=realizarFatoDoRelato(polirRelatoClinico(t));
                return window.KineSysDocumentAnalyzer?.analisarFrase(t,base).texto||base;
            }});
            relato.fatos.forEach(f=>{const original=f.origens[0].trecho;f.analiseDocumental=window.KineSysDocumentAnalyzer?.analisarFrase(original,realizarFatoDoRelato(polirRelatoClinico(original)))||null;});
            return relato;
        }
        const origem=String(value||''),frases=polirRelatoClinico(origem).split(/(?<=[.!?])\s+(?=[A-ZÁÉÍÓÚÂÊÔÃÕÇ])/u),fatos=[],relacoes=[],vistos=new Map();
        frases.filter(Boolean).forEach((trecho,indice)=>{
            const redacao=realizarFatoDoRelato(trecho),atributos=atributosDoFato(redacao);
            const chave=normalizar(redacao).replace(/^(?:refere|relata)(?: que)?\s+/,'').replace(/[.!?]+$/,'');
            const origemTrecho={campo:'paciente_hma',indice,trechoNormalizado:trecho};
            if(vistos.has(chave)){const anterior=vistos.get(chave);anterior.origens.push(origemTrecho);relacoes.push({tipo:'duplicado',origem:origemTrecho,para:anterior.id});return;}
            const fato={id:`hma:${indice}`,tipo:'relato',categoria:categoriaDoRelato(redacao),redacao,atributos,origens:[origemTrecho]};
            vistos.set(chave,fato);fatos.push(fato);
        });
        // A ordem é preservada quando há referência anafórica/temporal não resolvida com segurança.
        const manterOrdem=fatos.some(f=>f.categoria==='continuidade');
        fatos.forEach((a,i)=>fatos.slice(i+1).forEach(b=>{
            const ladosCompativeis=JSON.stringify(a.atributos.lados)===JSON.stringify(b.atributos.lados);
            const regioesCompativeis=JSON.stringify(a.atributos.regioes)===JSON.stringify(b.atributos.regioes);
            if(!ladosCompativeis||!regioesCompativeis||a.atributos.temporalidade!==b.atributos.temporalidade)return;
            const conflito=a.atributos.conceitos.some(c=>b.atributos.conceitos.some(o=>c.nome===o.nome&&new Set([c.estado,o.estado]).has('negado')&&new Set([c.estado,o.estado]).has('relatado')));
            if(conflito&&!a.atributos.incerteza&&!b.atributos.incerteza)relacoes.push({tipo:'possivel_contradicao',de:a.id,para:b.id});
        }));
        return {origem,fatos,relacoes,manterOrdem};
    }
    function planejarRelato(relato){
        if(window.KineSysSemanticGraph&&relato.proposicoes)return window.KineSysSemanticGraph.planejar(relato);
        const ordem=['queixa','associados','repercussoes','diagnosticos_relatados','indicacoes_relatadas','antecedentes','informacoes_complementares','rotina','continuidade'];
        const grupos=new Map();relato.fatos.forEach(f=>{const chave=relato.manterOrdem?'queixa':f.categoria;if(!grupos.has(chave))grupos.set(chave,[]);grupos.get(chave).push(f);});
        return ordem.filter(c=>grupos.has(c)).flatMap(c=>{
            const fatos=grupos.get(c),omitidos=new Set(),realizacoes=new Map();
            // Só condensar relações semanticamente equivalentes e sem negação/hipótese.
            if(!relato.manterOrdem){
                const dores=fatos.filter(f=>/^Relata dor .+\.$/.test(f.redacao)&&!f.atributos.incerteza&&!/\b(?:e|mas|com|porém|após|quando|há|desde|durante)\b|,/i.test(f.redacao.slice(11,-1)));
                if(dores.length>1){
                    const frase='Relata dor '+unirNatural(dores.map(f=>f.redacao.slice('Relata dor '.length,-1)))+'.';
                    realizacoes.set(dores[0].id,frase);
                    dores.forEach((f,i)=>{f.realizacoes=[frase];if(i)omitidos.add(f.id);});
                    dores.slice(1).forEach(f=>relato.relacoes.push({tipo:'queixas_agrupadas',de:f.id,para:dores[0].id}));
                }
                const generico=fatos.find(f=>f.redacao==='Refere persistência da dor.');
                const detalhado=fatos.find(f=>/^Refere persistência da dor há .+\.$/.test(f.redacao));
                if(generico&&detalhado){omitidos.add(generico.id);generico.realizacoes=[detalhado.redacao];relato.relacoes.push({tipo:'detalhado_por',de:generico.id,para:detalhado.id});}
                const sono=fatos.find(f=>f.redacao==='A dor piora ao dormir.'),despertar=fatos.find(f=>f.redacao==='A dor provoca despertares noturnos.');
                if(sono&&despertar){
                    const frase='A dor piora ao dormir e provoca despertares noturnos.';
                    const primeiro=fatos.indexOf(sono)<fatos.indexOf(despertar)?sono:despertar,segundo=primeiro===sono?despertar:sono;
                    realizacoes.set(primeiro.id,frase);omitidos.add(segundo.id);sono.realizacoes=despertar.realizacoes=[frase];
                    relato.relacoes.push({tipo:'mesmo_comportamento_dos_sintomas',de:sono.id,para:despertar.id});
                }
            }
            const partes=[];let parte={tipo:c,fatos:[],texto:''};
            fatos.filter(f=>!omitidos.has(f.id)).forEach(f=>{
                const texto=realizacoes.get(f.id)||f.redacao;
                if(parte.texto&&parte.texto.length+texto.length>550){partes.push(parte);parte={tipo:c,fatos:[],texto:''};}
                parte.texto+=(parte.texto?' ':'')+texto;
                parte.fatos.push(...fatos.filter(o=>o.id===f.id||o.realizacoes?.includes(texto)).map(o=>o.id));
            });
            if(parte.texto)partes.push(parte);return partes;
        });
    }
    function construirPlanoNarrativo(d){
        const analiseEntrada=window.KineSysDocumentAnalyzer?.analisarAvaliacao(d)||null;
        const relato=extrairFatosDoRelato(analiseEntrada?.hma||primeiroCampo(d,['paciente_hma','hma']));
        const fatos=[...relato.fatos],blocos=[];
        const adicionar=(tipo,texto,origens=[])=>{
            if(!texto)return;const id=`documento:${fatos.length}`;
            fatos.push({id,tipo,categoria:tipo,redacao:texto,origens});blocos.push({tipo,fatos:[id],texto});return id;
        };
        const paragrafos=planejarRelato(relato),relacoes=[...relato.relacoes];
        adicionar('identificacao',secaoIdentificacao(d,relato),[{campo:'paciente_nome'},{campo:'paciente_idade'},{campo:'paciente_ocupacao'},{campo:'avaliacao_realizado_em'},{campo:'paciente_hma',tratamento:'motivo_documental'}]);
        paragrafos.forEach(p=>blocos.push(p));
        // Composição estruturada existente, mas sem copiar a HMA novamente.
        const semRelato={...d,relatoParaDedupe:relato.origem,campos:{...d.campos,paciente_hma:'',hma:''}};
        const grupoContexto=t=>/procedimento|cirúrg|cirurg|trauma|órtese|apoio de carga/i.test(t)?'cirurgias':/medicamento|infiltraç/i.test(t)?'medicamentos':/imagem/i.test(t)?'imagem':/atividade profissional|rotina de trabalho|ocupacional|exposição de/i.test(t)?'trabalho':/pratica |atividade física|prática envolve|carga recente/i.test(t)?'atividade':'antecedentes';
        const contexto=new Map();
        const origensContexto=tipo=>({cirurgias:[{campo:'tags_cirurgias'},{campo:'restricoesPosOperatorias'}],medicamentos:[{campo:'tags_medicamentos'},{campo:'gruposAnamnese.comorbidades'}],imagem:[{campo:'exames_imagem_descricao'},{campo:'exames_imagem_fonte'}],trabalho:[{campo:'gruposAnamnese.exposicoesOcupacionais'}],atividade:[{campo:'paciente_esporte'},{campo:'esporte_frequencia/esporte_duracao/esporte_nivel/esporte_mudanca_carga'},{campo:'gruposAnamnese.exposicoesEsportivas'}],antecedentes:[{campo:'gruposAnamnese.comorbidades'},{campo:'gruposAnamnese.fatoresPsicossociais'},{campo:'eva_slider'},{campo:'gruposAnamnese.fatoresPiora'},{campo:'yellow_flags_observacao'},{campo:'origem_informacao_clinica'}]})[tipo]||[];
        const registrarContexto=(tipo,texto,origens=[])=>{if(!contexto.has(tipo))contexto.set(tipo,[]);contexto.get(tipo).push({texto,origens});};
        secaoHistoria(semRelato).split(/(?<=[.!?])\s+(?=[A-ZÁÉÍÓÚÂÊÔÃÕÇ])/u).filter(Boolean).forEach(t=>{const tipo=grupoContexto(t);registrarContexto(tipo,t,origensContexto(tipo));});
        fatosComplementaresDoContexto(d).itens.forEach(item=>{
            const tipo=/^contexto_medicamento/.test(item.id)?'medicamentos':/^contexto_(?:cirurgia|trauma)/.test(item.id)?'cirurgias':grupoContexto(item.texto);
            registrarContexto(tipo,item.texto,[{campo:item.id.startsWith('negativa_')?'contextoAnamnese.estados.'+item.id.slice(9):item.id}]);
        });
        contexto.forEach((itens,tipo)=>{
            const incluir=[];
            itens.forEach(item=>{
                const id=`documento:${fatos.length}`,anterior=fatos.find(f=>['relato','contexto'].includes(f.tipo)&&normalizar(f.redacao).trim()===normalizar(item.texto).trim());
                const fato={id,tipo:'contexto',categoria:tipo,redacao:item.texto,origens:item.origens};
                if(anterior){fato.realizacoes=anterior.realizacoes?.slice()||[anterior.redacao];relacoes.push({tipo:'mesmo_conteudo_documentado',de:id,para:anterior.id});}
                else incluir.push({id,texto:item.texto});
                fatos.push(fato);
            });
            if(incluir.length)blocos.push({tipo,fatos:incluir.map(i=>i.id),texto:incluir.map(i=>i.texto).join(' ')});
        });
        const caracterizacao=[['paciente_tipo_dor','A qualidade da dor foi registrada como '],['paciente_origem_irradiacao','A origem da irradiação foi registrada em '],['paciente_irradiacao','O trajeto de irradiação foi registrado como ']];
        caracterizacao.forEach(([id,prefixo])=>{const v=valorCampo(d,id);if(v&&!normalizar(relato.origem).includes(normalizar(v)))adicionar('caracterizacao',fraseClinica(prefixo+v),[{campo:id}]);});
        const camposConhecidos=new Set(['paciente_nome','paciente_idade','paciente_sexo','paciente_nascimento','paciente_ocupacao','paciente_hma','hma','paciente_mecanismo_lesao','paciente_esporte','esporte_frequencia','esporte_duracao','esporte_nivel','esporte_mudanca_carga','eva_slider','exames_imagem_descricao','exames_imagem_fonte','yellow_flags_observacao','origem_informacao_clinica','avaliacao_realizado_em',...caracterizacao.map(x=>x[0]),...CAMPOS_CONTEXTO_LAUDO]);
        const fontes=Object.entries(d.campos||{}).map(([campo,valor])=>({campo,valor,tratamento:/^paciente_(cpf|telefone)$/.test(campo)?'identificacao_reservada':camposConhecidos.has(campo)?'regra_documental':'pendente'}));
        fontes.filter(f=>f.tratamento==='pendente').forEach(f=>adicionar('complemento',fraseClinica(`${d.rotulosCampos?.[f.campo]||f.campo.replace(/_/g,' ')}: ${f.valor}`),[{campo:f.campo}]));
        Object.entries(d.gruposAnamnese||{}).forEach(([grupo,itens])=>{if(itens.length)fontes.push({campo:'gruposAnamnese.'+grupo,valor:itens,tratamento:'regra_documental'});});
        ['cirurgias','medicamentos'].forEach(tipo=>{const itens=d.complementos[tipo+'Itens']||[];if(itens.length)fontes.push({campo:'tags_'+tipo,valor:itens,tratamento:'regra_documental'});});
        Object.entries(d.contextoAnamnese?.estados||{}).forEach(([grupo,valor])=>fontes.push({campo:'contextoAnamnese.estados.'+grupo,valor,tratamento:'estado_documental'}));
        Object.entries(d.contextoAnamnese?.campos||{}).filter(([id,v])=>v&&!d.campos[id]).forEach(([campo,valor])=>fontes.push({campo,valor,tratamento:'conferir_integracao'}));
        d.achados.forEach(e=>(e.achados||[]).forEach((a,indice)=>{
            if(!RESULTADO_LAUDO[a.resultado])return;
            const id=`exame:${fatos.length}`;
            fatos.push({id,tipo:'exame',categoria:'exame',teste:a.texto,resultado:a.resultado,regiao:e.regiao,regiaoId:e.regiaoId,eixoId:e.id||'',origens:[{campo:'mapeamento',eixoId:e.id||'',indice}],redacao:fraseDoResultadoRegistrado(a.texto,a.resultado),equivalentes:[a.texto,descricaoDocumentalDoAchado(a.texto)]});
            relato.fatos.filter(f=>f.atributos.regioes.includes(e.regiaoId)).forEach(f=>relacoes.push({tipo:'mesma_regiao_documentada',de:f.id,para:id}));
        }));
        (d.exameLivre||[]).filter(r=>String(r.texto||'').trim()).forEach(r=>{
            const documental=documentarExameLivreNoLaudo(r);
            const id=adicionar('exame_livre',documental.texto,[{campo:'clinicaEstruturada.exameLivre',registroId:r.id}]);
            const fato=fatos.find(f=>f.id===id);if(fato){fato.regiaoId=r.regiaoId||'';fato.resultado=r.resultado||'descritivo';fato.textoOriginal=r.texto;fato.lado=r.lado||'';fato.trechosDocumentais=documental.trechos;fato.situacao=clone(r.situacao||{});}
            relato.fatos.filter(f=>documental.trechos.some(t=>t.realizado&&!t.localizacaoDivergente&&t.regiaoId&&f.atributos.regioes.includes(t.regiaoId))).forEach(f=>relacoes.push({tipo:'mesma_regiao_documentada',de:f.id,para:id}));
        });
        const correlacoes=construirCorrelacoes(d),conflitos=conflitosDoExame(d),historiaDivergente=relacoes.some(r=>r.tipo==='possivel_contradicao');
        if((d.exameLivre||[]).some(r=>['rascunho','revisar','divergente'].includes(r.situacao?.tipo)))adicionar('limite','A correlação clínica dos achados em texto livre está pendente de revisão profissional.',[{campo:'clinicaEstruturada.exameLivre',tratamento:'revisao_pendente'}]);
        const regioes=valoresUnicos(d.achados.filter(e=>(e.achados||[]).some(a=>RESULTADO_LAUDO[a.resultado])).map(e=>e.regiao));
        regioes.forEach(regiao=>{
            const ids=fatos.filter(f=>f.tipo==='exame'&&f.regiao===regiao).map(f=>f.id);
            const texto=secaoExame(d,regiao,true);if(texto)blocos.push({tipo:'exame',fatos:ids,texto});
            if(!conflitos.length&&!historiaDivergente){
                correlacoes.filter(c=>c.regiao===regiao).forEach(c=>{
                    const fontes=c.resultados.map(r=>({eixoId:r.eixoId,indice:r.indice,teste:r.teste,resultado:r.resultado}));
                    const id=adicionar('sintese',secaoCorrelacao(d,regiao,c.hipoteseId),fontes.length?fontes:[{campo:'planoClinico.hipoteses'}]);
                    fatos.filter(f=>f.tipo==='exame'&&f.regiao===regiao&&fontes.some(r=>r.eixoId===f.eixoId&&normalizar(r.teste)===normalizar(f.teste)&&r.resultado===f.resultado)).forEach(f=>relacoes.push({tipo:'fundamenta_sintese_documental',de:f.id,para:id,hipoteseId:c.hipoteseId}));
                });
            }
            adicionar('limite',secaoAmbiguidadesDoExame(d,regiao),[{campo:'mapeamento',regiao}]);
        });
        if(conflitos.length)adicionar('limite',secaoCorrelacao(d),[{campo:'mapeamento'}]);
        if(historiaDivergente)adicionar('limite','Há informações potencialmente divergentes no relato. A síntese entre história e exame depende do esclarecimento desses registros.',[{campo:'paciente_hma'}]);
        adicionar('limite',secaoLimitesExame(d),[{campo:'regioesSelecionadas'}]);
        const nomesDocumentais={cervical:'coluna cervical',ombro:'ombro',toracica:'coluna torácica',lombar:'coluna lombar',cotovelo:'cotovelo',punho_mao:'punho e mão',quadril:'quadril',joelho:'joelho',perna:'perna',tornozelo_pe:'tornozelo e pé',cefaleia:'cabeça / cefaleia'};
        const nomeDocumental=id=>(typeof BANCO_MAPEAMENTO_CLINICO!=='undefined'?BANCO_MAPEAMENTO_CLINICO[id]?.nome:'')||nomesDocumentais[id]||'localização a esclarecer';
        const coberturaProblemas=(relato.problemas||[]).map(p=>({...p,regiao:nomeDocumental(p.regiaoId),
            possuiExameRegistrado:d.achados.some(a=>a.regiaoId===p.regiaoId&&(a.achados||[]).some(x=>RESULTADO_LAUDO[x.resultado]))||(d.exameLivre||[]).some(r=>documentarExameLivreNoLaudo(r).trechos.some(t=>t.realizado&&!t.localizacaoDivergente&&t.regiaoId===p.regiaoId)),
            hipoteses:correlacoes.filter(c=>c.regiaoId===p.regiaoId).map(c=>c.hipoteseId).filter(Boolean)}));
        // Queixa na HMA não desaparece porque a região não foi selecionada.
        // Apenas documenta a lacuna; não altera seleção manual nem cria diagnóstico.
        const lacunas=valoresUnicos(coberturaProblemas.filter(p=>!p.possuiExameRegistrado&&!(d.regioesSelecionadas||[]).some(r=>r.id===p.regiaoId)).map(p=>p.regiao));
        if(lacunas.length)adicionar('limite',fraseClinica(`As queixas relatadas em ${unirNatural(lacunas)} ainda não dispõem de resultados de exame registrados nesta avaliação; não é possível estabelecer sua hipótese clínica com os dados disponíveis`),[{campo:'paciente_hma'},{campo:'mapeamento'}]);
        adicionar('funcional',secaoFuncional(d),[{campo:'medidasObjetivas/psfs/outcomes'}]);
        adicionar('plano',secaoPlanoRegistrado(d),[{campo:'objetivosPlano'}]);
        adicionar('seguranca',secaoSeguranca(d),[{campo:'sintese.segurancaGlobal'}]);
        const plano={versao:4,fontes,fatos,relacoes,blocos,proposicoes:relato.proposicoes||[],problemas:relato.problemas||[],coberturaProblemas,raciocinio:d.plano?.raciocinio||null,pendenciasInterpretacao:relato.pendencias||[],correlacoes:correlacoes.map(c=>({...c,criterioAtendido:estadoDoCriterio(c)})),origemHMA:relato.origem};
        plano.analiseDocumental=window.KineSysDocumentAnalyzer?.analisarDocumento(plano,analiseEntrada)||null;
        return plano;
    }
    function validarPlanoSemantico(plano,texto){
        const corpo=String(texto||'').replace(/\n\nData de emissão:[^\n]*\n\n_{10,}\n[^\n]*\n[^\n]*$/,''),n=normalizar(corpo),ausentes=[],cobertura=[];
        plano.fatos.forEach(f=>{
            const presente=[f.redacao,...(f.realizacoes||[]),...(f.equivalentes||[])].some(esperado=>!!esperado&&n.includes(normalizar(esperado)));
            cobertura.push({fatoId:f.id,estado:presente?'incorporado':'pendente',origens:f.origens});
            if(!presente)ausentes.push(f.id);
        });
        const contradicoes=plano.relacoes.filter(r=>r.tipo==='possivel_contradicao');
        const palavras=/\b(?:A Refere|A memsa|Mesma Refere)\b|\[object Object\]|\bundefined\b/i.test(texto)?['Há construção textual inválida.']:[];
        const repeticoes=(texto.match(/\b(?:Refere|Relata)\b/g)||[]).length;
        if(repeticoes>6)palavras.push('Revise a repetição de verbos de relato.');
        if(plano.analiseDocumental?.trechosParaRevisar.length)palavras.push('Há trechos que exigem revisão documental; a redação de origem foi preservada sem completar o sentido.');
        if(plano.analiseDocumental?.fatosSemRoteiro.length)palavras.push('Há fatos sem posição no roteiro documental; confira sua integração antes de finalizar.');
        if(/\bcom para\b|\bao dor\b/i.test(plano.origemHMA))palavras.push('Há um trecho incompleto na HMA; esclareça seu significado antes de finalizar.');
        if(/\bTPG\b/i.test(plano.origemHMA))palavras.push('Confira a sigla laboratorial TPG e o resultado original; o motor não a substituiu por outra sigla.');
        const numeros=t=>t.match(/(?<![\p{L}\p{N}])-?\d+(?:[.,]\d+)?(?:\s*\/\s*\d+)?/gu)||[];
        const permitidos=new Set(plano.fatos.flatMap(f=>numeros(f.redacao)));
        const numerosSemOrigem=valoresUnicos(numeros(corpo).filter(x=>!permitidos.has(x)));
        if(numerosSemOrigem.length)palavras.push('Quantificadores sem origem registrada: '+unirNatural(numerosSemOrigem));
        // Qualidade é independente da cobertura: texto completo pode continuar mal redigido.
        const significado=window.KineSysSemanticGraph&&plano.proposicoes?.length?window.KineSysSemanticGraph.validar({origem:plano.origemHMA,proposicoes:plano.proposicoes,pendencias:plano.pendenciasInterpretacao||[]},corpo,plano.fatos.filter(f=>f.tipo!=='relato').map(f=>f.redacao)):null;
        const problemasSemExame=(plano.coberturaProblemas||[]).filter(p=>!p.possuiExameRegistrado);
        const correlacoesDivergentes=(plano.correlacoes||[]).filter(c=>c.resultados.length&&['menos_compativel','localizacao_pendente','lateralidade_pendente','cronologia_pendente','dados_divergentes'].includes(c.evidenciasCompartilhadas?.estado));
        const indicadores=window.KineSysDocumentAnalyzer?.avaliarQualidade(plano,corpo)||null;
        const esclarecimentos=plano.analiseDocumental?.perguntas||[];
        return {ok:!ausentes.length&&!contradicoes.length&&!palavras.length&&!problemasSemExame.length&&!correlacoesDivergentes.length&&!plano.pendenciasInterpretacao?.length&&!esclarecimentos.length&&(!significado||significado.ok),cobertura,ausentes,contradicoes,qualidade:palavras,numerosSemOrigem,significado,problemasSemExame,correlacoesDivergentes,indicadores,esclarecimentos};
    }
    window.analisarSemanticaAvaliacaoKineSys=function(){const d=dadosAtuais(),p=construirPlanoNarrativo(d);return clone({...p,validacao:validarPlanoSemantico(p,comporDocumentoSemantico(p).join('\n\n'))});};
    window.validarTextoSemanticoAvaliacaoKineSys=function(texto){return clone(validarPlanoSemantico(construirPlanoNarrativo(dadosAtuais()),String(texto||'')));};
    function descricaoDocumentalDoAchado(value){
        // Tradução do rótulo, não inferência: alternativas permanecem alternativas.
        return limparTextoClinico(value)
            .replace(/fraqueza de rotação externa e\/ou abdução não explicada apenas por dor/gi,'fraqueza na rotação externa, na abdução ou em ambos os movimentos, não explicada apenas pela dor')
            .replace(/fraqueza de rotação externa ou abdução/gi,'fraqueza na rotação externa ou na abdução')
            .replace(/atrofia (?:de )?supra\/infraespinal/gi,'atrofia do supraespinhal ou do infraespinhal')
            .replace(/atrofia supra ou infraespinal/gi,'atrofia do supraespinhal ou do infraespinhal')
            .replace(/posterior\/superior/gi,'posterior ou superior')
            .replace(/tração\/compressão/gi,'tração ou compressão')
            .replace(/\be\/ou\b/gi,'ou')
            .replace(/([A-Za-zÀ-ÿ]{3,})\s*\/\s*([A-Za-zÀ-ÿ]{3,})/g,(original,a,b)=>
                /^(?:mmhg|mg|mcg|mmol|cm|mm|km|ml)$/i.test(a)||/^(?:kg|ml|min)$/i.test(b)?original:`${a} ou ${b}`);
    }
    function regiaoEmFrase(value){
        const regiao=limparTextoClinico(value).toLowerCase();
        const nomes={
            'ombro / complexo glenoumeral':'do ombro e do complexo glenoumeral',
            'coluna lombar / lombossacra':'da coluna lombar e lombossacra',
            'quadril / virilha / pelve':'do quadril, da virilha e da pelve',
            'atm / dor orofacial':'da articulação temporomandibular e da região orofacial',
            'punho / mão':'do punho e da mão',
            'punho e mão':'do punho e da mão',
            'coluna torácica / costelas':'da coluna torácica e das costelas',
            'cabeça / cefaleia — triagem':'da cabeça, na investigação da cefaleia',
            'cotovelo / antebraço':'do cotovelo e do antebraço',
            'tornozelo e pé':'do tornozelo e do pé',
            'ombro':'do ombro','joelho':'do joelho','quadril':'do quadril','punho':'do punho','cotovelo':'do cotovelo',
            'coluna cervical':'da coluna cervical','coluna lombar':'da coluna lombar','coluna torácica':'da coluna torácica'
        };
        return nomes[regiao]||`de ${regiao.replace(/\s*\/\s*/g,' e ')}`;
    }
    function classeNarrativaDoAchado(value){
        const texto=limparTextoClinico(value);
        if(/^(?:ausência de|não há|sem sinais|sem evidência|sem déficit)\b/i.test(texto)||/\b(?:ausentes|sem deterioração)\b/i.test(texto))return 'ausencia';
        if(/\b(?:exige|exigem|sugere|sugerem|aumentam plausibilidade|quando necessário|quando aplicável|monitorados|avaliados|documentados|registrados|confirmados|identificados)\b/i.test(texto))return 'criterio';
        if(/(?<![\p{L}\p{N}])(?:reproduz|reduz|modifica|piora|melhora|demonstra|está|há|é)(?![\p{L}\p{N}])/iu.test(texto))return 'declaracao';
        if(/^(?:dor|fraqueza|atrofia|déficit|redução|limitação|parestesia|dormência|edema|rigidez|instabilidade|perda|alteração|hiperreflexia|clônus|crepitação|sensibilidade|incapacidade|deformidade|derrame|arco doloroso|defeito palpável)\b/i.test(texto))return 'achado';
        if(/^teste\b/i.test(texto)||VOCABULARIO_DOCUMENTAL_LAUDO.testes.some(t=>normalizar(texto).startsWith(normalizar(t))))return 'teste';
        return 'avaliacao';
    }
    function fraseDoResultadoRegistrado(texto,resultado){
        if(/^Exame neurológico sem padrão radicular ou mielopático$/i.test(texto))return resultado==='positivo'?'No exame neurológico registrado, não foi identificado padrão radicular ou mielopático.':resultado==='negativo'?'O registro não confirmou a ausência de padrão radicular ou mielopático; é necessário detalhar os achados neurológicos.':'O exame neurológico permaneceu inconclusivo quanto à presença de padrão radicular ou mielopático.';
        if(/^ULTT1\s*\/\s*teste neurodinâmico do nervo mediano compatível com os sintomas$/i.test(texto))return `O teste neurodinâmico do nervo mediano (ULTT1) ${resultado==='positivo'?'foi positivo, com resposta compatível com os sintomas registrados':resultado==='negativo'?'foi negativo':'permaneceu inconclusivo'}.`;
        if(/^Spurling\s*\/\s*compressão foraminal reproduz sintomas radiculares típicos$/i.test(texto))return resultado==='inconclusivo'?'O teste de Spurling (compressão foraminal cervical) permaneceu inconclusivo.':`O teste de Spurling (compressão foraminal cervical) ${resultado==='positivo'?'reproduziu':'não reproduziu'} os sintomas radiculares registrados.`;
        if(/^Distração cervical reduz sintomas radiculares$/i.test(texto))return resultado==='positivo'?'A distração cervical reduziu os sintomas radiculares registrados.':resultado==='negativo'?'Não foi registrada redução dos sintomas radiculares com a distração cervical.':'A resposta à distração cervical permaneceu inconclusiva.';
        const descricao=minusculaInicial(descricaoDocumentalDoAchado(texto)),classe=classeNarrativaDoAchado(texto);
        const subjuntivo=descricao.replace(/(?<![\p{L}\p{N}])(reproduz|reduz|modifica|piora|melhora|demonstra|está|há|é)(?![\p{L}\p{N}])/giu,verbo=>
            ({reproduz:'reproduzisse',reduz:'reduzisse',modifica:'modificasse',piora:'piorasse',melhora:'melhorasse',demonstra:'demonstrasse','está':'estivesse','há':'houvesse','é':'fosse'})[verbo.toLowerCase()]);
        if(classe==='declaracao')return fraseClinica(resultado==='positivo'?`Ao exame, ${descricao}`:
            resultado==='negativo'?`Não se confirmou no exame que ${subjuntivo}`:`Não foi possível determinar no exame se ${descricao}`);
        if(classe==='ausencia')return fraseClinica(resultado==='positivo'?`A avaliação registrou o seguinte critério de ausência: ${descricao}`:
            resultado==='negativo'?`O critério de ausência não foi confirmado: ${descricao}`:`Não foi possível confirmar o critério de ausência: ${descricao}`);
        if(classe==='criterio')return fraseClinica(`Quanto a ${descricao}, ${resultado==='positivo'?'o critério registrado foi atendido':resultado==='negativo'?'o critério registrado não foi atendido':'a verificação permaneceu inconclusiva'}`);
        if(classe==='achado')return fraseClinica(`${resultado==='positivo'?'O exame evidenciou':resultado==='negativo'?'O exame não evidenciou':'A avaliação permaneceu inconclusiva quanto a'} ${descricao}`);
        if(classe==='teste')return fraseClinica(`${texto} ${resultado==='positivo'?'foi positivo':resultado==='negativo'?'foi negativo':'permaneceu inconclusivo'}`);
        return fraseClinica(`Na avaliação de ${descricao}, ${resultado==='positivo'?'houve resposta positiva':resultado==='negativo'?'não houve resposta positiva':'a resposta permaneceu inconclusiva'}`);
    }
    function narrativaDosResultados(resultados){
        const grupos={positivo:[],negativo:[],inconclusivo:[]};
        resultados.forEach(r=>{if(grupos[r.resultado])grupos[r.resultado].push(r.teste);});
        const frases=[];
        Object.entries(grupos).forEach(([resultado,itens])=>{
            const todos=valoresUnicos(itens);if(!todos.length)return;
            const cervicais=todos.filter(n=>/^ULTT1\s*\/\s*teste neurodinâmico do nervo mediano compatível com os sintomas$|^Spurling\s*\/\s*compressão foraminal reproduz sintomas radiculares típicos$|^Distração cervical reduz sintomas radiculares$/i.test(n));
            cervicais.forEach(n=>frases.push(fraseDoResultadoRegistrado(n,resultado)));
            const nomes=todos.filter(n=>!cervicais.includes(n));
            const compostos=nomes.filter(n=>/^atrofia\b.*\bou contexto de\b/i.test(n));
            // Listas extensas ficam em frases independentes. Um sintoma não é chamado de teste positivo.
            const testes=nomes.filter(n=>classeNarrativaDoAchado(n)==='teste');
            const achados=nomes.filter(n=>!compostos.includes(n)&&classeNarrativaDoAchado(n)==='achado');
            const procedimentos=nomes.filter(n=>!testes.includes(n)&&!achados.includes(n)&&!compostos.includes(n));
            if(testes.length){
                const verbo=resultado==='positivo'?(testes.length===1?'foi positivo':'foram positivos'):resultado==='negativo'?(testes.length===1?'foi negativo':'foram negativos'):(testes.length===1?'permaneceu inconclusivo':'permaneceram inconclusivos');
                frases.push(fraseClinica(`${unirNatural(testes)} ${verbo}`));
            }
            if(achados.length){
                const verbo=resultado==='positivo'?'O exame evidenciou':resultado==='negativo'?'O exame não evidenciou':'A avaliação permaneceu inconclusiva quanto a';
                const descricoes=achados.map(x=>minusculaInicial(descricaoDocumentalDoAchado(x)));
                // Frases curtas evitam listas enormes e ambiguidade entre alternativas.
                for(let inicio=0;inicio<descricoes.length;inicio+=3){
                    const trecho=descricoes.slice(inicio,inicio+3);
                    if(trecho.some(x=>/\bou\b/.test(x)))trecho.forEach((descricao,i)=>frases.push(fraseClinica(`${resultado==='positivo'&&(inicio||i)?'Também se observou':verbo} ${descricao}`)));
                    else frases.push(fraseClinica(`${resultado==='positivo'&&inicio?'Também se observou':verbo} ${unirNatural(trecho)}`));
                }
            }
            compostos.forEach(achado=>{
                const descricao=minusculaInicial(descricaoDocumentalDoAchado(achado));
                frases.push(fraseClinica(resultado==='positivo'?`Consta registro de ${descricao}; a alternativa observada não foi especificada`:
                    resultado==='negativo'?`Não houve resposta positiva na avaliação de ${descricao}`:
                    `A avaliação de ${descricao} permaneceu inconclusiva`));
            });
            if(procedimentos.length){
                procedimentos.forEach(p=>frases.push(fraseDoResultadoRegistrado(p,resultado)));
            }
        });
        return frases.join(' ');
    }
    // O relatório usa apenas informações registradas; hipóteses não são diagnósticos confirmados.
    const RESULTADO_LAUDO={positivo:'positivo',negativo:'negativo',inconclusivo:'inconclusivo'};
    const nomeLimpo=n=>(window.nomeHipoteseLimpoKineSys||(x=>x))(n);
    function dataLaudo(d){
        const bruto=valorCampo(d,'avaliacao_realizado_em');if(!bruto)return'';
        const dt=new Date(bruto);return Number.isNaN(dt.getTime())?bruto:dt.toLocaleDateString('pt-BR');
    }
    function secaoIdentificacao(d,relato){
        const nome=primeiroCampo(d,['paciente_nome']);
        const idade=primeiroCampo(d,['paciente_idade']);
        const sexo=primeiroCampo(d,['paciente_sexo']),nascimento=primeiroCampo(d,['paciente_nascimento']);
        const ocupacao=primeiroCampo(d,['paciente_ocupacao']),data=dataLaudo(d),linhas=[];
        if(nome)linhas.push(`Paciente: ${nome}`);
        if(idade)linhas.push(`Idade: ${idade} anos`);
        if(ocupacao)linhas.push(`Ocupação: ${ocupacao}`);
        if(sexo)linhas.push(`Sexo informado: ${sexo}`);
        if(nascimento)linhas.push(`Data de nascimento: ${nascimento}`);
        if(data)linhas.push(`Data da avaliação: ${data}`);
        // Reutiliza uma declaração própria explícita, não a hipótese do Radar,
        // um familiar, negativa, destino de irradiação ou prioridade presumida.
        const motivo=relato?.fatos.find(f=>f.categoria==='queixa'&&f.proposicoes?.length&&f.proposicoes.every(p=>p.sujeito==='paciente'&&p.estado==='relatado')&&f.proposicoes.some(p=>p.tipo==='sintoma'&&p.papel!=='destino_trajeto'));
        if(motivo)linhas.push(`Motivo da avaliação (conforme relato): ${fraseClinica(frasesDoRelato(motivo.redacao)[0].replace(/^(?:Refere|Relata)(?: que)?\s+/i,'').replace(/,\s.+$/,''))}`);
        return `RELATÓRIO FISIOTERAPÊUTICO\n\n${linhas.join('\n')}`;
    }
    function valoresUnicos(valores){
        const vistos=new Set();return valores.map(limparTextoClinico).filter(valor=>{const chave=normalizar(valor);if(!chave||vistos.has(chave))return false;vistos.add(chave);return true;});
    }
    function construirFatosClinicos(d){
        const hma=primeiroCampo(d,['paciente_hma','hma']);
        const fonteRelato=hma||d.relatoParaDedupe||'';
        const grupos=d.gruposAnamnese||{},eva=primeiroCampo(d,['eva_slider']);
        const fatores=(grupos.fatoresPiora||[]).filter(fator=>!fatorJaDescrito(fonteRelato,fator));
        const evaNumero=String(eva).replace(/\D/g,'');
        const evaJaDescrita=evaNumero&&new RegExp(`(?:eva\\s*(?:de\\s*)?${evaNumero}(?:\\s*\\/\\s*10)?|${evaNumero}\\s*\\/\\s*10)`,'i').test(fonteRelato);
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
    function narrativaPosOperatoria(r){
        const frases=[];
        if(r.procedimento)frases.push(fraseClinica(`Há registro de ${r.procedimento}${r.dataCirurgia?`, realizado em ${dataDocumental(r.dataCirurgia)}`:''}`));
        else if(r.dataCirurgia)frases.push(fraseClinica(`O procedimento cirúrgico foi registrado em ${dataDocumental(r.dataCirurgia)}`));
        if(r.statusCarga)frases.push(fraseClinica(`A condição de apoio de carga registrada é ${termoDocumental('carga',r.statusCarga)}`));
        if(r.ortese)frases.push(fraseClinica(`A órtese indicada é ${r.ortese}`));
        if(r.restricaoADM)frases.push(fraseClinica(`As restrições de amplitude de movimento são ${r.restricaoADM}`));
        if(r.proibicoes)frases.push(fraseClinica(`Permanecem as seguintes proibições registradas: ${r.proibicoes}`));
        if(r.orientacoesCirurgiao)frases.push(fraseClinica(`As orientações da equipe cirúrgica são ${r.orientacoesCirurgiao}`));
        if(r.retornoMedico)frases.push(fraseClinica(`Há retorno médico previsto para ${dataDocumental(r.retornoMedico)}`));
        if(r.protocoloDisponivel&&r.protocoloDisponivel!=='nao_informado')frases.push(fraseClinica(`A disponibilidade do protocolo pós-operatório foi registrada como ${r.protocoloDisponivel==='sim'?'disponível':r.protocoloDisponivel==='nao'?'não disponível':r.protocoloDisponivel}`));
        if(r.observacoes)frases.push(narrativaDoRelato(r.observacoes));
        return frases.join(' ');
    }
    function numeroDocumental(value){return typeof value==='number'&&Number.isFinite(value)?String(value).replace('.',','):limparTextoClinico(value);}
    function secaoFuncional(d){
        const f=d.funcional||{},frases=[];
        (f.medidasObjetivas||[]).forEach(m=>{
            if(!m.nome)return;
            const valor=m.valor!==null&&m.valor!==undefined&&m.valor!==''?numeroDocumental(m.valor):'';
            frases.push(fraseClinica(`${m.nome}${valor?`: ${valor}${m.unidade?` ${m.unidade}`:''}`:''}${m.observacao?` (${limparTextoClinico(m.observacao)})`:''}`));
        });
        const atividades=(f.psfs?.itens||[]).filter(item=>item.atividade&&Number.isFinite(item.valor)).map(item=>`${item.atividade}: ${numeroDocumental(item.valor)}/10`);
        if(atividades.length)frases.push(fraseClinica(`Na Escala Funcional Específica do Paciente (PSFS), foram registradas as seguintes capacidades: ${atividades.join('; ')}`));
        (f.outcomes||[]).forEach(o=>{if(o.nome&&o.valor!==null&&o.valor!==undefined&&o.valor!=='')frases.push(fraseClinica(`${o.nome}: ${numeroDocumental(o.valor)}${o.faixa?`, na faixa registrada de ${o.faixa}`:''}${o.observacao?`; ${o.observacao}`:''}`));});
        return frases.length?`Na caracterização funcional e quantitativa, ${minusculaInicial(valoresUnicos(frases).join(' '))}`:'';
    }
    function secaoPlanoRegistrado(d){
        const p=d.funcional?.objetivosPlano;if(!p)return'';
        const frases=[];
        if(p.plano)frases.push(fraseClinica(`O plano fisioterapêutico registrado prevê ${p.plano}`));
        if(p.frequencia)frases.push(fraseClinica(`A frequência proposta é ${p.frequencia}`));
        (p.objetivos||[]).forEach(o=>{
            if(!o.objetivo)return;
            const detalhes=[o.baseline?`condição inicial: ${o.baseline}`:'',o.meta?`meta: ${o.meta}`:'',o.prazo?`prazo: ${o.prazo}`:'',o.status?`situação: ${termoDocumental('estadoObjetivo',o.status)}`:''].filter(Boolean);
            frases.push(fraseClinica(`O objetivo registrado é ${o.objetivo}${detalhes.length?`, com ${detalhes.join('; ')}`:''}`));
        });
        if(p.criterios)frases.push(fraseClinica(`Os critérios de acompanhamento são ${p.criterios}`));
        if(p.criteriosAlta)frases.push(fraseClinica(`Os critérios de alta registrados são ${p.criteriosAlta}`));
        if(p.previsaoAlta)frases.push(fraseClinica(`A previsão de alta registrada é ${dataDocumental(p.previsaoAlta)}`));
        return frases.join(' ');
    }
    function secaoHistoria(d){
        const f=construirFatosClinicos(d),paragrafos=[];
        const queixa=[];if(f.relato.hma){const relato=narrativaDoRelato(f.relato.hma),abertura=/^(?:dor\b|queimação\b|fraqueza\b|parestesia\b|edema\b|rigidez\b|perda\b|limitação\b)/i.test(relato)?`Refere ${minusculaInicial(relato)}`:relato;paragrafos.push(...paragrafosClinicos(abertura));}
        if(f.relato.eva||f.relato.fatores.length){
            const intensidade=f.relato.eva?`A intensidade atual foi registrada em ${f.relato.eva}/10 na EVA`:'';
            const agravantes=f.relato.fatores.length?`${intensidade?'com piora':'Os sintomas pioram'} durante ${unirNatural(f.relato.fatores.map(fatorEmFrase))}`:'';
            queixa.push(fraseClinica([intensidade,agravantes].filter(Boolean).join(', ')));
        }
        if(queixa.length)paragrafos.push(queixa.join(' '));
        const contexto=[];
        if(f.inicio)contexto.push(fraseClinica(descreverInicio(f.inicio)));
        if(f.ocupacao.exposicoes.length)contexto.push(fraseClinica(`A atividade profissional envolve ${unirNatural(f.ocupacao.exposicoes.map(descreverExposicao))}`));
        const a=f.atividade;
        if(a.nome&&/^(n[aã]o|nenhum|sedent)/i.test(a.nome))contexto.push('Não pratica atividade física.');
        else if(a.nome||a.frequencia||a.duracao||a.nivel||a.mudanca||a.cargas.length){
            const detalhes=[];
            if(a.frequencia)detalhes.push(`${a.frequencia} vez${a.frequencia==='1'?'':'es'} por semana`);
            if(a.duracao)detalhes.push(`${a.duracao} minutos por sessão`);
            if(a.nivel)detalhes.push(`em nível ${a.nivel.toLowerCase()}`);
            contexto.push(fraseClinica(`${a.nome?`Pratica ${a.nome}`:'A atividade física foi caracterizada'}${detalhes.length?`, ${unirNatural(detalhes)}`:''}`));
            if(a.mudanca)contexto.push(fraseClinica(`Quanto à carga recente, foi registrado ${a.mudanca.toLowerCase()}`));
            if(a.cargas.length)contexto.push(fraseClinica(`A prática envolve ${unirNatural(a.cargas.map(descreverExposicao))}`));
        }
        if(contexto.length)paragrafos.push(contexto.join(' '));
        const modificadores=[];
        if(f.antecedentes.comorbidades.length)modificadores.push(fraseClinica(`Entre os antecedentes relevantes, ${f.antecedentes.comorbidades.length===1?'consta':'constam'} ${unirNatural(f.antecedentes.comorbidades.map(x=>termoDocumental('antecedentes',x)))}`));
        if(f.antecedentes.cirurgias)modificadores.push(fraseClinica(`Foram registrados os seguintes procedimentos prévios: ${f.antecedentes.cirurgias}`));
        if(f.antecedentes.medicamentos)modificadores.push(fraseClinica(`Medicamentos em uso: ${f.antecedentes.medicamentos}`));
        if(f.restricoes.ativo){const restricoes=narrativaPosOperatoria(f.restricoes);if(restricoes)modificadores.push(restricoes);}
        if(f.imagem.descricao)modificadores.push(fraseClinica(`${f.imagem.fonte==='laudo_conferido'?'O documento de imagem apresentado descreve':'Segundo o relato, o exame de imagem descreve'} ${f.imagem.descricao}`));
        if(f.contexto.psicossociais.length||f.contexto.observacao){
            if(f.contexto.psicossociais.length)modificadores.push(fraseClinica(`Também há registro de ${unirNatural(f.contexto.psicossociais.map(x=>termoDocumental('contexto',x))).toLowerCase()}`));
            if(f.contexto.observacao)modificadores.push(narrativaDoRelato(f.contexto.observacao));
        }
        if(f.contexto.fonte&&!/relato do paciente/i.test(f.contexto.fonte))modificadores.push(fraseClinica(`A informação clínica foi complementada por ${BANCO_SEMANTICO_LAUDO.fonte[f.contexto.fonte]||f.contexto.fonte.toLowerCase()}`));
        if(modificadores.length)paragrafos.push(modificadores.join(' '));
        return valoresUnicos(paragrafos).join('\n\n');
    }
    const ROTULOS_CONTEXTO_LAUDO={saude:'Saúde e hábitos',cirurgias:'Cirurgias e traumas',medicamentos:'Medicamentos e infiltrações',exames:'Exames de imagem',trabalho:'Exposição ocupacional',atividade:'Atividade física',psicossocial:'Fatores psicossociais'};
    const CAMPOS_CONTEXTO_LAUDO=new Set(['contexto_saude_observacao','contexto_cirurgia_regiao','contexto_cirurgia_data','contexto_trauma_observacao','contexto_medicamento_observacao','contexto_trabalho_tarefa','contexto_trabalho_tempo','contexto_trabalho_frequencia','contexto_trabalho_observacao']);
    function fatosComplementaresDoContexto(d){
        const campos={...(d.contextoAnamnese?.campos||{}),...(d.campos||{})},itens=[];
        const add=(id,rotulo,prefixo)=>{
            const valor=limparTextoClinico(campos[id]);if(!valor)return;
            const redacao=polirRelatoClinico(valor),autossuficiente=/^(?:nega\b|negou\b|refere\b|relata\b|informa\b|sem\b|não\b)/i.test(redacao);
            // Uma oração completa não precisa de "foi informado: paciente relata...".
            const base=autossuficiente?fraseClinica(realizarFatoDoRelato(redacao)):fraseClinica(prefixo+valor);
            itens.push({id,rotulo,valor,texto:window.KineSysDocumentAnalyzer?.redigirContexto(base,id)||base});
        };
        add('contexto_saude_observacao','Observações de saúde','Sobre os antecedentes de saúde, foi informado: ');
        add('contexto_cirurgia_regiao','Região/lado de cirurgia','No histórico de procedimentos, a região e o lado informados foram: ');
        add('contexto_cirurgia_data','Data de cirurgia','A data aproximada informada para o histórico cirúrgico foi: ');
        add('contexto_trauma_observacao','Traumas e restrições','Quanto a traumas e restrições prévios, foi registrado: ');
        add('contexto_medicamento_observacao','Uso de medicamentos/infiltrações','Informa uso de: ');
        const grupos=d.gruposAnamnese||{},comorbidades=grupos.comorbidades||[];
        const cirurgiaSemDetalhe=comorbidades.some(x=>/^Cirurgia/i.test(x))&&!d.complementos.cirurgias&&!campos.contexto_trauma_observacao;
        if(cirurgiaSemDetalhe)itens.push({id:'antecedente_cirurgia_trauma',rotulo:'Cirurgia ou trauma anterior',valor:'antecedente informado',texto:'Foi informado antecedente de cirurgia ou trauma, sem detalhamento do evento.'});
        const tarefa=limparTextoClinico(campos.contexto_trabalho_tarefa),tempo=limparTextoClinico(campos.contexto_trabalho_tempo),freq=limparTextoClinico(campos.contexto_trabalho_frequencia);
        const detalhes=[tarefa?`atividade de ${tarefa}`:'',tempo?`exposição de ${tempo}`:'',freq?`frequência ${freq}`:''].filter(Boolean);
        if(detalhes.length)itens.push({id:'contexto_trabalho_detalhes',rotulo:'Detalhes da exposição ocupacional',valor:detalhes.join('; '),texto:fraseClinica(tarefa?`A rotina de trabalho inclui ${tarefa}${tempo?`, com exposição de ${tempo}`:''}${freq?`${tempo?' e':', com'} frequência ${freq}`:''}`:`A exposição ocupacional foi caracterizada por ${unirNatural(detalhes)}`)});
        add('contexto_trabalho_observacao','Observação ocupacional','Quanto à carga ocupacional, foi informado: ');
        const negativos={saude:'Na entrevista, negou as condições de saúde e os hábitos investigados',cirurgias:'Na entrevista, negou cirurgias e traumas prévios',medicamentos:'Negou uso dos medicamentos e infiltrações investigados',exames:'Informou não dispor de exames de imagem',trabalho:'Negou as exposições ocupacionais investigadas',atividade:'Informou não praticar atividade física',psicossocial:'Negou os fatores psicossociais investigados'};
        const positivos={saude:comorbidades.some(x=>!/^Cirurgia|corticoide|infiltração|anti-inflamatório|AINE/i.test(x))||!!campos.contexto_saude_observacao,cirurgias:!!d.complementos.cirurgias||cirurgiaSemDetalhe||!!campos.contexto_trauma_observacao||!!campos.contexto_cirurgia_regiao||!!campos.contexto_cirurgia_data,medicamentos:!!d.complementos.medicamentos||!!campos.contexto_medicamento_observacao||comorbidades.some(x=>/corticoide|infiltração|anti-inflamatório|AINE/i.test(x)),exames:!!campos.exames_imagem_descricao,trabalho:!!grupos.exposicoesOcupacionais?.length||detalhes.length>0||!!campos.contexto_trabalho_observacao,atividade:!!primeiroCampo(d,['paciente_esporte','esporte_frequencia','esporte_duracao','esporte_nivel','esporte_mudanca_carga'])||!!grupos.exposicoesEsportivas?.length,psicossocial:!!grupos.fatoresPsicossociais?.length||!!campos.yellow_flags_observacao};
        Object.entries(d.contextoAnamnese?.estados||{}).forEach(([key,estado])=>{if(estado==='nega'&&!positivos[key]&&negativos[key])itens.push({id:'negativa_'+key,rotulo:ROTULOS_CONTEXTO_LAUDO[key],valor:negativos[key],texto:fraseClinica(negativos[key])});});
        const camposMapeados=CAMPOS_CONTEXTO_LAUDO;
        const extrasSemRegra=Object.entries(d.contextoAnamnese?.campos||{}).filter(([id,valor])=>String(valor||'').trim()&&!camposMapeados.has(id)).map(([id])=>document.getElementById(id)?.labels?.[0]?.textContent||id.replace(/_/g,' '));
        return {itens,positivos,extrasSemRegra};
    }
    function regioesSemResultados(d){return (d.regioesSelecionadas||[]).filter(r=>!d.achados.some(a=>(a.regiaoId===r.id||normalizar(a.regiao)===normalizar(r.nome))&&(a.achados||[]).some(x=>RESULTADO_LAUDO[x.resultado]))&&!(d.exameLivre||[]).some(a=>documentarExameLivreNoLaudo(a).trechos.some(t=>t.realizado&&!t.localizacaoDivergente&&t.regiaoId===r.id)));}
    function secaoLimitesExame(d){
        const regioes=regioesSemResultados(d);return regioes.length?fraseClinica(`A avaliação também contempla ${unirNatural(regioes.map(r=>r.nome))}, mas não há resultados de exame registrados para ${regioes.length===1?'essa região':'essas regiões'}; sua investigação permanece em aberto`):'';
    }
    function secaoExame(d,regiaoFiltro,separarAmbiguidades=false){
        const porRegiao=new Map();
        d.achados.forEach(item=>{
            if(regiaoFiltro&&normalizar(item.regiao)!==normalizar(regiaoFiltro))return;
            const feitos=(item.achados||[]).filter(a=>RESULTADO_LAUDO[a.resultado]&&!(separarAmbiguidades&&a.resultado==='positivo'&&/^atrofia\b.*\bou contexto de\b/i.test(a.texto)));
            if(!feitos.length)return;
            if(!porRegiao.has(item.regiao))porRegiao.set(item.regiao,[]);
            feitos.forEach(a=>{const lista=porRegiao.get(item.regiao),fato={teste:limparTextoClinico(a.texto),resultado:a.resultado};if(!lista.some(x=>normalizar(x.teste)===normalizar(fato.teste)&&x.resultado===fato.resultado))lista.push(fato);});
        });
        if(!porRegiao.size)return'';
        const blocos=[];porRegiao.forEach((resultados,regiao)=>{
            const narrativa=narrativaDosResultados(resultados);
            // O lugar do exame introduz os achados, sem uma frase vazia sobre a região avaliada.
            if(narrativa.startsWith('O exame evidenciou '))blocos.push(`A avaliação ${regiaoEmFrase(regiao)} evidenciou ${narrativa.slice('O exame evidenciou '.length)}`);
            else if(narrativa.startsWith('O teste '))blocos.push(`Na avaliação ${regiaoEmFrase(regiao)}, ${minusculaInicial(narrativa)}`);
            else blocos.push(`Na avaliação ${regiaoEmFrase(regiao)}: ${narrativa}`);
        });
        return blocos.join('\n\n');
    }
    function secaoAmbiguidadesDoExame(d,regiaoFiltro){
        const itens=d.achados.filter(item=>!regiaoFiltro||normalizar(item.regiao)===normalizar(regiaoFiltro))
            .flatMap(item=>(item.achados||[]).filter(a=>a.resultado==='positivo'&&/^atrofia\b.*\bou contexto de\b/i.test(a.texto)).map(a=>descricaoDocumentalDoAchado(a.texto)));
        return valoresUnicos(itens).map(descricao=>fraseClinica(`O registro referente à ${minusculaInicial(descricao)} não distingue qual dessas situações foi identificada. Essa informação precisa ser especificada antes de integrar a conclusão clínica`)).join(' ');
    }
    function construirCorrelacoes(d){
        const hipoteses=d.plano?.hipoteses||[];
        const alvos=(d.sintese.resumoPorRegiao||[]).flatMap(regiao=>{
            const base=[regiao],vistas=new Set([normalizar(regiao.codigoHipotese||regiao.codigoEixo)]);
            const eixos=d.achados.filter(a=>a.regiao===regiao.regiao&&(a.achados||[]).some(x=>RESULTADO_LAUDO[x.resultado]));
            const candidatos=[...hipoteses.filter(h=>eixos.some(a=>a.regiaoId===h.regiaoId)),...(regiao.sinteseClinica?.hipoteses||[]),...(regiao.hipotesesAssociadas||[]).map(h=>({...h,id:h.codigo}))];
            candidatos.forEach(h=>{
                const id=normalizar(h.id);if(!id||vistas.has(id)||!eixos.some(a=>normalizar(a.id)===id))return;
                vistas.add(id);base.push({...regiao,codigoHipotese:h.id,nomeHipotese:h.nome,nivel:regiao.nivel==='alerta'?'alerta':h.estadoSintese==='sustentada'?'positivo':'pendente'});
            });return base.length>1&&!regiao.codigoHipotese&&!regiao.codigoEixo?base.slice(1):base;
        });
        return alvos.map(regiao=>{
            const alvo=normalizar(regiao.nomeHipotese);
            const codigo=normalizar(regiao.codigoHipotese||regiao.codigoEixo),regiaoAlvo=normalizar(regiao.regiao);
            const achadosRegiao=d.achados.filter(a=>a.regiao===regiao.regiao),idsEixos=new Set(achadosRegiao.map(a=>normalizar(a.id)).filter(Boolean));
            const idsVinculados=new Set((d.plano?.testesPrioritarios||[]).filter(t=>achadosRegiao.some(a=>(!t.regiaoIds?.length||t.regiaoIds.includes(a.regiaoId))&&(a.achados||[]).some(x=>normalizar(x.texto)===normalizar(t.texto)))).flatMap(t=>[t.hipoteseId,...(t.hipoteseIds||[])]).map(normalizar).filter(Boolean));
            const hipotesesDaRegiao=hipoteses.filter(h=>achadosRegiao.some(a=>a.regiaoId===h.regiaoId)||normalizar(h.regiaoId)===regiaoAlvo||
                (!achadosRegiao.some(a=>a.regiaoId)&&codigo&&normalizar(h.id)===codigo));
            const hip=hipotesesDaRegiao.find(h=>codigo&&normalizar(h.id)===codigo)||(alvo?hipotesesDaRegiao.find(h=>nomeLimpo(h.nome)===nomeLimpo(regiao.nomeHipotese)):null)||(!codigo&&!alvo&&hipotesesDaRegiao.length===1?hipotesesDaRegiao.find(h=>idsEixos.has(normalizar(h.id))||idsVinculados.has(normalizar(h.id))):null);
            const sugeridos=[...(hip?.aConfirmar||[])];
            const alvoId=normalizar(hip?.id)||codigo;
            const achadosVinculados=alvoId?achadosRegiao.filter(a=>normalizar(a.id)===alvoId):[];
            const priorizados=(d.plano?.testesPrioritarios||[]).filter(t=>[t.hipoteseId,...(t.hipoteseIds||[])].some(id=>normalizar(id)===alvoId));
            const fonteResultados=achadosVinculados.length?achadosVinculados:achadosRegiao.map(a=>({...a,achados:(a.achados||[]).map(x=>({...x,resultado:priorizados.some(t=>normalizar(t.texto)===normalizar(x.texto)&&(!t.regiaoIds?.length||t.regiaoIds.includes(a.regiaoId)))?x.resultado:'nao_avaliado'}))}));
            const resultados=fonteResultados.flatMap(a=>(a.achados||[]).map((x,indice)=>({x,indice})).filter(({x})=>RESULTADO_LAUDO[x.resultado]).map(({x,indice})=>({teste:limparTextoClinico(x.texto),resultado:x.resultado,indice,eixo:a.nome,eixoId:a.id||''}))).filter((r,i,todos)=>todos.findIndex(o=>normalizar(o.teste)===normalizar(r.teste)&&o.resultado===r.resultado)===i);
            const contagem=resultados.reduce((acc,item)=>(acc[item.resultado]=(acc[item.resultado]||0)+1,acc),{});
            return {regiao:regiao.regiao,regiaoId:hip?.regiaoId||achadosRegiao[0]?.regiaoId||'',hipoteseId:hip?.id||regiao.codigoHipotese||'',hipoteseAnamnese:hip?.nome||regiao.nomeHipotese||'',evidenciasCompartilhadas:d.plano?.raciocinio?.hipoteses?.find(h=>h.id===(hip?.id||regiao.codigoHipotese)),fonteRaciocinio:d.plano?.raciocinio?.fonteId||'',criterio:achadosVinculados.length?(hip?.criterio||criterioDaHipotese({id:regiao.codigoHipotese})): {tipo:'',minimo:0,obrigatorios:[]},motivos:sugeridos.slice(0,4),resultados,contagem,semVinculo:!resultados.length&&achadosRegiao.some(a=>(a.achados||[]).some(x=>RESULTADO_LAUDO[x.resultado])),nivel:regiao.nivel,direcao:regiao.direcaoInvestigacao||regiao.hipotese||'',conclusao:regiao.textoDocumento||'',direcaoProfissional:regiao.direcaoProfissional||''};
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
        return valoresUnicos([...Array.from(resultados.values()).filter(item=>item.valores.size>1).map(item=>item.teste),...(d.exameLivre||[]).filter(r=>r.situacao?.tipo==='divergente').map(r=>r.referencia?.texto||r.texto)]);
    }
    function secaoCorrelacao(d,regiaoFiltro,hipoteseFiltro){
        const correlacoes=construirCorrelacoes(d);
        const avaliadas=correlacoes.filter(c=>(c.resultados.length||c.semVinculo)&&(!regiaoFiltro||normalizar(c.regiao)===normalizar(regiaoFiltro))&&(!hipoteseFiltro||normalizar(c.hipoteseId)===normalizar(hipoteseFiltro)));
        if(!avaliadas.length)return'';
        const conflitos=conflitosDoExame(d);
        if(conflitos.length)return fraseClinica(`A interpretação permanece inconclusiva porque ${unirNatural(conflitos)} possui resultados divergentes no exame registrado; revise esses achados antes de definir a impressão fisioterapêutica`);
        return avaliadas.map(c=>{
            const hipotese=nomeEmFrase(c.hipoteseAnamnese);
            const positivos=c.contagem.positivo||0,negativos=c.contagem.negativo||0,inconclusivos=c.contagem.inconclusivo||0;
            const alvo=hipotese?`a hipótese de ${hipotese}`:'a hipótese em análise';
            const alvoIndireto=hipotese?`à hipótese de ${hipotese}`:'à hipótese em análise';
            if(c.semVinculo)return `Há resultados de exame na região, mas sem vínculo registrado com ${alvo}; não foi produzida conclusão automática para essa hipótese.`;
            if(c.nivel==='alerta')return'A interpretação clínico-funcional permanece condicionada à análise dos sinais de alerta identificados na avaliação.';
            const criterio=estadoDoCriterio(c);
            if(positivos&&['menos_compativel','localizacao_pendente','lateralidade_pendente','cronologia_pendente','dados_divergentes'].includes(c.evidenciasCompartilhadas?.estado))return `Há resultados positivos relacionados ${alvoIndireto}, mas a localização ou a história relatada ainda não é concordante. É necessário esclarecer esses dados antes de integrá-los a uma conclusão clínica.`;
            if(criterio===true)return `O conjunto dos resultados registrados dá suporte ${alvoIndireto}, considerada na investigação da queixa. Esses resultados não estabelecem diagnóstico definitivo isoladamente.`;
            if(positivos&&criterio===false)return `Há achados favoráveis ${alvoIndireto}, mas a combinação de resultados ainda é insuficiente para sustentá-la com maior segurança.`;
            if(positivos)return`Esses achados mantêm ${alvo} como possibilidade de investigação, sem estabelecer diagnóstico definitivo.`;
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
        const exameRegistrado=d.achados.some(item=>(item.achados||[]).some(a=>RESULTADO_LAUDO[a.resultado]))||(d.exameLivre||[]).some(r=>String(r.texto||'').trim());
        const temHistoria=!!primeiroCampo(d,['paciente_hma','hma']),pendencias=[];
        if(!temHistoria)pendencias.push('preencher a História da Moléstia Atual');
        if(!exameRegistrado)pendencias.push('registrar ao menos um resultado do exame físico-funcional');
        const texto=secoes.join('\n\n'),testesAusentes=[];
        const exameLivrePendente=(d.exameLivre||[]).filter(r=>['rascunho','revisar','divergente'].includes(r.situacao?.tipo)).map(r=>r.situacao.mensagem);
        if((d.exameLivre||[]).some(r=>documentarExameLivreNoLaudo(r).trechos.some(t=>t.localizacaoDivergente)))exameLivrePendente.push('Confira a região selecionada e a localização dos testes digitados; a classificação original foi preservada.');
        (d.exameLivre||[]).filter(r=>String(r.texto||'').trim()).forEach(r=>{documentarExameLivreNoLaudo(r).trechos.forEach(t=>{if(!normalizar(texto).includes(normalizar(t.texto)))testesAusentes.push(t.textoOriginal);});});
        d.achados.forEach(item=>(item.achados||[]).filter(a=>RESULTADO_LAUDO[a.resultado]).forEach(a=>{if(!normalizar(texto).includes(normalizar(a.texto))&&!normalizar(texto).includes(normalizar(descricaoDocumentalDoAchado(a.texto)))&&!normalizar(texto).includes(normalizar(fraseDoResultadoRegistrado(a.texto,a.resultado))))testesAusentes.push(limparTextoClinico(a.texto));}));
        const conflitos=conflitosDoExame(d);
        const relato=extrairFatosDoRelato(primeiroCampo(d,['paciente_hma','hma']));planejarRelato(relato);
        const relatoAusente=relato.fatos.filter(f=>![f.redacao,...(f.realizacoes||[])].some(t=>normalizar(texto).includes(normalizar(t)))).map(f=>f.redacao);
        const contexto=fatosComplementaresDoContexto(d),contextoAusente=[...contexto.itens.filter(item=>!normalizar(texto).includes(normalizar(item.texto))).map(item=>item.rotulo),...contexto.extrasSemRegra];
        const itensSeparados=[...(d.complementos.cirurgiasItens||[]),...(d.complementos.medicamentosItens||[])];
        const listasAusentes=itensSeparados.filter(item=>!normalizar(texto).includes(normalizar(item)));
        const contextoPendente=Object.entries(d.contextoAnamnese?.estados||{}).filter(([key,estado])=>estado==='relata'&&!contexto.positivos[key]||estado==='nega'&&contexto.positivos[key]).map(([key,estado])=>`${ROTULOS_CONTEXTO_LAUDO[key]||key}: ${estado==='nega'?'negativa conflita com dados preenchidos':'marcado como Relata sem detalhes'}`);
        const regioesPendentes=regioesSemResultados(d).map(r=>r.nome);
        const hipotesesSemVinculo=construirCorrelacoes(d).filter(c=>c.semVinculo).map(c=>c.hipoteseAnamnese||c.regiao);
        const trechosParaConferir=frasesDoRelato(primeiroCampo(d,['paciente_hma','hma'])).filter(frase=>/\bao dor\b/i.test(frase));
        const ambiguidades=d.achados.flatMap(item=>(item.achados||[]).filter(a=>a.resultado==='positivo'&&/^atrofia\b.*\bou contexto de\b/i.test(a.texto)).map(a=>limparTextoClinico(a.texto)));
        return {ok:!pendencias.length&&!testesAusentes.length&&!conflitos.length&&!relatoAusente.length&&!ambiguidades.length&&!contextoAusente.length&&!listasAusentes.length&&!contextoPendente.length&&!regioesPendentes.length&&!trechosParaConferir.length&&!hipotesesSemVinculo.length&&!exameLivrePendente.length,pendencias,testesAusentes:valoresUnicos(testesAusentes),relatoAusente,conflitos,ambiguidades,contextoAusente,listasAusentes,contextoPendente,regioesPendentes,trechosParaConferir,hipotesesSemVinculo,exameLivrePendente};
    }
    function textoBase(d){
        const semantica=construirPlanoNarrativo(d),secoes=comporDocumentoSemantico(semantica),validacao=validarNarrativaClinica(d,secoes);
        semantica.validacao=validarPlanoSemantico(semantica,secoes.join('\n\n'));
        if(validacao.pendencias.length)return {texto:'',modo:'incompleto',fonte:d.fonte,revisado:false,textoAutomatico:true,versaoTexto:22,revisaoSemantica:4,pendencias:validacao.pendencias,validacao,semantica,atualizadoEm:new Date().toISOString()};
        return {texto:secoes.join('\n\n'),modo:validacao.ok&&semantica.validacao.ok?'assistido':'revisao',fonte:d.fonte,revisado:false,textoAutomatico:true,versaoTexto:22,revisaoSemantica:4,validacao,semantica,atualizadoEm:new Date().toISOString()};
    }
    window.preencherLaudoAvaliacaoKineSys=function(value){
        limparLaudoDoContexto();
        const atual=contextoAtual(),dono=value?.contextoPaciente;
        if(dono&&['pacienteId','clinicaId','avaliacaoId'].some(k=>dono[k]&&String(dono[k])!==String(atual[k]||'')))return;
        if(value&&!dono){
            let nomeFonte='';try{nomeFonte=JSON.parse(value.fonte||'{}').campos?.paciente_nome||'';}catch(_){}
            const nomeAtual=document.getElementById('paciente_nome')?.value||'';
            if(nomeFonte&&nomeAtual&&normalizar(nomeFonte)!==normalizar(nomeAtual))return;
        }
        laudo=value&&typeof value==='object'?clone(value):null;
        if(laudo)laudo.contextoPaciente=clone(atual);
        const editor=document.getElementById('ks-laudo-texto');if(editor)editor.value=laudo?.texto||'';
    };
    window.coletarLaudoAvaliacaoKineSys=function(){if(!conferirContextoLaudo())return null;garantirFechamentoLaudo({profissional:profissionalDoLaudo()});if(laudo?.semantica)laudo.semantica.validacao=validarPlanoSemantico(laudo.semantica,laudo.texto);return laudo?clone(laudo):null;};
    window.renderizarLaudoAvaliacaoKineSys=function(){
        conferirContextoLaudo();
        const editor=document.getElementById('ks-laudo-texto');if(!editor)return;
        const loader=window.KineSysClinicalRegionLoader;
        if(loader?.ensure&&loader?.status){
            const prontas=loader.status().bankRegions||[];
            const pendentes=Array.from(document.querySelectorAll('#grupo_regioes_mapeamento input:checked')).map(i=>i.dataset.regiao).filter(id=>id&&!prontas.includes(id));
            if(pendentes.length){
                document.getElementById('ks-laudo-status').textContent='Carregando os resultados do exame para compor o relatório…';
                if(!carregamentoLaudo){
                    const contextoCarga=contextoDoLaudo;
                    const carga=carregamentoLaudo=Promise.resolve().then(()=>loader.ensure(pendentes));
                    carga.then(()=>{
                        if(carga!==carregamentoLaudo||contextoCarga!==JSON.stringify(contextoAtual()))return;
                        carregamentoLaudo=null;
                        if(pendentes.every(id=>(loader.status().bankRegions||[]).includes(id)))window.renderizarLaudoAvaliacaoKineSys();
                        else document.getElementById('ks-laudo-status').textContent='Não foi possível carregar o exame. Abra novamente a etapa Relatório para tentar de novo.';
                    },()=>{if(carga!==carregamentoLaudo||contextoCarga!==JSON.stringify(contextoAtual()))return;carregamentoLaudo=null;document.getElementById('ks-laudo-status').textContent='Não foi possível carregar o exame. Abra novamente a etapa Relatório para tentar de novo.';});
                }
                return;
            }
        }
        const d=dadosAtuais();
        // Enquanto ninguém editou o texto, ele acompanha o exame; texto editado é preservado.
        const textoLaudo=laudo?.texto||'';
        const legadoAuto=!!laudo&&laudo.textoAutomatico!==false&&!laudo.revisado&&(
            (textoLaudo.includes('foi avaliado(a) pela fisioterapia')&&textoLaudo.includes('Com base nos dados registrados, recomenda-se'))||
            (textoLaudo.startsWith('RELATÓRIO FISIOTERAPÊUTICO')&&textoLaudo.includes('Quanto à queixa atual, registra-se:')&&textoLaudo.includes('O exame físico ainda não contém resultados de testes registrados.')&&textoLaudo.includes('A hipótese clínica permanece em aberto até a correlação entre a anamnese e o exame físico.'))
        );
        if(!laudo||legadoAuto||(laudo.textoAutomatico&&!laudo.revisado&&(laudo.fonte!==d.fonte||laudo.versaoTexto!==22||laudo.revisaoSemantica!==4)))laudo=textoBase(d);
        laudo.contextoPaciente=clone(contextoAtual());
        const mudou=laudo.fonte!==d.fonte;
        if(mudou)laudo.revisado=false;
        garantirFechamentoLaudo(d);
        editor.value=laudo.texto;
        document.getElementById('ks-laudo-revisado').checked=!!laudo.revisado;
        const v=laudo.validacao||{},avisos=[];
        if(v.regioesPendentes?.length)avisos.push('Regiões sem resultados: '+unirNatural(v.regioesPendentes));
        if(v.hipotesesSemVinculo?.length)avisos.push('Hipóteses sem testes vinculados: '+unirNatural(v.hipotesesSemVinculo));
        if(v.exameLivrePendente?.length)avisos.push(unirNatural(valoresUnicos(v.exameLivrePendente)));
        if(v.contextoPendente?.length)avisos.push(unirNatural(v.contextoPendente));
        if(v.trechosParaConferir?.length)avisos.push('Confira a redação na HMA: '+unirNatural(v.trechosParaConferir));
        if(v.contextoAusente?.length||v.listasAusentes?.length)avisos.push('Dados não incorporados: '+unirNatural([...(v.contextoAusente||[]),...(v.listasAusentes||[])]));
        if(laudo.semantica)laudo.semantica.validacao=validarPlanoSemantico(laudo.semantica,laudo.texto);
        const sv=laudo.semantica?.validacao;
        if(sv?.contradicoes?.length)avisos.push('Há possíveis contradições no relato; confira lado, momento e origem dos registros');
        if(sv?.ausentes?.length)avisos.push('Há fatos sem correspondência no texto final');
        if(sv?.qualidade?.length)avisos.push(...sv.qualidade);
        if(sv?.significado&&!sv.significado.ok)avisos.push('Confira a correspondência entre sintomas, locais, lados, momentos e doses do relato e do texto final');
        if(sv?.significado?.causalidade?.length)avisos.push('Há uma relação causal nova sem fonte correspondente');
        if(sv?.problemasSemExame?.length)avisos.push('Queixas ainda sem exame registrado: '+unirNatural(valoresUnicos(sv.problemasSemExame.map(p=>p.regiao))));
        if(sv?.correlacoesDivergentes?.length)avisos.push('Há hipótese examinada com localização ou história ainda não concordante; confira as evidências do Radar');
        if(laudo.semantica?.pendenciasInterpretacao?.length)avisos.push('Há localizações ou referências no relato que precisam ser esclarecidas antes de associá-las a uma hipótese');
        const motorAnterior=laudo.versaoTexto!==22||laudo.revisaoSemantica!==4;
        document.getElementById('ks-laudo-status').textContent=mudou||motorAnterior?'A avaliação mudou ou há uma nova base semântica. Seu texto foi preservado: use Atualizar base da avaliação ou revise as diferenças antes de finalizar.':laudo.modo==='incompleto'?`Para gerar o relatório, falta ${unirNatural(laudo.pendencias||[])}.`:v.ambiguidades?.length?'O relatório requer revisão: um item positivo reúne achados alternativos. Especifique no texto qual achado foi observado.':(laudo.modo==='revisao'||sv&&!sv.ok)?`O relatório requer revisão. ${avisos.length?avisos.map(a=>String(a).replace(/[.\s]+$/,'')).join('. ')+'.':'Confira os achados divergentes ou os trechos do relato que precisam de revisão.'}`:'Relatório correlacionado à anamnese e ao exame. Revise a conclusão antes de finalizar.';
        const analiseRevisao=mudou||motorAnterior?construirPlanoNarrativo(d).analiseDocumental:laudo.semantica?.analiseDocumental;
        window.KineSysDocumentReview?.renderizar({host:document.getElementById('ks-laudo-revisao-documental'),analise:analiseRevisao,
            contexto:JSON.stringify(contextoAtual()),contextoAtual:()=>JSON.stringify(contextoAtual()),onRevisar:campo=>{
                if(!conferirContextoLaudo())return;
                if(typeof irParaSubtela==='function')irParaSubtela(campo==='subtela_mapeamento'?'subtela_mapeamento':'subtela_triagem');
                if(campo!=='subtela_mapeamento'){const origem=document.getElementById('paciente_hma');origem?.focus();origem?.scrollIntoView?.({block:'center',behavior:'smooth'});}
            }});
    };
    let workspaceInicializado=false;
    function inicializarWorkspaceAvaliacaoKineSys(){
        if(workspaceInicializado)return;
        const editor=document.getElementById('ks-laudo-texto'),review=document.getElementById('ks-laudo-revisado');
        if(!editor&&!review)return;
        workspaceInicializado=true;
        editor?.addEventListener('input',()=>{if(!conferirContextoLaudo()||!laudo)return;laudo.texto=editor.value;laudo.textoAutomatico=false;laudo.revisado=false;laudo.atualizadoEm=new Date().toISOString();if(review)review.checked=false;agendarAutosaveKineSys();});
        review?.addEventListener('change',()=>{if(!conferirContextoLaudo()||!laudo)return;if(review.checked&&(laudo.modo==='incompleto'||!laudo.texto.trim())){review.checked=false;document.getElementById('ks-laudo-status').textContent='Complete a anamnese e o exame antes de revisar o relatório.';return;}laudo.revisado=review.checked;if(review.checked)laudo.fonte=dadosAtuais().fonte;laudo.revisadoEm=review.checked?new Date().toISOString():null;agendarAutosaveKineSys();});
        document.getElementById('ks-laudo-atualizar')?.addEventListener('click',async()=>{
            conferirContextoLaudo();const contextoConfirmacao=contextoDoLaudo;
            if(laudo&&!(await confirmarKineSys('Substituir o texto atual por uma nova base da avaliação? Copie o texto antes se quiser preservar sua redação.',{titulo:'Atualizar base do laudo',confirmar:'Atualizar base'})))return;
            if(contextoConfirmacao!==JSON.stringify(contextoAtual()))return;
            laudo=textoBase(dadosAtuais());window.renderizarLaudoAvaliacaoKineSys();agendarAutosaveKineSys();
        });
        document.getElementById('ks-laudo-copiar')?.addEventListener('click',async()=>{if(!conferirContextoLaudo()||!laudo)return;const contextoCopia=contextoDoLaudo;garantirFechamentoLaudo({profissional:profissionalDoLaudo()});editor.value=laudo.texto;try{await navigator.clipboard.writeText(editor.value);if(contextoCopia===JSON.stringify(contextoAtual()))document.getElementById('ks-laudo-status').textContent='Texto copiado para a área de transferência.';}catch(_){if(contextoCopia!==JSON.stringify(contextoAtual()))return;editor.focus();editor.select();document.getElementById('ks-laudo-status').textContent='Texto selecionado. Use copiar no seu dispositivo.';}});
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

