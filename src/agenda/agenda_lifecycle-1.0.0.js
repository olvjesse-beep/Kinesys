/* KineSys — Agenda Lifecycle 1.0.0
 * Suspende apenas trabalho visual da Agenda quando a tela fica inativa.
 * Não interfere na sincronização confiável de pendências/offline.
 */
(function instalarAgendaLifecycle(){
    'use strict';

    const VERSION='1.0.0-mobile-textos-r3';
    const MOBILE_STYLE_ID='ks_agenda_mobile_style';
    const MOBILE_STYLE_SRC='styles/agenda_mobile-1.0.0.css?v=20260913-mobile-r2';
    const MOBILE_GRID_STYLE_ID='ks_agenda_mobile_grid_style';
    const MOBILE_GRID_STYLE_SRC='styles/agenda_mobile_grid-1.0.0.css?v=20261105-mobile-textos-r3';
    const MOBILE_ORDER_STYLE_ID='ks_agenda_mobile_order_style';
    const MOBILE_ORDER_STYLE_SRC='styles/agenda_mobile_order-1.0.0.css?v=20261105-mobile-textos-r3';
    const origensMobile=new Map();
    let relogioTimer=null;
    let resizeObserver=null;
    let mutationObserver=null;
    let structureObserver=null;
    let listenersAtivos=false;
    let alinharHojePendente=false;
    let organizacaoMobilePendente=false;
    let organizandoMobile=false;
    let destruido=false;

    function telaAgendaAtiva(){
        return !!document.getElementById('tela_agenda')?.classList.contains('ativa');
    }

    function modoMobileAgenda(){
        return !!window.matchMedia?.('(max-width: 760px)').matches;
    }

    function garantirLinkEstilo(id,src,marcador){
        if(document.getElementById(id)||document.querySelector(`link[href*="${src.split('?')[0]}"]`))return;
        const link=document.createElement('link');
        link.id=id;
        link.rel='stylesheet';
        link.href=new URL(src,document.baseURI).href;
        link.dataset[marcador]='1';
        document.head.appendChild(link);
    }

    function garantirEstiloMobileAgenda(){
        garantirLinkEstilo(MOBILE_STYLE_ID,MOBILE_STYLE_SRC,'kinesysAgendaMobile');
        garantirLinkEstilo(MOBILE_GRID_STYLE_ID,MOBILE_GRID_STYLE_SRC,'kinesysAgendaMobileGrid');
        garantirLinkEstilo(MOBILE_ORDER_STYLE_ID,MOBILE_ORDER_STYLE_SRC,'kinesysAgendaMobileOrder');
    }

    function registrarOrigemMobile(no){
        if(!no||origensMobile.has(no)||!no.parentNode)return;
        const marcador=document.createComment('ks-agenda-mobile-origin');
        no.parentNode.insertBefore(marcador,no);
        origensMobile.set(no,marcador);
    }

    function restaurarAlternadorListaEspera(){
        const alternador=document.querySelector('#ks_agenda_controls [data-ks-agenda-waitlist-toggle="1"]');
        if(!alternador)return;
        alternador.dataset.agendaView='agenda_lista_espera';
        alternador.textContent='Lista de espera';
        alternador.title='Abrir lista de espera';
        alternador.setAttribute('aria-label','Abrir lista de espera');
        if(alternador.classList.contains('active'))alternador.classList.remove('active');
    }

    function restaurarOrdemDesktopAgenda(){
        Array.from(origensMobile.entries()).reverse().forEach(([no,marcador])=>{
            if(marcador.parentNode){
                marcador.parentNode.insertBefore(no,marcador.nextSibling);
                marcador.remove();
            }
        });
        origensMobile.clear();
        document.querySelector('.ks-agenda-mobile-date-value')?.remove();
        document.getElementById('ks_agenda_mobile_legend')?.remove();
        document.getElementById('ks_agenda_mobile_days')?.remove();
        document.getElementById('ks_agenda_mobile_day_list')?.remove();
        document.getElementById('ks_agenda_mobile_order')?.remove();
        document.getElementById('ks_agenda_mobile_post_grid')?.remove();
        restaurarAlternadorListaEspera();
        const tela=document.getElementById('tela_agenda');
        if(tela)delete tela.dataset.agendaSubtela;
    }

    function limparResumoDiario(){
        if(!modoMobileAgenda())return;
        const grade=document.getElementById('agenda_semana_grade');
        if(grade)grade.dataset.mobileConsulta='pendente';
        atualizarDataVisivelMobile(document.querySelector('#ks_agenda_mobile_order .ks-agenda-mobile-date'));
        sincronizarResumoDiarioMobile();
    }

    function concluirConsultaVisual(){
        const grade=document.getElementById('agenda_semana_grade');
        if(grade)delete grade.dataset.mobileConsulta;
        sincronizarResumoDiarioMobile();
    }

    function criarAcaoDaGrade(origem,classe){
        const botao=document.createElement('button');
        botao.type='button';
        botao.className=classe;
        botao.setAttribute('aria-label',origem.getAttribute('aria-label')||origem.title||'Abrir horário');
        botao.addEventListener('click',()=>{
            // Nunca aciona uma ocorrência substituída por outra consulta/escopo.
            const grade=document.getElementById('agenda_semana_grade');
            if(telaAgendaAtiva()&&origem.isConnected&&grade?.dataset.mobileConsulta!=='pendente'&&grade?.contains(origem))origem.click();
        });
        return botao;
    }

    function sincronizarResumoDiarioMobile(){
        if(!modoMobileAgenda())return;
        const grade=document.getElementById('agenda_semana_grade');
        const scroll=grade?.parentElement;
        if(!grade||!scroll)return;
        let lista=document.getElementById('ks_agenda_mobile_day_list');
        if(!lista){
            lista=document.createElement('div');lista.id='ks_agenda_mobile_day_list';
            lista.setAttribute('aria-label','Atendimentos do dia');scroll.appendChild(lista);
        }
        lista.replaceChildren();lista.hidden=true;
        if(grade.dataset.mobileConsulta==='pendente'){
            const aviso=document.createElement('p');aviso.className='agenda-vazio';aviso.textContent='Atualizando agenda…';lista.appendChild(aviso);lista.hidden=false;return;
        }
        if(grade.dataset.periodo!=='dia'||!grade.querySelector('.agenda-dia-cabecalho'))return;
        const itens=[];
        const minutos=hora=>{const [h,m]=String(hora||'').split(':').map(Number);return h*60+m;};
        const hora=min=>`${String(Math.floor(min/60)).padStart(2,'0')}:${String(min%60).padStart(2,'0')}`;
        const ocupacoes=Array.from(grade.querySelectorAll('[data-agendamento-id]')).map(no=>({inicio:minutos(no.dataset.horaInicio),fim:minutos(no.dataset.horaFim)}));
        grade.querySelectorAll('[data-agendamento-id]').forEach(origem=>{
            const inicio=minutos(origem.dataset.horaInicio);
            if(!Number.isFinite(inicio))return;
            const linha=document.createElement('div');linha.className='ks-agenda-day-row';
            const horario=document.createElement('span');horario.className='ks-agenda-day-time';horario.textContent=origem.dataset.horaInicio;
            const botao=criarAcaoDaGrade(origem,'ks-agenda-day-action');
            const card=origem.querySelector('.agenda-compromisso')?.cloneNode(true);
            if(!card)return;
            const detalhe=document.createElement('span');detalhe.className='ks-agenda-day-description';
            const duracao=minutos(origem.dataset.horaFim)-inicio;
            detalhe.textContent=[origem.dataset.procedimento,Number.isFinite(duracao)&&duracao>0?`${duracao} min`:'',origem.dataset.profissional].filter(Boolean).join(' · ');
            card.appendChild(detalhe);botao.appendChild(card);linha.append(horario,botao);
            itens.push({inicio,no:linha});
        });
        grade.querySelectorAll('.agenda-intervalo-bloco').forEach(origem=>{
            const linha=document.createElement('div');linha.className='ks-agenda-day-interval';
            const clone=origem.cloneNode(true);clone.removeAttribute('style');linha.appendChild(clone);
            const row=Number.parseInt(origem.style.gridRow,10);
            itens.push({inicio:Number(grade.dataset.inicio)+(row-2)*10,no:linha});
        });
        // Ações livres vêm das próprias células da grade; bloqueios/feriados não ganham ação.
        // Agrupa apenas a apresentação das células descobertas, preservando também 08:30, 14:20 etc.
        let anteriorLivre=null;
        grade.querySelectorAll('.agenda-celula').forEach(origem=>{
            const inicio=Number(origem.dataset.minuto);
            if(!origem.dataset.minuto)return;
            const livre=origem.classList.contains('atendimento')&&origem.getAttribute('role')==='button'&&!ocupacoes.some(a=>a.inicio<inicio+10&&a.fim>inicio);
            if(livre){
                if(anteriorLivre!==inicio-10||inicio%60===0){
                    const linha=document.createElement('div');linha.className='ks-agenda-day-row ks-agenda-day-free';
                    const horario=document.createElement('span');horario.className='ks-agenda-day-time';horario.textContent=hora(inicio);
                    const botao=criarAcaoDaGrade(origem,'ks-agenda-day-free-action');botao.textContent='Horário livre · Agendar';
                    linha.append(horario,botao);itens.push({inicio,no:linha});
                }
                anteriorLivre=inicio;
            }else{
                anteriorLivre=null;
                if(origem.querySelector('.agenda-bloqueio-texto')){
                    const linha=document.createElement('div');linha.className='ks-agenda-day-block';
                    linha.textContent=`${hora(inicio)} · ${origem.querySelector('.agenda-bloqueio-texto').textContent}`;
                    itens.push({inicio,no:linha});
                }
            }
        });
        itens.sort((a,b)=>a.inicio-b.inicio).forEach(item=>lista.appendChild(item.no));
        if(!itens.length){const vazio=document.createElement('p');vazio.className='agenda-vazio';vazio.textContent='Nenhum atendimento ou horário disponível neste dia.';lista.appendChild(vazio);}
        lista.hidden=false;
    }

    function atualizarDataVisivelMobile(campo){
        const input=campo?.querySelector('#agenda_data_input');
        if(!input)return;
        let rotulo=campo.querySelector('.ks-agenda-mobile-date-value');
        if(!rotulo){
            rotulo=document.createElement('span');
            rotulo.className='ks-agenda-mobile-date-value';
            rotulo.setAttribute('aria-hidden','true');
            campo.insertBefore(rotulo,input);
        }
        const [ano,mes,dia]=input.value.split('-');
        const texto=dia?`${dia}/${mes}/${ano}`:'Selecionar data';
        if(rotulo.textContent!==texto)rotulo.textContent=texto;
    }

    function prepararCabecalhoMobile(hostTopo,nav,data){
        const filtro=document.querySelector('#tela_agenda .agenda-profissional-filtro');
        const periodo=document.querySelector('#tela_agenda .agenda-periodo-segmentado');
        const legenda=document.querySelector('#tela_agenda .agenda-color-legend');
        [filtro,periodo,legenda].filter(Boolean).forEach(registrarOrigemMobile);
        if(filtro&&filtro.parentElement!==hostTopo)hostTopo.appendChild(filtro);
        let detalhes=document.getElementById('ks_agenda_mobile_legend');
        if(!detalhes){
            detalhes=document.createElement('details');detalhes.id='ks_agenda_mobile_legend';
            const resumo=document.createElement('summary');resumo.textContent='Cores';detalhes.appendChild(resumo);hostTopo.appendChild(detalhes);
        }
        if(legenda&&legenda.parentElement!==detalhes)detalhes.appendChild(legenda);
        if(data&&nav&&data.parentElement!==nav)nav.appendChild(data);
        atualizarDataVisivelMobile(data);
        let dias=document.getElementById('ks_agenda_mobile_days');
        if(!dias){dias=document.createElement('div');dias.id='ks_agenda_mobile_days';dias.setAttribute('role','group');dias.setAttribute('aria-label','Dias da semana');hostTopo.appendChild(dias);}
        const valor=document.getElementById('agenda_data_input')?.value;
        if(/^\d{4}-\d{2}-\d{2}$/.test(valor||'')&&dias.dataset.data!==valor){
            dias.dataset.data=valor;dias.replaceChildren();
            const selecionada=new Date(valor+'T12:00:00');
            const inicio=new Date(selecionada);inicio.setDate(inicio.getDate()-((inicio.getDay()+6)%7));
            for(let i=0;i<7;i++){
                const dia=new Date(inicio);dia.setDate(dia.getDate()+i);
                const iso=`${dia.getFullYear()}-${String(dia.getMonth()+1).padStart(2,'0')}-${String(dia.getDate()).padStart(2,'0')}`;
                const botao=document.createElement('button');botao.type='button';
                botao.dataset.data=iso;botao.setAttribute('aria-pressed',String(iso===valor));
                botao.setAttribute('aria-label',dia.toLocaleDateString('pt-BR',{weekday:'long',day:'numeric',month:'long',year:'numeric'}));
                const nome=document.createElement('span');nome.textContent=dia.toLocaleDateString('pt-BR',{weekday:'short'}).replace('.','');
                const numero=document.createElement('strong');numero.textContent=String(dia.getDate());botao.append(nome,numero);
                botao.addEventListener('click',()=>{const input=document.getElementById('agenda_data_input');if(input){input.value=iso;input.dispatchEvent(new Event('change',{bubbles:true}));}});
                dias.appendChild(botao);
            }
        }
        if(periodo&&periodo.parentElement!==hostTopo)hostTopo.appendChild(periodo);
    }

    function prepararAlternadorListaEsperaMobile(){
        const tabs=document.getElementById('ks_agenda_controls');
        const segmented=tabs?.querySelector('.ks-segmented');
        if(!tabs||!segmented)return null;

        let alternador=segmented.querySelector('[data-ks-agenda-waitlist-toggle="1"]');
        if(!alternador){
            alternador=segmented.querySelector('[data-agenda-view="agenda_lista_espera"]');
            if(alternador)alternador.dataset.ksAgendaWaitlistToggle='1';
        }

        const semanaRedundante=Array.from(segmented.querySelectorAll('[data-agenda-view="agenda_painel"]'))
            .find(botao=>botao!==alternador&&!botao.dataset.ksAgendaWaitlistToggle);
        if(semanaRedundante){
            registrarOrigemMobile(semanaRedundante);
            semanaRedundante.remove();
        }

        if(!tabs.dataset.ksAgendaMobileModeListener){
            tabs.addEventListener('click',()=>requestAnimationFrame(sincronizarSubtelaMobile));
            tabs.dataset.ksAgendaMobileModeListener='1';
        }
        return alternador;
    }

    function preservarNavegacaoMobileAgenda(){
        if(!modoMobileAgenda())return false;
        prepararAlternadorListaEsperaMobile();
        return true;
    }

    function garantirHostTopo(tela,painel){
        if(!tela||!painel)return null;
        let host=document.getElementById('ks_agenda_mobile_order');
        if(!host){
            host=document.createElement('div');
            host.id='ks_agenda_mobile_order';
            host.className='ks-agenda-mobile-order';
        }
        if(host.parentElement!==tela||host.nextElementSibling!==painel)tela.insertBefore(host,painel);
        return host;
    }

    function garantirHostPosGrade(painel){
        if(!painel)return null;
        let host=document.getElementById('ks_agenda_mobile_post_grid');
        if(!host){
            host=document.createElement('div');
            host.id='ks_agenda_mobile_post_grid';
            host.className='ks-agenda-mobile-post-grid';
        }
        if(painel.nextElementSibling!==host)painel.insertAdjacentElement('afterend',host);
        return host;
    }

    function sincronizarSubtelaMobile(){
        const painel=document.getElementById('agenda_painel');
        if(!painel)return;
        const listaAtiva=!painel.classList.contains('ativa');
        const hostTopo=document.getElementById('ks_agenda_mobile_order');
        const hostPosGrade=document.getElementById('ks_agenda_mobile_post_grid');
        const tela=document.getElementById('tela_agenda');
        if(hostTopo)hostTopo.dataset.subtela=listaAtiva?'lista':'semana';
        if(hostPosGrade)hostPosGrade.dataset.subtela=listaAtiva?'lista':'semana';
        if(tela)tela.dataset.agendaSubtela=listaAtiva?'lista':'semana';

        const alternador=prepararAlternadorListaEsperaMobile();
        if(alternador){
            alternador.dataset.agendaView=listaAtiva?'agenda_painel':'agenda_lista_espera';
            alternador.textContent=listaAtiva?'Voltar para agenda':'Lista de espera';
            alternador.title=listaAtiva?'Voltar para agenda':'Abrir lista de espera';
            alternador.setAttribute('aria-label',alternador.title);
            if(alternador.classList.contains('active'))alternador.classList.remove('active');
        }
    }

    function organizarControlesMobileAgenda(){
        if(organizandoMobile)return true;
        organizandoMobile=true;
        try{
            const mobile=modoMobileAgenda();
            if(!mobile){
                restaurarOrdemDesktopAgenda();
                return true;
            }

            preservarNavegacaoMobileAgenda();

            const tela=document.getElementById('tela_agenda');
            const tabs=document.getElementById('ks_agenda_controls');
            const painel=document.getElementById('agenda_painel');
            const card=painel?.querySelector('.agenda-card-semanal');
            if(!tela||!tabs||!painel||!card){
                sincronizarSubtelaMobile();
                return false;
            }

            const hostTopo=garantirHostTopo(tela,painel);
            const hostPosGrade=garantirHostPosGrade(painel);
            const visoes=painel.querySelector('.agenda-visoes')||document.querySelector('#ks_agenda_mobile_order .agenda-visoes');
            const novo=painel.querySelector('.ks-new-appointment')||document.querySelector('#ks_agenda_mobile_order .ks-new-appointment');
            const nav=document.querySelector('#tela_agenda .agenda-semana-nav');
            const data=document.getElementById('agenda_data_input')?.closest('.input-group');
            const historico=document.querySelector('#tela_agenda .agenda-audit-btn');

            [visoes,nav,data,novo,tabs,historico].filter(Boolean).forEach(registrarOrigemMobile);

            if(hostTopo){
                if(visoes&&visoes.parentElement!==hostTopo)hostTopo.appendChild(visoes);
                if(nav&&nav.parentElement!==hostTopo)hostTopo.appendChild(nav);
                if(data&&data.parentElement!==hostTopo&&data.parentElement!==nav){data.classList.add('ks-agenda-mobile-date');hostTopo.appendChild(data);}
                if(novo&&novo.parentElement!==hostTopo)hostTopo.appendChild(novo);
                prepararCabecalhoMobile(hostTopo,nav,data);
            }

            if(hostPosGrade){
                if(tabs.parentElement!==hostPosGrade)hostPosGrade.appendChild(tabs);
                if(historico&&historico.parentElement!==hostPosGrade)hostPosGrade.appendChild(historico);
            }

            sincronizarSubtelaMobile();
            return true;
        }finally{
            organizandoMobile=false;
        }
    }

    function agendarOrganizacaoMobile(){
        if(organizacaoMobilePendente||destruido||!modoMobileAgenda())return;
        organizacaoMobilePendente=true;
        requestAnimationFrame(()=>{
            organizacaoMobilePendente=false;
            if(telaAgendaAtiva())organizarControlesMobileAgenda();
        });
    }

    function observarEstruturaMobileAgenda(){
        if(structureObserver||typeof MutationObserver==='undefined')return;
        const tela=document.getElementById('tela_agenda');
        if(!tela)return;
        structureObserver=new MutationObserver(()=>agendarOrganizacaoMobile());
        structureObserver.observe(tela,{childList:true,subtree:true,attributes:true,attributeFilter:['class','hidden']});
    }

    function sincronizarEstadoVisualAgenda(){
        if(!telaAgendaAtiva())return;
        document.body.dataset.tela='tela_agenda';
        const titulo=document.getElementById('ks_page_title');
        const subtitulo=document.getElementById('ks_page_subtitle');
        if(titulo)titulo.textContent='Agenda';
        if(subtitulo)subtitulo.textContent='Semana de atendimento e disponibilidade';
        document.querySelectorAll('#dropdownContent li[data-tela-menu]').forEach(item=>{
            item.classList.toggle('ks-active',item.dataset.telaMenu==='tela_agenda');
        });
    }

    function alinharHojeNaGradeMobile(){
        if(!modoMobileAgenda())return true;
        const scroll=document.querySelector('#agenda_painel .agenda-grade-scroll');
        if(!scroll)return false;
        const hoje=document.querySelector('#agenda_painel .agenda-dia-cabecalho.hoje');
        if(!hoje)return false;
        const alvo=hoje.offsetLeft-((scroll.clientWidth-hoje.offsetWidth)/2);
        scroll.scrollLeft=Math.max(0,alvo);
        return true;
    }

    function atualizarSeAtiva(){
        if(destruido||!telaAgendaAtiva()||document.visibilityState!=='visible')return;
        if(typeof atualizarMarcadorAgoraAgenda==='function')atualizarMarcadorAgoraAgenda();
    }

    function tentarAlinharHoje(){
        if(alinharHojePendente&&alinharHojeNaGradeMobile())alinharHojePendente=false;
    }

    function sincronizarGradeRenderizada(){
        atualizarSeAtiva();
        tentarAlinharHoje();
        sincronizarResumoDiarioMobile();
        if(modoMobileAgenda())organizarControlesMobileAgenda();
    }

    function aoVisibilityChange(){atualizarSeAtiva();}
    function aoResize(){
        organizarControlesMobileAgenda();
        atualizarSeAtiva();
    }

    function observarGrade(){
        const grade=document.getElementById('agenda_semana_grade');
        if(!grade)return;
        if(!resizeObserver&&typeof ResizeObserver!=='undefined'){
            resizeObserver=new ResizeObserver(()=>sincronizarGradeRenderizada());
            resizeObserver.observe(grade);
        }
        if(!mutationObserver&&typeof MutationObserver!=='undefined'){
            mutationObserver=new MutationObserver(()=>{sincronizarResumoDiarioMobile();tentarAlinharHoje();if(modoMobileAgenda())organizarControlesMobileAgenda();});
            mutationObserver.observe(grade,{childList:true,subtree:true,attributes:true,attributeFilter:['class','style']});
        }
    }

    function activate(){
        if(destruido||!telaAgendaAtiva())return false;
        garantirEstiloMobileAgenda();
        sincronizarEstadoVisualAgenda();
        organizarControlesMobileAgenda();
        observarEstruturaMobileAgenda();
        alinharHojePendente=true;
        atualizarSeAtiva();
        if(!listenersAtivos){
            document.addEventListener('visibilitychange',aoVisibilityChange);
            window.addEventListener('resize',aoResize,{passive:true});
            listenersAtivos=true;
        }
        if(!relogioTimer)relogioTimer=setInterval(atualizarSeAtiva,30000);
        observarGrade();
        requestAnimationFrame(()=>{
            organizarControlesMobileAgenda();
            sincronizarGradeRenderizada();
        });
        return true;
    }

    function suspend(){
        if(relogioTimer){clearInterval(relogioTimer);relogioTimer=null;}
        if(resizeObserver){resizeObserver.disconnect();resizeObserver=null;}
        if(mutationObserver){mutationObserver.disconnect();mutationObserver=null;}
        if(structureObserver){structureObserver.disconnect();structureObserver=null;}
        alinharHojePendente=false;
        organizacaoMobilePendente=false;
        if(listenersAtivos){
            document.removeEventListener('visibilitychange',aoVisibilityChange);
            window.removeEventListener('resize',aoResize);
            listenersAtivos=false;
        }
        return true;
    }

    function destroy(){
        suspend();
        restaurarOrdemDesktopAgenda();
        destruido=true;
        document.removeEventListener('kinesys:tela-ativada',aoTelaAtivada);
        document.removeEventListener('kinesys:tela-desativada',aoTelaDesativada);
        return true;
    }

    function aoTelaAtivada(event){if(event.detail?.id==='tela_agenda')activate();}
    function aoTelaDesativada(event){if(event.detail?.id==='tela_agenda')suspend();}

    function iniciarRelogioAgendaLifecycle(){return activate();}
    iniciarRelogioAgendaLifecycle.__kinesysLifecycle=true;
    if(typeof iniciarRelogioAgenda==='function')iniciarRelogioAgenda=iniciarRelogioAgendaLifecycle;

    document.addEventListener('kinesys:tela-ativada',aoTelaAtivada);
    document.addEventListener('kinesys:tela-desativada',aoTelaDesativada);

    requestAnimationFrame(()=>{
        if(modoMobileAgenda()){
            preservarNavegacaoMobileAgenda();
            organizarControlesMobileAgenda();
            observarEstruturaMobileAgenda();
        }
    });

    window.KineSysAgendaLifecycle=Object.freeze({
        version:VERSION,
        activate,
        suspend,
        destroy,
        limparResumoDiario,
        concluirConsultaVisual,
        status(){
            const topo=document.getElementById('ks_agenda_mobile_order');
            const pos=document.getElementById('ks_agenda_mobile_post_grid');
            const visoes=document.querySelector('#tela_agenda .agenda-visoes');
            const novo=document.querySelector('#tela_agenda .ks-new-appointment');
            const tabs=document.getElementById('ks_agenda_controls');
            const historico=document.querySelector('#tela_agenda .agenda-audit-btn');
            return Object.freeze({
                active:telaAgendaAtiva(),
                timer:!!relogioTimer,
                observer:!!resizeObserver||!!mutationObserver||!!structureObserver,
                listeners:listenersAtivos,
                mobileOrder:!!topo,
                postGrid:!!pos,
                topNavigationAvailable:!!document.querySelector('#tela_agenda .agenda-semana-nav'),
                clinicProfessionalOnTop:!!topo&&topo.contains(visoes),
                newAppointmentOnTop:!!topo&&topo.contains(novo),
                waitlistAfterAgenda:!!pos&&pos.contains(tabs),
                historyAfterAgenda:!!pos&&pos.contains(historico),
                destroyed:destruido
            });
        }
    });
})();
