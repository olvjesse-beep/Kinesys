/* ============================================================================
   KineSys — Home do fisioterapeuta: Meu dia clínico v1.24.0
   - Widget compacto e expansível
   - Sequência clínica por paciente + família de procedimento
   - Agenda continua sendo a fonte de verdade para sessões realizadas
   ============================================================================ */
(function(){
    'use strict';

    const STATUS_CONCLUIDOS = new Set(['atendido','concluido']);
    const STATUS_AUSENCIA = new Set(['falta_justificada','falta_nao_justificada','faltou']);
    const LIMITE_COMPACTO = 3;

    function perfilFisioterapeuta(){
        const u=typeof usuarioLogado!=='undefined' ? usuarioLogado : null;
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

    function normalizarTexto(valor=''){
        return String(valor||'')
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g,'')
            .toLowerCase()
            .replace(/\s+/g,' ')
            .trim();
    }

    function nomeProcedimento(registro){
        const rel=registro?.procedimentos;
        if(Array.isArray(rel) && rel[0]?.nome) return String(rel[0].nome).trim();
        if(rel?.nome) return String(rel.nome).trim();
        const id=String(registro?.procedimento_id || '');
        try {
            if(typeof agendaProcedimentosCache!=='undefined' && Array.isArray(agendaProcedimentosCache)){
                const p=agendaProcedimentosCache.find(x=>String(x?.id||'')===id);
                if(p?.nome) return String(p.nome).trim();
            }
        } catch(_) {}
        return '';
    }

    function familiaProcedimento(nome='',procedimentoId=''){
        const n=normalizarTexto(nome);
        if(/\b(re)?avaliacao\b|\breavaliacao\b/.test(n)) return 'avaliacao';
        if(/osteopat/.test(n)) return 'osteopatia';
        if(/liberacao|miofasc/.test(n)) return 'liberacao_miofascial';
        if(/fisioterap/.test(n)) return 'fisioterapia';
        return `procedimento:${String(procedimentoId||n||'atendimento')}`;
    }

    function ordinalFeminino(numero){
        const n=Math.max(1,Number(numero)||1);
        return `${n}ª`;
    }

    function rotuloSequenciaServico(familia,nome,numero){
        const ord=ordinalFeminino(numero);
        if(familia==='avaliacao') return numero<=1 ? 'Avaliação inicial' : `Reavaliação · ${ord} avaliação`;
        if(familia==='osteopatia') return `Osteopatia · ${ord} sessão`;
        if(familia==='liberacao_miofascial') return `Liberação miofascial · ${ord} sessão`;
        if(familia==='fisioterapia') return `Fisioterapia · ${ord} sessão`;
        return `${String(nome||'Atendimento')} · ${ord} sessão`;
    }

    function registroAntesDoAtual(registro,atual,hoje){
        if(!registro || String(registro.id||'')===String(atual?.id||'')) return false;
        const data=String(registro.data||'').slice(0,10);
        if(data<hoje) return true;
        if(data>hoje) return false;
        const h=horaMinutos(registro.hora_inicio);
        const a=horaMinutos(atual?.hora_inicio);
        if(h===null || a===null) return false;
        return h<a;
    }

    function mesmaFamilia(registro,atual,familiaAtual){
        const idRegistro=String(registro?.procedimento_id||'');
        const idAtual=String(atual?.procedimento_id||'');
        if(idRegistro && idAtual && idRegistro===idAtual) return true;
        const nome=nomeProcedimento(registro);
        const familia=familiaProcedimento(nome,idRegistro);
        return !familiaAtual.startsWith('procedimento:') && familia===familiaAtual;
    }

    function sequenciaDoAtendimento(atual,historico,hoje){
        const nome=nomeProcedimento(atual);
        const familia=familiaProcedimento(nome,atual?.procedimento_id);
        const anteriores=(historico||[]).filter(r=>
            STATUS_CONCLUIDOS.has(String(r?.status||'').toLowerCase()) && registroAntesDoAtual(r,atual,hoje)
        );
        const anterioresServico=anteriores.filter(r=>mesmaFamilia(r,atual,familia));
        const numero=anterioresServico.length+1;
        return {
            familia,
            nome,
            numero,
            primeiroAtendimentoClinica:anteriores.length===0,
            rotulo:rotuloSequenciaServico(familia,nome,numero)
        };
    }

    function dataRegistro(registro){
        if(!registro) return '';
        let bruto='';
        try {
            if(typeof obterRealizadoEmRegistro==='function') bruto=obterRealizadoEmRegistro(registro)||'';
        } catch(_) {}
        bruto=bruto || registro.realizado_em || registro.realizadoEm || registro.dataHoraISO || registro.dataAvaliacao || registro.data || registro.criado_em || '';
        return String(bruto).slice(0,10);
    }

    function avaliacoesFinalizadas(paciente){
        let lista=[];
        try {
            lista=typeof obterAvaliacoes==='function' ? (obterAvaliacoes(paciente)||[]) : (paciente?.avaliacoes||[]);
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

    function registroVinculadoAoAgendamento(registro,agendamentoId){
    const id=String(agendamentoId||'');
    const vinculo=String(registro?.agendamentoId||registro?.agendamento_id||'');
    return !!id && !!vinculo && id===vinculo;
}

function contextoClinico(paciente,agendamento,hoje,sequencia){
        const avaliacoes=avaliacoesFinalizadas(paciente);
        const temAvaliacao=avaliacoes.length>0;
        const avaliacaoHoje=avaliacoes.some(a=>registroVinculadoAoAgendamento(a,agendamento?.id));
        const evolucoes=evolucoesPaciente(paciente);
        const evolucaoHoje=evolucoes.some(e=>registroVinculadoAoAgendamento(e,agendamento?.id));
        const ultimaEvolucao=evolucoes.slice().sort((a,b)=>String(dataRegistro(a)).localeCompare(String(dataRegistro(b)))).at(-1);
        const ultimaEvolucaoData=dataRegistro(ultimaEvolucao);
        const procedimentoAvaliativo=sequencia.familia==='avaliacao';
        const modo=!temAvaliacao || procedimentoAvaliativo ? 'avaliacao' : 'evolucao';
        const registroHoje=modo==='avaliacao' ? avaliacaoHoje : evolucaoHoje;

        let detalhe='';
        if(registroHoje){
            detalhe=modo==='avaliacao' ? 'Avaliação clínica registrada hoje' : 'Evolução clínica registrada hoje';
        } else if(!temAvaliacao){
            detalhe=sequencia.primeiroAtendimentoClinica
                ? 'Primeiro atendimento na clínica · avaliação clínica pendente'
                : 'Avaliação clínica ainda não finalizada';
        } else if(procedimentoAvaliativo){
            detalhe='Revisar avaliação anterior e registrar o atendimento avaliativo';
        } else if(ultimaEvolucaoData){
            detalhe=`Evolução clínica pendente · última evolução em ${formatarDiaMes(ultimaEvolucaoData)}`;
        } else {
            detalhe='Evolução clínica pendente · avaliação anterior disponível';
        }

        return {
            modo,
            registroHoje,
            detalhe,
            rotuloSessao:sequencia.rotulo,
            primeiroAtendimentoClinica:sequencia.primeiroAtendimentoClinica,
            familia:sequencia.familia
        };
    }

    function situacaoTemporal(agendamento,agoraMin,ehProximo){
        const status=String(agendamento?.status||'').toLowerCase();
        if(STATUS_AUSENCIA.has(status)) return {rotulo:'Falta',classe:'is-absence'};
        if(status==='em_recepcao') return {rotulo:'Recepção',classe:'is-current'};
        const inicio=horaMinutos(agendamento?.hora_inicio);
        const fim=horaMinutos(agendamento?.hora_fim);
        if(!STATUS_CONCLUIDOS.has(status) && inicio!==null && agoraMin>=inicio && agoraMin<=(fim!==null?fim:inicio+60)) return {rotulo:'Agora',classe:'is-current'};
        if(STATUS_CONCLUIDOS.has(status)) return {rotulo:'Concluído',classe:'is-done'};
        if(ehProximo) return {rotulo:'Próximo',classe:'is-next'};
        if(inicio!==null && inicio<agoraMin) return {rotulo:'Passado',classe:'is-past'};
        return {rotulo:'Hoje',classe:'is-upcoming'};
    }

    async function abrirProntuario(pacienteId,nome){
        if(!pacienteId) return;
        try {
            if(typeof definirPacienteContexto==='function') await definirPacienteContexto(String(pacienteId));
            else localStorage.setItem('kinesys_paciente_contexto',String(pacienteId));
        } catch(_) {}
        if(typeof navegarPara==='function') navegarPara('tela_buscar');
        setTimeout(async()=>{
            const busca=document.getElementById('input_busca_paciente');
            if(busca) busca.value=String(nome||'');
            try {
                if(typeof renderizarTabelaProntuarios==='function') await renderizarTabelaProntuarios(String(nome||''));
                if(typeof definirPacienteContexto==='function') await definirPacienteContexto(String(pacienteId));
            } catch(_) {}
        },0);
    }

    async function abrirRegistroClinico(pacienteId,modo,agendamentoId){
        if(typeof window.definirAgendamentoClinicoContexto==='function') window.definirAgendamentoClinicoContexto(String(agendamentoId||''),String(pacienteId||''),String(modo||''));
        if(!pacienteId) return;
        if(typeof abrirAtendimentoDoPainel==='function'){
            await abrirAtendimentoDoPainel(String(pacienteId),modo);
            return;
        }
        try { localStorage.setItem('kinesys_paciente_contexto',String(pacienteId)); } catch(_) {}
        if(typeof navegarPara==='function') navegarPara(modo==='evolucao'?'tela_evolucao':'tela_avaliacao');
    }

    function criarBotao(texto,classe,acao){
        const b=document.createElement('button');
        b.type='button';
        b.className=classe;
        b.textContent=texto;
        b.addEventListener('click',acao);
        return b;
    }

    function prepararCabecalho(card,total=0){
        card.classList.add('ks-fisio-util','ks-fisio-util-compact');
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
            header.appendChild(actions);
        }
        const original=Array.from(header.children).find(el=>el.tagName==='BUTTON');
        if(original){
            original.textContent='Atualizar';
            actions.appendChild(original);
        }
        let agenda=actions.querySelector('[data-ks-fisio-agenda]');
        if(!agenda){
            agenda=criarBotao('Agenda','btn-secondary',()=>{ if(typeof navegarPara==='function') navegarPara('tela_agenda'); });
            agenda.dataset.ksFisioAgenda='1';
            actions.prepend(agenda);
        }
        let toggle=actions.querySelector('[data-ks-fisio-toggle]');
        if(!toggle){
            toggle=criarBotao('Ver todos','btn-secondary',()=>{
                const expandido=card.classList.toggle('is-expanded');
                toggle.setAttribute('aria-expanded',expandido?'true':'false');
                toggle.textContent=expandido?'Ver menos':`Ver todos (${card.dataset.ksTotal||0})`;
            });
            toggle.dataset.ksFisioToggle='1';
            toggle.setAttribute('aria-expanded','false');
            actions.insertBefore(toggle,agenda.nextSibling);
        }
        card.dataset.ksTotal=String(total||0);
        toggle.hidden=total<=LIMITE_COMPACTO;
        toggle.textContent=`Ver todos (${total})`;
        toggle.setAttribute('aria-expanded',card.classList.contains('is-expanded')?'true':'false');
    }

    function montarLinha(item){
        const {agendamento,paciente,nome,clinica,situacao,registroPendente,extra}=item;
        const row=document.createElement('article');
        row.className=`ks-fisio-day-row ${situacao.classe}${registroPendente?' has-record-pending':''}${extra?' is-extra':''}`;
        row.dataset.agendamentoId=String(agendamento.id||'');

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
        const patientName=document.createElement('strong');
        patientName.className='ks-fisio-day-patient-name';
        patientName.textContent=nome;
        const category=document.createElement('div');
        category.className='ks-fisio-day-category';
        category.textContent=clinica.rotuloSessao;
        const detail=document.createElement('p');
        detail.className='ks-fisio-day-detail';
        detail.textContent=clinica.detalhe;
        content.append(patientName,category,detail);

        const actions=document.createElement('div');
        actions.className='ks-fisio-day-actions';
        actions.appendChild(criarBotao('Prontuário','btn-secondary',()=>abrirProntuario(agendamento.paciente_id,nome)));
        const status=String(agendamento.status||'').toLowerCase();
        const ausencia=STATUS_AUSENCIA.has(status);
        if(!ausencia && !clinica.registroHoje){
            let label='Registrar evolução';
            if(clinica.modo==='avaliacao') label=clinica.familia==='avaliacao' && !clinica.primeiroAtendimentoClinica ? 'Registrar reavaliação' : 'Iniciar avaliação';
            actions.appendChild(criarBotao(label,'btn-primary',()=>abrirRegistroClinico(agendamento.paciente_id,clinica.modo,agendamento.id)));
        } else if(clinica.registroHoje && !ausencia){
            const done=document.createElement('span');
            done.className='ks-fisio-record-done';
            done.textContent='Registro concluído';
            actions.appendChild(done);
        }
        if(!paciente) row.classList.add('has-missing-record');
        row.append(time,content,actions);
        return row;
    }

    function pontuacaoPrioridade(item){
        if(item.situacao.classe==='is-current') return 0;
        if(item.registroPendente) return 1;
        if(item.situacao.classe==='is-next') return 2;
        if(item.situacao.classe==='is-upcoming') return 3;
        if(item.situacao.classe==='is-past') return 4;
        if(item.situacao.classe==='is-done') return 5;
        return 6;
    }

    async function carregarHistoricoAgenda(atendimentos,hoje,profissionalId){
        const ids=[...new Set((atendimentos||[]).map(a=>String(a?.paciente_id||'')).filter(Boolean))];
        if(!ids.length) return [];
        let q=await _supabase.from('agendamentos')
            .select('id,paciente_id,procedimento_id,data,hora_inicio,status,procedimentos(nome)')
            .in('paciente_id',ids).lte('data',hoje).neq('status','cancelado')
            .order('data').order('hora_inicio');
        if(q.error && /procedimentos|relationship|schema cache/i.test(String(q.error.message||''))){
            q=await _supabase.from('agendamentos')
                .select('id,paciente_id,procedimento_id,data,hora_inicio,status')
                .in('paciente_id',ids).lte('data',hoje).neq('status','cancelado')
                .order('data').order('hora_inicio');
        }
        if(q.error){
            q=await _supabase.from('agendamentos')
                .select('id,paciente_id,procedimento_id,data,hora_inicio,status')
                .in('paciente_id',ids).eq('profissional_id',profissionalId).lte('data',hoje).neq('status','cancelado')
                .order('data').order('hora_inicio');
        }
        return q.error ? [] : (q.data||[]);
    }

    async function carregarPainelFisioterapeutaUtil(){
        const card=document.getElementById('card_painel_fisioterapeuta');
        if(!card) return;
        const eh=perfilFisioterapeuta();
        card.hidden=!eh;
        if(!eh) return;
        card.classList.remove('is-expanded');
        prepararCabecalho(card,0);

        const resumo=document.getElementById('painel_fisio_resumo');
        const lista=document.getElementById('painel_fisio_lista');
        if(!resumo||!lista) return;
        lista.replaceChildren();
        resumo.textContent='Organizando sua rotina clínica…';
        if(typeof _supabase==='undefined' || !_supabase){
            resumo.textContent='Não foi possível acessar sua agenda agora.';
            return;
        }

        const perfilInicial=typeof usuarioLogado!=='undefined' ? usuarioLogado : null;
        try {
            if(typeof carregarProfissionaisAgenda!=='function' || !await carregarProfissionaisAgenda()) throw new Error('Equipe indisponível');
        } catch(_) {
            if((typeof usuarioLogado!=='undefined'?usuarioLogado:null)===perfilInicial) resumo.textContent='Não foi possível verificar seu vínculo com a agenda.';
            return;
        }
        if((typeof usuarioLogado!=='undefined'?usuarioLogado:null)!==perfilInicial) return;

        const profissionalId=typeof profissionalAgendaRestritoAtualId==='function'
            ? profissionalAgendaRestritoAtualId()
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

        const atendimentos=consulta.data||[];
        prepararCabecalho(card,atendimentos.length);
        if(!atendimentos.length){
            resumo.textContent='Nenhum atendimento agendado para hoje.';
            const empty=document.createElement('div');
            empty.className='ks-fisio-painel-vazio';
            empty.textContent='Seu dia está livre. Abra a Agenda para consultar outros dias.';
            lista.appendChild(empty);
            return;
        }

        let pacientes=[];
        try { pacientes=typeof obterPacientesSalvos==='function' ? await obterPacientesSalvos() : []; } catch(_) {}
        const mapaPacientes=new Map((pacientes||[]).map(p=>[String(p.id||''),p]));
        const historico=await carregarHistoricoAgenda(atendimentos,hoje,profissionalId);
        const agora=new Date();
        const agoraMin=agora.getHours()*60+agora.getMinutes();
        const futuro=atendimentos.find(a=>{
            const st=String(a.status||'').toLowerCase();
            const min=horaMinutos(a.hora_inicio);
            return !STATUS_CONCLUIDOS.has(st) && !STATUS_AUSENCIA.has(st) && min!==null && min>=agoraMin;
        });

        let concluidos=0;
        let registrosPendentes=0;
        const itens=atendimentos.map(a=>{
            const status=String(a.status||'').toLowerCase();
            if(STATUS_CONCLUIDOS.has(status)) concluidos++;
            const paciente=mapaPacientes.get(String(a.paciente_id||''));
            const seq=sequenciaDoAtendimento(a,historico,hoje);
            const clinica=contextoClinico(paciente,a,hoje,seq);
            const inicio=horaMinutos(a.hora_inicio);
            const registroPendente=!STATUS_AUSENCIA.has(status) && !clinica.registroHoje && (STATUS_CONCLUIDOS.has(status) || (inicio!==null && inicio<agoraMin));
            if(registroPendente) registrosPendentes++;
            const nome=String(a.pacientes?.nome || paciente?.nome || 'Paciente');
            const situacao=situacaoTemporal(a,agoraMin,futuro && String(futuro.id)===String(a.id));
            return {agendamento:a,paciente,nome,clinica,situacao,registroPendente};
        });

        const prioritarios=itens.slice().sort((a,b)=>{
            const pa=pontuacaoPrioridade(a),pb=pontuacaoPrioridade(b);
            if(pa!==pb) return pa-pb;
            return (horaMinutos(a.agendamento.hora_inicio)||0)-(horaMinutos(b.agendamento.hora_inicio)||0);
        }).slice(0,LIMITE_COMPACTO);
        const visiveis=new Set(prioritarios.map(x=>String(x.agendamento.id||'')));

        itens.forEach(item=>{
            item.extra=!visiveis.has(String(item.agendamento.id||''));
            lista.appendChild(montarLinha(item));
        });

        const partes=[`${atendimentos.length} hoje`,`${concluidos} concluído(s)`];
        if(futuro) partes.push(`próximo ${String(futuro.hora_inicio||'').slice(0,5)}`);
        if(registrosPendentes) partes.push(`${registrosPendentes} registro(s) pendente(s)`);
        resumo.textContent=partes.join(' · ');
    }

    window.carregarPainelFisioterapeuta=carregarPainelFisioterapeutaUtil;
})();
