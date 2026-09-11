from pathlib import Path


def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected 1 occurrence, found {count}')
    return text.replace(old, new, 1)

# -----------------------------------------------------------------------------
# index.html — single-field patient combobox + cache busts + cleaner action copy
# -----------------------------------------------------------------------------
index_path = Path('index.html')
index = index_path.read_text(encoding='utf-8')

modal_marker = '    <!-- MODAL: NOVO/EDITAR AGENDAMENTO -->\n'
modal_pos = index.index(modal_marker)
box_old = '        <div class="modal-box" role="dialog" aria-modal="true" aria-labelledby="modal_agendamento_titulo">'
box_pos = index.index(box_old, modal_pos)
index = index[:box_pos] + index[box_pos:].replace(
    box_old,
    '        <div class="modal-box agenda-appointment-modal" role="dialog" aria-modal="true" aria-labelledby="modal_agendamento_titulo">',
    1,
)

patient_start = index.index('            <div class="input-group">\n                <label for="ag_paciente_busca">Paciente (já cadastrado no sistema)</label>', modal_pos)
patient_end_marker = '            <div class="grid-2">\n                <div class="input-group">\n                    <label for="ag_profissional_select">Profissional responsável *</label>'
patient_end = index.index(patient_end_marker, patient_start)
patient_new = '''            <div class="input-group agenda-patient-search">
                <label for="ag_paciente_busca">Paciente *</label>
                <div class="agenda-patient-combobox">
                    <input type="search" id="ag_paciente_busca" autocomplete="off" placeholder="Digite parte do nome do paciente" role="combobox" aria-autocomplete="list" aria-expanded="false" aria-controls="ag_paciente_sugestoes" aria-describedby="ag_paciente_busca_status" oninput="aoDigitarPacienteAgendamento(this.value)" onkeydown="aoTeclarBuscaPacienteAgendamento(event)">
                    <input type="hidden" id="ag_paciente_select" value="">
                    <div id="ag_paciente_sugestoes" class="agenda-patient-suggestions" role="listbox" aria-label="Sugestões de pacientes" hidden></div>
                </div>
                <small id="ag_paciente_busca_status" class="field-help" aria-live="polite">Digite parte do nome para localizar um paciente cadastrado.</small>
            </div>
'''
index = index[:patient_start] + patient_new + index[patient_end:]

index = replace_once(
    index,
    '<link rel="stylesheet" href="design_agenda.css?v=20260910-compact-r5">',
    '<link rel="stylesheet" href="design_agenda.css?v=20260911-modal-r6">',
    'design agenda cache bust',
)
index = replace_once(
    index,
    '<script defer src="screen_loader-1.25.0.js?v=20260910-phase4d-r1&agenda_edit=20260911-r2&agenda_compact=20260910-r2"></script>',
    '<script defer src="screen_loader-1.25.0.js?v=20260910-phase4d-r1&agenda_edit=20260911-r3&agenda_compact=20260910-r2&agenda_patient=20260911-r1"></script>',
    'screen loader cache bust',
)
index = replace_once(
    index,
    '<button type="button" class="btn-secondary" onclick="fecharModal(\'modal_agendamento\'); abrirModalListaEspera();">🔔 Sem vaga? Lista de Espera</button>',
    '<button type="button" class="btn-secondary" onclick="fecharModal(\'modal_agendamento\'); abrirModalListaEspera();">Lista de espera</button>',
    'waitlist action copy',
)
index_path.write_text(index, encoding='utf-8')

# -----------------------------------------------------------------------------
# agenda-1.20.0.js — true autocomplete, contains matching, keyboard support
# -----------------------------------------------------------------------------
agenda_path = Path('agenda-1.20.0.js')
agenda = agenda_path.read_text(encoding='utf-8')

start = agenda.index('function filtrarPacientesAgendamento(termo = \'\', preservarPacienteId = \'\') {')
end_marker = "if (typeof window !== 'undefined') window.filtrarPacientesAgendamento = filtrarPacientesAgendamento;"
end = agenda.index(end_marker, start) + len(end_marker)
new_block = r'''let agendaPacienteSugestaoAtiva = -1;

function pacienteAgendaPorId(id = '') {
    const alvo = String(id || '').trim();
    return agendaPacientesModalCache.find(p => String(p?.id || '') === alvo) || null;
}

function fecharSugestoesPacienteAgenda() {
    const busca = document.getElementById('ag_paciente_busca');
    const lista = document.getElementById('ag_paciente_sugestoes');
    agendaPacienteSugestaoAtiva = -1;
    if (lista) {
        lista.hidden = true;
        lista.innerHTML = '';
    }
    if (busca) {
        busca.setAttribute('aria-expanded', 'false');
        busca.removeAttribute('aria-activedescendant');
    }
}

function destacarSugestaoPacienteAgenda(indice) {
    const busca = document.getElementById('ag_paciente_busca');
    const lista = document.getElementById('ag_paciente_sugestoes');
    const opcoes = Array.from(lista?.querySelectorAll('[data-paciente-id]') || []);
    if (!opcoes.length) return;
    const limite = opcoes.length - 1;
    agendaPacienteSugestaoAtiva = Math.max(0, Math.min(limite, indice));
    opcoes.forEach((opcao, i) => {
        const ativa = i === agendaPacienteSugestaoAtiva;
        opcao.classList.toggle('is-active', ativa);
        opcao.setAttribute('aria-selected', String(ativa));
    });
    const ativa = opcoes[agendaPacienteSugestaoAtiva];
    if (ativa) {
        busca?.setAttribute('aria-activedescendant', ativa.id);
        ativa.scrollIntoView({ block: 'nearest' });
    }
}

function filtrarPacientesAgendamento(termo = '', preservarPacienteId = '') {
    const busca = document.getElementById('ag_paciente_busca');
    const lista = document.getElementById('ag_paciente_sugestoes');
    const status = document.getElementById('ag_paciente_busca_status');
    const selecionado = document.getElementById('ag_paciente_select');
    if (!busca || !lista || !selecionado) return [];

    const termoNormalizado = normalizarBuscaPacienteAgenda(termo);
    const preservarId = String(preservarPacienteId || '').trim();
    if (!termoNormalizado) {
        fecharSugestoesPacienteAgenda();
        if (status) status.textContent = 'Digite parte do nome para localizar um paciente cadastrado.';
        return [];
    }

    let resultados = agendaPacientesModalCache.filter(p =>
        normalizarBuscaPacienteAgenda(p?.nome).includes(termoNormalizado)
    );
    if (preservarId) {
        const atual = pacienteAgendaPorId(preservarId);
        if (atual && !resultados.some(p => String(p?.id || '') === preservarId)) resultados.push(atual);
    }
    resultados = ordenarPacientesAgenda(resultados);

    lista.innerHTML = resultados.map((p, i) =>
        `<button type="button" id="ag_paciente_opcao_${i}" class="agenda-patient-suggestion" role="option" aria-selected="false" data-paciente-id="${escapeHTML(String(p?.id || ''))}" onclick="selecionarPacienteAgendamento(this.dataset.pacienteId)">${escapeHTML(p?.nome || 'Paciente')}</button>`
    ).join('');
    lista.hidden = resultados.length === 0;
    busca.setAttribute('aria-expanded', resultados.length ? 'true' : 'false');
    busca.removeAttribute('aria-activedescendant');
    agendaPacienteSugestaoAtiva = -1;

    if (status) {
        status.textContent = resultados.length
            ? `${resultados.length} paciente(s) encontrado(s). Selecione uma sugestão.`
            : 'Nenhum paciente encontrado com esse trecho do nome.';
    }
    return resultados;
}

function limparDependenciasPacienteAgendamento() {
    const plano = document.getElementById('ag_plano_select');
    const statusPlano = document.getElementById('ag_plano_status');
    const resumoPlano = document.getElementById('ag_plano_resumo');
    if (plano) {
        plano.innerHTML = '<option value="">Selecione um paciente para ver os pacotes</option>';
        plano.disabled = false;
    }
    if (statusPlano) statusPlano.textContent = 'Selecione o paciente para carregar automaticamente os planos/pacotes ativos.';
    if (resumoPlano) {
        resumoPlano.hidden = true;
        resumoPlano.textContent = '';
    }
}

function aoDigitarPacienteAgendamento(valor = '') {
    const selecionado = document.getElementById('ag_paciente_select');
    const atual = pacienteAgendaPorId(selecionado?.value || '');
    if (selecionado && atual && normalizarBuscaPacienteAgenda(valor) !== normalizarBuscaPacienteAgenda(atual.nome)) {
        selecionado.value = '';
        limparDependenciasPacienteAgendamento();
    }
    return filtrarPacientesAgendamento(valor);
}

function selecionarPacienteAgendamento(id = '') {
    const paciente = pacienteAgendaPorId(id);
    const selecionado = document.getElementById('ag_paciente_select');
    const busca = document.getElementById('ag_paciente_busca');
    const status = document.getElementById('ag_paciente_busca_status');
    if (!paciente || !selecionado || !busca) return false;

    selecionado.value = String(paciente.id || '');
    busca.value = paciente.nome || '';
    fecharSugestoesPacienteAgenda();
    if (status) status.textContent = 'Paciente selecionado.';

    const procedimentoId = document.getElementById('ag_procedimento_select')?.value || '';
    if (typeof popularPlanosNoAgendamento === 'function') {
        Promise.resolve(popularPlanosNoAgendamento(selecionado.value, procedimentoId)).catch(err =>
            console.warn('Agenda: não foi possível carregar os planos do paciente selecionado.', err)
        );
    }
    if (typeof atualizarHorariosDisponiveisModal === 'function') atualizarHorariosDisponiveisModal();
    busca.focus();
    return true;
}

function aoTeclarBuscaPacienteAgendamento(event) {
    const lista = document.getElementById('ag_paciente_sugestoes');
    const opcoes = Array.from(lista?.querySelectorAll('[data-paciente-id]') || []);
    if (!opcoes.length) {
        if (event.key === 'Escape') fecharSugestoesPacienteAgenda();
        return;
    }
    if (event.key === 'ArrowDown') {
        event.preventDefault();
        destacarSugestaoPacienteAgenda(agendaPacienteSugestaoAtiva < opcoes.length - 1 ? agendaPacienteSugestaoAtiva + 1 : 0);
        return;
    }
    if (event.key === 'ArrowUp') {
        event.preventDefault();
        destacarSugestaoPacienteAgenda(agendaPacienteSugestaoAtiva > 0 ? agendaPacienteSugestaoAtiva - 1 : opcoes.length - 1);
        return;
    }
    if (event.key === 'Enter' && agendaPacienteSugestaoAtiva >= 0) {
        event.preventDefault();
        selecionarPacienteAgendamento(opcoes[agendaPacienteSugestaoAtiva]?.dataset?.pacienteId || '');
        return;
    }
    if (event.key === 'Escape') {
        event.preventDefault();
        fecharSugestoesPacienteAgenda();
    }
}

function prepararBuscaPacienteAgendamento(pacientes = [], pacienteSelecionadoId = '') {
    agendaPacientesModalCache = ordenarPacientesAgenda(pacientes);
    const busca = document.getElementById('ag_paciente_busca');
    const selecionado = document.getElementById('ag_paciente_select');
    const status = document.getElementById('ag_paciente_busca_status');
    const pacienteId = String(pacienteSelecionadoId || '').trim();
    const paciente = pacienteAgendaPorId(pacienteId);
    if (selecionado) selecionado.value = paciente?.id ? String(paciente.id) : '';
    if (busca) busca.value = paciente?.nome || '';
    fecharSugestoesPacienteAgenda();
    if (status) status.textContent = paciente ? 'Paciente selecionado.' : 'Digite parte do nome para localizar um paciente cadastrado.';
    return paciente;
}

if (typeof document !== 'undefined') {
    document.addEventListener('click', event => {
        if (!event.target?.closest?.('#modal_agendamento .agenda-patient-search')) fecharSugestoesPacienteAgenda();
    });
}
if (typeof window !== 'undefined') {
    window.filtrarPacientesAgendamento = filtrarPacientesAgendamento;
    window.aoDigitarPacienteAgendamento = aoDigitarPacienteAgendamento;
    window.aoTeclarBuscaPacienteAgendamento = aoTeclarBuscaPacienteAgendamento;
    window.selecionarPacienteAgendamento = selecionarPacienteAgendamento;
}'''
agenda = agenda[:start] + new_block + agenda[end:]

agenda = replace_once(
    agenda,
    "            paciente_nome: document.getElementById('ag_paciente_select')?.selectedOptions?.[0]?.textContent || 'Paciente',",
    "            paciente_nome: pacienteAgendaPorId(pacienteId)?.nome || document.getElementById('ag_paciente_busca')?.value?.trim() || 'Paciente',",
    'patient meta name',
)
agenda = replace_once(
    agenda,
    "    const paciente = document.getElementById('ag_paciente_select');\n    const procedimento = document.getElementById('ag_procedimento_select');\n    if (paciente) paciente.value = a.paciente_id || '';\n    if (procedimento) procedimento.value = a.procedimento_id || '';",
    "    const procedimento = document.getElementById('ag_procedimento_select');\n    prepararBuscaPacienteAgendamento(agendaPacientesModalCache, a.paciente_id || '');\n    if (procedimento) procedimento.value = a.procedimento_id || '';",
    'reschedule patient restore',
)
agenda_path.write_text(agenda, encoding='utf-8')

# -----------------------------------------------------------------------------
# design_agenda.css — Impeccable/KDS pass for the appointment modal
# -----------------------------------------------------------------------------
css_path = Path('design_agenda.css')
css = css_path.read_text(encoding='utf-8')
section_start = css.index('/* ==========================================================================\n   7. Modal de agendamento, recorrência, pacote e horário extraordinário')
section_end = css.index('/* ==========================================================================\n   8. Edição de status e auditoria', section_start)
new_css = r'''/* ==========================================================================
   7. Modal de agendamento, recorrência, pacote e horário extraordinário
   ========================================================================== */
#modal_agendamento .agenda-appointment-modal{
  width:min(700px,calc(100vw - 32px));
  max-width:700px;
  max-height:calc(100vh - 32px);
  padding:26px 28px 20px;
  overflow-x:hidden;
  box-sizing:border-box;
}
#modal_agendamento .agenda-appointment-modal>h2{
  margin:0 44px 20px 0;
  color:var(--kds-text);
  font-size:var(--kds-font-heading-lg);
  line-height:var(--kds-leading-ui);
  font-weight:750;
  letter-spacing:0;
}
#modal_agendamento .grid-2{
  grid-template-columns:minmax(0,1fr) minmax(0,1fr);
  gap:16px;
  align-items:start;
}
#modal_agendamento .grid-2>*{min-width:0}
#modal_agendamento .input-group{min-width:0;margin-bottom:13px}
#modal_agendamento .input-group>label,
#modal_agendamento .kds-group-label{
  display:block;
  margin-bottom:6px;
  color:var(--kds-text-secondary);
  font-size:var(--kds-font-label);
  line-height:var(--kds-leading-ui);
  font-weight:750;
}
#modal_agendamento input:not([type="checkbox"]):not([type="radio"]):not([type="hidden"]),
#modal_agendamento select,
#modal_agendamento textarea{
  width:100%;
  max-width:100%;
  min-width:0;
  box-sizing:border-box;
  font-size:var(--kds-font-field);
}
#modal_agendamento input:not([type="checkbox"]):not([type="radio"]):not([type="hidden"]),
#modal_agendamento select{min-height:45px}
#modal_agendamento textarea{min-height:76px;resize:vertical}
#modal_agendamento .field-help{
  display:block;
  margin-top:5px;
  color:var(--kds-muted);
  font-size:var(--kds-font-metadata);
  line-height:var(--kds-leading-text);
  font-weight:500;
}
#modal_agendamento .actions{
  display:flex;
  flex-wrap:wrap;
  gap:9px;
  justify-content:flex-end;
  margin-top:4px;
  padding-top:16px;
  border-top:1px solid var(--kds-line-soft);
}
#modal_agendamento .actions button{min-width:0;white-space:normal}
#ag_profissional_select:not(:disabled){background-color:var(--kds-surface);cursor:pointer}
#btn_salvar_agendamento[disabled]{opacity:.62;cursor:wait}

/* Busca única de paciente: o campo é entrada e seleção; sugestões flutuam abaixo. */
#modal_agendamento .agenda-patient-search{position:relative;z-index:20;margin-bottom:16px}
#modal_agendamento .agenda-patient-combobox{position:relative}
#modal_agendamento .agenda-patient-suggestions{
  position:absolute;
  z-index:30;
  top:calc(100% + 6px);
  left:0;
  right:0;
  max-height:260px;
  overflow-y:auto;
  padding:5px;
  border:1px solid var(--kds-line);
  border-radius:var(--kds-radius-sm);
  background:var(--kds-surface);
  box-shadow:var(--kds-shadow-float);
}
#modal_agendamento .agenda-patient-suggestions[hidden]{display:none!important}
#modal_agendamento .agenda-patient-suggestion{
  display:block;
  width:100%;
  min-height:42px;
  padding:9px 11px;
  border:0;
  border-radius:7px;
  background:transparent;
  color:var(--kds-text-secondary);
  text-align:left;
  font-family:inherit;
  font-size:var(--kds-font-field);
  line-height:var(--kds-leading-ui);
  font-weight:650;
  cursor:pointer;
}
#modal_agendamento .agenda-patient-suggestion:hover,
#modal_agendamento .agenda-patient-suggestion.is-active{
  background:var(--kds-accent-soft);
  color:var(--kds-accent);
}
#modal_agendamento .agenda-patient-suggestion:focus-visible{
  outline:2px solid var(--kds-accent);
  outline-offset:-2px;
}

/* Blocos secundários usam divisores, não uma pilha de caixas concorrentes. */
.agenda-finance-link{
  margin:0!important;
  padding:15px 0 0;
  border:0;
  border-top:1px solid var(--kds-line-soft);
  border-radius:0;
  background:transparent;
}
.agenda-finance-link+.agenda-finance-link{margin-top:14px!important}
.agenda-finance-link label{color:var(--kds-text-secondary);font-weight:750}
.agenda-finance-link .optional-label{color:var(--kds-muted);font-size:var(--kds-font-metadata);font-weight:600}
.agenda-finance-link>.btn-secondary{margin-top:8px}
.agenda-package-summary{
  margin-top:8px;
  padding:9px 11px;
  border:1px solid var(--kds-line-soft);
  border-radius:var(--kds-radius-sm);
  background:var(--kds-accent-soft);
  color:var(--kds-text-secondary);
  font-size:var(--kds-font-label);
  line-height:var(--kds-leading-ui);
  font-weight:650;
}

.agenda-recurrencia{
  margin:3px 0 15px;
  padding:16px 0 0;
  border:0;
  border-top:1px solid var(--kds-line-soft);
  border-radius:0;
  background:transparent;
}
.agenda-recurrencia>label{
  display:block;
  color:var(--kds-text-secondary);
  font-size:var(--kds-font-label);
  line-height:var(--kds-leading-ui);
  font-weight:750;
}
.agenda-recurrencia-grid,.agenda-recurrencia-fim{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:10px 12px;margin-top:9px}
.agenda-recurrencia-grid>*{min-width:0}
.agenda-recurrencia-dias{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}
.agenda-dia-pill{
  position:relative;
  display:inline-flex;
  align-items:center;
  justify-content:center;
  min-width:42px;
  min-height:38px;
  padding:0 10px;
  border:1px solid var(--kds-line);
  border-radius:var(--kds-radius-pill);
  background:var(--kds-surface);
  color:var(--kds-text-secondary);
  font-size:var(--kds-font-label);
  font-weight:750;
  cursor:pointer;
  user-select:none;
}
.agenda-dia-pill input{position:absolute;opacity:0;pointer-events:none}
.agenda-dia-pill:has(input:checked){border-color:var(--kds-accent);background:var(--kds-accent-soft);color:var(--kds-accent)}
.agenda-dia-pill:has(input:focus-visible){outline:3px solid rgba(30,117,111,.18);outline-offset:2px}
.agenda-recorrencia-custom{display:flex;gap:8px;align-items:flex-end;margin-top:10px}
.agenda-recorrencia-custom .input-group{flex:1;margin:0}
.agenda-recorrencia-datas{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}
.agenda-recorrencia-chip{display:inline-flex;gap:6px;align-items:center;padding:5px 8px;border:1px solid var(--kds-line);border-radius:var(--kds-radius-pill);background:var(--kds-surface);color:var(--kds-text-secondary);font-size:var(--kds-font-metadata)}
.agenda-recorrencia-chip button{border:0;background:transparent;padding:0;line-height:1;cursor:pointer;color:var(--kds-danger)}
.agenda-recorrencia-resumo{margin-top:9px;padding:9px 11px;border:1px solid var(--kds-line-soft);border-radius:var(--kds-radius-sm);background:var(--kds-surface-soft);color:var(--kds-text-secondary);font-size:var(--kds-font-label);line-height:var(--kds-leading-ui)}
.agenda-recorrencia-atalho{margin-top:6px;display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.agenda-recorrencia-atalho button{padding:6px 9px;font-size:var(--kds-font-metadata)}

.agenda-extra-toggle{
  display:flex;
  align-items:flex-start;
  gap:10px;
  padding:11px 12px;
  border:1px solid var(--kds-line-soft);
  border-radius:var(--kds-radius-sm);
  background:var(--kds-surface);
  cursor:pointer;
  color:var(--kds-text-secondary);
  font-size:var(--kds-font-label);
  line-height:var(--kds-leading-ui);
}
.agenda-extra-toggle:hover{border-color:var(--kds-line);background:var(--kds-surface-soft)}
.agenda-extra-toggle input{width:auto;margin-top:2px}
.agenda-extra-toggle strong{color:var(--kds-text);font-weight:750}
.agenda-extra-toggle small{color:var(--kds-muted);font-size:var(--kds-font-metadata);line-height:var(--kds-leading-text)}
.agenda-extra-time{margin-top:8px;padding:11px 12px;border:1px solid var(--kds-line);border-radius:var(--kds-radius-sm);background:var(--kds-surface-soft)}
.agenda-extra-time .grid-2{align-items:end}
.agenda-extra-resumo{margin-top:5px;color:var(--kds-text-secondary);font-size:var(--kds-font-metadata);line-height:var(--kds-leading-ui)}
.agenda-extra-icone{display:inline-flex;align-items:center;justify-content:center;width:17px;height:17px;margin-left:5px;border-radius:var(--kds-radius-pill);background:var(--kds-accent-soft);color:var(--kds-accent);font-size:var(--kds-font-metadata);font-weight:900;vertical-align:middle}
.agenda-extra-badge{margin-left:5px;border:1px solid var(--kds-line);background:var(--kds-accent-soft);color:var(--kds-accent)}

.agenda-plano-vinculo{margin-top:12px;padding:10px;border:1px solid var(--kds-line);border-radius:8px;background:var(--kds-surface-soft)}
.agenda-plano-vinculo label{display:block;margin-bottom:5px;color:var(--kds-text-secondary);font-size:var(--kds-font-label);font-weight:800}
.agenda-plano-vinculo>div{display:flex;gap:6px}
.agenda-plano-vinculo select{flex:1;min-width:0}
.agenda-plano-vinculo button{border:1px solid var(--kds-line);background:var(--kds-surface);color:var(--kds-accent);border-radius:6px;padding:6px 9px;font-size:var(--kds-font-label);font-weight:800;cursor:pointer}
.agenda-plano-vinculo small{display:block;margin-top:5px;color:var(--kds-muted);font-size:var(--kds-font-metadata);line-height:var(--kds-leading-ui)}

'''
css = css[:section_start] + new_css + css[section_end:]
css_path.write_text(css, encoding='utf-8')
