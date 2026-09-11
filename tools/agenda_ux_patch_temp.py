from pathlib import Path


def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: esperado 1 bloco, encontrado {count}')
    return text.replace(old, new, 1)


p = Path('agenda-1.20.0.js')
s = p.read_text(encoding='utf-8')

s = replace_once(s, "let agendaEquipeCache = [];\n", "let agendaEquipeCache = [];\nlet agendaPacientesModalCache = [];\n", 'cache pacientes modal')

anchor = """async function obterPacientesBasicosAgenda() {
    if (typeof obterPacientesBasicos === 'function') return obterPacientesBasicos();
    if (typeof obterPacientesSalvos === 'function') return obterPacientesSalvos();
    return [];
}
"""
helpers = r'''

function normalizarBuscaPacienteAgenda(valor) {
    return String(valor || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLocaleLowerCase('pt-BR')
        .trim();
}

function ordenarPacientesAgenda(lista = []) {
    return [...(Array.isArray(lista) ? lista : [])].sort((a, b) =>
        String(a?.nome || '').localeCompare(String(b?.nome || ''), 'pt-BR', { sensitivity: 'base' })
    );
}

function filtrarPacientesAgendamento(termo = '', preservarPacienteId = '') {
    const sel = document.getElementById('ag_paciente_select');
    const status = document.getElementById('ag_paciente_busca_status');
    if (!sel) return [];
    const termoNormalizado = normalizarBuscaPacienteAgenda(termo);
    const preservarId = String(preservarPacienteId || '').trim();
    let resultados = termoNormalizado
        ? agendaPacientesModalCache.filter(p => normalizarBuscaPacienteAgenda(p?.nome).startsWith(termoNormalizado))
        : [];
    if (preservarId) {
        const atual = agendaPacientesModalCache.find(p => String(p?.id || '') === preservarId);
        if (atual && !resultados.some(p => String(p?.id || '') === preservarId)) resultados.push(atual);
    }
    resultados = ordenarPacientesAgenda(resultados);
    sel.innerHTML = '<option value="">-- Selecione um paciente --</option>' + resultados.map(p =>
        `<option value="${escapeHTML(p.id)}">${escapeHTML(p.nome || 'Paciente')}</option>`
    ).join('');
    if (preservarId && resultados.some(p => String(p?.id || '') === preservarId)) sel.value = preservarId;
    if (status) {
        if (!termoNormalizado && !preservarId) status.textContent = 'Digite pelo menos uma letra do nome para carregar pacientes.';
        else status.textContent = resultados.length
            ? `${resultados.length} paciente(s) encontrado(s), em ordem alfabética.`
            : 'Nenhum paciente encontrado com esse início de nome.';
    }
    return resultados;
}

function prepararBuscaPacienteAgendamento(pacientes = [], pacienteSelecionadoId = '') {
    agendaPacientesModalCache = ordenarPacientesAgenda(pacientes);
    const busca = document.getElementById('ag_paciente_busca');
    const selecionadoId = String(pacienteSelecionadoId || '').trim();
    const selecionado = agendaPacientesModalCache.find(p => String(p?.id || '') === selecionadoId);
    if (busca) busca.value = selecionado?.nome || '';
    return filtrarPacientesAgendamento(busca?.value || '', selecionadoId);
}

if (typeof window !== 'undefined') window.filtrarPacientesAgendamento = filtrarPacientesAgendamento;
'''
s = replace_once(s, anchor, anchor + helpers, 'helpers busca paciente')

s = replace_once(s,
"""    const agora = new Date();
    const ehHoje = dataISO === formatarDataISO(agora);
    const minutoAtual = agora.getHours() * 60 + agora.getMinutes();
    const livres = [];
""",
"""    const livres = [];
""",
'relogio slots')
s = replace_once(s, "            if (ehHoje && fimSlot <= minutoAtual) continue;\n", "", 'filtro slot passado')

s = replace_once(s,
"""    const hojeISO = formatarDataISO(new Date());
    if (dataISO === hojeISO) {
        const agora = new Date();
        if (fim <= agora.getHours()*60 + agora.getMinutes()) return { ok:false, motivo:'horário já passou' };
    }
""",
"",
'bloqueio recorrencia retroativa')

s = replace_once(s,
"""        avisoEdicao.textContent = editando
            ? 'Editando somente esta ocorrência. Altere apenas Horário, Procedimento ou Profissional. Paciente, data, recorrência, status, confirmação e financeiro serão preservados.'
            : '';""",
"""        avisoEdicao.textContent = editando
            ? 'Editando somente esta ocorrência. Altere Data, Horário, Procedimento ou Profissional. Paciente, recorrência, status, confirmação e financeiro serão preservados.'
            : '';""",
'aviso escopo edicao')
s = replace_once(s,
"""    if (data) {
        data.disabled = editando;
        data.setAttribute('aria-disabled', String(editando));
    }""",
"""    if (data) {
        data.disabled = false;
        data.setAttribute('aria-disabled', 'false');
    }""",
'data editavel')

s = replace_once(s,
"""        const pacientes = await obterPacientesBasicosAgenda();
        const selPaciente = document.getElementById('ag_paciente_select');
        selPaciente.innerHTML = '<option value="">-- Selecione --</option>' +
            pacientes.map(p => `<option value="${p.id}">${escapeHTML(p.nome)}</option>`).join('');
""",
"""        const pacientes = await obterPacientesBasicosAgenda();
        const selPaciente = document.getElementById('ag_paciente_select');
        prepararBuscaPacienteAgendamento(pacientes, atendimentoEdicao?.paciente_id || '');
""",
'popular pacientes modal')

s = replace_once(s,
"async function salvarEdicaoAtendimentoAtual({ profissionalId, procedimentoId, horarioVal }) {",
"async function salvarEdicaoAtendimentoAtual({ profissionalId, procedimentoId, dataISO, horarioVal }) {",
'assinatura salvar edicao')
s = replace_once(s,
"""    if (!usuarioPodeVerAgendaClinicaToda() || !agendaPodeMarcarProfissional(profissionalId)) {
        mostrarFeedbackAgendaModal('Seu perfil não possui autorização para editar este atendimento.', 'erro');
        return false;
    }
""",
"""    if (!usuarioPodeVerAgendaClinicaToda() || !agendaPodeMarcarProfissional(profissionalId)) {
        mostrarFeedbackAgendaModal('Seu perfil não possui autorização para editar este atendimento.', 'erro');
        return false;
    }
    if (!/^\\d{4}-\\d{2}-\\d{2}$/.test(String(dataISO || ''))) {
        mostrarFeedbackAgendaModal('Selecione uma data válida.', 'erro');
        return false;
    }
""",
'validacao data edicao')
s = replace_once(s,
"    const conflito = await existeConflitoImediato(profissionalId, a.data, horaInicio, horaFim, id);",
"    const conflito = await existeConflitoImediato(profissionalId, dataISO, horaInicio, horaFim, id);",
'conflito nova data')
s = replace_once(s,
"""    const alteracoes = {
        profissional_id: profissionalId,
        procedimento_id: procedimentoId,
        hora_inicio: horaInicio,
        hora_fim: horaFim
    };""",
"""    const alteracoes = {
        profissional_id: profissionalId,
        procedimento_id: procedimentoId,
        data: dataISO,
        hora_inicio: horaInicio,
        hora_fim: horaFim
    };""",
'payload data edicao')
s = replace_once(s,
"""    agendaEdicaoAtendimentoId = null;
    document.getElementById('ag_id').value = '';
    fecharModal('modal_agendamento');
""",
"""    agendaEdicaoAtendimentoId = null;
    document.getElementById('ag_id').value = '';
    agendaDataSelecionada = new Date(dataISO + 'T00:00:00');
    const inputDataAgenda = document.getElementById('agenda_data_input');
    if (inputDataAgenda) inputDataAgenda.value = dataISO;
    fecharModal('modal_agendamento');
""",
'navegar nova data edicao')
s = replace_once(s,
"            await salvarEdicaoAtendimentoAtual({ profissionalId, procedimentoId, horarioVal });",
"            await salvarEdicaoAtendimentoAtual({ profissionalId, procedimentoId, dataISO, horarioVal });",
'chamada salvar edicao')
s = replace_once(s,
'<button type="button" id="btn_editar_atendimento" class="btn-secondary" onclick="editarAgendamentoAtual()">EDITAR ATENDIMENTO</button>',
'<button type="button" id="btn_editar_atendimento" class="btn-secondary" onclick="editarAgendamentoAtual()">Editar agendamento</button>',
'rotulo editar agendamento')

p.write_text(s, encoding='utf-8')

p = Path('index.html')
h = p.read_text(encoding='utf-8')
old_patient = '''            <div class="input-group">
                <label for="ag_paciente_select">Paciente (já cadastrado no sistema)</label>
                <select id="ag_paciente_select" onchange="popularPlanosNoAgendamento(this.value, document.getElementById('ag_procedimento_select').value); atualizarHorariosDisponiveisModal()"><option value="">-- Selecione --</option></select>
            </div>'''
new_patient = '''            <div class="input-group">
                <label for="ag_paciente_busca">Paciente (já cadastrado no sistema)</label>
                <input type="search" id="ag_paciente_busca" autocomplete="off" placeholder="Digite o início do nome, ex.: Ana" oninput="filtrarPacientesAgendamento(this.value)">
                <small id="ag_paciente_busca_status" class="field-help" aria-live="polite">Digite pelo menos uma letra do nome para carregar pacientes.</small>
                <select id="ag_paciente_select" aria-label="Paciente encontrado" onchange="popularPlanosNoAgendamento(this.value, document.getElementById('ag_procedimento_select').value); atualizarHorariosDisponiveisModal()"><option value="">-- Selecione um paciente --</option></select>
            </div>'''
h = replace_once(h, old_patient, new_patient, 'html busca paciente')
h = replace_once(h,
'screen_loader-1.25.0.js?v=20260910-phase4d-r1&agenda_edit=20260910-r1&agenda_compact=20260910-r2',
'screen_loader-1.25.0.js?v=20260910-phase4d-r1&agenda_edit=20260911-r2&agenda_compact=20260910-r2',
'cache bust screen loader index')
p.write_text(h, encoding='utf-8')

p = Path('screen_loader-1.25.0.js')
l = p.read_text(encoding='utf-8')
l = replace_once(l,
'agenda-1.20.0.js?v=20260910-agenda-edit-r1',
'agenda-1.20.0.js?v=20260911-agenda-edit-r2',
'cache bust agenda loader')
p.write_text(l, encoding='utf-8')

p = Path('tests/agenda_editar_atendimento.contract.js')
t = p.read_text(encoding='utf-8')
replacements = [
    ('>EDITAR ATENDIMENTO<\\/button>', '>Editar agendamento<\\/button>', 'botao contrato'),
    ('// Somente os três campos solicitados ficam editáveis.', '// Paciente permanece fixo; data, horário, procedimento e profissional ficam editáveis.', 'comentario escopo'),
    ("assert.match(configurar, /data\\.disabled = editando/,'Data deve ficar bloqueada na edição');", "assert.match(configurar, /data\\.disabled = false/,'Data deve ficar editável na edição');", 'data contrato'),
    ('/Altere apenas Horário, Procedimento ou Profissional/', '/Altere Data, Horário, Procedimento ou Profissional/', 'aviso contrato'),
    ('existeConflitoImediato\\(profissionalId, a\\.data, horaInicio, horaFim, id\\)', 'existeConflitoImediato\\(profissionalId, dataISO, horaInicio, horaFim, id\\)', 'conflito contrato'),
    ("for (const campo of ['profissional_id','procedimento_id','hora_inicio','hora_fim'])", "for (const campo of ['profissional_id','procedimento_id','data','hora_inicio','hora_fim'])", 'campos payload'),
    ("for (const proibido of ['paciente_id','data','status','plano_id','confirmado_pelo_paciente','observacoes','metadados'])", "for (const proibido of ['paciente_id','status','plano_id','confirmado_pelo_paciente','observacoes','metadados'])", 'proibidos payload'),
    ("const ok = await context.__editar({profissionalId:'prof-2',procedimentoId:'proc-2',horarioVal:'11:00|12:00'});", "const ok = await context.__editar({profissionalId:'prof-2',procedimentoId:'proc-2',dataISO:'2026-09-16',horarioVal:'11:00|12:00'});", 'smoke data'),
    ("['hora_fim','hora_inicio','procedimento_id','profissional_id'].sort()", "['data','hora_fim','hora_inicio','procedimento_id','profissional_id'].sort()", 'payload esperado'),
    ("['prof-2','2026-09-15','11:00','12:00','ag-1']", "['prof-2','2026-09-16','11:00','12:00','ag-1']", 'conflito esperado'),
    ("assert.strictEqual(semPagamento.registro.data,'2026-09-15','data deve permanecer intacta');", "assert.strictEqual(semPagamento.registro.data,'2026-09-16','data deve ser atualizada no mesmo registro');", 'data atualizada'),
    ('screen_loader-1\\.25\\.0\\.js\\?v=20260910-phase4d-r1&agenda_edit=20260910-r1', 'screen_loader-1\\.25\\.0\\.js\\?v=20260910-phase4d-r1&agenda_edit=20260911-r2', 'cache index contrato'),
    ('agenda-1\\.20\\.0\\.js\\?v=20260910-agenda-edit-r1', 'agenda-1\\.20\\.0\\.js\\?v=20260911-agenda-edit-r2', 'cache agenda contrato'),
]
for old, new, label in replacements:
    t = replace_once(t, old, new, label)
t = replace_once(t,
"    agendaUltimoProfissional:'',\n",
"    agendaUltimoProfissional:'',\n    agendaDataSelecionada:new Date('2026-09-15T00:00:00'),\n",
'context agenda data')
p.write_text(t, encoding='utf-8')
