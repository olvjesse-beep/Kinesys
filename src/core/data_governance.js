/* ============================================================================
   KineSys — Governança e migração de dados locais · Fase 3 · v1.13.0

   Objetivos:
   - tornar visível o que ainda existe no navegador;
   - permitir um backup portátil antes de qualquer operação;
   - migrar prontuários e eventos documentais para o Supabase sem apagar a
     cópia local;
   - validar a migração por contagem de registros;
   - somente liberar a limpeza local depois de uma migração validada.

   Esta camada nunca usa credenciais administrativas e nunca remove dados
   automaticamente. A persistência definitiva continua sendo o Supabase.
   ============================================================================ */

(function () {
    'use strict';

    const GOVERNANCE_VERSION = '1.13.0';
    const MIGRATION_STATE_KEY = 'kinesys_migracao_dados_clinicos_v1';
    const BACKUP_SCHEMA = 'kinesys-local-backup';

    const KNOWN_KEYS = [
        { key: 'kinesys_prontuarios', label: 'Prontuários, avaliações e evoluções', group: 'Clínico', permanent: true },
        { key: 'kinesys_documentos_timeline', label: 'Eventos da linha do tempo documental', group: 'Clínico', permanent: true },
        { key: 'kinesys_pacientes_responsaveis_v1', label: 'Dados de responsáveis', group: 'Clínico', permanent: true },
        { key: MIGRATION_STATE_KEY, label: 'Estado da última migração', group: 'Governança', permanent: false },
        { key: 'kinesys_rascunho_avaliacao_v11', label: 'Rascunho de avaliação (temporário)', group: 'Temporário', permanent: false },
        { key: 'kinesys_agendamentos_pendentes_sync_v1', label: 'Agendamentos aguardando nuvem', group: 'Operacional', permanent: false },
        { key: 'kinesys_notificacoes_pendentes_v1', label: 'Notificações aguardando nuvem', group: 'Operacional', permanent: false },
        { key: 'kinesys_financeiro_planos_v1112', label: 'Planos financeiros aguardando nuvem', group: 'Financeiro', permanent: false },
        { key: 'kinesys_financeiro_pagamentos_v1112', label: 'Pagamentos financeiros aguardando nuvem', group: 'Financeiro', permanent: false },
        { key: 'kinesys_financeiro_despesas_v1112', label: 'Despesas financeiras aguardando nuvem', group: 'Financeiro', permanent: false },
        { key: 'kinesys_financeiro_creditos_usos_v1112', label: 'Créditos financeiros aguardando nuvem', group: 'Financeiro', permanent: false },
        { key: 'kinesys_financeiro_agenda_vinculos_v1112', label: 'Vínculos Agenda/Financeiro aguardando nuvem', group: 'Operacional', permanent: false },
        { key: 'kinesys_financeiro_pagamentos_excluidos_v1112', label: 'Exclusões financeiras aguardando nuvem', group: 'Financeiro', permanent: false },
        { key: 'kinesys_analise_admin_flags_v1112', label: 'Seleções da análise administrativa', group: 'Administrativo', permanent: false },
        { key: 'kinesys_paciente_contexto', label: 'Paciente atualmente selecionado', group: 'Sessão', permanent: false },
        { key: 'kinesys_financeiro_aba', label: 'Aba financeira selecionada', group: 'Sessão', permanent: false }
    ];

    const KNOWN_BY_KEY = new Map(KNOWN_KEYS.map(item => [item.key, item]));

    function safeParse(raw, fallback) {
        try {
            const parsed = JSON.parse(raw);
            return parsed === undefined ? fallback : parsed;
        } catch (_) {
            return fallback;
        }
    }

    function safeGet(key) {
        try { return localStorage.getItem(key); } catch (_) { return null; }
    }

    function safeKeys() {
        const keys = [];
        try {
            for (let i = 0; i < localStorage.length; i += 1) {
                const key = localStorage.key(i);
                if (key && key.startsWith('kinesys_')) keys.push(key);
            }
        } catch (_) { /* armazenamento bloqueado */ }
        return keys.sort();
    }

    function byteLength(value) {
        try { return new Blob([String(value || '')]).size; } catch (_) { return String(value || '').length; }
    }

    function recordCount(value) {
        if (Array.isArray(value)) return value.length;
        if (value && typeof value === 'object') return Object.keys(value).length;
        return value === null || value === undefined || value === '' ? 0 : 1;
    }

    function formatBytes(bytes) {
        const n = Number(bytes || 0);
        if (n < 1024) return `${n} B`;
        if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
        return `${(n / (1024 * 1024)).toFixed(2)} MB`;
    }

    function esc(value) {
        return String(value ?? '').replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));
    }

    function feedback(message, tone = 'info') {
        const el = document.getElementById('ks_dados_feedback');
        if (!el) return;
        el.className = `ks-data-feedback ${tone}`;
        el.textContent = message || '';
    }

    function setBusy(busy) {
        ['ks_dados_backup_btn', 'ks_dados_migrar_btn', 'ks_dados_limpar_btn', 'ks_dados_importar_btn'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.disabled = !!busy;
        });
        const progress = document.getElementById('ks_dados_progress');
        if (progress) progress.hidden = !busy;
    }

    function localInventory() {
        return safeKeys().map(key => {
            const raw = safeGet(key) || '';
            const value = safeParse(raw, raw);
            const known = KNOWN_BY_KEY.get(key);
            return {
                key,
                label: known?.label || 'Dado KineSys não catalogado',
                group: known?.group || 'Não catalogado',
                permanent: !!known?.permanent,
                bytes: byteLength(raw),
                records: recordCount(value),
                present: raw !== null
            };
        });
    }

    function localSnapshot() {
        const data = {};
        const rawData = {};
        safeKeys().forEach(key => {
            const raw = safeGet(key);
            if (raw !== null) {
                data[key] = safeParse(raw, raw);
                // Mantemos também o valor bruto para não transformar chaves
                // simples (como paciente_contexto) em uma string JSON com
                // aspas durante a restauração.
                rawData[key] = raw;
            }
        });
        return {
            schema: BACKUP_SCHEMA,
            schemaVersion: 1,
            exportedAt: new Date().toISOString(),
            appVersion: typeof KINESYS_APP_VERSION !== 'undefined' ? KINESYS_APP_VERSION : GOVERNANCE_VERSION,
            governanceVersion: GOVERNANCE_VERSION,
            origin: String(location.origin || ''),
            user: {
                id: typeof usuarioLogado !== 'undefined' ? (usuarioLogado?.id || '') : '',
                nome: typeof usuarioLogado !== 'undefined' ? (usuarioLogado?.nome || '') : '',
                email: typeof usuarioLogado !== 'undefined' ? (usuarioLogado?.email || '') : ''
            },
            inventory: localInventory(),
            data,
            rawData
        };
    }

    function downloadJson(payload, prefix = 'kinesys-backup') {
        const stamp = new Date().toISOString().replace(/[:.]/g, '-');
        const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = `${prefix}-${stamp}.json`;
        anchor.style.display = 'none';
        document.body.appendChild(anchor);
        anchor.click();
        setTimeout(() => { URL.revokeObjectURL(url); anchor.remove(); }, 1000);
    }

    function exportBackup() {
        const snapshot = localSnapshot();
        const total = snapshot.inventory.reduce((sum, item) => sum + item.bytes, 0);
        if (!snapshot.inventory.length) {
            feedback('Não há dados KineSys armazenados neste navegador.', 'info');
            return;
        }
        downloadJson(snapshot);
        feedback(`Backup exportado com ${snapshot.inventory.length} tipo(s) de dado e ${formatBytes(total)}. Guarde-o em local seguro.`, 'success');
    }

    function importBackup(event) {
        const input = event?.target;
        const file = input?.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
            const backup = safeParse(String(reader.result || ''), null);
            if (!backup || backup.schema !== BACKUP_SCHEMA || !backup.data || typeof backup.data !== 'object') {
                feedback('Arquivo inválido. Selecione um backup JSON exportado pelo KineSys.', 'error');
                if (input) input.value = '';
                return;
            }
            const keys = Object.keys(backup.data).filter(key => key.startsWith('kinesys_'));
            if (!keys.length) {
                feedback('O backup não contém dados KineSys restauráveis.', 'error');
                if (input) input.value = '';
                return;
            }
            if (!window.confirm(`O KineSys fará um backup automático do estado atual e restaurará ${keys.length} tipo(s) de dado local. A nuvem não será alterada. Continuar?`)) {
                if (input) input.value = '';
                return;
            }
            downloadJson(localSnapshot(), 'kinesys-antes-restaurar');
            try {
                keys.forEach(key => {
                    const raw = backup.rawData && typeof backup.rawData[key] === 'string'
                        ? backup.rawData[key]
                        : JSON.stringify(backup.data[key]);
                    localStorage.setItem(key, raw);
                });
                feedback(`Restauração local concluída (${keys.length} tipo(s)). Atualize a tela para recarregar os dados.`, 'success');
                renderInventory();
            } catch (err) {
                feedback(`Não foi possível concluir a restauração local: ${err?.message || err}`, 'error');
            } finally {
                if (input) input.value = '';
            }
        };
        reader.onerror = () => feedback('Não foi possível ler o arquivo de backup.', 'error');
        reader.readAsText(file);
    }

    function getSupabase() {
        try { return typeof _supabase !== 'undefined' ? _supabase : null; } catch (_) { return null; }
    }

    function currentUser() {
        try { return typeof usuarioLogado !== 'undefined' ? usuarioLogado : null; } catch (_) { return null; }
    }

    function getMigrationState() {
        return safeParse(safeGet(MIGRATION_STATE_KEY) || '', null);
    }

    function saveMigrationState(state) {
        try { localStorage.setItem(MIGRATION_STATE_KEY, JSON.stringify(state)); } catch (_) { /* status apenas */ }
    }

    function localPatients() {
        const value = safeParse(safeGet('kinesys_prontuarios') || '[]', []);
        return Array.isArray(value) ? value.filter(item => item && String(item.id || '').trim()) : [];
    }

    function localDocuments() {
        const value = safeParse(safeGet('kinesys_documentos_timeline') || '{}', {});
        if (!value || typeof value !== 'object') return [];
        const docs = [];
        Object.entries(value).forEach(([pacienteId, lista]) => {
            (Array.isArray(lista) ? lista : []).forEach(doc => {
                if (doc && String(doc.id || '').trim()) docs.push({ ...doc, pacienteId: doc.pacienteId || pacienteId });
            });
        });
        return docs;
    }

    function progress(message, percent = 0) {
        const label = document.getElementById('ks_dados_progress_label');
        const bar = document.getElementById('ks_dados_progress_bar');
        if (label) label.textContent = message;
        if (bar) bar.style.width = `${Math.max(0, Math.min(100, percent))}%`;
    }

    async function migrateDocuments(supabase, docs) {
        if (!docs.length) return { ok: true, count: 0, skipped: false };
        const rows = docs.map(doc => ({
            id: String(doc.id),
            paciente_id: String(doc.pacienteId || doc.paciente_id || ''),
            tipo: doc.tipo || 'outro',
            titulo: doc.titulo || 'Documento',
            data_hora: doc.dataHoraISO || doc.data_hora || new Date().toISOString(),
            emitido_por: doc.emitidoPor || doc.emitido_por || '',
            detalhes: doc.detalhes && typeof doc.detalhes === 'object' ? doc.detalhes : {},
            criado_em: doc.criadoEm || doc.criado_em || new Date().toISOString()
        })).filter(row => row.paciente_id);
        if (!rows.length) return { ok: true, count: 0, skipped: false };
        const result = await supabase.from('documentos_timeline').upsert(rows, { onConflict: 'id' });
        if (result.error) {
            const message = String(result.error.message || result.error);
            if (/documentos_timeline|relation|schema cache|does not exist/i.test(message)) {
                return { ok: false, count: 0, skipped: true, message: 'A tabela de eventos documentais ainda não foi criada no Supabase.' };
            }
            throw result.error;
        }
        return { ok: true, count: rows.length, skipped: false };
    }

    async function verifyMigration(supabase, patientIds, documentIds) {
        const [patients, evaluations, evolutions] = await Promise.all([
            patientIds.length ? supabase.from('pacientes').select('id').in('id', patientIds) : Promise.resolve({ data: [], error: null }),
            patientIds.length ? supabase.from('avaliacoes').select('id,paciente_id').in('paciente_id', patientIds) : Promise.resolve({ data: [], error: null }),
            patientIds.length ? supabase.from('evolucoes').select('id,paciente_id').in('paciente_id', patientIds) : Promise.resolve({ data: [], error: null })
        ]);
        const firstError = [patients, evaluations, evolutions].find(result => result?.error)?.error;
        if (firstError) throw firstError;
        let documents = { data: [], error: null };
        if (documentIds.length) documents = await supabase.from('documentos_timeline').select('id').in('id', documentIds);
        const documentTableMissing = documents.error && /documentos_timeline|relation|schema cache|does not exist/i.test(String(documents.error.message || documents.error));
        if (documents.error && !documentTableMissing) throw documents.error;
        return {
            pacientes: (patients.data || []).length,
            avaliacoes: (evaluations.data || []).length,
            evolucoes: (evolutions.data || []).length,
            documentos: documentTableMissing ? 0 : (documents.data || []).length,
            documentosTabelaDisponivel: !documentTableMissing
        };
    }

    async function migrateData() {
        const supabase = getSupabase();
        const user = currentUser();
        if (!supabase || !user) {
            feedback('É necessário estar conectado ao Supabase para migrar os dados.', 'error');
            return;
        }
        const patients = localPatients();
        const docs = localDocuments();
        if (!patients.length && !docs.length) {
            feedback('Nenhum prontuário ou evento documental local foi encontrado.', 'info');
            renderInventory();
            return;
        }
        if (!window.confirm(`Será feito um backup local e enviados ${patients.length} prontuário(s) e ${docs.length} evento(s) documental(is) para o Supabase. Nada local será apagado. Continuar?`)) return;

        downloadJson(localSnapshot(), 'kinesys-antes-migracao');
        setBusy(true);
        const startedAt = new Date().toISOString();
        const errors = [];
        let savedPatients = 0;
        let savedEvaluations = 0;
        let savedEvolutions = 0;
        try {
            for (let i = 0; i < patients.length; i += 1) {
                const patient = patients[i];
                progress(`Enviando prontuário ${i + 1} de ${patients.length}: ${patient.nome || 'Paciente'}`, (i / Math.max(1, patients.length)) * 80);
                let enriched = { ...patient };
                try {
                    if (typeof obterDadosResponsavelLocal === 'function') {
                        const responsible = obterDadosResponsavelLocal(patient.id) || {};
                        enriched = { ...responsible, ...enriched };
                    }
                } catch (_) { /* os campos do próprio paciente continuam válidos */ }
                const ok = await salvarPacienteNaNuvem(enriched, {
                    exigirRastreabilidadeClinica: true,
                    somenteNuvem: true,
                    silenciarErro: true,
                    origem: 'migracao_fase_3'
                });
                if (!ok) {
                    errors.push(`${patient.nome || patient.id}: falha ao gravar o prontuário`);
                    continue;
                }
                savedPatients += 1;
                savedEvaluations += Array.isArray(patient.avaliacoes) ? patient.avaliacoes.length : 0;
                savedEvolutions += Array.isArray(patient.evolucoes) ? patient.evolucoes.length : 0;
            }

            progress('Enviando eventos documentais…', 82);
            let documentResult = { ok: true, count: 0, skipped: false };
            try { documentResult = await migrateDocuments(supabase, docs); } catch (err) {
                errors.push(`eventos documentais: ${err?.message || err}`);
                documentResult = { ok: false, count: 0, skipped: false };
            }

            progress('Sincronizando filas operacionais…', 88);
            if (typeof sincronizarAgendamentosPendentes === 'function') {
                try { await sincronizarAgendamentosPendentes({ silencioso: true, renderizar: false }); } catch (err) { errors.push(`agenda: ${err?.message || err}`); }
            }
            if (typeof sincronizarNotificacoesPendentesAgenda === 'function') {
                try { await sincronizarNotificacoesPendentesAgenda(); } catch (err) { errors.push(`notificações: ${err?.message || err}`); }
            }
            for (const patient of patients) {
                if (typeof sincronizarFinanceiroLocalPaciente === 'function') {
                    try { await sincronizarFinanceiroLocalPaciente(patient.id); } catch (err) { errors.push(`financeiro (${patient.nome || patient.id}): ${err?.message || err}`); }
                }
            }

            progress('Validando registros na nuvem…', 94);
            const verification = await verifyMigration(supabase, patients.map(p => String(p.id)), docs.map(d => String(d.id)));
            const expected = {
                pacientes: patients.length,
                avaliacoes: patients.reduce((sum, p) => sum + (Array.isArray(p.avaliacoes) ? p.avaliacoes.length : 0), 0),
                evolucoes: patients.reduce((sum, p) => sum + (Array.isArray(p.evolucoes) ? p.evolucoes.length : 0), 0),
                documentos: docs.length
            };
            const validated = verification.pacientes >= expected.pacientes
                && verification.avaliacoes >= expected.avaliacoes
                && verification.evolucoes >= expected.evolucoes
                && (!expected.documentos || !verification.documentosTabelaDisponivel || verification.documentos >= expected.documentos);
            const state = {
                version: GOVERNANCE_VERSION,
                startedAt,
                completedAt: new Date().toISOString(),
                validated,
                source: { ...expected, savedPatients, savedEvaluations, savedEvolutions },
                cloud: verification,
                documentsTablePending: expected.documentos > 0 && !verification.documentosTabelaDisponivel,
                errors,
                userId: user.id || '',
                userEmail: user.email || ''
            };
            // O log é auxiliar e não bloqueia a migração quando a migration de
            // governança ainda não foi aplicada no projeto Supabase.
            try {
                await supabase.from('kinesys_migracoes_dados').insert([{
                    executado_por: user.id || null,
                    executado_por_email: user.email || '',
                    origem: 'navegador',
                    versao_aplicacao: GOVERNANCE_VERSION,
                    pacientes_total: expected.pacientes,
                    avaliacoes_total: expected.avaliacoes,
                    evolucoes_total: expected.evolucoes,
                    documentos_total: expected.documentos,
                    validada,
                    detalhes: { cloud: verification, errors }
                }]);
            } catch (err) {
                if (!/kinesys_migracoes_dados|relation|schema cache|does not exist/i.test(String(err?.message || err))) {
                    errors.push(`log de migração: ${err?.message || err}`);
                }
            }
            saveMigrationState(state);
            if (validated && !errors.length && !state.documentsTablePending) {
                feedback(`Migração concluída e validada: ${verification.pacientes} prontuário(s), ${verification.avaliacoes} avaliação(ões) e ${verification.evolucoes} evolução(ões). A cópia local foi preservada.`, 'success');
            } else if (validated) {
                feedback(`Prontuários clínicos validados na nuvem. Permanecem ${errors.length} aviso(s) operacional(is)${state.documentsTablePending ? ' e a tabela documental pendente' : ''}; nada local foi apagado.`, 'warning');
            } else {
                feedback('A validação não confirmou todos os registros. A cópia local continua intacta; revise os avisos e tente novamente.', 'error');
            }
            renderInventory();
        } catch (err) {
            saveMigrationState({ version: GOVERNANCE_VERSION, startedAt, completedAt: new Date().toISOString(), validated: false, errors: [err?.message || String(err)] });
            feedback(`Migração interrompida sem apagar dados locais: ${err?.message || err}`, 'error');
        } finally {
            progress('', 0);
            setBusy(false);
        }
    }

    async function cleanValidatedLocalCopy() {
        const state = getMigrationState();
        if (!state?.validated || state.documentsTablePending) {
            feedback('A limpeza só fica disponível depois de uma migração validada, incluindo os eventos documentais.', 'error');
            return;
        }
        if (!window.confirm('O KineSys fará outro backup e removerá somente a cópia clínica permanente deste navegador. Rascunhos, filas financeiras e agenda serão preservados. Continuar?')) return;
        downloadJson(localSnapshot(), 'kinesys-antes-limpeza-local');
        try {
            ['kinesys_prontuarios', 'kinesys_documentos_timeline', 'kinesys_pacientes_responsaveis_v1'].forEach(key => localStorage.removeItem(key));
            saveMigrationState({ ...state, localClinicalCopyRemovedAt: new Date().toISOString() });
            feedback('Cópia clínica permanente removida deste navegador após backup. Os dados permanecem no Supabase.', 'success');
            renderInventory();
        } catch (err) {
            feedback(`Não foi possível concluir a limpeza local: ${err?.message || err}`, 'error');
        }
    }

    function renderInventory() {
        const container = document.getElementById('ks_dados_inventory');
        if (!container) return;
        const items = localInventory();
        const state = getMigrationState();
        const totalBytes = items.reduce((sum, item) => sum + item.bytes, 0);
        const clinical = items.filter(item => item.permanent);
        const localCount = localPatients().length;
        const docsCount = localDocuments().length;
        const summary = document.getElementById('ks_dados_summary');
        if (summary) summary.textContent = `${localCount} prontuário(s) · ${docsCount} evento(s) documental(is) · ${formatBytes(totalBytes)} no armazenamento local`;
        if (!items.length) {
            container.innerHTML = '<div class="ks-data-empty">Nenhum dado local KineSys encontrado. Novos dados clínicos serão gravados no Supabase quando houver conexão.</div>';
        } else {
            container.innerHTML = `<div class="ks-data-table" role="table" aria-label="Inventário de dados locais"><div class="ks-data-row ks-data-head" role="row"><span>Tipo de dado</span><span>Grupo</span><span>Registros</span><span>Tamanho</span><span>Situação</span></div>${items.map(item => `<div class="ks-data-row" role="row"><strong>${esc(item.label)}</strong><span>${esc(item.group)}</span><span>${item.records}</span><span>${formatBytes(item.bytes)}</span><span class="ks-data-badge ${item.permanent ? 'clinical' : 'temporary'}">${item.permanent ? 'Permanente local' : 'Fila/temporário'}</span></div>`).join('')}</div>`;
        }
        const migration = document.getElementById('ks_dados_migration_status');
        if (migration) {
            if (!state) migration.textContent = 'Ainda não há uma migração validada neste navegador.';
            else if (state.validated && state.localClinicalCopyRemovedAt) migration.textContent = `Migração validada em ${new Date(state.completedAt).toLocaleString('pt-BR')}; cópia clínica local removida após backup.`;
            else if (state.validated) migration.textContent = `Migração validada em ${new Date(state.completedAt).toLocaleString('pt-BR')}; cópia local preservada.`;
            else migration.textContent = 'A última tentativa não foi validada. Os dados locais continuam preservados.';
        }
        const clean = document.getElementById('ks_dados_limpar_btn');
        if (clean) clean.disabled = !(state?.validated && !state.documentsTablePending && clinical.length > 0);
    }

    function initialize() {
        renderInventory();
        if (!window.__kineSysGovernanceOnlineBound) {
            window.__kineSysGovernanceOnlineBound = true;
            window.addEventListener('online', renderInventory);
        }
    }

    window.exportarBackupDadosKineSys = exportBackup;
    window.importarBackupDadosKineSys = importBackup;
    window.migrarDadosClinicosKineSys = migrateData;
    window.limparCopiaClinicaLocalKineSys = cleanValidatedLocalCopy;
    window.renderizarInventarioDadosKineSys = renderInventory;
    window.obterSnapshotLocalKineSys = localSnapshot;
    window.KineSysDataGovernance = { version: GOVERNANCE_VERSION, localInventory, localSnapshot, getMigrationState };

    document.addEventListener('DOMContentLoaded', initialize);
    window.addEventListener('kinesys:login-success', initialize);
    window.addEventListener('kinesys:navegacao', event => {
        if (event?.detail?.idTela === 'tela_configuracoes') initialize();
    });
})();
