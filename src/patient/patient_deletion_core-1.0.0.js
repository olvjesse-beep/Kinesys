'use strict';
/* ==========================================================================
   KineSys — Patient Deletion Core 1.0.0
   Phase 4M: extraído do monólito sem alteração de regras.
   Mantém exclusão administrativa transacional, limpeza local e KineSys Local.
   ========================================================================== */

function limparDadosLocaisPacienteExcluido(id) {
    const pid = String(id || '');
    if (!pid) return;
    try {
        let lista = JSON.parse(localStorage.getItem('kinesys_prontuarios') || '[]');
        if (Array.isArray(lista)) localStorage.setItem('kinesys_prontuarios', JSON.stringify(lista.filter(p => String(p.id || '') !== pid)));
    } catch (_) {}
    try {
        const base = JSON.parse(localStorage.getItem(KINESYS_RESPONSAVEIS_KEY) || '{}');
        delete base[pid];
        localStorage.setItem(KINESYS_RESPONSAVEIS_KEY, JSON.stringify(base));
    } catch (_) {}
    try {
        const base = JSON.parse(localStorage.getItem('kinesys_documentos_timeline') || '{}');
        delete base[pid];
        localStorage.setItem('kinesys_documentos_timeline', JSON.stringify(base));
    } catch (_) {}
    try {
        const pend = JSON.parse(localStorage.getItem('kinesys_agendamentos_pendentes_sync_v1') || '[]');
        if (Array.isArray(pend)) localStorage.setItem('kinesys_agendamentos_pendentes_sync_v1', JSON.stringify(pend.filter(x => String(x?.payload?.paciente_id || '') !== pid)));
    } catch (_) {}
    ['kinesys_financeiro_planos_v1112','kinesys_financeiro_pagamentos_v1112','kinesys_financeiro_pagamentos_excluidos_v1112','kinesys_financeiro_agenda_vinculos_v1112'].forEach(chave => {
        try {
            const lista = JSON.parse(localStorage.getItem(chave) || '[]');
            if (Array.isArray(lista)) localStorage.setItem(chave, JSON.stringify(lista.filter(x => String(x?.paciente_id || '') !== pid)));
        } catch (_) {}
    });
    try {
        const ctx = localStorage.getItem('kinesys_paciente_contexto') || '';
        if (String(ctx) === pid) localStorage.removeItem('kinesys_paciente_contexto');
    } catch (_) {}
    try {
        const r = JSON.parse(localStorage.getItem('kinesys_rascunho_avaliacao_v11') || 'null');
        if (r && String(r.pacienteAtualId || r.paciente_id || r.pacienteId || '') === pid) localStorage.removeItem('kinesys_rascunho_avaliacao_v11');
    } catch (_) {}
}

async function excluirPacienteNuvemSeguro(id) {
    if (!_supabase) throw new Error('Servidor indisponível. A exclusão definitiva exige conexão com o KineSys.');
    const { data, error } = await _supabase.rpc('kinesys_excluir_paciente_completo', { p_paciente_id: id });
    if (error) throw error;
    if (data && data.ok === false) throw new Error(data.erro || 'O servidor não confirmou a exclusão completa do paciente.');
    return { modo: 'transacional', resultado: data || null };
}

async function excluirArquivosLocaisPaciente(id) {
    if (typeof kinesysLocalFetch !== 'function') return { ok: false, indisponivel: true };
    try {
        const r = await kinesysLocalFetch('/api/patient-delete', {
            method: 'POST',
            body: { patient_id: id, confirm_delete: true }
        }, 7000);
        return { ok: true, ...r };
    } catch (err) {
        // Serviço antigo não possui esta rota. O cadastro em nuvem não deve ser
        // restaurado por isso; apenas avisamos sobre os originais locais.
        return { ok: false, indisponivel: true, error: err };
    }
}

async function excluirPaciente(id) {
    if (!usuarioEhMaster()) {
        alert('🔒 Apenas Administrador pode excluir definitivamente um cadastro de paciente.');
        return false;
    }
    invalidarCachePacientesBasicos();
    const lista = await obterPacientesBasicos();
    const paciente = lista.find(p => String(p.id) === String(id));
    if (!paciente) { alert('⚠️ Paciente não encontrado. Atualize a lista e tente novamente.'); return false; }

    const nome = paciente.nome || 'este paciente';
    const confirmado = await confirmarKineSys(
        `Você está prestes a excluir DEFINITIVAMENTE o cadastro de ${nome}.\n\n` +
        `Serão removidos o cadastro, avaliações, evoluções, agendamentos, lista de espera, planos/pagamentos e vínculos de fotos/documentos. Esta ação não pode ser desfeita.\n\n` +
        `Deseja realmente excluir TODO o histórico e o cadastro deste paciente?`,
        { titulo: 'Excluir paciente e todo o histórico', confirmar: 'Sim, excluir tudo', cancelar: 'Cancelar', destrutivo: true }
    );
    if (!confirmado) return false;

    try {
        const resultadoNuvem = await excluirPacienteNuvemSeguro(id);
        limparDadosLocaisPacienteExcluido(id);
        const arquivosLocais = await excluirArquivosLocaisPaciente(id);

        if (String(pacienteAtualId || '') === String(id)) pacienteAtualId = null;
        try {
            if (typeof definirPacienteContexto === 'function') await definirPacienteContexto('');
        } catch (_) {}
        if (typeof financeiroPacienteAtualId !== 'undefined' && String(financeiroPacienteAtualId || '') === String(id)) financeiroPacienteAtualId = '';

        await renderizarTabelaProntuarios();
        await renderizarPacientesRecentesHome();
        await atualizarSelectsPacientes();
        if (typeof atualizarSelectPacientesPreCadastro === 'function') await atualizarSelectPacientesPreCadastro();
        if (typeof popularSelectMidiasPaciente === 'function') await popularSelectMidiasPaciente('');
        if (typeof popularPacientesFinanceiro === 'function') await popularPacientesFinanceiro('');

        if (arquivosLocais.ok) {
            alert(`✅ Cadastro e todo o histórico de ${nome} foram excluídos definitivamente.`);
        } else {
            alert(`✅ Cadastro e histórico do sistema de ${nome} foram excluídos.\n⚠️ O KineSys Local não confirmou a remoção dos arquivos físicos deste computador/backup. Se houver fotos ou documentos locais, atualize/reinicie o KineSys Local desta versão e confira a pasta de dados.`);
        }
        return true;
    } catch (err) {
        console.error('KineSys: falha ao excluir paciente:', err);
        alert('❌ A exclusão não foi concluída. Nenhum dado foi removido parcialmente.\n\n' + (err.message || String(err)));
        return false;
    }
}

// Contrato público preservado para onclick e módulos existentes.
window.limparDadosLocaisPacienteExcluido = limparDadosLocaisPacienteExcluido;
window.excluirPacienteNuvemSeguro = excluirPacienteNuvemSeguro;
window.excluirArquivosLocaisPaciente = excluirArquivosLocaisPaciente;
window.excluirPaciente = excluirPaciente;
