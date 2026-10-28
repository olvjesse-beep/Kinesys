'use strict';
/* ==========================================================================
   KineSys — Patient Registration Core 1.0.0
   Phase 4N: fluxo administrativo de cadastro extraído sem alteração de regra.
   A persistência (`salvarPacienteNaNuvem`) e lógica clínica permanecem no core.
   ========================================================================== */

let cadastroTelefoneSequencia = 0;
function adicionarTelefoneCadastro(valor = '') {
    const lista = document.getElementById('cad_telefones_lista');
    if (!lista) return;
    const linha = document.createElement('div'); linha.className = 'patient-registration-phone-row';
    const grupo = document.createElement('div'); grupo.className = 'input-group';
    const campo = document.createElement('input'); campo.id = 'cad_telefone_adicional_' + (++cadastroTelefoneSequencia);
    campo.type = 'tel'; campo.inputMode = 'tel'; campo.maxLength = 15; campo.autocomplete = 'tel'; campo.placeholder = '(00) 00000-0000'; campo.value = valor;
    campo.dataset.cadTelefone = '1';
    const label = document.createElement('label'); label.htmlFor = campo.id; label.textContent = 'Telefone adicional';
    const erro = document.createElement('small'); erro.id = campo.id + '_erro'; erro.className = 'field-error'; erro.setAttribute('role','alert'); campo.setAttribute('aria-describedby',erro.id);
    campo.addEventListener('input',()=>{campo.value=formatarTelefoneBR(campo.value);limparEstadoCampo(campo.id);});
    const remover = document.createElement('button'); remover.type = 'button'; remover.className = 'btn-secondary'; remover.textContent = 'Remover'; remover.setAttribute('aria-label','Remover telefone adicional');
    remover.addEventListener('click',()=>{linha.remove();document.getElementById('cad_adicionar_telefone')?.focus();});
    grupo.append(label,campo,erro); linha.append(grupo,remover); lista.appendChild(linha);
}
function preencherTelefonesCadastro(telefones = []) {
    const lista = document.getElementById('cad_telefones_lista'); if (!lista) return;
    lista.replaceChildren();
    (Array.isArray(telefones)?telefones:[]).forEach(telefone=>adicionarTelefoneCadastro(String(telefone)));
}
function telefonesAdicionaisCadastroValidos() {
    return [...document.querySelectorAll('#cad_telefones_lista input')].map(campo=>validarTelefoneInput(campo.id)).every(Boolean);
}
function lerTelefonesAdicionaisCadastro() {
    const principal=somenteDigitos(document.getElementById('cad_telefone')?.value||'');
    const vistos=new Set(principal?[principal]:[]);
    return [...document.querySelectorAll('#cad_telefones_lista input')].map(campo=>campo.value.trim()).filter(valor=>{const n=somenteDigitos(valor);if(!n||vistos.has(n))return false;vistos.add(n);return true;});
}
window.adicionarTelefoneCadastro=adicionarTelefoneCadastro;

async function salvarCadastroSomente(redirecionar = true) {
    const nome = document.getElementById('cad_nome').value.trim();
    if (!nome) {
        alert("O campo Nome Completo é obrigatório.", 'aviso');
        return null;
    }

    const cadastroValido = [
        validarCPFInput('cad_cpf'),
        validarCEPInput('cad_cep'),
        validarTelefoneInput('cad_telefone'),
        telefonesAdicionaisCadastroValidos(),
        validarResponsavelCadastro()
    ].every(Boolean);
    if (!cadastroValido) {
        const primeiroErro = document.querySelector('#tela_cadastro .input-group.has-error input');
        if (primeiroErro) primeiroErro.focus();
        alert('Corrija os campos destacados em vermelho antes de salvar o cadastro.', 'aviso');
        return null;
    }

    const cpfDigitado = document.getElementById('cad_cpf').value.trim();
    if (cpfDigitado && somenteDigitos(cpfDigitado).length > 0) {
        const listaAtual = await obterPacientesBasicos();
        const cpfConflito = listaAtual.find(p =>
            p.id !== pacienteAtualId &&
            p.cpf && somenteDigitos(p.cpf) === somenteDigitos(cpfDigitado)
        );
        if (cpfConflito) {
            alert(`Já existe um paciente cadastrado com este CPF: "${cpfConflito.nome}".\n\nAbra o prontuário dele na tela "Pacientes" para editar, em vez de criar um cadastro novo.`, 'aviso');
            return null;
        }
    }

    const idFinal = pacienteAtualId ? pacienteAtualId : "pac_" + Date.now();
    const timestampAgra = pacienteAtualId ? undefined : new Date().getTime();

    let pacienteExistente = {};
    if (pacienteAtualId) {
        pacienteExistente = await obterPacienteCompletoPorId(pacienteAtualId) || {};
    }

    const nomeResponsavel = usuarioLogado ? usuarioLogado.nome : "Desconhecido";

    const novoPaciente = {
        ...pacienteExistente,
        id: idFinal,
        dataCadastro: pacienteExistente.dataCadastro || new Date().toLocaleDateString('pt-BR'),
        cadastradoPor: pacienteExistente.cadastradoPor || nomeResponsavel,
        nome: nome,
        cpf: document.getElementById('cad_cpf').value.trim(),
        nascimento: document.getElementById('cad_nascimento').value,
        idade: document.getElementById('cad_idade').value,
        sexo: document.getElementById('cad_sexo').value,
        estadoCivil: document.getElementById('cad_estado_civil').value,
        telefone: document.getElementById('cad_telefone').value.trim(),
        telefones_adicionais: lerTelefonesAdicionaisCadastro(),
        observacoes_cadastro: document.getElementById('cad_observacoes')?.value.trim() || '',
        dependente: !!document.getElementById('cad_dependente')?.checked,
        responsavelNome: document.getElementById('cad_dependente')?.checked ? document.getElementById('cad_responsavel_nome')?.value.trim() || '' : '',
        responsavelParentesco: document.getElementById('cad_dependente')?.checked ? document.getElementById('cad_responsavel_parentesco')?.value || '' : '',
        responsavelTelefone: document.getElementById('cad_dependente')?.checked ? document.getElementById('cad_responsavel_telefone')?.value.trim() || '' : '',
        profissao: document.getElementById('cad_profissao').value.trim(),
        cep: document.getElementById('cad_cep').value.trim(),
        endereco: document.getElementById('cad_endereco').value.trim()
    };

    if (timestampAgra) novoPaciente.timestampCadastro = timestampAgra;
    if (!novoPaciente.evolucoes) novoPaciente.evolucoes = [];
    if (!novoPaciente.avaliacoes) novoPaciente.avaliacoes = [];

    const sucesso = await salvarPacienteNaNuvem(novoPaciente,{somenteCadastro:true});

    if (sucesso) {
        if (redirecionar) {
            alert(pacienteAtualId ? "Cadastro atualizado com sucesso!" : "Cadastro salvo na nuvem e disponível para avaliação!", 'sucesso');
            pacienteAtualId = null;

            ['cad_nome','cad_cpf','cad_nascimento','cad_idade','cad_sexo','cad_estado_civil','cad_telefone','cad_profissao','cad_responsavel_nome','cad_responsavel_parentesco','cad_responsavel_telefone','cad_cep','cad_endereco'].forEach(id => {
                if(document.getElementById(id)) document.getElementById(id).value = "";
            });
            const chkDependente = document.getElementById('cad_dependente');
            if (chkDependente) chkDependente.checked = false;
            alternarCamposResponsavel();
            preencherTelefonesCadastro();
            if(document.getElementById('cad_observacoes'))document.getElementById('cad_observacoes').value='';
            ['cad_cpf','cad_cep','cad_telefone','cad_responsavel_nome','cad_responsavel_telefone'].forEach(limparEstadoCampo);
            definirStatusCEP('', '');
            definirUltimoCEPPesquisadoKineSys('');
            const cadEndereco = document.getElementById('cad_endereco');
            if (cadEndereco) { delete cadEndereco.dataset.preenchidoPorCep; delete cadEndereco.dataset.cepBase; }
            if(document.getElementById('titulo_tela_cadastro')) document.getElementById('titulo_tela_cadastro').innerText = "Cadastro Geral do Paciente";

            navegarPara('tela_home');
        }
        return novoPaciente;
    }
    return null;
}

async function salvarEIniciarAvaliacao() {
    // Proteção de rota: se um perfil administrativo disparar este fluxo por
    // teclado, HTML antigo em cache ou qualquer outro caminho residual, salva
    // normalmente e retorna ao fluxo permitido — sem tentar abrir Avaliação e
    // sem gerar o pop-up de acesso negado após o cadastro.
    if (!telaPermitida('tela_avaliacao')) {
        return await salvarCadastroSomente(true);
    }

    const paciente = await salvarCadastroSomente(false);
    if (paciente) {
        window.iniciarContextoAvaliacaoKineSys?.(paciente.id);
        pacienteAtualId = paciente.id;
        const contextoCarga=window.obterContextoAvaliacaoKineSys?JSON.stringify(window.obterContextoAvaliacaoKineSys()):null;
        const navegacao = await navegarPara('tela_avaliacao', true);
        if (navegacao === false || contextoCarga&&!window.contextoAvaliacaoContinuaKineSys(contextoCarga)) return null;
        limparClinicaEstruturada();

        document.getElementById('paciente_nome').value = paciente.nome;
        if (paciente.idade) document.getElementById('paciente_idade').value = paciente.idade.replace(' anos', '').trim();
        if (paciente.profissao) document.getElementById('paciente_ocupacao').value = paciente.profissao;
        processarRadarEmTempoReal();
    }
}

async function editarCadastro(id) {
    const lista = await obterPacientesBasicos();
    const p = lista.find(item => item.id === id);
    if (!p) return;

    pacienteAtualId = p.id;
    document.getElementById('tela_cadastro').dataset.editandoPaciente=String(p.id);
    const cancelar=document.getElementById('cad_cancelar_edicao');if(cancelar)cancelar.hidden=false;

    document.getElementById('titulo_tela_cadastro').innerText = "Editar Cadastro do Paciente";

    document.getElementById('cad_nome').value = p.nome || "";
    document.getElementById('cad_cpf').value = p.cpf || "";
    document.getElementById('cad_nascimento').value = p.nascimento || "";
    document.getElementById('cad_idade').value = p.idade || "";
    document.getElementById('cad_sexo').value = p.sexo || "";
    document.getElementById('cad_estado_civil').value = p.estadoCivil || "";
    document.getElementById('cad_telefone').value = p.telefone || "";
    preencherTelefonesCadastro(p.telefones_adicionais);
    if(document.getElementById('cad_observacoes'))document.getElementById('cad_observacoes').value=p.observacoes_cadastro||'';
    document.getElementById('cad_profissao').value = p.profissao || "";
    const chkDependente = document.getElementById('cad_dependente');
    if (chkDependente) chkDependente.checked = pacienteEhDependente(p);
    document.getElementById('cad_responsavel_nome').value = p.responsavelNome || p.responsavel_nome || "";
    document.getElementById('cad_responsavel_parentesco').value = p.responsavelParentesco || p.responsavel_parentesco || "";
    document.getElementById('cad_responsavel_telefone').value = p.responsavelTelefone || p.responsavel_telefone || "";
    document.getElementById('cad_cep').value = p.cep || "";
    document.getElementById('cad_endereco').value = p.endereco || "";
    definirStatusCEP('', '');
    definirUltimoCEPPesquisadoKineSys(p.cep || '');

    await navegarPara('tela_cadastro', true);
    alternarCamposResponsavel();
    atualizarAcoesCadastroPorPerfil();
}

async function cancelarEdicaoCadastro(){
    const tela=document.getElementById('tela_cadastro'),id=tela?.dataset.editandoPaciente||'';
    if(tela)delete tela.dataset.editandoPaciente;
    const cancelar=document.getElementById('cad_cancelar_edicao');if(cancelar)cancelar.hidden=true;
    if(id&&typeof window.definirPacienteContexto==='function')await window.definirPacienteContexto(id);
    if(id&&typeof window.abrirPacienteNaTela==='function')return window.abrirPacienteNaTela('tela_buscar');
    await navegarPara('tela_buscar');
}
window.cancelarEdicaoCadastro=cancelarEdicaoCadastro;

// APIs históricas preservadas para HTML e módulos existentes.
window.salvarCadastroSomente = salvarCadastroSomente;
window.salvarEIniciarAvaliacao = salvarEIniciarAvaliacao;
window.editarCadastro = editarCadastro;
