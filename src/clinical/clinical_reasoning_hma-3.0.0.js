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

    const VERSION='3.0.8-exame-adaptativo';
    const MAX_REGIOES=2;
    const MAX_HIPOTESES_POR_REGIAO=4;
    const MAX_TESTES=9;
    const STOPWORDS=new Set(['dor','com','para','sem','por','uma','das','dos','de','do','da','em','no','na','e','ou','hipotese','suspeita','sindrome','padrao','clinico','clinica','relacionada','relacionado','possivel','lombar','lombossacra','cervical','toracica','coluna','ombro','cotovelo','punho','mao','quadril','virilha','joelho','tornozelo','perna','braco']);
    let ultimoPlano=null;
    let timerAtualizacao=null;
    let ultimaAssinaturaAtualizacao=null;
    const hipotesesAdicionadas=new Set();
    const hipotesesDescartadas=new Set();
    let catalogoHipoteses=[];
    let pacienteDasHipoteses='';

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
    function familiasClinicas(v=''){
        const t=n(v),familias=[];
        const add=(id,rx)=>{if(rx.test(t))familias.push(id);};
        add('neural',/radicul|ciat|neural|neurop|nervo|dermatom|miotom|reflex|parestes|formig|dormenc|choque|queim/);
        add('tendinea',/tend|manguito|aquiles|epicondil|biceps|glute/);
        add('ligamentar',/ligament|instabil|entorse|lca|lcp|colateral|sindesm/);
        add('intra_articular',/menisc|labral|labrum|cartilag|impacto|femoroacetab|patelofem|femoropatel/);
        add('fratura',/fratur|compressao vertebral|escafoide|lisfranc/);
        add('pos_operatorio',/pos operator|pos cirurg|artrodese|discectom|laminectom|protese/);
        add('degenerativa',/artrose|osteoartrose|estenose|degenerativ/);
        add('mecanica',/mecanic|inespecific|controle de movimento|mobilidade/);
        add('inflamatoria',/inflam|artrite|capsulite|bursite|sinovite/);
        add('cefaleia',/cefale|migran|enxaqueca|cervicogenic/);
        add('orofacial',/temporomandib|orofacial|mandib|brux|masseter/);
        return uniq(familias);
    }
    function textoHipoteseHMA(h){
        return [h?.nome||'',...arr(h?.aFavor),...arr(h?.aConfirmar)].join(' ');
    }
    function evidenciasDaHistoria(texto,termos){
        const clausulas=String(texto||'').split(/[.;!?\n]|\b(?:mas|porém|porem|entretanto)\b/i);
        const positivas=[],negadas=[];
        arr(termos).forEach(termo=>{
            const palavras=n(termo).split(' ').filter(x=>x.length>=3&&!['para','com','das','dos','uma'].includes(x));
            if(!palavras.length)return;
            let afirmado=false,negado=false;
            clausulas.forEach(c=>{
                const partes=n(c).split(' ');
                const pos=palavras.map(p=>partes.findIndex(x=>x===p||(p.length>=6&&x.length>=6&&x.startsWith(p.slice(0,-2)))));
                if(pos.some(i=>i<0)||Math.max(...pos)-Math.min(...pos)>12)return;
                const inicio=Math.min(...pos),antes=partes.slice(Math.max(0,inicio-4),inicio).join(' ');
                if(/(?:^| )(?:nega|negou|sem|ausencia de|nao apresenta|nao relata|nao tem)(?: |$)/.test(antes)){negado=true;return;}
                afirmado=true;
            });
            if(afirmado)positivas.push(termo);else if(negado)negadas.push(termo);
        });
        return {positivas:uniq(positivas),negadas:uniq(negadas)};
    }
    function contribuicaoSemanticaFunil(item,hmaResultado){
        const perfis=nomeHipotesesHMA(hmaResultado),itemFamiliaTexto=[item?.nome||'',...arr(item?.palavrasChaveHMA)].join(' '),itemTexto=[itemFamiliaTexto,...arr(item?.testes).map(textoTeste),item?.interpretacao||''].join(' ');
        const familiasItem=new Set(familiasClinicas(itemFamiliaTexto));
        const principal=hmaResultado?.suspeitaPrincipal||null;
        if(principal){
            const texto=textoHipoteseHMA(principal),sim=similaridade(itemFamiliaTexto,texto),familiasPrincipal=familiasClinicas(principal?.nome||'');
            const compartilha=familiasPrincipal.some(id=>familiasItem.has(id));
            if(compartilha&&sim>=.2)return{score:Math.min(2.6,1.2+sim),perfil:principal,motivo:'hipótese da HMA compatível com o padrão e a família clínica'};
            if(compartilha)return{score:.45,perfil:null,motivo:'mesma família clínica; requer evidência específica para priorização'};
            if((!familiasPrincipal.length||!familiasItem.size)&&sim>=.24)return{score:Math.min(1.6,sim*3),perfil:principal,motivo:'evidências combinadas da HMA compatíveis com a hipótese'};
        }
        let melhor=0,familia=false,perfil=null;
        perfis.filter(h=>h!==principal).forEach(h=>{
            const texto=textoHipoteseHMA(h),sim=similaridade(itemFamiliaTexto,texto);
            const compartilha=familiasClinicas(h?.nome||'').some(id=>familiasItem.has(id));
            const valor=(sim+(compartilha ? .35 : 0))*.45;
            if(valor>melhor){melhor=valor;familia=compartilha;perfil=h;}
        });
        if(!perfil)return{score:0,perfil:null,motivo:''};
        if(familia)return{score:Math.min(2.6,2.1+Math.min(.5,melhor))*.35,perfil,motivo:'diferencial da HMA parcialmente compatível'};
        if(melhor>=.24)return{score:Math.min(1.6,melhor*3),perfil,motivo:'evidências combinadas da HMA compatíveis com a hipótese'};
        return{score:0,perfil:null,motivo:''};
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
    function indiceRegioes(){
        try { return typeof BANCO_MAPEAMENTO_REGIOES!=='undefined' ? BANCO_MAPEAMENTO_REGIOES : banco(); }
        catch(_) { return banco(); }
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
        lombar:['lombar','lombalgia','ciatica','sacroiliaca'],
        quadril:['quadril','coxa','virilha','glute'],
        joelho:['joelho','patela','menisco'],
        tornozelo_pe:['tornozelo','pe','calcaneo','calcanhar','aquiles','metatarso','antepe','mediope','plantar'],
        tornozelo:['tornozelo','pe','calcaneo','calcanhar','aquiles','metatarso','antepe','mediope','plantar'],
        cefaleia:['cefaleia','dor de cabeca','enxaqueca','migranea','migranoso']
    };

    function incluiExpressao(texto,expressao){
        const t=' '+n(texto)+' ',x=n(expressao);return !!x&&t.includes(' '+x+' ');
    }

    function origemDoTrajeto(hmaResultado,contexto={}){
        if(arr(hmaResultado?.topologiaAnatomica?.conflitosLateralidade).length||arr(hmaResultado?.conflitosLateralidade).length)return '';
        const sinais=new Set(arr(hmaResultado?.sinais));
        const origem=n(contexto.origemIrradiacao||'');
        if(/\b(cervical|pescoco|nuca)\b/.test(origem)&&n(contexto.irradiacao))return 'cervical';
        if(/\b(lombar|lombossacra)\b/.test(origem)&&n(contexto.irradiacao))return 'lombar';
        if(sinais.has('cervical')&&(sinais.has('irradiacaoBraco')||sinais.has('trajetoAlemCotovelo')))return 'cervical';
        if(sinais.has('lombar')&&(sinais.has('irradiacaoPerna')||sinais.has('trajetoAlemJoelhoLombar')))return 'lombar';
        return '';
    }
    function queixaLocalIndependente(texto,aliases){
        // O destino de uma irradiação não é, sozinho, uma segunda queixa local.
        return String(texto||'').split(/[.;!?\n]|\b(?:além disso|também|mas)\b/i).some(frase=>{
            const t=n(frase);
            if(/\b(?:irrad|irradi|desce|irradiacao|trajeto)/.test(t))return false;
            return aliases.some(a=>evidenciasDaHistoria(frase,[a]).positivas.length)&&
                /\b(?:dor|dolor|fraqueza|travamento|edema|inchaco|entorse|trauma|queimacao)\b/.test(t);
        });
    }
    function scoreRegiao(id,reg,hmaResultado,textoHistoria,contexto={}){
        let score=0; const motivos=[];
        const local=n(hmaResultado?.local||'');
        const aliases=ALIASES_REGIAO[id]||[n(reg?.nome||id),n(id)];
        const sinais=new Set(arr(hmaResultado?.sinais)),negacoes=new Set(arr(hmaResultado?.negacoesDetectadas).map(x=>x?.conceito));
        const origem=origemDoTrajeto(hmaResultado,contexto);
        const origemLombar=origem==='lombar',origemCervical=origem==='cervical';
        const destinoConectado=(origemLombar&&['quadril','joelho','tornozelo_pe','tornozelo'].includes(id))||(origemCervical&&['ombro','cotovelo','punho_mao'].includes(id));
        if(destinoConectado&&!queixaLocalIndependente(textoHistoria,aliases))return {id,nome:reg?.nome||id,score:0,motivos:['destino de irradiação, sem queixa local independente']};
        if(origem===id){score+=8;motivos.push('origem do trajeto irradiado');}
        const outraRegiaoNoMesmoTrajeto=(origemLombar&&id!=='lombar')||(origemCervical&&id!=='cervical');
        const trajetoNegado=negacoes.has('irradiacaoPerna')||negacoes.has('irradiacaoBraco');
        aliases.forEach(a=>{ if(a&&incluiExpressao(local,a)){score+=4;motivos.push('localização extraída da HMA');} });
        if(sinais.has(id)||(id==='coluna_toracica'&&sinais.has('toracica'))||(id==='lombar'&&(sinais.has('sacroiliaca')||sinais.has('sacroiliacaDominante')))){score+=4;motivos.push('região sustentada pelo funil anatômico');}
        const cefaleiaSemOrigemCervical=id==='cervical'&&/\b(?:dor de cabeca|cefaleia|enxaqueca|migran)/.test(n(textoHistoria))&&!/\b(?:cervical|pescoco|nuca)/.test(n(textoHistoria));
        if(!destinoConectado&&!outraRegiaoNoMesmoTrajeto&&!trajetoNegado&&!cefaleiaSemOrigemCervical)arr(reg?.palavrasChave).forEach(p=>{ if(p&&incluiExpressao(textoHistoria,p)){score+=0.55;} });
        const nomes=[hmaResultado?.suspeitaPrincipal?.nome||'',...arr(hmaResultado?.diferenciais).map(x=>x?.nome||'')].join(' ');
        aliases.forEach(a=>{ if(a&&incluiExpressao(nomes,a)){score+=1.6;motivos.push('hipótese da HMA compatível com a região');} });
        return {id,nome:reg?.nome||id,score,motivos:uniq(motivos)};
    }

    function inferirRegioes(hmaResultado,contexto){
        const B=indiceRegioes(); const selecionadas=regioesSelecionadasAtual();
        const controles=Array.from(document.querySelectorAll('#grupo_regioes_mapeamento input[data-regiao]'));
        // Depois que a seleção aparece na interface, ela é a fonte de verdade.
        // Não repor pelo texto da HMA uma região que o profissional retirou.
        if(controles.length&&controles.some(i=>i.dataset.tocadoManualmente==='true')){
            return selecionadas.filter(id=>B[id]).map(id=>({id,nome:B[id].nome||id,origem:'selecionada',score:99,motivos:['selecionada pelo fisioterapeuta']}));
        }
        const out=[]; const seen=new Set();
        selecionadas.filter(id=>{const campo=document.getElementById('chk_regiao_'+id);return campo?.dataset.tocadoManualmente==='true'||campo?.dataset.sugeridaPelaHMA!=='true';}).forEach(id=>{if(B[id]&&!seen.has(id)){seen.add(id);out.push({id,nome:B[id].nome||id,origem:'selecionada',score:99,motivos:['selecionada pelo fisioterapeuta']});}});
        const texto=[hmaAtual(),contexto?.origemIrradiacao||'',contexto?.irradiacao||''].join(' ');
        Object.entries(B).map(([id,reg])=>scoreRegiao(id,reg,hmaResultado,texto,contexto)).sort((a,b)=>b.score-a.score)
            // Um sintoma genérico (por exemplo, "formigamento") não pode criar
            // sozinho uma segunda região sem apoio anatômico ou da hipótese da HMA.
            .filter(x=>x.score>=1.6).forEach(x=>{if(out.length<MAX_REGIOES&&!seen.has(x.id)){seen.add(x.id);out.push({...x,origem:'hma'});}});
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
        const evidencia=evidenciasDaHistoria(hmaAtual(),item?.palavrasChaveHMA);
        const kw=evidencia.positivas.slice(0,3);
        if(kw.length){const p=Math.min(2.4,kw.length*Math.min(Number(pesos.palavraChave)||.65,1.2));score+=p;contrib.push(`HMA: ${kw.slice(0,2).join(' / ')}`);}
        if(evidencia.negadas.length){score-=Math.min(2.4,evidencia.negadas.length*.8);contrib.push(`menos compatível: achado negado na HMA (${evidencia.negadas.slice(0,2).join(' / ')})`);}

        const familiasItem=new Set(familiasClinicas([item?.nome||'',...arr(item?.palavrasChaveHMA)].join(' ')));
        const negacoesHMA=new Set(arr(hmaResultado?.negacoesDetectadas).map(x=>x?.conceito));
        const sinaisHMA=new Set(arr(hmaResultado?.sinais));
        const negaTrajeto=negacoesHMA.has('irradiacaoPerna')||negacoesHMA.has('irradiacaoBraco');
        const sustentaNeural=sinaisHMA.has('neurologico')||sinaisHMA.has('irradiacaoPerna')||sinaisHMA.has('irradiacaoBraco')||sinaisHMA.has('trajetoAlemJoelhoLombar')||sinaisHMA.has('trajetoAlemCotovelo');
        if(familiasItem.has('neural')&&negaTrajeto&&!sustentaNeural){score-=3.5;contrib.push('trajeto neural explicitamente negado; hipótese menos compatível');}
        if(idRegiao==='coluna_toracica'&&familiasItem.has('neural')&&sinaisHMA.has('toracica')&&sinaisHMA.has('neurologico')){
            score+=2.2;
            contrib.push('padrão torácico em faixa com componente sensitivo/neuropático');
        }
        const rotuloSemConfirmacaoRadicular=/sem confirmacao radicular/.test(n(item?.nome||''));
        const principalRadicular=/radicul|ciat/.test(n(hmaResultado?.suspeitaPrincipal?.nome||''));
        if(rotuloSemConfirmacaoRadicular&&principalRadicular&&sustentaNeural){
            score-=1.6;
            contrib.push('achados neurais sustentam investigação radicular antes do padrão irradiado sem confirmação');
        }

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
        hmas.forEach(h=>{const pesoPapel=h===hmaResultado?.suspeitaPrincipal?1:.45,s=similaridade(item?.nome||'',h?.nome||'')*pesoPapel;if(s>sim){sim=s;melhor=h;}});
        if(sim>=.5){score+=2.4;contrib.push('corresponde à hipótese extraída da HMA');}
        else if(sim>=.28){score+=1.25;contrib.push('relaciona-se a diferencial da HMA');}

        const funil=contribuicaoSemanticaFunil(item,hmaResultado);
        if(funil.score){score+=funil.score;contrib.push(funil.motivo);if(!melhor)melhor=funil.perfil;}

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

    function candidatosRegiao(regiaoInfo,contexto,hmaResultado,incluirTodos=false){
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
          .filter(x=>incluirTodos||x.prioridadeOrdenacao>=1.2)
          .slice(0,incluirTodos?Number.MAX_SAFE_INTEGER:MAX_HIPOTESES_POR_REGIAO);
    }

    function chaveHipotese(h){return [h.regiaoId,h.grupo,h.id].join('|');}
    function listarHipotesesDisponiveis(){
        const presentes=new Set(arr(ultimoPlano?.hipoteses).map(chaveHipotese));
        return catalogoHipoteses.filter(h=>!presentes.has(chaveHipotese(h)))
            .map(h=>({chave:chaveHipotese(h),nome:h.nome,regiaoNome:h.regiaoNome}));
    }
    function adicionarHipotese(chave){
        if(!catalogoHipoteses.some(h=>chaveHipotese(h)===chave))return false;
        hipotesesDescartadas.delete(chave);hipotesesAdicionadas.add(chave);atualizar(true);return true;
    }
    function descartarHipotese(chave){
        if(!arr(ultimoPlano?.hipoteses).some(h=>chaveHipotese(h)===chave))return false;
        hipotesesAdicionadas.delete(chave);hipotesesDescartadas.add(chave);atualizar(true);return true;
    }
    function hipotesesManuais(){return [...hipotesesAdicionadas];}

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

    function achadosRegistrados(){
        try {return arr(window.coletarAchadosLaudoKineSys?.());} catch(_){return [];}
    }
    function atualizarHipotesePeloExame(h,achados){
        const registros=achados.filter(a=>a.id===h.id&&a.regiaoId===h.regiaoId&&(!a.grupo||a.grupo===h.grupo));
        const respostas=arr(h.testes).map(texto=>{
            const a=registros.flatMap(r=>arr(r.achados)).find(r=>n(r.texto)===n(texto));
            return ['positivo','negativo','inconclusivo'].includes(a?.resultado)?a.resultado:'';
        });
        const positivos=respostas.filter(r=>r==='positivo').length,negativos=respostas.filter(r=>r==='negativo').length,inconclusivos=respostas.filter(r=>r==='inconclusivo').length;
        const respondidos=positivos+negativos+inconclusivos,total=respostas.length;
        const situacao=!respondidos?'aguardando_exame':positivos&&negativos?'achados_divergentes':respondidos<total?'exame_parcial':inconclusivos?'exame_inconclusivo':positivos?'achados_favoraveis':'achados_desfavoraveis';
        const rotulos={aguardando_exame:'Aguardando exame',achados_divergentes:'Achados divergentes',exame_parcial:'Exame parcial',achados_favoraveis:'Achados favoráveis',achados_desfavoraveis:'Achados desfavoráveis',exame_inconclusivo:'Exame inconclusivo'};
        // Ajuste de investigação limitado. Não aplica limiares diagnósticos, nem altera os dados registrados.
        const ajuste=total?2*(positivos-negativos)/total:0;
        return {...h,prioridadeHistoria:h.prioridadeOrdenacao,prioridadeOrdenacao:Number(h.prioridadeOrdenacao||0)+ajuste,
            exameAtual:{situacao,rotulo:rotulos[situacao],positivos,negativos,inconclusivos,respondidos,total}};
    }
    function priorizarTestes(testes,hipoteses,limite=MAX_TESTES){
        const mapa=new Map();
        testes.forEach(t=>{
            const key=n(t.texto);if(!key)return;
            const anterior=mapa.get(key)||{};
            mapa.set(key,{...anterior,...t,hipoteses:uniq([...arr(anterior.hipoteses),...arr(t.hipoteses)]),
                hipoteseIds:uniq([...arr(anterior.hipoteseIds),anterior.hipoteseId,...arr(t.hipoteseIds),t.hipoteseId,t.condicaoId]),
                regiaoIds:uniq([...arr(anterior.regiaoIds),...arr(t.regiaoIds),t.regiaoMotor31]),
                prioridade:Math.max(Number(anterior.prioridade)||0,Number(t.prioridade)||0)});
        });
        const candidatos=[...mapa.values()].map(t=>{
            const vinculadas=hipoteses.filter(h=>(t.hipoteseIds.includes(h.id)||arr(t.hipoteses).some(nome=>n(nome)===n(h.nome)))&&(!t.regiaoIds.length||t.regiaoIds.includes(h.regiaoId)));
            t.hipoteseIds=uniq([...t.hipoteseIds,...vinculadas.map(h=>h.id)]);
            t.regiaoIds=uniq([...t.regiaoIds,...vinculadas.map(h=>h.regiaoId)]);
            const concorrentes=hipoteses.filter(h=>t.regiaoIds.includes(h.regiaoId)&&!vinculadas.includes(h));
            const discriminativo=vinculadas.length>0&&concorrentes.length>0;
            return {...t,hipoteseId:t.hipoteseIds.length===1?t.hipoteseIds[0]:'',discriminativo,
                motivoPriorizacao:discriminativo?'Diferencia hipóteses concorrentes da mesma região':'Avalia achados pertinentes às hipóteses em investigação'};
        });
        const selecionados=[],cobertas=new Set();
        // Primeiro oferece uma verificação específica para cada hipótese; depois completa o conjunto.
        hipoteses.forEach(h=>{
            if(cobertas.has(chaveHipotese(h))||selecionados.length>=limite)return;
            const t=candidatos.filter(t=>!selecionados.includes(t)&&t.hipoteseIds.includes(h.id)&&t.regiaoIds.includes(h.regiaoId))
                .sort((a,b)=>Number(b.discriminativo)-Number(a.discriminativo)||b.prioridade-a.prioridade)[0];
            if(t){selecionados.push(t);hipoteses.filter(x=>t.hipoteseIds.includes(x.id)&&t.regiaoIds.includes(x.regiaoId)).forEach(x=>cobertas.add(chaveHipotese(x)));}
        });
        candidatos.filter(t=>!selecionados.includes(t)).sort((a,b)=>Number(b.discriminativo)-Number(a.discriminativo)||b.prioridade-a.prioridade)
            .slice(0,Math.max(0,limite-selecionados.length)).forEach(t=>selecionados.push(t));
        return selecionados;
    }

    function construirExame(hipoteses,hmaResultado,modificadores,limite=MAX_TESTES){
        const clusters=hipoteses.filter(h=>h.grupo==='cluster'&&h.testes.length).slice(0,3);
        const mapa=new Map();
        hipoteses.forEach(h=>h.testes.forEach(t=>{
            const key=n(t); if(!key)return;
            if(!mapa.has(key)) mapa.set(key,{texto:t,tipo:classificarTeste(t),hipoteses:[],hipoteseIds:[],regiaoIds:[],prioridade:h.prioridadeOrdenacao});
            const x=mapa.get(key); x.hipoteses.push(h.nome);x.hipoteseIds.push(h.id);x.regiaoIds.push(h.regiaoId);x.prioridade=Math.max(x.prioridade,h.prioridadeOrdenacao);
        }));
        const testes=priorizarTestes([...mapa.values()],hipoteses,limite);
        const grupos={}; testes.forEach(t=>{(grupos[t.tipo]||(grupos[t.tipo]=[])).push(t);});
        const analises=Object.entries(grupos).map(([tipo,itens])=>({tipo,titulo:ROTULOS_ANALISE[tipo]||tipo,itens}));
        const seguranca=arr(hmaResultado?.alertas).map(a=>({titulo:a?.nome||'Pista de segurança',descricao:a?.acao||a?.desc||''}));
        return {seguranca,modificadores,clusters,testesPrioritarios:testes,analises};
    }

    function gerarPlano(){
        const pacienteId=String(document.getElementById('select_paciente_precadastro')?.value||
            (typeof pacienteAtualId!=='undefined'?pacienteAtualId:'')||document.getElementById('paciente_nome')?.value||'').trim();
        if(pacienteId&&pacienteDasHipoteses&&pacienteId!==pacienteDasHipoteses){
            hipotesesAdicionadas.clear();hipotesesDescartadas.clear();catalogoHipoteses=[];
        }
        if(pacienteId)pacienteDasHipoteses=pacienteId;
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
        if(typeof window.enriquecerPlanoCotoveloKineSys==='function'){
            try { planoGerado=window.enriquecerPlanoCotoveloKineSys(planoGerado)||planoGerado; }
            catch(err){ console.warn('Motor 3.1 Cotovelo:',err); }
        }
        const regioesAtivas=new Set(regioes.map(r=>r.id));
        // O grupo canônico vem do banco, não da presença eventual de um limiar no item.
        planoGerado.hipoteses=arr(planoGerado.hipoteses).map(h=>{
            const reg=banco()[h.regiaoId];
            const grupo=arr(reg?.clusters).some(i=>i.id===h.id)?'cluster':arr(reg?.diferenciais).some(i=>i.id===h.id)?'diferencial':h.grupo;
            return {...h,grupo};
        });
        const todos=regioes.flatMap(r=>candidatosRegiao(r,contexto,hmaResultado,true));
        catalogoHipoteses=Array.from(new Map([...todos,...arr(planoGerado.hipoteses)].map(h=>[chaveHipotese(h),h])).values())
            .filter(h=>regioesAtivas.has(h.regiaoId));
        const porChave=new Map(arr(planoGerado.hipoteses).filter(h=>regioesAtivas.has(h.regiaoId)).map(h=>[chaveHipotese(h),h]));
        catalogoHipoteses.filter(h=>hipotesesAdicionadas.has(chaveHipotese(h))).forEach(h=>porChave.set(chaveHipotese(h),h));
        catalogoHipoteses.filter(h=>window.obterEstadoRegiao?.(h.regiaoId)?.hipotesePrincipalAtiva===`${h.grupo}::${h.id}`)
            .forEach(h=>{if(!porChave.has(chaveHipotese(h)))porChave.set(chaveHipotese(h),h);});
        const registrados=achadosRegistrados();
        // Uma mudança na HMA não pode apagar do plano uma hipótese com exame já registrado.
        catalogoHipoteses.filter(h=>registrados.some(a=>a.id===h.id&&a.regiaoId===h.regiaoId&&(!a.grupo||a.grupo===h.grupo)))
            .forEach(h=>{if(!porChave.has(chaveHipotese(h)))porChave.set(chaveHipotese(h),h);});
        planoGerado.hipoteses=[...porChave.values()].filter(h=>!hipotesesDescartadas.has(chaveHipotese(h))&&!arr(window.obterEstadoRegiao?.(h.regiaoId)?.hipotesesDescartadas).includes(`${h.grupo}::${h.id}`))
            .map(h=>atualizarHipotesePeloExame(h,registrados))
            .sort((a,b)=>Number(b.prioridadeOrdenacao||0)-Number(a.prioridadeOrdenacao||0));
        planoGerado.regioes=arr(planoGerado.regioes).filter(r=>regioesAtivas.has(r.id));
        // Exames e clusters derivam exclusivamente das hipóteses ainda abertas.
        const exameAtual=planoGerado.exame||{};
        const reconstruido=construirExame(planoGerado.hipoteses,hmaResultado,modificadores,Number.MAX_SAFE_INTEGER);
        planoGerado.exame={...exameAtual,...reconstruido,
            seguranca:regioesAtivas.has('cervical')?arr(exameAtual.seguranca):reconstruido.seguranca};
        const chavesAbertas=new Set(planoGerado.hipoteses.map(chaveHipotese));
        const condicoesAbertas=new Set(planoGerado.hipoteses.map(h=>h.motor31?.condicaoId).filter(Boolean));
        const rotulosAbertos=new Set(planoGerado.hipoteses.map(h=>h.nome));
        ['Cervical','Ombro','Cotovelo'].forEach(sufixo=>{
            const familia='familias'+sufixo,matriz='matriz'+sufixo;
            if(Array.isArray(exameAtual[familia]))planoGerado.exame[familia]=exameAtual[familia].filter(f=>condicoesAbertas.has(f.id));
            if(Array.isArray(exameAtual[matriz]))planoGerado.exame[matriz]=exameAtual[matriz].filter(f=>condicoesAbertas.has(f.id));
            arr(planoGerado.exame[familia]).forEach(f=>rotulosAbertos.add(f.nome));
        });
        Object.values(planoGerado.motores31||{}).forEach(m=>{
            if(Array.isArray(m.condicoes))m.condicoes=m.condicoes.filter(f=>condicoesAbertas.has(f.id));
        });
        const familiasEspecialistas=['familiasCervical','familiasOmbro','familiasCotovelo'].flatMap(chave=>arr(planoGerado.exame[chave]));
        const testesEspecialistas=arr(exameAtual.testesPrioritarios).filter(t=>{
            if(t.regiaoMotor31&&!regioesAtivas.has(t.regiaoMotor31))return false;
            if(!t.motor31)return false;
            return arr(t.hipoteses).some(nome=>rotulosAbertos.has(nome));
        }).map(t=>{
            const familias=familiasEspecialistas.filter(f=>arr(t.hipoteses).includes(f.nome));
            const vinculadas=planoGerado.hipoteses.filter(h=>(!t.regiaoMotor31||h.regiaoId===t.regiaoMotor31)&&
                (arr(t.hipoteses).includes(h.nome)||familias.some(f=>f.id===h.motor31?.condicaoId)));
            return {...t,hipoteseIds:uniq([...arr(t.hipoteseIds),...vinculadas.map(h=>h.id)]),regiaoIds:uniq([...arr(t.regiaoIds),...vinculadas.map(h=>h.regiaoId)])};
        });
        planoGerado.exame.testesPrioritarios=priorizarTestes([...testesEspecialistas,...reconstruido.testesPrioritarios],planoGerado.hipoteses);
        const grupos={};planoGerado.exame.testesPrioritarios.forEach(t=>{(grupos[t.tipo]||(grupos[t.tipo]=[])).push(t);});
        planoGerado.exame.analises=Object.entries(grupos).map(([tipo,itens])=>({tipo,titulo:ROTULOS_ANALISE[tipo]||tipo,itens}));
        planoGerado.exame.clusters=arr(planoGerado.exame.clusters).filter(h=>chavesAbertas.has(chaveHipotese(h)));
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
            <div class="ks30-bridge-hypotheses">${top.map((h,i)=>chip(`${i===0?'Prioridade':'Diferencial'} · ${h.nome}${h.exameAtual?.respondidos?' · '+h.exameAtual.rotulo:''}`,i===0?'is-primary':'')).join('')}</div>
            ${mod.length?`<div class="ks30-bridge-modifiers"><strong>Modificadores</strong><span>${mod.map(x=>esc(x.titulo)).join(' · ')}</span></div>`:''}
            <small>O exame deve confirmar, enfraquecer ou manter abertas essas hipóteses. Nenhuma hipótese é fechada apenas pela HMA.</small>`;
    }

    function garantirUI(){
        const radarCard=document.querySelector('#tela_avaliacao .hma-radar-card');
        if(radarCard&&!document.getElementById('ks30_hma_bridge')){
            const bridge=document.createElement('section');bridge.id='ks30_hma_bridge';bridge.className='ks30-hma-bridge';bridge.hidden=true;
            const helper=radarCard.querySelector('.hma-radar-helper');
            if(helper) helper.insertAdjacentElement('beforebegin',bridge); else radarCard.appendChild(bridge);
            const title=radarCard.querySelector('.hma-title-secondary'); if(title) title.textContent='Hipóteses e direção do exame';
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
            regioes:regioesSelecionadasAtual().slice().sort(),
            exame:achadosRegistrados().map(a=>[a.regiaoId,a.grupo,a.id,arr(a.achados).map(t=>[t.texto,t.resultado])])
        });
    }

    function sincronizarRegioesDoRadar(plano){
        const controles=Array.from(document.querySelectorAll('#grupo_regioes_mapeamento input[data-regiao]'));
        if(!controles.length||controles.some(input=>input.dataset.tocadoManualmente==='true'))return;
        const ids=new Set(arr(plano?.regioes).map(regiao=>typeof regiao==='string'?regiao:regiao?.id).filter(Boolean));
        controles.forEach(input=>{
            const sugerida=ids.has(input.dataset.regiao);
            input.checked=sugerida;
            input.dataset.sugeridaPelaHMA=sugerida?'true':'false';
        });
        const primeira=controles.find(input=>input.checked)?.dataset.regiao;
        if(primeira)window.definirRegiaoAtivaAvaliacaoKineSys?.(primeira);
    }

    function atualizar(forcar=false){
        garantirUI();
        const assinatura=assinaturaAtualizacao();
        if(!forcar&&ultimoPlano&&assinatura===ultimaAssinaturaAtualizacao)return ultimoPlano;
        const plano=gerarPlano();
        ultimaAssinaturaAtualizacao=assinatura;
        renderBridge(plano);
        const etapa2=document.getElementById('subtela_mapeamento');
        if(etapa2?.classList.contains('ativa')){
            const ctx=document.querySelector('#ks-eval-step-context span');
            if(ctx) ctx.textContent='Use a HMA para testar hipóteses: segurança primeiro, depois clusters, testes e análises discriminativas.';
        }
        window.KineSysMotorClinico3.ultimoPlano=plano;
        sincronizarRegioesDoRadar(plano);
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
            if(e.target?.matches('#grupo_regioes_mapeamento input,.fatores-piora-compactos input,input[name*="comorb"],input[name*="anteced"],.teste-resultado-select')) agendarAtualizacao();
        });
        // Captura antes de o seletor ser removido pela rerenderização; inclui testes em modal.
        document.addEventListener('change',e=>{
            if(e.target?.matches?.('.teste-resultado-select'))agendarAtualizacao(80);
        },true);
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
            {id:'M3-3',hma:'Entorse de tornozelo após pisar em falso, com dor lateral e dificuldade para caminhar.',espera:'tornozelo'},
            {id:'M3-4',hma:'Paciente relata dor de coluna que irradia para perna e pé.',espera:'lombar'},
            {id:'M3-5',hma:'Dor no joelho após torção, com inchaço e travamento.',espera:'joelho'},
            {id:'M3-6',hma:'Dor no ombro ao elevar o braço acima da cabeça.',espera:'ombro'},
            {id:'M3-7',hma:'Dor lateral no cotovelo ao apertar e levantar objetos.',espera:'cotovelo'},
            {id:'M3-8',hma:'Dormência noturna no polegar, indicador e médio da mão.',espera:'punho_mao'},
            {id:'M3-9',hma:'Dor entre as escápulas ao girar o tronco.',espera:'coluna_toracica'},
            {id:'M3-10',hma:'Dor de cabeça unilateral que começa na nuca.',espera:'cefaleia'},
            {id:'M3-11',hma:'Dor na mandíbula e estalo ao mastigar.',espera:'atm'},
            {id:'M3-12',hma:'Dor na coluna, sem irradiação para perna ou pé.',espera:null}
        ];
        if(typeof window.analisarHMAClinicaKineSys!=='function')return{ok:false,motivo:'analisador HMA indisponível'};
        const B=banco();
        const resultados=casos.map(c=>{
            const r=window.analisarHMAClinicaKineSys(c.hma)||{};
            const fakeCtx={hma:c.hma,origemIrradiacao:'',irradiacao:'',mecanismo:'',fatoresPiora:[],medicamentos:[],cirurgias:[]};
            const regs=Object.entries(B).map(([id,reg])=>scoreRegiao(id,reg,r,c.hma)).sort((a,b)=>b.score-a.score).filter(x=>x.score>0).slice(0,2);
            return {id:c.id,passou:c.espera?regs.some(x=>n(x.id).includes(n(c.espera))):regs.length===0,regioes:regs.map(x=>x.id),principal:r?.suspeitaPrincipal?.nome||''};
        });
        const resumo={versao:VERSION,total:resultados.length,passou:resultados.filter(x=>x.passou).length};resumo.falhou=resumo.total-resumo.passou;
        if(opcoes.console!==false&&typeof console!=='undefined'){console.group('KineSys — auditoria Motor 3 HMA');console.table(resultados);console.log(resumo);console.groupEnd();}
        return{resumo,resultados};
    }

    window.KineSysMotorClinico3={version:VERSION,ultimoPlano:null,gerarPlano,atualizar,auditoria,
        listarHipotesesDisponiveis,adicionarHipotese,descartarHipotese,chaveHipotese,hipotesesManuais};
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


/* KineSys — sincroniza o plano público antes da renderização visual | 2026-09-30 */
document.addEventListener('kinesys:motor3-plano-atualizado', function(event){
    const plano=event.detail; const completo=plano&&plano.exame&&Array.isArray(plano.regioes)&&Array.isArray(plano.hipoteses)&&plano.regioes.every(r=>r&&typeof r==='object')&&plano.hipoteses.every(h=>h&&typeof h==='object'); if(completo&&window.KineSysMotorClinico3) window.KineSysMotorClinico3.ultimoPlano=plano;
}, true);
setTimeout(function(){ window.KineSysMotorClinico3 && window.KineSysMotorClinico3.atualizar && window.KineSysMotorClinico3.atualizar(); }, 0);


