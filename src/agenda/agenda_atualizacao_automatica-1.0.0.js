/* ==========================================================================
   KineSys — Atualização automática da Agenda e do Meu dia 1.0.0
   Objetivo: o que a recepção altera (chegada, confirmação, falta, novo
   agendamento, cancelamento) aparece sozinho para o profissional e para a
   administração, sem sobrecarregar o sistema.

   Regras de economia:
   - Só trabalha com a tela aberta (Agenda ou Início/Meu dia), aba do
     navegador visível e conexão online.
   - Agenda: a cada 45s lê a semana pela MESMA consulta canônica da Agenda
     (carregarAgendamentosSemana, mesmo escopo/filtro) e só redesenha se algo
     mudou. Sem mudança, não toca na tela.
   - Meu dia: a cada 60s consulta mínima (id, status, horários) do dia do
     profissional; só recarrega o Meu dia se algo mudou.
   - Não atualiza com janela/diálogo aberto, campo em edição, gravação em
     curso, agendamentos locais pendentes ou consulta já em andamento.
   - Falha: espera cada vez mais (60s, 120s, 300s) e avisa na Agenda a hora
     da última atualização. Nunca troca a grade por erro.
   ========================================================================== */
(function(root){
    'use strict';
    const doc=root.document;
    const INTERVALO={agenda:45000,meuDia:60000};
    const ESPERA_FALHA=[60000,120000,300000];
    const MIN_APOS_VOLTAR=30000;
    const TICK=15000;

    const estado={
        agenda:{ultimo:0,proximo:0,falhas:0,emCurso:false,consultas:0,redesenhos:0,ultimoSucesso:0,assinaturaRedesenhada:''},
        meuDia:{ultimo:0,proximo:0,falhas:0,emCurso:false,consultas:0,redesenhos:0}
    };

    // Acesso às variáveis globais da Agenda (módulo carregado sob demanda). Variáveis
    // declaradas com let/const no escopo global não viram propriedades de window,
    // por isso cada uma é lida pelo nome, protegida por typeof.
    const LEITORES={
        usuarioLogado:()=>typeof usuarioLogado!=='undefined'?usuarioLogado:undefined,
        agendaDataSelecionada:()=>typeof agendaDataSelecionada!=='undefined'?agendaDataSelecionada:undefined,
        agendaAgendamentosSemanaCache:()=>typeof agendaAgendamentosSemanaCache!=='undefined'?agendaAgendamentosSemanaCache:undefined,
        agendaRevisaoVisual:()=>typeof agendaRevisaoVisual!=='undefined'?agendaRevisaoVisual:undefined,
        KINESYS_OPERACOES_EM_CURSO:()=>typeof KINESYS_OPERACOES_EM_CURSO!=='undefined'?KINESYS_OPERACOES_EM_CURSO:undefined
    };
    function g(nome){
        try{
            if(LEITORES[nome])return LEITORES[nome]();
            return root[nome];
        }catch(_){return undefined;}
    }

    function telaAtiva(id){const t=doc.getElementById(id);return !!(t&&t.classList.contains('ativa'));}
    function visivel(){return doc.visibilityState===undefined||doc.visibilityState==='visible';}
    function online(){return !root.navigator||root.navigator.onLine!==false;}
    function escopo(){const u=g('usuarioLogado');return u?String(u.id||'')+'|'+String(u.clinica_id||''):'';}

    function modalAberto(){
        if(doc.querySelector('dialog[open]'))return true;
        for(const m of doc.querySelectorAll('.modal-overlay')){
            if(m.hidden)continue;
            const cs=root.getComputedStyle?root.getComputedStyle(m):null;
            if(cs&&cs.display!=='none'&&cs.visibility!=='hidden')return true;
        }
        return false;
    }
    function editandoEm(seletor){
        const a=doc.activeElement;
        return !!(a&&a.closest&&a.closest(seletor)&&/^(INPUT|SELECT|TEXTAREA)$/.test(a.tagName)&&a.type!=='button');
    }
    function operacaoEmCurso(){const ops=g('KINESYS_OPERACOES_EM_CURSO');return !!(ops&&ops.size);}

    // ---------- Agenda ----------
    function motivoParaNaoAtualizarAgenda(){
        if(!telaAtiva('tela_agenda'))return 'inativa';
        if(!visivel())return 'oculta';
        if(!online())return 'offline';
        if(estado.agenda.emCurso)return 'em-curso';
        if(['carregarAgendamentosSemana','renderizarPainelAgenda','inicioSemanaAgenda','somarDiasAgenda'].some(n=>typeof g(n)!=='function'))return 'agenda-nao-carregada';
        const grade=doc.getElementById('agenda_semana_grade');
        if(!grade)return 'sem-grade';
        if(grade.dataset.mobileConsulta==='pendente')return 'consultando';
        if(modalAberto())return 'modal';
        if(editandoEm('#tela_agenda'))return 'editando';
        if(operacaoEmCurso())return 'gravando';
        const pend=g('lerAgendamentosPendentesSync');
        try{if(typeof pend==='function'&&pend().length)return 'pendentes-locais';}catch(_){ }
        return '';
    }

    function escopoProfissionalAgenda(){
        const podeVer=g('usuarioPodeVerAgendaClinicaToda'),proprio=g('profissionalAgendaRestritoAtualId');
        const todos=typeof podeVer==='function'?!!podeVer():true;
        if(todos)return {ok:true,filtro:(doc.getElementById('agenda_filtro_profissional')||{}).value||''};
        const id=typeof proprio==='function'?proprio():'';
        return id?{ok:true,filtro:id}:{ok:false,filtro:''};
    }

    // Assinatura com os campos do próprio registro (os nomes vêm das junções).
    function assinaturaAgenda(lista,chaves){
        return (lista||[]).map(a=>chaves.map(k=>{const v=a&&a[k];return v===null||v===undefined?'':String(v);}).join('\u0001')
            +'\u0001'+((a&&a.pacientes&&a.pacientes.nome)||'')+'\u0001'+((a&&a.procedimentos&&a.procedimentos.nome)||'')+'\u0001'+((a&&a.equipe&&a.equipe.nome)||''))
            .sort().join('\u0002');
    }
    function chavesPrimitivas(lista){
        const s=new Set();
        (lista||[]).forEach(a=>Object.keys(a||{}).forEach(k=>{const v=a[k];if(v===null||typeof v!=='object')s.add(k);}));
        return Array.from(s).sort();
    }

    function guardarRolagem(){
        const grade=doc.getElementById('agenda_semana_grade');const lista=[];
        for(let el=grade;el&&el!==doc.body;el=el.parentElement){if(el.scrollTop||el.scrollLeft)lista.push([el,el.scrollTop,el.scrollLeft]);}
        return {lista,x:root.scrollX||0,y:root.scrollY||0};
    }
    function restaurarRolagem(r){
        try{r.lista.forEach(([el,t,l])=>{if(el.isConnected){el.scrollTop=t;el.scrollLeft=l;}});if(root.scrollTo)root.scrollTo(r.x,r.y);}catch(_){ }
    }

    function horaCurta(ms){try{return new Date(ms).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});}catch(_){return '';}}

    async function verificarAgenda(){
        const motivo=motivoParaNaoAtualizarAgenda();
        if(motivo)return {verificado:false,motivo};
        const esc=escopoProfissionalAgenda();
        if(!esc.ok)return {verificado:false,motivo:'sem-escopo'};
        const st=estado.agenda;
        st.emCurso=true;st.ultimo=Date.now();
        const identidade=escopo(),revisao=g('agendaRevisaoVisual');
        try{
            const dataSel=g('agendaDataSelecionada')||new Date();
            const inicio=g('inicioSemanaAgenda')(dataSel),fim=g('somarDiasAgenda')(inicio,6);
            st.consultas++;
            const r=await g('carregarAgendamentosSemana')(inicio,fim,esc.filtro);
            if(r&&r.error)throw r.error;
            if(r&&r.somenteLocal)throw new Error('sem conexão com o servidor');
            // O usuário navegou, trocou filtro/perfil ou outra carga começou: descarta.
            if(identidade!==escopo()||revisao!==g('agendaRevisaoVisual'))return {verificado:false,motivo:'contexto-mudou'};
            const recuperou=st.falhas>=2;
            st.falhas=0;st.ultimoSucesso=Date.now();
            const novos=(r&&r.data)||[];
            const chaves=chavesPrimitivas(novos);
            const aNovo=assinaturaAgenda(novos,chaves);
            const aTela=assinaturaAgenda(g('agendaAgendamentosSemanaCache')||[],chaves);
            const mudou=aNovo!==aTela;
            // Proteção: se a tela já foi redesenhada com estes mesmos dados, não repete.
            if((mudou&&aNovo!==st.assinaturaRedesenhada)||recuperou){
                if(motivoParaNaoAtualizarAgenda()==='modal'||editandoEm('#tela_agenda'))return {verificado:true,mudou,adiado:true};
                const rol=guardarRolagem();
                st.redesenhos++;st.assinaturaRedesenhada=aNovo;
                await g('renderizarPainelAgenda')({pularSync:true});
                restaurarRolagem(rol);
                return {verificado:true,mudou:true};
            }
            return {verificado:true,mudou:false};
        }catch(err){
            st.falhas++;
            if(st.falhas>=2){
                const fb=g('mostrarFeedbackAgenda');
                const desde=st.ultimoSucesso?' desde '+horaCurta(st.ultimoSucesso):'';
                if(typeof fb==='function')fb('Sem conexão com o servidor: a agenda está sem atualização automática'+desde+'. Nova tentativa em instantes.','aviso');
            }
            return {verificado:false,motivo:'falha',erro:err};
        }finally{
            st.emCurso=false;
            st.proximo=Date.now()+(st.falhas?ESPERA_FALHA[Math.min(st.falhas-1,ESPERA_FALHA.length-1)]:INTERVALO.agenda);
        }
    }

    // ---------- Meu dia ----------
    function motivoParaNaoAtualizarMeuDia(){
        if(!telaAtiva('tela_home'))return 'inativa';
        if(!visivel())return 'oculta';
        if(!online())return 'offline';
        if(estado.meuDia.emCurso)return 'em-curso';
        const card=doc.getElementById('card_painel_fisioterapeuta');
        if(!card||card.hidden)return 'sem-meu-dia';
        const api=root.KineSysMeuDiaClinico;
        if(!api||typeof api.verificarMudanca!=='function')return 'sem-api';
        if(modalAberto())return 'modal';
        if(editandoEm('#tela_home'))return 'editando';
        if(operacaoEmCurso())return 'gravando';
        return '';
    }

    async function verificarMeuDia(){
        const motivo=motivoParaNaoAtualizarMeuDia();
        if(motivo)return {verificado:false,motivo};
        const st=estado.meuDia;
        st.emCurso=true;st.ultimo=Date.now();
        try{
            st.consultas++;
            const r=await root.KineSysMeuDiaClinico.verificarMudanca();
            st.falhas=0;
            if(r&&r.mudou)st.redesenhos++;
            return r||{verificado:false};
        }catch(err){
            st.falhas++;
            return {verificado:false,motivo:'falha',erro:err};
        }finally{
            st.emCurso=false;
            st.proximo=Date.now()+(st.falhas?ESPERA_FALHA[Math.min(st.falhas-1,ESPERA_FALHA.length-1)]:INTERVALO.meuDia);
        }
    }

    // ---------- Relógio único e leve ----------
    function tick(){
        const agora=Date.now();
        if(telaAtiva('tela_agenda')&&agora>=estado.agenda.proximo)verificarAgenda().catch(()=>{});
        if(telaAtiva('tela_home')&&agora>=estado.meuDia.proximo)verificarMeuDia().catch(()=>{});
    }
    // Ao voltar para a aba/janela: verifica logo, se a última verificação já tem 30s.
    function aoVoltar(){
        if(!visivel())return;
        const agora=Date.now();
        ['agenda','meuDia'].forEach(k=>{if(agora-estado[k].ultimo>=MIN_APOS_VOLTAR)estado[k].proximo=Math.min(estado[k].proximo,agora);});
        tick();
    }
    // Ao entrar na tela, a própria tela carrega os dados: a 1ª verificação fica para depois.
    function aoAtivarTela(ev){
        const id=ev&&ev.detail&&ev.detail.id;const agora=Date.now();
        if(id==='tela_agenda'){estado.agenda.proximo=agora+INTERVALO.agenda;estado.agenda.assinaturaRedesenhada='';}
        if(id==='tela_home')estado.meuDia.proximo=agora+INTERVALO.meuDia;
    }

    let timer=null;
    function iniciar(){
        if(timer)return;
        const agora=Date.now();
        estado.agenda.proximo=agora+INTERVALO.agenda;estado.meuDia.proximo=agora+INTERVALO.meuDia;
        timer=root.setInterval(()=>{if(visivel())tick();},TICK);
        doc.addEventListener('visibilitychange',aoVoltar);
        root.addEventListener('focus',aoVoltar);
        root.addEventListener('online',aoVoltar);
        doc.addEventListener('kinesys:tela-ativada',aoAtivarTela);
    }

    root.KineSysAtualizacaoAutomatica=Object.freeze({
        version:'1.0.0',
        verificarAgenda,verificarMeuDia,
        status(){return JSON.parse(JSON.stringify(estado));},
        _tick:tick,_estado:estado,_intervalo:INTERVALO
    });

    if(doc.readyState==='loading')doc.addEventListener('DOMContentLoaded',iniciar);else iniciar();
})(typeof window!=='undefined'?window:globalThis);
