from pathlib import Path

p = Path('script-1.18.0.js')
s = p.read_text(encoding='utf-8')

old_version = "const KINESYS_MOTOR_VERSION = '2.5.0';"
if old_version not in s:
    raise SystemExit('KINESYS_MOTOR_VERSION 2.5.0 marker not found')
s = s.replace(old_version, "const KINESYS_MOTOR_VERSION = '2.6.0';", 1)

helper = r'''
/* ========================================================================== 
   KINESYS CLINICAL SYNTHESIS 2.6 — RECONCILIAÇÃO HMA ↔ EXAME
   --------------------------------------------------------------------------
   Camada aditiva: não altera IDs, chaves de resultados nem regras existentes.
   Reúne proveniência da HMA e do exame, explicita incerteza e impede que um
   achado positivo isolado seja promovido a eixo sustentado sem regra explícita.
   Índices servem apenas para ordenação/suporte; nunca representam probabilidade.
   ========================================================================== */
function pistasHMAHipoteseKineSys(item, contexto){
    const hma=String(contexto?.hma||'');
    const favor=(item?.palavrasChaveHMA||[]).filter(p=>correspondePistaClinica(hma,p)).slice(0,5);
    const contra=(item?.palavrasChaveContra||[]).filter(p=>correspondePistaClinica(hma,p)).slice(0,4);
    return {favor,contra};
}

function regraExplicitaPermiteAchadoUnicoKineSys(item){
    const regra=item?.regraConfirmacao||{};
    const base=KINESYS_META_CRITERIOS_2[item?.id]||{};
    if(regra.tipo==='qualquer')return true;
    const minimo=base.minimo ?? regra.minimo ?? item?.limiar;
    return minimo!==undefined && minimo!==null && Number(minimo)<=1;
}

function sintetizarHipotesesClinicasKineSys(idRegiao, contexto=coletarContextoClinico(), candidatos=null, fenotipo=null){
    const reg=BANCO_MAPEAMENTO_CLINICO[idRegiao];
    const estado=obterEstadoRegiao(idRegiao);
    const lista=Array.isArray(candidatos)?candidatos:ordenarHipotesesRegiaoKineSys(idRegiao,contexto);
    const rf=(reg?.redFlags||[]).map((texto,i)=>estado.resultados['redflag::'+i]?{indice:i,texto}:null).filter(Boolean);
    const alertas=alertasTextuaisParaRegiaoKineSys(contexto,idRegiao);
    const segurancaAtiva=rf.length>0||alertas.length>0;
    const chaveEscolhida=estado.hipotesePrincipalAtiva||'';

    const hipoteses=lista.map(c=>{
        const item=c.item||{};
        const grupo=c.grupo||grupoDoItemKineSys(idRegiao,item);
        const statusBase=statusHipoteseKineSys(idRegiao,c);
        const analise=analisarRespostasItem(estado,grupo,item);
        const meta=obterMetaCriteriosKineSys(item,grupo);
        const pistas=pistasHMAHipoteseKineSys(item,contexto);
        const exame=(item.testes||[]).map((teste,i)=>({teste,resultado:analise.respostas[i]||''}));
        const favorExame=exame.filter(x=>x.resultado==='positivo').map(x=>x.teste);
        const contraExame=exame.filter(x=>x.resultado==='negativo').map(x=>x.teste);
        const indicesPendentes=[];
        (meta.essenciais||[]).forEach(i=>{const r=analise.respostas[i]||'';if(!r||['inconclusivo','nao_realizado','nao_aplicavel'].includes(r))indicesPendentes.push(i);});
        exame.forEach((x,i)=>{if(indicesPendentes.includes(i))return;if(!x.resultado||['inconclusivo','nao_realizado','nao_aplicavel'].includes(x.resultado))indicesPendentes.push(i);});
        const aConfirmar=indicesPendentes.slice(0,4).map(i=>item.testes?.[i]).filter(Boolean);
        const positivoIsoladoSemRegra=statusBase==='positivo'&&analise.positivos===1&&!regraExplicitaPermiteAchadoUnicoKineSys(item);

        let estadoSintese='a_confirmar';
        if(statusBase==='positivo'&&!positivoIsoladoSemRegra)estadoSintese='sustentada';
        else if(statusBase==='negativo')estadoSintese=(pistas.favor.length||analise.positivos>0)?'enfraquecida':'nao_sustentada';
        else if(statusBase==='inconclusivo'||statusBase==='pendente')estadoSintese='a_confirmar';

        const aFavor=[
            ...pistas.favor.map(x=>`HMA: ${x}`),
            ...favorExame.map(x=>`Exame: ${x} — positivo`)
        ];
        const contra=[
            ...pistas.contra.map(x=>`HMA: ${x}`),
            ...contraExame.map(x=>`Exame: ${x} — negativo`)
        ];
        if(positivoIsoladoSemRegra)aConfirmar.unshift('Achado positivo isolado: buscar concordância clínica antes de sustentar este eixo.');

        return {
            id:item.id||'',nome:item.nome||'',grupo,statusBase,estadoSintese,
            aFavor:Array.from(new Set(aFavor)),contra:Array.from(new Set(contra)),aConfirmar:Array.from(new Set(aConfirmar)).slice(0,5),
            indiceSuporte:Number(c.score)||0,
            proveniencia:{
                hma:[...pistas.favor.map(trecho=>({sentido:'a_favor',trecho})),...pistas.contra.map(trecho=>({sentido:'contra',trecho}))],
                exame
            },
            achadoPositivoIsoladoSemRegra:positivoIsoladoSemRegra,
            selecionadaPeloProfissional:chaveEscolhida===chaveHipoteseKineSys(c)
        };
    });

    const sustentadas=hipoteses.filter(h=>h.estadoSintese==='sustentada');
    const manual=sustentadas.find(h=>h.selecionadaPeloProfissional);
    const preferencial=segurancaAtiva?null:(manual||sustentadas[0]||null);
    const diferenciaisAbertos=hipoteses.filter(h=>!preferencial||h.id!==preferencial.id||h.grupo!==preferencial.grupo)
        .filter(h=>['sustentada','a_confirmar','enfraquecida'].includes(h.estadoSintese)).slice(0,6);
    const escolha=hipoteses.find(h=>h.selecionadaPeloProfissional)||null;

    return {
        versao:KINESYS_MOTOR_VERSION,
        regiaoId:idRegiao,
        regiaoNome:reg?.nome||idRegiao,
        seguranca:{
            ativa:segurancaAtiva,
            redFlags:rf,
            alertasTextuais:alertas.map(a=>({id:a.id,titulo:a.titulo})),
            revisada:!!estado.redflagsRevisadas,
            decisaoRegistrada:!!estado.redflagAcknowledge,
            conduta:estado.redflagConduta||'',
            justificativa:estado.redflagJustificativa||'',
            bloqueiaPreferenciaLocal:segurancaAtiva
        },
        hipotesePreferencial:preferencial,
        escolhaProfissional:escolha,
        hipoteses,
        diferenciaisAbertos,
        insuficiente:segurancaAtiva||!preferencial,
        fenotipoOperacional:fenotipo||inferirFenotipoOperacionalKineSys(idRegiao,contexto),
        geradoEm:new Date().toISOString()
    };
}
window.sintetizarHipotesesClinicasKineSys=sintetizarHipotesesClinicasKineSys;
/* KINESYS CLINICAL SYNTHESIS 2.6 — END */

'''

marker = 'function avancarParaDiagnostico(){'
if marker not in s:
    raise SystemExit('avancarParaDiagnostico marker not found')
if 'KINESYS CLINICAL SYNTHESIS 2.6 — RECONCILIAÇÃO HMA ↔ EXAME' not in s:
    s = s.replace(marker, helper + marker, 1)

start = s.index('function avancarParaDiagnostico(){')
end = s.index('\nfunction textoDocumentalDaHipotese', start)
new_advance = r'''function avancarParaDiagnostico(){
    const regioes=Array.from(document.querySelectorAll('#grupo_regioes_mapeamento input:checked')).map(i=>i.dataset.regiao);
    if(!regioes.length){alert('Selecione ao menos uma região.');return;}
    const contexto=coletarContextoClinico();
    for(const id of regioes){
        const regiao=BANCO_MAPEAMENTO_CLINICO[id], estado=obterEstadoRegiao(id); const marcadas=(regiao.redFlags||[]).some((_,i)=>estado.resultados['redflag::'+i]);
        const fpAtual=fingerprintSeguranca(id,regiao,contexto);
        if(!estado.redflagsRevisadas || estado.safetyFingerprint!==fpAtual){ renderizarMapeamentoRegioes(); alert(`🛡️ Revise e confirme novamente a triagem de segurança de ${regiao.nome} antes de avançar. A HMA ou os sinais de alerta podem ter mudado.`); return; }
        const alertasTexto=alertasTextuaisParaRegiaoKineSys(contexto,id);
        if((marcadas||alertasTexto.length>0)&&!estado.redflagAcknowledge){ renderizarMapeamentoRegioes(); alert(`⚠️ Há sinal/termo de alerta em ${regiao.nome} sem decisão clínica registrada.`); return; }
    }
    regioes.forEach(id=>{
        const estado=obterEstadoRegiao(id), candidatos=ordenarHipotesesRegiaoKineSys(id,contexto);
        const fen=inferirFenotipoOperacionalKineSys(id,contexto);
        registrarAuditoriaMotorKineSys(id,contexto,candidatos);
        estado.sinteseClinica=sintetizarHipotesesClinicasKineSys(id,contexto,candidatos,fen);
        if(estado.sinteseClinica.seguranca.ativa){
            estado.fenotipoOperacional=null;
            estado.incertezaEspecifica=false;
            estado.incertezaClinicaAceita=false;
            estado.incertezaClinicaMotivo='';
        }else if(!estado.sinteseClinica.hipotesePreferencial){
            if(fen){
                estado.fenotipoOperacional=fen;
                estado.incertezaEspecifica=true;
                estado.incertezaClinicaAceita=false;
                estado.incertezaClinicaMotivo='fenotipo_operacional_sem_condicao_especifica';
            }else if(!estado.incertezaClinicaAceita){
                estado.incertezaClinicaAceita=true;
                estado.incertezaClinicaMotivo='avanco_para_sintese_sem_hipotese';
                estado.incertezaClinicaDataISO=new Date().toISOString();
            }
        }else{
            estado.fenotipoOperacional=null;
            estado.incertezaEspecifica=false;
            estado.incertezaClinicaAceita=false;
        }
    });
    agendarAutosaveKineSys();
    renderizarAlertasConsolidados(); renderizarSinteseDiagnostica(); irParaSubtela('subtela_diagnostico');
}'''
s = s[:start] + new_advance + s[end:]

start = s.index('function gerarSinteseMapeamento(){')
end = s.index('\nfunction obterTextoDocumentalUltimaAvaliacao', start)
new_summary = r'''function gerarSinteseMapeamento(){
    const regioes=Array.from(document.querySelectorAll('#grupo_regioes_mapeamento input:checked')).map(i=>i.dataset.regiao);
    if(!regioes.length)return{html:'<p class="kds-u-text-muted kds-u-ta-center">Nenhuma região foi mapeada.</p>',resumoPorRegiao:[]};
    const contexto=coletarContextoClinico(); let html=''; const resumoPorRegiao=[];
    regioes.forEach(id=>{
        const reg=BANCO_MAPEAMENTO_CLINICO[id], est=obterEstadoRegiao(id), candidatos=ordenarHipotesesRegiaoKineSys(id,contexto);
        const rf=(reg.redFlags||[]).filter((_,i)=>est.resultados['redflag::'+i]);
        const alertasTxt=alertasTextuaisParaRegiaoKineSys(contexto,id);
        const fen=est.fenotipoOperacional||inferirFenotipoOperacionalKineSys(id,contexto);
        const sintese=sintetizarHipotesesClinicasKineSys(id,contexto,candidatos,fen);
        est.sinteseClinica=sintese;
        let hipotese,nivel,codigo='',nome='',textoDocumento='',associadas=[];
        if(rf.length||alertasTxt.length){
            hipotese=`Sinal(is) de alerta revisado(s). Conduta registrada: ${est.redflagConduta||'não registrada'}. ${est.redflagJustificativa||''}`;
            nivel='alerta'; textoDocumento=`${reg.nome}: sinal(is) de alerta identificado(s) durante a triagem; conduta clínica registrada no prontuário.`;
        }else if(sintese.hipotesePreferencial){
            const principal=sintese.hipotesePreferencial; codigo=principal.id; nome=principal.nome;
            associadas=sintese.hipoteses.filter(h=>h.estadoSintese==='sustentada'&&(h.id!==principal.id||h.grupo!==principal.grupo)).slice(0,3).map(h=>({codigo:h.id,nome:h.nome,grupo:h.grupo}));
            hipotese=`Eixo de investigação sustentado pelo conjunto dos achados: ${nome}.`;
            if(principal.aFavor.length)hipotese+=` A favor: ${principal.aFavor.slice(0,4).join('; ')}.`;
            if(principal.contra.length)hipotese+=` Achados que enfraquecem: ${principal.contra.slice(0,3).join('; ')}.`;
            if(principal.aConfirmar.length)hipotese+=` Ainda a esclarecer: ${principal.aConfirmar.slice(0,3).join('; ')}.`;
            if(associadas.length)hipotese+=` Eixo(s) associado(s) também sustentado(s): ${associadas.map(x=>x.nome).join('; ')}.`;
            nivel='positivo'; textoDocumento=textoDocumentalDaHipotese({id:principal.id,nome:principal.nome},reg.nome);
            if(associadas.length)textoDocumento+=` Eixos associados compatíveis no exame: ${associadas.map(x=>x.nome).join('; ')}.`;
        }else if(fen){
            nome=fen.nome; hipotese=`Padrão operacional sugerido: ${fen.nome}. ${fen.texto} Condição específica ainda não definida.`;
            const abertos=sintese.diferenciaisAbertos.filter(h=>h.estadoSintese==='a_confirmar'||h.estadoSintese==='enfraquecida').slice(0,3);
            if(abertos.length)hipotese+=` Eixos ainda em aberto: ${abertos.map(h=>h.nome).join('; ')}.`;
            nivel='fenotipo'; textoDocumento=`${reg.nome}: ${fen.nome}. O padrão foi utilizado como direção operacional fisioterapêutica, mantendo incerteza quanto à condição específica e reavaliação conforme novos achados.`;
        }else if(est.incertezaClinicaAceita){
            hipotese='Sem eixo operacional definido nesta etapa. O quadro foi registrado como investigação em aberto após revisão clínica, sem impedir continuidade da avaliação.';
            const abertos=sintese.diferenciaisAbertos.filter(h=>h.estadoSintese==='a_confirmar'||h.estadoSintese==='enfraquecida').slice(0,3);
            if(abertos.length)hipotese+=` Permanecem para reavaliação: ${abertos.map(h=>h.nome).join('; ')}.`;
            nivel='indeterminado'; textoDocumento=`${reg.nome}: sem eixo operacional definido nesta etapa; avaliação prosseguiu com registro explícito de incerteza clínica e acompanhamento orientado por sinais, sintomas, função e evolução.`;
        }else{
            hipotese='Avaliação sem eixo operacional sustentado pelos achados preenchidos. É permitido prosseguir sem forçar um diagnóstico, mantendo reavaliação conforme novos achados e evolução.';
            nivel='pendente'; textoDocumento=`${reg.nome}: avaliação em andamento, sem hipótese operacional definida pelos achados registrados.`;
        }
        resumoPorRegiao.push({regiao:reg.nome,hipotese,nivel,codigoHipotese:codigo,nomeHipotese:nome,hipotesesAssociadas:associadas,fenotipoOperacional:fen?.nome||'',textoDocumento,incertezaClinicaAceita:!!est.incertezaClinicaAceita,incertezaEspecifica:!!est.incertezaEspecifica,incertezaClinicaMotivo:est.incertezaClinicaMotivo||'',redFlags:rf,alertasTextuais:alertasTxt.map(a=>a.id),redflagConduta:est.redflagConduta||'',redflagJustificativa:est.redflagJustificativa||'',segurancaRevisada:!!est.redflagsRevisadas,auditoriaMotor:est.auditoriaMotor||null,sinteseClinica:sintese});
        const c=nivel==='alerta'?'status-alerta':nivel==='positivo'?'status-positivo':(nivel==='fenotipo'||nivel==='indeterminado')?'status-inconclusivo':'status-negativo';
        html+=`<div class="cluster-card ${c}"><h4>🧩 ${escapeHTML(reg.nome)}</h4><p class="kds-u-fs-label kds-u-m-6px-0-0">${escapeHTML(hipotese)}</p></div>`;
    });
    return{html,resumoPorRegiao};
}'''
s = s[:start] + new_summary + s[end:]

p.write_text(s, encoding='utf-8')
print('Clinical Engine 2.6 synthesis patch applied')
