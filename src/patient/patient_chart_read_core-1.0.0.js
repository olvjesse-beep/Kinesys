/* KineSys — Patient Chart Read Core 1.0.0
 * Leitura de prontuário completo e reconciliação nuvem/local extraídas de
 * src/core/script-1.18.0.js sem adicionar cache TTL ao conteúdo clínico.
 */
'use strict';

const pacientesCompletosEmCurso = new Map();

function instanteRegistroClinico(registro) {
    const candidatos = [
        registro?.ultimaEdicaoEm, registro?.ultima_edicao_em,
        registro?.salvoEm, registro?.salvo_em,
        registro?.dataHoraISO, registro?.data_hora_iso,
        registro?.realizadoEm, registro?.realizado_em,
        registro?.dataAvaliacao, registro?.data_avaliacao,
        registro?.data
    ];
    for (const candidato of candidatos) {
        const data = new Date(candidato || '');
        if (Number.isFinite(data.getTime())) return data.getTime();
    }
    return 0;
}

function mesclarRegistrosCloudLocal(registrosCloud = [], registrosLocais = []) {
    const mapa = new Map();
    (Array.isArray(registrosCloud) ? registrosCloud : []).forEach(registro => {
        if (registro && String(registro.id || '').trim()) mapa.set(String(registro.id), { ...registro });
    });
    (Array.isArray(registrosLocais) ? registrosLocais : []).forEach(registro => {
        if (!registro || !String(registro.id || '').trim()) return;
        const id = String(registro.id);
        const atual = mapa.get(id);
        if (!atual) {
            mapa.set(id, { ...registro, __dadosLocaisPendentes: true });
            return;
        }
        // Quando há o mesmo registro nos dois lugares, conserva a versão mais
        // recente e mantém o marcador para que a migração assistida possa
        // reconciliar a cópia local sem duplicar o ID clínico.
        if (instanteRegistroClinico(registro) > instanteRegistroClinico(atual)) {
            mapa.set(id, { ...registro, __dadosLocaisPendentes: true });
        }
    });
    return Array.from(mapa.values());
}

function mesclarPacienteCloudLocal(pacienteCloud, pacienteLocal) {
    const cloud = pacienteCloud || {};
    const local = pacienteLocal || {};
    return {
        ...local,
        ...cloud,
        __dadosLocaisPendentes: !!local.__dadosLocaisPendentes,
        avaliacoes: mesclarRegistrosCloudLocal(cloud.avaliacoes || [], local.avaliacoes || []),
        evolucoes: mesclarRegistrosCloudLocal(cloud.evolucoes || [], local.evolucoes || []),
        documentos: mesclarRegistrosCloudLocal(cloud.documentos || [], local.documentos || [])
    };
}

async function obterPacienteCompletoPorId(id) {
    const chave = String(id || '').trim();
    if (!chave) return null;
    if (pacientesCompletosEmCurso.has(chave)) return pacientesCompletosEmCurso.get(chave);

    const carregar = async () => {
        const local = lerPacientesLocaisComSeguranca().find(p => String(p.id) === chave) || null;
        if (_supabase) {
            try {
                const { data, error } = await _supabase
                    .from('pacientes')
                    .select('*, avaliacoes(*), evolucoes(*)')
                    .eq('id', chave)
                    .maybeSingle();
                if (error) throw error;
                if (data) return mesclarPacienteCloudLocal(normalizarPacienteDoBanco(data), local);
            } catch (err) {
                console.warn(`KineSys: prontuário ${chave} não pôde ser carregado individualmente; tentando cópia local preservada.`, err);
            }
        }
        return local ? normalizarPacienteDoBanco({ ...local, __dadosLocaisPendentes: true }) : null;
    };

    const promessa = Promise.resolve(carregar()).finally(() => pacientesCompletosEmCurso.delete(chave));
    pacientesCompletosEmCurso.set(chave, promessa);
    return promessa;
}

async function obterPacientesSalvos() {
    const locais = lerPacientesLocaisComSeguranca();
    if (_supabase) {
        try {
            const { data, error } = await _supabase
                .from('pacientes')
                .select('*, avaliacoes(*), evolucoes(*)');

            if (!error && Array.isArray(data)) {
                const cloud = data.map(normalizarPacienteDoBanco);
                const locaisPorId = new Map(locais.map(p => [String(p.id), p]));
                const resultado = cloud.map(p => {
                    const local = locaisPorId.get(String(p.id));
                    if (local) locaisPorId.delete(String(p.id));
                    return mesclarPacienteCloudLocal(p, local);
                });
                // O Supabase é a fonte principal, mas um prontuário criado
                // durante uma falha de conexão não desaparece da tela antes
                // da migração assistida.
                locaisPorId.forEach(local => resultado.push(normalizarPacienteDoBanco({ ...local, __dadosLocaisPendentes: true })));
                return resultado;
            }
        } catch (err) {
            console.warn("⚠️ Conexão com a nuvem falhou. Carregando dados locais preservados...", err);
        }
    }
    return locais.map(p => normalizarPacienteDoBanco({ ...p, __dadosLocaisPendentes: true }));
}

// Compatibilidade explícita com consumidores históricos que acessam as APIs via window.
window.obterPacienteCompletoPorId = obterPacienteCompletoPorId;
window.obterPacientesSalvos = obterPacientesSalvos;
