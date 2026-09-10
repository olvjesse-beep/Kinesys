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
    const JANELA_HOME_MINUTOS = 4 * 60;
    let contextoAgendaHomeFisioterapeuta = null;

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

    function instanteHomeBrasilia(agora=new Date()){
        const partes=Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(agora).map(p=>[p.type,p.value]));
        return {data:`${partes.year}-${partes.month}-${partes.day}`,hora:`${partes.hour}:${partes.minute}`,minutos:Number(partes.hour)*60+Number(partes.minute)};
    }

    function agendamentoEhReagendadoHome(agendamento){
        return /reagendamento\s+do\s+atendimento/i.test(String(agendamento?.observacoes||''));
    }

    function situacaoTemporal(agendamento,agoraMin){
        const status=String(agendamento?.status||'').toLowerCase();
        if(status==='cancelado') return {rotulo:'Cancelado',classe:'is-cancelled'};
        if(agendamentoEhReagendadoHome(agendamento)) return {rotulo:'Remarcado',classe:'is-rescheduled'};
        if(status==='falta_justificada'||status==='faltou') return {rotulo:'Falta justificada',classe:'is-absence'};
        if(status==='falta_nao_justificada') return {rotulo:'Falta não justificada',classe:'is-absence'};
        if(STATUS_CONCLUIDOS.has(status)) return {rotulo:'Atendimento concluído',classe:'is-done'};
        if(status==='em_recepcao') return {rotulo:'A ser atendido',classe:'is-waiting'};
        const inicio=horaMinutos(agendamento?.hora_inicio);
        const fim=horaMinutos(agendamento?.hora_fim);
        if(inicio!==null && agoraMin>=inicio && agoraMin<(fim!==null?fim:inicio+60)) return {rotulo:'Em atendimento',classe:'is-current'};
        return {rotulo:'A ser atendido',classe:'is-upcoming'};
    }

    function diaSemanaISOHome(dataISO){
        const [a,m,d]=String(dataISO||'').split('-').map(Number);
        return Number.isFinite(a)&&Number.isFinite(m)&&Number.isFinite(d) ? new Date(a,m-1,d).getDay() : new Date().getDay();
    }

    function intersectarJanelasHome(gerais,especificas){
        const out=[];
        (gerais||[]).forEach(g=>{
            const gi=horaMinutos(g.hora_inicio), gf=horaMinutos(g.hora_fim);
            (especificas||[]).forEach(e=>{
                const ei=horaMinutos(e.hora_inicio), ef=horaMinutos(e.hora_fim);
                const inicio=Math.max(gi,ei),fim=Math.min(gf,ef);
                if(Number.isFinite(inicio)&&Number.isFinite(fim)&&inicio<fim) out.push({inicio,fim});
            });
        });
        return out;
    }

    function janelasAtendimentoHome(dataISO,profissionalId){
        const horarios=Array.isArray(contextoAgendaHomeFisioterapeuta?.horarios)?contextoAgendaHomeFisioterapeuta.horarios:[];
        const dia=diaSemanaISOHome(dataISO), pid=String(profissionalId||'');
        const gerais=horarios.filter(h=>Number(h.dia_semana)===dia&&!h.profissional_id).map(h=>({inicio:horaMinutos(h.hora_inicio),fim:horaMinutos(h.hora_fim)})).filter(j=>Number.isFinite(j.inicio)&&Number.isFinite(j.fim)&&j.inicio<j.fim);
        const todas=horarios.filter(h=>String(h.profissional_id||'')===pid);
        if(!todas.length) return gerais;
        const especificas=todas.filter(h=>Number(h.dia_semana)===dia);
        if(!especificas.length) return [];
        return intersectarJanelasHome(
            gerais.map(j=>({hora_inicio:minutosHoraHome(j.inicio),hora_fim:minutosHoraHome(j.fim)})),
            especificas
        );
    }

    function minutosHoraHome(minutos){
        const m=Math.max(0,Math.min(1439,Math.round(Number(minutos)||0)));
        return `${String(Math.floor(m/60)).padStart(2,'0')}:${String(m%60).padStart(2,'0')}`;
    }

    function bloqueiosAtendimentoHome(dataISO,profissionalId){
        const bloqueios=Array.isArray(contextoAgendaHomeFisioterapeuta?.bloqueios)?contextoAgendaHomeFisioterapeuta.bloqueios:[];
        return bloqueios.filter(b=>String(b.data||'')===String(dataISO)&&(!b.profissional_id||String(b.profissional_id)===String(profissionalId))).map(b=>({
            inicio:b.hora_inicio?horaMinutos(b.hora_inicio):0,
            fim:b.hora_fim?horaMinutos(b.hora_fim):24*60
        })).filter(x=>Number.isFinite(x.inicio)&&Number.isFinite(x.fim)&&x.inicio<x.fim);
    }

    function statusOcupaHorarioHome(status){
        return ['pre_agendado','agendado','confirmado','em_recepcao'].includes(String(status||'').toLowerCase());
    }

    function intervalosLivresHome(dataISO,profissionalId,inicioJanela,fimJanela,atendimentos){
        const janelas=janelasAtendimentoHome(dataISO,profissionalId);
        const bloqueios=bloqueiosAtendimentoHome(dataISO,profissionalId);
        const ocupados=(atendimentos||[]).filter(a=>statusOcupaHorarioHome(a.status)).map(a=>({
            inicio:horaMinutos(a.hora_inicio),fim:horaMinutos(a.hora_fim)
        })).filter(x=>Number.isFinite(x.inicio)&&Number.isFinite(x.fim)&&x.inicio<x.fim);
        const indisponiveis=[...bloqueios,...ocupados].sort((a,b)=>a.inicio-b.inicio);
        const livres=[];
        janelas.forEach(j=>{
            const inicio=Math.max(j.inicio,inicioJanela),fim=Math.min(j.fim,fimJanela);
            if(inicio>=fim)return;
            let cursor=inicio;
            indisponiveis.forEach(b=>{
                if(b.fim<=cursor||b.inicio>=fim)return;
                if(b.inicio>cursor)livres.push({inicio:cursor,fim:Math.min(b.inicio,fim)});
                cursor=Math.max(cursor,Math.min(b.fim,fim));
            });
            if(cursor<fim)livres.push({inicio:cursor,fim});
        });
        return livres.filter(x=>x.fim-x.inicio>=10);
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
        card.classList.remove('is-expanded');
        const eyebrow=card.querySelector('.eyebrow');
        if(eyebrow) eyebrow.textContent='ROTINA CLÍNICA';
        const titulo=document.getElementById('painel_fisio_titulo');
        if(titulo) titulo.textContent='Meu dia clínico';
        const resumo=document.getElementById('painel_fisio_resumo');
        if(resumo){resumo.setAttribute('role','status');resumo.setAttribute('aria-live','polite');}
        const header=card.querySelector('.card-header');
        if(!header)return;
        let actions=header.querySelector('.ks-fisio-header-actions');
        if(!actions){actions=document.createElement('div');actions.className='ks-fisio-header-actions';header.appendChild(actions);}
        const original=Array.from(header.children).find(el=>el.tagName==='BUTTON');
        if(original){original.textContent='Atualizar';actions.appendChild(original);}
        let agenda=actions.querySelector('[data-ks-fisio-agenda]');
        if(!agenda){agenda=criarBotao('Agenda','btn-secondary',()=>{if(typeof navegarPara==='function')navegarPara('tela_agenda');});agenda.dataset.ksFisioAgenda='1';actions.prepend(agenda);}
        const toggle=actions.querySelector('[data-ks-fisio-toggle]');
        if(toggle)toggle.remove();
        card.dataset.ksTotal=String(total||0);
    }

    function montarLinha(item){
        const {agendamento,paciente,nome,clinica,situacao,registroPendente}=item;
        const row=document.createElement('article');
        row.className=`ks-fisio-day-row ${situacao.classe}${registroPendente?' has-record-pending':''}`;
        row.dataset.agendamentoId=String(agendamento.id||'');
        const time=document.createElement('div');time.className='ks-fisio-day-time';
        const horario=document.createElement('strong');horario.textContent=String(agendamento.hora_inicio||'').slice(0,5)||'—';
        const badge=document.createElement('span');badge.className='ks-fisio-day-status';badge.textContent=situacao.rotulo;time.append(horario,badge);
        const content=document.createElement('div');content.className='ks-fisio-day-content';
        const patientName=document.createElement('strong');patientName.className='ks-fisio-day-patient-name';patientName.textContent=nome;
        const category=document.createElement('div');category.className='ks-fisio-day-category';category.textContent=clinica.rotuloSessao;
        const detail=document.createElement('p');detail.className='ks-fisio-day-detail';detail.textContent=clinica.detalhe;content.append(patientName,category,detail);
        const actions=document.createElement('div');actions.className='ks-fisio-day-actions';
        const status=String(agendamento.status||'').toLowerCase();
        const bloqueiaAcao=STATUS_AUSENCIA.has(status)||status==='cancelado';
        if(!bloqueiaAcao){
            const modoDestino=clinica.familia==='avaliacao' ? 'avaliacao' : 'evolucao';
            const labelDestino=modoDestino==='avaliacao' ? 'Avaliação' : 'Evolução';
            actions.appendChild(criarBotao(labelDestino,'btn-primary',()=>abrirRegistroClinico(agendamento.paciente_id,modoDestino,agendamento.id)));
            if(clinica.registroHoje){const done=document.createElement('span');done.className='ks-fisio-record-done';done.textContent='Registro concluído';actions.appendChild(done);}
        }
        if(!paciente)row.classList.add('has-missing-record');
        row.append(time,content,actions);return row;
    }

    function montarLinhaLivre(intervalo){
        const row=document.createElement('article');row.className='ks-fisio-day-row is-free';
        const time=document.createElement('div');time.className='ks-fisio-day-time';
        const horario=document.createElement('strong');horario.textContent=minutosHoraHome(intervalo.inicio);
        const badge=document.createElement('span');badge.className='ks-fisio-day-status';badge.textContent='Livre';time.append(horario,badge);
        const content=document.createElement('div');content.className='ks-fisio-day-content';
        const nome=document.createElement('strong');nome.className='ks-fisio-day-patient-name';nome.textContent='Horário livre';
        const faixa=document.createElement('div');faixa.className='ks-fisio-day-category';faixa.textContent=`${minutosHoraHome(intervalo.inicio)}–${minutosHoraHome(intervalo.fim)}`;
        const detalhe=document.createElement('p');detalhe.className='ks-fisio-day-detail';detalhe.textContent='Disponível para novo agendamento';content.append(nome,faixa,detalhe);
        const actions=document.createElement('div');actions.className='ks-fisio-day-actions';row.append(time,content,actions);return row;
    }


    // Mantido como contrato de compatibilidade do Home. A janela de 4 horas é
    // cronológica; este helper não limita nem reordena os itens exibidos.
    function pontuacaoPrioridade(item){
        const classe=String(item?.situacao?.classe||'');
        if(classe==='is-current') return 0;
        if(classe==='is-waiting') return 1;
        if(classe==='is-rescheduled') return 2;
        if(classe==='is-upcoming') return 3;
        if(classe==='is-done') return 4;
        if(classe==='is-cancelled'||classe==='is-absence') return 5;
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

    async function resolverProfissionalHomeFisioterapeuta(perfilInicial){
        const perfil=perfilInicial || (typeof usuarioLogado!=='undefined' ? usuarioLogado : null);
        const perfilId=String(perfil?.id||'').trim();
        const clinicaId=String(perfil?.clinica_id||'').trim();
        if(!perfilId) return '';
        const {data:contexto,error}=await _supabase.rpc('kinesys_contexto_agenda');
        if(error) throw error;
        contextoAgendaHomeFisioterapeuta=contexto||null;
        if((typeof usuarioLogado!=='undefined'?usuarioLogado:null)!==perfilInicial) return '';
        if(String(contexto?.perfil_id||'')!==perfilId) throw new Error('A sessão mudou. Entre novamente.');
        if(clinicaId && String(contexto?.clinica_id||'')!==clinicaId) throw new Error('A clínica da sessão mudou. Entre novamente.');
        const profissionais=Array.isArray(contexto?.profissionais) ? contexto.profissionais : [];
        const proprio=profissionais.find(p=>String(p?.id||'')===perfilId && p?.aparece_na_agenda!==false);
        return String(proprio?.id||'');
    }

    async function carregarPainelFisioterapeutaUtil(){
        const card=document.getElementById('card_painel_fisioterapeuta');
        if(!card)return;
        const eh=perfilFisioterapeuta();card.hidden=!eh;if(!eh)return;
        prepararCabecalho(card,0);
        const resumo=document.getElementById('painel_fisio_resumo'),lista=document.getElementById('painel_fisio_lista');
        if(!resumo||!lista)return;
        lista.replaceChildren();resumo.textContent='Organizando as próximas 4 horas…';
        if(typeof _supabase==='undefined'||!_supabase){resumo.textContent='Não foi possível acessar sua agenda agora.';return;}

        const perfilInicial=typeof usuarioLogado!=='undefined'?usuarioLogado:null;
        let profissionalId='';
        try{profissionalId=await resolverProfissionalHomeFisioterapeuta(perfilInicial);}catch(_){
            if((typeof usuarioLogado!=='undefined'?usuarioLogado:null)===perfilInicial)resumo.textContent='Não foi possível verificar seu vínculo com a agenda.';return;
        }
        if((typeof usuarioLogado!=='undefined'?usuarioLogado:null)!==perfilInicial)return;
        if(!profissionalId){resumo.textContent='Vincule seu perfil a um profissional da agenda para ver o seu dia clínico.';return;}

        const agora=instanteHomeBrasilia(),hoje=agora.data,inicioJanela=agora.minutos,fimJanela=Math.min(24*60,inicioJanela+JANELA_HOME_MINUTOS);
        let consulta=await _supabase.from('agendamentos')
            .select('id,paciente_id,procedimento_id,hora_inicio,hora_fim,status,observacoes,pacientes(id,nome),procedimentos(nome,duracao_minutos)')
            .eq('data',hoje).eq('profissional_id',profissionalId).order('hora_inicio');
        if(consulta.error&&/procedimentos|hora_fim|observacoes|relationship|schema cache/i.test(String(consulta.error.message||''))){
            consulta=await _supabase.from('agendamentos')
                .select('id,paciente_id,procedimento_id,hora_inicio,hora_fim,status,observacoes,pacientes(id,nome)')
                .eq('data',hoje).eq('profissional_id',profissionalId).order('hora_inicio');
        }
        if(consulta.error){resumo.textContent='Não foi possível carregar seus atendimentos agora.';return;}

        const atendimentosHoje=consulta.data||[];
        const atendimentos=atendimentosHoje.filter(a=>{
            const inicio=horaMinutos(a.hora_inicio),fim=horaMinutos(a.hora_fim);
            if(!Number.isFinite(inicio))return false;
            const termino=Number.isFinite(fim)&&fim>inicio?fim:inicio+30;
            return termino>inicioJanela&&inicio<fimJanela;
        });
        let pacientes=[];try{pacientes=typeof obterPacientesSalvos==='function'?await obterPacientesSalvos():[];}catch(_){}
        const mapaPacientes=new Map((pacientes||[]).map(p=>[String(p.id||''),p]));
        const historico=await carregarHistoricoAgenda(atendimentos,hoje,profissionalId);
        let concluidos=0,registrosPendentes=0,emAtendimento=0;
        const itens=atendimentos.map(a=>{
            const status=String(a.status||'').toLowerCase();if(STATUS_CONCLUIDOS.has(status))concluidos++;
            const paciente=mapaPacientes.get(String(a.paciente_id||'')),seq=sequenciaDoAtendimento(a,historico,hoje);
            let clinica=contextoClinico(paciente,a,hoje,seq),situacao=situacaoTemporal(a,inicioJanela);
            if(situacao.classe==='is-current')emAtendimento++;
            if(status==='cancelado')clinica={...clinica,detalhe:'Atendimento cancelado · horário liberado'};
            else if(agendamentoEhReagendadoHome(a))clinica={...clinica,detalhe:'Atendimento remarcado para este horário'};
            else if(status==='em_recepcao')clinica={...clinica,detalhe:'Paciente em espera na recepção'};
            const registroPendente=STATUS_CONCLUIDOS.has(status)&&!clinica.registroHoje;
            if(registroPendente)registrosPendentes++;
            return {tipo:'atendimento',inicio:horaMinutos(a.hora_inicio),agendamento:a,paciente,nome:String(a.pacientes?.nome||paciente?.nome||'Paciente'),clinica,situacao,registroPendente};
        });
        const livres=intervalosLivresHome(hoje,profissionalId,inicioJanela,fimJanela,atendimentosHoje).map(x=>({tipo:'livre',inicio:x.inicio,intervalo:x}));
        const timeline=[...itens,...livres].sort((a,b)=>a.inicio-b.inicio||(a.tipo==='atendimento'?-1:1));
        prepararCabecalho(card,timeline.length);

        if(!timeline.length){
            resumo.textContent='Próximas 4 horas · sem atendimentos ou horários disponíveis na sua jornada.';
            const empty=document.createElement('div');empty.className='ks-fisio-painel-vazio';empty.textContent='Não há atividade clínica disponível nesta janela. Abra a Agenda para consultar outros horários.';lista.appendChild(empty);return;
        }
        timeline.forEach(item=>lista.appendChild(item.tipo==='livre'?montarLinhaLivre(item.intervalo):montarLinha(item)));
        const partes=['Próximas 4 horas',`${itens.length} atendimento(s)`,`${livres.length} horário(s) livre(s)`];
        if(emAtendimento)partes.push(`${emAtendimento} em atendimento`);
        if(concluidos)partes.push(`${concluidos} concluído(s)`);
        if(registrosPendentes)partes.push(`${registrosPendentes} registro(s) pendente(s)`);
        resumo.textContent=partes.join(' · ');
    }

    window.carregarPainelFisioterapeuta=carregarPainelFisioterapeutaUtil;
})();
