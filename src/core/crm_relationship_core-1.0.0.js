/* KineSys — CRM Relationship Core 1.0.0
 * CRM e relacionamento extraídos do core sem alterar contratos históricos.
 */
'use strict';

/* ==========================================================================
   MÓDULO CRM E RELACIONAMENTO
   ========================================================================== */

let pacienteCRM = null;

async function popularSelectCRM() {
    const select = document.getElementById('crm_paciente_select');
    if (!select) return;
    const lista = await obterPacientesBasicos();
    let options = `<option value="">-- Selecione um paciente --</option>`;
    lista.forEach(p => {
        const contato = obterContatoPreferencialPaciente(p);
        const sufixo = contato.telefone ? `${contato.telefone}${contato.usaResponsavel ? ' · responsável' : ''}` : 'sem telefone';
        options += `<option value="${escapeHTML(p.id)}">${escapeHTML(p.nome)} (${escapeHTML(sufixo)})</option>`;
    });
    select.innerHTML = options;
}

async function carregarPacienteCRM() {
    const select = document.getElementById('crm_paciente_select');
    const id = select.value;
    if (!id) {
        document.getElementById('crm_paciente_info').style.display = 'none';
        pacienteCRM = null;
        return;
    }
    const lista = await obterPacientesBasicos();
    const p = lista.find(item => item.id === id);
    if (p) {
        pacienteCRM = p;
        const contato = obterContatoPreferencialPaciente(p);
        document.getElementById('crm_nome').textContent = p.nome;
        document.getElementById('crm_telefone').textContent = contato.telefone
            ? `${contato.telefone}${contato.usaResponsavel ? ` · Responsável: ${contato.nomeDestinatario}` : ''}`
            : 'Não informado';
        document.getElementById('crm_paciente_info').style.display = 'block';
    } else {
        pacienteCRM = null;
        document.getElementById('crm_paciente_info').style.display = 'none';
    }
}

/**
 * Dispara a mensagem via WhatsApp utilizando uma âncora invisível
 * com target fixo para reutilizar a mesma aba.
 */
async function enviarWhatsApp(tipo) {
    if (!pacienteCRM) {
        alert('⚠️ Selecione um paciente no CRM primeiro.');
        return;
    }
    const contato = obterContatoPreferencialPaciente(pacienteCRM);
    const telefone = contato.telefone;
    if (!telefone) {
        alert(pacienteEhDependente(pacienteCRM)
            ? '⚠️ Este paciente está marcado como dependente, mas não possui telefone do responsável cadastrado.'
            : '⚠️ Este paciente não possui telefone cadastrado.');
        return;
    }
    const numeroLimpo = '55' + telefone.replace(/\D/g, '');
    const nome = pacienteCRM.nome;
    const saudacao = contato.usaResponsavel
        ? `Olá ${contato.nomeDestinatario}! Sobre o atendimento de ${nome}`
        : `Olá ${nome}`;
    const contextoBase = {
        saudacao,
        paciente: nome,
        destinatario: contato.nomeDestinatario || nome,
        profissional: usuarioLogado?.nome || 'equipe',
        clinica: 'Fisiofix'
    };

    let mensagem = '';
    switch (tipo) {
        case 'checkin':
            mensagem = (typeof obterMensagemPadraoConfigurada === 'function')
                ? await obterMensagemPadraoConfigurada('crm_checkin_24h', contextoBase, true)
                : `${saudacao}, aqui é ${usuarioLogado?.nome || 'a equipe'} da Fisiofix. Como está a evolução 24 horas após a sessão? A dor melhorou?`;
            break;
        case 'exercicios':
            mensagem = (typeof obterMensagemPadraoConfigurada === 'function')
                ? await obterMensagemPadraoConfigurada('crm_exercicios_3d', contextoBase, true)
                : `${saudacao}, aqui é ${usuarioLogado?.nome || 'a equipe'} da Fisiofix. Passando para lembrar dos exercícios que combinamos. Qualquer dúvida, estou à disposição.`;
            break;
        case 'sessao': {
            const agendamento = obterProximoAgendamento(pacienteCRM.id);
            if (!agendamento) {
                alert('⚠️ Não foi possível obter o próximo agendamento.');
                return;
            }
            const agora = new Date();
            const diffMs = new Date(agendamento.dataHora) - agora;
            if (diffMs < 0) {
                alert('⚠️ O agendamento já passou.');
                return;
            }
            const horas = Math.floor(diffMs / (1000 * 60 * 60));
            const dataFormatada = new Date(agendamento.dataHora).toLocaleDateString('pt-BR');
            const horaFormatada = new Date(agendamento.dataHora).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
            const contexto = {...contextoBase, horas, data:dataFormatada, hora:horaFormatada};
            mensagem = (typeof obterMensagemPadraoConfigurada === 'function')
                ? await obterMensagemPadraoConfigurada('crm_lembrete_sessao', contexto, true)
                : `${saudacao}, passando para lembrar do atendimento na Fisiofix. Faltam aproximadamente ${horas} horas para a sessão (marcada para ${dataFormatada} às ${horaFormatada}). Confirma a presença?`;
            break;
        }
        default:
            alert('Tipo de mensagem inválido.');
            return;
    }

    const mensagemCodificada = encodeURIComponent(mensagem);
    const url = 'https://web.whatsapp.com/send?phone=' + numeroLimpo + '&text=' + mensagemCodificada;

    // Técnica da âncora invisível para forçar o reuso da aba
    const link = document.createElement('a');
    link.href = url;
    link.target = 'whatsapp_unico_crm';
    link.rel = 'noopener noreferrer';
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function obterProximoAgendamento(pacienteId) {
    // Mock: agendamento para amanhã às 10h
    const agora = new Date();
    const amanha = new Date(agora);
    amanha.setDate(agora.getDate() + 1);
    amanha.setHours(10, 0, 0, 0);
    return {
        pacienteId: pacienteId,
        dataHora: amanha.toISOString()
    };
}

