'use strict';
/* ==========================================================================
   KineSys — Patient Form Helpers Core 1.0.0-r47
   Helpers de formulário + organização visual do cadastro de pacientes.
   Não acessa Supabase, rede ou persistência e preserva IDs/contratos existentes.
   ========================================================================== */

/* ================= 3. IDADE E FILTRO DE 2 HORAS ================= */
function calcularIdadeCadastro() {
    const campoData = document.getElementById('cad_nascimento');
    const campoIdade = document.getElementById('cad_idade');
    if (!campoData || !campoIdade) return;

    const dataNasc = campoData.value;
    if (!dataNasc) { campoIdade.value = ""; return; }

    const hoje = new Date();
    const nasc = new Date(dataNasc);
    let idade = hoje.getFullYear() - nasc.getFullYear();
    const m = hoje.getMonth() - nasc.getMonth();

    if (m < 0 || (m === 0 && hoje.getDate() < nasc.getDate())) idade--;
    campoIdade.value = idade >= 0 ? idade + " anos" : "";

    // Menores de 18 anos entram automaticamente como dependentes.
    // Adultos continuam podendo ser marcados manualmente como dependentes/cuidadores.
    const chkDependente = document.getElementById('cad_dependente');
    if (chkDependente && idade >= 0 && idade < 18) {
        chkDependente.checked = true;
        if (typeof alternarCamposResponsavel === 'function') alternarCamposResponsavel();
    }
}

function removerAcentos(str) {
    if (!str) return "";
    return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function obterTextoExibicao(item) {
    if (!item) return "";
    return typeof item === 'object' && item.exibicao ? item.exibicao : item;
}

/* ================= CADASTRO DE PACIENTE — CAMADA VISUAL R47 ================= */
(function prepararCadastroPacienteCleanKineSys(){
    const STYLE_ID='ks_patient_registration_clean_style';
    const STYLE_SRC='styles/patient_registration_clean-1.0.0.css?v=20260914-r47';

    function garantirEstilo(){
        if(document.getElementById(STYLE_ID))return;
        const link=document.createElement('link');
        link.id=STYLE_ID;
        link.rel='stylesheet';
        link.href=STYLE_SRC;
        document.head.appendChild(link);
    }

    function grupoDoCampo(id){
        const campo=document.getElementById(id);
        return campo?.closest('.input-group')||null;
    }

    function cabecalhoSecao(indice,titulo,descricao){
        const head=document.createElement('div');
        head.className='patient-registration-section-head';
        head.innerHTML='<span class="patient-registration-step">'+indice+'</span><div><h3>'+titulo+'</h3><p>'+descricao+'</p></div>';
        return head;
    }

    function criarSecao(indice,titulo,descricao,classeExtra=''){
        const secao=document.createElement('section');
        secao.className='patient-registration-section '+classeExtra;
        secao.appendChild(cabecalhoSecao(indice,titulo,descricao));
        const campos=document.createElement('div');
        campos.className='patient-registration-fields';
        secao.appendChild(campos);
        return {secao,campos};
    }

    function criarDisclosure(titulo,descricao,classeExtra=''){
        const details=document.createElement('details');
        details.className='patient-registration-disclosure '+classeExtra;
        const summary=document.createElement('summary');
        summary.innerHTML='<div><div class="patient-registration-disclosure-title">'+titulo+'</div><div class="patient-registration-disclosure-copy">'+descricao+'</div></div>';
        const body=document.createElement('div');
        body.className='patient-registration-disclosure-body';
        const campos=document.createElement('div');
        campos.className='patient-registration-fields';
        body.appendChild(campos);
        details.append(summary,body);
        return {details,campos};
    }

    function abrirSecoesAoEditar(titulo,complementares,endereco){
        const atualizar=()=>{
            const editando=/editar/i.test(titulo?.textContent||'');
            if(editando){
                complementares.open=true;
                endereco.open=true;
            }
        };
        atualizar();
        if(titulo&&typeof MutationObserver!=='undefined'){
            new MutationObserver(atualizar).observe(titulo,{childList:true,subtree:true,characterData:true});
        }
    }

    function organizar(){
        const tela=document.getElementById('tela_cadastro');
        if(!tela||tela.dataset.patientCleanReady==='1')return;
        const card=tela.querySelector('.card');
        if(!card)return;
        const rootGrid=Array.from(card.children).find(el=>el.classList?.contains('grid-2'));
        const actions=Array.from(card.children).find(el=>el.classList?.contains('actions'));
        const titulo=document.getElementById('titulo_tela_cadastro');
        if(!rootGrid||!actions||!titulo)return;

        tela.dataset.patientCleanReady='1';
        card.classList.add('patient-registration-card');

        const header=titulo.closest('.card-header');
        header?.classList.add('patient-registration-header');
        if(header&&!header.querySelector('.patient-registration-subtitle')){
            const subtitulo=document.createElement('p');
            subtitulo.className='patient-registration-subtitle';
            subtitulo.textContent='Comece pelos dados essenciais. Informações complementares e endereço ficam organizados abaixo para reduzir a carga visual.';
            titulo.insertAdjacentElement('afterend',subtitulo);
        }

        const essenciais=criarSecao('1','Dados essenciais','Identificação e contato principal do paciente.','patient-registration-essential');
        const nome=grupoDoCampo('cad_nome');
        const telefone=grupoDoCampo('cad_telefone');
        const nascimento=document.getElementById('cad_nascimento')?.closest('.grid-2')||grupoDoCampo('cad_nascimento');
        const cpf=grupoDoCampo('cad_cpf');
        nome?.classList.add('patient-registration-wide');
        [nome,telefone,nascimento,cpf].forEach(no=>{if(no)essenciais.campos.appendChild(no);});

        const responsavel=criarSecao('2','Responsável e contato','Ative somente para menores de idade ou pacientes que dependem de outra pessoa para contato.','patient-registration-responsible');
        const toggle=grupoDoCampo('cad_dependente');
        const blocoResponsavel=document.getElementById('cad_responsavel_bloco');
        if(toggle)responsavel.campos.appendChild(toggle);
        if(blocoResponsavel)responsavel.campos.appendChild(blocoResponsavel);
        responsavel.campos.classList.add('patient-registration-fields--responsible');

        const complementares=criarDisclosure('Informações complementares','Sexo, estado civil e profissão — preencha quando forem úteis ao cadastro.','patient-registration-complementary');
        [grupoDoCampo('cad_sexo'),grupoDoCampo('cad_estado_civil'),grupoDoCampo('cad_profissao')].forEach(no=>{if(no)complementares.campos.appendChild(no);});

        const endereco=criarDisclosure('Endereço','Busque pelo CEP e complete número e complemento quando necessário.','patient-registration-address');
        const cep=grupoDoCampo('cad_cep');
        const enderecoCompleto=grupoDoCampo('cad_endereco');
        if(cep)endereco.campos.appendChild(cep);
        if(enderecoCompleto)endereco.campos.appendChild(enderecoCompleto);

        rootGrid.replaceChildren(essenciais.secao,responsavel.secao,complementares.details,endereco.details);
        rootGrid.className='patient-registration-layout';

        actions.classList.add('patient-registration-actions');
        document.getElementById('cad_nome')?.setAttribute('aria-required','true');
        document.getElementById('cad_nome')?.setAttribute('autocomplete','name');
        document.getElementById('cad_telefone')?.setAttribute('autocomplete','tel');
        document.getElementById('cad_nascimento')?.setAttribute('autocomplete','bday');
        document.getElementById('cad_endereco')?.setAttribute('autocomplete','street-address');

        abrirSecoesAoEditar(titulo,complementares.details,endereco.details);
    }

    garantirEstilo();
    if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',organizar,{once:true});
    else organizar();

    document.addEventListener('kinesys:tela-ativada',event=>{
        if(event?.detail?.id==='tela_cadastro')organizar();
    });
})();
