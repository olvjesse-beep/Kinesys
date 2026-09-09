/* ========================================================================== 
   KINESYS CLINICAL ENGINE 2.4.0 — DIREÇÃO CLÍNICA ASSISTIDA
   --------------------------------------------------------------------------
   Objetivos:
   - o motor sugere; o fisioterapeuta decide;
   - segurança clínica é um gate global, não uma trava repetida por região;
   - a Síntese permanece sempre acessível;
   - somente segurança ativa não resolvida bloqueia a finalização;
   - fenótipo operacional e incerteza são desfechos válidos;
   - o Navegador usa sinais clínicos diretos e adaptadores regionais; não usa o ranking de doenças para sugerir rotas;
   - condições específicas ficam em biblioteca pesquisável e só entram na Síntese quando escolhidas pelo profissional;
   - a Síntese descreve eixos de investigação e achados compatíveis; não confirma diagnósticos;
   - profissão, esporte e "tipo de dor" não determinam o ranking;
   - pós-operatório prioriza recuperação e critérios de progressão em vez de caça diagnóstica.
   ========================================================================== */
(function kinesysClinicalEngine232(){
    'use strict';

    const baseObterEstadoRegiao = window.obterEstadoRegiao;
    const baseInferirFenotipo = window.inferirFenotipoOperacionalKineSys;
    const baseRegistrarAuditoriaMotor = window.registrarAuditoriaMotorKineSys;
    const baseRenderizarAlertasConsolidados = window.renderizarAlertasConsolidados;

    function regioesSelecionadas(){
        return Array.from(document.querySelectorAll('#grupo_regioes_mapeamento input:checked'))
            .map(i=>i.dataset.regiao)
            .filter(id=>id && typeof BANCO_MAPEAMENTO_CLINICO !== 'undefined' && BANCO_MAPEAMENTO_CLINICO[id]);
    }

    function normalizarEstadoRegiao(e){
        if(!e) return e;
        if(!e.modoDirecao) e.modoDirecao = e.incertezaClinicaAceita ? 'indeterminado' : (e.incertezaEspecifica ? 'fenotipo' : 'auto');
        if(!e.testesExpandidos || typeof e.testesExpandidos !== 'object') e.testesExpandidos = {};
        if(!Array.isArray(e.rotasAtivas)) e.rotasAtivas = e.rotaAtiva ? [e.rotaAtiva] : [];
        if(!Array.isArray(e.rotasIgnoradas)) e.rotasIgnoradas = [];
        if(typeof e.sugestoesRotasVisiveis!=='boolean') e.sugestoesRotasVisiveis = false;
        if(!e.rotasIgnoradasFingerprint) e.rotasIgnoradasFingerprint = '';
        if(!e.ferramentaEspecificaAtiva) e.ferramentaEspecificaAtiva = '';
        if(!Array.isArray(e.ferramentasInvestigadas)) e.ferramentasInvestigadas = [];
        if(!e.ultimaFerramentaInteragida) e.ultimaFerramentaInteragida = '';
        if(!e.hipoteseOrigem) e.hipoteseOrigem = '';
        if(!e.achadosSnapshot || typeof e.achadosSnapshot !== 'object') e.achadosSnapshot = {};
        if(!e.redflagsSnapshot || typeof e.redflagsSnapshot !== 'object') e.redflagsSnapshot = {};
        if(!e.ferramentaScrollPendente) e.ferramentaScrollPendente = '';
        if(typeof e.ferramentaBusca!=='string') e.ferramentaBusca='';
        return e;
    }

    window.obterEstadoRegiao = function(idRegiao){
        const e=normalizarEstadoRegiao(baseObterEstadoRegiao(idRegiao));
        migrarResultadosEstado232(idRegiao,e);
        return e;
    };

    function hashCurto232(valor=''){
        let h=2166136261>>>0; const str=String(valor||'');
        for(let i=0;i<str.length;i++){h^=str.charCodeAt(i);h=Math.imul(h,16777619)>>>0;}
        return h.toString(36);
    }
    function slug232(valor=''){
        return removerAcentos(String(valor||'')).toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_+|_+$/g,'').slice(0,54)||'achado';
    }
    function chaveAchadoEstavel232(grupo,item,teste){
        const texto=String(teste||'');
        return `finding::${grupo}::${item.id}::${slug232(texto)}_${hashCurto232(texto)}`;
    }
    function chaveRedFlagEstavel232(idRegiao,texto){
        const raw=String(texto||'');
        return `redflag::${idRegiao}::${slug232(raw)}_${hashCurto232(raw)}`;
    }
    function valorAchado232(estado,grupo,item,indice){
        const teste=(item.testes||[])[indice]||'';
        const estavel=chaveAchadoEstavel232(grupo,item,teste),legado=`${grupo}::${item.id}::${indice}`;
        if(Number(estado.resultadosSchemaVersion||0)>=2)return estado.resultados[estavel] ?? '';
        return estado.resultados[estavel] ?? estado.resultados[legado] ?? '';
    }
    function gravarAchado232(estado,grupo,item,indice,valor){
        const teste=(item.testes||[])[indice]||'', estavel=chaveAchadoEstavel232(grupo,item,teste), legado=`${grupo}::${item.id}::${indice}`;
        if(valor){estado.resultados[estavel]=valor;estado.resultados[legado]=valor;}
        else{delete estado.resultados[estavel];delete estado.resultados[legado];}
        estado.achadosSnapshot[estavel]={itemId:item.id,grupo,texto:teste,indiceOriginal:indice,atualizadoEm:new Date().toISOString()};
    }
    function valorRedFlag232(estado,idRegiao,texto,indice){
        const estavel=chaveRedFlagEstavel232(idRegiao,texto),legado='redflag::'+indice;
        if(Number(estado.resultadosSchemaVersion||0)>=2)return estado.resultados[estavel] ?? false;
        return estado.resultados[estavel] ?? estado.resultados[legado] ?? false;
    }
    function gravarRedFlag232(estado,idRegiao,texto,indice,valor){
        const estavel=chaveRedFlagEstavel232(idRegiao,texto),legado='redflag::'+indice;
        if(valor){estado.resultados[estavel]=true;estado.resultados[legado]=true;}
        else{delete estado.resultados[estavel];delete estado.resultados[legado];}
        estado.redflagsSnapshot[estavel]={texto:String(texto||''),indiceOriginal:indice,atualizadoEm:new Date().toISOString()};
    }

    function migrarResultadosEstado232(idRegiao,estado){
        if(!estado || Number(estado.resultadosSchemaVersion||0)>=2)return;
        const reg=typeof BANCO_MAPEAMENTO_CLINICO!=='undefined'?BANCO_MAPEAMENTO_CLINICO[idRegiao]:null;
        if(!reg){estado.resultadosSchemaVersion=2;return;}
        [...(reg.clusters||[]).map(item=>({grupo:'cluster',item})),...(reg.diferenciais||[]).map(item=>({grupo:'diferencial',item}))].forEach(({grupo,item})=>{
            (item.testes||[]).forEach((teste,i)=>{
                const legado=`${grupo}::${item.id}::${i}`,estavel=chaveAchadoEstavel232(grupo,item,teste);
                if(estado.resultados[estavel]===undefined && estado.resultados[legado]!==undefined)estado.resultados[estavel]=estado.resultados[legado];
                if(estado.resultados[estavel]!==undefined)estado.achadosSnapshot[estavel]={itemId:item.id,grupo,texto:String(teste||''),indiceOriginal:i,migradoEm:new Date().toISOString()};
            });
        });
        (reg.redFlags||[]).forEach((texto,i)=>{
            const legado='redflag::'+i,estavel=chaveRedFlagEstavel232(idRegiao,texto);
            if(estado.resultados[estavel]===undefined && estado.resultados[legado]!==undefined)estado.resultados[estavel]=estado.resultados[legado];
            if(estado.resultados[estavel]!==undefined)estado.redflagsSnapshot[estavel]={texto:String(texto||''),indiceOriginal:i,migradoEm:new Date().toISOString()};
        });
        estado.resultadosSchemaVersion=2;
    }
    function fingerprintContextoSeguranca232(contexto=coletarContextoClinico()){
        const material=[contexto?.hma||'',contexto?.origemIrradiacao||'',contexto?.irradiacao||'',contexto?.idade||'',contexto?.mecanismo||''].map(v=>removerAcentos(String(v)).replace(/\s+/g,' ').trim()).join('|');
        return hashCurto232(material);
    }

    // A partir do 2.3.2, a leitura prioriza IDs estáveis dos achados e mantém
    // fallback dos índices antigos para compatibilidade com avaliações existentes.
    window.analisarRespostasItem = function(estado,grupo,item){
        const respostas=(item.testes||[]).map((_,i)=>valorAchado232(estado,grupo,item,i)||'');
        const positivos=respostas.filter(r=>r==='positivo').length;
        const negativos=respostas.filter(r=>r==='negativo').length;
        const inconclusivos=respostas.filter(r=>r==='inconclusivo').length;
        const naoRealizados=respostas.filter(r=>r==='nao_realizado').length;
        const naoAplicaveis=respostas.filter(r=>r==='nao_aplicavel').length;
        const naoAvaliados=respostas.filter(r=>!r).length;
        const naoConclusivos=inconclusivos+naoRealizados+naoAplicaveis;
        const decisivos=positivos+negativos;
        return {respostas,positivos,negativos,inconclusivos,naoRealizados,naoAplicaveis,naoAvaliados,naoConclusivos,decisivos,respondidos:respostas.length-naoAvaliados,todosRespondidos:naoAvaliados===0};
    };

    function obterEstadoSegurancaGlobal(){
        if(!estadoMapeamento.__segurancaGlobal || typeof estadoMapeamento.__segurancaGlobal !== 'object'){
            estadoMapeamento.__segurancaGlobal = { revisada:false, fingerprint:'', revisadaEm:'', revisadaPor:'', decisoesTextuais:{} };
        }
        const g=estadoMapeamento.__segurancaGlobal;
        if(!g.decisoesTextuais || typeof g.decisoesTextuais!=='object') g.decisoesTextuais={};
        return g;
    }

    function alertasTextuaisGlobais(contexto=coletarContextoClinico()){
        try{return detectarAlertasTextuaisHMA(contexto)||[];}catch(_){return [];}
    }

    function alertasRegionais23(idRegiao,contexto=coletarContextoClinico()){
        const reg=BANCO_MAPEAMENTO_CLINICO[idRegiao], est=window.obterEstadoRegiao(idRegiao), out=[];
        (reg?.redFlags||[]).forEach((texto,i)=>{
            if(valorRedFlag232(est,idRegiao,texto,i)) out.push({id:`rf_${hashCurto232(texto)}`,tipo:'marcada',texto,titulo:'Pista regional'});
        });
        try{
            (alertasTextuaisParaRegiaoKineSys(contexto,idRegiao)||[])
                .filter(a=>String(a.id||'').startsWith('hipotese_gate_'))
                .filter(a=>{
                    const itemId=String(a.id).replace(/^hipotese_gate_/,'');
                    const item=[...(reg?.clusters||[]),...(reg?.diferenciais||[])].find(x=>x.id===itemId);
                    const meta=(typeof KINESYS_META_CRITERIOS_2!=='undefined'&&KINESYS_META_CRITERIOS_2[itemId])||null;
                    return !!(item && (item.regraConfirmacao || Number(item.limiar)>0 || meta));
                })
                .forEach(a=>out.push({id:a.id,tipo:'gate_clinico',texto:a.desc||a.titulo||a.id,titulo:a.titulo||'Pista clínica'}));
        }catch(_){ }
        const seen=new Set();
        return out.filter(a=>{if(seen.has(a.id))return false;seen.add(a.id);return true;});
    }

    function decisaoTextualGlobalValida(alerta,contexto=coletarContextoClinico()){
        const d=obterEstadoSegurancaGlobal().decisoesTextuais?.[alerta.id];
        return !!(d && d.conduta && d.contextFingerprint===fingerprintContextoSeguranca232(contexto));
    }

    function rotuloCondutaSeguranca(conduta){
        return ({
            revisada_sem_suspeita:'Revisado — não se confirma',
            continuar_monitorizacao:'Prosseguir com monitorização',
            continuar_com_cautela:'Prosseguir com monitorização',
            avaliacao_programada:'Encaminhamento programado',
            avaliacao_medica_programada:'Encaminhamento programado',
            encaminhamento_prioritario:'Encaminhamento prioritário',
            encaminhamento_imediato:'Encaminhamento imediato',
            encaminhamento_urgente:'Encaminhamento imediato'
        })[conduta]||conduta||'Pendente';
    }

    function resumoSegurancaGlobal23(contexto=coletarContextoClinico()){
        const g=obterEstadoSegurancaGlobal();
        const globais=alertasTextuaisGlobais(contexto).map(a=>{
            const d=g.decisoesTextuais?.[a.id]||{};
            return {
                id:a.id,
                titulo:a.titulo||'Pista de segurança',
                descricao:a.desc||'',
                resolvida:decisaoTextualGlobalValida(a,contexto),
                conduta:d.conduta||'',
                condutaTexto:rotuloCondutaSeguranca(d.conduta),
                justificativa:d.justificativa||'',
                em:d.em||'',
                por:d.por||''
            };
        });
        const regionais={};
        regioesSelecionadas().forEach(id=>{
            const pistas=alertasRegionais23(id,contexto);
            if(!pistas.length)return;
            const est=window.obterEstadoRegiao(id);
            regionais[id]={
                regiao:BANCO_MAPEAMENTO_CLINICO[id]?.nome||id,
                pistas:pistas.map(p=>({id:p.id,titulo:p.titulo||'Pista regional',descricao:p.texto||''})),
                resolvida:decisaoRegiaoAtual(id,contexto),
                conduta:est.redflagConduta||'',
                condutaTexto:rotuloCondutaSeguranca(est.redflagConduta),
                justificativa:est.redflagJustificativa||''
            };
        });
        const fp=fingerprintGlobal(contexto);
        const semPistas=!globais.length&&!Object.keys(regionais).length;
        const revisada=semPistas
            ? !!g.revisada&&g.fingerprint===fp
            : globais.every(x=>x.resolvida)&&Object.values(regionais).every(x=>x.resolvida);
        return {
            revisada,
            fingerprint:fp,
            revisadaEm:g.revisadaEm||'',
            revisadaPor:g.revisadaPor||'',
            pistasGlobais:globais,
            pistasRegionais:regionais
        };
    }

    function fingerprintSegurancaRegional23(idRegiao,contexto=coletarContextoClinico()){
        return JSON.stringify(alertasRegionais23(idRegiao,contexto).map(a=>a.id).sort());
    }

    function decisaoRegiaoAtual(id,contexto=coletarContextoClinico()){
        const est=window.obterEstadoRegiao(id);
        const pistas=alertasRegionais23(id,contexto);
        if(!pistas.length) return true;
        return !!est.redflagAcknowledge && est.safetyFingerprint===fingerprintSegurancaRegional23(id,contexto);
    }

    function pistasSeguranca(contexto=coletarContextoClinico()){
        const out=alertasTextuaisGlobais(contexto).map(a=>({
            idRegiao:'__global',regiao:'Avaliação',tipo:'textual_global',id:a.id,texto:a.desc||a.titulo||a.id,titulo:a.titulo||'Pista de segurança'
        }));
        regioesSelecionadas().forEach(id=>{
            alertasRegionais23(id,contexto).forEach(a=>out.push({idRegiao:id,regiao:BANCO_MAPEAMENTO_CLINICO[id]?.nome||id,...a}));
        });
        const seen=new Set();
        return out.filter(p=>{const k=`${p.idRegiao}|${p.tipo}|${p.id}`;if(seen.has(k))return false;seen.add(k);return true;});
    }

    function fingerprintGlobal(contexto=coletarContextoClinico()){
        const globais=alertasTextuaisGlobais(contexto).map(a=>a.id).sort();
        const regionais=regioesSelecionadas().sort().map(id=>({id,fp:fingerprintSegurancaRegional23(id,contexto)}));
        return JSON.stringify({ctx:fingerprintContextoSeguranca232(contexto),globais,regionais});
    }

    function pistasPorRegiao(contexto=coletarContextoClinico()){
        const mapa={};
        regioesSelecionadas().forEach(id=>{const p=alertasRegionais23(id,contexto);if(p.length)mapa[id]=p;});
        return mapa;
    }

    function todasPistasResolvidas(contexto=coletarContextoClinico()){
        const globais=alertasTextuaisGlobais(contexto);
        if(globais.some(a=>!decisaoTextualGlobalValida(a,contexto))) return false;
        return Object.keys(pistasPorRegiao(contexto)).every(id=>decisaoRegiaoAtual(id,contexto));
    }

    function marcarSegurancaGlobalRevisada(contexto=coletarContextoClinico()){
        const global=obterEstadoSegurancaGlobal(), agora=new Date().toISOString();
        global.revisada=true;global.fingerprint=fingerprintGlobal(contexto);global.revisadaEm=agora;global.revisadaPor=usuarioLogado?.nome||'';
        regioesSelecionadas().forEach(id=>{
            const e=window.obterEstadoRegiao(id);
            if(!alertasRegionais23(id,contexto).length){e.redflagsRevisadas=true;e.safetyFingerprint=fingerprintSegurancaRegional23(id,contexto);}
        });
        agendarAutosaveKineSys();
    }

    function invalidarSegurancaGlobal(){
        const g=obterEstadoSegurancaGlobal();g.revisada=false;g.fingerprint='';g.revisadaEm='';
    }

    function registrarDecisaoTextualGlobal(alerta,conduta,justificativa=''){
        const g=obterEstadoSegurancaGlobal();
        const contexto=coletarContextoClinico();
        g.decisoesTextuais[alerta.id]={conduta,justificativa:String(justificativa||'').trim(),em:new Date().toISOString(),por:usuarioLogado?.nome||'',contextFingerprint:fingerprintContextoSeguranca232(contexto)};
        invalidarSegurancaGlobal();
        const ctx=contexto;
        if(todasPistasResolvidas(ctx)) marcarSegurancaGlobalRevisada(ctx);
        agendarAutosaveKineSys();
    }

    window.confirmarSegurancaGlobalKineSys = function(){
        const contexto=coletarContextoClinico();
        if(!todasPistasResolvidas(contexto)){
            alert('Há pista de segurança sem decisão clínica registrada.');return false;
        }
        marcarSegurancaGlobalRevisada(contexto);window.renderizarMapeamentoRegioes();window.renderizarAlertasConsolidados?.();return true;
    };

    window.validarSegurancaParaFinalizacao = function(){
        const contexto=coletarContextoClinico();
        const globais=alertasTextuaisGlobais(contexto);
        const pendenteGlobal=globais.find(a=>!decisaoTextualGlobalValida(a));
        if(pendenteGlobal) return {ok:false,tipo:'pista_global',mensagem:`Pista de segurança sem decisão: ${pendenteGlobal.titulo||pendenteGlobal.id}.`};
        const por=pistasPorRegiao(contexto);
        for(const id of Object.keys(por)){
            if(!decisaoRegiaoAtual(id,contexto)) return {ok:false,tipo:'pista_regional',mensagem:`Há pista de segurança em ${BANCO_MAPEAMENTO_CLINICO[id].nome} sem decisão clínica registrada.`};
        }
        const g=obterEstadoSegurancaGlobal(), fp=fingerprintGlobal(contexto);
        if(!globais.length && !Object.keys(por).length && (!g.revisada || g.fingerprint!==fp)){
            return {ok:false,tipo:'revisao_global',mensagem:'Revisão de segurança pendente.'};
        }
        if((globais.length||Object.keys(por).length) && todasPistasResolvidas(contexto) && (!g.revisada||g.fingerprint!==fp)) marcarSegurancaGlobalRevisada(contexto);
        return {ok:true};
    };

    function construirPainelSegurancaGlobal(contexto){
        // Segurança continua obrigatória, mas sai do topo do fluxo para não
        // competir com o exame. O profissional abre o detalhe somente quando
        // precisa revisar uma pista ou registrar a confirmação final.
        const box=document.createElement('section');box.className='ks-safety-global ks-safety-dock';
        const globais=alertasTextuaisGlobais(contexto), por=pistasPorRegiao(contexto), g=obterEstadoSegurancaGlobal(), fp=fingerprintGlobal(contexto);
        const temPistas=globais.length||Object.keys(por).length;
        const regioesPendentes=Object.keys(por).filter(id=>!decisaoRegiaoAtual(id,contexto));
        const globaisPendentes=globais.filter(a=>!decisaoTextualGlobalValida(a,contexto)).length;
        const totalPendencias=globaisPendentes+regioesPendentes.length;
        const pistasResolvidas=!!temPistas&&!totalPendencias;
        const revisada=!temPistas&&g.revisada&&g.fingerprint===fp;
        const action=document.createElement('div');action.className='ks-safety-action';
        const copy=document.createElement('div');copy.className='ks-safety-action-copy';
        const kicker=document.createElement('span');kicker.className='ks-kicker';kicker.textContent='SEGURANÇA';
        const title=document.createElement('strong');title.textContent='Revisão de segurança clínica';
        const state=document.createElement('small');state.textContent=revisada?'Sem pistas ativas — revisão registrada':totalPendencias?`${totalPendencias} pista(s) aguardando revisão`:pistasResolvidas?'Pistas revisadas — abra para conferir':'Nenhuma pista ativa — confirme para encerrar a etapa';
        copy.append(kicker,title,state);action.appendChild(copy);
        const panel=document.createElement('div');panel.className='ks-safety-panel';panel.id='ks_safety_panel';panel.hidden=true;
        const toggle=document.createElement('button');toggle.type='button';toggle.className='btn-secondary ks-safety-toggle';toggle.setAttribute('aria-controls',panel.id);toggle.setAttribute('aria-expanded','false');toggle.textContent=!temPistas&&!revisada?'Confirmar revisão':pistasResolvidas?'Ver revisão':'Revisar segurança';
        action.appendChild(toggle);box.append(action,panel);
        const setPanelState=open=>{panel.hidden=!open;toggle.setAttribute('aria-expanded',String(open));box.classList.toggle('is-open',open);};
        toggle.addEventListener('click',()=>{
            if(!temPistas&&!revisada){window.confirmarSegurancaGlobalKineSys();return;}
            setPanelState(panel.hidden);
        });
        if(globais.length){
            box.classList.add(globais.every(a=>decisaoTextualGlobalValida(a,contexto))?'ok':'alerta');
            const list=document.createElement('div');list.className='ks-global-safety-list';
            globais.forEach(a=>{
                const d=g.decisoesTextuais?.[a.id]||{};
                const valida=decisaoTextualGlobalValida(a,contexto);const row=document.createElement('div');row.className='ks-global-safety-row'+(valida?' resolvida':'');
                const copy=document.createElement('div');copy.className='ks-global-safety-copy';copy.innerHTML=`<strong>${escapeHTML(a.titulo||'Pista de segurança')}</strong><span>${escapeHTML(a.desc||'')}</span>`;
                const controls=document.createElement('div');controls.className='ks-global-safety-controls';
                const sel=document.createElement('select');
                [['','Definir conduta'],['revisada_sem_suspeita','Revisado — não se confirma'],['continuar_monitorizacao','Prosseguir com monitorização'],['avaliacao_programada','Encaminhamento programado'],['encaminhamento_prioritario','Encaminhamento prioritário'],['encaminhamento_imediato','Encaminhamento imediato']].forEach(([v,t])=>{const o=document.createElement('option');o.value=v;o.textContent=t;if(d.conduta===v)o.selected=true;sel.appendChild(o);});
                const inp=document.createElement('input');inp.type='text';inp.placeholder='Justificativa clínica';inp.value=d.justificativa||'';
                const btn=document.createElement('button');btn.type='button';btn.className='btn-secondary';btn.textContent=valida?'Atualizar':'Registrar revisão';
                btn.addEventListener('click',()=>{if(!sel.value){alert('Defina a conduta clínica.');return;}if(sel.value==='revisada_sem_suspeita'&&inp.value.trim().length<5){alert('Registre uma justificativa clínica breve.');return;}registrarDecisaoTextualGlobal(a,sel.value,inp.value);window.renderizarMapeamentoRegioes();window.renderizarAlertasConsolidados?.();});
                controls.append(sel,inp,btn);row.append(copy,controls);list.appendChild(row);
            });
            panel.appendChild(list);
        }
        if(regioesPendentes.length){const p=document.createElement('div');p.className='ks-safety-regional-pending';p.textContent='Revisão regional: '+regioesPendentes.map(id=>BANCO_MAPEAMENTO_CLINICO[id].nome).join(' · ');panel.appendChild(p);box.classList.add('alerta');}
        if(!temPistas){
            if(revisada){box.classList.add('ok');const s=document.createElement('div');s.className='ks-safety-compact-status';s.textContent='Revisada — sem pistas ativas';panel.appendChild(s);}
            else{box.classList.add('pendente');}
        }else if(todasPistasResolvidas(contexto)){
            if(!g.revisada||g.fingerprint!==fp) marcarSegurancaGlobalRevisada(contexto);
            const s=document.createElement('div');s.className='ks-safety-compact-status';s.textContent='Pistas revisadas';panel.appendChild(s);box.classList.add('ok');
        }
        return box;
    }

    function termoNaoNegadoRegiao23(texto,termo){
        const q=removerAcentos(String(termo||'')).trim();
        if(q.length<3)return false;
        const src=escaparRegexKineSys(q).replace(/\\ /g,'\\s+');
        return matchNaoNegado23(texto,new RegExp(`(^|[^a-z0-9])${src}($|[^a-z0-9])`,'i'));
    }

    function rankingRegioes(contexto){
        const texto=removerAcentos([contexto?.hma||'',contexto?.origemIrradiacao||'',contexto?.irradiacao||''].join(' '));
        return Object.keys(BANCO_MAPEAMENTO_CLINICO).map(id=>{
            const reg=BANCO_MAPEAMENTO_CLINICO[id];let score=0;
            (reg.palavrasChave||[]).forEach(p=>{if(termoNaoNegadoRegiao23(texto,p))score+=1;});
            return {id,nome:reg.nome,score,fonte:'historia',fen:window.inferirFenotipoOperacionalKineSys(id,contexto)};
        }).filter(x=>x.score>0).sort((a,b)=>b.score-a.score);
    }

    function regioesAvaliacaoAnterior23(){
        const detalhes=mapeamentoAvaliacaoAnterior?.detalhes||{};
        return Object.keys(detalhes)
            .filter(id=>id!=='__segurancaGlobal'&&BANCO_MAPEAMENTO_CLINICO[id])
            .map(id=>({id,nome:BANCO_MAPEAMENTO_CLINICO[id].nome,score:.45,fonte:'avaliacao_anterior'}));
    }

    function sugestoesRegiao23(contexto){
        const mapa=new Map();
        rankingRegioes(contexto).forEach(x=>mapa.set(x.id,x));
        regioesAvaliacaoAnterior23().forEach(x=>{if(!mapa.has(x.id))mapa.set(x.id,x);});
        return [...mapa.values()].sort((a,b)=>b.score-a.score).slice(0,4);
    }

    window.selecionarRegiaoSugeridaKineSys = function(id){
        const chk=document.getElementById('chk_regiao_'+id);if(!chk)return;
        chk.checked=true;chk.dataset.tocadoManualmente='true';
        invalidarSegurancaGlobal();
        window.renderizarMapeamentoRegioes();
    };

    const KINESYS_ROTAS_EXAME_23 = {
        neurologica:{id:'neurologica',nome:'Neurológica',resumo:'Exame neurológico quando sinais/sintomas justificam.',achados:['Sensibilidade e distribuição dos sintomas','Força / miótomos quando pertinentes','Reflexos quando indicados','Neurodinâmica somente se acrescentar decisão']},
        carga_capacidade:{id:'carga_capacidade',nome:'Carga / capacidade',resumo:'Capacidade relacionada à tarefa e à carga.',achados:['Tarefa que reproduz a queixa familiar','Força / capacidade comparativa relevante','Dose necessária para provocar sintomas','Resposta ao modificar a carga']},
        mobilidade_articular:{id:'mobilidade_articular',nome:'Mobilidade / articular',resumo:'Mobilidade relevante para a função.',achados:['ADM ativa e passiva pertinente','Qualidade e limite do movimento','Reprodução da queixa familiar','Mudança funcional após modificar mobilidade quando pertinente']},
        pos_operatorio_trauma:{id:'pos_operatorio_trauma',nome:'Pós-operatório / trauma',resumo:'Estágio, restrições e progressão funcional.',achados:['Procedimento/trauma e estágio atual','Restrições e integridade tecidual','ADM e função esperadas para a fase','Critérios de progressão']},
        referida_integracao:{id:'referida_integracao',nome:'Origem referida / integração regional',resumo:'Comparação entre região sintomática e possível origem associada.',achados:['Reprodução local da queixa familiar','Modulação pela região potencialmente relacionada','Comparação de movimento/carga entre regiões','Manter origens paralelas se causalidade não estiver demonstrada']},
        geral:{id:'geral',nome:'Exame geral / investigação em aberto',resumo:'Linha de base quando nenhum eixo domina.',achados:['Tarefa que reproduz a queixa principal','ADM/força somente onde forem úteis','Uma medida funcional reavaliável','Síntese clínica sem condição específica selecionada']}
    };

    const KINESYS_ADAPTADORES_ROTAS_23 = {
        cervical:[['neurologica','Neurológica'],['mobilidade_articular','Mobilidade cervical'],['carga_capacidade','Carga / tolerância']],
        cefaleia:[['referida_integracao','Cervical / ATM'],['neurologica','Neurológica'],['geral','Fenótipo de cefaleia']],
        atm:[['mobilidade_articular','Mobilidade mandibular'],['carga_capacidade','Muscular / carga'],['referida_integracao','Cervical / orofacial']],
        ombro:[['carga_capacidade','Carga / capacidade'],['mobilidade_articular','Mobilidade glenoumeral'],['referida_integracao','Cervical / referida']],
        lombar:[['neurologica','Neurológica'],['mobilidade_articular','Mobilidade / movimento'],['carga_capacidade','Carga / capacidade']],
        joelho:[['carga_capacidade','Carga / capacidade'],['mobilidade_articular','Mobilidade articular'],['pos_operatorio_trauma','Trauma / pós-operatório']],
        quadril:[['mobilidade_articular','Mobilidade do quadril'],['carga_capacidade','Carga / capacidade'],['referida_integracao','Lombar / referida']],
        tornozelo_pe:[['mobilidade_articular','Mobilidade / deformidade'],['carga_capacidade','Carga / propulsão'],['neurologica','Neurológica']],
        cotovelo:[['carga_capacidade','Carga / tendão'],['mobilidade_articular','Mobilidade articular'],['neurologica','Neurológica']],
        punho_mao:[['mobilidade_articular','Mobilidade / tendão / deformidade'],['carga_capacidade','Carga / função manual'],['neurologica','Neurológica']],
        coluna_toracica:[['mobilidade_articular','Mobilidade torácica'],['carga_capacidade','Carga / parede torácica'],['referida_integracao','Origem referida / integração']]
    };

    function rotaParaRegiao(idRegiao,idRota){
        const base=KINESYS_ROTAS_EXAME_23[idRota];if(!base)return null;
        const adapt=KINESYS_ADAPTADORES_ROTAS_23[idRegiao]?.find(x=>x[0]===idRota);
        return {...base,nome:adapt?.[1]||base.nome};
    }

    function textoContextoRota(contexto){return removerAcentos([contexto?.hma||'',contexto?.origemIrradiacao||'',contexto?.irradiacao||''].join(' '));}
    function matchNaoNegado23(texto,regex){try{return regexTemMatchNaoNegado(texto,regex);}catch(_){return regex.test(texto);}}

    // Parser factual 2.3.2: a negação é avaliada no termo clínico em si,
    // e não no início de uma regex composta. Isso evita casos como
    // "cefaleia, nega visão dupla" e "sem febre e com falta de ar".
    function fatoNaoNegado232(texto,regex){
        const src=String(texto||'');
        const flags=regex.flags.includes('g')?regex.flags:regex.flags+'g';
        const re=new RegExp(regex.source,flags);let m;
        while((m=re.exec(src))!==null){
            const antes=src.slice(Math.max(0,m.index-90),m.index);
            const partes=antes.split(/(?:[.;!?\n]|\bmas\b|\bporem\b|\bcontudo\b|\bentretanto\b|\btodavia\b|\be\s+com\b|\bcom\b|\bapresenta\b|\bapresentou\b|\brefere\b|\breferiu\b|\brelata\b|\brelatou\b|\bpossui\b|\bobserva\b|\bobservou\b|\bevolui\s+com\b|\bassociad[oa]\s+a\b)/);
            const trecho=(partes[partes.length-1]||'').trim();
            const palavras=trecho.split(/\s+/).filter(Boolean).slice(-9).join(' ');
            const neg=/(?:\bnega\b|\bnegou\b|\bsem\b|\bnao\s+(?:apresenta|apresentou|refere|referiu|relata|relatou|tem|possui|observa|observou)|\bausencia\s+de\b|\bausente\b)/.test(palavras);
            if(!neg)return true;
            if(m[0].length===0)re.lastIndex++;
        }
        return false;
    }
    function contextoTem232(t,regex){return fatoNaoNegado232(t,regex);}

    window.detectarAlertasTextuaisHMA = function(contexto){
        const t=removerAcentos([contexto?.hma||'',contexto?.irradiacao||'',contexto?.origemIrradiacao||''].join(' '));
        const alertas=[],push=(id,titulo,desc,cond,regioes=null)=>{if(cond)alertas.push({id,titulo,desc,regioes});};
        const tem=(re)=>contextoTem232(t,re);

        const panturrilha=tem(/\bpanturrilha\b|\bperna\b/), edema=tem(/\bedema\b|\binchaco\b|\binchada\b|\binchado\b/), unilateral=tem(/\bunilateral\b|\bum lado\b/), riscoTrombo=tem(/pos.?operator|cirurgia recente|imobiliz|historico.*(?:tvp|tromb)|viagem longa|anticoncepcional|cancer ativo/), dorPanturrilha=tem(/dor[^.;!?\n]{0,35}panturrilha|panturrilha[^.;!?\n]{0,35}dor/);
        push('vascular_mmii','Possível alerta vascular em membro inferior','Dor/edema de panturrilha ou edema unilateral exige revisão clínica de TVP/complicações vasculares, especialmente no pós-operatório.',panturrilha&&((edema&&unilateral)||(dorPanturrilha&&(edema||riscoTrombo))),['lombar','quadril','joelho','tornozelo_pe']);

        const dispneia=tem(/falta de ar|dispneia|dificuldade[^.;!?\n]{0,25}respirar/),dorToracResp=tem(/dor toracica[^.;!?\n]{0,35}respir/);
        push('tep','Possível comprometimento cardiorrespiratório','Dispneia súbita, dor torácica ou falta de ar requerem triagem imediata conforme contexto.',dispneia||dorToracResp);

        const febre=tem(/\bfebre\b/),secrecao=tem(/secrecao[^.;!?\n]{0,30}ferida|pus|ferida[^.;!?\n]{0,25}abriu|calor[^.;!?\n]{0,25}ferida|rubor[^.;!?\n]{0,25}ferida/);
        push('infeccao_posop','Possível complicação infecciosa','Febre, secreção, calor/rubor progressivo ou piora sistêmica no pós-operatório devem ser revistos.',febre||secrecao);

        const sela=tem(/anestesia[^.;!?\n]{0,25}sela/),urin=tem(/perda[^.;!?\n]{0,25}urina|retencao[^.;!?\n]{0,25}urina/),fecal=tem(/incontinencia[^.;!?\n]{0,25}fecal/),bilateral=tem(/fraqueza[^.;!?\n]{0,35}(?:duas pernas|bilateral)/);
        push('cauda_equina','Possível síndrome de cauda equina','Alteração esfincteriana, anestesia em sela ou déficit bilateral/progressivo exige triagem urgente.',sela||urin||fecal||bilateral,['lombar']);

        const fraq=tem(/fraqueza|perda[^.;!?\n]{0,20}forca/),prog=tem(/piorando|progressiv|progressao/),paralis=tem(/paralis/);
        push('neurologico_progressivo','Déficit neurológico progressivo','Perda progressiva de força ou função neurológica requer reavaliação de prioridade.',paralis||(fraq&&prog));

        const medular=tem(/marcha[^.;!?\n]{0,25}(?:alter|atax|instavel)|desequilibr|perda[^.;!?\n]{0,25}destreza|maos?[^.;!?\n]{0,25}(?:desajeitad|travad)|deixando[^.;!?\n]{0,35}objetos[^.;!?\n]{0,15}cair|hiperreflexia|hoffmann|babinski|quatro membros/);
        push('mielopatia_cervical','Possível comprometimento medular cervical','Alteração de marcha/equilíbrio, perda de destreza manual, mãos desajeitadas ou sinais de neurônio motor superior requerem revisão neurológica prioritária.',medular,['cervical']);

        const superior=tem(/mandib|pescoco|cervical|ombro|braco|peito|torac/),esforco=tem(/esforco|exercicio|caminh|subir escada|corrida|atividade fisica/),autonomico=dispneia||tem(/sudorese|suor frio|nausea|opressao|pressao no peito|aperto no peito/);
        push('possivel_isquemia_cardiaca_referida','Dor superior associada ao esforço + sintomas autonômicos','Dor em mandíbula, pescoço, ombro/braço ou tórax relacionada ao esforço e acompanhada de dispneia, sudorese, náusea ou opressão exige triagem médica urgente para causa cardiovascular.',superior&&esforco&&autonomico,['cervical','atm','ombro','coluna_toracica']);

        const cefaleia=tem(/cefaleia|dor (?:de|na) cabeca|enxaqueca|migranea/);
        if(cefaleia){
            const subita=tem(/subit|repentin|explosiv|pior[^.;!?\n]{0,20}vida|em segundos/);
            push('cefaleia_subita','Cefaleia de início súbito / padrão explosivo','Cefaleia que atinge intensidade máxima abruptamente ou é descrita como muito diferente do habitual exige avaliação médica urgente.',subita,['cefaleia']);
            const neuroVisual=tem(/visao dupla|perda[^.;!?\n]{0,25}visao|fraqueza[^.;!?\n]{0,25}lado|fala[^.;!?\n]{0,20}enrol|confus|desmaio|convuls|horner|ataxia/);
            push('cefaleia_neurologica','Cefaleia com sinal neurológico/visual','Alteração neurológica focal, consciência, fala, visão ou convulsão associada à cefaleia exige revisão médica prioritária.',neuroVisual,['cefaleia']);
            const sistemica=febre||tem(/rigidez[^.;!?\n]{0,20}nuca|rigidez[^.;!?\n]{0,25}cervical[^.;!?\n]{0,15}intensa/);
            push('cefaleia_sistemica','Cefaleia com sinais sistêmicos','Febre, rigidez cervical importante ou comprometimento sistêmico associados à cefaleia precisam de triagem para causa secundária.',sistemica,['cefaleia']);
            const gca=(Number(contexto?.idade||0)>=50)&&(tem(/claudicacao[^.;!?\n]{0,25}mandib|cansa[^.;!?\n]{0,25}mastig/)||tem(/perda[^.;!?\n]{0,20}visao|visao[^.;!?\n]{0,20}turv|amaurose|sensibilidade[^.;!?\n]{0,25}couro[^.;!?\n]{0,20}cabeludo/));
            push('arterite_celulas_gigantes','Cefaleia + possível sinal de arterite de células gigantes','Em pessoas com 50 anos ou mais, nova cefaleia associada a claudicação mandibular, sintomas visuais ou sensibilidade do couro cabeludo requer avaliação médica urgente.',gca,['cefaleia','atm']);
            const ocular=tem(/olho vermelho|dor ocular|dor no olho/),visualOcular=tem(/visao emba|halos/),nausea=tem(/nausea/);
            push('glaucoma_agudo_rastreamento','Cefaleia + dor ocular/alteração visual','Dor ocular intensa, olho vermelho e alteração visual/halos com cefaleia podem indicar emergência oftalmológica e exigem avaliação médica imediata.',ocular&&visualOcular&&(nausea||cefaleia),['cefaleia']);
            const dorCervNova=tem(/dor cervical|dor no pescoco|nuca/)&&(tem(/subit|repentin|nova|diferente/)),sinalVasc=tem(/horner|ptose|pupila|visao dupla|ataxia|fala|fraqueza/);
            push('vascular_cervical_rastreamento','Possível condição vascular cervical/craniana','Dor cervical/cefaleia nova ou incomum associada a sinais neurológicos/oculossimpáticos exige avaliação médica urgente; não usar testes posicionais como método de exclusão.',(dorCervNova||cefaleia)&&sinalVasc,['cervical','cefaleia']);
        }
        const ombrosBilat=tem(/dois ombros|ambos[^.;!?\n]{0,15}ombros|ombros[^.;!?\n]{0,15}bilateral|bilateral[^.;!?\n]{0,15}ombros/),rigidezMatinal=tem(/rigidez matinal|rigidez[^.;!?\n]{0,20}manha|mais de 45 minutos|45 min/);
        push('polimialgia_reumatica_rastreamento','Dor bilateral nos ombros + rigidez matinal em pessoa ≥50 anos','Esse padrão merece investigação médica para polimialgia reumática, principalmente se houver sintomas sistêmicos ou marcadores inflamatórios alterados.',Number(contexto?.idade||0)>=50&&ombrosBilat&&rigidezMatinal,['ombro']);
        return alertas;
    };
    function fingerprintRotas23(idRegiao,contexto){
        const e=window.obterEstadoRegiao(idRegiao);
        const exame=(e.ferramentasInvestigadas||[]).map(k=>{const c=ferramentaPorChave232(idRegiao,k);return c?`${k}:${statusHipoteseKineSys(idRegiao,c)}`:k;}).sort();
        return JSON.stringify({idRegiao,mecanismo:contexto?.mecanismo||'',fatores:[...(contexto?.fatoresPiora||[])].sort(),origem:contexto?.origemIrradiacao||'',irradiacao:contexto?.irradiacao||'',hma:removerAcentos(contexto?.hma||'').slice(0,700),exame});
    }

    function pontuacaoDiretaRota(idRota,idRegiao,contexto){
        const texto=textoContextoRota(contexto),hma=removerAcentos(contexto?.hma||''),top=contexto?.topologia||{};let p=idRota==='geral'?.2:0;
        const positivas=ferramentasPositivasInvestigadas232(idRegiao);
        positivas.forEach(c=>{if(rotaProvavelFerramenta232(c.item)===idRota)p+=3.5;});
        if(idRota==='pos_operatorio_trauma'){
            if(obterCirurgiaRelacionadaRegiao(idRegiao))p+=10;
            if(contexto?.mecanismo==='pos_cirurgico')p+=8;
            if(contexto?.mecanismo==='trauma_agudo')p+=2.5;
        }
        if(idRota==='neurologica'){
            const sintomaNeural=matchNaoNegado23(texto,/formig|dormen|parestes|choque|eletric|fraqueza|perda de forca|alteracao sens|queimacao neural|reflexo/);
            if(sintomaNeural)p+=4.5;
            if(sintomaNeural&&(contexto?.irradiacao||'').trim())p+=1.5;
            if((contexto?.irradiacao||'').trim()&&!sintomaNeural)p+=0.35;
        }
        if(idRota==='carga_capacidade'){
            if(contexto?.mecanismo==='esforco_repetitivo')p+=2.5;
            if((contexto?.fatoresPiora||[]).includes('carga'))p+=3;
            if((contexto?.fatoresPiora||[]).includes('movimento'))p+=1;
            if(matchNaoNegado23(texto,/carga|forca|esforc|corr|agach|subir|levantar|empurr|puxar|repet|arremess|saltar/))p+=1.5;
        }
        if(idRota==='mobilidade_articular'){
            if((contexto?.fatoresPiora||[]).includes('movimento'))p+=1;
            if(matchNaoNegado23(hma,/rigid|trav|limit|amplitude|mobil|nao consegue mexer|nao dobra|nao estica|contratura|deform|joanete|halux valgo|hallux valgus|halux rigid|hallux rigid|dedo em gatilho|dedo em garra|dedo em martelo|dupuytren|equinismo/))p+=4;
        }
        if(idRota==='referida_integracao'){
            const pares=(top.pares||[]).filter(x=>x.origem===idRegiao||x.destino===idRegiao);
            if(pares.length)p+=2.2;
            if(matchNaoNegado23(texto,/referid|irradia|propaga|vem do|comeca no/))p+=.8;
        }
        return p;
    }

    function sugerirRotasRegiao(idRegiao,contexto=coletarContextoClinico()){
        const estado=window.obterEstadoRegiao(idRegiao), fp=fingerprintRotas23(idRegiao,contexto);
        if(estado.rotasIgnoradasFingerprint && estado.rotasIgnoradasFingerprint!==fp){estado.rotasIgnoradas=[];estado.rotasIgnoradasFingerprint='';}
        const ignoradas=new Set(estado.rotasIgnoradas||[]), adapt=[...(KINESYS_ADAPTADORES_ROTAS_23[idRegiao]||[['carga_capacidade'],['mobilidade_articular'],['neurologica']])];
        const scorePos=pontuacaoDiretaRota('pos_operatorio_trauma',idRegiao,contexto);
        if(scorePos>=2 && !adapt.some(x=>x[0]==='pos_operatorio_trauma')) adapt.unshift(['pos_operatorio_trauma','Pós-operatório / trauma']);
        let rotas=adapt.map(([id,nome])=>({...rotaParaRegiao(idRegiao,id),nome:nome||rotaParaRegiao(idRegiao,id)?.nome,score:Math.round(pontuacaoDiretaRota(id,idRegiao,contexto)*10)/10})).filter(r=>r.id&&!ignoradas.has(r.id));
        rotas.sort((a,b)=>b.score-a.score);
        const relevantes=rotas.filter(r=>r.score>=1.15).slice(0,3);
        if(!relevantes.length){
            const geral=rotaParaRegiao(idRegiao,'geral')||KINESYS_ROTAS_EXAME_23.geral;
            return [{...geral,score:.2}];
        }
        return relevantes;
    }

    function rotasSelecionadasEstado(estado){
        let rotas=(estado.rotasAtivas||[]).filter(id=>KINESYS_ROTAS_EXAME_23[id]);
        // "Exame geral / indefinido" é uma alternativa à direção específica,
        // não uma rota para coexistir com outras.
        if(rotas.includes('geral')&&rotas.length>1)rotas=rotas.filter(id=>id!=='geral');
        if(rotas.length!==((estado.rotasAtivas||[]).length))estado.rotasAtivas=[...rotas];
        return rotas.slice(0,3);
    }

    function alternarRota(idRegiao,idRota){
        const e=window.obterEstadoRegiao(idRegiao), atuais=rotasSelecionadasEstado(e);
        if(idRota==='geral'){
            e.rotasAtivas=atuais.includes('geral')?[]:['geral'];
        }else{
            const especificas=atuais.filter(x=>x!=='geral');
            if(especificas.includes(idRota)) e.rotasAtivas=especificas.filter(x=>x!==idRota);
            else if(especificas.length<3) e.rotasAtivas=[...especificas,idRota];
            else { alert('Mantenha no máximo 3 direções simultâneas. Retire uma antes de adicionar outra.'); return; }
        }
        e.modoDirecao=e.rotasAtivas.length?'rotas':'auto';
        e.hipotesePrincipalAtiva=null;e.idClusterSuspeitaEscolhido=null;e.diferencialAtivo=null;
        e.incertezaClinicaAceita=false;e.incertezaEspecifica=false;
        renderizarMapeamentoRegioes();agendarAutosaveKineSys();
    }

    function ignorarRota(idRegiao,idRota){
        const e=window.obterEstadoRegiao(idRegiao),ctx=coletarContextoClinico();
        if(!(e.rotasIgnoradas||[]).includes(idRota))e.rotasIgnoradas.push(idRota);
        e.rotasIgnoradasFingerprint=fingerprintRotas23(idRegiao,ctx);
        e.rotasAtivas=(e.rotasAtivas||[]).filter(x=>x!==idRota);
        if(!e.rotasAtivas.length&&e.modoDirecao==='rotas')e.modoDirecao='auto';
        renderizarMapeamentoRegioes();agendarAutosaveKineSys();
    }

    function construirPainelDirecao(contexto){
        const selected=regioesSelecionadas(),box=document.createElement('section');box.className='ks-direction-panel';
        const head=document.createElement('div');head.className='ks-direction-head';head.innerHTML='<div><span class="ks-kicker">DIREÇÃO CLÍNICA ASSISTIDA</span><strong>O que vale investigar agora?</strong><p>O motor organiza pistas e próximos passos. Você decide quais eixos fazem sentido para este paciente.</p></div>';box.appendChild(head);
        if(selected.length){
            const grid=document.createElement('div');grid.className='ks-direction-regions';
            selected.forEach(id=>{
                const est=window.obterEstadoRegiao(id),ativas=rotasSelecionadasEstado(est),item=document.createElement('div');item.className='ks-direction-region';
                const nomes=ativas.map(x=>rotaParaRegiao(id,x)?.nome||x);
                item.innerHTML=`<span class="ks-kicker">REGIÃO</span><strong>${escapeHTML(BANCO_MAPEAMENTO_CLINICO[id].nome)}</strong><span>${nomes.length?escapeHTML(nomes.join(' · ')):'Investigação em aberto'}</span>`;
                grid.appendChild(item);
            });box.appendChild(grid);
        }else{
            const ranks=sugestoesRegiao23(contexto),empty=document.createElement('div');empty.className='ks-direction-empty';empty.innerHTML=`<strong>${ranks.length?'Regiões sugeridas':'Região não definida'}</strong>`;box.appendChild(empty);
            if(ranks.length){
                const grid=document.createElement('div');grid.className='ks-region-suggestions';
                ranks.forEach(r=>{
                    const b=document.createElement('button');b.type='button';b.className='ks-region-suggestion';
                    b.innerHTML=`<strong>${escapeHTML(r.nome)}</strong>${r.fonte==='avaliacao_anterior'?'<small>Avaliação anterior</small>':''}`;
                    b.addEventListener('click',()=>window.selecionarRegiaoSugeridaKineSys(r.id));grid.appendChild(b);
                });
                box.appendChild(grid);
            }
            const go=document.createElement('button');go.type='button';go.className='btn-secondary';go.textContent='Continuar sem região';go.addEventListener('click',window.avancarParaDiagnostico);box.appendChild(go);
        }
        return box;
    }

    window.inferirFenotipoOperacionalKineSys = function(idRegiao,contexto){
        const cirurgia=obterCirurgiaRelacionadaRegiao(idRegiao);
        if(cirurgia){
            return {id:'reabilitacao_pos_operatoria',nome:'Reabilitação pós-operatória',texto:`Procedimento relacionado à região: ${cirurgia}. Priorize fase de cicatrização, restrições, dor/edema, ADM, força, função e critérios de progressão; diferenciais entram se o curso estiver atípico.`};
        }
        return baseInferirFenotipo(idRegiao,contexto);
    };

    function selecionarDirecaoHipotese(idRegiao,c){
        const e=window.obterEstadoRegiao(idRegiao);
        e.modoDirecao='hipotese';e.hipotesePrincipalAtiva=chaveHipoteseKineSys(c);e.hipoteseOrigem='manual';e.idClusterSuspeitaEscolhido=c.grupo==='cluster'?c.item.id:null;e.diferencialAtivo=null;e.incertezaClinicaAceita=false;e.incertezaEspecifica=false;e.fenotipoOperacional=null;
        renderizarMapeamentoRegioes();agendarAutosaveKineSys();
    }

    function selecionarDirecaoFenotipo(idRegiao,fen){
        const e=window.obterEstadoRegiao(idRegiao);
        e.modoDirecao='fenotipo';e.fenotipoOperacional=fen;e.incertezaEspecifica=true;e.incertezaClinicaAceita=false;e.incertezaClinicaMotivo='fenotipo_operacional_escolhido';e.hipotesePrincipalAtiva=null;e.idClusterSuspeitaEscolhido=null;e.diferencialAtivo=null;
        renderizarMapeamentoRegioes();agendarAutosaveKineSys();
    }

    function selecionarDirecaoIndeterminada(idRegiao){
        const e=window.obterEstadoRegiao(idRegiao);
        e.modoDirecao='indeterminado';e.incertezaClinicaAceita=true;e.incertezaClinicaMotivo='direcao_profissional_sem_hipotese_especifica';e.incertezaClinicaDataISO=new Date().toISOString();e.hipotesePrincipalAtiva=null;e.idClusterSuspeitaEscolhido=null;e.diferencialAtivo=null;e.fenotipoOperacional=null;e.incertezaEspecifica=false;
        renderizarMapeamentoRegioes();agendarAutosaveKineSys();
    }

    function construirPrioridades(idRegiao,candidatos,estado){
        if(!candidatos.length)return null;
        const wrap=document.createElement('div');wrap.className='ks-priority-axes';
        const title=document.createElement('div');title.className='ks-priority-title';title.innerHTML='<strong>Até 3 eixos iniciais</strong><span>Escolha apenas o que vale investigar agora.</span>';wrap.appendChild(title);
        const grid=document.createElement('div');grid.className='ks-priority-grid';
        candidatos.slice(0,3).forEach(c=>{
            const b=document.createElement('button');b.type='button';b.className='ks-priority-axis';
            const active=estado.modoDirecao==='hipotese' && estado.hipotesePrincipalAtiva===chaveHipoteseKineSys(c);
            if(active)b.classList.add('active');
            const rot=rotuloCompatibilidade(c.score);
            b.innerHTML=`<strong>${escapeHTML(c.item.nome)}</strong><span>${escapeHTML(rot.texto)}</span>`;
            b.addEventListener('click',()=>selecionarDirecaoHipotese(idRegiao,c));grid.appendChild(b);
        });
        wrap.appendChild(grid);return wrap;
    }

    function construirProximosAchados(idRegiao,escolhido,candidatos){
        const prox=proximosAchadosDiscriminativosKineSys(idRegiao,escolhido,candidatos).slice(0,3);
        if(!prox.length)return null;
        const box=document.createElement('div');box.className='ks-next-findings';
        box.innerHTML=`<strong>Achados que podem ajudar a diferenciar</strong><div>${prox.map(p=>`<span>${escapeHTML(p.texto)}</span>`).join('')}</div>`;
        return box;
    }

    function chaveFerramenta232(grupo,item){return `${grupo}::${item.id}`;}
    function catalogoRegiao232(idRegiao){
        const reg=BANCO_MAPEAMENTO_CLINICO[idRegiao];
        return [...(reg?.clusters||[]).map(item=>({grupo:'cluster',item})),...(reg?.diferenciais||[]).map(item=>({grupo:'diferencial',item}))];
    }
    function ferramentaPorChave232(idRegiao,key){return catalogoRegiao232(idRegiao).find(c=>chaveFerramenta232(c.grupo,c.item)===key)||null;}
    function marcarFerramentaInvestigada232(estado,grupo,item){
        const key=chaveFerramenta232(grupo,item);
        if(!estado.ferramentasInvestigadas.includes(key))estado.ferramentasInvestigadas.push(key);
        estado.ultimaFerramentaInteragida=key;
        return key;
    }
    function ferramentasPositivasInvestigadas232(idRegiao){
        const estado=window.obterEstadoRegiao(idRegiao);
        return (estado.ferramentasInvestigadas||[]).map(k=>ferramentaPorChave232(idRegiao,k)).filter(Boolean).filter(c=>statusHipoteseKineSys(idRegiao,c)==='positivo');
    }
    function atualizarDirecaoPeloExame232(idRegiao,grupo,item){
        const estado=window.obterEstadoRegiao(idRegiao),key=marcarFerramentaInvestigada232(estado,grupo,item),cand={grupo,item},status=statusHipoteseKineSys(idRegiao,cand);
        // Se o profissional abriu a ferramenta e ela atingiu o próprio critério operacional,
        // o exame passa a alimentar a Síntese automaticamente. Isso não é uma seleção feita
        // por texto/IA: nasce de achados que o próprio fisioterapeuta registrou.
        if(status==='positivo'){
            const manualOutra=estado.hipoteseOrigem==='manual' && estado.hipotesePrincipalAtiva && estado.hipotesePrincipalAtiva!==key;
            if(!manualOutra){
                estado.modoDirecao='hipotese';
                estado.hipotesePrincipalAtiva=key;
                if(estado.hipoteseOrigem!=='manual')estado.hipoteseOrigem='exame_positivo';
                estado.idClusterSuspeitaEscolhido=grupo==='cluster'?item.id:null;
                estado.incertezaClinicaAceita=false;estado.incertezaEspecifica=false;estado.fenotipoOperacional=null;
            }
        }else if(estado.hipoteseOrigem==='exame_positivo' && estado.hipotesePrincipalAtiva===key){
            estado.hipotesePrincipalAtiva=null;estado.hipoteseOrigem='';estado.idClusterSuspeitaEscolhido=null;
            estado.modoDirecao=estado.rotasAtivas?.length?'rotas':'auto';
        }
        return status;
    }
    function rotaProvavelFerramenta232(item){
        const txt=removerAcentos([item?.id||'',item?.nome||'',...(item?.tagsBusca||[]),...(item?.palavrasChaveHMA||[])].join(' '));
        if(item?.categoriaClinica==='mobilidade_deformidade'||/rigid|contratura|deform|halux|hallux|dupuytren|garra|martelo|mobilidade|artrofibrose|equinismo/.test(txt))return'mobilidade_articular';
        if(/radicul|neural|neurop|nervo|parestes|mielop|tunel do carpo|trigem/.test(txt))return'neurologica';
        if(/pos.?operator|fratura|ruptura|trauma|luxacao/.test(txt))return'pos_operatorio_trauma';
        if(/referid|cervicogen|visceral|integracao/.test(txt))return'referida_integracao';
        return'carga_capacidade';
    }

    window.construirCardTestes = function(idRegiao,item,status,grupo){
        const div=document.createElement('div');div.className='cluster-card ks-focused-exam '+(status==='positivo'?'status-positivo':status==='negativo'?'status-negativo':status==='inconclusivo'?'status-inconclusivo':'');
        const h4=document.createElement('h4');h4.textContent=item.nome;div.appendChild(h4);
        const meta=obterMetaCriteriosKineSys(item,grupo),estado=window.obterEstadoRegiao(idRegiao),suf=calcularSuficienciaInvestigacaoKineSys(idRegiao,item,grupo);
        const sub=document.createElement('div');sub.className='cluster-sub';sub.textContent='Registre somente os achados pertinentes. Não avaliados permanecem neutros.';div.appendChild(sub);
        if(item.evidencia){const ref=document.createElement('div');ref.className='base-evidencia';ref.textContent='Base clínica: '+item.evidencia;div.appendChild(ref);}
        const expandKey=`${grupo}::${item.id}`;
        const expanded=!!estado.testesExpandidos[expandKey];
        const answered=item.testes.map((_,i)=>i).filter(i=>!!valorAchado232(estado,grupo,item,i));
        const order=[];const add=i=>{if(Number.isInteger(i)&&i>=0&&i<item.testes.length&&!order.includes(i))order.push(i);};
        answered.forEach(add);(meta.essenciais||[]).forEach(add);(suf.faltantes||[]).forEach(add);item.testes.forEach((_,i)=>add(i));
        const visible=expanded?order:order.slice(0,4);
        visible.forEach(i=>{
            const teste=item.testes[i],atual=valorAchado232(estado,grupo,item,i)||'';
            const linha=document.createElement('div');linha.className='teste-linha';const span=document.createElement('span');span.textContent=teste;
            const select=document.createElement('select');select.className='teste-resultado-select';select.dataset.regiao=idRegiao;select.dataset.grupo=grupo;select.dataset.item=item.id;select.dataset.indice=i;
            [['','— Registrar achado —'],['positivo','Compatível'],['negativo','Não compatível'],['inconclusivo','Inconclusivo'],['nao_realizado','Não avaliado'],['nao_aplicavel','Não se aplica']].forEach(([v,t])=>{const o=document.createElement('option');o.value=v;o.textContent=t;if(v===atual)o.selected=true;select.appendChild(o);});
            atualizarClasseSelectResultado(select);
            select.addEventListener('change',()=>{gravarAchado232(estado,grupo,item,i,select.value);marcarFerramentaInvestigada232(estado,grupo,item);atualizarDirecaoPeloExame232(idRegiao,grupo,item);atualizarClasseSelectResultado(select);agendarAutosaveKineSys();renderizarMapeamentoRegioes();});
            linha.append(span,select);div.appendChild(linha);
        });
        if(order.length>4){
            const btn=document.createElement('button');btn.type='button';btn.className='cluster-info-link ks-expand-tests';btn.textContent=expanded?`Mostrar somente achados prioritários`:`Mostrar todos os ${item.testes.length} achados`;
            btn.addEventListener('click',()=>{estado.testesExpandidos[expandKey]=!expanded;renderizarMapeamentoRegioes();});div.appendChild(btn);
        }
        const ver=document.createElement('div');ver.className='cluster-veredito '+status;
        ver.textContent=status==='positivo'?'Achados compatíveis com esta ferramenta de investigação; não estabelece diagnóstico.':status==='negativo'?'Achados não sustentam esta ferramenta de investigação.':status==='inconclusivo'?'Inconclusivo com os dados atuais.':'Sem dados suficientes para orientar este eixo.';
        div.appendChild(ver);return div;
    };

    window.construirCabecalhoHipotese = function(idRegiao,escolhido,candidatos,estado,contexto){
        const wrap=document.createElement('div');
        const box=document.createElement('div');box.className='cluster-hypothesis';
        const esq=document.createElement('div');esq.innerHTML=`<div class="label">Eixo de investigação sugerido</div><div class="name">${escapeHTML(escolhido.item.nome)}</div>`;
        const dir=document.createElement('div');dir.className='cluster-compat';const rot=rotuloCompatibilidade(escolhido.score);dir.innerHTML=`<span class="${rot.classe}">${escapeHTML(rot.texto)}</span>`;
        const info=document.createElement('button');info.type='button';info.className='hypothesis-info-btn ks-why-button';info.textContent='Por que?';info.title='Ver o que influenciou esta sugestão';info.setAttribute('aria-label','Por que este eixo foi sugerido?');dir.appendChild(info);box.append(esq,dir);wrap.appendChild(box);
        const pop=document.createElement('div');pop.className='hypothesis-popover';pop.innerHTML=explicarContribuicoesHipotese(escolhido.item,contexto,idRegiao,escolhido.score);wrap.appendChild(pop);info.addEventListener('click',()=>pop.classList.toggle('open'));
        const fen=window.inferirFenotipoOperacionalKineSys(idRegiao,contexto);
        const linha=document.createElement('div');linha.className='ks-clinical-direction-select';
        const lab=document.createElement('span');lab.textContent='Direção do profissional:';
        const sel=document.createElement('select');
        candidatos.forEach(c=>{const o=document.createElement('option');o.value=chaveHipoteseKineSys(c);o.textContent=c.item.nome+(c.grupo==='diferencial'?' · diferencial':'');if(chaveHipoteseKineSys(c)===chaveHipoteseKineSys(escolhido))o.selected=true;sel.appendChild(o);});
        if(fen){const o=document.createElement('option');o.value='__fenotipo';o.textContent=`Usar fenótipo: ${fen.nome}`;sel.appendChild(o);}
        const oi=document.createElement('option');oi.value='__indeterminado';oi.textContent='Manter investigação em aberto / sem condição específica';sel.appendChild(oi);
        sel.addEventListener('change',()=>{if(sel.value==='__fenotipo'&&fen)selecionarDirecaoFenotipo(idRegiao,fen);else if(sel.value==='__indeterminado')selecionarDirecaoIndeterminada(idRegiao);else{const c=candidatos.find(x=>chaveHipoteseKineSys(x)===sel.value);if(c)selecionarDirecaoHipotese(idRegiao,c);}});
        linha.append(lab,sel);wrap.appendChild(linha);return wrap;
    };

    function construirStatusFenotipo(idRegiao,fen){
        const box=document.createElement('div');box.className='ks-direction-chosen fenotipo';
        box.innerHTML=`<div><span class="ks-kicker">DIREÇÃO CLÍNICA ESCOLHIDA</span><strong>${escapeHTML(fen.nome)}</strong><p>${escapeHTML(fen.texto||'Fenótipo operacional usado como direção do exame, mantendo a etiologia específica aberta.')}</p></div>`;
        const b=document.createElement('button');b.type='button';b.className='btn-secondary';b.textContent='Abrir biblioteca específica';b.addEventListener('click',()=>{const e=window.obterEstadoRegiao(idRegiao);e.modoDirecao='auto';e.incertezaEspecifica=false;e.incertezaClinicaAceita=false;renderizarMapeamentoRegioes();});box.appendChild(b);return box;
    }

    function construirStatusIndeterminado(idRegiao){
        const box=document.createElement('div');box.className='ks-direction-chosen indeterminado';
        box.innerHTML='<div><span class="ks-kicker">DIREÇÃO CLÍNICA ESCOLHIDA</span><strong>Investigação sem condição específica selecionada</strong><p>Incerteza explicitamente documentada. O plano pode ser orientado por sintomas, função, resposta à carga e reavaliação.</p></div>';
        const b=document.createElement('button');b.type='button';b.className='btn-secondary';b.textContent='Reabrir investigação';b.addEventListener('click',()=>{const e=window.obterEstadoRegiao(idRegiao);e.modoDirecao='auto';e.incertezaClinicaAceita=false;renderizarMapeamentoRegioes();});box.appendChild(b);return box;
    }

    window.construirBlocoRedFlags = function(idRegiao,regiao,destacar=true){
        const box=document.createElement('div');box.className='bloco-redflags safety-gate-box';
        const estado=window.obterEstadoRegiao(idRegiao),contexto=coletarContextoClinico();
        const titulo=document.createElement('h4');titulo.textContent='Segurança regional';box.appendChild(titulo);
        (regiao.redFlags||[]).forEach((pergunta,i)=>{
            const linha=document.createElement('label');linha.className='redflag-linha';const chk=document.createElement('input');chk.type='checkbox';chk.checked=!!valorRedFlag232(estado,idRegiao,pergunta,i);
            chk.addEventListener('change',()=>{gravarRedFlag232(estado,idRegiao,pergunta,i,chk.checked);estado.redflagAcknowledge=false;estado.redflagConduta='';estado.redflagJustificativa='';estado.safetyFingerprint='';invalidarSegurancaGlobal();renderizarMapeamentoRegioes();agendarAutosaveKineSys();});
            const span=document.createElement('span');span.textContent=pergunta;linha.append(chk,span);box.appendChild(linha);
        });
        const pistas=alertasRegionais23(idRegiao,contexto);
        const gates=pistas.filter(p=>p.tipo==='gate_clinico');
        if(gates.length){const g=document.createElement('div');g.className='alerta-redflag-ativo';g.innerHTML=gates.map(a=>`<strong>${escapeHTML(a.titulo)}</strong><br><span>${escapeHTML(a.texto)}</span>`).join('<hr>');box.appendChild(g);}
        if(pistas.length){
            const gate=document.createElement('div');gate.className='redflag-gate';const select=document.createElement('select');
            [['','Definir conduta'],['revisada_sem_suspeita','Revisado — não se confirma'],['continuar_com_cautela','Prosseguir com monitorização'],['avaliacao_medica_programada','Encaminhamento programado'],['encaminhamento_prioritario','Encaminhamento prioritário'],['encaminhamento_urgente','Encaminhamento imediato']].forEach(([v,t])=>{const o=document.createElement('option');o.value=v;o.textContent=t;if(estado.redflagConduta===v)o.selected=true;select.appendChild(o);});
            const ta=document.createElement('textarea');ta.placeholder='Justificativa clínica';ta.value=estado.redflagJustificativa||'';
            const btn=document.createElement('button');btn.type='button';btn.className='btn-secondary';btn.textContent='Registrar decisão';
            btn.addEventListener('click',()=>{if(!select.value){alert('Defina a conduta clínica.');return;}if(select.value==='revisada_sem_suspeita'&&ta.value.trim().length<5){alert('Registre uma justificativa clínica breve.');return;}const ctx=coletarContextoClinico();estado.redflagConduta=select.value;estado.redflagJustificativa=ta.value.trim();estado.redflagAcknowledge=true;estado.redflagsRevisadas=true;estado.safetyFingerprint=fingerprintSegurancaRegional23(idRegiao,ctx);invalidarSegurancaGlobal();if(todasPistasResolvidas(ctx))marcarSegurancaGlobalRevisada(ctx);renderizarMapeamentoRegioes();agendarAutosaveKineSys();});
            gate.append(select,ta,btn);box.appendChild(gate);
        }
        return box;
    };

    window.construirSafetyCompacto = function(idRegiao,regiao,estado,contexto){
        const pistas=alertasRegionais23(idRegiao,contexto),resolvida=pistas.length&&decisaoRegiaoAtual(idRegiao,contexto);
        const details=document.createElement('details');details.className='safety-compact'+(pistas.length&&!resolvida?' alerta':'')+(resolvida?' resolvida':'');details.open=pistas.length&&!resolvida;
        const summary=document.createElement('summary');summary.innerHTML=`<span>${resolvida?'Segurança regional — revisada':pistas.length?`Segurança regional — ${pistas.length} pista(s)`:'Segurança regional'}</span>`;
        const body=document.createElement('div');body.className='safety-body';body.appendChild(window.construirBlocoRedFlags(idRegiao,regiao,pistas.length&&!resolvida));details.append(summary,body);return details;
    };

    function construirRotasRegiao(idRegiao,contexto,estado){
        const wrap=document.createElement('div');wrap.className='ks-route-wrap';
        const ativas=rotasSelecionadasEstado(estado),sugestoes=sugerirRotasRegiao(idRegiao,contexto),head=document.createElement('div');head.className='ks-route-head';
        head.innerHTML='<div><span class="ks-kicker">PRÓXIMO PASSO</span><strong>O que vale examinar agora?</strong><p>Escolha até três rotas de exame. Elas orientam a investigação, sem fechar diagnóstico.</p></div>';const compare=document.createElement('button');compare.type='button';compare.className='btn-secondary';compare.textContent=estado.sugestoesRotasVisiveis?'Ocultar sugestões':`Ver sugestões${sugestoes.length?` (${sugestoes.length})`:''}`;compare.addEventListener('click',()=>{estado.sugestoesRotasVisiveis=!estado.sugestoesRotasVisiveis;renderizarMapeamentoRegioes();});head.appendChild(compare);wrap.appendChild(head);
        if(estado.sugestoesRotasVisiveis){
            const grid=document.createElement('div');grid.className='ks-route-grid';
            sugestoes.forEach(rota=>{const card=document.createElement('div');card.className='ks-route-card'+(ativas.includes(rota.id)?' active':'');card.innerHTML=`<div class="ks-route-copy"><strong>${escapeHTML(rota.nome)}</strong></div>`;const actions=document.createElement('div');actions.className='ks-route-actions';const choose=document.createElement('button');choose.type='button';choose.className=ativas.includes(rota.id)?'btn-primary':'btn-secondary';choose.textContent=ativas.includes(rota.id)?'Selecionada':'Selecionar';choose.addEventListener('click',()=>alternarRota(idRegiao,rota.id));actions.appendChild(choose);if(rota.id!=='geral'){const ignore=document.createElement('button');ignore.type='button';ignore.className='btn-link-compacto';ignore.textContent='Ignorar';ignore.addEventListener('click',()=>ignorarRota(idRegiao,rota.id));actions.appendChild(ignore);}card.appendChild(actions);grid.appendChild(card);});wrap.appendChild(grid);
        }
        if(ativas.length){
            const details=document.createElement('div');details.className='ks-active-routes';ativas.forEach(id=>{const rota=rotaParaRegiao(idRegiao,id);if(!rota)return;const d=document.createElement('div');d.className='ks-route-findings';d.innerHTML=`<div><strong>${escapeHTML(rota.nome)}</strong></div><ul>${rota.achados.map(x=>`<li>${escapeHTML(x)}</li>`).join('')}</ul>`;details.appendChild(d);});wrap.appendChild(details);
        }
        const edit=document.createElement('details');edit.className='ks-route-library';edit.innerHTML='<summary>Escolher outra rota manualmente</summary>';const all=document.createElement('div');all.className='ks-route-library-grid';
        const preferidas=(KINESYS_ADAPTADORES_ROTAS_23[idRegiao]||[]).map(x=>x[0]);
        const ids=[...new Set([...preferidas,...Object.keys(KINESYS_ROTAS_EXAME_23)])];
        ids.forEach(id=>{const rota=rotaParaRegiao(idRegiao,id);if(!rota)return;const b=document.createElement('button');b.type='button';b.className='ks-route-mini';b.textContent=rota.nome;b.addEventListener('click',()=>alternarRota(idRegiao,id));all.appendChild(b);});
        edit.appendChild(all);wrap.appendChild(edit);return wrap;
    }

    function construirFerramentasEspecificas(idRegiao,contexto,estado){
        const reg=BANCO_MAPEAMENTO_CLINICO[idRegiao];
        const catalogo=catalogoRegiao232(idRegiao).sort((a,b)=>String(a.item.nome||'').localeCompare(String(b.item.nome||''),'pt-BR'));
        if(!catalogo.length)return null;
        const details=document.createElement('details');details.className='ks-specific-tools';const summary=document.createElement('summary');summary.innerHTML='<span>Biblioteca opcional de condições e ferramentas</span>';details.appendChild(summary);
        const note=document.createElement('p');note.className='ks-specific-note';note.textContent='Use somente quando uma condição específica precisar ser investigada. Abrir um item não o transforma em diagnóstico.';details.appendChild(note);
        const search=document.createElement('input');search.type='search';search.className='ks-specific-search';search.placeholder='Buscar condição ou ferramenta';search.value=estado.ferramentaBusca||'';details.appendChild(search);
        const list=document.createElement('div');list.className='ks-specific-list';
        catalogo.forEach(c=>{
            const key=chaveHipoteseKineSys(c),row=document.createElement('div');row.className='ks-specific-row';row.dataset.toolKey=key;
            const tags=[c.item.id,c.item.nome,...(c.item.palavrasChaveHMA||[]),...(c.item.tagsBusca||[])].join(' ');row.dataset.search=removerAcentos(tags);
            const name=document.createElement('span');name.textContent=c.item.nome;const meta=document.createElement('small');if(c.item.categoriaClinica==='mobilidade_deformidade')meta.textContent='Mobilidade / deformidade';
            const left=document.createElement('div');left.className='ks-specific-name';left.append(name);if(meta.textContent)left.append(meta);
            const b=document.createElement('button');b.type='button';b.className='btn-link-compacto';b.textContent=estado.ferramentaEspecificaAtiva===key?'Fechar':'Abrir';
            b.addEventListener('click',()=>{
                const abrindo=estado.ferramentaEspecificaAtiva!==key;
                estado.ferramentaEspecificaAtiva=abrindo?key:'';
                if(abrindo){marcarFerramentaInvestigada232(estado,c.grupo,c.item);estado.ferramentaScrollPendente=key;}
                renderizarMapeamentoRegioes();agendarAutosaveKineSys();
            });
            row.append(left,b);list.appendChild(row);
            if(estado.ferramentaEspecificaAtiva===key){
                details.open=true;
                const box=document.createElement('div');box.className='ks-specific-active';box.dataset.toolActive=key;
                const st=statusHipoteseKineSys(idRegiao,c);box.appendChild(window.construirCardTestes(idRegiao,c.item,st,c.grupo));
                if(st==='positivo'){
                    const badge=document.createElement('div');badge.className='ks-tool-synthesis-link';badge.textContent='Achados compatíveis registrados — este eixo será considerado na Síntese.';box.appendChild(badge);
                }else{
                    const action=document.createElement('button');action.type='button';action.className='btn-secondary';action.textContent='Usar como eixo na Síntese';action.addEventListener('click',()=>selecionarDirecaoHipotese(idRegiao,c));box.appendChild(action);
                }
                list.appendChild(box);
            }
        });
        const aplicarFiltro=()=>{const q=removerAcentos(search.value.trim());estado.ferramentaBusca=search.value;list.querySelectorAll('.ks-specific-row').forEach(r=>{const show=!q||r.dataset.search.includes(q);r.style.display=show?'':'none';const next=r.nextElementSibling;if(next?.classList?.contains('ks-specific-active')&&next.dataset.toolActive===r.dataset.toolKey)next.style.display=show?'':'none';});};
        search.addEventListener('input',()=>{aplicarFiltro();agendarAutosaveKineSys();});
        details.appendChild(list);aplicarFiltro();
        return details;
    }

    window.construirCardRegiao = function(idRegiao,contexto){
        const regiao=BANCO_MAPEAMENTO_CLINICO[idRegiao],estado=window.obterEstadoRegiao(idRegiao),card=document.createElement('section');card.className='cluster-region-card ks-route-region-card';
        const header=document.createElement('div');header.className='cluster-region-header';header.innerHTML=`<div><span class="ks-kicker">REGIÃO EM INVESTIGAÇÃO</span><h2>${escapeHTML(regiao.nome)}</h2></div><span class="ks-region-mode">Exame direcionado</span>`;card.appendChild(header);
        if(mapeamentoAvaliacaoAnterior?.detalhes?.[idRegiao]){const resumo=(mapeamentoAvaliacaoAnterior.resumoPorRegiao||[]).find(r=>r.regiao===regiao.nome);const b=document.createElement('div');b.className='ks-prior-eval';b.textContent=`Última avaliação (${mapeamentoAvaliacaoAnterior.data}): ${resumo?(resumo.direcaoInvestigacao||resumo.hipotese):'resultados prévios disponíveis.'}`;card.appendChild(b);}
        const nota=construirNotaTopologiaKineSys(idRegiao,contexto);if(nota)card.appendChild(nota);
        const cirurgia=obterCirurgiaRelacionadaRegiao(idRegiao),fen=window.inferirFenotipoOperacionalKineSys(idRegiao,contexto);
        if(cirurgia){const a=document.createElement('div');a.className='ks-postop-route';a.innerHTML=`<strong>Episódio conhecido</strong><span>${escapeHTML(cirurgia)}.</span>`;card.appendChild(a);}
        if(estado.modoDirecao==='hipotese'&&estado.hipotesePrincipalAtiva){
            const cand=ordenarHipotesesRegiaoKineSys(idRegiao,contexto).find(c=>chaveHipoteseKineSys(c)===estado.hipotesePrincipalAtiva) || ferramentaPorChave232(idRegiao,estado.hipotesePrincipalAtiva);
            if(cand){const chosen=document.createElement('div');chosen.className='ks-direction-chosen';const titulo=estado.hipoteseOrigem==='exame_positivo'?'EIXO SELECIONADO APÓS ACHADOS':'DIREÇÃO SELECIONADA PELO PROFISSIONAL';chosen.innerHTML=`<div><span class="ks-kicker">${titulo}</span><strong>${escapeHTML(cand.item.nome)}</strong><small class="ks-semantic-note">A seleção orienta a investigação e não estabelece diagnóstico.</small></div>`;const b=document.createElement('button');b.type='button';b.className='btn-secondary';b.textContent='Remover da Síntese';b.addEventListener('click',()=>{estado.modoDirecao=estado.rotasAtivas?.length?'rotas':'auto';estado.hipotesePrincipalAtiva=null;estado.hipoteseOrigem='';estado.idClusterSuspeitaEscolhido=null;renderizarMapeamentoRegioes();});chosen.appendChild(b);card.appendChild(chosen);}
        }
        card.appendChild(construirRotasRegiao(idRegiao,contexto,estado));
        if(fen){const phen=document.createElement('div');phen.className='ks-phenotype-anchor ks-phenotype-optional';phen.innerHTML=`<span class="ks-kicker">PADRÃO OPERACIONAL SUGERIDO</span><strong>${escapeHTML(fen.nome)}</strong><p>${escapeHTML(fen.texto)}</p>`;const b=document.createElement('button');b.type='button';b.className='btn-link-compacto';b.textContent='Usar este padrão como direção';b.addEventListener('click',()=>selecionarDirecaoFenotipo(idRegiao,fen));phen.appendChild(b);card.appendChild(phen);}
        const tools=construirFerramentasEspecificas(idRegiao,contexto,estado);if(tools)card.appendChild(tools);
        if(!estado.rotasAtivas?.length && estado.modoDirecao!=='hipotese' && estado.modoDirecao!=='fenotipo' && estado.modoDirecao!=='indeterminado'){
            const no=document.createElement('div');no.className='ks-no-route-choice';no.innerHTML='<strong>Sem direção específica</strong>';
            const b=document.createElement('button');b.type='button';b.className='btn-link-compacto';b.textContent='Manter quadro indeterminado';b.addEventListener('click',()=>selecionarDirecaoIndeterminada(idRegiao));no.appendChild(b);card.appendChild(no);
        }
        card.appendChild(window.construirSafetyCompacto(idRegiao,regiao,estado,contexto));return card;
    };

    function selecionarDirecaoFenotipoSilencioso(estado,fen){
        estado.modoDirecao='fenotipo';estado.fenotipoOperacional=fen;estado.incertezaEspecifica=true;estado.incertezaClinicaAceita=false;estado.incertezaClinicaMotivo='rota_pos_operatoria';estado.hipotesePrincipalAtiva=null;estado.idClusterSuspeitaEscolhido=null;estado.diferencialAtivo=null;
    }

    window.renderizarMapeamentoRegioes = function(){
        const container=document.getElementById('container_clusters_regioes');if(!container)return;
        const contexto=coletarContextoClinico();renderizarPainelIntegracaoMultirregional(contexto);container.innerHTML='';
        container.appendChild(construirPainelDirecao(contexto));
        const regioes=regioesSelecionadas();
        if(!regioes.length){const vazio=document.createElement('div');vazio.className='ks-exam-empty';vazio.innerHTML='<strong>Região não definida</strong><span></span>';const b=document.createElement('button');b.type='button';b.className='btn-primary';b.textContent='Ir para resumo clínico';b.addEventListener('click',window.avancarParaDiagnostico);vazio.appendChild(b);container.appendChild(vazio);container.appendChild(construirPainelSegurancaGlobal(contexto));return;}
        regioes.forEach(id=>container.appendChild(window.construirCardRegiao(id,contexto)));
        // A segurança fecha a etapa como uma ação compacta, depois do exame.
        // O detalhe só abre quando há algo para revisar ou registrar.
        container.appendChild(construirPainelSegurancaGlobal(contexto));
        regioes.forEach(id=>{
            const est=window.obterEstadoRegiao(id),key=est.ferramentaScrollPendente;
            if(!key)return;
            est.ferramentaScrollPendente='';
            requestAnimationFrame(()=>{
                const ativo=Array.from(container.querySelectorAll('.ks-specific-active')).find(el=>el.dataset.toolActive===key);
                if(ativo)ativo.scrollIntoView({behavior:'smooth',block:'center'});
            });
        });
    };

    window.registrarAuditoriaMotorKineSys = function(idRegiao,contexto,candidatos){
        baseRegistrarAuditoriaMotor(idRegiao,contexto,candidatos);
        const e=window.obterEstadoRegiao(idRegiao);if(e.auditoriaMotor){e.auditoriaMotor.direcaoProfissional=e.modoDirecao||'auto';e.auditoriaMotor.fenotipoEscolhido=e.modoDirecao==='fenotipo'?(e.fenotipoOperacional?.nome||''):'';e.auditoriaMotor.rotasSugeridas=sugerirRotasRegiao(idRegiao,contexto).map(r=>r.nome);e.auditoriaMotor.rotasEscolhidas=rotasSelecionadasEstado(e).map(r=>rotaParaRegiao(idRegiao,r)?.nome||r);}
    };

    window.avancarParaDiagnostico = function(){
        const regioes=regioesSelecionadas(),contexto=coletarContextoClinico();
        regioes.forEach(id=>{
            const e=window.obterEstadoRegiao(id),candidatos=ordenarHipotesesRegiaoKineSys(id,contexto);
            window.registrarAuditoriaMotorKineSys(id,contexto,candidatos);
            const rotas=rotasSelecionadasEstado(e);
            if(e.modoDirecao==='hipotese'||e.modoDirecao==='fenotipo'||e.modoDirecao==='indeterminado') return;
            if(rotas.length){e.modoDirecao='rotas';e.incertezaClinicaAceita=false;e.incertezaEspecifica=true;e.incertezaClinicaMotivo='direcao_por_rotas_escolhida_pelo_profissional';}
            else {e.modoDirecao='indeterminado';e.incertezaClinicaAceita=true;e.incertezaEspecifica=true;e.incertezaClinicaMotivo='avanco_sem_direcao_especifica';e.incertezaClinicaDataISO=new Date().toISOString();}
        });
        agendarAutosaveKineSys();window.renderizarAlertasConsolidados();renderizarSinteseDiagnostica();irParaSubtela('subtela_diagnostico');
    };

    window.avancarParaMapa = function(){
        const nome=document.getElementById('paciente_nome')?.value.trim();
        if(!nome){alert('Informe ao menos o nome do paciente antes de avançar para o Exame direcionado.');return;}
        processarRadarEmTempoReal();
        const grupo=document.getElementById('grupo_regioes_mapeamento');
        if(grupo&&grupo.children.length===0) renderizarSeletorRegioes();
        // O Motor 2.3.2 não marca regiões automaticamente. A história e a
        // avaliação anterior aparecem como sugestões; a seleção é do profissional.
        window.sugerirRegioesPorHMA();
        window.renderizarMapeamentoRegioes();
        irParaSubtela('subtela_mapeamento');
    };

    window.navegarAvaliacaoEtapaKineSys = function(idSubtela){
        if(idSubtela==='subtela_triagem'){irParaSubtela(idSubtela);return;}
        if(idSubtela==='subtela_mapeamento'){avancarParaMapa();return;}
        if(idSubtela==='subtela_diagnostico'){window.avancarParaDiagnostico();return;}
        irParaSubtela(idSubtela);
    };

    window.gerarSinteseMapeamento = function(){
        const regioes=regioesSelecionadas(),contexto=coletarContextoClinico();
        const avisoDirecao='<div class="ks-clinical-support-notice" role="note"><strong>Direção clínica assistida</strong><span>O KineSys organiza achados, eixos de investigação e testes possíveis. Não confirma diagnóstico nem substitui a decisão do fisioterapeuta.</span></div>';
        let html=avisoDirecao;const resumoPorRegiao=[];
        const validacaoSeguranca=window.validarSegurancaParaFinalizacao();
        const segurancaGlobal=resumoSegurancaGlobal23(contexto);

        if(!regioes.length){
            const hipotese='Quadro geral: investigação sem região específica definida.';
            const condutas=segurancaGlobal.pistasGlobais.filter(x=>x.resolvida).map(x=>x.condutaTexto).filter(Boolean);
            const justificativas=segurancaGlobal.pistasGlobais.map(x=>x.justificativa).filter(Boolean);
            return {
                html:html+`<div class="cluster-card status-inconclusivo"><h4>Quadro geral</h4><p class="kds-u-fs-label kds-u-m-6px-0-0">${escapeHTML(hipotese)}</p></div>`,
                resumoPorRegiao:[{
                    regiao:'Quadro geral',
                    hipotese,
                    nivel:'indeterminado',
                    codigoHipotese:'',
                    nomeHipotese:'',
                    hipotesesAssociadas:[],
                    codigoEixo:'',
                    nomeEixo:'',
                    eixosAssociados:[],
                    direcaoInvestigacao:hipotese,
                    fenotipoOperacional:'',
                    textoDocumento:'Quadro geral: investigação em aberto, sem região específica selecionada. A decisão clínica permanece com o fisioterapeuta.',
                    incertezaClinicaAceita:true,
                    incertezaEspecifica:true,
                    incertezaClinicaMotivo:'sem_regiao_especifica',
                    redFlags:[],
                    alertasTextuais:segurancaGlobal.pistasGlobais.map(x=>x.id),
                    redflagConduta:condutas.join('; '),
                    redflagJustificativa:justificativas.join(' | '),
                    segurancaRevisada:validacaoSeguranca.ok,
                    segurancaGlobalRevisada:segurancaGlobal.revisada,
                    direcaoProfissional:'indeterminado',
                    rotasExame:[],
                    auditoriaMotor:null
                }],
                segurancaGlobal
            };
        }

        regioes.forEach(id=>{
            const reg=BANCO_MAPEAMENTO_CLINICO[id],
                  est=window.obterEstadoRegiao(id),
                  candidatos=ordenarHipotesesRegiaoKineSys(id,contexto),
                  rf=(reg.redFlags||[]).filter((texto,i)=>valorRedFlag232(est,id,texto,i)),
                  pistasRegionais=alertasRegionais23(id,contexto),
                  txtRegional=pistasRegionais.filter(p=>p.tipo==='gate_clinico'),
                  fen=est.fenotipoOperacional||window.inferirFenotipoOperacionalKineSys(id,contexto),
                  modo=est.modoDirecao||'auto',
                  rotas=rotasSelecionadasEstado(est);

            let hipotese='',nivel='indeterminado',codigo='',nome='',textoDocumento='',associadas=[];
            const temPista=pistasRegionais.length>0;
            const regionalResolvida=decisaoRegiaoAtual(id,contexto);
            const descartada=temPista&&regionalResolvida&&est.redflagConduta==='revisada_sem_suspeita';

            if(temPista&&!descartada){
                hipotese=`Pista(s) de segurança regional revisada(s). Conduta: ${rotuloCondutaSeguranca(est.redflagConduta)}. ${est.redflagJustificativa||''}`;
                nivel='alerta';
                textoDocumento=`${reg.nome}: pista(s) de segurança regional identificada(s); decisão clínica registrada no prontuário.`;
            }else if(modo==='hipotese'&&est.hipotesePrincipalAtiva){
                const principal=candidatos.find(c=>chaveHipoteseKineSys(c)===est.hipotesePrincipalAtiva) || ferramentaPorChave232(id,est.hipotesePrincipalAtiva);
                const status=principal?statusHipoteseKineSys(id,principal):'pendente';
                nome=principal?.item?.nome||'';codigo=principal?.item?.id||'';
                const positivas=ferramentasPositivasInvestigadas232(id).filter(c=>chaveHipoteseKineSys(c)!==est.hipotesePrincipalAtiva);
                associadas=positivas.map(c=>c.item.nome);
                if(principal&&status==='positivo'){
                    const origem=est.hipoteseOrigem==='exame_positivo'?'Eixo selecionado após achados':'Direção selecionada pelo profissional';
                    hipotese=`${origem}: ${nome}. Achados compatíveis com o eixo de investigação selecionado. ${principal.item.interpretacao||''} Essa compatibilidade orienta a investigação e não confirma diagnóstico.`;
                    if(associadas.length)hipotese+=` Outras ferramentas com achados compatíveis: ${associadas.join(', ')}.`;
                    nivel='positivo';textoDocumento=textoDocumentalDaHipotese(principal.item,reg.nome);
                }else if(principal&&status==='negativo'){
                    hipotese=`Direção selecionada: ${nome}. Achados registrados não sustentam este eixo no estado atual.`;
                    nivel='negativo';textoDocumento=`${reg.nome}: ${hipotese}`;
                }else if(principal&&status==='inconclusivo'){
                    hipotese=`Direção selecionada: ${nome}. Resultado inconclusivo com os dados registrados.`;
                    nivel='indeterminado';textoDocumento=`${reg.nome}: ${hipotese}`;
                }else{
                    hipotese=nome?`Direção selecionada: ${nome}. Dados insuficientes para concluir esta ferramenta.`:'Direção selecionada com dados insuficientes.';
                    nivel='indeterminado';textoDocumento=`${reg.nome}: ${hipotese}`;
                }
            }else if(ferramentasPositivasInvestigadas232(id).length){
                const positivas=ferramentasPositivasInvestigadas232(id),principal=positivas.find(c=>chaveHipoteseKineSys(c)===est.ultimaFerramentaInteragida)||positivas[positivas.length-1];
                nome=principal?.item?.nome||'';codigo=principal?.item?.id||'';associadas=positivas.filter(c=>c!==principal).map(c=>c.item.nome);
                hipotese=`Achados compatíveis com o eixo de investigação: ${nome}.`;
                if(associadas.length)hipotese+=` Outras ferramentas com achados compatíveis: ${associadas.join(', ')}.`;
                nivel='positivo';textoDocumento=principal?textoDocumentalDaHipotese(principal.item,reg.nome):`${reg.nome}: ${hipotese}`;
            }else if(modo==='fenotipo'&&fen){
                nome=fen.nome;hipotese=`Padrão operacional sugerido: ${fen.nome}. ${fen.texto}`;
                nivel='fenotipo';textoDocumento=`${reg.nome}: ${fen.nome}. Direção operacional escolhida pelo fisioterapeuta.`;
            }else if(modo==='rotas'&&rotas.length){
                const nomes=rotas.map(r=>rotaParaRegiao(id,r)?.nome).filter(Boolean);
                hipotese=`Direção de exame: ${nomes.join(' + ')}.`;
                if(fen)hipotese+=` Padrão operacional: ${fen.nome}.`;
                nivel='rota';textoDocumento=`${reg.nome}: exame direcionado por ${nomes.join(', ')}; sem diagnóstico específico automatizado.`;
            }else{
                hipotese='Investigação em aberto. Nenhum eixo específico foi escolhido.';
                nivel='indeterminado';textoDocumento=`${reg.nome}: investigação em aberto, sem condição específica selecionada; incerteza clínica documentada.`;
            }

            if(descartada){
                hipotese+=` Pista(s) regional(is) previamente detectada(s) foram revisadas e não foram mantidas após a decisão clínica: ${est.redflagJustificativa||'sem observação adicional'}.`;
            }

            resumoPorRegiao.push({
                regiao:reg.nome,
                hipotese,
                nivel,
                codigoHipotese:codigo,
                nomeHipotese:nome,
                hipotesesAssociadas:associadas,
                codigoEixo:codigo,
                nomeEixo:nome,
                eixosAssociados:associadas,
                direcaoInvestigacao:hipotese,
                fenotipoOperacional:fen?.nome||'',
                textoDocumento,
                incertezaClinicaAceita:modo==='indeterminado'||!!est.incertezaClinicaAceita,
                incertezaEspecifica:modo!=='hipotese'||!!est.incertezaEspecifica,
                incertezaClinicaMotivo:est.incertezaClinicaMotivo||'',
                redFlags:rf,
                alertasTextuais:txtRegional.map(a=>a.id),
                redflagConduta:est.redflagConduta||'',
                redflagJustificativa:est.redflagJustificativa||'',
                segurancaRegionalRevisada:regionalResolvida,
                segurancaGlobalRevisada:segurancaGlobal.revisada,
                segurancaRevisada:validacaoSeguranca.ok,
                direcaoProfissional:modo,
                rotasExame:rotas.map(r=>rotaParaRegiao(id,r)?.nome||r),
                auditoriaMotor:est.auditoriaMotor||null
            });

            const c=nivel==='alerta'?'status-alerta':nivel==='positivo'?'status-positivo':nivel==='negativo'?'status-negativo':'status-inconclusivo';
            html+=`<div class="cluster-card ${c}"><h4>${escapeHTML(reg.nome)}</h4><p class="kds-u-fs-label kds-u-m-6px-0-0">${escapeHTML(hipotese)}</p></div>`;
        });
        return {html,resumoPorRegiao,segurancaGlobal};
    };

    window.renderizarAlertasConsolidados = function(){
        const container=document.getElementById('container_alertas_consolidados'),card=document.getElementById('card_alertas_consolidados');if(!container)return;
        const contexto=coletarContextoClinico(),itens=[],g=obterEstadoSegurancaGlobal();

        alertasTextuaisGlobais(contexto).forEach(a=>{
            const d=g.decisoesTextuais?.[a.id]||{},resolvida=decisaoTextualGlobalValida(a,contexto);
            itens.push({
                nivel:resolvida?'resolvido':'critico',
                titulo:a.titulo,
                desc:resolvida?`${a.desc||''} Conduta: ${rotuloCondutaSeguranca(d.conduta)}${d.justificativa?` — ${d.justificativa}`:''}`:a.desc,
                origem:'Anamnese'
            });
        });

        regioesSelecionadas().forEach(id=>{
            const resolvida=decisaoRegiaoAtual(id,contexto),est=window.obterEstadoRegiao(id);
            alertasRegionais23(id,contexto).forEach(a=>itens.push({
                nivel:resolvida?'resolvido':'critico',
                titulo:`${BANCO_MAPEAMENTO_CLINICO[id].nome} — ${a.titulo||'pista'}`,
                desc:resolvida?`${a.texto||''} Conduta: ${rotuloCondutaSeguranca(est.redflagConduta)}${est.redflagJustificativa?` — ${est.redflagJustificativa}`:''}`:a.texto,
                origem:'Exame'
            }));
        });

        (ultimoRadarAlertas||[]).forEach(a=>{
            if(!itens.some(i=>i.titulo===a.titulo))itens.push({nivel:a.nivel,titulo:a.titulo,desc:a.desc,origem:'Radar clínico'});
        });

        const valid=window.validarSegurancaParaFinalizacao();
        container.innerHTML='';
        const status=document.createElement('div');status.className='ks-synthesis-safety '+(valid.ok?'ok':'pendente');
        status.innerHTML=valid.ok?'<strong>Segurança revisada</strong>':`<strong>Segurança pendente</strong><span>${escapeHTML(valid.mensagem)}</span>`;
        if(!valid.ok){
            const b=document.createElement('button');b.type='button';b.className='btn-secondary';
            b.textContent=valid.tipo==='revisao_global'?'Confirmar revisão':'Revisar segurança';
            b.addEventListener('click',()=>{if(valid.tipo==='revisao_global')window.confirmarSegurancaGlobalKineSys();else window.navegarAvaliacaoEtapaKineSys('subtela_mapeamento');});
            status.appendChild(b);
        }
        container.appendChild(status);
        if(!itens.length){if(card)card.classList.remove('ks-alert-summary-card--clinical');return;}

        itens.forEach(item=>{
            const div=document.createElement('div');
            div.className='ks-alert-row '+(item.nivel==='critico'?'critico':item.nivel==='resolvido'?'resolvido':'medio');
            div.innerHTML=`<small>${escapeHTML(item.origem)}</small><strong>${escapeHTML(item.titulo||'Pista clínica')}</strong><span>${escapeHTML(item.desc||'')}</span>`;
            container.appendChild(div);
        });
        if(card)card.classList.toggle('ks-alert-summary-card--clinical',itens.some(i=>i.nivel==='critico'));
    };

    window.sugerirRegioesPorHMA = function(){
        const contexto=coletarContextoClinico();
        const top=contexto.topologia||analisarTopologiaSintomasKineSys(contexto.hma,contexto.origemIrradiacao,contexto.irradiacao);
        Object.entries(BANCO_MAPEAMENTO_CLINICO).forEach(([idRegiao])=>{
            const chk=document.getElementById('chk_regiao_'+idRegiao);
            if(chk)chk.dataset.papelSintoma=top.papel?.[idRegiao]||'';
        });
        renderizarAnaliseIrradiacao();
        renderizarPainelIntegracaoMultirregional(contexto);
        invalidarSegurancaGlobal();
    };

    document.addEventListener('change',event=>{
        if(event.target?.matches?.('#grupo_regioes_mapeamento input[type="checkbox"]')){
            invalidarSegurancaGlobal();
            agendarAutosaveKineSys();
        }
    });

    // Expõe apenas metadados técnicos para auditoria, sem conteúdo clínico livre.
    const api232 = {
        versao:'2.4.0',
        getSafetySummary:()=>({regioes:regioesSelecionadas(),pistas:pistasSeguranca().length,revisao:window.validarSegurancaParaFinalizacao()}),
        getRouteSuggestions:(idRegiao,contexto)=>sugerirRotasRegiao(idRegiao,contexto||coletarContextoClinico()).map(r=>({id:r.id,nome:r.nome,score:r.score})),
        getSpecificToolStatus:(idRegiao,key)=>{const c=ferramentaPorChave232(idRegiao,key);return c?statusHipoteseKineSys(idRegiao,c):'ausente';},
        getPositiveExamTools:(idRegiao)=>ferramentasPositivasInvestigadas232(idRegiao).map(c=>({key:chaveHipoteseKineSys(c),nome:c.item.nome})),
        getStableFindingKey:(grupo,itemId,texto)=>chaveAchadoEstavel232(grupo,{id:itemId},texto)
    };
    window.KineSysClinicalEngine232=api232;
    window.KineSysClinicalEngine240=api232;
    window.KineSysClinicalEngine231=api232;
    window.KineSysClinicalEngine23=api232; // compatibilidade com inspeções da versão 2.3
})();
