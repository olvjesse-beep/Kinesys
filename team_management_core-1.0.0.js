'use strict';
/* ==========================================================================
   KineSys — Team Management Core 1.0.0
   Phase 4O: gestão administrativa da equipe extraída sem alteração de regra.
   Autorização, Supabase, validações e controladores de acesso permanecem os mesmos.
   ========================================================================== */

/* ================= 4. GESTÃO DE EQUIPE ================= */
function perfilPorConselho(tipoRegistro) {
    // Compatibilidade com cadastros antigos. O nível de acesso agora é separado
    // da profissão/registro, mas esta função continua sendo usada como sugestão padrão.
    if (tipoRegistro === 'MASTER' || tipoRegistro === 'MASTER_FEM') return 'MASTER';
    if (tipoRegistro === 'SECRETARIA') return 'SECRETARIA';
    if (tipoRegistro === 'CREFITO') return 'FISIOTERAPEUTA';
    if (tipoRegistro === 'CRM') return 'MEDICO';
    if (tipoRegistro === 'CREF') return 'EDUCADOR_FISICO';
    return 'SECRETARIA';
}

function normalizarNivelAcessoEquipe(tipo) {
    const t = String(tipo || '').toUpperCase();
    if (['MASTER','MASTER_FEM'].includes(t)) return 'MASTER';
    if (t === 'PROFISSIONAL') return 'FISIOTERAPEUTA';
    if (['FISIOTERAPEUTA','SECRETARIA','MEDICO','NUTRICIONISTA','PSICOLOGO','EDUCADOR_FISICO'].includes(t)) return t;
    return 'SECRETARIA';
}

function conselhoFuncionarioEquipe(f = {}) {
    const conselho = String(f.conselho || '').toUpperCase();
    if (['CREFITO','CRM','CREF','CRO','CRP','SECRETARIA'].includes(conselho)) return conselho;
    const registro = String(f.registro || '').toUpperCase();
    if (registro.startsWith('CREFITO')) return 'CREFITO';
    if (registro.startsWith('CRM')) return 'CRM';
    if (registro.startsWith('CREF')) return 'CREF';
    if (registro.startsWith('CRO')) return 'CRO';
    if (registro.startsWith('CRP')) return 'CRP';
    const tipo = normalizarNivelAcessoEquipe(f.tipo);
    if (tipo === 'FISIOTERAPEUTA') return 'CREFITO';
    if (tipo === 'MEDICO') return 'CRM';
    if (tipo === 'EDUCADOR_FISICO') return 'CREF';
    return 'SECRETARIA';
}

function normalizarIdentificador(v) { return removerAcentos(String(v || '')).replace(/\s+/g, '').trim(); }
function somenteDigitosEquipe(v) { return String(v || '').replace(/\D/g, ''); }

function formatarRegistroProfissional(tipoRegistro, regional, numero) {
    const n = String(numero || '').trim().replace(/^\s*(CREFITO|CRM|CRO|CRP|CREF)(?:-?\w+)?\s*/i, '').trim();
    if (['MASTER','MASTER_FEM','SECRETARIA'].includes(tipoRegistro)) return '';
    const reg = String(regional || '').trim().toUpperCase();
    if (tipoRegistro === 'CREFITO') {
        const regionalNum = reg.replace(/\D/g, '');
        return `CREFITO${regionalNum ? '-' + regionalNum : ''} ${n}`.trim();
    }
    if (['CRM','CRO','CRP','CREF'].includes(tipoRegistro)) {
        return `${tipoRegistro}${reg ? '-' + reg : ''} ${n}`.trim();
    }
    return `${tipoRegistro} ${n}`.trim();
}

function atualizarAjudaNivelAcesso() {
    const select = document.getElementById('eq_nivel_acesso');
    const ajuda = document.getElementById('eq_nivel_acesso_ajuda');
    if (!select || !ajuda) return;
    const textos = {
        MASTER: 'Acesso total: pacientes, área clínica, agenda, documentos, financeiro, equipe e configurações administrativas.',
        SECRETARIA: 'Acesso operacional: cadastro de pacientes, agenda e documentos administrativos. Não inclui dados financeiros.',
        FISIOTERAPEUTA: 'Acesso clínico: avaliação, evolução, documentos clínicos, pacientes e agenda.',
        MEDICO: 'Perfil reservado para o futuro módulo médico; não acessa o KineSys atual.',
        NUTRICIONISTA: 'Perfil reservado para o futuro módulo de nutrição; não acessa o KineSys atual.',
        PSICOLOGO: 'Perfil reservado para o futuro módulo de psicologia; não acessa o KineSys atual.',
        EDUCADOR_FISICO: 'Perfil reservado para o futuro módulo de Educação Física; não acessa o KineSys atual.'
    };
    ajuda.textContent = textos[select.value] || '';
}

function sugerirNivelAcessoPorRegistro(forcar = false) {
    const editId = document.getElementById('eq_edit_id')?.value || '';
    if (editId && !forcar) return; // Em edição, mudar profissão não deve rebaixar/promover o acesso sozinho.
    const tipoRegistro = document.getElementById('eq_tipo_registro')?.value || 'SECRETARIA';
    const nivel = document.getElementById('eq_nivel_acesso');
    if (nivel) nivel.value = perfilPorConselho(tipoRegistro);
    atualizarAjudaNivelAcesso();
}

function alternarCampoRegistroProfissional() {
    const tipo = document.getElementById('eq_tipo_registro')?.value || 'SECRETARIA';
    const semRegistro = ['SECRETARIA','MASTER','MASTER_FEM'].includes(tipo);
    const grpNumero = document.getElementById('grp_eq_num_registro');
    if (grpNumero) grpNumero.style.display = semRegistro ? 'none' : 'flex';
    const grpRegional = document.getElementById('grp_eq_regional');
    if (grpRegional) grpRegional.style.display = semRegistro ? 'none' : 'flex';
    const lbl = document.getElementById('lbl_eq_regional');
    const input = document.getElementById('eq_regional');
    if (lbl && input) {
        if (tipo === 'CREFITO') { lbl.textContent = 'Regional do CREFITO'; input.placeholder = 'Ex: 4'; }
        else { lbl.textContent = 'UF / Regional do Conselho'; input.placeholder = 'Ex: MG'; }
    }
}

async function verificarDuplicidadeFuncionario({email, cpf, registro, nivelAcesso, excluirId = ''}) {
    if (!_supabase) throw new Error('Servidor indisponível: não é possível validar/cadastrar equipe offline.');
    const { data, error } = await _supabase.from('equipe').select('id,nome,email,cpf,registro,tipo');
    if (error) throw error;
    const e = String(email || '').trim().toLowerCase();
    const c = somenteDigitosEquipe(cpf);
    const r = normalizarIdentificador(registro);
    const nivel = normalizarNivelAcessoEquipe(nivelAcesso || '');

    // CPF/e-mail/registro podem se repetir quando representam FUNÇÕES diferentes.
    // O bloqueio permanece somente para duplicidade do mesmo perfil de acesso.
    const mesmoPerfil = (f) => normalizarNivelAcessoEquipe(f.tipo) === nivel;
    const duplicado = (data || []).find(f => String(f.id) !== String(excluirId || '') && mesmoPerfil(f) && (
        (e && String(f.email || '').trim().toLowerCase() === e) ||
        (c && somenteDigitosEquipe(f.cpf) === c) ||
        (r && normalizarIdentificador(f.registro) === r)
    ));
    if (!duplicado) return null;
    let campo = 'dados profissionais';
    if (e && String(duplicado.email || '').trim().toLowerCase() === e) campo = 'e-mail';
    else if (c && somenteDigitosEquipe(duplicado.cpf) === c) campo = 'CPF';
    else if (r && normalizarIdentificador(duplicado.registro) === r) campo = 'registro profissional';
    return { funcionario: duplicado, campo, nivel };
}

function funcionarioPodeAparecerNaAgenda(f) {
    if (!f || f.ativo === false) return false;
    if (['FISIOTERAPEUTA','PROFISSIONAL'].includes(normalizarNivelAcessoEquipe(f.tipo))) return true;
    if (typeof f.aparece_na_agenda === 'boolean') return f.aparece_na_agenda;
    // Compatibilidade temporária com bancos que ainda não executaram a migration.
    // Mantém o comportamento legado apenas até a coluna ser criada.
    return !['SECRETARIA'].includes(normalizarNivelAcessoEquipe(f.tipo));
}

function limparFormularioEquipe() {
    const ids = ['eq_edit_id','eq_nome','eq_email','eq_senha','eq_confirmar_senha','eq_cpf','eq_regional','eq_num_registro','eq_idade','eq_endereco'];
    ids.forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
    const tipoRegistro = document.getElementById('eq_tipo_registro');
    if (tipoRegistro) tipoRegistro.value = 'CREFITO';
    const nivel = document.getElementById('eq_nivel_acesso');
    if (nivel) nivel.value = 'FISIOTERAPEUTA';
    const agendaAssistencial = document.getElementById('eq_aparece_na_agenda');
    if (agendaAssistencial) agendaAssistencial.checked = false;
    const btn = document.getElementById('eq_btn_salvar');
    if (btn) btn.textContent = 'Salvar usuário';
    ['grp_eq_senha','grp_eq_confirmar_senha'].forEach(id => { const el = document.getElementById(id); if (el) el.hidden = false; });
    limparEstadoCampo('eq_cpf');
    alternarCampoRegistroProfissional();
    atualizarAjudaNivelAcesso();
}

async function abrirEdicaoFuncionario(id) {
    if (!usuarioEhMaster()) { alert('Apenas Administrador pode editar a equipe.'); return; }
    if (!_supabase) { alert('⚠️ Servidor indisponível. A equipe não pode ser editada offline.'); return; }
    try {
        const { data, error } = await _supabase.from('equipe').select(CAMPOS_PUBLICOS_PERFIL).eq('id', id).limit(1);
        if (error) throw error;
        const f = data && data[0];
        if (!f) { alert('⚠️ Funcionário não encontrado.'); return; }
        const set = (elId, value) => { const el = document.getElementById(elId); if (el) el.value = value ?? ''; };
        set('eq_edit_id', f.id);
        set('eq_nome', f.nome);
        set('eq_email', f.email);
        set('eq_cpf', f.cpf);
        set('eq_tipo_registro', conselhoFuncionarioEquipe(f));
        set('eq_regional', f.regional);
        set('eq_num_registro', f.numero_registro);
        set('eq_nivel_acesso', normalizarNivelAcessoEquipe(f.tipo));
        const agendaAssistencial = document.getElementById('eq_aparece_na_agenda');
        if (agendaAssistencial) agendaAssistencial.checked = funcionarioPodeAparecerNaAgenda(f);
        set('eq_idade', f.idade);
        set('eq_endereco', f.endereco);
        const btn = document.getElementById('eq_btn_salvar');
        if (btn) btn.textContent = 'Salvar alterações';
        ['grp_eq_senha','grp_eq_confirmar_senha'].forEach(elId => { const el = document.getElementById(elId); if (el) el.hidden = true; });
        alternarCampoRegistroProfissional();
        atualizarAjudaNivelAcesso();
        window.dispatchEvent(new CustomEvent('kinesys:equipe-editar', { detail: { id: f.id, nome: f.nome, tipo: normalizarNivelAcessoEquipe(f.tipo) } }));
    } catch (err) {
        console.error('Erro ao abrir edição da equipe:', err);
        alert('⚠️ Não foi possível abrir este cadastro para edição. ' + (err.message || ''));
    }
}

async function cadastrarNovoFuncionario() {
    if (!usuarioEhMaster()) { alert('Apenas Administrador pode cadastrar ou editar a equipe.'); return; }
    const editId = document.getElementById('eq_edit_id')?.value || '';
    const nome = document.getElementById('eq_nome').value.trim();
    const email = document.getElementById('eq_email').value.trim().toLowerCase();
    const senha = document.getElementById('eq_senha')?.value || '';
    const confirmarSenha = document.getElementById('eq_confirmar_senha')?.value || '';
    const cpf = document.getElementById('eq_cpf').value.trim();
    const tipoRegistro = document.getElementById('eq_tipo_registro').value;
    const nivelAcesso = normalizarNivelAcessoEquipe(document.getElementById('eq_nivel_acesso')?.value || perfilPorConselho(tipoRegistro));
    const regional = document.getElementById('eq_regional')?.value.trim() || '';
    const numeroRegistro = document.getElementById('eq_num_registro')?.value.trim() || '';
    const apareceNaAgenda = !!document.getElementById('eq_aparece_na_agenda')?.checked;
    if (!nome || !email) { alert('⚠️ Nome e e-mail são obrigatórios.'); return; }
    if (!editId && senha.length < 8) { alert('⚠️ A senha deve ter pelo menos 8 caracteres.'); document.getElementById('eq_senha')?.focus(); return; }
    if (!editId && !/[a-z]/.test(senha)) { alert('⚠️ A senha deve conter pelo menos uma letra minúscula.'); return; }
    if (!editId && !/[A-Z]/.test(senha)) { alert('⚠️ A senha deve conter pelo menos uma letra maiúscula.'); return; }
    if (!editId && !/\d/.test(senha)) { alert('⚠️ A senha deve conter pelo menos um número.'); return; }
    if (!editId && senha !== confirmarSenha) { alert('⚠️ A confirmação da senha não confere.'); document.getElementById('eq_confirmar_senha')?.focus(); return; }
    if (!validarCPFInput('eq_cpf')) {
        document.getElementById('eq_cpf')?.focus();
        alert('⚠️ Corrija o CPF destacado em vermelho antes de salvar o profissional.');
        return;
    }
    if (tipoRegistro !== 'SECRETARIA' && !numeroRegistro) { alert('⚠️ Informe o número do registro profissional.'); return; }
    if (tipoRegistro === 'CREFITO' && !regional) { alert('⚠️ Informe o regional do CREFITO (ex.: 4).'); return; }
    const registro = formatarRegistroProfissional(tipoRegistro, regional, numeroRegistro);
    if (['CRO','CRP'].includes(tipoRegistro) && !['MASTER','SECRETARIA'].includes(nivelAcesso)) {
        alert('⚠️ Este conselho ainda não possui fluxo clínico específico. Use um nível administrativo/consultivo compatível até que o fluxo próprio seja implementado.');
        return;
    }
    // Um administrador cadastrado pela equipe pode editar os próprios dados, mas não
    // alterar o próprio nível de acesso na mesma sessão. Isso evita auto-bloqueio acidental.
    if (editId && usuarioLogado && String(usuarioLogado.id || '') === String(editId)) {
        const nivelAtual = normalizarNivelAcessoEquipe(usuarioLogado.tipo);
        if (nivelAcesso !== nivelAtual) {
            alert('⚠️ Por segurança, um administrador não pode alterar o próprio nível de acesso. Faça essa mudança usando outro administrador.');
            return;
        }
    }
    try {
        const dup = await verificarDuplicidadeFuncionario({email, cpf, registro, nivelAcesso, excluirId: editId});
        if (dup) { alert(`⚠️ Alteração bloqueada: já existe ${dup.campo} cadastrado para ${dup.funcionario.nome || 'outro funcionário'} com a mesma função (${rotuloPerfil(nivelAcesso)}). Para a mesma pessoa em outra função, escolha um nível de acesso diferente.`); return; }
        const payload = {
            nome, email, cpf,
            tipo: nivelAcesso,
            conselho: tipoRegistro,
            regional: regional || null,
            numero_registro: numeroRegistro || null,
            registro: registro || null,
            aparece_na_agenda: apareceNaAgenda,
            idade: document.getElementById('eq_idade').value || null,
            endereco: document.getElementById('eq_endereco').value.trim()
        };
        if (editId) {
            const { error } = await _supabase.from('equipe').update(payload).eq('id', editId);
            if (error) throw error;
            if (usuarioLogado && String(usuarioLogado.id || '') === String(editId)) {
                usuarioLogado = { ...usuarioLogado, ...payload, id: editId };
                persistirSessao(usuarioLogado);
                const lblUsuario = document.getElementById('lbl_usuario_logado');
                if (lblUsuario) lblUsuario.innerText = usuarioLogado.nome;
            }
            alert('✅ Cadastro da equipe atualizado com sucesso!');
            window.dispatchEvent(new CustomEvent('kinesys:equipe-salva', { detail: { id: editId, tipo: nivelAcesso, editado: true } }));
        } else {
            const { data: resultado, error } = await _supabase.functions.invoke('cadastrar-equipe', {
                body: { ...payload, senha, solicitante_perfil_id: usuarioLogado?.id || '' }
            });
            if (resultado?.error) throw new Error(resultado.error);
            if (error) throw error;
            const novoFuncionario = resultado?.perfil;
            if (!novoFuncionario?.id) throw new Error('O servidor não confirmou a criação do usuário.');
            alert(resultado?.conta_criada
                ? '✅ Usuário cadastrado. O profissional já pode entrar com o e-mail e a senha definidos.'
                : '✅ Novo perfil vinculado à conta que já existia para este e-mail. A senha anterior da conta foi preservada.');
            window.dispatchEvent(new CustomEvent('kinesys:equipe-salva', { detail: { id: novoFuncionario.id, tipo: novoFuncionario.tipo, editado: false } }));
        }
        limparFormularioEquipe();
        carregarListaEquipe();
    } catch (err) {
        console.error('Erro ao salvar equipe:', err);
        const msg = String(err?.message || err?.details || '');
        if (/functions|cadastrar-equipe|edge function|failed to send|non-2xx/i.test(msg)) {
            alert('⚠️ O cadastro automático ainda não está disponível. Tente novamente em instantes.');
            return;
        }
        if (/aparece_na_agenda|schema cache/i.test(msg)) {
            alert('⚠️ O banco ainda não possui o controle de profissionais da Agenda. Execute a migration SUPABASE_SQL/SUPABASE_MIGRACAO_PROFISSIONAIS_AGENDA_v1.11.2.sql no Supabase e tente novamente.');
            return;
        }
        alert('⚠️ Não foi possível salvar o profissional. ' + (err.message || 'Verifique a conexão com o servidor.'));
    }
}

async function carregarListaEquipe() {
    const tbody = document.getElementById('lista_equipe_corpo');
    if (!tbody) return;
    if (!_supabase) { tbody.innerHTML = `<tr><td colspan="7" class="kds-u-ta-center">Servidor indisponível. A equipe não é cadastrada offline.</td></tr>`; return; }
    const { data, error } = await _supabase.from('equipe').select(CAMPOS_PUBLICOS_PERFIL);
    if (error || !data || data.length === 0) { tbody.innerHTML = `<tr><td colspan="7" class="kds-u-ta-center">Nenhum funcionário cadastrado.</td></tr>`; return; }
    const ordenados = data.slice().sort((a,b) => {
        const ai = a.ativo === false ? 1 : 0;
        const bi = b.ativo === false ? 1 : 0;
        const am = normalizarNivelAcessoEquipe(a.tipo) === 'MASTER' ? 0 : 1;
        const bm = normalizarNivelAcessoEquipe(b.tipo) === 'MASTER' ? 0 : 1;
        return ai - bi || am - bm || String(a.nome || '').localeCompare(String(b.nome || ''), 'pt-BR');
    });
    tbody.innerHTML = ordenados.map(f => {
        const ativo = f.ativo !== false;
        const status = ativo
            ? '<span class="kds-u-ai-center kds-u-gap-5px kds-u-p-3px-7px kds-u-br-999px kds-u-bg-success-soft kds-u-text-success-text kds-u-fs-meta kds-u-fw-800 kds-u-d-inline-flex">Ativo</span>'
            : '<span class="kds-u-ai-center kds-u-gap-5px kds-u-p-3px-7px kds-u-br-999px kds-u-bg-neutral-soft kds-u-text-neutral-text kds-u-fs-meta kds-u-fw-800 kds-u-d-inline-flex">Inativo</span>';
        const reativar = ativo ? '' : `<button type="button" class="ks-team-action btn-primary btn-compact" data-equipe-reativar="${escapeHTML(f.id)}">Reativar</button>`;
        return `<tr class="${ativo ? '' : 'ks-team-row-inactive'}">
        <td><strong>${escapeHTML(f.nome)}</strong></td>
        <td>${escapeHTML(f.email)}</td>
        <td>${escapeHTML(rotuloPerfil(normalizarNivelAcessoEquipe(f.tipo)))}</td>
        <td>${escapeHTML(f.registro || (conselhoFuncionarioEquipe(f) === 'SECRETARIA' ? 'Administrativo' : 'Sem registro clínico'))}</td>
        <td>${status}</td>
        <td>${funcionarioPodeAparecerNaAgenda(f)
            ? '<span class="kds-u-ai-center kds-u-gap-5px kds-u-p-3px-7px kds-u-br-999px kds-u-bg-success-soft kds-u-text-success-text kds-u-fs-meta kds-u-fw-800 kds-u-d-inline-flex">✓ Aparece</span>'
            : '<span class="kds-u-ai-center kds-u-gap-5px kds-u-p-3px-7px kds-u-br-999px kds-u-bg-neutral-soft kds-u-text-neutral-text kds-u-fs-meta kds-u-fw-800 kds-u-d-inline-flex">Não aparece</span>'}</td>
        <td><div class="kds-u-gap-6px kds-u-wrap-wrap kds-u-d-flex">
            <button type="button" class="ks-team-action btn-secondary btn-compact" data-equipe-editar="${escapeHTML(f.id)}">Editar</button>
            ${reativar}
            <button type="button" class="ks-team-action btn-secondary btn-compact" data-equipe-redefinir="${escapeHTML(f.id)}">Definir nova senha</button>
            <button type="button" class="ks-team-action btn-danger btn-compact" data-equipe-excluir="${escapeHTML(f.id)}">Excluir</button>
        </div></td>
    </tr>`;
    }).join('');
    if (!tbody.dataset.acoesEquipeVinculadas) {
        tbody.dataset.acoesEquipeVinculadas = '1';
        tbody.addEventListener('click', e => {
            const editar = e.target.closest('[data-equipe-editar]');
            if (editar) { abrirEdicaoFuncionario(editar.dataset.equipeEditar); return; }
            const reativar = e.target.closest('[data-equipe-reativar]');
            if (reativar) { reativarFuncionario(reativar.dataset.equipeReativar); return; }
            const redefinir = e.target.closest('[data-equipe-redefinir]');
            if (redefinir) { enviarRedefinicaoAcessoFuncionario(redefinir.dataset.equipeRedefinir); return; }
            const excluir = e.target.closest('[data-equipe-excluir]');
            if (excluir) excluirFuncionario(excluir.dataset.equipeExcluir);
        });
    }
}


async function reativarFuncionario(id) {
    if (!usuarioEhMaster()) { alert('Apenas Administrador pode reativar usuários.'); return false; }
    if (!_supabase) { alert('Servidor indisponível. Nenhum cadastro foi alterado.'); return false; }
    try {
        const { data: cadastro, error: leituraError } = await _supabase.from('equipe').select('id,nome,email,ativo').eq('id', id).maybeSingle();
        if (leituraError) throw leituraError;
        if (!cadastro) throw new Error('Funcionário não encontrado ou sem permissão.');
        if (cadastro.ativo !== false) { await carregarListaEquipe(); return true; }
        const confirmado = await confirmarKineSys(
            `Reativar o acesso de ${cadastro.nome || 'este usuário'}? O perfil voltará a aparecer entre os usuários ativos. A senha da conta não será alterada.`,
            { titulo:'Reativar usuário', confirmar:'Reativar acesso', cancelar:'Cancelar' }
        );
        if (!confirmado) return false;
        const { data, error } = await _supabase.from('equipe').update({ ativo:true }).eq('id', id).select('id');
        if (error) throw error;
        if (data?.length !== 1) throw new Error('O banco não confirmou a reativação.');
        await carregarListaEquipe();
        if (typeof carregarProfissionaisAgenda === 'function') await carregarProfissionaisAgenda();
        alert('✅ Perfil reativado. Se a senha não for conhecida, use “Definir nova senha”.');
        return true;
    } catch (err) {
        console.error('KineSys: falha ao reativar funcionário:', err);
        alert('Não foi possível reativar o usuário. ' + (err?.message || String(err)));
        return false;
    }
}

async function enviarRedefinicaoAcessoFuncionario(id) {
    if (!usuarioEhMaster()) { alert('Apenas Administrador pode definir senhas da equipe.'); return false; }
    if (!window.KineSysAccessAdmin?.open) { alert('O gerenciamento de acesso ainda não foi carregado. Atualize a página e tente novamente.'); return false; }
    return window.KineSysAccessAdmin.open(id);
}

async function excluirFuncionario(id) {
    if (!usuarioEhMaster()) { alert('Apenas Administrador pode excluir usuários.'); return false; }
    if (String(usuarioLogado?.id || '') === String(id)) { alert('Por segurança, você não pode excluir ou desativar o próprio perfil conectado.'); return false; }
    if (!_supabase) { alert('Servidor indisponível. Nenhum cadastro foi alterado.'); return false; }
    try {
        const cadastro = await _supabase.from('equipe').select('id,nome,ativo').eq('id', id).limit(1);
        if (cadastro.error) throw cadastro.error;
        const funcionario = cadastro.data?.[0];
        if (!funcionario) throw new Error('Funcionário não encontrado ou sem permissão. Atualize a lista.');
        const vinculos = await _supabase.from('agendamentos').select('id').eq('profissional_id', id).limit(1);
        if (vinculos.error) throw vinculos.error;
        const possuiHistorico = !!vinculos.data?.length;
        const confirmado = await confirmarKineSys(
            possuiHistorico
                ? funcionario.nome + ' possui agendamentos vinculados e não pode ser apagado sem perder a referência do histórico.\n\nDeseja desativar este perfil? Ele perderá o acesso ao KineSys e deixará a equipe ativa e a lista de profissionais disponíveis. Os agendamentos e registros anteriores serão preservados. Revise e reagende os atendimentos futuros, se houver. A conta de login e outros perfis da mesma pessoa não serão excluídos.'
                : 'Deseja excluir definitivamente o perfil de ' + funcionario.nome + '? A conta de login e os outros perfis da mesma pessoa serão preservados.',
            { titulo: possuiHistorico ? 'Desativar funcionário com histórico' : 'Excluir usuário', confirmar: possuiHistorico ? 'Desativar perfil' : 'Excluir usuário', destrutivo: true }
        );
        if (!confirmado) return false;
        if (!usuarioEhMaster() || String(usuarioLogado?.id || '') === String(id)) throw new Error('Sua sessão mudou. Entre novamente como administrador.');
        const operacao = possuiHistorico
            ? _supabase.from('equipe').update({ ativo: false, aparece_na_agenda: false })
            : _supabase.from('equipe').delete();
        const resultado = await operacao.eq('id', id).select('id');
        if (resultado.error) throw resultado.error;
        if (resultado.data?.length !== 1 || String(resultado.data[0].id) !== String(id)) throw new Error('O banco não confirmou a alteração. Atualize a sessão e verifique suas permissões.');
        await carregarListaEquipe();
        if (typeof carregarProfissionaisAgenda === 'function') await carregarProfissionaisAgenda();
        alert(possuiHistorico ? 'Perfil desativado. Histórico e agendamentos preservados.' : 'Perfil excluído com sucesso.');
        return true;
    } catch (err) {
        console.error('KineSys: falha ao remover funcionário:', err);
        alert(String(err?.code || '') === '23503'
            ? 'Este funcionário possui vínculos que impedem a exclusão. O histórico foi preservado. Atualize a lista e tente novamente para verificar a opção de desativação.'
            : 'Não foi possível concluir a operação. ' + (err?.message || String(err)));
        return false;
    }
}
