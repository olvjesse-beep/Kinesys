/* KineSys — Novo Agendamento mobile clean 1.0.0-r43
 * Camada estritamente visual/estrutural para o modal de agendamento.
 * Preserva IDs, funções, regras de recorrência, pacote, financeiro e Supabase.
 */
(function(){
    'use strict';

    const VERSION='1.0.0-r43';
    const MOBILE_QUERY='(max-width: 760px)';
    const mq=window.matchMedia?.(MOBILE_QUERY);
    let preparado=false;
    let ultimaFaixaMobile=null;
    let modalVisivel=false;
    let modalObserver=null;

    function modal(){return document.getElementById('modal_agendamento');}
    function mobile(){return !!mq?.matches;}

    function criarSubtitulo(){
        const raiz=modal()?.querySelector('.agenda-appointment-modal');
        const titulo=document.getElementById('modal_agendamento_titulo');
        if(!raiz||!titulo||document.getElementById('ks_agendamento_clean_subtitle'))return;
        const p=document.createElement('p');
        p.id='ks_agendamento_clean_subtitle';
        p.className='ks-agendamento-clean-subtitle';
        p.textContent='Preencha os dados para agendar a sessão.';
        titulo.insertAdjacentElement('afterend',p);
    }

    function criarDisclosure(conteudo,{id,titulo,descricao}){
        if(!conteudo)return null;
        const existente=document.getElementById(id);
        if(existente)return existente;

        const details=document.createElement('details');
        details.id=id;
        details.className='ks-agendamento-disclosure';

        const summary=document.createElement('summary');
        summary.className='ks-agendamento-disclosure-summary';
        const textos=document.createElement('span');
        textos.className='ks-agendamento-disclosure-texts';
        const strong=document.createElement('strong');
        strong.textContent=titulo;
        const small=document.createElement('small');
        small.dataset.ksDisclosureSubtitle='1';
        small.textContent=descricao;
        textos.append(strong,small);
        summary.appendChild(textos);

        const body=document.createElement('div');
        body.className='ks-agendamento-disclosure-body';

        conteudo.insertAdjacentElement('beforebegin',details);
        details.append(summary,body);
        body.appendChild(conteudo);
        return details;
    }

    function marcarEstrutura(){
        const prof=document.getElementById('ag_profissional_select');
        const data=document.getElementById('ag_data_input');
        const extra=document.getElementById('ag_horario_extra_toggle');
        const observacoes=document.getElementById('ag_observacoes');
        const status=document.getElementById('ag_status_inicial');
        const plano=document.getElementById('ag_plano_select');
        prof?.closest('.grid-2')?.classList.add('ks-agendamento-prof-proc');
        data?.closest('.grid-2')?.classList.add('ks-agendamento-date-time');
        extra?.closest('.input-group')?.classList.add('ks-agendamento-extra');
        observacoes?.closest('.input-group')?.classList.add('ks-agendamento-observacoes');
        status?.closest('.agenda-finance-link')?.classList.add('ks-agendamento-status');
        plano?.closest('.agenda-finance-link')?.classList.add('ks-agendamento-pacote-conteudo');

        const actions=modal()?.querySelector('.actions');
        actions?.classList.add('ks-agendamento-actions-clean');
        document.getElementById('btn_salvar_agendamento')?.classList.add('ks-agendamento-confirmar');
        Array.from(actions?.querySelectorAll('button')||[]).forEach(btn=>{
            const onclick=String(btn.getAttribute('onclick')||'');
            if(onclick.includes('abrirModalListaEspera'))btn.classList.add('ks-agendamento-lista-espera');
            else if(onclick.includes("fecharModal('modal_agendamento')")&&!btn.id)btn.classList.add('ks-agendamento-cancelar');
        });
    }

    function montarDisclosures(){
        const recorrencia=document.getElementById('ag_recorrencia_bloco');
        const pacote=document.getElementById('ag_plano_select')?.closest('.agenda-finance-link');
        criarDisclosure(recorrencia,{
            id:'ks_agendamento_recorrencia_disclosure',
            titulo:'Recorrência',
            descricao:'Agendar várias sessões quando necessário'
        });
        criarDisclosure(pacote,{
            id:'ks_agendamento_pacote_disclosure',
            titulo:'Agendamento de pacote',
            descricao:'Vincular a pacote ou atendimento unitário'
        });
    }

    function atualizarSubtitulos(){
        const recorrencia=document.getElementById('ag_recorrencia_tipo');
        const recSmall=document.querySelector('#ks_agendamento_recorrencia_disclosure [data-ks-disclosure-subtitle]');
        if(recSmall){
            const valor=String(recorrencia?.value||'nenhuma');
            const rotulo=recorrencia?.selectedOptions?.[0]?.textContent?.trim()||'';
            recSmall.textContent=valor==='nenhuma'?'Agendar várias sessões quando necessário':(rotulo||'Recorrência configurada');
        }

        const plano=document.getElementById('ag_plano_select');
        const planoSmall=document.querySelector('#ks_agendamento_pacote_disclosure [data-ks-disclosure-subtitle]');
        if(planoSmall){
            const selecionado=String(plano?.value||'').trim();
            const rotulo=plano?.selectedOptions?.[0]?.textContent?.trim()||'';
            planoSmall.textContent=selecionado?(rotulo||'Pacote selecionado'):'Vincular a pacote ou atendimento unitário';
        }
    }

    function fecharDisclosuresMobile(){
        if(!mobile())return;
        document.getElementById('ks_agendamento_recorrencia_disclosure')?.removeAttribute('open');
        document.getElementById('ks_agendamento_pacote_disclosure')?.removeAttribute('open');
    }

    function sincronizarResponsivo(){
        const agoraMobile=mobile();
        const disclosures=[
            document.getElementById('ks_agendamento_recorrencia_disclosure'),
            document.getElementById('ks_agendamento_pacote_disclosure')
        ].filter(Boolean);

        if(!agoraMobile){
            disclosures.forEach(item=>item.open=true);
        }else if(ultimaFaixaMobile!==true){
            disclosures.forEach(item=>item.open=false);
        }
        ultimaFaixaMobile=agoraMobile;
    }

    function estaVisivel(){
        const alvo=modal();
        if(!alvo)return false;
        const estilo=window.getComputedStyle?.(alvo);
        return estilo?estilo.display!=='none'&&estilo.visibility!=='hidden':!alvo.hidden;
    }

    function observarModal(){
        const alvo=modal();
        if(!alvo||modalObserver||typeof MutationObserver==='undefined')return;
        modalVisivel=estaVisivel();
        modalObserver=new MutationObserver(()=>{
            const visivel=estaVisivel();
            if(visivel&&!modalVisivel){
                atualizarSubtitulos();
                fecharDisclosuresMobile();
            }
            modalVisivel=visivel;
        });
        modalObserver.observe(alvo,{attributes:true,attributeFilter:['class','style','hidden']});
    }

    function preparar(){
        if(preparado)return true;
        const alvo=modal();
        if(!alvo)return false;
        criarSubtitulo();
        marcarEstrutura();
        montarDisclosures();
        atualizarSubtitulos();
        sincronizarResponsivo();
        observarModal();

        alvo.addEventListener('change',atualizarSubtitulos);
        const plano=document.getElementById('ag_plano_select');
        if(plano&&typeof MutationObserver!=='undefined'){
            new MutationObserver(atualizarSubtitulos).observe(plano,{childList:true,subtree:true});
        }
        mq?.addEventListener?.('change',sincronizarResponsivo);
        preparado=true;
        return true;
    }

    if(!preparar()){
        document.addEventListener('kinesys:tela-modulos-prontos',event=>{
            if(event?.detail?.id==='tela_agenda')preparar();
        });
        document.addEventListener('DOMContentLoaded',preparar,{once:true});
    }

    window.KineSysAgendaNewAppointmentClean=Object.freeze({
        version:VERSION,
        prepare:preparar,
        refresh:atualizarSubtitulos,
        closeSecondary:fecharDisclosuresMobile
    });
})();
