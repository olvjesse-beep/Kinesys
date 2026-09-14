/* KineSys — Agenda Professional Picker 1.0.0 / r42
 * Interação mobile para escolher o escopo profissional da Agenda.
 * Reutiliza o filtro #agenda_filtro_profissional já populado pelo módulo oficial.
 */
(function instalarAgendaProfessionalPicker(){
    'use strict';

    const VERSION='1.0.0-r42';
    const OVERLAY_ID='agenda_profissional_picker_overlay';
    const LIST_ID='agenda_profissional_picker_lista';
    let elementoFocoAnterior=null;

    const selecionarVisaoAgendaOriginal=window.selecionarVisaoAgenda;
    if(typeof selecionarVisaoAgendaOriginal!=='function')return;

    function modoMobile(){
        return !!window.matchMedia?.('(max-width: 760px)').matches;
    }

    function podeVerClinicaToda(){
        try{return typeof usuarioPodeVerAgendaClinicaToda==='function'&&!!usuarioPodeVerAgendaClinicaToda();}
        catch(_){return false;}
    }

    function filtroProfissional(){
        return document.getElementById('agenda_filtro_profissional');
    }

    function opcoesProfissionais(){
        const filtro=filtroProfissional();
        if(!filtro)return [];
        const opcoes=Array.from(filtro.options||[]).map(option=>({
            id:String(option.value||''),
            nome:String(option.textContent||'').trim(),
            disabled:!!option.disabled
        })).filter(item=>!item.disabled);
        const profissionais=opcoes.filter(item=>item.id);
        return [{id:'',nome:'Todos os profissionais',todos:true},...profissionais];
    }

    function fecharSeletorProfissionalAgenda(){
        const overlay=document.getElementById(OVERLAY_ID);
        if(!overlay||overlay.hidden)return false;
        overlay.hidden=true;
        document.body.classList.remove('ks-agenda-prof-picker-open');
        const alvo=elementoFocoAnterior;
        elementoFocoAnterior=null;
        requestAnimationFrame(()=>alvo?.focus?.());
        return true;
    }

    function criarOpcaoProfissional(item,selecionado){
        const botao=document.createElement('button');
        botao.type='button';
        botao.className='ks-agenda-prof-picker-option';
        botao.dataset.profissionalId=item.id;
        botao.setAttribute('aria-pressed',String(selecionado));

        const texto=document.createElement('span');
        texto.className='ks-agenda-prof-picker-option-text';
        texto.textContent=item.nome||'Profissional';

        const marcador=document.createElement('span');
        marcador.className='ks-agenda-prof-picker-check';
        marcador.setAttribute('aria-hidden','true');
        marcador.textContent=selecionado?'✓':'';

        botao.append(texto,marcador);
        botao.addEventListener('click',()=>selecionarProfissionalAgendaNoCard(item.id));
        return botao;
    }

    function renderizarListaProfissionais(){
        const lista=document.getElementById(LIST_ID);
        const filtro=filtroProfissional();
        if(!lista||!filtro)return false;
        const atual=String(filtro.value||'');
        const opcoes=opcoesProfissionais();
        lista.replaceChildren();

        if(opcoes.length<=1){
            const vazio=document.createElement('div');
            vazio.className='ks-agenda-prof-picker-empty';
            vazio.textContent='Nenhum profissional habilitado para aparecer na Agenda.';
            lista.appendChild(vazio);
            return false;
        }

        opcoes.forEach(item=>lista.appendChild(criarOpcaoProfissional(item,item.id===atual)));
        return true;
    }

    function garantirSeletorProfissionalAgenda(){
        let overlay=document.getElementById(OVERLAY_ID);
        if(overlay)return overlay;

        overlay=document.createElement('div');
        overlay.id=OVERLAY_ID;
        overlay.className='ks-agenda-prof-picker-overlay';
        overlay.hidden=true;
        overlay.setAttribute('aria-hidden','false');

        const card=document.createElement('div');
        card.className='ks-agenda-prof-picker-card';
        card.setAttribute('role','dialog');
        card.setAttribute('aria-modal','true');
        card.setAttribute('aria-labelledby','agenda_profissional_picker_titulo');

        const cabecalho=document.createElement('div');
        cabecalho.className='ks-agenda-prof-picker-head';

        const blocoTitulo=document.createElement('div');
        const titulo=document.createElement('h3');
        titulo.id='agenda_profissional_picker_titulo';
        titulo.textContent='Selecionar profissional';
        const subtitulo=document.createElement('p');
        subtitulo.textContent='Escolha quem deseja visualizar na Agenda.';
        blocoTitulo.append(titulo,subtitulo);

        const fechar=document.createElement('button');
        fechar.type='button';
        fechar.className='ks-agenda-prof-picker-close';
        fechar.setAttribute('aria-label','Fechar seleção de profissional');
        fechar.textContent='×';
        fechar.addEventListener('click',fecharSeletorProfissionalAgenda);

        cabecalho.append(blocoTitulo,fechar);

        const lista=document.createElement('div');
        lista.id=LIST_ID;
        lista.className='ks-agenda-prof-picker-list';
        lista.setAttribute('role','group');
        lista.setAttribute('aria-label','Profissionais da clínica');

        card.append(cabecalho,lista);
        overlay.appendChild(card);
        overlay.addEventListener('click',event=>{
            if(event.target===overlay)fecharSeletorProfissionalAgenda();
        });
        document.body.appendChild(overlay);
        return overlay;
    }

    function abrirSeletorProfissionalAgenda(){
        if(!podeVerClinicaToda())return selecionarVisaoAgendaOriginal.call(window,'profissional');
        const overlay=garantirSeletorProfissionalAgenda();
        elementoFocoAnterior=document.activeElement instanceof HTMLElement?document.activeElement:null;
        renderizarListaProfissionais();
        overlay.hidden=false;
        document.body.classList.add('ks-agenda-prof-picker-open');
        requestAnimationFrame(()=>{
            const atual=overlay.querySelector('.ks-agenda-prof-picker-option[aria-pressed="true"]');
            const primeiro=overlay.querySelector('.ks-agenda-prof-picker-option');
            (atual||primeiro)?.focus?.();
        });
        return true;
    }

    async function selecionarProfissionalAgendaNoCard(id=''){
        const filtro=filtroProfissional();
        if(!filtro)return false;
        const alvo=String(id||'');
        const existe=alvo===''||Array.from(filtro.options||[]).some(option=>String(option.value||'')===alvo);
        if(!existe)return false;

        filtro.value=alvo;
        try{
            if(alvo&&typeof agendaUltimoProfissional!=='undefined')agendaUltimoProfissional=alvo;
        }catch(_){}
        fecharSeletorProfissionalAgenda();

        if(typeof atualizarIndicadorEscopoAgenda==='function')atualizarIndicadorEscopoAgenda();
        if(typeof renderizarPainelAgenda==='function')await renderizarPainelAgenda();
        return true;
    }

    function aoTeclar(event){
        if(event.key==='Escape'&&!document.getElementById(OVERLAY_ID)?.hidden)fecharSeletorProfissionalAgenda();
    }

    window.selecionarVisaoAgenda=async function selecionarVisaoAgendaComPicker(modo){
        if(modo==='profissional'&&modoMobile()&&podeVerClinicaToda())return abrirSeletorProfissionalAgenda();
        return selecionarVisaoAgendaOriginal.apply(this,arguments);
    };
    window.selecionarVisaoAgenda.__kinesysProfessionalPicker=true;
    window.abrirSeletorProfissionalAgenda=abrirSeletorProfissionalAgenda;
    window.fecharSeletorProfissionalAgenda=fecharSeletorProfissionalAgenda;
    window.selecionarProfissionalAgendaNoCard=selecionarProfissionalAgendaNoCard;

    document.addEventListener('keydown',aoTeclar);

    window.KineSysAgendaProfessionalPicker=Object.freeze({
        version:VERSION,
        open:abrirSeletorProfissionalAgenda,
        close:fecharSeletorProfissionalAgenda,
        select:selecionarProfissionalAgendaNoCard
    });
})();
