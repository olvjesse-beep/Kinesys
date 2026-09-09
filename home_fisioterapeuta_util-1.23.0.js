/* ============================================================================
   KineSys — Home do fisioterapeuta: Meu dia clínico v1.23.0
   Camada de experiência. Reaproveita Agenda, prontuário, Avaliação e Evolução
   sem alterar persistência, permissões ou Motor Clínico.
   ============================================================================ */
(function(){
    'use strict';

    const STATUS_CONCLUIDOS = new Set(['atendido','concluido']);
    const STATUS_AUSENCIA = new Set(['falta_justificada','falta_nao_justificada','faltou']);

    function perfilFisioterapeuta(){
        const u=typeof usuarioLogado!=='undefined'?usuarioLogado:null;
        const tipo=String(u?.tipo || '').toUpperCase();
        return tipo==='FISIOTERAPEUTA' || tipo==='PROFISSIONAL';
    }

    function dataLocalISO(data=new Date()){
        const y=data.getFullYear();
        const m=String(data.getMonth()+1).padStart(2,'0');
        const d=String(data.getDate()).padStart(2,'0');
        return `${y}-${m}-${d}`;
    }

    function horaMinutos(valor=''){
        const partes=String(valor||'').slice(0,5).split(':').map(Number);
        return Number.isFinite(partes[0]) && Number.isFinite(partes[1]) ? partes[0]*60+partes[1] : null;
    }

    function dataRegistro(registro){
        if(!registro) return '';
        let bruto='';
        try {
            if(typeof window.obterRealizadoEmRegistro==='function') bruto=window.obterRealizadoEmRegistro(registro)||'';
        } catch(_) {}
        bruto=bruto || registro.realizado_em || registro.realizadoEm || registro.dataHoraISO || registro.dataAvaliacao || registro.data || registro.criado_em || '';
        return String(bruto).slice(0,10);
    }

    function avaliacoesFinalizadas(paciente){
        let lista=[];
        try {
            lista=typeof window.obterAvaliacoes==='function' ? (window.obterAvaliacoes(paciente)||[]) : (paciente?.avaliacoes||[]);
        } catch(_) { lista=paciente?.avaliacoes||[]; }
        return lista.filter(a=>String(a?.status||'').toLowerCase()!=='rascunho');
    }

    function evolucoesPaciente(paciente){
        return Array.isArray(paciente?.evolucoes) ? paciente.evolucoes : [];
    }

    function formatarDiaMes(iso=''){
        const s=String(iso||'').slice(0,10);
        if(!/^\d{4}-\d{2}-\d{2}$/.test(s)) return '';
        const [,m,d]=s.split('-');
        return `${d}/${m}`;
    }

    function contextoClinico(paciente, agendamento, hoje){
        const avaliacoes=avaliacoesFinalizadas(paciente);
        const avaliacoesAnteriores=avaliacoes.filter(a=>{
            const d=dataRegistro(a);
            return !d || d<hoje;
        });
        const avaliacaoHoje=avaliacoes.some(a=>dataRegistro(a)===hoje);
        const evolucoes=evolucoesPaciente(paciente);
        const evolucaoHoje=evolucoes.some(e=>dataRegistro(e)===hoje);
        const evolucoesOrdenadas=evolucoes.slice().sort((a,b)=>String(dataRegistro(a)).localeCompare(String(dataRegistro(b))));
        const ultimaEvolucao=evolucoesOrdenadas.at(-1);
        const ultimaEvolucaoData=dataRegistro(ultimaEvolucao);
        const procedimento=String(agendamento?.procedimentos?.nome || '').trim();
        const procedimentoAvaliativo=/\b(re)?avalia/i.test(procedimento);
        const primeiroAtendimento=avaliacoesAnteriores.length===0;
        const modo=primeiroAtendimento || procedimentoAvaliativo ? 'avaliacao' : 'evolucao';
        const registroHoje=modo==='avaliacao' ? avaliacaoHoje : evolucaoHoje;

        let categoria='Acompanhamento';
        let detalhe='Avaliação anterior disponível';
        if(primeiroAtendimento){
            categoria='Primeiro atendimento';
            detalhe=avaliacaoHoje ? 'Avaliação registrada hoje' : 'Sem avaliação finalizada · iniciar avaliação fisioterapêutica';
        } else if(procedimentoAvaliativo){
            categoria='Reavaliação programada';
            detalhe=avaliacaoHoje ? 'Reavaliação registrada hoje' : 'Há avaliação anterior · revisar e registrar nova avaliação';
        } else if(evolucaoHoje){
            detalhe='Evolução clínica registrada hoje';
        } else if(ultimaEvolucaoData){
            detalhe=`Última evolução em ${formatarDiaMes(ultimaEvolucaoData)}`;
        } else {
            detalhe='Avaliação finalizada · ainda sem evolução clínica registrada';
        }

        return {modo,registroHoje,categoria,detalhe,procedimento};
    }

    function situacaoTemporal(agendamento, agoraMin, ehProximo){
        const status=String(agendamento?.status||'').toLowerCase();
        if(STATUS_AUSENCIA.has(status)) return {rotulo:'Falta registrada',classe:'is-absence'};
        if(STATUS_CONCLUIDOS.has(status)) return {rotulo:'Concluído',classe:'is-done'};
        if(status==='em_recepcao') return {rotulo:'Na recepção',classe:'is-current'};
        const inicio=horaMinutos(agendamento?.hora_inicio);
        const fim=horaMinutos(agendamento?.hora_fim);
        if(inicio!==null && agoraMin>=inicio && agoraMin<=(fim!==null?fim:inicio+60)) return {rotulo:'Agora',classe:'is-current'};
        if(ehProximo) return {rotulo:'Próximo',classe:'is-next'};
        if(inicio!==null && inicio<agoraMin) return {rotulo:'Horário passado',classe:'is-past'};
        return {rotulo:'Hoje',classe:'is-upcoming'};
    }

    async function abrirProntuarioUtil(pacienteId,nome){
        if(!pacienteId) return;
        try {
            if(typeof window.definirPacienteContexto==='function') await window.definirPacienteContexto(String(pacienteId));
            else localStorage.setItem('kinesys_paciente_contexto',String(pacienteId));
        } catch(_) {}
        if(typeof window.navegarPara==='function') window.navegarPara('tela_buscar');
        setTimeout(async()=>{
            const busca=document.getElementById('input_busca_paciente');
            if(busca) busca.value=String(nome||'');
            try {
                if(typeof window.renderizarTabelaProntuarios==='function') await window.renderizarTabelaProntuarios(String(nome||''));
                if(typeof window.definirPacienteContexto==='function') await window.definirPacienteContexto(String(pacienteId));
            } catch(_) {}
        },0);
    }
    window.abrirProntuarioDoPainelFisio=abrirProntuarioUtil;

    async function abrirRegistroClinico(pacienteId,modo){
        if(!pacienteId) return;
        if(typeof window.abrirAtendimentoDoPainel==='function') {
            await window.abrirAtendimentoDoPainel(String(pacienteId),modo);
            return;
        }
        try { localStorage.setItem('kinesys_paciente_contexto',String(pacienteId)); } catch(_) {}
        if(modo==='evolucao') window.navegarPara?.('tela_evolucao');
        else window.navegarPara?.('tela_avaliacao');
    }

    function criarBotao(texto,classe,acao){
        const b=document.createElement('button');
        b.type='button';
        b.className=classe;
        b.textContent=texto;
        b.addEventListener('click',acao);
        return b;
    }

    function prepararCabecalho(card){
        card.classList.add('ks-fisio-util');
        const eyebrow=card.querySelector('.eyebrow');
        if(eyebrow) eyebrow.textContent='ROTINA CLÍNICA';
        const titulo=document.getElementById('painel_fisio_titulo');
        if(titulo) titulo.textContent='Meu dia clínico';
        const resumo=document.getElementById('painel_fisio_resumo');
        if(resumo){
            resumo.setAttribute('role','status');
            resumo.setAttribute('aria-live','polite');
        }
        const header=card.querySelector('.card-header');
        if(!header) return;
        let actions=header.querySelector('.ks-fisio-header-actions');
        if(!actions){
            actions=document.createElement('div');
            actions.className='ks-fisio-header-actions';
            const atualizar=header.querySelector('button');
            const agenda=criarBotao('Agenda completa','btn-secondary',()=>window.navegarPara?.('tela_agenda'));
            actions.appendChild(agenda);
            if(atualizar){
                atualizar.textContent='Atualizar';
                actions.appendChild(atualizar);
            }
            header.appendChild(actions);
        }
    }

    function montarLinha({agendamento,paciente,nome,clinica,situacao}){
        const row=document.createElement('article');
        row.className=`ks-fisio-day-row ${situacao.classe}`;

        const time=document.createElement('div');
        time.className='ks-fisio-day-time';
        const horario=document.createElement('strong');
        horario.textContent=String(agendamento.hora_inicio||'').slice(0,5) || '—';
        const badge=document.createElement('span');
        badge.className='ks-fisio-day-status';
        badge.textContent=situacao.rotulo;
        time.append(horario,badge);

        const content=document.createElement('div');
        content.className='ks-fisio-day-content';
        const top=document.createElement('div');
        top.className='ks-fisio-day-patient';
        const patientName=document.createElement('strong');
        patientName.textContent=nome;
        top.appendChild(patientName);
        if(clinica.procedimento){
            const proc=document.createElement('span');
            proc.textContent=clinica.procedimento;
            top.appendChild(proc);
        }
        const category=document.createElement('div');
        category.className='ks-fisio-day-category';
        category.textContent=clinica.categoria;
        const detail=document.createElement('p');
        detail.className='ks-fisio-day-detail';
        detail.textContent=clinica.detalhe;
        content.append(top,category,detail);

        const actions=document.createElement('div');
        actions.className='ks-fisio-day-actions';
        actions.appendChild(criarBotao('Prontuário','btn-secondary',()=>abrirProntuarioUtil(agendamento.paciente_id,nome)));

        const status=String(agendamento.status||'').toLowerCase();
        const ausencia=STATUS_AUSENCIA.has(status);
        if(!ausencia && !clinica.registroHoje){
            const label=clinica.modo==='avaliacao' ? (clinica.categoria==='Reavaliação programada'?'Registrar reavaliação':'Iniciar avaliação') : 'Registrar evolução';
            const primary=criarBotao(label,'btn-primary',()=>abrirRegistroClinico(agendamento.paciente_id,clinica.modo));
            actions.appendChild(primary);
            if(STATUS_CONCLUIDOS.has(status)) row.classList.add('has-record-pending');
        } else if(clinica.registroHoje && !ausencia){
            const done=document.createElement('span');
            done.className='ks-fisio-record-done';
            done.textContent='Registro clínico concluído';
            actions.appendChild(done);
        }

        if(!paciente) row.classList.add('has-missing-record');
        row.append(time,content,actions);
        return row;
    }

    async function carregarPainelFisioterapeutaUtil(){
        const card=document.getElementById('card_painel_fisioterapeuta');
        if(!card) return;
        const eh=perfilFisioterapeuta();
        card.hidden=!eh;
        if(!eh) return;
        prepararCabecalho(card);

        const resumo=document.getElementById('painel_fisio_resumo');
        const lista=document.getElementById('painel_fisio_lista');
        if(!resumo||!lista) return;
        lista.replaceChildren();
        resumo.textContent='Organizando seus atendimentos e registros clínicos…';
        if(typeof _supabase==='undefined' || !_supabase){
            resumo.textContent='Não foi possível acessar sua agenda agora.';
            return;
        }

        const perfilInicial=typeof usuarioLogado!=='undefined'?usuarioLogado:null;
        try {
            if(typeof window.carregarProfissionaisAgenda!=='function' || !await window.carregarProfissionaisAgenda()) throw new Error('Equipe indisponível');
        } catch(_) {
            if((typeof usuarioLogado!=='undefined'?usuarioLogado:null)===perfilInicial) resumo.textContent='Não foi possível verificar seu vínculo com a agenda. Tente novamente.';
            return;
        }
        if((typeof usuarioLogado!=='undefined'?usuarioLogado:null)!==perfilInicial) return;

        const profissionalId=typeof window.profissionalAgendaRestritoAtualId==='function'
            ? window.profissionalAgendaRestritoAtualId()
            : String(perfilInicial?.id||'');
        if(!profissionalId){
            resumo.textContent='Vincule seu perfil a um profissional da agenda para ver o seu dia clínico.';
            return;
        }

        const hoje=dataLocalISO();
        let consulta=await _supabase.from('agendamentos')
            .select('id,paciente_id,procedimento_id,hora_inicio,hora_fim,status,pacientes(id,nome),procedimentos(nome,duracao_minutos)')
            .eq('data',hoje).eq('profissional_id',profissionalId).neq('status','cancelado').order('hora_inicio');
        if(consulta.error && /procedimentos|hora_fim|relationship|schema cache/i.test(String(consulta.error.message||''))){
            consulta=await _supabase.from('agendamentos')
                .select('id,paciente_id,procedimento_id,hora_inicio,hora_fim,status,pacientes(id,nome)')
                .eq('data',hoje).eq('profissional_id',profissionalId).neq('status','cancelado').order('hora_inicio');
        }
        if(consulta.error){
            resumo.textContent='Não foi possível carregar seus atendimentos agora.';
            return;
        }

        let pacientes=[];
        try { pacientes=typeof window.obterPacientesSalvos==='function' ? await window.obterPacientesSalvos() : []; } catch(_) {}
        const mapaPacientes=new Map((pacientes||[]).map(p=>[String(p.id||''),p]));
        const atendimentos=consulta.data||[];
        if(!atendimentos.length){
            resumo.textContent='Nenhum atendimento agendado para hoje.';
            const empty=document.createElement('div');
            empty.className='ks-fisio-painel-vazio';
            empty.textContent='Seu dia está livre na Agenda. Use “Agenda completa” para consultar outros dias.';
            lista.appendChild(empty);
            return;
        }

        const agora=new Date();
        const agoraMin=agora.getHours()*60+agora.getMinutes();
        const futuro=atendimentos.find(a=>{
            const st=String(a.status||'').toLowerCase();
            const min=horaMinutos(a.hora_inicio);
            return !STATUS_CONCLUIDOS.has(st) && !STATUS_AUSENCIA.has(st) && min!==null && min>=agoraMin;
        });

        let concluidos=0;
        let registrosPendentes=0;
        atendimentos.forEach(a=>{
            const st=String(a.status||'').toLowerCase();
            if(STATUS_CONCLUIDOS.has(st)) concluidos++;
            const paciente=mapaPacientes.get(String(a.paciente_id||''));
            const clinica=contextoClinico(paciente,a,hoje);
            const inicio=horaMinutos(a.hora_inicio);
            if(!STATUS_AUSENCIA.has(st) && !clinica.registroHoje && (STATUS_CONCLUIDOS.has(st) || (inicio!==null && inicio<agoraMin))) registrosPendentes++;
            const nome=String(a.pacientes?.nome || paciente?.nome || 'Paciente');
            const situacao=situacaoTemporal(a,agoraMin,futuro && String(futuro.id)===String(a.id));
            lista.appendChild(montarLinha({agendamento:a,paciente,nome,clinica,situacao}));
        });

        const partes=[`${atendimentos.length} atendimento(s) hoje`,`${concluidos} concluído(s)`];
        if(futuro) partes.push(`próximo às ${String(futuro.hora_inicio||'').slice(0,5)}`);
        if(registrosPendentes) partes.push(`${registrosPendentes} registro(s) clínico(s) pendente(s)`);
        resumo.textContent=partes.join(' · ');
    }

    window.carregarPainelFisioterapeuta=carregarPainelFisioterapeutaUtil;
})();
