/* ============================================================================
   KineSys — Motor Clínico 3.0 — ponte HMA -> hipóteses -> exame dirigido
   --------------------------------------------------------------------------
   Esta camada NÃO substitui o analisador de HMA nem o Clinical Engine 2.5.
   Ela conecta:
   - analisarHMAClinicaKineSys(): história, suspeita, diferenciais e lacunas;
   - coletarContextoClinico(): medicamentos, cirurgias, antecedentes e carga;
   - BANCO_MAPEAMENTO_CLINICO: clusters, diferenciais, testes e evidências.

   Regra clínica: prioridade é heurística de investigação, nunca probabilidade
   diagnóstica. A decisão e a síntese final continuam sob responsabilidade do
   fisioterapeuta.
   ============================================================================ */
(function instalarKineSysMotorClinico3(){
    'use strict';

    const VERSION='3.0.1-performance1';
    const MAX_REGIOES=2;
    const MAX_HIPOTESES_POR_REGIAO=4;
    const MAX_TESTES=9;
    const STOPWORDS=new Set(['dor','com','para','sem','por','uma','das','dos','de','do','da','em','no','na','e','ou','hipotese','suspeita','sindrome','padrao','clinico','clinica','relacionada','relacionado','possivel']);
    let ultimoPlano=null;
    let timerAtualizacao=null;
    let ultimaAssinaturaAtualizacao=null;

    function n(v=''){
        return String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').replace(/\s+/g,' ').trim();
    }
    function esc(v=''){
        return String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;');
    }
    function arr(v){ return Array.isArray(v)?v:[]; }
    function uniq(v){ return Array.from(new Set((v||[]).filter(Boolean))); }
    function tokens(v=''){
        return n(v).split(' ').filter(x=>x.length>=3&&!STOPWORDS.has(x));
    }
    function similaridade(a,b){
        const A=tokens(a),B=tokens(b); if(!A.length||!B.length)return 0;
        const bs=new Set(B),inter=A.filter(x=>bs.has(x)).length;
        return inter/Math.max(1,Math.min(A.length,B.length));
    }
    function textoTeste(t){
        if(typeof t==='string') return t;
        return String(t?.nome||t?.teste||t?.titulo||t?.descricao||'').trim();
    }
    function descreverRegra(regra,item){
        if(typeof regra==='string') return regra;
        const r=regra||item?.regraConfirmacao||null;
        if(r&&typeof r==='object'){
            if(r.descricao) return String(r.descricao);
            if(r.tipo==='minimo'&&Number(r.minimo)>0) return `Interpretar em conjunto; referência interna: mínimo de ${Number(r.minimo)} achados concordantes.`;
            if(r.tipo==='combinada') return 'Interpretar a combinação de critérios prevista para este conjunto, sem usar teste isolado como diagnóstico.';
        }
        if(Number(item?.limiar)>0) return `Interpretar o conjunto; referência interna: ${Number(item.limiar)} achados concordantes.`;
        return '';
    }

    function contextoAtual(){
        try { return typeof coletarContextoClinico==='function' ? (coletarContextoClinico()||{}) : {}; }
        catch(_) { return {}; }
    }
    function hmaAtual(){ return document.getElementById('paciente_hma')?.value?.trim()||''; }
    function analisarHistoria(contexto){
        if(typeof window.analisarHMAClinicaKineSys!=='function') return null;
        try {
            return window.analisarHMAClinicaKineSys(hmaAtual(),{
                origemIrradiacao:contexto?.origemIrradiacao||'',
                irradiacao:contexto?.irradiacao||''
            })||null;
        } catch(_) { return null; }
    }
    function banco(){
        try { return typeof BANCO_MAPEAMENTO_CLINICO!=='undefined' ? BANCO_MAPEAMENTO_CLINICO : {}; }
        catch(_) { return {}; }
    }
    function regioesSelecionadasAtual(){
        try {
            return Array.from(document.querySelectorAll('#grupo_regioes_mapeamento input:checked'))
                .map(i=>i.dataset.regiao).filter(id=>id&&banco()[id]);
        } catch(_) { return []; }
    }

    const ALIASES_REGIAO={
        cervical:['cervical','pescoco','nuca'],
        ombro:['ombro','manguito','escapula'],
        cotovelo:['cotovelo','epicondilo'],
        punho_mao:['punho','mao','carpo','dedo'],
        toracica:['toracica','torax','interescapular'],
        coluna_toracica:['toracica','torax','interescapular'],
        lombar:['lombar','lombalgia','ciatica'],
        quadril:['quadril','coxa','virilha','glute'],
        joelho:['joelho','patela','menisco'],
        tornozelo_pe:['tornozelo','pe','calcaneo','aquiles','metatarso'],
        tornozelo:['tornozelo','pe','calcaneo','aquiles','metatarso']
    };

    function scoreRegiao(id,reg,hmaResultado,textoHistoria){
        let score=0; const motivos=[];
        const local=n(hmaResultado?.local||'');
        const aliases=ALIASES_REGIAO[id]||[n(reg?.nome||id),n(id)];
        aliases.forEach(a=>{ if(a&&local.includes(a)){score+=4;motivos.push('localização extraída da HMA');} });
        arr(reg?.palavrasChave).forEach(p=>{ if(p&&n(textoHistoria).includes(n(p))){score+=0.55;} });
        const nomes=[hmaResultado?.suspeitaPrincipal?.nome||'',...arr(hmaResultado?.diferenciais).map(x=>x?.nome||'')].join(' ');
        aliases.forEach(a=>{ if(a&&n(nomes).includes(a)){score+=1.6;motivos.push('hipótese da HMA compatível com a região');} });
        return {id,nome:reg?.nome||id,score,motivos:uniq(motivos)};
    }

    function inferirRegioes(hmaResultado,contexto){
        const B=banco(); const selecionadas=regioesSelecionadasAtual();
        const out=[]; const seen=new Set();
        selecionadas.forEach(id=>{if(B[id]&&!seen.has(id)){seen.add(id);out.push({id,nome:B[id].nome||id,origem:'selecionada',score:99,motivos:['selecionada pelo fisioterapeuta']});}});
        const texto=[hmaAtual(),contexto?.origemIrradiacao||'',contexto?.irradiacao||''].join(' ');
        Object.entries(B).map(([id,reg])=>scoreRegiao(id,reg,hmaResultado,texto)).sort((a,b)=>b.score-a.score)
            .filter(x=>x.score>0).forEach(x=>{if(out.length<MAX_REGIOES&&!seen.has(x.id)){seen.add(x.id);out.push({...x,origem:'hma'});}});
        return out.slice(0,MAX_REGIOES);
    }

    function listaNormalizada(v){ return arr(v).map(n).filter(Boolean); }
    function contemAlgum(texto,lista){ const t=n(texto); return listaNormalizada(lista).filter(x=>x&&t.includes(x)); }
    function nomeHipotesesHMA(hmaResultado){
        return [hmaResultado?.suspeitaPrincipal,...arr(hmaResultado?.diferenciais)].filter(Boolean);
    }

    function scoreHistoriaItem(item,grupo,idRegiao,contexto,hmaResultado){
        const contrib=[]; let score=0;
        const textoHMA=n(hmaAtual());
        const pesos={palavraChave:.65,mecanismo:1.25,fatorPiora:.45,comorbidade:.45,medicamento:.45,idade:.35,cirurgia:1.5,...(item?.pesos||{})};
        const kw=contemAlgum(textoHMA,item?.palavrasChaveHMA).slice(0,3);
        if(kw.length){const p=Math.min(2.4,kw.length*Math.min(Number(pesos.palavraChave)||.65,1.2));score+=p;contrib.push(`HMA: ${kw.slice(0,2).join(' / ')}`);}

        const mecanismo=n(contexto?.mecanismo||'');
        if(mecanismo&&listaNormalizada(item?.mecanismoPreferido).some(x=>x===mecanismo||mecanismo.includes(x))){score+=Math.min(1.5,Number(pesos.mecanismo)||1.25);contrib.push('mecanismo compatível');}
        if(mecanismo&&listaNormalizada(item?.contraMecanismo).some(x=>x===mecanismo||mecanismo.includes(x))){score-=1.2;contrib.push('mecanismo menos compatível');}

        const fatores=arr(contexto?.fatoresPiora).map(n);
        const fatoresItem=listaNormalizada(item?.fatoresPioraRisco);
        const hitFatores=fatores.filter(f=>fatoresItem.some(x=>x===f||f.includes(x))).length;
        if(hitFatores){score+=Math.min(.9,hitFatores*Math.min(Number(pesos.fatorPiora)||.45,.45));contrib.push('comportamento dos sintomas compatível');}

        const comorbTexto=n([...(arr(contexto?.comorbidades)),contexto?.textoComorbidades||''].join(' '));
        const hitComorb=contemAlgum(comorbTexto,item?.comorbidadesRisco);
        if(hitComorb.length){score+=Math.min(.9,hitComorb.length*Math.min(Number(pesos.comorbidade)||.45,.45));contrib.push('antecedente modificador compatível');}

        const medTexto=n(contexto?.textoMedicamentos||arr(contexto?.medicamentos).join(' '));
        const hitMed=contemAlgum(medTexto,item?.medicamentosRisco);
        if(hitMed.length){score+=Math.min(.9,hitMed.length*Math.min(Number(pesos.medicamento)||.45,.45));contrib.push('medicação modifica a investigação');}

        const idade=Number(contexto?.idade);
        const faixa=item?.idadeFaixaBonus;
        if(Number.isFinite(idade)&&faixa&&idade>=Number(faixa.min??-Infinity)&&idade<=Number(faixa.max??Infinity)){
            score+=Math.min(.7,Number(faixa.bonus)||Number(pesos.idade)||.35);contrib.push('faixa etária compatível');
        }

        const cirurgiaTexto=n([contexto?.textoCirurgias||'',...arr(contexto?.cirurgias).map(x=>typeof x==='string'?x:(x?.texto||x?.nome||''))].join(' '));
        const cirurgiaRelacionada=cirurgiaTexto&&(
            n(item?.nome||'').includes('pos operatorio')||n(item?.nome||'').includes('pos cirurgico')||
            contemAlgum(cirurgiaTexto,item?.palavrasChaveHMA).length>0||contemAlgum(cirurgiaTexto,item?.cirurgiasRisco).length>0
        );
        if(cirurgiaRelacionada){score+=Math.min(2,Number(pesos.cirurgia)||1.5);contrib.push('cirurgia prévia relacionada à região/hipótese');}

        const hmas=nomeHipotesesHMA(hmaResultado);
        let melhor=null,sim=0;
        hmas.forEach(h=>{const s=similaridade(item?.nome||'',h?.nome||'');if(s>sim){sim=s;melhor=h;}});
        if(sim>=.5){score+=2.4;contrib.push('corresponde à hipótese extraída da HMA');}
        else if(sim>=.28){score+=1.25;contrib.push('relaciona-se a diferencial da HMA');}

        return {score:Math.round(score*100)/100,contrib:uniq(contrib),hmaMatch:melhor,similaridade:sim,grupo,idRegiao};
    }

    function modificadoresContextuais(contexto){
        const itens=[];
        const med=n(contexto?.textoMedicamentos||arr(contexto?.medicamentos).join(' '));
        const add=(tipo,titulo,descricao)=>itens.push({tipo,titulo,descricao});
        if(/anticoag|warfar|rivarox|apixab|dabigat|heparin/.test(med)) add('medicacao','Anticoagulação/antitrombótico','Considere risco de sangramento e procedimentos invasivos na interpretação e na conduta.');
        if(/cortico|predni|dexamet|betamet/.test(med)||contexto?.corticoideSistemico||contexto?.infiltracaoCorticoideRecente) add('medicacao','Corticosteroide','Considere exposição sistêmica/infiltração recente como modificador de risco e de tecido.');
        if(/quinolon|ciproflox|levoflox/.test(med)) add('medicacao','Fluoroquinolona','Registrar como modificador relevante quando houver hipótese tendínea.');
        if(/estatina|sinvast|atorvast|rosuvast/.test(med)) add('medicacao','Estatina','Considere sintomas musculares/miopatia no diferencial quando o quadro for compatível.');
        if(contexto?.antiInflamatorioRecente) add('medicacao','Anti-inflamatório recente','Pode modificar a expressão atual de dor/inflamação; interpretar provocação em contexto.');
        if(contexto?.diabetico) add('antecedente','Diabetes','Considere neuropatia, cicatrização e tolerância tecidual quando pertinentes.');
        if(contexto?.tabagista) add('antecedente','Tabagismo','Registrar como modificador de recuperação/cicatrização quando pertinente.');
        const cir=arr(contexto?.cirurgias);
        if(cir.length||contexto?.textoCirurgias) add('cirurgia','Cirurgia prévia','Confirmar procedimento, data, lado, restrições e evolução pós-operatória antes de testes provocativos/carga.');
        return itens;
    }

    function candidatosRegiao(regiaoInfo,contexto,hmaResultado){
        const reg=banco()[regiaoInfo.id]; if(!reg)return[];
        const todos=[...arr(reg.clusters).map(item=>({grupo:'cluster',item})),...arr(reg.diferenciais).map(item=>({grupo:'diferencial',item}))];
        return todos.map(({grupo,item})=>{
            const s=scoreHistoriaItem(item,grupo,regiaoInfo.id,contexto,hmaResultado);
            const match=s.hmaMatch||null;
            return {
                id:item.id,
                regiaoId:regiaoInfo.id,
                regiaoNome:reg.nome||regiaoInfo.id,
                grupo,
                nome:item.nome||item.id,
                prioridadeOrdenacao:s.score,
                aFavor:uniq([...(arr(match?.aFavor)),...s.contrib.filter(x=>!/menos compatível/.test(x))]),
                contra:uniq([...(arr(match?.contra)),...s.contrib.filter(x=>/menos compatível/.test(x))]),
                aConfirmar:uniq([...(arr(match?.aConfirmar)),...arr(item.testes).map(textoTeste).filter(Boolean).slice(0,4)]),
                testes:arr(item.testes).map(textoTeste).filter(Boolean),
                regraConfirmacao:descreverRegra(item.regraConfirmacao,item),
                interpretacao:String(item.interpretacao||''),
                evidencia:String(item.evidencia||''),
                origemHMA:!!match,
                item
            };
        }).sort((a,b)=>b.prioridadeOrdenacao-a.prioridadeOrdenacao)
          .filter((x,i)=>x.prioridadeOrdenacao>0||i<2)
          .slice(0,MAX_HIPOTESES_POR_REGIAO);
    }

    function classificarTeste(texto=''){
        const t=n(texto);
        if(/neurolog|dermat|miot|reflex|spurl|ultt|neurodin|hoffmann|clonus|slump|las[eè]gue/.test(t)) return 'neurologica';
        if(/adm|amplitude|rotacao|flexao|extensao|mobilidade|goniometr/.test(t)) return 'mobilidade';
        if(/forca|resist|contracao|isometr|carga|dinamometr|tolerancia/.test(t)) return 'forca_carga';
        if(/marcha|agach|escada|salto|hop|equilibr|funcao|funcional|corrida/.test(t)) return 'funcional';
        if(/palpac|sensibilidade|inspec|edema|circunferencia/.test(t)) return 'inspecao';
        return 'ortopedico';
    }
    const ROTULOS_ANALISE={
        neurologica:'Exame neurológico / neurodinâmico',mobilidade:'Mobilidade e ADM',forca_carga:'Força e tolerância à carga',funcional:'Capacidade funcional',inspecao:'Inspeção / palpação',ortopedico:'Testes ortopédicos e provocativos'
    };

    function construirExame(hipoteses,hmaResultado,modificadores){
        const clusters=hipoteses.filter(h=>h.grupo==='cluster'&&h.testes.length).slice(0,3);
        const mapa=new Map();
        hipoteses.forEach(h=>h.testes.forEach(t=>{
            const key=n(t); if(!key)return;
            if(!mapa.has(key)) mapa.set(key,{texto:t,tipo:classificarTeste(t),hipoteses:[],prioridade:h.prioridadeOrdenacao});
            const x=mapa.get(key); x.hipoteses.push(h.nome); x.prioridade=Math.max(x.prioridade,h.prioridadeOrdenacao);
        }));
        const testes=Array.from(mapa.values()).map(x=>({...x,hipoteses:uniq(x.hipoteses)})).sort((a,b)=>b.prioridade-a.prioridade).slice(0,MAX_TESTES);
        const grupos={}; testes.forEach(t=>{(grupos[t.tipo]||(grupos[t.tipo]=[])).push(t);});
        const analises=Object.entries(grupos).map(([tipo,itens])=>({tipo,titulo:ROTULOS_ANALISE[tipo]||tipo,itens}));
        const seguranca=arr(hmaResultado?.alertas).map(a=>({titulo:a?.nome||'Pista de segurança',descricao:a?.acao||a?.desc||''}));
        return {seguranca,modificadores,clusters,testesPrioritarios:testes,analises};
    }

    function gerarPlano(){
        const contexto=contextoAtual();
        const hmaResultado=analisarHistoria(contexto);
        const hma=hmaAtual();
        if(!hmaResultado||hma.length<5){
            ultimoPlano={versao:VERSION,geradoEm:new Date().toISOString(),insuficiente:true,hmaResultado,contexto,regioes:[],hipoteses:[],exame:{seguranca:[],modificadores:[],clusters:[],testesPrioritarios:[],analises:[]}};
            return ultimoPlano;
        }
        const regioes=inferirRegioes(hmaResultado,contexto);
        const hipoteses=regioes.flatMap(r=>candidatosRegiao(r,contexto,hmaResultado)).sort((a,b)=>b.prioridadeOrdenacao-a.prioridadeOrdenacao);
        const modificadores=modificadoresContextuais(contexto);
        const exame=construirExame(hipoteses,hmaResultado,modificadores);
        let planoGerado={
            versao:VERSION,
            geradoEm:new Date().toISOString(),
            insuficiente:false,
            fonteHMA:String(hmaResultado?.versaoMotor||window.KINESYS_HMA_ENGINE_VERSION||''),
            contextoResumo:{idade:contexto?.idade||null,mecanismo:contexto?.mecanismo||'',medicamentos:contexto?.textoMedicamentos||'',cirurgias:contexto?.textoCirurgias||''},
            hmaResultado,regioes,hipoteses,exame,
            lacunas:uniq(arr(hmaResultado?.lacunas)),
            aviso:'Prioridade de investigação; não representa probabilidade diagnóstica nem substitui decisão profissional.'
        };
        if(typeof window.enriquecerPlanoOmbroKineSys==='function'){
            try { planoGerado=window.enriquecerPlanoOmbroKineSys(planoGerado)||planoGerado; }
            catch(err){ console.warn('Motor 3.1 Ombro:',err); }
        }
        ultimoPlano=planoGerado;
        return ultimoPlano;
    }

    function chip(texto,classe=''){ return `<span class="ks30-chip ${classe}">${esc(texto)}</span>`; }
    function renderBridge(plano){
        const host=document.getElementById('ks30_hma_bridge'); if(!host)return;
        if(!plano||plano.insuficiente){host.hidden=true;host.innerHTML='';return;}
        const top=plano.hipoteses.slice(0,3);
        const regioes=plano.regioes.map(r=>r.nome).join(' · ');
        const mod=plano.exame.modificadores.slice(0,3);
        host.hidden=false;
        host.innerHTML=`
            <div class="ks30-bridge-head"><div><strong>Direção para o exame</strong><span>História + contexto clínico</span></div><span class="ks30-count">${plano.exame.testesPrioritarios.length} itens priorizados</span></div>
            <div class="ks30-bridge-regions">${regioes?`<span>Regiões orientadas: <strong>${esc(regioes)}</strong></span>`:'<span>Região ainda não definida com segurança pela história.</span>'}</div>
            <div class="ks30-bridge-hypotheses">${top.map((h,i)=>chip(`${i===0?'Prioridade':'Diferencial'} · ${h.nome}`,i===0?'is-primary':'')).join('')}</div>
            ${mod.length?`<div class="ks30-bridge-modifiers"><strong>Modificadores</strong><span>${mod.map(x=>esc(x.titulo)).join(' · ')}</span></div>`:''}
            <small>O exame deve confirmar, enfraquecer ou manter abertas essas hipóteses. Nenhuma hipótese é fechada apenas pela HMA.</small>`;
    }

    function renderHipotese(h,i){
        const favor=h.aFavor.length?h.aFavor.slice(0,3).join(' · '):'compatibilidade histórica ainda limitada';
        const confirmar=h.aConfirmar.length?h.aConfirmar.slice(0,3).join(' · '):'definir achados discriminativos durante o exame';
        return `<article class="ks30-hypothesis${i===0?' is-primary':''}">
            <div class="ks30-hypothesis-title"><span>${i===0?'Hipótese de trabalho':'Diferencial'}</span><strong>${esc(h.nome)}</strong></div>
            <p><b>A favor:</b> ${esc(favor)}.</p>
            ${h.contra.length?`<p><b>Contra / enfraquece:</b> ${esc(h.contra.slice(0,2).join(' · '))}.</p>`:''}
            <p><b>O exame precisa esclarecer:</b> ${esc(confirmar)}.</p>
        </article>`;
    }

    function renderExame(plano){
        const host=document.getElementById('ks30_exam_plan'); if(!host)return;
        if(!plano||plano.insuficiente){
            host.innerHTML='<div class="ks30-empty"><strong>Plano de exame ainda não preparado</strong><span>Complete a HMA e os dados contextuais antes de avançar para o exame dirigido.</span></div>';
            return;
        }
        const top=plano.hipoteses.slice(0,4);
        const ex=plano.exame;
        host.innerHTML=`
            <header class="ks30-exam-head">
                <div><span class="ks30-kicker">Motor Clínico 3.0 · pré-exame</span><h2>Exame dirigido pelas hipóteses da HMA</h2><p>Comece por segurança e exclusões; depois use os achados de maior utilidade para diferenciar as hipóteses abertas.</p></div>
                <div class="ks30-region-summary">${plano.regioes.map(r=>chip(r.nome,r.origem==='selecionada'?'is-selected':'')).join('')}</div>
            </header>
            ${ex.seguranca.length?`<section class="ks30-section is-safety"><div class="ks30-section-title"><strong>1. Segurança / exclusões prioritárias</strong><span>${ex.seguranca.length} pista(s)</span></div>${ex.seguranca.map(a=>`<div class="ks30-line"><b>${esc(a.titulo)}</b><span>${esc(a.descricao)}</span></div>`).join('')}</section>`:''}
            ${ex.modificadores.length?`<section class="ks30-section"><div class="ks30-section-title"><strong>Contexto que modifica a interpretação</strong></div>${ex.modificadores.map(a=>`<div class="ks30-line"><b>${esc(a.titulo)}</b><span>${esc(a.descricao)}</span></div>`).join('')}</section>`:''}
            <section class="ks30-section"><div class="ks30-section-title"><strong>2. Hipóteses orientadas pela história</strong><span>${top.length}</span></div><div class="ks30-hypothesis-list">${top.map(renderHipotese).join('')}</div></section>
            ${ex.clusters.length?`<section class="ks30-section"><div class="ks30-section-title"><strong>3. Clusters a interpretar em conjunto</strong><span>${ex.clusters.length}</span></div>${ex.clusters.map(h=>`<details class="ks30-cluster"><summary><span>${esc(h.nome)}</span><small>${h.testes.length} componentes</small></summary><div>${h.testes.map(t=>`<p>${esc(t)}</p>`).join('')}${h.regraConfirmacao?`<p class="ks30-rule"><b>Regra de interpretação:</b> ${esc(h.regraConfirmacao)}</p>`:''}${h.evidencia?`<small class="ks30-evidence">Referência cadastrada: ${esc(h.evidencia)}</small>`:''}</div></details>`).join('')}</section>`:''}
            <section class="ks30-section"><div class="ks30-section-title"><strong>4. Testes e análises prioritários</strong><span>${ex.testesPrioritarios.length} itens</span></div><div class="ks30-analysis-grid">${ex.analises.map(g=>`<div class="ks30-analysis"><strong>${esc(g.titulo)}</strong>${g.itens.map(t=>`<div class="ks30-test"><span>${esc(t.texto)}</span><small>Ajuda a diferenciar: ${esc(t.hipoteses.slice(0,2).join(' · '))}</small></div>`).join('')}</div>`).join('')}</div></section>
            ${plano.lacunas.length?`<section class="ks30-section is-gaps"><div class="ks30-section-title"><strong>Antes de fechar a síntese</strong></div>${plano.lacunas.slice(0,6).map(x=>`<div class="ks30-line"><span>${esc(x)}</span></div>`).join('')}</section>`:''}
            <footer class="ks30-disclaimer">Prioridade de investigação, não probabilidade diagnóstica. Registre os resultados no Motor Clínico; a síntese final permanece sob decisão do fisioterapeuta.</footer>`;
    }

    function garantirUI(){
        const radarCard=document.querySelector('#tela_avaliacao .hma-radar-card');
        if(radarCard&&!document.getElementById('ks30_hma_bridge')){
            const bridge=document.createElement('section');bridge.id='ks30_hma_bridge';bridge.className='ks30-hma-bridge';bridge.hidden=true;
            const helper=radarCard.querySelector('.hma-radar-helper');
            if(helper) helper.insertAdjacentElement('beforebegin',bridge); else radarCard.appendChild(bridge);
            const title=radarCard.querySelector('.hma-title-secondary'); if(title) title.textContent='Hipóteses e direção do exame';
        }
        const etapa2=document.getElementById('subtela_mapeamento');
        if(etapa2&&!document.getElementById('ks30_exam_plan')){
            const panel=document.createElement('section');panel.id='ks30_exam_plan';panel.className='ks30-exam-plan';panel.setAttribute('aria-live','polite');
            etapa2.insertAdjacentElement('afterbegin',panel);
        }
    }

    function assinaturaAtualizacao(){
        const c=contextoAtual();
        const cirurgias=arr(c?.cirurgias).map(x=>typeof x==='string'?x:(x?.texto||x?.nome||''));
        return JSON.stringify({
            hma:n(hmaAtual()), origem:n(c?.origemIrradiacao||''), irradiacao:n(c?.irradiacao||''),
            mecanismo:n(c?.mecanismo||''), idade:Number(c?.idade)||0,
            fatores:arr(c?.fatoresPiora).map(n).sort(),
            medicamentos:n(c?.textoMedicamentos||arr(c?.medicamentos).join(' ')),
            cirurgias:n(c?.textoCirurgias||cirurgias.join(' ')),
            regioes:regioesSelecionadasAtual().slice().sort()
        });
    }

    function atualizar(forcar=false){
        garantirUI();
        const assinatura=assinaturaAtualizacao();
        if(!forcar&&ultimoPlano&&assinatura===ultimaAssinaturaAtualizacao)return ultimoPlano;
        const plano=gerarPlano();
        ultimaAssinaturaAtualizacao=assinatura;
        renderBridge(plano);renderExame(plano);
        const etapa2=document.getElementById('subtela_mapeamento');
        if(etapa2?.classList.contains('ativa')){
            const ctx=document.querySelector('#ks-eval-step-context span');
            if(ctx) ctx.textContent='Use a HMA para testar hipóteses: segurança primeiro, depois clusters, testes e análises discriminativas.';
        }
        window.KineSysMotorClinico3.ultimoPlano=plano;
        document.dispatchEvent(new CustomEvent('kinesys:motor3-plano-atualizado',{detail:{versao:VERSION,regioes:plano.regioes.map(r=>r.id),hipoteses:plano.hipoteses.map(h=>h.id)}}));
        return plano;
    }
    function agendarAtualizacao(atraso=220){ clearTimeout(timerAtualizacao);timerAtualizacao=setTimeout(()=>atualizar(false),atraso); }

    function instalarEventos(){
        const tela=document.getElementById('tela_avaliacao'); if(!tela)return;
        ['paciente_hma','paciente_origem_irradiacao','paciente_irradiacao','paciente_mecanismo_lesao','paciente_idade'].forEach(id=>{
            const el=document.getElementById(id);if(el){
                el.addEventListener('input',()=>agendarAtualizacao(id==='paciente_hma'?460:220));
                el.addEventListener('change',()=>agendarAtualizacao(80));
            }
        });
        tela.addEventListener('change',e=>{
            if(e.target?.matches('#grupo_regioes_mapeamento input,.fatores-piora-compactos input,input[name*="comorb"],input[name*="anteced"]')) agendarAtualizacao();
        });
        ['tags_medicamentos','tags_cirurgias'].forEach(id=>{
            const el=document.getElementById(id);
            if(el)new MutationObserver(()=>agendarAtualizacao(120)).observe(el,{childList:true,subtree:true,characterData:true});
        });
        const etapaMapeamento=document.getElementById('subtela_mapeamento');
        if(etapaMapeamento){
            new MutationObserver(mudancas=>{
                if(mudancas.some(m=>m.target===etapaMapeamento&&m.attributeName==='class'))agendarAtualizacao(100);
            }).observe(etapaMapeamento,{attributes:true,attributeFilter:['class']});
        }
        const grupoRegioes=document.getElementById('grupo_regioes_mapeamento');
        if(grupoRegioes){
            new MutationObserver(()=>agendarAtualizacao(120)).observe(grupoRegioes,{childList:true,subtree:true});
        }
    }

    function auditoria(opcoes={}){
        const casos=[
            {id:'M3-1',hma:'Dor cervical que desce pelo braço até a mão com dormência e fraqueza.',espera:'cervical'},
            {id:'M3-2',hma:'Dor lateral no quadril que piora ao deitar sobre o lado doloroso e ao subir escadas.',espera:'quadril'},
            {id:'M3-3',hma:'Entorse de tornozelo após pisar em falso, com dor lateral e dificuldade para caminhar.',espera:'tornozelo'}
        ];
        if(typeof window.analisarHMAClinicaKineSys!=='function')return{ok:false,motivo:'analisador HMA indisponível'};
        const B=banco();
        const resultados=casos.map(c=>{
            const r=window.analisarHMAClinicaKineSys(c.hma)||{};
            const fakeCtx={hma:c.hma,origemIrradiacao:'',irradiacao:'',mecanismo:'',fatoresPiora:[],medicamentos:[],cirurgias:[]};
            const regs=Object.entries(B).map(([id,reg])=>scoreRegiao(id,reg,r,c.hma)).sort((a,b)=>b.score-a.score).slice(0,2);
            return {id:c.id,passou:regs.some(x=>n(x.id).includes(n(c.espera))),regioes:regs.map(x=>x.id),principal:r?.suspeitaPrincipal?.nome||''};
        });
        const resumo={versao:VERSION,total:resultados.length,passou:resultados.filter(x=>x.passou).length};resumo.falhou=resumo.total-resumo.passou;
        if(opcoes.console!==false&&typeof console!=='undefined'){console.group('KineSys — auditoria Motor 3 HMA');console.table(resultados);console.log(resumo);console.groupEnd();}
        return{resumo,resultados};
    }

    window.KineSysMotorClinico3={version:VERSION,ultimoPlano:null,gerarPlano,atualizar,auditoria};
    window.gerarPlanoClinicoHMAKineSys=gerarPlano;
    window.obterPlanoExameHMAKineSys=function(idRegiao=''){
        const p=ultimoPlano||gerarPlano();
        if(!idRegiao)return p;
        return {...p,regioes:p.regioes.filter(r=>r.id===idRegiao),hipoteses:p.hipoteses.filter(h=>h.regiaoId===idRegiao)};
    };
    window.atualizarMotorClinico3KineSys=atualizar;
    window.executarAuditoriaMotor3HMAKineSys=auditoria;

    function init(){ garantirUI();instalarEventos();atualizar(); }
    if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
