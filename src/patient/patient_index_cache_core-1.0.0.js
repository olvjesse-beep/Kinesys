/* KineSys — Patient Index Cache Core 1.0.0
 * Índice leve de pacientes, fallback local e cache curto extraídos de
 * src/core/script-1.18.0.js sem alterar TTL, chaves, invalidação ou dados clínicos.
 */
'use strict';

function lerPacientesLocaisComSeguranca() {
    try {
        const dados = JSON.parse(localStorage.getItem('kinesys_prontuarios') || '[]');
        return Array.isArray(dados) ? dados.filter(p => p && String(p.id || '').trim()) : [];
    } catch (err) {
        console.warn('KineSys: não foi possível ler os prontuários locais.', err);
        return [];
    }
}

const KINESYS_CAMPOS_PACIENTE_BASICO = [
    'id','nome','cpf','nascimento','telefone','profissao','sexo','estado_civil',
    'dependente','responsavel_nome','responsavel_parentesco','responsavel_telefone',
    'cep','endereco','data_cadastro','cadastrado_por','timestamp_cadastro'
].join(',');

const KINESYS_CAMPOS_PACIENTE_BASICO_LEGADO = [
    'id','nome','cpf','nascimento','telefone','profissao','sexo','estado_civil',
    'cep','endereco','data_cadastro','cadastrado_por','timestamp_cadastro'
].join(',');

let pacientesBasicosEmCurso = null;

const KINESYS_PACIENTES_BASICOS_CACHE_TTL_MS = 15000;

function chaveCachePacientesBasicos() {
    const perfilId = String(usuarioLogado?.id || 'sem_perfil').trim() || 'sem_perfil';
    return `pacientes::basicos::${perfilId}`;
}

function invalidarCachePacientesBasicos() {
    try { return !!window.KineSysDataCache?.invalidate?.(chaveCachePacientesBasicos()); }
    catch (_) { return false; }
}

function projetarPacienteBasico(paciente) {
    const normalizado = normalizarPacienteDoBanco(paciente || {});
    const { avaliacoes, evolucoes, documentos, ...basico } = normalizado;
    return basico;
}

function mesclarPacienteBasicoCloudLocal(pacienteCloud, pacienteLocal) {
    const cloud = projetarPacienteBasico(pacienteCloud || {});
    const local = projetarPacienteBasico(pacienteLocal || {});
    return {
        ...local,
        ...cloud,
        __dadosLocaisPendentes: !!pacienteLocal?.__dadosLocaisPendentes
    };
}

async function consultarPacientesBasicosNaNuvem() {
    let resposta = await _supabase.from('pacientes').select(KINESYS_CAMPOS_PACIENTE_BASICO);
    if (resposta.error && /dependente|responsavel_nome|responsavel_parentesco|responsavel_telefone|schema cache|column/i.test(String(resposta.error?.message || resposta.error || ''))) {
        resposta = await _supabase.from('pacientes').select(KINESYS_CAMPOS_PACIENTE_BASICO_LEGADO);
    }
    if (resposta.error) throw resposta.error;
    return Array.isArray(resposta.data) ? resposta.data : [];
}

async function obterPacientesBasicos() {
    const carregar = async () => {
        const locais = lerPacientesLocaisComSeguranca();
        if (_supabase) {
            try {
                const dados = await consultarPacientesBasicosNaNuvem();
                const locaisPorId = new Map(locais.map(p => [String(p.id), p]));
                const resultado = dados.map(registro => {
                    const cloud = projetarPacienteBasico(registro);
                    const local = locaisPorId.get(String(cloud.id));
                    if (local) locaisPorId.delete(String(cloud.id));
                    return mesclarPacienteBasicoCloudLocal(cloud, local);
                });
                locaisPorId.forEach(local => resultado.push(projetarPacienteBasico({ ...local, __dadosLocaisPendentes: true })));
                return resultado;
            } catch (err) {
                console.warn('KineSys: índice leve de pacientes indisponível; usando cadastros locais preservados.', err);
            }
        }
        return locais.map(p => projetarPacienteBasico({ ...p, __dadosLocaisPendentes: true }));
    };
    if (window.KineSysDataCache?.get) {
        return window.KineSysDataCache.get({
            key:chaveCachePacientesBasicos(),
            ttl:KINESYS_PACIENTES_BASICOS_CACHE_TTL_MS,
            fetcher:carregar
        });
    }
    if (pacientesBasicosEmCurso) return pacientesBasicosEmCurso;
    pacientesBasicosEmCurso = Promise.resolve(carregar()).finally(() => { pacientesBasicosEmCurso = null; });
    return pacientesBasicosEmCurso;
}
