'use strict';
/* ==========================================================================
   KineSys — Patient Data Normalization Core 1.0.0
   Phase 4P: normalização e contato do paciente extraídos sem alterar persistência.
   Não executa consultas nem mutações Supabase.
   ========================================================================== */

function calcularIdadePorNascimento(dataNasc) {
    if (!dataNasc) return '';
    const txt = String(dataNasc).trim();
    let ano, mes, dia;
    let partes = txt.match(/^(\d{4})-(\d{2})-(\d{2})/); // DATE/TIMESTAMP do Supabase
    if (partes) {
        ano = Number(partes[1]); mes = Number(partes[2]); dia = Number(partes[3]);
    } else {
        partes = txt.match(/^(\d{2})\/(\d{2})\/(\d{4})$/); // legado pt-BR
        if (!partes) return '';
        dia = Number(partes[1]); mes = Number(partes[2]); ano = Number(partes[3]);
    }
    if (!ano || mes < 1 || mes > 12 || dia < 1 || dia > 31) return '';
    const hoje = new Date();
    let idade = hoje.getFullYear() - ano;
    const aindaNaoAniversariou = (hoje.getMonth() + 1 < mes) || ((hoje.getMonth() + 1 === mes) && hoje.getDate() < dia);
    if (aindaNaoAniversariou) idade--;
    return idade >= 0 && idade < 130 ? `${idade} anos` : '';
}

function idadeNumericaPaciente(p) {
    const bruta = p?.idade || calcularIdadePorNascimento(p?.nascimento) || '';
    const match = String(bruta).match(/\d{1,3}/);
    return match ? match[0] : '';
}

const KINESYS_RESPONSAVEIS_KEY = 'kinesys_pacientes_responsaveis_v1';

function obterDadosResponsavelLocal(pacienteId) {
    if (!pacienteId) return {};
    try {
        const base = JSON.parse(localStorage.getItem(KINESYS_RESPONSAVEIS_KEY) || '{}');
        return base[pacienteId] || {};
    } catch (_) { return {}; }
}

function salvarDadosResponsavelLocal(paciente) {
    if (!paciente?.id) return;
    try {
        const base = JSON.parse(localStorage.getItem(KINESYS_RESPONSAVEIS_KEY) || '{}');
        base[paciente.id] = {
            dependente: !!paciente.dependente,
            responsavelNome: paciente.responsavelNome || '',
            responsavelParentesco: paciente.responsavelParentesco || '',
            responsavelTelefone: paciente.responsavelTelefone || ''
        };
        localStorage.setItem(KINESYS_RESPONSAVEIS_KEY, JSON.stringify(base));
    } catch (err) { console.warn('KineSys: não foi possível preservar os dados do responsável localmente.', err); }
}

function pacienteEhDependente(paciente) {
    return !!(paciente?.dependente ?? paciente?.menor_dependente);
}

function obterContatoPreferencialPaciente(paciente) {
    const p = paciente || {};
    const dependente = pacienteEhDependente(p);
    const telefoneResponsavel = p.responsavelTelefone || p.responsavel_telefone || '';
    const nomeResponsavel = p.responsavelNome || p.responsavel_nome || '';
    if (dependente && telefoneResponsavel) {
        return {
            telefone: telefoneResponsavel,
            nomeDestinatario: nomeResponsavel || 'responsável',
            usaResponsavel: true,
            parentesco: p.responsavelParentesco || p.responsavel_parentesco || ''
        };
    }
    return {
        telefone: p.telefone || '',
        nomeDestinatario: p.nome || 'paciente',
        usaResponsavel: false,
        parentesco: ''
    };
}

function normalizarPacienteDoBanco(p) {
    const idadeNormalizada = p.idade || calcularIdadePorNascimento(p.nascimento) || '';
    const responsavelLocal = obterDadosResponsavelLocal(p.id);
    const dependenteBanco = p.dependente ?? p.menor_dependente ?? responsavelLocal.dependente ?? false;
    return {
        ...p,
        idade: idadeNormalizada,
        estadoCivil: p.estadoCivil || p.estado_civil || '',
        dependente: !!dependenteBanco,
        responsavelNome: p.responsavelNome || p.responsavel_nome || responsavelLocal.responsavelNome || '',
        responsavelParentesco: p.responsavelParentesco || p.responsavel_parentesco || responsavelLocal.responsavelParentesco || '',
        responsavelTelefone: p.responsavelTelefone || p.responsavel_telefone || responsavelLocal.responsavelTelefone || '',
        dataCadastro: p.dataCadastro || p.data_cadastro || '',
        cadastradoPor: p.cadastradoPor || p.cadastrado_por || '',
        timestampCadastro: p.timestampCadastro || p.timestamp_cadastro || null,
        avaliacoes: (p.avaliacoes || []).map(av => ({
            agendamentoId: av.agendamentoId || av.agendamento_id || null,
            ...av,
            dataAvaliacao: av.dataAvaliacao || av.data_avaliacao || '',
            dataHoraISO: av.dataHoraISO || av.data_hora_iso || av.salvo_em || null,
            realizadoEm: av.realizadoEm || av.realizado_em || av.data_hora_iso || null,
            salvoEm: av.salvoEm || av.salvo_em || av.data_hora_iso || null,
            edicaoLimiteEm: av.edicaoLimiteEm || av.edicao_limite_em || null,
            profissionalId: av.profissionalId || av.profissional_id || null,
            profissionalNome: av.profissionalNome || av.profissional_nome || av.realizadoPor || av.realizado_por || '',
            profissionalRegistro: av.profissionalRegistro || av.profissional_registro || '',
            ultimaEdicaoEm: av.ultimaEdicaoEm || av.ultima_edicao_em || null,
            ultimaEdicaoPorId: av.ultimaEdicaoPorId || av.ultima_edicao_por_id || null,
            ultimaEdicaoPorNome: av.ultimaEdicaoPorNome || av.ultima_edicao_por_nome || '',
            realizadoPor: av.realizadoPor || av.realizado_por || av.profissional_nome || '',
            evaInicial: av.evaInicial ?? av.eva_inicial ?? 0,
            idade: av.idade || idadeNormalizada,
            status: av.status || av.mapeamento?.status || av.mapeamento?.meta?.status || ''
        })),
        evolucoes: (p.evolucoes || []).map(ev => ({
            agendamentoId: ev.agendamentoId || ev.agendamento_id || null,
            ...ev,
            dataHoraISO: ev.dataHoraISO || ev.data_hora_iso || ev.salvo_em || null,
            realizadoEm: ev.realizadoEm || ev.realizado_em || ev.data_hora_iso || null,
            salvoEm: ev.salvoEm || ev.salvo_em || ev.data_hora_iso || null,
            edicaoLimiteEm: ev.edicaoLimiteEm || ev.edicao_limite_em || null,
            relatoLivre: ev.relatoLivre ?? ev.relato_livre ?? '',
            dadosEstruturados: ev.dadosEstruturados || ev.dados_estruturados || {},
            profissionalId: ev.profissionalId || ev.profissional_id || null,
            profissionalNome: ev.profissionalNome || ev.profissional_nome || ev.profissional || '',
            profissionalRegistro: ev.profissionalRegistro || ev.profissional_registro || '',
            ultimaEdicaoEm: ev.ultimaEdicaoEm || ev.ultima_edicao_em || null,
            ultimaEdicaoPorId: ev.ultimaEdicaoPorId || ev.ultima_edicao_por_id || null,
            ultimaEdicaoPorNome: ev.ultimaEdicaoPorNome || ev.ultima_edicao_por_nome || ''
        }))
    };
}
